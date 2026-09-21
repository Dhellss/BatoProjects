
class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.gameSceneKey = (data && data.gameSceneKey) || 'GameScene';
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setInteractive();

    const panelWidth = Math.min(340, width * 0.82);
    const panelHeight = Math.min(300, height * 0.55);

    const panel = this.add.container(width / 2, height / 2);
    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, UI.COLORS.panel, 1)
      .setStrokeStyle(3, UI.COLORS.accent);
    const title = this.add.text(0, -panelHeight * 0.36, 'PAUSED', {
      fontFamily: 'Arial Black, Arial',
      fontSize: GameLayout.font(width, height, 0.07, 22, 32) + 'px',
      color: '#ffd43b'
    }).setOrigin(0.5);

    panel.add([panelBg, title]);
    panel.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    const buttons = [
      { label: 'RESUME', fill: UI.COLORS.go, action: () => this.resumeGame() },
      { label: 'RESTART', action: () => this.restartRun() },
      { label: 'MAIN MENU', action: () => this.goMainMenu() }
    ];

    const slot = (panelHeight * 0.58) / buttons.length;
    const btnHeight = Math.min(50, slot * 0.8);
    const fontSize = GameLayout.font(width, height, 0.042, 13, 18);

    buttons.forEach((def, i) => {
      const y = -panelHeight * 0.14 + slot * (i + 0.5);
      const btn = UI.button(this, {
        x: 0, y, width: panelWidth * 0.68, height: btnHeight,
        label: def.label, fill: def.fill, fontSize, onClick: def.action
      });
      panel.add([btn.bg, btn.text]);
    });

    // ESC / P toggle pause the same way they open it.
    this.input.keyboard.once('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.once('keydown-P', () => this.resumeGame());

    // Rotating the device while paused should not strand the panel offscreen.
    GameLayout.rebuildOnResize(this);
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume(this.gameSceneKey);
  }

  restartRun() {
    this.scene.stop();
    this.scene.stop(this.gameSceneKey);
    this.scene.start(this.gameSceneKey);
  }

  goMainMenu() {
    this.scene.stop();
    this.scene.stop(this.gameSceneKey);
    this.scene.start('MainMenu');
  }
}
