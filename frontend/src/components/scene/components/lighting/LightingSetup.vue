<template>
  <!-- Ambient Light - reduced intensity since we have fill light -->
  <TresAmbientLight :intensity="0.2" />

  <!-- Key Light (Main) - directional with shadows -->
  <TresDirectionalLight
    ref="keyLightRef"
    :position="keyLightPosition"
    :intensity="lighting.intensity"
    :color="kelvinToColor(lighting.colorTemperature)"
    cast-shadow
  />

  <!-- Fill Light - soft, no shadows, opposite side -->
  <TresDirectionalLight
    ref="fillLightRef"
    :position="fillLightPosition"
    :intensity="fillLightIntensity"
    :color="kelvinToColor(fillLightTemperature)"
  />

  <!-- Accent Light (Rim/Backlight) - behind the scene -->
  <TresDirectionalLight
    :position="accentLightPosition"
    :intensity="accentLightIntensity"
    :color="accentLightColor"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useConfiguratorStore } from '@/stores/configurator'
import type { DirectionalLight } from 'three'

const store = useConfiguratorStore()
const lighting = store.lighting

// Key Light (Main) - primary directional light with shadows
const keyLightRef = ref()
const keyLightPosition = ref<[number, number, number]>([3, 6, 3])

// Fill Light - soft fill from opposite side, no shadows
const fillLightRef = ref()
const fillLightPosition = ref<[number, number, number]>([-3, 4, -2])
const fillLightIntensity = computed(() => lighting.intensity * 0.4) // 40% of key light
const fillLightTemperature = computed(() => Math.min(lighting.colorTemperature + 500, 10000)) // Slightly warmer

// Accent Light (Rim/Backlight) - creates edge highlights
// Note: accentLightRef is used in template but doesn't need reactive updates
const accentLightPosition = ref<[number, number, number]>([-5, 5, 5]) // Behind and to the side
const accentLightIntensity = ref(0.5)
const accentLightColor = ref('#ffffff')

function kelvinToColor(kelvin: number): string {
  const temp = kelvin / 100
  let red, green, blue

  if (temp <= 66) {
    red = 255
    green = temp
    green = 99.4708025861 * Math.log(green) - 161.1195681661
    if (temp <= 19) {
      blue = 0
    } else {
      blue = temp - 10
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307
    }
  } else {
    red = temp - 60
    red = 329.698727446 * Math.pow(red, -0.1332047592)
    green = temp - 60
    green = 288.1221695283 * Math.pow(green, -0.0755148492)
    blue = 255
  }

  red = Math.max(0, Math.min(255, red))
  green = Math.max(0, Math.min(255, green))
  blue = Math.max(0, Math.min(255, blue))

  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`
}

function setupShadowMap(light: DirectionalLight | null | undefined) {
  if (light && light.shadow) {
    // Reduced shadow map size for better performance (1024x1024 instead of 2048x2048)
    // This reduces shadow map memory from 16MB to 4MB and improves FPS significantly
    light.shadow.mapSize.width = 1024
    light.shadow.mapSize.height = 1024
    light.shadow.bias = -0.0001
    light.shadow.normalBias = 0.02
    light.shadow.radius = 2 // Reduced blur radius for better performance (was 4)
    
    // Optimize shadow camera frustum to only cover visible area
    if (light.shadow.camera) {
      light.shadow.camera.left = -5
      light.shadow.camera.right = 5
      light.shadow.camera.top = 5
      light.shadow.camera.bottom = -5
      light.shadow.camera.near = 0.5
      light.shadow.camera.far = 20
      light.shadow.camera.updateProjectionMatrix()
    }
    
  }
}

// Setup key light shadow map
watch(
  () => keyLightRef.value,
  (newLight) => {
    if (newLight) {
      setupShadowMap(newLight)
    }
  },
  { immediate: true }
)

// Update key light when lighting changes
watch(
  () => store.lighting,
  (newLighting) => {
    if (keyLightRef.value) {
      keyLightRef.value.intensity = newLighting.intensity
      keyLightRef.value.color.set(kelvinToColor(newLighting.colorTemperature))
    }
    // Fill light intensity updates automatically via computed
    if (fillLightRef.value) {
      fillLightRef.value.intensity = fillLightIntensity.value
      fillLightRef.value.color.set(kelvinToColor(fillLightTemperature.value))
    }
  },
  { deep: true }
)

// Update fill light when key light changes
watch(fillLightIntensity, (newIntensity) => {
  if (fillLightRef.value) {
    fillLightRef.value.intensity = newIntensity
  }
})

watch(fillLightTemperature, (newTemp) => {
  if (fillLightRef.value) {
    fillLightRef.value.color.set(kelvinToColor(newTemp))
  }
})
</script>

