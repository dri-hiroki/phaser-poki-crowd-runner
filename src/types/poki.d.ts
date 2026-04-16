/**
 * Type declarations for the global window.PokiSDK object.
 */

declare global {
  interface Window {
    PokiSDK: {
      init(): Promise<void>
      gameLoadingFinished(): void
      gameplayStart(): void
      gameplayStop(): void
      commercialBreak(): Promise<void>
      rewardedBreak(): Promise<boolean>
    }
  }
}

export {}
