// All drawing functions
import { GROUND_Y, DRAW_SCALE, state, player, camera, ARMOR_TYPES, GLASSES_TYPE, SNEAKERS_TYPE, CLEATS_TYPE, HORSE_TYPE, ANIMAL_TYPES } from './state.js';

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

    // === ANIMAL (sitting in car) ===
    _drawAnimalInCar(ctx, player.animal, px, py, by);

    // Jet fire (behind car - always at back; ctx flip handles direction)
    const jetX = px - 10;
    for (let i = 0; i < 12; i++) {
      const flicker = Math.random();
      const dist = Math.random() * 36;
      const size = 3 + Math.random() * 5 * (1 - dist / 36);
      ctx.fillStyle = `rgba(${255},${Math.floor(100 + flicker * 155)},0,${(0.5 + flicker * 0.5) * (1 - dist / 50)})`;
      ctx.beginPath();
      ctx.arc(jetX - dist + (Math.random() - 0.5) * 10, py + 35 + by + (Math.random() - 0.5) * 8, size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inner white-hot core
    for (let i = 0; i < 4; i++) {
      const dist = Math.random() * 18;
      ctx.fillStyle = `rgba(255,255,200,${0.4 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(jetX - dist + (Math.random() - 0.5) * 6, py + 35 + by + (Math.random() - 0.5) * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
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

    // Animal peeking out of box
    _drawAnimalInLitterBox(ctx, player.animal, px, py, by);

  } else {
    // === WALKING ANIMAL ON ALL FOURS (dispatches by player.animal) ===
    _drawWalkingAnimal(ctx, player.animal, px, py, by);
  }

  // Powerup visuals
  if (player.powerups.jumpyBoots > 0 && player.powerups.raceCar <= 0 && player.powerups.litterBox <= 0) {
    const runSpeed2 = Math.abs(player.vx) > 0.5;
    const legTime2 = Date.now() * (runSpeed2 ? 0.012 : 0.004);
    const legSwing2 = runSpeed2 ? Math.sin(legTime2) * 7 : 0;
    const springBounce = Math.sin(Date.now() * 0.015) * 2;

    const drawJumpyBoot = (bx, by2) => {
      // Big green boot body
      ctx.fillStyle = '#22cc55';
      ctx.fillRect(bx - 2, by2 - 5, 11, 12);
      // Boot top rim
      ctx.fillStyle = '#33ee66';
      ctx.fillRect(bx - 2, by2 - 6, 11, 2);
      // Toe
      ctx.fillStyle = '#1daa44';
      ctx.fillRect(bx + 7, by2 + 2, 3, 5);
      // Spring coils under boot
      ctx.fillStyle = '#cccccc';
      const sy = by2 + 7;
      ctx.fillRect(bx - 1, sy + springBounce, 10, 2);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(bx + 1, sy + 2 + springBounce * 0.7, 6, 2);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(bx - 1, sy + 4 + springBounce * 0.4, 10, 2);
      // Boot buckle
      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(bx + 2, by2 - 1, 4, 3);
      // Green glow
      ctx.fillStyle = 'rgba(68,255,136,0.25)';
      ctx.beginPath();
      ctx.arc(bx + 4, by2 + 5, 10, 0, Math.PI * 2);
      ctx.fill();
    };

    drawJumpyBoot(px + 7, py + 36 + by + legSwing2);
    drawJumpyBoot(px + 13, py + 36 + by - legSwing2);
    drawJumpyBoot(px + 26, py + 36 + by - legSwing2);
    drawJumpyBoot(px + 32, py + 36 + by + legSwing2);
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
  // Banana cannon with monkey loader
  if (player.powerups.bananaCannon > 0 && player.powerups.raceCar <= 0 && player.powerups.litterBox <= 0) {
    const cx = px + 10;
    const cy = py + 10 + by;

    // Cannon wooden mount / base
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(cx + 2, cy + 6, 14, 5);
    // Darker wood grain on mount
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(cx + 3, cy + 8, 12, 1);
    // Mount side supports
    ctx.fillStyle = '#7A5230';
    ctx.fillRect(cx + 1, cy + 5, 3, 7);
    ctx.fillRect(cx + 14, cy + 5, 3, 7);

    // Cannon barrel - dark grey/black, pointing forward (to the right)
    ctx.fillStyle = '#333333';
    ctx.fillRect(cx + 5, cy + 2, 16, 5);
    // Barrel bore (darker inside)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx + 20, cy + 3, 2, 3);
    // Barrel rim at muzzle
    ctx.fillStyle = '#444444';
    ctx.fillRect(cx + 19, cy + 1, 3, 7);
    // Barrel bands (metal rings)
    ctx.fillStyle = '#555555';
    ctx.fillRect(cx + 8, cy + 1, 2, 7);
    ctx.fillRect(cx + 13, cy + 1, 2, 7);
    // Barrel highlight
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx + 6, cy + 2, 13, 1);

    // Monkey body - sitting behind/left of the cannon
    const mx = cx - 4;
    const my = cy - 2;
    // Body
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mx, my + 3, 7, 8);
    // Belly (lighter)
    ctx.fillStyle = '#C4883C';
    ctx.fillRect(mx + 1, my + 5, 5, 4);
    // Head
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mx + 1, my - 2, 6, 6);
    // Face (lighter oval)
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(mx + 2, my, 4, 3);
    // Eyes
    ctx.fillStyle = '#111111';
    ctx.fillRect(mx + 2, my, 1, 1);
    ctx.fillRect(mx + 5, my, 1, 1);
    // Mouth / smile
    ctx.fillStyle = '#222222';
    ctx.fillRect(mx + 3, my + 2, 2, 1);
    // Ears
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(mx, my - 1, 2, 2);
    ctx.fillRect(mx + 5, my - 1, 2, 2);

    // Right arm reaching toward cannon (loading a banana)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mx + 6, my + 4, 4, 2);
    ctx.fillRect(mx + 9, my + 3, 2, 3);
    // Left arm also reaching
    ctx.fillStyle = '#7A3B10';
    ctx.fillRect(mx + 6, my + 6, 3, 2);
    ctx.fillRect(mx + 8, my + 5, 2, 3);

    // Banana being loaded into cannon
    ctx.fillStyle = '#FFE135';
    ctx.fillRect(mx + 10, my + 3, 4, 2);
    // Banana tip
    ctx.fillStyle = '#CCAA00';
    ctx.fillRect(mx + 14, my + 3, 1, 1);
    // Banana stem
    ctx.fillStyle = '#8B7D3C';
    ctx.fillRect(mx + 10, my + 3, 1, 1);

    // Monkey tail curling behind
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mx - 2, my + 7, 3, 2);
    ctx.fillRect(mx - 3, my + 5, 2, 3);
    ctx.fillRect(mx - 3, my + 4, 1, 2);
  }

  // Armor overlay (drawn on top of leopard body)
  if (player.items.armor && player.powerups.raceCar <= 0 && player.powerups.litterBox <= 0) {
    if (player.items.armor === 'leather') {
      // Leather armor - brown/tan armor pieces on body and head
      // Chest plate
      ctx.fillStyle = 'rgba(160,110,50,0.75)';
      ctx.fillRect(px + 10, py + 20 + by, 26, 12);
      // Shoulder guards
      ctx.fillStyle = '#b08040';
      ctx.fillRect(px + 8, py + 18 + by, 8, 6);
      ctx.fillRect(px + 28, py + 18 + by, 8, 6);
      // Leather straps
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(px + 14, py + 19 + by, 2, 14);
      ctx.fillRect(px + 28, py + 19 + by, 2, 14);
      // Belt
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(px + 8, py + 30 + by, 28, 3);
      // Belt buckle
      ctx.fillStyle = '#ccaa44';
      ctx.fillRect(px + 20, py + 30 + by, 4, 3);
      // Head guard (small leather cap)
      ctx.fillStyle = 'rgba(160,110,50,0.6)';
      ctx.fillRect(px + 34, py + 7 + by, 10, 5);
      // Leg guards
      ctx.fillStyle = 'rgba(140,95,40,0.6)';
      ctx.fillRect(px + 28, py + 33 + by, 6, 8);
      ctx.fillRect(px + 34, py + 33 + by, 6, 8);
      ctx.fillRect(px + 9, py + 33 + by, 6, 8);
      ctx.fillRect(px + 15, py + 33 + by, 6, 8);
      // Stitching details
      ctx.fillStyle = '#6a4020';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(px + 12 + i * 6, py + 25 + by, 1, 1);
      }
    } else if (player.items.armor === 'chainmail') {
      // Chainmail armor - silver chain mesh overlay on body
      // Full chest chainmail
      ctx.fillStyle = 'rgba(170,170,200,0.65)';
      ctx.fillRect(px + 8, py + 18 + by, 30, 16);
      // Chain mesh pattern (grid of small dots)
      ctx.fillStyle = 'rgba(200,200,220,0.7)';
      for (let iy = 0; iy < 6; iy++) {
        for (let ix = 0; ix < 10; ix++) {
          const ox = (iy % 2) * 1.5;
          ctx.fillRect(px + 9 + ix * 3 + ox, py + 19 + iy * 2.5 + by, 1.5, 1.5);
        }
      }
      // Silver shoulder pauldrons
      ctx.fillStyle = '#aaaacc';
      ctx.fillRect(px + 6, py + 16 + by, 10, 7);
      ctx.fillRect(px + 28, py + 16 + by, 10, 7);
      // Pauldron shine
      ctx.fillStyle = 'rgba(220,220,240,0.5)';
      ctx.fillRect(px + 7, py + 17 + by, 4, 2);
      ctx.fillRect(px + 29, py + 17 + by, 4, 2);
      // Metal belt
      ctx.fillStyle = '#9999bb';
      ctx.fillRect(px + 6, py + 31 + by, 32, 3);
      // Belt segments
      ctx.fillStyle = '#bbbbdd';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(px + 8 + i * 6, py + 31 + by, 3, 3);
      }
      // Head guard (chainmail coif)
      ctx.fillStyle = 'rgba(170,170,200,0.55)';
      ctx.fillRect(px + 32, py + 6 + by, 12, 8);
      // Coif mesh dots
      ctx.fillStyle = 'rgba(200,200,220,0.6)';
      for (let iy = 0; iy < 3; iy++) {
        for (let ix = 0; ix < 4; ix++) {
          ctx.fillRect(px + 33 + ix * 3, py + 7 + iy * 2.5 + by, 1, 1);
        }
      }
      // Leg chain guards
      ctx.fillStyle = 'rgba(160,160,190,0.55)';
      ctx.fillRect(px + 28, py + 33 + by, 6, 10);
      ctx.fillRect(px + 34, py + 33 + by, 6, 10);
      ctx.fillRect(px + 9, py + 33 + by, 6, 10);
      ctx.fillRect(px + 15, py + 33 + by, 6, 10);
      // Metallic glint animation
      const glintPos = (Date.now() * 0.005) % 30;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(px + 9 + glintPos, py + 20 + by, 2, 2);
    }
  }

  // Aviator glasses overlay (drawn on top of animal face)
  if (player.items.glasses) {
    if (player.powerups.raceCar > 0) {
      if (player.animal === 'gator') {
        // Glasses on race car gator - eyes at px+28,py+0 and px+34,py+0
        // Frame bridge
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 30, py - 2 + by, 6, 2);
        // Left lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 25, py - 3 + by, 7, 6);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 25, py - 3 + by, 7, 1);
        ctx.fillRect(px + 25, py + 2 + by, 7, 1);
        ctx.fillRect(px + 25, py - 3 + by, 1, 6);
        ctx.fillRect(px + 31, py - 3 + by, 1, 6);
        // Right lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 33, py - 3 + by, 7, 6);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 33, py - 3 + by, 7, 1);
        ctx.fillRect(px + 33, py + 2 + by, 7, 1);
        ctx.fillRect(px + 33, py - 3 + by, 1, 6);
        ctx.fillRect(px + 39, py - 3 + by, 1, 6);
        // Lens glint
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 26, py - 2 + by, 2, 1);
        ctx.fillRect(px + 34, py - 2 + by, 2, 1);
      } else {
        // Glasses on race car (leopard/redPanda/lion) - eyes at ~px+31, py+6
        // Frame bridge
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 27, py + 5 + by, 12, 2);
        // Left lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 24, py + 3 + by, 8, 6);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 24, py + 3 + by, 8, 1);
        ctx.fillRect(px + 24, py + 8 + by, 8, 1);
        ctx.fillRect(px + 24, py + 3 + by, 1, 6);
        ctx.fillRect(px + 31, py + 3 + by, 1, 6);
        // Right lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 33, py + 3 + by, 7, 6);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 33, py + 3 + by, 7, 1);
        ctx.fillRect(px + 33, py + 8 + by, 7, 1);
        ctx.fillRect(px + 33, py + 3 + by, 1, 6);
        ctx.fillRect(px + 39, py + 3 + by, 1, 6);
        // Lens glint
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 25, py + 4 + by, 2, 1);
        ctx.fillRect(px + 34, py + 4 + by, 2, 1);
      }
    } else if (player.powerups.litterBox > 0) {
      if (player.animal === 'gator') {
        // Glasses on litter box gator - eyes at px+27,py+3 and px+33,py+3
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 30, py + 2 + by, 5, 2);
        // Left lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 24, py + 0 + by, 8, 6);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 24, py + 0 + by, 8, 1);
        ctx.fillRect(px + 24, py + 5 + by, 8, 1);
        ctx.fillRect(px + 24, py + 0 + by, 1, 6);
        ctx.fillRect(px + 31, py + 0 + by, 1, 6);
        // Right lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 33, py + 0 + by, 7, 6);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 33, py + 0 + by, 7, 1);
        ctx.fillRect(px + 33, py + 5 + by, 7, 1);
        ctx.fillRect(px + 33, py + 0 + by, 1, 6);
        ctx.fillRect(px + 39, py + 0 + by, 1, 6);
        // Lens glint
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 25, py + 1 + by, 2, 1);
        ctx.fillRect(px + 34, py + 1 + by, 2, 1);
      } else {
        // Glasses on litter box (leopard/redPanda/lion) - eyes at ~px+31, py+10
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 27, py + 9 + by, 12, 2);
        // Left lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 24, py + 7 + by, 8, 6);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 24, py + 7 + by, 8, 1);
        ctx.fillRect(px + 24, py + 12 + by, 8, 1);
        ctx.fillRect(px + 24, py + 7 + by, 1, 6);
        ctx.fillRect(px + 31, py + 7 + by, 1, 6);
        // Right lens
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 33, py + 7 + by, 7, 6);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 33, py + 7 + by, 7, 1);
        ctx.fillRect(px + 33, py + 12 + by, 7, 1);
        ctx.fillRect(px + 33, py + 7 + by, 1, 6);
        ctx.fillRect(px + 39, py + 7 + by, 1, 6);
        // Lens glint
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 25, py + 8 + by, 2, 1);
        ctx.fillRect(px + 34, py + 8 + by, 2, 1);
      }
    } else {
      if (player.animal === 'gator') {
        // Glasses on walking gator - eyes at px+41,py+7 and px+49,py+7
        // Frame bridge (between lenses)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 46, py + 6 + by, 4, 2);
        // Left lens (over left eye area)
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 38, py + 4 + by, 9, 7);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 38, py + 4 + by, 9, 1);
        ctx.fillRect(px + 38, py + 10 + by, 9, 1);
        ctx.fillRect(px + 38, py + 4 + by, 1, 7);
        ctx.fillRect(px + 46, py + 4 + by, 1, 7);
        // Right lens (over right eye area)
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 48, py + 4 + by, 7, 7);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 48, py + 4 + by, 7, 1);
        ctx.fillRect(px + 48, py + 10 + by, 7, 1);
        ctx.fillRect(px + 48, py + 4 + by, 1, 7);
        ctx.fillRect(px + 54, py + 4 + by, 1, 7);
        // Temple arm (extends back from frame)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 36, py + 6 + by, 3, 2);
        // Lens glint (reflection)
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 39, py + 5 + by, 3, 1);
        ctx.fillRect(px + 49, py + 5 + by, 3, 1);
      } else {
        // Glasses on walking (leopard/redPanda/lion) - eyes at ~px+37,py+10 and px+43,py+10
        // Frame bridge (between lenses)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 39, py + 9 + by, 5, 2);
        // Left lens (over left eye area)
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 33, py + 7 + by, 8, 7);
        // Left lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 33, py + 7 + by, 8, 1);
        ctx.fillRect(px + 33, py + 13 + by, 8, 1);
        ctx.fillRect(px + 33, py + 7 + by, 1, 7);
        ctx.fillRect(px + 40, py + 7 + by, 1, 7);
        // Right lens (over right eye area)
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px + 42, py + 7 + by, 7, 7);
        // Right lens frame
        ctx.fillStyle = '#222222';
        ctx.fillRect(px + 42, py + 7 + by, 7, 1);
        ctx.fillRect(px + 42, py + 13 + by, 7, 1);
        ctx.fillRect(px + 42, py + 7 + by, 1, 7);
        ctx.fillRect(px + 48, py + 7 + by, 1, 7);
        // Temple arm (extends back from frame)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 31, py + 9 + by, 3, 2);
        // Lens glint (reflection)
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 34, py + 8 + by, 3, 1);
        ctx.fillRect(px + 43, py + 8 + by, 3, 1);
      }
    }
  }

  // Footwear overlay (always drawn on leopard paws when not in vehicle)
  if (player.powerups.raceCar <= 0 && player.powerups.litterBox <= 0) {
    const runSpeedS = Math.abs(player.vx) > 0.5;
    const legTimeS = Date.now() * (runSpeedS ? 0.012 : 0.004);
    const legSwingS = runSpeedS ? Math.sin(legTimeS) * 7 : 0;

    if (player.items.cowboyBoots) {
      // Cowboy boots overlay (brown leather)
      const drawCowboyBoot = (sx, sy) => {
        // Dark outline
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(sx - 2, sy - 4, 12, 14);
        // Boot shaft (tall)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sx - 1, sy - 3, 10, 10);
        // Boot top trim
        ctx.fillStyle = '#D2691E';
        ctx.fillRect(sx - 1, sy - 4, 10, 2);
        // Pointed toe
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(sx + 7, sy + 3, 4, 4);
        // Heel
        ctx.fillStyle = '#5C3317';
        ctx.fillRect(sx - 2, sy + 7, 4, 4);
        // Sole
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(sx - 2, sy + 8, 14, 2);
        // Stitching
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(sx + 1, sy, 1, 1);
        ctx.fillRect(sx + 3, sy - 1, 1, 1);
        ctx.fillRect(sx + 5, sy, 1, 1);
        // Star decoration
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx + 3, sy + 3, 2, 2);
      };
      drawCowboyBoot(px + 7, py + 37 + by + legSwingS);
      drawCowboyBoot(px + 13, py + 37 + by - legSwingS);
      drawCowboyBoot(px + 26, py + 37 + by - legSwingS);
      drawCowboyBoot(px + 32, py + 37 + by + legSwingS);
    } else if (player.items.soccerCleats) {
      // Soccer cleats overlay (green low-cut with studs)
      const drawCleat = (sx, sy) => {
        // Dark outline
        ctx.fillStyle = '#003d12';
        ctx.fillRect(sx - 2, sy - 1, 12, 10);
        // Cleat body (low-cut shoe)
        ctx.fillStyle = '#00cc44';
        ctx.fillRect(sx - 1, sy, 10, 7);
        // Toe area
        ctx.fillStyle = '#00aa33';
        ctx.fillRect(sx + 7, sy + 1, 3, 5);
        // Collar opening (low-cut)
        ctx.fillStyle = '#009933';
        ctx.fillRect(sx - 1, sy - 1, 5, 2);
        // Sole
        ctx.fillStyle = '#004d1a';
        ctx.fillRect(sx - 2, sy + 7, 14, 2);
        // Studs (white nubs on bottom)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy + 9, 2, 2);
        ctx.fillRect(sx + 3, sy + 9, 2, 2);
        ctx.fillRect(sx + 7, sy + 9, 2, 2);
        // Lace detail
        ctx.fillStyle = '#88ffaa';
        ctx.fillRect(sx + 1, sy + 1, 1, 1);
        ctx.fillRect(sx + 3, sy, 1, 1);
        ctx.fillRect(sx + 5, sy + 1, 1, 1);
      };
      drawCleat(px + 7, py + 39 + by + legSwingS);
      drawCleat(px + 13, py + 39 + by - legSwingS);
      drawCleat(px + 26, py + 39 + by - legSwingS);
      drawCleat(px + 32, py + 39 + by + legSwingS);
    } else {
      // Default sneakers overlay (red high-tops)
      const drawSneaker = (sx, sy) => {
        ctx.fillStyle = '#440000';
        ctx.fillRect(sx - 2, sy - 2, 11, 10);
        ctx.fillStyle = '#dd2222';
        ctx.fillRect(sx - 1, sy - 1, 9, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 2, 9, 2);
        ctx.fillStyle = '#ee4444';
        ctx.fillRect(sx + 5, sy + 2, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 2, sy + 7, 12, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 2, sy + 1, 1, 1);
        ctx.fillRect(sx + 4, sy, 1, 1);
        ctx.fillRect(sx + 2, sy + 3, 1, 1);
        ctx.fillStyle = '#bb1a1a';
        ctx.fillRect(sx, sy + 4, 5, 2);
      };
      drawSneaker(px + 7, py + 39 + by + legSwingS);
      drawSneaker(px + 13, py + 39 + by - legSwingS);
      drawSneaker(px + 26, py + 39 + by - legSwingS);
      drawSneaker(px + 32, py + 39 + by + legSwingS);
    }
  }

  // Angel Wings rendering
  if (player.powerups.wings > 0) {
    const wingFlap = Math.sin(Date.now() * 0.008) * 0.4;
    const wingX = px + 12; // attach near the back/middle of the body
    const wingY = py + 16 + by;

    ctx.save();
    ctx.translate(wingX, wingY);

    // Left wing (extends upward-left from back)
    ctx.save();
    ctx.rotate(-0.6 + wingFlap);
    // Main wing shape
    ctx.fillStyle = 'rgba(200,230,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -22, -8, -36);
    ctx.quadraticCurveTo(-2, -28, 2, -18);
    ctx.closePath();
    ctx.fill();
    // Feather details
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-14, -18, -5, -30);
    ctx.quadraticCurveTo(-1, -22, 1, -14);
    ctx.closePath();
    ctx.fill();
    // Inner highlight feather
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-8, -14, -2, -22);
    ctx.quadraticCurveTo(0, -16, 1, -10);
    ctx.closePath();
    ctx.fill();
    // Feather edge lines
    ctx.strokeStyle = 'rgba(170,210,240,0.6)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-2, -6); ctx.lineTo(-12, -20);
    ctx.moveTo(-1, -10); ctx.lineTo(-10, -26);
    ctx.moveTo(0, -3); ctx.lineTo(-16, -16);
    ctx.stroke();
    ctx.restore();

    // Right wing (extends upward-right from back)
    ctx.save();
    ctx.rotate(0.6 - wingFlap);
    ctx.fillStyle = 'rgba(200,230,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(18, -22, 8, -36);
    ctx.quadraticCurveTo(2, -28, -2, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(14, -18, 5, -30);
    ctx.quadraticCurveTo(1, -22, -1, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(8, -14, 2, -22);
    ctx.quadraticCurveTo(0, -16, -1, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,210,240,0.6)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(2, -6); ctx.lineTo(12, -20);
    ctx.moveTo(1, -10); ctx.lineTo(10, -26);
    ctx.moveTo(0, -3); ctx.lineTo(16, -16);
    ctx.stroke();
    ctx.restore();

    // Glow effect around wings
    ctx.fillStyle = `rgba(170,221,255,${0.08 + Math.sin(Date.now() * 0.005) * 0.04})`;
    ctx.beginPath();
    ctx.arc(0, -10, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore(); // undo the facing flip

  // Fire breath attack effect (drawn in screen-relative space so it faces correctly)
  if (player.attacking && player.powerups.bananaCannon <= 0 && player.powerups.litterBox <= 0) {
    const fireProgress = player.attackTimer / 12;
    ctx.globalAlpha = alpha * fireProgress;
    const hasClaws = player.powerups.clawsOfSteel > 0;
    // Mouth position: fire originates from the leopard's mouth
    const mouthX = (f === 1 ? 48 : -5);
    const mouthY = 14;
    const fireLen = 55 * fireProgress; // matches ~55px attack range
    const spread = 12 * fireProgress; // cone widens as it extends
    const time = performance.now() * 0.01;

    // Draw fire cone using layered particles from tip back to mouth
    for (let i = 0; i < 18; i++) {
      const t = i / 18; // 0 = mouth, 1 = tip
      const px = mouthX + t * fireLen * f;
      const py = mouthY + (Math.sin(time + i * 1.7) * spread * t * 0.6);
      const size = 2 + t * 6 * fireProgress;
      // Flicker: randomize per-particle using a deterministic-ish seed from time+index
      const flicker = Math.sin(time * 3 + i * 2.3) * 0.5 + 0.5;

      // Color layers: white-hot core near mouth, yellow, orange, red at tips
      if (hasClaws) {
        // Claws of Steel: intense blue-white fire
        if (t < 0.25) {
          ctx.fillStyle = `rgba(220,240,255,${0.9 * fireProgress * (0.7 + flicker * 0.3)})`;
        } else if (t < 0.5) {
          ctx.fillStyle = `rgba(100,180,255,${0.8 * fireProgress * (0.6 + flicker * 0.4)})`;
        } else if (t < 0.75) {
          ctx.fillStyle = `rgba(50,100,255,${0.7 * fireProgress * (0.5 + flicker * 0.5)})`;
        } else {
          ctx.fillStyle = `rgba(30,60,200,${0.5 * fireProgress * (0.4 + flicker * 0.6)})`;
        }
      } else {
        // Normal fire: white core -> yellow -> orange -> red
        if (t < 0.2) {
          ctx.fillStyle = `rgba(255,255,220,${0.9 * fireProgress * (0.7 + flicker * 0.3)})`;
        } else if (t < 0.45) {
          ctx.fillStyle = `rgba(255,220,50,${0.85 * fireProgress * (0.6 + flicker * 0.4)})`;
        } else if (t < 0.7) {
          ctx.fillStyle = `rgba(255,140,20,${0.7 * fireProgress * (0.5 + flicker * 0.5)})`;
        } else {
          ctx.fillStyle = `rgba(220,50,10,${0.5 * fireProgress * (0.4 + flicker * 0.6)})`;
        }
      }

      ctx.beginPath();
      ctx.arc(px, py, size * (0.6 + flicker * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw a bright core stream along the center for intensity
    ctx.globalAlpha = alpha * fireProgress * 0.7;
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const px = mouthX + t * fireLen * 0.7 * f;
      const py = mouthY + Math.sin(time * 4 + i * 3.1) * spread * t * 0.2;
      const coreSize = 1.5 + (1 - t) * 3;
      ctx.fillStyle = hasClaws ? `rgba(200,230,255,${(1 - t) * fireProgress})` : `rgba(255,255,200,${(1 - t) * fireProgress})`;
      ctx.beginPath();
      ctx.arc(px, py, coreSize, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // === TELEGRAPH INDICATORS ===
  const time = Date.now() * 0.008;

  // 1) Skull telegraph: pulsing red dashed targeting line from boss to target
  if (boss.skullTelegraph > 0) {
    const progress = 1 - boss.skullTelegraph / 40;
    const pulse = 0.4 + Math.sin(time * 6) * 0.3;
    const targetPx = boss.skullTargetX - camera.x;
    const targetPy = boss.skullTargetY;
    const originX = px + boss.w / 2 + f * 20;
    const originY = py + boss.h * 0.3;

    ctx.save();
    ctx.strokeStyle = `rgba(255,50,50,${pulse * progress})`;
    ctx.lineWidth = 2 + progress * 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -Date.now() * 0.03;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(targetPx, targetPy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing crosshair at target
    const crossSize = 8 + progress * 6;
    ctx.strokeStyle = `rgba(255,80,80,${pulse * progress})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, crossSize, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(targetPx - crossSize - 4, targetPy);
    ctx.lineTo(targetPx + crossSize + 4, targetPy);
    ctx.moveTo(targetPx, targetPy - crossSize - 4);
    ctx.lineTo(targetPx, targetPy + crossSize + 4);
    ctx.stroke();

    // Warning exclamation
    if (boss.skullTelegraph % 8 < 5) {
      ctx.fillStyle = `rgba(255,100,100,${0.7 * progress})`;
      ctx.font = 'bold 11px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('!', targetPx, targetPy - crossSize - 8);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // 2) AOE telegraph: expanding warning circle on the ground
  if (boss.aoeTelegraph > 0) {
    const progress = 1 - boss.aoeTelegraph / 50;
    const pulse = 0.3 + Math.sin(time * 8) * 0.25;
    const maxR = isPhase2 ? 180 : 150;
    const currentR = maxR * progress * 0.7;
    const aoePx = boss.aoeTargetX - camera.x;
    const aoePy = GROUND_Y;

    ctx.save();
    // Outer warning ring, expanding
    ctx.strokeStyle = `rgba(255,60,60,${pulse * (0.5 + progress * 0.5)})`;
    ctx.lineWidth = 2 + progress * 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -Date.now() * 0.02;
    ctx.beginPath();
    ctx.ellipse(aoePx, aoePy, currentR, currentR * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner fill warning zone
    ctx.fillStyle = `rgba(255,50,50,${pulse * progress * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(aoePx, aoePy, currentR, currentR * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing center marker
    const centerPulse = 4 + Math.sin(time * 10) * 3;
    ctx.fillStyle = `rgba(255,100,50,${0.5 + progress * 0.4})`;
    ctx.beginPath();
    ctx.arc(aoePx, aoePy, centerPulse, 0, Math.PI * 2);
    ctx.fill();

    // Warning text
    if (boss.aoeTelegraph % 6 < 4) {
      ctx.fillStyle = `rgba(255,150,50,${0.6 + progress * 0.4})`;
      ctx.font = 'bold 12px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('SLAM!', aoePx, aoePy - currentR * 0.3 - 12);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // 3) Mortar telegraph: pulsing circles at each landing position
  if (boss.mortarTelegraph > 0 && boss.mortarTargets && boss.mortarTargets.length > 0) {
    const progress = 1 - boss.mortarTelegraph / 45;
    const pulse = 0.4 + Math.sin(time * 7) * 0.3;

    ctx.save();
    boss.mortarTargets.forEach((target, i) => {
      const tPx = target.x - camera.x;
      const tPy = target.y || GROUND_Y;
      const stagger = Math.sin(time * 8 + i * 1.5) * 0.2;
      const alpha = (pulse + stagger) * (0.4 + progress * 0.6);

      // Warning circle on the ground
      const radius = 14 + progress * 10;
      ctx.strokeStyle = `rgba(255,120,40,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tPx, tPy, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner fill
      ctx.fillStyle = `rgba(255,80,20,${alpha * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(tPx, tPy, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = `rgba(255,160,60,${alpha})`;
      ctx.beginPath();
      ctx.arc(tPx, tPy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Warning text above the center target
    if (boss.mortarTelegraph % 6 < 4) {
      const centerTarget = boss.mortarTargets[Math.floor(boss.mortarTargets.length / 2)];
      const ctPx = centerTarget.x - camera.x;
      ctx.fillStyle = `rgba(255,160,60,${0.5 + progress * 0.5})`;
      ctx.font = 'bold 11px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('INCOMING!', ctPx, (centerTarget.y || GROUND_Y) - 20);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
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

    // Aviator glasses reveal: show powerup name/icon above unbroken crate
    if (player.items.glasses) {
      const revealBob = Math.sin(Date.now() * 0.004) * 2;
      // Powerup name label
      ctx.fillStyle = c.powerupType.color;
      ctx.font = 'bold 9px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(c.powerupType.name, cx + c.w/2, cy - 12 + revealBob);
      // Small glasses icon indicator
      ctx.fillStyle = 'rgba(255,170,0,0.5)';
      ctx.fillRect(cx + c.w/2 - 5, cy - 20 + revealBob, 10, 3);
      ctx.textAlign = 'left';
    }
  });
}

export function drawArmorCrates() {
  state.armorCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    // Metallic crate body (distinct from powerup crates)
    ctx.fillStyle = '#6a6a7a'; ctx.fillRect(cx, cy, c.w, c.h);
    // Metal border
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    // Metal cross bands
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);
    // Corner rivets
    ctx.fillStyle = '#aaaa88';
    ctx.fillRect(cx + 4, cy + 4, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + 4, 3, 3);
    ctx.fillRect(cx + 4, cy + c.h - 7, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + c.h - 7, 3, 3);

    // Armor shield icon instead of "?"
    const icx = cx + c.w/2;
    const icy = cy + c.h/2;
    ctx.fillStyle = c.armorType.color;
    ctx.beginPath();
    ctx.moveTo(icx, icy - 7);
    ctx.lineTo(icx + 6, icy - 4);
    ctx.lineTo(icx + 5, icy + 4);
    ctx.lineTo(icx, icy + 7);
    ctx.lineTo(icx - 5, icy + 4);
    ctx.lineTo(icx - 6, icy - 4);
    ctx.closePath();
    ctx.fill();

    // Metallic glow
    const glowAlpha = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
    ctx.fillStyle = `rgba(180,180,210,${glowAlpha})`;
    ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();

    // HP pips
    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#ccccdd'; ctx.fillRect(cx + 4 + i * 8, cy - 6, 6, 3);
    }
  });
}

export function drawArmorPickups() {
  state.armorPickups.forEach(ap => {
    if (ap.equipped) return;
    const ax = ap.x - camera.x;
    const floatY = ap.y - 40 + Math.sin(ap.bobTimer) * 6;

    // Halo glow effect
    const glowPulse = 0.3 + Math.sin(ap.glowTimer * 2) * 0.15;
    const haloGrad = ctx.createRadialGradient(ax, floatY, 0, ax, floatY, 35);
    haloGrad.addColorStop(0, `rgba(255,255,200,${glowPulse})`);
    haloGrad.addColorStop(0.5, `rgba(255,255,150,${glowPulse * 0.5})`);
    haloGrad.addColorStop(1, 'rgba(255,255,100,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(ax - 40, floatY - 40, 80, 80);

    // Halo ring
    ctx.strokeStyle = `rgba(255,255,200,${0.4 + Math.sin(ap.glowTimer * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ax, floatY - 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw the armor item itself
    if (ap.armorType.id === 'leather') {
      // Leather armor piece floating
      ctx.fillStyle = '#b08040';
      // Chest piece shape
      ctx.fillRect(ax - 10, floatY - 8, 20, 16);
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(ax - 10, floatY - 8, 20, 3);
      ctx.fillRect(ax - 10, floatY + 5, 20, 3);
      // Shoulder pads
      ctx.fillStyle = '#c09050';
      ctx.fillRect(ax - 13, floatY - 6, 6, 8);
      ctx.fillRect(ax + 7, floatY - 6, 6, 8);
      // Strap detail
      ctx.fillStyle = '#6a4020';
      ctx.fillRect(ax - 1, floatY - 8, 2, 16);
      // Buckle
      ctx.fillStyle = '#ccaa44';
      ctx.fillRect(ax - 2, floatY + 2, 4, 3);
    } else if (ap.armorType.id === 'chainmail') {
      // Chainmail armor piece floating
      ctx.fillStyle = '#aaaacc';
      ctx.fillRect(ax - 10, floatY - 8, 20, 16);
      // Chain mesh pattern
      ctx.fillStyle = '#ccccdd';
      for (let iy = 0; iy < 5; iy++) {
        for (let ix = 0; ix < 7; ix++) {
          const ox = (iy % 2) * 1.5;
          ctx.fillRect(ax - 9 + ix * 3 + ox, floatY - 7 + iy * 3, 1.5, 1.5);
        }
      }
      // Silver shoulder guards
      ctx.fillStyle = '#bbbbdd';
      ctx.fillRect(ax - 13, floatY - 6, 6, 8);
      ctx.fillRect(ax + 7, floatY - 6, 6, 8);
      // Shine
      ctx.fillStyle = 'rgba(220,220,255,0.4)';
      ctx.fillRect(ax - 8, floatY - 6, 6, 2);
    }

    // "Press E to equip" text
    const textBob = Math.sin(Date.now() * 0.004) * 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to equip', ax, floatY + 26 + textBob);
    // Armor name
    ctx.fillStyle = ap.armorType.color;
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(ap.armorType.name, ax, floatY - 20);
    ctx.textAlign = 'left';
  });
}

export function drawGlassesCrates() {
  state.glassesCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    // Metallic crate body (similar to armor crates but with golden tint)
    ctx.fillStyle = '#7a7060'; ctx.fillRect(cx, cy, c.w, c.h);
    // Metal border
    ctx.fillStyle = '#5a5040';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    // Metal cross bands
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);
    // Corner rivets
    ctx.fillStyle = '#ccaa44';
    ctx.fillRect(cx + 4, cy + 4, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + 4, 3, 3);
    ctx.fillRect(cx + 4, cy + c.h - 7, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + c.h - 7, 3, 3);

    // Sunglasses icon instead of "?" - two dark lens shapes
    const icx = cx + c.w/2;
    const icy = cy + c.h/2;
    // Left lens
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(icx - 9, icy - 3, 7, 6);
    ctx.fillStyle = '#222222';
    ctx.fillRect(icx - 9, icy - 3, 7, 1);
    ctx.fillRect(icx - 9, icy + 2, 7, 1);
    ctx.fillRect(icx - 9, icy - 3, 1, 6);
    ctx.fillRect(icx - 3, icy - 3, 1, 6);
    // Right lens
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(icx + 2, icy - 3, 7, 6);
    ctx.fillStyle = '#222222';
    ctx.fillRect(icx + 2, icy - 3, 7, 1);
    ctx.fillRect(icx + 2, icy + 2, 7, 1);
    ctx.fillRect(icx + 2, icy - 3, 1, 6);
    ctx.fillRect(icx + 8, icy - 3, 1, 6);
    // Bridge
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(icx - 2, icy - 1, 4, 2);
    // Temple arms
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(icx - 11, icy - 1, 3, 2);
    ctx.fillRect(icx + 9, icy - 1, 3, 2);

    // Golden glow
    const glowAlpha = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
    ctx.fillStyle = `rgba(255,170,0,${glowAlpha})`;
    ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();

    // HP pips
    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#ccccdd'; ctx.fillRect(cx + 4 + i * 8, cy - 6, 6, 3);
    }
  });
}

export function drawGlassesPickups() {
  state.glassesPickups.forEach(gp => {
    if (gp.equipped) return;
    const gx = gp.x - camera.x;
    const floatY = gp.y - 40 + Math.sin(gp.bobTimer) * 6;

    // Halo glow effect
    const glowPulse = 0.3 + Math.sin(gp.glowTimer * 2) * 0.15;
    const haloGrad = ctx.createRadialGradient(gx, floatY, 0, gx, floatY, 35);
    haloGrad.addColorStop(0, `rgba(255,220,100,${glowPulse})`);
    haloGrad.addColorStop(0.5, `rgba(255,200,50,${glowPulse * 0.5})`);
    haloGrad.addColorStop(1, 'rgba(255,170,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(gx - 40, floatY - 40, 80, 80);

    // Halo ring
    ctx.strokeStyle = `rgba(255,220,100,${0.4 + Math.sin(gp.glowTimer * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(gx, floatY - 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw aviator glasses item floating
    // Left lens
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(gx - 14, floatY - 6, 12, 9);
    ctx.fillStyle = '#222222';
    ctx.fillRect(gx - 14, floatY - 6, 12, 1);
    ctx.fillRect(gx - 14, floatY + 2, 12, 1);
    ctx.fillRect(gx - 14, floatY - 6, 1, 9);
    ctx.fillRect(gx - 3, floatY - 6, 1, 9);
    // Right lens
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(gx + 2, floatY - 6, 12, 9);
    ctx.fillStyle = '#222222';
    ctx.fillRect(gx + 2, floatY - 6, 12, 1);
    ctx.fillRect(gx + 2, floatY + 2, 12, 1);
    ctx.fillRect(gx + 2, floatY - 6, 1, 9);
    ctx.fillRect(gx + 13, floatY - 6, 1, 9);
    // Bridge
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(gx - 2, floatY - 3, 4, 3);
    // Temple arms
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(gx - 18, floatY - 3, 5, 2);
    ctx.fillRect(gx + 14, floatY - 3, 5, 2);
    // Lens glint
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(gx - 12, floatY - 5, 3, 1);
    ctx.fillRect(gx + 4, floatY - 5, 3, 1);

    // "Press E to equip" text
    const textBob = Math.sin(Date.now() * 0.004) * 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to equip', gx, floatY + 26 + textBob);
    // Item name
    ctx.fillStyle = GLASSES_TYPE.color;
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(GLASSES_TYPE.name, gx, floatY - 20);
    ctx.textAlign = 'left';
  });
}

export function drawSneakersCrates() {
  state.sneakersCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    // Metallic crate body (brown-tinted for cowboy boots)
    ctx.fillStyle = '#6a5a50'; ctx.fillRect(cx, cy, c.w, c.h);
    // Metal border
    ctx.fillStyle = '#4a3a30';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    // Metal cross bands
    ctx.fillStyle = '#8a7060';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);
    // Corner rivets
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(cx + 4, cy + 4, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + 4, 3, 3);
    ctx.fillRect(cx + 4, cy + c.h - 7, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + c.h - 7, 3, 3);

    // Cowboy boot icon - boot shape
    const icx = cx + c.w/2;
    const icy = cy + c.h/2;
    ctx.fillStyle = SNEAKERS_TYPE.color; // #8B4513
    // Boot shaft (tall part)
    ctx.fillRect(icx - 4, icy - 6, 5, 8);
    // Boot foot
    ctx.fillRect(icx - 4, icy + 2, 10, 4);
    // Pointed toe
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(icx + 6, icy + 3, 3, 2);
    // Boot heel
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(icx - 5, icy + 6, 3, 3);
    // Sole
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(icx - 5, icy + 6, 12, 2);
    // Leather stitch detail
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(icx - 2, icy - 3, 1, 1);
    ctx.fillRect(icx - 2, icy - 1, 1, 1);

    // Brown glow
    const glowAlpha = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
    ctx.fillStyle = `rgba(139,69,19,${glowAlpha})`;
    ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();

    // HP pips
    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#ccccdd'; ctx.fillRect(cx + 4 + i * 8, cy - 6, 6, 3);
    }
  });
}

export function drawSneakersPickups() {
  state.sneakersPickups.forEach(sp => {
    if (sp.equipped) return;
    const sx = sp.x - camera.x;
    const floatY = sp.y - 40 + Math.sin(sp.bobTimer) * 6;

    // Halo glow effect (brown tones for cowboy boots)
    const glowPulse = 0.3 + Math.sin(sp.glowTimer * 2) * 0.15;
    const haloGrad = ctx.createRadialGradient(sx, floatY, 0, sx, floatY, 35);
    haloGrad.addColorStop(0, `rgba(139,69,19,${glowPulse})`);
    haloGrad.addColorStop(0.5, `rgba(160,82,45,${glowPulse * 0.5})`);
    haloGrad.addColorStop(1, 'rgba(139,69,19,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(sx - 40, floatY - 40, 80, 80);

    // Halo ring
    ctx.strokeStyle = `rgba(210,105,30,${0.4 + Math.sin(sp.glowTimer * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, floatY - 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw cowboy boot floating
    // Left boot
    const lx = sx - 14, ly = floatY - 6;
    // Boot shaft (tall leather part)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(lx, ly - 6, 6, 10);
    // Boot foot
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(lx, ly + 4, 12, 5);
    // Pointed toe
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(lx + 10, ly + 5, 3, 3);
    // Boot heel
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(lx - 1, ly + 9, 3, 3);
    // Sole
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(lx - 1, ly + 9, 14, 2);
    // Shaft top trim
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(lx, ly - 6, 6, 2);
    // Leather stitch details
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(lx + 2, ly - 2, 1, 1);
    ctx.fillRect(lx + 2, ly + 0, 1, 1);

    // Right boot
    const rx = sx + 2, ry = floatY - 6;
    // Boot shaft
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(rx + 6, ry - 6, 6, 10);
    // Boot foot
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(rx, ry + 4, 12, 5);
    // Pointed toe (facing left for right boot)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(rx - 1, ry + 5, 3, 3);
    // Boot heel
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(rx + 10, ry + 9, 3, 3);
    // Sole
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(rx - 1, ry + 9, 14, 2);
    // Shaft top trim
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(rx + 6, ry - 6, 6, 2);
    // Leather stitch details
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(rx + 9, ry - 2, 1, 1);
    ctx.fillRect(rx + 9, ry + 0, 1, 1);

    // "Press E to equip" text
    const textBob = Math.sin(Date.now() * 0.004) * 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to equip', sx, floatY + 26 + textBob);
    // Item name
    ctx.fillStyle = SNEAKERS_TYPE.color;
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(SNEAKERS_TYPE.name, sx, floatY - 20);
    ctx.textAlign = 'left';
  });
}

export function drawCleatsCrates() {
  state.cleatsCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    // Metallic crate body (green-tinted for soccer cleats)
    ctx.fillStyle = '#3a6a40'; ctx.fillRect(cx, cy, c.w, c.h);
    // Metal border
    ctx.fillStyle = '#2a4a30';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    // Metal cross bands
    ctx.fillStyle = '#5a8a60';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);
    // Corner rivets
    ctx.fillStyle = '#00cc44';
    ctx.fillRect(cx + 4, cy + 4, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + 4, 3, 3);
    ctx.fillRect(cx + 4, cy + c.h - 7, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + c.h - 7, 3, 3);

    // Soccer cleat icon
    const icx = cx + c.w/2;
    const icy = cy + c.h/2;
    ctx.fillStyle = CLEATS_TYPE.color; // #00cc44
    // Cleat body (low-cut shoe shape)
    ctx.fillRect(icx - 5, icy - 3, 10, 6);
    // Toe area
    ctx.fillStyle = '#00aa33';
    ctx.fillRect(icx + 5, icy - 1, 3, 4);
    // Sole with studs
    ctx.fillStyle = '#004d1a';
    ctx.fillRect(icx - 5, icy + 3, 13, 2);
    // Studs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(icx - 4, icy + 5, 2, 2);
    ctx.fillRect(icx, icy + 5, 2, 2);
    ctx.fillRect(icx + 4, icy + 5, 2, 2);
    // Lace detail
    ctx.fillStyle = '#88ffaa';
    ctx.fillRect(icx - 2, icy - 3, 1, 1);
    ctx.fillRect(icx, icy - 3, 1, 1);

    // Green glow
    const glowAlpha = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
    ctx.fillStyle = `rgba(0,204,68,${glowAlpha})`;
    ctx.beginPath(); ctx.arc(icx, icy, 20, 0, Math.PI * 2); ctx.fill();

    // HP pips
    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#ccccdd'; ctx.fillRect(cx + 4 + i * 8, cy - 6, 6, 3);
    }
  });
}

export function drawCleatsPickups() {
  state.cleatsPickups.forEach(cp => {
    if (cp.equipped) return;
    const sx = cp.x - camera.x;
    const floatY = cp.y - 40 + Math.sin(cp.bobTimer) * 6;

    // Halo glow effect (green tones for soccer cleats)
    const glowPulse = 0.3 + Math.sin(cp.glowTimer * 2) * 0.15;
    const haloGrad = ctx.createRadialGradient(sx, floatY, 0, sx, floatY, 35);
    haloGrad.addColorStop(0, `rgba(0,204,68,${glowPulse})`);
    haloGrad.addColorStop(0.5, `rgba(0,170,51,${glowPulse * 0.5})`);
    haloGrad.addColorStop(1, 'rgba(0,204,68,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(sx - 40, floatY - 40, 80, 80);

    // Halo ring
    ctx.strokeStyle = `rgba(0,255,85,${0.4 + Math.sin(cp.glowTimer * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, floatY - 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw left soccer cleat floating
    const lx = sx - 14, ly = floatY - 6;
    // Cleat body (low-cut)
    ctx.fillStyle = '#00cc44';
    ctx.fillRect(lx, ly, 12, 7);
    // Toe
    ctx.fillStyle = '#00aa33';
    ctx.fillRect(lx + 10, ly + 1, 4, 5);
    // Collar opening
    ctx.fillStyle = '#009933';
    ctx.fillRect(lx, ly - 2, 6, 3);
    // Sole
    ctx.fillStyle = '#004d1a';
    ctx.fillRect(lx - 1, ly + 7, 16, 2);
    // Studs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx, ly + 9, 2, 2);
    ctx.fillRect(lx + 4, ly + 9, 2, 2);
    ctx.fillRect(lx + 8, ly + 9, 2, 2);
    ctx.fillRect(lx + 12, ly + 9, 2, 2);
    // Lace detail
    ctx.fillStyle = '#88ffaa';
    ctx.fillRect(lx + 2, ly + 1, 1, 1);
    ctx.fillRect(lx + 4, ly, 1, 1);
    ctx.fillRect(lx + 6, ly + 1, 1, 1);

    // Draw right soccer cleat floating
    const rx = sx + 2, ry = floatY - 6;
    // Cleat body (low-cut, mirrored)
    ctx.fillStyle = '#00cc44';
    ctx.fillRect(rx, ry, 12, 7);
    // Toe (facing left)
    ctx.fillStyle = '#00aa33';
    ctx.fillRect(rx - 2, ry + 1, 4, 5);
    // Collar opening
    ctx.fillStyle = '#009933';
    ctx.fillRect(rx + 6, ry - 2, 6, 3);
    // Sole
    ctx.fillStyle = '#004d1a';
    ctx.fillRect(rx - 3, ry + 7, 16, 2);
    // Studs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rx - 1, ry + 9, 2, 2);
    ctx.fillRect(rx + 3, ry + 9, 2, 2);
    ctx.fillRect(rx + 7, ry + 9, 2, 2);
    ctx.fillRect(rx + 11, ry + 9, 2, 2);
    // Lace detail
    ctx.fillStyle = '#88ffaa';
    ctx.fillRect(rx + 5, ry + 1, 1, 1);
    ctx.fillRect(rx + 7, ry, 1, 1);
    ctx.fillRect(rx + 9, ry + 1, 1, 1);

    // "Press E to equip" text
    const textBob = Math.sin(Date.now() * 0.004) * 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to equip', sx, floatY + 26 + textBob);
    // Item name
    ctx.fillStyle = CLEATS_TYPE.color;
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(CLEATS_TYPE.name, sx, floatY - 20);
    ctx.textAlign = 'left';
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
      // Spinning banana (3x size)
      const spin = Date.now() * 0.015;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(spin);
      // Banana body (curved shape) - 3x original
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0.3, Math.PI - 0.3);
      ctx.fill();
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.arc(0, -3, 18, 0.5, Math.PI - 0.5);
      ctx.fill();
      // Brown spots for realism
      ctx.fillStyle = '#cc9900';
      ctx.fillRect(-6, -4, 3, 3);
      ctx.fillRect(4, -2, 2, 2);
      ctx.fillRect(-2, -6, 2, 2);
      // Tips
      ctx.fillStyle = '#886600';
      ctx.fillRect(-21, -6, 9, 6);
      ctx.fillRect(15, -6, 9, 6);
      // Stem nub
      ctx.fillStyle = '#4a3300';
      ctx.fillRect(-2, 6, 4, 5);
      ctx.restore();
      // Trail
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(255,221,0,${0.2 - i * 0.04})`;
        ctx.beginPath();
        ctx.arc(px - proj.vx * (i + 1) * 0.5, py - proj.vy * (i + 1) * 0.5, 15 - i * 3, 0, Math.PI * 2);
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
    } else if (proj.type === 'bossSkull') {
      // Green skull projectile
      ctx.save();
      ctx.translate(px, py);
      // Glow
      const glowAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.15;
      ctx.fillStyle = `rgba(68,255,68,${glowAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      // Skull cranium
      ctx.fillStyle = '#44ff44';
      ctx.beginPath();
      ctx.arc(0, -2, 9, 0, Math.PI * 2);
      ctx.fill();
      // Jaw
      ctx.fillStyle = '#33cc33';
      ctx.fillRect(-6, 4, 12, 5);
      // Eye sockets
      ctx.fillStyle = '#003300';
      ctx.beginPath();
      ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Nose hole
      ctx.fillRect(-1, 1, 2, 2);
      // Teeth
      ctx.fillStyle = '#88ff88';
      for (let t = -4; t <= 3; t += 2) {
        ctx.fillRect(t, 4, 1.5, 2);
      }
      ctx.restore();
      // Trail
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(68,255,68,${0.2 - i * 0.045})`;
        ctx.beginPath();
        ctx.arc(px - proj.vx * (i + 1) * 0.6, py - proj.vy * (i + 1) * 0.6, 6 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (proj.type === 'bossAOE') {
      // Expanding shockwave ring
      const alpha = Math.max(0, proj.life / 30);
      const r = proj.radius;
      // Outer ring
      ctx.strokeStyle = `rgba(100,255,100,${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
      // Inner glow ring
      ctx.strokeStyle = `rgba(200,255,200,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      // Fading fill
      ctx.fillStyle = `rgba(68,255,68,${alpha * 0.1})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      // Ground crack lines radiating out
      ctx.strokeStyle = `rgba(150,255,150,${alpha * 0.4})`;
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 10, py + Math.sin(a) * 5);
        ctx.lineTo(px + Math.cos(a) * r * 0.9, py + Math.sin(a) * r * 0.4);
        ctx.stroke();
      }
    } else if (proj.type === 'bossMortar') {
      // Small green glowing orb
      const pulse = 0.7 + Math.sin(Date.now() * 0.02 + proj.x) * 0.3;
      // Outer glow
      ctx.fillStyle = `rgba(68,255,68,${0.25 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      // Core orb
      ctx.fillStyle = `rgba(100,255,100,${0.9 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      // Bright center
      ctx.fillStyle = '#ccffcc';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(68,255,68,${0.15 - i * 0.04})`;
        ctx.beginPath();
        ctx.arc(px - proj.vx * (i + 1) * 0.5, py - proj.vy * (i + 1) * 0.5, 4 - i, 0, Math.PI * 2);
        ctx.fill();
      }
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
    ctx.fillText(`JUMPY BOOTS [${player.powerups.jumpyBoots} left]`, 15, puY); puY += 14;
  }
  if (player.powerups.clawsOfSteel > 0) {
    ctx.fillStyle = '#ff8844'; ctx.font = '11px "Courier New"';
    ctx.fillText(`CLAWS OF STEEL [${player.powerups.clawsOfSteel} left]`, 15, puY); puY += 14;
  }
  if (player.powerups.superFangs > 0) {
    ctx.fillStyle = '#ff44ff'; ctx.font = '11px "Courier New"';
    ctx.fillText(`SUPER FANGS [${player.powerups.superFangs} left]`, 15, puY); puY += 14;
  }
  if (player.powerups.raceCar > 0) {
    ctx.fillStyle = '#cc2222'; ctx.font = '11px "Courier New"';
    ctx.fillText(`RACE CAR [${Math.ceil(player.powerups.raceCar/60)}s]`, 15, puY); puY += 14;
  }
  if (player.powerups.bananaCannon > 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = '11px "Courier New"';
    ctx.fillText(`BANANA CANNON [${player.powerups.bananaCannon} left]`, 15, puY); puY += 14;
  }
  if (player.powerups.litterBox > 0) {
    ctx.fillStyle = '#aa8844'; ctx.font = '11px "Courier New"';
    ctx.fillText(`LITTER BOX [${player.powerups.litterBox} left]`, 15, puY); puY += 14;
  }
  if (player.powerups.wings > 0) {
    ctx.fillStyle = '#aaddff'; ctx.font = '11px "Courier New"';
    ctx.fillText(`ANGEL WINGS [${Math.ceil(player.powerups.wings/60)}s]`, 15, puY); puY += 14;
  }

  // Armor display (permanent item)
  if (player.items.armor) {
    const armorInfo = ARMOR_TYPES.find(a => a.id === player.items.armor);
    if (armorInfo) {
      ctx.fillStyle = armorInfo.color; ctx.font = 'bold 11px "Courier New"';
      ctx.fillText(`${armorInfo.name} [EQUIPPED]`, 15, puY); puY += 14;
    }
  }

  // Glasses display (permanent item)
  if (player.items.glasses) {
    ctx.fillStyle = GLASSES_TYPE.color; ctx.font = 'bold 11px "Courier New"';
    ctx.fillText(`${GLASSES_TYPE.name} [EQUIPPED]`, 15, puY); puY += 14;
  }

  // Cowboy Boots display (permanent unlock)
  if (player.items.cowboyBoots) {
    ctx.fillStyle = '#8B4513'; ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('COWBOY BOOTS [EQUIPPED]', 15, puY); puY += 14;
  }

  // Soccer Cleats display (permanent unlock)
  if (player.items.soccerCleats) {
    ctx.fillStyle = CLEATS_TYPE.color; ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('SOCCER CLEATS [EQUIPPED]', 15, puY); puY += 14;
  }

  // War Horse display (permanent unlock)
  if (player.items.horse) {
    ctx.fillStyle = HORSE_TYPE.color; ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('WAR HORSE [ALLIED]', 15, puY); puY += 14;
  }

  // Allied animals display
  const aliveAllies = state.allies.filter(a => a.alive && a.type !== 'horse');
  if (aliveAllies.length > 0) {
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 11px "Courier New"';
    const allyNames = aliveAllies.map(a => a.type.toUpperCase()).join(', ');
    ctx.fillText(`ALLIES: ${allyNames}`, 15, puY); puY += 14;
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

function _drawTitleLeaderboard(cx, startY) {
  const lb = state.leaderboard;
  const maxEntries = Math.min(lb.length, 5);
  if (maxEntries === 0) return;

  // Panel background with subtle border
  const panelW = 420, panelH = 50 + maxEntries * 24;
  const panelX = cx - panelW / 2, panelY = startY - 20;
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(255, 204, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
  ctx.fillText('TOP SCORES', cx, startY);

  // Table header
  const tableX = cx - 190;
  let rowY = startY + 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#666666'; ctx.font = 'bold 11px "Courier New"';
  ctx.fillText('#', tableX, rowY);
  ctx.fillText('NAME', tableX + 28, rowY);
  ctx.fillText('ANIMAL', tableX + 150, rowY);
  ctx.textAlign = 'right';
  ctx.fillText('SCORE', tableX + 380, rowY);
  rowY += 5;

  // Separator
  ctx.fillStyle = '#333333';
  ctx.fillRect(tableX, rowY, 380, 1);
  rowY += 13;

  // Rows
  for (let i = 0; i < maxEntries; i++) {
    const entry = lb[i];
    const isTop3 = i < 3;
    const colors = ['#ffcc00', '#cccccc', '#cc8844'];
    ctx.fillStyle = isTop3 ? colors[i] : '#888888';
    ctx.font = isTop3 ? 'bold 13px "Courier New"' : '13px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, tableX, rowY);
    ctx.fillText(entry.name || 'Player', tableX + 28, rowY);
    ctx.fillText((entry.animal || 'leopard').toUpperCase(), tableX + 150, rowY);
    ctx.textAlign = 'right';
    ctx.fillText(`${entry.score}`, tableX + 380, rowY);
    rowY += 24;
  }
  ctx.textAlign = 'center';
}

export function drawTitleScreen() {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 30; i++) {
    const x = (Date.now() * 0.02 * (i * 0.3 + 0.5) + i * 100) % canvas.width;
    const y = (i * 47 + 10) % canvas.height;
    ctx.fillStyle = `rgba(0,255,0,${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.1})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const hasScores = state.leaderboard.length > 0;
  // When leaderboard has entries, shift title/controls to the left to make room
  const titleCx = hasScores ? 270 : canvas.width / 2;

  ctx.fillStyle = '#e8a828'; ctx.font = 'bold 48px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('ANIMALS', titleCx, 150);
  ctx.fillStyle = '#ff4444'; ctx.fillText('vs', titleCx, 200);
  ctx.fillStyle = '#5a7a5a'; ctx.fillText('ZOMBIES', titleCx, 250);

  const dx = titleCx, dy = 295;
  ctx.fillStyle = '#00ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 12); ctx.lineTo(dx + 10, dy); ctx.lineTo(dx, dy + 12); ctx.lineTo(dx - 10, dy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#aaaaaa'; ctx.font = '16px "Courier New"';
  ctx.fillText('Arrow Keys - Move & Jump', titleCx, 345);
  ctx.fillText('Space - Attack | E - Equip Items', titleCx, 370);
  ctx.fillText('Break crates for power-ups & armor!', titleCx, 400);
  ctx.fillText('3 Lives - Defeat zombies across 3 levels', titleCx, 430);
  ctx.fillText('Capture the Leopard Diamond!', titleCx, 455);

  // Draw leaderboard on the right side when scores exist
  if (hasScores) {
    _drawTitleLeaderboard(700, 140);
  }

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

function _drawNameEntry(cx, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px "Courier New"';
  ctx.fillText('ENTER YOUR NAME:', cx, y);

  // Name entry box
  const boxW = 240, boxH = 36;
  const boxX = cx - boxW / 2, boxY = y + 10;
  ctx.fillStyle = '#111122';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Name text with blinking cursor
  const nameText = state.nameEntry;
  const cursor = Math.sin(Date.now() * 0.006) > 0 ? '_' : '';
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px "Courier New"';
  ctx.fillText(nameText + cursor, cx, boxY + 26);

  ctx.fillStyle = '#666666'; ctx.font = '13px "Courier New"';
  ctx.fillText('Type your name and press ENTER', cx, boxY + 55);
}

function _drawLeaderboard(cx, startY) {
  const lb = state.leaderboard;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px "Courier New"';
  ctx.fillText('LEADERBOARD', cx, startY);

  if (lb.length === 0) {
    ctx.fillStyle = '#666666'; ctx.font = '14px "Courier New"';
    ctx.fillText('No scores yet!', cx, startY + 30);
    return;
  }

  // Table header
  const tableX = cx - 220;
  let rowY = startY + 22;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#888888'; ctx.font = 'bold 12px "Courier New"';
  ctx.fillText('#', tableX, rowY);
  ctx.fillText('NAME', tableX + 30, rowY);
  ctx.fillText('ANIMAL', tableX + 160, rowY);
  ctx.fillText('LVL', tableX + 290, rowY);
  ctx.textAlign = 'right';
  ctx.fillText('SCORE', tableX + 440, rowY);
  rowY += 6;

  // Separator line
  ctx.fillStyle = '#333333';
  ctx.fillRect(tableX, rowY, 440, 1);
  rowY += 12;

  for (let i = 0; i < lb.length; i++) {
    const entry = lb[i];
    const isTop3 = i < 3;
    const colors = ['#ffcc00', '#cccccc', '#cc8844'];
    ctx.fillStyle = isTop3 ? colors[i] : '#aaaaaa';
    ctx.font = isTop3 ? 'bold 13px "Courier New"' : '13px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, tableX, rowY);
    ctx.fillText(entry.name, tableX + 30, rowY);
    ctx.fillText((entry.animal || 'leopard').toUpperCase(), tableX + 160, rowY);
    ctx.fillText(`${entry.level || '?'}`, tableX + 290, rowY);
    ctx.textAlign = 'right';
    ctx.fillText(`${entry.score}`, tableX + 440, rowY);
    rowY += 22;
  }
  ctx.textAlign = 'center';
}

export function drawGameWin() {
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 40; i++) {
    const x = (Date.now() * 0.03 * (i * 0.2 + 0.3) + i * 80) % canvas.width;
    const y = (Date.now() * 0.02 * (i * 0.1 + 0.2) + i * 60) % canvas.height;
    const colors = ['#ff0000', '#ffcc00', '#00ff00', '#00ffff', '#ff00ff'];
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x, y, 3, 3);
  }
  const dx = canvas.width / 2, dy = 70;
  const glow = Math.sin(Date.now() * 0.003);
  const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 40);
  glowGrad.addColorStop(0, 'rgba(0,255,255,0.3)'); glowGrad.addColorStop(1, 'rgba(0,255,255,0)');
  ctx.fillStyle = glowGrad; ctx.fillRect(dx - 40, dy - 40, 80, 80);
  ctx.fillStyle = '#00ffff'; ctx.beginPath();
  ctx.moveTo(dx, dy - 18 + glow * 2); ctx.lineTo(dx + 14, dy);
  ctx.lineTo(dx, dy + 18 - glow * 2); ctx.lineTo(dx - 14, dy);
  ctx.closePath(); ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 36px "Courier New"';
  ctx.fillText('VICTORY!', canvas.width / 2, 130);
  ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New"';
  ctx.fillText('The Leopard Diamond is yours!', canvas.width / 2, 158);
  ctx.fillStyle = '#e8a828'; ctx.font = 'bold 22px "Courier New"';
  ctx.fillText(`FINAL SCORE: ${player.score}`, canvas.width / 2, 192);

  if (state.nameEntryActive) {
    _drawNameEntry(canvas.width / 2, 230);
  } else {
    _drawLeaderboard(canvas.width / 2, 230);
    if (Math.sin(Date.now() * 0.005) > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText('PRESS ENTER TO PLAY AGAIN', canvas.width / 2, 510);
    }
  }
  ctx.textAlign = 'left';
}

export function drawGameOver() {
  ctx.fillStyle = 'rgba(80,0,0,0.85)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 42px "Courier New"';
  ctx.fillText('GAME OVER', canvas.width / 2, 60);
  ctx.fillStyle = '#aaaaaa'; ctx.font = '16px "Courier New"';
  ctx.fillText(`Score: ${player.score}  -  Reached Level ${state.currentLevel}`, canvas.width / 2, 95);

  if (state.nameEntryActive) {
    _drawNameEntry(canvas.width / 2, 135);
  } else {
    _drawLeaderboard(canvas.width / 2, 135);
    if (Math.sin(Date.now() * 0.005) > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText('PRESS ENTER TO RETRY', canvas.width / 2, 510);
    }
  }
  ctx.textAlign = 'left';
}

export function drawSelectScreen() {
  const W = canvas.width, H = canvas.height;
  // Background
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
  // Animated green particles (same style as title)
  for (let i = 0; i < 30; i++) {
    const px = (Date.now() * 0.02 * (i * 0.3 + 0.5) + i * 100) % W;
    const py = (i * 47 + 10) % H;
    ctx.fillStyle = `rgba(0,255,0,${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.1})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 36px "Courier New"';
  ctx.fillText('CHOOSE YOUR ANIMAL', W / 2, 55);

  // Animal cards
  const cardW = 170, cardH = 260;
  const gap = 20;
  const totalW = ANIMAL_TYPES.length * cardW + (ANIMAL_TYPES.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const cardY = 80;
  const sel = state.selectedAnimal;
  const t = Date.now() * 0.003;

  for (let i = 0; i < ANIMAL_TYPES.length; i++) {
    const a = ANIMAL_TYPES[i];
    const cx = startX + i * (cardW + gap);
    const isSelected = i === sel;

    // Card background
    if (isSelected) {
      // Glowing border for selected
      ctx.fillStyle = a.color;
      ctx.fillRect(cx - 3, cardY - 3, cardW + 6, cardH + 6);
    }
    ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
    ctx.fillRect(cx, cardY, cardW, cardH);

    // Animal portrait area
    const portraitX = cx + 15;
    const portraitY = cardY + 10;
    const portraitW = cardW - 30;
    const portraitH = 120;

    // Portrait background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(portraitX, portraitY, portraitW, portraitH);

    // Draw animal pixel art
    _drawAnimalPortrait(a.id, portraitX, portraitY, portraitW, portraitH, a.color, isSelected ? t : 0);

    // Animal name
    ctx.fillStyle = a.color; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(a.name, cx + cardW / 2, cardY + 148);

    // Description
    ctx.fillStyle = '#aaaaaa'; ctx.font = '11px "Courier New"';
    ctx.fillText(a.desc, cx + cardW / 2, cardY + 168);

    // Stat bars
    const barX = cx + 15;
    const barW = cardW - 30;
    const stats = [
      { label: 'SPD', value: a.speed, max: 1.5, color: '#44aaff' },
      { label: 'DMG', value: a.damage, max: 1.5, color: '#ff4444' },
      { label: 'HP',  value: a.hp, max: 150, color: '#44ff44' },
    ];
    for (let s = 0; s < stats.length; s++) {
      const sy = cardY + 185 + s * 26;
      ctx.fillStyle = '#888888'; ctx.font = '11px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText(stats[s].label, barX, sy);
      // Bar background
      ctx.fillStyle = '#222222';
      ctx.fillRect(barX + 32, sy - 10, barW - 32, 12);
      // Bar fill
      const fill = (stats[s].value / stats[s].max) * (barW - 32);
      ctx.fillStyle = stats[s].color;
      ctx.fillRect(barX + 32, sy - 10, fill, 12);
    }

    // Selection arrows
    if (isSelected) {
      const arrowBob = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#ffcc00';
      // Top arrow pointing down
      ctx.beginPath();
      ctx.moveTo(cx + cardW / 2, cardY - 10 + arrowBob);
      ctx.lineTo(cx + cardW / 2 - 10, cardY - 22 + arrowBob);
      ctx.lineTo(cx + cardW / 2 + 10, cardY - 22 + arrowBob);
      ctx.closePath(); ctx.fill();
    }
  }

  // Navigation hints
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666666'; ctx.font = '14px "Courier New"';
  ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 30);

  // Enter prompt (blinking)
  if (Math.sin(Date.now() * 0.005) > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px "Courier New"';
    ctx.fillText('PRESS ENTER TO START', W / 2, cardY + cardH + 60);
  }

  ctx.textAlign = 'left';
}

// === WALKING ANIMAL DRAWING FUNCTIONS ===
// Each animal has its own detailed pixel art on all fours, matching the style of the original leopard

function _drawWalkingAnimal(ctx, animal, px, py, by, overrideVx) {
  const vx = overrideVx !== undefined ? overrideVx : player.vx;
  const runSpeed = Math.abs(vx) > 0.5;
  const legTime = Date.now() * (runSpeed ? 0.012 : 0.004);
  const legSwing = runSpeed ? Math.sin(legTime) * 7 : 0;

  if (animal === 'leopard') {
    _drawWalkingLeopard(ctx, px, py, by, legSwing);
  } else if (animal === 'redPanda') {
    _drawWalkingRedPanda(ctx, px, py, by, legSwing);
  } else if (animal === 'lion') {
    _drawWalkingLion(ctx, px, py, by, legSwing);
  } else if (animal === 'gator') {
    _drawWalkingGator(ctx, px, py, by, legSwing);
  } else {
    _drawWalkingLeopard(ctx, px, py, by, legSwing); // fallback
  }
}

function _drawWalkingLeopard(ctx, px, py, by, legSwing) {
  // Tail (drawn first, behind body)
  const tailWag = Math.sin(Date.now() * 0.006) * 5;
  const tailCurl = Math.sin(Date.now() * 0.004) * 3;
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 2, py + 17 + by + tailWag, 6, 4);
  ctx.fillStyle = '#d09020';
  ctx.fillRect(px - 3, py + 14 + by + tailWag * 1.2, 6, 4);
  ctx.fillRect(px - 7, py + 11 + by + tailWag * 1.4 + tailCurl, 5, 3);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(px - 10, py + 9 + by + tailWag * 1.5 + tailCurl, 4, 3);

  // Back legs (behind body)
  const backLeg1 = legSwing;
  const backLeg2 = -legSwing;
  ctx.fillStyle = '#c89020';
  ctx.fillRect(px + 9, py + 32 + by, 5, 12 + backLeg1);
  ctx.fillStyle = '#b88018';
  ctx.fillRect(px + 8, py + 43 + by + backLeg1, 6, 3);
  ctx.fillStyle = '#d09820';
  ctx.fillRect(px + 15, py + 32 + by, 5, 12 + backLeg2);
  ctx.fillStyle = '#c08818';
  ctx.fillRect(px + 14, py + 43 + by + backLeg2, 6, 3);

  // Body (horizontal, muscular torso)
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 6, py + 19 + by, 32, 15);
  ctx.fillRect(px + 24, py + 17 + by, 12, 4);
  ctx.fillStyle = '#f0c858';
  ctx.fillRect(px + 10, py + 30 + by, 24, 4);

  // Leopard rosette spots on body
  ctx.fillStyle = '#c08018';
  ctx.fillRect(px + 10, py + 21 + by, 3, 3);
  ctx.fillRect(px + 15, py + 24 + by, 3, 2);
  ctx.fillRect(px + 21, py + 21 + by, 3, 3);
  ctx.fillRect(px + 26, py + 24 + by, 2, 2);
  ctx.fillRect(px + 31, py + 21 + by, 2, 3);
  ctx.fillRect(px + 18, py + 28 + by, 2, 2);
  ctx.fillRect(px + 24, py + 28 + by, 2, 2);
  ctx.fillStyle = '#a06810';
  ctx.fillRect(px + 9, py + 20 + by, 1, 5);
  ctx.fillRect(px + 13, py + 20 + by, 1, 5);
  ctx.fillRect(px + 20, py + 20 + by, 1, 5);
  ctx.fillRect(px + 24, py + 20 + by, 1, 5);

  // Front legs
  const frontLeg1 = -legSwing;
  const frontLeg2 = legSwing;
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 28, py + 32 + by, 5, 12 + frontLeg1);
  ctx.fillStyle = '#d09020';
  ctx.fillRect(px + 27, py + 43 + by + frontLeg1, 6, 3);
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 34, py + 32 + by, 5, 12 + frontLeg2);
  ctx.fillStyle = '#d09020';
  ctx.fillRect(px + 33, py + 43 + by + frontLeg2, 6, 3);

  // Neck
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 34, py + 14 + by, 6, 10);

  // Head
  ctx.fillStyle = '#e8a828';
  ctx.fillRect(px + 32, py + 8 + by, 14, 13);
  ctx.fillRect(px + 34, py + 6 + by, 10, 3);
  ctx.fillRect(px + 31, py + 14 + by, 16, 4);
  ctx.fillStyle = '#f0c050';
  ctx.fillRect(px + 43, py + 14 + by, 5, 5);
  ctx.fillStyle = '#ff6688';
  ctx.fillRect(px + 45, py + 15 + by, 3, 2);
  ctx.fillStyle = '#c08018';
  ctx.fillRect(px + 44, py + 18 + by, 3, 1);

  // Ears
  ctx.fillStyle = '#d09020';
  ctx.fillRect(px + 33, py + 4 + by, 5, 5);
  ctx.fillRect(px + 40, py + 4 + by, 5, 5);
  ctx.fillStyle = '#e8a0a0';
  ctx.fillRect(px + 34, py + 5 + by, 3, 3);
  ctx.fillRect(px + 41, py + 5 + by, 3, 3);

  // Eyes (bright green, feline)
  ctx.fillStyle = '#00dd00';
  ctx.fillRect(px + 37, py + 10 + by, 4, 3);
  ctx.fillRect(px + 43, py + 10 + by, 3, 3);
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 38, py + 10 + by, 2, 3);
  ctx.fillRect(px + 44, py + 10 + by, 1, 3);
  ctx.fillStyle = '#aaffaa';
  ctx.fillRect(px + 37, py + 10 + by, 1, 1);
  ctx.fillRect(px + 43, py + 10 + by, 1, 1);

  // Whiskers
  ctx.strokeStyle = '#f0d080';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 45, py + 16 + by); ctx.lineTo(px + 52, py + 14 + by);
  ctx.moveTo(px + 45, py + 17 + by); ctx.lineTo(px + 53, py + 17 + by);
  ctx.moveTo(px + 45, py + 18 + by); ctx.lineTo(px + 52, py + 20 + by);
  ctx.stroke();

  // Head spots
  ctx.fillStyle = '#c08018';
  ctx.fillRect(px + 34, py + 8 + by, 2, 2);
  ctx.fillRect(px + 39, py + 6 + by, 2, 2);
  ctx.fillRect(px + 44, py + 8 + by, 2, 2);
}

function _drawWalkingRedPanda(ctx, px, py, by, legSwing) {
  // Tail (long, bushy, straight - signature red panda feature)
  const tailWag = Math.sin(Date.now() * 0.006) * 3;
  // Main tail body (thick, bushy, held fairly straight/horizontal)
  ctx.fillStyle = '#cc4422';
  ctx.fillRect(px - 2, py + 16 + by + tailWag, 10, 8);
  ctx.fillRect(px - 10, py + 15 + by + tailWag * 1.1, 10, 8);
  ctx.fillRect(px - 18, py + 14 + by + tailWag * 1.2, 10, 8);
  ctx.fillRect(px - 26, py + 13 + by + tailWag * 1.3, 10, 8);
  // Tail stripes (alternating light rings)
  ctx.fillStyle = '#ffccaa';
  ctx.fillRect(px - 6, py + 16 + by + tailWag * 1.05, 4, 8);
  ctx.fillRect(px - 14, py + 15 + by + tailWag * 1.15, 4, 8);
  ctx.fillRect(px - 22, py + 14 + by + tailWag * 1.25, 4, 8);
  // Bushy tail tip
  ctx.fillStyle = '#882211';
  ctx.fillRect(px - 30, py + 12 + by + tailWag * 1.35, 6, 9);

  // Back legs (dark brown/black)
  const backLeg1 = legSwing;
  const backLeg2 = -legSwing;
  ctx.fillStyle = '#331100';
  ctx.fillRect(px + 9, py + 32 + by, 5, 12 + backLeg1);
  ctx.fillRect(px + 8, py + 43 + by + backLeg1, 6, 3);
  ctx.fillRect(px + 15, py + 32 + by, 5, 12 + backLeg2);
  ctx.fillRect(px + 14, py + 43 + by + backLeg2, 6, 3);

  // Body (reddish-brown)
  ctx.fillStyle = '#cc4422';
  ctx.fillRect(px + 6, py + 19 + by, 32, 15);
  ctx.fillRect(px + 24, py + 17 + by, 12, 4);
  // Dark belly
  ctx.fillStyle = '#331100';
  ctx.fillRect(px + 10, py + 30 + by, 24, 4);

  // Front legs (dark brown/black)
  const frontLeg1 = -legSwing;
  const frontLeg2 = legSwing;
  ctx.fillStyle = '#331100';
  ctx.fillRect(px + 28, py + 32 + by, 5, 12 + frontLeg1);
  ctx.fillRect(px + 27, py + 43 + by + frontLeg1, 6, 3);
  ctx.fillRect(px + 34, py + 32 + by, 5, 12 + frontLeg2);
  ctx.fillRect(px + 33, py + 43 + by + frontLeg2, 6, 3);

  // Neck
  ctx.fillStyle = '#cc4422';
  ctx.fillRect(px + 34, py + 14 + by, 8, 10);

  // Head (big, round, with distinctive white face markings)
  ctx.fillStyle = '#cc4422';
  ctx.fillRect(px + 30, py + 4 + by, 20, 17);
  ctx.fillRect(px + 32, py + 2 + by, 16, 4);
  // White face mask (bigger, rounder)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 32, py + 8 + by, 14, 8);
  // Cheek patches (white extends to cheeks - wider)
  ctx.fillRect(px + 29, py + 12 + by, 4, 4);
  ctx.fillRect(px + 48, py + 12 + by, 4, 4);
  // Dark eye patches (tear marks)
  ctx.fillStyle = '#441100';
  ctx.fillRect(px + 33, py + 7 + by, 5, 5);
  ctx.fillRect(px + 41, py + 7 + by, 5, 5);
  // Snout (lighter)
  ctx.fillStyle = '#ffccaa';
  ctx.fillRect(px + 45, py + 13 + by, 6, 5);
  // Nose (dark)
  ctx.fillStyle = '#222222';
  ctx.fillRect(px + 47, py + 14 + by, 3, 2);
  // Mouth line
  ctx.fillStyle = '#882211';
  ctx.fillRect(px + 46, py + 17 + by, 4, 1);

  // Ears (large, tall, pointed, with white inner)
  ctx.fillStyle = '#882211';
  ctx.fillRect(px + 30, py - 4 + by, 8, 10);
  ctx.fillRect(px + 42, py - 4 + by, 8, 10);
  // Pointed ear tips
  ctx.fillRect(px + 32, py - 6 + by, 4, 3);
  ctx.fillRect(px + 44, py - 6 + by, 4, 3);
  // Inner ear (white/cream)
  ctx.fillStyle = '#ffccaa';
  ctx.fillRect(px + 32, py - 2 + by, 5, 7);
  ctx.fillRect(px + 44, py - 2 + by, 5, 7);

  // Eyes (dark, beady)
  ctx.fillStyle = '#222222';
  ctx.fillRect(px + 35, py + 9 + by, 3, 3);
  ctx.fillRect(px + 43, py + 9 + by, 3, 3);
  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 35, py + 9 + by, 1, 1);
  ctx.fillRect(px + 43, py + 9 + by, 1, 1);

  // Whiskers (thin, delicate)
  ctx.strokeStyle = '#ffddcc';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 48, py + 15 + by); ctx.lineTo(px + 56, py + 13 + by);
  ctx.moveTo(px + 48, py + 16 + by); ctx.lineTo(px + 57, py + 16 + by);
  ctx.moveTo(px + 48, py + 17 + by); ctx.lineTo(px + 56, py + 19 + by);
  ctx.stroke();
}

function _drawWalkingLion(ctx, px, py, by, legSwing) {
  // Tail (long, with tuft at end)
  const tailWag = Math.sin(Date.now() * 0.006) * 5;
  const tailCurl = Math.sin(Date.now() * 0.004) * 3;
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 2, py + 19 + by + tailWag, 5, 3);
  ctx.fillRect(px - 3, py + 16 + by + tailWag * 1.2, 5, 3);
  ctx.fillRect(px - 8, py + 13 + by + tailWag * 1.4 + tailCurl, 5, 3);
  // Tail tuft (dark brown puff at tip)
  ctx.fillStyle = '#aa6610';
  ctx.fillRect(px - 13, py + 10 + by + tailWag * 1.5 + tailCurl, 7, 6);
  ctx.fillStyle = '#bb7720';
  ctx.fillRect(px - 12, py + 11 + by + tailWag * 1.5 + tailCurl, 5, 4);

  // Back legs (thick, powerful)
  const backLeg1 = legSwing;
  const backLeg2 = -legSwing;
  ctx.fillStyle = '#c89020';
  ctx.fillRect(px + 8, py + 32 + by, 6, 12 + backLeg1);
  ctx.fillStyle = '#b88018';
  ctx.fillRect(px + 7, py + 43 + by + backLeg1, 7, 3);
  ctx.fillStyle = '#d09820';
  ctx.fillRect(px + 15, py + 32 + by, 6, 12 + backLeg2);
  ctx.fillStyle = '#c08818';
  ctx.fillRect(px + 14, py + 43 + by + backLeg2, 7, 3);

  // Body (larger, muscular - lion is bigger)
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 5, py + 18 + by, 34, 16);
  ctx.fillRect(px + 22, py + 15 + by, 14, 5);
  // Belly (lighter underside)
  ctx.fillStyle = '#eec060';
  ctx.fillRect(px + 9, py + 30 + by, 26, 4);

  // Front legs (thick)
  const frontLeg1 = -legSwing;
  const frontLeg2 = legSwing;
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 27, py + 32 + by, 6, 12 + frontLeg1);
  ctx.fillStyle = '#c89020';
  ctx.fillRect(px + 26, py + 43 + by + frontLeg1, 7, 3);
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 34, py + 32 + by, 6, 12 + frontLeg2);
  ctx.fillStyle = '#c89020';
  ctx.fillRect(px + 33, py + 43 + by + frontLeg2, 7, 3);

  // Neck (thick)
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 33, py + 12 + by, 8, 12);

  // Mane (large, surrounding head - drawn before head)
  ctx.fillStyle = '#aa6610';
  ctx.fillRect(px + 27, py + 2 + by, 24, 22);
  // Mane detail layers
  ctx.fillStyle = '#bb7720';
  ctx.fillRect(px + 29, py + 4 + by, 20, 18);
  // Mane outer tufts
  ctx.fillStyle = '#996610';
  ctx.fillRect(px + 26, py + 6 + by, 3, 14);
  ctx.fillRect(px + 49, py + 6 + by, 3, 14);
  ctx.fillRect(px + 30, py + 0 + by, 18, 4);
  ctx.fillRect(px + 30, py + 22 + by, 18, 3);

  // Head (on top of mane)
  ctx.fillStyle = '#dda030';
  ctx.fillRect(px + 32, py + 6 + by, 14, 14);
  ctx.fillRect(px + 34, py + 5 + by, 10, 3);
  // Snout (wider, lion-like)
  ctx.fillStyle = '#eec060';
  ctx.fillRect(px + 42, py + 13 + by, 7, 6);
  // Nose (large, dark)
  ctx.fillStyle = '#996620';
  ctx.fillRect(px + 44, py + 14 + by, 4, 3);
  // Mouth
  ctx.fillStyle = '#885510';
  ctx.fillRect(px + 44, py + 17 + by, 4, 1);

  // Ears (rounded, small relative to mane)
  ctx.fillStyle = '#c89020';
  ctx.fillRect(px + 33, py + 2 + by, 5, 5);
  ctx.fillRect(px + 41, py + 2 + by, 5, 5);
  // Inner ear
  ctx.fillStyle = '#eec0a0';
  ctx.fillRect(px + 34, py + 3 + by, 3, 3);
  ctx.fillRect(px + 42, py + 3 + by, 3, 3);

  // Eyes (amber/brown, intense)
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(px + 36, py + 9 + by, 4, 3);
  ctx.fillRect(px + 42, py + 9 + by, 4, 3);
  // Pupils (round)
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 37, py + 9 + by, 2, 3);
  ctx.fillRect(px + 43, py + 9 + by, 2, 3);
  // Eye shine
  ctx.fillStyle = '#ffddaa';
  ctx.fillRect(px + 36, py + 9 + by, 1, 1);
  ctx.fillRect(px + 42, py + 9 + by, 1, 1);

  // Whiskers (subtle)
  ctx.strokeStyle = '#eec880';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 46, py + 16 + by); ctx.lineTo(px + 53, py + 14 + by);
  ctx.moveTo(px + 46, py + 17 + by); ctx.lineTo(px + 54, py + 17 + by);
  ctx.moveTo(px + 46, py + 18 + by); ctx.lineTo(px + 53, py + 20 + by);
  ctx.stroke();
}

