# Beads: BD-218 through BD-227

**Date:** 2026-02-24
**Source:** Boss Battle Forward Plan
**Forward Plan:** `docs/forward-plans/boss-battle-forward-plan.md`
**Research:** `docs/research/boss-battle-design.md`
**Implements:** BD-215 (Boss zombies need diverse, learnable attack patterns)

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Foundation or core feature required by other beads | Next sprint (batch 1-2) |
| **P2** | Feature or polish that builds on P1 foundations | Following sprint (batch 2-3) |

---

## P1 -- Foundation

---

### BD-218: Screen shake utility + boss HP phase system

**Category:** Engine -- Combat Feel (Foundation)
**Priority:** P1
**File(s):** `js/game3d.js` (render loop, enemy update, state initialization)
**Complexity:** Small
**Dependencies:** None

**Description:** Screen shake is completely absent from the codebase. The boss phase system (`e.bossPhase`) is needed by every subsequent boss attack bead. This bead adds both as foundational infrastructure.

**Implementation -- Part A: Screen Shake Utility**

Add two new state variables in the state initialization block:

```js
st.screenShake = 0;       // remaining shake duration (seconds)
st.screenShakeAmp = 0;    // current amplitude (world units)
```

Add the utility function (anywhere in `game3d.js` module scope):

```js
function triggerScreenShake(amplitude, duration) {
  st.screenShake = Math.max(st.screenShake, duration);
  st.screenShakeAmp = Math.max(st.screenShakeAmp, amplitude);
}
```

In the render loop, AFTER the camera position is set but BEFORE `renderer.render()`, add the shake offset:

```js
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

The `Math.max` calls in `triggerScreenShake` ensure that overlapping shakes use the strongest amplitude and longest duration, not cumulative values.

**Implementation -- Part B: Boss HP Phase System**

Add `bossPhase` to tier 9/10 enemies at creation time (in `createEnemy()` where boss properties are set):

```js
if (tier === 9 || tier >= 10) {
  e.bossPhase = 1;
}
```

In the enemy update loop, inside the boss attack update block (where tier 9/10 special attacks are handled), add phase threshold checks BEFORE the attack selection logic:

```js
const hpPct = e.hp / e.maxHp;
const prevPhase = e.bossPhase;

if (e.tier === 9) {
  if (st.chillMode) {
    e.bossPhase = Math.max(e.bossPhase, hpPct > 0.6 ? 1 : hpPct > 0.15 ? 2 : 3);
  } else {
    e.bossPhase = Math.max(e.bossPhase, hpPct > 0.6 ? 1 : hpPct > 0.3 ? 2 : 3);
  }
} else if (e.tier >= 10) {
  if (st.chillMode) {
    e.bossPhase = Math.max(e.bossPhase, hpPct > 0.75 ? 1 : hpPct > 0.3 ? 2 : hpPct > 0.12 ? 3 : 4);
  } else {
    e.bossPhase = Math.max(e.bossPhase, hpPct > 0.75 ? 1 : hpPct > 0.5 ? 2 : hpPct > 0.25 ? 3 : 4);
  }
}
```

The `Math.max` wrapping ensures phases only increase, never decrease (one-directional ratchet). This prevents phase flip-flopping if HP fluctuates.

When a phase transition occurs, fire visual/audio feedback:

```js
if (prevPhase !== undefined && e.bossPhase > prevPhase) {
  const phaseLabels = {
    9:  { 2: 'TITAN ENRAGED!', 3: 'TITAN BERSERK!' },
    10: { 2: 'OVERLORD AWAKENS!', 3: 'OVERLORD FURIOUS!', 4: 'DARK NOVA UNLOCKED!' },
  };
  const label = phaseLabels[e.tier]?.[e.bossPhase];
  if (label) {
    addFloatingText(label, '#ffcc00', e.group.position.x, e.group.position.y + 5, e.group.position.z, 3, true);
  }
  triggerScreenShake(0.3, 0.4);
  playSound('sfx_boss_phase_transition');

  // Body flash white for 0.3s (reuse existing _attackFlashTimer mechanism)
  e._attackFlashTimer = 0.3;

  // Aura color shift
  if (e.bossAuraMesh) {
    const auraColors = { 1: 0xcc2200, 2: 0xff4400, 3: 0xff0000 };
    e.bossAuraMesh.material.color.setHex(auraColors[e.bossPhase] || 0xff0000);
  }

  // Brief 0.5s attack timer pause -- boss "poses" during transition
  if (e.specialAttackTimer !== undefined) {
    e.specialAttackTimer = Math.max(e.specialAttackTimer, 0.5);
  }
}
```

**Phase Threshold Reference Tables:**

Titan (tier 9):

| Phase | Normal HP Range | Chill HP Range | Available Attacks |
|-------|-----------------|----------------|-------------------|
| 1 | >60% | >60% | Slam, Shockwave |
| 2 | 60-30% | 40-15% | + Bone Barrage |
| 3 | <30% | <15% | + Titan Charge, Ground Fissures |

Overlord (tier 10):

| Phase | Normal HP Range | Chill HP Range | Available Attacks |
|-------|-----------------|----------------|-------------------|
| 1 | >75% | >75% | Death Bolt Volley, Shadow Zones |
| 2 | 75-50% | 55-30% | + Summon Burst |
| 3 | 50-25% | 30-12% | + Death Beam, 5-bolt Volley |
| 4 | <25% | <12% | + Dark Nova, +30% move speed |

**Acceptance Criteria:**
- `triggerScreenShake(amplitude, duration)` function exists and can be called from anywhere in module scope
- Screen shake visually offsets the camera with linear decay, then resets cleanly
- Overlapping shake events take the maximum amplitude/duration (no cumulative amplification)
- Tier 9 enemies have `e.bossPhase` initialized to 1 at creation
- Tier 10 enemies have `e.bossPhase` initialized to 1 at creation
- Phase transitions fire exactly once per threshold crossing (no repeat triggers)
- Phase transitions produce: floating text label, screen shake (0.3, 0.4s), `sfx_boss_phase_transition` sound, body flash, aura color shift, 0.5s attack timer pause
- Chill Mode uses shifted thresholds (Titan Phase 2 at 40%, Phase 3 at 15%; Overlord Phase 2 at 55%, Phase 3 at 30%, Phase 4 at 12%)
- Phase never decreases (one-directional ratchet via `Math.max`)
- No regression to existing boss slam/shockwave/death bolt behavior

---

### BD-219: Boss HP phase visual polish (Titan + Overlord appearance by phase)

**Category:** Visual -- Boss Presentation
**Priority:** P1
**File(s):** `js/game3d.js` (enemy update loop, boss rendering section)
**Complexity:** Small-Medium
**Dependencies:** BD-218 (phase system must exist)

**Description:** Each boss phase should have distinct visual characteristics so the player can SEE that the boss has entered a new phase. This bead adds per-phase visual upgrades to both the Titan and Overlord models.

**Implementation -- Titan Visual Phases:**

In the enemy update loop, after the phase check from BD-218, add visual updates based on `e.bossPhase`:

```js
if (e.tier === 9) {
  if (e.bossPhase >= 2 && !e._phase2Visuals) {
    // Phase 2: Aura brightens, add body "fracture" lines
    e._phase2Visuals = true;
    // Add 2-3 thin black box meshes across torso as "cracks"
    for (let i = 0; i < 3; i++) {
      const crackGeo = new THREE.BoxGeometry(0.05, 0.3 + Math.random() * 0.2, 0.02);
      const crackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const crack = new THREE.Mesh(crackGeo, crackMat);
      crack.position.set(
        (Math.random() - 0.5) * 0.4,
        0.5 + Math.random() * 0.5,
        0.25
      );
      crack.rotation.z = (Math.random() - 0.5) * 0.5;
      e.group.add(crack);
    }
  }
  if (e.bossPhase >= 3 && !e._phase3Visuals) {
    // Phase 3: Eyes brighten to white, "steam" particles
    e._phase3Visuals = true;
    e.group.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        const hex = child.material.color.getHex();
        if (hex === 0xffee44) {
          // Eye meshes -- brighten to white
          child.material.color.setHex(0xffffff);
          child.material.emissive = new THREE.Color(0xffffff);
          child.material.emissiveIntensity = 0.5;
        }
      }
    });
    e._steamParticles = true; // Flag for steam particle emission in update loop
  }
}
```

For the steam particles (Phase 3 Titan), add in the enemy rendering section:

```js
if (e._steamParticles && Math.random() < 0.15) {
  spawnFireParticle(0xcccccc,
    e.group.position.x + (Math.random() - 0.5) * 0.8,
    e.group.position.y + 1.5,
    e.group.position.z + (Math.random() - 0.5) * 0.8,
    0.8
  );
}
```

**Implementation -- Overlord Visual Phases:**

```js
if (e.tier >= 10) {
  if (e.bossPhase >= 2 && !e._phase2Visuals) {
    // Phase 2: Crown fire particles more frequent, body purple tint
    e._phase2Visuals = true;
    e._crownParticleRate = 0.3; // Increased from default
    // Lerp body color toward purple
    e.group.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        const hex = child.material.color.getHex();
        if (hex === 0xaa0000) {
          child.material.color.setHex(0x880044); // Purple tint
        }
      }
    });
  }
  if (e.bossPhase >= 3 && !e._phase3Visuals) {
    // Phase 3: Crown fire turns blue-white, double-layer aura
    e._phase3Visuals = true;
    e._crownFireColor = 0xccccff; // Blue-white crown fire
  }
  if (e.bossPhase >= 4 && !e._phase4Visuals) {
    // Phase 4: Pulsing emissive glow, particle trail
    e._phase4Visuals = true;
    e._desperationPulse = true;
  }

  // Phase 4 pulsing emissive (every frame)
  if (e._desperationPulse) {
    const pulse = 0.3 + 0.3 * Math.sin(performance.now() * 0.005);
    e.group.traverse(child => {
      if (child.isMesh && child.material) {
        if (!child.material.emissive) child.material.emissive = new THREE.Color(0xff0044);
        child.material.emissiveIntensity = pulse;
      }
    });
  }
}
```

**Acceptance Criteria:**
- Titan Phase 2: visible black "crack" lines appear on the body
- Titan Phase 3: eyes turn white with emissive glow, gray-white steam particles rise from body
- Overlord Phase 2: body shifts to purple tint, crown fire particles increase
- Overlord Phase 3: crown fire turns blue-white
- Overlord Phase 4: entire body pulses with sinusoidal emissive glow
- Visual changes are additive (Phase 3 keeps Phase 2 visuals)
- Phase visual flags prevent duplicate mesh creation (`_phase2Visuals`, etc.)
- No performance regression from per-frame updates (emissive pulse is lightweight traverse)

---

## P2 -- Boss Attacks (Titan)

---

### BD-220: Titan Bone Barrage attack + ground circle telegraphs

**Category:** Gameplay -- Boss Attacks
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack section, weapon effects update), `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system + screen shake)

