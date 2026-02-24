# BD-113: Zombies still pass through impassable terrain (BD-103 reopen)

**Category:** Bug — Enemy Collision
**Priority:** P0
**File(s):** `js/game3d.js`
**Reopened from:** BD-103

## Description
BD-103 added terrain collision for zombies using the same `terrainState.colliders` array as the player. However, zombies are still visually moving through terrain objects (rocks, trees, stumps, platforms, etc.). The collision code added in BD-103 is either not firing, not applying to all enemy types, or the collider data is stale/incomplete for the chunks where enemies exist.

## Root Cause Investigation Needed
1. Check if `terrainState.colliders` only contains colliders near the player (not near enemies in distant chunks)
2. Check if the collision code runs for ALL enemy types (including boss zombies, wave zombies, merged zombies)
3. Check if the push-out vector is large enough to prevent tunneling at high speeds
4. Check if the collision code placement in the update loop is AFTER the final position assignment (not before)

## Fix Approach
- The player collision uses `terrainState.colliders` which is populated from chunks near the player. Enemies far from the player may be in chunks whose colliders aren't in this array.
- Likely fix: build a spatial lookup (e.g., colliders indexed by chunk key) and check enemies against colliders in THEIR chunk, not just the player's nearby chunks.
- Alternative: increase the collider collection radius to cover all loaded chunks, or only apply collision to enemies within render distance.

## Acceptance Criteria
- Zombies visibly path around trees, rocks, stumps, platforms, and other solid terrain
- Works for all enemy tiers including boss zombies
- No performance regression (use spatial culling)
- Zombies don't get permanently stuck on terrain
