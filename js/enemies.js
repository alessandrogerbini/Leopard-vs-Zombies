// Zombie spawning, zombie AI, boss spawning, boss AI
import { GRAVITY, GROUND_Y, state, player, POWERUP_TYPES, POWERUP_DURATION } from './state.js';
import { rectCollide, spawnParticles, spawnFloatingText } from './utils.js';

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

export function spawnBoss() {
  const ld = state.levelData;
  state.boss = {
    x: ld.width - 400, y: GROUND_Y - 20,
    w: 70, h: 90,
    vx: 0, vy: 0,
    hp: 300, maxHp: 300,
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

  // Skull telegraph countdown
  if (boss.skullTelegraph > 0) {
    boss.skullTelegraph--;
    if (boss.skullTelegraph <= 0) {
      // Fire the skull at the stored target
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

  // AOE telegraph countdown
  if (boss.aoeTelegraph > 0) {
    boss.aoeTelegraph--;
    if (boss.aoeTelegraph <= 0) {
      // Spawn the AOE slam
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

  // Mortar telegraph countdown
  if (boss.mortarTelegraph > 0) {
    boss.mortarTelegraph--;
    if (boss.mortarTelegraph <= 0) {
      // Fire the mortars at stored targets
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
  // Only start new attacks if no telegraph is active
  const telegraphActive = boss.skullTelegraph > 0 || boss.aoeTelegraph > 0 || boss.mortarTelegraph > 0;

  // 1) CHARGE attack (medium range 150-500px) - kept & made more dangerous
  if (!boss.isCharging && !telegraphActive && absDist < 500 && absDist > 150 && boss.slamCooldown <= 0) {
    boss.isCharging = true;
    boss.chargeTimer = p2 ? 24 : 30;
    boss.slamCooldown = p2 ? 70 : 110;
  }

  // 2) SKULL PROJECTILE (long range > 300px) - telegraph then fire
  if (!boss.isCharging && !telegraphActive && absDist > 300 && boss.skullCooldown <= 0) {
    boss.skullTelegraph = 40;
    boss.skullTargetX = player.x + player.w / 2;
    boss.skullTargetY = player.y + player.h / 2;
    boss.skullCooldown = p2 ? 60 : 100;
  }

  // 3) AOE SLAM (close range < 120px) - telegraph then slam
  if (!boss.isCharging && !telegraphActive && absDist < 120 && boss.aoeCooldown <= 0) {
    boss.aoeTelegraph = 50;
    boss.aoeTargetX = boss.x + boss.w / 2;
    boss.aoeCooldown = p2 ? 80 : 130;
  }

  // 4) MORTAR VOLLEY (medium range 120-400px) - telegraph then fire
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

export function spawnAlly(type, x, y, invulnerable) {
  const ally = {
    x: x, y: y, w: type === 'horse' ? 52 : 43, h: type === 'horse' ? 56 : 54,
    vx: 0, vy: 0,
    hp: 100, maxHp: 100,
    lives: invulnerable ? 999 : 3,
    speed: type === 'horse' ? 2.5 : 1.8,
    damage: type === 'horse' ? 20 : 15,
    onGround: false,
    facing: 1,
    frame: 0, frameTimer: 0,
    attackTimer: 0, attackCooldown: 0,
    hurt: 0,
    type: type,
    alive: true,
    invulnerable: invulnerable || false,
    invincibleTimer: 0,
    respawnTimer: 0,
  };
  state.allies.push(ally);
  return ally;
}

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
      const reach = ally.type === 'horse' ? 25 : 15;
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
            player.score += 1000;
            state.screenShake = 20; state.screenFlash = 15;
            spawnParticles(targetEnemy.x + targetEnemy.w/2, targetEnemy.y + targetEnemy.h/2, '#ff8800', 40, 15);
            spawnFloatingText(targetEnemy.x + targetEnemy.w/2, targetEnemy.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
            state.diamond = { x: ld.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
            spawnFloatingText(ld.width - 150, GROUND_Y - 60, 'THE LEOPARD DIAMOND APPEARS!', '#00ffff');
          } else {
            targetEnemy.alive = false;
            player.score += targetEnemy.type === 'big' ? 200 : 100;
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
