import * as PIXI from 'pixi.js'
import { Screen } from './Screen'

export class ScreenManager {
  private activeScreens: Screen[] = []
  private screens = new Map<string, Screen>()
  public app: PIXI.Application

  constructor(app: PIXI.Application) {
    this.app = app
  }

  public register(key: string, screen: Screen) {
    this.screens.set(key, screen)
  }

  /**
   * Replaces all current screens with the target screen.
   */
  public async goTo(key: string, data?: any) {
    // Clear all existing screens
    while (this.activeScreens.length > 0) {
      const screen = this.activeScreens.pop()!
      this.app.stage.removeChild(screen)
      await screen.exit()
    }

    await this.launch(key, data)
  }

  /**
   * Adds a screen on top of the current stack without removing others.
   */
  public async launch(key: string, data?: any) {
    const nextScreen = this.screens.get(key)
    if (!nextScreen) {
      console.warn(`Screen ${key} not found`)
      return
    }

    if (this.activeScreens.includes(nextScreen)) {
      console.warn(`Screen ${key} is already active`)
      return
    }

    this.activeScreens.push(nextScreen)
    this.app.stage.addChild(nextScreen)
    
    // Ensure initial resize
    nextScreen.resize(this.app.screen.width, this.app.screen.height)
    
    await nextScreen.enter(data)
  }

  /**
   * Stops and removes a specific active screen.
   */
  public async stop(key: string) {
    const screen = this.screens.get(key)
    if (!screen) return

    const index = this.activeScreens.indexOf(screen)
    if (index !== -1) {
      this.activeScreens.splice(index, 1)
      this.app.stage.removeChild(screen)
      await screen.exit()
    }
  }

  public getScreen(key: string): Screen | undefined {
    return this.screens.get(key)
  }

  public update(delta: number) {
    for (const screen of this.activeScreens) {
      screen.update(delta)
    }
  }

  public resize(width: number, height: number) {
    for (const screen of this.activeScreens) {
      screen.resize(width, height)
    }
  }
}
