# Sprint: BD-88 through BD-96 — Gameplay Polish & Spawn Fixes

**Date:** 2026-02-23
**Focus:** Terrain collision fixes, zombie balancing, loot/XP drops, HUD polish

---

## BD-88: Shrines spawn clumped near map center instead of spread out
**Category:** Bug — Terrain/Spawning
**Priority:** P1
**File(s):** `js/3d/terrain.js`, `js/game3d.js`

### Description
Shrines are spawning clustered together near the center of the map rather than being distributed across the terrain. They should be spread out across chunks as the player explores, with proper spacing between them.

### Acceptance Criteria
- Shrines spawn distributed across chunks, not clumped near origin
- Minimum distance enforced between shrines
- Shrines appear in newly generated chunks as player explores outward

---

## BD-89: Trees spawn inside rocks and platforms (decoration collision)
**Category:** Bug — Terrain Generation
**Priority:** P1
**File(s):** `js/3d/terrain.js`

### Description
Trees are overlapping with rocks and elevated platforms during chunk decoration. Decorations need collision/overlap checks so that trees don't spawn inside or on top of other decorations or platforms.

### Acceptance Criteria
- Trees do not overlap with rocks, platforms, or other solid decorations
- Decoration placement checks for existing objects in the same area before placing
- Existing decoration types (trees, rocks, fallen logs, mushroom clusters, stumps) respect each other's footprints

---

## BD-90: Tier 3-4 zombies move too slowly compared to small zombies
**Category:** Bug — Enemy Behavior
**Priority:** P2
**File(s):** `js/game3d.js`

### Description
Big merged zombies (tier 3 and tier 4) are noticeably slower than tier 1 zombies. Higher-tier zombies should move at least as fast as small zombies — they are supposed to be more dangerous, not easier to kite.

### Acceptance Criteria
- Tier 3-4 zombies move at speeds equal to or greater than tier 1 base speed
- Speed should scale slightly upward with tier (e.g. tier 3 = 1.0x, tier 4 = 1.1x of base)
- Chill Mode speed modifier still applies on top

---

## BD-91: Increase base zombie spawn rates by 25%
**Category:** Enhancement — Enemy Spawning
**Priority:** P2
**File(s):** `js/game3d.js`

### Description
Not enough zombies are spawning during gameplay. Increase all base zombie spawn rates by 25% to create more pressure and action.

### Acceptance Criteria
- Base spawn rate constants increased by 25%
- Wave-based spawn counts also scaled up 25%
- Chill Mode modifier still applies on top of new rates

---

## BD-92: Reduce time between zombie waves by 30%
**Category:** Enhancement — Enemy Spawning
**Priority:** P2
**File(s):** `js/game3d.js`

### Description
The gap between zombie waves is too long, creating dead time. Reduce the interval between waves by 30% so combat stays intense.

### Acceptance Criteria
- Wave interval timers reduced by 30% (multiply by 0.7)
- First wave timing unchanged (or also reduced if it feels slow)
- Wave difficulty progression still scales correctly with reduced intervals

---

## BD-93: Wave warning text obscures player view — move to top of screen
**Category:** Bug — HUD/UI
**Priority:** P2
**File(s):** `js/3d/hud.js`

### Description
The "new wave incoming" text notification renders in the center of the screen and blocks the player's view of gameplay. Move it to the top of the screen where it's visible but non-obstructive.

### Acceptance Criteria
- Wave warning text renders along the top of the screen (top 10-15% area)
- Text is still clearly visible and readable
- Does not overlap with existing top HUD elements (HP/XP bars)
- No longer obscures the center gameplay area

---

## BD-94: Dead zombies drop health regen instead of XP crystals
**Category:** Bug — Loot/Progression
**Priority:** P1
**File(s):** `js/game3d.js`

### Description
When zombies die, they spawn what appears to be green health regeneration pickups. This is wrong — zombie kills should drop XP crystals that advance player leveling, not health. The drop visual and pickup effect need to be corrected.

### Acceptance Criteria
- Zombie deaths spawn XP crystals (not health regen)
- XP crystals have a distinct visual (blue/purple, not green)
- Picking up XP crystals grants experience toward leveling
- Health regen drops removed from zombie death loot table

---

## BD-95: Zombies never drop loot (items/powerups) — add tier-based drop rates
**Category:** Bug — Loot System
**Priority:** P1
**File(s):** `js/game3d.js`

### Description
Zombies are not dropping any items or powerups on death. Implement a tier-based loot drop system where bigger zombies have higher drop chances.

### Drop Rates
- Tier 1: 1% chance
- Tier 2: 2% chance
- Tier 3: 3% chance
- Tier 4: 5% chance

### Acceptance Criteria
- Zombies roll for loot drop on death using tier-based percentages
- Dropped loot uses existing ITEMS_3D / POWERUPS_3D pools with rarity weighting
- Higher tier zombies drop from higher rarity tiers more often
- Loot spawns at zombie death position as a pickup

---

## BD-96: Challenge totem big zombies must always drop loot on death
**Category:** Bug — Loot System
**Priority:** P1
**File(s):** `js/game3d.js`

### Description
Challenge totems spawn big zombies as a reward encounter, but these zombies don't drop loot when killed. Totem-spawned zombies should have a 100% loot drop rate to reward the player for engaging the challenge.

### Acceptance Criteria
- Zombies spawned by challenge totems are flagged as totem-spawned
- Totem-spawned zombies always drop loot (100% rate) on death
- Loot quality biased toward uncommon+ rarity
- Works correctly alongside the general tier-based drop system (BD-95)

---

## Parallelization Notes

### Independent (can run in parallel)
- **Batch A — Terrain:** BD-88, BD-89 (both in terrain.js, but different systems — shrines vs decorations)
- **Batch B — Zombie Stats:** BD-90 (speed), BD-91 (spawn rate), BD-92 (wave interval)
- **Batch C — HUD:** BD-93 (wave text position — hud.js only)
- **Batch D — Loot/XP:** BD-94, BD-95, BD-96 (all touch zombie death logic in game3d.js)

### Conflict Matrix
- BD-91 and BD-92 both modify spawn/wave constants — low conflict, different values
- BD-94, BD-95, BD-96 all modify zombie death handling — **HIGH conflict**, should be one agent
- BD-88 and BD-89 touch terrain.js — **MEDIUM conflict**, different functions but same file

### Recommended Batches
1. **Agent 1:** BD-88 + BD-89 (terrain fixes)
2. **Agent 2:** BD-90 + BD-91 + BD-92 (zombie speed/spawn/wave tuning)
3. **Agent 3:** BD-93 (HUD wave text — isolated, quick)
4. **Agent 4:** BD-94 + BD-95 + BD-96 (loot/XP overhaul — tightly coupled)
