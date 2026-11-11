<template>
  <div class="configurator-view">
    <div class="canvas-container">
      <TresCanvas :power-preference="'high-performance'" :antialias="false">
        <RoomScene :preset-id="presetId" />
      </TresCanvas>
      <FPSMonitor />
    </div>
    <div class="control-panel-wrapper">
      <ControlPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import RoomScene from '@/components/scene/RoomScene.vue'
import ControlPanel from '@/components/ui/panels/ControlPanel.vue'
import FPSMonitor from '@/components/scene/components/performance/FPSMonitor.vue'

interface Props {
  presetId?: string
}

defineProps<Props>()
</script>

<style scoped>
.configurator-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
}

.canvas-container {
  flex: 0 0 80%;
  width: 80%;
  height: 100%;
  overflow: hidden;
}

.control-panel-wrapper {
  flex: 0 0 20%;
  width: 20%;
  height: 100%;
  overflow: hidden;
}
</style>

