# Sprint Plan: BD-128 through BD-133

**Date:** 2026-02-23
**Source beads:** `docs/planning/beads-from-playthrough-2.md`
**Execution model:** Parallel worktree agents (3-4 batches)

---

## 1. Bead Inventory

| BD# | Priority | Category | File(s) | Key Functions / Line Ranges | Summary |
|-----|----------|----------|---------|----------------------------|---------|
| BD-128 | P1 | Bug — Input/UI | `js/game3d.js` | `onKeyDown` (L676-679), `showUpgradeMenu` (L3210-3211), pause open (L667), charge shrine open, game over handler | Minimap toggle has no menu guard; can get stuck open |
| BD-129 | P1 | Bug — Visibility | `js/game3d.js` | `buildPlateauMeshes` (L826-897), main update loop (new section after L5025) | Plateaus fully occlude player; need transparency when between camera and player |
| BD-130 | P2 | Balance — Spawning | `js/game3d.js` | `spawnAmbient` (L1943-1961), ambient spawn tick (L3982-3987), state init (L279) | Early-game too sparse; needs initial burst and higher starting count |
| BD-131 | P2 | Balance — Waves | `js/game3d.js` (L280, L4020), `js/3d/hud.js` (L123-148) | `waveEventTimer` init (L280), wave reset (L4020), HUD wave display (L123-148) | Wave 1 lasts 5+ min; shorten intervals, add progress indicator |
| BD-132 | P2 | Bug — Visuals | `js/3d/terrain.js` | `createGrassPatch` (L453-467), `createFlowerPatch` (L480-500) | Grass/flowers too small to see at camera distance; scale up geometry |
| BD-133 | P3 | Enhancement — Terrain | `js/game3d.js` | `buildPlateauMeshes` (L826-897), `generatePlatforms` (L907-954) | Plateaus lack ramps; players may get trapped on tall ones |

### Implementation Status of Prior Beads (Context)

All beads from previous sprints (BD-88 through BD-127) that were coded are **implemented and present in the codebase**. Specifically:
- BD-107 (name entry filtering), BD-109 (controls hint), BD-110 (weapon weighting), BD-111 (XP gem size/pulse), BD-112 (post-upgrade invulnerability) -- all confirmed in code
- BD-120 (HemisphereLight), BD-121/124 (grass/flowers), BD-122 (idle breathing), BD-123 (death animation), BD-125 (tree sway), BD-126 (attack lunge), BD-127 (time-of-day) -- all confirmed in code
- BD-108 (404 error) -- status unknown, no code comment found
- BD-113 (zombie terrain collision) -- listed as reopened, may still be outstanding

---

## 2. Conflict Matrix

This matrix shows which beads touch overlapping code regions. Cells show conflict level.

|        | BD-128 | BD-129 | BD-130 | BD-131 | BD-132 | BD-133 |
|--------|--------|--------|--------|--------|--------|--------|
| **BD-128** | -- | NONE | NONE | NONE | NONE | NONE |
| **BD-129** | NONE | -- | NONE | NONE | NONE | **HIGH** |
| **BD-130** | NONE | NONE | -- | **LOW** | NONE | NONE |
| **BD-131** | NONE | NONE | **LOW** | -- | NONE | NONE |
| **BD-132** | NONE | NONE | NONE | NONE | -- | NONE |
| **BD-133** | NONE | **HIGH** | NONE | NONE | NONE | -- |

### Conflict Details

- **BD-129 vs BD-133 (HIGH):** Both modify `buildPlateauMeshes()` (L826-897) and `generatePlatforms()` (L907-954). BD-129 adds transparency to side wall materials and/or adds an occlusion pass in the update loop. BD-133 adds ramp/stair meshes to the same build function. They will produce merge conflicts if done in parallel. **Must be in the same batch.**

- **BD-130 vs BD-131 (LOW):** Both touch balance-related spawn timing in game3d.js but in different function regions. BD-130 modifies `spawnAmbient()` (L1943-1961) and the spawn timer tick (L3982-3987). BD-131 modifies `waveEventTimer` init (L280) and reset (L4020). The only overlap is conceptual (both affect pacing). No merge conflict risk, but same agent ensures cohesive balance tuning. **Recommended same batch for coherence, not required.**

- **BD-128 (NONE):** Touches `onKeyDown` Tab handler (L676-679) and adds `st.showFullMap = false` statements in menu open handlers (L3210, L667, etc.). No other bead touches these lines.

