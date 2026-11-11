import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GeometryEditor from '../GeometryEditor.vue'
import ControlPanel from '../ControlPanel.vue'
import { useRoomGeometryStore } from '@/stores/roomGeometry'

describe('GeometryEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('shows the room dimensions and one row per wall', () => {
    const wrapper = mount(GeometryEditor)
    expect((wrapper.find('[data-test="room-width"]').element as HTMLInputElement).value).toBe('10')
    expect((wrapper.find('[data-test="ceiling-height"]').element as HTMLInputElement).value).toBe('3')
    expect(wrapper.findAll('[data-test="wall-item"]')).toHaveLength(4)
  })

  it('applies valid sizes to the store', async () => {
    const wrapper = mount(GeometryEditor)
    const store = useRoomGeometryStore()
    await wrapper.find('[data-test="room-width"]').setValue('6')
    expect(store.bounds.width).toBe(6)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('rejects out-of-range input, shows an error and restores the previous value', async () => {
    const wrapper = mount(GeometryEditor)
    const store = useRoomGeometryStore()
    const input = wrapper.find('[data-test="ceiling-height"]')
    await input.setValue('12')
    expect(store.room.ceilingHeight).toBe(3)
    expect(wrapper.find('[role="alert"]').text()).toMatch(/Ceiling height must be between/)
    expect((input.element as HTMLInputElement).value).toBe('3')
  })

  it('expands a wall to add a door and split it', async () => {
    const wrapper = mount(GeometryEditor)
    const store = useRoomGeometryStore()
    await wrapper.findAll('[data-test="wall-item"] .wall-header')[0]!.trigger('click')
    expect(store.selectedWallId).toBe('wall-1')

    await wrapper.find('[data-test="add-door"]').trigger('click')
    expect(store.room.walls[0]!.openings).toHaveLength(1)
    expect(wrapper.findAll('[data-test="opening-item"]')).toHaveLength(1)

    await wrapper.find('[data-test="opening-offset"]').setValue('8')
    expect(store.room.walls[0]!.openings[0]!.offset).toBe(8)

    await wrapper.find('[data-test="split-wall"]').trigger('click')
    expect(wrapper.findAll('[data-test="wall-item"]')).toHaveLength(5)
  })

  it('switches to the L-shape and back via reset', async () => {
    const wrapper = mount(GeometryEditor)
    await wrapper.find('[data-test="shape-l"]').trigger('click')
    expect(wrapper.findAll('[data-test="wall-item"]')).toHaveLength(6)
    await wrapper.find('[data-test="reset-geometry"]').trigger('click')
    expect(wrapper.findAll('[data-test="wall-item"]')).toHaveLength(4)
  })
})

describe('ControlPanel tabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows materials by default and the geometry editor on the Geometry tab', async () => {
    const wrapper = mount(ControlPanel)
    expect(wrapper.text()).toContain('Wall Material')
    expect(wrapper.findComponent(GeometryEditor).exists()).toBe(false)

    await wrapper.find('[data-test="tab-geometry"]').trigger('click')
    expect(wrapper.findComponent(GeometryEditor).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Wall Material')
    expect(wrapper.text()).toContain('Load Preset') // presets stay available on every tab
  })
})