**Description:** The Titan slams the ground and 4-6 bone-colored cube clusters arc through the air, landing at positions near the player. Each landing zone is marked with a red ground circle during the 0.8-second telegraph. This attack is available from Phase 2 onward and teaches players to watch the ground and keep moving.

**Implementation -- Attack Trigger:**

In the boss attack selection block for tier 9, add Bone Barrage to the attack pool when `e.bossPhase >= 2`:

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

This replaces the existing `specialAttackCount % 2` alternation between slam and shockwave.

**Implementation -- Bone Barrage Attack:**

When `pick === 'boneBarrage'`:

```js
const boneCount = st.chillMode ? 4 : (4 + Math.floor(Math.random() * 3)); // 4-6 normal, 4 chill
const telegraphDuration = st.chillMode ? 1.2 : 0.8;
const boneDamage = st.chillMode ? 8 : 15;

// Slam animation: tilt Titan body down
e._boneBarrageTimer = telegraphDuration;
e._boneBarrageTargets = [];

// Calculate landing positions: semicircle near player
const playerAngle = Math.atan2(st.playerZ - e.group.position.z, st.playerX - e.group.position.x);
for (let i = 0; i < boneCount; i++) {
  const offsetAngle = playerAngle + (Math.random() - 0.5) * Math.PI; // semicircle
  const dist = 3 + Math.random() * 3; // 3-6 units from player
  const targetX = st.playerX + Math.cos(offsetAngle) * dist;
  const targetZ = st.playerZ + Math.sin(offsetAngle) * dist;

  e._boneBarrageTargets.push({ x: targetX, z: targetZ });

  // Ground marker telegraph
  const markerGeo = new THREE.RingGeometry(0.1, 2.0, 16);
  markerGeo.rotateX(-Math.PI / 2);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xff2200, transparent: true, opacity: 0.4, side: THREE.DoubleSide
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(targetX, 0.15, targetZ);
  scene.add(marker);

  e._boneBarrageTargets[i].marker = marker;
}

playSound('sfx_boss_slam_impact');
```

**Implementation -- Bone Projectile Launch (after telegraph expires):**

When `e._boneBarrageTimer` counts down to 0:

```js
for (const target of e._boneBarrageTargets) {
  // Create bone mesh (2-3 cream/white boxes grouped)
  const boneGroup = new THREE.Group();
  const boneColor = 0xeeddcc;
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), new THREE.MeshLambertMaterial({ color: boneColor }));
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.3), new THREE.MeshLambertMaterial({ color: boneColor }));
  b2.position.set(0.1, 0, 0.2);
  boneGroup.add(b1, b2);
  boneGroup.position.set(e.group.position.x, e.group.position.y + 2, e.group.position.z);
  scene.add(boneGroup);

  // Parabolic arc: calculate initial vy to land at target position
  const dx = target.x - e.group.position.x;
  const dz = target.z - e.group.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const flightTime = dist / 12; // ~12 units/s horizontal speed
  const vx = dx / flightTime;
  const vz = dz / flightTime;
  const gravity = 20;
  const vy = (gravity * flightTime) / 2 + (0 - (e.group.position.y + 2)) / flightTime;

  st.weaponProjectiles.push({
    mesh: boneGroup,
    x: e.group.position.x, y: e.group.position.y + 2, z: e.group.position.z,
    vx: vx, vy: vy, vz: vz,
    gravity: gravity,
    damage: boneDamage * diffDmgMult,
    range: 2.0, // 2-unit damage radius on landing
    life: flightTime + 0.5,
    type: 'boneBarrage',
    isEnemyProjectile: true,
    targetX: target.x, targetZ: target.z,
    landed: false,
  });

  // Remove ground marker
  if (target.marker) {
    target.marker.geometry.dispose();
    target.marker.material.dispose();
    scene.remove(target.marker);
  }
}
e._boneBarrageTargets = null;
```

**Implementation -- Bone Landing (in weapon projectile update loop):**

```js
if (proj.type === 'boneBarrage') {
  // Apply gravity to parabolic arc
  proj.vy -= proj.gravity * dt;
  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.z += proj.vz * dt;
  proj.mesh.position.set(proj.x, proj.y, proj.z);
  proj.mesh.rotation.x += dt * 5; // Tumble effect

  // Check if bone has landed (y <= 0.2)
  if (proj.y <= 0.2 && !proj.landed) {
    proj.landed = true;
    proj.life = 0; // Remove next frame

    // Damage check: player within 2-unit radius of landing position
    const dx = st.playerX - proj.x;
    const dz = st.playerZ - proj.z;
    if (dx * dx + dz * dz < proj.range * proj.range) {
      damagePlayer(proj.damage, '#eeddcc', { type: 'boneBarrage', tierName: 'Titan', tier: 9, color: 0xffcc00 });
    }

    // Impact particles (cream-colored burst)
    for (let p = 0; p < 6; p++) {
      spawnFireParticle(0xeeddcc, proj.x + (Math.random() - 0.5), 0.3, proj.z + (Math.random() - 0.5), 0.5);
    }

    triggerScreenShake(0.15, 0.15);

    // Dispose bone mesh
    proj.mesh.traverse(c => {
      if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); }
    });
    scene.remove(proj.mesh);
  }
}
```

**Audio -- Add placeholder mapping in `js/3d/audio.js`:**

```js
sfx_boss_slam_impact: ['explode-1.ogg'],
```

**Cooldown:** 6s base. Apply the phase cooldown modifier (Phase 2: 0.85x = 5.1s, Phase 3: 0.75x = 4.5s). In Chill Mode, multiply by 1.5x on top.

**Acceptance Criteria:**
- Bone Barrage only appears in the attack pool when Titan is in Phase 2+
- Red ring ground markers appear at 4-6 positions near the player during the 0.8s telegraph (1.2s in Chill)
- Bone projectiles follow parabolic arcs (not homing) and land at the marked positions
- Each bone deals 15 damage (8 in Chill) within a 2-unit radius on landing
- Impact produces cream-colored particle burst and screen shake (0.15, 0.15s)
- `sfx_boss_slam_impact` plays when Titan begins the slam animation
- The old slam/shockwave alternation (`specialAttackCount % 2`) is replaced with weighted random selection
- Bones tumble visually during flight
- All temporary meshes (markers, bone groups) are properly disposed after use
- No regression to existing Titan slam or shockwave attacks

