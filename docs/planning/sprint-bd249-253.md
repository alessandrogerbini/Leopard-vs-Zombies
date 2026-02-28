# Sprint Plan: BD-249 through BD-253 -- Death Flow Fix + Game-Feel Polish

**Date:** 2026-02-27
**Source beads:**
- `docs/planning/beads-bd249.md` (SUPERCEDED by BD-251 -- reference only)
- `docs/planning/beads-bd250.md` (game-over text layout overlap)
- `docs/planning/beads-bd251.md` (death does not transition to game-over)
- `docs/planning/beads-bd252.md` (zombie terrain collision)
- `docs/planning/beads-bd253.md` (giant growth game feel)
**Execution model:** Parallel worktree agents (2 batch rounds)

---

## 1. Sprint Overview

The game currently has a **P0 game-breaking bug**: dying in 3D mode does not reliably trigger the game-over / name-entry / leaderboard screen. The player reaches 0 HP but the game continues rendering normally, requiring a browser refresh. This is caused by the death sequence tick living inside the `!st.paused && !st.gameOver` gate, where any menu opening in the same frame as death permanently freezes the transition.

Secondary fixes in this sprint: the game-over screen has overlapping text layout (P1), zombies phase through terrain obstacles that block the player (P1), and the GIANT GROWTH powerup feels like a punishment rather than a power fantasy (P2).

**BD-249 is SUPERCEDED by BD-251** -- same root cause, same fix, BD-251 is the implementation bead. BD-249 is retained as the detailed investigation reference. Do NOT implement BD-249 separately.

---

## 2. Bead Inventory

| BD# | Priority | Category | File(s) | Status | Summary |
|-----|----------|----------|---------|--------|---------|
| BD-249 | P0 | Bug (game-over flow) | `js/game3d.js`, `js/3d/hud.js` | **SUPERCEDED** | Detailed investigation of death hang -- subsumed by BD-251 |
| BD-250 | P1 | Bug (UI layout) | `js/3d/hud.js` | **IMPLEMENT** | Game-over text lines overlap due to hardcoded Y positions |
| BD-251 | P0 | Bug (game-over flow) | `js/game3d.js`, `js/3d/hud.js` | **IMPLEMENT** | Death does not transition to game-over screen |
| BD-252 | P1 | Bug (enemy movement) | `js/game3d.js` | **IMPLEMENT** | Zombies walk through impassable terrain |
| BD-253 | P2 | Design (game feel) | `js/3d/constants.js`, `js/3d/hud.js` | **IMPLEMENT** | GIANT GROWTH powerup feels like a liability |

---

## 3. Conflict Matrix

|        | BD-251 | BD-250 | BD-252 | BD-253 |
|--------|--------|--------|--------|--------|
| **BD-251** | -- | NONE | NONE | NONE |
| **BD-250** | NONE | -- | NONE | LOW |
| **BD-252** | NONE | NONE | -- | NONE |
| **BD-253** | NONE | LOW | NONE | -- |

### Conflict Details

- **BD-251 vs BD-250 (NONE):** BD-251 modifies `js/game3d.js` lines 4746-4748 and 7805-7857 (death flow logic). BD-250 modifies `js/3d/hud.js` lines 1307-1457 (game-over screen layout). Completely different files and concerns. **Safe to parallel.**
- **BD-251 vs BD-252 (NONE):** BD-251 touches death transition logic (lines 4746-4748, 7805-7857). BD-252 touches enemy movement logic (lines 6783-6824). Different code regions in the same file, >1000 lines apart. **Safe to parallel, but both modify game3d.js -- merge BD-251 first to establish the baseline, then BD-252.**
- **BD-250 vs BD-253 (LOW):** Both touch `js/3d/hud.js`. BD-250 modifies lines 1307-1457 (game-over screen). BD-253 adds a subtitle near lines 219-229 (powerup indicator). >1000 lines apart. **Safe to parallel -- no overlapping regions.**
- **BD-252 vs BD-253 (NONE):** Completely different files and systems.

---

## 4. Batch Plan

