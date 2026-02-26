/**
 * @module 3d/constants
 * @description Immutable constant and configuration definitions for the 3D Roguelike Survivor mode.
 *
 * This module contains all pure-data constants that were previously defined at the top of game3d.js.
 * None of these values are mutated at runtime. Constants with `apply`/`remove` functions
 * (POWERUPS_3D, SHRINE_AUGMENTS) operate on the game state object passed to them but
 * the constant definitions themselves are never reassigned or structurally modified.
 *
 * Extracted from game3d.js as Layer 0 of the modular decomposition.
 */

/** @constant {number} ARENA_SIZE - Half-size of the initial spawn area for shrines/totems (80 = 160x160 spawn zone). */
export const ARENA_SIZE = 80;
/** @constant {number} SHRINE_COUNT - Total number of finite shrines pre-placed at game start. */
export const SHRINE_COUNT = 20;
/** @constant {number} CHUNK_SIZE - Width/depth of each terrain chunk in world units. */
export const CHUNK_SIZE = 16;
/** @constant {number} GRAVITY_3D - Downward acceleration in units/s^2 for player and zombie jumping. */
export const GRAVITY_3D = 22;
/** @constant {number} JUMP_FORCE - Base upward velocity applied on jump (modified by jumpBoost). */
export const JUMP_FORCE = 10;
/** @constant {number} GROUND_Y - Baseline Y coordinate for flat ground (before terrain noise). */
export const GROUND_Y = 0;
/** @constant {number} CAMERA_Y_OFFSET - Vertical offset from player to camera (default follow height). */
export const CAMERA_Y_OFFSET = 18;
/** @constant {number} CAMERA_Z_OFFSET - Depth offset from player to camera (default follow distance). */
export const CAMERA_Z_OFFSET = 14;
/** @constant {number} CAMERA_SMOOTH_FACTOR - Lerp factor for camera position smoothing (0-1). */
export const CAMERA_SMOOTH_FACTOR = 0.05;
/** @constant {number} MAP_HALF - Half the map dimension; world extends from -MAP_HALF to +MAP_HALF on X and Z. */
export const MAP_HALF = 128; // 256x256 total map (extends -128 to +128 on both axes)

/** @constant {number} MAP_GEMS_PER_CHUNK - Base number of XP gems per chunk (randomized ±1 at generation). */
export const MAP_GEMS_PER_CHUNK = 4;
/** @constant {number} GEM_XP_MIN - Minimum XP value of a single map gem pickup. */
export const GEM_XP_MIN = 2;
/** @constant {number} GEM_XP_MAX - Maximum XP value of a single map gem pickup. */
export const GEM_XP_MAX = 4;
/** @constant {number} GEM_COLLECT_RADIUS - Pickup radius for map gems (slightly larger than drop gems). */
export const GEM_COLLECT_RADIUS = 2.5;

/**
 * Color palettes for each playable animal's 3D box model.
 * Each palette provides hex colors for body, head, accent details, spot markings, and tail.
 *
 * @constant {Object.<string, {body: number, head: number, accent: number, spot: number, tail: number}>}
 * @property {Object} leopard  - Golden-yellow tones with dark amber spots.
 * @property {Object} redPanda - Reddish-brown with dark accents and cream markings.
 * @property {Object} lion     - Warm golden-brown with tawny mane coloring.
 * @property {Object} gator    - Deep green with lighter belly tones.
 */
export const ANIMAL_PALETTES = {
  leopard: { body: 0xe8a828, head: 0xf0c050, accent: 0xd09020, spot: 0xa06810, tail: 0xc08818 },
  redPanda: { body: 0xcc4422, head: 0xdd6644, accent: 0xaa3311, spot: 0x882200, tail: 0xbb3318 },
  lion: { body: 0xdda030, head: 0xeebb44, accent: 0xcc8820, spot: 0xaa6610, tail: 0xbb7718 },
  gator: { body: 0x44aa44, head: 0x55cc55, accent: 0x338833, spot: 0x226622, tail: 0x2a7a2a },
};

/**
 * Weapon type definitions for the weapon slot system.
 * Each weapon has a unique attack pattern, base stats, and 5 level-up tiers.
 * Weapons auto-fire at the nearest enemy within range when their cooldown expires.
 *
 * @constant {Object.<string, {id: string, name: string, type: string, color: string, desc: string, baseDamage: number, baseCooldown: number, baseRange: number, maxLevel: number, weaponClass: string, levelDescs: string[]}>}
 * @property {Object} clawSwipe     - Melee AoE arc slash hitting all enemies in range.
 * @property {Object} boneToss      - Ranged projectile(s) that fly toward targets; gains extra projectiles at levels 2/5.
 * @property {Object} poisonCloud   - AoE damage-over-time cloud placed at enemy position.
 * @property {Object} lightningBolt - Chain lightning that jumps between enemies; gains chains at levels 1/3/5.
 * @property {Object} fireball      - Projectile that explodes on impact dealing AoE damage.
 * @property {Object} boomerang     - Piercing cross-shaped disc that arcs out and returns to player.
 * @property {Object} turdMine      - Stationary mine dropped at player position; detonates on proximity dealing AoE damage + slow debuff.
 */
export const WEAPON_TYPES = {
  clawSwipe: {
    id: 'clawSwipe', name: 'CLAW SWIPE', type: 'melee', color: '#ff8844',
    desc: 'Slash nearby enemies!', baseDamage: 12, baseCooldown: 1.2, baseRange: 2.5, maxLevel: 5,
    weaponClass: 'aoe',
    levelDescs: ['Hit harder!', 'Reach farther!', 'Hit harder!', 'Attack faster!', 'Way stronger!'],
  },
  boneToss: {
    id: 'boneToss', name: 'BONE TOSS', type: 'projectile', color: '#ccccaa',
    desc: 'Throw bones!', baseDamage: 10, baseCooldown: 1.5, baseRange: 12, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['Hit harder!', 'Throw more!', 'Throw faster!', 'Attack faster!', 'Even more bones!'],
  },
  poisonCloud: {
    id: 'poisonCloud', name: 'POISON CLOUD', type: 'aoe', color: '#44cc44',
    desc: 'Stinky gas cloud!', baseDamage: 5, baseCooldown: 3, baseRange: 8, maxLevel: 5,
    weaponClass: 'mine',
    levelDescs: ['More stinky!', 'Bigger cloud!', 'Lasts longer!', 'Attack faster!', 'Super stinky!'],
  },
  lightningBolt: {
    id: 'lightningBolt', name: 'LIGHTNING BOLT', type: 'chain', color: '#aaddff',
    desc: 'Zaps enemies!', baseDamage: 15, baseCooldown: 2, baseRange: 8, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['Zaps more!', 'Hit harder!', 'Zaps more!', 'Attack faster!', 'Mega zap!'],
  },
  fireball: {
    id: 'fireball', name: 'FIREBALL', type: 'projectile_aoe', color: '#ff4400',
    desc: 'Big boom!', baseDamage: 20, baseCooldown: 2.5, baseRange: 10, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['Hit harder!', 'Bigger boom!', 'Hit harder!', 'Attack faster!', 'Huge boom!'],
  },
  boomerang: {
    id: 'boomerang', name: 'BOOMERANG', type: 'boomerang', color: '#aa44ff',
    desc: 'Comes back to you!', baseDamage: 8, baseCooldown: 1.8, baseRange: 10, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['Hit harder!', 'Throw more!', 'Goes faster!', 'Attack faster!', 'Super strong!'],
  },
  mudBomb: {
    id: 'mudBomb', name: 'MUD BOMB', type: 'projectile_aoe', color: '#8B6914',
    desc: 'Splats and slows!', baseDamage: 18, baseCooldown: 2.8, baseRange: 9, maxLevel: 5,
    weaponClass: 'aoe',
    levelDescs: ['Hit harder!', 'Bigger splat!', 'Hit harder!', 'Attack faster!', 'Mega splat!'],
  },
  beehiveLauncher: {
    id: 'beehiveLauncher', name: 'BEEHIVE LAUNCHER', type: 'summon', color: '#DAA520',
    desc: 'Angry bees chase enemies!', baseDamage: 6, baseCooldown: 4.0, baseRange: 10, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['More bees!', 'Bees last longer!', 'Even more bees!', 'Attack faster!', 'Bees go boom!'],
  },
  snowballTurret: {
    id: 'snowballTurret', name: 'SNOWBALL TURRET', type: 'orbit', color: '#88ccff',
    desc: 'Snowball helper!', baseDamage: 7, baseCooldown: 3.5, baseRange: 8, maxLevel: 5,
    weaponClass: 'projectile',
    levelDescs: ['More turrets!', 'Shoots faster!', 'Hit harder!', 'Attack faster!', 'Turret plus freeze!'],
  },
  stinkLine: {
    id: 'stinkLine', name: 'STINK LINE', type: 'trail', color: '#44cc44',
    desc: 'Stinky trail!', baseDamage: 4, baseCooldown: 0.15, baseRange: 0, maxLevel: 5,
    weaponClass: 'aoe',
    levelDescs: ['More stinky!', 'Lasts longer!', 'More stinky!', 'Wider trail!', 'Super gross trail!'],
  },
  turdMine: {
    id: 'turdMine', name: 'TURD MINE', type: 'mine', color: '#8B4513',
    desc: 'Stinky land mine!', baseDamage: 30, baseCooldown: 3.0, baseRange: 2.5, maxLevel: 5,
    weaponClass: 'mine',
    levelDescs: ['Hit harder!', 'Bigger boom!', 'Hit harder!', 'Attack faster!', 'Mega stink bomb!'],
  },
};

