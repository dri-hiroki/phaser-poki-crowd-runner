/**
 * ThreeRenderer.ts
 * Wraps Three.js WebGLRenderer, Scene, and Camera.
 * Mounted BEHIND the PixiJS canvas (z-index 0) inside #game-container.
 *
 * Implements ICrowdRenderer — the interface consumed by GameScreen.
 *
 * Milestones:
 *   M0  – spinning debug cube as proof of dual-canvas
 *   M2  – InstancedMesh crowd formation
 *   M3  – Track recycler, Camera3D follow, Environment fog
 *   M4  – Math gates (coloured frames + text sprites)
 *   M5  – Obstacles (rock / blade / wall)
 *   M6  – Boss wall with HP bar
 *   M8  – Camera shake, gate flash, crowd pop
 */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  BoxGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  Mesh,
  Color,
  FogExp2,
  InstancedMesh,
  Object3D,
  Vector3,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  CanvasTexture,
  SpriteMaterial,
  Sprite
} from 'three'

import type { GateSpec } from '../utils/mathGate'
import type { ObstacleType } from '../systems/ObstacleSystem'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ICrowdRenderer {
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
  setViewport(yOffsetFactor: number, heightFactor: number): void
  update(dt: number): void
  destroy(): void
}

// ─── Gate colours ─────────────────────────────────────────────────────────────

const GATE_COLORS: Record<string, number> = {
  add: 0x27ae60,
  sub: 0xe74c3c,
  mul: 0xf39c12,
  div: 0x9b59b6
}

// ─── Utility: text sprite ─────────────────────────────────────────────────────

function makeTextSprite(text: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 64)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 32)
  const texture = new CanvasTexture(canvas)
  const mat = new SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new Sprite(mat)
  sprite.scale.set(2, 1, 1)
  return sprite
}

// ─── ThreeRenderer ────────────────────────────────────────────────────────────

export class ThreeRenderer implements ICrowdRenderer {

  // Core Three.js objects
  private renderer!: WebGLRenderer
  private scene!: Scene
  private camera!: PerspectiveCamera

  // World state
  private crowdX: number = 0
  private crowdZ: number = 0

  // M0 debug cube (removed when real crowd spawns)
  private debugCube?: Mesh
  private debugAngle: number = 0

  // M2 crowd instances
  private crowdMesh?: InstancedMesh
  private _crowdCount: number = 0
  private readonly _dummy = new Object3D()

  // M3 track recycler
  private trackSegments: Mesh[] = []
  private readonly SEG_LEN = 20
  private readonly TRACK_W = 8
  private readonly SEG_COUNT = 14

  // M4 gates
  private gates = new Map<string, { group: Object3D; flashTimer: number }>()

  // M5 obstacles
  private obstacles = new Map<string, { mesh: Object3D; type: ObstacleType; rotTimer: number }>()

  // M6 boss wall
  private bossWallMesh?: Mesh
  private bossWallHpBar?: Mesh

  // M8 camera shake
  private shakeTimer: number = 0
  private readonly SHAKE_DUR = 0.25
  private readonly SHAKE_MAG = 0.18

  // Viewport
  private viewportYOffsetFactor: number = 0
  private viewportHeightFactor: number = 1

  // ─── init ──────────────────────────────────────────────────────────────────

  init(container: HTMLElement, width: number, height: number): void {
    // WebGL renderer
    this.renderer = new WebGLRenderer({ antialias: false, alpha: false })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = false
    this.renderer.domElement.id = 'three-canvas'
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.top = '0'
    this.renderer.domElement.style.left = '0'
    this.renderer.domElement.style.zIndex = '0'
    this.renderer.domElement.style.width = `${width}px`
    this.renderer.domElement.style.height = `${height}px`

    // Insert before PixiJS canvas so it sits behind
    container.insertBefore(this.renderer.domElement, container.firstChild)

    // Scene
    this.scene = new Scene()
    this.scene.background = new Color(0x87ceeb)
    this.scene.fog = new FogExp2(0x87ceeb, 0.035)

    // Camera — starts behind and above origin
    this.camera = new PerspectiveCamera(60, width / height, 0.1, 300)
    this.camera.position.set(0, 6, 12)
    this.camera.lookAt(new Vector3(0, 0.5, -10))

    // Lights
    const ambient = new AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const sun = new DirectionalLight(0xffffff, 1.0)
    sun.position.set(5, 15, 10)
    this.scene.add(sun)

    // Track
    this._buildTrack()

    // M0 debug cube proof
    this._buildDebugCube()
  }

  // ─── M0 debug cube ────────────────────────────────────────────────────────

  private _buildDebugCube(): void {
    const geo = new BoxGeometry(1, 1, 1)
    const mat = new MeshLambertMaterial({ color: 0xff6600 })
    this.debugCube = new Mesh(geo, mat)
    this.debugCube.position.set(0, 1.5, -5)
    this.scene.add(this.debugCube)
  }

  private _removeDebugCube(): void {
    if (this.debugCube) {
      this.scene.remove(this.debugCube)
      this.debugCube.geometry.dispose()
      this.debugCube = undefined
    }
  }