### Batch 1 (parallel): BD-251 + BD-250

Both are independent. BD-251 fixes the game-breaking death flow in `game3d.js`. BD-250 fixes the overlapping text layout in `hud.js`. No file overlap.

| Agent | Bead | File(s) | Lines |
|-------|------|---------|-------|
| Agent A | BD-251 | `js/game3d.js` (lines 4746-4748, 7805-7857), `js/3d/hud.js` (line 1353) | ~20 lines changed |
| Agent B | BD-250 | `js/3d/hud.js` (lines 1307-1457) | ~50 lines changed |

**Merge order:** Agent A (BD-251) first, then Agent B (BD-250). BD-250 touches hud.js lines 1307-1457 while BD-251 only touches hud.js line 1353 (roundRect fallback). If BD-250 rewrites the section, the roundRect fallback from BD-251 should be incorporated into BD-250's cursorY rewrite. Alternatively, merge BD-250 first since its rewrite of lines 1307-1457 is more comprehensive, and have BD-251's hud.js change (roundRect guard) be part of BD-250's rewrite.

**Recommended merge strategy:** Merge BD-250 first (it rewrites the entire game-over section of hud.js). Then merge BD-251 (game3d.js changes merge cleanly; hud.js roundRect guard should already be included in BD-250's rewrite -- verify during merge).

### Batch 2 (parallel): BD-252 + BD-253

Both are independent. BD-252 fixes zombie terrain collision in `game3d.js`. BD-253 tweaks GIANT GROWTH constants and HUD. No overlap with each other. Both depend on Batch 1 being merged (BD-252 needs a clean game3d.js baseline; BD-253 needs a clean hud.js baseline).

| Agent | Bead | File(s) | Lines |
|-------|------|---------|-------|
| Agent C | BD-252 | `js/game3d.js` (lines 6783-6824) | ~30 lines changed |
| Agent D | BD-253 | `js/3d/constants.js` (line 212), `js/3d/hud.js` (lines 219-229) | ~10 lines changed |

**Merge order:** Either order -- no overlap.

---

## 5. Machine-Actionable Specs

---

### 5A. BD-251: Death does not transition to game-over screen

**Priority:** P0 -- implement first
**Complexity:** S (Small)
**File:** `js/game3d.js`
**Agent:** A (Batch 1)

#### Step 1: Move death sequence tick outside the pause gate

**What:** Extract the death sequence tick block from inside the `if (!st.paused && !st.gameOver)` gate (lines 7834-7857) and place it AFTER the nameEntryInputCooldown tick (after line 4746), BEFORE the `if (!st.paused && !st.gameOver)` gate at line 4748.

**Current code at lines 4746-4748:**
```js
    }

    if (!st.paused && !st.gameOver) {
```

**New code at lines 4746-4748 (insert death sequence tick between them):**
```js
    }

    // BD-251: Death sequence tick runs OUTSIDE the pause gate.
    // Previously lived at lines 7834-7857 inside !st.paused, which meant any
    // menu (upgrade, shrine, wearable) that set st.paused=true would freeze
    // the death timer permanently, preventing the game-over screen.
    if (st.deathSequence && !st.gameOver) {
      st.deathSequenceTimer -= realDt;
      const progress = 1 - (st.deathSequenceTimer / 1.5);
      // Ramp: first 33% decelerates from 1.0 to 0.15, then holds at 0.15
      st.deathTimeScale = progress < 0.33
        ? 1.0 - (progress / 0.33) * 0.85
        : 0.15;
      // BD-233: Slow-mo audio at 1.3s remaining
      if (st.deathSequenceTimer <= 1.3 && !st._deathSlowmoPlayed) {
        st._deathSlowmoPlayed = true;
        playSound('sfx_death_slowmo');
      }

      if (st.deathSequenceTimer <= 0) {
        st.gameOver = true;
        st.deathSequence = false;
        st.showFullMap = false;
        st.upgradeMenu = false;       // BD-251: force-clear menus
        st.paused = false;            // BD-251: unpause for game-over
        st.chargeShrineMenu = false;  // BD-251: clear shrine menu
        st.wearableCompare = false;   // BD-251: clear wearable compare
        inputState.enterReleasedSinceGameOver = false;
        st.nameEntryActive = true;
        st.nameEntry = '';
        st.nameEntryInputCooldown = 0.3;
        // playSound('sfx_death_sting'); // TODO: Sound Pack Beta
      }
    }

    if (!st.paused && !st.gameOver) {
```

**Then DELETE the original block at its old location.** The original lines 7834-7857 (now relocated) must be removed. After removal, line 7833 (`keys3d['Space'] = false; ... inputState.powerAttackReady = false;` block ending at line 7831) should be immediately followed by the closing `}` of the `if (!st.paused && !st.gameOver)` block, and then the camera/render section.

The result should look like this at the OLD location (around where lines 7831-7860 were):
```js
        inputState.powerAttackReady = false;
      }

    }

    // === CAMERA + RENDER (runs even when paused/game over) ===
```

#### Step 2: Force-close menus on death START

**What:** When `st.hp <= 0` triggers the death sequence (line 7805), add menu clears AFTER `st.deathSequence = true` (line 7807).

**Current code at lines 7805-7808:**
```js
      if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
        st.hp = 0;
        st.deathSequence = true;
        st.deathSequenceTimer = 1.5;
```

**New code (insert after line 7807, before line 7808):**
```js
      if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
        st.hp = 0;
        st.deathSequence = true;
        // BD-251: Force-close all menus -- death overrides everything.
        // Prevents upgrade menu / shrine / wearable compare from blocking
        // the death sequence or overlaying the death animation.
        st.upgradeMenu = false;
        st.paused = false;
        st.chargeShrineMenu = false;
        st.wearableCompare = false;
        st.deathSequenceTimer = 1.5;
```

#### Step 3: Add roundRect fallback in hud.js

**What:** Guard the `ctx.roundRect()` call at `js/3d/hud.js` line 1353 with a feature check.

**NOTE:** If BD-250 (Agent B) is rewriting this section with cursorY, the roundRect guard should be included in that rewrite instead. Include it here as a defensive measure -- if BD-250's rewrite contains `ctx.roundRect`, it should also include this guard.

**Current code at hud.js line 1352-1354:**
```js
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      ctx.fill();
```

**New code:**
```js
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
```

#### DO NOT TOUCH
- `js/3d/hud.js` lines 1307-1457 (game-over screen layout) -- owned by BD-250 (Agent B)
- `js/game3d.js` lines 6773-6824 (enemy movement) -- owned by BD-252 (Agent C)
- `js/3d/constants.js` -- owned by BD-253 (Agent D)

#### Testing Plan
1. Normal death (let zombies kill you) -- verify 1.5s death animation plays, then game-over screen appears.
2. Death while upgrade menu is open -- die at low HP while collecting XP gems near enemies. Verify upgrade menu is dismissed and death sequence plays through to game-over.
3. Death while near a shrine (if possible) -- verify shrine menu is dismissed.
4. Verify name entry accepts keyboard input and Enter saves to leaderboard.
5. Verify Enter on leaderboard screen returns to main menu.
6. Verify upgrade menu still works normally when NOT dying (no regression).
7. Verify pause menu (ESC) still works normally.

---

### 5B. BD-250: Game-over screen text layout overlaps

**Priority:** P1
**Complexity:** S (Small)
**File:** `js/3d/hud.js`
**Agent:** B (Batch 1)

#### What

Replace ALL hardcoded Y positions in the game-over screen section (lines 1307-1457) with a flowing `cursorY` accumulator. This prevents the "DEFEATED BY" line from overlapping with the "YOU DEFEATED N ZOMBIES!" line, and makes the entire game-over screen layout robust against future additions.

#### Current Code (lines 1307-1457)

The entire game-over section uses hardcoded Y values: 55, 95, 118, 138, 158, 175, 205, etc. The "DEFEATED BY" line at Y=158 collides with "YOU DEFEATED" at Y=175 because the 28px bold font ascenders reach up to Y~149.

#### New Code

Replace lines 1312-1457 (everything inside the `if (s.gameOver) {` block after the background fill and textAlign setup) with cursorY-based layout:

```js
    // "GAME OVER" title
    let cursorY = 55;
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px ' + GAME_FONT;
    ctx.fillText('GAME OVER', W / 2, cursorY);
    cursorY += 40; // 40px after 48px title

    // --- Stats Panel ---
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 24px ' + GAME_FONT;
    ctx.fillText(`SCORE: ${s.score}`, W / 2, cursorY);
    cursorY += 23; // 23px after 24px score

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText(`${animalData.name} | Level ${s.level} | Wave ${s.wave - 1}`, W / 2, cursorY);
    cursorY += 20; // 20px after 14px info line

    // Time survived
    const goMins = Math.floor(s.gameTime / 60);
    const goSecs = Math.floor(s.gameTime % 60);
    ctx.fillStyle = '#88ccff'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText(`Time: ${String(goMins).padStart(2, '0')}:${String(goSecs).padStart(2, '0')}`, W / 2, cursorY);
    cursorY += 24; // 24px after time line (extra padding before defeated-by)

    // BD-216+232: "DEFEATED BY" line with zombie tier icon and color pill
    if (s.lastDamageSource && s.lastDamageSource.tierName) {
      const srcColor = '#' + (s.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
      const tierIdx = (s.lastDamageSource.tier || 1) - 1;
      const tierText = s.lastDamageSource.tierName.toUpperCase();
      const defText = 'DEFEATED BY: ' + tierText;

      // Measure text for pill sizing
      ctx.font = 'bold 20px ' + GAME_FONT;
      const textW = ctx.measureText(defText).width;

      // BD-232: Zombie tier icon (left of text)
      const iconScale = 1.2 + tierIdx * 0.1;
      const iconCX = W / 2 - textW / 2 - 30 * iconScale;
      const iconCY = cursorY;
      drawZombieTierIcon(ctx, iconCX, iconCY, iconScale, srcColor, tierIdx);

      // BD-232: Dark rounded pill behind tier name
      const pillPad = 10;
      const pillH = 28;
      const pillX = W / 2 - textW / 2 - pillPad;
      const pillY = cursorY - pillH / 2 - 4;
      const pillW = textW + pillPad * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      // BD-249: roundRect fallback for older browsers
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();

      // Text on top of pill
      ctx.fillStyle = srcColor;
      ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.fillText(defText, W / 2, cursorY);
      cursorY += 30; // 30px after 20px defeated-by section
    }

    // --- Big total kills line ---
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 28px ' + GAME_FONT;
    ctx.fillText(`YOU DEFEATED ${s.totalKills} ZOMBIES!`, W / 2, cursorY);
    cursorY += 30; // 30px after 28px kills line

    // Kid-friendly tier breakdown (max 4 groups)
    const kidGroups = [
      { label: 'Tiny', from: 0, to: 1 },
      { label: 'Big', from: 2, to: 3 },
      { label: 'Huge', from: 4, to: 5 },
      { label: 'MEGA', from: 6, to: 9 },
    ];
    for (const grp of kidGroups) {
      let count = 0;
      for (let t = grp.from; t <= grp.to && t < s.killsByTier.length; t++) {
        count += s.killsByTier[t] || 0;
      }
      if (count > 0) {
        ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText(`${grp.label}: ${count}`, W / 2, cursorY);
        cursorY += 22; // 22px per tier line
      }
    }

    // Best combo (only show if noteworthy)
    if (s.bestCombo >= 5) {
      ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 13px ' + GAME_FONT;
      ctx.fillText(`Best Combo: x${s.bestCombo}`, W / 2, cursorY);
      cursorY += 18; // 18px after combo
    }

    // --- Feedback Section ---
    cursorY += 8; // 8px padding before feedback
    ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 20px ' + GAME_FONT;
    ctx.fillText('Was that FUN?', W / 2, cursorY);

    const fbOptions = ['YES', 'KINDA', 'NAH'];
    const fbColors = ['#44ff44', '#ffaa44', '#ff4444'];
    const fbGap = 100;
    const fbStartX = W / 2 - fbGap;
    for (let fi = 0; fi < 3; fi++) {
      const fx = fbStartX + fi * fbGap;
      const isSelected = fi === s.feedbackSelection;
      if (isSelected) {
        ctx.fillStyle = fbColors[fi]; ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText(`[${fbOptions[fi]}]`, fx, cursorY + 26);
      } else {
        ctx.fillStyle = '#555'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText(fbOptions[fi], fx, cursorY + 26);
      }
    }
    ctx.fillStyle = '#777'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText('<  Arrow Keys to pick  >', W / 2, cursorY + 48);

    // --- Name Entry / Leaderboard (below feedback) ---
    const entryY = cursorY + 70;

    if (s.nameEntryActive) {
      // Name entry
      ctx.fillStyle = '#88ccff'; ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText('ENTER YOUR NAME:', W / 2, entryY);
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px ' + GAME_FONT;
      const cursor = Math.sin(Date.now() * 0.005) > 0 ? '_' : '';
      ctx.fillText(s.nameEntry + cursor, W / 2, entryY + 30);
      ctx.fillStyle = '#888'; ctx.font = 'bold 14px ' + GAME_FONT;
      ctx.fillText('Type name, then ENTER to save', W / 2, entryY + 55);
    } else {
      // Leaderboard (simplified: 3 columns, top 5)
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px ' + GAME_FONT;
      ctx.fillText('LEADERBOARD', W / 2, entryY);
      const lb = s.leaderboard3d;
      if (lb.length > 0) {
        ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillStyle = '#aaa';
        ctx.fillText('RANK     NAME        SCORE', W / 2, entryY + 22);
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#888888', '#888888'];
        for (let i = 0; i < Math.min(lb.length, 5); i++) {
          const e = lb[i];
          const rank = String(i + 1).padStart(2);
          const name = (e.name || '???').padEnd(10);
          const score = String(e.score).padStart(6);
          ctx.fillStyle = rankColors[i] || '#888888';
          ctx.font = 'bold 18px ' + GAME_FONT;
          ctx.fillText(`${rank}.  ${name}  ${score}`, W / 2, entryY + 44 + i * 24);
        }
      } else {
        ctx.fillStyle = '#888'; ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText('No scores yet', W / 2, entryY + 34);
      }

      if (Math.sin(Date.now() * 0.005) > 0) {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText('PRESS ENTER TO RETURN', W / 2, H - 30);
      }
    }
```

#### Key Changes Summary
1. Replace `55` with `cursorY = 55`, then increment after each element.
2. Replace `95` with `cursorY` (after += 40).
3. Replace `118` with `cursorY` (after += 23).
4. Replace `138` with `cursorY` (after += 20).
5. Replace hardcoded `158` in "DEFEATED BY" section (3 occurrences: `iconCY`, `pillY`, and `fillText`) with `cursorY` (after += 24).
6. Replace `175` with `cursorY` (after += 30 from defeated-by, or direct if no defeated-by).
7. Replace `tierY = 205` with inline `cursorY` accumulation (after += 30 from kills line).
8. Replace `feedbackY = tierY + 8` with `cursorY += 8`.
9. Replace `entryY = feedbackY + 70` with `entryY = cursorY + 70`.
10. Include `roundRect` fallback (BD-249 Suspect 3) in the pill drawing.

#### DO NOT TOUCH
- `js/game3d.js` -- owned by BD-251 (Agent A) and BD-252 (Agent C)
- `js/3d/constants.js` -- owned by BD-253 (Agent D)
- `js/3d/hud.js` lines outside 1307-1457 -- powerup indicator (lines 218-229) is owned by BD-253

#### Testing Plan
1. Die normally -- verify game-over screen has no overlapping text.
2. Die with a known `lastDamageSource` -- verify "DEFEATED BY: SHAMBLER" line is clearly separated from "YOU DEFEATED N ZOMBIES!" line below it.
3. Die without a `lastDamageSource` (if possible, e.g., poison pool) -- verify layout collapses gracefully without a gap where "DEFEATED BY" would be.
4. Test at small window (800x600) -- verify all content fits on screen.
5. Test at large window (1920x1080) -- verify layout looks correct.
6. Verify tier breakdown, feedback options, name entry, and leaderboard all render without overlap.

---

### 5C. BD-252: Zombies walk through impassable terrain

**Priority:** P1
**Complexity:** M (Medium)
**File:** `js/game3d.js`
**Agent:** C (Batch 2)

#### What

Replace the current separate move-then-pushback zombie movement (lines 6783-6824) with an atomic move-then-resolve pattern. The zombie calculates its intended new position, then resolves terrain collisions on that position BEFORE committing it. This prevents zombies from tunneling through obstacles across multiple frames.

#### Step 1: Rewrite normal pursuit movement with atomic collision (lines 6795-6824)

**Current code (lines 6795-6824):**
```js
        } else if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;
          e.group.position.x += nx * eSpd * gameDt;
          e.group.position.z += nz * eSpd * gameDt;
          // Clamp enemies to map boundaries
          e.group.position.x = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.x));
          e.group.position.z = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.z));

          e.group.rotation.y = Math.atan2(nx, nz);
        }

        // === ENEMY-TERRAIN COLLISION (BD-156: chunk-indexed via getNearbyColliders) ===
        if (terrainState) {
          const ER = 0.4; // enemy radius
          const nearby = getNearbyColliders(e.group.position.x, e.group.position.z, terrainState);
          for (let ci = 0; ci < nearby.length; ci++) {
            const c = nearby[ci];
            const cdx = e.group.position.x - c.x;
            const cdz = e.group.position.z - c.z;
            const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
            const minDist = ER + c.radius;
            if (cDist < minDist && cDist > 0.001) {
              const pushDist = minDist - cDist;
              e.group.position.x += (cdx / cDist) * pushDist;
              e.group.position.z += (cdz / cDist) * pushDist;
            }
          }
        }
```

**New code (replace lines 6795-6824):**
```js
        } else if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;

          // BD-252: Atomic move-then-resolve -- calculate intended position,
          // resolve terrain collisions, THEN commit. Prevents zombies from
          // tunneling through obstacles across multiple frames.
          let newX = e.group.position.x + nx * eSpd * gameDt;
          let newZ = e.group.position.z + nz * eSpd * gameDt;

          // Clamp to map boundaries
          newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
          newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

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

          // Commit resolved position
          e.group.position.x = newX;
          e.group.position.z = newZ;
          e.group.rotation.y = Math.atan2(nx, nz);
        }
```

Note: The separate `// === ENEMY-TERRAIN COLLISION ===` block (old lines 6808-6824) is REMOVED entirely -- collision is now integrated into the movement above.

#### Step 2: Apply same pattern to flee behavior (lines 6783-6794)

**Current code (lines 6783-6794):**
```js
        if (e.fleeTimer > 0) {
          e.fleeTimer -= dt;
          const fdx = e.group.position.x - e.fleeFromX;
          const fdz = e.group.position.z - e.fleeFromZ;
          const fdist = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
          const eSpd = e.speed * st.totemSpeedMult * st.enemySpeedMult;
          e.group.position.x += (fdx / fdist) * eSpd * dt;
          e.group.position.z += (fdz / fdist) * eSpd * dt;
          // Clamp to map boundaries
          e.group.position.x = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.x));
          e.group.position.z = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.z));
          e.group.rotation.y = Math.atan2(fdx / fdist, fdz / fdist);
```

**New code (replace lines 6783-6794):**
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

          e.group.position.x = newX;
          e.group.position.z = newZ;
          e.group.rotation.y = Math.atan2(fdx / fdist, fdz / fdist);
```

#### Step 3: Verify boss zombies use the same movement path

Boss zombies go through the same enemy update loop (they are entries in `st.enemies[]` with `e.isBoss = true`). The movement code at lines 6773-6806 applies to all enemies regardless of boss status. No separate boss movement routine exists. The fix in Steps 1-2 automatically covers bosses. **No additional changes needed.**

#### DO NOT TOUCH
- `js/game3d.js` lines 4746-4748, 7805-7857 (death flow) -- owned by BD-251 (Agent A, already merged)
- `js/3d/hud.js` -- owned by BD-250 (Agent B) and BD-253 (Agent D)
- `js/3d/constants.js` -- owned by BD-253 (Agent D)
- `js/3d/terrain.js` -- read-only dependency, do not modify

#### Testing Plan
1. Observe zombies approaching through a forest -- they should visibly path around trees, not through them.
2. Position yourself behind a rock -- zombies should funnel around it from both sides.
3. Verify zombies still reach the player (no permanent stuck states).
4. Check that zombies cluster at terrain gaps -- merges should increase in dense terrain.
5. Performance test with 200+ zombies near terrain -- verify no FPS drop.
6. Test flee behavior (trigger a boss spawn) -- fleeing zombies should also respect terrain.
7. Verify boss zombie terrain collision works.
8. Run into open areas (no terrain) -- verify normal zombie movement speed and behavior is unchanged.

---

### 5D. BD-253: GIANT GROWTH powerup feels like a liability

**Priority:** P2
**Complexity:** S (Small)
**Files:** `js/3d/constants.js`, `js/3d/hud.js`
**Agent:** D (Batch 2)

#### Step 1: Reduce speed penalty in constants.js

**File:** `js/3d/constants.js` line 212

**Current code:**
```js
  { id: 'giantGrowth', name: 'GIANT GROWTH', color: '#22cc44', colorHex: 0x22cc44, desc: '2x Size & Dmg, -30% Speed', duration: 15, apply: s => { s.dmgBoost = 2; s.speedBoost = 0.7; s.giantMode = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.giantMode = false; } },
```

**New code:**
```js
  { id: 'giantGrowth', name: 'GIANT GROWTH', color: '#22cc44', colorHex: 0x22cc44, desc: '2x Size & Dmg, -15% Speed', duration: 15, apply: s => { s.dmgBoost = 2; s.speedBoost = 0.85; s.giantMode = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.giantMode = false; } },
```

**Changes:**
- `desc` changed from `'-30% Speed'` to `'-15% Speed'`
- `speedBoost` changed from `0.7` to `0.85`

#### Step 2: Add "DMG x2" subtitle to active powerup HUD indicator

**File:** `js/3d/hud.js` lines 219-229

**Current code (lines 219-229):**
```js
    if (s.activePowerup) {
      const pw = s.activePowerup;
      ctx.fillStyle = pw.def.color; ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`${pw.def.name} (${Math.ceil(pw.timer)}s)`, W / 2, 40);
      // Timer bar
      const barW = 150, barH = 12;
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - barW / 2, 46, barW, barH);
      ctx.fillStyle = pw.def.color;
      ctx.fillRect(W / 2 - barW / 2, 46, barW * (pw.timer / pw.def.duration), barH);
    }
