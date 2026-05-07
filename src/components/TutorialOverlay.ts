import * as PIXI from 'pixi.js'

export class TutorialOverlay extends PIXI.Container {
  public static hasShownThisSession = false

  private hand!: PIXI.Text
  private ghostContainer!: PIXI.Container
  private helperText!: PIXI.Text
  private subHelperText!: PIXI.Text

  private timeMs: number = 0
  private loops: number = 0
  private state: 'animating' | 'fading' | 'done' = 'animating'

  private lastSpawnX: number = 0
  private direction: 1 | -1 = -1 // Starts moving left

  private readonly CYCLE_DURATION_MS = 2400
  private readonly MAX_LOOPS = 3
  private readonly SWIPE_DISTANCE = 100

  constructor() {
    super()

    this.ghostContainer = new PIXI.Container()
    this.addChild(this.ghostContainer)

    const handStyle = new PIXI.TextStyle({
      fontSize: 80,
      fontFamily: 'Arial, sans-serif'
    })
    this.hand = new PIXI.Text({ text: '👆', style: handStyle })
    this.hand.anchor.set(0.5, 0.9) // Anchor near the pointer tip
    this.addChild(this.hand)

    const helperStyle = new PIXI.TextStyle({
      fill: 0xffffff,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      dropShadow: { color: 0x000000, alpha: 0.5, blur: 4, distance: 2 }
    })
    this.helperText = new PIXI.Text({ text: 'SWIPE TO MOVE', style: helperStyle })
    this.helperText.anchor.set(0.5)
    this.addChild(this.helperText)

    const subHelperStyle = new PIXI.TextStyle({
      fill: 0xaaaacc,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 1 }
    })
    this.subHelperText = new PIXI.Text({ text: '← move left | move right →', style: subHelperStyle })
    this.subHelperText.anchor.set(0.5)
    this.addChild(this.subHelperText)

    TutorialOverlay.hasShownThisSession = true
  }

  public dismiss(): void {
    if (this.state === 'animating') {
      this.state = 'fading'
    }
  }

  public update(deltaMs: number): void {
    if (this.state === 'done') return

    if (this.state === 'fading') {
      this.alpha -= (deltaMs / 300) // 300ms fade
      this.scale.set(this.scale.x * 0.95)
      if (this.alpha <= 0) {
        this.alpha = 0
        this.visible = false
        this.state = 'done'
      }
      return
    }

    this.timeMs += deltaMs

    // Progress through cycle: 0.0 to 1.0
    const progress = (this.timeMs % this.CYCLE_DURATION_MS) / this.CYCLE_DURATION_MS
    
    // Smooth Sine wave for left/right ease
    const sineVal = Math.sin(progress * Math.PI * 2)
    const currentX = sineVal * this.SWIPE_DISTANCE

    // Determine direction and loops
    const currentDir = currentX > this.hand.x ? 1 : -1
    if (currentDir !== this.direction) {
      this.direction = currentDir
      if (currentDir === -1) {
        this.loops++
        if (this.loops >= this.MAX_LOOPS) {
          this.dismiss()
          return
        }
      }
      
      // Slight squash/stretch on direction change
      this.hand.scale.set(0.8, 1.2)
      this.spawnPulse()
    } else {
      // Recover scale smoothly
      this.hand.scale.x += (1 - this.hand.scale.x) * 0.1
      this.hand.scale.y += (1 - this.hand.scale.y) * 0.1
    }

    // Apply positions
    this.hand.x = currentX
    this.hand.y = Math.cos(progress * Math.PI * 4) * 8 // subtle vertical bob

    // Ghost trail
    if (Math.abs(this.hand.x - this.lastSpawnX) > 15) {
      this.spawnGhost(this.hand.x, this.hand.y)
      this.lastSpawnX = this.hand.x
    }

    // Update ghosts
    for (let i = this.ghostContainer.children.length - 1; i >= 0; i--) {
      const ghost = this.ghostContainer.children[i]
      ghost.alpha -= deltaMs / 400 // fade over 400ms
      ghost.scale.x *= 0.9
      ghost.scale.y *= 0.9
      if (ghost.alpha <= 0) {
        ghost.destroy()
      }
    }
  }

  private spawnGhost(x: number, y: number) {
    const ghostStyle = new PIXI.TextStyle({ fontSize: 80, fontFamily: 'Arial, sans-serif' })
    const ghost = new PIXI.Text({ text: '👆', style: ghostStyle })
    ghost.anchor.set(0.5, 0.9)
    ghost.position.set(x, y)
    ghost.alpha = 0.3
    this.ghostContainer.addChild(ghost)
  }

  private spawnPulse() {
    const pulse = new PIXI.Graphics()
    pulse.circle(0, 0, 40)
    pulse.fill({ color: 0xffffff, alpha: 0.4 })
    pulse.position.set(this.hand.x, this.hand.y - 40)
    this.ghostContainer.addChild(pulse)

    const ticker = PIXI.Ticker.shared
    const updatePulse = () => {
      if (pulse.destroyed) {
        ticker.remove(updatePulse)
        return
      }
      pulse.scale.x += 0.05
      pulse.scale.y += 0.05
      pulse.alpha -= 0.05
      if (pulse.alpha <= 0) {
        pulse.destroy()
        ticker.remove(updatePulse)
      }
    }
    ticker.add(updatePulse)
  }

  public resize(width: number, height: number): void {
    const cx = width / 2
    const cy = height / 2

    // Position above center
    this.position.set(cx, cy - 80)
    
    // Position helper texts relative to hand center
    this.helperText.position.set(0, 100)
    this.subHelperText.position.set(0, 130)
  }

  public isDone(): boolean {
    return this.state === 'done'
  }
}
