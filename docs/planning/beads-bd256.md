# BD-256: P0 Investigation — Game-Over Screen Still Not Appearing After Death

## Status: INVESTIGATION COMPLETE

## Context
This is the THIRD report of the game-over screen failing to appear after player death in 3D mode. BD-251 was supposed to fix this by moving the death sequence tick outside the `!st.paused && !st.gameOver` gate. The user reports that after BD-251 and BD-252 merges, "the player dies, and the game just hangs."

## Exhaustive Code Audit Results

### What Was Checked (line numbers from current master, commit 31717c1)

#### 1. Death Sequence Tick (lines 4748-4779) — CORRECT
The death tick is at lines 4752-4779, OUTSIDE the `!st.paused && !st.gameOver` gate (line 4781). BD-251's move is correctly in place. The tick decrements `st.deathSequenceTimer` by `realDt`, and when the timer reaches 0, transitions to `st.gameOver = true`.

#### 2. Death Check (line 7870) — CORRECT
`if (st.hp <= 0 && !st.deathSequence && !st.gameOver)` is at line 7870, INSIDE the gate. This is correct — the death check should only fire during active gameplay. It sets `st.deathSequence = true`, force-clears all menus (upgradeMenu, paused, chargeShrineMenu, wearableCompare), and initializes the 1.5s death timer.

#### 3. `realDt` Variable Scope (line 4725) — CORRECT
`const realDt = dt` is defined at line 4725, before the death tick at line 4752. No scope issue. Note: `realDt` inherits item-slow dilation (dt * 0.5 if itemSlowTimer active), which could delay the death timer slightly but would not prevent it from completing.

#### 4. `playSound` Function — CORRECT
`playSound` (from `js/3d/audio.js`) is fail-silent. It has early returns for missing sound IDs, uninitialized audio, and muted state. It cannot throw an exception.

#### 5. Game-Over HUD Rendering (hud.js line 1312) — CORRECT
`if (s.gameOver)` block at line 1312 renders the full game-over screen (GAME OVER title, score, stats, feedback, name entry, leaderboard). The `drawHUD` call at game3d.js line 8007 runs OUTSIDE the gate, every frame. The BD-250 cursorY rewrite is intact and functional.

#### 6. Keydown Handler for Game-Over (line 720) — CORRECT
`if (st.gameOver && !st.upgradeMenu && inputState.enterReleasedSinceGameOver)` handles name entry, feedback navigation, and return-to-menu. BD-251's menu clearing ensures `st.upgradeMenu` is false when game-over fires.

#### 7. BD-252 Merge Impact — CLEAN
BD-252 (zombie terrain collision) only modified lines ~6819-6900, affecting zombie flee and movement code. `git diff 645f917..31717c1 -- js/game3d.js` confirms the changes are self-contained in the enemy AI movement section. No code was accidentally moved into or out of the pause gate.

#### 8. Menu Interference During Death — GUARDED
All pickup systems (XP gems line 7308, items line 7428, wearables line 7550, shrines line 7621, charge shrines line 7676) check `!st.deathSequence`. No menu can open during the death sequence.

#### 9. Regen/Heal During Death — GUARDED
All healing sources (augment regen line 7832, vampire heal line 5207, regen burst line 5394) check `!st.deathSequence && st.hp > 0`.

#### 10. Missing `st.pauseMenu` Clear — HARMLESS
BD-251 clears `st.upgradeMenu`, `st.paused`, `st.chargeShrineMenu`, and `st.wearableCompare` on death, but does NOT clear `st.pauseMenu`. However, `st.pauseMenu` cannot be set during death (ESC handler at line 914 checks `!st.deathSequence`), and the game-over input handler (line 720) doesn't check `st.pauseMenu`. So this is not the root cause.

#### 11. `bestCombo` State Variable — UNDEFINED BUT HARMLESS
`s.bestCombo` is referenced in hud.js line 1404 but never defined in the state object. `undefined >= 5` evaluates to `false`, so the block is silently skipped. Not a crash.

#### 12. No Try-Catch in tick() — RISK FACTOR
The `tick()` function has zero try-catch blocks. Any uncaught JavaScript exception will kill the `requestAnimationFrame` chain and the game will appear to "hang" (3D scene frozen, no HUD updates, no input response).

#### 13. Browser Caching — LIKELY ROOT CAUSE
`index.html` loads `js/game.js?v=5` with a version query, but all ES module imports within game.js (including `game3d.js`) have NO cache-busting parameters. Browsers cache ES modules aggressively. If the user has not performed a hard-refresh (Ctrl+Shift+R) or cleared the cache, they may be running a pre-BD-251 version of game3d.js where the death tick is still inside the pause gate.

## Root Cause Analysis

### Most Likely: Browser Cache (HIGH confidence)
The user is almost certainly running a cached pre-BD-251 version of `game3d.js`. The ES module import `from './game3d.js'` has no cache-busting query parameter, so browsers may serve the old file indefinitely.

