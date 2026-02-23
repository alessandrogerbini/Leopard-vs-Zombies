# Track A: Content Expansion

**Focus:** New weapons, howls, items, rarity system, run randomization, level-up UI update
**Key Files:** `js/3d/weapons.js` (new), `js/3d/howls.js` (new), `js/3d/items.js` (new), `js/3d/level-up.js` (new), `js/3d/constants.js` (modify)
**Effort:** 22-32 hours
**Blocked By:** Track E task E-1 (combat.js extraction) for weapon fire logic

---

## Task A-1: Rename Scrolls to Howls (Code + UI)

**What to build:** Rename all references to "scrolls" and "tomes" to "howls" throughout the codebase and UI. The passive buff system stays identical; only the name changes.

**Files to modify:**
- `js/3d/constants.js` -- rename `SCROLL_TYPES` to `HOWL_TYPES`, change each `.name` from "POWER SCROLL" to "POWER HOWL", etc.
- `js/3d/hud.js` -- update `SCROLL_TYPES` import to `HOWL_TYPES`, update any display text that says "SCROLL"
- `js/game3d.js` -- update all references to `SCROLL_TYPES` import, update `st.scrolls` property name to `st.howls` (or keep internal name and just change display)

**Decision:** Keep the internal state property as `st.scrolls` for this task to minimize refactor scope. Only change the display names and constant names. A full internal rename can happen post-alpha if desired.

**Actually, correction:** The v3 plan says the word "scroll" or "tome" should appear nowhere in the UI. So we rename `SCROLL_TYPES` to `HOWL_TYPES` in constants.js, update all import sites, and change the `.name` fields. The `st.scrolls` object can be renamed to `st.howls` at the same time since it is only used within game3d.js.

**Test criteria (write first):**
```javascript
// tests/test-howls.js
import { HOWL_TYPES } from '../js/3d/constants.js'; // or howls.js
assert(HOWL_TYPES.power.name === 'POWER HOWL', 'Power howl name');
assert(HOWL_TYPES.haste.name === 'HASTE HOWL', 'Haste howl name');
// ... all 6 existing
assert(!HOWL_TYPES.power.name.includes('SCROLL'), 'No scroll in power name');
assert(!HOWL_TYPES.power.name.includes('TOME'), 'No tome in power name');
```

**Manual playtest verification:**
- Level up and see "POWER HOWL" not "POWER SCROLL" on upgrade cards
- HUD right side shows "POWER HOWL x2" not "POWER SCROLL x2"
- Grep the entire codebase for "SCROLL" and "TOME" -- zero hits in player-facing strings

**Done when:** `SCROLL_TYPES` is renamed to `HOWL_TYPES`. All UI text says "howl." Zero instances of "scroll" or "tome" in player-facing text.

---

## Task A-2: Define 4 New Howl Types

**What to build:** Add Thorns Howl, Magnet Howl, Frenzy Howl, and Guardian Howl to the howl type definitions.

**Files to create/modify:**
- `js/3d/howls.js` (new) -- contains HOWL_TYPES (moved from constants.js) plus the 4 new entries
  - OR: keep in constants.js and just add entries. Decision: **create howls.js** to keep constants.js from growing too large and to give this module its own test file.

**New howl definitions:**
```javascript
thorns: {
  id: 'thorns', name: 'THORNS HOWL', color: '#cc4422',
  desc: 'Reflect 10% contact damage per stack', maxLevel: 3
},
magnet: {
  id: 'magnet', name: 'MAGNET HOWL', color: '#aaaaaa',
  desc: '+25% pickup radius per stack', maxLevel: 4
},
frenzy: {
  id: 'frenzy', name: 'FRENZY HOWL', color: '#ff44ff',
  desc: '+10% attack speed per stack', maxLevel: 4
},
guardian: {
  id: 'guardian', name: 'GUARDIAN HOWL', color: '#44ff88',
  desc: '+8% max HP, +2 HP/s regen per stack', maxLevel: 3
}
```

**Test criteria:**
```javascript
import { HOWL_TYPES } from '../js/3d/howls.js';
assertEqual(Object.keys(HOWL_TYPES).length, 10, '10 howl types total');
assert(HOWL_TYPES.thorns, 'Thorns howl exists');
assert(HOWL_TYPES.magnet, 'Magnet howl exists');
assert(HOWL_TYPES.frenzy, 'Frenzy howl exists');
assert(HOWL_TYPES.guardian, 'Guardian howl exists');
// All 10 have required fields
for (const [k, h] of Object.entries(HOWL_TYPES)) {
  assert(h.id && h.name && h.color && h.desc && h.maxLevel, `${k} has all fields`);
}
```

