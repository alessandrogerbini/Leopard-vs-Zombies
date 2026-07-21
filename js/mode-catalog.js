/**
 * @module mode-catalog
 * @description Stable startup mode catalog and mode-card hit testing.
 *
 * Dependencies: none
 * Exports: GAME_MODES, getModeByIndex, getModeCardLayout, hitTestModeCard
 */

export const GAME_MODES = [
  {
    id: 'classic2d',
    label: '2D CLASSIC',
    flow: 'classic2d',
    card: {
      lines: ['Tower defense', 'Build and defend', 'Classic levels'],
      palette: { border: '#66bb6a', fill: '#17351f', accent: '#9be28f' }
    }
  },
  {
    id: 'survivor3d',
    label: '3D SURVIVOR',
    flow: 'survivor3d',
    card: {
      lines: ['Open survival', 'Fight zombie waves', 'Collect wild powers'],
      palette: { border: '#ef5350', fill: '#3b1717', accent: '#ffb0a8' }
    }
  },
  {
    id: 'animalRescueRpg',
    label: 'ANIMAL RESCUE',
    flow: 'animalRescueRpg',
    card: {
      lines: ['Quest adventure', 'Save animal friends', 'Craft awesome gear'],
      palette: { border: '#d6a736', fill: '#24351f', accent: '#b7e36a' }
    }
  }
];

export function getModeByIndex(index) {
  const count = GAME_MODES.length;
  const wrapped = ((Math.trunc(index) % count) + count) % count;
  return GAME_MODES[wrapped];
}

export function getModeCardLayout(width, height) {
  const margin = Math.max(18, Math.min(42, width * 0.04));
  const horizontal = width >= 720;
  const gap = horizontal ? Math.max(18, Math.min(32, width * 0.03)) : 14;
  const cards = [];

  if (horizontal) {
    const availableW = width - margin * 2 - gap * (GAME_MODES.length - 1);
    const cardW = Math.min(250, Math.floor(availableW / GAME_MODES.length));
    const cardH = Math.min(240, Math.max(200, height - 190));
    const totalW = cardW * GAME_MODES.length + gap * (GAME_MODES.length - 1);
    const startX = Math.floor((width - totalW) / 2);
    const y = Math.min(122, Math.max(104, height * 0.22));

    GAME_MODES.forEach((mode, index) => {
      cards.push({ mode, index, x: startX + index * (cardW + gap), y, w: cardW, h: cardH });
    });
  } else {
    const cardW = Math.min(width - margin * 2, 330);
    const availableH = height - 142 - gap * (GAME_MODES.length - 1);
    const cardH = Math.max(126, Math.min(158, Math.floor(availableH / GAME_MODES.length)));
    const startY = 106;
    const x = Math.floor((width - cardW) / 2);

    GAME_MODES.forEach((mode, index) => {
      cards.push({ mode, index, x, y: startY + index * (cardH + gap), w: cardW, h: cardH });
    });
  }

  return { cards, horizontal, gap, margin };
}

export function hitTestModeCard(width, height, x, y) {
  const layout = getModeCardLayout(width, height);
  return layout.cards.find(card => (
    x >= card.x && x <= card.x + card.w &&
    y >= card.y && y <= card.y + card.h
  )) || null;
}
