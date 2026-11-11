import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { RepeatWrapping, Texture, TextureLoader } from 'three'
import { useTextureLoader } from '../useTextureLoader'

function setup() {
  let api!: ReturnType<typeof useTextureLoader>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useTextureLoader()
        return () => h('div')
      },
    })
  )
  return { api, wrapper }
}

describe('useTextureLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('derives the conventional normal map path', () => {
    const { api, wrapper } = setup()
    expect(api.getNormalMapPath('/textures/floor/2145.jpg')).toBe('/textures/floor/2145_normal.jpg')
    expect(api.getNormalMapPath('/textures/a.PNG')).toBe('/textures/a_normal.PNG')
    expect(api.getNormalMapPath('')).toBeNull()
    wrapper.unmount()
  })

  it('loads a texture once, configures tiling and serves later calls from cache', async () => {
    const load = vi
      .spyOn(TextureLoader.prototype, 'load')
      .mockImplementation((_url, onLoad) => {
        onLoad?.(new Texture())
        return new Texture()
      })
    const { api, wrapper } = setup()

    const first = await api.loadTexture('/textures/floor/2145.jpg')
    expect(first.wrapS).toBe(RepeatWrapping)
    expect(first.wrapT).toBe(RepeatWrapping)
    expect(first.repeat.x).toBe(4)
    expect(first.repeat.y).toBe(4)

    const second = await api.loadTexture('/textures/floor/2145.jpg')
    expect(second).toBe(first)
    expect(load).toHaveBeenCalledTimes(1)
    expect(api.loadingTextures.value.size).toBe(0)
    wrapper.unmount() // clears the shared cache
  })

  it('rejects when the loader fails and does not cache the failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const load = vi
      .spyOn(TextureLoader.prototype, 'load')
      .mockImplementation((_url, _onLoad, _onProgress, onError) => {
        onError?.(new Error('404'))
        return new Texture()
      })
    const { api, wrapper } = setup()

    await expect(api.loadTexture('/textures/missing.jpg')).rejects.toThrow('404')
    await expect(api.loadTexture('/textures/missing.jpg')).rejects.toThrow('404')
    expect(load).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
