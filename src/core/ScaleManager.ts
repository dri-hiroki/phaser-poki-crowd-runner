/**
 * ScaleManager.ts
 * Manages responsive canvas scaling using CSS.
 * - Maintains 9:16 portrait aspect ratio on all screen sizes
 * - Centers the canvas in the viewport
 * - Handles orientation change events
 */

import { GAME_CONFIG } from '../data/gameConfig'
import { ScreenManager } from './ScreenManager'

export class ScaleManager {
  private static screenManager: ScreenManager | null = null

  /**
   * Initializes orientation change handling and canvas resize binding.
   */
  static init(canvas: HTMLCanvasElement, screenManager: ScreenManager): void {
    ScaleManager.screenManager = screenManager

    // Initial scale and DOM constraints
    if (canvas.parentElement) {
      canvas.parentElement.style.backgroundColor = GAME_CONFIG.backgroundColor
    }

    ScaleManager.handleResize()
    
    window.addEventListener('orientationchange', () => {
      setTimeout(() => ScaleManager.handleResize(), 100)
    })
    window.addEventListener('resize', () => ScaleManager.handleResize())
  }

  static handleResize(): void {
    if (!ScaleManager.screenManager) return
    ScaleManager.screenManager.resize(window.innerWidth, window.innerHeight)
  }

  static get viewportWidth(): number {
    return window.innerWidth
  }

  static get viewportHeight(): number {
    return window.innerHeight
  }
}
