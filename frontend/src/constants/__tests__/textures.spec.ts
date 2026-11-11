// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '../textures'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))
const allTextures = [...FLOOR_TEXTURES, ...WALL_TEXTURES]
const withPath = allTextures.filter(
  (t): t is (typeof allTextures)[number] & { path: string } => t.path !== null
)

describe('texture catalogue', () => {
  it.each(withPath.map((t) => [t.id, t.path]))(
    '%s points to an existing, non-empty file (%s)',
    (_id, path) => {
      const file = `${publicDir}${path}`
      expect(existsSync(file), `missing ${file}`).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(0)
    }
  )

  it('serves every texture from /textures/ (no legacy /texures/ paths)', () => {
    for (const t of withPath) {
      expect(t.path.startsWith('/textures/')).toBe(true)
    }
  })

  it('has unique ids within each group', () => {
    const floorIds = FLOOR_TEXTURES.map((t) => t.id)
    const wallIds = WALL_TEXTURES.map((t) => t.id)
    expect(new Set(floorIds).size).toBe(floorIds.length)
    expect(new Set(wallIds).size).toBe(wallIds.length)
  })

  it('offers a "none" option with a null path in both groups', () => {
    expect(FLOOR_TEXTURES.find((t) => t.id === 'none')?.path).toBeNull()
    expect(WALL_TEXTURES.find((t) => t.id === 'none')?.path).toBeNull()
  })
})
