# BD-270: Haste Howl and Frenzy Howl both say "Attack faster!" — confusing and unclear

**Date:** 2026-02-28
**Source:** Manual playthrough — player confusion. Both Haste and Frenzy howls display "Attack faster!" as their description, but they are mechanically distinct. Players cannot distinguish them or understand the value of stacking both.

---

## P2 — UX / Clarity

---

### BD-270: Differentiate Haste and Frenzy howl descriptions to reflect their distinct mechanics

**Category:** UX (description clarity)
**Priority:** P2
**File(s):** `js/3d/constants.js` (HOWL_TYPES ~line 159)

**Current State:**

```js
haste:  { id: 'haste',  name: 'HASTE HOWL',  color: '#ffaa44', desc: 'Attack faster!',  maxLevel: 5 },
frenzy: { id: 'frenzy', name: 'FRENZY HOWL', color: '#ff44ff', desc: 'Attack faster!',  maxLevel: 4 },
```

Both say "Attack faster!" — identical descriptions for two mechanically different systems.

**Actual Mechanics (game3d.js `getHowlCdMult()` ~line 2817):**

```js
function getHowlCdMult() {
  return Math.max(0.3, 1 - st.howls.haste * 0.15 * getHowlStrength()) /
         (1 + st.howls.frenzy * 0.10 * getHowlStrength());
}
```

| Aspect | Haste | Frenzy |
|--------|-------|--------|
| Calculation | Subtractive: `1 - 0.15 × stacks` | Divisive: `÷ (1 + 0.10 × stacks)` |
| Per-stack effect | 15% cooldown reduction | 10% attack speed increase |
| Max level | 5 | 4 |
| Hard cap | 0.3x minimum cooldown | None |
| Best for | Early stacks (big jumps) | Late game (stacks with haste) |

At max stacks with both: `max(0.3, 1 - 0.75) / (1 + 0.40)` = `0.30 / 1.40` = 0.214x cooldown — very fast but not broken.

---

## Fix

### Update descriptions in HOWL_TYPES:

```js
// BEFORE:
haste:  { id: 'haste',  name: 'HASTE HOWL',  color: '#ffaa44', desc: 'Attack faster!',  maxLevel: 5 },
frenzy: { id: 'frenzy', name: 'FRENZY HOWL', color: '#ff44ff', desc: 'Attack faster!',  maxLevel: 4 },

// AFTER:
haste:  { id: 'haste',  name: 'HASTE HOWL',  color: '#ffaa44', desc: 'Shorter cooldowns!',  maxLevel: 5 },
frenzy: { id: 'frenzy', name: 'FRENZY HOWL', color: '#ff44ff', desc: 'Attack speed up!',  maxLevel: 4 },
```

**Reasoning:**
- **Haste → "Shorter cooldowns!"** — describes the subtractive mechanic (reduces cooldown time)
- **Frenzy → "Attack speed up!"** — describes the multiplicative mechanic (increases attack rate)
- Both are accurate, distinct, and kid-friendly (target audience is 7+ year olds)

---

## Acceptance Criteria

1. Haste and Frenzy howls have distinct, clearly different descriptions
2. Descriptions accurately reflect their mechanical difference
3. Descriptions are short and understandable (target: 7+ year old player)
4. No change to actual mechanics — just the desc string

---

## Estimated Complexity

XS (Trivial) — two string changes in constants.js.
