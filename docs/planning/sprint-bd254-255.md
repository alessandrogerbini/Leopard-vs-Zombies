# Sprint Plan: BD-254 & BD-255 -- Zombie Terrain Collision Gaps + Pathfinding Steering

**Date:** 2026-02-27
**Source beads:** `docs/planning/beads-bd254-255.md`
**Execution model:** Sequential (BD-255 depends on BD-254)

---

## 1. Sprint Overview

BD-252 (previous sprint) implemented atomic move-then-resolve zombie collision with trees and rocks. However, zombies still phase through the **majority of solid obstacles**: plateaus (the largest terrain features), fallen logs, stumps, shrines, totems, charge shrines, and challenge shrines. BD-254 closes all these collision gaps. BD-255 then improves the visual quality of zombie obstacle interaction by adding look-ahead steering so zombies route around obstacles instead of sliding along their surfaces.

**BD-254 is P1 (bug fix):** Zombies phasing through large solid objects is visually broken and undermines game feel.
**BD-255 is P2 (enhancement):** Steering is a quality-of-life improvement -- the game is playable without it, but zombie behavior looks robotic.

**Implementation must be sequential:** BD-255 depends on BD-254 for the complete collider set. The steering probe (BD-255) must see all obstacles that the collision pushback (BD-254) enforces. If BD-255 is implemented without BD-254, zombies would steer around some obstacles but not others, creating visual inconsistency.

---

## 2. Bead Inventory

| BD# | Priority | Category | File(s) | Complexity | Summary |
|-----|----------|----------|---------|------------|---------|
| BD-254 | P1 | Bug (enemy collision) | `js/3d/terrain.js`, `js/game3d.js` | M | Add missing colliders for logs, stumps, plateaus, shrines, totems |
| BD-255 | P2 | Enhancement (enemy AI) | `js/game3d.js` | M-L | Forward-probe tangent steering for zombie obstacle avoidance |

---

## 3. Conflict Matrix

|          | BD-254 | BD-255 |
|----------|--------|--------|
| **BD-254** | --     | DEPENDENCY |
| **BD-255** | DEPENDENCY | -- |

### Conflict Details

- **BD-254 vs BD-255 (DEPENDENCY):** BD-255 MUST be implemented after BD-254. Both modify the same zombie movement code region in `js/game3d.js` (lines 6816-6889). BD-254 adds collision resolution blocks after the existing terrain collider loop. BD-255 replaces the movement direction calculation that feeds into those collision blocks. BD-255 must see BD-254's code to place the steering logic correctly relative to the new collision blocks.

### Conflicts with External Beads

None. BD-252 is already merged. No other in-flight beads touch the zombie movement code region (lines 6800-6930) or terrain.js decoration generation (lines 683-723).

---

## 4. Parallelization Opportunities

**None.** BD-254 and BD-255 modify overlapping code regions and have a hard dependency. They must be implemented sequentially: BD-254 first, then BD-255.

Within BD-254 itself, the three sub-fixes (2A: terrain colliders, 2B: plateau AABB, 2C: world object colliders) could theoretically be parallelized since 2A is in `terrain.js` while 2B and 2C are in `game3d.js`. However, 2B and 2C are in the same function and adjacent code lines, so a single agent should implement all three sub-fixes together.

**Recommended execution: Single agent, two sequential commits (BD-254 then BD-255).**

---

## 5. Machine-Actionable Specs

---

### 5A. BD-254: Fix remaining zombie terrain pass-through

**Priority:** P1
**Complexity:** M (Medium)
**Files:** `js/3d/terrain.js` (lines 694, 722), `js/game3d.js` (lines ~6823-6889, ~1707-1728, ~1769)

---

#### Step 1: Add fallen log colliders in terrain.js

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/3d/terrain.js`
**Location:** Line 694, after `ts.decorationsByChunk.get(key).push(logDec);`

**Current code (lines 692-695):**
```js
    const logDec = { meshes, x: dx, z: dz };
    ts.decorations.push(logDec);
    ts.decorationsByChunk.get(key).push(logDec);
  }
```

**Replace with:**
```js
    const logDec = { meshes, x: dx, z: dz };
    ts.decorations.push(logDec);
    ts.decorationsByChunk.get(key).push(logDec);
    // BD-254: Add collision for fallen logs (r=0.8 approximates center bulk of elongated shape)
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.8 });
  }