/**
 * Howl type definitions — passive global buffs selected during level-up.
 * Howls stack multiplicatively and affect all weapons simultaneously.
 *
 * @constant {Object.<string, {id: string, name: string, color: string, desc: string, maxLevel: number}>}
 * @property {Object} power    - +15% all weapon damage per level (max 5).
 * @property {Object} haste    - -15% all weapon cooldowns per level (max 5, floor 0.3x).
 * @property {Object} arcane   - +1 projectile count for multi-shot weapons (max 3).
 * @property {Object} vitality - +20 max HP and instant heal per level (max 5).
 * @property {Object} fortune  - +30% XP gain per level (max 3).
 * @property {Object} range    - +20% weapon range per level (max 5).
 * @property {Object} thorns   - Reflect 10% contact damage per level (max 3).
 * @property {Object} magnet   - +25% pickup radius per level (max 4).
 * @property {Object} frenzy   - +10% attack speed per level (max 4).
 * @property {Object} guardian - +8% max HP and +1 HP/s regen per level (max 3).
 */
export const HOWL_TYPES = {
  power: { id: 'power', name: 'POWER HOWL', color: '#ff4444', desc: 'Hit harder!', maxLevel: 5 },
  haste: { id: 'haste', name: 'HASTE HOWL', color: '#ffaa44', desc: 'Attack faster!', maxLevel: 5 },
  arcane: { id: 'arcane', name: 'ARCANE HOWL', color: '#aa44ff', desc: 'Shoot more stuff!', maxLevel: 3 },
  vitality: { id: 'vitality', name: 'VITALITY HOWL', color: '#44ff44', desc: 'More hearts!', maxLevel: 5 },
  fortune: { id: 'fortune', name: 'FORTUNE HOWL', color: '#ffff44', desc: 'Level up faster!', maxLevel: 3 },
  range: { id: 'range', name: 'RANGE HOWL', color: '#44aaff', desc: 'Reach farther!', maxLevel: 5 },
  thorns: { id: 'thorns', name: 'THORNS HOWL', color: '#cc4422', desc: 'Hurt them back!', maxLevel: 3 },
  magnet: { id: 'magnet', name: 'MAGNET HOWL', color: '#cccccc', desc: 'Grab stuff easier!', maxLevel: 4 },
  frenzy: { id: 'frenzy', name: 'FRENZY HOWL', color: '#ff44ff', desc: 'Attack faster!', maxLevel: 4 },
  guardian: { id: 'guardian', name: 'GUARDIAN HOWL', color: '#44ff88', desc: 'Tougher and heal!', maxLevel: 3 },
};

/**
 * Temporary powerup definitions for 3D mode. Found in crates and zombie drops.
 * Each powerup has an `apply(st)` that activates the effect and a `remove(st)` that reverses it.
 * Only one powerup can be active at a time; activating a new one removes the previous.
 *
 * 18 powerups total:
 * - jumpyBoots: +50% jump height (15s)
 * - clawsOfSteel: 2x attack damage (20s)
 * - superFangs: 2x attack speed (20s)
 * - raceCar: 2x speed + fire aura trail damage (12s)
 * - bananaCannon: Ranged banana projectile mode (15s)
 * - wings: Free flight with Alt+W/S G-force maneuvers (15s)
 * - frostNova: Instant freeze burst on all nearby zombies (1s, one-shot)
 * - berserkerRage: +50% dmg, +30% speed, but +25% vulnerability (20s)
 * - ghostForm: Full invulnerability, cannot attack (8s)
 * - earthquakeStomp: Landing from jumps creates AoE shockwaves (15s)
 * - vampireFangs: Passive 3 HP/s regeneration (20s)
 * - lightningShield: Zaps nearest enemy every 0.5s for 10 dmg (15s)
 * - giantGrowth: 2x size/dmg, -30% speed (15s)
 * - timeWarp: Slow all zombies to 25% speed (10s)
 * - magnetAura: 5x pickup radius (20s)
 * - mirrorImage: 2 AI clone allies that orbit and attack (15s)
 * - bombTrail: Drop explosive bombs every 0.5s while moving (12s)
 * - regenBurst: Rapidly heal to full at maxHP/5 per second (5s)
 *
 * @constant {Array.<{id: string, name: string, color: string, colorHex: number, desc: string, duration: number, apply: function(State3D): void, remove: function(State3D): void}>}
 */
