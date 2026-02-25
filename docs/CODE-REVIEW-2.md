# CODE-REVIEW-2: Linus-Style Review

Reviewed: entire JS codebase (~19,200 lines across 11 files).
Date: 2025-02-25.
Reviewer disposition: technical, direct, zero tolerance for sloppy patterns in a hot loop.

---

## The Good (brief)

Credit where it is due:

1. **Geometry/material caching in `js/3d/utils.js`** (BD-184). The `getCachedGeo`/`getCachedMat`
   pattern is exactly right. Shared geometries keyed by rounded dimensions, shared materials
   keyed by color hex. This is the single most important GPU-side optimization in the codebase
   and it is done correctly.

2. **Object pooling** (`createPool`, `gemPool`, `firePool` in game3d.js). Pools for XP gems
   and fire particles avoid per-frame allocation/GC. The acquire/release pattern is simple and
   correct.

3. **Chunk-indexed colliders** (`getNearbyColliders` in terrain.js). Querying 9 chunks instead
   of a flat array of 350+ colliders is the right spatial partitioning approach.

4. **Audio fail-silent design** (audio.js). Every single public function wraps in try/catch or
   guards on `initialized`. The concurrent limiter, per-event throttle, and stale-sound pruner
   are all sensible. This is production-grade defensive coding.

5. **Reverse-loop splicing** throughout game3d.js. Almost all array-splice-in-loop patterns
   correctly iterate `i = arr.length - 1` downward. That means the index bookkeeping is correct
   after splice. Whoever enforced this convention saved a whole class of bugs.

6. **dt clamping** at line 4651: `Math.min(clock.getDelta(), 0.05)`. Prevents physics tunneling
   on tab-switch or lag spike. Simple and correct.

7. **Closure-scoped state**. `launch3DGame` encapsulates all mutable state in a closure. No
   module-level mutation, no global leaks. Clean entry/exit contract.

8. **Documentation quality**. The JSDoc coverage is unusually good for a game project --
   `@typedef State3D` has 80+ documented properties, every public function has param/return
   docs, and the file headers describe dependencies and exports. This is better than most
   production codebases.

---

## The Bad (detailed)

### B-01: `game3d.js` is 7,997 lines -- a single function closure

**File:** `js/game3d.js` (entire file)
**Impact:** Unmaintainable. Every change to any subsystem requires reading 8K lines of context.
IDE features (go-to-definition, rename-symbol) are useless inside a single function scope.
Merge conflicts are inevitable because every feature touches the same file. The comment at
line 4594 proudly notes the game loop is "~1,191 lines." That is not a flex.

**Fix:** Continue the extraction pattern already started with terrain.js, utils.js,
player-model.js, hud.js, audio.js. The next candidates are obvious:
- Enemy creation + AI (~1,400 lines) -> `js/3d/enemy.js`
- Weapon firing + projectile update (~800 lines) -> `js/3d/weapons.js`
- Boss attack patterns (~600 lines) -> `js/3d/boss-ai.js`
- Shrine/totem/charge-shrine logic (~300 lines) -> `js/3d/shrines.js`
- Powerup application + effect update (~400 lines) -> `js/3d/powerups.js`

Pass `st`, `scene`, and helper functions as explicit arguments. The closure scope makes this
straightforward -- functions already read `st` from closure, just make it a parameter.

**Effort:** L (large). But this is the single most impactful thing you can do for long-term
velocity. Every other fix gets harder until this is done.

---

### B-02: ~100 uncached `new THREE.BoxGeometry()` calls in game3d.js

**File:** `js/game3d.js` (lines 953-7018, scattered throughout)
**Impact:** You built a beautiful geometry cache in utils.js and then **bypassed it in 100+
places**. Every `new THREE.BoxGeometry(...)` allocates a typed array buffer on the JS heap and
uploads a vertex buffer to the GPU. Many of these are inside functions called per-enemy-spawn
(createEnemy ~line 1840), per-weapon-fire (weapon firing ~line 2977), per-boss-attack
(~lines 3512, 3652, 5196, 5601, 6381, 6415, 6496, 6572), and per-projectile (~line 3113).

Some specific examples:
- `js/game3d.js:1840` -- eye meshes in createEnemy, called for every zombie spawn
- `js/game3d.js:2977` -- claw swipe slash mesh, called every ~1.2 seconds per weapon
- `js/game3d.js:3010-3012` -- bone toss meshes, called every ~1.5 seconds
- `js/game3d.js:3113-3121` -- fireball core+outer+trail, called every ~2.5 seconds
- `js/game3d.js:6572-6573` -- bone barrage bones, 8-12 per boss attack

