# BD-244: Multi-Jump System Forward Plan — Aerial Progression Design

## 1. Current System Analysis

### 1.1 Jump Physics Constants (`js/3d/constants.js`)

| Constant     | Value | Description                                    | Line |
|-------------|-------|------------------------------------------------|------|
| `GRAVITY_3D` | 22    | Downward acceleration in units/s^2             | L20  |
| `JUMP_FORCE`  | 10    | Base upward velocity applied on jump           | L22  |
| `GROUND_Y`    | 0     | Baseline Y coordinate for flat ground          | L24  |

With `JUMP_FORCE = 10` and `GRAVITY_3D = 22`, the player reaches peak height at
`t_peak = v0 / g = 10/22 = 0.454s`, with max height `h = v0^2 / (2g) = 100/44 = 2.27 units`.
Total air time (ground to ground, flat terrain): `2 * t_peak = 0.909s`.

### 1.2 Jump Execution (`js/game3d.js` L4531-4543)

The player jump system is a single-jump, ground-only mechanic:

```javascript
// L4532-4542
if (keys3d['Space'] && st.onGround) {
  let jumpMult = st.jumpBoost;
  // Wearable feet jump bonus (e.g. Spring Boots: +30%)
  if (st.wearables.feet) {
    const feetEff = WEARABLES_3D[st.wearables.feet].effect;
    if (feetEff.jumpMult) jumpMult *= feetEff.jumpMult;
  }
  st.playerVY = st.jumpForce * jumpMult;
  st.onGround = false;
  st.onPlatformY = null;
  playSound('sfx_jump');
}
// Gravity
st.playerVY -= GRAVITY_3D * dt;
st.playerY += st.playerVY * dt;
```

Key observations:
- **Single jump only**: `st.onGround` must be `true` to jump. No air-jump counter exists.
- **Jump force chain**: `st.jumpForce` (base=10) * `st.jumpBoost` (powerup multiplier, default=1) * wearable `jumpMult`.
- **No double-jump, air-jump, or jump-count state** exists anywhere in the codebase. `airJump`, `doubleJump`, `multiJump`, `extraJump`, `jumpCount` all return zero matches.
- **No apex hang-time** in 3D mode. The 2D mode (`js/game.js` L558-561) has a sneaker-based hang-time system that halves gravity when `|player.vy| < 4`, but this was never ported to 3D.

### 1.3 Ground Detection (`js/game3d.js` L4549-4575)

Ground and platform collision:
```javascript
// Ground collision (L4553-4558)
if (!st.flying && st.playerY <= groundH) {
  st.playerY = groundH;
  st.playerVY = 0;
  st.onGround = true;
  st.onPlatformY = null;
}

// Platform collision, only when falling (L4561-4575)
if (!st.flying && st.playerVY <= 0) {
  for (const p of platforms) {
    // ... bounding box check ...
    if (playerY >= platTop - 0.5 && playerY <= platTop + 0.5) {
      st.playerY = platTop;
      st.playerVY = 0;
      st.onGround = true;
      st.onPlatformY = platTop;
    }
  }
}
```

`st.onGround` is set to `true` when the player contacts terrain or a platform. It is set to `false` only when the player initiates a jump (L4540) or during flight mode (L4488).

### 1.4 Existing Jump Multiplier Stack

The `jumpMult` variable at L4533 collects all active jump-force bonuses:

1. **`st.jumpBoost`** (L306, default: 1) — modified by temporary powerups (e.g., Bounce Boots powerup).
2. **Wearable feet `jumpMult`** — permanent equipment bonus:
   - Clown Shoes (common): no jumpMult (speed only)
   - Spring Boots (uncommon): `jumpMult: 1.3` (+30%)
   - Rocket Boots (rare): `jumpMult: 1.5` (+50%)
   - Shadow Steps (rare): no jumpMult (speed + dmg)
   - Gravity Stompers (legendary): `jumpMult: 2.0` (+100%)

With Gravity Stompers equipped, peak height becomes `(10*2)^2 / (2*22) = 400/44 = 9.09 units`.

