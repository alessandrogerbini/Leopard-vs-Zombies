# Documentation Plan -- Phase 2: Modular Deep Dives

**Date:** 2026-02-22
**Scope:** Complete documentation coverage for the Leopard vs Zombies codebase (~10,136 LOC across 8 JS files + index.html)
**Input:** documentation-audit-1.md (Phase 1 audit findings)

---

## Overview & Goals

### Objective
Transform the codebase from 0% JSDoc coverage and sparse inline comments to a fully documented project where any new developer or AI agent can:
1. Understand the architecture without reading every line of code
2. Locate any system (weapons, enemies, rendering, etc.) within seconds
3. Add new features (weapons, powerups, items, enemies) by following documented extension patterns
4. Use IDE tooling (autocomplete, hover docs) via JSDoc annotations on all 155 functions

### Success Metrics
- 100% of exported functions have JSDoc with `@param`, `@returns`, and `@description`
- Every JS file has a module-level header comment (purpose, exports summary, dependencies)
- State object schemas (`st` in game3d.js, `state`/`player` in state.js) fully documented with property descriptions
- All major constants (WEAPON_TYPES, POWERUPS_3D, ITEMS_3D, SHRINE_AUGMENTS, etc.) have inline annotations
- Project-level docs (README, ARCHITECTURE) exist and are accurate

### What This Plan Does NOT Cover
- TypeScript migration or `.d.ts` generation (future phase)
- Automated doc generation tooling (JSDoc site, etc.)
- Test coverage documentation (no tests exist)
- CHANGELOG.md (requires version history not present in repo)

---

## Conventions & Standards (All Agents Must Follow)

### JSDoc Format

Every function must use this exact format:

```javascript
/**
 * Brief one-line description of what the function does.
 *
 * Longer explanation if the function is complex (>20 lines), describing
 * algorithm, side effects, or non-obvious behavior.
 *
 * @param {type} name - Description of parameter.
 * @param {type} [optionalName] - Description (square brackets = optional).
 * @returns {type} Description of return value.
 */
```

Rules:
- Use `@param` for every parameter, even if the name is obvious
- Use `@returns` for every function that returns a value (omit for void)
- Use `@description` only if a separate description block is needed beyond the opening line
- Use `@see` to cross-reference related functions (e.g., `@see fireWeapon` from `updateWeapons`)
- Use `@example` only for non-obvious usage patterns
- Primitive types: `{number}`, `{string}`, `{boolean}`
- Object types: `{Object}` with `@param {Object} opts` then `@param {string} opts.name` for properties
- Array types: `{Array<Enemy>}`, `{number[]}`
- Reference types: Use capitalized names matching the codebase (e.g., `{Enemy}`, `{Weapon}`, `{XpGem}`)
- Function types: `{Function}`, or `{(x: number) => void}` for specific signatures

### Module Header Format

Every JS file must begin with a header block in this format:

```javascript
/**
 * @module moduleName
 * @description One paragraph explaining this module's purpose and role in the game.
 *
 * Dependencies: list of imported modules
 * Exports: count and summary of exported symbols
 *
 * Key concepts:
 * - Bullet point explaining a major concept this module owns
 * - Another concept
 */
```

### Inline Comment Standards

- Use `// ---` section dividers only within functions longer than 50 lines
- Existing section headers (e.g., `// === PLAYER INPUT ===`) must be preserved as-is
- Add `// NOTE:` prefix for non-obvious design decisions
- Add `// PERF:` prefix for performance-sensitive code
- Do NOT add comments that merely restate the code (e.g., `// increment x` above `x++`)
- Preserve all existing comments exactly -- only add, never remove

### State Object Documentation

For complex state objects (`st`, `state`, `player`), document using a block comment directly above the object declaration:

```javascript
/**
 * Game state for 3D Roguelike Survivor mode.
 *
 * @typedef {Object} State3D
 * @property {number} hp - Current player hit points.
 * @property {number} maxHp - Maximum player hit points (scaled by animal + difficulty).
 * ...
 */
const st = { ... };
```

### File Naming for New Documentation Files

All new documentation files go in the project root:
- `README.md` -- project overview, how to play, how to run
- `ARCHITECTURE.md` -- system design, data flow, module graph
- `CONTRIBUTING.md` -- development workflow, extension guides

