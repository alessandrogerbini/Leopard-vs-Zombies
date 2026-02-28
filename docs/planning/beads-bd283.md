# BD-283: Plateau stairs look semi-transparent / not solid

**Date:** 2026-02-28
**Source:** Manual playthrough (screenshot evidence) — the stairs leading up to elevated plateaus appear partially transparent or ghostly. They don't look like solid walkable geometry. Players may not realize they can walk on them.

---

## P2 — Visual Bug

---

### BD-283: Plateau staircase meshes appear semi-transparent instead of solid

**Category:** Bug (visual / rendering)
**Priority:** P2
**File(s):** `js/3d/terrain.js` (plateau stair generation), `js/game3d.js` (if stair material is set there)

**Current Behavior:**
Staircase steps leading up to grounded plateaus render with what appears to be transparency or very low opacity. They look like ghost geometry — you can see through them to the ground below. This makes them visually confusing and not obviously walkable.

**Expected Behavior:**
Stairs should be fully opaque, solid-looking geometry matching the plateau's earth/stone material. They should clearly read as a physical ramp or staircase the player can walk up.

**Suspected Causes:**

1. **Material `transparent: true` or low opacity** — the stair mesh material may have `transparent: true` and/or `opacity < 1.0` set, either intentionally or as a leftover from debugging
2. **Material `depthWrite: false`** — if depth writing is disabled, other geometry renders on top of the stairs making them look see-through
3. **Missing material altogether** — if stairs use a default THREE.js material with no explicit color/opacity settings
4. **Render order issue** — stairs may render before the ground plane, causing z-fighting or blending artifacts

---

## Fix Approach

1. Find the stair mesh creation code in terrain.js
2. Ensure the material has `transparent: false`, `opacity: 1.0`, `depthWrite: true`
3. Set a solid earth/stone color matching the plateau (e.g., brown/tan)
4. Verify stairs render correctly from all camera angles

---

## Acceptance Criteria

1. Stairs are fully opaque and solid-looking
2. Stairs visually match the plateau material/color
3. Players can clearly identify stairs as walkable ramps
4. No z-fighting or transparency artifacts

---

## Estimated Complexity

XS-S — likely a single material property fix.
