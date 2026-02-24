# Beads: BD-186 through BD-188 — Health Regeneration Balance

**Date:** 2026-02-24
**Source:** `docs/reviews/health-regen-analysis.md`
**Context:** Player regenerates health faster than enemies can deal damage in mid-to-late game. On Chill Mode (Julian's default), the problem is even more pronounced because base HP is 1.5x (75 HP instead of 50), meaning percentage-based heals and the augmentRegen accumulator reach invincibility sooner. The analysis identifies 14 healing sources — the three biggest offenders are Guardian Howl (+2 HP/s per stack, up to +6 total), uncapped `augmentRegen` accumulator, and health orb drops at 15% maxHP.

**Design Goal:** Getting hit should always feel like it matters. Healing should be a welcome relief, not a constant refill. Julian should feel tough but not bored — a close escape at 10 HP with a lucky health orb should feel exciting, not routine.

**Analysis Critique:**
- The analysis correctly identifies Guardian Howl as the single biggest offender. At +6 HP/s from 3 stacks alone, it exceeds tier-5 zombie DPS with chainmail.
- The recommended Guardian nerf from +2.0 to +0.5 per stack is too aggressive. At +0.5 per stack, 3 stacks yields only +1.5 HP/s — barely noticeable for a howl called "Guardian". This would make the howl feel worthless relative to Power (+15% dmg) or Haste (-15% cooldowns). A value of +1.0 per stack (3.0 HP/s max) keeps Guardian as a meaningful defensive choice without dominating the healing budget.
- The health orb nerf from 15% to 8% is slightly too harsh. At 8% of 250 maxHP, each orb heals 20 HP — barely visible on the health bar. 10% is the sweet spot: enough to feel rewarding when one drops (25 HP on 250 maxHP, about 10% visible movement on the bar), but not the quarter-bar burst that 15% delivers.
- The analysis recommends BOTH a hard cap AND diminishing returns on `augmentRegen` (Fixes A and D). These are redundant — pick one. A soft cap via diminishing returns is more elegant but harder for a 7-year-old's game to reason about during balance testing. A hard cap is simpler, more predictable, and easier to tune later. Go with the hard cap.
- The analysis recommends nerfing charge shrine regen values (Fix E) AND shrine augment regen (Fix F) on top of the cap. With a hard cap in place, these individual source nerfs become less important — the cap catches everything. However, the individual values are still too high in absolute terms (a single legendary charge shrine at +2.0 HP/s is as much regen as our nerfed Guardian Howl max). Halving these values is the right call, but it can be bundled into the same bead as the cap since they're all in `constants.js`.
- The analysis does NOT recommend any Chill Mode-specific adjustment. This is correct — Chill Mode already gives 1.5x HP which means the same regen rate takes longer to fill the bar proportionally. No special handling needed.
- Vampire Fangs (3 HP/s temporary) and Regen Burst (heal to full in 5s) are intentionally powerful temporary powerups. They're fine as-is — they're time-limited, mutually exclusive with other powerups, and finding one should feel like a treat. The analysis's suggested nerf to these is too conservative.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |
| **P3** | Nice-to-have, polish, or architectural cleanup | Backlog |

---

## P1 -- Critical Balance

---

### BD-186: Reduce Guardian Howl regen from +2 to +1 HP/s per stack

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~line 3904, `js/3d/constants.js` ~line 161

**Description:** Guardian Howl adds +2 HP/s to `augmentRegen` per stack (max 3 stacks = +6 HP/s). This single howl alone exceeds tier-5 zombie contact DPS with chainmail armor (~4.8 HP/s). It is the largest single contributor to the invincibility problem, accounting for more than half of realistic late-game passive regen. Reducing to +1 HP/s per stack keeps Guardian as a meaningful defensive howl (3 stacks = +3.0 HP/s, enough to offset tier-1 zombie DPS) without being the sole source of invincibility.

**Fix Approach:**
1. In `js/game3d.js` ~line 3904, change `s.augmentRegen += 2` to `s.augmentRegen += 1`.
2. In `js/3d/constants.js` ~line 161, update the JSDoc comment from `+2 HP/s regen per level` to `+1 HP/s regen per level`.

**Acceptance Criteria:**
- Guardian Howl at max stacks (3) adds exactly +3.0 HP/s total to `augmentRegen`
- The +8% maxHP and +10 instant heal per stack are unchanged
- JSDoc comment matches the new value
- Guardian Howl description in the HUD (if any) still reads correctly (the `desc` field in HOWL_TYPES says "Tougher and heal!" which is generic enough to not need a change)

---

### BD-187: Cap effective augmentRegen at 4 HP/s

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~line 5642-5644

**Description:** `st.augmentRegen` is an uncapped additive accumulator fed by 4 independent sources (Guardian Howl, Health Pendant, shrine augments, charge shrine upgrades). Even with BD-186's Guardian nerf, a lucky run can push raw `augmentRegen` to 6-8+ HP/s through shrine stacking. A hard cap of 4 HP/s ensures passive regen never exceeds a reasonable ceiling regardless of source combination. At 4 HP/s vs tier-5 DPS with chainmail (~4.8 HP/s), the player still takes net damage from high-tier zombies even at max regen — but has meaningful sustain against lower tiers.

The cap is set at 4.0 rather than 3.0 (as the analysis suggests) because: (a) with the Guardian nerf, the realistic late-game total is ~5-6 HP/s raw, so a 4.0 cap still bites but doesn't feel punitive; (b) a 3.0 cap means the Guardian Howl at max stacks already hits the cap alone, making all other regen sources feel worthless; (c) 4.0 leaves room for shrine/pendant picks to matter even after 3 Guardian stacks.

**Fix Approach:**
1. In `js/game3d.js` ~line 5642-5644, change:
   ```js
   if (st.augmentRegen > 0) {
     st.hp = Math.min(st.hp + st.augmentRegen * dt, st.maxHp);
   }
   ```
   to:
   ```js
   if (st.augmentRegen > 0) {
     const effectiveRegen = Math.min(st.augmentRegen, 4.0);
     st.hp = Math.min(st.hp + effectiveRegen * dt, st.maxHp);
   }
   ```

**Acceptance Criteria:**
- With `augmentRegen` at 10.0 (artificial test), effective regen per second is exactly 4.0 HP/s
- With `augmentRegen` at 3.0 (under cap), effective regen per second is exactly 3.0 HP/s (no penalty)
- The raw `st.augmentRegen` value is NOT clamped — it still accumulates normally so that the HUD/stats can show the true total if desired later
- The cap value (4.0) is a literal in the regen tick, easy to find and adjust

---

### BD-188: Reduce health orb heal from 15% to 10% maxHP, and halve shrine/charge-shrine regen values

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~line 2402, `js/3d/constants.js` ~lines 338, 352, 360, 368, 375

**Description:** Two secondary healing sources compound the problem:

1. **Health orbs** heal 15% of maxHP per drop. With late-game maxHP of 250-300, each orb restores 37-45 HP — nearly a full health bar's worth at base stats. In dense late-game combat with high-tier enemies dying frequently and Lucky Charm boosting drop rates, health orbs alone can sustain the player. Reducing to 10% (25-30 HP per orb at 250+ maxHP) keeps the pickup feeling rewarding while not being a quarter-bar burst.

2. **Shrine and charge shrine regen values** are individually small but collectively pile into the uncapped accumulator. Even with the BD-187 cap, the current values mean the player hits the cap too early (after just a few shrines), making subsequent regen picks feel wasted. Halving these values means the cap is reached more gradually and more shrine choices remain meaningful throughout the run.

**Fix Approach:**

Part A — Health orb nerf:
1. In `js/game3d.js` ~line 2402, change `st.maxHp * 0.15` to `st.maxHp * 0.10`.

Part B — Shrine augment regen nerf:
1. In `js/3d/constants.js` ~line 338, change the regen augment from `+ 0.5` to `+ 0.25`.

Part C — Charge shrine regen nerf:
1. In `js/3d/constants.js` ~line 352, change `regen03` from `+ 0.3` to `+ 0.15`.
2. In `js/3d/constants.js` ~line 360, change `regen07` from `+ 0.7` to `+ 0.35`.
3. In `js/3d/constants.js` ~line 368, change `regen12` from `+ 1.2` to `+ 0.6`.
4. In `js/3d/constants.js` ~line 375, change `regen2` from `+ 2.0` to `+ 1.0`.

**Acceptance Criteria:**
- Health orb pickup heals exactly 10% of maxHP (not 15%)
- Floating text still shows "+HEALTH" on orb pickup (unchanged)
- Shrine regen augment grants +0.25 HP/s (not +0.5)
- Charge shrine regen values are: common +0.15, uncommon +0.35, rare +0.6, legendary +1.0
- Charge shrine display names ("Tiny heal!", "Good healing!", etc.) remain unchanged
- All other shrine augment types (maxHp, xpGain, damage, etc.) are unaffected

---

## Projected Balance After All Three Beads

### Late-game passive regen (realistic):

| Source | Before | After |
|--------|--------|-------|
| Guardian Howl (3 stacks) | 6.0 HP/s | 3.0 HP/s |
| Health Pendant | 1.0 HP/s | 1.0 HP/s (unchanged) |
| Shrine regen (~3 shrines) | 1.5 HP/s | 0.75 HP/s |
| Charge shrine regen (~3 picks, mixed) | 2.1 HP/s | ~1.05 HP/s |
| **Raw total** | **10.6 HP/s** | **5.8 HP/s** |
| **After cap (4.0)** | **10.6 (no cap)** | **4.0 HP/s** |

### Net HP/s vs enemies (with chainmail + augment armor):

| Scenario | Before | After |
|----------|--------|-------|
| vs Tier 3 zombie (4.6 raw, ~2.8 after armor) | +7.8 (invincible) | +1.2 (slow heal, still comfortable) |
| vs Tier 5 zombie (8.0 raw, ~4.8 after armor) | +5.8 (invincible) | -0.8 (slowly dying — must fight back or retreat) |
| vs Tier 5 + health orb procs | +10+ (absurd) | +1.7 approx (stable but not invincible) |

### Julian's Chill Mode experience:

On Chill Mode, Julian starts with 75 HP (1.5x of 50). Enemy speed is 0.7x, meaning fewer contact hits per second. With the rebalanced regen:
- **Early game (level 1-8):** No regen sources yet. Health orbs from drops are his main recovery. Each heals 7.5 HP (10% of 75). Getting hit matters. Finding a health orb feels like a treat.
- **Mid game (level 8-15):** Guardian x1 or x2 + maybe a pendant = 2-3 HP/s. Against tier 1-2 zombies at 0.7x speed, he can tank a couple hits and regen back slowly. Feels tough but not invincible. Getting swarmed is still dangerous.
- **Late game (level 20+):** Regen capped at 4.0 HP/s. With maxHP around 200-250 (Chill Mode inflated), full recovery from half HP takes ~25-30 seconds of pure regen. Higher-tier zombies at 0.7x speed still deal meaningful damage. Julian feels strong and durable but can still die if he stops paying attention in a big crowd.

---

## Conflict Analysis

These three beads have **no conflicts** with each other — they target different lines and different constants. They should be implementable in parallel or in any order.

**Dependency on BD-154 (framerate-dependent contact damage):** If BD-154 has NOT been implemented yet, the contact damage numbers in the balance projections above will vary by framerate. However, the regen fixes are still correct regardless — they fix the healing side independently of the damage side. Both should be done, but neither blocks the other.

**No Chill Mode code changes needed:** The fixes are universal (same values for all difficulties). Chill Mode's 1.5x HP already provides proportional scaling — higher maxHP means the same regen rate fills the bar more slowly, and the same 10% health orb heals a larger absolute amount but the same percentage. This is the correct behavior.
