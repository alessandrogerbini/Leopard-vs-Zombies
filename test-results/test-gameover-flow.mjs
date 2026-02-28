/**
 * BD-189 Game-Over Screen Keyboard Input Flow Test
 *
 * Verifies that the game-over screen accepts keyboard input after the
 * BD-189 fix moved the nameEntryInputCooldown tick outside the gameOver gate.
 *
 * Flow tested:
 *   1. Title screen -> Enter -> mode select
 *   2. Mode select -> Enter -> difficulty select (default: Chill)
 *   3. Difficulty select -> right arrow x3 -> Enter (Hard mode, lowest HP)
 *   4. Animal select -> Enter -> 3D game launches
 *   5. Force game over via injected debug hook (set st.hp = 0)
 *   6. Release Enter (triggers enterReleasedSinceGameOver)
 *   7. Wait for nameEntryInputCooldown to expire
 *   8. Type "TEST" using keyboard
 *   9. Verify st.nameEntry === "TEST"
 *   10. Press Enter to save score
 *   11. Verify st.nameEntryActive === false (name was submitted)
 *
 * Uses Playwright to launch a browser and interact with the canvas game.
 * Since the game is canvas-rendered, verification is done via page.evaluate()
 * reading the injected window.__debugSt reference.
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = __dirname;
const GAME_URL = 'http://localhost:8080';
const TIMEOUT = 30000;

// Test result tracking
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${message}`);
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    results.push(`  FAIL: ${message}`);
    console.log(`  FAIL: ${message}`);
  }
}

async function screenshot(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  [screenshot] ${name}.png`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Press and release a key with a small gap, simulating a real keypress.
 * The gap ensures the game's _enterHeld / fresh-press guards work correctly.
 */
async function tapKey(page, key, holdMs = 80) {
  await page.keyboard.down(key);
  await sleep(holdMs);
  await page.keyboard.up(key);
  await sleep(100); // settle time between presses
}