```

**Rationale:** Fallen logs are 1.5-3.0 units long but the collider system only supports circles. r=0.8 approximates the center mass. The `has()`/`set()` guard is defensive (the key should already exist from tree registration above, but log-only chunks are possible if all tree placements fail `isDecoPositionClear`).

---

#### Step 2: Add tree stump colliders in terrain.js

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/3d/terrain.js`
**Location:** Line 722, after `ts.decorationsByChunk.get(key).push(stumpDec);`

**Current code (lines 720-723):**
```js
    const stumpDec = { meshes, x: dx, z: dz };
    ts.decorations.push(stumpDec);
    ts.decorationsByChunk.get(key).push(stumpDec);
  }
```

**Replace with:**
```js
    const stumpDec = { meshes, x: dx, z: dz };
    ts.decorations.push(stumpDec);
    ts.decorationsByChunk.get(key).push(stumpDec);
    // BD-254: Add collision for stumps (r=0.5 covers 0.35-0.6 width + root bulge)
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.5 });
  }
```

**Rationale:** Stumps are 0.35-0.6 units wide with optional root bulge up to 1.3x wider. r=0.5 is a reasonable median.

**Mushroom clusters: NO collider.** Intentional -- mushrooms are tiny foliage (0.06 stem, 0.15-0.27 cap). Zombies should trample them.

---

#### Step 3: Extract zombie terrain collision into a shared helper function

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Insert as a new function BEFORE the animation loop (before the `function animate()` or the game loop function). A good location is around line 6780, before the enemy update section begins.

**Purpose:** The same collision resolution (terrain colliders + plateau AABB + world objects) must be applied in both the flee path (lines 6823-6847) and the pursuit path (lines 6857-6883). Rather than duplicating the code, extract a helper.

**New function to insert:**
```js
    // BD-254: Shared zombie terrain collision resolver.
    // Resolves circle colliders (trees, rocks, logs, stumps),
    // plateau AABB horizontal collision, and pre-placed world object collision.
    // Returns resolved (newX, newZ).
    function resolveZombieCollisions(newX, newZ, zombieY, isBoss) {
      const ER = isBoss ? 1.5 : 0.5; // BD-252 zombie radius (enlarged for boss)

      // 1. Terrain circle colliders (trees, rocks, logs, stumps)
      if (terrainState) {
        const nearby = getNearbyColliders(newX, newZ, terrainState);
        for (let ci = 0; ci < nearby.length; ci++) {
          const c = nearby[ci];
          const cdx = newX - c.x;
          const cdz = newZ - c.z;
          const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
          const minDist = ER + c.radius;
          if (cDist < minDist && cDist > 0.001) {
            const pushDist = minDist - cDist;
            newX += (cdx / cDist) * pushDist;
            newZ += (cdz / cDist) * pushDist;
          }
        }
      }

      // 2. Plateau AABB horizontal collision (mirrors player BD-85, lines 4951-4977)
      for (let pi = 0; pi < platforms.length; pi++) {
        const p = platforms[pi];
        const platTop = p.y + 0.2;
        // Only collide horizontally if zombie is below the platform surface
        if (zombieY < platTop - 0.3) {
          const halfW = p.w / 2 + ER;
          const halfD = p.d / 2 + ER;
          const pdx = newX - p.x;
          const pdz = newZ - p.z;
          // Quick distance reject for performance
          if (Math.abs(pdx) > halfW + 1 || Math.abs(pdz) > halfD + 1) continue;
          if (Math.abs(pdx) < halfW && Math.abs(pdz) < halfD) {
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

      // 3. Pre-placed world object circle collision (shrines, totems, charge/challenge shrines)
      for (let wi = 0; wi < worldObjectColliders.length; wi++) {
        const wo = worldObjectColliders[wi];
        const wdx = newX - wo.x;
        const wdz = newZ - wo.z;
        const wDist = Math.sqrt(wdx * wdx + wdz * wdz);
        const wMinDist = ER + wo.radius;
        if (wDist < wMinDist && wDist > 0.001) {
          const wPush = wMinDist - wDist;
          newX += (wdx / wDist) * wPush;
          newZ += (wdx / wDist) * wPush;
        }
      }

      return { x: newX, z: newZ };
    }
```

