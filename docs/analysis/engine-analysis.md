# Wildfang -- DIY Engine Analysis

**Date:** 2026-02-22
**Scope:** Full physics, collision, rendering, and engine architecture review of `js/game3d.js`
**Source reviewed:** ~4,500 lines of `game3d.js`, plus architecture docs and the Wildfang design plan
**Purpose:** Identify where the current DIY Three.js engine will break, when, and what to do about it

---

## Table of Contents

1. [Unit Collision System](#1-unit-collision-system)
2. [Terrain/Physics Model Interactions](#2-terrainphysics-model-interactions)
3. [Movement and Pathfinding](#3-movement-and-pathfinding)
4. [Projectile Physics](#4-projectile-physics)
5. [Other Areas Worth Scrutinizing](#5-other-areas-worth-scrutinizing)
6. [Forecasted Breaking Points](#6-forecasted-breaking-points)
7. [Open-Source Engine Options](#7-open-source-engine-options)
8. [Recommended DIY Survival Strategy](#8-recommended-diy-survival-strategy)

---

## 1. Unit Collision System

### What the code actually does

The game has **five distinct collision domains**, each implemented separately with no shared collision infrastructure:

#### 1a. Player-Enemy (Contact Damage)
**File:** `game3d.js` lines 3491-3511

```js
const dy = Math.abs(st.playerY - e.group.position.y);
const tierData = ZOMBIE_TIERS[(e.tier || 1) - 1];
if (dist < 1.0 * (tierData.scale || 1) && dy < 1.5 && st.invincible <= 0) {
    let dmg = 15 * tierData.dmgMult * st.zombieDmgMult * dt;
    // ... armor, augments, shield bracelet ...
    st.hp -= dmg;
}
```

- **Shape:** Sphere-like radius check (distance < 1.0 * tier scale) plus a Y-axis height gate (dy < 1.5).
- **Response:** Damage only. No push-back, no knockback, no separation. The player and enemy freely overlap.
- **Scale-sensitivity:** Runs once per enemy per frame inside the enemy AI loop. O(N) where N = enemy count. Fine at current scale.

#### 1b. Enemy-Enemy (Zombie Merge System)
**File:** `game3d.js` lines 3528-3575

```js
const ZOMBIE_RADIUS = 0.5;
for (let i = 0; i < st.enemies.length; i++) {
    for (let j = i + 1; j < st.enemies.length; j++) {
        // ... sphere check with tier-scaled radii ...
        if (distSq < minDist * minDist && distSq > 0.001) {
            if (aTier === bTier && aTier < 10) {
                // MERGE
            } else {
                // PUSH APART (overlap resolution)
                const dist = Math.sqrt(distSq);
                const overlap = (minDist - dist) * 0.5;
                a.group.position.x += nx * overlap;
                b.group.position.x -= nx * overlap;
            }
        }
    }
}
```

- **Shape:** Sphere-to-sphere with tier-scaled radii (ZOMBIE_RADIUS * (aScale + bScale)).
- **Response:** Same-tier enemies below tier 10 merge. Different-tier or max-tier enemies are pushed apart with simple overlap resolution (each moves half the overlap distance).
- **Complexity:** O(N^2) nested loop over all enemies. This is the primary collision bottleneck.
- **No spatial partitioning.** Every enemy is checked against every other enemy every frame.

**Performance scaling estimates for the merge loop:**

| Enemy count | Pair checks per frame | At 60fps |
|---|---|---|
| 50 | 1,225 | 73,500/s |
| 100 | 4,950 | 297,000/s |
| 200 | 19,900 | 1,194,000/s |
| 500 | 124,750 | 7,485,000/s |

At 100 enemies this is manageable. At 200+, this single loop will start eating frame budget, especially combined with the other O(N) loops running in the same frame.

#### 1c. Projectile-Enemy
**File:** `game3d.js` lines 2447-2466 (weapon projectiles), 3720-3730 (banana cannon)

```js
for (const e of st.enemies) {
    if (!e.alive) continue;
    const dx = p.mesh.position.x - e.group.position.x;
    const dz = p.mesh.position.z - e.group.position.z;
    if (dx * dx + dz * dz < 1.2) {
        damageEnemy(e, p.dmg);
```

- **Shape:** Fixed sphere radius (sqrt(1.2) ~= 1.095 units) regardless of projectile or enemy size.
- **Hit detection:** Discrete, position-only. No continuous collision detection (CCD).
- **Complexity:** O(P * N) where P = projectile count, N = enemy count. Each projectile iterates all enemies.
- **Tunneling risk:** With `dt` capped at 0.05s and projectile speeds of 10-15 units/s, projectiles move 0.5-0.75 units per frame against a 1.1-unit hit radius. At these speeds, tunneling is unlikely. However, if projectile speeds increase (e.g., the plan mentions "feather daggers -- fast projectiles in a spread pattern"), fast small projectiles could tunnel through small enemies.

#### 1d. Player-Platform
**File:** `game3d.js` lines 2857-2871

```js
if (!st.flying && st.playerVY <= 0) {
    for (const p of platforms) {
        const halfW = p.w / 2, halfD = p.d / 2;
        if (st.playerX > p.x - halfW && st.playerX < p.x + halfW &&
            st.playerZ > p.z - halfD && st.playerZ < p.z + halfD) {
            const platTop = p.y + 0.2;
            if (st.playerY >= platTop - 0.5 && st.playerY <= platTop + 0.5) {
                st.playerY = platTop;
```

- **Shape:** AABB check on XZ plane, then a Y-band check (within 0.5 units of platform top).
- **One-way:** Only checked when falling (playerVY <= 0). No side or bottom collision.
- **Complexity:** O(P) where P = total loaded platforms. No spatial filtering.

#### 1e. Player-Pickup / Player-Crate / Player-Shrine
**File:** `game3d.js` lines 3769-3925

- All use sphere-based distance checks (squared distance < threshold).
- Crates: distSq < 1.44 (1.2 unit radius) + height gate.
- Items: distSq < 2.25 (1.5 unit radius) + height gate.
- Shrines: distSq < shrineRng^2 + height gate.
- All are O(K) loops where K = count of that entity type (typically < 30).

### Known Issues and Edge Cases

1. **Enemies freely overlap the player.** There is no player-enemy separation force. Enemies can pile up on top of the player, which is explicitly called out in the design plan as something that should NOT happen ("No unit merging. Animals and zombies cannot occupy the same space.").

2. **Enemies only push each other apart during merge checks.** The push-apart only happens when two enemies are close enough to merge AND they are different tiers or max tier. Same-tier enemies that haven't quite reached merge distance don't push apart at all -- they just walk through each other toward the player.

3. **No player-decoration collision.** Trees, rocks, and cacti are visual only. The player and enemies walk straight through them.

4. **No player-wall collision.** Map boundary is enforced by clamping coordinates, not by collision. Stone wall meshes at the edges are purely visual.

5. **Platform collision is one-directional.** You can jump up through a platform from below. This is intentional for platformer feel but would be wrong for solid architecture (buildings, rooftops).

---

## 2. Terrain/Physics Model Interactions

### Terrain Height System

**File:** `game3d.js` lines 792-823

The terrain uses a **3-octave noise function** to compute height at any (x, z) position:

```js
function terrainHeight(x, z) {
    return smoothNoise(x, z, 12) * 2 + smoothNoise(x, z, 6) * 1 + smoothNoise(x, z, 3) * 0.3;
}
```

- Height range: approximately 0 to 3.3 world units.
- The noise function is **deterministic** (seeded sine hash), so height is consistent for any position.
- `terrainHeight()` is called **frequently** -- during spawning, enemy movement, XP gem bobbing, crate placement, and multiple times in the player physics step. Each call evaluates `smoothNoise()` 3 times, each of which calls `noise2D()` 4 times (bilinear interpolation), totaling 12 `noise2D()` calls per `terrainHeight()` invocation.

### Gravity and Ground Following

**Player gravity** (lines 2835-2884):
- Euler integration: `playerVY -= GRAVITY_3D * dt; playerY += playerVY * dt;`
- Ground clamped with `GROUND_OFFSET = 0.55` above terrain height.
- Three separate ground-clamp checks in sequence (ground collision, platform collision, min height clamp, plus a per-frame Y clamp). This redundancy suggests past bugs with clipping.

**Enemy ground following** (lines 3455-3482):
- Enemies that aren't jumping simply snap to terrain height each frame: `e.group.position.y = eh;`
- No gravity for ground-following enemies -- they teleport to the correct height.
- Jumping enemies use gravity and also check platform collision (same O(P) loop as player).

### Slope Handling

There is **no slope-aware movement.** Movement speed is constant regardless of terrain angle. The player moves at the same speed going uphill, downhill, or on flat ground. The height changes are cosmetic -- the Y position adjusts to match terrain height, but XZ velocity is unaffected.

This contradicts the design plan's vision: "Running downhill accelerates you. Running uphill slows you. Launching off a ramp at speed sends you soaring."

### Platform System

Platforms are simple box objects floating 2-4 units above terrain:
- Size: 2-4 units wide and deep, 0.4 units thick.
- No ramps, no slopes, no connection between platforms.
- Only top-surface collision. No side walls, no underside.
- Enemies can jump to platforms with a tier-based probability.

### What Will Break

The planned features that will stress this system:

| Planned Feature | Current Support | Impact |
|---|---|---|
| Hills with real slopes | Height exists, no slope physics | Requires velocity projection onto slope normals |
| Cliffs with drop-offs | No cliff detection | Need edge detection + fall damage |
| Ramps as launchers | No ramp geometry | Requires inclined surfaces with velocity redirection |
| Multi-level buildings | One-way platforms only | Need full solid-body collision for walls, floors, ceilings |
| Rooftop access | Platforms are floating boxes | Need stairways, ladders, or jump-to mechanics |
| Destructible terrain | Noise function is read-only | Need runtime terrain modification or decal system |
| Water/mud zones | No surface type system | Need per-region material properties |

---

## 3. Movement and Pathfinding

### Enemy Navigation

**File:** `game3d.js` lines 3415-3436

```js
const dx = st.playerX - e.group.position.x;
const dz = st.playerZ - e.group.position.z;
const dist = Math.sqrt(dx * dx + dz * dz);
if (dist > 0.01) {
    const nx = dx / dist;
    const nz = dz / dist;
    const eSpd = e.speed * st.totemSpeedMult;
    e.group.position.x += nx * eSpd * dt;
    e.group.position.z += nz * eSpd * dt;
```

This is **pure bee-line navigation**. Every enemy computes a direct vector from its position to the player and moves along it. There is:

- **No obstacle avoidance.** Enemies walk straight through trees, rocks, shrines, totems, crates, and other decorations.
- **No pathfinding.** No A*, no navmesh, no waypoints.
- **No steering behaviors.** No separation force between enemies (except during merge checks). No flocking, no lane formation.
- **No terrain awareness.** Enemies don't know about cliffs, water, walls, or elevation changes. They just bee-line and snap to terrain height.

### What Will Break

This works because the current terrain is gently rolling hills with no impassable obstacles. The moment any of these features are added, enemies will break:

- **Walls/fences (Suburbia biome):** Enemies will walk through them or get stuck on the wrong side.
- **Water/mud (Swamp biome):** Enemies need to decide whether to go around or through.
- **Cliffs/elevation gaps:** Enemies will walk off cliffs and teleport to the ground below (currently this is harmless since they just snap to terrain height, but with real cliff physics it would look wrong).
- **Chokepoints (Zoo cages):** Without pathfinding, enemies will pile up at the edge of obstacles rather than navigate around them.

### Player Movement

Player movement is simple axis-aligned input with normalization:

```js
let mx = 0, mz = 0;
if (keys3d['KeyW']) mz = -1;
if (keys3d['KeyS']) mz = 1;
// ... normalize if diagonal ...
st.playerX += mx * speed * dt;
st.playerZ += mz * speed * dt;
```

- No acceleration/deceleration curve. Movement is instant start/stop.
- No collision with any world geometry (except terrain height and platforms).
- Map boundary is a coordinate clamp, not a collision.

---

## 4. Projectile Physics

### Weapon Projectile Movement

**File:** `game3d.js` lines 2416-2467

All projectiles move in **2D (XZ plane) only.** There is no Y-axis projectile physics.

```js
// Linear projectiles (boneToss, fireball):
p.mesh.position.x += p.vx * dt;
p.mesh.position.z += p.vz * dt;

// Boomerang (arc path):
p.elapsed += dt;
const t = p.elapsed / 1.2;
const outDist = p.speed * Math.sin(Math.min(t, 1) * Math.PI);
p.mesh.position.x = p.startX + Math.sin(p.angle + t * 4) * outDist;
p.mesh.position.z = p.startZ + Math.cos(p.angle + t * 4) * outDist;
```

### Projectile Types

| Type | Movement | Hit Detection | Y-Axis | Arc/Gravity |
|---|---|---|---|---|
| Bone Toss | Linear XZ, speed 12 | Sphere r=1.095 | Fixed at spawn Y | No |
| Fireball | Linear XZ, speed 10 | Sphere r=1.095, explodes | Fixed at spawn Y | No |
| Boomerang | Sine-arc XZ path | Sphere r=1.095, piercing | Fixed at spawn Y | No |
| Banana Cannon | Linear XZ, speed 15 | Sphere r=1.0, piercing | Fixed at spawn Y | No |
| Poison Cloud | Stationary | Sphere radius (effect) | At terrain height | N/A |

### Issues

1. **No arc/gravity projectiles.** The plan calls for "Mud Bomb -- Lobs an arcing projectile that explodes on impact." No lob/arc exists in the current system.

2. **No Y-axis awareness for hits.** Projectile-enemy collision checks only XZ distance. A projectile at ground level will "hit" a zombie standing on a platform 4 units above it, because the Y positions are never compared.

3. **Discrete hit detection.** No swept/continuous collision. At the current speeds (10-15 units/s with dt capped at 0.05s = 0.5-0.75 units/frame against a 1.1-unit radius), tunneling is unlikely but possible with faster projectiles.

4. **No projectile-terrain interaction.** Projectiles never collide with terrain or platforms. A fireball shot at a wall will pass through it and hit enemies on the other side.

---

## 5. Other Areas Worth Scrutinizing

### 5a. Animation System

**Current state:** Purely procedural. No skeleton, no bones, no keyframes, no animation clips.

All animation is done by moving child mesh positions/rotations in the game loop:

```js
// Walk animation (player, lines 2920-2928):
const legSwing = Math.sin(walkPhase) * 0.5;
if (legs[0]) legs[0].position.z = legSwing * 0.25;

// Enemy walk (lines 3483-3490):
e.walkPhase += dt * e.speed * 3;
const armSwing = Math.sin(e.walkPhase) * 0.4;
if (e.armL) e.armL.position.z = 0.15 + armSwing * 0.3;
```

**Limitations:**
- Cannot express complex animations (attack wind-ups, dodge rolls, death animations).
- No animation blending or transitions.
- Adding new animations requires manual code for each one.
- No animation system at all for enemies (they only have walk and hurt flash).

**Breaking point:** The plan calls for "telegraphed attack patterns" on bosses, "ragdoll physics" on banana peel slips, and "pratfall with full ragdoll." None of this is achievable with the current sine-wave position offsets.

### 5b. Particle System

**Current state:** Ad-hoc individual mesh objects added/removed from the scene.

Every particle is a separate Three.js Mesh with its own geometry and cloned material:

```js
const fp = new THREE.Mesh(fireGeo, fireMat.clone());
fp.material.color.setHex(0xff6600);
scene.add(fp);
fireParticles.push({ mesh: fp, life: 0.5 });
```

**Issues:**
- **Material cloning on every particle.** `fireMat.clone()` creates a new material object for each particle. With fire aura spawning particles at 30% chance per frame at 60fps, that's ~18 material allocations per second during Race Car.
- **Individual scene.add/remove per particle.** Each add/remove dirties the scene graph.
- **GC pressure.** Each disposed particle calls `geometry.dispose()` and `material.dispose()`, but the JS object itself becomes garbage.
- **No batching.** The shared `fireGeo` geometry is good, but without InstancedMesh the renderer makes a separate draw call per particle.

**At scale:** During a Bomb Trail + Fire Aura + Lightning Shield scenario, the fire particle array could easily hold 50-100 active particles, each a separate draw call. Combined with enemies (each 15-30+ meshes in their group), projectiles, and terrain, the draw call count becomes the primary GPU bottleneck.

### 5c. Camera System

**Current state:** Fixed-angle top-down follow camera (lines 3964-3971):

```js
camera.position.x += (camTargetX - camera.position.x) * 0.05;
camera.position.z += (camTargetZ - camera.position.z) * 0.05;
camera.position.y += (camTargetY - camera.position.y) * 0.05;
camera.lookAt(st.playerX, st.playerY, st.playerZ);
```

- Smooth follow with lerp factor 0.05 (quite laggy -- takes ~60 frames to settle).
- Fixed offset: Y+18, Z+14 above/behind player.
- No camera collision with terrain or objects.
- No rotation (plan calls for "rotatable camera").
- No zoom control.

**Breaking point:** The plan states "isometric camera (rotatable, character-centered)." A rotatable camera immediately requires camera-terrain collision detection to prevent the camera from going inside hills or buildings. This doesn't exist.

### 5d. LOD (Level of Detail)

**Current state:** None. Every enemy renders all of its child meshes regardless of distance to camera.

A Tier 10 Overlord enemy has approximately 35+ individual meshes (body, head, eyes, mouth, teeth, arms, hands, claws, legs, feet, shoulder pads, horns, spine ridges, aura particles, crown of fire). At 60 enemies on screen, that's 2,100+ meshes just for enemies.

The zombie merge system acts as an organic LOD: many small zombies merge into fewer large ones. This is good design. But it doesn't solve the problem of 50+ surviving tier-1 shamblers each being 15-mesh groups.

### 5e. Draw Call Optimization

**Current state:** No optimization. Every mesh is an individual draw call.

Sources of draw calls per frame (typical mid-game):
- Terrain chunks: ~80 meshes (9x9 chunk grid)
- Platforms: ~100 meshes
- Decorations (trees = 2 meshes each, rocks = 1): ~200 meshes
- Shrines: ~4 meshes each * ~10 = 40
- Enemies: ~20 meshes avg * ~80 enemies = 1,600
- Player: ~30 meshes
- Projectiles: ~10-30 meshes
- Particles: ~20-100 meshes
- XP gems: ~30-100 meshes

**Estimated total: 2,100-2,400+ draw calls** in a busy mid-game scene.

WebGL on desktop can handle 2,000-5,000 draw calls at 60fps. On mobile or integrated GPUs, the limit is more like 500-1,000. The game is already near the draw call ceiling for weaker hardware.

### 5f. Audio

**Current state:** Zero audio implementation. No sound system of any kind.

The design plan makes audio a core feature ("every sound effect performed by a child's voice"). Implementing spatial audio with Three.js's AudioListener/PositionalAudio is straightforward for basic cases but becomes complex with many simultaneous sources (50+ zombies gargling).

### 5g. Network Sync (Multiplayer)

**Current state:** Not designed for networking at all.

The closure-based architecture with mutable state (`st` object) and direct Three.js position manipulation is fundamentally single-player. Adding multiplayer would require:
- Extracting game state from the rendering closure
- Implementing state serialization
- Deterministic physics (current noise-based terrain is deterministic, which helps)
- Input prediction and rollback
- Authority model for collision resolution

This is effectively a full rewrite of the game loop.

### 5h. Save/Load State

**Current state:** Only leaderboard data is persisted (localStorage). No mid-run save/load.

The `st` object has ~100 properties including arrays of complex objects (enemies with Three.js groups, weapon projectiles with meshes). Serializing this for save/load would require separating state from rendering objects, which the current architecture intentionally avoids.

---

## 6. Forecasted Breaking Points

Each system is rated by when it breaks relative to the planned features, and whether it can be patched or requires structural change.

### 6a. Enemy-Enemy Collision Performance

| Aspect | Assessment |
|---|---|
| **Breaks when** | Enemy count regularly exceeds 150-200 (wave events + ambient spawns + high-tier zombies surviving) |
| **Triggered by** | Wave event scaling, co-op mode (more spawns), larger arenas |
| **Can it be patched?** | Yes -- add spatial hash grid. Drop-in replacement for the nested loop. |
| **Risk** | **HIGH** -- This is the most likely performance bottleneck to hit first |
| **Estimated effort** | 2-4 hours for a spatial hash; no architectural change needed |

### 6b. Player-Enemy Collision Response (No Push-Back)

| Aspect | Assessment |
|---|---|
| **Breaks when** | The design plan's "no unit merging" rule is enforced |
| **Triggered by** | Any attempt to make positioning tactical ("back against a wall = dangerous") |
| **Can it be patched?** | Yes -- add separation force in the enemy AI loop |
| **Risk** | **HIGH** -- The plan explicitly mandates this as "non-negotiable" |
| **Estimated effort** | 1-2 hours for basic push-back; more for robust crowd simulation |

### 6c. No Pathfinding

| Aspect | Assessment |
|---|---|
| **Breaks when** | Impassable terrain is added (walls, water, cliffs, buildings) |
| **Triggered by** | Suburbia biome (fences, houses), Zoo (cages), any biome with walls |
| **Can it be patched?** | Partially -- navmesh or flow field for procedural terrain is complex |
| **Risk** | **CRITICAL** -- Every planned biome has obstacles. Without pathfinding, none of them work. |
| **Estimated effort** | 2-4 days for a navmesh system; ongoing maintenance as terrain features change |

### 6d. No Slope Physics

| Aspect | Assessment |
|---|---|
| **Breaks when** | Ramps and momentum physics are implemented |
| **Triggered by** | "Running downhill accelerates you. Launching off a ramp sends you soaring." |
| **Can it be patched?** | Yes -- compute terrain gradient, project velocity onto surface normal |
| **Risk** | **MEDIUM** -- Core to the game's feel but can be faked with simple gradient math |
| **Estimated effort** | 4-8 hours for basic slope acceleration; more for proper ramp launching |

### 6e. No Knockback Physics

| Aspect | Assessment |
|---|---|
| **Breaks when** | Lion's roar, knockback abilities, banana peel physics |
| **Triggered by** | The plan's "Knockback respects geometry. They hit walls and stop. They tumble down slopes." |
| **Can it be patched?** | Partially -- requires both impulse velocities on enemies AND collision with terrain features |
| **Risk** | **HIGH** -- Multiple core abilities rely on knockback + terrain interaction |
| **Estimated effort** | 1-2 days for knockback impulses; more for wall collision + slope tumbling |

### 6f. Projectile Y-Axis Blindness

| Aspect | Assessment |
|---|---|
| **Breaks when** | Multi-level terrain or verticality matters for combat |
| **Triggered by** | Platforms, rooftops, elevated safe zones |
| **Can it be patched?** | Yes -- add Y distance check to projectile-enemy collision |
| **Risk** | **MEDIUM** -- Current platforms are few enough that this rarely matters |
| **Estimated effort** | 30 minutes |

### 6g. Animation System Limitations

| Aspect | Assessment |
|---|---|
| **Breaks when** | Boss attack telegraphs, death animations, ability wind-ups |
| **Triggered by** | Mega Zombie boss patterns, ragdoll effects, any character animation beyond walking |
| **Can it be patched?** | No -- needs a real animation system (keyframe or state machine) |
| **Risk** | **HIGH** -- Bosses require telegraphed attacks; these need real animation |
| **Estimated effort** | 2-4 days for a basic keyframe animation system |

### 6h. Draw Call Ceiling

| Aspect | Assessment |
|---|---|
| **Breaks when** | Enemy count + decoration count + particle count exceeds GPU draw call budget |
| **Triggered by** | Late-game scenarios, splitscreen co-op (2x-4x rendering), mobile targets |
| **Can it be patched?** | Partially -- InstancedMesh for enemies, geometry merging for terrain |
| **Risk** | **HIGH** for Switch/mobile targets; **MEDIUM** for desktop browser |
| **Estimated effort** | 2-4 days for enemy instancing; ongoing for other optimizations |

### 6i. Camera Rotation + Collision

| Aspect | Assessment |
|---|---|
| **Breaks when** | Rotatable camera is added |
| **Triggered by** | "Isometric camera (rotatable, character-centered)" |
| **Can it be patched?** | Yes -- raycasting against terrain for camera collision |
| **Risk** | **LOW** -- Standard technique, well-documented |
| **Estimated effort** | 4-8 hours |

### 6j. Multiplayer / Co-op

| Aspect | Assessment |
|---|---|
| **Breaks when** | Any form of multiplayer is attempted |
| **Triggered by** | "Local splitscreen co-op is a launch feature, not a post-launch add." |
| **Can it be patched?** | Local splitscreen can be patched (duplicate renderer, shared state). Online requires architecture change. |
| **Risk** | **CRITICAL** for the plan's scope; **MEDIUM** if scoped to local only |
| **Estimated effort** | 1-2 weeks for local splitscreen; 2+ months for online co-op |

### Risk Summary

| Risk Level | Systems |
|---|---|
| **CRITICAL** | Pathfinding (blocks all biome work), Multiplayer (blocks co-op) |
| **HIGH** | Enemy collision performance, Player-enemy push-back, Knockback physics, Animation system, Draw calls |
| **MEDIUM** | Slope physics, Projectile Y-axis, Camera collision |
| **LOW** | Camera rotation (straightforward), Save/load (not urgently needed) |

---

## 7. Open-Source Engine Options

If the DIY approach becomes untenable, here are the realistic migration targets evaluated against the project's needs.

### 7a. Babylon.js

| Factor | Assessment |
|---|---|
| **Preserves existing work** | Highest of any option. Same language (JS/TS), same platform (browser), same paradigm (scene graph). Many Three.js concepts map directly. |
| **Physics** | Built-in physics engine integration (Cannon.js, Oimo.js, Ammo.js/Havok). Collision groups, raycasting, triggers, all built-in. |
| **Platform support** | Browser (desktop + mobile), WebXR, can be wrapped in Electron/Capacitor for desktop/mobile apps. No native Switch export. |
| **Rendering** | More advanced than Three.js: PBR pipeline, GPU particles, instancing, LOD, occlusion culling, shadows all built-in. |
| **Multiplayer** | No built-in networking, but architecture supports it better than raw Three.js. |
| **Migration effort** | **2-4 weeks.** Renderer and scene setup change; game logic can largely stay. The closure architecture is engine-agnostic. |
| **Switch support** | No. Would need a separate native port. |

### 7b. PlayCanvas

| Factor | Assessment |
|---|---|
| **Preserves existing work** | Good. JavaScript, browser-based, component-entity architecture. Game logic would need restructuring from closure to ECS. |
| **Physics** | Built-in Ammo.js integration. Full rigid body physics, triggers, raycasting. |
| **Platform support** | Browser, with publishing tools for web and mobile. No native Switch. |
| **Rendering** | Production-grade: batching, instancing, LOD, clustered lighting. Built for performance. |
| **Editor** | Cloud-based visual editor. Major productivity boost for level design. |
| **Migration effort** | **3-5 weeks.** Architecture change required (closure to components). |
| **Switch support** | No native export. |

### 7c. Godot

| Factor | Assessment |
|---|---|
| **Preserves existing work** | Low. Different language (GDScript/C#), different paradigm (node tree). All rendering and physics code would be rewritten. Game design and balancing data can transfer. |
| **Physics** | Excellent built-in 3D physics (Jolt backend in 4.x). Collision shapes, areas, raycasting, CharacterBody3D with built-in slope/stair handling. |
| **Platform support** | Best of any option: Windows, Mac, Linux, iOS, Android, and **Nintendo Switch** (via officially licensed third-party tools like Lone Wolf Technology). Also HTML5 export. |
| **Rendering** | Vulkan/OpenGL renderer. Forward+ and mobile renderers. Particle GPU, LOD, occlusion culling, all built-in. |
| **Animation** | Full animation system: AnimationPlayer, AnimationTree, blend spaces, state machines. |
| **Multiplayer** | Built-in high-level multiplayer API with RPCs and state sync. |
| **Migration effort** | **2-3 months.** Full rewrite of rendering and physics. Game design transfers; code does not. |
| **Switch support** | **Yes** -- the only option on this list with a realistic Switch export path. |

### 7d. Bevy (Rust)

| Factor | Assessment |
|---|---|
| **Preserves existing work** | Lowest. Different language (Rust), steep learning curve, ECS paradigm. |
| **Physics** | Via bevy_rapier (excellent). |
| **Platform support** | Windows, Mac, Linux, WASM (browser). Mobile experimental. No Switch. |
| **Migration effort** | **4-6 months.** Language change + paradigm change + ecosystem learning. |
| **Verdict** | Not recommended for this project. The developer productivity loss from Rust's learning curve outweighs the performance benefits for a game of this scope. |

### 7e. Phaser

| Factor | Assessment |
|---|---|
| **Preserves existing work** | Medium. JavaScript, browser-based. |
| **3D support** | Phaser is 2D-only. Not viable for the 3D mode. |
| **Verdict** | Not applicable. |

### Recommendation Matrix

| Priority | Best Option | Rationale |
|---|---|---|
| Stay in browser, minimize migration effort | **Babylon.js** | Closest to Three.js, same language, built-in physics |
| Target Switch as a platform | **Godot** | Only engine with a viable Switch export pipeline |
| Maximize long-term flexibility | **Godot** | Best all-around platform coverage, built-in everything |
| Keep DIY as long as possible | **Stay on Three.js + add libraries** | See section 8 |

---

## 8. Recommended DIY Survival Strategy

The following is a prioritized list of libraries and techniques that extend the viability of the current DIY Three.js approach. Each item estimates how much time it buys before the next intervention is needed.

### Priority 1: Spatial Hash Grid for Collision (Buys 6-12 months)

**Problem it solves:** The O(N^2) enemy-enemy collision loop.

**What to do:** Implement a 2D spatial hash grid that divides the world into cells (e.g., 4x4 world units each). Each frame, bucket enemies by cell. Only check collisions between enemies in the same or adjacent cells.

**Implementation:** ~100-150 lines of code. No library needed.

```js
class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }
    clear() { this.cells.clear(); }
    insert(entity) {
        const key = this._key(entity.group.position.x, entity.group.position.z);
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(entity);
    }
    query(x, z, radius) {
        const results = [];
        const minCX = Math.floor((x - radius) / this.cellSize);
        const maxCX = Math.floor((x + radius) / this.cellSize);
        const minCZ = Math.floor((z - radius) / this.cellSize);
        const maxCZ = Math.floor((z + radius) / this.cellSize);
        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cz = minCZ; cz <= maxCZ; cz++) {
                const cell = this.cells.get(`${cx},${cz}`);
                if (cell) results.push(...cell);
            }
        }
        return results;
    }
    _key(x, z) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    }
}
```

This also accelerates `findNearestEnemy()`, projectile-enemy checks, and AoE damage calculations.

**Impact:** Reduces collision from O(N^2) to O(N * K) where K is the average number of enemies per cell neighborhood (~4-12). Enables 500+ enemies without frame drops.

### Priority 2: Player-Enemy and Enemy-Enemy Separation Forces (Buys 3-6 months)

**Problem it solves:** Enemies stacking on the player and on each other.

**What to do:** After the spatial hash is in place, add a separation force in the enemy AI loop. For each enemy, query nearby enemies and the player, compute overlap, and push apart.

**Implementation:** ~50 lines in the enemy AI loop, using the spatial hash for neighbor queries.

**Impact:** Fulfills the plan's "no unit merging" requirement. Makes positioning tactical.

### Priority 3: InstancedMesh for Enemies and XP Gems (Buys 6-12 months)

**Problem it solves:** Draw call ceiling.

**What to do:** Replace individual enemy meshes with Three.js InstancedMesh. All tier-1 enemies share one InstancedMesh, tier-2 another, etc. XP gems already share geometry but need instancing.

**Implementation:** Significant refactor of `createEnemy()` and the enemy rendering approach. Each tier becomes an InstancedMesh with a matrix buffer updated per frame. ~300-500 lines of code change.

**Impact:** Reduces enemy draw calls from ~1,600 (80 enemies * 20 meshes) to ~10 (one InstancedMesh per tier * 10 tiers). Enables 200+ enemies on mobile GPUs.

### Priority 4: Simple Slope Physics (Buys 3-6 months)

**Problem it solves:** Flat-feeling movement on rolling terrain.

**What to do:** Compute terrain gradient at the player's position using finite differences:

```js
function terrainGradient(x, z) {
    const h = 0.1;
    const dhdx = (terrainHeight(x + h, z) - terrainHeight(x - h, z)) / (2 * h);
    const dhdz = (terrainHeight(x, z + h) - terrainHeight(x, z - h)) / (2 * h);
    return { dhdx, dhdz };
}
```

Use the gradient magnitude to scale movement speed (slower uphill, faster downhill) and detect steep slopes for ramp launching.

**Implementation:** ~30-50 lines. No library needed.

**Impact:** Addresses the plan's momentum physics vision without a full physics engine.

### Priority 5: Rapier.js for Physics (Buys 12-24 months)

**Problem it solves:** Everything -- collision shapes, rigid bodies, raycasting, triggers, character controllers, knockback physics.

**Library:** [@dimforge/rapier3d-compat](https://github.com/dimforge/rapier.rs) (WASM-based, ~300KB, zero dependencies, Apache 2.0 license).

**What to do:** Replace the DIY collision checks with Rapier rigid bodies. Keep Three.js for rendering. This is the "add a physics library" approach that gives the most capability for the least architectural change.

**Integration pattern:**
1. Create Rapier colliders for the player (capsule), enemies (capsules), terrain (heightfield), platforms (boxes), and walls (boxes).
2. Each frame: step the Rapier physics world, then sync Three.js positions from Rapier body positions.
3. Use Rapier's contact events for damage triggers instead of manual distance checks.
4. Use Rapier's character controller for player movement with built-in slope/stair handling.

**Implementation:** ~2-3 days for basic integration. Ongoing effort to migrate each collision system.

**Impact:** Solves collision, knockback, slope physics, wall collision, projectile-terrain interaction, and camera collision all at once. This is the single highest-leverage library addition possible.

### Priority 6: Navigation (Flow Field or NavMesh) (Buys 6-12 months)

**Problem it solves:** Enemy pathfinding around obstacles.

**Options:**
- **Flow field:** Best for horde games. Compute a flow field from a grid of the map where each cell points toward the player. Enemies follow the flow. Updates when the player moves significantly. Works with procedural terrain.
- **Recast/Detour (via recast-navigation-js):** NavMesh library ported to WASM. More robust but more complex to integrate with procedural terrain.
- **Simple steering behaviors:** Cheaper alternative -- obstacle avoidance raycasts + separation + seek. Not true pathfinding but handles simple obstacles.

**Recommendation:** Start with a flow field. It's simpler than navmesh, works well with large enemy counts, and integrates naturally with the existing chunk system (each chunk could have a pre-computed flow field that's updated when the player enters).

**Implementation:** ~1-2 days for a basic flow field. More for dynamic obstacle support.

### Priority 7: Basic Animation System (Buys 3-6 months)

**Problem it solves:** Boss telegraphs, death animations, ability wind-ups.

**What to do:** Build a minimal keyframe animation system:

```js
class AnimClip {
    constructor(tracks) { this.tracks = tracks; this.duration = ...; }
}
class AnimMixer {
    play(clip) { ... }
    update(dt) { /* interpolate between keyframes */ }
}
```

Each track targets a mesh property (position.y, rotation.x, scale.x) with keyframe values and times. The mixer interpolates between keyframes using lerp/slerp.

**Implementation:** ~200-300 lines for a basic system.

**Impact:** Enables boss attack telegraphs, death animations, and ability wind-ups without switching engines.

### Prioritized Timeline

| Order | Task | Effort | Buys | Cumulative Time Bought |
|---|---|---|---|---|
| 1 | Spatial hash grid | 4 hours | 6-12 months | 6-12 months |
| 2 | Separation forces | 2 hours | 3-6 months | 9-18 months |
| 3 | Projectile Y-axis fix | 30 minutes | 2-3 months | 11-21 months |
| 4 | Simple slope physics | 4 hours | 3-6 months | 14-27 months |
| 5 | InstancedMesh for enemies | 2-3 days | 6-12 months | 20-39 months |
| 6 | Basic animation system | 2-3 days | 3-6 months | 23-45 months |
| 7 | **Decision point:** Rapier.js OR engine migration | -- | -- | -- |

At the decision point (~6-12 months from now, based on feature velocity), evaluate whether the remaining plan requirements (knockback + terrain, full pathfinding, multiplayer, Switch export) justify staying DIY+Rapier or migrating to Godot.

### The Strategic Decision

The DIY+Rapier path can likely sustain the project through:
- 4+ biomes with obstacles
- 200+ enemy counts
- Boss fights with telegraphed attacks
- Slope and ramp physics
- Camera rotation
- Basic knockback

It will NOT sustain:
- True ragdoll physics
- Nintendo Switch export
- Online multiplayer
- Splitscreen co-op (possible but very painful)
- Complex pathfinding in dense obstacle environments

If the plan's vision is the full destination (Switch + co-op + 7 biomes + ragdoll), the engine migration to Godot is inevitable. The question is timing: migrate now (lose 2-3 months but gain a solid foundation) or extend DIY for 12-18 months while the game design matures, then migrate once the design is locked.

**Recommendation:** Extend DIY. The game's design is still evolving. Migrating now means porting features that might be cut or redesigned. The DIY survival strategy (priorities 1-6 above) buys enough time to finalize the game design on a working, playable prototype. Once the design is locked and the audience is validated (publish on itch.io, get player feedback), then migrate to Godot for the "real" version targeting Switch and console.

---

## Appendix: Code References

All line numbers reference `/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/js/game3d.js`:

| System | Lines | Description |
|---|---|---|
| Terrain height function | 792-823 | noise2D, smoothNoise, terrainHeight |
| Chunk generation | 870-905 | generateChunk with vertex displacement |
| Platform generation | 1016-1049 | generatePlatforms |
| Enemy creation (tier-based) | 1599-1744 | createEnemy with visual upgrades |
| Player-platform collision | 2857-2871 | AABB + Y-band check |
| Player ground collision | 2847-2884 | Three separate ground clamps |
| Weapon projectile collision | 2447-2466 | Sphere check, XZ only |
| Weapon effects (cloud DoT) | 2521-2566 | Per-enemy sphere check |
| Enemy AI movement | 3415-3436 | Bee-line to player |
| Enemy platform jumping | 3439-3478 | Probability-based, gravity |
| Player-enemy contact damage | 3491-3511 | Sphere + Y gate |
| Enemy-enemy merge collision | 3528-3575 | O(N^2) nested loop, sphere-sphere |
| Auto-attack targeting | 3580-3621 | Nearest enemy search |
| Power attack AoE | 3624-3693 | All enemies in range |
| Banana projectile hits | 3706-3731 | Sphere check, XZ only |
| XP gem collection | 3733-3763 | Distance check + magnet pull |
| Crate breaking | 3769-3806 | Distance + height gate |
| Camera follow | 3964-3971 | Lerp to player position |
