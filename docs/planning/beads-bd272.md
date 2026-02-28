# BD-272: Can't jump over trees — collision blocks at all heights

**Date:** 2026-02-28
**Source:** Manual playthrough — player cannot jump over trees regardless of jump height. Trees block movement even when the player is well above the tree's logical canopy.

---

## P1 — Gameplay Bug

---

### BD-272: Tree collision hitbox extends infinitely upward — should only block up to logical height

**Category:** Bug (collision / movement)
**Priority:** P1
**File(s):** `js/game3d.js` (player-terrain collision), `js/3d/terrain.js` (decoration hitboxes)

**Current Behavior:**
Trees (and possibly other decorations) use collision checks that only test X/Z proximity, ignoring the player's Y position entirely. This means a player at any height — even at the peak of a max-height jump — is blocked by trees as if they were infinitely tall walls.

**Expected Behavior:**
Tree collision should only block movement when the player's Y position is within the tree's logical hitbox height. If the player jumps above the tree's canopy, they should pass over it freely.

**Fix Approach:**
1. Add a height component to decoration collision checks
2. Each decoration type should define a logical hitbox height (e.g., trees ~3-4 units, stumps ~0.5, rocks ~1.5)
3. Player collision with decorations should be skipped when `playerY > decoration.hitboxHeight`

---

## Acceptance Criteria

1. Player can jump over trees when jump height exceeds the tree's logical height
2. Player can jump over stumps, rocks, and other short decorations
3. Player is still blocked by trees at ground level (normal walking collision preserved)
4. No walking-through-trees regression
5. All 5 decoration types have appropriate hitbox heights

---

## Estimated Complexity

S (Small) — add Y-height check to existing collision logic, define hitbox heights per decoration type.
