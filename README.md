# Crowd Runner — Game Design Document

**Stack:** Phaser 3 · TypeScript · Vite · Poki SDK · Three.js
**Template base:** tatosgames/phaser-poki-starter
**Target platform:** Browser (desktop + mobile) via Poki
**Genre:** Casual runner / math puzzle
**Monetization:** Poki ad-breaks (mid-game interstitials + rewarded)

---

## 1. Concept

The player controls a growing/shrinking crowd that runs through a corridor of math gates. Each gate applies an arithmetic operation (+, -, x, /) to the crowd size. Reach the Boss Wall at the end with enough runners to break through and win the level.

Core loop (15-45 s per level): RUN → CHOOSE GATE → CROWD CHANGES → NEXT GATE → BOSS WALL → WIN / LOSE

---

## 2. Game Architecture

### Renderer Split

Two co-existing renderers on separate layers:

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| 3D Scene | Three.js WebGLRenderer | Crowd characters, ground, gate columns, boss wall, particles |
| 2D HUD / UI | Phaser 3 canvas overlay | Score counter, gate labels, combo text, ad-break overlay |

Three.js canvas sits behind the Phaser canvas (transparent background). Both mounted in #game-container.

### Scene Graph

Scene > AmbientLight + DirectionalLight + PathGroup + GateGroup + CrowdGroup (InstancedMesh, maxCount 500) + BossWall

### ICrowdRenderer Interface

interface ICrowdRenderer {
  init(scene, maxCount): void
  setCount(n): void
  update(delta, runnerZ): void
  triggerMerge(from, to): void
  triggerSplit(from, to): void
  dispose(): void
}

ThreeCrowdRenderer uses THREE.InstancedMesh for the crowd (1 draw call for up to 500 runners).

---

## 3. Core Systems

### Gate System

Gate operations: + (green, always beneficial) | x (blue, beneficial if crowd > 1) | - (orange, harmful) | / (red, always harmful)

Pairing rule "mixed-advantage": left gate and right gate always have opposite valence on easy/medium difficulty.

### Crowd Formation

Triangular wedge formation expanding behind the lead runner. Max 500 runners.

LOD levels:
- 0-60: full animation + shadows
- 61-200: static pose, no shadow
- 201-500: sprite billboard fallback

### Boss Wall

HP = boss.hp. Each collision tick removes floor(crowd.count * DAMAGE_PER_RUNNER) HP. Wall cracks via animated displacementMap UV scroll.

---

## 4. Math Gate Logic

- +: crowdCount + value
- -: max(1, crowdCount - value)
- x: min(500, crowdCount * value)
- /: max(1, floor(crowdCount / value))

Division never reduces crowd below 1. Multiplication caps at 500.

---

## 5. World Progression

| World | Levels | Theme | New mechanic |
|-------|--------|-------|-------------|
| 1 | 1-10 | City | + and - only |
| 2 | 11-20 | Jungle | x introduced |
| 3 | 21-30 | Desert | / introduced |
| 4 | 31-40 | Snow | Same-valence gate risk |

---

## 6. Asset Pipeline

- Characters: glTF 2.0 + Draco compression, 15-bone humanoid, single Run animation, 512x512 atlas
- Per-instance color tint via InstancedBufferAttribute (4 variants)
- Ground: tiling PBR texture scrolled via MeshStandardMaterial offset
- Gate pillars: BoxGeometry + MeshToonMaterial
- Skybox: CubeTextureLoader per world theme

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 desktop / 30 mobile |
| Draw calls | < 20 per frame |
| Max crowd | 500 (1 draw call) |
| Level load | < 3 s on 4G |
| JS bundle gzip | < 400 KB |
| Assets per world | < 8 MB |

---

## 8. Dependencies

- phaser: ^3.88.0
- three: ^0.176.0
- poki-sdk: ^1.0.0
- @types/three: ^0.176.0

Removed from base template: pixi.js, pixi3d

---

## 9. Poki SDK Integration

- gameLoadingStart() / gameLoadingFinished() on boot
- commercialBreak() after boss wall break (level end)
- rewardedBreak() on Game Over ("Continue with half crowd?")

---

## 10. Development Roadmap

| Milestone | Deliverable |
|-----------|------------|
| M1 | Three.js renderer + Phaser HUD overlay |
| M2 | Crowd InstancedMesh: spawn, formation, animation |
| M3 | Procedural path + scrolling ground |
| M4 | Gate system: spawn, detect, apply math op |
| M5 | Boss Wall: HP, crack animation, win condition |
| M6 | World 1 complete (10 levels, city theme) |
| M7 | Worlds 2-4 + Poki SDK ad-break integration |
| M8 | Polish: juice, particles, sound, Poki review submission |

---

*GDD v1.1 — Three.js architecture — tatosgames/crowd-runner*
