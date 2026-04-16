import * as PIXI from 'pixi.js'
import { Screen } from './Screen'

export class ScreenManager {
  private activeScreen?: Screen
  private screens = new Map<string, Screen>()
  public app: PIXI.Application

  constructor(app: PIXI.Application) {
    this.app = app
  }

  public register(key: string, screen: Screen) {
    this.screens.set(key, screen)
  }

  public async goTo(key: string, data?: any) {
    if (this.activeScreen) {
      this.app.stage.removeChild(this.activeScreen)
      await this.activeScreen.exit()
    }

    const nextScreen = this.screens.get(key)
    if (!nextScreen) {
      console.warn(`Screen ${key} not found`)
      return
    }

    this.activeScreen = nextScreen
    this.app.stage.addChild(this.activeScreen)
    
    // Ensure initial resize
    this.activeScreen.resize(this.app.screen.width, this.app.screen.height)
    
    await this.activeScreen.enter(data)
  }

  public update(delta: number) {
    if (this.activeScreen) {
      this.activeScreen.update(delta)
    }
  }

  public resize(width: number, height: number) {
    if (this.activeScreen) {
      this.activeScreen.resize(width, height)
    }
  }
}
