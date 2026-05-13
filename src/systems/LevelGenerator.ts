import { PRNG } from '../utils/prng'
import { CHUNKS, ChunkDef } from '../data/chunks'
import type { ThreeRenderer } from '../core/ThreeRenderer'
import type { GateSystem } from './GateSystem'
import type { ObstacleSystem } from './ObstacleSystem'


export interface PendingEntity {
  id: string
  type: 'gatePair' | 'obstacle' | 'collectible'
  worldZ: number
  worldX: number
  obstacleType?: 'rock' | 'blade' | 'wall'
}

export class LevelGenerator {
  private pendingEntities: PendingEntity[] = []
  private prng: PRNG
  
  public levelLength: number = 0
  public isBossLevel: boolean = false
  public finishZ: number = 0
  
  // Track active collectibles to cull them
  private activeCollectibles: Array<{ id: string; worldZ: number; worldX: number }> = []
  private entityCounter = 0

  constructor(level: number, seed: string) {
    this.prng = new PRNG(seed)
    // Every 4th level is a boss level
    this.isBossLevel = (level % 4 === 0)
    this.generateLayout(level)
  }

  private generateLayout(level: number) {
    // A level is roughly ~30 seconds of running.
    // Speed ramps up with level. Base speed is 8 units/sec.
    // So 30 * 8 = 240 units long approximately.
    const targetLength = 240 + (level * 10)
    
    let currentZ = -10 // Start spawning a bit ahead of 0
    let accumulatedLength = 0

    // Always start with intro
    this.appendChunk(CHUNKS.find(c => c.id === 'intro_safe')!, currentZ)
    currentZ -= 30
    accumulatedLength += 30

    // Build middle chunks
    while (accumulatedLength < targetLength) {
      // Filter chunks based on difficulty progression
      const maxDiff = Math.min(10, 2 + level)
      const validChunks = CHUNKS.filter(c => c.id !== 'intro_safe' && c.difficulty <= maxDiff)
      
      // Fallback in case validChunks is empty (shouldn't happen, but good practice)
      const chunkPool = validChunks.length > 0 ? validChunks : CHUNKS
      const chunk = this.prng.pick(chunkPool)
      this.appendChunk(chunk, currentZ)
      
      currentZ -= chunk.length
      accumulatedLength += chunk.length
    }

    this.levelLength = Math.abs(currentZ)
    this.finishZ = currentZ - 20

    // Sort descending since we run towards negative Z, so highest Z comes first
    this.pendingEntities.sort((a, b) => b.worldZ - a.worldZ)
  }

  private appendChunk(chunk: ChunkDef, startZ: number) {
    const flipX = this.prng.random() > 0.5 ? -1 : 1

    for (const ent of chunk.entities) {
      // Procedural variation: slightly jiggle positions
      const jiggleZ = this.prng.range(-1, 1)
      const worldZ = startZ - ent.zOffset + jiggleZ
      
      let worldX = (ent.x ?? 0) * flipX

      if (ent.type === 'collectible') {
        // Only wobble if there are no obstacles at this zOffset to prevent clipping
        const hasObstacleNear = chunk.entities.some(e => 
          e.type === 'obstacle' && Math.abs(e.zOffset - ent.zOffset) <= 2
        )
        
        if (!hasObstacleNear) {
          // Procedural wobble to make them less predictably linear
          const wobble = Math.sin(worldZ * 0.5) * 1.8
          worldX += wobble
        } else {
          // Just a tiny safe jiggle
          worldX += this.prng.range(-0.2, 0.2)
        }

        // Clamp to track bounds
        worldX = Math.max(-2.5, Math.min(2.5, worldX))
      }
      
      const id = `ent_${this.entityCounter++}_${ent.type}`
      
      this.pendingEntities.push({
        id,
        type: ent.type,
        worldZ,
        worldX,
        obstacleType: ent.obstacleType
      })
    }
  }

  public update(
    crowdZ: number, 
    crowdCount: number, 
    crowdX: number,
    gateSystem: GateSystem, 
    obsSystem: ObstacleSystem, 
    three: ThreeRenderer,
    onCollect: () => void
  ) {
    const SPAWN_DISTANCE = 80 // Spawn things 80 units ahead of camera

    // 1. Spawn entities that come into range
    while (this.pendingEntities.length > 0 && this.pendingEntities[0].worldZ > crowdZ - SPAWN_DISTANCE) {
      const ent = this.pendingEntities.shift()!

      if (ent.type === 'gatePair') {
        // Evaluate gate math based on current crowd count
        // For simplicity, we just pass phase 'mid' since we removed phase logic,
        // or we can update GateSystem to not need a phase.
        const [left, right] = gateSystem.spawnPair('mid', crowdCount, ent.worldZ)
        three.addGate(left.id, left.spec, left.worldZ, left.worldX)
        three.addGate(right.id, right.spec, right.worldZ, right.worldX)
      } 
      else if (ent.type === 'obstacle') {
        const obsEnt = obsSystem.spawnAt(ent.worldZ, ent.worldX, ent.obstacleType!)
        three.addObstacle(obsEnt.id, obsEnt.type, obsEnt.worldZ, obsEnt.worldX)
      }
      else if (ent.type === 'collectible') {
        three.addCollectible(ent.id, ent.worldZ, ent.worldX)
        this.activeCollectibles.push(ent)
      }
    }

    // 2. Check collisions with collectibles
    const hitRadius = crowdCount > 0 ? Math.max(0.4, 0.35 + Math.sqrt(crowdCount) * 0.12) : 0.4
    for (let i = this.activeCollectibles.length - 1; i >= 0; i--) {
      const c = this.activeCollectibles[i]
      
      // Missed
      if (c.worldZ > crowdZ + 5) {
        three.removeCollectible(c.id)
        this.activeCollectibles.splice(i, 1)
        continue
      }
      
      // Collision check
      const dz = c.worldZ - crowdZ
      const dx = c.worldX - crowdX
      const distSq = dx*dx + dz*dz
      
      if (distSq < hitRadius * hitRadius) {
        // Collected
        three.removeCollectible(c.id)
        this.activeCollectibles.splice(i, 1)
        onCollect()
      }
    }
  }

  public cullBehind(_crowdZ: number, _three: ThreeRenderer) {
    // Handled mainly by GameScreen calling GateSystem/ObstacleSystem culling,
    // but we handle collectibles here
  }
}