**Done when:** 10 howls in HOWL_TYPES, all with id/name/color/desc/maxLevel.

---

## Task A-3: Implement Howl Multiplier Functions

**What to build:** Pure functions that compute the effect of stacked howls on weapon stats and player stats. These replace the inline scroll multiplier calculations currently in game3d.js.

**File:** `js/3d/howls.js`

**Functions to implement:**
```javascript
// Damage multiplier from Power Howl stacks
export function getDmgMult(howls) {
  return Math.pow(1.15, howls.power || 0);
}

// Cooldown multiplier from Haste + Frenzy Howl stacks
export function getCooldownMult(howls) {
  const hasteMult = Math.pow(0.85, howls.haste || 0);
  const frenzyMult = Math.pow(0.90, howls.frenzy || 0);
  return Math.max(0.3, hasteMult * frenzyMult); // floor at 0.3x
}

// Range multiplier from Range Howl stacks
export function getRangeMult(howls) {
  return 1 + (howls.range || 0) * 0.2;
}

// Projectile count bonus from Arcane Howl stacks
export function getProjectileBonus(howls) {
  return howls.arcane || 0;
}

// Thorns reflect percentage (10% per stack)
export function getThornsReflect(howls) {
  return (howls.thorns || 0) * 0.10;
}

// Magnet radius multiplier (25% per stack)
export function getMagnetMult(howls) {
  return 1 + (howls.magnet || 0) * 0.25;
}

// Guardian: returns { hpBonus, regenBonus }
export function getGuardianBonuses(howls) {
  const stacks = howls.guardian || 0;
  return {
    hpBonusPct: stacks * 0.08,  // +8% max HP per stack
    regenBonus: stacks * 2       // +2 HP/s per stack
  };
}
```

**Test criteria:**
```javascript
assertEqual(getDmgMult({}), 1, 'No power howls = 1x damage');
assertClose(getDmgMult({ power: 3 }), 1.15**3, 0.001, '3 power stacks');
assertClose(getCooldownMult({ haste: 5, frenzy: 4 }), Math.max(0.3, 0.85**5 * 0.9**4), 0.001, 'Combined haste+frenzy');
assertEqual(getCooldownMult({ haste: 20 }), 0.3, 'Cooldown floor at 0.3');
assertEqual(getThornsReflect({ thorns: 3 }), 0.30, '3 thorns stacks = 30%');
assertEqual(getMagnetMult({ magnet: 4 }), 2.0, '4 magnet stacks = 2x radius');
```

**Done when:** All multiplier functions pass their tests and are imported by game3d.js to replace inline scroll calculations.

---

## Task A-4: Define 4 New Weapon Types (Constants)

**What to build:** Add Mud Bomb, Beehive Launcher, Snowball Turret, and Stink Line to weapon type definitions.

**File:** `js/3d/constants.js` (add to WEAPON_TYPES) or `js/3d/weapons.js` (if weapons get their own module)

**New weapon definitions:**
```javascript
mudBomb: {
  id: 'mudBomb', name: 'MUD BOMB', type: 'projectile_aoe', color: '#8B6914',
  desc: 'Arcing glob, explodes + slow zone', baseDamage: 14, baseCooldown: 2.2, baseRange: 9, maxLevel: 5,
  levelDescs: ['+25% Damage', '+30% Slow Duration', '+25% Damage', '-20% Cooldown', '+50% AoE + Slow Area'],
},
beehiveLauncher: {
  id: 'beehiveLauncher', name: 'BEEHIVE LAUNCHER', type: 'summon', color: '#ffcc00',
  desc: 'Fires beehive, releases 3 bees', baseDamage: 6, baseCooldown: 3.0, baseRange: 10, maxLevel: 5,
  levelDescs: ['+1 Bee', '+20% Bee Damage', '+1 Bee', '-20% Cooldown', 'Bees Explode On Death'],
},
snowballTurret: {
  id: 'snowballTurret', name: 'SNOWBALL TURRET', type: 'orbit', color: '#88ccff',
  desc: 'Orbiting turret, slow-applying snowballs', baseDamage: 8, baseCooldown: 1.0, baseRange: 8, maxLevel: 5,
  levelDescs: ['+25% Damage', '+1 Turret', '+30% Slow Effect', '-20% Fire Rate', '+2 Turrets & Pierce'],
},
stinkLine: {
  id: 'stinkLine', name: 'STINK LINE', type: 'trail', color: '#88aa44',
  desc: 'Damage trail behind player', baseDamage: 4, baseCooldown: 0.3, baseRange: 0, maxLevel: 5,
  levelDescs: ['+30% Damage', '+50% Trail Width', '+30% Damage', '+25% Trail Duration', 'Double Damage & Width'],
},
```

