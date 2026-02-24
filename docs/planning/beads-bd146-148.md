# Beads: BD-146, BD-147, BD-148

**Date:** 2026-02-24
**Source:** Playtest screenshot — item drop flood, invisible pickups, need for wearable slots

---

## BD-146: Item drop rates are ~4x too high — reduce by 75%

**Category:** Balance — Loot Economy
**Priority:** P0
**File(s):** `js/game3d.js` (~line 2356, dropChance array in killEnemy)

### Description
Mid-game screenshot shows items dropping constantly — multiple item names floating on screen simultaneously, ground littered with pickups. Current base drop rates per tier are:
```
T1: 5%, T2: 10%, T3: 15%, T4: 25%, T5: 25%, T6: 30%, T7: 30%, T8: 40%, T9: 40%, T10: 60%
```
With Lucky Charm (+50%) and Lucky Penny (+8% per stack), these compound into near-constant drops. Items should feel special, not like confetti.

### Fix Approach
Reduce the `dropChance` array by ~75% across the board:

**Line ~2356, change from:**
```js
let dropChance = [0.05, 0.10, 0.15, 0.25, 0.25, 0.30, 0.30, 0.40, 0.40, 0.60][tierNum - 1];
```

**To:**
```js
let dropChance = [0.01, 0.02, 0.04, 0.06, 0.06, 0.08, 0.08, 0.10, 0.10, 0.15][tierNum - 1];
```

This gives: T1: 1%, T2: 2%, T4: 6%, T10: 15%. With Lucky Charm: T10 goes to ~22%. Still generous for high-tier kills, but not flooding.

### Acceptance Criteria
- Drop rates reduced by ~75% across all tiers
- Items feel special when they drop (not constant)
- Lucky Charm and Lucky Penny multipliers still work on top of new rates
- Totem-spawned forced drops unchanged
- Boss guaranteed legendary drops unchanged

---

## BD-147: Item pickup has zero fanfare — needs event-level feedback

**Category:** UX — Readability/Juice
**Priority:** P1
**File(s):** `js/game3d.js` (item pickup section ~line 5540+), `js/3d/hud.js`

### Description
When the player walks over an item pickup, it silently disappears with just a small floating text of the item name. For a kid-focused game, picking up an item should feel like an EVENT — a brief moment of celebration. Currently you can't even tell you picked something up amid the combat chaos.

### Fix Approach
Add multi-layered pickup feedback:

1. **Screen flash.** On item pickup, briefly tint the HUD canvas overlay with the item's rarity color at low opacity (0.15) for 0.2 seconds. This is a full-screen signal that something happened.
   - Add `st.itemFlashTimer` and `st.itemFlashColor` to state.
   - In HUD render: if `s.itemFlashTimer > 0`, draw a full-canvas rect with the flash color.

2. **Center-screen announcement.** Show the item name + description in a prominent center-screen banner for 2 seconds (larger than floating text, fixed position not world-space).
   - Add `st.itemAnnouncement` = `{ name, desc, color, timer }` to state.
   - In HUD render: if active, draw a centered box with item name (large font) + description (smaller font) below it.

3. **Brief time-dilation feel.** For 0.3 seconds after an item pickup, slow the game time by 50% (`dt *= 0.5`). This creates a "moment" without actually pausing.
   - Add `st.itemSlowTimer` to state.
   - In the `dt` calculation: if `st.itemSlowTimer > 0`, multiply dt by 0.5.

4. **Sound.** `sfx_item_pickup` exists but has an empty sound pool. For now, reuse `sfx_level_up` on item pickup until Julian records a proper sound.

### Acceptance Criteria
- Item pickup triggers a visible screen flash (rarity-colored)
- Item name + description shown center-screen for 2s in a prominent banner
- Brief time-slow (0.3s) creates a "moment" on pickup
- Sound plays on pickup
- All feedback uses rarity color (white/green/blue/orange)
- Regular XP/health/powerup pickups do NOT trigger this fanfare (items only)

---

## BD-148: Wearable equipment system — mutually exclusive visual slots

**Category:** Feature — Equipment System
**Priority:** P2 (design first, implementation separate)
**File(s):** `js/3d/constants.js`, `js/game3d.js`, `js/3d/player-model.js`

### Description
The current item system uses arbitrary slot names (boots, ring, charm, etc.) with no visual representation on the player character. Julian wants to SEE his character wearing cool stuff. We need a proper wearable slot system with mutually exclusive categories, visual meshes attached to the player model, and items that scale with the muscle-growth system.

### Wearable Slot Categories
Five visual equipment slots, each mutually exclusive (equipping a new item in a slot replaces the old one):

