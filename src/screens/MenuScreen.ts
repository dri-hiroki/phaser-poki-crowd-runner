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

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter() {
    this.createBackground()
    this.createTitle()
    this.createButtons()

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
    const menuH = GAME_CONFIG.height * 0.4
    const bg = new PIXI.Graphics()
    
    // Top panel
    bg.rect(0, 0, GAME_CONFIG.width, menuH)
    bg.fill({ color: 0x1a1a2e, alpha: 0.85 })
    
    // Divider
    bg.rect(0, menuH - 4, GAME_CONFIG.width, 4)
    bg.fill({ color: 0x4a90d9, alpha: 0.8 })

    // Decorative circle
    const cx = GAME_CONFIG.width / 2
    bg.circle(cx - 120, 100, 120)
    bg.fill({ color: 0x4a90d9, alpha: 0.06 })

    this.addChild(bg)
  }

  private createTitle() {
    const cx = GAME_CONFIG.width / 2
    const topOffset = 60

    const titleStyle = new PIXI.TextStyle({
      fontSize: 48,
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      fontWeight: 'bold',
      stroke: { color: 0x4a90d9, width: 3 }
    })
    const title = new PIXI.Text({ text: GAME_CONFIG.title, style: titleStyle })
    title.anchor.set(0.5)
    title.position.set(cx, topOffset)
    
    const tagStyle = new PIXI.TextStyle({ fill: 0xaaaacc, fontSize: 18, fontFamily: 'Arial, sans-serif' })
    const tag = new PIXI.Text({ text: 'Steer your crowd through the gates!', style: tagStyle })
    tag.anchor.set(0.5)
    tag.position.set(cx, topOffset + 60)

    this.addChild(title, tag)
  }

  private createButtons() {
    const cx = GAME_CONFIG.width / 2
    const menuH = GAME_CONFIG.height * 0.4
    const btnY = menuH - 120

    const playBtn = new UIButton({
      x: cx,
      y: btnY,
      width: 220,
      height: 54,
      label: 'PLAY',
      fontSize: 24,
      color: 0x4a90d9,
      hoverColor: 0x5ba3f5,
      pressColor: 0x357abd,
      onClick: () => this.startGame()
    })
    this.addChild(playBtn)

    const muteLabel = AudioManager.muted ? '🔇 Muted' : '🔊 Sound On'
    this.muteButton = new UIButton({
      x: cx,
      y: btnY + 70,
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
    const cx = GAME_CONFIG.width / 2
    const cy = GAME_CONFIG.height / 2

    const hs = SaveManager.load<number>(SAVE_KEYS.highScore, 0)
    if (hs > 0) {
      const hsStyle = new PIXI.TextStyle({ fill: '#f1c40f', fontSize: 18, fontFamily: 'Arial, sans-serif' })
      const hsText = new PIXI.Text({ text: `Best: ${hs.toLocaleString()}`, style: hsStyle })
      hsText.anchor.set(0.5)
      hsText.position.set(cx, cy + 165)
      this.addChild(hsText)
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
  resize(_width: number, _height: number) {}
}
