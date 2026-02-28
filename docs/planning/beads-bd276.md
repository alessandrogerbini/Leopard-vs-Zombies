# BD-276: Zombies spawn directly under the player — no exclusion zone

**Date:** 2026-02-28
**Source:** Manual playthrough — zombies frequently spawn directly on top of or immediately under the player, giving zero reaction time. This feels unfair and unintended.

---

## P1 — Gameplay / Fairness

---

### BD-276: Add spawn exclusion zone around the player to prevent unfair instant-contact spawns

**Category:** Bug / Balance (spawn fairness)
**Priority:** P1
**File(s):** `js/game3d.js` (zombie spawn functions — spawnAmbient, spawnWaveEvent)
**Related:** BD-217 (zombies spawn directly on player — earlier report)

**Current Behavior:**
Zombie spawn position calculations can place enemies at or very near the player's current position. The player takes damage immediately with no time to react, dodge, or prepare.

**Expected Behavior:**
A minimum spawn exclusion radius around the player (e.g., 8-12 units) should prevent any zombie from spawning within melee range. Zombies should always spawn far enough away that the player has time to see them approaching.

**Fix Approach:**
1. In all spawn functions, after calculating spawn position, check distance to player
2. If spawn position is within exclusion radius, push the spawn point outward along the spawn-to-player vector until it's outside the radius
3. Exclusion radius should be at least 8 units (enough for ~1 second of reaction time at zombie walk speed)

---

## Acceptance Criteria

1. No zombie spawns within the exclusion radius of the player
2. Exclusion zone applies to both ambient spawns and wave event spawns
3. Spawn density at the edges of the exclusion zone feels natural (no ring of zombies)
4. Player always has at least ~1 second of reaction time to incoming spawns

---

## Estimated Complexity

S (Small) — distance check + position adjustment in spawn functions.
