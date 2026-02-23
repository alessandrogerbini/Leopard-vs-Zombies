# Track E: Core Systems Extraction

**Focus:** Extract combat.js, enemies.js, spawning.js, powerups.js from the game3d.js monolith. Implement tiered merge ratios and merge visual punch-up.
**Key Files:** `js/3d/combat.js` (new), `js/3d/enemies.js` (new), `js/3d/spawning.js` (new), `js/3d/powerups.js` (new), `js/game3d.js` (reduce)
**Effort:** 16-22 hours
**Blocked By:** Nothing (can start Day 1)

**CRITICAL PRINCIPLE:** One module extraction per commit. Each extraction keeps the game fully playable. Use the "strangle fig" pattern: create the new module, wire up imports, verify the game works, then delete the original code from game3d.js.

---

## Task E-1: Extract combat.js

**What to build:** Extract `damageEnemy`, `killEnemy`, `findNearestEnemy`, and `getPlayerDmgMult` into a shared combat utility module. This is the highest-priority extraction because weapons, auto-attack, power attack, and powerup effects all call these functions.

**File:** `js/3d/combat.js` (new)

**Functions to extract:**

### findNearestEnemy
```javascript
/**
 * Find the nearest alive enemy within range of a position.
 * @param {Array} enemies - The enemies array (st.enemies)
 * @param {number} px - Search origin X
 * @param {number} pz - Search origin Z
 * @param {number} range - Maximum search radius
 * @returns {Object|null} The nearest enemy, or null if none in range
 */
export function findNearestEnemy(enemies, px, pz, range) {
  let nearest = null;
  let nearestDistSq = range * range;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = px - e.group.position.x;
    const dz = pz - e.group.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = e;
    }
  }
  return nearest;
}
```

### damageEnemy
This is the most cross-cutting function. It reads `st.items.gloves` (crit check), calls `killEnemy` on death, and creates floating damage text.

**Interface design:** Pass a `callbacks` object to avoid circular dependencies:
```javascript
/**
 * Apply damage to an enemy. Handles crit chance, death, and floating text.
 * @param {Object} e - Enemy object
 * @param {number} dmg - Base damage amount
 * @param {Object} st - Game state (reads items, writes floatingTexts3d)
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} callbacks - { onKill(e, st, scene), createFloatingText(text, x, y, z, color) }
 */
export function damageEnemy(e, dmg, st, scene, callbacks) {
  if (!e.alive) return;

  // Crit chance from Crit Gloves
  let finalDmg = dmg;
  if (st.items && st.items.gloves) {
    if (Math.random() < 0.15) {
      finalDmg *= 2;
      if (callbacks.createFloatingText) {
        callbacks.createFloatingText('CRIT!', e.group.position.x, e.group.position.y + 1.5, e.group.position.z, '#ffcc00');
      }
    }
  }

  e.hp -= finalDmg;

  // Hurt flash
  e.hurtTimer = 0.15;

  // Floating damage text
  if (callbacks.createFloatingText) {
    callbacks.createFloatingText(
      Math.ceil(finalDmg).toString(),
      e.group.position.x,
      e.group.position.y + 1.2,
      e.group.position.z,
      '#ff4444'
    );
  }

  if (e.hp <= 0) {
    e.alive = false;
    if (callbacks.onKill) {
      callbacks.onKill(e, st, scene);
    }
  }
}
```

