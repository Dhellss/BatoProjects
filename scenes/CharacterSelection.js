
class CharacterSelection extends Phaser.Scene {
  constructor() {
    super('CharacterSelection');
  }

  init(data) {
    this.intent = (data && data.intent) || 'play';
    // Open on whoever is currently selected rather than always on the first.
    const selectedId = this.game.registry.get('selectedCharacterId');
    const found = GameData.characters.findIndex(c => c.id === selectedId);
    this.index = found >= 0 ? found : 0;
  }

  create() {
    const { width, height } = this.scale;
    const landscape = GameLayout.isLandscape(width, height);
    GameLayout.coverTileSprite(this, 'bg-water');

    this.achievementSystem = this.game.registry.get('achievementSystem') || new AchievementSystem();
    this.game.registry.set('achievementSystem', this.achievementSystem);

    UI.title(this, 'CHOOSE YOUR CROCODILE', 0.08, 0.06, 18, 32);

    const portraitY = height * (landscape ? 0.34 : 0.3);
    // Start on a real texture: the placeholder used to be created with an
    // empty key, which renders Phaser's missing-texture box for a frame.
    this.portrait = this.add.image(width / 2, portraitY, `croc-${GameData.characters[this.index].id}`);
    this.portraitWidth = Phaser.Math.Clamp(GameLayout.unit(width, height) * 0.5, 140, 340);

    this.nameText = this.add.text(width / 2, height * 0.48, '', {
      fontFamily: 'Arial Black, Arial', fontSize: GameLayout.font(width, height, 0.07, 22, 34) + 'px', color: '#ffffff'
    }).setOrigin(0.5);

    this.abilityNameText = this.add.text(width / 2, height * 0.55, '', {
      fontFamily: 'Arial', fontSize: GameLayout.font(width, height, 0.045, 14, 20) + 'px', color: '#ffd43b', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.descText = this.add.text(width / 2, height * 0.63, '', {
      fontFamily: 'Arial', fontSize: GameLayout.font(width, height, 0.038, 12, 17) + 'px', color: '#e7f5ff',
      align: 'center', lineSpacing: 4, wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    this.lockText = this.add.text(width / 2, height * 0.73, '', {
      fontFamily: 'Arial', fontSize: GameLayout.font(width, height, 0.035, 11, 16) + 'px', color: '#ff8787',
      align: 'center', wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    // Page dots, so it's obvious there is more than one crocodile.
    this.dots = GameData.characters.map((_, i) => {
      const spacing = 18;
      const startX = width / 2 - ((GameData.characters.length - 1) * spacing) / 2;
      return this.add.circle(startX + i * spacing, height * 0.42, 5, 0xffffff, 0.35);
    });

    this.createArrow(width * 0.1, portraitY, -1);
    this.createArrow(width * 0.9, portraitY, 1);

    this.selectBtn = UI.button(this, {
      x: width / 2,
      y: height * 0.85,
      width: Math.min(300, width * 0.62),
      height: Math.min(58, height * 0.085),
      label: 'SELECT & PLAY',
      fill: UI.COLORS.go,
      fontSize: GameLayout.font(width, height, 0.045, 15, 20),
      onClick: () => this.onSelect()
    });

    UI.backButton(this, () => this.scene.start('MainMenu'));

    // Keyboard navigation for desktop.
    this.input.keyboard.on('keydown-LEFT', () => this.cycle(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.cycle(1));
    this.input.keyboard.on('keydown-ENTER', () => this.onSelect());
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));

    this.refreshDisplay();
    GameLayout.rebuildOnResize(this);
  }

  createArrow(x, y, dir) {
    const arrow = this.add.text(x, y, dir < 0 ? '◀' : '▶', {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(this.scale.width, this.scale.height, 0.11, 30, 46) + 'px',
      color: '#ffffff',
      padding: { x: 14, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    arrow.on('pointerdown', () => arrow.setScale(0.9));
    arrow.on('pointerout', () => arrow.setScale(1));
    arrow.on('pointerup', () => { arrow.setScale(1); this.cycle(dir); });
  }

  cycle(dir) {
    this.index = (this.index + dir + GameData.characters.length) % GameData.characters.length;
    GameAudio.play('ui');
    this.refreshDisplay();
  }

  refreshDisplay() {
    const char = GameData.characters[this.index];
    const unlocked = this.achievementSystem.isCharacterUnlocked(char.id);

    this.portrait.setTexture(`croc-${char.id}`);
    GameLayout.fitWidth(this.portrait, this.portraitWidth);
    this.portrait.setTint(unlocked ? 0xffffff : 0x4a4a4a);

    // Small slide-in so cycling feels like turning a page.
    this.portrait.setAlpha(0);
    this.tweens.add({ targets: this.portrait, alpha: 1, duration: 180 });

    this.nameText.setText(char.name);
    this.abilityNameText.setText(`Ability: ${char.ability.name}`);
    this.descText.setText(`${char.description}\n${char.ability.description}`);
    this.dots.forEach((dot, i) => dot.setFillStyle(0xffffff, i === this.index ? 1 : 0.3));

    if (unlocked) {
      this.lockText.setText('');
      this.selectBtn.setEnabled(true).setFill(UI.COLORS.go)
        .setLabel(this.intent === 'play' ? 'SELECT & PLAY' : 'SELECT');
    } else {
      const cond = char.unlockCondition;
      let condText = 'Complete a challenge to unlock.';
      if (cond && cond.type === 'survive_seconds') condText = `Survive ${cond.value} seconds in one run.`;
      if (cond && cond.type === 'money_total') condText = `Collect ${cond.value} total money in one run.`;
      this.lockText.setText(`🔒 LOCKED — ${condText}`);
      this.selectBtn.setEnabled(false).setLabel('LOCKED');
    }
  }

  onSelect() {
    const char = GameData.characters[this.index];
    if (!this.achievementSystem.isCharacterUnlocked(char.id)) return;

    this.game.registry.set('selectedCharacterId', char.id);
    this.scene.start(this.intent === 'play' ? 'GameScene' : 'MainMenu');
  }
}
