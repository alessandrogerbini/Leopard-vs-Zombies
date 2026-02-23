/**
 * @module 3d/audio
 * @description Audio manager for the 3D Roguelike Survivor mode.
 *
 * Provides a simple sound pool system using HTMLAudioElement. Each game event
 * maps to one or more sound file variants; playSound() picks a random variant
 * from the pool each time. Supports concurrent playback (up to MAX_CONCURRENT),
 * master volume control, mute toggle, and localStorage persistence of preferences.
 *
 * All public functions fail silently -- a missing sound file or browser autoplay
 * restriction will never crash the game. The game works identically without sound.
 *
 * Dependencies: None (pure browser APIs)
 * Exports: initAudio, playSound, setVolume, getVolume, toggleMute, isMuted, disposeAudio
 */

/** Maximum simultaneous sounds to prevent audio overload. */
const MAX_CONCURRENT = 8;

/** localStorage keys for persisting user preferences. */
const VOLUME_KEY = 'avz-volume';
const MUTED_KEY = 'avz-muted';

/** Default volume (0.0 - 1.0). */
const DEFAULT_VOLUME = 0.3;

/**
 * Sound event ID to file path mappings.
 * Each key is a game event ID; value is an array of file paths (relative to basePath).
 * When playSound() is called, one variant is chosen at random.
 */
const SOUND_MAP = {
  // --- Combat ---
  sfx_melee_hit: [
    'bite-1.mp3', 'bite-2.ogg', 'bite-3.ogg', 'bite-4.ogg',
  ],
  sfx_power_attack_charge: [
    'leapord-growl-1.ogg',
  ],
  sfx_power_attack_release: [
    'rawr-1.ogg',
  ],
  sfx_explosion: [
    'explode-1.ogg',
  ],

  // --- Weapons ---
  sfx_weapon_projectile: [
    'pew-3x-1.ogg', 'pew-3x-2.ogg',
  ],
  sfx_weapon_multishot: [
    'pew-5x-1.ogg',
  ],
  sfx_weapon_heavy: [
    'big-pew-1.ogg',
  ],
  sfx_weapon_poison: [
    'gas-1.ogg', 'gas-2.ogg', 'gas-3.ogg',
    'fart-1.ogg', 'fart-2.ogg', 'fart-3.ogg',
  ],
  sfx_weapon_boomerang: [
    // No boomerang sound in pack -- needs Sound Pack Beta
  ],
  sfx_weapon_litterbox: [
    'litterbox-1.ogg',
  ],

  // --- Movement ---
  sfx_jump: [
    'bouncy-boots-1.ogg', 'bouncy-boots-2.ogg',
    'bouncy-boots-3.ogg', 'bouncy-boots-4.ogg',
  ],
  sfx_land: [
    // No dedicated landing sound -- needs Sound Pack Beta
  ],

  // --- Powerups ---
  sfx_powerup_wings: [
    'wings-1.ogg', 'wings-2.ogg', 'wings-4.ogg',
  ],
  sfx_powerup_wings_expire: [
    'falling-scream-1.ogg',
  ],
  sfx_powerup_racecar: [
    'race-car-1.ogg', 'race-car-2.ogg', 'race-car-3.ogg',
  ],
  sfx_powerup_speed: [
    'e-scooter-1.ogg', 'e-scooter-2.ogg',
  ],
  sfx_powerup_generic: [
    // No generic powerup sound -- needs Sound Pack Beta
  ],

  // --- Zombie (all merge-tiered, no spawn/death in this pack) ---
  sfx_zombie_spawn: [
  ],
  sfx_zombie_merge_low: [
    'zombie-1.ogg', 'zombie-2.ogg', 'zombie-3.ogg', 'zombie-7.ogg',
  ],
  sfx_zombie_merge_mid: [
    'zombie-6.ogg',
  ],
  sfx_zombie_merge_high: [
    'zombie-4.ogg', 'zombie-5.ogg',
  ],
  sfx_zombie_death_low: [
  ],
  sfx_zombie_death_high: [
    'explode-1.ogg',
  ],

  // --- Player ---
  sfx_player_growl: [
    'leapord-growl-1.ogg',
  ],
  sfx_player_death: [
    // Needs Sound Pack Beta
  ],

  // --- Progression ---
  sfx_level_up: [
    'rawr-2.ogg',
  ],
  sfx_xp_pickup: [
    // Needs Sound Pack Beta
  ],

  // --- World ---
  sfx_crate_open: [
    // Needs Sound Pack Beta
  ],
  sfx_shrine_break: [
    'explode-1.ogg',
  ],
  sfx_item_pickup: [
    // Needs Sound Pack Beta
  ],
  sfx_comedic_drop: [
    'poop-1.ogg',
  ],
};

// --- Module state ---

/** @type {string} Base path to the sound files directory (set by initAudio). */
let basePath = '';