export const POWERUPS_3D = [
  { id: 'jumpyBoots', name: 'JUMPY BOOTS', color: '#44ff88', colorHex: 0x44ff88, desc: '+50% Jump Height', duration: 15, apply: s => { s.jumpBoost = 1.5; }, remove: s => { s.jumpBoost = 1; } },
  { id: 'clawsOfSteel', name: 'CLAWS OF STEEL', color: '#ff8844', colorHex: 0xff8844, desc: '2x Attack Damage', duration: 20, apply: s => { s.dmgBoost = 2; }, remove: s => { s.dmgBoost = 1; } },
  { id: 'superFangs', name: 'SUPER FANGS', color: '#ff44ff', colorHex: 0xff44ff, desc: '2x Attack Speed', duration: 20, apply: s => { s.atkSpeedBoost = 2; }, remove: s => { s.atkSpeedBoost = 1; } },
  { id: 'raceCar', name: 'RACE CAR', color: '#cc2222', colorHex: 0xcc2222, desc: '2x Speed + Fire!', duration: 12, apply: s => { s.speedBoost = 2; s.fireAura = true; }, remove: s => { s.speedBoost = 1; s.fireAura = false; } },
  { id: 'bananaCannon', name: 'BANANA CANNON', color: '#ffdd00', colorHex: 0xffdd00, desc: 'Ranged Attack!', duration: 15, apply: s => { s.rangedMode = true; }, remove: s => { s.rangedMode = false; } },
  { id: 'wings', name: 'ANGEL WINGS', color: '#aaddff', colorHex: 0xaaddff, desc: 'Fly Anywhere!', duration: 15, apply: s => { s.flying = true; }, remove: s => { s.flying = false; s.gManeuver = false; s.gManeuverPitch = 0; } },
  { id: 'frostNova', name: 'FROST NOVA', color: '#88ccff', colorHex: 0x88ccff, desc: 'Freeze Nearby Zombies!', duration: 1, apply: s => { s.frostNova = true; }, remove: s => { s.frostNova = false; } },
  { id: 'berserkerRage', name: 'BERSERKER RAGE', color: '#881111', colorHex: 0x881111, desc: '+50% Dmg, +30% Spd, +25% Vuln', duration: 20, apply: s => { s.dmgBoost = 1.5; s.speedBoost = 1.3; s.berserkVulnerable = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.berserkVulnerable = false; } },
  { id: 'ghostForm', name: 'GHOST FORM', color: '#eeeeff', colorHex: 0xeeeeff, desc: 'Invulnerable, Can\'t Attack', duration: 8, apply: s => { s.ghostForm = true; s.invincible = 999; }, remove: s => { s.ghostForm = false; s.invincible = 0; } },
  { id: 'earthquakeStomp', name: 'EARTHQUAKE STOMP', color: '#8B6914', colorHex: 0x8B6914, desc: 'Landings Create Shockwaves!', duration: 15, apply: s => { s.earthquakeStomp = true; }, remove: s => { s.earthquakeStomp = false; } },
  { id: 'vampireFangs', name: 'VAMPIRE FANGS', color: '#6a0dad', colorHex: 0x6a0dad, desc: 'Passive HP Regen!', duration: 20, apply: s => { s.vampireHeal = true; }, remove: s => { s.vampireHeal = false; } },
  { id: 'lightningShield', name: 'LIGHTNING SHIELD', color: '#44aaff', colorHex: 0x44aaff, desc: 'Zap Nearby Enemies!', duration: 15, apply: s => { s.lightningShield = true; s.lightningShieldTimer = 0; }, remove: s => { s.lightningShield = false; } },
  { id: 'giantGrowth', name: 'GIANT GROWTH', color: '#22cc44', colorHex: 0x22cc44, desc: '2x Size & Dmg, -30% Speed', duration: 15, apply: s => { s.dmgBoost = 2; s.speedBoost = 0.7; s.giantMode = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.giantMode = false; } },
  { id: 'timeWarp', name: 'TIME WARP', color: '#9944ff', colorHex: 0x9944ff, desc: 'Slow All Zombies!', duration: 10, apply: s => { s.timeWarp = true; for (const e of s.enemies) e.speed *= 0.25; }, remove: s => { s.timeWarp = false; for (const e of s.enemies) e.speed *= 4; } },
  { id: 'magnetAura', name: 'MAGNET AURA', color: '#aaaaaa', colorHex: 0xaaaaaa, desc: '5x Pickup Radius!', duration: 20, apply: s => { s.collectRadius *= 5; }, remove: s => { s.collectRadius /= 5; } },
  { id: 'mirrorImage', name: 'MIRROR IMAGE', color: '#44ffff', colorHex: 0x44ffff, desc: 'AI Clones Fight For You!', duration: 15, apply: s => { s.mirrorClones = true; }, remove: s => { s.mirrorClones = false; } },
  { id: 'bombTrail', name: 'BOMB TRAIL', color: '#ff6622', colorHex: 0xff6622, desc: 'Leave Explosive Bombs!', duration: 12, apply: s => { s.bombTrail = true; s.bombTrailTimer = 0; }, remove: s => { s.bombTrail = false; } },
  { id: 'regenBurst', name: 'REGEN BURST', color: '#33ff33', colorHex: 0x33ff33, desc: 'Rapidly Heal To Full!', duration: 5, apply: s => { s.regenBurst = true; }, remove: s => { s.regenBurst = false; } },
];

/**
 * Item rarity tier definitions for the 4-tier rarity system.
 * Each tier has a display name, color for HUD text, hex color for meshes, and a drop weight
 * that determines how likely items of that rarity are to be selected during spawning.
 *
 * Drop weight distribution: Common 50%, Uncommon 28%, Rare 16%, Legendary 6%.
 *
 * @constant {Object.<string, {name: string, color: string, colorHex: number, weight: number}>}
 */
export const ITEM_RARITIES = {
  common:    { name: 'Stuff',             color: '#ffffff', colorHex: 0xffffff, weight: 50 },
  uncommon:  { name: 'Good Stuff',        color: '#44ff44', colorHex: 0x44ff44, weight: 28 },
  rare:      { name: 'Shiny Stuff',       color: '#4488ff', colorHex: 0x4488ff, weight: 16 },
  legendary: { name: 'REALLY Cool Stuff', color: '#ff8800', colorHex: 0xff8800, weight: 6 },
};

/**
 * Permanent item definitions for 3D mode. Found as floating pickups on the map.
 * Items occupy named equipment slots; only one item per slot (armor allows tier upgrade).
 * Stackable items (`stackable: true`) bypass slot restrictions and accumulate freely.
 *
 * 25 items across 4 rarity tiers:
 *
 * **Common (Stuff) - 8 items:**
 * - leather (armor slot, tier 1): -25% damage taken
 * - soccerCleats (boots slot): +15% move speed
 * - glasses (glasses slot): Reveals crate/pickup contents through HUD labels
 * - magnetRing (ring slot): +50% pickup radius
 * - rubberDucky (stackable): +10% move speed per stack
 * - thickFur (stackable): +15 max HP per stack
 * - sillyStraw (stackable): Heal 1 HP per 10 kills
 * - bandana (stackable): +5% all damage per stack
 *
 * **Uncommon (Good Stuff) - 7 items:**
 * - cowboyBoots (boots slot): +20% attack range
 * - luckyCharm (charm slot): +50% zombie loot drop rate
 * - healthPendant (pendant slot): +1 HP/s passive regeneration
 * - critGloves (gloves slot): 15% chance for 2x damage on attacks
 * - hotSauce (stackable): 15% chance to ignite enemies (DoT)
 * - bouncyBall (stackable): Projectiles gain 1 ricochet per stack
 * - luckyPenny (stackable): +8% powerup drop chance per stack
 *
 * **Rare (Shiny Stuff) - 6 items:**
 * - chainmail (armor slot, tier 2): -40% damage taken
 * - thornedVest (vest slot): Reflects 20% of contact damage back to attacker
 * - shieldBracelet (bracelet slot): Blocks 1 hit every 30 seconds
 * - alarmClock (stackable): -8% weapon cooldowns per stack
 * - whoopeeCushion (cushion slot): 20% chance enemies explode on death (AoE)
 * - turboSneakers (turboshoes slot): +25% move speed, +10% dodge chance
 *
 * **Legendary (REALLY Cool Stuff) - 4 items:**
 * - goldenBone (goldenbone slot): +30% all weapon damage
 * - crownOfClaws (crown slot): Auto-attacks hit 1 additional target
 * - zombieMagnet (zombiemagnet slot): Enemies drop 2x XP gems
 * - rainbowScarf (scarf slot): All howl effects +50% stronger
 *
 * @constant {Array.<{id: string, name: string, color: string, colorHex: number, desc: string, slot: string, rarity: string, tier?: number, stackable?: boolean}>}
 */
