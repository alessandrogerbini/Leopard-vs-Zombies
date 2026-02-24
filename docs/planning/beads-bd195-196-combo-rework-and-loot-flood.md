# Beads: BD-195, BD-196, BD-197 — Combo Rework, Loot Flood, Wearable HUD

**Date:** 2026-02-24
**Source:** Manual playthrough — combo text feels distracting and meaningless; loot drops flooding the game from tier-1 zombies.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Critical UX or balance issue affecting playability | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |

---

## P2 -- UX Polish

---

### BD-195: Combo text is too frequent and meaningless for a 7-year-old audience

**Category:** UX
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 2497-2504, `js/3d/hud.js` ~lines 971-975

**Description:** The combo system tracks consecutive kills within a 2-second window and shows floating milestone text at thresholds [10, 25, 50, 100, 200, 500, 1000]. The combo counter is **100% cosmetic** — it has zero gameplay effect (no damage bonus, no score multiplier, no XP boost, nothing). For a 7-year-old audience, this creates two problems:

1. **Noise without meaning:** The floating combo text competes for attention with damage numbers, health pickups, XP, and item announcements. A 7-year-old can't parse what matters vs. what doesn't, so combo text just adds visual clutter.

2. **No feedback loop:** Since combos don't DO anything, there's no reason for the player to care about maintaining one. The 2-second decay window is too short for a young player to understand or intentionally play around.

**Current implementation details:**
- Combo increments in `killEnemy()` (line ~2497): `st.comboCount++`, timer resets to 2.0s
- Milestone floating text (line ~2500-2503): shown at [10, 25, 50, 100, 200, 500, 1000] with color escalation and `sfx_level_up` sound
- Combo decay (line ~4501-4506): timer decrements by dt, resets `comboCount` to 0 at expiry
- Game-over display (hud.js ~971-975): shows "Best Combo: x{N}" if bestCombo >= 5
- State: `st.comboCount`, `st.comboTimer`, `st.bestCombo`

**Recommended approach — choose one:**

**Option A: Remove combos entirely.** Delete the combo increment, floating text, decay, and game-over display. Simplest fix, removes all visual noise. The bestCombo stat on game-over adds nothing a 7-year-old cares about.

**Option B: Make combos meaningful.** Give combos a tangible reward a kid can feel — e.g., at each milestone, drop a guaranteed powerup crate or health orb. This turns the combo from noise into excitement ("Whoa, I got a reward!"). Keep the milestones but raise thresholds to reduce frequency (e.g., [25, 50, 100, 250, 500]).

**Option C: Simplify to kill streak announcements.** Replace the combo counter with occasional kid-friendly callouts at very high thresholds only (e.g., "AWESOME!" at 100 kills total, "UNSTOPPABLE!" at 500). Decouple from the 2-second decay entirely — just celebrate total kill milestones per run. This is how kid-friendly games handle it.

The agent implementing this bead should evaluate which option best serves the 7-year-old audience and implement accordingly. The core goal: either stop it from distracting, or make it feel meaningful.

**Acceptance Criteria:**
- Combo text no longer creates visual noise that competes with important gameplay feedback
- If combos are kept, they have a tangible effect a 7-year-old can understand
- Game-over screen updated to match (remove bestCombo display if combos removed, or keep if reworked)
- No regressions to kill tracking, score, or XP systems

---

## P1 -- Balance

---

### BD-196: Tier-1 zombie loot drops flooding the game — reduce by 75%+

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2521-2574

**Description:** Tier-1 zombies are dropping loot at a rate that feels like every ~4 kills, flooding the screen with pickups. This makes items feel worthless and clutters the battlefield. The target audience (7-year-old) should feel excited when something drops, not overwhelmed.

**Current drop system (lines 2521-2574):**

There are TWO independent drop rolls per kill:

1. **Main loot table** (line 2525): `dropChance = 0.01` for tier-1 (1%). When triggered, rolls for item pickup (6%), powerup crate (49%), health orb (25%), or XP burst (20%).

2. **Wearable drop** (lines 2570-2573): **15% chance per kill**, independent of the main loot roll. This is the likely flood source — with hundreds of tier-1 kills per minute, 15% means a wearable drops roughly every 6-7 kills.

The 1% main loot rate is fine. The **15% wearable rate is the problem** — it's 15x higher than the main drop rate and produces constant pickup clutter.

**Fix Approach:**

Reduce tier-1 effective drop rates by at least 75% overall. Specific recommendations:

1. **Wearable drop rate** (line ~2570): Reduce from 15% to 2-3% for tier-1. Scale up by tier (e.g., `0.02 + tierNum * 0.02`, giving T1=4%, T5=12%, T10=22%). This preserves the excitement of finding wearables for higher-tier kills while dramatically reducing the tier-1 flood.

2. **Main loot rate** (line 2525): The 1% for tier-1 is already low. Could reduce to 0.5% or leave as-is since the wearable rate is the real offender.

3. Consider adding a **global loot cooldown** (e.g., no more than 1 loot drop per 3-5 seconds) to prevent burst flooding when killing groups.

