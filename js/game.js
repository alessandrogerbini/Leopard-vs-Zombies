// Main game loop, update logic, initialization
import { GRAVITY, GROUND_Y, keys, state, player, camera, POWERUP_DURATION } from './state.js';
import { getLevelData } from './levels.js';
import { rectCollide, getAttackBox, spawnParticles, spawnFloatingText, getPlayerDamage, getPlayerCooldown, getPlayerJumpForce } from './utils.js';
import { spawnZombies, spawnBoss, updateZombieAI, updateBossAI } from './enemies.js';
import { spawnHealthPickups, spawnPowerupCrates, updateHealthPickups, updateDiamond, updatePortal } from './items.js';
import { initRenderer, getCtx, drawLeopard, drawZombie, drawBoss, drawBackground, drawHealthPickups, drawPowerupCrates, drawPortal, drawDiamond, drawParticles, drawFloatingTexts, drawHUD, drawBossIntro, drawDying, drawTitleScreen, drawLevelComplete, drawGameWin, drawGameOver } from './renderer.js';

const canvas = document.getElementById('game');
initRenderer(canvas);

// Input
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; e.preventDefault(); });

function initLevel(level) {
  state.currentLevel = level;
  state.levelData = getLevelData(level);
  player.x = 80;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.knockbackX = 0;
  player.hp = player.maxHp;
  player.attacking = false;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.invincible = 0;
  player.facing = 1;
  player.combo = 0;
  player.powerups.jumpyBoots = 0;
  player.powerups.clawsOfSteel = 0;
  player.powerups.superFangs = 0;
  camera.x = 0;
  state.particles = [];
  state.floatingTexts = [];
  state.diamond = null;
  state.boss = null;
  state.bossIntroTimer = 0;
  state.portal = null;

  spawnZombies();
  spawnHealthPickups();
  spawnPowerupCrates();
  state.gameState = 'playing';
}