### 1.5 Landing System — Earthquake Stomp (`js/game3d.js` L4785-4811)

The `st.wasAirborne` / `st.onGround` transition drives the Earthquake Stomp shockwave (L4786-4811). The multi-jump system must preserve this transition detection: `wasAirborne` should track total flight state, not per-jump state.

### 1.6 Flight Mode (`js/game3d.js` L4482-4530)

The Wings powerup enables flight: Space=ascend, Shift=descend, with G-force maneuvers. Flight mode is handled in a separate branch (`if (st.flying)`) and is mutually exclusive with jump logic. Multi-jump should NOT activate during flight mode.

### 1.7 Camera System (`js/game3d.js` L6412-6419)

```javascript
// L6413-6419
const camTargetX = st.playerX;
const camTargetZ = st.playerZ + 14;
const camTargetY = st.playerY + 18;
camera.position.x += (camTargetX - camera.position.x) * 0.05;
camera.position.z += (camTargetZ - camera.position.z) * 0.05;
camera.position.y += (camTargetY - camera.position.y) * 0.05;
camera.lookAt(st.playerX, st.playerY, st.playerZ);
```

- Fixed offset: +18Y, +14Z from player position.
- Smooth interpolation with factor 0.05 (lerp per frame).
- Camera always looks at the player's exact position.
- Initial camera position set at L872: `camera.position.set(0, 18, 14)`.
- **No height-adaptive zoom** exists. At extreme heights, the camera tracks linearly, which would keep the same view distance regardless of altitude.

### 1.8 Charge Shrine System (`js/3d/constants.js` L645-681)

Charge shrines use a tiered upgrade system with 4 rarity tiers (common/uncommon/rare/legendary) weighted by `CHARGE_SHRINE_WEIGHTS` (50/28/16/6). Each tier offers 6 upgrades. On activation, 3 random upgrades from the shrine's tier are presented for player choice.

Current upgrade categories per tier: HP, speed, attack speed, damage, regen, pickup radius, armor, XP gain. No jump-related upgrades exist in any tier.

---

## 2. New System Design: Multi-Jump Aerial Progression

### 2.1 Core Mechanic: Air Jump Counter

**New state variables** (in `st` object):
```javascript
airJumpsMax: 0,        // Total allowed air jumps (from augments/items)
airJumpsUsed: 0,       // Air jumps consumed this flight
airJumpForceMult: 0.8, // Air jumps have 80% of ground jump force
apexHangTime: 0,       // Seconds of reduced gravity at apex (from items)
apexTimer: 0,          // Current apex hang-time countdown
gravityMult: 1,        // Gravity multiplier (for featherfall items)
```

**Modified jump logic** (replaces L4531-4543):
```javascript
// Ground jump (unchanged gate)
if (keys3d['Space'] && st.onGround) {
  let jumpMult = st.jumpBoost;
  if (st.wearables.feet) {
    const feetEff = WEARABLES_3D[st.wearables.feet].effect;
    if (feetEff.jumpMult) jumpMult *= feetEff.jumpMult;
  }
  st.playerVY = st.jumpForce * jumpMult;
  st.onGround = false;
  st.onPlatformY = null;
  st.airJumpsUsed = 0;  // Reset air jump counter on ground jump
  playSound('sfx_jump');
}
// Air jump (NEW — requires Space press, not hold)
else if (keys3d['Space'] && !st.onGround && !st.flying
         && st.airJumpsUsed < st.airJumpsMax && !st._spaceWasDown) {
  let jumpMult = st.jumpBoost * st.airJumpForceMult;
  if (st.wearables.feet) {
    const feetEff = WEARABLES_3D[st.wearables.feet].effect;
    if (feetEff.jumpMult) jumpMult *= feetEff.jumpMult;
  }
  st.playerVY = st.jumpForce * jumpMult;
  st.airJumpsUsed++;
  st.apexTimer = 0;  // Reset apex timer for new jump arc
  playSound('sfx_jump');
}
st._spaceWasDown = keys3d['Space'];  // Track press vs hold

// Gravity with apex hang-time and featherfall
let effectiveGravity = GRAVITY_3D * st.gravityMult;
// Apex hang-time: reduced gravity when near peak of jump arc
if (!st.onGround && st.apexHangTime > 0 && Math.abs(st.playerVY) < 2.0) {
  if (st.apexTimer < st.apexHangTime) {
    effectiveGravity *= 0.15;  // 85% gravity reduction at apex
    st.apexTimer += dt;
  }
}
st.playerVY -= effectiveGravity * dt;
st.playerY += st.playerVY * dt;
```