export const ITEMS_3D = [
  // === COMMON (Stuff) ===
  { id: 'leather', name: 'LEATHER ARMOR', color: '#b08040', colorHex: 0xb08040, desc: '-25% Damage Taken', slot: 'armor', tier: 1, rarity: 'common' },
  { id: 'soccerCleats', name: 'SOCCER CLEATS', color: '#00cc44', colorHex: 0x00cc44, desc: '+15% Move Speed', slot: 'boots', rarity: 'common' },
  { id: 'glasses', name: 'AVIATOR GLASSES', color: '#ffaa00', colorHex: 0xffaa00, desc: 'See Crate Contents', slot: 'glasses', rarity: 'common' },
  { id: 'magnetRing', name: 'MAGNET RING', color: '#cccccc', colorHex: 0xcccccc, desc: '+50% Pickup Radius', slot: 'ring', rarity: 'common' },
  { id: 'rubberDucky', name: 'RUBBER DUCKY', color: '#ffffff', colorHex: 0xffff44, desc: '+10% Move Speed', slot: 'duck', rarity: 'common', stackable: true },
  { id: 'thickFur', name: 'THICK FUR', color: '#ffffff', colorHex: 0xbb8855, desc: '+15 Max HP', slot: 'fur', rarity: 'common', stackable: true },
  { id: 'sillyStraw', name: 'SILLY STRAW', color: '#ffffff', colorHex: 0xff66aa, desc: 'Heal 1 HP / 10 Kills', slot: 'straw', rarity: 'common', stackable: true },
  { id: 'bandana', name: 'BANDANA', color: '#ffffff', colorHex: 0xcc2222, desc: '+5% All Damage', slot: 'bandana', rarity: 'common', stackable: true },
  // === UNCOMMON (Good Stuff) ===
  { id: 'cowboyBoots', name: 'COWBOY BOOTS', color: '#44ff44', colorHex: 0x8B4513, desc: '+20% Attack Range', slot: 'boots', rarity: 'uncommon' },
  { id: 'luckyCharm', name: 'LUCKY CHARM', color: '#44ff44', colorHex: 0xffdd44, desc: '+50% Drop Rate', slot: 'charm', rarity: 'uncommon' },
  { id: 'healthPendant', name: 'HEALTH PENDANT', color: '#44ff44', colorHex: 0x44ff88, desc: '+1 HP/s Regen', slot: 'pendant', rarity: 'uncommon' },
  { id: 'critGloves', name: 'CRIT GLOVES', color: '#44ff44', colorHex: 0xff4488, desc: '15% Chance 2x Damage', slot: 'gloves', rarity: 'uncommon' },
  { id: 'hotSauce', name: 'HOT SAUCE BOTTLE', color: '#44ff44', colorHex: 0xff4400, desc: '15% Ignite Chance', slot: 'hotsauce', rarity: 'uncommon', stackable: true },
  { id: 'bouncyBall', name: 'BOUNCY BALL', color: '#44ff44', colorHex: 0x44ccff, desc: '+1 Ricochet', slot: 'ball', rarity: 'uncommon', stackable: true },
  { id: 'luckyPenny', name: 'LUCKY PENNY', color: '#44ff44', colorHex: 0xddaa44, desc: '+8% Powerup Drop Chance', slot: 'penny', rarity: 'uncommon', stackable: true },
  // === RARE (Shiny Stuff) ===
  { id: 'chainmail', name: 'CHAINMAIL', color: '#4488ff', colorHex: 0xaaaacc, desc: '-40% Damage Taken', slot: 'armor', tier: 2, rarity: 'rare' },
  { id: 'thornedVest', name: 'THORNED VEST', color: '#4488ff', colorHex: 0xcc4422, desc: 'Reflect 20% Damage', slot: 'vest', rarity: 'rare' },
  { id: 'shieldBracelet', name: 'SHIELD BRACELET', color: '#4488ff', colorHex: 0x4488ff, desc: 'Block 1 Hit / 30s', slot: 'bracelet', rarity: 'rare' },
  { id: 'alarmClock', name: 'ALARM CLOCK', color: '#4488ff', colorHex: 0x88ccff, desc: 'Attack faster!', slot: 'clock', rarity: 'rare', stackable: true },
  { id: 'whoopeeCushion', name: 'WHOOPEE CUSHION', color: '#4488ff', colorHex: 0xff88cc, desc: '20% Explode on Death', slot: 'cushion', rarity: 'rare' },
  { id: 'turboSneakers', name: 'TURBO SNEAKERS', color: '#4488ff', colorHex: 0x00ffaa, desc: '+25% Speed, +10% Dodge', slot: 'turboshoes', rarity: 'rare' },
  // === LEGENDARY (REALLY Cool Stuff) ===
  { id: 'goldenBone', name: 'GOLDEN BONE', color: '#ff8800', colorHex: 0xffcc00, desc: '+30% All Weapon Damage', slot: 'goldenbone', rarity: 'legendary' },
  { id: 'crownOfClaws', name: 'CROWN OF CLAWS', color: '#ff8800', colorHex: 0xffaa00, desc: '+1 Auto-Attack Target', slot: 'crown', rarity: 'legendary' },
  { id: 'zombieMagnet', name: 'ZOMBIE MAGNET', color: '#ff8800', colorHex: 0x88ff88, desc: '2x XP Gem Drops', slot: 'zombiemagnet', rarity: 'legendary' },
  { id: 'rainbowScarf', name: 'RAINBOW SCARF', color: '#ff8800', colorHex: 0xff44ff, desc: 'Howl Effects +50%', slot: 'scarf', rarity: 'legendary' },
];

/**
 * Wearable equipment definitions for the 3-slot wearable system (head, body, feet).
 * Wearables are permanent equipment that provide passive stat bonuses when worn.
 * Each wearable occupies one of 3 slots; only one item per slot. Higher rarity
 * auto-replaces lower rarity in the same slot.
 *
 * 6 wearables across 2 rarity tiers (Phase 1):
 *
 * **HEAD slot:**
 * - partyHat (common): +5% XP gain
 * - sharkFin (uncommon): +10% damage
 *
 * **BODY slot:**
 * - cardboardBox (common): -10% damage taken
 * - bumbleArmor (uncommon): -20% damage taken, +15 max HP
 *
 * **FEET slot:**
 * - clownShoes (common): +10% move speed
 * - springBoots (uncommon): +15% move speed, +30% jump height
 *
 * @constant {Object.<string, {slot: string, name: string, rarity: string, color: number, desc: string, effect: Object}>}
 */
