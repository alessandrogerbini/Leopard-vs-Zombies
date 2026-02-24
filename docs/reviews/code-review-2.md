# BD-150: Code Review 2 -- Linus Torvalds Edition

**Date:** 2026-02-24
**Reviewer:** Claude Opus 4.6 (automated, instructed to channel Linus)
**Scope:** js/game3d.js, js/3d/constants.js, js/3d/hud.js, js/3d/terrain.js, js/3d/player-model.js, js/3d/audio.js, js/3d/utils.js

---

## Summary

The codebase is functional and ships a playable game, which counts for something. But "it works" is a low bar. This review found **5 Critical**, **8 High**, **11 Medium**, and **7 Low** severity issues across 7 files totaling ~8,800 lines. The dominant pattern is a 5,850-line god-function (`launch3DGame`) that has accumulated copy-paste damage bypasses, duplicated logic, and framerate-dependent math. The support modules are cleaner but carry their own sins.

---

## Critical (Game-Crashing / Data-Corrupting)

### [CRITICAL] Contact damage is framerate-dependent

**File:** `js/game3d.js:4979`
**Issue:** Zombie contact damage is calculated as `15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1) * dt`. The `* dt` makes this a DPS formula, but the invincibility window (`st.invincible = 0.2`) means this only fires once per 0.2 seconds. The damage dealt in that single frame is `15 * multipliers * dt`, where `dt` is the frame time. At 60fps `dt ~= 0.016`, damage per hit = ~0.24. At 30fps `dt ~= 0.033`, damage per hit = ~0.50 -- literally double. Players on slower hardware take 2x more damage from the same zombie. Players on 144Hz monitors take half damage.
**Impact:** Game difficulty varies wildly with framerate. A boss that's manageable at 144fps becomes lethal at 30fps. This is the single most important bug in the codebase.
**Fix:** Remove `* dt` from the damage formula. Contact damage should be a flat amount per hit (e.g., `15 * tierData.dmgMult * st.zombieDmgMult`) applied once, then invincibility prevents re-application for 0.2 seconds.

### [CRITICAL] Six damage paths bypass damageEnemy(), breaking Hot Sauce ignite procs

**File:** `js/game3d.js:4255, 4361, 4411, 4504, 4554, 5156`
**Issue:** The codebase has a centralized `damageEnemy(e, dmg)` function (line 2417) that handles critical hit rolls (Gloves: 15% chance for 2x), Hot Sauce ignite procs (15% chance for 3 DPS DoT), and consistent `hurtTimer` assignment. Six damage sources bypass it entirely by writing `e.hp -= X` directly:

1. **Fire Aura** (line 4255): `e.hp -= 20 * dt`
2. **Earthquake Stomp** (line 4361): `e.hp -= stompDmg`
3. **Lightning Shield** (line 4411): `nearest.hp -= 10 * st.dmgBoost`
4. **Mirror Clone** (line 4504): `e.hp -= st.attackDamage * st.dmgBoost * 0.5`
5. **Bomb Trail** (line 4554): `e.hp -= st.attackDamage * st.dmgBoost`
6. **Power Attack** (line 5156): `e.hp -= dmg`

**Impact:** If the player has Hot Sauce stacks, none of these 6 damage sources can trigger ignite. If Gloves are equipped, Earthquake Stomp / Lightning Shield / Mirror Clone / Bomb Trail never crit. Power Attack manually checks gloves (line 5147) but still can't ignite. This silently undermines item synergies -- players who equip Hot Sauce + Lightning Shield get nothing from the combination.
**Fix:** Route all damage through `damageEnemy()`. For DoT effects (Fire Aura, stink poison) that shouldn't re-proc Hot Sauce every tick, add an optional `skipProcs` parameter: `damageEnemy(e, dmg, { skipProcs: true })`.

### [CRITICAL] Two player damage paths bypass damagePlayer(), skipping dodge, shield, and berserk checks

