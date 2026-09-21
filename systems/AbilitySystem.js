
class AbilitySystem {
  constructor(abilityDef) {
    this.def = abilityDef; // { id, name, description, duration, multiplier, cooldown }
    this.active = false;
    this.timeRemaining = 0;
    this.cooldownRemaining = 0;
  }

  setAbility(abilityDef) {
    this.def = abilityDef;
    this.active = false;
    this.timeRemaining = 0;
    this.cooldownRemaining = 0;
  }

  reset() {
    this.active = false;
    this.timeRemaining = 0;
    this.cooldownRemaining = 0;
  }

  canActivate() {
    return !this.active && this.cooldownRemaining <= 0;
  }

  activate() {
    if (!this.canActivate()) return false;
    this.active = true;
    this.timeRemaining = this.def.duration;
    return true;
  }

  update(dtMs) {
    if (this.active) {
      this.timeRemaining -= dtMs;
      if (this.timeRemaining <= 0) {
        this.active = false;
        this.timeRemaining = 0;
        this.cooldownRemaining = this.def.cooldown;
      }
    } else if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= dtMs;
      if (this.cooldownRemaining < 0) this.cooldownRemaining = 0;
    }
  }

  getMultiplier() {
    return this.active ? this.def.multiplier : 1;
  }

  // Returns 0..1 fill amount for the HUD ability meter.
  // While active: counts down remaining duration.
  // While on cooldown: counts up progress toward being ready.
  getMeterFill() {
    if (this.active) {
      return this.timeRemaining / this.def.duration;
    }
    if (this.cooldownRemaining > 0) {
      return 1 - (this.cooldownRemaining / this.def.cooldown);
    }
    return 1; // fully ready
  }
}
