/**
 * @module enemies
 * @description Handles all enemy entity creation and per-frame AI updates for
 * the 2D Classic mode. This includes regular zombies, the end-of-level boss,
 * and player allies. Each entity type has a spawn function that populates the
 * global state arrays and an update function that runs every frame to handle
 * movement, attacks, physics, and death.
 *
 * Dependencies: state.js (GRAVITY, GROUND_Y, state, player, POWERUP_TYPES,
 *   POWERUP_DURATION, DIFFICULTY_SETTINGS), utils.js (rectCollide,
 *   spawnParticles, spawnFloatingText, addScore)
 * Exports: 6 functions — spawnZombies, spawnBoss, updateZombieAI,
 *   updateBossAI, spawnAlly, updateAllyAI
 *
 * Key concepts:
 * - Zombies have two types: 'normal' and 'big' (30% chance). Big zombies are
 *   wider, taller, have 1.8x HP, and move at 0.7x speed.
 * - The boss uses a two-phase system: Phase 1 is normal, Phase 2 activates at
 *   50% HP with faster speed and reduced cooldowns.
 * - Boss attacks use a telegraph pattern: a countdown timer warns the player
 *   before each attack fires, giving time to dodge.
 * - Allies follow the player, chase nearby enemies, and have a lives/respawn
 *   system (3 lives, 120-frame respawn timer).
 */

/**
 * @typedef {Object} Zombie
 * @property {number} x - Horizontal position (left edge).
 * @property {number} y - Vertical position (top edge).
 * @property {number} w - Width in pixels (36 for normal, 44 for big).
 * @property {number} h - Height in pixels (48 for normal, 56 for big).
 * @property {number} vx - Horizontal velocity.
 * @property {number} vy - Vertical velocity.
 * @property {number} hp - Current hit points.
 * @property {number} maxHp - Maximum hit points (1.8x for big zombies).
 * @property {number} speed - Base movement speed (randomized per zombie, 0.7x for big).
 * @property {boolean} onGround - Whether the zombie is currently on the ground.
 * @property {number} facing - Direction facing: 1 for right, -1 for left.
 * @property {number} frame - Current animation frame index (0-3).
 * @property {number} frameTimer - Ticks until next animation frame.
 * @property {number} attackTimer - Accumulates while overlapping the player; attack fires at 20.
 * @property {number} hurt - Remaining hurt-flash frames (decrements each tick).
 * @property {string} type - Zombie variant: 'normal' or 'big'.
 * @property {boolean} alive - Whether the zombie is still alive.
 * @property {number} [_carHitCooldown] - Frames of immunity after being hit by the race car powerup.
 */

/**
 * @typedef {Object} Boss
 * @property {number} x - Horizontal position (left edge).
 * @property {number} y - Vertical position (top edge).
 * @property {number} w - Width in pixels (70).
 * @property {number} h - Height in pixels (90).
 * @property {number} vx - Horizontal velocity.
 * @property {number} vy - Vertical velocity.
 * @property {number} hp - Current hit points (600 for level 3, 300 otherwise).
 * @property {number} maxHp - Maximum hit points.
 * @property {number} speed - Movement speed (1.0 in phase 1, 1.8 in phase 2).
 * @property {boolean} onGround - Whether the boss is currently on the ground.
 * @property {number} facing - Direction facing: 1 for right, -1 for left.
 * @property {number} frame - Current animation frame index (0-3).
 * @property {number} frameTimer - Ticks until next animation frame.
 * @property {number} attackTimer - Melee attack accumulator.
 * @property {number} hurt - Remaining hurt-flash frames.
 * @property {boolean} alive - Whether the boss is still alive.
 * @property {number} phase - Boss phase: 1 (normal) or 2 (enraged, below 50% HP).
 * @property {number} slamCooldown - Frames remaining before charge attack is available.
 * @property {number} chargeTimer - Frames remaining in current charge animation.
 * @property {boolean} isCharging - Whether the boss is currently performing a charge.
 * @property {number} skullCooldown - Frames remaining before skull projectile is available.
 * @property {number} aoeCooldown - Frames remaining before AOE slam is available.
 * @property {number} mortarCooldown - Frames remaining before mortar volley is available.
 * @property {number} skullTelegraph - Frames remaining in skull telegraph countdown (0 = fire).
 * @property {number} skullTargetX - Stored X target for skull projectile.
 * @property {number} skullTargetY - Stored Y target for skull projectile.
 * @property {number} aoeTelegraph - Frames remaining in AOE telegraph countdown (0 = slam).
 * @property {number} aoeTargetX - Stored X target for AOE slam center.
 * @property {number} mortarTelegraph - Frames remaining in mortar telegraph countdown (0 = fire).
 * @property {Array<{x: number, y: number}>} mortarTargets - Stored target positions for mortar rounds.
 * @property {number} [_carHitCooldown] - Frames of immunity after being hit by the race car powerup.
 */

