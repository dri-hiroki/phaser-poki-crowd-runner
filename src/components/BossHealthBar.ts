/**
 * BossHealthBar.ts
 * PixiJS HUD component: boss wall HP bar shown during the boss phase.
 */

import * as PIXI from 'pixi.js'
import { ProgressBar } from './ProgressBar'

export class BossHealthBar extends PIXI.Container {
  private bar!: ProgressBar
  private hpLabel!: PIXI.Text
  private titleLabel!: PIXI.Text

  constructor(x: number, y: number, width: number = 320) {
    super()
    this.position.set(x, y)
    this._buildUI(width)
    this.visible = false
  }

  private _buildUI(width: number): void {
    const titleStyle = new PIXI.TextStyle({
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#ff4444'
    })
    this.titleLabel = new PIXI.Text({ text: '⚠ BOSS WALL', style: titleStyle })
    this.titleLabel.anchor.set(0.5, 1)
    this.titleLabel.position.set(0, -4)
    this.addChild(this.titleLabel)

    this.bar = new ProgressBar({
      x: 0,
      y: 0,
      width,
      height: 22,
      trackColor: 0x550000,
      fillColor: 0xcc2222,
      highlightColor: 0xff6666,
      initialValue: 1
    })
    this.addChild(this.bar)

    const hpStyle = new PIXI.TextStyle({
      fontSize: 13,
      fontFamily: 'Arial',
      fill: '#ffffff'
    })
    this.hpLabel = new PIXI.Text({ text: '', style: hpStyle })
    this.hpLabel.anchor.set(0.5, 0)
    this.hpLabel.position.set(0, 26)
    this.addChild(this.hpLabel)
  }

  show(): void  { this.visible = true  }
  hide(): void  { this.visible = false }

  update(hp: number, maxHp: number): void {
    const fraction = maxHp > 0 ? Math.max(0, hp / maxHp) : 0
    this.bar.setValue(fraction)
    this.hpLabel.text = `${Math.ceil(hp)} / ${maxHp}`

    // Tint bar red → dark as HP drains
    // ProgressBar doesn't expose tint, so we rely on fillColor gradient (good enough)
  }
}