---

### BD-221: Titan Charge + Ground Fissures attacks

**Category:** Gameplay -- Boss Attacks
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack section, weapon effects update), `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system + screen shake), BD-220 (attack pool selection must exist)

**Description:** Two new Phase 3 attacks for the Titan. Titan Charge is a directional dash with a red aim line telegraph. Ground Fissures are crack lines that erupt in a forward arc. Both available only when `e.bossPhase >= 3`.

**Implementation -- Titan Charge:**

When `pick === 'titanCharge'`:

```js
const telegraphDuration = st.chillMode ? 2.25 : 1.5;
const chargeSpeed = st.chillMode ? (e.speed * 2) : (e.speed * 3);
const chargeDamage = st.chillMode ? 15 : 30;
const recoveryStun = st.chillMode ? 3 : 2;
const chargeDistance = 15;

// Lock target direction at telegraph start
const tdx = st.playerX - e.group.position.x;
const tdz = st.playerZ - e.group.position.z;
const chargeAngle = Math.atan2(tdz, tdx);

e._chargeState = 'telegraph';
e._chargeTimer = telegraphDuration;
e._chargeAngle = chargeAngle;
e._chargeSpeed = chargeSpeed;
e._chargeDamage = chargeDamage;
e._chargeDistRemaining = chargeDistance;
e._chargeRecovery = recoveryStun;

// Hunch animation: scale Y to 0.8, scale XZ to 1.1
e.group.scale.y *= 0.8;
e.group.scale.x *= 1.1;
e.group.scale.z *= 1.1;

// Red aim line on ground from Titan toward locked target direction
const lineLen = chargeDistance;
const lineGeo = new THREE.BoxGeometry(0.4, 0.05, lineLen);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
const line = new THREE.Mesh(lineGeo, lineMat);
line.position.set(
  e.group.position.x + Math.cos(chargeAngle) * lineLen / 2, 0.1,
  e.group.position.z + Math.sin(chargeAngle) * lineLen / 2
);
line.rotation.y = -chargeAngle + Math.PI / 2;
scene.add(line);
e._chargeAimLine = line;

playSound('sfx_boss_charge_telegraph');
triggerScreenShake(0.2, 0.2);
```

**Implementation -- Charge State Machine (in enemy update loop):**

```js
if (e._chargeState === 'telegraph') {
  e._chargeTimer -= dt;
  // Pulse aim line opacity
  if (e._chargeAimLine) {
    e._chargeAimLine.material.opacity = 0.3 + 0.3 * Math.sin(performance.now() * 0.01);
  }
  if (e._chargeTimer <= 0) {
    e._chargeState = 'charging';
    // Remove aim line
    if (e._chargeAimLine) {
      e._chargeAimLine.geometry.dispose();
      e._chargeAimLine.material.dispose();
      scene.remove(e._chargeAimLine);
      e._chargeAimLine = null;
    }
    // Restore scale
    e.group.scale.y /= 0.8;
    e.group.scale.x /= 1.1;
    e.group.scale.z /= 1.1;
  }
} else if (e._chargeState === 'charging') {
  const moveDist = e._chargeSpeed * dt;
  e.group.position.x += Math.cos(e._chargeAngle) * moveDist;
  e.group.position.z += Math.sin(e._chargeAngle) * moveDist;
  e._chargeDistRemaining -= moveDist;

  // Hit detection: player within 2 units of Titan during charge
  const dx = st.playerX - e.group.position.x;
  const dz = st.playerZ - e.group.position.z;
  if (dx * dx + dz * dz < 4) { // 2-unit radius
    damagePlayer(e._chargeDamage * diffDmgMult, '#ff4400', { type: 'titanCharge', tierName: 'Titan', tier: 9, color: 0xffcc00 });
    triggerScreenShake(0.4, 0.3);
    e._chargeDistRemaining = 0; // Stop charge on hit
  }

  if (e._chargeDistRemaining <= 0) {
    e._chargeState = 'recovery';
    e._chargeTimer = e._chargeRecovery;
  }
} else if (e._chargeState === 'recovery') {
  // Recovery stun: Titan stands still, body flashes white
  // This is the exploitable punishment window
  e._chargeTimer -= dt;
  e._attackFlashTimer = 0.1; // Keep flashing white during recovery
  if (e._chargeTimer <= 0) {
    e._chargeState = null;
  }
}
```

**Implementation -- Ground Fissures:**

When `pick === 'groundFissures'`:

```js
const fissureCount = st.chillMode ? 2 : 3;
const telegraphDuration = st.chillMode ? 1.8 : 1.2;
const fissureDamage = st.chillMode ? 10 : 20;
const arcDegrees = st.chillMode ? 80 : 120;
const fissureLength = 12;

const playerAngle = Math.atan2(st.playerZ - e.group.position.z, st.playerX - e.group.position.x);

e._fissureTimer = telegraphDuration;
e._fissures = [];

for (let i = 0; i < fissureCount; i++) {
  const angleOffset = fissureCount === 1 ? 0 :
    ((i / (fissureCount - 1)) - 0.5) * (arcDegrees * Math.PI / 180);
  const fissureAngle = playerAngle + angleOffset;

  // Dark brown line on ground (telegraph)
  const fissureGeo = new THREE.BoxGeometry(0.5, 0.1, fissureLength);
  const fissureMat = new THREE.MeshBasicMaterial({
    color: 0x442200, transparent: true, opacity: 0.6
  });
  const fissure = new THREE.Mesh(fissureGeo, fissureMat);
  fissure.position.set(
    e.group.position.x + Math.cos(fissureAngle) * fissureLength / 2, 0.12,
    e.group.position.z + Math.sin(fissureAngle) * fissureLength / 2
  );
  fissure.rotation.y = -fissureAngle + Math.PI / 2;
  scene.add(fissure);

  e._fissures.push({
    mesh: fissure,
    angle: fissureAngle,
    originX: e.group.position.x,
    originZ: e.group.position.z,
    length: fissureLength,
    damage: fissureDamage,
    erupted: false,
  });
}
```

**Implementation -- Fissure Eruption (after telegraph expires):**

```js
if (e._fissureTimer !== undefined) {
  e._fissureTimer -= dt;
  if (e._fissureTimer <= 0 && e._fissures) {
    // Eruption: flash red-orange, deal damage
    for (const fiss of e._fissures) {
      fiss.mesh.material.color.setHex(0xff4400);
      fiss.mesh.material.opacity = 0.8;
      fiss.erupted = true;

      // Damage check: is player standing on the fissure line?
      // Project player position onto the fissure line and check perpendicular distance
      const dx = st.playerX - fiss.originX;
      const dz = st.playerZ - fiss.originZ;
      const along = dx * Math.cos(fiss.angle) + dz * Math.sin(fiss.angle);
      const perp = Math.abs(-dx * Math.sin(fiss.angle) + dz * Math.cos(fiss.angle));
      if (along > 0 && along < fiss.length && perp < 0.8) {
        damagePlayer(fiss.damage * diffDmgMult, '#ff4400', { type: 'groundFissures', tierName: 'Titan', tier: 9, color: 0xffcc00 });
      }
    }

    triggerScreenShake(0.25, 0.25);

    // Fissures persist as visual-only for 1.5s, then dispose
    e._fissureCleanupTimer = 1.5;
    e._fissureTimer = undefined;
  }
}