**IMPORTANT NOTE on the `worldObjectColliders` variable:** This is built once per frame (Step 4 below) and must be in scope when `resolveZombieCollisions` is called.

**CORRECTION in the world object loop:** The Z pushback line has a bug in the bead's original code (`wdx` used for both X and Z). It should be:
```js
          newX += (wdx / wDist) * wPush;
          newZ += (wdz / wDist) * wPush;  // <-- wdz, not wdx
```

---

#### Step 4: Build world object collider list once per frame

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Insert at the TOP of the enemy update section, BEFORE the zombie iteration loop begins. Find the line that starts iterating enemies (search for the start of the enemy movement loop, around line 6780-6790).

Find the line that begins the per-enemy loop. It will look like `for (let i = 0; i < st.enemies.length; i++)` or `for (const e of st.enemies)`. Insert BEFORE this line:

```js
      // BD-254: Build pre-placed world object collider list once per frame.
      // All pre-placed objects with visible meshes should block zombies,
      // regardless of activation/charge/defeat state.
      // Only exclude objects whose mesh has been removed (alive === false for shrines/totems).
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
        // Charge shrines retain their mesh even when charged -- always collide
        worldObjectColliders.push({ x: cs.x, z: cs.z, radius: 1.2 });
      }
      for (let i = 0; i < st.challengeShrines.length; i++) {
        const cs = st.challengeShrines[i];
        // Challenge shrines retain their mesh even after boss defeat -- always collide
        worldObjectColliders.push({ x: cs.x, z: cs.z, radius: 1.5 });
      }
```

**Note:** The total count is ~20 shrines + 24 totems + 22 charge shrines + 10 challenge shrines = ~76 objects maximum. Building this array each frame is trivially cheap (~76 iterations with conditional push).

---

#### Step 5: Replace inline collision code with helper calls

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`

**5a. Flee behavior path (lines 6831-6847):**

**Current code:**
```js
          // Resolve terrain collisions
          if (terrainState) {
            const ER = 0.5;
            const nearby = getNearbyColliders(newX, newZ, terrainState);
            for (let ci = 0; ci < nearby.length; ci++) {
              const c = nearby[ci];
              const cdx = newX - c.x;
              const cdz = newZ - c.z;
              const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
              const minDist = ER + c.radius;
              if (cDist < minDist && cDist > 0.001) {
                const pushDist = minDist - cDist;
                newX += (cdx / cDist) * pushDist;
                newZ += (cdz / cDist) * pushDist;
              }
            }
          }
```

**Replace with:**
```js
          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;
```

**5b. Pursuit behavior path (lines 6867-6883):**

**Current code:**
```js
          // Resolve terrain collisions on the NEW position before committing
          if (terrainState) {
            const ER = 0.5; // BD-252: increased from 0.4 to match player feel
            const nearby = getNearbyColliders(newX, newZ, terrainState);
            for (let ci = 0; ci < nearby.length; ci++) {
              const c = nearby[ci];
              const cdx = newX - c.x;
              const cdz = newZ - c.z;
              const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
              const minDist = ER + c.radius;
              if (cDist < minDist && cDist > 0.001) {
                const pushDist = minDist - cDist;
                newX += (cdx / cDist) * pushDist;
                newZ += (cdz / cDist) * pushDist;
              }
            }
          }
```

**Replace with:**
```js
          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;
