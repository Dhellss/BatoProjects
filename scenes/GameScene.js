
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    this.elapsedMs = 0;
    this.avoidCount = 0;
    this.isGameOver = false;
    this.moveInput = { x: 0, y: 0 };
    this.joystickPointerId = null;

    // Combo state
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.maxCombo = 1;
    this.lastCollectMs = -Infinity;

    // Feedback state
    this.invulnerableUntil = 0;
    this.lastDangerBeepMs = -Infinity;
  }

  create() {
    this.settings = GameSettings.load();
    GameAudio.applySettings(this.settings);
    GameAudio.startMusic();

    // ---- Systems ----
    this.scoreSystem = this.game.registry.get('scoreSystem') || new ScoreSystem();
    this.game.registry.set('scoreSystem', this.scoreSystem);
    this.scoreSystem.reset();

    this.hungerSystem = new HungerSystem(100, 4);

    this.achievementSystem = this.game.registry.get('achievementSystem') || new AchievementSystem();
    this.game.registry.set('achievementSystem', this.achievementSystem);

    const characterId = this.game.registry.get('selectedCharacterId') || 'crocodile';
    this.character = GameData.getCharacter(characterId);
    this.abilitySystem = new AbilitySystem(this.character.ability);

    // ---- World ----
    this.bg = GameLayout.coverTileSprite(this, 'bg-water');
    this.moneyGroup = this.physics.add.group();
    this.obstacleGroup = this.physics.add.group();

    // ---- Crocodile ----
    this.croc = this.physics.add.image(this.scale.width / 2, this.scale.height / 2, `croc-${this.character.id}`);
    this.croc.setDepth(5);
    this.sizeCrocodile();

    // ---- Input ----
    // Movement comes from the virtual joystick; keyboard remains available
    // for desktop play and testing.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this.tryActivateAbility());
    this.input.keyboard.on('keydown-SHIFT', () => this.tryActivateAbility());
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-P', () => this.pauseGame());

    // ---- Physics overlaps ----
    this.physics.add.overlap(this.croc, this.moneyGroup, this.onCollectMoney, null, this);
    this.physics.add.overlap(this.croc, this.obstacleGroup, this.onHitObstacle, null, this);

    // ---- HUD (built first: spawning depends on the playfield bounds
    //      that layout() computes) ----
    this.buildHud();
    this.buildJoystick();
    this.buildPauseButton();
    this.layout();

    // ---- Spawning timers (re-created when difficulty stage changes) ----
    this.currentStage = null;
    this.applyDifficultyStage(true);

    // ---- Ambient bubbles ----
    this.bubbleTimer = this.time.addEvent({ delay: 400, loop: true, callback: () => this.spawnAmbientBubble() });

    // A rotation must not end the run, so the HUD is repositioned in place
    // rather than the scene being rebuilt.
    GameLayout.onResize(this, () => this.layout());

    // Losing pointer capture (alt-tab, notification shade) should release the
    // stick instead of leaving the crocodile swimming into a wall.
    this.input.on('gameout', () => this.resetJoystick());
    this.game.events.on('blur', this.pauseGame, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.pauseGame, this));
  }

  // -----------------------------------------------------------------------
  // Sizing & layout
  // -----------------------------------------------------------------------

  sizeCrocodile() {
    const { width, height } = this.scale;
    // The crocodile is sized against the short edge so it takes up a similar
    // share of the playfield in portrait and landscape.
    const targetWidth = Phaser.Math.Clamp(GameLayout.unit(width, height) * 0.28, 95, 220);
    GameLayout.fitWidth(this.croc, targetWidth);
    // A forgiving hitbox: the snout and tail shouldn't cost you a run.
    // Body dimensions are in unscaled texture units - Arcade multiplies them
    // by the sprite's scale - so this stays correct at every screen size.
    const bodyWidth = this.croc.width * 0.62;
    const bodyHeight = this.croc.height * 0.55;
    this.croc.body.setSize(bodyWidth, bodyHeight, false);
    this.croc.body.setOffset((this.croc.width - bodyWidth) / 2, (this.croc.height - bodyHeight) / 2);
    this.crocHalfWidth = this.croc.displayWidth / 2;
    this.crocHalfHeight = this.croc.displayHeight / 2;
  }

  layout() {
    const { width, height } = this.scale;
    const unit = GameLayout.unit(width, height);
    const pad = Math.max(10, Math.round(unit * 0.035));
    const landscape = GameLayout.isLandscape(width, height);

    this.bg.setSize(width, height).setOrigin(0.5).setPosition(width / 2, height / 2);

    this.sizeCrocodile();

    const scoreSize = GameLayout.font(width, height, 0.055, 14, 26);
    const bodySize = GameLayout.font(width, height, 0.04, 11, 18);
    const labelSize = GameLayout.font(width, height, 0.03, 9, 13);
    this.popupFontSize = GameLayout.font(width, height, 0.045, 13, 22);

    // Row 1: score (left) and pause (right). Row 2: timer (left) and the
    // difficulty label (right), tucked under the pause button.
    this.scoreText.setPosition(pad, pad).setFontSize(scoreSize);
    const secondRowY = pad + scoreSize + 3;
    this.timeText.setPosition(pad, secondRowY).setFontSize(bodySize);

    const pauseSize = GameLayout.font(width, height, 0.07, 22, 34);
    this.pauseBtn.setPosition(width - pad, pad).setFontSize(pauseSize);
    this.difficultyText.setPosition(width - pad, secondRowY).setFontSize(bodySize);

    // Meters: the label is drawn inside the bar rather than on its own line,
    // which is what used to push the playfield so far down the screen.
    const barWidth = Math.min(220, width * (landscape ? 0.3 : 0.52));
    const barHeight = Math.max(15, Math.round(labelSize * 1.5));
    this.greedBarMaxWidth = barWidth - 4;
    this.barFillHeight = barHeight - 4;

    const greedBarY = secondRowY + bodySize + 6 + barHeight / 2;
    this.greedBarBg.setPosition(pad, greedBarY).setSize(barWidth, barHeight);
    this.greedBarFill.setPosition(pad + 2, greedBarY);
    this.greedLabel.setPosition(pad + 8, greedBarY).setFontSize(labelSize);

    const abilityBarY = greedBarY + barHeight + 5;
    this.abilityBarBg.setPosition(pad, abilityBarY).setSize(barWidth, barHeight);
    this.abilityBarFill.setPosition(pad + 2, abilityBarY);
    this.abilityLabel.setPosition(pad + 8, abilityBarY).setFontSize(labelSize);

    this.comboText.setPosition(width / 2, pad + 2).setFontSize(GameLayout.font(width, height, 0.06, 16, 30));

    // Ability button, bottom-right, thumb-sized.
    const buttonRadius = Phaser.Math.Clamp(unit * 0.115, 32, 52);
    this.abilityBtn.setPosition(width - pad - buttonRadius, height - pad - buttonRadius);
    this.abilityBtn.setRadius(buttonRadius);
    // The hit area is baked at the radius it had when setInteractive ran, so
    // it has to be rebuilt after a resize or the button stops responding.
    this.abilityBtn.setInteractive(
      new Phaser.Geom.Circle(buttonRadius, buttonRadius, buttonRadius),
      Phaser.Geom.Circle.Contains
    );
    if (this.abilityBtn.input) this.abilityBtn.input.cursor = 'pointer';
    this.abilityBtnText.setPosition(this.abilityBtn.x, this.abilityBtn.y).setFontSize(labelSize);

    // Joystick, bottom-left.
    this.joystickRadius = Phaser.Math.Clamp(unit * 0.18, 44, 78);
    this.joystickCenter = {
      x: pad + this.joystickRadius,
      y: height - pad - this.joystickRadius
    };
    this.joystickBase.setPosition(this.joystickCenter.x, this.joystickCenter.y).setRadius(this.joystickRadius);
    this.joystickKnob.setRadius(this.joystickRadius * 0.42);
    this.joystickLabel.setPosition(this.joystickCenter.x, this.joystickCenter.y + this.joystickRadius + 9)
      .setFontSize(GameLayout.font(width, height, 0.03, 9, 13));
    this.resetJoystick();

    this.stageBanner.setPosition(width / 2, height * 0.38).setFontSize(GameLayout.font(width, height, 0.1, 26, 52));
    this.dangerVignette.setPosition(width / 2, height / 2).setSize(width, height);

    // Playfield bounds: below the HUD, above the on-screen controls.
    let top = abilityBarY + barHeight / 2 + 12;
    const bottom = height - pad - this.joystickRadius * 0.6;
    // A short landscape window can leave the HUD taller than the play area,
    // which would pin the crocodile against the top of the screen.
    const minPlayHeight = this.crocHalfHeight * 2 + 40;
    if (bottom - top < minPlayHeight) top = Math.max(0, bottom - minPlayHeight);

    this.playfield = { top, bottom, left: 0, right: width };

    this.croc.x = Phaser.Math.Clamp(this.croc.x, this.crocHalfWidth, width - this.crocHalfWidth);
    this.croc.y = Phaser.Math.Clamp(this.croc.y, this.playfield.top + this.crocHalfHeight, this.playfield.bottom - this.crocHalfHeight);
  }

  buildHud() {
    const white = { fontFamily: 'Arial', color: '#ffffff' };

    this.scoreText = this.add.text(0, 0, 'SCORE: 0', {
      fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setScrollFactor(0).setDepth(10);

    this.timeText = this.add.text(0, 0, 'TIME: 00:00', {
      fontFamily: 'Arial', color: '#e7f5ff'
    }).setScrollFactor(0).setDepth(10);

    this.difficultyText = this.add.text(0, 0, 'EASY', {
      fontFamily: 'Arial Black, Arial', color: '#ffd43b'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

    // Greed bar. The labels are overlaid on the bars, so they need a centred
    // vertical origin, a stroke for contrast, and a depth above the fill.
    this.greedLabel = this.add.text(0, 0, 'GREED', white)
      .setOrigin(0, 0.5).setDepth(12).setStroke('#04202c', 3);
    this.greedBarBg = this.add.rectangle(0, 0, 100, 14, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(10)
      .setStrokeStyle(1, 0xffffff, 0.35);
    this.greedBarFill = this.add.rectangle(0, 0, 96, 10, 0x2f9e44).setOrigin(0, 0.5).setDepth(10);

    // Ability meter
    this.abilityLabel = this.add.text(0, 0, this.character.ability.name.toUpperCase(), white)
      .setOrigin(0, 0.5).setDepth(12).setStroke('#04202c', 3);
    this.abilityBarBg = this.add.rectangle(0, 0, 100, 14, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(10)
      .setStrokeStyle(1, 0xffffff, 0.35);
    this.abilityBarFill = this.add.rectangle(0, 0, 96, 10, 0x4dabf7).setOrigin(0, 0.5).setDepth(10);

    // Combo readout (hidden until a streak starts)
    this.comboText = this.add.text(0, 0, '', {
      fontFamily: 'Arial Black, Arial', color: '#ffd43b', stroke: '#04202c', strokeThickness: 5
    }).setOrigin(0.5, 0).setDepth(12).setAlpha(0);

    // Stage-change banner
    this.stageBanner = this.add.text(0, 0, '', {
      fontFamily: 'Arial Black, Arial', color: '#ffffff', stroke: '#04202c', strokeThickness: 8
    }).setOrigin(0.5).setDepth(13).setAlpha(0);

    // Red edge flash while greed is critical.
    this.dangerVignette = this.add.rectangle(0, 0, 10, 10, 0xe03131, 0).setDepth(9);

    // Tap ability button (mobile-friendly big hit area, bottom-right)
    this.abilityBtn = this.add.circle(0, 0, 40, 0x4dabf7, 0.85)
      .setStrokeStyle(3, 0xffffff).setDepth(10).setInteractive({ useHandCursor: true });
    this.abilityBtnText = this.add.text(0, 0, 'USE', {
      fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setOrigin(0.5).setDepth(11);
    this.abilityBtn.on('pointerdown', () => this.tryActivateAbility());
  }

  buildJoystick() {
    this.joystickRadius = 56;
    this.joystickCenter = { x: 80, y: 80 };

    this.joystickBase = this.add.circle(0, 0, this.joystickRadius, 0x0b4f6c, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.65).setDepth(10);
    this.joystickKnob = this.add.circle(0, 0, this.joystickRadius * 0.42, 0xffffff, 0.7)
      .setStrokeStyle(2, 0x4dabf7).setDepth(11);
    this.joystickLabel = this.add.text(0, 0, 'MOVE', {
      fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setOrigin(0.5).setDepth(11);

    this.input.on('pointerdown', pointer => {
      if (this.joystickPointerId !== null) return;
      const grabRadius = this.joystickRadius * 1.5;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickCenter.x, this.joystickCenter.y) <= grabRadius) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
    });
    this.input.on('pointermove', pointer => {
      if (pointer.id === this.joystickPointerId && pointer.isDown) this.updateJoystick(pointer);
    });
    this.input.on('pointerup', pointer => {
      if (pointer.id === this.joystickPointerId) this.resetJoystick();
    });
  }

  updateJoystick(pointer) {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const length = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(length, this.joystickRadius);
    this.joystickKnob.setPosition(
      this.joystickCenter.x + (dx / length) * clamped,
      this.joystickCenter.y + (dy / length) * clamped
    );
    this.moveInput.x = (dx / length) * (clamped / this.joystickRadius);
    this.moveInput.y = (dy / length) * (clamped / this.joystickRadius);
  }

  resetJoystick() {
    this.joystickPointerId = null;
    this.moveInput.x = 0;
    this.moveInput.y = 0;
    this.joystickKnob.setPosition(this.joystickCenter.x, this.joystickCenter.y);
  }

  buildPauseButton() {
    this.pauseBtn = this.add.text(0, 0, '||', {
      fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setOrigin(1, 0).setDepth(10).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.pauseGame());
  }

  pauseGame() {
    if (this.isGameOver || !this.scene.isActive()) return;
    this.resetJoystick();
    GameAudio.play('ui');
    this.scene.pause();
    this.scene.launch('PauseScene', { gameSceneKey: this.scene.key });
  }

  tryActivateAbility() {
    if (this.isGameOver) return;
    if (this.abilitySystem.activate()) {
      this.cameras.main.flash(200, 255, 212, 59, false);
      GameAudio.play('ability');
      GameAudio.vibrate(40);
      this.showFloatingText(this.croc.x, this.croc.y - this.crocHalfHeight, this.character.ability.name.toUpperCase(), '#ffd43b');
    }
  }

  applyDifficultyStage(force = false) {
    const stage = GameData.getDifficultyStage(this.elapsedMs);
    if (!force && stage === this.currentStage) return;
    const previous = this.currentStage;
    this.currentStage = stage;

    if (this.difficultyText) this.difficultyText.setText(stage.label.toUpperCase());
    if (previous) this.announceStage(stage.label);

    if (this.moneyTimer) this.moneyTimer.remove(false);
    if (this.obstacleTimer) this.obstacleTimer.remove(false);

    this.moneyTimer = this.time.addEvent({ delay: stage.spawnRateMoney, loop: true, callback: () => this.spawnMoney() });
    this.obstacleTimer = this.time.addEvent({ delay: stage.spawnRateObstacle, loop: true, callback: () => this.spawnObstacle() });
  }

  announceStage(label) {
    GameAudio.play('stage');
    this.stageBanner.setText(label.toUpperCase()).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: this.stageBanner,
      alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.stageBanner, alpha: 0, duration: 400, delay: 700 });
      }
    });
  }

  spawnMoney() {
    if (this.isGameOver) return;
    const def = GameData.weightedPick(GameData.moneyTypes);
    this.spawnFloatingItem(`money-${def.id}`, def, this.moneyGroup);
  }

  spawnObstacle() {
    if (this.isGameOver) return;
    const def = GameData.weightedPick(GameData.obstacleTypes);
    this.spawnFloatingItem(`obstacle-${def.id}`, def, this.obstacleGroup);
  }

  spawnFloatingItem(textureKey, def, group) {
    const { width } = this.scale;
    const spriteScale = GameLayout.spriteScale(width, this.scale.height);
    const displayWidth = def.size * spriteScale;
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -displayWidth : width + displayWidth;

    const top = this.playfield.top + displayWidth * 0.6;
    const bottom = Math.max(top + 1, this.playfield.bottom - displayWidth * 0.6);
    const y = Phaser.Math.Between(top, bottom);

    const item = this.physics.add.image(x, y, textureKey);
    GameLayout.fitWidth(item, displayWidth);
    item.setData('def', def);
    item.setData('avoided', false);
    item.setData('halfWidth', item.displayWidth / 2);
    item.setDepth(4);
    group.add(item);

    // Screen-relative speed: items take the same time to cross whatever the
    // display size, so the game plays identically on a phone and a monitor.
    const baseSpeed = width * Phaser.Math.FloatBetween(0.16, 0.26);
    item.body.setVelocityX(baseSpeed * this.currentStage.speedMult * (fromLeft ? 1 : -1));
    if (!fromLeft) item.setFlipX(true);

    // Gentle vertical bob. Physics only drives X, so the tween owns Y.
    this.tweens.add({
      targets: item,
      y: y + Phaser.Math.Between(-22, 22),
      duration: Phaser.Math.Between(1200, 2000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Remove items that have left the screen. Done in the update loop rather
   * than with a repeating timer per item, which used to leave one live timer
   * running for every sprite ever spawned.
   */
  cullOffscreenItems() {
    const { width } = this.scale;
    const sweep = (group, isObstacle) => {
      const children = group.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        const item = children[i];
        if (!item.active) continue;
        const margin = item.getData('halfWidth') * 2 + 40;
        if (item.x < -margin || item.x > width + margin) {
          if (isObstacle && !item.getData('avoided')) {
            item.setData('avoided', true);
            this.avoidCount++;
          }
          this.tweens.killTweensOf(item);
          item.destroy();
        }
      }
    };
    sweep(this.moneyGroup, false);
    sweep(this.obstacleGroup, true);
  }

  // -----------------------------------------------------------------------
  // Collisions
  // -----------------------------------------------------------------------

  onCollectMoney(croc, item) {
    if (this.isGameOver || !item.active) return;
    const def = item.getData('def');

    this.advanceCombo();
    const multiplier = this.abilitySystem.getMultiplier() * this.comboMultiplier;
    const points = def.score * multiplier;

    this.scoreSystem.addScore(points);
    this.scoreSystem.registerMoneyCollected(def.score);
    this.hungerSystem.change(def.greed);

    const isBig = def.score >= 50;
    GameAudio.play(isBig ? 'collect_big' : 'collect', 1 + (this.comboMultiplier - 1) * 0.12);
    if (isBig) GameAudio.vibrate(25);

    this.showFloatingText(
      item.x, item.y,
      `+${Math.round(points)}${multiplier > 1 ? ` x${multiplier}` : ''}`,
      multiplier > 1 ? '#ffd43b' : '#ffffff'
    );
    this.spawnCollectBurst(item.x, item.y, multiplier > 1 ? 0xffd43b : 0xffffff);

    this.tweens.killTweensOf(item);
    item.destroy();
  }

  onHitObstacle(croc, item) {
    if (this.isGameOver || !item.active) return;
    if (this.elapsedMs < this.invulnerableUntil) return;

    const def = item.getData('def');
    this.hungerSystem.change(def.greedPenalty);
    this.breakCombo();

    // Brief mercy window so a cluster of papers can't wipe the bar at once.
    this.invulnerableUntil = this.elapsedMs + 600;
    this.tweens.add({ targets: this.croc, alpha: 0.35, duration: 100, yoyo: true, repeat: 2, onComplete: () => this.croc.setAlpha(1) });

    this.cameras.main.shake(180, 0.012);
    GameAudio.play('hit');
    GameAudio.vibrate(90);
    this.showFloatingText(item.x, item.y, `${def.greedPenalty}`, '#ff8787');
    this.spawnHitRing(item.x, item.y);

    this.tweens.killTweensOf(item);
    item.destroy();
  }

  // -----------------------------------------------------------------------
  // Combo
  // -----------------------------------------------------------------------

  advanceCombo() {
    const { windowMs, perStep, maxMultiplier } = GameData.combo;
    this.comboCount = (this.elapsedMs - this.lastCollectMs <= windowMs) ? this.comboCount + 1 : 1;
    this.lastCollectMs = this.elapsedMs;

    const next = Math.min(maxMultiplier, 1 + Math.floor(this.comboCount / perStep));
    if (next > this.comboMultiplier) {
      this.comboMultiplier = next;
      this.maxCombo = Math.max(this.maxCombo, next);
      this.tweens.add({ targets: this.comboText, scale: { from: 1.4, to: 1 }, duration: 240, ease: 'Back.easeOut' });
    }
  }

  breakCombo() {
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.lastCollectMs = -Infinity;
  }

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  showFloatingText(x, y, message, color) {
    const label = this.add.text(x, y, message, {
      fontFamily: 'Arial Black, Arial',
      fontSize: (this.popupFontSize || 16) + 'px',
      color,
      stroke: '#04202c',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(12);

    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      duration: 680,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  spawnCollectBurst(x, y, tint) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x, y, 'sparkle').setTint(tint).setDepth(11);
      const angle = (i / 8) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        duration: 350,
        onComplete: () => s.destroy()
      });
    }
  }

  spawnHitRing(x, y) {
    const ring = this.add.image(x, y, 'hit-ring').setAlpha(0.9).setDepth(11);
    this.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  spawnAmbientBubble() {
    const { width, height } = this.scale;
    const bubble = this.add.image(Phaser.Math.Between(0, width), height + 20, 'bubble')
      .setAlpha(0.4).setDepth(3).setScale(Phaser.Math.FloatBetween(0.4, 1.2));
    this.tweens.add({
      targets: bubble,
      y: -30,
      x: bubble.x + Phaser.Math.Between(-30, 30),
      duration: Phaser.Math.Between(3500, 6000),
      onComplete: () => bubble.destroy()
    });
  }

  // -----------------------------------------------------------------------
  // Main loop
  // -----------------------------------------------------------------------

  update(time, delta) {
    if (this.isGameOver) return;

    this.elapsedMs += delta;
    this.applyDifficultyStage();

    // Slow parallax drift on the water.
    this.bg.tilePositionX += delta * 0.012;

    this.updateMovement(delta);
    this.cullOffscreenItems();

    // Expire a stale combo even if the player simply stopped collecting.
    if (this.comboMultiplier > 1 && this.elapsedMs - this.lastCollectMs > GameData.combo.windowMs) {
      this.breakCombo();
    }

    this.hungerSystem.update(delta / 1000, this.currentStage.greedDrainMult);
    this.abilitySystem.update(delta);

    this.updateHud();

    const totalSeconds = Math.floor(this.elapsedMs / 1000);
    this.achievementSystem.evaluate({
      moneyCount: this.scoreSystem.moneyCollectedCount,
      moneyTotal: this.scoreSystem.moneyCollectedTotal,
      survivalSeconds: totalSeconds,
      avoidCount: this.avoidCount,
      maxCombo: this.maxCombo
    });

    if (this.hungerSystem.isDepleted()) {
      this.triggerGameOver();
    }
  }

  updateMovement(delta) {
    let moveX = this.moveInput.x;
    let moveY = this.moveInput.y;
    if (this.cursors.left.isDown || this.wasd.A.isDown) moveX = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) moveX = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) moveY = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) moveY = 1;

    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 0) {
      // Time-based so it feels identical at any frame rate, and
      // screen-relative so it feels identical at any screen size.
      const speed = GameLayout.unit(this.scale.width, this.scale.height) * 0.62;
      const step = speed * (delta / 1000);
      this.croc.x += (moveX / magnitude) * step;
      this.croc.y += (moveY / magnitude) * step;

      if (moveX !== 0) this.croc.flipX = moveX < 0;
      // Lean into the direction of travel.
      const targetAngle = Phaser.Math.Clamp((moveY / magnitude) * 16, -16, 16) * (this.croc.flipX ? -1 : 1);
      this.croc.angle = Phaser.Math.Linear(this.croc.angle, targetAngle, 0.15);
    } else {
      this.croc.angle = Phaser.Math.Linear(this.croc.angle, 0, 0.1);
    }

    this.croc.x = Phaser.Math.Clamp(this.croc.x, this.crocHalfWidth, this.scale.width - this.crocHalfWidth);
    this.croc.y = Phaser.Math.Clamp(
      this.croc.y,
      this.playfield.top + this.crocHalfHeight,
      this.playfield.bottom - this.crocHalfHeight
    );
  }

  updateHud() {
    this.scoreText.setText(`SCORE: ${this.scoreSystem.score.toLocaleString()}`);

    const totalSeconds = Math.floor(this.elapsedMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    this.timeText.setText(`TIME: ${mm}:${ss}`);

    const greedPct = this.hungerSystem.getPercent();
    this.greedBarFill.setSize(Math.max(0.001, this.greedBarMaxWidth * greedPct), this.barFillHeight);
    this.greedBarFill.setFillStyle(greedPct > 0.5 ? 0x2f9e44 : greedPct > 0.2 ? 0xf59f00 : 0xe03131);

    this.abilityBarFill.setSize(Math.max(0.001, this.greedBarMaxWidth * this.abilitySystem.getMeterFill()), this.barFillHeight);
    const ready = this.abilitySystem.canActivate();
    this.abilityBarFill.setFillStyle(this.abilitySystem.active ? 0xffd43b : ready ? 0x4dabf7 : 0x495057);
    this.abilityBtn.setFillStyle(ready ? 0x4dabf7 : 0x495057, 0.85);

    if (this.comboMultiplier > 1) {
      this.comboText.setText(`COMBO x${this.comboMultiplier}`).setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }

    // Critical-greed warning: pulsing red edges plus a heartbeat tone.
    if (greedPct <= 0.2) {
      const pulse = 0.18 + Math.sin(this.elapsedMs / 130) * 0.12;
      this.dangerVignette.setFillStyle(0xe03131, Math.max(0, pulse));
      if (this.elapsedMs - this.lastDangerBeepMs > 900) {
        this.lastDangerBeepMs = this.elapsedMs;
        GameAudio.play('danger');
      }
    } else {
      this.dangerVignette.setFillStyle(0xe03131, 0);
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.resetJoystick();
    if (this.moneyTimer) this.moneyTimer.remove(false);
    if (this.obstacleTimer) this.obstacleTimer.remove(false);
    if (this.bubbleTimer) this.bubbleTimer.remove(false);

    GameAudio.stopMusic();
    GameAudio.play('gameover');
    GameAudio.vibrate([60, 60, 120]);

    const scoreBefore = this.scoreSystem.highScore;
    this.scoreSystem.commitHighScoreIfBeaten();
    const beatHighScore = this.scoreSystem.score > scoreBefore;

    const newlyUnlocked = this.achievementSystem.consumeNewlyUnlocked();

    this.cameras.main.shake(300, 0.02);
    this.time.delayedCall(450, () => {
      this.scene.start('GameOverScene', {
        score: this.scoreSystem.score,
        highScore: this.scoreSystem.highScore,
        beatHighScore,
        survivalSeconds: Math.floor(this.elapsedMs / 1000),
        maxCombo: this.maxCombo,
        avoidCount: this.avoidCount,
        newlyUnlocked
      });
    });
  }
}
