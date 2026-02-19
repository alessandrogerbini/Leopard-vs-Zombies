// Health pickups, powerup crates, armor crates, diamond, portal spawning
import { GROUND_Y, state, player, POWERUP_TYPES, POWERUP_DURATION, ARMOR_TYPES, GLASSES_TYPE, SNEAKERS_TYPE, keys } from './state.js';
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

export function spawnArmorCrates() {
  state.armorCrates = [];
  state.armorPickups = [];
  // Find the armor type for this level
  const armorType = ARMOR_TYPES.find(a => a.level === state.currentLevel);
  if (!armorType) return;

  // If the player already has this tier or higher, don't spawn the crate
  const currentTier = player.items.armor
    ? (ARMOR_TYPES.find(a => a.id === player.items.armor)?.tier || 0)
    : 0;
  if (currentTier >= armorType.tier) return;

  const ld = state.levelData;
  // Pick a ground-level location away from platforms used by powerup crates
  // Place it on the ground roughly 40% into the level
  const crateX = Math.floor(ld.width * 0.4);
  state.armorCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    armorType: armorType,
    shakeTimer: 0
  });
}

export function updateArmorPickups() {
  state.armorPickups.forEach(ap => {
    if (ap.equipped) return;
    ap.bobTimer += 0.04;
    ap.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const apBox = { x: ap.x - 20, y: ap.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, apBox) && keys['KeyE']) {
      ap.equipped = true;
      player.items.armor = ap.armorType.id;
      spawnParticles(ap.x, ap.y - 20, ap.armorType.color, 25, 10);
      spawnParticles(ap.x, ap.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(ap.x, ap.y - 50, ap.armorType.name, ap.armorType.color);
      spawnFloatingText(ap.x, ap.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      player.score += 250;
      keys['KeyE'] = false; // consume the key press
    }
  });
}

export function spawnGlassesCrates() {
  state.glassesCrates = [];
  state.glassesPickups = [];
  // Only spawn on the glasses' designated level
  if (state.currentLevel !== GLASSES_TYPE.level) return;
  // Don't spawn if player already has glasses
  if (player.items.glasses) return;

  const ld = state.levelData;
  // Place it on the ground roughly 25% into the level (distinct from armor crate at 40%)
  const crateX = Math.floor(ld.width * 0.25);
  state.glassesCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    glassesType: GLASSES_TYPE,
    shakeTimer: 0
  });
}

export function updateGlassesPickups() {
  state.glassesPickups.forEach(gp => {
    if (gp.equipped) return;
    gp.bobTimer += 0.04;
    gp.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const gpBox = { x: gp.x - 20, y: gp.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, gpBox) && keys['KeyE']) {
      gp.equipped = true;
      player.items.glasses = true;
      spawnParticles(gp.x, gp.y - 20, GLASSES_TYPE.color, 25, 10);
      spawnParticles(gp.x, gp.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(gp.x, gp.y - 50, GLASSES_TYPE.name, GLASSES_TYPE.color);
      spawnFloatingText(gp.x, gp.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      player.score += 250;
      keys['KeyE'] = false; // consume the key press
    }
  });
}

export function spawnSneakersCrates() {
  state.sneakersCrates = [];
  state.sneakersPickups = [];
  // Only spawn on the cowboy boots' designated level
  if (state.currentLevel !== SNEAKERS_TYPE.level) return;
  // Don't spawn if player already has cowboy boots
  if (player.items.cowboyBoots) return;

  const ld = state.levelData;
  // Place it on the ground roughly 55% into the level (distinct from armor at 40%, glasses at 25%)
  const crateX = Math.floor(ld.width * 0.55);
  state.sneakersCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    sneakersType: SNEAKERS_TYPE,
    shakeTimer: 0
  });
}

export function updateSneakersPickups() {
  state.sneakersPickups.forEach(sp => {
    if (sp.equipped) return;
    sp.bobTimer += 0.04;
    sp.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const spBox = { x: sp.x - 20, y: sp.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, spBox) && keys['KeyE']) {
      sp.equipped = true;
      player.items.cowboyBoots = true;
      spawnParticles(sp.x, sp.y - 20, SNEAKERS_TYPE.color, 25, 10);
      spawnParticles(sp.x, sp.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(sp.x, sp.y - 50, SNEAKERS_TYPE.name, SNEAKERS_TYPE.color);
      spawnFloatingText(sp.x, sp.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      player.score += 250;
      keys['KeyE'] = false; // consume the key press
    }
  });
}