```

**New code (replace lines 219-229):**
```js
    if (s.activePowerup) {
      const pw = s.activePowerup;
      ctx.fillStyle = pw.def.color; ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`${pw.def.name} (${Math.ceil(pw.timer)}s)`, W / 2, 40);
      // Timer bar
      const barW = 150, barH = 12;
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - barW / 2, 46, barW, barH);
      ctx.fillStyle = pw.def.color;
      ctx.fillRect(W / 2 - barW / 2, 46, barW * (pw.timer / pw.def.duration), barH);
      // BD-253: Show powerup effect subtitle for clarity
      if (pw.def.id === 'giantGrowth') {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText('DMG x2', W / 2, 72);
      }
    }
```

**Changes:**
- After the timer bar rendering (after `ctx.fillRect` for the colored bar), add 3 lines that render "DMG x2" in gold below the timer bar, only when the active powerup is `giantGrowth`.

#### What NOT to implement (out of scope)
- Screen shake on activation (requires camera offset system -- out of scope)
- Gold damage numbers (requires floating damage number system investigation -- skip if not already implemented)
- Knockback on contact (new physics behavior -- save for dedicated bead)
- Ground stomp VFX / dust particles (new particle system -- save for dedicated bead)
- Aura glow / emissive material (moderate effort for minor payoff -- skip)
- Damage resistance (design decision, not a bug fix -- flag for game designer)
- Accumulated damage counter (unnecessary if HUD subtitle provides clarity)

#### DO NOT TOUCH
- `js/game3d.js` -- owned by BD-251 (Agent A) and BD-252 (Agent C)
- `js/3d/hud.js` lines 1307-1457 (game-over screen) -- owned by BD-250 (Agent B)

#### Testing Plan
1. Pick up GIANT GROWTH -- verify movement speed feels manageable (not sluggish like before).
2. Verify "DMG x2" gold text appears below the timer bar during the effect.
3. Kill zombies during GIANT GROWTH -- verify they die noticeably faster (subjective but check).
4. Verify powerup expiry restores normal speed (1.0) and damage (1.0).
5. Verify the powerup description on pickup/HUD reads "-15% Speed" not "-30% Speed".
6. Pick up GIANT GROWTH while CLAWS OF STEEL is active -- document the overwrite behavior (known pre-existing bug in powerup stacking, not in scope for this bead).

---

## 6. Parallelization Opportunities Summary

```
TIME ──────────────────────────────────────────────────►