**Key design decisions:**
- Air jumps require a fresh Space press (`_spaceWasDown` edge detection) to prevent accidental rapid-fire when holding Space.
- Air jump force is 80% of ground jump force by default, creating a natural height-decay staircase.
- `airJumpsUsed` resets on ANY ground contact (ground collision or platform landing).
- Apex hang-time triggers when `|playerVY| < 2.0` (near the arc peak), with a configurable duration window.
- Featherfall gravity multiplier only affects downward acceleration, not upward velocity.

### 2.2 Charge Shrine Augments — Jump Upgrades

Add jump-related upgrades to `CHARGE_SHRINE_UPGRADES` at each rarity tier:

| Tier       | ID           | Name               | Effect                                      |
|------------|-------------|---------------------|----------------------------------------------|
| Common     | `jump1`      | Lighter feet!       | `airJumpsMax += 1`                           |
| Uncommon   | `jump1h`     | Boing higher!       | `airJumpsMax += 1, airJumpForceMult *= 1.10` |
| Rare       | `jump1h2`    | Aerial acrobat!     | `airJumpsMax += 1, airJumpForceMult *= 1.15` |
| Legendary  | `jump2hover` | Sky dancer!         | `airJumpsMax += 2, apexHangTime += 0.2`      |

These slot into the existing charge shrine choice pool. The player picks 1 of 3 random options per shrine, so jump upgrades compete with HP/damage/speed — creating meaningful build decisions.

**Stacking behavior:**
- `airJumpsMax` is additive: each shrine that grants +1 jump stacks.
- `airJumpForceMult` is multiplicative from its base of 0.8: two uncommon shrines would give `0.8 * 1.10 * 1.10 = 0.968`, approaching ground force.
- `apexHangTime` is additive: two legendary rolls give 0.4s of hang-time.

### 2.3 New Items (ITEMS_3D additions)

| ID               | Name               | Rarity    | Slot     | Description                        | Effect                                     |
|-----------------|---------------------|-----------|----------|-------------------------------------|---------------------------------------------|
| `featherfallCharm` | FEATHERFALL CHARM | uncommon  | charm2   | -40% Fall Speed                    | `gravityMult = 0.6` (while falling only)   |
| `cloudAnklet`     | CLOUD ANKLET       | rare      | anklet   | Brief hover at jump peak           | `apexHangTime += 0.3`                       |
| `gustFeather`     | GUST FEATHER       | rare      | feather  | +1 Air Jump                        | `airJumpsMax += 1`                           |
| `skyrunnerSash`   | SKYRUNNER SASH     | legendary | sash     | +2 Air Jumps, +20% Air Force       | `airJumpsMax += 2, airJumpForceMult *= 1.20` |

**Design notes:**
- Featherfall Charm: `gravityMult` should only apply when `playerVY < 0` (falling). Rising should use full gravity so jump height is not buffed unexpectedly.
- Cloud Anklet: stacks with shrine `apexHangTime` for extended hover builds.
- Gust Feather: simple and clear — one extra mid-air jump from an item source (not shrine-gated).
- Skyrunner Sash: the "aerial build capstone" — legendary rarity ensures it is rare but transformative.

### 2.4 Wearable Additions (WEARABLES_3D)

Existing feet-slot coverage is already complete (common through legendary). Rather than adding more feet wearables, enhance existing ones:

