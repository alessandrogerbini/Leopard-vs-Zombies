# Wildfang Closed Alpha -- Implementation Plan

**Date:** 2026-02-22
**Source:** `path to closed alpha v3.md` (creative direction), `modularity analysis.md` (decomposition plan), `Engine analysis.md` (physics/constraints)
**Architecture:** Zero-build-step vanilla ES modules, Three.js via CDN, dual canvas (WebGL + HUD overlay)

---

## 1. Sprint Overview

### Total Scope

The closed alpha ships a browser-based 3D survival game to 5-15 testers. The build must showcase six identity pillars: animal characters with muscle growth, zombie merge system, charged power attack with a chunky visible charge bar, mouth-made SFX on every action, kid-friendly tone (Chill Mode), and expanded build variety (10 weapons, 10 howls, 25 items with rarity tiers).

### Content Targets

| Category | Current | Alpha Target | Delta |
|----------|---------|-------------|-------|
| Weapons | 6 | 10 | +4 new (Mud Bomb, Beehive Launcher, Snowball Turret, Stink Line) |
| Howls (was scrolls) | 6 | 10 | +4 new (Thorns, Magnet, Frenzy, Guardian) + rename |
| Items | 11 | 25 | +14 new, rarity system with 4 tiers |
| Zombie tiers | 10 (1:1 merge) | 4 (tiered merge) | Simplify to 4 visible tiers with tiered ratios |
| Biomes | 3 | 1 (forest) | Remove desert/plains, polish forest |
| Audio | 0 sounds | 40 mouth-made SFX | New audio manager + event hookups |
| Difficulties | 3 | 4 | +Chill Mode |

### Timeline

**5 weeks total, ~80-110 hours of developer work.**

```
Week 1 (Days 1-3):   M0 -- Stabilize + recruit testers
Week 1-2 (Days 4-10):  M1 -- Audio + terrain foundation
Week 2-3 (Days 11-18): M2 -- Content expansion (weapons, howls, items, rarity)
Week 3-4 (Days 19-24): M3 -- Alpha polish (merge ratios, charge bar, Chill Mode, UI)
Week 4 (Day 25):      M3.5 -- Developer QA gate
Week 4 (Days 26-27):  M4 -- Deploy + distribute
Week 5 (Days 33-35):  M5 -- Respond to feedback (time-boxed, max 3 issues)
```

### Exit Criteria (from v3)

1. A tester completes 3 consecutive runs on any difficulty without crash, freeze, or state corruption.
2. At least 5 testers submit feedback (inline or via form).
3. Six identity features (animal characters, muscle growth, zombie merge, power attack, mouth-made SFX, kid-friendly tone) are present and noticeable without prompting.
4. Chill Mode exists and a child aged 6-10 can survive at least 3 minutes.
5. Game-over screen shows stats, inline feedback prompts, and a link to the full feedback form.
6. Every core game action produces an audible mouth-made sound effect.

---

## 2. Module Map

### Existing Modules (js/3d/*.js)

| Module | Lines | Status | Description |
|--------|-------|--------|-------------|
| `js/3d/constants.js` | 273 | Extracted | All immutable constants: WEAPON_TYPES, SCROLL_TYPES, ITEMS_3D, SHRINE_AUGMENTS, etc. |
| `js/3d/terrain.js` | 288 | Extracted | Noise functions, terrainHeight, biome system, chunk generation/unloading |
| `js/3d/hud.js` | 493 | Extracted | Full HUD overlay rendering (gameplay, pause, upgrade, game over) |
| `js/3d/player-model.js` | 463 | Extracted | 4 animal model builders, animation, muscle growth |
| `js/3d/utils.js` | 33 | Extracted | `box()` helper for voxel model construction |
| `js/game3d.js` | 3,227 | Monolith (reduced) | Game loop, state init, input, scene setup, all remaining subsystems |

### New Modules to Create

