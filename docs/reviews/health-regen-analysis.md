# Health Regeneration Balance Analysis

**Date:** 2026-02-24
**Bug Report:** "Player regenerates health too quickly, especially later in the game. Heals almost instantly from any % health."
**Severity:** Game balance - makes late game trivially easy

---

## 1. Every Healing Source (Comprehensive Inventory)

### Source 1: Augment Regen (Passive HP/s tick)

- **File:** `js/game3d.js`, line 4874-4876
- **Code:**
  ```js
  if (st.augmentRegen > 0) {
    st.hp = Math.min(st.hp + st.augmentRegen * dt, st.maxHp);
  }
  ```
- **Base rate:** Variable — depends on how much has been added to `st.augmentRegen`
- **Feeds from:** Guardian Howl, Health Pendant, Shrine Augments, Charge Shrine upgrades (see below)
- **Scaling:** Unlimited. `augmentRegen` is a single additive accumulator with NO CAP.

### Source 2: Guardian Howl (+2 HP/s regen per stack)

- **File:** `js/game3d.js`, lines 3206-3209
- **Code:**
  ```js
  if (id === 'guardian') {
    s.maxHp = Math.floor(s.maxHp * 1.08);
    s.hp = Math.min(s.hp + 10, s.maxHp);
    s.augmentRegen += 2;  // <-- THE BIGGEST OFFENDER
  }
  ```
- **Max stacks:** 3 (from `HOWL_TYPES.guardian.maxLevel`)
- **Total regen added:** 3 stacks x 2 HP/s = **+6.0 HP/s**
- **Also gives:** +8% maxHp per stack (compounding: 1.08^3 = 1.26x total maxHp), +10 instant heal per stack
- **Rainbow Scarf interaction:** None at runtime. The +2 HP/s is added to `augmentRegen` at level-up time as a flat value, NOT through a howl multiplier function. The scarf only affects the howl helper functions (`getHowlDmgMult`, `getHowlCdMult`, etc.), not `augmentRegen`. However, the *description* says "+2 HP/s regen per level" which is already very high.

### Source 3: Health Pendant (+1 HP/s regen)

- **File:** `js/game3d.js`, line 4659
- **Code:**
  ```js
  else if (it.slot === 'pendant') { st.items.pendant = true; st.augmentRegen += 1; }
  ```
- **Stacking:** Non-stackable (single slot item), so only +1 HP/s
- **Total regen added:** **+1.0 HP/s**

### Source 4: Shrine Augment — Regen type (+0.5 HP/s per shrine)

- **File:** `js/3d/constants.js`, line 338
- **Code:**
  ```js
  { id: 'regen', name: 'Heal over time!', color: '#88ffaa',
    apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.5; } }
  ```
- **Probability:** 1/8 shrine types = 12.5% per destroyed shrine
- **Shrines available:** 20 (SHRINE_COUNT)
- **Expected regen shrines:** ~2.5 shrines = **+1.25 HP/s average**
- **Max (all 20 regen):** +10 HP/s (extremely unlikely)
- **Realistic max (4-5 regen shrines):** +2.0 to +2.5 HP/s

### Source 5: Charge Shrine Regen Upgrades

- **File:** `js/3d/constants.js`, lines 352, 360, 368, 375
- **Available at each tier:**
  - Common: `regen03` = +0.3 HP/s
  - Uncommon: `regen07` = +0.7 HP/s
  - Rare: `regen12` = +1.2 HP/s
  - Legendary: `regen2` = +2.0 HP/s
- **Charge shrines available:** 22 (CHARGE_SHRINE_COUNT)
- **Each offers 3 choices** — player may pick regen if offered
- **Probability of regen being offered:** 1/6 per slot = ~40% chance at least one regen option per shrine
- **Realistic accumulation (picking regen when offered):** ~4-6 charge shrines with regen option, averaging ~0.5 HP/s each = **+2.0 to +3.0 HP/s**
- **Maximum (all 22 legendary regen):** +44 HP/s (astronomically unlikely)

### Source 6: Vampire Fangs Powerup (3 HP/s, temporary)

- **File:** `js/game3d.js`, lines 3665-3667
- **Code:**
  ```js
  if (st.vampireHeal) {
    st.hp = Math.min(st.hp + 3 * dt, st.maxHp);
  }
  ```
- **Duration:** 20 seconds
- **Rate:** 3 HP/s (flat, not scaling)
- **Impact:** Moderate — temporary but stacks with everything else during active window

### Source 7: Regen Burst Powerup (maxHP/5 per second, temporary)

