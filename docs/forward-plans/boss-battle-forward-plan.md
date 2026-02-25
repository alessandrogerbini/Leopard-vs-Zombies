# Boss Battle Forward Plan

**Date:** 2026-02-24
**Based on:** `docs/research/boss-battle-design.md`
**Implements:** BD-215 (Boss zombies need diverse, learnable attack patterns)

---

## 1. Executive Summary

This plan transforms the Titan (tier 9) and Overlord (tier 10) from simple two-attack zombies into multi-phase bosses with distinct, learnable attack patterns, visual telegraphs appropriate for voxel art, and audio cues built on our mouth-made SFX library. The work is split into five phases over an estimated 8-12 beads, prioritizing the changes that deliver the most "scary factor" for the least code risk in our monolithic `game3d.js` architecture.

---

## 2. Priority-Ordered Implementation Phases

### Phase 1: Foundation -- Screen Shake + Phase System (Small)

**Deliverables:**
- Screen shake utility function usable by any game event
- Boss HP phase tracking (`e.bossPhase`) with threshold checks
- Phase transition visual/audio feedback (floating text, body flash, aura intensity ramp)

**Research Basis:** Section 3 (multi-phase attacks), Section 5 (screen effects). The research identifies screen shake as "#4 priority -- massive feel improvement, tiny code" and phase systems as "#2 priority -- dramatic structure."

**Estimated Complexity:** Small

**Dependencies:** None. This is the foundation everything else builds on.

**Details:**

Screen shake is currently absent from the entire codebase. Implement as a camera offset system in the render loop:

```js
// New state variables
st.screenShake = 0;       // remaining shake duration (seconds)
st.screenShakeAmp = 0;    // current amplitude (world units)

// Utility function
function triggerScreenShake(amplitude, duration) {
  st.screenShake = Math.max(st.screenShake, duration);
  st.screenShakeAmp = Math.max(st.screenShakeAmp, amplitude);
}

// In render loop, after camera position is set, before renderer.render():
if (st.screenShake > 0) {
  st.screenShake -= dt;
  const decay = st.screenShake / 0.3; // linear decay
  const offsetX = (Math.random() - 0.5) * st.screenShakeAmp * decay;
  const offsetY = (Math.random() - 0.5) * st.screenShakeAmp * decay * 0.5;
  camera.position.x += offsetX;
  camera.position.y += offsetY;
  if (st.screenShake <= 0) st.screenShakeAmp = 0;
}
```

Phase system adds a `bossPhase` property to tier 9/10 enemies at creation time, checked each frame in the boss attack update block:

```js
// Phase thresholds (percentage of max HP)
// Titan: Phase 1 >60%, Phase 2 60-30%, Phase 3 <30%
// Overlord: Phase 1 >75%, Phase 2 75-50%, Phase 3 50-25%, Phase 4 <25%
const hpPct = e.hp / e.maxHp;
const prevPhase = e.bossPhase;

if (e.tier === 9) {
  e.bossPhase = hpPct > 0.6 ? 1 : hpPct > 0.3 ? 2 : 3;
} else if (e.tier >= 10) {
  e.bossPhase = hpPct > 0.75 ? 1 : hpPct > 0.5 ? 2 : hpPct > 0.25 ? 3 : 4;
}

if (prevPhase !== undefined && e.bossPhase > prevPhase) {
  // Phase transition event
  const phaseLabels = {
    9:  { 2: 'TITAN ENRAGED!', 3: 'TITAN BERSERK!' },
    10: { 2: 'OVERLORD AWAKENS!', 3: 'OVERLORD FURIOUS!', 4: 'DARK NOVA UNLOCKED!' },
  };
  const label = phaseLabels[e.tier]?.[e.bossPhase];
  if (label) addFloatingText(label, '#ffcc00', e.group.position.x, e.group.position.y + 5, e.group.position.z, 3, true);
  triggerScreenShake(0.3, 0.4);
  playSound('sfx_explosion');

  // Aura intensity ramp
  if (e.bossAuraMesh) {
    const auraColors = { 1: 0xcc2200, 2: 0xff4400, 3: 0xff0000 };
    e.bossAuraMesh.material.color.setHex(auraColors[e.bossPhase] || 0xff0000);
  }
}
```

**Chill Mode:** Phase thresholds shift down (Titan: Phase 2 at 40%, Phase 3 at 15%; Overlord: Phase 2 at 55%, Phase 3 at 30%, Phase 4 at 12%). This gives the player more time in the easier phase before escalation.

---

### Phase 2: Titan Attack Expansion (Medium)

**Deliverables:**
- Bone Barrage attack (lobbed AoE with ground markers)
- Titan Charge attack (dash with aim line telegraph)
- Ground Fissures attack (line AoE in forward arc)
- Phase-gated attack selection replacing the current odd/even alternation
- Screen shake on slam/charge impacts

**Research Basis:** Section 3 (Titan specific attacks), Section 1 (lobbed/arcing projectiles, charge/dash, cross/line attacks), Section 2 (telegraph timing).

**Estimated Complexity:** Medium

**Dependencies:** Phase 1 (phase system, screen shake utility)

**Titan Attack Selection by Phase:**

| Phase | HP Range | Available Attacks | Cooldown Modifier |
|-------|----------|-------------------|-------------------|
| 1 | >60% | Slam, Shockwave | 1.0x (2.5s base) |
| 2 | 60-30% | Slam, Shockwave, Bone Barrage | 0.85x |
| 3 | <30% | Slam, Shockwave, Bone Barrage, Titan Charge, Ground Fissures | 0.75x |

Replace the current `specialAttackCount % 2` alternation with weighted random selection from the available pool:

```js
// Attack pool based on phase
const titanAttacks = ['slam', 'shockwave'];
if (e.bossPhase >= 2) titanAttacks.push('boneBarrage');
if (e.bossPhase >= 3) titanAttacks.push('titanCharge', 'groundFissures');

// Weighted selection (avoid repeating last attack)
let pick;
do {
  pick = titanAttacks[Math.floor(Math.random() * titanAttacks.length)];
} while (pick === e._lastAttack && titanAttacks.length > 1);
e._lastAttack = pick;
```

**Attack 1 -- Bone Barrage (Lobbed AoE):**

The Titan slams the ground and 4-6 bone-colored cube clusters arc through the air, landing at positions near the player. Each landing zone is marked with a red ground circle during the telegraph.

- Telegraph: Titan slams down (0.8s), red circles appear at landing positions
- Projectiles: Voxel "bone" meshes (2-3 cream/white boxes grouped) with parabolic arc trajectory
- Landing: On impact, each bone spawns a burst of cream-colored particles and deals 15 damage in a 2-unit radius
- Targeting: Positions are `playerPos + random offset (3-6 units)` in a semicircle in front of the Titan -- never all on the same spot
- Cooldown: 6s base

