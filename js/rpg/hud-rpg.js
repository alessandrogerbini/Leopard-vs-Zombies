/**
 * @module rpg/hud-rpg
 * @description Canvas 2D HUD and menu drawing for the Animal Rescue RPG alpha.
 *
 * Dependencies: save-system.js
 * Exports: drawSaveSelect, drawRuntimeShell, drawHub, drawDialogue,
 *   drawQuestBoard, drawWorldMap, drawZone, drawInventory, drawCrafting, drawRewardBanner,
 *   getSaveSlotLayout, hitTestSaveSlot
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

function drawTopBar(ctx, title, subtitle = '') {
  const w = ctx.canvas.width;
  ctx.fillStyle = 'rgba(9, 18, 16, 0.82)';
  roundedRect(ctx, 18, 16, w - 36, 58, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 214, 107, 0.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, title, Math.min(420, w - 78), 24, 16);
  ctx.fillText(title, 38, 50);

  if (subtitle) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d8e4c5';
    fitText(ctx, subtitle, Math.min(360, w * 0.45), 15, 11, '"Courier New", monospace', 'normal');
    ctx.fillText(subtitle, w - 38, 49);
  }
}

function drawHubGround(ctx, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.52;
  ctx.fillStyle = '#29452a';
  roundedRect(ctx, cx - 220, cy - 128, 440, 256, 8);
  ctx.fill();
  ctx.strokeStyle = '#82a36d';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#2f6a38';
  for (let i = 0; i < 11; i++) {
    const x = cx - 205 + i * 41;
    ctx.fillRect(x, cy + 118, 18, 5);
  }
}

function hubPoint(w, h, x, z) {
  return {
    x: w * 0.5 + x * 58,
    y: h * 0.52 + z * 42,
  };
}

function drawHubToken(ctx, point, label, color, selected) {
  ctx.fillStyle = selected ? '#fff1a6' : color;
  roundedRect(ctx, point.x - 42, point.y - 18, 84, 36, 8);
  ctx.fill();
  ctx.strokeStyle = selected ? '#f5d66b' : 'rgba(255,255,255,0.34)';
  ctx.lineWidth = selected ? 3 : 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = selected ? '#1b2419' : '#f4f8ec';
  fitText(ctx, label, 72, 12, 9);
  ctx.fillText(label, point.x, point.y + 4);
}

export function drawHub(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const hub = view.hub;
  const focus = view.focusItem;
  const activeQuest = view.activeQuest;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'Rescue Hub', activeQuest ? activeQuest.objective : 'Safe camp');
  drawHubGround(ctx, w, h);

  hub.interactables.forEach(item => {
    const point = hubPoint(w, h, item.x, item.z);
    drawHubToken(ctx, point, item.label, '#3b6350', focus?.id === item.id);
  });

  hub.npcs.forEach(npc => {
    const point = hubPoint(w, h, npc.x, npc.z);
    drawHubToken(ctx, point, npc.name.split(' ')[0], '#7b5e35', focus?.id === npc.id);
  });

  ctx.fillStyle = 'rgba(8, 15, 14, 0.84)';
  roundedRect(ctx, 22, h - 122, w - 44, 84, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 228, 197, 0.35)';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, focus ? focus.label : 'Hub', w - 72, 18, 12);
  ctx.fillText(focus ? focus.label : 'Hub', 42, h - 88);
  ctx.fillStyle = '#d8e4c5';
  ctx.font = '14px "Courier New", monospace';
  const prompt = activeQuest
    ? `${activeQuest.title}: ${activeQuest.destinationZone}`
    : 'Quest board ready: The Hero Sign-Up Sheet';
  ctx.fillText(prompt, 42, h - 58);
}

export function drawDialogue(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const dialogue = view.dialogue;
  drawHub(ctx, view);

  ctx.fillStyle = 'rgba(5, 10, 11, 0.9)';
  roundedRect(ctx, Math.max(24, w * 0.12), Math.max(110, h * 0.22), Math.min(720, w * 0.76), 160, 8);
  ctx.fill();
  ctx.strokeStyle = '#f5d66b';
  ctx.lineWidth = 3;
  ctx.stroke();

  const x = Math.max(44, w * 0.12 + 24);
  const y = Math.max(110, h * 0.22);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, dialogue.name, Math.min(660, w * 0.68), 22, 15);
  ctx.fillText(dialogue.name, x, y + 42);

  ctx.fillStyle = '#eef6dc';
  ctx.font = '18px "Courier New", monospace';
  dialogue.lines.forEach((line, index) => {
    ctx.fillText(line, x, y + 82 + index * 28);
  });
}

export function drawQuestBoard(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const available = view.questBoard.available;
  const selectedQuest = view.questBoard.selectedQuest || 0;
  const activeQuest = view.activeQuest;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'Quest Board', activeQuest ? `Active: ${activeQuest.title}` : 'Forest Edge');

  const x = Math.max(28, w * 0.12);
  const y = Math.max(112, h * 0.22);
  const panelW = Math.min(720, w - x * 2);
  const panelH = Math.min(320, h - y - 62);
  ctx.fillStyle = 'rgba(8, 15, 14, 0.86)';
  roundedRect(ctx, x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = '#82a36d';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  if (available.length === 0) {
    ctx.fillStyle = '#eef6dc';
    fitText(ctx, 'No new board quests', panelW - 46, 24, 16);
    ctx.fillText('No new board quests', x + 24, y + 58);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#cbd9bb';
    ctx.fillText(activeQuest ? activeQuest.objective : 'Check back after helping Forest Edge.', x + 24, y + 94);
    return;
  }

  available.forEach((quest, index) => {
    const rowY = y + 28 + index * 94;
    ctx.fillStyle = index === selectedQuest ? '#243a22' : '#16251d';
    roundedRect(ctx, x + 18, rowY, panelW - 36, 78, 8);
    ctx.fill();
    ctx.strokeStyle = index === selectedQuest ? '#f5d66b' : 'rgba(216, 228, 197, 0.25)';
    ctx.stroke();

    ctx.fillStyle = index === selectedQuest ? '#fff1a6' : '#eef6dc';
    fitText(ctx, quest.title, panelW - 76, 20, 14);
    ctx.fillText(quest.title, x + 38, rowY + 30);
    ctx.fillStyle = '#cbd9bb';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(`Destination: ${quest.destinationZone}`, x + 38, rowY + 52);
    ctx.fillText(quest.rewardPreview, x + 300, rowY + 52);
  });
}

export function drawWorldMap(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const entries = view.worldMap.entries;
  const selected = view.worldMap.selectedMapEntry || 0;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'World Map', 'Alpha route');

  const cols = w >= 760 ? 3 : 2;
  const gap = 14;
  const margin = Math.max(24, Math.min(54, w * 0.08));
  const cardW = Math.floor((w - margin * 2 - gap * (cols - 1)) / cols);
  const cardH = w >= 760 ? 102 : 88;
  const startY = Math.max(104, h * 0.22);

  entries.forEach((entry, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = margin + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const isSelected = index === selected;
    ctx.fillStyle = entry.unlocked ? (isSelected ? '#243a22' : '#1a2b1f') : '#251e25';
    roundedRect(ctx, x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#f5d66b' : entry.unlocked ? '#6da85f' : '#8b6e7a';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = entry.unlocked ? '#eef6dc' : '#d5bbc6';
    fitText(ctx, entry.label, cardW - 28, 18, 12);
    ctx.fillText(entry.label, x + 14, y + 32);
    ctx.fillStyle = entry.unlocked ? '#b7e36a' : '#c9a7b4';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(entry.unlocked ? 'Open' : entry.reason, x + 14, y + 62);
  });
}

export function drawZone(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const combat = view.combat;
  const save = view.save;
  const activeQuest = view.activeQuest;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'Forest Edge', activeQuest ? activeQuest.objective : 'Training path');

  const arenaX = Math.max(34, w * 0.12);
  const arenaY = Math.max(102, h * 0.22);
  const arenaW = Math.min(720, w - arenaX * 2);
  const arenaH = Math.min(282, h - arenaY - 118);
  ctx.fillStyle = '#274f31';
  roundedRect(ctx, arenaX, arenaY, arenaW, arenaH, 8);
  ctx.fill();
  ctx.strokeStyle = '#85b26e';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d66b';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText(`${combat.enemiesAlive} tutorial zombies`, arenaX + arenaW / 2, arenaY + 36);

  const spacing = arenaW / 4;
  for (let i = 0; i < 3; i++) {
    const defeated = i < combat.defeatedEnemies;
    const x = arenaX + spacing * (i + 1);
    const y = arenaY + arenaH * 0.52;
    ctx.fillStyle = defeated ? '#536352' : '#5d7f49';
    roundedRect(ctx, x - 32, y - 38, 64, 76, 8);
    ctx.fill();
    ctx.strokeStyle = defeated ? '#8fa08c' : '#cde3a4';
    ctx.stroke();
    ctx.fillStyle = defeated ? '#ccd2c4' : '#1b2419';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(defeated ? 'OK' : 'Z', x, y + 8);
  }

  ctx.fillStyle = '#e8a828';
  roundedRect(ctx, arenaX + arenaW / 2 - 34, arenaY + arenaH - 78, 68, 56, 8);
  ctx.fill();
  ctx.strokeStyle = '#fff1a6';
  ctx.stroke();

  const hpW = Math.min(420, w - 72);
  const hpX = (w - hpW) / 2;
  const hpY = h - 78;
  ctx.fillStyle = 'rgba(9, 18, 16, 0.88)';
  roundedRect(ctx, hpX, hpY, hpW, 42, 8);
  ctx.fill();
  ctx.fillStyle = '#41242a';
  ctx.fillRect(hpX + 14, hpY + 15, hpW - 28, 12);
  ctx.fillStyle = '#e95858';
  ctx.fillRect(hpX + 14, hpY + 15, (hpW - 28) * (combat.playerHp / combat.playerMaxHp), 12);
  ctx.strokeStyle = '#d8e4c5';
  ctx.strokeRect(hpX + 14, hpY + 15, hpW - 28, 12);
  ctx.fillStyle = '#eef6dc';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText(`HP ${combat.playerHp}/${combat.playerMaxHp}  ATK ${save.player.attack}`, w / 2, hpY + 36);
}

export function drawInventory(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const save = view.save;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'Inventory', `Weapon: ${save.equipped.weapon || 'empty paws'}`);

  const x = Math.max(30, w * 0.16);
  const y = Math.max(110, h * 0.22);
  ctx.fillStyle = 'rgba(8, 15, 14, 0.86)';
  roundedRect(ctx, x, y, w - x * 2, Math.min(300, h - y - 58), 8);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eef6dc';
  ctx.font = '17px "Courier New", monospace';
  Object.entries(save.ingredients).forEach(([id, amount], index) => {
    ctx.fillText(`${id}: ${amount}`, x + 26, y + 42 + index * 30);
  });
  ctx.fillStyle = '#f5d66b';
  ctx.fillText(`Gear: ${save.inventory.join(', ') || 'none'}`, x + 250, y + 42);
}

export function drawCrafting(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const recipes = view.crafting.recipes;
  const selected = view.crafting.selectedRecipe || 0;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTopBar(ctx, 'Crafting Bench', view.crafting.message || 'Four alpha recipes');

  const x = Math.max(28, w * 0.12);
  const y = Math.max(102, h * 0.2);
  const rowH = 68;
  ctx.textAlign = 'left';
  recipes.forEach((recipe, index) => {
    const rowY = y + index * (rowH + 10);
    ctx.fillStyle = index === selected ? '#243a22' : '#16251d';
    roundedRect(ctx, x, rowY, w - x * 2, rowH, 8);
    ctx.fill();
    ctx.strokeStyle = index === selected ? '#f5d66b' : 'rgba(216, 228, 197, 0.25)';
    ctx.stroke();
    ctx.fillStyle = index === selected ? '#fff1a6' : '#eef6dc';
    fitText(ctx, recipe.label, w - x * 2 - 34, 18, 13);
    ctx.fillText(recipe.label, x + 18, rowY + 28);
    ctx.fillStyle = '#cbd9bb';
    ctx.font = '13px "Courier New", monospace';
    const cost = Object.entries(recipe.cost).map(([id, amount]) => `${id} ${amount}`).join(', ');
    ctx.fillText(cost, x + 18, rowY + 50);
  });
}

export function drawRewardBanner(ctx, banner) {
  if (!banner) return;
  const w = ctx.canvas.width;
  const x = Math.max(24, w * 0.18);
  const y = 86;
  const panelW = Math.min(620, w - x * 2);
  const panelH = 76 + Math.min(3, banner.lines.length) * 20;
  ctx.fillStyle = 'rgba(6, 12, 10, 0.92)';
  roundedRect(ctx, x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = '#f5d66b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, banner.questTitle || banner.title, panelW - 36, 22, 15);
  ctx.fillText(banner.questTitle || banner.title, x + panelW / 2, y + 34);
  ctx.fillStyle = '#eef6dc';
  ctx.font = '14px "Courier New", monospace';
  banner.lines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, x + panelW / 2, y + 60 + index * 20);
  });
}