**File:** `js/game3d.js:2859-2864, 4805-4811`
**Issue:** The `damagePlayer(baseDmg, color)` function (line 3178) handles invincibility check, Turbo Sneakers dodge (10% chance), full armor reduction pipeline, Shield Bracelet absorption, Berserker Rage vulnerability, and floating text. Two damage sources duplicate the armor math inline but skip dodge and shield:

1. **Death Bolt** (lines 2859-2864): Copies armor reduction math but skips invincibility check, dodge check, Shield Bracelet, and Berserker Rage vulnerability.
2. **Titan Shockwave** (lines 4805-4811): Same -- copies armor math but skips invincibility, dodge, Shield Bracelet, and Berserker Rage.

**Impact:** Death Bolts and Titan Shockwaves cannot be dodged (Turbo Sneakers useless against them), cannot be absorbed by Shield Bracelet, ignore Berserker Rage vulnerability, and can hit during invincibility frames. This makes these attacks inconsistent with all other damage sources and makes Turbo Sneakers and Shield Bracelet feel broken against high-tier enemies that use these attacks most.
**Fix:** Replace both inline damage blocks with `damagePlayer(baseDmg)`. Remove the duplicated armor reduction code.

### [CRITICAL] Duplicate enemy-terrain collision runs every enemy every frame

**File:** `js/game3d.js:4850-4896`
**Issue:** Two separate collision systems run sequentially for every enemy every frame:
1. Lines 4850-4867: Iterates the *entire* `terrainState.colliders` array (all loaded chunks) with a `> 5` unit pre-check.
2. Lines 4872-4896: Iterates chunk-indexed `terrainState.collidersByChunk` (9 neighboring chunks).

Both do the exact same thing -- push the enemy out of terrain colliders. The first one (BD-103) is the original O(n) brute-force implementation. The second one (BD-113) is the optimized chunk-aware replacement. But the original was never removed.

**Impact:** Every enemy does double collision work every frame. With 50 enemies and 200 terrain colliders, that's 50 * 200 = 10,000 unnecessary distance checks per frame (the old path) on top of the efficient chunk-based checks. This is pure wasted CPU causing frame drops on weaker hardware.
**Fix:** Delete lines 4850-4867 (the old `terrainState.colliders` scan). The chunk-based system on lines 4872-4896 is the correct replacement.

### [CRITICAL] Duplicate state property `gameTime` initialized twice

**File:** `js/game3d.js:290, 422`
**Issue:** The state object `st` has `gameTime: 0` defined at both line 290 and line 422. Since JavaScript object literals process properties top-to-bottom, the second definition silently overwrites the first. Right now both are `0` so the values match, but if someone changes one without finding the other, the game will silently use the wrong initial value.
**Impact:** Latent: no current bug, but a maintenance landmine. Any future change to the `gameTime` initial value in one place will be silently overwritten by the other. With a 400-line state object, this is easy to miss.
**Fix:** Remove the duplicate at line 422. Search the state object for other duplicates.

---

## High (Gameplay Bugs / Significant Logic Errors)

### [HIGH] Hex color arithmetic can overflow between RGB channels

**File:** `js/3d/terrain.js:251, 316, 420, 433`
**Issue:** Color variation is done via integer addition/subtraction on hex color values:
```js
color + 0x111111   // line 251
color - 0x111100   // line 316
color + 0x222211   // line 420
```
Hex colors are packed RGB: `0xRRGGBB`. Integer arithmetic does not respect channel boundaries. If the green channel of `color` is `0xF0` and you add `0x11`, the green becomes `0x01` and carries into red. Example: `0x10F010 + 0x001100 = 0x110110` -- the red channel gains a phantom +1.
**Impact:** Occasional wrong colors on rocks, stumps, and fallen logs. The visual corruption is subtle because the carry is small (+1 in the next channel), but it's still mathematically wrong and can produce unexpected hues on certain base colors.
**Fix:** Use `THREE.Color` channel manipulation or manual per-channel clamped arithmetic:
```js
const r = Math.min(255, (color >> 16) + 0x11);
const g = Math.min(255, ((color >> 8) & 0xFF) + 0x11);
const b = Math.min(255, (color & 0xFF) + 0x11);
const newColor = (r << 16) | (g << 8) | b;
```