  // ─── M3 track ────────────────────────────────────────────────────────────

  private _buildTrack(): void {
    const mat = new MeshLambertMaterial({ color: 0x555566 })
    for (let i = 0; i < this.SEG_COUNT; i++) {
      const geo = new PlaneGeometry(this.TRACK_W, this.SEG_LEN)
      const mesh = new Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(0, 0, -(i * this.SEG_LEN))
      this.scene.add(mesh)
      this.trackSegments.push(mesh)
    }
  }

  private _updateTrack(): void {
    const camZ = this.crowdZ
    for (const seg of this.trackSegments) {
      if (seg.position.z > camZ + this.SEG_LEN * 2) {
        const minZ = Math.min(...this.trackSegments.map(s => s.position.z))
        seg.position.z = minZ - this.SEG_LEN
      }
    }
  }

  // ─── M3 camera ───────────────────────────────────────────────────────────

  private _updateCamera(): void {
    const lerpFactor = 0.10
    const targetX = this.crowdX
    const targetY = 6
    const targetZ = this.crowdZ + 12

    this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor
    this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor
    this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor

    this.camera.lookAt(new Vector3(targetX, 0.5, this.crowdZ - 10))
  }

  // ─── ICrowdRenderer: crowd (M2) ──────────────────────────────────────────

  setCrowdCount(n: number, positions: Array<{ x: number; z: number }>): void {
    const count = Math.max(1, Math.min(999, n))

    if (this.debugCube) this._removeDebugCube()

    // Rebuild InstancedMesh if count changed
    if (!this.crowdMesh || this._crowdCount !== count) {
      if (this.crowdMesh) {
        this.scene.remove(this.crowdMesh)
        this.crowdMesh.geometry.dispose()
      }
      const geo = new BoxGeometry(0.28, 0.75, 0.28)
      const mat = new MeshLambertMaterial({ color: 0x4a90d9 })
      this.crowdMesh = new InstancedMesh(geo, mat, count)
      this.crowdMesh.frustumCulled = false
      this.scene.add(this.crowdMesh)
      this._crowdCount = count
    }

    // Update instance matrices
    const len = Math.min(positions.length, count)
    for (let i = 0; i < len; i++) {
      this._dummy.position.set(
        this.crowdX + positions[i].x,
        0.375,
        this.crowdZ + positions[i].z
      )
      this._dummy.scale.setScalar(1)
      this._dummy.rotation.set(0, 0, 0)
      this._dummy.updateMatrix()
      this.crowdMesh.setMatrixAt(i, this._dummy.matrix)
    }
    this.crowdMesh.instanceMatrix.needsUpdate = true
  }

  setCrowdPosition(worldX: number, worldZ: number): void {
    this.crowdX = worldX
    this.crowdZ = worldZ
  }

  // ─── ICrowdRenderer: gates (M4) ──────────────────────────────────────────

  addGate(id: string, spec: GateSpec, worldZ: number, worldX: number): void {
    if (this.gates.has(id)) return

    const color = GATE_COLORS[spec.op] ?? 0xffffff
    const group = new Object3D()

    const geo  = new BoxGeometry(1.5, 3.5, 0.25)
    const mat  = new MeshLambertMaterial({ color })
    const frame = new Mesh(geo, mat)
    group.add(frame)

    const opSymbol = spec.op === 'add' ? '+' : spec.op === 'sub' ? '−' : spec.op === 'mul' ? '×' : '÷'
    const sprite = makeTextSprite(`${opSymbol}${spec.value}`)
    sprite.position.set(0, 0.5, 0.2)
    group.add(sprite)

    group.position.set(worldX, 1.75, worldZ)
    this.scene.add(group)

    this.gates.set(id, { group, flashTimer: 0 })
  }

  removeGate(id: string): void {
    const entry = this.gates.get(id)
    if (!entry) return
    this.scene.remove(entry.group)
    this.gates.delete(id)
  }

  flashGate(id: string): void {
    const entry = this.gates.get(id)
    if (entry) entry.flashTimer = 0.15
  }

  private _updateGates(dtSec: number): void {
    for (const [, entry] of this.gates) {
      if (entry.flashTimer > 0) {
        entry.flashTimer = Math.max(0, entry.flashTimer - dtSec)
        const frame = entry.group.children[0] as Mesh
        const mat = frame.material as MeshLambertMaterial
        mat.emissive.setHex(entry.flashTimer > 0 ? 0xffffff : 0x000000)
        mat.emissiveIntensity = entry.flashTimer > 0 ? 1.5 : 0
      }
    }
  }

  // ─── ICrowdRenderer: obstacles (M5) ──────────────────────────────────────

