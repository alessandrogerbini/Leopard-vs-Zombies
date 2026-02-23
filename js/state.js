/**
 * @module state
 * @description Central game state module for the 2D Classic mode. Holds all mutable
 * global variables, player state, physics constants, difficulty presets, animal
 * definitions, powerup/item catalogs, and input/camera tracking objects. Every
 * other 2D module imports from here to read or mutate shared state.
 *
 * Dependencies: none (leaf module)
 * Exports: 15 named exports — constants, config objects, and mutable state containers
 *
 * Key concepts:
 * - `state` is the single mutable game-state object reset between runs.
 * - `player` holds per-run character stats, inventory, and powerup timers.
 * - Difficulty and animal selection are decoupled: chosen before each run.
 * - Powerups are ammo-based (ticks remaining) rather than duration-based.
 * - Items are permanent equipment that persist for the entire run.
 */

/**
 * @typedef {Object} GameState
 * @property {'title'|'modeSelect'|'difficulty'|'select'|'playing'|'bossIntro'|'bossFight'|'levelComplete'|'gameWin'|'gameOver'} gameState - Current game phase / screen.
 * @property {number} selectedMode - Index of highlighted mode on the mode-select screen.
 * @property {'easy'|'medium'|'hard'} difficulty - Active difficulty key.
 * @property {number} selectedDifficulty - Index of highlighted difficulty on the difficulty screen.
 * @property {number} selectedAnimal - Index of highlighted animal on the select screen.
 * @property {number} currentLevel - 1-based level number (1 = Dark Forest, 2 = Highway, 3 = Ice Age).
 * @property {number} screenShake - Remaining frames of camera shake effect.
 * @property {number} screenFlash - Remaining frames of screen flash overlay.
 * @property {Array<Object>} particles - Active particle effect instances.
 * @property {Array<Object>} floatingTexts - Active floating damage/score text instances.
 * @property {number} transitionTimer - Countdown frames for level transition animation.
 * @property {Object|null} levelData - Current level layout returned by getLevelData(), null before first load.
 * @property {Array<Object>} zombies - Active zombie enemy instances.
 * @property {Array<Object>} healthPickups - Dropped health restore pickups on the ground.
 * @property {Array<Object>} powerupCrates - Breakable crates that drop a random powerup.
 * @property {Object|null} diamond - End-of-level diamond collectible, null until spawned.
 * @property {Object|null} boss - Boss enemy instance, null outside boss fights.
 * @property {number} bossIntroTimer - Countdown frames for boss intro cinematic.
 * @property {number} deathTimer - Countdown frames for death animation before game-over screen.
 * @property {Object|null} portal - Exit portal object, null until spawned after boss defeat.
 * @property {Array<Object>} projectiles - Active projectile instances (banana boomerangs, boss attacks, etc.).
 * @property {Array<Object>} armorCrates - Breakable crates that drop armor pickups.
 * @property {Array<Object>} armorPickups - Armor items on the ground awaiting collection.
 * @property {Array<Object>} glassesCrates - Breakable crates that drop aviator glasses.
 * @property {Array<Object>} glassesPickups - Aviator glasses items on the ground.
 * @property {Array<Object>} sneakersCrates - Breakable crates that drop cowboy boots.
 * @property {Array<Object>} sneakersPickups - Cowboy boots items on the ground.
 * @property {Array<Object>} cleatsCrates - Breakable crates that drop soccer cleats.
 * @property {Array<Object>} cleatsPickups - Soccer cleats items on the ground.
 * @property {Array<Object>} horseCrates - Breakable crates that drop war horse tokens.
 * @property {Array<Object>} horsePickups - War horse tokens on the ground.
 * @property {Array<Object>} allies - Active allied NPC instances (e.g., horse companion).
 * @property {Array<Object>} leaderboard - Saved high-score entries.
 * @property {string} nameEntry - Current text in the name-entry field on the game-over screen.
 * @property {boolean} nameEntryActive - Whether the name-entry text field is focused.
 */

