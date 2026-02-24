# Sprint Plan: BD-137 through BD-141 — Fun Polish & Performance

**Date:** 2026-02-24
**Source:** Post BD-134/135/136 playtest suggestions
**Execution model:** Parallel worktree agents (3 batches)
**Vibe:** Julian is going to LOVE this sprint. Combo counters, juicy gem effects, and a speed trail? Let's go.

---

## 1. Bead Inventory

| BD# | Priority | Category | File(s) | Summary |
|-----|----------|----------|---------|---------|
| BD-137 | P2 | Enhancement — Juice | `js/game3d.js` | Gem magnet speed trail + whoosh sound on big gem pickup |
| BD-138 | P2 | Enhancement — Fun | `js/game3d.js` | Kill combo counter with floating text ("x5 COMBO!") |
| BD-139 | P1 | Bug/Polish — Visual | `js/game3d.js` | Fix gem breathing vs merge scale conflict + smooth tween on merge |
| BD-140 | P3 | Dev Tool — Performance | `js/3d/hud.js` | FPS debug counter overlay (toggle with backtick key) |
| BD-141 | -- | QA — Manual | -- | Post-merge playtest checklist (not an agent task) |

---

## 2. Conflict Matrix

|        | BD-137 | BD-138 | BD-139 | BD-140 |
|--------|--------|--------|--------|--------|
| **BD-137** | -- | NONE | **HIGH** | NONE |
| **BD-138** | NONE | -- | NONE | NONE |
| **BD-139** | **HIGH** | NONE | -- | NONE |
| **BD-140** | NONE | NONE | NONE | -- |

### Conflict Details

- **BD-137 vs BD-139 (HIGH):** Both modify the XP gem update loop (lines 4722-4763). BD-137 adds a speed trail visual + sound on big gem collection. BD-139 fixes the `scale.setScalar(breathe)` line that overwrites merge-based scale, and adds a smooth tween. Both touch `gem.mesh.scale` and the collection block. **Must be same batch.**

- **BD-138 (NONE):** Touches `killEnemy()` (line 2263 area) and state init. No other bead touches these lines.

- **BD-140 (NONE):** Touches only `js/3d/hud.js` (new FPS display) and a single keydown handler in `game3d.js` (backtick toggle). No overlap with any other bead.

---

## 3. Agent Batches

### Batch 1: Gem Juice (1 agent)
**Beads:** BD-137 + BD-139
**Priority:** P1 + P2
**Files modified:** `js/game3d.js`

### Batch 2: Kill Combos (1 agent)
**Beads:** BD-138
**Priority:** P2
**Files modified:** `js/game3d.js`

### Batch 3: FPS Counter (1 agent)
**Beads:** BD-140
**Priority:** P3
**Files modified:** `js/3d/hud.js`, `js/game3d.js` (1 keydown line)

**All 3 batches can run in parallel.** Batches 1 and 2 both touch `game3d.js` but in completely non-overlapping regions (gem loop vs killEnemy). Batch 3 primarily touches `hud.js`.

---

## 4. Per-Batch Agent Specs

---

### Batch 1 Agent Spec: BD-137 + BD-139 — Gem Juice (Speed Trail + Merge Tween + Scale Fix)

**Files to modify:** `js/game3d.js`

**Context:** XP gems bob and spin in the gem update loop (lines 4722-4763). The gem merge system (lines 4690-4720) sets `mesh.scale` based on `xpValue`, but the breathing animation at line 4733-4734 overwrites it with `setScalar(breathe)` every frame — **this is a bug from BD-135** that needs fixing first.

#### BD-139: Fix breathing vs merge scale + smooth merge tween

1. **Store base scale on each gem.** In `createXpGem()` (around line 1662), add a `baseScale` field:
   ```js
   return { mesh, bobPhase: Math.random() * Math.PI * 2, xpValue, baseScale: 1.0 };
   ```

2. **Fix breathing to respect base scale.** At line 4733-4734, change:
   ```js
   const breathe = 1 + Math.sin(gem.bobPhase) * 0.15;
   gem.mesh.scale.setScalar(breathe);
   ```
   To:
   ```js
   const breathe = gem.baseScale * (1 + Math.sin(gem.bobPhase) * 0.15);
   gem.mesh.scale.setScalar(breathe);
   ```

3. **Smooth merge tween.** In the gem merge code (line 4710-4716), instead of snapping scale, set a target and let breathing interpolate:
   ```js
   // Instead of instant scale snap:
   const targetScale = Math.min(1.0 + a.xpValue * 0.15, 3.5);
   a.baseScale = targetScale;
   // Brightness stays instant (looks fine as a flash)
   const brightness = Math.min(0.3 + a.xpValue * 0.05, 1.0);
   a.mesh.material.emissiveIntensity = brightness;
   ```
   The breathing animation loop will smoothly adopt the new `baseScale` on the next frame, creating a natural tween effect.