export const WEARABLES_3D = {
  // HEAD slot
  partyHat: { slot: 'head', name: 'Party Hat', rarity: 'common', color: 0xff4488,
    desc: 'Fun hat!', effect: { xpMult: 1.05 },
    drawIcon(ctx, cx, cy, s) {
      // Colored triangle hat with white pom-pom and brim
      ctx.fillStyle = '#ff4488';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16 * s);
      ctx.lineTo(cx - 12 * s, cy + 6 * s);
      ctx.lineTo(cx + 12 * s, cy + 6 * s);
      ctx.closePath();
      ctx.fill();
      // Brim band
      ctx.fillStyle = '#cc3366';
      ctx.fillRect(cx - 14 * s, cy + 6 * s, 28 * s, 4 * s);
      // Pom-pom
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy - 16 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  sharkFin: { slot: 'head', name: 'Shark Fin', rarity: 'uncommon', color: 0x4488cc,
    desc: 'Look scary!', effect: { dmgMult: 1.10 },
    drawIcon(ctx, cx, cy, s) {
      // Tall vertical fin shape — narrow at top, wider at base
      ctx.fillStyle = '#888899';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16 * s);
      ctx.lineTo(cx - 8 * s, cy + 10 * s);
      ctx.lineTo(cx + 8 * s, cy + 10 * s);
      ctx.closePath();
      ctx.fill();
      // Darker ridge line down center
      ctx.strokeStyle = '#666677';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14 * s);
      ctx.lineTo(cx, cy + 8 * s);
      ctx.stroke();
    }
  },
  bumbleHelmet: { slot: 'head', name: 'Bumble Helm', rarity: 'rare', color: 0xffcc00,
    desc: 'Bzz bzz!', effect: { dmgReduction: 0.15, dmgMult: 1.08 },
    drawIcon(ctx, cx, cy, s) {
      // Yellow rounded helmet with black stripes and antennae
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(cx, cy + 2 * s, 14 * s, Math.PI, 0);
      ctx.lineTo(cx + 14 * s, cy + 10 * s);
      ctx.lineTo(cx - 14 * s, cy + 10 * s);
      ctx.closePath();
      ctx.fill();
      // Black horizontal stripes
      ctx.fillStyle = '#222222';
      ctx.fillRect(cx - 12 * s, cy - 2 * s, 24 * s, 3 * s);
      ctx.fillRect(cx - 10 * s, cy + 4 * s, 20 * s, 3 * s);
      // Antennae
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 5 * s, cy - 10 * s);
      ctx.lineTo(cx - 7 * s, cy - 16 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5 * s, cy - 10 * s);
      ctx.lineTo(cx + 7 * s, cy - 16 * s);
      ctx.stroke();
      // Antenna tips
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(cx - 7 * s, cy - 16 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 7 * s, cy - 16 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  crownOfClaws: { slot: 'head', name: 'Claw Crown', rarity: 'legendary', color: 0xffd700,
    desc: 'Rule them!', effect: { dmgMult: 1.20, xpMult: 1.10 },
    drawIcon(ctx, cx, cy, s) {
      // Gold band at bottom with 5 pointed spikes rising from it
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cx - 14 * s, cy + 4 * s, 28 * s, 6 * s);
      // 5 spike/claw shapes — center tallest
      const spikes = [
        { x: -12, h: -10 }, { x: -6, h: -14 }, { x: 0, h: -18 },
        { x: 6, h: -14 }, { x: 12, h: -10 }
      ];
      for (const sp of spikes) {
        ctx.beginPath();
        ctx.moveTo(cx + (sp.x - 3) * s, cy + 4 * s);
        ctx.lineTo(cx + sp.x * s, cy + sp.h * s);
        ctx.lineTo(cx + (sp.x + 3) * s, cy + 4 * s);
        ctx.closePath();
        ctx.fill();
      }
      // Darker gold accent line on band
      ctx.fillStyle = '#cc9900';
      ctx.fillRect(cx - 13 * s, cy + 7 * s, 26 * s, 2 * s);
    }
  },

  // BODY slot
  cardboardBox: { slot: 'body', name: 'Cardboard Box', rarity: 'common', color: 0xbb8844,
    desc: 'Tough box!', effect: { dmgReduction: 0.10 },
    drawIcon(ctx, cx, cy, s) {
      // Brown rectangle with lighter tape cross, darker edges
      ctx.fillStyle = '#b08040';
      ctx.fillRect(cx - 14 * s, cy - 12 * s, 28 * s, 24 * s);
      // Darker brown edges
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(cx - 14 * s, cy - 12 * s, 28 * s, 2 * s);
      ctx.fillRect(cx - 14 * s, cy + 10 * s, 28 * s, 2 * s);
      ctx.fillRect(cx - 14 * s, cy - 12 * s, 2 * s, 24 * s);
      ctx.fillRect(cx + 12 * s, cy - 12 * s, 2 * s, 24 * s);
      // Lighter tan tape cross in center
      ctx.fillStyle = '#d4a060';
      ctx.fillRect(cx - 2 * s, cy - 10 * s, 4 * s, 20 * s);
      ctx.fillRect(cx - 10 * s, cy - 2 * s, 20 * s, 4 * s);
    }
  },
  bumbleArmor: { slot: 'body', name: 'Bumble Armor', rarity: 'uncommon', color: 0xffcc00,
    desc: 'Bee strong!', effect: { dmgReduction: 0.20, maxHpBonus: 15 },
    drawIcon(ctx, cx, cy, s) {
      // Yellow chest shape with black stripe and wing nubs
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(cx - 12 * s, cy - 12 * s, 24 * s, 24 * s);
      // Black horizontal stripe across middle
      ctx.fillStyle = '#222222';
      ctx.fillRect(cx - 12 * s, cy - 3 * s, 24 * s, 6 * s);
      // Small wing nubs on sides
      ctx.fillStyle = '#ffffcc';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(cx - 14 * s, cy - 4 * s, 5 * s, 8 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 14 * s, cy - 4 * s, 5 * s, 8 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  knightPlate: { slot: 'body', name: 'Knight Plate', rarity: 'rare', color: 0xbbbbcc,
    desc: 'Tank up!', effect: { dmgReduction: 0.30, speedMult: 0.95 },
    drawIcon(ctx, cx, cy, s) {
      // Silver-gray chest plate with darker shoulder pads and center rivet
      ctx.fillStyle = '#bbbbcc';
      ctx.fillRect(cx - 10 * s, cy - 10 * s, 20 * s, 22 * s);
      // Shoulder pads
      ctx.fillStyle = '#8888aa';
      ctx.fillRect(cx - 16 * s, cy - 10 * s, 8 * s, 10 * s);
      ctx.fillRect(cx + 8 * s, cy - 10 * s, 8 * s, 10 * s);
      // Center cross/rivet
      ctx.fillStyle = '#666688';
      ctx.fillRect(cx - 1.5 * s, cy - 4 * s, 3 * s, 8 * s);
      ctx.fillRect(cx - 4 * s, cy - 1.5 * s, 8 * s, 3 * s);
      // Highlight edge
      ctx.fillStyle = '#ddddee';
      ctx.fillRect(cx - 10 * s, cy - 10 * s, 20 * s, 2 * s);
    }
  },
  dragonScale: { slot: 'body', name: 'Dragon Scale', rarity: 'legendary', color: 0x44aa44,
    desc: 'Scaly!', effect: { dmgReduction: 0.35, maxHpBonus: 30 },
    drawIcon(ctx, cx, cy, s) {
      // Green chest with darker overlapping scale pattern and yellow-green trim
      ctx.fillStyle = '#44aa44';
      ctx.fillRect(cx - 12 * s, cy - 12 * s, 24 * s, 24 * s);
      // Overlapping scale pattern (offset rectangles)
      ctx.fillStyle = '#338833';
      for (let row = -2; row < 3; row++) {
        const offset = (row % 2 === 0) ? 0 : 5;
        for (let col = -1; col < 3; col++) {
          ctx.fillRect(cx + (col * 10 - 12 + offset) * s, cy + (row * 5 - 6) * s, 7 * s, 4 * s);
        }
      }
      // Glowing yellow-green trim at top and bottom
      ctx.fillStyle = '#88ff44';
      ctx.fillRect(cx - 12 * s, cy - 12 * s, 24 * s, 2 * s);
      ctx.fillRect(cx - 12 * s, cy + 10 * s, 24 * s, 2 * s);
    }
  },

  // FEET slot
  clownShoes: { slot: 'feet', name: 'Clown Shoes', rarity: 'common', color: 0xff2222,
    desc: 'Go faster!', effect: { speedMult: 1.10 } },
  springBoots: { slot: 'feet', name: 'Spring Boots', rarity: 'uncommon', color: 0x44ff44,
    desc: 'Boing boing!', effect: { speedMult: 1.15, jumpMult: 1.3 },
    drawIcon(ctx, cx, cy, s) {
      // Green boot shafts with coiled spring zigzag underneath
      ctx.fillStyle = '#44bb44';
      // Left boot shaft
      ctx.fillRect(cx - 14 * s, cy - 10 * s, 8 * s, 12 * s);
      // Right boot shaft
      ctx.fillRect(cx + 6 * s, cy - 10 * s, 8 * s, 12 * s);
      // Spring coils under left boot (zigzag)
      ctx.strokeStyle = '#88ff88';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * s, cy + 2 * s);
      ctx.lineTo(cx - 7 * s, cy + 5 * s);
      ctx.lineTo(cx - 14 * s, cy + 8 * s);
      ctx.lineTo(cx - 7 * s, cy + 11 * s);
      ctx.stroke();
      // Spring coils under right boot
      ctx.beginPath();
      ctx.moveTo(cx + 6 * s, cy + 2 * s);
      ctx.lineTo(cx + 13 * s, cy + 5 * s);
      ctx.lineTo(cx + 6 * s, cy + 8 * s);
      ctx.lineTo(cx + 13 * s, cy + 11 * s);
      ctx.stroke();
    }
  },
  rocketBoots: { slot: 'feet', name: 'Rocket Boots', rarity: 'rare', color: 0xff6600,
    desc: 'Blast off!', effect: { speedMult: 1.25, jumpMult: 1.5 },
    drawIcon(ctx, cx, cy, s) {
      // Orange boots with flame shapes at the bottom
      ctx.fillStyle = '#ff6600';
      // Left boot
      ctx.fillRect(cx - 14 * s, cy - 10 * s, 9 * s, 14 * s);
      // Right boot
      ctx.fillRect(cx + 5 * s, cy - 10 * s, 9 * s, 14 * s);
      // Exhaust nozzles
      ctx.fillStyle = '#444444';
      ctx.fillRect(cx - 12 * s, cy + 4 * s, 5 * s, 3 * s);
      ctx.fillRect(cx + 7 * s, cy + 4 * s, 5 * s, 3 * s);
      // Flame shapes (red/yellow gradient rects)
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(cx - 12 * s, cy + 7 * s, 5 * s, 4 * s);
      ctx.fillRect(cx + 7 * s, cy + 7 * s, 5 * s, 4 * s);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(cx - 11 * s, cy + 8 * s, 3 * s, 5 * s);
      ctx.fillRect(cx + 8 * s, cy + 8 * s, 3 * s, 5 * s);
    }
  },
  shadowSteps: { slot: 'feet', name: 'Shadow Steps', rarity: 'rare', color: 0x8844ff,
    desc: 'Sneaky!', effect: { speedMult: 1.20, dmgMult: 1.10 },
    drawIcon(ctx, cx, cy, s) {
      // Dark purple-black semi-transparent boot shapes with glow dots
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#332244';
      // Left boot
      ctx.fillRect(cx - 14 * s, cy - 8 * s, 8 * s, 16 * s);
      ctx.fillRect(cx - 16 * s, cy + 4 * s, 14 * s, 6 * s);
      // Right boot
      ctx.fillRect(cx + 6 * s, cy - 8 * s, 8 * s, 16 * s);
      ctx.fillRect(cx + 4 * s, cy + 4 * s, 14 * s, 6 * s);
      ctx.globalAlpha = 1;
      // Purple glow dots around edges
      ctx.fillStyle = '#8844ff';
      const dots = [
        [-16, -6], [-15, 2], [-4, 8], [-8, -8],
        [16, -6], [15, 2], [6, 8], [10, -8]
      ];
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(cx + d[0] * s, cy + d[1] * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  gravityStompers: { slot: 'feet', name: 'Grav Stompers', rarity: 'legendary', color: 0xaa44ff,
    desc: 'STOMP!', effect: { speedMult: 1.15, jumpMult: 2.0, dmgMult: 1.15 },
    drawIcon(ctx, cx, cy, s) {
      // Purple chunky wide boots with bright glow at sole
      ctx.fillStyle = '#aa44ff';
      // Left boot (oversized/stompy)
      ctx.fillRect(cx - 16 * s, cy - 8 * s, 10 * s, 14 * s);
      ctx.fillRect(cx - 18 * s, cy + 2 * s, 16 * s, 8 * s);
      // Right boot
      ctx.fillRect(cx + 6 * s, cy - 8 * s, 10 * s, 14 * s);
      ctx.fillRect(cx + 4 * s, cy + 2 * s, 16 * s, 8 * s);
      // Bright glow rectangle at sole
      ctx.fillStyle = '#cc88ff';
      ctx.fillRect(cx - 17 * s, cy + 8 * s, 14 * s, 3 * s);
      ctx.fillRect(cx + 5 * s, cy + 8 * s, 14 * s, 3 * s);
      // Extra glow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#cc88ff';
      ctx.fillRect(cx - 18 * s, cy + 10 * s, 16 * s, 2 * s);
      ctx.fillRect(cx + 4 * s, cy + 10 * s, 16 * s, 2 * s);
      ctx.globalAlpha = 1;
    }
  },
};

/**
 * Shrine augment types — permanent micro-buffs obtained by destroying shrines.
 * Each shrine grants a random augment. Augments stack indefinitely.
 *
 * 8 augment types:
 * - maxHp: +5% max HP + 10 HP instant heal
 * - xpGain: +5% XP gain (multiplicative via augmentXpMult)
 * - damage: +5% damage (multiplicative via augmentDmgMult)
 * - moveSpeed: +5% movement speed (multiplicative on playerSpeed)
 * - atkSpeed: +5% attack speed (multiplicative on attackSpeed)
 * - pickupRadius: +10% pickup radius (multiplicative on collectRadius)
 * - armor: +3% flat damage reduction (additive on augmentArmor)
 * - regen: +0.25 HP/s regeneration (additive on augmentRegen)
 *
 * @constant {Array.<{id: string, name: string, color: string, apply: function(State3D): void}>}
 */
export const SHRINE_AUGMENTS = [
  { id: 'maxHp', name: 'Tougher!', color: '#44ff44', apply: s => { s.maxHp = Math.floor(s.maxHp * 1.05); s.hp = Math.min(s.hp + 10, s.maxHp); } },
  { id: 'xpGain', name: 'Learn faster!', color: '#44aaff', apply: s => { s.augmentXpMult = (s.augmentXpMult || 1) * 1.05; } },
  { id: 'damage', name: 'Stronger!', color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.05; } },
  { id: 'moveSpeed', name: 'Run faster!', color: '#ffaa44', apply: s => { s.playerSpeed *= 1.05; } },
  { id: 'atkSpeed', name: 'Attack faster!', color: '#ff44ff', apply: s => { s.attackSpeed *= 1.05; } },
  { id: 'pickupRadius', name: 'Grab more!', color: '#ffff44', apply: s => { s.collectRadius *= 1.1; } },
  { id: 'armor', name: 'Harder to hurt!', color: '#aaaacc', apply: s => { s.augmentArmor = (s.augmentArmor || 0) + 0.03; } },
  { id: 'regen', name: 'Heal over time!', color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.25; } },
];

/**
 * Charge shrine upgrade definitions, organized by rarity tier.
 * Each shrine rolls a tier on creation (weighted like ITEM_RARITIES).
 * On charge completion, 3 random upgrades from that tier are offered.
 */
export const CHARGE_SHRINE_UPGRADES = {
  common: [
    { id: 'hp5',       name: 'A bit tougher!',         color: '#44ff44', apply: s => { s.maxHp += 5; s.hp = Math.min(s.hp + 5, s.maxHp); } },
    { id: 'speed3',    name: 'A bit faster!',     color: '#ffaa44', apply: s => { s.playerSpeed *= 1.03; } },
    { id: 'atk3',      name: 'Quicker attacks!',   color: '#ff44ff', apply: s => { s.attackSpeed *= 1.03; } },
    { id: 'dmg3',      name: 'A bit stronger!',          color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.03; } },
    { id: 'regen03',   name: 'Tiny heal!',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.15; } },
    { id: 'pickup5',   name: 'Grab a bit more!',  color: '#ffff44', apply: s => { s.collectRadius *= 1.05; } },
  ],
  uncommon: [
    { id: 'hp12',      name: 'Tougher!',         color: '#44ff44', apply: s => { s.maxHp += 12; s.hp = Math.min(s.hp + 12, s.maxHp); } },
    { id: 'speed6',    name: 'Faster!',     color: '#ffaa44', apply: s => { s.playerSpeed *= 1.06; } },
    { id: 'atk6',      name: 'Quick attacks!',   color: '#ff44ff', apply: s => { s.attackSpeed *= 1.06; } },
    { id: 'dmg6',      name: 'Stronger!',          color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.06; } },
    { id: 'regen07',   name: 'Good healing!',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.35; } },
    { id: 'armor3',    name: 'Harder to hurt!',           color: '#aaaacc', apply: s => { s.augmentArmor = (s.augmentArmor || 0) + 0.03; } },
  ],
  rare: [
    { id: 'hp25',      name: 'Way tougher!',         color: '#44ff44', apply: s => { s.maxHp += 25; s.hp = Math.min(s.hp + 25, s.maxHp); } },
    { id: 'speed10',   name: 'Super fast!',    color: '#ffaa44', apply: s => { s.playerSpeed *= 1.10; } },
    { id: 'atk10',     name: 'Rapid attacks!',  color: '#ff44ff', apply: s => { s.attackSpeed *= 1.10; } },
    { id: 'dmg10',     name: 'Way stronger!',         color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.10; } },
    { id: 'regen12',   name: 'Great healing!',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.6; } },
    { id: 'xp10',      name: 'Learn way faster!',       color: '#44aaff', apply: s => { s.augmentXpMult = (s.augmentXpMult || 1) * 1.10; } },
  ],
  legendary: [
    { id: 'hp50',      name: 'Super tough!',         color: '#44ff44', apply: s => { s.maxHp += 50; s.hp = Math.min(s.hp + 50, s.maxHp); } },
    { id: 'speed15',   name: 'Lightning fast!',    color: '#ffaa44', apply: s => { s.playerSpeed *= 1.15; } },
    { id: 'dmg15',     name: 'Super strong!',         color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.15; } },
    { id: 'regen2',    name: 'Amazing healing!',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 1.0; } },
    { id: 'fullheal',  name: 'All better!',           color: '#ffffff', apply: s => { s.hp = s.maxHp; } },
    { id: 'allstats5', name: 'Everything better!',       color: '#ffcc00', apply: s => { s.playerSpeed *= 1.05; s.attackSpeed *= 1.05; s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.05; s.maxHp = Math.floor(s.maxHp * 1.05); } },
  ],
};