/**
 * @typedef {Object} Player
 * @property {string} animal - Selected animal id ('leopard', 'redPanda', 'lion', 'gator').
 * @property {number} x - World x-position (left edge).
 * @property {number} y - World y-position (top edge).
 * @property {number} w - Collision width in pixels.
 * @property {number} h - Collision height in pixels.
 * @property {number} vx - Horizontal velocity (pixels/frame).
 * @property {number} vy - Vertical velocity (pixels/frame), positive = downward.
 * @property {number} speed - Current movement speed (may be modified by powerups/items).
 * @property {number} jumpForce - Current jump impulse (negative = upward).
 * @property {number} baseSpeed - Unmodified movement speed for the selected animal.
 * @property {number} baseJumpForce - Unmodified jump impulse for the selected animal.
 * @property {number} baseDamage - Unmodified melee damage for the selected animal.
 * @property {number} baseCooldown - Unmodified attack cooldown in frames for the selected animal.
 * @property {boolean} onGround - Whether the player is standing on solid ground or a platform.
 * @property {number} hp - Current hit points.
 * @property {number} maxHp - Maximum hit points (affected by difficulty hpMult).
 * @property {boolean} attacking - Whether a melee attack animation is currently playing.
 * @property {number} attackTimer - Remaining frames of the current attack animation.
 * @property {number} attackCooldown - Remaining frames before the next attack can start.
 * @property {1|-1} facing - Horizontal direction: 1 = right, -1 = left.
 * @property {number} frame - Current animation frame index for walk/idle cycle.
 * @property {number} frameTimer - Frame counter used to advance animation frames.
 * @property {number} invincible - Remaining frames of invincibility (post-hit i-frames).
 * @property {number} combo - Current combo hit count (resets after comboTimer expires).
 * @property {number} comboTimer - Remaining frames before combo resets to 0.
 * @property {number} score - Accumulated score for the current run.
 * @property {number} lives - Remaining extra lives.
 * @property {number} knockbackX - Horizontal knockback velocity applied this frame.
 * @property {Object} powerups - Active powerup ammo/timer counters (0 = inactive).
 * @property {number} powerups.jumpyBoots - Remaining ammo for Jumpy Boots (+50% jump).
 * @property {number} powerups.clawsOfSteel - Remaining ammo for Claws of Steel (2x damage).
 * @property {number} powerups.superFangs - Remaining ammo for Super Fangs (2x attack speed).
 * @property {number} powerups.raceCar - Remaining ammo for Race Car (jet fire + speed).
 * @property {number} powerups.bananaCannon - Remaining ammo for Banana Cannon (ranged boomerang).
 * @property {number} powerups.litterBox - Remaining ammo for Litter Box (rear AOE attack).
 * @property {number} powerups.wings - Remaining ammo for Angel Wings (flight).
 * @property {Object} items - Permanent equipment flags/values for the current run.
 * @property {null|'leather'|'chainmail'} items.armor - Equipped armor tier, null if none.
 * @property {boolean} items.glasses - Whether aviator glasses are equipped (reveals crate contents).
 * @property {boolean} items.sneakers - Whether high-top sneakers are equipped (+50% jump hangtime). Always true at start.
 * @property {boolean} items.cowboyBoots - Whether cowboy boots are equipped (+20% attack range).
 * @property {boolean} items.soccerCleats - Whether soccer cleats are equipped (+15% movement speed).
 * @property {boolean} items.horse - Whether the war horse companion is active (requires cowboy boots).
 */

// Shared game state - all mutable globals live here

/** @type {number} Downward acceleration applied per frame to airborne entities. */
export const GRAVITY = 0.325;
/** @type {number} Y-coordinate of the ground plane; entities at or below this are "on ground". */
export const GROUND_Y = 440;

/** @type {number} Default player collision width in pixels before DRAW_SCALE. */
export const BASE_PLAYER_W = 48;
/** @type {number} Default player collision height in pixels before DRAW_SCALE. */
export const BASE_PLAYER_H = 60;
/** @type {number} Visual scale multiplier applied when drawing the player sprite. */
export const DRAW_SCALE = 1.62;

/**
 * Keyboard input state. Properties are key names (e.g. 'ArrowLeft', 'Space')
 * set to `true` while pressed, deleted on release. Populated by keydown/keyup
 * event listeners in the game loop.
 *
 * @type {Object<string, boolean>}
 */
export const keys = {};

/**
 * Difficulty presets that scale player HP, score rewards, enemy speed, and powerup frequency.
 * Harder difficulties reduce starting HP but reward higher score multipliers.
 *
 * @type {Object<string, {label: string, color: string, hpMult: number, scoreMult: number, enemySpeedMult: number, powerupFreqMult: number, desc: string}>}
 * @property {Object} chill - 150% HP (1.5x), 0.5x score, 0.7x enemy speed, 1.5x powerups. Relaxed play.
 * @property {Object} easy - Full HP (1.0x), 1x score. Beginner-friendly.
 * @property {Object} medium - 55% HP (0.55x), 1.75x score. Intermediate challenge.
 * @property {Object} hard - 35% HP (0.35x), 2.5x score. For expert players.
 */