/**
 * @typedef {Object} Ally
 * @property {number} x - Horizontal position (left edge).
 * @property {number} y - Vertical position (top edge).
 * @property {number} w - Width in pixels (83 for horse, 69 otherwise).
 * @property {number} h - Height in pixels (90 for horse, 86 otherwise).
 * @property {number} vx - Horizontal velocity.
 * @property {number} vy - Vertical velocity.
 * @property {number} hp - Current hit points (inherits player.maxHp at spawn).
 * @property {number} maxHp - Maximum hit points.
 * @property {number} lives - Remaining respawn lives (starts at 3).
 * @property {number} speed - Movement speed (2.5 for horse, 1.8 otherwise).
 * @property {number} damage - Melee attack damage (20 for horse, 15 otherwise).
 * @property {boolean} onGround - Whether the ally is currently on the ground.
 * @property {number} facing - Direction facing: 1 for right, -1 for left.
 * @property {number} frame - Current animation frame index.
 * @property {number} frameTimer - Ticks until next animation frame.
 * @property {number} attackTimer - Visual attack animation countdown.
 * @property {number} attackCooldown - Frames remaining before next melee attack.
 * @property {number} hurt - Remaining hurt-flash frames.
 * @property {string} type - Ally variant (e.g. 'horse').
 * @property {boolean} alive - Whether the ally is currently alive.
 * @property {boolean} invulnerable - Permanent invulnerability flag (not currently used).
 * @property {number} invincibleTimer - Temporary invincibility frames after taking damage or respawning.
 * @property {number} respawnTimer - Frames remaining until respawn (120 frames = 2 seconds at 60fps).
 */

// Zombie spawning, zombie AI, boss spawning, boss AI
import { GRAVITY, GROUND_Y, state, player, POWERUP_TYPES, POWERUP_DURATION, DIFFICULTY_SETTINGS } from './state.js';
import { rectCollide, spawnParticles, spawnFloatingText, addScore } from './utils.js';

/**
 * Populate the zombie array for the current level.
 *
 * Creates `levelData.zombieCount` zombies distributed evenly across the level
 * width (from x=300 to levelWidth-300). Each zombie gets a randomized speed
 * multiplier (0.8x to 1.2x). Approximately 30% become 'big' variants with
 * increased size/HP and reduced speed.
 *
 * @see updateZombieAI
 */
export function spawnZombies() {
  state.zombies = [];
  const ld = state.levelData;
  for (let i = 0; i < ld.zombieCount; i++) {
    const x = 300 + (i / ld.zombieCount) * (ld.width - 600);
    state.zombies.push({
      x, y: GROUND_Y, w: 36, h: 48,
      vx: 0, vy: 0,
      hp: ld.zombieHp, maxHp: ld.zombieHp,
      speed: ld.zombieSpeed * (0.8 + Math.random() * 0.4),
      onGround: false,
      facing: -1,
      frame: 0, frameTimer: 0,
      attackTimer: 0,
      hurt: 0,
      type: Math.random() < 0.3 ? 'big' : 'normal',
      alive: true
    });
  }
  state.zombies.forEach(z => {
    if (z.type === 'big') {
      z.w = 44; z.h = 56;
      z.hp *= 1.8; z.maxHp = z.hp;
      z.speed *= 0.7;
    }
  });
}

/**
 * Create the boss entity and attach it to `state.boss`.
 *
 * The boss spawns near the right edge of the level (levelWidth - 400) with
 * HP that depends on the current level (600 HP on level 3, 300 HP otherwise).
 * Initializes all four attack cooldowns, telegraph counters, and the
 * two-phase state machine at phase 1.
 *
 * @see updateBossAI
 */
