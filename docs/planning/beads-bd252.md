# BD-252: Zombies walk through impassable terrain — should match player collision

**Date:** 2026-02-27
**Source:** Manual playthrough — zombies walk straight through trees, rocks, and other decorations that the player must navigate around. This undermines the core funneling/merge mechanic.

---

## P1 — Core Gameplay Bug

---

### BD-252: Zombies ignore terrain collision, walking through decorations the player collides with

**Category:** Bug (enemy movement / game design)
**Priority:** P1
**File(s):** `js/game3d.js` (~lines 6773-6824, 6983-7057), `js/3d/terrain.js`

**Symptom:**
Zombies beeline directly toward the player, phasing through trees (r=1.2), rocks (r=1.0), fallen logs, mushroom clusters, and stumps. The player, meanwhile, collides with all of these and must path around them. This disparity makes terrain obstacles feel like a pure liability — they slow the player but not the threats.

**Current Implementation:**

Zombies DO have terrain collision code (lines 6808-6824), using the same `getNearbyColliders()` and radial pushback as the player. However, the effect is minimal:

- **Zombie collision radius:** 0.4 units (line 6810)
- **Player collision radius:** 0.5 units (line 4798)
- **Movement:** Zombies use straight-line vector pursuit (lines 6773-6806) — no pathfinding. They calculate `(dx, dz)` to player and walk directly. The pushback from terrain each frame is immediately overridden by the next frame's beeline movement.

The radial pushback resolves overlap each frame, but since the zombie immediately aims straight at the player again next frame, the net effect is the zombie "slides" through decorations with barely any resistance. The collision technically exists but is functionally invisible.

**Desired Behavior:**

Zombies should be meaningfully blocked by the same terrain the player is blocked by. This creates:
1. **Funneling** — zombies cluster into gaps between terrain, creating natural chokepoints
2. **More merges** — funneled zombies stack up and trigger the tier merge system (same-tier collision within `ZOMBIE_RADIUS * (scale_a + scale_b)`)
3. **Tactical positioning** — player can use terrain to their advantage, creating meaningful movement decisions
4. **Visual coherence** — zombies walking through solid trees looks broken

**Fix Approach:**

The core issue is that radial pushback alone can't prevent an entity from tunneling through an obstacle when its velocity vector points directly through it. The fix needs to **prevent movement INTO obstacles**, not just push out after overlap.

**Option A: Movement-blocking collision (Recommended)**
Before applying the zombie's velocity each frame, project the intended movement vector and check if it would collide with any nearby decoration. If so, slide the zombie along the obstacle's surface (tangent to the collision circle) rather than letting it pass through. This is the same technique used in most 2D top-down games:

```js
// After calculating intended (dx, dz) movement:
let newX = e.group.position.x + nx * eSpd * dt;
let newZ = e.group.position.z + nz * eSpd * dt;

// Check against nearby colliders
const nearby = getNearbyColliders(newX, newZ, terrainState);
for (const c of nearby) {
  const cdx = newX - c.x;
  const cdz = newZ - c.z;
  const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
  const minDist = ER + c.radius;
  if (cDist < minDist && cDist > 0.001) {
    // Push out along collision normal
    const pushDist = minDist - cDist;
    newX += (cdx / cDist) * pushDist;
    newZ += (cdz / cDist) * pushDist;
  }
}

e.group.position.x = newX;
e.group.position.z = newZ;
```

This is essentially what the current code does BUT it should run AFTER position update (move first, then resolve), not as a separate pass that gets overridden next frame. The key change is that the position update and collision resolution happen atomically — the zombie's final position for the frame respects collision.

**Option B: Increased collision radius for zombies**
Increase zombie collision radius from 0.4 to match player (0.5) or even larger (0.6-0.8) so the pushback effect is more pronounced. Simpler but less effective than Option A.

**Option C: Steering behavior (more complex)**
Add simple obstacle avoidance steering — cast a few rays in the forward cone and adjust heading to avoid decorations. More realistic but significantly more complex and potentially expensive at high zombie counts.

**Performance Consideration:**
The current `getNearbyColliders()` checks 9 chunks (~30 colliders typical). This already runs per-zombie per-frame. The proposed fix doesn't add extra queries — it changes WHERE the result is applied (before vs. after position update). No performance impact expected.

**Merge System Synergy:**
With proper terrain collision, zombies will naturally funnel into gaps and cluster, increasing merge frequency. The existing merge system checks every 0.5s with `ZOMBIE_RADIUS * (scale_a + scale_b)` detection — clustered zombies will trigger this much more often. This makes terrain a core strategic element rather than a nuisance.

**Acceptance Criteria:**
- Zombies cannot walk through trees, rocks, fallen logs, mushroom clusters, or stumps
- Zombies visibly funnel around terrain obstacles, clustering at gaps
- Zombie merges increase noticeably in areas with dense terrain
- Player can use terrain as cover / chokepoints
- No performance regression at high zombie counts (200+)
- Zombie navigation doesn't permanently stall (they should still reach the player eventually via sliding along obstacles)
- Boss zombies also respect terrain collision

---

## Conflict Analysis

