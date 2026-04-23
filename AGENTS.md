# AGENTS.md - AI Agent Reference for cluster-run

> This file is for AI coding agents working in this repository.
> Treat source code as the authority. README.md contains design intent and some stale Phaser-era claims.

---

## 1. Current Project Snapshot

**What it is now:** A TypeScript/Vite browser game prototype named `cluster-run`. The runtime uses **PixiJS** for screens/HUD and **Three.js** for the 3D runner world. The code no longer boots Phaser and does not depend on Phaser.

**Target gameplay:** Portrait 9:16 cluster run. The player steers a clone crowd left/right through math gates, avoids obstacles, then damages a boss wall.

**Poki status:** The code declares and calls an optional global `window.PokiSDK`, but this repository does not install `@poki/phaser-3` and `index.html` does not load a Poki SDK script. Poki calls are no-ops unless a host page or future code provides `window.PokiSDK`.

**Entry point:** `index.html` -> `src/main.ts`

**Commands from `package.json`:**

| Command | Script | Notes |
|---|---|---|
| `npm run dev` | `vite` | Dev server. Vite config uses port 3000 and `open: true`. |
| `npm run build` | `tsc && vite build` | TypeScript check plus Vite production build to `dist/`. |
| `npm run preview` | `vite preview` | Serves the built output. |
| `npm run typecheck` | `tsc --noEmit` | Typecheck only. |

**Dependency specs in `package.json`:**

| Package | Section | Spec |
|---|---|---|
| `three` | dependencies | `^0.162.0` |
| `@types/three` | devDependencies | `^0.162.0` |
| `pixi.js` | devDependencies | `^8.6.2` |
| `typescript` | devDependencies | `^5.4.5` |
| `vite` | devDependencies | `^5.2.11` |

No lockfile is committed. Do not claim exact installed versions from repository files alone.

---

## 2. Architecture Map

### 2.1 Root Files

| File | Responsibility |
|---|---|
| `index.html` | HTML shell, mobile viewport, `#game-container`, CSS for `#three-canvas` behind `#pixi-canvas`, loads `/src/main.ts`. |
| `package.json` | Scripts and dependency specs. |
| `tsconfig.json` | Strict TypeScript config; `noEmit`, `noUnusedLocals`, `noUnusedParameters`, `moduleResolution: "bundler"`, includes only `src`. |
| `vite.config.ts` | `base: "./"`, GLB/KTX2/gltf asset includes, output chunks for `three` and `pixi.js`, dev server port 3000. |
| `README.md` | Human-facing design document. Some stack and structure claims are stale; prefer code. |

### 2.2 Source File Index