**Test criteria:**
```javascript
import { WEAPON_TYPES } from '../js/3d/constants.js';
assertEqual(Object.keys(WEAPON_TYPES).length, 10, '10 weapon types total');
// All 10 have required fields
for (const [k, w] of Object.entries(WEAPON_TYPES)) {
  assert(w.id && w.name && w.type && w.color && w.desc, `${k} has identity fields`);
  assert(typeof w.baseDamage === 'number', `${k} has baseDamage`);
  assert(typeof w.baseCooldown === 'number', `${k} has baseCooldown`);
  assert(typeof w.baseRange === 'number', `${k} has baseRange`);
  assertEqual(w.maxLevel, 5, `${k} has maxLevel 5`);
  assertEqual(w.levelDescs.length, 5, `${k} has 5 level descriptions`);
}
```

**Done when:** WEAPON_TYPES contains 10 entries, all with complete field sets.

---

## Task A-5: Implement Mud Bomb Fire Logic

**What to build:** Mud Bomb is a projectile with an arcing Y-axis trajectory that explodes on impact and leaves a slow zone for 3 seconds.

**File:** `js/3d/weapons.js`

**Behavior:**
1. On fire: create a sphere mesh, launch toward nearest enemy with a parabolic arc (Y = baseY + arcHeight * sin(t/totalTime * PI))
2. Arc height: 3 world units at peak
3. On impact (distance < 1.2 from target OR hit ground after arc apex): create explosion VFX + slow zone
4. Slow zone: cylindrical area (radius 2.0), enemies inside move at 50% speed for 3 seconds
5. Visual: brown sphere projectile during flight, brown semi-transparent cylinder for slow zone

**Sound mapping:** `sfx_explosion` on impact

**Input interface:**
```javascript
// Called by weapon system when mud bomb cooldown expires
function fireMudBomb(w, playerPos, facing, enemies, scene, terrain, audio) {
  const target = findNearestEnemy(enemies, playerPos.x, playerPos.z, getWeaponRange(w));
  if (!target) return;
  // Create arcing projectile...
}
```

**Test criteria:**
```javascript
// Unit test: arc trajectory math
const arcY = computeMudBombArc(0.5); // t=0.5 = midpoint
assertClose(arcY, 3.0, 0.1, 'Mud bomb peaks at 3 units');
const arcY0 = computeMudBombArc(0);
assertEqual(arcY0, 0, 'Mud bomb starts at ground');
const arcY1 = computeMudBombArc(1);
assertEqual(arcY1, 0, 'Mud bomb ends at ground');
```

**Playtest verification:**
- Fire mud bomb at a group of zombies
- See the brown sphere arc upward and land
- See explosion VFX on impact
- See zombies in the landing zone slow down for ~3 seconds
- Hear explosion sound on impact

**Done when:** Mud Bomb fires with visible arc, explodes on impact with VFX, creates slow zone, and plays explosion sound.

---

## Task A-6: Implement Beehive Launcher Fire Logic

**What to build:** Fires a beehive projectile that breaks on contact with an enemy and releases 3 bees. Bees are small, fast-moving entities that chase the nearest enemy for 4 seconds, dealing damage on contact.

**File:** `js/3d/weapons.js`

**Behavior:**
1. On fire: launch beehive mesh toward nearest enemy (linear XZ trajectory like bone toss)
2. On impact (distance < 1.2 from enemy): beehive breaks, spawn 3 bee entities
3. Each bee: small yellow mesh (0.15 cube), speed 8 units/s, chases nearest enemy (re-targets every 0.5s)
4. Bee damage: weapon damage / 3 per bee per hit, 0.5s hit cooldown per bee
5. Bee lifetime: 4 seconds, then fade and dispose
6. Level upgrades: +1 bee at levels 2 and 4

**Sound mapping:** `sfx_weapon_projectile` on fire, `sfx_melee_hit` on bee contact

**Risk note:** This is the most complex new weapon. If implementation exceeds 4 hours, simplify to: beehive breaks on impact, deals AoE damage to all enemies in radius 3 (no persistent bees). This is still useful and distinguishable from fireball by the projectile visual.