No new files inside `js/` -- all code documentation is inline (JSDoc + comments).

### Conflict Avoidance

- Each agent is assigned **exclusive files**. No two agents edit the same file.
- The one exception is `ARCHITECTURE.md`, which Agent E writes but Agents A-D provide input fragments for (see Integration Plan).
- Agents must not reformat or restructure existing code -- documentation only.
- Agents must not change variable names, function signatures, or control flow.

---

## Agent Assignments

### Agent A: State, Utilities, and Level Definitions

**Scope:** `js/state.js` (138 lines), `js/utils.js` (57 lines), `js/levels.js` (117 lines)
**Total: 312 lines across 3 files**

**Deliverables:**
1. **`js/state.js`** -- Full documentation
   - Module header comment
   - `@typedef` block for the `state` object (32 properties)
   - `@typedef` block for the `player` object (30+ properties including nested `powerups` and `items`)
   - Inline descriptions for every constant: `GRAVITY`, `GROUND_Y`, `BASE_PLAYER_W`, `BASE_PLAYER_H`, `DRAW_SCALE`
   - Inline descriptions for `DIFFICULTY_SETTINGS` (3 entries), `ANIMAL_TYPES` (4 entries)
   - Inline descriptions for `POWERUP_TYPES` (7 entries), `POWERUP_DURATION`, `POWERUP_AMMO`
   - Inline descriptions for `ARMOR_TYPES` (2 entries), `GLASSES_TYPE`, `SNEAKERS_TYPE`, `CLEATS_TYPE`, `HORSE_TYPE`
   - Description of the `keys` object (keyboard input state)
   - Description of `camera` object

2. **`js/utils.js`** -- Full JSDoc for all 8 exported functions:
   - `rectCollide(a, b)` -- collision detection, coordinate system, return type
   - `getAttackBox()` -- returns hitbox based on player facing + cowboy boots modifier
   - `spawnParticles(x, y, color, count, spread)` -- particle system entry point
   - `spawnFloatingText(x, y, text, color)` -- floating damage/status text
   - `getPlayerDamage()` -- damage calculation with combo and powerup modifiers
   - `getPlayerCooldown()` -- attack cooldown with super fangs modifier
   - `getPlayerJumpForce()` -- jump force with jumpy boots modifier
   - `addScore(points)` -- score with difficulty multiplier
   - Module header comment

3. **`js/levels.js`** -- Full documentation
   - Module header comment
   - JSDoc for `getLevelData(level)` (1 exported function) with return type documentation
   - JSDoc for 3 internal helper functions: `generateTrees(width)`, `generateHighway(width)`, `generateIceFeatures(width)`
   - `@typedef` for the level data object schema (width, name, bgColor, groundColor, zombieCount, zombieHp, zombieSpeed, platforms, trees/highway/iceFeatures)
   - Inline comments explaining platform placement patterns

**Functions to document:** 12 (8 exported from utils, 1 exported + 3 internal from levels, 0 from state)
**Constants/objects to document:** ~20 exported constants and 2 major object schemas
**Acceptance criteria:**
- Every exported symbol has a JSDoc block
- `state` and `player` typedefs have descriptions for every property
- All constant arrays/objects have a header comment explaining their purpose
- IDE hover over any import from these files shows useful documentation

**Can run in parallel with:** Agents B, C, D, E (no file overlap)
**Blocked by:** Nothing
**Estimated complexity:** Light (312 lines, mostly declarative data, straightforward functions)

---

### Agent B: Enemies and Items (2D Combat Modules)

**Scope:** `js/enemies.js` (584 lines), `js/items.js` (351 lines)
**Total: 935 lines across 2 files**

**Deliverables:**
1. **`js/enemies.js`** -- Full JSDoc for all 6 exported functions:
   - `spawnZombies()` -- creates zombie array from level data, big/normal type assignment
   - `spawnBoss()` -- creates boss object with full attack system (skull, AOE, mortar, charge)
   - `updateZombieAI()` -- zombie chase/attack/physics loop, distance-based behavior
   - `updateBossAI()` -- boss AI with phase system, telegraph attacks, cooldowns, movement
   - `spawnAlly(type, x, y, invulnerable)` -- ally creation (horse type)
   - `updateAllyAI()` -- ally follow/chase/attack/damage/respawn AI
   - Module header comment
   - `@typedef` for Zombie object (x, y, w, h, vx, vy, hp, maxHp, speed, type, alive, etc.)
   - `@typedef` for Boss object (22+ properties including attack cooldowns and telegraph states)
   - `@typedef` for Ally object (all properties including respawn system)
   - Inline comments for boss attack priority system (lines 229-265) -- distance ranges, cooldown logic
   - Inline comments for boss telegraph countdown system (lines 157-227)

