/**
 * ResultScreen.ts
 * End-of-run screen with animated score, Poki rewarded ad revive, and retry/menu.
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { UIButton } from '../components/UIButton'
import { formatScore } from '../utils/helpers'
import { PokiBridge } from '../lib/poki/PokiBridge'
import { getThemeForLevel } from '../data/themes'

interface ResultData {
  score: number
  highScore: number
  isNewHighScore: boolean
  victory?: boolean
  crowdCount?: number
  currentLevel?: number
}
export class ResultScreen extends Screen {
  private resultData: ResultData = { score: 0, highScore: 0, isNewHighScore: false }

  private displayedScore: number = 0
  private targetScore: number = 0
  private scoreIncrement: number = 0
  private bannerScaleTime: number = 0

  private bg!: PIXI.Graphics
  private header!: PIXI.Text
  private card!: PIXI.Graphics
  private scoreLabelText!: PIXI.Text
  private scoreDisplay!: PIXI.Text
  private banner?: PIXI.Text
  private best?: PIXI.Text
  private reviveBtn?: UIButton
  private restartBtn!: UIButton
  private menuBtn!: UIButton
  private nextPreview?: PIXI.Text

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter(data?: ResultData) {
    this.resultData = {
      score:           data?.score          ?? 0,
      highScore:       data?.highScore      ?? 0,
      isNewHighScore:  data?.isNewHighScore ?? false,
      victory:         data?.victory        ?? false,
      crowdCount:      data?.crowdCount     ?? 1,
      currentLevel:    data?.currentLevel   ?? 1
    }

    this.createBackground()
    this.createScoreDisplay()
    this.createButtons()

    if (this.app?.screen) {
      this.resize(this.app.screen.width, this.app.screen.height)
    }

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
    this.bg = new PIXI.Graphics()
    this.addChild(this.bg)
  }

  private createScoreDisplay() {
    const { score, highScore, isNewHighScore, victory, currentLevel } = this.resultData

    const headerText = victory ? `LEVEL ${currentLevel ?? 1} CLEARED!` : 'GAME OVER'
    const headerColor = victory ? '#f1c40f' : '#e74c3c'
    const headerStyle = new PIXI.TextStyle({ fontSize: 42, fontFamily: 'Arial', fill: headerColor, fontWeight: 'bold' })
    this.header = new PIXI.Text({ text: headerText, style: headerStyle })
    this.header.anchor.set(0.5)
    this.addChild(this.header)

    this.card = new PIXI.Graphics()
    this.addChild(this.card)

    const labelStyle = new PIXI.TextStyle({ fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' })
    this.scoreLabelText = new PIXI.Text({ text: 'Score', style: labelStyle })
    this.scoreLabelText.anchor.set(0.5)
    this.addChild(this.scoreLabelText)

    const scoreColor = isNewHighScore ? '#f1c40f' : '#ffffff'
    const scoreStyle = new PIXI.TextStyle({ fill: scoreColor, fontSize: 52, fontFamily: 'Arial', fontWeight: 'bold' })
    this.scoreDisplay = new PIXI.Text({ text: formatScore(score), style: scoreStyle })
    this.scoreDisplay.anchor.set(0.5)
    this.addChild(this.scoreDisplay)

    if (isNewHighScore) {
      const bannerStyle = new PIXI.TextStyle({ fill: '#f1c40f', fontSize: 20, fontFamily: 'Arial', fontWeight: 'bold' })
      this.banner = new PIXI.Text({ text: '🏆 NEW BEST!', style: bannerStyle })
      this.banner.anchor.set(0.5)
      this.addChild(this.banner)
    } else if (highScore > 0) {
      const bestStyle = new PIXI.TextStyle({ fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' })
      this.best = new PIXI.Text({ text: `Best: ${formatScore(highScore)}`, style: bestStyle })
      this.best.anchor.set(0.5)
      this.addChild(this.best)
    }
  }

  private createButtons() {
    if (!this.resultData.victory && window.PokiSDK) {
      this.reviveBtn = new UIButton({
        x: 0, y: 0,
        width: 260,
        height: 60,
        label: '📺 REVIVE (Watch Ad)',
        fontSize: 18,
        color: 0xe67e22,
        hoverColor: 0xf39c12,
        pressColor: 0xd35400,
        onClick: () => this.handleRevive()
      })
      this.addChild(this.reviveBtn)
    }

    const isVictory = this.resultData.victory
    const restartLabel = isVictory ? 'NEXT LEVEL' : 'RETRY LEVEL'
    const restartColor = isVictory ? 0x27ae60 : 0x4a90d9
    const restartHover = isVictory ? 0x2ecc71 : 0x5ba3f5
    const restartPress = isVictory ? 0x1e8449 : 0x357abd

    this.restartBtn = new UIButton({
      x: 0, y: 0,
      width: 240,
      height: 64,
      label: restartLabel,
      fontSize: 24,
      color: restartColor,
      hoverColor: restartHover,
      pressColor: restartPress,
      onClick: () => this.restartGame()
    })
    this.addChild(this.restartBtn)

    if (isVictory && this.resultData.currentLevel) {
      const nextLevel = this.resultData.currentLevel + 1
      const theme = getThemeForLevel(nextLevel)
      const previewStyle = new PIXI.TextStyle({ fill: '#aaaacc', fontSize: 18, fontFamily: 'Arial' })
      this.nextPreview = new PIXI.Text({ text: `Next: Level ${nextLevel} - ${theme.displayName}`, style: previewStyle })
      this.nextPreview.anchor.set(0.5)
      this.addChild(this.nextPreview)
    }

    this.menuBtn = new UIButton({
      x: 0, y: 0,
      width: 200,
      height: 52,
      label: 'MENU',
      fontSize: 20,
      color: 0x2c3e50,
      hoverColor: 0x3d5166,
      pressColor: 0x1a252f,
      onClick: () => this.goToMenu()
    })
    this.addChild(this.menuBtn)
  }

  private async handleRevive() {
    try {
      const rewarded = await PokiBridge.rewardedBreak('revive')
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

  private async restartGame() {
    await PokiBridge.commercialBreak('restart')
    this.screenManager.goTo('GameScreen')
  }

  private async goToMenu() {
    await PokiBridge.commercialBreak('menu')
    this.screenManager.goTo('MenuScreen')
  }

  async exit() {
    this.removeChildren()
    this.banner = undefined
    this.best = undefined
    this.reviveBtn = undefined
    this.nextPreview = undefined
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

  resize(width: number, height: number) {
    if (!this.bg) return

    const cx = width / 2
    const cy = height / 2

    this.bg.clear()
    this.bg.rect(0, 0, width, height)
    this.bg.fill({ color: 0x1a1a2e })

    this.header.position.set(cx, cy - 210)

    this.card.clear()
    this.card.roundRect(cx - 160, cy - 165, 320, 160, 16)
    this.card.fill({ color: 0x16213e, alpha: 0.8 })
    this.card.stroke({ color: 0x4a90d9, alpha: 0.4, width: 2 })

    this.scoreLabelText.position.set(cx, cy - 140)
    this.scoreDisplay.position.set(cx, cy - 110)

    if (this.banner) this.banner.position.set(cx, cy - 55)
    if (this.best) this.best.position.set(cx, cy - 55)

    if (this.reviveBtn) this.reviveBtn.position.set(cx, cy + 20)

    const retryOffset = (!this.resultData.victory && window.PokiSDK) ? 100 : 30
    this.restartBtn.position.set(cx, cy + retryOffset)
    if (this.nextPreview) this.nextPreview.position.set(cx, cy + retryOffset + 50)
    
    this.menuBtn.position.set(cx, cy + retryOffset + 85)
  }
}