#### BD-137: Gem magnet speed trail + big gem collection sound

1. **Speed trail on magnet-pulled gems.** In the magnet pull block (lines 4739-4743), add a simple visual stretch effect. When a gem is being pulled, elongate it in the direction of the player:
   ```js
   if (dist < st.collectRadius * 2 && dist > st.collectRadius) {
     const pull = 3 * dt;
     gem.mesh.position.x += (dx / dist) * pull;
     gem.mesh.position.z += (dz / dist) * pull;
     // Speed trail: stretch gem toward player
     const stretch = 1.5;
     gem.mesh.scale.x = gem.baseScale * stretch;
     gem.mesh.scale.z = gem.baseScale * (1 / stretch);
     gem.mesh.lookAt(st.playerX, gem.mesh.position.y, st.playerZ);
   } else {
     // Reset stretch when not being pulled (breathing handles base scale)
   }
   ```
   NOTE: The breathing `setScalar` call comes after this, so move the breathing BEFORE the magnet block, or use a flag to skip breathing when being pulled. Restructure the loop so:
   - First: check magnet pull and apply stretch if pulling
   - Second: if NOT being pulled, apply normal breathing

2. **Whoosh sound on collecting big merged gems.** In the collection block (line 4744), add a sound for gems worth 3+ XP:
   ```js
   if (dist < st.collectRadius) {
     // Award XP
     st.xp += Math.max(1, Math.round(gem.xpValue * st.augmentXpMult * getHowlXpMult() * (st.totemXpMult || 1)));
     // Big gem collection sound — reuse boomerang whoosh for merged gems
     if (gem.xpValue >= 3) {
       playSound('sfx_weapon_boomerang'); // whoosh!
     }
     // ... rest of collection (scene.remove, etc.)
   ```
   NOTE: `sfx_xp_pickup` exists but has an empty sound pool, so use `sfx_weapon_boomerang` (wings-4.ogg) as a placeholder whoosh for big gems. Regular 1-value gems stay silent (as before).

3. **Brief flash on collection.** When a gem is collected, quickly flash its emissive to white before removal (1 frame visual pop):
   ```js
   gem.mesh.material.emissive.set(0xffffff);
   gem.mesh.material.emissiveIntensity = 2.0;
   ```
   This is purely cosmetic — the mesh is removed on the same frame, but Three.js may render one more frame with the flash visible (depends on timing). If this doesn't show, skip it — it's a nice-to-have.

**Testing approach:** Start game, kill enemies, let XP gems accumulate. Watch them merge (should scale smoothly, not snap). Walk near a gem cluster — gems should stretch toward you as they're pulled. Collect a big merged gem — should hear a whoosh. Verify breathing animation still looks correct on unmerged gems.

---

### Batch 2 Agent Spec: BD-138 — Kill Combo Counter

**Files to modify:** `js/game3d.js`

**Context:** `killEnemy()` is at line 2229. `st.totalKills` increments at line 2263. `addFloatingText()` is at line 461. State init is around lines 256-417.

#### Implementation

1. **Add combo state variables** to state init (around line 408, after `totalKills`):
   ```js
   comboCount: 0,
   comboTimer: 0,
   bestCombo: 0,
   ```

2. **Track combo in `killEnemy()`** right after `st.totalKills++` (line 2263):
   ```js
   st.totalKills++;
   st.killsByTier[(e.tier || 1) - 1]++;
   // Combo tracking
   st.comboCount++;
   st.comboTimer = 2.0; // 2-second window to chain kills
   if (st.comboCount >= 5 && st.comboCount % 5 === 0) {
     addFloatingText('x' + st.comboCount + ' COMBO!', '#ff4444', st.playerX, st.playerY + 3, st.playerZ, 1.5, true);
     playSound('sfx_level_up'); // Reuse level-up celebration as combo fanfare
   }
   if (st.comboCount > st.bestCombo) st.bestCombo = st.comboCount;
   ```

3. **Decay combo timer** in the main update loop. Find a good spot near the existing game timers (around line 4400-4500 area, near other timer decrements). Add:
   ```js
   // Combo decay
   if (st.comboTimer > 0) {
     st.comboTimer -= dt;
     if (st.comboTimer <= 0) {
       st.comboCount = 0;
     }
   }
   ```