2. **`js/items.js`** -- Full JSDoc for all 15 exported functions:
   - Spawn functions (7): `spawnHealthPickups()`, `spawnPowerupCrates()`, `spawnArmorCrates()`, `spawnGlassesCrates()`, `spawnSneakersCrates()`, `spawnCleatsCrates()`, `spawnHorseCrates()`
   - Update functions (8): `updateHealthPickups()`, `updateDiamond()`, `updatePortal()`, `updateArmorPickups()`, `updateGlassesPickups()`, `updateSneakersPickups()`, `updateCleatsPickups()`, `updateHorsePickups()`
   - Module header comment
   - Document the crate placement system (25%, 30%, 40%, 55%, 65% level width distribution)
   - Document the equipment slot system (footwear mutual exclusion, armor tiers)
   - Document the interact-with-E-key pattern used by all pickup update functions
   - `@typedef` for HealthPickup, PowerupCrate, ArmorCrate, ArmorPickup objects

**Functions to document:** 21 (6 from enemies, 15 from items)
**Object schemas to document:** 6+ (Zombie, Boss, Ally, HealthPickup, PowerupCrate, ArmorPickup, etc.)
**Acceptance criteria:**
- Every exported function has JSDoc with @param and @returns
- Boss AI telegraph system has clear inline comments explaining the state machine
- Equipment slot system (footwear exclusion) documented with a block comment
- Crate spawn location percentages documented

**Can run in parallel with:** Agents A, C, D, E (no file overlap)
**Blocked by:** Nothing
**Estimated complexity:** Medium (935 lines, complex AI logic in boss and ally systems)

---

### Agent C: 2D Game Loop and Renderer

**Scope:** `js/game.js` (1,008 lines), `js/renderer.js` (4,262 lines)
**Total: 5,270 lines across 2 files**

**Deliverables:**
1. **`js/game.js`** -- Full documentation of 8 internal functions + module structure:
   - Module header comment (entry point, mode launcher, game loop owner)
   - `loadLeaderboard(difficulty)` -- localStorage persistence per difficulty
   - `saveScore()` -- score saving with sorting and top-10 truncation
   - `initLevel(level)` -- level initialization: state reset, spawn calls, ally management
   - `update()` -- main 2D update function documenting:
     - Pause toggle (ESC key logic)
     - State machine transitions: title -> modeSelect -> difficulty -> select -> playing -> bossIntro -> bossFight -> levelComplete -> gameWin / gameOver
     - Player physics (gravity, ground/platform collision, knockback)
     - Player attack logic (melee hit detection, combo system, powerup effects)
     - Powerup activation/deactivation flow
     - Boss fight trigger conditions
     - Death/lives system
     - Camera follow logic
   - `draw()` -- draw order documentation (background -> items -> enemies -> player -> effects -> HUD -> overlays)
   - `gameLoop()`, `stopGameLoop()`, `startGameLoop()` -- RAF loop management
   - Document the 3D mode launch integration (how `launch3DGame()` is called from modeSelect with stopGameLoop/startGameLoop callbacks)
   - Document input system (keydown/keyup handlers, name entry special handling)