export function spawnBoss() {
  const ld = state.levelData;
  const bossHp = state.currentLevel === 3 ? 600 : 300;
  state.boss = {
    x: ld.width - 400, y: GROUND_Y - 20,
    w: 70, h: 90,
    vx: 0, vy: 0,
    hp: bossHp, maxHp: bossHp,
    speed: 1.0,
    onGround: false,
    facing: -1,
    frame: 0, frameTimer: 0,
    attackTimer: 0,
    hurt: 0,
    alive: true,
    phase: 1,
    slamCooldown: 0,
    chargeTimer: 0,
    isCharging: false,
    // New attack cooldowns
    skullCooldown: 0,
    aoeCooldown: 0,
    mortarCooldown: 0,
    // Telegraph counters and targets
    skullTelegraph: 0,
    skullTargetX: 0,
    skullTargetY: 0,
    aoeTelegraph: 0,
    aoeTargetX: 0,
    mortarTelegraph: 0,
    mortarTargets: [],
  };
}

/**
 * Run one frame of AI for every living zombie.
 *
 * Each zombie performs three steps per frame:
 * 1. **Chase** — If within 400px of the player, accelerate toward them.
 *    Otherwise, decelerate via friction (0.9x).
 * 2. **Attack** — If the zombie's extended hitbox overlaps the player,
 *    increment the attack timer. At 20, deal damage (11 normal / 19 big),
 *    apply knockback, screen shake, and grant invincibility frames. Race car
 *    powerup reduces damage by 80%.
 * 3. **Physics** — Apply gravity, update position, apply ground clamping,
 *    and enforce level bounds. Friction of 0.88x is applied each frame.
 *
 * @see spawnZombies
 */
export function updateZombieAI() {
  const ld = state.levelData;

  state.zombies.forEach(z => {
    if (!z.alive) return;
    if (z.hurt > 0) { z.hurt--; }
    if (z._carHitCooldown > 0) z._carHitCooldown--;

    const dist = player.x - z.x;
    const absDist = Math.abs(dist);

    // Chase player when within range
    if (absDist < 400) {
      z.facing = dist > 0 ? 1 : -1;
      if (absDist > 10) {
        z.vx += z.facing * z.speed * 0.4;
        if (Math.abs(z.vx) > z.speed * 1.3) z.vx = z.facing * z.speed * 1.3;
      }
    } else {
      z.vx *= 0.9;
    }

    // Attack - wide hitbox to catch running players
    const reach = z.type === 'big' ? 20 : 15;
    const zBox = { x: z.x - reach, y: z.y - 5, w: z.w + reach * 2, h: z.h + 10 };
    const pBox = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectCollide(zBox, pBox)) {
      z.attackTimer += 2;
      if (z.attackTimer > 20) {
        if (player.invincible <= 0) {
          let dmg = z.type === 'big' ? 19 : 11;
          // Race car armor: 80% damage reduction
          if (player.powerups.raceCar > 0) dmg = Math.max(1, Math.floor(dmg * 0.2));
          player.hp -= dmg;
          player.invincible = 30;
          player.knockbackX = z.facing * 8;
          player.vy = -4;
          state.screenShake = 8;
          state.screenFlash = 5;
          spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ff0000', 6, 5);
          spawnFloatingText(player.x + player.w/2, player.y - 10, `-${dmg}`, '#ff0000');
        }
        z.attackTimer = 0;
      }
    } else {
      z.attackTimer = Math.max(0, z.attackTimer - 1);
    }

    // Physics
    z.vy += GRAVITY;
    z.x += z.vx;
    z.y += z.vy;
    z.vx *= 0.88;

    if (z.y >= GROUND_Y) { z.y = GROUND_Y; z.vy = 0; z.onGround = true; }
    z.x = Math.max(0, Math.min(z.x, ld.width - z.w));

    z.frameTimer++;
    if (z.frameTimer > 10) { z.frame = (z.frame + 1) % 4; z.frameTimer = 0; }
  });
}

