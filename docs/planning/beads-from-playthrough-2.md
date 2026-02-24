# Beads from Playthrough 2 Findings (BD-128 through BD-133)

**Date:** 2026-02-23
**Source:** `playwright-playthrough-2.md` (automated Playwright playthrough, 6 minutes of 3D Survivor mode, Leopard)
**Focus:** Minimap toggle robustness, plateau occlusion, early-game pacing, grass/flower visibility, wave timing

---

## Triage Notes

The following findings from playthrough 2 were **skipped** (not converted to beads) for the reasons listed:

| Finding | Reason Skipped |
|---------|----------------|
| BUG-NEW-2 (Mode select shows 2D canvas) | Not a real bug. The code at `js/game.js:364-366` properly sets `gameState = '3dMode'`, stops the 2D game loop via `stopGameLoop()`, and hides the 2D canvas via `canvas.style.display = 'none'` before calling `launch3DGame()`. The Playwright script's timing between key presses caused it to screenshot during the transition. Not reproducible in normal play. |
| BUG-NEW-4 (Level-up menu missing "PRESS ENTER TO SELECT") | Not a bug. The text uses a blink effect (`Math.sin(Date.now() * 0.005) > 0` at `hud.js:746`), which makes it visible ~50% of the time. The screenshot captured an "off" phase. Both the upgrade menu (line 746) and charge shrine menu (line 815) use the same blinking pattern. Working as intended. |
| BD-104 (Equipment visuals not observed) | Already exists as BD-104. The playthrough confirms it is not yet implemented. |
| BD-125 (Tree sway not verified) | Already exists as BD-125. Cannot be verified from static screenshots. |
| BD-123 (Zombie death animation not verified) | Already exists as BD-123. Cannot be verified from static screenshots. |
| BD-127 (Lighting shift subtle/not observed) | Already exists as BD-127. The 6-minute playthrough window may be too short for the time-of-day shift to be visible, or BD-127 has not been implemented yet. The existing bead covers this. |
| BD-113 (Zombies blocked by terrain) | Already exists as BD-113. Cannot be verified from static screenshots. |
| BD-88 (Shrine spread across map) | Already exists as BD-88. The playthrough confirmed augments were collected (+3% Armor x2), suggesting shrines do spawn, but spatial distribution cannot be verified from screenshots. |
| BD-89 (Tree/rock overlap) | Already exists as BD-89. The overlap check system (`occupiedPositions` array in `terrain.js:563-638`) is implemented. Some clustering visible in screenshots may be within the minimum clearance distance rather than true overlaps. |
| Recommendation: Earlier second weapon (level 3-4) | Balance preference, not a bug. Second weapon slot unlocks at level 5 (`game3d.js:3222`). The playthrough reached level 5 around 2 minutes, which provides a second weapon opportunity reasonably early. The real issue is BD-110 (howls crowding out weapons in level-up choices), which already addresses weapon visibility in the upgrade pool. |
| Recommendation: Visual equipment on model (BD-104) | Already covered by BD-104. |

---

## BD-128: Minimap full-map overlay stays open through menus and obscures gameplay

**Category:** Bug — Input/UI
**Priority:** P1
**File(s):** `js/game3d.js` (line 676, `onKeyDown` Tab handler)

### Description
The Tab key toggles `st.showFullMap` at line 676 with no guard for the current game state. This means:
1. The full-map overlay can be toggled while the upgrade menu, pause menu, charge shrine menu, or game over screen is active.
2. If toggled open during a menu, it persists after the menu closes, covering 30-40% of the viewport during active gameplay.
3. The toggle fires on every Tab keydown with no debounce, making it vulnerable to rapid key events.

The playthrough showed the map getting stuck open from ~2 minutes onward, obscuring gameplay for the remaining 4 minutes.

The root cause is at `game3d.js:676`:
```js
if (e.code === 'Tab') {
  e.preventDefault();
  st.showFullMap = !st.showFullMap;
}
```
This block runs unconditionally inside `onKeyDown`, which processes all key events regardless of the current menu state.

### Fix Approach
Two changes:

1. **Guard the Tab toggle:** Only allow map toggle during active gameplay (no overlay menus open). Move the Tab handler inside the gameplay input block (after the `else if (!st.gameOver && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu)` guard at line 662), or add the same guard inline:
   ```js
   if (e.code === 'Tab') {
     e.preventDefault();
     if (!st.gameOver && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu) {
       st.showFullMap = !st.showFullMap;
     }
   }
   ```

2. **Auto-close map when menus open:** When any overlay opens (upgradeMenu, pauseMenu, chargeShrineMenu, gameOver), force `st.showFullMap = false`. Add this in:
   - `showUpgradeMenu()` at the point where `st.upgradeMenu = true`
   - The pause menu open block (line 667 where `st.pauseMenu = true`)
   - The charge shrine menu open handler
   - The game over handler

### Acceptance Criteria
- Tab key does NOT toggle the map while upgrade menu, pause menu, charge shrine menu, or game over screen is active
- Opening any overlay menu auto-closes the full-map if it was open
- Map toggle still works normally during active gameplay
- The `[TAB] Map` / `[TAB] Close Map` label updates correctly
- No state desync between `st.showFullMap` and what the HUD renders

---

## BD-129: Plateau structures fully occlude player and enemies behind them

**Category:** Bug — Visibility/Gameplay
**Priority:** P1
**File(s):** `js/game3d.js` (lines 826-897, `buildPlateauMeshes`)

### Description
Plateau structures use fully opaque `MeshLambertMaterial` for both the top surface and all side walls. When the camera is behind a tall plateau (height 3-4 units), the player and enemies are completely hidden. This creates a significant gameplay visibility problem.

BD-101 addressed map-edge boundary walls by making them semi-transparent (`transparent: true, opacity: 0.3` at line 756), but plateaus were not included in that fix. Plateaus are the primary in-map vertical structures and are far more likely to occlude the player than edge walls.

The playthrough screenshots (pt2-60s, pt2-pause) show large brown plateau blocks obscuring the player.

### Fix Approach
Implement a distance-based transparency system for plateau meshes that are between the camera and the player:

**Option A (simpler, recommended):** Make all plateau side walls semi-transparent when the player is nearby.

1. In `buildPlateauMeshes()`, tag all side wall meshes with `userData.isPlateau = true` and store a reference to the material.
2. In the main update loop (after camera position is set), add a plateau occlusion pass:
   ```js
   // For each loaded plateau, check if it's between camera and player
   for (const p of platforms) {
     if (!p.meshes) continue;
     for (const m of p.meshes) {
       if (!m.userData.isPlateau) continue;
       // Check if plateau is roughly between camera and player (Z-axis check)
       const camZ = camera.position.z;
       const playerZ = st.playerZ;
       const plateauZ = m.position.z;
       const betweenZ = (camZ > playerZ)
         ? (plateauZ > playerZ - 2 && plateauZ < camZ)
         : (plateauZ < playerZ + 2 && plateauZ > camZ);
       const dx = Math.abs(m.position.x - st.playerX);
       if (betweenZ && dx < 8) {
         m.material.transparent = true;
         m.material.opacity = 0.25;
       } else {
         m.material.transparent = false;
         m.material.opacity = 1.0;
       }
     }
   }
   ```

**Option B (simpler still):** Make all plateau side walls permanently semi-transparent like the boundary walls. Change the side wall material in `buildPlateauMeshes` to include `transparent: true, opacity: 0.5`. This is less elegant but trivially implementable.

**Recommendation:** Start with Option B for a quick fix. Option A can be a follow-up polish bead.

### Acceptance Criteria
- Plateau side walls do not fully obscure the player when the camera looks through them
- Either: plateaus are always semi-transparent (Option B), or they become transparent only when between camera and player (Option A)
- Top surface remains opaque (it's horizontal and doesn't occlude)
- Plateau visual style is still recognizable (not invisible)
- No z-fighting or rendering artifacts from transparency
- Performance impact is negligible

---

## BD-130: Early-game enemy density too low — first 1-2 minutes feel empty

