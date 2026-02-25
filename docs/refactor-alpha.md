# Refactor Review Alpha: Architecture & Modularity

**Perspective:** Module boundaries, separation of concerns, dependency flow, god-object anti-patterns, circular dependencies, and opportunities to split large files into focused modules.

**Date:** 2026-02-25

---

## Table of Contents

1. [Codebase Overview](#1-codebase-overview)
2. [Findings](#2-findings)
   - [A1: game3d.js is a 7,997-line god-function](#a1-game3djs-is-a-7997-line-god-function)
   - [A2: Enemy model construction is embedded in game3d.js](#a2-enemy-model-construction-is-embedded-in-game3djs)
   - [A3: Weapon system is 1,200+ lines inside game3d.js](#a3-weapon-system-is-1200-lines-inside-game3djs)
   - [A4: Boss/special attack AI is 350+ lines in game3d.js](#a4-bossspecial-attack-ai-is-350-lines-in-game3djs)
   - [A5: Plateau/shrine/totem/gem systems are inline closures](#a5-plateaushrinetotemgem-systems-are-inline-closures)
   - [A6: The `st` object is a 200-property god-object](#a6-the-st-object-is-a-200-property-god-object)
   - [A7: The game loop (tick) is a 1,300-line monolith](#a7-the-game-loop-tick-is-a-1300-line-monolith)
   - [A8: renderer.js is 4,599 lines with no sub-modules](#a8-rendererjs-is-4599-lines-with-no-sub-modules)
   - [A9: 2D mode uses module-level mutable singletons (state.js)](#a9-2d-mode-uses-module-level-mutable-singletons-statejs)
   - [A10: Duplicate patterns in items.js (crate/pickup boilerplate)](#a10-duplicate-patterns-in-itemsjs-cratepickup-boilerplate)
   - [A11: The already-extracted modules (terrain, audio, player-model, hud, constants, utils) are well-structured](#a11-the-already-extracted-modules-are-well-structured)
   - [A12: No circular dependencies detected](#a12-no-circular-dependencies-detected)
3. [Priority Summary](#3-priority-summary)

---

## 1. Codebase Overview

### File Size Inventory

| File | Lines | Role |
|------|------:|------|
| `js/game3d.js` | 7,997 | 3D mode orchestrator (single closure) |
| `js/renderer.js` | 4,599 | 2D rendering (all draw functions) |
| `js/3d/hud.js` | 1,522 | 3D HUD overlay rendering |
| `js/3d/player-model.js` | 902 | Player model build + animation |
| `js/3d/constants.js` | 856 | All 3D constants and data tables |
| `js/3d/terrain.js` | 827 | Procedural terrain and chunk management |
| `js/enemies.js` | 800 | 2D zombie/boss/ally AI |
| `js/items.js` | 568 | 2D item spawning and pickup logic |
| `js/3d/audio.js` | 445 | Sound pool and playback |
| `js/state.js` | 341 | 2D shared mutable state |
| `js/game.js` | 1,267 | 2D game loop and state machine |
| `js/3d/utils.js` | 85 | Geometry/material cache + box helper |

### Dependency Graph (3D mode)

```
index.html
  -> js/game.js (entry)
       -> js/state.js, js/levels.js, js/utils.js, js/enemies.js, js/items.js, js/renderer.js
       -> js/game3d.js
            -> js/3d/constants.js   (Layer 0 -- pure data)
            -> js/3d/utils.js       (Layer 0 -- pure helpers)
            -> js/3d/terrain.js     (Layer 1 -- imports constants, utils)
            -> js/3d/player-model.js (Layer 1 -- imports utils)
            -> js/3d/hud.js         (Layer 1 -- imports constants)
            -> js/3d/audio.js       (Layer 0 -- no game imports)
```

The dependency graph is clean and acyclic. All extracted modules depend only on lower layers. The problem is that `game3d.js` itself is the "everything else" bucket.

---

## 2. Findings

---

### A1: game3d.js is a 7,997-line god-function

**Current problem:**
`js/game3d.js` exports exactly one function: `launch3DGame(options)` (line 255). The entire 3D game -- state initialization, Three.js scene setup, input handling, enemy creation, weapon systems, powerup logic, shrine/totem/plateau generation, the 1,300-line game loop, and cleanup -- lives inside this single closure. At nearly 8,000 lines, it is the most significant architectural bottleneck in the project.

The closure-based architecture was a deliberate choice (documented in the module header): all mutable state is local to `launch3DGame`, avoiding module-level globals. This is a legitimate design decision that prevents stale state between game restarts. However, the tradeoff is that nothing can be extracted without passing `st`, `scene`, and other closure variables as parameters.

**Impact:**
- Two developers editing different subsystems (e.g., weapons and enemy AI) will always conflict in the same file.
- The file is too large for most editors to navigate efficiently.
- Testing any subsystem in isolation is impossible since everything depends on the closure.
- Incremental comprehension is difficult; understanding one subsystem requires mentally filtering 7,000+ lines of unrelated code.

**Proposed solution:**
Extract subsystems into focused modules under `js/3d/`, passing needed context objects as parameters. The closure pattern can be preserved by having `launch3DGame` create a shared context object and pass it to each module's init/update functions.

Recommended extraction order (each is detailed in its own finding below):
1. `js/3d/enemy-model.js` -- enemy creation + disposal (lines 1783-2090, ~300 lines)
2. `js/3d/weapons.js` -- weapon fire/update/projectile logic (lines 2548-3763, ~1,200 lines)
3. `js/3d/enemy-ai.js` -- special attack state machines (lines 3764-4143, ~380 lines)
4. `js/3d/world-objects.js` -- plateaus, shrines, totems, charge shrines, challenge shrines, map gems (lines 996-1711, ~700 lines)
5. `js/3d/spawning.js` -- ambient spawning, wave events, crate/item generation (lines 2167-2524, ~360 lines)

This would reduce `game3d.js` from ~8,000 to ~3,000-3,500 lines (state init, scene setup, input, game loop, cleanup), which is still large but manageable.

**Effort:** Large (each extraction is medium; there are 5 recommended extractions)
**Priority:** Must-do (this is the single largest maintainability issue)

---

### A2: Enemy model construction is embedded in game3d.js

**Current problem:**
`createEnemy()` (lines 1820-2038) is a 218-line function that builds tier-scaled zombie models from box primitives, with visual upgrades per tier (shoulder pads, third eye, horns, spine ridges, crown of fire, boss aura). `disposeEnemy()` (lines 2045-2090) handles cleanup of all associated meshes and special attack state.

Player models were already extracted to `js/3d/player-model.js` using the same `box()` helper. Enemy models use identical construction patterns but remain in the god-function.

**Impact:**
- Asymmetry: player models have their own module but enemy models do not, despite being conceptually identical operations.
- The enemy model code has no dependencies on game state during construction (only reads `ZOMBIE_TIERS` constants and takes parameters). It is a pure factory function and the easiest extraction candidate.
- Enemy model tweaks (visual adjustments, new tiers) force edits to the 8,000-line file.

**Proposed solution:**
Create `js/3d/enemy-model.js` exporting:
- `createEnemyModel(scene, x, z, baseHp, tier)` -- returns the enemy object
- `disposeEnemyModel(scene, enemy)` -- cleanup
- `getTierAttackCooldown(tier)` -- pure lookup

Dependencies: `js/3d/constants.js` (ZOMBIE_TIERS), `js/3d/utils.js` (box), `js/3d/terrain.js` (terrainHeight).

The `scene` reference would be passed as a parameter, matching the pattern used by `buildPlayerModel(animalId, scene)` in `player-model.js`.

**Effort:** Small (self-contained factory functions, no closure dependencies beyond `scene`)
**Priority:** Must-do (lowest-risk, highest-clarity extraction)

---

### A3: Weapon system is 1,200+ lines inside game3d.js

**Current problem:**
The weapon system spans lines 2548-3763 and includes:
- Howl multiplier helpers (lines 2524-2555): `getHowlStrength`, `getHowlDmgMult`, `getHowlCdMult`, etc.
- Weapon stat calculators (lines 2557-2647): `getWeaponDamage`, `getWeaponCooldown`, `getWeaponRange`, `getProjectileCount`, `getChainCount`
- Combat helpers (lines 2649-2952): `findNearestEnemy`, `killEnemy`, `damageEnemy`, `damagePlayer`
- Weapon firing logic (lines 2953-3301): `fireWeapon` with per-type projectile/effect creation for all 10 weapon types
- Weapon update loop (lines 3302-3349): `updateWeapons`
- Projectile physics and hit detection (lines 3350-3648): `updateWeaponProjectiles` with per-type behavior
- Area effect utilities (lines 3649-3727): `spawnExplosion`, `spawnMudSlowZone`, `spawnBees`

These functions read from `st` (howl stacks, weapon array, enemy list) and mutate `st` (enemy HP, XP gems, score) and `scene` (Three.js mesh creation/removal). They form a cohesive subsystem.

**Impact:**
- At 1,200 lines, the weapon system alone is larger than most entire modules in the project.
- Weapon balancing changes (damage, cooldowns, projectile behavior) require navigating the full game3d.js file.
- The `fireWeapon` function (lines 2953-3301, 348 lines) is itself a mini god-function with a massive switch on weapon type.

**Proposed solution:**
Create `js/3d/weapons.js` exporting:
- `initWeapons(ctx)` -- receives context object with `st`, `scene`, helpers
- `fireWeapon(ctx, w)` -- per-type weapon firing
- `updateWeapons(ctx, dt)` -- cooldown ticking and auto-fire
- `updateWeaponProjectiles(ctx, dt)` -- projectile physics and hit detection
- `getWeaponDamage(w, st)`, `getWeaponCooldown(w, st)`, etc. -- stat calculators
- `getHowlDmgMult(st)`, etc. -- howl helpers
- `spawnExplosion(ctx, x, z, radius, dmg)`, `spawnMudSlowZone(...)`, `spawnBees(...)` -- area effects

The context (`ctx`) pattern bundles `st`, `scene`, `addFloatingText`, `playSound`, `createXpGem`, `createAttackLine`, `findNearestEnemy`, `killEnemy`, `damageEnemy`, `damagePlayer`, `spawnFireParticle`, and `triggerScreenShake` -- the shared functions these weapon routines call.

**Effort:** Medium (many cross-references to other closure functions, but the boundary is clear)
**Priority:** Should-do (large payoff for merge conflict reduction)

---

### A4: Boss/special attack AI is 350+ lines in game3d.js

**Current problem:**
Lines 3764-4143 contain the enemy special attack state machines for tiers 2-8:
- `handleLowTierSpecialAttack(e, dt)` -- main dispatcher (lines 3790-3906)
- Per-tier telegraph/fire pairs: `startLurcherTelegraph`/`fireLurcherAttack` (tier 2), `startBruiserTelegraph`/`fireBruiserAttack` (tier 3), `startBruteTelegraph`/`fireBruteAttack` (tier 4), `startRavagerTelegraph`/`fireRavagerAttack` (tier 5), `startHorrorTelegraph`/`fireHorrorAttack`/`fireHorrorBurst` (tier 6)
- Plus boss attack logic for tiers 9-10 embedded in the game loop

These are pure state-machine transitions that read enemy state and player position, then mutate enemy attack fields and spawn visual effects.

**Impact:**
- Adding a new zombie tier's special attack requires editing the middle of the 8,000-line file.
- The telegraph/fire pattern is duplicated across all tiers; a shared abstraction could reduce boilerplate.

**Proposed solution:**
Create `js/3d/enemy-ai.js` exporting:
- `handleSpecialAttack(ctx, enemy, dt)` -- unified dispatcher
- Per-tier telegraph/fire functions (or a data-driven attack table)
- Boss attack state machines (Titan Charge, Ground Fissures, Dark Nova, Death Beam, etc.)

This module would depend on `js/3d/constants.js` and receive a context object for `scene`, `st`, `addFloatingText`, `playSound`, `damagePlayer`, `triggerScreenShake`.

**Effort:** Medium (state machine logic is self-contained, but boss attacks reference many game loop variables)
**Priority:** Should-do (reduces game3d.js by ~400 lines and isolates the most frequently-changed subsystem)

---

### A5: Plateau/shrine/totem/gem systems are inline closures

**Current problem:**
Lines 996-1711 contain world object generation systems:
- **Plateaus** (lines 996-1250): `buildPlateauMeshes`, `generatePlatforms`, `unloadPlatforms`, `updatePlatformChunks` -- 254 lines
- **Shrines** (lines 1318-1390): `createShrineMesh`, `generateShrines` (no-op), `unloadShrines` (no-op) -- 72 lines
- **Map gems** (lines 1392-1473): `createMapGem`, `generateMapGems`, `unloadMapGems` -- 81 lines
- **Totems** (lines 1475-1510): `createTotemMesh` -- 35 lines
- **Charge shrines** (lines 1512-1665): `rollChargeShrineRarity`, `createChargeShrineMesh` -- 153 lines
- **Challenge shrines** (lines 1667-1711): inline mesh construction -- 44 lines

Total: ~700 lines of world object construction and chunk lifecycle management.

These functions depend on `scene` (for Three.js mesh operations), `terrainHeight` (for placement), `noise2D` (for procedural generation), and write to `st.shrines`, `st.totems`, `st.chargeShrines`, `st.challengeShrines`, `st.mapGems`, and local arrays (`platforms`, `platformsByChunk`, `mapGemsByChunk`).

**Impact:**
- These are creation-time-only functions; they run at game start or during chunk loading and are never called from the game loop's hot path.
- They clutter the top of `launch3DGame` where a developer scanning for runtime logic must skip past them.

**Proposed solution:**
Create `js/3d/world-objects.js` exporting:
- `createWorldObjectState()` -- returns platforms/platformsByChunk/mapGemsByChunk tracking objects
- `buildPlateauMeshes(scene, ...)`, `generatePlatforms(scene, state, ...)`, `unloadPlatforms(...)`
- `createShrineMesh(scene, x, z)`, `createTotemMesh(scene, x, z)`, `createChargeShrineMesh(scene, ...)`
- `generateMapGems(scene, state, ...)`, `unloadMapGems(scene, state, ...)`
- `updatePlatformChunks(scene, state, px, pz)` -- unified chunk lifecycle

The `terrain.js` module already demonstrates this pattern with `createTerrainState()`.

**Effort:** Medium (functions are self-contained but reference several local arrays that need to be bundled into a state object)
**Priority:** Should-do (700 lines of one-time setup code extracted cleans up the file significantly)

---

### A6: The `st` object is a 200-property god-object

**Current problem:**
The `st` object (lines 281-479) is initialized with approximately 200 properties spanning every subsystem: player stats, position, score, wave timers, XP, entity arrays, powerup flags (18 booleans), item slots (25+ properties), wearable state, UI state, weapon slots, howl stacks, shrine/totem state, augments, charge shrine state, challenge shrine state, floating texts, leaderboard, kill tracking, feedback state, boss state, death sequence state, FPS debug, screen shake, and more.

Every function inside `launch3DGame` reads and writes `st` directly. There are no access boundaries.

**Impact:**
- It is impossible to know which functions touch which parts of `st` without reading them line by line.
- Adding a new subsystem means adding more properties to the same flat namespace, increasing the risk of naming collisions.
- The object is too large to comprehend at a glance (the initialization alone is 200 lines).

**Proposed solution:**
Reorganize `st` into nested sub-objects by subsystem:

```javascript
const st = {
  player: { hp, maxHp, speed, x, y, z, vy, ... },
  combat: { attackTimer, attackDamage, attackRange, invincible, ... },
  items: { armor, glasses, boots, ring, ... },
  powerups: { active, jumpBoost, dmgBoost, flying, ... },
  weapons: { slots: [], maxSlots, projectiles: [], effects: [], ... },
  howls: { power: 0, haste: 0, ... },
  wave: { current, timer, warning, active, ... },
  world: { shrines: [], totems: [], chargeShrines: [], ... },
  ui: { gameOver, paused, upgradeMenu, pauseMenu, ... },
  stats: { score, xp, level, kills, killsByTier, gameTime, ... },
};
```

This is a large refactor because every `st.hp` would become `st.player.hp`. However, it can be done incrementally: start with one subsystem (e.g., move all powerup booleans into `st.powerups`), then proceed to others.

**Effort:** Large (touches nearly every line in game3d.js)
**Priority:** Nice-to-have (high effort, moderate benefit; the current flat structure works, it just lacks organization)

---

### A7: The game loop (tick) is a 1,300-line monolith

**Current problem:**
The `tick()` function (lines 4646-7908) is approximately 3,260 lines and runs every animation frame. It contains:
- Delta time calculation and death sequence time scaling (lines 4646-4680)
- Pause/death guard (lines 4681-4690)
- Player input processing and movement (lines 4691-4780)
- Jumping, gravity, platform collision (lines 4781-4860)
- Ground collision and map boundary clamping (lines 4861-4920)
- Death sequence animation and game-over trigger (lines 4921-5000)
- Player hurt flash update (lines 5001-5060)
- Active powerup timer and removal (lines 5061-5200)
- All 18 powerup effect updates (fire aura, frost nova, ghost form, etc.) (lines 5201-5600)
- Weapon auto-fire and update calls (lines 5601-5650)
- Ambient/wave spawning (lines 5651-5800)
- Chunk loading (lines 5801-5830)
- Enemy AI loop (chase, jump, animate, contact damage, merge, despawn) (lines 5831-6400)
- Auto-attack and power attack logic (lines 6401-6600)
- Attack line decay (lines 6601-6630)
- Projectile updates (lines 6631-6680)
- XP gem collection and level-up (lines 6681-6800)
- Crate/item/wearable interaction (lines 6801-7000)
- Shrine/totem/charge-shrine interaction (lines 7001-7200)
- Boss entrance sequence (lines 7201-7350)
- Floating text updates (lines 7351-7400)
- Time-of-day lighting (lines 7401-7450)
- Wind animation on canopies (lines 7451-7480)
- Shrine/totem visual animation (lines 7481-7550)
- Camera follow (lines 7551-7600)
- Screen shake (lines 7601-7630)
- Player animation (delegated to player-model.js) (lines 7631-7650)
- Three.js render call (lines 7651-7660)
- HUD draw call (delegated to hud.js) (lines 7661-7908)

**Impact:**
- A developer looking for "how does XP collection work" must scan through 3,000+ lines of unrelated per-frame logic.
- The function cannot be tested in isolation; it depends on the entire closure context.
- Performance profiling is difficult because the function is one undifferentiated blob.

**Proposed solution:**
Split the game loop into named sub-functions that are called sequentially from `tick()`:

```javascript
function tick() {
  const dt = getDeltaTime();
  if (st.paused) { renderFrame(); return; }

  updatePlayerInput(dt);
  updatePlayerPhysics(dt);
  updateDeathSequence(dt);
  updatePowerups(dt);
  updateWeapons(dt);        // already exists, just call it
  updateSpawning(dt);
  updateChunks();
  updateEnemies(dt);
  updateCombat(dt);
  updateProjectiles(dt);
  updateCollection(dt);     // XP gems, items, crates
  updateWorldInteraction(dt); // shrines, totems
  updateBossEntrance(dt);
  updateVisuals(dt);        // floating texts, time-of-day, wind, animations
  updateCamera(dt);
  renderFrame();
}
```

These sub-functions would still be closures inside `launch3DGame` (accessing `st`, `scene`, etc.), but each would be 50-200 lines instead of 3,000. This is a refactor that improves readability without changing module boundaries.

**Effort:** Medium (mechanical extraction, no API changes)
**Priority:** Must-do (the 3,260-line function is the single biggest readability issue)

---

### A8: renderer.js is 4,599 lines with no sub-modules

**Current problem:**
`js/renderer.js` (4,599 lines) contains all 2D canvas drawing functions for the Classic mode. It exports 35 functions, including:
- Character drawing: `drawLeopard` (500+ lines covering 4 animal species x 3 visual modes + 9 powerup overlays), `drawZombie`, `drawBoss`, `drawAlly`
- Background drawing: `drawBackground`
- 16 pickup/crate drawing functions (one pair per item type)
- Effects: `drawParticles`, `drawFloatingTexts`, `drawProjectiles`
- HUD: `drawHUD`
- 10 screen overlay functions: `drawTitleScreen`, `drawGameOver`, `drawSelectScreen`, etc.

**Impact:**
- At 4,599 lines, it is the second-largest file. However, since the 2D mode is feature-complete and unlikely to receive significant new content, the practical merge conflict risk is low.
- The file is read-only in nature (pure drawing functions with no state mutation), which limits the damage of its size.

**Proposed solution:**
Split into sub-modules if the 2D mode sees active development:
- `js/2d/characters.js` -- `drawLeopard`, `drawZombie`, `drawBoss`, `drawAlly`
- `js/2d/screens.js` -- title, select, difficulty, game-over, level-complete, etc.
- `js/2d/hud.js` -- `drawHUD`
- `js/2d/world.js` -- `drawBackground`, pickup/crate drawing

**Effort:** Medium (many functions, but each is self-contained)
**Priority:** Nice-to-have (2D mode is stable; the file is large but low-churn)

---

### A9: 2D mode uses module-level mutable singletons (state.js)

**Current problem:**
`js/state.js` exports `state` and `player` as mutable singleton objects. Every 2D module imports and directly mutates them:
- `js/game.js` reads/writes `state.gameState`, `player.hp`, etc.
- `js/enemies.js` writes `player.hp`, `state.screenShake`, `state.zombies`
- `js/items.js` writes `player.items`, `state.armorPickups`, etc.
- `js/renderer.js` reads `state` and `player` for rendering

This is a classic shared mutable state pattern. By contrast, the 3D mode uses closure-scoped state (`st`) inside `launch3DGame`, avoiding this problem.

**Impact:**
- State changes are invisible at the call site; any module can mutate any property at any time.
- Reset between runs requires manually re-initializing every property (which `initLevel` in `game.js` partially does, but may miss newly added properties).
- However, the 2D mode is small enough (6 files, ~7,500 total lines) that this pattern is manageable.

**Proposed solution:**
Wrap `state` and `player` in a factory function that returns fresh objects, and pass them as parameters rather than importing globals. This matches the 3D mode's pattern.

However, this would require changing every import across all 2D modules, which is invasive for a stable system.

**Effort:** Medium
**Priority:** Nice-to-have (the 2D mode works and is not actively growing)

---

### A10: Duplicate patterns in items.js (crate/pickup boilerplate)

**Current problem:**
`js/items.js` (568 lines) contains 7 spawn functions and 8 update functions for different item types (health, powerup crates, armor, glasses, cowboy boots, soccer cleats, horse). Each crate/pickup pair follows an identical pattern:
1. Spawn: check level requirements, check existing ownership, create crate at a fixed level percentage
2. Update: bob animation, proximity check, E-key equip, particle effects, score award, key consume

The code for `updateSneakersPickups` (lines 391-423) and `updateCleatsPickups` (lines 467-498) are nearly identical, differing only in which `player.items` flag is set and which discard message is shown.

**Impact:**
- Adding a new equipment type requires copy-pasting 60-80 lines of boilerplate.
- Bug fixes (e.g., changing the equip radius) must be applied to 5+ nearly-identical functions.

**Proposed solution:**
Create a generic `createEquipmentCrate(config)` and `updateEquipmentPickup(config)` function that takes a configuration object:

```javascript
const EQUIPMENT_DEFS = {
  armor: { levelPct: 0.40, slot: 'armor', size: 28, ... },
  glasses: { levelPct: 0.25, slot: 'glasses', size: 28, ... },
  cowboyBoots: { levelPct: 0.55, slot: 'boots', size: 28, footwear: true, ... },
  soccerCleats: { levelPct: 0.65, slot: 'boots', size: 28, footwear: true, ... },
  horse: { levelPct: 0.30, slot: 'horse', size: 32, prereq: 'cowboyBoots', ... },
};
```

This would reduce items.js from 568 to roughly 200-250 lines.

**Effort:** Small
**Priority:** Nice-to-have (the 2D mode is stable; this is a code quality improvement, not a maintainability bottleneck)

---

### A11: The already-extracted modules are well-structured

**Current state:**
The 6 modules under `js/3d/` are excellent examples of well-bounded modules:

- **`constants.js`** (856 lines): Pure data, no imports, no runtime mutation. Layer 0. No issues.
- **`utils.js`** (85 lines): Geometry/material caches + `box()` helper. Clean API with `clearCaches()` for disposal. No issues.
- **`terrain.js`** (827 lines): Self-contained chunk lifecycle with `TerrainState` pattern. Exports pure functions + stateful management functions. Clean separation. No issues.
- **`player-model.js`** (902 lines): Model construction, animation, muscle growth, item visuals, wearable visuals. Read-only (reads game state, writes only to Three.js objects). Well-documented typedefs. No issues.
- **`hud.js`** (1,522 lines): Single export (`drawHUD`), read-only. At 1,522 lines it could be split, but it is a single coherent drawing function with no state mutation. Acceptable as-is.
- **`audio.js`** (445 lines): Zero game dependencies. Clean public API (init, play, volume, mute, dispose). Fail-silent design. No issues.

These modules demonstrate that the extraction pattern works and should be replicated for the remaining subsystems in `game3d.js`.

**Priority:** No action needed -- these are positive examples.

---

### A12: No circular dependencies detected

**Current state:**
The dependency graph is strictly acyclic:
- Layer 0: `constants.js`, `utils.js`, `audio.js` (no game imports)
- Layer 1: `terrain.js`, `player-model.js`, `hud.js` (import only Layer 0)
- Layer 2: `game3d.js` (imports all of the above)
- 2D side: `state.js` -> `enemies.js`, `items.js`, `utils.js`, `levels.js` -> `game.js` -> `renderer.js`

There is one potential concern: `items.js` imports `spawnAlly` from `enemies.js`, and `enemies.js` imports from `state.js` and `utils.js`. This is a one-way dependency (items -> enemies), not circular.

**Priority:** No action needed.

---

## 3. Priority Summary

### Must-do

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| A1 | Extract subsystems from game3d.js (umbrella) | Large | Unblocks all other 3D refactoring |
| A2 | Extract enemy model to `js/3d/enemy-model.js` | Small | Lowest-risk first extraction |
| A7 | Split tick() into named sub-functions | Medium | Readability of the game loop |

### Should-do

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| A3 | Extract weapon system to `js/3d/weapons.js` | Medium | 1,200 lines removed from game3d.js |
| A4 | Extract enemy AI to `js/3d/enemy-ai.js` | Medium | 380 lines removed, isolates frequent changes |
| A5 | Extract world objects to `js/3d/world-objects.js` | Medium | 700 lines of setup code removed |

### Nice-to-have

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| A6 | Restructure `st` into nested sub-objects | Large | Better organization but high effort |
| A8 | Split renderer.js into 2D sub-modules | Medium | Low churn file, low practical benefit |
| A9 | Replace 2D mutable singletons with factory pattern | Medium | 2D mode is stable, not worth the disruption |
| A10 | Deduplicate items.js crate/pickup boilerplate | Small | Code quality improvement, not urgent |

### Recommended execution order

1. **A2** (enemy-model extraction) -- Small, low-risk, proves the pattern
2. **A7** (split tick into sub-functions) -- Medium, immediate readability win
3. **A3** (weapon system extraction) -- Medium, largest single reduction
4. **A5** (world objects extraction) -- Medium, cleans up initialization
5. **A4** (enemy AI extraction) -- Medium, isolates the most volatile code
6. **A6** (st restructuring) -- Large, only if the above extractions create enough momentum

This order follows the principle of "easiest win first, largest payoff second, highest-risk last."

### What is NOT worth refactoring

- **`hud.js`** at 1,522 lines: It is a single pure drawing function. Splitting it into sub-functions would add complexity without meaningful benefit.
- **`constants.js`** at 856 lines: Pure data. Large but completely inert. No benefit to splitting.
- **The 2D mode generally**: With ~7,500 total lines across 6 files and no planned feature growth, the 2D architecture is adequate for its scope. Refactoring it would be effort spent on a stable, finished system.
- **The closure architecture itself**: The pattern of having all state local to `launch3DGame` is a sound choice that prevents stale state bugs. The goal is not to eliminate the closure but to extract pure/semi-pure subsystems out of it while keeping the state ownership clear.