function update() {
  if (state.gameState === 'title') {
    if (keys['Enter']) { player.lives = 3; initLevel(1); }
    return;
  }

  if (state.gameState === 'levelComplete') {
    state.transitionTimer--;
    if (state.transitionTimer <= 0) {
      if (state.currentLevel < 3) initLevel(state.currentLevel + 1);
      else state.gameState = 'gameWin';
    }
    return;
  }

  if (state.gameState === 'bossIntro') {
    state.bossIntroTimer--;
    if (state.bossIntroTimer <= 0) state.gameState = 'bossFight';
    return;
  }

  if (state.gameState === 'gameWin' || state.gameState === 'gameOver') {
    if (keys['Enter']) { state.gameState = 'title'; player.score = 0; player.lives = 3; }
    return;
  }

  if (state.gameState === 'dying') {
    state.deathTimer--;
    if (state.deathTimer <= 0) {
      if (player.lives > 0) {
        initLevel(state.currentLevel);
        spawnFloatingText(player.x, player.y - 40, `${player.lives} LIVES LEFT`, '#ffcc00');
      } else {
        state.gameState = 'gameOver';
      }
    }
    return;
  }

  const ld = state.levelData;
  const inBossFight = state.gameState === 'bossFight';

  // Powerup timers
  if (player.powerups.jumpyBoots > 0) player.powerups.jumpyBoots--;
  if (player.powerups.clawsOfSteel > 0) player.powerups.clawsOfSteel--;
  if (player.powerups.superFangs > 0) player.powerups.superFangs--;

  // Player movement
  if (player.onGround) {
    player.vx = 0;
    if (keys['ArrowLeft']) { player.vx = -player.speed; player.facing = -1; }
    if (keys['ArrowRight']) { player.vx = player.speed; player.facing = 1; }
  } else {
    let targetVx = 0;
    if (keys['ArrowLeft']) { targetVx = -player.speed; player.facing = -1; }
    if (keys['ArrowRight']) { targetVx = player.speed; player.facing = 1; }
    player.vx += (targetVx - player.vx) * 0.22;
  }
  if (keys['ArrowUp'] && player.onGround) {
    player.vy = getPlayerJumpForce();
    player.onGround = false;
  }

  // Attack
  const cooldown = getPlayerCooldown();
  if (keys['Space'] && player.attackCooldown <= 0 && !player.attacking) {
    player.attacking = true;
    player.attackTimer = 12;
    player.attackCooldown = cooldown;
  }
  if (player.attacking) { player.attackTimer--; if (player.attackTimer <= 0) player.attacking = false; }
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invincible > 0) player.invincible--;
  if (player.comboTimer > 0) { player.comboTimer--; if (player.comboTimer <= 0) player.combo = 0; }

  // Knockback
  player.knockbackX *= 0.8;
  if (Math.abs(player.knockbackX) < 0.3) player.knockbackX = 0;

  // Physics
  player.vy += GRAVITY;
  player.x += player.vx + player.knockbackX;
  player.y += player.vy;

  if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }

  player.onGround = player.y >= GROUND_Y;
  ld.platforms.forEach(p => {
    if (player.vy >= 0 &&
        player.x + player.w > p.x && player.x < p.x + p.w &&
        player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 10) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  player.x = Math.max(0, Math.min(player.x, ld.width - player.w));

  // Animation
  player.frameTimer++;
  if (Math.abs(player.vx) > 0) {
    if (player.frameTimer > 6) { player.frame = (player.frame + 1) % 4; player.frameTimer = 0; }
  } else {
    if (player.frameTimer > 12) { player.frame = (player.frame + 1) % 2; player.frameTimer = 0; }
  }

  // Attack hits
  if (player.attacking && player.attackTimer === 10) {
    const atkBox = getAttackBox();
    const dmg = getPlayerDamage();

    state.zombies.forEach(z => {
      if (!z.alive) return;
      if (rectCollide(atkBox, z)) {
        z.hp -= dmg; z.hurt = 8; z.vx = player.facing * 6; z.vy = -4;
        player.combo++; player.comboTimer = 90;
        spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff4444', 8, 6);
        spawnFloatingText(z.x + z.w/2, z.y - 10, `-${dmg}`, '#ff6666');
        state.screenShake = 5;
        if (z.hp <= 0) {
          z.alive = false;
          player.score += z.type === 'big' ? 200 : 100;
          spawnParticles(z.x + z.w/2, z.y + z.h/2, '#44ff44', 15, 10);
          spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
        }
      }
    });

    if (state.boss && state.boss.alive) {
      const boss = state.boss;
      if (rectCollide(atkBox, boss)) {
        boss.hp -= dmg; boss.hurt = 8; boss.vx = player.facing * 3;
        player.combo++; player.comboTimer = 90;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff4444', 12, 8);
        spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${dmg}`, '#ff6666');
        state.screenShake = 6;
        if (boss.hp <= 0) {
          boss.alive = false; player.score += 1000;
          state.screenShake = 20; state.screenFlash = 15;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ffff00', 30, 12);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
          state.diamond = { x: ld.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
          spawnFloatingText(ld.width - 150, GROUND_Y - 60, 'THE LEOPARD DIAMOND APPEARS!', '#00ffff');
        }
      }
    }

    state.powerupCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#aa8844', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          const ptype = c.powerupType;
          player.powerups[ptype.id] = POWERUP_DURATION;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, ptype.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, ptype.name, ptype.color);
          spawnFloatingText(c.x + c.w/2, c.y - 5, ptype.desc, '#ffffff');
          state.screenFlash = 5; player.score += 150;
        }
      }
    });
  }

  // AI updates
  updateZombieAI();
  updateBossAI();
  updateHealthPickups();
  updateDiamond();
  updatePortal();

  // Level completion
  if (state.currentLevel < 3) {
    if (state.zombies.every(z => !z.alive) && !state.portal) {
      state.portal = {
        x: ld.width - 100, y: GROUND_Y + player.h,
        nextLevel: state.currentLevel + 1, timer: 0, entered: false
      };
      spawnFloatingText(player.x, player.y - 50, 'ALL ZOMBIES DEFEATED!', '#ffff00');
      spawnFloatingText(ld.width - 100, GROUND_Y - 20, 'PORTAL OPENED!', '#aa66ff');
      state.screenFlash = 5;
    }
  } else if (state.gameState === 'playing') {
    if (state.zombies.every(z => !z.alive) && !state.boss) {
      spawnBoss();
      state.gameState = 'bossIntro';
      state.bossIntroTimer = 90;
      state.screenShake = 15;
    }
  } else if (inBossFight && state.boss && !state.boss.alive && state.diamond && !state.diamond.collected) {
    state.diamond.glow += 0.02;
  }

  // Death / lives
  if (player.hp <= 0) {
    player.hp = 0;
    player.lives--;
    state.screenShake = 15;
    state.gameState = 'dying';
    state.deathTimer = 90;
    spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ff0000', 20, 10);
  }

  // Camera
  const targetX = player.x - canvas.width / 3;
  camera.x += (targetX - camera.x) * 0.08;
  camera.x = Math.max(0, Math.min(camera.x, ld.width - canvas.width));

  // Particles & text
  state.particles = state.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; return p.life > 0; });
  state.floatingTexts = state.floatingTexts.filter(t => { t.y -= 1; t.life--; return t.life > 0; });

  if (state.screenShake > 0) state.screenShake--;
  if (state.screenFlash > 0) state.screenFlash--;
}

function draw() {
  const ctx = getCtx();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.gameState === 'title') { drawTitleScreen(); return; }
  if (state.gameState === 'gameWin') { drawGameWin(); return; }

  ctx.save();
  if (state.screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * state.screenShake * 2, (Math.random() - 0.5) * state.screenShake * 2);
  }

  drawBackground();
  drawHealthPickups();
  drawPowerupCrates();
  drawPortal();
  drawDiamond();
  state.zombies.forEach(z => drawZombie(z));
  drawBoss();
  drawLeopard(player.x - camera.x, player.y);
  drawParticles();
  drawFloatingTexts();
  ctx.restore();

  if (state.screenFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.screenFlash * 0.06})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawHUD();
  if (state.gameState === 'bossIntro') drawBossIntro();
  if (state.gameState === 'dying') drawDying();
  if (state.gameState === 'levelComplete') drawLevelComplete();
  if (state.gameState === 'gameOver') drawGameOver();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
