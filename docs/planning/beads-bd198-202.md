# Beads: BD-198 through BD-202

**Date:** 2026-02-24
**Source:** Manual playthrough feedback + screenshot — wearable slots empty, no equip choice, wave text too low, non-equippable items missing from HUD, loot still flooding.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |

---

## P0 -- Bug

---

### BD-198: Wearable items not displaying in HUD equipment slots

**Category:** Bug — HUD
**Priority:** P0
**File(s):** `js/3d/hud.js` ~lines 220-295

**Description:** The BD-197 wearable HUD redesign added 55x55px equipment slots with silhouettes, but equipped items never appear in them — all 3 slots permanently show as "empty" even when wearables are equipped and active on the player model.

**Root Cause (confirmed by code review):**

Three compounding bugs:

1. **Wrong state source.** The HUD reads `s.items.glasses`, `s.items.armor`, `s.items.boots` (the legacy item slots) instead of `s.wearables.head`, `s.wearables.body`, `s.wearables.feet` (the BD-180 wearable system). The wearable equip logic in game3d.js stores equipped wearables in `st.wearables[slot]` where slot is `'head'`/`'body'`/`'feet'`, but the HUD never reads from `st.wearables`.

2. **Wrong lookup table.** Line 295 searches `ITEMS_3D.find(it => it.id === itemId)` but wearable definitions live in `WEARABLES_3D` (constants.js ~line 326), not `ITEMS_3D`. Even if the state read were correct, the lookup would fail.

3. **Flash timer key mismatch.** `st.wearableFlash` uses keys `armor`/`boots`/`glasses` but wearable slots are `head`/`body`/`feet`. Flash animations never trigger.

**Fix Approach:**

1. Change the slot definitions array (~line 220) to read from `s.wearables`:
   ```js
   { label: 'HEAD', getId: () => s.wearables ? s.wearables.head : null, ... }
   { label: 'BODY', getId: () => s.wearables ? s.wearables.body : null, ... }
   { label: 'FEET', getId: () => s.wearables ? s.wearables.feet : null, ... }
   ```

2. Change the lookup at line 295 from `ITEMS_3D.find(...)` to `WEARABLES_3D.find(w => w.id === itemId)`. Import `WEARABLES_3D` from constants.js if not already imported.

3. Fix `st.wearableFlash` keys in game3d.js to use `head`/`body`/`feet` instead of `armor`/`boots`/`glasses`. Update the flash trigger in the equip logic to match.

**Acceptance Criteria:**
- Equipped wearables display in their correct HUD slot with rarity-colored background and name
- Empty slots still show silhouette placeholders
- Effect text appears below equipped item names
- Equip flash animation triggers when a new wearable is equipped
- All 3 slots (head/body/feet) work correctly

---

## P1 -- UX

---

### BD-199: Wearable pickup should offer a choice, not auto-replace

**Category:** UX — Equipment
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 5764-5810, `js/3d/hud.js`

**Description:** When the player walks over a wearable pickup while already having an item in that slot, the game either auto-replaces (if higher rarity) or uses a confusing "walk over again within 5 seconds" mechanic (if same/lower rarity). A 7-year-old cannot understand the walk-over-twice system. The player should see a clear choice: keep current item or equip new one.

