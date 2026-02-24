# Performance Audit — BD-151

**Date:** 2026-02-24
**Scope:** `js/game3d.js`, `js/3d/terrain.js`, `js/3d/hud.js`, `js/3d/player-model.js`
**Focus:** FPS drops in mid-to-late game from XP gems and zombie waves

---

## HIGH IMPACT (10+ FPS improvement possible)

### H1. XP gems create a cloned material per gem — draw call explosion

**File:** `js/game3d.js` lines 1839-1844
**Code:**
```js
function createXpGem(x, z, xpValue = 1) {
  const mesh = new THREE.Mesh(gemGeo, gemMat.clone());   // ← cloned material every time
  ...
}
```

**Why it's slow:** Every XP gem gets its own cloned material via `gemMat.clone()`. Even though they all share `gemGeo` (good), Three.js cannot batch draw calls across different material instances. With 50+ enemies dying and each dropping 1-3 gems, there can easily be 100-200 gems on screen, each requiring a separate draw call. The merge system (line 5238) also clones materials for merged gems to set `emissiveIntensity`. After a few minutes of play, the scene has hundreds of unique material instances.

**Optimization:** Use `THREE.InstancedMesh` for all XP gems. A single InstancedMesh with one shared geometry + one shared material renders all gems in a single draw call regardless of count. Per-instance color/emissive variation can be achieved via `instanceColor` attribute. Alternatively, use just 3-4 shared materials (small/medium/large/mega merged) and assign by reference instead of cloning.

**Estimated improvement:** 10-30 FPS at 100+ gems, as it collapses ~100-200 draw calls into 1-4.
**Implementation complexity:** Medium — InstancedMesh requires managing an instance index, updating per-instance transforms each frame, and handling addition/removal. The simpler shared-material approach is Easy.

---

### H2. Zombie-zombie merge loop is O(n^2) per frame

**File:** `js/game3d.js` lines 5044-5098
**Code:**
```js
for (let i = 0; i < st.enemies.length; i++) {
  const a = st.enemies[i];
  ...
  for (let j = i + 1; j < st.enemies.length; j++) {
    const b = st.enemies[j];
    ...
  }
}
```

**Why it's slow:** This is a nested loop over all enemies, making it O(n^2). With 50 enemies, that is 1,225 pair checks per frame. With 80 enemies (mid-game wave), that is 3,160. Even though it runs only every 0.25s (gem merge timer does not gate this — the merge loop runs every frame), the distance calculation + ZOMBIE_TIERS lookup per pair adds up. The `mergedSet` prevents re-processing merged enemies within a frame, but does not reduce the iteration count.

**Optimization:** Use a spatial hash grid (cell size ~2 units matching merge radius). Only check pairs within the same or adjacent cells. This reduces the check from O(n^2) to O(n * k) where k is the average number of enemies per cell (~2-4). Alternatively, throttle the merge check to every 0.5-1.0s since merges are rare events.

**Estimated improvement:** 5-15 FPS at 60+ enemies, scaling with enemy count.
**Implementation complexity:** Medium — spatial hash requires a grid data structure rebuilt each frame, but the logic is straightforward.

---

### H3. Enemy-terrain collision runs TWICE per enemy (global + chunk-indexed)

**File:** `js/game3d.js` lines 4849-4896
**Code:**
```js
// FIRST pass: global colliders array (lines 4849-4867)
if (terrainState && terrainState.colliders) {
  for (const c of terrainState.colliders) {   // ← iterates ALL loaded colliders
    ...
  }
}
// SECOND pass: chunk-indexed colliders (lines 4872-4896)
if (terrainState && terrainState.collidersByChunk) {
  for (let dcx = -1; dcx <= 1; dcx++) {
    for (let dcz = -1; dcz <= 1; dcz++) {
      ...
    }
  }
}
```

**Why it's slow:** Every enemy runs collision checks against the global `terrainState.colliders` array (which contains ALL loaded colliders across all chunks — at VIEW_DIST=4 that is ~81 chunks, each with 2-5 trees + 0-2 rocks = ~250-400 colliders). Then it ALSO runs the chunk-indexed check against `collidersByChunk` for the 9 surrounding chunks. This is doing the same work twice. With 50 enemies, the global pass alone does 50 * 350 = 17,500 distance checks per frame, plus the chunk-indexed pass doing 50 * ~30 = 1,500 checks. The global pass has a `>5` unit fast-reject but this still iterates the full array.

