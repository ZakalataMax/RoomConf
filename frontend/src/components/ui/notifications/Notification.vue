<template>
  <Transition name="notification">
    <div v-if="visible && message" class="notification" :class="type">
      <div class="notification-content">
        <span class="notification-icon">{{ icon }}</span>
        <span class="notification-message">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  duration: 3000,
})

const visible = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | null = null

const icon = computed(() => {
  return {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[props.type]
})

function show() {
  visible.value = true
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    visible.value = false
  }, props.duration)
}

function hide() {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
}

defineExpose({
  show,
  hide,
})
</script>

<style scoped>
.notification {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10000;
  min-width: 320px;
  max-width: 420px;
  padding: 1.25rem 1.5rem;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  border-left: 5px solid;
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(10px);
}

.notification.success {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.notification.error {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.notification.info {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notification-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification.success .notification-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.notification.error .notification-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.notification.info .notification-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.notification-message {
  flex: 1;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 600;
  line-height: 1.5;
}

@keyframes slideIn {
  from {
    transform: translateX(calc(100% + 2rem));
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-enter-active {
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-leave-active {
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) reverse;
}
</style>

