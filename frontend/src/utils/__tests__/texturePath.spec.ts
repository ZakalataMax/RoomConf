import { describe, it, expect } from 'vitest'
import { normalizeTexturePath, normalizeMaterialTextures } from '../texturePath'

describe('normalizeTexturePath', () => {
  it('rewrites the legacy /texures/ prefix to /textures/', () => {
    expect(normalizeTexturePath('/texures/floor/2145.jpg')).toBe('/textures/floor/2145.jpg')
  })

  it('leaves current paths, null and undefined untouched', () => {
    expect(normalizeTexturePath('/textures/walls/patina-1000-mm-architextures.jpg')).toBe(
      '/textures/walls/patina-1000-mm-architextures.jpg'
    )
    expect(normalizeTexturePath(null)).toBeNull()
    expect(normalizeTexturePath(undefined)).toBeUndefined()
  })

  it('only rewrites the prefix, not occurrences elsewhere in the path', () => {
    expect(normalizeTexturePath('/assets/texures/x.jpg')).toBe('/assets/texures/x.jpg')
  })
})

describe('normalizeMaterialTextures', () => {
  it('normalizes texture and normalMap without mutating the input', () => {
    const input = {
      type: 'paint',
      color: '#fff',
      roughness: 0.5,
      texture: '/texures/walls/a.jpg',
      normalMap: '/texures/walls/a_normal.jpg',
    }
    const result = normalizeMaterialTextures(input)
    expect(result.texture).toBe('/textures/walls/a.jpg')
    expect(result.normalMap).toBe('/textures/walls/a_normal.jpg')
    expect(input.texture).toBe('/texures/walls/a.jpg')
  })

  it('does not add keys that were absent', () => {
    const result = normalizeMaterialTextures({ preset: 'wood' } as {
      preset: string
      texture?: string | null
    })
    expect('texture' in result).toBe(false)
  })
})