2. **`js/renderer.js`** -- Module header + JSDoc for all 33 exported functions, organized by category:

   **Category: Character Drawing (lines 1-1099)**
   - `initRenderer(c)` -- canvas setup
   - `getCtx()` -- context accessor
   - `drawLeopard(x, y)` -- player character with all powerup visual states (race car: lines 36-230, banana cannon, wings, litter box, base forms)
   - `drawZombie(z)` -- zombie rendering (normal + big variants)
   - `drawBoss()` -- boss rendering with phase visuals and telegraph indicators
   - `drawAlly(ally)` -- ally rendering (horse type)

   **Category: World Drawing (lines 1100-1273)**
   - `drawBackground()` -- parallax background, level-specific themes (forest/highway/ice), ground, platforms

   **Category: Pickup/Crate Drawing (lines 1274-1873)**
   - 16 functions for health pickups, powerup crates, armor crates/pickups, glasses crates/pickups, sneakers crates/pickups, cleats crates/pickups, horse crates/pickups, portal, diamond

   **Category: Effects (lines 1936-2106)**
   - `drawParticles()`, `drawFloatingTexts()`, `drawProjectiles()`

   **Category: HUD/UI (lines 2107-2228)**
   - `drawHUD()` -- health bar, score, combo, powerup timers, item indicators

   **Category: Screen Overlays (lines 2229-4254)**
   - `drawDying()`, `drawBossIntro()`, `drawTitleScreen()`, `drawLevelComplete()`, `drawGameWin()`, `drawGameOver()`, `drawModeSelectScreen()`, `drawDifficultyScreen()`, `drawSelectScreen()`, `drawPaused()`

   For renderer.js, documentation priority is:
   - **Full JSDoc** on every exported function (even single-line ones)
   - **Category headers** grouping related functions (block comments between groups)
   - **Detailed inline comments** only for `drawLeopard` (835 lines, most complex), `drawBoss`, `drawBossIntro`, and `drawBackground`
   - **Brief JSDoc** (one-liner + @param) for the 16 repetitive crate/pickup draw functions

**Functions to document:** 41 (8 in game.js, 33 in renderer.js)
**Acceptance criteria:**
- game.js state machine is documented with a complete state transition diagram in a block comment
- game.js update() has section-level comments for each major subsystem
- renderer.js has category grouping comments separating the 6 functional areas
- Every exported renderer function has at minimum a one-line JSDoc description
- drawLeopard's powerup visual branches are labeled with what they draw
- draw() call order is documented

**Can run in parallel with:** Agents A, B, D, E (no file overlap)
**Blocked by:** Nothing
**Estimated complexity:** Heavy (5,270 lines; renderer.js is the largest file at 4,262 lines, but most functions are self-contained drawing code with repetitive patterns)

---

### Agent D: 3D Roguelike Mode (game3d.js)

**Scope:** `js/game3d.js` (3,619 lines) -- the entire file
**Total: 3,619 lines, 1 file**

**Deliverables:**
1. **Module header comment** explaining:
   - Single exported function `launch3DGame(options)` architecture (closure-based module pattern)
   - Three.js + HUD canvas dual-rendering approach
   - Chunk-based infinite terrain system
   - Overview of all subsystems contained within

2. **JSDoc for `launch3DGame(options)`** -- the sole export:
   - `@param {Object} options`
   - `@param {Function} options.onReturn` -- callback to return to 2D menu
   - `@param {Object} options.animal` -- animal selection data
   - `@param {Object} options.difficulty` -- difficulty multipliers

3. **`@typedef` for the `st` state object** (lines 147-262, ~80 properties):
   - Group properties by subsystem with inline section comments
   - Player stats, position, movement
   - Wave/spawn system
   - XP/leveling
   - Active powerup state (15+ boolean flags)
   - Items (permanent equipment)
   - UI state
   - Auto-attack + power attack
   - Weapon slots + scrolls
   - Shrines + augments
   - Difficulty totems
   - Kill tracking

