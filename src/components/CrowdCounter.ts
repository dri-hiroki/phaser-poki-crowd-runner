/**
 * CrowdCounter.ts
 * PixiJS HUD component: displays the crowd clone count.
 * Plays a scale-pop animation when the count changes.
 */

import * as PIXI from 'pixi.js'

export class CrowdCounter extends PIXI.Container {
  private _labelText!: PIXI.Text
  private _count: number = 0
  private _popTimer: number = 0
  private readonly POP_DURATION = 180  // ms

  constructor(x: number, y: number) {
    super()
    this.position.set(x, y)
    this._buildUI()
  }

  private _buildUI(): void {
    // Shadow for readability
    const shadowStyle = new PIXI.TextStyle({
      fontSize: 52,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#000000'
    })
    const shadow = new PIXI.Text({ text: '1', style: shadowStyle })
    shadow.anchor.set(0.5)
    shadow.alpha = 0.35
    shadow.position.set(2, 2)
    this.addChild(shadow)

    const style = new PIXI.TextStyle({
      fontSize: 52,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      stroke: { color: '#000000', width: 4 }
    })
    this._labelText = new PIXI.Text({ text: '1', style })
    this._labelText.anchor.set(0.5)
    this.addChild(this._labelText)

    // Small "CLONES" sub-label
    const subStyle = new PIXI.TextStyle({
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#cccccc'
    })
    const sub = new PIXI.Text({ text: 'CLONES', style: subStyle })
    sub.anchor.set(0.5)
    sub.position.set(0, 34)
    this.addChild(sub)
  }

  update(count: number, delta: number): void {
    if (count !== this._count) {
      this._count = count
      this._labelText.text = String(count)
      this._popTimer = this.POP_DURATION
    }

    if (this._popTimer > 0) {
      this._popTimer = Math.max(0, this._popTimer - delta)
      const t = this._popTimer / this.POP_DURATION
      this.scale.set(1.0 + t * 0.4)
    } else {
      this.scale.set(1.0)
    }
  }
}