### [HIGH] Biased shuffle via sort(() => Math.random() - 0.5)

**File:** `js/game3d.js:3904, 3905, 3907, 5558`
**Issue:** Upgrade menu choices and charge shrine upgrades are shuffled using `.sort(() => Math.random() - 0.5)`. This is a well-known biased shuffle -- the comparison function is non-transitive (a > b, b > c does not imply a > c), so different sort algorithm implementations produce different probability distributions. In V8 (Chrome), TimSort with this comparator heavily favors elements near their original positions.
**Impact:** Upgrade options are not uniformly randomly distributed. Options that appear first in the pool have a higher probability of appearing in certain positions. Players who know the pool ordering (or just play a lot) will notice patterns that shouldn't exist.
**Fix:** Use Fisher-Yates shuffle:
```js
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### [HIGH] Power attack damage does not trigger Hot Sauce ignite

**File:** `js/game3d.js:5156`
**Issue:** Power attack (line 5156) applies `e.hp -= dmg` directly. While it manually handles the Gloves crit check on line 5147, it completely skips the Hot Sauce ignite proc that `damageEnemy()` provides. Since power attack is the player's primary high-damage ability (charged for up to 2 seconds), this is a significant item synergy failure.
**Impact:** Players who build Hot Sauce stacks get zero ignite procs from their most powerful attack. This is especially punishing because power attack hits all enemies in AoE range -- it should be the *best* Hot Sauce delivery mechanism, not a dead one.
**Fix:** Replace `e.hp -= dmg; e.hurtTimer = 0.2;` with `damageEnemy(e, dmg)`. Remove the redundant gloves check on line 5147 (damageEnemy handles it).

### [HIGH] Charge shrine hardcoded CHARGE_TIME = 4 duplicates constant

**File:** `js/3d/hud.js:328`
**Issue:** The HUD charge shrine progress bar uses `const CHARGE_TIME = 4` with a comment "Must match CHARGE_SHRINE_TIME constant." The actual constant `CHARGE_SHRINE_TIME` is exported from `js/3d/constants.js:388` with the value `4`. This is a classic duplication-desync waiting to happen.
**Impact:** If `CHARGE_SHRINE_TIME` is ever changed in constants.js, the HUD progress bar will display the wrong fill ratio. The comment acknowledging the duplication makes this worse, not better -- it means someone knew it was fragile and left it anyway.
**Fix:** Import `CHARGE_SHRINE_TIME` from constants.js and use it directly.

### [HIGH] Grass and flower decorations use Math.random() instead of deterministic noise

**File:** `js/3d/terrain.js:455-503`
**Issue:** `createGrassPatch()` and `createFlowerPatch()` use `Math.random()` for blade count, blade height, color selection, and position offsets. All other terrain decorations (trees, rocks, stumps, fallen logs, mushroom clusters) use `noise2D()` for deterministic placement. When a chunk is unloaded and reloaded (player walks away and returns), grass and flowers regenerate with different random values.
**Impact:** Grass patches change appearance every time the player revisits an area. While not game-breaking, it creates a subtle visual inconsistency where trees and rocks are stable landmarks but ground cover reshuffles. Players who use grass/flowers for navigation landmarks (e.g., "the big red flower patch near the plateau") will be confused.
**Fix:** Seed the randomness from the decoration's world position using `noise2D(dx * factor, dz * factor)` for each random value, matching the pattern used by other decoration types.

### [HIGH] WEAPON_CLASS_SCALING constant exported but never used

**File:** `js/3d/constants.js:141-145`
**Issue:** `WEAPON_CLASS_SCALING` defines per-class damage, cooldown, and range multipliers for `aoe`, `projectile`, and `mine` weapon classes. It is exported but never imported or referenced anywhere in the codebase.
**Impact:** Dead code that suggests an incomplete feature. Weapon balancing currently ignores these multipliers entirely, meaning all weapon classes scale identically by level. Either this was intended to be used and forgotten, or it's vestigial from a design iteration.
**Fix:** Either integrate it into `getWeaponDamage`/`getWeaponCooldown`/`getWeaponRange` calculations, or delete it. Dead code in a constants file is especially confusing because it looks authoritative.

### [HIGH] Contact damage also bypasses damagePlayer()

**File:** `js/game3d.js:4979-5001`
**Issue:** The main zombie contact damage path (lines 4979-5001) does not call `damagePlayer()`. Instead, it manually reimplements armor reduction, Shield Bracelet check, Berserker Rage vulnerability, and dodge -- but with subtle differences from the canonical function. For example, line 4982 applies `augmentArmor` as a multiplier `dmg *= (1 - st.augmentArmor)` which matches `damagePlayer`, but the order of operations differs (line 4979 applies tier/difficulty multipliers first, then armor), and the floating text format differs.
**Impact:** Any future change to `damagePlayer()` (new defensive item, new damage modifier) must also be manually replicated in the contact damage block or it won't work. Since this is the most common damage source (constant zombie contact), this is the highest-traffic bypass.
**Fix:** Replace lines 4979-5001 with `damagePlayer(15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1))`. The Thorned Vest and Thorns Howl reflect damage can be handled by having `damagePlayer` return the final damage dealt, then applying reflect: `const dealt = damagePlayer(...); if (dealt > 0) { reflectDamage(e, dealt); }`.

### [HIGH] Wave progress bar uses hardcoded divisor 90 instead of wave timer constant

**File:** `js/3d/hud.js:128`
**Issue:** The wave progress bar calculates fill ratio as `1 - (s.waveEventTimer / 90)`. The wave timer values (75s for Normal, 90s for Hard, etc.) are set in `game3d.js` based on difficulty. The HUD hardcodes 90, which is only correct for one difficulty setting.
**Impact:** On Normal difficulty (75s waves), the progress bar overshoots -- it shows 100% when 15 seconds remain. On other difficulties with different wave timers, the bar is similarly miscalibrated. The progress bar lies to the player about wave progress.
**Fix:** Pass the current wave duration as part of the HUD state object, or derive it from the wave timer's initial value.

---

## Medium (Code Quality / Maintainability)

### [MEDIUM] new THREE.Vector3() allocated every frame per floating text

**File:** `js/3d/hud.js:229`
**Issue:** Inside the floating text rendering loop: `const v = new THREE.Vector3(ft.x, ft.y, ft.z)`. This allocates a new Vector3 for every floating text element every frame. With 10 floating texts, that's 10 object allocations per frame, 600 per second.
**Impact:** GC pressure. Each Vector3 allocation is small, but hundreds per second accumulate. The V8 GC will eventually pause to collect these, causing micro-stutters -- especially on mobile or low-end hardware.
**Fix:** Pre-allocate a single `const _projVec = new THREE.Vector3()` outside the loop and reuse it: `_projVec.set(ft.x, ft.y, ft.z).project(camera)`.

### [MEDIUM] Unused variable `eScale` declared twice in enemy update

**File:** `js/game3d.js:4933, 4941`
**Issue:** `const eScale = ZOMBIE_TIERS[(e.tier || 1) - 1].scale` is declared at line 4933 and again at line 4941 (in an else branch). Neither is used after assignment. The tier scale is already looked up on line 4925 as `platEScale` for platform collision. These are dead assignments.
**Impact:** Wasted CPU (trivial) and confusing code. A reader might think eScale is used for ground height clamping but it isn't -- `getGroundAt()` doesn't take scale as a parameter.
**Fix:** Delete both `eScale` declarations (lines 4933 and 4941).

### [MEDIUM] updateItemVisuals() destroys and recreates all item meshes on every call

**File:** `js/3d/player-model.js:696-740`
**Issue:** `updateItemVisuals()` removes and disposes ALL existing item meshes (lines 698-706), then recreates them from scratch for every equipped item (lines 711-739). This is called on every item pickup. With 10 equipped items, each pickup destroys 10 mesh groups and rebuilds all 10, even though only 1 item changed.
**Impact:** Unnecessary geometry/material allocations and disposals. For a single function call on pickup events, this is tolerable performance-wise. But architecturally, it's the kind of "rebuild the world" approach that doesn't scale. If item visuals ever need to update per-frame (e.g., enchantment glow animations), this approach becomes a real problem.
**Fix:** Diff the old and new item state. Only destroy/create meshes for items that actually changed.

### [MEDIUM] setTimeout used inside game loop for charge glow cleanup

**File:** `js/game3d.js:5166-5173`
**Issue:** When the power attack fires, the charge glow flash cleanup uses `setTimeout(() => { ... }, 100)`. This mixes two timing systems: the game loop (requestAnimationFrame with delta time) and browser setTimeout. If the game is paused or the tab is backgrounded, the setTimeout fires independently of the game state.
**Impact:** If the player pauses during the 100ms flash window, the setTimeout still fires and disposes the glow mesh while the game is paused. When unpaused, `st.chargeGlow` is already null, which is handled (the null check on line 5167 prevents a crash), but the visual flash is cut short. Minor but indicative of a broader pattern issue.
**Fix:** Use a game-time-based timer (e.g., `st.chargeGlowFlashTimer = 0.1`) decremented by `dt` in the game loop. Dispose when the timer expires.

### [MEDIUM] terrainHeight() always returns 0, getGroundAt() is a pointless wrapper

**File:** `js/3d/terrain.js:70-72`, `js/game3d.js:3936-3938`
**Issue:** `terrainHeight(x, z)` (terrain.js:70) always returns `0`. `getGroundAt(x, z)` (game3d.js:3936) just calls `terrainHeight(x, z)`. The codebase uses both interchangeably -- `terrainHeight` in 76 places and `getGroundAt` in others. Two function names for the same constant-zero function adds confusion.
**Impact:** Any future terrain height implementation needs to find and audit every call to both functions. The indirection through `getGroundAt` adds a stack frame for no benefit. The `smoothNoise` function (terrain.js) is exported but unused, suggesting terrain height was once planned but abandoned.
**Fix:** This is acceptable if terrain height is planned for a future sprint. If not, consolidate to a single function and delete the dead `smoothNoise` export.

### [MEDIUM] Decoration unloading iterates full array with splice in reverse loop

**File:** `js/3d/terrain.js:685-691`
**Issue:** When unloading a chunk, the code iterates the entire `ts.decorations` array from end to start, checking each decoration's world position against the chunk bounds, and splicing out matches. With 500 decorations loaded (typical with 40+ chunks), each unload scans all 500 entries. Multiple splices in a single pass cause O(n*k) shifting where k is the number of matches.
**Impact:** Performance penalty during chunk unloading, which happens frequently as the player moves. With many loaded chunks, each unload becomes increasingly expensive. This can cause frame drops when crossing chunk boundaries.
**Fix:** Index decorations by chunk key (like `collidersByChunk`) so unloading is O(k) direct access instead of O(n) scan. Or use a filter-and-reassign instead of splice-in-loop.

### [MEDIUM] Collider array also filtered with O(n) full-array pass on chunk unload

**File:** `js/3d/terrain.js:693-697`
**Issue:** Immediately after the decoration splice loop, the collider array is filtered: `ts.colliders = ts.colliders.filter(...)`. This creates a new array every unload and scans every collider to check chunk membership. The chunk-indexed `collidersByChunk` is cleaned separately on line 699. The flat `ts.colliders` array appears to only exist for the old BD-103 enemy collision code (game3d.js:4854) which should be deleted (see CRITICAL finding above).
**Impact:** Once the duplicate collision code is removed, the flat `ts.colliders` array becomes dead weight -- maintained at O(n) cost on every chunk unload for no consumer.
**Fix:** After removing the old BD-103 collision code from game3d.js, delete `ts.colliders` entirely. Only maintain `ts.collidersByChunk`.

### [MEDIUM] mapGemGeo/mapGemMat shared but material cloned on merge without tracking

**File:** `js/game3d.js:1249-1250, 5238-5241`
**Issue:** Map gems share a single `mapGemGeo` and `mapGemMat` (lines 1249-1250). During XP gem merging (line 5238), if a gem's material is the shared `gemMat`, it clones the material. During cleanup (line 5241, 5285), the code checks `if (b.mesh.material !== gemMat) b.mesh.material.dispose()` to avoid disposing the shared material. This works but is fragile -- any code path that sets `gem.mesh.material` to a non-shared instance without this awareness will leak materials.
**Impact:** Memory leak risk if future code modifies gem materials without the shared-vs-cloned awareness. Currently correct but relies on convention rather than encapsulation.
**Fix:** Encapsulate the shared-vs-owned material distinction in the gem object (e.g., `gem.ownsMatrial = true/false`) rather than comparing against a global reference.

### [MEDIUM] box() in utils.js creates new geometry and material per call with no sharing

**File:** `js/3d/utils.js:26-27`
**Issue:** Every `box()` call creates `new THREE.BoxGeometry(w, h, d)` and `new THREE.MeshLambertMaterial({ color })`. A single zombie model has ~15 box parts. With 50 zombies, that's 750 geometries and 750 materials. Many share identical dimensions (e.g., all tier-1 zombie bodies are the same size) and colors, but each gets its own GPU resources.
**Impact:** High draw call count and GPU memory usage. Three.js can't batch meshes with different geometry/material instances even if they're identical. This is why the game struggles with 100+ enemies on screen.
**Fix:** Implement a geometry/material cache keyed by `"w,h,d"` and color hex. Return shared instances. This requires careful disposal management (reference counting) but can dramatically reduce GPU resource usage.

### [MEDIUM] Date.now() mixed with clock.elapsedTime for animation timing

**File:** `js/game3d.js:5314, 5591-5592, 5596`
**Issue:** Map gem bobbing (line 5314), charge shrine rune orbiting (lines 5591-5592), and charge shrine pulse glow (line 5596) use `Date.now()` for animation timing. Everything else uses `clock.elapsedTime` or `st.gameTime`. `Date.now()` is wall-clock time and doesn't pause when the game pauses. `clock.elapsedTime` respects the Three.js clock which can be stopped.
**Impact:** Map gems and charge shrine animations continue to advance during pause. Charge shrine pulse glow visibly animates on the pause screen. Minor visual inconsistency but symptomatic of inconsistent timing architecture.
**Fix:** Replace `Date.now()` with `clock.elapsedTime` in all animation calculations within the game loop.

---

## Low (Style / Minor Issues)

### [LOW] 5,850-line function launch3DGame()

**File:** `js/game3d.js:1-5849`
**Issue:** The entire 3D game -- initialization, state, input handling, enemy creation, weapon systems, spawn logic, upgrade menus, 1,191-line game loop, camera, cleanup -- lives inside a single function. Local variables serve as module state. Inner functions close over them. This is a closure-as-module pattern taken to its logical extreme.
**Impact:** No file in this codebase can be reviewed or modified in isolation. The game loop alone is longer than most entire modules. Finding where a variable is defined requires scrolling through 400 lines of state object. IDE features like "find references" are weakened because everything is a local binding. New contributors (including AI agents) must load the entire function into context to make any change.
**Fix:** This is a structural issue that can't be fixed in a single PR. Incremental extraction of self-contained systems (enemy AI, weapon firing, spawn logic, powerup handling) into separate modules would reduce cognitive load. The existing `js/3d/` module extractions (terrain, hud, audio, player-model) show this is possible and the team knows how to do it.

### [LOW] Magic number 90 for CHUNK_SZ in enemy collision

**File:** `js/game3d.js:4874`
**Issue:** `const CHUNK_SZ = 16; // must match terrain.js CHUNK_SIZE`. The comment acknowledges the duplication. `CHUNK_SIZE` is already exported from terrain.js.
**Impact:** Same as the HUD CHARGE_TIME issue -- if terrain.js CHUNK_SIZE changes, this local copy won't. The comment-as-documentation pattern doesn't prevent bugs.
**Fix:** Import `CHUNK_SIZE` from terrain.js.

