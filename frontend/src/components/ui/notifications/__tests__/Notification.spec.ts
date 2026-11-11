import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Notification from '../Notification.vue'

describe('Notification', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is hidden until show() is called, then auto-hides after the duration', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Notification, { props: { message: 'Saved!', duration: 1000 } })
    expect(wrapper.find('.notification').exists()).toBe(false)

    ;(wrapper.vm as unknown as { show: () => void }).show()
    await wrapper.vm.$nextTick()
    const el = wrapper.find('.notification')
    expect(el.classes()).toContain('success')
    expect(el.text()).toContain('Saved!')
    expect(el.text()).toContain('✓')

    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.notification').exists()).toBe(false)
  })

  it('uses the type for styling/icon and can be hidden manually', async () => {
    const wrapper = mount(Notification, { props: { message: 'Failed', type: 'error' } })
    const vm = wrapper.vm as unknown as { show: () => void; hide: () => void }
    vm.show()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.notification').classes()).toContain('error')
    expect(wrapper.text()).toContain('✕')

    vm.hide()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.notification').exists()).toBe(false)
  })
})