- **File:** `js/game3d.js`, lines 3860-3862
- **Code:**
  ```js
  if (st.regenBurst) {
    st.hp = Math.min(st.hp + (st.maxHp / 5) * dt, st.maxHp);
  }
  ```
- **Duration:** 5 seconds (heals to full in 5s by design)
- **Rate:** maxHP/5 per second = full heal in 5 seconds
- **With inflated maxHp (e.g., 200 HP):** 40 HP/s
- **Impact:** Intentionally a "full heal" powerup, but compounds with everything else

### Source 8: Silly Straw Item (1 HP per 10 kills, per stack)

- **File:** `js/game3d.js`, lines 2127-2133
- **Code:**
  ```js
  if (st.items.sillyStraw > 0) {
    st.sillyStrawKills++;
    if (st.sillyStrawKills >= 10) {
      st.sillyStrawKills = 0;
      st.hp = Math.min(st.hp + st.items.sillyStraw, st.maxHp);
    }
  }
  ```
- **Rate:** 1 HP per 10 kills per stack
- **Late-game kill rate:** ~2-4 kills/second (with multiple weapons auto-firing) = ~0.2 to 0.4 HP/s per stack
- **With 3 stacks:** ~0.6 to 1.2 HP/s
- **Impact:** Low individually, but contributes to the pile

### Source 9: Health Orb Drops (15% maxHP instant heal)

- **File:** `js/game3d.js`, lines 2158-2160
- **Code:**
  ```js
  st.hp = Math.min(st.hp + st.maxHp * 0.15, st.maxHp);
  ```
- **Trigger:** Enemy loot drop (25% of all loot rolls that pass the dropChance check)
- **Drop chance (tier 1):** 3% base. With Lucky Charm: 4.5%. With Lucky Penny stacks: higher.
- **Drop chance (tier 5+):** 15-50% base, further amplified by items
- **Per orb heal:** 15% of maxHP (with 200 maxHp = 30 HP per orb)
- **Late-game frequency:** With high-tier enemies dying fast, could proc multiple times per second
- **Effective rate:** Highly variable, estimated **+3 to +10 HP/s equivalent** in dense late-game combat

### Source 10: Vitality Howl (+20 maxHp + instant heal per stack)

- **File:** `js/game3d.js`, lines 3199-3201
- **Code:**
  ```js
  if (id === 'vitality') {
    s.maxHp += 20;
    s.hp = Math.min(s.hp + 20, s.maxHp);
  }
  ```
- **Max stacks:** 5
- **Total:** +100 maxHp, +100 instant healing (spread across 5 level-ups)
- **Impact:** Not regen, but inflates maxHp which makes percentage-based heals (health orbs, regen burst) more powerful

### Source 11: Thick Fur Item (+15 maxHp per stack + instant heal)

- **File:** `js/game3d.js`, line 4652
- **Code:**
  ```js
  if (it.id === 'thickFur') { st.maxHp += 15; st.hp = Math.min(st.hp + 15, st.maxHp); }
  ```
- **Stackable:** Yes, unlimited
- **Impact:** Each stack inflates maxHP AND instant-heals 15 HP. Compounds with %-based heals.

### Source 12: Level-Up Fallback Heal Options

- **File:** `js/game3d.js`, lines 3217-3231
- **Code:**
  ```js
  pool.push({
    category: 'HEAL', name: 'HEAL', color: '#44ff44', desc: 'Feel better!',
    apply: s => { s.hp = Math.min(s.hp + 30, s.maxHp); }
  });
  pool.push({
    category: 'HEAL', name: 'MAX HP +10', color: '#88ff88', desc: 'More hearts!',
    apply: s => { s.maxHp += 10; s.hp = Math.min(s.hp + 10, s.maxHp); }
  });
  ```
- **When:** Only when upgrade pool has fewer than 3 options (late game when most things are maxed)
- **Impact:** Minor — only 30 HP or +10 maxHp. Infrequent.

### Source 13: Shrine Augment — maxHp type (+5% maxHp + 10 instant heal)

- **File:** `js/3d/constants.js`, line 331
- **Code:**
  ```js
  { id: 'maxHp', name: 'Tougher!', apply: s => {
    s.maxHp = Math.floor(s.maxHp * 1.05);
    s.hp = Math.min(s.hp + 10, s.maxHp);
  }}
  ```
- **Impact:** Multiplicative maxHp scaling + small instant heal. Compounds all %-based heals.

### Source 14: Charge Shrine HP Upgrades (instant maxHp + heal)