**Current behavior (lines 5773-5787):**
- Empty slot: auto-equip (correct, keep this)
- Higher rarity: auto-equip (wrong — player may prefer current item's effect)
- Same/lower rarity: shows floating text "walk over again" with 5s timer

**Fix Approach:**

When a wearable pickup is walked over and the slot is already occupied, show a comparison popup menu (similar to the upgrade menu):

1. Pause the game (like upgrade menu)
2. Show a side-by-side comparison:
   ```
   ┌─────────────────────────────────────┐
   │      REPLACE EQUIPMENT?             │
   │                                     │
   │  [CURRENT]        [NEW]             │
   │  Shark Fin        Bumble Helmet     │
   │  +10% Speed       -25% Damage       │
   │  ★★ Uncommon      ★★★ Rare          │
   │                                     │
   │  ← KEEP CURRENT   EQUIP NEW →      │
   └─────────────────────────────────────┘
   ```
3. Left/Right arrows to select, Enter/Space to confirm
4. If "Keep Current" — leave the pickup on the ground (don't consume it)
5. If "Equip New" — replace, apply effects, trigger flash

For empty slots, keep the current auto-equip behavior (no popup needed).

**Acceptance Criteria:**
- Walking over a wearable when the slot is occupied shows a comparison menu
- Menu pauses the game like the upgrade menu
- Both items show name, effect, and rarity
- Left/Right arrows navigate, Enter confirms
- "Keep Current" leaves the pickup on the ground
- "Equip New" replaces and applies effects
- Empty slots still auto-equip immediately
- Menu is readable by a 7-year-old (large text, clear labels)

---

### BD-200: Wave incoming notification too low — obscures gameplay

**Category:** UX — HUD
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 153-165

**Description:** The "WAVE N INCOMING" warning text renders at Y = H * 0.35 (35% down from top) with the countdown number at Y = H * 0.45 (45% down). On a 540px canvas that's Y=189 and Y=243 — right in the middle of the screen where the player character is. This blocks visibility of the gameplay area during the critical moment when enemies are about to surge.

**Fix Approach:**

Move the wave warning text higher on the screen:

1. Change title position from `H * 0.35` to `H * 0.15` (~81px from top on 540px canvas)
2. Change countdown position from `H * 0.45` to `H * 0.22` (~119px from top)
3. Keep the red screen tint overlay as-is (it's subtle at 6% opacity)

This places the warning above the gameplay area, near the HP/XP bars, where it's visible but not obstructive.

**Acceptance Criteria:**
- Wave warning title renders in the top ~15-20% of the screen
- Countdown number renders just below the title
- Warning text does not overlap with HP/XP bars (check positioning)
- Text is still clearly visible and readable
- Red screen tint unchanged

---

### BD-201: Non-equippable items missing from HUD display

**Category:** Bug — HUD
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 359-393

**Description:** Regular (non-wearable) items like Rubber Ducky, Lucky Charm, Magnet Ring, etc. are no longer visible on the HUD. The code to render them exists (lines 359-393) but they may be positioned off-screen or obscured by the new wearable panel.

The rendering starts at `PANEL_Y - 8` and draws upward (decrementing Y by 18 per item). If `PANEL_Y` is set too low (near the bottom edge), the items render behind or below the wearable panel where they can't be seen. The screenshot confirms: weapons show on the left side, wearable slots at bottom-left, but zero regular items visible despite having augments ("Run faster! x1", "Stronger! x1", "Heal over time! x1" are shrine augments on the right, not items).

**Fix Approach:**

1. Check the `PANEL_Y` value and the starting Y for regular items. Ensure they render ABOVE the wearable panel with adequate spacing.
2. Items should appear as a compact text list between the weapon slots and the wearable panel.
3. If the available vertical space is insufficient, cap the visible items at 5-6 with a "+N more" overflow indicator.

**Acceptance Criteria:**
- Boolean items (Lucky Charm, Magnet Ring, etc.) appear in the HUD when acquired
- Stackable items (Rubber Ducky x3, etc.) appear with stack counts
- Items are visually positioned between weapons and wearable slots
- Items don't overlap with the wearable panel or weapon slots
- A "+N more" indicator shows if there are too many items to display

---

## P1 -- Balance

---

### BD-202: Loot drops still too frequent — cut all drop rates by 50%

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2520-2578

**Description:** Despite BD-196 reducing tier-1 wearable drops from 15% to 2%, the overall loot frequency is still too high during gameplay. The screenshot shows the ground littered with pickups. The current rates after BD-196 are:

Main loot: `[0.005, 0.02, 0.04, 0.06, 0.06, 0.08, 0.08, 0.10, 0.10, 0.15]`
Wearable: `0.02 + (tierNum - 1) * 0.02` (T1=2%, T2=4%, ..., T10=20%)

Both need to be halved across the board.

**Fix Approach:**

1. Halve the main drop chance array:
   ```js
   // Before:
   let dropChance = [0.005, 0.02, 0.04, 0.06, 0.06, 0.08, 0.08, 0.10, 0.10, 0.15][tierNum - 1];
   // After:
   let dropChance = [0.0025, 0.01, 0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.05, 0.075][tierNum - 1];
   ```

2. Halve the wearable base rate:
   ```js
   // Before:
   let wearableChance = 0.02 + (tierNum - 1) * 0.02;
   // After:
   let wearableChance = 0.01 + (tierNum - 1) * 0.01;
   // T1=1%, T2=2%, T3=3%, ..., T10=10%
   ```

3. Lucky Charm and Lucky Penny multipliers remain unchanged (they multiply on top).

**Acceptance Criteria:**
- All loot drop rates halved from current values
- T1 effective combined rate: ~1.25% (was ~2.5%)
- T10 effective combined rate: ~8.75% (was ~17.5%)
- Lucky Charm and Lucky Penny still provide meaningful boosts
- Higher-tier zombies still feel rewarding to kill
- Ground is no longer littered with pickups during normal gameplay

---

## Conflict Analysis

- **BD-198** touches hud.js (wearable display) and game3d.js (flash timer keys) — conflicts with BD-201 (same HUD file, different sections) and BD-199 (game3d.js equip logic)
- **BD-199** touches game3d.js (equip logic) and hud.js (new comparison menu) — conflicts with BD-198 (game3d.js flash keys)
- **BD-200** touches hud.js (wave warning only, ~lines 153-165) — LOW conflict with BD-198/201
- **BD-201** touches hud.js (item list positioning, ~lines 359-393) — LOW conflict with BD-198
- **BD-202** touches game3d.js (drop rates only, ~lines 2520-2578) — NO conflict with others

**Recommended batches:**
- **Agent 1:** BD-198 + BD-201 (both fix HUD display bugs in hud.js, related positioning)
- **Agent 2:** BD-199 (wearable comparison menu — standalone feature, touches equip logic)
- **Agent 3:** BD-200 (wave text position — isolated, quick fix)
- **Agent 4:** BD-202 (drop rate halving — isolated numbers change)