### Possible: Silent Runtime Exception (MEDIUM confidence)
An uncaught exception in the tick function — perhaps from a Three.js operation, or from accessing a property on a disposed/removed mesh — could kill the animation loop entirely. Without try-catch, this is indistinguishable from "the game hangs." This would be intermittent and hard to reproduce from code reading alone.

### Ruled Out:
- Death tick placement (verified OUTSIDE gate)
- BD-252 merge regression (diff is clean)
- Variable scope issues (realDt defined before death tick)
- Menu interference during death (all guarded)
- HUD rendering (game-over block exists and is structurally correct)
- State initialization (all death-related vars properly initialized)

## Fix Plan

### Fix 1: Cache-Busting (CRITICAL — deploy immediately)

**File: `js/game.js` (line 72)**
```javascript
// BEFORE:
import { launch3DGame } from './game3d.js';

// AFTER:
import { launch3DGame } from './game3d.js?v=6';
```

Also bump ALL module imports in game.js with `?v=6`:
```javascript
import { ... } from './state.js?v=6';
import { ... } from './levels.js?v=6';
import { ... } from './utils.js?v=6';
import { ... } from './enemies.js?v=6';
import { ... } from './items.js?v=6';
import { ... } from './renderer.js?v=6';
import { launch3DGame } from './game3d.js?v=6';
```

And in `game3d.js` for its sub-module imports:
```javascript
import { ... } from './3d/constants.js?v=6';
import { ... } from './3d/utils.js?v=6';
import { ... } from './3d/terrain.js?v=6';
import { ... } from './3d/player-model.js?v=6';
import { ... } from './3d/hud.js?v=6';
import { ... } from './3d/audio.js?v=6';
```

And bump `index.html`:
```html
<script type="module" src="js/game.js?v=6"></script>
```

### Fix 2: Defensive `st.pauseMenu` Clear (LOW priority, completeness)

**File: `js/game3d.js` (line 7876, death start)**
Add `st.pauseMenu = false;` to the menu-clearing block.

**File: `js/game3d.js` (line 4769, game-over transition)**
Add `st.pauseMenu = false;` to the menu-clearing block.

### Fix 3: Diagnostic Console.logs (TEMPORARY — for verification)

Add the following temporary debug statements to verify the death flow in the browser console:

**File: `js/game3d.js`**

At death check (line 7870), add before the block:
```javascript
// BD-256 TEMP DEBUG — remove after verification
if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
  console.log('[BD-256] DEATH CHECK FIRED: hp=' + st.hp + ' paused=' + st.paused + ' upgradeMenu=' + st.upgradeMenu);
```

At death tick entry (line 4752), add:
```javascript
if (st.deathSequence && !st.gameOver) {
  console.log('[BD-256] DEATH TICK: timer=' + st.deathSequenceTimer.toFixed(3) + ' realDt=' + realDt.toFixed(4));
```

At game-over transition (line 4765), add:
```javascript
if (st.deathSequenceTimer <= 0) {
  console.log('[BD-256] GAME OVER TRANSITION: setting st.gameOver=true');
```

At drawHUD game-over section (hud.js line 1312), add:
```javascript
if (s.gameOver) {
  console.log('[BD-256] HUD DRAWING GAME OVER SCREEN');
```

### Fix 4: Tick Error Protection (RECOMMENDED — prevents silent hangs)

Wrap the tick function body in try-catch to prevent silent death of the animation loop:

**File: `js/game3d.js` (line 4711)**
```javascript
function tick() {
  if (!st.running) return;
  animId = requestAnimationFrame(tick);
  try {
    // ... entire tick body ...
  } catch (err) {
    console.error('[tick] Uncaught exception in game loop:', err);
    // Continue running — don't let one bad frame kill the game
  }
}
```

## Verification Steps

1. Apply Fix 1 (cache busting) and hard-refresh the browser
2. If the game-over screen now appears: **root cause confirmed as browser cache**
3. If still broken: Apply Fix 3 (console.logs) and check browser console
   - If no `[BD-256] DEATH CHECK FIRED` log appears when HP reaches 0: the death check is not being reached (gate issue or HP never actually reaches 0)
   - If `DEATH CHECK FIRED` appears but no `DEATH TICK` logs: deathSequence is being reset somewhere
   - If `DEATH TICK` logs appear but timer never reaches 0: realDt is 0 or the animation loop is dying
   - If `GAME OVER TRANSITION` fires but no HUD drawing: the HUD is not rendering (canvas issue)
4. Apply Fix 4 (try-catch) to prevent future silent hangs regardless of root cause

## Impact Assessment

- **Fix 1** is zero-risk and should be deployed immediately
- **Fix 2** is defensive hardening, zero-risk
- **Fix 3** is temporary diagnostic, remove after verification
- **Fix 4** is a permanent safety net against any future tick-killing exceptions
