/**
 * MenuScreen.ts
 * PixiJS port of the main menu.
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { UIButton } from '../components/UIButton'
import { AudioManager } from '../core/AudioManager'
import { SaveManager, SAVE_KEYS } from '../core/SaveManager'
import { GAME_CONFIG } from '../data/gameConfig'

export class MenuScreen extends Screen {
  private muteButton!: UIButton
  private bg!: PIXI.Graphics
  private title!: PIXI.Text
  private tag!: PIXI.Text
  private playBtn!: UIButton
  private hsText?: PIXI.Text

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter() {
    this.createBackground()
    this.createTitle()
    this.createButtons()
    this.createFooter()

    // Trigger initial layout
    if (this.app?.screen) {
      this.resize(this.app.screen.width, this.app.screen.height)
    }
    this.createFooter()

    // Key handlers
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.startGame()
      } else if (e.key === 'Escape') {
        this.toggleMute()
      }
    }
    window.addEventListener('keyup', onKeyUp)
    this.on('removed', () => window.removeEventListener('keyup', onKeyUp))
  }

  private createBackground() {
    this.bg = new PIXI.Graphics()
    this.addChild(this.bg)
  }

  private createTitle() {
    const titleStyle = new PIXI.TextStyle({
      fontSize: 48,
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      fontWeight: 'bold',
      stroke: { color: 0x4a90d9, width: 3 }
    })
    this.title = new PIXI.Text({ text: GAME_CONFIG.title, style: titleStyle })
    this.title.anchor.set(0.5)
    
    const tagStyle = new PIXI.TextStyle({ fill: 0xaaaacc, fontSize: 18, fontFamily: 'Arial, sans-serif' })
    this.tag = new PIXI.Text({ text: 'Steer your crowd through the gates!', style: tagStyle })
    this.tag.anchor.set(0.5)

    this.addChild(this.title, this.tag)
  }

  private createButtons() {
    this.playBtn = new UIButton({
      x: 0, y: 0,
      width: 220,
      height: 54,
      label: 'PLAY',
      fontSize: 24,
      color: 0x4a90d9,
      hoverColor: 0x5ba3f5,
      pressColor: 0x357abd,
      onClick: () => this.startGame()
    })
    this.addChild(this.playBtn)

    const muteLabel = AudioManager.muted ? '🔇 Muted' : '🔊 Sound On'
    this.muteButton = new UIButton({
      x: 0, y: 0,
      width: 160,
      height: 40,
      label: muteLabel,
      fontSize: 16,
      color: 0x2c3e50,
      hoverColor: 0x3d5166,
      pressColor: 0x1a252f,
      onClick: () => this.toggleMute()
    })
    this.addChild(this.muteButton)
  }

  private createFooter() {
    const hs = SaveManager.load<number>(SAVE_KEYS.highScore, 0)
    if (hs > 0) {
      const hsStyle = new PIXI.TextStyle({ fill: '#f1c40f', fontSize: 18, fontFamily: 'Arial, sans-serif' })
      this.hsText = new PIXI.Text({ text: `Best: ${hs.toLocaleString()}`, style: hsStyle })
      this.hsText.anchor.set(0.5)
      this.addChild(this.hsText)
    }
  }

  private startGame() {
    const gameScreen = this.screenManager.getScreen('GameScreen') as any
    if (gameScreen && typeof gameScreen.startGameplay === 'function') {
      gameScreen.startGameplay()
    }
    this.screenManager.stop('MenuScreen')
  }

  private toggleMute() {
    const nowMuted = AudioManager.toggleMute()
    this.muteButton.setText(nowMuted ? '🔇 Muted' : '🔊 Sound On')
  }

  async exit() {
    this.removeChildren()
  }

  update(_delta: number) {}

  resize(width: number, height: number) {
    if (!this.bg) return

    const cx = width / 2
    const cy = height / 2
    const menuH = height * 0.4

    // Redraw background elements bridging the screen
    this.bg.clear()
    this.bg.rect(0, 0, width, menuH)
    this.bg.fill({ color: 0x1a1a2e, alpha: 0.85 })
    
    this.bg.rect(0, menuH - 4, width, 4)
    this.bg.fill({ color: 0x4a90d9, alpha: 0.8 })

    this.bg.circle(cx, Math.max(100, height * 0.15), 120)
    this.bg.fill({ color: 0x4a90d9, alpha: 0.06 })

    // Position Texts
    const topOffset = Math.max(60, height * 0.1)
    this.title.position.set(cx, topOffset)
    this.tag.position.set(cx, topOffset + 60)

    // Position Buttons
    const btnY = Math.max(menuH + 60, cy - 60)
    this.playBtn.position.set(cx, btnY)
    this.muteButton.position.set(cx, btnY + 70)

    // Position High Score
    if (this.hsText) {
      this.hsText.position.set(cx, btnY + 140)
    }
  }
}