4. **Show best combo on game-over screen.** Search for the game-over stats display (it uses `st.totalKills`, `st.killsByTier`, etc. for the stats panel). Add `bestCombo` to the stats. Search for where `totalKills` is displayed in the game-over/HUD section and add best combo nearby:
   - In the game-over stats, add a line: `Best Combo: x{st.bestCombo}`
   - Only show if `st.bestCombo >= 5` (don't clutter with trivial combos)

5. **Combo milestones** — announce at every 5 kills (5, 10, 15, 20...). The `% 5 === 0` check handles this. Color escalation for big combos is a nice touch:
   ```js
   const comboColor = st.comboCount >= 20 ? '#ff00ff' : st.comboCount >= 10 ? '#ffaa00' : '#ff4444';
   addFloatingText('x' + st.comboCount + ' COMBO!', comboColor, st.playerX, st.playerY + 3, st.playerZ, 1.5, true);
   ```

**Testing approach:** Start game, rush a group of zombies. Kill 5 within 2 seconds — "x5 COMBO!" should appear in red. Kill 10 — "x10 COMBO!" in orange. Stop killing for 2+ seconds — combo resets. Die and check game-over screen for best combo stat.

---

### Batch 3 Agent Spec: BD-140 — FPS Debug Counter

**Files to modify:** `js/3d/hud.js`, `js/game3d.js`

**Context:** The HUD is rendered by `drawHUD(ctx, s, W, H)` in `js/3d/hud.js`. The state object `s` is passed from `game3d.js`. Keyboard input is handled in `onKeyDown` in `game3d.js`.

#### Implementation

1. **Add FPS toggle to state** in `game3d.js` state init:
   ```js
   showFps: false,
   ```

2. **Add backtick key handler** in the `onKeyDown` handler in `game3d.js` (near the Tab handler):
   ```js
   if (e.code === 'Backquote') {
     st.showFps = !st.showFps;
   }
   ```

3. **Track FPS in game3d.js update loop.** Add frame timing near the top of the animation loop:
   ```js
   // FPS tracking
   if (!st._fpsFrames) { st._fpsFrames = 0; st._fpsTime = 0; st._fpsDisplay = 0; }
   st._fpsFrames++;
   st._fpsTime += dt;
   if (st._fpsTime >= 0.5) {
     st._fpsDisplay = Math.round(st._fpsFrames / st._fpsTime);
     st._fpsFrames = 0;
     st._fpsTime = 0;
   }
   ```

4. **Render FPS in hud.js.** At the very end of `drawHUD()`, add:
   ```js
   // FPS counter (toggle with backtick key)
   if (s.showFps && s._fpsDisplay) {
     ctx.font = '12px monospace';
     ctx.fillStyle = s._fpsDisplay >= 50 ? '#00ff00' : s._fpsDisplay >= 30 ? '#ffff00' : '#ff0000';
     ctx.textAlign = 'left';
     ctx.fillText('FPS: ' + s._fpsDisplay, 10, H - 10);
     // Also show entity counts for debugging
     ctx.fillStyle = '#aaaaaa';
     ctx.fillText('E:' + (s.enemies ? s.enemies.length : 0) + ' G:' + (s.xpGems ? s.xpGems.length : 0) + ' T:' + (s.floatingTexts3d ? s.floatingTexts3d.length : 0), 10, H - 24);
   }
   ```
   Color coding: green (50+), yellow (30-49), red (<30). Second line shows entity counts (Enemies, Gems, Texts) for quick profiling.

**Testing approach:** Start game, press backtick (`) — FPS counter should appear bottom-left in green. Play for a few minutes, observe FPS stays above 50. Press backtick again — counter hides. Verify it doesn't show during menus if showFps was off.

---

## 5. Execution Order and Merge Strategy

All 3 batches start simultaneously. Recommended merge order:

1. **Batch 3 (BD-140)** first — primarily `hud.js`, minimal `game3d.js` touch (one keydown line + FPS tracking)
2. **Batch 2 (BD-138)** second — touches `killEnemy` and state init, isolated from gem loop
3. **Batch 1 (BD-137 + BD-139)** last — most complex changes to gem loop, benefits from stable merge base

---

## 6. BD-141: Post-Merge Playtest Checklist (Manual)

After all batches merge, playtest the full suite (BD-135 through BD-140):

- [ ] XP gems merge nearby (clusters shrink to single bigger gem)
- [ ] Merged gems breathe/bob at their larger size (no scale snapping)
- [ ] Gems stretch toward player when being magneted
- [ ] Big gem collection plays whoosh sound
- [ ] Floating text count never exceeds 15 on screen
- [ ] "BOOM!" and damage text deduplicate in rapid succession
- [ ] Kill combo counter fires at 5/10/15/20... kills
- [ ] Combo text color escalates (red → orange → magenta)
- [ ] Combo resets after 2s of no kills
- [ ] Best combo shows on game-over screen (if >= 5)
- [ ] FPS counter toggles with backtick key
- [ ] FPS stays green (50+) during normal play
- [ ] FPS counter shows entity counts (E/G/T)
- [ ] No crashes, no visual glitches, no audio spam
- [ ] Overall: does it FEEL fun? Would Julian approve?
