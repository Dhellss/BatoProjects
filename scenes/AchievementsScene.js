
/**
 * Achievement gallery.
 *
 * The achievement system was already tracking progress, but the only place it
 * ever surfaced was a one-off popup on the game-over screen. This gives the
 * unlocks somewhere to live.
 */
class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('AchievementsScene');
  }

  create() {
    const { width, height } = this.scale;
    GameLayout.coverTileSprite(this, 'bg-water').setAlpha(0.6);

    this.achievementSystem = this.game.registry.get('achievementSystem') || new AchievementSystem();
    this.game.registry.set('achievementSystem', this.achievementSystem);

    const total = GameData.achievements.length;
    const unlockedCount = GameData.achievements.filter(a => this.achievementSystem.unlocked.has(a.id)).length;

    UI.title(this, 'ACHIEVEMENTS', 0.09);
    this.add.text(width / 2, height * 0.155, `${unlockedCount} of ${total} unlocked`, {
      fontFamily: 'Arial',
      fontSize: GameLayout.font(width, height, 0.04, 12, 17) + 'px',
      color: '#e7f5ff'
    }).setOrigin(0.5);

    const topY = height * 0.21;
    const bottomY = height * 0.94;
    const rowHeight = Math.min(64, (bottomY - topY) / total);
    const rowWidth = Math.min(420, width * 0.88);
    const nameSize = GameLayout.font(width, height, 0.038, 12, 17);
    const descSize = GameLayout.font(width, height, 0.03, 10, 14);

    GameData.achievements.forEach((ach, i) => {
      const unlocked = this.achievementSystem.unlocked.has(ach.id);
      const y = topY + rowHeight * (i + 0.5);

      this.add.rectangle(width / 2, y, rowWidth, rowHeight - 6, unlocked ? 0x14603f : 0x102b38, 0.9)
        .setStrokeStyle(2, unlocked ? 0x69db7c : 0x2c4a58);

      this.add.text(width / 2 - rowWidth / 2 + 14, y, unlocked ? '★' : '○', {
        fontFamily: 'Arial',
        fontSize: GameLayout.font(width, height, 0.05, 16, 24) + 'px',
        color: unlocked ? '#ffd43b' : '#55707d'
      }).setOrigin(0, 0.5);

      const textX = width / 2 - rowWidth / 2 + 48;
      this.add.text(textX, y - descSize * 0.8, ach.name, {
        fontFamily: 'Arial Black, Arial',
        fontSize: nameSize + 'px',
        color: unlocked ? '#ffffff' : '#7f9aa6'
      }).setOrigin(0, 0.5);

      this.add.text(textX, y + nameSize * 0.7, ach.description, {
        fontFamily: 'Arial',
        fontSize: descSize + 'px',
        color: unlocked ? '#c5f6d5' : '#5d7883',
        wordWrap: { width: rowWidth - 60 }
      }).setOrigin(0, 0.5);
    });

    UI.backButton(this, () => this.scene.start('MainMenu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
    GameLayout.rebuildOnResize(this);
  }
}