This is pure waste. The cache exists. Use it.

**Fix:** Replace every `new THREE.BoxGeometry(w, h, d)` with `getCachedGeo(w, h, d)`. For
SphereGeometry, RingGeometry, CylinderGeometry, and TorusGeometry at lines 1963, 3954, 3979,
4034, 4051, 5254, 5919, 6099, 6158, 6167, 6197, 6381, 6415, 6521 -- extend the cache pattern
to support these geometry types, or at minimum hoist them to module-level constants shared
across all instances. Many of these (e.g. `RingGeometry(0.3, 0.6, 20)`) are identical across
calls.

**Effort:** M (medium). Mechanical search-and-replace for BoxGeometry. New cache entries for
the other geometry types.

---

### B-03: `new THREE.MeshBasicMaterial` / `new THREE.MeshLambertMaterial` in hot paths (93 uncached)

**File:** `js/game3d.js` -- 56 MeshBasicMaterial + 37 MeshLambertMaterial instances
**Impact:** Same issue as B-02 but for materials. Materials compile shader programs on first
use. Creating identical materials (same color, same type) wastes both JS heap and GPU shader
cache. Many are inside per-spawn or per-fire functions.

Specific offenders:
- `js/game3d.js:5592` -- `new THREE.MeshBasicMaterial({ color: 0x111111 })` inside boss phase
  transition (called once per boss, acceptable)
- `js/game3d.js:1334-1357` -- shrine materials created per-shrine
- `js/game3d.js:2188-2195` -- crate materials per-crate
- `js/game3d.js:2977` -- slash material per claw-swipe fire
- `js/game3d.js:3038` -- poison particle material per-fire
- `js/game3d.js:3168-3170` -- mud bomb materials per-fire

**Fix:** Use `getCachedMat(color)` for MeshLambertMaterial. Add a `getCachedBasicMat(color)`
for MeshBasicMaterial. For materials that need `transparent: true` or custom opacity, either
extend the cache key to include those properties or hoist them as named constants.

**Effort:** M (medium).

---

### B-04: Dead code -- unreachable `boneSpit` handler at line 3444

**File:** `js/game3d.js:3444-3467`
**Impact:** The block at line 3417 handles **both** `deathBolt` and `boneSpit` via
`(p.type === 'deathBolt' || p.type === 'boneSpit') && p.isEnemyProjectile`. It ends with
`continue` at line 3441. The subsequent block at line 3444-3467 checks
`p.type === 'boneSpit' && p.isEnemyProjectile` -- this is **100% dead code**. It will never
execute because the previous block's `continue` already skipped it.

This is not just dead code. It is *confusing* dead code, because someone reading line 3444
thinks boneSpit has special spinning behavior, but it actually uses the deathBolt handler's
movement code (no spin). If the bone is supposed to spin, the merge at BD-236 introduced a
regression.

**Fix:** Delete lines 3444-3467 entirely. If boneSpit needs different movement logic (spin),
separate it from the deathBolt handler at line 3417 into its own `if` block and remove
`boneSpit` from the combined condition.

**Effort:** S (small).

---

### B-05: Duplicate imports -- `CAMERA_Y_OFFSET`, `CAMERA_Z_OFFSET`, `CAMERA_SMOOTH_FACTOR`

**File:** `js/game3d.js:34` and `js/game3d.js:53`
**Impact:** These three constants are imported twice in the same import block. Line 34 imports
them, line 53 imports them again. This is a *syntax error* in strict ES module semantics -- a
duplicate import binding. Some bundlers silently dedupe, some throw, some silently use the
last occurrence. In a no-bundler project like this one running native ES modules, the browser
should throw a SyntaxError on load.

If this code is actually running, something strange is happening -- possibly Chrome silently
deduplicates. But this is a ticking bomb: Firefox may not be so forgiving, and any future
bundler integration will break.

**Fix:** Remove line 53 (the second `CAMERA_Y_OFFSET, CAMERA_Z_OFFSET, CAMERA_SMOOTH_FACTOR`).

**Effort:** S (small). But **do it today** -- this is the kind of thing that silently breaks
in a different browser and wastes hours debugging "why won't the page load."

---

### B-06: `Math.sqrt()` in the per-enemy-per-frame loop (~30 calls)

**File:** `js/game3d.js` -- lines 6710, 6722, 6751, 5738, 5838, 5847, 5957, etc.
**Impact:** `Math.sqrt` is used for enemy-to-player distance at line 6710 (called for every
living enemy every frame), enemy-terrain collision at 6751 (per-collider per-enemy), and
multiple boss attack calculations. For 100 enemies with 30 nearby colliders each, that is
3,000+ sqrt calls per frame just for collision.

