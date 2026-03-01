# Visual QA Assessment — Iteration 2
**Date:** 2026-03-01
**Assessor:** Visual QA Agent
**Reference:** concept art (`how-we-want-it-to-look.png`) vs. in-game screenshots (iteration 2)
**Baseline for comparison:** iteration 1 assessment (`qa-iteration-1/assessment.md`)

---

## Concept Art Summary (Target)

The concept art shows a massively built, barrel-chested red panda at approximately level 20. Key visual traits:
- Enormous rounded shoulders that flare far wider than the hips
- Thick, clearly separated upper arms with visible muscle segments
- A deep, broad chest with visible ab definition (dark panel separation lines)
- A relatively small, compact head sitting low on the wide torso
- Legs spread in a wide, stable stance
- Dark/black pants with blue boots
- A golden/yellow item on the head (wearable)
- The body is roughly 2x–2.5x the width of a zombie enemy standing nearby

---

## Iteration 2 Progress Summary

Iteration 2 has introduced the most significant structural change seen so far: **large spherical shoulder/deltoid balls** that protrude clearly outward from the torso at levels 10, 15, and 20. These are visible and unmistakable in all three higher-level screenshots. This is the correct direction and represents a genuine leap over iteration 1. However, the shoulder spheres create a new problem — they visually detach from the torso rather than blending with it, making the character read as "stick figure with floating ball shoulders" rather than "massively built animal." Most other dimensions remain largely unchanged from iteration 1.

---

## Level 20 Character — 8-Dimension Score

### 1. Overall Silhouette Match — 4 / 10
The level-20 silhouette now has some lateral width thanks to the shoulder spheres, but the overall shape reads as a narrow central torso with two floating orbs rather than the broad, continuous inverted-triangle mass of the concept art. The concept art silhouette is one unbroken muscular form; the iteration-2 silhouette has a visible gap between the shoulder balls and the body. Progress over iteration 1 (3/10), but the silhouette still does not match the target shape.

### 2. Total Size Increase (level 1 to level 20) — 4 / 10
Comparing level-01-front to level-20-front the character grows visibly but conservatively — the torso box is roughly the same size and the primary width change comes entirely from the new shoulder spheres, not from genuine body-mass growth. Enemies at level 20 remain nearly the same height as the player and the player does not fill meaningfully more screen area than at level 1. This score is unchanged from iteration 1; the shoulder spheres add width perception but not actual bulk.

### 3. Shoulder Definition (round/muscular vs. square/blocky) — 5 / 10
This is the dimension with the clearest improvement. The shoulder spheres are large, round, and protrude well past the torso edge, which is directionally correct — the concept art has large rounded deltoid caps. The problem is that the spheres sit at the end of thin connectors and look like ball joints rather than integrated muscle masses. The concept art shoulder flows continuously from the neck into the deltoid cap into the upper arm; the iteration-2 shoulder looks like a separate component bolted on. A score of 5 reflects that the shape intent is right but the integration is poor.

### 4. Arm Thickness & Separation from Body — 3 / 10
The arms between the torso and the shoulder spheres are thin rectangular sticks, identical to iteration 1. The sphere at the top creates the illusion of a large shoulder, but the actual arm below it is still too narrow to read as muscular. In the concept art the entire arm — from deltoid through bicep to forearm — is thick. In iteration 2 only the shoulder cap is large; the rest of the arm disappears. From the three-quarter view (level-20-three-quarter.png) this is especially apparent: the arms look like thin poles connecting floating balls to a box torso. Score unchanged from iteration 1.

### 5. Chest / Ab Definition — 2 / 10
The torso remains a single uniform box with no segmentation between chest and abs, no color contrast, and no panel lines. The concept art has a clearly visible dark horizontal line separating the pec block from the ab block. This dimension is completely unaddressed in iteration 2. Score unchanged from iteration 1.

### 6. Head-to-Body Ratio (small head on big body) — 5 / 10
The head is now partially obscured by the large green body-blocker (terrain/enemy behind the character) in most shots, making this hard to judge from the front screenshots. In the three-quarter view the head looks proportionally reasonable — not dramatically undersized like the concept art target, but not obviously wrong either. Because the body has not grown substantially larger, the head-body ratio has not worsened. Marginal improvement over iteration 1 (4/10) due to the shoulder spheres making the upper body look slightly wider, which makes the head read as proportionally smaller by comparison.

### 7. Stance Width — 3 / 10
The leg stance remains narrow — feet are close together and pointing forward, with no visible gorilla-spread or outward splay. The three-quarter view confirms that from behind the legs are essentially parallel and close, matching iteration 1. The concept art has a wide, planted stance where the feet are positioned well outside the torso width. No progress on this dimension.