**Category:** Balance — Enemy Spawning
**Priority:** P2
**File(s):** `js/game3d.js` (lines 1943-1961, `spawnAmbient`; line 3986, `ambientSpawnTimer`)

### Description
The ambient spawn system starts with a count of `4 + Math.floor(elapsedMin / 2)` enemies per spawn tick (line 1945), with ticks every 1.36 seconds (line 3986). At game start (elapsedMin = 0), this means 4 zombies spawn every 1.36 seconds at 25-35 units away. While the spawn rate sounds reasonable numerically, the combination of:
- Enemies spawning at 25-35 units distance (far from visible combat range)
- Only 4 enemies per tick at the start
- No initial burst of enemies

...means the first 1-2 minutes of gameplay feel empty, with only 1-2 zombies visible on screen at any time. The playthrough confirmed this: at pt2-60s (1 minute), only 1-2 zombie figures were visible.

BD-91 (increase spawn rates by 25%) and BD-92 (reduce wave interval by 30%) may already be implemented, but the early game still feels sparse.

### Fix Approach
Add an initial enemy burst and increase early-game spawn rates:

1. **Initial burst:** In `spawnAmbient()` or at game start, spawn an initial ring of 8-12 enemies at 15-20 units distance (closer than normal spawns) when `st.gameTime < 2` (first 2 seconds). This creates immediate engagement:
   ```js
   // In the game start setup, after first frame:
   if (st.gameTime < 0.1 && !st.initialBurstDone) {
     st.initialBurstDone = true;
     for (let i = 0; i < 10; i++) {
       const angle = (i / 10) * Math.PI * 2;
       const dist = 15 + Math.random() * 5;
       const sx = st.playerX + Math.cos(angle) * dist;
       const sz = st.playerZ + Math.sin(angle) * dist;
       st.enemies.push(createEnemy(sx, sz, 8, 1));
     }
   }
   ```

2. **Higher early count:** Change the ambient spawn count formula from `4 + Math.floor(elapsedMin / 2)` to `6 + Math.floor(elapsedMin / 1.5)` to start with 6 enemies per tick and ramp faster. This reaches the old "8 per tick" at 3 minutes instead of 8 minutes.

3. **Closer initial spawns:** For the first 2 minutes, reduce the spawn distance from `25 + random * 10` to `18 + random * 8` so enemies reach the player faster.

### Acceptance Criteria
- At least 6-8 zombies are visible on screen within the first 30 seconds of gameplay
- An initial burst of ~10 enemies spawns in a ring around the player at game start
- Early-game ambient spawn count is higher than current (at least 6 per tick)
- Late-game balance is not significantly affected (the count still caps at 10)
- Chill Mode modifier still applies on top of new rates
- The difficulty ramp still feels progressive (not front-loaded then flat)

---

## BD-131: Wave 1 duration too long — 5+ minutes for first wave transition

**Category:** Balance — Wave Pacing
**Priority:** P2
**File(s):** `js/game3d.js` (line 280, `waveEventTimer` init; line 4020, `waveEventTimer` reset)

### Description
The wave event timer initializes at 105 seconds (~1.75 minutes) for the first wave event (line 280: `waveEventTimer: 105`), and resets to 126 seconds (~2.1 minutes) for subsequent waves (line 4020: `st.waveEventTimer = 126`). However, the playthrough showed Wave 2 not starting until approximately the 5-minute mark. This suggests either:
- The `waveEventTimer` includes the 10-second warning countdown, making the actual first wave at ~1.75 minutes (which contradicts the playthrough observation), OR
- There is additional logic or the wave counter (`st.wave`) only increments on the wave event, and the displayed "WAVE 1" is the initial state before any wave event fires.

Regardless of the exact timing, the playthrough confirmed that the game felt like a single wave for 5 minutes, which is too long for a survivor-style game. In games like Vampire Survivors, waves typically advance every 1-2 minutes, providing a sense of escalation and progression.

BD-92 called for reducing wave intervals by 30%, which may have been applied (the 126-second reset could be the post-reduction value). But even with the reduction, the pace is slow.