Visual telegraph (ground markers):
```js
// For each bone target position, place a red circle on the ground
const markerGeo = new THREE.RingGeometry(0.1, 2.0, 16);
markerGeo.rotateX(-Math.PI / 2);
const markerMat = new THREE.MeshBasicMaterial({
  color: 0xff2200, transparent: true, opacity: 0.4, side: THREE.DoubleSide
});
const marker = new THREE.Mesh(markerGeo, markerMat);
marker.position.set(targetX, 0.15, targetZ);
scene.add(marker);
```

The bone projectiles use parabolic motion (`vy` starts positive, decreases by gravity each frame) rather than homing. They land where the ground markers indicated, not where the player currently is. This rewards players who read the ground markers and move away.

Screen shake on bone impacts: `triggerScreenShake(0.15, 0.15)` per bone hit.

**Attack 2 -- Titan Charge (Dash):**

The Titan hunches forward, a red aim line appears on the ground pointing toward the player's current position, then it charges at 3x its normal speed for 15 units in that direction.

- Telegraph: 1.5s -- Titan hunches (scale Y to 0.8, scale XZ to 1.1), red line appears on ground from Titan toward player
- Charge: Moves at `e.speed * 3` along the locked direction for 15 units or until hitting map boundary
- On-hit: 30 damage, knockback effect (player velocity impulse away from charge direction)
- Recovery: 2s stun after charge ends -- Titan stands still, body flashes white. This is the exploitable punishment window.
- Cooldown: 10s base

Telegraph visual (aim line):
```js
// Red line from Titan toward player position (locked at telegraph start)
const lineLen = 15;
const lineGeo = new THREE.BoxGeometry(0.4, 0.05, lineLen);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
const line = new THREE.Mesh(lineGeo, lineMat);
// Position at midpoint between Titan and charge destination
const angle = Math.atan2(targetZ - e.group.position.z, targetX - e.group.position.x);
line.position.set(
  e.group.position.x + Math.cos(angle) * lineLen / 2, 0.1,
  e.group.position.z + Math.sin(angle) * lineLen / 2
);
line.rotation.y = -angle + Math.PI / 2;
```

Screen shake when charge starts: `triggerScreenShake(0.2, 0.2)`. On player hit: `triggerScreenShake(0.4, 0.3)`.

**Attack 3 -- Ground Fissures (Line AoE):**

The Titan slams and 3 crack lines extend outward in a forward arc (120 degrees centered on the player direction). Each fissure is a narrow damage zone.

- Telegraph: 1.2s -- dark brown lines appear on ground, slowly growing outward from the Titan
- Eruption: Lines flash red-orange and deal 20 damage to any player standing on them
- Dimensions: Each fissure is 0.5 units wide, 12 units long
- Spacing: 3 fissures at -40, 0, and +40 degrees from the player direction
- Persistent: Fissures remain for 1.5s after eruption as visual-only hazard markers (no damage after initial burst)

The fissures can be built using thin box geometries laid on the ground:
```js
for (let i = -1; i <= 1; i++) {
  const fissureAngle = playerAngle + i * (40 * Math.PI / 180);
  const fissureGeo = new THREE.BoxGeometry(0.5, 0.1, 12);
  const fissureMat = new THREE.MeshBasicMaterial({
    color: 0x442200, transparent: true, opacity: 0.6
  });
  const fissure = new THREE.Mesh(fissureGeo, fissureMat);
  fissure.position.set(
    e.group.position.x + Math.cos(fissureAngle) * 6, 0.12,
    e.group.position.z + Math.sin(fissureAngle) * 6
  );
  fissure.rotation.y = -fissureAngle + Math.PI / 2;
  scene.add(fissure);
}
```

Screen shake on fissure eruption: `triggerScreenShake(0.25, 0.25)`.

**Chill Mode Adjustments for All Titan Attacks:**
- Bone Barrage: 4 bones instead of 6, telegraph 1.2s (1.5x), damage 0.5x (8 per bone)
- Titan Charge: Telegraph 2.25s (1.5x), charge speed 2x instead of 3x, damage 0.5x (15), recovery stun 3s
- Ground Fissures: 2 fissures instead of 3, telegraph 1.8s (1.5x), damage 0.5x (10)
- All cooldowns 1.5x longer

---

### Phase 3: Overlord Attack Expansion (Large)

**Deliverables:**
- Death Bolt Volley (3-bolt spread, upgrading to 5-bolt in Phase 3)
- Shadow Zones (floor hazard circles)
- Summon Burst (spawns temporary minion ring)
- Death Beam (sweeping line attack)
- Dark Nova (desperation AoE with safe-zone-at-boss mechanic)
- Phase-gated attack selection

**Research Basis:** Section 3 (Overlord specific attacks), Section 1 (spread projectiles, floor hazards, homing), Section 2 (safe zones and dodge windows).

**Estimated Complexity:** Large (largest single phase -- consider splitting into 2-3 beads)

**Dependencies:** Phase 1 (phase system, screen shake utility)

**Overlord Attack Selection by Phase:**

| Phase | HP Range | Available Attacks | Cooldown Modifier |
|-------|----------|-------------------|-------------------|
| 1 | >75% | Death Bolt Volley, Shadow Zones | 1.0x (1.5s base) |
| 2 | 75-50% | Volley, Shadow Zones, Summon Burst | 0.9x |
| 3 | 50-25% | 5-Bolt Volley, Shadow Zones, Summon Burst, Death Beam | 0.8x |
| 4 | <25% | 5-Bolt Volley, Shadow Zones, Summon Burst, Death Beam, Dark Nova | 0.8x, +30% move speed |

**Attack 1 -- Death Bolt Volley (Replaces Single Death Bolt):**

The current single bolt becomes a 3-bolt spread with a 15-degree arc. The center bolt leads the target (uses existing `playerVelX/Z` prediction from BD-211), flanking bolts offset at +/-7.5 degrees.

This is the lowest-effort, highest-impact change. The existing death bolt code at lines 5302-5321 of `game3d.js` gets modified to fire in a loop:

```js
const boltCount = e.bossPhase >= 3 ? 5 : 3;
const spreadAngle = e.bossPhase >= 3 ? 30 : 15; // degrees total
const baseAngle = Math.atan2(bdz, bdx);

for (let i = 0; i < boltCount; i++) {
  const offset = ((i / (boltCount - 1)) - 0.5) * (spreadAngle * Math.PI / 180);
  const angle = baseAngle + offset;
  const boltGeo = new THREE.SphereGeometry(0.4, 8, 6);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const bolt = new THREE.Mesh(boltGeo, boltMat);
  bolt.position.set(e.group.position.x, 1.5, e.group.position.z);
  scene.add(bolt);
  st.weaponProjectiles.push({
    mesh: bolt,
    x: e.group.position.x, y: 1.5, z: e.group.position.z,
    vx: Math.cos(angle) * 16, vy: 0, vz: Math.sin(angle) * 16,
    damage: 30 * diffDmgMult,
    range: 1.2,
    life: 3,
    type: 'deathBolt',
    isEnemyProjectile: true,
  });
}
```

Telegraph visual: The existing aim strip stays, but widens to show the spread arc. Three (or five) faint red lines fan out from the Overlord during telegraph.

**Attack 2 -- Shadow Zones (Floor Hazards):**

3-5 dark circles appear near the player. After a 1.5s telegraph, they erupt into persistent damage zones lasting 3 seconds.

- Telegraph: Dark purple-black circles (3-unit radius) fade in on the ground at positions near the player (player pos + 2-5 unit random offset)
- Eruption: Circles flash bright purple, then deal 10 damage per 0.5s to the player if they stand in one
- Duration: 3s persistent after eruption, then fade out over 0.5s
- Cooldown: 7s base

Implementation approach -- use `st.weaponEffects[]` (the existing effect tracking array) with a new `type: 'shadowZone'`:

```js
const zoneCount = e.bossPhase >= 3 ? 5 : 3;
for (let i = 0; i < zoneCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 2 + Math.random() * 3;
  const zx = st.playerX + Math.cos(angle) * dist;
  const zz = st.playerZ + Math.sin(angle) * dist;

  const zoneGeo = new THREE.CircleGeometry(3, 16);
  zoneGeo.rotateX(-Math.PI / 2);
  const zoneMat = new THREE.MeshBasicMaterial({
    color: 0x330044, transparent: true, opacity: 0.3, side: THREE.DoubleSide
  });
  const zone = new THREE.Mesh(zoneGeo, zoneMat);
  zone.position.set(zx, 0.12, zz);
  scene.add(zone);

  st.weaponEffects.push({
    mesh: zone,
    x: zx, z: zz,
    life: 4.5,       // 1.5s telegraph + 3s active
    maxLife: 4.5,
    type: 'shadowZone',
    radius: 3,
    damage: 10 * diffDmgMult,
    telegraphRemaining: 1.5,
    damageTickTimer: 0,
  });
}
```

In the weapon effects update loop, add a `shadowZone` handler:
```js
if (eff.type === 'shadowZone') {
  if (eff.telegraphRemaining > 0) {
    eff.telegraphRemaining -= dt;
    // Pulse opacity during telegraph
    eff.mesh.material.opacity = 0.2 + 0.15 * Math.sin(performance.now() * 0.008);
    if (eff.telegraphRemaining <= 0) {
      // Eruption flash
      eff.mesh.material.color.setHex(0x8800ff);
      eff.mesh.material.opacity = 0.6;
      triggerScreenShake(0.1, 0.1);
    }
  } else {
    // Active damage zone
    eff.damageTickTimer -= dt;
    if (eff.damageTickTimer <= 0) {
      const dx = st.playerX - eff.x;
      const dz = st.playerZ - eff.z;
      if (dx * dx + dz * dz < eff.radius * eff.radius) {
        damagePlayer(eff.damage, '#8800ff', { type: 'shadowZone', tierName: 'Overlord', tier: 10, color: 0xffff66 });
      }
      eff.damageTickTimer = 0.5;
    }
    // Fade out over final 0.5s
    if (eff.life < 0.5) {
      eff.mesh.material.opacity = eff.life / 0.5 * 0.5;
    }
  }
}
```

**Attack 3 -- Summon Burst (Minion Spawn):**

The Overlord raises its arms (body tilts back), channels for 2 seconds while emitting dark particles, then spawns 4-6 tier 1-3 zombies in a ring around itself.

- Telegraph: 2s channel -- body tilts backward, dark red particles spiral inward toward the Overlord
- Spawn: 4-6 zombies at 50% HP, evenly spaced in a ring 6 units from the Overlord
- Despawn: Summoned zombies auto-die after 15 seconds (fade out + remove, no loot/XP)
- Cooldown: 12s base

Flag summoned zombies with `e.isSummoned = true` and `e.summonLifetime = 15` so the enemy update loop can tick down their lifetime and remove them without granting rewards:

```js
// In enemy update loop
if (e.isSummoned) {
  e.summonLifetime -= dt;
  if (e.summonLifetime <= 0) {
    e.dying = true;
    e.deathTimer = 0;
    e.noReward = true; // Skip XP/loot in death handler
  }
  // Visual: fade opacity in final 2 seconds
  if (e.summonLifetime < 2) {
    e.group.traverse(c => {
      if (c.isMesh && c.material) {
        c.material.transparent = true;
        c.material.opacity = e.summonLifetime / 2;
      }
    });
  }
}
```

**Attack 4 -- Death Beam (Sweeping Line):**

The Overlord charges for 2 seconds (crackling particles, body glows bright red), then fires a thick beam that sweeps 60 degrees over 2 seconds.

- Telegraph: 2s -- red energy particles converge on Overlord's "mouth" area, body material emissive ramps to full red
- Beam: A long thin box geometry (0.8 wide, 0.3 tall, 30 long) extending from the Overlord, rotating 60 degrees over 2 seconds
- Damage: 40 per hit, but only hits once per beam (use `beam.hasHitPlayer` flag)
- Safe zone: Behind the boss, or far enough to the side that the sweep passes before reaching you
- Cooldown: 15s base

```js
// Beam mesh
const beamGeo = new THREE.BoxGeometry(0.8, 0.3, 30);
const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0022, transparent: true, opacity: 0.8 });
const beam = new THREE.Mesh(beamGeo, beamMat);
beam.position.set(e.group.position.x, 1.5, e.group.position.z);
// Offset geometry so it extends forward from origin
beamGeo.translate(0, 0, -15);
scene.add(beam);

st.weaponEffects.push({
  mesh: beam,
  x: e.group.position.x, z: e.group.position.z,
  life: 2.0,
  maxLife: 2.0,
  type: 'deathBeam',
  startAngle: playerAngle - 30 * Math.PI / 180,
  sweepRange: 60 * Math.PI / 180,
  damage: 40 * diffDmgMult,
  hasHitPlayer: false,
  ownerY: 1.5,
});
```