**Optimization:** Remove the global `terrainState.colliders` pass entirely and keep only the chunk-indexed `collidersByChunk` pass. The chunk-indexed system already covers all colliders and only checks the ~9 nearby chunks (~30 colliders) instead of all ~350. This alone removes ~17,500 distance checks per frame at 50 enemies.

**Estimated improvement:** 10-20 FPS at 50+ enemies.
**Implementation complexity:** Easy — delete lines 4849-4867 (the first collision pass). The chunk-indexed system at lines 4872-4896 is already a complete replacement.

---

### H4. Each enemy is 15-40+ individual meshes, each a separate draw call

**File:** `js/game3d.js` lines 1637-1795
**Code:**
```js
function createEnemy(x, z, baseHp, tier) {
  const group = new THREE.Group();
  const eBody = box(group, ...);     // body
  box(group, ...);                    // torn shirt (2 boxes)
  const eHead = box(group, ...);     // head
  box(group, ...);                    // head detail
  // eyes: 4 boxes
  // mouth: 2 boxes
  // arms: 2 boxes + 2 hands
  // legs: 2 boxes + 2 feet
  // tier 2+: 2 shoulder pads
  // tier 3+: third eye (2 boxes)
  // tier 4+: 5 teeth
  // tier 5+: 6 claws
  // tier 6+: 4 side eyes
  // tier 7+: 4 horn boxes
  // tier 8+: 4 spine ridges
  // tier 9+: 6 aura particles
  // tier 10: 8 crown boxes
  ...
}
```

**Why it's slow:** Each enemy consists of 15-40+ individual `THREE.Mesh` objects, each with its own geometry and material. Three.js renders each mesh as a separate draw call. With 50 enemies at an average of ~20 meshes each, that is 1,000 draw calls just for enemies. Each mesh also requires its own material instance (created by `box()` via `new THREE.MeshLambertMaterial`), preventing any automatic batching.

**Optimization:** Merge all boxes within each enemy into a single `THREE.BufferGeometry` using `BufferGeometryUtils.mergeGeometries()` at creation time. This reduces each enemy from 20+ draw calls to 1. Animated parts (arms, legs) would need to remain separate. Alternatively, for maximum performance, use `THREE.InstancedMesh` with a shared zombie geometry atlas. A simpler first step: share materials across enemies of the same tier (use a `tierMaterials` cache).

**Estimated improvement:** 15-30 FPS at 50+ enemies.
**Implementation complexity:** Hard — geometry merging requires tracking which parts need to stay separate for animation. A material-sharing approach is Medium.

---

### H5. Shadow map at 2048x2048 with PCFSoftShadowMap

**File:** `js/game3d.js` lines 770-805
**Code:**
```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
```

**Why it's slow:** `PCFSoftShadowMap` is the most expensive shadow map type. A 2048x2048 shadow map at soft quality requires rendering the entire shadow-casting scene from the light's perspective, then doing multi-sample PCF lookups for every shadowed pixel. With hundreds of decoration meshes and 50+ enemies all marked `castShadow = true`, the shadow pass alone can take 5-10ms per frame. This is particularly punishing on integrated GPUs and laptops.

**Optimization:** (a) Reduce shadow map to 1024x1024. (b) Switch to `THREE.BasicShadowMap` or `THREE.PCFShadowMap` (cheaper). (c) Only enable `castShadow` on the player and nearby enemies, not decorations or distant objects. (d) Tighten `dirLight.shadow.camera` frustum to only cover the visible area around the player (currently -40 to 40, could be -20 to 20). (e) Add a quality setting to disable shadows entirely on low-end hardware.

**Estimated improvement:** 10-20 FPS on integrated GPUs; 5-10 FPS on dedicated GPUs.
**Implementation complexity:** Easy — most changes are single-line constant tweaks.

---