```
src/main.ts
  Boots a PIXI.Application, appends #pixi-canvas, registers screens in ScreenManager,
  ticks the active screen from app.ticker, calls ScaleManager.init(), starts BootScreen.

src/core/Screen.ts
  Abstract Pixi screen base class. Subclasses implement enter(), exit(), update(), resize().

src/core/ScreenManager.ts
  Registers string-keyed Screen instances, swaps active screen on goTo(), forwards update/resize.

src/core/ScaleManager.ts
  CSS FIT-style scaling for the Pixi canvas, centers #game-container parent,
  shows/removes #orientation-warning on small landscape viewports.

src/core/ThreeRenderer.ts
  Three.js renderer behind Pixi canvas. Builds primitive track, debug cube, instanced cube crowd,
  math gates, obstacles, boss wall, camera follow, camera shake, and render loop.

src/core/AudioManager.ts
  Static singleton over HTMLAudioElement. Persists mute/volume, registers audio URLs,
  plays cloned SFX/music, installs browser audio-unlock listeners.

src/core/SaveManager.ts
  Static localStorage wrapper. Prefixes all keys with "pg_".

src/core/Assets.ts
  AssetRegistry with generated Pixi placeholder textures for player/enemy/coin/particle.

src/core/Config.ts
  Runtime config object combining GAME_CONFIG, BALANCING, and browser detection.
  Currently not imported by active gameplay code.

src/screens/BootScreen.ts
  Initializes AudioManager, waits BALANCING.bootDelay, routes to PreloadScreen.

src/screens/PreloadScreen.ts
  Draws loading UI, generates placeholder Pixi textures, simulates progress,
  calls window.PokiSDK?.gameLoadingFinished(), routes to MenuScreen.

src/screens/MenuScreen.ts
  Pixi title/menu. Play starts GameScreen, mute toggles AudioManager,
  high score is read from SaveManager.

src/screens/GameScreen.ts
  Main game loop. Creates ThreeRenderer and gameplay systems, handles input, spawning,
  steering, scoring, gate/obstacle checks, boss phase, pause, HUD, Poki gameplayStart/Stop.

src/screens/ResultScreen.ts
  End screen. Shows score and best score, optional rewarded revive button when window.PokiSDK exists,
  Play Again routes to GameScreen, Menu routes to MenuScreen.

src/components/UIButton.ts
  Pixi reusable button container with hover/press/disabled states.

src/components/ProgressBar.ts
  Pixi progress bar container.

src/components/CrowdCounter.ts
  Pixi HUD count display with scale-pop animation.

src/components/BossHealthBar.ts
  Pixi HUD boss wall health display built on ProgressBar.

src/systems/CrowdSystem.ts
  Crowd count mutation, gate operation application, cached formation positions.

src/systems/GateSystem.ts
  Gate pair spawning, passage detection, optimal gate tagging, gate culling.

src/systems/ObstacleSystem.ts
  Obstacle spawning, AABB-style collision checks, obstacle culling.

src/systems/LevelSystem.ts
  Elapsed-time phase tracking, boss trigger, track speed, run-number persistence.

src/systems/ScoreSystem.ts
  Current score and persisted high score.

src/systems/SpawnSystem.ts
  Delta-driven scheduler with pause/resume and mutable intervals.

src/systems/DifficultySystem.ts
  Legacy time-based difficulty helper. Present but not used by GameScreen.

src/data/gameConfig.ts
  Title, logical canvas size, background, version, and legacy Phaser-flavored fields.

src/data/balancing.ts
  Tunable gameplay constants. Contains both active Cluster Run constants and legacy starter values.

src/data/levels.ts
  Phase definitions: early, mid, late, boss.

src/utils/helpers.ts
  Pure general utilities.

src/utils/mathGate.ts
  Pure gate math, pair generation, and localhost self-tests.

src/types/poki.d.ts
  Ambient declaration for global window.PokiSDK.
```

There is no `src/scenes/` directory and no `public/assets/` directory in the current repository.

### 2.3 Runtime Flow

```
index.html
  -> src/main.ts
    -> new PIXI.Application()
    -> append app.canvas as #pixi-canvas
    -> register BootScreen, PreloadScreen, MenuScreen, GameScreen, ResultScreen
    -> ScaleManager.init(app.canvas, screenManager)
    -> screenManager.goTo("BootScreen")

BootScreen
  -> AudioManager.init(this)
  -> after BALANCING.bootDelay, goTo("PreloadScreen")

PreloadScreen
  -> AssetRegistry.generatePlaceholderTextures(app)
  -> simulated loading progress
  -> window.PokiSDK?.gameLoadingFinished()
  -> goTo("MenuScreen")

MenuScreen
  -> PLAY / Enter / Space -> goTo("GameScreen")
  -> Escape or mute button -> AudioManager.toggleMute()

GameScreen
  -> creates ThreeRenderer and systems
  -> window.PokiSDK?.gameplayStart()
  -> running phase: steer, score distance, spawn gates/obstacles, process collisions
  -> boss phase at 60s via LevelSystem
  -> victory -> ResultScreen
  -> game over path -> window.PokiSDK?.gameplayStop() -> ResultScreen

ResultScreen
  -> optional rewarded revive if window.PokiSDK exists and run was not victory
  -> PLAY AGAIN / Enter / R -> goTo("GameScreen")
  -> MENU -> goTo("MenuScreen")
```

---

## 3. Critical Constraints

### 3.1 Do not apply Phaser starter assumptions

