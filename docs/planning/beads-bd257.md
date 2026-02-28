# BD-257: Shrine upgrade labels too vague — "All better!" and "Everything better!" don't communicate what they do

**Date:** 2026-02-28
**Source:** Manual playthrough — MEGA SHRINE choice screen shows "Everything better!", "Super strong!", and "All better!" as the three options. "Super strong!" is clear (more damage). The other two are indistinguishable — a 7-year-old (or anyone) can't tell what "All better!" vs "Everything better!" actually does. One fully heals you, the other boosts all stats — those are completely different effects hidden behind nearly identical names.

---

## P1 — UX / Readability

---

### BD-257: Charge shrine upgrade labels need distinct, concrete names + optional subtext

**Category:** UX (readability, player comprehension)
**Priority:** P1
**File(s):** `js/3d/constants.js` (CHARGE_SHRINE_UPGRADES, ~line 651), `js/3d/hud.js` (charge shrine menu rendering, ~line 1095)

**Symptom:**
The MEGA SHRINE (legendary tier) choice screen presents three upgrade cards with only a `name` label. Two of the legendary options are:
- **"All better!"** — heals HP to full (`s.hp = s.maxHp`)
- **"Everything better!"** — boosts speed, attack speed, damage, and max HP all by 5%

These names are nearly identical in meaning but describe completely different effects. A player (especially a young one) cannot make an informed choice. "All better" sounds like it fixes everything. "Everything better" also sounds like it fixes everything. The distinction between "full heal" and "all stats +5%" is invisible.

**Current Implementation (constants.js ~line 676):**
```js
legendary: [
  { id: 'hp50',      name: 'Super tough!',         ... },  // +50 max HP
  { id: 'speed15',   name: 'Lightning fast!',      ... },  // +15% speed
  { id: 'dmg15',     name: 'Super strong!',        ... },  // +15% damage — CLEAR ✓
  { id: 'regen2',    name: 'Amazing healing!',     ... },  // +1.0 regen/s
  { id: 'fullheal',  name: 'All better!',          ... },  // full HP heal — UNCLEAR ✗
  { id: 'allstats5', name: 'Everything better!',   ... },  // +5% all stats — UNCLEAR ✗
],
```

**Current HUD rendering (hud.js ~line 1131):**
```js
ctx.fillStyle = u.color; ctx.font = 'bold 16px ' + GAME_FONT;
ctx.fillText(u.name, cx + csCardW / 2, csCardY + csCardH / 2 + 6);
```
Only the `name` is rendered. No subtext, no description of what the upgrade actually does.

**Problems:**
1. **"All better!" vs "Everything better!"** — nearly synonymous phrases for completely different effects (full heal vs all-stat boost).
2. **No subtext** — the card has plenty of vertical space (120px tall) but only shows one line of text. A short description line would disambiguate every upgrade at a glance.
3. **Other tiers also have soft overlaps** — "Tougher!" (uncommon, +12 HP) vs "A bit tougher!" (common, +5 HP) is fine because the progression word ("a bit" → nothing → "way" → "super") works. But the legendary tier breaks this pattern with two names that don't describe their effect at all.

---

## Fix

### Part 1: Rename the unclear legendary upgrades

| id | Old name | New name | Rationale |
|---|---|---|---|
| `fullheal` | All better! | **Full heal!** | Says exactly what it does — heals all your HP |
| `allstats5` | Everything better! | **Power surge!** | Conveys a broad, powerful boost without being confused with healing |

All other names across all tiers are fine — they use concrete verbs/adjectives (tougher, faster, stronger, etc.) that map clearly to a single stat.

### Part 2: Add `desc` field to every upgrade + render subtext on cards

Add a `desc` string to each upgrade in `CHARGE_SHRINE_UPGRADES`. Keep descriptions short (2-5 words), concrete, and stat-aware.

**Legendary tier (full proposed updates):**
```js
legendary: [
  { id: 'hp50',      name: 'Super tough!',      desc: '+50 hearts',           ... },
  { id: 'speed15',   name: 'Lightning fast!',   desc: 'Run way faster',       ... },
  { id: 'dmg15',     name: 'Super strong!',     desc: 'Hit way harder',       ... },
  { id: 'regen2',    name: 'Amazing healing!',  desc: 'Heal lots over time',  ... },
  { id: 'fullheal',  name: 'Full heal!',        desc: 'HP back to full',      ... },
  { id: 'allstats5', name: 'Power surge!',      desc: 'All stats go up',      ... },
],
```