- **File:** `js/3d/constants.js`, lines 348, 356, 364, 372, 376
- Common: +5 maxHp + 5 heal
- Uncommon: +12 maxHp + 12 heal
- Rare: +25 maxHp + 25 heal
- Legendary: +50 maxHp + 50 heal, OR full heal to maxHp
- **Impact:** Inflates maxHp significantly over a run, compounding all percentage heals

---

## 2. Late-Game Healing Calculation

### Assumptions for "Worst Case" (Max Stacking Late Game)

Player is at level ~25-30, has been playing for 15-20 minutes, has explored and destroyed shrines.

| Source | Realistic Late-Game Value | HP/s |
|--------|--------------------------|------|
| Guardian Howl (3 stacks) | +2 HP/s x 3 | **6.0** |
| Health Pendant | +1 HP/s | **1.0** |
| Shrine Augment Regen (~3 regen shrines) | +0.5 x 3 | **1.5** |
| Charge Shrine Regen (~3 picks, mixed tiers) | avg ~0.7 x 3 | **2.1** |
| Silly Straw (2 stacks, ~3 kills/s) | ~0.6 | **0.6** |
| **Subtotal: Continuous Passive Regen** | | **11.2 HP/s** |
| Vampire Fangs (when active, 20s) | +3 | **+3.0** |
| Health Orb drops (avg in dense combat) | ~5 HP/s equiv | **+5.0** |
| **Total with active powerup + combat** | | **~19.2 HP/s** |

### MaxHP at this point:
- Base: 50 HP (Leopard with hpMult 1.0)
- Vitality Howl (5 stacks): +100 = 150
- Guardian Howl (3 stacks): x1.08^3 = x1.26 => 189
- Thick Fur (3 stacks): +45 = 234
- Shrine augments (~2 maxHp shrines): x1.05^2 = x1.10 => 257
- Charge shrine HP picks (~3): +30 avg = 287
- **Realistic late-game maxHP: ~250-300 HP**

### Incoming Damage Comparison

Contact damage formula: `15 * tierData.dmgMult * st.zombieDmgMult * dt`
- `st.zombieDmgMult = 2` (hardcoded)
- After a hit, `st.invincible = 0.2` (0.2s immunity)

**Effective DPS from contact per zombie:**
- The damage uses `* dt`, so one frame of contact at 60fps: `15 * dmgMult * 2 * 0.0167`
- Tier 1 (dmgMult=1): `15 * 1 * 2 * 0.0167 = 0.5 HP` per hit, one hit per 0.217s = **~2.3 HP/s**
- Tier 3 (dmgMult=2): `15 * 2 * 2 * 0.0167 = 1.0 HP` per hit = **~4.6 HP/s**
- Tier 5 (dmgMult=3.5): `15 * 3.5 * 2 * 0.0167 = 1.75 HP` per hit = **~8.0 HP/s**

**With armor:**
- Leather (-25%): Tier 5 = 6.0 HP/s
- Chainmail (-40%): Tier 5 = 4.8 HP/s
- Chainmail + augment armor (3 shrines, 9%): Tier 5 = 4.4 HP/s

### The Verdict

| Scenario | Healing HP/s | Damage HP/s | Net HP/s |
|----------|-------------|-------------|----------|
| Mid-game (Guardian x1, pendant) | 3.0 | 4.6 (tier 3) | -1.6 (healthy) |
| Late-game passive only | 11.2 | 8.0 (tier 5) | **+3.2 (unkillable)** |
| Late-game + vampire fangs | 14.2 | 8.0 (tier 5) | **+6.2 (invincible)** |
| Late-game + combat heals | 19.2 | 8.0 (tier 5) | **+11.2 (absurd)** |

Even against 3 simultaneous tier-5 zombies (24 HP/s raw, ~14.4 with chainmail+armor), the player only takes a net 3.2 HP/s while passively regenerating 11.2 HP/s and getting periodic health orbs. The invincibility window (0.2s per hit) also means only one zombie can damage per 0.2s cycle, so 3 zombies hitting at once still only deal single-zombie DPS.

---

## 3. Why It Feels "Instant" — Mathematical Explanation

### The Core Problem: Uncapped Additive Regen Accumulator

`st.augmentRegen` is a single number that multiple systems dump into with **no upper cap**:

1. Guardian Howl: +2.0 per stack (up to +6.0)
2. Health Pendant: +1.0 (flat)
3. Shrine regen augments: +0.5 each (unlimited shrines)
4. Charge shrine regen upgrades: +0.3 to +2.0 each (22 shrines available)

