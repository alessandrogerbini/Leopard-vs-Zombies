# Code Review Beads — Leopard vs Zombies

Generated from: `code-review-1.md` (Linus Torvalds-style code review, 2026-02-22)

---

## Summary Table

| BD | Title | Category | Priority | Scope | Dependencies |
|----|-------|----------|----------|-------|--------------|
| BD-16 | Fix `for...in` mutation bug in platform unloading | Bug Fix | P0-Critical | Small | -- |
| BD-17 | Remove leaked event listeners on mode switch | Bug Fix | P0-Critical | Small | -- |
| BD-18 | Clamp weapon cooldown timer to prevent negative drift | Bug Fix | P1-High | Small | -- |
| BD-19 | Guard floating-point division in effect opacity | Bug Fix | P1-High | Small | -- |
| BD-20 | Clean up incomplete state on 3D-to-2D mode switch | Bug Fix | P1-High | Small | -- |
| BD-21 | Replace `delete` on objects with `Map` for chunk data | Performance | P1-High | Medium | -- |
| BD-22 | Use squared distances in enemy range checks | Performance | P1-High | Small | -- |
| BD-23 | Replace `Array.filter()` per-frame enemy cleanup with swap-delete | Performance | P1-High | Small | -- |
| BD-24 | Fix recursive Three.js disposal for groups/children | Performance | P1-High | Medium | -- |
| BD-25 | Isolate underscore input flags into dedicated key-state module | Refactor | P2-Medium | Medium | -- |
| BD-26 | Extract magic numbers into named constants | Code Quality | P2-Medium | Medium | -- |
| BD-27 | Refactor `items.js` copy-paste crate functions into factory | Code Quality | P2-Medium | Medium | -- |
| BD-28 | Unify or document leaderboard separation (2D vs 3D) | Code Quality | P2-Medium | Small | -- |
| BD-29 | Consolidate augment state into single source of truth | Refactor | P2-Medium | Medium | -- |
| BD-30 | Batch particle opacity updates for poison cloud effects | Performance | P2-Medium | Medium | BD-24 |
| BD-31 | Rename `st` / `s` state variables for consistency | Code Quality | P3-Low | Large | BD-25 |
| BD-32 | Break `game3d.js` monolith into modules | Architecture | P3-Low | Large | BD-25, BD-26, BD-29, BD-31 |

---

## P0 -- Critical (Ship-blocking bugs)

### BD-16: Fix `for...in` mutation bug in platform unloading
**Category:** Bug Fix
**Priority:** P0-Critical
**File(s):** `js/game3d.js` (lines ~671-677)
**Description:**
The platform unloading loop iterates `platformsByChunk` with `for...in` while calling `unloadPlatforms()`, which deletes keys from the same object during iteration. This is undefined behavior in JavaScript -- the iteration may skip keys or process already-deleted keys, causing platforms to persist as invisible collision surfaces or orphaned Three.js objects.

Relevant code:
```javascript
for (const key in platformsByChunk) {
  const [cx, cz] = key.split(',').map(Number);
  if (Math.abs(cx - pcx) > VIEW_DIST + 1 || ...) {
    unloadPlatforms(cx, cz);  // Modifies platformsByChunk during iteration!
  }
}
```

**Acceptance Criteria:**
- Collect keys into an array before iterating: `Object.keys(platformsByChunk).forEach(...)` or build a `keysToUnload` list, then process after the loop.
- No platforms are skipped or double-processed during chunk unloading.
- Manual test: fly quickly across the map and verify no ghost platforms remain.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-17: Remove leaked event listeners on mode switch
**Category:** Bug Fix
**Priority:** P0-Critical
**File(s):** `js/game3d.js` (keydown/keyup listener setup, cleanup function at ~lines 2791-2830)
**Description:**
The 3D mode registers `window.addEventListener('keydown', ...)` and `window.addEventListener('keyup', ...)` with anonymous arrow functions. These are never removed when the player returns to 2D mode, because anonymous functions cannot be passed to `removeEventListener`. The handlers continue firing after mode switch, wasting CPU and potentially interfering with 2D input.