4. **JSDoc for all 56 internal functions**, organized by section:

   **Constants & Definitions (lines 1-120):** Document inline:
   - `ANIMAL_PALETTES` (4 entries)
   - `WEAPON_TYPES` (6 weapons with stats and level descriptions)
   - `SCROLL_TYPES` (6 scroll types)
   - `POWERUPS_3D` (18 powerup definitions with apply/remove functions)
   - `ITEMS_3D` (11 item definitions)
   - `SHRINE_AUGMENTS` (8 augment types)
   - `TOTEM_EFFECT` (5 multipliers)

   **Input (lines 294-393, 2 functions):**
   - `onKeyDown(e)` -- keyboard + gamepad input mapping, upgrade menu navigation, pause toggle
   - `onKeyUp(e)` -- key release handling, power attack release trigger

   **Scene Setup (lines 377-448):**
   - `onResize()` -- responsive canvas/renderer/camera resize

   **Terrain System (lines 449-688, 8 functions):**
   - `noise2D(x, z)` -- pseudo-random noise function
   - `smoothNoise(x, z, scale)` -- smoothed noise for terrain continuity
   - `terrainHeight(x, z)` -- terrain Y-value from noise
   - `getBiome(x, z)` -- biome selection (forest/desert/plains)
   - `getChunkKey(cx, cz)` -- chunk coordinate to string key
   - `generateChunk(cx, cz)` -- procedural chunk with biome-specific decorations
   - `unloadChunk(cx, cz)` -- Three.js object cleanup for unloaded chunks
   - `updateChunks(px, pz)` -- chunk loading/unloading around player

   **Platform System (lines 606-688, 3 functions):**
   - `generatePlatforms(cx, cz)` -- elevated platform generation per chunk
   - `unloadPlatforms(cx, cz)` -- platform cleanup
   - `updatePlatformChunks(px, pz)` -- platform chunk management

   **Shrine System (lines 689-738, 3 functions):**
   - `createShrineMesh(x, z)` -- Three.js shrine model construction
   - `generateShrines(cx, cz)` -- chunk-based shrine spawning (30% chance)
   - `unloadShrines(cx, cz)` -- shrine cleanup

   **Totem System (lines 739-785, 1 function):**
   - `createTotemMesh(x, z)` -- difficulty totem model with skull decoration

   **Player Model (lines 786-1091, documented inline):**
   - `box(group, w, h, d, color, x, y, z, shadow)` -- mesh creation helper
   - 4 animal model builders (leopard, redPanda, lion, gator) at lines 803-1037
   - Angel wings visual (lines 1038-1071)
   - Fire aura particles (lines 1072-1091)

   **Enemy System (lines 1092-1245, 2 functions):**
   - `createEnemy(x, z, baseHp, tier)` -- tier-based zombie with visual upgrades (10 tiers, spikes/crowns/horns)
   - `disposeEnemy(e)` -- Three.js cleanup for enemy objects

   **Pickup/Crate System (lines 1246-1327, 4 functions):**
   - `createXpGem(x, z)` -- XP gem mesh + data
   - `createPowerupCrate(x, z)` -- crate with random powerup
   - `createItemPickup(x, z)` -- item mesh with slot-based de-duplication
   - `findNearbyPlatform(x, maxDist)` -- nearest platform helper

   **Combat Utilities (lines 1328-1405, 3 functions + 5 scroll helpers):**
   - `createAttackLine(fx, fy, fz, tx, ty, tz)` -- visual attack indicator
   - `createProjectile(x, y, z, vx, vz)` -- banana cannon projectile
   - `getPlayerDmgMult()` -- level-based damage scaling
   - `getScrollDmgMult()`, `getScrollCdMult()`, `getScrollRangeMult()`, `getScrollBonusProj()`, `getScrollXpMult()` -- scroll stat calculations

   **Weapon System (lines 1406-1840, 12 functions):**
   - `getWeaponDamage(w)` -- per-weapon damage with level scaling
   - `getWeaponCooldown(w)` -- per-weapon cooldown with level scaling
   - `getWeaponRange(w)` -- per-weapon range with level scaling
   - `getProjectileCount(w)` -- projectile count with level bonuses
   - `getChainCount(w)` -- lightning chain count with level bonuses
   - `findNearestEnemy(range)` -- spatial enemy lookup
   - `killEnemy(e)` -- death sequence: XP gem drop, zombie drops (item/powerup/crate), score
   - `damageEnemy(e, dmg)` -- apply damage with augment multiplier, check kill
   - `fireWeapon(w)` -- weapon dispatch: clawSwipe, boneToss, poisonCloud, lightningBolt, fireball, boomerang (lines 1510-1697, 188 lines -- each weapon type as a branch)
   - `updateWeapons(dt)` -- cooldown tick + auto-fire
   - `updateWeaponProjectiles(dt)` -- projectile movement + collision + cleanup
   - `spawnExplosion(x, z, radius, dmg)` -- fireball explosion AoE
   - `disposeEffectMesh(mesh)` -- weapon effect cleanup
   - `updateWeaponEffects(dt)` -- visual effect lifecycle

   **Level Up System (lines 1840-1928, 1 function):**
   - `showUpgradeMenu()` -- upgrade pool construction (new weapons, weapon upgrades, scrolls, fallback heals), random selection of 3

   **Main Game Loop -- `tick()` (lines 1948-3139, ~1,191 lines):**
   - This is the most critical function. Document with section-level block comments for each subsystem:
     - Player input + movement (lines 1958-1977)
     - Jumping + gravity + platform collision (lines 1978-2173)
     - Active powerup timer (lines 2174-2182)
     - 15 powerup effect subsystems (lines 2183-2556, each with their own `=== HEADER ===`)
     - Weapon auto-fire trigger (lines 2557-2561)
     - Ambient + wave spawning (lines 2562-2592)
     - Terrain chunk updates (lines 2593-2600)
     - Enemy AI (chase, attack, damage, freeze, poison, physics) (lines 2601-2710)
     - Zombie-zombie merge system (lines 2711-2759)
     - Auto-attack system (lines 2760-2799)
     - Power attack charge/release (lines 2800-2867)
     - Attack lines, projectiles, XP gems (lines 2868-2934)
     - Powerup crates, item pickups (lines 2935-3015)
     - Shrines + totems (lines 3016-3092)
     - Floating texts, augment regen, shield bracelet (lines 3084-3119)
     - Camera follow (lines 3120-3139)

   **HUD Drawing -- `drawHUD(ctx, s)` (lines 3141-3574, 433 lines):**
   - Document major HUD sections: HP bar, weapon slots, scroll counts, augment display, powerup timer, minimap, XP bar, wave info, score, kill tracker, game over screen, leaderboard, upgrade menu, pause menu

   **Cleanup -- `cleanup()` (lines 3576-3618):**
   - Document the disposal sequence for all Three.js resources

