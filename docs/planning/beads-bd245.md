# BD-245: Item pickup pageantry — chest opening ceremony, reveal animation, roll mechanic

**Category:** Game Feel / UX / Dopamine Loop
**Priority:** P1-High (creative director feedback)
**File(s):** `js/game3d.js` (item pickup, crate system), `js/3d/hud.js` (UI overlay), `js/3d/constants.js` (items, rarities)

## Problem

Item pickups are currently instant and forgettable — the player walks over an item and it silently goes into inventory. There's no ceremony, no anticipation, no dopamine spike. Compare to games like MegaBonk where opening a chest is a real event: the chest animates open, the item is revealed with fanfare, and you can even roll for it. That "will I get something amazing?" moment is completely absent.

## Design Goals

1. **Chest/crate opening should be an EVENT** — pause the action, animate the crate opening, build anticipation
2. **Item reveal with rarity fanfare** — the rarity tier (Common/Uncommon/Rare/Legendary) should determine the visual intensity of the reveal
3. **Consider a "roll" mechanic** — MegaBonk-style slot roll or dice roll before the item is revealed, increasing anticipation
4. **Dopamine scaling with rarity** — Common items get a quick reveal, Legendary items get full ceremony with screen effects
5. **Don't interrupt flow too much** — the reveal should be exciting but not annoying for common items

## Investigation Needed

An agent should:
1. Read the current item/crate pickup system in game3d.js (how items are picked up, what happens visually)
2. Read the ITEMS_3D and ITEM_RARITIES system in constants.js (rarity tiers, drop weights)
3. Read the powerup crate system (how crates spawn, break, and drop loot)
4. Read the current HUD item announcement system in hud.js
5. Research what makes chest-opening satisfying in games like MegaBonk, Vampire Survivors, Brotato
6. Design a tiered reveal system:
   - Common: Quick sparkle + name popup (0.5s, no game pause)
   - Uncommon: Brief pause + item floats up with glow + name/description (1s)
   - Rare: Game pauses + chest burst animation + colored light rays + dramatic reveal (1.5s)
   - Legendary: Full ceremony — slow-mo, gold light explosion, camera zoom, item spinning in spotlight, rarity text slam (2.5s)
7. Consider a "roll" UI — spinning icons that slow to a stop, slot-machine style
8. Write findings and implementation beads

## Acceptance Criteria

- Forward plan covers the full spectrum from Common to Legendary reveals
- Rarity-scaled visual ceremony is designed
- Roll/anticipation mechanic is evaluated (implement or reject with reasoning)
- HUD/overlay design for the reveal is specified
- Audio cues per rarity tier are noted
- Implementation broken into beads
