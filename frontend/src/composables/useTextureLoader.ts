import { ref, onUnmounted } from 'vue'
import { TextureLoader, RepeatWrapping } from 'three'
import type { Texture } from 'three'

const textureCache = new Map<string, Texture>()
const textureLoader = new TextureLoader()

export function useTextureLoader() {
  const loadingTextures = ref<Set<string>>(new Set())

  function loadTexture(path: string, isNormalMap = false): Promise<Texture> {
    const textureType = isNormalMap ? 'normal map' : 'texture'
    const startTime = performance.now()
    
    if (textureCache.has(path)) {
      return Promise.resolve(textureCache.get(path)!)
    }

    if (loadingTextures.value.has(path)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (textureCache.has(path)) {
            clearInterval(checkInterval)
            resolve(textureCache.get(path)!)
          }
        }, 50)

        setTimeout(() => {
          clearInterval(checkInterval)
          reject(new Error(`Texture loading timeout: ${path}`))
        }, 10000)
      })
    }

    loadingTextures.value.add(path)

    return new Promise((resolve, reject) => {
      textureLoader.load(
        path,
        (texture) => {
          texture.wrapS = texture.wrapT = RepeatWrapping
          if (!isNormalMap) {
            texture.repeat.set(4, 4) // Tile the texture (normal maps use same repeat)
          } else {
            texture.repeat.set(4, 4) // Normal maps should match diffuse texture tiling
          }
          textureCache.set(path, texture)
          loadingTextures.value.delete(path)
          resolve(texture)
        },
        undefined,
        (error) => {
          loadingTextures.value.delete(path)
          const loadTime = performance.now() - startTime
          // Normal maps are optional, so log as debug instead of error
          if (isNormalMap) {
            console.debug(`[TextureLoader] ⚠️ Normal map not found (optional): ${path} (${loadTime.toFixed(2)}ms)`)
          } else {
            console.error(`[TextureLoader] ❌ Failed to load ${textureType}: ${path} (${loadTime.toFixed(2)}ms)`, error)
          }
          reject(error)
        }
      )
    })
  }

  /**
   * Generate normal map path from texture path
   * Common patterns: texture.jpg -> texture_normal.jpg or texture_n.jpg
   */
  function getNormalMapPath(texturePath: string): string | null {
    if (!texturePath) return null
    
    // Try different naming conventions
    const patterns = [
      texturePath.replace(/\.(jpg|jpeg|png)$/i, '_normal.$1'),
      texturePath.replace(/\.(jpg|jpeg|png)$/i, '_n.$1'),
      texturePath.replace(/\.(jpg|jpeg|png)$/i, '-normal.$1'),
      texturePath.replace(/\.(jpg|jpeg|png)$/i, '-n.$1'),
    ]
    
    // Return first pattern (can be enhanced to check if file exists)
    return patterns[0] || null
  }

  function disposeTexture(path: string) {
    const texture = textureCache.get(path)
    if (texture) {
      texture.dispose()
      textureCache.delete(path)
    }
  }

  function clearCache() {
    textureCache.forEach((texture) => texture.dispose())
    textureCache.clear()
  }

  onUnmounted(() => {
    clearCache()
  })

  return {
    loadTexture,
    disposeTexture,
    clearCache,
    loadingTextures,
    getNormalMapPath,
  }
}

