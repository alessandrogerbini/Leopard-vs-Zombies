# Sprint: BD-120 through BD-127 — Graphics Polish (from better-graphics-v0 review)

**Date:** 2026-02-23
**Source:** `better-graphics-v0.md` (Graphics Improvement Analysis)
**Focus:** Highest-impact, lowest-effort visual improvements from the S-tier and A-tier recommendations

---

## BD-120: Replace AmbientLight with HemisphereLight for natural sky-ground lighting
**Category:** Enhancement — Lighting
**Priority:** P2
**File(s):** `js/game3d.js` (line ~728)

### Description
The scene uses a flat `AmbientLight(0x667788, 0.5)` which provides uniform fill with no directional character. Replacing it with a `HemisphereLight` creates natural sky-ground color bleeding for zero performance cost. Objects lit from above get a sky-blue tint; undersides pick up green from the ground. This is the single highest impact-to-effort ratio change in the entire graphics review.

### Fix Approach
In `launch3DGame()`, find the ambient light creation (~line 728):
```js
// Replace this:
const ambientLight = new THREE.AmbientLight(0x667788, 0.5);
// With this:
const ambientLight = new THREE.HemisphereLight(0x87CEEB, 0x4a8c3f, 0.6);
```
- Sky color `0x87CEEB` matches the existing clear/fog color
- Ground color `0x4a8c3f` matches the terrain green
- Intensity 0.6 is slightly higher than current 0.5 to compensate for the directional falloff
- The variable name `ambientLight` can stay the same since `HemisphereLight` drops in as a replacement
- The existing `DirectionalLight` remains unchanged as the key light

### Acceptance Criteria
- `AmbientLight` replaced with `HemisphereLight` in the scene setup
- Sky color matches clear color (0x87CEEB), ground color matches terrain (0x4a8c3f)
- Scene looks visually warmer/more natural, not washed out or too dark
- No performance regression
- Shadows still function correctly (HemisphereLight does not cast shadows, DirectionalLight still does)

---

## BD-121: Add grass patch decorations to break up flat terrain
**Category:** Enhancement — Terrain/Decorations
**Priority:** P2
**File(s):** `js/3d/terrain.js`

### Description
The flat green ground plane is the largest visible surface in the game and is visually monotonous. Adding small grass patch decorations (clusters of 3-8 thin tall boxes in varying green shades) breaks up the ground plane with minimal performance cost. This follows the existing decoration pattern in `generateChunk()`.

### Fix Approach
1. Add a `createGrassPatch(dx, dz, h, scene)` function in `terrain.js` after the existing `createStump` function (~line 395). Each grass patch is 3-8 thin boxes (`BoxGeometry(0.02, 0.2-0.4, 0.02)`) clustered within a ~0.5 unit radius. Use 4-5 green shade variants (e.g., `0x3a7a2f`, `0x4a8c3f`, `0x5a9c4f`, `0x2a6a1f`, `0x3a8a35`). Randomize height (0.2-0.4) and slight position jitter per blade. No `castShadow` on grass blades (too small to matter, saves draw calls).

2. In `generateChunk()`, after the stumps block (~line 572), add a grass patches section:
   - Spawn 3-6 grass patches per chunk using the same noise-seeded pattern as other decorations
   - Grass patches do NOT need collision checking (`isDecoPositionClear`) since they are walk-through decorations and should not push back against `occupiedPositions` or `ts.colliders`
   - Add them to `ts.decorations` so they get cleaned up with chunk unloading

3. Each patch is ~5 boxes = 60 tris. At 4 patches per chunk across 80 loaded chunks = 320 patches = ~19,200 tris. This is well within budget (current total scene is ~25,000 tris).

### Acceptance Criteria
- Grass patches appear distributed across terrain chunks
- 3-6 patches per chunk, each with 3-8 thin vertical blades
- Multiple green shade variants visible
- Grass patches do not block player or enemy movement
- Grass patches are cleaned up when chunks unload (no memory leak)
- No noticeable FPS impact

---

## BD-122: Add player idle breathing animation
**Category:** Enhancement — Animation
**Priority:** P2
**File(s):** `js/3d/player-model.js` (in `animatePlayer()`, line ~371)

### Description
When the player is stationary and not flying, the model is completely static except for the tail wag. Adding a subtle breathing/idle bob makes the character feel alive. This is ~5 lines of code in the existing `animatePlayer` function.

### Fix Approach
In `animatePlayer()` in `js/3d/player-model.js`, inside the `else` branch of the `if (st.flying)` block (the grounded animation), add an idle check when `len === 0`:

After the existing walk animation block (~line 420), add an idle-specific section:
```js
if (len === 0 && !st.flying) {
  // Idle breathing: gentle vertical bob
  const breathe = Math.sin(clock.elapsedTime * 2) * 0.02;
  group.position.y = st.playerY + breathe;
  // Subtle arm sway (slower than walk)
  if (arms[0]) arms[0].position.z = Math.sin(clock.elapsedTime * 1.5) * 0.03;
  if (arms[1]) arms[1].position.z = Math.sin(clock.elapsedTime * 1.5 + Math.PI) * 0.03;
}
```

This must be placed so it does not conflict with the existing `if (len > 0)` body bob on line 420-422. The existing code only bobs when `len > 0`, so the idle bob fills the `len === 0` case.

### Acceptance Criteria
- Player model gently bobs up/down when standing still (not flying)
- Arms have a subtle idle sway distinct from the walk swing
- Tail wag continues during idle (already present, just verify)
- Breathing stops immediately when player starts moving (walk bob takes over)
- No jitter or discontinuity when transitioning between idle and walk
- Flying pose is unaffected

---

## BD-123: Add zombie death animation (shrink + sink) instead of instant removal
**Category:** Enhancement — Animation/Combat Feel
**Priority:** P2
**File(s):** `js/game3d.js`

### Description
When zombies die, they instantly vanish via `disposeEnemy()`. This removes all visual feedback of the kill. Adding a brief death animation (shrink + sink into ground over ~0.3 seconds) before disposal provides satisfying combat feedback. The infrastructure for timed effects already exists (see `hurtTimer`, `mergeBounce`).

### Fix Approach
1. In `killEnemy()` (~line 2131), instead of calling `disposeEnemy(e)` at the end, set a death state on the enemy:
   ```js
   e.dying = true;
   e.deathTimer = 0.3; // seconds
   ```
   The enemy should stop moving, stop dealing contact damage, and stop being targetable by weapons while dying. Set `e.alive = false` so the loot/XP logic still fires immediately, but do NOT call `disposeEnemy()` yet.

2. Actually, `alive = false` is used to filter enemies out of the array on line 4913 (`if (!st.enemies[i].alive) st.enemies.splice(i, 1)`). Instead, add a new flag: keep `e.alive = true` but set `e.dying = true`. Skip dying enemies in all damage/targeting/movement/merge code (add `if (e.dying) continue;` or `if (e.dying) return;` guards at the top of the enemy update loop and in weapon targeting).

3. In the enemy update loop (~line 4230+), add a dying animation block before the movement code:
   ```js
   if (e.dying) {
     e.deathTimer -= dt;
     const t = e.deathTimer / 0.3; // 1 -> 0
     e.group.scale.setScalar(t * (e.isBoss ? BOSS_SCALE : 1));
     e.group.position.y -= dt * 2; // sink into ground
     if (e.deathTimer <= 0) {
       disposeEnemy(e);
     }
     continue; // skip all other enemy logic
   }
   ```

4. Update the splice filter on line 4913: dead enemies are now removed when `!e.alive` (set by `disposeEnemy`), which happens after `deathTimer` expires.

### Acceptance Criteria
- Zombies shrink and sink into the ground over ~0.3 seconds when killed
- XP gems and loot still drop immediately on kill (not delayed by animation)
- Dying zombies do not deal contact damage
- Dying zombies are not targeted by weapons
- Dying zombies do not participate in merge collisions
- After animation completes, Three.js resources are properly disposed (no memory leak)
- Boss zombies also play the death animation (scaled appropriately)

---

## BD-124: Add flower decorations for ground color variety
**Category:** Enhancement — Terrain/Decorations
**Priority:** P3
**File(s):** `js/3d/terrain.js`

### Description
The forest floor is entirely green. Small flower decorations (a thin stem box topped with a small colored box) add splashes of color that break up the visual monotony. Flowers are trivial to implement and follow the exact same pattern as grass patches.

### Fix Approach
1. Add `createFlowerPatch(dx, dz, h, scene)` in `terrain.js`. Each patch contains 2-4 flowers. Each flower is 2 boxes: a thin green stem (`BoxGeometry(0.02, 0.15-0.25, 0.02)`, color `0x3a7a2f`) and a small colored cap (`BoxGeometry(0.06, 0.04, 0.06)`) on top. Use 6 color variants for the cap: red `0xcc3333`, yellow `0xddcc33`, white `0xeeeedd`, blue `0x4466cc`, pink `0xdd66aa`, orange `0xdd8833`. Choose color per flower via noise.

2. In `generateChunk()`, add a flower patches section after grass patches. Spawn 1-3 flower patches per chunk. Like grass, flowers are walk-through (no collision, no `occupiedPositions` entry, no collider). Add to `ts.decorations` for cleanup.