Relevant code:
```javascript
window.addEventListener('keydown', e => { keys3d[e.code] = true; });
window.addEventListener('keyup', e => { keys3d[e.code] = false; });
```

**Acceptance Criteria:**
- Store handler references in named variables (`const handleKeyDown = ...`).
- In the cleanup function (end of `launch3DGame`), call `window.removeEventListener('keydown', handleKeyDown)` and same for keyup.
- After switching back to 2D mode, verify with `getEventListeners(window)` (Chrome DevTools) that no 3D handlers remain.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

## P1 -- High (Correctness and performance issues)

### BD-18: Clamp weapon cooldown timer to prevent negative drift
**Category:** Bug Fix
**Priority:** P1-High
**File(s):** `js/game3d.js` (weapon update loop, ~lines 1250-1660)
**Description:**
Weapon cooldown is decremented by `dt` each frame without clamping:
```javascript
w.cooldownTimer -= dt;
if (w.cooldownTimer <= 0) {
  w.cooldownTimer = getWeaponCooldown(w);
}
```
On a lag spike (large `dt`), `cooldownTimer` goes deeply negative, and the weapon fires immediately on the next frame. This creates burst-fire behavior during frame drops.

**Acceptance Criteria:**
- Change to `w.cooldownTimer = Math.max(0, w.cooldownTimer - dt);`
- Verify that during simulated lag (e.g., Chrome throttle to 5fps), weapons do not fire multiple times in rapid succession.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-19: Guard floating-point division in effect opacity
**Category:** Bug Fix
**Priority:** P1-High
**File(s):** `js/game3d.js` (line ~1818)
**Description:**
Effect opacity is calculated as `eff.life / 0.3 * 0.5` without clamping. When `eff.life` is near zero or negative (due to floating-point imprecision or large `dt`), this can produce values outside [0,1], including NaN or Infinity, which Three.js materials handle unpredictably.

Relevant code:
```javascript
if (eff.mesh.material) eff.mesh.material.opacity = eff.life / 0.3 * 0.5;
```

**Acceptance Criteria:**
- Wrap in `Math.min(1, Math.max(0, ...))` clamp.
- Audit all other opacity/alpha calculations in the weapon effects section (~lines 1790-1840) for similar unclamped divisions.
- No visual artifacts (black rectangles, invisible meshes) when effects expire.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-20: Clean up incomplete state on 3D-to-2D mode switch
**Category:** Bug Fix
**Priority:** P1-High
**File(s):** `js/game.js` (lines ~213-219, `onReturn` callback)
**Description:**
When returning from 3D to 2D mode, the `onReturn` callback clears `keys` and sets `gameState = 'title'` but does not reset 2D game state arrays (`state.particles`, `state.floatingTexts`, `state.zombies`, etc.). If the player was mid-game in 2D before switching to 3D, stale state persists and may cause visual glitches or crashes when re-entering 2D gameplay.

Relevant code:
```javascript
onReturn: () => {
  canvas.style.display = '';
  Object.keys(keys).forEach(k => { keys[k] = false; });
  state.gameState = 'title';
  startGameLoop();
}
```

**Acceptance Criteria:**
- Call a full state reset function (or inline reset of `state.particles = []`, `state.floatingTexts = []`, `state.zombies = []`, `state.items = []`, etc.) in `onReturn`.
- Verify: start 2D game, switch to 3D mid-gameplay, return to 2D -- title screen is clean with no leftover particles or enemies.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-21: Replace `delete` on objects with `Map` for chunk data
**Category:** Performance
**Priority:** P1-High
**File(s):** `js/game3d.js` (lines ~570, 657, and all chunk/platform data structures)
**Description:**
The `delete` operator on plain objects (`delete chunkMeshes[key]`, `delete platformsByChunk[key]`) causes V8 to deoptimize the object by creating hidden class transitions. For frequently mutated key-value stores like chunk data, this fragments the internal hash table and degrades property access performance over time.

