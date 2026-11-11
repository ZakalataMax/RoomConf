/**
 * Parametric room geometry.
 *
 * The room is a closed polygon on the floor plane: each wall starts at its own
 * corner and ends at the next wall's corner (the last wall closes back to the
 * first). Storing only the start corner keeps the polygon closed by construction
 * and makes the structure plain JSON, so it can be persisted in presets.
 */

/** A point on the floor plane: [x, z] in meters. */
export type Vec2 = [number, number]

export type OpeningType = 'door' | 'window'

/** A rectangular cut-out in a wall (door or window). */
export interface Opening {
  id: string
  type: OpeningType
  /** Distance in meters from the wall start to the opening's left edge. */
  offset: number
  width: number
  height: number
  /** Distance from the floor to the bottom of the opening (always 0 for doors). */
  bottom: number
}

export interface Wall {
  id: string
  /** Corner where this wall starts; it ends at the next wall's start. */
  start: Vec2
  openings: Opening[]
}

export interface RoomGeometry {
  /** Ceiling height in meters; also the height of every wall. */
  ceilingHeight: number
  walls: Wall[]
}

/** A wall with its resolved end point, as used for rendering and validation. */
export interface WallSegment {
  wall: Wall
  index: number
  start: Vec2
  end: Vec2
  length: number
}

/** Axis-aligned rectangle in wall-local coordinates (u along the wall, v up). */
export interface WallPanel {
  u0: number
  u1: number
  v0: number
  v1: number
}

export type GeometryResult = { ok: true } | { ok: false; error: string }