function _drawWalkingGator(ctx, px, py, by, legSwing) {
  // Tail (long, thick, tapering - extends far behind)
  const tailWag = Math.sin(Date.now() * 0.005) * 4;
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px - 2, py + 22 + by + tailWag, 8, 6);
  ctx.fillRect(px - 10, py + 21 + by + tailWag * 1.2, 9, 6);
  ctx.fillStyle = '#3a9a3a';
  ctx.fillRect(px - 18, py + 22 + by + tailWag * 1.4, 9, 5);
  ctx.fillRect(px - 24, py + 23 + by + tailWag * 1.5, 7, 4);
  // Tail ridges
  ctx.fillStyle = '#338833';
  ctx.fillRect(px - 5, py + 20 + by + tailWag * 1.1, 4, 3);
  ctx.fillRect(px - 13, py + 19 + by + tailWag * 1.3, 4, 3);
  ctx.fillRect(px - 20, py + 20 + by + tailWag * 1.4, 3, 3);

  // Back legs (short and stubby)
  const backLeg1 = legSwing * 0.6; // gator legs move less
  const backLeg2 = -legSwing * 0.6;
  ctx.fillStyle = '#338833';
  ctx.fillRect(px + 8, py + 34 + by, 6, 8 + backLeg1);
  ctx.fillStyle = '#2d772d';
  ctx.fillRect(px + 7, py + 41 + by + backLeg1, 8, 4);
  // Back claws
  ctx.fillStyle = '#cccc88';
  ctx.fillRect(px + 6, py + 44 + by + backLeg1, 3, 2);
  ctx.fillRect(px + 10, py + 44 + by + backLeg1, 3, 2);
  ctx.fillRect(px + 14, py + 44 + by + backLeg1, 3, 2);

  ctx.fillStyle = '#3a9a3a';
  ctx.fillRect(px + 16, py + 34 + by, 6, 8 + backLeg2);
  ctx.fillStyle = '#2d772d';
  ctx.fillRect(px + 15, py + 41 + by + backLeg2, 8, 4);
  // Claws
  ctx.fillStyle = '#cccc88';
  ctx.fillRect(px + 14, py + 44 + by + backLeg2, 3, 2);
  ctx.fillRect(px + 18, py + 44 + by + backLeg2, 3, 2);
  ctx.fillRect(px + 22, py + 44 + by + backLeg2, 3, 2);

  // Body (long, low, armored)
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 4, py + 22 + by, 36, 14);
  // Belly (lighter, yellowish-green)
  ctx.fillStyle = '#88cc88';
  ctx.fillRect(px + 8, py + 32 + by, 28, 4);
  // Back ridges/scales (bumpy spine)
  ctx.fillStyle = '#338833';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(px + 6 + i * 5, py + 19 + by, 4, 4);
  }
  // Scale texture on body
  ctx.fillStyle = '#3a9a3a';
  ctx.fillRect(px + 8, py + 24 + by, 3, 3);
  ctx.fillRect(px + 14, py + 26 + by, 3, 3);
  ctx.fillRect(px + 20, py + 24 + by, 3, 3);
  ctx.fillRect(px + 26, py + 26 + by, 3, 3);
  ctx.fillRect(px + 32, py + 24 + by, 3, 3);

  // Front legs (short and stubby)
  const frontLeg1 = -legSwing * 0.6;
  const frontLeg2 = legSwing * 0.6;
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 28, py + 34 + by, 6, 8 + frontLeg1);
  ctx.fillStyle = '#2d772d';
  ctx.fillRect(px + 27, py + 41 + by + frontLeg1, 8, 4);
  // Front claws
  ctx.fillStyle = '#cccc88';
  ctx.fillRect(px + 26, py + 44 + by + frontLeg1, 3, 2);
  ctx.fillRect(px + 30, py + 44 + by + frontLeg1, 3, 2);
  ctx.fillRect(px + 34, py + 44 + by + frontLeg1, 3, 2);

  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 35, py + 34 + by, 6, 8 + frontLeg2);
  ctx.fillStyle = '#2d772d';
  ctx.fillRect(px + 34, py + 41 + by + frontLeg2, 8, 4);
  // Claws
  ctx.fillStyle = '#cccc88';
  ctx.fillRect(px + 33, py + 44 + by + frontLeg2, 3, 2);
  ctx.fillRect(px + 37, py + 44 + by + frontLeg2, 3, 2);
  ctx.fillRect(px + 41, py + 44 + by + frontLeg2, 3, 2);

  // Head/snout (long, extending forward)
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 34, py + 16 + by, 8, 10); // neck/base
  // Upper jaw (long snout)
  ctx.fillStyle = '#3a9a3a';
  ctx.fillRect(px + 36, py + 12 + by, 18, 10);
  // Snout top (lighter green)
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 38, py + 10 + by, 16, 6);
  // Lower jaw
  ctx.fillStyle = '#2d882d';
  ctx.fillRect(px + 40, py + 22 + by, 14, 4);
  // Nostrils (bumps on top of snout tip)
  ctx.fillStyle = '#338833';
  ctx.fillRect(px + 50, py + 9 + by, 4, 3);
  ctx.fillRect(px + 52, py + 8 + by, 3, 2);
  // Nostril holes
  ctx.fillStyle = '#224422';
  ctx.fillRect(px + 51, py + 10 + by, 2, 1);

  // Teeth (visible along jaw line)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 42, py + 21 + by, 2, 2);
  ctx.fillRect(px + 46, py + 21 + by, 2, 2);
  ctx.fillRect(px + 50, py + 21 + by, 2, 2);
  // Upper teeth
  ctx.fillRect(px + 44, py + 20 + by, 2, 2);
  ctx.fillRect(px + 48, py + 20 + by, 2, 2);
  ctx.fillRect(px + 52, py + 20 + by, 2, 2);

  // Eyes (yellow-green, on top of head, protruding)
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(px + 40, py + 6 + by, 6, 6);
  ctx.fillRect(px + 48, py + 6 + by, 6, 6);
  ctx.fillStyle = '#ccff44';
  ctx.fillRect(px + 41, py + 7 + by, 4, 4);
  ctx.fillRect(px + 49, py + 7 + by, 4, 4);
  // Vertical slit pupils
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 42, py + 7 + by, 2, 4);
  ctx.fillRect(px + 50, py + 7 + by, 2, 4);
  // Eye shine
  ctx.fillStyle = '#eeff88';
  ctx.fillRect(px + 41, py + 7 + by, 1, 1);
  ctx.fillRect(px + 49, py + 7 + by, 1, 1);
}

