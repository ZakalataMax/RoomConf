<template>
  <!-- Renderless: configures the WebGL renderer via the Tres context. -->
  <slot />
</template>

<script setup lang="ts">
import { watch, inject } from 'vue'
import type { ShallowRef } from 'vue'
import type { WebGLRenderer } from 'three'
import { ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap } from 'three'

interface TresContext {
  renderer: ShallowRef<WebGLRenderer | null>
}

const context = inject<TresContext | null>('useTres', null)
const renderer = context?.renderer

function setupRenderer(newRenderer: WebGLRenderer) {
  if (newRenderer) {
    newRenderer.outputColorSpace = SRGBColorSpace
    newRenderer.toneMapping = ACESFilmicToneMapping
    newRenderer.toneMappingExposure = 1.0
    newRenderer.shadowMap.enabled = true
    // Using PCFSoftShadowMap for quality, but with reduced shadow map size and radius
    // For better performance, can switch to BasicShadowMap
    newRenderer.shadowMap.type = PCFSoftShadowMap // Soft shadows with PCF
    // Reduced pixel ratio for better performance on lower-end devices
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  }
}

if (renderer) {
  watch(
    () => renderer.value,
    (newRenderer) => {
      if (newRenderer) {
        setupRenderer(newRenderer)
      }
    },
    { immediate: true }
  )
}
</script>