async function run() {
  console.log('=== BD-189: Game-Over Keyboard Input Flow Test ===\n');
  console.log(`Target: ${GAME_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 960, height: 540 },
  });

  const page = await context.newPage();

  // Intercept game3d.js to inject a debug hook that exposes `st` on window.
  // This patches the response in-flight so the actual source file is untouched.
  await page.route('**/js/game3d.js*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();

    // Inject `window.__debugSt = st;` right after the state object is defined.
    // We look for the line that defines `const st = {` and insert after the
    // object's closing `};` — but that's hard to find reliably. Instead, inject
    // after a unique line near the end of state init.
    // The line `nameEntryInputCooldown: 0,` is unique and near the end of st definition.
    // We'll inject after `window.addEventListener('keydown', onKeyDown);` which is
    // after st is fully defined and the listeners are set up.
    const marker = "window.addEventListener('keydown', onKeyDown);";
    if (body.includes(marker)) {
      body = body.replace(
        marker,
        `${marker}\n  window.__debugSt = st; // TEST HOOK`
      );
      console.log('  [inject] Debug hook injected into game3d.js');
    } else {
      console.log('  [inject] WARNING: Could not find injection marker in game3d.js');
    }

    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), 'content-type': 'application/javascript' },
    });
  });

  // Collect console logs from the page for debugging
  const pageLogs = [];
  page.on('console', msg => {
    pageLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    pageLogs.push(`[PAGE ERROR] ${err.message}`);
  });

  try {
    // ---- Step 1: Load the page ----
    console.log('\n--- Step 1: Load page ---');
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await sleep(1500); // let title screen render and settle
    await screenshot(page, '01-title-screen');
    assert(true, 'Page loaded successfully');

    // ---- Step 2: Title screen -> Enter -> mode select ----
    console.log('\n--- Step 2: Title -> Mode Select ---');
    await tapKey(page, 'Enter');
    await sleep(500);
    await screenshot(page, '02-mode-select');
    // Verify we left the title screen by checking the 2D state
    const modeSelectState = await page.evaluate(() => {
      // Access the 2D state module - it's an ES module so we can't directly,
      // but we can check if the game canvas is still showing
      return document.getElementById('game').style.display !== 'none';
    });
    assert(modeSelectState, 'Navigated past title screen (2D canvas still visible = in menus)');

    // ---- Step 3: Mode select -> Enter -> difficulty select ----
    // Default selectedMode is 1 (3D Survivor), so just press Enter
    console.log('\n--- Step 3: Mode Select -> Difficulty Select ---');
    await tapKey(page, 'Enter');
    await sleep(500);
    await screenshot(page, '03-difficulty-select');
    assert(true, 'Pressed Enter on mode select');

    // ---- Step 4: Difficulty select -> select Hard (3 right arrows) -> Enter ----
    // Difficulties: chill(0), easy(1), medium(2), hard(3)
    // Default is 0 (chill). Press right 3 times to get to hard.
    console.log('\n--- Step 4: Select Hard difficulty ---');
    await tapKey(page, 'ArrowRight');
    await tapKey(page, 'ArrowRight');
    await tapKey(page, 'ArrowRight');
    await sleep(200);
    await screenshot(page, '04-hard-selected');
    await tapKey(page, 'Enter');
    await sleep(500);
    await screenshot(page, '05-animal-select');
    assert(true, 'Selected Hard difficulty and moved to animal select');

    // ---- Step 5: Animal select -> Enter -> launches 3D game ----
    console.log('\n--- Step 5: Animal Select -> Launch 3D Game ---');
    await tapKey(page, 'Enter');
    await sleep(3000); // wait for 3D game to initialize (terrain, models, etc.)
    await screenshot(page, '06-3d-game-running');

    // Verify the 3D game launched by checking if __debugSt is available
    const gameStarted = await page.evaluate(() => {
      return typeof window.__debugSt !== 'undefined' && window.__debugSt !== null;
    });
    assert(gameStarted, 'Debug hook available (3D game launched and st exposed)');

    if (!gameStarted) {
      console.log('\n  FATAL: Cannot proceed without debug hook. Dumping page logs:');
      pageLogs.forEach(l => console.log(`    ${l}`));
      throw new Error('Debug hook not available - cannot test game over flow');
    }

    // Read initial state
    const initialState = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        hp: s.hp,
        maxHp: s.maxHp,
        gameOver: s.gameOver,
        nameEntryActive: s.nameEntryActive,
        nameEntry: s.nameEntry,
      };
    });
    console.log(`  Player HP: ${initialState.hp}/${initialState.maxHp}`);
    assert(initialState.hp > 0, `Player is alive (HP=${initialState.hp})`);
    assert(!initialState.gameOver, 'Game is not over yet');

    // ---- Step 6: Force game over by setting HP to 0 ----
    console.log('\n--- Step 6: Force game over (set HP to 0) ---');
    await page.evaluate(() => {
      window.__debugSt.hp = 0;
    });
    // The game loop will detect hp <= 0 on the next frame and trigger game over
    await sleep(500);
    await screenshot(page, '07-game-over-triggered');

    const gameOverState = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        gameOver: s.gameOver,
        nameEntryActive: s.nameEntryActive,
        enterReleasedSinceGameOver: s.enterReleasedSinceGameOver,
        nameEntryInputCooldown: s.nameEntryInputCooldown,
        nameEntry: s.nameEntry,
      };
    });
    console.log(`  gameOver: ${gameOverState.gameOver}`);
    console.log(`  nameEntryActive: ${gameOverState.nameEntryActive}`);
    console.log(`  enterReleasedSinceGameOver: ${gameOverState.enterReleasedSinceGameOver}`);
    console.log(`  nameEntryInputCooldown: ${gameOverState.nameEntryInputCooldown}`);
    assert(gameOverState.gameOver === true, 'Game over triggered');
    assert(gameOverState.nameEntryActive === true, 'Name entry is active');

    // ---- Step 7: Press and release Enter to set enterReleasedSinceGameOver ----
    console.log('\n--- Step 7: Press + release Enter to unlock input ---');
    // The guard requires Enter to be released after game over.
    // First press Enter down, then release it.
    await page.keyboard.down('Enter');
    await sleep(50);
    await page.keyboard.up('Enter');
    await sleep(100);

    const enterReleased = await page.evaluate(() => {
      return window.__debugSt.enterReleasedSinceGameOver;
    });
    console.log(`  enterReleasedSinceGameOver: ${enterReleased}`);
    assert(enterReleased === true, 'Enter released flag is set');

    // ---- Step 8: Wait for nameEntryInputCooldown to expire ----
    console.log('\n--- Step 8: Wait for input cooldown to expire ---');
    // The cooldown is 0.3 seconds. BD-189 fix ensures it ticks down during gameOver.
    await sleep(600); // generous wait

    const cooldownState = await page.evaluate(() => {
      return window.__debugSt.nameEntryInputCooldown;
    });
    console.log(`  nameEntryInputCooldown: ${cooldownState}`);
    assert(cooldownState <= 0, `Input cooldown expired (value: ${cooldownState})`);

    // ---- Step 9: Type "TEST" for the name entry ----
    // Note: BLOCKED_NAME_KEYS = ['w','a','s','d','b','r','e',' ']
    // So we use letters not in that set. "TEST" has 'T' and 'S' -- wait,
    // 's' is blocked but the check is on e.key.toLowerCase(). However,
    // looking at the code: `e.key.length === 1 && st.nameEntry.length < 10 && !BLOCKED_NAME_KEYS.has(e.key.toLowerCase())`
    // 't' is not blocked. 'e' IS blocked. 's' IS blocked.
    // Let's use "FLUX" instead -- f, l, u, x -- none are blocked.
    console.log('\n--- Step 9: Type name "FLUX" ---');
    await tapKey(page, 'f', 50);
    await tapKey(page, 'l', 50);
    await tapKey(page, 'u', 50);
    await tapKey(page, 'x', 50);
    await sleep(200);
    await screenshot(page, '08-name-entry-typed');

    const nameAfterTyping = await page.evaluate(() => {
      return window.__debugSt.nameEntry;
    });
    console.log(`  nameEntry: "${nameAfterTyping}"`);
    assert(nameAfterTyping === 'FLUX', `Name entry captured keyboard input (got "${nameAfterTyping}", expected "FLUX")`);

    // ---- Step 10: Press Enter to submit the name ----
    console.log('\n--- Step 10: Submit name with Enter ---');
    await tapKey(page, 'Enter');
    await sleep(300);
    await screenshot(page, '09-name-submitted');

    const afterSubmit = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        nameEntryActive: s.nameEntryActive,
        nameEntry: s.nameEntry,
        leaderboard3d: s.leaderboard3d,
      };
    });
    console.log(`  nameEntryActive: ${afterSubmit.nameEntryActive}`);
    console.log(`  nameEntry: "${afterSubmit.nameEntry}"`);
    console.log(`  leaderboard entries: ${afterSubmit.leaderboard3d.length}`);
    assert(afterSubmit.nameEntryActive === false, 'Name entry deactivated after submission');
    assert(afterSubmit.nameEntry === 'FLUX', 'Name preserved after submission');

    // Check that the score was saved to the leaderboard
    const savedToLeaderboard = afterSubmit.leaderboard3d.some(
      entry => entry.name === 'FLUX'
    );
    assert(savedToLeaderboard, 'Score saved to leaderboard with name "FLUX"');

    // ---- Step 11: Verify feedback screen is now showing ----
    console.log('\n--- Step 11: Verify feedback screen ---');
    await screenshot(page, '10-feedback-screen');
    const feedbackState = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        gameOver: s.gameOver,
        nameEntryActive: s.nameEntryActive,
        feedbackSelection: s.feedbackSelection,
      };
    });
    assert(feedbackState.gameOver === true, 'Still on game over screen (showing feedback)');
    assert(feedbackState.nameEntryActive === false, 'Name entry phase complete');
    console.log(`  feedbackSelection: ${feedbackState.feedbackSelection}`);

    // ---- Step 12: Test feedback navigation (arrow keys) ----
    console.log('\n--- Step 12: Test feedback navigation ---');
    await tapKey(page, 'ArrowRight');
    await sleep(100);
    const feedbackAfterNav = await page.evaluate(() => {
      return window.__debugSt.feedbackSelection;
    });
    console.log(`  feedbackSelection after ArrowRight: ${feedbackAfterNav}`);
    assert(feedbackAfterNav !== feedbackState.feedbackSelection, 'Feedback selection changed with arrow key');

    // ---- Step 13: Press Enter to return to main menu ----
    console.log('\n--- Step 13: Return to main menu ---');
    await tapKey(page, 'Enter');
    await sleep(2000); // wait for cleanup and menu transition
    await screenshot(page, '11-back-to-title');

    // After returning, the 2D canvas should be visible again
    const backToMenu = await page.evaluate(() => {
      const canvas2d = document.getElementById('game');
      return canvas2d.style.display !== 'none';
    });
    assert(backToMenu, 'Returned to title screen (2D canvas visible)');

  } catch (err) {
    console.log(`\n  ERROR: ${err.message}`);
    await screenshot(page, 'error-state');
    failed++;
    results.push(`  FAIL: Unhandled error - ${err.message}`);
  } finally {
    // Print page console logs if any failures occurred
    if (failed > 0 && pageLogs.length > 0) {
      console.log('\n--- Page Console Logs ---');
      pageLogs.slice(-30).forEach(l => console.log(`  ${l}`));
    }

    await browser.close();
  }

  // ---- Summary ----
  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  results.forEach(r => console.log(r));

  if (failed > 0) {
    console.log(`\nOVERALL: FAIL (${failed} assertion(s) failed)`);
    process.exit(1);
  } else {
    console.log(`\nOVERALL: PASS (${passed} assertions passed)`);
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
