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
  private static orientationWarning: HTMLElement | null = null
  private static canvas: HTMLCanvasElement | null = null
  private static screenManager: ScreenManager | null = null

  /**
   * Initializes orientation change handling and canvas resize binding.
   */
  static init(canvas: HTMLCanvasElement, screenManager: ScreenManager): void {
    ScaleManager.canvas = canvas
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
    ScaleManager.checkOrientation()
    if (!ScaleManager.canvas) return

    // Apply FIT mode logic via CSS
    const targetW = window.innerWidth
    const targetH = window.innerHeight
    const sourceW = GAME_CONFIG.width
    const sourceH = GAME_CONFIG.height

    const scale = Math.min(targetW / sourceW, targetH / sourceH)

    ScaleManager.canvas.style.width = `${sourceW * scale}px`
    ScaleManager.canvas.style.height = `${sourceH * scale}px`
    
    // Fire resize on ScreenManager if needed internally (though geometry stays GAME_CONFIG bounds)
    if (ScaleManager.screenManager) {
      ScaleManager.screenManager.resize(sourceW, sourceH)
    }
  }

  static isWrongOrientation(): boolean {
    return window.innerWidth > window.innerHeight && window.innerWidth < 900
  }

  static get viewportWidth(): number {
    return window.innerWidth
  }

  static get viewportHeight(): number {
    return window.innerHeight
  }

  private static checkOrientation(): void {
    if (ScaleManager.isWrongOrientation()) {
      ScaleManager.showOrientationWarning()
    } else {
      ScaleManager.hideOrientationWarning()
    }
  }

  private static showOrientationWarning(): void {
    if (ScaleManager.orientationWarning) return

    const el = document.createElement('div')
    el.id = 'orientation-warning'
    el.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #1a1a2e;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      font-size: 18px;
      text-align: center;
      padding: 24px;
    `
    el.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
      <div>Please rotate your device to portrait mode</div>
    `
    document.body.appendChild(el)
    ScaleManager.orientationWarning = el
  }

  private static hideOrientationWarning(): void {
    if (!ScaleManager.orientationWarning) return
    ScaleManager.orientationWarning.remove()
    ScaleManager.orientationWarning = null
  }
}
