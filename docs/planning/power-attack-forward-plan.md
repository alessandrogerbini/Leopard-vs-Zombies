# BD-242: Unique Power Attacks Per Animal Character

## Status: FORWARD PLAN (Research & Design Complete)

---

## 1. Current Implementation Summary

### How the power attack works today

**Charge input** (lines 5661-5686 in `game3d.js`):
- Player holds Enter/NumpadEnter/B while not in a menu
- `st.charging` flips to `true`, `st.chargeTime` increments by `dt` each frame, capped at 2 seconds
- A yellow charge glow mesh (`BoxGeometry(1,1,1)`, color `0xffcc00`) grows from scale 1 to 4 around the player
- Glow opacity ramps from 0.15 to 0.55 over the 2-second charge window

**Release/fire** (lines 5687-5720):
- On key release, `st.powerAttackReady` is set; next frame processes the attack
- `chargeMult = 1 + st.chargeTime` (ranges 1x at instant release to 3x at full charge)
- `range = st.attackRange * (1 + st.chargeTime * 0.5)` (base 3, scales to 3-4.5 units)
- Cowboy Boots item adds another 1.2x to range
- `dmg = st.attackDamage * getPlayerDmgMult() * chargeMult`
- Hits ALL enemies within range (circular AoE, distance-squared check)
- Creates yellow attack lines to each hit enemy
- Flash effect: charge glow opacity spikes to 0.8, scale expands to `range * 2`
- Triggers lunge animation (0.25s duration, longer than normal 0.15s)
- Plays `sfx_power_attack_release` sound

**HUD charge bar** (lines 811-897 in `hud.js`):
- 5-segment horizontal bar, centered at bottom of screen (y = H - 80)
- Segments fill left-to-right with color gradient: yellow -> orange -> red
- At >80% charge, outer glow pulses
- Label above bar: "CHARGING..." while charging, "READY!" flashing when full
- Percentage readout below bar

### Key damage formula

```
baseDamage = 15 * animalData.damage
getPlayerDmgMult() = (1 + (level-1) * 0.12) * dmgBoost * augmentDmgMult * bandanaStacks * goldenBone * wearableHead
finalPowerDmg = baseDamage * getPlayerDmgMult() * (1 + chargeTime)
```

### Animal stat profiles (from `js/state.js`)

| Animal    | Speed | Damage | HP | Starting Weapon | Description      |
|-----------|-------|--------|----|-----------------|------------------|
| Leopard   | 1.0   | 1.0    | 50 | Claw Swipe      | Balanced fighter |
| Red Panda | 1.2   | 0.8    | 40 | Boomerang       | Fast & agile     |
| Lion      | 0.85  | 1.3    | 60 | Lightning Bolt  | Strong & tough   |
| Gator     | 0.75  | 1.5    | 75 | Poison Cloud    | Slow but deadly  |

### Available access in game loop

- `animalId` is set at game init (line 237) and available throughout the `launch3DGame` closure
- `animalData` provides full stat block
- `palette` (from `ANIMAL_PALETTES`) provides per-animal colors for visual theming
- Existing patterns for effects: `spawnExplosion()`, `st.weaponEffects[]`, `st.weaponProjectiles[]`, `THREE.RingGeometry` shockwaves, attack lines

---

## 2. Design Philosophy

Each power attack should:
- **Feel distinct** — different shape, color, animation, and gameplay role
- **Match the animal's personality** — fast animals get mobile attacks, tanky animals get devastating ones
- **Keep the same input** — hold B/Enter to charge 0-2s, release to fire (charge bar stays identical)
- **Scale with the same formula** — `baseDamage * getPlayerDmgMult() * chargeMult` remains the core, with per-animal multiplier adjustments
- **Use existing Three.js primitives** — BoxGeometry, RingGeometry, SphereGeometry, LineBasicMaterial; no external models or textures needed
- **Maintain balance** — total DPS output should be roughly equivalent across animals at the same charge level; differences are in shape, utility, and feel

---

## 3. The Four Unique Power Attacks

---

### LEOPARD — POUNCE

> *"A blur of golden fury — blink and you'll miss it."*

