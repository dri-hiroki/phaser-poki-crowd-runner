/**
 * main.ts
 * Bootstrap: PixiJS app (HUD/screens) + ThreeRenderer (3D world).
 * PixiJS canvas sits on top (z-index 1) with transparent background.
 * Three.js canvas sits behind (z-index 0), inserted first into #game-container.
 */

import * as PIXI from 'pixi.js'

import { ScreenManager } from './core/ScreenManager'
import { BootScreen } from './screens/BootScreen'
import { PreloadScreen } from './screens/PreloadScreen'
import { MenuScreen } from './screens/MenuScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ScaleManager } from './core/ScaleManager'
import { PokiBridge } from './lib/poki/PokiBridge'

async function init() {
  const container = document.getElementById('game-container')!

  // ── PixiJS (HUD + screens layer) ──────────────────────────────────────────
  const app = new PIXI.Application()
  await app.init({
    resizeTo: window,
    backgroundAlpha: 0,          // transparent — Three.js shows through
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  // Give the PixiJS canvas an id so CSS can target it
  app.canvas.id = 'pixi-canvas'
  container.appendChild(app.canvas)

  // ── Screen routing ────────────────────────────────────────────────────────
  const screenManager = new ScreenManager(app)
  screenManager.register('BootScreen', new BootScreen(screenManager))
  screenManager.register('PreloadScreen', new PreloadScreen(screenManager))
  screenManager.register('MenuScreen', new MenuScreen(screenManager))
  screenManager.register('GameScreen', new GameScreen(screenManager))
  screenManager.register('ResultScreen', new ResultScreen(screenManager))

  app.ticker.add(() => {
    screenManager.update(app.ticker.deltaMS)
  })

  // ── Scale + orientation ───────────────────────────────────────────────────
  ScaleManager.init(app.canvas, screenManager)

  // ── Start ─────────────────────────────────────────────────────────────────
  await PokiBridge.init()
  screenManager.goTo('BootScreen')
}

init()
