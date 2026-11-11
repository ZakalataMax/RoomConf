<template>
  <Transition name="overlay">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancelClick">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Load Preset</h3>
          <button class="modal-close" @click="handleCancel">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loading" class="loading-state">
            <p>Loading presets...</p>
          </div>
          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button class="retry-btn" @click="loadPresets">Retry</button>
          </div>
          <div v-else-if="presets.length === 0" class="empty-state">
            <p>No presets available. Save a preset first!</p>
          </div>
          <div v-else class="presets-list">
            <div
              v-for="preset in presets"
              :key="preset.id"
              class="preset-item"
              @click="handleSelectPreset(preset)"
            >
              <div class="preset-info">
                <h4>{{ preset.name || 'Unnamed Preset' }}</h4>
                <p class="preset-meta">
                  {{ preset.environment }} • {{ preset.lighting?.intensity?.toFixed(1) }}x
                </p>
              </div>
              <div class="preset-arrow">→</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchPresets } from '@/api/presets'
import type { RoomPreset } from '@/types'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  load: [preset: RoomPreset]
  cancel: []
}>()

const presets = ref<RoomPreset[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const isOpening = ref(false)

watch(() => props.visible, (newVisible, oldVisible) => {
  if (newVisible && !oldVisible) {
    isOpening.value = true
    setTimeout(() => {
      isOpening.value = false
    }, 100)
    loadPresets()
  }
}, { immediate: false })

async function loadPresets() {
  loading.value = true
  error.value = null
  try {
    presets.value = await fetchPresets()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load presets'
    console.error('Failed to load presets:', err)
  } finally {
    loading.value = false
  }
}

function handleSelectPreset(preset: RoomPreset) {
  emit('load', preset)
}

function handleCancelClick(_event: MouseEvent) {
  if (isOpening.value) {
    return
  }
  emit('cancel')
}

function handleCancel() {
  if (isOpening.value) {
    return
  }
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  will-change: background, backdrop-filter;
  transform: translateZ(0);
}

.overlay-enter-from {
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
}

.overlay-enter-active {
  transition: background 0.3s ease, backdrop-filter 0.3s ease;
  will-change: background, backdrop-filter;
}

.overlay-enter-to {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
}

.overlay-leave-from {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
}

.overlay-leave-active {
  transition: background 0s ease, backdrop-filter 0s ease;
}

.overlay-leave-to {
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  will-change: transform, opacity;
  transform: translateZ(0);
}

.overlay-enter-from .modal-content {
  transform: scale(0.8);
  opacity: 0;
}

.overlay-enter-active .modal-content {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
  will-change: transform, opacity;
}

.overlay-enter-to .modal-content {
  transform: scale(1);
  opacity: 1;
}

.overlay-leave-from .modal-content {
  transform: scale(1);
  opacity: 1;
}

.overlay-leave-active .modal-content {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.overlay-leave-to .modal-content {
  transform: scale(0.9);
  opacity: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
  max-height: calc(80vh - 100px);
  overflow-y: auto;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6c757d;
}

.error-state p {
  margin-bottom: 1rem;
  color: #dc3545;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #ffffff;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
  transform: translateZ(0);
}

.preset-item:hover {
  border-color: #667eea;
  background: #f8f9fa;
  transform: translateX(4px) translateZ(0);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.preset-info {
  flex: 1;
}

.preset-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.preset-meta {
  margin: 0;
  font-size: 0.85rem;
  color: #6c757d;
  text-transform: capitalize;
}

.preset-arrow {
  font-size: 1.25rem;
  color: #667eea;
  transition: transform 0.2s ease;
}

.preset-item:hover .preset-arrow {
  transform: translateX(4px);
}
</style>

