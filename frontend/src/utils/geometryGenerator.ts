import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, Vector2 } from 'three'
import { UV_REFERENCE } from '@/constants/geometry'
import type { Opening, Vec2 } from '@/types/geometry'
import { computeWallPanels, inwardNormal } from './wallGeometryHelpers'

export interface WallGeometryInput {
  start: Vec2
  end: Vec2
  height: number
  openings: Opening[]
  /** Sign of the room polygon's signed area; decides which side faces inward. */
  orientation: number
}

/**
 * Build the inward-facing surface of a wall in world space, with rectangular
 * holes for its openings. Walls are single-sided (like the original planes), so
 * a wall is automatically hidden when the camera looks at it from outside.
 *
 * UVs: u = distance along the wall / 10 m, v = height / 3 m, which reproduces the
 * mapping of the original 10x3 m wall planes.
 */
export function buildWallGeometry({ start, end, height, openings, orientation }: WallGeometryInput): BufferGeometry {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1])
  const dir: Vec2 = length > 0 ? [(end[0] - start[0]) / length, (end[1] - start[1]) / length] : [1, 0]
  const [nx, nz] = inwardNormal(start, end, orientation)
  const panels = computeWallPanels(length, height, openings)

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // With the default corner order (positive area) cross(dir, up) already points
  // inward; otherwise flip the winding so the front face still faces the room.
  const flip = orientation < 0

  for (const p of panels) {
    const base = positions.length / 3
    const corners: Array<[number, number]> = [
      [p.u0, p.v0],
      [p.u1, p.v0],
      [p.u1, p.v1],
      [p.u0, p.v1],
    ]
    for (const [u, v] of corners) {
      positions.push(start[0] + dir[0] * u, v, start[1] + dir[1] * u)
      normals.push(nx, 0, nz)
      uvs.push(u / UV_REFERENCE.wallLength, v / UV_REFERENCE.wallHeight)
    }
    if (flip) {
      indices.push(base, base + 3, base + 1, base + 1, base + 3, base + 2)
    } else {
      indices.push(base, base + 1, base + 3, base + 1, base + 2, base + 3)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

function polygonShape(corners: Vec2[], mapZ: (z: number) => number): Shape {
  return new Shape(corners.map(([x, z]) => new Vector2(x, mapZ(z))))
}

/**
 * Upward-facing floor polygon at y = 0. UVs match the original 10x10 m floor
 * plane (u = x / 10 + 0.5, v = 0.5 - z / 10).
 */
export function buildFloorGeometry(corners: Vec2[]): BufferGeometry {
  // Shape lives in XY; rotating by -90° about X maps (x, y) -> (x, 0, -y).
  const geometry = new ShapeGeometry(polygonShape(corners, (z) => -z))
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) / UV_REFERENCE.floorSize + 0.5, uv.getY(i) / UV_REFERENCE.floorSize + 0.5)
  }
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** Downward-facing ceiling polygon at y = 0 (position the mesh at the ceiling height). */
export function buildCeilingGeometry(corners: Vec2[]): BufferGeometry {
  // Rotating by +90° about X maps (x, y) -> (x, 0, y) and turns the face downward.
  const geometry = new ShapeGeometry(polygonShape(corners, (z) => z))
  geometry.rotateX(Math.PI / 2)
  return geometry
}
