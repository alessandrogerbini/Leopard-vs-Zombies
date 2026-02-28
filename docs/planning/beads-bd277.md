# BD-277: Waves need more spacing — add ~45 seconds between waves

**Date:** 2026-02-28
**Source:** Manual playthrough — waves feel too close together. Player needs more breathing room between wave events to explore, collect items, and recover.

---

## P2 — Balance / Pacing

---

### BD-277: Increase wave interval by ~45 seconds for better pacing

**Category:** Balance (pacing)
**Priority:** P2
**File(s):** `js/game3d.js` (wave timer / wave interval logic), `js/3d/constants.js` (if wave timing is defined there)

**Current Behavior:**
Waves arrive at a pace that feels too relentless, particularly in the early-mid game. Players don't have enough downtime between waves to explore the map, pick up items, break shrines, or simply catch their breath.

**Expected Behavior:**
Add approximately 45 seconds to the interval between wave events. The exact current interval should be checked and adjusted — the goal is a noticeable breather between waves where the player can roam and scavenge before the next onslaught.

**Design Intent:**
The game is a survivor roguelike for young players (7+). Pacing should alternate between tension (waves) and exploration (downtime). Currently the balance skews too heavily toward constant pressure.

---

## Acceptance Criteria

1. Wave interval increased by ~45 seconds from current value
2. Early waves (1-3) feel like they have genuine downtime between them
3. Late waves (7+) can have tighter spacing if desired (progressive compression is fine)
4. Wave notification gives adequate warning before each wave starts

---

## Estimated Complexity

XS (Trivial) — single constant or timer adjustment.
