/**
 * @module game-rpg
 * @description Minimal Animal Rescue RPG launcher shell for the alpha startup milestone.
 *
 * Dependencies: shared DOM canvases supplied by game.js
 * Exports: launchRPGGame
 */

export function launchRPGGame(options) {
  const animal = options.animal || { name: 'LEOPARD', color: '#e8a828' };
  const onReturn = typeof options.onReturn === 'function' ? options.onReturn : () => {};
  const canvases = options.canvases || {};
  const canvas3d = canvases.game3d || document.getElementById('game3d');
  const hudCanvas = canvases.hud3d || document.getElementById('hud3d');
  const container = canvases.container || document.getElementById('game-container');
  const canvas2d = canvases.game2d || document.getElementById('game');
  const hudCtx = hudCanvas.getContext('2d');

  let returned = false;

  function resize() {
    const w = Math.max(1, Math.floor(window.innerWidth || 960));
    const h = Math.max(1, Math.floor(window.innerHeight || 540));
    hudCanvas.width = w;
    hudCanvas.height = h;
    drawLaunchScreen();
  }

  function drawLaunchScreen() {
    const w = hudCanvas.width;
    const h = hudCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    hudCtx.clearRect(0, 0, w, h);
    const grad = hudCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#101b13');
    grad.addColorStop(0.5, '#21371d');
    grad.addColorStop(1, '#17151f');
    hudCtx.fillStyle = grad;
    hudCtx.fillRect(0, 0, w, h);

    hudCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 22; i++) {
      const x = (i * 89) % w;
      const y = (i * 47) % h;
      hudCtx.beginPath();
      hudCtx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
      hudCtx.fill();
    }

    hudCtx.textAlign = 'center';
    hudCtx.fillStyle = '#f4d56b';
    hudCtx.font = 'bold 44px "Courier New"';
    hudCtx.fillText('ANIMAL RESCUE', cx, cy - 72);

    hudCtx.fillStyle = animal.color || '#e8a828';
    hudCtx.font = 'bold 26px "Courier New"';
    hudCtx.fillText(animal.name || animal.id || 'HERO', cx, cy - 24);

    hudCtx.fillStyle = '#e7f1d7';
    hudCtx.font = '18px "Courier New"';
    hudCtx.fillText('Quest mode alpha shell', cx, cy + 24);
    hudCtx.fillStyle = '#b8c9a2';
    hudCtx.font = '16px "Courier New"';
    hudCtx.fillText('Press Escape to return', cx, cy + 62);
  }

  function cleanup() {
    if (returned) return false;
    returned = true;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', resize);
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    canvas3d.style.display = 'none';
    hudCanvas.style.display = 'none';
    container.style.width = '960px';
    container.style.height = '540px';
    canvas3d.style.width = '960px';
    canvas3d.style.height = '540px';
    hudCanvas.style.width = '960px';
    hudCanvas.style.height = '540px';
    canvas2d.style.display = '';
    return true;
  }

  function returnToTitle() {
    if (cleanup()) onReturn();
  }

  function onKeyDown(e) {
    if (e.code === 'Escape') {
      e.preventDefault();
      returnToTitle();
    }
  }

  container.style.width = '100vw';
  container.style.height = '100vh';
  canvas2d.style.display = 'none';
  canvas3d.style.display = 'block';
  hudCanvas.style.display = 'block';
  canvas3d.style.width = '100%';
  canvas3d.style.height = '100%';
  hudCanvas.style.width = '100%';
  hudCanvas.style.height = '100%';

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  resize();

  return { cleanup: returnToTitle };
}
