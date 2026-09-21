
/**
 * Persisted player settings.
 *
 * Lives in its own file (rather than inside SettingsScene) because the audio
 * system and the gameplay scene both need to read it before the settings
 * screen has ever been opened.
 */
const GameSettings = {
  storageKey: 'bato_settings',

  defaults: {
    musicVolume: 0.6,
    sfxVolume: 0.8,
    vibration: true,
    fullscreen: false
  },

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? Object.assign({}, this.defaults, JSON.parse(raw)) : Object.assign({}, this.defaults);
    } catch (e) {
      return Object.assign({}, this.defaults);
    }
  },

  save(settings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (e) { /* ignore */ }
    // Keep the live audio mix in sync with whatever the player just changed.
    if (typeof GameAudio !== 'undefined') GameAudio.applySettings(settings);
  }
};