**Test criteria:**
```javascript
// Bee count scales with level
assertEqual(getBeeCount(1), 3, 'Level 1: 3 bees');
assertEqual(getBeeCount(2), 4, 'Level 2: 4 bees');
assertEqual(getBeeCount(4), 5, 'Level 4: 5 bees');
// Bee damage is fraction of weapon damage
assertClose(getBeeDamage(w, 3), w.baseDamage / 3, 0.01, 'Each bee does 1/3 total damage');
```

**Playtest verification:**
- Fire beehive, see golden projectile fly toward enemy
- See beehive break on contact, 3 small yellow dots emerge
- Bees chase nearby enemies for ~4 seconds
- Bees deal damage on contact (floating damage numbers)
- Bees fade out after 4 seconds

**Done when:** Beehive fires, breaks on contact, releases bees that chase and damage enemies for 4 seconds.

---

## Task A-7: Implement Snowball Turret Fire Logic

**What to build:** An orbiting turret that circles the player and fires slow-applying snowballs at the nearest enemy.

**File:** `js/3d/weapons.js`

**Behavior:**
1. On "fire" (cooldown expires): a turret mesh spawns and orbits the player at radius 2.0, orbit speed 1.5 rad/s
2. The turret fires a snowball projectile at the nearest enemy every 1.0 seconds (base fire rate)
3. Snowball: white sphere, speed 10 units/s, on hit: deal damage and apply 30% slow for 2 seconds to target
4. Turret lifetime: permanent (persists until replaced by level-up or game ends)
5. Max turrets: 1 at base, +1 at level 2, +2 at level 5 (up to 4 total)
6. Visual: light blue cube orbiting player, white snowball projectiles

**Sound mapping:** `sfx_weapon_projectile` on snowball fire

**Test criteria:**
```javascript
assertEqual(getTurretCount(1), 1, 'Level 1: 1 turret');
assertEqual(getTurretCount(2), 2, 'Level 2: 2 turrets');
assertEqual(getTurretCount(5), 4, 'Level 5: 4 turrets');
```

**Playtest verification:**
- Equip Snowball Turret, see light blue cube orbiting the player
- Turret periodically fires white snowballs at nearest enemy
- Hit enemies slow down visibly for ~2 seconds
- Multiple turrets orbit at evenly spaced angles

**Done when:** Turret orbits player, fires snowballs that damage and slow enemies.

---

## Task A-8: Implement Stink Line Fire Logic

**What to build:** A trail weapon that leaves a line of damage behind the player as they move. Faster movement = longer active trail = more coverage.

**File:** `js/3d/weapons.js`

**Behavior:**
1. Every 0.3 seconds (base rate), if the player has moved since last placement: drop a trail segment at the player's previous position
2. Each trail segment: green-brown semi-transparent box at ground level, width 0.8, length 0.8
3. Trail segment lifetime: 2 seconds (base), deals weapon damage per second to enemies standing in it
4. Trail segment damage: checked every 0.5 seconds, hits all enemies in contact
5. Visual: green-brown haze at ground level, fades out over lifetime
6. Level upgrades: +30% damage, +50% width, +25% duration

**Sound mapping:** `sfx_weapon_poison` on trail segment placement (low volume, since it is frequent)

**Test criteria:**
```javascript
// Trail segment base lifetime
assertEqual(getTrailDuration(1), 2.0, 'Base trail duration 2s');
assertEqual(getTrailDuration(5), 2.5, 'Level 5 trail duration +25%');
// Trail width
assertEqual(getTrailWidth(1), 0.8, 'Base trail width');
assertClose(getTrailWidth(3), 0.8 * 1.5, 0.01, 'Level 3 trail width +50%');
```

**Playtest verification:**
- Move around, see green-brown trail segments behind player
- Zombies walking through the trail take damage (floating numbers)
- Trail segments fade out after ~2 seconds
- Standing still produces no new trail segments

**Done when:** Stink Line leaves damage trail behind moving player, enemies take damage in the trail.

---

## Task A-9: Define 25 Items with Rarity Tiers

**What to build:** Expand ITEMS_3D from 11 to 25 items, add a `rarity` field to each, and define the rarity tier constants.

**File:** `js/3d/items.js` (new)

