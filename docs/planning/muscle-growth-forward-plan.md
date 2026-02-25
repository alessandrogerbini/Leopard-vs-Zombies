# BD-243: Muscle Growth System — Analysis & Forward Plan

## Current System Analysis

### Where It Lives

The muscle growth system is implemented in two files:

- **`js/3d/player-model.js`** (lines 490-561): The `updateMuscleGrowth(model, level)` function applies scale transforms to body parts based on the player's current level.
- **`js/game3d.js`** (lines 4617-4623): The per-frame game loop calls `updateMuscleGrowth` only when the level changes, tracked via `st._lastGrowthLevel`.

### How It Works

On each level change, the function computes `t = level - 1` and applies five tiers of scaling to different body part groups:

| Tier | Body Parts | Formula | Rate/Level | Cap | Cap Level |
|------|-----------|---------|-----------|-----|-----------|
| 1: Core Muscles | chest, shoulderL, shoulderR | `Math.min(1.8, 1 + t * 0.05)` | +5%/level | 1.8x | **Level 17** |
| 2: Limbs | arms (bicepL/R), legs (thighL/R) | `Math.min(1.5, 1 + t * 0.035)` | +3.5%/level | 1.5x | **Level 16** |
| 3: Extremities | hands, feet | `Math.min(1.4, 1 + t * 0.025)` | +2.5%/level | 1.4x | **Level 17** |
| 4: Head | head mesh | `Math.min(1.25, 1 + t * 0.015)` | +1.5%/level | 1.25x | **Level 18** |
| 5: Cosmetic | tail, features (spots/mane/ridges/faceMask) | `Math.min(1.2, 1 + t * 0.01)` | +1%/level | 1.2x | **Level 21** |

**Code reference** (`js/3d/player-model.js` lines 515-518, core muscles example):
```js
const mS = Math.min(1.8, 1 + t * 0.05);
if (model.muscles) {
  for (const key of ['chest', 'shoulderL', 'shoulderR']) {
    if (model.muscles[key]) model.muscles[key].scale.set(mS, mS * 0.7, mS);
  }
}
```

Notable: Tier 1 core muscles use non-uniform scaling (`mS * 0.7` on Y axis) to avoid a "tall blob" look. All other tiers use uniform scaling.

### Exact Growth Values at Level Milestones

| Level | t | Tier 1 (Core) | Tier 2 (Limbs) | Tier 3 (Extremities) | Tier 4 (Head) | Tier 5 (Cosmetic) |
|-------|---|---------------|----------------|----------------------|---------------|-------------------|
| 1 | 0 | 1.00x | 1.00x | 1.00x | 1.00x | 1.00x |
| 5 | 4 | 1.20x | 1.14x | 1.10x | 1.06x | 1.04x |
| 10 | 9 | 1.45x | 1.315x | 1.225x | 1.135x | 1.09x |
| 15 | 14 | 1.70x | 1.49x | 1.35x | 1.21x | 1.14x |
| 17 | 16 | **1.80x** (CAPPED) | **1.50x** (CAPPED) | **1.40x** (CAPPED) | 1.24x | 1.16x |
| 18 | 17 | 1.80x | 1.50x | 1.40x | **1.25x** (CAPPED) | 1.17x |
| 20 | 19 | 1.80x | 1.50x | 1.40x | 1.25x | 1.19x |
| 21 | 20 | 1.80x | 1.50x | 1.40x | 1.25x | **1.20x** (CAPPED) |
| 25 | 24 | 1.80x | 1.50x | 1.40x | 1.25x | 1.20x |
| 30 | 29 | 1.80x | 1.50x | 1.40x | 1.25x | 1.20x |

### What Body Parts Are Tracked in the Model

The `buildPlayerModel` function (lines 54-353) returns a structured object with these named parts per animal:

- **`muscles`**: `{ chest, shoulderL, shoulderR, bicepL, bicepR, thighL, thighR }`
- **`head`**: Single head mesh
- **`arms`**: `[bicepL, bicepR]` (same meshes as muscles.bicepL/R)
- **`legs`**: `[thighL, thighR]` (same meshes as muscles.thighL/R)
- **`hands`**: `[leftHand, rightHand]`
- **`feet`**: `[leftFoot, rightFoot]`
- **`tail`**: Single tail mesh
- **`features`**: Animal-specific cosmetics:
  - Leopard: `{ spots: [...] }` (4 rosette spot meshes)
  - Red Panda: `{ faceMask: mesh }` (white face mask)
  - Lion: `{ mane: [maneOuter, maneInner] }` (2 mane layer meshes)
  - Gator: `{ ridges: [...] }` (5 back ridge meshes)

### Does Growth Affect Gameplay?

**No.** The muscle growth system is purely visual:

- **Hitbox**: Enemy contact damage is computed using `dist < 1.0 * tierData.scale` (`game3d.js` line 5528), based on the zombie's tier scale, not the player model's visual size.
- **Camera**: Camera distance is hardcoded at `playerY + 18, playerZ + 14` (`game3d.js` lines 6413-6419), unaffected by player model scale.
- **Attack range**: Uses `st.attackRange` (base 3, modified by howls/items), not model geometry.
- **Pickup radius**: Uses `st.collectRadius` (base 2), not model geometry.

The only scale interaction is the `giantMode` powerup (`game3d.js` lines 4875-4881), which overrides the entire `playerGroup.scale` to `(2,2,2)` — this is independent of muscle growth and purely visual as well.

### XP / Level System Context

From `game3d.js` line 294 and lines 5850-5855:
- Starts at level 1, `xp: 0`, `xpToNext: 10`
- On level-up: `xpToNext = Math.floor(xpToNext * 1.5)`
- **Player level is uncapped** — no maximum level constant exists
- XP thresholds: 10, 15, 22, 33, 50, 75, 112, 168, 253, 379, 569, 853, 1280, 1920, 2880, ...

Reaching level 30+ is achievable in longer sessions, especially with Fortune Howl (+30%/level XP) and Zombie Magnet (2x XP drops).

---

## Problem Diagnosis

### The Plateau

All five growth tiers hit their hard caps between **level 16 and 21**:

- Tiers 1-3 (the most visible: chest, shoulders, arms, legs, hands, feet) all cap by **level 17**
- Head caps at level 18
- Cosmetic features cap at level 21

This means that **from level 17 onward, the player sees zero visual change** from leveling up. The growth system stops rewarding the player at the exact point where levels start requiring exponentially more XP — the worst possible time to lose a reward signal.

### Why It Was Designed This Way

The current caps exist for a valid reason: preventing the "blobby" look where everything scales uniformly and the character loses definition. The `Math.min` clamps and the non-uniform Y scaling on core muscles (0.7 factor) were deliberate attempts to control this. The original design assumed most runs wouldn't exceed level 15-20.

### The Core Tension

More growth = more reward, but too much growth = visual absurdity. The solution must provide continued visual progression without making the character look like a balloon.

---

## Proposed New Growth Curve

### Design Philosophy

Use a **three-phase piecewise curve** instead of a single linear rate with hard cap:

1. **Phase A (Levels 1-10):** Fast growth — the "getting swole" phase. Big visual changes reward early leveling.
2. **Phase B (Levels 11-20):** Moderate growth — diminishing but still noticeable. Player sees they're still growing.
3. **Phase C (Levels 21-35+):** Slow growth — never fully stops, but gains are small. Combined with new visual detail systems (Phase 2) to keep progression feeling impactful.

### Proposed Formula

Replace the current `Math.min(cap, 1 + t * rate)` with a logarithmic curve that never fully caps:

```
scale(t) = 1 + maxGrowth * (1 - e^(-growthRate * t))
```

Where `maxGrowth` is the asymptotic maximum *additional* scale, and `growthRate` controls how fast it approaches. The key property: **growth never reaches zero**, it just gets increasingly small.