- **BD-132 (NONE):** Isolated to `terrain.js` functions `createGrassPatch` (L453-467) and `createFlowerPatch` (L480-500). No other bead touches `terrain.js`.

---

## 3. Agent Batches

### Batch 1: UI Fix (1 agent)
**Beads:** BD-128
**Priority:** P1
**Estimated effort:** Small (15-20 min)
**Files modified:** `js/game3d.js`

### Batch 2: Plateau Improvements (1 agent)
**Beads:** BD-129 + BD-133
**Priority:** P1 + P3
**Estimated effort:** Medium (30-45 min)
**Files modified:** `js/game3d.js`

### Batch 3: Balance Tuning (1 agent)
**Beads:** BD-130 + BD-131
**Priority:** P2
**Estimated effort:** Medium (25-35 min)
**Files modified:** `js/game3d.js`, `js/3d/hud.js`

### Batch 4: Terrain Visuals (1 agent)
**Beads:** BD-132
**Priority:** P2
**Estimated effort:** Small (10-15 min)
**Files modified:** `js/3d/terrain.js`

**All 4 batches can run in parallel with zero intra-batch file conflicts** (Batches 1-3 all touch game3d.js but in non-overlapping function regions; Batch 4 only touches terrain.js).

---

## 4. Per-Batch Agent Specs

---

### Batch 1 Agent Spec: BD-128 — Minimap Toggle Guard

**Files to modify:** `js/game3d.js`

**Context:** The Tab key toggles `st.showFullMap` at line 676. This toggle fires unconditionally, even when overlay menus (upgrade, pause, charge shrine, game over) are active. If the map is open when a menu appears, it stays open after the menu closes, blocking 30-40% of the viewport.

**Changes required:**

1. **Guard the Tab handler (L676-679).** Change from:
   ```js
   if (e.code === 'Tab') {
     e.preventDefault();
     st.showFullMap = !st.showFullMap;
   }
   ```
   To:
   ```js
   if (e.code === 'Tab') {
     e.preventDefault();
     if (!st.gameOver && !st.upgradeMenu && !st.pauseMenu && !st.chargeShrineMenu) {
       st.showFullMap = !st.showFullMap;
     }
   }
   ```

2. **Auto-close map when menus open.** Add `st.showFullMap = false;` in these locations:
   - `showUpgradeMenu()` at line ~3210, after `st.upgradeMenu = true;`
   - Pause menu open at line ~667, after `st.pauseMenu = true;`
   - Charge shrine menu open -- search for `st.chargeShrineMenu = true` and add after it
   - Game over handler -- search for `st.gameOver = true` and add after it

3. **Verify** the `[TAB] Close Map` / `[TAB] Map` label in `hud.js` (L532) is driven by `s.showFullMap`, which it is. No HUD changes needed.

**Testing approach:** Start game, open full map (Tab), trigger a level-up (play until upgrade menu appears). Verify map auto-closes when upgrade menu appears. Verify Tab does nothing while upgrade menu is open. Close upgrade menu, verify Tab works again.

---

### Batch 2 Agent Spec: BD-129 + BD-133 — Plateau Occlusion and Ramps

**Files to modify:** `js/game3d.js`

**Context:** Plateaus are built by `buildPlateauMeshes()` (L826-897) and generated per chunk by `generatePlatforms()` (L907-954). Side walls use opaque `MeshLambertMaterial`. The `platforms` array (L805) stores all active plateaus with `{mesh, meshes, x, y, z, w, d}`. Plateaus are tracked per chunk in `platformsByChunk` (L806).

#### BD-129: Plateau Occlusion

**Recommended approach: Option B (simpler).** Make all plateau side walls semi-transparent.

1. In `buildPlateauMeshes()`, find the `sideMat` creation at line ~865:
   ```js
   const sideMat = new THREE.MeshLambertMaterial({ color: sideColor });
   ```
   Change to:
   ```js
   const sideMat = new THREE.MeshLambertMaterial({ color: sideColor, transparent: true, opacity: 0.55 });
   ```
   This applies to all 4 sides (front, back, left, right) for all segments.