| Module | Purpose | Dependencies | Primary Track |
|--------|---------|-------------|---------------|
| `js/3d/audio.js` | Sound manager: load, play-by-ID, random variant pools, volume control, mute toggle | None (Web Audio API) | Track B |
| `js/3d/weapons.js` | All 10 weapon fire logic, projectile/effect creation, cooldown calc | constants.js, terrain.js, utils.js | Track A/E |
| `js/3d/howls.js` | 10 howl type definitions and multiplier computation (renamed from scrolls) | constants.js | Track A |
| `js/3d/items.js` | 25 item definitions with rarity, drop weight tables, equip/stack logic | constants.js | Track A |
| `js/3d/combat.js` | Shared combat resolution: damageEnemy, killEnemy, findNearestEnemy | constants.js, terrain.js | Track E |
| `js/3d/enemies.js` | Enemy creation, tier system, AI movement, merge system, disposal | constants.js, terrain.js, combat.js, utils.js | Track E |
| `js/3d/spawning.js` | Ambient spawn, wave event spawn, difficulty scaling | constants.js, enemies.js | Track E |
| `js/3d/level-up.js` | Upgrade menu generation, choice pool logic, randomized pools per run | constants.js, weapons.js, howls.js, items.js | Track A |
| `js/3d/powerups.js` | 18 powerup effect updates, activation/deactivation | constants.js | Track E |
| `js/3d/platforms.js` | Platform generation, lifecycle, plateau system | constants.js, terrain.js | Track C |
| `js/3d/feedback.js` | Inline feedback on game-over, localStorage analytics | None | Track D |

### Module Interface Summary

**`js/3d/audio.js`**
```
export function createAudioManager(soundBasePath)
  -> { play(soundId), setVolume(0-1), mute(), unmute(), isMuted(), preloadAll() }
// Sound IDs match the registry in sound-pack-alpha/sound-ids.md
// Internally picks random variant from pool for each ID
```

**`js/3d/combat.js`**
```
export function findNearestEnemy(enemies, px, pz, range) -> enemy|null
export function damageEnemy(e, dmg, st, scene, callbacks) -> void
export function killEnemy(e, st, scene, callbacks) -> void
```

**`js/3d/weapons.js`**
```
export const WEAPON_DEFS = { ...10 weapon types with fire logic... }
export function getWeaponDamage(w, scrolls, augmentMult, dmgBoost) -> number
export function getWeaponCooldown(w, scrolls, atkSpeedBoost) -> number
export function getWeaponRange(w, scrolls) -> number
export function fireWeapon(w, playerState, enemies, scene, terrain, audio) -> void
export function updateWeaponProjectiles(dt, st, scene, terrain, audio) -> void
export function updateWeaponEffects(dt, st, scene) -> void
```

**`js/3d/howls.js`**
```
export const HOWL_TYPES = { ...10 howl definitions... }
export function getDmgMult(howls) -> number
export function getCooldownMult(howls) -> number
export function getRangeMult(howls) -> number
export function getProjectileBonus(howls) -> number
```

**`js/3d/items.js`**
```
export const ITEMS_ALPHA = [ ...25 items with rarity field... ]
export const RARITY_TIERS = { stuff, goodStuff, shinyStuff, reallyCoolStuff }
export function rollItemDrop(difficultyMult) -> itemDef|null
export function applyItem(itemDef, st) -> void
export function getRarityColor(rarity) -> string
```

**`js/3d/enemies.js`**
```
export function createEnemy(x, z, baseHp, tier, scene, terrain) -> enemyObj
export function disposeEnemy(e, scene) -> void
export function updateEnemyAI(dt, enemies, playerState, platforms, terrain, totemMults) -> void
export function updateMerging(enemies, scene, terrain, audio) -> mergeEvents[]
```

**`js/3d/feedback.js`**
```
export function renderInlineFeedback(ctx, st, W, H) -> void
export function saveFeedbackResponse(questionId, answer) -> void
export function recordRunAnalytics(st) -> void
export function getStoredAnalytics() -> object[]
```

---

## 3. Work Streams (Parallel Tracks)

Six tracks organized so that no two tracks modify the same file at the same time. See individual track files for full per-task specifications.

### Track Overview