### Proposed Tier Parameters

| Tier | Parts | Max Growth | Rate | Value at L1 | L5 | L10 | L15 | L20 | L25 | L30 | L35 |
|------|-------|-----------|------|-------------|------|------|------|------|------|------|------|
| 1: Core | chest, shoulders | 1.00 | 0.08 | 1.00 | 1.27 | 1.55 | 1.70 | 1.78 | 1.83 | 1.86 | 1.89 |
| 2: Limbs | biceps, thighs | 0.65 | 0.07 | 1.00 | 1.16 | 1.35 | 1.44 | 1.50 | 1.53 | 1.55 | 1.57 |
| 3: Extremities | hands, feet | 0.50 | 0.06 | 1.00 | 1.11 | 1.24 | 1.32 | 1.37 | 1.40 | 1.42 | 1.44 |
| 4: Head | head | 0.30 | 0.05 | 1.00 | 1.05 | 1.12 | 1.17 | 1.20 | 1.22 | 1.24 | 1.25 |
| 5: Cosmetic | tail, features | 0.25 | 0.04 | 1.00 | 1.04 | 1.09 | 1.13 | 1.15 | 1.17 | 1.18 | 1.19 |

**Comparison to current system at level 25:**
- Current Tier 1 (core): 1.80x (capped at level 17)
- Proposed Tier 1 (core): 1.83x (still growing, +0.03 per 5 levels)

The improvement isn't about making things bigger — the peak sizes are similar. It's about **never stopping**. The player always sees a small bump on level-up.

### Non-uniform Scaling Preservation

Keep the existing Tier 1 Y-axis reduction (`mS * 0.7`) to maintain proportions. Extend this principle:
- Tier 1 (Core): scale as `(s, s*0.7, s)` — wider than taller (existing behavior)
- Tier 2 (Limbs): scale as `(s, s, s*0.95)` — slight depth reduction to avoid stubby look at high scales
- Tiers 3-5: uniform scaling (current behavior, works fine)

---

## Visual Improvement Phases

### Phase 2: Visual Detail Upgrades (Beyond Raw Size)

These provide visual progression that supplements the scale curve, especially at high levels where scale gains are small.

#### 2A: Color Intensity Deepening

At higher levels, shift the animal's base color toward a richer, more saturated version. Use the existing `ANIMAL_PALETTES` from `js/3d/constants.js` (line 47) as the base and interpolate toward a "powered up" palette.

- **Levels 1-10:** Base colors (unchanged)
- **Levels 11-20:** Gradual shift toward deeper saturation (+15% saturation at level 20)
- **Levels 21+:** Peak saturation, subtle luminance boost (+10% brightness)

Implementation: `lerpColor(baseColor, poweredColor, factor)` where factor ramps with a similar log curve.

#### 2B: Per-Animal Personality at High Growth

Each animal develops a unique visual identity as they grow:

- **Leopard (level 15+):** Spot meshes grow more prominent (increase spot scale faster than Tier 5 rate). At level 25+, spots darken to near-black, giving a more predatory look.
- **Lion (level 15+):** Mane meshes (`features.mane`) scale at an accelerated rate — the mane grows noticeably bigger/bushier. Mane color shifts toward richer gold. At level 25+, mane extends backward slightly (add extra mane boxes dynamically).
- **Gator (level 15+):** Ridge meshes grow taller and more pronounced. Jaw (snout boxes) widens slightly. At level 25+, add 2-3 additional ridge meshes for a more armored look.
- **Red Panda (level 15+):** Tail mesh scales at an accelerated rate (bushier). Face mask becomes more prominent. At level 25+, ears grow slightly larger.

Implementation: A new `updateAnimalPersonality(model, animalId, level)` function that modifies feature-specific parts beyond the generic tier system.

#### 2C: Power Aura at High Levels

At level 20+, add a subtle environmental visual indicator of power:

- **Level 20-24:** Faint colored particles occasionally spawn around the player's feet (2-3 per second). Color matches the animal palette.
- **Level 25-29:** Particle rate increases (5-6/s), particles orbit the player at waist height.
- **Level 30+:** Full soft glow aura — a transparent, emissive sphere mesh around the player that pulses slowly. Particle rate high (8-10/s).

Implementation: Aura system as a new function `updatePowerAura(model, st, clock)` called alongside animation. Uses existing `spawnFireParticle` infrastructure in `game3d.js` for particles; adds a single transparent sphere mesh for the glow.

### Phase 3: Milestone Visual Events

#### 3A: Growth Milestone Flash

Every 5 levels (5, 10, 15, 20, 25, 30...), trigger a brief celebration effect:

- Screen briefly flashes white (0.15s, HUD canvas overlay)
- Burst of 15-20 colored particles radiating outward from the player
- Short screen shake (existing infrastructure? If not, gentle camera offset for 0.2s)

Implementation: A `triggerGrowthMilestone(level)` function called from the level-up handler in `game3d.js` (after `showUpgradeMenu()` at lines 5853-5855).

#### 3B: Camera Pull-Back at Milestones

At milestone levels, briefly pull the camera back by 20% for 1.5 seconds so the player can appreciate their new size in context, then smoothly return to normal distance.

Implementation: Temporary modifier on `camTargetY`/`camTargetZ` in the camera follow code (`game3d.js` lines 6413-6418), with a countdown timer.

---

## Implementation Beads

Each bead is scoped for a single agent session.

### BD-244: Replace Linear Growth Curve with Logarithmic Curve

**File:** `js/3d/player-model.js` (function `updateMuscleGrowth`, lines 509-561)

**Changes:**
- Replace `Math.min(cap, 1 + t * rate)` formulas with `1 + maxGrowth * (1 - Math.exp(-growthRate * t))` for all five tiers
- Use the parameter values from the proposed table above
- Keep the non-uniform Y scaling on Tier 1 (`mS * 0.7`)
- Add slight depth reduction for Tier 2 (`lS * 0.95` on Z)

**Tests:** Verify visually at levels 1, 10, 20, 30 that growth is smooth and proportional. Verify no "blobby" appearance. Verify giant mode powerup still works correctly on top of muscle growth.

### BD-245: Color Intensity Deepening per Level

**Files:** `js/3d/player-model.js`, `js/3d/constants.js`

**Changes:**
- Add `ANIMAL_POWERED_PALETTES` to `constants.js` — a "powered up" palette per animal with deeper/richer colors
- Add a new exported function `updateColorIntensity(model, animalId, level)` to `player-model.js`
- Function traverses muscle/head/tail meshes and interpolates their material color between base and powered palette based on a log curve
- Call it from `game3d.js` alongside `updateMuscleGrowth` (inside the `st.level !== st._lastGrowthLevel` block, line 4620)

**Scope note:** Only affects base body colors. Feature-specific colors (spots, mane) are handled in BD-247.

### BD-246: Per-Animal Feature Growth (Lion Mane / Gator Ridges / Leopard Spots / Red Panda Tail)

**File:** `js/3d/player-model.js`

**Changes:**
- Add a new exported function `updateAnimalPersonality(model, animalId, level)`
- For each animal, apply accelerated growth curves to their signature features:
  - Leopard: spots scale faster, darken at high levels
  - Lion: mane meshes scale at 1.5x the normal Tier 5 rate, color shift to richer gold
  - Gator: ridge meshes grow taller (Y scale emphasis), jaw widens at 25+
  - Red Panda: tail scales at 1.5x rate, ears grow at 25+
- Call from `game3d.js` alongside `updateMuscleGrowth` (same conditional block)

### BD-247: Dynamic Feature Addition at High Levels

**Files:** `js/3d/player-model.js`, `js/game3d.js`

**Changes:**
- At level 25+, dynamically add new box meshes to the model to enhance features:
  - Lion: 2-3 extra mane layer boxes behind the head
  - Gator: 2-3 additional ridge boxes along the spine
  - Leopard: 2 extra spot meshes on the arms/legs
  - Red Panda: Extra tail stripe box