**Acceptance Criteria:**
- Convert `chunkMeshes`, `platformsByChunk`, `st.shrinesByChunk`, and any other `{}` used as key-value stores with dynamic add/delete into `new Map()`.
- Replace `obj[key]` with `map.get(key)`, `obj[key] = val` with `map.set(key, val)`, `delete obj[key]` with `map.delete(key)`, `key in obj` with `map.has(key)`, `for...in` with `map.forEach` or `for...of map`.
- No regression: chunks still load/unload correctly during gameplay.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None (but resolves the root cause that makes BD-16 worse)

---

### BD-22: Use squared distances in enemy range checks
**Category:** Performance
**Priority:** P1-High
**File(s):** `js/game3d.js` (auto-attack ~lines 2072-2117, enemy AI ~lines 1972-2021, weapon projectile hit detection ~lines 2204-2238)
**Description:**
Every distance check between player and enemies (or projectiles and enemies) uses `Math.sqrt(dx*dx + dz*dz)`. With 100+ enemies per frame, this is 100+ unnecessary sqrt calls. Since we only compare against a threshold, squared distance comparisons are mathematically equivalent and significantly cheaper.

Relevant code:
```javascript
const enemyDist = Math.sqrt(dx * dx + dz * dz);
if (enemyDist < rangeLimit) { /* attack */ }
```

**Acceptance Criteria:**
- Replace all `Math.sqrt(dx*dx + dz*dz)` distance checks used for threshold comparisons with `dx*dx + dz*dz < threshold*threshold`.
- Pre-compute `rangeLimitSq = rangeLimit * rangeLimit` outside the inner loop where the threshold is constant.
- Keep `Math.sqrt` only where the actual distance value is needed (e.g., normalization for movement vectors).
- Profile: measure frame time before/after with 200+ enemies on screen.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-23: Replace per-frame `Array.filter()` enemy cleanup with swap-delete
**Category:** Performance
**Priority:** P1-High
**File(s):** `js/game3d.js` (line ~3108)
**Description:**
Dead enemies are cleaned up with `st.enemies = st.enemies.filter(e => e.alive)`, which allocates a new array every single frame. With hundreds of enemies, this is an O(n) allocation per frame that pressures the garbage collector.

Relevant code:
```javascript
st.enemies = st.enemies.filter(e => e.alive);
```

**Acceptance Criteria:**
- Replace with an in-place compaction or swap-delete pattern:
  ```javascript
  let writeIdx = 0;
  for (let i = 0; i < st.enemies.length; i++) {
    if (st.enemies[i].alive) {
      st.enemies[writeIdx++] = st.enemies[i];
    }
  }
  st.enemies.length = writeIdx;
  ```
- Also audit `st.weaponProjectiles`, `st.weaponEffects`, `st.xpGems`, and any other arrays using `.filter()` or `.splice()` in the game loop for the same pattern.
- No enemies visually persist after dying.

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-24: Fix recursive Three.js disposal for groups/children
**Category:** Performance
**Priority:** P1-High
**File(s):** `js/game3d.js` (decoration disposal ~line 577, cleanup function ~lines 2791-2830, `disposeEffectMesh`)
**Description:**
Current disposal code only disposes top-level mesh geometry/material but does not recursively traverse child objects. Groups containing nested meshes (decorations, player model parts, weapon effects) leak GPU memory because child geometries and materials are never disposed.

Relevant code:
```javascript
d.meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
```

**Acceptance Criteria:**
- Create a shared `disposeGroup(group)` utility function:
  ```javascript
  function disposeGroup(group) {
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
    scene.remove(group);
  }
  ```
- Replace all manual disposal sites (decoration unloading, effect cleanup, game-over cleanup) with calls to `disposeGroup`.
- Verify with Chrome DevTools Memory tab: GPU memory does not grow unbounded during a 10-minute session.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None

---

## P2 -- Medium (Maintainability and moderate performance)

