# BD-282: Player model loses arms and distinct features as it grows — BD-275 fix incomplete

**Date:** 2026-02-28
**Source:** Manual playthrough — despite BD-275 fix for face features, the player model still loses visual definition at higher growth levels. Arms disappear into the torso, and overall model detail degrades. The growth scaling is swallowing non-face body parts.
**Related:** BD-275 (face features disappear on growth — partially fixed, face only)

---

## P1 — Visual Bug (Regression/Incomplete Fix)

---

### BD-282: Muscle growth scaling causes arms and body features to clip/vanish — not just face

**Category:** Bug (visual / model scaling)
**Priority:** P1
**File(s):** `js/3d/player-model.js` (muscle growth scaling, arm/limb positioning)

**Current Behavior:**
BD-275 fixed face features repositioning with head scaling. However, the muscle growth system also scales the torso and other body parts. Arms, which are positioned relative to the torso, get swallowed inside the enlarged body at higher growth levels. The model becomes a featureless blob.

**Expected Behavior:**
All body parts (arms, legs, tail, ears, markings) should remain visible and proportionally correct at all growth stages. Arms should move outward as the torso widens. Limbs should scale proportionally.

**Root Cause:**
BD-275 only addressed face features relative to the head. The same clipping problem exists for:
- Arms relative to torso (arms positioned flush with body surface, body scales up and swallows them)
- Tail relative to body
- Any decorative elements (spots, stripes, markings) flush with body surfaces

**Fix Approach:**
Apply the same offset-repositioning technique from BD-275 to ALL body features, not just face features. When torso/body scales up, reposition arms outward proportionally. When legs scale, adjust feet positions, etc.

---

## Acceptance Criteria

1. Arms remain visible at all growth stages
2. Tail, ears, and body markings remain visible
3. Model retains distinct silhouette at max growth
4. Works for all 4 animal models (leopard, redPanda, lion, gator)
5. No regression to face feature fix from BD-275

---

## Estimated Complexity

M (Medium) — requires extending the BD-275 technique to all body part groups, not just face features.
