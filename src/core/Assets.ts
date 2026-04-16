/**
 * Assets.ts
 * Global registry for loaded or procedurally generated Pixi textures.
 */

import * as PIXI from 'pixi.js'

export class AssetRegistry {
  public static textures: Record<string, PIXI.Texture> = {}

  public static async generatePlaceholderTextures(app: PIXI.Application) {
    // Player — blue rounded square
    const playerGfx = new PIXI.Graphics()
    playerGfx.roundRect(0, 0, 48, 48, 10)
    playerGfx.fill({ color: 0x4a90d9 })
    this.textures['player'] = app.renderer.generateTexture(playerGfx)

    // Enemy — red rounded square
    const enemyGfx = new PIXI.Graphics()
    enemyGfx.roundRect(0, 0, 40, 40, 8)
    enemyGfx.fill({ color: 0xe74c3c })
    this.textures['enemy'] = app.renderer.generateTexture(enemyGfx)

    // Coin / collectible — gold circle
    const coinGfx = new PIXI.Graphics()
    coinGfx.circle(16, 16, 16)
    coinGfx.fill({ color: 0xf1c40f })
    this.textures['coin'] = app.renderer.generateTexture(coinGfx)

    // Particle — small white dot
    const particleGfx = new PIXI.Graphics()
    particleGfx.circle(4, 4, 4)
    particleGfx.fill({ color: 0xffffff, alpha: 0.8 })
    this.textures['particle'] = app.renderer.generateTexture(particleGfx)
  }
}
