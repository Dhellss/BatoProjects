
/**
 * Procedural audio.
 *
 * Every sound is synthesised with the Web Audio API, so the game stays
 * asset-free on the audio side: no files to load, nothing to 404, and the
 * volume sliders in Settings finally do something.
 *
 * A single shared instance is exported as `GameAudio`. Browsers refuse to
 * start an AudioContext before a user gesture, so everything is created
 * lazily on the first tap/keypress via unlock().
 */
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.settings = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      try {
        this.ctx = new Ctx();
      } catch (e) {
        return false;
      }
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.applySettings(this.settings || GameSettings.load());
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  applySettings(settings) {
    this.settings = settings;
    if (!this.ctx) return;
    this.sfxGain.gain.value = settings.sfxVolume;
    // Music sits well under the effects so pickups stay readable.
    this.musicGain.gain.value = settings.musicVolume * 0.3;
  }

  vibrate(pattern) {
    const settings = this.settings || GameSettings.load();
    if (!settings.vibration) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------
  // Primitives
  // ---------------------------------------------------------------------

  tone({ freq, freqEnd, type = 'sine', duration = 0.15, gain = 0.3, attack = 0.006, delay = 0, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);

    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(env);
    env.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  noise({ duration = 0.25, gain = 0.4, filterFreq = 900 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      // Linear decay keeps the burst punchy instead of hissy.
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const env = ctx.createGain();
    env.gain.value = gain;

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start();
  }

  // ---------------------------------------------------------------------
  // Named effects
  // ---------------------------------------------------------------------

  /**
   * @param {string} name
   * @param {number} pitch - multiplier used to raise the pitch as a combo grows
   */
  play(name, pitch = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;

    switch (name) {
      case 'collect':
        this.tone({ freq: 620 * pitch, type: 'square', duration: 0.09, gain: 0.16 });
        this.tone({ freq: 930 * pitch, type: 'square', duration: 0.10, gain: 0.10, delay: 0.05 });
        break;

      case 'collect_big':
        [0, 0.07, 0.14].forEach((delay, i) => {
          this.tone({ freq: 520 * Math.pow(1.26, i) * pitch, type: 'triangle', duration: 0.22, gain: 0.2, delay });
        });
        break;

      case 'hit':
        this.noise({ duration: 0.3, gain: 0.35, filterFreq: 700 });
        this.tone({ freq: 160, freqEnd: 55, type: 'sawtooth', duration: 0.32, gain: 0.25 });
        break;

      case 'ability':
        this.tone({ freq: 260, freqEnd: 1250, type: 'sawtooth', duration: 0.42, gain: 0.22 });
        this.tone({ freq: 520, freqEnd: 2500, type: 'sine', duration: 0.42, gain: 0.12 });
        break;

      case 'danger':
        this.tone({ freq: 220, freqEnd: 180, type: 'sine', duration: 0.28, gain: 0.18 });
        break;

      case 'stage':
        [0, 0.1].forEach((delay, i) => {
          this.tone({ freq: 440 * (i + 1), type: 'triangle', duration: 0.24, gain: 0.16, delay });
        });
        break;

      case 'unlock':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone({ freq, type: 'triangle', duration: 0.3, gain: 0.2, delay: i * 0.09 });
        });
        break;

      case 'gameover':
        [392, 330, 262, 196].forEach((freq, i) => {
          this.tone({ freq, type: 'sawtooth', duration: 0.5, gain: 0.2, delay: i * 0.16 });
        });
        break;

      case 'ui':
      default:
        this.tone({ freq: 480, type: 'square', duration: 0.06, gain: 0.12 });
        break;
    }
  }

  // ---------------------------------------------------------------------
  // Ambient music: a sparse A-minor-pentatonic arpeggio over a drone.
  // ---------------------------------------------------------------------

  startMusic() {
    if (!this.unlock() || this.musicTimer) return;
    const scale = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00];
    this.musicStep = 0;

    const step = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const i = this.musicStep++;

      // Every fourth step rests, so the loop breathes instead of chattering.
      if (i % 4 === 3) return;

      const freq = scale[(i * 3) % scale.length] * (i % 8 < 4 ? 1 : 1.5);
      this.tone({ freq, type: 'triangle', duration: 1.2, gain: 0.22, attack: 0.09, dest: this.musicGain });

      // Bass drone once per bar.
      if (i % 8 === 0) {
        this.tone({ freq: 55, type: 'sine', duration: 3.4, gain: 0.3, attack: 0.4, dest: this.musicGain });
      }
    };

    step();
    this.musicTimer = setInterval(step, 480);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

const GameAudio = new AudioSystem();
