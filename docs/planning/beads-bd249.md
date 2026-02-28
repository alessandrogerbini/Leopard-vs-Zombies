# BD-249: Game-over screen hangs after death animation — can't enter name

**Date:** 2026-02-27
**Source:** Manual playthrough — after dying in 3D mode, the death slow-mo animation plays correctly but the game never transitions to a usable name-entry screen. The player is stuck and cannot enter their name on the leaderboard.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |

---

## P0 — Game-Breaking Bug

---

### BD-249: Game-over screen hangs after death — name entry unreachable

**Category:** Bug (game-over flow)
**Priority:** P0
**File(s):** `js/game3d.js` (death→game-over transition ~7847, input handler ~720, cooldown tick ~4739), `js/3d/hud.js` (game-over overlay ~1307)

**Symptom:**
After the player dies in 3D mode, the 1.5-second death slow-motion animation (BD-228) plays correctly and it's visually obvious the player has died. However, the game then "hangs" — the player never reaches the name-entry / leaderboard screen and cannot interact further. The game is stuck.

**Expected Flow (from code analysis):**
1. HP <= 0 → `st.deathSequence = true`, timer = 1.5s (line 7805)
2. 1.5s slow-motion death animation plays (line 7834, timer ticks via `realDt`)
3. Timer reaches 0 → `st.gameOver = true`, `st.nameEntryActive = true`, `nameEntryInputCooldown = 0.3` (line 7847)
4. Cooldown ticks outside `!st.gameOver` gate (line 4739) → expires after 300ms
5. `inputState.enterReleasedSinceGameOver` auto-unlocked (line 4744, BD-193)
6. HUD draws game-over overlay with name entry (hud.js line 1307)
7. Player types name → Enter to save → leaderboard → Enter to return

**Investigation — Most Likely Root Causes:**

### Suspect 1: `st.upgradeMenu` stuck true during game-over (blocks ALL input)

Line 720 gates game-over input:
```js
if (st.gameOver && !st.upgradeMenu && inputState.enterReleasedSinceGameOver)
```
If `st.upgradeMenu` is `true` when `st.gameOver` becomes `true`, the player can NEVER interact with the game-over screen — all input is permanently blocked.

**How this happens:** In a single frame, XP gem collection triggers `showUpgradeMenu()` (line 7259, sets `st.upgradeMenu = true` and `st.paused = true`) BEFORE the death check at line 7805. If the player's HP was already 0 from earlier damage in the same frame:
1. XP gem collected → level up → `showUpgradeMenu()` → `st.paused = true`, `st.upgradeMenu = true`
2. Death check fires (same frame, code is already inside the `!st.paused` block) → `st.deathSequence = true`
3. Next frame: `!st.paused` fails → entire game logic block skipped → death sequence timer frozen
4. Upgrade menu renders on top of frozen death animation
5. If player selects upgrade: `st.paused = false`, `st.upgradeMenu = false` → death sequence resumes → game-over triggers → input works
6. **But if the player doesn't understand they need to pick an upgrade first (upgrade menu over death animation is deeply confusing), they perceive the game as hung**

**Fix for Suspect 1:** When `st.gameOver` is set to `true` (line 7847), force-clear `st.upgradeMenu`, `st.paused`, `st.chargeShrineMenu`, and `st.wearableCompare`:
```js
if (st.deathSequenceTimer <= 0) {
  st.gameOver = true;
  st.deathSequence = false;
  st.showFullMap = false;
  st.upgradeMenu = false;       // BD-249: force-clear menus
  st.paused = false;            // BD-249: unpause for game-over
  st.chargeShrineMenu = false;  // BD-249: clear shrine menu
  st.wearableCompare = false;   // BD-249: clear wearable compare
  inputState.enterReleasedSinceGameOver = false;
  st.nameEntryActive = true;
  st.nameEntry = '';
  st.nameEntryInputCooldown = 0.3;
}
```

### Suspect 2: Death sequence timer never completes (`st.paused` blocks tick)

The death sequence timer tick (line 7834) is inside the `if (!st.paused && !st.gameOver)` block (starts line 4748). If `st.paused` is `true` (from an upgrade menu, charge shrine menu, or wearable compare opened in the same frame as death), the timer NEVER ticks and the death animation freezes permanently.

**Fix for Suspect 2:** Move the death sequence tick OUTSIDE the `!st.paused` gate, alongside the cooldown tick (line 4737). The death sequence should always run regardless of pause state:
```js
// BD-249: Death sequence tick runs outside pause gate (like BD-189 cooldown fix)
if (st.deathSequence && !st.gameOver) {
  st.deathSequenceTimer -= realDt;
  // ... (existing ramp + transition logic)
}
```

### Suspect 3: JavaScript error in HUD prevents game-over overlay from rendering

If any code between `drawHUD` entry (hud.js line 120) and the game-over section (line 1307) throws an error during the game-over state, the overlay never renders. The 3D scene continues to display the final death frame, but without the overlay it looks "hung."

Specific risk: `ctx.roundRect()` at hud.js line 1353 — relatively new Canvas API. If the browser doesn't support it, it throws inside the game-over section itself.

