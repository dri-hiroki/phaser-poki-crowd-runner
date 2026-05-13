export class PRNG {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? this.hashString(seed) : seed;
    // ensure state is non-zero
    if (this.state === 0) this.state = 1;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return hash;
  }

  /** Returns a float between 0 (inclusive) and 1 (exclusive) based on Mulberry32 */
  public random(): number {
    this.state |= 0;
    this.state = this.state + 0x6D2B79F5 | 0;
    let t = Math.imul(this.state ^ this.state >>> 15, 1 | this.state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  public intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(arr: T[]): T {
    return arr[this.intRange(0, arr.length - 1)];
  }
}