```

---

#### Step 6: Verify scope accessibility

Before committing, verify these variables are accessible from `resolveZombieCollisions`:

- `terrainState` -- should be in closure scope (defined at the top of `launch3DGame`)
- `getNearbyColliders` -- imported from terrain.js
- `platforms` -- defined at line 1064, in closure scope
- `worldObjectColliders` -- defined in Step 4, must be in the same scope or a parent scope of the helper function. If the helper is defined inside the animation loop, it has access. If defined outside, `worldObjectColliders` must be passed as a parameter.

**Safest approach:** Define `resolveZombieCollisions` inside the `animate()` function scope (or wherever the per-frame logic runs) so it can close over `terrainState`, `platforms`, and `worldObjectColliders`. Alternatively, pass them as parameters.

---

### 5B. BD-255: Improve zombie pathfinding with steering

**Priority:** P2
**Complexity:** M-L (Medium-Large)
**File:** `js/game3d.js` (zombie movement section, lines ~6815-6889)
**Depends on:** BD-254 complete and merged

---

#### Step 1: Add steering constants

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Near the top of the `launch3DGame` function, alongside other game constants (or inline near the enemy update section). Alternatively, add to `js/3d/constants.js` if you prefer centralized constants.

**Insert:**
```js
    // BD-255: Zombie steering constants
    const STEER_PROBE_DIST = 2.5;     // How far ahead to check for obstacles (world units)
    const STEER_PROBE_RADIUS = 0.6;   // Probe thickness (zombie radius + buffer)
    const STEER_LERP_RATE = 5.0;      // Steering speed (radians/second)
    const STEER_MIN_DIST = 0.3;       // Ignore obstacles behind us (dot product threshold)
    const STEER_SKIP_DIST = 30;       // Skip steering for zombies farther than this from player
    const STEER_BOSS_PROBE_MULT = 2.0; // Boss zombies use larger probe radius
```

---

#### Step 2: Add a `probeForObstacle` helper function

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Near `resolveZombieCollisions` (from BD-254 Step 3).

**Insert:**
```js
    // BD-255: Probe ahead along a direction for the nearest blocking obstacle.
    // Returns { blocked, obstacleX, obstacleZ, obstacleR } or { blocked: false }.
    function probeForObstacle(posX, posZ, dirX, dirZ, zombieY, isBoss) {
      const probeRadius = isBoss ? STEER_PROBE_RADIUS * STEER_BOSS_PROBE_MULT : STEER_PROBE_RADIUS;
      const probeDist = isBoss ? STEER_PROBE_DIST * 1.5 : STEER_PROBE_DIST;
      let blocked = false;
      let bestDist = probeDist + 10;
      let obstacleX = 0, obstacleZ = 0, obstacleR = 0;

      // Check circle colliders (trees, rocks, logs, stumps, world objects)
      if (terrainState) {
        const nearby = getNearbyColliders(posX, posZ, terrainState);
        for (let ci = 0; ci < nearby.length; ci++) {
          const c = nearby[ci];
          const toObsX = c.x - posX;
          const toObsZ = c.z - posZ;
          const dot = toObsX * dirX + toObsZ * dirZ;
          if (dot < STEER_MIN_DIST || dot > probeDist) continue;
          const perpX = toObsX - dot * dirX;
          const perpZ = toObsZ - dot * dirZ;
          const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
          if (perpDist < probeRadius + c.radius && dot < bestDist) {
            blocked = true;
            bestDist = dot;
            obstacleX = c.x;
            obstacleZ = c.z;
            obstacleR = c.radius;
          }
        }
      }

      // Check world object colliders
      for (let wi = 0; wi < worldObjectColliders.length; wi++) {
        const wo = worldObjectColliders[wi];
        const toObsX = wo.x - posX;
        const toObsZ = wo.z - posZ;
        const dot = toObsX * dirX + toObsZ * dirZ;
        if (dot < STEER_MIN_DIST || dot > probeDist) continue;
        const perpX = toObsX - dot * dirX;
        const perpZ = toObsZ - dot * dirZ;
        const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
        if (perpDist < probeRadius + wo.radius && dot < bestDist) {
          blocked = true;
          bestDist = dot;
          obstacleX = wo.x;
          obstacleZ = wo.z;
          obstacleR = wo.radius;
        }
      }

      // Check platforms (approximate as circle for probe)
      for (let pi = 0; pi < platforms.length; pi++) {
        const p = platforms[pi];
        if (zombieY >= p.y - 0.1) continue; // On top or above -- skip
        const approxR = Math.max(p.w, p.d) / 2;
        const toObsX = p.x - posX;
        const toObsZ = p.z - posZ;
        const dot = toObsX * dirX + toObsZ * dirZ;
        if (dot < STEER_MIN_DIST || dot > probeDist + approxR) continue;
        const perpX = toObsX - dot * dirX;
        const perpZ = toObsZ - dot * dirZ;
        const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
        if (perpDist < probeRadius + approxR && dot < bestDist) {
          blocked = true;
          bestDist = dot;
          obstacleX = p.x;
          obstacleZ = p.z;
          obstacleR = approxR;
        }
      }

      return { blocked, obstacleX, obstacleZ, obstacleR };
    }