## MEDIUM IMPACT (5-10 FPS)

### M1. Each decoration creates individual geometry and material instances

**File:** `js/3d/terrain.js` lines 150-504 (all decoration builders)
**Code:**
```js
function createTree(dx, dz, h, scene) {
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.3 * s, trunkH, 0.3 * s),      // unique geometry
    new THREE.MeshLambertMaterial({ color: 0x664422 })      // unique material
  );
  // ... 6-7 more meshes, each with unique geo+mat
}
```

**Why it's slow:** At VIEW_DIST=4, there are ~81 loaded chunks. Per chunk: 2-5 trees (7 meshes each = 14-35), 0-2 rocks (1-3 meshes each), 0-1 logs (1-2 meshes), 0-2 mushroom clusters (6-12 meshes each), 0-2 stumps (1-3 meshes), 3-6 grass patches (3-8 meshes each), 1-3 flower patches (4-6 meshes each). Conservative estimate: ~40-60 meshes per chunk * 81 chunks = **3,200-4,800 decoration meshes** in the scene, each with unique geometry and material. This is the single biggest source of draw calls.

**Optimization:** (a) Share geometries and materials across decoration types using caches:
```js
const trunkGeo = new THREE.BoxGeometry(0.3, 2, 0.3);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x664422 });
```
(b) Merge all static decorations within a chunk into a single merged geometry per chunk.
(c) Use `THREE.InstancedMesh` for same-type decorations (all tree trunks = 1 instanced mesh, all canopies = 1, etc.).
(d) Reduce grass/flower blade count — they are the most numerous and least visible.

**Estimated improvement:** 5-15 FPS (mainly GPU draw-call-bound scenarios).
**Implementation complexity:** Medium for material/geometry caching; Hard for instanced or merged geometry.

---

### M2. Tree canopy sway iterates ALL decorations every frame

**File:** `js/game3d.js` lines 5709-5721
**Code:**
```js
if (terrainState && terrainState.decorations) {
  const windTime = clock.elapsedTime;
  for (const deco of terrainState.decorations) {    // all decorations in all loaded chunks
    if (!deco.meshes) continue;
    for (const m of deco.meshes) {                  // every mesh in every decoration
      if (m.userData && m.userData.isCanopy) {
        m.rotation.z = ...;
        m.rotation.x = ...;
      }
    }
  }
}
```

**Why it's slow:** This iterates every mesh of every decoration across all ~81 loaded chunks to find canopy meshes. Most meshes are NOT canopies but the loop still checks them. With ~4,000 decoration meshes, this is ~4,000 `userData` checks per frame just to animate ~200 canopies. The property access pattern (`m.userData && m.userData.isCanopy`) also prevents V8 optimization on the hot inner loop.

**Optimization:** Maintain a separate `terrainState.canopyMeshes` array that only contains canopy meshes. Populate it during chunk generation, remove entries on chunk unload. This reduces the loop from ~4,000 to ~200 iterations.

**Estimated improvement:** 2-5 FPS (CPU-bound).
**Implementation complexity:** Easy — add one array and two splice operations in terrain.js.

---

### M3. `spawnFireParticle` allocates a new material per particle

**File:** `js/game3d.js` lines 1588-1598
**Code:**
```js
function spawnFireParticle(hex, x, y, z, life, opts) {
  if (fireParticles.length >= MAX_FIRE_PARTICLES) return null;
  const mat = new THREE.MeshBasicMaterial({ color: hex });  // ← new material every call
  ...
}
```

**Why it's slow:** Fire particles are spawned frequently — fire aura (30% chance/frame), lightning shield (6 particles per zap), berserker rage, ghost form, time warp, earthquake stomp (24 per landing), bomb trail explosions (10 per bomb), frost nova (20 per burst), and various other effects. Each one allocates a new `MeshBasicMaterial`, and on death the material is disposed. This creates GC pressure and prevents draw call batching. Although capped at 80 particles, the constant allocate/dispose churn affects both CPU (GC pauses) and GPU (no batching).

