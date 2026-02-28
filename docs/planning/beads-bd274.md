# BD-274: Some items still don't visually render on character model

**Date:** 2026-02-28
**Source:** Manual playthrough — certain equipped items don't show up visually on the player character model despite being equipped and applying stats.

---

## P1 — Visual Bug

---

### BD-274: Equipped items missing visual representation on player model

**Category:** Bug (visual rendering)
**Priority:** P1
**File(s):** `js/3d/player-model.js` (WEARABLE_VISUALS, buildWearableMesh, updateWearableVisuals)
**Related:** BD-269 (most wearables don't visually render)

**Current Behavior:**
Some equipped wearable items apply their stat bonuses but have no visible model on the player character. Only a few wearables (party hat, shark fin, clown shoes) consistently render.

**Note:** This overlaps with BD-269 which did a full audit. This bead confirms the issue persists after any prior fixes and should be tracked as still-open.

---

## Acceptance Criteria

1. All equippable items render a visible model on the player character
2. Each item is visually distinct and recognizable
3. Visuals work across all 4 animal models

---

## Estimated Complexity

M (Medium) — requires fixing/creating visual definitions for 8-10 wearable items.
