# BD-260: Item Pickup Fanfare — slot-machine reveal with pause, showcase, and reroll

**Date:** 2026-02-28
**Source:** Creative direction — item pickups currently flash a small banner and apply immediately. There's no moment of anticipation or excitement. Items should feel like an EVENT — the game pauses, a slot-machine-style reveal plays through possible items before landing on your roll, the item is showcased with its name/description/effect, and you get up to 2 rerolls per wave.

---

## P1 — Game Feel / Feature

---

### BD-260: Item pickup fanfare with slot-machine reveal, showcase card, and wave-limited rerolls

**Category:** Feature (game feel, item system, UX)
**Priority:** P1
**File(s):** `js/game3d.js` (item pickup logic ~line 7638, state init ~line 280, input handler ~line 756), `js/3d/hud.js` (new fanfare rendering), `js/3d/constants.js` (ITEMS_3D reference for image pool)

---

## Current Behavior

When the player walks over an item pickup (game3d.js ~line 7649):
1. Item is auto-equipped or stacked immediately
2. A small banner appears for 2.5s showing name + description (hud.js ~line 1488)
3. Game slows to 0.5x for 0.3s (`st.itemSlowTimer`)
4. Sound plays (`sfx_item_pickup` + `sfx_level_up`)

**Problems:**
- No anticipation — item goes straight into inventory with no ceremony
- Banner is small and fleeting — easy to miss what you got
- No player agency — you take whatever drops, no choice involved
- Doesn't match the excitement level of the level-up upgrade menu, which pauses the game and presents cards

---

## Desired Behavior

### Phase 1: Slot-Machine Reveal (~1.5s)

When the player touches an item pickup:
1. Game **pauses** (mirrors upgrade menu: `st.paused = true`)
2. Screen darkens (overlay like upgrade/shrine menus)
3. A **slot-machine/dice roller** animation plays center-screen:
   - Shows a rapid carousel of item images/icons cycling through the pool of possible items
   - Starts fast, decelerates, lands on the actual rolled item
   - Each "slot frame" shows the item's icon (colored box with item symbol), name, and rarity border
   - The pool shown should be the REAL available item pool (same items that `createItemPickup` could have rolled) — this communicates the random selection nature honestly
   - Landing moment: brief screen flash in rarity color, satisfying audio sting

### Phase 2: Showcase Card (hold until player acts)