**Gravity Stompers (legendary, already exists) — add air jump synergy:**
```javascript
// Current:
effect: { speedMult: 1.15, jumpMult: 2.0, dmgMult: 1.15 }
// Proposed:
effect: { speedMult: 1.15, jumpMult: 2.0, dmgMult: 1.15, airJumps: 1 }
```

This gives Gravity Stompers a built-in +1 air jump, making them the natural wearable for aerial builds (alongside their existing 2x jump height). The `airJumps` effect adds to `airJumpsMax` when equipped and is removed when the wearable is replaced.

**Rocket Boots (rare, already exists) — add apex hang-time:**
```javascript
// Current:
effect: { speedMult: 1.25, jumpMult: 1.5 }
// Proposed:
effect: { speedMult: 1.25, jumpMult: 1.5, apexHang: 0.15 }
```

Rocket Boots get a subtle 0.15s hover at apex — enough to feel floaty but not as strong as Cloud Anklet (0.3s) or shrine stacking.

### 2.5 Gravity Modulation — Featherfall & Apex Hang-Time

**Featherfall (slow descent):**

Applied in the gravity calculation when `playerVY < 0`:
```javascript
let effectiveGravity = GRAVITY_3D;
// Featherfall: only reduces gravity while falling
if (st.playerVY < 0 && st.gravityMult < 1.0) {
  effectiveGravity *= st.gravityMult;
}
```

With `gravityMult = 0.6` (Featherfall Charm), fall speed approaches terminal at `v_term = sqrt(2 * g_eff * h)`. In practice, the player falls 40% slower, extending air time by ~67%.

**Apex hang-time:**

When `|playerVY| < 2.0`, gravity is reduced to 15% for the duration of `apexHangTime`. This creates a brief "floating" moment at the top of each jump arc. The apex timer resets on each new jump (ground or air), so each jump in a chain gets its own hang-time window.

**Visual feedback — air trail particles:**

During extended air time (any frame where `!st.onGround && (apexTimer > 0 || airJumpsUsed > 0)`), spawn faint white-blue trail particles behind the player:
```javascript
if (!st.onGround && st.airJumpsUsed > 0) {
  spawnFireParticle(
    0x88ccff,
    st.playerX + (Math.random() - 0.5) * 0.5,
    st.playerY - 0.5,
    st.playerZ + (Math.random() - 0.5) * 0.5,
    0.4  // short lifetime
  );
}
```

On each air jump, also spawn a burst of 8 particles in a ring beneath the player's feet (like a small wind puff).

### 2.6 Camera Height-Adaptive Zoom

**Problem:** The current camera uses a fixed offset (+18Y, +14Z). At high altitudes from chained jumps, the player sees the same amount of terrain as on the ground, wasting the strategic potential of aerial builds.

**Proposed formula:**

```javascript
// In camera update (L6412-6419)
const groundH = getGroundAt(st.playerX, st.playerZ);
const heightAboveGround = Math.max(0, st.playerY - groundH);

// Zoom-out starts at 5 units above ground, maxes at 25 units
const zoomFactor = 1 + Math.min(heightAboveGround / 25, 1.0) * 1.5;
// zoomFactor ranges from 1.0 (ground) to 2.5 (25+ units high)

const baseCamY = 18;
const baseCamZ = 14;
const camTargetX = st.playerX;
const camTargetZ = st.playerZ + baseCamZ * zoomFactor;
const camTargetY = st.playerY + baseCamY * zoomFactor;
```

**Behavior:**
- On the ground: `zoomFactor = 1.0`, camera at +18Y / +14Z (unchanged).
- At 12.5 units height: `zoomFactor = 1.75`, camera at +31.5Y / +24.5Z.
- At 25+ units height: `zoomFactor = 2.5`, camera at +45Y / +35Z (max zoom-out).
- Smooth return: The existing lerp factor (0.05) naturally smooths the zoom transition as the player descends.

**Height thresholds and jump math:**