The active runtime is PixiJS + Three.js. Do not add `Phaser.Scene`, `@poki/phaser-3`, Arcade physics, Phaser loaders, or Phaser plugin config unless the task is an explicit migration. Existing `GAME_CONFIG.physics`, `GAME_CONFIG.debug`, and some comments are legacy fields and are not consumed by Phaser.

### 3.2 Screen keys are string contracts

`main.ts` registers these exact keys:

```ts
"BootScreen"
"PreloadScreen"
"MenuScreen"
"GameScreen"
"ResultScreen"
```

All `screenManager.goTo(...)` calls use these strings directly. If a screen key changes, update registration and every navigation call together.

### 3.3 Dual-canvas ordering must stay aligned

`main.ts` appends Pixi's canvas as `#pixi-canvas`. `GameScreen.enter()` creates `ThreeRenderer`, whose `init()` inserts `#three-canvas` before Pixi's canvas inside `#game-container`.

Fragile points:

- Three must remain behind Pixi for HUD visibility.
- ScaleManager currently scales only the Pixi canvas passed to `ScaleManager.init()`.
- ThreeRenderer sets its own canvas size/style when GameScreen enters.
- If changing dimensions, scaling, CSS, or renderer setup, verify both canvases remain the same visual size and position.

### 3.4 Poki integration is global and partial

The code uses `window.PokiSDK?.gameLoadingFinished()`, `gameplayStart()`, `gameplayStop()`, and `rewardedBreak()`.

Actual behavior:

- No SDK script is loaded by `index.html`.
- Missing SDK is tolerated by optional chaining.
- `gameLoadingFinished()` is called at the end of PreloadScreen's simulated load.
- `gameplayStart()` is called when GameScreen enters.
- `gameplayStop()` is currently called only in `_triggerGameOver()`, not on victory or generic GameScreen exit.
- No `commercialBreak()` call exists in active code.

For Poki submission, [VERIFY IN CODE] SDK loading and gameplay stop coverage before assuming monetization hooks are complete.

### 3.5 Save keys must stay prefix-scoped

`SaveManager` prefixes all localStorage keys with `pg_`. `SAVE_KEYS` stores suffixes only:

```ts
highScore: "high_score"
muted: "muted"
sfxVolume: "sfx_volume"
musicVolume: "music_volume"
runNumber: "run_number"
```

Do not bypass `SaveManager` for game persistence unless there is a deliberate migration plan.

### 3.6 AudioManager is a static singleton

`AudioManager` is a static-only class. Keep mute state, volume state, cache, current music, and audio-unlock behavior global. Do not instantiate or convert it to per-screen state.

Important current behavior:

- `registerAudio(key, url)` must be called before SFX/music keys can play.
- No current code calls `registerAudio`, so existing SFX calls are safe no-ops.
- `playSfx` and `playMusic` accept `_scene: any` for compatibility, but they do not use it.

### 3.7 Crowd death is currently unreachable from count loss

`CrowdSystem` clamps count to `BALANCING.CROWD_CAPS.min`, currently `1`. `CrowdSystem.isDead()` checks `count <= 0`. Because mutations clamp to at least 1, gate subtraction/division and obstacle damage cannot currently make the crowd dead.

If implementing real failure on count loss, change the count/death contract deliberately and update gate, obstacle, result, and revive behavior together.

### 3.8 Keep pure systems renderer-independent

`CrowdSystem`, `GateSystem`, `ObstacleSystem`, `LevelSystem`, `ScoreSystem`, `SpawnSystem`, and `mathGate.ts` are renderer-independent. Keep Three.js, PixiJS, DOM, and audio calls out of these systems unless there is a clear architectural reason.

### 3.9 Manage DOM and global listeners deliberately

DOM/global access currently exists in:

- `src/main.ts`
- `src/core/ScaleManager.ts`
- `src/core/ThreeRenderer.ts`
- `src/core/AudioManager.ts`
- `src/screens/GameScreen.ts`
- `src/screens/MenuScreen.ts`
- `src/screens/ResultScreen.ts`
- `src/core/Config.ts`
- `src/utils/helpers.ts` (`isTouchDevice`)