**Optimization:** Use a material cache keyed by hex color. Most particles use a small set of colors (fire: 0xff6600/0xff2200, frost: 0x88ccff, lightning: 0x44aaff, etc.). Cache ~10 materials and reuse them. Do NOT dispose shared materials on particle death.

**Estimated improvement:** 3-5 FPS during active powerup effects + reduced GC stutters.
**Implementation complexity:** Easy — add a `Map<number, MeshBasicMaterial>` cache.

---

### M4. HUD allocates `new THREE.Vector3` per floating text per frame

**File:** `js/3d/hud.js` lines 228-239, 289, 301
**Code:**
```js
for (const ft of s.floatingTexts3d) {
  const v = new THREE.Vector3(ft.x, ft.y, ft.z);   // ← new allocation per text per frame
  v.project(camera);
  ...
}
```

**Why it's slow:** Every frame, for every floating text (up to 15), a new `THREE.Vector3` is allocated just for projection. Similarly, crate and item labels each allocate a Vector3. Over 60 FPS, that is 900-1800 object allocations per second just for the HUD. These small allocations generate garbage collection pressure, causing periodic frame stalls.

**Optimization:** Hoist a single reusable `const _v = new THREE.Vector3()` outside the function and reuse it: `_v.set(ft.x, ft.y, ft.z); _v.project(camera);`

**Estimated improvement:** 1-3 FPS + elimination of periodic GC-induced frame stalls.
**Implementation complexity:** Easy — single-line change.

---

### M5. Player `playerGroup.traverse()` called every frame for ghost form check

**File:** `js/game3d.js` lines 4324-4348
**Code:**
```js
if (st.ghostForm) {
  playerGroup.traverse(child => {        // ← traverses entire player model tree
    if (child.isMesh && child.material) {
      child.material.transparent = true;
      child.material.opacity = 0.3 + Math.sin(clock.elapsedTime * 6) * 0.15;
    }
  });
} else {
  // Restore opacity when ghost form ends
  playerGroup.traverse(child => {        // ← traverses AGAIN even when not in ghost form
    if (child.isMesh && child.material && child.material.transparent && child.material.opacity < 0.9) {
      child.material.opacity = 1;
      child.material.transparent = false;
    }
  });
}
```

**Why it's slow:** The player model has ~30-50 mesh children (body parts, items, wings). Every single frame, `traverse()` is called to check/set transparency, even in the `else` branch when ghost form is inactive. The `else` branch should only run once when ghost form ends, not every frame forever.

**Optimization:** (a) Cache the player's mesh children array once at build time. (b) In the `else` branch, use a flag (`st._ghostFormWasActive`) to run the restore loop only once on transition, not every frame. (c) For the active branch, iterate the cached array directly instead of using `traverse()`.

**Estimated improvement:** 2-4 FPS (minor CPU savings, but adds up with 60 FPS).
**Implementation complexity:** Easy.

---

### M6. `Array.splice()` in reverse loops for dead enemy cleanup

**File:** `js/game3d.js` lines 5670-5672
**Code:**
```js
for (let i = st.enemies.length - 1; i >= 0; i--) {
  if (!st.enemies[i].alive) st.enemies.splice(i, 1);
}
```

**Also at:** XP gems (line 5242, 5286, 5302), floating texts (line 5636), attack lines (line 5191), bomb trail bombs (line 4571), projectiles (line 5206, 3067), weapon effects (various), power crates (line 5374), item pickups (line 5446, 5453), map gems (line 5339), and more.

**Why it's slow:** `Array.splice(i, 1)` on a large array is O(n) because it shifts all subsequent elements. When multiple enemies die in the same frame (common during wave events), this becomes O(n*k) where k is the number of dead enemies. With 60+ enemies and 5-10 dying per frame during a wave, each splice shifts ~50 elements, totaling ~250-500 element moves per frame.

**Optimization:** Use the swap-and-pop pattern: swap the dead element with the last element, then `pop()`. This is O(1) per removal. Alternatively, use `st.enemies = st.enemies.filter(e => e.alive)` once per frame (single pass, creates new array but avoids repeated splicing). The filter approach is cleaner and only allocates one array per frame.

**Estimated improvement:** 2-5 FPS during wave events with high enemy death rates.
**Implementation complexity:** Easy.

