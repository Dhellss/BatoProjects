

const GameData = {

  // ---------------------------------------------------------------------
  // CHARACTERS
  // ---------------------------------------------------------------------
  characters: [
    {
      id: 'crocodile',
      name: 'mannysheesh',
      color: 0x2f9e44,
      bellyColor: 0xd8f5c8,
      image: 'assets/characters/Crocodile/crocodile_main.png',
      description: 'The original bagman. Steady, greedy, reliable.',
      ability: {
        id: 'money_frenzy',
        name: 'Money Frenzy',
        description: 'All money is worth 3x points for 5 seconds.',
        duration: 5000,
        multiplier: 3,
        cooldown: 18000
      },
      unlocked: true,
      unlockCondition: null
    },
    {
      id: 'manny_fish',
      name: 'Manny Fish',
      color: 0xf59f00,
      bellyColor: 0xfff3bf,
      image: 'assets/characters/manny_fish.png',
      description: 'A slippery middleman. Slower frenzy, longer con.',
      ability: {
        id: 'double_money',
        name: 'Double Money',
        description: 'All money is worth 2x points for 10 seconds.',
        duration: 10000,
        multiplier: 2,
        cooldown: 16000
      },
      unlocked: false,
      unlockCondition: { type: 'survive_seconds', value: 60 }
    }
  ],

  // ---------------------------------------------------------------------
  // MONEY (increases score + greed)
  //
  // `size` is the on-screen width in pixels at the reference screen size
  // (see GameLayout.spriteScale). Sprites are scaled to it, so artwork of any
  // resolution reads at the size the design intends. `radius` is the
  // collision/spawn radius derived from it.
  // ---------------------------------------------------------------------
  moneyTypes: [
    {
      id: 'normal_money',
      name: 'Cash Bundle',
      score: 10,
      greed: 10,
      color: 0x2b8a3e,
      size: 40,
      radius: 20,
      image: 'assets/money/normal_money.webp',
      weight: 60 // relative spawn weight
    },
    {
      id: 'golden_money',
      name: 'Golden Bundle',
      score: 25,
      greed: 18,
      color: 0xf1c40f,
      size: 52,
      radius: 26,
      image: 'assets/money/Gold.png',
      weight: 25
    },
    {
      id: 'treasure_chest',
      name: 'Treasure Chest',
      score: 80,
      greed: 35,
      color: 0xc9963c,
      size: 72,
      radius: 36,
      image: 'assets/money/treasure_chest.png',
      weight: 8
    }
  ],

  // ---------------------------------------------------------------------
  // OBSTACLES (decrease greed - represent accountability catching up)
  // ---------------------------------------------------------------------
  obstacleTypes: [
    {
      id: 'audit_papers',
      name: 'Audit Papers',
      greedPenalty: -34,
      color: 0xe03131,
      size: 54,
      radius: 27,
      image: 'assets/obstacles/kalaban.png',
      weight: 15
    },
    {
      id: 'transparency_report',
      name: 'Transparency Report',
      greedPenalty: -22,
      color: 0x1971c2,
      size: 48,
      radius: 24,
      image: 'assets/obstacles/kalaban.png',
      weight: 20
    },
    {
      id: 'fake_money',
      name: 'Fake Money',
      greedPenalty: -20,
      color: 0x862e9c,
      size: 44,
      radius: 22,
      image: 'assets/obstacles/bato.png',
      weight: 30
    },
    {
      id: 'news_paper',
      name: 'News Paper',
      greedPenalty: -18,
      color: 0x495057,
      size: 44,
      radius: 22,
      image: 'assets/obstacles/bato.png',
      weight: 30
    },
    {
      id: 'tax_document',
      name: 'Tax Document',
      greedPenalty: -28,
      color: 0x343a40,
      size: 50,
      radius: 25,
      image: 'assets/obstacles/kalaban.png',
      weight: 15
    }
  ],


  backgrounds: {
    gameplay: { key: 'bg-water', image: 'assets/backgrounds/background.png' },
    menu: { key: 'bg-menu', image: 'assets/backgrounds/menu_background.png' }
  },

  // ---------------------------------------------------------------------
  // DIFFICULTY CURVE (time in ms -> tuning)
  //
  // `speedMult` scales a screen-relative base speed, so items cross the
  // playfield in the same amount of time on a phone and on a desktop.
  // Every column moves in one direction only: later stages are always
  // faster, denser and hungrier than earlier ones.
  // ---------------------------------------------------------------------
  difficultyStages: [
    { label: 'Easy',    at: 0,      spawnRateMoney: 900, spawnRateObstacle: 1700, speedMult: 1.00, greedDrainMult: 1.00 },
    { label: 'Medium',  at: 30000,  spawnRateMoney: 820, spawnRateObstacle: 1350, speedMult: 1.30, greedDrainMult: 1.25 },
    { label: 'Hard',    at: 75000,  spawnRateMoney: 720, spawnRateObstacle: 1050, speedMult: 1.60, greedDrainMult: 1.50 },
    { label: 'Extreme', at: 135000, spawnRateMoney: 620, spawnRateObstacle: 850,  speedMult: 1.95, greedDrainMult: 1.75 },
    { label: 'Chaos',   at: 210000, spawnRateMoney: 520, spawnRateObstacle: 700,  speedMult: 2.35, greedDrainMult: 2.00 }
  ],

  // ---------------------------------------------------------------------
  // COMBO: money collected in quick succession stacks a score multiplier.
  // ---------------------------------------------------------------------
  combo: {
    windowMs: 1800,   // time allowed between pickups before the streak breaks
    perStep: 4,       // pickups needed for each extra multiplier
    maxMultiplier: 4
  },

  // ---------------------------------------------------------------------
  // ACHIEVEMENTS
  // ---------------------------------------------------------------------
  achievements: [
    { id: 'first_money', name: 'First Money Collected', description: 'Eat your first bundle of cash.', type: 'money_count', value: 1 },
    { id: 'survive_1min', name: 'Survive for 1 Minute', description: 'Stay afloat for 60 seconds.', type: 'survive_seconds', value: 60 },
    { id: 'collect_1000', name: 'Collect 1,000 Money', description: 'Collect a total of 1,000 in money value.', type: 'money_total', value: 1000 },
    { id: 'survive_5min', name: 'Survive for 5 Minutes', description: 'Stay afloat for 300 seconds.', type: 'survive_seconds', value: 300 },
    { id: 'avoid_50', name: 'Avoid 50 Papers', description: 'Successfully dodge 50 obstacles.', type: 'avoid_count', value: 50 },
    { id: 'combo_x4', name: 'Untouchable Streak', description: 'Reach a 4x collection combo.', type: 'max_combo', value: 4 },
    { id: 'unlock_character', name: 'Unlock New Character', description: 'Unlock a new playable character.', type: 'character_unlocked', value: 1 }
  ],

  // Helper: weighted random pick from an array of items with a `weight` field
  weightedPick(items) {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
      if (roll < item.weight) return item;
      roll -= item.weight;
    }
    return items[items.length - 1];
  },

  // Helper: get current difficulty stage for a given elapsed ms
  getDifficultyStage(elapsedMs) {
    let stage = this.difficultyStages[0];
    for (const s of this.difficultyStages) {
      if (elapsedMs >= s.at) stage = s;
    }
    return stage;
  },

  getCharacter(id) {
    return this.characters.find(c => c.id === id) || this.characters[0];
  }
};
