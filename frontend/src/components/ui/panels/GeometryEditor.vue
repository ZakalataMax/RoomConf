<template>
  <div class="geometry-editor">
    <p v-if="error" class="geometry-error" role="alert">{{ error }}</p>

    <div class="panel-section">
      <h3>Room Shape</h3>
      <div class="preset-buttons">
        <button class="preset-btn" data-test="shape-rectangle" @click="run(() => geometry.applyShape('rectangle'))">
          Rectangle
        </button>
        <button class="preset-btn" data-test="shape-l" @click="run(() => geometry.applyShape('l-shape'))">
          L-shape
        </button>
      </div>
      <div class="control-group dimensions">
        <label>
          Width (m)
          <input
            type="number"
            data-test="room-width"
            :min="LIMITS.minRoomSize"
            :max="LIMITS.maxRoomSize"
            step="0.1"
            :value="round(geometry.bounds.width)"
            @change="onNumber($event, geometry.bounds.width, (v) => geometry.setRoomSize(v, geometry.bounds.depth))"
          />
        </label>
        <label>
          Depth (m)
          <input
            type="number"
            data-test="room-depth"
            :min="LIMITS.minRoomSize"
            :max="LIMITS.maxRoomSize"
            step="0.1"
            :value="round(geometry.bounds.depth)"
            @change="onNumber($event, geometry.bounds.depth, (v) => geometry.setRoomSize(geometry.bounds.width, v))"
          />
        </label>
        <label>
          Ceiling (m)
          <input
            type="number"
            data-test="ceiling-height"
            :min="LIMITS.minCeilingHeight"
            :max="LIMITS.maxCeilingHeight"
            step="0.1"
            :value="round(geometry.room.ceilingHeight)"
            @change="onNumber($event, geometry.room.ceilingHeight, (v) => geometry.setCeilingHeight(v))"
          />
        </label>
      </div>
    </div>

    <div class="panel-section">
      <h3>Walls</h3>
      <p class="hint">Click a wall here or in the 3D view to edit it.</p>
      <div class="walls-list">
        <div
          v-for="seg in geometry.segments"
          :key="seg.wall.id"
          :class="['wall-item', { selected: seg.wall.id === geometry.selectedWallId }]"
          data-test="wall-item"
        >
          <button class="wall-header" @click="toggleWall(seg.wall.id)">
            <span>Wall {{ seg.index + 1 }}</span>
            <span class="wall-meta">
              {{ seg.length.toFixed(2) }} m
              <template v-if="seg.wall.openings.length"> · {{ seg.wall.openings.length }} opening(s)</template>
            </span>
          </button>

          <div v-if="seg.wall.id === geometry.selectedWallId" class="wall-details">
            <div class="coord-grid">
              <label>
                Start X
                <input
                  type="number"
                  step="0.1"
                  data-test="corner-x"
                  :value="round(seg.start[0])"
                  @change="onNumber($event, seg.start[0], (v) => geometry.moveCorner(seg.wall.id, [v, seg.start[1]]))"
                />
              </label>
              <label>
                Start Z
                <input
                  type="number"
                  step="0.1"
                  data-test="corner-z"
                  :value="round(seg.start[1])"
                  @change="onNumber($event, seg.start[1], (v) => geometry.moveCorner(seg.wall.id, [seg.start[0], v]))"
                />
              </label>
            </div>

            <div class="wall-actions">
              <button class="small-btn" data-test="add-door" @click="run(() => geometry.addOpening(seg.wall.id, 'door'))">
                + Door
              </button>
              <button
                class="small-btn"
                data-test="add-window"
                @click="run(() => geometry.addOpening(seg.wall.id, 'window'))"
              >
                + Window
              </button>
              <button class="small-btn" data-test="split-wall" @click="run(() => geometry.splitWall(seg.wall.id))">
                Split
              </button>
              <button
                class="small-btn danger"
                data-test="remove-wall"
                :disabled="geometry.room.walls.length <= LIMITS.minWalls"
                @click="run(() => geometry.removeWall(seg.wall.id))"
              >
                Remove
              </button>
            </div>

            <div v-for="opening in seg.wall.openings" :key="opening.id" class="opening-item" data-test="opening-item">
              <div class="opening-header">
                <span class="opening-type">{{ opening.type }}</span>
                <button
                  class="remove-opening"
                  :aria-label="`Remove ${opening.type}`"
                  @click="run(() => geometry.removeOpening(seg.wall.id, opening.id))"
                >
                  ×
                </button>
              </div>
              <div class="coord-grid">
                <label>
                  Offset
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    data-test="opening-offset"
                    :value="round(opening.offset)"
                    @change="onNumber($event, opening.offset, (v) => geometry.updateOpening(seg.wall.id, opening.id, { offset: v }))"
                  />
                </label>
                <label>
                  Width
                  <input
                    type="number"
                    step="0.1"
                    :min="LIMITS.minOpeningSize"
                    data-test="opening-width"
                    :value="round(opening.width)"
                    @change="onNumber($event, opening.width, (v) => geometry.updateOpening(seg.wall.id, opening.id, { width: v }))"
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    step="0.1"
                    :min="LIMITS.minOpeningSize"
                    :value="round(opening.height)"
                    @change="onNumber($event, opening.height, (v) => geometry.updateOpening(seg.wall.id, opening.id, { height: v }))"
                  />
                </label>
                <label v-if="opening.type === 'window'">
                  Sill
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    :value="round(opening.bottom)"
                    @change="onNumber($event, opening.bottom, (v) => geometry.updateOpening(seg.wall.id, opening.id, { bottom: v }))"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="action-btn" data-test="reset-geometry" @click="resetGeometry">Reset Geometry</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoomGeometryStore } from '@/stores/roomGeometry'
