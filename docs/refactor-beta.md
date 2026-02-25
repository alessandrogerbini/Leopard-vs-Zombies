# BD-247: Refactor Review Beta -- Performance & Resource Management

**Scope:** Per-frame allocations, hot loop optimization, Three.js resource lifecycle,
memory leaks, GC pressure, render pipeline efficiency, spatial indexing, and object
pooling opportunities.

**Threshold:** Only issues likely to cause visible FPS drops or memory growth during
15+ minute sessions with 100+ zombies on screen.

**Files reviewed:**
- `js/game3d.js` (~7998 lines)
- `js/3d/terrain.js` (~828 lines)
- `js/3d/player-model.js` (~903 lines)
- `js/3d/constants.js` (~1200 lines, pure data -- no performance concerns)
- `js/3d/utils.js` (~86 lines, for context on existing caching)

---

## Table of Contents

1. [MUST-DO: Per-frame playerGroup.traverse() triple-call](#1-per-frame-playergroupportraverse-triple-call)
2. [MUST-DO: Death sequence traverses every enemy group every frame](#2-death-sequence-traverses-every-enemy-group-every-frame)
3. [MUST-DO: Uncached enemy materials accumulate over session](#3-uncached-enemy-materials-accumulate-over-session)
4. [SHOULD-DO: Platform collision linear scan with no spatial index](#4-platform-collision-linear-scan-with-no-spatial-index)
5. [SHOULD-DO: getNearbyColliders allocates a new array every frame](#5-getnearbycolliders-allocates-a-new-array-every-frame)
6. [SHOULD-DO: Fog-of-war string creation every frame](#6-fog-of-war-string-creation-every-frame)
7. [SHOULD-DO: createAttackLine allocates Vector3 and BufferGeometry per call](#7-createattackline-allocates-vector3-and-buffergeometry-per-call)
8. [SHOULD-DO: Weapon projectile and XP gem arrays use splice](#8-weapon-projectile-and-xp-gem-arrays-use-splice)
9. [SHOULD-DO: Decoration flat arrays reallocated on chunk unload](#9-decoration-flat-arrays-reallocated-on-chunk-unload)
10. [SHOULD-DO: updateItemVisuals / updateWearableVisuals dispose and recreate all meshes](#10-updateitemvisuals--updatewearablevisuals-dispose-and-recreate-all-meshes)
11. [NICE-TO-HAVE: Canopy wind animation iterates all loaded canopy meshes](#11-canopy-wind-animation-iterates-all-loaded-canopy-meshes)
12. [NICE-TO-HAVE: Bomb trail creates uncached SphereGeometry per bomb](#12-bomb-trail-creates-uncached-spheregeometry-per-bomb)
13. [NICE-TO-HAVE: Boss phase visuals create inline materials and geometries](#13-boss-phase-visuals-create-inline-materials-and-geometries)
14. [NICE-TO-HAVE: Angel wings create uncached geometry and materials](#14-angel-wings-create-uncached-geometry-and-materials)
15. [NICE-TO-HAVE: Chunk key string parsing in hot loops](#15-chunk-key-string-parsing-in-hot-loops)
16. [Existing Good Patterns (no action needed)](#existing-good-patterns-no-action-needed)

---

## 1. Per-frame playerGroup.traverse() triple-call

**Priority:** MUST-DO

**File:** `js/game3d.js` lines 4911-4946

**Problem:**
Every single frame, the player color logic runs one of three `playerGroup.traverse()`
calls -- death desaturation (lines 4915-4927), hurt flash (lines 4930-4938), or color
restoration (lines 4941-4945). The player model contains roughly 40-60 mesh children
(body parts, muscles, item visuals, wearables). Each traverse walks the entire scene
subtree, checking `isMesh`, accessing `material`, reading `userData._trueColor`, and
performing color math.

Even the "idle" path (no flash, no death) traverses every mesh every frame just to
call `setHex(_trueColor)` -- effectively a no-op when colors are already restored.

**Impact:** At 60 FPS, this is 2400-3600 property lookups per second on the idle path.
During hurt flash with rapid hits, two separate traversals may alternate frames. The
death desaturation path adds per-channel arithmetic on top.

**Proposed solution:**
Cache the list of meshes with `_trueColor` at model build time. Track a "dirty" flag
that is set when flash or death state changes, and only iterate when the flag is set.

```js
// At model construction time (after line 1722):
const colorMeshes = [];
playerGroup.traverse(child => {
  if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
    colorMeshes.push(child);
  }
});

// In the per-frame block (replacing lines 4911-4946):
const needsColorUpdate = st.deathSequence || st.playerHurtFlash > 0 || st._colorDirty;
if (needsColorUpdate) {
  if (st.deathSequence) {
    const deathProgress = 1 - (st.deathSequenceTimer / 1.5);
    const grayMix = Math.min(deathProgress * 1.2, 0.7);
    for (let i = 0; i < colorMeshes.length; i++) {
      const child = colorMeshes[i];
      const orig = child.userData._trueColor;
      const r = (orig >> 16) & 0xff;
      const g = (orig >> 8) & 0xff;
      const b = orig & 0xff;
      const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      child.material.color.setHex(
        (Math.round(r + (gray - r) * grayMix) << 16) |
        (Math.round(g + (gray - g) * grayMix) << 8) |
        Math.round(b + (gray - b) * grayMix)
      );
    }
  } else if (st.playerHurtFlash > 0) {
    st.playerHurtFlash -= gameDt;
    for (let i = 0; i < colorMeshes.length; i++) {
      const child = colorMeshes[i];
      const orig = child.userData._trueColor;
      child.material.color.setHex(
        (Math.round(((orig >> 16) & 0xff) * 0.5 + 127.5) << 16) |
        (Math.round(((orig >> 8) & 0xff) * 0.5 + 127.5) << 8) |
        Math.round((orig & 0xff) * 0.5 + 127.5)
      );
    }
    st._colorDirty = true;
  } else {
    // Restore once, then clear dirty flag
    for (let i = 0; i < colorMeshes.length; i++) {
      colorMeshes[i].material.color.setHex(colorMeshes[i].userData._trueColor);
    }
    st._colorDirty = false;
  }
}
```

**Effort:** Small (30 minutes). Cache array is ~5 lines. Dirty flag is 1 state variable.

---

## 2. Death sequence traverses every enemy group every frame

**Priority:** MUST-DO

**File:** `js/game3d.js` lines 6885-6916

**Problem:**
During the 1.5-second death sequence, every frame iterates ALL enemies in `st.enemies`
and calls `.traverse()` on each enemy's group. With 100+ zombies on screen, each with
15-30 mesh children, this is **1500-3000 traverse callbacks per frame** just to set
`emissiveIntensity = 0` on non-killer zombies. The killer zombie also gets a full
traverse per frame for the pulsing glow.

The non-killer zombies have their emissive set to 0 every single frame redundantly --
after the first frame, they are already at 0.

**Impact:** At 100 enemies with 20 meshes each, that is 2000 mesh property writes per
frame for 90 frames (1.5s at 60fps) = 180,000 redundant property sets over the death
sequence. This directly competes with the death slow-motion effect for CPU time.

**Proposed solution:**
Apply the "dim others" pass once when the death sequence starts (not every frame).
Only traverse the killer zombie per-frame for the pulse.

```js
// When death sequence begins (after line 7742 where st.deathSequence = true):
// One-time dim pass
for (const e of st.enemies) {
  if (e !== st.lastDamageSource?.enemyRef) {
    e.group.traverse(child => {
      if (child.isMesh && child.material) child.material.emissiveIntensity = 0;
    });
  }
}

// Per-frame block (replacing lines 6885-6916):
if (st.deathSequence) {
  const killerRef = st.lastDamageSource?.enemyRef;
  if (killerRef && killerRef.alive) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
    // Cache killer meshes on first access
    if (!killerRef._emissiveMeshes) {
      killerRef._emissiveMeshes = [];
      killerRef.group.traverse(child => {
        if (child.isMesh && child.material) {
          if (!child.material.emissive) child.material.emissive = new THREE.Color();
          killerRef._emissiveMeshes.push(child);
        }
      });
    }
    for (const child of killerRef._emissiveMeshes) {
      child.material.emissive.setHex(st.lastDamageSource.color || 0xff4444);
      child.material.emissiveIntensity = pulse;
    }
    // Floating label (spawned once)
    if (!st._killerLabelSpawned) {
      st._killerLabelSpawned = true;
      const tierName = st.lastDamageSource.tierName || 'ZOMBIE';
      const color = '#' + (st.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
      addFloatingText(tierName.toUpperCase(), color,
        killerRef.group.position.x, killerRef.group.position.y + 3,
        killerRef.group.position.z, 2.0, true);
    }
  }
}
```

**Effort:** Small (30 minutes). Move bulk logic to a one-time init, cache killer meshes.

---

## 3. Uncached enemy materials accumulate over session

**Priority:** MUST-DO

**File:** `js/game3d.js` lines 1837-1950

**Problem:**
Every `createEnemy()` call creates new `THREE.MeshBasicMaterial` instances that are
never shared:

- Line 1837: `eyeGlowMat` -- new material per enemy
- Line 1854: `sideEyeMat` (tier 6+) -- new material per enemy
- Line 1929: `auraMat` (tier 9+) -- new material per enemy (also `new THREE.BoxGeometry`)
- Line 1942: `crownMat` (tier 10) -- new material per enemy (also `new THREE.BoxGeometry`)
- Lines 1840-1843: `new THREE.BoxGeometry` for eye meshes -- unique per enemy

The game already has `getCachedGeo()` and `getCachedMat()` in `js/3d/utils.js` but
the enemy builder does not use them for these special materials. Over a 15-minute
session with hundreds of enemy spawns and kills, this creates hundreds of orphaned
GPU material/geometry objects even after dispose, because `disposeEnemy` traverses
and disposes but the GC must then reclaim JavaScript-side references.

**Impact:** With a spawn rate of ~2-5 enemies per second over 15 minutes, that is
1800-4500 enemy spawns. Each creates 1-4 unique materials (depending on tier).
Conservative estimate: 3000+ material objects and 2000+ geometry objects allocated
over a session, with corresponding GPU texture uploads for each material.

**Proposed solution:**
Create per-tier material and geometry caches at the top of the game function scope.
Alternatively, extend `getCachedMat()` from utils.js to support MeshBasicMaterial
with a variant key.

```js
// Near top of launch3DGame, after imports:
const enemyMatCache = new Map(); // key: "basic_<hex>" or "basic_<hex>_t<opacity>"
function getCachedBasicMat(color, opts = {}) {
  const key = `basic_${color}_${opts.transparent ? 't' + opts.opacity : 'o'}`;
  if (!enemyMatCache.has(key)) {
    enemyMatCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  }
  return enemyMatCache.get(key);
}

// In createEnemy (replace lines 1837, 1854, 1929, 1942):
const eyeGlowMat = getCachedBasicMat(td.eye);
// For tier 6+ side eyes:
const sideEyeMat = eyeGlowMat; // same color, reuse
// For tier 9+ aura:
const auraMat = getCachedBasicMat(td.eye, { transparent: true, opacity: 0.4 });
// For tier 10 crown:
const crownMat = getCachedBasicMat(0xff4400);

// Eye geometries -- use getCachedGeo:
const eyeL = new THREE.Mesh(getCachedGeo(0.06 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
```

Note: Shared materials mean you cannot modify `.color` on individual enemies without
affecting all enemies sharing that material. The existing `e.body.material.color.setHex()`
calls for ignite/flash effects would need to either (a) clone-on-write when modified,
or (b) use a per-enemy override material stored on the enemy object for transient effects.
Given that `box()` in utils.js already returns shared materials and the existing code
already calls `.color.setHex()` on the body (line 6875 for ignite), you may want to
adopt a `.clone()` strategy for the body mesh material only while sharing all other
materials. This keeps 90% of the savings while preserving per-enemy color effects.

**Effort:** Medium (1-2 hours). Need to audit all places that mutate enemy material
colors to avoid shared-material side effects.

---

## 4. Platform collision linear scan with no spatial index

**Priority:** SHOULD-DO

**File:** `js/game3d.js` lines 4836-4879

**Problem:**
Platform collision (lines 4837-4851) and horizontal plateau collision (lines 4856-4879)
each iterate through the entire `platforms` array every frame. Platforms are generated
per chunk. With VIEW_DIST=4, that is up to (9*9) = 81 chunks loaded, and each chunk
can contain platforms. The platforms array grows unboundedly as the player explores.

By contrast, terrain colliders already use chunk-indexed lookup via
`getNearbyColliders()` (checking only the 9 nearest chunks). Platforms have no such
spatial index.

**Impact:** If the player has explored 100+ chunks with an average of 0.5 platforms each,
that is 50+ platform AABB checks per frame (two full passes = 100 checks). Not
catastrophic, but avoidable since the infrastructure already exists.

**Proposed solution:**
Index platforms by chunk key, analogous to `collidersByChunk` in terrain.js.

```js
// Add to terrainState or alongside platforms:
const platformsByChunk = new Map();

// When creating a platform (wherever platforms.push(...) is called):
const platChunkKey = `${Math.floor(p.x / CHUNK_SIZE)},${Math.floor(p.z / CHUNK_SIZE)}`;
if (!platformsByChunk.has(platChunkKey)) platformsByChunk.set(platChunkKey, []);
platformsByChunk.get(platChunkKey).push(p);

// Replace platform collision loops with chunk-indexed lookup:
function getNearbyPlatforms(px, pz) {
  const cx = Math.floor(px / CHUNK_SIZE);
  const cz = Math.floor(pz / CHUNK_SIZE);
  const result = _platformBuffer; // reuse static array (see item #5)
  result.length = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const arr = platformsByChunk.get(`${cx + dx},${cz + dz}`);
      if (arr) for (let i = 0; i < arr.length; i++) result.push(arr[i]);
    }
  }
  return result;
}
```

**Effort:** Small (45 minutes). Mirror the existing collidersByChunk pattern.

---

## 5. getNearbyColliders allocates a new array every frame

**Priority:** SHOULD-DO

**File:** `js/3d/terrain.js` lines 151-165

**Problem:**
`getNearbyColliders()` is called every frame for player collision (line 4734 in
game3d.js). It creates `const result = []` and pushes ~30 items into it, then
returns the array. The returned array is consumed immediately in a `for` loop
(lines 4735-4758) and then discarded, becoming GC garbage.

At 60 FPS, this creates 60 short-lived arrays per second, each with ~30 elements.
While individually small, these add up over a 15-minute session to ~54,000 allocated
and discarded arrays, contributing to minor GC pauses.

**Impact:** Low-to-moderate. Modern V8 handles short-lived objects well, but in a
game loop every allocation increases the frequency of minor GC pauses. Combined with
other per-frame allocations (fog strings, attack lines), this contributes to
occasional frame hitches.

**Proposed solution:**
Reuse a module-level static array buffer, reset its length each call.

```js
// At module level in terrain.js:
const _colliderBuffer = [];

export function getNearbyColliders(wx, wz, ts) {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  _colliderBuffer.length = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = getChunkKey(cx + dx, cz + dz);
      const arr = ts.collidersByChunk.get(key);
      if (arr) {
        for (let i = 0; i < arr.length; i++) _colliderBuffer.push(arr[i]);
      }
    }
  }
  return _colliderBuffer;
}
```

The caller already consumes the result synchronously before any other call to
`getNearbyColliders`, so reuse is safe.

**Effort:** Small (15 minutes). One variable, reset length.

---

## 6. Fog-of-war string creation every frame

**Priority:** SHOULD-DO

**File:** `js/game3d.js` lines 4716-4729

**Problem:**
Every frame, the fog-of-war reveal loop runs a double `for` loop with
`fogCells = Math.ceil(30/4) = 8`, so dx and dz each range [-8, 8] for a
17x17 grid = 289 iterations. Each iteration that passes the distance check
(roughly 225 iterations in a circle) creates a string via
`(pcx + dx) + ',' + (pcz + dz)` and adds it to `st.fogRevealed` (a Set).

This produces ~225 short-lived string allocations per frame. Over time the Set
also grows unboundedly as the player explores.

**Impact:** 225 * 60 = 13,500 string allocations per second. Each is a short
concatenation (`"12,34"` format), so individually cheap, but the volume creates
measurable GC pressure. The Set growth is also a slow memory leak -- after
exploring a large area, the Set can contain tens of thousands of entries that
are never cleaned up.

**Proposed solution:**
Use a numeric encoding instead of string keys. A 2D coordinate pair where each
value fits in 16 bits can be packed into a single 32-bit integer.

```js
// Replace the fog-of-war block (lines 4716-4729):
{
  const fogCell = 4, fogRadius = 30;
  const fogCells = Math.ceil(fogRadius / fogCell);
  const pcx = Math.floor(st.playerX / fogCell);
  const pcz = Math.floor(st.playerZ / fogCell);
  for (let dx = -fogCells; dx <= fogCells; dx++) {
    for (let dz = -fogCells; dz <= fogCells; dz++) {
      if (dx * dx + dz * dz <= fogCells * fogCells) {
        // Pack two 16-bit signed integers into one 32-bit key
        st.fogRevealed.add(((pcx + dx + 32768) << 16) | ((pcz + dz + 32768) & 0xffff));
      }
    }
  }
}
```

The HUD rendering code that reads `st.fogRevealed` would need a matching decoder:
```js
const fx = (key >> 16) - 32768;
const fz = (key & 0xffff) - 32768;
```

Zero string allocations per frame. The Set stores numbers instead of strings,
which are also more memory-efficient in V8 (Smi representation for small integers).

**Effort:** Small (30 minutes). Change encoding in the writer and decoder in the HUD.

---

## 7. createAttackLine allocates Vector3 and BufferGeometry per call

**Priority:** SHOULD-DO

**File:** `js/game3d.js` lines 2378-2384

**Problem:**
Each auto-attack creates a visual "attack line" via `createAttackLine()`, which
allocates:
- 2x `new THREE.Vector3`
- 1x `new THREE.BufferGeometry().setFromPoints(pts)`

Attack lines have a lifetime of 6 frames, and auto-attacks fire continuously
(every 0.5-1s depending on haste). With multiple weapon slots, this can be
3-4 attack lines per second. Each line's geometry is disposed on expiry
(line 7086), but the Vector3 objects become GC garbage.

**Impact:** Moderate. 3-4 geometry allocations + 6-8 Vector3 allocations per second.
The geometry allocation is the heavier cost due to WebGL buffer creation and deletion.

**Proposed solution:**
Pool attack line geometries. Since all attack lines use the same `attackLineMat`
material, we only need to pool the geometry and Line mesh.

```js
// Pool for attack lines (near the createPool definition, ~line 1735):
const attackLinePool = createPool(() => {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(6); // 2 points * 3 components
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Line(geo, attackLineMat);
}, 8);

function createAttackLine(fx, fy, fz, tx, ty, tz) {
  const line = attackLinePool.acquire();
  const pos = line.geometry.attributes.position.array;
  pos[0] = fx; pos[1] = fy; pos[2] = fz;
  pos[3] = tx; pos[4] = ty; pos[5] = tz;
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  scene.add(line);
  return { line, life: 6 };
}

// In the cleanup loop (replace line 7085-7088):
if (st.attackLines[i].life <= 0) {
  scene.remove(st.attackLines[i].line);
  attackLinePool.release(st.attackLines[i].line);
  st.attackLines.splice(i, 1); // see item #8 for splice improvement
}
```

**Effort:** Small (30 minutes). Uses existing `createPool` infrastructure.

---

## 8. Weapon projectile and XP gem arrays use splice

**Priority:** SHOULD-DO

**File:** `js/game3d.js` lines 7087, 7102, 7138

**Problem:**
Several arrays use `.splice(i, 1)` for removal during reverse iteration:
- `st.attackLines.splice(i, 1)` at line 7087
- `st.projectiles.splice(i, 1)` at line 7102
- `st.xpGems.splice(j, 1)` at line 7138

Splice on arrays causes all subsequent elements to shift left by one position.
The enemy array already uses swap-and-pop (lines 7724-7736), which is O(1).

**Impact:** For `st.enemies`, the existing swap-and-pop is already correct. The other
arrays are typically smaller (attackLines ~5, projectiles ~10, xpGems ~50-200).
For xpGems specifically, during heavy combat the array can reach 100-200 entries,
and the O(n^2) merge loop (lines 7122-7143) performs multiple splices per pass.

**Proposed solution:**
Apply swap-and-pop to all removal-during-iteration patterns where order does not matter.

For attack lines and projectiles, order does not matter (they are independent entities).
For xpGems, the merge loop iterates by index so swap-and-pop requires care, but the
existing pattern already uses `i--` after splice. Switch to a mark-and-compact pass.

```js
// Attack lines (replace lines 7082-7089):
{
  let i = 0;
  while (i < st.attackLines.length) {
    st.attackLines[i].life--;
    if (st.attackLines[i].life <= 0) {
      scene.remove(st.attackLines[i].line);
      st.attackLines[i].line.geometry.dispose();
      st.attackLines[i] = st.attackLines[st.attackLines.length - 1];
      st.attackLines.pop();
    } else {
      i++;
    }
  }
}

// Projectiles (replace lines 7092-7115):
{
  let i = 0;
  while (i < st.projectiles.length) {
    const p = st.projectiles[i];
    p.mesh.position.x += p.vx * gameDt;
    p.mesh.position.z += p.vz * gameDt;
    p.mesh.rotation.y += gameDt * 10;
    p.life--;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      st.projectiles[i] = st.projectiles[st.projectiles.length - 1];
      st.projectiles.pop();
      continue;
    }
    // Hit enemies
    for (const e of st.enemies) {
      if (!e.alive || e.dying || p.hitEnemies.has(e)) continue;
      const dx = p.mesh.position.x - e.group.position.x;
      const dz = p.mesh.position.z - e.group.position.z;
      if (dx * dx + dz * dz < 1) {
        damageEnemy(e, st.attackDamage * st.dmgBoost * 0.8);
        p.hitEnemies.add(e);
      }
    }
    i++;
  }
}
```

**Effort:** Small (30 minutes). Mechanical pattern replacement.

---

## 9. Decoration flat arrays reallocated on chunk unload

**Priority:** SHOULD-DO

**File:** `js/3d/terrain.js` lines 773-788

**Problem:**
When a chunk is unloaded, two flat arrays are reallocated via `.filter()`:
- Line 780: `ts.decorations = ts.decorations.filter(d => !decsToRemove.has(d))`
- Line 787: `ts.canopyMeshes = ts.canopyMeshes.filter(m => !canopySet.has(m))`

Each `.filter()` creates a new array. The `decsToRemove` Set is also freshly
constructed from the chunk's decoration list (line 775). With VIEW_DIST=4,
during normal movement, chunks load and unload as the player crosses chunk
boundaries. Each crossing triggers 1-3 unloads, each reallocating these arrays.

With 81 chunks loaded, `ts.decorations` can contain 200-400 decoration objects
(~3-5 per chunk), so each filter pass copies ~200-400 references.

**Impact:** Low-to-moderate. Chunk unloads are infrequent (~every 16 world units of
movement), so this is not per-frame. But the allocation pattern creates medium-lived
garbage (the old array). During fast movement (e.g., wings powerup), unloads can
happen rapidly.

**Proposed solution:**
Switch flat arrays to chunk-indexed-only storage. Since the game already maintains
`ts.decorationsByChunk` and `ts.canopyMeshesByChunk`, the flat arrays are redundant
for any purpose other than iteration. If full iteration is needed elsewhere, build it
on demand from the chunk maps, or maintain a dirty-flagged cache.

Alternatively, use in-place compaction (swap-and-pop) on the flat arrays instead of
filter:

```js
// Replace lines 774-781:
const chunkDecs = ts.decorationsByChunk.get(key);
if (chunkDecs) {
  const decsToRemove = new Set(chunkDecs);
  for (const d of chunkDecs) {
    d.meshes.forEach(m => { scene.remove(m); });
  }
  // In-place removal (swap-and-pop)
  let i = 0;
  while (i < ts.decorations.length) {
    if (decsToRemove.has(ts.decorations[i])) {
      ts.decorations[i] = ts.decorations[ts.decorations.length - 1];
      ts.decorations.pop();
    } else {
      i++;
    }
  }
  ts.decorationsByChunk.delete(key);
}
```

**Effort:** Small (20 minutes). Swap-and-pop pattern, same for canopyMeshes.

---

## 10. updateItemVisuals / updateWearableVisuals dispose and recreate all meshes

**Priority:** SHOULD-DO

**File:** `js/3d/player-model.js` lines 747-792, 877-902

**Problem:**
`updateItemVisuals()` (line 747) disposes ALL item meshes and recreates them from
scratch whenever any item changes. Each box creates `new THREE.BoxGeometry` and
`new THREE.MeshLambertMaterial` (lines 780-783). The typical player has 3-8 equipped
items with 1-4 boxes each, so each call creates 3-32 geometries and materials.

`updateWearableVisuals()` (line 877) follows the same pattern for wearables: dispose
all via traverse (lines 884-887), then rebuild.

These are called on every item pickup and wearable equip. While not per-frame, during
active gameplay items are picked up every few seconds, and each call disposes 10-30
GPU objects and creates 10-30 new ones.

**Impact:** Moderate. Item pickups during heavy combat can happen every 2-5 seconds.
Each triggers GPU resource deallocation and reallocation. The dispose/recreate cycle
also causes brief frame hitches due to synchronous GPU calls.

**Proposed solution:**
Use `getCachedGeo()` and `getCachedMat()` from utils.js instead of creating unique
instances. Since item visual boxes have fixed dimensions and colors defined in
`ITEM_VISUALS`, the caches will have perfect hit rates.

```js
// In updateItemVisuals, replace lines 780-783:
for (const b of visual.boxes) {
  const geo = getCachedGeo(b.w, b.h, b.d);
  const mat = getCachedMat(b.color); // Note: won't support emissive
  // For emissive items, use a separate emissive cache:
  const matOpts = b.emissive
    ? getCachedEmissiveMat(b.color, b.emissive)
    : getCachedMat(b.color);
  const mesh = new THREE.Mesh(geo, matOpts);
  mesh.position.set(b.x, b.y + (offsets.headY || 0), b.z);
  mesh.castShadow = true;
  model.group.add(mesh);
  meshes.push(mesh);
}

// Disposal no longer needs geometry/material dispose since they are cached:
for (const mesh of model.itemMeshes[key]) {
  model.group.remove(mesh);
  // Do NOT dispose geometry or material -- they are shared via cache
}
```

Similarly for `updateWearableVisuals` -- `buildWearableMesh()` already uses `box()`
which uses the caches. The disposal at lines 884-887 should NOT traverse and dispose
if those geometries/materials are from `box()`, since they are shared. Currently
it does dispose, which would corrupt the caches.

**IMPORTANT**: The disposal in `updateWearableVisuals` (lines 884-887) is already
a latent bug -- it calls `.geometry.dispose()` and `.material.dispose()` on meshes
created via `box()`, which uses cached shared geometry and materials. This corrupts
the caches and could cause rendering artifacts. This should be fixed immediately by
removing the dispose calls and just doing `scene.remove()`.

**Effort:** Medium (1 hour). Requires auditing emissive materials and fixing the
wearable cache corruption bug.

---

## 11. Canopy wind animation iterates all loaded canopy meshes

**Priority:** NICE-TO-HAVE

**File:** `js/game3d.js` lines 7861-7869

**Problem:**
Every frame, the canopy wind animation iterates `terrainState.canopyMeshes`,
which contains ALL loaded canopy meshes across ALL loaded chunks. With
VIEW_DIST=4, that is up to 81 chunks. If each chunk has ~5 canopy-bearing trees,
that is ~400 canopy meshes. Each gets `Math.sin()` computed twice plus two
rotation property sets.

**Impact:** Low. `Math.sin()` is fast and property sets on already-rendered objects
are cheap. With 400 meshes, this is ~800 sin() calls and ~800 property sets per
frame, which is well under 1ms. However, many of these canopies are far from the
camera and may not even be visible.

**Proposed solution:**
Only animate canopies in chunks near the player (distance <= 2 chunks). Canopies
farther away are barely visible and their sway would be imperceptible.

```js
if (terrainState && terrainState.canopyMeshesByChunk) {
  const windTime = clock.elapsedTime;
  const pcx = Math.floor(st.playerX / CHUNK_SIZE);
  const pcz = Math.floor(st.playerZ / CHUNK_SIZE);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const key = `${pcx + dx},${pcz + dz}`;
      const meshes = terrainState.canopyMeshesByChunk.get(key);
      if (!meshes) continue;
      for (let ci = 0; ci < meshes.length; ci++) {
        const m = meshes[ci];
        m.rotation.z = Math.sin(windTime * 0.5 + m.userData.windSeed) * 0.02;
        m.rotation.x = Math.sin(windTime * 0.4 + m.userData.windSeed + 1.5) * 0.015;
      }
    }
  }
}
```

This reduces the iteration from ~400 meshes to ~125 (25 chunks * 5 canopies).

**Effort:** Small (20 minutes).

---

## 12. Bomb trail creates uncached SphereGeometry per bomb

**Priority:** NICE-TO-HAVE

**File:** `js/game3d.js` lines 5252-5256

**Problem:**
Each bomb drop creates `new THREE.SphereGeometry(0.3, 8, 8)` and
`new THREE.MeshLambertMaterial({ color: 0xff6622 })`. Bombs drop every 0.5s when the
bomb trail powerup is active. The material color is also mutated per-frame for a
flash effect (line 5268), which prevents simple sharing.

**Impact:** Low. Bombs drop infrequently (max 2/second) and the powerup is temporary.
But the geometry is identical every time and should be shared.

**Proposed solution:**
Cache the sphere geometry. Use a separate non-shared material per bomb (since the
flash effect mutates color), but cache the geometry.

```js
// Near top of game scope:
const bombGeo = new THREE.SphereGeometry(0.3, 8, 8);

// In bomb creation (line 5253):
const bomb = new THREE.Mesh(bombGeo, new THREE.MeshLambertMaterial({ color: 0xff6622 }));
```

Even simpler: since the bomb is temporary, dispose only the material on cleanup, not
the geometry.

**Effort:** Small (10 minutes).

---

## 13. Boss phase visuals create inline materials and geometries

**Priority:** NICE-TO-HAVE

**File:** `js/game3d.js` lines 5590-5684

**Problem:**
Boss phase transition visuals create materials and geometries inline:
- Line 5592: `new THREE.MeshBasicMaterial({ color: 0x111111 })` for crack lines
- Line 5601: `new THREE.BoxGeometry(crackW, crackH, crackD)` per crack
- Line 5681: `new THREE.MeshLambertMaterial({ color: oldColor })` for desperation pulse
- Line 5699: `new THREE.MeshLambertMaterial({ color: headColor })` for head pulse

These are guarded by `!e._phase2Visuals` etc., so they only fire once per boss per
phase transition. However, cracks use random dimensions so geometries are unique.

**Impact:** Very low. Boss fights are infrequent and each creates only 3-4 objects per
phase. Total over a boss fight: ~12-16 allocations. Not worth optimizing for
performance alone, but worth noting for code consistency.

**Proposed solution:**
Use `getCachedGeo` for crack lines (round random dimensions). Cache the crack material
at a higher scope. For the desperation pulse material swap, cache a single
MeshLambertMaterial per color.

**Effort:** Small (15 minutes), but low priority.

---

## 14. Angel wings create uncached geometry and materials

**Priority:** NICE-TO-HAVE

**File:** `js/3d/player-model.js` lines 308-336

**Problem:**
The angel wings visual creates 6 meshes with individual `new THREE.BoxGeometry` and
`new THREE.MeshLambertMaterial` calls. These are created once at model build time and
persist for the entire game session (the wing group is toggled via `.visible`).

**Impact:** Negligible. This happens once per game session. The 6 geometries and 4
materials (two colors, `0xaaddff` and `0xcceeff`) are never recreated.

**Proposed solution:**
Switch to `getCachedGeo()` and `getCachedMat()` for consistency and to share with
any other code using the same dimensions/colors. Note: the wing materials use
`transparent: true, opacity: 0.85/0.7`, which `getCachedMat()` does not currently
support. Either extend the cache or leave as-is.

**Effort:** Small (15 minutes), but negligible impact.

---

## 15. Chunk key string parsing in hot loops

**Priority:** NICE-TO-HAVE

**File:** `js/3d/terrain.js` lines 820-821

**Problem:**
`updateChunks()` iterates `ts.loadedChunks` (a Set of string keys like `"4,7"`) and
parses each with `key.split(',').map(Number)` (line 821) to compare chunk distances.
With 81 loaded chunks, this creates 81 temporary arrays of 2 strings, then maps them
to numbers.

**Impact:** Very low. `updateChunks()` is called once per frame, and 81 string splits
is trivial. The temporary arrays are tiny.

**Proposed solution:**
Store chunk coords as a `Map<string, [number, number]>` alongside the Set, so parsing
is done once at load time. Or switch to numeric keys (see fog-of-war solution in item
#6).

**Effort:** Small (20 minutes), but very low priority.

---

## Existing Good Patterns (no action needed)

These patterns are already well-optimized and should be preserved:

1. **Swap-and-pop for enemy cleanup** (`js/game3d.js` lines 7724-7736): O(1) per
   removal instead of O(n) splice.

2. **Object pooling for fire particles and XP gems** (`js/game3d.js` lines 1725-1743):
   The `createPool()` utility with acquire/release pattern is well-implemented.

3. **Geometry/material caching in utils.js** (`js/3d/utils.js` lines 17-51):
   `getCachedGeo()` and `getCachedMat()` with dimension rounding to prevent key
   fragmentation.

4. **Chunk-indexed colliders** (`js/3d/terrain.js` lines 151-165): Spatial index for
   terrain colliders limits checks to 9 nearby chunks.

5. **Chunk-indexed decorations** (`js/3d/terrain.js` lines 771-792):
   `decorationsByChunk` enables O(1) lookup on unload (aside from the flat array
   filter issue noted above).

6. **Throttled merge checks** (`js/game3d.js` lines 6926-6928): XP gem merge runs
   every 0.25s, zombie merge every 0.5s, not every frame.

7. **MAX_FIRE_PARTICLES cap** (`js/game3d.js` line 1748): Prevents unbounded particle
   growth.

8. **Distance-squared comparisons** (`js/game3d.js` line 2657): `findNearestEnemy`
   uses `dx*dx + dz*dz` instead of `Math.sqrt()`.

---

## Summary by Priority

| # | Issue | Priority | Effort | Estimated FPS Impact |
|---|-------|----------|--------|----------------------|
| 1 | playerGroup.traverse() x3 per frame | MUST-DO | Small | 1-3ms/frame saved |
| 2 | Death sequence enemy traversals | MUST-DO | Small | 5-15ms/frame during death |
| 3 | Uncached enemy materials | MUST-DO | Medium | Memory growth ~50MB/hour |
| 4 | Platform collision linear scan | SHOULD-DO | Small | 0.5-1ms/frame saved |
| 5 | getNearbyColliders array allocation | SHOULD-DO | Small | GC pressure reduction |
| 6 | Fog-of-war string creation | SHOULD-DO | Small | GC pressure + memory leak |
| 7 | createAttackLine allocations | SHOULD-DO | Small | GPU alloc reduction |
| 8 | splice on projectile/gem arrays | SHOULD-DO | Small | 0.1-0.5ms/frame saved |
| 9 | Decoration array filter on unload | SHOULD-DO | Small | GC pressure on movement |
| 10 | Item/wearable visual dispose+recreate | SHOULD-DO | Medium | Frame hitch on pickup |
| 11 | Canopy wind full iteration | NICE-TO-HAVE | Small | 0.2ms/frame saved |
| 12 | Bomb trail uncached geometry | NICE-TO-HAVE | Small | Negligible |
| 13 | Boss phase inline materials | NICE-TO-HAVE | Small | Negligible |
| 14 | Angel wing uncached geometry | NICE-TO-HAVE | Small | Negligible |
| 15 | Chunk key string parsing | NICE-TO-HAVE | Small | Negligible |

**Recommended implementation order:**
1. Items 1-2 (MUST-DO, small effort, biggest frame-time savings)
2. Item 3 (MUST-DO, medium effort, biggest memory savings)
3. Item 10 (SHOULD-DO, fix the wearable cache corruption bug immediately)
4. Items 5-6 (SHOULD-DO, small effort, GC pressure reduction)
5. Items 4, 7-9 (SHOULD-DO, small effort, incremental improvements)
6. Items 11-15 (NICE-TO-HAVE, tackle opportunistically)