### BD-25: Isolate underscore input flags into dedicated key-state module
**Category:** Refactor
**Priority:** P2-Medium
**File(s):** `js/game.js` (lines ~121-130 and all `state._escHeld`, `state._enterHeld`, `state._selectLeftHeld`, etc.)
**Description:**
Transient per-frame input flags (`_escHeld`, `_enterHeld`, `_selectLeftHeld`, `_selectRightHeld`, etc.) are stored directly on the `state` object with underscore prefixes. They are not declared in the initial state and are created implicitly. This pollutes the game state with input implementation details, making serialization and debugging harder.

**Acceptance Criteria:**
- Create a module-level `const keyHeld = {}` object (or a small `InputState` module) separate from game state.
- Implement `isKeyPressedThisFrame(code)` utility:
  ```javascript
  function isKeyPressedThisFrame(code) {
    const wasHeld = keyHeld[code] || false;
    const isNowHeld = keys[code];
    keyHeld[code] = isNowHeld;
    return isNowHeld && !wasHeld;
  }
  ```
- Replace all `state._*Held` patterns in `game.js` with calls to `isKeyPressedThisFrame()`.
- Remove all `state._*` properties.
- `state` object should contain only game-meaningful data (no input tracking).

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None

---

### BD-26: Extract magic numbers into named constants
**Category:** Code Quality
**Priority:** P2-Medium
**File(s):** `js/game3d.js` (throughout, especially state init ~line 147-170)
**Description:**
Numerous magic numbers are scattered throughout `game3d.js` without explanation:
- `attackSpeed: 1.2` (line ~152)
- `collectRadius: 2` (line ~156)
- `zombieDmgMult: diffData.hpMult >= 1.0 ? 2 : diffData.hpMult >= 0.5 ? 3 : 4` (line ~164) -- nested ternary with undocumented thresholds
- Wave timing constants, spawn distances, damage values, etc.

**Acceptance Criteria:**
- Create a `GAME_CONSTANTS` or `CONFIG` section at the top of `game3d.js` (near existing `POWERUPS_3D`, `WEAPON_TYPES`, etc.) containing:
  - `BASE_ATTACK_SPEED = 1.2`
  - `XP_COLLECT_RADIUS = 2`
  - `DIFFICULTY_ZOMBIE_DMG = { easy: 2, medium: 3, hard: 4 }`
  - And all other numeric literals that appear more than once or whose meaning is non-obvious.
- Replace nested ternary for `zombieDmgMult` with a lookup function or object.
- Each constant has a brief inline comment explaining its purpose.
- No behavioral changes.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None

---

### BD-27: Refactor `items.js` copy-paste crate functions into factory
**Category:** Code Quality
**Priority:** P2-Medium
**File(s):** `js/items.js` (lines ~102-351)
**Description:**
Five crate types (armor, glasses, sneakers, cleats, horse) each have separate `spawn*Crates()` and `update*Pickups()` functions that follow the identical pattern with only the crate type name differing. This is ~250 lines of duplicated logic.

Relevant pattern:
```javascript
export function spawnArmorCrates() { ... }
export function updateArmorPickups() { ... }
export function spawnGlassesCrates() { ... }
export function updateGlassesPickups() { ... }
// ... repeated 5 times
```

**Acceptance Criteria:**
- Create a `createCrateManager(crateType, config)` factory function that returns `{ spawn, update }`.
- Each crate type is defined as a config object with type-specific properties (sprite, effect, etc.).
- Replace all 5 pairs of functions with factory-generated managers.
- Existing exports still work (either re-export from factory or update callers in `game.js`).
- Total lines for crate logic reduced by at least 50%.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None

---

### BD-28: Unify or document leaderboard separation (2D vs 3D)
**Category:** Code Quality
**Priority:** P2-Medium
**File(s):** `js/game.js` (lines ~32-50), `js/game3d.js` (`saveScore3d()` ~lines 200-212)
**Description:**
2D mode uses one leaderboard (`state.leaderboard` loaded at `game.js` lines 32-50). 3D mode uses a separate leaderboard (`s.leaderboard3d` / `saveScore3d()`). It is unclear whether this separation is intentional (different game modes = different scoreboards) or accidental (incomplete refactoring).

