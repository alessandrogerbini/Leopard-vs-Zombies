# Bead: BD-206 — Floating text clutter: too many overlapping texts over player

**Date:** 2026-02-24
**Source:** Manual playthrough screenshot — "Spring Boots", "Cardboard Box", "Tough box!", "POWERUP!", partial "Card..." all stacked on top of each other over the player character. Unreadable for a 7-year-old, comes too fast, obscures gameplay.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Critical UX or balance issue affecting playability | Next sprint |

---

## P1 -- Readability

---

### BD-206: Floating text clutter — remove redundant texts, reduce cap and lifetimes

**Category:** UX — Readability / Performance
**Priority:** P1
**File(s):** `js/game3d.js` (~24 `addFloatingText` call sites), `js/3d/hud.js` (rendering)

**Description:** The floating text system shows up to 8 simultaneous texts, but 16 of 24 call sites mark their text as `important=true`, which bypasses the 0.6s deduplication window. Long-lived important texts (1.5-3.0s) pile up over the player, creating an unreadable wall of overlapping text. The screenshot shows 5+ texts stacked directly on the player character.

The worst offenders are **redundant texts** — events that already have dedicated HUD feedback:

1. **Item pickup** (lines 5828-5829): Shows item name + description as TWO floating texts (both important, 2.0s each) — but also triggers `st.itemAnnouncement`, a center-screen banner showing the EXACT same name + description. The floating texts are 100% redundant.

2. **Wearable equip** (lines 5919-5920): Shows wearable name + description as TWO floating texts — but the wearable HUD slot already flashes and shows the item. Redundant.

3. **Powerup crate spawn** (line 2606): Shows "POWERUP!" (important, 1.5s) — but powerup crates are clearly visible 3D objects. The text adds clutter without value.

4. **Item name from loot drop** (line 2601): Shows the item name when a loot crate spawns (not when picked up — when it spawns on the ground). This is premature feedback — the player hasn't collected it yet.

**Current system stats:**
- Max texts: 8
- Important texts: bypass dedup, bold 20px, long lives (1.5-3.0s)
- Normal texts: deduped within 0.6s, 14px, short lives (0.3-0.5s)
- 16/24 call sites are important → cap is effectively meaningless since important texts dominate

**Fix Approach:**

**Part A — Remove redundant floating texts (biggest impact):**

1. **Remove item pickup floating text** (lines 5828-5829): Delete both `addFloatingText` calls. The `st.itemAnnouncement` center banner already shows this info more readably.

2. **Remove wearable equip floating text** (lines 5919-5920): Delete both calls. The HUD slot flash + icon already communicates the equip.

3. **Remove powerup crate spawn text** (line 2606): Delete the "POWERUP!" text. Crates are visible 3D objects.

4. **Remove loot drop item name text** (line 2601): Delete. The item name shows when the player PICKS IT UP (via the center banner), not when it drops.

5. **Remove wearable "walk over again" text** (line 5902): Delete or convert to a much shorter life (0.5s). This is confusing text from the old equip system.

**Part B — Reduce cap and lifetimes:**

1. **Reduce MAX_FLOATING_TEXTS** from 8 to 5. With the redundant texts removed, 5 is more than enough.

2. **Reduce important text lifetimes** — most are 1.5-2.0s which is too long. Change defaults:
   - Damage numbers: keep at 0.5s
   - "+HEALTH", "+XP": keep at 0.5s
   - "BOOM!": keep at 0.5s
   - "DODGE!", "BLOCKED!": reduce to 0.5s (from 0.8s/1.5s)
   - Augment names: reduce to 1.0s (from 2.0s)
   - "BOSS DEFEATED!": keep at 2.0s (rare, exciting)
   - Totem text: keep at 2.0s (rare)
   - First encounter tier labels: keep at 2.0s (rare, educational)
   - Kill milestone text: keep at 3.0s (rare, exciting)

**Part C — Increase vertical spread:**

In the floating text update loop (lines 6145-6152), increase the rise speed so texts separate faster:
```js
// Before:
st.floatingTexts3d[i].y += dt * 1.5;
// After:
st.floatingTexts3d[i].y += dt * 2.5;
```

And increase the horizontal spread from ±30px to ±50px (line 517-518).

**Acceptance Criteria:**
- Item pickup does NOT produce floating text (center banner only)
- Wearable equip does NOT produce floating text (HUD slot flash only)
- "POWERUP!" floating text removed (crates visible as 3D objects)
- Loot drop spawn does NOT produce floating text (announcement on pickup only)
- Max simultaneous texts reduced from 8 to 5
- Remaining texts rise faster and spread wider
- "BOSS DEFEATED!", totem, and first-encounter texts still appear (they're rare and important)
- Damage numbers, "+HEALTH", "+XP" still appear (short-lived, useful feedback)
- Overall floating text clutter dramatically reduced
- No performance regression

---

## Conflict Analysis

BD-206 touches game3d.js (addFloatingText call sites) and constants at the top of the file. No conflict with BD-203-205 (different systems).