---

## LOW IMPACT (1-5 FPS)

### L1. `updateMuscleGrowth()` called every frame with no change detection

**File:** `js/game3d.js` line 4210, `js/3d/player-model.js` lines 497-550
**Code:**
```js
// Called every frame in tick():
updateMuscleGrowth(playerModel, st.level);

// The function:
export function updateMuscleGrowth(model, level) {
  const t = level - 1;
  const mS = Math.min(1.8, 1 + t * 0.05);
  // ... sets scale on ~15-20 mesh parts every frame
}
```

**Why it's slow:** Player level changes maybe 10-15 times per game, but `updateMuscleGrowth` runs every frame (~3,600 times per minute), redundantly setting the same scale values on ~15-20 mesh parts. Each `.scale.set()` call triggers Three.js to mark the object's world matrix as needing update.

**Optimization:** Cache `st._lastGrowthLevel` and skip the function if level hasn't changed:
```js
if (st.level !== st._lastGrowthLevel) {
  updateMuscleGrowth(playerModel, st.level);
  st._lastGrowthLevel = st.level;
}
```

**Estimated improvement:** 1-2 FPS.
**Implementation complexity:** Easy — three lines.

---

### L2. Fog-of-war string key generation allocates per cell per frame

**File:** `js/game3d.js` lines 4044-4056
**Code:**
```js
const pcx = Math.floor(st.playerX / fogCell);
const pcz = Math.floor(st.playerZ / fogCell);
for (let dx = -fogCells; dx <= fogCells; dx++) {
  for (let dz = -fogCells; dz <= fogCells; dz++) {
    if (dx * dx + dz * dz <= fogCells * fogCells) {
      st.fogRevealed.add((pcx + dx) + ',' + (pcz + dz));   // ← string concat per cell
    }
  }
}
```

**Why it's slow:** With `fogRadius=30` and `fogCell=4`, `fogCells=8`, the double loop covers a 17x17 grid with ~200 cells inside the circle. Each iteration creates a string via concatenation. At 60 FPS, that is ~12,000 string allocations per second just for fog tracking. Since `Set.add()` is a no-op for existing keys, most of these strings are immediately discarded, generating garbage.

**Optimization:** (a) Only update fog when the player moves to a new fog cell (check `currentCellX !== lastCellX || currentCellZ !== lastCellZ`). This reduces the update from 60/s to ~5/s. (b) Use a numeric key (e.g., `(pcx + dx) * 100000 + (pcz + dz)`) stored in a `Set<number>` to avoid string allocation entirely.

**Estimated improvement:** 1-2 FPS.
**Implementation complexity:** Easy.

---

### L3. Player-terrain collision iterates all global colliders

**File:** `js/game3d.js` lines 4059-4073
**Code:**
```js
if (terrainState && terrainState.colliders) {
  const PR = 0.5;
  for (const c of terrainState.colliders) {    // ALL colliders in ALL loaded chunks
    ...
  }
}
```

**Why it's slow:** Same issue as H3 but for the player instead of enemies. The player checks against all ~350 loaded colliders when only the ~5-10 in the current/adjacent chunks matter. Less impactful than H3 because it runs once (not per-enemy) but still wasteful.

**Optimization:** Use `collidersByChunk` lookup (9 chunks * ~4 colliders = ~36 checks instead of ~350).

**Estimated improvement:** 1-2 FPS.
**Implementation complexity:** Easy — same pattern already used for enemies at lines 4872-4896.

---

### L4. `findNearestEnemy()` called per weapon per cooldown cycle

**File:** `js/game3d.js` lines 2252-2267, called from `updateWeapons` lines 2796-2833
**Code:**
```js
function findNearestEnemy(range) {
  for (const e of st.enemies) {    // full scan of all enemies
    ...
  }
}
```

**Why it's slow:** Each weapon calls `findNearestEnemy` when its cooldown expires. With 4 weapon slots and varied cooldowns, this can trigger 2-4 full scans of the enemy list per frame. Each scan is O(n) where n is enemy count. With 60 enemies, that is 120-240 distance checks just for weapon targeting.

