import { Screen } from '../core/Screen'
import { AudioManager } from '../core/AudioManager'
import { BALANCING } from '../data/balancing'

export class BootScreen extends Screen {
  async enter() {
    AudioManager.init(this)

    // Short delay as defined in original logic
    setTimeout(() => {
      this.screenManager.goTo('PreloadScreen')
    }, BALANCING.bootDelay)
  }

  async exit() {}
  update(_delta: number) {}
  resize(_width: number, _height: number) {}
}