### killEnemy
This function has the most side effects: score, XP gem creation, kill tracking, loot drops. It needs to be parameterized:
```javascript
/**
 * Process enemy death: score, XP drop, kill tracking, loot roll.
 * @param {Object} e - Dead enemy
 * @param {Object} st - Game state (writes score, totalKills, killsByTier, etc.)
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} callbacks - { createXpGem(x, y, z, value), createLootDrop(x, z), disposeEnemy(e) }
 */
export function killEnemy(e, st, scene, callbacks) {
  const tier = e.tier || 1;
  const tierData = ZOMBIE_TIERS[tier - 1];

  // Score
  const basePts = tier * 10;
  const pts = Math.floor(basePts * (st.scoreMult || 1) * (st.totemScoreMult || 1));
  st.score += pts;

  // XP gem
  const xpValue = Math.floor(tier * 5 * (st.totemXpMult || 1) * (st.augmentXpMult || 1));
  if (callbacks.createXpGem) {
    callbacks.createXpGem(e.group.position.x, e.group.position.y, e.group.position.z, xpValue);
  }

  // Kill tracking
  st.totalKills = (st.totalKills || 0) + 1;
  if (st.killsByTier) st.killsByTier[tier - 1] = (st.killsByTier[tier - 1] || 0) + 1;

  // Loot roll
  if (callbacks.createLootDrop) {
    callbacks.createLootDrop(e.group.position.x, e.group.position.z);
  }

  // Dispose enemy visual
  if (callbacks.disposeEnemy) {
    callbacks.disposeEnemy(e, scene);
  }
}
```

### getPlayerDmgMult
```javascript
/**
 * Calculate the player's total damage multiplier from level.
 * @param {number} level - Player level
 * @returns {number} Damage multiplier
 */
export function getPlayerDmgMult(level) {
  return 1 + (level - 1) * 0.05; // 5% per level
}
```

**Migration steps:**
1. Create `js/3d/combat.js` with the functions above
2. In `js/game3d.js`, add `import { findNearestEnemy, damageEnemy, killEnemy, getPlayerDmgMult } from './3d/combat.js';`
3. Replace the inline implementations in game3d.js with calls to the imported functions
4. Pass the `callbacks` object from the game loop context (where scene, createXpGem, etc. are available)
5. Test: play 5 minutes, kill enemies, verify score/XP/loot works
6. Commit

**Test criteria:**
```javascript
import { findNearestEnemy, damageEnemy, getPlayerDmgMult } from '../js/3d/combat.js';

// findNearestEnemy
const enemies = [
  { alive: true, group: { position: { x: 5, z: 0 } } },
  { alive: true, group: { position: { x: 2, z: 0 } } },
  { alive: false, group: { position: { x: 1, z: 0 } } }, // dead, skip
];
const nearest = findNearestEnemy(enemies, 0, 0, 10);
assertEqual(nearest.group.position.x, 2, 'Nearest alive enemy at x=2');

// findNearestEnemy with no enemies in range
const none = findNearestEnemy(enemies, 0, 0, 1);
assertEqual(none, null, 'No enemy within range 1');

// getPlayerDmgMult
assertEqual(getPlayerDmgMult(1), 1.0, 'Level 1 = 1x damage');
assertClose(getPlayerDmgMult(11), 1.5, 0.01, 'Level 11 = 1.5x damage');

// damageEnemy
const mockEnemy = { alive: true, hp: 100, tier: 1, hurtTimer: 0, group: { position: { x: 0, y: 0, z: 0 } } };
const mockSt = { items: {} };
const mockCallbacks = { createFloatingText: () => {}, onKill: () => {} };
damageEnemy(mockEnemy, 30, mockSt, null, mockCallbacks);
assertEqual(mockEnemy.hp, 70, 'Enemy took 30 damage');
assert(mockEnemy.alive, 'Enemy still alive at 70 HP');

damageEnemy(mockEnemy, 80, mockSt, null, mockCallbacks);
assert(!mockEnemy.alive, 'Enemy dead after 80 more damage');
```

**Playtest verification:**
- Enemies take damage from auto-attack, weapons, power attack
- Floating damage numbers appear
- Crit Gloves produce "CRIT!" text
- Killed enemies drop XP gems and loot
- Score increments correctly
- Kill stats display on game-over screen

**Done when:** All 4 functions extracted, game3d.js imports them, game plays identically to before.

---

## Task E-2: Extract enemies.js

**What to build:** Extract enemy creation, tier system visuals, AI movement, platform jumping, merge check, and disposal into a dedicated module.

**File:** `js/3d/enemies.js` (new)

**Functions to extract:**

