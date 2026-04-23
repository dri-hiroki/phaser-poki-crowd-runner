# Cluster Run — Math Gates

> Un runner 3D endless in cui comandi una folla di clone che cresce e diminuisce passando attraverso **gate matematici** (`+`, `−`, `×`, `÷`). Più sei grande, più distruggi ostacoli e accumuli punteggio — ma un errore al gate sbagliato può farti arrivare al boss con un solo clone.

Built with **Phaser 3** (UI/HUD/scene flow) + **Three.js** (rendering 3D di folla, mondo e gate) + **TypeScript** + **Vite**, con **Poki SDK** integrato per pubblicazione su [poki.com](https://poki.com).

---

## 1. Game Vision

### 1.1 Concetto in una frase
"Controlla una folla di omini, attraversa i gate matematici giusti, arriva al boss con il numero più alto possibile."

### 1.2 Riferimenti / ispirazioni
- *Count Masters*, *Join Clash 3D*, *Count Masters: Stickman Clash* (Voodoo / Freeplay)
- *Crowd City* (Voodoo)
- Meta: puzzle matematico leggero mascherato da runner casual

### 1.3 Target platform e constraints
- **Piattaforma**: Poki web (desktop + mobile browser). Secondariamente embeddable su portali HTML5.
- **Orientamento**: portrait 9:16 — canvas logico 480×854, scala responsiva (`ScaleManager`).
- **Peso target build**: ≤ 8 MB gzipped (Poki preferisce < 5 MB, Three.js + modelli glTF alzano il budget: serve asset optimization aggressiva, tree-shaking di Three).
- **Frame rate target**: 60 FPS su iPhone SE 2020 / Galaxy A52, fallback 30 FPS su low-end.
- **Tempo di sessione**: 45–90 secondi per run, con retry immediato.

---

## 2. Core Gameplay

### 2.1 Loop principale (per run)
1. **Start** — il giocatore inizia con **1 clone** al centro di una corsia.
2. **Run auto-scroll** — la telecamera avanza automaticamente lungo una pista 3D. Il giocatore muove la folla solo sull'asse **X** (sinistra/destra) con drag/tilt/frecce.
3. **Gate matematici** — ogni 3–8 secondi appare una coppia di gate affiancati. Il giocatore sceglie quale attraversare. Ogni gate applica un'operazione al numero di clone:
   - `+N` (somma clone)
   - `−N` (sottrae clone, con cap a 1)
   - `×N` (moltiplica — gate raro, premiante)
   - `÷N` (divide, arrotondamento intero per difetto)
4. **Ostacoli** — rocce, lame rotanti, muri di mattoni: ogni impatto rimuove 1 o più clone (configurabile). Se la folla scende a 0 → **game over**.
5. **Boss finale** / **muro di HP** — ogni ~60 secondi, il run termina con un muro con HP pari a un numero (es. 250). Ogni clone fa 1 danno. Se abbatti il muro → bonus, continua il livello. Se non basta → game over.
6. **Result** — schermata con score finale, best score, pulsanti Retry / Menu, hook rewarded ad Poki.

### 2.2 Controlli
| Input | Azione |
|---|---|
| Touch drag orizzontale | Muove la folla su asse X (sensibilità in `balancing.ts`) |
| Mouse drag | Idem desktop |
| Frecce ←/→ o A/D | Steering a velocità costante |
| Tap / click | Nessuno in-game (solo UI). Niente jump: il movimento è solo laterale |

### 2.3 Stati della run
```
Idle → Running → GateResolve → Running → ObstacleHit → Running → BossWall → (Victory|GameOver) → Result
```

### 2.4 Regole matematiche
- Cap massimo folla: **999** (per performance e leggibilità HUD).
- Cap minimo: **1**. Se una sottrazione porterebbe sotto 1 → game over.
- Divisione intera: `÷3` su 10 clone → 3 clone (scarta resto).
- Moltiplicazione: i clone "nuovi" spawnano con animazione pop e si riorganizzano a formazione.

---

## 3. Sistema Folla (Crowd)

### 3.1 Formazione
I clone sono disposti in formazione a cerchio concentrico attorno a un **leader** logico. Raggio e densità scalano in base al count:

| Count | Layout | Raggio |
|---|---|---|
| 1–5 | Fila singola | fissa |
| 6–20 | Cerchio singolo | r proporzionale |
| 21–100 | Anelli concentrici (3–5) | spacing 0.3u |
| 101–999 | Blob denso con jitter | packing randomizzato |

### 3.2 Tecnica di rendering
- **Three.js** con **`InstancedMesh`** per i clone: un'unica geometry + matrici per istanza → 1 draw call per N clone.
- **`SkinnedMesh`** instanziata è costosa: invece usiamo una **texture di vertex animation baking (VAT)** → la clip "run" è pre-baked in una texture di posizioni per frame, lo shader legge la posizione in base al tempo. Alternativa più semplice (se VAT risulta over-engineering): `THREE.InstancedSkinnedMesh` dalla community, o animazione per-instance con offset.
- **LOD**: da 50+ clone si usa un modello a ~300 tris; da 200+ un billboard sprite 3D (`THREE.Sprite` camera-facing) con texture "run cycle" a 4–8 frame.
- **Animazioni**: 1 animazione "run" loopata, sfalsamento casuale dell'`animationTime` per istanza per evitare sincronia robotica.
- **Shadow**: `THREE.ShadowMaterial` con un singolo piano blob sotto la folla (no shadow map reale per ogni clone). Directional light con shadow solo sugli ostacoli.

### 3.3 Clone aggiunti / rimossi
- **Add**: pop in con scale 0→1 su 0.2s, piccolo tween verticale per "caduta".
- **Remove**: dissolve con particelle (puff), sound `pop_out.wav` stereo.

---

## 4. Math Gates

### 4.1 Tipologie e bilanciamento
Valori base in `src/data/balancing.ts`:

```ts
export const GATE_CONFIG = {
  spawnIntervalSec: { min: 3, max: 8 },
  pairDistributionByPhase: {
    early:  { add: 0.55, sub: 0.25, mul: 0.15, div: 0.05 },
    mid:    { add: 0.35, sub: 0.35, mul: 0.20, div: 0.10 },
    late:   { add: 0.20, sub: 0.40, mul: 0.25, div: 0.15 },
  },
  valueRanges: {
    add: [1, 30],
    sub: [1, 25],
    mul: [2, 5],
    div: [2, 4],
  },
  pairingRule: 'mixed-advantage', // un gate è sempre migliore dell'altro
}
```

### 4.2 Regole di pairing
Per ogni coppia di gate, **deve esistere una scelta oggettivamente migliore** (con tolleranza 10%). Esempi di pair validi:
- `+15` vs `×2` (con 20 clone: 35 vs 40 → ×2 vince)
- `−5` vs `+10` (sempre meglio +)
- `÷2` vs `−15` (con 40 clone: 20 vs 25 → ÷2 peggiore — skill gate)

Questo evita scelte banali e spinge il giocatore a calcolare.

### 4.3 Visual feedback gate
- Colori: verde = +, rosso = −, oro = ×, viola = ÷
- Testo 3D emissivo visibile da lontano (LOD mipmap)
- Attraversamento: flash bianco 2 frame + sound + particelle + trigger di `applyGateOperation()` sul `CrowdSystem`

---

## 5. Tech Stack dettagliato

### 5.1 Dipendenze runtime
```json
{
  "phaser": "^3.80.1",
  "three": "^0.162.0",
  "@poki/phaser-3": "^0.0.5"
}
```

Tipi per Three.js come devDependency:
```json
{
  "@types/three": "^0.162.0"
}
```

> **Nota integrazione**: Phaser gestisce Boot/Preload/Menu/Result + HUD 2D durante il Game. La `GameScene` istanzia un `ThreeRenderer` come wrapper che monta un secondo canvas WebGL (Three.js `WebGLRenderer`) **sotto** al canvas Phaser. Il canvas Phaser viene messo sopra con `background: transparent` e `pointer-events: auto` solo per l'HUD (le hit-area dei bottoni), mentre `pointer-events` sull'area di gioco è `none` così il touch/mouse raggiunge comunque Phaser per lo steering. Il sync tick è governato da `scene.events.on('update', (time, dt) => threeRenderer.update(dt))`; Three.js chiama il suo `renderer.render(scene, camera)` dentro lo stesso frame.
>
> **Contexts WebGL multipli**: alcuni device hanno un limite basso (8–16) di context WebGL attivi. Phaser + Three = 2 contexts, accettabile. Se emerge problema, si può spostare Phaser a canvas 2D (`Phaser.CANVAS`) perché gestisce solo HUD statico.

### 5.2 Perché Three.js (e non Pixi 3D)
- **Maturità**: ecosystem enorme, centinaia di migliaia di esempi, stackoverflow answers, loader testati.
- **glTF completo**: `GLTFLoader` ufficiale supporta Draco, KTX2, meshopt, PBR completo, animazioni, morph targets, skinning.
- **Instancing solido**: `InstancedMesh` è first-class e ben documentato, fondamentale per la folla.
- **Post-processing**: `EffectComposer` per effetti a costo zero di setup (bloom leggero sui gate oro, vignette).
- **Trade-off**: bundle più pesante di Pixi 3D (~140 KB gzip per i moduli minimi che usiamo, vs ~50 KB di Pixi 3D). Mitigato con **tree-shaking aggressivo** importando solo i moduli necessari:
  ```ts
  import { WebGLRenderer, Scene, PerspectiveCamera, InstancedMesh, ... } from 'three'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
  ```
  Vite rimuove il resto del core.

### 5.3 Stack completo
| Layer | Tech |
|---|---|
| Scene flow, HUD 2D, input, audio | Phaser 3 |
| Rendering 3D (world, crowd, gate) | Three.js |
| Loader asset 3D | GLTFLoader + DRACOLoader + KTX2Loader |
| Math / utility | tipi nativi TS + `THREE.Vector3/Matrix4` dove serve |
| Build | Vite 5 |
| Type check | tsc strict |
| SDK | @poki/phaser-3 |

---

## 6. Project Structure

```
/src
  /core
    Config.ts              Tipo + default del config globale
    ScaleManager.ts        Scale responsivo portrait-first
    AudioManager.ts        Mute/unmute, unlock browser audio
    SaveManager.ts         localStorage tipizzato (highscore, best streak)
    ThreeRenderer.ts       🆕 Wrapper WebGLRenderer + Scene + Camera + loaders
  /scenes
    BootScene.ts           Init servizi, route a Preload
    PreloadScene.ts        Carica asset 2D (HUD) + trigger async load glTF via ThreeRenderer
    MenuScene.ts           Title + Play + mute + best score
    GameScene.ts           Host del ThreeRenderer; HUD (count clone, progress boss)
    ResultScene.ts         Score, retry, menu, rewarded ad hook
  /components
    UIButton.ts            Reusable (invariato dallo starter)
    ProgressBar.ts         Reusable (invariato)
    CrowdCounter.ts        🆕 HUD Phaser che mostra count folla con animazione
    BossHealthBar.ts       🆕 HUD Phaser per HP del muro finale
  /systems
    ScoreSystem.ts         Score: clone × distanza + bonus gate ottimali
    DifficultySystem.ts    Aumenta spawn rate, range valori, velocità
    SpawnSystem.ts         Obstacle/gate spawner (guidato da DifficultySystem)
    CrowdSystem.ts         🆕 Gestisce count, formazione, aggiunte/rimozioni
    GateSystem.ts          🆕 Risolve collisioni folla↔gate, applica operazioni
    ObstacleSystem.ts      🆕 Collisioni con rocce/lame/muri
    LevelSystem.ts         🆕 Sequenzia fasi (early/mid/late), trigger boss wall
  /world
    Track.ts               🆕 Genera segmenti di pista 3D (modular GLTF)
    Environment.ts         🆕 Skybox + fog + decorazioni parallax
    Camera3D.ts            🆕 Camera follow con lead & smoothing
  /data
    gameConfig.ts          Config generale (titoli, colori, debug)
    balancing.ts           GATE_CONFIG, CROWD_CAPS, BOSS_WALL_HP, SPEED_RAMP
    levels.ts              🆕 Definizione fasi e milestone
  /utils
    helpers.ts             random/clamp/format
    mathGate.ts            🆕 applyGateOp(count, op, value) + test unitari
  main.ts                  Bootstrap Phaser + PokiPlugin
/public
  /assets
    /models                .glb/.gltf: clone.glb, track_segment_*.glb, gate.glb, boss_wall.glb
    /textures              PBR maps (albedo, normal, roughness)
    /audio                 gate_add.ogg, gate_mul.ogg, gate_sub.ogg, crowd_run.ogg, crash.ogg
    /ui                    button spritesheet, font bitmap
```

### 6.1 Quick start

```bash
git clone https://github.com/tatosgames/phaser-poki-crowd-runner.git
cd phaser-poki-crowd-runner
npm install
npm run dev
```

Apri `http://localhost:3000`.

### 6.2 Interface `ICrowdRenderer`

Per mantenere il renderer disaccoppiato (facilita test, sostituzione e unit-testing dei systems senza WebGL), `GameScene` consuma un'interfaccia:

```ts
export interface ICrowdRenderer {
  init(container: HTMLElement, config: RendererConfig): Promise<void>
  setCrowdCount(n: number): void
  addGate(spec: GateSpec, worldX: number, worldZ: number): void
  addObstacle(spec: ObstacleSpec, worldZ: number): void
  update(dt: number): void
  destroy(): void
}
```

L'implementazione default è `ThreeRenderer`. Un `MockRenderer` in `/tests` permette di girare la logica di gameplay headless.

---

## 7. Progressione & Balancing

### 7.1 Fasi per run (tempo continuo)
| Fase | Durata | Velocità | Spawn rate gate | Difficoltà |
|---|---|---|---|---|
| Early | 0–20 s | 1.0× | 1 ogni 6 s | Facile, gate `+` dominanti |
| Mid | 20–45 s | 1.25× | 1 ogni 4 s | `×` e `÷` più frequenti |
| Late | 45–60 s | 1.5× | 1 ogni 3 s | Ostacoli doppi, gate trappola |
| Boss | 60+ s | 1.5× | nessun gate | Muro finale con HP proporzionale |

### 7.2 Formula boss HP
```
bossHP = 50 + (runNumber × 30) + levelBonus
```
Scala con `runNumber` salvato in `SaveManager` per dare progressione meta.

### 7.3 Scoring
```
score = distanceMeters × 1 + bonusOptimalGates × 10 + bossDefeatBonus × 100
```
- `bonusOptimalGates`: +10 ogni volta che il giocatore sceglie il gate migliore
- `bossDefeatBonus`: 100 se abbatti il muro, 0 altrimenti

### 7.4 Retention loop
- **First session**: tutorial silenzioso (solo frecce pulsanti sul primo gate).
- **Session 2+**: contatore "Best: N" in Menu per farmare PB.
- **Hook Poki rewarded ad**: in ResultScene, bottone "Revive" → richiama `poki.rewardedBreak()`, se true ricompare col 50% della folla pre-morte.

---

## 8. Poki SDK Integration

Come nello starter, `PokiPlugin` è registrato in `main.ts`. Il plugin invia automaticamente:
- `gameLoadingFinished` al termine di `PreloadScene` (inclusi asset 3D!)
- `gameplayStart` su `GameScene`
- `gameplayStop` su transizione a `ResultScene`

**Commercial breaks**: `autoCommercialBreak: true` → Poki mostra pubblicità tra le run. Non serve chiamata manuale.

**Rewarded in `ResultScene.ts`**:

```ts
const poki = this.plugins.get('poki') as PokiPlugin
reviveButton.on('pointerdown', async () => {
  const rewarded = await poki.rewardedBreak()
  if (rewarded) this.scene.start('GameScene', { revive: true })
})
```

**Analytics custom** (opzionale): inviare `customEvent('gate_choice', { optimal: true })` per capire il tasso di ottimalità medio e ri-bilanciare.

---

## 9. Asset Pipeline

### 9.1 Modelli 3D
- Formato: **glTF 2.0 binary (.glb)**, caricato con `GLTFLoader` di Three.js
- Tool: Blender 4.x, export con compressione **Draco** (geometry) + **KTX2/Basis** (texture)
- Budget poly per clone: ≤ 300 tris (LOD0), ≤ 80 tris (LOD1), billboard 2 tris
- Rig: skeletale semplice (8 bone), 1 clip "run" @ 24 fps. In alternativa VAT (texture di vertex animation) per consentire istanziamento massivo senza `SkinnedMesh` multipli
- Texture: 512×512 albedo KTX2 + 256×256 normal. PBR roughness baked
- Verifica asset con [glTF Validator](https://github.khronos.org/glTF-Validator/) in CI

### 9.2 Audio
- Formato: **.ogg** (fallback .m4a per iOS Safari legacy)
- Sample rate: 44.1 kHz mono per SFX, stereo per BGM
- Loudness target: −18 LUFS integrated
- Library: SFX procedurali via [jsfxr](https://sfxr.me/) per prototipo, sostituibili con asset finali

### 9.3 UI
- Bitmap font (~16 KB) per numero clone (leggibile a distanza)
- Button sprite atlas 512×512

---

## 10. Build & Deploy

```bash
npm run typecheck   # type check strict
npm run build       # produce dist/
npm run preview     # test della build locale
```

**Upload su Poki**:
1. Zippa il contenuto di `dist/` (non la cartella!)
2. Upload via [Poki for Developers](https://developers.poki.com)
3. Compila metadata (cover 512×384, orientamento portrait, tag: math, runner, crowd, 3d)

**Ottimizzazioni build consigliate**:
- Abilitare Draco decoder via CDN invece che inline (risparmia ~200 KB): `dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')`.
- Usare **KTX2** per le texture (compressione GPU, 5–10× più leggera di PNG): `KTX2Loader` + Basis transcoder via CDN.
- `assetsInclude: ['**/*.glb', '**/*.ktx2']` in `vite.config.ts`.
- Tree-shaking Three.js: importare da `'three'` solo i simboli usati; `manualChunks` in Rollup per splittare `three` in chunk dedicato lazy-loaded dopo il menu.
- Evitare `OrbitControls` e altri `three/examples/jsm` non necessari; mantenere solo `GLTFLoader`, `DRACOLoader`, `KTX2Loader`.

---

## 11. Roadmap

| Milestone | Deliverable |
|---|---|
| **M0 — Setup** | Phaser + Three.js integrati (dual-canvas), render di un cubo nella GameScene |
| **M1 — Crowd base** | CrowdSystem con add/remove, formation circolare, 1 clone animato |
| **M2 — Track + camera** | Pista generata a segmenti, camera follow, input laterale |
| **M3 — Gate v1** | GateSystem con +/−, collisioni, HUD count |
| **M4 — Ostacoli** | ObstacleSystem + 3 tipi base; death on zero |
| **M5 — Boss wall** | Muro con HP, physics dei clone contro muro |
| **M6 — Moltiplicazione/divisione** | Gate × e ÷, bilanciamento pairing |
| **M7 — Polish** | Particelle, shake, BGM dinamico, sound design |
| **M8 — Poki submission** | Ad hook, revive, cover art, submission |

Tempo stimato M0→M8: **6–8 settimane** da solo dev full-time.

---

## 12. Open Questions / Risks

- **Perf Three.js su mobile low-end**: da validare con stress test a 500 clone via `InstancedMesh`. Contingency: LOD billboard aggressivo e cap a 300 invece di 999. Usare `frustumCulled` a livello di gate/ostacoli.
- **Animazione skinned instanziata**: `SkinnedMesh` + `InstancedMesh` nativo in Three non supportato cleanly. Piano A: VAT (Vertex Animation Texture) — un clone animato con texture di offset vertici. Piano B: 1 `SkinnedMesh` per clone fino a soglia (50), poi billboard animati. Piano C: libreria `three-instanced-mesh-animation`.
- **Conflitti canvas dual Phaser+Three**: il compositing via CSS z-index funziona, ma input passthrough su iOS Safari richiede testing dedicato. Alternativa: single canvas con Three.js che renderizza anche l'HUD (sprite 2D in NDC) e Phaser usato solo per scene flow + audio + save.
- **Bundle size**: Three.js + glTF + Phaser rischiano di sforare gli 8 MB. Piano B: tree-shaking aggressivo, KTX2 per texture, Draco per geometry, code splitting Three in chunk lazy.
- **Draco decoder**: su Safari vecchio fallisce — fallback a meshopt (`three/examples/jsm/libs/meshopt_decoder`) o glTF non compresso per device blacklistati via UA sniffing.
- **Context WebGL loss**: su mobile il browser può killare il context in background. Implementare `renderer.forceContextRestore()` e ri-upload delle risorse via `GLTFLoader` cache.

---

## 13. License

MIT — usa liberamente per progetti commerciali o personali.

---

**Maintainer**: [tatosgames](https://github.com/tatosgames)
**Starter**: [phaser-poki-starter](https://github.com/tatosgames/phaser-poki-starter)