// === ANIMAL IN RACE CAR ===
function _drawAnimalInCar(ctx, animal, px, py, by) {
  const tailWagCar = Math.sin(Date.now() * 0.005) * 4;

  if (animal === 'leopard') {
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
    ctx.fillStyle = '#d09020';
    ctx.fillRect(px + 10, py + 8 + by + tailWagCar, 3, 8);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px + 9, py + 4 + by + tailWagCar, 3, 5);
  } else if (animal === 'redPanda') {
    // Body
    ctx.fillStyle = '#cc4422';
    ctx.fillRect(px + 14, py + 12 + by, 18, 14);
    // Head (bigger)
    ctx.fillRect(px + 22, py + 0 + by, 18, 16);
    // White face mask
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 24, py + 4 + by, 14, 8);
    // Dark eye patches
    ctx.fillStyle = '#441100';
    ctx.fillRect(px + 25, py + 3 + by, 5, 5);
    ctx.fillRect(px + 33, py + 3 + by, 5, 5);
    // Eyes (dark)
    ctx.fillStyle = '#222222';
    ctx.fillRect(px + 27, py + 5 + by, 2, 2);
    ctx.fillRect(px + 34, py + 5 + by, 2, 2);
    // Ears (large, tall, pointed)
    ctx.fillStyle = '#882211';
    ctx.fillRect(px + 23, py - 5 + by, 7, 8);
    ctx.fillRect(px + 33, py - 5 + by, 7, 8);
    // Pointed tips
    ctx.fillRect(px + 25, py - 7 + by, 3, 3);
    ctx.fillRect(px + 35, py - 7 + by, 3, 3);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(px + 25, py - 3 + by, 4, 5);
    ctx.fillRect(px + 35, py - 3 + by, 4, 5);
    // Nose
    ctx.fillStyle = '#222222';
    ctx.fillRect(px + 37, py + 9 + by, 2, 2);
    // Paws
    ctx.fillStyle = '#331100';
    ctx.fillRect(px + 28, py + 24 + by, 5, 4);
    ctx.fillRect(px + 22, py + 24 + by, 5, 4);
    // Bushy striped tail sticking up (longer, bushier)
    ctx.fillStyle = '#cc4422';
    ctx.fillRect(px + 7, py + 2 + by + tailWagCar, 6, 14);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(px + 7, py + 4 + by + tailWagCar, 6, 3);
    ctx.fillRect(px + 7, py + 9 + by + tailWagCar, 6, 3);
    // Tail tip
    ctx.fillStyle = '#882211';
    ctx.fillRect(px + 7, py - 1 + by + tailWagCar, 6, 4);
  } else if (animal === 'lion') {
    // Body
    ctx.fillStyle = '#dda030';
    ctx.fillRect(px + 14, py + 12 + by, 18, 14);
    // Mane (behind head)
    ctx.fillStyle = '#aa6610';
    ctx.fillRect(px + 22, py - 2 + by, 20, 20);
    ctx.fillStyle = '#bb7720';
    ctx.fillRect(px + 24, py + 0 + by, 16, 16);
    // Head
    ctx.fillStyle = '#dda030';
    ctx.fillRect(px + 26, py + 2 + by, 12, 12);
    // Eyes (amber)
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(px + 31, py + 6 + by, 3, 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 32, py + 6 + by, 1, 2);
    // Nose
    ctx.fillStyle = '#996620';
    ctx.fillRect(px + 35, py + 9 + by, 3, 2);
    // Mouth
    ctx.fillStyle = '#885510';
    ctx.fillRect(px + 35, py + 11 + by, 3, 1);
    // Ears (small, in mane)
    ctx.fillStyle = '#c89020';
    ctx.fillRect(px + 27, py - 1 + by, 4, 4);
    ctx.fillRect(px + 34, py - 1 + by, 4, 4);
    // Paws
    ctx.fillStyle = '#c89020';
    ctx.fillRect(px + 28, py + 24 + by, 5, 4);
    ctx.fillRect(px + 22, py + 24 + by, 5, 4);
    // Tail with tuft
    ctx.fillStyle = '#dda030';
    ctx.fillRect(px + 10, py + 8 + by + tailWagCar, 3, 8);
    ctx.fillStyle = '#aa6610';
    ctx.fillRect(px + 8, py + 4 + by + tailWagCar, 5, 5);
  } else if (animal === 'gator') {
    // Body (green)
    ctx.fillStyle = '#44aa44';
    ctx.fillRect(px + 14, py + 12 + by, 18, 14);
    // Scale texture
    ctx.fillStyle = '#3a9a3a';
    ctx.fillRect(px + 16, py + 14 + by, 3, 3);
    ctx.fillRect(px + 22, py + 16 + by, 3, 3);
    // Head/snout (long, extending forward)
    ctx.fillStyle = '#44aa44';
    ctx.fillRect(px + 24, py + 2 + by, 10, 12);
    // Long snout extending right
    ctx.fillStyle = '#3a9a3a';
    ctx.fillRect(px + 32, py + 4 + by, 10, 8);
    // Jaw line
    ctx.fillStyle = '#2d882d';
    ctx.fillRect(px + 34, py + 10 + by, 8, 3);
    // Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 35, py + 9 + by, 2, 2);
    ctx.fillRect(px + 39, py + 9 + by, 2, 2);
    // Eyes (protruding, on top)
    ctx.fillStyle = '#ccff44';
    ctx.fillRect(px + 28, py + 0 + by, 4, 4);
    ctx.fillRect(px + 34, py + 0 + by, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 29, py + 0 + by, 2, 4);
    ctx.fillRect(px + 35, py + 0 + by, 2, 4);
    // Nostril bumps
    ctx.fillStyle = '#338833';
    ctx.fillRect(px + 40, py + 4 + by, 3, 2);
    // Paws/claws
    ctx.fillStyle = '#338833';
    ctx.fillRect(px + 28, py + 24 + by, 5, 4);
    ctx.fillRect(px + 22, py + 24 + by, 5, 4);
    ctx.fillStyle = '#cccc88';
    ctx.fillRect(px + 28, py + 27 + by, 2, 2);
    ctx.fillRect(px + 22, py + 27 + by, 2, 2);
    // Tail (thick, scaly)
    ctx.fillStyle = '#44aa44';
    ctx.fillRect(px + 8, py + 8 + by + tailWagCar, 4, 10);
    ctx.fillStyle = '#338833';
    ctx.fillRect(px + 7, py + 6 + by + tailWagCar, 3, 4);
    // Tail ridges
    ctx.fillRect(px + 9, py + 7 + by + tailWagCar, 2, 2);
    ctx.fillRect(px + 9, py + 11 + by + tailWagCar, 2, 2);
    ctx.fillRect(px + 9, py + 15 + by + tailWagCar, 2, 2);
  }
}

