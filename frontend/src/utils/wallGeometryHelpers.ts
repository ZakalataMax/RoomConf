import { GEOMETRY_LIMITS as L } from '@/constants/geometry'
import type {
  Opening,
  OpeningType,
  RoomGeometry,
  Vec2,
  Wall,
  WallPanel,
  WallSegment,
} from '@/types/geometry'

const EPS = 1e-6

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/** Resolve each wall's end point (the next wall's start; the last wall closes the loop). */
export function getWallSegments(room: RoomGeometry): WallSegment[] {
  const { walls } = room
  return walls.map((wall, index) => {
    const end = walls[(index + 1) % walls.length]!.start
    return { wall, index, start: wall.start, end, length: distance(wall.start, end) }
  })
}

/** Shoelace area on the (x, z) plane; positive for the default corner order. */
export function signedArea(corners: Vec2[]): number {
  let sum = 0
  for (let i = 0; i < corners.length; i++) {
    const [x1, z1] = corners[i]!
    const [x2, z2] = corners[(i + 1) % corners.length]!
    sum += x1 * z2 - x2 * z1
  }
  return sum / 2
}

/** Unit normal of a wall pointing into the room, as [x, z]. */
export function inwardNormal(start: Vec2, end: Vec2, orientation: number): Vec2 {
  const len = distance(start, end) || 1
  const sign = orientation >= 0 ? 1 : -1
  return [(-(end[1] - start[1]) / len) * sign, ((end[0] - start[0]) / len) * sign]
}

export function boundingBox(corners: Vec2[]) {
  const xs = corners.map((c) => c[0])
  const zs = corners.map((c) => c[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ }
}

function orient(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function onSegment(a: Vec2, b: Vec2, p: Vec2): boolean {
  return (
    Math.min(a[0], b[0]) - EPS <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    Math.min(a[1], b[1]) - EPS <= p[1] &&
    p[1] <= Math.max(a[1], b[1]) + EPS
  )
}

/** True when segments ab and cd touch or cross (collinear overlap included). */
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  if (((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS)) && ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS))) {
    return true
  }
  if (Math.abs(o1) <= EPS && onSegment(a, b, c)) return true
  if (Math.abs(o2) <= EPS && onSegment(a, b, d)) return true
  if (Math.abs(o3) <= EPS && onSegment(c, d, a)) return true
  if (Math.abs(o4) <= EPS && onSegment(c, d, b)) return true
  return false
}

/** Returns an error message if the corners do not form a valid room outline. */
export function validateCorners(corners: Vec2[]): string | null {
  if (corners.length < L.minWalls) return `A room needs at least ${L.minWalls} walls`
  if (corners.length > L.maxWalls) return `A room can have at most ${L.maxWalls} walls`
  for (const [x, z] of corners) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 'Coordinates must be numbers'
    if (Math.abs(x) > L.maxCoordinate || Math.abs(z) > L.maxCoordinate) {
      return `Coordinates must stay within ±${L.maxCoordinate} m`
    }
  }
  const n = corners.length
  for (let i = 0; i < n; i++) {
    if (distance(corners[i]!, corners[(i + 1) % n]!) < L.minWallLength - EPS) {
      return `Walls must be at least ${L.minWallLength} m long`
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1)
      if (adjacent) continue
      if (segmentsIntersect(corners[i]!, corners[(i + 1) % n]!, corners[j]!, corners[(j + 1) % n]!)) {
        return 'Walls must not cross each other'
      }
    }
  }
  if (Math.abs(signedArea(corners)) < L.minRoomSize * L.minRoomSize - EPS) {
    return `The floor area must be at least ${L.minRoomSize * L.minRoomSize} m²`
  }
  return null
}

export function createRectangleCorners(width: number, depth: number): Vec2[] {
  const w = width / 2
  const d = depth / 2
  return [
    [-w, -d],
    [w, -d],
    [w, d],
    [-w, d],
  ]
}

/** L-shaped outline: the bounding rectangle with its +x/+z quarter cut away. */
export function createLShapeCorners(width: number, depth: number): Vec2[] {
  const w = width / 2
  const d = depth / 2
  return [
    [-w, -d],
    [w, -d],
    [w, 0],
    [0, 0],
    [0, d],
    [-w, d],
  ]
}

/**
 * Clamp an opening so that it fits inside a wall of the given size.
 * Returns null when the wall is too small to hold an opening of minimum size.
 */
export function clampOpening(opening: Opening, wallLength: number, wallHeight: number): Opening | null {
  const min = L.minOpeningSize
  if (wallLength < min || wallHeight < min) return null
  const width = Math.min(Math.max(opening.width, min), wallLength)
  const height = Math.min(Math.max(opening.height, min), wallHeight)
  const bottom = opening.type === 'door' ? 0 : Math.min(Math.max(opening.bottom, 0), wallHeight - height)
  const offset = Math.min(Math.max(opening.offset, 0), wallLength - width)
  return { ...opening, width, height, bottom, offset }
}