**Visual Description:**
- On release, the leopard dashes forward 6-10 units (based on charge) in the direction the player is facing/moving
- **Afterimage trail**: 3-5 semi-transparent golden box copies of the player model left behind along the dash path, each progressively more transparent (opacity 0.4 -> 0.1), fading over 0.4s
- **Impact flash**: At the dash endpoint, a golden-amber burst (flat BoxGeometry, color `0xe8a828`, expanding from 1 to 3 units over 0.2s, opacity 0.6 -> 0)
- **Charge glow**: Replace yellow (`0xffcc00`) with leopard gold (`0xe8a828`) during charging
- The player model physically teleports to the dash endpoint (position update)

**Mechanical Behavior:**
- **Damage pattern**: Piercing line + endpoint AoE. All enemies along the dash path (within 1.5 units of the line) take 80% damage. All enemies within 2.5 units of the endpoint take 100% damage. Enemies can be hit by both (no double-dip — mark hit enemies).
- **AoE shape**: Narrow rectangle (dash corridor, ~3 units wide) + circle at endpoint
- **Special effect**: Enemies hit along the path are knocked sideways (perpendicular push of 2 units). Endpoint enemies are knocked back 3 units from impact point.
- **Dash distance**: `4 + chargeTime * 3` units (4 at instant, 10 at full charge)
- **Damage formula**: `baseDamage * getPlayerDmgMult() * chargeMult * 0.9` (slightly less raw damage to compensate for repositioning utility)
- **Safety**: Player gains 0.3s invincibility during the dash (prevents dashing into damage)

**Level Scaling:**
| Level | Improvement |
|-------|-------------|
| 5     | +2 afterimages (5 -> 7), each afterimage deals 15% of dash damage to nearby enemies |
| 10    | Dash distance +30% (becomes `5.2 + chargeTime * 3.9`). Corridor width increases to 2 units. |
| 15    | **Double Pounce** — if an enemy dies from the endpoint hit, instantly dash again to the nearest enemy within 8 units (half damage, no charge cost) |
| 20    | Afterimages persist for 1.5s and pulse damage (5% of original hit per 0.3s) to nearby enemies. Golden lightning arcs between afterimages. |

**Item/Howl Synergies:**
1. **Soccer Cleats** (+15% move speed): POUNCE dash distance +30%. The speed boost translates directly into pounce range — fast feet, long leap.
2. **Power Howl** (+15% damage per level): Stacks multiplicatively with pounce damage as usual, but also adds a visible red tint to the afterimage trail at Power Howl level 3+.
3. **Crit Gloves** (15% chance 2x damage): Each enemy along the dash path rolls crit independently. Critical hits on endpoint enemies spawn a small secondary golden burst (1.5 unit radius, 30% damage).

---

### RED PANDA — TAIL SPIN

> *"Round and round and round — everything gets bonked!"*

**Visual Description:**
- On release, the red panda spins in place for 0.5-1.2s (based on charge), hitting enemies in a growing ring around them
- **Spin rings**: 3-6 concentric rings of small reddish-orange box particles (`0xcc4422`) radiate outward from the player at staggered intervals (one ring every 0.15s), each ring expanding outward at 8 units/s
- **Each ring**: 8-12 small boxes (0.3x0.3x0.3) arranged in a circle, spinning as they expand, fading from opacity 0.7 to 0 over their 0.6s lifetime
- **Center vortex**: A flat spinning square at the player's feet (color `0xdd6644`, 2x2 units) that rotates at 720deg/s during the spin, with opacity pulsing
- **Charge glow**: Rusty red (`0xcc4422`) during charging, with visible rotation even while charging

**Mechanical Behavior:**
- **Damage pattern**: Multi-hit waves. Each ring deals damage independently as it passes through enemies. An enemy can be hit by multiple rings, but each successive ring deals 60% of the previous one's damage (diminishing returns prevent infinite stacking from being overpowered).
- **AoE shape**: Expanding concentric circles. First ring spawns at radius 1, expands to 6. Each subsequent ring starts 0.15s later.
- **Number of rings**: `2 + floor(chargeTime * 2)` (2 at instant, 6 at full charge)
- **Ring damage**: `baseDamage * getPlayerDmgMult() * chargeMult * 0.5` per ring (lower per-hit, but multi-hit potential is high)
- **Special effect**: Enemies hit by 3+ rings are briefly dazed (speed reduced to 50% for 1.5s). Visual: small spinning stars above their head (3 tiny yellow boxes orbiting).
- **Player animation**: Model spins rapidly (set rotation.y += 15 * dt during spin duration)