Beam sweep logic in the effects update:
```js
if (eff.type === 'deathBeam') {
  const progress = 1 - (eff.life / eff.maxLife);
  const currentAngle = eff.startAngle + eff.sweepRange * progress;
  eff.mesh.rotation.y = currentAngle;
  eff.mesh.position.set(eff.x, eff.ownerY, eff.z);

  // Hit detection: check if player is within beam's swept area
  if (!eff.hasHitPlayer) {
    const dx = st.playerX - eff.x;
    const dz = st.playerZ - eff.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const angleToPlayer = Math.atan2(dz, dx);
    const angleDiff = Math.abs(angleToPlayer - currentAngle) % (Math.PI * 2);
    if (dist < 30 && dist > 2 && Math.min(angleDiff, Math.PI * 2 - angleDiff) < 0.05) {
      damagePlayer(eff.damage, '#ff0022', { type: 'deathBeam', tierName: 'Overlord', tier: 10, color: 0xffff66 });
      eff.hasHitPlayer = true;
      triggerScreenShake(0.3, 0.3);
    }
  }
}
```

**Attack 5 -- Dark Nova (Desperation, Phase 4 Only):**

The Overlord floats upward for 1 second, then slams down, sending a massive 30-unit expanding shockwave outward. The safe zone is WITHIN 4 units of the Overlord -- "hug the boss" mechanic.

This teaches an unintuitive but exciting lesson: sometimes safety is near the danger, not far from it. The telegraph is long enough and the visual clear enough that a 7-year-old can learn it after 1-2 deaths.

- Telegraph: 1s float-up (Overlord rises 3 units, dark red aura expands, screen starts shaking subtly)
- Slam: Overlord drops back down, ring expands from radius 4 to radius 30 over 2 seconds
- Damage: 50 per hit, but inner 4-unit radius is SAFE
- Visual: Use existing `bossShockwave` effect type but with a custom inner-safe-zone check
- Text: First time, floating text "GET CLOSE!" in green at the Overlord's position
- Cooldown: 20s base

```js
// Dark Nova -- reuse shockwave system but with safe zone
st.weaponEffects.push({
  mesh: novaMesh,
  x: e.group.position.x, z: e.group.position.z,
  life: 2.0, maxLife: 2.0,
  type: 'darkNova',
  radius: 4.0,
  maxRadius: 30,
  safeRadius: 4.0,
  damage: 50 * diffDmgMult,
  hasHitPlayer: false,
});
```

**Chill Mode Adjustments for All Overlord Attacks:**
- Death Bolt Volley: 2-bolt in Phase 1-2, 3-bolt in Phase 3+, speed 10 (0.6x of 16), damage 0.5x
- Shadow Zones: 2 zones in Phase 1, 3 in Phase 3, telegraph 2.25s (1.5x), damage 0.5x, tick every 0.75s instead of 0.5s
- Summon Burst: 3 zombies instead of 4-6, tier 1 only, cooldown 18s (1.5x)
- Death Beam: Telegraph 3s (1.5x), sweep over 3s (slower, easier to outrun), damage 0.5x
- Dark Nova: Telegraph float-up 2s (player has more time to run in), safe radius 6 instead of 4, damage 0.5x, ring expands over 3s instead of 2
- All cooldowns 1.5x longer
- Phase thresholds shifted: Phase 2 at 55%, Phase 3 at 30%, Phase 4 at 12%
- No Death Beam in Phase 3 in Chill (pushed to Phase 4 if it exists)

---

### Phase 4: Boss Entrance Sequence (Small-Medium)

**Deliverables:**
- Scale-up spawn animation (0 to full scale over 1.5 seconds)
- Title card floating text ("TITAN" / "OVERLORD" in gold/red)
- Ground crack particles radiating outward from spawn point
- Nearby low-tier zombies scatter (flee away from boss for 2 seconds)
- Entrance audio cue

**Research Basis:** Section 5 (boss entrance). "First impressions" is #6 on the research priority list.

**Estimated Complexity:** Small-Medium

**Dependencies:** Phase 1 (screen shake for entrance tremor)

**Implementation:**

Currently, bosses spawn via `createEnemy()` at challenge shrine activation (line 6271 of `game3d.js`) and immediately exist at full scale (`boss.group.scale.setScalar(BOSS_SCALE)`). The scale-up already partially exists in the enemy spawn animation at line 5085, which scales from 0 to 1 over the first frame. This needs to be extended specifically for bosses:

```js
// At boss creation, set entrance state
boss.entranceTimer = 1.5;
boss.entranceActive = true;
boss.group.scale.setScalar(0.01); // Start nearly invisible

// In enemy update loop, before attack logic
if (e.entranceActive) {
  e.entranceTimer -= dt;
  const t = 1 - (e.entranceTimer / 1.5);
  const easeOut = 1 - Math.pow(1 - t, 3); // cubic ease-out for dramatic pop
  const targetScale = e.isBoss ? BOSS_SCALE : (e.tier >= 9 ? 1.5 : 1);
  e.group.scale.setScalar(easeOut * targetScale);

  // Ground particles during growth
  if (Math.random() < 0.3) {
    const pa = Math.random() * Math.PI * 2;
    const pr = t * 5; // radius grows as boss grows
    spawnFireParticle(0x664422, e.group.position.x + Math.cos(pa) * pr, 0.2,
      e.group.position.z + Math.sin(pa) * pr, 0.6);
  }

  if (e.entranceTimer <= 0) {
    e.entranceActive = false;
    // Final slam effect
    triggerScreenShake(0.4, 0.5);

    // Title card
    const titleColor = e.tier >= 10 ? '#ff0044' : '#ffcc00';
    const titleName = e.tier >= 10 ? 'OVERLORD' : 'TITAN';
    addFloatingText(titleName, titleColor, e.group.position.x, e.group.position.y + 6, e.group.position.z, 3, true);
  }

  continue; // Skip attack logic and movement during entrance
}
```

Zombie scatter: When a boss entrance begins, iterate `st.enemies` and for any tier 1-3 zombie within 15 units, set a temporary `e.fleeTimer = 2` and `e.fleeFromX/Z` pointing away from the boss. In the enemy movement code, check for `fleeTimer > 0` and invert movement direction.

**Chill Mode:** No special adjustments needed -- entrance is purely cosmetic.

---

### Phase 5: Boss Audio Expansion (Small)

**Deliverables:**
- 6-8 new sound event IDs in the audio system
- Placeholder mappings to existing Sound Pack Alpha files (reuse growls, explosions, gas sounds creatively)
- Notes on which sounds need Sound Pack Beta originals

**Research Basis:** Section 5 (audio cues per attack). The research specifies distinct sounds per attack type with different frequency ranges.

**Estimated Complexity:** Small

**Dependencies:** Phases 2 and 3 (attacks must exist before their audio can be wired in)

**New Audio Event IDs:**

