/**
 * GameScreen.ts
 * Cluster Run main game screen.
 *
 * PixiJS layer: HUD only (crowd count, boss HP bar, mute button, pause overlay).
 * Three.js layer: 3D world (track, crowd, gates, obstacles, boss wall).
 *
 * State machine: idle → running → boss → (victory | gameover) → result
 */

import * as PIXI from 'pixi.js'
import { Screen } from '../core/Screen'
import { ThreeRenderer } from '../core/ThreeRenderer'
import { CrowdSystem } from '../systems/CrowdSystem'
import { GateSystem } from '../systems/GateSystem'
import { ObstacleSystem } from '../systems/ObstacleSystem'
import { LevelSystem } from '../systems/LevelSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { AudioManager } from '../core/AudioManager'
import { CrowdCounter } from '../components/CrowdCounter'
import { BossHealthBar } from '../components/BossHealthBar'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'
import { clamp } from '../utils/helpers'
import { runMathGateSelfTests } from '../utils/mathGate'

type GameState = 'idle' | 'running' | 'boss' | 'gameover'

export class GameScreen extends Screen {
  // ─── Systems ──────────────────────────────────────────────────────────────
  private three!: ThreeRenderer
  private crowd!: CrowdSystem
  private gateSystem!: GateSystem
  private obstacleSystem!: ObstacleSystem
  private levelSystem!: LevelSystem
  private scoreSystem!: ScoreSystem
  private spawnSystem!: SpawnSystem

  // ─── State ────────────────────────────────────────────────────────────────
  private gameState: GameState = 'idle'
  private bossHp: number = 0
  private bossHpMax: number = 0

  // ─── Input ────────────────────────────────────────────────────────────────
  private pointerDown: boolean = false
  private pointerStartX: number = 0
  private pointerDeltaX: number = 0
  private keys: Record<string, boolean> = {}

  // ─── Crowd world position ─────────────────────────────────────────────────
  /** Crowd X in Three.js world units */
  private crowdWorldX: number = 0
  /** Crowd Z scrolls forward each frame; camera tracks it */
  private crowdWorldZ: number = 0

  // ─── HUD (PixiJS) ─────────────────────────────────────────────────────────
  private crowdCounter!: CrowdCounter
  private bossHealthBar!: BossHealthBar
  private muteBtn!: PIXI.Text
  private pauseOverlay!: PIXI.Container
  private pauseDim!: PIXI.Graphics
  private pauseHeader!: PIXI.Text
  private pauseSub!: PIXI.Text
  private scoreText!: PIXI.Text
  private isPaused: boolean = false
  private isGameplayActive: boolean = false

  // ─── Spawn entries ────────────────────────────────────────────────────────
  private gateSpawnEntry: any = null
  private obstacleSpawnEntry: any = null

  constructor(screenManager: any) {
    super(screenManager)
  }

  // ─── enter ────────────────────────────────────────────────────────────────

  async enter(data?: { revive?: boolean; crowdCount?: number; preview?: boolean }) {
    // Run math self-tests in dev
    if (window.location.hostname === 'localhost') {
      runMathGateSelfTests()
    }

    this.gameState = 'idle'
    this.crowdWorldX = 0
    this.crowdWorldZ = 0
    this.isPaused = false

    // ── Systems ──────────────────────────────────────────────────────────
    const startCount = (data?.revive && data?.crowdCount)
      ? Math.max(1, Math.floor(data.crowdCount * 0.5))
      : 1

    this.crowd = new CrowdSystem(startCount)
    this.crowd.onCountChange = (n) => this.crowdCounter?.update(n, 0)

    this.gateSystem = new GateSystem()
    this.obstacleSystem = new ObstacleSystem()
    this.levelSystem = new LevelSystem()
    this.scoreSystem = new ScoreSystem()
    this.spawnSystem = new SpawnSystem()

    // ── Level callbacks ──────────────────────────────────────────────────
    this.levelSystem.onPhaseChange = (phase) => {
      this._updateSpawnIntervals()
      console.log(`[GameScreen] Phase → ${phase.phase}`)
    }

    this.levelSystem.onBossWallSpawn = (hp, maxHp) => {
      this.bossHp = hp
      this.bossHpMax = maxHp
      this._startBossPhase()
    }

    // ── Three.js renderer ────────────────────────────────────────────────
    this.three = new ThreeRenderer()
    const container = document.getElementById('game-container')!
    this.three.init(container, GAME_CONFIG.width, GAME_CONFIG.height)

    // ── PixiJS HUD ───────────────────────────────────────────────────────
    this._buildHUD()
    this._buildPauseOverlay()
    this._setupInput()

    // Trigger initial layout
    if (this.app?.screen) {
      this.resize(this.app.screen.width, this.app.screen.height)
    }

    // Initial crowd render
    this.three.setCrowdCount(this.crowd.count, this.crowd.getFormationPositions())
    this.crowdCounter.update(this.crowd.count, 0)

    // ── Spawn scheduling ─────────────────────────────────────────────────
    this._startSpawning()

    // ── Preview mode check ───────────────────────────────────────────────
    if (data?.preview) {
      this.isGameplayActive = false
      this.three.setViewport(0.4, 0.6) // Top 40% empty, bottom 60% game
      this.crowdCounter.visible = false
      this.scoreText.visible = false
    } else {
      this.isGameplayActive = true
      window.PokiSDK?.gameplayStart()
    }

    this.gameState = 'running'
  }