### 8. Wearable Visibility (equipped items visible & correctly positioned) — 6 / 10
The cardboard box wearable test (wearable-cardboard-box-front.png) shows genuine progress: the torso area now clearly displays a tan/cardboard-colored body item visible on the character model, and the HUD body slot correctly shows "Cardboa. — Tough box!" with an icon. The wearable is visually distinguishable from the baseline orange torso — the color change is clear. Points deducted because the wearable appears to be a flat color replacement of the torso box rather than a distinct shape/prop layered on top of the character (e.g. the concept art head wearable is clearly a separate object sitting on the head, not a recolor of the head). Still, this is the best-scoring dimension improvement this iteration.

---

## Summary Scorecard

| Dimension | Iter 1 Score | Iter 2 Score | Delta |
|---|---|---|---|
| 1. Overall silhouette | 3 / 10 | 4 / 10 | +1 |
| 2. Total size increase | 4 / 10 | 4 / 10 | 0 |
| 3. Shoulder definition | 2 / 10 | 5 / 10 | +3 |
| 4. Arm thickness & separation | 3 / 10 | 3 / 10 | 0 |
| 5. Chest / ab definition | 2 / 10 | 2 / 10 | 0 |
| 6. Head-to-body ratio | 4 / 10 | 5 / 10 | +1 |
| 7. Stance width | 3 / 10 | 3 / 10 | 0 |
| 8. Wearable visibility | 5 / 10 | 6 / 10 | +1 |
| **TOTAL** | **26 / 80 (33%)** | **32 / 80 (40%)** | **+6** |

---

## Top 3 Highest-Impact Changes Still Needed

### CHANGE 1 — Thicken the arm shaft between shoulder sphere and torso (addresses dimensions 1, 4)

**Why it matters most:** The shoulder spheres are now large and correctly shaped, which was the right call. But they are connected to the torso by thin rectangular sticks. This creates an uncanny "ball-on-a-stick" look that undermines the muscular silhouette and actually makes the arm area look *thinner* than the concept art, not thicker. Fixing the arm shaft geometry has the highest ratio of visual impact to code change because the shoulder cap geometry is already working.

**Specific guidance:** In `js/3d/player-model.js`, find the arm shaft (upper arm / forearm) boxes constructed via `box()`. Increase their width and depth dimensions — the cross-section of each arm segment should grow with level. At level 20 the arm shaft width should be approximately 60–70% of the shoulder sphere radius, not the current ~20%. Also consider adding a small secondary sphere or tapered box for the bicep mid-arm to break up the straight-stick shape. The arm should also be displaced slightly outward (larger X offset) so it hangs away from the torso surface rather than appearing flush with it.

**Target result:** From the front camera the arms read as thick cylinders hanging in space, clearly separated from the torso edge, matching the concept art's "arms as thick as the head" visual.

---

### CHANGE 2 — Increase overall body scale at high levels (torso width, torso depth, overall height) (addresses dimensions 1, 2, 6)

**Why it matters:** From level 1 to level 20 the torso box itself is almost the same size. The shoulder spheres add perceived width but the core body mass has not grown. In the concept art the entire character — head, torso, legs — is dramatically larger than a zombie enemy. In the iteration-2 level-20 screenshot, standing zombies reach approximately the same height as the player. The character needs to become genuinely bigger, not just wider at the shoulder attachment points.

**Specific guidance:** In `js/3d/player-model.js`, find the scale multiplier applied to the overall player model group (likely a `group.scale.set()` call or individual dimension parameters that are functions of `level`). The growth curve should be steeper and non-linear — something like `baseScale * (1 + Math.pow(level / 20, 1.5) * 1.2)` so that levels 1–10 grow slowly and levels 15–20 accelerate dramatically. Target: at level 20 the player character should be visibly taller and wider than any standard zombie enemy in the scene. The torso box width should also grow independently so the body reads as barrel-chested, not just taller.

**Target result:** A level-20 player standing next to a standard zombie looks like an adult next to a child — clearly in a different size class.

---

### CHANGE 3 — Add chest/ab segmentation via a two-box torso and widen the leg stance (addresses dimensions 5, 7)

**Why it matters:** The torso is still a single uniform box with no internal definition. The concept art's torso reads as muscular entirely because of the horizontal dark line separating the pec block (upper, slightly wider, brighter color) from the ab block (lower, slightly narrower, slightly darker). This is a 2-box construction change that does not require changing overall scale at all, but dramatically changes how anatomical the character reads. Combined with a wider leg stance this would make the character read as a powerful, grounded fighter rather than a box on sticks.

**Specific guidance:** In `js/3d/player-model.js`, find the single torso `box()` call and split it into two calls: one for the upper chest (taller, wider, the base orange/animal color) and one for the abs (shorter, slightly narrower, a shade darker — e.g. multiply the RGB by 0.85). The height split should be roughly 60% chest / 40% abs. For the leg stance, find the X-offset used to position the left and right leg groups and increase it — at level 20 the leg separation should be approximately equal to the torso width so the feet are planted at the corners of the torso shadow. Add a small outward toe rotation (rotate the foot box ~15 degrees around the Y axis) to match the concept art's splayed-feet look.

**Target result:** The torso has a visible pec-vs-abs color break when viewed from the front camera; the legs form a wide V-stance that is clearly wider than the character's waist.
