/**
 * LevelSystem.ts
 * Tracks run time, transitions between phases (early/mid/late/boss),
 * and fires callbacks for key game events.
 */

import { BALANCING } from '../data/balancing'
import { getPhaseAt } from '../data/levels'
import type { Phase, PhaseConfig } from '../data/levels'
import { SaveManager, SAVE_KEYS } from '../core/SaveManager'

export class LevelSystem {
  private _elapsedMs: number = 0
  private _currentPhase: Phase = 'early'
  private _bossTriggered: boolean = false

  /** Boss wall HP for this run */
  readonly bossHpMax: number

  // ─── Callbacks ────────────────────────────────────────────────────────────

  onPhaseChange?: (phase: PhaseConfig) => void
  onBossWallSpawn?: (hp: number, maxHp: number) => void

  constructor() {
    const runNumber = SaveManager.load<number>(SAVE_KEYS.runNumber, 0)
    this.bossHpMax = BALANCING.BOSS_BASE_HP + BALANCING.BOSS_HP_PER_RUN * runNumber
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(deltaMs: number): void {
    this._elapsedMs += deltaMs

    const elapsedSec = this._elapsedMs / 1000
    const newPhase = getPhaseAt(elapsedSec)

    if (newPhase.phase !== this._currentPhase) {
      this._currentPhase = newPhase.phase
      this.onPhaseChange?.(newPhase)

      if (newPhase.phase === 'boss' && !this._bossTriggered) {
        this._bossTriggered = true
        this.onBossWallSpawn?.(this.bossHpMax, this.bossHpMax)
      }
    }
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get currentPhase(): Phase { return this._currentPhase }

  get currentPhaseConfig(): PhaseConfig {
    return getPhaseAt(this._elapsedMs / 1000)
  }

  get elapsedSec(): number { return this._elapsedMs / 1000 }

  get trackSpeed(): number {
    return BALANCING.TRACK_SPEED_BASE * BALANCING.SPEED_RAMP[this._currentPhase]
  }

  isBossPhase(): boolean { return this._currentPhase === 'boss' }

  // ─── Run number persistence ────────────────────────────────────────────────

  /** Call this when the run ends to increment the run counter. */
  static incrementRunNumber(): void {
    const n = SaveManager.load<number>(SAVE_KEYS.runNumber, 0)
    SaveManager.save(SAVE_KEYS.runNumber, n + 1)
  }

  reset(): void {
    this._elapsedMs = 0
    this._currentPhase = 'early'
    this._bossTriggered = false
  }
}