### Fix Approach
1. **Reduce initial wave timer:** Change line 280 from `waveEventTimer: 105` to `waveEventTimer: 75` (~1.25 minutes to first wave event).

2. **Reduce wave reset timer:** Change line 4020 from `st.waveEventTimer = 126` to `st.waveEventTimer = 90` (~1.5 minutes between subsequent waves).

3. **Add visual sub-wave indicator:** In the HUD, show a progress indicator within the current wave (e.g., "WAVE 1 - 2/3" or a subtle progress bar under the wave text). This gives players a sense of escalation within each wave. In `hud.js`, near the wave display:
   ```js
   // Sub-wave progress bar
   const waveProgress = 1 - (s.waveEventTimer / 90); // 0 to 1
   ctx.fillStyle = 'rgba(255,0,0,0.3)';
   ctx.fillRect(waveX, waveY + 15, 60 * waveProgress, 3);
   ```

### Acceptance Criteria
- First wave event fires within ~1.25 minutes of game start
- Subsequent wave events fire every ~1.5 minutes
- Wave difficulty progression still scales correctly (HP, count, tier chances)
- A visual wave progress indicator appears in the HUD
- The game feels like it has noticeable escalation points every 1-2 minutes
- Chill Mode is unaffected (wave timer modifiers still apply if any exist)

---

## BD-132: Grass and flower decorations invisible at default camera distance

**Category:** Bug — Terrain/Visuals
**Priority:** P2
**File(s):** `js/3d/terrain.js` (lines 453-500, `createGrassPatch` and `createFlowerPatch`)

### Description
Grass patches and flower patches were implemented per BD-121 and BD-124, but the playthrough confirmed they are not visible at the default camera distance. The grass blades use `BoxGeometry(0.02, bh, 0.02)` where `bh` is 0.2-0.4 units (line 460). At a camera distance of 25-35 units, a 0.02-unit-wide object renders as less than 1 pixel and is invisible.

Similarly, flower stems are `BoxGeometry(0.02, stemH, 0.02)` (line 487) and flower caps are `BoxGeometry(0.06, 0.04, 0.06)` (line 496) — both too small to register visually.

The playthrough notes: "no distinct grass patches or flower clusters are visible at ground level."

### Fix Approach
Scale up grass and flower geometry to be visible at game camera distance:

1. **Grass blades:** Increase width from 0.02 to 0.08, depth from 0.02 to 0.05, and height range from 0.2-0.4 to 0.3-0.6. Also increase the cluster spread from 0.8 to 1.2 units:
   ```js
   // In createGrassPatch:
   const bh = 0.3 + Math.random() * 0.3;
   new THREE.BoxGeometry(0.08, bh, 0.05)
   // Position spread:
   m.position.set(dx + (Math.random() - 0.5) * 1.2, h + bh / 2, dz + (Math.random() - 0.5) * 1.2);
   ```

2. **Flower stems:** Increase stem width from 0.02 to 0.06, height from 0.15-0.25 to 0.25-0.45:
   ```js
   // In createFlowerPatch:
   const stemH = 0.25 + Math.random() * 0.2;
   new THREE.BoxGeometry(0.06, stemH, 0.06)
   ```

3. **Flower caps:** Increase cap size from 0.06x0.04x0.06 to 0.14x0.06x0.14:
   ```js
   new THREE.BoxGeometry(0.14, 0.06, 0.14)
   ```

4. **Spread:** Increase flower patch spread from 0.6 to 1.0 units.

The tri budget impact is minimal: grass blades go from 12 tris each to 12 tris (same box, bigger), and flower caps stay at 12 tris each.

### Acceptance Criteria
- Grass patches are clearly visible as small green tufts at the default camera distance
- Flower patches are visible as colored dots/tufts at the default camera distance
- Both still read as ground-level decorations (not oversized)
- The voxel art style is maintained (box geometry)
- No collision added (still walk-through)
- No noticeable FPS impact
- Decorations are still cleaned up on chunk unload

---

## BD-133: Plateau structures lack ramp/stair access — players may get trapped

