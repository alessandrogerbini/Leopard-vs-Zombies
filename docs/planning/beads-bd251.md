# BD-251: Death does not transition to leaderboard / name-entry screen

**Status: PARTIALLY RESOLVED / REGRESSED** (2026-02-28) — Fix was successfully applied and worked, but the death-screen hang has regressed and is currently happening again. See BD-267 for latest report. The underlying fix (moving death tick outside pause gate) remains correct; the regression is likely a different root cause.

**Date:** 2026-02-27
**Source:** Manual playthrough — player dies (HP shows 0/131) but the game never shows the game-over / name-entry / leaderboard screen. The game continues rendering the gameplay view with the dead player standing in place.
**Related:** BD-249 (detailed root-cause investigation of game-over hang)

---

## P0 — Game-Breaking Bug

---

### BD-251: Player reaches 0 HP but death sequence / game-over screen never triggers

**Category:** Bug (game-over flow)
**Priority:** P0
**File(s):** `js/game3d.js` (~lines 4748, 7805-7857)

**Symptom:**
After taking lethal damage in 3D mode, the HUD shows "HP: 0/131" but the game continues running normally — no death slow-motion animation, no "GAME OVER" overlay, no name entry, no leaderboard. The player character stands idle while zombies continue attacking. The game is a dead end requiring a browser refresh.

**Screenshot evidence:** Player at HP: 0/131 with GIANT GROWTH (15s) active, LVL 8, normal gameplay HUD still rendering. No death sequence triggered.

**Root Cause (from BD-249 investigation):**

The death check at line 7805 and the death sequence timer at line 7834 both live INSIDE the `if (!st.paused && !st.gameOver)` game logic block (line 4748). Two failure modes prevent the death flow from completing:

1. **Menu race condition:** If `showUpgradeMenu()` fires in the same frame as HP reaching 0 (XP gem level-up at line 7259 runs before death check at line 7805), `st.paused = true` blocks the death sequence timer from ticking in subsequent frames. The death animation either never starts or freezes permanently.

2. **Death sequence frozen by pause:** Even if the death check triggers, the 1.5s timer runs inside the `!st.paused` gate. Any pause source (upgrade menu, charge shrine, wearable compare) freezes it.

**Fix (consolidated from BD-249):**

1. **Move death sequence tick outside the pause gate** — Place the `if (st.deathSequence && !st.gameOver)` block (lines 7834-7857) after line 4746 (alongside the cooldown tick), so it runs regardless of pause state.

2. **Force-close menus on death** — When `st.hp <= 0` triggers the death sequence (line 7805), also set `st.upgradeMenu = false; st.paused = false; st.chargeShrineMenu = false; st.wearableCompare = false;` — death overrides everything.

3. **Force-close menus on game-over transition** — When `st.deathSequenceTimer <= 0` (line 7847), repeat the same menu clears to ensure the game-over screen is never blocked.

**Acceptance Criteria:**
- Player always enters death sequence when HP reaches 0, regardless of active menus
- Death animation always completes (1.5s), even if an upgrade menu was open
- Game-over overlay always renders after death animation
- Name entry always accepts keyboard input
- No menu can overlay or block the game-over screen
- Returning to menu via Enter works after saving name

---

## Conflict Analysis

Supercedes BD-249 (same issue, same fix). No conflicts with BD-250 (game-over text layout — complementary HUD fix).

---

## Review Notes

**Reviewer:** Code review (2026-02-27)

### Root Cause Assessment
Sound and confirmed. The two failure modes are verified by reading the source:

1. **Menu race condition (confirmed):** Line 7259 calls `showUpgradeMenu()` which sets `st.paused = true` at line 4513. This happens BEFORE the death check at line 7805 in the same frame's execution order (XP gem collection at ~7250 precedes death check at ~7805). If the player levels up and dies in the same frame, `st.paused` blocks the death sequence.

2. **Pause gate blocking death timer (confirmed):** Lines 7834-7857 (death sequence tick) are inside the `if (!st.paused && !st.gameOver)` block starting at line 4748. Any pause source freezes the death timer permanently.

### Recommended Solution Approach
All three fix steps from the bead are correct. Implement in this order:

**Step 1 — Move death sequence tick outside the pause gate (highest impact).**
Extract the `if (st.deathSequence && !st.gameOver)` block (lines 7834-7857) and place it after line 4746 (after the `nameEntryInputCooldown` tick), before the `if (!st.paused && !st.gameOver)` gate. This ensures the death timer always ticks regardless of pause state. Use `realDt` for the timer (already correct in current code).

**Step 2 — Force-close menus on death START (line 7805).**
When `st.hp <= 0` triggers, add:
```js
st.upgradeMenu = false;
st.paused = false;
st.chargeShrineMenu = false;
st.wearableCompare = false;
```
This prevents the confusing "upgrade menu overlaying death animation" scenario.

**Step 3 — Force-close menus on game-over transition (line 7847).**
Belt-and-suspenders: repeat the same clears when `st.deathSequenceTimer <= 0`. This catches any menu that somehow opened during the death sequence (e.g., if a delayed callback or event fires).

### Additional Edge Cases / Risks
- **Death during charge shrine interaction:** If the player is taking shrine damage (3 HP hits) and this kills them while `st.chargeShrineMenu` is true, the same race condition applies. Step 2 covers this.
- **Death during pause menu (ESC):** The ESC pause menu also sets `st.paused = true`. However, the death check at line 7805 is inside the `!st.paused` gate, so death cannot trigger while manually paused. This is correct behavior — no issue here.
- **Multiple showUpgradeMenu calls:** If the player collects enough XP for two level-ups in one frame, `showUpgradeMenu()` is called once (the second level-up would require more XP). No double-call risk.
- **Death sequence timer using realDt:** Currently line 7835 uses `realDt` which is correct — the death timer should tick at real-world speed, not game-time speed. Verify this is preserved after the move.
- **`roundRect` fallback (from BD-249 Suspect 3):** Add the defensive `ctx.roundRect` guard in hud.js line 1353 as part of this fix. It is a one-line change that prevents a silent HUD crash on older browsers. Include it here rather than as a separate task.

### Estimated Complexity
S (Small) — ~15 lines of changes across two locations in game3d.js, plus the 3-line roundRect fallback in hud.js. No architectural refactoring needed.

### Dependencies
- None. This is the highest priority bead and should be implemented first.
- BD-250 (layout fix) is complementary but independent.

### Implementation Order
**Priority 1 of this batch.** This is P0 game-breaking. Implement before BD-250, BD-252, BD-253.

### Testing Plan
1. Normal death (let zombies kill you) — verify game-over screen appears after 1.5s death animation.
2. Death while upgrade menu is open — force by dying at low HP while collecting XP gems near enemies. Verify upgrade menu is dismissed and death sequence plays.
3. Death while near a shrine — verify shrine menu is dismissed.
4. Verify name entry accepts keyboard input and Enter saves to leaderboard.
5. Verify returning to main menu works after leaderboard display.
