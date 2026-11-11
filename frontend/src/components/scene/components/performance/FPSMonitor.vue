<template>
  <div class="fps-monitor">
    <div class="fps-display">
      <span class="fps-label">FPS:</span>
      <span class="fps-value" :class="fpsClass">{{ fps }}</span>
    </div>
    <div class="fps-info">
      <span class="fps-min">Min: {{ minFPS }}</span>
      <span class="fps-avg">Avg: {{ avgFPS.toFixed(1) }}</span>
      <span class="fps-max">Max: {{ maxFPS }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const fps = ref(0)
const minFPS = ref(60)
const maxFPS = ref(0)
const avgFPS = ref(0)
const fpsHistory = ref<number[]>([])
const maxHistoryLength = 60

let frameCount = 0
let lastTime = performance.now()
let animationFrameId: number | null = null

function updateFPS() {
  frameCount++
  const currentTime = performance.now()
  const delta = currentTime - lastTime

  if (delta >= 1000) {
    const currentFPS = Math.round((frameCount * 1000) / delta)
    fps.value = currentFPS

    if (fpsHistory.value.length >= maxHistoryLength) {
      fpsHistory.value.shift()
    }
    fpsHistory.value.push(currentFPS)

    if (currentFPS < minFPS.value || minFPS.value === 60) {
      minFPS.value = currentFPS
    }
    if (currentFPS > maxFPS.value) {
      maxFPS.value = currentFPS
    }

    if (fpsHistory.value.length > 0) {
      const sum = fpsHistory.value.reduce((a, b) => a + b, 0)
      avgFPS.value = sum / fpsHistory.value.length
    }

    frameCount = 0
    lastTime = currentTime
  }

  animationFrameId = requestAnimationFrame(updateFPS)
}

const fpsClass = computed(() => {
  if (fps.value >= 55) return 'excellent'
  if (fps.value >= 30) return 'good'
  if (fps.value >= 20) return 'fair'
  return 'poor'
})

onMounted(() => {
  lastTime = performance.now()
  animationFrameId = requestAnimationFrame(updateFPS)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.fps-monitor {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 200px;
}

.fps-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.fps-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.fps-value {
  font-weight: 700;
  font-size: 1.1rem;
  transition: color 0.3s ease;
}

.fps-value.excellent {
  color: #4ade80;
}

.fps-value.good {
  color: #60a5fa;
}

.fps-value.fair {
  color: #fbbf24;
}

.fps-value.poor {
  color: #f87171;
}

.fps-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.fps-info span {
  display: block;
}
</style>

