<template>
  <!-- Renderless: configures the scene background/environment via the Tres context. -->
  <slot />
</template>

<script setup lang="ts">
import { watch, inject, ref, shallowRef, onMounted, onUnmounted, nextTick } from 'vue'
import type { ShallowRef } from 'vue'
import type { DataTexture, Scene, Texture, WebGLRenderer } from 'three'
import { useConfiguratorStore } from '@/stores/configurator'
import { Color, PMREMGenerator } from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

const store = useConfiguratorStore()

interface TresContext {
  scene: ShallowRef<Scene | null>
  renderer: ShallowRef<WebGLRenderer | null>
}

const context = inject<TresContext | null>('useTres', null)
const scene = context?.scene
const renderer = context?.renderer

const pmremGenerator = ref<PMREMGenerator | null>(null)
const hdriTexture = shallowRef<Texture | null>(null) // Environment map from PMREMGenerator
const hdrLoader = new HDRLoader()

const environmentColors: Record<string, string> = {
  day: '#87ceeb',
  sunset: '#ff7f50',
  night: '#191970',
}

// HDRI paths for different environments
// Place .hdr or .exr files in /public/hdri/ folder
// Format: day.hdr, sunset.hdr, night.hdr
const hdriPaths: Record<string, string | null> = {
  day: '/hdri/day.hdr', // Will fallback to solid color if file doesn't exist
  sunset: '/hdri/sunset.hdr',
  night: '/hdri/night.hdr',
}

async function loadHDRI(path: string, rendererInstance: WebGLRenderer): Promise<Texture | null> {
  try {
    const texture = await new Promise<DataTexture>((resolve, reject) => {
      hdrLoader.load(
        path,
        (texture) => {
          resolve(texture)
        },
        undefined,
        (error) => {
          reject(error)
        }
      )
    })

    if (!pmremGenerator.value) {
      pmremGenerator.value = new PMREMGenerator(rendererInstance)
      pmremGenerator.value.compileEquirectangularShader()
    }

    const envMapResult = pmremGenerator.value.fromEquirectangular(texture)
    const envMap = envMapResult.texture
    texture.dispose()
    envMapResult.dispose()
    return envMap
  } catch (error) {
    console.error('Failed to load HDRI:', error)
    return null
  }
}

function fallbackToSolidColor(sceneInstance: Scene, env: string) {
  const color = environmentColors[env] || environmentColors.day
  sceneInstance.background = new Color(color)
  
  // Clear environment map if no HDRI
  if (sceneInstance.environment) {
    if (hdriTexture.value) {
      hdriTexture.value.dispose()
      hdriTexture.value = null
    }
    sceneInstance.environment = null
  }
}

function setBackground(sceneInstance: Scene, env: string, rendererInstance: WebGLRenderer | null) {
  if (!sceneInstance) {
    console.warn('[EnvironmentSettings] No scene instance available')
    return
  }

  const hdriPath = hdriPaths[env]
  
  // Try to load HDRI if path is provided and renderer is available
  if (hdriPath && rendererInstance) {
    loadHDRI(hdriPath, rendererInstance)
      .then((envMap) => {
        if (envMap && sceneInstance) {
          sceneInstance.environment = envMap
          sceneInstance.background = envMap
          hdriTexture.value = envMap
        } else {
          // HDRI loaded but invalid, fallback to solid color
          fallbackToSolidColor(sceneInstance, env)
        }
      })
      .catch((error) => {
        // If HDRI fails to load (file not found, etc.), fallback to solid color
        console.debug('[EnvironmentSettings] HDRI not available, using solid color:', hdriPath, error.message)
        fallbackToSolidColor(sceneInstance, env)
      })
  } else {
    // No HDRI path or renderer not ready, use solid color
    fallbackToSolidColor(sceneInstance, env)
  }
}

// Initialize PMREM generator when renderer is available
watch(
  () => renderer?.value,
  (newRenderer) => {
    if (newRenderer && !pmremGenerator.value) {
      pmremGenerator.value = new PMREMGenerator(newRenderer)
      pmremGenerator.value.compileEquirectangularShader()
      
      // Set initial environment
      if (scene?.value) {
        setBackground(scene.value, store.environment, newRenderer)
      }
    }
  },
  { immediate: true }
)

if (scene) {
  watch(
    () => store.environment,
    (newEnv) => {
      if (scene.value) {
        // Always set background, even without renderer (for solid colors)
        setBackground(scene.value, newEnv, renderer?.value || null)
      }
    },
    { immediate: true }
  )

  watch(
    () => scene.value,
    (newScene) => {
      if (newScene) {
        // Always set background, even without renderer (for solid colors)
        setBackground(newScene, store.environment, renderer?.value || null)
      }
    },
    { immediate: true }
  )
}

onMounted(() => {
  // Ensure background is set after component is mounted
  nextTick(() => {
    if (scene?.value) {
      setBackground(scene.value, store.environment, renderer?.value || null)
    }
  })
  
  // Also set up a periodic check to ensure background is always set
  // This handles cases where scene might be created later
  const checkInterval = setInterval(() => {
    if (scene?.value) {
      const currentBg = scene.value.background
      
      // If background is null or black (default), set it
      if (!currentBg || (currentBg instanceof Color && currentBg.getHex() === 0x000000)) {
        setBackground(scene.value, store.environment, renderer?.value || null)
      }
    }
  }, 100)
  
  // Clear interval after 5 seconds (scene should be ready by then)
  setTimeout(() => {
    clearInterval(checkInterval)
  }, 5000)
})

onUnmounted(() => {
  // Cleanup on unmount
  if (hdriTexture.value) {
    hdriTexture.value.dispose()
    hdriTexture.value = null
  }
  if (pmremGenerator.value) {
    pmremGenerator.value.dispose()
    pmremGenerator.value = null
  }
})
</script>