// === ANIMAL IN LITTER BOX ===
function _drawAnimalInLitterBox(ctx, animal, px, py, by) {
  if (animal === 'leopard') {
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
  } else if (animal === 'redPanda') {
    // Head (bigger)
    ctx.fillStyle = '#cc4422';
    ctx.fillRect(px + 22, py + 4 + by, 18, 16);
    // White face
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 24, py + 8 + by, 14, 8);
    // Eye patches
    ctx.fillStyle = '#441100';
    ctx.fillRect(px + 25, py + 7 + by, 5, 5);
    ctx.fillRect(px + 33, py + 7 + by, 5, 5);
    // Eyes
    ctx.fillStyle = '#222222';
    ctx.fillRect(px + 27, py + 9 + by, 2, 2);
    ctx.fillRect(px + 34, py + 9 + by, 2, 2);
    // Ears (large, tall, pointed)
    ctx.fillStyle = '#882211';
    ctx.fillRect(px + 23, py - 1 + by, 7, 8);
    ctx.fillRect(px + 33, py - 1 + by, 7, 8);
    // Pointed tips
    ctx.fillRect(px + 25, py - 3 + by, 3, 3);
    ctx.fillRect(px + 35, py - 3 + by, 3, 3);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(px + 25, py + 1 + by, 4, 5);
    ctx.fillRect(px + 35, py + 1 + by, 4, 5);
    // Nose
    ctx.fillStyle = '#222222';
    ctx.fillRect(px + 37, py + 13 + by, 2, 2);
    // Body
    ctx.fillStyle = '#cc4422';
    ctx.fillRect(px + 14, py + 14 + by, 18, 10);
    // Dark belly
    ctx.fillStyle = '#331100';
    ctx.fillRect(px + 16, py + 20 + by, 14, 4);
    // Paws
    ctx.fillStyle = '#331100';
    ctx.fillRect(px + 12, py + 22 + by, 5, 5);
    ctx.fillRect(px + 28, py + 22 + by, 5, 5);
  } else if (animal === 'lion') {
    // Mane (behind head)
    ctx.fillStyle = '#aa6610';
    ctx.fillRect(px + 20, py + 2 + by, 22, 18);
    ctx.fillStyle = '#bb7720';
    ctx.fillRect(px + 22, py + 4 + by, 18, 14);
    // Head
    ctx.fillStyle = '#dda030';
    ctx.fillRect(px + 24, py + 6 + by, 14, 14);
    // Ears
    ctx.fillStyle = '#c89020';
    ctx.fillRect(px + 26, py + 2 + by, 4, 4);
    ctx.fillRect(px + 33, py + 2 + by, 4, 4);
    // Eyes (amber)
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(px + 31, py + 10 + by, 3, 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 32, py + 10 + by, 1, 2);
    // Nose
    ctx.fillStyle = '#996620';
    ctx.fillRect(px + 35, py + 13 + by, 3, 2);
    // Body
    ctx.fillStyle = '#dda030';
    ctx.fillRect(px + 14, py + 14 + by, 18, 10);
    // Paws
    ctx.fillStyle = '#c89020';
    ctx.fillRect(px + 12, py + 22 + by, 5, 5);
    ctx.fillRect(px + 28, py + 22 + by, 5, 5);
  } else if (animal === 'gator') {
    // Head/snout (long)
    ctx.fillStyle = '#44aa44';
    ctx.fillRect(px + 24, py + 6 + by, 10, 12);
    // Snout extending right
    ctx.fillStyle = '#3a9a3a';
    ctx.fillRect(px + 32, py + 8 + by, 10, 8);
    // Jaw
    ctx.fillStyle = '#2d882d';
    ctx.fillRect(px + 34, py + 14 + by, 8, 3);
    // Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 35, py + 13 + by, 2, 2);
    ctx.fillRect(px + 39, py + 13 + by, 2, 2);
    // Eyes (protruding on top)
    ctx.fillStyle = '#ccff44';
    ctx.fillRect(px + 27, py + 3 + by, 4, 4);
    ctx.fillRect(px + 33, py + 3 + by, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 28, py + 3 + by, 2, 4);
    ctx.fillRect(px + 34, py + 3 + by, 2, 4);
    // Body visible above box
    ctx.fillStyle = '#44aa44';
    ctx.fillRect(px + 14, py + 14 + by, 18, 10);
    // Scales
    ctx.fillStyle = '#338833';
    ctx.fillRect(px + 16, py + 15 + by, 3, 3);
    ctx.fillRect(px + 22, py + 17 + by, 3, 3);
    // Paws/claws gripping box
    ctx.fillStyle = '#338833';
    ctx.fillRect(px + 12, py + 22 + by, 5, 5);
    ctx.fillRect(px + 28, py + 22 + by, 5, 5);
    // Claws visible
    ctx.fillStyle = '#cccc88';
    ctx.fillRect(px + 12, py + 26 + by, 2, 2);
    ctx.fillRect(px + 28, py + 26 + by, 2, 2);
  }
}