/** Rarity weights for charge shrine tier assignment */
export const CHARGE_SHRINE_WEIGHTS = { common: 50, uncommon: 28, rare: 16, legendary: 6 };

/** Number of charge shrines to pre-place at game start */
export const CHARGE_SHRINE_COUNT = 22;

/** Charge time in seconds to activate a shrine */
export const CHARGE_SHRINE_TIME = 4;

/** Radius in world units — player must stay within this to charge */
export const CHARGE_SHRINE_RADIUS = 3;

/** Number of challenge shrines per world (BD-77, BD-100: increased from 6). */
export const CHALLENGE_SHRINE_COUNT = 10;

/** Challenge shrine visual radius (BD-77). */
export const CHALLENGE_SHRINE_RADIUS = 2.5;

/** Boss HP multiplier (times the base wave HP) (BD-77). */
export const BOSS_HP_MULT = 25;

/** Boss damage multiplier (BD-77). */
export const BOSS_DMG_MULT = 3;

/** Boss speed multiplier (BD-77). */
export const BOSS_SPEED_MULT = 0.6;

/** Boss scale (visual size) (BD-77). */
export const BOSS_SCALE = 3.0;

/**
 * Difficulty totem effect multipliers — applied per totem destroyed.
 * Totems are a risk/reward mechanic: destroying one increases zombie difficulty
 * but also boosts XP and score gains. All multipliers are cumulative (multiplicative).
 *
 * @constant {Object}
 * @property {number} zombieHpMult    - 1.15 = +15% zombie HP per totem destroyed.
 * @property {number} zombieSpeedMult - 1.10 = +10% zombie movement speed per totem.
 * @property {number} spawnRateMult   - 1.15 = +15% spawn rate per totem.
 * @property {number} xpBonusMult     - 1.25 = +25% XP gain per totem.
 * @property {number} scoreBonusMult  - 1.25 = +25% score gain per totem.
 */
