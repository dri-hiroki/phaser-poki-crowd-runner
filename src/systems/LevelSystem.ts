/**
 * LevelSystem.ts
 * Tracks run time, transitions between phases (early/mid/late/boss),
 * and fires callbacks for key game events.
 */

import { BALANCING } from '../data/balancing'
import { SaveManager, SAVE_KEYS } from '../core/SaveManager'

export class LevelSystem {
  private _elapsedMs: number = 0
  private _bossTriggered: boolean = false
  private _currentLevel: number = 1

  /** Boss wall HP for this run */
  readonly bossHpMax: number

  // ─── Callbacks ────────────────────────────────────────────────────────────

  onBossWallSpawn?: (hp: number, maxHp: number) => void

  constructor(level: number) {
    this._currentLevel = level
    // Scale boss HP by level
    this.bossHpMax = BALANCING.BOSS_BASE_HP + BALANCING.BOSS_HP_PER_RUN * level
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(deltaMs: number): void {
    this._elapsedMs += deltaMs
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get currentLevel(): number { return this._currentLevel }

  get elapsedSec(): number { return this._elapsedMs / 1000 }

  get trackSpeed(): number {
    // Base speed increases with level
    const baseSpeed = Math.min(15, BALANCING.TRACK_SPEED_BASE + (this._currentLevel * 0.5))
    // Speed increases over time within the level (e.g., +1 unit/sec every 5 seconds)
    const timeBonus = Math.min(6, this._elapsedMs / 5000)
    
    return baseSpeed + timeBonus
  }

  isBossPhase(): boolean { return this._bossTriggered }
  triggerBoss(): void {
    if (!this._bossTriggered) {
      this._bossTriggered = true
      this.onBossWallSpawn?.(this.bossHpMax, this.bossHpMax)
    }
  }

  // ─── Run number persistence ────────────────────────────────────────────────

  /** Call this when the run ends to increment the run counter. */
  static incrementRunNumber(): void {
    const n = SaveManager.load<number>(SAVE_KEYS.runNumber, 0)
    SaveManager.save(SAVE_KEYS.runNumber, n + 1)
  }

  reset(level: number): void {
    this._elapsedMs = 0
    this._currentLevel = level
    this._bossTriggered = false
  }
}
