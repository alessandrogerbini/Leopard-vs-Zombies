# BD-254 & BD-255: Zombie Terrain Pass-Through Fixes & Pathfinding Improvement

**Date:** 2026-02-27
**Source:** Post-BD-252 analysis — BD-252 implemented the atomic move-then-resolve pattern for zombie-decoration collision (trees r=1.2, rocks r=1.0). However, zombies still pass through several obstacle types that lack colliders entirely, and the current radial-pushback steering creates a "slide along surface" behavior rather than intelligent routing around obstacles.

---

## BD-254: Fix remaining zombie terrain pass-through — missing colliders for plateaus, stumps, fallen logs, shrines, totems, and challenge shrines

**Category:** Bug (enemy collision / terrain)
**Priority:** P1
**File(s):** `js/game3d.js` (~lines 6857-6883, 4951-4977, 1205-1284), `js/3d/terrain.js` (~lines 683-723)

---

### Symptom

After BD-252, zombies correctly collide with **trees** (r=1.2) and **rocks** (r=1.0) — the two decoration types that have entries in `terrainState.collidersByChunk`. However, zombies still walk directly through:

1. **Plateaus/platforms** — the largest solid obstacles in the game (1.5-7 units wide, 1-4 units tall)
2. **Fallen logs** — 1.5-3.0 units long, solid wood
3. **Tree stumps** — 0.35-0.6 units wide, solid wood
4. **Shrines** — 0.8 unit base, stone pillar (pre-placed, finite, `st.shrines[]`)
5. **Difficulty totems** — 0.8 unit base, stone pillar (pre-placed, `st.totems[]`)
6. **Charge shrines** — 2.0 unit base, tall pillar (pre-placed, `st.chargeShrines[]`)
7. **Challenge shrines** — 2.0 unit base, 4-unit tall pillar (pre-placed, `st.challengeShrines[]`)

These are all solid physical objects that the player either collides with or interacts with, but zombies phase straight through them.

---

### Root Cause Analysis

#### Problem 1: Decoration types with NO colliders registered

In `js/3d/terrain.js`, the `generateChunk()` function (lines 580-748) creates 7 decoration types but only registers colliders for 2 of them:

| Decoration | Lines | Collider Registered? | Collision Radius |
|---|---|---|---|
| Trees | 646-665 | **YES** (line 659) | r=1.2 |
| Rocks | 667-681 | **YES** (line 680) | r=1.0 |
| Fallen logs | 683-695 | **NO** | — |
| Mushroom clusters | 697-709 | **NO** | — |
| Stumps | 711-723 | **NO** | — |
| Grass patches | 725-735 | No (correct — walk-through) | — |
| Flower patches | 737-747 | No (correct — walk-through) | — |

Fallen logs and stumps are described as solid objects visually (logs are 1.5-3.0 units long, stumps are 0.3-0.7 units tall with visible root bulges). Mushroom clusters are small and debatable, but fallen logs and stumps should definitely block movement.

**Specific missing code (terrain.js line 694):**
```js
// Fallen logs: 0-1 per chunk — lines 683-695
// After line 694 (ts.decorationsByChunk.get(key).push(logDec);)
// NO collidersByChunk.push() call exists
```

```js
// Stumps: 0-2 per chunk — lines 711-723
// After line 722 (ts.decorationsByChunk.get(key).push(stumpDec);)
// NO collidersByChunk.push() call exists
```

#### Problem 2: Plateaus have NO zombie horizontal collision

This is the **biggest gap**. Plateaus are the largest solid obstacles in the game (1.5-7 units wide, 1-4 units tall). The player has explicit AABB horizontal collision with plateaus (lines 4951-4977, `BD-85`):

```js
// === PLATEAU HORIZONTAL COLLISION (BD-85) === (game3d.js line 4951)
if (!st.flying) {
  for (const p of platforms) {
    const platTop = p.y + 0.2;
    if (st.playerY < platTop - 0.3) {
      const halfW = p.w / 2 + 0.5; // 0.5 = player radius buffer
      const halfD = p.d / 2 + 0.5;
      const dx = st.playerX - p.x;
      const dz = st.playerZ - p.z;
      if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
        const overlapX = halfW - Math.abs(dx);
        const overlapZ = halfD - Math.abs(dz);
        if (overlapX < overlapZ) {
          st.playerX += (dx > 0 ? overlapX : -overlapX);
        } else {
          st.playerZ += (dz > 0 ? overlapZ : -overlapZ);
        }
      }
    }
  }
}
```

**Zombies have ZERO equivalent code.** The BD-252 fix (lines 6867-6883) only checks `getNearbyColliders()` which returns **circle colliders from `terrainState.collidersByChunk`** — a system that only contains trees and rocks. Plateaus are stored in the separate `platforms[]` array (defined at line 1064) and indexed by `platformsByChunk` (line 1065). The two collision systems are completely disjoint:

- `terrainState.collidersByChunk` (terrain.js) → trees, rocks → circle colliders → checked by zombies via BD-252
- `platforms[]` / `platformsByChunk` (game3d.js) → plateaus → AABB colliders → checked by player only (BD-85, lines 4951-4977)

Zombies never check `platforms[]` for horizontal collision. They only check platforms for **vertical landing** when jumping (lines 6912-6923), not for walking through them from the side.

#### Problem 3: Pre-placed world objects with NO collision

Shrines, totems, charge shrines, and challenge shrines are created at game start and placed in the world as `THREE.Group` objects with physical bases:

| Object | Base Size | Visual Presence | Zombie Collision? |
|---|---|---|---|
| Shrine (`createShrineMesh`, line 1393) | 0.8x0.8 base, 0.4x1.2 pillar | Solid stone | **NO** |
| Totem (`createTotemMesh`, line 1551) | 0.8x0.8 base, 0.5x1.4 pillar | Solid dark stone | **NO** |
| Charge Shrine (`createChargeShrineMesh`, line 1604) | 2.0x2.0 base, 0.5x3.5 pillar | Large solid stone | **NO** |
| Challenge Shrine (line 1740) | 2.0x4.0 pillar, 1.5x1.5 skull | Massive dark red | **NO** |

None of these are registered in `terrainState.collidersByChunk` or `platforms[]`. They exist purely as visual/interactive objects. Zombies walk straight through them.

---

### Fix Approach

#### Fix 2A: Add colliders for fallen logs and stumps in terrain.js