// Fissure cleanup timer
if (e._fissureCleanupTimer !== undefined) {
  e._fissureCleanupTimer -= dt;
  if (e._fissureCleanupTimer <= 0) {
    for (const fiss of e._fissures) {
      fiss.mesh.geometry.dispose();
      fiss.mesh.material.dispose();
      scene.remove(fiss.mesh);
    }
    e._fissures = null;
    e._fissureCleanupTimer = undefined;
  }
}
```

**Audio -- Add placeholder mapping in `js/3d/audio.js`:**

```js
sfx_boss_charge_telegraph: ['leapord-growl-1.ogg'],
```

**Cooldown:** Titan Charge: 10s base. Ground Fissures: 8s base. Apply phase cooldown modifier (Phase 3: 0.75x). In Chill Mode, multiply by 1.5x on top.

**Acceptance Criteria:**
- Titan Charge only appears in attack pool when Titan is in Phase 3+
- Ground Fissures only appear in attack pool when Titan is in Phase 3+
- Titan Charge telegraph: 1.5s (2.25s Chill), red aim line pulses on ground from Titan toward player's position at telegraph start (direction locked)
- Titan hunches during telegraph (scale Y 0.8, scale XZ 1.1), restores on charge
- Charge moves at 3x speed (2x Chill) for 15 units in the locked direction
- Charge deals 30 damage (15 Chill) on contact, with screen shake (0.4, 0.3s)
- 2s recovery stun (3s Chill) after charge where Titan flashes white and stands still -- exploitable punishment window
- Ground Fissures: 3 brown lines (2 in Chill) in a 120-degree (80-degree Chill) forward arc, 12 units long
- Fissures erupt after 1.2s (1.8s Chill), flash red-orange, deal 20 damage (10 Chill) to player standing on them
- Fissures persist visually for 1.5s after eruption, then are properly disposed
- `sfx_boss_charge_telegraph` plays when charge telegraph begins
- Screen shake on fissure eruption (0.25, 0.25s) and charge start (0.2, 0.2s)
- All temporary meshes (aim line, fissure lines) properly disposed
- No regression to existing Titan attacks or the attack pool selection from BD-220

---

## P2 -- Boss Attacks (Overlord)

---

### BD-222: Overlord Death Bolt Volley + Shadow Zones

**Category:** Gameplay -- Boss Attacks
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack section ~lines 5302-5321, weapon effects update), `js/3d/audio.js`
**Complexity:** Medium
**Dependencies:** BD-218 (phase system + screen shake)

**Description:** Upgrade the Overlord's single Death Bolt to a multi-bolt spread volley, and add Shadow Zones as a new floor hazard attack. The Overlord attack pool selection should be phase-gated similar to the Titan pool from BD-220.

**Implementation -- Overlord Attack Pool Selection:**

Replace the existing Overlord attack logic with a phase-gated pool:

```js
const overlordAttacks = ['deathBoltVolley', 'shadowZones'];
if (e.bossPhase >= 2) overlordAttacks.push('summonBurst');
if (e.bossPhase >= 3) overlordAttacks.push('deathBeam');
if (e.bossPhase >= 4) overlordAttacks.push('darkNova');

// Chill Mode: no Death Beam in Phase 3 (pushed to Phase 4)
if (st.chillMode && e.bossPhase === 3) {
  const idx = overlordAttacks.indexOf('deathBeam');
  if (idx !== -1) overlordAttacks.splice(idx, 1);
}

// Weighted selection (avoid repeating last attack)
let pick;
do {
  pick = overlordAttacks[Math.floor(Math.random() * overlordAttacks.length)];
} while (pick === e._lastAttack && overlordAttacks.length > 1);
e._lastAttack = pick;

// Phase cooldown modifier
const cooldownMult = [1.0, 0.9, 0.8, 0.8][e.bossPhase - 1] * (st.chillMode ? 1.5 : 1);
```

**Implementation -- Death Bolt Volley (replaces single Death Bolt):**

Modify the existing Death Bolt code at lines ~5302-5321 to fire in a loop:

```js
if (pick === 'deathBoltVolley') {
  let boltCount, spreadAngle, boltSpeed, boltDamage;

  if (st.chillMode) {
    boltCount = e.bossPhase >= 3 ? 3 : 2;
    spreadAngle = e.bossPhase >= 3 ? 20 : 10; // degrees
    boltSpeed = 10;
    boltDamage = 15;
  } else {
    boltCount = e.bossPhase >= 3 ? 5 : 3;
    spreadAngle = e.bossPhase >= 3 ? 30 : 15; // degrees
    boltSpeed = 16;
    boltDamage = 30;
  }

  // Use existing target leading from BD-211
  const bdx = st.playerX - e.group.position.x;
  const bdz = st.playerZ - e.group.position.z;
  const baseAngle = Math.atan2(bdz, bdx);

  // Telegraph: fan of faint red lines
  // (lines persist for 0.5s before bolts fire -- use a brief telegraph state)
  e._volleyTimer = 0.5;
  e._volleyBolts = { boltCount, spreadAngle, baseAngle, boltSpeed, boltDamage };

  playSound('sfx_boss_death_bolt');
  triggerScreenShake(0.1, 0.1);
}
```

When `e._volleyTimer` counts down to 0, spawn the bolts:

```js
if (e._volleyTimer !== undefined) {
  e._volleyTimer -= dt;
  if (e._volleyTimer <= 0) {
    const v = e._volleyBolts;
    for (let i = 0; i < v.boltCount; i++) {
      const offset = v.boltCount === 1 ? 0 :
        ((i / (v.boltCount - 1)) - 0.5) * (v.spreadAngle * Math.PI / 180);
      const angle = v.baseAngle + offset;

      const boltGeo = new THREE.SphereGeometry(0.4, 8, 6);
      const boltMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(e.group.position.x, 1.5, e.group.position.z);
      scene.add(bolt);

      st.weaponProjectiles.push({
        mesh: bolt,
        x: e.group.position.x, y: 1.5, z: e.group.position.z,
        vx: Math.cos(angle) * v.boltSpeed, vy: 0, vz: Math.sin(angle) * v.boltSpeed,
        damage: v.boltDamage * diffDmgMult,
        range: 1.2,
        life: 3,
        type: 'deathBolt',
        isEnemyProjectile: true,
      });
    }
    e._volleyTimer = undefined;
    e._volleyBolts = null;
  }
}
```

**Implementation -- Shadow Zones:**

When `pick === 'shadowZones'`:

```js
let zoneCount, telegraphDuration, zoneDamage, damageTickInterval;

if (st.chillMode) {
  zoneCount = e.bossPhase >= 3 ? 3 : 2;
  telegraphDuration = 2.25;
  zoneDamage = 5;
  damageTickInterval = 0.75;
} else {
  zoneCount = e.bossPhase >= 3 ? 5 : 3;
  telegraphDuration = 1.5;
  zoneDamage = 10;
  damageTickInterval = 0.5;
}

// Cap: maximum 2 sets of Shadow Zones active at once
// If a new set spawns, old set fades immediately
let activeZoneCount = 0;
for (const eff of st.weaponEffects) {
  if (eff.type === 'shadowZone') activeZoneCount++;
}
if (activeZoneCount >= zoneCount * 2) {
  // Remove oldest set
  for (let i = st.weaponEffects.length - 1; i >= 0; i--) {
    if (st.weaponEffects[i].type === 'shadowZone') {
      st.weaponEffects[i].life = 0.1; // Fade out quickly
    }
  }
}

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
    life: telegraphDuration + 3.0, // telegraph + active duration
    maxLife: telegraphDuration + 3.0,
    type: 'shadowZone',
    radius: 3,
    damage: zoneDamage * diffDmgMult,
    telegraphRemaining: telegraphDuration,
    damageTickTimer: 0,
    damageTickInterval: damageTickInterval,
  });
}

playSound('sfx_boss_shadow_zone');
```

**Implementation -- Shadow Zone Update (in weapon effects update loop):**

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
      eff.damageTickTimer = eff.damageTickInterval;
    }
    // Fade out over final 0.5s
    if (eff.life < 0.5) {
      eff.mesh.material.opacity = eff.life / 0.5 * 0.5;
    }
  }
}
```

**Audio -- Add placeholder mappings in `js/3d/audio.js`:**

```js
sfx_boss_death_bolt: ['big-pew-1.ogg'],
sfx_boss_shadow_zone: ['gas-1.ogg'],
```

**Acceptance Criteria:**
- Death Bolt Volley fires 3 bolts in a 15-degree spread (5 bolts / 30-degree in Phase 3+)
- Center bolt uses existing target leading; flanking bolts are offset at equal angular intervals
- Bolt speed: 16 (10 in Chill). Damage: 30 per bolt (15 in Chill)
- Chill Mode: 2-bolt in Phase 1-2, 3-bolt in Phase 3+
- Shadow Zones: 3-5 dark circles (2-3 in Chill) appear near player, radius 3 units
- Shadow Zone telegraph: 1.5s (2.25s Chill) with pulsing opacity
- After eruption: deal 10 damage/0.5s (5 damage/0.75s in Chill) for 3 seconds to player standing inside
- Shadow Zones fade out over final 0.5s of their lifetime
- Maximum 2 sets of Shadow Zones active simultaneously (old set fades if cap exceeded)
- `sfx_boss_death_bolt` plays when volley fires, `sfx_boss_shadow_zone` plays when zones appear
- Overlord attack pool is phase-gated with weighted random selection (no repeat of last attack)
- Phase cooldown modifiers apply: Phase 1 = 1.0x, Phase 2 = 0.9x, Phase 3 = 0.8x, Phase 4 = 0.8x (all x1.5 in Chill)
- No regression to existing Death Bolt behavior -- the volley replaces the single bolt