**Optimization:** Cache the nearest enemy result for the current frame (since all weapons fire from the same player position):
```js
let _nearestEnemyCache = null;
let _nearestEnemyCacheFrame = -1;
function findNearestEnemy(range) {
  if (_nearestEnemyCacheFrame === frameCount) return _nearestEnemyCache;
  // ... do the scan
  _nearestEnemyCacheFrame = frameCount;
  _nearestEnemyCache = result;
}
```

Note: This assumes all weapons use the same max range. If ranges differ, cache the full scan result and filter by range.

**Estimated improvement:** 1-2 FPS.
**Implementation complexity:** Easy.

---

### L5. `ITEMS_3D.find()` called per frame in HUD for each equipped item

**File:** `js/3d/hud.js` lines 172, 186, 198, 266, etc.
**Code:**
```js
const armorDef = ITEMS_3D.find(i => i.id === s.items.armor);
const bootDef = ITEMS_3D.find(i => i.id === s.items.boots);
const itemDef = ITEMS_3D.find(i => i.slot === slot);
```

**Why it's slow:** `ITEMS_3D` is an array of 25 items. Each `.find()` is O(n). The HUD calls `.find()` up to ~20 times per frame to look up item definitions for display. At 60 FPS, that is ~1,200 linear scans of a 25-element array per second. Not devastating, but wasteful.

**Optimization:** Build lookup maps at module load time:
```js
const ITEMS_BY_ID = Object.fromEntries(ITEMS_3D.map(i => [i.id, i]));
const ITEMS_BY_SLOT = Object.fromEntries(ITEMS_3D.map(i => [i.slot, i]));
```

**Estimated improvement:** 1 FPS.
**Implementation complexity:** Easy.

---

## PREVENTIVE (not a problem yet, but will be)

### P1. `st.fogRevealed` Set grows unboundedly

**File:** `js/game3d.js` line 4052

The `fogRevealed` Set grows every time the player explores new terrain. In a long game (10+ minutes of exploration), this Set could contain 5,000-10,000 entries. The minimap iterates the Set's keys (or a subset) every frame. As the Set grows, the minimap rendering in `hud.js` (lines 403-441) becomes increasingly expensive.

**Optimization:** Cap the Set size (e.g., 5,000 entries). When exceeded, remove the oldest/farthest entries. Or switch to a typed array bitmask indexed by cell coordinate.

**Implementation complexity:** Medium.

---

### P2. No frustum culling for enemies or decorations

The game relies on Three.js automatic frustum culling (`object.frustumCulled = true` by default). However, each enemy is a `THREE.Group` containing 15-40+ children. Groups do not have geometry, so Three.js must check each child mesh individually for frustum culling. With 50 enemies * 20 meshes = 1,000 frustum tests per frame, this adds CPU overhead.

**Optimization:** Manually cull entire enemy groups based on distance-to-camera before the render call. Set `group.visible = false` for enemies >50 units away. This skips all children in one check.

**Implementation complexity:** Easy.

---

### P3. No object pooling for frequently created/destroyed objects

XP gems, fire particles, weapon projectiles, weapon effects, attack lines, bomb trail bombs, and bee entities are all created with `new THREE.Mesh(new THREE.BoxGeometry(...), new THREE.Material(...))` and disposed on death. This constant allocate/dispose cycle creates GC pressure.

**Optimization:** Implement object pools for each frequently-spawned entity type. Pre-allocate a pool of ~100 gem meshes, ~80 particle meshes, ~20 projectile meshes. On "death," return to pool (set `visible = false`) instead of disposing. On "spawn," take from pool, reset position, set `visible = true`.

**Implementation complexity:** Medium.

---

### P4. No LOD (Level of Detail) for distant enemies

All enemies render at full detail regardless of distance. A tier 10 enemy at 40 units away renders all 40+ meshes even though it appears as a few pixels on screen.

**Optimization:** Use simplified models (1-3 meshes) for enemies beyond 25 units. Or use `THREE.LOD` objects with 2 detail levels. The distant model could be a single colored box.

**Implementation complexity:** Medium.

---

### P5. Terrain decoration count per chunk has no density scaling with distance

