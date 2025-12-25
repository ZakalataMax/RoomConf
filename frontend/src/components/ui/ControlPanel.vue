<template>
  <div class="control-panel">
    <div class="panel-header">
      <h2>Room Configuration</h2>
    </div>

    <div class="panel-section">
      <h3>Wall Material</h3>
      <div class="control-group">
        <label>
          Color
          <input
            type="color"
            :value="store.wallMaterial.color"
            @input="handleWallColorChange"
          />
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
          Color
          <input
            type="color"
            :value="store.floorMaterial.color"
            @input="handleFloorColorChange"
          />
        </label>
        <label>
          Roughness: {{ (store.floorMaterial.roughness || 0.6).toFixed(2) }}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="store.floorMaterial.roughness || 0.6"
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
        <button @click="store.setLightingPreset('work')" class="preset-btn">Work</button>
        <button @click="store.setLightingPreset('relax')" class="preset-btn">Relax</button>
        <button @click="store.setLightingPreset('evening')" class="preset-btn">Evening</button>
      </div>
    </div>

    <div class="panel-section">
      <h3>Environment</h3>
      <div class="preset-buttons">
        <button
          @click="store.setEnvironment('day')"
          :class="['preset-btn', { active: store.environment === 'day' }]"
        >
          Day
        </button>
        <button
          @click="store.setEnvironment('sunset')"
          :class="['preset-btn', { active: store.environment === 'sunset' }]"
        >
          Sunset
        </button>
        <button
          @click="store.setEnvironment('night')"
          :class="['preset-btn', { active: store.environment === 'night' }]"
        >
          Night
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3>Presets</h3>
      <div class="preset-actions">
        <button @click="handleSavePreset" class="action-btn primary">Save Preset</button>
        <button @click="handleReset" class="action-btn">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfiguratorStore } from '@/stores/configurator'
import { savePreset } from '@/api/presets'
import { ref } from 'vue'

const store = useConfiguratorStore()

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

function handleLightingIntensityChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setLighting({ intensity: parseFloat(target.value) })
}

function handleColorTemperatureChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setLighting({ colorTemperature: parseInt(target.value) })
}

async function handleSavePreset() {
  try {
    const preset = store.currentPreset
    const savedPreset = await savePreset(preset)
    store.activePresetId = savedPreset.id || null
    alert('Preset saved successfully!')
  } catch (error: any) {
    console.error('Failed to save preset:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to save preset. Please try again.'
    alert(`Error: ${message}`)
  }
}

function handleReset() {
  if (confirm('Reset to default settings?')) {
    store.resetToDefaults()
  }
}
</script>

<style scoped>
.control-panel {
  padding: 1.5rem;
}

.panel-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1a1a1a;
}

.panel-section {
  margin-bottom: 2rem;
}

.panel-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.control-group input[type='color'] {
  width: 100%;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.control-group input[type='range'] {
  width: 100%;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #e0e0e0;
}

.preset-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.preset-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.75rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e0e0e0;
}

.action-btn.primary {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.action-btn.primary:hover {
  background: #5568d3;
}
</style>