/**
 * Run one frame of boss AI including phase transitions, attack selection,
 * telegraph countdowns, movement, melee combat, and physics.
 *
 * The boss uses a **telegraph system** for three of its four attacks: before
 * firing, a telegraph counter is set (40-50 frames). Each frame the counter
 * decrements; at zero the attack executes. This gives the player a visual
 * warning window to dodge. Only one telegraph can be active at a time.
 *
 * **Attack priority** (checked in order, all require no active telegraph):
 * 1. **Charge** (150-500px range) — Wind-up then dash toward the player.
 *    Cooldown: 110 frames (70 in phase 2).
 * 2. **Skull projectile** (>300px range) — Telegraph 40 frames, then fire a
 *    homing skull. Cooldown: 100 frames (60 in phase 2).
 * 3. **AOE slam** (<120px range) — Telegraph 50 frames, then expanding
 *    shockwave. Cooldown: 130 frames (80 in phase 2).
 * 4. **Mortar volley** (120-400px range) — Telegraph 45 frames, then fire
 *    3 (or 5 in phase 2) arcing projectiles. Cooldown: 150 frames (90 in
 *    phase 2).
 *
 * Phase 2 activates at 50% HP: speed increases from 1.0 to 1.8, all
 * cooldowns are shorter, and mortar fires 5 rounds instead of 3.
 *
 * @see spawnBoss
 */
