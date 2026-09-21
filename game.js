
const GameLayout = {
  // Reference short-edge the art was sized against.
  REFERENCE_UNIT: 420,

  unit(width, height) {
    return Math.min(width, height);
  },

  font(width, height, ratio, min, max) {
    return Phaser.Math.Clamp(Math.round(this.unit(width, height) * ratio), min, max);
  },

  isLandscape(width, height) {
    return width > height;
  },

  // How much to grow/shrink sprites for this screen, so a phone and a
  // desktop show items at a comparable proportion of the playfield.
  spriteScale(width, height) {
    return Phaser.Math.Clamp(this.unit(width, height) / this.REFERENCE_UNIT, 0.7, 1.9);
  },

  /**
   * Scale a sprite so its rendered width is exactly `targetWidth` pixels,
   * keeping the artwork's aspect ratio. Works with art of any resolution,
   * which is what lets GameData describe sizes in design units.
   */
  fitWidth(sprite, targetWidth) {
    const sourceWidth = sprite.width || 1;
    sprite.setScale(targetWidth / sourceWidth);
    return sprite;
  },

  /**
   * Draw a tiled background that covers the screen without squashing the
   * source image: the tile is scaled so one copy is at least as tall as the
   * viewport, then repeats horizontally.
   */
  coverTileSprite(scene, key) {
    const { width, height } = scene.scale;
    const tile = scene.add.tileSprite(width / 2, height / 2, width, height, key);
    const source = scene.textures.get(key).getSourceImage();
    const scale = Math.max(height / (source.height || height), 1);
    tile.setTileScale(scale, scale);
    return tile;
  },

  /**
   * Run `handler` whenever the canvas is resized, and detach on shutdown so
   * restarted scenes don't stack up listeners.
   */
  onResize(scene, handler) {
    scene.scale.on('resize', handler);
    scene.events.once('shutdown', () => scene.scale.off('resize', handler));
    scene.events.once('destroy', () => scene.scale.off('resize', handler));
  },

  /**
   * Menu screens are laid out once in create(), so the simplest correct
   * response to a rotation is to rebuild them. Debounced, because dragging a
   * desktop window fires resize continuously.
   */
  rebuildOnResize(scene) {
    let pending = null;
    this.onResize(scene, () => {
      if (pending) pending.remove(false);
      pending = scene.time.delayedCall(180, () => scene.scene.restart(scene.sys.settings.data));
    });
  }
};

const gameContainer = document.getElementById('game-container');

// The container is inset by the device's safe area, so measuring it (rather
// than the window) keeps the canvas backing store and its CSS size in step.
const viewportSize = () => ({
  width: gameContainer.clientWidth || window.innerWidth,
  height: gameContainer.clientHeight || window.innerHeight
});

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#04202c',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: viewportSize().width,
    height: viewportSize().height
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 3
  },
  scene: [
    BootScene,
    MainMenu,
    CharacterSelection,
    AchievementsScene,
    SettingsScene,
    CreditsScene,
    GameScene,
    PauseScene,
    GameOverScene
  ]
};

const game = new Phaser.Game(config);

// Phaser's RESIZE mode already listens for window resizes, but Safari on iOS
// reports the new size a beat late after an orientation change.
let resizeTimer = null;
const syncGameSize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const { width, height } = viewportSize();
    game.scale.resize(width, height);
  }, 60);
};
window.addEventListener('resize', syncGameSize);
window.addEventListener('orientationchange', syncGameSize);

// Audio can only start inside a user gesture. Unlock on the first real input
// and then get out of the way.
const unlockAudio = () => {
  GameAudio.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
  window.removeEventListener('touchstart', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

// Suspend audio while the tab is hidden so the game doesn't hum in the
// background on mobile.
document.addEventListener('visibilitychange', () => {
  if (!GameAudio.ctx) return;
  if (document.hidden) GameAudio.ctx.suspend();
  else GameAudio.ctx.resume();
});

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
