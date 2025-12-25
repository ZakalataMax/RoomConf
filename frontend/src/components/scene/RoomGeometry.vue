<template>
  <TresGroup>
    <!-- Floor -->
    <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0, 0]" @click="selectFloor">
      <TresPlaneGeometry :args="[10, 10]" />
      <TresMeshStandardMaterial
        ref="floorMaterialRef"
        :color="floorMaterial.color"
        :roughness="floorMaterial.roughness"
        :metalness="0"
      />
    </TresMesh>

    <!-- Ceiling -->
    <TresMesh :rotation="[Math.PI / 2, 0, 0]" :position="[0, 3, 0]">
      <TresPlaneGeometry :args="[10, 10]" />
      <TresMeshStandardMaterial :color="0xffffff" :roughness="0.8" :metalness="0" />
    </TresMesh>

    <!-- Walls -->
    <!-- Back wall -->
    <TresMesh :position="[0, 1.5, -5]" @click="selectWall">
      <TresPlaneGeometry :args="[10, 3]" />
      <TresMeshStandardMaterial
        ref="wallMaterialRef"
        :color="wallMaterial.color"
        :roughness="wallMaterial.roughness"
        :metalness="0"
      />
    </TresMesh>

    <!-- Left wall -->
    <TresMesh :rotation="[0, Math.PI / 2, 0]" :position="[-5, 1.5, 0]" @click="selectWall">
      <TresPlaneGeometry :args="[10, 3]" />
      <TresMeshStandardMaterial
        ref="wallMaterialLeftRef"
        :color="wallMaterial.color"
        :roughness="wallMaterial.roughness"
        :metalness="0"
      />
    </TresMesh>

    <!-- Right wall -->
    <TresMesh :rotation="[0, -Math.PI / 2, 0]" :position="[5, 1.5, 0]" @click="selectWall">
      <TresPlaneGeometry :args="[10, 3]" />
      <TresMeshStandardMaterial
        ref="wallMaterialRightRef"
        :color="wallMaterial.color"
        :roughness="wallMaterial.roughness"
        :metalness="0"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConfiguratorStore } from '@/stores/configurator'

const store = useConfiguratorStore()
const wallMaterial = store.wallMaterial
const floorMaterial = store.floorMaterial

const wallMaterialRef = ref()
const wallMaterialLeftRef = ref()
const wallMaterialRightRef = ref()
const floorMaterialRef = ref()

function selectWall() {
  store.setSelectedZone('wall')
}

function selectFloor() {
  store.setSelectedZone('floor')
}

// Watch for wall material changes
watch(
  () => store.wallMaterial,
  (newMaterial) => {
    if (wallMaterialRef.value) {
      wallMaterialRef.value.color.set(newMaterial.color)
      wallMaterialRef.value.roughness = newMaterial.roughness
    }
    if (wallMaterialLeftRef.value) {
      wallMaterialLeftRef.value.color.set(newMaterial.color)
      wallMaterialLeftRef.value.roughness = newMaterial.roughness
    }
    if (wallMaterialRightRef.value) {
      wallMaterialRightRef.value.color.set(newMaterial.color)
      wallMaterialRightRef.value.roughness = newMaterial.roughness
    }
  },
  { deep: true }
)

// Watch for floor material changes
watch(
  () => store.floorMaterial,
  (newMaterial) => {
    if (floorMaterialRef.value && newMaterial.color) {
      floorMaterialRef.value.color.set(newMaterial.color)
      floorMaterialRef.value.roughness = newMaterial.roughness || 0.6
    }
  },
  { deep: true }
)
</script>