| Event ID | Used By | Sound Pack Alpha Placeholder | Sound Pack Beta Need |
|----------|---------|------------------------------|----------------------|
| `sfx_boss_entrance` | Phase 4 entrance sequence | `zombie-4.ogg` + `explode-1.ogg` (play both) | Deep rumbling crescendo |
| `sfx_boss_phase_transition` | Phase system threshold | `rawr-2.ogg` (level-up sound works as a sting) | Dramatic chord sting |
| `sfx_boss_charge_telegraph` | Titan Charge telegraph | `leapord-growl-1.ogg` | Growl + rushing wind |
| `sfx_boss_slam_impact` | Titan Slam/Bone Barrage | `explode-1.ogg` | Heavy boom with debris |
| `sfx_boss_death_bolt` | Overlord Volley fire | `big-pew-1.ogg` | Rising whine |
| `sfx_boss_shadow_zone` | Shadow Zones telegraph | `gas-1.ogg` | Low rumble |
| `sfx_boss_summon` | Summon Burst channel | `zombie-5.ogg` | Creepy groan building |
| `sfx_boss_death_beam` | Death Beam charge + fire | `pew-5x-1.ogg` | Electric crackling then sustained buzz |
| `sfx_boss_dark_nova` | Dark Nova float-up | `zombie-4.ogg` + `rawr-1.ogg` | Massive deep boom |

All placeholder mappings reuse existing files from the 40-sound alpha pack. They will sound "off" but functional -- the mouth-made SFX library has enough growls, explosions, and whooshes to cover the basics. Sound Pack Beta should prioritize boss sounds since these are the highest-drama moments in the game.

Add to `SOUND_MAP` in `js/3d/audio.js`:
```js
// --- Boss ---
sfx_boss_entrance: ['zombie-4.ogg'],
sfx_boss_phase_transition: ['rawr-2.ogg'],
sfx_boss_charge_telegraph: ['leapord-growl-1.ogg'],
sfx_boss_slam_impact: ['explode-1.ogg'],
sfx_boss_death_bolt: ['big-pew-1.ogg'],
sfx_boss_shadow_zone: ['gas-1.ogg'],
sfx_boss_summon: ['zombie-5.ogg'],
sfx_boss_death_beam: ['pew-5x-1.ogg'],
sfx_boss_dark_nova: ['zombie-4.ogg'],
```

**Chill Mode:** No audio adjustments -- sounds play identically in all modes.

---

## 3. Specific Boss Designs

### Titan (Tier 9) -- "The Unstoppable Brute"

**Fantasy:** A massive zombie that has absorbed so many others it barely looks human. It solves every problem by hitting things harder. Its attacks are all physical -- slams, charges, thrown debris. It is slow between attacks but devastating when it connects.

**Voxel Visual Identity:**
- Existing: Green-brown body (0x990808), glowing yellow eyes (0xffee44), tier 9 aura particles, 2.7x scale
- Phase 2 additions: Aura brightens from dark red to orange, body cracks appear (add 2-3 thin black box meshes across torso as "fractures")
- Phase 3 additions: Aura shifts to bright red with faster pulse, "steam" particles rise from body (white-gray fire particles going upward), eyes brighten to white

**Attack Repertoire (4 attacks):**

1. **Titan Slam** (existing, enhanced) -- Pounds the ground. 8-unit damage radius. Red ring telegraph. Body drops down then springs back up. 35 damage. Screen shake 0.3/0.3s.

2. **Shockwave** (existing, enhanced) -- Expanding orange ring travels outward to 20 units. 20 damage on contact. Player can jump over it (if on a plateau edge) or outrun it. Screen shake 0.15/0.2s.

3. **Bone Barrage** (new) -- 4-6 arcing bone clusters land near player with red circle warnings. 15 damage per bone. Teaches players to watch the ground and keep moving. Screen shake 0.15/0.15s per impact.

4. **Titan Charge** (new) -- Red aim line locks direction, charges 15 units. 30 damage. 2-second recovery stun. Teaches players to dodge perpendicular. Screen shake 0.4/0.3s on player hit.

5. **Ground Fissures** (new) -- 3 crack lines in forward arc erupt after 1.2s. 20 damage. Teaches players to stay to the sides, not directly in front.

**Dodge Strategy by Attack:**
| Attack | How to Dodge | Kid-Friendly Description |
|--------|-------------|--------------------------|
| Slam | Run away when ring appears | "Red circle = run away!" |
| Shockwave | Run outward faster than the ring | "Orange ring = keep running!" |
| Bone Barrage | Move away from red circles on ground | "Red dots = don't stand there!" |
| Titan Charge | Step sideways when you see the red line | "Red line = dodge sideways!" |
| Ground Fissures | Move to the side, not in front | "Brown lines = go sideways!" |

---

### Overlord (Tier 10) -- "The Dark Commander"

**Fantasy:** The pinnacle zombie. It does not just attack -- it commands the battlefield. It creates hazard zones, summons minions, and fires powerful ranged attacks. It fights like a dark sorcerer, not a brawler.

**Voxel Visual Identity:**
- Existing: Deep red body (0xaa0000), bright yellow eyes (0xffff66), crown of fire (emissive blocks on head), tier 10 aura, 3.0x scale
- Phase 2 additions: Crown fire particles become more frequent, body develops purple tint (lerp body color toward 0x880044)
- Phase 3 additions: Crown fire turns blue-white, aura becomes double-layered (inner red + outer purple ring)
- Phase 4 additions: Entire body pulses with emissive glow (sinusoidal emissive intensity), move speed +30%, "desperation mode" particle trail while moving

**Attack Repertoire (5 attacks):**

1. **Death Bolt Volley** (existing, expanded) -- 3-bolt spread (5-bolt in Phase 3+). Aimed with target leading. 30 damage per bolt. Red aim lines telegraph the spread arc.

2. **Shadow Zones** (new) -- 3-5 dark circles appear on ground near player, erupt after 1.5s into persistent damage zones (10 per 0.5s for 3s). Forces constant repositioning. Teaches players to never stand still.

3. **Summon Burst** (new) -- Channels for 2s, spawns 4-6 weak zombies in a ring. Despawn after 15s. Adds chaos and forces the player to decide: kill summons or keep hitting the boss?

4. **Death Beam** (new) -- 2s charge, then a thick beam sweeps 60 degrees. 40 damage. Player must run perpendicular or get behind the boss. The signature "oh no" moment.

5. **Dark Nova** (new, Phase 4 only) -- Floats up, slams down, 30-unit expanding ring. 50 damage. BUT: safe zone within 4 units of the boss. The first time this fires, floating text "GET CLOSE!" appears in green. Teaches the counterintuitive "hug the boss" lesson.

