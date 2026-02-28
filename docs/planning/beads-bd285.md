# BD-285: Some wearables (e.g., Knight Plate) don't render visibly on character model

**Date:** 2026-02-28
**Source:** Manual playthrough — equipping wearables like Knight Plate has no visible effect on the character model. Other wearables (party hat, clown shoes, shark fin) do render. Stats apply but the item is invisible on the character.
**Related:** BD-269 (most wearables don't render), BD-274 (items don't render on model)

---

## P1 — Visual Bug (Persistent)

---

### BD-285: WEARABLE_VISUALS definitions missing or broken for multiple wearable items

**Category:** Bug (visual rendering)
**Priority:** P1
**File(s):** `js/3d/player-model.js` (WEARABLE_VISUALS, buildWearableMesh, updateWearableVisuals)

**Current Behavior:**
From playtest, confirmed working vs broken:

| Wearable | Slot | Renders? |
|----------|------|----------|
| Party Hat | head | YES |
| Shark Fin | head | YES |
| Clown Shoes | feet | YES |
| Cardboard Box | body | YES (visible in screenshots) |
| Knight Plate | body | NO |
| (others untested this session) | | |

**This is the 3rd report of this issue** (BD-269, BD-274, now BD-285). The underlying problem has not been resolved. The WEARABLE_VISUALS definitions for non-rendering items are either:
- Missing entirely (no entry for the item ID)
- Have incorrect key names (typo vs WEARABLES_3D ID)
- Have box dimensions/positions that clip inside the player model
- Have colors that blend with the player model making them invisible

---

## Fix Approach

1. Do a definitive key audit: print every key in WEARABLE_VISUALS and every ID in WEARABLES_3D, diff them
2. For each non-rendering wearable, add/fix the visual definition with:
   - Boxes large enough to be clearly visible (min 0.2 in smallest dimension)
   - Colors that contrast with all 4 animal body colors
   - Positions that sit ON TOP of the player model, not inside it
3. Test each wearable on each animal model

---

## Acceptance Criteria

1. ALL 13 wearables render visibly on the player character
2. Each wearable is visually distinct and identifiable at a glance
3. Wearables contrast against all 4 animal models
4. This is the definitive fix — no more "wearables don't render" beads after this

---

## Estimated Complexity

M (Medium) — requires creating/fixing 8-10 visual definitions with correct coordinates.