  public startGameplay(): void {
    if (this.isGameplayActive) return
    
    this.isGameplayActive = true
    this.three.setViewport(0, 1) // Full screen
    this.crowdCounter.visible = true
    this.scoreText.visible = true
    
    window.PokiSDK?.gameplayStart()
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    // Crowd counter — top centre
    this.crowdCounter = new CrowdCounter(0, 55)
    this.addChild(this.crowdCounter)

    // Score — top left
    const scoreStyle = new PIXI.TextStyle({ fontSize: 18, fill: '#ffffff', fontFamily: 'Arial', fontWeight: 'bold' })
    this.scoreText = new PIXI.Text({ text: 'Score: 0', style: scoreStyle })
    this.scoreText.position.set(12, 14)
    this.addChild(this.scoreText)

    // Mute icon — top right
    const muteStyle = new PIXI.TextStyle({ fontSize: 24 })
    this.muteBtn = new PIXI.Text({ text: AudioManager.muted ? '🔇' : '🔊', style: muteStyle })
    this.muteBtn.eventMode = 'static'
    this.muteBtn.cursor = 'pointer'
    this.muteBtn.on('pointerdown', () => {
      AudioManager.toggleMute()
      this.muteBtn.text = AudioManager.muted ? '🔇' : '🔊'
    })
    this.addChild(this.muteBtn)

    // Boss health bar — bottom centre, hidden until boss phase
    this.bossHealthBar = new BossHealthBar(0, 0, 300)
    this.addChild(this.bossHealthBar)
  }

  private _buildPauseOverlay(): void {
    this.pauseOverlay = new PIXI.Container()
    this.pauseOverlay.visible = false

    this.pauseDim = new PIXI.Graphics()
    this.pauseOverlay.addChild(this.pauseDim)

    const pStyle = new PIXI.TextStyle({ fontSize: 44, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Arial' })
    this.pauseHeader = new PIXI.Text({ text: 'PAUSED', style: pStyle })
    this.pauseHeader.anchor.set(0.5)
    this.pauseOverlay.addChild(this.pauseHeader)

    const rStyle = new PIXI.TextStyle({ fontSize: 18, fill: '#aaaacc', fontFamily: 'Arial' })
    this.pauseSub = new PIXI.Text({ text: 'Press Escape to resume', style: rStyle })
    this.pauseSub.anchor.set(0.5)
    this.pauseOverlay.addChild(this.pauseSub)

    this.addChild(this.pauseOverlay)
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private _setupInput(): void {
    // Pointer drag for steering
    const onPointerDown = (e: PointerEvent) => {
      this.pointerDown = true
      this.pointerStartX = e.clientX
      this.pointerDeltaX = 0
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!this.pointerDown) return
      this.pointerDeltaX = e.clientX - this.pointerStartX
      this.pointerStartX = e.clientX
    }
    const onPointerUp = () => {
      this.pointerDown = false
      this.pointerDeltaX = 0
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key] = true
      if (e.key === 'Escape') this._togglePause()
    }
    const onKeyUp = (e: KeyboardEvent) => { this.keys[e.key] = false }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Clean up on screen exit
    this.on('removed', () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    })
  }

  private _togglePause(): void {
    this.isPaused = !this.isPaused
    this.pauseOverlay.visible = this.isPaused
    this.isPaused ? this.spawnSystem.pause() : this.spawnSystem.resume()
  }

  // ─── Spawning ─────────────────────────────────────────────────────────────

  private _startSpawning(): void {
    const phase = this.levelSystem.currentPhaseConfig
    const gateIntervalMs = phase.gateIntervalSec.min * 1000

    this.gateSpawnEntry = this.spawnSystem.schedule(
      () => this._spawnGatePair(),
      gateIntervalMs,
      false
    )

    this.obstacleSpawnEntry = this.spawnSystem.schedule(
      () => this._spawnObstacle(),
      phase.obstacleIntervalSec * 1000,
      false
    )
  }

