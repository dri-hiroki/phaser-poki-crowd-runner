/**
 * GateSystem.ts
 * Manages math gate entities: spawning, collision, and operation application.
 *
 * Each gate pair is two GateEntity objects spawned at the same worldZ,
 * one at GATE_LANE_X.left and one at GATE_LANE_X.right.
 */

import { BALANCING } from '../data/balancing'
import { generateGatePair, isBetterGate } from '../utils/mathGate'
import type { GateSpec } from '../utils/mathGate'
import type { Phase } from '../data/levels'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GateEntity {
  id: string
  spec: GateSpec
  worldZ: number
  worldX: number
  passed: boolean
  /** True if this gate is the better choice of its pair */
  isOptimal: boolean
}

// ─── System ──────────────────────────────────────────────────────────────────

export class GateSystem {
  private entities: GateEntity[] = []
  private nextId: number = 0

  // ─── Spawn ──────────────────────────────────────────────────────────────

  /**
   * Spawn a gate pair ahead of the camera.
   * Returns the two entities so caller can pass them to ThreeRenderer.addGate().
   */
  spawnPair(phase: Phase, crowdCount: number, worldZ: number): [GateEntity, GateEntity] {
    const [specLeft, specRight] = generateGatePair(phase, crowdCount)

    const leftBetter  = isBetterGate(specLeft,  specRight, crowdCount)
    const rightBetter = isBetterGate(specRight, specLeft,  crowdCount)

    const leftId  = `gate_${this.nextId++}`
    const rightId = `gate_${this.nextId++}`

    const leftEntity: GateEntity = {
      id: leftId,
      spec: specLeft,
      worldZ,
      worldX: BALANCING.GATE_LANE_X.left,
      passed: false,
      isOptimal: leftBetter
    }

    const rightEntity: GateEntity = {
      id: rightId,
      spec: specRight,
      worldZ,
      worldX: BALANCING.GATE_LANE_X.right,
      passed: false,
      isOptimal: rightBetter
    }

    this.entities.push(leftEntity, rightEntity)
    return [leftEntity, rightEntity]
  }

  // ─── Collision ──────────────────────────────────────────────────────────

  /**
   * Check if the crowd has passed through any gate.
   * Returns the gate entity that was hit (if any), or null.
   * When a gate is hit, its pair partner is also marked passed.
   */
  checkPassage(
    crowdX: number,
    crowdZ: number
  ): GateEntity | null {
    const hw = BALANCING.GATE_HIT_HALF_WIDTH
    const hd = BALANCING.GATE_HIT_DEPTH

    for (const entity of this.entities) {
      if (entity.passed) continue

      const overlapX = Math.abs(crowdX - entity.worldX) < hw
      const overlapZ = Math.abs(crowdZ - entity.worldZ) < hd

      if (overlapX && overlapZ) {
        entity.passed = true
        // Mark the partner gate (same worldZ, different lane) as passed too
        this._markPartnerPassed(entity)
        return entity
      }
    }
    return null
  }

  private _markPartnerPassed(hit: GateEntity): void {
    for (const e of this.entities) {
      if (!e.passed && e.worldZ === hit.worldZ && e.id !== hit.id) {
        e.passed = true
      }
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  /**
   * Remove gates that have scrolled past the camera.
   * Returns their ids so caller can clean up ThreeRenderer.
   */
  cullBehind(cameraZ: number): string[] {
    const culled: string[] = []
    this.entities = this.entities.filter(e => {
      if (e.worldZ > cameraZ + 8) {
        culled.push(e.id)
        return false
      }
      return true
    })
    return culled
  }

  getActive(): GateEntity[] {
    return this.entities.filter(e => !e.passed)
  }

  clear(): void {
    this.entities = []
  }
}