Where the result is only compared against a threshold (>50, <6, etc.), you can compare the
squared distance against the squared threshold and skip the sqrt entirely. This is already
done correctly in some places (e.g., line 3425 for deathBolt hit detection: `dbdx * dbdx +
dbdz * dbdz < p.range * p.range`) -- but inconsistently applied.

**Fix:** Replace:
```js
const dist = Math.sqrt(dx * dx + dz * dz);
if (dist < THRESHOLD) { ... }
```
with:
```js
const distSq = dx * dx + dz * dz;
if (distSq < THRESHOLD * THRESHOLD) { ... }
```
Only call sqrt when you actually need the distance value (e.g., for normalization to get
direction). Several places compute sqrt purely for a comparison and then also use it for
normalization -- those genuinely need it. Focus on the cases where dist is only compared.

Key targets: line 6710 (enemy distance used for shadow toggle at <20 AND for despawn at >60
AND for normalization -- needs sqrt), line 6751 (collision push -- needs sqrt for push
direction), line 7160 (XP gem magnet pull -- needs sqrt for direction). But line 7620
(`Math.sqrt(dx * dx + dz * dz) < CHALLENGE_SHRINE_RADIUS + 1`) is a pure comparison -- use
squared distance.

**Effort:** M (medium). Requires auditing each call site for whether the scalar distance is
actually used downstream.

---

### B-07: `for...in` on objects in player-model.js

**File:** `js/3d/player-model.js:590, 750, 762, 880`
**Impact:** `for (const k in obj)` iterates **all enumerable properties including inherited
ones** from the prototype chain. If anyone ever adds a utility method to Object.prototype
(which libraries do), every `for...in` loop silently picks it up. The correct pattern is
`Object.keys(obj)` or `Object.entries(obj)`.

The risk is low because these iterate over plain objects (`model.features`, `model.itemMeshes`,
`items`), but `for...in` is a code smell that signals "I did not think about the prototype
chain."

**Fix:** Replace `for (const k in obj)` with `for (const k of Object.keys(obj))` at all 4
call sites. Or use `Object.entries()` where both key and value are needed.

**Effort:** S (small).

---

### B-08: `timeWarp` powerup mutates enemy speed in-place with fragile multiply/divide

**File:** `js/3d/constants.js:213-214`
```js
apply: s => { s.timeWarp = true; for (const e of s.enemies) e.speed *= 0.25; },
remove: s => { s.timeWarp = false; for (const e of s.enemies) e.speed *= 4; },
```

**Impact:** This is the classic multiply-then-divide-by-the-inverse bug waiting to happen.
If **any** enemy spawns while timeWarp is active, that enemy's speed was never quartered, but
it **will** be quadrupled on removal. If an enemy dies during timeWarp, it is removed from
`s.enemies`, so `remove()` does not touch it -- that is fine. But the spawn case is the
problem: new ambient spawns happen every ~1.7 seconds, and timeWarp lasts 10 seconds. That
is ~5-6 enemies that get 4x speed when timeWarp expires.

Additionally, floating-point multiplication is not perfectly invertible. After
`speed *= 0.25; speed *= 4`, the value may not be bitwise identical to the original due to
IEEE 754 rounding. Over multiple timeWarp activations, speeds drift.

**Fix:** Store `e._origSpeed` before applying timeWarp. On remove, restore from `_origSpeed`
instead of multiplying by 4. Better yet, apply timeWarp as a runtime multiplier
(like `st.enemySpeedMult`) and remove the mutation entirely. The enemy AI loop at line 6733
already applies `st.totemSpeedMult * st.enemySpeedMult` -- adding a timeWarp multiplier there
is trivial.

**Effort:** S (small).

---

### B-09: O(n^2) zombie merge check

**File:** `js/game3d.js:6934-6940`
```js
for (let i = 0; i < st.enemies.length; i++) {
  ...
  for (let j = i + 1; j < st.enemies.length; j++) {
```

**Impact:** This is O(n^2) in enemy count. With 100 enemies, that is 4,950 pair checks. With
200 enemies (which happens during wave events), it is 19,900. The throttle at line 6927
(`st.mergeCheckTimer = 0.5`, runs every 0.5s) mitigates this -- it is not per-frame. But
during wave events with 200+ enemies, this 0.5s check creates a noticeable frame spike.

