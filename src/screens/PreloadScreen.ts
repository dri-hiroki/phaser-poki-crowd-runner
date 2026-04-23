/**
 * PreloadScreen.ts
 * Generates placeholders and simulates loading phase.
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { ProgressBar } from '../components/ProgressBar'
import { GAME_CONFIG } from '../data/gameConfig'
import { AssetRegistry } from '../core/Assets'

export class PreloadScreen extends Screen {
  private progressBar!: ProgressBar
  private loadingText!: PIXI.Text
  private percentText!: PIXI.Text

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter() {
    this.createLoadingUI()
    
    // Simulate loading external assets or generating textures
    await AssetRegistry.generatePlaceholderTextures(this.app)

    // Simulate progress
    for (let i = 0; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30))
      const value = i / 10
      this.progressBar.setValue(value)
      this.percentText.text = `${Math.round(value * 100)}%`
    }

    this.loadingText.text = 'Ready!'

    // Notify Poki that all assets are loaded
    window.PokiSDK?.gameLoadingFinished()

    // Go to next
    setTimeout(async () => {
      await this.screenManager.goTo('GameScreen', { preview: true })
      await this.screenManager.launch('MenuScreen')
    }, 200)
  }

  private createLoadingUI() {
    const cx = GAME_CONFIG.width / 2
    const cy = GAME_CONFIG.height / 2

    const titleStyle = new PIXI.TextStyle({ fill: 0xffffff, fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold' })
    const title = new PIXI.Text({ text: GAME_CONFIG.title, style: titleStyle })
    title.anchor.set(0.5)
    title.position.set(cx, cy - 100)

    const labelStyle = new PIXI.TextStyle({ fill: 0xaaaacc, fontSize: 18, fontFamily: 'Arial' })
    this.loadingText = new PIXI.Text({ text: 'Loading...', style: labelStyle })
    this.loadingText.anchor.set(0.5)
    this.loadingText.position.set(cx, cy - 20)

    this.progressBar = new ProgressBar({ x: cx, y: cy + 20, width: 300, height: 20 })

    const percentStyle = new PIXI.TextStyle({ fill: 0xaaaacc, fontSize: 16, fontFamily: 'Arial' })
    this.percentText = new PIXI.Text({ text: '0%', style: percentStyle })
    this.percentText.anchor.set(0.5)
    this.percentText.position.set(cx, cy + 60)

    this.addChild(title, this.loadingText, this.progressBar, this.percentText)
  }

  async exit() {
    this.removeChildren()
  }

  update(_delta: number) {}
  resize(_width: number, _height: number) {}
}
