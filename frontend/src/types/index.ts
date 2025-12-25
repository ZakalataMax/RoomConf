export interface WallMaterial {
  type: string
  color: string
  roughness: number
}

export interface FloorMaterial {
  preset: string
  color?: string
  roughness?: number
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
  createdAt?: string
  updatedAt?: string
}

