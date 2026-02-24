const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const OUTDIR = '/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/screenshot-ai';
const URL = 'http://localhost:8080';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('Launching system Chrome with GPU flags...');

  // Use system Chrome which may have better GPU/driver support
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--enable-webgl2',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-features=Vulkan',
      '--disable-software-rasterizer'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    console.log('Navigating to game...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(3000);

    // Check WebGL
    const glInfo = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'NO WEBGL';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.VERSION);
    });
    console.log('WebGL renderer:', glInfo);

    // Check for WebGL errors so far
    if (errors.length > 0) {
      console.log('Errors after page load:', errors.join('; '));
    } else {
      console.log('No errors after page load');
    }

    // Screenshot 1: Title screen
    await page.screenshot({ path: `${OUTDIR}/v3-01-title-screen.png` });
    console.log('01 saved');

    // Navigate: Enter -> difficulty select
    await page.keyboard.press('Enter');
    await sleep(2000);
    await page.screenshot({ path: `${OUTDIR}/v3-02-difficulty-select.png` });
    console.log('02 saved');

    // Navigate: Enter -> start game
    await page.keyboard.press('Enter');
    await sleep(5000); // Long wait for 3D init

    // Check if Three.js got a context
    const threeStatus = await page.evaluate(() => {
      const c3d = document.getElementById('game3d');
      if (!c3d) return 'no game3d canvas';
      const gl = c3d.getContext('webgl2') || c3d.getContext('webgl');
      if (gl) return 'webgl context exists on game3d';
      return 'no webgl context on game3d (already taken by Three.js?)';
    });
    console.log('Three.js canvas status:', threeStatus);

    if (errors.length > 0) {
      console.log('Errors after game start:', errors.slice(-5).join('; '));
    }

    await page.screenshot({ path: `${OUTDIR}/v3-03-game-start.png` });
    console.log('03 saved');

    // Gameplay
    await sleep(3000);
    await page.screenshot({ path: `${OUTDIR}/v3-04-early-gameplay.png` });
    console.log('04 saved');

    // Move
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await sleep(3000);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await sleep(1000);
    await page.screenshot({ path: `${OUTDIR}/v3-05-after-movement.png` });
    console.log('05 saved');

    // More gameplay
    await sleep(5000);
    await page.screenshot({ path: `${OUTDIR}/v3-06-mid-gameplay.png` });
    console.log('06 saved');

    // Pause
    await page.keyboard.press('Escape');
    await sleep(1000);
    await page.screenshot({ path: `${OUTDIR}/v3-07-pause-menu.png` });
    console.log('07 saved');

    await page.keyboard.press('Escape');
    await sleep(500);

    // More gameplay
    await page.keyboard.down('s');
    await sleep(3000);
    await page.keyboard.up('s');
    await sleep(5000);
    await page.screenshot({ path: `${OUTDIR}/v3-08-late-gameplay.png` });
    console.log('08 saved');

    console.log('\nAll v3 screenshots taken!');
    if (errors.length > 0) {
      console.log('\n=== All page errors: ===');
      errors.forEach(e => console.log('  ' + e));
    }

  } catch (err) {
    console.error('Error:', err.message);
    try { await page.screenshot({ path: `${OUTDIR}/v3-error.png` }); } catch(e){}
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
