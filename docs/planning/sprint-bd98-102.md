# Sprint: BD-98 through BD-102 — Map, Loot, Totems, Walls, Weapon Slot

**Date:** 2026-02-23
**Focus:** Minimap accuracy, loot visibility, totem count, wall transparency, auto-attack removal

---

## BD-98: Minimap doesn't match map limits — player shown at center regardless of position
**Category:** Bug — HUD/Minimap
**Priority:** P1
**File(s):** `js/3d/hud.js`

### Description
The minimap always centers on the player but provides no reference for the actual map boundaries. A player standing near the map edge wall appears to be at the center of the minimap, giving no sense of where they are on the overall map. The map boundary edges (at MAP_HALF = 128) need to be drawn on the minimap.

### Fix
- Draw the map boundary rectangle on the minimap (at +-MAP_HALF on both axes)
- On full map view (TAB), set mmRange to cover the full MAP_HALF (128+) so the entire map is visible
- Pass MAP_HALF into the HUD state or hardcode 128

### Acceptance Criteria
- Map boundary edges visible on minimap as lines/border
- Full map view (TAB) shows the entire playable area
- Player position relative to map edges is clearly readable

---

## BD-99: Loot drops from zombies still not appearing — increase rates and add visual feedback
**Category:** Bug — Loot System
**Priority:** P1
**File(s):** `js/game3d.js`

### Description
Despite BD-95 adding tier-based loot drops, players report seeing zero loot from zombies. The drop rates (1-5%) combined with the inner roll distribution mean actual item/crate drops are extremely rare. Increase base drop rates significantly and add floating text feedback when loot drops.

### Fix
- Increase drop rates: T1=5%, T2=10%, T3=15%, T4+=25%
- Add floating text ("LOOT!" or item name) when a drop occurs so it's noticeable
- Ensure createPowerupCrate and createItemPickup return valid objects

### Acceptance Criteria
- Players see loot drops within first few minutes of gameplay
- Floating text announces drops visually
- Higher tier zombies drop loot noticeably more often

---

## BD-100: Not enough "NOT HARD ENOUGH" difficulty totems — minimum 10 in playable area
**Category:** Bug — Spawning
**Priority:** P1
**File(s):** `js/game3d.js`, `js/3d/constants.js`

### Description
Two problems: (1) SPAWN_HALF_RANGE was set to 400 in BD-88 but MAP_HALF is only 128, so totems/shrines spawn outside the playable area. (2) Not enough difficulty totems for the user's taste.

### Fix
- Fix SPAWN_HALF_RANGE to be MAP_HALF - 10 (= 118) so everything spawns inside the playable area
- Increase TOTEM_COUNT from 16 to at least 20 (ensuring 10+ survive the spacing filter)
- Reduce MIN_SHRINE_SPACING from 50 to 20 so more objects can fit in the 256x256 map
- Same fix applies to shrines and challenge shrines — all must be inside MAP_HALF

### Acceptance Criteria
- All totems, shrines, charge shrines, challenge shrines spawn inside the playable map boundaries
- At least 10 difficulty totems ("NOT HARD ENOUGH") present per map
- Shrines still reasonably spaced but not so sparse they're unfindable

---

## BD-101: Map edge walls block visibility — add transparency
**Category:** Enhancement — Terrain/Visuals
**Priority:** P2
**File(s):** `js/game3d.js`

### Description
The boundary walls are fully opaque, blocking the player's view of their character and nearby objects when the camera angle looks through the wall. Make the walls semi-transparent so players can see through them.

### Fix
- Change wall material from MeshLambertMaterial to MeshLambertMaterial with `transparent: true, opacity: 0.35`
- Consider adding a subtle wireframe or grid pattern for readability

### Acceptance Criteria
- Walls are visibly present but see-through (30-40% opacity)
- Player model and objects near walls are visible through them
- Walls still cast/receive shadows

---

## BD-102: Remove hidden auto-attack / default melee — creatures start with 1 weapon only
**Category:** Bug — Weapons/Combat
**Priority:** P1
**File(s):** `js/game3d.js`

### Description
There appears to be an auto-attack system (timer-based melee that hits nearest enemy) running independently of the weapon slot system. This shows as an invisible 5th attack. The user wants it removed — each creature should only have their 1 starting weapon and weapons gained through upgrades.

### Fix
- Find and disable/remove the auto-attack timer system
- Ensure only weapons in st.weapons[] produce attacks
- If auto-attack was the primary damage source, weapon cooldowns may need adjustment to compensate

### Acceptance Criteria
- No attacks fire outside of the weapon slot system
- Each creature starts with exactly 1 weapon (their ANIMAL_WEAPONS type)
- All attacks are visible in the HUD weapon slots

---

## Parallelization

### Recommended Batches
1. **Agent 1:** BD-98 (minimap boundaries — hud.js only)
2. **Agent 2:** BD-99 + BD-100 (loot rates + totem spawning — both in game3d.js spawn/kill sections, related spawn range fix)
3. **Agent 3:** BD-101 (wall transparency — game3d.js wall creation, isolated section)
4. **Agent 4:** BD-102 (auto-attack removal — game3d.js combat/update loop)