- Track added meshes on `model._dynamicFeatures` array for cleanup
- Only add once (check a `model._dynamicFeaturesAdded` flag)
- Dispose dynamic features on scene cleanup

### BD-248: Power Aura Particle System (Level 20+)

**Files:** `js/game3d.js`

**Changes:**
- In the per-frame animation section (after line 4622), add aura particle spawning:
  - Level 20-24: 2-3 colored particles/s at feet
  - Level 25-29: 5-6 particles/s orbiting at waist
  - Level 30+: 8-10 particles/s full orbit
- Use existing `spawnFireParticle` function (already available in game3d.js)
- Particle color derived from `ANIMAL_PALETTES[animalId].accent`
- Gate behind the same `st.level !== st._lastGrowthLevel` check for threshold detection, but particle spawning runs every frame

### BD-249: Power Glow Sphere at Level 30+

**Files:** `js/3d/player-model.js`, `js/game3d.js`

**Changes:**
- Add a transparent, emissive sphere mesh to the player model (initially invisible)
- At level 30+, make it visible and pulse its opacity (0.05-0.15 range) using a sine wave
- Sphere color matches animal palette accent color
- Sphere radius scales slightly with level (base 1.5, +0.01/level above 30)
- Dispose on cleanup

### BD-250: Growth Milestone Celebration (Every 5 Levels)

**Files:** `js/game3d.js`, `js/3d/hud.js`

**Changes:**
- Add a `triggerGrowthMilestone(level)` function in `game3d.js`:
  - Spawns 15-20 colored particles radiating outward from player position
  - Sets a `st.milestoneFlash` timer (0.15s) read by HUD for white screen flash
- In `hud.js`, check `st.milestoneFlash > 0` and draw a white overlay with declining opacity
- Call `triggerGrowthMilestone` from the level-up handler at lines 5853-5855 and 5895-5897, only when `st.level % 5 === 0`

### BD-251: Camera Pull-Back at Growth Milestones

**File:** `js/game3d.js`

**Changes:**
- Add `st.milestoneCamTimer` (default 0) and `st.milestoneCamPull` (default 0)
- In `triggerGrowthMilestone`, set `st.milestoneCamTimer = 1.5`, `st.milestoneCamPull = 0.2`
- In camera follow code (lines 6413-6418), when `st.milestoneCamTimer > 0`:
  - Multiply `camTargetY` by `(1 + st.milestoneCamPull)` and `camTargetZ` by `(1 + st.milestoneCamPull)`
  - Decrement timer by dt
  - On timer expiry, smoothly ease pull back to 0

---

## Dependency Graph

```
BD-244 (log curve)                          -- no dependencies, foundation
BD-245 (color intensity)                    -- no dependencies, independent
BD-246 (per-animal feature growth)          -- depends on BD-244 (uses same curve utils)
BD-247 (dynamic feature addition)           -- depends on BD-246 (extends feature system)
BD-248 (power aura particles)              -- no dependencies, uses existing particle system
BD-249 (glow sphere)                        -- no dependencies, independent
BD-250 (milestone celebration)              -- no dependencies, independent
BD-251 (camera pull-back)                   -- depends on BD-250 (uses milestone trigger)
```

**Parallel batch 1:** BD-244, BD-245, BD-248, BD-249, BD-250
**Parallel batch 2:** BD-246, BD-251
**Sequential after batch 2:** BD-247

## Summary

The current muscle growth system fully plateaus by level 17-21, providing zero visual feedback for leveling up during the endgame. The proposed changes replace the hard-capped linear curve with a logarithmic curve that never stops growing (BD-244), layer on color deepening (BD-245), per-animal character development (BD-246/247), power aura effects (BD-248/249), and milestone celebrations (BD-250/251). Together these ensure that every level-up from 1 to 35+ feels visually rewarding.
