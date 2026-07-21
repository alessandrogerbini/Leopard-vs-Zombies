/**
 * @module rpg/hud-rpg
 * @description Canvas 2D HUD and menu drawing for the Animal Rescue RPG alpha.
 *
 * Dependencies: save-system.js
 * Exports: drawSaveSelect, drawRuntimeShell, getSaveSlotLayout, hitTestSaveSlot
 */

import { SAVE_SLOT_COUNT } from './save-system.js';

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, basePx, minPx = 12, family = '"Courier New", monospace', weight = 'bold') {
  let size = basePx;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || size <= minPx) return size;
    size -= 1;
  } while (size >= minPx);
  return minPx;
}

function drawBackground(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#122316');
  grad.addColorStop(0.48, '#24381f');
  grad.addColorStop(1, '#17202d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 97 + 31) % w;
    const y = (i * 53 + 19) % h;
    roundedRect(ctx, x, y, 34 + (i % 3) * 18, 8, 4);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(245, 214, 107, 0.12)';
  ctx.fillRect(0, Math.max(0, h - 78), w, 78);
}

export function getSaveSlotLayout(width, height) {
  const horizontal = width >= 760;
  const margin = Math.max(18, Math.min(42, width * 0.045));
  const gap = horizontal ? 18 : 12;
  const cards = [];

  if (horizontal) {
    const available = width - margin * 2 - gap * (SAVE_SLOT_COUNT - 1);
    const cardW = Math.min(280, Math.floor(available / SAVE_SLOT_COUNT));
    const cardH = Math.min(210, Math.max(172, height * 0.36));
    const totalW = cardW * SAVE_SLOT_COUNT + gap * (SAVE_SLOT_COUNT - 1);
    const x0 = Math.floor((width - totalW) / 2);
    const y = Math.max(156, Math.floor(height * 0.37));
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      cards.push({ slot: i, x: x0 + i * (cardW + gap), y, w: cardW, h: cardH });
    }
  } else {
    const cardW = Math.min(width - margin * 2, 336);
    const cardH = Math.max(112, Math.min(134, Math.floor((height - 214) / SAVE_SLOT_COUNT)));
    const x = Math.floor((width - cardW) / 2);
    const startY = Math.max(128, Math.floor(height * 0.24));
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      cards.push({ slot: i, x, y: startY + i * (cardH + gap), w: cardW, h: cardH });
    }
  }

  return { cards, horizontal };
}

export function hitTestSaveSlot(width, height, x, y) {
  return getSaveSlotLayout(width, height).cards.find(card => (
    x >= card.x && x <= card.x + card.w &&
    y >= card.y && y <= card.y + card.h
  )) || null;
}

function drawSlotCard(ctx, card, summary, selected, confirmDelete) {
  const accent = selected ? '#f5d66b' : '#6da85f';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.strokeStyle = accent;
  ctx.fillStyle = summary.valid === false ? '#322026' : selected ? '#243a22' : '#1a2b1f';
  roundedRect(ctx, card.x, card.y, card.w, card.h, 8);
  ctx.fill();
  ctx.stroke();

  const slotLabel = `SLOT ${card.slot + 1}`;
  ctx.fillStyle = '#b9caa3';
  ctx.textAlign = 'left';
  fitText(ctx, slotLabel, card.w - 34, 15, 11);
  ctx.fillText(slotLabel, card.x + 18, card.y + 28);

  const title = confirmDelete && selected ? 'DELETE SAVE?' : summary.label;
  ctx.fillStyle = selected ? '#fff1a6' : '#eef6dc';
  fitText(ctx, title, card.w - 36, 25, 14);
  ctx.fillText(title, card.x + 18, card.y + 66);

  ctx.fillStyle = '#c9d8b9';
  ctx.font = '15px "Courier New", monospace';
  if (summary.empty) {
    ctx.fillText('Start fresh', card.x + 18, card.y + 98);
    ctx.fillText('Hub + Forest Edge', card.x + 18, card.y + 122);
  } else if (summary.valid === false) {
    ctx.fillText('Press Enter to repair', card.x + 18, card.y + 98);
    ctx.fillText('Invalid data kept', card.x + 18, card.y + 122);
  } else {
    ctx.fillText(`Zone: ${summary.zoneLabel}`, card.x + 18, card.y + 98);
    ctx.fillText(`Play: ${summary.playtime}`, card.x + 18, card.y + 122);
    ctx.fillText(`HP: ${summary.hp}/${summary.maxHp}`, card.x + 18, card.y + 146);
  }

  if (selected) {
    ctx.fillStyle = '#f5d66b';
    ctx.fillRect(card.x + 18, card.y + card.h - 24, card.w - 36, 3);
  }
}

export function drawSaveSelect(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const animal = view.animal || {};
  const summaries = view.slotSummaries || [];
  const selectedSlot = view.selectedSlot || 0;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, 'ANIMAL RESCUE', Math.min(620, w - 34), Math.min(42, Math.max(30, w / 21)), 24);
  ctx.fillText('ANIMAL RESCUE', w / 2, Math.max(58, h * 0.12));

  ctx.fillStyle = animal.color || '#e8a828';
  fitText(ctx, animal.name || animal.id || 'HERO', Math.min(500, w - 40), 24, 16);
  ctx.fillText(animal.name || animal.id || 'HERO', w / 2, Math.max(92, h * 0.17));

  ctx.fillStyle = '#dce8c9';
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText('Choose a save slot', w / 2, Math.max(122, h * 0.23));

  const layout = getSaveSlotLayout(w, h);
  layout.cards.forEach(card => {
    drawSlotCard(ctx, card, summaries[card.slot], card.slot === selectedSlot, view.confirmDelete);
  });

  ctx.fillStyle = '#d8e4c5';
  ctx.font = '14px "Courier New", monospace';
  const footer = view.confirmDelete
    ? 'Enter deletes the selected slot - Escape cancels'
    : 'Arrow keys choose - Enter starts - Escape returns';
  ctx.fillText(footer, w / 2, h - 28);
}

export function drawRuntimeShell(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const save = view.save;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, 'ANIMAL RESCUE', Math.min(620, w - 34), 40, 24);
  ctx.fillText('ANIMAL RESCUE', w / 2, h * 0.2);

  ctx.fillStyle = '#eef6dc';
  fitText(ctx, 'RPG runtime ready', Math.min(500, w - 40), 26, 16);
  ctx.fillText('RPG runtime ready', w / 2, h * 0.34);

  ctx.font = '17px "Courier New", monospace';
  ctx.fillStyle = '#cbd9bb';
  ctx.fillText(`Slot ${save.slot + 1} - ${save.currentZone}`, w / 2, h * 0.46);
  ctx.fillText(`Level ${save.player.level}  HP ${save.player.hp}/${save.player.maxHp}`, w / 2, h * 0.54);
  ctx.fillText('Press Escape to save and return', w / 2, h * 0.66);
}

