# BD-284: Crates spawn under stairs — only items with fanfare, misplaced spawns

**Date:** 2026-02-28
**Source:** Manual playthrough — item crates are spawning underneath staircase geometry where they are difficult or impossible to reach. Additionally, these under-stair crate items are the ONLY ones triggering the item pickup fanfare, suggesting the fanfare system (BD-266) only works for crate-sourced items and not for ground drops.

---

## P1 — Gameplay Bug + Fanfare Scope Issue

---

### BD-284: Crate spawn positions overlap with staircase geometry; fanfare only triggers for crate items

**Category:** Bug (spawn placement + feature scope)
**Priority:** P1
**File(s):** `js/game3d.js` (crate spawn logic, item fanfare trigger), `js/3d/terrain.js` (staircase positions)

**Two issues in one:**

### Issue A: Crates spawning under stairs
Crate spawn positions don't account for staircase geometry. Crates end up partially or fully underneath stairs, making them hard to see and potentially unreachable. The spawn system should check for staircase overlap and reposition crates away from stairs.

### Issue B: Fanfare only fires for crate items
The item fanfare system (BD-266) appears to only trigger when picking up items that came from crates. Regular ground-drop items (from zombie kills, world spawns) get picked up silently with no fanfare. This makes the fanfare feel inconsistent and broken — it should trigger for ALL items based on their rarity, not based on their spawn source.

---

## Fix Approach

### For Issue A:
1. When spawning crates, check if the position overlaps with plateau staircase areas
2. If overlapping, offset the crate to a nearby clear position
3. Alternatively, exclude staircase bounding boxes from valid crate spawn zones

### For Issue B:
1. Audit the item pickup code paths — find why crate-sourced items trigger fanfare but ground drops don't
2. Ensure the fanfare trigger is based on the item itself (rarity, type) not the spawn source
3. All rare+ items should get fanfare regardless of how they entered the world

---

## Acceptance Criteria

1. No crates spawn underneath or inside staircase geometry
2. All crates are visible and reachable by the player
3. Item fanfare triggers consistently for all items of qualifying rarity, regardless of spawn source
4. Ground-drop items get the same fanfare treatment as crate items

---

## Estimated Complexity

S-M — spawn position fix is small, fanfare scope fix requires auditing pickup code paths.