With max aerial build (Gravity Stompers + 4 air jumps + apex hang-time):
- Ground jump: `v0 = 10 * 2.0 = 20`, peak at `y = 20^2 / (2*22) = 9.09`
- Air jump 1 (from peak): `v0 = 20 * 0.8 = 16`, adds `16^2 / 44 = 5.82` -> total ~14.9
- Air jump 2 (from peak): `v0 = 16 * 0.8 = 12.8`, adds `12.8^2 / 44 = 3.72` -> total ~18.6
- Air jump 3 (from peak): `v0 = 12.8 * 0.8 = 10.24`, adds `10.24^2 / 44 = 2.38` -> total ~21.0
- Air jump 4 (from peak): `v0 = 10.24 * 0.8 = 8.19`, adds `8.19^2 / 44 = 1.52` -> total ~22.5

This maxes out around 22-23 units, well within the camera zoom range. With Skyrunner Sash (+20% air force), the effective air multiplier becomes 0.96 instead of 0.8, pushing the ceiling to ~30+ units and full camera zoom-out.

**Note on `camera.lookAt`:** Currently targets `(playerX, playerY, playerZ)`. At extreme height, this might angle the camera too steeply downward. Consider blending the lookAt target toward ground level as height increases:
```javascript
const lookAtY = st.playerY * (1 - Math.min(heightAboveGround / 30, 0.6));
camera.lookAt(st.playerX, lookAtY, st.playerZ);
```
This subtly tilts the camera to show more ground beneath the player at high altitude.

### 2.7 Late-Game Aerial Build Fantasy

By level 20+ with the right shrine and item luck, a player could assemble:

**Full aerial build example:**
- Gravity Stompers (legendary feet): +100% jump height, +1 air jump built-in
- Skyrunner Sash (legendary item): +2 air jumps, +20% air force
- Cloud Anklet (rare item): +0.3s apex hang-time
- 2x rare charge shrine rolls: +2 air jumps, +30% air force total
- 1x legendary charge shrine roll: +2 air jumps, +0.2s apex hang-time

**Totals:** 7 air jumps, ~1.15x air force mult (from 0.8 base), 0.5s apex hang-time per jump.

This creates a "staircase into the sky" playstyle:
1. Ground jump launches high (2x force from Gravity Stompers).
2. At each jump's apex, the player hovers briefly (0.5s hang-time window).
3. Pressing Space at the apex chains into the next air jump, each one adding height.
4. Camera progressively zooms out, revealing the full battlefield.
5. Earthquake Stomp (if active) triggers a massive shockwave on landing.

The aerial build trades ground-level tanking and close-range efficiency for strategic overview and positioning. It naturally synergizes with ranged weapons (Bone Toss, Lightning Bolt, Fireball) and the Earthquake Stomp powerup.

---

## 3. Implementation Beads

Each bead is scoped for a single agent to implement independently.

### BD-245: Core Multi-Jump State + Air Jump Logic

**Scope:** Add air jump state variables and modify the jump execution block.

**Files:**
- `js/game3d.js` — Add `airJumpsMax`, `airJumpsUsed`, `airJumpForceMult`, `_spaceWasDown` to `st` object (near L306). Modify jump logic (L4531-4543) to add air-jump branch with edge detection. Reset `airJumpsUsed` on ground contact (L4554-4557, L4568-4571).

**Acceptance criteria:**
- `st.airJumpsMax = 0` by default (no behavior change without items/augments).
- When `airJumpsMax > 0`, pressing Space mid-air triggers an air jump with 80% force.
- Air jumps require fresh press (not hold).
- Air jump counter resets on any ground/platform contact.
- Jump sound plays on air jumps.
- Flight mode is unaffected.
- `wasAirborne` / Earthquake Stomp transition detection works correctly with multi-jump.

**Depends on:** Nothing (standalone).

---

### BD-246: Apex Hang-Time + Featherfall Gravity Modulation

**Scope:** Add gravity modulation systems for apex hover and slow-fall.

**Files:**
- `js/game3d.js` — Add `apexHangTime`, `apexTimer`, `gravityMult` to `st` object. Modify gravity application (L4545) to use effective gravity with apex detection and featherfall. Reset `apexTimer` on each new jump.