**Resulting drop frequency (tier-1, no items):**
- Before: ~16% effective per kill (1% main + 15% wearable)
- After: ~3-5% effective per kill (0.5-1% main + 2-4% wearable)
- At high kill rates (~10/sec): drops every 2-3 seconds instead of every 0.6 seconds

**Acceptance Criteria:**
- Tier-1 zombie effective loot drop rate reduced by at least 75% from current
- Loot drops feel like a treat, not a constant flood
- Higher-tier zombies still drop loot at meaningful rates (they're rarer and harder)
- Lucky Charm and Lucky Penny items still provide noticeable boost to drop rates
- Wearable drops are still possible from tier-1 but much rarer
- No regressions to item pickup, powerup, health orb, or XP systems

---

## P2 -- UX Polish

---

### BD-197: Wearable items need a dedicated, visually impactful HUD area separate from regular items

**Category:** UX / Visual Design
**Priority:** P2
**File(s):** `js/3d/hud.js` ~lines 180-284

**Description:** Wearable equipment (head/body/feet slots) already has a separate rendering section from regular items, but it's visually underwhelming — three tiny 30×30px squares tucked at the very bottom of the left-side item list, easy to miss entirely. Wearables deserve dramatically more visual presence because they are fundamentally different from regular items:

- **One per slot, not stackable** — each wearable is a significant power choice
- **Visually worn on the player model** — the player can SEE them on their character
- **Slot-replacement decisions** — equipping a new one means giving up the old one
- **Rarity matters more** — an uncommon wearable replacing a common one is a bigger deal than getting another stack of Rubber Ducky

The user wants wearables to feel **~5x more impactful** than regular items of equal rarity. Currently they feel less impactful because they're smaller and less prominent on the HUD.

**Current layout (lines 180-284):**

```
Bottom-left corner:
  [LEATHER ARMOR]        ← regular items as text lines, 16px font
  [AVIATOR GLASSES]      ← rarity-colored
  [GOLDEN BONE]
  +2 more...
  ┌────┐ ┌────┐ ┌────┐  ← wearable slots: tiny 30×30 squares
  │ H  │ │ B  │ │ F  │     below items, easily missed
  └────┘ └────┘ └────┘
   name   name   name   ← 9px names below, hard to read
```

**Recommended redesign:**

Move wearables to their own prominent area, visually separated from regular items. Make them feel like important equipment, not afterthoughts.

```
Bottom-left corner (WEARABLES — dedicated area, visually dominant):
  ╔══════════════════════════════╗
  ║  ┌──────┐ ┌──────┐ ┌──────┐ ║  ← 50-60px squares (was 30px)
  ║  │      │ │      │ │      │ ║     with thick rarity-colored borders
  ║  │ HEAD │ │ BODY │ │ FEET │ ║     filled with wearable's color
  ║  │      │ │      │ │      │ ║
  ║  └──────┘ └──────┘ └──────┘ ║
  ║  Shark    Bumble   Spring   ║  ← 12-14px names (was 9px)
  ║  Fin      Armor    Boots    ║
  ╚══════════════════════════════╝

Above wearables (ITEMS — compact text list, secondary):
  [LEATHER ARMOR]
  [AVIATOR GLASSES]
  +3 more...
```

**Visual enhancements to make wearables feel 5x more impactful:**

1. **Size**: Increase slot squares from 30×30 to 50-60px — large enough to feel like real equipment slots.

2. **Borders**: Thick 3-4px borders in rarity color (not the current thin 2px). Legendary wearables should have a glow/pulse effect.

3. **Background panel**: Add a semi-transparent dark panel behind the wearable area to visually separate it from the items list. Think RPG equipment panel.

4. **Slot icons/silhouettes**: Empty slots should show faint silhouettes of what goes there (hat shape, shirt shape, shoe shape) instead of just letter labels. Makes the slots feel like actual equipment slots.

5. **Equip flash**: When a new wearable is equipped, flash the HUD slot with the rarity color for ~1 second. Legendary equips could get a brief golden shimmer across the whole slot area.

6. **Effect text**: Show the wearable's effect below its name in small text (e.g., "-20% dmg" under Bumble Armor). Regular items don't get this — it's a wearable-only perk that reinforces their importance.

7. **Positioning**: Wearables at the very bottom of the screen in a clear dedicated area. Regular items above them as a secondary compact list. This inverts the current layout where items dominate and wearables are an afterthought.

**Acceptance Criteria:**
- Wearable slots are visually distinct from the regular item list — clearly a separate HUD element
- Wearable slots are at least 50px (not 30px) and have thick rarity-colored borders
- Empty slots show meaningful silhouettes or icons, not just "H"/"B"/"F" letters
- A semi-transparent panel visually groups the three wearable slots together
- Wearable names are readable (12px+ font, not 9px)
- Regular items remain as a compact text list but are visually secondary to wearables
- At a glance, a 7-year-old can tell wearables are "the important gear" and items are "bonus stuff"
- No regressions to item display, wearable equip mechanics, or HUD overlay positioning
- HUD still fits comfortably on a 960×540 canvas without overlapping other elements (HP bar, weapons, howls)

---

## Conflict Analysis

BD-195, BD-196, and BD-197 have no conflicts — they touch different systems (combo, loot drops, HUD rendering). All compatible with BD-189 through BD-194.
