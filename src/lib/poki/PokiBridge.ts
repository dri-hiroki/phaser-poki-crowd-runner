/**
 * PokiBridge.ts
 * A wrapper for the Poki SDK to prevent duplicate events and provide structured logging.
 */

export class PokiBridge {
  private static isGameplayActive = false;
  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    
    if (window.PokiSDK) {
      try {
        await window.PokiSDK.init();
        this.log('init', 'success');
        this.isInitialized = true;
      } catch (err) {
        this.log('init', 'error', err);
      }
    } else {
      this.log('init', 'skipped (no SDK)');
    }
  }

  public static gameLoadingFinished(): void {
    if (window.PokiSDK) {
      window.PokiSDK.gameLoadingFinished();
    }
    this.log('gameLoadingFinished');
  }

  public static gameplayStart(reason: string = 'start'): void {
    if (this.isGameplayActive) {
      this.log('gameplayStart', `skipped (already active) [${reason}]`);
      return;
    }

    this.isGameplayActive = true;
    if (window.PokiSDK) {
      window.PokiSDK.gameplayStart();
    }
    this.log('gameplayStart', reason);
  }

  public static gameplayStop(reason: string = 'stop'): void {
    if (!this.isGameplayActive) {
      this.log('gameplayStop', `skipped (already stopped) [${reason}]`);
      return;
    }

    this.isGameplayActive = false;
    if (window.PokiSDK) {
      window.PokiSDK.gameplayStop();
    }
    this.log('gameplayStop', reason);
  }

  public static async commercialBreak(reason: string = 'commercial'): Promise<void> {
    this.log('commercialBreak', reason);
    if (window.PokiSDK) {
      await window.PokiSDK.commercialBreak();
    }
  }

  public static async rewardedBreak(reason: string = 'reward'): Promise<boolean> {
    this.log('rewardedBreak', reason);
    if (window.PokiSDK) {
      return await window.PokiSDK.rewardedBreak();
    }
    return false; // Simulate failure if no SDK
  }

  private static log(eventName: string, reason?: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      const msg = reason ? `[${eventName}] ${reason}` : `[${eventName}]`;
      console.info('[PokiSDK]', msg, Date.now(), ...args);
    }
  }
}