**Fix:** Spatial hashing. Divide the world into cells (e.g., 2x2 unit grid). Index enemies
by cell. Only check pairs within the same cell. This reduces the merge check from O(n^2) to
O(n * k) where k is the average number of enemies per cell. For uniformly distributed enemies,
k is typically 2-4. This is the same approach used for colliders (chunk-indexed) and should
be applied here.

**Effort:** M (medium).

---

### B-10: `magnetAura` powerup uses fragile multiply/divide pattern

**File:** `js/3d/constants.js:214`
```js
apply: s => { s.collectRadius *= 5; },
remove: s => { s.collectRadius /= 5; },
```

**Impact:** Same issue as B-08. If `collectRadius` is modified between apply and remove
(which happens when Magnet Howl is selected during the powerup duration: line 4518
`s.collectRadius *= 1.25`), the division by 5 on remove will not restore the correct value.

Example scenario:
1. collectRadius = 2 (base)
2. magnetAura applied: 2 * 5 = 10
3. Player picks Magnet Howl: 10 * 1.25 = 12.5
4. magnetAura expires: 12.5 / 5 = 2.5 (should be 2 * 1.25 = 2.5)

In this specific case the math actually works out because both are multiplicative. But that is
coincidental -- if any additive modifier were applied to collectRadius during magnetAura, the
division would produce the wrong result.

**Fix:** Store the pre-powerup value and restore it on remove, then re-apply permanent
modifiers. Or (better) make all powerup effects multiplicative overlays applied at read-time
rather than mutating the base value.

**Effort:** S (small).

---

### B-11: 13 `.traverse()` calls on Three.js scene graphs

**File:** `js/game3d.js` -- lines 1719, 2083, 3731, 4915, 4930, 4941, 5053, 5071, 5456, 6715,
6893, 6909, 7974

**Impact:** `group.traverse()` walks every child recursively. Most uses here operate on
player or enemy groups with 10-30 children, so each call is O(30). But lines 6893 and 6909
are inside the death-sequence enemy highlight loop, which iterates **all enemies** and
traverses each one every frame during the death sequence. With 100 enemies at 20 meshes each,
that is 2,000 mesh material modifications per frame.

Line 6715 traverses every enemy group to toggle `castShadow`, but it already has a guard
(`e._shadowEnabled !== wantShadow`) so it only fires on threshold crossing. That is fine.

Lines 6893/6909 have no such guard. Every frame during death sequence, every enemy gets
traversed.

**Fix:** For lines 6893/6909, cache the traversal result. On the first frame of the death
sequence, find the killer enemy (if any), set its emissive once, and dim all others once. On
subsequent frames, only update the killer's pulse value on its body mesh (already accessible
via `e.body`), not via a full traverse.

**Effort:** S (small).

---

### B-12: XP gem merge is O(n^2)

**File:** `js/game3d.js:7122-7143`
```js
for (let i = st.xpGems.length - 1; i >= 0; i--) {
  const a = st.xpGems[i];
  for (let j = i - 1; j >= 0; j--) {
```

**Impact:** Same O(n^2) pattern as the zombie merge. XP gem count can spike to 200+ after
wave events. The throttle (0.25s) helps, but on a wave event frame with 300 gems, this is
44,850 pair checks. Gems also have a hard cap (`XP_GEM_HARD_CAP`) which bounds the worst
case, but this cap is still likely in the hundreds.

**Fix:** Same spatial hashing approach as B-09. Or, given that gems are stationary, just
increase the merge radius and merge more aggressively to keep gem count low.

**Effort:** M (medium).

---

### B-13: `new THREE.BoxGeometry` inside boss phase visuals (one-shot, but leaks on re-trigger)

**File:** `js/game3d.js:5601`
```js
new THREE.BoxGeometry(crackW, crackH, crackD)
```

**Impact:** This creates 3 new geometries when the boss enters phase 2. They are added to
`e.group` and will be disposed when the enemy is disposed. The guard `!e._phase2Visuals`
ensures it runs only once per boss. This is acceptable for a one-shot effect on a single
entity. However, the geometry is not cached and has random dimensions -- this means it cannot
be shared. That is fine for 3 boxes on a boss. Noting it for completeness only.

**Effort:** N/A (acceptable as-is).

---

### B-14: `renderer.js` is 4,599 lines of pure Canvas2D drawing

**File:** `js/renderer.js`
**Impact:** No structural issue -- Canvas2D does not have the same GPU concerns as Three.js.
But 1,082 `fillRect`/`fillText`/`drawImage` calls and only 34 `save`/`restore` pairs means
the canvas state is being managed carefully (each save has a restore). The file is large but
the code is linear and unlikely to cause runtime issues.

