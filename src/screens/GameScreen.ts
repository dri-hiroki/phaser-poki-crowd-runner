/**
 * GameScreen.ts
 * PixiJS port of GameScene.
 * Manual implementation of game loop, AABB physics, pooling and rendering.
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { ScoreSystem } from '../systems/ScoreSystem'
import { DifficultySystem } from '../systems/DifficultySystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'
import { formatScore } from '../utils/helpers'
import { AssetRegistry } from '../core/Assets'

export class GameScreen extends Screen {
  private scoreSystem!: ScoreSystem
  private difficultySystem!: DifficultySystem
  private spawnSystem!: SpawnSystem

  // Layers
  private bgLayer!: PIXI.Graphics
  private worldLayer!: PIXI.Container
  private hudLayer!: PIXI.Container
  private pauseLayer!: PIXI.Container
  private damageGraphics!: PIXI.Graphics

  // Entities
  private player!: PIXI.Sprite & { customCount: number }
  private enemies: Array<PIXI.Sprite & { vx: number, vy: number, customCount: number, damageAccumulator: number, active: boolean }> = []
  private coins: Array<PIXI.Sprite & { vy: number, active: boolean }> = []

  // HUD
  private scoreText!: PIXI.Text
  private livesText!: PIXI.Text
  private muteIcon!: PIXI.Text

  // State
  private lives: number = BALANCING.startingLives
  private isPaused: boolean = false
  private isGameOver: boolean = false

  // Input
  private pointerDown: boolean = false
  private pointerX: number = GAME_CONFIG.width / 2
  private keys: Record<string, boolean> = {}

  // Spawn Refs
  private enemySpawnEntry: any
  private coinSpawnEntry: any

  constructor(screenManager: any) {
    super(screenManager)
  }

  async enter() {
    this.lives = BALANCING.startingLives
    this.isPaused = false
    this.isGameOver = false

    this.scoreSystem = new ScoreSystem()
    this.difficultySystem = new DifficultySystem()
    this.spawnSystem = new SpawnSystem()

    this.enemies = []
    this.coins = []

    this.createWorld()
    this.createPlayer()
    this.createHUD()
    this.createPauseOverlay()
    this.setupInput()
    this.setupSpawning()

    if (window.PokiSDK) {
      window.PokiSDK.gameplayStart()
    }
  }

  private createWorld() {
    this.bgLayer = new PIXI.Graphics()
    this.bgLayer.rect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.bgLayer.fill({ color: 0x1a1a2e })
    this.addChild(this.bgLayer)

    this.damageGraphics = new PIXI.Graphics()
    this.addChild(this.damageGraphics)

    this.worldLayer = new PIXI.Container()
    this.addChild(this.worldLayer)

    this.hudLayer = new PIXI.Container()
    this.addChild(this.hudLayer)

    this.pauseLayer = new PIXI.Container()
    this.addChild(this.pauseLayer)
  }

  private createPlayer() {
    this.player = new PIXI.Sprite(AssetRegistry.textures['player']) as any
    this.player.anchor.set(0.5)
    this.player.x = GAME_CONFIG.width / 2
    this.player.y = GAME_CONFIG.height - 120
    this.player.customCount = 10
    this.worldLayer.addChild(this.player)
  }

  private setupSpawning() {
    this.enemySpawnEntry = this.spawnSystem.schedule(
      () => this.spawnEnemy(),
      BALANCING.initialSpawnInterval
    )

    this.coinSpawnEntry = this.spawnSystem.schedule(
      () => this.spawnCoin(),
      BALANCING.initialSpawnInterval * 1.5
    )
  }

  private spawnEnemy() {
    let enemy = this.enemies.find(e => !e.active)
    if (!enemy) {
      enemy = new PIXI.Sprite(AssetRegistry.textures['enemy']) as any
      enemy!.anchor.set(0.5)
      this.enemies.push(enemy!)
      this.worldLayer.addChild(enemy!)
    }

    enemy!.active = true
    enemy!.visible = true
    enemy!.x = 30 + Math.random() * (GAME_CONFIG.width - 60)
    enemy!.y = -20
    enemy!.customCount = Math.floor(Math.random() * 10) + 5
    enemy!.damageAccumulator = 0

    const speed = 150 + this.difficultySystem.getDifficultyMultiplier() * 50
    enemy!.vy = speed
    enemy!.vx = (Math.random() * 80) - 40
  }

  private spawnCoin() {
    let coin = this.coins.find(c => !c.active)
    if (!coin) {
      coin = new PIXI.Sprite(AssetRegistry.textures['coin']) as any
      coin!.anchor.set(0.5)
      this.coins.push(coin!)
      this.worldLayer.addChild(coin!)
    }

    coin!.active = true
    coin!.visible = true
    coin!.x = 30 + Math.random() * (GAME_CONFIG.width - 60)
    coin!.y = -20
    coin!.vy = 120
  }

  private createHUD() {
    const textStyle = new PIXI.TextStyle({ fontSize: 22, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Arial' })
    this.scoreText = new PIXI.Text({ text: 'Score: 0', style: textStyle })
    this.scoreText.anchor.set(0.5, 0)
    this.scoreText.position.set(GAME_CONFIG.width / 2, 30)

    const livesStyle = new PIXI.TextStyle({ fontSize: 20, fill: '#e74c3c', fontFamily: 'Arial' })
    this.livesText = new PIXI.Text({ text: `❤️ ${this.lives}`, style: livesStyle })
    this.livesText.anchor.set(1, 0)
    this.livesText.position.set(GAME_CONFIG.width - 16, 16)

    const muteStyle = new PIXI.TextStyle({ fontSize: 24 })
    this.muteIcon = new PIXI.Text({ text: AudioManager.muted ? '🔇' : '🔊', style: muteStyle })
    this.muteIcon.position.set(16, 16)
    
    // Interactions
    this.muteIcon.eventMode = 'static'
    this.muteIcon.cursor = 'pointer'
    this.muteIcon.on('pointerdown', () => {
      AudioManager.toggleMute()
      this.muteIcon.text = AudioManager.muted ? '🔇' : '🔊'
    })

    this.hudLayer.addChild(this.scoreText, this.livesText, this.muteIcon)
  }

  private createPauseOverlay() {
    this.pauseLayer.visible = false

    const dim = new PIXI.Graphics()
    dim.rect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    dim.fill({ color: 0x000000, alpha: 0.6 })

    const pStyle = new PIXI.TextStyle({ fontSize: 40, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Arial' })
    const pText = new PIXI.Text({ text: 'PAUSED', style: pStyle })
    pText.anchor.set(0.5)
    pText.position.set(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 40)

    const rStyle = new PIXI.TextStyle({ fontSize: 18, fill: '#aaaacc', fontFamily: 'Arial' })
    const rText = new PIXI.Text({ text: 'Press Escape to resume', style: rStyle })
    rText.anchor.set(0.5)
    rText.position.set(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 20)

    this.pauseLayer.addChild(dim, pText, rText)
  }

  private setupInput() {
    // Pixi federated events require tracking down/move on stage or background
    this.bgLayer.eventMode = 'static'
    this.bgLayer.on('pointerdown', (e) => { this.pointerDown = true; this.pointerX = e.global.x })
    this.bgLayer.on('pointermove', (e) => { if (this.pointerDown) this.pointerX = e.global.x })
    this.bgLayer.on('pointerup', () => { this.pointerDown = false })
    this.bgLayer.on('pointerupoutside', () => { this.pointerDown = false })

    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key] = true
      if (e.key === 'Escape') this.togglePause()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    this.on('removed', () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    })
  }

  private togglePause() {
    this.isPaused = !this.isPaused
    this.pauseLayer.visible = this.isPaused
    this.isPaused ? this.spawnSystem.pause() : this.spawnSystem.resume()
  }

  update(deltaMs: number) {
    if (this.isGameOver || this.isPaused) return

    const deltaSec = deltaMs / 1000

    this.difficultySystem.update(deltaMs)
    this.enemySpawnEntry.intervalMs = this.difficultySystem.getCurrentSpawnInterval()
    this.coinSpawnEntry.intervalMs = this.difficultySystem.getCurrentSpawnInterval() * 1.5

    this.spawnSystem.tick(deltaMs)
    this.updatePlayerMovement(deltaSec)
    this.updateEntities(deltaSec)
    this.checkCollisions()
    this.applyProjectileDamage(deltaMs)
    this.cleanupOffscreenObjects()
  }

  private updatePlayerMovement(deltaSec: number) {
    const speed = BALANCING.playerSpeed
    let vx = 0

    const leftDown = this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']
    const rightDown = this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']

    if (leftDown) vx = -speed
    else if (rightDown) vx = speed

    if (this.pointerDown && !leftDown && !rightDown) {
      const diff = this.pointerX - this.player.x
      if (Math.abs(diff) > 8) {
        vx = Math.sign(diff) * speed
      }
    }

    this.player.x += vx * deltaSec

    // Collision with world bounds
    const halfWidth = this.player.width / 2
    if (this.player.x < halfWidth) this.player.x = halfWidth
    if (this.player.x > GAME_CONFIG.width - halfWidth) this.player.x = GAME_CONFIG.width - halfWidth
  }

  private updateEntities(deltaSec: number) {
    for (const e of this.enemies) {
      if (e.active) {
        e.y += e.vy * deltaSec
        e.x += e.vx * deltaSec
      }
    }
    for (const c of this.coins) {
      if (c.active) {
        c.y += c.vy * deltaSec
      }
    }
  }

  // Generic AABB collision
  private isOverlapping(s1: PIXI.Sprite, s2: PIXI.Sprite): boolean {
    const b1 = s1.getBounds()
    const b2 = s2.getBounds()
    return b1.x < b2.x + b2.width &&
           b1.x + b1.width > b2.x &&
           b1.y < b2.y + b2.height &&
           b1.height + b1.y > b2.y
  }

  private checkCollisions() {
    for (const e of this.enemies) {
      if (e.active && this.isOverlapping(this.player, e)) {
        e.active = false
        e.visible = false
        this.handleHitEnemy()
      }
    }

    for (const c of this.coins) {
      if (c.active && this.isOverlapping(this.player, c)) {
        c.active = false
        c.visible = false
        this.handleCollectCoin()
      }
    }
  }

  private handleHitEnemy() {
    this.lives--
    this.updateHUD()

    // Tween Hit Flash manually
    let flashTicks = 0
    let count = 0
    const flashLoop = () => {
      if (!this.player || this.isGameOver) {
        this.app.ticker.remove(flashLoop)
        return
      }
      flashTicks++
      if (flashTicks > 5) { // toggle every ~5 frames
        flashTicks = 0
        count++
        this.player.alpha = this.player.alpha === 1 ? 0.3 : 1
        if (count >= 6) {
          this.player.alpha = 1
          this.app.ticker.remove(flashLoop)
        }
      }
    }
    this.app.ticker.add(flashLoop)

    AudioManager.playSfx(null as any, 'sfx_hurt')

    if (this.lives <= 0) {
      this.triggerGameOver()
    }
  }

  private handleCollectCoin() {
    this.scoreSystem.add(BALANCING.pointsPerEvent)
    this.updateHUD()
    AudioManager.playSfx(null as any, 'sfx_score')
  }

  private applyProjectileDamage(deltaMs: number) {
    const playerCount = this.player.customCount || 1

    const width = 20 + playerCount * 2
    const height = 300
    
    const left = this.player.x - width / 2
    const right = this.player.x + width / 2
    const bottom = this.player.y - 20
    const top = bottom - height

    // Optional visual
    this.damageGraphics.clear()
    const alpha = Math.min(0.2 + playerCount * 0.01, 0.6)
    this.damageGraphics.rect(left, top, width, height)
    this.damageGraphics.fill({ color: 0x00ffff, alpha })

    let closestEnemy: any = null
    let closestDist = Infinity

    for (const enemy of this.enemies) {
      if (!enemy.active) continue

      if (enemy.x >= left && enemy.x <= right && enemy.y >= top && enemy.y <= bottom) {
        const yDist = this.player.y - enemy.y
        if (yDist > 0 && yDist < closestDist) {
          closestDist = yDist
          closestEnemy = enemy
        }
      }
    }

    if (closestEnemy) {
      const damageRate = playerCount * 0.05
      const damageToAdd = damageRate * (deltaMs / 16.666)

      let accum = closestEnemy.damageAccumulator || 0
      accum += damageToAdd

      if (accum >= 1) {
        const drop = Math.floor(accum)
        closestEnemy.customCount = (closestEnemy.customCount || 1) - drop
        accum -= drop

        if (closestEnemy.customCount <= 0) {
          closestEnemy.active = false 
          closestEnemy.visible = false
          this.scoreSystem.add(BALANCING.pointsPerEvent)
          this.updateHUD()
          AudioManager.playSfx(null as any, 'sfx_score')
        } else {
          closestEnemy.damageAccumulator = accum
        }
      } else {
        closestEnemy.damageAccumulator = accum
      }
    }
  }

  private cleanupOffscreenObjects() {
    const bottom = GAME_CONFIG.height + 60
    for (const e of this.enemies) {
      if (e.active && e.y > bottom) {
        e.active = false
        e.visible = false
      }
    }
    for (const c of this.coins) {
      if (c.active && c.y > bottom) {
        c.active = false
        c.visible = false
      }
    }
  }

  private updateHUD() {
    this.scoreText.text = `Score: ${formatScore(this.scoreSystem.getScore())}`
    this.livesText.text = `❤️ ${this.lives}`
  }

  private triggerGameOver() {
    this.isGameOver = true
    this.spawnSystem.clear()

    if (window.PokiSDK) {
      window.PokiSDK.gameplayStop()
    }

    // Manual camera shake & fade setup
    let shakeFrame = 0
    const ox = this.worldLayer.x, oy = this.worldLayer.y
    const shakeLoop = () => {
      if (shakeFrame++ < 15) {
        this.worldLayer.x = ox + (Math.random() - 0.5) * 10
        this.worldLayer.y = oy + (Math.random() - 0.5) * 10
      } else {
        this.worldLayer.x = ox
        this.worldLayer.y = oy
        this.app.ticker.remove(shakeLoop)
        
        setTimeout(() => {
          this.screenManager.goTo('ResultScreen', {
            score: this.scoreSystem.getScore(),
            highScore: this.scoreSystem.getHighScore(),
            isNewHighScore: this.scoreSystem.isNewHighScore()
          })
        }, 600)
      }
    }
    this.app.ticker.add(shakeLoop)
  }

  async exit() {
    this.spawnSystem.clear()
    this.removeChildren()
  }

  resize(_width: number, _height: number) {}
}
