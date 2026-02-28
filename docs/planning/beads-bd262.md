# BD-262: Plateau stairs are oriented the wrong way — extend away from plateau instead of toward it

**Date:** 2026-02-28
**Source:** Manual playthrough — the stairs that lead up to elevated plateaus are backwards. They start at the plateau edge and climb AWAY from it, making them impossible to use as intended. Players have to jump to get onto plateaus.

---

## P1 — Bug / Terrain

---

### BD-262: Plateau stair direction is inverted

**Category:** Bug (terrain generation)
**Priority:** P1
**File(s):** `js/game3d.js` (plateau stairs generation ~lines 1195-1231)

**Symptom:**
Stairs extend outward from the plateau edge and climb away from it. The lowest step is near the plateau and the highest step is far away — the opposite of a functional staircase. Players need to approach and walk UP the stairs toward the plateau, but currently the stairs go up in the wrong direction.

**Root Cause:**
The step position calculation places step 0 (lowest) closest to the plateau edge and each subsequent step further away, while the Y height increases with step index. This means higher steps are further from the plateau — stairs that climb AWAY.

**Current code (game3d.js ~line 1210):**
```js
if (rampSide === 0) { // front (+Z)
  sx = px; sz = pz + pd / 2 + stepDepth * (si + 0.5); sw = 2; sd = stepDepth;
} else if (rampSide === 1) { // back (-Z)
  sx = px; sz = pz - pd / 2 - stepDepth * (si + 0.5); sw = 2; sd = stepDepth;
} else if (rampSide === 2) { // left (-X)
  sx = px - pw / 2 - stepDepth * (si + 0.5); sz = pz; sw = stepDepth; sd = 2;
} else { // right (+X)
  sx = px + pw / 2 + stepDepth * (si + 0.5); sz = pz; sw = stepDepth; sd = 2;
}
```

Step `si=0` (lowest) is at offset `0.5` from the edge. Step `si=4` (highest) is at offset `4.5`. Since Y increases with `si`, the highest step is the furthest from the plateau — backwards.

**Fix — reverse the step index for position calculation:**

The highest step (last `si`) should be closest to the plateau edge, and the lowest step (first `si`) should be furthest away. Reverse the offset:

```js
const reverseI = stepCount - 1 - si; // highest step closest to edge
if (rampSide === 0) { // front (+Z)
  sx = px; sz = pz + pd / 2 + stepDepth * (reverseI + 0.5); sw = 2; sd = stepDepth;
} else if (rampSide === 1) { // back (-Z)
  sx = px; sz = pz - pd / 2 - stepDepth * (reverseI + 0.5); sw = 2; sd = stepDepth;
} else if (rampSide === 2) { // left (-X)
  sx = px - pw / 2 - stepDepth * (reverseI + 0.5); sz = pz; sw = stepDepth; sd = 2;
} else { // right (+X)
  sx = px + pw / 2 + stepDepth * (reverseI + 0.5); sz = pz; sw = stepDepth; sd = 2;
}
```

Now step 0 (Y = low) is at the far end and step N-1 (Y = plateau top) is at the edge. The player walks from ground level up the stairs toward the plateau.

---

## Acceptance Criteria

1. Stairs climb TOWARD the plateau — lowest step is furthest from edge, highest step meets the plateau top
2. Player can walk up stairs onto the plateau without jumping
3. All four ramp directions (front, back, left, right) are correct
4. Step collision/platform detection still works (stepPlatforms array unchanged)
5. Visual appearance looks like a natural staircase leading up to an elevated platform

---

## Estimated Complexity

XS (Trivial) — add one line (`const reverseI = stepCount - 1 - si;`) and replace `si` with `reverseI` in the 4 position calculations.
