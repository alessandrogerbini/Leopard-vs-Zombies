# BD-267: Death animation STILL not transitioning to game-over/leaderboard (5th report)

**Date:** 2026-02-28
**Source:** Manual playthrough — after dying, the death slow-motion plays but the game never transitions to the game-over screen with name entry and leaderboard. This is the 5th report of this symptom (BD-228, BD-251, BD-256, BD-258, now BD-267).

---

## P0 — Critical / Game-Breaking

---

### BD-267: Death→game-over transition still failing despite BD-258 try-catch

**Category:** Bug (game-breaking, recurring)
**Priority:** P0
**File(s):** `js/game3d.js` (death sequence tick ~line 4958, game-over transition ~line 4975)

**History:**
- BD-228: Introduced 1.5s death slow-motion
- BD-251: Moved death tick outside pause gate
- BD-256: Added cache-busting + cleared pauseMenu
- BD-258: Added try-catch to tick(), fixed realDt contamination, cache v=8
- BD-267: Still not working

**Key question:** BD-258 added try-catch around tick(). If the death timer code throws, the error would be logged to console but the game would continue (next frame retries). If it's NOT throwing, the death timer should count down and transition. So either:

1. **The try-catch IS catching an error** — check browser console for `[tick] Uncaught exception` messages
2. **The death sequence timer is being reset** — something sets `st.deathSequence = false` before the timer expires
3. **A menu opens during death** — despite guards, a menu sets `st.paused = true` and some code path checks `st.paused` before the game-over transition
4. **The game-over HUD rendering fails** — `st.gameOver` is set to `true` but `drawHUD` throws when trying to render the game-over screen, caught by try-catch

**Immediate diagnostic fix:**

Add console.log statements to trace the death flow:

```js
// At death check (~line 8091):
if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
  console.log('[BD-267] DEATH TRIGGERED');

// At death tick (~line 4962):
if (st.deathSequence && !st.gameOver) {
  console.log('[BD-267] DEATH TICK: timer=' + st.deathSequenceTimer.toFixed(2));

// At game-over transition (~line 4975):
if (st.deathSequenceTimer <= 0) {
  console.log('[BD-267] GAME OVER TRANSITION');

// At game-over HUD rendering (hud.js ~line 1312):
if (s.gameOver) {
  console.log('[BD-267] RENDERING GAME OVER SCREEN');
```

Then check browser console (F12) to see which log appears last before the hang.

**Fallback fix — force game-over after timeout:**

If the death timer gets stuck for any reason, add a hard timeout:

```js
// At the start of tick(), before the pause gate:
if (st.deathSequence && !st.gameOver && st.gameTime > st._deathStartTime + 5) {
  // Emergency: death sequence has been running for 5+ seconds, force game-over
  console.error('[BD-267] EMERGENCY: Death sequence stuck, forcing game-over');
  st.gameOver = true;
  st.deathSequence = false;
  // ... same cleanup as normal transition
}
```

This ensures the player ALWAYS reaches the game-over screen, even if the normal timer fails.

---

## Acceptance Criteria

1. Player death ALWAYS transitions to game-over screen
2. Emergency timeout catches any stuck death sequences
3. Console logs aid diagnosis of root cause

---

## Estimated Complexity

S (Small) — diagnostic logs + emergency timeout fallback.
