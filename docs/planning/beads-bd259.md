# BD-259: Too many zombies in early waves — reduce ambient spawn rate by 20%

**Date:** 2026-02-28
**Source:** Manual playthrough — during waves 0, 1, and 2 there are roughly 20% too many zombies on screen. The early game feels overpopulated rather than building up gradually.

---

## P1 — Balance / Game Feel

---

### BD-259: Reduce ambient zombie spawn rate across the board by 20%

**Category:** Balance (spawn rate tuning)
**Priority:** P1
**File(s):** `js/3d/constants.js` (~line 808, AMBIENT_SPAWN_INTERVAL)

**Symptom:**
Early waves (0, 1, 2) have too many zombies. The screen fills up before the player has leveled enough to deal with them comfortably. Needs a flat 20% reduction in spawn rate.

---

## Current Spawn System

### Ambient spawns (the main faucet)

**Interval:** `AMBIENT_SPAWN_INTERVAL = 1.36` seconds (constants.js line 808)

**Count per spawn** (game3d.js line 2531):
```js
const count = Math.min(10, 6 + Math.floor(elapsedMin / 1.5));
```

| Game time | Count per spawn | Spawns/min at 1.36s interval | Zombies/min |
|-----------|----------------|------------------------------|-------------|
| 0:00–1:29 | 6 | ~44 | **~264** |
| 1:30–2:59 | 7 | ~44 | **~308** |
| 3:00–4:29 | 8 | ~44 | **~352** |
| 4:30–5:59 | 9 | ~44 | **~396** |
| 6:00+ | 10 (cap) | ~44 | **~440** |

### Other spawn sources

| Source | When | Count | Notes |
|--------|------|-------|-------|
| Initial burst | Game start | 10 | One-time ring spawn (INITIAL_BURST_COUNT) |
| Wave event | 75s, then every 90s | 36 + wave × 16 | Big burst (wave 1 = 52, wave 2 = 68) |
| Totem multiplier | Per totem destroyed | ×1.15 to interval | Accelerates ambient spawns |

### Difficulty modifiers

No difficulty setting currently affects spawn rate. `DIFFICULTY_SETTINGS` in state.js has `enemySpeedMult` and `powerupFreqMult` but no spawn rate modifier. Chill mode slows enemies (0.7x speed) but doesn't reduce their count.

---

## Fix

Increase `AMBIENT_SPAWN_INTERVAL` from `1.36` to `1.70` seconds.

**Math:** To get 20% fewer spawns per unit time, increase the interval by 25% (since spawn rate = 1/interval):
- Current: 1/1.36 = 0.735 spawns/sec
- Target: 0.735 × 0.80 = 0.588 spawns/sec
- New interval: 1/0.588 = **1.70 seconds**

**File:** `js/3d/constants.js` line 808

```js
// BEFORE:
export const AMBIENT_SPAWN_INTERVAL = 1.36;

// AFTER:
export const AMBIENT_SPAWN_INTERVAL = 1.70;
```

**Resulting early game numbers:**

| Game time | Count | Spawns/min at 1.70s | Zombies/min | Change |
|-----------|-------|---------------------|-------------|--------|
| 0:00–1:29 | 6 | ~35 | **~211** | −53/min |
| 1:30–2:59 | 7 | ~35 | **~247** | −61/min |
| 3:00–4:29 | 8 | ~35 | **~282** | −70/min |
| 4:30–5:59 | 9 | ~35 | **~317** | −79/min |
| 6:00+ | 10 | ~35 | **~353** | −87/min |

This is a flat 20% reduction that scales uniformly across all game time, all difficulties, and all wave levels. No other spawn sources (initial burst, wave events) are changed — those are designed moments, not ambient pressure.

### Why interval change, not count change

Reducing the per-spawn count from 6 to 5 would achieve ~17% reduction but would also reduce the count ramp ceiling (cap would be ~8 instead of 10 at late game). Changing the interval preserves the count ramp curve exactly while uniformly reducing spawn pressure.

---

## Acceptance Criteria

1. Early game (waves 0–2) feels noticeably less crowded — ~20% fewer zombies on screen
2. Late game still ramps up to a challenging density (count curve unchanged, just spread over slightly longer intervals)
3. Wave event bursts are NOT affected (those are separate intentional spikes)
4. Initial burst of 10 is NOT affected (that's the game-start ring)
5. Totem spawn multiplier still works (it multiplies the interval, which now starts higher)
6. All difficulties are affected equally (the interval is shared)

---

## Conflict Analysis

No conflicts. Single constant change in `js/3d/constants.js` line 808. Independent of all other beads.

---

## Estimated Complexity

XS (Trivial) — one number change in constants.js.