By mid-game, `augmentRegen` easily reaches 5-8 HP/s. By late game, 10-15 HP/s is common.

### Why It Compounds So Badly

1. **Guardian Howl is the biggest offender.** At +2 HP/s per stack with 3 max stacks, it alone provides +6 HP/s. For a 50 HP character, that is 12% of max HP *per second*. With the maxHP inflation from vitality/thick fur/shrines pushing maxHP to 250+, the 6 HP/s is still enormous relative to incoming single-zombie damage (~2-5 HP per hit every 0.2s).

2. **Invincibility frames cap incoming damage but not healing.** The 0.2s invincibility timer means even a swarm of 20 zombies deals the same DPS as a single zombie (one hit per 0.2s). But regen ticks every single frame. This creates an asymmetry where damage is capped but healing is not.

3. **Health orbs scale with maxHP.** The 15% maxHP heal from health orb drops means as maxHP inflates (250-300 late game), each orb heals 37-45 HP. With multiple enemies dying per second and decent drop rates, these bursts alone can outpace damage.

4. **Multiple independent heal sources stack additively.** There is no diminishing return on healing. Source 1 + Source 2 + Source 3 all add linearly. Five separate +2 HP/s sources give +10 HP/s with zero penalty.

### The Tipping Point

The game transitions from "challenging" to "invincible" roughly when `augmentRegen` exceeds ~4-5 HP/s, which typically happens around level 12-15 (Guardian Howl x2 + pendant or a few shrines). After this point, the player can stand still in a crowd and their HP bar visibly refills faster than it drains.

---

## 4. Specific Fix Recommendations

### Fix A: Cap `augmentRegen` (Quick Fix - Highest Impact)

**File:** `js/game3d.js`, line 4876

```js
// BEFORE:
if (st.augmentRegen > 0) {
  st.hp = Math.min(st.hp + st.augmentRegen * dt, st.maxHp);
}

// AFTER:
if (st.augmentRegen > 0) {
  const effectiveRegen = Math.min(st.augmentRegen, 4.0); // hard cap at 4 HP/s
  st.hp = Math.min(st.hp + effectiveRegen * dt, st.maxHp);
}
```

### Fix B: Reduce Guardian Howl Regen from +2 to +0.5 HP/s per stack (Root Cause)

**File:** `js/game3d.js`, line 3209

```js
// BEFORE:
s.augmentRegen += 2;

// AFTER:
s.augmentRegen += 0.5;
```

Also update the description in `js/3d/constants.js`, line 161:
```js
// BEFORE:
 * @property {Object} guardian - +8% max HP and +2 HP/s regen per level (max 3).

// AFTER:
 * @property {Object} guardian - +8% max HP and +0.5 HP/s regen per level (max 3).
```

### Fix C: Reduce Health Orb Heal from 15% to 8% of maxHP

**File:** `js/game3d.js`, line 2159

```js
// BEFORE:
st.hp = Math.min(st.hp + st.maxHp * 0.15, st.maxHp);

// AFTER:
st.hp = Math.min(st.hp + st.maxHp * 0.08, st.maxHp);
```

### Fix D: Add Diminishing Returns to augmentRegen

**File:** `js/game3d.js`, line 4876

Instead of a hard cap, apply diminishing returns so early regen sources feel impactful but stacking gives less benefit:

```js
// BEFORE:
if (st.augmentRegen > 0) {
  st.hp = Math.min(st.hp + st.augmentRegen * dt, st.maxHp);
}

// AFTER:
if (st.augmentRegen > 0) {
  // Diminishing returns: effective = 3 * (1 - e^(-raw/3))
  // At raw 1.0 -> effective 0.95 (barely reduced)
  // At raw 3.0 -> effective 1.90 (37% reduction)
  // At raw 6.0 -> effective 2.59 (57% reduction)
  // At raw 10.0 -> effective 2.89 (71% reduction)
  // Asymptotic cap at 3.0 HP/s
  const effectiveRegen = 3.0 * (1 - Math.exp(-st.augmentRegen / 3.0));
  st.hp = Math.min(st.hp + effectiveRegen * dt, st.maxHp);
}
```

### Fix E: Reduce Charge Shrine Regen Values

**File:** `js/3d/constants.js`