function _drawAnimalPortrait(id, px, py, pw, ph, color, t) {
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  if (id === 'leopard') {
    // Golden/tan body with spots
    ctx.fillStyle = color;
    ctx.fillRect(cx - 20, cy - 18, 40, 36); // body
    ctx.fillRect(cx - 14, cy - 30, 28, 16); // head
    // Ears
    ctx.fillRect(cx - 16, cy - 36, 8, 10);
    ctx.fillRect(cx + 8, cy - 36, 8, 10);
    // Spots
    ctx.fillStyle = '#996618';
    ctx.fillRect(cx - 12, cy - 8, 5, 5);
    ctx.fillRect(cx + 6, cy - 4, 5, 5);
    ctx.fillRect(cx - 6, cy + 8, 5, 5);
    ctx.fillRect(cx + 10, cy + 10, 5, 5);
    ctx.fillRect(cx - 16, cy + 4, 4, 4);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 8, cy - 26, 5, 5);
    ctx.fillRect(cx + 3, cy - 26, 5, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6, cy - 25, 3, 3);
    ctx.fillRect(cx + 5, cy - 25, 3, 3);
    // Nose
    ctx.fillStyle = '#aa6600';
    ctx.fillRect(cx - 2, cy - 20, 4, 3);
    // Tail
    ctx.fillStyle = color;
    ctx.fillRect(cx + 20, cy - 6, 16, 6);
    ctx.fillRect(cx + 32, cy - 12, 6, 10);
    // Legs
    ctx.fillRect(cx - 16, cy + 18, 8, 14);
    ctx.fillRect(cx + 8, cy + 18, 8, 14);
    // Paws
    ctx.fillStyle = '#d09020';
    ctx.fillRect(cx - 18, cy + 28, 10, 6);
    ctx.fillRect(cx + 6, cy + 28, 10, 6);
  } else if (id === 'redPanda') {
    // Reddish-brown body
    ctx.fillStyle = color;
    ctx.fillRect(cx - 18, cy - 16, 36, 32); // body
    ctx.fillRect(cx - 16, cy - 32, 32, 20); // head (bigger)
    ctx.fillRect(cx - 14, cy - 34, 28, 4); // head top
    // Ears (large, tall, pointed)
    ctx.fillStyle = '#882211';
    ctx.fillRect(cx - 18, cy - 42, 10, 14);
    ctx.fillRect(cx + 8, cy - 42, 10, 14);
    // Pointed ear tips
    ctx.fillRect(cx - 16, cy - 46, 6, 5);
    ctx.fillRect(cx + 10, cy - 46, 6, 5);
    // Inner ears
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(cx - 15, cy - 40, 6, 9);
    ctx.fillRect(cx + 10, cy - 40, 6, 9);
    // Face markings - white (bigger)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 13, cy - 28, 26, 10);
    // Eye patches - dark
    ctx.fillStyle = '#441100';
    ctx.fillRect(cx - 10, cy - 27, 8, 6);
    ctx.fillRect(cx + 2, cy - 27, 8, 6);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 8, cy - 26, 4, 4);
    ctx.fillRect(cx + 4, cy - 26, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6, cy - 25, 3, 3);
    ctx.fillRect(cx + 5, cy - 25, 3, 3);
    // Nose
    ctx.fillStyle = '#222222';
    ctx.fillRect(cx - 2, cy - 18, 4, 3);
    // Striped tail (long, bushy, straight - signature red panda feature)
    ctx.fillStyle = color;
    ctx.fillRect(cx + 18, cy - 6, 24, 10);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(cx + 24, cy - 6, 5, 10);
    ctx.fillRect(cx + 33, cy - 6, 5, 10);
    // Tail tip
    ctx.fillStyle = '#882211';
    ctx.fillRect(cx + 40, cy - 7, 6, 11);
    // Belly
    ctx.fillStyle = '#331100';
    ctx.fillRect(cx - 12, cy + 2, 24, 12);
    // Legs
    ctx.fillStyle = '#331100';
    ctx.fillRect(cx - 14, cy + 16, 8, 14);
    ctx.fillRect(cx + 6, cy + 16, 8, 14);
    // Paws
    ctx.fillStyle = '#222222';
    ctx.fillRect(cx - 16, cy + 26, 10, 6);
    ctx.fillRect(cx + 4, cy + 26, 10, 6);
  } else if (id === 'lion') {
    // Mane (drawn behind head)
    ctx.fillStyle = '#aa6610';
    ctx.fillRect(cx - 22, cy - 38, 44, 32);
    ctx.fillRect(cx - 26, cy - 30, 52, 20);
    // Body
    ctx.fillStyle = color;
    ctx.fillRect(cx - 22, cy - 14, 44, 34); // large body
    // Head
    ctx.fillRect(cx - 14, cy - 30, 28, 20);
    // Inner mane detail
    ctx.fillStyle = '#bb7720';
    ctx.fillRect(cx - 20, cy - 34, 6, 24);
    ctx.fillRect(cx + 14, cy - 34, 6, 24);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 8, cy - 26, 6, 5);
    ctx.fillRect(cx + 2, cy - 26, 6, 5);
    ctx.fillStyle = '#664400';
    ctx.fillRect(cx - 6, cy - 25, 3, 3);
    ctx.fillRect(cx + 4, cy - 25, 3, 3);
    // Nose
    ctx.fillStyle = '#996620';
    ctx.fillRect(cx - 3, cy - 18, 6, 4);
    // Mouth
    ctx.fillStyle = '#885510';
    ctx.fillRect(cx - 2, cy - 14, 4, 2);
    // Tail
    ctx.fillStyle = color;
    ctx.fillRect(cx + 22, cy, 14, 5);
    ctx.fillStyle = '#aa6610';
    ctx.fillRect(cx + 32, cy - 4, 8, 10); // tuft
    // Legs (thick)
    ctx.fillStyle = color;
    ctx.fillRect(cx - 18, cy + 20, 10, 14);
    ctx.fillRect(cx + 8, cy + 20, 10, 14);
    // Paws
    ctx.fillStyle = '#c89020';
    ctx.fillRect(cx - 20, cy + 30, 12, 6);
    ctx.fillRect(cx + 6, cy + 30, 12, 6);
  } else if (id === 'gator') {
    // Body (long and low)
    ctx.fillStyle = color;
    ctx.fillRect(cx - 26, cy - 8, 52, 22); // body
    // Head/snout (long)
    ctx.fillStyle = '#3a9a3a';
    ctx.fillRect(cx + 16, cy - 16, 24, 18); // head
    ctx.fillRect(cx + 30, cy - 18, 16, 10); // snout top
    // Lower jaw
    ctx.fillStyle = '#2d882d';
    ctx.fillRect(cx + 30, cy - 6, 16, 8);
    // Teeth
    ctx.fillStyle = '#ffffff';
    for (let ti = 0; ti < 4; ti++) {
      ctx.fillRect(cx + 32 + ti * 4, cy - 8, 2, 3);
      ctx.fillRect(cx + 32 + ti * 4, cy + 1, 2, 3);
    }
    // Eyes (on top of head)
    ctx.fillStyle = '#ccff44';
    ctx.fillRect(cx + 20, cy - 20, 6, 6);
    ctx.fillRect(cx + 30, cy - 22, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx + 22, cy - 18, 3, 4); // slit pupil
    ctx.fillRect(cx + 32, cy - 20, 3, 4);
    // Scales/ridges along back
    ctx.fillStyle = '#2d882d';
    for (let si = 0; si < 6; si++) {
      ctx.fillRect(cx - 22 + si * 8, cy - 12, 5, 5);
    }
    // Tail
    ctx.fillStyle = color;
    ctx.fillRect(cx - 26, cy - 4, -18, 12);
    ctx.fillStyle = '#3a9a3a';
    ctx.fillRect(cx - 44, cy - 2, -10, 8);
    // Legs (short and stubby)
    ctx.fillStyle = '#338833';
    ctx.fillRect(cx - 20, cy + 14, 10, 10);
    ctx.fillRect(cx + 10, cy + 14, 10, 10);
    // Claws
    ctx.fillStyle = '#cccc88';
    ctx.fillRect(cx - 22, cy + 22, 4, 4);
    ctx.fillRect(cx - 16, cy + 22, 4, 4);
    ctx.fillRect(cx + 8, cy + 22, 4, 4);
    ctx.fillRect(cx + 14, cy + 22, 4, 4);
    // Belly
    ctx.fillStyle = '#88cc88';
    ctx.fillRect(cx - 18, cy + 2, 36, 10);
  }
}