---

### BD-223: Overlord Summon Burst + Death Beam

**Category:** Gameplay -- Boss Attacks
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack section, enemy update loop, weapon effects update), `js/3d/audio.js`
**Complexity:** Large
**Dependencies:** BD-218 (phase system + screen shake), BD-222 (Overlord attack pool must exist)

**Description:** Two high-impact Overlord attacks. Summon Burst creates temporary minion zombies. Death Beam is a sweeping line attack that is the signature "oh no" moment. Summon Burst is available from Phase 2, Death Beam from Phase 3.

**Implementation -- Summon Burst:**

When `pick === 'summonBurst'`:

```js
let summonCount, summonTierMax, summonDespawn, channelTime, summonCooldown;

if (st.chillMode) {
  summonCount = 3;
  summonTierMax = 1;  // tier 1 only
  summonDespawn = 10; // seconds
  channelTime = 2;
  summonCooldown = 18;
} else {
  summonCount = 4 + Math.floor(Math.random() * 3); // 4-6
  summonTierMax = 3;  // tier 1-3
  summonDespawn = 15;
  channelTime = 2;
  summonCooldown = 12;
}

// Cap: maximum 6 summoned zombies alive at once
let activeSummons = 0;
for (const en of st.enemies) {
  if (en.isSummoned && !en.dying) activeSummons++;
}
if (activeSummons >= 6) {
  // Despawn oldest batch
  for (const en of st.enemies) {
    if (en.isSummoned && !en.dying) {
      en.dying = true;
      en.deathTimer = 0;
      en.noReward = true;
    }
  }
}

e._summonState = 'channeling';
e._summonTimer = channelTime;
e._summonCount = summonCount;
e._summonTierMax = summonTierMax;
e._summonDespawn = summonDespawn;

// Channel animation: body tilts backward
e._summonOrigRotX = e.group.rotation.x;
e.group.rotation.x = -0.3; // Tilt back

playSound('sfx_boss_summon');
```

**Implementation -- Summon Channel + Spawn (in enemy update loop):**

```js
if (e._summonState === 'channeling') {
  e._summonTimer -= dt;

  // Dark red particles spiral inward toward the Overlord during channel
  if (Math.random() < 0.4) {
    const pa = Math.random() * Math.PI * 2;
    const pr = 4 + Math.random() * 3;
    spawnFireParticle(0x440000,
      e.group.position.x + Math.cos(pa) * pr, 1.0,
      e.group.position.z + Math.sin(pa) * pr,
      0.6
    );
  }

  if (e._summonTimer <= 0) {
    e._summonState = null;
    e.group.rotation.x = e._summonOrigRotX || 0;

    // Spawn zombies in a ring 6 units from the Overlord
    for (let i = 0; i < e._summonCount; i++) {
      const angle = (i / e._summonCount) * Math.PI * 2;
      const sx = e.group.position.x + Math.cos(angle) * 6;
      const sz = e.group.position.z + Math.sin(angle) * 6;
      const tier = 1 + Math.floor(Math.random() * e._summonTierMax);

      const summon = createEnemy(tier, sx, sz);
      if (summon) {
        summon.hp = summon.maxHp * 0.5; // 50% HP
        summon.isSummoned = true;
        summon.summonLifetime = e._summonDespawn;
        summon.noReward = true; // No XP/loot on death
      }
    }

    triggerScreenShake(0.15, 0.2);
  }
}
```

**Implementation -- Summoned Zombie Lifetime (in enemy update loop, near the top):**

Add this check early in the per-enemy update, before attack logic:

```js
if (e.isSummoned) {
  e.summonLifetime -= dt;
  if (e.summonLifetime <= 0) {
    e.dying = true;
    e.deathTimer = 0;
    e.noReward = true; // Skip XP/loot in death handler
  }
  // Visual: fade opacity in final 2 seconds
  if (e.summonLifetime < 2 && e.summonLifetime > 0) {
    e.group.traverse(c => {
      if (c.isMesh && c.material) {
        c.material.transparent = true;
        c.material.opacity = e.summonLifetime / 2;
      }
    });
  }
}
```

In the enemy death/loot handler, check `e.noReward` before granting XP or spawning loot drops:

```js
if (e.noReward) {
  // Skip XP, loot, and kill count for summoned zombies
  // Still play death animation and remove from scene
}
```

**Implementation -- Death Beam:**

When `pick === 'deathBeam'`:

```js
let telegraphDuration, sweepDuration, beamDamage, beamWidth;

if (st.chillMode) {
  telegraphDuration = 3;
  sweepDuration = 3;
  beamDamage = 20;
  beamWidth = 0.6;
} else {
  telegraphDuration = 2;
  sweepDuration = 2;
  beamDamage = 40;
  beamWidth = 0.8;
}

const playerAngle = Math.atan2(st.playerZ - e.group.position.z, st.playerX - e.group.position.x);
const startAngle = playerAngle - 30 * Math.PI / 180;
const sweepRange = 60 * Math.PI / 180;

e._beamState = 'charging';
e._beamTimer = telegraphDuration;
e._beamStartAngle = startAngle;
e._beamSweepRange = sweepRange;
e._beamDamage = beamDamage;
e._beamWidth = beamWidth;
e._beamSweepDuration = sweepDuration;

// Charge-up: red energy particles converge on Overlord's "mouth" area
// Body material emissive ramps to full red during charge

playSound('sfx_boss_death_beam');
```

**Implementation -- Beam Charge + Fire State Machine (in enemy update loop):**

```js
if (e._beamState === 'charging') {
  e._beamTimer -= dt;

  // Charging particles converge on Overlord
  if (Math.random() < 0.5) {
    const pa = Math.random() * Math.PI * 2;
    const pr = 3 + Math.random() * 2;
    spawnFireParticle(0xff2200,
      e.group.position.x + Math.cos(pa) * pr,
      1.5 + (Math.random() - 0.5),
      e.group.position.z + Math.sin(pa) * pr,
      0.4
    );
  }

  // Ramp emissive on body
  const chargeProgress = 1 - (e._beamTimer / (st.chillMode ? 3 : 2));
  e.group.traverse(c => {
    if (c.isMesh && c.material) {
      if (!c.material.emissive) c.material.emissive = new THREE.Color(0xff0000);
      c.material.emissiveIntensity = chargeProgress * 0.8;
    }
  });

  if (e._beamTimer <= 0) {
    e._beamState = 'firing';

    // Create beam mesh
    const beamGeo = new THREE.BoxGeometry(e._beamWidth, 0.3, 30);
    beamGeo.translate(0, 0, -15); // Offset so it extends forward from origin
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0022, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(e.group.position.x, 1.5, e.group.position.z);
    scene.add(beam);

    st.weaponEffects.push({
      mesh: beam,
      x: e.group.position.x, z: e.group.position.z,
      life: e._beamSweepDuration,
      maxLife: e._beamSweepDuration,
      type: 'deathBeam',
      startAngle: e._beamStartAngle,
      sweepRange: e._beamSweepRange,
      damage: e._beamDamage * diffDmgMult,
      hasHitPlayer: false,
      ownerY: 1.5,
    });

    triggerScreenShake(0.2, 0.3);

    // Reset body emissive
    e.group.traverse(c => {
      if (c.isMesh && c.material && c.material.emissive) {
        c.material.emissiveIntensity = 0;
      }
    });

    e._beamState = null; // Beam is now managed by weaponEffects
  }
}
```

