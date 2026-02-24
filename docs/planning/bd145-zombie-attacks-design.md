# BD-145: Tiered Zombie Special Attacks (Tiers 2-6)

**Status:** Design Spec (Research Only)
**Date:** 2026-02-24
**Author:** Agent (research task)
**Julian's Ask:** "Tiers 2-6 zombies need to be increasingly scary with unique attack patterns."

---

## 1. Existing System Analysis

### 1.1 Enemy Object Structure

Every enemy is created by `createEnemy(x, z, baseHp, tier)` at **line 1619** of `js/game3d.js`. The returned enemy object has these relevant fields:

```js
{
  group,           // THREE.Group — the visual model
  body, head,      // body/head meshes (used for hurt flash, color changes)
  armL, armR,      // arm meshes (used for walk animation)
  legL, legR,      // leg meshes (used for walk animation)
  hp, maxHp,       // health
  speed,           // movement speed (from ZOMBIE_TIERS + random jitter)
  hurtTimer,       // white flash on damage (0.15s)
  alive, dying,    // lifecycle flags
  tier,            // 1-10 integer
  bodyColor, headColor, // hex colors for flash restore
  walkPhase,       // animation phase offset
  mergeCount,      // merge progress toward next tier
  mergeBounce,     // visual bounce timer after tier-up

  // BD-84 special attack fields (currently only for tier >= 9):
  specialAttackTimer,          // countdown to next attack (seconds)
  specialAttackState,          // 'idle' | 'telegraph' | 'fire'
  specialAttackTelegraphTimer, // telegraph phase countdown
  specialAttackTargetX/Z,      // saved player position at telegraph start
  specialAttackMesh,           // THREE.Object3D for telegraph visual
}
```

The special attack fields are currently only initialized for `tier >= 9` (line 1766). For tiers 2-6, `specialAttackTimer` is set to `0`, which means the attack code block at line 4238 (`if (e.tier >= 9 && e.specialAttackTimer !== undefined)`) never fires.

### 1.2 Zombie Tier Stats (from `ZOMBIE_TIERS` in constants.js)

| Tier | Name      | Scale | HP Mult | Dmg Mult | Speed | Visual Features          |
|------|-----------|-------|---------|----------|-------|--------------------------|
| 1    | Shambler  | 1.0   | 1x      | 1x       | 1.8   | Base model               |
| 2    | Lurcher   | 1.15  | 2.2x    | 1.5x     | 1.8   | +Shoulder pads           |
| 3    | Bruiser   | 1.3   | 3.5x    | 2x       | 2.0   | +Third eye               |
| 4    | Brute     | 1.5   | 5x      | 2.8x     | 2.2   | +Teeth                   |
| 5    | Ravager   | 1.7   | 7x      | 3.5x     | 2.4   | +Claws                   |
| 6    | Horror    | 1.9   | 10x     | 4.5x     | 2.5   | +Side eyes               |
| 7    | Abomination| 2.15 | 14x     | 5.5x     | 2.6   | +Horns                   |
| 8    | Nightmare | 2.4   | 19x     | 7x       | 2.7   | +Spine ridges            |
| 9    | Titan     | 2.7   | 25x     | 9x       | 2.8   | +Aura particles, Shockwave|
| 10   | Overlord  | 3.0   | 35x     | 12x      | 2.9   | +Crown, Death Bolt       |

### 1.3 Existing Special Attacks (BD-84, Tiers 9-10)

**Titan (Tier 9) — Shockwave Slam** (lines 4258-4325):
- **Cooldown:** 5 seconds between attacks
- **Telegraph:** 1.5s — Red RingGeometry on ground, expanding outward to radius ~8
- **Attack:** Instant AoE damage check — 20 damage if player within 8 units
- **Visual:** Ring expands, opacity fades during telegraph
- **Sound:** `sfx_player_growl` (telegraph), `sfx_explosion` (fire)
- **Behavior:** Enemy stands still during telegraph (skips movement via `continue`)

