/**
 * CrowdSystem.ts
 * Manages the crowd count and computes formation positions for Three.js rendering.
 *
 * Formation layout:
 *  1–5    : single row
 *  6–20   : single ring
 *  21–100 : concentric rings (3–5)
 *  101–999: dense jitter blob
 */

import { BALANCING } from '../data/balancing'
import { clamp } from '../utils/helpers'
import type { GateOp } from '../utils/mathGate'
import { applyGateOp } from '../utils/mathGate'

export interface FormationPos {
  x: number
  z: number
}

export class CrowdSystem {
  private _count: number = 1
  private _positions: FormationPos[] = []
  private _dirty: boolean = true

  /** Callback fired whenever count changes. */
  onCountChange?: (count: number) => void

  constructor(initialCount: number = 1) {
    this._count = clamp(initialCount, BALANCING.CROWD_CAPS.min, BALANCING.CROWD_CAPS.max)
    this._dirty = true
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  applyOp(op: GateOp, value: number): void {
    const next = applyGateOp(this._count, op, value)
    this._setCount(next)
  }

  add(n: number): void      { this._setCount(this._count + n) }
  remove(n: number): void   { this._setCount(this._count - n) }
  multiply(n: number): void { this._setCount(this._count * n) }
  divide(n: number): void   { this._setCount(Math.floor(this._count / n)) }

  private _setCount(next: number): void {
    const clamped = clamp(Math.floor(next), BALANCING.CROWD_CAPS.min, BALANCING.CROWD_CAPS.max)
    if (clamped !== this._count) {
      this._count = clamped
      this._dirty = true
      this.onCountChange?.(clamped)
    }
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get count(): number { return this._count }

  getVisualRadius(): number {
    return Math.max(0.4, 0.35 + Math.sqrt(this._count) * 0.12)
  }

  isDead(): boolean { return this._count <= 0 }

  // ─── Formation ────────────────────────────────────────────────────────────

  /**
   * Returns formation positions (offsets from crowd centre) for all clones.
   * Result is cached and only recomputed when count changes.
   */
  getFormationPositions(): FormationPos[] {
    if (!this._dirty) return this._positions
    this._positions = computeFormation(this._count)
    this._dirty = false
    return this._positions
  }
}

// ─── Formation helpers ────────────────────────────────────────────────────────

function computeFormation(count: number): FormationPos[] {
  if (count <= 5) {
    return singleRow(count)
  } else if (count <= 20) {
    return singleRing(count)
  } else if (count <= 100) {
    return concentricRings(count)
  } else {
    return denseBlob(count)
  }
}

function singleRow(count: number): FormationPos[] {
  const spacing = 0.45
  const halfW = ((count - 1) * spacing) / 2
  return Array.from({ length: count }, (_, i) => ({
    x: i * spacing - halfW,
    z: 0
  }))
}

function singleRing(count: number): FormationPos[] {
  const radius = 0.25 + count * 0.06
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    }
  })
}

function concentricRings(count: number): FormationPos[] {
  const positions: FormationPos[] = []
  // Centre clone
  positions.push({ x: 0, z: 0 })

  const ringCapacities = [8, 14, 22, 32]
  const ringRadii      = [0.6, 1.1, 1.65, 2.2]
  let remaining = count - 1

  for (let r = 0; r < ringCapacities.length && remaining > 0; r++) {
    const cap = Math.min(ringCapacities[r], remaining)
    const radius = ringRadii[r]
    for (let i = 0; i < cap; i++) {
      const angle = (i / cap) * Math.PI * 2
      positions.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius
      })
    }
    remaining -= cap
  }

  return positions
}

function denseBlob(count: number): FormationPos[] {
  const positions: FormationPos[] = []
  // Deterministic pseudo-random jitter using index as seed
  const baseRadius = 0.35 + Math.sqrt(count) * 0.12

  for (let i = 0; i < count; i++) {
    // Simple spiral with jitter
    const angle  = i * 2.4     // golden angle approximation
    const radius = Math.sqrt(i / count) * baseRadius
    const jitterX = (Math.sin(i * 127.1) * 0.5 + Math.sin(i * 311.7) * 0.5) * 0.12
    const jitterZ = (Math.cos(i * 74.3)  * 0.5 + Math.cos(i * 431.9) * 0.5) * 0.12
    positions.push({
      x: Math.cos(angle) * radius + jitterX,
      z: Math.sin(angle) * radius + jitterZ
    })
  }

  return positions
}
