# BD-258: Death sequence hangs AGAIN — game-over screen never appears (4th report)

**Status: FIX APPLIED BUT ISSUE HAS REGRESSED** (2026-02-28) — try-catch and realDt fixes were applied and worked, but the death-screen hang has returned again. See BD-267 for the active tracking bead.

**Date:** 2026-02-28
**Source:** Manual playthrough — after dying in 3D mode, the game hangs on the death slow-motion scene. Player never reaches the game-over/leaderboard screen and cannot restart. This is the FOURTH report of this same symptom:
- BD-228 introduced the 1.5s death slow-motion sequence
- BD-251 moved the death tick outside the `!st.paused` gate (first fix)
- BD-256 added cache-busting to v=7 and cleared `st.pauseMenu` on death (second fix)
- BD-258 (this bead) — still happening

---

## P0 — Critical / Game-Breaking

---

### BD-258: Death→game-over transition fails intermittently — no try-catch in tick loop

**Category:** Bug (game-breaking, intermittent)
**Priority:** P0
**File(s):** `js/game3d.js` (~line 4921 tick function, ~line 4926 realDt calculation)

**Symptom:**
Player HP reaches 0, the death slow-motion sequence begins (screen slows, death audio plays), then the game freezes. The 1.5s death timer never completes. The game-over screen (leaderboard, name entry, feedback) never appears. The only escape is refreshing the browser.

---

## Code Audit

### What's CORRECT (BD-251 and BD-256 fixes are intact):

1. **Death tick is OUTSIDE the pause gate** (line 4958-4990) — `st.paused` cannot block the countdown.
2. **Death check fires correctly** (line 8091) — `st.hp <= 0 && !st.deathSequence && !st.gameOver` inside the game logic gate.
3. **All menus force-cleared on death start** (line 8094-8101) — upgradeMenu, paused, pauseMenu, chargeShrineMenu, wearableCompare all set to false.
4. **All menus guarded during death** — ESC handler (line 914), upgrade menu (line 7569), wearable compare (line 7649), shrine charge (line 7897) all check `!st.deathSequence`.
5. **Game-over transition at timer=0** (line 4975-4989) — sets `st.gameOver = true`, clears all menus again, initializes name entry.
6. **drawHUD() runs outside the gate** (line 8229) — will render the game-over screen when `st.gameOver` is true.
7. **Cache-busting at v=7** — all module imports in index.html, game.js, and game3d.js use `?v=7`.
8. **`st.deathSequence` is only set in two places**: `true` at line 8093 (death start), `false` at line 4977 (game-over transition). No accidental resets.

### What's WRONG:

#### Issue 1: No try-catch in tick() — silent exceptions kill the game loop (ROOT CAUSE)

**File:** `js/game3d.js` line 4921

```js
function tick() {
  if (!st.running) return;
  animId = requestAnimationFrame(tick);
  // ... ~3300 lines of game logic with ZERO error handling ...
}
```

The `tick()` function is ~3300 lines of game logic with **zero try-catch blocks**. If ANY JavaScript exception occurs — a null reference, an undefined property access, a disposed Three.js mesh, an array index out of bounds — the exception propagates up, `requestAnimationFrame(tick)` never fires for the next frame, and the game silently freezes.

**This explains the pattern perfectly:**
- The bug is **intermittent** — it depends on which code paths execute during the death sequence (which enemies are alive, which projectiles are in flight, which terrain chunks are loading)
- Previous fixes (BD-251, BD-256) addressed **specific state logic issues** that could cause the hang. Those were real bugs. But after fixing them, a DIFFERENT exception in a DIFFERENT code path causes the same symptom.
- The game loop runs ~3300 lines per frame. During the death sequence, most of that code still executes (enemies move, projectiles update, terrain chunks load/unload, effects animate). Any one of those systems can throw.

**Evidence this is the cause:**
- The death sequence code (lines 4958-4990) is structurally sound — state logic is correct.
- All five prior fixes addressed state logic, yet the bug recurs. State logic is not the pattern.
- The symptom ("game hangs") is exactly what an uncaught exception in `requestAnimationFrame` looks like — the scene freezes, no UI updates, no input response.
- Without a browser console open, the exception is invisible to the user.

#### Issue 2: `realDt` is contaminated by item slow timer (MINOR)

**File:** `js/game3d.js` lines 4926-4935