**Overlord (Tier 10) — Death Bolt** (lines 4247-4310):
- **Cooldown:** 4 seconds between attacks
- **Telegraph:** 1.0s — Red line from zombie to player's current position
- **Attack:** Projectile (SphereGeometry r=0.4) fired at saved target position, speed 15, damage 30
- **Visual:** Line pulses opacity during telegraph, red sphere projectile
- **Sound:** `sfx_player_growl` (telegraph), `sfx_explosion` (hit)
- **Behavior:** Enemy stands still during telegraph, projectile added to `st.weaponProjectiles` with `isEnemyProjectile: true`
- **Projectile collision:** Handled in `updateWeaponProjectiles()` at line 2792

**Key pattern:** Both follow Telegraph-then-Fire with a state machine (`idle` -> `telegraph` -> fire -> `idle`). The enemy freezes during telegraph. Damage respects armor, augmentArmor, and shield bracelet.

### 1.4 Combat Flow

- **Contact damage** (line 4481-4514): `15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1) * dt` — continuous DPS while touching. Reduced by armor items, augmentArmor, dodge chance.
- **`damageEnemy(e, dmg)`** (line 2359): Applies crit gloves, hot sauce ignite, kills at 0 HP.
- **`killEnemy(e)`** (line 2248): Awards score, XP gems, triggers loot drops, combo tracking, whoopee cushion chain.
- **`disposeEnemy(e)`** (line 1780): Cleans up Three.js objects including `specialAttackMesh`.

### 1.5 Enemy Projectile System

The death bolt reuses `st.weaponProjectiles[]` with `isEnemyProjectile: true`. In `updateWeaponProjectiles()` (line 2792), enemy projectiles skip normal enemy-hit logic and instead check player proximity. Damage respects all player defenses. This is the established pattern for ranged enemy attacks.

---

## 2. Design Principles

### 2.1 What Makes Enemy Attacks Fun (Not Frustrating) for a 7-Year-Old

**From Vampire Survivors / Hades / Enter the Gungeon / Binding of Isaac:**

1. **Telegraph-Window-Punish** — Every attack MUST have a visible warning. Julian needs to SEE the attack coming before it lands. The telegraph is the game's way of saying "look out!" — it's teaching, not punishing.

2. **One Signature Move per tier** — Each tier gets exactly ONE special attack. No combos, no multi-phase patterns. One move, learned once, recognized forever. When Julian sees a Lurcher, he immediately knows: "that's the one that lunges."

3. **Spatial Awareness over Reaction Time** — Attacks should force Julian to move in a DIRECTION, not just panic-dodge. "Move away from the red circle" is learnable. "React in 0.2 seconds" is not.

4. **Visual Clarity at 3 Feet** — Julian plays on a monitor a few feet away. Telegraphs must be BIG, BRIGHT, and use CONTRASTING COLORS against the green forest floor. No subtle gradients. Bold geometry.

5. **Escalating Complexity** — Tier 2 has the simplest possible mechanic (a short lunge). Tier 6 has the most complex (a multi-part area denial). Each tier adds ONE new concept:
   - Tier 2: "Move away from this enemy" (distance)
   - Tier 3: "Move away from this spot" (area)
   - Tier 4: "Move sideways" (line)
   - Tier 5: "Get out of this zone" (area denial)
   - Tier 6: "Pay attention to the ground" (delayed area)

6. **Forgiving Damage** — Special attacks should deal LESS than sustained contact damage (which is already 15 * dmgMult * dt at close range). Special attacks are a one-time burst that forces positioning, not a DPS increase. Damage values range from 5 (tier 2) to 18 (tier 6).

7. **Long Cooldowns** — These are flavor attacks, not primary damage sources. Cooldowns range from 6s (tier 2) to 8s (tier 6). The THREAT of the attack is more important than the damage.

8. **Fun Sound Effects** — Reuse existing mouth-made SFX. The sounds should be silly, not scary. This is a vibe game built by an uncle and nephew.

### 2.2 Design Constraints

- **Three.js primitives only:** BoxGeometry, CylinderGeometry, RingGeometry, SphereGeometry. No shaders, no particle systems, no custom geometry.
- **Voxel aesthetic:** Everything is blocky. Embrace it.
- **Performance:** Max 2 extra meshes per active attack. Most are temporary (0.3-2s lifetime).
- **Sound:** Reuse from the 22 existing `sfx_*` event IDs. No new audio assets needed.
- **State machine compatibility:** Must use the same `specialAttackState` pattern as tiers 9-10.

---

## 3. Per-Tier Attack Specifications