**Dodge Strategy by Attack:**
| Attack | How to Dodge | Kid-Friendly Description |
|--------|-------------|--------------------------|
| Death Bolt Volley | Move between the bolts | "Red balls = find the gap!" |
| Shadow Zones | Move away from dark circles | "Purple circles = move away!" |
| Summon Burst | Kill summons or ignore them | "Little zombies = squish them fast!" |
| Death Beam | Run sideways or get behind | "Red laser = run sideways!" |
| Dark Nova | Run TOWARD the boss | "Big ring = hug the boss!" |

---

## 4. Chill Mode Calibration

Chill Mode already applies 0.7x enemy speed, 1.5x powerups, 1.5x HP, and 0.5x score. For bosses, the following additional scaling ensures the experience remains "scary but survivable":

### Global Boss Chill Modifiers

| Parameter | Normal | Chill | Ratio |
|-----------|--------|-------|-------|
| Telegraph duration | 1.0x | 1.5x | All attacks get 50% more warning time |
| Projectile speed | 1.0x (16 units/s bolts) | 0.6x (10 units/s) | Bolts are easier to sidestep |
| Attack cooldowns | 1.0x | 1.5x | Longer breathers between attacks |
| Attack damage | 1.0x | 0.5x | Combined with 1.5x HP, deaths take 3x as many hits |
| Projectile count | Full | Reduced (see per-attack) | Fewer things to track |
| Phase thresholds | Standard | Delayed (see below) | More time in easier phases |

### Chill Mode Phase Thresholds

**Titan:**
| Phase | Normal | Chill |
|-------|--------|-------|
| 1 (Slam + Shockwave only) | >60% HP | >60% HP (same -- Phase 1 is already easy) |
| 2 (+ Bone Barrage) | 60-30% | 40-15% |
| 3 (+ Titan Charge, Ground Fissures) | <30% | <15% |

**Overlord:**
| Phase | Normal | Chill |
|-------|--------|-------|
| 1 (Volley + Shadow Zones) | >75% HP | >75% HP (same) |
| 2 (+ Summon Burst) | 75-50% | 55-30% |
| 3 (+ Death Beam, 5-bolt) | 50-25% | 30-12% |
| 4 (+ Dark Nova, speed boost) | <25% | <12% |

### Per-Attack Chill Specifics

**Bone Barrage:** 4 bones instead of 6. Each bone's ground marker stays visible for 1.2s instead of 0.8s. Bone damage: 8 (vs 15).

**Titan Charge:** Charge speed 2x instead of 3x (slower, more time to dodge). Recovery stun: 3s instead of 2s (bigger punishment window for the boss). Damage: 15 (vs 30). Telegraph: 2.25s instead of 1.5s.

**Ground Fissures:** 2 fissures in a narrower 80-degree arc instead of 3 in 120 degrees. Telegraph: 1.8s instead of 1.2s. Damage: 10 (vs 20).

**Death Bolt Volley:** 2-bolt spread in Phases 1-2 (instead of 3), 3-bolt in Phase 3+ (instead of 5). Speed 10 instead of 16. Damage: 15 per bolt (vs 30).

**Shadow Zones:** 2 zones instead of 3-5. Telegraph: 2.25s instead of 1.5s. Damage tick: every 0.75s instead of 0.5s. Damage per tick: 5 (vs 10).

**Summon Burst:** 3 zombies instead of 4-6, all tier 1 (instead of 1-3). Despawn after 10s instead of 15s. Cooldown: 18s instead of 12s.

**Death Beam:** Sweep over 3s instead of 2s (slower rotation = easier to outrun). Beam width: 0.6 instead of 0.8. Damage: 20 (vs 40). Telegraph: 3s instead of 2s.

**Dark Nova:** Safe radius 6 units instead of 4 (bigger safe zone near boss). Ring expands over 3s instead of 2s (slower, more time to get close). Float-up telegraph: 2s instead of 1s. Damage: 25 (vs 50). First-time "GET CLOSE!" text appears in larger font.

---

## 5. Audio & Visual Juice

### Screen Shake Catalog

| Event | Amplitude | Duration | Notes |
|-------|-----------|----------|-------|
| Titan Slam impact | 0.3 | 0.3s | Strong, short |
| Titan Charge start | 0.2 | 0.2s | Medium rumble |
| Titan Charge player hit | 0.4 | 0.3s | Biggest non-nova shake |
| Bone Barrage per impact | 0.15 | 0.15s | Staccato rhythm as bones land |
| Ground Fissure eruption | 0.25 | 0.25s | One strong pulse |
| Shockwave launch | 0.15 | 0.2s | Moderate |
| Death Bolt Volley fire | 0.1 | 0.1s | Small snap |
| Shadow Zone eruption | 0.1 | 0.1s | Per zone |
| Summon Burst completion | 0.15 | 0.2s | When zombies appear |
| Death Beam fire | 0.2 | 0.3s | Sustained-feeling |
| Dark Nova slam | 0.5 | 0.5s | Maximum shake in the game |
| Boss entrance complete | 0.4 | 0.5s | Dramatic arrival |
| Phase transition | 0.3 | 0.4s | Alert pulse |

### Boss Entrance Sequence (1.5 seconds)

