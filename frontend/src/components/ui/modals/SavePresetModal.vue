<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Save Preset</h3>
          <button class="modal-close" @click="handleCancel">×</button>
        </div>
        <div class="modal-body">
          <label>
            Preset Name
            <input
              ref="nameInputRef"
              v-model="presetName"
              type="text"
              placeholder="Enter preset name..."
              @keyup.enter="handleSave"
              @keyup.esc="handleCancel"
            />
          </label>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="handleCancel">Cancel</button>
          <button class="modal-btn save" :disabled="!presetName.trim()" @click="handleSave">
            Save
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [name: string]
  cancel: []
}>()

const presetName = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    presetName.value = ''
    nextTick(() => {
      nameInputRef.value?.focus()
    })
  }
})

function handleSave() {
  if (presetName.value.trim()) {
    emit('save', presetName.value.trim())
  }
}

function handleCancel() {
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  will-change: background, backdrop-filter;
  transform: translateZ(0);
}

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
  will-change: transform, opacity;
  transform: translateZ(0);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
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
}

.modal-body label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.modal-body input {
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  outline: none;
}

.modal-body input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.cancel {
  background: #f8f9fa;
  color: #495057;
}

.modal-btn.cancel:hover {
  background: #e9ecef;
}

.modal-btn.save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.modal-btn.save:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.modal-btn.save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-enter-active {
  animation: modalSlideIn 0.3s ease-out;
}

.modal-leave-active {
  animation: modalSlideIn 0.3s ease-out reverse;
}
</style>

