
class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.result = Object.assign(
      { score: 0, highScore: 0, beatHighScore: false, survivalSeconds: 0, maxCombo: 1, avoidCount: 0, newlyUnlocked: [] },
      data || {}
    );
  }

  create() {
    const { width, height } = this.scale;
    GameLayout.coverTileSprite(this, 'bg-water').setAlpha(0.7);
    this.cameras.main.fadeIn(300);

    const title = this.add.text(width / 2, height * 0.13, 'GAME OVER', {
      fontFamily: 'Arial Black, Arial',
      fontSize: GameLayout.font(width, height, 0.1, 28, 48) + 'px',
      color: '#e03131', stroke: '#04202c', strokeThickness: 8
    }).setOrigin(0.5).setScale(0.5);
    this.tweens.add({ targets: title, scale: 1, duration: 350, ease: 'Back.easeOut' });

    const mm = String(Math.floor(this.result.survivalSeconds / 60)).padStart(2, '0');
    const ss = String(this.result.survivalSeconds % 60).padStart(2, '0');

    // Two aligned columns read better than a centred block of "Label: value".
    const stats = [
      ['Score', this.result.score.toLocaleString()],
      ['Best', this.result.highScore.toLocaleString()],
      ['Survived', `${mm}:${ss}`],
      ['Best combo', `x${this.result.maxCombo}`],
      ['Dodged', String(this.result.avoidCount)]
    ];
    const statSize = GameLayout.font(width, height, 0.042, 13, 19);
    const columnWidth = Math.min(300, width * 0.68);
    const statTop = height * 0.25;

    stats.forEach(([label, value], i) => {
      const y = statTop + i * (statSize + 12);
      this.add.text(width / 2 - columnWidth / 2, y, label, {
        fontFamily: 'Arial', fontSize: statSize + 'px', color: '#a5d8ff'
      }).setOrigin(0, 0.5);
      this.add.text(width / 2 + columnWidth / 2, y, value, {
        fontFamily: 'Arial Black, Arial', fontSize: statSize + 'px', color: '#ffffff'
      }).setOrigin(1, 0.5);
    });

    let y = statTop + stats.length * (statSize + 12) + 10;

    if (this.result.beatHighScore) {
      const newBest = this.add.text(width / 2, y, '★ NEW HIGH SCORE! ★', {
        fontFamily: 'Arial Black, Arial',
        fontSize: GameLayout.font(width, height, 0.045, 14, 20) + 'px',
        color: '#ffd43b'
      }).setOrigin(0.5);
      this.tweens.add({ targets: newBest, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      y += statSize + 16;
    }

    const unlocked = (this.result.newlyUnlocked || [])
      .map(id => GameData.achievements.find(a => a.id === id))
      .filter(Boolean);

    if (unlocked.length) {
      GameAudio.play('unlock');
      const text = this.add.text(width / 2, y, unlocked.map(a => `🏆 ${a.name}`).join('\n'), {
        fontFamily: 'Arial Black, Arial',
        fontSize: GameLayout.font(width, height, 0.035, 11, 16) + 'px',
        color: '#69db7c', align: 'center', lineSpacing: 4
      }).setOrigin(0.5, 0);
      // Slide in so a fresh unlock is noticed rather than just appearing.
      text.setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, y: y - 6, duration: 400, delay: 300 });
    }

    UI.buttonStack(this, [
      { label: 'PLAY AGAIN', fill: UI.COLORS.go, action: () => this.scene.start('GameScene') },
      { label: 'CHANGE CROCODILE', action: () => this.scene.start('CharacterSelection', { intent: 'play' }) },
      { label: 'MAIN MENU', action: () => this.scene.start('MainMenu') }
    ], {
      topY: height * 0.71,
      bottomY: height * 0.97,
      width: Math.min(320, width * 0.72)
    });

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
    GameLayout.rebuildOnResize(this);
  }
}
