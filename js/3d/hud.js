/**
 * @module 3d/hud
 * @description HUD (Heads-Up Display) overlay rendering for the 3D Roguelike Survivor mode.
 *
 * This module contains all 2D canvas drawing code for the HUD overlay that sits on top of
 * the 3D scene. It is a pure rendering module -- it only reads game state to draw, never
 * writes it. Extracted from game3d.js as part of the modular decomposition.
 *
 * The HUD renders different elements based on game state:
 * - Normal gameplay: HP/XP bars, weapon slots, howls, wave/score, powerups, items, augments, minimap labels
 * - Pause menu: dark overlay with Resume/Restart/Main Menu cards
 * - Upgrade menu: dark overlay with weapon/howl/upgrade cards and reroll indicator
 * - Game over: score summary, name entry, and leaderboard display
 *
 * Dependencies: Three.js (global), 3d/constants.js (game constants)
 * Exports: 1 -- drawHUD(ctx, s, deps)
 */

import {
  WEAPON_TYPES, HOWL_TYPES, ITEMS_3D, ITEM_RARITIES, SHRINE_AUGMENTS, ZOMBIE_TIERS, WEARABLES_3D,
  MAP_HALF,
  CHARGE_SHRINE_TIME,
} from './constants.js?v=12';

const GAME_FONT = '"Fredoka One", "Comic Sans MS", "Arial Rounded MT Bold", sans-serif';

/**
 * Draw the full HUD overlay on the 2D canvas.
 * Renders different elements based on game state:
 *
 * **Normal Gameplay:**
 * - HP bar (top-left, color-coded by health percentage)
 * - XP bar (below HP bar)
 * - Level + animal name display
 * - Weapon slot bars with cooldown fill (left side)
 * - Howl counts (right side below timer)
 * - Wave + score display (top-right)
 * - Game timer (top-right)
 * - Wave warning countdown (center, with red overlay)
 * - Active powerup indicator + timer bar (top-center)
 * - Equipped items list (bottom-left)
 * - Shield bracelet cooldown indicator
 * - Floating 3D texts (projected to screen space)
 * - Augment + totem display (right side)
 * - Crate/item labels when Aviator Glasses equipped
 * - Controls hint (bottom-center)
 * - Power attack charge meter (bottom-center when charging)
 *
 * **Pause Menu:** Dark overlay with 3 card options (Resume/Restart/Main Menu)
 * **Upgrade Menu:** Dark overlay with up to 3 upgrade cards + reroll indicator
 * **Game Over:** Score summary, name entry, and leaderboard display
 *
 * @param {CanvasRenderingContext2D} ctx - The HUD canvas 2D context.
 * @param {State3D} s - The game state object (read-only access).
 * @param {Object} deps - External dependencies that the HUD reads but does not own.
 * @param {number} deps.W - Canvas width in pixels.
 * @param {number} deps.H - Canvas height in pixels.
 * @param {Object} deps.animalData - Animal selection data (name, color).
 * @param {THREE.Camera} deps.camera - The 3D camera used for world-to-screen projection.
 * @param {function} deps.getWeaponCooldown - Returns effective cooldown for a weapon instance.
 * @param {function} deps.getGroundAt - Returns terrain height at world (x, z).
 * @param {boolean} [deps.audioMuted] - Whether audio is currently muted.
 * @param {number} [deps.audioVolume] - Current audio volume (0.0 - 1.0).
 * @param {Object} [deps.inputState] - Isolated input flags (BD-25: charging, chargeTime, etc.).
 */

// BD-165: Reuse a single Vector3 for HUD world-to-screen projections
const _v = new THREE.Vector3();

/**
 * BD-232: Draw a simplified zombie silhouette icon using canvas 2D primitives.
 * Mirrors the box-primitive construction of actual zombie models.
 * Higher tiers get larger icons; tiers 7+ get spike triangles on shoulders.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {number} cx - Center X position.
 * @param {number} cy - Center Y position.
 * @param {number} scale - Icon scale factor (increases with tier).
 * @param {string} color - CSS color string for the zombie body.
 * @param {number} tierIdx - Zero-based tier index (0-9).
 */
