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
/** @constant {number} MAP_HALF - Half the map dimension; world extends from -MAP_HALF to +MAP_HALF on X and Z. */
export const MAP_HALF = 128; // 256x256 total map (extends -128 to +128 on both axes)

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
 * @constant {Object.<string, {id: string, name: string, type: string, color: string, desc: string, baseDamage: number, baseCooldown: number, baseRange: number, maxLevel: number, levelDescs: string[]}>}
 * @property {Object} clawSwipe     - Melee AoE arc slash hitting all enemies in range.
 * @property {Object} boneToss      - Ranged projectile(s) that fly toward targets; gains extra projectiles at levels 2/5.
 * @property {Object} poisonCloud   - AoE damage-over-time cloud placed at enemy position.
 * @property {Object} lightningBolt - Chain lightning that jumps between enemies; gains chains at levels 1/3/5.
 * @property {Object} fireball      - Projectile that explodes on impact dealing AoE damage.
 * @property {Object} boomerang     - Piercing cross-shaped disc that arcs out and returns to player.
 */
export const WEAPON_TYPES = {
  clawSwipe: {
    id: 'clawSwipe', name: 'CLAW SWIPE', type: 'melee', color: '#ff8844',
    desc: 'AoE arc slash', baseDamage: 12, baseCooldown: 1.2, baseRange: 2.5, maxLevel: 5,
    levelDescs: ['+20% Damage', '+15% Range', '+20% Damage', '-15% Cooldown', '+30% Damage & Range'],
  },
  boneToss: {
    id: 'boneToss', name: 'BONE TOSS', type: 'projectile', color: '#ccccaa',
    desc: 'Ranged bone projectile', baseDamage: 10, baseCooldown: 1.5, baseRange: 12, maxLevel: 5,
    levelDescs: ['+25% Damage', '+1 Projectile', '+20% Speed', '-20% Cooldown', '+2 Projectiles'],
  },
  poisonCloud: {
    id: 'poisonCloud', name: 'POISON CLOUD', type: 'aoe', color: '#44cc44',
    desc: 'DoT cloud at enemy', baseDamage: 5, baseCooldown: 3, baseRange: 8, maxLevel: 5,
    levelDescs: ['+30% Damage', '+25% Area', '+30% Duration', '-20% Cooldown', '+50% Damage'],
  },
  lightningBolt: {
    id: 'lightningBolt', name: 'LIGHTNING BOLT', type: 'chain', color: '#aaddff',
    desc: 'Chains between enemies', baseDamage: 15, baseCooldown: 2, baseRange: 8, maxLevel: 5,
    levelDescs: ['+1 Chain', '+20% Damage', '+1 Chain', '-15% Cooldown', '+2 Chains & +30% Dmg'],
  },
  fireball: {
    id: 'fireball', name: 'FIREBALL', type: 'projectile_aoe', color: '#ff4400',
    desc: 'Explodes on impact', baseDamage: 20, baseCooldown: 2.5, baseRange: 10, maxLevel: 5,
    levelDescs: ['+25% Damage', '+30% Explosion', '+25% Damage', '-20% Cooldown', '+50% AoE Damage'],
  },
  boomerang: {
    id: 'boomerang', name: 'BOOMERANG', type: 'boomerang', color: '#aa44ff',
    desc: 'Piercing, returns', baseDamage: 8, baseCooldown: 1.8, baseRange: 10, maxLevel: 5,
    levelDescs: ['+20% Damage', '+1 Boomerang', '+25% Speed', '-15% Cooldown', 'Double Damage'],
  },
};

/**
 * Scroll type definitions — passive global buffs selected during level-up.
 * Scrolls stack multiplicatively and affect all weapons simultaneously.
 *
 * @constant {Object.<string, {id: string, name: string, color: string, desc: string, maxLevel: number}>}
 * @property {Object} power    - +15% all weapon damage per level (max 5).
 * @property {Object} haste    - -15% all weapon cooldowns per level (max 5, floor 0.3x).
 * @property {Object} arcane   - +1 projectile count for multi-shot weapons (max 3).
 * @property {Object} vitality - +20 max HP and instant heal per level (max 5).
 * @property {Object} fortune  - +30% XP gain per level (max 3).
 * @property {Object} range    - +20% weapon range per level (max 5).
 */
