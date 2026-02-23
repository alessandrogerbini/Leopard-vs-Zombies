# Track B: Audio Integration

**Focus:** Sound manager module, 40 mouth-made SFX hookups, volume control
**Key Files:** `js/3d/audio.js` (new), hookups in `js/game3d.js` (or extracted modules)
**Effort:** 8-10 hours
**Blocked By:** Nothing (can start Day 1)
**Sound assets:** `/sound-pack-alpha/` (40 files, 39 .ogg + 1 .mp3)
**Sound mapping:** `/sound-pack-alpha/sound-ids.md`

---

## Task B-1: Create Audio Manager Module

**What to build:** A self-contained audio manager that preloads sound files, plays them by event ID with random variant selection from pools, and provides volume/mute control. Uses HTMLAudioElement (simpler) or Web Audio API (better pooling).

**File:** `js/3d/audio.js` (new)

**Decision:** Use **HTMLAudioElement** for simplicity. Web Audio API is more capable but HTMLAudioElement is sufficient for 40 files with simple playback. If latency or simultaneous playback becomes a problem, upgrade to Web Audio API post-alpha.

**Interface:**
```javascript
/**
 * @typedef {Object} AudioManager
 * @property {function(string): void} play - Play a sound by its event ID
 * @property {function(number): void} setVolume - Set master volume (0-1)
 * @property {function(): void} mute - Mute all audio
 * @property {function(): void} unmute - Unmute audio
 * @property {function(): boolean} isMuted - Check mute state
 * @property {function(): number} getVolume - Get current volume
 * @property {function(): Promise<void>} preloadAll - Preload all audio files
 */

/**
 * Create the audio manager with the sound ID registry.
 * @param {string} basePath - Path to the sound-pack-alpha directory
 * @returns {AudioManager}
 */
export function createAudioManager(basePath = 'sound-pack-alpha') {
  // Sound registry: maps event ID to array of file paths
  const SOUND_REGISTRY = {
    sfx_melee_hit: ['Bite-1.ogg', 'Bite-2.ogg', 'bite-3.ogg', 'bite-4.ogg'],
    sfx_power_attack_charge: ['leapord-growl-1.ogg'],
    sfx_power_attack_release: ['rawr-1.ogg', 'rawr-2.ogg'],
    sfx_weapon_projectile: ['pew-pew-pew-1.ogg', 'pew-pew-pew-2.ogg'],
    sfx_weapon_multishot: ['pew-pew-pew-pew-pew-1.ogg'],
    sfx_weapon_heavy: ['big-pew-1.ogg'],
    sfx_weapon_poison: ['gas-1.ogg', 'gas-2.ogg', 'gas-3.ogg', 'fart-1.ogg', 'fart-2.ogg', 'fart-3.ogg'],
    sfx_weapon_boomerang: ['wings-4.ogg'],
    sfx_explosion: ['explode-1.ogg'],
    sfx_jump: ['bouncy-boots-1.ogg', 'bouncy-boots-2.ogg', 'bouncy-boots-3.ogg'],
    sfx_land: ['bouncy-boots-4.ogg'],
    sfx_powerup_wings: ['wings-1.ogg', 'wings-2.ogg'],
    sfx_powerup_racecar: ['race-car-1.ogg', 'race-car-2.ogg', 'race-car-3.ogg'],
    sfx_powerup_speed: ['e-scooter-1.ogg', 'e-scooter-2.ogg'],
    sfx_zombie_spawn: ['zombie-1.ogg', 'zombie-2.ogg'],
    sfx_zombie_merge: ['zombie-3.ogg', 'zombie-6.ogg'],
    sfx_zombie_death_low: ['zombie-7.ogg'],
    sfx_zombie_death_high: ['zombie-4.ogg', 'zombie-5.ogg'],
    sfx_player_growl: ['leapord-growl-1.ogg'],
    sfx_player_death: ['falling-scream-1.ogg'],
    sfx_level_up: ['rawr-1.ogg'],
    sfx_crate_open: ['litterbox-1.ogg'],
    sfx_comedic_drop: ['poop-1.ogg'],
  };

  let volume = 0.7;
  let muted = false;
  const audioCache = {}; // file path -> HTMLAudioElement

  function preloadAll() {
    const allFiles = new Set();
    for (const files of Object.values(SOUND_REGISTRY)) {
      files.forEach(f => allFiles.add(f));
    }
    const promises = [];
    for (const file of allFiles) {
      const audio = new Audio(`${basePath}/${file}`);
      audio.preload = 'auto';
      audioCache[file] = audio;
      promises.push(new Promise(resolve => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true }); // don't block on error
      }));
    }
    return Promise.all(promises);
  }

  function play(soundId) {
    if (muted) return;
    const files = SOUND_REGISTRY[soundId];
    if (!files || files.length === 0) return;
    const file = files[Math.floor(Math.random() * files.length)];
    const cached = audioCache[file];
    if (cached) {
      // Clone the audio element for overlapping playback
      const clone = cached.cloneNode();
      clone.volume = volume;
      clone.play().catch(() => {}); // ignore autoplay policy errors
    } else {
      // Fallback: create and play directly
      const audio = new Audio(`${basePath}/${file}`);
      audio.volume = volume;
      audio.play().catch(() => {});
    }
  }

  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); }
  function getVolume() { return volume; }
  function muteAudio() { muted = true; }
  function unmuteAudio() { muted = false; }
  function isMutedFn() { return muted; }

  return {
    play,
    setVolume,
    getVolume,
    mute: muteAudio,
    unmute: unmuteAudio,
    isMuted: isMutedFn,
    preloadAll,
    SOUND_REGISTRY, // exposed for testing
  };
}
```

