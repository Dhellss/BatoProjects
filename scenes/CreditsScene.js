
class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
  }

  create() {
    const { width, height } = this.scale;
    GameLayout.coverTileSprite(this, 'bg-water').setAlpha(0.7);

    UI.title(this, 'CREDITS', 0.11, 0.08, 26, 40);

    const lines = [
      'PROJECT BATO',
      'Crocodile Under Funds',
      '',
      'A satirical survival game about',
      'public funds, accountability,',
      'and transparency.',
      '',
      'Built with Phaser 3',
      '',
      'Game Design & Programming',
      'Mahilum Dhellmar',
      '',
      'Inspired by classic "eat to survive"',
      'Hungry Shark.',
      '',
      'Thank you for playing —',
      'Malulupet na Hacker'
    ];

    const body = this.add.text(width / 2, height * 0.22, lines.join('\n'), {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(width, height, 0.04, 11, 17) + 'px',
      color: '#e7f5ff',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5, 0);

    // Shrink to fit rather than running off the bottom of a short screen.
    const available = height * 0.72;
    if (body.height > available) body.setScale(available / body.height);

    UI.backButton(this, () => this.scene.start('MainMenu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
    GameLayout.rebuildOnResize(this);
  }
}
