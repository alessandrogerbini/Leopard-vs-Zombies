# BD-286: Time Warp powerup speeds up time after expiry — dangerous catch-up mechanic

**Date:** 2026-02-28
**Source:** Manual playthrough — the Time Warp powerup slows everything down (great!), but when it expires, time speeds UP beyond normal speed to "catch up." Zombies move faster than normal, which is extremely dangerous and feels punishing. The slow-down benefit is negated by the speed-up payback.

---

## P1 — Balance / Design (FEELS TERRIBLE)

---

### BD-286: Time Warp catch-up acceleration after expiry must be removed or heavily nerfed

**Category:** Balance / Design (powerup feel)
**Priority:** P1
**File(s):** `js/game3d.js` (time warp / item slow timer logic)

**Current Behavior:**
When the Time Warp / item-slow-timer expires, the game appears to accelerate beyond 1.0x speed to compensate for the lost time. Zombies move noticeably faster than normal. This creates a "debt" that the player pays after the powerup ends, making the powerup feel like a net negative — the slow-down is fun, but the speed-up gets you killed.

**Expected Behavior:**
When Time Warp expires, game speed should return to exactly 1.0x (normal). No catch-up, no acceleration, no debt. The slow-down is the reward, period. Time that "passed slowly" is just gone — the player benefited from extra reaction time and that's the end of it.

**Suspected Root Cause:**
The `itemSlowTimer` system in the tick function applies `dt *= 0.5` while active. If there's a corresponding acceleration phase (e.g., `dt *= 1.5` or `dt *= 2.0`) after the timer expires to "make up" the lost frames, that's the bug. Alternatively, if the game uses accumulated time that needs to "catch up" when the dilation ends, that would cause the same symptom.

---

## Fix Approach

1. Find the `itemSlowTimer` expiry logic in game3d.js tick()
2. Remove any catch-up / acceleration / debt mechanic
3. When timer hits 0, simply stop applying the 0.5x multiplier — `dt` returns to normal raw value
4. Verify no other system accumulates "owed time" that gets replayed

---

## Acceptance Criteria

1. Time Warp expiry returns game to exactly 1.0x speed — no faster, no slower
2. No catch-up acceleration after any slow-motion effect
3. Zombies move at normal speed after Time Warp ends
4. The powerup feels purely beneficial — slow-down with no payback penalty
5. No impact on death sequence slow-motion (separate system)

---

## Estimated Complexity

XS-S — remove the catch-up logic (likely a few lines in the dt calculation block).