In `generateChunk()`, add `collidersByChunk` entries for fallen logs and stumps, matching the pattern used for trees and rocks.

**Fallen logs (after line 694 in terrain.js):**
```js
// Fallen logs: 0-1 per chunk
const numLogs = noise2D(cx * 7 + 31, cz * 7 + 37) > 0.5 ? 1 : 0;
for (let d = 0; d < numLogs; d++) {
  const dx = ox + noise2D(cx + d * 31 + 9, cz + d * 37 + 13) * CHUNK_SIZE;
  const dz = oz + noise2D(cx + d * 37 + 17, cz + d * 41 + 19) * CHUNK_SIZE;
  if (!isDecoPositionClear(dx, dz)) continue;
  occupiedPositions.push({ x: dx, z: dz });
  const h = terrainHeight(dx, dz);
  const meshes = createFallenLog(dx, dz, h, scene);
  const logDec = { meshes, x: dx, z: dz };
  ts.decorations.push(logDec);
  ts.decorationsByChunk.get(key).push(logDec);
  // BD-254: Add collision for fallen logs
  if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
  ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.8 });
}
```

The log is 1.5-3.0 units long but only ~0.4 units in diameter. A circle collider of r=0.8 approximates the center bulk. This is imperfect for the elongated shape but consistent with the circle-only collider system.

**Stumps (after line 722 in terrain.js):**
```js
// Stumps: 0-2 per chunk
const numStumps = Math.floor(noise2D(cx * 13 + 53, cz * 13 + 59) * 3);
for (let d = 0; d < numStumps; d++) {
  // ... existing placement code ...
  ts.decorationsByChunk.get(key).push(stumpDec);
  // BD-254: Add collision for stumps
  if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
  ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.5 });
}
```

Stumps are 0.35-0.6 units wide with an optional root bulge up to 1.3x wider. r=0.5 is a reasonable average.

**Mushroom clusters — intentionally NO collider.** Mushrooms are tiny (0.06 stem width, 0.15-0.27 cap) and feel like foliage zombies would trample. No collision.

#### Fix 2B: Add AABB plateau collision for zombies in game3d.js

Add horizontal AABB collision resolution for zombies against `platforms[]`, mirroring the player's BD-85 code (lines 4951-4977). This should be applied to the intended `(newX, newZ)` position as part of the atomic move-then-resolve pattern.

**Insert after the terrain collider loop (after line 6883) but before the position commit (line 6886):**

```js
          // BD-254: Plateau AABB horizontal collision for zombies
          // Mirrors player's BD-85 plateau collision (lines 4951-4977).
          // Only blocks zombies that are below the plateau top surface.
          const zombieY = e.group.position.y;
          for (let pi = 0; pi < platforms.length; pi++) {
            const p = platforms[pi];
            const platTop = p.y + 0.2;
            // Only collide horizontally if zombie is below the platform surface
            if (zombieY < platTop - 0.3) {
              const halfW = p.w / 2 + ER; // ER (0.5) as zombie radius buffer
              const halfD = p.d / 2 + ER;
              const pdx = newX - p.x;
              const pdz = newZ - p.z;
              if (Math.abs(pdx) < halfW && Math.abs(pdz) < halfD) {
                // Push out along shortest overlap axis
                const overlapX = halfW - Math.abs(pdx);
                const overlapZ = halfD - Math.abs(pdz);
                if (overlapX < overlapZ) {
                  newX += (pdx > 0 ? overlapX : -overlapX);
                } else {
                  newZ += (pdz > 0 ? overlapZ : -overlapZ);
                }
              }
            }
          }
```

**IMPORTANT:** This same AABB block must also be added to the **flee behavior** path (after line 6847, inside the `if (e.fleeTimer > 0)` branch) to prevent fleeing zombies from phasing through plateaus.

**Performance note on iterating `platforms[]`:** The `platforms[]` array contains all loaded plateaus (0-2 per chunk, ~81 chunks loaded = up to ~162 platforms). Iterating 162 platforms per zombie per frame for 200 zombies = ~32,400 AABB checks per frame. Each check is 4 comparisons + 2 subtractions — trivially cheap. No spatial indexing needed.

However, if performance is a concern, a simple distance pre-filter can skip distant platforms:
```js
const pdx = newX - p.x;
const pdz = newZ - p.z;
// Quick distance reject: skip if clearly outside max possible overlap
if (Math.abs(pdx) > 5 || Math.abs(pdz) > 5) continue;
```
This cuts the inner loop to ~5-10 actual AABB tests per zombie (only nearby platforms).

#### Fix 2C: Add colliders for pre-placed world objects (shrines, totems, charge shrines, challenge shrines)

These objects are created at game start and stored in `st.shrines[]`, `st.totems[]`, `st.chargeShrines[]`, `st.challengeShrines[]`. They are NOT part of the chunk-based terrain collider system. Two approaches:

**Option 1 (Recommended): Register them as circle colliders at creation time**

After pre-placing each object, add a collider entry to the appropriate chunk in `terrainState.collidersByChunk`. This integrates them into the existing `getNearbyColliders()` system that zombies already check.

```js
// Helper: register a world object as a terrain collider
function registerWorldObjectCollider(x, z, radius) {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const key = getChunkKey(cx, cz);
  if (!terrainState.collidersByChunk.has(key)) terrainState.collidersByChunk.set(key, []);
  terrainState.collidersByChunk.get(key).push({ x, z, radius });
}

// After shrine creation (line 1708):
registerWorldObjectCollider(pos.x, pos.z, 0.6); // Shrine: 0.8 base -> r=0.6

// After totem creation (line 1718):
registerWorldObjectCollider(pos.x, pos.z, 0.6); // Totem: 0.8 base -> r=0.6

// After charge shrine creation (line 1728):
registerWorldObjectCollider(pos.x, pos.z, 1.2); // Charge shrine: 2.0 base -> r=1.2

// After challenge shrine creation (line 1769):
registerWorldObjectCollider(pos.x, pos.z, 1.5); // Challenge shrine: 2.0 pillar -> r=1.5
```

**Edge case — chunk not yet loaded:** Pre-placed objects are created at game start, but `terrainState.collidersByChunk` is populated as chunks load. If the shrine's chunk hasn't been loaded yet, `collidersByChunk` won't have a key for it. Fix: always ensure the key exists by using `has()` + `set()` (the helper above handles this). The colliders will persist even if the terrain chunk is later loaded (terrain chunk generation checks `if (ts.collidersByChunk.has(key))` to avoid overwriting — wait, actually it does `if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, [])` followed by `.push()`, so it initializes if absent and appends if present. Our pre-registered entries will survive).

