# BD-280: Wearable items auto-equip with no player choice — overwrites better gear

**Date:** 2026-02-28
**Source:** Manual playthrough — picking up a wearable instantly equips it, overwriting whatever was in the slot. No comparison, no opt-out. Low-power items replace better ones with zero agency.
**Related:** BD-273 (no item slot agency), BD-199 (wearable pickup should offer choice)

---

## P1 — UX / Player Agency (CRITICAL)

---

### BD-280: Wearable pickup must show comparison and let player accept or reject

**Category:** UX (player agency)
**Priority:** P1
**File(s):** `js/game3d.js` (wearable pickup logic), `js/3d/hud.js` (comparison UI)

**Current Behavior:**
Walking over a wearable pickup instantly equips it into the corresponding slot (head/body/feet). If the slot is already occupied, the existing item is silently replaced. The player has no way to keep their current gear. This leads to frustrating downgrades — e.g., Knight Plate being replaced by Cardboard Box.

**Expected Behavior:**
- Empty slot: auto-equip is fine (no friction needed)
- Occupied slot: pause and show a side-by-side comparison card (current vs new) with Accept/Reject input
- Rejected items stay on the ground or convert to XP

**Note:** A wearable comparison UI (`st.wearableCompare`) already exists in code from BD-264. The issue is it may not be triggering, or the auto-equip path bypasses it entirely.

---

## Acceptance Criteria

1. Picking up a wearable for an occupied slot shows a comparison UI
2. Player can choose to keep current or swap to new
3. Rejected items remain available (don't vanish)
4. No silent gear downgrades
5. Empty slot pickups remain instant

---

## Estimated Complexity

S-M — comparison UI may already exist; the fix is ensuring the pickup path routes through it.