export const DIFFICULTY_SETTINGS = {
  chill:  { label: 'CHILL',  color: '#88ccff', hpMult: 1.5,  scoreMult: 0.5,  enemySpeedMult: 0.7, powerupFreqMult: 1.5, desc: 'Relax and have fun!' },
  easy:   { label: 'EASY',   color: '#44ff44', hpMult: 1.0,  scoreMult: 1,    enemySpeedMult: 1.0, powerupFreqMult: 1.0, desc: 'Full HP - Great for learning!' },
  medium: { label: 'MEDIUM', color: '#ffaa00', hpMult: 0.55, scoreMult: 1.75, enemySpeedMult: 1.0, powerupFreqMult: 1.0, desc: '55% HP - A real challenge!' },
  hard:   { label: 'HARD',   color: '#ff4444', hpMult: 0.35, scoreMult: 2.5,  enemySpeedMult: 1.0, powerupFreqMult: 1.0, desc: '35% HP - For hardcore players!' },
};

/**
 * Playable animal character definitions. Each animal has unique stat multipliers
 * applied to the base player values at run start. Speed/damage/hp values are
 * multipliers (1.0 = baseline leopard stats).
 *
 * @type {Array<{id: string, name: string, color: string, speed: number, damage: number, hp: number, desc: string}>}
 */
export const ANIMAL_TYPES = [
  { id: 'leopard', name: 'LEOPARD', color: '#e8a828', speed: 1.0, damage: 1.0, hp: 50, desc: 'Balanced fighter' },
  { id: 'redPanda', name: 'RED PANDA', color: '#cc4422', speed: 1.2, damage: 0.8, hp: 40, desc: 'Fast & agile' },
  { id: 'lion', name: 'LION', color: '#dda030', speed: 0.85, damage: 1.3, hp: 60, desc: 'Strong & tough' },
  { id: 'gator', name: 'GATOR', color: '#44aa44', speed: 0.75, damage: 1.5, hp: 75, desc: 'Slow but deadly' },
];

/**
 * Central mutable game state. Properties are reset at the start of each run.
 * All modules read and write this object directly (no getters/setters).
 *
 * @type {GameState}
 */
export const state = {
  gameState: 'title', // title, modeSelect, difficulty, select, playing, bossIntro, bossFight, levelComplete, gameWin, gameOver
  selectedMode: 0,
  difficulty: 'easy',
  selectedDifficulty: 0,
  selectedAnimal: 0,
  currentLevel: 1,
  screenShake: 0,
  screenFlash: 0,
  particles: [],
  floatingTexts: [],
  transitionTimer: 0,
  levelData: null,
  zombies: [],
  healthPickups: [],
  powerupCrates: [],
  diamond: null,
  boss: null,
  bossIntroTimer: 0,
  deathTimer: 0,
  portal: null,
  projectiles: [],
  armorCrates: [],
  armorPickups: [],
  glassesCrates: [],
  glassesPickups: [],
  sneakersCrates: [],
  sneakersPickups: [],
  cleatsCrates: [],
  cleatsPickups: [],
  horseCrates: [],
  horsePickups: [],
  allies: [],
  leaderboard: [],
  nameEntry: '',
  nameEntryActive: false,
};

/**
 * Mutable player character state. Reset and configured per-run based on the
 * selected animal and difficulty. Powerup counters tick down each frame;
 * items are boolean flags toggled on pickup.
 *
 * @type {Player}
 */
export const player = {
  animal: 'leopard',
  x: 80, y: GROUND_Y, w: BASE_PLAYER_W, h: BASE_PLAYER_H,
  vx: 0, vy: 0,
  speed: 2.8125, jumpForce: -12.75,
  baseSpeed: 2.8125, baseJumpForce: -12.75, baseDamage: 15, baseCooldown: 20,
  onGround: false,
  hp: 100, maxHp: 100,
  attacking: false, attackTimer: 0, attackCooldown: 0,
  facing: 1,
  frame: 0, frameTimer: 0,
  invincible: 0,
  combo: 0, comboTimer: 0,
  score: 0, lives: 3,
  knockbackX: 0,
  powerups: {
    jumpyBoots: 0,
    clawsOfSteel: 0,
    superFangs: 0,
    raceCar: 0,
    bananaCannon: 0,
    litterBox: 0,
    wings: 0
  },
  items: {
    armor: null,  // null, 'leather', or 'chainmail'
    glasses: false, // aviator glasses - see powerup crate contents
    sneakers: true, // high-top sneakers - 50% more jump hangtime (always equipped from start)
    cowboyBoots: false, // cowboy boots - +20% attack range
    soccerCleats: false, // soccer cleats - +15% movement speed
    horse: false // horse ally - requires cowboy boots, permanent NPC
  }
};

