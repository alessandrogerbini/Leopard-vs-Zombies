# Refactor Review: GAMMA -- Code Quality, Patterns & Developer Experience

**Reviewer perspective:** GAMMA (code quality, DRY, naming, dead code, error handling, state machines, magic strings, developer ergonomics)

**Files reviewed:**
- `js/game3d.js` (~7900 lines)
- `js/3d/constants.js`, `js/3d/hud.js`, `js/3d/audio.js`
- `js/game.js`, `js/renderer.js`, `js/state.js`
- `js/enemies.js`, `js/items.js`, `js/levels.js`, `js/utils.js`

---

## Table of Contents

1. [G-01: getWeaponDamage() hardcoded scaling chain](#g-01)
2. [G-02: showUpgradeMenu() category filter bug](#g-02)
3. [G-03: 2D items.js -- five copy-pasted spawn/update pairs](#g-03)
4. [G-04: Menu dismissal boilerplate repeated four times](#g-04)
5. [G-05: Slow-debuff timer pattern duplicated three times](#g-05)
6. [G-06: disposeSceneObject / disposeTempMesh near-duplicates](#g-06)
7. [G-07: Difficulty damage multiplier calculated inline repeatedly](#g-07)
8. [G-08: Rarity-weighted random selection duplicated three times](#g-08)
9. [G-09: Item slot-occupied check is a 15-branch if/else chain](#g-09)
10. [G-10: fireWeapon() 340-line switch -- adding a weapon requires 5+ edits](#g-10)
11. [G-11: Dead functions -- generateShrines, unloadShrines, getGroundAt alias](#g-11)
12. [G-12: Dead state -- autoAttackTimer, shrinesByChunk](#g-12)
13. [G-13: SNEAKERS_TYPE historical misnomer in state.js](#g-13)
14. [G-14: drawLeopard() renders any animal, not just leopard](#g-14)
15. [G-15: Audio silently swallows all errors](#g-15)
16. [G-16: Magic strings for tier labels and colors in handleLowTierSpecialAttack](#g-16)
17. [G-17: Boss attack cooldown object duplicated three times](#g-17)
18. [G-18: 2D state.js has 10 parallel arrays for 5 equipment types](#g-18)
19. [G-19: 2D enemies.js duplicates ally death handling](#g-19)
20. [G-20: Renderer glasses overlay -- massive copy-paste across 6 animal/vehicle combos](#g-20)
21. [G-21: Phase cooldown multiplier recalculated identically in four places](#g-21)

---

<a id="g-01"></a>
## G-01: getWeaponDamage() hardcoded per-weapon scaling chain

**Priority:** must-do | **Effort:** small

### Problem

`js/game3d.js` ~lines 2557-2576. `getWeaponDamage(typeId, level)` uses a large if/else chain to look up per-weapon damage scaling factors:

```js
function getWeaponDamage(typeId, level) {
  let base = WEAPON_TYPES[typeId].baseDamage;
  let mult = 1;
  if (typeId === 'clawSwipe') mult = 1 + (level - 1) * 0.3;
  else if (typeId === 'boneToss') mult = 1 + (level - 1) * 0.25;
  else if (typeId === 'poisonCloud') mult = 1 + (level - 1) * 0.2;
  // ... 8 more branches
  return base * mult * ...;
}
```

Every weapon type requires a branch here, and the scaling factor (0.3, 0.25, 0.2, etc.) lives nowhere near the weapon definition in `constants.js`.

### Impact

Adding a new weapon type means remembering to add a branch here in addition to the `WEAPON_TYPES` entry, `fireWeapon()`, `updateWeapons()`, and HUD code. If you forget, the weapon silently gets `mult = 1` (no scaling), and the bug is invisible until someone notices late-game damage feels wrong.

### Solution

Add a `levelScaling` field to each entry in `WEAPON_TYPES` in `constants.js`:

```js
clawSwipe: { ..., levelScaling: 0.3 },
boneToss:  { ..., levelScaling: 0.25 },
```

Then reduce `getWeaponDamage` to:

```js
function getWeaponDamage(typeId, level) {
  const def = WEAPON_TYPES[typeId];
  const mult = 1 + (level - 1) * (def.levelScaling || 0.2);
  return def.baseDamage * mult * ...;
}
```

---

<a id="g-02"></a>
## G-02: showUpgradeMenu() category filter bug (mismatched strings)

**Priority:** must-do | **Effort:** small

### Problem

`js/game3d.js` ~line 4549. The "guarantee at least 1 weapon option" logic filters the pool using category strings that do not match what the pool entries actually use:

```js
// Pool entries use these categories (lines 4475, 4493, 4507, 4534):
//   'NEW!', 'BETTER!', 'POWER!', 'HEAL'

// But the filter checks for:
const weaponPool = pool.filter(p => p.category === 'NEW WEAPON' || p.category === 'UPGRADE');
const otherPool  = pool.filter(p => p.category !== 'NEW WEAPON' && p.category !== 'UPGRADE');
```

`'NEW WEAPON'` never equals `'NEW!'` and `'UPGRADE'` never equals `'BETTER!'`. The `weaponPool` array is always empty, so the guarantee logic is completely dead.

### Impact

The BD-110 feature ("guarantee at least 1 weapon option per level-up") has never actually worked. Players can get level-up menus with zero weapon choices even when weapon slots are available and new weapons exist in the pool. This degrades the roguelike progression loop.

### Solution

Fix the filter strings to match the actual pool categories:

```js
const weaponPool = pool.filter(p => p.category === 'NEW!' || p.category === 'BETTER!');
const otherPool  = pool.filter(p => p.category !== 'NEW!' && p.category !== 'BETTER!');
```

Or, better yet, define category constants and use them in both the pool-building and filtering code to prevent future drift.

---

<a id="g-03"></a>
## G-03: 2D items.js -- five copy-pasted spawn/update function pairs

**Priority:** should-do | **Effort:** medium

### Problem

`js/items.js` contains five nearly identical pairs of functions for equipment crate spawning and pickup updating:

| Equipment | Spawn function | Update function |
|-----------|---------------|-----------------|
| Armor | `spawnArmorCrates()` | `updateArmorPickups()` |
| Glasses | `spawnGlassesCrates()` | `updateGlassesPickups()` |
| Sneakers | `spawnSneakersCrates()` | `updateSneakersPickups()` |
| Cleats | `spawnCleatsCrates()` | `updateCleatsPickups()` |
| Horse | `spawnHorseCrates()` | `updateHorsePickups()` |

Each pair follows the same structure: iterate over crate array, check player proximity, break on contact, spawn a floating pickup, then iterate over pickup array, check player proximity, equip the item. The differences are: (a) crate/pickup array names, (b) the equip action, (c) visual details (color, label text). Lines ~80-569.

### Impact

Every new equipment type requires copy-pasting ~95 lines and making 4-5 substitutions. This is error-prone (miss one substitution and the wrong item gets equipped), bloats the file, and makes bug fixes require touching 5 places.

### Solution

Extract a generic `spawnEquipmentCrates(config)` / `updateEquipmentPickups(config)` pair, where `config` specifies: `crateArrayKey`, `pickupArrayKey`, `color`, `labelText`, `equip(player)`. Each equipment type becomes a ~8-line config object. Estimated reduction: ~400 lines to ~100 lines.

---

<a id="g-04"></a>
## G-04: Menu dismissal boilerplate repeated four times

**Priority:** should-do | **Effort:** small

### Problem

`js/game3d.js` ~lines 700-850. The key-clearing + charge-resetting + invincibility boilerplate is copy-pasted whenever a menu is dismissed (upgrade menu confirm, charge shrine menu confirm, pause menu resume, wearable comparison confirm). Each instance does:

```js
keys3d['Enter'] = false;
keys3d['NumpadEnter'] = false;
keys3d['Space'] = false;
inputState.charging = false;
inputState.chargeTime = 0;
st.paused = false;
st.invincible = Math.max(st.invincible, 0.5);
inputState.enterCooldown = 0.3;
inputState.menuDismissedAt = performance.now();
```

This appears in at least 4 locations with minor variations.

### Impact

When a new menu type is added (or an existing one is refactored), it is easy to forget one of these lines. For example, forgetting `inputState.charging = false` causes the power attack to charge immediately after menu dismissal. Forgetting the invincibility grant causes damage during the first few frames after unpause.

### Solution

Extract a `dismissMenu()` helper:

```js
function dismissMenu() {
  keys3d['Enter'] = false;
  keys3d['NumpadEnter'] = false;
  keys3d['Space'] = false;
  inputState.charging = false;
  inputState.chargeTime = 0;
  st.paused = false;
  st.invincible = Math.max(st.invincible, 0.5);
  inputState.enterCooldown = 0.3;
  inputState.menuDismissedAt = performance.now();
}
```

Replace all 4 sites with `dismissMenu()`. Individual sites that need extra logic (e.g., resetting `st.upgradeMenu`) do so before or after the call.

---

<a id="g-05"></a>
## G-05: Slow-debuff timer pattern duplicated three times

**Priority:** should-do | **Effort:** small

### Problem

`js/game3d.js` ~lines 5469-5501. Three slow debuffs (mud, turd, snow) each use the same timer-decrement pattern in the enemy update loop:

```js
if (e._mudSlowed) {
  e._mudSlowTimer -= dt;
  if (e._mudSlowTimer <= 0) { e._mudSlowed = false; e.speed = e._originalSpeed; }
}
if (e._turdSlowed) {
  e._turdSlowTimer -= dt;
  if (e._turdSlowTimer <= 0) { e._turdSlowed = false; e.speed = e._originalSpeed; }
}
if (e._snowSlowed) {
  e._snowSlowTimer -= dt;
  if (e._snowSlowTimer <= 0) { e._snowSlowed = false; e.speed = e._originalSpeed; }
}
```

Three identical code blocks with only the property name prefix changed.

### Impact

Any new slow-type weapon requires adding another identical block. If a future change modifies how slow expiry works (e.g., gradual speed recovery), three blocks must be updated identically.

### Solution

Use a single debuff array on each enemy:

```js
// On apply: e.slowDebuffs.push({ source: 'mud', timer: 2.0 })
// On update:
for (let i = e.slowDebuffs.length - 1; i >= 0; i--) {
  e.slowDebuffs[i].timer -= dt;
  if (e.slowDebuffs[i].timer <= 0) e.slowDebuffs.splice(i, 1);
}
if (e.slowDebuffs.length === 0 && e.speed !== e._originalSpeed) e.speed = e._originalSpeed;
```

This generalizes to any number of slow sources with zero duplication.

---

<a id="g-06"></a>
## G-06: disposeSceneObject / disposeTempMesh are near-duplicates

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/game3d.js` ~lines 3728-3761. Two disposal functions do essentially the same thing:

```js
function disposeSceneObject(obj) {
  scene.remove(obj);
  if (obj.traverse) {
    obj.traverse(c => { /* dispose geo + mat */ });
  } else {
    /* dispose geo + mat */
  }
}

function disposeTempMesh(mesh) {
  if (!mesh) return;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) { /* dispose */ }
  scene.remove(mesh);
}
```

`disposeTempMesh` is a null-safe subset of `disposeSceneObject` that skips `traverse` (so it does not recursively clean Group children). Both are used throughout the file.

### Impact

Low severity -- the code works -- but it creates confusion about which to call. Several call sites use `disposeTempMesh` on Groups, which silently leaks child geometry.

### Solution

Make `disposeSceneObject` null-safe (add the `if (!obj) return;` guard), then replace all `disposeTempMesh` calls with `disposeSceneObject`. Remove `disposeTempMesh`.

---

<a id="g-07"></a>
## G-07: Difficulty damage multiplier calculated inline repeatedly

**Priority:** should-do | **Effort:** small

### Problem

The difficulty-based damage multiplier is computed from scratch via string comparison in at least 3 places:

- `js/game3d.js` ~line 3795 (handleLowTierSpecialAttack):
  ```js
  const diffDmgMult = st.difficulty === 'chill' ? 0.5 : st.difficulty === 'easy' ? 0.75 : st.difficulty === 'hard' ? 1.3 : 1.0;
  ```
- `js/game3d.js` ~line 5523 (enemy update loop, boss attacks):
  ```js
  const diffDmgMult = st.difficulty === 'chill' ? 0.5 : st.difficulty === 'easy' ? 0.75 : st.difficulty === 'hard' ? 1.3 : 1.0;
  ```
- Chill-mode checks (`st.difficulty === 'chill'`) are scattered across 50+ locations for various multipliers.

### Impact

If the difficulty values change (e.g., adding a "nightmare" difficulty), every inline calculation must be found and updated. The current approach also guarantees hard-to-spot bugs when one location uses different thresholds than the others.

### Solution

Compute `st.diffDmgMult` once at game start based on `st.difficulty`, and reference it everywhere:

```js
// In initialization:
const DIFF_DMG_MULT = { chill: 0.5, easy: 0.75, normal: 1.0, hard: 1.3 };
st.diffDmgMult = DIFF_DMG_MULT[st.difficulty] || 1.0;
st.isChill = st.difficulty === 'chill';
```

Optionally add a `DIFFICULTY_PROFILES` map to `constants.js` (like the 2D mode's `DIFFICULTY_SETTINGS`) that bundles all difficulty-dependent multipliers in one place.

---

<a id="g-08"></a>
## G-08: Rarity-weighted random selection duplicated three times

**Priority:** nice-to-have | **Effort:** small

### Problem

The "build a weighted pool, roll a random index, pick from the pool" pattern for rarity-gated item selection appears in at least three places:

1. `createItemPickup()` -- weighted by `ITEM_RARITIES` weights for stackable items.
2. `createWearablePickup()` -- weighted by `ITEM_RARITIES` weights for wearable gear.
3. `rollChargeShrineRarity()` -- weighted roll for charge shrine rarity tier.

Each uses slightly different loop structures but the core logic is identical: sum weights, roll, iterate to find the bucket.

### Impact

Minor maintenance overhead, but the inconsistent loop structures increase the chance of an off-by-one or weight-sum bug.

### Solution

Extract a `weightedPick(entries, getWeight)` utility:

```js
function weightedPick(entries, getWeight = e => e.weight) {
  let total = 0;
  for (const e of entries) total += getWeight(e);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= getWeight(e);
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}
```

---

<a id="g-09"></a>
## G-09: Item slot-occupied check is a 15-branch if/else chain

**Priority:** should-do | **Effort:** small

### Problem

`js/game3d.js` ~lines 7302-7319. Checking whether a non-stackable item slot is occupied uses a massive if/else chain that explicitly names every slot:

```js
if (it.slot === 'armor' && st.items.armor !== null) slotOccupied = true;
else if (it.slot === 'boots' && st.items.boots !== null) slotOccupied = true;
else if (it.slot === 'glasses' && st.items.glasses) slotOccupied = true;
else if (it.slot === 'ring' && st.items.ring) slotOccupied = true;
// ... 11 more branches
```

### Impact

Every new non-stackable item slot requires adding a branch here, in the equip logic (~lines 7347-7362), and in the comparison menu logic (~lines 7323-7330). Three places to update for what should be a data-driven operation.

### Solution

Use the `it.slot` key to index directly into `st.items`:

```js
const slotValue = st.items[it.slot];
const slotOccupied = !it.stackable && slotValue !== null && slotValue !== undefined && slotValue !== false;
```

This collapses 15 branches to 1 line and automatically supports any new slot added to `st.items`.

Similarly, the equip logic can be simplified if item definitions carry an `onEquip(st)` callback, moving item-specific side effects (like `st.collectRadius *= 1.5` for ring) into the item definition.

---

<a id="g-10"></a>
## G-10: fireWeapon() 340-line switch -- adding a weapon requires 5+ edits

**Priority:** should-do | **Effort:** large

### Problem

`js/game3d.js` ~lines 2953-3294. `fireWeapon(weapon)` is a 340-line function with a switch/if-else chain on `weapon.typeId`. Each weapon type has its own projectile-creation, geometry, targeting, and sound logic hard-coded inside this function.

Adding a new weapon currently requires changes in:

1. `WEAPON_TYPES` in `constants.js` (name, desc, baseDamage, etc.)
2. `fireWeapon()` in `game3d.js` (projectile creation + behavior)
3. `getWeaponDamage()` in `game3d.js` (level scaling)
4. `updateWeapons()` in `game3d.js` (special per-frame behavior, if needed)
5. Sound mapping in `audio.js` or inline in `fireWeapon()`
6. HUD rendering in `hud.js` (if the weapon has unique display logic)

### Impact

This is the single biggest ergonomics bottleneck. A developer adding a new weapon must understand and modify 5+ files, with the core logic (step 2) buried inside a 340-line function. The risk of breaking an existing weapon while adding a new one is high.

### Solution

**Phase 1 (medium effort):** Move each weapon's fire logic into a `fire(context)` method on the `WEAPON_TYPES` definition. The `context` object provides `scene`, `st`, `THREE`, `playSound`, `spawnFireParticle`, etc. `fireWeapon()` becomes:

```js
function fireWeapon(weapon) {
  const def = WEAPON_TYPES[weapon.typeId];
  def.fire({ weapon, scene, st, ... });
}
```

**Phase 2 (large effort):** Extract each weapon into its own module under `js/3d/weapons/`, with a standard interface: `{ fire(ctx), update(ctx, dt), getLevelScaling() }`. Register them in a weapon registry. This makes weapons fully self-contained and testable.

---

<a id="g-11"></a>
## G-11: Dead functions -- generateShrines, unloadShrines, getGroundAt alias

**Priority:** should-do | **Effort:** small

### Problem

Three functions in `js/game3d.js` are dead or trivially redundant:

1. **`generateShrines()`** (~line 1375): Empty function body, does nothing. Shrine generation was moved to chunk-based placement.
2. **`unloadShrines()`** (~line 1388): Empty function body, does nothing. Shrine cleanup was moved elsewhere.
3. **`getGroundAt(x, z)`** (~line 4587): A one-line alias for `terrainHeight(x, z)`. Used ~20 times in the game loop while `terrainHeight` is used directly in other contexts. The alias adds no value and creates naming confusion.

### Impact

Dead functions mislead readers into thinking they do something. The `getGroundAt` alias specifically means there are two names for the same operation used interchangeably, making grep/search less reliable.

### Solution

1. Delete `generateShrines()` and `unloadShrines()` and remove any call sites (none exist).
2. Replace all `getGroundAt` calls with `terrainHeight` (or vice versa -- pick one name), then delete the alias.

---

<a id="g-12"></a>
## G-12: Dead state -- autoAttackTimer, shrinesByChunk

**Priority:** nice-to-have | **Effort:** small

### Problem

Two state properties in `js/game3d.js` are marked as deprecated but still initialized:

1. **`st.autoAttackTimer`** (~line 409): Comment says "kept for compatibility" but the auto-attack system was removed in BD-102. No code reads or writes this value.
2. **`st.shrinesByChunk`** (~line 203): Described as "legacy, now unused" in a comment. The shrine system now uses `st.shrines[]` directly.

### Impact

Low severity. These unused properties marginally increase cognitive load and memory footprint.

### Solution

Delete both properties and their initialization code. Search for any references first to confirm no external code reads them.

---

<a id="g-13"></a>
## G-13: SNEAKERS_TYPE historical misnomer in state.js

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/state.js` ~line 317: `SNEAKERS_TYPE` is used as the key for what is actually the cowboy boots item. A comment explains: "Named SNEAKERS_TYPE for historical reasons." The variable is exported and used in `items.js` and `renderer.js`.

### Impact

New developers will expect `SNEAKERS_TYPE` to relate to sneakers, not cowboy boots. This creates a cognitive trap that wastes time during onboarding or debugging.

### Solution

Rename to `COWBOY_BOOTS_TYPE` with a search-and-replace across `state.js`, `items.js`, and `renderer.js`. This is a safe rename since the string value is only used internally.

---

<a id="g-14"></a>
## G-14: drawLeopard() renders any animal, not just leopard

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/renderer.js` ~line 74. The main player-drawing function is named `drawLeopard()` but it renders leopards, red pandas, lions, and gators depending on `player.animal`. The name is a historical artifact from when leopard was the only playable character.

### Impact

Misleading function name. A developer searching for "where is the gator drawn?" would not think to look in `drawLeopard()`.

### Solution

Rename to `drawPlayer()` or `drawAnimal()`. Update the single call site in the render loop.

---

<a id="g-15"></a>
## G-15: Audio silently swallows all errors

**Priority:** should-do | **Effort:** small

### Problem

`js/3d/audio.js` uses `catch (_) {}` (empty catch) on every `play()` call throughout the module. No errors are logged, even in development. Examples at lines ~120, ~135, ~155, ~175, etc.

### Impact

When audio fails to load or play (wrong path, missing file, codec issue), there is zero diagnostic output. Developers debugging audio issues have to add temporary logging, test, then remove it. During the Sound Pack Alpha integration, this likely wasted debugging time.

### Solution

Replace `catch (_) {}` with `catch (err) { if (this._debug) console.warn('Audio:', eventId, err.message); }` and add a `_debug` flag (defaulting to `false` in production). This preserves the fail-silent behavior for players while giving developers a way to enable diagnostics.

---

<a id="g-16"></a>
## G-16: Magic strings for tier labels and colors in handleLowTierSpecialAttack

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/game3d.js` ~lines 3816-3817. Tier labels and colors for floating text are defined as inline objects inside `handleLowTierSpecialAttack`:

```js
const tierLabels = { 2: 'LUNGE!', 3: 'GROUND POUND!', 4: 'BONE SPIT!', 5: 'POISON POOL!', 6: 'GRAVE BURST!' };
const tierColors = { 2: '#ffff00', 3: '#ff2200', 4: '#ffff00', 5: '#44ff44', 6: '#ff0000' };
```

Similarly, boss attack labels at lines ~6017-6023 and ~6142-6148 define their own inline label/color maps.

These are rebuilt on every function call (they are inside the function body, not hoisted).

### Impact

If a tier's attack name changes, you have to find the right inline object inside a 7900-line file. There is no single source of truth for attack names/colors.

### Solution

Add `attackLabel` and `attackColor` fields to the relevant constant definitions:

- For tiers 2-6: add to `ZOMBIE_TIERS` in `constants.js`.
- For boss attacks: add to a new `BOSS_ATTACK_DEFS` map in `constants.js`.

This centralizes the data and removes the per-call object allocation.

---

<a id="g-17"></a>
## G-17: Boss attack cooldown object duplicated three times

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/game3d.js` defines attack cooldown maps in three separate locations for boss attack state management:

1. Overlord attack cooldowns at ~line 6620:
   ```js
   const attackCooldowns = { deathBoltVolley: 4, shadowZones: 8, summonBurst: 12, deathBeam: 10 };
   ```
2. Titan attack cooldowns at ~line 6632:
   ```js
   const attackCooldowns = { slam: 2.5, shockwave: 2.5, boneBarrage: 6, titanCharge: 10, groundFissures: 8 };
   ```
3. Individual cooldown values are also set inline at specific attack start sites (e.g., titanCharge at line ~6236, groundFissures at line ~6270, darkNova at line ~5979).

### Impact

Changing a cooldown requires finding all locations where that attack's cooldown is referenced. The inline overrides at attack start sites can silently contradict the "canonical" cooldown map.

### Solution

Move all boss attack cooldown definitions to `constants.js` as `TITAN_ATTACK_COOLDOWNS` and `OVERLORD_ATTACK_COOLDOWNS`. Reference them from all three locations.

---

<a id="g-18"></a>
## G-18: 2D state.js has 10 parallel arrays for 5 equipment types

**Priority:** should-do | **Effort:** medium

### Problem

`js/state.js` defines 10 separate arrays in the game state for equipment:

```js
armorCrates: [], armorPickups: [],
glassesCrates: [], glassesPickups: [],
sneakersCrates: [], sneakersPickups: [],
cleatsCrates: [], cleatsPickups: [],
horseCrates: [], horsePickups: [],
```

Each pair (crate + pickup) tracks the same kind of entity for a different equipment type. This couples tightly with the copy-pasted functions in G-03.

### Impact

Adding a new equipment type requires adding 2 new arrays to state, 2 new functions to items.js, adding render calls, and updating the state-reset logic. High friction, high chance of forgetting one of the arrays.

### Solution

Replace with a generic structure:

```js
equipmentCrates: [],  // Each entry has a `.type` field: 'armor', 'glasses', etc.
equipmentPickups: [], // Each entry has a `.type` field
```

This pairs with the generic spawn/update functions from G-03. The state reset logic becomes a single `equipmentCrates: [], equipmentPickups: []` instead of 10 assignments.

---

<a id="g-19"></a>
## G-19: 2D enemies.js duplicates ally death handling

**Priority:** nice-to-have | **Effort:** small

### Problem

`js/enemies.js` ~lines 756-767 and ~785-796. The ally-death handling code (spawn particles, remove from allies array, play death sound) is duplicated between the "zombie damages ally" and "boss damages ally" code paths:

```js
// In zombie attack section (~756):
if (ally.hp <= 0) {
  spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff4444', 8, 4);
  state.allies.splice(ai, 1);
  // ... etc
}

// In boss attack section (~785) -- identical block:
if (ally.hp <= 0) {
  spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff4444', 8, 4);
  state.allies.splice(ai, 1);
  // ... etc
}
```

### Impact

Minor. A change to ally death behavior must be applied in two places.

### Solution

Extract a `killAlly(ally, index)` helper. Both damage sources call it when `ally.hp <= 0`.

---

<a id="g-20"></a>
## G-20: Renderer glasses overlay -- massive copy-paste across 6 animal/vehicle combos

**Priority:** should-do | **Effort:** medium

### Problem

`js/renderer.js` ~lines 530-703. The aviator glasses overlay is drawn with separate code blocks for each combination of (animal type) x (vehicle mode):

1. Gator in race car (~536-558)
2. Non-gator in race car (~560-586)
3. Gator in litter box (~588-613)
4. Non-gator in litter box (~614-640)
5. Gator walking (~642-671)
6. Non-gator walking (~672-703)

Each block draws the same glasses structure (bridge, left lens, left frame, right lens, right frame, temple arm, glint) with different position offsets. This is ~170 lines of near-identical drawing code.

The same pattern applies to the footwear overlay (~706-807) with 3 shoe types x 4 paws, and the armor overlay (~440-523) with 2 armor types.

### Impact

Adding a new animal or vehicle mode requires duplicating the glasses/footwear blocks again. The position-offset-only differences make it hard to verify visual correctness.

### Solution

Define position offset tables per (animal, vehicle) combination:

```js
const GLASSES_OFFSETS = {
  'gator:raceCar': { bridgeX: 30, bridgeY: -2, lensW: 7, lensH: 6, ... },
  'default:raceCar': { bridgeX: 27, bridgeY: 5, lensW: 8, lensH: 6, ... },
  // etc.
};
```

Then a single `drawGlasses(ctx, offsets)` function handles all 6 combinations. Estimated reduction: ~170 lines to ~50 lines.

---

<a id="g-21"></a>
## G-21: Phase cooldown multiplier recalculated identically in four places

**Priority:** nice-to-have | **Effort:** small

### Problem

The boss phase-based cooldown multiplier is computed identically in 4 locations within the enemy update section of `game3d.js`:

```js
const phaseCooldownMult = e.bossPhase >= 3 ? 0.75 : e.bossPhase >= 2 ? 0.85 : 1.0;
```

Appears at ~lines 5742, 6626, 6639, and 6695.

A similar pattern for Overlord phase multiplier:

```js
const phaseMult = e.bossPhase <= 1 ? 1.0 : e.bossPhase <= 2 ? 0.9 : 0.8;
```

Appears at ~lines 5977, 6041, 6626, 6695.

### Impact

If phase thresholds change, four locations must be updated in sync.

### Solution

Compute once at the top of the boss-attack section and reuse:

```js
const phaseCooldownMult = getBossPhaseCooldownMult(e.bossPhase, e.tier);
```

Or store it on the enemy object when the phase transitions (`e.phaseCooldownMult`).

---

## Summary by Priority

### Must-do (2)
| ID | Issue | Effort |
|----|-------|--------|
| G-01 | getWeaponDamage() hardcoded scaling chain | small |
| G-02 | showUpgradeMenu() category filter bug | small |

### Should-do (9)
| ID | Issue | Effort |
|----|-------|--------|
| G-03 | 2D items.js five copy-pasted spawn/update pairs | medium |
| G-04 | Menu dismissal boilerplate repeated 4x | small |
| G-05 | Slow-debuff timer pattern duplicated 3x | small |
| G-07 | Difficulty damage multiplier inline 3x | small |
| G-09 | Item slot-occupied 15-branch if/else | small |
| G-10 | fireWeapon() 340-line switch, 5+ files to add a weapon | large |
| G-15 | Audio silently swallows all errors | small |
| G-18 | 2D state.js 10 parallel arrays for 5 equipment types | medium |
| G-20 | Renderer glasses overlay copy-paste x6 | medium |

### Nice-to-have (10)
| ID | Issue | Effort |
|----|-------|--------|
| G-06 | disposeSceneObject / disposeTempMesh duplicates | small |
| G-08 | Rarity-weighted selection duplicated 3x | small |
| G-11 | Dead functions (generateShrines, unloadShrines, getGroundAt) | small |
| G-12 | Dead state (autoAttackTimer, shrinesByChunk) | small |
| G-13 | SNEAKERS_TYPE historical misnomer | small |
| G-14 | drawLeopard() renders any animal | small |
| G-16 | Magic strings for tier labels/colors | small |
| G-17 | Boss attack cooldown object duplicated 3x | small |
| G-19 | 2D enemies.js duplicates ally death handling | small |
| G-21 | Phase cooldown multiplier recalculated 4x | small |

---

## Developer Ergonomics: "How hard is it to add X?"

### Adding a new weapon (current: ~5 files, ~6 edits)
1. `constants.js` -- add to WEAPON_TYPES
2. `game3d.js` -- add branch in fireWeapon() (~340 lines)
3. `game3d.js` -- add branch in getWeaponDamage() (~20 lines)
4. `game3d.js` -- add special update logic if needed
5. `audio.js` or inline -- add sound mapping
6. `hud.js` -- add display logic if unique

**After G-01 + G-10 refactor: 1-2 files.** The weapon definition in constants.js would carry scaling, fire logic reference, and sound mapping. HUD reads from the definition.

### Adding a new item in 2D (current: ~4 files, ~6 edits)
1. `state.js` -- add 2 arrays (crate + pickup)
2. `items.js` -- copy-paste 2 functions (~95 lines each)
3. `renderer.js` -- add visual rendering
4. `game.js` -- add spawn/update calls

**After G-03 + G-18 refactor: 1-2 files.** A config object in items.js plus a visual definition in renderer.js.

### Adding a new non-stackable item in 3D (current: 3 edits in 1 file)
1. `constants.js` -- add to ITEMS_3D
2. `game3d.js` -- add branch in slot-occupied check (~line 7302)
3. `game3d.js` -- add branch in equip logic (~line 7347)

**After G-09 refactor: 1 file.** The constants.js definition with an `onEquip` callback handles everything.

### Adding a new difficulty tier (current: 50+ inline edits)
Every `st.difficulty === 'chill'` ternary must be updated across `game3d.js`.

**After G-07 refactor: 1 edit.** Add the new tier to `DIFFICULTY_PROFILES` in constants.js. All multipliers flow from the profile.