  addObstacle(id: string, type: ObstacleType, worldZ: number, worldX: number): void {
    if (this.obstacles.has(id)) return

    let mesh: Mesh
    if (type === 'rock') {
      const mat = new MeshLambertMaterial({ color: 0x8e5e3b })
      mesh = new Mesh(new SphereGeometry(0.6, 7, 7), mat)
      mesh.position.set(worldX, 0.6, worldZ)
    } else if (type === 'blade') {
      const mat = new MeshLambertMaterial({ color: 0xaaaaaa })
      mesh = new Mesh(new CylinderGeometry(0.08, 0.08, 2.2, 6), mat)
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(worldX, 0.9, worldZ)
    } else {
      // wall — partial barrier
      const mat = new MeshLambertMaterial({ color: 0xcc4444 })
      mesh = new Mesh(new BoxGeometry(2.5, 2.5, 0.4), mat)
      mesh.position.set(worldX, 1.25, worldZ)
    }

    this.scene.add(mesh)
    this.obstacles.set(id, { mesh, type, rotTimer: 0 })
  }

  removeObstacle(id: string): void {
    const entry = this.obstacles.get(id)
    if (!entry) return
    this.scene.remove(entry.mesh)
    this.obstacles.delete(id)
  }

  private _updateObstacles(dtSec: number): void {
    for (const [, entry] of this.obstacles) {
      if (entry.type === 'blade') {
        entry.mesh.rotation.z += dtSec * 5
      }
    }
  }

  // ─── ICrowdRenderer: shake (M8) ──────────────────────────────────────────

  triggerShake(): void {
    this.shakeTimer = this.SHAKE_DUR
  }

  // ─── ICrowdRenderer: boss wall (M6) ──────────────────────────────────────

  showBossWall(_hp: number, maxHp: number, worldZ: number): void {
    this.hideBossWall()

    const wallMat = new MeshLambertMaterial({ color: 0x222266 })
    this.bossWallMesh = new Mesh(new BoxGeometry(this.TRACK_W, 4, 0.6), wallMat)
    this.bossWallMesh.position.set(0, 2, worldZ)
    this.scene.add(this.bossWallMesh)

    const barMat = new MeshBasicMaterial({ color: 0x00cc44 })
    this.bossWallHpBar = new Mesh(new BoxGeometry(this.TRACK_W, 0.3, 0.7), barMat)
    this.bossWallHpBar.position.set(0, 4.3, worldZ)
    this.scene.add(this.bossWallHpBar)

    void maxHp  // used by bossWallHpBar scale
  }

  updateBossWall(hpFraction: number): void {
    if (!this.bossWallHpBar) return
    const f = Math.max(0, Math.min(1, hpFraction))
    this.bossWallHpBar.scale.x = f
    // Shift left so it shrinks from the right
    this.bossWallHpBar.position.x = -(this.TRACK_W * (1 - f)) / 2
    // Colour: green → red
    const mat = this.bossWallHpBar.material as MeshBasicMaterial
    mat.color.setRGB(1 - f, f * 0.8, 0)
  }

  hideBossWall(): void {
    if (this.bossWallMesh) { this.scene.remove(this.bossWallMesh); this.bossWallMesh = undefined }
    if (this.bossWallHpBar) { this.scene.remove(this.bossWallHpBar); this.bossWallHpBar = undefined }
  }

  // ─── Accessor ────────────────────────────────────────────────────────────

  getWorldZ(): number { return this.crowdZ }

  setViewport(yOffsetFactor: number, heightFactor: number): void {
    this.viewportYOffsetFactor = yOffsetFactor
    this.viewportHeightFactor = heightFactor
  }

  // ─── Main update ─────────────────────────────────────────────────────────

  update(dt: number): void {
    const dtSec = dt / 1000

    // Debug cube spin (M0)
    if (this.debugCube) {
      this.debugAngle += dtSec * 1.2
      this.debugCube.rotation.x = this.debugAngle
      this.debugCube.rotation.y = this.debugAngle * 0.7
    }

    // Camera shake
    let shakeX = 0; let shakeY = 0
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dtSec)
      shakeX = (Math.random() - 0.5) * this.SHAKE_MAG
      shakeY = (Math.random() - 0.5) * this.SHAKE_MAG * 0.5
    }

    this._updateCamera()
    this.camera.position.x += shakeX
    this.camera.position.y += shakeY

    this._updateTrack()
    this._updateGates(dtSec)
    this._updateObstacles(dtSec)

    // Apply viewport restriction
    const w = this.renderer.domElement.width / this.renderer.getPixelRatio()
    const h = this.renderer.domElement.height / this.renderer.getPixelRatio()
    
    // Three.js Y is from bottom
    const vx = 0
    const vy = (1 - this.viewportYOffsetFactor - this.viewportHeightFactor) * h
    const vw = w
    const vh = h * this.viewportHeightFactor

    this.renderer.setViewport(vx, vy, vw, vh)
    this.renderer.setScissor(vx, vy, vw, vh)
    this.renderer.setScissorTest(this.viewportHeightFactor < 1)

    // Update aspect ratio so scaling is undistorted
    this.camera.aspect = vw / vh
    this.camera.updateProjectionMatrix()

    this.renderer.render(this.scene, this.camera)
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
    this.gates.clear()
    this.obstacles.clear()
  }
}
