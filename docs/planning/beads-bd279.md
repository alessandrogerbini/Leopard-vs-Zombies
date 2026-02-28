# BD-279: Zombie colors shift during gameplay — same-tier zombies appear different shades

**Status: OPEN — See also BD-281 (yellow vest artifacts from hurt flash)**

**Date:** 2026-02-28
**Source:** Manual playthrough (screenshot attached). Same-tier zombies display noticeably different colors/shading as the game progresses. Some appear pale gray/white while others are darker. Looks like an unintended lighting change. Confusing because players may assume color = tier or status, when it's actually a visual artifact.

---

## P2 — Visual Bug / Readability

---

### BD-279: Zombie material/lighting inconsistency causes same-tier zombies to appear different colors

**Category:** Bug (visual / lighting)
**Priority:** P2
**File(s):** `js/game3d.js` (enemy model creation, lighting setup, material assignment)

**Screenshot Evidence:**
At Wave 5, LVL 11 — the field is full of zombies that should be the same tier but display a range of shades from near-white/silver to dark gray-green. The color difference looks like a lighting or material property drifting over time, not intentional tier differentiation.

**Suspected Causes:**

### 1. Ambient/directional light changes over time
If the scene lighting shifts as game time progresses (e.g., a day/night cycle or time-based light intensity), zombies spawned at different times would be rendered with different ambient contributions, but their material colors would appear to change as lighting shifts.

### 2. Material reuse / shared material mutation
If zombie meshes share a material reference and one code path modifies the material's color or emissive property (e.g., hurt flash, poison effect, freeze tint), the change could bleed across zombies or persist after the effect ends.

### 3. Fog distance interaction
If scene fog is active, zombies at different distances from the camera would blend toward the fog color. This is normal but could look like a color shift if fog is heavy.

### 4. Hurt flash not fully reverting
The zombie hurt flash system (BD-203) tints zombies white on hit. If the revert doesn't fully restore the original color (e.g., a timing edge case or disposed material), zombies could get stuck in a partially-whitened state.

### 5. Shadow map artifacts
Zombies in/out of shadow casting regions could appear dramatically different in shade.

---

## Fix Approach

1. Audit the zombie material creation — ensure each zombie gets its own material instance (not a shared reference) with the correct tier color
2. Check if any lighting parameters change over game time
3. Verify hurt flash fully reverts material color on completion
4. If fog is the cause, consider reducing fog intensity or making it less pronounced on enemy models

---

## Acceptance Criteria

1. Same-tier zombies always appear the same color regardless of when they spawned
2. Zombie color clearly corresponds to their tier (intentional tier coloring preserved)
3. No unintended color drift over the course of a game session
4. Hurt flash and other temporary effects fully revert without leaving residual tint

---

## Estimated Complexity

S-M — requires investigating the root cause (could be trivial lighting tweak or material clone fix, or deeper if multiple causes compound).
