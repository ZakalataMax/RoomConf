import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import type {
  WallMaterial,
  FloorMaterial,
  LightingParams,
  EnvironmentPreset,
  SelectedZone,
  RoomPreset,
} from '@/types'
import { normalizeMaterialTextures } from '@/utils/texturePath'
import { useRoomGeometryStore } from '@/stores/roomGeometry'
import type { RoomGeometry } from '@/types/geometry'

const STORAGE_KEY = 'room-configurator-state'

const defaultState = {
  wallMaterial: {
    type: 'paint',
    color: '#f5f5f5',
    roughness: 0.7,
    texture: null,
  },
  floorMaterial: {
    preset: 'wood',
    color: '#8b4513',
    roughness: 0.6,
    texture: null,
  },
  lighting: {
    intensity: 1.0,
    colorTemperature: 6500,
    preset: null,
  },
  environment: 'day' as EnvironmentPreset,
  geometry: undefined as unknown,
}

function loadStateFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        wallMaterial: normalizeMaterialTextures({
          ...defaultState.wallMaterial,
          ...parsed.wallMaterial,
        }),
        floorMaterial: normalizeMaterialTextures({
          ...defaultState.floorMaterial,
          ...parsed.floorMaterial,
        }),
        lighting: { ...defaultState.lighting, ...parsed.lighting },
        environment: parsed.environment || defaultState.environment,
        // Validated by the geometry store when applied; invalid data falls back to the default room.
        geometry: parsed.geometry as unknown,
      }
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error)
  }
  return defaultState
}

function saveStateToStorage(state: {
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  lighting: LightingParams
  environment: EnvironmentPreset
  geometry: RoomGeometry
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save state to localStorage:', error)
  }
}

const initialState = loadStateFromStorage()

export const useConfiguratorStore = defineStore('configurator', () => {
  const geometryStore = useRoomGeometryStore()
  if (initialState.geometry) {
    geometryStore.loadGeometry(initialState.geometry)
  }

  const wallMaterial = ref<WallMaterial>(initialState.wallMaterial)

  const floorMaterial = ref<FloorMaterial>(initialState.floorMaterial)

  const lighting = ref<LightingParams>(initialState.lighting)

  const environment = ref<EnvironmentPreset>(initialState.environment)

  const activePresetId = ref<string | null>(null)

  const selectedZone = ref<SelectedZone>('none')

  const currentPreset = computed<RoomPreset>(() => ({
    id: activePresetId.value || undefined,
    materials: {
      wall: { ...wallMaterial.value },
      floor: { ...floorMaterial.value },
    },
    lighting: { ...lighting.value },
    environment: environment.value,
    geometry: geometryStore.serialize(),
  }))

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
      wallMaterial.value = normalizeMaterialTextures({ ...preset.materials.wall })
    }
    if (preset.materials?.floor) {
      floorMaterial.value = normalizeMaterialTextures({ ...preset.materials.floor })
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
    // Presets saved before geometry editing existed have no geometry: use the default room.
    if (!preset.geometry || !geometryStore.loadGeometry(preset.geometry)) {
      geometryStore.resetToDefault()
    }
    saveCurrentState()
  }

  function resetToDefaults() {
    wallMaterial.value = {
      type: 'paint',
      color: '#f5f5f5',
      roughness: 0.7,
      texture: null,
    }
    floorMaterial.value = {
      preset: 'wood',
      color: '#8b4513',
      roughness: 0.6,
      texture: null,
    }
    lighting.value = {
      intensity: 1.0,
      colorTemperature: 6500,
      preset: null,
    }
    environment.value = 'day'
    activePresetId.value = null
    selectedZone.value = 'none'
    geometryStore.resetToDefault()
    saveCurrentState()
  }

  function saveCurrentState() {
    saveStateToStorage({
      wallMaterial: wallMaterial.value,
      floorMaterial: floorMaterial.value,
      lighting: lighting.value,
      environment: environment.value,
      geometry: geometryStore.serialize(),
    })
  }

  // Auto-save state on changes (skip initial trigger)
  let isInitialized = false

  watch(
    () => wallMaterial.value,
    () => {
      if (isInitialized) {
        saveCurrentState()
      }
    },
    { deep: true, immediate: false }
  )

  watch(
    () => floorMaterial.value,
    () => {
      if (isInitialized) {
        saveCurrentState()
      }
    },
    { deep: true, immediate: false }
  )

  watch(
    () => lighting.value,
    () => {
      if (isInitialized) {
        saveCurrentState()
      }
    },
    { deep: true, immediate: false }
  )

  watch(
    () => environment.value,
    () => {
      if (isInitialized) {
        saveCurrentState()
      }
    },
    { immediate: false }
  )

  watch(
    () => geometryStore.room,
    () => {
      if (isInitialized) {
        saveCurrentState()
      }
    },
    { deep: true, immediate: false }
  )

  // Mark as initialized after initial setup
  nextTick(() => {
    isInitialized = true
  })

  return {
    wallMaterial,
    floorMaterial,
    lighting,
    environment,
    activePresetId,
    selectedZone,
    currentPreset,
    setWallMaterial,
    setFloorMaterial,
    setLighting,
    setEnvironment,
    setSelectedZone,
    setLightingPreset,
    loadPreset,
    resetToDefaults,
    saveCurrentState,
  }
})