export function updateBossAI() {
  const boss = state.boss;
  const ld = state.levelData;
  if (!boss || !boss.alive || state.gameState !== 'bossFight') return;

  if (boss.hurt > 0) boss.hurt--;
  if (boss._carHitCooldown > 0) boss._carHitCooldown--;

  const dist = player.x - boss.x;
  const absDist = Math.abs(dist);
  boss.facing = dist > 0 ? 1 : -1;

  // Phase 2 at 50% HP
  if (boss.hp < boss.maxHp * 0.5 && boss.phase === 1) {
    boss.phase = 2;
    boss.speed = 1.8;
    spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS ENRAGED!', '#ff0000');
    state.screenShake = 10;
  }

  // Tick all cooldowns
  if (boss.slamCooldown > 0) boss.slamCooldown--;
  if (boss.skullCooldown > 0) boss.skullCooldown--;
  if (boss.aoeCooldown > 0) boss.aoeCooldown--;
  if (boss.mortarCooldown > 0) boss.mortarCooldown--;

  const p2 = boss.phase === 2;

  // === TELEGRAPH COUNTDOWN LOGIC ===
  // Telegraph pattern: when an attack is chosen, its telegraph counter is set
  // to a positive value (40-50 frames). Each frame the counter decrements.
  // When it reaches 0, the attack fires using pre-stored target coordinates.
  // During the telegraph window, the renderer draws a warning indicator so
  // the player can see where the attack will land and dodge accordingly.

  // Skull telegraph countdown — 40 frames of warning before a aimed projectile
  if (boss.skullTelegraph > 0) {
    boss.skullTelegraph--;
    if (boss.skullTelegraph <= 0) {
      // Telegraph complete: fire the skull at the stored target position
      const spd = p2 ? 4 : 3;
      const dx = boss.skullTargetX - boss.x;
      const dy = boss.skullTargetY - (boss.y + boss.h * 0.3);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      state.projectiles.push({
        type: 'bossSkull',
        x: boss.x + boss.w / 2 + boss.facing * 20,
        y: boss.y + boss.h * 0.3,
        vx: (dx / len) * spd,
        vy: (dy / len) * spd,
        damage: 25,
        life: 180,
        hitPlayer: false
      });
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h * 0.3, '#44ff44', 5, 4);
    }
  }

  // AOE telegraph countdown — 50 frames of warning before a ground-centered shockwave
  if (boss.aoeTelegraph > 0) {
    boss.aoeTelegraph--;
    if (boss.aoeTelegraph <= 0) {
      // Telegraph complete: spawn the expanding AOE slam at the boss's stored position
      state.projectiles.push({
        type: 'bossAOE',
        x: boss.aoeTargetX,
        y: GROUND_Y,
        radius: 0,
        maxRadius: p2 ? 180 : 150,
        damage: 20,
        life: p2 ? 25 : 30,
        hitPlayer: false
      });
      state.screenShake = 8;
      spawnParticles(boss.aoeTargetX, GROUND_Y, '#88ff88', 12, 8);
      spawnFloatingText(boss.aoeTargetX, boss.y - 20, 'SLAM!', '#88ff88');
    }
  }

  // Mortar telegraph countdown — 45 frames of warning before an arcing volley
  if (boss.mortarTelegraph > 0) {
    boss.mortarTelegraph--;
    if (boss.mortarTelegraph <= 0) {
      // Telegraph complete: fire mortars at each stored target (spread around player)
      boss.mortarTargets.forEach(target => {
        const dx = target.x - (boss.x + boss.w / 2);
        const travelTime = 55 + Math.random() * 10;
        const vx = dx / travelTime;
        const vy = -6 - Math.random() * 1.5;
        state.projectiles.push({
          type: 'bossMortar',
          x: boss.x + boss.w / 2,
          y: boss.y + boss.h * 0.2,
          vx: vx,
          vy: vy,
          damage: 18,
          life: 120,
          hitPlayer: false
        });
      });
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h * 0.2, '#44ff44', 8, 6);
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 30, 'MORTAR!', '#66ff66');
    }
  }

  // === ATTACK SELECTION (distance-based priority) ===
  // Attacks are checked in a fixed priority order. The first attack whose
  // distance condition and cooldown are both satisfied wins. Only one attack
  // can begin per frame, and no new attack starts while a telegraph is active.
  // Only start new attacks if no telegraph is active
  const telegraphActive = boss.skullTelegraph > 0 || boss.aoeTelegraph > 0 || boss.mortarTelegraph > 0;

  // Priority 1: CHARGE attack (medium range 150-500px) — immediate, no telegraph
  if (!boss.isCharging && !telegraphActive && absDist < 500 && absDist > 150 && boss.slamCooldown <= 0) {
    boss.isCharging = true;
    boss.chargeTimer = p2 ? 24 : 30;
    boss.slamCooldown = p2 ? 70 : 110;
  }

  // Priority 2: SKULL PROJECTILE (long range > 300px) — 40-frame telegraph then fire
  if (!boss.isCharging && !telegraphActive && absDist > 300 && boss.skullCooldown <= 0) {
    boss.skullTelegraph = 40;
    boss.skullTargetX = player.x + player.w / 2;
    boss.skullTargetY = player.y + player.h / 2;
    boss.skullCooldown = p2 ? 60 : 100;
  }

  // Priority 3: AOE SLAM (close range < 120px) — 50-frame telegraph then expanding shockwave
  if (!boss.isCharging && !telegraphActive && absDist < 120 && boss.aoeCooldown <= 0) {
    boss.aoeTelegraph = 50;
    boss.aoeTargetX = boss.x + boss.w / 2;
    boss.aoeCooldown = p2 ? 80 : 130;
  }

  // Priority 4: MORTAR VOLLEY (medium range 120-400px) — 45-frame telegraph then arcing volley
  if (!boss.isCharging && !telegraphActive && absDist > 120 && absDist < 400 && boss.mortarCooldown <= 0) {
    const count = p2 ? 5 : 3;
    boss.mortarTargets = [];
    for (let i = 0; i < count; i++) {
      const spread = (i - Math.floor(count / 2)) * 40;
      boss.mortarTargets.push({ x: player.x + spread, y: GROUND_Y });
    }
    boss.mortarTelegraph = 45;
    boss.mortarCooldown = p2 ? 90 : 150;
  }

  // === MOVEMENT ===

  if (boss.isCharging) {
    boss.chargeTimer--;
    if (boss.chargeTimer > 15) {
      // Wind-up: step back
      boss.vx = boss.facing * -1.5;
    } else if (boss.chargeTimer > 0) {
      // Charge forward - faster and more dangerous
      boss.vx = boss.facing * (p2 ? 10 : 7);
      spawnParticles(boss.x + boss.w/2, boss.y + boss.h, '#888888', 2, 3);
    } else {
      boss.isCharging = false;
    }
  } else {
    // Improved chase AI - much more aggressive pursuit
    if (absDist > boss.w * 0.5) {
      const accel = p2 ? 0.6 : 0.4;
      const maxSpd = p2 ? 2.8 : 1.8;
      boss.vx += boss.facing * accel;
      if (Math.abs(boss.vx) > maxSpd) boss.vx = boss.facing * maxSpd;
    }
  }

  // Boss melee attack
  const bossBox = { x: boss.x - 8, y: boss.y, w: boss.w + 16, h: boss.h };
  const pBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectCollide(bossBox, pBox)) {
    boss.attackTimer++;
    const atkSpeed = p2 ? 20 : 30;
    if (boss.attackTimer > atkSpeed) {
      if (player.invincible <= 0) {
        let dmg = boss.isCharging ? 35 : 22;
        // Race car armor: 80% damage reduction
        if (player.powerups.raceCar > 0) dmg = Math.max(1, Math.floor(dmg * 0.2));
        player.hp -= dmg;
        player.invincible = 40;
        player.knockbackX = boss.facing * 12;
        player.vy = -6;
        state.screenShake = 12;
        state.screenFlash = 8;
        spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ff0000', 10, 8);
        spawnFloatingText(player.x + player.w/2, player.y - 10, `-${dmg}`, '#ff0000');
      }
      boss.attackTimer = 0;
    }
  } else {
    boss.attackTimer = Math.max(0, boss.attackTimer - 1);
  }

  // Boss physics
  boss.vy += GRAVITY;
  boss.x += boss.vx;
  boss.y += boss.vy;
  boss.vx *= 0.9;

  if (boss.y + boss.h >= GROUND_Y + boss.h) {
    boss.y = GROUND_Y + boss.h - boss.h;
    boss.vy = 0;
    boss.onGround = true;
  }
  boss.x = Math.max(ld.width - 800, Math.min(boss.x, ld.width - boss.w));

  boss.frameTimer++;
  if (boss.frameTimer > 8) { boss.frame = (boss.frame + 1) % 4; boss.frameTimer = 0; }
}