Batch 1:  [Agent A: BD-251 (game3d.js)]  ──merge──┐
          [Agent B: BD-250 (hud.js)]      ──merge──┤
                                                    ▼
Batch 2:  [Agent C: BD-252 (game3d.js)]  ──merge──┐
          [Agent D: BD-253 (constants.js + hud.js)] ──merge──┤
                                                              ▼
Post-merge integration QA
```

**Total agents:** 4 (2 per batch, 2 batches)
**Parallelism:** 2x within each batch
**Sequential dependency:** Batch 2 starts after Batch 1 is merged (both batches modify game3d.js and hud.js respectively)

---

## 7. Post-Sprint Integration QA

After all 4 agents are merged, run the following integration tests:

1. **Full death flow (BD-251 + BD-250):** Die in a game -- verify death animation plays, game-over screen appears with correct non-overlapping layout, name entry works, leaderboard displays, return to menu works.
2. **Death with menus open (BD-251):** Die while an upgrade menu, shrine menu, or wearable compare is active -- verify all menus are dismissed and death flow completes.
3. **Zombie funneling (BD-252):** Play a full game -- observe zombies navigating around terrain obstacles, clustering at gaps, merging more frequently near dense terrain.
4. **GIANT GROWTH feel (BD-253):** Pick up GIANT GROWTH during gameplay -- verify reduced speed penalty feels good, "DMG x2" subtitle is visible, and killing zombies feels noticeably faster.
5. **No regressions:** Verify upgrade menu selection, pause menu (ESC), shrine interaction, wearable compare, and normal zombie movement all work correctly.
6. **Performance:** Play until 200+ zombies are alive with terrain nearby -- verify no FPS regression from BD-252's collision changes.

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| BD-252 increases merge frequency, causing difficulty spike | Medium | Monitor post-merge playtesting. May need to reduce MERGE_RATIOS or increase merge distance threshold in a follow-up bead. |
| BD-252 zombies get stuck in dense terrain clusters | Low | The `cDist > 0.001` guard prevents zero-distance jitter. If testing reveals stuck zombies, add a second collision resolution pass (2 iterations). |
| BD-250 cursorY causes content to overflow off-screen at small window sizes | Low | The layout is designed for 800x600 minimum. If overflow occurs, add `Math.min(cursorY, H - 120)` guard before name entry section. |
| BD-253 powerup overlap bug (CLAWS OF STEEL + GIANT GROWTH) | Pre-existing | Not in scope for this sprint. Document during testing for a future powerup stacking bead. |
| BD-251 hud.js roundRect guard conflicts with BD-250 rewrite | Low | BD-250's rewrite should include the roundRect guard. Verify during merge. If both agents add it, keep BD-250's version (it is part of the comprehensive rewrite). |
