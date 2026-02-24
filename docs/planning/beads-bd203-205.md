# Beads: BD-203 through BD-205

**Date:** 2026-02-24
**Source:** Manual playthrough feedback + screenshots — zombie flicker, wearable text overlap, need for pixel art icons.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Critical UX or balance issue affecting playability | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |

---

## P1 -- Readability

---

### BD-203: Zombie hurt flash fires too frequently — creates constant strobing

**Category:** UX — Readability
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2655, 5334-5344

**Description:** The zombie hurt flash system (BD-166) turns the entire zombie body white for 0.15 seconds every time damage is applied. With auto-attack weapons hitting every 0.3-0.5 seconds, and AoE weapons hitting multiple times per second, zombies spend more time white than their actual color. This creates a constant strobing/flickering effect that is visually distracting and makes it hard to distinguish zombie tiers by color — which is the entire point of the tier visual system.

The flash also sets body AND head to white (line 5334-5344), making the zombie completely unrecognizable during the flash. For a 7-year-old, the flickering is confusing and potentially uncomfortable.

**Current implementation (lines 2655, 5334-5344):**
- On every `damageEnemy()` call: `e.hurtTimer = 0.15`
- Every frame: if `hurtTimer > 0`, set body+head to `0xffffff` (pure white)
- When timer expires: restore `e.bodyColor` and `e.headColor`
- No cooldown — a second damage hit immediately restarts the flash

**Root problem:** The 0.15s flash resets on EVERY damage tick with NO minimum interval between flashes. With weapons dealing damage every 0.3-0.5s, the zombie flashes white→normal→white→normal in rapid succession.

**Fix Approach:**

Add a flash cooldown so the hurt flash can only trigger once per second maximum:

1. Add `e.hurtFlashCooldown = 0` to enemy creation.

2. In `damageEnemy()` (~line 2655), only set `hurtTimer` if cooldown has expired:
   ```js
   if (e.hurtFlashCooldown <= 0) {
     e.hurtTimer = 0.15;
     e.hurtFlashCooldown = 1.0; // Don't flash again for 1 second
   }
   ```

3. Decrement `e.hurtFlashCooldown` alongside `hurtTimer` in the enemy update loop.

4. Consider reducing flash intensity: instead of pure white (0xffffff), use a lighter tint of the zombie's actual body color. This preserves tier color identity during the flash:
   ```js
   // Instead of pure white, mix 50% white with body color
   const flashColor = lerpColor(e.bodyColor, 0xffffff, 0.5);
   ```

**Acceptance Criteria:**
- Zombies flash at most once per second when taking continuous damage
- The flash is noticeable but not a rapid strobe
- Zombie tier colors remain identifiable during flash (not pure white)
- Single big hits (power attack, explosions) still produce a visible flash
- No visual regression to attack telegraph flashes (those are separate, keep as-is)

---

### BD-204: Wearable slot text overlapping between slots

**Category:** Bug — HUD Readability
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 322-333

**Description:** Screenshot shows wearable equipment names overlapping: "Party Ha", "Cardboard", "Spring Boots" run into each other, and effect descriptions ("Fun hat!", "Tough box!", "Boing boing!") overlap as well. The slots are 55px wide with 8px gaps, but centered text at 12px bold can easily exceed slot boundaries when names are long.

**Current rendering (lines 322-333):**
- Item names: bold 12px, centered on slot, truncated to 12 chars (but 12 chars at 12px bold can be ~72px wide — wider than the 55px slot + 8px gap = 63px available space)
- Effect descriptions: 10px, centered on slot, NO truncation at all

**Fix Approach:**

1. **Reduce max name length** from 12 chars to 8 chars with ellipsis:
   ```js
   const displayName = itemDef.name.length > 8 ? itemDef.name.slice(0, 7) + '.' : itemDef.name;
   ```

2. **Add `ctx.save()/ctx.restore()` with clipping** to prevent text from bleeding into adjacent slots. Before rendering each slot's text, set a clip rect:
   ```js
   ctx.save();
   ctx.beginPath();
   ctx.rect(slotX - 2, slotY + SLOT_SIZE, SLOT_SIZE + 4, 40);
   ctx.clip();
   // ... render name and effect text ...
   ctx.restore();
   ```