5. **Architecture fragment** (delivered as a comment block at top of file, also provided to Agent E for ARCHITECTURE.md):
   - Diagram of game3d.js subsystem relationships
   - Data flow: input -> tick() -> update subsystems -> render (Three.js + HUD)

**Functions to document:** 56+ internal functions + 1 exported
**Constants to document:** 7 major constant blocks
**State properties to document:** ~80 in `st` object
**Acceptance criteria:**
- Every internal function has JSDoc
- The `st` state object has a complete `@typedef` with all ~80 properties described
- `tick()` has section-level documentation for each of its ~20 subsystems
- `fireWeapon()` has per-weapon-type branch comments
- `drawHUD()` has section-level comments for each HUD element
- All 7 constant blocks have descriptions for each entry
- Section headers (`// === ... ===`) are all preserved and supplemented with block comments where needed

**Can run in parallel with:** Agents A, B, C, E (no file overlap)
**Blocked by:** Nothing
**Estimated complexity:** Heavy (3,619 lines, most complex file, 56 functions, massive tick() and drawHUD() functions, 80-property state object)

---

### Agent E: Project-Level Documentation and Architecture

**Scope:** New files only: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `index.html` (minor inline comments)
**Total: ~3 new documentation files + minor edit to index.html**

**Deliverables:**
1. **`README.md`** -- Project overview and player guide:
   - Game title and one-paragraph description
   - How to run locally (open index.html, or use a local server for ES modules)
   - Game modes: 2D Classic (3 levels + bosses) and 3D Roguelike Survivor (infinite, wave-based)
   - Controls table:
     - 2D: Arrow keys (move/jump), Z (attack), E (interact/equip), Enter (confirm), ESC (pause)
     - 3D: WASD (move), Space (jump), Enter (power attack charge/release), ESC (pause), Arrow keys (upgrade menu)
     - Gamepad support summary
   - Animal selection (4 animals with stat differences)
   - Difficulty modes (easy/medium/hard with HP and score multipliers)
   - Feature highlights (weapons, scrolls, powerups, items, shrines, totems, zombie tier merging)
   - Tech stack: vanilla JS, Three.js r128 (CDN), Canvas 2D, ES modules, localStorage for leaderboards

