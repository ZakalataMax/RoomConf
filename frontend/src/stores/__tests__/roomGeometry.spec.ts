import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoomGeometryStore } from '../roomGeometry'
import { createDefaultRoomGeometry } from '@/constants/geometry'

function expectError(result: { ok: boolean; error?: string }, pattern: RegExp) {
  expect(result.ok).toBe(false)
  expect(result.error).toMatch(pattern)
}

describe('roomGeometry store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with the default 10x10 m room, 3 m ceiling and four plain walls', () => {
    const store = useRoomGeometryStore()
    expect(store.room).toEqual(createDefaultRoomGeometry())
    expect(store.segments.map((s) => s.length)).toEqual([10, 10, 10, 10])
    expect(store.segments[3]!.end).toEqual([-5, -5]) // last wall closes the loop
    expect(store.bounds).toMatchObject({ width: 10, depth: 10 })
    expect(store.orientation).toBe(1)
  })

  it('resizes the room about its center and validates the range', () => {
    const store = useRoomGeometryStore()
    expect(store.setRoomSize(6, 4).ok).toBe(true)
    expect(store.corners).toEqual([
      [-3, -2],
      [3, -2],
      [3, 2],
      [-3, 2],
    ])
    expectError(store.setRoomSize(1, 4), /between 2 and 30/)
    expectError(store.setRoomSize(6, 31), /between 2 and 30/)
    expect(store.bounds.width).toBe(6) // unchanged after rejected input
  })

  it('validates and applies the ceiling height', () => {
    const store = useRoomGeometryStore()
    expect(store.setCeilingHeight(2.7).ok).toBe(true)
    expect(store.room.ceilingHeight).toBe(2.7)
    expectError(store.setCeilingHeight(1.5), /Ceiling height/)
    expectError(store.setCeilingHeight(Number.NaN), /Ceiling height/)
    expect(store.room.ceilingHeight).toBe(2.7)
  })

  it('applies an L-shaped outline with six walls of the same footprint', () => {
    const store = useRoomGeometryStore()
    expect(store.applyShape('l-shape').ok).toBe(true)
    expect(store.room.walls).toHaveLength(6)
    expect(store.bounds).toMatchObject({ width: 10, depth: 10 })
    expect(store.applyShape('rectangle').ok).toBe(true)
    expect(store.room.walls).toHaveLength(4)
  })

  it('moves a corner, updating both adjacent walls', () => {
    const store = useRoomGeometryStore()
    expect(store.moveCorner('wall-2', [7, -5]).ok).toBe(true)
    expect(store.segments[0]!.end).toEqual([7, -5])
    expect(store.segments[0]!.length).toBe(12)
    expect(store.segments[1]!.start).toEqual([7, -5])
  })

  it('rejects corner moves that create crossing or too-short walls', () => {
    const store = useRoomGeometryStore()
    expectError(store.moveCorner('wall-2', [-5, 6]), /cross/)
    expectError(store.moveCorner('wall-2', [-4.8, -5]), /at least 0.5 m/)
    expectError(store.moveCorner('wall-2', [40, -5]), /±25/)
    expect(store.room).toEqual(createDefaultRoomGeometry())
  })

  it('adds a wall by splitting one at its midpoint and removes walls down to three', () => {
    const store = useRoomGeometryStore()
    expect(store.splitWall('wall-1').ok).toBe(true)
    expect(store.room.walls).toHaveLength(5)
    expect(store.room.walls[1]!.start).toEqual([0, -5])
    expect(store.segments.slice(0, 2).map((s) => s.length)).toEqual([5, 5])

    expect(store.removeWall(store.room.walls[1]!.id).ok).toBe(true)
    expect(store.removeWall('wall-4').ok).toBe(true)
    expect(store.room.walls).toHaveLength(3)
    expectError(store.removeWall('wall-1'), /at least 3 walls/)
  })

  it('keeps openings on the right half when splitting and refuses to cut through one', () => {
    const store = useRoomGeometryStore()
    store.addOpening('wall-1', 'door') // centered at 4.55..5.45, straddles the midpoint
    expectError(store.splitWall('wall-1'), /middle of the wall/)

    const doorId = store.room.walls[0]!.openings[0]!.id
    store.updateOpening('wall-1', doorId, { offset: 7 })
    expect(store.splitWall('wall-1').ok).toBe(true)
    expect(store.room.walls[0]!.openings).toHaveLength(0)
    expect(store.room.walls[1]!.openings[0]).toMatchObject({ id: doorId, offset: 2 })
  })

  it('adds doors and windows with default sizes in free space', () => {
    const store = useRoomGeometryStore()
    expect(store.addOpening('wall-1', 'door').ok).toBe(true)
    expect(store.addOpening('wall-1', 'window').ok).toBe(true)
    const [first, second] = store.room.walls[0]!.openings
    const door = [first, second].find((o) => o!.type === 'door')!
    const window = [first, second].find((o) => o!.type === 'window')!
    expect(door).toMatchObject({ width: 0.9, height: 2.1, bottom: 0 })
    expect(window).toMatchObject({ width: 1.2, height: 1.2, bottom: 0.9 })
    expect(first!.offset + first!.width).toBeLessThanOrEqual(second!.offset)
  })

  it('reports when a wall has no room for another opening', () => {
    const store = useRoomGeometryStore()
    store.setRoomSize(2, 10)
    expect(store.addOpening('wall-1', 'window').ok).toBe(true) // 1.2 m on a 2 m wall
    expectError(store.addOpening('wall-1', 'door'), /Not enough free space/)
  })

  it('validates opening edits against wall bounds, ceiling and other openings', () => {
    const store = useRoomGeometryStore()
    store.addOpening('wall-1', 'window')
    const id = store.room.walls[0]!.openings[0]!.id

    expect(store.updateOpening('wall-1', id, { offset: 0, width: 2 }).ok).toBe(true)
    expectError(store.updateOpening('wall-1', id, { offset: 9 }), /fit within the wall/)
    expectError(store.updateOpening('wall-1', id, { offset: -1 }), /fit within the wall/)
    expectError(store.updateOpening('wall-1', id, { bottom: 2.5 }), /below the ceiling/)
    expectError(store.updateOpening('wall-1', id, { width: 0.1 }), /at least 0.3 m/)

    store.addOpening('wall-1', 'door')
    expectError(store.updateOpening('wall-1', id, { offset: 4 }), /must not overlap/)
    expect(store.removeOpening('wall-1', id).ok).toBe(true)
    expect(store.room.walls[0]!.openings).toHaveLength(1)
  })

  it('re-fits openings when walls shrink or the ceiling drops', () => {
    const store = useRoomGeometryStore()
    store.addOpening('wall-1', 'door')
    const id = store.room.walls[0]!.openings[0]!.id
    store.updateOpening('wall-1', id, { offset: 9 })

    store.setRoomSize(4, 10)
    const door = store.room.walls[0]!.openings[0]!
    expect(door.offset + door.width).toBeLessThanOrEqual(4)

    store.addOpening('wall-2', 'window')
    store.setCeilingHeight(2.2)
    const window = store.room.walls[1]!.openings[0]!
    expect(window.bottom + window.height).toBeLessThanOrEqual(2.2 + 1e-9)
  })

  it('selects walls, clearing the selection when the wall disappears', () => {
    const store = useRoomGeometryStore()
    store.selectWall('wall-4')
    expect(store.selectedWallId).toBe('wall-4')
    store.selectWall('missing')
    expect(store.selectedWallId).toBeNull()
    store.selectWall('wall-4')
    store.removeWall('wall-4')
    expect(store.selectedWallId).toBeNull()
  })

  it('serializes to plain JSON and loads it back; invalid data is rejected', () => {
    const store = useRoomGeometryStore()
    store.applyShape('l-shape')
    store.addOpening(store.room.walls[0]!.id, 'window')
    const json = JSON.parse(JSON.stringify(store.serialize()))

    store.resetToDefault()
    expect(store.room.walls).toHaveLength(4)
    expect(store.loadGeometry(json)).toBe(true)
    expect(store.room).toEqual(json)

    expect(store.loadGeometry({ ceilingHeight: 3, walls: [{ id: 'a', start: [0, 0] }] })).toBe(false)
    expect(store.loadGeometry('nope')).toBe(false)
    expect(store.room).toEqual(json)
  })

  it('serialize returns a copy that cannot mutate the store', () => {
    const store = useRoomGeometryStore()
    const copy = store.serialize()
    copy.walls[0]!.start[0] = 99
    expect(store.room.walls[0]!.start[0]).toBe(-5)
  })
})
