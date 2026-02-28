/**
 * @module game3d
 * @description 3D Roguelike Survivor mode — the primary gameplay module for Leopard vs Zombies.
 *
 * This module implements a complete 3D survivor game using a closure-based architecture.
 * The sole export, `launch3DGame(options)`, encapsulates all game state, rendering, physics,
 * combat, UI, and cleanup within a single function scope. Three.js handles 3D rendering while
 * a transparent HUD canvas overlay provides 2D UI elements (health bars, menus, score display).
 *
 * The world uses chunk-based infinite terrain with procedural noise-driven forest biome
 * and grounded plateaus. Enemies follow a 10-tier zombie merge system where same-tier zombies
 * collide and combine into stronger variants. The player has an auto-attack system,
 * a hold-to-charge power attack, up to 4 weapon slots with 6 weapon types, passive howls,
 * shrine augments, difficulty totems, 18 temporary powerups, and 25 permanent items (4 rarity tiers).
 *
 * Dependencies: Three.js (global, loaded via CDN in index.html), 3d/constants.js (game constants),
 *               3d/terrain.js (procedural terrain generation and chunk management),
 *               3d/utils.js (shared box helper), 3d/player-model.js (player model construction and animation),
 *               3d/hud.js (HUD overlay rendering), 3d/audio.js (sound pool and playback)
 * Exports: 1 — launch3DGame(options)
 *
 * Key concepts:
 * - Closure architecture: all state is local to launch3DGame; no module-level mutation
 * - Dual rendering: Three.js WebGLRenderer for 3D scene + Canvas2D overlay for HUD
 * - Chunk system: 16x16 terrain/platform/shrine chunks loaded around the player
 * - Zombie tiers 1-10: visual upgrades (eyes, horns, auras) and stat scaling per tier
 * - Weapon slot system: auto-fire weapons with per-type projectile/effect logic
 * - Level-up menu: random draw from weapons, upgrades, howls; 3 rerolls per game
 */


import {
  ARENA_SIZE, SHRINE_COUNT, CHUNK_SIZE, GRAVITY_3D, JUMP_FORCE, GROUND_Y, MAP_HALF,
  CAMERA_Y_OFFSET, CAMERA_Z_OFFSET, CAMERA_SMOOTH_FACTOR,
  ANIMAL_PALETTES, WEAPON_TYPES, HOWL_TYPES, POWERUPS_3D, ITEMS_3D, ITEM_RARITIES,
  SHRINE_AUGMENTS, TOTEM_EFFECT, ZOMBIE_TIERS, ANIMAL_WEAPONS, WEARABLES_3D,
  MAP_GEMS_PER_CHUNK, GEM_XP_MIN, GEM_XP_MAX, GEM_COLLECT_RADIUS,
  CHARGE_SHRINE_UPGRADES, CHARGE_SHRINE_WEIGHTS, CHARGE_SHRINE_COUNT,
  CHARGE_SHRINE_TIME, CHARGE_SHRINE_RADIUS,
  CHALLENGE_SHRINE_COUNT, CHALLENGE_SHRINE_RADIUS, BOSS_HP_MULT, BOSS_DMG_MULT, BOSS_SPEED_MULT, BOSS_SCALE,
  // BD-26: Extracted gameplay constants
  PLAYER_SPEED_BASE, PLAYER_ATTACK_SPEED_BASE, PLAYER_ATTACK_DAMAGE_BASE,
  PLAYER_ATTACK_RANGE_BASE, PLAYER_COLLECT_RADIUS_BASE, PLAYER_HP_START_MULT,
  PLAYER_DMG_SCALE_PER_LEVEL, PLAYER_CONTACT_DAMAGE_BASE,
  POWER_ATTACK_MAX_CHARGE, INVINCIBILITY_DURATION, SHIELD_BRACELET_COOLDOWN,
  INTERACTION_HIT_COOLDOWN, POST_UPGRADE_INVINCIBILITY,
  AMBIENT_SPAWN_INTERVAL, FIRST_WAVE_EVENT_TIMER, WAVE_EVENT_INTERVAL,
  WAVE_WARNING_DURATION, AMBIENT_CRATE_INTERVAL, MIN_SPAWN_DISTANCE,
  INITIAL_BURST_COUNT, INITIAL_BURST_HP,
  ENTITY_DESPAWN_DISTANCE, XP_GEM_HARD_CAP, XP_SCALE_PER_LEVEL,
  TOTEM_COUNT, LOOT_CRATE_COUNT, MIN_SHRINE_SPACING, MAX_PLACEMENT_ATTEMPTS,
  AUGMENT_REGEN_CAP,
  WEAPON_COOLDOWN_REDUCTION_L4, LIGHTNING_CHAIN_RANGE_SQ,
} from './3d/constants.js';

import {
  noise2D, smoothNoise, terrainHeight, getBiome, BIOME_COLORS,
  getChunkKey, createTerrainState, getNearbyColliders,
  generateChunk as terrainGenerateChunk,
  unloadChunk as terrainUnloadChunk, updateChunks as terrainUpdateChunks,
} from './3d/terrain.js';

import { box, clearCaches } from './3d/utils.js';
import { buildPlayerModel, animatePlayer, updateMuscleGrowth, updateItemVisuals, buildWearableMesh, updateWearableVisuals } from './3d/player-model.js';
import { drawHUD } from './3d/hud.js';
import { initAudio, playSound, toggleMute, isMuted, getVolume, disposeAudio } from './3d/audio.js';


/**
 * @typedef {Object} State3D
 * The central game state object (`st`) containing all mutable runtime data.
 * Organized by subsystem below.
 *
 * --- Player Stats ---
 * @property {number} hp             - Current hit points.
 * @property {number} maxHp          - Maximum hit points (scaled by animal HP * difficulty hpMult).
 * @property {number} playerSpeed    - Base movement speed (5 * animal.speed).
 * @property {number} attackSpeed    - Auto-attacks per second (base 1.2).
 * @property {number} attackDamage   - Base auto-attack damage (15 * animal.damage).
 * @property {number} attackRange    - Auto-attack reach in world units (base 3).
 * @property {number} collectRadius  - XP gem / item pickup radius (base 2).
 * @property {number} jumpForce      - Jump velocity (equals JUMP_FORCE constant).
 * @property {number} attackTimer    - Legacy timer kept for crate proximity checks.
 *
 * --- Position / Movement ---
 * @property {number} playerX        - Player world X position.
 * @property {number} playerY        - Player world Y position (includes terrain height).
 * @property {number} playerZ        - Player world Z position.
 * @property {number} playerVY       - Vertical velocity (positive = up).
 * @property {boolean} onGround      - True if player is on terrain or platform.
 * @property {number|null} onPlatformY - Y coordinate of platform the player stands on, or null.
 * @property {{x: number, z: number}} moveDir - Normalized input direction this frame.
 *
 * --- Score / Wave / Spawn ---
 * @property {number} scoreMult      - Difficulty-based score multiplier.
 * @property {number} zombieDmgMult  - Difficulty-based zombie contact damage multiplier (2/3/4).
 * @property {number} score          - Accumulated score.
 * @property {number} wave           - Current wave number (increments on wave event).
 * @property {number} ambientSpawnTimer  - Countdown to next ambient zombie spawn (resets to 1.7s).
 * @property {number} waveEventTimer     - Countdown to next wave event (first=75s, then 90s).
 * @property {number} waveTimerMax       - Maximum value of waveEventTimer (for HUD progress bar).
 * @property {number} waveWarning        - Seconds remaining in wave warning countdown (0 = none).
 * @property {boolean} waveActive        - Whether a wave event is currently active.
 * @property {number} ambientCrateTimer  - Countdown to next ambient crate spawn (resets to 30s).
 * @property {number} gameTime           - Total elapsed game time in seconds.
 *
 * --- XP / Leveling ---
 * @property {number} xp             - Current XP toward next level.
 * @property {number} xpToNext       - XP required for next level (scales by 1.5x).
 * @property {number} level          - Current player level.
 *
 * --- Entity Arrays ---
 * @property {Array.<Enemy>} enemies        - All live zombie enemies.
 * @property {Array.<XpGem>} xpGems         - All active XP gem pickups.
 * @property {Array} mapGems               - Non-respawning map gem collectibles [{mesh, x, z, xpValue, chunkKey, gemIndex, alive}].
 * @property {Map.<string, Set>} collectedGemKeys - Collected gem indices by chunk key (persists across chunk load/unload).
 * @property {Array} attackLines            - Visual attack line effects.
 * @property {Array} powerupCrates          - Breakable powerup crate objects.
 * @property {Array} itemPickups            - Floating item pickup objects.
 * @property {Array} projectiles            - Active banana cannon projectiles.
 *
 * --- Active Powerup Flags ---
 * @property {Object|null} activePowerup    - Current active powerup {def, timer} or null.
 * @property {number} jumpBoost             - Jump force multiplier (default 1).
 * @property {number} dmgBoost              - Damage multiplier (default 1).
 * @property {number} atkSpeedBoost         - Attack speed multiplier (default 1).
 * @property {number} speedBoost            - Movement speed multiplier (default 1).
 * @property {boolean} fireAura             - Race Car fire aura active.
 * @property {boolean} rangedMode           - Banana Cannon ranged mode active.
 * @property {boolean} flying               - Angel Wings flight mode active.
 * @property {boolean} frostNova            - Frost Nova burst pending (single-use flag).
 * @property {boolean} berserkVulnerable    - Berserker Rage vulnerability active.
 * @property {boolean} ghostForm            - Ghost Form invulnerability active.
 * @property {boolean} earthquakeStomp      - Earthquake Stomp landing shockwaves active.
 * @property {boolean} vampireHeal          - Vampire Fangs passive regen active.
 * @property {boolean} lightningShield      - Lightning Shield periodic zap active.
 * @property {number} lightningShieldTimer  - Countdown to next lightning zap.
 * @property {boolean} giantMode            - Giant Growth scale-up active.
 * @property {boolean} timeWarp             - Time Warp enemy slow active.
 * @property {boolean} mirrorClones         - Mirror Image clones active.
 * @property {Array} mirrorCloneGroups      - Three.js groups for mirror clones.
 * @property {boolean} bombTrail            - Bomb Trail dropping active.
 * @property {number} bombTrailTimer        - Countdown to next bomb drop.
 * @property {Array} bombTrailBombs         - Active bomb objects on the ground.
 * @property {boolean} regenBurst           - Regen Burst rapid healing active.
 * @property {boolean} wasAirborne          - Previous-frame airborne state for stomp detection.
 *
 * --- G-Force Maneuver (flight) ---
 * @property {boolean} gManeuver      - Whether a G-force maneuver (loop/dive) is in progress.
 * @property {number} gManeuverPitch  - Current pitch angle during maneuver (radians).
 *
 * --- Items (permanent equipment) ---
 * @property {Object} items                 - Equipment slots.
 * @property {string|null} items.armor      - 'leather', 'chainmail', or null.
 * @property {boolean} items.glasses        - Aviator Glasses equipped.
 * @property {string|null} items.boots      - 'cowboyBoots', 'soccerCleats', or null.
 * @property {boolean} items.ring           - Magnet Ring equipped.
 * @property {boolean} items.charm          - Lucky Charm equipped.
 * @property {boolean} items.vest           - Thorned Vest equipped.
 * @property {boolean} items.pendant        - Health Pendant equipped.
 * @property {boolean} items.bracelet       - Shield Bracelet equipped.
 * @property {boolean} items.gloves         - Crit Gloves equipped.
 * @property {number} shieldBraceletTimer   - Cooldown remaining for Shield Bracelet.
 * @property {boolean} shieldBraceletReady  - Whether Shield Bracelet can absorb a hit.
 *
 * --- UI State ---
 * @property {boolean} gameOver             - True after player death.
 * @property {boolean} paused               - True when game is paused (menu or upgrade).
 * @property {boolean} upgradeMenu          - True when level-up upgrade menu is shown.
 * @property {Array} upgradeChoices         - Current upgrade menu options.
 * @property {number} selectedUpgrade       - Index of highlighted upgrade option.
 * @property {boolean} running              - False after cleanup; stops game loop.
 * @property {number} invincible            - Invincibility frames timer (seconds).
 * @property {boolean} pauseMenu            - True when ESC pause menu is shown.
 * @property {number} selectedPauseOption   - Index of highlighted pause menu option.
 *
 * --- Power Attack + Interaction ---
 * @property {number} autoAttackTimer       - Deprecated (BD-102), kept for compatibility.
 * @property {number} interactionTimer      - Cooldown for shrine/totem proximity hits.
 * @property {THREE.Mesh|null} chargeGlow   - Visual glow mesh during charging.
 *
 * --- Input State (BD-25: isolated into separate `inputState` object) ---
 * The following properties live on the local `inputState` object, NOT on `st`:
 * - enterReleasedSinceGameOver {boolean} - Prevents instant game-over skip.
 * - enterCooldown {number}               - Cooldown after menu confirm to prevent charge trigger.
 * - menuDismissedAt {number}             - performance.now() timestamp of last menu dismiss.
 * - charging {boolean}                   - True while Enter/B is held for power attack.
 * - chargeTime {number}                  - Seconds charged (0-2 range).
 * - chargeGlowTimer {number}             - Flash countdown after power attack release.
 * - powerAttackReady {boolean}           - True when charge released, consumed next frame.
 *
 * --- Weapon Slots + Howls ---
 * @property {Array.<{typeId: string, level: number, cooldownTimer: number}>} weapons - Active weapon instances.
 * @property {number} maxWeaponSlots        - Maximum weapon slots (1, unlocks at levels 5/10/15 up to 4).
 * @property {Object.<string, number>} howls - Howl stack counts by type ID.
 * @property {number} rerolls               - Remaining rerolls for upgrade menu (starts at 3).
 * @property {Array} weaponProjectiles      - Active weapon projectile objects.
 * @property {Array} weaponEffects          - Active weapon visual effects (slashes, clouds, bolts).
 *
 * --- Shrines + Augments ---
 * @property {Array} shrines                - All shrine objects (pre-placed at start).
 * @property {Map} shrinesByChunk            - Shrine lookup by chunk key (legacy, now unused).
 * @property {Object.<string, number>} augments - Augment counts by augment ID.
 * @property {number} augmentXpMult         - Cumulative XP multiplier from augments.
 * @property {number} augmentDmgMult        - Cumulative damage multiplier from augments.
 * @property {number} augmentArmor          - Cumulative flat armor reduction from augments.
 * @property {number} augmentRegen          - Cumulative HP/s regen from augments.
 *
 * --- Difficulty Totems ---
 * @property {Array} totems                 - All totem objects (pre-placed at start).
 * @property {number} totemCount            - Number of totems destroyed.
 * @property {number} totemDiffMult         - Cumulative zombie HP multiplier from totems.
 * @property {number} totemSpeedMult        - Cumulative zombie speed multiplier from totems.
 * @property {number} totemSpawnMult        - Cumulative spawn rate multiplier from totems.
 * @property {number} totemXpMult           - Cumulative XP bonus multiplier from totems.
 * @property {number} totemScoreMult        - Cumulative score bonus multiplier from totems.
 *
 * --- Floating Texts ---
 * @property {Array.<{text: string, color: string, x: number, y: number, z: number, life: number}>} floatingTexts3d - Active floating text announcements.
 *
 * --- Leaderboard ---
 * @property {string} nameEntry             - Current name input for leaderboard.
 * @property {boolean} nameEntryActive      - True when name entry UI is active.
 * @property {Array} leaderboard3d          - Top 10 scores for current difficulty.
 *
 * --- Kill Tracking ---
 * @property {Array.<number>} killsByTier   - Kill count per zombie tier (index 0 = tier 1).
 * @property {number} totalKills            - Total zombies killed.
 */

/**
 * Launch the 3D Roguelike Survivor game mode.
 *
 * This is the sole export of the module. It initializes the Three.js scene, HUD overlay,
 * all game state, input handlers, and the main game loop. On game over or menu return,
 * it performs full cleanup of Three.js resources and restores the 2D UI.
 *
 * @param {Object} options - Launch configuration.
 * @param {Function} options.onReturn - Callback invoked to return to the 2D main menu.
 * @param {Object} options.animal - Animal selection data from the character select screen.
 * @param {string} options.animal.id - Animal identifier ('leopard', 'redPanda', 'lion', 'gator').
 * @param {string} options.animal.name - Display name for the animal.
 * @param {string} options.animal.color - CSS color string for HUD display.
 * @param {number} options.animal.speed - Speed multiplier (base 1.0).
 * @param {number} options.animal.damage - Damage multiplier (base 1.0).
 * @param {number} options.animal.hp - Base hit points.
 * @param {string} options.animal.desc - Animal description text.
 * @param {Object} options.difficulty - Difficulty multipliers from the difficulty select screen.
 * @param {number} options.difficulty.hpMult - HP scaling multiplier.
 * @param {number} options.difficulty.scoreMult - Score scaling multiplier.
 * @param {number} options.difficulty.enemySpeedMult - Enemy speed multiplier (default 1.0).
 * @param {number} options.difficulty.powerupFreqMult - Powerup spawn frequency multiplier (default 1.0).
 */
export function launch3DGame(options) {
  const onReturn = options.onReturn;
  const animalData = options.animal; // { id, name, color, speed, damage, hp, desc }
  const diffData = options.difficulty; // { hpMult, scoreMult, ... }
  const animalId = animalData.id;
  const palette = ANIMAL_PALETTES[animalId] || ANIMAL_PALETTES.leopard;

  const canvas3d = document.getElementById('game3d');
  const hudCanvas = document.getElementById('hud3d');
  const hudCtx = hudCanvas.getContext('2d');

  canvas3d.style.display = 'block';
  hudCanvas.style.display = 'block';

  // Fullscreen: expand container and canvases to fill browser window
  const container = document.getElementById('game-container');
  const canvas2d = document.getElementById('game');
  container.style.width = '100vw';
  container.style.height = '100vh';
  canvas2d.style.display = 'none';
  canvas3d.style.width = '100%';
  canvas3d.style.height = '100%';
  hudCanvas.style.width = '100%';
  hudCanvas.style.height = '100%';

  // === STATE ===
  const st = {
    // Player stats (scaled by animal + difficulty)
    hp: Math.floor(animalData.hp * diffData.hpMult * PLAYER_HP_START_MULT),   // BD-194: +25% starting HP for kid-friendly early game
    maxHp: Math.floor(animalData.hp * diffData.hpMult * PLAYER_HP_START_MULT), // BD-194: +25% starting HP for kid-friendly early game
    playerSpeed: PLAYER_SPEED_BASE * animalData.speed,
    attackSpeed: PLAYER_ATTACK_SPEED_BASE,
    attackDamage: PLAYER_ATTACK_DAMAGE_BASE * animalData.damage,
    attackRange: PLAYER_ATTACK_RANGE_BASE,
    collectRadius: PLAYER_COLLECT_RADIUS_BASE,
    jumpForce: JUMP_FORCE,
    attackTimer: 0, // legacy, kept for crate proximity check
    playerX: 0, playerY: terrainHeight(0, 0) + 0.01, playerZ: 0,
    playerVY: 0,
    playerPrevX: 0, playerPrevZ: 0, // BD-211: Previous frame position for velocity calc
    playerVelX: 0, playerVelZ: 0,   // BD-211: Player velocity for boss target leading
    onGround: true,
    onPlatformY: null, // Y of the platform we're standing on
    moveDir: { x: 0, z: 0 },
    scoreMult: diffData.scoreMult,
    enemySpeedMult: diffData.enemySpeedMult || 1.0,
    powerupFreqMult: diffData.powerupFreqMult || 1.0,
    zombieDmgMult: 1,
    score: 0,
    wave: 1,
    ambientSpawnTimer: AMBIENT_SPAWN_INTERVAL,
    waveEventTimer: FIRST_WAVE_EVENT_TIMER,   // ~1.25 minutes until first wave event
    waveTimerMax: FIRST_WAVE_EVENT_TIMER,     // matches initial waveEventTimer for HUD progress bar
    waveWarning: 0,       // countdown seconds (0 = no warning)
    initialBurstDone: false,
    _inExplosionChain: false,  // BD-134: recursion guard for Whoopee Cushion chain explosions
    waveActive: false,
    ambientCrateTimer: AMBIENT_CRATE_INTERVAL / (diffData.powerupFreqMult || 1.0),
    ambientItemTimer: 20,   // first item at 20s, then 45-60s cycle
    gameTime: 0,          // total elapsed game time in seconds
    mergeCheckTimer: 0,   // throttle zombie merge checks (BD-175)
    xp: 0, xpToNext: 10, level: 1,
    enemies: [],
    xpGems: [],
    gemMergeTimer: 0,
    mapGems: [],              // Active map gem objects [{mesh, x, z, xpValue, chunkKey, gemIndex, alive}]
    collectedGemKeys: new Map(),  // Track collected gems: Map<"cx,cz", Set of indices>
    attackLines: [],
    powerupCrates: [],
    itemPickups: [],
    projectiles: [],
    // Active powerup state
    activePowerup: null, // { def, timer }
    jumpBoost: 1,
    dmgBoost: 1,
    atkSpeedBoost: 1,
    speedBoost: 1,
    fireAura: false,
    rangedMode: false,
    flying: false,
    frostNova: false,
    berserkVulnerable: false,
    ghostForm: false,
    earthquakeStomp: false,
    vampireHeal: false,
    lightningShield: false,
    lightningShieldTimer: 0,
    giantMode: false,
    timeWarp: false,
    mirrorClones: false,
    mirrorCloneGroups: [],
    bombTrail: false,
    bombTrailTimer: 0,
    bombTrailBombs: [],
    regenBurst: false,
    wasAirborne: false,
    // G-force maneuver state (Top Gun style loops/dives while flying)
    gManeuver: false,
    gManeuverPitch: 0,
    // Items (permanent)
    // Non-stackable slots: null/false = unequipped, id/true = equipped
    // Stackable counts: 0 = none, N = number of stacks
    items: {
      armor: null, glasses: false, boots: null, ring: false, charm: false,
      vest: false, pendant: false, bracelet: false, gloves: false,
      // New non-stackable slots
      cushion: false, turboshoes: false, goldenbone: false, crown: false, zombiemagnet: false, scarf: false,
      // Stackable item counts
      rubberDucky: 0, thickFur: 0, sillyStraw: 0, bandana: 0,
      hotSauce: 0, bouncyBall: 0, luckyPenny: 0, alarmClock: 0,
    },
    // Wearable equipment (3 slots: head, body, feet)
    wearables: { head: null, body: null, feet: null },
    wearablePickups: [],
    // Wearable equip flash timers (fade over 0.8s when new wearable equipped)
    wearableFlash: { head: 0, body: 0, feet: 0 },
    shieldBraceletTimer: 0,
    shieldBraceletReady: true,
    // Silly Straw kill counter (heals 1 HP per 10 kills)
    sillyStrawKills: 0,
    // Turbo Sneakers dodge state
    dodgeChance: 0,
    // BD-147: Item pickup event feedback
    itemFlashTimer: 0,
    itemFlashColor: '#ffffff',
    itemAnnouncement: null, // { name, desc, color, timer }
    itemSlowTimer: 0,
    // UI
    gameOver: false,
    lastDamageSource: null, // BD-216: tracks what killed the player for "DEFEATED BY" display
    // Death sequence (BD-228): 1.5s slow-motion death before game-over screen
    deathSequence: false,
    deathSequenceTimer: 0,
    deathTimeScale: 1.0,
    deathKillerPos: null,
    _deathSlowmoPlayed: false, // BD-233: tracks whether slow-mo audio has played
    // BD-234: Killer highlight glow — tracks whether floating tier label was spawned
    _killerLabelSpawned: false,
    paused: false,
    upgradeMenu: false,
    upgradeChoices: [],
    selectedUpgrade: 0,
    running: true,
    invincible: 0,
    playerHurtFlash: 0, // BD-192: player body flash timer on damage
    playerHurtFlashCooldown: 0, // BD-208: cooldown to prevent flash spam
    // (input flags moved to inputState object — see below)
    pauseMenu: false,
    selectedPauseOption: 0,
    showFullMap: false,
    fogRevealed: new Set(), // BD-97: fog-of-war grid cells revealed by player
    // Wearable comparison menu (BD-199)
    wearableCompare: null, // { currentId, newPickup, slot, pickupIndex, choice }
    // Power attack + interaction (BD-102: auto-attack removed)
    autoAttackTimer: 0, // kept for compatibility, no longer used
    interactionTimer: 0, // cooldown for shrine/totem hits
    attackAnimTimer: 0, // BD-126: attack lunge animation timer
    attackAnimDuration: 0.15, // BD-126: lunge duration (0.15 for weapons, 0.25 for power attack)
    chargeGlow: null, // Three.js mesh — stays on st for cleanup
    // (charging, chargeTime, chargeGlowTimer moved to inputState object)
    // Weapon slots
    weapons: [],
    maxWeaponSlots: 1,
    howls: { power: 0, haste: 0, arcane: 0, vitality: 0, fortune: 0, range: 0, thorns: 0, magnet: 0, frenzy: 0, guardian: 0 },
    rerolls: 3, // rerolls per game
    weaponProjectiles: [],
    weaponEffects: [],
    // Shrines
    shrines: [],
    shrinesByChunk: new Map(),
    augments: {},
    augmentXpMult: 1,
    augmentDmgMult: 1,
    augmentArmor: 0,
    augmentRegen: 0,
    // Charge shrines
    chargeShrines: [],          // Array of charge shrine objects
    chargeShrineCurrent: null,  // Shrine currently being charged (or null)
    chargeShrineProgress: 0,    // 0 to CHARGE_SHRINE_TIME seconds
    chargeShrineMenu: false,    // true = showing upgrade choice overlay
    chargeShrineChoices: [],    // 3 upgrade options rolled on charge complete
    selectedChargeShrineUpgrade: 0, // cursor index in choice menu
    // Challenge shrines (BD-77)
    challengeShrines: [],
    activeBosses: [],
    // Difficulty totems
    totems: [],
    totemCount: 0,
    totemDiffMult: 1,
    totemSpeedMult: 1,
    totemSpawnMult: 1,
    totemXpMult: 1,
    totemScoreMult: 1,
    // Floating texts for shrine/augment announcements
    floatingTexts3d: [],
    // Item acquire order for display cap (BD-160)
    itemAcquireOrder: [],
    // Leaderboard
    nameEntry: '',
    nameEntryActive: false,
    nameEntryInputCooldown: 0,
    leaderboard3d: [],
    // Kill tracking
    killsByTier: new Array(10).fill(0),
    totalKills: 0,
    // Randomized weapon/howl pools (6 of 10 each per run)
    availableWeapons: [],
    availableHowls: [],
    // Feedback state (game-over screen)
    feedbackSelection: 0, // 0=Yes, 1=Maybe, 2=No
    feedbackSaved: false,
    // BD-179: Difficulty key and attack first-encounter tracking
    difficulty: options.difficultyKey || 'easy',
    attackFirstSeen: {}, // { tierKey: true } — prevents repeat labels per run
    // BD-166/167: Active poison pools spawned by tier-5 enemies
    poisonPools: [],
    // FPS debug counter (toggle with backtick key)
    showFps: false,
    _fpsFrames: 0,
    _fpsTime: 0,
    _fpsDisplay: 0,
    // BD-218: Screen shake state
    screenShake: 0,       // remaining shake duration (seconds)
    screenShakeAmp: 0,    // current amplitude (world units)
  };

  // === INPUT STATE ===
  // Transient input/UI flags isolated from persistent game state (BD-25).
  // These track keyboard hold states, cooldown guards, and charge-attack timing.
  const inputState = {
    enterHeld: false,
    enterCooldown: 0,
    menuDismissedAt: 0,
    charging: false,
    chargeTime: 0,
    chargeGlowTimer: 0,
    enterReleasedSinceGameOver: false,
    powerAttackReady: false,
  };


  // Load 3D leaderboard (single unified key — no per-difficulty split)
  st.leaderboard3d = JSON.parse(localStorage.getItem('avz3d-leaderboard') || '[]');


  // === AUDIO INIT ===
  initAudio('sound-pack-alpha/');
  playSound('sfx_player_growl');

  // === AUGMENT STATE: SINGLE SOURCE OF TRUTH ===
  // Mapping from augment ID -> effect on the four computed properties.
  // dmgMult/xpMult are multiplicative per stack; armor/regen are additive per stack.
  const AUGMENT_EFFECTS = {
    // Regular shrine augments (SHRINE_AUGMENTS)
    damage:   { dmgMult: 1.05 },
    xpGain:   { xpMult: 1.05 },
    armor:    { armor: 0.03 },
    regen:    { regen: 0.25 },
    // Charge shrine upgrades (common)
    dmg3:     { dmgMult: 1.03 },
    regen03:  { regen: 0.15 },
    // Charge shrine upgrades (uncommon)
    dmg6:     { dmgMult: 1.06 },
    regen07:  { regen: 0.35 },
    armor3:   { armor: 0.03 },
    // Charge shrine upgrades (rare)
    dmg10:    { dmgMult: 1.10 },
    regen12:  { regen: 0.6 },
    xp10:     { xpMult: 1.10 },
    // Charge shrine upgrades (legendary)
    dmg15:    { dmgMult: 1.15 },
    regen2:   { regen: 1.0 },
    allstats5:{ dmgMult: 1.05 },
    // Item / howl sources
    pendant:  { regen: 1 },
    guardian_regen: { regen: 1 },
  };

  /**
   * Recompute all derived augment properties from st.augments counts.
   * This is the single source of truth — call after any augment mutation.
   *   st.augmentDmgMult  (multiplicative, base 1)
   *   st.augmentXpMult   (multiplicative, base 1)
   *   st.augmentArmor    (additive, base 0)
   *   st.augmentRegen    (additive, base 0)
   */
  function recomputeAugments() {
    let dmgMult = 1;
    let xpMult = 1;
    let armorSum = 0;
    let regenSum = 0;

    for (const id in st.augments) {
      const count = st.augments[id];
      if (count <= 0) continue;
      const fx = AUGMENT_EFFECTS[id];
      if (!fx) continue; // augment IDs with no computed-property effect (e.g. maxHp, moveSpeed)
      if (fx.dmgMult)  dmgMult *= Math.pow(fx.dmgMult, count);
      if (fx.xpMult)   xpMult  *= Math.pow(fx.xpMult, count);
      if (fx.armor)    armorSum += fx.armor * count;
      if (fx.regen)    regenSum += fx.regen * count;
    }

    st.augmentDmgMult = dmgMult;
    st.augmentXpMult  = xpMult;
    st.augmentArmor   = armorSum;
    st.augmentRegen   = regenSum;
  }

  // Ensure derived properties are consistent with st.augments at game init.
  recomputeAugments();

  /**
   * Save the current game score to the localStorage leaderboard.
   * Inserts the new entry, sorts by score descending, and keeps only the top 10.
   */
  function saveScore3d() {
    st.leaderboard3d.push({
      name: st.nameEntry,
      score: st.score,
      animal: animalData.name,
      level: st.level,
      wave: st.wave - 1,
      time: st.gameTime,
      kills: st.totalKills,
      date: Date.now()
    });
    st.leaderboard3d.sort((a, b) => b.score - a.score);
    st.leaderboard3d = st.leaderboard3d.slice(0, 10);
    localStorage.setItem('avz3d-leaderboard', JSON.stringify(st.leaderboard3d));
  }

  // === FLOATING TEXT HELPER (BD-136 + BD-160) ===
  // Caps visible floating texts, deduplicates rapid identical messages,
  // importance-aware eviction, and horizontal spread to reduce overlap.
  const MAX_FLOATING_TEXTS = 5;
  const DEDUP_WINDOW = 0.6; // seconds
  const _recentTexts = []; // tracks {text, time} for dedup

  /**
   * Add a floating text to the 3D scene with cap, dedup, importance hierarchy, and horizontal spread.
   * @param {string} text - The display text.
   * @param {string} color - CSS color string.
   * @param {number} x - World X position.
   * @param {number} y - World Y position.
   * @param {number} z - World Z position.
   * @param {number} [life] - Lifetime in seconds (default: 0.6 for important, 0.3 for normal).
   * @param {boolean} [important=false] - If true, bypass dedup (item pickups, boss kills, totem, shrine, level-up).
   */
  function addFloatingText(text, color, x, y, z, life, important = false) {
    const now = performance.now() / 1000;

    // Default life based on importance
    if (life === undefined || life === null) life = important ? 0.6 : 0.3;

    // Deduplicate rapid identical texts (skip if same text within DEDUP_WINDOW), unless important
    if (!important) {
      for (let i = _recentTexts.length - 1; i >= 0; i--) {
        if (now - _recentTexts[i].time > DEDUP_WINDOW) {
          _recentTexts.splice(i, 1);
        } else if (_recentTexts[i].text === text) {
          return; // suppress duplicate
        }
      }
    }

    // Track this text for dedup
    _recentTexts.push({ text, time: now });

    // Horizontal spread: random +-30px offset stored on the entry (BD-160)
    const spreadX = (Math.random() - 0.5) * 100; // +-50

    // Cap: if at max, remove oldest non-important first, then oldest (BD-160)
    while (st.floatingTexts3d.length >= MAX_FLOATING_TEXTS) {
      const nonImpIdx = st.floatingTexts3d.findIndex(ft => !ft.important);
      if (nonImpIdx !== -1) {
        st.floatingTexts3d.splice(nonImpIdx, 1);
      } else {
        st.floatingTexts3d.shift();
      }
    }

    st.floatingTexts3d.push({ text, color, x, y, z, life, important, spreadX, spawnTime: now });
  }

  // === BD-218: SCREEN SHAKE UTILITY ===
  /**
   * Trigger a screen shake effect. Uses max-of semantics so stronger/longer shakes
   * override weaker ones rather than stacking additively.
   * @param {number} amplitude - Shake intensity in world units (e.g. 0.3 for boss phase, 0.15 for slam).
   * @param {number} duration - Shake duration in seconds (e.g. 0.4 for boss phase).
   */
  function triggerScreenShake(amplitude, duration) {
    st.screenShake = Math.max(st.screenShake, duration);
    st.screenShakeAmp = Math.max(st.screenShakeAmp, amplitude);
  }

  // Animal-specific starting weapon (ANIMAL_WEAPONS imported from 3d/constants.js)
  const startWeapon = ANIMAL_WEAPONS[animalId] || 'clawSwipe';
  st.weapons.push({ typeId: startWeapon, level: 1, cooldownTimer: 0 });

  // === RANDOMIZED WEAPON + HOWL POOLS ===
  // Each run randomly selects 6 of 10 weapons and 6 of 10 howls.
  // The starting weapon is always guaranteed in the pool.
  /**
   * Fisher-Yates shuffle — returns a new shuffled copy of the array.
   * @param {Array} arr - The array to shuffle.
   * @returns {Array} A new shuffled array.
   */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pick 6 random weapons, ensuring the starting weapon is included
  const allWeaponIds = Object.keys(WEAPON_TYPES);
  const shuffledWeapons = shuffle(allWeaponIds);
  st.availableWeapons = shuffledWeapons.slice(0, 6);
  if (!st.availableWeapons.includes(startWeapon)) {
    // Swap out a random non-starting weapon for the starting weapon
    const swapIdx = Math.floor(Math.random() * st.availableWeapons.length);
    st.availableWeapons[swapIdx] = startWeapon;
  }

  // Pick 6 random howls
  const allHowlIds = Object.keys(HOWL_TYPES);
  st.availableHowls = shuffle(allHowlIds).slice(0, 6);

  // === INPUT ===
  /** @type {Object.<string, boolean>} Tracks which keys are currently pressed by `e.code`. */
  const keys3d = {};

  /**
   * Handle keydown events for all game states.
   *
   * Dispatches to different handlers based on current UI state:
   * - Game over + name entry: text input, backspace, enter to save
   * - Game over + no name entry: enter to return to menu (fresh press only)
   * - Upgrade menu: arrow keys to navigate, enter/space to select (fresh press only), R to reroll
   * - Charge shrine menu: arrow keys to navigate, enter/space to select (fresh press only)
   * - Pause menu: arrow keys to navigate, enter/space to select (fresh press only), escape to unpause
   * - Normal gameplay: escape opens pause menu; Enter/B handled by power attack in game loop
   *
   * BD-86: All menu confirmations require a fresh key press (e.repeat === false).
   * This prevents held-Enter from auto-confirming menus that open mid-gameplay
   * (e.g. upgrade menu opening while player charges power attack).
   *
   * @param {KeyboardEvent} e - The keydown event.
   */
  function onKeyDown(e) {
    keys3d[e.code] = true;
    // BD-213: Only preventDefault for gameplay keys, not during name entry
    if (!(st.gameOver && st.nameEntryActive)) e.preventDefault();

    // BD-86: Track whether Enter/Space is a fresh press (not a key-repeat).
    // Menus require a fresh press to confirm — this prevents held-Enter from
    // auto-selecting upgrades when a menu opens mid-gameplay (e.g. player
    // holds Enter for power attack, levels up, upgrade menu opens and would
    // instantly confirm without this guard).
    const isEnterOrSpace = (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space');
    const isFreshConfirm = isEnterOrSpace && !e.repeat;

    if (st.gameOver && !st.upgradeMenu && inputState.enterReleasedSinceGameOver) {
      if (st.nameEntryActive) {
        // BD-213: Name entry — accept ALL printable keys, block gameplay processing
        if (st.nameEntryInputCooldown > 0) return;
        if (e.key === 'Backspace') {
          st.nameEntry = st.nameEntry.slice(0, -1);
          e.preventDefault();
        } else if (e.key === 'Enter' && st.nameEntry.length > 0) {
          saveScore3d();
          st.nameEntryActive = false;
          e.preventDefault();
        } else if (e.key.length === 1 && st.nameEntry.length < 10) {
          st.nameEntry += e.key.toUpperCase();
          e.preventDefault();
        }
        return; // Block ALL gameplay key processing during name entry
      } else {
        // Feedback "Would you play again?" navigation (arrow keys cycle Y/M/N)
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          st.feedbackSelection = (st.feedbackSelection - 1 + 3) % 3;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          st.feedbackSelection = (st.feedbackSelection + 1) % 3;
        }
        // Save feedback to localStorage whenever changed
        if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
          const answers = ['Yes', 'Maybe', 'No'];
          localStorage.setItem('avz-feedback', answers[st.feedbackSelection]);
          st.feedbackSaved = true;
        }
        // BD-86: Require fresh press (not repeat) AND release+repress guard
        if (isFreshConfirm && e.code === 'Enter') {
          cleanup();
          onReturn();
        }
      }
    } else if (st.upgradeMenu && !st.gameOver) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') st.selectedUpgrade = (st.selectedUpgrade - 1 + st.upgradeChoices.length) % st.upgradeChoices.length;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') st.selectedUpgrade = (st.selectedUpgrade + 1) % st.upgradeChoices.length;
      // BD-86: Only confirm on fresh press — blocks held-Enter from auto-selecting
      if (isFreshConfirm) {
        const choice = st.upgradeChoices[st.selectedUpgrade];
        choice.apply(st);
        st.upgradeMenu = false;
        st.paused = false;
        st.invincible = POST_UPGRADE_INVINCIBILITY; // BD-112: Post-upgrade invulnerability
        inputState.menuDismissedAt = performance.now();
        inputState.enterReleasedSinceGameOver = false; // prevent accidental restart
        keys3d['Enter'] = false; // clear held key state
        keys3d['NumpadEnter'] = false;
        keys3d['Space'] = false;
        inputState.charging = false; // BD-86: clear stale charge state
        inputState.chargeTime = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.code === 'KeyR' && st.rerolls > 0) {
        st.rerolls--;
        showUpgradeMenu(); // re-generates choices
      }
    } else if (st.chargeShrineMenu && !st.gameOver) {
      // Charge shrine choice menu navigation
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        st.selectedChargeShrineUpgrade = Math.max(0, st.selectedChargeShrineUpgrade - 1);
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        st.selectedChargeShrineUpgrade = Math.min(st.chargeShrineChoices.length - 1, st.selectedChargeShrineUpgrade + 1);
      }
      // BD-86: Only confirm on fresh press — blocks held-Enter from auto-selecting
      if (isFreshConfirm) {
        const chosen = st.chargeShrineChoices[st.selectedChargeShrineUpgrade];
        if (chosen) {
          chosen.apply(st);
          st.augments[chosen.id] = (st.augments[chosen.id] || 0) + 1;
          recomputeAugments();
          // Mark shrine as used
          if (st.chargeShrineCurrent) {
            st.chargeShrineCurrent.charged = true;
            // Dim the shrine visually
            if (st.chargeShrineCurrent.crystal) {
              st.chargeShrineCurrent.crystal.material.opacity = 0.2;
              st.chargeShrineCurrent.crystal.material.color.setHex(0x444444);
            }
            if (st.chargeShrineCurrent.groundRing) {
              st.chargeShrineCurrent.groundRing.material.opacity = 0.05;
            }
          }
          // Show floating text
          if (st.chargeShrineCurrent) {
            addFloatingText(chosen.name, chosen.color, st.chargeShrineCurrent.x, terrainHeight(st.chargeShrineCurrent.x, st.chargeShrineCurrent.z) + 3, st.chargeShrineCurrent.z, 1.0, true);
          }
          playSound('sfx_level_up'); // Celebration sound
        }
        // Close menu
        st.chargeShrineMenu = false;
        st.paused = false;
        st.invincible = POST_UPGRADE_INVINCIBILITY; // BD-112: Post-shrine invulnerability
        st.chargeShrineCurrent = null;
        st.chargeShrineProgress = 0;
        st.chargeShrineChoices = [];
        inputState.menuDismissedAt = performance.now();
        keys3d['Enter'] = false;
        keys3d['NumpadEnter'] = false;
        keys3d['Space'] = false;
        inputState.charging = false; // BD-86: clear stale charge state
        inputState.chargeTime = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    } else if (st.pauseMenu && !st.gameOver) {
      // Pause menu navigation
      if (e.code === 'Escape') {
        // Unpause via Escape
        st.paused = false;
        st.pauseMenu = false;
        inputState.menuDismissedAt = performance.now();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        st.selectedPauseOption = (st.selectedPauseOption - 1 + 3) % 3;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        st.selectedPauseOption = (st.selectedPauseOption + 1) % 3;
      } else if (isFreshConfirm) {
        // BD-86: Only confirm on fresh press — blocks held-Enter from firing
        if (st.selectedPauseOption === 0) {
          // Resume
          st.paused = false;
          st.pauseMenu = false;
        } else if (st.selectedPauseOption === 1) {
          // Restart
          cleanup();
          launch3DGame({ animal: animalData, difficulty: diffData, onReturn });
        } else if (st.selectedPauseOption === 2) {
          // Main Menu
          cleanup();
          onReturn();
        }
        inputState.menuDismissedAt = performance.now();
        keys3d['Enter'] = false;
        keys3d['NumpadEnter'] = false;
        keys3d['Space'] = false;
        inputState.charging = false; // BD-86: clear stale charge state
        inputState.chargeTime = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    } else if (st.wearableCompare && !st.gameOver) {
      // BD-199: Wearable comparison menu navigation
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') st.wearableCompare.choice = 0; // KEEP CURRENT
      if (e.code === 'ArrowRight' || e.code === 'KeyD') st.wearableCompare.choice = 1; // EQUIP NEW
      if (isFreshConfirm) {
        const wc = st.wearableCompare;
        if (wc.choice === 1) {
          // Equip new item: apply it to the slot
          const it = wc.newPickup.itype;
          if (it.slot === 'armor') st.items.armor = it.id;
          else if (it.slot === 'boots') st.items.boots = it.id;
          else if (it.slot === 'glasses') st.items.glasses = true;
          else if (it.slot === 'ring') { st.items.ring = true; st.collectRadius *= 1.5; }
          else if (it.slot === 'charm') st.items.charm = true;
          else if (it.slot === 'vest') st.items.vest = true;
          else if (it.slot === 'pendant') { st.items.pendant = true; st.augments.pendant = (st.augments.pendant || 0) + 1; recomputeAugments(); }
          else if (it.slot === 'bracelet') st.items.bracelet = true;
          else if (it.slot === 'gloves') st.items.gloves = true;
          else if (it.slot === 'cushion') st.items.cushion = true;
          else if (it.slot === 'turboshoes') { st.items.turboshoes = true; st.dodgeChance += 0.10; }
          else if (it.slot === 'goldenbone') st.items.goldenbone = true;
          else if (it.slot === 'crown') st.items.crown = true;
          else if (it.slot === 'zombiemagnet') st.items.zombiemagnet = true;
          else if (it.slot === 'scarf') st.items.scarf = true;
          updateItemVisuals(playerModel, st.items, animalData.id);
          // Remove pickup from world
          wc.newPickup.alive = false;
          scene.remove(wc.newPickup.mesh);
          wc.newPickup.mesh.geometry.dispose();
          wc.newPickup.mesh.material.dispose();
          const idx = st.itemPickups.indexOf(wc.newPickup);
          if (idx !== -1) st.itemPickups.splice(idx, 1);
        }
        // Both choices: close menu, grant invulnerability
        st.wearableCompare = null;
        st.paused = false;
        st.invincible = POST_UPGRADE_INVINCIBILITY;
        inputState.menuDismissedAt = performance.now();
        keys3d['Enter'] = false;
        keys3d['NumpadEnter'] = false;
        keys3d['Space'] = false;
        inputState.charging = false;
        inputState.chargeTime = 0;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    } else if (!st.gameOver && !st.deathSequence && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu) {
      // Normal gameplay — Enter/NumpadEnter/B handled by power attack in game loop via keys3d
      // Escape opens pause menu (BD-228: disabled during death sequence)
      if (e.code === 'Escape') {
        st.paused = true;
        st.pauseMenu = true;
        st.showFullMap = false;
        st.selectedPauseOption = 0;
      }
    }
    // M key toggles mute (available in all states)
    if (e.code === 'KeyM') {
      toggleMute();
    }
    // TAB key toggles full map (BD-76)
    if (e.code === 'Tab') {
      e.preventDefault();
      if (!st.gameOver && !st.deathSequence && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu) {
        st.showFullMap = !st.showFullMap;
      }
    }
    // Backtick key toggles FPS debug counter (BD-140)
    if (e.code === 'Backquote') {
      st.showFps = !st.showFps;
    }
  }
  /**
   * Handle keyup events.
   *
   * Tracks the Enter key release after game over (to prevent instant menu skip)
   * and detects power attack release (Enter/NumpadEnter/B) to trigger the charged strike.
   *
   * @param {KeyboardEvent} e - The keyup event.
   */
  function onKeyUp(e) {
    keys3d[e.code] = false;
    e.preventDefault();
    if (st.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
      inputState.enterReleasedSinceGameOver = true;
    }
    // Power attack release
    if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyB') && inputState.charging && !st.gameOver && !st.deathSequence && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu && !st.wearableCompare) {
      inputState.charging = false;
      inputState.powerAttackReady = true;
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // === THREE.JS SCENE ===
  const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x87CEEB); // sky blue

  // HUD canvas matches window size
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 40, 90);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);

  /**
   * Handle browser window resize by updating renderer, camera aspect ratio, and HUD canvas dimensions.
   */
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    hudCanvas.width = w;
    hudCanvas.height = h;
  }
  window.addEventListener('resize', onResize);
  camera.position.set(0, 18, 14);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambientLight = new THREE.HemisphereLight(0x87CEEB, 0x4a8c3f, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.9);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // === MAP BOUNDARY WALLS ===
  const wallHeight = 8;
  const wallThickness = 2;
  const wallColor = 0x665544;
  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor, transparent: true, opacity: 0.3 });
  // North wall
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(MAP_HALF * 2 + wallThickness * 2, wallHeight, wallThickness), wallMat);
  northWall.position.set(0, wallHeight / 2, -MAP_HALF - wallThickness / 2);
  northWall.castShadow = true; northWall.receiveShadow = true;
  scene.add(northWall);
  // South wall
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(MAP_HALF * 2 + wallThickness * 2, wallHeight, wallThickness), wallMat);
  southWall.position.set(0, wallHeight / 2, MAP_HALF + wallThickness / 2);
  southWall.castShadow = true; southWall.receiveShadow = true;
  scene.add(southWall);
  // West wall
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_HALF * 2), wallMat);
  westWall.position.set(-MAP_HALF - wallThickness / 2, wallHeight / 2, 0);
  westWall.castShadow = true; westWall.receiveShadow = true;
  scene.add(westWall);
  // East wall
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_HALF * 2), wallMat);
  eastWall.position.set(MAP_HALF + wallThickness / 2, wallHeight / 2, 0);
  eastWall.castShadow = true; eastWall.receiveShadow = true;
  scene.add(eastWall);

  // === TIME-OF-DAY LIGHTING STOPS (BD-127) ===
  const TOD_STOPS = [
    { time: 0,   dirColor: 0xffd8a0, dirInt: 0.7, fogColor: 0xc4a882, skyColor: 0xd4a870, gndColor: 0x4a6a2f },
    { time: 180, dirColor: 0xffeedd, dirInt: 0.9, fogColor: 0x87CEEB, skyColor: 0x87CEEB, gndColor: 0x4a8c3f },
    { time: 600, dirColor: 0xffddbb, dirInt: 0.85, fogColor: 0x7ab8d8, skyColor: 0x7ab8d8, gndColor: 0x4a8c3f },
    { time: 1080, dirColor: 0xff9955, dirInt: 0.7, fogColor: 0xcc7744, skyColor: 0xcc8855, gndColor: 0x3a6a2f },
  ];
  const _todA = new THREE.Color(), _todB = new THREE.Color();

  // === PROCEDURAL TERRAIN ===
  // Terrain generation logic is imported from 3d/terrain.js.
  // Pure functions (noise2D, smoothNoise, terrainHeight, getBiome, BIOME_COLORS, getChunkKey)
  // are used directly. Chunk management functions use a TerrainState object.
  const terrainState = createTerrainState();

  /** Wrapper: generate a terrain chunk, delegating to the terrain module. */
  function generateChunk(cx, cz) { terrainGenerateChunk(cx, cz, scene, terrainState); }
  /** Wrapper: unload a terrain chunk, delegating to the terrain module. */
  function unloadChunk(cx, cz) { terrainUnloadChunk(cx, cz, scene, terrainState); }
  /** Wrapper: update terrain chunks around the player, delegating to the terrain module. */
  function updateChunks(px, pz) { terrainUpdateChunks(px, pz, scene, terrainState); }


  // === PLATEAUS ===
  // Grounded plateaus replace floating platforms. Each plateau has a flat top surface
  // and visible earth/stone sides. Heights are 1-4 units (1 unit ~ zombie height ~ 1.0 world units).
  // The platforms array and collision system remain unchanged for compatibility.
  const platforms = [];
  const platformsByChunk = new Map();

  // Colors for plateau construction
  const PLATEAU_TOP_COLOR = 0x556633;    // mossy earth green (forest)
  const PLATEAU_SIDE_COLORS = [0x8B7355, 0x7A6645, 0x6B5B3A]; // earth/stone browns
  const PLATEAU_STONE_COLORS = [0x777777, 0x888888, 0x666666]; // stone grays for tall plateaus

  /**
   * Build the meshes for a single plateau at the given position.
   * Creates a flat top surface and visible side walls with earth/stone coloring.
   * For taller plateaus (3+), lower portions use stone colors.
   *
   * @param {number} px - World X center of plateau.
   * @param {number} pz - World Z center of plateau.
   * @param {number} baseH - Terrain height at the plateau position.
   * @param {number} plateauHeight - Height of the plateau in world units (1-4).
   * @param {number} pw - Plateau width.
   * @param {number} pd - Plateau depth.
   * @returns {THREE.Mesh[]} Array of all meshes composing this plateau.
   */
  function buildPlateauMeshes(px, pz, baseH, plateauHeight, pw, pd) {
    const meshes = [];
    const stepPlatforms = []; // BD-133: step data for walkable ramp platforms
    const topY = baseH + plateauHeight;

    // Top surface (flat walkable area)
    const topGeo = new THREE.BoxGeometry(pw, 0.3, pd);
    const topMat = new THREE.MeshLambertMaterial({ color: PLATEAU_TOP_COLOR });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.set(px, topY, pz);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    scene.add(topMesh);
    meshes.push(topMesh);

    // Side walls — build the visible sides of the plateau
    // Each side is a tall thin box stretching from terrain level to just below the top.
    const sideH = plateauHeight;
    const sideY = baseH + sideH / 2;
    const wallThick = 0.15;

    // Determine side color based on height — taller plateaus get stone coloring on lower half
    const useStoneLower = plateauHeight >= 3;

    // Helper to pick color for a side segment
    function getSideColor(segmentY) {
      if (useStoneLower && segmentY < baseH + plateauHeight * 0.5) {
        return PLATEAU_STONE_COLORS[Math.floor(noise2D(px + segmentY, pz) * PLATEAU_STONE_COLORS.length)];
      }
      return PLATEAU_SIDE_COLORS[Math.floor(noise2D(px + segmentY * 2, pz + segmentY) * PLATEAU_SIDE_COLORS.length)];
    }

    // Build sides in segments for visual variety (breaks up the flat look)
    const numSegments = Math.max(1, Math.ceil(plateauHeight / 1.0));
    const segH = sideH / numSegments;

    for (let seg = 0; seg < numSegments; seg++) {
      const segBot = baseH + seg * segH;
      const segMid = segBot + segH / 2;
      const sideColor = getSideColor(segBot);
      const sideMat = new THREE.MeshLambertMaterial({ color: sideColor });

      // Front side (positive Z)
      const front = new THREE.Mesh(new THREE.BoxGeometry(pw, segH, wallThick), sideMat);
      front.position.set(px, segMid, pz + pd / 2);
      front.castShadow = true;
      scene.add(front);
      meshes.push(front);

      // Back side (negative Z)
      const back = new THREE.Mesh(new THREE.BoxGeometry(pw, segH, wallThick), sideMat);
      back.position.set(px, segMid, pz - pd / 2);
      back.castShadow = true;
      scene.add(back);
      meshes.push(back);

      // Left side (negative X)
      const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, segH, pd), sideMat);
      left.position.set(px - pw / 2, segMid, pz);
      left.castShadow = true;
      scene.add(left);
      meshes.push(left);

      // Right side (positive X)
      const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, segH, pd), sideMat);
      right.position.set(px + pw / 2, segMid, pz);
      right.castShadow = true;
      scene.add(right);
      meshes.push(right);
    }

    // Ramp/stairs for tall plateaus (BD-133)
    if (plateauHeight >= 2) {
      const stepCount = Math.min(5, Math.ceil(plateauHeight));
      const stepH = plateauHeight / stepCount;
      const rampSide = Math.abs(Math.floor(px * 7 + pz * 13)) % 4;
      // Reuse the base side color for steps
      const stepMat = new THREE.MeshLambertMaterial({
        color: getSideColor(baseH),
        transparent: true,
        opacity: 0.55
      });
      for (let si = 0; si < stepCount; si++) {
        const stepY = baseH + stepH * si + stepH / 2;
        let sx, sz, sw, sd;
        const stepDepth = 1.0;
        if (rampSide === 0) { // front (+Z)
          sx = px; sz = pz + pd / 2 + stepDepth * (si + 0.5); sw = 2; sd = stepDepth;
        } else if (rampSide === 1) { // back (-Z)
          sx = px; sz = pz - pd / 2 - stepDepth * (si + 0.5); sw = 2; sd = stepDepth;
        } else if (rampSide === 2) { // left (-X)
          sx = px - pw / 2 - stepDepth * (si + 0.5); sz = pz; sw = stepDepth; sd = 2;
        } else { // right (+X)
          sx = px + pw / 2 + stepDepth * (si + 0.5); sz = pz; sw = stepDepth; sd = 2;
        }
        const stepGeo = new THREE.BoxGeometry(sw, stepH, sd);
        const stepMesh = new THREE.Mesh(stepGeo, stepMat);
        stepMesh.position.set(sx, stepY, sz);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        scene.add(stepMesh);
        meshes.push(stepMesh);

        // BD-133: Register step as a walkable platform so the player can walk up
        const stepTopY = baseH + stepH * (si + 1);
        stepPlatforms.push({ x: sx, y: stepTopY, z: sz, w: sw, d: sd });
      }
    }

    return { meshes, stepPlatforms };
  }

  /**
   * Generate grounded plateaus for a chunk. Plateaus are solid earth/stone formations
   * rising 1-4 units from the terrain surface, with visible sides and flat walkable tops.
   * 0-2 plateaus per chunk (noise-driven). Occasional stacking creates compound formations.
   *
   * @param {number} cx - Chunk X index.
   * @param {number} cz - Chunk Z index.
   */
  function generatePlatforms(cx, cz) {
    const key = getChunkKey(cx, cz);
    if (platformsByChunk.has(key)) return;
    // Skip chunks outside map bounds
    const cpMinX = cx * CHUNK_SIZE, cpMaxX = cpMinX + CHUNK_SIZE;
    const cpMinZ = cz * CHUNK_SIZE, cpMaxZ = cpMinZ + CHUNK_SIZE;
    if (cpMaxX < -MAP_HALF || cpMinX > MAP_HALF || cpMaxZ < -MAP_HALF || cpMinZ > MAP_HALF) return;
    platformsByChunk.set(key, []);

    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
    const numPlats = Math.floor(noise2D(cx * 5 + 31, cz * 5 + 37) * 3); // 0-2
    for (let i = 0; i < numPlats; i++) {
      const px = ox + 2 + noise2D(cx + i * 19, cz + i * 23) * (CHUNK_SIZE - 4);
      const pz = oz + 2 + noise2D(cx + i * 29, cz + i * 31) * (CHUNK_SIZE - 4);
      const baseH = terrainHeight(px, pz);

      // Plateau height: 1, 2, 3, or 4 units
      const heightRoll = noise2D(px * 1.7, pz * 2.3);
      let plateauHeight;
      if (heightRoll < 0.35) plateauHeight = 1;       // 35% chance: low (walkable beneath)
      else if (heightRoll < 0.65) plateauHeight = 2;   // 30% chance: medium
      else if (heightRoll < 0.85) plateauHeight = 3;   // 20% chance: tall
      else plateauHeight = 4;                           // 15% chance: very tall

      // Plateau width/depth: varies from narrow pillars to wide hills
      const sizeRoll = noise2D(px * 2.1, pz * 3.7);
      let pw, pd;
      if (sizeRoll < 0.25) {
        // Narrow pillar
        pw = 1.5 + noise2D(px * 2, pz * 2) * 1.0; // 1.5-2.5
        pd = 1.5 + noise2D(px * 3, pz * 3) * 1.0;
      } else if (sizeRoll < 0.65) {
        // Medium platform
        pw = 2.5 + noise2D(px * 2, pz * 2) * 2.0; // 2.5-4.5
        pd = 2.5 + noise2D(px * 3, pz * 3) * 2.0;
      } else {
        // Wide hill
        pw = 4 + noise2D(px * 2, pz * 2) * 3.0; // 4-7
        pd = 4 + noise2D(px * 3, pz * 3) * 3.0;
      }

      const topY = baseH + plateauHeight;
      const result = buildPlateauMeshes(px, pz, baseH, plateauHeight, pw, pd);
      const allMeshes = result.meshes;

      // Store as platform for collision (topMesh is allMeshes[0])
      const plat = { mesh: allMeshes[0], meshes: allMeshes, x: px, y: topY, z: pz, w: pw, d: pd };
      platforms.push(plat);
      platformsByChunk.get(key).push(plat);

      // BD-133: Register ramp steps as walkable platforms
      for (const sp of result.stepPlatforms) {
        const stepPlat = { mesh: null, meshes: [], x: sp.x, y: sp.y, z: sp.z, w: sp.w, d: sp.d };
        platforms.push(stepPlat);
        platformsByChunk.get(key).push(stepPlat);
      }

      // Occasional stacking: a smaller plateau on top of this one (10% chance)
      if (noise2D(px * 4.3, pz * 5.7) > 0.9 && plateauHeight <= 3) {
        const stackHeight = 1; // stacked plateau is always 1 unit
        const stackW = pw * (0.5 + noise2D(px * 6, pz * 6) * 0.2); // 50-70% of parent width
        const stackD = pd * (0.5 + noise2D(px * 7, pz * 7) * 0.2);
        const stackBaseH = topY + 0.15; // slight gap above parent top
        const stackTopY = stackBaseH + stackHeight;
        const stackResult = buildPlateauMeshes(px, pz, stackBaseH, stackHeight, stackW, stackD);
        const stackMeshes = stackResult.meshes;

        const stackPlat = { mesh: stackMeshes[0], meshes: stackMeshes, x: px, y: stackTopY, z: pz, w: stackW, d: stackD };
        platforms.push(stackPlat);
        platformsByChunk.get(key).push(stackPlat);

        // BD-133: Register stacked plateau ramp steps as walkable platforms
        for (const sp of stackResult.stepPlatforms) {
          const stepPlat = { mesh: null, meshes: [], x: sp.x, y: sp.y, z: sp.z, w: sp.w, d: sp.d };
          platforms.push(stepPlat);
          platformsByChunk.get(key).push(stepPlat);
        }
      }
    }
  }

  /**
   * Unload all plateaus in a chunk, disposing Three.js resources and removing from the global array.
   *
   * @param {number} cx - Chunk X index.
   * @param {number} cz - Chunk Z index.
   */
  function unloadPlatforms(cx, cz) {
    const key = getChunkKey(cx, cz);
    const plats = platformsByChunk.get(key);
    if (!plats) return;
    plats.forEach(p => {
      // Dispose all meshes in the plateau (top + sides)
      if (p.meshes) {
        p.meshes.forEach(m => {
          scene.remove(m);
          m.geometry.dispose();
          m.material.dispose();
        });
      } else {
        // Fallback for legacy single-mesh platforms
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      const idx = platforms.indexOf(p);
      if (idx >= 0) platforms.splice(idx, 1);
    });
    platformsByChunk.delete(key);
  }

  /**
   * Load/unload platform and shrine chunks around the player position.
   * Uses the same VIEW_DIST as terrain chunks. Also manages shrine chunk lifecycle.
   *
   * @param {number} px - Player world X position.
   * @param {number} pz - Player world Z position.
   * @see generatePlatforms
   * @see unloadPlatforms
   * @see generateShrines
   * @see unloadShrines
   */
  function updatePlatformChunks(px, pz) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const VIEW_DIST = 4;
    for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
      for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
        generatePlatforms(pcx + dx, pcz + dz);
        generateShrines(pcx + dx, pcz + dz);
        generateMapGems(pcx + dx, pcz + dz);
      }
    }
    // Unload far platforms + shrines + map gems
    // Collect keys first to avoid mutation-during-iteration
    const platformKeysToUnload = [];
    for (const key of platformsByChunk.keys()) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - Math.floor(px / CHUNK_SIZE)) > VIEW_DIST + 1 ||
          Math.abs(cz - Math.floor(pz / CHUNK_SIZE)) > VIEW_DIST + 1) {
        platformKeysToUnload.push(key);
      }
    }
    for (const key of platformKeysToUnload) {
      const [cx, cz] = key.split(',').map(Number);
      unloadPlatforms(cx, cz);
      unloadShrines(cx, cz);
    }
    // Unload far map gems
    const gemKeysToUnload = [];
    for (const key of mapGemsByChunk.keys()) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - Math.floor(px / CHUNK_SIZE)) > VIEW_DIST + 1 ||
          Math.abs(cz - Math.floor(pz / CHUNK_SIZE)) > VIEW_DIST + 1) {
        gemKeysToUnload.push(key);
      }
    }
    for (const key of gemKeysToUnload) {
      const [cx, cz] = key.split(',').map(Number);
      unloadMapGems(cx, cz);
    }
    // Also unload shrines in chunks not covered by platforms
    // Collect keys first to avoid mutation-during-iteration
    const shrineKeysToUnload = [];
    for (const key of st.shrinesByChunk.keys()) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - Math.floor(px / CHUNK_SIZE)) > VIEW_DIST + 1 ||
          Math.abs(cz - Math.floor(pz / CHUNK_SIZE)) > VIEW_DIST + 1) {
        shrineKeysToUnload.push(key);
      }
    }
    for (const key of shrineKeysToUnload) {
      const [cx, cz] = key.split(',').map(Number);
      unloadShrines(cx, cz);
    }
  }

  // === SHRINES ===

  /**
   * Create a shrine mesh at the given world position.
   * A shrine consists of a stone base, pillar, glowing orb, and rotating rune cube.
   * Shrines have 3 HP and grant a random augment when destroyed by the player.
   *
   * @param {number} x - World X coordinate.
   * @param {number} z - World Z coordinate.
   * @returns {{group: THREE.Group, orb: THREE.Mesh, rune: THREE.Mesh, x: number, z: number, hp: number, alive: boolean}} Shrine object.
   */
  function createShrineMesh(x, z) {
    const group = new THREE.Group();
    const h = terrainHeight(x, z);
    // Stone pillar base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);
    // Pillar
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.2, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x999999 })
    );
    pillar.position.y = 0.9;
    pillar.castShadow = true;
    group.add(pillar);
    // Glowing orb on top
    const orb = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.8 })
    );
    orb.position.y = 1.7;
    group.add(orb);
    // Rune symbol (small rotating cube)
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    rune.position.y = 1.7;
    group.add(rune);

    group.position.set(x, h, z);
    scene.add(group);
    return { group, orb, rune, x, z, hp: 3, alive: true };
  }

  /**
   * Generate shrines for a chunk (no-op).
   * NOTE: Shrines are now finite and pre-placed at game start rather than chunk-generated.
   *
   * @param {number} cx - Chunk X index (unused).
   * @param {number} cz - Chunk Z index (unused).
   */
  function generateShrines(cx, cz) {
    // Shrines are now finite and pre-placed at game start — skip chunk generation
    return;
  }

  /**
   * Unload shrines for a chunk (no-op).
   * NOTE: Shrines are now finite and pre-placed — they persist for the entire game.
   *
   * @param {number} cx - Chunk X index (unused).
   * @param {number} cz - Chunk Z index (unused).
   */
  function unloadShrines(cx, cz) {
    // Shrines are now finite and pre-placed — never unload them
    return;
  }

  // === MAP GEMS (non-respawning per-chunk XP collectibles) ===
  // Track which chunks have had gems generated (to avoid re-generating on re-entry).
  const mapGemsByChunk = new Map();

  // Shared geometry and material for all map gems (purple, slightly transparent).
  const mapGemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const mapGemMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.85 });

  /**
   * Create a non-respawning XP gem pickup at the given world position.
   * Map gems are purple, bob and spin, and grant variable XP when collected.
   * Once collected, they are tracked by chunk key + index so they don't reappear.
   *
   * @param {number} x - World X position.
   * @param {number} z - World Z position.
   * @param {number} xpValue - XP amount granted on pickup.
   * @returns {{mesh: THREE.Mesh, x: number, z: number, xpValue: number, alive: boolean}} Map gem object.
   */
  function createMapGem(x, z, xpValue) {
    const h = terrainHeight(x, z);
    const mesh = new THREE.Mesh(mapGemGeo, mapGemMat);
    mesh.position.set(x, h + 0.6, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    return { mesh, x, z, xpValue, alive: true };
  }

  /**
   * Generate non-respawning XP gems for a chunk.
   * Uses random positioning per chunk coordinates.
   * Already-collected gems (tracked in st.collectedGemKeys) are skipped.
   * Chunks outside map bounds are skipped.
   *
   * @param {number} cx - Chunk X index.
   * @param {number} cz - Chunk Z index.
   */
  function generateMapGems(cx, cz) {
    const key = getChunkKey(cx, cz);
    if (mapGemsByChunk.has(key)) return;
    // Skip chunks outside map bounds
    const cpMinX = cx * CHUNK_SIZE, cpMaxX = cpMinX + CHUNK_SIZE;
    const cpMinZ = cz * CHUNK_SIZE, cpMaxZ = cpMinZ + CHUNK_SIZE;
    if (cpMaxX < -MAP_HALF || cpMinX > MAP_HALF || cpMaxZ < -MAP_HALF || cpMinZ > MAP_HALF) return;
    mapGemsByChunk.set(key, []);

    const collected = st.collectedGemKeys.get(key) || new Set();
    // 3-5 gems per chunk (base MAP_GEMS_PER_CHUNK ±1)
    const gemCount = MAP_GEMS_PER_CHUNK - 1 + Math.floor(Math.random() * 3); // 3,4,5
    for (let gi = 0; gi < gemCount; gi++) {
      if (collected.has(gi)) continue; // Already collected — don't respawn
      const gx = cx * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
      const gz = cz * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
      const xpVal = GEM_XP_MIN + Math.floor(Math.random() * (GEM_XP_MAX - GEM_XP_MIN + 1));
      const gem = createMapGem(gx, gz, xpVal);
      gem.chunkKey = key;
      gem.gemIndex = gi;
      st.mapGems.push(gem);
      mapGemsByChunk.get(key).push(gem);
    }
  }

  /**
   * Unload map gems for a chunk, disposing Three.js resources.
   * Only removes meshes from the scene — collection state is preserved in st.collectedGemKeys.
   *
   * @param {number} cx - Chunk X index.
   * @param {number} cz - Chunk Z index.
   */
  function unloadMapGems(cx, cz) {
    const key = getChunkKey(cx, cz);
    const gems = mapGemsByChunk.get(key);
    if (!gems) return;
    for (const g of gems) {
      if (g.alive && g.mesh) {
        scene.remove(g.mesh);
      }
      // Remove from st.mapGems
      const idx = st.mapGems.indexOf(g);
      if (idx >= 0) st.mapGems.splice(idx, 1);
    }
    mapGemsByChunk.delete(key);
  }

  // === DIFFICULTY TOTEMS ===

  /**
   * Create a difficulty totem mesh at the given world position.
   * Totems are dark skull pillars with a glowing red orb. They have 5 HP and,
   * when destroyed, increase zombie difficulty while boosting XP and score rewards.
   *
   * @param {number} x - World X coordinate.
   * @param {number} z - World Z coordinate.
   * @returns {{group: THREE.Group, x: number, z: number, y: number, orb: THREE.Mesh, hp: number, alive: boolean}} Totem object.
   * @see TOTEM_EFFECT
   */
  function createTotemMesh(x, z) {
    const group = new THREE.Group();
    const gh = terrainHeight(x, z);
    // Dark stone base
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x332222 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);
    // Skull pillar
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x442222 });
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), pillarMat);
    pillar.position.y = 1.1;
    pillar.castShadow = true;
    group.add(pillar);
    // Red skull orb (glowing)
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
    const orb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), orbMat);
    orb.position.y = 2.0;
    group.add(orb);
    group.position.set(x, gh, z);
    scene.add(group);
    return { group, x, z, y: gh, orb, hp: 5, alive: true };
  }

  // === CHARGE SHRINES ===

  /**
   * Roll a rarity tier for a charge shrine using weighted random selection.
   * Weights match CHARGE_SHRINE_WEIGHTS: common 50, uncommon 28, rare 16, legendary 6.
   *
   * @returns {string} One of 'common', 'uncommon', 'rare', 'legendary'.
   */
  function rollChargeShrineRarity() {
    const total = Object.values(CHARGE_SHRINE_WEIGHTS).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (const [rarity, weight] of Object.entries(CHARGE_SHRINE_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    return 'common';
  }

  /**
   * Create a charge shrine mesh at the given world position.
   * Charge shrines are visually larger than regular shrines with rarity-colored crystals.
   * Player must stand within CHARGE_SHRINE_RADIUS for CHARGE_SHRINE_TIME seconds to activate.
   *
   * @param {number} x - World X coordinate.
   * @param {number} z - World Z coordinate.
   * @param {string} rarity - Rarity tier ('common', 'uncommon', 'rare', 'legendary').
   * @returns {{group: THREE.Group, crystal: THREE.Mesh, rune: THREE.Mesh, groundRing: THREE.Mesh, x: number, z: number, rarity: string, alive: boolean, charged: boolean}} Charge shrine object.
   */
  function createChargeShrineMesh(x, z, rarity) {
    const group = new THREE.Group();
    const h = terrainHeight(x, z);

    // Rarity color mapping (matches ITEM_RARITIES visual language)
    const rarityColors = {
      common: 0xffffff,
      uncommon: 0x44ff44,
      rare: 0x4488ff,
      legendary: 0xff8800,
    };
    const glowColor = rarityColors[rarity] || 0xffffff;

    // Wide stone platform base (2x2)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.4, 2),
      new THREE.MeshLambertMaterial({ color: 0x666666 })
    );
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Inner platform ring
    const ring = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.15, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    ring.position.y = 0.45;
    group.add(ring);

    // Central pillar (tall — 3.5 units to be visible from distance)
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x999999 })
    );
    pillar.position.y = 2.15;
    pillar.castShadow = true;
    group.add(pillar);

    // Glowing crystal on top (rarity-colored)
    const crystal = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.9 })
    );
    crystal.position.y = 4.1;
    crystal.rotation.y = Math.PI / 4; // Diamond orientation
    group.add(crystal);

    // Smaller floating rune cube
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.6 })
    );
    rune.position.y = 3.5;
    group.add(rune);

    // Ground ring indicator (flat, semi-transparent — shows charge radius)
    const groundRing = new THREE.Mesh(
      new THREE.BoxGeometry(CHARGE_SHRINE_RADIUS * 2, 0.05, CHARGE_SHRINE_RADIUS * 2),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.15 })
    );
    groundRing.position.y = 0.05;
    group.add(groundRing);

    group.position.set(x, h, z);
    scene.add(group);

    return { group, crystal, rune, groundRing, x, z, rarity, alive: true, charged: false };
  }

  // Initial terrain + platforms
  updateChunks(0, 0);
  updatePlatformChunks(0, 0);

  // BD-88+BD-100: Spread shrines/totems with spacing, INSIDE playable map (MAP_HALF=128).
  const SPAWN_HALF_RANGE = MAP_HALF - 10;  // 118 — keeps all spawns inside the playable area
  // MIN_SHRINE_SPACING and MAX_PLACEMENT_ATTEMPTS imported from constants.js
  const allPlacedPositions = []; // shared list: {x, z} of every placed shrine/totem

  function findSpacedPosition() {
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const x = (Math.random() - 0.5) * SPAWN_HALF_RANGE * 2;
      const z = (Math.random() - 0.5) * SPAWN_HALF_RANGE * 2;
      let tooClose = false;
      for (let j = 0; j < allPlacedPositions.length; j++) {
        const dx = x - allPlacedPositions[j].x;
        const dz = z - allPlacedPositions[j].z;
        if (dx * dx + dz * dz < MIN_SHRINE_SPACING * MIN_SHRINE_SPACING) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) return { x, z };
    }
    return null;
  }

  // Pre-generate finite shrines across the map
  for (let i = 0; i < SHRINE_COUNT; i++) {
    const pos = findSpacedPosition();
    if (!pos) continue;
    allPlacedPositions.push(pos);
    const shrine = createShrineMesh(pos.x, pos.z);
    st.shrines.push(shrine);
  }

  // Pre-generate difficulty totems (BD-100: increased from 16 to 24)
  // TOTEM_COUNT imported from constants.js
  for (let ti = 0; ti < TOTEM_COUNT; ti++) {
    const pos = findSpacedPosition();
    if (!pos) continue;
    allPlacedPositions.push(pos);
    const totem = createTotemMesh(pos.x, pos.z);
    st.totems.push(totem);
  }

  // Pre-generate charge shrines across the map
  for (let i = 0; i < CHARGE_SHRINE_COUNT; i++) {
    const pos = findSpacedPosition();
    if (!pos) continue;
    allPlacedPositions.push(pos);
    const rarity = rollChargeShrineRarity();
    const cs = createChargeShrineMesh(pos.x, pos.z, rarity);
    st.chargeShrines.push(cs);
  }

  // === GENERATE CHALLENGE SHRINES (BD-77, BD-100: capped distance to stay inside map) ===
  for (let i = 0; i < CHALLENGE_SHRINE_COUNT; i++) {
    const pos = findSpacedPosition();
    if (!pos) continue;
    allPlacedPositions.push(pos);
    const cx = pos.x;
    const cz = pos.z;

    // Visual: dark red glowing shrine
    const shrineGroup = new THREE.Group();
    // Base pillar
    const pillarGeo = new THREE.BoxGeometry(2, 4, 2);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2;
    pillar.castShadow = true;
    shrineGroup.add(pillar);
    // Skull on top
    const skullGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const skullMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.y = 4.5;
    skull.castShadow = true;
    shrineGroup.add(skull);
    // Eye glow
    const eyeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.35, 4.6, 0.76);
    shrineGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.35, 4.6, 0.76);
    shrineGroup.add(eyeR);

    const ch = terrainHeight(cx, cz);
    shrineGroup.position.set(cx, ch, cz);
    scene.add(shrineGroup);

    st.challengeShrines.push({
      x: cx, z: cz, group: shrineGroup,
      activated: false,
      bossDefeated: false,
      rewardClaimed: false,
    });
  }

  // === PLAYER MODEL (built via 3d/player-model.js) ===
  const playerModel = buildPlayerModel(animalId, scene);
  const playerGroup = playerModel.group;
  playerModel.itemMeshes = {};

  // BD-214: Store true original colors permanently for hurt flash restoration
  playerGroup.traverse(child => {
    if (child.isMesh && child.material) {
      child.userData._trueColor = child.material.color.getHex();
    }
  });

  // === OBJECT POOL UTILITY (BD-185) ===
  /**
   * Create a simple object pool. Acquires objects from the pool or creates new ones
   * via the factory function when the pool is empty. Released objects are returned
   * to the pool for reuse, reducing GC pressure from frequent create/destroy cycles.
   *
   * @param {Function} factory - Zero-arg function that creates a new pooled object.
   * @param {number} initialSize - Number of objects to pre-create.
   * @returns {{acquire: Function, release: Function, disposeAll: Function}}
   */
  function createPool(factory, initialSize) {
    const available = [];
    for (let i = 0; i < initialSize; i++) available.push(factory());
    return {
      acquire() { return available.length > 0 ? available.pop() : factory(); },
      release(obj) { available.push(obj); },
      disposeAll(disposeFn) { available.forEach(disposeFn); available.length = 0; }
    };
  }

  // === FIRE AURA (for race car powerup) ===
  const fireParticles = [];
  /** Maximum concurrent fire particles to prevent GPU memory exhaustion. */
  const MAX_FIRE_PARTICLES = 80;
  const fireGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

  // Pool of fire particle meshes (BD-185). Each mesh gets a per-instance material
  // so color can be changed per-spawn. Pool starts with 20 pre-allocated meshes.
  const firePool = createPool(() => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    return new THREE.Mesh(fireGeo, mat);
  }, 20);

  /**
   * Spawn a fire particle if below the cap. Returns null if at capacity.
   * Acquires mesh from pool (BD-185) instead of creating new.
   * @param {number} hex - Particle color.
   * @param {number} x - World X.
   * @param {number} y - World Y.
   * @param {number} z - World Z.
   * @param {number} life - Lifetime in seconds.
   * @param {Object} [opts] - Optional overrides: { transparent, opacity }.
   * @returns {{mesh: THREE.Mesh, life: number}|null} The particle, or null if at cap.
   */
  function spawnFireParticle(hex, x, y, z, life, opts) {
    if (fireParticles.length >= MAX_FIRE_PARTICLES) return null;
    const fp = firePool.acquire();
    fp.material.color.setHex(hex);
    if (opts && opts.transparent) { fp.material.transparent = true; fp.material.opacity = opts.opacity || 1.0; }
    else { fp.material.transparent = false; fp.material.opacity = 1.0; }
    fp.position.set(x, y, z);
    fp.visible = true;
    scene.add(fp);
    const entry = { mesh: fp, life };
    fireParticles.push(entry);
    return entry;
  }

  // === ZOMBIE TIER SYSTEM === (ZOMBIE_TIERS imported from 3d/constants.js)

  // === ENEMY CREATION (tier-based zombie) ===

  /**
   * Create a zombie enemy at the given position with a specific tier.
   * Higher tiers have larger models, more HP/damage, and visual upgrades:
   * - Tier 2+: shoulder pads
   * - Tier 3+: third eye
   * - Tier 4+: teeth
   * - Tier 5+: hand claws
   * - Tier 6+: side eyes
   * - Tier 7+: horns
   * - Tier 8+: spine ridges
   * - Tier 9+: glowing aura particles
   * - Tier 10: crown of fire
   *
   * @param {number} x - World X spawn position.
   * @param {number} z - World Z spawn position.
   * @param {number} baseHp - Base HP before tier multiplier.
   * @param {number} tier - Zombie tier (1-10), clamped to valid range.
   * @returns {Enemy} Enemy object with group, body parts, stats, and animation state.
   * @see ZOMBIE_TIERS
   */

  // BD-145: Per-tier special attack cooldown (seconds between attacks)
  function getTierAttackCooldown(tier) {
    if (tier >= 10) return 1.5; // BD-211: reduced from 4
    if (tier >= 9) return 2.5;  // BD-211: reduced from 5
    if (tier >= 6) return 8;
    if (tier >= 5) return 8;
    if (tier >= 4) return 7;
    if (tier >= 3) return 7;
    if (tier >= 2) return 6;
    return 0;
  }

  function createEnemy(x, z, baseHp, tier) {
    tier = Math.max(1, Math.min(10, tier || 1));
    const td = ZOMBIE_TIERS[tier - 1];
    const s = td.scale;
    const group = new THREE.Group();

    // Body
    const eBody = box(group, 0.55 * s, 0.7 * s, 0.35 * s, td.body, 0, 0.75 * s, 0, true);
    // Torn shirt
    box(group, 0.56 * s, 0.15 * s, 0.36 * s, td.body - 0x101010, 0, 0.95 * s, 0);
    box(group, 0.4 * s, 0.08 * s, 0.36 * s, td.body - 0x111111, 0, 0.55 * s, 0);

    // Head
    const eHead = box(group, 0.42 * s, 0.42 * s, 0.38 * s, td.head, 0, 1.25 * s, 0, true);
    box(group, 0.38 * s, 0.1 * s, 0.35 * s, td.head + 0x101010, 0, 1.45 * s, 0);

    // Eyes (glow brighter at higher tiers)
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: td.eye });
    box(group, 0.1 * s, 0.08 * s, 0.06 * s, td.eye, -0.1 * s, 1.3 * s, 0.18 * s);
    box(group, 0.1 * s, 0.08 * s, 0.06 * s, td.eye, 0.1 * s, 1.3 * s, 0.18 * s);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
    eyeL.position.set(-0.1 * s, 1.3 * s, 0.2 * s); group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
    eyeR.position.set(0.1 * s, 1.3 * s, 0.2 * s); group.add(eyeR);

    // Tier 3+: third eye on forehead
    if (tier >= 3) {
      box(group, 0.08 * s, 0.08 * s, 0.06 * s, td.eye, 0, 1.42 * s, 0.18 * s);
      const eyeM = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
      eyeM.position.set(0, 1.42 * s, 0.2 * s); group.add(eyeM);
    }

    // Tier 6+: extra side eyes
    if (tier >= 6) {
      const sideEyeMat = new THREE.MeshBasicMaterial({ color: td.eye });
      for (const sx of [-0.2, 0.2]) {
        box(group, 0.06 * s, 0.06 * s, 0.06 * s, td.eye, sx * s, 1.35 * s, 0.16 * s);
        const se = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.04 * s, 0.03 * s), sideEyeMat);
        se.position.set(sx * s, 1.35 * s, 0.19 * s); group.add(se);
      }
    }

    // Mouth (wider/scarier at higher tiers)
    const mouthW = (0.25 + tier * 0.015) * s;
    box(group, mouthW, 0.08 * s, 0.06 * s, 0x2a1a1a, 0, 1.12 * s, 0.18 * s);
    box(group, mouthW * 0.7, 0.05 * s, 0.04 * s, 0x1a0a0a, 0, 1.1 * s, 0.19 * s);

    // Tier 4+: teeth
    if (tier >= 4) {
      const teethColor = 0xddddaa;
      for (let t = -2; t <= 2; t++) {
        box(group, 0.03 * s, 0.05 * s, 0.03 * s, teethColor, t * 0.04 * s, 1.07 * s, 0.19 * s);
      }
    }

    // Arms
    const armL = box(group, 0.16 * s, 0.55 * s, 0.16 * s, td.head, -0.38 * s, 0.75 * s, 0.15 * s, true);
    const armR = box(group, 0.16 * s, 0.55 * s, 0.16 * s, td.head, 0.38 * s, 0.75 * s, 0.15 * s, true);
    // Hands
    box(group, 0.12 * s, 0.12 * s, 0.12 * s, td.body, -0.38 * s, 0.5 * s, 0.2 * s);
    box(group, 0.12 * s, 0.12 * s, 0.12 * s, td.body, 0.38 * s, 0.5 * s, 0.2 * s);

    // Tier 5+: claws on hands
    if (tier >= 5) {
      const clawColor = 0xccccaa;
      for (const side of [-1, 1]) {
        for (let c = -1; c <= 1; c++) {
          box(group, 0.02 * s, 0.08 * s, 0.02 * s, clawColor, (side * 0.38 + c * 0.03) * s, 0.42 * s, 0.24 * s);
        }
      }
    }

    // Legs
    const legL = box(group, 0.18 * s, 0.45 * s, 0.18 * s, td.body - 0x101010, -0.12 * s, 0.22 * s, 0, true);
    const legR = box(group, 0.18 * s, 0.45 * s, 0.18 * s, td.body - 0x101010, 0.12 * s, 0.22 * s, 0, true);
    // Feet
    box(group, 0.2 * s, 0.06 * s, 0.22 * s, td.body - 0x1a1a1a, -0.12 * s, 0.02, 0.02 * s);
    box(group, 0.2 * s, 0.06 * s, 0.22 * s, td.body - 0x1a1a1a, 0.12 * s, 0.02, 0.02 * s);

    // Tier 2+: shoulder pads (getting bigger with tier)
    if (tier >= 2) {
      const padS = 0.08 + tier * 0.02;
      box(group, padS * s, padS * 0.6 * s, padS * s, td.body + 0x111111, -0.38 * s, 1.05 * s, 0);
      box(group, padS * s, padS * 0.6 * s, padS * s, td.body + 0x111111, 0.38 * s, 1.05 * s, 0);
    }

    // Tier 7+: horns
    if (tier >= 7) {
      const hornColor = 0x665544;
      const hornH = 0.15 + (tier - 7) * 0.08;
      box(group, 0.06 * s, hornH * s, 0.06 * s, hornColor, -0.15 * s, (1.48 + hornH / 2) * s, 0);
      box(group, 0.06 * s, hornH * s, 0.06 * s, hornColor, 0.15 * s, (1.48 + hornH / 2) * s, 0);
      // Horn tips
      box(group, 0.04 * s, 0.04 * s, 0.04 * s, 0xaa8866, -0.15 * s, (1.48 + hornH) * s, 0);
      box(group, 0.04 * s, 0.04 * s, 0.04 * s, 0xaa8866, 0.15 * s, (1.48 + hornH) * s, 0);
    }

    // Tier 8+: spine ridges down the back
    if (tier >= 8) {
      const ridgeColor = td.body + 0x222222;
      for (let r = 0; r < 4; r++) {
        const ry = (0.6 + r * 0.2) * s;
        const rSize = (0.06 + (tier - 8) * 0.02) * s;
        box(group, rSize, rSize * 1.5, rSize, ridgeColor, 0, ry, -0.2 * s);
      }
    }

    // Tier 9+: glowing aura particles (emissive cubes around body)
    if (tier >= 9) {
      const auraMat = new THREE.MeshBasicMaterial({ color: td.eye, transparent: true, opacity: 0.4 });
      for (let a = 0; a < 6; a++) {
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.12 * s), auraMat);
        const angle = (a / 6) * Math.PI * 2;
        ag.position.set(Math.cos(angle) * 0.5 * s, (0.5 + Math.random() * 0.8) * s, Math.sin(angle) * 0.5 * s);
        group.add(ag);
      }
    }

    // Tier 10: crown of fire (emissive blocks on head)
    // BD-219: Store crown meshes for phase visual changes
    let crownMeshes = [];
    if (tier >= 10) {
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
      for (let c = 0; c < 8; c++) {
        const ca = (c / 8) * Math.PI * 2;
        const cm = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.12 * s, 0.05 * s), crownMat);
        cm.position.set(Math.cos(ca) * 0.18 * s, 1.52 * s, Math.sin(ca) * 0.18 * s);
        group.add(cm);
        crownMeshes.push(cm);
      }
    }

    const totalHp = baseHp * td.hpMult;
    const th = terrainHeight(x, z);
    group.position.set(x, th + 0.01, z);
    scene.add(group);

    // BD-211: Boss visual intimidation — 1.5x scale + persistent red aura for tier 9/10
    let bossAuraMesh = null;
    if (tier >= 9) {
      group.scale.setScalar(1.5); // 1.5x larger than base tier scale
      // Persistent semi-transparent red aura sphere
      const auraSize = s * 1.8;
      const auraGeo = new THREE.SphereGeometry(auraSize, 12, 8);
      const auraMat = new THREE.MeshBasicMaterial({
        color: tier >= 10 ? 0xff0000 : 0xcc2200,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      bossAuraMesh = new THREE.Mesh(auraGeo, auraMat);
      bossAuraMesh.position.set(0, 0.8 * s, 0);
      group.add(bossAuraMesh);
    }

    const enemySpeed = td.speed + Math.random() * 0.3;
    return {
      group, body: eBody, head: eHead, armL, armR, legL, legR,
      hp: totalHp,
      maxHp: totalHp,
      speed: enemySpeed,
      hurtTimer: 0,
      hurtFlashCooldown: 0,
      alive: true,
      dying: false,     // BD-123: death animation state
      deathTimer: 0,    // BD-123: countdown for shrink+sink animation
      tier,
      bodyColor: td.body,
      headColor: td.head,
      walkPhase: Math.random() * Math.PI * 2,
      mergeCount: 0,       // Tracks absorbed same-tier zombies toward next tier
      mergeBounce: 0,      // Visual bounce timer after successful tier-up merge
      // BD-84/BD-145: Special attack state for tiers 2+ (each tier has unique attack)
      specialAttackTimer: (tier >= 2) ? getTierAttackCooldown(tier) + Math.random() * 2 : 0,
      specialAttackState: 'idle', // 'idle', 'telegraph', 'fire'
      specialAttackTelegraphTimer: 0,
      specialAttackTargetX: 0,
      specialAttackTargetZ: 0,
      specialAttackMesh: null,
      _attackFlashTimer: 0, // BD-166: body flash timer
      _attackTargetX: 0,    // BD-167: saved player position for tier 5
      _attackTargetZ: 0,
      // BD-145: Extra fields for Grave Burst (tier 6) sequential explosions
      specialAttackBurstIndex: 0,
      specialAttackBurstTimer: 0,
      specialAttackMarkers: [],
      specialAttackCount: 0, // BD-211: counts attacks for tier 9 slam/shockwave alternation
      bossAuraMesh: bossAuraMesh, // BD-211: persistent aura sphere for tier 9/10
      bossPhase: (tier >= 9) ? 1 : 0, // BD-218: boss HP phase (1=initial, 2/3/4=enraged phases)
      // BD-219: Store references for boss phase visual changes
      eyeGlowMat: (tier >= 9) ? eyeGlowMat : null,
      crownMeshes: crownMeshes,
      _bossScale: s,
      _lastAttack: null, // BD-220: prevent consecutive repeats
      // BD-221: Titan Charge state machine
      _chargeState: null,
      _chargeTimer: 0,
      _chargeDirX: 0,
      _chargeDirZ: 0,
      _chargeDistLeft: 0,
      _chargeSpeed: 0,
      _chargeTelegraphMesh: null,
      // BD-221: Ground Fissures tracking
      _fissureMeshes: [],
      _fissureState: null,
      _fissureTimer: 0,
      _fissureData: [],
      // BD-226: Dark Nova state
      _bossDarkNovaHintShown: false, // First-time "GET CLOSE!" hint for Dark Nova
      _bossBaseSpeed: enemySpeed, // Store base speed for phase 4 boost
      _darkNovaState: null, // 'floatUp', 'slam', 'ring', null
      _darkNovaTimer: 0,
      _darkNovaRingMesh: null,
      _darkNovaRingRadius: 0,
      _darkNovaHasHit: false,
      _darkNovaOriginY: 0,
    };
  }

  /**
   * Remove an enemy from the scene and dispose all its Three.js geometry and materials.
   *
   * @param {Enemy} e - The enemy to dispose.
   */
  function disposeEnemy(e) {
    e.alive = false;
    // BD-84/BD-166: Clean up special attack telegraph mesh (added to scene, not e.group)
    // BD-225: Use disposeTelegraph for consistent cleanup (BD-24: uses disposeSceneObject internally)
    disposeTelegraph(e);
    // BD-221: Clean up Titan Charge telegraph mesh
    if (e._chargeTelegraphMesh) {
      disposeSceneObject(e._chargeTelegraphMesh);
      e._chargeTelegraphMesh = null;
    }
    e._chargeState = null;
    // BD-221: Clean up Ground Fissure meshes
    if (e._fissureData) {
      for (const fd of e._fissureData) {
        if (fd.mesh) disposeSceneObject(fd.mesh);
      }
      e._fissureData = [];
    }
    if (e._fissureMeshes) e._fissureMeshes = [];
    e._fissureState = null;
    // BD-223: Clean up Death Beam mesh if active when Overlord dies
    if (e._deathBeamMesh) {
      disposeTempMesh(e._deathBeamMesh);
      e._deathBeamMesh = null;
    }
    // BD-225: Clean up Death Bolt Volley fan lines
    if (e._volleyFanLines) {
      for (const line of e._volleyFanLines) disposeTempMesh(line);
      e._volleyFanLines = null;
    }
    // BD-226: Clean up Dark Nova ring mesh if enemy dies mid-attack
    if (e._darkNovaRingMesh) {
      scene.remove(e._darkNovaRingMesh);
      if (e._darkNovaRingMesh.geometry) e._darkNovaRingMesh.geometry.dispose();
      if (e._darkNovaRingMesh.material) e._darkNovaRingMesh.material.dispose();
      e._darkNovaRingMesh = null;
    }
    scene.remove(e.group);
    e.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(mat => mat.dispose());
        else c.material.dispose();
      }
    });
  }

  // === XP GEM ===
  // NOTE: Shared geometry and tiered materials for all XP gems to reduce draw calls (BD-174).
  const gemGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35); // BD-111: larger gems for visual presence
  // 4 shared gem materials — small/medium/large/mega with increasing emissive intensity.
  // BD-111: Boosted emissive intensities for stronger glow/visibility.
  const gemMats = {
    small:  new THREE.MeshLambertMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.0 }),
    medium: new THREE.MeshLambertMaterial({ color: 0x66ff66, emissive: 0x33cc33, emissiveIntensity: 1.3 }),
    large:  new THREE.MeshLambertMaterial({ color: 0x88ffaa, emissive: 0x44ee44, emissiveIntensity: 1.6 }),
    mega:   new THREE.MeshLambertMaterial({ color: 0xccffee, emissive: 0x66ff66, emissiveIntensity: 2.2 }),
  };
  // Keep backward compat alias
  const gemMat = gemMats.small;

  // Pool of gem meshes (BD-185). Gems are constantly created/destroyed as enemies die
  // and XP is collected, so pooling avoids per-gem allocation. Starts with 30.
  const gemPool = createPool(() => new THREE.Mesh(gemGeo, gemMat), 30);

  /** Pick the appropriate shared gem material by XP value. */
  function getGemMaterial(xpValue) {
    if (xpValue >= 10) return gemMats.mega;
    if (xpValue >= 5)  return gemMats.large;
    if (xpValue >= 3)  return gemMats.medium;
    return gemMats.small;
  }

  /**
   * Create an XP gem pickup at the given world position.
   * Acquires mesh from pool (BD-185) instead of creating new.
   * Gems bob up and down, spin, and are attracted toward the player when within collectRadius * 2.
   * Material is chosen by XP value tier (BD-174).
   *
   * @param {number} x - World X position.
   * @param {number} z - World Z position.
   * @param {number} [xpValue=1] - XP value of the gem (determines visual tier).
   * @returns {XpGem} Gem object with mesh, bob animation phase, and xpValue.
   */
  function createXpGem(x, z, xpValue = 1) {
    const mat = getGemMaterial(xpValue);
    const mesh = gemPool.acquire();
    mesh.material = mat;
    const h = terrainHeight(x, z);
    mesh.position.set(x, h + 0.5, z);
    mesh.rotation.set(0, 0, 0);
    mesh.visible = true;
    // Scale up larger gems slightly for visual distinction
    if (xpValue >= 10)     mesh.scale.setScalar(1.8);
    else if (xpValue >= 5) mesh.scale.setScalar(1.4);
    else if (xpValue >= 3) mesh.scale.setScalar(1.2);
    else                    mesh.scale.setScalar(1.0);
    scene.add(mesh);
    return { mesh, bobPhase: Math.random() * Math.PI * 2, baseScale: 1.0, xpValue };
  }

  // (mapGemGeo, mapGemMat, createMapGem moved above generateMapGems)

  /**
   * Find the nearest platform to a world position within a maximum distance.
   * Used to place crates and item pickups on platforms for more interesting exploration.
   *
   * @param {number} x - World X position to search from.
   * @param {number} z - World Z position to search from.
   * @param {number} maxDist - Maximum search distance.
   * @returns {Object|null} The nearest platform object, or null if none found within range.
   */
  function findNearbyPlatform(x, z, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (const p of platforms) {
      const dx = p.x - x, dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = p; }
    }
    return best;
  }

  // === POWERUP CRATE ===

  /**
   * Create a breakable powerup crate at the given position.
   * Selects a random powerup type, attempts to place on the nearest platform,
   * and builds a wooden crate mesh with a colored top indicator matching the powerup.
   * Crates have 3 HP and are broken by walking into them.
   *
   * @param {number} x - World X position (may be adjusted to nearest platform).
   * @param {number} z - World Z position (may be adjusted to nearest platform).
   * @returns {{group: THREE.Group, ptype: Object, x: number, z: number, hp: number, alive: boolean, showLabel: boolean}} Crate object.
   */
  function createPowerupCrate(x, z) {
    const ptype = POWERUPS_3D[Math.floor(Math.random() * POWERUPS_3D.length)];
    // Place on nearest platform if one exists nearby
    const plat = findNearbyPlatform(x, z, 20);
    const px = plat ? plat.x : x;
    const pz = plat ? plat.z : z;
    const h = plat ? plat.y + 0.2 : terrainHeight(px, pz);
    const group = new THREE.Group();
    // Wooden crate
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x886633 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.y = 0.4;
    crate.castShadow = true;
    group.add(crate);
    // Colored top indicator
    const topGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const topMat = new THREE.MeshLambertMaterial({ color: ptype.colorHex, emissive: ptype.colorHex, emissiveIntensity: 0.3 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.85;
    group.add(top);

    group.position.set(px, h, pz);
    scene.add(group);
    return { group, ptype, x: px, z: pz, hp: 3, alive: true, showLabel: false };
  }

  // === ITEM PICKUP ===

  /**
   * Create a floating item pickup at the given position.
   * Filters available items based on what the player already has (no duplicates,
   * armor can upgrade from leather to chainmail). Returns null if no items available.
   * Attempts to place on nearest platform for platforming incentive.
   *
   * @param {number} x - World X position (may be adjusted to nearest platform).
   * @param {number} z - World Z position (may be adjusted to nearest platform).
   * @param {string} [forcedItemId] - Optional item ID to force (bypasses rarity roll). Used by boss rewards (BD-77).
   * @returns {{mesh: THREE.Mesh, itype: Object, x: number, z: number, bobPhase: number, alive: boolean}|null} Item pickup object, or null if all items owned.
   * @see ITEMS_3D
   */
  function createItemPickup(x, z, forcedItemId, minRarity) {
    // Rarity tier order for minimum-rarity filtering (BD-95/BD-96)
    const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];

    // If a forced item ID is provided, use that item directly (BD-77 boss rewards)
    if (forcedItemId) {
      const forcedItem = ITEMS_3D.find(it => it.id === forcedItemId);
      if (forcedItem) {
        const plat = findNearbyPlatform(x, z, 20);
        const px = plat ? plat.x : x;
        const pz = plat ? plat.z : z;
        const h = plat ? plat.y + 0.2 : terrainHeight(px, pz);
        const rarityData = ITEM_RARITIES[forcedItem.rarity] || ITEM_RARITIES.common;
        const meshColor = rarityData.colorHex;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshLambertMaterial({ color: meshColor, emissive: meshColor, emissiveIntensity: 0.4 })
        );
        mesh.position.set(px, h + 0.8, pz);
        scene.add(mesh);
        return { mesh, itype: forcedItem, x: px, z: pz, bobPhase: Math.random() * Math.PI * 2, alive: true };
      }
    }

    // Pick a random available item using rarity-weighted selection.
    // Stackable items are always available; non-stackable items allow occupied-slot spawns
    // for multi-item slots (armor, boots) so the player can choose via comparison menu (BD-199).
    const minRarityIdx = minRarity ? RARITY_ORDER.indexOf(minRarity) : 0;
    const available = ITEMS_3D.filter(it => {
      // Filter out items below minimum rarity (BD-95/BD-96)
      if (minRarity && RARITY_ORDER.indexOf(it.rarity) < minRarityIdx) return false;
      // Stackable items are always available
      if (it.stackable) return true;
      // Armor: allow different armor to spawn even if slot occupied (comparison menu)
      if (it.slot === 'armor') {
        if (st.items.armor === it.id) return false; // already have this exact armor
        return true;
      }
      if (it.slot === 'glasses') return !st.items.glasses;
      // Boots: allow different boots to spawn even if slot occupied (comparison menu)
      if (it.slot === 'boots') {
        if (st.items.boots === it.id) return false; // already have this exact boot
        return true;
      }
      // Boolean-slot items: ring, charm, vest, pendant, bracelet, gloves, cushion, turboshoes, goldenbone, crown, zombiemagnet, scarf
      if (st.items[it.slot] !== undefined && typeof st.items[it.slot] === 'boolean') return !st.items[it.slot];
      return true;
    });
    // If minRarity filter left nothing, fall back to unfiltered pool
    if (available.length === 0 && minRarity) return createItemPickup(x, z, null, null);
    if (available.length === 0) return null;

    // Rarity-weighted random selection
    // Build weighted pool: each item contributes its rarity's weight
    let totalWeight = 0;
    for (const it of available) {
      totalWeight += (ITEM_RARITIES[it.rarity] || ITEM_RARITIES.common).weight;
    }
    let roll = Math.random() * totalWeight;
    let itype = available[0]; // fallback
    for (const it of available) {
      roll -= (ITEM_RARITIES[it.rarity] || ITEM_RARITIES.common).weight;
      if (roll <= 0) { itype = it; break; }
    }

    // Place on nearest platform if one exists nearby
    const plat = findNearbyPlatform(x, z, 20);
    const px = plat ? plat.x : x;
    const pz = plat ? plat.z : z;
    const h = plat ? plat.y + 0.2 : terrainHeight(px, pz);
    // Color the pickup mesh based on rarity tier
    const rarityData = ITEM_RARITIES[itype.rarity] || ITEM_RARITIES.common;
    const meshColor = rarityData.colorHex;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshLambertMaterial({ color: meshColor, emissive: meshColor, emissiveIntensity: 0.4 })
    );
    mesh.position.set(px, h + 0.8, pz);
    scene.add(mesh);
    return { mesh, itype, x: px, z: pz, bobPhase: Math.random() * Math.PI * 2, alive: true };
  }

  // === WEARABLE PICKUP ===

  /**
   * Create a floating wearable pickup at the given position.
   * Wearable pickups are colored cubes with a spinning ring indicator to distinguish
   * them from regular item pickups. Uses rarity-weighted selection from WEARABLES_3D.
   *
   * @param {number} x - World X position.
   * @param {number} z - World Z position.
   * @returns {{mesh: THREE.Group, wearableId: string, wearableData: Object, x: number, z: number, bobPhase: number, alive: boolean, nearTimer: number}} Wearable pickup object.
   */
  function createWearablePickup(x, z) {
    const wearableKeys = Object.keys(WEARABLES_3D);
    // Rarity-weighted selection
    let totalWeight = 0;
    for (const key of wearableKeys) {
      const w = WEARABLES_3D[key];
      totalWeight += (ITEM_RARITIES[w.rarity] || ITEM_RARITIES.common).weight;
    }
    let roll = Math.random() * totalWeight;
    let chosenId = wearableKeys[0];
    for (const key of wearableKeys) {
      const w = WEARABLES_3D[key];
      roll -= (ITEM_RARITIES[w.rarity] || ITEM_RARITIES.common).weight;
      if (roll <= 0) { chosenId = key; break; }
    }
    const wearableData = WEARABLES_3D[chosenId];
    const rarityData = ITEM_RARITIES[wearableData.rarity] || ITEM_RARITIES.common;

    // Place on terrain
    const h = terrainHeight(x, z);
    const group = new THREE.Group();
    // Core cube
    const cubeMat = new THREE.MeshLambertMaterial({
      color: wearableData.color, emissive: wearableData.color, emissiveIntensity: 0.5,
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), cubeMat);
    group.add(cube);
    // Ring indicator around the cube (distinguishes from item pickups)
    const ringMat = new THREE.MeshBasicMaterial({
      color: rarityData.colorHex, transparent: true, opacity: 0.5,
    });
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), ringMat);
    ring.position.y = -0.1;
    group.add(ring);

    group.position.set(x, h + 0.8, z);
    scene.add(group);
    return {
      mesh: group, wearableId: chosenId, wearableData, x, z,
      bobPhase: Math.random() * Math.PI * 2, alive: true, nearTimer: 0,
    };
  }

  // === SHARED WEAPON EFFECT RESOURCES ===
  // Shared geometry and material for lightning bolt segments to avoid per-segment allocation.
  const boltSegGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
  const boltSegMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
  const boltGlowGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const boltGlowMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.6 });

  // === ATTACK LINE ===
  const attackLineMat = new THREE.LineBasicMaterial({ color: 0xffff44 });

  /**
   * Create a visual attack line from source to target position.
   * Used for auto-attack and power attack hit visualization. Lines fade after 6 frames.
   *
   * @param {number} fx - Source X.
   * @param {number} fy - Source Y.
   * @param {number} fz - Source Z.
   * @param {number} tx - Target X.
   * @param {number} ty - Target Y.
   * @param {number} tz - Target Z.
   * @returns {{line: THREE.Line, life: number}} Attack line object with frame-based lifetime.
   */
  function createAttackLine(fx, fy, fz, tx, ty, tz) {
    const pts = [new THREE.Vector3(fx, fy, fz), new THREE.Vector3(tx, ty, tz)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, attackLineMat);
    scene.add(line);
    return { line, life: 6 };
  }

  // === PROJECTILE (banana cannon) ===

  /**
   * Create a banana cannon projectile with the given velocity.
   * Projectiles pierce through enemies (tracked via hitEnemies Set) and expire after 120 frames.
   *
   * @param {number} x - Spawn X position.
   * @param {number} y - Spawn Y position.
   * @param {number} z - Spawn Z position.
   * @param {number} vx - X velocity.
   * @param {number} vz - Z velocity.
   * @returns {{mesh: THREE.Mesh, vx: number, vz: number, life: number, hitEnemies: Set}} Projectile object.
   */
  function createProjectile(x, y, z, vx, vz) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffdd00 })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { mesh, vx, vz, life: 120, hitEnemies: new Set() };
  }

  // === PLAYER DAMAGE MULTIPLIER (level scaling) ===

  /**
   * Compute the player's total damage multiplier.
   * Combines level scaling (+12% per level), active powerup dmgBoost, and augment damage mult.
   *
   * @returns {number} Combined damage multiplier.
   */
  function getPlayerDmgMult() {
    let mult = (1 + (st.level - 1) * PLAYER_DMG_SCALE_PER_LEVEL) * st.dmgBoost * st.augmentDmgMult;
    if (st.items.bandana > 0) mult *= (1 + st.items.bandana * 0.05); // Bandana: +5% per stack
    if (st.items.goldenbone) mult *= 1.30; // Golden Bone: +30% all weapon damage
    // Wearable head damage bonus (e.g. Shark Fin: +10%)
    if (st.wearables.head) {
      const headEff = WEARABLES_3D[st.wearables.head].effect;
      if (headEff.dmgMult) mult *= headEff.dmgMult;
    }
    return mult;
  }

  // === SPAWN EXCLUSION ZONE (BD-217) ===

  /**
   * Calculate a valid spawn position that respects the minimum distance from
   * the player. Retries up to 3 times with random angles; returns null if all
   * attempts land inside the exclusion zone (e.g. player right at map edge).
   *
   * @param {number} baseDist - Desired spawn distance from the player.
   * @param {number} playerX  - Current player X position.
   * @param {number} playerZ  - Current player Z position.
   * @returns {{x: number, z: number}|null} Valid position or null to skip.
   */
  function getValidSpawnPos(baseDist, playerX, playerZ) {
    const MIN_SPAWN_DIST = MIN_SPAWN_DISTANCE;
    for (let attempt = 0; attempt < 3; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const sx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, playerX + Math.cos(angle) * baseDist));
      const sz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, playerZ + Math.sin(angle) * baseDist));
      const dx = sx - playerX;
      const dz = sz - playerZ;
      if (dx * dx + dz * dz >= MIN_SPAWN_DIST * MIN_SPAWN_DIST) {
        return { x: sx, z: sz };
      }
    }
    return null; // Skip this zombie
  }

  // === AMBIENT SPAWNING (constant trickle) ===

  /**
   * Spawn a small group of tier-1 zombies around the player.
   * Called every 2 seconds. Count increases with game time (3-8 zombies),
   * and base HP scales with elapsed minutes. Zombies spawn 25-35 units away in a random direction.
   */
  function spawnAmbient() {
    const elapsedMin = st.gameTime / 60;
    const count = Math.min(10, 6 + Math.floor(elapsedMin / 1.5));
    const baseHp = 8 + Math.floor(elapsedMin * 2.5);
    for (let i = 0; i < count; i++) {
      const dist = (elapsedMin < 2) ? (18 + Math.random() * 8) : (25 + Math.random() * 10);
      const pos = getValidSpawnPos(dist, st.playerX, st.playerZ);
      if (!pos) continue; // BD-217: skip if too close to player
      // Progressive tier spawning: after wave 2, chance of higher tier ambient zombies
      let tier = 1;
      if (st.wave >= 2) {
        const roll = Math.random();
        const maxTier = Math.min(st.wave, 5);
        if (roll < 0.03 * st.wave) tier = Math.min(maxTier, 2 + Math.floor(Math.random() * (maxTier - 1)));
      }
      st.enemies.push(createEnemy(pos.x, pos.z, baseHp * tier, tier));
    }
  }

  // === WAVE EVENT SPAWNING (every 3 minutes, big burst) ===

  /**
   * Spawn a large wave event burst of zombies in a ring around the player.
   * Wave events occur every 3 minutes with a 10-second warning countdown.
   * Higher waves spawn more zombies (36 + wave * 16) with scaled HP and
   * a chance for higher-tier zombies. Also spawns a powerup crate and
   * an item pickup with every wave.
   */
  function spawnWaveEvent() {
    const elapsedMin = st.gameTime / 60;
    const baseHp = 8 + Math.floor(elapsedMin * 2.5);
    const waveHp = Math.floor(baseHp * (1 + st.wave * 0.15));
    const count = 45 + st.wave * 20;
    for (let i = 0; i < count; i++) {
      const dist = 20 + Math.random() * 15;
      const pos = getValidSpawnPos(dist, st.playerX, st.playerZ);
      if (!pos) continue; // BD-217: skip if too close to player
      const tier = Math.random() < 0.15 * st.wave ? Math.min(st.wave + 1, 5) : 1;
      st.enemies.push(createEnemy(pos.x, pos.z, waveHp, tier));
    }
    st.wave++;
    // Wave-driven difficulty escalation
    st.zombieDmgMult += 0.15;   // +15% zombie contact damage per wave
    st.enemySpeedMult += 0.03;  // +3% zombie speed per wave

    // Spawn crate with wave
    const crateAngle = Math.random() * Math.PI * 2;
    const cx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(crateAngle) * 15));
    const cz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(crateAngle) * 15));
    st.powerupCrates.push(createPowerupCrate(cx, cz));

    // Spawn item with every wave
    {
      const ia = Math.random() * Math.PI * 2;
      const ix = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(ia) * 12));
      const iz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(ia) * 12));
      const pickup = createItemPickup(ix, iz);
      if (pickup) st.itemPickups.push(pickup);
    }
  }

  // === HOWL MULTIPLIER HELPERS ===

  /** @returns {number} Howl effect strength multiplier (1.0 base, 1.5 with Rainbow Scarf). */
  function getHowlStrength() { return st.items.scarf ? 1.5 : 1.0; }
  /** @returns {number} Damage multiplier from Power Howls (+15% per stack, boosted by Rainbow Scarf). */
  function getHowlDmgMult() { return 1 + st.howls.power * 0.15 * getHowlStrength(); }
  /** @returns {number} Cooldown multiplier from Haste Howls (-15% per stack, floor 0.3, boosted by Rainbow Scarf). Also includes Frenzy Howl attack speed bonus. */
  function getHowlCdMult() { return Math.max(0.3, 1 - st.howls.haste * 0.15 * getHowlStrength()) / (1 + st.howls.frenzy * 0.10 * getHowlStrength()); }
  /** @returns {number} Range multiplier from Range Howls (+20% per stack, boosted by Rainbow Scarf). */
  function getHowlRangeMult() { return 1 + st.howls.range * 0.2 * getHowlStrength(); }
  /** @returns {number} Bonus projectile count from Arcane Howls (+1 per stack, boosted by Rainbow Scarf). */
  function getHowlBonusProj() { return Math.floor(st.howls.arcane * getHowlStrength()); }
  /** @returns {number} XP multiplier from Fortune Howls (+30% per stack, boosted by Rainbow Scarf). */
  function getHowlXpMult() { return 1 + st.howls.fortune * 0.3 * getHowlStrength(); }

  /** Get XP multiplier from wearable head slot (e.g. Party Hat: +5%). */
  function getWearableXpMult() {
    if (st.wearables.head) {
      const headEff = WEARABLES_3D[st.wearables.head].effect;
      if (headEff.xpMult) return headEff.xpMult;
    }
    return 1;
  }

  // === WEAPON FUNCTIONS ===

  /**
   * Calculate the effective damage for a weapon instance.
   * Applies per-weapon-type level scaling, Power Howl bonus, and augment damage multiplier.
   *
   * @param {{typeId: string, level: number}} w - Weapon instance.
   * @returns {number} Final damage value.
   */
  function getWeaponDamage(w) {
    const def = WEAPON_TYPES[w.typeId];
    let dmg = def.baseDamage;
    // Level scaling
    if (w.typeId === 'clawSwipe') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'boneToss') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'poisonCloud') dmg *= 1 + (w.level - 1) * 0.25;
    else if (w.typeId === 'lightningBolt') dmg *= 1 + (w.level - 1) * 0.18;
    else if (w.typeId === 'fireball') dmg *= 1 + (w.level - 1) * 0.22;
    else if (w.typeId === 'boomerang') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'mudBomb') dmg *= 1 + (w.level - 1) * 0.22;
    else if (w.typeId === 'beehiveLauncher') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'snowballTurret') dmg *= 1 + (w.level - 1) * 0.25;
    else if (w.typeId === 'stinkLine') dmg *= 1 + (w.level - 1) * 0.25;
    else if (w.typeId === 'turdMine') dmg *= 1 + (w.level - 1) * 0.22;
    dmg *= getHowlDmgMult() * st.augmentDmgMult;
    if (st.items.bandana > 0) dmg *= (1 + st.items.bandana * 0.05); // Bandana: +5% per stack
    if (st.items.goldenbone) dmg *= 1.30; // Golden Bone: +30% all weapon damage
    return dmg;
  }

  /**
   * Calculate the effective cooldown for a weapon instance.
   * Applies the level 4 cooldown reduction (-18%) and Haste Howl multiplier.
   *
   * @param {{typeId: string, level: number}} w - Weapon instance.
   * @returns {number} Cooldown in seconds.
   */
  function getWeaponCooldown(w) {
    const def = WEAPON_TYPES[w.typeId];
    let cd = def.baseCooldown;
    if (w.level >= 4) cd *= WEAPON_COOLDOWN_REDUCTION_L4;
    cd *= getHowlCdMult();
    if (st.items.alarmClock > 0) cd *= Math.pow(0.92, st.items.alarmClock); // Alarm Clock: -8% per stack
    return cd;
  }

  /**
   * Calculate the effective range for a weapon instance.
   * Claw Swipe gets range bonuses at levels 3 and 5. Range Howl multiplier applies to all.
   *
   * @param {{typeId: string, level: number}} w - Weapon instance.
   * @returns {number} Effective range in world units.
   */
  function getWeaponRange(w) {
    const def = WEAPON_TYPES[w.typeId];
    let r = def.baseRange;
    if (w.typeId === 'clawSwipe' && w.level >= 3) r *= 1.15;
    if (w.typeId === 'clawSwipe' && w.level >= 5) r *= 1.15;
    return r * getHowlRangeMult();
  }

  /**
   * Calculate the number of projectiles for a weapon instance.
   * Bone Toss gains extra at levels 2 (+1) and 5 (+2). Boomerang gains +1 at level 2.
   * Arcane Howl adds bonus projectiles on top.
   *
   * @param {{typeId: string, level: number}} w - Weapon instance.
   * @returns {number} Total projectile count.
   */
  function getProjectileCount(w) {
    let count = 1;
    if (w.typeId === 'boneToss') {
      if (w.level >= 2) count++;
      if (w.level >= 5) count += 2;
    }
    if (w.typeId === 'boomerang' && w.level >= 2) count++;
    count += getHowlBonusProj();
    return count;
  }

  /**
   * Calculate the chain count for Lightning Bolt weapon.
   * Starts at 3 chains (base 2 + level 1 bonus), gains +1 at levels 3 and 5 (+2).
   *
   * @param {{typeId: string, level: number}} w - Weapon instance.
   * @returns {number} Number of chain jumps.
   */
  function getChainCount(w) {
    let chains = 2;
    if (w.level >= 1) chains++;
    if (w.level >= 3) chains++;
    if (w.level >= 5) chains += 2;
    return chains;
  }

  /**
   * Find the nearest alive enemy within a given range of the player.
   *
   * @param {number} range - Maximum search distance in world units.
   * @returns {Enemy|null} The nearest enemy, or null if none in range.
   */
  function findNearestEnemy(range) {
    let nearest = null, nearDistSq = Infinity;
    const rangeSq = range * range;
    for (const e of st.enemies) {
      if (!e.alive) continue;
      if (e.dying) continue;
      const dx = st.playerX - e.group.position.x;
      const dz = st.playerZ - e.group.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < rangeSq && distSq < nearDistSq) {
        nearest = e;
        nearDistSq = distSq;
      }
    }
    return nearest;
  }

  /**
   * Handle enemy death: award score (scaled by tier, wave, difficulty, and totems),
   * spawn XP gems (extra gems for higher tiers), increment kill tracking,
   * roll for loot drops with tier-based rates (BD-95: T1=1%, T2=2%, T3=3%, T4+=5%),
   * and dispose the enemy. Totem-spawned zombies always drop loot (BD-96).
   * Lucky Charm item increases drop chance by 50%.
   *
   * @param {Enemy} e - The enemy that was killed.
   * @see disposeEnemy
   */
  function killEnemy(e) {
    // BD-223: Summoned zombies give no rewards (no score, XP, loot, kill tracking)
    if (e.noReward) {
      playSound((e.tier || 1) >= 5 ? 'sfx_zombie_death_high' : 'sfx_zombie_death_low');
      e.dying = true;
      e.deathTimer = 0.3;
      return;
    }

    // Boss death reward (BD-77)
    if (e.isBoss && e.bossShrine) {
      e.bossShrine.bossDefeated = true;
      // Drop a guaranteed legendary item
      const legendaryItems = ITEMS_3D.filter(it => it.rarity === 'legendary');
      if (legendaryItems.length > 0) {
        const itemId = legendaryItems[Math.floor(Math.random() * legendaryItems.length)].id;
        const pickup = createItemPickup(e.group.position.x, e.group.position.z, itemId);
        if (pickup) st.itemPickups.push(pickup);
      }
      // Remove from active bosses
      const bi = st.activeBosses.indexOf(e);
      if (bi >= 0) st.activeBosses.splice(bi, 1);
      playSound('sfx_explosion');
      // Dim the shrine
      e.bossShrine.group.children.forEach(c => {
        if (c.material && c.material.emissive !== undefined) c.material.emissive.set(0x000000);
        if (c.material) c.material.color.set(0x444444);
      });
      addFloatingText('BOSS DEFEATED!', '#ffcc00', e.group.position.x, e.group.position.y + 3, e.group.position.z, 3, true);
    }

    playSound((e.tier || 1) >= 5 ? 'sfx_zombie_death_high' : 'sfx_zombie_death_low');
    const pts = Math.floor((10 + st.wave * 2) * (e.tier || 1) * st.scoreMult * (st.totemScoreMult || 1));
    st.score += pts;
    // Zombie Magnet: 2x XP gem drops — BD-144: hard cap at 80 gems
    const gemMult = st.items.zombiemagnet ? 2 : 1;
    const gemsToSpawn = gemMult * Math.max(1, (e.tier || 1));
    if (st.xpGems.length > XP_GEM_HARD_CAP) {
      // Over cap: add value to nearest existing gem instead
      let nearest = null, nearDist = Infinity;
      for (const g of st.xpGems) {
        const gd = Math.abs(g.mesh.position.x - e.group.position.x) + Math.abs(g.mesh.position.z - e.group.position.z);
        if (gd < nearDist) { nearDist = gd; nearest = g; }
      }
      if (nearest) {
        nearest.xpValue += gemsToSpawn;
        const targetScale = Math.min(1.0 + nearest.xpValue * 0.05, 1.8);
        nearest.baseScale = targetScale;
        if (nearest.mesh.material === gemMat) nearest.mesh.material = gemMat.clone();
        nearest.mesh.material.emissiveIntensity = Math.min(0.3 + nearest.xpValue * 0.05, 1.0);
      }
    } else {
      for (let m = 0; m < gemMult; m++) {
        st.xpGems.push(createXpGem(e.group.position.x + (m > 0 ? (Math.random() - 0.5) * 0.5 : 0), e.group.position.z + (m > 0 ? (Math.random() - 0.5) * 0.5 : 0)));
        for (let g = 1; g < (e.tier || 1); g++) {
          st.xpGems.push(createXpGem(e.group.position.x + (Math.random() - 0.5), e.group.position.z + (Math.random() - 0.5)));
        }
      }
    }
    st.totalKills++;
    st.killsByTier[(e.tier || 1) - 1]++;
    // Silly Straw: heal 1 HP per 10 kills
    if (st.items.sillyStraw > 0) {
      st.sillyStrawKills++;
      if (st.sillyStrawKills >= 10) {
        st.sillyStrawKills = 0;
        if (st.hp > 0) st.hp = Math.min(st.hp + st.items.sillyStraw, st.maxHp); // heals 1 HP per stack (BD-237/239: guard prevents resurrection)
      }
    }
    // Whoopee Cushion: 20% chance enemies explode on death (AoE)
    // Guard prevents chain reaction: explosion kills → more explosions → infinite recursion (BD-134)
    if (st.items.cushion && Math.random() < 0.20 && !st._inExplosionChain) {
      st._inExplosionChain = true;
      spawnExplosion(e.group.position.x, e.group.position.z, 2.5, 15 * getPlayerDmgMult());
      st._inExplosionChain = false;
      addFloatingText('BOOM!', '#ff88cc', e.group.position.x, e.group.position.y + 2, e.group.position.z, 0.5);
    }
    // Loot drop roll — tier-based rates (BD-95/BD-196): T1=0.5%, T2=2%, T3=4%, T4+=6%
    // Totem-spawned zombies always drop loot (BD-96)
    // Lucky Charm: +50% chance to drop, Lucky Penny: +8% per stack
    const tierNum = e.tier || 1;
    let dropChance = [0.015, 0.03, 0.05, 0.075, 0.075, 0.10, 0.10, 0.15, 0.15, 0.25][tierNum - 1];
    if (st.items.charm) dropChance *= 1.5;
    if (st.items.luckyPenny > 0) dropChance *= (1 + st.items.luckyPenny * 0.08);
    const forceDrop = e.isTotemSpawned && !(e.isBoss && e.bossShrine); // BD-96: totem zombies always drop (bosses already get legendary)
    if (forceDrop || Math.random() < dropChance) {
      const dropX = e.group.position.x;
      const dropZ = e.group.position.z;
      const roll = Math.random();
      // Higher tier zombies bias toward item drops; totem zombies get extra item bias
      const itemChance = e.isTotemSpawned ? 0.40 : (0.01 + tierNum * 0.05); // 6% T1, 11% T2, etc.; 40% for totem spawns
      if (roll < itemChance) {
        // Item drop — rarity biased by tier (BD-95/BD-96) + floating text (BD-99)
        const pickup = e.isTotemSpawned
          ? createItemPickup(dropX, dropZ, null, 'uncommon')
          : createItemPickup(dropX, dropZ, null, tierNum >= 3 ? 'uncommon' : null);
        if (pickup) {
          st.itemPickups.push(pickup);
        }
      } else if (roll < 0.55) {
        // Powerup crate
        st.powerupCrates.push(createPowerupCrate(dropX, dropZ));
      } else if (roll < 0.80) {
        // Health orb — heal 15% max HP
        if (st.hp > 0) st.hp = Math.min(st.hp + st.maxHp * 0.10, st.maxHp); // BD-237/239: guard prevents resurrection
        addFloatingText('+HEALTH', '#44ff44', dropX, terrainHeight(dropX, dropZ) + 2, dropZ, 1.5);
      } else {
        // XP burst — bonus XP gems (BD-144: respect 80-gem cap)
        if (st.xpGems.length > XP_GEM_HARD_CAP) {
          // Over cap: add to nearest
          let nearest = null, nearDist = Infinity;
          for (const g of st.xpGems) {
            const gd = Math.abs(g.mesh.position.x - dropX) + Math.abs(g.mesh.position.z - dropZ);
            if (gd < nearDist) { nearDist = gd; nearest = g; }
          }
          if (nearest) nearest.xpValue += 3;
        } else {
          for (let g = 0; g < 3; g++) {
            st.xpGems.push(createXpGem(dropX + (Math.random() - 0.5) * 2, dropZ + (Math.random() - 0.5) * 2));
          }
        }
        addFloatingText('+XP', '#aa88ff', dropX, terrainHeight(dropX, dropZ) + 2, dropZ, 0.5);
      }
    }
    // Wearable drop roll — tier-scaled (BD-196): T1=2%, T2=4%, ... T10=20%
    // Lucky Charm: +50% chance, Lucky Penny: +8% per stack
    let wearableChance = 0.02 + (tierNum - 1) * 0.02;
    if (st.items.charm) wearableChance *= 1.5;
    if (st.items.luckyPenny > 0) wearableChance *= (1 + st.items.luckyPenny * 0.08);
    if (Math.random() < wearableChance) {
      const wp = createWearablePickup(e.group.position.x, e.group.position.z);
      st.wearablePickups.push(wp);
    }
    e.dying = true;
    e.deathTimer = 0.3;
  }

  /**
   * Apply damage to an enemy. Crit Gloves give 15% chance for 2x damage.
   * Sets a hurt flash timer and kills the enemy if HP drops to zero.
   *
   * @param {Enemy} e - The enemy to damage.
   * @param {number} dmg - Base damage to apply (may be doubled by crit).
   * @param {Object} [opts] - Optional settings.
   * @param {boolean} [opts.skipProcs=false] - If true, skip Gloves crit and Hot Sauce ignite.
   */
  function damageEnemy(e, dmg, opts) {
    if (e.dying) return; // BD-123: dying enemies take no further damage
    if (!opts || !opts.skipProcs) {
      if (st.items.gloves && Math.random() < 0.15) dmg *= 2;
    }
    e.hp -= dmg;
    if (e.hurtFlashCooldown <= 0) {
      e.hurtTimer = 0.15;
      e.hurtFlashCooldown = 1.0; // BD-203: Max one flash per second
    }
    if (!opts || !opts.skipProcs) {
      // Hot Sauce: 15% chance to ignite enemies (DoT: 3 damage/s for 3s)
      if (st.items.hotSauce > 0 && !e.ignited && Math.random() < 0.15) {
        e.ignited = true;
        e.igniteTimer = 3;
        e.igniteDps = 3 * st.items.hotSauce; // scales with stacks
      }
    }
    // BD-220/221: Boss phase progression based on HP thresholds
    if (e.tier >= 9 && e.hp > 0 && e.bossPhase !== undefined) {
      const hpPct = e.hp / e.maxHp;
      if (e.tier === 9) {
        // Titan: 3 phases — P2 at 66%, P3 at 33%
        const newPhase = hpPct <= 0.33 ? 3 : hpPct <= 0.66 ? 2 : 1;
        if (newPhase > e.bossPhase) {
          e.bossPhase = newPhase;
          // Phase transition visual: brief red flash + floating text
          if (e.body) {
            e.body.material.color.setHex(0xff0000);
            if (e.body.material.emissive) e.body.material.emissive.setHex(0xff0000);
            e._attackFlashTimer = 0.4;
          }
          addFloatingText('PHASE ' + newPhase + '!', '#ff4400', e.group.position.x, e.group.position.y + 4, e.group.position.z, 2.0, true);
          triggerScreenShake(0.3, 0.4); // BD-225: Phase transition screen shake (was 0.2, 0.3)
          // BD-225: Pause attack timer to prevent immediate attack during transition
          if (e.specialAttackTimer !== undefined) e.specialAttackTimer += 0.5;
        }
      } else if (e.tier >= 10) {
        // Overlord: 4 phases — P2 at 75%, P3 at 50%, P4 at 25%
        const newPhase = hpPct <= 0.25 ? 4 : hpPct <= 0.50 ? 3 : hpPct <= 0.75 ? 2 : 1;
        if (newPhase > e.bossPhase) {
          e.bossPhase = newPhase;
          if (e.body) {
            e.body.material.color.setHex(0xff0000);
            if (e.body.material.emissive) e.body.material.emissive.setHex(0xff0000);
            e._attackFlashTimer = 0.4;
          }
          addFloatingText('PHASE ' + newPhase + '!', '#ff0044', e.group.position.x, e.group.position.y + 4, e.group.position.z, 2.0, true);
          triggerScreenShake(0.3, 0.4);
          // BD-225: Pause attack timer to prevent immediate attack during transition
          if (e.specialAttackTimer !== undefined) e.specialAttackTimer += 0.5;
        }
      }
    }
    if (e.hp <= 0 && e.alive) killEnemy(e);
  }

  /**
   * Apply damage to the player with all defensive checks.
   * Handles: invincibility, dodge (Turbo Sneakers), Shield Bracelet,
   * armor reduction, augment armor, and Berserker Rage vulnerability.
   * Returns the final damage dealt (for thorns/reflect calculations).
   *
   * @param {number} baseDmg - Raw incoming damage before reductions.
   * @param {string} [color] - CSS color string for floating damage text.
   * @param {{type: string, tierName: string, tier?: number, color?: number}} [source] - BD-216: damage source info for "DEFEATED BY" display.
   * @returns {number} The final damage dealt after all reductions (0 if dodged/blocked/invincible).
   */
  function damagePlayer(baseDmg, color, source) {
    if (st.invincible > 0 || st.ghostForm) return 0;
    // Turbo Sneakers: dodge chance
    if (st.dodgeChance > 0 && Math.random() < st.dodgeChance) {
      addFloatingText('DODGE!', '#00ffaa', st.playerX, st.playerY + 2, st.playerZ, 0.5);
      st.invincible = INVINCIBILITY_DURATION; // BD-192: match damage iframes
      return 0;
    }
    let dmg = baseDmg;
    // Armor reduction
    if (st.items.armor === 'leather') dmg *= 0.75;
    else if (st.items.armor === 'chainmail') dmg *= 0.6;
    // Augment armor reduction
    dmg *= (1 - st.augmentArmor);
    // Wearable body damage reduction (e.g. Cardboard Box: -10%, Bumble Armor: -20%)
    if (st.wearables.body) {
      const bodyEff = WEARABLES_3D[st.wearables.body].effect;
      if (bodyEff.dmgReduction) dmg *= (1 - bodyEff.dmgReduction);
    }
    // Berserker Rage: +25% damage taken
    if (st.berserkVulnerable) dmg *= 1.25;
    // Shield Bracelet: absorb one hit every 30s
    if (st.items.bracelet && st.shieldBraceletReady) {
      dmg = 0;
      st.shieldBraceletReady = false;
      st.shieldBraceletTimer = SHIELD_BRACELET_COOLDOWN;
      addFloatingText('BLOCKED!', '#4488ff', st.playerX, st.playerY + 2, st.playerZ, 0.5);
    }
    // BD-212: Allow 0 damage (Shield Bracelet block, full armor mitigation) — was Math.max(1, dmg) which made player unkillable
    dmg = Math.max(0, Math.round(dmg));
    // BD-216: Track last damage source for "DEFEATED BY" display
    st.lastDamageSource = source || { type: 'unknown', tierName: 'Unknown', color: 0xff4444 };
    if (dmg > 0) {
      st.hp -= dmg;
      if (st.hp < 0) st.hp = 0;
      st.invincible = INVINCIBILITY_DURATION; // BD-192: 0.5s iframes (was 0.2 — too short for swarm game)
      // BD-208: Only trigger flash if cooldown has expired (max once per second)
      if (st.playerHurtFlashCooldown <= 0) {
        st.playerHurtFlash = 0.5;
        st.playerHurtFlashCooldown = 1.0;
      }
      addFloatingText('-' + dmg, color || '#ff2200', st.playerX, st.playerY + 2, st.playerZ, 0.5);
    }
    return dmg;
  }

  /**
   * Fire a weapon, creating appropriate visuals and dealing damage.
   * Each weapon type has a unique attack pattern:
   *
   * - **clawSwipe**: 3 arc slash lines fanning from player; hits all enemies in range (melee AoE).
   * - **boneToss**: Spinning T-shaped bone projectiles aimed at nearest enemy; spread for multi-shot.
   * - **poisonCloud**: Swirling green particle cloud placed at enemy position; deals DoT over duration.
   * - **lightningBolt**: Zigzag bolt segments with glow impacts; chains to nearby unhit enemies.
   * - **fireball**: Glowing core + outer glow with flame trail; explodes on impact or timeout.
   * - **boomerang**: Cross-shaped disc that arcs outward along a sine path and returns; pierces enemies.
   * - **turdMine**: Stationary brown mine dropped at player position; detonates on proximity, AoE damage + slow.
   *
   * @param {{typeId: string, level: number, cooldownTimer: number}} w - The weapon instance to fire.
   * @see getWeaponDamage
   * @see getWeaponRange
   * @see findNearestEnemy
   */
  function fireWeapon(w) {
    const def = WEAPON_TYPES[w.typeId];
    const range = getWeaponRange(w);
    const dmg = getWeaponDamage(w);

    // Play weapon-specific sound
    if (w.typeId === 'poisonCloud' || w.typeId === 'stinkLine') playSound('sfx_weapon_poison');
    else if (w.typeId === 'fireball') playSound('sfx_weapon_heavy');
    else if (w.typeId === 'lightningBolt') playSound('sfx_weapon_heavy');
    else if (w.typeId === 'boomerang') playSound('sfx_weapon_boomerang');
    else if (w.typeId === 'boneToss') playSound(w.level >= 3 ? 'sfx_weapon_multishot' : 'sfx_weapon_projectile');
    else if (w.typeId === 'clawSwipe') playSound('sfx_melee_hit');
    else if (w.typeId === 'turdMine') playSound('sfx_comedic_drop');
    else playSound('sfx_weapon_projectile');

    if (w.typeId === 'clawSwipe') {
      // CLAW SWIPE: Melee AoE — creates 3 arc slash visuals fanning from player facing direction,
      // then damages ALL enemies within range (no targeting needed).
      const facing = playerGroup.rotation.y;
      const slashGroup = new THREE.Group();
      for (let s = -1; s <= 1; s++) {
        const a = facing + s * 0.4;
        const len = range;
        const slashMat = new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.7 });
        const slashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, len), slashMat);
        slashMesh.position.set(
          st.playerX + Math.sin(a) * len * 0.5,
          st.playerY + 0.8,
          st.playerZ + Math.cos(a) * len * 0.5
        );
        slashMesh.rotation.y = a;
        scene.add(slashMesh);
        st.weaponEffects.push({ mesh: slashMesh, life: 0.2, type: 'slash' });
      }
      // Hit all enemies in range
      const rangeSqCS = range * range;
      for (const e of st.enemies) {
        if (!e.alive || e.dying) continue;
        const dx = e.group.position.x - st.playerX;
        const dz = e.group.position.z - st.playerZ;
        if (dx * dx + dz * dz < rangeSqCS) damageEnemy(e, dmg);
      }
    } else if (w.typeId === 'boneToss') {
      // BONE TOSS: Ranged projectile — creates T-shaped spinning bone(s) aimed at nearest enemy.
      // Multiple projectiles spread laterally. Each bone travels in a straight line.
      const count = getProjectileCount(w);
      for (let i = 0; i < count; i++) {
        const target = findNearestEnemy(range);
        if (!target) break;
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        const spread = (i - (count - 1) / 2) * 0.3;
        const vx = (dx / d) * 12 + spread * (-dz / d);
        const vz = (dz / d) * 12 + spread * (dx / d);
        const boneGroup = new THREE.Group();
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xeeddcc });
        boneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), boneMat));  // shaft
        boneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), boneMat)); // cross top
        const crossBot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), boneMat);
        crossBot.position.z = -0.16;
        boneGroup.add(crossBot);
        boneGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(boneGroup);
        st.weaponProjectiles.push({ mesh: boneGroup, vx, vz, dmg, life: 2, pierce: false, type: 'bone', ricochetsLeft: st.items.bouncyBall });
      }
    } else if (w.typeId === 'poisonCloud') {
      // POISON CLOUD: AoE DoT — places a swirling green particle cloud at the target enemy's position.
      // Cloud persists for its duration, dealing damage-per-second to all enemies within its radius.
      const target = findNearestEnemy(range);
      if (target) {
        const cx = target.group.position.x;
        const cz = target.group.position.z;
        const cloudSize = 2 * (1 + (w.level >= 2 ? 0.25 : 0));
        const cloudDuration = 3 * (1 + (w.level >= 3 ? 0.3 : 0));
        const cloudGroup = new THREE.Group();
        const ch = terrainHeight(cx, cz);
        // Multiple smaller particles instead of one big box
        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const pr = cloudSize * 0.3 * Math.random();
          const particleMat = new THREE.MeshBasicMaterial({
            color: p % 2 === 0 ? 0x44cc44 : 0x22aa22,
            transparent: true, opacity: 0.4
          });
          const particle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), particleMat);
          particle.position.set(Math.cos(pa) * pr, 0.2 + Math.random() * 0.4, Math.sin(pa) * pr);
          cloudGroup.add(particle);
        }
        cloudGroup.position.set(cx, ch, cz);
        scene.add(cloudGroup);
        st.weaponEffects.push({ mesh: cloudGroup, x: cx, z: cz, radius: cloudSize / 2, dmgPerSec: dmg, life: cloudDuration, type: 'cloud' });
      }
    } else if (w.typeId === 'lightningBolt') {
      // LIGHTNING BOLT: Chain lightning — creates zigzag bolt segments from player to nearest enemy,
      // then chains to additional nearby enemies (within 5 units). Each chain does 70% of primary damage.
      // Glow impacts appear at each hit point.
      const chains = getChainCount(w);
      const target = findNearestEnemy(range);
      if (target) {
        const hit = new Set();
        let current = target;
        let prevX = st.playerX, prevZ = st.playerZ;
        for (let c = 0; c < chains && current; c++) {
          damageEnemy(current, dmg * (c === 0 ? 1 : 0.7));
          // Zigzag bolt: multiple small segments
          const ex = current.group.position.x, ez = current.group.position.z;
          const ey = current.group.position.y + 0.8;
          const boltDx = ex - prevX, boltDz = ez - prevZ;
          const boltDist = Math.sqrt(boltDx * boltDx + boltDz * boltDz) || 1;
          const segments = Math.max(3, Math.floor(boltDist * 2));
          for (let s = 0; s < segments; s++) {
            const t1 = s / segments, t2 = (s + 1) / segments;
            const jitter = 0.3;
            const x1 = prevX + boltDx * t1 + (Math.random() - 0.5) * jitter;
            const z1 = prevZ + boltDz * t1 + (Math.random() - 0.5) * jitter;
            const x2 = prevX + boltDx * t2 + (Math.random() - 0.5) * jitter;
            const z2 = prevZ + boltDz * t2 + (Math.random() - 0.5) * jitter;
            const segLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2) || 0.1;
            // Reuse shared bolt geometry + material; scale Z for segment length
            const boltSeg = new THREE.Mesh(boltSegGeo, boltSegMat);
            boltSeg.position.set((x1 + x2) / 2, st.playerY + 1 + (Math.random() - 0.5) * 0.3, (z1 + z2) / 2);
            boltSeg.rotation.y = Math.atan2(x2 - x1, z2 - z1);
            boltSeg.scale.z = segLen;
            scene.add(boltSeg);
            st.weaponEffects.push({ mesh: boltSeg, life: 0.15, type: 'bolt', shared: true });
          }
          // Glow at impact point (shared geometry + material)
          const glow = new THREE.Mesh(boltGlowGeo, boltGlowMat);
          glow.position.set(ex, ey, ez);
          scene.add(glow);
          st.weaponEffects.push({ mesh: glow, life: 0.2, type: 'bolt', shared: true });

          hit.add(current);
          prevX = ex; prevZ = ez;
          let nextNearest = null, nextDistSq = Infinity;
          for (const e of st.enemies) {
            if (!e.alive || e.dying || hit.has(e)) continue;
            const dx2 = prevX - e.group.position.x;
            const dz2 = prevZ - e.group.position.z;
            const d2Sq = dx2 * dx2 + dz2 * dz2;
            if (d2Sq < LIGHTNING_CHAIN_RANGE_SQ && d2Sq < nextDistSq) { nextNearest = e; nextDistSq = d2Sq; }
          }
          current = nextNearest;
        }
      }
    } else if (w.typeId === 'fireball') {
      // FIREBALL: Projectile + AoE explosion — launches a glowing core with outer glow and flame trail.
      // On hit or timeout, triggers spawnExplosion() dealing AoE damage within explosionRadius.
      // Level 2 increases explosion radius by 30%; level 5 increases explosion damage by 50%.
      const count = Math.max(1, getHowlBonusProj());
      for (let i = 0; i < count; i++) {
        const target = findNearestEnemy(range);
        if (!target) break;
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        // Multi-part fireball: core + outer glow
        const fbGroup = new THREE.Group();
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), coreMat);
        fbGroup.add(core);
        const outerMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.5 });
        const outer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), outerMat);
        fbGroup.add(outer);
        // Flame trail particles (smaller cubes behind)
        for (let t = 1; t <= 3; t++) {
          const trailMat = new THREE.MeshBasicMaterial({ color: t === 1 ? 0xff6600 : 0xff2200, transparent: true, opacity: 0.4 / t });
          const trail = new THREE.Mesh(new THREE.BoxGeometry(0.15 / t, 0.15 / t, 0.15 / t), trailMat);
          trail.position.z = -t * 0.15;
          fbGroup.add(trail);
        }
        fbGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(fbGroup);
        const explosionR = 2.5 * (1 + (w.level >= 2 ? 0.3 : 0));
        st.weaponProjectiles.push({
          mesh: fbGroup, vx: (dx / d) * 10, vz: (dz / d) * 10, dmg,
          life: 2, pierce: false, type: 'fireball',
          explosionRadius: explosionR, explosionDmg: dmg * (w.level >= 5 ? 1.5 : 1),
          ricochetsLeft: st.items.bouncyBall
        });
      }
    } else if (w.typeId === 'boomerang') {
      // BOOMERANG: Piercing returning projectile — creates a spinning cross shape that arcs outward
      // along a sine-based path and returns. Pierces through all enemies it contacts.
      // Level 3 increases flight speed by 25%; level 5 doubles damage.
      const count = getProjectileCount(w);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + playerGroup.rotation.y;
        const boomGroup = new THREE.Group();
        const boomMat = new THREE.MeshLambertMaterial({ color: 0xaa44ff });
        // Cross shape for boomerang
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), boomMat));
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.5), boomMat));
        // Glowing center
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.6 });
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), centerMat));
        boomGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(boomGroup);
        const speed = 8 * (1 + (w.level >= 3 ? 0.25 : 0));
        st.weaponProjectiles.push({
          mesh: boomGroup, angle, speed, dmg: dmg * (w.level >= 5 ? 2 : 1), life: 2.5, pierce: true, type: 'boomerang',
          startX: st.playerX, startZ: st.playerZ, elapsed: 0,
        });
      }
    } else if (w.typeId === 'mudBomb') {
      // MUD BOMB: Arcing projectile that explodes on impact and leaves a slow zone.
      // Similar to fireball but with Y-velocity arc and ground slow patch.
      const target = findNearestEnemy(range);
      if (target) {
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        const mbGroup = new THREE.Group();
        const mudMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
        mbGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mudMat));
        const splatMat = new THREE.MeshBasicMaterial({ color: 0x6B4914, transparent: true, opacity: 0.5 });
        mbGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), splatMat));
        mbGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(mbGroup);
        const slowRadius = 2.5 * (1 + (w.level >= 2 ? 0.3 : 0)) * (w.level >= 5 ? 1.5 : 1);
        const slowDuration = 3 * (w.level >= 5 ? 1.5 : 1);
        const speed = 8;
        const arcVY = d * 0.4 + 3;
        st.weaponProjectiles.push({
          mesh: mbGroup, vx: (dx / d) * speed, vz: (dz / d) * speed, vy: arcVY,
          dmg, life: 3, pierce: false, type: 'mudBomb',
          slowRadius, slowDuration
        });
      }
    } else if (w.typeId === 'beehiveLauncher') {
      // BEEHIVE LAUNCHER: Fires a beehive projectile toward nearest enemy.
      // On reaching target, spawns independent bee summons that chase enemies.
      const target = findNearestEnemy(range);
      if (target) {
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        const hiveGroup = new THREE.Group();
        const hiveMat = new THREE.MeshLambertMaterial({ color: 0xDAA520 });
        hiveGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), hiveMat));
        const stripeMat = new THREE.MeshLambertMaterial({ color: 0x8B6508 });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.38), stripeMat);
        stripe.position.y = 0.05;
        hiveGroup.add(stripe);
        hiveGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(hiveGroup);
        let beeCount = 3;
        if (w.level >= 1) beeCount += 0; // base 3
        if (w.level >= 2) beeCount += 1;
        if (w.level >= 4) beeCount += 2;
        const beeDuration = 4 * (1 + (w.level >= 3 ? 0.3 : 0));
        st.weaponProjectiles.push({
          mesh: hiveGroup, vx: (dx / d) * 10, vz: (dz / d) * 10,
          dmg, life: 2, pierce: false, type: 'beehive',
          beeCount, beeDuration, weaponLevel: w.level
        });
      }
    } else if (w.typeId === 'snowballTurret') {
      // SNOWBALL TURRET: Spawns an orbiting turret around the player.
      // Count existing active turrets to check if we need a new one.
      let activeTurrets = 0;
      for (const eff of st.weaponEffects) {
        if (eff.type === 'snowballTurret') activeTurrets++;
      }
      let maxTurrets = 1;
      if (w.level >= 2) maxTurrets++;
      if (w.level >= 5) maxTurrets++;
      if (activeTurrets < maxTurrets) {
        const turretGroup = new THREE.Group();
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x88ccff });
        turretGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), bodyMat));
        const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.25), topMat);
        top.position.y = 0.3;
        turretGroup.add(top);
        turretGroup.position.set(st.playerX + 3, st.playerY + 0.8, st.playerZ);
        scene.add(turretGroup);
        const fireRate = 1.2 * (1 / (1 + (w.level >= 3 ? 0.25 : 0)));
        const freezeChance = w.level >= 5 ? 0.2 : 0;
        st.weaponEffects.push({
          mesh: turretGroup, life: 15, type: 'snowballTurret',
          orbitAngle: Math.random() * Math.PI * 2, orbitSpeed: 1.5,
          fireTimer: 0, fireRate, dmg, weaponRange: range,
          freezeChance, weaponLevel: w.level
        });
      }
    } else if (w.typeId === 'stinkLine') {
      // STINK LINE: Leaves a damaging trail segment at the player's previous position.
      const trailSize = 0.5 * (1 + (w.level >= 4 ? 0.5 : 0));
      const trailDuration = 3 * (1 + (w.level >= 2 ? 0.25 : 0));
      const trailX = st._prevX || st.playerX;
      const trailZ = st._prevZ || st.playerZ;
      const gh = getGroundAt(trailX, trailZ);
      const trailMesh = new THREE.Mesh(
        new THREE.BoxGeometry(trailSize, 0.3, trailSize),
        new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.4 })
      );
      trailMesh.position.set(trailX, gh + 0.15, trailZ);
      scene.add(trailMesh);
      const poisonDoT = w.level >= 5;
      st.weaponEffects.push({
        mesh: trailMesh, x: trailX, z: trailZ, radius: trailSize * 0.5,
        dmgPerSec: dmg, life: trailDuration, type: 'stinkTrail',
        dmgTickTimer: 0, poisonDoT
      });
    } else if (w.typeId === 'turdMine') {
      // TURD MINE: Drops a stationary mine at the player's current position.
      // Mine sits on the ground and detonates when an enemy walks within range,
      // dealing AoE damage and applying a slow debuff to all enemies caught in the blast.
      const mineRange = range * (1 + (w.level >= 2 ? 0.3 : 0));
      const slowDuration = 3 * (1 + (w.level >= 5 ? 0.5 : 0));
      const gh = getGroundAt(st.playerX, st.playerZ);
      const mineGroup = new THREE.Group();
      // Main body — brown lump
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      mineGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), bodyMat));
      // Darker top detail
      const topMat = new THREE.MeshLambertMaterial({ color: 0x5C2E0A });
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), topMat);
      topMesh.position.y = 0.2;
      mineGroup.add(topMesh);
      // Stink indicator — small green wisp
      const stinkMat = new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.35 });
      const stinkMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.15), stinkMat);
      stinkMesh.position.y = 0.4;
      mineGroup.add(stinkMesh);
      mineGroup.position.set(st.playerX, gh + 0.15, st.playerZ);
      mineGroup.castShadow = true;
      scene.add(mineGroup);
      st.weaponProjectiles.push({
        mesh: mineGroup,
        x: st.playerX, z: st.playerZ,
        vx: 0, vz: 0,
        damage: dmg,
        mineRange: mineRange,
        life: 15, // mine lasts 15 seconds
        type: 'turdMine',
        slowDuration: slowDuration,
      });
    }
  }

  /**
   * Update all weapon cooldown timers and auto-fire weapons when targets are in range.
   * If no target is available, retries after 0.1 seconds instead of full cooldown.
   *
   * @param {number} dt - Delta time in seconds.
   */
  function updateWeapons(dt) {
    for (const w of st.weapons) {
      w.cooldownTimer = Math.max(0, w.cooldownTimer - dt);
      if (w.cooldownTimer <= 0) {
        if (w.typeId === 'stinkLine') {
          // Stink Line fires based on player movement, not targets
          const dx = st.playerX - (st._prevX || st.playerX);
          const dz = st.playerZ - (st._prevZ || st.playerZ);
          if (dx * dx + dz * dz > 0.01) {
            fireWeapon(w);
            w.cooldownTimer = getWeaponCooldown(w);
            st.attackAnimTimer = 0.15; st.attackAnimDuration = 0.15;
          }
        } else if (w.typeId === 'snowballTurret') {
          // Snowball Turret spawns orbiting turrets, doesn't need direct target
          fireWeapon(w);
          w.cooldownTimer = getWeaponCooldown(w);
          st.attackAnimTimer = 0.15; st.attackAnimDuration = 0.15;
        } else if (w.typeId === 'turdMine') {
          // Turd Mine drops at player position, no target needed
          fireWeapon(w);
          w.cooldownTimer = getWeaponCooldown(w);
          st.attackAnimTimer = 0.15; st.attackAnimDuration = 0.15;
        } else {
          const hasTarget = findNearestEnemy(getWeaponRange(w));
          if (hasTarget) {
            fireWeapon(w);
            w.cooldownTimer = getWeaponCooldown(w);
            st.attackAnimTimer = 0.15; st.attackAnimDuration = 0.15;
          } else {
            w.cooldownTimer = 0.1; // retry soon
          }
        }
      }
    }
    // Track previous player position for stink line
    st._prevX = st.playerX;
    st._prevZ = st.playerZ;
  }

  /**
   * Update weapon projectile positions, handle boomerang arc movement,
   * check enemy collisions, and trigger fireball explosions on hit or timeout.
   * Non-piercing projectiles are removed on first hit; piercing ones continue.
   *
   * @param {number} dt - Delta time in seconds.
   * @see spawnExplosion
   */
  function updateWeaponProjectiles(dt) {
    for (let i = st.weaponProjectiles.length - 1; i >= 0; i--) {
      const p = st.weaponProjectiles[i];
      p.life -= dt;

      // BD-220: Bone Barrage projectile — parabolic arc with gravity, damages on landing
      if (p.type === 'boneBarrage' && p.isEnemyProjectile) {
        p._elapsed = (p._elapsed || 0) + dt;
        // Apply gravity to vertical velocity
        p.vy -= GRAVITY_3D * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        // Spin the bone as it flies
        if (p.mesh.rotation) {
          p.mesh.rotation.x += dt * 6;
          p.mesh.rotation.z += dt * 4;
        }
        p.mesh.position.set(p.x, p.y, p.z);

        // Check if bone has landed (below ground level or elapsed flight time)
        const groundY = getGroundAt(p.x, p.z) + 0.1;
        if (!p._landed && (p.y <= groundY || p._elapsed >= p._flightTime)) {
          p._landed = true;
          // Snap to ground
          p.y = groundY;
          p.mesh.position.y = groundY;

          // Damage check: player within 2-unit radius of landing position
          const ldx = st.playerX - p._landX;
          const ldz = st.playerZ - p._landZ;
          if (ldx * ldx + ldz * ldz < p.range * p.range) {
            damagePlayer(p.damage, '#ccbb88', { type: 'boneBarrage', tierName: ZOMBIE_TIERS[8].name, tier: 9, color: ZOMBIE_TIERS[8].eye });
          }

          // Screen shake per impact
          triggerScreenShake(0.15, 0.15);
          playSound('sfx_boss_slam_impact');

          // Cream-colored impact particles
          for (let pi = 0; pi < 6; pi++) {
            const pa = (pi / 6) * Math.PI * 2;
            spawnFireParticle(
              0xeeddcc,
              p._landX + Math.cos(pa) * 0.8,
              groundY + 0.3,
              p._landZ + Math.sin(pa) * 0.8,
              0.4
            );
          }

          // Dispose mesh immediately after landing
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          continue;
        }

        // Safety: expire if life runs out
        if (p.life <= 0) {
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
        }
        continue;
      }

      // BD-84: Death Bolt enemy projectile — moves in a straight line, damages player on proximity
      // BD-84/BD-166: Enemy projectile — moves in a straight line, damages player on proximity
      if ((p.type === 'deathBolt' || p.type === 'boneSpit') && p.isEnemyProjectile) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.mesh.position.set(p.x, p.y, p.z);

        // Check hit on player
        const dbdx = st.playerX - p.x;
        const dbdz = st.playerZ - p.z;
        if (dbdx * dbdx + dbdz * dbdz < p.range * p.range) {
          const _srcTier = p.type === 'deathBolt' ? 10 : 4;
          const _srcTd = ZOMBIE_TIERS[_srcTier - 1];
          damagePlayer(p.damage, '#ff0044', { type: p.type, tierName: _srcTd.name, tier: _srcTier, color: _srcTd.eye,
            killerX: p.originX !== undefined ? p.originX : p.x, killerZ: p.originZ !== undefined ? p.originZ : p.z, enemyRef: p.sourceEnemy || null }); // BD-235
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          playSound('sfx_explosion');
          continue;
        }

        // Expire if lifetime is up
        if (p.life <= 0) {
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
        }
        continue; // Skip normal projectile logic (enemy projectiles don't hit enemies)
      }

      // BD-145: Bone Spit enemy projectile (tier 4 Brute) — slow spinning bone
      if (p.type === 'boneSpit' && p.isEnemyProjectile) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y += dt * 8; // spin
        p.mesh.rotation.x += dt * 4;
        // Check hit on player
        const bsdx = st.playerX - p.x;
        const bsdz = st.playerZ - p.z;
        if (bsdx * bsdx + bsdz * bsdz < p.range * p.range) {
          damagePlayer(p.damage, '#ccbb88', { type: 'boneSpit', tierName: ZOMBIE_TIERS[3].name, tier: 4, color: ZOMBIE_TIERS[3].eye,
            killerX: p.originX !== undefined ? p.originX : p.x, killerZ: p.originZ !== undefined ? p.originZ : p.z, enemyRef: p.sourceEnemy || null }); // BD-235
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          playSound('sfx_melee_hit');
          continue;
        }
        if (p.life <= 0) {
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
        }
        continue;
      }

      if (p.type === 'turdMine') {
        // TURD MINE: Stationary mine — check if any enemy walks within detonation range.
        // On detonation: deal AoE damage, apply slow debuff, show explosion effect.
        // Animate stink wisp bobbing
        if (p.mesh.children[2]) {
          p.mesh.children[2].position.y = 0.4 + Math.sin(performance.now() * 0.003) * 0.1;
        }
        if (p.life <= 0) {
          // Mine expired without detonating
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          continue;
        }
        // Check enemy proximity for detonation
        let detonated = false;
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = e.group.position.x - p.x;
          const dz = e.group.position.z - p.z;
          if (dx * dx + dz * dz < p.mineRange * p.mineRange) {
            detonated = true;
            break;
          }
        }
        if (detonated) {
          // Explode: damage + slow all enemies in range
          const rangeSq = p.mineRange * p.mineRange;
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = e.group.position.x - p.x;
            const dz = e.group.position.z - p.z;
            if (dx * dx + dz * dz < rangeSq) {
              damageEnemy(e, p.damage);
              // Apply turd mine slow debuff
              e._origSpeed = e._origSpeed || e.speed;
              e._turdSlowed = true;
              e._turdSlowTimer = p.slowDuration;
              e.speed = e._origSpeed * 0.5;
            }
          }
          // Explosion visual — brown/green burst
          const explH = getGroundAt(p.x, p.z);
          const explMesh = new THREE.Mesh(
            new THREE.BoxGeometry(p.mineRange * 2, 0.5, p.mineRange * 2),
            new THREE.MeshBasicMaterial({ color: 0x8B6914, transparent: true, opacity: 0.5 })
          );
          explMesh.position.set(p.x, explH + 0.3, p.z);
          scene.add(explMesh);
          st.weaponEffects.push({ mesh: explMesh, life: 0.4, type: 'explosion' });
          // Remove mine mesh
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          playSound('sfx_explosion');
        }
        continue; // skip normal projectile movement
      } else if (p.type === 'boomerang') {
        p.elapsed += dt;
        // Boomerang follows an arc path
        const t = p.elapsed / 1.2;
        const outDist = p.speed * Math.sin(Math.min(t, 1) * Math.PI);
        p.mesh.position.x = p.startX + Math.sin(p.angle + t * 4) * outDist;
        p.mesh.position.z = p.startZ + Math.cos(p.angle + t * 4) * outDist;
        p.mesh.rotation.y += dt * 15;
      } else if (p.type === 'mudBomb') {
        // Mud bomb arcs through the air with gravity
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= GRAVITY_3D * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.y += dt * 6;
        p.mesh.rotation.x += dt * 4;
        // Check if hit the ground
        const groundH = getGroundAt(p.mesh.position.x, p.mesh.position.z);
        if (p.mesh.position.y <= groundH + 0.2) {
          spawnMudSlowZone(p.mesh.position.x, p.mesh.position.z, p.slowRadius, p.slowDuration, p.dmg);
          disposeSceneObject(p.mesh);
          st.weaponProjectiles.splice(i, 1);
          continue;
        }
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.y += dt * 8;
      }

      if (p.life <= 0) {
        // Fireball explosion on timeout
        if (p.type === 'fireball' && p.explosionRadius) {
          spawnExplosion(p.mesh.position.x, p.mesh.position.z, p.explosionRadius, p.explosionDmg);
        }
        // Mud bomb explodes on timeout too
        if (p.type === 'mudBomb') {
          spawnMudSlowZone(p.mesh.position.x, p.mesh.position.z, p.slowRadius, p.slowDuration, p.dmg);
        }
        // Beehive spawns bees on timeout
        if (p.type === 'beehive') {
          spawnBees(p.mesh.position.x, p.mesh.position.z, p.beeCount, p.beeDuration, p.dmg, p.weaponLevel);
        }
        disposeSceneObject(p.mesh);
        st.weaponProjectiles.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (const e of st.enemies) {
        if (!e.alive || e.dying) continue;
        const dx = p.mesh.position.x - e.group.position.x;
        const dz = p.mesh.position.z - e.group.position.z;
        if (dx * dx + dz * dz < 1.2) {
          damageEnemy(e, p.dmg);
          // Snowball slow/freeze on hit
          if (p.type === 'snowball') {
            if (!e._snowSlowed) {
              e._origSpeed = e._origSpeed || e.speed;
              e._snowSlowed = true;
              e.speed = e._origSpeed * 0.7;
            }
            e._snowSlowTimer = 2;
            // Freeze chance (level 5)
            if (p.freezeChance && Math.random() < p.freezeChance) {
              e._snowFrozen = true;
              e._snowFreezeTimer = 1;
            }
          }
          if (!p.pierce) {
            // Bouncy Ball ricochet: redirect projectile to nearest other enemy
            const ricochets = p.ricochetsLeft || 0;
            if (ricochets > 0) {
              p.ricochetsLeft--;
              // Find nearest alive enemy that isn't the one we just hit
              let ricoTarget = null, ricoDistSq = Infinity;
              for (const re of st.enemies) {
                if (!re.alive || re.dying || re === e) continue;
                const rdx = p.mesh.position.x - re.group.position.x;
                const rdz = p.mesh.position.z - re.group.position.z;
                const rDistSq = rdx * rdx + rdz * rdz;
                if (rDistSq < 100 && rDistSq < ricoDistSq) { // within 10 units
                  ricoTarget = re;
                  ricoDistSq = rDistSq;
                }
              }
              if (ricoTarget) {
                const rdist = Math.sqrt(ricoDistSq) || 1;
                const speed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
                p.vx = ((ricoTarget.group.position.x - p.mesh.position.x) / rdist) * speed;
                p.vz = ((ricoTarget.group.position.z - p.mesh.position.z) / rdist) * speed;
                p.life = Math.max(p.life, 0.5); // ensure it lives long enough to reach
                break; // don't remove projectile, let it continue
              }
            }
            // Fireball explosion on hit
            if (p.type === 'fireball' && p.explosionRadius) {
              spawnExplosion(p.mesh.position.x, p.mesh.position.z, p.explosionRadius, p.explosionDmg);
            }
            // Mud bomb creates slow zone on hit
            if (p.type === 'mudBomb') {
              spawnMudSlowZone(p.mesh.position.x, p.mesh.position.z, p.slowRadius, p.slowDuration, p.dmg);
            }
            // Beehive spawns bees on hit
            if (p.type === 'beehive') {
              spawnBees(p.mesh.position.x, p.mesh.position.z, p.beeCount, p.beeDuration, p.dmg, p.weaponLevel);
            }
            disposeSceneObject(p.mesh);
            st.weaponProjectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /**
   * Create a fireball explosion at the given position.
   * Renders a flat orange box that fades out over 0.3 seconds and damages all enemies in radius.
   *
   * @param {number} x - Explosion center X.
   * @param {number} z - Explosion center Z.
   * @param {number} radius - Explosion radius in world units.
   * @param {number} dmg - Damage dealt to enemies within radius.
   */
  function spawnExplosion(x, z, radius, dmg) {
    const h = terrainHeight(x, z);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2, 0.5, radius * 2),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 })
    );
    mesh.position.set(x, h + 0.3, z);
    scene.add(mesh);
    st.weaponEffects.push({ mesh, x, z, radius, life: 0.3, type: 'explosion' });

    // Damage all enemies in radius
    for (const e of st.enemies) {
      if (!e.alive || e.dying) continue;
      const dx = x - e.group.position.x;
      const dz = z - e.group.position.z;
      if (dx * dx + dz * dz < radius * radius) {
        damageEnemy(e, dmg);
      }
    }
  }

  function spawnMudSlowZone(x, z, radius, duration, dmg) {
    const h = terrainHeight(x, z);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2, 0.15, radius * 2),
      new THREE.MeshBasicMaterial({ color: 0x8B6914, transparent: true, opacity: 0.45 })
    );
    mesh.position.set(x, h + 0.08, z);
    scene.add(mesh);
    st.weaponEffects.push({ mesh, x, z, radius, life: duration, maxLife: duration, type: 'mudSlowZone', dmg });
    // Impact damage to all enemies in radius
    const radiusSq = radius * radius;
    for (const e of st.enemies) {
      if (!e.alive || e.dying) continue;
      const dx = x - e.group.position.x;
      const dz = z - e.group.position.z;
      if (dx * dx + dz * dz < radiusSq) {
        damageEnemy(e, dmg);
      }
    }
  }

  function spawnBees(x, z, count, duration, dmgPerBee, weaponLevel) {
    const h = terrainHeight(x, z);
    for (let b = 0; b < count; b++) {
      const beeGroup = new THREE.Group();
      const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
      beeGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), bodyMat));
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x222200 });
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), stripeMat);
      stripe.position.y = 0.02;
      beeGroup.add(stripe);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), wingMat);
      wingL.position.set(-0.1, 0.06, 0);
      beeGroup.add(wingL);
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), wingMat);
      wingR.position.set(0.1, 0.06, 0);
      beeGroup.add(wingR);
      // Offset each bee slightly so they don't all start at same point
      const offsetAngle = (b / count) * Math.PI * 2;
      beeGroup.position.set(x + Math.cos(offsetAngle) * 0.5, h + 0.8, z + Math.sin(offsetAngle) * 0.5);
      scene.add(beeGroup);
      st.weaponEffects.push({
        mesh: beeGroup, life: duration, type: 'bee',
        dmg: dmgPerBee, dmgCooldown: 0, speed: 6,
        weaponLevel, explodeOnExpire: weaponLevel >= 5,
        buzzPhase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Remove an object from the scene and recursively dispose all geometries and materials.
   * Handles Groups with nested children, array materials, and standalone Meshes.
   * BD-24: Ensures GPU memory is fully freed for complex object hierarchies.
   *
   * @param {THREE.Object3D} obj - The mesh or group to dispose.
   */
  function disposeSceneObject(obj) {
    scene.remove(obj);
    if (obj.traverse) {
      obj.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
    } else {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  /**
   * BD-225: Dispose a temporary mesh — geometry, material(s), and scene removal.
   * Prevents geometry/material leaks for boss attack telegraphs and effects.
   *
   * @param {THREE.Mesh|null} mesh - The mesh to dispose. Safely handles null/undefined.
   */
  function disposeTempMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
      else mesh.material.dispose();
    }
    scene.remove(mesh);
  }


  // ==========================================================================
  // BD-145: TIERED ZOMBIE SPECIAL ATTACKS (Tiers 2-6)
  // Each tier has a unique telegraphed attack with idle/telegraph/fire states.
  // ==========================================================================

  /** Apply damage to the player with armor/augment reduction and floating text. */
  // damagePlayer() consolidated at line ~2445 (BD-155)

  /** Remove a telegraph mesh from the scene and dispose its resources (BD-24: recursive). */
  function disposeTelegraph(e) {
    if (e.specialAttackMesh) {
      disposeSceneObject(e.specialAttackMesh);
      e.specialAttackMesh = null;
    }
    if (e.specialAttackMarkers && e.specialAttackMarkers.length > 0) {
      for (const m of e.specialAttackMarkers) {
        disposeSceneObject(m);
      }
      e.specialAttackMarkers = [];
    }
  }

  /**
   * Main state machine for tiers 2-6 special attacks.
   * Returns true if the enemy should skip normal movement (during telegraph).
   */
  function handleLowTierSpecialAttack(e, dt) {
    if (!e.alive) return false;
    if (e.isBoss) return false;

    // BD-179: Difficulty-based damage and telegraph multipliers
    const diffDmgMult = st.difficulty === 'chill' ? 0.5 : st.difficulty === 'easy' ? 0.75 : st.difficulty === 'hard' ? 1.3 : 1.0;
    const telegraphDurMult = st.difficulty === 'chill' ? 1.5 : 1.0;

    // BD-179: Tier-based trigger ranges
    const dx = st.playerX - e.group.position.x;
    const dz = st.playerZ - e.group.position.z;
    const distSq = dx * dx + dz * dz;
    const triggerRanges = { 2: 4, 3: 5, 4: 12, 5: 10, 6: 10 };
    const triggerRange = triggerRanges[e.tier] || 8;
    if (distSq > triggerRange * triggerRange) return false;

    if (e.specialAttackState === 'idle') {
      if (e.specialAttackTimer <= 0) {
        // Start telegraph
        e.specialAttackState = 'telegraph';
        e.specialAttackTargetX = st.playerX;
        e.specialAttackTargetZ = st.playerZ;
        // BD-167: Save player position for poison pool targeting
        e._attackTargetX = st.playerX;
        e._attackTargetZ = st.playerZ;
        // BD-179: First-encounter floating label
        const tierLabels = { 2: 'LUNGE!', 3: 'GROUND POUND!', 4: 'BONE SPIT!', 5: 'POISON POOL!', 6: 'GRAVE BURST!' };
        const tierColors = { 2: '#ffff00', 3: '#ff2200', 4: '#ffff00', 5: '#44ff44', 6: '#ff0000' };
        const labelKey = 'tier' + e.tier;
        if (tierLabels[e.tier] && !st.attackFirstSeen[labelKey]) {
          st.attackFirstSeen[labelKey] = true;
          addFloatingText(tierLabels[e.tier], tierColors[e.tier], e.group.position.x, e.group.position.y + 3, e.group.position.z, 2.5, true);
        }
        // BD-166: Universal body flash on telegraph start
        if (e.body) {
          const flashColors = { 2: 0xffff00, 3: 0xff2200, 4: 0xffff00, 5: 0x44ff44, 6: 0xff0000 };
          const flashCol = flashColors[e.tier] || 0xff0000;
          e.body.material.color.setHex(flashCol);
          if (e.body.material.emissive) e.body.material.emissive.setHex(flashCol);
          e._attackFlashTimer = 0.2;
        }
        if (e.tier === 2) startLurcherTelegraph(e, telegraphDurMult);
        else if (e.tier === 3) startBruiserTelegraph(e, telegraphDurMult);
        else if (e.tier === 4) startBruteTelegraph(e, telegraphDurMult);
        else if (e.tier === 5) startRavagerTelegraph(e, telegraphDurMult);
        else if (e.tier === 6) startHorrorTelegraph(e, telegraphDurMult);
      }
      return false; // still moving normally during idle
    }

    if (e.specialAttackState === 'telegraph') {
      e.specialAttackTelegraphTimer -= dt;
      // Animate telegraph visuals
      if (e.specialAttackMesh) {
        const t = performance.now() * 0.01;
        if (e.tier === 3 && e.specialAttackMesh.material) {
          // Bruiser: expand ring outward toward 3u radius
          const baseDur3 = 1.0 * telegraphDurMult;
          const progress = 1 - (e.specialAttackTelegraphTimer / baseDur3);
          const ringScale = 1 + progress * 4;
          e.specialAttackMesh.scale.set(ringScale, 1, ringScale);
          e.specialAttackMesh.material.opacity = 0.5 * (1 - progress * 0.3);
        } else if (e.specialAttackMesh.material) {
          e.specialAttackMesh.material.opacity = 0.3 + 0.3 * Math.sin(t);
        }
      }
      // Pulse markers for Horror tier 6
      if (e.specialAttackMarkers) {
        for (const m of e.specialAttackMarkers) {
          if (m && m.children) {
            m.children.forEach(c => { if (c.material) c.material.opacity = 0.3 + 0.4 * Math.sin(performance.now() * 0.012); });
          }
        }
      }

      if (e.specialAttackTelegraphTimer <= 0) {
        // Fire!
        e.specialAttackState = 'fire';
        if (e.tier === 2) fireLurcherAttack(e, diffDmgMult);
        else if (e.tier === 3) fireBruiserAttack(e, diffDmgMult);
        else if (e.tier === 4) fireBruteAttack(e, diffDmgMult);
        else if (e.tier === 5) fireRavagerAttack(e, diffDmgMult);
        else if (e.tier === 6) fireHorrorAttack(e, diffDmgMult);
        // Reset state (Grave Burst uses burst timer so stays in 'fire' until done)
        if (e.tier !== 6) {
          disposeTelegraph(e);
          e.specialAttackState = 'idle';
          e.specialAttackTimer = getTierAttackCooldown(e.tier) + Math.random() * 2;
        }
      }
      return true; // freeze during telegraph
    }

    if (e.specialAttackState === 'fire') {
      // Only tier 6 (Horror) has a multi-step fire phase
      if (e.tier === 6) {
        e.specialAttackBurstTimer -= dt;
        if (e.specialAttackBurstTimer <= 0 && e.specialAttackBurstIndex < 3) {
          fireHorrorBurst(e, e.specialAttackBurstIndex, e._diffDmgMult || 1);
          e.specialAttackBurstIndex++;
          e.specialAttackBurstTimer = 0.4; // 0.4s between each burst
        }
        if (e.specialAttackBurstIndex >= 3 && e.specialAttackBurstTimer <= 0) {
          disposeTelegraph(e);
          e.specialAttackState = 'idle';
          e.specialAttackTimer = getTierAttackCooldown(e.tier) + Math.random() * 2;
          e.specialAttackBurstIndex = 0;
        }
        return true; // freeze during fire phase too
      }
      return false;
    }

    return false;
  }

  // --- Tier 2: Lurcher — Lunge Snap ---
  function startLurcherTelegraph(e, telegraphDurMult) {
    e.specialAttackTelegraphTimer = 0.6 * (telegraphDurMult || 1);
    const dx = e.specialAttackTargetX - e.group.position.x;
    const dz = e.specialAttackTargetZ - e.group.position.z;
    const angle = Math.atan2(dx, dz);
    // Yellow arrow on ground pointing toward player
    const arrowGeo = new THREE.BufferGeometry();
    const len = 3;
    const pts = [
      new THREE.Vector3(-0.4, 0, 0),
      new THREE.Vector3(0, 0, len),
      new THREE.Vector3(0.4, 0, 0),
    ];
    arrowGeo.setFromPoints(pts);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(e.group.position.x, 0.15, e.group.position.z);
    arrow.rotation.y = -angle;
    scene.add(arrow);
    e.specialAttackMesh = arrow;
    playSound('sfx_player_growl');
  }

  function fireLurcherAttack(e, diffDmgMult) {
    if (!e.alive) return;
    // Dash 3 units toward saved target
    const dx = e.specialAttackTargetX - e.group.position.x;
    const dz = e.specialAttackTargetZ - e.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const dashDist = Math.min(3, dist);
    e.group.position.x += (dx / dist) * dashDist;
    e.group.position.z += (dz / dist) * dashDist;
    e.group.position.y = terrainHeight(e.group.position.x, e.group.position.z) + 0.01;
    // Damage check — hit player if within 1.5 units after lunge
    const pdx = st.playerX - e.group.position.x;
    const pdz = st.playerZ - e.group.position.z;
    if (pdx * pdx + pdz * pdz < 2.25) { // 1.5^2
      damagePlayer(5 * (diffDmgMult || 1), '#ffdd00', { type: 'lunge', tierName: ZOMBIE_TIERS[1].name, tier: 2, color: ZOMBIE_TIERS[1].eye,
        killerX: e.group.position.x, killerZ: e.group.position.z, enemyRef: e }); // BD-235
    }
    playSound('sfx_melee_hit');
  }

  // --- Tier 3: Bruiser — Ground Pound ---
  function startBruiserTelegraph(e, telegraphDurMult) {
    e.specialAttackTelegraphTimer = 1.0 * (telegraphDurMult || 1);
    // Red-orange expanding ring on ground at zombie's position
    const ringGeo = new THREE.RingGeometry(0.3, 0.6, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(e.group.position.x, 0.12, e.group.position.z);
    scene.add(ring);
    e.specialAttackMesh = ring;
    // Animate ring expansion during telegraph
    e._groundPoundOriginX = e.group.position.x;
    e._groundPoundOriginZ = e.group.position.z;
    playSound('sfx_player_growl');
  }

  function fireBruiserAttack(e, diffDmgMult) {
    if (!e.alive) return;
    const ox = e._groundPoundOriginX || e.group.position.x;
    const oz = e._groundPoundOriginZ || e.group.position.z;
    // AoE damage check — 3 unit radius
    const pdx = st.playerX - ox;
    const pdz = st.playerZ - oz;
    if (pdx * pdx + pdz * pdz < 9) { // 3^2
      damagePlayer(8 * (diffDmgMult || 1), '#ff4400', { type: 'slam', tierName: ZOMBIE_TIERS[2].name, tier: 3, color: ZOMBIE_TIERS[2].eye,
        killerX: e.group.position.x, killerZ: e.group.position.z, enemyRef: e }); // BD-235
    }
    // Visual: brief expanding shockwave ring effect
    const explGeo = new THREE.RingGeometry(0.5, 3, 20);
    explGeo.rotateX(-Math.PI / 2);
    const explMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const expl = new THREE.Mesh(explGeo, explMat);
    expl.position.set(ox, 0.15, oz);
    scene.add(expl);
    st.weaponEffects.push({ mesh: expl, life: 0.3, type: 'explosion' });
    playSound('sfx_explosion');
  }

  // --- Tier 4: Brute — Bone Spit ---
  function startBruteTelegraph(e, telegraphDurMult) {
    e.specialAttackTelegraphTimer = 0.8 * (telegraphDurMult || 1);
    // Yellow aim line from zombie to player
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(e.group.position.x, 1.2, e.group.position.z),
      new THREE.Vector3(st.playerX, 1.2, st.playerZ)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    e.specialAttackMesh = line;
    playSound('sfx_player_growl');
  }

  function fireBruteAttack(e, diffDmgMult) {
    if (!e.alive) return;
    // BD-166: Fire bone projectile toward saved target (bigger + glowing)
    const boneGeo = new THREE.BoxGeometry(0.5, 0.3, 0.3);
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xcccc88, emissive: 0x666644, emissiveIntensity: 0.8 });
    const bone = new THREE.Mesh(boneGeo, boneMat);
    bone.position.set(e.group.position.x, 1.2, e.group.position.z);
    scene.add(bone);
    const dx = e.specialAttackTargetX - e.group.position.x;
    const dz = e.specialAttackTargetZ - e.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    st.weaponProjectiles.push({
      mesh: bone,
      x: e.group.position.x, y: 1.2, z: e.group.position.z,
      vx: (dx / dist) * 10, vy: 0, vz: (dz / dist) * 10,
      damage: 10 * (diffDmgMult || 1),
      range: 1.0,
      life: 3,
      type: 'boneSpit',
      isEnemyProjectile: true,
      sourceEnemy: e, // BD-235: enemy ref for damagePlayer source tracking
      originX: e.group.position.x, originZ: e.group.position.z, // BD-235: origin position at fire time
    });
    playSound('sfx_weapon_projectile');
  }

  // --- Tier 5: Ravager — Poison Pool ---
  function startRavagerTelegraph(e, telegraphDurMult) {
    e.specialAttackTelegraphTimer = 1.0 * (telegraphDurMult || 1);
    // BD-167: Green circle on ground at PLAYER position (saved in _attackTargetX/Z)
    const circGeo = new THREE.RingGeometry(0.3, 2.0, 20);
    circGeo.rotateX(-Math.PI / 2);
    const circMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const circ = new THREE.Mesh(circGeo, circMat);
    circ.position.set(e._attackTargetX, 0.12, e._attackTargetZ);
    scene.add(circ);
    e.specialAttackMesh = circ;
    playSound('sfx_weapon_poison');
  }

  function fireRavagerAttack(e, diffDmgMult) {
    if (!e.alive) return;
    // BD-167: Spawn poison pool at saved player position with small offset
    const poolOx = (Math.random() - 0.5) * 2;
    const poolOz = (Math.random() - 0.5) * 2;
    const poolX = e._attackTargetX + poolOx;
    const poolZ = e._attackTargetZ + poolOz;
    const poolGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.15, 16);
    const poolMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5 });
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.position.set(poolX, 0.08, poolZ);
    scene.add(poolMesh);
    st.poisonPools.push({
      mesh: poolMesh,
      x: poolX, z: poolZ,
      radius: 2.0,
      dmgPerSec: 8 * (diffDmgMult || 1),
      life: 4.0,
      maxLife: 4.0,
    });
    playSound('sfx_weapon_poison');
  }

  // --- Tier 6: Horror — Grave Burst ---
  function startHorrorTelegraph(e, telegraphDurMult) {
    e.specialAttackTelegraphTimer = 1.2 * (telegraphDurMult || 1);
    e.specialAttackBurstIndex = 0;
    e.specialAttackBurstTimer = 0;
    // Place 3 red X markers along line toward player
    const dx = e.specialAttackTargetX - e.group.position.x;
    const dz = e.specialAttackTargetZ - e.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / dist;
    const nz = dz / dist;
    e.specialAttackMarkers = [];
    e._burstPositions = [];
    for (let i = 0; i < 3; i++) {
      const d = 2 + i * 2.5; // 2, 4.5, 7 units out
      const bx = e.group.position.x + nx * d;
      const bz = e.group.position.z + nz * d;
      e._burstPositions.push({ x: bx, z: bz });
      // X marker: two crossed lines
      const xSize = 0.8;
      const geo1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-xSize, 0, -xSize),
        new THREE.Vector3(xSize, 0, xSize),
      ]);
      const geo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-xSize, 0, xSize),
        new THREE.Vector3(xSize, 0, -xSize),
      ]);
      const xMat = new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 });
      const xGroup = new THREE.Group();
      xGroup.add(new THREE.Line(geo1, xMat));
      xGroup.add(new THREE.Line(geo2, xMat.clone()));
      xGroup.position.set(bx, 0.15, bz);
      scene.add(xGroup);
      e.specialAttackMarkers.push(xGroup);
    }
    playSound('sfx_player_growl');
  }

  function fireHorrorAttack(e, diffDmgMult) {
    // Kick off sequential burst — first one fires immediately
    e._diffDmgMult = diffDmgMult || 1; // stash for burst callbacks
    e.specialAttackBurstIndex = 0;
    e.specialAttackBurstTimer = 0;
    fireHorrorBurst(e, 0, e._diffDmgMult);
    e.specialAttackBurstIndex = 1;
    e.specialAttackBurstTimer = 0.4;
  }

  function fireHorrorBurst(e, index, diffDmgMult) {
    if (!e.alive || !e._burstPositions || index >= e._burstPositions.length) return;
    const pos = e._burstPositions[index];
    // Damage check — 1.5 unit radius
    const pdx = st.playerX - pos.x;
    const pdz = st.playerZ - pos.z;
    if (pdx * pdx + pdz * pdz < 2.25) { // 1.5^2
      damagePlayer(6 * (diffDmgMult || 1), '#ff2222', { type: 'graveBurst', tierName: ZOMBIE_TIERS[5].name, tier: 6, color: ZOMBIE_TIERS[5].eye,
        killerX: pos.x, killerZ: pos.z, enemyRef: null }); // BD-235: grave burst has no living enemy
    }
    // Visual explosion at this position
    const explMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.8, 2.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.5 })
    );
    const gh = getGroundAt(pos.x, pos.z);
    explMesh.position.set(pos.x, gh + 0.4, pos.z);
    scene.add(explMesh);
    st.weaponEffects.push({ mesh: explMesh, life: 0.3, type: 'explosion' });
    // Remove the corresponding marker if it still exists
    if (e.specialAttackMarkers && e.specialAttackMarkers[index]) {
      const m = e.specialAttackMarkers[index];
      disposeSceneObject(m);
      e.specialAttackMarkers[index] = null;
    }
    playSound('sfx_explosion');
  }

  // ==========================================================================
  // END BD-145
  // ==========================================================================

  /**
   * Update weapon visual effects (clouds, explosions, slashes, bolts).
   * Each effect type has custom behavior:
   * - cloud: DoT damage to enemies in radius, swirl rotation, pulsing opacity
   * - explosion: Fade out opacity, shrink Y scale
   * - slash: Fade out opacity
   * - bolt: Fade out opacity
   * All effects are disposed when their life timer reaches zero.
   *
   * @param {number} dt - Delta time in seconds.
   */
  function updateWeaponEffects(dt) {
    for (let i = st.weaponEffects.length - 1; i >= 0; i--) {
      const eff = st.weaponEffects[i];
      eff.life -= dt;

      if (eff.type === 'cloud') {
        // DoT damage
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = eff.x - e.group.position.x;
          const dz = eff.z - e.group.position.z;
          if (dx * dx + dz * dz < eff.radius * eff.radius) {
            damageEnemy(e, eff.dmgPerSec * dt);
          }
        }
        // Swirl the cloud particles
        eff.mesh.rotation.y += dt * 2;
        // Pulse opacity on children
        eff.mesh.children.forEach((c, ci) => {
          if (c.material) c.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 4 + ci) * 0.15;
        });
      }

      if (eff.type === 'explosion') {
        if (eff.mesh.material) {
          eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.3 * 0.5));
        }
        eff.mesh.scale.y = Math.max(0.01, eff.life / 0.3);
      }

      if (eff.type === 'slash') {
        // Fade out slash lines
        if (eff.mesh.material) eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.2 * 0.7));
      }

      if (eff.type === 'bolt' && !eff.shared) {
        // Fade lightning segments (only for non-shared materials)
        if (eff.mesh.material) eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.15));
      }

      if (eff.type === 'mudSlowZone') {
        // Slow enemies walking through the mud zone
        const radiusSq = eff.radius * eff.radius;
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = eff.x - e.group.position.x;
          const dz = eff.z - e.group.position.z;
          if (dx * dx + dz * dz < radiusSq) {
            if (!e._mudSlowed) {
              e._mudSlowed = true;
              e._mudSlowTimer = 0.3;
              e._origSpeed = e._origSpeed || e.speed;
              e.speed = e._origSpeed * 0.5;
            } else {
              e._mudSlowTimer = 0.3;
            }
          }
        }
        // Fade out opacity near end of life
        if (eff.mesh.material) {
          eff.mesh.material.opacity = Math.min(0.45, Math.max(0, (eff.life / eff.maxLife) * 0.45));
        }
      }

      // BD-211: Boss shockwave — expanding ring that damages player on contact
      if (eff.type === 'bossShockwave') {
        // Expand the ring outward
        const expandSpeed = eff.maxRadius / eff.maxLife;
        eff.radius += expandSpeed * dt;
        const scale = eff.radius;
        eff.mesh.scale.set(scale, 1, scale);
        // Fade out as it expands
        if (eff.mesh.material) {
          eff.mesh.material.opacity = 0.6 * (eff.life / eff.maxLife);
        }
        // Check if player is near the ring edge (within 2 units of the ring radius)
        if (!eff.hasHitPlayer) {
          const pdx = st.playerX - eff.x;
          const pdz = st.playerZ - eff.z;
          const playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
          // Hit if player is between (radius-2) and (radius+1) — the ring's "band"
          if (playerDist >= eff.radius - 2 && playerDist <= eff.radius + 1) {
            damagePlayer(eff.damage, '#ff6600', { type: 'shockwave', tierName: ZOMBIE_TIERS[8].name, tier: 9, color: ZOMBIE_TIERS[8].eye,
              killerX: eff.x, killerZ: eff.z, enemyRef: eff.sourceEnemy || null }); // BD-216+235
            eff.hasHitPlayer = true;
          }
        }
      }

      // BD-222: Shadow Zones — dark circles that damage player while standing in them
      if (eff.type === 'bossShadowZone') {
        // Tick-based damage to player
        eff.tickTimer -= dt;
        if (eff.tickTimer <= 0) {
          eff.tickTimer = eff.tickInterval;
          // Check if player is within the zone radius
          const pdx = st.playerX - eff.x;
          const pdz = st.playerZ - eff.z;
          if (pdx * pdx + pdz * pdz < eff.radius * eff.radius) {
            damagePlayer(eff.dmgPerTick, '#440066', { type: 'shadowZone', tierName: ZOMBIE_TIERS[9].name, tier: 10, color: ZOMBIE_TIERS[9].eye });
          }
        }
        // Pulsing visual effect
        if (eff.mesh.material) {
          const pulse = 0.4 + 0.2 * Math.sin(performance.now() * 0.005);
          // Fade out in final 0.5s
          if (eff.life <= eff.fadeStart) {
            eff.mesh.material.opacity = pulse * (eff.life / eff.fadeStart);
          } else {
            eff.mesh.material.opacity = pulse;
          }
        }
      }

      if (eff.type === 'bee') {
        // Bee chases nearest enemy and deals damage on contact
        let nearestE = null, nearDistSq = Infinity;
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = eff.mesh.position.x - e.group.position.x;
          const dz = eff.mesh.position.z - e.group.position.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < nearDistSq) { nearestE = e; nearDistSq = dSq; }
        }
        if (nearestE) {
          const dx = nearestE.group.position.x - eff.mesh.position.x;
          const dz = nearestE.group.position.z - eff.mesh.position.z;
          const d = Math.sqrt(dx * dx + dz * dz) || 1;
          eff.mesh.position.x += (dx / d) * eff.speed * dt;
          eff.mesh.position.z += (dz / d) * eff.speed * dt;
          // Buzzing vertical oscillation
          eff.buzzPhase += dt * 15;
          eff.mesh.position.y = getGroundAt(eff.mesh.position.x, eff.mesh.position.z) + 0.8 + Math.sin(eff.buzzPhase) * 0.15;
          eff.mesh.rotation.y = Math.atan2(dx, dz);
          // Damage on contact (every 0.5s)
          eff.dmgCooldown -= dt;
          if (nearDistSq < 1.0 && eff.dmgCooldown <= 0) {
            damageEnemy(nearestE, eff.dmg);
            eff.dmgCooldown = 0.5;
          }
        } else {
          // No enemies, just buzz in place
          eff.buzzPhase += dt * 15;
          eff.mesh.position.y = getGroundAt(eff.mesh.position.x, eff.mesh.position.z) + 0.8 + Math.sin(eff.buzzPhase) * 0.15;
        }
        // Wing flap animation
        if (eff.mesh.children.length >= 4) {
          const wingAngle = Math.sin(eff.buzzPhase * 2) * 0.3;
          eff.mesh.children[2].rotation.z = wingAngle;
          eff.mesh.children[3].rotation.z = -wingAngle;
        }
      }

      if (eff.type === 'snowballTurret') {
        // Orbit around player
        eff.orbitAngle += eff.orbitSpeed * dt;
        const orbitR = 3;
        eff.mesh.position.x = st.playerX + Math.cos(eff.orbitAngle) * orbitR;
        eff.mesh.position.z = st.playerZ + Math.sin(eff.orbitAngle) * orbitR;
        eff.mesh.position.y = st.playerY + 0.8;
        eff.mesh.rotation.y += dt * 2;
        // Fire snowballs at nearest enemy
        eff.fireTimer -= dt;
        if (eff.fireTimer <= 0) {
          let nearestE = null, nearDistSq = Infinity;
          const wRangeSq = eff.weaponRange * eff.weaponRange;
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = eff.mesh.position.x - e.group.position.x;
            const dz = eff.mesh.position.z - e.group.position.z;
            const dSq = dx * dx + dz * dz;
            if (dSq < wRangeSq && dSq < nearDistSq) { nearestE = e; nearDistSq = dSq; }
          }
          if (nearestE) {
            const dx = nearestE.group.position.x - eff.mesh.position.x;
            const dz = nearestE.group.position.z - eff.mesh.position.z;
            const d = Math.sqrt(dx * dx + dz * dz) || 1;
            const snowMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.18, 0.18, 0.18),
              new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            snowMesh.position.set(eff.mesh.position.x, eff.mesh.position.y, eff.mesh.position.z);
            scene.add(snowMesh);
            st.weaponProjectiles.push({
              mesh: snowMesh, vx: (dx / d) * 12, vz: (dz / d) * 12,
              dmg: eff.dmg, life: 1.5, pierce: false, type: 'snowball',
              freezeChance: eff.freezeChance
            });
          }
          eff.fireTimer = eff.fireRate;
        }
      }

      if (eff.type === 'stinkTrail') {
        // Damage enemies walking through trail
        eff.dmgTickTimer -= dt;
        if (eff.dmgTickTimer <= 0) {
          eff.dmgTickTimer = 0.3;
          const radiusSq = eff.radius * eff.radius;
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = eff.x - e.group.position.x;
            const dz = eff.z - e.group.position.z;
            if (dx * dx + dz * dz < radiusSq) {
              damageEnemy(e, eff.dmgPerSec * 0.3);
              // Poison DoT at level 5: apply poison that ticks for extra damage
              if (eff.poisonDoT && !e._stinkPoisoned) {
                e._stinkPoisoned = true;
                e._stinkPoisonTimer = 2;
                e._stinkPoisonDmg = eff.dmgPerSec * 0.2;
              }
            }
          }
        }
        // Fade out opacity as trail ages
        if (eff.mesh.material) {
          eff.mesh.material.opacity = Math.min(0.4, Math.max(0, eff.life / 3 * 0.4));
        }
        // Slight color shift toward yellow-green as it ages
        eff.mesh.rotation.y += dt * 0.5;
      }

      // BD-145: Poison Pool (Ravager tier 5) — DPS to player standing in radius
      if (eff.type === 'poisonPool') {
        eff.dmgTickTimer -= dt;
        if (eff.dmgTickTimer <= 0) {
          eff.dmgTickTimer = 0.5; // tick every 0.5s
          const pdx = st.playerX - eff.x;
          const pdz = st.playerZ - eff.z;
          if (pdx * pdx + pdz * pdz < eff.radius * eff.radius) {
            damagePlayer(eff.dmgPerSec * 0.5, '#33cc33', { type: 'poison', tierName: ZOMBIE_TIERS[4].name, tier: 5, color: ZOMBIE_TIERS[4].eye,
              killerX: eff.x, killerZ: eff.z, enemyRef: null }); // 4 dps * 0.5s = 2 per tick // BD-235
          }
        }
        // Fade out opacity near end of life, and pulse
        if (eff.mesh.material) {
          const lifeRatio = eff.life / eff.maxLife;
          eff.mesh.material.opacity = Math.min(0.45, lifeRatio * 0.45) + 0.05 * Math.sin(performance.now() * 0.005);
        }
        eff.mesh.rotation.y += dt * 0.8;
      }

      if (eff.life <= 0) {
        // Bee explosion on expire (level 5)
        if (eff.type === 'bee' && eff.explodeOnExpire) {
          const bx = eff.mesh.position.x;
          const bz = eff.mesh.position.z;
          const explR = 1.5;
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = bx - e.group.position.x;
            const dz = bz - e.group.position.z;
            if (dx * dx + dz * dz < explR * explR) {
              damageEnemy(e, eff.dmg * 2);
            }
          }
          // Small yellow explosion visual
          const explMesh = new THREE.Mesh(
            new THREE.BoxGeometry(explR * 2, 0.3, explR * 2),
            new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.4 })
          );
          explMesh.position.set(bx, getGroundAt(bx, bz) + 0.2, bz);
          scene.add(explMesh);
          st.weaponEffects.push({ mesh: explMesh, life: 0.25, type: 'explosion' });
        }
        if (eff.shared) {
          // Shared geometry/material — only remove from scene, do not dispose
          scene.remove(eff.mesh);
        } else {
          disposeSceneObject(eff.mesh);
        }
        st.weaponEffects.splice(i, 1);
      }
    }
  }

  // === LEVEL UP ===

  /**
   * Show the level-up upgrade selection menu.
   * Pauses the game and generates up to 3 random choices from a pool of:
   * - New weapons (if weapon slots available)
   * - Weapon level upgrades (if below max level)
   * - Howl acquisitions (if below max stacks)
   * - Fallback heal options (if pool has fewer than 3)
   *
   * Also unlocks additional weapon slots at levels 5, 10, and 15 (up to 4 max).
   * Player can press R to reroll choices (up to 3 rerolls per game).
   */
  function showUpgradeMenu() {
    st.paused = true;
    st.upgradeMenu = true;
    st.showFullMap = false;
    st.selectedUpgrade = 0;
    // BD-86: Clear Enter key state and charging when menu opens.
    // Prevents held-Enter (from power attack) from auto-confirming the menu.
    keys3d['Enter'] = false;
    keys3d['NumpadEnter'] = false;
    keys3d['Space'] = false;
    inputState.charging = false;
    inputState.chargeTime = 0;

    // Unlock weapon slots at levels 5, 10, 15
    if (st.level === 5 || st.level === 10 || st.level === 15) {
      st.maxWeaponSlots = Math.min(4, st.maxWeaponSlots + 1);
    }

    const pool = [];

    // New weapons (if slots available, filtered to this run's available pool)
    if (st.weapons.length < st.maxWeaponSlots) {
      const ownedIds = new Set(st.weapons.map(w => w.typeId));
      for (const id of st.availableWeapons) {
        if (!ownedIds.has(id)) {
          const def = WEAPON_TYPES[id];
          pool.push({
            category: 'NEW!',
            name: def.name,
            color: def.color,
            desc: def.desc,
            apply: s => {
              s.weapons.push({ typeId: id, level: 1, cooldownTimer: 0 });
            }
          });
        }
      }
    }

    // Weapon upgrades (existing weapons below max)
    for (const w of st.weapons) {
      const def = WEAPON_TYPES[w.typeId];
      if (w.level < def.maxLevel) {
        const nextDesc = def.levelDescs[w.level - 1] || '+Upgrade';
        pool.push({
          category: 'BETTER!',
          name: `${def.name} LV${w.level + 1}`,
          color: def.color,
          desc: nextDesc,
          apply: () => { w.level++; }
        });
      }
    }

    // Howls (below max, filtered to this run's available pool)
    for (const id of st.availableHowls) {
      const def = HOWL_TYPES[id];
      if (st.howls[id] < def.maxLevel) {
        pool.push({
          category: 'POWER!',
          name: def.name,
          color: def.color,
          desc: def.desc,
          apply: s => {
            s.howls[id]++;
            if (id === 'vitality') {
              s.maxHp += 20;
              s.hp = Math.min(s.hp + 20, s.maxHp);
            }
            if (id === 'magnet') {
              s.collectRadius *= 1.25;
            }
            if (id === 'guardian') {
              s.maxHp = Math.floor(s.maxHp * 1.08);
              s.hp = Math.min(s.hp + 10, s.maxHp);
              s.augments.guardian_regen = (s.augments.guardian_regen || 0) + 1;
              recomputeAugments();
            }
          }
        });
      }
    }

    // Fallback options
    if (pool.length < 3) {
      pool.push({
        category: 'HEAL',
        name: 'HEAL',
        color: '#44ff44',
        desc: 'Feel better!',
        apply: s => { s.hp = Math.min(s.hp + 30, s.maxHp); }
      });
      pool.push({
        category: 'HEAL',
        name: 'MAX HP +10',
        color: '#88ff88',
        desc: 'More hearts!',
        apply: s => { s.maxHp += 10; s.hp = Math.min(s.hp + 10, s.maxHp); }
      });
    }

    // BD-110: Category-aware selection — guarantee at least 1 weapon option
    const weaponPool = pool.filter(p => p.category === 'NEW WEAPON' || p.category === 'UPGRADE');
    const otherPool = pool.filter(p => p.category !== 'NEW WEAPON' && p.category !== 'UPGRADE');
    let choices;
    if (weaponPool.length > 0 && pool.length >= 3) {
      // Guarantee 1 weapon option, fill remaining 2 from the rest
      const weaponPick = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      const remaining = shuffle(pool.filter(p => p !== weaponPick));
      choices = shuffle([weaponPick, ...remaining.slice(0, 2)]);
    } else {
      choices = shuffle(pool).slice(0, 3);
    }
    st.upgradeChoices = choices;
  }

  // === PRE-GENERATE LOOT CRATES ===
  // LOOT_CRATE_COUNT imported from constants.js
  for (let lci = 0; lci < LOOT_CRATE_COUNT; lci++) {
    const lx = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const lz = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const pickup = createItemPickup(lx, lz);
    if (pickup) st.itemPickups.push(pickup);
  }

  // === GAME LOOP ===
  const clock = new THREE.Clock();
  /** @type {number|null} requestAnimationFrame handle for cancellation on cleanup. */
  let animId = null;
  /** @type {number} Throttle timer for chunk loading (updates every 0.5s). */
  let chunkUpdateTimer = 0;

  /**
   * Get the terrain height at a world position.
   * Convenience alias for terrainHeight used within the game loop.
   *
   * @param {number} x - World X coordinate.
   * @param {number} z - World Z coordinate.
   * @returns {number} Terrain height at (x, z).
   */
  function getGroundAt(x, z) {
    return terrainHeight(x, z);
  }

  /**
   * Main game loop — called every animation frame via requestAnimationFrame.
   *
   * This function is ~1,191 lines and orchestrates all per-frame game logic.
   * When not paused or game over, it processes (in order):
   * 1. Player input + movement
   * 2. Jumping, gravity, platform collision
   * 3. Ground collision + min height clamping
   * 4. Player rotation toward movement direction
   * 5. Bipedal leg/arm walk animation + tail wag
   * 6. Muscle growth scaling per level
   * 7. Angel wings visibility + flapping + superman pose + G-force maneuvers
   * 8. Invincibility timer countdown
   * 9. Active powerup timer + removal
   * 10. Fire aura damage + particle spawning
   * 11. Frost nova freeze burst
   * 12. Frozen enemy timer updates
   * 13. Berserker rage visual particles
   * 14. Ghost form transparency + particles
   * 15. Earthquake stomp landing detection
   * 16. Vampire fangs passive regen
   * 17. Lightning shield periodic zap
   * 18. Giant growth player scaling
   * 19. Time warp visual particles
   * 20. Mirror image clone AI
   * 21. Bomb trail dropping + explosion
   * 22. Regen burst rapid healing
   * 23. Weapon auto-fire + projectile + effect updates
   * 24. Ambient zombie spawning
   * 25. Ambient crate spawning
   * 26. Wave event timer + warning countdown
   * 27. Terrain chunk loading (throttled)
   * 28. Enemy AI: chase, jump, walk animation, contact damage, hurt flash, despawn
   * 29. Zombie-zombie merge system
   * 30. Auto-attack (nearest enemy targeting)
   * 31. Power attack charge/release
   * 32. Attack line decay
   * 33. Banana cannon projectile movement + hits
   * 34. XP gem collection + magnet pull + level-up trigger
   * 35. Powerup crate interaction + labels
   * 36. Item pickup equipping
   * 37. Shrine interaction + augment granting
   * 38. Totem interaction + difficulty scaling
   * 39. Floating text animation
   * 40. Augment regen tick
   * 41. Shield bracelet cooldown
   * 42. Dead enemy cleanup
   * 43. Player death check
   *
   * After gameplay logic (always runs):
   * 44. Camera smooth follow
   * 45. Directional light follow
   * 46. Three.js render
   * 47. HUD draw
   */
  function tick() {
    if (!st.running) return;
    animId = requestAnimationFrame(tick);

    // NOTE: dt is capped at 0.05s (20fps minimum) to prevent physics tunneling on lag spikes
    let dt = Math.min(clock.getDelta(), 0.05);

    // Item pickup time-dilation (BD-147)
    if (st.itemSlowTimer > 0) {
      st.itemSlowTimer -= dt;
      dt *= 0.5; // half speed for dramatic moment
    }

    // BD-228: Death sequence time scaling — realDt for UI/timers, gameDt for world simulation
    const realDt = dt; // always real-time (after item slow, before death scale)
    const gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1);

    // FPS tracking (runs regardless of pause/gameOver for accurate profiling)
    st._fpsFrames++;
    st._fpsTime += dt;
    if (st._fpsTime >= 0.5) {
      st._fpsDisplay = Math.round(st._fpsFrames / st._fpsTime);
      st._fpsFrames = 0;
      st._fpsTime = 0;
    }

    // BD-189: Tick name-entry cooldown even during gameOver so the game-over
    // screen becomes responsive after the 300ms guard expires.
    if (st.nameEntryInputCooldown > 0) {
      st.nameEntryInputCooldown -= dt;
      // BD-193: Auto-unlock game-over input when cooldown expires,
      // instead of requiring a specific Enter key release
      if (st.nameEntryInputCooldown <= 0) {
        inputState.enterReleasedSinceGameOver = true;
      }
    }

    if (!st.paused && !st.gameOver) {
      st.gameTime += gameDt; // BD-228: game time slows during death sequence

      // === PLAYER INPUT ===
      let mx = 0, mz = 0;
      // BD-228: Disable player movement during death sequence
      if (!st.deathSequence) {
        if (keys3d['KeyW'] || keys3d['ArrowUp']) mz = -1;
        if (keys3d['KeyS'] || keys3d['ArrowDown']) mz = 1;
        if (keys3d['KeyA'] || keys3d['ArrowLeft']) mx = -1;
        if (keys3d['KeyD'] || keys3d['ArrowRight']) mx = 1;
      }
      const len = Math.sqrt(mx * mx + mz * mz);
      if (len > 0) { mx /= len; mz /= len; }
      st.moveDir.x = mx; st.moveDir.z = mz;

      // Apply speed bonuses
      let speed = st.playerSpeed * st.speedBoost;
      if (st.items.boots === 'soccerCleats') speed *= 1.15;
      if (st.items.rubberDucky > 0) speed *= (1 + st.items.rubberDucky * 0.10); // Rubber Ducky: +10% per stack
      if (st.items.turboshoes) speed *= 1.25; // Turbo Sneakers: +25% move speed
      // Wearable feet speed bonus
      if (st.wearables.feet) {
        const feetEff = WEARABLES_3D[st.wearables.feet].effect;
        if (feetEff.speedMult) speed *= feetEff.speedMult;
      }

      st.playerX += mx * speed * gameDt;
      st.playerZ += mz * speed * gameDt;
      // Clamp player to map boundaries
      st.playerX = Math.max(-MAP_HALF + 1, Math.min(MAP_HALF - 1, st.playerX));
      st.playerZ = Math.max(-MAP_HALF + 1, Math.min(MAP_HALF - 1, st.playerZ));

      // BD-97: Reveal fog-of-war cells near player (4-unit grid, 30-unit radius)
      {
        const fogCell = 4, fogRadius = 30;
        const fogCells = Math.ceil(fogRadius / fogCell);
        const pcx = Math.floor(st.playerX / fogCell);
        const pcz = Math.floor(st.playerZ / fogCell);
        for (let dx = -fogCells; dx <= fogCells; dx++) {
          for (let dz = -fogCells; dz <= fogCells; dz++) {
            if (dx * dx + dz * dz <= fogCells * fogCells) {
              st.fogRevealed.add((pcx + dx) + ',' + (pcz + dz));
            }
          }
        }
      }

      // === OBJECT COLLISION (BD-69, BD-156: chunk-indexed) ===
      if (terrainState) {
        const PR = 0.5; // player radius
        const nearby = getNearbyColliders(st.playerX, st.playerZ, terrainState);
        for (let ci = 0; ci < nearby.length; ci++) {
          const c = nearby[ci];
          const dx = st.playerX - c.x;
          const dz = st.playerZ - c.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const minDist = PR + c.radius;
          if (dist < minDist && dist > 0.001) {
            // Push player out
            const pushDist = minDist - dist;
            st.playerX += (dx / dist) * pushDist;
            st.playerZ += (dz / dist) * pushDist;
          }
        }
      }

      // === JUMPING + GRAVITY + FLIGHT ===
      // Flight mode (Wings powerup): Space=ascend, Shift=descend, Alt+W/S=G-force maneuvers.
      // Normal mode: Space=jump (only when onGround), then gravity pulls down each frame.
      const jumpKey = !st.deathSequence && (keys3d['Space'] || keys3d['KeyW'] && keys3d['ShiftLeft']);
      if (st.flying && !st.deathSequence) {
        // Wings flight mode
        if (keys3d['Space']) st.playerVY = 6;
        else if (keys3d['ShiftLeft']) st.playerVY = -6;
        else st.playerVY *= 0.9;
        st.playerY += st.playerVY * gameDt;
        st.onGround = false;

        // G-force maneuvers: Alt + forward/backward while flying
        const altKey = keys3d['AltLeft'] || keys3d['AltRight'];
        if (altKey) {
          const pitchRate = Math.PI * 1.2; // ~1.2 rad/s = full loop in ~5.2s

          if (keys3d['KeyW'] || keys3d['ArrowUp']) {
            // Pull up — forward loop (like pulling back on stick)
            st.gManeuver = true;
            st.gManeuverPitch += pitchRate * gameDt;
          } else if (keys3d['KeyS'] || keys3d['ArrowDown']) {
            // Push over — dive loop
            st.gManeuver = true;
            st.gManeuverPitch -= pitchRate * gameDt;
          }

          if (st.gManeuver) {
            // Speed boost during maneuver
            let maneuverSpeed = st.playerSpeed * st.speedBoost * 1.5;
            if (st.items.boots === 'soccerCleats') maneuverSpeed *= 1.15;
            if (st.items.rubberDucky > 0) maneuverSpeed *= (1 + st.items.rubberDucky * 0.10);
            if (st.items.turboshoes) maneuverSpeed *= 1.25;
            // Move in the direction the player is facing through the loop
            const facingAngle = playerGroup.rotation.y;
            const pitchAngle = st.gManeuverPitch;
            st.playerX += Math.sin(facingAngle) * Math.cos(pitchAngle) * maneuverSpeed * gameDt;
            st.playerZ += Math.cos(facingAngle) * Math.cos(pitchAngle) * maneuverSpeed * gameDt;
            st.playerY += Math.sin(pitchAngle) * maneuverSpeed * gameDt;

            // Prevent going underground
            const gManeuverGroundH = getGroundAt(st.playerX, st.playerZ) + 0.01;
            if (st.playerY < gManeuverGroundH) st.playerY = gManeuverGroundH;
          }
        } else {
          // Not maneuvering — smoothly return to normal
          if (st.gManeuver) {
            st.gManeuver = false;
          }
          st.gManeuverPitch *= 0.9; // Decay toward 0 when not holding Alt
          // Zero out tiny residual pitch
          if (Math.abs(st.gManeuverPitch) < 0.01) st.gManeuverPitch = 0;
        }
      } else {
        if (keys3d['Space'] && st.onGround && !st.deathSequence) {
          let jumpMult = st.jumpBoost;
          // Wearable feet jump bonus (e.g. Spring Boots: +30%)
          if (st.wearables.feet) {
            const feetEff = WEARABLES_3D[st.wearables.feet].effect;
            if (feetEff.jumpMult) jumpMult *= feetEff.jumpMult;
          }
          st.playerVY = st.jumpForce * jumpMult;
          st.onGround = false;
          st.onPlatformY = null;
          // BD-240: Tiered jump sounds — silent for low jumps
          if (jumpMult > 3.5) playSound('sfx_jump_huge');
          else if (jumpMult > 2.5) playSound('sfx_jump');
          else if (jumpMult > 1.75) playSound('sfx_jump_soft');
          // else: silent (base + 75% or below)
        }
        // Gravity
        st.playerVY -= GRAVITY_3D * gameDt;
        st.playerY += st.playerVY * gameDt;
      }

      // === GROUND + PLATFORM COLLISION ===
      // Ground collision (offset keeps model above terrain surface)
      const GROUND_OFFSET = 0.01;
      const groundH = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (!st.flying && st.playerY <= groundH) {
        st.playerY = groundH;
        st.playerVY = 0;
        st.onGround = true;
        st.onPlatformY = null;
      }

      // Platform collision (only when falling)
      if (!st.flying && st.playerVY <= 0) {
        for (const p of platforms) {
          const halfW = p.w / 2, halfD = p.d / 2;
          if (st.playerX > p.x - halfW && st.playerX < p.x + halfW &&
              st.playerZ > p.z - halfD && st.playerZ < p.z + halfD) {
            const platTop = p.y + 0.2;
            if (st.playerY >= platTop - 0.5 && st.playerY <= platTop + 0.5) {
              st.playerY = platTop;
              st.playerVY = 0;
              st.onGround = true;
              st.onPlatformY = platTop;
            }
          }
        }
      }

      // === PLATEAU HORIZONTAL COLLISION (BD-85) ===
      // Prevent walking through plateaus from the side. Only applies when player
      // is below the platform surface (not standing on top of it).
      if (!st.flying) {
        for (const p of platforms) {
          const platTop = p.y + 0.2;
          // Only collide horizontally if player is below the platform top
          if (st.playerY < platTop - 0.3) {
            const halfW = p.w / 2 + 0.5; // 0.5 = player radius buffer
            const halfD = p.d / 2 + 0.5;
            const dx = st.playerX - p.x;
            const dz = st.playerZ - p.z;

            if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
              // Push out along the shortest overlap axis
              const overlapX = halfW - Math.abs(dx);
              const overlapZ = halfD - Math.abs(dz);

              if (overlapX < overlapZ) {
                st.playerX += (dx > 0 ? overlapX : -overlapX);
              } else {
                st.playerZ += (dz > 0 ? overlapZ : -overlapZ);
              }
            }
          }
        }
      }

      // Min height clamp
      const groundH2 = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (st.playerY < groundH2) {
        st.playerY = groundH2;
        st.playerVY = 0;
        st.onGround = true;
      }

      // Per-frame Y clamp to prevent any clipping
      const groundHClamp = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (playerGroup.position.y < groundHClamp) st.playerY = groundHClamp;

      // === PLAYER ANIMATION (rotation, walk cycle, wings, muscle growth) ===
      animatePlayer(playerModel, st, clock, len, mx, mz);
      // BD-165: Only update muscle growth when level changes
      if (st.level !== st._lastGrowthLevel) {
        st._lastGrowthLevel = st.level;
        updateMuscleGrowth(playerModel, st.level);
      }

      // Invincibility timer
      if (st.invincible > 0) st.invincible -= gameDt;
      // Wearable equip flash timers
      if (st.wearableFlash.head > 0) st.wearableFlash.head = Math.max(0, st.wearableFlash.head - gameDt);
      if (st.wearableFlash.body > 0) st.wearableFlash.body = Math.max(0, st.wearableFlash.body - gameDt);
      if (st.wearableFlash.feet > 0) st.wearableFlash.feet = Math.max(0, st.wearableFlash.feet - gameDt);

      // BD-214: Player hurt flash — use permanent _trueColor, not ephemeral _origColor
      // BD-230: During death sequence, replace hurt flash with progressive gray-out desaturation
      if (st.playerHurtFlashCooldown > 0) st.playerHurtFlashCooldown -= gameDt;
      if (st.deathSequence) {
        // BD-230: Progressive gray-out desaturation during death
        const deathProgress = 1 - (st.deathSequenceTimer / 1.5);
        const grayMix = Math.min(deathProgress * 1.2, 0.7); // max 70% gray
        playerGroup.traverse(child => {
          if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
            const orig = child.userData._trueColor;
            const r = (orig >> 16) & 0xff;
            const g = (orig >> 8) & 0xff;
            const b = orig & 0xff;
            const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            const mr = Math.round(r + (gray - r) * grayMix);
            const mg = Math.round(g + (gray - g) * grayMix);
            const mb = Math.round(b + (gray - b) * grayMix);
            child.material.color.setHex((mr << 16) | (mg << 8) | mb);
          }
        });
      } else if (st.playerHurtFlash > 0) {
        st.playerHurtFlash -= gameDt;
        playerGroup.traverse(child => {
          if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
            const origColor = child.userData._trueColor;
            const r = ((origColor >> 16) & 0xff) * 0.5 + 255 * 0.5;
            const g = ((origColor >> 8) & 0xff) * 0.5 + 255 * 0.5;
            const b = (origColor & 0xff) * 0.5 + 255 * 0.5;
            child.material.color.setHex((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b));
          }
        });
      } else {
        // Always restore to true colors when flash is not active
        playerGroup.traverse(child => {
          if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
            child.material.color.setHex(child.userData._trueColor);
          }
        });
      }

      // BD-107: Name entry input cooldown timer (moved to BD-189 — ticks outside gameOver gate)
      // BD-126: Attack lunge animation timer
      if (st.attackAnimTimer > 0) st.attackAnimTimer -= gameDt;



      // === ACTIVE POWERUP TIMER ===
      if (st.activePowerup) {
        st.activePowerup.timer -= gameDt;
        if (st.activePowerup.timer <= 0) {
          if (st.activePowerup.def.name && st.activePowerup.def.name.includes('Wings')) playSound('sfx_powerup_wings_expire');
          st.activePowerup.def.remove(st);
          st.activePowerup = null;
        }
      }

      // === FIRE AURA DAMAGE ===
      if (st.fireAura) {
        // Spawn fire particles
        if (Math.random() < 0.3) {
          spawnFireParticle(
            Math.random() > 0.5 ? 0xff6600 : 0xff2200,
            st.playerX + (Math.random() - 0.5) * 1.5,
            st.playerY + 0.5 + Math.random(),
            st.playerZ + (Math.random() - 0.5) * 1.5,
            0.5
          );
        }
        // Damage nearby enemies
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          if (dx * dx + dz * dz < 9) { // range 3
            damageEnemy(e, 20 * gameDt, { skipProcs: true });
          }
        }
      }
      // Update fire particles
      for (let i = fireParticles.length - 1; i >= 0; i--) {
        fireParticles[i].life -= gameDt;
        fireParticles[i].mesh.position.y += gameDt * 3;
        if (fireParticles[i].life <= 0) {
          // Return to pool instead of disposing (BD-185)
          scene.remove(fireParticles[i].mesh);
          fireParticles[i].mesh.visible = false;
          firePool.release(fireParticles[i].mesh);
          fireParticles.splice(i, 1);
        }
      }

      // === FROST NOVA (freeze nearby enemies on activation) ===
      if (st.frostNova) {
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          if (dx * dx + dz * dz < 64) { // range 8
            e.frozen = true;
            e.frozenTimer = 5;
          }
        }
        // Spawn burst of frost particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 8;
          spawnFireParticle(
            0x88ccff,
            st.playerX + Math.cos(angle) * dist,
            st.playerY + 0.5 + Math.random(),
            st.playerZ + Math.sin(angle) * dist,
            1.0
          );
        }
        st.frostNova = false; // instant burst, only triggers once
      }
      // Update frozen enemies
      for (const e of st.enemies) {
        if (!e.alive || !e.frozen) continue;
        e.frozenTimer -= gameDt;
        if (e.frozenTimer <= 0) {
          e.frozen = false;
          e.body.material.color.setHex(e.bodyColor);
          e.head.material.color.setHex(e.headColor);
        } else {
          // Frozen tint
          e.body.material.color.setHex(0x88ccff);
          e.head.material.color.setHex(0xaaddff);
        }
      }

      // === BERSERKER RAGE visual (red aura particles) ===
      if (st.berserkVulnerable && Math.random() < 0.25) {
        spawnFireParticle(
          0x881111,
          st.playerX + (Math.random() - 0.5) * 1.5,
          st.playerY + 0.3 + Math.random() * 0.8,
          st.playerZ + (Math.random() - 0.5) * 1.5,
          0.4
        );
      }

      // === GHOST FORM visual (transparent player + ghost particles) ===
      if (st.ghostForm) {
        st._ghostFormWasActive = true;
        playerGroup.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = 0.3 + Math.sin(clock.elapsedTime * 6) * 0.15;
          }
        });
        if (Math.random() < 0.2) {
          spawnFireParticle(
            0xeeeeff,
            st.playerX + (Math.random() - 0.5) * 1,
            st.playerY + Math.random() * 1.5,
            st.playerZ + (Math.random() - 0.5) * 1,
            0.6, { transparent: true, opacity: 0.5 }
          );
        }
      } else if (st._ghostFormWasActive) {
        // BD-165: Restore opacity only once when ghost form deactivates
        st._ghostFormWasActive = false;
        playerGroup.traverse(child => {
          if (child.isMesh && child.material && child.material.transparent && child.material.opacity < 0.9) {
            child.material.opacity = 1;
            child.material.transparent = false;
          }
        });
      }

      // === EARTHQUAKE STOMP (shockwave on landing) ===
      if (st.earthquakeStomp) {
        const currentlyAirborne = !st.onGround;
        if (st.wasAirborne && st.onGround) {
          // Just landed - create shockwave!
          const stompDmg = st.attackDamage * st.dmgBoost * 1.5;
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = st.playerX - e.group.position.x;
            const dz = st.playerZ - e.group.position.z;
            if (dx * dx + dz * dz < 25) { // range 5
              damageEnemy(e, stompDmg);
            }
          }
          // Visual: expanding ring of brown particles
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            spawnFireParticle(
              0x8B6914,
              st.playerX + Math.cos(angle) * 2,
              st.playerY + 0.2,
              st.playerZ + Math.sin(angle) * 2,
              0.8
            );
          }
        }
        st.wasAirborne = currentlyAirborne;
      }

      // === VAMPIRE FANGS (passive regen 3 HP/s) — BD-228+239: no regen during death or at 0 HP ===
      if (st.vampireHeal && !st.deathSequence && st.hp > 0) {
        st.hp = Math.min(st.hp + 3 * gameDt, st.maxHp);
        if (Math.random() < 0.15) {
          spawnFireParticle(
            0x6a0dad,
            st.playerX + (Math.random() - 0.5) * 0.8,
            st.playerY + 0.5 + Math.random() * 0.5,
            st.playerZ + (Math.random() - 0.5) * 0.8,
            0.5
          );
        }
      }

      // === LIGHTNING SHIELD (zap nearest enemy every 0.5s) ===
      if (st.lightningShield) {
        st.lightningShieldTimer -= gameDt;
        if (st.lightningShieldTimer <= 0) {
          st.lightningShieldTimer = 0.5;
          let nearest = null, nearestDist = 25; // range 5 squared
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = st.playerX - e.group.position.x;
            const dz = st.playerZ - e.group.position.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDist) {
              nearestDist = distSq;
              nearest = e;
            }
          }
          if (nearest) {
            damageEnemy(nearest, 10 * st.dmgBoost);
            // Lightning bolt visual (line of particles from player to enemy)
            const ex = nearest.group.position.x, ez = nearest.group.position.z;
            const ey = nearest.group.position.y + 0.5;
            for (let i = 0; i < 6; i++) {
              const t = i / 5;
              spawnFireParticle(
                0x44aaff,
                st.playerX + (ex - st.playerX) * t + (Math.random() - 0.5) * 0.3,
                st.playerY + 1 + (ey - st.playerY - 1) * t,
                st.playerZ + (ez - st.playerZ) * t + (Math.random() - 0.5) * 0.3,
                0.3
              );
            }
          }
        }
        // Orbiting spark particles
        if (Math.random() < 0.3) {
          const angle = clock.elapsedTime * 4 + Math.random() * Math.PI;
          spawnFireParticle(
            0x44aaff,
            st.playerX + Math.cos(angle) * 1.5,
            st.playerY + 0.8 + Math.random() * 0.5,
            st.playerZ + Math.sin(angle) * 1.5,
            0.4
          );
        }
      }

      // === GIANT GROWTH (scale player model) ===
      if (st.giantMode) {
        playerGroup.scale.set(2, 2, 2);
      } else {
        if (playerGroup.scale.x > 1.01) {
          playerGroup.scale.set(1, 1, 1);
        }
      }

      // === TIME WARP visual (purple distortion particles around player) ===
      if (st.timeWarp && Math.random() < 0.2) {
        const angle = Math.random() * Math.PI * 2;
        spawnFireParticle(
          0x9944ff,
          st.playerX + Math.cos(angle) * 3,
          st.playerY + Math.random() * 2,
          st.playerZ + Math.sin(angle) * 3,
          0.7, { transparent: true, opacity: 0.6 }
        );
      }

      // === MIRROR IMAGE (2 orbiting clones that damage enemies) ===
      if (st.mirrorClones) {
        // Create clone groups if they don't exist
        if (st.mirrorCloneGroups.length === 0) {
          for (let c = 0; c < 2; c++) {
            const clone = new THREE.Group();
            const cloneBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 0.7, 0.4),
              new THREE.MeshLambertMaterial({ color: 0x44ffff, transparent: true, opacity: 0.6 })
            );
            cloneBody.position.y = 0.5;
            clone.add(cloneBody);
            const cloneHead = new THREE.Mesh(
              new THREE.BoxGeometry(0.35, 0.35, 0.35),
              new THREE.MeshLambertMaterial({ color: 0x88ffff, transparent: true, opacity: 0.6 })
            );
            cloneHead.position.y = 1.1;
            clone.add(cloneHead);
            scene.add(clone);
            st.mirrorCloneGroups.push({ group: clone, attackTimer: 0 });
          }
        }
        // Update clone positions (orbit around player)
        for (let c = 0; c < st.mirrorCloneGroups.length; c++) {
          const cloneData = st.mirrorCloneGroups[c];
          const angle = clock.elapsedTime * 2 + (c * Math.PI);
          const orbitR = 2.5;
          cloneData.group.position.set(
            st.playerX + Math.cos(angle) * orbitR,
            st.playerY,
            st.playerZ + Math.sin(angle) * orbitR
          );
          cloneData.group.rotation.y = angle + Math.PI;
          // Clone attacks nearby enemies every 0.8s
          cloneData.attackTimer -= gameDt;
          if (cloneData.attackTimer <= 0) {
            cloneData.attackTimer = 0.8;
            for (const e of st.enemies) {
              if (!e.alive || e.dying) continue;
              const dx = cloneData.group.position.x - e.group.position.x;
              const dz = cloneData.group.position.z - e.group.position.z;
              if (dx * dx + dz * dz < 9) { // range 3
                damageEnemy(e, st.attackDamage * st.dmgBoost * 0.5);
                break; // one target per attack
              }
            }
          }
        }
      } else {
        // Remove clones when powerup ends
        if (st.mirrorCloneGroups.length > 0) {
          for (const cloneData of st.mirrorCloneGroups) {
            disposeSceneObject(cloneData.group);
          }
          st.mirrorCloneGroups = [];
        }
      }

      // === BOMB TRAIL (drop bombs as player moves) ===
      if (st.bombTrail) {
        st.bombTrailTimer -= gameDt;
        if (st.bombTrailTimer <= 0) {
          st.bombTrailTimer = 0.5;
          // Create bomb at player position
          const bomb = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0xff6622 })
          );
          bomb.position.set(st.playerX, st.playerY + 0.3, st.playerZ);
          scene.add(bomb);
          st.bombTrailBombs.push({ mesh: bomb, timer: 1.5, x: st.playerX, z: st.playerZ });
        }
      }
      // Update bombs (countdown + explosion)
      for (let i = st.bombTrailBombs.length - 1; i >= 0; i--) {
        const b = st.bombTrailBombs[i];
        b.timer -= gameDt;
        // Flashing as timer runs down
        const flash = Math.sin(b.timer * 12) > 0;
        b.mesh.material.color.setHex(flash ? 0xff6622 : 0xff2200);
        if (b.timer <= 0) {
          // Explode! Damage enemies within range 3
          for (const e of st.enemies) {
            if (!e.alive || e.dying) continue;
            const dx = b.x - e.group.position.x;
            const dz = b.z - e.group.position.z;
            if (dx * dx + dz * dz < 9) {
              damageEnemy(e, st.attackDamage * st.dmgBoost);
            }
          }
          // Explosion particles
          for (let j = 0; j < 10; j++) {
            spawnFireParticle(
              Math.random() > 0.5 ? 0xff6622 : 0xff2200,
              b.x + (Math.random() - 0.5) * 2,
              b.mesh.position.y + Math.random() * 1.5,
              b.z + (Math.random() - 0.5) * 2,
              0.5
            );
          }
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          st.bombTrailBombs.splice(i, 1);
        }
      }

      // === REGEN BURST (rapid healing) — BD-228+239: no regen during death or at 0 HP ===
      if (st.regenBurst && !st.deathSequence && st.hp > 0) {
        st.hp = Math.min(st.hp + (st.maxHp / 5) * gameDt, st.maxHp);
        if (Math.random() < 0.25) {
          spawnFireParticle(
            0x33ff33,
            st.playerX + (Math.random() - 0.5) * 1,
            st.playerY + 0.3 + Math.random() * 1.2,
            st.playerZ + (Math.random() - 0.5) * 1,
            0.6
          );
        }
      }

      // === WEAPONS (auto-fire) ===
      if (!st.deathSequence) updateWeapons(gameDt); // BD-228: stop auto-fire during death
      updateWeaponProjectiles(gameDt); // BD-228: projectiles in flight continue at gameDt
      updateWeaponEffects(gameDt); // BD-228: effects continue at gameDt

      // === INITIAL BURST (one-time, 10 enemies in a ring) ===
      if (!st.initialBurstDone) {
        st.initialBurstDone = true;
        for (let i = 0; i < INITIAL_BURST_COUNT; i++) {
          const dist = 15 + Math.random() * 5;
          const pos = getValidSpawnPos(dist, st.playerX, st.playerZ);
          if (!pos) continue; // BD-217: skip if too close to player
          st.enemies.push(createEnemy(pos.x, pos.z, INITIAL_BURST_HP, 1));
        }
      }

      // === AMBIENT SPAWNS ===
      // BD-228: Stop spawning during death sequence
      if (!st.deathSequence) {
        st.ambientSpawnTimer -= gameDt;
        if (st.ambientSpawnTimer <= 0) {
          spawnAmbient();
          st.ambientSpawnTimer = AMBIENT_SPAWN_INTERVAL;
        }
      }

      // === AMBIENT CRATE SPAWN (every 30s) ===
      if (!st.deathSequence) {
        st.ambientCrateTimer -= gameDt;
        if (st.ambientCrateTimer <= 0) {
          st.ambientCrateTimer = AMBIENT_CRATE_INTERVAL / st.powerupFreqMult;
          const ca = Math.random() * Math.PI * 2;
          const cx = st.playerX + Math.cos(ca) * 15;
          const cz = st.playerZ + Math.sin(ca) * 15;
          st.powerupCrates.push(createPowerupCrate(cx, cz));
        }
      }

      // === AMBIENT ITEM SPAWN (every 45-60s) ===
      if (!st.deathSequence) {
        st.ambientItemTimer -= gameDt;
        if (st.ambientItemTimer <= 0) {
          st.ambientItemTimer = 45 + Math.random() * 15;
          const ia = Math.random() * Math.PI * 2;
          const ix = st.playerX + Math.cos(ia) * 18;
          const iz = st.playerZ + Math.sin(ia) * 18;
          const pickup = createItemPickup(ix, iz);
          if (pickup) st.itemPickups.push(pickup);
        }
      }

      // === WAVE EVENTS (every 3 minutes) ===
      // BD-228: Freeze wave timer during death sequence (no new waves)
      if (!st.deathSequence) {
        st.waveEventTimer -= gameDt;
        if (st.waveEventTimer <= WAVE_WARNING_DURATION && st.waveWarning === 0) {
          st.waveWarning = WAVE_WARNING_DURATION; // Start countdown
        }
      }
      if (st.waveWarning > 0 && !st.deathSequence) {
        st.waveWarning -= gameDt;
        if (st.waveWarning <= 0) {
          st.waveWarning = 0;
          spawnWaveEvent();
          st.waveEventTimer = WAVE_EVENT_INTERVAL; // Reset for next wave
          st.waveTimerMax = WAVE_EVENT_INTERVAL;
        }
      }

      // === TERRAIN CHUNKS (throttled) ===
      chunkUpdateTimer -= gameDt;
      if (chunkUpdateTimer <= 0) {
        updateChunks(st.playerX, st.playerZ);
        updatePlatformChunks(st.playerX, st.playerZ);
        chunkUpdateTimer = 0.5;
      }

      // BD-211: Track player velocity for boss target-leading
      if (gameDt > 0) {
        st.playerVelX = (st.playerX - st.playerPrevX) / gameDt;
        st.playerVelZ = (st.playerZ - st.playerPrevZ) / gameDt;
      }
      st.playerPrevX = st.playerX;
      st.playerPrevZ = st.playerZ;

      // === ENEMY AI ===
      // Each zombie: chases player, jumps to reach platforms, deals contact damage,
      // shows hurt flash, and is despawned if too far away (>60 units).
      // Frozen enemies (from Frost Nova) skip movement until their timer expires.
      for (const e of st.enemies) {
        if (!e.alive) continue;
        if (e.dying) {
          e.deathTimer -= gameDt;
          const t = Math.max(0, e.deathTimer / 0.3);
          e.group.scale.setScalar(t * (e.isBoss ? 3 : (e.tier >= 9 ? 1.5 : 1))); // BD-211: account for boss scale
          e.group.position.y -= gameDt * 2;
          if (e.deathTimer <= 0) {
            disposeEnemy(e);
          }
          continue;
        }
        if (e.frozen) continue; // Frost Nova: frozen enemies don't move
        // BD-224: Boss entrance animation — scale up from near-zero over 1.5s
        if (e.entranceActive) {
          e.entranceTimer -= dt;
          const t = 1 - (e.entranceTimer / 1.5); // 0 to 1 progress
          const easeOut = 1 - Math.pow(1 - t, 3); // cubic ease-out
          const targetScale = e.entranceTargetScale || BOSS_SCALE;
          e.group.scale.setScalar(easeOut * targetScale);
          // Brown ground crack particles radiating outward from boss feet
          if (Math.random() < 0.3) {
            const pa = Math.random() * Math.PI * 2;
            const pr = Math.random() * 2.0 * easeOut; // spread grows with scale
            const brownColors = [0x8B4513, 0x654321, 0x5C4033, 0x3E2723];
            const pColor = brownColors[Math.floor(Math.random() * brownColors.length)];
            spawnFireParticle(
              pColor,
              e.group.position.x + Math.cos(pa) * pr,
              e.group.position.y + 0.1,
              e.group.position.z + Math.sin(pa) * pr,
              0.5
            );
          }
          if (e.entranceTimer <= 0) {
            e.entranceActive = false;
            // Snap to full scale
            e.group.scale.setScalar(targetScale);
            // Screen shake on entrance completion
            triggerScreenShake(0.4, 0.5);
            // Title card floating text
            const isTitan = (e.tier === 9);
            const title = isTitan ? 'TITAN' : (e.tier >= 10 ? 'OVERLORD' : 'BOSS');
            const titleColor = isTitan ? '#ffd700' : (e.tier >= 10 ? '#ff0000' : '#ff4400');
            addFloatingText(title, titleColor, e.group.position.x, e.group.position.y + 3, e.group.position.z, 3.0, true);
            // Boss entrance sound
            playSound('sfx_boss_entrance');
          }
          continue; // Skip all attack/movement logic during entrance
        }

        // BD-223: Summoned zombie lifetime — fade and despawn when timer expires
        if (e.isSummoned && e.summonLifetime !== undefined) {
          e.summonLifetime -= gameDt;
          // Fade out over final 1s
          if (e.summonLifetime <= 1.0) {
            const fadeAlpha = Math.max(0, e.summonLifetime / 1.0);
            e.group.traverse(c => {
              if (c.isMesh && c.material) {
                c.material.transparent = true;
                c.material.opacity = fadeAlpha;
              }
            });
          }
          if (e.summonLifetime <= 0) {
            disposeEnemy(e);
            continue;
          }
        }

        // Mud slow timer decrement — restore speed when expired
        if (e._mudSlowed) {
          e._mudSlowTimer -= gameDt;
          if (e._mudSlowTimer <= 0) {
            e._mudSlowed = false;
            if (!e._turdSlowed && !e._snowSlowed) e.speed = e._origSpeed || e.speed;
          }
        }
        // Turd mine slow timer decrement — restore speed when expired
        if (e._turdSlowed) {
          e._turdSlowTimer -= gameDt;
          if (e._turdSlowTimer <= 0) {
            e._turdSlowed = false;
            if (!e._mudSlowed && !e._snowSlowed) e.speed = e._origSpeed || e.speed;
          }
        }
        // Snowball slow timer decrement — restore speed when expired
        if (e._snowSlowed) {
          e._snowSlowTimer -= gameDt;
          if (e._snowSlowTimer <= 0) {
            e._snowSlowed = false;
            if (!e._mudSlowed && !e._turdSlowed) e.speed = e._origSpeed || e.speed;
          }
        }
        // Snowball freeze timer decrement
        if (e._snowFrozen) {
          e._snowFreezeTimer -= gameDt;
          if (e._snowFreezeTimer <= 0) {
            e._snowFrozen = false;
          } else {
            continue; // Skip movement while frozen
          }
        }
        // Stink poison DoT timer
        if (e._stinkPoisoned) {
          e._stinkPoisonTimer -= gameDt;
          if (e._stinkPoisonTimer <= 0) {
            e._stinkPoisoned = false;
          } else {
            damageEnemy(e, e._stinkPoisonDmg * gameDt, { skipProcs: true });
            if (!e.alive) continue;
          }
        }
        // === ZOMBIE SPECIAL ATTACKS (BD-84 / BD-145 / BD-166+167+179) ===
        // BD-166: Update body flash timer
        if (e._attackFlashTimer > 0) {
          e._attackFlashTimer -= gameDt;
          if (e._attackFlashTimer <= 0 && e.body) {
            e.body.material.color.setHex(e.bodyColor);
            // BD-219: Don't clear emissive if desperation pulse is active (Overlord phase 4)
            if (e.body.material.emissive && !e._desperationPulse) e.body.material.emissive.setHex(0x000000);
          }
        }
        // BD-179: Difficulty-based damage multiplier
        const diffDmgMult = st.difficulty === 'chill' ? 0.5 : st.difficulty === 'easy' ? 0.75 : st.difficulty === 'hard' ? 1.3 : 1.0;
        // Tiers 2-6: Unique telegraphed attacks (BD-145)
        // Titan (tier 9): Shockwave Slam — telegraphed AoE ground pound (BD-84)
        // Overlord (tier 10): Death Bolt — telegraphed ranged projectile (BD-84)
        if (e.tier >= 2 && e.tier <= 6 && e.specialAttackTimer !== undefined) {
          e.specialAttackTimer -= gameDt;
          if (handleLowTierSpecialAttack(e, gameDt)) continue; // skip movement during telegraph
        }
        // BD-211: Boss aura pulse animation for tier 9/10
        if (e.tier >= 9 && e.bossAuraMesh) {
          const auraPulse = 0.08 + 0.07 * Math.sin(performance.now() * 0.003);
          e.bossAuraMesh.material.opacity = auraPulse;
        }
        // BD-218: Boss HP phase transition system for tier 9/10
        if (e.tier >= 9 && e.bossPhase > 0) {
          const hpPct = e.hp / e.maxHp;
          const isChill = st.difficulty === 'chill';
          let newPhase = 1;
          if (e.tier >= 10) {
            // Overlord: 4 phases
            if (hpPct <= (isChill ? 0.12 : 0.25)) newPhase = 4;
            else if (hpPct <= (isChill ? 0.30 : 0.50)) newPhase = 3;
            else if (hpPct <= (isChill ? 0.55 : 0.75)) newPhase = 2;
          } else {
            // Titan: 3 phases
            if (hpPct <= (isChill ? 0.15 : 0.30)) newPhase = 3;
            else if (hpPct <= (isChill ? 0.40 : 0.60)) newPhase = 2;
          }
          // One-directional ratchet — phase only increases, never decreases
          newPhase = Math.max(e.bossPhase, newPhase);
          if (newPhase > e.bossPhase) {
            e.bossPhase = newPhase;
            // BD-226: Phase 4 speed boost — +30% movement speed for Overlord
            if (newPhase === 4 && e.tier >= 10) {
              e.speed = (e._bossBaseSpeed || e.speed) * 1.3;
            }
            // Phase transition effects
            const tierName = e.tier >= 10 ? 'OVERLORD' : 'TITAN';
            const phaseLabels = e.tier >= 10
              ? { 2: `${tierName} AWAKENS!`, 3: `${tierName} ENRAGED!`, 4: `${tierName} BERSERK!` }
              : { 2: `${tierName} ENRAGED!`, 3: `${tierName} BERSERK!` };
            const phaseColors = e.tier >= 10
              ? { 2: '#ff8800', 3: '#ff4400', 4: '#ff0000' }
              : { 2: '#ff6600', 3: '#ff0000' };
            const label = phaseLabels[newPhase] || `${tierName} PHASE ${newPhase}!`;
            const color = phaseColors[newPhase] || '#ff0000';
            addFloatingText(label, color, e.group.position.x, e.group.position.y + 4, e.group.position.z, 2.0, true);
            triggerScreenShake(0.3, 0.4);
            playSound('sfx_boss_phase_transition');
            // Body flash to signal the phase change
            e._attackFlashTimer = 0.3;
            if (e.body) {
              e.body.material.color.setHex(0xffffff);
              if (e.body.material.emissive) e.body.material.emissive.setHex(0xffffff);
            }
            // Pause attack timer to prevent immediate attack during transition
            if (e.specialAttackTimer !== undefined) {
              e.specialAttackTimer += 0.5;
            }
          }
        }
        // BD-219: Persistent boss phase visuals (additive — each phase keeps previous visuals)
        if (e.tier >= 9 && e.bossPhase > 0 && !e.dying) {
          const bs = e._bossScale || 1;
          if (e.tier < 10) {
            // === TITAN (tier 9) Phase Visuals ===
            // Phase 2: Crack lines across torso
            if (e.bossPhase >= 2 && !e._phase2Visuals) {
              e._phase2Visuals = true;
              const crackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
              for (let ci = 0; ci < 3; ci++) {
                const crackW = (0.3 + Math.random() * 0.2) * bs;
                const crackH = 0.02 * bs;
                const crackD = 0.02 * bs;
                const cx = (Math.random() - 0.5) * 0.3 * bs;
                const cy = (0.6 + Math.random() * 0.35) * bs;
                const cz = 0.18 * bs; // front face of torso
                const crack = new THREE.Mesh(
                  new THREE.BoxGeometry(crackW, crackH, crackD),
                  crackMat
                );
                crack.position.set(cx, cy, cz);
                crack.rotation.z = (Math.random() - 0.5) * 0.5; // slight angle variation
                e.group.add(crack);
              }
            }
            // Phase 3: Eyes turn white with emissive glow + steam particles flag
            if (e.bossPhase >= 3 && !e._phase3Visuals) {
              e._phase3Visuals = true;
              e._steamParticles = true;
              // Turn eyes white with emissive glow
              if (e.eyeGlowMat) {
                e.eyeGlowMat.color.setHex(0xffffff);
                // Switch from MeshBasicMaterial to emissive appearance by setting color to bright white
                // MeshBasicMaterial doesn't support emissive, but the bright white color creates the glow effect
              }
            }
            // Phase 3+: Emit steam particles upward from body (~15% chance per frame)
            if (e._steamParticles && Math.random() < 0.15) {
              const groupScale = e.group.scale.x || 1.5; // BD-211: boss group is 1.5x scaled
              const steamX = e.group.position.x + (Math.random() - 0.5) * 0.6 * bs * groupScale;
              const steamY = e.group.position.y + (0.8 + Math.random() * 0.6) * bs * groupScale;
              const steamZ = e.group.position.z + (Math.random() - 0.5) * 0.4 * bs * groupScale;
              // Gray-white steam particle rising upward
              const steamColor = Math.random() < 0.5 ? 0xcccccc : 0xeeeeee;
              spawnFireParticle(
                steamColor,
                steamX, steamY, steamZ,
                0.6, // slightly longer life than ground rumble
                { transparent: true, opacity: 0.4 }
              );
            }
          } else {
            // === OVERLORD (tier 10) Phase Visuals ===
            // Phase 2: Crown particle rate increase + body color lerp to purple tint
            if (e.bossPhase >= 2 && !e._phase2Visuals) {
              e._phase2Visuals = true;
              e._crownParticleBoost = true;
              // Lerp body color from 0xaa0000 to 0x880044 (purple tint)
              if (e.body) {
                e.body.material.color.setHex(0x880044);
                e.bodyColor = 0x880044; // update stored color so flash restoration uses new color
              }
            }
            // Phase 2+: Boosted crown fire particles (~20% chance per frame, up from base rumble)
            if (e._crownParticleBoost && Math.random() < 0.20) {
              const crownAngle = Math.random() * Math.PI * 2;
              const groupScale = e.group.scale.x || 1.5; // BD-211: boss group is 1.5x scaled
              const crownR = 0.18 * bs * groupScale;
              const cpx = e.group.position.x + Math.cos(crownAngle) * crownR;
              const cpy = e.group.position.y + 1.55 * bs * groupScale;
              const cpz = e.group.position.z + Math.sin(crownAngle) * crownR;
              const fireColor = e._crownFireColor || 0xff4400;
              spawnFireParticle(
                fireColor,
                cpx, cpy, cpz,
                0.35,
                { transparent: true, opacity: 0.7 }
              );
            }
            // Phase 3: Crown fire turns blue-white
            if (e.bossPhase >= 3 && !e._phase3Visuals) {
              e._phase3Visuals = true;
              e._crownFireColor = 0xccccff;
              // Update existing crown mesh colors to blue-white
              if (e.crownMeshes && e.crownMeshes.length > 0) {
                for (const cm of e.crownMeshes) {
                  cm.material.color.setHex(0xccccff);
                }
              }
            }
            // Phase 4: Desperation pulse — sinusoidal emissive on all body meshes
            if (e.bossPhase >= 4 && !e._phase4Visuals) {
              e._phase4Visuals = true;
              e._desperationPulse = true;
              // Convert body material to MeshLambertMaterial for emissive support if needed
              if (e.body && !e.body.material.emissive) {
                const oldColor = e.body.material.color.getHex();
                const newMat = new THREE.MeshLambertMaterial({ color: oldColor });
                e.body.material.dispose();
                e.body.material = newMat;
              }
            }
            // Phase 4+: Sinusoidal emissive pulse every frame
            if (e._desperationPulse) {
              const t = performance.now();
              const pulseIntensity = 0.3 + Math.sin(t * 0.008) * 0.2;
              // Pulse body mesh
              if (e.body && e.body.material.emissive) {
                e.body.material.emissive.setHex(0xff0044);
                e.body.material.emissiveIntensity = pulseIntensity;
              }
              // Pulse head mesh
              if (e.head && e.head.material) {
                if (!e.head.material.emissive) {
                  const headColor = e.head.material.color.getHex();
                  const newHeadMat = new THREE.MeshLambertMaterial({ color: headColor });
                  e.head.material.dispose();
                  e.head.material = newHeadMat;
                }
                if (e.head.material.emissive) {
                  e.head.material.emissive.setHex(0xff0044);
                  e.head.material.emissiveIntensity = pulseIntensity;
                }
              }
            }
          }
        }
        // BD-211: Boss rumble — spawn subtle ground particles when boss is close
        if (e.tier >= 9 && !e.dying) {
          const rumbleDx = st.playerX - e.group.position.x;
          const rumbleDz = st.playerZ - e.group.position.z;
          const rumbleDistSq = rumbleDx * rumbleDx + rumbleDz * rumbleDz;
          if (rumbleDistSq < 400 && Math.random() < 0.08) { // within 20 units, ~5/s
            const pa = Math.random() * Math.PI * 2;
            const pr = Math.random() * 1.5;
            spawnFireParticle(
              e.tier >= 10 ? 0xff0000 : 0xcc2200,
              e.group.position.x + Math.cos(pa) * pr,
              e.group.position.y + 0.1,
              e.group.position.z + Math.sin(pa) * pr,
              0.4,
              { transparent: true, opacity: 0.5 }
            );
          }
        }
        if (e.tier >= 9 && e.specialAttackTimer !== undefined) {
          e.specialAttackTimer -= gameDt;

          // BD-179: Chill mode telegraph duration multiplier
          const telegraphDurMult = st.difficulty === 'chill' ? 1.5 : 1.0;
          const isChill = st.difficulty === 'chill';
          // BD-211: Massively expanded trigger ranges (was 12/18, now 25/35)
          const atkDx = st.playerX - e.group.position.x;
          const atkDz = st.playerZ - e.group.position.z;
          const atkDist = Math.sqrt(atkDx * atkDx + atkDz * atkDz);
          const triggerRange = e.tier >= 10 ? 35 : 25;

          // BD-220/221: Phase-based cooldown multiplier
          const phaseCooldownMult = e.bossPhase >= 3 ? 0.75 : e.bossPhase >= 2 ? 0.85 : 1.0;

          // === BD-221: Titan Charge state machine (runs independently of specialAttackState) ===
          if (e.tier === 9 && e._chargeState) {
            if (e._chargeState === 'telegraph') {
              e._chargeTimer -= dt;
              // Hunch animation during telegraph
              e.group.scale.set(1.5 * 1.1, 1.5 * 0.8, 1.5 * 1.1);
              // Pulse aim line opacity
              if (e._chargeTelegraphMesh && e._chargeTelegraphMesh.material) {
                const tp = performance.now() * 0.012;
                e._chargeTelegraphMesh.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(tp));
              }
              if (e._chargeTimer <= 0) {
                // Transition to charging
                e._chargeState = 'charging';
                const baseChargeSpeed = ZOMBIE_TIERS[8].speed * (isChill ? 2 : 3);
                e._chargeSpeed = baseChargeSpeed;
                e._chargeDistLeft = 15;
                e.group.scale.setScalar(1.5); // restore scale
                // BD-225: Remove telegraph mesh
                if (e._chargeTelegraphMesh) {
                  disposeTempMesh(e._chargeTelegraphMesh);
                  e._chargeTelegraphMesh = null;
                }
              }
              continue; // freeze during telegraph
            } else if (e._chargeState === 'charging') {
              const chargeDist = e._chargeSpeed * dt;
              e.group.position.x += e._chargeDirX * chargeDist;
              e.group.position.z += e._chargeDirZ * chargeDist;
              e._chargeDistLeft -= chargeDist;
              // Check player collision (2-unit radius)
              const cDx = st.playerX - e.group.position.x;
              const cDz = st.playerZ - e.group.position.z;
              if (cDx * cDx + cDz * cDz < 4) {
                const chargeDmg = isChill ? 15 : 30;
                damagePlayer(chargeDmg * diffDmgMult, '#ff4400', { type: 'titanCharge', tierName: ZOMBIE_TIERS[8].name, tier: 9, color: ZOMBIE_TIERS[8].eye });
                triggerScreenShake(0.4, 0.3); // BD-225: Titan Charge hit screen shake (was 0.25, 0.2)
              }
              // Spawn dust particles along charge path
              if (Math.random() < 0.4) {
                spawnFireParticle(0x886644, e.group.position.x + (Math.random() - 0.5), e.group.position.y + 0.2, e.group.position.z + (Math.random() - 0.5), 0.3);
              }
              if (e._chargeDistLeft <= 0) {
                // Transition to recovery
                e._chargeState = 'recovery';
                e._chargeTimer = isChill ? 3 : 2;
                e.group.scale.setScalar(1.5); // ensure scale is normal
              }
              continue; // skip normal movement during charge
            } else if (e._chargeState === 'recovery') {
              e._chargeTimer -= dt;
              // Flash white during recovery — punishment window
              if (e.body) {
                const flashRate = Math.sin(performance.now() * 0.015) > 0;
                e.body.material.color.setHex(flashRate ? 0xffffff : e.bodyColor);
              }
              if (e._chargeTimer <= 0) {
                e._chargeState = null;
                if (e.body) e.body.material.color.setHex(e.bodyColor);
              }
              continue; // frozen during recovery (punishment window)
            }
          }

          // === BD-221: Ground Fissures state machine (runs independently) ===
          if (e.tier === 9 && e._fissureState) {
            if (e._fissureState === 'telegraph') {
              e._fissureTimer -= dt;
              // Pulse fissure line opacity during telegraph
              for (const fd of e._fissureData) {
                if (fd.mesh && fd.mesh.material) {
                  fd.mesh.material.opacity = 0.3 + 0.3 * Math.abs(Math.sin(performance.now() * 0.01));
                }
              }
              if (e._fissureTimer <= 0) {
                // Eruption! Flash lines red-orange and deal damage
                e._fissureState = 'erupting';
                e._fissureTimer = 1.5;
                triggerScreenShake(0.25, 0.25);
                playSound('sfx_boss_slam_impact');
                // Flash all fissure lines red-orange
                for (const fd of e._fissureData) {
                  if (fd.mesh && fd.mesh.material) {
                    fd.mesh.material.color.setHex(0xff4400);
                    fd.mesh.material.opacity = 0.8;
                  }
                }
                // Damage check: perpendicular distance < 1 unit from each line
                const fissureDmg = (isChill ? 10 : 20) * diffDmgMult;
                let fissureHit = false;
                for (const fd of e._fissureData) {
                  // Line from (startX,startZ) to (endX,endZ), check perpendicular distance to player
                  const lx = fd.endX - fd.startX;
                  const lz = fd.endZ - fd.startZ;
                  const lineLen = Math.sqrt(lx * lx + lz * lz) || 1;
                  // Project player position onto line
                  const px = st.playerX - fd.startX;
                  const pz = st.playerZ - fd.startZ;
                  const t = Math.max(0, Math.min(1, (px * lx + pz * lz) / (lineLen * lineLen)));
                  const closestX = fd.startX + t * lx;
                  const closestZ = fd.startZ + t * lz;
                  const perpDx = st.playerX - closestX;
                  const perpDz = st.playerZ - closestZ;
                  const perpDist = Math.sqrt(perpDx * perpDx + perpDz * perpDz);
                  if (perpDist < 1.0) {
                    fissureHit = true;
                    break;
                  }
                }
                if (fissureHit) {
                  damagePlayer(fissureDmg, '#884422', { type: 'groundFissures', tierName: ZOMBIE_TIERS[8].name, tier: 9, color: ZOMBIE_TIERS[8].eye });
                }
                // Spawn eruption particles along fissure lines
                for (const fd of e._fissureData) {
                  for (let pi = 0; pi < 6; pi++) {
                    const t2 = pi / 5;
                    const px2 = fd.startX + t2 * (fd.endX - fd.startX);
                    const pz2 = fd.startZ + t2 * (fd.endZ - fd.startZ);
                    spawnFireParticle(0xff4400, px2, 0.5, pz2, 0.6);
                    spawnFireParticle(0x884422, px2 + (Math.random() - 0.5) * 0.5, 0.8, pz2 + (Math.random() - 0.5) * 0.5, 0.5);
                  }
                }
              }
              continue; // freeze during telegraph
            } else if (e._fissureState === 'erupting') {
              e._fissureTimer -= dt;
              // Fade out fissure lines
              for (const fd of e._fissureData) {
                if (fd.mesh && fd.mesh.material) {
                  fd.mesh.material.opacity = Math.max(0, 0.8 * (e._fissureTimer / 1.5));
                }
              }
              if (e._fissureTimer <= 0) {
                // BD-225: Dispose all fissure meshes using disposeTempMesh
                for (const fd of e._fissureData) {
                  if (fd.mesh) disposeTempMesh(fd.mesh);
                }
                e._fissureData = [];
                e._fissureMeshes = [];
                e._fissureState = null;
              }
              // Don't freeze during eruption visual persist — let enemy move
            }
          }

          // === BD-226: Dark Nova state machine (runs independently for Overlord) ===
          if (e.tier >= 10 && e._darkNovaState) {
            e._darkNovaTimer -= dt;

            if (e._darkNovaState === 'floatUp') {
              // Float boss upward over 1s (2s Chill)
              const floatDur = isChill ? 2.0 : 1.0;
              const floatProgress = 1 - (e._darkNovaTimer / floatDur);
              e.group.position.y = e._darkNovaOriginY + Math.min(floatProgress, 1) * 3;
              // Converging dark red particles
              if (Math.random() < 0.3) {
                const pa = Math.random() * Math.PI * 2;
                const pr = 3 + Math.random() * 5;
                spawnFireParticle(
                  0x880000,
                  e.group.position.x + Math.cos(pa) * pr,
                  e.group.position.y + Math.random() * 2,
                  e.group.position.z + Math.sin(pa) * pr,
                  0.6
                );
              }
              if (e._darkNovaTimer <= 0) {
                // Slam down
                e._darkNovaState = 'slam';
                e._darkNovaTimer = 0.1; // brief slam moment
                e.group.position.y = e._darkNovaOriginY;
                // Maximum screen shake
                triggerScreenShake(0.5, 0.5);
                playSound('sfx_explosion');
                // Create expanding ring mesh
                const ringGeo = new THREE.RingGeometry(3.5, 4.5, 48);
                ringGeo.rotateX(-Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({
                  color: 0x880000, transparent: true, opacity: 0.8, side: THREE.DoubleSide
                });
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.position.set(e.group.position.x, 0.2, e.group.position.z);
                scene.add(ringMesh);
                e._darkNovaRingMesh = ringMesh;
                e._darkNovaRingRadius = 4;
                e._darkNovaHasHit = false;
                // BD-226: First-time "GET CLOSE!" hint
                if (!e._bossDarkNovaHintShown) {
                  e._bossDarkNovaHintShown = true;
                  addFloatingText('GET CLOSE!', '#44ff44', e.group.position.x, e.group.position.y + 5, e.group.position.z, 3, true);
                }
              }
            } else if (e._darkNovaState === 'slam') {
              // Brief pause, then transition to ring expansion
              if (e._darkNovaTimer <= 0) {
                e._darkNovaState = 'ring';
                const ringDur = isChill ? 3.0 : 2.0;
                e._darkNovaTimer = ringDur;
              }
            } else if (e._darkNovaState === 'ring') {
              // Expand ring from radius 4 to 30
              const ringDur = isChill ? 3.0 : 2.0;
              const ringProgress = 1 - (e._darkNovaTimer / ringDur);
              e._darkNovaRingRadius = 4 + ringProgress * 26; // 4 -> 30
              if (e._darkNovaRingMesh) {
                const scale = e._darkNovaRingRadius / 4; // base ring is radius 4
                e._darkNovaRingMesh.scale.set(scale, 1, scale);
                e._darkNovaRingMesh.material.opacity = 0.8 * (1 - ringProgress * 0.7);
              }
              // Damage check — safe zone within 4 units (6 in Chill) of boss
              if (!e._darkNovaHasHit) {
                const pdx = st.playerX - e.group.position.x;
                const pdz = st.playerZ - e.group.position.z;
                const playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
                const safeRadius = isChill ? 6 : 4;
                const ringInner = e._darkNovaRingRadius - 2;
                const ringOuter = e._darkNovaRingRadius + 1;
                // Player gets hit if within the ring band AND outside safe zone
                if (playerDist >= ringInner && playerDist <= ringOuter && playerDist > safeRadius) {
                  const novaDmg = isChill ? 25 : 50;
                  damagePlayer(novaDmg, '#880000', { type: 'darkNova', tierName: ZOMBIE_TIERS[9].name, tier: 10, color: ZOMBIE_TIERS[9].eye });
                  e._darkNovaHasHit = true;
                }
              }
              if (e._darkNovaTimer <= 0) {
                // Cleanup ring mesh
                if (e._darkNovaRingMesh) {
                  disposeTempMesh(e._darkNovaRingMesh);
                  e._darkNovaRingMesh = null;
                }
                e._darkNovaState = null;
                e.specialAttackState = 'idle';
                // Dark Nova has 15s cooldown (22.5s Chill), with phase multiplier
                const phaseMult = e.bossPhase <= 1 ? 1.0 : e.bossPhase <= 2 ? 0.9 : 0.8;
                const chillMult = isChill ? 1.5 : 1.0;
                e.specialAttackTimer = 15 * phaseMult * chillMult + Math.random() * 2;
              }
            }
            continue; // Skip movement during Dark Nova
          }

          if (e.specialAttackState === 'idle' && e.specialAttackTimer <= 0 && atkDist < triggerRange && !e._chargeState && !e._fissureState && !e._darkNovaState) {
            // Start telegraph phase
            e.specialAttackState = 'telegraph';
            e.specialAttackTargetX = st.playerX;
            e.specialAttackTargetZ = st.playerZ;
            e.specialAttackCount = (e.specialAttackCount || 0) + 1;

            // BD-166: Universal body flash on telegraph start
            if (e.body) {
              const flashCol = e.tier >= 10 ? 0xff0000 : 0xff2200;
              e.body.material.color.setHex(flashCol);
              if (e.body.material.emissive) e.body.material.emissive.setHex(flashCol);
              e._attackFlashTimer = 0.2;
            }

            if (e.tier >= 10) {
              // === BD-222: Overlord phase-gated attack pool ===
              const attackPool = ['deathBoltVolley', 'shadowZones'];
              if (e.bossPhase >= 2) attackPool.push('summonBurst');
              if (isChill ? e.bossPhase >= 4 : e.bossPhase >= 3) attackPool.push('deathBeam');
              // BD-226: Dark Nova available at phase 4
              if (e.bossPhase >= 4) attackPool.push('darkNova');

              // Weighted random, no consecutive repeat
              let chosenAttack;
              do {
                chosenAttack = attackPool[Math.floor(Math.random() * attackPool.length)];
              } while (chosenAttack === e._lastAttack && attackPool.length > 1);
              e._lastAttack = chosenAttack;
              e._overlordAttack = chosenAttack;

              // BD-179: First-encounter floating labels for each attack
              const attackLabels = {
                deathBoltVolley: { text: 'DEATH VOLLEY!', color: '#ff0044' },
                shadowZones: { text: 'SHADOW ZONE!', color: '#440066' },
                summonBurst: { text: 'SUMMON BURST!', color: '#aa00ff' },
                deathBeam: { text: 'DEATH BEAM!', color: '#ff0000' },
                darkNova: { text: 'DARK NOVA!', color: '#880000' },
              };
              const labelInfo = attackLabels[chosenAttack];
              const labelKey = 'overlord_' + chosenAttack;
              if (labelInfo && !st.attackFirstSeen[labelKey]) {
                st.attackFirstSeen[labelKey] = true;
                addFloatingText(labelInfo.text, labelInfo.color, e.group.position.x, e.group.position.y + 4, e.group.position.z, 2.5, true);
              }

              // Set telegraph based on chosen attack
              if (chosenAttack === 'darkNova') {
                // BD-226: Dark Nova — skip telegraph, go directly to float-up state
                e.specialAttackState = 'idle'; // Will be managed by _darkNovaState
                e._darkNovaState = 'floatUp';
                e._darkNovaTimer = isChill ? 2.0 : 1.0;
                e._darkNovaOriginY = e.group.position.y;
                playSound('sfx_boss_dark_nova');
                // BD-226: First-time "GET CLOSE!" hint handled in Dark Nova state machine
                // Set cooldown so attack doesn't immediately re-trigger
                const phaseMult = e.bossPhase <= 1 ? 1.0 : e.bossPhase <= 2 ? 0.9 : 0.8;
                const chillMult = isChill ? 1.5 : 1.0;
                e.specialAttackTimer = 15 * phaseMult * chillMult + Math.random() * 2;
                continue; // skip normal attack flow, Dark Nova manages itself
              } else if (chosenAttack === 'deathBoltVolley') {
                // Death Bolt Volley telegraph — flat aim strip toward predicted position
                e.specialAttackTelegraphTimer = 0.5 * telegraphDurMult;
                const leadTime = 0.5;
                const predX = st.playerX + (st.playerVelX || 0) * leadTime;
                const predZ = st.playerZ + (st.playerVelZ || 0) * leadTime;
                e.specialAttackTargetX = predX;
                e.specialAttackTargetZ = predZ;
                const stripDx = predX - e.group.position.x;
                const stripDz = predZ - e.group.position.z;
                const stripLen = Math.sqrt(stripDx * stripDx + stripDz * stripDz) || 1;
                const stripGeo = new THREE.BoxGeometry(0.3, 0.1, stripLen);
                const stripMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
                const strip = new THREE.Mesh(stripGeo, stripMat);
                strip.position.set(
                  (e.group.position.x + predX) / 2, 0.15,
                  (e.group.position.z + predZ) / 2
                );
                strip.rotation.y = Math.atan2(stripDx, stripDz);
                scene.add(strip);
                e.specialAttackMesh = strip;

                // BD-225: Fan lines showing bolt spread directions during telegraph
                const fanBoltCount = e.bossPhase >= 3 ? (isChill ? 3 : 5) : (isChill ? 2 : 3);
                const fanSpreadAngle = e.bossPhase >= 3 ? (30 * Math.PI / 180) : (15 * Math.PI / 180);
                const baseAngle = Math.atan2(stripDx, stripDz);
                e._volleyFanLines = [];
                for (let fi = 0; fi < fanBoltCount; fi++) {
                  const angleOffset = fanBoltCount === 1 ? 0 :
                    -fanSpreadAngle / 2 + (fanSpreadAngle / (fanBoltCount - 1)) * fi;
                  const fAngle = baseAngle + angleOffset;
                  const fanLineGeo = new THREE.BoxGeometry(0.15, 0.03, 20);
                  const fanLineMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.25 });
                  const fanLine = new THREE.Mesh(fanLineGeo, fanLineMat);
                  fanLine.position.set(
                    e.group.position.x + Math.sin(fAngle) * 10, 1.5,
                    e.group.position.z + Math.cos(fAngle) * 10
                  );
                  fanLine.rotation.y = fAngle;
                  scene.add(fanLine);
                  e._volleyFanLines.push(fanLine);
                }
              } else if (chosenAttack === 'shadowZones') {
                // Shadow Zones telegraph — dark circles appear near player
                e.specialAttackTelegraphTimer = 1.5 * telegraphDurMult;
                const zoneCount = isChill ? (2 + Math.floor(Math.random() * 2)) : (3 + Math.floor(Math.random() * 3));
                const zoneGroup = new THREE.Group();
                e._shadowZonePositions = [];
                for (let sz = 0; sz < zoneCount; sz++) {
                  const szAngle = Math.random() * Math.PI * 2;
                  const szDist = 2 + Math.random() * 4;
                  const szX = st.playerX + Math.cos(szAngle) * szDist;
                  const szZ = st.playerZ + Math.sin(szAngle) * szDist;
                  e._shadowZonePositions.push({ x: szX, z: szZ });
                  const circleGeo = new THREE.CircleGeometry(3, 24);
                  circleGeo.rotateX(-Math.PI / 2);
                  const circleMat = new THREE.MeshBasicMaterial({ color: 0x220033, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
                  const circle = new THREE.Mesh(circleGeo, circleMat);
                  circle.position.set(szX, 0.05, szZ);
                  zoneGroup.add(circle);
                }
                scene.add(zoneGroup);
                e.specialAttackMesh = zoneGroup;
                e.specialAttackMesh.isGroup = true;
              } else if (chosenAttack === 'summonBurst') {
                // Summon Burst telegraph — body tilt back, dark particles converge
                e.specialAttackTelegraphTimer = 2.0 * telegraphDurMult;
                e._summonChannelTimer = 2.0 * telegraphDurMult;
                // Visual: tilted body + dark particle convergence (handled in telegraph anim)
                e.specialAttackMesh = null; // no external telegraph mesh, anim is on enemy body
              } else if (chosenAttack === 'deathBeam') {
                // Death Beam telegraph — converging red particles, emissive ramp
                const chargeDur = isChill ? 3.0 : 2.0;
                e.specialAttackTelegraphTimer = chargeDur * telegraphDurMult;
                e._deathBeamChargeDur = chargeDur * telegraphDurMult;
                e._deathBeamBaseAngle = Math.atan2(st.playerX - e.group.position.x, st.playerZ - e.group.position.z);
                e.specialAttackMesh = null; // charge uses particles, no external mesh
              }

            } else if (e.tier === 9) {
              // BD-220/221: Phase-gated attack selection for tier 9
              // Build attack pool based on boss phase
              const attackPool = ['slam', 'shockwave']; // Phase 1: always available
              if (e.bossPhase >= 2) attackPool.push('boneBarrage');
              if (e.bossPhase >= 3) {
                attackPool.push('titanCharge');
                attackPool.push('groundFissures');
              }
              // Weighted random selection with no consecutive repeat
              let chosenAttack;
              do {
                chosenAttack = attackPool[Math.floor(Math.random() * attackPool.length)];
              } while (chosenAttack === e._lastAttack && attackPool.length > 1);
              e._lastAttack = chosenAttack;
              e._currentAttack = chosenAttack;

              // BD-179: First-encounter floating label
              const attackLabels = {
                slam: { text: 'TITAN SLAM!', color: '#ff2200', key: 'tier9slam' },
                shockwave: { text: 'SHOCKWAVE!', color: '#ff8800', key: 'tier9shockwave' },
                boneBarrage: { text: 'BONE BARRAGE!', color: '#ccbb88', key: 'tier9boneBarrage' },
                titanCharge: { text: 'TITAN CHARGE!', color: '#ff4400', key: 'tier9titanCharge' },
                groundFissures: { text: 'GROUND FISSURES!', color: '#884422', key: 'tier9groundFissures' },
              };
              const label = attackLabels[chosenAttack];
              if (label && !st.attackFirstSeen[label.key]) {
                st.attackFirstSeen[label.key] = true;
                addFloatingText(label.text, label.color, e.group.position.x, e.group.position.y + 4, e.group.position.z, 2.5, true);
              }

              // Set up telegraph based on chosen attack
              if (chosenAttack === 'shockwave') {
                e.specialAttackTelegraphTimer = 1.0 * telegraphDurMult;
                const ringGeo = new THREE.RingGeometry(0.3, 0.8, 24);
                ringGeo.rotateX(-Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(e.group.position.x, 0.1, e.group.position.z);
                scene.add(ring);
                e.specialAttackMesh = ring;
              } else if (chosenAttack === 'slam') {
                e.specialAttackTelegraphTimer = 1.5 * telegraphDurMult;
                const ringGeo = new THREE.RingGeometry(0.5, 1.0, 24);
                ringGeo.rotateX(-Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(e.group.position.x, 0.1, e.group.position.z);
                scene.add(ring);
                e.specialAttackMesh = ring;
              } else if (chosenAttack === 'boneBarrage') {
                // BD-220: Bone Barrage telegraph — red ring ground markers at landing positions
                const telegraphTime = isChill ? 1.2 : 0.8;
                e.specialAttackTelegraphTimer = telegraphTime;
                const boneCount = isChill ? 4 : (4 + Math.floor(Math.random() * 3)); // 4-6 (4 chill)
                // Predict player position slightly ahead
                const leadTime = 0.3;
                const predX = st.playerX + (st.playerVelX || 0) * leadTime;
                const predZ = st.playerZ + (st.playerVelZ || 0) * leadTime;
                e.specialAttackTargetX = predX;
                e.specialAttackTargetZ = predZ;
                // Spawn ground markers in a semicircle near player
                const group = new THREE.Group();
                e._boneBarrageLandingSpots = [];
                const dirToPlayer = Math.atan2(predX - e.group.position.x, predZ - e.group.position.z);
                for (let bi = 0; bi < boneCount; bi++) {
                  // Semicircle spread: -PI/2 to PI/2 relative to direction to player
                  const spreadAngle = dirToPlayer + ((bi / (boneCount - 1 || 1)) - 0.5) * Math.PI;
                  const dist = 2 + Math.random() * 3; // 2-5 units from predicted position
                  const landX = predX + Math.sin(spreadAngle) * dist;
                  const landZ = predZ + Math.cos(spreadAngle) * dist;
                  e._boneBarrageLandingSpots.push({ x: landX, z: landZ });
                  // Red ring ground marker
                  const markerGeo = new THREE.RingGeometry(0.3, 0.6, 16);
                  markerGeo.rotateX(-Math.PI / 2);
                  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                  const marker = new THREE.Mesh(markerGeo, markerMat);
                  marker.position.set(landX, 0.12, landZ);
                  group.add(marker);
                }
                scene.add(group);
                e.specialAttackMesh = group;
                e.specialAttackMesh.isGroup = true;
              } else if (chosenAttack === 'titanCharge') {
                // BD-221: Titan Charge — lock direction, start telegraph
                e.specialAttackState = 'idle'; // we handle charge via _chargeState
                const chargeTime = isChill ? 2.25 : 1.5;
                e._chargeState = 'telegraph';
                e._chargeTimer = chargeTime;
                // Lock direction toward player at telegraph start
                const cdx = st.playerX - e.group.position.x;
                const cdz = st.playerZ - e.group.position.z;
                const cDist = Math.sqrt(cdx * cdx + cdz * cdz) || 1;
                e._chargeDirX = cdx / cDist;
                e._chargeDirZ = cdz / cDist;
                // Create aim line on ground (thin red box mesh, 15 units long)
                const lineLen = 15;
                const lineGeo = new THREE.BoxGeometry(0.2, 0.08, lineLen);
                const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
                const lineMesh = new THREE.Mesh(lineGeo, lineMat);
                lineMesh.position.set(
                  e.group.position.x + e._chargeDirX * lineLen / 2,
                  0.15,
                  e.group.position.z + e._chargeDirZ * lineLen / 2
                );
                lineMesh.rotation.y = Math.atan2(e._chargeDirX, e._chargeDirZ);
                scene.add(lineMesh);
                e._chargeTelegraphMesh = lineMesh;
                triggerScreenShake(0.2, 0.2); // BD-225: Titan Charge start screen shake
                playSound('sfx_boss_charge_telegraph');
                // Reset cooldown with attack-specific cooldown
                const baseCooldown = 10 * phaseCooldownMult * (isChill ? 1.5 : 1);
                e.specialAttackTimer = baseCooldown + Math.random() * 1;
                continue; // skip normal attack flow
              } else if (chosenAttack === 'groundFissures') {
                // BD-221: Ground Fissures — create brown lines in forward arc
                e.specialAttackState = 'idle'; // we handle fissures via _fissureState
                const telegraphTime = isChill ? 1.8 : 1.2;
                e._fissureState = 'telegraph';
                e._fissureTimer = telegraphTime;
                const fissureCount = isChill ? 2 : 3;
                const arcSpread = isChill ? (80 * Math.PI / 180) : (120 * Math.PI / 180);
                const fissureLen = 12;
                const dirAngle = Math.atan2(st.playerX - e.group.position.x, st.playerZ - e.group.position.z);
                e._fissureData = [];
                e._fissureMeshes = [];
                for (let fi = 0; fi < fissureCount; fi++) {
                  const angleOffset = ((fi / (fissureCount - 1 || 1)) - 0.5) * arcSpread;
                  const fAngle = dirAngle + angleOffset;
                  const startX = e.group.position.x;
                  const startZ = e.group.position.z;
                  const endX = startX + Math.sin(fAngle) * fissureLen;
                  const endZ = startZ + Math.cos(fAngle) * fissureLen;
                  // Brown line mesh on ground
                  const fGeo = new THREE.BoxGeometry(0.3, 0.1, fissureLen);
                  const fMat = new THREE.MeshBasicMaterial({ color: 0x664422, transparent: true, opacity: 0.4 });
                  const fMesh = new THREE.Mesh(fGeo, fMat);
                  fMesh.position.set((startX + endX) / 2, 0.12, (startZ + endZ) / 2);
                  fMesh.rotation.y = Math.atan2(Math.sin(fAngle), Math.cos(fAngle));
                  scene.add(fMesh);
                  e._fissureData.push({ startX, startZ, endX, endZ, mesh: fMesh });
                  e._fissureMeshes.push(fMesh);
                }
                playSound('sfx_player_growl');
                // Reset cooldown with attack-specific cooldown
                const baseCooldown = 8 * phaseCooldownMult * (isChill ? 1.5 : 1);
                e.specialAttackTimer = baseCooldown + Math.random() * 1;
                continue; // skip normal attack flow
              }
              playSound('sfx_player_growl');
            }
          }

          if (e.specialAttackState === 'telegraph') {
            e.specialAttackTelegraphTimer -= gameDt;

            // Animate telegraph visuals
            if (e.tier >= 10) {
              const chosenAttack = e._overlordAttack;
              if (chosenAttack === 'deathBoltVolley' && e.specialAttackMesh) {
                // Pulse the death bolt strip opacity
                const t = performance.now() * 0.01;
                e.specialAttackMesh.material.opacity = 0.3 + 0.4 * Math.sin(t);
              } else if (chosenAttack === 'shadowZones' && e.specialAttackMesh && e.specialAttackMesh.isGroup) {
                // Pulse shadow zone circles
                const t = performance.now() * 0.006;
                e.specialAttackMesh.children.forEach((c, ci) => {
                  if (c.material) c.material.opacity = 0.2 + 0.25 * Math.sin(t + ci * 1.5);
                });
              } else if (chosenAttack === 'summonBurst') {
                // Channel animation: tilt body back, dark particles converge inward
                if (e.group) {
                  const channelProgress = 1 - (e.specialAttackTelegraphTimer / e._summonChannelTimer);
                  e.group.rotation.x = -0.3 * channelProgress; // tilt back
                }
                // Dark particle convergence toward boss
                if (Math.random() < 0.15) {
                  const pa = Math.random() * Math.PI * 2;
                  const pr = 3 + Math.random() * 3;
                  spawnFireParticle(
                    0x440066,
                    e.group.position.x + Math.cos(pa) * pr,
                    e.group.position.y + 1 + Math.random() * 2,
                    e.group.position.z + Math.sin(pa) * pr,
                    0.4,
                    { transparent: true, opacity: 0.7 }
                  );
                }
              } else if (chosenAttack === 'deathBeam') {
                // Charge animation: converging red particles, body emissive ramp
                const chargeProgress = 1 - (e.specialAttackTelegraphTimer / e._deathBeamChargeDur);
                if (e.body && e.body.material.emissive) {
                  const emR = Math.floor(chargeProgress * 255);
                  e.body.material.emissive.setRGB(emR / 255, 0, 0);
                }
                // Red particles converge toward the boss
                if (Math.random() < 0.2) {
                  const pa = Math.random() * Math.PI * 2;
                  const pr = 4 + Math.random() * 3;
                  spawnFireParticle(
                    0xff0000,
                    e.group.position.x + Math.cos(pa) * pr,
                    e.group.position.y + 0.5 + Math.random() * 2,
                    e.group.position.z + Math.sin(pa) * pr,
                    0.5,
                    { transparent: true, opacity: 0.8 }
                  );
                }
              }
            } else if (e.tier === 9 && e.specialAttackMesh) {
              const t = performance.now() * 0.01;
              if (e._currentAttack === 'shockwave') {
                // Shockwave: rapid expansion to show the ring will travel far
                const baseDur = 1.0 * telegraphDurMult;
                const progress = 1 - (e.specialAttackTelegraphTimer / baseDur);
                const ringScale = 1 + progress * 12;
                e.specialAttackMesh.scale.set(ringScale, 1, ringScale);
                e.specialAttackMesh.material.opacity = 0.5 * (1 - progress * 0.3);
              } else if (e._currentAttack === 'slam') {
                // Slam: expand ring outward to show AoE radius
                const baseDur = 1.5 * telegraphDurMult;
                const progress = 1 - (e.specialAttackTelegraphTimer / baseDur);
                const ringScale = 1 + progress * 7;
                e.specialAttackMesh.scale.set(ringScale, 1, ringScale);
                e.specialAttackMesh.material.opacity = 0.5 * (1 - progress * 0.5);
              } else if (e._currentAttack === 'boneBarrage') {
                // BD-220: Pulse bone barrage ground markers
                if (e.specialAttackMesh.isGroup) {
                  e.specialAttackMesh.children.forEach(child => {
                    if (child.material) {
                      child.material.opacity = 0.3 + 0.3 * Math.abs(Math.sin(t));
                    }
                  });
                }
              }
            }

            if (e.specialAttackTelegraphTimer <= 0) {
              // Telegraph finished — fire the attack
              if (e.tier >= 10) {
                const chosenAttack = e._overlordAttack;

                if (chosenAttack === 'deathBoltVolley') {
                  // === BD-222: Death Bolt Volley — multi-bolt spread ===
                  const boltCount = e.bossPhase >= 3 ? (isChill ? 3 : 5) : (isChill ? 2 : 3);
                  const spreadAngle = e.bossPhase >= 3 ? (30 * Math.PI / 180) : (15 * Math.PI / 180);
                  const bdx = e.specialAttackTargetX - e.group.position.x;
                  const bdz = e.specialAttackTargetZ - e.group.position.z;
                  const bDist = Math.sqrt(bdx * bdx + bdz * bdz) || 1;
                  const baseAngle = Math.atan2(bdx, bdz);
                  const boltSpeed = isChill ? 10 : 16;
                  const boltDmg = isChill ? 15 : 30;

                  for (let bi = 0; bi < boltCount; bi++) {
                    const angleOffset = boltCount === 1 ? 0 :
                      -spreadAngle / 2 + (spreadAngle / (boltCount - 1)) * bi;
                    const bAngle = baseAngle + angleOffset;
                    const boltGeo = new THREE.SphereGeometry(0.4, 8, 6);
                    const boltMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
                    const bolt = new THREE.Mesh(boltGeo, boltMat);
                    bolt.position.set(e.group.position.x, 1.5, e.group.position.z);
                    scene.add(bolt);
                    st.weaponProjectiles.push({
                      mesh: bolt,
                      x: e.group.position.x, y: 1.5, z: e.group.position.z,
                      vx: Math.sin(bAngle) * boltSpeed,
                      vy: 0,
                      vz: Math.cos(bAngle) * boltSpeed,
                      damage: boltDmg * diffDmgMult,
                      range: 1.5,
                      life: 3,
                      type: 'deathBolt',
                      isEnemyProjectile: true,
                      sourceEnemy: e, // BD-235: enemy ref for damagePlayer source tracking
                      originX: e.group.position.x, originZ: e.group.position.z, // BD-235: origin position at fire time
                    });
                  }
                  // BD-225: Clean up fan lines when bolts fire
                  if (e._volleyFanLines) {
                    for (const line of e._volleyFanLines) disposeTempMesh(line);
                    e._volleyFanLines = null;
                  }
                  playSound('sfx_boss_death_bolt');
                  triggerScreenShake(0.1, 0.1); // BD-225: Death Bolt Volley screen shake

                } else if (chosenAttack === 'shadowZones') {
                  // === BD-222: Shadow Zones — dark damaging circles on ground ===
                  // Check max 2 active shadow zone sets
                  const activeShadowSets = st.weaponEffects.filter(eff => eff.type === 'bossShadowZone').length;
                  if (activeShadowSets < 2 && e._shadowZonePositions) {
                    for (const pos of e._shadowZonePositions) {
                      const zoneGeo = new THREE.CircleGeometry(3, 24);
                      zoneGeo.rotateX(-Math.PI / 2);
                      const zoneMat = new THREE.MeshBasicMaterial({
                        color: 0x330044, transparent: true, opacity: 0.6,
                        side: THREE.DoubleSide, depthWrite: false
                      });
                      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
                      zoneMesh.position.set(pos.x, 0.08, pos.z);
                      scene.add(zoneMesh);
                      const zoneDuration = 3.0;
                      st.weaponEffects.push({
                        mesh: zoneMesh,
                        x: pos.x,
                        z: pos.z,
                        radius: 3,
                        life: zoneDuration,
                        maxLife: zoneDuration,
                        type: 'bossShadowZone',
                        dmgPerTick: isChill ? 5 : 10,
                        tickInterval: isChill ? 0.75 : 0.5,
                        tickTimer: 0,
                        fadeStart: 0.5, // fade out in final 0.5s
                      });
                    }
                    e._shadowZonePositions = null;
                  }
                  playSound('sfx_boss_shadow_zone');
                  triggerScreenShake(0.1, 0.1); // BD-225: Shadow Zone eruption screen shake

                } else if (chosenAttack === 'summonBurst') {
                  // === BD-223: Summon Burst — spawn ring of zombies ===
                  // Reset body tilt from channel animation
                  if (e.group) e.group.rotation.x = 0;

                  // Count currently alive summoned zombies
                  const summonedAlive = st.enemies.filter(en => en.alive && !en.dying && en.isSummoned).length;
                  const maxSummoned = 6;
                  if (summonedAlive < maxSummoned) {
                    const spawnCount = isChill ? 3 : (4 + Math.floor(Math.random() * 3)); // 4-6 normal, 3 chill
                    const actualSpawn = Math.min(spawnCount, maxSummoned - summonedAlive);
                    const spawnDist = 6;
                    const maxSummonTier = isChill ? 1 : 3;
                    const summonLifetime = isChill ? 10 : 15;
                    for (let si = 0; si < actualSpawn; si++) {
                      const spAngle = (si / actualSpawn) * Math.PI * 2;
                      const sx = e.group.position.x + Math.cos(spAngle) * spawnDist;
                      const sz = e.group.position.z + Math.sin(spAngle) * spawnDist;
                      const sTier = isChill ? 1 : (1 + Math.floor(Math.random() * maxSummonTier));
                      const sBaseHp = 8 * sTier;
                      const summoned = createEnemy(sx, sz, sBaseHp, sTier);
                      summoned.hp = summoned.hp * 0.5; // 50% HP
                      summoned.maxHp = summoned.hp;
                      summoned.isSummoned = true;
                      summoned.noReward = true;
                      summoned.summonLifetime = summonLifetime;
                      st.enemies.push(summoned);
                    }
                  }
                  playSound('sfx_boss_summon');
                  triggerScreenShake(0.15, 0.2); // BD-225: Summon Burst completion screen shake

                } else if (chosenAttack === 'deathBeam') {
                  // === BD-223: Death Beam — sweeping beam attack ===
                  // Reset emissive from charge
                  if (e.body && e.body.material.emissive) {
                    e.body.material.emissive.setHex(0x000000);
                  }
                  // Enter fire state for beam sweep
                  e.specialAttackState = 'fire';
                  const sweepDur = isChill ? 3.0 : 2.0;
                  e._deathBeamSweepTimer = sweepDur;
                  e._deathBeamSweepDur = sweepDur;
                  e._deathBeamHasHit = false;
                  const sweepAngle = 60 * Math.PI / 180;
                  e._deathBeamStartAngle = e._deathBeamBaseAngle - sweepAngle / 2;
                  e._deathBeamEndAngle = e._deathBeamBaseAngle + sweepAngle / 2;
                  e._deathBeamDamage = (isChill ? 20 : 40) * diffDmgMult;
                  e._deathBeamWidth = isChill ? 0.6 : 0.8;

                  // Create beam mesh
                  const beamLen = 30;
                  const beamGeo = new THREE.BoxGeometry(e._deathBeamWidth, 0.6, beamLen);
                  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
                  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
                  beamMesh.position.set(
                    e.group.position.x + Math.sin(e._deathBeamStartAngle) * beamLen / 2,
                    1.5,
                    e.group.position.z + Math.cos(e._deathBeamStartAngle) * beamLen / 2
                  );
                  beamMesh.rotation.y = e._deathBeamStartAngle;
                  scene.add(beamMesh);
                  e._deathBeamMesh = beamMesh;
                  triggerScreenShake(0.2, 0.3);
                  playSound('sfx_boss_death_beam');

                  // Skip the normal telegraph cleanup + cooldown for beam (handled in fire state)
                  // Remove telegraph mesh only
                  if (e.specialAttackMesh) {
                    disposeTelegraph(e);
                  }
                  continue; // Skip movement while firing beam
                }

              } else if (e.tier === 9) {
                if (e._currentAttack === 'shockwave') {
                  // BD-211: Titan Shockwave — expanding ring that damages on contact
                  const swGeo = new THREE.TorusGeometry(1.0, 0.3, 6, 24);
                  swGeo.rotateX(Math.PI / 2);
                  const swMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                  const swMesh = new THREE.Mesh(swGeo, swMat);
                  swMesh.position.set(e.group.position.x, 0.3, e.group.position.z);
                  scene.add(swMesh);
                  st.weaponEffects.push({
                    mesh: swMesh,
                    x: e.group.position.x,
                    z: e.group.position.z,
                    life: 1.5,
                    maxLife: 1.5,
                    type: 'bossShockwave',
                    radius: 1.0,
                    maxRadius: 20,
                    damage: 20 * diffDmgMult,
                    hasHitPlayer: false,
                    sourceEnemy: e,
                  });
                  playSound('sfx_explosion');
                  triggerScreenShake(0.15, 0.2); // BD-225: Shockwave launch screen shake
                } else if (e._currentAttack === 'slam') {
                  // Titan: Slam damage check — hits player if within 8 units
                  const sdx = st.playerX - e.group.position.x;
                  const sdz = st.playerZ - e.group.position.z;
                  const distSq = sdx * sdx + sdz * sdz;
                  if (distSq < 64) {
                    damagePlayer(35 * diffDmgMult, '#ff2200', { type: 'slam', tierName: ZOMBIE_TIERS[8].name, tier: 9, color: ZOMBIE_TIERS[8].eye,
                      killerX: e.group.position.x, killerZ: e.group.position.z, enemyRef: e });
                  }
                  playSound('sfx_boss_slam_impact');
                  triggerScreenShake(0.3, 0.3); // BD-225: Titan Slam screen shake (was 0.2, 0.2)
                  // Visual: ground slam impact particles
                  for (let i = 0; i < 12; i++) {
                    const pa = (i / 12) * Math.PI * 2;
                    spawnFireParticle(
                      0xff2200,
                      e.group.position.x + Math.cos(pa) * 2,
                      e.group.position.y + 0.3,
                      e.group.position.z + Math.sin(pa) * 2,
                      0.5
                    );
                  }
                } else if (e._currentAttack === 'boneBarrage') {
                  // BD-220: Bone Barrage — spawn parabolic arc projectiles toward landing spots
                  const landingSpots = e._boneBarrageLandingSpots || [];
                  const boneDmg = (isChill ? 8 : 15) * diffDmgMult;
                  for (const spot of landingSpots) {
                    // Create bone projectile mesh (cream-colored small box cluster)
                    const boneGroup = new THREE.Group();
                    const boneMat = new THREE.MeshBasicMaterial({ color: 0xeeddcc });
                    const bone1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.5), boneMat);
                    const bone2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), boneMat);
                    bone2.position.y = 0.08;
                    boneGroup.add(bone1);
                    boneGroup.add(bone2);
                    boneGroup.position.set(e.group.position.x, e.group.position.y + 2, e.group.position.z);
                    scene.add(boneGroup);

                    // Calculate parabolic arc: need vx, vz, vy for arc trajectory
                    const bDx = spot.x - e.group.position.x;
                    const bDz = spot.z - e.group.position.z;
                    const flightTime = 0.6 + Math.random() * 0.3; // 0.6-0.9s flight time
                    const vx = bDx / flightTime;
                    const vz = bDz / flightTime;
                    // vy = (targetY - startY + 0.5*g*t^2) / t — arc up then down
                    const startY = e.group.position.y + 2;
                    const targetY = getGroundAt(spot.x, spot.z) + 0.1;
                    const vy = ((targetY - startY) + 0.5 * GRAVITY_3D * flightTime * flightTime) / flightTime;

                    st.weaponProjectiles.push({
                      mesh: boneGroup,
                      x: e.group.position.x,
                      y: startY,
                      z: e.group.position.z,
                      vx: vx,
                      vy: vy,
                      vz: vz,
                      damage: boneDmg,
                      range: 2, // 2-unit damage radius on landing
                      life: flightTime + 0.5, // a bit extra for safety
                      type: 'boneBarrage',
                      isEnemyProjectile: true,
                      _landX: spot.x,
                      _landZ: spot.z,
                      _landed: false,
                      _flightTime: flightTime,
                      _elapsed: 0,
                    });
                  }
                  e._boneBarrageLandingSpots = null;
                }
              }

              // BD-225: Remove telegraph mesh using disposeTelegraph utility (BD-24: recursive disposal)
              disposeTelegraph(e);

              // BD-222: Phase-based cooldown multiplier for Overlord attacks
              if (e.tier >= 10) {
                const attackCooldowns = {
                  deathBoltVolley: 4,
                  shadowZones: 8,
                  summonBurst: 12,
                  deathBeam: 10,
                };
                const phaseMult = e.bossPhase <= 1 ? 1.0 : e.bossPhase <= 2 ? 0.9 : 0.8;
                const chillMult = isChill ? 1.5 : 1.0;
                const baseCooldown = attackCooldowns[e._overlordAttack] || 4;
                e.specialAttackTimer = baseCooldown * phaseMult * chillMult + Math.random() * 1;
              } else if (e.tier === 9) {
                // BD-220/221: Attack-specific cooldowns with phase multiplier
                const attackCooldowns = {
                  slam: 2.5,
                  shockwave: 2.5,
                  boneBarrage: 6,
                  titanCharge: 10,
                  groundFissures: 8,
                };
                const baseCooldown = (attackCooldowns[e._currentAttack] || 2.5) * phaseCooldownMult * (isChill ? 1.5 : 1);
                e.specialAttackTimer = baseCooldown + Math.random() * 1;
              }
              e.specialAttackState = 'idle';
            } else {
              // Still telegraphing — skip normal movement (enemy stands still)
              continue;
            }
          }

          // === BD-223: Death Beam fire state — sweep the beam ===
          if (e.specialAttackState === 'fire' && e._overlordAttack === 'deathBeam' && e._deathBeamMesh) {
            e._deathBeamSweepTimer -= dt;
            const sweepProgress = 1 - (e._deathBeamSweepTimer / e._deathBeamSweepDur);
            const currentAngle = e._deathBeamStartAngle + (e._deathBeamEndAngle - e._deathBeamStartAngle) * sweepProgress;

            // Update beam position and rotation
            const beamLen = 30;
            e._deathBeamMesh.position.set(
              e.group.position.x + Math.sin(currentAngle) * beamLen / 2,
              1.5,
              e.group.position.z + Math.cos(currentAngle) * beamLen / 2
            );
            e._deathBeamMesh.rotation.y = currentAngle;

            // Hit detection via angle comparison (single hit per sweep)
            if (!e._deathBeamHasHit) {
              const pdx = st.playerX - e.group.position.x;
              const pdz = st.playerZ - e.group.position.z;
              const playerAngle = Math.atan2(pdx, pdz);
              let angleDiff = Math.abs(playerAngle - currentAngle);
              if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
              const playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
              // Hit if player is within beam width angle and within beam range
              const beamAngleWidth = Math.atan2(e._deathBeamWidth, playerDist);
              if (angleDiff < beamAngleWidth && playerDist < beamLen) {
                damagePlayer(e._deathBeamDamage, '#ff0000', { type: 'deathBeam', tierName: ZOMBIE_TIERS[9].name, tier: 10, color: ZOMBIE_TIERS[9].eye });
                e._deathBeamHasHit = true;
              }
            }

            // Fade beam opacity near end
            if (e._deathBeamSweepTimer <= 0.5) {
              e._deathBeamMesh.material.opacity = Math.max(0, e._deathBeamSweepTimer / 0.5 * 0.8);
            }

            if (e._deathBeamSweepTimer <= 0) {
              // BD-225: Beam finished — dispose using disposeTempMesh and return to idle
              disposeTempMesh(e._deathBeamMesh);
              e._deathBeamMesh = null;
              // Reset emissive
              if (e.body && e.body.material.emissive) {
                e.body.material.emissive.setHex(0x000000);
              }

              // Set cooldown
              const phaseMult = e.bossPhase <= 1 ? 1.0 : e.bossPhase <= 2 ? 0.9 : 0.8;
              const chillMult = isChill ? 1.5 : 1.0;
              e.specialAttackTimer = 10 * phaseMult * chillMult + Math.random() * 1;
              e.specialAttackState = 'idle';
            } else {
              // Still firing beam — skip normal movement
              continue;
            }
          }
        }

        // Lazy-init jump state fields
        if (e.jumpVY === undefined) { e.jumpVY = 0; e.jumpCooldown = 0; e.onPlatform = false; }
        const dx = st.playerX - e.group.position.x;
        const dz = st.playerZ - e.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // BD-164: Distance-based shadow toggle (only when crossing threshold)
        const wantShadow = dist < 20;
        if (e._shadowEnabled !== wantShadow) {
          e._shadowEnabled = wantShadow;
          e.group.traverse(c => { if (c.isMesh) c.castShadow = wantShadow; });
        }
        // BD-224: Flee from boss spawn — move away from flee source instead of chasing player
        if (e.fleeTimer > 0) {
          e.fleeTimer -= dt;
          const fdx = e.group.position.x - e.fleeFromX;
          const fdz = e.group.position.z - e.fleeFromZ;
          const fdist = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;
          e.group.position.x += (fdx / fdist) * eSpd * dt;
          e.group.position.z += (fdz / fdist) * eSpd * dt;
          // Clamp to map boundaries
          e.group.position.x = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.x));
          e.group.position.z = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.z));
          e.group.rotation.y = Math.atan2(fdx / fdist, fdz / fdist);
        } else if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;
          e.group.position.x += nx * eSpd * gameDt;
          e.group.position.z += nz * eSpd * gameDt;
          // Clamp enemies to map boundaries
          e.group.position.x = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.x));
          e.group.position.z = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.z));

          e.group.rotation.y = Math.atan2(nx, nz);
        }

        // === ENEMY-TERRAIN COLLISION (BD-156: chunk-indexed via getNearbyColliders) ===
        if (terrainState) {
          const ER = 0.4; // enemy radius
          const nearby = getNearbyColliders(e.group.position.x, e.group.position.z, terrainState);
          for (let ci = 0; ci < nearby.length; ci++) {
            const c = nearby[ci];
            const cdx = e.group.position.x - c.x;
            const cdz = e.group.position.z - c.z;
            const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
            const minDist = ER + c.radius;
            if (cDist < minDist && cDist > 0.001) {
              const pushDist = minDist - cDist;
              e.group.position.x += (cdx / cDist) * pushDist;
              e.group.position.z += (cdz / cDist) * pushDist;
            }
          }
        }

        // Platform jumping logic
        if (e.jumpCooldown > 0) e.jumpCooldown -= gameDt;

        // Check if player is on a platform and zombie is close horizontally
        if (st.onPlatformY !== null && dist < 6 && !e.onPlatform) {
          const targetY = st.onPlatformY;
          const zombieY = e.group.position.y;
          if (targetY > zombieY + 0.5 && e.jumpCooldown <= 0 && e.jumpVY === 0) {
            const tierJumpChance = 0.02 + ((e.tier || 1) - 1) * 0.015;
            if (Math.random() < tierJumpChance) {
              e.jumpVY = 8 + ((e.tier || 1) - 1) * 0.5;
              e.jumpCooldown = 2;
            }
          }
        }

        // Apply jump physics or normal ground following
        if (e.jumpVY !== 0 || e.onPlatform) {
          e.jumpVY -= GRAVITY_3D * gameDt;
          e.group.position.y += e.jumpVY * gameDt;

          for (const p of platforms) {
            const halfW = p.w / 2, halfD = p.d / 2;
            if (e.group.position.x > p.x - halfW && e.group.position.x < p.x + halfW &&
                e.group.position.z > p.z - halfD && e.group.position.z < p.z + halfD) {
              const platTop = p.y + 0.2;
              if (e.jumpVY <= 0 && e.group.position.y >= platTop - 0.5 && e.group.position.y <= platTop + 1.0) {
                e.group.position.y = platTop + 0.01;
                e.jumpVY = 0;
                e.onPlatform = true;
              }
            }
          }

          const groundH = getGroundAt(e.group.position.x, e.group.position.z) + 0.01;
          if (e.group.position.y <= groundH) {
            e.group.position.y = groundH;
            e.jumpVY = 0;
            e.onPlatform = false;
          }
        } else {
          const eh = getGroundAt(e.group.position.x, e.group.position.z) + 0.01;
          e.group.position.y = eh;
        }
        // Walking animation: arm swing + leg shuffle
        e.walkPhase += gameDt * e.speed * 3;
        const armSwing = Math.sin(e.walkPhase) * 0.4;
        const legSwing = Math.sin(e.walkPhase) * 0.15;
        if (e.armL) e.armL.position.z = 0.15 + armSwing * 0.3;
        if (e.armR) e.armR.position.z = 0.15 - armSwing * 0.3;
        if (e.legL) e.legL.position.z = legSwing;
        if (e.legR) e.legR.position.z = -legSwing;
        // Merge bounce effect: brief scale-up then back to normal on tier upgrade
        if (e.mergeBounce > 0) {
          e.mergeBounce -= gameDt;
          const baseScale = e.isBoss ? BOSS_SCALE : (e.tier >= 9 ? 1.5 : 1); // BD-77+BD-211: preserve boss scale
          const bouncePhase = e.mergeBounce / 0.4; // 0->1 normalized (1 at start)
          const bounceScale = baseScale * (1 + Math.sin(bouncePhase * Math.PI) * 0.35);
          e.group.scale.set(bounceScale, bounceScale, bounceScale);
          // Flash bright on the body
          if (e.body && bouncePhase > 0.5) {
            e.body.material.color.setHex(0xffaa00);
          }
          if (e.mergeBounce <= 0) {
            e.group.scale.set(baseScale, baseScale, baseScale);
            if (e.body) e.body.material.color.setHex(e.bodyColor);
          }
        }
        // Contact damage (scaled by tier + difficulty) - check Y distance so platforms/air protect player
        if (e.dying) continue; // Skip dying enemies for contact damage
        const dy = Math.abs(st.playerY - e.group.position.y);
        const tierData = ZOMBIE_TIERS[(e.tier || 1) - 1];
        if (dist < 1.0 * (tierData.scale || 1) && dy < 1.5) {
          const baseDmg = PLAYER_CONTACT_DAMAGE_BASE * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1);
          const dealt = damagePlayer(baseDmg, undefined, { type: 'contact', tierName: tierData.name, tier: e.tier || 1, color: tierData.eye,
            killerX: e.group.position.x, killerZ: e.group.position.z, enemyRef: e }); // BD-235
          if (dealt > 0) {
            // Thorned Vest: reflect 20% damage back
            if (st.items.vest) damageEnemy(e, dealt * 0.2, { skipProcs: true });
            // Thorns Howl: reflect 10% contact damage per stack
            if (st.howls.thorns > 0) {
              damageEnemy(e, dealt * 0.10 * st.howls.thorns, { skipProcs: true });
            }
          }
        }
        // BD-203: Hurt flash cooldown decrement
        if (e.hurtFlashCooldown > 0) e.hurtFlashCooldown -= gameDt;
        // Hurt flash (tinted flash, 1s cooldown — BD-203)
        if (e.hurtTimer > 0) {
          e.hurtTimer -= gameDt;
          if (e.hurtTimer > 0) {
            // BD-203: Blend 60% white + 40% body color for tier-tinted flash
            const bc = e.bodyColor;
            const br = ((bc >> 16) & 0xff) * 0.4 + 255 * 0.6;
            const bg = ((bc >> 8) & 0xff) * 0.4 + 255 * 0.6;
            const bb = (bc & 0xff) * 0.4 + 255 * 0.6;
            const flashColor = (Math.round(br) << 16) | (Math.round(bg) << 8) | Math.round(bb);
            const hc = e.headColor;
            const hr = ((hc >> 16) & 0xff) * 0.4 + 255 * 0.6;
            const hg = ((hc >> 8) & 0xff) * 0.4 + 255 * 0.6;
            const hb = (hc & 0xff) * 0.4 + 255 * 0.6;
            const headFlash = (Math.round(hr) << 16) | (Math.round(hg) << 8) | Math.round(hb);
            e.body.material.color.setHex(flashColor);
            e.head.material.color.setHex(headFlash);
          } else {
            e.body.material.color.setHex(e.bodyColor);
            e.head.material.color.setHex(e.headColor);
          }
        }
        // Hot Sauce ignite DoT: 3 damage/s per stack for 3s
        if (e.ignited) {
          e.igniteTimer -= gameDt;
          damageEnemy(e, e.igniteDps * gameDt, { skipProcs: true });
          // Orange tint while burning
          if (e.body) e.body.material.color.setHex(0xff6600);
          if (e.igniteTimer <= 0) {
            e.ignited = false;
            if (e.body) e.body.material.color.setHex(e.bodyColor);
          }
        }
        // Kill enemies that fall too far behind
        if (dist > ENTITY_DESPAWN_DISTANCE && !e.dying) { disposeEnemy(e); }
      }

      // === BD-234: Killer highlight glow during death sequence ===
      // Pulse emissive glow on the killing zombie, dim all others, spawn floating tier label once.
      if (st.deathSequence) {
        const killerRef = st.lastDamageSource?.enemyRef;
        for (const e of st.enemies) {
          if (killerRef && e === killerRef && e.alive) {
            // Pulsing glow on killer
            const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
            e.group.traverse(child => {
              if (child.isMesh && child.material) {
                if (!child.material.emissive) child.material.emissive = new THREE.Color();
                child.material.emissive.setHex(st.lastDamageSource.color || 0xff4444);
                child.material.emissiveIntensity = pulse;
              }
            });
            // Floating tier-name label (spawned once)
            if (!st._killerLabelSpawned) {
              st._killerLabelSpawned = true;
              const tierName = st.lastDamageSource.tierName || 'ZOMBIE';
              const color = '#' + (st.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
              addFloatingText(tierName.toUpperCase(), color, e.group.position.x, e.group.position.y + 3, e.group.position.z, 2.0, true);
            }
          } else {
            // Dim other zombies (remove any emissive glow)
            e.group.traverse(child => {
              if (child.isMesh && child.material) {
                child.material.emissiveIntensity = 0;
              }
            });
          }
        }
      }

      // === ZOMBIE-ZOMBIE COLLISION: TIERED MERGE SYSTEM (BD-175: throttled to 0.5s) ===
      // Same-tier zombies collide to progress toward merging into the next tier.
      // Merge ratios: Tier 1 (Shambler) -> Tier 2 (Lurcher) = 5:1,
      //               Tier 2 (Lurcher) -> Tier 3 (Bruiser) = 3:1,
      //               Tier 3 (Bruiser) -> Tier 4 (Mega) = 2:1.
      // Merging is capped at Tier 4 (index 3) for alpha. Beyond that, just push apart.
      // When the merge counter fills, the surviving zombie is replaced by a new higher-tier one
      // with a brief scale bounce effect.
      st.mergeCheckTimer -= gameDt;
      if (st.mergeCheckTimer <= 0) {
      st.mergeCheckTimer = 0.5; // Run merge checks every 0.5s
      const ZOMBIE_RADIUS = 0.6;
      const MERGE_RATIOS = [5, 3, 2]; // merges needed: tier1->2=5, tier2->3=3, tier3->4=2
      const MAX_MERGE_TIER = 4;       // Cap at tier 4 for alpha
      const mergedSet = new Set();
      const newEnemies = [];
      for (let i = 0; i < st.enemies.length; i++) {
        const a = st.enemies[i];
        if (!a.alive || a.dying || mergedSet.has(i)) continue;
        for (let j = i + 1; j < st.enemies.length; j++) {
          const b = st.enemies[j];
          if (!b.alive || b.dying || mergedSet.has(j)) continue;
          const dx = a.group.position.x - b.group.position.x;
          const dz = a.group.position.z - b.group.position.z;
          const distSq = dx * dx + dz * dz;
          const aScale = ZOMBIE_TIERS[(a.tier || 1) - 1].scale;
          const bScale = ZOMBIE_TIERS[(b.tier || 1) - 1].scale;
          const minDist = ZOMBIE_RADIUS * (aScale + bScale);
          if (distSq < minDist * minDist && distSq > 0.001) {
            const aTier = a.tier || 1;
            const bTier = b.tier || 1;
            // Same tier and below merge cap → absorb
            if (aTier === bTier && aTier < MAX_MERGE_TIER) {
              const mergeIdx = aTier - 1; // 0-indexed into MERGE_RATIOS
              const needed = MERGE_RATIOS[mergeIdx] || 2;
              // Survivor (a) absorbs victim (b), including b's progress
              a.mergeCount = (a.mergeCount || 0) + (b.mergeCount || 0) + 1;
              disposeEnemy(b);
              mergedSet.add(j);
              // Check if enough absorbed to tier up
              if (a.mergeCount >= needed - 1) {
                // Tier up: replace survivor with next-tier zombie at its position
                const mx = a.group.position.x;
                const mz = a.group.position.z;
                const newTier = aTier + 1;
                const baseHp = 8 + Math.floor((st.gameTime / 60) * 2.5);
                disposeEnemy(a);
                mergedSet.add(i);
                const upgraded = createEnemy(mx, mz, baseHp, newTier);
                upgraded.mergeBounce = 0.4; // 0.4s bounce animation
                newEnemies.push(upgraded);
                playSound(newTier <= 2 ? 'sfx_zombie_merge_low' : newTier <= 4 ? 'sfx_zombie_merge_mid' : 'sfx_zombie_merge_high');
                // Floating text announcement
                const tierName = ZOMBIE_TIERS[newTier - 1].name;
                addFloatingText(tierName.toUpperCase() + '!', '#ff8800', mx, terrainHeight(mx, mz) + 2.5, mz, 1.5);
                break;
              }
            } else {
              // Different tiers, at merge cap, or max tier: just push apart
              const dist = Math.sqrt(distSq);
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const nz = dz / dist;
              a.group.position.x += nx * overlap;
              a.group.position.z += nz * overlap;
              b.group.position.x -= nx * overlap;
              b.group.position.z -= nz * overlap;
            }
          }
        }
      }
      if (newEnemies.length > 0) {
        st.enemies.push(...newEnemies);
      }
      } // end merge throttle check (BD-175)

      // === AUTO-ATTACK REMOVED (BD-102) ===
      // Creatures now only attack via weapon slots and power attack.
      // Interaction timer for shrine/totem hits (replaces autoAttackTimer gating).
      st.interactionTimer -= gameDt;
      if (st.interactionTimer < 0) st.interactionTimer = 0;

      // === POWER ATTACK (Hold Enter/B to charge, release to strike) ===
      // Charge for 0-2 seconds by holding Enter/NumpadEnter/B. Releasing triggers an AoE
      // power attack that hits all enemies in range. Charge multiplier increases damage and range.
      // A growing glow mesh provides visual feedback during charging.
      // BD-74: Decrement enter cooldown to prevent upgrade-menu Enter from triggering charge
      if (inputState.enterCooldown > 0) {
        inputState.enterCooldown -= gameDt;
      }
      const chargeKey = keys3d['Enter'] || keys3d['NumpadEnter'] || keys3d['KeyB'];
      if (chargeKey && !st.gameOver && !st.deathSequence && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu && !st.wearableCompare && inputState.enterCooldown <= 0 && (performance.now() - inputState.menuDismissedAt > 500)) {
        if (!inputState.charging) {
          inputState.charging = true;
          inputState.chargeTime = 0;
        }
        inputState.chargeTime = Math.min(inputState.chargeTime + gameDt, POWER_ATTACK_MAX_CHARGE);
        // Charge glow visual
        if (!st.chargeGlow) {
          const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.3 });
          st.chargeGlow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glowMat);
          scene.add(st.chargeGlow);
        }
        const glowScale = 1 + inputState.chargeTime * 1.5;
        st.chargeGlow.scale.set(glowScale, glowScale, glowScale);
        st.chargeGlow.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        st.chargeGlow.material.opacity = 0.15 + inputState.chargeTime * 0.2;
      }
      if (!chargeKey && inputState.charging) {
        inputState.charging = false;
        inputState.powerAttackReady = true;
      }
      if (inputState.powerAttackReady) {
        inputState.powerAttackReady = false;
        playSound('sfx_power_attack_release');
        const chargeMult = 1 + inputState.chargeTime;
        let range = st.attackRange * (1 + inputState.chargeTime * 0.5);
        if (st.items.boots === 'cowboyBoots') range *= 1.2;
        const py = st.playerY + 0.8;
        const dmg = st.attackDamage * getPlayerDmgMult() * chargeMult;

        // Hit all enemies in range (AoE power attack)
        const rangeSqPA = range * range;
        for (const e of st.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          if (dx * dx + dz * dz < rangeSqPA) {
            damageEnemy(e, dmg);
            st.attackLines.push(createAttackLine(st.playerX, py, st.playerZ, e.group.position.x, e.group.position.y + 0.8, e.group.position.z));
          }
        }
        // Flash effect
        if (st.chargeGlow) {
          st.chargeGlow.material.opacity = 0.8;
          st.chargeGlow.scale.set(range * 2, range * 2, range * 2);
          inputState.chargeGlowTimer = 0.1;
        }
        inputState.chargeTime = 0;
        // BD-126: Larger/longer lunge for power attack
        st.attackAnimTimer = 0.25; st.attackAnimDuration = 0.25;
      }
      // Charge glow flash timer countdown
      if (inputState.chargeGlowTimer > 0) {
        inputState.chargeGlowTimer -= gameDt;
        if (inputState.chargeGlowTimer <= 0) {
          inputState.chargeGlowTimer = 0;
          if (st.chargeGlow) {
            scene.remove(st.chargeGlow);
            st.chargeGlow.geometry.dispose();
            st.chargeGlow.material.dispose();
            st.chargeGlow = null;
          }
        }
      }
      // Remove charge glow if not charging
      if (!inputState.charging && !inputState.powerAttackReady && inputState.chargeGlowTimer <= 0 && st.chargeGlow) {
        scene.remove(st.chargeGlow);
        st.chargeGlow.geometry.dispose();
        st.chargeGlow.material.dispose();
        st.chargeGlow = null;
      }

      // === ATTACK LINES ===
      for (let i = st.attackLines.length - 1; i >= 0; i--) {
        st.attackLines[i].life--;
        if (st.attackLines[i].life <= 0) {
          scene.remove(st.attackLines[i].line);
          st.attackLines[i].line.geometry.dispose();
          st.attackLines.splice(i, 1);
        }
      }

      // === PROJECTILES ===
      for (let i = st.projectiles.length - 1; i >= 0; i--) {
        const p = st.projectiles[i];
        p.mesh.position.x += p.vx * gameDt;
        p.mesh.position.z += p.vz * gameDt;
        p.mesh.rotation.y += gameDt * 10;
        p.life--;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          st.projectiles.splice(i, 1);
          continue;
        }
        // Hit enemies
        for (const e of st.enemies) {
          if (!e.alive || e.dying || p.hitEnemies.has(e)) continue;
          const dx = p.mesh.position.x - e.group.position.x;
          const dz = p.mesh.position.z - e.group.position.z;
          if (dx * dx + dz * dz < 1) {
            damageEnemy(e, st.attackDamage * st.dmgBoost * 0.8);
            p.hitEnemies.add(e);
          }
        }
      }

      // === XP GEM MERGE (BD-144) ===
      // Aggressively merge nearby gems to reduce draw calls and object count.
      st.gemMergeTimer -= gameDt;
      if (st.gemMergeTimer <= 0) {
        st.gemMergeTimer = 0.25;
        for (let i = st.xpGems.length - 1; i >= 0; i--) {
          const a = st.xpGems[i];
          for (let j = i - 1; j >= 0; j--) {
            const b = st.xpGems[j];
            const mdx = a.mesh.position.x - b.mesh.position.x;
            const mdz = a.mesh.position.z - b.mesh.position.z;
            if (mdx * mdx + mdz * mdz < 9.0) { // 3.0^2
              a.xpValue += b.xpValue;
              const targetScale = Math.min(1.0 + a.xpValue * 0.05, 1.8);
              a.baseScale = targetScale;
              // BD-174: Switch to appropriate tiered material
              a.mesh.material = getGemMaterial(a.xpValue);
              // Return to pool instead of just removing (BD-185)
              scene.remove(b.mesh);
              b.mesh.visible = false;
              gemPool.release(b.mesh);
              st.xpGems.splice(j, 1);
              i--;
              break;
            }
          }
        }
      }

      // === XP GEMS ===
      // XP gems bob, spin, breathe (baseScale), magnet-pull with speed trail, and collect.
      for (let i = st.xpGems.length - 1; i >= 0; i--) {
        const gem = st.xpGems[i];
        // Bob position + spin rotation
        gem.bobPhase += gameDt * 3;
        const gh = getGroundAt(gem.mesh.position.x, gem.mesh.position.z);
        gem.mesh.position.y = gh + 0.4 + Math.sin(gem.bobPhase) * 0.15;
        gem.mesh.rotation.y += gameDt * 2;
        // Breathing scale (respects baseScale so merged gems stay big)
        const breathe = gem.baseScale * (1 + Math.sin(gem.bobPhase) * 0.15);
        gem.mesh.scale.setScalar(breathe);
        const dx = st.playerX - gem.mesh.position.x;
        const dz = st.playerZ - gem.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Magnet pull with speed trail stretch
        if (dist < st.collectRadius * 2 && dist > st.collectRadius) {
          const pull = 3 * gameDt;
          gem.mesh.position.x += (dx / dist) * pull;
          gem.mesh.position.z += (dz / dist) * pull;
          // Speed trail: stretch gem in pull direction (fun rubber-band feel)
          const stretchFactor = 1.8;
          gem.mesh.scale.set(
            gem.baseScale / stretchFactor,
            gem.baseScale * stretchFactor,
            gem.baseScale / stretchFactor
          );
          // Point stretch toward player
          gem.mesh.lookAt(st.playerX, gem.mesh.position.y, st.playerZ);
          gem.mesh.rotateX(Math.PI / 2); // align stretch along pull axis
        }
        // Collection — BD-228: disable during death sequence
        if (dist < st.collectRadius && !st.deathSequence) {
          st.xp += Math.max(1, Math.round((gem.xpValue || 1) * st.augmentXpMult * getHowlXpMult() * getWearableXpMult() * (st.totemXpMult || 1)));
          // Return to pool instead of just removing (BD-185)
          scene.remove(gem.mesh);
          gem.mesh.visible = false;
          gemPool.release(gem.mesh);
          st.xpGems.splice(i, 1);
          if (gem.xpValue >= 3) {
            playSound('sfx_weapon_boomerang'); // whoosh for big merged gems!
          }
          playSound('sfx_xp_pickup');
          if (st.xp >= st.xpToNext) {
            st.xp -= st.xpToNext;
            st.xpToNext = Math.floor(st.xpToNext * XP_SCALE_PER_LEVEL);
            st.level++;
            playSound('sfx_level_up');
            showUpgradeMenu();
          }
        } else if (dist > 50) {
          // Cleanup far-away XP gems — return to pool (BD-185)
          scene.remove(gem.mesh);
          gem.mesh.visible = false;
          gemPool.release(gem.mesh);
          st.xpGems.splice(i, 1);
        }
      }

      // === MAP GEMS (non-respawning world collectibles) ===
      // Map gems bob and spin like XP gems but use GEM_COLLECT_RADIUS and grant variable XP.
      // Collected gems are tracked per chunk+index so they never reappear.
      for (let i = st.mapGems.length - 1; i >= 0; i--) {
        const g = st.mapGems[i];
        if (!g.alive) { st.mapGems.splice(i, 1); continue; }
        // Rotate and bob
        g.mesh.rotation.y += gameDt * 2;
        g.mesh.position.y = terrainHeight(g.x, g.z) + 0.6 + Math.sin(st.gameTime * 3 + g.x) * 0.15;
        // Pickup check (squared distance)
        const dx = st.playerX - g.x;
        const dz = st.playerZ - g.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < GEM_COLLECT_RADIUS * GEM_COLLECT_RADIUS && !st.deathSequence) {
          g.alive = false;
          scene.remove(g.mesh);
          // XP scaled by augments, Fortune Howl, and totem bonuses (same as drop gems)
          const xpGain = Math.max(1, Math.round(g.xpValue * st.augmentXpMult * getHowlXpMult() * getWearableXpMult() * (st.totemXpMult || 1)));
          st.xp += xpGain;
          // Track as collected so it won't respawn when chunk reloads
          if (!st.collectedGemKeys.has(g.chunkKey)) st.collectedGemKeys.set(g.chunkKey, new Set());
          st.collectedGemKeys.get(g.chunkKey).add(g.gemIndex);
          playSound('sfx_xp_pickup');
          // Floating text
          addFloatingText(`+${xpGain} XP`, '#aa44ff', g.x, terrainHeight(g.x, g.z) + 1.5, g.z, 0.5);
          // Level-up check
          if (st.xp >= st.xpToNext) {
            st.xp -= st.xpToNext;
            st.xpToNext = Math.floor(st.xpToNext * XP_SCALE_PER_LEVEL);
            st.level++;
            playSound('sfx_level_up');
            showUpgradeMenu();
          }
          st.mapGems.splice(i, 1);
        }
      }

      // === POWERUP CRATES ===
      // Walk into crates to break them (3 HP). Breaking applies the contained powerup.
      // Aviator Glasses reveal crate contents via HUD labels when within 8 units.
      // Crates beyond 60 units are auto-cleaned to limit memory usage.
      for (let i = st.powerupCrates.length - 1; i >= 0; i--) {
        const c = st.powerupCrates[i];
        if (!c.alive) continue;
        const dx = st.playerX - c.x;
        const dz = st.playerZ - c.z;
        const distSq = dx * dx + dz * dz;

        // Show label if glasses equipped
        c.showLabel = st.items.glasses && distSq < 64; // 8*8

        // Walk into crate to break (must be at similar height) — BD-228: disabled during death
        const cdy = Math.abs(st.playerY - c.group.position.y);
        if (distSq < 1.44 && cdy < 2.0 && !st.deathSequence) { // 1.2*1.2
          c.hp--;
          if (c.hp <= 0) {
            c.alive = false;
            // Apply powerup
            if (st.activePowerup) st.activePowerup.def.remove(st);
            c.ptype.apply(st);
            st.activePowerup = { def: c.ptype, timer: c.ptype.duration };
            playSound('sfx_crate_open');
            // Play powerup-specific sound based on type
            if (c.ptype.name && c.ptype.name.includes('Wings')) playSound('sfx_powerup_wings');
            else if (c.ptype.name && c.ptype.name.includes('Race Car')) playSound('sfx_powerup_racecar');
            else playSound('sfx_powerup_generic');
            disposeSceneObject(c.group);
            st.powerupCrates.splice(i, 1);
          }
        }
        // Cleanup far crates
        if (distSq > ENTITY_DESPAWN_DISTANCE * ENTITY_DESPAWN_DISTANCE) {
          c.alive = false;
          disposeSceneObject(c.group);
          st.powerupCrates.splice(i, 1);
        }
      }

      // === ITEM PICKUPS ===
      // Walk into floating items to equip them. Each item occupies a unique slot.
      // Some items have immediate effects (magnetRing boosts collectRadius, pendant adds regen).
      // Shows floating text with item name and description on pickup.
      for (let i = st.itemPickups.length - 1; i >= 0; i--) {
        const item = st.itemPickups[i];
        if (!item.alive) continue;
        item.bobPhase += gameDt * 3;
        const ih = getGroundAt(item.x, item.z);
        item.mesh.position.y = ih + 0.8 + Math.sin(item.bobPhase) * 0.2;
        item.mesh.rotation.y += gameDt * 1.5;
        const dx = st.playerX - item.x;
        const dz = st.playerZ - item.z;
        const distSq = dx * dx + dz * dz;
        const idy = Math.abs(st.playerY - item.mesh.position.y);
        if (distSq < 2.25 && idy < 2.0 && !st.deathSequence) { // 1.5*1.5 — BD-228: no pickup during death
          // Equip item
          const it = item.itype;
          // BD-199: Check if non-stackable slot is occupied — show comparison menu
          let slotOccupied = false;
          if (!it.stackable) {
            if (it.slot === 'armor' && st.items.armor !== null) slotOccupied = true;
            else if (it.slot === 'boots' && st.items.boots !== null) slotOccupied = true;
            else if (it.slot === 'glasses' && st.items.glasses) slotOccupied = true;
            else if (it.slot === 'ring' && st.items.ring) slotOccupied = true;
            else if (it.slot === 'charm' && st.items.charm) slotOccupied = true;
            else if (it.slot === 'vest' && st.items.vest) slotOccupied = true;
            else if (it.slot === 'pendant' && st.items.pendant) slotOccupied = true;
            else if (it.slot === 'bracelet' && st.items.bracelet) slotOccupied = true;
            else if (it.slot === 'gloves' && st.items.gloves) slotOccupied = true;
            else if (it.slot === 'cushion' && st.items.cushion) slotOccupied = true;
            else if (it.slot === 'turboshoes' && st.items.turboshoes) slotOccupied = true;
            else if (it.slot === 'goldenbone' && st.items.goldenbone) slotOccupied = true;
            else if (it.slot === 'crown' && st.items.crown) slotOccupied = true;
            else if (it.slot === 'zombiemagnet' && st.items.zombiemagnet) slotOccupied = true;
            else if (it.slot === 'scarf' && st.items.scarf) slotOccupied = true;
          }
          if (slotOccupied && !st.wearableCompare) {
            // Slot occupied: open comparison menu instead of auto-equipping
            // Determine the current item ID for this slot
            let currentId;
            if (it.slot === 'armor') currentId = st.items.armor;
            else if (it.slot === 'boots') currentId = st.items.boots;
            else {
              // Boolean slots: look up the item ID from ITEMS_3D by slot name
              const slotItem = ITEMS_3D.find(si => si.slot === it.slot && !si.stackable);
              currentId = slotItem ? slotItem.id : it.slot;
            }
            st.wearableCompare = {
              currentId: currentId,
              newPickup: item,
              slot: it.slot,
              pickupIndex: i,
              choice: 1, // default to "EQUIP NEW"
            };
            st.paused = true;
            playSound('sfx_item_pickup');
          } else if (!slotOccupied) {
            // Slot empty: auto-equip immediately
            if (it.stackable) {
              // Stackable items: increment count and apply per-stack effects
              st.items[it.id]++;
              // Thick Fur: +15 max HP per stack (immediate)
              if (it.id === 'thickFur') { st.maxHp += 15; if (st.hp > 0) st.hp = Math.min(st.hp + 15, st.maxHp); } // BD-239: hp>0 guard
            } else if (it.slot === 'armor') { st.items.armor = it.id; }
            else if (it.slot === 'glasses') { st.items.glasses = true; }
            else if (it.slot === 'boots') { st.items.boots = it.id; }
            else if (it.slot === 'ring') { st.items.ring = true; st.collectRadius *= 1.5; }
            else if (it.slot === 'charm') st.items.charm = true;
            else if (it.slot === 'vest') st.items.vest = true;
            else if (it.slot === 'pendant') { st.items.pendant = true; st.augments.pendant = (st.augments.pendant || 0) + 1; recomputeAugments(); }
            else if (it.slot === 'bracelet') st.items.bracelet = true;
            else if (it.slot === 'gloves') st.items.gloves = true;
            // New non-stackable slots
            else if (it.slot === 'cushion') st.items.cushion = true;
            else if (it.slot === 'turboshoes') { st.items.turboshoes = true; st.dodgeChance += 0.10; }
            else if (it.slot === 'goldenbone') st.items.goldenbone = true;
            else if (it.slot === 'crown') st.items.crown = true;
            else if (it.slot === 'zombiemagnet') st.items.zombiemagnet = true;
            else if (it.slot === 'scarf') st.items.scarf = true;
            // Floating text for item pickup (color by rarity)
            const rarityColor = (ITEM_RARITIES[it.rarity] || ITEM_RARITIES.common).color;
            // Track acquisition order for display cap (BD-160)
            const itemKey = it.stackable ? it.id : (it.slot || it.id);
            const existIdx = st.itemAcquireOrder.indexOf(itemKey);
            if (existIdx !== -1) st.itemAcquireOrder.splice(existIdx, 1);
            st.itemAcquireOrder.push(itemKey);
            playSound('sfx_item_pickup');
            // BD-147: Item pickup event feedback
            st.itemFlashTimer = 0.2;
            st.itemFlashColor = rarityColor;
            st.itemSlowTimer = 0.3;
            st.itemAnnouncement = {
              name: it.name,
              desc: it.desc,
              color: rarityColor,
              timer: 2.5
            };
            playSound('sfx_level_up'); // celebration sound until Julian records a proper pickup sound
            updateItemVisuals(playerModel, st.items, animalData.id);
            item.alive = false;
            scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
            st.itemPickups.splice(i, 1);
          }
        }
        if (distSq > ENTITY_DESPAWN_DISTANCE * ENTITY_DESPAWN_DISTANCE) {
          item.alive = false;
          scene.remove(item.mesh);
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
          st.itemPickups.splice(i, 1);
        }
      }

      // === WEARABLE PICKUPS ===
      // Walk into floating wearables to equip them. Each wearable occupies one of 3 slots (head/body/feet).
      // Auto-equips into empty slots. If occupied by lower rarity, auto-replaces.
      // If same or higher rarity, must walk over twice within 5s to confirm replacement.
      for (let i = st.wearablePickups.length - 1; i >= 0; i--) {
        const wp = st.wearablePickups[i];
        if (!wp.alive) continue;
        wp.bobPhase += gameDt * 3;
        const wh = getGroundAt(wp.x, wp.z);
        wp.mesh.position.y = wh + 0.8 + Math.sin(wp.bobPhase) * 0.2;
        // Rotate the cube inside the group
        wp.mesh.children[0].rotation.y += gameDt * 2;
        // Rotate the ring indicator
        if (wp.mesh.children[1]) wp.mesh.children[1].rotation.y -= gameDt * 1.5;
        // Decay nearTimer
        if (wp.nearTimer > 0) wp.nearTimer -= gameDt;

        const wdx = st.playerX - wp.x;
        const wdz = st.playerZ - wp.z;
        const wDistSq = wdx * wdx + wdz * wdz;
        const wdy = Math.abs(st.playerY - wp.mesh.position.y);
        if (wDistSq < 2.25 && wdy < 2.0 && !st.deathSequence) { // 1.5*1.5 — BD-228: no pickup during death
          const wd = wp.wearableData;
          const slot = wd.slot;
          const currentId = st.wearables[slot];
          const currentData = currentId ? WEARABLES_3D[currentId] : null;
          const rarityOrder = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
          const newRank = rarityOrder[wd.rarity] || 0;
          const curRank = currentData ? (rarityOrder[currentData.rarity] || 0) : -1;

          let shouldEquip = false;
          if (!currentId) {
            // Empty slot — auto-equip
            shouldEquip = true;
          } else if (newRank > curRank) {
            // Higher rarity — auto-equip
            shouldEquip = true;
          } else if (wp.nearTimer > 0) {
            // Same or lower rarity — second walk-over within 5s confirms
            shouldEquip = true;
          } else {
            // First walk-over for same/higher rarity — start nearTimer
            wp.nearTimer = 5;
          }

          if (shouldEquip) {
            // Unapply old wearable effects if replacing
            if (currentData) {
              const oldEff = currentData.effect;
              if (oldEff.maxHpBonus) { st.maxHp -= oldEff.maxHpBonus; st.hp = Math.min(st.hp, st.maxHp); }
            }
            // Apply new wearable effects
            const eff = wd.effect;
            if (eff.maxHpBonus) { st.maxHp += eff.maxHpBonus; if (st.hp > 0) st.hp = Math.min(st.hp + eff.maxHpBonus, st.maxHp); } // BD-239: hp>0 guard
            // Set the slot
            st.wearables[slot] = wp.wearableId;
            st.wearableFlash[slot] = 1.5;
            playSound('sfx_item_pickup');
            updateWearableVisuals(playerModel, st.wearables);
            wp.alive = false;
            disposeSceneObject(wp.mesh);
            st.wearablePickups.splice(i, 1);
            continue;
          }
        }
        // Cleanup far pickups
        if (wDistSq > ENTITY_DESPAWN_DISTANCE * ENTITY_DESPAWN_DISTANCE) {
          wp.alive = false;
          disposeSceneObject(wp.mesh);
          st.wearablePickups.splice(i, 1);
        }
      }

      // === SHRINES ===
      // Animate shrine orb bobbing and rune rotation. Player proximity hits shrines
      // within 1.5x attack range. After 3 hits, shrine grants a random augment and is destroyed.
      for (let i = st.shrines.length - 1; i >= 0; i--) {
        const shrine = st.shrines[i];
        if (!shrine.alive) continue;
        // Animate: bob orb, rotate rune
        const bobTime = clock.elapsedTime * 2 + shrine.x;
        if (shrine.orb) shrine.orb.position.y = 1.7 + Math.sin(bobTime) * 0.1;
        if (shrine.rune) {
          shrine.rune.rotation.y += gameDt * 2;
          shrine.rune.rotation.x += gameDt * 1.3;
        }
        // Check if player is near shrine (proximity-based interaction)
        const dx = st.playerX - shrine.x;
        const dz = st.playerZ - shrine.z;
        const distSq = dx * dx + dz * dz;
        const shrineRng = st.attackRange * 1.5;
        const sdy = Math.abs(st.playerY - shrine.group.position.y);
        if (distSq < shrineRng * shrineRng && sdy < 2.5 && st.interactionTimer <= 0 && !st.deathSequence) {
          shrine.hp--;
          st.interactionTimer = INTERACTION_HIT_COOLDOWN; // cooldown between interaction hits
          if (shrine.hp <= 0) {
            shrine.alive = false;
            playSound('sfx_shrine_break');
            // Random augment
            const aug = SHRINE_AUGMENTS[Math.floor(Math.random() * SHRINE_AUGMENTS.length)];
            aug.apply(st);
            st.augments[aug.id] = (st.augments[aug.id] || 0) + 1;
            recomputeAugments();
            // Floating text
            addFloatingText(aug.name, aug.color, shrine.x, terrainHeight(shrine.x, shrine.z) + 2.5, shrine.z, 1.0, true);
            disposeSceneObject(shrine.group);
            st.shrines.splice(i, 1);
          }
        }
      }

      // === DIFFICULTY TOTEMS ===
      // Animate totem orb bobbing. Player proximity hits totems within 1.5x attack range.
      // After 5 hits, totem is destroyed: increases zombie difficulty but boosts XP and score rewards.
      for (let i = st.totems.length - 1; i >= 0; i--) {
        const totem = st.totems[i];
        if (!totem.alive) continue;
        // Animate orb
        if (totem.orb) totem.orb.position.y = 2.0 + Math.sin(clock.elapsedTime * 3 + totem.x) * 0.1;
        // Check if player is near totem (proximity-based interaction)
        const tdx = st.playerX - totem.x;
        const tdz = st.playerZ - totem.z;
        const tdistSq = tdx * tdx + tdz * tdz;
        const totemRng = st.attackRange * 1.5;
        const tdy = Math.abs(st.playerY - totem.y);
        if (tdistSq < totemRng * totemRng && tdy < 2.5 && st.interactionTimer <= 0 && !st.deathSequence) {
          totem.hp--;
          st.interactionTimer = INTERACTION_HIT_COOLDOWN; // cooldown between interaction hits
          if (totem.hp <= 0) {
            totem.alive = false;
            st.totemCount++;
            st.totemDiffMult *= TOTEM_EFFECT.zombieHpMult;
            st.totemSpeedMult *= TOTEM_EFFECT.zombieSpeedMult;
            st.totemSpawnMult *= TOTEM_EFFECT.spawnRateMult;
            st.totemXpMult *= TOTEM_EFFECT.xpBonusMult;
            st.totemScoreMult *= TOTEM_EFFECT.scoreBonusMult;
            addFloatingText('NOT HARD ENOUGH!', '#ff2222', totem.x, totem.y + 3, totem.z, 3, true);
            addFloatingText('+25% XP & SCORE', '#ffcc00', totem.x, totem.y + 2.5, totem.z, 3, true);
            disposeSceneObject(totem.group);
            st.totems.splice(i, 1);
          }
        }
      }

      // === CHARGE SHRINE INTERACTION ===
      // Player stands near an uncharged charge shrine to accumulate charge.
      // On charge completion, 3 random upgrades from the shrine's rarity tier are offered.
      if (!st.chargeShrineMenu && !st.upgradeMenu && !st.pauseMenu && !st.wearableCompare && !st.gameOver && !st.deathSequence) {
        let nearestShrine = null;
        let nearestDist = Infinity;
        for (const cs of st.chargeShrines) {
          if (!cs.alive || cs.charged) continue;
          const dx = st.playerX - cs.x;
          const dz = st.playerZ - cs.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < CHARGE_SHRINE_RADIUS && dist < nearestDist) {
            nearestShrine = cs;
            nearestDist = dist;
          }
        }

        if (nearestShrine) {
          if (st.chargeShrineCurrent !== nearestShrine) {
            // Started charging a new shrine
            st.chargeShrineCurrent = nearestShrine;
            st.chargeShrineProgress = 0;
          }
          // Accumulate charge
          st.chargeShrineProgress += gameDt;
          if (st.chargeShrineProgress >= CHARGE_SHRINE_TIME) {
            // Charge complete! Roll 3 upgrades from this shrine's tier
            const tierUpgrades = CHARGE_SHRINE_UPGRADES[nearestShrine.rarity] || CHARGE_SHRINE_UPGRADES.common;
            // Pick 3 random unique upgrades
            const shuffled = shuffle(tierUpgrades);
            st.chargeShrineChoices = shuffled.slice(0, Math.min(3, shuffled.length));
            st.selectedChargeShrineUpgrade = 0;
            st.chargeShrineMenu = true;
            st.showFullMap = false;
            st.paused = true;
            st.chargeShrineProgress = CHARGE_SHRINE_TIME; // Clamp
            // BD-86: Clear Enter key state and charging when shrine menu opens.
            keys3d['Enter'] = false;
            keys3d['NumpadEnter'] = false;
            keys3d['Space'] = false;
            inputState.charging = false;
            inputState.chargeTime = 0;
            playSound('sfx_shrine_break'); // Reuse shrine sound for activation
          }
        } else {
          // Player left the radius — reset progress
          if (st.chargeShrineCurrent) {
            st.chargeShrineCurrent = null;
            st.chargeShrineProgress = 0;
          }
        }
      }

      // === CHARGE SHRINE ANIMATIONS ===
      // Crystal rotation, rune orbiting, and pulse glow when player is charging.
      for (const cs of st.chargeShrines) {
        if (!cs.alive) continue;
        // Crystal rotation
        if (cs.crystal) cs.crystal.rotation.y += gameDt * 1.5;
        // Rune orbiting
        if (cs.rune) {
          cs.rune.rotation.y += gameDt * 3;
          cs.rune.position.x = Math.sin(st.gameTime * 2) * 0.4;
          cs.rune.position.z = Math.cos(st.gameTime * 2) * 0.4;
        }
        // Pulse glow when player is charging
        if (cs === st.chargeShrineCurrent && !cs.charged) {
          const pulse = 0.6 + Math.sin(st.gameTime * 10) * 0.3;
          if (cs.crystal) cs.crystal.material.opacity = pulse;
          if (cs.groundRing) cs.groundRing.material.opacity = 0.15 + pulse * 0.15;
        }
      }

      // === CHALLENGE SHRINE ACTIVATION (BD-77) ===
      for (const cs of st.challengeShrines) {
        if (cs.activated || cs.bossDefeated) continue;
        const dx = st.playerX - cs.x;
        const dz = st.playerZ - cs.z;
        if (Math.sqrt(dx * dx + dz * dz) < CHALLENGE_SHRINE_RADIUS + 1) {
          cs.activated = true;
          // Spawn boss zombie
          const bossHp = (8 + Math.floor((st.gameTime / 60) * 2.5)) * BOSS_HP_MULT;
          const bossTier = st.wave >= 4 ? 10 : 9; // BD-236: was capped at 8, tier 9+ needed for boss attacks
          const boss = createEnemy(cs.x + 5, cs.z + 5, bossHp, bossTier);
          boss.isBoss = true;
          boss.isTotemSpawned = true; // BD-96: flag for guaranteed loot drop
          boss.bossShrine = cs;
          boss.speed = (boss.speed || 2) * BOSS_SPEED_MULT;
          boss.bossDmgMult = BOSS_DMG_MULT;
          // BD-224: Boss entrance animation — start near-zero scale and grow in
          boss.entranceTimer = 1.5;
          boss.entranceActive = true;
          boss.entranceTargetScale = BOSS_SCALE; // remember intended final scale
          if (boss.group) boss.group.scale.setScalar(0.01); // start near-zero
          st.enemies.push(boss);
          st.activeBosses.push(boss);
          playSound('sfx_player_growl');
          // BD-224: Zombie scatter — nearby low-tier enemies flee from boss spawn
          for (const other of st.enemies) {
            if (other === boss || (other.tier || 1) > 3) continue;
            const sdx = other.group.position.x - boss.group.position.x;
            const sdz = other.group.position.z - boss.group.position.z;
            const sdist = Math.sqrt(sdx * sdx + sdz * sdz);
            if (sdist < 15) {
              other.fleeTimer = 2;
              other.fleeFromX = boss.group.position.x;
              other.fleeFromZ = boss.group.position.z;
            }
          }
          // Flash shrine
          cs.group.children.forEach(c => {
            if (c.material && c.material.emissive !== undefined) c.material.emissive = new THREE.Color(0xff0000);
          });
          addFloatingText('BOSS SPAWNED!', '#ff0000', cs.x, terrainHeight(cs.x, cs.z) + 6, cs.z, 3, true);
        }
      }

      // === BD-167: POISON POOL UPDATE ===
      for (let i = st.poisonPools.length - 1; i >= 0; i--) {
        const pool = st.poisonPools[i];
        pool.life -= gameDt;
        if (pool.life <= 0) {
          disposeSceneObject(pool.mesh);
          st.poisonPools.splice(i, 1);
          continue;
        }
        // BD-167: Shrink pool over final 50% of lifetime
        const lifeRatio = pool.life / pool.maxLife;
        if (lifeRatio < 0.5) {
          const shrinkScale = lifeRatio / 0.5; // 1.0 at 50% life, 0.0 at 0%
          pool.mesh.scale.set(shrinkScale, 1, shrinkScale);
        }
        // Pulse opacity
        pool.mesh.material.opacity = 0.3 + 0.2 * Math.sin(performance.now() * 0.008);
        // Damage player if in radius
        const pdx = st.playerX - pool.x;
        const pdz = st.playerZ - pool.z;
        const pDistSq = pdx * pdx + pdz * pdz;
        const effectiveRadius = pool.radius * (pool.mesh.scale.x || 1);
        if (pDistSq < effectiveRadius * effectiveRadius && st.invincible <= 0) {
          let pDmg = pool.dmgPerSec * gameDt * (1 - (st.augmentArmor || 0));
          if (st.items.armor === 'leather') pDmg *= 0.75;
          else if (st.items.armor === 'chainmail') pDmg *= 0.6;
          pDmg = Math.max(0.1, pDmg);
          st.hp -= pDmg;
          if (st.hp < 0) st.hp = 0;
        }
      }

      // === FLOATING TEXTS 3D ===
      for (let i = st.floatingTexts3d.length - 1; i >= 0; i--) {
        st.floatingTexts3d[i].y += gameDt * 2.5;
        st.floatingTexts3d[i].life -= gameDt;
        if (st.floatingTexts3d[i].life <= 0) {
          st.floatingTexts3d.splice(i, 1);
        }
      }

      // === AUGMENT REGEN (BD-187: capped at AUGMENT_REGEN_CAP) — BD-228+239: no regen during death or at 0 HP ===
      if (st.augmentRegen > 0 && !st.deathSequence && st.hp > 0) {
        const effectiveRegen = Math.min(st.augmentRegen, AUGMENT_REGEN_CAP);
        st.hp = Math.min(st.hp + effectiveRegen * gameDt, st.maxHp);
      }

      // === SHIELD BRACELET COOLDOWN ===
      if (st.items.bracelet && !st.shieldBraceletReady) {
        st.shieldBraceletTimer -= gameDt;
        if (st.shieldBraceletTimer <= 0) {
          st.shieldBraceletReady = true;
          addFloatingText('SHIELD READY!', '#4488ff', st.playerX, st.playerY + 2, st.playerZ, 1.5, true);
        }
      }



      // === BD-147: Item pickup feedback timers ===
      if (st.itemAnnouncement) {
        st.itemAnnouncement.timer -= gameDt;
        if (st.itemAnnouncement.timer <= 0) st.itemAnnouncement = null;
      }
      if (st.itemFlashTimer > 0) st.itemFlashTimer -= gameDt;

      // === CLEANUP + DEATH CHECK ===
      // Clean dead enemies using swap-and-pop (O(1) per removal, avoids splice shifting)
      {
        let i = 0;
        while (i < st.enemies.length) {
          if (!st.enemies[i].alive) {
            st.enemies[i] = st.enemies[st.enemies.length - 1];
            st.enemies.pop();
          } else {
            i++;
          }
        }
      }

      // BD-228: Player death — enter death sequence (1.5s slow-motion) before game-over screen
      if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
        console.log('[BD-267] Death triggered: hp=' + st.hp);
        st.hp = 0;
        st.deathSequence = true;
        st.deathSequenceTimer = 1.5;
        st._deathStartGameTime = st.gameTime; // BD-267: record for emergency timeout
        st.deathTimeScale = 1.0;
        // Capture killer position for camera zoom (BD-229)
        if (st.lastDamageSource && st.lastDamageSource.killerX !== undefined) {
          st.deathKillerPos = { x: st.lastDamageSource.killerX, z: st.lastDamageSource.killerZ };
        } else {
          st.deathKillerPos = null;
        }
        // BD-231: Force hurt flash for entire death sequence duration
        st.playerHurtFlash = 1.5;
        st.playerHurtFlashCooldown = 0;
        // BD-233: Death audio layering — immediate impact thud
        playSound('sfx_death_impact');
        st._deathSlowmoPlayed = false;
        // BD-234: Reset killer label flag for glow highlight
        st._killerLabelSpawned = false;
        // Disable player input
        keys3d['Enter'] = false;
        keys3d['NumpadEnter'] = false;
        keys3d['Space'] = false;
        inputState.charging = false;
        inputState.chargeTime = 0;
        inputState.powerAttackReady = false;
      }

      // BD-228: Death sequence tick — slow-motion ramp then transition to game-over
      if (st.deathSequence && !st.gameOver) {
        st.deathSequenceTimer -= realDt;
        const progress = 1 - (st.deathSequenceTimer / 1.5);
        // Ramp: first 33% decelerates from 1.0 to 0.15, then holds at 0.15
        st.deathTimeScale = progress < 0.33
          ? 1.0 - (progress / 0.33) * 0.85
          : 0.15;
        // BD-233: Slow-mo audio at 1.3s remaining
        if (st.deathSequenceTimer <= 1.3 && !st._deathSlowmoPlayed) {
          st._deathSlowmoPlayed = true;
          playSound('sfx_death_slowmo');
        }

        if (st.deathSequenceTimer <= 0) {
          console.log('[BD-267] Game-over transition: timer=' + st.deathSequenceTimer.toFixed(3));
          st.gameOver = true;
          st.deathSequence = false;
          st.showFullMap = false;
          st.upgradeMenu = false;
          st.paused = false;
          st.pauseMenu = false;
          st.chargeShrineMenu = false;
          st.wearableCompare = null;
          inputState.enterReleasedSinceGameOver = false;
          st.nameEntryActive = true;
          st.nameEntry = '';
          st.nameEntryInputCooldown = 0.3;
          // playSound('sfx_death_sting'); // TODO: Sound Pack Beta
        }
      }
    }

    // BD-267: Emergency timeout — if death sequence runs >5s, force game-over
    // This runs OUTSIDE the pause gate so it fires even if the game is paused
    if (st.deathSequence && !st.gameOver && st._deathStartGameTime !== undefined) {
      const deathElapsed = st.gameTime - st._deathStartGameTime;
      // Use wall clock as backup since gameTime might not advance when paused
      if (st.deathSequenceTimer < -3 || deathElapsed > 10) {
        console.error('[BD-267] EMERGENCY: Death sequence stuck for ' + (-st.deathSequenceTimer).toFixed(1) + 's, forcing game-over');
        st.gameOver = true;
        st.deathSequence = false;
        st.showFullMap = false;
        st.upgradeMenu = false;
        st.paused = false;
        st.pauseMenu = false;
        st.chargeShrineMenu = false;
        st.wearableCompare = null;
        inputState.enterReleasedSinceGameOver = false;
        st.nameEntryActive = true;
        st.nameEntry = '';
        st.nameEntryInputCooldown = 0.3;
      }
    }

    // === CAMERA + RENDER (runs even when paused/game over) ===
    // BD-229: Camera zoom-to-killer during death sequence
    if (st.deathSequence) {
      const progress = 1 - (st.deathSequenceTimer / 1.5);
      const zoomFactor = 1 - progress * 0.35; // 1.0 --> 0.65

      // Zoom: reduce offset distances
      const zoomOffsetZ = CAMERA_Z_OFFSET * zoomFactor;
      const zoomOffsetY = CAMERA_Y_OFFSET * zoomFactor;

      // LookAt target: blend toward midpoint between player and killer
      let lookX = st.playerX, lookZ = st.playerZ;
      if (st.deathKillerPos) {
        const dx = st.deathKillerPos.x - st.playerX;
        const dz = st.deathKillerPos.z - st.playerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Clamp blend distance so camera doesn't pan wildly for long-range attacks
        const maxBlendDist = 8;
        const clampedDist = Math.min(dist, maxBlendDist);
        const ratio = dist > 0 ? clampedDist / dist : 0;
        const midX = st.playerX + dx * ratio * 0.5;
        const midZ = st.playerZ + dz * ratio * 0.5;
        const blendT = Math.min(progress * 1.5, 1); // reach full blend at ~67% progress
        lookX = st.playerX + (midX - st.playerX) * blendT;
        lookZ = st.playerZ + (midZ - st.playerZ) * blendT;
      }

      const camTargetX = lookX;
      const camTargetZ = lookZ + zoomOffsetZ;
      const camTargetY = st.playerY + zoomOffsetY;
      camera.position.x += (camTargetX - camera.position.x) * 0.08; // faster lerp during death
      camera.position.z += (camTargetZ - camera.position.z) * 0.08;
      camera.position.y += (camTargetY - camera.position.y) * 0.08;
      camera.lookAt(lookX, st.playerY, lookZ);
    } else {
      // Normal camera (non-death-sequence)
      // BD-244: Height-adaptive zoom — pull camera back as player gets higher
      const height = Math.max(0, st.playerY - GROUND_Y);
      const zoomFactor = 1 + Math.min(height / 25, 1) * 1.5;
      const camTargetX = st.playerX;
      const camTargetZ = st.playerZ + CAMERA_Z_OFFSET * zoomFactor;
      const camTargetY = st.playerY + CAMERA_Y_OFFSET * zoomFactor;
      camera.position.x += (camTargetX - camera.position.x) * CAMERA_SMOOTH_FACTOR;
      camera.position.z += (camTargetZ - camera.position.z) * CAMERA_SMOOTH_FACTOR;
      camera.position.y += (camTargetY - camera.position.y) * CAMERA_SMOOTH_FACTOR;
      camera.lookAt(st.playerX, st.playerY, st.playerZ);
    }

    // BD-218: Screen shake — apply random offset to camera after positioning
    if (st.screenShake > 0) {
      st.screenShake -= dt;
      // Linear decay of amplitude over 0.3s at end of shake
      const decayT = Math.min(st.screenShake / 0.3, 1);
      const amp = st.screenShakeAmp * decayT;
      camera.position.x += (Math.random() - 0.5) * 2 * amp;
      camera.position.y += (Math.random() - 0.5) * 2 * amp;
      camera.position.z += (Math.random() - 0.5) * 2 * amp;
      if (st.screenShake <= 0) {
        st.screenShake = 0;
        st.screenShakeAmp = 0;
      }
    }

    // Update directional light to follow player
    dirLight.position.set(st.playerX + 10, 20, st.playerZ + 10);
    dirLight.target.position.set(st.playerX, 0, st.playerZ);

    // Tree canopy sway (BD-125) — uses flat canopyMeshes array (BD-173) for O(1) iteration
    if (terrainState && terrainState.canopyMeshes) {
      const windTime = clock.elapsedTime;
      for (let ci = 0; ci < terrainState.canopyMeshes.length; ci++) {
        const m = terrainState.canopyMeshes[ci];
        m.rotation.z = Math.sin(windTime * 0.5 + m.userData.windSeed) * 0.02;
        m.rotation.x = Math.sin(windTime * 0.4 + m.userData.windSeed + 1.5) * 0.015;
      }
    }

    // Time-of-day (BD-127)
    const gt = st.gameTime;
    let tA = TOD_STOPS[0], tB = TOD_STOPS[0];
    for (let i = 0; i < TOD_STOPS.length - 1; i++) {
      if (gt >= TOD_STOPS[i].time && gt < TOD_STOPS[i + 1].time) {
        tA = TOD_STOPS[i]; tB = TOD_STOPS[i + 1]; break;
      }
      if (i === TOD_STOPS.length - 2) tA = tB = TOD_STOPS[TOD_STOPS.length - 1];
    }
    if (tA !== tB) {
      const t = (gt - tA.time) / (tB.time - tA.time);
      dirLight.color.copy(_todA.setHex(tA.dirColor).lerp(_todB.setHex(tB.dirColor), t));
      dirLight.intensity = tA.dirInt + (tB.dirInt - tA.dirInt) * t;
      const fc = _todA.setHex(tA.fogColor).lerp(_todB.setHex(tB.fogColor), t);
      scene.fog.color.copy(fc);
      renderer.setClearColor(fc);
      if (ambientLight.isHemisphereLight) {
        ambientLight.color.copy(_todA.setHex(tA.skyColor).lerp(_todB.setHex(tB.skyColor), t));
        ambientLight.groundColor.copy(_todA.setHex(tA.gndColor).lerp(_todB.setHex(tB.gndColor), t));
      }
    }

    renderer.render(scene, camera);
    drawHUD(hudCtx, st, {
      W: hudCanvas.width,
      H: hudCanvas.height,
      animalData,
      camera,
      getWeaponCooldown,
      getGroundAt,
      audioMuted: isMuted(),
      audioVolume: getVolume(),
      inputState,
    });
  }

  clock.start();
  tick();

  // === CLEANUP ===

  /**
   * Full cleanup and resource disposal when leaving 3D mode.
   *
   * Disposal sequence:
   * 1. Stop game loop (set running=false, cancel animationFrame)
   * 2. Remove keydown/keyup event listeners
   * 3. Dispose fire particles, mirror clones, bomb trail bombs
   * 4. Dispose weapon projectiles and effects
   * 5. Dispose charge glow mesh
   * 6. Traverse entire scene and dispose all geometries + materials
   * 7. Dispose WebGL renderer
   * 8. Clear HUD canvas
   * 9. Hide 3D/HUD canvases
   * 10. Remove resize listener
   * 11. Restore container and 2D canvas dimensions for menu screens
   */
  function cleanup() {
    st.running = false;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    disposeAudio();

    // Return active fire particles to pool, then dispose all pooled meshes (BD-185)
    fireParticles.forEach(fp => { scene.remove(fp.mesh); firePool.release(fp.mesh); });
    fireParticles.length = 0;
    firePool.disposeAll(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
    // Return active XP gems to pool, then dispose all pooled meshes (BD-185)
    st.xpGems.forEach(gem => { scene.remove(gem.mesh); gemPool.release(gem.mesh); });
    st.xpGems.length = 0;
    gemPool.disposeAll(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
    // Dispose mirror clone groups
    st.mirrorCloneGroups.forEach(cd => disposeSceneObject(cd.group));
    // Dispose bomb trail bombs
    st.bombTrailBombs.forEach(b => disposeSceneObject(b.mesh));
    // Dispose map gems (shared geo/mat disposed via scene.traverse below)
    st.mapGems.forEach(g => { if (g.mesh) scene.remove(g.mesh); });
    // Dispose wearable pickups (BD-24: recursive disposal)
    st.wearablePickups.forEach(wp => {
      if (wp.mesh) disposeSceneObject(wp.mesh);
    });

    // Dispose weapon projectiles and effects
    st.weaponProjectiles.forEach(p => disposeSceneObject(p.mesh));
    st.weaponEffects.forEach(e => { if (e.shared) scene.remove(e.mesh); else disposeSceneObject(e.mesh); });
    // BD-167: Clean up poison pools
    st.poisonPools.forEach(p => disposeSceneObject(p.mesh));
    // Dispose charge glow
    if (st.chargeGlow) disposeSceneObject(st.chargeGlow);
    // Dispose charge shrine meshes (BD-24: recursive disposal via disposeSceneObject)
    st.chargeShrines.forEach(cs => {
      if (cs.group) disposeSceneObject(cs.group);
    });
    // Dispose challenge shrine meshes (BD-77, BD-24: recursive disposal)
    st.challengeShrines.forEach(cs => {
      if (cs.group) disposeSceneObject(cs.group);
    });

    // Clear geometry/material caches (BD-184) before scene traverse
    clearCaches();

    // Dispose all Three.js objects
    scene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    renderer.dispose();

    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    canvas3d.style.display = 'none';
    hudCanvas.style.display = 'none';
    window.removeEventListener('resize', onResize);

    // Restore container and 2D canvas for menu screens
    container.style.width = '960px';
    container.style.height = '540px';
    canvas3d.style.width = '960px';
    canvas3d.style.height = '540px';
    hudCanvas.style.width = '960px';
    hudCanvas.style.height = '540px';
    canvas2d.style.display = '';
  }
}
