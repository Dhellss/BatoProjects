
class HungerSystem {
  constructor(maxGreed = 100, baseDrainPerSecond = 4) {
    this.maxGreed = maxGreed;
    this.baseDrainPerSecond = baseDrainPerSecond;
    this.greed = maxGreed;
  }

  reset() {
    this.greed = this.maxGreed;
  }

  /**
   * @param {number} dtSeconds - delta time in seconds
   * @param {number} drainMult - difficulty-based multiplier on passive drain
   */
  update(dtSeconds, drainMult = 1) {
    this.greed -= this.baseDrainPerSecond * drainMult * dtSeconds;
    this.clamp();
  }

  change(amount) {
    this.greed += amount;
    this.clamp();
  }

  clamp() {
    if (this.greed > this.maxGreed) this.greed = this.maxGreed;
    if (this.greed < 0) this.greed = 0;
  }

  isDepleted() {
    return this.greed <= 0;
  }

  getPercent() {
    return this.greed / this.maxGreed;
  }
}