export function drawAlly(ally) {
  if (!ally.alive) return;
  const px = Math.floor(ally.x - camera.x);
  const py = Math.floor(ally.y);
  const f = ally.facing;
  const hurtFlash = ally.hurt > 0 && ally.hurt % 2 === 0;
  const invFlicker = ally.invincibleTimer > 0 && ally.invincibleTimer % 4 < 2;

  ctx.save();
  if (invFlicker) ctx.globalAlpha = 0.5;

  if (ally.type === 'horse') {
    // === WAR HORSE - drawn larger than player ===
    ctx.save();
    ctx.translate(px + ally.w / 2, py + ally.h);
    if (f === -1) { ctx.scale(-1, 1); }

    const running = Math.abs(ally.vx) > 0.5;
    const legTime = Date.now() * (running ? 0.012 : 0.004);
    const legSwing = running ? Math.sin(legTime) * 8 : 0;
    const bodyBob = running ? Math.sin(legTime * 2) * 2 : 0;

    // Body (large brown rectangle)
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#8B6914';
    ctx.fillRect(-22, -38 + bodyBob, 44, 24);

    // Belly (lighter)
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#B8941E';
    ctx.fillRect(-18, -22 + bodyBob, 36, 8);

    // Neck (angled up)
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#8B6914';
    ctx.fillRect(12, -52 + bodyBob, 12, 20);

    // Head
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#7A5C12';
    ctx.fillRect(14, -60 + bodyBob, 18, 14);
    // Snout
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#6B4F10';
    ctx.fillRect(26, -56 + bodyBob, 8, 8);
    // Nostril
    ctx.fillStyle = '#333333';
    ctx.fillRect(32, -52 + bodyBob, 2, 2);

    // Eye
    ctx.fillStyle = '#222222';
    ctx.fillRect(24, -58 + bodyBob, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, -58 + bodyBob, 2, 1);

    // Ears
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#7A5C12';
    ctx.fillRect(16, -66 + bodyBob, 4, 8);
    ctx.fillRect(22, -66 + bodyBob, 4, 8);
    // Inner ears
    ctx.fillStyle = '#B8941E';
    ctx.fillRect(17, -64 + bodyBob, 2, 5);
    ctx.fillRect(23, -64 + bodyBob, 2, 5);

    // Mane (along neck)
    ctx.fillStyle = '#3a2a0a';
    ctx.fillRect(14, -62 + bodyBob, 4, 16);
    ctx.fillRect(12, -50 + bodyBob, 4, 14);
    // Mane detail
    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(15, -58 + bodyBob, 3, 12);

    // Tail
    const tailWag = Math.sin(Date.now() * 0.005) * 5;
    ctx.fillStyle = '#3a2a0a';
    ctx.fillRect(-24, -36 + bodyBob + tailWag, 6, 18);
    ctx.fillRect(-26, -22 + bodyBob + tailWag, 5, 10);

    // Legs (4 legs with animation)
    ctx.fillStyle = hurtFlash ? '#ffffff' : '#7A5C12';
    // Back legs
    ctx.fillRect(-18, -16 + bodyBob, 7, 16 + legSwing);
    ctx.fillRect(-10, -16 + bodyBob, 7, 16 - legSwing);
    // Front legs
    ctx.fillRect(8, -16 + bodyBob, 7, 16 - legSwing);
    ctx.fillRect(16, -16 + bodyBob, 7, 16 + legSwing);

    // Hooves
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(-19, -2 + bodyBob + legSwing, 8, 4);
    ctx.fillRect(-11, -2 + bodyBob - legSwing, 8, 4);
    ctx.fillRect(7, -2 + bodyBob - legSwing, 8, 4);
    ctx.fillRect(15, -2 + bodyBob + legSwing, 8, 4);

    // Saddle
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-8, -42 + bodyBob, 20, 8);
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(-6, -41 + bodyBob, 16, 5);
    // Saddle stirrup
    ctx.fillStyle = '#666666';
    ctx.fillRect(-10, -34 + bodyBob, 2, 10);
    ctx.fillRect(12, -34 + bodyBob, 2, 10);

    // Attack effect
    if (ally.attackTimer > 0) {
      ctx.fillStyle = `rgba(255,136,68,${ally.attackTimer / 10})`;
      ctx.fillRect(28, -50 + bodyBob, 15, 12);
    }

    ctx.restore();

  } else if (ally.type === 'leopard' || ally.type === 'redPanda' || ally.type === 'lion' || ally.type === 'gator') {
    // === ALLY ANIMAL - reuses the same drawing as the player walking functions ===
    ctx.save();
    ctx.translate(px + ally.w / 2, py + ally.h);
    if (f === -1) { ctx.scale(-1, 1); }

    const running = Math.abs(ally.vx) > 0.5;
    const allyLegTime = Date.now() * (running ? 0.012 : 0.004);
    const bodyBob = running ? Math.sin(allyLegTime * 2) * 1.5 : 0;

    // Scale to fit ally bounding box: player art is drawn in a ~48x48 space,
    // ally box is 43x54. We use a scale factor to map player art to ally size.
    const allyScale = ally.w / 48; // 43/48 = ~0.9 (90% of player size)
    ctx.scale(allyScale, allyScale);

    // Position the origin so the player drawing functions' coordinate space
    // maps correctly: the walking functions draw from (px, py) where the body
    // center-x is at px+24 and the bottom of the feet is at ~py+48.
    // From our current origin (bottom-center in scaled space), we need:
    //   px + 24 = 0  =>  px = -24
    //   py + 48 = 0  =>  py = -48
    _drawWalkingAnimal(ctx, ally.type, -24, -48, bodyBob, ally.vx);

    // Hurt flash: draw a bright white overlay on the animal's bounding area
    if (hurtFlash) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-30, -56, 65, 60);
    }

    // Attack effect (positioned relative to the head/mouth area in scaled space)
    if (ally.attackTimer > 0) {
      ctx.fillStyle = `rgba(255,136,68,${ally.attackTimer / 10})`;
      if (ally.type === 'gator') {
        ctx.fillRect(32, -48 + bodyBob, 12, 10);
      } else {
        ctx.fillRect(26, -48 + bodyBob, 10, 10);
      }
    }

    ctx.restore();

  } else {
    // === FALLBACK for any unknown ally type ===
    ctx.save();
    ctx.translate(px + ally.w / 2, py + ally.h);
    if (f === -1) { ctx.scale(-1, 1); }

    const running = Math.abs(ally.vx) > 0.5;
    const legTime = Date.now() * (running ? 0.012 : 0.004);
    const legSwing = running ? Math.sin(legTime) * 6 : 0;

    ctx.fillStyle = hurtFlash ? '#ffffff' : '#aaaaaa';
    ctx.fillRect(-14, -28, 28, 16);
    ctx.fillRect(-12, -14, 5, 14 + legSwing);
    ctx.fillRect(-6, -14, 5, 14 - legSwing);
    ctx.fillRect(8, -14, 5, 14 - legSwing);
    ctx.fillRect(12, -14, 5, 14 + legSwing);
    ctx.fillRect(10, -34, 8, 8);
    ctx.fillRect(8, -40, 14, 10);
    ctx.fillStyle = '#000000';
    ctx.fillRect(17, -38, 2, 2);

    if (ally.attackTimer > 0) {
      ctx.fillStyle = `rgba(255,136,68,${ally.attackTimer / 10})`;
      ctx.fillRect(22, -40, 10, 10);
    }

    ctx.restore();
  }

  // HP bar (for non-invulnerable allies)
  if (!ally.invulnerable && ally.hp < ally.maxHp) {
    const barW = ally.type === 'horse' ? 40 : 30;
    const barX = px + (ally.w - barW) / 2;
    ctx.fillStyle = '#440000';
    ctx.fillRect(barX, py - 10, barW, 4);
    ctx.fillStyle = '#44cc44';
    ctx.fillRect(barX, py - 10, barW * (ally.hp / ally.maxHp), 4);
  }

  // Lives indicator (small dots)
  if (!ally.invulnerable && ally.lives <= 3) {
    for (let i = 0; i < ally.lives; i++) {
      ctx.fillStyle = '#ff8888';
      ctx.fillRect(px + ally.w / 2 - 8 + i * 6, py - 16, 4, 4);
    }
  }

  // Type label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '8px "Courier New"';
  ctx.textAlign = 'center';
  const typeLabel = ally.type === 'horse' ? 'HORSE' : ally.type.toUpperCase();
  ctx.fillText(typeLabel, px + ally.w / 2, py - 18);
  ctx.textAlign = 'left';

  ctx.restore();
}

