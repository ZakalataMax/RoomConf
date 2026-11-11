import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_OPENING_SIZE, GEOMETRY_LIMITS as L, createDefaultRoomGeometry } from '@/constants/geometry'
import type { GeometryResult, Opening, OpeningType, RoomGeometry, Vec2 } from '@/types/geometry'
import {
  boundingBox,
  clampOpening,
  createLShapeCorners,
  createRectangleCorners,
  findFreeOffset,
  fitOpeningsToWall,
  getWallSegments,
  openingsOverlap,
  parseRoomGeometry,
  signedArea,
  validateCorners,
} from '@/utils/wallGeometryHelpers'

export type RoomShape = 'rectangle' | 'l-shape'

let idCounter = 1
function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${idCounter++}`
}

const OK: GeometryResult = { ok: true }
const fail = (error: string): GeometryResult => ({ ok: false, error })

function cloneRoom(room: RoomGeometry): RoomGeometry {
  return {
    ceilingHeight: room.ceilingHeight,
    walls: room.walls.map((w) => ({
      id: w.id,
      start: [w.start[0], w.start[1]] as Vec2,
      openings: w.openings.map((o) => ({ ...o })),
    })),
  }
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max
}

/**
 * Parametric room geometry: a single room described as a closed outline of
 * walls with door/window openings. Every action works on a copy and only
 * commits it when the result is valid, so the scene never sees a broken room.
 */
export const useRoomGeometryStore = defineStore('roomGeometry', () => {
  const room = ref<RoomGeometry>(createDefaultRoomGeometry())
  const selectedWallId = ref<string | null>(null)

  const segments = computed(() => getWallSegments(room.value))
  const corners = computed(() => room.value.walls.map((w) => w.start))
  const orientation = computed(() => Math.sign(signedArea(corners.value)) || 1)
  const bounds = computed(() => boundingBox(corners.value))

  /** Validate a candidate room, re-fit openings to the new wall sizes and apply it. */
  function commit(candidate: RoomGeometry): GeometryResult {
    const error = validateCorners(candidate.walls.map((w) => w.start))
    if (error) return fail(error)
    for (const seg of getWallSegments(candidate)) {
      seg.wall.openings = fitOpeningsToWall(seg.wall.openings, seg.length, candidate.ceilingHeight)
    }
    room.value = candidate
    if (selectedWallId.value && !candidate.walls.some((w) => w.id === selectedWallId.value)) {
      selectedWallId.value = null
    }
    return OK
  }

  function findWall(candidate: RoomGeometry, wallId: string) {
    const index = candidate.walls.findIndex((w) => w.id === wallId)
    return index === -1 ? null : { index, wall: candidate.walls[index]! }
  }

  function setCeilingHeight(height: number): GeometryResult {
    if (!inRange(height, L.minCeilingHeight, L.maxCeilingHeight)) {
      return fail(`Ceiling height must be between ${L.minCeilingHeight} and ${L.maxCeilingHeight} m`)
    }
    const candidate = cloneRoom(room.value)
    candidate.ceilingHeight = height
    return commit(candidate)
  }

  /** Scale the outline (about its bounding-box center) to the given width (x) and depth (z). */
  function setRoomSize(width: number, depth: number): GeometryResult {
    if (!inRange(width, L.minRoomSize, L.maxRoomSize) || !inRange(depth, L.minRoomSize, L.maxRoomSize)) {
      return fail(`Room width and depth must be between ${L.minRoomSize} and ${L.maxRoomSize} m`)
    }
    const b = bounds.value
    const cx = (b.minX + b.maxX) / 2
    const cz = (b.minZ + b.maxZ) / 2
    const sx = width / b.width
    const sz = depth / b.depth
    const candidate = cloneRoom(room.value)
    for (const wall of candidate.walls) {
      wall.start = [cx + (wall.start[0] - cx) * sx, cz + (wall.start[1] - cz) * sz]
    }
    return commit(candidate)
  }

  /** Replace the outline with a template shape of the current size (openings are cleared). */
  function applyShape(shape: RoomShape): GeometryResult {
    const { width, depth } = bounds.value
    const outline = shape === 'rectangle' ? createRectangleCorners(width, depth) : createLShapeCorners(width, depth)
    return commit({
      ceilingHeight: room.value.ceilingHeight,
      walls: outline.map((start) => ({ id: generateId('wall'), start, openings: [] })),
    })
  }

  /** Move the corner where a wall starts (this also moves the end of the previous wall). */
  function moveCorner(wallId: string, point: Vec2): GeometryResult {
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    found.wall.start = [point[0], point[1]]
    return commit(candidate)
  }

  /** Add a wall by splitting an existing one at its midpoint. */
  function splitWall(wallId: string): GeometryResult {
    if (room.value.walls.length >= L.maxWalls) return fail(`A room can have at most ${L.maxWalls} walls`)
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    const seg = getWallSegments(candidate)[found.index]!
    const half = seg.length / 2
    if (found.wall.openings.some((o) => o.offset < half && half < o.offset + o.width)) {
      return fail('Move the opening away from the middle of the wall before splitting it')
    }
    const mid: Vec2 = [(seg.start[0] + seg.end[0]) / 2, (seg.start[1] + seg.end[1]) / 2]
    const first = found.wall.openings.filter((o) => o.offset + o.width <= half)
    const second = found.wall.openings
      .filter((o) => o.offset >= half)
      .map((o) => ({ ...o, offset: o.offset - half }))
    found.wall.openings = first
    candidate.walls.splice(found.index + 1, 0, { id: generateId('wall'), start: mid, openings: second })
    return commit(candidate)
  }

  /** Remove a wall: the previous wall is extended to this wall's end corner. */
  function removeWall(wallId: string): GeometryResult {
    if (room.value.walls.length <= L.minWalls) return fail(`A room needs at least ${L.minWalls} walls`)
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    candidate.walls.splice(found.index, 1)
    return commit(candidate)
  }

  function addOpening(wallId: string, type: OpeningType): GeometryResult {
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    if (found.wall.openings.length >= L.maxOpeningsPerWall) {
      return fail(`A wall can have at most ${L.maxOpeningsPerWall} openings`)
    }
    const seg = getWallSegments(candidate)[found.index]!
    const size = DEFAULT_OPENING_SIZE[type]
    const height = Math.min(size.height, candidate.ceilingHeight - size.bottom)
    const width = Math.min(size.width, seg.length)
    const offset = findFreeOffset(found.wall.openings, seg.length, width)
    if (offset === null || width < L.minOpeningSize || height < L.minOpeningSize) {
      return fail('Not enough free space on this wall')
    }
    found.wall.openings.push({ id: generateId(type), type, offset, width, height, bottom: size.bottom })
    found.wall.openings.sort((a, b) => a.offset - b.offset)
    return commit(candidate)
  }

  function updateOpening(
    wallId: string,
    openingId: string,
    changes: Partial<Pick<Opening, 'offset' | 'width' | 'height' | 'bottom'>>
  ): GeometryResult {
    if (Object.values(changes).some((v) => !Number.isFinite(v))) return fail('Values must be numbers')
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    const index = found.wall.openings.findIndex((o) => o.id === openingId)
    if (index === -1) return fail('Opening not found')
    const seg = getWallSegments(candidate)[found.index]!
    const requested = { ...found.wall.openings[index]!, ...changes }
    if (requested.width < L.minOpeningSize || requested.height < L.minOpeningSize) {
      return fail(`Openings must be at least ${L.minOpeningSize} m wide and high`)
    }
    if (requested.offset < 0 || requested.offset + requested.width > seg.length + 1e-6) {
      return fail(`The opening must fit within the wall (0 – ${seg.length.toFixed(2)} m)`)
    }
    if (requested.bottom < 0 || requested.bottom + requested.height > candidate.ceilingHeight + 1e-6) {
      return fail(`The opening must fit below the ceiling (${candidate.ceilingHeight} m)`)
    }
    const clamped = clampOpening(requested, seg.length, candidate.ceilingHeight)
    if (!clamped) return fail('The wall is too small for this opening')
    if (found.wall.openings.some((o, i) => i !== index && openingsOverlap(o, clamped))) {
      return fail('Openings must not overlap')
    }
    found.wall.openings[index] = clamped
    found.wall.openings.sort((a, b) => a.offset - b.offset)
    return commit(candidate)
  }

  function removeOpening(wallId: string, openingId: string): GeometryResult {
    const candidate = cloneRoom(room.value)
    const found = findWall(candidate, wallId)
    if (!found) return fail('Wall not found')
    const before = found.wall.openings.length
    found.wall.openings = found.wall.openings.filter((o) => o.id !== openingId)
    if (found.wall.openings.length === before) return fail('Opening not found')
    return commit(candidate)
  }

  function selectWall(wallId: string | null): void {
    selectedWallId.value = wallId && room.value.walls.some((w) => w.id === wallId) ? wallId : null
  }

  function resetToDefault(): void {
    room.value = createDefaultRoomGeometry()
    selectedWallId.value = null
  }

  /** Load geometry from untrusted data; returns false (and keeps the current room) if invalid. */
  function loadGeometry(input: unknown): boolean {
    const parsed = parseRoomGeometry(input)
    if (!parsed) return false
    room.value = parsed
    selectedWallId.value = null
    return true
  }

  /** Plain JSON copy for presets / persistence. */
  function serialize(): RoomGeometry {
    return cloneRoom(room.value)
  }

  return {
    room,
    selectedWallId,
    segments,
    corners,
    orientation,
    bounds,
    setCeilingHeight,
    setRoomSize,
    applyShape,
    moveCorner,
    splitWall,
    removeWall,
    addOpening,
    updateOpening,
    removeOpening,
    selectWall,
    resetToDefault,
    loadGeometry,
    serialize,
  }
})
