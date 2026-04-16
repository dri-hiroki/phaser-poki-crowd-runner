import * as PIXI from 'pixi.js'
import { ScreenManager } from './ScreenManager'

export abstract class Screen extends PIXI.Container {
  protected screenManager: ScreenManager

  constructor(screenManager: ScreenManager) {
    super()
    this.screenManager = screenManager
  }

  get app() {
    return this.screenManager.app
  }

  /** Called when the screen becomes active */
  abstract enter(data?: any): Promise<void> | void

  /** Called when the screen becomes inactive */
  abstract exit(): Promise<void> | void

  /** Called every frame if this is the active screen */
  abstract update(delta: number): void

  /** Called when window resizes */
  abstract resize(width: number, height: number): void
}