**Level Scaling:**
| Level | Improvement |
|-------|-------------|
| 5     | +1 ring at all charge levels. Ring expansion speed +20% (hits farther enemies faster). |
| 10    | Diminishing returns softened from 60% to 70% per successive ring. Daze threshold drops from 3 rings to 2. |
| 15    | **Bounce Back** — rings that reach max radius bounce back inward toward the player, dealing 40% damage on the return trip. |
| 20    | Rings leave a brief sparkle trail on the ground (flat boxes, `0xff6644`, 0.8s lifetime) that deals 3% of original damage per 0.2s to enemies standing on it. Center vortex pulls nearby XP gems during spin. |

**Item/Howl Synergies:**
1. **Haste Howl** (-15% cooldowns per level): Reduces the interval between ring spawns by 10% per Haste level (rings come out faster, more overlap in a tighter area — rewards close-range play).
2. **Rubber Ducky** (+10% move speed per stack): Each stack adds +5% to ring expansion speed. More ducks = wider spin coverage. At 3+ ducks, rings leave a faint yellow trail.
3. **Thorns Howl** (reflect damage): During TAIL SPIN, reflected damage is doubled. The spin's centrifugal energy amplifies the thorns effect — enemies that touch the spinning panda during the attack take 20% reflected contact damage per Thorns level (instead of 10%).

---

### LION — ROAR

> *"The ground trembles. The dead stop walking. The king speaks."*

**Visual Description:**
- On release, the lion plants its feet and a massive shockwave cone erupts forward
- **Shockwave cone**: A fan-shaped series of 5-8 flat boxes (`0xdda030` gold, fading to `0xff4400` orange at edges) arranged in a 120-degree arc in front of the player, expanding outward over 0.3s
- **Ground crack**: 3-5 dark jagged lines (thin box geometries, `0x443322`, 0.1 unit height) radiate outward from the player in the cone direction, persisting for 1.5s before fading
- **Dust cloud**: 10-15 small tan boxes (`0xccaa66`) with randomized Y velocities (0.5-2 units/s upward) spawn along the shockwave edge, simulating debris kicked up by the force
- **Screen effect**: Brief camera shake (0.15s, amplitude 0.3 units) — implemented via camera position offset, not actual shake state (keeps it local to the power attack)
- **Charge glow**: Tawny gold (`0xdda030`) during charging, pulsing with a low-frequency throb

**Mechanical Behavior:**
- **Damage pattern**: Front-loaded cone AoE. Enemies in the inner third of the cone take 120% damage. Middle third takes 100%. Outer third takes 70%. This rewards aiming.
- **AoE shape**: 120-degree cone, range `3 + chargeTime * 3` units (3-9 range)
- **Damage formula**: `baseDamage * getPlayerDmgMult() * chargeMult * 1.1` (highest raw single-hit damage of all four attacks)
- **Special effect — STUN**: All enemies hit are stunned for `0.5 + chargeTime * 0.5` seconds (0.5s at instant, 1.5s at full charge). Stunned enemies freeze completely (speed = 0, attack timer paused). Visual: enemies flash white (material emissive pulse) every 0.3s while stunned.
- **Special effect — FEAR**: Enemies hit at full charge (chargeTime >= 1.8) are feared for 2s after the stun ends — they run directly away from the lion at 1.5x their normal speed. Visual: small red exclamation mark box above their head.
- **Direction**: Cone faces the direction the lion was last moving. If stationary, faces toward the nearest enemy.

**Level Scaling:**
| Level | Improvement |
|-------|-------------|
| 5     | Cone widens from 120 to 150 degrees. Stun duration +0.3s at all charge levels. |
| 10    | **Aftershock** — 0.8s after the initial roar, a second weaker shockwave (50% damage, same cone) pulses out. Enemies already stunned have their stun refreshed. |
| 15    | Fear threshold drops from 1.8s to 1.2s charge time. Feared enemies that collide with other enemies transfer fear (chain fear, max 2 bounces). |
| 20    | **King's Authority** — enemies killed by ROAR explode, dealing 25% of the roar's damage to nearby enemies within 3 units (can chain). Ground cracks persist for 3s and slow enemies walking over them by 40%. |