**Edge case — chunk unload deletes colliders:** `unloadChunk()` in terrain.js (line 791) calls `ts.collidersByChunk.delete(key)`. If a shrine's chunk is unloaded and reloaded, the shrine's collider is lost but the terrain decorations get re-registered. Fix: pre-placed object colliders should be re-registered after chunk reload, OR the pre-placed objects should have their own separate collider check outside the chunk system.

**Better approach — dedicated pre-placed object collision loop:** Since pre-placed objects are few (20 shrines + 24 totems + ~12 charge shrines + ~8 challenge shrines = ~64 objects), add a dedicated collision loop for zombies against `st.shrines` + `st.totems` + `st.chargeShrines` + `st.challengeShrines`. This avoids chunk lifecycle issues entirely.

```js
          // BD-254: Pre-placed world object collision for zombies
          // Check shrines, totems, charge shrines, challenge shrines.
          // ~64 objects total — trivial iteration cost per zombie.
          const worldObjects = [
            ...st.shrines.filter(s => s.alive),
            ...st.totems.filter(t => t.alive),
            ...st.chargeShrines.filter(cs => !cs.charged),
            ...st.challengeShrines.filter(cs => !cs.bossDefeated),
          ];
          for (let wi = 0; wi < worldObjects.length; wi++) {
            const wo = worldObjects[wi];
            const woRadius = wo.rarity !== undefined ? 1.2 : // charge shrine (2.0 base)
                             wo.activated !== undefined ? 1.5 : // challenge shrine (2.0 pillar)
                             0.6; // shrine or totem (0.8 base)
            const wdx = newX - wo.x;
            const wdz = newZ - wo.z;
            const wDist = Math.sqrt(wdx * wdx + wdz * wdz);
            const wMinDist = ER + woRadius;
            if (wDist < wMinDist && wDist > 0.001) {
              const wPush = wMinDist - wDist;
              newX += (wdx / wDist) * wPush;
              newZ += (wdz / wDist) * wPush;
            }
          }
```

**Performance concern:** Allocating a filtered+spread array per zombie per frame is wasteful. Better: build the array once per frame outside the zombie loop, or iterate the 4 arrays directly:

```js
// BD-254: Build pre-placed object collider list once per frame (outside zombie loop)
const worldObjectColliders = [];
for (let i = 0; i < st.shrines.length; i++) {
  const s = st.shrines[i];
  if (s.alive) worldObjectColliders.push({ x: s.x, z: s.z, radius: 0.6 });
}
for (let i = 0; i < st.totems.length; i++) {
  const t = st.totems[i];
  if (t.alive) worldObjectColliders.push({ x: t.x, z: t.z, radius: 0.6 });
}
for (let i = 0; i < st.chargeShrines.length; i++) {
  const cs = st.chargeShrines[i];
  if (!cs.charged) worldObjectColliders.push({ x: cs.x, z: cs.z, radius: 1.2 });
}
for (let i = 0; i < st.challengeShrines.length; i++) {
  const cs = st.challengeShrines[i];
  if (!cs.bossDefeated) worldObjectColliders.push({ x: cs.x, z: cs.z, radius: 1.5 });
}
```

Then inside the zombie loop, iterate `worldObjectColliders` with the same radial pushback as terrain colliders.

---

### Performance Analysis

| Change | Per-zombie cost | Total (200 zombies) | Notes |
|---|---|---|---|
| Stump/log colliders | +0-3 extra circle checks in getNearbyColliders | +0-600 circle checks/frame | Already within 9-chunk query; no new queries |
| Plateau AABB | ~162 AABB checks per zombie | ~32,400 AABB checks/frame | 4 comparisons each, with distance pre-filter: ~2,000 actual |
| World object circle | ~64 circle checks per zombie | ~12,800 circle checks/frame | Built once outside loop, simple radial math |

**Total additional cost: ~15,000 cheap arithmetic operations per frame.** At 60fps this is ~900,000 ops/second — trivial for modern JS engines. No performance concern.

---

### Acceptance Criteria

- [ ] Zombies cannot walk through fallen logs (visible slide/funnel around them)
- [ ] Zombies cannot walk through tree stumps (visible deflection)
- [ ] Zombies cannot walk through plateaus from the side (AABB blocking, matching player behavior)
- [ ] Zombies on top of a plateau (via jumping) are NOT horizontally blocked by it
- [ ] Zombies cannot walk through shrines, totems, charge shrines, or challenge shrines
- [ ] Fleeing zombies (boss spawn flee) also respect all new colliders
- [ ] No performance regression at 200+ zombies
- [ ] Zombies do not get permanently stuck (they slide along obstacle surfaces)
- [ ] Pre-placed objects that are destroyed (shrine.alive=false, totem destroyed) stop blocking zombies
- [ ] Boss zombies also respect all new colliders

---

### Conflict Analysis

No conflicts with existing beads. Changes are additive:
- terrain.js: 2 new `collidersByChunk.push()` calls in existing decoration blocks
- game3d.js: new collision block inserted between terrain collider loop and position commit
- No modification of existing collision code

---

### Estimated Complexity

**M (Medium)** — Multiple insertion points across two files. The plateau AABB code must be carefully placed in both the normal-pursuit and flee branches of zombie movement. Pre-placed object collision requires building the collider list once per frame. Testing needs to cover all obstacle types.

---

---

## BD-255: Improve zombie pathfinding — steering-based obstacle avoidance instead of radial slide

**Category:** Enhancement (enemy AI / game feel)
**Priority:** P2
**File(s):** `js/game3d.js` (~lines 6852-6889), `js/3d/terrain.js` (getNearbyColliders)

---

### Symptom

After BD-252 (and with BD-254 fixing the remaining pass-through gaps), zombies correctly collide with terrain obstacles. However, their behavior when encountering obstacles is poor: they walk directly into the obstacle, get pushed radially outward, then immediately aim straight at the player again. The result is a "slide along surface" behavior where the zombie pushes against the obstacle face and slowly sliiides past it.

This looks robotic and broken. Zombies should appear to **route around** obstacles — recognizing that an obstacle is ahead and choosing to go left or right to avoid it, not pushing headfirst into it like a roomba.

---

### Current System Analysis

The current movement system (post BD-252) works as follows:

