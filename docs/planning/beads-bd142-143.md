# Beads: BD-142 and BD-143

**Date:** 2026-02-24
**Source:** Live playtest screenshot — combo text spam + transparent plateau sides

---

## BD-142: Combo notifications fire too frequently — reduce to meaningful milestones

**Category:** Balance/UX — Floating Text
**Priority:** P1
**File(s):** `js/game3d.js` (killEnemy combo tracking, ~line 2265 area)

### Description
The kill combo counter (BD-138) announces at every 5 kills (5, 10, 15, 20...). In practice, mid-game kill rates are so high that combo text fires constantly — "x5 COMBO!", "x10 COMBO!", "x15 COMBO!" all within seconds. For a 7-year-old player, these blend into noise and lose all excitement. The combo should feel like a rare, exciting achievement, not a ticker.

### Fix Approach
Replace the `comboCount % 5 === 0` milestone check with a logarithmic/exponential milestone system that spaces announcements further apart as combos grow:

**Milestone thresholds:** 10, 25, 50, 100, 200, 500, 1000

```js
const COMBO_MILESTONES = [10, 25, 50, 100, 200, 500, 1000];

// In killEnemy(), replace the existing combo announcement:
if (COMBO_MILESTONES.includes(st.comboCount)) {
  const comboColor = st.comboCount >= 100 ? '#ff00ff' : st.comboCount >= 50 ? '#ffaa00' : '#ff4444';
  addFloatingText('x' + st.comboCount + ' COMBO!', comboColor, st.playerX, st.playerY + 3, st.playerZ, 2.0, true);
  playSound('sfx_level_up');
}
```

This means the first combo notification doesn't fire until 10 kills — a real achievement. The next at 25, then 50, etc. Each one feels progressively more exciting and rare. Julian will scream when he hits x100.

### Acceptance Criteria
- Combo text only appears at milestones: 10, 25, 50, 100, 200, 500, 1000
- No combo text for small streaks (under 10)
- Color escalation: red (10-49), orange (50-99), magenta (100+)
- Combo text lifetime increased to 2.0s (these are rare, let them breathe)
- bestCombo still tracked continuously (game-over shows exact number)
- Combo timer remains 2.0s decay window (unchanged)

---

## BD-143: Plateau side walls are transparent — should be opaque

**Category:** Bug — Visual Regression
**Priority:** P1
**File(s):** `js/game3d.js` (buildPlateauMeshes, ~line 865 area)

### Description
BD-129 made plateau side walls semi-transparent (`opacity: 0.55`) so the player wouldn't be fully occluded behind tall plateaus. In practice, the transparent sides look broken — like unfinished geometry. The plateaus should have fully opaque sides. The original occlusion problem (player hidden behind plateaus) can be revisited later with a dynamic approach, but for now opaque walls look far better than ghostly ones.

### Fix Approach
In `buildPlateauMeshes()`, find the `sideMat` material creation where `transparent: true, opacity: 0.55` was added by BD-129. Revert to opaque:

```js
// Change from:
const sideMat = new THREE.MeshLambertMaterial({ color: sideColor, transparent: true, opacity: 0.55 });
// To:
const sideMat = new THREE.MeshLambertMaterial({ color: sideColor });
```

Also remove any `depthWrite: false` if it was added alongside the transparency.

### Acceptance Criteria
- Plateau side walls are fully opaque (no transparency)
- Side walls still use the correct `sideColor` from `getSideColor()`
- No visual artifacts (z-fighting, missing faces)
- Plateau tops remain unchanged (already opaque)
- Ramps/stairs (BD-133) unaffected

---

## Parallelization Notes

### Independent (can run in parallel)
- **BD-142:** Touches only `killEnemy()` combo block (~line 2265). No overlap with BD-143.
- **BD-143:** Touches only `buildPlateauMeshes()` side material (~line 865). No overlap with BD-142.

Both can run in parallel with zero conflict risk.