When adding `window` or `document` listeners in screens, remove them on screen removal or exit. ScaleManager uses anonymous global listeners and should be initialized once.

### 3.10 Hot-path allocation caution

`GameScreen.update()` and `ThreeRenderer.update()` run every frame. Existing ThreeRenderer code already allocates in some hot paths (`new Vector3`, array `map`/spread in track update, text canvas creation for gates outside update). Avoid adding avoidable per-frame allocations in performance-sensitive work, especially for mobile.

### 3.11 Strict TypeScript constraints

`tsconfig.json` enables strict checks plus `noUnusedLocals` and `noUnusedParameters`. Prefix intentionally unused parameters with `_` or remove them.

---

## 4. Safe Modification Guide

### 4.1 Replace or build out

| Area | Current state | Safe direction |
|---|---|---|
| `src/core/ThreeRenderer.ts` visuals | Primitive cube crowd, primitive gates/obstacles/boss, generated text sprites. | Replace internals with real models/materials while preserving `ICrowdRenderer` methods used by GameScreen. |
| `src/core/Assets.ts` and `src/screens/PreloadScreen.ts` | Generated placeholder Pixi textures and simulated progress. | Add real asset loading/registration. Keep Poki `gameLoadingFinished()` after all required assets are ready. |
| `src/core/AudioManager.ts` usage | Audio cache exists but nothing registers audio. | Register audio keys during preload before calling `playSfx`/`playMusic`. |
| `src/screens/GameScreen.ts` gameplay | Runner loop is wired, but failure/death semantics are incomplete due count clamp. | Modify gameplay state transitions carefully; keep renderer/system separation. |

### 4.2 Tune numbers

| File | Tune |
|---|---|
| `src/data/balancing.ts` | Active cluster run constants: crowd caps, track speed, steering, collision radius, obstacle damage, boss HP/damage, scores, gate distributions/ranges/lanes/hit sizes. |
| `src/data/levels.ts` | Phase timing, gate intervals, obstacle intervals, `hasGates`. Note: GameScreen currently uses `LevelSystem.trackSpeed`, which reads `BALANCING.SPEED_RAMP`, not `PhaseConfig.speedMultiplier`. |
| `src/data/gameConfig.ts` | `title`, `width`, `height`, `backgroundColor`, `version`. `debug`, `physics`, and `targetFps` are present but not wired into a Phaser runtime. |

### 4.3 Extend

| File | Extension pattern |
|---|---|
| `src/screens/*.ts` | Add new screen classes extending `Screen`; register them in `main.ts`; navigate with `ScreenManager.goTo(key, data)`. |
| `src/core/SaveManager.ts` | Add suffixes to `SAVE_KEYS`; use `SaveManager.save/load/remove`. |
| `src/utils/mathGate.ts` | Add pure gate operations or generation rules. Update self-tests if behavior changes. |
| `src/systems/*.ts` | Add gameplay logic without Pixi/Three/DOM dependencies when possible. |
| `src/types/poki.d.ts` | Add global Poki SDK methods only when code uses them. |

### 4.4 Avoid unless necessary

| File | Reason |
|---|---|
| `src/main.ts` | Owns bootstrap order, canvas creation, screen registration, ticker, and ScaleManager initialization. |
| `src/core/ScreenManager.ts` | Central lifecycle contract for all screens. Changes affect every transition. |
| `src/core/ScaleManager.ts` | DOM/CSS scaling and orientation overlay. Changes can desync Pixi and Three canvases. |
| `src/core/SaveManager.ts` | Prefix/key semantics affect persisted player data. |
| `src/core/AudioManager.ts` | Static audio state and unlock listeners are global browser behavior. |
| `src/core/ThreeRenderer.ts` public interface | GameScreen depends on `ICrowdRenderer` shape. Internal rendering is safe to replace; method names/signatures are a contract. |

---

## 5. Public Contracts

### Screen