**Acceptance Criteria:**
One of:
1. **If intentional:** Add comments at both leaderboard sites explaining why they are separate. Use distinct localStorage keys with clear naming (`leaderboard_2d`, `leaderboard_3d`). Document in a constants section.
2. **If unintentional:** Merge into a single leaderboard with a `mode` field per entry. Shared `saveScore(mode, entry)` and `loadLeaderboard(mode)` utility.

Either way:
- LocalStorage keys are clearly named and documented.
- No data loss for existing saved scores (migration if keys change).

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-29: Consolidate augment state into single source of truth
**Category:** Refactor
**Priority:** P2-Medium
**File(s):** `js/game3d.js` (state init ~lines 236-242, augment application logic)
**Description:**
Augment state is stored in two redundant representations:
1. `st.augments{}` -- counts per augment ID (declarative)
2. `st.augmentDmgMult`, `st.augmentXpMult`, `st.augmentArmor`, `st.augmentRegen` -- computed multipliers (imperative)

When an augment is applied, `aug.apply(s)` mutates the multiplier fields directly, then the count is recorded separately. This dual representation makes save/load, reversion, and debugging impossible -- the multipliers cannot be recomputed from `augments{}` alone.

Relevant code:
```javascript
const aug = SHRINE_AUGMENTS[Math.floor(Math.random() * SHRINE_AUGMENTS.length)];
const was = (s.augments[aug.id] || 0);
aug.apply(s);
s.augments[aug.id] = was + 1;
```

**Acceptance Criteria:**
- Make `st.augments{}` the single source of truth.
- Create `applyAllAugments(s)` function that resets all multiplier fields to defaults, then recomputes them from `st.augments` counts.
- When a new augment is gained, increment `st.augments[id]`, then call `applyAllAugments(s)`.
- Remove direct mutation in individual `aug.apply()` calls (or have `applyAllAugments` call them in a loop).
- Verify: gaining 5 augments via shrines produces the same stats before and after the refactor.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** None

---

### BD-30: Batch particle opacity updates for poison cloud effects
**Category:** Performance
**Priority:** P2-Medium
**File(s):** `js/game3d.js` (~lines 1797-1810)
**Description:**
Poison cloud effects update material opacity individually for every child mesh every frame:
```javascript
if (eff.type === 'poisonCloud') {
  eff.mesh.children.forEach((c, ci) => {
    if (c.material) c.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 4 + ci) * 0.15;
  });
}
```
With 10 active poison clouds and 20 particles each, this is 200+ material property writes per frame. Each write may trigger a Three.js uniform upload.

**Acceptance Criteria:**
- Option A: Use `THREE.InstancedMesh` with a custom shader that handles per-instance opacity via an attribute buffer, updating the buffer once per frame instead of individual materials.
- Option B (simpler): Cache `clock.elapsedTime` once per frame outside the effect loop. Use a single shared material per poison cloud and animate uniform opacity on the group level (all particles same opacity per cloud). This reduces 200 writes to 10.
- Frame time with 10+ poison clouds should not measurably increase vs. 0 poison clouds.

**Estimated Scope:** Medium (50-200 lines)
**Dependencies:** BD-24 (disposal must handle instanced/shared materials correctly)

---

## P3 -- Low (Long-term quality)

### BD-31: Rename `st` / `s` state variables for consistency
**Category:** Code Quality
**Priority:** P3-Low
**File(s):** `js/game3d.js` (entire file)
**Description:**
The 3D mode uses inconsistent names for the state object:
- `const st = { ... }` at line ~147 (main state, abbreviated)
- `function drawHUD(ctx, s)` at line ~3141 (single letter parameter)
- 2D mode uses `state` and `player` (clear, readable names)