### 3.1 Tier 2 — Lurcher: "LUNGE SNAP"

**Flavor:** The Lurcher coils back, then springs forward in a short lunge, snapping its jaws. It's the "training wheels" special attack — teaches Julian that some zombies do more than just walk at you.

**Trigger Conditions:**
- `specialAttackTimer` cooldown: **6 seconds** (+ random 0-2s jitter)
- Distance to player: **< 8 units** (only lunges when somewhat close)
- Only triggers if `specialAttackState === 'idle'`

**Telegraph Phase (0.6s):**
- The Lurcher STOPS moving (freezes via `continue` like tiers 9-10)
- Body scales to 80% on X/Z (crouches/coils): `e.group.scale.set(0.8, 1.2, 0.8)`
- A small **yellow-orange ground arrow** appears pointing from the zombie toward the player's current position
- Arrow: Flat BoxGeometry (2.0 x 0.1 x 0.6 units), color `0xffaa00`, transparent, opacity 0.6
- Sound: `sfx_player_growl` (reuse — low growl for telegraph)

**Attack Phase (instant):**
- Zombie lunges forward **3 units** in the direction it was facing at telegraph start
- Position is directly modified: `e.group.position.x += lungeX * 3`, etc.
- If player is within **1.5 units** of landing position: **5 damage** (reduced by armor/augments)
- Body scale snaps back to 1.0
- Sound: `sfx_melee_hit` (reuse — impact sound)

**Visual Effects:**
- Telegraph: 1 mesh (ground arrow)
- Attack: 0 additional meshes (the zombie itself moves)
- Brief dust puff at landing: 1 BoxGeometry (1.5 x 0.3 x 1.5), color `0x887766`, opacity 0.3, life 0.2s — added to `st.weaponEffects` as type `'dust'`

**Counterplay:** Move sideways. The lunge goes in a straight line toward where the player WAS. Side-stepping 2 units is enough.

**Performance:** +1 mesh (telegraph arrow) + 1 mesh (dust puff, 0.2s life) = 2 meshes peak, both very brief.

---

### 3.2 Tier 3 — Bruiser: "GROUND POUND"

**Flavor:** The Bruiser raises both fists overhead (its third eye glows brighter), then SMASHES the ground, creating a small shockwave ring. A miniature version of the Titan's attack, appropriate for its smaller size.

**Trigger Conditions:**
- `specialAttackTimer` cooldown: **7 seconds** (+ random 0-2s jitter)
- Distance to player: **< 10 units** (medium range)
- Only triggers if `specialAttackState === 'idle'`

**Telegraph Phase (1.0s):**
- The Bruiser STOPS moving
- Arms raise: `e.armL.position.y += 0.4 * scale`, `e.armR.position.y += 0.4 * scale`
- A **red-orange ring** appears on the ground centered on the zombie, starting small
- Ring: RingGeometry(0.3, 0.6, 16), rotated flat, color `0xff6600`, transparent, opacity 0.5
- Ring expands during telegraph: scale grows from 1 to 5 (final radius ~3 units)
- Sound: `sfx_power_attack_charge` (reuse — building tension)

**Attack Phase (instant):**
- Damage check: all entities within **3 units** of the zombie's position
- Damage: **8** (reduced by armor/augments)
- Arms snap back to default position
- Ring mesh replaced by a brief "impact flash": BoxGeometry (6 x 0.2 x 6), color `0xff4400`, opacity 0.5, life 0.25s
- Sound: `sfx_explosion` (reuse)

**Visual Effects:**
- Telegraph: 1 mesh (expanding ring)
- Attack: 1 mesh (impact flash, 0.25s life)

**Counterplay:** Move 3+ units away. The telegraph ring shows exactly how far the shockwave reaches. Julian can SEE the danger zone.

**Performance:** +1 mesh (ring) + 1 mesh (impact, 0.25s life) = 2 meshes peak, brief lifetime.

---

### 3.3 Tier 4 — Brute: "BONE SPIT"

**Flavor:** The Brute opens its toothy maw wide, you hear a disgusting gargle, and it spits a slow-moving bone projectile in a straight line. The first RANGED enemy attack Julian encounters — teaches him to dodge sideways.

