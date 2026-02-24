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
  WEAPON_TYPES, HOWL_TYPES, ITEMS_3D, ITEM_RARITIES, SHRINE_AUGMENTS, ZOMBIE_TIERS,
} from './constants.js';

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
 */
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
    ctx.fillStyle = '#222'; ctx.fillRect(20, 20, 200, 24);
    const hpRatio = Math.max(0, s.hp / s.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(20, 20, 200 * hpRatio, 24);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(20, 20, 200, 24);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.ceil(s.hp)}/${s.maxHp}`, 25, 37);

    // --- XP Bar (below HP) ---
    ctx.fillStyle = '#222'; ctx.fillRect(20, 50, 200, 18);
    const xpRatio = s.xp / s.xpToNext;
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(20, 50, 200 * xpRatio, 18);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 50, 200, 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`XP: ${s.xp}/${s.xpToNext}`, 25, 63);

    // --- Level + Animal Name ---
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 20px "Courier New"';
    ctx.fillText(`LVL ${s.level}`, 20, 88);
    ctx.fillStyle = animalData.color; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(animalData.name, 20, 106);

    // --- Weapon Slot Bars (left side, below level) ---
    let wy = 125;
    for (let wi = 0; wi < s.weapons.length; wi++) {
      const w = s.weapons[wi];
      const def = WEAPON_TYPES[w.typeId];
      const cdRatio = Math.max(0, w.cooldownTimer / getWeaponCooldown(w));
      // Background
      ctx.fillStyle = '#222'; ctx.fillRect(20, wy, 140, 20);
      // Cooldown fill
      ctx.fillStyle = def.color + '88'; ctx.fillRect(20, wy, 140 * (1 - cdRatio), 20);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 140, 20);
      // Name
      ctx.fillStyle = def.color; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText(`${def.name} Lv${w.level}`, 24, wy + 14);
      wy += 24;
    }
    // Empty slots
    for (let wi = s.weapons.length; wi < s.maxWeaponSlots; wi++) {
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(20, wy, 140, 20);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 140, 20);
      ctx.fillStyle = '#444'; ctx.font = '14px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText('[EMPTY SLOT]', 24, wy + 14);
      wy += 24;
    }

    // --- Wave + Score + Timer (top-right) ---
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 22px "Courier New"';
    ctx.fillText(`WAVE ${s.wave}`, W - 20, 35);
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
    ctx.fillText(`SCORE: ${s.score}`, W - 20, 55);
    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(timeStr, W - 20, 75);

    // --- Wave Warning Countdown (center overlay) ---
    if (s.waveWarning > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2222';
      ctx.font = 'bold 36px "Courier New"';
      ctx.fillText(`WAVE ${s.wave + 1} INCOMING`, W / 2, H / 2 - 40);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 48px "Courier New"';
      ctx.fillText(Math.ceil(s.waveWarning).toString(), W / 2, H / 2 + 20);
      ctx.textAlign = 'left';
    }
    // --- Kill Milestone Celebration (BD-195) ---
    if (s.killMilestone) {
      const ms = s.killMilestone;
      const alpha = Math.min(1, ms.timer / 0.5); // fade out in last 0.5s
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      // Glow effect for "GOD MODE!" (white milestone)
      if (ms.color === '#ffffff') {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 30;
      } else {
        ctx.shadowColor = ms.color;
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = ms.color;
      ctx.font = 'bold 52px "Courier New"';
      ctx.fillText(ms.text, W / 2, H / 2 - 80);
      // Sub-line with kill count
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Courier New"';
      ctx.fillText(s.totalKills + ' KILLS!', W / 2, H / 2 - 50);
      ctx.restore();
    }

    // --- Active Powerup Indicator (top-center) ---
    if (s.activePowerup) {
      const pw = s.activePowerup;
      ctx.fillStyle = pw.def.color; ctx.font = 'bold 14px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(`${pw.def.name} (${Math.ceil(pw.timer)}s)`, W / 2, 25);
      // Timer bar
      const barW = 120, barH = 6;
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - barW / 2, 30, barW, barH);
      ctx.fillStyle = pw.def.color;
      ctx.fillRect(W / 2 - barW / 2, 30, barW * (pw.timer / pw.def.duration), barH);
    }

    // --- Equipped Items (bottom-left) ---
    ctx.textAlign = 'left';
    let iy = H - 40;
    if (s.items.armor) {
      const armorDef = ITEMS_3D.find(i => i.id === s.items.armor);
      if (armorDef) {
        const rarityColor = (ITEM_RARITIES[armorDef.rarity] || ITEM_RARITIES.common).color;
        ctx.fillStyle = rarityColor; ctx.font = '15px "Courier New"';
        ctx.fillText(`[${armorDef.name}]`, 20, iy);
        iy -= 18;
      }
    }
    if (s.items.glasses) {
      ctx.fillStyle = ITEM_RARITIES.common.color; ctx.font = '15px "Courier New"';
      ctx.fillText('[AVIATOR GLASSES]', 20, iy);
      iy -= 18;
    }
    if (s.items.boots) {
      const bootDef = ITEMS_3D.find(i => i.id === s.items.boots);
      if (bootDef) {
        const rarityColor = (ITEM_RARITIES[bootDef.rarity] || ITEM_RARITIES.common).color;
        ctx.fillStyle = rarityColor; ctx.font = '15px "Courier New"';
        ctx.fillText(`[${bootDef.name}]`, 20, iy);
        iy -= 18;
      }
    }
    // Boolean-slot items (non-stackable)
    const boolSlots = ['ring', 'charm', 'vest', 'pendant', 'bracelet', 'gloves', 'cushion', 'turboshoes', 'goldenbone', 'crown', 'zombiemagnet', 'scarf'];
    for (const slot of boolSlots) {
      if (s.items[slot]) {
        const itemDef = ITEMS_3D.find(i => i.slot === slot);
        if (itemDef) {
          const rarityColor = (ITEM_RARITIES[itemDef.rarity] || ITEM_RARITIES.common).color;
          ctx.fillStyle = rarityColor; ctx.font = '15px "Courier New"';
          ctx.fillText(`[${itemDef.name}]`, 20, iy);
          iy -= 18;
        }
      }
    }
    // Stackable items (show count)
    const stackableIds = ['rubberDucky', 'thickFur', 'sillyStraw', 'bandana', 'hotSauce', 'bouncyBall', 'luckyPenny', 'alarmClock'];
    for (const id of stackableIds) {
      if (s.items[id] > 0) {
        const itemDef = ITEMS_3D.find(i => i.id === id);
        if (itemDef) {
          const rarityColor = (ITEM_RARITIES[itemDef.rarity] || ITEM_RARITIES.common).color;
          ctx.fillStyle = rarityColor; ctx.font = '15px "Courier New"';
          ctx.fillText(`[${itemDef.name} x${s.items[id]}]`, 20, iy);
          iy -= 18;
        }
      }
    }
    // Shield bracelet cooldown indicator
    if (s.items.bracelet && !s.shieldBraceletReady) {
      ctx.fillStyle = '#4488ff'; ctx.font = '15px "Courier New"';
      ctx.fillText(`Shield: ${Math.ceil(s.shieldBraceletTimer)}s`, 20, iy);
      iy -= 18;
    }

    // --- Floating 3D Texts (projected to screen space) ---
    for (const ft of s.floatingTexts3d) {
      const v = new THREE.Vector3(ft.x, ft.y, ft.z);
      v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * W;
      const sy = (-v.y * 0.5 + 0.5) * H;
      if (v.z > 0 && v.z < 1) {
        ctx.globalAlpha = Math.min(1, ft.life);
        ctx.fillStyle = ft.color; ctx.font = 'bold 18px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText(ft.text, sx, sy);
        ctx.globalAlpha = 1;
      }
    }

    // --- Right-side info (below timer): Howls → Augments → Skulls ---
    // Uses a flowing Y cursor so sections never overlap regardless of content.
    {
      ctx.textAlign = 'right';
      let ry = 98; // starts below timer (which ends at Y=75) with gap

      // Howls
      const howlEntries = Object.entries(s.howls).filter(([, v]) => v > 0);
      if (howlEntries.length > 0) {
        for (const [tid, count] of howlEntries) {
          const def = HOWL_TYPES[tid];
          ctx.fillStyle = def.color; ctx.font = '16px "Courier New"';
          ctx.fillText(`${def.name} x${count}`, W - 20, ry);
          ry += 18;
        }
        ry += 8; // gap before next section
      }

      // Augments
      const augKeys = Object.keys(s.augments);
      if (augKeys.length > 0) {
        ctx.fillStyle = '#88ffaa'; ctx.font = 'bold 16px "Courier New"';
        ctx.fillText('AUGMENTS', W - 20, ry);
        ry += 18;
        for (const aKey of augKeys) {
          const aug = SHRINE_AUGMENTS.find(a => a.id === aKey);
          if (aug) {
            ctx.fillStyle = aug.color; ctx.font = '16px "Courier New"';
            ctx.fillText(`${aug.name} x${s.augments[aKey]}`, W - 20, ry);
            ry += 18;
          }
        }
        ry += 8; // gap before next section
      }

      // Skulls (totems)
      if (s.totemCount > 0) {
        ctx.fillStyle = '#ff2222'; ctx.font = 'bold 16px "Courier New"';
        ctx.fillText(`SKULLS: ${s.totemCount}`, W - 20, ry);
      }

      ctx.textAlign = 'left';
    }

    // --- Crate + Item Labels (Aviator Glasses reveal) ---
    if (s.items.glasses) {
      for (const c of s.powerupCrates) {
        if (!c.alive || !c.showLabel) continue;
        const v = new THREE.Vector3(c.x, getGroundAt(c.x, c.z) + 1.5, c.z);
        v.project(camera);
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        if (v.z > 0 && v.z < 1) {
          ctx.fillStyle = c.ptype.color; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
          ctx.fillText(c.ptype.name, sx, sy);
        }
      }
      // Item pickup labels (glasses reveal)
      for (const ip of s.itemPickups) {
        if (!ip.alive) continue;
        const v = new THREE.Vector3(ip.x, getGroundAt(ip.x, ip.z) + 1.8, ip.z);
        v.project(camera);
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        if (v.z > 0 && v.z < 1) {
          ctx.fillStyle = ip.itype.color; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
          ctx.fillText(ip.itype.name, sx, sy);
        }
      }
    }

    // --- Volume / Mute Indicator (bottom-right) ---
    {
      const audioMuted = deps.audioMuted || false;
      const audioVolume = deps.audioVolume != null ? deps.audioVolume : 0.3;
      const vx = W - 90, vy = H - 28;
      ctx.fillStyle = audioMuted ? 'rgba(255,68,68,0.5)' : 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'left';
      const volPct = Math.round(audioVolume * 100);
      const icon = audioMuted ? 'MUTED' : `VOL ${volPct}%`;
      ctx.fillText(icon, vx, vy);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px "Courier New"';
      ctx.fillText('[M] mute', vx, vy + 12);
    }

    // --- Charge Shrine Progress Bar ---
    if (s.chargeShrineCurrent && !s.chargeShrineMenu && !s.chargeShrineCurrent.charged) {
      const CHARGE_TIME = 4; // Must match CHARGE_SHRINE_TIME constant
      const ratio = Math.min(s.chargeShrineProgress / CHARGE_TIME, 1);
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
      ctx.font = 'bold 16px "Courier New"';
      ctx.fillText('CHARGING SHRINE...', W / 2, by - 10);
      ctx.fillStyle = '#cccccc';
      ctx.font = '14px "Courier New"';
      ctx.fillText('STAY IN RANGE', W / 2, by + barH + 16);
      ctx.textAlign = 'left';
    }

    // --- Controls Hint (bottom-center) ---
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px "Courier New"';
    ctx.fillText('WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause', W / 2, H - 10);

    // === MINIMAP (BD-76) ===
    {
      const mmSize = s.showFullMap ? Math.min(W * 0.6, H * 0.6) : 120;
      const mmX = s.showFullMap ? (W - mmSize) / 2 : W - mmSize - 10;
      const mmY = s.showFullMap ? (H - mmSize) / 2 : H - mmSize - 10;
      const mmRange = s.showFullMap ? 200 : 60; // world units visible

      // Background
      ctx.save();
      ctx.globalAlpha = s.showFullMap ? 0.85 : 0.7;
      ctx.fillStyle = '#1a2a1a';
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

      // Draw fog of war (explored area is lighter)
      // Simple approach: draw a gradient circle around player showing visible area
      const fogGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, mmSize * 0.5);
      fogGrad.addColorStop(0, 'rgba(40,70,40,0.3)');
      fogGrad.addColorStop(0.7, 'rgba(40,70,40,0.0)');
      fogGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(mmX, mmY, mmSize, mmSize);

      // Draw enemies as red dots
      if (s.enemies) {
        ctx.fillStyle = '#ff4444';
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const ex = cx + (e.x - s.playerX) * scale;
          const ez = cy + (e.z - s.playerZ) * scale;
          if (ex >= mmX && ex <= mmX + mmSize && ez >= mmY && ez <= mmY + mmSize) {
            const dotSize = Math.max(1.5, (e.tier || 1) * 0.8);
            ctx.beginPath();
            ctx.arc(ex, ez, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw shrines as purple diamonds
      if (s.chargeShrines) {
        ctx.fillStyle = '#bb66ff';
        for (const sh of s.chargeShrines) {
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

      // Draw item pickups as yellow dots
      if (s.itemPickups) {
        ctx.fillStyle = '#ffdd44';
        for (const ip of s.itemPickups) {
          const ix = cx + (ip.x - s.playerX) * scale;
          const iz = cy + (ip.z - s.playerZ) * scale;
          if (ix >= mmX && ix <= mmX + mmSize && iz >= mmY && iz <= mmY + mmSize) {
            ctx.beginPath();
            ctx.arc(ix, iz, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw powerup crates as blue squares
      if (s.powerupCrates) {
        ctx.fillStyle = '#44aaff';
        for (const pc of s.powerupCrates) {
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
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Label
      ctx.fillStyle = '#aaffaa';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(s.showFullMap ? '[TAB] Close Map' : '[TAB] Map', mmX + mmSize, mmY - 4);
      ctx.textAlign = 'left';
    }

    // Reset text shadow before charge bar
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // --- Power Attack Charge Bar (big, segmented, color-coded) ---
    // Visible while charging or briefly when fully charged (chargeTime >= 2)
    if (s.charging || s.chargeTime >= 2) {
      const ratio = Math.min(s.chargeTime / 2, 1);
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
          ctx.font = `bold ${fontSize}px "Courier New"`;
          ctx.fillText('READY!', W / 2, by - 10);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Courier New"';
        ctx.fillText('CHARGING...', W / 2, by - 10);
      }

      // Percentage readout below bar
      ctx.fillStyle = '#cccccc';
      ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(`${Math.floor(ratio * 100)}%`, W / 2, by + barH + 16);
    }
  }

  // --- Pause Menu Overlay ---
  if (s.pauseMenu && !s.gameOver && !s.upgradeMenu) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px "Courier New"';
    ctx.fillText('PAUSED', W / 2, H / 2 - 80);

    const pauseOpts = ['RESUME', 'RESTART', 'MAIN MENU'];
    const pauseColors = ['#44ff44', '#ffaa44', '#ff4444'];
    const cardW = 160, cardH = 80, gap = 25;
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

      ctx.fillStyle = pauseColors[i]; ctx.font = 'bold 16px "Courier New"';
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

    ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
    ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
  }

  // --- Upgrade Menu Overlay (weapons / upgrades / howls) ---
  if (s.upgradeMenu && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 32px "Courier New"';
    ctx.fillText('LEVEL UP!', W / 2, 100);
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New"';
    ctx.fillText('Choose:', W / 2, 130);

    const cardW = 200, cardH = 200, gap = 30;
    const totalW = s.upgradeChoices.length * cardW + (s.upgradeChoices.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY = 160;

    for (let i = 0; i < s.upgradeChoices.length; i++) {
      const u = s.upgradeChoices[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = i === s.selectedUpgrade;

      if (isSelected) {
        ctx.fillStyle = u.color;
        ctx.fillRect(cx - 3, cardY - 3, cardW + 6, cardH + 6);
      }
      ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
      ctx.fillRect(cx, cardY, cardW, cardH);

      // Category badge
      const badgeColors = { 'NEW WEAPON': '#ff8844', 'UPGRADE': '#44aaff', 'HOWL': '#aa44ff', 'HEAL': '#44ff44' };
      const badgeColor = badgeColors[u.category] || '#666';
      ctx.fillStyle = badgeColor; ctx.font = 'bold 14px "Courier New"';
      // Badge background
      const badgeW = ctx.measureText(u.category).width + 12;
      ctx.fillStyle = badgeColor + '44';
      ctx.fillRect(cx + cardW / 2 - badgeW / 2, cardY + 10, badgeW, 20);
      ctx.fillStyle = badgeColor; ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(u.category, cx + cardW / 2, cardY + 25);

      // Name
      ctx.fillStyle = u.color; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText(u.name, cx + cardW / 2, cardY + 65);

      // Description
      ctx.fillStyle = '#cccccc'; ctx.font = '14px "Courier New"';
      // Word wrap description
      const words = u.desc.split(' ');
      let line = '', lineY = cardY + 100;
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

    ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
    ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
    if (Math.sin(Date.now() * 0.005) > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, cardY + cardH + 55);
    }
    // Reroll indicator
    if (s.rerolls > 0) {
      ctx.fillStyle = '#88ccff'; ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(`[R] REROLL (${s.rerolls} left)`, W / 2, cardY + cardH + 80);
    } else {
      ctx.fillStyle = '#444'; ctx.font = '14px "Courier New"';
      ctx.fillText('No rerolls remaining', W / 2, cardY + cardH + 80);
    }
  }

  // --- Charge Shrine Choice Menu ---
  if (s.chargeShrineMenu && !s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    // Rarity label
    const rarityNames = { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', legendary: 'LEGENDARY' };
    const rarityMenuColors = { common: '#ffffff', uncommon: '#44ff44', rare: '#4488ff', legendary: '#ff8800' };
    const csRarity = s.chargeShrineCurrent ? s.chargeShrineCurrent.rarity : 'common';
    const rarColor = rarityMenuColors[csRarity] || '#ffffff';

    ctx.fillStyle = rarColor; ctx.font = 'bold 32px "Courier New"';
    ctx.fillText('SHRINE ACTIVATED', W / 2, 100);
    ctx.fillStyle = rarColor; ctx.font = 'bold 18px "Courier New"';
    ctx.fillText(`${rarityNames[csRarity] || 'COMMON'} SHRINE`, W / 2, 130);
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New"';
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

      // Upgrade name
      ctx.fillStyle = u.color; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText(u.name, cx + csCardW / 2, csCardY + csCardH / 2 + 6);

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

    ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
    ctx.fillText('<  ARROW KEYS  >', W / 2, csCardY + csCardH + 25);
    if (Math.sin(Date.now() * 0.005) > 0) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, csCardY + csCardH + 55);
    }
    ctx.textAlign = 'left';
  }

  // --- Game Over Screen (stats + feedback + name entry + leaderboard) ---
  if (s.gameOver) {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    // "GAME OVER" title
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px "Courier New"';
    ctx.fillText('GAME OVER', W / 2, 55);

    // --- Stats Panel ---
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 24px "Courier New"';
    ctx.fillText(`SCORE: ${s.score}`, W / 2, 95);
    ctx.fillStyle = '#ffffff'; ctx.font = '14px "Courier New"';
    ctx.fillText(`${animalData.name} | Level ${s.level} | Wave ${s.wave - 1}`, W / 2, 118);

    // Time survived
    const goMins = Math.floor(s.gameTime / 60);
    const goSecs = Math.floor(s.gameTime % 60);
    ctx.fillStyle = '#88ccff'; ctx.font = '14px "Courier New"';
    ctx.fillText(`Time: ${String(goMins).padStart(2, '0')}:${String(goSecs).padStart(2, '0')}`, W / 2, 138);

    // Total kills
    ctx.fillStyle = '#ff8844'; ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`Total Kills: ${s.totalKills}`, W / 2, 158);

    // Kill breakdown by tier (only show tiers with kills)
    let tierY = 174;
    let highestTierName = '';
    const tierEntries = [];
    for (let t = 0; t < s.killsByTier.length; t++) {
      if (s.killsByTier[t] > 0) {
        const tierName = (ZOMBIE_TIERS[t] && ZOMBIE_TIERS[t].name) || `Tier ${t + 1}`;
        tierEntries.push({ name: tierName, count: s.killsByTier[t], tier: t });
        highestTierName = tierName;
      }
    }
    if (tierEntries.length > 0) {
      ctx.fillStyle = '#aa6633'; ctx.font = '11px "Courier New"';
      // Show tier kills in a compact row format
      const tierParts = tierEntries.map(te => `${te.name}: ${te.count}`);
      // Split into rows of 3 to fit the screen
      for (let r = 0; r < tierParts.length; r += 3) {
        const rowText = tierParts.slice(r, r + 3).join('  |  ');
        ctx.fillText(rowText, W / 2, tierY);
        tierY += 14;
      }
    }
    // Highest tier killed
    if (highestTierName) {
      ctx.fillStyle = '#ff6644'; ctx.font = 'bold 12px "Courier New"';
      ctx.fillText(`Strongest Kill: ${highestTierName}`, W / 2, tierY);
      tierY += 18;
    } else {
      tierY += 4;
    }

    // --- Feedback Section ---
    const feedbackY = tierY + 2;
    ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 13px "Courier New"';
    ctx.fillText('Would you play again?', W / 2, feedbackY);

    const fbOptions = ['Yes', 'Maybe', 'No'];
    const fbColors = ['#44ff44', '#ffaa44', '#ff4444'];
    const fbGap = 80;
    const fbStartX = W / 2 - fbGap;
    for (let fi = 0; fi < 3; fi++) {
      const fx = fbStartX + fi * fbGap;
      const isSelected = fi === s.feedbackSelection;
      if (isSelected) {
        ctx.fillStyle = fbColors[fi]; ctx.font = 'bold 14px "Courier New"';
        ctx.fillText(`[${fbOptions[fi]}]`, fx, feedbackY + 18);
      } else {
        ctx.fillStyle = '#555'; ctx.font = '12px "Courier New"';
        ctx.fillText(fbOptions[fi], fx, feedbackY + 18);
      }
    }
    ctx.fillStyle = '#555'; ctx.font = '10px "Courier New"';
    ctx.fillText('<  Arrow Keys to select  >', W / 2, feedbackY + 34);

    // "Most fun moment?" display question
    ctx.fillStyle = '#666'; ctx.font = '11px "Courier New"';
    ctx.fillText('What was your most fun moment? (Tell us on Discord!)', W / 2, feedbackY + 50);

    // --- Name Entry / Leaderboard (below feedback) ---
    const entryY = feedbackY + 70;

    if (s.nameEntryActive) {
      // Name entry
      ctx.fillStyle = '#88ccff'; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText('ENTER YOUR NAME:', W / 2, entryY);
      ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 110, entryY + 8, 220, 32);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px "Courier New"';
      const cursor = Math.sin(Date.now() * 0.005) > 0 ? '_' : '';
      ctx.fillText(s.nameEntry + cursor, W / 2, entryY + 30);
      ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
      ctx.fillText('Type name, then ENTER to save', W / 2, entryY + 55);
    } else {
      // Leaderboard
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText('LEADERBOARD', W / 2, entryY);
      const lb = s.leaderboard3d;
      if (lb.length > 0) {
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#888';
        ctx.fillText('RANK   NAME        SCORE   ANIMAL    LVL  WAVE  TIME', W / 2, entryY + 18);
        for (let i = 0; i < Math.min(lb.length, 10); i++) {
          const e = lb[i];
          const rank = String(i + 1).padStart(2);
          const name = (e.name || '???').padEnd(10);
          const score = String(e.score).padStart(6);
          const animal = (e.animal || '').padEnd(8).slice(0, 8);
          const lvl = String(e.level || 1).padStart(3);
          const wave = String(e.wave || 0).padStart(4);
          const lbTime = e.time ? `${String(Math.floor(e.time/60)).padStart(2,'0')}:${String(Math.floor(e.time%60)).padStart(2,'0')}` : '--:--';
          ctx.fillStyle = i === 0 ? '#ffcc00' : i < 3 ? '#ccaa44' : '#888888';
          ctx.fillText(`${rank}.  ${name}  ${score}   ${animal} ${lvl}  ${wave}  ${lbTime}`, W / 2, entryY + 34 + i * 16);
        }
      } else {
        ctx.fillStyle = '#666'; ctx.font = '13px "Courier New"';
        ctx.fillText('No scores yet', W / 2, entryY + 34);
      }

      if (Math.sin(Date.now() * 0.005) > 0) {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
        ctx.fillText('PRESS ENTER TO RETURN', W / 2, H - 30);
      }
    }
  }

  ctx.textAlign = 'left';
}