/**
 * Camera offset used to scroll the viewport. Updated each frame to follow
 * the player with smooth interpolation. (0,0) means no offset from origin.
 *
 * @type {{x: number, y: number}}
 */
export const camera = { x: 0, y: 0 };

/**
 * Catalog of all available powerup types. Each entry defines display metadata
 * and an icon key used by the renderer. Powerups are temporary ammo-based
 * abilities dropped from crates.
 *
 * @type {Array<{id: string, name: string, color: string, desc: string, icon: string}>}
 */
export const POWERUP_TYPES = [
  { id: 'jumpyBoots', name: 'JUMPY BOOTS', color: '#44ff88', desc: '+50% Jump Height', icon: 'boot' },
  { id: 'clawsOfSteel', name: 'CLAWS OF STEEL', color: '#ff8844', desc: '2x Attack Damage', icon: 'claw' },
  { id: 'superFangs', name: 'SUPER FANGS', color: '#ff44ff', desc: '2x Attack Speed', icon: 'fang' },
  { id: 'raceCar', name: 'RACE CAR', color: '#cc2222', desc: 'Jet Fire + Speed!', icon: 'car' },
  { id: 'bananaCannon', name: 'BANANA CANNON', color: '#ffdd00', desc: 'Ranged Boomerang!', icon: 'banana' },
  { id: 'litterBox', name: 'LITTER BOX', color: '#aa8844', desc: 'Rear AOE Attack!', icon: 'litter' },
  { id: 'wings', name: 'ANGEL WINGS', color: '#aaddff', desc: 'Fly Anywhere!', icon: 'wings' },
];
/** @type {number} Default powerup duration in frames (~25 seconds at 60fps). Currently unused in favor of per-type ammo counts. */
export const POWERUP_DURATION = 1500;

/**
 * Starting ammo counts for each powerup type. Ammo decrements per use or per
 * frame depending on the powerup. When a counter reaches 0 the powerup expires.
 *
 * @type {Object<string, number>}
 */
export const POWERUP_AMMO = {
  jumpyBoots: 15,      // per jump
  clawsOfSteel: 25,    // per attack
  superFangs: 25,      // per attack
  raceCar: 500,        // per frame
  bananaCannon: 12,    // per shot
  litterBox: 8,        // per use
  wings: 600,          // per frame
};

/**
 * Armor item definitions ordered by tier. Higher tiers provide more damage
 * reduction. The `level` field indicates the minimum game level at which
 * this armor can appear in crates.
 *
 * @type {Array<{id: string, name: string, color: string, desc: string, tier: number, level: number}>}
 */
export const ARMOR_TYPES = [
  { id: 'leather', name: 'LEATHER ARMOR', color: '#b08040', desc: 'Light Protection', tier: 1, level: 2 },
  { id: 'chainmail', name: 'CHAINMAIL ARMOR', color: '#aaaacc', desc: 'Medium Protection', tier: 2, level: 3 },
];

/**
 * Aviator glasses item definition. When equipped, reveals the contents of
 * powerup crates before breaking them. Available from level 1 onward.
 *
 * @type {{id: string, name: string, color: string, desc: string, level: number}}
 */
export const GLASSES_TYPE = {
  id: 'aviator', name: 'AVIATOR GLASSES', color: '#ffaa00', desc: 'See Crate Contents!', level: 1
};

/**
 * Cowboy boots item definition. Extends melee attack reach by 20%. Also a
 * prerequisite for the war horse companion. Available from level 2 onward.
 * NOTE: Named SNEAKERS_TYPE for historical reasons; the actual item is cowboy boots.
 *
 * @type {{id: string, name: string, color: string, desc: string, level: number}}
 * @see getAttackBox
 */
export const SNEAKERS_TYPE = {
  id: 'cowboyBoots', name: 'COWBOY BOOTS', color: '#8B4513', desc: '+20% Attack Range!', level: 2
};

/**
 * Soccer cleats item definition. Permanently increases movement speed by 15%
 * for the current run. Available from level 1 onward.
 *
 * @type {{id: string, name: string, color: string, desc: string, level: number}}
 */
export const CLEATS_TYPE = {
  id: 'soccerCleats', name: 'SOCCER CLEATS', color: '#00cc44', desc: '+15% Move Speed!', level: 1
};

/**
 * War horse companion item definition. Spawns a permanent allied horse NPC
 * that fights alongside the player. Requires cowboy boots to be equipped first.
 * Available from level 3 onward.
 *
 * @type {{id: string, name: string, color: string, desc: string, level: number}}
 * @see SNEAKERS_TYPE
 */
export const HORSE_TYPE = {
  id: 'horse', name: 'WAR HORSE', color: '#8B6914', desc: 'Allied Horse Companion!', level: 3
};
