// Health pickups, powerup crates, diamond, portal spawning
import { GROUND_Y, state, player, POWERUP_TYPES, POWERUP_DURATION } from './state.js';
import { rectCollide, spawnParticles, spawnFloatingText } from './utils.js';

export function spawnHealthPickups() {
  state.healthPickups = [];
  const ld = state.levelData;
  const plats = [...ld.platforms];
  for (let i = plats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plats[i], plats[j]] = [plats[j], plats[i]];
  }
  const count = Math.min(4 + state.currentLevel, plats.length);
  for (let i = 0; i < count; i++) {
    const p = plats[i];
    state.healthPickups.push({
      x: p.x + p.w / 2,
      y: p.y - 12,
      collected: false,
      bobTimer: Math.random() * Math.PI * 2
    });
  }
}

export function spawnPowerupCrates() {
  state.powerupCrates = [];
  const ld = state.levelData;
  const sorted = [...ld.platforms].sort((a, b) => a.y - b.y);
  const highPlats = sorted.slice(0, Math.min(4, sorted.length));

  const types = [...POWERUP_TYPES];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  highPlats.forEach((p, i) => {
    const type = types[i];
    state.powerupCrates.push({
      x: p.x + p.w / 2 - 12,
      y: p.y - 28,
      w: 24, h: 24,
      hp: 3,
      broken: false,
      powerupType: type,
      shakeTimer: 0
    });
  });
}

export function updateHealthPickups() {
  state.healthPickups.forEach(h => {
    if (h.collected) return;
    if (player.hp >= player.maxHp) return;
    h.bobTimer += 0.05;
    const hbox = { x: h.x - 10, y: h.y - 10 + Math.sin(h.bobTimer) * 5, w: 20, h: 20 };
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectCollide(pbox, hbox)) {
      h.collected = true;
      player.hp = Math.min(player.maxHp, player.hp + 25);
      spawnParticles(h.x, h.y, '#44ff44', 10, 6);
      spawnFloatingText(h.x, h.y - 20, '+25 HP', '#44ff44');
    }
  });
}

export function updateDiamond() {
  if (!state.diamond || state.diamond.collected) return;
  state.diamond.glow += 0.05;
  const d = state.diamond;
  const dbox = { x: d.x - 15, y: d.y - 15, w: 30, h: 30 };
  const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectCollide(pbox, dbox)) {
    d.collected = true;
    player.score += 1000;
    state.screenFlash = 15;
    spawnParticles(d.x, d.y, '#00ffff', 30, 12);
    spawnParticles(d.x, d.y, '#ffffff', 20, 8);
    spawnFloatingText(d.x, d.y - 40, 'LEOPARD DIAMOND!', '#00ffff');
    state.gameState = 'levelComplete';
    state.transitionTimer = 120;
  }
}

export function updatePortal() {
  if (!state.portal || state.portal.entered) return;
  state.portal.timer += 0.04;
  const p = state.portal;
  const portalBox = { x: p.x - 20, y: p.y - 60, w: 40, h: 60 };
  const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectCollide(pbox, portalBox)) {
    p.entered = true;
    state.gameState = 'levelComplete';
    state.transitionTimer = 90;
    state.screenFlash = 10;
    spawnParticles(p.x, p.y - 30, '#8844ff', 25, 10);
    spawnParticles(p.x, p.y - 30, '#ffffff', 15, 8);
  }
}