export function openingsOverlap(a: Pick<Opening, 'offset' | 'width'>, b: Pick<Opening, 'offset' | 'width'>): boolean {
  return a.offset < b.offset + b.width - EPS && b.offset < a.offset + a.width - EPS
}

/** Offset that centers an opening of `width` in the largest free gap, or null if it does not fit. */
export function findFreeOffset(openings: Opening[], wallLength: number, width: number): number | null {
  const sorted = [...openings].sort((a, b) => a.offset - b.offset)
  let best: { start: number; size: number } | null = null
  let cursor = 0
  for (const o of [...sorted, { offset: wallLength, width: 0 }]) {
    const size = o.offset - cursor
    if (!best || size > best.size) best = { start: cursor, size }
    cursor = Math.max(cursor, o.offset + o.width)
  }
  if (!best || best.size + EPS < width) return null
  return best.start + (best.size - width) / 2
}

/** Re-fit openings after a wall changed size: clamp each one and drop those that no longer fit. */
export function fitOpeningsToWall(openings: Opening[], wallLength: number, wallHeight: number): Opening[] {
  const result: Opening[] = []
  for (const o of [...openings].sort((a, b) => a.offset - b.offset)) {
    const clamped = clampOpening(o, wallLength, wallHeight)
    if (clamped && !result.some((r) => openingsOverlap(r, clamped))) result.push(clamped)
  }
  return result
}

/**
 * Split a wall face into solid rectangles around its openings. Each panel is
 * rendered as one quad (2 triangles), so a plain wall is a single quad.
 */
export function computeWallPanels(length: number, height: number, openings: Opening[]): WallPanel[] {
  const breaks = new Set<number>([0, length])
  for (const o of openings) {
    breaks.add(o.offset)
    breaks.add(o.offset + o.width)
  }
  const xs = [...breaks].filter((x) => x >= 0 && x <= length).sort((a, b) => a - b)
  const panels: WallPanel[] = []
  for (let i = 0; i < xs.length - 1; i++) {
    const u0 = xs[i]!
    const u1 = xs[i + 1]!
    if (u1 - u0 < EPS) continue
    const mid = (u0 + u1) / 2
    const hole = openings.find((o) => o.offset < mid && mid < o.offset + o.width)
    if (!hole) {
      panels.push({ u0, u1, v0: 0, v1: height })
      continue
    }
    if (hole.bottom > EPS) panels.push({ u0, u1, v0: 0, v1: hole.bottom })
    const top = hole.bottom + hole.height
    if (top < height - EPS) panels.push({ u0, u1, v0: top, v1: height })
  }
  return panels
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isVec2(value: unknown): value is Vec2 {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber)
}

/**
 * Validate untrusted geometry (from localStorage or a saved preset).
 * Returns a sanitized deep copy, or null if the data cannot describe a valid room.
 */
export function parseRoomGeometry(input: unknown): RoomGeometry | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as { ceilingHeight?: unknown; walls?: unknown }
  if (!isFiniteNumber(raw.ceilingHeight) || !Array.isArray(raw.walls)) return null
  if (raw.ceilingHeight < L.minCeilingHeight || raw.ceilingHeight > L.maxCeilingHeight) return null

  const walls: Wall[] = []
  for (const [i, w] of (raw.walls as unknown[]).entries()) {
    if (!w || typeof w !== 'object') return null
    const wall = w as { id?: unknown; start?: unknown; openings?: unknown }
    if (!isVec2(wall.start)) return null
    const openings: Opening[] = []
    if (Array.isArray(wall.openings)) {
      for (const [j, o] of (wall.openings as unknown[]).entries()) {
        const op = o as Partial<Record<keyof Opening, unknown>>
        if (!op || (op.type !== 'door' && op.type !== 'window')) continue
        if (![op.offset, op.width, op.height].every(isFiniteNumber)) continue
        openings.push({
          id: typeof op.id === 'string' ? op.id : `opening-${i}-${j}`,
          type: op.type as OpeningType,
          offset: op.offset as number,
          width: op.width as number,
          height: op.height as number,
          bottom: isFiniteNumber(op.bottom) ? op.bottom : 0,
        })
      }
    }
    walls.push({
      id: typeof wall.id === 'string' ? wall.id : `wall-${i + 1}`,
      start: [wall.start[0], wall.start[1]],
      openings,
    })
  }

  if (validateCorners(walls.map((w) => w.start))) return null
  if (new Set(walls.map((w) => w.id)).size !== walls.length) return null

  const room: RoomGeometry = { ceilingHeight: raw.ceilingHeight, walls }
  for (const seg of getWallSegments(room)) {
    seg.wall.openings = fitOpeningsToWall(seg.wall.openings, seg.length, room.ceilingHeight)
  }
  return room
}
