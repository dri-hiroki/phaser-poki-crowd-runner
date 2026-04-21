/**
 * mathGate.ts
 * Pure math functions for gate operations.
 * No dependencies — safe to unit test headlessly.
 *
 * Milestones:
 *  M1 – applyGateOp, isBetterGate, generateGatePair (+/-)
 *  M7 – full × and ÷ pairing with phase distribution
 */

import type { Phase } from '../data/levels'
import { BALANCING } from '../data/balancing'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GateOp = 'add' | 'sub' | 'mul' | 'div'

export interface GateSpec {
  op: GateOp
  value: number
}

// ─── Core operation ──────────────────────────────────────────────────────────

/**
 * Apply a gate operation to the current crowd count.
 * Result is clamped to [CROWD_CAPS.min, CROWD_CAPS.max].
 */
export function applyGateOp(count: number, op: GateOp, value: number): number {
  const { min, max } = BALANCING.CROWD_CAPS
  let result: number

  switch (op) {
    case 'add': result = count + value; break
    case 'sub': result = count - value; break
    case 'mul': result = count * value; break
    case 'div': result = Math.floor(count / value); break
    default:    result = count
  }

  return Math.max(min, Math.min(max, result))
}

/**
 * Compute the result of applying a GateSpec to a count.
 */
export function applySpec(count: number, spec: GateSpec): number {
  return applyGateOp(count, spec.op, spec.value)
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Returns true if specA yields a strictly better (larger) result than specB
 * for the given count, by at least `minDiffFraction` (default 10%).
 */
export function isBetterGate(
  specA: GateSpec,
  specB: GateSpec,
  count: number,
  minDiffFraction: number = 0.10
): boolean {
  const resultA = applySpec(count, specA)
  const resultB = applySpec(count, specB)
  const base = Math.max(resultA, resultB)
  if (base === 0) return false
  return (resultA - resultB) / base > minDiffFraction
}

// ─── Gate value ranges ────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomGateValue(op: GateOp): number {
  const ranges = BALANCING.GATE_CONFIG.valueRanges
  const [lo, hi] = ranges[op]
  return randomInt(lo, hi)
}

// Phase distribution table
function pickOpByPhase(phase: Phase): GateOp {
  const dist = BALANCING.GATE_CONFIG.pairDistributionByPhase[phase]
  const roll = Math.random()
  let acc = 0
  for (const [op, weight] of Object.entries(dist) as [GateOp, number][]) {
    acc += weight
    if (roll < acc) return op
  }
  return 'add'
}

// ─── Gate pair generation ────────────────────────────────────────────────────

/**
 * Generate a balanced gate pair: one gate is always objectively better
 * than the other by > 10% for the given crowd count.
 * Retries up to 10 times then falls back to +N vs -N.
 */
export function generateGatePair(
  phase: Phase,
  currentCount: number
): [GateSpec, GateSpec] {
  for (let attempt = 0; attempt < 10; attempt++) {
    const opA = pickOpByPhase(phase)
    const opB = pickOpByPhase(phase)
    const specA: GateSpec = { op: opA, value: randomGateValue(opA) }
    const specB: GateSpec = { op: opB, value: randomGateValue(opB) }

    if (isBetterGate(specA, specB, currentCount) || isBetterGate(specB, specA, currentCount)) {
      // Randomly swap so the better gate isn't always on the same side
      return Math.random() < 0.5 ? [specA, specB] : [specB, specA]
    }
  }

  // Fallback: guaranteed +N vs -N
  const addVal = randomInt(
    BALANCING.GATE_CONFIG.valueRanges.add[0],
    BALANCING.GATE_CONFIG.valueRanges.add[1]
  )
  const subVal = randomInt(
    BALANCING.GATE_CONFIG.valueRanges.sub[0],
    BALANCING.GATE_CONFIG.valueRanges.sub[1]
  )
  const fallbackA: GateSpec = { op: 'add', value: addVal }
  const fallbackB: GateSpec = { op: 'sub', value: subVal }
  return Math.random() < 0.5 ? [fallbackA, fallbackB] : [fallbackB, fallbackA]
}

// ─── Dev self-tests ──────────────────────────────────────────────────────────

export function runMathGateSelfTests(): void {
  const pass = (label: string, cond: boolean) => {
    if (!cond) console.error(`[mathGate] FAIL: ${label}`)
    else console.log(`[mathGate] OK: ${label}`)
  }

  pass('add 10+5=15',         applyGateOp(10, 'add', 5)  === 15)
  pass('sub clamp to min',    applyGateOp(1,  'sub', 5)  === 1)
  pass('add clamp to max',    applyGateOp(999,'add', 5)  === 999)
  pass('div floor 10÷3=3',   applyGateOp(10, 'div', 3)  === 3)
  pass('mul 10×3=30',        applyGateOp(10, 'mul', 3)  === 30)
  pass('sub 10-5=5',          applyGateOp(10, 'sub', 5)  === 5)
  pass('+5 better than -5',   isBetterGate({op:'add',value:5},{op:'sub',value:5},10))
  console.log('[mathGate] self-tests complete')
}
