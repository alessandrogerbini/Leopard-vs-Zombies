# BD-275: Character face features disappear as model grows in size

**Date:** 2026-02-28
**Source:** Manual playthrough — as the player character levels up and the model grows (muscle growth system), facial features (eyes, nose, mouth markings) progressively disappear or clip inside the head geometry.

---

## P1 — Visual Bug

---

### BD-275: Muscle growth scaling causes face features to clip/vanish at larger sizes

**Category:** Bug (visual / model scaling)
**Priority:** P1
**File(s):** `js/3d/player-model.js` (muscle growth scaling, face feature positioning)

**Current Behavior:**
The bipedal animal models have facial features (eyes, nose, markings) built as small box meshes positioned on the head. As the character grows via the muscle growth system (scaling the model group), the head geometry scales up but the face feature positions don't compensate correctly — they end up clipping inside the enlarged head or becoming too small relative to the larger face.

**Expected Behavior:**
Face features should remain visible and proportionally correct at all growth stages. As the model scales up, face features should either:
- Scale and reposition proportionally with the head
- Be rebuilt/adjusted at each growth stage
- Use a slight Z-offset bias that increases with scale to prevent clipping

**Likely Root Cause:**
The face features (eyes, nose) are child meshes of the head group. When the parent scales uniformly, the features scale too — but if they're flush with the head surface, the enlarged head geometry may z-fight with or swallow the feature meshes. A small outward offset that scales with growth level would fix this.

---

## Acceptance Criteria

1. Face features (eyes, nose, mouth/markings) remain visible at all growth stages
2. Features scale proportionally — don't look tiny on a large head
3. No z-fighting or flickering between face and head geometry
4. Works for all 4 animal models (leopard, redPanda, lion, gator)

---

## Estimated Complexity

S (Small) — likely a scaling offset adjustment in the face feature positioning code within player-model.js.