**Test criteria:**
```javascript
import { createAudioManager } from '../js/3d/audio.js';
const audio = createAudioManager('test-sounds');

// Registry completeness
const registry = audio.SOUND_REGISTRY;
assert(registry.sfx_melee_hit.length >= 3, 'Melee hit has 3+ variants');
assert(registry.sfx_power_attack_release.length >= 2, 'Power attack has 2+ variants');
assert(registry.sfx_zombie_spawn.length >= 2, 'Zombie spawn has 2+ variants');

// All 22 sound IDs present
const requiredIds = [
  'sfx_melee_hit', 'sfx_power_attack_charge', 'sfx_power_attack_release',
  'sfx_weapon_projectile', 'sfx_weapon_multishot', 'sfx_weapon_heavy',
  'sfx_weapon_poison', 'sfx_weapon_boomerang', 'sfx_explosion',
  'sfx_jump', 'sfx_land', 'sfx_powerup_wings', 'sfx_powerup_racecar',
  'sfx_powerup_speed', 'sfx_zombie_spawn', 'sfx_zombie_merge',
  'sfx_zombie_death_low', 'sfx_zombie_death_high', 'sfx_player_growl',
  'sfx_player_death', 'sfx_level_up', 'sfx_crate_open',
];
for (const id of requiredIds) {
  assert(registry[id], `Sound ID '${id}' exists in registry`);
  assert(registry[id].length > 0, `Sound ID '${id}' has files`);
}

// Volume control
audio.setVolume(0.5);
assertEqual(audio.getVolume(), 0.5, 'Volume set to 0.5');
audio.setVolume(-1);
assertEqual(audio.getVolume(), 0, 'Volume clamped at 0');
audio.setVolume(2);
assertEqual(audio.getVolume(), 1, 'Volume clamped at 1');

// Mute toggle
audio.mute();
assert(audio.isMuted(), 'Muted');
audio.unmute();
assert(!audio.isMuted(), 'Unmuted');
```

**Done when:** `createAudioManager()` returns a working manager, all 22 sound IDs are registered, volume/mute controls work, `play()` picks random variant from pool.

---

## Task B-2: Convert Bite-1.mp3 to .ogg

**What to build:** Convert the single .mp3 file to .ogg for format consistency.