This inconsistency reduces readability, especially for new contributors.

**Acceptance Criteria:**
- Rename `st` to `state3d` (or `gameState`) throughout `game3d.js`.
- Rename `s` parameter in `drawHUD` and any other functions to match the chosen name.
- Use find-and-replace carefully: `st.` is a common substring -- must replace whole-word only (`\bst\b` or `\bst\.`).
- No behavioral changes. All references updated.

**Estimated Scope:** Large (200+ lines -- mechanical but high-touch-count)
**Dependencies:** BD-25 (input flags should be separated first so the state object is cleaner before renaming)

---

### BD-32: Break `game3d.js` monolith into modules
**Category:** Architecture
**Priority:** P3-Low
**File(s):** `js/game3d.js` (entire file, ~2830+ lines)
**Description:**
The entire 3D game is a single exported function `launch3DGame()` containing ~3600 lines. All systems -- camera, rendering, player logic, enemy spawning, item pickups, animations, UI -- live inside this function's closure. This prevents unit testing, code reuse, and makes debugging require reading thousands of lines of context.

The 2D side (`game.js` + `enemies.js` + `items.js` + `renderer.js` + `levels.js` + `state.js`) demonstrates the correct modular pattern already present in this codebase.

**Acceptance Criteria:**
- Split `game3d.js` into at least 7 modules following the Code Region Map from `sprint1.md`:
  - `js/3d/player.js` -- Player model, movement, animation, muscle growth (~300 lines)
  - `js/3d/enemies.js` -- Zombie tiers, spawning, AI, merging (~300 lines)
  - `js/3d/weapons.js` -- Weapon types, projectiles, effects, cooldowns (~400 lines)
  - `js/3d/terrain.js` -- Noise, biomes, chunk generation, platforms (~300 lines)
  - `js/3d/shrines.js` -- Shrine generation, augments, interaction (~200 lines)
  - `js/3d/hud.js` -- All HUD drawing (gameplay, pause, upgrade, game over) (~400 lines)
  - `js/3d/game3d.js` -- Main game loop, initialization, cleanup, imports from above (~500 lines)
- Each module exports functions/classes that receive shared state as parameters (dependency injection, not closure capture).
- `launch3DGame()` remains the public entry point, importing from submodules.
- Game plays identically before and after.
- Each module is independently readable without needing the full 3600-line context.

**Estimated Scope:** Large (200+ lines -- this is a major refactoring effort)
**Dependencies:** BD-25 (input isolation), BD-26 (constants extracted), BD-29 (augment consolidation), BD-31 (consistent naming)

---

## Execution Notes

### Suggested Sprint Ordering

**Sprint A -- Bug Fixes (all P0/P1, parallelizable):**
- Batch 1 (4 parallel): BD-16, BD-17, BD-18, BD-19
- Batch 2 (4 parallel): BD-20, BD-22, BD-23, BD-24

**Sprint B -- Code Quality (P2, mostly parallelizable):**
- Batch 3 (4 parallel): BD-25, BD-26, BD-27, BD-28
- Batch 4 (2 parallel): BD-29, BD-30 (BD-30 depends on BD-24 from Sprint A)

**Sprint C -- Architecture (P3, sequential):**
- BD-31 (depends on BD-25)
- BD-32 (depends on BD-25, BD-26, BD-29, BD-31)

### Conflict Notes

- BD-16 and BD-21 both touch chunk data structures (`platformsByChunk`, `chunkMeshes`). BD-16 is a quick fix; BD-21 is the deeper refactor. Do BD-16 first as a stopgap, then BD-21 replaces the data structures entirely.
- BD-22 and BD-23 both modify the enemy processing loop but touch different parts (distance calc vs. array cleanup). Safe to parallelize.
- BD-31 and BD-32 are the largest changes and should be done last, after all other beads stabilize the codebase.
- BD-24 and BD-30 are related (disposal and particle batching). BD-24 should land first so the new `disposeGroup` utility handles whatever BD-30 introduces.
