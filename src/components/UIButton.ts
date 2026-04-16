/**
 * UIButton.ts
 * Reusable PixiJS button component.
 */

import * as PIXI from 'pixi.js'

export interface UIButtonConfig {
  x: number
  y: number
  width?: number
  height?: number
  label: string
  fontSize?: number
  color?: number
  hoverColor?: number
  pressColor?: number
  disabledColor?: number
  textColor?: string
  radius?: number
  onClick?: () => void
}

export class UIButton extends PIXI.Container {
  private bg: PIXI.Graphics
  private labelText: PIXI.Text

  private readonly btnWidth: number
  private readonly btnHeight: number
  private readonly colorNormal: number
  private readonly colorHover: number
  private readonly colorPress: number
  private readonly colorDisabled: number
  private readonly btnRadius: number

  private _disabled: boolean = false
  private _hovered: boolean = false
  private _pressed: boolean = false

  constructor(cfg: UIButtonConfig) {
    super()

    this.x = cfg.x
    this.y = cfg.y
    this.btnWidth = Math.max(cfg.width ?? 200, 44)
    this.btnHeight = Math.max(cfg.height ?? 56, 44)
    this.colorNormal = cfg.color ?? 0x4a90d9
    this.colorHover = cfg.hoverColor ?? 0x5ba3f5
    this.colorPress = cfg.pressColor ?? 0x357abd
    this.colorDisabled = cfg.disabledColor ?? 0x555555
    this.btnRadius = cfg.radius ?? 12

    // ── Background ──────────────────────────────────────────────────────────
    this.bg = new PIXI.Graphics()
    this.drawBg(this.colorNormal)
    this.addChild(this.bg)

    // ── Label ───────────────────────────────────────────────────────────────
    const style = new PIXI.TextStyle({
      fontSize: cfg.fontSize ?? 22,
      fontFamily: 'Arial, sans-serif',
      fill: cfg.textColor ?? '#ffffff',
      fontWeight: 'bold'
    })
    this.labelText = new PIXI.Text({ text: cfg.label, style })
    this.labelText.anchor.set(0.5, 0.5)
    this.addChild(this.labelText)

    // ── Hit Area ────────────────────────────────────────────────────────
    this.hitArea = new PIXI.Rectangle(
      -this.btnWidth / 2,
      -this.btnHeight / 2,
      this.btnWidth,
      this.btnHeight
    )
    
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerover', this.onOver, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerupoutside', this.onOut, this)

    if (cfg.onClick) {
      this.on('click', cfg.onClick)
      // Pixi equivalent to click is sometimes useful for touch
      this.on('pointertap', cfg.onClick)
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setText(text: string): this {
    this.labelText.text = text
    return this
  }

  setEnabled(enabled: boolean): this {
    this._disabled = !enabled
    if (enabled) {
      this.eventMode = 'static'
      this.cursor = 'pointer'
    } else {
      this.eventMode = 'none'
      this.cursor = 'default'
    }
    this.drawBg(enabled ? this.colorNormal : this.colorDisabled)
    this.labelText.alpha = enabled ? 1 : 0.5
    return this
  }

  get isDisabled(): boolean {
    return this._disabled
  }

  // ─── State Transitions ────────────────────────────────────────────────────

  private onOver(): void {
    if (this._disabled) return
    this._hovered = true
    if (!this._pressed) {
      this.drawBg(this.colorHover)
      this.scale.set(1.03)
    }
  }

  private onOut(): void {
    if (this._disabled) return
    this._hovered = false
    this._pressed = false
    this.drawBg(this.colorNormal)
    this.scale.set(1.0)
  }

  private onDown(): void {
    if (this._disabled) return
    this._pressed = true
    this.drawBg(this.colorPress)
    this.scale.set(0.97)
  }

  private onUp(): void {
    if (this._disabled) return
    if (!this._pressed) return
    this._pressed = false
    if (this._hovered) {
      this.drawBg(this.colorHover)
      this.scale.set(1.03)
    } else {
      this.drawBg(this.colorNormal)
      this.scale.set(1.0)
    }
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  private drawBg(color: number): void {
    this.bg.clear()
    this.bg.roundRect(
      -this.btnWidth / 2,
      -this.btnHeight / 2,
      this.btnWidth,
      this.btnHeight,
      this.btnRadius
    )
    this.bg.fill({ color, alpha: 1 })
    
    // Subtle stroke
    this.bg.stroke({ color: 0xffffff, alpha: 0.15, width: 2 })
  }
}
