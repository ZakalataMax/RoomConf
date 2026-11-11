export const FLOOR_TEXTURES = [
  {
    id: '2145',
    name: 'Texture 2145',
    path: '/textures/floor/2145.jpg',
  },
  {
    id: 'concrete-tile',
    name: 'Concrete Tile',
    path: '/textures/floor/concrete-tile-background.jpg',
  },
  {
    id: 'asphalt',
    name: 'Asphalt',
    path: '/textures/floor/asphat-road-texture-gray-color.jpg',
  },
  {
    id: 'none',
    name: 'None',
    path: null,
  },
] as const

export const WALL_TEXTURES = [
  {
    id: 'none',
    name: 'None',
    path: null,
  },
  {
    id: 'granite-broken-range-ashlar',
    name: 'Granite Broken Range Ashlar',
    path: '/textures/walls/granite-broken-range-ashlar-1344-mm-architextures.jpg',
  },
  {
    id: 'granite-crazy-paving',
    name: 'Granite Crazy Paving',
    path: '/textures/walls/granite-crazy-paving-1045-mm-architextures.jpg',
  },
  {
    id: 'medina-ceramic-tile',
    name: 'Medina Ceramic Tile',
    path: '/textures/walls/medina-ceramic-tile-stack-618-mm-architextures.jpg',
  },
  {
    id: 'patina',
    name: 'Patina',
    path: '/textures/walls/patina-1000-mm-architextures.jpg',
  },
  {
    id: 'petals-sky',
    name: 'Petals Sky',
    path: '/textures/walls/petals-sky-2010-mm-architextures.jpg',
  },
  {
    id: 'single-bar-diamond-tread',
    name: 'Single Bar Diamond Tread',
    path: '/textures/walls/single-bar-diamond-tread-aluminium-3000-mm-architextures.jpg',
  },
  {
    id: 'stained-glass-wallpaper',
    name: 'Stained Glass Wallpaper',
    path: '/textures/walls/stained-glass-wallpaper-in-dawn-3600-mm-architextures.jpg',
  },
] as const

export type FloorTextureId = (typeof FLOOR_TEXTURES)[number]['id']
export type WallTextureId = (typeof WALL_TEXTURES)[number]['id']