export const TOTEM_EFFECT = {
  zombieHpMult: 1.15,     // +15% zombie HP per totem
  zombieSpeedMult: 1.10,  // +10% zombie speed per totem
  spawnRateMult: 1.15,    // +15% spawn rate per totem
  xpBonusMult: 1.25,      // +25% XP per totem
  scoreBonusMult: 1.25,   // +25% score per totem
};

/**
 * Zombie tier stat definitions (tiers 1-10). Pure data describing the scaling
 * of zombie stats and visual appearance per tier. Higher tiers are created when
 * same-tier zombies collide and merge.
 *
 * @constant {Array.<{scale: number, hpMult: number, dmgMult: number, speed: number, body: number, head: number, eye: number, name: string}>}
 */
export const ZOMBIE_TIERS = [
  { scale: 1.0,  hpMult: 1,   dmgMult: 1,   speed: 1.8, body: 0x4a6a4a, head: 0x5a7a5a, eye: 0xff0000, name: 'Shambler' },
  { scale: 1.15, hpMult: 2.2, dmgMult: 1.5, speed: 1.8, body: 0x3a6a3a, head: 0x4a8a4a, eye: 0xff2200, name: 'Lurcher' },
  { scale: 1.3,  hpMult: 3.5, dmgMult: 2,   speed: 2.0, body: 0x3a5a2a, head: 0x4a6a3a, eye: 0xff4400, name: 'Bruiser' },
  { scale: 1.5,  hpMult: 5,   dmgMult: 2.8, speed: 2.2, body: 0x4a4a2a, head: 0x5a5a3a, eye: 0xff6600, name: 'Brute' },
  { scale: 1.7,  hpMult: 7,   dmgMult: 3.5, speed: 2.4, body: 0x5a3a2a, head: 0x6a4a3a, eye: 0xff8800, name: 'Ravager' },
  { scale: 1.9,  hpMult: 10,  dmgMult: 4.5, speed: 2.5, body: 0x6a2a1a, head: 0x7a3a2a, eye: 0xffaa00, name: 'Horror' },
  { scale: 2.15, hpMult: 14,  dmgMult: 5.5, speed: 2.6, body: 0x7a1a1a, head: 0x8a2a2a, eye: 0xffcc00, name: 'Abomination' },
  { scale: 2.4,  hpMult: 19,  dmgMult: 7,   speed: 2.7, body: 0x8a1010, head: 0x9a2020, eye: 0xffdd00, name: 'Nightmare' },
  { scale: 2.7,  hpMult: 25,  dmgMult: 9,   speed: 4.5, body: 0x990808, head: 0xaa1818, eye: 0xffee44, name: 'Titan' },
  { scale: 3.0,  hpMult: 35,  dmgMult: 12,  speed: 5.0, body: 0xaa0000, head: 0xbb1111, eye: 0xffff66, name: 'Overlord' },
];