**Item/Howl Synergies:**
1. **Thorned Vest** (reflect 20% damage): ROAR's stun causes stunned enemies to take 10% of their own max HP as reflected damage over the stun duration. The intimidation is so powerful it damages them from the inside.
2. **Range Howl** (+20% range per level): Directly extends ROAR cone range. At Range Howl level 3+, the cone gains a visible golden edge highlight and the ground cracks extend to full range.
3. **Golden Bone** (+30% all weapon damage): In addition to the normal damage bonus, ROAR gains a visible golden particle burst at the cone's center. Full-charge ROAR with Golden Bone has a 20% chance to instantly kill non-boss enemies below 15% HP (execution threshold).

---

### GATOR — DEATH ROLL

> *"The earth cracks. Everything nearby goes flat."*

**Visual Description:**
- On release, the gator leaps slightly (0.5 units up) and slams down, creating a massive radial ground pound
- **Slam impact**: A large flat box at the player's position (`0x44aa44` green, size = range * 2, height 0.3) that flashes on impact (opacity 1.0 -> 0 over 0.4s)
- **Ripple rings**: 3 concentric ring geometries (`THREE.RingGeometry`) in dark green (`0x338833`), expanding outward at staggered 0.1s intervals, each ring 0.3 units thick, expanding from radius 1 to full range over 0.5s
- **Debris chunks**: 8-12 small green-brown boxes (`0x446633`, size 0.3-0.6 random) launch upward with random velocities (2-5 units/s up, 1-3 units/s outward), falling back down with gravity over 0.8s
- **Crack pattern**: A cross-shaped set of dark lines (`0x223311`) radiating from impact point in 4 cardinal directions (extending to 70% of range), persisting for 2s
- **Charge glow**: Deep green (`0x44aa44`) during charging, with the ground beneath the player darkening slightly (shadow box)

**Mechanical Behavior:**
- **Damage pattern**: Radial AoE with distance falloff. Full damage at center (within 30% of radius), 70% damage at mid-range (30-70% of radius), 40% damage at edge (70-100% of radius).
- **AoE shape**: Full 360-degree circle. Largest radius of all four attacks.
- **Range**: `4 + chargeTime * 4` units (4-12 range — enormous at full charge)
- **Damage formula**: `baseDamage * getPlayerDmgMult() * chargeMult * 1.0` (standard multiplier, but the massive range compensates)
- **Special effect — SLOW**: All enemies hit are slowed to 40% speed for `1 + chargeTime * 1` seconds (1-3s). Visual: enemies gain a dark green tint (multiply material color by 0.6).
- **Special effect — GROUND RUPTURE**: A lingering damage zone persists at the impact point for 2s. Enemies in the zone take 5% of the original hit damage per 0.5s (ticking DoT). Visual: the flat impact box doesn't fully fade — it stays at opacity 0.15 with a slow green pulse.
- **Animation**: Player model does a brief up-down slam (translate Y: 0 -> 0.5 -> 0 over 0.2s). Lunge animation extended to 0.35s (longest of all four).

**Level Scaling:**
| Level | Improvement |
|-------|-------------|
| 5     | Slow duration +0.5s at all charge levels. Ground rupture ticking damage increased from 5% to 8% per tick. |
| 10    | Distance falloff softened: full damage extends to 40% of radius (from 30%), edge damage increased to 50% (from 40%). Debris chunks deal minor damage (10% of base) to enemies they land on. |
| 15    | **Tremor** — enemies slowed by DEATH ROLL that are then hit by any weapon take 15% bonus damage for the slow duration (marked as "vulnerable"). Visual: cracked green overlay on vulnerable enemies. |
| 20    | Ground rupture duration extended to 4s. Rupture zone now also slows enemies entering it (even after the initial slow wears off). At full charge, the slam creates a permanent terrain scar (cosmetic only — a dark patch on the ground that lasts until the player leaves the chunk). |

**Item/Howl Synergies:**
1. **Earthquake Stomp** (powerup): While Earthquake Stomp is active, DEATH ROLL's radius is +50% and the slam creates 2 additional smaller aftershock slams (50% radius, 30% damage) at random positions within the original radius, 0.3s apart.
2. **Guardian Howl** (+8% max HP, +1 HP/s regen per level): DEATH ROLL heals the gator for 2% of damage dealt per Guardian Howl level. The massive AoE + high hit count makes this a significant sustain tool for the tankiest character. Visual: green healing particles rise from enemies hit.
3. **Magnet Howl** (+25% pickup radius per level): DEATH ROLL's ground rupture zone acts as an XP magnet — gems within the zone are pulled toward the center at 3 units/s per Magnet Howl level. Turns the gator's slam zone into a vacuum cleaner for loot.

