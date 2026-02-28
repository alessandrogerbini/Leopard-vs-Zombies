# BD-268: Way too many high-tier zombies at wave 5 — scaling formula too aggressive

**Date:** 2026-02-28
**Source:** Manual playthrough — at wave 5 (~5 minutes in), the game is flooded with high-level zombies. The difficulty ramp is far too steep for early-mid game.

---

## P1 — Balance / Critical

---

### BD-268: Wave event and ambient spawn tier formulas scale too aggressively

**Category:** Balance (enemy scaling)
**Priority:** P1
**File(s):** `js/game3d.js` (spawnWaveEvent ~line 2776, spawnAmbient ~line 2749)

**Root Cause:**

Two formulas are way too aggressive:

### Wave Event Tier Formula (line 2776):
```js
const tier = Math.random() < 0.15 * st.wave ? Math.min(st.wave + 1, 5) : 1;
```

At wave 5: `0.15 * 5 = 0.75` — **75% of wave event zombies spawn as tier 5 (Overlord)**. With 145 zombies per wave event (45 + 5×20), that's ~109 Overlords (35x HP, 12x damage, 5.0 speed) in a single burst. This is absurdly overtuned for 5 minutes into a run.

| Wave | High-tier % | Tier assigned | Count at tier | Total zombies |
|------|------------|---------------|---------------|---------------|
| 1 | 15% | 2 (Bruiser) | ~10 | 65 |
| 2 | 30% | 3 (Brute) | ~26 | 85 |
| 3 | 45% | 4 (Ravager) | ~47 | 105 |
| 4 | 60% | 5 (Horror) | ~75 | 125 |
| **5** | **75%** | **5 (cap)** | **~109** | **145** |

### Ambient Spawn Tier Formula (line 2749):
```js
if (roll < 0.03 * st.wave) tier = Math.min(maxTier, 2 + Math.floor(Math.random() * (maxTier - 1)));
```

At wave 5: 15% chance of tier 2-5 ambient spawns. This is more moderate but still ramps quickly.

---

## Fix

### Wave Event — reduce tier probability by ~80% and add graduated tiers:

```js
// BEFORE:
const tier = Math.random() < 0.15 * st.wave ? Math.min(st.wave + 1, 5) : 1;

// AFTER:
let tier = 1;
const tierRoll = Math.random();
if (tierRoll < 0.03 * st.wave) {
  // Graduated: most high-tiers are just 1-2 above base, rare chance of higher
  const maxTier = Math.min(st.wave, 5);
  tier = 1 + Math.ceil(Math.random() * Math.min(2, maxTier - 1));
  tier = Math.min(tier, maxTier);
}
```

New distribution at wave 5:
- High-tier probability: `0.03 * 5 = 15%` (was 75%)
- When triggered: tier 2 or 3 (not jumping straight to tier 5)
- 85% remain tier 1

### Ambient Spawns — reduce probability coefficient:

```js
// BEFORE:
if (roll < 0.03 * st.wave) tier = Math.min(maxTier, 2 + Math.floor(Math.random() * (maxTier - 1)));

// AFTER:
if (roll < 0.02 * st.wave) tier = Math.min(maxTier, 2 + Math.floor(Math.random() * Math.min(2, maxTier - 1)));
```

New ambient distribution at wave 5:
- High-tier probability: `0.02 * 5 = 10%` (was 15%)
- When triggered: tier 2-3 range (not tier 2-5)

---

## Design Intent

The early-mid game (waves 1-5, first 7 minutes) should feel like a gradual ramp:
- Waves 1-2: Almost entirely tier 1 with occasional tier 2
- Waves 3-4: Mostly tier 1, some tier 2-3 sprinkled in
- Waves 5-6: Tier 1 majority with noticeable tier 2-3 presence, rare tier 4
- Waves 7+: Tier 3-4 becomes common, tier 5 starts appearing
- Waves 10+: Full tier range, real challenge

The current formula jumps to "75% tier 5 Overlords" by wave 5 — that's endgame difficulty at the 5 minute mark.

---

## Acceptance Criteria

1. Wave 5 event spawns ~85% tier 1, ~15% tier 2-3 (not 75% tier 5)
2. Difficulty ramp feels gradual through waves 1-7
3. High tiers (4-5) don't appear in significant numbers until wave 7+
4. Late game (wave 10+) still reaches full challenge
5. No change to merge system or boss spawning

---

## Estimated Complexity

XS (Trivial) — two formula changes in spawnWaveEvent and spawnAmbient.