### createEnemy
```javascript
export function createEnemy(x, z, baseHp, tier, scene, terrain) {
  // Build the enemy model (boxes: body, head, arms, legs, tier-specific visual upgrades)
  // Position at terrain height
  // Return enemy object with { group, alive, hp, maxHp, tier, speed, walkPhase, hurtTimer, ... }
}
```

### disposeEnemy
```javascript
export function disposeEnemy(e, scene) {
  if (e.group) {
    e.group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material?.dispose();
      }
    });
    scene.remove(e.group);
  }
}
```

### updateEnemyAI
```javascript
export function updateEnemyAI(dt, enemies, playerState, platforms, terrain, totemMults) {
  for (const e of enemies) {
    if (!e.alive) continue;
    // Bee-line movement toward player
    // Ground height following
    // Platform jumping (probability-based per tier)
    // Walk animation
    // Hurt timer countdown + flash
  }
}
```

### updateMerging (current 1:1 system, will be changed in E-3)
```javascript
export function updateMerging(enemies, scene, terrain) {
  // O(N^2) nested loop
  // Same-tier collision -> merge into next tier
  // Different-tier collision -> push apart
  // Returns array of merge events for audio hookup
}
```

**Migration steps:**
1. Create `js/3d/enemies.js` with all functions
2. Import in game3d.js
3. Replace inline code with calls to imported functions
4. Test all 10 tiers, AI behavior, merge, platform climbing
5. Commit

**Test criteria:**
```javascript
import { createEnemy, disposeEnemy } from '../js/3d/enemies.js';
// createEnemy produces valid enemy object (requires THREE.js mock or browser test)
// disposeEnemy safely handles null group
const mockEnemy = { group: null };
disposeEnemy(mockEnemy, null); // should not throw
```

**Playtest verification:**
- Enemies spawn and chase player
- Enemies follow terrain height (no floating, no clipping)
- Same-tier enemies merge on collision
- Higher-tier enemies have visual upgrades (glowing eyes, horns, auras)
- Enemies jump onto platforms

**Done when:** All enemy logic lives in enemies.js. Game plays identically.

---

## Task E-3: Implement Tiered Merge Ratios

**What to build:** Replace the 1:1 merge system with tiered merge ratios. Only 4 tiers for alpha (down from 10).

**File:** `js/3d/enemies.js` (modify updateMerging)

**Merge ratios (from v3 plan):**

| Tier | Name | Merge Ratio | Visual Cue |
|------|------|-------------|------------|
| 1 | Shambler | base | Default zombie |
| 2 | Lurcher | 5 Shamblers | Slightly larger, faster |
| 3 | Bruiser | 3 Lurchers | Visibly larger, glowing eyes |
| 4 | Mega | 2 Bruisers | Boss-sized, screen shake on spawn |

**Implementation:**
Instead of instant 1:1 merging, track a "merge progress" per location. When enough same-tier zombies are close together, they merge:

```javascript
// Simplified approach: when two same-tier zombies touch,
// increment a "merge counter" on the survivor. When the counter
// reaches the merge ratio, it evolves.

// Per-enemy: e.mergeCount = 0
// On same-tier collision:
//   If e.tier === 1: absorb other, increment mergeCount. At 5, evolve to tier 2.
//   If e.tier === 2: absorb other, increment mergeCount. At 3, evolve to tier 3.
//   If e.tier === 3: absorb other, increment mergeCount. At 2, evolve to tier 4.
//   If e.tier === 4: no further merging (cap).

const MERGE_RATIOS = [5, 3, 2]; // tier 1->2 needs 5, tier 2->3 needs 3, tier 3->4 needs 2

export function updateMerging(enemies, scene, terrain, audio) {
  const mergeEvents = [];
  const ZOMBIE_RADIUS = 0.5;

  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!a.alive) continue;
    const aTier = a.tier || 1;
    if (aTier >= 4) continue; // Tier 4 = max for alpha
    const aScale = ZOMBIE_TIERS[aTier - 1].scale;

    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!b.alive) continue;
      const bTier = b.tier || 1;

      const dx = a.group.position.x - b.group.position.x;
      const dz = a.group.position.z - b.group.position.z;
      const bScale = ZOMBIE_TIERS[bTier - 1].scale;
      const minDist = ZOMBIE_RADIUS * (aScale + bScale);
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist && distSq > 0.001) {
        if (aTier === bTier) {
          // Same tier: absorb b into a
          b.alive = false;
          disposeEnemy(b, scene);
          a.mergeCount = (a.mergeCount || 0) + 1;

          // Check if merge threshold reached
          const threshold = MERGE_RATIOS[aTier - 1];
          if (a.mergeCount >= threshold - 1) { // -1 because counting absorbed enemies
            // Evolve!
            const newTier = aTier + 1;
            const newEnemy = createEnemy(
              a.group.position.x, a.group.position.z,
              a.maxHp * ZOMBIE_TIERS[newTier - 1].hpMult / ZOMBIE_TIERS[aTier - 1].hpMult,
              newTier, scene, terrain
            );
            newEnemy.mergeCount = 0;
            a.alive = false;
            disposeEnemy(a, scene);
            enemies.push(newEnemy);
            mergeEvents.push({ tier: newTier, x: newEnemy.group.position.x, z: newEnemy.group.position.z });
            break; // a is dead, stop checking its pairs
          }

          // Visual feedback: a briefly flashes
          a.hurtTimer = 0.1;
        } else {
          // Different tier: push apart
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.group.position.x += nx * overlap;
          b.group.position.x -= nx * overlap;
          a.group.position.z += nz * overlap;
          b.group.position.z -= nz * overlap;
        }
      }
    }
  }

  return mergeEvents;
}
```

**Test criteria:**
```javascript
// Tier 1 merge ratio
assertEqual(MERGE_RATIOS[0], 5, 'Tier 1->2 requires 5 shamblers');
assertEqual(MERGE_RATIOS[1], 3, 'Tier 2->3 requires 3 lurchers');
assertEqual(MERGE_RATIOS[2], 2, 'Tier 3->4 requires 2 bruisers');

// Max tier is 4 for alpha
// (visual test in-game)
```

**Playtest verification:**
- Spawn many tier-1 zombies (long run on easy)
- Watch 5 shamblers gradually merge into 1 lurcher
- Watch 3 lurchers merge into 1 bruiser
- Watch 2 bruisers merge into 1 mega (boss-sized, screen shakes)
- A Tier 4 Mega spawns visibly during a 10-minute Normal run

**Done when:** Merge ratios implemented, 4-tier system functional, Tier 4 Mega appears in a 10-minute Normal run.

---

## Task E-4: Merge Visual Punch-Up

**What to build:** When a merge occurs, create a visual and audio event: flash, scale-up bounce, particle burst, and merge sound.

**File:** `js/3d/enemies.js` (add VFX on merge), hookup in game3d.js for audio

**Visual effects on merge:**
1. **Flash:** The new enemy's material briefly turns white for 0.2 seconds
2. **Scale bounce:** The new enemy starts at 1.3x scale and lerps down to 1.0x over 0.5 seconds
3. **Particle burst:** 8-12 small colored particles radiate outward from the merge point
4. **Screen shake:** For tier 4 (Mega) only -- apply screen shake for 0.3 seconds

**Audio:** Play `sfx_zombie_merge` (zombie-3.ogg / zombie-6.ogg) on each merge event. For tier 4 Mega, also play `sfx_zombie_death_high` for dramatic effect.

**Implementation:**
The merge function from E-3 returns `mergeEvents`. In the game loop, process these events:
```javascript
const mergeEvents = updateMerging(st.enemies, scene, terrainHeight, audio);
for (const event of mergeEvents) {
  audio.play('sfx_zombie_merge');
  if (event.tier === 4) {
    // Screen shake
    st.screenShake = 0.3;
    audio.play('sfx_zombie_death_high');
  }
  // Spawn particle burst at merge location
  spawnMergeParticles(event.x, terrainHeight(event.x, event.z) + 1, event.z, scene);
}
```

**Done when:** Merges produce visible flash, scale bounce, and particles. Tier 4 spawn causes screen shake. All merges play a sound.