function drawZombieTierIcon(ctx, cx, cy, scale, color, tierIdx) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(-8, -10, 16, 20);
  // Head
  ctx.fillRect(-6, -20, 12, 12);
  // Arms (raised menacing pose)
  ctx.fillRect(-14, -8, 6, 14);
  ctx.fillRect(8, -8, 6, 14);
  // Legs
  ctx.fillRect(-6, 10, 5, 12);
  ctx.fillRect(1, 10, 5, 12);
  // Eyes (glowing)
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, -17, 3, 3);
  ctx.fillRect(1, -17, 3, 3);
  // Tiers 7+ (index 6+): spike triangles on shoulders
  if (tierIdx >= 6) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(-17, -18);
    ctx.lineTo(-8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(17, -18);
    ctx.lineTo(14, -8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawHUD(ctx, s, deps) {
  const { W, H, animalData, camera, getWeaponCooldown, getGroundAt } = deps;
  ctx.clearRect(0, 0, W, H);

  // --- Normal Gameplay HUD ---
  if (!s.gameOver && !s.upgradeMenu && !s.chargeShrineMenu) {
    // Enable text shadow for all HUD text
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // --- HP Bar (top-left) ---
    ctx.fillStyle = '#222'; ctx.fillRect(20, 20, 220, 30);
    const hpRatio = Math.max(0, s.hp / s.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(20, 20, 220 * hpRatio, 30);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(20, 20, 220, 30);
    // Pulsing red border when HP below 25%
    if (hpRatio < 0.25) {
      ctx.strokeStyle = `rgba(255,0,0, ${0.4 + 0.4 * Math.sin(Date.now() * 0.008)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, 224, 34);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px ' + GAME_FONT; ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.ceil(s.hp)}/${s.maxHp}`, 25, 41);

    // --- XP Bar (below HP) ---
    ctx.fillStyle = '#222'; ctx.fillRect(20, 56, 200, 22);
    const xpRatio = s.xp / s.xpToNext;
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(20, 56, 200 * xpRatio, 22);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 56, 200, 22);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px ' + GAME_FONT;
    ctx.fillText(`XP: ${s.xp}/${s.xpToNext}`, 25, 72);

    // --- Level + Animal Name ---
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px ' + GAME_FONT;
    ctx.fillText(`LVL ${s.level}`, 20, 98);
    ctx.fillStyle = animalData.color; ctx.font = 'bold 16px ' + GAME_FONT;
    ctx.fillText(animalData.name, 20, 116);

    // --- Weapon Slot Bars (left side, below level) ---
    let wy = 135;
    for (let wi = 0; wi < s.weapons.length; wi++) {
      const w = s.weapons[wi];
      const def = WEAPON_TYPES[w.typeId];
      const cdRatio = Math.max(0, w.cooldownTimer / getWeaponCooldown(w));
      // Background
      ctx.fillStyle = '#222'; ctx.fillRect(20, wy, 160, 24);
      // Cooldown fill
      ctx.fillStyle = def.color + '88'; ctx.fillRect(20, wy, 160 * (1 - cdRatio), 24);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 160, 24);
      // Name
      ctx.fillStyle = def.color; ctx.font = 'bold 16px ' + GAME_FONT; ctx.textAlign = 'left';
      ctx.fillText(`${def.name} Lv${w.level}`, 24, wy + 17);
      wy += 28;
    }
    // Empty slots
    for (let wi = s.weapons.length; wi < s.maxWeaponSlots; wi++) {
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(20, wy, 160, 24);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 160, 24);
      ctx.fillStyle = '#666'; ctx.font = 'bold 16px ' + GAME_FONT; ctx.textAlign = 'left';
      ctx.fillText('[EMPTY SLOT]', 24, wy + 17);
      wy += 28;
    }

    // --- Wave + Score + Timer (top-right) ---
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 22px ' + GAME_FONT;
    ctx.fillText(`WAVE ${s.wave}`, W - 20, 35);
    if (s.waveEventTimer !== undefined && s.waveWarning <= 0) {
      const progress = Math.max(0, Math.min(1, 1 - (s.waveEventTimer / (s.waveTimerMax || 90))));
      ctx.fillStyle = 'rgba(255,100,68,0.3)';
      ctx.fillRect(W - 20 - 60, 40, 60 * progress, 3);
    }
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px ' + GAME_FONT;
    ctx.fillText(`SCORE: ${s.score}`, W - 20, 55);
    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px ' + GAME_FONT;
    ctx.fillText(timeStr, W - 20, 75);

    // --- Wave Warning Countdown (top-center, below HP/XP bars) ---
    if (s.waveWarning > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.06)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2222';
      ctx.font = 'bold 36px ' + GAME_FONT;
      ctx.fillText(`WAVE ${s.wave + 1} INCOMING`, W / 2, H * 0.15);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 48px ' + GAME_FONT;
      ctx.fillText(Math.ceil(s.waveWarning).toString(), W / 2, H * 0.22);
      ctx.textAlign = 'left';
    }
    // --- Active Powerup Indicator (top-center) ---
    if (s.activePowerup) {
      const pw = s.activePowerup;
      ctx.fillStyle = pw.def.color; ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`${pw.def.name} (${Math.ceil(pw.timer)}s)`, W / 2, 40);
      // Timer bar
      const barW = 150, barH = 12;
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - barW / 2, 46, barW, barH);
      ctx.fillStyle = pw.def.color;
      ctx.fillRect(W / 2 - barW / 2, 46, barW * (pw.timer / pw.def.duration), barH);
      // BD-253: Show powerup effect subtitle for clarity
      if (pw.def.id === 'giantGrowth') {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText('DMG x2', W / 2, 72);
      }
    }

    // --- Equipped Items (bottom-left) ---
    // Layout: Regular items as compact text list above, wearable equipment panel below.

    // === WEARABLE EQUIPMENT PANEL (bottom-left) ===
    {
      const SLOT_SIZE = 55;
      const SLOT_GAP = 8;
      const PANEL_PAD = 8;
      const PANEL_X = 14;
      const PANEL_W = PANEL_PAD * 2 + SLOT_SIZE * 3 + SLOT_GAP * 2;
      const PANEL_H = PANEL_PAD + SLOT_SIZE + 34 + PANEL_PAD; // slot + name + effect + padding
      const PANEL_Y = H - PANEL_H - 26; // above controls hint
      const BORDER_W = 3;

      // Wearable slot definitions: reads from s.wearables (head/body/feet)
      const wearSlots = [
        {
          key: 'head', label: 'HEAD', flashKey: 'head',
          getId: () => s.wearables ? s.wearables.head : null,
          drawSilhouette: (cx, cy) => {
            // Hat/triangle shape
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx - 14, cy + 6);
            ctx.lineTo(cx + 14, cy + 6);
            ctx.closePath();
            ctx.fill();
            // Brim
            ctx.fillRect(cx - 16, cy + 6, 32, 4);
          }
        },
        {
          key: 'body', label: 'BODY', flashKey: 'body',
          getId: () => s.wearables ? s.wearables.body : null,
          drawSilhouette: (cx, cy) => {
            // T-shirt/body shape (single path, no clearRect)
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy - 12);   // left of neckline
            ctx.lineTo(cx - 10, cy - 12);  // left shoulder inner
            ctx.lineTo(cx - 16, cy - 10);  // left shoulder outer
            ctx.lineTo(cx - 16, cy - 2);   // left arm bottom
            ctx.lineTo(cx - 10, cy - 2);   // left arm inner
            ctx.lineTo(cx - 10, cy + 12);  // left body bottom
            ctx.lineTo(cx + 10, cy + 12);  // right body bottom
            ctx.lineTo(cx + 10, cy - 2);   // right arm inner
            ctx.lineTo(cx + 16, cy - 2);   // right arm bottom
            ctx.lineTo(cx + 16, cy - 10);  // right shoulder outer
            ctx.lineTo(cx + 10, cy - 12);  // right shoulder inner
            ctx.lineTo(cx + 4, cy - 12);   // right of neckline
            ctx.quadraticCurveTo(cx, cy - 8, cx - 4, cy - 12); // neckline curve
            ctx.closePath();
            ctx.fill();
          }
        },
        {
          key: 'feet', label: 'FEET', flashKey: 'feet',
          getId: () => s.wearables ? s.wearables.feet : null,
          drawSilhouette: (cx, cy) => {
            // Boot shape (left)
            ctx.fillRect(cx - 14, cy - 8, 8, 16);
            ctx.fillRect(cx - 16, cy + 4, 14, 6);
            // Boot shape (right)
            ctx.fillRect(cx + 6, cy - 8, 8, 16);
            ctx.fillRect(cx + 4, cy + 4, 14, 6);
          }
        }
      ];

      // Semi-transparent panel background
      const cornerR = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.moveTo(PANEL_X + cornerR, PANEL_Y);
      ctx.lineTo(PANEL_X + PANEL_W - cornerR, PANEL_Y);
      ctx.quadraticCurveTo(PANEL_X + PANEL_W, PANEL_Y, PANEL_X + PANEL_W, PANEL_Y + cornerR);
      ctx.lineTo(PANEL_X + PANEL_W, PANEL_Y + PANEL_H - cornerR);
      ctx.quadraticCurveTo(PANEL_X + PANEL_W, PANEL_Y + PANEL_H, PANEL_X + PANEL_W - cornerR, PANEL_Y + PANEL_H);
      ctx.lineTo(PANEL_X + cornerR, PANEL_Y + PANEL_H);
      ctx.quadraticCurveTo(PANEL_X, PANEL_Y + PANEL_H, PANEL_X, PANEL_Y + PANEL_H - cornerR);
      ctx.lineTo(PANEL_X, PANEL_Y + cornerR);
      ctx.quadraticCurveTo(PANEL_X, PANEL_Y, PANEL_X + cornerR, PANEL_Y);
      ctx.closePath();
      ctx.fill();

      // BD-209: Subtle pulsing glow border around wearable panel
      const pulseAlpha = 0.2 + 0.3 * Math.sin(Date.now() / 1500 * Math.PI);
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(PANEL_X - 1, PANEL_Y - 1, PANEL_W + 2, PANEL_H + 2);

      // Draw each wearable slot
      for (let si = 0; si < wearSlots.length; si++) {
        const ws = wearSlots[si];
        const slotX = PANEL_X + PANEL_PAD + si * (SLOT_SIZE + SLOT_GAP);
        const slotY = PANEL_Y + PANEL_PAD;
        const itemId = ws.getId();
        const itemDef = itemId ? WEARABLES_3D[itemId] || null : null;
        const rarityColor = itemDef ? (ITEM_RARITIES[itemDef.rarity] || ITEM_RARITIES.common).color : '#333333';
        const flashTimer = s.wearableFlash ? s.wearableFlash[ws.flashKey] || 0 : 0;

        // Slot background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(slotX, slotY, SLOT_SIZE, SLOT_SIZE);

        // Equip flash overlay (bright rarity-colored, fading)
        if (flashTimer > 0) {
          const flashAlpha = (flashTimer / 1.5) * 0.6;
          ctx.fillStyle = rarityColor;
          ctx.globalAlpha = flashAlpha;
          ctx.fillRect(slotX, slotY, SLOT_SIZE, SLOT_SIZE);
          ctx.globalAlpha = 1;
        }

        if (itemDef) {
          // Filled slot: show colored item indicator
          ctx.fillStyle = rarityColor;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(slotX + 4, slotY + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);
          ctx.globalAlpha = 1;

          // Item icon: use per-item drawIcon if available, else generic silhouette
          const slotCX = slotX + SLOT_SIZE / 2;
          const slotCY = slotY + SLOT_SIZE / 2;
          if (itemDef.drawIcon) {
            ctx.save();
            itemDef.drawIcon(ctx, slotCX, slotCY, 1.3);
            ctx.restore();
          } else {
            ctx.fillStyle = rarityColor;
            ws.drawSilhouette(slotCX, slotCY);
          }

          // Clip text to slot width to prevent overlap into adjacent slots
          ctx.save();
          ctx.beginPath();
          ctx.rect(slotX - 2, slotY + SLOT_SIZE, SLOT_SIZE + 4, 40);
          ctx.clip();

          // Item name below slot
          ctx.textAlign = 'center';
          ctx.fillStyle = rarityColor;
          ctx.font = 'bold 13px ' + GAME_FONT;
          const displayName = itemDef.name.length > 8 ? itemDef.name.slice(0, 7) + '.' : itemDef.name;
          ctx.fillText(displayName, slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE + 14);

          // Effect text below name
          const desc = itemDef.desc || '';
          const displayDesc = desc.length > 10 ? desc.slice(0, 9) + '.' : desc;
          ctx.fillStyle = '#aaaaaa';
          ctx.font = '9px ' + GAME_FONT;
          ctx.fillText(displayDesc, slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE + 26);

          ctx.restore();
        } else {
          // Empty slot: draw silhouette placeholder
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ws.drawSilhouette(slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE / 2);

          // Clip text to slot width
          ctx.save();
          ctx.beginPath();
          ctx.rect(slotX - 2, slotY + SLOT_SIZE, SLOT_SIZE + 4, 40);
          ctx.clip();

          // Slot label below
          ctx.textAlign = 'center';
          ctx.fillStyle = '#444444';
          ctx.font = 'bold 13px ' + GAME_FONT;
          ctx.fillText(ws.label, slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE + 14);

          // Empty hint
          ctx.fillStyle = '#333333';
          ctx.font = '9px ' + GAME_FONT;
          ctx.fillText('empty', slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE + 26);

          ctx.restore();
        }

        // Rarity-colored border (thick)
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = BORDER_W;
        ctx.strokeRect(slotX, slotY, SLOT_SIZE, SLOT_SIZE);
      }

      ctx.textAlign = 'left';

      // === REGULAR ITEMS (compact text list above wearable panel) ===
      // BD-210: Background panel, two-line items with effect descriptions, ITEMS header
      // Collect all visible items first, then render with overflow cap
      const visibleItems = [];
      // Boolean-slot items (non-stackable)
      const boolSlots = ['ring', 'charm', 'vest', 'pendant', 'bracelet', 'gloves', 'cushion', 'turboshoes', 'goldenbone', 'crown', 'zombiemagnet', 'scarf'];
      for (const slot of boolSlots) {
        if (s.items[slot]) {
          const itemDef = ITEMS_3D.find(i => i.slot === slot);
          if (itemDef) {
            const rarityData = ITEM_RARITIES[itemDef.rarity] || ITEM_RARITIES.common;
            visibleItems.push({ name: itemDef.name, desc: itemDef.desc || '', color: rarityData.color, rarity: itemDef.rarity || 'common', rarityName: rarityData.name });
          }
        }
      }
      // Stackable items (show count)
      const stackableIds = ['rubberDucky', 'thickFur', 'sillyStraw', 'bandana', 'hotSauce', 'bouncyBall', 'luckyPenny', 'alarmClock'];
      for (const id of stackableIds) {
        if (s.items[id] > 0) {
          const itemDef = ITEMS_3D.find(i => i.id === id);
          if (itemDef) {
            const rarityData = ITEM_RARITIES[itemDef.rarity] || ITEM_RARITIES.common;
            visibleItems.push({ name: `${itemDef.name} x${s.items[id]}`, desc: itemDef.desc || '', color: rarityData.color, rarity: itemDef.rarity || 'common', rarityName: rarityData.name });
          }
        }
      }
      // Shield bracelet cooldown indicator
      if (s.items.bracelet && !s.shieldBraceletReady) {
        visibleItems.push({ name: `Shield: ${Math.ceil(s.shieldBraceletTimer)}s`, desc: 'Cooldown...', color: '#4488ff' });
      }
      // Render items with background panel, two-line format, and overflow cap
      if (visibleItems.length > 0) {
        const MAX_VISIBLE_ITEMS = 5;
        const itemLineH = 28;
        const ITEMS_PAD = 4;
        const displayCount = Math.min(visibleItems.length, MAX_VISIBLE_ITEMS);
        const hasOverflow = visibleItems.length > MAX_VISIBLE_ITEMS;
        const headerH = 16;
        const panelContentH = headerH + displayCount * itemLineH + (hasOverflow ? 16 : 0);
        const itemsPanelH = panelContentH + ITEMS_PAD * 2;
        const itemsPanelW = 200;
        const itemsPanelX = 16;
        const itemsPanelY = PANEL_Y - 12 - itemsPanelH;

        // Background panel with rounded corners
        const iCornerR = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.moveTo(itemsPanelX + iCornerR, itemsPanelY);
        ctx.lineTo(itemsPanelX + itemsPanelW - iCornerR, itemsPanelY);
        ctx.quadraticCurveTo(itemsPanelX + itemsPanelW, itemsPanelY, itemsPanelX + itemsPanelW, itemsPanelY + iCornerR);
        ctx.lineTo(itemsPanelX + itemsPanelW, itemsPanelY + itemsPanelH - iCornerR);
        ctx.quadraticCurveTo(itemsPanelX + itemsPanelW, itemsPanelY + itemsPanelH, itemsPanelX + itemsPanelW - iCornerR, itemsPanelY + itemsPanelH);
        ctx.lineTo(itemsPanelX + iCornerR, itemsPanelY + itemsPanelH);
        ctx.quadraticCurveTo(itemsPanelX, itemsPanelY + itemsPanelH, itemsPanelX, itemsPanelY + itemsPanelH - iCornerR);
        ctx.lineTo(itemsPanelX, itemsPanelY + iCornerR);
        ctx.quadraticCurveTo(itemsPanelX, itemsPanelY, itemsPanelX + iCornerR, itemsPanelY);
        ctx.closePath();
        ctx.fill();

        // "ITEMS" header
        let iy = itemsPanelY + ITEMS_PAD + 12;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px ' + GAME_FONT;
        ctx.textAlign = 'left';
        ctx.fillText('ITEMS', itemsPanelX + ITEMS_PAD + 2, iy);
        iy += headerH;

        // BD-278: Two-line item entries with rarity border + label
        for (let ii = 0; ii < displayCount; ii++) {
          const item = visibleItems[ii];
          // Rarity color left-border accent (3px wide vertical bar)
          ctx.fillStyle = item.color;
          ctx.fillRect(itemsPanelX + 1, iy - 10, 3, itemLineH - 2);
          // Line 1: Item name in rarity color + small rarity label
          ctx.fillStyle = item.color;
          ctx.font = 'bold 14px ' + GAME_FONT;
          const nameX = itemsPanelX + ITEMS_PAD + 6;
          ctx.fillText(item.name, nameX, iy);
          // Rarity tier label (small, after name)
          if (item.rarityName && item.rarity !== 'common') {
            const nameW = ctx.measureText(item.name).width;
            ctx.font = 'bold 9px ' + GAME_FONT;
            ctx.fillStyle = item.color + 'bb';
            ctx.fillText(item.rarityName.toUpperCase(), nameX + nameW + 4, iy);
          }
          // Line 2: Effect description in gray
          ctx.fillStyle = '#aaaaaa';
          ctx.font = '10px ' + GAME_FONT;
          ctx.fillText(item.desc, nameX, iy + 13);
          iy += itemLineH;
        }
        // Overflow indicator
        if (hasOverflow) {
          ctx.fillStyle = '#888888';
          ctx.font = '13px ' + GAME_FONT;
          ctx.fillText(`+${visibleItems.length - MAX_VISIBLE_ITEMS} more`, itemsPanelX + ITEMS_PAD + 2, iy);
        }
      }
    }


    // --- Floating 3D Texts (projected to screen space) ---
    for (const ft of s.floatingTexts3d) {
      _v.set(ft.x, ft.y, ft.z);
      _v.project(camera);
      const sx = (_v.x * 0.5 + 0.5) * W + (ft.spreadX || 0);
      const sy = (-_v.y * 0.5 + 0.5) * H;
      if (_v.z > 0 && _v.z < 1) {
        ctx.globalAlpha = Math.min(1, ft.life);
        ctx.fillStyle = ft.color; ctx.textAlign = 'center';
        // BD-160: Size hierarchy — important texts are larger and bold
        if (ft.important) {
          ctx.font = 'bold 20px ' + GAME_FONT;
        } else {
          ctx.font = '14px ' + GAME_FONT;
        }
        ctx.fillText(ft.text, sx, sy);
        ctx.globalAlpha = 1;
      }
    }

    // --- Right-side info (below timer): Howls → Augments → Skulls ---
    // Uses a flowing Y cursor so sections never overlap regardless of content.
    {
      ctx.textAlign = 'right';
      let ry = 98; // starts below timer (which ends at Y=75) with gap

      // Howls (powers) — BD-278: colored right-edge accent bar per howl
      const howlEntries = Object.entries(s.howls).filter(([, v]) => v > 0);
      if (howlEntries.length > 0) {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText('YOUR POWERS:', W - 20, ry);
        ry += 18;
        for (const [tid, count] of howlEntries) {
          const def = HOWL_TYPES[tid];
          const shortName = def.name.replace(' HOWL', '');
          // BD-278: Colored accent bar on right edge
          ctx.fillStyle = def.color;
          ctx.fillRect(W - 16, ry - 12, 3, 14);
          ctx.fillStyle = def.color; ctx.font = '16px ' + GAME_FONT;
          ctx.fillText(`${shortName} x${count}`, W - 20, ry);
          ry += 18;
        }
        ry += 8; // gap before next section
      }

      // Augments
      const augKeys = Object.keys(s.augments);
      if (augKeys.length > 0) {
        ctx.fillStyle = '#88ffaa'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText('BOOSTS', W - 20, ry);
        ry += 18;
        for (const aKey of augKeys) {
          const aug = SHRINE_AUGMENTS.find(a => a.id === aKey);
          if (aug) {
            ctx.fillStyle = aug.color; ctx.font = '16px ' + GAME_FONT;
            ctx.fillText(`${aug.name} x${s.augments[aKey]}`, W - 20, ry);
            ry += 18;
          }
        }
        ry += 8; // gap before next section
      }

      // Skulls (totems)
      if (s.totemCount > 0) {
        ctx.fillStyle = '#ff2222'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText(`SKULLS: ${s.totemCount}`, W - 20, ry);
      }

      ctx.textAlign = 'left';
    }

    // --- Crate + Item Labels (Aviator Glasses reveal) ---
    if (s.items.glasses) {
      for (const c of s.powerupCrates) {
        if (!c.alive || !c.showLabel) continue;
        _v.set(c.x, getGroundAt(c.x, c.z) + 1.5, c.z);
        _v.project(camera);
        const sx = (_v.x * 0.5 + 0.5) * W;
        const sy = (-_v.y * 0.5 + 0.5) * H;
        if (_v.z > 0 && _v.z < 1) {
          ctx.fillStyle = c.ptype.color; ctx.font = 'bold 14px ' + GAME_FONT; ctx.textAlign = 'center';
          ctx.fillText(c.ptype.name, sx, sy);
        }
      }
      // Item pickup labels (glasses reveal) — BD-278: rarity label below name
      for (const ip of s.itemPickups) {
        if (!ip.alive) continue;
        _v.set(ip.x, getGroundAt(ip.x, ip.z) + 1.8, ip.z);
        _v.project(camera);
        const sx = (_v.x * 0.5 + 0.5) * W;
        const sy = (-_v.y * 0.5 + 0.5) * H;
        if (_v.z > 0 && _v.z < 1) {
          const ipRarityData = ITEM_RARITIES[ip.itype.rarity] || ITEM_RARITIES.common;
          ctx.fillStyle = ipRarityData.color; ctx.font = 'bold 14px ' + GAME_FONT; ctx.textAlign = 'center';
          ctx.fillText(ip.itype.name, sx, sy);
          // BD-278: Small rarity tier label below item name
          ctx.font = 'bold 9px ' + GAME_FONT;
          ctx.fillText(ipRarityData.name, sx, sy + 12);
        }
      }
      // Wearable pickup labels (glasses reveal) — BD-278: rarity label
      if (s.wearablePickups) {
        for (const wp of s.wearablePickups) {
          if (!wp.alive) continue;
          _v.set(wp.x, getGroundAt(wp.x, wp.z) + 1.8, wp.z);
          _v.project(camera);
          const sx = (_v.x * 0.5 + 0.5) * W;
          const sy = (-_v.y * 0.5 + 0.5) * H;
          if (_v.z > 0 && _v.z < 1) {
            const wpRarityData = ITEM_RARITIES[wp.wearableData.rarity] || ITEM_RARITIES.common;
            ctx.fillStyle = wpRarityData.color; ctx.font = 'bold 14px ' + GAME_FONT; ctx.textAlign = 'center';
            ctx.fillText(wp.wearableData.name, sx, sy);
            // BD-278: Small rarity tier label below wearable name
            ctx.font = 'bold 9px ' + GAME_FONT;
            ctx.fillText(wpRarityData.name, sx, sy + 12);
          }
        }
      }
    }

    // --- Volume / Mute Indicator (bottom-right) ---
    {
      const audioMuted = deps.audioMuted || false;
      const audioVolume = deps.audioVolume != null ? deps.audioVolume : 0.3;
      const vx = W - 100, vy = H - 28;
      ctx.fillStyle = audioMuted ? 'rgba(255,68,68,0.7)' : 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 16px ' + GAME_FONT; ctx.textAlign = 'left';
      const volPct = Math.round(audioVolume * 100);
      const icon = audioMuted ? 'MUTED' : `VOL ${volPct}%`;
      ctx.fillText(icon, vx, vy);
    }

    // --- Charge Shrine Progress Bar ---
    if (s.chargeShrineCurrent && !s.chargeShrineMenu && !s.chargeShrineCurrent.charged) {
      const ratio = Math.min(s.chargeShrineProgress / CHARGE_SHRINE_TIME, 1);
      const rarityColors = { common: '#ffffff', uncommon: '#44ff44', rare: '#4488ff', legendary: '#ff8800' };
      const shrineColor = rarityColors[s.chargeShrineCurrent.rarity] || '#ffffff';
      const barW = 200, barH = 20;
      const bx = W / 2 - barW / 2;
      const by = H - 120;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 4, by - 4, barW + 8, barH + 8);
      ctx.strokeStyle = shrineColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - 4, by - 4, barW + 8, barH + 8);

      // Fill
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = shrineColor;
      ctx.fillRect(bx, by, barW * ratio, barH);

      // Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText('CHARGING SHRINE...', W / 2, by - 10);
      ctx.fillStyle = '#cccccc';
      ctx.font = '14px ' + GAME_FONT;
      ctx.fillText('STAY IN RANGE', W / 2, by + barH + 16);
      ctx.textAlign = 'left';
    }

    // --- Controls Hint (bottom-center, auto-hide after 30s) ---
    // BD-109: Dark background strip so text is legible against any terrain.
    if (s.gameTime < 30) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px ' + GAME_FONT;
      const hintText = 'WASD Move | SPACE Jump | B Attack';
      const hintW = ctx.measureText(hintText).width + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(W / 2 - hintW / 2, H - 28, hintW, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(hintText, W / 2, H - 10);
    }

    // === MINIMAP (BD-76 + BD-97 fog-of-war) ===
    {
      const mmSize = s.showFullMap ? Math.min(W * 0.6, H * 0.6) : 120;
      const mmX = s.showFullMap ? (W - mmSize) / 2 : W - mmSize - 10;
      const mmY = s.showFullMap ? (H - mmSize) / 2 : H - mmSize - 10;
      const mmRange = s.showFullMap ? 140 : 60; // world units visible

      // Black background (unexplored = black)
      ctx.save();
      ctx.globalAlpha = s.showFullMap ? 0.9 : 0.8;
      ctx.fillStyle = '#000000';
      ctx.fillRect(mmX, mmY, mmSize, mmSize);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#4a6a4a';
      ctx.lineWidth = 2;
      ctx.strokeRect(mmX, mmY, mmSize, mmSize);

      // Clip to minimap bounds
      ctx.beginPath();
      ctx.rect(mmX, mmY, mmSize, mmSize);
      ctx.clip();

      const cx = mmX + mmSize / 2;
      const cy = mmY + mmSize / 2;
      const scale = mmSize / (mmRange * 2);

      // BD-97: Draw revealed fog-of-war cells
      const fogCell = 4; // must match game3d.js fog cell size
      const fogLosRadius = 30; // current LOS radius in world units
      if (s.fogRevealed && s.fogRevealed.size > 0) {
        const cellPx = fogCell * scale;
        // Only iterate cells that could be visible on the minimap
        const cellsInView = Math.ceil(mmRange / fogCell) + 1;
        const playerCellX = Math.floor(s.playerX / fogCell);
        const playerCellZ = Math.floor(s.playerZ / fogCell);

        for (let dcx = -cellsInView; dcx <= cellsInView; dcx++) {
          for (let dcz = -cellsInView; dcz <= cellsInView; dcz++) {
            const gx = playerCellX + dcx;
            const gz = playerCellZ + dcz;
            const key = gx + ',' + gz;
            if (!s.fogRevealed.has(key)) continue;

            // World position of this cell's center
            const worldX = (gx + 0.5) * fogCell;
            const worldZ = (gz + 0.5) * fogCell;

            // Screen position on minimap
            const sx = cx + (worldX - s.playerX) * scale;
            const sz = cy + (worldZ - s.playerZ) * scale;

            // Skip if outside minimap bounds
            if (sx + cellPx < mmX || sx - cellPx > mmX + mmSize ||
                sz + cellPx < mmY || sz - cellPx > mmY + mmSize) continue;

            // Brightness: current LOS area is brighter, explored-but-distant is dimmer
            const distToPlayer = Math.sqrt(
              (worldX - s.playerX) ** 2 + (worldZ - s.playerZ) ** 2
            );
            if (distToPlayer < fogLosRadius) {
              ctx.fillStyle = '#2a4a2a'; // bright — currently visible
            } else {
              ctx.fillStyle = '#152015'; // dim — explored but not in LOS
            }
            ctx.fillRect(sx - cellPx / 2, sz - cellPx / 2, cellPx, cellPx);
          }
        }
      }

      // BD-98: Draw map boundary edges
      {
        const bx = cx + (-MAP_HALF - s.playerX) * scale;
        const by = cy + (-MAP_HALF - s.playerZ) * scale;
        const bw = MAP_HALF * 2 * scale;
        const bh = MAP_HALF * 2 * scale;
        ctx.strokeStyle = '#557755';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
      }

      // Helper: check if a world position is in a revealed fog cell
      const isRevealed = (wx, wz) => {
        if (!s.fogRevealed) return true; // no fog data = show everything
        return s.fogRevealed.has(Math.floor(wx / fogCell) + ',' + Math.floor(wz / fogCell));
      };

      // Draw enemies as red dots (only in revealed areas)
      if (s.enemies) {
        ctx.fillStyle = '#ff4444';
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (!isRevealed(e.x, e.z)) continue;
          const ex = cx + (e.x - s.playerX) * scale;
          const ez = cy + (e.z - s.playerZ) * scale;
          if (ex >= mmX && ex <= mmX + mmSize && ez >= mmY && ez <= mmY + mmSize) {
            const dotSize = Math.max(2.5, (e.tier || 1) * 0.8);
            ctx.beginPath();
            ctx.arc(ex, ez, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw shrines as purple diamonds (only in revealed areas)
      if (s.chargeShrines) {
        ctx.fillStyle = '#bb66ff';
        for (const sh of s.chargeShrines) {
          if (!isRevealed(sh.x, sh.z)) continue;
          const sx = cx + (sh.x - s.playerX) * scale;
          const sz = cy + (sh.z - s.playerZ) * scale;
          if (sx >= mmX && sx <= mmX + mmSize && sz >= mmY && sz <= mmY + mmSize) {
            ctx.save();
            ctx.translate(sx, sz);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-3, -3, 6, 6);
            ctx.restore();
          }
        }
      }

      // Draw item pickups as yellow dots (only in revealed areas)
      if (s.itemPickups) {
        ctx.fillStyle = '#ffdd44';
        for (const ip of s.itemPickups) {
          if (!isRevealed(ip.x, ip.z)) continue;
          const ix = cx + (ip.x - s.playerX) * scale;
          const iz = cy + (ip.z - s.playerZ) * scale;
          if (ix >= mmX && ix <= mmX + mmSize && iz >= mmY && iz <= mmY + mmSize) {
            ctx.beginPath();
            ctx.arc(ix, iz, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw wearable pickups as magenta diamonds
      if (s.wearablePickups) {
        ctx.fillStyle = '#ff44ff';
        for (const wp of s.wearablePickups) {
          if (!wp.alive) continue;
          const wx = cx + (wp.x - s.playerX) * scale;
          const wz = cy + (wp.z - s.playerZ) * scale;
          if (wx >= mmX && wx <= mmX + mmSize && wz >= mmY && wz <= mmY + mmSize) {
            ctx.save();
            ctx.translate(wx, wz);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
          }
        }
      }

      // Draw powerup crates as blue squares (only in revealed areas)
      if (s.powerupCrates) {
        ctx.fillStyle = '#44aaff';
        for (const pc of s.powerupCrates) {
          if (!isRevealed(pc.x, pc.z)) continue;
          const px = cx + (pc.x - s.playerX) * scale;
          const pz = cy + (pc.z - s.playerZ) * scale;
          if (px >= mmX && px <= mmX + mmSize && pz >= mmY && pz <= mmY + mmSize) {
            ctx.fillRect(px - 2, pz - 2, 4, 4);
          }
        }
      }

      // Draw player as green triangle (pointing up = north)
      ctx.fillStyle = '#44ff44';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 4.5, cy + 4.5);
      ctx.lineTo(cx + 4.5, cy + 4.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Label
      ctx.fillStyle = '#aaffaa';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(s.showFullMap ? '[TAB] Close Map' : '[TAB] Map', mmX + mmSize, mmY - 4);
      ctx.textAlign = 'left';
    }

    // Reset text shadow before charge bar
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // --- Power Attack Charge Bar (big, segmented, color-coded) ---
    // Visible while charging or briefly when fully charged (chargeTime >= 2)
    // BD-25: charging/chargeTime moved from st to inputState
    const _inp = deps.inputState || {};
    if (_inp.charging || _inp.chargeTime >= 2) {
      const ratio = Math.min(_inp.chargeTime / 2, 1);
      const barW = Math.max(200, W * 0.18);  // At least 200px, scales with resolution
      const barH = 28;
      const bx = W / 2 - barW / 2;
      const by = H - 80;
      const segments = 5;
      const segW = barW / segments;
      const segGap = 3;

      // Dark background with border
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 4, by - 4, barW + 8, barH + 8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - 4, by - 4, barW + 8, barH + 8);

      // Draw each segment
      for (let seg = 0; seg < segments; seg++) {
        const segStart = seg / segments;
        const segEnd = (seg + 1) / segments;
        const sx = bx + seg * segW + (seg > 0 ? segGap / 2 : 0);
        const sw = segW - (seg > 0 ? segGap / 2 : 0) - (seg < segments - 1 ? segGap / 2 : 0);

        // Segment background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx, by, sw, barH);

        // Fill segments that the charge has reached
        if (ratio > segStart) {
          const fillRatio = Math.min((ratio - segStart) / (segEnd - segStart), 1);
          // Color based on how far into the bar this segment is
          const segMid = (segStart + segEnd) / 2;
          let segColor;
          if (segMid < 0.33) segColor = '#ffdd00';       // Yellow
          else if (segMid < 0.66) segColor = '#ff8800';   // Orange
          else segColor = '#ff2200';                       // Red

          ctx.fillStyle = segColor;
          ctx.fillRect(sx, by, sw * fillRatio, barH);

          // Bright inner highlight for filled segments
          if (fillRatio >= 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(sx, by, sw, barH * 0.4);
          }
        }

        // Segment border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, by, sw, barH);
      }

      // Outer glow when near full
      if (ratio > 0.8) {
        const glowAlpha = 0.1 + (ratio - 0.8) * 0.5 * (0.5 + 0.5 * Math.sin(Date.now() * 0.01));
        ctx.strokeStyle = `rgba(255, 34, 0, ${glowAlpha})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx - 6, by - 6, barW + 12, barH + 12);
      }

      // Text label: "CHARGING..." or "READY!" flash
      ctx.textAlign = 'center';
      if (ratio >= 1) {
        // Flash READY! with pulsing size and brightness
        const pulse = Math.sin(Date.now() * 0.008);
        const flashOn = pulse > -0.3;
        if (flashOn) {
          const fontSize = 22 + Math.floor(pulse * 4);
          ctx.fillStyle = '#ff2200';
          ctx.font = `bold ${fontSize}px ` + GAME_FONT;
          ctx.fillText('READY!', W / 2, by - 10);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText('CHARGING...', W / 2, by - 10);
      }

      // Percentage readout below bar
      ctx.fillStyle = '#cccccc';
      ctx.font = 'bold 14px ' + GAME_FONT;
      ctx.fillText(`${Math.floor(ratio * 100)}%`, W / 2, by + barH + 16);
    }
  }

  // --- Pause Menu Overlay ---
  if (s.pauseMenu && !s.gameOver && !s.upgradeMenu) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px ' + GAME_FONT;
    ctx.fillText('PAUSED', W / 2, H / 2 - 80);

    const pauseOpts = ['RESUME', 'RESTART', 'MAIN MENU'];
    const pauseColors = ['#44ff44', '#ffaa44', '#ff4444'];
    const cardW = 180, cardH = 90, gap = 25;
    const totalW = pauseOpts.length * cardW + (pauseOpts.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY = H / 2 - 20;

    for (let i = 0; i < pauseOpts.length; i++) {
      const cx = startX + i * (cardW + gap);
      const isSelected = i === s.selectedPauseOption;

      if (isSelected) {
        ctx.fillStyle = pauseColors[i];
        ctx.fillRect(cx - 3, cardY - 3, cardW + 6, cardH + 6);
      }
      ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
      ctx.fillRect(cx, cardY, cardW, cardH);

      ctx.fillStyle = pauseColors[i]; ctx.font = 'bold 24px ' + GAME_FONT;
      ctx.fillText(pauseOpts[i], cx + cardW / 2, cardY + cardH / 2 + 6);

      if (isSelected) {
        const t = Date.now() * 0.003;
        const arrowBob = Math.sin(t * 3) * 4;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(cx + cardW / 2, cardY - 8 + arrowBob);
        ctx.lineTo(cx + cardW / 2 - 8, cardY - 18 + arrowBob);
        ctx.lineTo(cx + cardW / 2 + 8, cardY - 18 + arrowBob);
        ctx.closePath(); ctx.fill();
      }
    }

    ctx.fillStyle = '#aaa'; ctx.font = 'bold 18px ' + GAME_FONT;
    ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
  }

  // --- Upgrade Menu Overlay (weapons / upgrades / howls) ---
  if (s.upgradeMenu && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 32px ' + GAME_FONT;
    ctx.fillText('LEVEL UP!', W / 2, 100);
    ctx.fillStyle = '#ffffff'; ctx.font = '16px ' + GAME_FONT;
    ctx.fillText('Choose:', W / 2, 130);

    const cardW = 200, cardH = 200, gap = 30;
    const totalW = s.upgradeChoices.length * cardW + (s.upgradeChoices.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY = 160;

    // BD-278: Type-based border colors and tier descriptor labels
    const _typeBorderColors = { weapon: '#ff8844', howl: '#aa44ff', heal: '#44ff44' };
    const _typeLabels = { weapon: 'WEAPON', howl: 'HOWL', heal: 'HEAL' };
    const _typeLabelColors = { weapon: '#ff8844', howl: '#aa44ff', heal: '#44ff44' };

    for (let i = 0; i < s.upgradeChoices.length; i++) {
      const u = s.upgradeChoices[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = i === s.selectedUpgrade;

      // BD-278: Colored type border (3px) around every card
      const borderColor = _typeBorderColors[u.upgradeType] || '#666666';
      const borderW = 3;
      ctx.fillStyle = isSelected ? u.color : borderColor;
      ctx.fillRect(cx - borderW, cardY - borderW, cardW + borderW * 2, cardH + borderW * 2);

      ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
      ctx.fillRect(cx, cardY, cardW, cardH);

      // BD-278: Type descriptor label (small, top of card)
      const typeLabel = _typeLabels[u.upgradeType] || '';
      if (typeLabel) {
        ctx.font = 'bold 10px ' + GAME_FONT;
        const typeLabelColor = _typeLabelColors[u.upgradeType] || '#888';
        const tlW = ctx.measureText(typeLabel).width + 8;
        ctx.fillStyle = typeLabelColor + '33';
        ctx.fillRect(cx + cardW / 2 - tlW / 2, cardY + 2, tlW, 14);
        ctx.fillStyle = typeLabelColor;
        ctx.fillText(typeLabel, cx + cardW / 2, cardY + 13);
      }

      // Category badge
      const badgeColors = { 'NEW!': '#ff8844', 'BETTER!': '#44aaff', 'POWER!': '#aa44ff', 'HEAL': '#44ff44' };
      const badgeColor = badgeColors[u.category] || '#666';
      ctx.fillStyle = badgeColor; ctx.font = 'bold 16px ' + GAME_FONT;
      // Badge background
      const badgeW = ctx.measureText(u.category).width + 12;
      ctx.fillStyle = badgeColor + 'aa';
      ctx.fillRect(cx + cardW / 2 - badgeW / 2, cardY + 20, badgeW, 20);
      ctx.fillStyle = badgeColor; ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText(u.category, cx + cardW / 2, cardY + 35);

      // Name
      ctx.fillStyle = u.color; ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText(u.name, cx + cardW / 2, cardY + 70);

      // Description
      ctx.fillStyle = '#cccccc'; ctx.font = '16px ' + GAME_FONT;
      // Word wrap description
      const words = u.desc.split(' ');
      let line = '', lineY = cardY + 105;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > cardW - 20) {
          ctx.fillText(line.trim(), cx + cardW / 2, lineY);
          line = word + ' ';
          lineY += 16;
        } else {
          line = test;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), cx + cardW / 2, lineY);

      if (isSelected) {
        const t = Date.now() * 0.003;
        const arrowBob = Math.sin(t * 3) * 4;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(cx + cardW / 2, cardY - 10 + arrowBob);
        ctx.lineTo(cx + cardW / 2 - 10, cardY - 22 + arrowBob);
        ctx.lineTo(cx + cardW / 2 + 10, cardY - 22 + arrowBob);
        ctx.closePath(); ctx.fill();
      }
    }

    ctx.fillStyle = '#666'; ctx.font = '14px ' + GAME_FONT;
    ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
    {
      const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 22px ' + GAME_FONT;
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, cardY + cardH + 55);
      ctx.globalAlpha = 1;
    }
    // Reroll indicator
    if (s.rerolls > 0) {
      ctx.fillStyle = '#88ccff'; ctx.font = 'bold 18px ' + GAME_FONT;
      ctx.fillText(`Press R for NEW CHOICES! (${s.rerolls} left)`, W / 2, cardY + cardH + 80);
    } else {
      ctx.fillStyle = '#444'; ctx.font = '14px ' + GAME_FONT;
      ctx.fillText('No new choices left', W / 2, cardY + cardH + 80);
    }

    // BD-265: Show current weapons and howls during upgrade menu
    const invY = cardY + cardH + 100;

    // Left side: current weapons
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText('YOUR WEAPONS:', 40, invY);
    let iwY = invY + 18;
    for (let wi = 0; wi < s.weapons.length; wi++) {
      const w = s.weapons[wi];
      const def = WEAPON_TYPES[w.typeId];
      ctx.fillStyle = def.color; ctx.font = '14px ' + GAME_FONT;
      ctx.fillText('\u25A0 ' + def.name + ' Lv' + w.level, 44, iwY);
      iwY += 16;
    }
    for (let wi = s.weapons.length; wi < s.maxWeaponSlots; wi++) {
      ctx.fillStyle = '#555'; ctx.font = '14px ' + GAME_FONT;
      ctx.fillText('\u25A1 [empty slot]', 44, iwY);
      iwY += 16;
    }

    // Right side: current howls
    ctx.textAlign = 'right';
    const upgradeHowlEntries = Object.entries(s.howls).filter(([, v]) => v > 0);
    if (upgradeHowlEntries.length > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
      ctx.fillText('YOUR POWERS:', W - 40, invY);
      let ihY = invY + 18;
      for (const [tid, count] of upgradeHowlEntries) {
        const def = HOWL_TYPES[tid];
        ctx.fillStyle = def.color; ctx.font = '14px ' + GAME_FONT;
        ctx.fillText(def.name.replace(' HOWL', '') + ' x' + count, W - 44, ihY);
        ihY += 16;
      }
    } else {
      ctx.fillStyle = '#555'; ctx.font = '14px ' + GAME_FONT;
      ctx.fillText('No powers yet', W - 40, invY + 18);
    }
    ctx.textAlign = 'left'; // reset
  }

  // --- Charge Shrine Choice Menu ---
  if (s.chargeShrineMenu && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    // Rarity label
    const rarityNames = { common: 'SMALL', uncommon: 'COOL', rare: 'AWESOME', legendary: 'MEGA' };
    const rarityMenuColors = { common: '#ffffff', uncommon: '#44ff44', rare: '#4488ff', legendary: '#ff8800' };
    const csRarity = s.chargeShrineCurrent ? s.chargeShrineCurrent.rarity : 'common';
    const rarColor = rarityMenuColors[csRarity] || '#ffffff';

    ctx.fillStyle = rarColor; ctx.font = 'bold 32px ' + GAME_FONT;
    ctx.fillText('SHRINE ACTIVATED', W / 2, 100);
    ctx.fillStyle = rarColor; ctx.font = 'bold 18px ' + GAME_FONT;
    ctx.fillText(`${rarityNames[csRarity] || 'SMALL'} SHRINE`, W / 2, 130);
    ctx.fillStyle = '#ffffff'; ctx.font = '16px ' + GAME_FONT;
    ctx.fillText('Choose an upgrade:', W / 2, 155);

    const csCardW = 180, csCardH = 120, csGap = 25;
    const csTotalW = s.chargeShrineChoices.length * csCardW + (s.chargeShrineChoices.length - 1) * csGap;
    const csStartX = (W - csTotalW) / 2;
    const csCardY = 180;

    for (let i = 0; i < s.chargeShrineChoices.length; i++) {
      const u = s.chargeShrineChoices[i];
      const cx = csStartX + i * (csCardW + csGap);
      const isSelected = i === s.selectedChargeShrineUpgrade;

      if (isSelected) {
        ctx.fillStyle = u.color;
        ctx.fillRect(cx - 3, csCardY - 3, csCardW + 6, csCardH + 6);
      }
      ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
      ctx.fillRect(cx, csCardY, csCardW, csCardH);

      // Upgrade name (main label)
      ctx.fillStyle = u.color; ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText(u.name, cx + csCardW / 2, csCardY + csCardH / 2 - 2);

      // Subtext description
      if (u.desc) {
        ctx.fillStyle = '#aaaaaa'; ctx.font = '12px ' + GAME_FONT;
        ctx.fillText(u.desc, cx + csCardW / 2, csCardY + csCardH / 2 + 18);
      }

      // Selection arrow
      if (isSelected) {
        const t = Date.now() * 0.003;
        const arrowBob = Math.sin(t * 3) * 4;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(cx + csCardW / 2, csCardY - 10 + arrowBob);
        ctx.lineTo(cx + csCardW / 2 - 8, csCardY - 20 + arrowBob);
        ctx.lineTo(cx + csCardW / 2 + 8, csCardY - 20 + arrowBob);
        ctx.closePath(); ctx.fill();
      }
    }

    ctx.fillStyle = '#666'; ctx.font = '14px ' + GAME_FONT;
    ctx.fillText('<  ARROW KEYS  >', W / 2, csCardY + csCardH + 25);
    {
      const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 22px ' + GAME_FONT;
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, csCardY + csCardH + 55);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  // --- BD-260: Item Fanfare (slot-machine reveal + showcase card) ---
  if (s.itemFanfare && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    const f = s.itemFanfare;
    const rolledItem = f.item;
    const rolledRarity = ITEM_RARITIES[rolledItem.rarity] || ITEM_RARITIES.common;

    if (f.phase === 'rolling') {
      // --- Rolling Phase: Carousel animation ---
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px ' + GAME_FONT;
      ctx.fillText('ITEM FOUND!', W / 2, 80);

      // Carousel area: show 3 items vertically (prev, current, next)
      const carouselCX = W / 2;
      const carouselCY = H / 2 - 20;
      const cardH = 60;
      const cardW = 260;
      const pool = f.rollPool;
      const scrollOffset = f.rollAccum * cardH; // smooth sub-item scrolling

      for (let slot = -1; slot <= 1; slot++) {
        const idx = ((f.rollIndex + slot) % pool.length + pool.length) % pool.length;
        const poolItem = pool[idx];
        const rar = ITEM_RARITIES[poolItem.rarity] || ITEM_RARITIES.common;
        const cy = carouselCY + slot * (cardH + 8) - scrollOffset;

        // Fade adjacent items
        const isCurrent = slot === 0;
        ctx.globalAlpha = isCurrent ? 1.0 : 0.35;

        // Card background
        ctx.fillStyle = '#111118';
        ctx.fillRect(carouselCX - cardW / 2, cy - cardH / 2, cardW, cardH);
        // Rarity border
        ctx.strokeStyle = rar.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(carouselCX - cardW / 2, cy - cardH / 2, cardW, cardH);

        // Item icon: colored square with first letter
        const iconSize = 36;
        const iconX = carouselCX - cardW / 2 + 14;
        const iconY = cy - iconSize / 2;
        ctx.fillStyle = rar.color + '44';
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
        ctx.strokeStyle = rar.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(iconX, iconY, iconSize, iconSize);
        ctx.fillStyle = rar.color;
        ctx.font = 'bold 20px ' + GAME_FONT;
        ctx.fillText(poolItem.name.charAt(0), iconX + iconSize / 2, iconY + iconSize / 2 + 7);

        // Item name
        ctx.fillStyle = rar.color;
        ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText(poolItem.name, carouselCX + 20, cy + 2);

        // Rarity label below name
        ctx.fillStyle = rar.color;
        ctx.font = '11px ' + GAME_FONT;
        ctx.fillText(rar.name, carouselCX + 20, cy + 18);
      }
      ctx.globalAlpha = 1.0;
    } else if (f.phase === 'showcase') {
      // --- Showcase Phase: Large card with item details ---

      // Land flash
      if (f.landFlash > 0) {
        const flashAlpha = Math.min(0.3, f.landFlash / 0.3 * 0.3);
        ctx.fillStyle = rolledRarity.color;
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1.0;
      }

      // Rarity label at top
      ctx.fillStyle = rolledRarity.color; ctx.font = 'bold 16px ' + GAME_FONT;
      const rarityStars = rolledItem.rarity === 'legendary' ? '   ' : (rolledItem.rarity === 'rare' ? '  ' : '');
      ctx.fillText(rarityStars + rolledRarity.name.toUpperCase() + rarityStars, W / 2, 80);

      // Showcase card dimensions
      const scW = 360, scH = f.slotOccupied ? 340 : 240;
      const scX = W / 2 - scW / 2;
      const scY = 100;

      // Card background
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(scX, scY, scW, scH);
      // Rarity border
      ctx.strokeStyle = rolledRarity.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(scX, scY, scW, scH);

      // Item icon: large colored square
      const iconSz = 64;
      const iconCX = W / 2;
      const iconCY = scY + 50;
      ctx.fillStyle = rolledRarity.color + '33';
      ctx.fillRect(iconCX - iconSz / 2, iconCY - iconSz / 2, iconSz, iconSz);
      ctx.strokeStyle = rolledRarity.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(iconCX - iconSz / 2, iconCY - iconSz / 2, iconSz, iconSz);
      // First letter large
      ctx.fillStyle = rolledRarity.color;
      ctx.font = 'bold 32px ' + GAME_FONT;
      ctx.fillText(rolledItem.name.charAt(0), iconCX, iconCY + 12);

      // Item name
      ctx.fillStyle = rolledRarity.color; ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.fillText(rolledItem.name, W / 2, scY + 105);

      // Description (word-wrapped)
      ctx.fillStyle = '#cccccc'; ctx.font = '14px ' + GAME_FONT;
      const descWords = rolledItem.desc.split(' ');
      let descLine = '', descY = scY + 130;
      for (const w of descWords) {
        const test = descLine + w + ' ';
        if (ctx.measureText(test).width > scW - 40) {
          ctx.fillText(descLine.trim(), W / 2, descY);
          descLine = w + ' '; descY += 18;
        } else { descLine = test; }
      }
      if (descLine.trim()) { ctx.fillText(descLine.trim(), W / 2, descY); descY += 18; }

      // Stackable count display
      if (rolledItem.stackable) {
        const currentCount = s.items[rolledItem.id] || 0;
        ctx.fillStyle = '#88ccff'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText('x' + currentCount + '  \u2192  x' + (currentCount + 1), W / 2, descY + 8);
      }

      // Comparison section (if slot occupied, non-stackable)
      if (f.slotOccupied) {
        const compY = scY + 175;
        const compCardW = 150, compCardH = 100, compGap = 30;
        const compTotalW = 2 * compCardW + compGap;
        const compStartX = W / 2 - compTotalW / 2;

        // Divider
        ctx.fillStyle = '#444'; ctx.font = '12px ' + GAME_FONT;
        ctx.fillText('\u2500\u2500 Currently Equipped \u2500\u2500', W / 2, compY);

        const leftX = compStartX;
        const rightX = compStartX + compCardW + compGap;
        const cardTop = compY + 10;

        // Current item card (left)
        const currentItem = ITEMS_3D.find(it => it.id === f.currentItemId);
        const currentRarity = currentItem ? (ITEM_RARITIES[currentItem.rarity] || ITEM_RARITIES.common) : ITEM_RARITIES.common;
        const leftSel = f.choice === 0;

        if (leftSel) {
          ctx.fillStyle = '#44ff44';
          ctx.fillRect(leftX - 2, cardTop - 2, compCardW + 4, compCardH + 4);
        }
        ctx.fillStyle = leftSel ? '#1a1a2a' : '#111118';
        ctx.fillRect(leftX, cardTop, compCardW, compCardH);

        ctx.fillStyle = '#888'; ctx.font = 'bold 10px ' + GAME_FONT;
        ctx.fillText('KEEP', leftX + compCardW / 2, cardTop + 15);
        ctx.fillStyle = currentItem ? currentRarity.color : '#aaa'; ctx.font = 'bold 12px ' + GAME_FONT;
        ctx.fillText(currentItem ? currentItem.name : 'UNKNOWN', leftX + compCardW / 2, cardTop + 38);
        ctx.fillStyle = '#cccccc'; ctx.font = '11px ' + GAME_FONT;
        if (currentItem) ctx.fillText(currentItem.desc, leftX + compCardW / 2, cardTop + 58);

        // New item card (right)
        const rightSel = f.choice === 1;
        if (rightSel) {
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(rightX - 2, cardTop - 2, compCardW + 4, compCardH + 4);
        }
        ctx.fillStyle = rightSel ? '#1a1a2a' : '#111118';
        ctx.fillRect(rightX, cardTop, compCardW, compCardH);

        ctx.fillStyle = '#888'; ctx.font = 'bold 10px ' + GAME_FONT;
        ctx.fillText('EQUIP NEW', rightX + compCardW / 2, cardTop + 15);
        ctx.fillStyle = rolledRarity.color; ctx.font = 'bold 12px ' + GAME_FONT;
        ctx.fillText(rolledItem.name, rightX + compCardW / 2, cardTop + 38);
        ctx.fillStyle = '#cccccc'; ctx.font = '11px ' + GAME_FONT;
        ctx.fillText(rolledItem.desc, rightX + compCardW / 2, cardTop + 58);

        // VS divider
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText('VS', W / 2, cardTop + compCardH / 2 + 6);

        // Selection arrows
        if (leftSel) {
          const t = Date.now() * 0.003;
          const arrowBob = Math.sin(t * 3) * 3;
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(leftX + compCardW / 2, cardTop - 6 + arrowBob);
          ctx.lineTo(leftX + compCardW / 2 - 8, cardTop - 14 + arrowBob);
          ctx.lineTo(leftX + compCardW / 2 + 8, cardTop - 14 + arrowBob);
          ctx.closePath(); ctx.fill();
        }
        if (rightSel) {
          const t = Date.now() * 0.003;
          const arrowBob = Math.sin(t * 3) * 3;
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(rightX + compCardW / 2, cardTop - 6 + arrowBob);
          ctx.lineTo(rightX + compCardW / 2 - 8, cardTop - 14 + arrowBob);
          ctx.lineTo(rightX + compCardW / 2 + 8, cardTop - 14 + arrowBob);
          ctx.closePath(); ctx.fill();
        }
      }

      // Bottom prompts
      const promptY = scY + scH + 20;

      if (f.slotOccupied) {
        ctx.fillStyle = '#666'; ctx.font = '14px ' + GAME_FONT;
        ctx.fillText('<  ARROW KEYS  >', W / 2, promptY);
      }

      // Pulsing ENTER prompt
      {
        const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 22px ' + GAME_FONT;
        const enterText = f.slotOccupied ? 'PRESS ENTER TO SELECT' : 'PRESS ENTER TO ACCEPT';
        ctx.fillText(enterText, W / 2, promptY + 30);
        ctx.globalAlpha = 1;
      }

      // Reroll prompt
      if (!f.isBossForced) {
        if (s.itemFanfareRerolls > 0) {
          ctx.fillStyle = '#88ccff'; ctx.font = 'bold 18px ' + GAME_FONT;
          ctx.fillText('Press R for NEW ROLL! (' + s.itemFanfareRerolls + ' left)', W / 2, promptY + 58);
        } else {
          ctx.fillStyle = '#444'; ctx.font = '14px ' + GAME_FONT;
          ctx.fillText('No rerolls left', W / 2, promptY + 58);
        }
      } else {
        ctx.fillStyle = '#ff8800'; ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText('BOSS REWARD!', W / 2, promptY + 58);
      }
    }
    ctx.textAlign = 'left';
  }

  // --- BD-199: Wearable Comparison Menu ---
  if (s.wearableCompare && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 32px "Courier New"';
    ctx.fillText('REPLACE EQUIPMENT?', W / 2, H / 2 - 130);

    // Look up current and new item data from ITEMS_3D
    const wc = s.wearableCompare;
    const currentItem = ITEMS_3D.find(it => it.id === wc.currentId);
    const newItem = wc.newPickup.itype;
    const currentRarity = currentItem ? (ITEM_RARITIES[currentItem.rarity] || ITEM_RARITIES.common) : ITEM_RARITIES.common;
    const newRarity = ITEM_RARITIES[newItem.rarity] || ITEM_RARITIES.common;

    // Card dimensions
    const wcCardW = 200, wcCardH = 140, wcGap = 60;
    const wcTotalW = 2 * wcCardW + wcGap;
    const wcStartX = (W - wcTotalW) / 2;
    const wcCardY = H / 2 - 90;

    // --- Left card: CURRENT ITEM --- BD-278: rarity-colored border
    const leftX = wcStartX;
    const leftSelected = wc.choice === 0;
    // BD-278: Always draw rarity border (3px), brighten when selected
    const leftBorder = 3;
    ctx.fillStyle = leftSelected ? currentRarity.color : (currentRarity.color + '88');
    ctx.fillRect(leftX - leftBorder, wcCardY - leftBorder, wcCardW + leftBorder * 2, wcCardH + leftBorder * 2);
    // BD-264: dim current card when REPLACE (right) is selected
    ctx.globalAlpha = leftSelected ? 1.0 : 0.5;
    ctx.fillStyle = leftSelected ? '#1a1a2a' : '#111118';
    ctx.fillRect(leftX, wcCardY, wcCardW, wcCardH);

    // "CURRENT" label
    ctx.fillStyle = '#888'; ctx.font = 'bold 12px "Courier New"';
    ctx.fillText('CURRENT', leftX + wcCardW / 2, wcCardY + 18);

    // Item name
    ctx.fillStyle = currentItem ? currentRarity.color : '#aaa'; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(currentItem ? currentItem.name : 'UNKNOWN', leftX + wcCardW / 2, wcCardY + 50);

    // Rarity label
    ctx.fillStyle = currentRarity.color; ctx.font = '13px "Courier New"';
    ctx.fillText(currentRarity.name, leftX + wcCardW / 2, wcCardY + 72);

    // Effect description
    ctx.fillStyle = '#cccccc'; ctx.font = '14px "Courier New"';
    if (currentItem) {
      const descWords = currentItem.desc.split(' ');
      let descLine = '', descY = wcCardY + 95;
      for (const w of descWords) {
        const test = descLine + w + ' ';
        if (ctx.measureText(test).width > wcCardW - 20) {
          ctx.fillText(descLine.trim(), leftX + wcCardW / 2, descY);
          descLine = w + ' '; descY += 16;
        } else { descLine = test; }
      }
      if (descLine.trim()) ctx.fillText(descLine.trim(), leftX + wcCardW / 2, descY);
    }

    // Selection arrow for left card
    if (leftSelected) {
      ctx.globalAlpha = 1.0; // BD-264: ensure selection arrow is full opacity
      const t = Date.now() * 0.003;
      const arrowBob = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(leftX + wcCardW / 2, wcCardY - 10 + arrowBob);
      ctx.lineTo(leftX + wcCardW / 2 - 10, wcCardY - 22 + arrowBob);
      ctx.lineTo(leftX + wcCardW / 2 + 10, wcCardY - 22 + arrowBob);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1.0; // BD-264: restore full opacity after left card

    // --- Right card: NEW ITEM ---
    const rightX = wcStartX + wcCardW + wcGap;
    const rightSelected = wc.choice === 1;
    // BD-278: Always draw rarity border (3px), brighten when selected
    const rightBorder = 3;
    ctx.fillStyle = rightSelected ? newRarity.color : (newRarity.color + '88');
    ctx.fillRect(rightX - rightBorder, wcCardY - rightBorder, wcCardW + rightBorder * 2, wcCardH + rightBorder * 2);
    // BD-264: dim new card when KEEP (left) is selected
    ctx.globalAlpha = rightSelected ? 1.0 : 0.5;
    ctx.fillStyle = rightSelected ? '#1a1a2a' : '#111118';
    ctx.fillRect(rightX, wcCardY, wcCardW, wcCardH);

    // "NEW" label
    ctx.fillStyle = '#888'; ctx.font = 'bold 12px "Courier New"';
    ctx.fillText('NEW', rightX + wcCardW / 2, wcCardY + 18);

    // Item name
    ctx.fillStyle = newRarity.color; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(newItem.name, rightX + wcCardW / 2, wcCardY + 50);

    // Rarity label
    ctx.fillStyle = newRarity.color; ctx.font = '13px "Courier New"';
    ctx.fillText(newRarity.name, rightX + wcCardW / 2, wcCardY + 72);

    // Effect description
    ctx.fillStyle = '#cccccc'; ctx.font = '14px "Courier New"';
    const newDescWords = newItem.desc.split(' ');
    let newDescLine = '', newDescY = wcCardY + 95;
    for (const w of newDescWords) {
      const test = newDescLine + w + ' ';
      if (ctx.measureText(test).width > wcCardW - 20) {
        ctx.fillText(newDescLine.trim(), rightX + wcCardW / 2, newDescY);
        newDescLine = w + ' '; newDescY += 16;
      } else { newDescLine = test; }
    }
    if (newDescLine.trim()) ctx.fillText(newDescLine.trim(), rightX + wcCardW / 2, newDescY);

    // Selection arrow for right card
    if (rightSelected) {
      ctx.globalAlpha = 1.0; // BD-264: ensure selection arrow is full opacity
      const t = Date.now() * 0.003;
      const arrowBob = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(rightX + wcCardW / 2, wcCardY - 10 + arrowBob);
      ctx.lineTo(rightX + wcCardW / 2 - 10, wcCardY - 22 + arrowBob);
      ctx.lineTo(rightX + wcCardW / 2 + 10, wcCardY - 22 + arrowBob);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1.0; // BD-264: restore full opacity after right card

    // --- BD-264: arrow divider between cards ---
    ctx.fillStyle = '#aaaaaa'; ctx.font = 'bold 28px "Courier New"';
    ctx.fillText('\u2192', W / 2, wcCardY + wcCardH / 2 + 6);

    // --- Bottom labels ---
    const labelY = wcCardY + wcCardH + 28;
    ctx.fillStyle = leftSelected ? '#44ff44' : '#666'; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('KEEP CURRENT', leftX + wcCardW / 2, labelY);
    ctx.fillStyle = rightSelected ? '#ffcc00' : '#666'; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('REPLACE', rightX + wcCardW / 2, labelY);

    // Arrow keys hint
    ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
    ctx.fillText('<  ARROW KEYS  >', W / 2, labelY + 25);
    if (Math.sin(Date.now() * 0.005) > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, labelY + 55);
    }
    ctx.textAlign = 'left';
  }

  // BD-231: Death vignette (draws on top of gameplay, under game-over overlay)
  if (s.deathSequence) {
    const progress = 1 - (s.deathSequenceTimer / 1.5);
    const alpha = 0.5 * (1 - progress); // 0.5 → 0.0

    const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
    gradient.addColorStop(0, 'rgba(180, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Game Over Screen (stats + feedback + name entry + leaderboard) ---
  if (s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    // "GAME OVER" title
    let cursorY = 55;
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px ' + GAME_FONT;
    ctx.fillText('GAME OVER', W / 2, cursorY);
    cursorY += 40; // 40px after 48px title

    // --- Stats Panel ---
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 24px ' + GAME_FONT;
    ctx.fillText(`SCORE: ${s.score}`, W / 2, cursorY);
    cursorY += 23; // 23px after 24px score

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText(`${animalData.name} | Level ${s.level} | Wave ${s.wave - 1}`, W / 2, cursorY);
    cursorY += 20; // 20px after 14px info line

    // Time survived
    const goMins = Math.floor(s.gameTime / 60);
    const goSecs = Math.floor(s.gameTime % 60);
    ctx.fillStyle = '#88ccff'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText(`Time: ${String(goMins).padStart(2, '0')}:${String(goSecs).padStart(2, '0')}`, W / 2, cursorY);
    cursorY += 24; // 24px after time line (extra padding before defeated-by)

    // BD-216+232: "DEFEATED BY" line with zombie tier icon and color pill
    if (s.lastDamageSource && s.lastDamageSource.tierName) {
      const srcColor = '#' + (s.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
      const tierIdx = (s.lastDamageSource.tier || 1) - 1;
      const tierText = s.lastDamageSource.tierName.toUpperCase();
      const defText = 'DEFEATED BY: ' + tierText;

      // Measure text for pill sizing
      ctx.font = 'bold 20px ' + GAME_FONT;
      const textW = ctx.measureText(defText).width;

      // BD-232: Zombie tier icon (left of text)
      const iconScale = 1.2 + tierIdx * 0.1;
      const iconCX = W / 2 - textW / 2 - 30 * iconScale;
      const iconCY = cursorY;
      drawZombieTierIcon(ctx, iconCX, iconCY, iconScale, srcColor, tierIdx);

      // BD-232: Dark rounded pill behind tier name
      const pillPad = 10;
      const pillH = 28;
      const pillX = W / 2 - textW / 2 - pillPad;
      const pillY = cursorY - pillH / 2 - 4;
      const pillW = textW + pillPad * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      // BD-249/251: roundRect fallback for older browsers
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();

      // Text on top of pill
      ctx.fillStyle = srcColor;
      ctx.font = 'bold 20px ' + GAME_FONT;
      ctx.fillText(defText, W / 2, cursorY);
      cursorY += 30; // 30px after 20px defeated-by section
    }

    // --- Big total kills line ---
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 28px ' + GAME_FONT;
    ctx.fillText(`YOU DEFEATED ${s.totalKills} ZOMBIES!`, W / 2, cursorY);
    cursorY += 30; // 30px after 28px kills line

    // Kid-friendly tier breakdown (max 4 groups)
    const kidGroups = [
      { label: 'Tiny', from: 0, to: 1 },
      { label: 'Big', from: 2, to: 3 },
      { label: 'Huge', from: 4, to: 5 },
      { label: 'MEGA', from: 6, to: 9 },
    ];
    for (const grp of kidGroups) {
      let count = 0;
      for (let t = grp.from; t <= grp.to && t < s.killsByTier.length; t++) {
        count += s.killsByTier[t] || 0;
      }
      if (count > 0) {
        ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText(`${grp.label}: ${count}`, W / 2, cursorY);
        cursorY += 22; // 22px per tier line
      }
    }

    // Best combo (only show if noteworthy)
    if (s.bestCombo >= 5) {
      ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 13px ' + GAME_FONT;
      ctx.fillText(`Best Combo: x${s.bestCombo}`, W / 2, cursorY);
      cursorY += 18; // 18px after combo
    }

    // --- Feedback Section ---
    cursorY += 8; // 8px padding before feedback
    ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 20px ' + GAME_FONT;
    ctx.fillText('Was that FUN?', W / 2, cursorY);

    const fbOptions = ['YES', 'KINDA', 'NAH'];
    const fbColors = ['#44ff44', '#ffaa44', '#ff4444'];
    const fbGap = 100;
    const fbStartX = W / 2 - fbGap;
    for (let fi = 0; fi < 3; fi++) {
      const fx = fbStartX + fi * fbGap;
      const isSelected = fi === s.feedbackSelection;
      if (isSelected) {
        ctx.fillStyle = fbColors[fi]; ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText(`[${fbOptions[fi]}]`, fx, cursorY + 26);
      } else {
        ctx.fillStyle = '#555'; ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillText(fbOptions[fi], fx, cursorY + 26);
      }
    }
    ctx.fillStyle = '#777'; ctx.font = 'bold 14px ' + GAME_FONT;
    ctx.fillText('<  Arrow Keys to pick  >', W / 2, cursorY + 48);

    // --- Name Entry / Leaderboard (below feedback) ---
    const entryY = cursorY + 70;

    if (s.nameEntryActive) {
      // Name entry
      ctx.fillStyle = '#88ccff'; ctx.font = 'bold 16px ' + GAME_FONT;
      ctx.fillText('ENTER YOUR NAME:', W / 2, entryY);
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px ' + GAME_FONT;
      const cursor = Math.sin(Date.now() * 0.005) > 0 ? '_' : '';
      ctx.fillText(s.nameEntry + cursor, W / 2, entryY + 30);
      ctx.fillStyle = '#888'; ctx.font = 'bold 14px ' + GAME_FONT;
      ctx.fillText('Type name, then ENTER to save', W / 2, entryY + 55);
    } else {
      // Leaderboard (simplified: 3 columns, top 5)
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px ' + GAME_FONT;
      ctx.fillText('LEADERBOARD', W / 2, entryY);
      const lb = s.leaderboard3d;
      if (lb.length > 0) {
        ctx.font = 'bold 16px ' + GAME_FONT;
        ctx.fillStyle = '#aaa';
        ctx.fillText('RANK     NAME        SCORE', W / 2, entryY + 22);
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#888888', '#888888'];
        for (let i = 0; i < Math.min(lb.length, 5); i++) {
          const e = lb[i];
          const rank = String(i + 1).padStart(2);
          const name = (e.name || '???').padEnd(10);
          const score = String(e.score).padStart(6);
          ctx.fillStyle = rankColors[i] || '#888888';
          ctx.font = 'bold 18px ' + GAME_FONT;
          ctx.fillText(`${rank}.  ${name}  ${score}`, W / 2, entryY + 44 + i * 24);
        }
      } else {
        ctx.fillStyle = '#888'; ctx.font = 'bold 14px ' + GAME_FONT;
        ctx.fillText('No scores yet', W / 2, entryY + 34);
      }

      if (Math.sin(Date.now() * 0.005) > 0) {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px ' + GAME_FONT;
        ctx.fillText('PRESS ENTER TO RETURN', W / 2, H - 30);
      }
    }
  }

  // BD-147: Item pickup screen flash
  if (s.itemFlashTimer > 0) {
    const flashAlpha = Math.min(0.2, s.itemFlashTimer / 0.2 * 0.2);
    ctx.fillStyle = s.itemFlashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1.0;
  }

  // BD-147: Item pickup center-screen announcement (BD-260: suppressed during fanfare, BD-278: rarity border + label)
  if (s.itemAnnouncement && !s.itemFanfare) {
    const ann = s.itemAnnouncement;
    const fadeIn = Math.min(1, (2.5 - ann.timer) / 0.2);
    const fadeOut = Math.min(1, ann.timer / 0.3);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;

    const bannerW = 320;
    const bannerH = 70;
    const bx = (W - bannerW) / 2;
    const by = H * 0.3;

    // BD-278: Rarity-colored border (3px)
    const annBorder = 3;
    ctx.fillStyle = ann.color;
    ctx.fillRect(bx - annBorder, by - annBorder, bannerW + annBorder * 2, bannerH + annBorder * 2);

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx, by, bannerW, bannerH);

    // BD-278: Rarity tier label (top of banner)
    const annRarityData = ITEM_RARITIES[ann.rarity] || ITEM_RARITIES.common;
    ctx.fillStyle = ann.color;
    ctx.font = 'bold 10px ' + GAME_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(annRarityData.name.toUpperCase(), W / 2, by + 14);

    // Item name
    ctx.fillStyle = ann.color;
    ctx.font = 'bold 18px ' + GAME_FONT;
    ctx.fillText(ann.name, W / 2, by + 36);

    // Effect description
    ctx.fillStyle = '#cccccc';
    ctx.font = '13px ' + GAME_FONT;
    ctx.fillText(ann.desc, W / 2, by + 56);

    ctx.restore();
  }

  // FPS counter (toggle with backtick key) — BD-140
  if (s.showFps && s._fpsDisplay) {
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const fpsColor = s._fpsDisplay >= 50 ? '#00ff00' : s._fpsDisplay >= 30 ? '#ffff00' : '#ff0000';
    ctx.fillStyle = fpsColor;
    ctx.fillText('FPS: ' + s._fpsDisplay, 10, H - 10);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaaaaa';
    const enemies = s.enemies ? s.enemies.length : 0;
    const gems = s.xpGems ? s.xpGems.length : 0;
    const texts = s.floatingTexts3d ? s.floatingTexts3d.length : 0;
    ctx.fillText('E:' + enemies + ' G:' + gems + ' T:' + texts, 10, H - 26);
    ctx.restore();
  }

  ctx.textAlign = 'left';
}
