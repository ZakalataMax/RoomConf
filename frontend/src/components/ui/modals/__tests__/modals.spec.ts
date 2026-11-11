import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ConfirmModal from '../ConfirmModal.vue'
import SavePresetModal from '../SavePresetModal.vue'
import LoadPresetModal from '../LoadPresetModal.vue'
import type { RoomPreset } from '@/types'

vi.mock('@/api/presets', () => ({
  fetchPresets: vi.fn(),
}))
import { fetchPresets } from '@/api/presets'

describe('ConfirmModal', () => {
  it('renders nothing while hidden', () => {
    const wrapper = mount(ConfirmModal, { props: { visible: false, title: 't', message: 'Sure?' } })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('shows the message, default confirm text and emits confirm/cancel', async () => {
    const wrapper = mount(ConfirmModal, { props: { visible: true, title: 't', message: 'Reset all?' } })
    expect(wrapper.text()).toContain('Reset all?')
    expect(wrapper.find('.modal-btn.confirm').text()).toBe('Confirm')

    await wrapper.find('.modal-btn.confirm').trigger('click')
    await wrapper.find('.modal-btn.cancel').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})

describe('SavePresetModal', () => {
  it('disables saving until a non-blank name is entered', async () => {
    const wrapper = mount(SavePresetModal, { props: { visible: true } })
    const save = wrapper.find('.modal-btn.save')
    expect(save.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('   ')
    expect(save.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('Living room')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('emits the trimmed name on Enter and resets when reopened', async () => {
    const wrapper = mount(SavePresetModal, { props: { visible: true } })
    const input = wrapper.find('input')
    await input.setValue('  Bedroom  ')
    await input.trigger('keyup.enter')
    expect(wrapper.emitted('save')).toEqual([['Bedroom']])

    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })
})

describe('LoadPresetModal', () => {
  const presets: RoomPreset[] = [
    {
      id: 'a',
      name: 'Morning',
      materials: { wall: { type: 'paint', color: '#fff', roughness: 0.5 }, floor: { preset: 'wood' } },
      lighting: { intensity: 1.2, colorTemperature: 6500, preset: 'work' },
      environment: 'day',
    },
  ]

  beforeEach(() => {
    vi.mocked(fetchPresets).mockReset()
  })

  it('fetches presets when opened and emits the chosen one', async () => {
    vi.mocked(fetchPresets).mockResolvedValue(presets)
    const wrapper = mount(LoadPresetModal, { props: { visible: false } })
    expect(fetchPresets).not.toHaveBeenCalled()

    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(fetchPresets).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Morning')

    await wrapper.find('.preset-item').trigger('click')
    expect(wrapper.emitted('load')).toEqual([[presets[0]]])
  })

  it('shows the error message when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchPresets).mockRejectedValue(new Error('Backend down'))
    const wrapper = mount(LoadPresetModal, { props: { visible: false } })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(wrapper.find('.error-state').text()).toContain('Backend down')
  })

  it('shows an empty state when there are no presets', async () => {
    vi.mocked(fetchPresets).mockResolvedValue([])
    const wrapper = mount(LoadPresetModal, { props: { visible: false } })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })
})