---

## 4. Charge Bar Label Design

The charge bar already displays "CHARGING..." during charge and "READY!" at full charge. The update is minimal but flavorful:

**During charging**, the label becomes the attack name:
- Leopard: `"POUNCE..."` (color: `#e8a828` gold)
- Red Panda: `"TAIL SPIN..."` (color: `#cc4422` rusty red)
- Lion: `"ROAR..."` (color: `#dda030` tawny gold)
- Gator: `"DEATH ROLL..."` (color: `#44aa44` deep green)

**At full charge**, the label becomes:
- Leopard: `"POUNCE!"` (flashing gold)
- Red Panda: `"TAIL SPIN!"` (flashing red)
- Lion: `"ROAR!"` (flashing gold with slight size pulse, larger than others — fits the lion's dramatic personality)
- Gator: `"DEATH ROLL!"` (flashing green, with slower, heavier pulse rhythm)

**Segment fill colors** also change per animal (replacing the generic yellow -> orange -> red):
- Leopard: gold (`#e8a828`) -> amber (`#d09020`) -> dark amber (`#a06810`)
- Red Panda: coral (`#dd6644`) -> rust (`#cc4422`) -> dark red (`#882200`)
- Lion: bright gold (`#eebb44`) -> tawny (`#cc8820`) -> burnished (`#aa6610`)
- Gator: light green (`#55cc55`) -> green (`#338833`) -> dark green (`#226622`)

These colors come directly from the existing `ANIMAL_PALETTES` in constants.js — no new color definitions needed.

**Implementation**: Pass `animalId` (or the full animal palette) to `drawHUD()`. The HUD already receives the full state object `s`; add `s.animalId` to the state init block (line ~237 of game3d.js). In hud.js, look up colors from ANIMAL_PALETTES using the ID.

---

## 5. Balance Comparison Matrix

| Metric              | Leopard POUNCE     | Red Panda TAIL SPIN | Lion ROAR           | Gator DEATH ROLL    |
|---------------------|--------------------|---------------------|---------------------|---------------------|
| Raw damage mult     | 0.9x               | 0.5x per ring       | 1.1x                | 1.0x                |
| Max effective hits  | ~8-12 (path + end) | ~3-6 per enemy      | All in cone         | All in circle       |
| Max effective DPS   | Medium-high         | Very high (multi)   | High (single hit)   | Medium (+ DoT)      |
| Range (full charge) | 10 units (dash)     | ~6 units (ring exp) | 9 units (cone)      | 12 units (circle)   |
| AoE shape           | Line + endpoint     | Expanding rings     | 120-degree cone     | Full 360-degree     |
| Crowd control       | Knockback           | Daze (3+ rings)     | Stun + Fear         | Slow + Rupture DoT  |
| Mobility            | Dash (reposition)   | None (roots in spin)| None (plants feet)  | None (slam in place)|
| Unique utility      | Repositioning       | Multi-hit stacking  | Hard CC (stun/fear) | Zone control + DoT  |
| Charge bar color    | Gold gradient        | Red gradient         | Gold gradient        | Green gradient       |
| Identity match      | Fast, precise       | Bouncy, playful     | Powerful, dramatic   | Heavy, devastating   |

---

## 6. Implementation Beads

### BD-243: Shared Power Attack Infrastructure

**Scope**: Refactor the power attack code to support per-animal dispatch without changing current behavior.

**Tasks**:
1. Add `POWER_ATTACKS` constant to `js/3d/constants.js` with per-animal config:
   - `name`, `chargeLabel`, `readyLabel`, `chargeColors` (3-color gradient from palette)
   - `glowColor` (from ANIMAL_PALETTES)
   - `baseDmgMult`, `baseRange`, `rangeMult`
2. Add `st.animalId` to the 3D state initialization block (line ~260 in game3d.js)
3. Refactor the power attack block (lines 5661-5740) into a `firePowerAttack(animalId)` function that reads from `POWER_ATTACKS[animalId]` for config, but still performs the current generic AoE as fallback
4. Pass `animalId` through to `drawHUD()` (add to the state object or as a separate param)
5. Update charge bar rendering in `hud.js` to read per-animal colors and labels from `POWER_ATTACKS`
6. Add `sfx_power_attack_charge` sound hook (currently only release has a sound)

**Acceptance**: All 4 animals still work identically but charge bar shows per-animal names and colors. No gameplay change. No regressions.

**Estimated effort**: Small (1-2 hours). No new visual effects.

---

### BD-244: Leopard POUNCE Implementation

**Scope**: Replace the generic AoE with the POUNCE dash attack for leopard.

**Tasks**:
1. Implement dash logic: calculate endpoint from player facing direction + dash distance
2. Implement piercing corridor damage (enemies within 1.5 units of dash line)
3. Implement endpoint AoE (2.5 unit radius)
4. Create afterimage trail (3-5 semi-transparent box copies along path, fading over 0.4s)
5. Create golden impact burst at endpoint (expanding flat box)
6. Apply knockback to hit enemies (perpendicular for corridor, radial for endpoint)
7. Add 0.3s invincibility during dash
8. Teleport player to endpoint position with terrain height recalculation
9. Handle edge cases: dash into map boundary (clamp to MAP_HALF), dash off plateau
10. Add level 5/10/15/20 scaling checks (gated by `st.level`)

**Dependencies**: BD-243 (shared infrastructure)

**Estimated effort**: Medium (2-3 hours). Primary complexity is the dash movement + collision corridor.

---

### BD-245: Red Panda TAIL SPIN Implementation

**Scope**: Replace the generic AoE with the TAIL SPIN multi-ring attack for red panda.

**Tasks**:
1. Implement ring spawning system (staggered spawn, `2 + floor(chargeTime * 2)` rings)
2. Create ring visuals (8-12 small box particles per ring, arranged in circle, spinning as they expand)
3. Implement per-ring damage with diminishing returns (60% multiplier per successive hit)
4. Create center vortex visual (spinning flat square at player feet)
5. Implement daze effect on enemies hit by 3+ rings (speed reduction + star visual)
6. Implement player spin animation (rotation.y rapid increment during spin duration)
7. Track per-enemy ring hit counts for daze threshold
8. Add level 5/10/15/20 scaling checks
9. Manage ring particle cleanup (add to `st.weaponEffects[]` with proper disposal)

**Dependencies**: BD-243 (shared infrastructure)

**Estimated effort**: Medium-high (3-4 hours). Primary complexity is ring particle management and per-enemy hit tracking.

---

### BD-246: Lion ROAR Implementation

**Scope**: Replace the generic AoE with the ROAR cone + stun attack for lion.

**Tasks**:
1. Implement cone direction detection (last movement direction, fallback to nearest enemy)
2. Implement cone AoE check (120-degree arc, three damage tiers by distance within cone)
3. Create shockwave cone visual (fan of flat boxes expanding outward)
4. Create ground crack visuals (thin box geometries radiating from player)
5. Create dust cloud particles (small tan boxes with upward velocity + gravity)
6. Implement camera shake on release (brief position offset, 0.15s)
7. Implement stun effect (enemy speed = 0, attack timer pause, white flash visual)
8. Implement fear effect at high charge (enemy flee behavior, exclamation mark visual)
9. Add stun/fear timers to enemy objects, integrate with enemy update loop
10. Add level 5/10/15/20 scaling checks

**Dependencies**: BD-243 (shared infrastructure)

**Estimated effort**: High (4-5 hours). Primary complexity is the cone geometry math, stun/fear state management on enemies, and the aftershock timing at level 10.

---

### BD-247: Gator DEATH ROLL Implementation

**Scope**: Replace the generic AoE with the DEATH ROLL ground pound attack for gator.

**Tasks**:
1. Implement radial AoE with distance-based falloff (3 tiers: full/70%/40%)
2. Create slam impact visual (large flat green box, flash + fade)
3. Create ripple rings (3 staggered RingGeometry rings expanding outward)
4. Create debris chunk particles (small boxes launching upward with gravity)
5. Create crack pattern visuals (cross-shaped dark lines from impact)
6. Implement slow effect on hit enemies (40% speed, green tint on material)
7. Implement ground rupture zone (lingering damage area, ticking DoT every 0.5s)
8. Implement player slam animation (Y position: up 0.5 then down, 0.2s)
9. Manage rupture zone lifecycle in `st.weaponEffects[]`
10. Add level 5/10/15/20 scaling checks

**Dependencies**: BD-243 (shared infrastructure)

**Estimated effort**: Medium-high (3-4 hours). Primary complexity is the rupture zone DoT tracking and debris physics.

---

### BD-248: Synergy Integration + Polish

**Scope**: Wire up all item/howl synergies specified in the designs and final polish pass.

**Tasks**:
1. Implement Soccer Cleats + POUNCE range bonus
2. Implement Crit Gloves + POUNCE per-enemy crit rolls
3. Implement Haste Howl + TAIL SPIN ring interval reduction
4. Implement Rubber Ducky + TAIL SPIN ring speed bonus
5. Implement Thorns Howl + TAIL SPIN reflected damage doubling
6. Implement Thorned Vest + ROAR stun HP drain
7. Implement Range Howl + ROAR cone range extension
8. Implement Golden Bone + ROAR execution threshold
9. Implement Earthquake Stomp + DEATH ROLL radius bonus
10. Implement Guardian Howl + DEATH ROLL lifesteal
11. Implement Magnet Howl + DEATH ROLL rupture gem magnet
12. Balance testing pass: verify DPS parity across all 4 animals at levels 1, 5, 10, 15, 20
13. Sound effect audit: ensure each attack has a distinct release sound

**Dependencies**: BD-244, BD-245, BD-246, BD-247 (all four attacks implemented)

**Estimated effort**: Medium (3-4 hours). Many small integrations, plus balance tuning.

---

## 7. Dependency Graph

```
BD-243 (Shared Infrastructure)
  |
  +--- BD-244 (Leopard POUNCE)  ---|
  +--- BD-245 (Red Panda SPIN)  ---|--- BD-248 (Synergies + Polish)
  +--- BD-246 (Lion ROAR)       ---|
  +--- BD-247 (Gator DEATH ROLL)---|
```

BD-244 through BD-247 are **fully parallelizable** — they touch different branches of the same `if/else` dispatch in `firePowerAttack()` and have no shared mutable state during implementation. This is ideal for worktree-based parallel agents.

BD-248 must wait for all four to merge, as synergies reference mechanics from each.

---

## 8. Risk Notes

1. **Dash collision (POUNCE)**: Teleporting the player requires terrain height recalculation and boundary clamping. Must handle plateau edges gracefully (snap to ground if dashing off a plateau).
2. **Particle count (TAIL SPIN)**: 6 rings x 12 particles = 72 boxes. Must dispose promptly. Consider object pooling if frame drops occur.
3. **Enemy state (ROAR)**: Stun and fear add new state fields to enemy objects. Must ensure these don't break enemy cleanup, merge logic, or boss behavior (bosses should be stun-immune or stun-resistant).
4. **Rupture zones (DEATH ROLL)**: Lingering damage zones must be tracked and cleaned up on game over/restart. Use `st.weaponEffects[]` pattern for consistency.
5. **Boss interactions**: All CC effects (knockback, daze, stun, fear, slow) should be reduced by 75% duration on bosses. Bosses should never be feared (immune). This needs to be in BD-243's shared infrastructure.

---

## 9. Files Modified Per Bead

| Bead   | `constants.js` | `game3d.js` | `hud.js` | `audio.js` |
|--------|:-:|:-:|:-:|:-:|
| BD-243 | Add `POWER_ATTACKS` | Refactor power attack block, add `st.animalId` | Update charge bar labels/colors | Optional: charge sound |
| BD-244 | -- | Add leopard pounce in `firePowerAttack()` | -- | -- |
| BD-245 | -- | Add red panda spin in `firePowerAttack()` | -- | -- |
| BD-246 | -- | Add lion roar in `firePowerAttack()` | -- | -- |
| BD-247 | -- | Add gator death roll in `firePowerAttack()` | -- | -- |
| BD-248 | -- | Add synergy checks in each attack branch | -- | Optional: per-animal sounds |

Total estimated effort: 16-22 hours of implementation across all beads. With parallelization of BD-244 through BD-247, critical path is ~8-10 hours.