2. The top surface material (line 832) should remain opaque (it's horizontal, never occludes the camera view).

3. Consider also setting `depthWrite: false` on the side material to avoid z-fighting with transparent overlaps, but test first -- it may cause visual issues with shadows.

**Alternative (Option A -- dynamic transparency):** If Option B looks too ghostly, implement per-frame occlusion check instead:
- Tag each side mesh: `mesh.userData.isPlateau = true`
- In the main update loop (after camera update, around L5025), add a plateau occlusion pass:
  - For each plateau in `platforms`, check if it is between the camera position and the player position on the camera-to-player line
  - If occluding: set `material.transparent = true; material.opacity = 0.25`
  - If not occluding: set `material.transparent = false; material.opacity = 1.0`
  - Use a simple bounding box check (plateau x/z vs player x/z, within the plateau's width/depth)

#### BD-133: Plateau Ramps

1. In `buildPlateauMeshes()`, after building the side walls (after the segment loop ending at L894), add a ramp section:
   - Pick a deterministic ramp side using the existing noise: `Math.floor(noise2D(px * 7, pz * 7) * 4)` for 0=front(+Z), 1=back(-Z), 2=left(-X), 3=right(+X)
   - Only add ramp for plateaus with `plateauHeight >= 2` (height-1 plateaus are short enough to jump onto)
   - Build 3-5 step boxes ascending from ground level to the top
   - Each step: `BoxGeometry(stepWidth, stepHeight, stepDepth)` where stepWidth matches the plateau dimension on the ramp side (or ~2 units if the plateau is narrow)
   - Steps extend outward from the plateau side, each progressively higher
   - Use the same `getSideColor` function for step materials

2. In `generatePlatforms()` (L907+), after the plateau is created and pushed to the array (L952-954), add the ramp step positions to `terrainState.colliders` so the player can walk up them. Each step needs a collider entry: `{ x, z, r }` where `r` is the step's effective radius for push-out collision.

3. Add ramp meshes to the `allMeshes` array (returned by `buildPlateauMeshes`) so they are disposed on chunk unload.

**Testing approach:** Load game, find a plateau with height 3+. Verify ramp is visible on one side. Walk up the ramp. Walk back down. Verify collision works (player doesn't fall through steps). Verify ramp meshes are cleaned up when the chunk unloads (walk far away and return).

---

### Batch 3 Agent Spec: BD-130 + BD-131 — Early-Game Density and Wave Timing

**Files to modify:** `js/game3d.js`, `js/3d/hud.js`

**Context:** Ambient spawning is controlled by `spawnAmbient()` (L1943-1961) called every 1.36s (L3986). Wave events use `waveEventTimer` initialized at 105 (L280) and resetting to 126 (L4020). The HUD wave display is at `hud.js:123-148`.

#### BD-130: Early-Game Enemy Density

1. **Initial burst.** Add an `initialBurstDone` flag to state init (around L280):
   ```js
   initialBurstDone: false,
   ```
   In the main update loop, before the ambient spawn section (around L3982), add:
   ```js
   if (!st.initialBurstDone) {
     st.initialBurstDone = true;
     for (let i = 0; i < 10; i++) {
       const angle = (i / 10) * Math.PI * 2;
       const dist = 15 + Math.random() * 5;
       const sx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(angle) * dist));
       const sz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(angle) * dist));
       st.enemies.push(createEnemy(sx, sz, 8, 1));
     }
   }
   ```

2. **Higher early count.** In `spawnAmbient()` (L1945), change:
   ```js
   const count = Math.min(10, 4 + Math.floor(elapsedMin / 2));
   ```
   To:
   ```js
   const count = Math.min(10, 6 + Math.floor(elapsedMin / 1.5));
   ```
   This starts at 6 (was 4) and ramps to 10 by ~6 minutes (was ~12 minutes).

3. **Closer early spawns.** In `spawnAmbient()` (L1949), change the spawn distance for the first 2 minutes:
   ```js
   const dist = (elapsedMin < 2) ? (18 + Math.random() * 8) : (25 + Math.random() * 10);
   ```

#### BD-131: Wave Timing

1. **Reduce initial wave timer.** At L280, change:
   ```js
   waveEventTimer: 105,
   ```
   To:
   ```js
   waveEventTimer: 75,
   ```

2. **Reduce wave reset timer.** At L4020, change:
   ```js
   st.waveEventTimer = 126;
   ```
   To:
   ```js
   st.waveEventTimer = 90;
   ```

3. **Add wave progress indicator in HUD.** In `js/3d/hud.js`, after the wave number display (L126), add a small progress bar:
   ```js
   // Wave progress bar (shows time until next wave event)
   if (s.waveEventTimer !== undefined && s.waveWarning <= 0) {
     const maxTimer = 90; // matches reset value in game3d.js
     const progress = Math.max(0, Math.min(1, 1 - (s.waveEventTimer / maxTimer)));
     ctx.fillStyle = 'rgba(255,100,68,0.3)';
     ctx.fillRect(W - 20 - 60, 40, 60 * progress, 3);
   }
   ```
   This renders a subtle red progress bar under the "WAVE N" text, filling left-to-right as the next wave approaches.

4. **Expose waveEventTimer to HUD.** The HUD reads from the state object `s`. Verify that `st.waveEventTimer` is accessible as `s.waveEventTimer`. Since the HUD receives the full `st` object, this should already work. Confirm by checking what is passed to `drawHUD()`.

**Testing approach:** Start new game. Count time to first wave event (should be ~1.25 min, not ~1.75). Verify 6+ enemies visible within 30 seconds. Verify progress bar appears under WAVE text and fills over time. Verify subsequent waves fire every ~1.5 min. Check that late-game balance still feels progressive.

---

### Batch 4 Agent Spec: BD-132 — Grass and Flower Visibility

**Files to modify:** `js/3d/terrain.js`

**Context:** Grass patches (`createGrassPatch`, L453-467) and flower patches (`createFlowerPatch`, L480-500) were added per BD-121/BD-124 but are invisible at the default camera distance because the geometry is too small. Grass blades are `BoxGeometry(0.02, 0.2-0.4, 0.02)` and flower caps are `BoxGeometry(0.06, 0.04, 0.06)`.

**Changes required:**

1. **Scale up grass blades** in `createGrassPatch()` (L453-467):
   - Line ~458: Change blade height range from `0.2 + Math.random() * 0.2` to `0.3 + Math.random() * 0.3`
   - Line ~460: Change geometry from `BoxGeometry(0.02, bh, 0.02)` to `BoxGeometry(0.08, bh, 0.05)`
   - Line ~463: Change position spread from `(Math.random() - 0.5) * 0.8` to `(Math.random() - 0.5) * 1.2` (both x and z)

2. **Scale up flower stems** in `createFlowerPatch()` (L480-500):
   - Line ~485: Change stem height from `0.15 + Math.random() * 0.1` to `0.25 + Math.random() * 0.2`
   - Line ~487: Change stem geometry from `BoxGeometry(0.02, stemH, 0.02)` to `BoxGeometry(0.06, stemH, 0.06)`
   - Line ~496: Change cap geometry from `BoxGeometry(0.06, 0.04, 0.06)` to `BoxGeometry(0.14, 0.06, 0.14)`
   - Lines ~490-491: Change flower spread from `(Math.random() - 0.5) * 0.6` to `(Math.random() - 0.5) * 1.0` (both x and z)

3. **Verify no collider impact.** Grass and flowers should NOT have collision entries. Confirm that `createGrassPatch` and `createFlowerPatch` return values are only pushed to `ts.decorations` (for cleanup) and NOT to `ts.colliders` or `occupiedPositions`.

4. **Check tri budget.** The scaled geometry uses the same `BoxGeometry` (12 tris per box). The only change is dimensions, not vertex count. No performance impact.

**Testing approach:** Start new game, look at the ground around the player. Grass patches should be visible as small green tufts. Flower patches should show colored caps. Walk through them to confirm no collision. Walk far away and return to confirm chunks reload with correct decorations.

---

## 5. Execution Order and Merge Strategy

All 4 batches can start simultaneously. Recommended merge order:

1. **Batch 4 (BD-132)** first -- isolated in `terrain.js`, zero conflict risk, quick to verify
2. **Batch 1 (BD-128)** second -- isolated Tab handler change, trivial merge
3. **Batch 3 (BD-130 + BD-131)** third -- touches state init and update loop in game3d.js
4. **Batch 2 (BD-129 + BD-133)** last -- most complex changes to game3d.js (buildPlateauMeshes), benefits from having Batch 3 merged first so merge base is stable

### Post-Merge Integration QA

After all batches merge, verify:
- [ ] Minimap toggle works during gameplay but not during menus
- [ ] Plateaus are semi-transparent (or dynamically transparent) and don't fully hide the player
- [ ] Plateau ramps are present on height-2+ plateaus and walkable
- [ ] 8+ enemies visible within first 30 seconds
- [ ] First wave event fires within ~1.25 minutes
- [ ] Wave progress bar visible under WAVE text
- [ ] Grass and flowers visible at default camera distance
- [ ] No FPS regression
- [ ] Pause, upgrade, charge shrine, and game over menus all function correctly
- [ ] Tab key works as expected in all states
