/**
 * ProgressBar.ts
 * Reusable loading/progress bar component migrated to PixiJS.
 */

import * as PIXI from 'pixi.js'

export interface ProgressBarConfig {
  x: number
  y: number
  width?: number
  height?: number
  /** Background track color */
  trackColor?: number
  /** Fill color for completed portion */
  fillColor?: number
  /** Accent/highlight color drawn as a thin stripe on top of fill */
  highlightColor?: number
  /** Corner radius */
  radius?: number
  /** Initial progress value 0..1 */
  initialValue?: number
}

export class ProgressBar extends PIXI.Container {
  private track: PIXI.Graphics
  private fill: PIXI.Graphics

  private readonly barWidth: number
  private readonly barHeight: number
  private readonly trackColor: number
  private readonly fillColor: number
  private readonly highlightColor: number
  private readonly barRadius: number

  private _value: number = 0

  constructor(cfg: ProgressBarConfig) {
    super()
    
    this.x = cfg.x
    this.y = cfg.y

    this.barWidth = cfg.width ?? 300
    this.barHeight = cfg.height ?? 20
    this.trackColor = cfg.trackColor ?? 0x333355
    this.fillColor = cfg.fillColor ?? 0x4a90d9
    this.highlightColor = cfg.highlightColor ?? 0x7ab8f5
    this.barRadius = cfg.radius ?? Math.floor(this.barHeight / 2)

    this.track = new PIXI.Graphics()
    this.addChild(this.track)
    this.drawTrack()

    this.fill = new PIXI.Graphics()
    this.addChild(this.fill)

    this.setValue(cfg.initialValue ?? 0)
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Set progress. value must be in range 0..1.
   */
  setValue(value: number): void {
    this._value = Math.max(0, Math.min(1, value))
    this.drawFill()
  }

  /**
   * Returns current progress value (0..1).
   */
  get value(): number {
    return this._value
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  private drawTrack(): void {
    this.track.clear()
    
    // Outer border (simulated with slightly larger rect)
    this.track.roundRect(
      -this.barWidth / 2 - 1,
      -this.barHeight / 2 - 1,
      this.barWidth + 2,
      this.barHeight + 2,
      this.barRadius + 1
    )
    this.track.stroke({ color: 0xffffff, width: 2, alpha: 0.2 })

    // Fill with track color
    this.track.roundRect(
      -this.barWidth / 2,
      -this.barHeight / 2,
      this.barWidth,
      this.barHeight,
      this.barRadius
    )
    this.track.fill({ color: this.trackColor, alpha: 1 })
  }

  private drawFill(): void {
    this.fill.clear()
    if (this._value <= 0) return

    const filledWidth = Math.max(this.barRadius * 2, this.barWidth * this._value)

    // Main fill
    this.fill.roundRect(
      -this.barWidth / 2,
      -this.barHeight / 2,
      filledWidth,
      this.barHeight,
      this.barRadius
    )
    this.fill.fill({ color: this.fillColor, alpha: 1 })

    // Highlight stripe (top edge)
    const highlightH = Math.max(2, Math.floor(this.barHeight * 0.25))
    this.fill.roundRect(
      -this.barWidth / 2 + 4,
      -this.barHeight / 2 + 3,
      Math.max(0, filledWidth - 8),
      highlightH,
      highlightH / 2
    )
    this.fill.fill({ color: this.highlightColor, alpha: 0.5 })
  }
}
