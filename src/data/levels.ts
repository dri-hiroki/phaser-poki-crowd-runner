/**
 * levels.ts
 * Phase definitions for the cluster run.
 *
 * Phases run on elapsed time:
 *   early  0–20s  — gentle, + gates dominant
 *   mid   20–45s  — × and ÷ more frequent, faster
 *   late  45–60s  — traps, double obstacles, fastest
 *   boss  60s+    — no gates, boss wall fight
 */

export type Phase = 'early' | 'mid' | 'late' | 'boss'

export interface PhaseConfig {
  phase: Phase
  /** Inclusive start time in seconds */
  startSec: number
  /** Exclusive end time in seconds (Infinity for boss) */
  endSec: number
  /** Track speed multiplier relative to BALANCING.TRACK_SPEED_BASE */
  speedMultiplier: number
  /** Gate spawn interval range in seconds */
  gateIntervalSec: { min: number; max: number }
  /** Obstacle spawn interval in seconds */
  obstacleIntervalSec: number
  /** Whether gates are spawned in this phase */
  hasGates: boolean
}

export const PHASES: PhaseConfig[] = [
  {
    phase: 'early',
    startSec: 0,
    endSec: 20,
    speedMultiplier: 1.0,
    gateIntervalSec: { min: 5, max: 8 },
    obstacleIntervalSec: 4,
    hasGates: true
  },
  {
    phase: 'mid',
    startSec: 20,
    endSec: 45,
    speedMultiplier: 1.25,
    gateIntervalSec: { min: 4, max: 6 },
    obstacleIntervalSec: 3,
    hasGates: true
  },
  {
    phase: 'late',
    startSec: 45,
    endSec: 60,
    speedMultiplier: 1.5,
    gateIntervalSec: { min: 3, max: 4 },
    obstacleIntervalSec: 2,
    hasGates: true
  },
  {
    phase: 'boss',
    startSec: 60,
    endSec: Infinity,
    speedMultiplier: 1.5,
    gateIntervalSec: { min: Infinity, max: Infinity },
    obstacleIntervalSec: Infinity,
    hasGates: false
  }
]

/**
 * Returns the PhaseConfig active at the given elapsed time.
 */
export function getPhaseAt(elapsedSec: number): PhaseConfig {
  for (const phase of PHASES) {
    if (elapsedSec >= phase.startSec && elapsedSec < phase.endSec) {
      return phase
    }
  }
  return PHASES[PHASES.length - 1]  // boss as fallback
}