```

---

#### Step 3: Add a `computeSteeringAngle` helper function

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Adjacent to `probeForObstacle`.

**Insert:**
```js
    // BD-255: Compute the steered movement angle for a zombie.
    // baseNx, baseNz = normalized direction (toward player or away from boss).
    // Returns the angle to use for movement, updating e.steerAngle via lerp.
    function computeSteeringAngle(e, baseNx, baseNz, dt, dist, isBoss) {
      const targetAngle = Math.atan2(baseNx, baseNz);

      // Skip steering for distant zombies (player can't see them)
      if (dist > STEER_SKIP_DIST) {
        e.steerAngle = targetAngle;
        return targetAngle;
      }

      // Lazy-init steerAngle
      if (e.steerAngle === undefined) e.steerAngle = targetAngle;

      // Probe for obstacles
      const probe = probeForObstacle(
        e.group.position.x, e.group.position.z,
        baseNx, baseNz, e.group.position.y, isBoss
      );

      let steerTargetAngle = targetAngle;

      if (probe.blocked) {
        // Calculate tangent directions around the blocking obstacle
        const toObsX = probe.obstacleX - e.group.position.x;
        const toObsZ = probe.obstacleZ - e.group.position.z;
        const toObsDist = Math.sqrt(toObsX * toObsX + toObsZ * toObsZ) || 1;
        const toObsNx = toObsX / toObsDist;
        const toObsNz = toObsZ / toObsDist;

        // Two perpendicular tangent directions
        const tangentLx = -toObsNz, tangentLz =  toObsNx; // left
        const tangentRx =  toObsNz, tangentRz = -toObsNx; // right

        // Choose tangent that aligns better with the base direction
        const dotL = tangentLx * baseNx + tangentLz * baseNz;
        const dotR = tangentRx * baseNx + tangentRz * baseNz;

        if (dotL > dotR) {
          steerTargetAngle = Math.atan2(tangentLx, tangentLz);
        } else {
          steerTargetAngle = Math.atan2(tangentRx, tangentRz);
        }
      }

      // Smooth steering via angle lerp
      let angleDiff = steerTargetAngle - e.steerAngle;
      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      const maxTurn = STEER_LERP_RATE * dt;
      if (Math.abs(angleDiff) > maxTurn) {
        e.steerAngle += (angleDiff > 0 ? maxTurn : -maxTurn);
      } else {
        e.steerAngle = steerTargetAngle;
      }

      return e.steerAngle;
    }
```

---

#### Step 4: Integrate steering into the pursuit movement path

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Lines 6852-6888 (the pursuit path, `else if (dist > 0.01)`)

**Current code (after BD-254 has been applied):**
```js
        } else if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;

          // BD-252: Atomic move-then-resolve
          let newX = e.group.position.x + nx * eSpd * gameDt;
          let newZ = e.group.position.z + nz * eSpd * gameDt;

          // Clamp to map boundaries
          newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
          newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;

          // Commit resolved position
          e.group.position.x = newX;
          e.group.position.z = newZ;
          e.group.rotation.y = Math.atan2(nx, nz);
        }
```

**Replace with:**
```js
        } else if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;

          // BD-255: Compute steered movement direction (look-ahead tangent steering)
          const steerAngle = computeSteeringAngle(e, nx, nz, gameDt, dist, !!e.isBoss);
          const steerNx = Math.sin(steerAngle);
          const steerNz = Math.cos(steerAngle);

          // BD-252: Atomic move-then-resolve (now with steered direction)
          let newX = e.group.position.x + steerNx * eSpd * gameDt;
          let newZ = e.group.position.z + steerNz * eSpd * gameDt;

          // Clamp to map boundaries
          newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
          newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;

          // Commit resolved position
          e.group.position.x = newX;
          e.group.position.z = newZ;
          // BD-255: Face the steering direction (not the player direction)
          e.group.rotation.y = steerAngle;
        }