**Method:** Use ffmpeg if available, or any online converter. Place the new `Bite-1.ogg` in `sound-pack-alpha/`.

**Command:**
```bash
ffmpeg -i sound-pack-alpha/Bite-1.mp3 sound-pack-alpha/Bite-1.ogg
```

**Also:** Run a quick volume normalization pass across all 40 files if levels are notably inconsistent. Use ffmpeg's loudnorm filter:
```bash
for f in sound-pack-alpha/*.ogg; do
  ffmpeg -i "$f" -af loudnorm=I=-16:TP=-1.5:LRA=11 -y "${f%.ogg}-norm.ogg"
done
```

Only apply normalization if manual listening reveals significant volume differences.

**Done when:** All sound files are .ogg format. Volume levels are reasonably consistent across files.

---

## Task B-3: Hook Audio to Combat Events (~8 events)

**What to build:** Wire the audio manager's `play()` calls into combat-related code points.

**Files to modify:** `js/game3d.js` (or `js/3d/combat.js` if extracted by this point)

**Event hookups:**

| Game Event | Sound ID | Code Location | Trigger |
|-----------|----------|---------------|---------|
| Auto-attack melee hit | `sfx_melee_hit` | In auto-attack section when claw swipe damages enemy | Each hit |
| Power attack charge start | `sfx_power_attack_charge` | When `st.charging` becomes true | Once per charge |
| Power attack release | `sfx_power_attack_release` | When charge is released and AoE fires | Once per release |
| Enemy killed (tier 1-4) | `sfx_zombie_death_low` | In `killEnemy()` when enemy tier < 5 | Each kill |
| Enemy killed (tier 5+) | `sfx_zombie_death_high` | In `killEnemy()` when enemy tier >= 5 | Each kill |
| Player takes damage | `sfx_melee_hit` (reuse bite) | When `st.hp` decreases from enemy contact | Each hit, throttled to max 1/0.5s |
| Player death | `sfx_player_death` | When `st.gameOver` becomes true | Once |
| Level up | `sfx_level_up` | When upgrade menu appears | Once per level |

**Implementation pattern:**
```javascript
// In game3d.js or combat.js, audio manager passed as parameter:
function damageEnemy(e, dmg, st, scene, callbacks) {
  // ... existing damage logic ...
  if (e.hp <= 0) {
    killEnemy(e, st, scene, callbacks);
    const tier = e.tier || 1;
    if (callbacks.audio) {
      callbacks.audio.play(tier < 5 ? 'sfx_zombie_death_low' : 'sfx_zombie_death_high');
    }
  }
}
```

**Important:** Audio calls must be throttled for high-frequency events. If 10 enemies die in one frame, do not play 10 death sounds simultaneously. Throttle to max 3 simultaneous sounds of the same type.

**Test criteria (manual):**
- Hit a zombie with claw swipe -> hear bite sound
- Hold B to charge -> hear growl
- Release charged attack -> hear RAWR
- Kill a tier 1 zombie -> hear zombie-7 death sound
- Kill a tier 5+ zombie -> hear zombie-4 or zombie-5
- Player dies -> hear falling scream

**Done when:** Every combat event listed above produces an audible mouth-made sound.

---

## Task B-4: Hook Audio to Weapon Events (~6 events)

**What to build:** Wire weapon fire sounds to each weapon type.

**Event hookups:**

| Weapon | Sound ID on Fire | Sound ID on Impact |
|--------|-----------------|-------------------|
| Claw Swipe | `sfx_melee_hit` (reuse) | -- |
| Bone Toss | `sfx_weapon_projectile` | -- |
| Poison Cloud | `sfx_weapon_poison` | -- |
| Lightning Bolt | `sfx_weapon_heavy` | -- |
| Fireball | `sfx_weapon_heavy` | `sfx_explosion` |
| Boomerang | `sfx_weapon_boomerang` | -- |
| Mud Bomb (new) | `sfx_weapon_projectile` | `sfx_explosion` |
| Beehive Launcher (new) | `sfx_weapon_projectile` | -- |
| Snowball Turret (new) | `sfx_weapon_projectile` | -- |
| Stink Line (new) | `sfx_weapon_poison` (low vol) | -- |

