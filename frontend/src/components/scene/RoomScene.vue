<template>
  <TresPerspectiveCamera :position="[10, 10, 10]" :fov="50" />
  <OrbitControls
    :zoom-speed="0.3"
    :rotate-speed="0.5"
    :pan-speed="0.5"
    :min-distance="3"
    :max-distance="30"
    :enable-damping="true"
    :damping-factor="0.08"
    :enable-pan="true"
    :enable-rotate="true"
    :enable-zoom="true"
  />
  <RendererSetup />
  <LightingSetup />
  <RoomGeometry />
  <EnvironmentSettings />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { OrbitControls } from '@tresjs/cientos'
import { useConfiguratorStore } from '@/stores/configurator'
import { APIError, fetchPreset } from '@/api/presets'
import RendererSetup from './components/renderer/RendererSetup.vue'
import LightingSetup from './components/lighting/LightingSetup.vue'
import RoomGeometry from './components/geometry/RoomGeometry.vue'
import EnvironmentSettings from './components/environment/EnvironmentSettings.vue'

interface Props {
  presetId?: string
}

const props = defineProps<Props>()
const store = useConfiguratorStore()

onMounted(async () => {
  if (props.presetId) {
    try {
      const preset = await fetchPreset(props.presetId)
      store.loadPreset(preset)
    } catch (error) {
      console.error('Failed to load preset:', error)
      const statusCode = error instanceof APIError ? error.statusCode : undefined
      if (statusCode === 404) {
        console.warn(`Preset ${props.presetId} not found, using default settings`)
      } else if (statusCode === 0) {
        console.warn('Backend server unavailable, using default settings')
      }
    }
  }
})
</script>
