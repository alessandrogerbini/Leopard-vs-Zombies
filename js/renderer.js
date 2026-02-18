// All drawing functions
import { GROUND_Y, DRAW_SCALE, state, player, camera } from './state.js';

let canvas, ctx;

export function initRenderer(c) {
  canvas = c;
  ctx = c.getContext('2d');
}

export function getCtx() { return ctx; }

export function drawLeopard(x, y) {
  const f = player.facing;
  const alpha = player.invincible > 0 ? (player.invincible % 4 < 2 ? 0.4 : 1) : 1;
  const bounceY = player.onGround && Math.abs(player.vx) > 0.5 ? Math.sin(player.frameTimer * 0.4) * 1.5 : 0;
  const wheelSpin = player.frameTimer * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + player.w / 2, y + player.h);
  ctx.scale(DRAW_SCALE, DRAW_SCALE);
  ctx.translate(-(player.w / 2), -player.h + 9);

  // Draw everything facing right, then flip via scale if facing left
  ctx.save();
  if (f === -1) {
    ctx.translate(player.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-player.w / 2, 0);
  }

  const px = 0, py = 0;
  const by = bounceY;

  if (player.powerups.raceCar > 0) {
    // === RACE CAR ===
    // Car body main
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(px - 4, py + 30 + by, 50, 16);

    // Front splitter (low aero piece under front)
    ctx.fillStyle = '#222222';
    ctx.fillRect(px + 40, py + 44 + by, 14, 3);
    ctx.fillStyle = '#444444';
    ctx.fillRect(px + 42, py + 43 + by, 10, 2);

    // Front bumper / nose
    ctx.fillStyle = '#bb1a1a';
    ctx.fillRect(px + 42, py + 31 + by, 12, 13);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(px + 44, py + 29 + by, 6, 4);

    // Rear section
    ctx.fillStyle = '#aa1a1a';
    ctx.fillRect(px - 8, py + 32 + by, 10, 12);

    // Spoiler - vertical posts
    ctx.fillStyle = '#333333';
    ctx.fillRect(px - 6, py + 18 + by, 2, 14);
    ctx.fillRect(px + 2, py + 18 + by, 2, 14);
    // Spoiler wing
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(px - 8, py + 16 + by, 14, 4);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(px - 8, py + 19 + by, 14, 2);

    // Windshield (angled look)
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(px + 30, py + 22 + by, 10, 10);
    ctx.fillStyle = '#66aadd';
    ctx.fillRect(px + 32, py + 22 + by, 2, 10);

    // Cockpit roof
    ctx.fillStyle = '#dd3333';
    ctx.fillRect(px + 8, py + 24 + by, 24, 8);

    // Racing stripe (centered on car body)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(px - 4, py + 36 + by, 50, 3);

    // Side intake vent
    ctx.fillStyle = '#880000';
    ctx.fillRect(px + 20, py + 32 + by, 8, 3);
    ctx.fillStyle = '#666666';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 21 + i * 3, py + 32 + by, 1, 3);

    // Headlights (dual)
    ctx.fillStyle = '#ffff88';
    ctx.fillRect(px + 48, py + 33 + by, 4, 3);
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(px + 48, py + 37 + by, 4, 3);

    // Taillights
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(px - 8, py + 33 + by, 3, 3);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(px - 8, py + 37 + by, 3, 3);

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    const w1x = px + 6, w2x = px + 36, wy = py + 45 + by;
    ctx.beginPath(); ctx.arc(w1x, wy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w2x, wy, 6, 0, Math.PI * 2); ctx.fill();
    // Tire tread
    ctx.strokeStyle = '#333333'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(w1x, wy, 5.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w2x, wy, 5.5, 0, Math.PI * 2); ctx.stroke();
    // Rims
    ctx.fillStyle = '#999999';
    ctx.beginPath(); ctx.arc(w1x, wy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w2x, wy, 3, 0, Math.PI * 2); ctx.fill();
    // Center caps
    ctx.fillStyle = '#cccccc';
    ctx.beginPath(); ctx.arc(w1x, wy, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w2x, wy, 1.2, 0, Math.PI * 2); ctx.fill();
    // Spokes (animated)
    ctx.strokeStyle = '#bbbbbb'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const angle = wheelSpin + i * (Math.PI * 2 / 5);
      const cx1 = Math.cos(angle), sy1 = Math.sin(angle);
      ctx.beginPath(); ctx.moveTo(w1x + cx1 * 1.2, wy + sy1 * 1.2); ctx.lineTo(w1x + cx1 * 3, wy + sy1 * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w2x + cx1 * 1.2, wy + sy1 * 1.2); ctx.lineTo(w2x + cx1 * 3, wy + sy1 * 3); ctx.stroke();
    }

    // Exhaust when moving
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = `rgba(150,150,150,${0.2 + Math.random() * 0.3})`;
        ctx.beginPath(); ctx.arc(px - 10 + (Math.random() - 0.5) * 6, wy - 3 + (Math.random() - 0.5) * 4, 1.5 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // === LEOPARD (sitting in car) ===
    // Body (torso)
    ctx.fillStyle = '#e8a828';
    ctx.fillRect(px + 14, py + 12 + by, 18, 14);
    // Head
    ctx.fillRect(px + 24, py + 2 + by, 14, 14);
    // Ears
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 26, py - 1 + by, 4, 4);
    ctx.fillRect(px + 32, py - 1 + by, 4, 4);
    // Eyes
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(px + 31, py + 6 + by, 3, 3);
    // Nose
    ctx.fillStyle = '#ff6688';
    ctx.fillRect(px + 35, py + 10 + by, 2, 2);
    // Spots
    ctx.fillStyle = '#c08018';
    ctx.fillRect(px + 16, py + 14 + by, 2, 2);
    ctx.fillRect(px + 20, py + 16 + by, 2, 2);
    ctx.fillRect(px + 26, py + 15 + by, 2, 2);
    // Paws on steering area
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 28, py + 24 + by, 5, 4);
    ctx.fillRect(px + 22, py + 24 + by, 5, 4);
    // Tail sticking up behind
    const tailWagCar = Math.sin(Date.now() * 0.005) * 4;
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 10, py + 8 + by + tailWagCar, 3, 8);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px + 9, py + 4 + by + tailWagCar, 3, 5);

    // Jet fire (behind car, opposite of facing)
    const jetX = f === 1 ? px - 10 : px + 48;
    for (let i = 0; i < 5; i++) {
      const flicker = Math.random();
      const size = 3 + Math.random() * 5;
      ctx.fillStyle = `rgba(${255},${Math.floor(100 + flicker * 155)},0,${0.5 + flicker * 0.5})`;
      ctx.beginPath();
      ctx.arc(jetX + (Math.random() - 0.5) * 12, py + 35 + by + (Math.random() - 0.5) * 8, size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inner white-hot core
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = `rgba(255,255,200,${0.4 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(jetX + (Math.random() - 0.5) * 6, py + 35 + by + (Math.random() - 0.5) * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (player.powerups.litterBox > 0) {
    // === LITTER BOX ON WHEELS ===
    // Box body
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(px - 2, py + 25 + by, 46, 22);
    // Box rim
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(px - 4, py + 22 + by, 50, 6);
    // Litter/sand inside visible
    ctx.fillStyle = '#ccbb99';
    ctx.fillRect(px + 2, py + 26 + by, 38, 8);
    // Sand granules
    ctx.fillStyle = '#aa9977';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(px + 4 + i * 6, py + 27 + by + (i % 2) * 3, 3, 2);
    }
    // Wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(px + 8, py + 47 + by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 34, py + 47 + by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#999999';
    ctx.beginPath(); ctx.arc(px + 8, py + 47 + by, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 34, py + 47 + by, 2, 0, Math.PI * 2); ctx.fill();

    // Leopard peeking out of box
    // Head
    ctx.fillStyle = '#e8a828';
    ctx.fillRect(px + 24, py + 6 + by, 14, 14);
    // Ears
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 26, py + 3 + by, 4, 4);
    ctx.fillRect(px + 32, py + 3 + by, 4, 4);
    // Eyes
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(px + 31, py + 10 + by, 3, 3);
    // Nose
    ctx.fillStyle = '#ff6688';
    ctx.fillRect(px + 35, py + 14 + by, 2, 2);
    // Body visible above box
    ctx.fillStyle = '#e8a828';
    ctx.fillRect(px + 14, py + 14 + by, 18, 10);
    // Spots
    ctx.fillStyle = '#c08018';
    ctx.fillRect(px + 16, py + 16 + by, 2, 2);
    ctx.fillRect(px + 22, py + 18 + by, 2, 2);
    // Paws gripping box rim
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 12, py + 22 + by, 5, 5);
    ctx.fillRect(px + 28, py + 22 + by, 5, 5);

  } else {
    // === WALKING LEOPARD ON ALL FOURS ===
    // Body (horizontal)
    ctx.fillStyle = '#e8a828';
    ctx.fillRect(px + 6, py + 20 + by, 30, 14);
    // Head
    ctx.fillRect(px + 30, py + 10 + by, 14, 14);
    // Snout
    ctx.fillRect(px + 42, py + 16 + by, 5, 6);
    // Ears
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 32, py + 7 + by, 4, 4);
    ctx.fillRect(px + 38, py + 7 + by, 4, 4);
    // Eyes
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(px + 37, py + 14 + by, 3, 3);
    // Nose
    ctx.fillStyle = '#ff6688';
    ctx.fillRect(px + 44, py + 18 + by, 2, 2);
    // Spots on body
    ctx.fillStyle = '#c08018';
    ctx.fillRect(px + 10, py + 22 + by, 3, 3);
    ctx.fillRect(px + 16, py + 24 + by, 3, 3);
    ctx.fillRect(px + 22, py + 22 + by, 3, 3);
    ctx.fillRect(px + 28, py + 25 + by, 2, 2);
    ctx.fillRect(px + 33, py + 13 + by, 2, 2);
    // Belly
    ctx.fillStyle = '#f0c050';
    ctx.fillRect(px + 10, py + 30 + by, 22, 4);
    // Legs (animated)
    const legAnim = Math.sin(player.frameTimer * 0.4) * 5;
    ctx.fillStyle = '#e8a828';
    // Front legs
    ctx.fillRect(px + 28, py + 32 + by, 5, 14 + legAnim);
    ctx.fillRect(px + 34, py + 32 + by, 5, 14 - legAnim);
    // Back legs
    ctx.fillRect(px + 8, py + 32 + by, 5, 14 - legAnim);
    ctx.fillRect(px + 14, py + 32 + by, 5, 14 + legAnim);
    // Paws
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 27, py + 45 + by + legAnim, 7, 3);
    ctx.fillRect(px + 33, py + 45 + by - legAnim, 7, 3);
    ctx.fillRect(px + 7, py + 45 + by - legAnim, 7, 3);
    ctx.fillRect(px + 13, py + 45 + by + legAnim, 7, 3);
    // Tail
    const tailWag = Math.sin(Date.now() * 0.005) * 4;
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 2, py + 15 + by + tailWag, 6, 4);
    ctx.fillRect(px - 2, py + 12 + by + tailWag * 1.2, 6, 4);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px - 4, py + 10 + by + tailWag * 1.3, 4, 4);
  }

  // Powerup visuals
  if (player.powerups.jumpyBoots > 0) {
    ctx.fillStyle = 'rgba(68,255,136,0.3)';
    ctx.fillRect(px - 4, py + 43 + by, 50, 6);
  }
  if (player.powerups.clawsOfSteel > 0) {
    ctx.fillStyle = 'rgba(255,136,68,0.4)';
    ctx.fillRect(px + 36, py + 10 + by, 5, 2);
    ctx.fillRect(px + 38, py + 13 + by, 5, 2);
    ctx.fillRect(px + 36, py + 16 + by, 5, 2);
  }
  if (player.powerups.superFangs > 0) {
    ctx.fillStyle = '#ff44ff';
    ctx.fillRect(px + 34, py + 12 + by, 2, 3);
    ctx.fillRect(px + 37, py + 12 + by, 2, 3);
  }

  ctx.restore(); // undo the facing flip

  // Attack slash effect (drawn in screen-relative space so it faces correctly)
  if (player.attacking && player.powerups.bananaCannon <= 0 && player.powerups.litterBox <= 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * (player.attackTimer / 12);
    const slashX = (f === 1 ? 42 : -15);
    ctx.beginPath();
    ctx.arc(slashX + 15 * f, 16, 25, -0.5 * f, 0.8 * f);
    ctx.stroke();
    ctx.strokeStyle = player.powerups.clawsOfSteel > 0 ? '#ff8844' : '#ffff00';
    ctx.lineWidth = player.powerups.clawsOfSteel > 0 ? 3 : 2;
    ctx.beginPath();
    ctx.arc(slashX + 10 * f, 20, 20, -0.3 * f, 0.6 * f);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawZombie(z) {
  if (!z.alive) return;
  const px = Math.floor(z.x - camera.x);
  const py = Math.floor(z.y);
  const f = z.facing;
  const hurtFlash = z.hurt > 0 && z.hurt % 2 === 0;
  const isBig = z.type === 'big';
  const s = isBig ? 1.2 : 1;

  ctx.fillStyle = hurtFlash ? '#ffffff' : (isBig ? '#3a5a3a' : '#4a6a4a');
  ctx.fillRect(px + 6 * s, py + 10 * s, 22 * s, 24 * s);
  ctx.fillStyle = hurtFlash ? '#ffffff' : '#5a7a5a';
  ctx.fillRect(px + 8 * s, py, 18 * s, 16 * s);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(px + (f === 1 ? 18 : 10) * s, py + 5 * s, 3 * s, 3 * s);
  ctx.fillRect(px + (f === 1 ? 22 : 14) * s, py + 5 * s, 3 * s, 3 * s);
  ctx.fillStyle = '#2a3a2a';
  ctx.fillRect(px + 12 * s, py + 11 * s, 10 * s, 3 * s);
  ctx.fillStyle = hurtFlash ? '#ffffff' : '#5a7a5a';
  const armReach = Math.sin(z.frame * 1.2) * 4;
  ctx.fillRect(px + (f === 1 ? 26 : -4) * s, py + 12 * s + armReach, 6 * s, 18 * s);
  ctx.fillRect(px + (f === 1 ? 28 : -6) * s, py + 14 * s - armReach, 6 * s, 18 * s);
  ctx.fillStyle = hurtFlash ? '#ffffff' : '#3a5a3a';
  const legAnim = Math.sin(z.frame * 1.5) * 3;
  ctx.fillRect(px + 10 * s, py + 32 * s, 6 * s, 14 * s + legAnim);
  ctx.fillRect(px + 20 * s, py + 32 * s, 6 * s, 14 * s - legAnim);

  if (z.hp < z.maxHp) {
    const barW = 30 * s;
    const barX = px + (z.w * s - barW) / 2;
    ctx.fillStyle = '#440000';
    ctx.fillRect(barX, py - 8, barW, 4);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(barX, py - 8, barW * (z.hp / z.maxHp), 4);
  }
}

export function drawBoss() {
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  const px = Math.floor(boss.x - camera.x);
  const py = Math.floor(boss.y);
  const f = boss.facing;
  const hurtFlash = boss.hurt > 0 && boss.hurt % 2 === 0;
  const isPhase2 = boss.phase === 2;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + boss.w/2, py + boss.h + 2, boss.w/2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hurtFlash ? '#ffffff' : (isPhase2 ? '#4a2a2a' : '#2a4a2a');
  ctx.fillRect(px + 8, py + 20, 54, 45);
  ctx.fillStyle = hurtFlash ? '#ffffff' : (isPhase2 ? '#5a3a3a' : '#3a5a3a');
  ctx.fillRect(px + 10, py - 5, 50, 30);

  ctx.fillStyle = isPhase2 ? '#ff4444' : '#888844';
  ctx.fillRect(px + 15, py - 15, 8, 12);
  ctx.fillRect(px + 47, py - 15, 8, 12);
  ctx.fillRect(px + 30, py - 18, 10, 15);

  ctx.fillStyle = isPhase2 ? '#ff0000' : '#ff4400';
  const eyeSize = 5 + Math.sin(Date.now() * 0.005) * 1;
  ctx.fillRect(px + (f === 1 ? 38 : 18), py + 3, eyeSize, eyeSize);
  ctx.fillRect(px + (f === 1 ? 48 : 28), py + 3, eyeSize, eyeSize);
  ctx.fillStyle = `rgba(255,0,0,${0.3 + Math.sin(Date.now() * 0.01) * 0.2})`;
  ctx.beginPath();
  ctx.arc(px + (f === 1 ? 41 : 21), py + 5, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(px + 20, py + 18, 30, 6);
  ctx.fillStyle = '#ccccaa';
  for (let i = 0; i < 5; i++) ctx.fillRect(px + 22 + i * 6, py + 18, 3, 4);

  ctx.fillStyle = hurtFlash ? '#ffffff' : (isPhase2 ? '#4a2a2a' : '#3a5a3a');
  const armSwing = Math.sin(boss.frame * 1.0) * 6;
  ctx.fillRect(px + (f === 1 ? 56 : -10), py + 22 + armSwing, 14, 35);
  ctx.fillRect(px + (f === 1 ? 60 : -14), py + 26 - armSwing, 14, 35);
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(px + (f === 1 ? 60 : -6), py + 55 + armSwing, 3, 6);
  ctx.fillRect(px + (f === 1 ? 64 : -10), py + 55 + armSwing, 3, 6);
  ctx.fillRect(px + (f === 1 ? 68 : -14), py + 55 + armSwing, 3, 6);

  ctx.fillStyle = hurtFlash ? '#ffffff' : (isPhase2 ? '#3a1a1a' : '#2a3a2a');
  const legAnim = Math.sin(boss.frame * 1.2) * 4;
  ctx.fillRect(px + 15, py + 62, 12, 24 + legAnim);
  ctx.fillRect(px + 43, py + 62, 12, 24 - legAnim);

  if (boss.isCharging && boss.chargeTimer <= 15) {
    ctx.strokeStyle = `rgba(255,100,0,${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + boss.w/2, py + boss.h/2, boss.w/2 + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  const barW = 80;
  const barX = px + (boss.w - barW) / 2;
  ctx.fillStyle = '#440000';
  ctx.fillRect(barX, py - 25, barW, 8);
  ctx.fillStyle = isPhase2 ? '#ff4400' : '#ff0000';
  ctx.fillRect(barX, py - 25, barW * (boss.hp / boss.maxHp), 8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, py - 25, barW, 8);

  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 10px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText('ZOMBIE LORD', px + boss.w/2, py - 30);
  ctx.textAlign = 'left';
}

export function drawBackground() {
  const ld = state.levelData;
  const currentLevel = state.currentLevel;

  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y + 50);
  if (currentLevel === 1) { grad.addColorStop(0, '#0a1a0a'); grad.addColorStop(1, '#1a3a1a'); }
  else if (currentLevel === 2) { grad.addColorStop(0, '#0a0a15'); grad.addColorStop(1, '#1a1a2a'); }
  else { grad.addColorStop(0, '#0a1a2a'); grad.addColorStop(1, '#1a3a4a'); }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ddeeff';
  ctx.beginPath();
  ctx.arc(700 - camera.x * 0.05, 60, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = currentLevel === 3 ? '#1a3a4a' : '#1a1a2a';
  ctx.beginPath();
  ctx.arc(690 - camera.x * 0.05, 55, 26, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 50; i++) {
    const sx = (i * 197 + 50) % canvas.width + Math.sin(Date.now() * 0.001 + i) * 0.5;
    const sy = (i * 73 + 20) % (GROUND_Y - 50);
    const brightness = 0.3 + Math.sin(Date.now() * 0.002 + i * 0.7) * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${brightness})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  if (currentLevel === 1 && ld.trees) {
    ld.trees.forEach(t => {
      const tx = t.x - camera.x * 0.6;
      if (tx < -100 || tx > canvas.width + 100) return;
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(tx - 5, GROUND_Y + 50 - t.h, 10, t.h);
      ctx.fillStyle = '#1a4a1a';
      ctx.beginPath(); ctx.arc(tx, GROUND_Y + 50 - t.h, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a3a0a';
      ctx.beginPath(); ctx.arc(tx - 8, GROUND_Y + 50 - t.h + 5, 18, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (currentLevel === 2 && ld.highway) {
    // Road dashed center line
    for (let lx = -camera.x % 40; lx < canvas.width; lx += 40) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(lx, GROUND_Y + 35, 20, 3);
    }
    ld.highway.forEach(h => {
      const hx = h.x - camera.x * 0.7;
      if (hx < -80 || hx > canvas.width + 80) return;
      if (h.type === 'car') {
        // Wrecked car
        ctx.fillStyle = h.color;
        ctx.fillRect(hx - 20, GROUND_Y + 50 - 22, 40, 16);
        ctx.fillStyle = '#333333';
        ctx.fillRect(hx - 12, GROUND_Y + 50 - 30, 24, 10);
        ctx.fillStyle = '#88aacc';
        ctx.fillRect(hx - 8, GROUND_Y + 50 - 28, 16, 6);
        // Wheels
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(hx - 12, GROUND_Y + 50 - 4, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 12, GROUND_Y + 50 - 4, 5, 0, Math.PI * 2); ctx.fill();
      } else if (h.type === 'sign') {
        // Road sign
        ctx.fillStyle = '#666666';
        ctx.fillRect(hx - 2, GROUND_Y + 50 - 50, 4, 50);
        ctx.fillStyle = '#228822';
        ctx.fillRect(hx - 15, GROUND_Y + 50 - 60, 30, 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', hx, GROUND_Y + 50 - 50);
        ctx.textAlign = 'left';
      } else if (h.type === 'lamp') {
        // Lamppost
        ctx.fillStyle = '#555555';
        ctx.fillRect(hx - 2, GROUND_Y + 50 - 70, 4, 70);
        ctx.fillStyle = '#777777';
        ctx.fillRect(hx - 8, GROUND_Y + 50 - 72, 16, 4);
        // Light glow
        const glowGrad = ctx.createRadialGradient(hx, GROUND_Y + 50 - 68, 0, hx, GROUND_Y + 50 - 68, 35);
        glowGrad.addColorStop(0, 'rgba(255,200,100,0.2)');
        glowGrad.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(hx - 35, GROUND_Y + 50 - 103, 70, 70);
      }
    });
  }

  if (currentLevel === 3 && ld.iceFeatures) {
    ld.iceFeatures.forEach(f => {
      const fx = f.x - camera.x * 0.7;
      if (fx < -60 || fx > canvas.width + 60) return;
      if (f.type === 'icicle') {
        // Hanging icicle from top
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.moveTo(fx - 4, 0);
        ctx.lineTo(fx + 4, 0);
        ctx.lineTo(fx, f.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#cceeFF';
        ctx.beginPath();
        ctx.moveTo(fx - 1, 0);
        ctx.lineTo(fx + 1, 0);
        ctx.lineTo(fx, f.h * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (f.type === 'mound') {
        // Snow mound
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath();
        ctx.arc(fx, GROUND_Y + 50, f.h, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#eef4ff';
        ctx.beginPath();
        ctx.arc(fx, GROUND_Y + 50, f.h * 0.6, Math.PI, 0);
        ctx.fill();
      } else if (f.type === 'frozenTree') {
        // Frozen tree
        ctx.fillStyle = '#556677';
        ctx.fillRect(fx - 4, GROUND_Y + 50 - f.h, 8, f.h);
        // Icy branches
        ctx.fillStyle = '#99bbdd';
        ctx.beginPath(); ctx.arc(fx, GROUND_Y + 50 - f.h, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bbddee';
        ctx.beginPath(); ctx.arc(fx - 6, GROUND_Y + 50 - f.h + 5, 14, 0, Math.PI * 2); ctx.fill();
        // Ice sparkle
        ctx.fillStyle = `rgba(200,230,255,${0.3 + Math.sin(Date.now() * 0.003 + f.x) * 0.2})`;
        ctx.beginPath(); ctx.arc(fx + 5, GROUND_Y + 50 - f.h - 5, 3, 0, Math.PI * 2); ctx.fill();
      }
    });
    // Falling snowflakes
    for (let i = 0; i < 20; i++) {
      const sx = (Date.now() * 0.02 * (i * 0.2 + 0.3) + i * 120) % canvas.width;
      const sy = (Date.now() * 0.015 * (i * 0.1 + 0.2) + i * 80) % (GROUND_Y + 30);
      ctx.fillStyle = `rgba(230,240,255,${0.3 + Math.sin(Date.now() * 0.001 + i * 1.3) * 0.2})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  ctx.fillStyle = ld.groundColor;
  ctx.fillRect(0, GROUND_Y + 50, canvas.width, canvas.height - GROUND_Y - 50);
  ctx.fillStyle = ld.groundColor.replace(/[0-9a-f]/g, c => {
    const v = Math.min(15, parseInt(c, 16) + 2); return v.toString(16);
  });
  ctx.fillRect(0, GROUND_Y + 50, canvas.width, 3);

  ld.platforms.forEach(p => {
    const px = p.x - camera.x;
    if (px + p.w < 0 || px > canvas.width) return;
    if (currentLevel === 3) {
      ctx.fillStyle = '#8aaacc'; ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#aaccee'; ctx.fillRect(px, p.y, p.w, 4);
      ctx.fillStyle = '#7a99bb';
      ctx.fillRect(px + 5, p.y + p.h, 3, 8);
      ctx.fillRect(px + p.w - 8, p.y + p.h, 3, 8);
    } else if (currentLevel === 2) {
      ctx.fillStyle = '#555560'; ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#666670'; ctx.fillRect(px, p.y, p.w, 4);
      ctx.fillStyle = '#444450';
      ctx.fillRect(px + 5, p.y + p.h, 3, 8);
      ctx.fillRect(px + p.w - 8, p.y + p.h, 3, 8);
    } else {
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#7a6a5a'; ctx.fillRect(px, p.y, p.w, 4);
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(px + 5, p.y + p.h, 3, 8);
      ctx.fillRect(px + p.w - 8, p.y + p.h, 3, 8);
    }
  });
}

export function drawHealthPickups() {
  state.healthPickups.forEach(h => {
    if (h.collected) return;
    const hx = h.x - camera.x;
    const hy = h.y + Math.sin(h.bobTimer) * 5;
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(hx - 3, hy - 8, 6, 16);
    ctx.fillRect(hx - 8, hy - 3, 16, 6);
    ctx.fillStyle = 'rgba(68,255,68,0.15)';
    ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawPowerupCrates() {
  state.powerupCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(cx, cy, c.w, c.h);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);

    ctx.fillStyle = c.powerupType.color;
    ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('?', cx + c.w/2, cy + c.h/2 + 4); ctx.textAlign = 'left';

    ctx.fillStyle = `rgba(${c.powerupType.color === '#44ff88' ? '68,255,136' : c.powerupType.color === '#ff8844' ? '255,136,68' : '255,68,255'},${0.1 + Math.sin(Date.now() * 0.003) * 0.05})`;
    ctx.beginPath(); ctx.arc(cx + c.w/2, cy + c.h/2, 18, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(cx + 4 + i * 7, cy - 6, 5, 3);
    }
  });
}

export function drawPortal() {
  const portal = state.portal;
  if (!portal || portal.entered) return;
  const px = portal.x - camera.x;
  const py = portal.y;
  const t = portal.timer;

  const glowGrad = ctx.createRadialGradient(px, py - 30, 0, px, py - 30, 45);
  glowGrad.addColorStop(0, `rgba(136,68,255,${0.3 + Math.sin(t * 3) * 0.1})`);
  glowGrad.addColorStop(1, 'rgba(136,68,255,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(px - 50, py - 80, 100, 100);

  ctx.save();
  ctx.translate(px, py - 30);
  ctx.strokeStyle = '#aa66ff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 32, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 26, 0, 0, Math.PI * 2); ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const angle = t * 2 + i * (Math.PI * 2 / 6);
    ctx.fillStyle = `rgba(200,160,255,${0.5 + Math.sin(t * 4 + i) * 0.3})`;
    ctx.fillRect(Math.cos(angle) * 12 - 2, Math.sin(angle) * 20 - 2, 4, 4);
  }
  ctx.fillStyle = `rgba(220,180,255,${0.3 + Math.sin(t * 5) * 0.15})`;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(`Level ${portal.nextLevel}`, px, py - 70);
  const bobArrow = Math.sin(Date.now() * 0.005) * 3;
  ctx.fillStyle = '#aa66ff'; ctx.font = '12px "Courier New"';
  ctx.fillText('>>> ENTER <<<', px, py - 82 + bobArrow);
  ctx.textAlign = 'left';
}

export function drawDiamond() {
  const d = state.diamond;
  if (!d || d.collected) return;
  const dx = d.x - camera.x;
  const dy = d.y + Math.sin(d.glow) * 8;
  const glow = 0.5 + Math.sin(d.glow * 3) * 0.3;

  const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 50);
  glowGrad.addColorStop(0, `rgba(0,255,255,${glow * 0.4})`);
  glowGrad.addColorStop(1, 'rgba(0,255,255,0)');
  ctx.fillStyle = glowGrad; ctx.fillRect(dx - 50, dy - 50, 100, 100);

  ctx.fillStyle = '#00ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 18); ctx.lineTo(dx + 14, dy); ctx.lineTo(dx, dy + 18); ctx.lineTo(dx - 14, dy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#88ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 10); ctx.lineTo(dx + 7, dy); ctx.lineTo(dx, dy + 10); ctx.lineTo(dx - 7, dy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dx - 1, dy - 22, 2, 6); ctx.fillRect(dx - 1, dy + 16, 2, 6);
  ctx.fillRect(dx - 18, dy - 1, 6, 2); ctx.fillRect(dx + 12, dy - 1, 6, 2);
}

export function drawParticles() {
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camera.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

export function drawFloatingTexts() {
  state.floatingTexts.forEach(t => {
    ctx.globalAlpha = t.life / 60;
    ctx.fillStyle = t.color;
    ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x - camera.x, t.y);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;
}

export function drawProjectiles() {
  state.projectiles.forEach(proj => {
    const px = proj.x - camera.x;
    const py = proj.y;

    if (proj.type === 'banana') {
      // Spinning banana
      const spin = Date.now() * 0.015;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(spin);
      // Banana body (curved shape)
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0.3, Math.PI - 0.3);
      ctx.fill();
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.arc(0, -1, 6, 0.5, Math.PI - 0.5);
      ctx.fill();
      // Tips
      ctx.fillStyle = '#886600';
      ctx.fillRect(-7, -2, 3, 2);
      ctx.fillRect(5, -2, 3, 2);
      ctx.restore();
      // Trail
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(255,221,0,${0.15 - i * 0.04})`;
        ctx.beginPath();
        ctx.arc(px - proj.vx * (i + 1) * 0.5, py - proj.vy * (i + 1) * 0.5, 5 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (proj.type === 'litter') {
      // Litter chunk - small brownish/grey chunks
      ctx.fillStyle = '#998877';
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillStyle = '#bbaa88';
      ctx.fillRect(px - 2, py - 2, 4, 4);
      // Dust trail
      ctx.fillStyle = `rgba(170,153,119,${proj.life / 30 * 0.3})`;
      ctx.beginPath();
      ctx.arc(px - proj.vx * 0.3, py - proj.vy * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(15, 15, 204, 24);
  ctx.fillStyle = '#440000'; ctx.fillRect(17, 17, 200, 20);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc4444';
  ctx.fillRect(17, 17, 200 * hpRatio, 20);
  ctx.fillStyle = '#ffffff'; ctx.font = '12px "Courier New"';
  ctx.fillText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`, 22, 32);

  // Lives display
  ctx.fillStyle = '#ffcc00'; ctx.font = '14px "Courier New"';
  for (let i = 0; i < player.lives; i++) {
    ctx.fillText('\u2764', 230 + i * 18, 32);
  }

  ctx.fillStyle = '#ffcc00'; ctx.font = '16px "Courier New"'; ctx.textAlign = 'right';
  ctx.fillText(`SCORE: ${player.score}`, canvas.width - 20, 32); ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff'; ctx.font = '14px "Courier New"';
  ctx.fillText(`LEVEL ${state.currentLevel} - ${state.levelData.name}`, 15, 55);

  const alive = state.zombies.filter(z => z.alive).length;
  ctx.fillStyle = '#ff6666';
  ctx.fillText(state.gameState === 'bossFight' ? 'BOSS FIGHT!' : `ZOMBIES: ${alive}`, 15, 75);

  if (player.combo > 1) {
    ctx.fillStyle = `rgba(255,255,0,${0.5 + Math.sin(Date.now() * 0.01) * 0.5})`;
    ctx.font = '20px "Courier New"';
    ctx.fillText(`COMBO x${player.combo}!`, canvas.width / 2 - 60, 35);
  }

  let puY = 95;
  if (player.powerups.jumpyBoots > 0) {
    ctx.fillStyle = '#44ff88'; ctx.font = '11px "Courier New"';
    ctx.fillText(`JUMPY BOOTS [${Math.ceil(player.powerups.jumpyBoots/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.clawsOfSteel > 0) {
    ctx.fillStyle = '#ff8844'; ctx.font = '11px "Courier New"';
    ctx.fillText(`CLAWS OF STEEL [${Math.ceil(player.powerups.clawsOfSteel/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.superFangs > 0) {
    ctx.fillStyle = '#ff44ff'; ctx.font = '11px "Courier New"';
    ctx.fillText(`SUPER FANGS [${Math.ceil(player.powerups.superFangs/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.raceCar > 0) {
    ctx.fillStyle = '#cc2222'; ctx.font = '11px "Courier New"';
    ctx.fillText(`RACE CAR [${Math.ceil(player.powerups.raceCar/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.bananaCannon > 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = '11px "Courier New"';
    ctx.fillText(`BANANA CANNON [${Math.ceil(player.powerups.bananaCannon/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.litterBox > 0) {
    ctx.fillStyle = '#aa8844'; ctx.font = '11px "Courier New"';
    ctx.fillText(`LITTER BOX [${Math.ceil(player.powerups.litterBox/60)}s]`, 15, puY); puY += 14;
  }

  if (state.currentLevel === 3) {
    ctx.textAlign = 'center';
    if (state.gameState === 'playing') {
      if (!state.zombies.every(z => !z.alive)) {
        ctx.fillStyle = '#aaaaaa'; ctx.font = '12px "Courier New"';
        ctx.fillText('Defeat all zombies to face the Zombie Lord!', canvas.width / 2, canvas.height - 20);
      }
    } else if (state.gameState === 'bossFight' && state.boss && !state.boss.alive && state.diamond && !state.diamond.collected) {
      ctx.fillStyle = '#00ffff'; ctx.font = '14px "Courier New"';
      ctx.fillText('>>> THE LEOPARD DIAMOND AWAITS! >>>', canvas.width / 2, canvas.height - 20);
    }
    ctx.textAlign = 'left';
  }
}

export function drawDying() {
  const t = state.deathTimer;
  ctx.fillStyle = `rgba(100,0,0,${0.5 * (1 - t / 90)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 30px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('YOU DIED!', canvas.width / 2, canvas.height / 2 - 20);
  if (player.lives > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = '18px "Courier New"';
    ctx.fillText(`${player.lives} ${player.lives === 1 ? 'LIFE' : 'LIVES'} REMAINING`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = '#aaaaaa'; ctx.font = '14px "Courier New"';
    ctx.fillText('Restarting level...', canvas.width / 2, canvas.height / 2 + 50);
  } else {
    ctx.fillStyle = '#ff6666'; ctx.font = '18px "Courier New"';
    ctx.fillText('NO LIVES LEFT', canvas.width / 2, canvas.height / 2 + 20);
  }
  ctx.textAlign = 'left';
}

export function drawBossIntro() {
  ctx.fillStyle = `rgba(0,0,0,${0.3 + Math.sin(Date.now() * 0.005) * 0.15})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 36px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('WARNING!', canvas.width / 2 + Math.sin(Date.now() * 0.02) * 3, canvas.height / 2 - 40);
  ctx.fillStyle = '#ffffff'; ctx.font = '20px "Courier New"';
  ctx.fillText('THE ZOMBIE LORD APPROACHES!', canvas.width / 2, canvas.height / 2 + 10);
  ctx.fillStyle = '#aaaaaa'; ctx.font = '14px "Courier New"';
  ctx.fillText('Defeat the boss to claim the Leopard Diamond', canvas.width / 2, canvas.height / 2 + 50);
  ctx.textAlign = 'left';
}

export function drawTitleScreen() {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 30; i++) {
    const x = (Date.now() * 0.02 * (i * 0.3 + 0.5) + i * 100) % canvas.width;
    const y = (i * 47 + 10) % canvas.height;
    ctx.fillStyle = `rgba(0,255,0,${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.1})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.fillStyle = '#e8a828'; ctx.font = 'bold 48px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('LEOPARD', canvas.width / 2, 150);
  ctx.fillStyle = '#ff4444'; ctx.fillText('vs', canvas.width / 2, 200);
  ctx.fillStyle = '#5a7a5a'; ctx.fillText('ZOMBIES', canvas.width / 2, 250);

  const dx = canvas.width / 2, dy = 295;
  ctx.fillStyle = '#00ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 12); ctx.lineTo(dx + 10, dy); ctx.lineTo(dx, dy + 12); ctx.lineTo(dx - 10, dy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#aaaaaa'; ctx.font = '16px "Courier New"';
  ctx.fillText('Arrow Keys - Move & Jump', canvas.width / 2, 345);
  ctx.fillText('Space - Attack', canvas.width / 2, 370);
  ctx.fillText('Break crates on platforms for power-ups!', canvas.width / 2, 400);
  ctx.fillText('3 Lives - Defeat zombies across 3 levels', canvas.width / 2, 430);
  ctx.fillText('Capture the Leopard Diamond!', canvas.width / 2, 455);

  if (Math.sin(Date.now() * 0.005) > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px "Courier New"';
    ctx.fillText('PRESS ENTER TO START', canvas.width / 2, 505);
  }
  ctx.textAlign = 'left';
}

export function drawLevelComplete() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 36px "Courier New"'; ctx.textAlign = 'center';
  if (state.currentLevel < 3) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`LEVEL ${state.currentLevel} COMPLETE!`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#aaaaaa'; ctx.font = '18px "Courier New"';
    ctx.fillText(`Advancing to Level ${state.currentLevel + 1}...`, canvas.width / 2, canvas.height / 2 + 30);
  } else {
    ctx.fillStyle = '#00ffff';
    ctx.fillText('LEOPARD DIAMOND CAPTURED!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#aaaaaa'; ctx.font = '18px "Courier New"';
    ctx.fillText('Victory is yours!', canvas.width / 2, canvas.height / 2 + 30);
  }
  ctx.textAlign = 'left';
}

export function drawGameWin() {
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 40; i++) {
    const x = (Date.now() * 0.03 * (i * 0.2 + 0.3) + i * 80) % canvas.width;
    const y = (Date.now() * 0.02 * (i * 0.1 + 0.2) + i * 60) % canvas.height;
    const colors = ['#ff0000', '#ffcc00', '#00ff00', '#00ffff', '#ff00ff'];
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x, y, 3, 3);
  }
  const dx = canvas.width / 2, dy = 120;
  const glow = Math.sin(Date.now() * 0.003);
  const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 60);
  glowGrad.addColorStop(0, 'rgba(0,255,255,0.3)'); glowGrad.addColorStop(1, 'rgba(0,255,255,0)');
  ctx.fillStyle = glowGrad; ctx.fillRect(dx - 60, dy - 60, 120, 120);
  ctx.fillStyle = '#00ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 25 + glow * 3); ctx.lineTo(dx + 20, dy);
  ctx.lineTo(dx, dy + 25 - glow * 3); ctx.lineTo(dx - 20, dy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 42px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('VICTORY!', canvas.width / 2, 210);
  ctx.fillStyle = '#ffffff'; ctx.font = '20px "Courier New"';
  ctx.fillText('The Leopard Diamond is yours!', canvas.width / 2, 260);
  ctx.fillStyle = '#e8a828'; ctx.font = 'bold 28px "Courier New"';
  ctx.fillText(`FINAL SCORE: ${player.score}`, canvas.width / 2, 320);
  ctx.fillStyle = '#aaaaaa'; ctx.font = '16px "Courier New"';
  ctx.fillText('You fought through the Dark Forest,', canvas.width / 2, 380);
  ctx.fillText('raced across the Highway, survived the', canvas.width / 2, 405);
  ctx.fillText('Ice Age, and defeated the Zombie Lord!', canvas.width / 2, 430);
  if (Math.sin(Date.now() * 0.005) > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', canvas.width / 2, 490);
  }
  ctx.textAlign = 'left';
}

export function drawGameOver() {
  ctx.fillStyle = 'rgba(80,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
  ctx.fillStyle = '#aaaaaa'; ctx.font = '18px "Courier New"';
  ctx.fillText(`Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText(`Reached Level ${state.currentLevel}`, canvas.width / 2, canvas.height / 2 + 50);
  if (Math.sin(Date.now() * 0.005) > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
    ctx.fillText('PRESS ENTER TO RETRY', canvas.width / 2, canvas.height / 2 + 100);
  }
  ctx.textAlign = 'left';
}