export function drawHorseCrates() {
  state.horseCrates.forEach(c => {
    if (c.broken) return;
    const cx = c.x - camera.x + (c.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0);
    const cy = c.y;
    if (c.shakeTimer > 0) c.shakeTimer--;

    // Wooden crate body with golden-brown tint
    ctx.fillStyle = '#6a5530'; ctx.fillRect(cx, cy, c.w, c.h);
    // Border
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(cx, cy, c.w, 3); ctx.fillRect(cx, cy + c.h - 3, c.w, 3);
    ctx.fillRect(cx, cy, 3, c.h); ctx.fillRect(cx + c.w - 3, cy, 3, c.h);
    // Cross bands
    ctx.fillStyle = '#7a6540';
    ctx.fillRect(cx + 3, cy + c.h/2 - 1, c.w - 6, 3);
    ctx.fillRect(cx + c.w/2 - 1, cy + 3, 3, c.h - 6);
    // Corner rivets
    ctx.fillStyle = '#B8941E';
    ctx.fillRect(cx + 4, cy + 4, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + 4, 3, 3);
    ctx.fillRect(cx + 4, cy + c.h - 7, 3, 3);
    ctx.fillRect(cx + c.w - 7, cy + c.h - 7, 3, 3);

    // Horse icon - small horse silhouette
    const icx = cx + c.w/2;
    const icy = cy + c.h/2;
    ctx.fillStyle = HORSE_TYPE.color;
    // Horse body
    ctx.fillRect(icx - 7, icy - 2, 14, 6);
    // Horse neck
    ctx.fillRect(icx + 4, icy - 8, 4, 8);
    // Horse head
    ctx.fillRect(icx + 5, icy - 10, 6, 5);
    // Legs
    ctx.fillRect(icx - 5, icy + 4, 3, 5);
    ctx.fillRect(icx + 3, icy + 4, 3, 5);
    // Tail
    ctx.fillRect(icx - 9, icy - 4, 3, 5);

    // Golden glow
    const glowAlpha = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
    ctx.fillStyle = `rgba(139,105,20,${glowAlpha})`;
    ctx.beginPath(); ctx.arc(icx, icy, 22, 0, Math.PI * 2); ctx.fill();

    // HP pips
    for (let i = 0; i < c.hp; i++) {
      ctx.fillStyle = '#B8941E'; ctx.fillRect(cx + 4 + i * 9, cy - 6, 7, 3);
    }
  });
}

