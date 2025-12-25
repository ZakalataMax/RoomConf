<template>
  <!-- Environment is handled via lighting and background color based on preset -->
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useConfiguratorStore } from '@/stores/configurator'
import { useTresContext } from '@tresjs/core'
import { Color } from 'three'

const store = useConfiguratorStore()
const { scene } = useTresContext()

const environmentColors: Record<string, string> = {
  day: '#87ceeb',
  sunset: '#ff7f50',
  night: '#191970',
}

watch(
  () => store.environment,
  (newEnv) => {
    if (scene.value) {
      const color = environmentColors[newEnv] || environmentColors.day
      scene.value.background = new Color(color)
    }
  },
  { immediate: true }
)
</script>