**Acceptance criteria:**
- `apexHangTime = 0` by default (no behavior change without items/augments).
- When `apexHangTime > 0`, gravity is reduced to 15% when `|playerVY| < 2.0` for up to `apexHangTime` seconds.
- `apexTimer` resets on each new jump (ground or air).
- `gravityMult` only affects falling (`playerVY < 0`), not rising.
- `gravityMult = 1` by default (no change without Featherfall Charm).

**Depends on:** BD-245 (needs air jump to exist for `apexTimer` reset on air jumps).

---

### BD-247: Charge Shrine Jump Upgrades

**Scope:** Add jump-related options to `CHARGE_SHRINE_UPGRADES`.

**Files:**
- `js/3d/constants.js` — Add 1 jump upgrade per rarity tier in `CHARGE_SHRINE_UPGRADES`:
  - Common: `jump1` — `airJumpsMax += 1`
  - Uncommon: `jump1h` — `airJumpsMax += 1`, `airJumpForceMult *= 1.10`
  - Rare: `jump1h2` — `airJumpsMax += 1`, `airJumpForceMult *= 1.15`
  - Legendary: `jump2hover` — `airJumpsMax += 2`, `apexHangTime += 0.2`

**Acceptance criteria:**
- Jump upgrades appear as choices in charge shrine menus alongside existing options.
- Each upgrade correctly modifies the relevant `st` variables.
- Upgrades stack when obtained multiple times.
- Floating text displays the upgrade name and color on selection.

**Depends on:** BD-245, BD-246 (state variables must exist).

---

### BD-248: New Items — Featherfall Charm, Cloud Anklet, Gust Feather, Skyrunner Sash

**Scope:** Add 4 new items to `ITEMS_3D` with pickup logic.

**Files:**
- `js/3d/constants.js` — Add 4 items to `ITEMS_3D` array with appropriate rarity/slot/desc.
- `js/game3d.js` — Add pickup handling in the item equip logic to apply:
  - Featherfall Charm: set `st.gravityMult = 0.6`
  - Cloud Anklet: `st.apexHangTime += 0.3`
  - Gust Feather: `st.airJumpsMax += 1`
  - Skyrunner Sash: `st.airJumpsMax += 2`, `st.airJumpForceMult *= 1.20`

**Acceptance criteria:**
- Items appear in crate drops at their designated rarity.
- Item effects correctly modify state on pickup.
- Items display in the HUD item panel.
- Gust Feather and Skyrunner Sash stack correctly with shrine air jump upgrades.

**Depends on:** BD-245, BD-246 (state variables must exist).

---

### BD-249: Wearable Aerial Synergy — Gravity Stompers & Rocket Boots Enhancement

**Scope:** Add air-jump and apex hang-time effects to existing wearables.

**Files:**
- `js/3d/constants.js` — Update `gravityStompers` effect to include `airJumps: 1`. Update `rocketBoots` effect to include `apexHang: 0.15`.
- `js/game3d.js` — In wearable equip/unequip logic, handle `airJumps` effect (add/remove from `st.airJumpsMax`) and `apexHang` effect (add/remove from `st.apexHangTime`).

**Acceptance criteria:**
- Gravity Stompers grant +1 air jump when equipped, removed when unequipped/replaced.
- Rocket Boots grant +0.15s apex hang-time when equipped, removed when unequipped/replaced.
- Wearable compare screen shows the new effects.
- Replacing a wearable correctly removes the old effect before applying the new one.

**Depends on:** BD-245, BD-246 (state variables must exist).

---

### BD-250: Camera Height-Adaptive Zoom

**Scope:** Modify camera follow logic to zoom out at height.

**Files:**
- `js/game3d.js` — Modify camera update block (L6412-6419) to calculate `zoomFactor` from height above ground. Apply zoom to camera offset. Optionally blend `lookAt` target toward ground at altitude.