**Implementation -- Beam Sweep Logic (in weapon effects update loop):**

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

  // Fade beam opacity at end
  if (eff.life < 0.3) {
    eff.mesh.material.opacity = eff.life / 0.3 * 0.8;
  }
}
```

**Audio -- Add placeholder mappings in `js/3d/audio.js`:**

```js
sfx_boss_summon: ['zombie-5.ogg'],
sfx_boss_death_beam: ['pew-5x-1.ogg'],
```

**Acceptance Criteria:**
- Summon Burst available from Phase 2+. Death Beam available from Phase 3+ (Phase 4 in Chill)
- Summon Burst: 2s channel with body tilt and dark particles, then spawns 4-6 zombies (3 in Chill) in a ring 6 units away
- Summoned zombies have 50% HP, `isSummoned = true`, `noReward = true`, and auto-die after 15s (10s Chill)
- Summoned zombies grant no XP and drop no loot on death
- Summoned zombies fade to transparent over their final 2 seconds
- Maximum 6 summoned zombies alive at once (oldest batch despawns if cap exceeded)
- Death Beam: 2s charge (3s Chill) with converging particles and emissive ramp, then thick beam sweeps 60 degrees over 2s (3s Chill)
- Death Beam deals 40 damage (20 Chill) but only hits once per beam (`hasHitPlayer` flag)
- Beam width: 0.8 (0.6 Chill). Safe zones: behind the boss, or far to the side
- `sfx_boss_summon` plays when channel begins, `sfx_boss_death_beam` plays when charge begins
- Screen shake on summon completion (0.15, 0.2s) and beam fire (0.2, 0.3s), beam hit (0.3, 0.3s)
- All temporary meshes (beam) properly disposed when effect expires
- Cooldowns: Summon Burst 12s (18s Chill), Death Beam 15s, plus phase multiplier

---

### BD-224: Boss entrance sequence

**Category:** Gameplay -- Boss Presentation
**Priority:** P2
**File(s):** `js/game3d.js` (challenge shrine activation block ~line 6271, enemy update loop), `js/3d/audio.js`
**Complexity:** Small-Medium
**Dependencies:** BD-218 (screen shake)

**Description:** Bosses currently appear at full scale instantly when a challenge shrine activates. This bead adds a 1.5-second entrance animation: scale-up from near-zero with cubic ease-out, ground crack particles, title card, screen shake on completion, and nearby low-tier zombies scattering in fear.

**Implementation -- Boss Creation (in challenge shrine activation):**

Where the boss is created via `createEnemy()`, add entrance state:

```js
boss.entranceTimer = 1.5;
boss.entranceActive = true;
boss.group.scale.setScalar(0.01); // Start nearly invisible
```

**Implementation -- Entrance Animation (in enemy update loop, BEFORE attack logic):**

```js
if (e.entranceActive) {
  e.entranceTimer -= dt;
  const t = 1 - (e.entranceTimer / 1.5);
  const easeOut = 1 - Math.pow(1 - t, 3); // cubic ease-out for dramatic pop
  const targetScale = e.isBoss ? BOSS_SCALE : (e.tier >= 9 ? 1.5 : 1);
  e.group.scale.setScalar(easeOut * targetScale);

  // Ground crack particles during growth
  if (Math.random() < 0.3) {
    const pa = Math.random() * Math.PI * 2;
    const pr = t * 5; // radius grows as boss grows
    spawnFireParticle(0x664422,
      e.group.position.x + Math.cos(pa) * pr, 0.2,
      e.group.position.z + Math.sin(pa) * pr,
      0.6
    );
  }

  if (e.entranceTimer <= 0) {
    e.entranceActive = false;

    // Final slam effect
    triggerScreenShake(0.4, 0.5);

    // Title card floating text
    const titleColor = e.tier >= 10 ? '#ff0044' : '#ffcc00';
    const titleName = e.tier >= 10 ? 'OVERLORD' : 'TITAN';
    addFloatingText(titleName, titleColor, e.group.position.x, e.group.position.y + 6, e.group.position.z, 3, true);

    playSound('sfx_boss_entrance');
  }

  continue; // Skip attack logic and movement during entrance
}
```

**Implementation -- Zombie Scatter:**

When a boss entrance begins (at boss creation time), iterate `st.enemies` and set a flee timer on nearby low-tier zombies:

```js
// After creating boss and setting entranceActive:
for (const other of st.enemies) {
  if (other === boss) continue;
  if (other.tier > 3) continue; // Only tier 1-3 scatter
  const dx = other.group.position.x - boss.group.position.x;
  const dz = other.group.position.z - boss.group.position.z;
  if (dx * dx + dz * dz < 225) { // Within 15 units
    other.fleeTimer = 2;
    other.fleeFromX = boss.group.position.x;
    other.fleeFromZ = boss.group.position.z;
  }
}
```

In the enemy movement code (where enemies move toward the player), add a flee check:

```js
if (e.fleeTimer && e.fleeTimer > 0) {
  e.fleeTimer -= dt;
  // Move away from flee source instead of toward player
  const fdx = e.group.position.x - e.fleeFromX;
  const fdz = e.group.position.z - e.fleeFromZ;
  const fdist = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
  e.group.position.x += (fdx / fdist) * e.speed * dt;
  e.group.position.z += (fdz / fdist) * e.speed * dt;
  continue; // Skip normal movement this frame
}
```

**Audio -- Add placeholder mapping in `js/3d/audio.js`:**

```js
sfx_boss_entrance: ['zombie-4.ogg'],
```

Note: The forward plan suggests playing both `zombie-4.ogg` and `explode-1.ogg` for the entrance sound. Consider calling `playSound` twice or creating a composite event. For the initial placeholder, a single file is sufficient.

**Acceptance Criteria:**
- Boss spawns at scale 0.01 and grows to full scale over 1.5 seconds with cubic ease-out
- Brown/dark ground crack particles radiate outward during the growth, with radius proportional to growth progress
- Title card appears at completion: "TITAN" in gold (#ffcc00) or "OVERLORD" in red (#ff0044), displayed for 3 seconds using `addFloatingText` with `important=true`
- Screen shake (0.4, 0.5s) fires when entrance completes
- `sfx_boss_entrance` plays at the start of the entrance
- Boss skips all attack logic and movement during entrance (`continue` statement)
- Tier 1-3 zombies within 15 units flee away from the boss for 2 seconds
- Fleeing zombies move at their normal speed but in the opposite direction from the boss
- After 2 seconds, fleeing zombies resume normal behavior (chase player)
- No special Chill Mode adjustments needed (entrance is purely cosmetic)
- No regression to challenge shrine activation or enemy creation

---

### BD-225: Visual telegraphs + phase transition effects polish

**Category:** Visual -- Combat Feedback
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack visual sections)
**Complexity:** Small
**Dependencies:** BD-218 (phase system), BD-220 through BD-223 (attacks must exist for their telegraphs)

**Description:** Polish pass on visual telegraphs across all boss attacks and phase transitions. This bead adds: widened aim strip for Death Bolt Volley (showing the spread arc), enhanced screen shake catalog values for all attacks, and the 0.5-second attack timer pause during phase transitions (if not already included in BD-218).

**Implementation -- Death Bolt Volley Telegraph Enhancement:**

During the 0.5s volley telegraph from BD-222, draw faint red fan lines showing the spread arc:

```js
if (e._volleyBolts) {
  const v = e._volleyBolts;
  // Draw fan lines showing where bolts will go
  if (!e._volleyFanLines) {
    e._volleyFanLines = [];
    for (let i = 0; i < v.boltCount; i++) {
      const offset = v.boltCount === 1 ? 0 :
        ((i / (v.boltCount - 1)) - 0.5) * (v.spreadAngle * Math.PI / 180);
      const angle = v.baseAngle + offset;

      const lineGeo = new THREE.BoxGeometry(0.15, 0.03, 20);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.25 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(
        e.group.position.x + Math.cos(angle) * 10, 1.5,
        e.group.position.z + Math.sin(angle) * 10
      );
      line.rotation.y = -angle + Math.PI / 2;
      scene.add(line);
      e._volleyFanLines.push(line);
    }
  }
}
```

Clean up fan lines when the volley fires (in BD-222's timer expiration block):

```js
if (e._volleyFanLines) {
  for (const line of e._volleyFanLines) {
    line.geometry.dispose();
    line.material.dispose();
    scene.remove(line);
  }
  e._volleyFanLines = null;
}
```

**Implementation -- Screen Shake Catalog Verification:**

Ensure all screen shake calls across BD-218 through BD-224 match these values:

| Event | Amplitude | Duration |
|-------|-----------|----------|
| Titan Slam impact | 0.3 | 0.3s |
| Titan Charge start | 0.2 | 0.2s |
| Titan Charge player hit | 0.4 | 0.3s |
| Bone Barrage per impact | 0.15 | 0.15s |
| Ground Fissure eruption | 0.25 | 0.25s |
| Shockwave launch | 0.15 | 0.2s |
| Death Bolt Volley fire | 0.1 | 0.1s |
| Shadow Zone eruption | 0.1 | 0.1s |
| Summon Burst completion | 0.15 | 0.2s |
| Death Beam fire | 0.2 | 0.3s |
| Dark Nova slam | 0.5 | 0.5s |
| Boss entrance complete | 0.4 | 0.5s |
| Phase transition | 0.3 | 0.4s |

**Implementation -- disposeTempMesh Utility:**

Add a utility function to prevent geometry/material leak bugs across all the new boss attack code:

```js
function disposeTempMesh(mesh, scene) {
  if (!mesh) return;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  scene.remove(mesh);
}
```

Replace all manual dispose patterns (geometry.dispose + material.dispose + scene.remove) with calls to `disposeTempMesh`.

**Acceptance Criteria:**
- Death Bolt Volley shows faint red fan lines during its 0.5s telegraph, then removes them when bolts fire
- All screen shake calls match the catalog values listed above
- `disposeTempMesh` utility exists and is used by all boss attack disposal code
- No geometry or material leaks detectable via `renderer.info.memory` during a boss fight with multiple attack cycles
- Phase transition pause (0.5s) is confirmed functional (boss delays next attack after phase change)

---

## P2 -- Polish & QA

---

### BD-226: Chill Mode boss tuning + Dark Nova (Phase 4 Overlord)

**Category:** Balance -- Chill Mode + Gameplay
**Priority:** P2
**File(s):** `js/game3d.js` (boss attack sections), `js/3d/constants.js` (if Chill Mode multipliers are extracted)
**Complexity:** Medium
**Dependencies:** BD-218 through BD-223 (all Titan/Overlord attacks implemented)

**Description:** This bead has two parts. First, implement the Dark Nova attack (Overlord Phase 4 desperation AoE with safe-zone-at-boss mechanic). Second, do a comprehensive Chill Mode tuning pass across all boss attacks, verifying every parameter matches the forward plan specification.

**Implementation -- Dark Nova Attack:**

When `pick === 'darkNova'` (Phase 4 only):

```js
let floatUpDuration, ringExpandDuration, novaDamage, safeRadius;

