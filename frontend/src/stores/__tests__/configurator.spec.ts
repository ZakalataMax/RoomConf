import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { RoomPreset } from '@/types'

const STORAGE_KEY = 'room-configurator-state'

// The store reads localStorage once at module load, so each test imports a fresh copy.
async function freshStore() {
  vi.resetModules()
  const { useConfiguratorStore } = await import('../configurator')
  setActivePinia(createPinia())
  return useConfiguratorStore()
}

// Imported lazily so it shares the freshly reset module graph / active pinia.
async function geometryStore() {
  const { useRoomGeometryStore } = await import('../roomGeometry')
  return useRoomGeometryStore()
}

const DEFAULT_CORNERS = [
  [-5, -5],
  [5, -5],
  [5, 5],
  [-5, 5],
]

const samplePreset: RoomPreset = {
  id: 'preset-1',
  name: 'Cozy',
  materials: {
    wall: { type: 'paint', color: '#123456', roughness: 0.3, texture: null },
    floor: { preset: 'tile', color: '#abcdef', roughness: 0.2, texture: null },
  },
  lighting: { intensity: 0.8, colorTemperature: 3000, preset: 'relax' },
  environment: 'sunset',
}

describe('configurator store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with sensible defaults', async () => {
    const store = await freshStore()
    expect(store.wallMaterial).toMatchObject({ type: 'paint', color: '#f5f5f5', roughness: 0.7 })
    expect(store.floorMaterial).toMatchObject({ preset: 'wood', color: '#8b4513' })
    expect(store.lighting).toEqual({ intensity: 1.0, colorTemperature: 6500, preset: null })
    expect(store.environment).toBe('day')
    expect(store.activePresetId).toBeNull()
    expect(store.selectedZone).toBe('none')
  })

  it('merges partial wall/floor material updates', async () => {
    const store = await freshStore()
    store.setWallMaterial({ color: '#000000' })
    store.setFloorMaterial({ roughness: 0.1 })
    expect(store.wallMaterial).toMatchObject({ type: 'paint', color: '#000000', roughness: 0.7 })
    expect(store.floorMaterial).toMatchObject({ preset: 'wood', roughness: 0.1 })
  })

  it.each([
    ['work', 1.2, 6500],
    ['relax', 0.8, 3000],
    ['evening', 0.6, 2500],
  ] as const)('applies the "%s" lighting preset', async (preset, intensity, temp) => {
    const store = await freshStore()
    store.setLightingPreset(preset)
    expect(store.lighting).toEqual({ intensity, colorTemperature: temp, preset })
  })

  it('serializes the current state into a RoomPreset', async () => {
    const store = await freshStore()
    store.setEnvironment('night')
    store.setLighting({ intensity: 1.5 })
    const preset = store.currentPreset
    expect(preset.id).toBeUndefined()
    expect(preset.environment).toBe('night')
    expect(preset.lighting.intensity).toBe(1.5)
    expect(preset.materials.wall).toEqual(store.wallMaterial)
    // a copy, not the live reactive object
    expect(preset.materials.wall).not.toBe(store.wallMaterial)
  })

  it('loadPreset applies every section, tracks the id and persists to localStorage', async () => {
    const store = await freshStore()
    store.loadPreset(samplePreset)
    expect(store.wallMaterial).toEqual(samplePreset.materials.wall)
    expect(store.floorMaterial).toEqual(samplePreset.materials.floor)
    expect(store.lighting).toEqual(samplePreset.lighting)
    expect(store.environment).toBe('sunset')
    expect(store.activePresetId).toBe('preset-1')
    expect(store.currentPreset.id).toBe('preset-1')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.environment).toBe('sunset')
    expect(saved.wallMaterial.color).toBe('#123456')
  })

  it('loadPreset rewrites legacy /texures/ paths from old saved presets', async () => {
    const store = await freshStore()
    store.loadPreset({
      ...samplePreset,
      materials: {
        wall: { ...samplePreset.materials.wall, texture: '/texures/walls/patina-1000-mm-architextures.jpg' },
        floor: { ...samplePreset.materials.floor, texture: '/texures/floor/2145.jpg' },
      },
    })
    expect(store.wallMaterial.texture).toBe('/textures/walls/patina-1000-mm-architextures.jpg')
    expect(store.floorMaterial.texture).toBe('/textures/floor/2145.jpg')
  })

  it('resetToDefaults restores defaults and clears selection/active preset', async () => {
    const store = await freshStore()
    store.loadPreset(samplePreset)
    store.setSelectedZone('wall')
    store.resetToDefaults()
    expect(store.wallMaterial.color).toBe('#f5f5f5')
    expect(store.environment).toBe('day')
    expect(store.activePresetId).toBeNull()
    expect(store.selectedZone).toBe('none')
  })

  it('restores persisted state (with legacy paths normalized) on startup', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        wallMaterial: { color: '#222222', texture: '/texures/walls/patina-1000-mm-architextures.jpg' },
        environment: 'night',
      })
    )
    const store = await freshStore()
    expect(store.wallMaterial).toMatchObject({
      type: 'paint',
      color: '#222222',
      roughness: 0.7,
      texture: '/textures/walls/patina-1000-mm-architextures.jpg',
    })
    expect(store.environment).toBe('night')
    expect(store.lighting.colorTemperature).toBe(6500)
  })

  it('falls back to defaults when persisted state is corrupt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem(STORAGE_KEY, '{not json')
    const store = await freshStore()
    expect(store.environment).toBe('day')
    expect(errorSpy).toHaveBeenCalled()
  })

  it('auto-saves changes after initialization', async () => {
    const store = await freshStore()
    await nextTick()
    store.setEnvironment('sunset')
    await nextTick()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).environment).toBe('sunset')
  })

  describe('geometry integration', () => {
    it('includes the room geometry in the serialized preset', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      geometry.setRoomSize(6, 4)
      expect(store.currentPreset.geometry?.walls.map((w) => w.start)).toEqual([
        [-3, -2],
        [3, -2],
        [3, 2],
        [-3, 2],
      ])
    })

    it('round-trips geometry through a preset (save -> JSON -> load)', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      geometry.applyShape('l-shape')
      geometry.addOpening(geometry.room.walls[0]!.id, 'door')
      geometry.setCeilingHeight(2.8)
      const saved: RoomPreset = JSON.parse(JSON.stringify({ ...store.currentPreset, id: 'g1' }))

      store.resetToDefaults()
      expect(geometry.corners).toEqual(DEFAULT_CORNERS)

      store.loadPreset(saved)
      expect(geometry.room).toEqual(saved.geometry)
      expect(geometry.room.walls).toHaveLength(6)
      expect(geometry.room.walls[0]!.openings[0]!.type).toBe('door')
    })

    it('loads the default room for old presets without geometry', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      geometry.setRoomSize(4, 4)
      store.loadPreset(samplePreset)
      expect(geometry.corners).toEqual(DEFAULT_CORNERS)
      expect(geometry.room.ceilingHeight).toBe(3)
    })

    it('falls back to the default room when a preset carries invalid geometry', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      geometry.setRoomSize(4, 4)
      store.loadPreset({
        ...samplePreset,
        geometry: { ceilingHeight: 3, walls: [] },
      })
      expect(geometry.corners).toEqual(DEFAULT_CORNERS)
    })

    it('persists geometry edits to localStorage and restores them on startup', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      await nextTick()
      geometry.setRoomSize(8, 6)
      await nextTick()
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved.geometry.walls[1].start).toEqual([4, -3])
      expect(store.currentPreset.geometry).toEqual(saved.geometry)

      await freshStore()
      const restored = await geometryStore()
      expect(restored.bounds).toMatchObject({ width: 8, depth: 6 })
    })

    it('ignores corrupt persisted geometry', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ environment: 'night', geometry: { ceilingHeight: 3, walls: 'bad' } })
      )
      const store = await freshStore()
      const geometry = await geometryStore()
      expect(store.environment).toBe('night')
      expect(geometry.corners).toEqual(DEFAULT_CORNERS)
    })

    it('resetToDefaults also resets the geometry', async () => {
      const store = await freshStore()
      const geometry = await geometryStore()
      geometry.applyShape('l-shape')
      store.resetToDefaults()
      expect(geometry.corners).toEqual(DEFAULT_CORNERS)
    })
  })
})