1. **Calculate direction to player:** `(nx, nz) = normalize(playerPos - zombiePos)` (line 6853-6854)
2. **Apply velocity:** `newX = pos.x + nx * speed * dt; newZ = pos.z + nz * speed * dt` (line 6860-6861)
3. **Radial pushback:** For each nearby collider, if overlapping, push zombie outward along the zombie-to-collider-center vector (lines 6870-6882)
4. **Commit:** Set position to resolved (newX, newZ) (lines 6886-6887)

The problem is in step 1: the zombie always aims straight at the player with no look-ahead. Even though step 3 prevents overlap, the zombie's heading is always "directly at player" regardless of obstacles. This creates the characteristic "push into wall and slide" behavior.

**Concrete example:** Zombie is 10 units from player. A tree (r=1.2) is directly between them at distance 5. Each frame, the zombie aims at the player (through the tree), moves toward the tree, gets pushed radially out, and slides a tiny bit laterally. After many frames, the zombie has slowly slid around the tree while spending most of its movement budget pushing into it. The visual result is a zombie plastered against the tree surface, slowly creeping sideways.

---

### Design Constraints

Any pathfinding solution must satisfy:

1. **200+ zombies at 60fps** — per-zombie per-frame cost must be minimal
2. **No A\* or grid-based pathfinding** — too expensive for 200+ agents on infinite terrain
3. **Simple implementation** — the codebase uses no pathfinding library and all AI is inline
4. **Preserve merge behavior** — zombies must still cluster and collide for the merge system
5. **Degrade gracefully** — if performance is an issue, the system should fall back to direct pursuit

---

### Proposed Solution: Look-Ahead Tangent Steering

A lightweight steering behavior that adds a **forward obstacle probe** and **tangent direction selection**. Instead of always aiming at the player, the zombie looks ahead along its intended path and steers around obstacles it would hit.

#### Algorithm Overview

For each zombie, each frame:

1. **Calculate base direction** `(nx, nz)` toward player (same as current).
2. **Probe ahead:** Check if the line from zombie position along `(nx, nz)` for a distance of `PROBE_DIST` (2.0-3.0 units) intersects any collider or platform AABB.
3. **If clear:** Move normally (direct pursuit). No overhead beyond the probe check.
4. **If blocked:** Calculate two tangent directions (left-of-obstacle, right-of-obstacle) and choose the one that is closer to the player direction. Use that tangent as the movement direction instead.
5. **Smooth steering:** Blend the tangent direction with the zombie's current heading over a few frames to avoid jerky turns. Store a `steerAngle` on the zombie and lerp toward the target angle.

#### Detailed Implementation

```js
// === BD-255: Constants ===
const STEER_PROBE_DIST = 2.5;   // How far ahead to check for obstacles (units)
const STEER_PROBE_RADIUS = 0.6; // Probe thickness (zombie radius + buffer)
const STEER_LERP_RATE = 5.0;    // Radians/second steering speed
const STEER_MIN_DIST = 0.3;     // Don't steer if obstacle center is behind us

// === BD-255: Per-zombie state (lazy-init alongside jumpVY) ===
if (e.steerAngle === undefined) e.steerAngle = Math.atan2(nx, nz);

// Step 1: Base direction to player
const targetAngle = Math.atan2(nx, nz);

// Step 2: Probe for obstacles ahead
let blocked = false;
let blockObstacleX = 0, blockObstacleZ = 0, blockObstacleR = 0;
let bestBlockDist = STEER_PROBE_DIST + 10;

// Check circle colliders (trees, rocks, stumps, logs, world objects)
if (terrainState) {
  const nearby = getNearbyColliders(e.group.position.x, e.group.position.z, terrainState);
  for (let ci = 0; ci < nearby.length; ci++) {
    const c = nearby[ci];
    // Project obstacle center onto the movement ray
    const toObsX = c.x - e.group.position.x;
    const toObsZ = c.z - e.group.position.z;
    // Dot product with movement direction = distance along ray
    const dot = toObsX * nx + toObsZ * nz;
    if (dot < STEER_MIN_DIST || dot > STEER_PROBE_DIST) continue;
    // Perpendicular distance from ray to obstacle center
    const perpX = toObsX - dot * nx;
    const perpZ = toObsZ - dot * nz;
    const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
    const clearance = STEER_PROBE_RADIUS + c.radius;
    if (perpDist < clearance && dot < bestBlockDist) {
      blocked = true;
      bestBlockDist = dot;
      blockObstacleX = c.x;
      blockObstacleZ = c.z;
      blockObstacleR = c.radius;
    }
  }
}

// Check platform AABBs (only when zombie is below platform top)
const zombieY = e.group.position.y;
for (let pi = 0; pi < platforms.length; pi++) {
  const p = platforms[pi];
  if (zombieY >= p.y - 0.1) continue; // On top or above — skip
  // Approximate AABB as circle for probe (center=p.x,p.z, radius=max(w,d)/2)
  const approxR = Math.max(p.w, p.d) / 2;
  const toObsX = p.x - e.group.position.x;
  const toObsZ = p.z - e.group.position.z;
  const dot = toObsX * nx + toObsZ * nz;
  if (dot < STEER_MIN_DIST || dot > STEER_PROBE_DIST + approxR) continue;
  const perpX = toObsX - dot * nx;
  const perpZ = toObsZ - dot * nz;
  const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
  const clearance = STEER_PROBE_RADIUS + approxR;
  if (perpDist < clearance && dot < bestBlockDist) {
    blocked = true;
    bestBlockDist = dot;
    blockObstacleX = p.x;
    blockObstacleZ = p.z;
    blockObstacleR = approxR;
  }
}

// Step 3-4: Calculate steering direction
let steerTargetAngle = targetAngle;

if (blocked) {
  // Calculate tangent directions around the blocking obstacle
  const toObsX = blockObstacleX - e.group.position.x;
  const toObsZ = blockObstacleZ - e.group.position.z;
  const toObsDist = Math.sqrt(toObsX * toObsX + toObsZ * toObsZ) || 1;
  const toObsNx = toObsX / toObsDist;
  const toObsNz = toObsZ / toObsDist;

  // Two perpendicular tangent directions (left and right of obstacle)
  const tangentLx = -toObsNz; // rotate 90 degrees left
  const tangentLz =  toObsNx;
  const tangentRx =  toObsNz; // rotate 90 degrees right
  const tangentRz = -toObsNx;

  // Choose the tangent that aligns better with the player direction
  const dotL = tangentLx * nx + tangentLz * nz;
  const dotR = tangentRx * nx + tangentRz * nz;

  if (dotL > dotR) {
    steerTargetAngle = Math.atan2(tangentLx, tangentLz);
  } else {
    steerTargetAngle = Math.atan2(tangentRx, tangentRz);
  }
}

// Step 5: Smooth steering (lerp toward target angle)
let angleDiff = steerTargetAngle - e.steerAngle;
// Normalize to [-PI, PI]
while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
const maxTurn = STEER_LERP_RATE * gameDt;
if (Math.abs(angleDiff) > maxTurn) {
  e.steerAngle += (angleDiff > 0 ? maxTurn : -maxTurn);
} else {
  e.steerAngle = steerTargetAngle;
}

// Use steered direction for movement
const steerNx = Math.sin(e.steerAngle);
const steerNz = Math.cos(e.steerAngle);

// BD-252 atomic move-then-resolve (now with steered direction)
let newX = e.group.position.x + steerNx * eSpd * gameDt;
let newZ = e.group.position.z + steerNz * eSpd * gameDt;

// ... rest of collision resolution unchanged ...

// Update facing to match steering
e.group.rotation.y = e.steerAngle;
```