All chunks at VIEW_DIST=4 generate the same density of decorations (40-60 meshes per chunk). Distant chunks could use lower decoration density since details are not visible at 50+ units.

**Optimization:** Pass a distance tier to `generateChunk` and reduce decoration counts for far chunks. Near chunks (0-2): full density. Medium (2-3): 50% density. Far (3-4): 25% density (trees only).

**Implementation complexity:** Easy.

---

### P6. The `unloadChunk` decoration removal iterates ALL decorations

**File:** `js/3d/terrain.js` lines 684-691
**Code:**
```js
for (let i = ts.decorations.length - 1; i >= 0; i--) {
  const d = ts.decorations[i];
  if (d.x >= ox && d.x < ox + CHUNK_SIZE && d.z >= oz && d.z < oz + CHUNK_SIZE) {
    d.meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    ts.decorations.splice(i, 1);
  }
}
```

**Why it's concerning:** Unloading a chunk scans the entire decorations array (potentially 3,000+ entries) looking for decorations in that chunk's bounds. With `splice` in the loop, this is O(n*k). As the player moves and chunks load/unload, this causes frame hitches.

**Optimization:** Index decorations by chunk key in a `Map<string, Decoration[]>`. On unload, look up directly by key — O(1) instead of O(n).

**Implementation complexity:** Easy.

---

### P7. The `colliders` array in terrain state also grows and filters linearly

**File:** `js/3d/terrain.js` lines 693-697
**Code:**
```js
ts.colliders = ts.colliders.filter(c => {
  const ccx = Math.floor(c.x / CHUNK_SIZE);
  const ccz = Math.floor(c.z / CHUNK_SIZE);
  return !(ccx === cx && ccz === cz);
});
```

**Why it's concerning:** On chunk unload, the global colliders array is `.filter()`'d, creating a new array. With 350+ colliders across 81 chunks, this allocates a new ~340-element array and does a division + floor per element. Combined with H3's recommendation to remove the global colliders array entirely, this becomes moot.

**Optimization:** Remove the global `colliders` array entirely and use only `collidersByChunk`. See H3.

**Implementation complexity:** Easy (part of H3 fix).

---

## Summary: Priority Implementation Order

| Priority | ID | Estimated FPS Gain | Complexity | Description |
|----------|-----|-------------------|------------|-------------|
| 1 | H3 | 10-20 FPS | Easy | Remove duplicate enemy-terrain collision (global array) |
| 2 | H5 | 10-20 FPS | Easy | Reduce shadow map quality / disable on low-end |
| 3 | M3 | 3-5 FPS | Easy | Cache fire particle materials by color |
| 4 | M4 | 1-3 FPS | Easy | Reuse Vector3 in HUD instead of allocating per frame |
| 5 | M5 | 2-4 FPS | Easy | Fix ghost form traverse to only run on state change |
| 6 | M6 | 2-5 FPS | Easy | Swap-and-pop for array removal in hot loops |
| 7 | L1 | 1-2 FPS | Easy | Skip muscle growth when level unchanged |
| 8 | L2 | 1-2 FPS | Easy | Throttle fog-of-war updates to cell changes only |
| 9 | L3 | 1-2 FPS | Easy | Use chunk-indexed colliders for player too |
| 10 | H1 | 10-30 FPS | Medium | InstancedMesh or shared materials for XP gems |
| 11 | H2 | 5-15 FPS | Medium | Spatial hash for zombie merge loop |
| 12 | M2 | 2-5 FPS | Easy | Separate canopy mesh array for wind animation |
| 13 | M1 | 5-15 FPS | Medium-Hard | Shared/instanced geometry for terrain decorations |
| 14 | H4 | 15-30 FPS | Hard | Merged geometry or instancing for enemy models |

**Quick wins (Easy, lines 1-9):** Combined estimated gain of 30-60 FPS on low-end hardware, implementable in a single sprint.

**Medium effort (lines 10-12):** Combined estimated gain of 17-50 FPS additional, requiring architectural changes.

**Heavy lift (lines 13-14):** Combined estimated gain of 20-45 FPS additional, requiring significant refactoring.