**Rarity tiers:**
```javascript
export const RARITY_TIERS = {
  stuff:          { name: 'Stuff',             color: '#ffffff', borderColor: '#888888', weight: 50 },
  goodStuff:      { name: 'Good Stuff',        color: '#44ff44', borderColor: '#22cc22', weight: 28 },
  shinyStuff:     { name: 'Shiny Stuff',       color: '#4488ff', borderColor: '#2266dd', weight: 16 },
  reallyCoolStuff:{ name: 'REALLY Cool Stuff', color: '#ffaa00', borderColor: '#ff8800', weight: 6  },
};
```

**Full 25-item roster:** (see v3 plan Section 4c for the complete table)

New items include stackable items (Rubber Ducky, Thick Fur, Silly Straw, Bandana, Hot Sauce Bottle, Bouncy Ball, Lucky Penny, Alarm Clock) that do NOT use the one-per-slot system. Add a `stackable: true` field for these.

**Test criteria:**
```javascript
import { ITEMS_ALPHA, RARITY_TIERS } from '../js/3d/items.js';
assertEqual(ITEMS_ALPHA.length, 25, '25 items total');
// All items have required fields
for (const item of ITEMS_ALPHA) {
  assert(item.id && item.name && item.rarity, `${item.id} has required fields`);
  assert(RARITY_TIERS[item.rarity], `${item.id} has valid rarity: ${item.rarity}`);
}
// Rarity distribution
const counts = { stuff: 0, goodStuff: 0, shinyStuff: 0, reallyCoolStuff: 0 };
for (const item of ITEMS_ALPHA) counts[item.rarity]++;
assertEqual(counts.stuff, 8, '8 common items');
assertEqual(counts.goodStuff, 7, '7 uncommon items');
assertEqual(counts.shinyStuff, 6, '6 rare items');
assertEqual(counts.reallyCoolStuff, 4, '4 legendary items');
```

**Done when:** 25 items defined with rarity fields, distribution matches v3 plan (8/7/6/4).

---

## Task A-10: Implement Rarity Drop System

**What to build:** A function that rolls a random item from the pool using rarity-weighted probability.

**File:** `js/3d/items.js`

**Logic:**
```javascript
export function rollItemDrop() {
  // 1. Roll a rarity tier using weights (50/28/16/6 = sum 100)
  const roll = Math.random() * 100;
  let rarity;
  if (roll < 50) rarity = 'stuff';
  else if (roll < 78) rarity = 'goodStuff';
  else if (roll < 94) rarity = 'shinyStuff';
  else rarity = 'reallyCoolStuff';

  // 2. Pick a random item from that rarity tier
  const pool = ITEMS_ALPHA.filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRarityColor(rarity) {
  return RARITY_TIERS[rarity]?.color || '#ffffff';
}

export function getRarityBorderColor(rarity) {
  return RARITY_TIERS[rarity]?.borderColor || '#888888';
}
```

**Test criteria:**
```javascript
// Statistical test: 10,000 rolls, verify distribution roughly matches weights
const counts = { stuff: 0, goodStuff: 0, shinyStuff: 0, reallyCoolStuff: 0 };
for (let i = 0; i < 10000; i++) {
  const item = rollItemDrop();
  counts[item.rarity]++;
}
// Allow 5% deviation
assertClose(counts.stuff / 10000, 0.50, 0.05, 'Common drops ~50%');
assertClose(counts.goodStuff / 10000, 0.28, 0.05, 'Uncommon drops ~28%');
assertClose(counts.shinyStuff / 10000, 0.16, 0.05, 'Rare drops ~16%');
assertClose(counts.reallyCoolStuff / 10000, 0.06, 0.05, 'Legendary drops ~6%');
// Color functions return valid CSS colors
assert(getRarityColor('stuff').startsWith('#'), 'Stuff color is hex');
assert(getRarityColor('reallyCoolStuff').startsWith('#'), 'Legendary color is hex');
```

**Done when:** `rollItemDrop()` returns items with correct rarity distribution.

---

## Task A-11: Implement 14 New Item Effects

**What to build:** Wire up the effects for 14 new items. Some are stat boosts (straightforward), some have proc effects (Hot Sauce ignite, Bouncy Ball ricochet, Whoopee Cushion explosion, Crown of Claws multi-target).

**File:** `js/3d/items.js` (definitions) + `js/game3d.js` or `js/3d/combat.js` (effect application)

**Stackable items** (new pattern): These increment a counter in `st.items` instead of occupying a slot.
```javascript
// In applyItem:
if (itemDef.stackable) {
  st.items[itemDef.slot] = (st.items[itemDef.slot] || 0) + 1;
} else {
  st.items[itemDef.slot] = itemDef.id;
}
```

