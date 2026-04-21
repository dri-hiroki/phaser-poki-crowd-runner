/**
 * balancing.ts
 * All tunable gameplay numbers in one place.
 * Adjust here without touching system or scene code.
 *
 * Contains both the original starter values (kept for compatibility)
 * and the Crowd Runner 3D additions.
 */

export const BALANCING = {
  // ─── Spawning ────────────────────────────────────────────────────────────
  /** Time between spawns at game start, in milliseconds */
  initialSpawnInterval: 2000,

  /** Minimum spawn interval — difficulty won't go below this */
  minSpawnInterval: 500,

  // ─── Difficulty ───────────────────────────────────────────────────────────
  /**
   * Time in milliseconds over which difficulty ramps from 1.0 to maxDifficultyMultiplier.
   */
  difficultyRampTime: 60_000,

  /** Maximum difficulty multiplier reached after difficultyRampTime has elapsed */
  maxDifficultyMultiplier: 3.0,

  // ─── Scoring ──────────────────────────────────────────────────────────────
  /** Points awarded per scoring event */
  pointsPerEvent: 10,

  /** Score multiplier applied on consecutive events without failure */
  comboMultiplier: 1.5,

  /** Number of consecutive events required to activate the combo multiplier */
  comboThreshold: 5,

  // ─── Player ───────────────────────────────────────────────────────────────
  /** Number of lives the player starts with */
  startingLives: 3,

  /** Player movement speed in pixels/second (legacy; 3D uses CROWD_STEER_SPEED) */
  playerSpeed: 300,

  // ─── UI Timings ───────────────────────────────────────────────────────────
  /** Duration of scene transition fades, in milliseconds */
  sceneFadeDuration: 300,

  /** Delay before transitioning from BootScene to PreloadScene */
  bootDelay: 100,

  // =========================================================================
  // ─── Crowd Runner 3D ─────────────────────────────────────────────────────
  // =========================================================================

  /** Crowd count hard limits */
  CROWD_CAPS: { min: 1, max: 999 } as const,

  /** Base track scroll speed in Three.js world units per second */
  TRACK_SPEED_BASE: 8,

  /** Per-phase speed multipliers (applied on top of TRACK_SPEED_BASE) */
  SPEED_RAMP: {
    early: 1.0,
    mid:   1.25,
    late:  1.5,
    boss:  1.5
  } as const,

  /** Lateral steering speed for the crowd group (world units/sec) */
  CROWD_STEER_SPEED: 6,

  /** Track half-width boundary: crowd X is clamped to [-TRACK_HALF_W, +TRACK_HALF_W] */
  TRACK_HALF_W: 3.0,

  /** Crowd formation bounding radius for collision detection */
  CROWD_COLLISION_RADIUS: 0.6,

  /** Clones removed per obstacle hit */
  OBSTACLE_DAMAGE: 1,

  /** Boss wall HP formula: base + perRun × runNumber */
  BOSS_BASE_HP: 50,
  BOSS_HP_PER_RUN: 30,

  /** Crowd damage rate to boss wall: clones × dt (boss HP drained per second per clone) */
  BOSS_DAMAGE_PER_CLONE_PER_SEC: 1.0,

  /** Score bonuses */
  SCORE_PER_METER: 1,
  SCORE_OPTIMAL_GATE: 10,
  SCORE_BOSS_DEFEAT: 100,

  /** Gate configuration */
  GATE_CONFIG: {
    /** Spawn interval range per phase is defined in levels.ts */

    /** Weight distributions per phase: must sum to 1.0 */
    pairDistributionByPhase: {
      early: { add: 0.55, sub: 0.25, mul: 0.15, div: 0.05 },
      mid:   { add: 0.35, sub: 0.35, mul: 0.20, div: 0.10 },
      late:  { add: 0.20, sub: 0.40, mul: 0.25, div: 0.15 },
      boss:  { add: 0.25, sub: 0.25, mul: 0.25, div: 0.25 }
    } as Record<string, { add: number; sub: number; mul: number; div: number }>,

    /** [min, max] inclusive value ranges for each operation */
    valueRanges: {
      add: [1,  30] as [number, number],
      sub: [1,  25] as [number, number],
      mul: [2,   5] as [number, number],
      div: [2,   4] as [number, number]
    }
  },

  /** Gate world X positions for left and right lanes */
  GATE_LANE_X: { left: -2.0, right: 2.0 } as const,

  /** How close the crowd centre must be to a gate X to trigger passage (half-width) */
  GATE_HIT_HALF_WIDTH: 1.2,

  /** How close on Z axis triggers gate passage */
  GATE_HIT_DEPTH: 1.2

} as const

export type Balancing = typeof BALANCING
