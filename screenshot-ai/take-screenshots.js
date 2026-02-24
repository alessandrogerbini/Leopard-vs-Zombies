const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const OUTDIR = '/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/screenshot-ai';
const URL = 'http://localhost:8080';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Collect console messages for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
  });

  try {
    // 1. Load the page
    console.log('Navigating to game...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Wait a bit for canvas/rendering to initialize
    await page.waitForTimeout(2000);

    // Screenshot 1: Title screen
    console.log('Taking screenshot: 01-title-screen.png');
    await page.screenshot({ path: `${OUTDIR}/01-title-screen.png`, fullPage: false });

    // Check what's on the page - look for canvas elements
    const canvasCount = await page.locator('canvas').count();
    console.log(`Found ${canvasCount} canvas element(s)`);

    // Try to find any text/buttons on the page
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`Page text (first 500 chars): "${bodyText}"`);

    // 2. Try pressing Enter to start the game (title screen -> difficulty select)
    console.log('Pressing Enter to navigate from title screen...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    console.log('Taking screenshot: 02-after-enter.png');
    await page.screenshot({ path: `${OUTDIR}/02-after-enter.png`, fullPage: false });

    // 3. Try pressing Enter again (difficulty select -> game start, or mode select)
    console.log('Pressing Enter again...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    console.log('Taking screenshot: 03-after-second-enter.png');
    await page.screenshot({ path: `${OUTDIR}/03-after-second-enter.png`, fullPage: false });

    // 4. Press Enter one more time in case there's another menu layer
    console.log('Pressing Enter one more time...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    console.log('Taking screenshot: 04-after-third-enter.png');
    await page.screenshot({ path: `${OUTDIR}/04-after-third-enter.png`, fullPage: false });

    // 5. If we're in-game, wait a bit and take another screenshot to see gameplay
    await page.waitForTimeout(3000);
    console.log('Taking screenshot: 05-gameplay-6s.png');
    await page.screenshot({ path: `${OUTDIR}/05-gameplay-6s.png`, fullPage: false });

    // 6. Try moving with WASD for some time then screenshot
    console.log('Simulating WASD movement...');
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.up('w');
    await page.keyboard.down('d');
    await page.waitForTimeout(1000);
    await page.keyboard.up('d');
    await page.waitForTimeout(500);

    console.log('Taking screenshot: 06-after-movement.png');
    await page.screenshot({ path: `${OUTDIR}/06-after-movement.png`, fullPage: false });

    // 7. Wait longer for enemies to appear
    await page.waitForTimeout(5000);
    console.log('Taking screenshot: 07-gameplay-15s.png');
    await page.screenshot({ path: `${OUTDIR}/07-gameplay-15s.png`, fullPage: false });

    // 8. Try pressing Escape for pause menu
    console.log('Pressing Escape for pause menu...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    console.log('Taking screenshot: 08-pause-menu.png');
    await page.screenshot({ path: `${OUTDIR}/08-pause-menu.png`, fullPage: false });

    // Unpause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 9. More gameplay time
    await page.keyboard.down('w');
    await page.keyboard.down('a');
    await page.waitForTimeout(3000);
    await page.keyboard.up('w');
    await page.keyboard.up('a');
    await page.waitForTimeout(2000);

    console.log('Taking screenshot: 09-gameplay-25s.png');
    await page.screenshot({ path: `${OUTDIR}/09-gameplay-25s.png`, fullPage: false });

    console.log('All screenshots taken successfully!');

  } catch (err) {
    console.error('Error during screenshot capture:', err.message);
    // Take an error-state screenshot
    try {
      await page.screenshot({ path: `${OUTDIR}/error-state.png`, fullPage: false });
      console.log('Saved error-state screenshot');
    } catch (e) {
      console.error('Could not save error screenshot:', e.message);
    }
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