```ts
abstract class Screen extends PIXI.Container {
  protected screenManager: ScreenManager
  get app(): PIXI.Application
  abstract enter(data?: any): Promise<void> | void
  abstract exit(): Promise<void> | void
  abstract update(delta: number): void
  abstract resize(width: number, height: number): void
}
```

### ScreenManager

```ts
constructor(app: PIXI.Application)
register(key: string, screen: Screen): void
goTo(key: string, data?: any): Promise<void>
update(delta: number): void
resize(width: number, height: number): void
```

`goTo()` removes the active screen from `app.stage`, awaits `exit()`, adds the next screen, calls `resize()`, then awaits `enter(data)`. If the key is missing, it warns and returns.

### ScaleManager

```ts
static init(canvas: HTMLCanvasElement, screenManager: ScreenManager): void
static handleResize(): void
static isWrongOrientation(): boolean
static get viewportWidth(): number
static get viewportHeight(): number
```

`isWrongOrientation()` is true when `window.innerWidth > window.innerHeight && window.innerWidth < 900`.

### SaveManager

```ts
static save<T>(key: string, value: T): void
static load<T>(key: string, defaultValue: T): T
static remove(key: string): void
static clearAll(): void
static isAvailable(): boolean
```

All methods swallow storage errors. `clearAll()` removes only `pg_`-prefixed keys.

### AudioManager

```ts
static init(_scene: any): void
static registerAudio(key: string, url: string): void
static playSfx(_scene: any, key: string, volume?: number): void
static playMusic(_scene: any, key: string, volume?: number): void
static stopMusic(): void
static toggleMute(): boolean
static setMuted(muted: boolean): void
static setSfxVolume(volume: number): void
static setMusicVolume(volume: number): void
static get muted(): boolean
static get sfxVolume(): number
static get musicVolume(): number
```

### AssetRegistry

```ts
static textures: Record<string, PIXI.Texture>
static generatePlaceholderTextures(app: PIXI.Application): Promise<void>
```

Generates `player`, `enemy`, `coin`, and `particle` textures. Active gameplay does not currently consume these textures.

### ICrowdRenderer / ThreeRenderer

```ts
init(container: HTMLElement, width: number, height: number): void
setCrowdCount(n: number, positions: Array<{ x: number; z: number }>): void
setCrowdPosition(worldX: number, worldZ: number): void
addGate(id: string, spec: GateSpec, worldZ: number, worldX: number): void
removeGate(id: string): void
flashGate(id: string): void
addObstacle(id: string, type: ObstacleType, worldZ: number, worldX: number): void
removeObstacle(id: string): void
triggerShake(): void
showBossWall(hp: number, maxHp: number, worldZ: number): void
updateBossWall(hpFraction: number): void
hideBossWall(): void
getWorldZ(): number
update(dt: number): void
destroy(): void
```

`GameScreen` calls this interface directly. Preserve it unless updating GameScreen at the same time.

### CrowdSystem

```ts
constructor(initialCount = 1)
onCountChange?: (count: number) => void
applyOp(op: GateOp, value: number): void
add(n: number): void
remove(n: number): void
multiply(n: number): void
divide(n: number): void
get count(): number
isDead(): boolean
getFormationPositions(): FormationPos[]
```

Count is clamped to `BALANCING.CROWD_CAPS`. Formation positions are cached until count changes.

### GateSystem

```ts
spawnPair(phase: Phase, crowdCount: number, cameraZ: number): [GateEntity, GateEntity]
checkPassage(crowdX: number, crowdZ: number): GateEntity | null
cullBehind(cameraZ: number): string[]
getActive(): GateEntity[]
clear(): void
```

Gate pair spawn Z is `cameraZ - 38`. Passage marks the hit gate and its partner as passed.

### ObstacleSystem

```ts
spawn(cameraZ: number): ObstacleEntity
checkCollisions(crowdX: number, crowdZ: number, crowdRadius: number): ObstacleEntity[]
cullBehind(cameraZ: number): string[]
getActive(): ObstacleEntity[]
clear(): void
```

Obstacle types are `"rock" | "blade" | "wall"`. Spawn Z is `cameraZ - 40`.