/**
 * Create a new ally entity and add it to `state.allies`.
 *
 * Allies fight alongside the player, automatically chasing and attacking
 * nearby enemies. They inherit the player's current maxHp, start with 3 lives,
 * and respawn 120 frames after death (while lives remain). Horse allies are
 * larger, faster, and deal more damage than the default ally type.
 *
 * @param {string} type - The ally variant (e.g. 'horse'). Determines size, speed, and damage.
 * @param {number} x - Initial horizontal position.
 * @param {number} y - Initial vertical position.
 * @param {boolean} [invulnerable] - If true, the ally cannot take damage (currently unused by callers).
 * @returns {Ally} The newly created ally object.
 * @see updateAllyAI
 */
export function spawnAlly(type, x, y, invulnerable) {
  const ally = {
    x: x, y: y, w: type === 'horse' ? 83 : 69, h: type === 'horse' ? 90 : 86,
    vx: 0, vy: 0,
    hp: player.maxHp,
    maxHp: player.maxHp,
    lives: 3,
    speed: type === 'horse' ? 2.5 : 1.8,
    damage: type === 'horse' ? 20 : 15,
    onGround: false,
    facing: 1,
    frame: 0, frameTimer: 0,
    attackTimer: 0, attackCooldown: 0,
    hurt: 0,
    type: type,
    alive: true,
    invulnerable: false,
    invincibleTimer: 0,
    respawnTimer: 0,
  };
  state.allies.push(ally);
  return ally;
}

/**
 * Run one frame of AI for every ally in `state.allies`.
 *
 * Each ally performs these steps per frame:
 * 1. **Respawn** — If dead and lives remain, decrement the respawn timer.
 *    At zero, revive near the player with full HP and 60 frames of
 *    invincibility.
 * 2. **Target selection** — Find the nearest enemy (zombie or boss) within
 *    300px. If none found, the ally follows the player instead.
 * 3. **Combat** — When chasing an enemy and within melee reach (40px for
 *    horse, 24px otherwise), deal damage, apply knockback, and check for
 *    kills (awards score, spawns diamond on boss kill).
 * 4. **Follow** — When no enemy target exists, the ally loosely follows the
 *    player: fast pursuit beyond 200px, gentle drift between 80-200px,
 *    and friction stop under 80px.
 * 5. **Physics** — Gravity, ground/platform collision, level bounds, and
 *    jumping to reach the player when they are above.
 * 6. **Damage** — Non-invulnerable allies can be hit by zombies (2% chance
 *    per overlap frame) and the boss (3% chance). On death, lives decrement
 *    and respawn timer starts (120 frames). At 0 lives, the ally is
 *    permanently eliminated.
 *
 * @see spawnAlly
 */