| Track | Focus | Key Files Created/Modified | Effort | Blocked By |
|-------|-------|---------------------------|--------|------------|
| **A: Content Expansion** | 4 weapons, 4 howls, 14 items, rarity, run randomization | `js/3d/weapons.js`, `js/3d/howls.js`, `js/3d/items.js`, `js/3d/level-up.js`, `js/3d/constants.js` | 22-32 hrs | Track E (combat.js must exist for weapon damage) |
| **B: Audio Integration** | Sound manager, 40 SFX hookups, volume control | `js/3d/audio.js`, event hookups in game3d.js | 8-10 hrs | None (can start Day 1) |
| **C: Terrain & Platforms** | Single biome, floor fix, terrain objects, plateaus | `js/3d/terrain.js`, `js/3d/platforms.js` | 10-14 hrs | None (can start Day 1) |
| **D: UI & Readability** | Chunky charge bar, HUD readability, game-over feedback, Chill Mode | `js/3d/hud.js`, `js/3d/feedback.js` | 10-15 hrs | Track A (needs rarity colors), Track B (needs audio hookups for charge SFX) |
| **E: Core Systems** | Extract combat.js, enemies.js, spawning.js, powerups.js; tiered merge | Extraction from `js/game3d.js` into new modules | 16-22 hrs | None (can start Day 1) |
| **F: Bug Fixes & Stability** | P0/P1 bugs, browser compat, performance, 2D gate, deployment | `js/game3d.js`, `js/game.js`, `index.html` | 8-12 hrs | None (can start Day 1) |

### Parallel Execution Map

```
          Day 1-3         Day 4-10        Day 11-18       Day 19-24      Day 25-27
         ─────────       ──────────      ───────────     ───────────    ──────────
Track F: [Bug fixes]
         [2D gate  ]
         [CDN pin  ]

Track E: [combat.js ]───[enemies.js]───[spawning.js]───[powerups.js]
         [extract   ]   [extract   ]   [extract    ]   [extract    ]

Track B: [audio.js  ]───[event     ]───[volume     ]
         [manager   ]   [hookups   ]   [control    ]

Track C: [single    ]───[floor fix ]───[terrain    ]───[plateaus   ]
         [biome     ]   [+ objects ]   [variety    ]   [system     ]

Track A:                [howl      ]───[4 howls    ]───[4 weapons  ]───[rarity   ]───[14 items]
                        [rename    ]   [+ defs     ]   [+ fire     ]   [system   ]   [+ pools ]

Track D:                               [charge bar ]───[HUD pass   ]───[game over]───[feedback]
                                       [chunky     ]   [readability]   [+ Chill  ]   [inline  ]
```

**Key dependency arrows:**
- Track A weapons need Track E combat.js (for damageEnemy) -- combat.js extracted by Day 4-7
- Track D charge bar needs Track B audio (for charge SFX) -- audio manager done by Day 7
- Track D rarity colors need Track A item definitions -- items defined by Day 16

---

## 4. TDD Strategy

### Test Infrastructure

The project has zero existing tests and a zero-build-step constraint. The recommended test runner is a **simple HTML test page** (`tests/index.html`) that loads test modules and runs assertions in the browser console.

**Test harness file: `tests/test-runner.js`**
```javascript
// Minimal assertion library -- no npm, no build step
let passed = 0, failed = 0;
export function assert(condition, msg) {
  if (condition) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}
export function assertClose(a, b, epsilon, msg) {
  assert(Math.abs(a - b) < epsilon, msg);
}
export function assertEqual(a, b, msg) {
  assert(a === b, `${msg} (expected ${b}, got ${a})`);
}
export function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0;
}
```

**Test harness file: `tests/index.html`**
```html
<script type="module">
  // Import and run all test suites
  import './test-constants.js';
  import './test-terrain.js';
  import './test-combat.js';
  import './test-howls.js';
  import './test-items.js';
  import './test-weapons.js';
  import './test-audio.js';
  import { summary } from './test-runner.js';
  summary();
</script>
```

### Test Categories

#### Unit Tests (pure functions, no DOM/Three.js needed)

| Module | Testable Functions | Test Count |
|--------|--------------------|------------|
| `terrain.js` | `noise2D`, `smoothNoise`, `terrainHeight`, `getBiome`, `getChunkKey` | 8-10 |
| `howls.js` | `getDmgMult`, `getCooldownMult`, `getRangeMult`, `getProjectileBonus` | 8-10 |
| `items.js` | `rollItemDrop` (distribution), `getRarityColor`, rarity weight validation | 6-8 |
| `weapons.js` | `getWeaponDamage`, `getWeaponCooldown`, `getWeaponRange` (stat calc only) | 10-12 |
| `combat.js` | `findNearestEnemy` (mock enemies), damage calc with multipliers | 6-8 |
| `audio.js` | Sound ID registry completeness, pool size validation | 4-6 |
| `feedback.js` | `recordRunAnalytics` (mock st), localStorage read/write | 4-5 |
| `constants.js` | All 10 weapons have required fields, all 10 howls have required fields, all 25 items have rarity | 5-8 |

