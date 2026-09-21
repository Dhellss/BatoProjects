
/**
 * Shared menu furniture.
 *
 * Every screen used to hand-roll its own rectangle + label + pointer
 * handlers, which is why they drifted apart in size, colour and feedback.
 * These helpers keep one look, one press animation and one click sound.
 */
const UI = {
  COLORS: {
    panel: 0x0b4f6c,
    panelHover: 0x1971c2,
    accent: 0xffd43b,
    go: 0x2f9e44,
    danger: 0xe03131,
    disabled: 0x495057
  },

  /**
   * @returns {{bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text,
   *            setEnabled: Function, setLabel: Function, setFill: Function}}
   */
  button(scene, { x, y, width, height, label, fill, fontSize, onClick, enabled = true }) {
    const baseFill = fill !== undefined ? fill : this.COLORS.panel;

    const bg = scene.add.rectangle(x, y, width, height, baseFill, 0.92)
      .setStrokeStyle(3, this.COLORS.accent)
      .setInteractive({ useHandCursor: true });

    const text = scene.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial',
      fontSize: fontSize + 'px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const state = { enabled, fill: baseFill };

    const press = (scale) => { bg.setScale(scale); text.setScale(scale); };

    bg.on('pointerover', () => { if (state.enabled) bg.setFillStyle(UI.COLORS.panelHover, 0.92); });
    bg.on('pointerout', () => { bg.setFillStyle(state.fill, 0.92); press(1); });
    bg.on('pointerdown', () => { if (state.enabled) press(0.96); });
    bg.on('pointerup', () => {
      press(1);
      if (!state.enabled) return;
      GameAudio.play('ui');
      onClick();
    });

    return {
      bg,
      text,
      setEnabled(value) {
        state.enabled = value;
        state.fill = value ? baseFill : UI.COLORS.disabled;
        bg.setFillStyle(state.fill, 0.92);
        return this;
      },
      setFill(value) {
        state.fill = value;
        bg.setFillStyle(value, 0.92);
        return this;
      },
      setLabel(value) {
        text.setText(value);
        return this;
      }
    };
  },

  backButton(scene, onClick) {
    const { width, height } = scene.scale;
    const size = GameLayout.font(width, height, 0.045, 14, 20);

    // Padded so it's a comfortable thumb target, not just the glyph bounds.
    const label = scene.add.text(Math.max(12, width * 0.05), Math.max(12, height * 0.035), '< BACK', {
      fontFamily: 'Arial Black, Arial',
      fontSize: size + 'px',
      color: '#ffffff',
      padding: { x: 10, y: 8 },
      backgroundColor: '#0b4f6cd0'
    }).setDepth(20).setInteractive({ useHandCursor: true });

    label.on('pointerup', () => { GameAudio.play('ui'); onClick(); });
    return label;
  },

  title(scene, text, yRatio = 0.1, ratio = 0.07, min = 22, max = 38) {
    const { width, height } = scene.scale;
    return scene.add.text(width / 2, height * yRatio, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: GameLayout.font(width, height, ratio, min, max) + 'px',
      color: '#ffd43b',
      stroke: '#04202c',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5);
  },

  /**
   * Lay out a vertical stack of buttons inside [topY, bottomY], shrinking the
   * gap so the whole stack always fits — menus grew past the bottom of small
   * phone screens when items were added at a fixed spacing.
   */
  buttonStack(scene, defs, { topY, bottomY, width }) {
    const { width: screenW, height: screenH } = scene.scale;
    const available = Math.max(60, bottomY - topY);
    const slot = available / defs.length;
    const height = Phaser.Math.Clamp(slot * 0.78, 34, 58);
    const fontSize = GameLayout.font(screenW, screenH, 0.045, 13, 19);

    return defs.map((def, i) => UI.button(scene, {
      x: screenW / 2,
      y: topY + slot * (i + 0.5),
      width,
      height,
      label: def.label,
      fill: def.fill,
      fontSize,
      onClick: def.action
    }));
  },

  ambientBubbles(scene, delay = 500) {
    return scene.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        const { width, height } = scene.scale;
        const bubble = scene.add.image(Phaser.Math.Between(0, width), height + 20, 'bubble')
          .setAlpha(0.5).setScale(Phaser.Math.FloatBetween(0.5, 1.5));
        scene.tweens.add({
          targets: bubble,
          y: -30,
          x: bubble.x + Phaser.Math.Between(-40, 40),
          duration: Phaser.Math.Between(4000, 7000),
          onComplete: () => bubble.destroy()
        });
      }
    });
  }
};