| Slot | Body Attachment Point | Visual Size (base) |
|------|----------------------|-------------------|
| **Hat** | Top of head | ~0.4 x 0.2 x 0.4 |
| **Armor** | Torso (chest) | ~0.6 x 0.5 x 0.3 |
| **Gloves** | Both hands (armL/armR ends) | ~0.15 x 0.15 x 0.15 each |
| **Boots** | Both feet (legL/legR ends) | ~0.2 x 0.15 x 0.25 each |
| **Accessory** | Back/neck | ~0.3 x 0.3 x 0.1 |

### Items Per Slot (5 each, one per rarity tier)

**Hats:**
| Rarity | Name | Color | Effect | Visual |
|--------|------|-------|--------|--------|
| Common | Baseball Cap | 0xcc2222 | +5% XP gain | Flat box on head, brim in front |
| Uncommon | Wizard Hat | 0x6644cc | +10% ability range | Tall cone/stack of boxes |
| Rare | Viking Helmet | 0xcccccc | +15% damage, +10 HP | Round box with horn boxes on sides |
| Legendary | Crown of Thorns | 0xffcc00 | +25% all damage | Ring of small spike boxes on head |

**Armor:**
| Rarity | Name | Color | Effect | Visual |
|--------|------|-------|--------|--------|
| Common | Leather Vest | 0xb08040 | -15% damage taken | Slightly wider torso box |
| Uncommon | Chainmail | 0xaaaacc | -25% damage taken | Segmented torso overlay |
| Rare | Knight Plate | 0xccccdd | -40% damage, +20 HP | Large plate box with shoulder pads |
| Legendary | Dragon Scale | 0x44cc44 | -50% damage, reflect 10% | Spiked torso with green glow |

**Gloves:**
| Rarity | Name | Color | Effect | Visual |
|--------|------|-------|--------|--------|
| Common | Gardening Gloves | 0x44aa44 | +5% attack speed | Small boxes at arm ends |
| Uncommon | Boxing Gloves | 0xff4444 | +15% melee damage | Oversized spherical boxes |
| Rare | Ice Gauntlets | 0x88ccff | 10% freeze chance on hit | Blue-glowing hand boxes |
| Legendary | Flame Fists | 0xff6600 | +30% damage, ignite on hit | Orange-glowing with emissive |

**Boots:**
| Rarity | Name | Color | Effect | Visual |
|--------|------|-------|--------|--------|
| Common | Sneakers | 0xffffff | +10% move speed | Small boxes at leg ends |
| Uncommon | Rocket Boots | 0xff8800 | +20% speed, higher jump | Chunky boxes with fin on back |
| Rare | Shadow Steps | 0x222244 | +15% dodge, leaves afterimages | Dark boxes, slight transparency |
| Legendary | Gravity Stompers | 0xaa44ff | +25% speed, ground pound on land | Large purple boxes with glow |

**Accessories (back/neck):**
| Rarity | Name | Color | Effect | Visual |
|--------|------|-------|--------|--------|
| Common | Bandana | 0xcc2222 | +5% all damage | Flat box behind neck |
| Uncommon | Cape | 0x4444cc | +10% cooldown reduction | Flat wide box behind torso |
| Rare | Wings (small) | 0xffffff | +15% speed, float effect | Two angled flat boxes on back |
| Legendary | Jetpack | 0xcccccc | +30% speed, double jump | Box stack on back with glow |

### Scaling with Player Model
The player model uses a `muscleScale` that grows with level (from `js/3d/player-model.js`). All wearable meshes must:
- Be children of the appropriate body part group (head, body, armL, armR, legL, legR)
- Scale proportionally with `muscleScale` (inherited from parent group)
- Use `box()` helper from `js/3d/utils.js` for construction
- Have emissive glow for rare/legendary items

### Replacement Logic
When equipping a new item in an occupied slot:
- Remove the old item's visual meshes from the player model
- Apply the new item's stat effects (remove old, add new)
- Show the replacement in the item announcement (BD-147)
- Old item is lost (no inventory — this is a roguelike)

### Implementation Notes
This is a DESIGN bead — implementation will be a separate sprint after the plan is finalized. The implementation will need to:
1. Refactor `ITEMS_3D` in constants.js to use the new slot categories
2. Add visual mesh builders per wearable in player-model.js
3. Modify the item pickup/equip flow in game3d.js
4. Update the HUD equipped items display

---

## Parallelization Notes
- **BD-146:** Simple number change, can launch immediately.
- **BD-147:** Touches game3d.js (pickup section) + hud.js. Independent of BD-146.
- **BD-148:** Design-only — needs plan refinement before implementation.