```js
// BEFORE:
{ id: 'regen03',   name: 'Tiny heal!',    apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.3; } },
{ id: 'regen07',   name: 'Good healing!',  apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.7; } },
{ id: 'regen12',   name: 'Great healing!',  apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 1.2; } },
{ id: 'regen2',    name: 'Amazing healing!', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 2.0; } },

// AFTER:
{ id: 'regen03',   name: 'Tiny heal!',    apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.15; } },
{ id: 'regen07',   name: 'Good healing!',  apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.3; } },
{ id: 'regen12',   name: 'Great healing!',  apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.5; } },
{ id: 'regen2',    name: 'Amazing healing!', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.8; } },
```

### Fix F: Reduce Shrine Augment Regen

**File:** `js/3d/constants.js`, line 338

```js
// BEFORE:
{ id: 'regen', name: 'Heal over time!', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.5; } },

// AFTER:
{ id: 'regen', name: 'Heal over time!', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.2; } },
```

---

## 5. Recommended Balanced Values

### Target: Late-game passive regen should be ~2-3 HP/s maximum

This means with 250 maxHP, full recovery takes ~80-125 seconds of pure regen, which feels meaningful without making the player invincible.

| Source | Current Value | Recommended Value | Reasoning |
|--------|--------------|-------------------|-----------|
| Guardian Howl (per stack) | +2.0 HP/s | +0.5 HP/s | 3 stacks = 1.5 HP/s max, meaningful but not dominant |
| Health Pendant | +1.0 HP/s | +0.5 HP/s | Uncommon item, should feel nice but not game-changing |
| Shrine Augment Regen | +0.5 HP/s | +0.2 HP/s | Minor per-shrine bonus, adds up slowly |
| Charge Shrine (common) | +0.3 HP/s | +0.15 HP/s | Halved across the board |
| Charge Shrine (uncommon) | +0.7 HP/s | +0.3 HP/s | |
| Charge Shrine (rare) | +1.2 HP/s | +0.5 HP/s | |
| Charge Shrine (legendary) | +2.0 HP/s | +0.8 HP/s | |
| Vampire Fangs powerup | 3.0 HP/s | 2.0 HP/s | Temporary, but should not trivialize combat |
| Health Orb | 15% maxHP | 8% maxHP | Still noticeable, not a quarter-health burst |
| Regen Burst powerup | maxHP/5 per sec | maxHP/8 per sec | Still heals to full, just takes ~8s not 5s |
| `augmentRegen` hard cap | None | 3.0 HP/s | Safety net regardless of source stacking |

### Projected Late-Game with Recommended Values

| Source | HP/s |
|--------|------|
| Guardian Howl (3 stacks) | 1.5 |
| Health Pendant | 0.5 |
| Shrine regen (~3) | 0.6 |
| Charge shrine regen (~3) | 0.9 |
| **Raw total** | **3.5** |
| **After hard cap** | **3.0** |

With 3.0 HP/s passive regen vs tier-5 zombie DPS of ~8 HP/s (with chainmail: ~4.8 HP/s), the player still takes meaningful net damage (~1.8 HP/s) even with max regen and best armor. Multiple zombies or higher tiers remain threatening. Health orbs at 8% maxHP (~20 HP) provide welcome but not trivializing bursts.

### Implementation Priority

1. **Fix B (Guardian Howl +2 to +0.5)** — Biggest single impact, simplest change
2. **Fix A (augmentRegen hard cap at 3-4)** — Safety net for all stacking
3. **Fix C (Health orb 15% to 8%)** — Prevents burst heal scaling with maxHP
4. **Fix E+F (Shrine regen reductions)** — Prevents gradual accumulation to silly levels
5. **Fix D (Diminishing returns)** — Most elegant long-term solution, can replace Fix A

Fixes B + A together would immediately resolve the "instant healing" feeling. The remaining fixes refine the balance further.

---

## Appendix: Contact Damage Deep Dive

The contact damage system has a subtle interaction with healing that makes the problem worse:

```js
// js/game3d.js line 4189
let dmg = 15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1) * dt;
```

Damage is applied for ONE FRAME (`* dt`), then 0.2s of invincibility (`st.invincible = 0.2`). This means:
- At 60fps: `dt = 0.0167s`, so one contact hit = `15 * dmgMult * 2 * 0.0167`
- Tier 1: 0.5 HP per hit, one hit per ~0.217s = 2.3 HP/s effective DPS
- Tier 5: 1.75 HP per hit = 8.1 HP/s effective DPS

The invincibility frame system means a swarm of 50 zombies deals the SAME DPS as a single zombie — only one can damage per 0.2s window. This is a deliberate design choice for a kids' game (prevents instant death in crowds), but it means healing only needs to outpace single-enemy DPS to make the player functionally invincible, which is a very low bar to clear at ~2-8 HP/s depending on tier.