export function drawHorsePickups() {
  state.horsePickups.forEach(hp => {
    if (hp.equipped) return;
    const hx = hp.x - camera.x;
    const floatY = hp.y - 50 + Math.sin(hp.bobTimer) * 6;

    // Halo glow effect
    const glowPulse = 0.3 + Math.sin(hp.glowTimer * 2) * 0.15;
    const haloGrad = ctx.createRadialGradient(hx, floatY, 0, hx, floatY, 40);
    haloGrad.addColorStop(0, `rgba(139,105,20,${glowPulse})`);
    haloGrad.addColorStop(0.5, `rgba(184,148,30,${glowPulse * 0.5})`);
    haloGrad.addColorStop(1, 'rgba(139,105,20,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(hx - 45, floatY - 45, 90, 90);

    // Halo ring
    ctx.strokeStyle = `rgba(184,148,30,${0.4 + Math.sin(hp.glowTimer * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(hx, floatY - 18, 16, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw floating horse silhouette
    ctx.fillStyle = HORSE_TYPE.color;
    // Body
    ctx.fillRect(hx - 14, floatY - 4, 28, 12);
    // Neck
    ctx.fillRect(hx + 8, floatY - 16, 8, 16);
    // Head
    ctx.fillRect(hx + 10, floatY - 20, 12, 10);
    // Snout
    ctx.fillStyle = '#6B4F10';
    ctx.fillRect(hx + 18, floatY - 16, 6, 6);
    // Eye
    ctx.fillStyle = '#222222';
    ctx.fillRect(hx + 16, floatY - 18, 3, 2);
    // Ears
    ctx.fillStyle = '#7A5C12';
    ctx.fillRect(hx + 12, floatY - 24, 3, 5);
    ctx.fillRect(hx + 17, floatY - 24, 3, 5);
    // Mane
    ctx.fillStyle = '#3a2a0a';
    ctx.fillRect(hx + 8, floatY - 22, 3, 14);
    // Tail
    ctx.fillRect(hx - 16, floatY - 6, 4, 10);
    // Legs
    ctx.fillStyle = '#7A5C12';
    ctx.fillRect(hx - 10, floatY + 8, 5, 10);
    ctx.fillRect(hx + 6, floatY + 8, 5, 10);
    // Hooves
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(hx - 11, floatY + 16, 6, 3);
    ctx.fillRect(hx + 5, floatY + 16, 6, 3);
    // Saddle
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(hx - 4, floatY - 8, 12, 5);

    // "Press E to equip" text
    const textBob = Math.sin(Date.now() * 0.004) * 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to equip', hx, floatY + 34 + textBob);
    // Item name
    ctx.fillStyle = HORSE_TYPE.color;
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(HORSE_TYPE.name, hx, floatY - 30);
    ctx.textAlign = 'left';
  });
}

export function drawPaused() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#aaaaaa'; ctx.font = '16px "Courier New"';
  ctx.fillText('Press ESC to resume', canvas.width / 2, canvas.height / 2 + 30);
  ctx.textAlign = 'left';
}