/**
 * Pre-loaded Audio elements keyed by full file path.
 * Each entry is a "template" Audio that we clone for playback.
 * @type {Object.<string, HTMLAudioElement>}
 */
let audioCache = {};

/** Currently playing Audio elements (for concurrent limiting and cleanup). */
let activeSounds = [];

/** Master volume (0.0 - 1.0). */
let masterVolume = DEFAULT_VOLUME;

/** Whether audio is muted. */
let muted = false;

/** Whether initAudio has been called successfully. */
let initialized = false;

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the audio system: set the base path, restore user preferences,
 * and preload all sound files.
 *
 * @param {string} base - Path to the sound files directory (e.g. 'sound-pack-alpha/').
 */
export function initAudio(base) {
  basePath = base.endsWith('/') ? base : base + '/';

  // Restore user preferences from localStorage
  try {
    const savedVol = localStorage.getItem(VOLUME_KEY);
    if (savedVol !== null) masterVolume = Math.max(0, Math.min(1, parseFloat(savedVol)));
    const savedMute = localStorage.getItem(MUTED_KEY);
    if (savedMute !== null) muted = savedMute === 'true';
  } catch (_) {
    // localStorage may be unavailable; silently use defaults
  }

  // Preload all sound files referenced in SOUND_MAP
  const allFiles = new Set();
  for (const variants of Object.values(SOUND_MAP)) {
    for (const f of variants) allFiles.add(f);
  }

  for (const file of allFiles) {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = basePath + file;
      // Start loading (non-blocking)
      audio.load();
      audioCache[file] = audio;
    } catch (_) {
      // Skip files that fail to load; playSound will gracefully handle missing entries
    }
  }

  initialized = true;
}

/**
 * Play a sound by game event ID.
 *
 * Picks a random variant from the pool for that event, clones the cached Audio
 * element, and plays it. Limits concurrent sounds to MAX_CONCURRENT. Fails silently
 * if the event ID is unknown, the file is missing, or the browser blocks autoplay.
 *
 * @param {string} eventId - The sound event ID (e.g. 'sfx_melee_hit').
 */
export function playSound(eventId) {
  if (!initialized || muted) return;

  const variants = SOUND_MAP[eventId];
  if (!variants || variants.length === 0) return;

  // Pick random variant
  const file = variants[Math.floor(Math.random() * variants.length)];
  const template = audioCache[file];
  if (!template) return;

  // Prune finished sounds from the active list
  activeSounds = activeSounds.filter(a => !a.ended && !a.paused);

  // Enforce concurrent limit
  if (activeSounds.length >= MAX_CONCURRENT) return;

  try {
    const sound = template.cloneNode(true);
    sound.volume = masterVolume;
    sound.currentTime = 0;

    // Auto-remove from active list when finished
    sound.addEventListener('ended', () => {
      const idx = activeSounds.indexOf(sound);
      if (idx >= 0) activeSounds.splice(idx, 1);
    }, { once: true });

    activeSounds.push(sound);
    sound.play().catch(() => {
      // Browser autoplay policy blocked playback; silently ignore
      const idx = activeSounds.indexOf(sound);
      if (idx >= 0) activeSounds.splice(idx, 1);
    });
  } catch (_) {
    // Fail silently
  }
}

/**
 * Set the master volume (0.0 - 1.0). Persists to localStorage.
 *
 * @param {number} vol - Volume level between 0 and 1.
 */
export function setVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, vol));
  try { localStorage.setItem(VOLUME_KEY, String(masterVolume)); } catch (_) {}
}

/**
 * Get the current master volume (0.0 - 1.0).
 *
 * @returns {number} Current volume level.
 */
export function getVolume() {
  return masterVolume;
}

/**
 * Toggle mute on/off. Persists to localStorage.
 *
 * @returns {boolean} The new muted state (true = muted).
 */
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTED_KEY, String(muted)); } catch (_) {}
  // If unmuting, no need to resume anything; next playSound will work
  // If muting, stop all currently playing sounds
  if (muted) {
    for (const s of activeSounds) {
      try { s.pause(); s.currentTime = 0; } catch (_) {}
    }
    activeSounds = [];
  }
  return muted;
}

/**
 * Check whether audio is currently muted.
 *
 * @returns {boolean} True if muted.
 */
export function isMuted() {
  return muted;
}

/**
 * Dispose all audio resources. Stops active sounds and clears the cache.
 * Should be called when leaving 3D mode.
 */
export function disposeAudio() {
  // Stop all active sounds
  for (const s of activeSounds) {
    try { s.pause(); s.currentTime = 0; } catch (_) {}
  }
  activeSounds = [];

  // Clear cache
  for (const key of Object.keys(audioCache)) {
    try {
      const a = audioCache[key];
      a.pause();
      a.removeAttribute('src');
      a.load(); // release resources
    } catch (_) {}
  }
  audioCache = {};
  initialized = false;
}