### [LOW] Inconsistent naming: `mergeCount` on state vs `mergeCount` on enemy

**File:** `js/game3d.js:5064`
**Issue:** `a.mergeCount` is a per-enemy property tracking how many same-tier zombies this enemy has absorbed. The MEMORY.md mentions `st.mergeCount` as a state-level merge tracking variable. Using the same name for two different concepts (per-enemy absorption progress vs. global merge event count) is confusing.
**Impact:** Code readability. A developer searching for "mergeCount" gets hits from two unrelated systems.
**Fix:** Rename the per-enemy property to `e.absorbCount` or `e.mergeProgress` to distinguish from the global counter.

### [LOW] Comments reference removed features

**File:** `js/game3d.js:5103-5107`
**Issue:** Lines 5103-5107 read: `// === AUTO-ATTACK REMOVED (BD-102) ===` followed by interaction timer code. This is a tombstone comment for deleted functionality. The comment explains what *was* here, not what *is* here.
**Impact:** Noise. Future readers don't need to know about BD-102's removal -- that's what git history is for.
**Fix:** Remove the tombstone comment. Keep the interaction timer code with a comment explaining what it *does*, not what it replaced.

### [LOW] Inconsistent error handling: some catch blocks use `_`, others use `(_)`

**File:** `js/3d/audio.js` throughout
**Issue:** Catch blocks alternate between `catch (_) {}` and `catch(_) {}` (spacing). Minor style inconsistency.
**Impact:** None. The `_` convention for unused variables is fine. Just pick one style.
**Fix:** Enforce consistent style via linter configuration.

