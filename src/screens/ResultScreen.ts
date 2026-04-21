/**
 * ResultScreen.ts
 * End-of-run screen with animated score, Poki rewarded ad revive, and retry/menu.
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { UIButton } from '../components/UIButton'
import { GAME_CONFIG } from '../data/gameConfig'
import { formatScore } from '../utils/helpers'

interface ResultData {
  score: number
  highScore: number
  isNewHighScore: boolean
  victory?: boolean
  crowdCount?: number
}

export class ResultScreen extends Screen {
  private resultData: ResultData = { score: 0, highScore: 0, isNewHighScore: false }

  private scoreDisplay!: PIXI.Text
  private displayedScore: number = 0
  private targetScore: number = 0
  private scoreIncrement: number = 0

  private banner?: PIXI.Text
  private bannerScaleTime: number = 0

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter(data?: ResultData) {
    this.resultData = {
      score:           data?.score          ?? 0,
      highScore:       data?.highScore      ?? 0,
      isNewHighScore:  data?.isNewHighScore ?? false,
      victory:         data?.victory        ?? false,
      crowdCount:      data?.crowdCount     ?? 1
    }

    this.createBackground()
    this.createScoreDisplay()
    this.createButtons()

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') this.restartGame()
    }
    window.addEventListener('keyup', onKeyUp)
    this.on('removed', () => window.removeEventListener('keyup', onKeyUp))

    this.displayedScore = 0
    this.targetScore = this.resultData.score
    this.scoreIncrement = Math.ceil(this.targetScore / 40)
    if (this.targetScore > 0 && this.scoreDisplay) {
      this.scoreDisplay.text = formatScore(0)
    }
  }

  private createBackground() {
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    bg.fill({ color: 0x1a1a2e })
    this.addChild(bg)
  }

  private createScoreDisplay() {
    const cx = GAME_CONFIG.width / 2
    const cy = GAME_CONFIG.height / 2
    const { score, highScore, isNewHighScore, victory } = this.resultData

    const headerText = victory ? '🏆 VICTORY!' : 'GAME OVER'
    const headerColor = victory ? '#f1c40f' : '#e74c3c'
    const headerStyle = new PIXI.TextStyle({ fontSize: 42, fontFamily: 'Arial', fill: headerColor, fontWeight: 'bold' })
    const header = new PIXI.Text({ text: headerText, style: headerStyle })
    header.anchor.set(0.5)
    header.position.set(cx, cy - 210)
    this.addChild(header)

    const card = new PIXI.Graphics()
    card.roundRect(cx - 160, cy - 165, 320, 160, 16)
    card.fill({ color: 0x16213e, alpha: 0.8 })
    card.stroke({ color: 0x4a90d9, alpha: 0.4, width: 2 })
    this.addChild(card)

    const labelStyle = new PIXI.TextStyle({ fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' })
    const label = new PIXI.Text({ text: 'Score', style: labelStyle })
    label.anchor.set(0.5)
    label.position.set(cx, cy - 140)
    this.addChild(label)

    const scoreColor = isNewHighScore ? '#f1c40f' : '#ffffff'
    const scoreStyle = new PIXI.TextStyle({ fill: scoreColor, fontSize: 52, fontFamily: 'Arial', fontWeight: 'bold' })
    this.scoreDisplay = new PIXI.Text({ text: formatScore(score), style: scoreStyle })
    this.scoreDisplay.anchor.set(0.5)
    this.scoreDisplay.position.set(cx, cy - 110)
    this.addChild(this.scoreDisplay)

    if (isNewHighScore) {
      const bannerStyle = new PIXI.TextStyle({ fill: '#f1c40f', fontSize: 20, fontFamily: 'Arial', fontWeight: 'bold' })
      this.banner = new PIXI.Text({ text: '🏆 NEW BEST!', style: bannerStyle })
      this.banner.anchor.set(0.5)
      this.banner.position.set(cx, cy - 55)
      this.addChild(this.banner)
    } else if (highScore > 0) {
      const bestStyle = new PIXI.TextStyle({ fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' })
      const best = new PIXI.Text({ text: `Best: ${formatScore(highScore)}`, style: bestStyle })
      best.anchor.set(0.5)
      best.position.set(cx, cy - 55)
      this.addChild(best)
    }
  }

  private createButtons() {
    const cx = GAME_CONFIG.width / 2
    const cy = GAME_CONFIG.height / 2

    // ── Revive (Poki rewarded ad) ──────────────────────────────────────────
    if (!this.resultData.victory && window.PokiSDK) {
      const reviveBtn = new UIButton({
        x: cx,
        y: cy + 20,
        width: 260,
        height: 60,
        label: '📺 REVIVE (Watch Ad)',
        fontSize: 18,
        color: 0xe67e22,
        hoverColor: 0xf39c12,
        pressColor: 0xd35400,
        onClick: () => this.handleRevive()
      })
      this.addChild(reviveBtn)
    }

    const retryOffset = (!this.resultData.victory && window.PokiSDK) ? 100 : 30

    const restartBtn = new UIButton({
      x: cx,
      y: cy + retryOffset,
      width: 240,
      height: 64,
      label: 'PLAY AGAIN',
      fontSize: 24,
      color: 0x4a90d9,
      hoverColor: 0x5ba3f5,
      pressColor: 0x357abd,
      onClick: () => this.restartGame()
    })
    this.addChild(restartBtn)

    const menuBtn = new UIButton({
      x: cx,
      y: cy + retryOffset + 80,
      width: 200,
      height: 52,
      label: 'MENU',
      fontSize: 20,
      color: 0x2c3e50,
      hoverColor: 0x3d5166,
      pressColor: 0x1a252f,
      onClick: () => this.goToMenu()
    })
    this.addChild(menuBtn)
  }

  private async handleRevive() {
    try {
      const rewarded = await window.PokiSDK?.rewardedBreak()
      if (rewarded) {
        this.screenManager.goTo('GameScreen', {
          revive: true,
          crowdCount: this.resultData.crowdCount ?? 1
        })
      }
    } catch {
      // Rewarded ad unavailable — do nothing
    }
  }

  private restartGame() {
    this.screenManager.goTo('GameScreen')
  }

  private goToMenu() {
    this.screenManager.goTo('MenuScreen')
  }

  async exit() {
    this.removeChildren()
    this.banner = undefined
  }

  update(delta: number) {
    if (this.displayedScore < this.targetScore && this.targetScore > 0) {
      const ticksPerFrame = Math.max(1, delta / 16.6)
      this.displayedScore = Math.min(this.targetScore, this.displayedScore + this.scoreIncrement * ticksPerFrame * 0.5)
      this.scoreDisplay.text = formatScore(Math.floor(this.displayedScore))
    }

    if (this.banner) {
      this.bannerScaleTime += delta * 0.005
      const scale = 1.0 + Math.sin(this.bannerScaleTime) * 0.1
      this.banner.scale.set(scale)
    }
  }

  resize(_w: number, _h: number) {}
}