2. **`ARCHITECTURE.md`** -- Technical design document:
   - Module dependency graph (ASCII diagram):
     ```
     index.html
       -> game.js (entry point, 2D game loop)
            -> state.js (shared 2D state, constants)
            -> utils.js (collision, particles, scoring)
            -> levels.js (level data, terrain generators)
            -> enemies.js (zombie/boss/ally AI)
            -> items.js (pickups, crates, equipment)
            -> renderer.js (all 2D drawing)
            -> game3d.js (self-contained 3D mode)
     ```
   - File size and responsibility table
   - 2D Mode Architecture:
     - State machine diagram (title -> modeSelect -> difficulty -> select -> playing -> bossIntro -> bossFight -> levelComplete -> gameWin / gameOver, plus dying and paused states)
     - Game loop: update() -> draw() at 60fps via RAF
     - Data flow: keys{} -> update() -> state/player mutation -> draw() -> canvas
   - 3D Mode Architecture:
     - Closure-based module: `launch3DGame(options)` encapsulates all 3D state and logic
     - Dual canvas: Three.js WebGL canvas + HUD overlay canvas (pointer-events: none)
     - Chunk system: 16x16 chunks, loaded/unloaded around player (5-chunk radius)
     - Biome system: noise-based biome selection (forest/desert/plains)
     - Zombie tier system: 10 tiers, merge-on-collision mechanic
     - Weapon system: 6 weapon types, 4 slots, auto-fire, level scaling
     - Scroll system: 6 passive buff types with stacking levels
     - Shrine/augment system: destructible shrines per chunk, permanent stat buffs
     - Totem system: optional difficulty increase for XP/score bonus
     - Level-up system: choose 1 of 3 random upgrades (new weapons, weapon levels, scrolls)
     - Wave event system: ambient trickle + 4-minute burst waves
   - Rendering pipeline:
     - 2D: Canvas 2D context, camera-offset transforms, layered draw order
     - 3D: Three.js scene with DirectionalLight + AmbientLight, HUD canvas overlay
   - State management:
     - 2D: exported mutable singletons (`state`, `player`, `camera` from state.js)
     - 3D: local `st` object within launch3DGame closure (not shared)
   - Input handling: keydown/keyup event listeners, `keys{}` object, gamepad polling in 3D
   - Performance considerations: chunk loading/unloading, geometry disposal, throttled chunk updates

3. **`CONTRIBUTING.md`** -- Developer extension guide:
   - Development setup (local server requirement for ES modules)
   - Code style notes (no build step, vanilla JS, ES module imports)
   - How to add a new weapon (3D mode):
     1. Add entry to `WEAPON_TYPES` constant (line ~21)
     2. Add firing logic branch in `fireWeapon(w)` (line ~1510)
     3. Add projectile update logic in `updateWeaponProjectiles(dt)` if projectile-based (line ~1713)
     4. Weapon appears automatically in upgrade pool via `showUpgradeMenu()`
   - How to add a new powerup (3D mode):
     1. Add entry to `POWERUPS_3D` array with `apply`/`remove` callbacks (line ~64)
     2. Add boolean flag to `st` state object (line ~147)
     3. Add effect logic in `tick()` function (after line ~2183)
     4. Powerup appears automatically in crate drops
   - How to add a new item (3D mode):
     1. Add entry to `ITEMS_3D` array with slot name (line ~86)
     2. Add slot to `st.items` object (line ~209)
     3. Add stat application logic (check `st.items.xxx` in relevant calculations)
   - How to add a new enemy variant (2D):
     1. Add type check in `spawnZombies()` in enemies.js
     2. Add rendering branch in `drawZombie()` in renderer.js
   - How to add a new level (2D):
     1. Add level entry in `getLevelData()` in levels.js
     2. Add background theme in `drawBackground()` in renderer.js
     3. Adjust level progression logic in game.js update()

4. **`index.html`** -- Minor documentation:
   - Add HTML comment block at top explaining the canvas setup (game, game3d, hud3d)
   - Add comment explaining Three.js CDN dependency

**Functions to document:** 0 (project-level docs only)
**Files to create:** 3 (README.md, ARCHITECTURE.md, CONTRIBUTING.md)
**Files to edit:** 1 (index.html -- comments only)
**Acceptance criteria:**
- README includes working "how to run" instructions
- ARCHITECTURE module graph matches actual import structure
- ARCHITECTURE state machine diagram covers all gameState values found in code
- CONTRIBUTING extension guides reference actual line numbers and function names
- All three files are accurate to the current codebase (no stale references)

**Can run in parallel with:** Agents A, B, C, D (creates new files only, minimal index.html edit)
**Blocked by:** Partially depends on Agents A-D for accuracy. However, Agent E can work from source code directly. If Agents A-D complete first, Agent E should cross-reference their JSDoc for consistency. If running in parallel, Agent E works from the source directly and reconciles later.
**Estimated complexity:** Medium (no code to document, but requires synthesizing understanding of entire codebase into coherent prose)

