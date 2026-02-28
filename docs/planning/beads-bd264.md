# BD-264: Item fanfare must cover wearable items with clear slot-replacement UI

**Date:** 2026-02-28
**Source:** Manual playthrough — the BD-260 item fanfare (slot-machine reveal + showcase card) needs to fully handle wearable/equippable items. When picking up a non-stackable item and the slot is already occupied, the fanfare must clearly communicate that you are REPLACING the equipped item, not just adding something new.

---

## P1 — UX / Feature Extension

---

### BD-264: Extend item fanfare to wearable slot-replacement with clear REPLACE messaging

**Category:** UX (item system, clarity)
**Priority:** P1
**File(s):** `js/game3d.js` (item fanfare flow, applyItemFanfareChoice), `js/3d/hud.js` (fanfare showcase rendering)

**Context:**
BD-260 added the item fanfare system. It handles:
- Stackable items: showcase card shows count increase (x2 → x3)
- Non-stackable items (empty slot): showcase card, ENTER to equip
- Non-stackable items (slot occupied): comparison view with KEEP/EQUIP choice

The user reports the slot-replacement case needs to be clearer and more prominent.

**Problems to fix:**

1. **"REPLACE" language must be explicit.** When a slot is occupied, the showcase card should say "REPLACE [current item]?" not just show a side-by-side comparison. The action should be labeled "REPLACE" not "EQUIP NEW".

2. **The current item being replaced should be visually prominent.** Show the currently equipped item crossed out or dimmed with a clear arrow (→) pointing to the new item. The player must understand they LOSE the old item.

3. **Wearable items must go through the full fanfare.** Verify that the BD-260 fanfare intercepts ALL wearable pickup scenarios — armor replacing armor, boots replacing boots, etc. The old `wearableCompare` menu should no longer trigger; the fanfare handles everything.

4. **Default selection for replacement should be KEEP (safe choice).** When replacing an equipped item, default to "KEEP CURRENT" so the player doesn't accidentally replace their gear by mashing ENTER.

**Fix — update showcase card rendering for slot-replacement case:**

### In hud.js (fanfare showcase section):

When `f.slotOccupied` is true, the showcase card should render:

```
┌──────────────────────────────────────┐
│          REPLACE EQUIPMENT?          │  ← bold title, yellow
│                                      │
│   ┌────────────┐   →   ┌────────────┐│
│   │ CURRENT    │       │ NEW        ││
│   │ [icon]     │       │ [icon]     ││
│   │ LEATHER    │       │ CHAINMAIL  ││
│   │ ARMOR      │       │ ARMOR      ││
│   │ -25% dmg   │       │ -40% dmg   ││
│   └────────────┘       └────────────┘│
│                                      │
│      ◄ KEEP CURRENT    REPLACE ►     │  ← arrow selection
│                                      │
└──────────────────────────────────────┘

         PRESS ENTER TO CONFIRM
    Press R for NEW ROLL! (2 left)
```

Key visual changes:
- Title: **"REPLACE EQUIPMENT?"** (not just "ITEM FOUND!")
- Current item card: slightly dimmed or with a red X overlay when REPLACE is selected
- New item card: highlighted with rarity border when REPLACE is selected
- Arrow between cards: → symbol showing the replacement direction
- Bottom labels: **"KEEP CURRENT"** and **"REPLACE"** (not "KEEP" / "EQUIP NEW")
- Default selection: **KEEP CURRENT** (choice = 0, safe default)

### In game3d.js:

1. **Verify wearableCompare is fully bypassed.** The fanfare should intercept item pickups BEFORE the old `wearableCompare` logic triggers. Check that `st.wearableCompare` is never set when `st.itemFanfare` is active.

2. **Default choice for replacements:** When `slotOccupied` is true, set `choice: 0` (KEEP) instead of `choice: 1` (EQUIP NEW). This prevents accidental replacement.

3. **applyItemFanfareChoice must handle replacement correctly:**
   - choice 0 (KEEP): discard new item, close fanfare
   - choice 1 (REPLACE): un-apply old item effects, apply new item, close fanfare
   - Un-applying old items: for items with stat effects (thickFur HP, magnetRing radius, etc.), the old item's effects must be reversed before applying the new one

---

## Acceptance Criteria

1. Wearable items (armor, boots, glasses, ring, etc.) trigger the full fanfare with slot-machine reveal
2. When replacing, the showcase card clearly says "REPLACE EQUIPMENT?" with current vs new comparison
3. Bottom labels say "KEEP CURRENT" and "REPLACE" — no ambiguity
4. Default selection is KEEP (safe choice, player must actively choose to replace)
5. The old `wearableCompare` menu never triggers — fanfare handles all cases
6. Replacing an item correctly un-applies the old item's effects before applying the new one
7. Reroll works during replacement scenarios — rerolled item may or may not occupy the same slot

---

## Estimated Complexity

S (Small) — HUD text/layout changes in the existing fanfare rendering, default choice flip, verify bypass of old wearableCompare.