export function updateAllyAI() {
  const ld = state.levelData;
  if (!ld) return;

  state.allies.forEach(ally => {
    // Handle respawn timer
    if (!ally.alive) {
      if (ally.lives <= 0) return;
      ally.respawnTimer--;
      if (ally.respawnTimer <= 0) {
        ally.alive = true;
        ally.hp = ally.maxHp;
        ally.x = player.x + (Math.random() > 0.5 ? -60 : 60);
        ally.y = player.y - 20;
        ally.vx = 0;
        ally.vy = 0;
        ally.invincibleTimer = 60;
        spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ffffff', 15, 8);
        spawnFloatingText(ally.x + ally.w/2, ally.y - 20, 'ALLY RESPAWNED!', '#88ff88');
      }
      return;
    }

    if (ally.hurt > 0) ally.hurt--;
    if (ally.invincibleTimer > 0) ally.invincibleTimer--;

    // Find nearest enemy target (zombie or boss)
    let targetEnemy = null;
    let targetDist = 300; // max chase range for enemies

    state.zombies.forEach(z => {
      if (!z.alive) return;
      const dx = z.x - ally.x;
      const dy = z.y - ally.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < targetDist) {
        targetDist = d;
        targetEnemy = z;
      }
    });

    if (state.boss && state.boss.alive) {
      const dx = state.boss.x - ally.x;
      const dy = state.boss.y - ally.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < targetDist) {
        targetDist = d;
        targetEnemy = state.boss;
      }
    }

    // Movement: chase enemy if one is nearby, otherwise follow player
    if (targetEnemy) {
      // Chase the enemy
      const dist = targetEnemy.x - ally.x;
      const absDist = Math.abs(dist);
      ally.facing = dist > 0 ? 1 : -1;
      if (absDist > 15) {
        ally.vx += ally.facing * ally.speed * 0.5;
        if (Math.abs(ally.vx) > ally.speed * 1.5) ally.vx = ally.facing * ally.speed * 1.5;
      }

      // Melee attack when close
      const reach = ally.type === 'horse' ? 40 : 24;
      const allyAtkBox = {
        x: ally.facing === 1 ? ally.x + ally.w : ally.x - reach,
        y: ally.y - 5,
        w: reach + 10,
        h: ally.h + 10
      };
      const enemyBox = { x: targetEnemy.x, y: targetEnemy.y, w: targetEnemy.w, h: targetEnemy.h };

      if (ally.attackCooldown <= 0 && rectCollide(allyAtkBox, enemyBox)) {
        ally.attackCooldown = 25;
        ally.attackTimer = 10;
        const dmg = ally.damage;
        targetEnemy.hp -= dmg;
        targetEnemy.hurt = 8;
        targetEnemy.vx = ally.facing * 4;
        targetEnemy.vy = -3;
        spawnParticles(targetEnemy.x + targetEnemy.w/2, targetEnemy.y + targetEnemy.h/2, '#ff8844', 6, 5);
        spawnFloatingText(targetEnemy.x + targetEnemy.w/2, targetEnemy.y - 10, `-${dmg}`, '#ff8844');
        state.screenShake = 3;

        // Check for kill
        if (targetEnemy.hp <= 0) {
          if (targetEnemy === state.boss) {
            targetEnemy.alive = false;
            addScore(1000);
            state.screenShake = 20; state.screenFlash = 15;
            spawnParticles(targetEnemy.x + targetEnemy.w/2, targetEnemy.y + targetEnemy.h/2, '#ff8800', 40, 15);
            spawnFloatingText(targetEnemy.x + targetEnemy.w/2, targetEnemy.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
            state.diamond = { x: ld.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
            spawnFloatingText(ld.width - 150, GROUND_Y - 60, 'THE WILD DIAMOND APPEARS!', '#00ffff');
          } else {
            targetEnemy.alive = false;
            addScore(targetEnemy.type === 'big' ? 200 : 100);
            spawnParticles(targetEnemy.x + targetEnemy.w/2, targetEnemy.y + targetEnemy.h/2, '#44ff44', 15, 10);
            spawnFloatingText(targetEnemy.x + targetEnemy.w/2, targetEnemy.y - 30, targetEnemy.type === 'big' ? '+200' : '+100', '#ffff44');
          }
        }
      }
    } else {
      // Follow the player (stay within 200px)
      const distToPlayer = player.x - ally.x;
      const absDistToPlayer = Math.abs(distToPlayer);
      if (absDistToPlayer > 200) {
        ally.facing = distToPlayer > 0 ? 1 : -1;
        ally.vx += ally.facing * ally.speed * 0.4;
        if (Math.abs(ally.vx) > ally.speed * 1.3) ally.vx = ally.facing * ally.speed * 1.3;
      } else if (absDistToPlayer > 80) {
        ally.facing = distToPlayer > 0 ? 1 : -1;
        ally.vx += ally.facing * ally.speed * 0.15;
        if (Math.abs(ally.vx) > ally.speed * 0.8) ally.vx = ally.facing * ally.speed * 0.8;
      } else {
        ally.vx *= 0.9;
      }
    }

    // Attack cooldown
    if (ally.attackCooldown > 0) ally.attackCooldown--;
    if (ally.attackTimer > 0) ally.attackTimer--;

    // Physics - gravity, ground collision, platform collision (same as zombies)
    ally.vy += GRAVITY;
    ally.x += ally.vx;
    ally.y += ally.vy;
    ally.vx *= 0.88;

    // Ground collision
    if (ally.y >= GROUND_Y) {
      ally.y = GROUND_Y;
      ally.vy = 0;
      ally.onGround = true;
    }

    // Platform collision
    ally.onGround = ally.y >= GROUND_Y;
    ld.platforms.forEach(p => {
      if (ally.vy >= 0 &&
          ally.x + ally.w > p.x && ally.x < p.x + p.w &&
          ally.y + ally.h >= p.y && ally.y + ally.h <= p.y + p.h + 10) {
        ally.y = p.y - ally.h + 5;
        ally.vy = 0;
        ally.onGround = true;
      }
    });

    // Keep within level bounds
    ally.x = Math.max(0, Math.min(ally.x, ld.width - ally.w));

    // Jump if player is above and ally is on ground
    if (ally.onGround && player.y < ally.y - 50) {
      ally.vy = -10;
      ally.onGround = false;
    }

    // Animation
    ally.frameTimer++;
    if (Math.abs(ally.vx) > 0.5) {
      if (ally.frameTimer > 8) { ally.frame = (ally.frame + 1) % 4; ally.frameTimer = 0; }
    } else {
      if (ally.frameTimer > 14) { ally.frame = (ally.frame + 1) % 2; ally.frameTimer = 0; }
    }

    // Take damage from zombie attacks (only if not invulnerable)
    if (!ally.invulnerable && ally.invincibleTimer <= 0) {
      state.zombies.forEach(z => {
        if (!z.alive) return;
        const zReach = z.type === 'big' ? 15 : 10;
        const zBox = { x: z.x - zReach, y: z.y - 5, w: z.w + zReach * 2, h: z.h + 10 };
        const aBox = { x: ally.x, y: ally.y, w: ally.w, h: ally.h };
        if (rectCollide(zBox, aBox) && Math.random() < 0.02) {
          const dmg = z.type === 'big' ? 15 : 8;
          ally.hp -= dmg;
          ally.hurt = 8;
          ally.invincibleTimer = 30;
          ally.vx = (ally.x > z.x ? 1 : -1) * 5;
          ally.vy = -3;
          spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff8888', 4, 4);
          spawnFloatingText(ally.x + ally.w/2, ally.y - 10, `-${dmg}`, '#ff8888');

          if (ally.hp <= 0) {
            ally.alive = false;
            ally.lives--;
            spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff4444', 15, 10);
            if (ally.lives > 0) {
              ally.respawnTimer = 120;
              spawnFloatingText(ally.x + ally.w/2, ally.y - 30, `ALLY DOWN! ${ally.lives} LIVES LEFT`, '#ff8888');
            } else {
              spawnFloatingText(ally.x + ally.w/2, ally.y - 30, 'ALLY ELIMINATED!', '#ff4444');
            }
          }
        }
      });

      // Boss damage to ally
      if (state.boss && state.boss.alive) {
        const boss = state.boss;
        const bBox = { x: boss.x - 8, y: boss.y, w: boss.w + 16, h: boss.h };
        const aBox = { x: ally.x, y: ally.y, w: ally.w, h: ally.h };
        if (rectCollide(bBox, aBox) && Math.random() < 0.03) {
          const dmg = 18;
          ally.hp -= dmg;
          ally.hurt = 8;
          ally.invincibleTimer = 40;
          ally.vx = (ally.x > boss.x ? 1 : -1) * 8;
          ally.vy = -5;
          spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff8888', 6, 5);
          spawnFloatingText(ally.x + ally.w/2, ally.y - 10, `-${dmg}`, '#ff8888');

          if (ally.hp <= 0) {
            ally.alive = false;
            ally.lives--;
            spawnParticles(ally.x + ally.w/2, ally.y + ally.h/2, '#ff4444', 15, 10);
            if (ally.lives > 0) {
              ally.respawnTimer = 120;
              spawnFloatingText(ally.x + ally.w/2, ally.y - 30, `ALLY DOWN! ${ally.lives} LIVES LEFT`, '#ff8888');
            } else {
              spawnFloatingText(ally.x + ally.w/2, ally.y - 30, 'ALLY ELIMINATED!', '#ff4444');
            }
          }
        }
      }
    }
  });
}