Noting it because the 2D mode renderer is monolithic and would benefit from the same
extraction treatment as game3d.js if 2D mode development continues.

**Effort:** L (large, low priority).

---

### B-15: `items.js` has massive copy-paste duplication

**File:** `js/items.js` -- 568 lines
**Impact:** There are 5 equipment types (armor, glasses, sneakers/boots, cleats, horse) and
each one has an identical spawn function and an identical update function. The only differences
are: the item type constant, the player.items property name, the position percentage, and
the equip logic. Lines 224-568 are ~340 lines of copy-pasted code with minor variable name
changes.

This is not a performance issue. It is a maintenance nightmare. When someone adds a new
equipment type, they will copy-paste one of these blocks, change 3 variable names, miss one,
and introduce a bug.

**Fix:** Write a generic `spawnEquipmentCrate(typeConst, slotKey, posPercent)` and
`updateEquipmentPickups(pickupsArray, typeConst, slotKey, equipFn)` that parameterize the
differences. The footwear mutual-exclusion logic can be a callback or a separate function.

**Effort:** M (medium).

---

### B-16: `terrainHeight()` always returns 0

**File:** `js/3d/terrain.js:71-73`
```js
export function terrainHeight(x, z) {
  return 0;
}
```

**Impact:** The function exists, is imported and called from dozens of places, has a full JSDoc
block... and always returns 0. The comment says "BD-73: hills/curvature removed." This means
every call to `terrainHeight()` is overhead for a constant. Not a perf issue (the JIT will
inline this), but it is confusing to read code that computes `terrainHeight(x, z) + 0.6`
when the answer is always 0.6.

**Fix:** If hills are never coming back, replace `terrainHeight` with a constant (0) at all
call sites and remove the function. If hills might return, leave it but add a comment at
every call site explaining this is a stub.

**Effort:** S (small) to leave as-is with a note. L (large) to remove all call sites.

---

### B-17: `playerGroup.traverse()` called 5 times for powerup visual effects

**File:** `js/game3d.js` -- lines 4915, 4930, 4941, 5053, 5071
**Impact:** During active powerups (ghost form, giant mode, berserker rage, etc.), the player
model is traversed to modify material opacity, transparency, and scale. These run every frame
while the powerup is active. The player model has ~20-30 meshes, so each traverse is O(30).
5 traversals = 150 mesh checks per frame.

This is not catastrophic, but it is wasteful. The player model structure is known at build
time -- body, head, limbs, features. Cache references to the meshes that need modification.

**Fix:** During `buildPlayerModel`, return an array of all meshes (or tag them). In the
powerup visual code, iterate the cached array directly instead of traversing.

**Effort:** S (small).

---

## The Ugly (critical / ship-blocking)

### U-01: The duplicate import at line 53 may be a SyntaxError in strict ES modules

Covered in B-05 above. This is **ship-blocking** because if any browser enforces the ES module
spec strictly, the entire 3D mode fails to load. The fact that it works in Chrome today does
not mean it works in Firefox, Safari, or any future Chrome version. Fix this before any
public release.

### U-02: `timeWarp` enemy speed corruption on spawn/removal

Covered in B-08. This is a **gameplay bug**: enemies spawned during timeWarp get 4x speed
permanently when it expires. Players who use timeWarp during wave events (the optimal use case)
will face hyper-speed zombies afterward. This is likely already happening in playtests but may
be attributed to "the game is hard."

### U-03: The 8K-line monolith blocks all parallel development

Covered in B-01. This is ship-blocking for team velocity, not for the game itself. Two
developers cannot work on game3d.js simultaneously without merge hell. The modular extraction
already started with 6 modules needs to continue.

---

## Verdict: Top 5 Priorities

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | **B-05**: Remove duplicate imports (SyntaxError bomb) | S | Critical -- potential total failure in other browsers |
| 2 | **B-08**: Fix timeWarp speed corruption | S | High -- active gameplay bug, enemies get permanent 4x speed |
| 3 | **B-04**: Delete dead boneSpit handler (26 lines of confusion) | S | Medium -- confusing dead code, possible regression |
| 4 | **B-02 + B-03**: Use geometry/material caches (100+ allocations) | M | High -- GPU memory, GC pressure, frame time |
| 5 | **B-01**: Continue modular extraction of game3d.js | L | High -- blocks all parallel work, merge conflicts |

Everything else (B-06 sqrt optimization, B-09/B-12 spatial hashing, B-11 traverse caching)
is performance tuning that matters at scale but is not blocking alpha release. Fix 1-3 today.
Start 4-5 this sprint.
