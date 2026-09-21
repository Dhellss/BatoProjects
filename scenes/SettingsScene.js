
class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create() {
    const { width, height } = this.scale;
    GameLayout.coverTileSprite(this, 'bg-water').setAlpha(0.7);
    this.settings = GameSettings.load();

    UI.title(this, 'SETTINGS', 0.1);

    const top = height * 0.22;
    const bottom = height * 0.78;
    const rows = 4;
    const gap = (bottom - top) / rows;

    this.createSlider('Music Volume', 'musicVolume', width / 2, top + gap * 0.5);
    this.createSlider('Sound Effects', 'sfxVolume', width / 2, top + gap * 1.5);
    this.createToggle('Vibration', 'vibration', width / 2, top + gap * 2.5);
    this.createToggle('Full Screen', 'fullscreen', width / 2, top + gap * 3.5);

    UI.button(this, {
      x: width / 2,
      y: height * 0.88,
      width: Math.min(320, width * 0.65),
      height: Math.min(54, height * 0.08),
      label: 'RESET DATA',
      fill: UI.COLORS.danger,
      fontSize: GameLayout.font(width, height, 0.042, 14, 18),
      onClick: () => this.confirmReset()
    });

    UI.backButton(this, () => this.scene.start('MainMenu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
    GameLayout.rebuildOnResize(this);
  }

  commit() {
    GameSettings.save(this.settings);
    GameAudio.applySettings(this.settings);
  }

  createSlider(label, key, x, y) {
    const trackWidth = Math.min(320, this.scale.width * 0.7);
    const labelSize = GameLayout.font(this.scale.width, this.scale.height, 0.045, 14, 19);

    this.add.text(x - trackWidth / 2, y - 26, label, {
      fontFamily: 'Arial Black, Arial', fontSize: labelSize + 'px', color: '#ffffff'
    }).setOrigin(0, 0.5);

    const valueText = this.add.text(x + trackWidth / 2, y - 26, `${Math.round(this.settings[key] * 100)}%`, {
      fontFamily: 'Arial', fontSize: labelSize + 'px', color: '#ffd43b'
    }).setOrigin(1, 0.5);

    const minX = x - trackWidth / 2;
    this.add.rectangle(x, y, trackWidth, 10, 0x04202c, 0.9).setStrokeStyle(1, 0xffffff, 0.3);
    const fill = this.add.rectangle(minX, y, trackWidth * this.settings[key], 10, 0xffd43b).setOrigin(0, 0.5);
    const handle = this.add.circle(minX + trackWidth * this.settings[key], y, 17, 0xffffff)
      .setStrokeStyle(3, 0xffd43b)
      .setInteractive({ draggable: true, useHandCursor: true });

    const applyAt = (pointerX) => {
      const clamped = Phaser.Math.Clamp(pointerX, minX, minX + trackWidth);
      handle.x = clamped;
      const pct = (clamped - minX) / trackWidth;
      fill.setSize(Math.max(0.001, trackWidth * pct), 10);
      valueText.setText(`${Math.round(pct * 100)}%`);
      this.settings[key] = pct;
      this.commit();
    };

    this.input.setDraggable(handle);
    handle.on('drag', (pointer, dragX) => applyAt(dragX));

    // Tapping anywhere on the track jumps the handle there — much easier on
    // a phone than having to grab a 17px dot.
    const hitZone = this.add.rectangle(x, y, trackWidth, 44, 0x000000, 0).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', pointer => applyAt(pointer.x));

    // Preview the new level so the sliders are actually audible.
    const preview = () => GameAudio.play(key === 'musicVolume' ? 'stage' : 'collect');
    handle.on('dragend', preview);
    hitZone.on('pointerup', preview);
  }

  createToggle(label, key, x, y) {
    const labelSize = GameLayout.font(this.scale.width, this.scale.height, 0.045, 14, 19);
    const rowWidth = Math.min(320, this.scale.width * 0.7);

    this.add.text(x - rowWidth / 2, y, label, {
      fontFamily: 'Arial Black, Arial', fontSize: labelSize + 'px', color: '#ffffff'
    }).setOrigin(0, 0.5);

    const trackX = x + rowWidth / 2 - 34;
    const track = this.add.rectangle(trackX, y, 68, 34, this.settings[key] ? UI.COLORS.go : 0x555555)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true });
    const knob = this.add.circle(trackX + (this.settings[key] ? 16 : -16), y, 14, 0xffffff);

    track.on('pointerup', () => {
      this.settings[key] = !this.settings[key];
      track.setFillStyle(this.settings[key] ? UI.COLORS.go : 0x555555);
      this.tweens.add({ targets: knob, x: trackX + (this.settings[key] ? 16 : -16), duration: 120 });
      this.commit();
      GameAudio.play('ui');

      if (key === 'vibration' && this.settings[key]) GameAudio.vibrate(60);

      if (key === 'fullscreen') {
        // Must happen inside the pointer event to satisfy browser policy.
        if (this.settings.fullscreen && !this.scale.isFullscreen) this.scale.startFullscreen();
        else if (!this.settings.fullscreen && this.scale.isFullscreen) this.scale.stopFullscreen();
      }
    });
  }

  confirmReset() {
    const { width, height } = this.scale;
    const bodySize = GameLayout.font(width, height, 0.04, 13, 18);

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setDepth(30).setInteractive();
    const box = this.add.rectangle(width / 2, height / 2, Math.min(380, width * 0.85), Math.min(240, height * 0.34), UI.COLORS.panel, 1)
      .setStrokeStyle(3, UI.COLORS.accent).setDepth(31);
    const msg = this.add.text(width / 2, height / 2 - box.height * 0.22,
      'Reset all progress and settings?\nThis cannot be undone.', {
        fontFamily: 'Arial', fontSize: bodySize + 'px', color: '#ffffff',
        align: 'center', lineSpacing: 6, wordWrap: { width: box.width - 40 }
      }).setOrigin(0.5).setDepth(31);

    const btnY = height / 2 + box.height * 0.26;
    const btnWidth = Math.min(130, box.width * 0.38);

    const yes = UI.button(this, {
      x: width / 2 - btnWidth * 0.6, y: btnY, width: btnWidth, height: 46,
      label: 'RESET', fill: UI.COLORS.danger,
      fontSize: GameLayout.font(width, height, 0.04, 13, 16),
      onClick: () => {
        try {
          ['bato_high_score', 'bato_achievements', 'bato_characters', 'bato_settings']
            .forEach(k => localStorage.removeItem(k));
        } catch (e) { /* ignore */ }
        // Drop the cached systems so the menus don't show stale progress.
        this.game.registry.remove('scoreSystem');
        this.game.registry.remove('achievementSystem');
        this.game.registry.remove('selectedCharacterId');
        GameAudio.applySettings(GameSettings.load());
        this.scene.restart();
      }
    });

    const parts = [overlay, box, msg, yes.bg, yes.text];
    const close = () => parts.forEach(part => part.destroy());

    const no = UI.button(this, {
      x: width / 2 + btnWidth * 0.6, y: btnY, width: btnWidth, height: 46,
      label: 'CANCEL', fill: UI.COLORS.go,
      fontSize: GameLayout.font(width, height, 0.04, 13, 16),
      onClick: close
    });
    parts.push(no.bg, no.text);

    // Above the settings controls underneath, which stay interactive
    // otherwise.
    parts.forEach(part => part.setDepth(31));
    overlay.setDepth(30);
  }
}
