// Main game loop, update logic, initialization
import { GRAVITY, GROUND_Y, keys, state, player, camera, POWERUP_DURATION, POWERUP_AMMO } from './state.js';
import { getLevelData } from './levels.js';
import { rectCollide, getAttackBox, spawnParticles, spawnFloatingText, getPlayerDamage, getPlayerCooldown, getPlayerJumpForce } from './utils.js';
import { spawnZombies, spawnBoss, updateZombieAI, updateBossAI } from './enemies.js';
import { spawnHealthPickups, spawnPowerupCrates, spawnArmorCrates, spawnGlassesCrates, spawnSneakersCrates, updateHealthPickups, updateDiamond, updatePortal, updateArmorPickups, updateGlassesPickups, updateSneakersPickups } from './items.js';
import { initRenderer, getCtx, drawLeopard, drawZombie, drawBoss, drawBackground, drawHealthPickups, drawPowerupCrates, drawArmorCrates, drawArmorPickups, drawGlassesCrates, drawGlassesPickups, drawSneakersCrates, drawSneakersPickups, drawPortal, drawDiamond, drawParticles, drawFloatingTexts, drawHUD, drawBossIntro, drawDying, drawTitleScreen, drawLevelComplete, drawGameWin, drawGameOver, drawProjectiles } from './renderer.js';

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
  player.powerups.raceCar = 0;
  player.powerups.bananaCannon = 0;
  player.powerups.litterBox = 0;
  player.powerups.wings = 0;
  camera.x = 0;
  state.particles = [];
  state.floatingTexts = [];
  state.diamond = null;
  state.boss = null;
  state.bossIntroTimer = 0;
  state.portal = null;
  state.projectiles = [];

  spawnZombies();
  spawnHealthPickups();
  spawnPowerupCrates();
  spawnArmorCrates();
  spawnGlassesCrates();
  spawnSneakersCrates();
  state.gameState = 'playing';
}

