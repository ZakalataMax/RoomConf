import type { OpeningType, RoomGeometry } from '@/types/geometry'

/** Validation limits for user-editable geometry (meters). */
export const GEOMETRY_LIMITS = {
  minRoomSize: 2,
  maxRoomSize: 30,
  minCeilingHeight: 2.2,
  maxCeilingHeight: 6,
  /** Corners must stay within ±maxCoordinate on both axes. */
  maxCoordinate: 25,
  minWallLength: 0.5,
  minWalls: 3,
  maxWalls: 24,
  minOpeningSize: 0.3,
  maxOpeningsPerWall: 6,
} as const

export const DEFAULT_OPENING_SIZE: Record<OpeningType, { width: number; height: number; bottom: number }> = {
  door: { width: 0.9, height: 2.1, bottom: 0 },
  window: { width: 1.2, height: 1.2, bottom: 0.9 },
}

/**
 * Texture mapping reference sizes. The original static scene used a 10x3 m
 * plane for walls and a 10x10 m plane for the floor with UVs spanning 0..1, so
 * mapping UVs as meters / reference keeps the default room pixel-identical while
 * larger or smaller rooms tile the texture at the same density.
 */
export const UV_REFERENCE = {
  wallLength: 10,
  wallHeight: 3,
  floorSize: 10,
} as const

/** The default 10x10 m room with a 3 m ceiling (matches the original static scene). */
export function createDefaultRoomGeometry(): RoomGeometry {
  return {
    ceilingHeight: 3,
    walls: [
      { id: 'wall-1', start: [-5, -5], openings: [] },
      { id: 'wall-2', start: [5, -5], openings: [] },
      { id: 'wall-3', start: [5, 5], openings: [] },
      { id: 'wall-4', start: [-5, 5], openings: [] },
    ],
  }
}
