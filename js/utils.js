// Collision, particles, floating text, powerup helpers
import { state, player } from './state.js';

export function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export function getAttackBox() {
  let reach = 55;
  if (player.items.cowboyBoots) reach = Math.floor(reach * 1.2);
  if (player.facing === 1) {
    return { x: player.x + player.w, y: player.y - 5, w: reach, h: player.h + 5 };
  } else {
    return { x: player.x - reach, y: player.y - 5, w: reach, h: player.h + 5 };
  }
}

export function spawnParticles(x, y, color, count, spread) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.8) * spread,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

export function spawnFloatingText(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, life: 60 });
}

export function getPlayerDamage() {
  let dmg = player.baseDamage + player.combo * 3;
  if (player.powerups.clawsOfSteel > 0) dmg *= 2;
  return Math.floor(dmg);
}

export function getPlayerCooldown() {
  let cd = player.baseCooldown;
  if (player.powerups.superFangs > 0) cd = Math.floor(cd / 2);
  return cd;
}

export function getPlayerJumpForce() {
  let jf = player.baseJumpForce;
  if (player.powerups.jumpyBoots > 0) jf *= 1.5;
  return jf;
}
