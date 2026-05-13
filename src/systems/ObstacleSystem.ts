/**
 * ObstacleSystem.ts
 * Spawns obstacles, tracks active entities, detects AABB collision vs crowd.
 * Fully wired in M5.
 */

import { randomFloat, randomInt } from '../utils/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ObstacleType = 'rock' | 'blade' | 'wall'

export interface ObstacleEntity {
  id: string
  type: ObstacleType
  worldZ: number
  worldX: number
  active: boolean
}

// ─── System ──────────────────────────────────────────────────────────────────

export class ObstacleSystem {
  private entities: ObstacleEntity[] = []
  private nextId: number = 0

  // ─── Spawn ──────────────────────────────────────────────────────────────

  /**
   * Spawn an obstacle ahead of the camera.
   * @param cameraZ current world Z of camera
   * @returns the new entity (so caller can pass id to ThreeRenderer.addObstacle)
   */
  spawn(cameraZ: number): ObstacleEntity {
    const types: ObstacleType[] = ['rock', 'rock', 'blade', 'wall']
    const type = types[randomInt(0, types.length - 1)]

    // Rocks & blades placed at a random X within track, walls centred
    let worldX: number
    if (type === 'wall') {
      // Wall has a gap — place two halves; here we place the blocking section offset
      worldX = randomFloat(-1.5, 1.5)
    } else {
      worldX = randomFloat(-2.5, 2.5)
    }

    return this.spawnAt(cameraZ - 40, worldX, type)
  }

  spawnAt(worldZ: number, worldX: number, type: ObstacleType): ObstacleEntity {
    const entity: ObstacleEntity = {
      id: `obs_${this.nextId++}`,
      type,
      worldZ,
      worldX,
      active: true
    }

    this.entities.push(entity)
    return entity
  }

  // ─── Collision ──────────────────────────────────────────────────────────

  /**
   * Returns all obstacles that collide with the crowd bounding box.
   * Crowd bounding box: centred at (crowdX, crowdZ), radius crowdRadius.
   */
  checkCollisions(
    crowdX: number,
    crowdZ: number,
    crowdRadius: number
  ): ObstacleEntity[] {
    const hit: ObstacleEntity[] = []

    for (const entity of this.entities) {
      if (!entity.active) continue

      let obstacleHalfW = 0.6 // rock
      if (entity.type === 'wall') obstacleHalfW = 1.25
      if (entity.type === 'blade') obstacleHalfW = 1.1
      const obstacleHalfD = 0.5

      const overlapX = Math.abs(crowdX - entity.worldX) < (crowdRadius + obstacleHalfW)
      const overlapZ = Math.abs(crowdZ - entity.worldZ) < (crowdRadius + obstacleHalfD)

      if (overlapX && overlapZ) {
        hit.push(entity)
        entity.active = false
      }
    }

    return hit
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  /**
   * Remove entities that have passed behind the camera (no longer relevant).
   * Returns ids of removed entities so caller can clean up ThreeRenderer.
   */
  cullBehind(cameraZ: number): string[] {
    const culled: string[] = []
    this.entities = this.entities.filter(e => {
      if (e.worldZ > cameraZ + 10) {
        culled.push(e.id)
        return false
      }
      return true
    })
    return culled
  }

  getActive(): ObstacleEntity[] {
    return this.entities.filter(e => e.active)
  }

  clear(): void {
    this.entities = []
  }
}
