export type ThemeName = 'city' | 'neon' | 'desert' | 'ice' | 'sunset' | 'cyber'

export interface ThemeConfig {
  name: ThemeName
  displayName: string
  background: number
  track: number
  fog: number
  obstacles: number
  bossWall: number
  particles: number
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  city: {
    name: 'city',
    displayName: 'City Run',
    background: 0x87CEEB,
    track: 0x555555,
    fog: 0x87CEEB,
    obstacles: 0x8B4513,
    bossWall: 0x333333,
    particles: 0xffffff
  },
  neon: {
    name: 'neon',
    displayName: 'Neon Nights',
    background: 0x0B0B1A,
    track: 0x1A1A33,
    fog: 0x0B0B1A,
    obstacles: 0xff00ff,
    bossWall: 0x00ffff,
    particles: 0xff00ff
  },
  desert: {
    name: 'desert',
    displayName: 'Desert Dash',
    background: 0xFFDAB9,
    track: 0xD2B48C,
    fog: 0xFFDAB9,
    obstacles: 0x8B4513,
    bossWall: 0x5C4033,
    particles: 0xDAA520
  },
  ice: {
    name: 'ice',
    displayName: 'Glacier Grind',
    background: 0xE0FFFF,
    track: 0xB0E0E6,
    fog: 0xE0FFFF,
    obstacles: 0x4682B4,
    bossWall: 0x1E90FF,
    particles: 0xFFFFFF
  },
  sunset: {
    name: 'sunset',
    displayName: 'Sunset Sprint',
    background: 0xFF7F50,
    track: 0x2F4F4F,
    fog: 0xFF7F50,
    obstacles: 0x800000,
    bossWall: 0x4B0082,
    particles: 0xFFD700
  },
  cyber: {
    name: 'cyber',
    displayName: 'Cyber Space',
    background: 0x0D1117,
    track: 0x161B22,
    fog: 0x0D1117,
    obstacles: 0x00FF00,
    bossWall: 0xFF00FF,
    particles: 0x00FFFF
  }
}

export const THEME_LIST = Object.values(THEMES)

export function getThemeForLevel(level: number): ThemeConfig {
  // Rotate theme every level
  const index = (level - 1) % THEME_LIST.length
  return THEME_LIST[index]
}
