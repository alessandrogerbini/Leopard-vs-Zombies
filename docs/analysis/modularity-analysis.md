# Modularity Analysis — Leopard vs Zombies (Wildfang)

**Date:** 2026-02-22
**Analyst:** Claude Opus 4.6
**Scope:** Codebase decomposition strategy for parallel development
**Primary target:** `js/game3d.js` (4,511 lines, single-function monolith)

---

## Table of Contents

1. [Current Module Boundaries](#1-current-module-boundaries)
2. [game3d.js Decomposition Plan](#2-game3djs-decomposition-plan)
3. [Shared State Analysis](#3-shared-state-analysis)
4. [Parallel Work Boundaries](#4-parallel-work-boundaries)
5. [Proposed Module Architecture](#5-proposed-module-architecture)
6. [Migration Strategy](#6-migration-strategy)

---

## 1. Current Module Boundaries

### 1.1 The 2D Side: A Model of Good Separation

The 2D Classic mode demonstrates clean modular design with six files that have well-defined responsibilities and a clear dependency graph:

```
game.js (orchestrator)
  |-- state.js       (leaf: constants, type defs, mutable singletons)
  |-- utils.js       (leaf: collision, particles, score helpers)
  |-- levels.js      (leaf: level data, terrain generators)
  |-- enemies.js     (AI: reads state.js, utils.js)
  |-- items.js       (pickups: reads state.js, utils.js, enemies.js)
  |-- renderer.js    (drawing: reads state.js)
```

**What works well:**
- `state.js` is a genuine leaf module with zero dependencies. All constants, type definitions, and mutable state singletons live here.
- `utils.js` provides pure utility functions (`rectCollide`, `getAttackBox`, `spawnParticles`) that are testable in isolation.
- `enemies.js` and `items.js` have clear spawn/update function pairs that follow a consistent pattern.
- `game.js` acts as the orchestrator: it imports from all other modules, runs the game loop, and delegates to subsystem functions.
- Each module exports named functions with specific responsibilities. No module reaches into another module's internals.

**What could be improved:**
- `renderer.js` at 4,599 lines is large, but its functions are individually simple drawing routines. It could be split by screen state (gameplay drawing vs. menu drawing) but this is low priority.
- `items.js` has copy-paste duplication across 5 crate types (BD-27), but the boundaries themselves are clean.
- `state.js` exports mutable singletons that all modules mutate directly. This works at the current scale but makes state flow hard to trace.

### 1.2 The 3D Side: A Monolith

The 3D mode is a single exported function `launch3DGame(options)` in `game3d.js` (line 425) that contains everything within its closure scope:

```
game3d.js
  |-- [Module-level constants: lines 1-424]
  |     ANIMAL_PALETTES, WEAPON_TYPES, SCROLL_TYPES, POWERUPS_3D,
  |     ITEMS_3D, SHRINE_AUGMENTS, TOTEM_EFFECT, physics constants
  |
  |-- launch3DGame(options) [lines 425-4511]
        |-- State initialization (st object, lines 451-566)
        |-- Input handling (keys3d, onKeyDown, onKeyUp, lines 602-705)
        |-- Three.js scene setup (renderer, camera, lights, walls, lines 707-779)
        |-- Terrain system (noise, chunks, decorations, lines 781-1003)
        |-- Platform system (generation, unloading, lines 1005-1122)
        |-- Shrine system (creation, augment application, lines 1124-1196)
        |-- Totem system (creation, difficulty scaling, lines 1198-1254)
        |-- Player model (4 animal builds, ~240 lines each, lines 1256-1555)
        |-- Visual effects (wings, fire aura, lines 1523-1560)
        |-- Zombie tier system (creation, disposal, lines 1562-1756)
        |-- XP gems (creation, pickup logic, lines 1757-1795)
        |-- Powerup crates (creation, interaction, lines 1797-1835)
        |-- Item pickups (creation, equip logic, lines 1836-1879)
        |-- Combat utilities (attack lines, projectiles, lines 1880-1935)
        |-- Spawning (ambient + wave event, lines 1938-1995)
        |-- Scroll helpers (damage/cooldown/range multipliers, lines 1997-2009)
        |-- Weapon system (damage/cooldown calc, fire, update, lines 2010-2567)
        |-- Level-up menu (upgrade choices, lines 2568-2669)
        |-- Main game loop - tick() (lines 2679-3979)
        |-- HUD drawing (lines 3984-4449)
        |-- Cleanup (lines 4450-4511)
```

**Why this is a problem for parallel development:**
- Every change to any 3D subsystem touches the same file.
- Two agents working on "weapon system" and "HUD display" will generate merge conflicts because both modify `game3d.js`.
- No subsystem can be tested in isolation because everything is captured in the closure.
- The `st` state object is accessible to every function, creating invisible coupling.

### 1.3 The Cross-Mode Boundary

The boundary between 2D and 3D modes is clean and well-defined:

- `game.js` line 348: `launch3DGame({ animal, difficulty, onReturn })` is the sole entry point.
- `game3d.js` exports exactly one function: `launch3DGame`.
- The `onReturn` callback is the sole exit path from 3D back to 2D.
- No state is shared between modes at runtime. The 3D `st` object is completely independent of the 2D `state` singleton.
- The only shared resources are DOM elements (`canvas#game3d`, `canvas#hud3d`, `div#game-container`).

This is a **strong boundary** that requires no changes.

---

## 2. game3d.js Decomposition Plan

### 2.1 Identified Subsystems

I have identified **10 logical subsystems** within the monolith by analyzing code regions, data ownership, and function call patterns. Each subsystem is described below with its state ownership, external dependencies, and interface surface.

---

#### Subsystem A: Constants and Type Definitions (lines 1-424)

**Already module-level.** This code is outside the `launch3DGame` closure and can be extracted immediately.

| Property | Details |
|----------|---------|
| **State owned** | `ARENA_SIZE`, `SHRINE_COUNT`, `CHUNK_SIZE`, `GRAVITY_3D`, `JUMP_FORCE`, `GROUND_Y`, `MAP_HALF`, `ANIMAL_PALETTES`, `WEAPON_TYPES`, `SCROLL_TYPES`, `POWERUPS_3D`, `ITEMS_3D`, `SHRINE_AUGMENTS`, `TOTEM_EFFECT` |
| **Reads from** | Nothing |
| **Written by** | Nothing (immutable constants) |
| **Natural interface** | Named exports of each constant/object |
| **Extractable?** | Yes, trivially. Zero dependencies. |

---

#### Subsystem B: Terrain and Chunk System (lines 781-1003)

Responsible for procedural terrain generation, biome determination, decoration placement, and chunk lifecycle management.

| Property | Details |
|----------|---------|
| **State owned** | `terrainChunks`, `chunkMeshes`, `loadedChunks`, `decorations`, `BIOME_COLORS` |
| **Reads from** | `CHUNK_SIZE`, `MAP_HALF` (constants); `scene` (Three.js scene to add/remove meshes) |
| **Functions** | `noise2D`, `smoothNoise`, `terrainHeight`, `getBiome`, `getChunkKey`, `generateChunk`, `unloadChunk`, `updateChunks` |
| **Natural interface** | `init(scene)`, `updateChunks(playerX, playerZ)`, `terrainHeight(x, z)`, `getBiome(x, z)`, `getChunkKey(cx, cz)` |
| **Extractable?** | Yes. Only needs `scene` reference passed in. `terrainHeight` is used by many other subsystems but can be exported as a pure function. |

**Critical note:** `terrainHeight(x, z)` is called by nearly every other subsystem (enemies, shrines, totems, player physics, item placement). It must be exported as a shared utility from this module. This is the single most cross-cutting function in the codebase.

---

#### Subsystem C: Platform System (lines 1005-1122)

Manages elevated gameplay platforms with chunk-based generation and lifecycle.

| Property | Details |
|----------|---------|
| **State owned** | `platforms[]`, `platformsByChunk{}` |
| **Reads from** | `CHUNK_SIZE`, `MAP_HALF` (constants); `terrainHeight`, `getBiome`, `getChunkKey` (terrain); `scene` (Three.js) |
| **Functions** | `generatePlatforms`, `unloadPlatforms`, `updatePlatformChunks` (also manages shrine chunk lifecycle) |
| **Natural interface** | `init(scene, terrain)`, `update(playerX, playerZ)`, `getPlatforms()` (returns platform array for collision checks) |
| **Extractable?** | Yes. Depends on terrain module for `terrainHeight`, `getBiome`, `getChunkKey`. Currently also calls `generateShrines`/`unloadShrines` (shrine lifecycle is coupled here), which should be decoupled. |

**Coupling issue:** `updatePlatformChunks` currently calls shrine generation/unloading functions. This coupling should be broken by having the game loop call both systems independently.

---

#### Subsystem D: Shrine and Augment System (lines 1124-1196, plus augment application logic scattered in tick)

Manages breakable shrines that grant permanent augments.

| Property | Details |
|----------|---------|
| **State owned** | `st.shrines[]`, `st.shrinesByChunk{}`, `st.augments{}`, `st.augmentXpMult`, `st.augmentDmgMult`, `st.augmentArmor`, `st.augmentRegen` |
| **Reads from** | `terrainHeight` (terrain); `SHRINE_AUGMENTS` (constants); `scene` (Three.js); `st.attackRange`, `st.playerX/Y/Z` (player position for interaction) |
| **Functions** | `createShrineMesh`, `generateShrines` (no-op), `unloadShrines` (no-op), plus shrine interaction logic in `tick()` at lines 3853-3892 |
| **Natural interface** | `init(scene, terrain)`, `createShrine(x, z)`, `update(dt, playerPos, attackRange, clock)`, `applyAllAugments(st)` |
| **Extractable?** | Yes. Self-contained data and logic. The interaction logic in `tick()` (lines 3853-3892) should be moved into the shrine module as an `update` method. |

---

#### Subsystem E: Totem System (lines 1198-1254, plus interaction logic in tick at lines 3894-3926)

Manages difficulty totems that scale zombie stats and reward multipliers.

| Property | Details |
|----------|---------|
| **State owned** | `st.totems[]`, `st.totemCount`, `st.totemDiffMult`, `st.totemSpeedMult`, `st.totemSpawnMult`, `st.totemXpMult`, `st.totemScoreMult` |
| **Reads from** | `terrainHeight` (terrain); `TOTEM_EFFECT` (constants); `scene` (Three.js); `st.playerX/Y/Z`, `st.attackRange` (player position for interaction) |
| **Functions** | `createTotemMesh`, plus totem interaction in `tick()` at lines 3894-3926 |
| **Natural interface** | `init(scene, terrain)`, `createTotem(x, z)`, `update(dt, playerPos, attackRange)` |
| **Extractable?** | Yes. Very self-contained. Even simpler than shrines. |

---

#### Subsystem F: Player Model and Animation (lines 1256-1555, plus animation logic in tick at lines 2887-2970)

Builds the voxel-style animal model and handles walk/flight animation and muscle growth.

| Property | Details |
|----------|---------|
| **State owned** | `playerGroup` (Three.js Group), `legs[]`, `arms[]`, `tail`, `muscles{}`, `wingGroup` |
| **Reads from** | `animalId`, `palette` (from options); `st.level` (for muscle growth); `st.flying`, `st.gManeuver`, `st.gManeuverPitch` (flight state); `clock.elapsedTime` (animation timing) |
| **Functions** | `box()` helper, 4 animal model builders (inline if/else blocks), wing construction, animation update logic in tick |
| **Natural interface** | `createPlayerModel(animalId, palette)` returning `{ group, legs, arms, tail, muscles, wingGroup }`, `updateAnimation(dt, state, clock)`, `updateMuscleGrowth(level)` |
| **Extractable?** | Yes. The `box()` helper is also used by enemy creation, so it should be in a shared utility. The model construction is pure setup code with no external mutation. |

**Note:** `box()` is used by both player and enemy model creation. It should be extracted to a shared 3D utility module.

---

#### Subsystem G: Enemy System (lines 1562-1756, plus AI logic in tick at lines 3415-3578)

Manages zombie creation, tier system, AI movement, collision with player, merging, and disposal.

| Property | Details |
|----------|---------|
| **State owned** | `st.enemies[]`, `ZOMBIE_TIERS` (constant), `st.killsByTier[]`, `st.totalKills` |
| **Reads from** | `terrainHeight` (terrain); `platforms[]` (for zombie jumping onto platforms); `st.playerX/Y/Z`, `st.onPlatformY` (player state for AI targeting); `st.totemDiffMult`, `st.totemSpeedMult` (totem effects); `st.zombieDmgMult` (difficulty); `scene` (Three.js) |
| **Writes to** | `st.hp` (player damage from contact); `st.invincible` (i-frames after damage); `st.score` (kill rewards); `st.xpGems` (XP drops) |
| **Functions** | `createEnemy`, `disposeEnemy`, plus AI movement, platform jumping, player damage, zombie-zombie merge, and animation logic in `tick()` |
| **Natural interface** | `createEnemy(x, z, baseHp, tier, scene, terrain)`, `disposeEnemy(e, scene)`, `updateEnemyAI(dt, enemies, playerState, platforms, terrain, totemMults)`, `updateMerging(enemies, scene, terrain)` |
| **Extractable?** | Yes, but with careful interface design. Reads from many systems. The merge logic (lines 3528-3578) writes to `st.enemies` (adds new enemies), `st.floatingTexts3d`, and calls `disposeEnemy`. |

**Coupling hotspots:**
- Enemy AI reads player position, platform list, and totem multipliers.
- Contact damage writes to `st.hp` and `st.invincible`.
- Kill logic writes to `st.score`, `st.xpGems`, `st.powerupCrates`, `st.itemPickups`, `st.totalKills`, `st.killsByTier`.
- Merge logic creates new enemies and disposes old ones.

These couplings are manageable through parameter passing rather than closure capture.

---

#### Subsystem H: Weapon and Projectile System (lines 2010-2567, plus auto-attack/power attack in tick at lines 3580-3694)

The most complex subsystem. Manages 6 weapon types, cooldown timers, projectile creation and tracking, effect lifecycle, and damage application.

| Property | Details |
|----------|---------|
| **State owned** | `st.weapons[]`, `st.maxWeaponSlots`, `st.scrolls{}`, `st.weaponProjectiles[]`, `st.weaponEffects[]`, `st.autoAttackTimer`, `st.charging`, `st.chargeTime`, `st.chargeGlow` |
| **Reads from** | `WEAPON_TYPES`, `SCROLL_TYPES` (constants); `st.playerX/Y/Z`, `playerGroup.rotation.y` (player position/facing); `st.enemies[]` (target finding); `st.augmentDmgMult`, `st.dmgBoost`, `st.atkSpeedBoost` (damage modifiers); `terrainHeight` (for poison cloud placement); `scene` (Three.js) |
| **Writes to** | Enemy HP via `damageEnemy()` calls; `st.weaponProjectiles[]`, `st.weaponEffects[]` (adds new entities) |
| **Functions** | `getWeaponDamage`, `getWeaponCooldown`, `getWeaponRange`, `getProjectileCount`, `getChainCount`, `findNearestEnemy`, `killEnemy`, `damageEnemy`, `fireWeapon`, `updateWeapons`, `updateWeaponProjectiles`, `spawnExplosion`, `disposeEffectMesh`, `updateWeaponEffects` |
| **Natural interface** | `getWeaponDamage(w, scrolls, augmentMult, dmgBoost)`, `fireWeapon(w, playerPos, facing, enemies, scene, terrain)`, `updateWeapons(dt, weapons, ...)`, `updateProjectiles(dt, ...)`, `updateEffects(dt, ...)` |
| **Extractable?** | Yes. The weapon system is large but internally cohesive. `damageEnemy` and `killEnemy` are the main cross-cutting functions -- they should be in the enemy module or a shared combat utility. |

**Key coupling:** `killEnemy` (line 2126) mutates `st.score`, `st.xpGems`, `st.totalKills`, `st.killsByTier`, `st.powerupCrates`, `st.itemPickups`, `st.floatingTexts3d`, and `st.hp`. This function is the biggest state mutation point in the codebase and needs careful placement -- it belongs in a "combat" or "enemy" module that receives callbacks or a state reference for the side effects.

---

#### Subsystem I: HUD and UI (lines 3984-4449)

Draws all 2D overlay elements: health/XP bars, weapon cooldowns, scroll counts, timers, floating texts, pause menu, upgrade menu, game over screen, and leaderboard.

| Property | Details |
|----------|---------|
| **State owned** | None (pure drawing functions) |
| **Reads from** | Everything in `st` (HP, XP, weapons, scrolls, augments, items, totems, wave, score, gameTime, upgradeChoices, pauseMenu, gameOver, leaderboard, etc.); `WEAPON_TYPES`, `SCROLL_TYPES`, `SHRINE_AUGMENTS`, `ITEMS_3D` (constants for display names); `camera` (for 3D-to-screen projection); `hudCanvas` dimensions |
| **Writes to** | The HUD canvas 2D context (purely visual) |
| **Functions** | `drawHUD(ctx, s)` (single 435-line function) |
| **Natural interface** | `drawHUD(ctx, state, constants, camera, canvasSize)` |
| **Extractable?** | Yes. This is the easiest extraction because it is a pure read-only function with no side effects. It already receives state as a parameter (`s`). |

---

#### Subsystem J: Powerup Effects (scattered through tick, lines 2988-3370)

Manages 18 temporary powerup effects including visual particles, damage auras, flight mechanics, clones, bombs, and healing.

| Property | Details |
|----------|---------|
| **State owned** | `st.activePowerup`, `st.jumpBoost`, `st.dmgBoost`, `st.atkSpeedBoost`, `st.speedBoost`, `st.fireAura`, `st.rangedMode`, `st.flying`, `st.frostNova`, `st.berserkVulnerable`, `st.ghostForm`, `st.earthquakeStomp`, `st.vampireHeal`, `st.lightningShield`, `st.lightningShieldTimer`, `st.giantMode`, `st.timeWarp`, `st.mirrorClones`, `st.mirrorCloneGroups[]`, `st.bombTrail`, `st.bombTrailTimer`, `st.bombTrailBombs[]`, `st.regenBurst`, `st.wasAirborne`, `st.gManeuver`, `st.gManeuverPitch`, `fireParticles[]` |
| **Reads from** | `st.playerX/Y/Z` (position); `st.enemies[]` (for damage effects); `st.onGround` (for earthquake stomp); `clock.elapsedTime` (for visual timing); `scene` (Three.js) |
| **Writes to** | `st.hp` (healing effects); enemy HP via `damageEnemy`; `st.enemies` speed (time warp); visual particles added to/removed from scene |
| **Natural interface** | `updatePowerups(dt, st, enemies, scene, clock)`, `activatePowerup(powerupDef, st)`, `deactivatePowerup(st)` |
| **Extractable?** | Partially. The powerup timer/activation logic is clean, but the per-powerup visual effects create many Three.js objects inline. Would need the `fireGeo`/`fireMat` particle primitives passed in or shared. |

---

### 2.2 Subsystem Dependency Graph

```
Constants (A) <---- [everything imports from here]
    |
Terrain (B) <------ Platforms (C)
    |                    |
    +--- Shrines (D)     |
    |                    |
    +--- Totems (E)      |
    |                    |
    +--- Enemies (G) ----+--- Player Model (F)
    |       |
    |       +--- Weapon System (H)
    |       |
    |       +--- Powerup Effects (J)
    |
    +--- HUD (I) -----> reads everything
```

**Critical path:** Constants (A) -> Terrain (B) -> everything else. The terrain module must be extracted first because `terrainHeight()` is a dependency for almost every other subsystem.

---

## 3. Shared State Analysis

### 3.1 The `st` Object: Property Ownership Map

The `st` object has approximately 100 properties. Below is a mapping of which subsystem **owns** (writes primarily) and which subsystems **read** each property cluster.

| Property Cluster | Primary Writer | Readers |
|-----------------|----------------|---------|
| `hp`, `maxHp`, `invincible` | Player physics, Enemy contact, Powerup healing, Shrine augments | HUD, Death check |
| `playerX/Y/Z`, `playerVY`, `onGround`, `onPlatformY`, `moveDir` | Player input/physics (tick) | Enemy AI, Weapon targeting, Camera, HUD, Powerup effects |
| `score`, `scoreMult`, `totemScoreMult` | killEnemy, Totem system | HUD, Leaderboard |
| `enemies[]` | Spawning, Merge, Kill | Enemy AI, Weapon targeting, Powerup damage effects, HUD |
| `weapons[]`, `maxWeaponSlots` | Level-up menu | Weapon update, HUD |
| `weaponProjectiles[]`, `weaponEffects[]` | fireWeapon, spawnExplosion | updateWeaponProjectiles, updateWeaponEffects, Cleanup |
| `scrolls{}` | Level-up menu | Weapon damage/cooldown/range calcs, HUD |
| `xpGems[]` | killEnemy, Wave events | XP collection in tick, HUD |
| `xp`, `xpToNext`, `level` | XP collection | Level-up trigger, HUD, Muscle growth, Weapon slot unlock |
| `shrines[]`, `augments{}`, `augmentXpMult/DmgMult/Armor/Regen` | Shrine interaction | Damage calc, XP calc, Regen, HUD |
| `totems[]`, `totemCount`, `totemDiffMult/SpeedMult/SpawnMult/XpMult/ScoreMult` | Totem interaction | Enemy spawning, Enemy AI speed, Score calc, XP calc, HUD |
| `activePowerup`, `jumpBoost`, `dmgBoost`, `speedBoost`, etc. | Powerup activate/deactivate | Player movement, Damage calc, Visual effects, HUD |
| `gameOver`, `paused`, `upgradeMenu`, `pauseMenu`, `selectedUpgrade`, `selectedPauseOption` | Input handler, Death check, Level-up | tick() flow control, HUD |
| `powerupCrates[]`, `itemPickups[]` | Wave events, killEnemy, Initial placement | Crate interaction in tick, HUD |
| `items{}` | Item pickup interaction | Damage calc, Movement speed, HUD |
| `leaderboard3d`, `nameEntry`, `nameEntryActive` | Input handler, saveScore3d | HUD (game over screen) |
| `killsByTier[]`, `totalKills` | killEnemy | HUD, Leaderboard save |
| `gameTime` | tick() | Spawn scaling, Wave timing, HUD, Leaderboard save |
| `wave`, `waveEventTimer`, `waveWarning`, `waveActive` | Wave event logic | Spawn scaling, HUD |
| `ambientSpawnTimer`, `ambientCrateTimer` | tick() | Spawn timing |
| `floatingTexts3d[]` | Shrine/totem/augment interactions | HUD floating text renderer |

### 3.2 Contention Points (Multiple Writers)

These are the state properties where multiple subsystems write, creating the highest coupling risk:

1. **`st.hp`** -- Written by: enemy contact damage, powerup healing (vampire fangs, regen burst), shrine augments (instant heal on maxHp augment), item effects (health pendant), loot drops (health orb from killEnemy). **6 writers.**

2. **`st.enemies[]`** -- Written by: ambient spawn, wave event spawn, zombie merge (adds new merged zombie), killEnemy (sets `alive=false`), timeWarp powerup (modifies speed). **5 writers.**

3. **`st.score`** -- Written by: killEnemy, totem destruction. **2 writers** but both go through score calculation.

4. **`st.xpGems[]`** -- Written by: killEnemy (primary XP drop), wave events (bonus item drops), loot drops (XP burst). **3 writers.**

5. **`st.powerupCrates[]`** -- Written by: killEnemy (loot drop), wave events (bonus crate), ambient crate timer, initial loot crate placement. **4 writers.**

### 3.3 The `damageEnemy` / `killEnemy` Nexus

The most cross-cutting mutation point is the kill chain:

```
damageEnemy(e, dmg)
  |-- checks crit gloves (reads st.items.gloves)
  |-- e.hp -= dmg (mutates enemy)
  |-- if dead: killEnemy(e)
        |-- st.score += pts (reads st.wave, st.scoreMult, st.totemScoreMult)
        |-- st.xpGems.push() (creates XP gem with scene.add)
        |-- st.totalKills++ (kill tracking)
        |-- st.killsByTier[]++ (kill tracking)
        |-- loot roll: st.powerupCrates.push() OR st.hp += heal OR st.xpGems.push()
        |-- disposeEnemy(e) (removes from scene, traverses group)
```

This function is called from: auto-attack, power attack, weapon fire (6 weapon types), powerup effects (fire aura, earthquake stomp, lightning shield, mirror clones, bomb trail). That is **11+ call sites**.

**Recommendation:** `damageEnemy` and `killEnemy` should be in a shared combat utility module, receiving the state object and scene as parameters rather than capturing them from the closure.

---

## 4. Parallel Work Boundaries

### 4.1 Safe Parallel Pairs

These subsystem pairs can be worked on simultaneously by different agents with **minimal or zero merge conflict risk**, provided the module extraction has been done:

| Pair | Why Safe | Required Interface |
|------|----------|--------------------|
| **HUD (I) + Terrain (B)** | HUD reads state, terrain writes terrain data. Zero overlap. | Both read from `st` but never write the same properties. |
| **HUD (I) + Player Model (F)** | HUD draws 2D overlay, player model is 3D geometry. Completely separate rendering pipelines. | HUD reads `st`, player model reads `animalId` and `st.level`. |
| **Shrine system (D) + Totem system (E)** | Independent map objects with different state clusters. Only shared dependency is `terrainHeight`. | Both read `st.playerX/Z` and `st.attackRange`, but write to disjoint state properties. |
| **Shrine system (D) + Weapon system (H)** | Shrines grant augments, weapons deal damage. No direct data coupling except through the shared `st.augmentDmgMult` which shrines write and weapons read. | One-way data flow: shrines write multipliers, weapons read them. |
| **Platform system (C) + Powerup effects (J)** | Platforms are terrain geometry, powerups are temporary player buffs. No shared state. | Platforms provide collision surfaces; powerups modify player stats. No mutual writes. |
| **Constants (A) + anything** | Constants are immutable. Extracting constants is always safe to do in parallel with any other work. | Read-only exports. |

### 4.2 Dangerous Parallel Pairs

These pairs have **high merge conflict risk** if worked on simultaneously, even after module extraction:

| Pair | Why Dangerous | Specific Conflict Points |
|------|--------------|------------------------|
| **Enemy AI (G) + Weapon system (H)** | Both iterate `st.enemies[]` and call `damageEnemy`. Both read player position. The merge logic in enemy AI creates enemies that weapons then target. | `st.enemies[]` is mutated by both during the same frame. `damageEnemy`/`killEnemy` is shared. |
| **Enemy AI (G) + Powerup effects (J)** | Multiple powerups directly damage enemies (fire aura, earthquake stomp, lightning shield, mirror clones, bomb trail, frost nova, time warp). Time warp directly mutates enemy speed. | 7 powerup types iterate `st.enemies[]` and call `damageEnemy`. Time warp writes to individual enemy objects. |
| **Player physics (in tick) + Powerup effects (J)** | Powerups modify the same player stats that physics reads: `speedBoost`, `jumpBoost`, `flying`, `giantMode`. Flight mechanics (G-force maneuvers) are deeply entangled with player physics. | Both systems write and read `st.playerY`, `st.playerVY`, `st.onGround`. Flight state (`st.gManeuver`, `st.gManeuverPitch`) is owned by powerup effects but consumed by player physics. |
| **Weapon system (H) + Level-up menu** | Level-up adds new weapons to `st.weapons[]` and modifies weapon levels. Weapon system reads these same weapons every frame for cooldown/fire logic. | `st.weapons[]` array is mutated by level-up and iterated by weapon update. |

### 4.3 Sequential Dependencies (Extraction Order Constraints)

These modules **must be extracted in order** because later extractions depend on earlier ones being stable:

```
Phase 0: Constants (A)              -- no dependencies, extract first
Phase 1: Terrain (B)                -- depends only on constants
Phase 1: Shared 3D Utils (box())    -- depends only on THREE
Phase 2: Platform (C)               -- depends on terrain
Phase 2: Shrine (D)                 -- depends on terrain
Phase 2: Totem (E)                  -- depends on terrain
Phase 2: Player Model (F)           -- depends on shared 3D utils
Phase 3: Enemy (G)                  -- depends on terrain, platforms, shared 3D utils
Phase 3: HUD (I)                    -- depends on constants (for display names)
Phase 4: Weapon System (H)          -- depends on enemies (damageEnemy), terrain, constants
Phase 4: Powerup Effects (J)        -- depends on enemies (damageEnemy), player state
Phase 5: Game Loop (main tick)      -- depends on everything above
```

Phases 0 and 1 are prerequisites for everything else. Within Phase 2, all four extractions can proceed in parallel. Phase 3 items can proceed in parallel with each other. Phase 4 items can proceed in parallel with each other but must wait for Phase 3.

---

## 5. Proposed Module Architecture

### 5.1 File Structure

```
js/
  game.js              -- (unchanged) 2D mode + 3D launcher
  state.js             -- (unchanged) 2D state
  utils.js             -- (unchanged) 2D utilities
  levels.js            -- (unchanged) 2D levels
  enemies.js           -- (unchanged) 2D enemies
  items.js             -- (unchanged) 2D items
  renderer.js          -- (unchanged) 2D renderer
  game3d.js            -- (slimmed) 3D entry point, game loop, initialization

  3d/
    constants.js       -- All 3D constants and type definitions
    terrain.js         -- Noise, biomes, chunk generation, decorations
    platforms.js       -- Platform generation and lifecycle
    shrines.js         -- Shrine creation, augment system
    totems.js          -- Totem creation, difficulty scaling
    player-model.js    -- Animal model construction and animation
    enemies3d.js       -- Zombie tiers, creation, AI, merging
    weapons.js         -- Weapon types, projectiles, effects, cooldowns
    combat.js          -- damageEnemy, killEnemy, findNearestEnemy (shared)
    powerups.js        -- Powerup activation, effects, timers
    hud.js             -- All HUD drawing (gameplay, menus, game over)
    utils3d.js         -- box() helper, disposeGroup(), particle helpers
    spawning.js        -- Ambient and wave event spawn logic
    level-up.js        -- Upgrade menu generation and choice application
```

### 5.2 Module Interfaces

#### `js/3d/constants.js`
```javascript
// Exports: all immutable game constants
export const ARENA_SIZE = 80;
export const SHRINE_COUNT = 20;
export const CHUNK_SIZE = 16;
export const GRAVITY_3D = 22;
export const JUMP_FORCE = 10;
export const GROUND_Y = 0;
export const MAP_HALF = 128;
export const ANIMAL_PALETTES = { ... };
export const WEAPON_TYPES = { ... };
export const SCROLL_TYPES = { ... };
export const POWERUPS_3D = [ ... ];
export const ITEMS_3D = [ ... ];
export const SHRINE_AUGMENTS = [ ... ];
export const TOTEM_EFFECT = { ... };
export const ZOMBIE_TIERS = [ ... ];
```

#### `js/3d/terrain.js`
```javascript
import { CHUNK_SIZE, MAP_HALF } from './constants.js';

// Pure functions (no scene dependency)
export function noise2D(x, z) { ... }
export function smoothNoise(x, z, scale) { ... }
export function terrainHeight(x, z) { ... }
export function getBiome(x, z) { ... }
export function getChunkKey(cx, cz) { ... }

// Stateful terrain manager (receives scene reference)
export function createTerrainManager(scene) {
  const loadedChunks = new Set();
  const chunkMeshes = {};
  const decorations = [];

  return {
    updateChunks(playerX, playerZ) { ... },
    dispose() { ... },
  };
}
```

#### `js/3d/combat.js`
```javascript
import { ZOMBIE_TIERS } from './constants.js';
import { terrainHeight } from './terrain.js';

// Shared combat utilities used by weapons, auto-attack, power attack, powerups
export function findNearestEnemy(enemies, playerX, playerZ, range) { ... }
export function damageEnemy(e, dmg, st) { ... }
export function killEnemy(e, st, scene, createXpGem, createPowerupCrate, createItemPickup) { ... }
export function getPlayerDmgMult(level) { ... }
```

#### `js/3d/hud.js`
```javascript
import { WEAPON_TYPES, SCROLL_TYPES, SHRINE_AUGMENTS, ITEMS_3D } from './constants.js';

export function drawHUD(ctx, state, camera, canvasWidth, canvasHeight, animalData, getWeaponCooldown, getGroundAt) { ... }
```

#### `js/3d/utils3d.js`
```javascript
// Shared Three.js utility functions
export function box(group, w, h, d, color, x, y, z, shadow) { ... }

export function disposeGroup(group, scene) {
  group.traverse(child => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
  if (scene) scene.remove(group);
}

export function createParticle(geo, mat, x, y, z, scene) { ... }
```

#### `js/game3d.js` (after refactoring)
```javascript
import { GRAVITY_3D, JUMP_FORCE, MAP_HALF, ... } from './3d/constants.js';
import { terrainHeight, getBiome, createTerrainManager } from './3d/terrain.js';
import { createPlatformManager } from './3d/platforms.js';
import { createShrineManager } from './3d/shrines.js';
import { createTotemManager } from './3d/totems.js';
import { createPlayerModel, updatePlayerAnimation } from './3d/player-model.js';
import { createEnemy, updateEnemyAI, updateMerging } from './3d/enemies3d.js';
import { updateWeapons, updateProjectiles, updateEffects, fireWeapon } from './3d/weapons.js';
import { damageEnemy, killEnemy, findNearestEnemy } from './3d/combat.js';
import { updatePowerupEffects, activatePowerup } from './3d/powerups.js';
import { drawHUD } from './3d/hud.js';
import { spawnAmbient, spawnWaveEvent } from './3d/spawning.js';
import { showUpgradeMenu } from './3d/level-up.js';
import { box, disposeGroup } from './3d/utils3d.js';

export function launch3DGame(options) {
  // State initialization (~120 lines instead of ~140)
  const st = { ... };

  // Scene setup (~70 lines)
  // Input handling (~100 lines)

  // Initialize subsystems
  const terrain = createTerrainManager(scene);
  const platformMgr = createPlatformManager(scene, terrainHeight, getBiome);
  const shrineMgr = createShrineManager(scene, st, terrainHeight);
  const totemMgr = createTotemManager(scene, st, terrainHeight);
  const playerModel = createPlayerModel(animalId, palette, scene);

  // Game loop (tick) - orchestration only, ~400 lines
  function tick() {
    // Player input
    // Player physics
    // Call subsystem updates
    terrain.updateChunks(st.playerX, st.playerZ);
    platformMgr.update(st.playerX, st.playerZ);
    updateEnemyAI(dt, st, platformMgr.getPlatforms(), terrainHeight);
    updateWeapons(dt, st, scene, terrainHeight);
    updatePowerupEffects(dt, st, scene, clock);
    shrineMgr.update(dt, st, clock);
    totemMgr.update(dt, st);
    // Camera
    // Render
    drawHUD(hudCtx, st, camera, hudCanvas.width, hudCanvas.height, animalData);
  }

  // Cleanup
  function cleanup() { ... }
}
```

### 5.3 Estimated Line Counts After Decomposition

| Module | Estimated Lines | Notes |
|--------|----------------|-------|
| `3d/constants.js` | ~250 | All constants, type definitions, data tables |
| `3d/terrain.js` | ~220 | Noise functions, chunk generation, decorations |
| `3d/platforms.js` | ~120 | Platform generation and lifecycle |
| `3d/shrines.js` | ~120 | Shrine mesh, augment logic, interaction |
| `3d/totems.js` | ~80 | Totem mesh, difficulty scaling, interaction |
| `3d/player-model.js` | ~350 | 4 animal models, wing construction, animation, muscle growth |
| `3d/enemies3d.js` | ~350 | Zombie tiers, model creation, AI, merge logic |
| `3d/weapons.js` | ~550 | 6 weapon fire patterns, projectiles, effects, cooldowns |
| `3d/combat.js` | ~80 | damageEnemy, killEnemy, findNearestEnemy, getPlayerDmgMult |
| `3d/powerups.js` | ~400 | 18 powerup effect updates, activation/deactivation |
| `3d/hud.js` | ~450 | All HUD drawing including menus and game over |
| `3d/utils3d.js` | ~60 | box(), disposeGroup(), particle helpers |
| `3d/spawning.js` | ~80 | Ambient spawn, wave event spawn |
| `3d/level-up.js` | ~100 | Upgrade menu generation, choice pool logic |
| `game3d.js` (main) | ~500 | State init, scene setup, input, game loop orchestration, cleanup |
| **Total** | **~3,810** | Slight increase from 4,511 due to interface boilerplate but dramatically improved organization |

The apparent reduction is because the analysis separates boilerplate (JSDoc headers, blank lines, comments) from actual logic. The total functional code is preserved; it is redistributed into focused modules.

---

## 6. Migration Strategy

### 6.1 Guiding Principles

1. **One module extraction per commit.** Each extraction should be a self-contained change that keeps the game fully playable.
2. **Extract leaf modules first.** Start with modules that have no dependencies on other to-be-extracted modules.
3. **Use the "strangle fig" pattern.** Leave the original code in place, create the new module alongside it, wire up the imports, verify the game works, then delete the original code.
4. **Test after every extraction.** Play the game for 2-3 minutes after each extraction to verify no regressions. Specific scenarios: spawn in all 4 animals, play for 5+ minutes to trigger wave events, break shrines, activate totems, level up to test weapon/scroll selection, die and verify game over screen.

### 6.2 Extraction Order (10 Steps)

#### Step 0: Pre-requisite Beads
Complete these code-quality beads first, as they simplify the extraction:
- **BD-26**: Extract magic numbers into named constants (makes constants.js extraction cleaner)
- **BD-29**: Consolidate augment state into single source of truth (simplifies shrine module interface)

These beads modify `game3d.js` in ways that align with the decomposition rather than creating additional churn.

#### Step 1: Extract `3d/constants.js`
**Risk: MINIMAL.** Move all module-level constants (lines 1-424) into a separate file. Add `import` statements in `game3d.js`. This is a pure reorganization with zero behavioral change.

**Verification:** Game loads. All weapons, scrolls, powerups, items display correct names and stats.

#### Step 2: Extract `3d/utils3d.js`
**Risk: MINIMAL.** Move `box()` helper and create `disposeGroup()` utility. These are pure functions with no state dependencies.

**Verification:** Player model renders correctly. Enemies render correctly.

#### Step 3: Extract `3d/terrain.js`
**Risk: LOW.** Move noise functions, chunk generation/unloading, and decoration logic. The key challenge is that `terrainHeight` must become an exported function used by many call sites within `game3d.js`.

**Verification:** Terrain generates as the player moves. Chunks load/unload correctly. No visual gaps in the ground.

#### Step 4: Extract `3d/platforms.js`
**Risk: LOW.** Move platform generation and lifecycle. Depends on terrain module.

**Decouple:** Remove the `generateShrines`/`unloadShrines` calls from `updatePlatformChunks`. Move those calls to the game loop.

**Verification:** Platforms appear on the map. Player can stand on platforms. Platforms unload when moving away.

#### Step 5: Extract `3d/shrines.js` and `3d/totems.js`
**Risk: LOW.** Both are self-contained map object systems. Can be done in parallel.

**Verification:** 20 shrines appear. Breaking shrines grants augments with correct stat changes. 8 totems appear. Breaking totems shows difficulty increase announcement.

#### Step 6: Extract `3d/player-model.js`
**Risk: LOW-MEDIUM.** Move all 4 animal model construction blocks and animation logic. The animation update code in `tick()` (lines 2887-2970) moves to an `updateAnimation` function.

**Challenge:** The animation reads `clock.elapsedTime`, `st.level`, `st.flying`, and various movement state. These must be passed as parameters.

**Verification:** All 4 animals render correctly. Walk animation plays. Muscle growth visible on level-up. Wings appear during Angel Wings powerup. G-force maneuvers work.

#### Step 7: Extract `3d/hud.js`
**Risk: LOW.** The `drawHUD` function already receives state as a parameter. Move it and its internal helpers to a separate file.

**Challenge:** `drawHUD` uses `getWeaponCooldown` (from weapon system) and `getGroundAt` (local function in tick scope that checks platforms). These must be passed as parameters or extracted.

**Verification:** All HUD elements display correctly: HP bar, XP bar, weapon cooldowns, scroll counts, wave timer, pause menu, upgrade menu, game over screen with leaderboard.

#### Step 8: Extract `3d/enemies3d.js` and `3d/combat.js`
**Risk: MEDIUM.** This is the most coupled extraction. Enemy creation, AI, merging, and the `damageEnemy`/`killEnemy` chain must be separated cleanly.

**Strategy:**
1. First extract `combat.js` with `damageEnemy`, `killEnemy`, `findNearestEnemy`, and `getPlayerDmgMult`.
2. Then extract `enemies3d.js` with `createEnemy`, `disposeEnemy`, `updateEnemyAI`, `updateMerging`.
3. Both import from `combat.js`.

**Verification:** Enemies spawn, chase player, deal contact damage. Same-tier zombies merge. Killed enemies drop XP, loot. All 10 tiers render with visual upgrades.

#### Step 9: Extract `3d/weapons.js`
**Risk: MEDIUM.** The weapon system is large (550+ lines) with complex projectile/effect lifecycle. Depends on `combat.js` for `damageEnemy` and `findNearestEnemy`.

**Verification:** All 6 weapon types fire correctly. Projectiles travel and hit enemies. Poison clouds deal DoT. Lightning chains. Fireballs explode. Boomerangs return. Cooldowns display correctly on HUD.

#### Step 10: Extract `3d/powerups.js`, `3d/spawning.js`, `3d/level-up.js`
**Risk: LOW-MEDIUM.** These are the final extractions. Powerup effects are the most complex due to the 18 individual effect update blocks.

**Verification:** Powerup crates drop and activate correctly. All 18 powerup effects work. Level-up menu offers correct choices. Rerolls work. Ambient spawning and wave events trigger on schedule.

### 6.3 Risk Mitigation

**Rollback strategy:** Each extraction step is a single commit. If a step introduces bugs that are not quickly fixable, `git revert` the commit and investigate.

**Testing checklist per extraction:**
- [ ] Game launches without console errors
- [ ] Can select each of the 4 animals
- [ ] Can play for 2+ minutes without crashes
- [ ] Can trigger level-up and select upgrades
- [ ] Can pause and resume
- [ ] Can die and see game over screen
- [ ] Can return to main menu from 3D mode
- [ ] No memory leaks visible in Chrome DevTools (memory tab stable)

**Parallel agent safety:** After Step 7 (HUD extraction), two agents can safely work in parallel on:
- Agent 1: Steps 8-9 (enemies + weapons -- these are coupled and should be done by the same agent)
- Agent 2: Step 10 powerups/spawning/level-up (independent of enemy/weapon restructuring)

### 6.4 What NOT to Change During Migration

- **Do not rename `st` to `state3d` during extraction.** The BD-31 rename should happen as a separate step after all extractions are complete. Combining a rename with module extraction creates an unmergeable diff.
- **Do not change the `launch3DGame(options)` public interface.** The 2D-to-3D boundary is clean and should remain unchanged.
- **Do not introduce TypeScript or a build step.** The zero-build-step architecture is a project constraint. All new modules should use vanilla ES modules (`import`/`export`).
- **Do not attempt to share code between 2D and 3D modes.** The two modes have fundamentally different architectures (2D uses frame-based timing, 3D uses delta-time; 2D uses pixel coordinates, 3D uses world units). Attempting to unify them would create more problems than it solves.

---

## Summary

The `game3d.js` monolith can be decomposed into 14 focused modules within a `js/3d/` directory. The extraction follows a strict dependency order starting with constants and terrain (which have zero downstream risk), progressing through independent map systems (platforms, shrines, totems), then through the player model and HUD (read-only operations), and finally tackling the most coupled systems (enemies, weapons, powerups) last.

The critical insight is that `terrainHeight()` is the most cross-cutting function and must be extracted first, and `damageEnemy()`/`killEnemy()` are the most cross-cutting mutation points and must be isolated into a shared `combat.js` module to prevent circular dependencies between enemies, weapons, and powerups.

After the extraction is complete, the game loop in `game3d.js` becomes a pure orchestrator of ~500 lines that initializes subsystems, runs the per-frame update sequence, and handles cleanup -- mirroring the role that `game.js` already plays for the 2D mode. This enables parallel development work on any two non-dangerous subsystem pairs identified in Section 4.1.
