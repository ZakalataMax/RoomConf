/**
 * Texture assets used to live under the misspelled `/texures/` folder.
 * Presets saved on the backend and state persisted in localStorage may still
 * reference the old location, so legacy paths are rewritten on load.
 */
const LEGACY_PREFIX = '/texures/'
const CURRENT_PREFIX = '/textures/'

export function normalizeTexturePath<T extends string | null | undefined>(path: T): T {
  if (typeof path === 'string' && path.startsWith(LEGACY_PREFIX)) {
    return (CURRENT_PREFIX + path.slice(LEGACY_PREFIX.length)) as T
  }
  return path
}

export function normalizeMaterialTextures<
  M extends { texture?: string | null; normalMap?: string | null },
>(material: M): M {
  const result = { ...material }
  if ('texture' in result) result.texture = normalizeTexturePath(result.texture)
  if ('normalMap' in result) result.normalMap = normalizeTexturePath(result.normalMap)
  return result
}