3. **Truncate effect descriptions** to ~10 chars as well, or reduce font to 9px.

4. **Reduce name font** from bold 12px to bold 11px for better fit.

**Acceptance Criteria:**
- Wearable item names never overlap into adjacent slots
- Effect descriptions never overlap into adjacent slots
- Text is still readable (not too small)
- Long item names are cleanly truncated with ellipsis
- All 3 slots display correctly simultaneously with any item combination

---

### BD-205: Add pixel art icons to wearable equipment slots

**Category:** Enhancement — Visual/Readability
**Priority:** P2
**File(s):** `js/3d/hud.js` ~lines 312-321, `js/3d/constants.js`

**Description:** The wearable equipment slots currently show only a colored silhouette (hat/shirt/boots outline) filled with the rarity color when equipped. For a 7-year-old, these are hard to distinguish — a green hat silhouette looks the same as a blue hat silhouette except for color. The user wants pixel art icons that show what each specific item looks like, matching the voxel art style of the game.

The codebase already uses procedural pixel art extensively (2D mode draws entire animal sprites with `ctx.fillRect()` blocks, armor pickups in renderer.js lines 1569-1643 draw detailed armor shapes). This same approach should be used for wearable slot icons.

**Fix Approach:**

1. **Add a `drawIcon(ctx, cx, cy, size)` function to each wearable definition in WEARABLES_3D** (constants.js). Each function draws the item as pixel art using small `ctx.fillRect()` calls centered at (cx, cy) within the given size. The functions should use the item's primary color.

   Example icons (voxel/pixel style, drawn with small colored rectangles):

   **HEAD items:**
   - Party Hat: colored triangle with pom-pom on top
   - Shark Fin: gray vertical fin shape
   - Bumble Helmet: yellow helmet with black stripes and antennae
   - Crown of Claws: gold band with spike points on top

   **BODY items:**
   - Cardboard Box: brown box with tape strips
   - Bumble Armor: yellow chest plate with black stripe
   - Knight Plate: gray chest with shoulder pads
   - Dragon Scale: green chest with scale pattern

   **FEET items:**
   - Spring Boots: boots with coiled springs underneath
   - Rocket Boots: boots with small flame/exhaust at bottom
   - Shadow Steps: dark translucent boots with purple glow
   - Gravity Stompers: chunky purple boots with glow

2. **In hud.js**, when rendering an equipped slot, call the item's `drawIcon()` instead of the generic silhouette. Fall back to the existing silhouette if no `drawIcon` is defined.

3. **Icon size:** Each icon should fit within a ~40x40px area centered in the 55x55 slot (leaving room for the border).

4. **Color scheme:** Use the item's primary color (`itemDef.color`) as the base, with darker/lighter shades for detail. Legendary items should have a subtle glow effect (draw a slightly larger semi-transparent shape behind the icon).

**Acceptance Criteria:**
- Each wearable item has a unique, recognizable pixel art icon
- Icons are drawn procedurally using `ctx.fillRect()` (no external assets)
- Icons fit within 40x40px centered in the 55px slot
- Empty slots still show the generic silhouette (hat/shirt/boots)
- Icons match the voxel art style of the game
- A 7-year-old can tell items apart at a glance by their icon shape
- Rarity border color still visible around the icon
- No performance impact (icons are simple rect drawings)

---

## Conflict Analysis

- **BD-203** touches game3d.js (enemy damage + update loop) — NO conflict with BD-204/205
- **BD-204** touches hud.js (wearable text rendering) — LOW conflict with BD-205 (same section but different lines)
- **BD-205** touches hud.js (wearable icon rendering) + constants.js (WEARABLES_3D) — LOW conflict with BD-204

**Recommended batches:**
- **Agent 1:** BD-203 (zombie flash — isolated in game3d.js)
- **Agent 2:** BD-204 + BD-205 (both touch wearable slot rendering in hud.js, do together to avoid conflicts)