**Trigger Conditions:**
- `specialAttackTimer` cooldown: **7 seconds** (+ random 0-2s jitter)
- Distance to player: **< 14 units** (ranged attack, longer trigger distance)
- Only triggers if `specialAttackState === 'idle'`

**Telegraph Phase (0.8s):**
- The Brute STOPS moving
- Head tilts back: `e.head.position.y += 0.15 * scale` (rearing back to spit)
- A **pulsing yellow line** appears from the zombie's mouth toward the player's current position
- Line: BufferGeometry line from zombie to player position, LineBasicMaterial, color `0xffcc00`, opacity pulses (0.3 + 0.4 * sin)
- Sound: `sfx_weapon_poison` (reuse — gurgling/gross sound fits the spit)

**Attack Phase (projectile):**
- Fires a **bone projectile** toward saved target position
- Projectile: BoxGeometry (0.3 x 0.15 x 0.15), color `0xccccaa` (bone white), spinning on Y axis
- Speed: **8** (deliberately slow — slower than Death Bolt's 15, so Julian can see it coming)
- Damage: **10** (on player proximity hit, range 1.0 units)
- Lifetime: **2.5 seconds** (despawns after ~20 units of travel)
- Added to `st.weaponProjectiles` with `isEnemyProjectile: true`, `type: 'boneSpit'`
- Head snaps back to default position
- Sound: `sfx_weapon_projectile` (reuse — projectile launch)

**Visual Effects:**
- Telegraph: 1 mesh (aim line)
- Attack: 1 mesh (projectile, up to 2.5s life, but only 1 per enemy at a time)

**Counterplay:** Strafe sideways. The projectile is slow (speed 8 vs player speed ~5-7+), so even walking perpendicular to the shot is enough. The aim line during telegraph shows EXACTLY where it's going.

**Performance:** +1 mesh (telegraph line) + 1 mesh (projectile, 2.5s max) = 2 meshes peak per Brute.

---

### 3.4 Tier 5 — Ravager: "POISON POOL"

**Flavor:** The Ravager rakes its claws across the ground, leaving a toxic green puddle that damages the player if they stand in it. This is the first AREA DENIAL attack — it forces Julian to change his pathing, not just dodge once.

**Trigger Conditions:**
- `specialAttackTimer` cooldown: **8 seconds** (+ random 0-2s jitter)
- Distance to player: **< 6 units** (close range — the Ravager slashes where it's standing)
- Only triggers if `specialAttackState === 'idle'`

**Telegraph Phase (0.7s):**
- The Ravager STOPS moving
- One arm rears back: `e.armR.position.y += 0.3 * scale`, `e.armR.position.z -= 0.2 * scale`
- A **pulsing green circle** appears on the ground at the zombie's position
- Circle: CylinderGeometry(3, 3, 0.05, 12), color `0x44cc44`, transparent, opacity pulsing 0.2-0.5
- Sound: `sfx_weapon_poison` (reuse — hissing/toxic sound)

**Attack Phase (area denial, persistent):**
- Arm slashes forward (position snap back)
- A **poison pool** is placed at the zombie's position (NOT the player's position — the zombie leaves it where IT is standing)
- Pool: CylinderGeometry(3, 3, 0.08, 12), color `0x22aa22`, transparent, opacity 0.35
- Pool duration: **4 seconds**
- Pool damage: **4 damage per second** while player stands in radius (3 units)
- Pool added to `st.weaponEffects` as type `'poisonPool'` with damage-per-tick logic like the existing `'cloud'` type
- Sound: `sfx_comedic_drop` (reuse — splat sound)

**Visual Effects:**
- Telegraph: 1 mesh (pulsing green circle)
- Attack: 1 mesh (poison pool, 4s life)
- Pool gently rotates and pulses opacity during its lifetime

**Counterplay:** Don't stand in the green stuff. Since the pool is placed at the ZOMBIE's feet (not the player's), the player can simply back away or circle around. The pool blocks off a small area, forcing routing decisions.

**Performance:** +1 mesh (telegraph) + 1 mesh (pool, 4s life) = 2 meshes peak. With 8s cooldown and 4s duration, at most 1 pool per Ravager exists at a time.

---

### 3.5 Tier 6 — Horror: "GRAVE BURST"

**Flavor:** The Horror's extra eyes ALL glow bright, it raises both arms and channels dark energy into the ground. After a delay, THREE small eruption spots appear around the player's position and explode upward one by one. This is the most complex attack — it forces Julian to keep moving for a full 2 seconds.

**Trigger Conditions:**
- `specialAttackTimer` cooldown: **8 seconds** (+ random 0-2s jitter)
- Distance to player: **< 12 units** (medium-long range)
- Only triggers if `specialAttackState === 'idle'`

**Telegraph Phase (1.2s):**
- The Horror STOPS moving
- Both arms raise high: `e.armL.position.y += 0.4 * scale`, `e.armR.position.y += 0.4 * scale`
- Body emissive glow: temporarily set body material emissive to `0x442200` (orange-ish glow)
- **Three small red X markers** appear on the ground near the player's position:
  - Marker 1: at player position + random offset (0-2 units)
  - Marker 2: at player position + random offset (0-2 units, different direction)
  - Marker 3: at player position + random offset (0-2 units, different direction)
- Each marker: Two crossed BoxGeometry strips (1.5 x 0.05 x 0.3), rotated 45 degrees, color `0xff2200`, opacity 0.6
- Markers pulse opacity during telegraph
- Sound: `sfx_player_growl` (reuse — ominous buildup)

**Attack Phase (sequential, 0.6s total):**
- Arms drop, emissive glow removed
- The three markers explode in sequence, **0.2 seconds apart**:
  - Each explosion: BoxGeometry (2.0 x 1.5 x 2.0), color `0xff4400`, opacity 0.5, life 0.3s
  - Each explosion deals **6 damage** if player is within 1.5 units of the marker position
  - Sound: `sfx_explosion` for each burst (staggered)
- Total potential damage: 18 if player stands still and gets hit by all 3 (unlikely)
- Implemented via a sub-timer: `specialAttackBurstIndex` counts 0, 1, 2 with 0.2s between each

**Visual Effects:**
- Telegraph: 3 meshes (X markers, each built from 2 boxes in a Group = 3 Groups total)
- Attack: Up to 3 meshes (explosions, 0.3s life each, staggered)
- Peak: 3 markers + 1 explosion = 4 meshes (since explosions replace markers sequentially)

**Counterplay:** Keep moving. The markers show where the eruptions will happen. Since they're spread 0-2 units from the player's position AT TELEGRAPH START, simply running in any consistent direction clears all three. Julian learns: "when you see red Xs, just keep running."

**Performance:** +3 meshes (markers) + up to 2 simultaneous explosion meshes = 5 meshes peak (briefly). All cleaned up within 0.6s of attack start.

---

## 4. Implementation Approach

### 4.1 Code Changes Overview

All changes are in `js/game3d.js`. No changes needed to `constants.js`, `audio.js`, `hud.js`, or any other module.

### 4.2 Modification: `createEnemy()` (line 1619)

**Current** (line 1766):
```js
specialAttackTimer: (tier >= 9) ? 3 + Math.random() * 2 : 0,
```

**Change to:**
```js
specialAttackTimer: (tier >= 2) ? getTierAttackCooldown(tier) + Math.random() * 2 : 0,
```

Add a helper function (near line 1619):
```js
function getTierAttackCooldown(tier) {
  // Returns base cooldown in seconds for each tier's special attack
  if (tier >= 10) return 4;
  if (tier >= 9) return 5;
  if (tier >= 6) return 8;
  if (tier >= 5) return 8;
  if (tier >= 4) return 7;
  if (tier >= 3) return 7;
  if (tier >= 2) return 6;
  return 0;
}
```

Also add new fields for tier 6's sequential burst:
```js
specialAttackBurstIndex: 0,     // For Horror's sequential explosions
specialAttackBurstTimer: 0,     // Timer between bursts
specialAttackMarkers: [],       // Array of {x, z, mesh} for Horror's X markers
```

### 4.3 Modification: Enemy AI Loop — Special Attack Block (line 4235)

**Current** (line 4238):
```js
if (e.tier >= 9 && e.specialAttackTimer !== undefined) {
```

**Change to:**
```js
if (e.tier >= 2 && e.specialAttackTimer > 0 || e.specialAttackState !== 'idle') {
```

Then restructure the inner block to dispatch by tier range:

```js
// Tiers 2-6: new attacks (BD-145)
if (e.tier >= 2 && e.tier <= 6) {
  handleLowTierSpecialAttack(e, dt);
}
// Tiers 9-10: existing attacks (BD-84)
else if (e.tier >= 9) {
  // ... existing code unchanged ...
}
```

### 4.4 New Function: `handleLowTierSpecialAttack(e, dt)` (~120 lines)

Insert after the existing special attack block (around line 4340). This function contains the state machine for tiers 2-6:

```
function handleLowTierSpecialAttack(e, dt) {
  e.specialAttackTimer -= dt;

  // Distance check — don't attack if too far
  const dx = st.playerX - e.group.position.x;
  const dz = st.playerZ - e.group.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const maxRange = [0, 0, 8, 10, 14, 6, 12][e.tier]; // indexed by tier

  if (e.specialAttackState === 'idle' && e.specialAttackTimer <= 0) {
    if (dist > maxRange) {
      // Too far — reset timer and try again later
      e.specialAttackTimer = 1 + Math.random();
      return false; // don't skip movement
    }
    // Start telegraph based on tier
    e.specialAttackState = 'telegraph';
    e.specialAttackTargetX = st.playerX;
    e.specialAttackTargetZ = st.playerZ;

    switch(e.tier) {
      case 2: startLurcherTelegraph(e); break;
      case 3: startBruiserTelegraph(e); break;
      case 4: startBruteTelegraph(e); break;
      case 5: startRavagerTelegraph(e); break;
      case 6: startHorrorTelegraph(e); break;
    }
    return true; // skip movement this frame
  }

  if (e.specialAttackState === 'telegraph') {
    e.specialAttackTelegraphTimer -= dt;
    // Animate telegraphs per tier
    updateTierTelegraph(e, dt);

    if (e.specialAttackTelegraphTimer <= 0) {
      // Fire attack
      switch(e.tier) {
        case 2: fireLurcherAttack(e); break;
        case 3: fireBruiserAttack(e); break;
        case 4: fireBruteAttack(e); break;
        case 5: fireRavagerAttack(e); break;
        case 6: fireHorrorAttack(e); break;
      }
      cleanupSpecialAttackMesh(e);
      e.specialAttackTimer = getTierAttackCooldown(e.tier) + Math.random() * 2;
      e.specialAttackState = 'idle';
    }
    return true; // skip movement during telegraph
  }

  return false; // normal movement
}
```

### 4.5 New Functions: Per-Tier Telegraph/Fire (~15-25 lines each)

Each tier gets a `startXTelegraph(e)` and `fireXAttack(e)` pair. These are small, self-contained functions that create/destroy meshes and apply damage. Detailed pseudocode for each is in section 3 above.

**Estimated function sizes:**
- `startLurcherTelegraph` / `fireLurcherAttack`: 12 + 18 = 30 lines
- `startBruiserTelegraph` / `fireBruiserAttack`: 15 + 20 = 35 lines
- `startBruteTelegraph` / `fireBruteAttack`: 14 + 22 = 36 lines
- `startRavagerTelegraph` / `fireRavagerAttack`: 14 + 18 = 32 lines
- `startHorrorTelegraph` / `fireHorrorAttack`: 25 + 35 = 60 lines (most complex due to sequential bursts)
- `updateTierTelegraph`: 30 lines (switch-based animation update)
- `getTierAttackCooldown`: 8 lines
- `cleanupSpecialAttackMesh`: Already exists as part of `disposeEnemy`, needs minor extension

**Total new code:** ~240 lines + ~20 lines of modifications to existing functions.

### 4.6 Modification: `updateWeaponProjectiles()` (line 2786)

Add a handler for `type: 'boneSpit'` enemy projectiles, similar to the existing `'deathBolt'` handler at line 2792. The bone spit projectile:
- Moves in a straight line (same as death bolt)
- Spins on Y axis: `p.mesh.rotation.y += dt * 8`
- Checks player proximity with `range` of 1.0 units
- Applies damage with armor/augment reduction

This is ~15 lines, nearly identical to the existing death bolt handler.

### 4.7 Modification: `updateWeaponEffects()` (line 3101)

Add handlers for two new effect types:

1. **`'dust'`** — Simple fade-out, no damage. 3 lines.
2. **`'poisonPool'`** — DPS to player while standing inside, opacity pulse, rotation. ~15 lines, modeled after the existing `'cloud'` effect but damaging the PLAYER instead of enemies.

### 4.8 Modification: `disposeEnemy()` (line 1780)

Extend the existing `specialAttackMesh` cleanup to also clean up `specialAttackMarkers[]` (for Horror tier 6):

```js
if (e.specialAttackMarkers) {
  for (const m of e.specialAttackMarkers) {
    scene.remove(m.mesh);
    m.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }
  e.specialAttackMarkers = [];
}
```

---

## 5. Conflict Analysis

### 5.1 Systems That Interact with Enemy Special Attacks

| System | Interaction | Risk | Mitigation |
|--------|-------------|------|------------|
| **Enemy merge system** (line 4543) | Merging zombies during telegraph could cause stale meshes | Medium | Clean up `specialAttackMesh` in merge disposal (already handled by `disposeEnemy`) |
| **Frost Nova powerup** | `e.frozen` check at line 4189 runs BEFORE special attacks | Low | Frozen enemies already skip the entire movement block. Add explicit check: `if (e.frozen) { e.specialAttackState = 'idle'; }` to cancel mid-telegraph |
| **Time Warp powerup** | Slows enemy speed but doesn't affect special attack timers | None | Intentional — special attacks trigger on timers, not movement |
| **Mud/Turd/Snow slow** | Only affects `e.speed`, not special attack timers | None | No conflict |
| **Contact damage** (line 4481) | Still applies during telegraph (enemy stands still, player may be near) | Low | Acceptable — contact damage is separate from special attack damage |
| **Despawn distance** (line 4540) | Enemies >60 units despawn — could despawn mid-telegraph | Low | Telegraph only starts within 8-14 units of player, so despawn range is never reached |
| **Boss enemies** (BD-77) | Bosses have `e.isBoss` flag and scaled damage | Low | Bosses can be any tier. Add check: `if (e.isBoss) return false;` in `handleLowTierSpecialAttack` to skip — bosses already have enough going on |
| **Death animation** | `e.dying` check at line 4179 skips everything | None | Already handled |
| **Totem-spawned zombies** | Same tier system, will inherit special attacks | None | Intentional and correct |
| **Whoopee Cushion chain** (BD-134) | Kill during telegraph cleanup is fine | None | No conflict |
| **Ignite DoT** (Hot Sauce) | Can kill enemy during telegraph | Low | `killEnemy` calls `disposeEnemy` which cleans up meshes. Safe. |
| **HUD minimap** | Shows enemy positions, not attack states | None | No conflict |
| **Snowball freeze** | `e._snowFrozen` causes `continue` at line 4220, before special attacks | Low | Same as Frost Nova — already skips |

### 5.2 Edge Cases

1. **Multiple tier-2+ enemies attacking simultaneously:** Each enemy manages its own state machine independently. No global state. Safe.
2. **Enemy killed during telegraph:** `disposeEnemy()` cleans up `specialAttackMesh`. Safe.
3. **Player dies during attack:** Game-over triggers, game loop stops. Meshes cleaned up on restart. Safe.
4. **Poison pool + Ravager killed:** The pool is added to `st.weaponEffects` which is independent of the enemy. Pool persists even if the Ravager dies. This is correct behavior (poison lingers).
5. **Bone spit projectile + Brute killed:** Projectile is in `st.weaponProjectiles` which is independent. Projectile continues flying. This is correct behavior.

---

## 6. Performance Budget

### 6.1 Per-Attack Mesh Count

| Tier | Attack | Telegraph Meshes | Attack Meshes | Peak Total | Lifetime |
|------|--------|-----------------|---------------|------------|----------|
| 2 | Lunge Snap | 1 (arrow) | 1 (dust) | 2 | 0.6s + 0.2s |
| 3 | Ground Pound | 1 (ring) | 1 (impact) | 2 | 1.0s + 0.25s |
| 4 | Bone Spit | 1 (aim line) | 1 (projectile) | 2 | 0.8s + 2.5s |
| 5 | Poison Pool | 1 (circle) | 1 (pool) | 2 | 0.7s + 4.0s |
| 6 | Grave Burst | 3 (X markers) | 3 (explosions, staggered) | 5 | 1.2s + 0.6s |

### 6.2 Worst-Case Scenario

In a dense late-game scenario with many high-tier zombies on screen:

- **Tier 2-3 (Lurchers/Bruisers):** Common from merging. With 6-7s cooldowns, at most ~50% are attacking at any moment. If 10 Lurchers on screen: ~5 attacking = 10 extra meshes (arrows + dust). Brief lifetime (< 1s).
- **Tier 4 (Brutes):** Less common. Maybe 3-5 on screen. 1-2 attacking at once = 2-4 extra meshes. Projectiles last up to 2.5s.
- **Tier 5 (Ravagers):** Rare. Maybe 1-3 on screen. 1 attacking = 2 extra meshes. Pools last 4s but only 1 per Ravager at a time.
- **Tier 6 (Horrors):** Very rare. Maybe 0-2 on screen. 1 attacking = 5 extra meshes (peak, very briefly).

**Absolute worst case:** ~20-25 extra meshes from ALL tier 2-6 special attacks combined. For context, the existing game already has hundreds of enemy meshes, weapon effects, XP gems, etc. This is negligible.

### 6.3 Draw Call Impact

All attack meshes use simple materials (MeshBasicMaterial or LineBasicMaterial). No textures, no complex shaders. Each adds 1 draw call.

- **Worst case addition:** +20-25 draw calls
- **Existing baseline:** Hundreds of draw calls from enemies alone (each enemy model has 15+ box meshes)
- **Impact:** < 5% increase in draw calls during heavy combat. Unnoticeable.

### 6.4 Geometry Disposal

Every temporary mesh is tracked and disposed via:
- `cleanupSpecialAttackMesh(e)` — called when attack fires
- `disposeEnemy(e)` — called when enemy dies or despawns
- `updateWeaponEffects()` lifetime cleanup — handles pools and dust
- `updateWeaponProjectiles()` lifetime cleanup — handles bone spit

No geometry leaks. All meshes have clear ownership and cleanup paths.

---

## 7. Summary Table

| Tier | Name | Attack Name | Telegraph | Duration | Damage | Range | Cooldown | Counterplay |
|------|------|-------------|-----------|----------|--------|-------|----------|-------------|
| 2 | Lurcher | Lunge Snap | Yellow arrow, 0.6s | Instant | 5 | 1.5u | 6s | Sidestep |
| 3 | Bruiser | Ground Pound | Red ring, 1.0s | Instant | 8 | 3u | 7s | Back away |
| 4 | Brute | Bone Spit | Yellow aim line, 0.8s | 2.5s flight | 10 | 1u hit | 7s | Strafe |
| 5 | Ravager | Poison Pool | Green circle, 0.7s | 4s persist | 4/s | 3u | 8s | Don't stand in it |
| 6 | Horror | Grave Burst | 3 red X marks, 1.2s | 0.6s seq. | 6x3 | 1.5u each | 8s | Keep running |

### Sound Effects Reuse Map

| Attack Phase | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 |
|-------------|--------|--------|--------|--------|--------|
| Telegraph | `sfx_player_growl` | `sfx_power_attack_charge` | `sfx_weapon_poison` | `sfx_weapon_poison` | `sfx_player_growl` |
| Fire/Hit | `sfx_melee_hit` | `sfx_explosion` | `sfx_weapon_projectile` | `sfx_comedic_drop` | `sfx_explosion` (x3) |

### Implementation Size Estimate

| Component | Lines Added | Lines Modified |
|-----------|-------------|----------------|
| `getTierAttackCooldown()` | 8 | 0 |
| `handleLowTierSpecialAttack()` | 50 | 0 |
| Tier 2 telegraph + fire | 30 | 0 |
| Tier 3 telegraph + fire | 35 | 0 |
| Tier 4 telegraph + fire | 36 | 0 |
| Tier 5 telegraph + fire | 32 | 0 |
| Tier 6 telegraph + fire | 60 | 0 |
| `updateTierTelegraph()` | 30 | 0 |
| `createEnemy()` changes | 0 | 5 |
| Enemy AI loop dispatch | 0 | 8 |
| `updateWeaponProjectiles()` bone spit | 15 | 0 |
| `updateWeaponEffects()` dust + poison pool | 18 | 0 |
| `disposeEnemy()` marker cleanup | 6 | 0 |
| **Total** | **~320** | **~13** |
