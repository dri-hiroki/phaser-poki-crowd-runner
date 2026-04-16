/**
 * AudioManager.ts
 * Singleton audio controller mapped to native HTML Audio.
 * - Global mute/unmute with persisted state
 * - Separate SFX and music volume controls
 * - Browser audio context unlock on first user interaction
 */

import { SaveManager, SAVE_KEYS } from './SaveManager'

export class AudioManager {
  private static _muted: boolean = false
  private static _sfxVolume: number = 1.0
  private static _musicVolume: number = 0.6
  private static _audioUnlocked: boolean = false
  private static _currentMusic: HTMLAudioElement | null = null
  private static _cache: Record<string, HTMLAudioElement> = {}

  static init(_scene: any): void {
    AudioManager._muted = SaveManager.load<boolean>(SAVE_KEYS.muted, false)
    AudioManager._sfxVolume = SaveManager.load<number>(SAVE_KEYS.sfxVolume, 1.0)
    AudioManager._musicVolume = SaveManager.load<number>(SAVE_KEYS.musicVolume, 0.6)

    AudioManager.setupAudioUnlock()
  }

  // Preload a sound locally
  static registerAudio(key: string, url: string) {
    const audio = new Audio(url)
    audio.preload = 'auto'
    this._cache[key] = audio
  }

  static playSfx(_scene: any, key: string, volume?: number): void {
    if (AudioManager._muted) return
    const src = AudioManager._cache[key]
    if (!src) return

    try {
      const clone = src.cloneNode() as HTMLAudioElement
      clone.volume = (volume ?? 1.0) * AudioManager._sfxVolume
      clone.play().catch(() => {})
    } catch {
      // Audio context may not be ready yet
    }
  }

  static playMusic(_scene: any, key: string, volume?: number): void {
    AudioManager.stopMusic()
    const src = AudioManager._cache[key]
    if (!src) return

    try {
      AudioManager._currentMusic = src.cloneNode() as HTMLAudioElement
      AudioManager._currentMusic.loop = true
      AudioManager._currentMusic.volume = (volume ?? 1.0) * AudioManager._musicVolume * (AudioManager._muted ? 0 : 1)
      AudioManager._currentMusic.play().catch(() => {})
    } catch {
      // Audio context may not be ready yet
    }
  }

  static stopMusic(): void {
    if (AudioManager._currentMusic) {
      try {
        AudioManager._currentMusic.pause()
        AudioManager._currentMusic.removeAttribute('src')
        AudioManager._currentMusic.load()
      } catch {
        // Ignore
      }
      AudioManager._currentMusic = null
    }
  }

  static toggleMute(): boolean {
    AudioManager._muted = !AudioManager._muted
    SaveManager.save(SAVE_KEYS.muted, AudioManager._muted)
    AudioManager.applyMuteState()
    return AudioManager._muted
  }

  static setMuted(muted: boolean): void {
    AudioManager._muted = muted
    SaveManager.save(SAVE_KEYS.muted, muted)
    AudioManager.applyMuteState()
  }

  static get muted(): boolean {
    return AudioManager._muted
  }

  static setSfxVolume(volume: number): void {
    AudioManager._sfxVolume = Math.max(0, Math.min(1, volume))
    SaveManager.save(SAVE_KEYS.sfxVolume, AudioManager._sfxVolume)
  }

  static setMusicVolume(volume: number): void {
    AudioManager._musicVolume = Math.max(0, Math.min(1, volume))
    SaveManager.save(SAVE_KEYS.musicVolume, AudioManager._musicVolume)
    AudioManager.applyMuteState()
  }

  static get sfxVolume(): number {
    return AudioManager._sfxVolume
  }

  static get musicVolume(): number {
    return AudioManager._musicVolume
  }

  private static applyMuteState(): void {
    if (!AudioManager._currentMusic) return
    try {
      AudioManager._currentMusic.volume = AudioManager._muted ? 0 : AudioManager._musicVolume
    } catch {
      // Ignore
    }
  }

  private static setupAudioUnlock(): void {
    if (AudioManager._audioUnlocked) return

    const unlock = (): void => {
      if (AudioManager._audioUnlocked) return
      AudioManager._audioUnlocked = true

      try {
        const AudioContextClass =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioContextClass) {
          const ctx = new AudioContextClass()
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {/* ignore */})
          }
        }
      } catch {
        // Audio context unavailable — ignore
      }

      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('touchend', unlock)
      document.removeEventListener('mousedown', unlock)
      document.removeEventListener('keydown', unlock)
    }

    document.addEventListener('touchstart', unlock, { passive: true })
    document.addEventListener('touchend', unlock, { passive: true })
    document.addEventListener('mousedown', unlock)
    document.addEventListener('keydown', unlock)
  }
}
