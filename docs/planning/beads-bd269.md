# BD-269: Most wearable items don't visually render on the player character

**Date:** 2026-02-28
**Source:** Manual playthrough — only a few wearables (party hat, clown shoes, shark fin) actually appear on the character model. The rest equip (stats apply) but are invisible.

---

## P1 — Visual Bug

---

### BD-269: Wearable visual models not rendering for most items despite WEARABLE_VISUALS being defined

**Category:** Bug (visual rendering)
**Priority:** P1
**File(s):** `js/3d/player-model.js` (WEARABLE_VISUALS ~line 805, buildWearableMesh ~line 859, updateWearableVisuals ~line 877)

**Findings:**

All 13 wearables have entries in `WEARABLE_VISUALS` (player-model.js lines 805-850):

| Wearable | Slot | Boxes | Status |
|----------|------|-------|--------|
| partyHat | head | 3 | WORKS |
| sharkFin | head | 2 | WORKS |
| bumbleHelmet | head | ? | NOT VISIBLE |
| crownOfClaws | head | ? | NOT VISIBLE |
| cardboardBox | body | 2 | NOT VISIBLE |
| bumbleArmor | body | 3 | NOT VISIBLE |
| knightPlate | body | ? | NOT VISIBLE |
| dragonScale | body | ? | NOT VISIBLE |
| clownShoes | feet | 4 | WORKS |
| springBoots | feet | 6 | NOT VISIBLE |
| rocketBoots | feet | ? | NOT VISIBLE |
| shadowSteps | feet | ? | NOT VISIBLE |
| gravityStompers | feet | ? | NOT VISIBLE |

**Suspected Causes (investigate all):**

### 1. WEARABLE_VISUALS entries may be incomplete or have wrong coordinates
Some entries might use Y positions that clip inside the player model or are positioned way off-screen. The working ones (partyHat, sharkFin, clownShoes) are the most visually obvious with extreme positions (top of head, bottom of feet).

### 2. buildWearableMesh() may fail silently
If `WEARABLE_VISUALS[wearableId]` returns undefined for some IDs (typo in key name vs WEARABLES_3D ID), `buildWearableMesh` would return null and `updateWearableVisuals` would skip adding the mesh.

### 3. Box dimensions too small
Some wearable visuals might have tiny box dimensions that are technically rendering but invisible to the player.

### 4. Color blending with player model
Body-slot wearables positioned on the torso might blend into the animal's body color, making them appear invisible.

---

## Fix Plan

### Step 1: Audit WEARABLE_VISUALS keys match WEARABLES_3D IDs

Verify every key in WEARABLE_VISUALS exactly matches an ID in WEARABLES_3D. A single typo would cause silent failure.

### Step 2: Verify all 13 entries have visual definitions

Check that every WEARABLES_3D item has a corresponding WEARABLE_VISUALS entry with at least 1 box definition. If any are missing, add them.

### Step 3: Add/improve visual definitions for non-working wearables

For each wearable that doesn't render, ensure:
- Box positions are in correct model-local coordinates
- Boxes are large enough to be visible (min 0.1 in any dimension)
- Colors contrast with the player model
- HEAD items: Y > 1.7 (above head)
- BODY items: Y ~ 0.6-1.2 (torso area), sufficiently large to be visible
- FEET items: Y ~ -0.1-0.2 (near ground level)

Reference working examples:
- partyHat: 3 stacked boxes, Y 1.82-2.06, width 0.12-0.36
- clownShoes: 4 boxes at Y 0.0-0.08, oversized width 0.24

### Step 4: Test all 13 wearables

Equip each wearable via debug/gameplay and verify it renders visibly on the character from multiple camera angles.

---

## Acceptance Criteria

1. All 13 wearables render a visible model on the player character when equipped
2. Each wearable is visually distinct and identifiable
3. Wearable visuals contrast sufficiently with all 4 animal models (leopard, redPanda, lion, gator)
4. No visual clipping through the player model
5. Wearable visuals move correctly with the player (attached to model group)

---

## Estimated Complexity

M (Medium) — requires auditing 13 visual definitions and potentially creating/fixing 8-10 of them with correct coordinates and proportions.