### LevelSystem

```ts
constructor()
onPhaseChange?: (phase: PhaseConfig) => void
onBossWallSpawn?: (hp: number, maxHp: number) => void
update(deltaMs: number): void
get currentPhase(): Phase
get currentPhaseConfig(): PhaseConfig
get elapsedSec(): number
get trackSpeed(): number
isBossPhase(): boolean
static incrementRunNumber(): void
reset(): void
```

Boss HP is `BALANCING.BOSS_BASE_HP + BALANCING.BOSS_HP_PER_RUN * runNumber`.

### ScoreSystem

```ts
constructor()
add(points: number): void
reset(): void
getScore(): number
getHighScore(): number
isNewHighScore(): boolean
clearHighScore(): void
```

`add()` clamps current score to >= 0 and persists high score when exceeded.

### SpawnSystem

```ts
schedule(callback: () => void, intervalMs: number, fireImmediately = false): SpawnEntry
clear(): void
remove(entry: SpawnEntry): void
tick(deltaMs: number): void
pause(): void
resume(): void
get isPaused(): boolean
get count(): number
```

`SpawnEntry.intervalMs` is mutable. `tick()` can fire multiple times after a large delta.

### DifficultySystem

```ts
constructor()
update(deltaMs: number): void
getDifficultyMultiplier(): number
getCurrentSpawnInterval(): number
getElapsedMs(): number
getElapsedSeconds(): number
getDifficultyProgress(): number
reset(): void
```

This class is present but not used by GameScreen.

### UI Components

```ts
new UIButton({ x, y, width?, height?, label, fontSize?, color?, hoverColor?, pressColor?, disabledColor?, textColor?, radius?, onClick? })
button.setText(text): this
button.setEnabled(enabled): this
button.isDisabled

new ProgressBar({ x, y, width?, height?, trackColor?, fillColor?, highlightColor?, radius?, initialValue? })
bar.setValue(value): void
bar.value

new CrowdCounter(x, y)
counter.update(count, delta): void

new BossHealthBar(x, y, width?)
bossBar.show(): void
bossBar.hide(): void
bossBar.update(hp, maxHp): void
```

---

## 6. Actual Placeholders and Incomplete Areas

There are no `TODO` comments in `src/`, but the code still contains prototype placeholders:

| Area | Reality in code | Agent guidance |
|---|---|---|
| Loading | PreloadScreen simulates progress with timers. | Replace with real asset loading before calling `gameLoadingFinished()`. |
| Pixi assets | AssetRegistry generates placeholder textures. | Replace or extend with real asset registration if Pixi sprites are used. |
| Three visuals | Track, crowd, gates, obstacles, and boss wall are primitive geometry. | Replace internals of ThreeRenderer while preserving `ICrowdRenderer`. |
| Debug cube | ThreeRenderer creates a spinning cube until `setCrowdCount()` removes it. | Remove once real initial world/crowd rendering is stable. |
| Audio | SFX keys are called, but no audio is registered. | Register audio keys during preload or remove dead calls. |
| Poki SDK | Optional global calls exist, no SDK loader exists. | Add/verify SDK loading for platform builds. |
| Failure state | Count loss cannot reach zero because CrowdSystem clamps to min 1. | Decide whether zero-count death is desired; adjust clamp/death contract if so. |
| Victory Poki stop | Victory path routes to ResultScreen without `gameplayStop()`. | Fix before relying on Poki gameplay lifecycle. |
| Legacy files/fields | `DifficultySystem`, `Config`, and some BALANCING/GAME_CONFIG fields are not active in GameScreen. | Remove, wire, or document intent before building features on them. |

---

## 7. Common Tasks

### Add a new screen

1. Create `src/screens/MyScreen.ts` extending `Screen`.
2. Implement `enter`, `exit`, `update`, and `resize`.
3. Import and register it in `src/main.ts`.
4. Navigate with `this.screenManager.goTo("MyScreen", data)`.

### Add a saved value

