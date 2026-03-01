# Visual QA Assessment — Iteration 1
**Date:** 2026-03-01
**Assessor:** Visual QA Agent
**Reference:** concept art (`how-we-want-it-to-look.png`) vs. in-game screenshots

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

## Level 20 Character — 8-Dimension Score

### 1. Overall Silhouette Match — 3 / 10
The level-20 character is a compact, boxy golden-yellow figure. The silhouette is essentially a rectangle with small arms; there is no dramatic shoulder flare, no chest V-shape, and no powerful lower-body spread. The concept art silhouette is a pronounced inverted triangle (wide shoulders tapering to narrower hips) — the in-game shape reads as a slightly enlarged version of level 1, not a radically different beast.

### 2. Total Size Increase (level 1 → level 20) — 4 / 10
Comparing level-01-front to level-20-front, the character does grow modestly — roughly 20–30% taller and marginally wider — but the growth is far too conservative. In the concept art the character is dramatically larger than nearby enemies; in-game the character is only slightly bigger than a zombie. The progression from level 1 through 8, 15, and 20 shows incremental growth rather than the imposing bulk the concept art demands.

### 3. Shoulder Definition (round/muscular vs. square/blocky) — 2 / 10
The concept art shows large, rounded, overhanging deltoid masses that extend well beyond the torso width. The in-game character has small boxy shoulder panels that do not protrude past the torso edge. There is no rounding, no overhang, and no visual sense of a deltoid cap. The shoulders are the single largest gap between concept and implementation.

### 4. Arm Thickness & Separation from Body — 3 / 10
In the concept art the arms are thick cylinders clearly floating in space beside the torso, held slightly away from the body. In-game the arms are thin rectangular sticks that appear glued to the sides of the torso. There is essentially no air gap between arm and chest, and the arm cross-section is too narrow to read as muscular from the isometric camera angle.

### 5. Chest / Ab Definition — 2 / 10
The concept art has a clearly segmented chest (upper pec block, lower ab block with a visible dark line separating them) giving a strong sense of anatomical definition. The in-game torso is a single uniform box with no segmentation, no color contrast between chest and abs, and no panel line detail. This makes the character look like a toy robot rather than a muscular animal.

### 6. Head-to-Body Ratio (small head on big body) — 4 / 10
The concept art head is notably small relative to the enormous torso, creating a comedic "too many muscles" look. In-game the head is proportionally reasonable but the body is still small enough that the ratio never becomes exaggerated or comic. Progress exists here — the head does not scale with the body — but the effect only reads correctly once the body itself is much larger.

### 7. Stance Width — 3 / 10
The concept art shows legs spread in a wide, gorilla-like stance with feet pointing outward. The in-game character has a narrow stance — legs close together, feet pointing forward. The shadow footprint on the ground is roughly the same width as the torso, whereas in the concept art the shadow is significantly wider. Level 20 shows marginally wider stance than level 1, but nowhere near the gorilla spread of the concept.

### 8. Wearable Visibility (equipped items visible & correctly positioned) — 5 / 10
The cardboard-box body wearable test (wearable-cardboard-box-front.png) confirms the item is equipped and visible in the inventory HUD slot. However, on the character itself the cardboard box body item is not visually distinguishable from the baseline torso in the game viewport — the torso color/shape does not visibly change to indicate "something is worn". The item is registered in the system but the 3D model does not reflect it clearly. Head and feet slots are unequipped and show nothing, which is correct.

---

## Summary Scorecard

| Dimension | Score |
|---|---|
| 1. Overall silhouette | 3 / 10 |
| 2. Total size increase | 4 / 10 |
| 3. Shoulder definition | 2 / 10 |
| 4. Arm thickness & separation | 3 / 10 |
| 5. Chest / ab definition | 2 / 10 |
| 6. Head-to-body ratio | 4 / 10 |
| 7. Stance width | 3 / 10 |
| 8. Wearable visibility | 5 / 10 |
| **TOTAL** | **26 / 80 (33%)** |

---

## Top 3 Highest-Impact Changes

### CHANGE 1 — Dramatically increase shoulder width scaling at high levels (addresses dimensions 1, 3, 4)

**Why it matters most:** The shoulder flare is the single biggest visual signal of a "jacked" character. Currently the silhouette reads as a rectangular box at every level. Making the shoulders balloon outward at levels 10–20 would transform the silhouette from rectangle to inverted triangle and fix dimensions 1, 3, and 4 simultaneously.

**Where to look in code:** `js/3d/player-model.js` — the function that builds or scales the shoulder/upper-arm geometry based on `level`. Look for the scale or width parameter applied to the shoulder mesh group. The shoulder width multiplier at level 20 likely needs to be increased from something like `1.0 + level * 0.02` to a steeper curve such as `1.0 + (level ** 1.5) * 0.008` so that early levels stay slim and high levels get dramatically wider. The shoulder boxes also need to protrude outward (positive/negative X offset) far enough to visually clear the torso edge — look for the X-position offset of the shoulder/deltoid box passed to `box()`.

**Target result:** At level 20 the shoulder width should be at least 2x–2.5x the torso width, matching the concept art's dramatic overhang.

---

### CHANGE 2 — Increase overall body scale growth rate, especially torso width and arm thickness (addresses dimensions 2, 4)

**Why it matters:** The character grows only ~20–30% from level 1 to 20. It should feel like it doubles or triples in effective body width. Enemies should look noticeably smaller next to a level-20 character.

**Where to look in code:** `js/3d/player-model.js` — search for the top-level scale factor applied to the entire player model group (often `group.scale.set(...)` or individual geometry size parameters that are functions of `level`). The muscle-growth path likely uses a linear multiplier; switch to a more aggressive curve. Also look for the arm cross-section dimensions passed to `box()` — the arm boxes likely have a fixed width (e.g. `0.3` or `0.4` units) that should grow with level. At level 20 arms should be nearly as wide as the head.

**Target result:** Level-20 player fills noticeably more screen than a zombie standing beside it; arm cross-section is thick enough to read as bulky from the top-down camera.

---

### CHANGE 3 — Add chest/ab segmentation (color contrast or geometry panel line) and widen leg stance (addresses dimensions 5, 7)

**Why it matters:** Even without changing the overall mesh size, adding a dark separation line between the upper chest block and the lower ab block (matching the concept art's anatomical panel lines) would immediately make the torso read as muscular rather than as a plain box. Simultaneously, widening the leg stance so feet spread outward gives the character a "planted" power pose visible from above.

**Where to look in code:** `js/3d/player-model.js` — for the chest segmentation, look for where the torso/chest box is constructed via `box()`. Split it into two boxes (upper chest and lower abs) with slightly different color values (e.g. the abs box slightly darker than the chest box). For leg stance width, look for the X-offset of the left and right leg groups — increase the horizontal separation (e.g. from `±0.3` to `±0.5` at level 20) and add a small outward rotation to the feet so they splay like the concept art.

**Target result:** Torso has a visible chest-vs-abs color break; legs form a wide-set gorilla stance clearly wider than the torso from the overhead isometric view.