**Target: 50-65 unit tests written BEFORE implementation.**

#### Integration Tests (require DOM mocking or browser)

| Test Scenario | Modules Involved | Method |
|---------------|-----------------|--------|
| Weapon fire -> enemy takes damage -> enemy dies -> XP gem drops | weapons, combat, enemies | Browser test with mock scene |
| Level-up offers 6 of 10 weapons (pool randomization) | level-up, weapons, howls | Browser test, verify exclusion |
| Item drop respects rarity weights (1000 roll statistical test) | items | Browser test, chi-squared check |
| Audio plays on game event (melee hit triggers sfx_melee_hit) | audio, combat | Browser test with AudioContext mock |
| Howl stacking correctly modifies weapon damage | howls, weapons | Pure JS test |

#### Manual Playtest Checks (per-track)

Each track spec includes a "Playtest Verification" section listing specific scenarios to manually verify. These are things that cannot be automated without a full game harness (visual rendering, timing, subjective readability).

### TDD Workflow Per Task

1. **Read the task spec** (from the track detail file).
2. **Write the test file first** (e.g., `tests/test-howls.js`). Tests will fail because the module does not exist yet.
3. **Create the module** with exported function stubs that throw `Error('not implemented')`.
4. **Implement until tests pass.**
5. **Run the full test suite** (`tests/index.html`) to verify no regressions.
6. **Manual playtest** the specific scenarios listed in the task spec.
7. **Commit.**

---

## 5. Dependency Graph

### ASCII Dependency Graph

```
                    +-----------+
                    | constants |  (Layer 0 -- already extracted)
                    +-----+-----+
                          |
            +-------------+-------------+
            |             |             |
       +----v----+  +-----v-----+ +----v----+
       | terrain |  | utils.js  | | (audio) |   <-- Layer 1 (terrain extracted; audio new)
       +----+----+  +-----+-----+ +----+----+
            |             |             |
    +-------+-------+     |             |
    |       |       |     |             |
+---v--+ +--v---+ +-v----+v-+     +----v----+
|platfm| |shrine| |player   |     | (howls) |  <-- Layer 2
|      | |totem | |model    |     | (items) |
+---+--+ +--+---+ +---------+     +----+----+
    |       |                           |
    |  +----v----+                 +----v-----+
    |  |         |                 |          |
    +--v (combat)+<----------------+ (weapons)|  <-- Layer 3
       +----+----+                 +----+-----+
            |                           |
       +----v------+              +-----v-----+
       | (enemies) |              | (level-up)|  <-- Layer 4
       +----+------+              +-----------+
            |
       +----v-------+
       | (spawning)  |   <-- Layer 5
       +----+--------+
            |
       +----v-------+
       | (powerups)  |   <-- Layer 5
       +-------------+

       +----v-------+
       |  (hud)     |   <-- reads everything, writes nothing (already extracted)
       +----+-------+
            |
       +----v-------+
       | (feedback)  |   <-- Layer 6 (game-over only)
       +-------------+

       +----v-------+
       | game3d.js  |   <-- Orchestrator (Layer 7 -- slimmed to ~500 lines)
       +-------------+
```

Parenthesized modules `(name)` are new modules to create. Non-parenthesized modules already exist.

### Critical Path

The critical path to alpha is:

```
Day 1:  Fix P0 bugs (Track F) + Start combat.js extraction (Track E) + Start audio manager (Track B)
Day 3:  combat.js done -> unblocks weapon extraction (Track A/E)
Day 4:  enemies.js extraction starts (Track E)
Day 7:  Audio manager done -> unblocks all audio hookups
Day 10: Single biome + floor fix done (Track C) -> unblocks plateau work
Day 11: Howl rename + 4 new howls done -> constants updated for Track A weapons
Day 14: 4 new weapons fire logic done (Track A) -- this is the longest single task
Day 18: 14 new items + rarity system done (Track A)
Day 20: Chunky charge bar done (Track D)
Day 22: Tiered merge ratios + merge VFX done (Track E/D)
Day 24: Game-over feedback + Chill Mode done (Track D)
Day 25: Developer QA gate
Day 27: Deploy
```