**Implementation:** In the `fireWeapon` function, add `audio.play(soundId)` at the point where the projectile/effect is created. For multi-shot (Arcane Scroll upgraded bone toss), use `sfx_weapon_multishot` instead of `sfx_weapon_projectile`.

**Done when:** All 10 weapons produce an audible sound on fire. Fireball and Mud Bomb also play explosion on impact.

---

## Task B-5: Hook Audio to Movement/Powerup Events (~6 events)

**Event hookups:**

| Game Event | Sound ID | Trigger |
|-----------|----------|---------|
| Player jumps | `sfx_jump` | When jump key pressed and player is on ground |
| Player lands | `sfx_land` | When player transitions from airborne to ground |
| Angel Wings activate | `sfx_powerup_wings` | When Wings powerup crate is picked up |
| Race Car activate | `sfx_powerup_racecar` | When Race Car powerup crate is picked up |
| Speed boost (any) | `sfx_powerup_speed` | When Soccer Cleats equipped or speed-related powerup activates |
| Crate open | `sfx_crate_open` | When player breaks a powerup crate |

**Throttling:** Jump and land sounds should not play more than once per 0.2 seconds (debounce).

**Done when:** Jumping, landing, crate breaking, and major powerup activations produce audible sounds.

---

## Task B-6: Hook Audio to Zombie Events (~4 events)

**Event hookups:**

| Game Event | Sound ID | Trigger | Throttle |
|-----------|----------|---------|----------|
| Zombie spawns (ambient) | `sfx_zombie_spawn` | On ambient spawn | Max 1 per 2 seconds (spawns are frequent) |
| Zombie spawns (wave event) | `sfx_zombie_spawn` | Wave event burst | Max 3 during wave burst |
| Zombie merge | `sfx_zombie_merge` | Two same-tier zombies merge | Each merge |
| Zombie contact with player | `sfx_melee_hit` | First contact damage per enemy | Throttled per-enemy, max 1 per 0.5s |

**Done when:** Zombie spawn, merge, and contact events produce audible sounds with appropriate throttling.

---

## Task B-7: Volume Control UI (Mute Toggle + Slider)

**What to build:** A minimal volume control accessible from the pause menu or HUD.

**File:** `js/3d/hud.js` (add to pause menu rendering), `js/3d/audio.js`

**Design:**
- Pause menu: add a row below the 3 options that shows "[M] MUTE/UNMUTE" and "[-/+] VOLUME"
- Display current volume level as a bar or percentage
- Key bindings: M to toggle mute, - and + (or [ and ]) to adjust volume by 10%
- Volume and mute state persisted in localStorage

**Implementation:**
```javascript
// In pause menu section of drawHUD:
if (s.pauseMenu) {
  // ... existing pause cards ...
  // Volume control row
  ctx.fillStyle = '#888'; ctx.font = '12px "Courier New"';
  ctx.fillText('[M] Mute/Unmute | [-/+] Volume', W / 2, cardY + cardH + 50);
  const volBar = deps.audio ? deps.audio.getVolume() : 0.7;
  ctx.fillStyle = '#222'; ctx.fillRect(W/2 - 50, cardY + cardH + 55, 100, 8);
  ctx.fillStyle = '#44ff44'; ctx.fillRect(W/2 - 50, cardY + cardH + 55, 100 * volBar, 8);
}
```

**Key handling:** In the input handler, when pause menu is open:
```javascript
if (e.code === 'KeyM') { audio.isMuted() ? audio.unmute() : audio.mute(); }
if (e.code === 'Minus') { audio.setVolume(audio.getVolume() - 0.1); }
if (e.code === 'Equal') { audio.setVolume(audio.getVolume() + 0.1); }
```

**Done when:** Volume slider and mute toggle work in pause menu. State persists across sessions.