1. **t=0.0s:** Boss mesh appears at scale 0.01. `sfx_boss_entrance` plays. Camera does NOT zoom in -- the player needs to keep awareness of surroundings.
2. **t=0.0-1.5s:** Boss scales up with cubic ease-out (fast growth then settling). Ground crack particles radiate outward (reuse `spawnFireParticle` with brown/dark colors). Nearby tier 1-3 zombies within 15 units set `fleeTimer = 2`.
3. **t=1.5s:** Boss reaches full scale. Final screen shake (0.4, 0.5s). Title card floating text: "TITAN" in gold (#ffcc00) or "OVERLORD" in red (#ff0044), displayed for 3 seconds, using the existing `addFloatingText` with `important=true`.
4. **t=1.5s+:** Boss is fully active, begins normal attack timer countdown.

### Phase Transition Effects

When a boss enters a new phase:
1. Screen shake (0.3, 0.4s)
2. `sfx_boss_phase_transition` plays
3. Floating text: "TITAN ENRAGED!" (Phase 2), "TITAN BERSERK!" (Phase 3), "OVERLORD AWAKENS!" (Phase 2), "OVERLORD FURIOUS!" (Phase 3), "DARK NOVA UNLOCKED!" (Phase 4)
4. All boss body meshes flash white for 0.3s (reuse the existing `_attackFlashTimer` mechanism)
5. Aura color shifts (implemented in Phase 1)
6. Brief 0.5s pause in attack timer -- the boss "poses" during transition, giving the player a moment to react

### Audio Cue Design (Mouth-Made SFX Context)

The Sound Pack Alpha contains mouth-made sounds -- growls, explosions, "pew" sounds, gas/fart noises, and zombie groans. For boss attacks, the key principle is **distinct frequency/character per attack type** so the player learns "that sound means THIS attack":

- **Ground attacks** (Slam, Fissures, Dark Nova): Use low-register sounds -- `explode-1.ogg`, `zombie-4.ogg`
- **Projectile attacks** (Death Bolt, Bone Barrage): Use sharp/percussive sounds -- `big-pew-1.ogg`, `pew-3x-1.ogg`
- **Sustained attacks** (Death Beam, Shadow Zones): Use continuous-sounding files -- `gas-1.ogg`, `pew-5x-1.ogg`
- **Creature effects** (Summon, Charge): Use vocal sounds -- `zombie-5.ogg`, `leapord-growl-1.ogg`
- **Transitions** (Entrance, Phase change): Use the most "dramatic" sounds -- `rawr-2.ogg`, `rawr-1.ogg`

Sound Pack Beta priority list for boss sounds (what to record):
1. Rising whine / energy charge (for Death Bolt telegraph)
2. Deep sustained rumble (for Shadow Zones)
3. Electric crackling (for Death Beam)
4. Dramatic orchestral sting (for phase transitions) -- or a dramatic mouth-made "DUN DUN DUNNNN"
5. Heavy footstep sequence accelerating (for Titan Charge)

---

## 6. Risk Assessment

### Technical Risks

**Risk 1: game3d.js monolith bloat (HIGH)**
The main game file is already ~4500 lines. Adding 5+ new attack types with their telegraph/fire/update logic could push it past 5000 lines, making it increasingly difficult to navigate and debug.

*Mitigation:* Extract boss attack logic into a new module `js/3d/boss-attacks.js`. This module would export functions like `updateBossAttacks(e, dt, st)`, `fireTitanBoneBarrage(e, scene, st)`, etc. The main loop calls these functions but the logic lives in the module. This extraction is itself a bead-sized task and should happen BEFORE the attack implementation beads.

**Risk 2: Three.js geometry/material leaks (MEDIUM)**
Each boss attack creates temporary meshes (telegraphs, projectiles, zones, beams). If any code path fails to dispose geometry and materials, it leaks GPU memory. The existing codebase already has this pattern with `specialAttackMesh` cleanup, but the new attacks create MORE temporary objects.

*Mitigation:* Every new mesh creation must have a matching disposal in both the "attack fires" cleanup and the "enemy dies mid-attack" cleanup. Create a utility function `disposeTempMesh(mesh, scene)` that handles the null-check + geometry dispose + material dispose + scene.remove pattern, avoiding the copy-paste that currently exists at lines 5368-5382.

**Risk 3: Overlord attack density causing lag (MEDIUM)**
Shadow Zones create 3-5 persistent meshes. Summon Burst adds 4-6 new enemy entities. Death Beam is a large mesh. If an Overlord fires rapidly (Phase 4 with -20% cooldowns), the scene could have 15+ extra objects simultaneously.

*Mitigation:* Cap active effects per boss. Maximum 2 sets of Shadow Zones active at once (if a new set spawns, old set fades immediately). Maximum 6 summoned zombies alive at once (if a new Summon fires while 6 exist, oldest batch despawns). Monitor `renderer.info.memory` during testing.

**Risk 4: Phase transitions re-triggering (LOW)**
If boss HP fluctuates (e.g., regen effect or a bug), the phase could toggle back and forth, spamming transition effects.

*Mitigation:* Phase tracking should be one-directional: `e.bossPhase = Math.max(e.bossPhase, newPhase)`. Phase only increases, never decreases.

**Risk 5: Chill Mode undertesting (MEDIUM)**
With 5 boss attacks each having 4-6 Chill Mode parameter overrides, the interaction matrix is large. An attack could be too easy (no challenge) or accidentally still too hard (missed a parameter).

*Mitigation:* After implementation, run a dedicated Chill Mode playtest bead. Use a debug key to spawn bosses at specific HP percentages to test each phase/attack combination in Chill Mode specifically.

### Design Risks

**Risk 6: Attack overwhelm for young players (MEDIUM)**
Introducing 4-5 new attacks per boss all at once could confuse players who were used to the simple slam/bolt pattern.

*Mitigation:* The phase system IS the mitigation. Phase 1 only uses 1-2 attacks. By the time the player sees the boss's full repertoire, they have already learned the earlier attacks. The most complex attacks (Dark Nova, Death Beam) only appear when the boss is near death, so the player has had the entire fight to learn.

**Risk 7: Boss fights lasting too long (LOW)**
More attacks = more time dodging = longer fights. If the player's DPS is low relative to boss HP scaling (`baseTierHP * (1 + gameTimeMinutes * 0.08)`), fights could drag.

*Mitigation:* The exploitable windows (Titan Charge 2s recovery, Summon Burst channel time, phase transition pause) are intentional DPS windows. If playtesting shows fights are too long, reduce `BOSS_HP_MULT` from 25 or add a "rage timer" that increases player damage to the boss after 60 seconds of combat.

---

## 7. Beads Sketch

The following bead IDs continue from the current highest (BD-217). Each bead is scoped to be completable by a single agent in one session.

### BD-218: Screen shake utility + boss phase system (Foundation)

**Category:** Engine -- Combat Feel
**Priority:** P1
**File(s):** `js/game3d.js` (render loop, enemy update)
**Complexity:** Small
**Dependencies:** None

Add `triggerScreenShake(amplitude, duration)` function, `st.screenShake`/`st.screenShakeAmp` state variables, and camera offset logic in the render loop. Add `e.bossPhase` property to tier 9/10 enemies, phase threshold checks each frame, one-directional phase ratchet (`Math.max`), and phase transition effects (floating text, body flash, aura shift, screen shake, `sfx_boss_phase_transition`).

---

### BD-219: Boss attack module extraction

**Category:** Refactor -- Code Organization
**Priority:** P1
**File(s):** `js/game3d.js` (lines ~5150-5390), new file `js/3d/boss-attacks.js`
**Complexity:** Medium
**Dependencies:** None (can parallel with BD-218)

Extract all tier 9/10 attack logic from `game3d.js` into a new ES module `js/3d/boss-attacks.js`. Export `updateBossAttacks(e, dt, st, scene, helpers)` where `helpers` bundles the needed functions (`damagePlayer`, `spawnFireParticle`, `addFloatingText`, `triggerScreenShake`, `playSound`, `createEnemy`). Extract the `bossShockwave` effect handler as well. The existing behavior must be 100% identical after extraction -- no new attacks in this bead.

---

### BD-220: Titan Bone Barrage attack

**Category:** Gameplay -- Boss Attacks
**Priority:** P1
**File(s):** `js/3d/boss-attacks.js`, `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system), BD-219 (module extraction)

Implement the Bone Barrage attack for the Titan: lobbed bone-colored voxel clusters, red ground circle telegraphs (0.8s), parabolic arc trajectories, 15 damage per bone, 4-6 bones. Available from Phase 2. Add `sfx_boss_slam_impact` audio event with placeholder mapping. Chill Mode: 4 bones, 1.2s telegraph, 8 damage.

---

### BD-221: Titan Charge + Ground Fissures attacks

**Category:** Gameplay -- Boss Attacks
**Priority:** P1
**File(s):** `js/3d/boss-attacks.js`, `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system), BD-219 (module extraction)

