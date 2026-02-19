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
  };
}

export function updateZombieAI() {
  const ld = state.levelData;

  state.zombies.forEach(z => {
    if (!z.alive) return;
    if (z.hurt > 0) { z.hurt--; }

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
          const dmg = z.type === 'big' ? 19 : 11;
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

  // === ATTACK SELECTION (distance-based priority) ===

  // 1) CHARGE attack (medium range 150-500px) - kept & made more dangerous
  if (!boss.isCharging && absDist < 500 && absDist > 150 && boss.slamCooldown <= 0) {
    boss.isCharging = true;
    boss.chargeTimer = p2 ? 24 : 30;
    boss.slamCooldown = p2 ? 70 : 110;
  }

  // 2) SKULL PROJECTILE (long range > 300px)
  if (!boss.isCharging && absDist > 300 && boss.skullCooldown <= 0) {
    const spd = p2 ? 6 : 4.5;
    const dx = player.x - boss.x;
    const dy = (player.y + player.h / 2) - (boss.y + boss.h * 0.3);
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
    boss.skullCooldown = p2 ? 60 : 100;
    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h * 0.3, '#44ff44', 5, 4);
  }

  // 3) AOE SLAM (close range < 120px)
  if (!boss.isCharging && absDist < 120 && boss.aoeCooldown <= 0) {
    state.projectiles.push({
      type: 'bossAOE',
      x: boss.x + boss.w / 2,
      y: boss.y + boss.h,
      radius: 0,
      maxRadius: p2 ? 180 : 150,
      damage: 20,
      life: p2 ? 25 : 30,
      hitPlayer: false
    });
    boss.aoeCooldown = p2 ? 80 : 130;
    state.screenShake = 8;
    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h, '#88ff88', 12, 8);
    spawnFloatingText(boss.x + boss.w / 2, boss.y - 20, 'SLAM!', '#88ff88');
  }

  // 4) MORTAR VOLLEY (medium range 120-400px)
  if (!boss.isCharging && absDist > 120 && absDist < 400 && boss.mortarCooldown <= 0) {
    const count = p2 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const spread = (i - Math.floor(count / 2)) * 40;
      const targetX = player.x + spread;
      const dx = targetX - (boss.x + boss.w / 2);
      const travelTime = 50 + Math.random() * 10;
      const vx = dx / travelTime;
      const vy = -7 - Math.random() * 2;
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
    }
    boss.mortarCooldown = p2 ? 90 : 150;
    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h * 0.2, '#44ff44', 8, 6);
    spawnFloatingText(boss.x + boss.w / 2, boss.y - 30, 'MORTAR!', '#66ff66');
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
        const dmg = boss.isCharging ? 35 : 22;
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
