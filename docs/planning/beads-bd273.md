# BD-273: No player agency over item slot equipment — auto-equip with no choice

**Date:** 2026-02-28
**Source:** Manual playthrough — when picking up wearable items, there is no player choice about what goes in which slot. Items are auto-equipped or auto-replaced with no agency.

---

## P1 — UX / Player Agency

---

### BD-273: Players cannot choose which items to equip in wearable slots

**Category:** UX (player agency)
**Priority:** P1
**File(s):** `js/game3d.js` (wearable pickup logic), `js/3d/hud.js` (equipment UI)
**Related:** BD-199 (wearable pickup should offer choice, not auto-replace)

**Current Behavior:**
When a player picks up a wearable item, it is auto-equipped into the relevant slot (head/body/feet). If the slot is occupied, behavior is unclear — the item may auto-replace the existing one with no confirmation or comparison.

**Expected Behavior:**
Players should have agency over their equipment:
- When picking up a wearable for an empty slot: auto-equip is fine
- When picking up a wearable for an occupied slot: show a comparison UI letting the player choose to keep current or swap
- Ideally: an inventory/equipment screen accessible from pause menu where players can review and manage their equipped items

**Note:** BD-199 already tracks the "offer choice on replace" aspect. This bead broadens the scope to full item slot agency — the player should feel in control of their build at all times.

---

## Acceptance Criteria

1. Player is presented with a choice when picking up a wearable for an already-occupied slot
2. Comparison shows stats of current vs. new item clearly
3. Player can accept or reject the new item
4. Rejected items remain on the ground (or are converted to XP/score)
5. Empty slot pickups can remain auto-equip

---

## Estimated Complexity

M (Medium) — requires comparison UI, input handling for accept/reject, and pickup flow changes.