**Rare tier:**
```js
rare: [
  { id: 'hp25',    name: 'Way tougher!',       desc: '+25 hearts',          ... },
  { id: 'speed10', name: 'Super fast!',        desc: 'Run much faster',     ... },
  { id: 'atk10',   name: 'Rapid attacks!',     desc: 'Attack much faster',  ... },
  { id: 'dmg10',   name: 'Way stronger!',      desc: 'Hit much harder',     ... },
  { id: 'regen12', name: 'Great healing!',     desc: 'Heal more over time', ... },
  { id: 'xp10',    name: 'Learn way faster!',  desc: 'Get XP much faster',  ... },
],
```

**Uncommon tier:**
```js
uncommon: [
  { id: 'hp12',    name: 'Tougher!',          desc: '+12 hearts',         ... },
  { id: 'speed6',  name: 'Faster!',           desc: 'Run a bit faster',   ... },
  { id: 'atk6',    name: 'Quick attacks!',    desc: 'Attack a bit faster', ... },
  { id: 'dmg6',    name: 'Stronger!',         desc: 'Hit a bit harder',   ... },
  { id: 'regen07', name: 'Good healing!',     desc: 'Heal over time',     ... },
  { id: 'armor3',  name: 'Harder to hurt!',   desc: 'Take less damage',   ... },
],
```

**Common tier:**
```js
common: [
  { id: 'hp5',     name: 'A bit tougher!',    desc: '+5 hearts',           ... },
  { id: 'speed3',  name: 'A bit faster!',     desc: 'Run a tiny bit faster', ... },
  { id: 'atk3',    name: 'Quicker attacks!',  desc: 'Attack a tiny bit faster', ... },
  { id: 'dmg3',    name: 'A bit stronger!',   desc: 'Hit a tiny bit harder', ... },
  { id: 'regen03', name: 'Tiny heal!',        desc: 'Heal a little over time', ... },
  { id: 'pickup5', name: 'Grab a bit more!',  desc: 'Bigger pickup range', ... },
],
```

### Part 3: Render subtext on shrine cards (hud.js)

Update the card rendering (~line 1130) to show the `desc` below the `name`:

```js
// Upgrade name (main label)
ctx.fillStyle = u.color; ctx.font = 'bold 16px ' + GAME_FONT;
ctx.fillText(u.name, cx + csCardW / 2, csCardY + csCardH / 2 - 2);

// Subtext description
if (u.desc) {
  ctx.fillStyle = '#aaaaaa'; ctx.font = '12px ' + GAME_FONT;
  ctx.fillText(u.desc, cx + csCardW / 2, csCardY + csCardH / 2 + 18);
}
```

The name shifts up slightly (-2 instead of +6) to make room for the subtext line below it. Subtext is smaller (12px vs 16px) and gray (#aaa) so it reads as secondary info, not competing with the main label.

---

## Also check: SHRINE_AUGMENTS (break-to-activate shrines)

The original `SHRINE_AUGMENTS` array (line 635) uses similar names ("Tougher!", "Stronger!", etc.) but those are single-choice (no comparison needed — you break the shrine and get one random buff). No rename needed there, but the `desc` field pattern should be added for consistency if those shrines ever get a choice UI.

---

## Acceptance Criteria

1. Legendary "fullheal" reads **"Full heal!"** with subtext **"HP back to full"**
2. Legendary "allstats5" reads **"Power surge!"** with subtext **"All stats go up"**
3. All other shrine upgrades across all 4 tiers show a descriptive subtext line
4. Subtext is visually secondary (smaller font, muted color) — doesn't clutter the card
5. All upgrade names use concrete, distinct language — no two names in the same tier can be confused for the same effect
6. A 7-year-old can look at any two cards side-by-side and point to the one they want

---

## Conflict Analysis

No conflicts with other beads. Changes touch:
- `js/3d/constants.js` — CHARGE_SHRINE_UPGRADES name/desc fields only (no apply logic changes)
- `js/3d/hud.js` — charge shrine card rendering only (~5 lines changed)

Independent of BD-249 through BD-256.

---

## Estimated Complexity

S (Small) — rename 2 strings, add `desc` field to 24 upgrade objects, add 4 lines of HUD rendering code.
