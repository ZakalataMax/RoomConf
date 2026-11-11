<template>
  <div class="control-panel">
    <div class="panel-header">
      <h2>Room Configuration</h2>
    </div>

    <div class="panel-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :class="['panel-tab', { active: activeTab === tab.id }]"
        :data-test="`tab-${tab.id}`"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <GeometryEditor v-if="activeTab === 'geometry'" />

    <template v-else>
    <div class="panel-section">
      <h3>Wall Material</h3>
      <div class="control-group">
        <label>
          Texture
          <div ref="wallTextureScrollRef" class="texture-scroll" @wheel="handleWallTextureScroll">
            <div
              v-for="texture in wallTexturesFiltered"
              :key="texture.id"
              :class="['texture-preview', { active: getCurrentWallTextureId() === texture.id }]"
              @click="handleWallTextureSelect(texture.id)"
            >
              <div class="texture-image">
                <img :src="texture.path" :alt="texture.name" />
              </div>
              <div class="texture-name">{{ texture.name }}</div>
            </div>
          </div>
        </label>
        <label>
          Color
          <input type="color" :value="store.wallMaterial.color" @input="handleWallColorChange" />
        </label>
        <label>
          Roughness: {{ store.wallMaterial.roughness.toFixed(2) }}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="store.wallMaterial.roughness"
            @input="handleWallRoughnessChange"
          />
        </label>
      </div>
    </div>

    <div class="panel-section">
      <h3>Floor Material</h3>
      <div class="control-group">
        <label>
          Texture
          <div ref="floorTextureScrollRef" class="texture-scroll" @wheel="handleFloorTextureScroll">
            <div
              v-for="texture in floorTexturesFiltered"
              :key="texture.id"
              :class="['texture-preview', { active: getCurrentFloorTextureId() === texture.id }]"
              @click="handleFloorTextureSelect(texture.id)"
            >
              <div class="texture-image">
                <img :src="texture.path" :alt="texture.name" />
              </div>
              <div class="texture-name">{{ texture.name }}</div>
            </div>
          </div>
        </label>
        <label>
          Color
          <input type="color" :value="store.floorMaterial.color" @input="handleFloorColorChange" />
        </label>
        <label>
          Roughness: {{ (store.floorMaterial.roughness ?? 0.6).toFixed(2) }}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="store.floorMaterial.roughness"
            @input="handleFloorRoughnessChange"
          />
        </label>
      </div>
    </div>

    <div class="panel-section">
      <h3>Lighting</h3>
      <div class="control-group">
        <label>
          Intensity: {{ store.lighting.intensity.toFixed(2) }}
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            :value="store.lighting.intensity"
            @input="handleLightingIntensityChange"
          />
        </label>
        <label>
          Color Temperature: {{ store.lighting.colorTemperature }}K
          <input
            type="range"
            min="2000"
            max="10000"
            step="100"
            :value="store.lighting.colorTemperature"
            @input="handleColorTemperatureChange"
          />
        </label>
      </div>
      <div class="preset-buttons">
        <button class="preset-btn" @click="store.setLightingPreset('work')">Work</button>
        <button class="preset-btn" @click="store.setLightingPreset('relax')">Relax</button>
        <button class="preset-btn" @click="store.setLightingPreset('evening')">Evening</button>
      </div>
    </div>

    <div class="panel-section">
      <h3>Environment</h3>
      <div class="preset-buttons">
        <button
          :class="['preset-btn', { active: store.environment === 'day' }]"
          @click="store.setEnvironment('day')"
        >
          Day
        </button>
        <button
          :class="['preset-btn', { active: store.environment === 'sunset' }]"
          @click="store.setEnvironment('sunset')"
        >
          Sunset
        </button>
        <button
          :class="['preset-btn', { active: store.environment === 'night' }]"
          @click="store.setEnvironment('night')"
        >
          Night
        </button>
      </div>
    </div>
    </template>

    <div class="panel-section">
      <h3>Presets</h3>
      <div class="preset-actions">
        <button class="action-btn" @click="openLoadModal">Load Preset</button>
        <button class="action-btn primary" @click="openSaveModal">Save Preset</button>
        <button class="action-btn" @click="showResetConfirm">Reset</button>
      </div>
    </div>
  </div>

  <LoadPresetModal :visible="showLoadModal" @load="handleLoadPreset" @cancel="hideLoadModal" />
  <SavePresetModal :visible="showSaveModal" @save="handleSavePreset" @cancel="hideSaveModal" />
  <ConfirmModal
    :visible="showResetModal"
    title="Reset Settings"
    message="Are you sure you want to reset all settings to default values? This action cannot be undone."
    confirm-text="Reset"
    @confirm="handleResetConfirm"
    @cancel="hideResetModal"
  />
  <Notification ref="notificationRef" :message="notificationMessage" :type="notificationType" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfiguratorStore } from '@/stores/configurator'