No conflicts with other beads. Changes are localized to the enemy movement section of `game3d.js` (lines 6773-6824). The terrain collider system in `terrain.js` is read-only from the zombie's perspective.

---

## Review Notes

**Reviewer:** Code review (2026-02-27)

### Root Cause Assessment
Correct and well-analyzed. Confirmed by reading lines 6795-6824: the zombie movement (lines 6799-6800) applies the full beeline velocity FIRST, then the collision pushback (lines 6808-6824) resolves overlap AFTER. Since the pushback only resolves the current frame's overlap and the next frame re-applies the full beeline vector, the zombie effectively tunnels through obstacles across multiple frames. The collision code technically works per-frame but is functionally defeated by the movement model.

### Recommended Solution: Option A (Movement-blocking collision)
Option A is the correct choice. The key insight in the bead is right: the fix is not about adding new collision detection but about making position update and collision resolution atomic. The proposed code is essentially correct.

However, the bead's description of "the same technique" oversimplifies slightly. Here is the precise implementation approach:

**Atomic move-then-resolve:**
```js
// 1. Calculate intended new position
let newX = e.group.position.x + nx * eSpd * gameDt;
let newZ = e.group.position.z + nz * eSpd * gameDt;

// 2. Clamp to map boundaries
newX = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newX));
newZ = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, newZ));

// 3. Resolve terrain collisions on the new position
if (terrainState) {
  const ER = 0.5; // increased from 0.4 to match player feel
  const nearby = getNearbyColliders(newX, newZ, terrainState);
  for (let ci = 0; ci < nearby.length; ci++) {
    const c = nearby[ci];
    const cdx = newX - c.x;
    const cdz = newZ - c.z;
    const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
    const minDist = ER + c.radius;
    if (cDist < minDist && cDist > 0.001) {
      const pushDist = minDist - cDist;
      newX += (cdx / cDist) * pushDist;
      newZ += (cdz / cDist) * pushDist;
    }
  }
}

// 4. Commit the resolved position
e.group.position.x = newX;
e.group.position.z = newZ;
```

This replaces lines 6795-6824 entirely. The separate post-hoc collision block (6808-6824) is removed because collision is now integrated into the movement.

### Why NOT Options B or C
- **Option B (larger radius):** Band-aid. Larger radius means zombies overlap with obstacles less but still tunnel. Does not solve the fundamental move-then-push-out pattern.
- **Option C (steering):** Overengineered. Steering behaviors add complexity (ray casting, heading interpolation, oscillation damping) with minimal visual improvement over slide-along-surface. Not justified for this game's scope.

### Additional Edge Cases / Risks
- **Flee behavior (lines 6783-6794):** The flee-from-boss code at lines 6783-6794 also applies movement WITHOUT terrain collision. Fleeing zombies will still phase through obstacles. Apply the same atomic move-then-resolve pattern to the flee path.
- **Boss zombies:** Verify that boss enemies also go through this movement path. If bosses have a separate movement routine, apply the same fix there.
- **Zombies stuck in terrain on spawn:** If a zombie spawns inside a decoration's collision radius, the pushback will eject it — but if it spawns perfectly centered on a collider, `cDist` could be near-zero causing jitter. The `cDist > 0.001` guard handles this, but monitor for spawn-stuck reports.
- **Dense decoration clusters:** In areas with many overlapping decoration collision radii, a zombie could be pushed into a second collider by the first. Running the collision loop once is usually sufficient since decorations don't overlap, but consider a second pass (2 iterations) if testing reveals edge cases with tightly packed rocks/stumps.
- **Performance:** The bead correctly notes that `getNearbyColliders()` already runs per-zombie per-frame. The change replaces the existing call, not adding a new one. The only difference is querying with `(newX, newZ)` instead of `(e.group.position.x, e.group.position.z)` — no performance impact.
- **Merge system synergy:** This is the biggest gameplay win. Funneled zombies will cluster at terrain gaps, dramatically increasing same-tier proximity and thus merge frequency. This will naturally produce more high-tier zombies, which increases difficulty. Monitor whether wave pacing or zombie HP needs adjustment after this change to avoid difficulty spikes.

### Estimated Complexity
M (Medium) — the core movement change is small (~20 lines replaced), but it needs to be applied to both normal pursuit and flee behavior, tested with boss zombies, and playtested for gameplay balance impact. The merge frequency increase may require tuning.

### Dependencies
- None from other beads in this batch.
- Gameplay balance testing should happen AFTER this change lands, as merge frequency will increase.

### Implementation Order
**Priority 3 of this batch** (after BD-251, BD-250). This is the highest-impact gameplay improvement but is P1 not P0. The game must be playable (BD-251) and readable (BD-250) before terrain funneling matters.

### Testing Plan
1. Observe zombies approaching through a forest — they should visibly path around trees, not through them.
2. Position yourself behind a rock — zombies should funnel around it from both sides.
3. Verify zombies still reach the player (no permanent stuck states).
4. Check merge frequency in dense terrain vs. open areas — merges should be more frequent near obstacles.
5. Performance test with 200+ zombies near terrain — verify no FPS drop.
6. Test flee behavior (boss spawn) — fleeing zombies should also respect terrain.
7. Test boss zombie terrain collision.