if (st.chillMode) {
  floatUpDuration = 2;
  ringExpandDuration = 3;
  novaDamage = 25;
  safeRadius = 6;
} else {
  floatUpDuration = 1;
  ringExpandDuration = 2;
  novaDamage = 50;
  safeRadius = 4;
}

e._novaState = 'floatUp';
e._novaTimer = floatUpDuration;
e._novaOrigY = e.group.position.y;
e._novaDamage = novaDamage;
e._novaSafeRadius = safeRadius;
e._novaRingDuration = ringExpandDuration;

// Screen starts shaking subtly during float-up
triggerScreenShake(0.1, floatUpDuration);

playSound('sfx_boss_dark_nova');
```

**Implementation -- Dark Nova State Machine (in enemy update loop):**

```js
if (e._novaState === 'floatUp') {
  e._novaTimer -= dt;
  const t = 1 - (e._novaTimer / (st.chillMode ? 2 : 1));

  // Float upward 3 units
  e.group.position.y = e._novaOrigY + t * 3;

  // Dark red aura expands during float
  if (Math.random() < 0.5) {
    const pa = Math.random() * Math.PI * 2;
    const pr = 2 + t * 4;
    spawnFireParticle(0x880000,
      e.group.position.x + Math.cos(pa) * pr, e.group.position.y,
      e.group.position.z + Math.sin(pa) * pr, 0.8);
  }

  if (e._novaTimer <= 0) {
    // Slam down
    e.group.position.y = e._novaOrigY;
    e._novaState = null;
    triggerScreenShake(0.5, 0.5); // Maximum shake in the game

    // First-time "GET CLOSE!" hint
    if (!st._novaHintShown) {
      st._novaHintShown = true;
      addFloatingText('GET CLOSE!', '#00ff44',
        e.group.position.x, e.group.position.y + 4, e.group.position.z, 3, true);
    }

    // Create expanding nova ring
    const novaGeo = new THREE.RingGeometry(3.5, 4.5, 32);
    novaGeo.rotateX(-Math.PI / 2);
    const novaMat = new THREE.MeshBasicMaterial({
      color: 0xff0022, transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    const novaMesh = new THREE.Mesh(novaGeo, novaMat);
    novaMesh.position.set(e.group.position.x, 0.3, e.group.position.z);
    scene.add(novaMesh);

    st.weaponEffects.push({
      mesh: novaMesh,
      x: e.group.position.x, z: e.group.position.z,
      life: e._novaRingDuration,
      maxLife: e._novaRingDuration,
      type: 'darkNova',
      radius: 4.0,       // Current ring radius (expands from 4 to 30)
      maxRadius: 30,
      safeRadius: e._novaSafeRadius,
      damage: e._novaDamage * diffDmgMult,
      hasHitPlayer: false,
    });
  }
}
```

**Implementation -- Dark Nova Ring Expansion (in weapon effects update loop):**

```js
if (eff.type === 'darkNova') {
  const progress = 1 - (eff.life / eff.maxLife);
  eff.radius = 4 + (eff.maxRadius - 4) * progress;

  // Scale the ring mesh to match radius
  const scale = eff.radius / 4; // Original ring is radius ~4
  eff.mesh.scale.setScalar(scale);

  // Hit detection: player inside ring but OUTSIDE safe zone
  if (!eff.hasHitPlayer) {
    const dx = st.playerX - eff.x;
    const dz = st.playerZ - eff.z;
    const distSq = dx * dx + dz * dz;
    const playerDist = Math.sqrt(distSq);
    if (playerDist < eff.radius && playerDist > eff.safeRadius) {
      damagePlayer(eff.damage, '#ff0022', { type: 'darkNova', tierName: 'Overlord', tier: 10, color: 0xffff66 });
      eff.hasHitPlayer = true;
      triggerScreenShake(0.3, 0.3);
    }
  }

  // Fade opacity at end
  if (eff.life < 0.5) {
    eff.mesh.material.opacity = eff.life / 0.5 * 0.7;
  }
}
```

**Implementation -- Phase 4 Overlord Move Speed Boost:**

In the Overlord movement code, after phase check from BD-218:

```js
if (e.tier >= 10 && e.bossPhase >= 4) {
  e.speed = e.baseSpeed * 1.3; // +30% move speed in Phase 4
}
```

**Audio -- Add placeholder mapping in `js/3d/audio.js`:**

```js
sfx_boss_dark_nova: ['zombie-4.ogg'],
```

**Implementation -- Part B: Chill Mode Tuning Verification:**

Verify every boss attack uses the correct Chill Mode parameters. The complete reference table:

| Attack | Parameter | Normal | Chill |
|--------|-----------|--------|-------|
| Bone Barrage | Count | 4-6 | 4 |
| Bone Barrage | Telegraph | 0.8s | 1.2s |
| Bone Barrage | Damage | 15 | 8 |
| Titan Charge | Telegraph | 1.5s | 2.25s |
| Titan Charge | Speed | 3x | 2x |
| Titan Charge | Damage | 30 | 15 |
| Titan Charge | Recovery | 2s | 3s |
| Ground Fissures | Count | 3 | 2 |
| Ground Fissures | Arc | 120 deg | 80 deg |
| Ground Fissures | Telegraph | 1.2s | 1.8s |
| Ground Fissures | Damage | 20 | 10 |
| Death Bolt Volley | Count (P1-2) | 3 | 2 |
| Death Bolt Volley | Count (P3+) | 5 | 3 |
| Death Bolt Volley | Speed | 16 | 10 |
| Death Bolt Volley | Damage | 30 | 15 |
| Shadow Zones | Count (P1-2) | 3 | 2 |
| Shadow Zones | Count (P3+) | 5 | 3 |
| Shadow Zones | Telegraph | 1.5s | 2.25s |
| Shadow Zones | Damage/tick | 10 | 5 |
| Shadow Zones | Tick interval | 0.5s | 0.75s |
| Summon Burst | Count | 4-6 | 3 |
| Summon Burst | Tier range | 1-3 | 1 only |
| Summon Burst | Despawn | 15s | 10s |
| Summon Burst | Cooldown | 12s | 18s |
| Death Beam | Telegraph | 2s | 3s |
| Death Beam | Sweep | 2s | 3s |
| Death Beam | Damage | 40 | 20 |
| Death Beam | Width | 0.8 | 0.6 |
| Dark Nova | Float-up | 1s | 2s |
| Dark Nova | Ring expand | 2s | 3s |
| Dark Nova | Damage | 50 | 25 |
| Dark Nova | Safe radius | 4 | 6 |
| All attacks | Cooldowns | 1.0x | 1.5x |
| Phase thresholds | Titan P2 | 60% | 40% |
| Phase thresholds | Titan P3 | 30% | 15% |
| Phase thresholds | Overlord P2 | 75% | 55% (note: forward plan says 55%) |
| Phase thresholds | Overlord P3 | 50% | 30% |
| Phase thresholds | Overlord P4 | 25% | 12% |

**Acceptance Criteria:**
- Dark Nova only appears in Overlord attack pool at Phase 4+
- Dark Nova: Overlord floats up 3 units over 1s (2s Chill), slams down with maximum screen shake (0.5, 0.5s)
- Expanding ring goes from radius 4 to radius 30 over 2s (3s Chill)
- Safe zone within 4 units (6 in Chill) of the Overlord -- player takes no damage inside safe radius
- Damage: 50 (25 Chill), single-hit only
- First-time "GET CLOSE!" floating text in green at the Overlord's position
- Phase 4 Overlord moves 30% faster
- `sfx_boss_dark_nova` plays at float-up start
- Every Chill Mode parameter across all boss attacks matches the reference table above
- Chill Mode: no Death Beam in Phase 3 (pushed to Phase 4)
- All cooldowns correctly multiplied by 1.5x in Chill Mode on top of phase multiplier

---

### BD-227: Boss audio cues (Sound Pack Alpha placeholders)

**Category:** Audio -- Boss SFX
**Priority:** P2
**File(s):** `js/3d/audio.js`
**Complexity:** Small
**Dependencies:** BD-220 through BD-226 (all attacks must exist to wire audio)

**Description:** Consolidate and verify all 9 new boss audio event IDs in the audio system. Previous beads added individual events as they were needed; this bead does the full audit, ensures all events are in `SOUND_MAP`, verifies every boss attack plays an appropriate sound, and documents which events need Sound Pack Beta replacements.

**Implementation -- SOUND_MAP Additions in `js/3d/audio.js`:**

Add or verify all of the following entries exist in the `SOUND_MAP` object:

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

**Audio Design Rationale (from forward plan):**

Each attack type uses a different frequency/character so players learn "that sound means THIS attack":

- **Ground attacks** (Slam, Fissures, Dark Nova): Low-register sounds -- `explode-1.ogg`, `zombie-4.ogg`
- **Projectile attacks** (Death Bolt, Bone Barrage): Sharp/percussive sounds -- `big-pew-1.ogg`, `pew-3x-1.ogg`
- **Sustained attacks** (Death Beam, Shadow Zones): Continuous-sounding files -- `gas-1.ogg`, `pew-5x-1.ogg`
- **Creature effects** (Summon, Charge): Vocal sounds -- `zombie-5.ogg`, `leapord-growl-1.ogg`
- **Transitions** (Entrance, Phase change): Most "dramatic" sounds -- `rawr-2.ogg`, `rawr-1.ogg`

**Implementation -- MAX_CONCURRENT Check:**

Verify the `MAX_CONCURRENT` limit (currently 12 in audio.js) is sufficient for boss fights. A worst-case scenario: phase transition sound + attack sound + multiple bone impact sounds + shadow zone eruption sounds could exceed 12 simultaneous audio elements. If testing shows audio dropout during boss fights, increase `MAX_CONCURRENT` to 16.

**Implementation -- playSound Call Audit:**

Verify every boss attack has the correct `playSound` call:

| Attack/Event | When to Play | Event ID |
|-------------|-------------|----------|
| Boss entrance | When `entranceActive` is first set | `sfx_boss_entrance` |
| Phase transition | When `e.bossPhase` increases | `sfx_boss_phase_transition` |
| Titan Slam | When slam attack triggers | `sfx_boss_slam_impact` |
| Bone Barrage | When telegraph begins | `sfx_boss_slam_impact` |
| Titan Charge | When charge telegraph begins | `sfx_boss_charge_telegraph` |
| Ground Fissures | When eruption happens | `sfx_boss_slam_impact` |
| Death Bolt Volley | When volley fires | `sfx_boss_death_bolt` |
| Shadow Zones | When zones appear | `sfx_boss_shadow_zone` |
| Summon Burst | When channel begins | `sfx_boss_summon` |
| Death Beam | When charge begins | `sfx_boss_death_beam` |
| Dark Nova | When float-up begins | `sfx_boss_dark_nova` |

**Sound Pack Beta Priority List (for documentation):**

These events need replacement recordings in Sound Pack Beta, ordered by impact:

1. `sfx_boss_death_bolt` -- needs a rising whine / energy charge sound
2. `sfx_boss_shadow_zone` -- needs a deep sustained rumble
3. `sfx_boss_death_beam` -- needs electric crackling then sustained buzz
4. `sfx_boss_phase_transition` -- needs a dramatic chord sting (or mouth-made "DUN DUN DUNNNN")
5. `sfx_boss_charge_telegraph` -- needs growl + rushing wind combo
6. `sfx_boss_entrance` -- needs deep rumbling crescendo
7. `sfx_boss_dark_nova` -- needs massive deep boom
8. `sfx_boss_summon` -- needs creepy groan building
9. `sfx_boss_slam_impact` -- needs heavy boom with debris sounds

**Acceptance Criteria:**
- All 9 `sfx_boss_*` event IDs exist in `SOUND_MAP` with valid placeholder file references
- Every boss attack plays an audio cue at the appropriate moment (see audit table)
- No silent attacks -- every boss action that deals damage or starts a telegraph has a sound
- Audio cues are distinct enough that a player can tell which attack is coming from sound alone (different frequency/character per category)
- `MAX_CONCURRENT` is sufficient (no audio dropout during boss fights with multiple overlapping effects)
- Sound Pack Beta priority list is documented (in code comments or this bead doc)
- No regression to existing audio (other sound events, volume controls, mute toggle)

---

## Conflict Analysis

- **BD-218** touches `js/game3d.js` (state init, render loop camera offset, enemy update loop phase checks) -- CONFLICTS with BD-219 (same enemy update section)
- **BD-219** touches `js/game3d.js` (enemy update loop, boss visual rendering) -- CONFLICTS with BD-218 (same section), LOW conflict with BD-220-223 (different subsection of enemy update)
- **BD-220** touches `js/game3d.js` (boss attack selection, weapon projectile update) + `js/3d/audio.js` -- CONFLICTS with BD-221 (same attack pool selection code), LOW conflict with BD-222/223
- **BD-221** touches `js/game3d.js` (boss attack section, weapon effects update) + `js/3d/audio.js` -- CONFLICTS with BD-220 (same attack pool), LOW conflict with BD-222/223
- **BD-222** touches `js/game3d.js` (boss attack section, weapon effects update, existing Death Bolt code ~line 5302) + `js/3d/audio.js` -- CONFLICTS with BD-223 (Overlord attack pool), LOW conflict with BD-220/221
- **BD-223** touches `js/game3d.js` (boss attack section, enemy update loop, weapon effects update) + `js/3d/audio.js` -- CONFLICTS with BD-222 (Overlord attack pool)
- **BD-224** touches `js/game3d.js` (challenge shrine activation ~line 6271, enemy update loop entrance check, enemy movement) + `js/3d/audio.js` -- LOW conflict with BD-220-223 (different section: entrance vs attacks)
- **BD-225** touches `js/game3d.js` (visual polish across attack sections) -- CONFLICTS with BD-220-223 (modifies the same attack code they create)
- **BD-226** touches `js/game3d.js` (all boss attack sections for Chill tuning) + `js/3d/constants.js` + `js/3d/audio.js` -- CONFLICTS with BD-220-225 (modifies parameters in attack code)
- **BD-227** touches `js/3d/audio.js` (SOUND_MAP) -- LOW conflict with BD-220-226 (only touches audio.js, not game logic)

**Recommended sprint batches:**

- **Batch 1 (parallel pair):**
  - Agent 1: BD-218 (screen shake + phase system -- foundation)
  - Agent 2: BD-219 (boss phase visuals -- can parallel if it targets a different section than BD-218's phase check)
  - Note: BD-218 and BD-219 both touch enemy update. If conflicts are too tight, run BD-218 first, then BD-219.

- **Batch 2 (parallel quad, after Batch 1 merges):**
  - Agent 1: BD-220 (Titan Bone Barrage)
  - Agent 2: BD-221 (Titan Charge + Fissures) -- note: shares attack pool code with BD-220, may need post-merge integration
  - Agent 3: BD-222 (Overlord Volley + Shadow Zones)
  - Agent 4: BD-223 (Overlord Summon + Beam) -- shares Overlord pool with BD-222, may need post-merge integration

- **Batch 3 (parallel pair, after Batch 2 merges):**
  - Agent 1: BD-224 (Boss entrance sequence)
  - Agent 2: BD-225 (Visual telegraph polish)

- **Batch 4 (parallel pair, after Batch 3 merges):**
  - Agent 1: BD-226 (Chill Mode tuning + Dark Nova)
  - Agent 2: BD-227 (Audio placeholder audit)

**Maximum parallel agents:** 2 for Batch 1, 4 for Batch 2, 2 for Batch 3, 2 for Batch 4. Total calendar time: 4 batches.
