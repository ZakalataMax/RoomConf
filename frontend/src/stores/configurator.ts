import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WallMaterial,
  FloorMaterial,
  LightingParams,
  EnvironmentPreset,
  SelectedZone,
  RoomPreset,
} from '@/types'

export const useConfiguratorStore = defineStore('configurator', () => {
  // Materials
  const wallMaterial = ref<WallMaterial>({
    type: 'paint',
    color: '#f5f5f5',
    roughness: 0.7,
  })

  const floorMaterial = ref<FloorMaterial>({
    preset: 'wood',
    color: '#8b4513',
    roughness: 0.6,
  })

  // Lighting
  const lighting = ref<LightingParams>({
    intensity: 1.0,
    colorTemperature: 6500,
    preset: null,
  })

  // Environment
  const environment = ref<EnvironmentPreset>('day')

  // Active preset
  const activePresetId = ref<string | null>(null)

  // Selected zone
  const selectedZone = ref<SelectedZone>('none')

  // Computed
  const currentPreset = computed<RoomPreset>(() => ({
    id: activePresetId.value || undefined,
    materials: {
      wall: { ...wallMaterial.value },
      floor: { ...floorMaterial.value },
    },
    lighting: { ...lighting.value },
    environment: environment.value,
  }))

  // Actions
  function setWallMaterial(material: Partial<WallMaterial>) {
    wallMaterial.value = { ...wallMaterial.value, ...material }
  }

  function setFloorMaterial(material: Partial<FloorMaterial>) {
    floorMaterial.value = { ...floorMaterial.value, ...material }
  }

  function setLighting(params: Partial<LightingParams>) {
    lighting.value = { ...lighting.value, ...params }
  }

  function setEnvironment(preset: EnvironmentPreset) {
    environment.value = preset
  }

  function setSelectedZone(zone: SelectedZone) {
    selectedZone.value = zone
  }

  function setLightingPreset(preset: 'work' | 'relax' | 'evening') {
    const presets: Record<string, Partial<LightingParams>> = {
      work: {
        intensity: 1.2,
        colorTemperature: 6500,
        preset: 'work',
      },
      relax: {
        intensity: 0.8,
        colorTemperature: 3000,
        preset: 'relax',
      },
      evening: {
        intensity: 0.6,
        colorTemperature: 2500,
        preset: 'evening',
      },
    }

    const presetConfig = presets[preset]
    if (presetConfig) {
      setLighting(presetConfig)
    }
  }

  function loadPreset(preset: RoomPreset) {
    if (preset.materials?.wall) {
      wallMaterial.value = { ...preset.materials.wall }
    }
    if (preset.materials?.floor) {
      floorMaterial.value = { ...preset.materials.floor }
    }
    if (preset.lighting) {
      lighting.value = { ...preset.lighting }
    }
    if (preset.environment) {
      environment.value = preset.environment
    }
    if (preset.id) {
      activePresetId.value = preset.id
    }
  }

  function resetToDefaults() {
    wallMaterial.value = {
      type: 'paint',
      color: '#f5f5f5',
      roughness: 0.7,
    }
    floorMaterial.value = {
      preset: 'wood',
      color: '#8b4513',
      roughness: 0.6,
    }
    lighting.value = {
      intensity: 1.0,
      colorTemperature: 6500,
      preset: null,
    }
    environment.value = 'day'
    activePresetId.value = null
    selectedZone.value = 'none'
  }

  return {
    // State
    wallMaterial,
    floorMaterial,
    lighting,
    environment,
    activePresetId,
    selectedZone,
    // Computed
    currentPreset,
    // Actions
    setWallMaterial,
    setFloorMaterial,
    setLighting,
    setEnvironment,
    setSelectedZone,
    setLightingPreset,
    loadPreset,
    resetToDefaults,
  }
})
