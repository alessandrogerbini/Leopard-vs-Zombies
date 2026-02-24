# Beads: BD-207 through BD-211

**Date:** 2026-02-24
**Source:** Julian's playtest feedback + screenshot — kill streak noise, player white flash, wearables invisible, items unreadable, bosses unscary.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |

---

## P1 -- UX (Quick Fixes)

---

### BD-207: Remove kill milestone floating text and center-screen display entirely

**Category:** UX — Noise Reduction
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2551-2559, 4314-4316, 430-432; `js/3d/hud.js` ~lines 166-190

**Description:** The BD-195 kill milestone system ("AWESOME!" at 50 kills, "SUPER COOL!" at 100, etc.) creates BOTH a 3-second center-screen display AND a floating text over the player simultaneously. Early game, milestones fire every 50 kills — which with high kill rates is every 30-60 seconds. Julian says it's "way way way too much" noise and since total kills aren't shown in the HUD anyway, the milestones are pure distraction.

**Fix — Remove the entire system:**

1. In `game3d.js` ~line 2551-2559: Delete the milestone check block (the `if (st.nextMilestoneIdx < KILL_MILESTONES.length...)` block that sets `st.killMilestone` and pushes floating text)
2. In `game3d.js` ~lines 4314-4316: Delete the `st.killMilestone` timer decrement
3. In `game3d.js` ~lines 430-432: Remove `nextMilestoneIdx` and `killMilestone` from state init
4. In `game3d.js` ~line 35: Remove `KILL_MILESTONES` from the import
5. In `hud.js` ~lines 166-190: Delete the center-screen milestone rendering block
6. In `constants.js`: The `KILL_MILESTONES` array can stay (harmless) or be removed

**Acceptance Criteria:**
- No kill milestone text appears during gameplay (no floating text, no center display)
- No sound plays at kill milestones
- Kill tracking (`st.totalKills`) still works for game-over stats
- No regressions to other floating text or HUD systems

---

### BD-208: Player hurt flash uses pure white strobe — apply BD-203 tinted approach

**Category:** Bug — Visual
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2706, 4535-4557

**Description:** When the player takes damage, the character model turns completely white with a 10Hz on/off strobe for 0.5 seconds (BD-192). This is the same pure-white strobe that BD-203 fixed for zombies. The Red Panda becomes an unrecognizable white blob. Julian says "no clarity as to why, this isn't consistent with the animals looking like the animals they are."

**Current code (line 4544):** `child.material.color.setHex(flashOn ? 0xffffff : child.userData._origColor)`

**Fix — Apply BD-203 approach to the player:**

1. Replace the 10Hz sine-wave strobe with a constant tinted flash (no oscillation)
2. Blend 50% white + 50% original body part color (preserves animal identity)
3. Add a 1-second cooldown (`st.playerHurtFlashCooldown`) so the flash doesn't restart on every damage tick
4. Remove the sine oscillation — just hold the tint for the 0.5s duration, then restore

```js
// Instead of strobe:
const flashOn = Math.sin(st.playerHurtFlash * 10 * Math.PI * 2) > 0;
child.material.color.setHex(flashOn ? 0xffffff : origColor);

// Do constant tint:
const r = ((origColor >> 16) & 0xff) * 0.5 + 255 * 0.5;
const g = ((origColor >> 8) & 0xff) * 0.5 + 255 * 0.5;
const b = (origColor & 0xff) * 0.5 + 255 * 0.5;
child.material.color.setHex((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b));
```

**Acceptance Criteria:**
- Player model shows a subtle brightened tint when hit, NOT pure white
- Animal colors remain recognizable during the flash (Red Panda stays red-ish, Leopard stays yellow-ish)
- No rapid strobing — steady tint for the flash duration
- Flash only triggers once per second max (cooldown prevents spam)
- Invincibility frames still work correctly

---

### BD-209: Wearable equipment panel needs more visual prominence