---

## Task E-5: Extract spawning.js

**What to build:** Extract ambient spawn logic and wave event logic into a dedicated module.

**File:** `js/3d/spawning.js` (new)

**Functions to extract:**
```javascript
/**
 * Update ambient enemy spawning (periodic, scaled by difficulty/time).
 * @param {number} dt - Delta time
 * @param {Object} st - Game state
 * @param {THREE.Scene} scene - Scene
 * @param {function} terrain - terrainHeight function
 * @param {function} createEnemy - Enemy creation function
 */
export function updateAmbientSpawning(dt, st, scene, terrain, createEnemy) { ... }

/**
 * Update wave event timer and trigger wave spawns.
 * @param {number} dt - Delta time
 * @param {Object} st - Game state
 * @param {THREE.Scene} scene - Scene
 * @param {function} terrain - terrainHeight function
 * @param {function} createEnemy - Enemy creation function
 */
export function updateWaveEvents(dt, st, scene, terrain, createEnemy) { ... }
```

**Done when:** Spawning logic lives in spawning.js. Ambient spawns and wave events work identically.

---

## Task E-6: Extract powerups.js

**What to build:** Extract the 18 powerup effect update logic (fire aura, flight mechanics, bomb trail, mirror clones, etc.) into a dedicated module.

**File:** `js/3d/powerups.js` (new)

**Functions to extract:**
```javascript
/**
 * Update all active powerup effects per frame.
 * @param {number} dt - Delta time
 * @param {Object} st - Game state
 * @param {THREE.Scene} scene - Scene
 * @param {THREE.Clock} clock - Clock for timing
 * @param {Object} callbacks - { damageEnemy, findNearestEnemy }
 */
export function updatePowerupEffects(dt, st, scene, clock, callbacks) { ... }

/**
 * Activate a powerup from a crate.
 * @param {Object} powerupDef - Powerup definition from POWERUPS_3D
 * @param {Object} st - Game state
 */
export function activatePowerup(powerupDef, st) {
  // Deactivate previous if any
  if (st.activePowerup) {
    st.activePowerup.def.remove(st);
  }
  powerupDef.apply(st);
  st.activePowerup = { def: powerupDef, timer: powerupDef.duration };
}

/**
 * Update powerup timer and deactivate when expired.
 */
export function updatePowerupTimer(dt, st) {
  if (st.activePowerup) {
    st.activePowerup.timer -= dt;
    if (st.activePowerup.timer <= 0) {
      st.activePowerup.def.remove(st);
      st.activePowerup = null;
    }
  }
}
```

**Risk note:** Powerup effects are the most complex extraction because many effects create/destroy Three.js objects inline (fire particles, mirror clone groups, bomb trail bombs). These need the scene reference passed through. The extraction may need to return "spawn requests" that the game loop processes, or simply take the scene as a parameter.

**Done when:** All 18 powerup effects work correctly from the extracted module. Fire aura, flight, mirror clones, bomb trail all function.

---

## Testing Checklist After All E-Track Extractions

After all E-1 through E-6 are complete, run this full verification:

- [ ] Game launches without console errors
- [ ] Can select each of the 4 animals
- [ ] Can play for 5+ minutes without crashes
- [ ] Enemies spawn, chase, deal contact damage
- [ ] Same-tier zombies merge (tiered ratios: 5, 3, 2)
- [ ] Merge VFX plays (flash, bounce, particles, sound)
- [ ] Tier 4 Mega spawns with screen shake
- [ ] Auto-attack, power attack, and all 6 weapons deal damage
- [ ] XP gems drop, XP bar fills, level-up triggers
- [ ] Level-up menu offers weapons, howls (renamed), upgrades
- [ ] All 18 powerups activate from crates correctly
- [ ] Wave events trigger every 4 minutes
- [ ] Pause menu works (Resume/Restart/Main Menu)
- [ ] Game-over screen shows score and leaderboard
- [ ] Can return to main menu from 3D mode
- [ ] No memory leaks visible in Chrome DevTools (memory tab stable over 10 minutes)