**The critical path runs through Track A (content expansion)**, specifically the 4 new weapons with novel fire patterns. If any single weapon exceeds 4 hours of development, simplify it to a reskinned existing weapon type and iterate post-alpha.

---

## 6. Per-Task Specifications

Full per-task specifications are in the track detail files. Below is a summary index.

### Track A: Content Expansion (see `track-a-content.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| A-1 | Rename scrolls to howls (code + UI) | 1-2 hrs | constants.js, hud.js, game3d.js | None |
| A-2 | Define 4 new howl types | 1-2 hrs | howls.js (new) | A-1 |
| A-3 | Implement howl multiplier functions | 1 hr | howls.js | A-2 |
| A-4 | Define 4 new weapon types (constants) | 2-3 hrs | constants.js or weapons.js | None |
| A-5 | Implement Mud Bomb fire logic | 2-3 hrs | weapons.js | E-1 (combat.js) |
| A-6 | Implement Beehive Launcher fire logic | 3-4 hrs | weapons.js | E-1 |
| A-7 | Implement Snowball Turret fire logic | 3-4 hrs | weapons.js | E-1 |
| A-8 | Implement Stink Line fire logic | 2-3 hrs | weapons.js | E-1 |
| A-9 | Define 25 items with rarity tiers | 2-3 hrs | items.js (new) | None |
| A-10 | Implement rarity drop system | 2-3 hrs | items.js | A-9 |
| A-11 | Implement 14 new item effects | 4-6 hrs | items.js, game3d.js | A-9 |
| A-12 | Randomized weapon + howl pool per run | 1-2 hrs | level-up.js (new) | A-2, A-4 |
| A-13 | Level-up card UI update (rarity borders) | 2-3 hrs | hud.js | A-9 |

### Track B: Audio Integration (see `track-b-audio.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| B-1 | Create audio manager module | 3-4 hrs | audio.js (new) | None |
| B-2 | Convert Bite-1.mp3 to .ogg | 30 min | sound-pack-alpha/ | None |
| B-3 | Hook audio to combat events (~8 events) | 1-2 hrs | game3d.js | B-1, E-1 |
| B-4 | Hook audio to weapon events (~6 events) | 1-2 hrs | game3d.js | B-1 |
| B-5 | Hook audio to movement/powerup events (~6 events) | 1-2 hrs | game3d.js | B-1 |
| B-6 | Hook audio to zombie events (~4 events) | 1 hr | game3d.js | B-1 |
| B-7 | Volume control UI (mute toggle + slider) | 1 hr | hud.js, audio.js | B-1 |

### Track C: Terrain & Platforms (see `track-c-terrain.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| C-1 | Strip desert/plains from terrain gen | 1-2 hrs | terrain.js | None |
| C-2 | Fix floor clipping (entity Y resolution) | 2-3 hrs | game3d.js, terrain.js | None |
| C-3 | Add terrain object variety (rocks, logs, mushrooms, stumps) | 2-3 hrs | terrain.js | C-1 |
| C-4 | Implement plateau system | 4-6 hrs | platforms.js (new) | C-1, C-2 |

### Track D: UI & Readability (see `track-d-ui.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| D-1 | Chunky segmented charge bar | 3-4 hrs | hud.js | None |
| D-2 | General HUD readability pass | 2-3 hrs | hud.js | A-1 (howl rename) |
| D-3 | Game-over screen upgrade (stats + inline feedback) | 2-3 hrs | hud.js, feedback.js (new) | None |
| D-4 | Chill Mode difficulty | 1-2 hrs | constants.js, game3d.js | None |
| D-5 | Character select cleanup | 1-2 hrs | game3d.js or game.js | None |
| D-6 | Silent analytics (localStorage) | 1-2 hrs | feedback.js | None |

### Track E: Core Systems Extraction (see `track-e-core.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| E-1 | Extract combat.js (damageEnemy, killEnemy, findNearestEnemy) | 3-4 hrs | combat.js (new), game3d.js | None |
| E-2 | Extract enemies.js (creation, AI, disposal) | 4-6 hrs | enemies.js (new), game3d.js | E-1 |
| E-3 | Implement tiered merge ratios (4 tiers) | 3-4 hrs | enemies.js | E-2 |
| E-4 | Merge visual punch-up (flash, bounce, particles, sound) | 2-3 hrs | enemies.js | E-3, B-1 |
| E-5 | Extract spawning.js | 2-3 hrs | spawning.js (new), game3d.js | E-2 |
| E-6 | Extract powerups.js | 3-4 hrs | powerups.js (new), game3d.js | E-1 |