#### Why NOT a Flow Field?

Flow fields (precomputed per-chunk direction vectors toward the player) are a common approach for large-scale pathfinding. However, they are **wrong for this game** for several reasons:

1. **Player moves constantly:** The flow field must be recomputed whenever the player moves significantly. With chunk-based terrain and a mobile player, this means rebuilding the field every few seconds — expensive.

2. **Zombies should cluster, not spread:** A flow field distributes agents optimally across all available paths. This REDUCES zombie clustering, which is the opposite of what we want — the merge system relies on zombies funneling into tight groups.

3. **Memory cost:** A flow field needs a direction vector per grid cell. At 1-unit resolution across a 160x160 play area = 25,600 vectors = 200KB. Not huge, but unnecessary.

4. **Implementation complexity:** Flow fields require BFS/Dijkstra from the player position, obstacle marking, and field propagation. This is ~200 lines of code and a new per-frame recomputation system. The tangent steering approach above is ~40 lines inline.

5. **Visual result is similar:** Tangent steering produces zombies that veer around obstacles and resume their heading — visually indistinguishable from flow-field navigation for the player experience.

#### Why NOT Simple Ray-Cast Steering?

Casting multiple rays (e.g., 3-5 rays in a forward cone) and weighting steering away from the closest hit is another common approach. Problems:

1. **Multiple ray casts per zombie per frame** — 3-5x the probe cost for marginal improvement.
2. **Oscillation risk** — with multiple rays, the zombie can oscillate between "steer left" and "steer right" on alternating frames if the obstacle is directly ahead. The single-probe tangent approach avoids this by always choosing the tangent that best aligns with the player direction.
3. **More complex tuning** — ray angles, weights, and blending parameters multiply the tuning surface.

The single forward probe + tangent selection is simpler, cheaper, and produces equally good results for this game's obstacle density.

---

### Performance Analysis

**Per-zombie per-frame cost of steering probe:**

| Operation | Cost | Count per zombie |
|---|---|---|
| getNearbyColliders query | Already called by BD-252 | 1 (reuse result) |
| Circle collider probe | 2 multiplies + 1 sqrt per collider | ~5-15 colliders |
| Platform AABB probe | 2 multiplies + 1 sqrt per platform | ~5-10 nearby |
| Tangent calculation | ~10 arithmetic ops | 1 (only if blocked) |
| Angle lerp | ~5 arithmetic ops | 1 |

**Total: ~80-120 extra arithmetic operations per zombie per frame.**
**At 200 zombies: ~16,000-24,000 extra operations per frame.**
**At 60fps: ~1.2M-1.4M extra operations per second.**

This is well within budget. Modern JavaScript engines execute ~500M simple arithmetic operations per second.

**Optimization: skip steering for distant zombies.** Zombies more than 30 units from the player don't need steering — the player can't see them and they're unlikely to be near obstacles the player cares about.

```js
if (dist > 30) {
  // Far zombie: direct pursuit, skip steering
  e.steerAngle = targetAngle;
}
```

This cuts the steering population to ~50-100 zombies near the player at any time.

---

### Integration with BD-254

BD-255 builds on top of BD-254. The collision resolution (radial pushback for circle colliders, AABB pushback for plateaus) from BD-254 remains as a safety net. The steering system (BD-255) prevents most obstacle contacts from happening in the first place, so the pushback code fires less frequently. The two systems are complementary:

- **BD-254 (collision):** "You can't walk through this" — hard boundary enforcement
- **BD-255 (steering):** "You should walk around this" — soft behavior improvement

If BD-255's probe misses an obstacle (e.g., obstacle spawned after the probe check), BD-254's pushback catches it. Defense in depth.

---

### Acceptance Criteria

