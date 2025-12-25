<template>
  <div class="configurator-view">
    <div class="canvas-container">
      <TresCanvas>
        <RoomScene :preset-id="presetId" />
      </TresCanvas>
    </div>
    <ControlPanel class="control-panel" />
  </div>
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import RoomScene from '@/components/scene/RoomScene.vue'
import ControlPanel from '@/components/ui/ControlPanel.vue'

interface Props {
  presetId?: string
}

const props = defineProps<Props>()
</script>

<style scoped>
.configurator-view {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

.canvas-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 320px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}
</style>