import { GEOMETRY_LIMITS as LIMITS } from '@/constants/geometry'
import type { GeometryResult } from '@/types/geometry'

const geometry = useRoomGeometryStore()
const error = ref<string | null>(null)

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function run(action: () => GeometryResult): boolean {
  const result = action()
  error.value = result.ok ? null : result.error
  return result.ok
}

/** Apply a numeric input; on invalid input show the error and restore the stored value. */
function onNumber(event: Event, current: number, apply: (value: number) => GeometryResult) {
  const input = event.target as HTMLInputElement
  const value = parseFloat(input.value)
  const ok = Number.isFinite(value)
    ? run(() => apply(value))
    : run(() => ({ ok: false, error: 'Enter a number' }))
  // The store rejected the value: show the last valid one again.
  if (!ok) input.value = String(round(current))
}

function toggleWall(wallId: string) {
  geometry.selectWall(geometry.selectedWallId === wallId ? null : wallId)
}

function resetGeometry() {
  geometry.resetToDefault()
  error.value = null
}
</script>

<style scoped src="./panel.css"></style>

<style scoped>
.geometry-editor {
  display: flex;
  flex-direction: column;
}

.geometry-error {
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  color: #c92a2a;
  font-size: 0.8rem;
}

.hint {
  margin: -0.5rem 0 0.75rem;
  font-size: 0.75rem;
  color: #868e96;
}

.dimensions {
  margin-top: 1rem;
}

.control-group input[type='number'],
.coord-grid input[type='number'] {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.85rem;
  transition: border-color 0.2s ease;
}

.control-group input[type='number']:focus,
.coord-grid input[type='number']:focus {
  outline: none;
  border-color: #667eea;
}

.walls-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wall-item {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.wall-item.selected {
  border-color: #667eea;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.wall-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
  text-align: left;
}

.wall-meta {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6c757d;
}

.wall-details {
  padding: 0 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.coord-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.coord-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #495057;
  font-weight: 500;
}

.wall-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.small-btn {
  flex: 1 1 auto;
  padding: 0.4rem 0.6rem;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
  transition: all 0.2s ease;
}

.small-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.small-btn.danger:hover:not(:disabled) {
  border-color: #fa5252;
  color: #fa5252;
}

.small-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.opening-item {
  padding: 0.6rem;
  border-radius: 6px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.opening-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.opening-type {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #667eea;
}

.remove-opening {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: #e9ecef;
  color: #495057;
  cursor: pointer;
  line-height: 1;
}

.remove-opening:hover {
  background: #ffc9c9;
  color: #c92a2a;
}
</style>