### Track F: Bug Fixes & Stability (see `track-f-stability.md`)

| Task ID | Task | Effort | Files | Depends On |
|---------|------|--------|-------|------------|
| F-1 | Fix P0: for-in mutation (BD-16) | 30 min | game3d.js | None |
| F-2 | Fix P0: event listener leak (BD-17) | 30 min | game3d.js | None |
| F-3 | Fix P1: cooldown timer drift | 1-2 hrs | game3d.js | None |
| F-4 | Fix P1: opacity guard | 30 min | game3d.js | None |
| F-5 | Fix P1: state cleanup on restart | 2-3 hrs | game3d.js | None |
| F-6 | 2D mode gate | 30 min | game.js | None |
| F-7 | Pin Three.js CDN with SRI hash | 30 min | index.html | None |
| F-8 | Browser compatibility check (Chrome, Firefox, Edge) | 1-2 hrs | Manual testing | F-1 through F-5 |
| F-9 | Profiling session (10-min run, Chrome DevTools) | 1-2 hrs | Manual testing | F-1 through F-5 |
| F-10 | Deployment to itch.io or GitHub Pages | 1-2 hrs | Build/upload | All tracks complete |

---

## Appendix: File Change Matrix

This matrix shows which track modifies which file, ensuring no two concurrent tracks touch the same file.

| File | Track A | Track B | Track C | Track D | Track E | Track F |
|------|---------|---------|---------|---------|---------|---------|
| `js/3d/constants.js` | WRITE (A-1,A-4) | read | read | WRITE (D-4) | read | read |
| `js/3d/terrain.js` | read | read | WRITE (C-1,C-2,C-3) | read | read | read |
| `js/3d/hud.js` | WRITE (A-13) | WRITE (B-7) | read | WRITE (D-1,D-2,D-3) | read | read |
| `js/3d/player-model.js` | read | read | read | read | read | read |
| `js/3d/utils.js` | read | read | read | read | read | read |
| `js/game3d.js` | read | WRITE (B-3..B-6) | read | read | WRITE (E-1..E-6) | WRITE (F-1..F-5) |
| `js/game.js` | read | read | read | read | read | WRITE (F-6) |
| `index.html` | read | read | read | read | read | WRITE (F-7) |
| `js/3d/audio.js` | read | WRITE (B-1) | read | read | read | read |
| `js/3d/weapons.js` | WRITE (A-5..A-8) | read | read | read | read | read |
| `js/3d/howls.js` | WRITE (A-2,A-3) | read | read | read | read | read |
| `js/3d/items.js` | WRITE (A-9..A-11) | read | read | read | read | read |
| `js/3d/combat.js` | read | read | read | read | WRITE (E-1) | read |
| `js/3d/enemies.js` | read | read | read | read | WRITE (E-2..E-4) | read |
| `js/3d/spawning.js` | read | read | read | read | WRITE (E-5) | read |
| `js/3d/powerups.js` | read | read | read | read | WRITE (E-6) | read |
| `js/3d/level-up.js` | WRITE (A-12) | read | read | read | read | read |
| `js/3d/platforms.js` | read | read | WRITE (C-4) | read | read | read |
| `js/3d/feedback.js` | read | read | read | WRITE (D-3,D-6) | read | read |

**Conflict zones (sequential, not parallel):**
- `constants.js`: Track A (howl rename, weapon defs) and Track D (Chill Mode) both write. Schedule A-1 before D-4, or coordinate.
- `hud.js`: Tracks A (rarity borders), B (volume control), and D (charge bar, readability) all write. Schedule B-7 and A-13 after D-1/D-2 complete.
- `game3d.js`: Tracks B (audio hookups), E (extractions), and F (bug fixes) all write. F completes first (Days 1-3), then E and B work on separate line ranges.

**Resolution:** Track F finishes Days 1-3. Track E works on game3d.js Days 4-18. Track B hooks audio into game3d.js only AFTER Track E has extracted the relevant subsystems, or hooks into the newly extracted modules instead. Track A and D work on separate new files and only touch shared files (constants.js, hud.js) in their designated time windows.