```js
let dt = Math.min(clock.getDelta(), 0.05);

// Item pickup time-dilation (BD-147)
if (st.itemSlowTimer > 0) {
  st.itemSlowTimer -= dt;
  dt *= 0.5; // half speed for dramatic moment
}

// BD-228: Death sequence time scaling
const realDt = dt; // ← THIS IS AFTER dt *= 0.5!
```

The comment says `realDt` is "always real-time" but it's calculated AFTER `dt` is halved by the item slow timer. During the death sequence, `realDt` is used to decrement `deathSequenceTimer` (line 4963). If `itemSlowTimer` is still active from a pickup just before death, the death timer runs at half speed (3s instead of 1.5s).

This won't PREVENT game-over (the timer still reaches 0 eventually), but it makes the death sequence feel broken — the slow-mo lasts twice as long as intended. Item pickups are guarded during death (line 7649), but `itemSlowTimer` from a pre-death pickup can persist into the death sequence.

---

## Fix Plan

### Fix 1: Wrap tick() body in try-catch (CRITICAL)

**File:** `js/game3d.js` line 4921

```js
function tick() {
  if (!st.running) return;
  animId = requestAnimationFrame(tick);
  try {
    // ... entire existing tick body ...
  } catch (err) {
    console.error('[tick] Uncaught exception in game loop:', err);
    // Don't let one bad frame kill the game — loop continues next frame
  }
}
```

This is the **essential fix**. It prevents ANY exception from killing the animation loop. The game will skip the bad frame and continue. If the exception is in the death timer logic, the next frame will retry. If it's in a rendering path, the scene may glitch for one frame but recover.

The `requestAnimationFrame(tick)` call is already at the TOP of tick() (line 4923), before any game logic. This means even if the current frame throws, the next frame is already scheduled. The try-catch ensures the exception is caught and logged rather than propagating.

### Fix 2: Calculate true realDt before item slow dilation (MINOR)

**File:** `js/game3d.js` lines 4926-4936

```js
// BEFORE:
let dt = Math.min(clock.getDelta(), 0.05);
if (st.itemSlowTimer > 0) {
  st.itemSlowTimer -= dt;
  dt *= 0.5;
}
const realDt = dt;
const gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1);

// AFTER:
const rawDt = Math.min(clock.getDelta(), 0.05);
let dt = rawDt;
if (st.itemSlowTimer > 0) {
  st.itemSlowTimer -= rawDt;
  dt *= 0.5;
}
const realDt = rawDt; // TRUE real-time delta, unaffected by any dilation
const gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1);
```

This ensures `realDt` is the actual wall-clock delta, not dilated by item slow timer. The death sequence timer, FPS counter, and name entry cooldown all use `realDt` and should run at real-time speed.

### Fix 3: Bump cache-busting to v=8

**Files:** `index.html`, `js/game.js`, `js/game3d.js`

Bump all `?v=7` to `?v=8` to ensure browsers load the fixed code.

---

## Acceptance Criteria

1. Player death ALWAYS transitions to the game-over screen after 1.5s, regardless of game state
2. If a runtime exception occurs during any frame, the game loop continues and logs the error to console
3. Death sequence timer is not affected by item slow-motion pickup timing
4. No regression in normal gameplay, pause behavior, or menu interactions
5. Browser console shows `[tick] Uncaught exception` if an error occurs (aids future debugging)

---

## Conflict Analysis

No conflicts with other beads. Changes touch:
- `js/game3d.js` — tick() function wrapper (lines 4921-4923), dt/realDt calculation (lines 4926-4936)
- `index.html`, `js/game.js`, `js/game3d.js` — cache-busting version bumps

Independent of BD-249 through BD-257.

---

## Why This Keeps Recurring

Previous beads fixed **specific causes** (menu blocking the gate, missing pauseMenu clear, stale browser cache). Each was a real bug. But the underlying fragility is that a ~3300-line function with zero error handling runs 60 times per second. During the death sequence — when enemies, projectiles, terrain, and effects are all still active — any one of dozens of code paths can throw an exception that silently kills the loop. Each time we fix one throw site, a different one surfaces.

The try-catch is not a band-aid — it's the **correct architectural fix**. Game loops in production games universally use error boundaries to prevent one bad frame from crashing the entire game. The specific exceptions can then be diagnosed from console logs and fixed individually, without the player ever experiencing a hang.

---

## Estimated Complexity

S (Small) — try-catch wrapper around tick body, realDt calculation reorder, cache-bust version bump.