### [LOW] new THREE.Color(0xff0000) allocation inside challenge shrine activation

**File:** `js/game3d.js:5625`
**Issue:** `c.material.emissive = new THREE.Color(0xff0000)` inside the challenge shrine activation loop. This creates a new Color object for each child material. Since shrine activation happens at most once per shrine, this is not a performance issue -- but it's inconsistent with the pre-allocated `_todA`/`_todB` Color objects used for time-of-day interpolation (line 848).
**Impact:** Negligible. One-time allocation. Noted only for pattern consistency.
**Fix:** Use `c.material.emissive.setHex(0xff0000)` to modify the existing Color in-place instead of allocating a new one.

### [LOW] Hardcoded MAP_HALF constant duplicated

**File:** `js/game3d.js:4846-4847`
**Issue:** Enemy position clamping uses `MAP_HALF` which is defined locally in game3d.js. This is fine, but the `+ 0.5` / `- 0.5` offset is a magic number buffer that appears without explanation.
**Impact:** Minor readability issue. The `0.5` is presumably to keep enemies from clipping into boundary walls, but this should be `WALL_THICKNESS / 2` or similar named constant.
**Fix:** Define the buffer as a named constant or derive it from wall dimensions.

---

## Tally

| Severity | Count |
|----------|-------|
| Critical | 5     |
| High     | 8     |
| Medium   | 11    |
| Low      | 7     |
| **Total**| **31**|

## Top 3 Priorities

1. **Fix framerate-dependent contact damage** (CRITICAL). This is affecting every player differently based on their hardware. Remove `* dt` from line 4979.

2. **Consolidate damage functions** (CRITICAL x2 + HIGH x2). Route all enemy damage through `damageEnemy()` and all player damage through `damagePlayer()`. This fixes Hot Sauce, Gloves, Shield Bracelet, and dodge interactions in one pass.

3. **Delete duplicate terrain collision** (CRITICAL). Lines 4850-4867 are dead weight. Removing them is a one-line delete that improves performance for every enemy on every frame.
