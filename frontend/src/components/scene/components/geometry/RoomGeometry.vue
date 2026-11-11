<template>
  <TresGroup>
    <TresMesh :geometry="floorGeometry" :material="floorMaterial" receive-shadow @click="selectFloor" />

    <TresMesh :geometry="ceilingGeometry" :material="ceilingMaterial" :position="[0, ceilingHeight, 0]" />

    <TresMesh
      v-for="wall in wallMeshes"
      :key="wall.id"
      :geometry="wall.geometry"
      :material="wallMaterial"
      receive-shadow
      @click="selectWall(wall.id)"
    />
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { MeshStandardMaterial } from 'three'
import type { BufferGeometry, Texture } from 'three'
import { useConfiguratorStore } from '@/stores/configurator'
import { useRoomGeometryStore } from '@/stores/roomGeometry'
import { useTextureLoader } from '@/composables/useTextureLoader'
import { buildCeilingGeometry, buildFloorGeometry, buildWallGeometry } from '@/utils/geometryGenerator'

const store = useConfiguratorStore()
const geometryStore = useRoomGeometryStore()
const { loadTexture, getNormalMapPath } = useTextureLoader()

const DEFAULT_FLOOR_COLOR = '#8b4513'
const DEFAULT_FLOOR_ROUGHNESS = 0.6

// One shared material per surface type: every wall uses the same material, so
// colour/texture changes apply to all walls at once regardless of their number.
const wallMaterial = new MeshStandardMaterial({
  color: store.wallMaterial.color,
  roughness: store.wallMaterial.roughness,
  metalness: 0,
})
const floorMaterial = new MeshStandardMaterial({
  color: store.floorMaterial.color || DEFAULT_FLOOR_COLOR,
  roughness: store.floorMaterial.roughness ?? DEFAULT_FLOOR_ROUGHNESS,
  metalness: 0,
})
const ceilingMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 })

// ---- Geometry -------------------------------------------------------------

const ceilingHeight = computed(() => geometryStore.room.ceilingHeight)
const floorGeometry = shallowRef<BufferGeometry>()
const ceilingGeometry = shallowRef<BufferGeometry>()
const wallMeshes = shallowRef<Array<{ id: string; geometry: BufferGeometry }>>([])

function rebuildGeometry() {
  const previous = [floorGeometry.value, ceilingGeometry.value, ...wallMeshes.value.map((w) => w.geometry)]

  const corners = geometryStore.corners
  floorGeometry.value = buildFloorGeometry(corners)
  ceilingGeometry.value = buildCeilingGeometry(corners)
  wallMeshes.value = geometryStore.segments.map((seg) => ({
    id: seg.wall.id,
    geometry: buildWallGeometry({
      start: seg.start,
      end: seg.end,
      height: geometryStore.room.ceilingHeight,
      openings: seg.wall.openings,
      orientation: geometryStore.orientation,
    }),
  }))

  previous.forEach((g) => g?.dispose())
}

watch(() => geometryStore.room, rebuildGeometry, { deep: true, immediate: true })

// ---- Selection -------------------------------------------------------------

function selectWall(wallId: string) {
  store.setSelectedZone('wall')
  geometryStore.selectWall(wallId)
}

function selectFloor() {
  store.setSelectedZone('floor')
}

// ---- Materials & textures ---------------------------------------------------

// Guards against out-of-order async loads when the texture changes quickly.
const loadTokens = new WeakMap<MeshStandardMaterial, number>()

function setMaps(material: MeshStandardMaterial, map: Texture | null, normalMap: Texture | null) {
  material.map = map
  material.normalMap = normalMap
  material.needsUpdate = true
}

async function applyTexture(material: MeshStandardMaterial, texturePath: string | null | undefined, label: string) {
  const token = (loadTokens.get(material) ?? 0) + 1
  loadTokens.set(material, token)

  if (!texturePath) {
    setMaps(material, null, null)
    return
  }

  try {
    const texture = await loadTexture(texturePath)
    let normalMap: Texture | null = null
    const normalMapPath = getNormalMapPath(texturePath)
    if (normalMapPath) {
      try {
        normalMap = await loadTexture(normalMapPath, true)
      } catch {
        // Normal maps are optional.
      }
    }
    if (loadTokens.get(material) === token) setMaps(material, texture, normalMap)
  } catch (error) {
    console.error(`[RoomGeometry] Failed to load ${label} texture:`, error)
    if (loadTokens.get(material) === token) setMaps(material, null, null)
  }
}

watch(
  () => store.wallMaterial,
  (material) => {
    wallMaterial.color.set(material.color)
    wallMaterial.roughness = material.roughness
    applyTexture(wallMaterial, material.texture, 'wall')
  },
  { deep: true }
)

watch(
  () => store.floorMaterial,
  (material) => {
    floorMaterial.color.set(material.color || DEFAULT_FLOOR_COLOR)
    floorMaterial.roughness = material.roughness ?? DEFAULT_FLOOR_ROUGHNESS
    applyTexture(floorMaterial, material.texture, 'floor')
  },
  { deep: true }
)

onMounted(() => {
  applyTexture(wallMaterial, store.wallMaterial.texture, 'wall')
  applyTexture(floorMaterial, store.floorMaterial.texture, 'floor')
})

onBeforeUnmount(() => {
  floorGeometry.value?.dispose()
  ceilingGeometry.value?.dispose()
  wallMeshes.value.forEach((w) => w.geometry.dispose())
  wallMaterial.dispose()
  floorMaterial.dispose()
  ceilingMaterial.dispose()
})
</script>