Implement Titan Charge (aim line telegraph, 1.5s, 3x speed dash, 30 damage, 2s recovery stun) and Ground Fissures (3 crack lines in forward arc, 1.2s telegraph, 20 damage). Both available from Phase 3. Add `sfx_boss_charge_telegraph` audio event. Chill Mode: Charge at 2x speed with 2.25s telegraph and 15 damage; 2 fissures with 1.8s telegraph and 10 damage. Replace the current odd/even slam/shockwave alternation with weighted random selection from the phase-appropriate attack pool.

---

### BD-222: Overlord Death Bolt Volley + Shadow Zones

**Category:** Gameplay -- Boss Attacks
**Priority:** P1
**File(s):** `js/3d/boss-attacks.js`, `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system), BD-219 (module extraction)

Upgrade single Death Bolt to 3-bolt spread (15-degree arc, center bolt leads target). Add Shadow Zones: 3-5 dark circles near player, 1.5s telegraph, erupt into persistent damage zones (10 per 0.5s for 3s). Add `sfx_boss_death_bolt` and `sfx_boss_shadow_zone` audio events. Chill Mode: 2-bolt volley at speed 10, 2 shadow zones with 2.25s telegraph.

---

### BD-223: Overlord Summon Burst + Death Beam

**Category:** Gameplay -- Boss Attacks
**Priority:** P1
**File(s):** `js/3d/boss-attacks.js`, `js/3d/audio.js`
**Complexity:** Large
**Dependencies:** BD-218 (phase system), BD-219 (module extraction)

Implement Summon Burst (2s channel, 4-6 tier 1-3 zombies in ring, 50% HP, 15s despawn, no loot/XP) and Death Beam (2s charge, thick beam sweeps 60 degrees over 2s, 40 damage, single-hit). Add `e.isSummoned`, `e.summonLifetime`, `e.noReward` flags to enemy state. Add `sfx_boss_summon` and `sfx_boss_death_beam` audio events. Cap active summons at 6 and active beams at 1. Chill Mode: 3 tier-1 summons with 10s despawn; beam sweeps over 3s with 3s telegraph and 20 damage.

---

### BD-224: Overlord Dark Nova (Phase 4 desperation attack)

**Category:** Gameplay -- Boss Attacks
**Priority:** P2
**File(s):** `js/3d/boss-attacks.js`, `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system), BD-219 (module extraction), BD-222 (Overlord attack pool must exist)

Implement Dark Nova: Overlord floats up 3 units over 1s, slams down, 30-unit expanding shockwave over 2s, 50 damage, safe zone within 4 units. First-encounter "GET CLOSE!" floating text in green. Add `sfx_boss_dark_nova` audio event. Add Phase 4 Overlord move speed +30%. Chill Mode: 2s float-up, safe radius 6, ring over 3s, 25 damage.

---

### BD-225: Boss entrance sequence

**Category:** Gameplay -- Boss Presentation
**Priority:** P2
**File(s):** `js/3d/boss-attacks.js` or `js/game3d.js` (challenge shrine activation block), `js/3d/audio.js`
**Complexity:** Small-Medium
**Dependencies:** BD-218 (screen shake)

Implement boss spawn-in animation: scale from 0.01 to full over 1.5s with cubic ease-out, ground crack particles, title card floating text ("TITAN"/"OVERLORD"), screen shake on completion, nearby tier 1-3 zombies scatter for 2 seconds. Add `sfx_boss_entrance` audio event. Bosses skip attack logic and movement during entrance.

---

### BD-226: Boss audio placeholder pass (Sound Pack Alpha)

**Category:** Audio -- Boss SFX
**Priority:** P2
**File(s):** `js/3d/audio.js`
**Complexity:** Small
**Dependencies:** BD-220 through BD-225 (attacks must exist to wire audio)

Add all 9 new `sfx_boss_*` event IDs to `SOUND_MAP` with placeholder mappings to existing Sound Pack Alpha files. Verify every boss attack plays an appropriate sound. Document which events need Sound Pack Beta replacements. Ensure `MAX_CONCURRENT` (currently 12) is sufficient for boss fights with many overlapping sounds -- may need to increase to 16.

---

### BD-227: Boss battle Chill Mode playtest + tuning

**Category:** QA -- Balance
**Priority:** P2
**File(s):** `js/3d/boss-attacks.js`, `js/3d/constants.js`
**Complexity:** Small
**Dependencies:** BD-220 through BD-225 (all attacks implemented)

Add a debug key (Shift+B) that spawns a tier 9 or tier 10 boss at the player's position at a specified HP percentage (cycle through 100%, 75%, 50%, 25%, 10% with repeated presses). Playtest every attack in both Normal and Chill Mode. Document any tuning adjustments needed. Remove debug key before merge (or gate behind a `DEBUG` constant).

---

## Dependency Graph

```
BD-218 (Foundation) ──┬──> BD-220 (Bone Barrage)
                      │
BD-219 (Extraction) ──┼──> BD-221 (Charge + Fissures)
                      │
                      ├──> BD-222 (Volley + Shadow Zones)
                      │
                      ├──> BD-223 (Summon + Beam)
                      │
                      ├──> BD-224 (Dark Nova)
                      │
                      └──> BD-225 (Entrance Sequence)

BD-220 through BD-225 ──> BD-226 (Audio Pass)

BD-220 through BD-225 ──> BD-227 (Chill Playtest)
```

**Parallelization:** BD-218 and BD-219 can run in parallel. Once both complete, BD-220, BD-221, BD-222, BD-223, BD-224, and BD-225 can all run in parallel (they each add independent attacks to the module). BD-226 and BD-227 must wait for all attack beads to merge.

**Maximum parallel agents:** 2 for Phase 1 (BD-218 + BD-219), then up to 6 for Phases 2-4 (BD-220 through BD-225), then 2 for Phase 5 (BD-226 + BD-227). Total calendar time with full parallelization: 3 batches.