**Fix for Suspect 3:** Wrap `roundRect` in a fallback:
```js
if (ctx.roundRect) {
  ctx.roundRect(pillX, pillY, pillW, pillH, 6);
} else {
  ctx.rect(pillX, pillY, pillW, pillH);
}
```

### Suspect 4: `inputState.enterReleasedSinceGameOver` never becomes true

Even after BD-189/BD-193 fixes, if there's a code path where `nameEntryInputCooldown` is reset or the auto-unlock at line 4744 doesn't fire, input is permanently blocked. Debug by adding a temporary `console.log` in the cooldown tick to verify it expires.

**Reproduction Steps:**
1. Start a 3D game (any animal, any difficulty)
2. Die (let zombies kill you)
3. Death slow-motion animation plays
4. After animation completes — observe whether:
   a. The "GAME OVER" dark overlay appears (HUD rendering works)
   b. The "ENTER YOUR NAME" prompt and blinking cursor are visible
   c. Typing produces characters in the name field
   d. If none of the above: check browser console for JavaScript errors

**Fix Approach (Priority Order):**

1. **Guard the game-over transition** (Suspect 1+2, most impactful) — When `st.deathSequenceTimer <= 0` triggers the game-over state at line 7847, force-clear ALL menu states (`upgradeMenu`, `paused`, `chargeShrineMenu`, `wearableCompare`) so no menu can block the game-over flow.

2. **Move death sequence tick outside pause gate** (Suspect 2) — Relocate the `if (st.deathSequence && !st.gameOver)` block from inside the `!st.paused && !st.gameOver` gate to just after the cooldown tick at line 4746. This ensures the death animation always completes even if a menu paused the game.

3. **Also guard the death sequence START** — At line 7805, when `st.hp <= 0` is detected:
   - Force-close any open menus: `st.upgradeMenu = false; st.paused = false;`
   - This prevents the confusing "upgrade menu over death animation" scenario entirely

4. **Add `roundRect` fallback** (Suspect 3) — Defensive guard at hud.js line 1353.

5. **Add debug logging** (temporary) — Log `st.gameOver`, `st.upgradeMenu`, `st.paused`, `inputState.enterReleasedSinceGameOver`, and `st.nameEntryInputCooldown` to console when the game-over transition fires, to catch edge cases in testing.

**Acceptance Criteria:**
- After dying (any method: zombie contact, poison pool, any tier), the game-over screen always appears after the death animation
- The "ENTER YOUR NAME" prompt is visible and accepts keyboard input
- No menu (upgrade, shrine, wearable) can block or overlay the game-over screen
- Death animation always completes (never frozen by pause state)
- The 300ms input guard still prevents WASD leaking into name entry
- Pressing Enter after typing a name saves to leaderboard
- Pressing Enter on leaderboard screen returns to main menu
- No regressions to upgrade menu, pause menu, or shrine interaction

---

## Conflict Analysis

This bead has **no conflicts** with BD-246/247/248 (code review, agent workflow). The changes are localized to the death→game-over transition in `game3d.js` (lines 7805-7857) and a defensive guard in `hud.js` (line 1353). Safe to implement immediately.

## Related Beads

- **BD-189** — Game-over input freeze (cooldown never expired) — FIXED, but this bead addresses additional failure modes
- **BD-193** — Auto-unlock game-over input when cooldown expires — FIXED
- **BD-228** — Death sequence slow-motion animation — the animation this bead's transition follows
- **BD-213** — Name entry accepts all printable keys

---

## Review Notes

**Reviewer:** Code review (2026-02-27)
**Status:** SUPERCEDED by BD-251 — do NOT implement separately.

### Root Cause Assessment
The investigation is thorough and sound. All four suspects are plausible. Suspect 1+2 (menu race condition + pause gate blocking death timer) are confirmed by code inspection:
- `showUpgradeMenu()` at line 7259 sets `st.paused = true` BEFORE the death check at line 7805 (same frame).
- Lines 7834-7857 (death sequence tick) are inside the `if (!st.paused && !st.gameOver)` gate at line 4748, confirmed by reading the source.
- Suspect 3 (`roundRect`) is a valid defensive concern but unlikely to be the primary cause.
- Suspect 4 (enterReleasedSinceGameOver) is already fixed by BD-193's auto-unlock.

### Consolidation
BD-251 supercedes this bead with the same root cause and same fix, written more concisely. All implementation should happen under BD-251. This bead should be kept as the detailed investigation reference but marked CLOSED/SUPERCEDED.

### Additional Edge Cases Identified
- **Charge shrine menu:** `st.chargeShrineMenu = true` also sets `st.paused = true` (similar race if player dies while near a shrine). BD-249's fix correctly includes this but BD-251's fix should too.
- **Wearable compare:** Same pattern — `st.wearableCompare` can pause the game.
- **Double-death guard:** The `!st.deathSequence` check at line 7805 prevents re-entry, which is correct. No issue here.

### Estimated Complexity
S (Small) — the fix is ~10 lines of state clearing + moving one code block outside a gate. No architectural changes.

### Implementation Order
Implement under BD-251 only. BD-249 is reference material.