  private _updateSpawnIntervals(): void {
    const phase = this.levelSystem.currentPhaseConfig
    if (this.gateSpawnEntry) {
      this.gateSpawnEntry.intervalMs = phase.hasGates
        ? phase.gateIntervalSec.min * 1000
        : Infinity
    }
    if (this.obstacleSpawnEntry) {
      this.obstacleSpawnEntry.intervalMs = phase.obstacleIntervalSec * 1000
    }
  }

  private _spawnGatePair(): void {
    if (this.gameState !== 'running') return
    if (!this.levelSystem.currentPhaseConfig.hasGates) return

    const [left, right] = this.gateSystem.spawnPair(
      this.levelSystem.currentPhase,
      this.crowd.count,
      this.crowdWorldZ
    )

    this.three.addGate(left.id,  left.spec,  left.worldZ,  left.worldX)
    this.three.addGate(right.id, right.spec, right.worldZ, right.worldX)
  }

  private _spawnObstacle(): void {
    if (this.gameState !== 'running') return
    if (this.levelSystem.isBossPhase()) return

    const entity = this.obstacleSystem.spawn(this.crowdWorldZ)
    this.three.addObstacle(entity.id, entity.type, entity.worldZ, entity.worldX)
  }

  // ─── Boss phase ───────────────────────────────────────────────────────────

  private _startBossPhase(): void {
    this.gameState = 'boss'
    this.spawnSystem.pause()

    this.bossHp = this.bossHpMax
    this.bossHealthBar.update(this.bossHp, this.bossHpMax)
    this.bossHealthBar.show()

    const bossZ = this.crowdWorldZ - 50  // 50 units ahead
    this.three.showBossWall(this.bossHp, this.bossHpMax, bossZ)
  }

  // ─── Main update loop ─────────────────────────────────────────────────────

  update(deltaMs: number): void {
    if (this.gameState === 'gameover') return
    if (this.isPaused) return

    const dtSec = deltaMs / 1000

    // ── Level progression ──────────────────────────────────────────────────
    this.levelSystem.update(deltaMs)

    // ── Score: distance ───────────────────────────────────────────────────
    if (this.gameState === 'running') {
      const speed = this.levelSystem.trackSpeed
      const metersTravelled = speed * dtSec
      this.scoreSystem.add(Math.floor(metersTravelled * BALANCING.SCORE_PER_METER))
    }

    // ── World scroll (both running and boss approach) ─────────────────────
    const speed = this.levelSystem.trackSpeed
    this.crowdWorldZ -= speed * dtSec

    // ── Lateral steering ──────────────────────────────────────────────────
    this._updateSteering(dtSec)

    // ── Push crowd position to renderer ───────────────────────────────────
    this.three.setCrowdPosition(this.crowdWorldX, this.crowdWorldZ)
    this.three.setCrowdCount(this.crowd.count, this.crowd.getFormationPositions())

    // ── Gate collisions ───────────────────────────────────────────────────
    if (this.gameState === 'running' && this.isGameplayActive) {
      this._checkGates()
      this._cullEntities()
    } else if (this.gameState === 'running' && !this.isGameplayActive) {
      this._cullEntities() // Still cull so they don't pile up
    }

    // ── Obstacle collisions ───────────────────────────────────────────────
    if (this.gameState === 'running' && this.isGameplayActive) {
      this._checkObstacles()
    }

    // ── Boss damage ───────────────────────────────────────────────────────
    if (this.gameState === 'boss') {
      this._updateBoss(dtSec)
    }

    // ── Spawn tick ────────────────────────────────────────────────────────
    this.spawnSystem.tick(deltaMs)

    // ── Three.js render ───────────────────────────────────────────────────
    this.three.update(deltaMs)

    // ── HUD ───────────────────────────────────────────────────────────────
    this.crowdCounter.update(this.crowd.count, deltaMs)
    this.scoreText.text = `Score: ${this.scoreSystem.getScore().toLocaleString()}`
  }

  // ─── Steering ─────────────────────────────────────────────────────────────

  private _updateSteering(dtSec: number): void {
    if (!this.isGameplayActive) return

    const steerSpeed = BALANCING.CROWD_STEER_SPEED
    let dx = 0

    // Arrow keys / WASD
    if (this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A']) dx -= steerSpeed
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) dx += steerSpeed

    // Touch / mouse drag
    if (this.pointerDown && dx === 0) {
      // Map screen pixel delta to world units based on active dimension
      dx = (this.pointerDeltaX / window.innerWidth) * steerSpeed * 12
      this.pointerDeltaX = 0  // consume delta each frame
    }

    if (dx !== 0) {
      this.crowdWorldX = clamp(
        this.crowdWorldX + dx * dtSec,
        -BALANCING.TRACK_HALF_W,
        BALANCING.TRACK_HALF_W
      )
    }
  }

  // ─── Gate logic ───────────────────────────────────────────────────────────