**Category:** UX — Readability
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 208-381

**Description:** The wearable panel at bottom-left has: 50% opacity background, nearly-black slot backgrounds (#111118), 11px font, and no persistent animation. Compared to weapon slots (16px bold, #222 background, 160px wide), wearables are visually subordinate. Julian says they're "easy to miss, not visible enough."

**Fix Approach:**

1. **Increase panel background opacity** from `rgba(0,0,0,0.5)` to `rgba(0,0,0,0.75)` — make it pop against the game world
2. **Brighten slot backgrounds** from `#111118` to `#1a1a2e` — slightly more visible
3. **Add subtle pulsing glow border** around the panel — a 2px border that slowly pulses between low and medium opacity in a gold/white color (period ~3 seconds). This draws the eye without being distracting
4. **Increase icon scale** from 1.0 to 1.3 — icons currently use only ~55% of the slot space
5. **Increase name font** from 11px to 13px
6. **Extend equip flash** from 0.8s to 1.5s — make new equips more noticeable

**Acceptance Criteria:**
- Wearable panel is clearly visible as a distinct HUD element during gameplay
- Panel background is more opaque and slots are brighter
- Subtle pulsing glow border draws attention without being annoying
- Icons fill more of the slot space
- Item names are more readable
- Equip flash lasts longer

---

### BD-210: Non-equippable items need background panel and effect descriptions

**Category:** UX — Readability
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 385-429

**Description:** Regular items (Lucky Charm, Rubber Ducky, etc.) render as floating `[Item Name]` text with no background, no effect descriptions, and a small 14px font. Julian can't find them and doesn't know what they do. The text floats directly over the 3D scene with variable contrast. Items have effect descriptions in ITEMS_3D constants (`desc` field) but these are never shown in the HUD.

**Fix Approach:**

1. **Add a semi-transparent background panel** behind the items list (like the wearable panel). Use `rgba(0,0,0,0.65)` with 4px padding and 4px rounded corners.
2. **Show effect descriptions** — change format from `[Item Name]` to two lines per item:
   - Line 1: Item name in rarity color, bold 14px
   - Line 2: Effect description in `#aaaaaa` gray, 10px
3. **Increase line height** from 18px to 28px (to accommodate 2 lines per item)
4. **Reduce max visible** from 6 to 5 (since each item now takes 2 lines)
5. **Position the panel** clearly between weapon slots and wearable panel with adequate spacing
6. **Add a small "ITEMS" header** above the list in bold 12px white

**Acceptance Criteria:**
- Items display with a visible background panel
- Each item shows both name and effect description
- Effect descriptions come from ITEMS_3D `desc` field
- Panel is clearly positioned between weapons and wearables
- Text is readable against any background terrain
- Max 5 items visible with "+N more" overflow

---

## P0 -- Gameplay (Boss Overhaul)

---

### BD-211: Boss zombies (tier 9-10) are trivially avoidable — complete attack system overhaul

**Category:** Gameplay — Balance (CRITICAL, repeat issue)
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 5071-5202, 1730-1740, constants.js ZOMBIE_TIERS

**Description:** Julian reports that tier 9/10 bosses "remain totally unscary" and "you'd have to stand still for them to be dangerous." Investigation confirms FIVE compounding problems:

**Problem 1 — Trigger range too short:** Attacks only trigger if player is within 12 units (tier 9) or 18 units (tier 10). The player can trivially stay outside this range while auto-attack weapons do their work from further away.

**Problem 2 — Bosses are too slow:** Tier 9 moves at 2.8, tier 10 at 2.9. The slowest animal (Gator) moves at 3.75. Every animal can outrun every boss. On Chill Mode (0.7x enemy speed), tier 9 moves at 1.96 — a Red Panda (6.0) is 3x faster.

**Problem 3 — Attacks are too infrequent:** 5-7 second cooldown between tier 9 attacks, 4-6 for tier 10. With the range check rarely passing, effective attack rate is near zero.

**Problem 4 — Projectile doesn't track:** Tier 10's Death Bolt fires toward the player's SAVED position from when the telegraph started, not the current position. If the player moves during the 1.5s telegraph, the bolt misses entirely.

**Problem 5 — Low damage for high-tier enemies:** Tier 9 does 20 damage, tier 10 does 30. With armor and healing, this barely hurts.

**Fix Approach (comprehensive overhaul):**

**A. Massively expand trigger ranges:**
```js
const triggerRange = e.tier >= 10 ? 35 : 25;
// Was: 18 / 12 — Now: 35 / 25
// This means attacks trigger when the boss is anywhere nearby
```

**B. Increase boss movement speed:**
In ZOMBIE_TIERS (constants.js), increase tier 9 speed from 2.8 to 4.5 and tier 10 from 2.9 to 5.0. This makes them roughly equal to the player — you CAN'T just walk away. The Gator will actually be caught.

**C. Reduce attack cooldowns:**
```js
// Tier 9: 5-7s → 2.5-3.5s
// Tier 10: 4-6s → 1.5-2.5s
const cooldowns = { 9: 2.5, 10: 1.5 };
e.specialAttackTimer = cooldowns[e.tier] + Math.random() * 1;
```

**D. Add target leading to Death Bolt:**
Instead of firing at the saved position, predict where the player will be:
```js
// Lead the target: predict player position based on movement direction
const leadTime = 0.5; // predict 0.5s into future
const targetX = st.playerX + (st.playerVelX || 0) * leadTime;
const targetZ = st.playerZ + (st.playerVelZ || 0) * leadTime;
```
This requires tracking player velocity (store previous position, calculate delta).

**E. Add a NEW ranged attack for tier 9:**
Tier 9 currently only has a melee AoE slam. Add a secondary ranged attack — a shockwave ring that expands outward from the boss, dealing damage to anything it passes through. Alternate between slam and shockwave.

**F. Increase damage:**
```js
// Tier 9: 20 → 35 damage per slam, shockwave 20
// Tier 10: 30 → 45 damage per bolt
```

**G. Visual intimidation:**
- Make tier 9/10 models 1.5x larger than current (they should dominate the screen)
- Add a persistent red/dark aura particle effect around them
- Add a low rumble sound when they're within 20 units of the player

**Acceptance Criteria:**
- Tier 9/10 attacks trigger reliably during normal gameplay (not just when standing still)
- Players CANNOT trivially outrun tier 9/10 — they must actively dodge
- Tier 10 Death Bolt leads the target and hits moving players some of the time
- Tier 9 has both melee slam AND a new ranged shockwave attack
- Attack cooldowns feel threatening (every 2-3 seconds, not 5-7)
- Damage is meaningful even with armor
- Bosses look and sound intimidating (larger, aura, rumble)
- Julian would say "THAT is scary!"

---

## Conflict Analysis

- **BD-207** touches game3d.js (milestone code) + hud.js (milestone rendering) + constants.js (import) — NO conflict with others
- **BD-208** touches game3d.js (player hurt flash ~lines 4535-4557) — NO conflict with others
- **BD-209** touches hud.js (wearable panel styling ~lines 208-381) — LOW conflict with BD-210 (different section)
- **BD-210** touches hud.js (items list ~lines 385-429) — LOW conflict with BD-209
- **BD-211** touches game3d.js (boss attack code ~lines 5071-5202) + constants.js (ZOMBIE_TIERS) — NO conflict with others

**Recommended sprint batches:**
- **Agent 1:** BD-207 (kill milestones removal — quick, isolated)
- **Agent 2:** BD-208 (player hurt flash — quick, isolated)
- **Agent 3:** BD-209 + BD-210 (wearable panel + items list — same file, related readability)
- **Agent 4:** BD-211 (boss overhaul — largest bead, needs full attention)