- [ ] Zombies visibly steer around trees, rocks, and plateaus rather than sliding along surfaces
- [ ] Steering is smooth — no jerky oscillation or frame-by-frame heading changes
- [ ] Zombies still reach the player (steering doesn't create permanent avoidance loops)
- [ ] Zombies still cluster and merge — steering doesn't spread them across too many paths
- [ ] Performance: no measurable FPS drop with 200+ zombies and steering active
- [ ] Distant zombies (>30 units from player) use direct pursuit (no steering overhead)
- [ ] Fleeing zombies (boss spawn flee) also use steering to avoid obstacles
- [ ] Boss zombies use steering (with larger probe radius matching their scale)
- [ ] Steering degrades gracefully to direct pursuit when no obstacles are detected (zero overhead when path is clear)

---

### Edge Cases

1. **Obstacle directly on the line to player:** Both tangents are equally valid. The `dotL > dotR` comparison handles this correctly — one tangent will always be slightly favored due to floating point, producing a consistent (non-oscillating) choice.

2. **Multiple obstacles in a row:** The probe only detects the NEAREST blocking obstacle. After steering around the first obstacle, the next frame's probe detects the second. This produces a series of smooth course corrections, which looks natural.

3. **Dead-end terrain (surrounded by obstacles):** If a zombie is boxed in by decorations on all sides, steering will alternate tangent directions. The radial pushback (BD-254) prevents actual overlap, and the zombie will eventually find a gap. In extreme cases, the zombie may circle in place — this is acceptable for the ~0.1% of zombies that encounter true dead-ends (the decoration spacing system `MIN_DECO_SPACING = 2.5` prevents most tight clusters).

4. **Zombie behind a wide plateau:** With AABB approximated as a circle for the probe, wide plateaus (7 units) get a large probe radius. The zombie will steer early, choosing one side. After clearing the plateau edge, the probe clears and the zombie resumes direct pursuit. This looks natural.

5. **Zombie approaching obstacle at a shallow angle:** If the zombie's path barely clips an obstacle edge, the probe detects it but the tangent barely deviates from the original heading. The zombie takes a very slight course correction — natural and correct.

---

### Conflict Analysis

No conflicts with existing beads. BD-255 replaces the movement direction calculation (lines 6860-6861) with a steered version, but the collision resolution (BD-252/BD-254) is unchanged. The fix is purely additive to the movement system.

**Dependency:** BD-255 depends on BD-254 being implemented first, since the plateau AABB collision from BD-254 is needed as the safety net for the steering system.

---

### Estimated Complexity

**M-L (Medium-Large)** — The steering algorithm itself is ~40 lines, but it needs to be:
- Applied to both normal-pursuit and flee paths
- Tested with all obstacle types (circles and AABBs)
- Tuned for `STEER_PROBE_DIST`, `STEER_LERP_RATE`, and distance cutoff
- Verified not to break merge clustering behavior
- Tested with boss zombies (larger scale = larger probe radius)

Implementation is ~1-2 hours. Tuning and testing is ~1-2 hours additional.

---

### Implementation Order

1. **BD-254 first** — add missing colliders and plateau AABB for zombies
2. **BD-255 second** — add steering on top of the now-complete collision system
3. **Playtest** — verify steering looks good, merges still happen, no stuck zombies

---

### Testing Plan

**BD-254 Tests:**
1. Walk near fallen logs — observe zombies funnel around them, not through
2. Walk near stumps — observe zombies deflect off stumps
3. Walk near a plateau — observe zombies slide along the plateau face (not through it)
4. Stand on top of a plateau — observe zombies try to jump up (existing behavior) but cannot walk through from the side
5. Walk near shrines/totems — observe zombies deflect off them
6. Destroy a shrine — verify zombies no longer collide with it (alive=false)
7. Verify performance with 200+ zombies near dense terrain
8. Verify flee behavior (boss spawn) respects new colliders

**BD-255 Tests:**
1. Stand behind a tree — observe zombies visibly curve around the tree instead of sliding along it
2. Stand behind a wide plateau — observe zombies choose a side and route around it
3. Stand in an open area — observe zombies move in straight lines (no unnecessary steering)
4. Observe zombie merge frequency — should be similar to pre-steering (zombies still cluster)
5. Watch zombies approaching through a forest — they should weave between trees, not push through
6. Performance test: 200+ zombies with steering at 60fps
7. Edge case: zombie in a tight gap between two obstacles — should not oscillate or get stuck
8. Boss zombie steering: larger zombie should use appropriately larger probe radius

---
---

## Review Notes — BD-254: Fix remaining zombie terrain pass-through

**Reviewer:** Claude Opus 4.6 (senior game dev review)
**Date:** 2026-02-27

### Root Cause Verification: CONFIRMED

The root cause analysis is **accurate** and well-researched. Verified against the actual codebase:

1. **Missing decoration colliders (terrain.js):** Confirmed. Lines 683-695 (fallen logs) and 711-723 (stumps) in `terrain.js` push to `decorationsByChunk` but never push to `collidersByChunk`. Trees (line 659) and rocks (line 680) correctly register colliders. The bead's line numbers are exact.

2. **No zombie horizontal platform collision:** Confirmed. The player has explicit AABB horizontal collision with plateaus at lines 4951-4977 (`BD-85`). Zombies only interact with `platforms[]` for vertical landing during jumps (line 6912-6923). The BD-252 zombie collision (lines 6867-6883) only calls `getNearbyColliders()` which queries `terrainState.collidersByChunk` -- a system that contains **only trees and rocks**. Platforms live in the completely separate `platforms[]` / `platformsByChunk` system (lines 1064-1065). The two systems are indeed disjoint.

3. **No pre-placed object collision:** Confirmed. `createShrineMesh` (line 1393) returns `{ group, orb, rune, x, z, hp: 3, alive: true }`, `createTotemMesh` (line 1551) returns `{ group, x, z, y, orb, hp: 5, alive: true }`, `createChargeShrineMesh` (line 1604) returns `{ group, crystal, rune, groundRing, x, z, rarity, alive: true, charged: false }`, and challenge shrines (line 1769) are pushed with `{ x, z, group, activated, bossDefeated, rewardClaimed }`. None of these register colliders anywhere. Confirmed no entries in `collidersByChunk` or `platforms[]`.

### Recommended Solution Approach

The bead proposes three sub-fixes (2A, 2B, 2C). All three are sound. Specific recommendations:

**Fix 2A (log/stump colliders in terrain.js):** Correct and straightforward. The proposed radii (r=0.8 for logs, r=0.5 for stumps) are reasonable. One refinement: logs are elongated (1.5-3.0 units long, 0.2-0.35 radius) and rotated randomly. A single circle collider at r=0.8 will under-represent the endpoints of long logs and over-represent collision perpendicular to the log axis. This is acceptable given the circle-only collider system -- a more accurate representation would require capsule or multi-circle colliders which add complexity for marginal benefit. **Accept as proposed.**

**Fix 2B (plateau AABB for zombies):** Correct approach -- mirrors the player's BD-85 code. The bead correctly identifies that this must be applied to BOTH the normal-pursuit path (after line 6883) AND the flee path (after line 6847). The performance analysis is accurate (~162 platforms, trivial cost). The distance pre-filter (`Math.abs(pdx) > 5 || Math.abs(pdz) > 5`) is a good optimization, but note that wide plateaus can be up to 7 units wide, so `halfW` can be up to 3.5 + 0.5 = 4.0. A reject threshold of 5 is sufficient (4.0 + 0.5 zombie radius + margin). **Accept as proposed, include the distance pre-filter.**

**Fix 2C (pre-placed object colliders):** The bead correctly identifies the chunk lifecycle issue: if colliders are registered in `collidersByChunk`, they will be deleted when `unloadChunk()` calls `ts.collidersByChunk.delete(key)` at terrain.js line 791. The bead's "better approach" -- a dedicated pre-placed object collision loop built once per frame outside the zombie loop -- is the correct solution. It avoids chunk lifecycle coupling entirely.

**Additional recommendation:** The `worldObjectColliders` array should be built once at the TOP of the enemy update loop (outside the per-zombie iteration), not per-zombie. The bead already identifies this optimization but the code example positioning should be explicit: build it where `gameDt` is first available in the animation loop, before the zombie iteration begins.

**Filtering concern for charge/challenge shrines:** The bead's filter conditions deserve scrutiny:
- `st.shrines.filter(s => s.alive)` -- correct: dead shrines should not block.
- `st.totems.filter(t => t.alive)` -- correct: destroyed totems should not block.
- `st.chargeShrines.filter(cs => !cs.charged)` -- **QUESTIONABLE.** A charged shrine still has a physical pillar in the world. The mesh is not removed when charged. The charge shrine should probably still collide. Use `cs.alive` if it exists, or always collide regardless of charge state. Checking the code: `createChargeShrineMesh` returns `alive: true`. Verify if `alive` is ever set to false. If the mesh persists after charging, collision should persist.
- `st.challengeShrines.filter(cs => !cs.bossDefeated)` -- **QUESTIONABLE for same reason.** The shrine mesh persists after boss defeat. Should still collide unless the group is removed from the scene.

**Recommendation:** Collide with ALL pre-placed objects that still have their mesh in the scene, regardless of activation/charge state. Only stop colliding when the object is truly removed (e.g., `alive === false` for shrines/totems where the mesh is removed).

### Edge Cases and Risks

1. **Zombie getting permanently stuck between multiple colliders:** The radial pushback from multiple nearby circle colliders can push a zombie in contradictory directions, causing jitter. This already exists with trees+rocks from BD-252 but adding logs, stumps, and world objects increases the collider density. The `MIN_DECO_SPACING = 2.5` in terrain.js prevents most tight clusters, but pre-placed world objects use `MIN_SHRINE_SPACING` (need to verify value). **Risk: LOW** -- spacing systems prevent dense clusters.

2. **Plateau corner collision:** When a zombie approaches a plateau corner at 45 degrees, the AABB pushback picks the shortest overlap axis. This can produce a visible "pop" as the zombie shifts from pushing against one face to the adjacent face. This is the same behavior the player experiences (BD-85). **Risk: COSMETIC ONLY, acceptable.**

3. **Boss zombie (BOSS_SCALE=3):** Boss zombies are 3x scaled. The `ER = 0.5` zombie radius is probably too small for a boss. The plateau AABB code uses `ER` as the zombie radius buffer. For bosses, this should be `ER * BOSS_SCALE` or a larger constant. **Risk: MEDIUM** -- boss zombies may partially clip into plateaus. Consider adding: `const zombieRadius = e.isBoss ? 1.5 : 0.5;` and using that instead of `ER`.

4. **Flee behavior and plateau AABB duplication:** The bead correctly notes both the flee path (lines 6823-6847) and the pursuit path (lines 6857-6883) need the same collision additions. This means the plateau AABB and world object collision code must be duplicated in two places, or extracted into a shared helper. **Recommendation: Extract a helper function** `resolveZombieTerrainCollision(newX, newZ, zombieY, isBoss)` that contains all collision resolution (terrain colliders + plateau AABB + world objects) and is called from both paths.

### Estimated Complexity

**M (Medium)** -- Agree with bead assessment. Multiple insertion points, two code paths (flee/pursuit), a once-per-frame array build, and the need to handle boss zombie scaling. The helper function extraction adds a small amount but saves maintenance.

### Implementation Order and Dependencies

1. Fix 2A (terrain.js colliders) -- no dependencies, can be done first
2. Fix 2C (world object collider array build) -- no dependency on 2A, but logically builds the infrastructure
3. Fix 2B (plateau AABB + world object circle loop in zombie movement) -- depends on 2C being designed
4. All three should be in the same commit since they form a single coherent fix

**No external bead dependencies.** BD-252 is already merged.

### Testing Plan

The bead's testing plan is comprehensive. Additional tests:

1. **Boss zombie vs plateau:** Verify a boss zombie (3x scale) does not clip through plateau sides
2. **Charge shrine after charging:** Walk a zombie into a charged shrine -- should still collide (mesh still present)
3. **Challenge shrine after boss defeat:** Walk a zombie into a completed challenge shrine -- should still collide
4. **Chunk boundary colliders:** Place the player near a chunk boundary with a fallen log in the adjacent chunk. Verify the log's collider is found by `getNearbyColliders` (9-chunk query should cover this)
5. **Plateau + terrain collider combo:** Zombie between a tree and a plateau -- should resolve both collisions without getting stuck

---
---

## Review Notes — BD-255: Improve zombie pathfinding (steering-based obstacle avoidance)

**Reviewer:** Claude Opus 4.6 (senior game dev review)
**Date:** 2026-02-27

### Root Cause Verification: CONFIRMED

The current system analysis is accurate. Verified against code:

- Line 6853-6854: direction to player is `(nx, nz) = (dx/dist, dz/dist)` -- pure direct pursuit, no look-ahead
- Lines 6860-6861: movement applied as `newX = pos.x + nx * speed * dt` -- straight-line step
- Lines 6870-6882: radial pushback loop -- pushes zombie out of overlapping colliders after movement
- The zombie always aims directly at the player. Obstacles are resolved by post-hoc pushback only. This indeed produces the "slide along surface" behavior described.

### Recommended Solution Approach

The proposed **look-ahead tangent steering** is well-designed and appropriate for this game's constraints. Key strengths:

1. **Single forward probe** is cheaper than multi-ray approaches and avoids oscillation
2. **Tangent selection using player-direction dot product** ensures the zombie always picks the route that gets it closer to the player
3. **Smooth angle lerp** (`STEER_LERP_RATE = 5.0 rad/s`) prevents jerky direction changes
4. **Defense in depth** -- steering is soft avoidance on top of BD-254's hard collision. Even if steering fails, the pushback catches it
5. **Distance cutoff** (>30 units = skip steering) is a good optimization

**Recommended refinements:**

1. **`getNearbyColliders` reuse:** The bead mentions reusing the `getNearbyColliders` result from BD-252's collision loop. However, the probe and the collision resolution happen at different points in the code. The probe needs colliders at the CURRENT position, while collision resolution needs colliders at the NEW position. These are usually the same 9-chunk set (a zombie moves <0.1 units per frame at 60fps), so reusing is fine. But make this explicit: call `getNearbyColliders` once at the start of the movement block and store the result.

2. **Platform AABB approximation in the probe:** The bead approximates AABBs as circles with `radius = max(w, d) / 2`. For a 7x3 plateau, this gives radius=3.5 -- a massively oversized circle that would cause early steering when the zombie could walk past the narrow side. **Better approach:** Use actual AABB ray-intersection for the probe. Check if the ray from zombie position along `(nx, nz)` for `PROBE_DIST` intersects the expanded AABB `[p.x - halfW - STEER_PROBE_RADIUS, p.z - halfD - STEER_PROBE_RADIUS]` to `[p.x + halfW + STEER_PROBE_RADIUS, p.z + halfD + STEER_PROBE_RADIUS]`. This is a simple 2D ray-AABB intersection (slab method) and is only ~6 comparisons per platform. For the tangent direction, use the nearest AABB face normal rather than the center-to-zombie direction.

   However, this adds implementation complexity. The circle approximation is acceptable as a first pass -- zombies will steer early around wide plateaus but will still reach the player. **Accept the circle approximation for v1**, with a note to upgrade to AABB ray-intersection if steering looks visually off around wide plateaus.

3. **`e.steerAngle` initialization:** The bead uses `Math.atan2(nx, nz)` for lazy init. This is the direction-to-player, which is correct. But on the very first frame, `nx` and `nz` haven't been computed yet if the zombie is initializing. Since `e.steerAngle` is checked with `=== undefined`, it will be set on the first frame when `nx/nz` are available. This is fine.

4. **Flee behavior steering:** The bead mentions fleeing zombies should also use steering. The flee direction is AWAY from the boss spawn point (not toward the player). The steering probe should use the flee direction vector, not the player direction. The tangent selection should pick the tangent that best aligns with the flee direction. This is a natural extension of the same algorithm, just with a different `(nx, nz)` input.

### Edge Cases and Risks

1. **Oscillation between two equidistant obstacles:** If two obstacles are symmetrically placed relative to the zombie-to-player line, the probe will detect whichever is closer. On alternating frames, if the zombie shifts slightly, it might switch which obstacle it detects, causing oscillation. The `STEER_LERP_RATE` smooth lerp mitigates this -- even if the target angle flips, the zombie turns smoothly and the oscillation manifests as gentle weaving rather than jerky oscillation. **Risk: LOW.**

2. **Zombie gets "stuck" steering around a long wall of trees:** If the player is behind a dense line of trees, the zombie will steer tangentially and keep hitting the next tree, re-triggering steering. This produces a zombie that walks parallel to the tree line indefinitely. The steering only detects the NEAREST obstacle, so after clearing the first tree, it finds the next one and re-steers. This behavior is actually correct -- the zombie looks like it's searching for a gap. Eventually it will find the end of the tree line or a gap between trees (MIN_DECO_SPACING=2.5 ensures gaps exist). **Risk: COSMETIC, acceptable.**

3. **Merge system interaction:** The bead raises this concern correctly. Steering could potentially spread zombies across multiple paths around obstacles, reducing clustering. However, since all zombies ultimately converge on the player position, and the tangent selection always picks the player-side tangent, zombies on the same side of an obstacle will all pick the same tangent. This actually preserves clustering. Zombies approaching from different directions may split around an obstacle, but they merge again on the other side. **Risk: LOW -- merging should be minimally affected.**

4. **Boss zombie probe radius:** Boss zombies are 3x scaled. The `STEER_PROBE_RADIUS = 0.6` is appropriate for normal zombies but too small for bosses. Boss zombies should use `STEER_PROBE_RADIUS * BOSS_SCALE` (= 1.8) and possibly a larger `STEER_PROBE_DIST` (= 4.0-5.0) to account for their inability to fit through narrow gaps. **Risk: MEDIUM if not addressed -- boss zombies will try to steer through gaps they can't fit through.**

5. **Performance regression on low-end devices:** The bead estimates ~80-120 extra operations per zombie. At 200 zombies, this is ~24,000 operations/frame, which is trivial on desktop but could matter on low-end mobile WebGL targets. The >30 unit distance cutoff reduces this to ~50-100 nearby zombies. **Risk: LOW with the distance cutoff.**

### Estimated Complexity

**M-L (Medium-Large)** -- Agree with bead assessment. The core algorithm is ~40 lines, but the integration touches two code paths (pursuit + flee), requires careful placement relative to BD-254's collision code, needs boss-scale handling, and requires visual tuning. Tuning constants (`STEER_PROBE_DIST`, `STEER_LERP_RATE`, `STEER_MIN_DIST`) will need playtest iteration.

### Implementation Order and Dependencies

1. **BD-254 MUST be complete first.** BD-255's probe needs to check all the colliders that BD-254 adds (logs, stumps, plateaus, world objects). If BD-254 is incomplete, the steering probe will miss obstacles that the collision pushback catches, creating visual inconsistency (zombie doesn't steer around the obstacle but bounces off it).
2. Add steering constants to `js/3d/constants.js` (or inline in game3d.js)
3. Add `e.steerAngle` initialization alongside existing `e.jumpVY` initialization
4. Insert probe + tangent steering code BEFORE the `newX/newZ` calculation in both pursuit and flee paths
5. Replace `nx * eSpd * gameDt` with `steerNx * eSpd * gameDt` for the movement step
6. Keep BD-254's collision resolution unchanged as the safety net

### Testing Plan

The bead's testing plan is comprehensive. Additional tests:

1. **A/B comparison:** Record zombie behavior approaching a tree before and after BD-255. The "before" should show slide-along-surface; the "after" should show a visible curve around the tree.
2. **Tuning validation:** Adjust `STEER_PROBE_DIST` from 1.5 to 4.0 and observe. Too short = zombies don't steer early enough. Too long = zombies steer around distant obstacles unnecessarily. The proposed 2.5 is a good starting point.
3. **Angle lerp validation:** Set `STEER_LERP_RATE` to 100 (instant snap) and verify it still works but looks jerky. Then restore to 5.0 and verify smooth steering.
4. **Multiple obstacle gauntlet:** Stand behind 3-4 closely spaced trees (within MIN_DECO_SPACING constraints). Verify zombies navigate through the gaps without getting stuck.
5. **Merge frequency counter:** Run for 5 minutes, count merges. Compare to pre-BD-255 baseline. Should be within 20% of baseline.