  private _checkGates(): void {
    const hit = this.gateSystem.checkPassage(this.crowdWorldX, this.crowdWorldZ)
    if (!hit) return

    // Apply gate operation to crowd
    this.crowd.applyOp(hit.spec.op, hit.spec.value)

    // Visual + audio feedback
    this.three.flashGate(hit.id)
    this.three.removeGate(hit.id)
    AudioManager.playSfx(null, `gate_${hit.spec.op}`)

    // Score bonus for optimal choice
    if (hit.isOptimal) {
      this.scoreSystem.add(BALANCING.SCORE_OPTIMAL_GATE)
    }

    // Game over if crowd wiped out by gate (e.g. ÷ gate when already at 1)
    if (this.crowd.isDead()) {
      this._triggerGameOver()
    }
  }

  private _cullEntities(): void {
    // Gates scrolled past
    const culledGates = this.gateSystem.cullBehind(this.crowdWorldZ)
    for (const id of culledGates) this.three.removeGate(id)

    // Obstacles scrolled past
    const culledObs = this.obstacleSystem.cullBehind(this.crowdWorldZ)
    for (const id of culledObs) this.three.removeObstacle(id)
  }

  // ─── Obstacle logic ───────────────────────────────────────────────────────

  private _checkObstacles(): void {
    const hits = this.obstacleSystem.checkCollisions(
      this.crowdWorldX,
      this.crowdWorldZ,
      BALANCING.CROWD_COLLISION_RADIUS * Math.min(3, 1 + this.crowd.count * 0.05)
    )

    for (const obs of hits) {
      this.crowd.remove(BALANCING.OBSTACLE_DAMAGE)
      this.three.removeObstacle(obs.id)
      this.three.triggerShake()
      AudioManager.playSfx(null, 'obstacle_hit')

      if (this.crowd.isDead()) {
        this._triggerGameOver()
        return
      }
    }
  }

  // ─── Boss logic ───────────────────────────────────────────────────────────

  private _updateBoss(dtSec: number): void {
    // Crowd damages boss wall at rate: crowdCount × damagePerSec
    const damage = this.crowd.count * BALANCING.BOSS_DAMAGE_PER_CLONE_PER_SEC * dtSec
    this.bossHp -= damage

    if (this.bossHp <= 0) {
      this.bossHp = 0
      this._triggerVictory()
      return
    }

    this.bossHealthBar.update(this.bossHp, this.bossHpMax)
    this.three.updateBossWall(this.bossHp / this.bossHpMax)
  }

  // ─── Win / Lose ───────────────────────────────────────────────────────────

  private _triggerVictory(): void {
    if (this.gameState === 'gameover') return
    this.gameState = 'gameover'

    this.scoreSystem.add(BALANCING.SCORE_BOSS_DEFEAT)
    this.three.hideBossWall()
    AudioManager.playSfx(null, 'boss_defeat')
    LevelSystem.incrementRunNumber()

    this._goToResult({ victory: true })
  }

  private _triggerGameOver(): void {
    if (this.gameState === 'gameover') return
    this.gameState = 'gameover'

    this.spawnSystem.clear()
    AudioManager.playSfx(null, 'game_over')

    // Camera shake then transition
    this.three.triggerShake()
    window.PokiSDK?.gameplayStop()

    setTimeout(() => {
      this._goToResult({ victory: false })
    }, 700)
  }

  private _goToResult(opts: { victory: boolean }): void {
    this.screenManager.goTo('ResultScreen', {
      score: this.scoreSystem.getScore(),
      highScore: this.scoreSystem.getHighScore(),
      isNewHighScore: this.scoreSystem.isNewHighScore(),
      victory: opts.victory,
      crowdCount: this.crowd.count
    })
  }

  // ─── exit / cleanup ───────────────────────────────────────────────────────

  async exit(): Promise<void> {
    this.spawnSystem.clear()
    this.three.destroy()
    this.removeChildren()

    this.gateSystem.clear()
    this.obstacleSystem.clear()
  }

  resize(width: number, height: number): void {
    if (!this.crowdCounter) return

    const cx = width / 2
    const cy = height / 2

    // Propagate dimension changes to 3D renderer buffer
    if (this.three) {
      this.three.resize(width, height)
    }

    // Positioning
    this.crowdCounter.position.set(cx, 55)
    this.muteBtn.position.set(width - 44, 12)
    this.bossHealthBar.position.set(cx, height - 70)

    // Redraw Pause Overlay Background
    this.pauseDim.clear()
    this.pauseDim.rect(0, 0, width, height)
    this.pauseDim.fill({ color: 0x000000, alpha: 0.65 })

    this.pauseHeader.position.set(cx, cy - 30)
    this.pauseSub.position.set(cx, cy + 30)
  }
}
