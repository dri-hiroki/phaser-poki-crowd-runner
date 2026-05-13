export type EntityType = 'gatePair' | 'obstacle' | 'collectible'

export interface ChunkEntity {
  type: EntityType
  zOffset: number // Distance from chunk start
  x?: number // Lateral position (e.g., -2 or 2). Not needed for gatePair.
  obstacleType?: 'rock' | 'blade' | 'wall'
}

export interface ChunkDef {
  id: string
  length: number
  difficulty: number // 1 to 10
  entities: ChunkEntity[]
}

export const CHUNKS: ChunkDef[] = [
  {
    id: 'intro_safe',
    length: 30,
    difficulty: 1,
    entities: [
      { type: 'collectible', zOffset: 10, x: 0 },
      { type: 'collectible', zOffset: 12, x: 0 },
      { type: 'collectible', zOffset: 14, x: 0 },
      { type: 'gatePair', zOffset: 25 }
    ]
  },
  {
    id: 'narrow_corridor',
    length: 40,
    difficulty: 3,
    entities: [
      { type: 'obstacle', obstacleType: 'wall', zOffset: 10, x: -2 },
      { type: 'obstacle', obstacleType: 'wall', zOffset: 10, x: 2 },
      { type: 'collectible', zOffset: 10, x: 0 },
      { type: 'obstacle', obstacleType: 'wall', zOffset: 25, x: -2 },
      { type: 'obstacle', obstacleType: 'wall', zOffset: 25, x: 2 },
      { type: 'collectible', zOffset: 25, x: 0 },
      { type: 'gatePair', zOffset: 35 }
    ]
  },
  {
    id: 'zig_zag',
    length: 50,
    difficulty: 5,
    entities: [
      { type: 'obstacle', obstacleType: 'rock', zOffset: 10, x: -2 },
      { type: 'collectible', zOffset: 10, x: 2 },
      { type: 'obstacle', obstacleType: 'rock', zOffset: 25, x: 2 },
      { type: 'collectible', zOffset: 25, x: -2 },
      { type: 'obstacle', obstacleType: 'rock', zOffset: 40, x: -2 },
      { type: 'collectible', zOffset: 40, x: 2 },
    ]
  },
  {
    id: 'gate_spam',
    length: 40,
    difficulty: 4,
    entities: [
      { type: 'gatePair', zOffset: 10 },
      { type: 'gatePair', zOffset: 20 },
      { type: 'gatePair', zOffset: 30 },
    ]
  },
  {
    id: 'blade_runner',
    length: 60,
    difficulty: 7,
    entities: [
      { type: 'obstacle', obstacleType: 'blade', zOffset: 15, x: 0 },
      { type: 'obstacle', obstacleType: 'blade', zOffset: 30, x: -2 },
      { type: 'obstacle', obstacleType: 'blade', zOffset: 30, x: 2 },
      { type: 'gatePair', zOffset: 45 },
      { type: 'obstacle', obstacleType: 'blade', zOffset: 55, x: 0 },
    ]
  },
  {
    id: 'breathing_zone',
    length: 30,
    difficulty: 1,
    entities: [
      { type: 'collectible', zOffset: 5, x: -2 },
      { type: 'collectible', zOffset: 10, x: -1 },
      { type: 'collectible', zOffset: 15, x: 0 },
      { type: 'collectible', zOffset: 20, x: 1 },
      { type: 'collectible', zOffset: 25, x: 2 },
    ]
  }
]