```

---

#### Step 5: Integrate steering into the flee movement path

**File:** `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`
**Location:** Lines 6816-6851 (the flee path, `if (e.fleeTimer > 0)`)

**Current code (after BD-254 has been applied):**
```js
        if (e.fleeTimer > 0) {
          e.fleeTimer -= dt;
          const fdx = e.group.position.x - e.fleeFromX;
          const fdz = e.group.position.z - e.fleeFromZ;
          const fdist = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;

          // BD-252: Atomic move-then-resolve for flee behavior too
          let newX = e.group.position.x + (fdx / fdist) * eSpd * dt;
          let newZ = e.group.position.z + (fdz / fdist) * eSpd * dt;

          // Clamp to map boundaries
          newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
          newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;

          e.group.position.x = newX;
          e.group.position.z = newZ;
          e.group.rotation.y = Math.atan2(fdx / fdist, fdz / fdist);
```

**Replace with:**
```js
        if (e.fleeTimer > 0) {
          e.fleeTimer -= dt;
          const fdx = e.group.position.x - e.fleeFromX;
          const fdz = e.group.position.z - e.fleeFromZ;
          const fdist = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
          const fleeNx = fdx / fdist;
          const fleeNz = fdz / fdist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;

          // BD-255: Steer around obstacles while fleeing
          // Pass a large 'dist' to avoid the distance cutoff (fleeing zombies are often far)
          const fleeSteerAngle = computeSteeringAngle(e, fleeNx, fleeNz, dt, 0, !!e.isBoss);
          const fleeSteerNx = Math.sin(fleeSteerAngle);
          const fleeSteerNz = Math.cos(fleeSteerAngle);

          // BD-252: Atomic move-then-resolve for flee behavior
          let newX = e.group.position.x + fleeSteerNx * eSpd * dt;
          let newZ = e.group.position.z + fleeSteerNz * eSpd * dt;

          // Clamp to map boundaries
          newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
          newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

          // BD-254: Full terrain + plateau + world object collision resolution
          const resolved = resolveZombieCollisions(newX, newZ, e.group.position.y, !!e.isBoss);
          newX = resolved.x;
          newZ = resolved.z;

          e.group.position.x = newX;
          e.group.position.z = newZ;
          e.group.rotation.y = fleeSteerAngle;
```

**Note:** The `dist` parameter is passed as `0` for fleeing zombies to avoid the `STEER_SKIP_DIST` cutoff. Fleeing zombies are often far from the player, but they still need steering to avoid obstacles they're running through. An alternative is to compute the distance from the flee source, but `dist=0` always enables steering which is the safest approach.

---

#### Step 6: Verify `e.steerAngle` does not interfere with zombie recycling

**Check:** When a zombie dies and is recycled/respawned, verify that `e.steerAngle` is reset. Search for zombie spawn/recycle code (likely where `e.jumpVY = 0` is set). If `steerAngle` is not explicitly reset, the lazy-init `if (e.steerAngle === undefined)` check will NOT reset it (it's already defined from the previous life). **Fix: explicitly set `e.steerAngle = undefined` or `delete e.steerAngle` in the zombie spawn/recycle code.** Alternatively, change the lazy-init to always reset when the zombie spawns.

**Search pattern:** Look for `jumpVY = 0` or `alive = true` in zombie creation/spawn code. Add `e.steerAngle = undefined;` at the same location.

---

## 6. Testing Plan

### Phase 1: BD-254 Validation (after implementing BD-254, before BD-255)

| # | Test | Expected Result | Method |
|---|------|-----------------|--------|
| 1 | Zombie approaches fallen log | Zombie slides around log, does not pass through | Visual observation, normal gameplay |
| 2 | Zombie approaches tree stump | Zombie deflects off stump | Visual observation |
| 3 | Zombie approaches plateau from side | Zombie blocked by AABB, slides along face | Position player behind a plateau, observe zombie behavior |
| 4 | Zombie on top of plateau | Zombie NOT blocked horizontally (zombieY >= platTop) | Jump zombie onto plateau via existing jump mechanic |
| 5 | Zombie approaches shrine/totem | Zombie deflects off shrine | Lure zombie near shrine |
| 6 | Destroy shrine, lure zombie through | Zombie walks through former shrine location | Kill shrine first, then test |
| 7 | Zombie approaches charge shrine | Zombie blocked by r=1.2 collider | Lure zombie near charge shrine |
| 8 | Zombie approaches challenge shrine | Zombie blocked by r=1.5 collider | Lure zombie near challenge shrine |
| 9 | Boss zombie vs plateau side | Boss zombie blocked with larger radius, no clipping | Trigger boss, observe near plateau |
| 10 | Fleeing zombies (boss spawn) | Fleeing zombies do not phase through plateaus/shrines | Trigger boss spawn near plateau/shrine |
| 11 | 200+ zombies performance | No FPS drop below 55fps | Play for 5+ minutes at high difficulty |
| 12 | Chunk boundary test | Log/stump colliders work near chunk edges | Play near chunk boundaries |

### Phase 2: BD-255 Validation (after implementing BD-255)

| # | Test | Expected Result | Method |
|---|------|-----------------|--------|
| 1 | Zombie approaches tree (player behind) | Zombie curves around tree visibly, not sliding | Stand behind a tree, watch approaching zombie |
| 2 | Zombie approaches wide plateau | Zombie picks a side early and routes around | Stand behind wide plateau |
| 3 | Zombies in open field | Straight-line movement, no unnecessary steering | Open area, observe |
| 4 | Zombies through forest | Weaving between trees, smooth curves | Stand in dense forest |
| 5 | Merge frequency | Similar to pre-BD-255 levels (within 20%) | 5-minute timed test |
| 6 | Steering smoothness | No jerky oscillation, smooth turns | Close observation of single zombie |
| 7 | Zombie in tight gap | Zombie navigates through or detours, no permanent stall | Two obstacles ~3 units apart |
| 8 | Boss zombie steering | Steers with larger probe, avoids narrow gaps | Trigger boss near obstacles |
| 9 | 200+ zombies + steering | No FPS drop below 55fps | Extended play at high difficulty |
| 10 | Distant zombie (>30 units) | Direct pursuit, no steering overhead | Watch zombie far from player |
| 11 | Flee + steering | Fleeing zombies steer around obstacles | Trigger boss near trees |
| 12 | `steerAngle` on zombie respawn | No stale steering angle from previous life | Kill and respawn zombie, observe initial heading |

### Phase 3: Regression Testing

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Player collision with trees/rocks | Unchanged from pre-BD-254 |
| 2 | Player collision with plateaus (BD-85) | Unchanged |
| 3 | Zombie jump onto platforms | Still works (vertical landing unchanged) |
| 4 | Zombie merge system | Still triggers, no regression in merge rates |
| 5 | Shrine interaction (player) | Still works normally |
| 6 | Totem activation (player) | Still works normally |
| 7 | Charge shrine charging (player) | Still works normally |
| 8 | Challenge shrine activation (player) | Still works normally |
| 9 | Game-over flow (BD-251) | Still works -- death transitions correctly |
| 10 | Chill mode enemy speed | Steering respects speed multiplier |

---

## 7. Rollback Plan

If BD-254 causes issues (zombies permanently stuck, performance regression):
- Revert `terrain.js` log/stump collider additions (Steps 1-2)
- Revert `game3d.js` helper function and worldObjectColliders (Steps 3-5)
- Restore original inline collision code from BD-252

If BD-255 causes issues (oscillation, merge regression, performance):
- Revert steering constants, helper functions, and pursuit/flee path changes
- Restore BD-254's direct-pursuit movement (the collision resolution from BD-254 remains)
- BD-254 and BD-255 are independently revertable since BD-254 works without BD-255

---

## 8. File Change Summary

| File | BD-254 Changes | BD-255 Changes |
|------|---------------|----------------|
| `js/3d/terrain.js` | +4 lines (log collider), +4 lines (stump collider) | None |
| `js/game3d.js` | +~55 lines (helper function), +~20 lines (worldObjectColliders), -~30 lines (inline code replaced by helper calls) | +~6 lines (constants), +~50 lines (probeForObstacle), +~40 lines (computeSteeringAngle), ~15 lines modified (pursuit path), ~10 lines modified (flee path) |

**Net lines added:** BD-254: ~49 lines, BD-255: ~121 lines. **Total: ~170 lines.**
