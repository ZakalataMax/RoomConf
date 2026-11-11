<template>
  <Transition name="overlay">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-content">
        <p class="modal-message">{{ message }}</p>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="handleCancel">Cancel</button>
          <button class="modal-btn confirm" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  title: string
  message: string
  confirmText?: string
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.overlay-enter-from {
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
}

.overlay-enter-active {
  transition: background 0.3s ease, backdrop-filter 0.3s ease;
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

.modal-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  max-width: 360px;
  padding: 1.5rem;
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

.modal-message {
  margin: 0 0 1.25rem 0;
  font-size: 0.9rem;
  color: #495057;
  line-height: 1.5;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
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

.modal-btn.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.modal-btn.confirm:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

</style>