**Formula:**
```javascript
const heightAboveGround = Math.max(0, st.playerY - getGroundAt(st.playerX, st.playerZ));
const zoomFactor = 1 + Math.min(heightAboveGround / 25, 1.0) * 1.5;
```

**Acceptance criteria:**
- Camera maintains current behavior on the ground (`zoomFactor = 1.0`).
- Camera smoothly zooms out as height increases.
- Camera smoothly returns to normal when descending.
- Maximum zoom-out at 25+ units height shows a large terrain area.
- No jitter or snapping — smooth lerp transition preserved.
- Works correctly with existing flight mode (Wings powerup).

**Depends on:** Nothing (standalone, benefits from BD-245 for testing but works independently).

---

### BD-251: Air Trail Visual Particles

**Scope:** Add visual feedback for air jumps and extended air time.

**Files:**
- `js/game3d.js` — In the particle/visual update section: spawn white-blue trail particles when airborne with `airJumpsUsed > 0`. Spawn a burst ring of 8 particles on each air jump. Spawn subtle apex glow particles during hang-time.

**Acceptance criteria:**
- No particles spawn during normal single jumps (backward compatible).
- Trail particles appear after the first air jump and continue until landing.
- Air jump burst ring is visible and distinct from the trail.
- Apex hang-time has a subtle glow effect.
- Particle count is reasonable (performance: max ~20 active air-trail particles).
- Uses existing `spawnFireParticle()` infrastructure (no new systems needed).

**Depends on:** BD-245 (needs `airJumpsUsed` state).

---

### BD-252: HUD Air Jump Indicator

**Scope:** Display remaining air jumps in the HUD.

**Files:**
- `js/3d/hud.js` — Add an air-jump pip indicator near the existing charge bar or HP bar. Show `airJumpsMax` pips, filled/empty based on `airJumpsMax - airJumpsUsed`. Only visible when `airJumpsMax > 0`.

**Acceptance criteria:**
- No HUD change when `airJumpsMax = 0` (default).
- Pips appear as small circles/diamonds near the health bar.
- Filled pips = available jumps, empty pips = used jumps.
- Pips update in real-time as air jumps are consumed and reset.
- Color scheme: bright cyan filled, dark gray empty.
- Scales correctly at different screen resolutions.

**Depends on:** BD-245 (needs air jump state), but can be developed in parallel by reading state shape from the plan.

---

## 4. Dependency Graph

```
BD-245 (core air jump logic)        BD-250 (camera zoom) [standalone]
  |
  +-- BD-246 (apex hang-time + featherfall)
  |     |
  |     +-- BD-247 (charge shrine jump upgrades)
  |     +-- BD-248 (new items)
  |     +-- BD-249 (wearable enhancements)
  |
  +-- BD-251 (air trail particles)
  +-- BD-252 (HUD air jump indicator)
```

**Parallel execution plan:**
- **Batch 1:** BD-245 + BD-250 (independent)
- **Batch 2:** BD-246 + BD-251 + BD-252 (all depend on BD-245 only)
- **Batch 3:** BD-247 + BD-248 + BD-249 (depend on BD-245 + BD-246)

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Air jump spam makes player unkillable | 80% force decay per chain naturally limits effective height/duration. Ranged enemies (future) counter aerial positioning. |
| Camera zoom-out makes ground gameplay feel worse | Zoom only activates above 5 units height. Lerp smoothing prevents jarring transitions. |
| Earthquake Stomp becomes overpowered with height | Stomp damage is already fixed at 1.5x attack damage. Consider capping stomp range or requiring minimum fall distance. |
| Performance from trail particles | Cap active trail particles at 20. Short lifetime (0.4s) ensures fast cleanup. |
| Jump upgrades dilute charge shrine pool | One jump option per tier (out of 7) is ~14% chance per slot. Player is unlikely to be overwhelmed with jump upgrades by accident. |
| Existing `jumpBoost` powerup + air jumps | Temporary `jumpBoost` multiplier applies to all jumps including air jumps. This is intentional — stacking temporary power with permanent progression feels good. |
