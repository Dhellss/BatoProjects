
class ScoreSystem {
  constructor() {
    this.score = 0;
    this.moneyCollectedCount = 0;
    this.moneyCollectedTotal = 0; // raw score value of money eaten (for achievements)
    this.highScore = this.loadHighScore();
  }

  reset() {
    this.score = 0;
    this.moneyCollectedCount = 0;
    this.moneyCollectedTotal = 0;
  }

  addScore(amount) {
    this.score += Math.round(amount);
    return this.score;
  }

  registerMoneyCollected(baseValue) {
    this.moneyCollectedCount += 1;
    this.moneyCollectedTotal += baseValue;
  }

  commitHighScoreIfBeaten() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
      return true;
    }
    return false;
  }

  loadHighScore() {
    try {
      const v = localStorage.getItem('bato_high_score');
      return v ? parseInt(v, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore() {
    try {
      localStorage.setItem('bato_high_score', String(this.highScore));
    } catch (e) {
      // localStorage unavailable — fail silently, high score just won't persist
    }
  }
}
