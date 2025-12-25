<template>
  <TresPerspectiveCamera :position="[5, 5, 5]" :fov="50" />
  <OrbitControls />
  <TresAmbientLight :intensity="0.4" />
  <TresDirectionalLight
    ref="mainLightRef"
    :position="[5, 8, 5]"
    :intensity="lighting.intensity"
    :color="kelvinToColor(lighting.colorTemperature)"
    cast-shadow
  />
  <RoomGeometry />
  <EnvironmentSettings />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { OrbitControls } from '@tresjs/cientos'
import { useConfiguratorStore } from '@/stores/configurator'
import { fetchPreset } from '@/api/presets'
import RoomGeometry from './RoomGeometry.vue'
import EnvironmentSettings from './EnvironmentSettings.vue'

interface Props {
  presetId?: string
}

const props = defineProps<Props>()

const store = useConfiguratorStore()
const lighting = store.lighting
const mainLightRef = ref()

// Convert Kelvin to RGB color for the light
function kelvinToColor(kelvin: number): string {
  // Approximation for Kelvin to RGB
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

// Watch for lighting changes
watch(
  () => store.lighting,
  (newLighting) => {
    if (mainLightRef.value) {
      mainLightRef.value.intensity = newLighting.intensity
      mainLightRef.value.color.set(kelvinToColor(newLighting.colorTemperature))
    }
  },
  { deep: true }
)

// Load preset if presetId is provided
onMounted(async () => {
  if (props.presetId) {
    try {
      const preset = await fetchPreset(props.presetId)
      store.loadPreset(preset)
    } catch (error: any) {
      console.error('Failed to load preset:', error)
      // Gracefully handle missing preset - continue with defaults
      if (error.statusCode === 404) {
        console.warn(`Preset ${props.presetId} not found, using default settings`)
      } else if (error.statusCode === 0) {
        console.warn('Backend server unavailable, using default settings')
      }
    }
  }
})
</script>

