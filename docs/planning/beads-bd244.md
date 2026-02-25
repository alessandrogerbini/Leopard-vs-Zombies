# BD-244: Multi-jump system — double/triple jumps, charge shrine upgrades, late-game aerial gameplay

**Category:** Game Design / Movement / Progression
**Priority:** P1-High (creative director request)
**File(s):** `js/game3d.js` (jump logic, charge shrine system), `js/3d/constants.js` (shrine augments, wearables, items)

## Problem

Jumping is capped at a single jump. There's no way to gain additional jumps through progression. Late-game movement feels the same as early-game — the player never achieves the power fantasy of soaring above the map and chaining jumps together.

## Design Goals

1. **Multi-jump as a progression reward** — double jump, triple jump, and beyond should be obtainable through charge shrines, items, and wearables
2. **Jump height scaling** — boots and items that increase jump force and hang time
3. **Late-game aerial identity** — by level 20+, a well-built character should be jumping high enough to see large portions of the map below, chaining jumps together
4. **Charge shrine integration** — extra jumps should be one of the random augment options from charge shrines
5. **Hang time mechanics** — items that slow descent or extend peak hover time

## Investigation Needed

An agent should:
1. Read the current jump system in game3d.js (jump force, gravity, ground detection, platform logic)
2. Read the charge shrine augment system (how augments are offered and applied)
3. Read the current wearable/item system for feet slot and jump-related items
4. Read the camera system to understand how high jumps would affect the player's view
5. Design a multi-jump progression system with shrine augments, items, and wearables
6. Consider camera behavior during high jumps (zoom out? track smoothly?)
7. Write findings and implementation beads

## Acceptance Criteria

- Forward plan covers multi-jump acquisition, height scaling, hang time mechanics
- Charge shrine integration is designed
- Camera behavior at extreme heights is addressed
- Late-game aerial gameplay vision is clearly described
- Broken into implementation beads
