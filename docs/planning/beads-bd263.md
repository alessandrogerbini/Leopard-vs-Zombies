# BD-263: Decrease base zombie spawn rate by another 10%

**Date:** 2026-02-28
**Source:** Manual playthrough — even after BD-259's 20% reduction (1.36 → 1.70s interval), the zombie density is still slightly too high. Need an additional 10% reduction.

---

## P1 — Balance

---

### BD-263: Reduce ambient spawn interval from 1.70 to 1.89 seconds

**Category:** Balance (spawn rate tuning)
**Priority:** P1
**File(s):** `js/3d/constants.js` (~line 808, AMBIENT_SPAWN_INTERVAL)

**Current value:** `AMBIENT_SPAWN_INTERVAL = 1.70` (set by BD-259)

**Fix:**
To reduce spawn rate by 10%, increase interval by ~11%: 1.70 / 0.90 = **1.89 seconds**.

```js
// BEFORE (BD-259):
export const AMBIENT_SPAWN_INTERVAL = 1.70;

// AFTER:
export const AMBIENT_SPAWN_INTERVAL = 1.89;
```

**Cumulative effect from original:**
- Original: 1.36s → ~264 zombies/min
- BD-259: 1.70s → ~211 zombies/min (−20%)
- BD-263: 1.89s → ~190 zombies/min (−28% total from original)

---

## Acceptance Criteria

1. Early game feels less crowded than current 1.70s interval
2. Late game still ramps to challenging density (count curve unchanged)
3. Wave events and initial burst unaffected

---

## Estimated Complexity

XS (Trivial) — one number change.
