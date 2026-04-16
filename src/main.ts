/**
 * main.ts
 * PixiJS game bootstrap.
 */

import * as PIXI from 'pixi.js'

import { ScreenManager } from './core/ScreenManager'
import { BootScreen } from './screens/BootScreen'
import { PreloadScreen } from './screens/PreloadScreen'
import { MenuScreen } from './screens/MenuScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ScaleManager } from './core/ScaleManager'
import { GAME_CONFIG } from './data/gameConfig'

async function init() {
  const app = new PIXI.Application()
  await app.init({
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    backgroundColor: GAME_CONFIG.backgroundColor,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  const container = document.getElementById('game-container')
  if (container) {
    container.appendChild(app.canvas)
  }

  const screenManager = new ScreenManager(app)
  screenManager.register('BootScreen', new BootScreen(screenManager))
  screenManager.register('PreloadScreen', new PreloadScreen(screenManager))
  screenManager.register('MenuScreen', new MenuScreen(screenManager))
  screenManager.register('GameScreen', new GameScreen(screenManager))
  screenManager.register('ResultScreen', new ResultScreen(screenManager))

  app.ticker.add(() => {
    screenManager.update(app.ticker.deltaMS)
  })

  // Start ScaleManager and link to ScreenManager
  ScaleManager.init(app.canvas, screenManager)

  // Start with BootScreen
  screenManager.goTo('BootScreen')
}

init()