---

## Execution Timeline (Parallel Tracks)

```
Time ------>

Track 1: [Agent A: state.js + utils.js + levels.js]  ████░░░░░░░░░░░░░░░░░░░░░
           312 lines, ~30 min                          DONE

Track 2: [Agent B: enemies.js + items.js]              ████████░░░░░░░░░░░░░░░░░
           935 lines, ~60 min                          DONE

Track 3: [Agent C: game.js + renderer.js]              ████████████████░░░░░░░░░
           5,270 lines, ~120 min                       DONE

Track 4: [Agent D: game3d.js]                          ████████████████████░░░░░
           3,619 lines, ~150 min                       DONE

Track 5: [Agent E: README + ARCH + CONTRIB]            ██████████████████████░░░
           New files, ~120 min                         DONE

                                                       ░░░░░░░░░░░░░░░░░░░░░████
                                                       INTEGRATION REVIEW (30 min)
```

All five agents can begin simultaneously. No blocking dependencies exist for starting work. Agent E benefits from reviewing A-D output but can draft independently from source.

---

## Integration Plan (How to Merge All Agent Outputs)

### Step 1: Parallel Execution
- All 5 agents work on their assigned files simultaneously
- No file overlap means no merge conflicts

### Step 2: Cross-Reference Check (After All Agents Complete)
A single review pass verifies:
1. **Import/export consistency**: If Agent A documents `rectCollide` as taking `{Object} a` with `{number} a.x, a.y, a.w, a.h`, do Agents B and C's JSDoc comments on calling functions match?
2. **Type name consistency**: All agents use the same typedef names (e.g., `{Zombie}` not `{ZombieObj}` or `{ZombieData}`)
3. **Cross-references work**: `@see` tags in Agent D's weapon docs point to functions that Agent D actually documented (all within game3d.js, so self-contained)
4. **ARCHITECTURE.md accuracy**: Agent E's architecture doc matches the actual function names and line numbers documented by Agents A-D

### Step 3: Integration Verification Checklist
Run these checks after all agents complete:
- [ ] Every JS file starts with a `@module` header comment
- [ ] `grep -c "@param" js/*.js` shows non-zero for every file
- [ ] No two `@typedef` blocks define the same type name differently
- [ ] README "how to run" instructions actually work
- [ ] CONTRIBUTING extension guides reference correct line numbers (may need updating if agents added lines)
- [ ] No merge conflicts in git (guaranteed by non-overlapping file assignments)

### Step 4: Line Number Reconciliation
Since Agents A-D add comment lines to source files, line numbers referenced in Agent E's CONTRIBUTING.md may shift. After Agents A-D complete:
1. Agent E (or a review pass) updates all line number references in CONTRIBUTING.md
2. Agent E updates ARCHITECTURE.md file size table if line counts changed significantly

---

## Quality Checklist

### Per-Agent Checks (Each Agent Self-Validates)
- [ ] Every exported function has a JSDoc block with `@param` and `@returns` (where applicable)
- [ ] Module header `@module` comment is present at the top of each file
- [ ] No existing comments were removed or modified
- [ ] No code behavior was changed (documentation only)
- [ ] All JSDoc types use consistent naming (`{number}`, `{string}`, `{boolean}`, `{Object}`, `{Array}`)
- [ ] Section headers (`// === ... ===`) preserved exactly as-is

### Cross-Agent Checks (Integration Review)
- [ ] All `@typedef` names are unique and consistent across files
- [ ] `@see` cross-references point to documented functions
- [ ] State property names in typedefs match actual code
- [ ] Import/export documentation matches between producer and consumer modules
- [ ] README, ARCHITECTURE, and CONTRIBUTING are mutually consistent
- [ ] No documentation files were created inside `js/` directory

### Final Acceptance
- [ ] IDE hover (VSCode or similar) shows useful information for every imported function
- [ ] A developer unfamiliar with the codebase can find "how to add a weapon" within 30 seconds
- [ ] The `st` state object in game3d.js has every property described
- [ ] The `state` and `player` objects in state.js have every property described
- [ ] Comment density in previously-critical files (state.js, utils.js, levels.js) exceeds 15%