3. Each flower is 2 boxes = 24 tris per flower, ~4 flowers per patch = ~96 tris per patch. At 2 patches per chunk across 80 chunks = 160 patches = ~15,360 tris. Well within budget.

### Acceptance Criteria
- Flower patches appear across terrain with variety of cap colors
- 1-3 patches per chunk, each with 2-4 flowers
- At least 5 distinct cap color variants
- Flowers do not block movement
- Flowers are cleaned up on chunk unload
- Visual reads as natural ground cover, not a grid

---

## BD-125: Add tree canopy sway animation (wind effect)
**Category:** Enhancement — Animation/Atmosphere
**Priority:** P3
**File(s):** `js/3d/terrain.js`, `js/game3d.js`

### Description
Trees are completely static. A very subtle canopy sway (wind effect) makes the forest feel alive. This requires rotating canopy meshes slightly per frame. The challenge is that decorations are currently position-only data in `ts.decorations[]` with no per-frame update. A lightweight approach is needed.

### Fix Approach
1. In `createTree()` in `terrain.js`, tag canopy meshes so they can be identified later. Add `mesh.userData.isCanopy = true` and `mesh.userData.windSeed = dx * 0.1` to each canopy box (the 5 `addBox` calls for canopy, NOT the trunk).

2. In `game3d.js`, in the main game loop (the `animate()` function), add a canopy sway pass that iterates `terrainState.decorations` and rotates canopy meshes:
   ```js
   // Tree sway — runs after chunk updates
   for (const deco of terrainState.decorations) {
     for (const m of deco.meshes) {
       if (m.userData.isCanopy) {
         m.rotation.z = Math.sin(clock.elapsedTime * 0.5 + m.userData.windSeed) * 0.02;
         m.rotation.x = Math.sin(clock.elapsedTime * 0.4 + m.userData.windSeed + 1.5) * 0.015;
       }
     }
   }
   ```

3. The sway is intentionally very subtle (0.02 radians = ~1 degree). At 80 chunks with ~3 trees each = ~240 trees with ~5 canopy boxes each = ~1200 meshes. The per-frame cost is 1200 sin() calls + rotation sets, which is negligible.

### Acceptance Criteria
- Tree canopies sway gently with a wind-like motion
- Each tree sways at a slightly different phase (seeded by position, not synchronized)
- Trunk does NOT sway (only canopy boxes)
- Sway amplitude is subtle (~1-2 degrees max)
- No visible popping when chunks load/unload (sway phase is deterministic from position)
- No performance regression

---

## BD-126: Add attack lunge animation for player melee/power attacks
**Category:** Enhancement — Animation/Combat Feel
**Priority:** P3
**File(s):** `js/game3d.js`, `js/3d/player-model.js`

### Description
The auto-attack and power attack currently produce damage and weapon visuals but the player model has no attack animation. Adding a quick forward lunge makes combat feel physical and impactful. The weapon system fires from `st.weapons[]` with cooldown timers. The attack animation needs a simple timer-based lean on the player model.

### Fix Approach
1. Add an `attackAnimTimer` property to the game state `st` (initialized to 0). When any weapon fires (in the weapon firing loop in the update function), set `st.attackAnimTimer = 0.15` (seconds). For power attack release, set it to `0.25` for a bigger lunge.

2. In `animatePlayer()` in `player-model.js`, add the attack lunge logic. Pass `st.attackAnimTimer` (or just check `st.attackAnimTimer > 0`). When active:
   ```js
   if (st.attackAnimTimer > 0) {
     // Forward lean: tilt the whole group forward
     const t = st.attackAnimTimer / 0.15; // 1 -> 0
     group.rotation.x = -0.2 * t; // lean forward, spring back
     // Arms reach forward
     if (arms[0]) arms[0].position.z += 0.15 * t;
     if (arms[1]) arms[1].position.z += 0.15 * t;
   } else {
     // Reset X rotation (only if not flying, which uses its own X tilt)
     if (!st.flying) group.rotation.x = 0;
   }
   ```

3. Decrement `st.attackAnimTimer -= dt` in the main update loop (where other timers are decremented), NOT in `animatePlayer`. This keeps the timer lifecycle in game3d.js.

4. Find the weapon firing point in the update loop (search for `cooldownTimer` decrement and the section that fires weapon projectiles). Set `st.attackAnimTimer = 0.15` right after a weapon fires.

### Acceptance Criteria
- Player model leans forward briefly when any weapon fires
- Power attack has a larger/longer lunge than auto weapons
- Lunge does not interfere with walk animation (additive rotation)
- Lunge does not interfere with flying pose
- Animation springs back smoothly (no snapping)
- Works for all 4 animal types