**Category:** Enhancement — Terrain/Gameplay
**Priority:** P3
**File(s):** `js/game3d.js` (lines 899+, plateau generation and collision logic)

### Description
The playthrough showed large plateau structures (height 1-4 units) as prominent terrain features. While the player can jump (SPACE key), the jump height may not be sufficient to reach taller plateaus (height 3-4). Players who walk off a plateau or approach one from the side have no way to access the top surface except jumping.

Additionally, if a player lands on a tall plateau, they may not be able to descend easily to collect XP gems and items that accumulated on the ground level below.

This was not directly reported as a bug in the playthrough, but the visual prominence of plateaus combined with the lack of accessible paths suggests this will become a friction point as gameplay becomes more complex.

### Fix Approach
Add simple ramp or stair blocks to one side of each plateau:

1. In `buildPlateauMeshes()`, add a ramp mesh on one randomly chosen side. The ramp is a series of ascending step blocks:
   ```js
   // Pick a random side for the ramp
   const rampSide = Math.floor(noise2D(px * 7, pz * 7) * 4); // 0=N, 1=S, 2=E, 3=W
   const stepCount = Math.ceil(plateauHeight / 0.5);
   for (let s = 0; s < stepCount; s++) {
     const stepY = baseH + (s + 0.5) * (plateauHeight / stepCount);
     const stepGeo = new THREE.BoxGeometry(2, plateauHeight / stepCount, 1.5);
     // Position extends outward from the chosen side
     // ...
   }
   ```

2. Add the ramp step meshes to the plateau's meshes array for proper cleanup.

3. Add collision data for the ramp steps so the player can walk up them (push to `terrainState.colliders`).

### Acceptance Criteria
- Each plateau has a ramp or stair structure on one side
- The ramp allows the player to walk up to the plateau top without jumping
- The ramp side is deterministic per plateau (seeded by position)
- Ramp meshes use matching earth/stone colors
- Ramp collision allows walking up and down
- Enemies can also use ramps (no special AI needed, collision physics suffices)
- Ramp meshes are cleaned up with the plateau on chunk unload

---

## Parallelization Notes

### Independent (can run in parallel)
- **Batch A — Input/UI:** BD-128 (minimap toggle guard — keydown handler in game3d.js)
- **Batch B — Visibility:** BD-129 (plateau occlusion — buildPlateauMeshes + update loop in game3d.js)
- **Batch C — Spawning/Balance:** BD-130 + BD-131 (early enemy density + wave timing — spawnAmbient + waveEventTimer in game3d.js)
- **Batch D — Terrain Visuals:** BD-132 (grass/flower scaling — createGrassPatch/createFlowerPatch in terrain.js)
- **Batch E — Terrain Gameplay:** BD-133 (plateau ramps — buildPlateauMeshes in game3d.js)

### Conflict Matrix
- BD-128 touches `onKeyDown` (line 676) and menu open handlers — **NO conflict** with other beads
- BD-129 touches `buildPlateauMeshes` (lines 826-897) and the update loop — **MEDIUM conflict with BD-133** (both modify plateau meshes and the build function). Recommend same agent.
- BD-130 touches `spawnAmbient` (lines 1943-1961) and `ambientSpawnTimer` (line 3986) — **LOW conflict with BD-131** (different functions but related balance logic). Can be same agent for consistency.
- BD-131 touches `waveEventTimer` (lines 280, 4020) and HUD wave display — **LOW conflict with BD-130** (same file, different line ranges).
- BD-132 touches `createGrassPatch`/`createFlowerPatch` in `terrain.js` (lines 453-500) — **NO conflict** with other beads
- BD-133 touches `buildPlateauMeshes` in `game3d.js` — **MEDIUM conflict with BD-129** (same function)

### Recommended Batches
1. **Agent 1:** BD-128 (minimap toggle guard — isolated, quick fix)
2. **Agent 2:** BD-129 + BD-133 (plateau occlusion + ramps — both touch buildPlateauMeshes)
3. **Agent 3:** BD-130 + BD-131 (early density + wave timing — related balance systems)
4. **Agent 4:** BD-132 (grass/flower scaling — isolated in terrain.js)