/**
 * Animal-to-starting-weapon mapping. Each playable animal begins with a different weapon.
 *
 * @constant {Object.<string, string>}
 * @property {string} leopard  - Starts with clawSwipe (melee).
 * @property {string} redPanda - Starts with boomerang (piercing ranged).
 * @property {string} lion     - Starts with lightningBolt (chain).
 * @property {string} gator    - Starts with poisonCloud (AoE DoT).
 */
export const ANIMAL_WEAPONS = {
  leopard: 'clawSwipe',
  redPanda: 'boomerang',
  lion: 'lightningBolt',
  gator: 'poisonCloud',
};

// ============================================================================
// BD-26: Extracted gameplay constants (previously magic numbers in game3d.js)
// ============================================================================

// --- Player Base Stats ---
/** @constant {number} PLAYER_SPEED_BASE - Movement speed multiplier applied to animal speed. */
export const PLAYER_SPEED_BASE = 5;
/** @constant {number} PLAYER_ATTACK_SPEED_BASE - Auto-attacks per second at level 1. */
export const PLAYER_ATTACK_SPEED_BASE = 1.2;
/** @constant {number} PLAYER_ATTACK_DAMAGE_BASE - Base attack damage multiplied by animal damage stat. */
export const PLAYER_ATTACK_DAMAGE_BASE = 15;
/** @constant {number} PLAYER_ATTACK_RANGE_BASE - Base auto-attack reach in world units. */
export const PLAYER_ATTACK_RANGE_BASE = 3;
/** @constant {number} PLAYER_COLLECT_RADIUS_BASE - Base XP gem / item pickup radius in world units. */
export const PLAYER_COLLECT_RADIUS_BASE = 2;
/** @constant {number} PLAYER_HP_START_MULT - Starting HP bonus multiplier for kid-friendly early game (BD-194). */
export const PLAYER_HP_START_MULT = 1.25;
/** @constant {number} PLAYER_DMG_SCALE_PER_LEVEL - Damage increase per player level (+12%). */
export const PLAYER_DMG_SCALE_PER_LEVEL = 0.12;
/** @constant {number} PLAYER_CONTACT_DAMAGE_BASE - Base zombie contact damage before tier/difficulty scaling. */
export const PLAYER_CONTACT_DAMAGE_BASE = 15;

// --- Combat ---
/** @constant {number} POWER_ATTACK_MAX_CHARGE - Maximum power attack charge time in seconds. */
export const POWER_ATTACK_MAX_CHARGE = 2;
/** @constant {number} INVINCIBILITY_DURATION - Duration of damage invincibility frames in seconds (BD-192). */
export const INVINCIBILITY_DURATION = 0.5;
/** @constant {number} SHIELD_BRACELET_COOLDOWN - Seconds between Shield Bracelet absorb charges. */
export const SHIELD_BRACELET_COOLDOWN = 30;
/** @constant {number} INTERACTION_HIT_COOLDOWN - Cooldown between shrine/totem proximity hits in seconds. */
export const INTERACTION_HIT_COOLDOWN = 0.5;
/** @constant {number} POST_UPGRADE_INVINCIBILITY - Invincibility granted after menu dismissal in seconds (BD-112). */
export const POST_UPGRADE_INVINCIBILITY = 1.0;

// --- Spawning ---
/** @constant {number} AMBIENT_SPAWN_INTERVAL - Seconds between ambient zombie spawn waves. */
export const AMBIENT_SPAWN_INTERVAL = 1.36;
/** @constant {number} FIRST_WAVE_EVENT_TIMER - Seconds until the first wave event (~1.25 minutes). */
export const FIRST_WAVE_EVENT_TIMER = 75;
/** @constant {number} WAVE_EVENT_INTERVAL - Seconds between subsequent wave events (1.5 minutes). */
export const WAVE_EVENT_INTERVAL = 90;
/** @constant {number} WAVE_WARNING_DURATION - Countdown warning duration before a wave event in seconds. */
export const WAVE_WARNING_DURATION = 10;
/** @constant {number} AMBIENT_CRATE_INTERVAL - Seconds between ambient powerup crate spawns. */
export const AMBIENT_CRATE_INTERVAL = 30;
/** @constant {number} MIN_SPAWN_DISTANCE - Minimum distance from player for enemy spawns (BD-217). */
export const MIN_SPAWN_DISTANCE = 12;
/** @constant {number} INITIAL_BURST_COUNT - Number of zombies in the initial spawn ring. */
export const INITIAL_BURST_COUNT = 10;
/** @constant {number} INITIAL_BURST_HP - Base HP of initial burst zombies. */
export const INITIAL_BURST_HP = 8;

// --- Entity Limits & Distances ---
/** @constant {number} ENTITY_DESPAWN_DISTANCE - Distance in world units beyond which entities are cleaned up. */
export const ENTITY_DESPAWN_DISTANCE = 60;
/** @constant {number} XP_GEM_HARD_CAP - Maximum number of simultaneous XP gems before overflow merging (BD-144). */
export const XP_GEM_HARD_CAP = 80;
/** @constant {number} XP_SCALE_PER_LEVEL - XP requirement multiplier per level-up. */
export const XP_SCALE_PER_LEVEL = 1.5;

// --- World Generation ---
/** @constant {number} TOTEM_COUNT - Number of difficulty totems pre-placed in the world (BD-100). */
export const TOTEM_COUNT = 24;
/** @constant {number} LOOT_CRATE_COUNT - Number of item pickups pre-placed at game start. */
export const LOOT_CRATE_COUNT = 30;
/** @constant {number} MIN_SHRINE_SPACING - Minimum distance between any two shrines/totems. */
export const MIN_SHRINE_SPACING = 20;
/** @constant {number} MAX_PLACEMENT_ATTEMPTS - Rejection sampling attempts for shrine/totem placement. */
export const MAX_PLACEMENT_ATTEMPTS = 100;
/** @constant {number} AUGMENT_REGEN_CAP - Maximum HP/s from augment regen stacking (BD-187). */
export const AUGMENT_REGEN_CAP = 4.0;

// --- Weapon Level Scaling ---
/** @constant {number} WEAPON_COOLDOWN_REDUCTION_L4 - Cooldown multiplier at weapon level 4 (-18%). */
export const WEAPON_COOLDOWN_REDUCTION_L4 = 0.82;
/** @constant {number} LIGHTNING_CHAIN_RANGE_SQ - Squared range for lightning bolt chain jumps (5 units). */
export const LIGHTNING_CHAIN_RANGE_SQ = 25;