**Effect implementation priority (by complexity):**
1. **Simple stat boosts (do first):** Rubber Ducky (+10% speed), Thick Fur (+15 HP), Bandana (+5% damage), Lucky Penny (+8% powerup drop), Alarm Clock (-8% howl cooldowns), Turbo Sneakers (+25% speed +10% dodge), Golden Bone (+30% weapon damage), Zombie Magnet (2x XP)
2. **Proc effects (more complex):** Hot Sauce Bottle (15% ignite chance), Bouncy Ball (+1 ricochet), Whoopee Cushion (20% explode-on-death), Crown of Claws (+1 auto-attack target), Rainbow Scarf (+50% howl effects), Silly Straw (heal 1 HP per 10 kills)

**Test criteria:**
```javascript
// Stackable items stack correctly
const st = { items: {} };
applyItem(ITEMS_ALPHA.find(i => i.id === 'rubberDucky'), st);
assertEqual(st.items.duck, 1, 'First rubber ducky = 1');
applyItem(ITEMS_ALPHA.find(i => i.id === 'rubberDucky'), st);
assertEqual(st.items.duck, 2, 'Second rubber ducky = 2');

// Non-stackable items use slot
applyItem(ITEMS_ALPHA.find(i => i.id === 'goldenBone'), st);
assertEqual(st.items.goldenbone, 'goldenBone', 'Golden Bone occupies slot');
```

**Playtest verification:**
- Pick up a legendary item -- see orange border on drop and in item list
- Stack 3 Rubber Duckies -- see speed noticeably increase
- Pick up Hot Sauce Bottle -- some enemies catch fire (orange particles) on hit
- Pick up Crown of Claws -- auto-attack hits visually target two enemies

**Done when:** All 25 items can be picked up, equipped, and their effects are functional. Stackable items stack. Rarity colors visible on drops.

---

## Task A-12: Randomized Weapon + Howl Pool Per Run

**What to build:** At the start of each run, randomly select 6 of 10 weapon types and 6 of 10 howl types to appear in level-up options. The excluded types change every run.

**File:** `js/3d/level-up.js` (new)

**Logic:**
```javascript
export function generateRunPool(weaponTypes, howlTypes) {
  const weaponKeys = Object.keys(weaponTypes);
  const howlKeys = Object.keys(howlTypes);
  return {
    availableWeapons: shuffle(weaponKeys).slice(0, 6),
    availableHowls: shuffle(howlKeys).slice(0, 6),
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

The player's starting weapon is always included in the pool (add it if the shuffle excluded it).

**Test criteria:**
```javascript
const pool = generateRunPool(WEAPON_TYPES, HOWL_TYPES);
assertEqual(pool.availableWeapons.length, 6, '6 weapons available');
assertEqual(pool.availableHowls.length, 6, '6 howls available');
// All entries are valid keys
for (const wk of pool.availableWeapons) assert(WEAPON_TYPES[wk], `${wk} is valid weapon`);
for (const hk of pool.availableHowls) assert(HOWL_TYPES[hk], `${hk} is valid howl`);
// Run 100 pool generations, verify we get different pools
const pools = new Set();
for (let i = 0; i < 100; i++) {
  const p = generateRunPool(WEAPON_TYPES, HOWL_TYPES);
  pools.add(p.availableWeapons.sort().join(','));
}
assert(pools.size > 5, 'Different weapon pools across runs');
```

**Done when:** Playing 3 consecutive runs shows different weapon/howl offerings in at least 2 of 3.

---

## Task A-13: Level-Up Card UI Update (Rarity Borders)

**What to build:** Update level-up upgrade cards to show rarity color borders on item offers, big icon, short name, and one-line description. Howl offers show "HOWL" category badge instead of "SCROLL."

**File:** `js/3d/hud.js`

**Changes:**
- Item upgrade cards: border color matches item rarity (white/green/blue/orange)
- Rarity name shown in card (e.g., "Shiny Stuff" in blue text)
- Howl cards: category badge says "HOWL" not "SCROLL"
- Weapon cards: show weapon type icon area (colored rectangle)
- All cards: minimum font size 14px for name, 12px for description

**Test criteria (manual, visual):**
- Level up with items available -- see rarity-colored borders
- Level up with howls available -- see "HOWL" badge, not "SCROLL"
- At 1280x720, all card text is readable

**Done when:** Level-up cards show rarity colors, howl badge, and readable text at 1280x720.
