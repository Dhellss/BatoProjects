
class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;
    const landscape = GameLayout.isLandscape(width, height);

    GameLayout.coverTileSprite(this, 'bg-menu');
    UI.ambientBubbles(this);
    GameAudio.startMusic();

    // Title
    const titleSize = GameLayout.font(width, height, 0.11, 26, 52);
    this.add.text(width / 2, height * 0.13, 'PROJECT BATO', {
      fontFamily: 'Arial Black, Arial',
      fontSize: titleSize + 'px',
      color: '#ffd43b',
      stroke: '#04202c',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.13 + titleSize * 0.7, 'Crocodile Under Funds', {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(width, height, 0.045, 13, 20) + 'px',
      color: '#e7f5ff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Mascot preview, sized against the screen rather than a fixed scale so
    // it never swamps a small phone or vanishes on a desktop.
    const selectedId = this.game.registry.get('selectedCharacterId') || 'crocodile';
    const croc = this.add.image(width / 2, height * (landscape ? 0.36 : 0.32), `croc-${GameData.getCharacter(selectedId).id}`);
    GameLayout.fitWidth(croc, Phaser.Math.Clamp(GameLayout.unit(width, height) * 0.42, 120, 300));
    this.tweens.add({
      targets: croc,
      y: croc.y - 14,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // High score
    const scoreSys = this.game.registry.get('scoreSystem') || new ScoreSystem();
    this.game.registry.set('scoreSystem', scoreSys);
    this.add.text(width / 2, height * (landscape ? 0.5 : 0.45), `High Score: ${scoreSys.highScore.toLocaleString()}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: GameLayout.font(width, height, 0.045, 13, 20) + 'px',
      color: '#ffd43b'
    }).setOrigin(0.5);

    // Buttons — the stack auto-fits the space left below the mascot.
    UI.buttonStack(this, [
      { label: 'PLAY', fill: UI.COLORS.go, action: () => this.scene.start('CharacterSelection', { intent: 'play' }) },
      { label: 'CHARACTERS', action: () => this.scene.start('CharacterSelection', { intent: 'browse' }) },
      { label: 'ACHIEVEMENTS', action: () => this.scene.start('AchievementsScene') },
      { label: 'SETTINGS', action: () => this.scene.start('SettingsScene') },
      { label: 'CREDITS', action: () => this.scene.start('CreditsScene') }
    ], {
      topY: height * (landscape ? 0.54 : 0.5),
      bottomY: height * 0.94,
      width: Math.min(360, width * 0.72)
    });

    this.add.text(width / 2, height * 0.975, 'corruption never sleeps.', {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(width, height, 0.028, 10, 14) + 'px',
      color: '#a5d8ff'
    }).setOrigin(0.5);

    // Enter/Space jump straight into a run on desktop.
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('CharacterSelection', { intent: 'play' }));

    GameLayout.rebuildOnResize(this);
  }
}