4. The rolled item is presented on a **showcase card** (large, centered):
   - Item name (bold, rarity-colored)
   - Rarity label (e.g., "SHINY STUFF" in rarity color)
   - Description text (what it does, in kid-friendly language — already exists as `it.desc`)
   - Item icon/visual (colored box representation matching the item's identity)
   - If stackable, show current stack count → new count (e.g., "THICK FUR x2 → x3")
   - If replacing a slot (non-stackable, slot occupied), show CURRENT vs NEW comparison below the showcase (reuse existing wearable comparison layout from hud.js ~line 1160)

### Phase 3: Player Choice

5. Player can:
   - **Press ENTER to accept** — equip/stack the item, unpause, resume play
   - **Press R to reroll** (up to 2 times per wave) — triggers another slot-machine spin with a new random item from the pool. Counter shows "N rerolls left this wave"
   - If slot occupied by non-stackable: arrow keys to choose KEEP or EQUIP (mirrors existing wearable compare at hud.js ~line 1160), THEN confirm with ENTER

### Phase 4: Exit

6. On accept:
   - Item applies to player state (existing apply logic)
   - Brief flash in rarity color
   - Unpause (`st.paused = false`)
   - 1.0s post-pickup invincibility (like `POST_UPGRADE_INVINCIBILITY`)

---

## State Design

### New state variables (add to state init ~line 280):

```js
// BD-260: Item fanfare
itemFanfare: null,        // null when inactive, object when active:
// {
//   phase: 'rolling' | 'showcase',
//   item: <ITEMS_3D entry>,        // the rolled item
//   pickup: <pickup object>,       // world pickup reference (for removal on accept)
//   rollTimer: 0,                  // countdown for slot-machine animation (1.5s)
//   rollPool: [],                  // array of ITEMS_3D entries shown in carousel
//   rollIndex: 0,                  // current visible item in carousel
//   rollSpeed: 0,                  // current spin speed (decelerates)
//   slotOccupied: false,           // true if non-stackable replacing existing
//   currentItemId: null,           // existing item in slot (for comparison)
//   choice: 0,                     // 0=accept, 1=equip new (when comparing)
// }
itemFanfareRerolls: 2,    // rerolls remaining this wave (resets on wave event)
itemFanfareWave: 1,       // wave number when rerolls were last reset
```

### Reroll reset (add to spawnWaveEvent ~line 2569):

```js
st.itemFanfareRerolls = 2;  // BD-260: reset item rerolls each wave
```

---

## Slot-Machine Visual Design

### Carousel Layout

The carousel is a vertical strip of item "faces" scrolling upward through a visible window, like a slot machine reel:

```
     ┌──────────────────────┐
     │  ░░ (faded above) ░░ │   ← previous item (faded out)
     ├──────────────────────┤
     │                      │
     │   [ITEM ICON/BOX]    │   ← current visible item (full opacity)
     │   ITEM NAME          │
     │   ────────────       │
     │   Rarity border      │
     │                      │
     ├──────────────────────┤
     │  ░░ (faded below) ░░ │   ← next item (faded out)
     └──────────────────────┘
```

### Animation Timing

- **Total roll duration:** ~1.5 seconds
- **Initial speed:** ~20 items/second (fast blur)
- **Deceleration curve:** exponential ease-out — `speed *= 0.96` per frame
- **Stop threshold:** when speed < 0.5 items/sec, snap to final item
- **Landing moment:**
  - Screen flash in rarity color (0.15s)
  - Sound: `sfx_level_up` (reuse existing)
  - Card border pulses once

### Item "Face" Rendering

Each item in the carousel is rendered as a compact card:
- **Background:** dark box with rarity-colored border (2px)
- **Icon area:** colored square (~48x48) using the item's rarity color with a simple symbolic shape:
  - Armor items → shield shape
  - Boot items → boot shape
  - Stackable items → the item's first letter large and bold
  - This is intentionally simple — voxel-art item icons can be a future bead
- **Name:** bold 14px, rarity-colored, below icon
- **Rarity color coding:** common=white, uncommon=green, rare=blue, legendary=orange

### Carousel Pool

The pool shown in the carousel should be the **actual available item pool** (same filtering logic as `createItemPickup` at game3d.js ~line 2314):
- Stackable items: always in pool
- Non-stackable items: only if slot is empty OR same slot (triggers comparison)
- Exclude already-equipped unique items
- Weighted by rarity (common items appear more often in the spin, reflecting real drop rates)

This is critical — the slot machine should feel HONEST, not rigged. Seeing legendary items fly by and missing them creates authentic anticipation. Landing on one feels earned.

---

## Showcase Card Design

After the roll lands, the carousel fades and a larger showcase card appears:

```
┌────────────────────────────────────┐
│          ★ SHINY STUFF ★           │  ← rarity label (colored)
│                                    │
│         ┌──────────────┐           │
│         │              │           │
│         │  [ITEM ICON] │           │  ← large icon (80x80)
│         │              │           │
│         └──────────────┘           │
│                                    │
│        CHAINMAIL ARMOR             │  ← item name (bold, rarity color)
│     Takes 40% less damage!         │  ← description (gray)
│                                    │
│     ── Currently Equipped ──       │  ← only if slot occupied
│     LEATHER ARMOR                  │
│     Takes 25% less damage!         │
│                                    │
└────────────────────────────────────┘

         PRESS ENTER TO EQUIP
    Press R for NEW ROLL! (2 left)
```

- Card dimensions: ~360w × 300h (larger than upgrade cards)
- If replacing: show comparison section (current vs new) within the card
- If stackable: show "x2 → x3" count change
- Pulsing ENTER prompt (matches existing pattern)
- Reroll prompt in blue with count

---

## Input Handling

Add a new input block in the keydown handler (~line 756), between the upgrade menu and wearable compare handlers:

```js
} else if (st.itemFanfare && st.itemFanfare.phase === 'showcase' && !st.gameOver) {
  // BD-260: Item fanfare input
  if (st.itemFanfare.slotOccupied) {
    // Arrow keys to choose keep/equip (like wearable compare)
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') st.itemFanfare.choice = 0;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') st.itemFanfare.choice = 1;
  }
  if (isFreshConfirm) {
    // Accept: apply item, close fanfare, unpause
    applyItemFanfareChoice(st);
  }
  if (e.code === 'KeyR' && st.itemFanfareRerolls > 0) {
    // Reroll: re-spin with new random item
    st.itemFanfareRerolls--;
    startItemFanfareRoll(st, st.itemFanfare.pickup); // new roll from same pool
  }
}
```

During the `'rolling'` phase, all input is ignored (the animation plays out).

---

## Integration with Existing Pickup Flow

### Modify item pickup (game3d.js ~line 7649):

**BEFORE:** Item is immediately equipped, banner shown, slow-mo applied.

**AFTER:** Instead of immediate equip, trigger the fanfare:

```js
// BD-260: Instead of immediate pickup, open fanfare
st.itemFanfare = {
  phase: 'rolling',
  item: selectedItem,           // the randomly selected ITEMS_3D entry
  pickup: itemPickups[i],       // reference to world pickup for removal
  rollTimer: 1.5,
  rollPool: buildItemPool(st),  // available items for carousel display
  rollIndex: 0,
  rollSpeed: 20,                // items/sec initial speed
  slotOccupied: isSlotOccupied, // whether this triggers comparison
  currentItemId: currentlyEquipped, // for comparison display
  choice: 0,                    // default: accept/keep
};
st.paused = true;
playSound('sfx_item_pickup');
// Remove the old st.itemAnnouncement, st.itemSlowTimer, st.itemFlashTimer logic
// Those are replaced by the fanfare
```

### Remove/gate old pickup feedback:

The existing `st.itemAnnouncement` banner (hud.js ~line 1488) should NOT display when the fanfare is active. Either:
- Skip the announcement entirely when fanfare fires (the showcase card replaces it)
- OR keep it as a brief post-fanfare reminder (less useful, probably skip)

---

## Reroll Economy

- **2 rerolls per wave** (not per game, not per item — per wave)
- Resets when `spawnWaveEvent()` fires (game3d.js ~line 2569)
- Rerolls are shared across all item pickups in that wave
- This creates a strategic choice: "Do I reroll this common item hoping for rare, or save my rerolls for later?"
- Counter displayed on showcase card: "Press R for NEW ROLL! (N left)" / "No rerolls left"

---

## Edge Cases

1. **Player dies during fanfare rolling phase:** Force-close fanfare in death check (game3d.js ~line 8091), add `st.itemFanfare = null` to the menu-clearing block.
2. **Reroll lands on same item:** Allowed — that's how randomness works. The carousel makes it visually clear it was a fresh roll.
3. **Pickup despawns during fanfare:** The fanfare holds a reference to the pickup. Remove it from the world on fanfare start (so it can't despawn). If the player rejects (closes without accepting... actually, there is no reject — you must accept. Reroll or take it).
4. **Multiple items near each other:** Only one fanfare at a time. Other items remain on the ground. Next pickup triggers next fanfare.
5. **Stackable items during fanfare:** Show "x2 → x3" on showcase card. Apply is just increment.
6. **Boss-forced items (`forcedItemId`):** Skip the roll animation — go straight to showcase phase. The item is predetermined. Still allow viewing the card and pressing ENTER, but no reroll option ("This item was earned!").

---

## Audio

- **Roll start:** `sfx_item_pickup` (existing)
- **Roll ticking:** Optional subtle tick sound per item shown (~20/sec initially, decreasing). If no tick sound exists in the sound pack, skip — the visual is enough.
- **Roll landing:** `sfx_level_up` (existing, reuse for the "reveal" moment)
- **Reroll trigger:** `sfx_item_pickup` again (the whoosh of a new spin)
- **Accept/equip:** Short confirm sound (reuse whichever exists for upgrade confirm)

---

## Acceptance Criteria

1. Picking up an item pauses the game and triggers a slot-machine carousel animation (~1.5s)
2. Carousel shows real items from the available pool, weighted by rarity, decelerating to land on the rolled item
3. After landing, a showcase card displays the item's name, rarity, description, and icon
4. If replacing an equipped non-stackable, comparison is shown (current vs new)
5. Player presses ENTER to accept the item
6. Player can press R to reroll (up to 2 times per wave), triggering a new spin
7. Reroll counter resets each wave event
8. Boss-forced items skip to showcase (no reroll)
9. Fanfare force-closes on player death
10. No gameplay regression — items still apply correctly, stacking works, slot comparison works

---

## Conflict Analysis

Moderate integration surface:
- **game3d.js** — item pickup flow (~line 7649), state init (~line 280), input handler (~line 756), death check (~line 8091), wave event (~line 2569)
- **hud.js** — new rendering section (add after charge shrine menu, ~line 1157). Suppress old `itemAnnouncement` banner when fanfare active.
- **constants.js** — read-only reference to ITEMS_3D and ITEM_RARITIES for pool building

No conflicts with BD-257 (shrine labels), BD-258 (tick try-catch), BD-259 (spawn rate). Could conflict with any bead that also modifies the item pickup flow at ~line 7649.

---

## Estimated Complexity

L (Large) — new game state, new animation system (carousel), new HUD rendering section (~150 lines), modified pickup flow, reroll economy, input handling, edge cases. Estimated 300-400 lines of new code across game3d.js and hud.js.
