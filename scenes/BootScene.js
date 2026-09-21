
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.failedKeys = new Set();
    this.buildLoadingScreen();

    // Track failures so we know which ones need a generated fallback.
    this.load.on('loaderror', (file) => {
      this.failedKeys.add(file.key);
    });

    // Characters
    GameData.characters.forEach(char => {
      this.load.image(`croc-${char.id}`, char.image);
    });

    // Money
    GameData.moneyTypes.forEach(m => {
      this.load.image(`money-${m.id}`, m.image);
    });

    // Obstacles
    GameData.obstacleTypes.forEach(o => {
      this.load.image(`obstacle-${o.id}`, o.image);
    });

    // Backgrounds
    this.load.image(GameData.backgrounds.gameplay.key, GameData.backgrounds.gameplay.image);
    this.load.image(GameData.backgrounds.menu.key, GameData.backgrounds.menu.image);
  }

  /**
   * The first load used to show a bare background colour. On a phone over a
   * slow connection that reads as a broken page, so show progress.
   */
  buildLoadingScreen() {
    const { width, height } = this.scale;
    const barWidth = Math.min(280, width * 0.6);

    this.add.text(width / 2, height * 0.42, 'PROJECT BATO', {
      fontFamily: 'Arial Black, Arial',
      fontSize: GameLayout.font(width, height, 0.08, 20, 38) + 'px',
      color: '#ffd43b'
    }).setOrigin(0.5);

    const track = this.add.rectangle(width / 2, height * 0.54, barWidth, 14, 0x0b4f6c)
      .setStrokeStyle(2, 0xffffff, 0.5);
    const fill = this.add.rectangle(track.x - barWidth / 2 + 2, height * 0.54, 0, 10, 0xffd43b)
      .setOrigin(0, 0.5);
    const label = this.add.text(width / 2, height * 0.6, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(width, height, 0.035, 11, 15) + 'px',
      color: '#e7f5ff'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      fill.setSize(Math.max(0.001, (barWidth - 4) * value), 10);
      label.setText(`Loading... ${Math.round(value * 100)}%`);
    });
  }

  create() {
    // Small effects textures always generated — swap these too if you want.
    this.generateBubbleTexture();
    this.generateParticleTextures();

    // Backgrounds: use loaded image, or generate placeholder gradient.
    this.ensureBackgroundTexture(GameData.backgrounds.gameplay.key);
    this.ensureBackgroundTexture(GameData.backgrounds.menu.key, true);

    // Characters: use loaded image, or generate placeholder crocodile.
    GameData.characters.forEach(char => {
      const key = `croc-${char.id}`;
      if (this.failedKeys.has(key) || !this.textures.exists(key)) {
        this.generateCrocodileTexture(char);
      }
    });

    // Money: use loaded image, or generate placeholder.
    GameData.moneyTypes.forEach(m => {
      const key = `money-${m.id}`;
      if (this.failedKeys.has(key) || !this.textures.exists(key)) {
        this.generateMoneyTexture(m);
      }
    });

    // Obstacles: use loaded image, or generate placeholder.
    GameData.obstacleTypes.forEach(o => {
      const key = `obstacle-${o.id}`;
      if (this.failedKeys.has(key) || !this.textures.exists(key)) {
        this.generateObstacleTexture(o);
      }
    });

    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenu'));
  }

  ensureBackgroundTexture(key, fallbackToOtherBg = false) {
    if (!this.failedKeys.has(key) && this.textures.exists(key)) return; // real image loaded fine

    // If this is the menu background and only the gameplay one failed to
    // provide a *custom* image, reuse whichever background texture is
    // actually usable rather than drawing two different placeholders.
    if (fallbackToOtherBg && this.textures.exists(GameData.backgrounds.gameplay.key)
        && !this.failedKeys.has(GameData.backgrounds.gameplay.key)) {
      const src = this.textures.get(GameData.backgrounds.gameplay.key).getSourceImage();
      this.textures.addImage(key, src);
      return;
    }

    this.generateBackgroundTexture(key);
  }

  generateBackgroundTexture(key) {
    const g = this.add.graphics();
    const w = 64, h = 64;
    g.fillGradientStyle(0x0b4f6c, 0x0b4f6c, 0x04202c, 0x04202c, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  generateBubbleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.lineStyle(1, 0xffffff, 0.6);
    g.strokeCircle(8, 8, 8);
    g.generateTexture('bubble', 16, 16);
    g.destroy();
  }

  generateCrocodileTexture(char) {
    const key = `croc-${char.id}`;
    const w = 140, h = 90;
    const g = this.add.graphics();

    g.fillStyle(char.color, 1);
    g.fillTriangle(0, h / 2, 30, h / 2 - 22, 30, h / 2 + 22);

    g.fillEllipse(70, h / 2, 90, 46);

    g.fillStyle(char.bellyColor, 1);
    g.fillEllipse(75, h / 2 + 12, 66, 20);

    g.fillStyle(char.color, 1);
    g.fillEllipse(122, h / 2, 40, 30);
    g.fillTriangle(132, h / 2 - 10, 140, h / 2, 132, h / 2 + 10);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(118, h / 2 - 12, 6);
    g.fillStyle(0x111111, 1);
    g.fillCircle(120, h / 2 - 12, 3);

    g.fillStyle(0xffffff, 1);
    g.fillTriangle(112, h / 2 + 6, 118, h / 2 + 6, 115, h / 2 + 12);
    g.fillTriangle(122, h / 2 + 6, 128, h / 2 + 6, 125, h / 2 + 12);

    g.fillStyle(0x000000, 0.15);
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(40 + i * 16, h / 2 - 23, 48 + i * 16, h / 2 - 32, 56 + i * 16, h / 2 - 23);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  generateMoneyTexture(m) {
    const key = `money-${m.id}`;
    const size = m.radius * 2 + 8;
    const g = this.add.graphics();
    const cx = size / 2, cy = size / 2;

    g.fillStyle(m.color, 1);
    g.fillRoundedRect(cx - m.radius, cy - m.radius * 0.65, m.radius * 2, m.radius * 1.3, 6);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(cx - m.radius, cy - m.radius * 0.65, m.radius * 2, m.radius * 1.3, 6);

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, m.radius * 0.35);
    g.lineStyle(2, m.color, 1);
    g.strokeCircle(cx, cy, m.radius * 0.35);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  generateObstacleTexture(o) {
    const key = `obstacle-${o.id}`;
    const size = o.radius * 2 + 8;
    const g = this.add.graphics();
    const cx = size / 2, cy = size / 2;

    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - o.radius * 0.8, cy - o.radius, o.radius * 1.6, o.radius * 2, 3);
    g.lineStyle(2, o.color, 1);
    g.strokeRoundedRect(cx - o.radius * 0.8, cy - o.radius, o.radius * 1.6, o.radius * 2, 3);

    g.lineStyle(2, o.color, 0.7);
    for (let i = 0; i < 4; i++) {
      const y = cy - o.radius * 0.55 + i * (o.radius * 0.4);
      g.beginPath();
      g.moveTo(cx - o.radius * 0.5, y);
      g.lineTo(cx + o.radius * 0.5, y);
      g.strokePath();
    }

    g.fillStyle(o.color, 0.8);
    g.fillTriangle(cx + o.radius * 0.5, cy - o.radius, cx + o.radius * 0.8, cy - o.radius, cx + o.radius * 0.8, cy - o.radius * 0.7);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  generateParticleTextures() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('sparkle', 8, 8);
    g.destroy();

    const g2 = this.add.graphics();
    g2.lineStyle(3, 0xe03131, 1);
    g2.strokeCircle(16, 16, 14);
    g2.generateTexture('hit-ring', 32, 32);
    g2.destroy();
  }
}