export const SCROLL_TYPES = {
  power: { id: 'power', name: 'POWER SCROLL', color: '#ff4444', desc: '+15% all weapon damage', maxLevel: 5 },
  haste: { id: 'haste', name: 'HASTE SCROLL', color: '#ffaa44', desc: '-15% all cooldowns', maxLevel: 5 },
  arcane: { id: 'arcane', name: 'ARCANE SCROLL', color: '#aa44ff', desc: '+1 projectile count', maxLevel: 3 },
  vitality: { id: 'vitality', name: 'VITALITY SCROLL', color: '#44ff44', desc: '+20 max HP & heal', maxLevel: 5 },
  fortune: { id: 'fortune', name: 'FORTUNE SCROLL', color: '#ffff44', desc: '+30% XP gain', maxLevel: 3 },
  range: { id: 'range', name: 'RANGE SCROLL', color: '#44aaff', desc: '+20% weapon range', maxLevel: 5 },
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
 * - rainbowScarf (scarf slot): All scroll effects +50% stronger
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
  { id: 'alarmClock', name: 'ALARM CLOCK', color: '#4488ff', colorHex: 0x88ccff, desc: '-8% Weapon Cooldowns', slot: 'clock', rarity: 'rare', stackable: true },
  { id: 'whoopeeCushion', name: 'WHOOPEE CUSHION', color: '#4488ff', colorHex: 0xff88cc, desc: '20% Explode on Death', slot: 'cushion', rarity: 'rare' },
  { id: 'turboSneakers', name: 'TURBO SNEAKERS', color: '#4488ff', colorHex: 0x00ffaa, desc: '+25% Speed, +10% Dodge', slot: 'turboshoes', rarity: 'rare' },
  // === LEGENDARY (REALLY Cool Stuff) ===
  { id: 'goldenBone', name: 'GOLDEN BONE', color: '#ff8800', colorHex: 0xffcc00, desc: '+30% All Weapon Damage', slot: 'goldenbone', rarity: 'legendary' },
  { id: 'crownOfClaws', name: 'CROWN OF CLAWS', color: '#ff8800', colorHex: 0xffaa00, desc: '+1 Auto-Attack Target', slot: 'crown', rarity: 'legendary' },
  { id: 'zombieMagnet', name: 'ZOMBIE MAGNET', color: '#ff8800', colorHex: 0x88ff88, desc: '2x XP Gem Drops', slot: 'zombiemagnet', rarity: 'legendary' },
  { id: 'rainbowScarf', name: 'RAINBOW SCARF', color: '#ff8800', colorHex: 0xff44ff, desc: 'Scroll Effects +50%', slot: 'scarf', rarity: 'legendary' },
];

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
 * - regen: +0.5 HP/s regeneration (additive on augmentRegen)
 *
 * @constant {Array.<{id: string, name: string, color: string, apply: function(State3D): void}>}
 */
export const SHRINE_AUGMENTS = [
  { id: 'maxHp', name: '+5% Max HP', color: '#44ff44', apply: s => { s.maxHp = Math.floor(s.maxHp * 1.05); s.hp = Math.min(s.hp + 10, s.maxHp); } },
  { id: 'xpGain', name: '+5% XP Gain', color: '#44aaff', apply: s => { s.augmentXpMult = (s.augmentXpMult || 1) * 1.05; } },
  { id: 'damage', name: '+5% Damage', color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.05; } },
  { id: 'moveSpeed', name: '+5% Move Speed', color: '#ffaa44', apply: s => { s.playerSpeed *= 1.05; } },
  { id: 'atkSpeed', name: '+5% Attack Speed', color: '#ff44ff', apply: s => { s.attackSpeed *= 1.05; } },
  { id: 'pickupRadius', name: '+10% Pickup Radius', color: '#ffff44', apply: s => { s.collectRadius *= 1.1; } },
  { id: 'armor', name: '+3% Armor', color: '#aaaacc', apply: s => { s.augmentArmor = (s.augmentArmor || 0) + 0.03; } },
  { id: 'regen', name: '+0.5 HP/s Regen', color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.5; } },
];

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
  { scale: 1.0,  hpMult: 1,   dmgMult: 1,   speed: 1.8,  body: 0x4a6a4a, head: 0x5a7a5a, eye: 0xff0000, name: 'Shambler' },
  { scale: 1.15, hpMult: 2.2, dmgMult: 1.5, speed: 1.7, body: 0x3a6a3a, head: 0x4a8a4a, eye: 0xff2200, name: 'Lurcher' },
  { scale: 1.3,  hpMult: 3.5, dmgMult: 2,   speed: 1.6, body: 0x3a5a2a, head: 0x4a6a3a, eye: 0xff4400, name: 'Bruiser' },
  { scale: 1.5,  hpMult: 5,   dmgMult: 2.8, speed: 1.5, body: 0x4a4a2a, head: 0x5a5a3a, eye: 0xff6600, name: 'Brute' },
  { scale: 1.7,  hpMult: 7,   dmgMult: 3.5, speed: 1.4, body: 0x5a3a2a, head: 0x6a4a3a, eye: 0xff8800, name: 'Ravager' },
  { scale: 1.9,  hpMult: 10,  dmgMult: 4.5, speed: 1.35, body: 0x6a2a1a, head: 0x7a3a2a, eye: 0xffaa00, name: 'Horror' },
  { scale: 2.15, hpMult: 14,  dmgMult: 5.5, speed: 1.3, body: 0x7a1a1a, head: 0x8a2a2a, eye: 0xffcc00, name: 'Abomination' },
  { scale: 2.4,  hpMult: 19,  dmgMult: 7,   speed: 1.25, body: 0x8a1010, head: 0x9a2020, eye: 0xffdd00, name: 'Nightmare' },
  { scale: 2.7,  hpMult: 25,  dmgMult: 9,   speed: 1.2, body: 0x990808, head: 0xaa1818, eye: 0xffee44, name: 'Titan' },
  { scale: 3.0,  hpMult: 35,  dmgMult: 12,  speed: 1.15, body: 0xaa0000, head: 0xbb1111, eye: 0xffff66, name: 'Overlord' },
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