1. Add a suffix to `SAVE_KEYS` in `src/core/SaveManager.ts`.
2. Read with `SaveManager.load(SAVE_KEYS.myKey, defaultValue)`.
3. Write with `SaveManager.save(SAVE_KEYS.myKey, value)`.

### Add audio

1. Ensure audio files are available to Vite or the final hosted build.
2. Call `AudioManager.registerAudio("key", url)` during preload/setup.
3. Use `AudioManager.playSfx(null, "key")` or `AudioManager.playMusic(null, "key")`.
4. Keep mute/volume state in AudioManager, not in individual screens.

### Add or change gate math

1. Update `GateOp`, `applyGateOp`, ranges, and generation logic in `src/utils/mathGate.ts` and `src/data/balancing.ts`.
2. Update `GATE_COLORS` and label rendering in `src/core/ThreeRenderer.ts` if adding a new op.
3. Update `runMathGateSelfTests()` for deterministic cases.

### Change game dimensions

1. Update `GAME_CONFIG.width` and `GAME_CONFIG.height`.
2. Check `index.html` canvas CSS, `ScaleManager.handleResize()`, and `ThreeRenderer.init()`.
3. Manually verify Pixi and Three canvases remain aligned after resize/orientation changes.

### Prepare Poki integration

1. [VERIFY IN CODE] Load or receive the real Poki SDK global before game calls are expected to work.
2. Keep `gameLoadingFinished()` after all loading is complete.
3. Ensure every gameplay end path calls `gameplayStop()`, including victory and navigation away.
4. Add commercial breaks deliberately; none are currently called.
5. Keep rewarded revive conditional and handle rejected/unavailable rewards safely.

---

## 8. Test Checklist

Run after modifications once dependencies are installed:

```bash
npm run typecheck
npm run build
```

Use `npm run dev` for manual browser checks.

### Smoke checks

- App boots from `index.html` without a white screen.
- `#pixi-canvas` is created under `#game-container`.
- BootScreen transitions to PreloadScreen after `BALANCING.bootDelay`.
- PreloadScreen reaches 100%, calls `window.PokiSDK?.gameLoadingFinished()` if SDK exists, then opens MenuScreen.
- MenuScreen shows title, tagline, Play, mute, and saved best score when present.
- Play opens GameScreen.
- GameScreen creates `#three-canvas` behind `#pixi-canvas`.
- Crowd renders and moves left/right with Arrow keys, A/D, and pointer drag.
- Gates and obstacles spawn during running phases.
- Escape toggles pause and pauses SpawnSystem.
- Mute buttons persist state through SaveManager.
- Boss phase starts after the configured phase timing.
- ResultScreen shows score, best score/new best state, Play Again, Menu, and optional rewarded revive when SDK exists.

### Persistence checks

- High score persists under `pg_high_score`.
- Mute persists under `pg_muted`.
- Run number persists under `pg_run_number`.
- No game persistence writes unprefixed localStorage keys.

### Responsive checks

- Portrait viewport fits the logical 480x854 game.
- Small landscape viewport shows `#orientation-warning`.
- Pixi and Three canvases remain aligned after resize/orientation changes.
- Touch/click UI remains usable with `touch-action: none`.

### Poki checks

- With a real SDK present, `gameLoadingFinished()` fires after preload.
- `gameplayStart()` fires when gameplay begins.
- `gameplayStop()` fires on every gameplay-ending path. Current code needs attention for victory.
- Rewarded revive handles both rewarded and non-rewarded outcomes.

### Build output checks

- `npm run build` exits 0.
- `dist/index.html` exists.
- Vite emits JS/assets under `dist/assets/`.
- Chunk names/counts may vary; do not hardcode an exact chunk count.

---

## 9. Documentation Drift Notes

Known stale claims outside this file:

- README still describes Phaser 3, `@poki/phaser-3`, Phaser scenes, and `src/scenes/*`.
- README mentions planned world and asset folders that do not exist in the current repository.
- Some source comments still reference Phaser even though active code uses PixiJS.

When documentation conflicts with source, prefer source and update documentation instead of coding against stale docs.