---

## BD-127: Time-of-day lighting shift over gameplay session
**Category:** Enhancement — Lighting/Atmosphere
**Priority:** P3
**File(s):** `js/game3d.js`

### Description
The lighting is static throughout the entire session. Gradually shifting fog color, clear color, and directional light color/intensity over game time creates visual variety during a 20+ minute run. This simulates a dawn-to-dusk progression using only color interpolation on existing scene properties.

### Fix Approach
1. Define a set of time-of-day color stops. Use elapsed game time (from `clock.elapsedTime` or `st.gameTime`). Suggested progression:
   - **0-3 min (Dawn):** Warm golden light. `dirLight` color shifts toward `0xffd8a0`, intensity 0.7. Fog/clear color `0xc4a882` (warm haze). Hemisphere sky `0xd4a870`.
   - **3-10 min (Midday):** Current bright look. `dirLight` color `0xffeedd`, intensity 0.9. Fog/clear `0x87CEEB`. Hemisphere sky `0x87CEEB`. (This is the existing setup.)
   - **10-18 min (Afternoon):** Slightly warmer. `dirLight` color `0xffddbb`, intensity 0.85. Fog/clear `0x7ab8d8`.
   - **18+ min (Dusk):** Orange/amber tones. `dirLight` color `0xff9955`, intensity 0.7. Fog/clear `0xcc7744`. Hemisphere sky `0xcc8855`, ground `0x3a6a2f`.

2. In the main update loop, interpolate between the current and next time-of-day stops using `THREE.Color.lerp()`. Update these properties per frame:
   - `dirLight.color`, `dirLight.intensity`
   - `scene.fog.color`, `renderer.setClearColor()`
   - `ambientLight.color` (the HemisphereLight sky color, if BD-120 is merged)

3. Store the color stop data as a simple array of `{ time, dirColor, dirIntensity, fogColor, skyColor, groundColor }` objects. Use linear interpolation between adjacent stops.

4. Performance: 3-4 `Color.lerp()` calls per frame + a `setClearColor()` call. Negligible.

### Acceptance Criteria
- Lighting visibly shifts over the course of a 20-minute session
- Dawn (warm), midday (bright), afternoon (warm), dusk (orange) are all distinguishable
- Transitions are gradual and smooth (no sudden color pops)
- Fog color stays consistent with clear color (no visible sky/fog seam)
- If HemisphereLight (BD-120) is not merged, fall back to updating AmbientLight color instead
- Game-over screen and pause menu are not affected by time-of-day colors (HUD is a separate canvas)

---

## Parallelization Notes

### Independent (can run in parallel)
- **Batch A — Lighting:** BD-120 (hemisphere light — 1 line in game3d.js lighting setup)
- **Batch B — Decorations:** BD-121 + BD-124 (grass patches + flowers — both add new functions and entries in `generateChunk` in terrain.js)
- **Batch C — Player Animation:** BD-122 + BD-126 (idle breathing + attack lunge — both modify `animatePlayer` in player-model.js)
- **Batch D — Enemy Animation:** BD-123 (zombie death — game3d.js enemy update loop + killEnemy)
- **Batch E — Atmosphere:** BD-125 + BD-127 (tree sway + time-of-day — game3d.js update loop, terrain.js userData tags)

### Conflict Matrix
- BD-121 and BD-124 both add decoration types to `terrain.js` `generateChunk` — **HIGH conflict**, same function, same insertion point. Assign to one agent.
- BD-122 and BD-126 both modify `animatePlayer()` in `player-model.js` — **MEDIUM conflict**, different code sections but same function. Assign to one agent.
- BD-125 and BD-127 both add per-frame logic to the game3d.js update loop — **LOW conflict**, different systems, but same file region. Can be separate agents if careful.
- BD-120 and BD-127 interact: BD-127's time-of-day needs to update whichever ambient light is in the scene. BD-127 spec handles both cases (hemisphere or ambient). **LOW conflict** — BD-127 should run after BD-120.

### Recommended Batches
1. **Agent 1:** BD-120 (hemisphere light — trivial, 5 min, do first)
2. **Agent 2:** BD-121 + BD-124 (grass + flowers — both terrain.js decorations)
3. **Agent 3:** BD-122 + BD-126 (idle breathing + attack lunge — both player-model.js animation)
4. **Agent 4:** BD-123 (zombie death animation — game3d.js killEnemy + update loop)
5. **Agent 5:** BD-125 + BD-127 (tree sway + time-of-day — atmosphere systems, after BD-120 merges)
