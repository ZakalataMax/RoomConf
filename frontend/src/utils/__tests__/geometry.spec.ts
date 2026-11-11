import { describe, it, expect } from 'vitest'
import { PlaneGeometry, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import {
  clampOpening,
  computeWallPanels,
  createLShapeCorners,
  findFreeOffset,
  fitOpeningsToWall,
  getWallSegments,
  inwardNormal,
  parseRoomGeometry,
  signedArea,
  validateCorners,
} from '../wallGeometryHelpers'
import { buildCeilingGeometry, buildFloorGeometry, buildWallGeometry } from '../geometryGenerator'
import { createDefaultRoomGeometry } from '@/constants/geometry'
import type { Opening, Vec2 } from '@/types/geometry'

const opening = (overrides: Partial<Opening> = {}): Opening => ({
  id: 'o',
  type: 'window',
  offset: 2,
  width: 1,
  height: 1,
  bottom: 1,
  ...overrides,
})

const square = createDefaultRoomGeometry().walls.map((w) => w.start)

function triangleCount(g: BufferGeometry) {
  return (g.index ? g.index.count : g.getAttribute('position').count) / 3
}

/** Face normal of the first triangle, computed from its winding. */
function firstFaceNormal(g: BufferGeometry): Vector3 {
  const pos = g.getAttribute('position')
  const idx = g.index!
  const [a, b, c] = [0, 1, 2].map((i) => new Vector3().fromBufferAttribute(pos, idx.getX(i)))
  return new Vector3().crossVectors(b!.clone().sub(a!), c!.clone().sub(a!)).normalize()
}

/** Sorted, rounded positions and uvs so geometries can be compared regardless of vertex order. */
function signature(g: BufferGeometry) {
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const rows: string[] = []
  for (let i = 0; i < pos.count; i++) {
    const r = (n: number) => (Math.abs(n) < 1e-9 ? 0 : Math.round(n * 1e4) / 1e4)
    rows.push([pos.getX(i), pos.getY(i), pos.getZ(i), uv.getX(i), uv.getY(i)].map(r).join(','))
  }
  return rows.sort()
}

describe('polygon helpers', () => {
  it('resolves wall segments and orientation of the default room', () => {
    const segments = getWallSegments(createDefaultRoomGeometry())
    expect(segments.map((s) => [s.start, s.end])).toEqual([
      [[-5, -5], [5, -5]],
      [[5, -5], [5, 5]],
      [[5, 5], [-5, 5]],
      [[-5, 5], [-5, -5]],
    ])
    expect(signedArea(square)).toBe(100)
  })

  it('computes inward normals for both polygon orientations', () => {
    expect(inwardNormal([-5, -5], [5, -5], 1).map((n) => n + 0)).toEqual([0, 1])
    expect(inwardNormal([5, -5], [-5, -5], -1).map((n) => n + 0)).toEqual([0, 1])
    expect(inwardNormal([5, -5], [5, 5], 1).map((n) => n + 0)).toEqual([-1, 0])
  })

  it('validates outlines', () => {
    expect(validateCorners(square)).toBeNull()
    expect(validateCorners(createLShapeCorners(8, 6))).toBeNull()
    expect(validateCorners(square.slice(0, 2))).toMatch(/at least 3 walls/)
    const bowTie: Vec2[] = [
      [0, 0],
      [4, 4],
      [4, 0],
      [0, 4],
    ]
    expect(validateCorners(bowTie)).toMatch(/cross/)
    expect(validateCorners([[0, 0], [1, 0], [0, 1]])).toMatch(/floor area/)
  })
})

describe('opening helpers', () => {
  it('clamps openings into the wall and forces doors to the floor', () => {
    expect(clampOpening(opening({ offset: 9.5, width: 1 }), 10, 3)).toMatchObject({ offset: 9 })
    expect(clampOpening(opening({ width: 20 }), 10, 3)).toMatchObject({ offset: 0, width: 10 })
    expect(clampOpening(opening({ bottom: 2.5, height: 1 }), 10, 3)).toMatchObject({ bottom: 2 })
    expect(clampOpening(opening({ type: 'door', bottom: 1 }), 10, 3)).toMatchObject({ bottom: 0 })
    expect(clampOpening(opening(), 0.2, 3)).toBeNull()
  })

  it('finds the center of the largest free gap', () => {
    expect(findFreeOffset([], 10, 1)).toBe(4.5)
    expect(findFreeOffset([opening({ offset: 0, width: 6 })], 10, 1)).toBe(7.5)
    expect(findFreeOffset([opening({ offset: 0.5, width: 9 })], 10, 1)).toBeNull()
  })

  it('drops openings that no longer fit or overlap after a resize', () => {
    const fitted = fitOpeningsToWall(
      [opening({ id: 'a', offset: 0, width: 1 }), opening({ id: 'b', offset: 8, width: 1 })],
      1.5,
      3
    )
    expect(fitted.map((o) => o.id)).toEqual(['a'])
  })

  it('rejects malformed geometry and sanitizes openings that exceed the wall', () => {
    expect(parseRoomGeometry(null)).toBeNull()
    expect(parseRoomGeometry({ ceilingHeight: 10, walls: [] })).toBeNull()
    expect(parseRoomGeometry({ ceilingHeight: 3, walls: [{ start: ['a', 0] }] })).toBeNull()

    const parsed = parseRoomGeometry({
      ceilingHeight: 3,
      walls: [
        { id: 'w1', start: [-5, -5], openings: [{ id: 'd', type: 'door', offset: 9.8, width: 0.9, height: 2.1 }] },
        { id: 'w2', start: [5, -5], openings: [{ type: 'portal', offset: 1, width: 1, height: 1 }] },
        { id: 'w3', start: [5, 5] },
        { id: 'w4', start: [-5, 5], openings: [] },
      ],
    })
    expect(parsed).not.toBeNull()
    expect(parsed!.walls[0]!.openings[0]).toMatchObject({ offset: 9.1, bottom: 0 })
    expect(parsed!.walls[1]!.openings).toEqual([])
    expect(parsed!.walls[2]!.openings).toEqual([])
  })
})

describe('computeWallPanels', () => {
  it('returns a single full panel for a plain wall', () => {
    expect(computeWallPanels(10, 3, [])).toEqual([{ u0: 0, u1: 10, v0: 0, v1: 3 }])
  })

  it('cuts a window into 4 panels (left, below, above, right)', () => {
    const panels = computeWallPanels(10, 3, [opening({ offset: 4, width: 2, bottom: 1, height: 1 })])
    expect(panels).toEqual([
      { u0: 0, u1: 4, v0: 0, v1: 3 },
      { u0: 4, u1: 6, v0: 0, v1: 1 },
      { u0: 4, u1: 6, v0: 2, v1: 3 },
      { u0: 6, u1: 10, v0: 0, v1: 3 },
    ])
  })

  it('leaves no panel below a door and none at all for a full-size opening', () => {
    const door = computeWallPanels(10, 3, [opening({ type: 'door', offset: 0, width: 1, bottom: 0, height: 2 })])
    expect(door).toEqual([
      { u0: 0, u1: 1, v0: 2, v1: 3 },
      { u0: 1, u1: 10, v0: 0, v1: 3 },
    ])
    expect(computeWallPanels(2, 3, [opening({ offset: 0, width: 2, bottom: 0, height: 3 })])).toEqual([])
  })
})

describe('geometry builders', () => {
  it('builds a plain wall as one quad identical to the original 10x3 plane', () => {
    const wall = buildWallGeometry({ start: [-5, -5], end: [5, -5], height: 3, openings: [], orientation: 1 })
    expect(wall.getAttribute('position').count).toBe(4)
    expect(triangleCount(wall)).toBe(2)

    // Original back wall: PlaneGeometry(10, 3) at (0, 1.5, -5).
    const original = new PlaneGeometry(10, 3).translate(0, 1.5, -5)
    expect(signature(wall)).toEqual(signature(original))
    expect(firstFaceNormal(wall).toArray().map((n) => Math.round(n) + 0)).toEqual([0, 0, 1])
  })

  it('matches the original rotated side walls', () => {
    const left = buildWallGeometry({ start: [-5, 5], end: [-5, -5], height: 3, openings: [], orientation: 1 })
    const originalLeft = new PlaneGeometry(10, 3).rotateY(Math.PI / 2).translate(-5, 1.5, 0)
    expect(signature(left)).toEqual(signature(originalLeft))

    const right = buildWallGeometry({ start: [5, -5], end: [5, 5], height: 3, openings: [], orientation: 1 })
    const originalRight = new PlaneGeometry(10, 3).rotateY(-Math.PI / 2).translate(5, 1.5, 0)
    expect(signature(right)).toEqual(signature(originalRight))
  })

  it('cuts openings: a window adds 3 quads, and no vertex lies inside the hole', () => {
    const hole = opening({ offset: 4, width: 2, bottom: 1, height: 1 })
    const wall = buildWallGeometry({ start: [-5, -5], end: [5, -5], height: 3, openings: [hole], orientation: 1 })
    expect(wall.getAttribute('position').count).toBe(16)
    expect(triangleCount(wall)).toBe(8)

    const pos = wall.getAttribute('position')
    const index = wall.index!
    for (let t = 0; t < index.count; t += 3) {
      const cx = [0, 1, 2].reduce((s, k) => s + pos.getX(index.getX(t + k)), 0) / 3
      const cy = [0, 1, 2].reduce((s, k) => s + pos.getY(index.getX(t + k)), 0) / 3
      const insideHole = cx > -1 && cx < 1 && cy > 1 && cy < 2
      expect(insideHole).toBe(false)
    }
  })

  it('keeps walls facing inward for clockwise outlines', () => {
    const wall = buildWallGeometry({ start: [5, -5], end: [-5, -5], height: 3, openings: [], orientation: -1 })
    expect(firstFaceNormal(wall).toArray().map((n) => Math.round(n) + 0)).toEqual([0, 0, 1])
  })

  it('builds the default floor identical to the original 10x10 plane, facing up', () => {
    const floor = buildFloorGeometry(square)
    expect(floor.getAttribute('position').count).toBe(4)
    expect(triangleCount(floor)).toBe(2)
    const original = new PlaneGeometry(10, 10).rotateX(-Math.PI / 2)
    expect(signature(floor)).toEqual(signature(original))
    expect(firstFaceNormal(floor).toArray().map((n) => Math.round(n) + 0)).toEqual([0, 1, 0])
  })

  it('triangulates an L-shaped floor and a downward-facing ceiling', () => {
    const corners = createLShapeCorners(10, 10)
    const floor = buildFloorGeometry(corners)
    expect(floor.getAttribute('position').count).toBe(6)
    expect(triangleCount(floor)).toBe(4)

    const ceiling = buildCeilingGeometry(square)
    expect(firstFaceNormal(ceiling).toArray().map((n) => Math.round(n) + 0)).toEqual([0, -1, 0])
  })
})