function update() {
  if (state.gameState === 'title') {
    if (keys['Enter']) { player.lives = 3; player.items.armor = null; player.items.glasses = false; player.items.sneakers = true; player.items.cowboyBoots = false; initLevel(1); }
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
    if (keys['Enter']) { state.gameState = 'title'; player.score = 0; player.lives = 3; player.items.armor = null; player.items.glasses = false; player.items.sneakers = true; player.items.cowboyBoots = false; }
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

  // Powerup timers (only frame-based powerups tick down per frame)
  if (player.powerups.raceCar > 0) player.powerups.raceCar--;
  if (player.powerups.wings > 0) player.powerups.wings--;

  // Player movement
  if (player.powerups.wings > 0) {
    // Flight mode: smooth movement in all directions
    const flySpeed = player.speed * 1.1;
    let targetVx = 0;
    let targetVy = 0;
    if (keys['ArrowLeft']) { targetVx = -flySpeed; player.facing = -1; }
    if (keys['ArrowRight']) { targetVx = flySpeed; player.facing = 1; }
    if (keys['ArrowUp']) { targetVy = -flySpeed; }
    if (keys['ArrowDown']) { targetVy = flySpeed; }
    // Smooth deceleration for floaty flight feel
    player.vx += (targetVx - player.vx) * 0.15;
    player.vy += (targetVy - player.vy) * 0.15;
  } else if (player.onGround) {
    player.vx = 0;
    if (keys['ArrowLeft']) { player.vx = -player.speed; player.facing = -1; }
    if (keys['ArrowRight']) { player.vx = player.speed; player.facing = 1; }
  } else {
    let targetVx = 0;
    if (keys['ArrowLeft']) { targetVx = -player.speed; player.facing = -1; }
    if (keys['ArrowRight']) { targetVx = player.speed; player.facing = 1; }
    player.vx += (targetVx - player.vx) * 0.55;
  }
  if (player.powerups.wings <= 0 && keys['ArrowUp'] && player.onGround) {
    player.vy = getPlayerJumpForce();
    player.onGround = false;
    if (player.powerups.jumpyBoots > 0) player.powerups.jumpyBoots--;
  }

  // Attack
  const cooldown = getPlayerCooldown();
  if (keys['Space'] && player.attackCooldown <= 0 && !player.attacking) {
    if (player.powerups.bananaCannon > 0) {
      // Banana cannon: fire a boomerang banana (only if none already in flight)
      const bananaInFlight = state.projectiles.some(p => p.type === 'banana');
      if (!bananaInFlight) {
        state.projectiles.push({
          type: 'banana', x: player.x + player.w/2, y: player.y + player.h/2,
          vx: player.facing * 8, vy: 0, damage: 20, life: 120,
          maxDist: 280, distTraveled: 0, returning: false,
          hitEnemies: new Set(), originX: player.x + player.w/2
        });
        player.attackCooldown = cooldown;
        player.powerups.bananaCannon--;
      }
    } else if (player.powerups.litterBox > 0) {
      // Litter box: fire 5 litter projectiles behind the player
      for (let i = 0; i < 5; i++) {
        state.projectiles.push({
          type: 'litter', x: player.x + player.w/2, y: player.y + player.h/2,
          vx: -player.facing * (4 + Math.random() * 4), vy: -2 + Math.random() * 4,
          damage: 25, life: 30, hitEnemies: new Set()
        });
      }
      player.attackCooldown = cooldown;
      player.powerups.litterBox--;
    } else {
      // Standard melee attack
      player.attacking = true;
      player.attackTimer = 12;
      player.attackCooldown = cooldown;
      if (player.powerups.clawsOfSteel > 0) player.powerups.clawsOfSteel--;
      if (player.powerups.superFangs > 0) player.powerups.superFangs--;
    }
  }
  if (player.attacking) { player.attackTimer--; if (player.attackTimer <= 0) player.attacking = false; }
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invincible > 0) player.invincible--;
  if (player.comboTimer > 0) { player.comboTimer--; if (player.comboTimer <= 0) player.combo = 0; }

  // Knockback
  player.knockbackX *= 0.8;
  if (Math.abs(player.knockbackX) < 0.3) player.knockbackX = 0;

  // Physics
  if (player.powerups.wings <= 0) {
    let grav = GRAVITY;
    if (player.items.sneakers && !player.onGround && Math.abs(player.vy) < 4) {
      grav *= 0.5; // 50% less gravity near apex = more hangtime
    }
    player.vy += grav;
  }
  player.x += player.vx + player.knockbackX;
  player.y += player.vy;

  // Clamp vertical bounds (don't fly above y=0 or below ground)
  if (player.powerups.wings > 0) {
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; }
    player.onGround = false;
  } else {
    if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }
  }

  player.onGround = player.powerups.wings > 0 ? false : player.y >= GROUND_Y;
  if (player.powerups.wings <= 0) {
    ld.platforms.forEach(p => {
      if (player.vy >= 0 &&
          player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 10) {
        player.y = p.y - player.h + 5;
        player.vy = 0;
        player.onGround = true;
      }
    });
  }

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
          player.powerups[ptype.id] = POWERUP_AMMO[ptype.id];
          spawnParticles(c.x + c.w/2, c.y + c.h/2, ptype.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, ptype.name, ptype.color);
          spawnFloatingText(c.x + c.w/2, c.y - 5, ptype.desc, '#ffffff');
          state.screenFlash = 5; player.score += 150;

          // Trap crate: ~20% chance zombies burst out
          if (Math.random() < 0.2) {
            const trapCount = 1 + Math.floor(Math.random() * 2); // 1-2 zombies
            const ld2 = state.levelData;
            for (let ti = 0; ti < trapCount; ti++) {
              state.zombies.push({
                x: c.x + (ti === 0 ? -20 : 20), y: c.y, w: 36, h: 48,
                vx: (ti === 0 ? -3 : 3), vy: -5,
                hp: ld2.zombieHp, maxHp: ld2.zombieHp,
                speed: ld2.zombieSpeed * (0.8 + Math.random() * 0.4),
                onGround: false,
                facing: ti === 0 ? -1 : 1,
                frame: 0, frameTimer: 0,
                attackTimer: 0,
                hurt: 0,
                type: Math.random() < 0.3 ? 'big' : 'normal',
                alive: true
              });
              // Upgrade big zombies like spawnZombies does
              const nz = state.zombies[state.zombies.length - 1];
              if (nz.type === 'big') {
                nz.w = 44; nz.h = 56;
                nz.hp *= 1.8; nz.maxHp = nz.hp;
                nz.speed *= 0.7;
              }
            }
            // Dramatic visuals: bigger particle burst in red/green
            spawnParticles(c.x + c.w/2, c.y + c.h/2, '#ff0000', 25, 14);
            spawnParticles(c.x + c.w/2, c.y + c.h/2, '#4a6a4a', 15, 12);
            spawnFloatingText(c.x + c.w/2, c.y - 40, 'AMBUSH!', '#ff2222');
            state.screenShake = 12;
            state.screenFlash = 10;
          }
        }
      }
    });

    // Armor crate hits
    state.armorCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.armorType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.armorType.name, c.armorType.color);
          state.screenFlash = 5;
          // Spawn floating armor pickup that rises above the crate
          state.armorPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            armorType: c.armorType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Glasses crate hits
    state.glassesCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.glassesType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.glassesType.name, c.glassesType.color);
          state.screenFlash = 5;
          // Spawn floating glasses pickup that rises above the crate
          state.glassesPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            glassesType: c.glassesType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Sneakers crate hits
    state.sneakersCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.sneakersType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.sneakersType.name, c.sneakersType.color);
          state.screenFlash = 5;
          // Spawn floating sneakers pickup that rises above the crate
          state.sneakersPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            sneakersType: c.sneakersType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });
  }

  // Jet fire damage (race car)
  if (player.powerups.raceCar > 0 && state.gameState !== 'dying') {
    // Fire jet damages enemies behind the car
    const jetBox = {
      x: player.facing === 1 ? player.x - 240 : player.x + player.w,
      y: player.y + 10,
      w: 240,
      h: player.h - 10
    };
    state.zombies.forEach(z => {
      if (!z.alive) return;
      if (rectCollide(jetBox, z) && Math.random() < 0.15) {
        const fireDmg = 8;
        z.hp -= fireDmg; z.hurt = 4;
        spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff6600', 3, 4);
        spawnFloatingText(z.x + z.w/2, z.y - 10, `-${fireDmg}`, '#ff8800');
        if (z.hp <= 0) {
          z.alive = false;
          player.score += z.type === 'big' ? 200 : 100;
          spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff8800', 15, 10);
          spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
        }
      }
    });
    // Also damage boss
    if (state.boss && state.boss.alive) {
      const boss = state.boss;
      if (rectCollide(jetBox, boss) && Math.random() < 0.15) {
        const fireDmg = 8;
        boss.hp -= fireDmg; boss.hurt = 4;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff6600', 3, 4);
        spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${fireDmg}`, '#ff8800');
        if (boss.hp <= 0) {
          boss.alive = false; player.score += 1000;
          state.screenShake = 20; state.screenFlash = 15;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
          state.diamond = { x: state.levelData.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
          spawnFloatingText(state.levelData.width - 150, GROUND_Y - 60, 'THE LEOPARD DIAMOND APPEARS!', '#00ffff');
        }
      }
    }
  }

  // AI updates
  updateZombieAI();
  updateBossAI();
  updateHealthPickups();
  updateDiamond();
  updatePortal();
  updateArmorPickups();
  updateGlassesPickups();
  updateSneakersPickups();

  // Update projectiles
  state.projectiles = state.projectiles.filter(proj => {
    proj.life--;
    if (proj.life <= 0) return false;

    if (proj.type === 'banana') {
      proj.distTraveled += Math.abs(proj.vx);
      if (!proj.returning && proj.distTraveled >= proj.maxDist) {
        proj.returning = true;
      }
      if (proj.returning) {
        // Fly back toward player
        const dx = player.x + player.w/2 - proj.x;
        const dy = player.y + player.h/2 - proj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 20) return false; // collected
        proj.vx = (dx / dist) * 9;
        proj.vy = (dy / dist) * 9;
      }
      proj.x += proj.vx;
      proj.y += proj.vy;
    } else if (proj.type === 'litter') {
      proj.vy += 0.3; // gravity on litter
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.vx *= 0.95;
      if (proj.y > GROUND_Y + 50) return false;
    } else if (proj.type === 'bossSkull') {
      // Straight-line projectile
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > GROUND_Y + 50 || proj.y < -50) return false;
    } else if (proj.type === 'bossAOE') {
      // Expanding shockwave ring
      proj.radius += proj.maxRadius / (proj.life + 10);
      if (proj.radius > proj.maxRadius) proj.radius = proj.maxRadius;
    } else if (proj.type === 'bossMortar') {
      // Arcing projectile affected by gravity
      proj.vy += GRAVITY * 0.8;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > GROUND_Y + 10) {
        // Impact: spawn a brief ground burst effect
        spawnParticles(proj.x, GROUND_Y, '#44ff44', 6, 5);
        // Check player hit on impact
        if (!proj.hitPlayer && player.invincible <= 0) {
          const impactDist = Math.abs(player.x + player.w / 2 - proj.x);
          if (impactDist < 40 && player.y + player.h >= GROUND_Y - 10) {
            player.hp -= proj.damage;
            player.invincible = 35;
            player.knockbackX = (player.x > proj.x ? 1 : -1) * 8;
            player.vy = -5;
            state.screenShake = 8;
            state.screenFlash = 5;
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 8, 6);
            spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${proj.damage}`, '#ff4444');
            proj.hitPlayer = true;
          }
        }
        return false;
      }
    }

    // Player projectiles hit enemies (skip boss projectile types)
    if (proj.hitEnemies) {
      const pBox = { x: proj.x - 8, y: proj.y - 8, w: 16, h: 16 };
      state.zombies.forEach(z => {
        if (!z.alive || proj.hitEnemies.has(z)) return;
        if (rectCollide(pBox, z)) {
          z.hp -= proj.damage; z.hurt = 8;
          z.vx = (proj.vx > 0 ? 1 : -1) * 4; z.vy = -3;
          proj.hitEnemies.add(z);
          spawnParticles(z.x + z.w/2, z.y + z.h/2, proj.type === 'banana' ? '#ffdd00' : '#aa8844', 6, 5);
          spawnFloatingText(z.x + z.w/2, z.y - 10, `-${proj.damage}`, proj.type === 'banana' ? '#ffdd00' : '#aa8844');
          state.screenShake = 3;
          if (z.hp <= 0) {
            z.alive = false;
            player.score += z.type === 'big' ? 200 : 100;
            spawnParticles(z.x + z.w/2, z.y + z.h/2, '#44ff44', 15, 10);
            spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
          }
          if (proj.type === 'litter') return; // litter hits all in AOE
        }
      });

      // Hit boss
      if (state.boss && state.boss.alive) {
        const boss = state.boss;
        if (!proj.hitEnemies.has(boss) && rectCollide(pBox, boss)) {
          boss.hp -= proj.damage; boss.hurt = 8;
          proj.hitEnemies.add(boss);
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff4444', 8, 6);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${proj.damage}`, '#ff6666');
          state.screenShake = 4;
          if (boss.hp <= 0) {
            boss.alive = false; player.score += 1000;
            state.screenShake = 20; state.screenFlash = 15;
            spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
            spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
            state.diamond = { x: state.levelData.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
            spawnFloatingText(state.levelData.width - 150, GROUND_Y - 60, 'THE LEOPARD DIAMOND APPEARS!', '#00ffff');
          }
        }
      }
    }

    // Boss projectiles hit player
    if (proj.type === 'bossSkull' && !proj.hitPlayer && player.invincible <= 0) {
      const skullBox = { x: proj.x - 10, y: proj.y - 10, w: 20, h: 20 };
      const plBox = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectCollide(skullBox, plBox)) {
        player.hp -= proj.damage;
        player.invincible = 35;
        player.knockbackX = (proj.vx > 0 ? 1 : -1) * 10;
        player.vy = -5;
        state.screenShake = 10;
        state.screenFlash = 6;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#44ff44', 10, 7);
        spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${proj.damage}`, '#ff4444');
        proj.hitPlayer = true;
        return false; // skull consumed on hit
      }
    }

    if (proj.type === 'bossAOE' && !proj.hitPlayer && player.invincible <= 0) {
      const dx = (player.x + player.w / 2) - proj.x;
      const dy = (player.y + player.h) - proj.y;
      const playerDist = Math.sqrt(dx * dx + dy * dy);
      // Hit if player is within the expanding ring (between inner and outer edge)
      if (playerDist < proj.radius + 20 && playerDist > proj.radius - 30) {
        player.hp -= proj.damage;
        player.invincible = 35;
        const pushDir = dx !== 0 ? (dx > 0 ? 1 : -1) : 1;
        player.knockbackX = pushDir * 10;
        player.vy = -6;
        state.screenShake = 10;
        state.screenFlash = 6;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#88ff88', 10, 7);
        spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${proj.damage}`, '#ff4444');
        proj.hitPlayer = true;
      }
    }

    return true;
  });

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
  drawArmorCrates();
  drawArmorPickups();
  drawGlassesCrates();
  drawGlassesPickups();
  drawSneakersCrates();
  drawSneakersPickups();
  drawPortal();
  drawDiamond();
  state.zombies.forEach(z => drawZombie(z));
  drawBoss();
  drawLeopard(player.x - camera.x, player.y);
  drawProjectiles();
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
