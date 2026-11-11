import type { RoomGeometry } from './geometry'

export interface WallMaterial {
  type: string
  color: string
  roughness: number
  texture?: string | null
  normalMap?: string | null
}

export interface FloorMaterial {
  preset: string
  color?: string
  roughness?: number
  texture?: string | null
  normalMap?: string | null
}

export interface LightingParams {
  intensity: number
  colorTemperature: number
  preset?: 'work' | 'relax' | 'evening' | null
}

export type EnvironmentPreset = 'day' | 'sunset' | 'night'

export type SelectedZone = 'wall' | 'floor' | 'none'

export interface RoomPreset {
  id?: string
  name?: string
  materials: {
    wall: WallMaterial
    floor: FloorMaterial
  }
  lighting: LightingParams
  environment: EnvironmentPreset
  /** Room outline and openings; absent in presets saved before geometry editing. */
  geometry?: RoomGeometry
  createdAt?: string
  updatedAt?: string
}

