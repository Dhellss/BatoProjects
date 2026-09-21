
class AchievementSystem {
  constructor() {
    this.unlocked = this.loadUnlocked(); // Set of achievement ids
    this.unlockedCharacters = this.loadUnlockedCharacters(); // Set of character ids
    this.newlyUnlocked = []; // achievements unlocked this run (for end-of-run popups)
  }

  loadUnlocked() {
    try {
      const raw = localStorage.getItem('bato_achievements');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  saveUnlocked() {
    try {
      localStorage.setItem('bato_achievements', JSON.stringify([...this.unlocked]));
    } catch (e) { /* ignore */ }
  }

  loadUnlockedCharacters() {
    try {
      const raw = localStorage.getItem('bato_characters');
      const stored = new Set(raw ? JSON.parse(raw) : []);
      // Always include characters that are unlocked by default in GameData
      GameData.characters.forEach(c => { if (c.unlocked) stored.add(c.id); });
      return stored;
    } catch (e) {
      const fallback = new Set();
      GameData.characters.forEach(c => { if (c.unlocked) fallback.add(c.id); });
      return fallback;
    }
  }

  saveUnlockedCharacters() {
    try {
      localStorage.setItem('bato_characters', JSON.stringify([...this.unlockedCharacters]));
    } catch (e) { /* ignore */ }
  }

  isCharacterUnlocked(id) {
    return this.unlockedCharacters.has(id);
  }

  unlockCharacter(id) {
    if (!this.unlockedCharacters.has(id)) {
      this.unlockedCharacters.add(id);
      this.saveUnlockedCharacters();
      this.grant('unlock_character');
      return true;
    }
    return false;
  }

  grant(achievementId) {
    if (!this.unlocked.has(achievementId)) {
      this.unlocked.add(achievementId);
      this.newlyUnlocked.push(achievementId);
      this.saveUnlocked();
    }
  }

  /**
   * Called continuously/at key moments during a run with live stats.
   * stats: { moneyCount, moneyTotal, survivalSeconds, avoidCount, maxCombo }
   */
  evaluate(stats) {
    for (const ach of GameData.achievements) {
      if (this.unlocked.has(ach.id)) continue;
      let value = 0;
      switch (ach.type) {
        case 'money_count': value = stats.moneyCount; break;
        case 'money_total': value = stats.moneyTotal; break;
        case 'survive_seconds': value = stats.survivalSeconds; break;
        case 'avoid_count': value = stats.avoidCount; break;
        case 'max_combo': value = stats.maxCombo || 0; break;
        case 'character_unlocked': continue; // granted directly via unlockCharacter()
      }
      if (value >= ach.value) this.grant(ach.id);
    }

    // Character unlock conditions
    for (const char of GameData.characters) {
      if (this.isCharacterUnlocked(char.id) || !char.unlockCondition) continue;
      const cond = char.unlockCondition;
      let value = 0;
      switch (cond.type) {
        case 'survive_seconds': value = stats.survivalSeconds; break;
        case 'money_total': value = stats.moneyTotal; break;
      }
      if (value >= cond.value) this.unlockCharacter(char.id);
    }
  }

  consumeNewlyUnlocked() {
    const list = this.newlyUnlocked.slice();
    this.newlyUnlocked = [];
    return list;
  }
}