import { savePreset } from '@/api/presets'
import type { RoomPreset } from '@/types'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '@/constants/textures'
import LoadPresetModal from '../modals/LoadPresetModal.vue'
import SavePresetModal from '../modals/SavePresetModal.vue'
import ConfirmModal from '../modals/ConfirmModal.vue'
import Notification from '../notifications/Notification.vue'
import GeometryEditor from './GeometryEditor.vue'

const store = useConfiguratorStore()

type PanelTab = 'materials' | 'geometry'
const tabs: Array<{ id: PanelTab; label: string }> = [
  { id: 'materials', label: 'Materials & Light' },
  { id: 'geometry', label: 'Geometry' },
]
const activeTab = ref<PanelTab>('materials')
const showLoadModal = ref(false)
const showSaveModal = ref(false)
const showResetModal = ref(false)
const notificationRef = ref<InstanceType<typeof Notification> | null>(null)
const notificationMessage = ref('')
const notificationType = ref<'success' | 'error' | 'info'>('success')

const wallTextureScrollRef = ref<HTMLElement | null>(null)
const floorTextureScrollRef = ref<HTMLElement | null>(null)

// Filter out "none" textures from selection
const wallTexturesFiltered = computed(() => WALL_TEXTURES.filter((t) => t.id !== 'none'))
const floorTexturesFiltered = computed(() => FLOOR_TEXTURES.filter((t) => t.id !== 'none'))

function handleWallColorChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setWallMaterial({ color: target.value })
}

function handleWallRoughnessChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setWallMaterial({ roughness: parseFloat(target.value) })
}

function handleFloorColorChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setFloorMaterial({ color: target.value })
}

function handleFloorRoughnessChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setFloorMaterial({ roughness: parseFloat(target.value) })
}

function getCurrentWallTextureId(): string {
  const currentTexture = store.wallMaterial.texture
  if (!currentTexture) return 'none'
  const texture = WALL_TEXTURES.find((t) => t.path === currentTexture)
  return texture?.id || 'none'
}

function getCurrentFloorTextureId(): string {
  const currentTexture = store.floorMaterial.texture
  if (!currentTexture) return 'none'
  const texture = FLOOR_TEXTURES.find((t) => t.path === currentTexture)
  return texture?.id || 'none'
}

function handleWallTextureSelect(textureId: string) {
  const currentTextureId = getCurrentWallTextureId()
  
  // If clicking on already selected texture, deselect it (apply NONE)
  if (currentTextureId === textureId) {
    store.setWallMaterial({ texture: null })
    return
  }
  
  // Otherwise, select the new texture
  const selectedTexture = WALL_TEXTURES.find((t) => t.id === textureId)
  const texturePath = selectedTexture?.path || null
  store.setWallMaterial({ texture: texturePath })
}

function handleFloorTextureSelect(textureId: string) {
  const currentTextureId = getCurrentFloorTextureId()
  
  // If clicking on already selected texture, deselect it (apply NONE)
  if (currentTextureId === textureId) {
    store.setFloorMaterial({ texture: null })
    return
  }
  
  // Otherwise, select the new texture
  const selectedTexture = FLOOR_TEXTURES.find((t) => t.id === textureId)
  const texturePath = selectedTexture?.path || null
  store.setFloorMaterial({ texture: texturePath })
}

function handleLightingIntensityChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setLighting({ intensity: parseFloat(target.value) })
}

function handleColorTemperatureChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setLighting({ colorTemperature: parseInt(target.value) })
}

function openLoadModal() {
  showLoadModal.value = true
}

function hideLoadModal() {
  showLoadModal.value = false
}

function openSaveModal() {
  showSaveModal.value = true
}

function hideSaveModal() {
  showSaveModal.value = false
}

function showResetConfirm() {
  showResetModal.value = true
}

function hideResetModal() {
  showResetModal.value = false
}

async function handleSavePreset(name: string) {
  try {
    const preset = { ...store.currentPreset, name }
    const savedPreset = await savePreset(preset)
    store.activePresetId = savedPreset.id || null
    showSaveModal.value = false
    notificationMessage.value = `Preset "${name}" saved successfully!`
    notificationType.value = 'success'
    notificationRef.value?.show()
  } catch (error) {
    console.error('Failed to save preset:', error)
    showSaveModal.value = false
    const message =
      error instanceof Error ? error.message : 'Failed to save preset. Please try again.'
    notificationMessage.value = message
    notificationType.value = 'error'
    notificationRef.value?.show()
  }
}

function handleLoadPreset(preset: RoomPreset) {
  store.loadPreset(preset)
  showLoadModal.value = false
  notificationMessage.value = `Preset "${preset.name || 'Unnamed'}" loaded successfully!`
  notificationType.value = 'success'
  notificationRef.value?.show()
}

function handleResetConfirm() {
  store.resetToDefaults()
  showResetModal.value = false
  notificationMessage.value = 'Settings reset to default values'
  notificationType.value = 'info'
  notificationRef.value?.show()
}


function handleWallTextureScroll(event: WheelEvent) {
  if (wallTextureScrollRef.value) {
    event.preventDefault()
    // Multiply by 1.5 to make scrolling stronger
    wallTextureScrollRef.value.scrollLeft += event.deltaY * 1.5
  }
}

function handleFloorTextureScroll(event: WheelEvent) {
  if (floorTextureScrollRef.value) {
    event.preventDefault()
    // Multiply by 1.5 to make scrolling stronger
    floorTextureScrollRef.value.scrollLeft += event.deltaY * 1.5
  }
}
</script>

<style scoped src="./panel.css"></style>

<style scoped>
.control-panel {
  padding: 1.5rem 1.25rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.05);
  border-left: 1px solid #e9ecef;
}

.control-panel::-webkit-scrollbar {
  width: 8px;
}

.control-panel::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 4px;
}

.control-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

.control-panel::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #5568d3 0%, #6a3d8f 100%);
}

.panel-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
  position: relative;
}

.panel-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #1a1a1a;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.texture-scroll {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0;
  margin: 0 -0.5rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.texture-scroll::-webkit-scrollbar {
  height: 6px;
}

.texture-scroll::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 3px;
}

.texture-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.texture-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, #5568d3 0%, #6a3d8f 100%);
}

.texture-preview {
  flex-shrink: 0;
  width: 100px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  border: 2px solid #e9ecef;
}

.texture-preview.active {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(102, 126, 234, 0.3);
}

.texture-image {
  width: 100%;
  height: 80px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.texture-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.texture-placeholder {
  width: 100%;
  height: 80px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e9ecef;
}

.texture-placeholder span {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.texture-name {
  padding: 0.5rem 0.4rem;
  font-size: 0.7rem;
  color: #495057;
  text-align: center;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.texture-preview.active .texture-name {
  color: #667eea;
  font-weight: 600;
}

.panel-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  padding: 0.25rem;
  background: #f1f3f5;
  border-radius: 10px;
}

.panel-tab {
  flex: 1;
  padding: 0.5rem 0.4rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #495057;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.panel-tab:hover {
  color: #667eea;
}

.panel-tab.active {
  background: #ffffff;
  color: #667eea;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.preset-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

</style>
