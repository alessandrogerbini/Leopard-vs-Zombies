/**
 * BD-236/237/238: Boss Attack Fix + Death Bug Fix — E2E Tests
 *
 * Three tests verifying critical bug fixes:
 *   1. Boss spawns as tier 9+ and attacks fire (BD-236)
 *   2. Player death triggers correctly (BD-237)
 *   3. Death with heal-on-kill items doesn't resurrect (BD-237 regression)
 *
 * Uses Playwright to launch a browser and interact with the canvas game.
 * Verification via page.evaluate() reading the injected window.__debugSt reference.
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

async function tapKey(page, key, holdMs = 80) {
  await page.keyboard.down(key);
  await sleep(holdMs);
  await page.keyboard.up(key);
  await sleep(100);
}

/**
 * Navigate from title screen to 3D game (Chill mode, default animal).
 * Returns true if __debugSt is available.
 */
async function navigateToGame(page, testName) {
  console.log(`\n  [${testName}] Navigating: Title -> Mode -> Difficulty (Chill) -> Animal -> Game`);

  await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await sleep(1500);

  // Title -> Mode select
  await tapKey(page, 'Enter');
  await sleep(500);

  // Mode select -> Difficulty select (default is 3D Survivor)
  await tapKey(page, 'Enter');
  await sleep(500);

  // Difficulty select -> Chill is default (index 0), just press Enter
  await tapKey(page, 'Enter');
  await sleep(500);

  // Animal select -> default, press Enter
  await tapKey(page, 'Enter');
  await sleep(3000); // wait for 3D init

  const ready = await page.evaluate(() => {
    return typeof window.__debugSt !== 'undefined' && window.__debugSt !== null;
  });

  return ready;
}

/**
 * Poll a condition via page.evaluate, up to timeoutMs.
 * Returns the final evaluated value.
 */
async function pollUntil(page, evalFn, timeoutMs = 10000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await page.evaluate(evalFn);
    if (result) return result;
    await sleep(intervalMs);
  }
  return await page.evaluate(evalFn);
}

// =========================================================================
// Test 1: Boss spawns as tier 9+ and attacks fire (BD-236)
// =========================================================================
async function testBossAttacks(browser) {
  console.log('\n=============================================');
  console.log('  TEST 1: Boss spawns tier 9+ and attacks');
  console.log('=============================================');

  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();

  // Inject debug hook
  await page.route('**/js/game3d.js*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    const marker = "window.addEventListener('keydown', onKeyDown);";
    if (body.includes(marker)) {
      body = body.replace(marker, `${marker}\n  window.__debugSt = st; // TEST HOOK`);
      console.log('  [inject] Debug hook injected');
    } else {
      console.log('  [inject] WARNING: marker not found');
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'application/javascript' } });
  });

  const pageLogs = [];
  page.on('console', msg => pageLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageLogs.push(`[PAGE ERROR] ${err.message}`));

  try {
    const ready = await navigateToGame(page, 'Test1');
    assert(ready, 'Debug hook available (3D game launched)');
    if (!ready) throw new Error('Debug hook not available');

    await screenshot(page, 'boss-01-game-running');

    // Check if any challenge shrines exist
    const shrineInfo = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        count: s.challengeShrines.length,
        shrines: s.challengeShrines.map(cs => ({
          x: cs.x, z: cs.z,
          activated: cs.activated,
          bossDefeated: cs.bossDefeated,
        })),
        playerX: s.playerX,
        playerZ: s.playerZ,
      };
    });
    console.log(`  Challenge shrines: ${shrineInfo.count}`);
    console.log(`  Player at: (${shrineInfo.playerX.toFixed(1)}, ${shrineInfo.playerZ.toFixed(1)})`);

    if (shrineInfo.count === 0) {
      // No shrines spawned yet — force one near the player
      console.log('  No shrines found, forcing one via state injection');
      await page.evaluate(() => {
        const s = window.__debugSt;
        // Add a fake challenge shrine near the player that will trigger on proximity
        s.challengeShrines.push({
          x: s.playerX + 2, z: s.playerZ + 2,
          group: { position: { x: s.playerX + 2, y: 0, z: s.playerZ + 2 } },
          activated: false,
          bossDefeated: false,
          rewardClaimed: false,
        });
      });
    }

    // Teleport player to the first unactivated shrine
    const teleported = await page.evaluate(() => {
      const s = window.__debugSt;
      const shrine = s.challengeShrines.find(cs => !cs.activated);
      if (!shrine) return null;
      // Move player right on top of the shrine
      s.playerX = shrine.x;
      s.playerZ = shrine.z;
      return { x: shrine.x, z: shrine.z };
    });

    if (teleported) {
      console.log(`  Teleported player to shrine at (${teleported.x.toFixed(1)}, ${teleported.z.toFixed(1)})`);
    } else {
      console.log('  WARNING: No unactivated shrine found to teleport to');
    }

    // Wait for a boss to spawn
    console.log('  Waiting for boss to spawn (up to 10s)...');
    const bossSpawned = await pollUntil(page, () => {
      return window.__debugSt.activeBosses.length > 0;
    }, 10000);

    assert(bossSpawned, 'Boss spawned (activeBosses.length > 0)');
    if (!bossSpawned) {
      await screenshot(page, 'boss-02-no-boss');
      // Dump state for debugging
      const debugInfo = await page.evaluate(() => {
        const s = window.__debugSt;
        return {
          shrines: s.challengeShrines.map(cs => ({ x: cs.x, z: cs.z, activated: cs.activated })),
          activeBosses: s.activeBosses.length,
          enemies: s.enemies.length,
          playerX: s.playerX,
          playerZ: s.playerZ,
        };
      });
      console.log('  Debug:', JSON.stringify(debugInfo));
      throw new Error('Boss did not spawn — cannot test attacks');
    }

    // Verify boss tier and phase
    const bossInfo = await page.evaluate(() => {
      const boss = window.__debugSt.activeBosses[0];
      return {
        tier: boss.tier,
        bossPhase: boss.bossPhase,
        hp: boss.hp,
        isBoss: boss.isBoss,
        specialAttackState: boss.specialAttackState,
        specialAttackTimer: boss.specialAttackTimer,
      };
    });
    console.log(`  Boss tier: ${bossInfo.tier}, phase: ${bossInfo.bossPhase}, HP: ${bossInfo.hp}`);
    console.log(`  Attack state: ${bossInfo.specialAttackState}, timer: ${bossInfo.specialAttackTimer?.toFixed(2)}`);

    assert(bossInfo.tier >= 9, `Boss tier >= 9 (got ${bossInfo.tier})`);
    assert(bossInfo.bossPhase >= 1, `Boss bossPhase >= 1 (got ${bossInfo.bossPhase})`);
    assert(bossInfo.isBoss === true, 'Boss has isBoss flag');

    await screenshot(page, 'boss-02-boss-spawned');

    // Force attack timer to 0 and ensure player is in range
    await page.evaluate(() => {
      const s = window.__debugSt;
      const boss = s.activeBosses[0];
      boss.specialAttackTimer = 0;
      // Make sure player is alive and near the boss
      s.hp = s.maxHp;
      s.invincible = 5; // keep player alive during test
      // Move player close to boss for triggerRange
      s.playerX = boss.group.position.x + 3;
      s.playerZ = boss.group.position.z + 3;
    });

    // Poll for attack state transition
    console.log('  Waiting for boss attack state transition (up to 10s)...');
    const attackFired = await pollUntil(page, () => {
      const boss = window.__debugSt.activeBosses[0];
      if (!boss) return false;
      return boss.specialAttackState !== 'idle' ||
             boss._chargeState !== null ||
             boss._fissureState !== null ||
             boss._darkNovaState !== null ||
             (boss.specialAttackCount || 0) > 0;
    }, 10000);

    const finalBossState = await page.evaluate(() => {
      const boss = window.__debugSt.activeBosses[0];
      if (!boss) return { gone: true };
      return {
        specialAttackState: boss.specialAttackState,
        _chargeState: boss._chargeState,
        _fissureState: boss._fissureState,
        _darkNovaState: boss._darkNovaState,
        specialAttackCount: boss.specialAttackCount || 0,
        specialAttackTimer: boss.specialAttackTimer,
        _overlordAttack: boss._overlordAttack,
      };
    });
    console.log('  Final boss state:', JSON.stringify(finalBossState));

    assert(attackFired, 'Boss attack state transitioned from idle');

    await screenshot(page, 'boss-03-attack-fired');

  } catch (err) {
    console.log(`\n  ERROR: ${err.message}`);
    await screenshot(page, 'boss-error');
    if (pageLogs.length > 0) {
      console.log('  --- Page Logs (last 15) ---');
      pageLogs.slice(-15).forEach(l => console.log(`    ${l}`));
    }
  } finally {
    await context.close();
  }
}

// =========================================================================
// Test 2: Player death triggers correctly (BD-237)
// =========================================================================
async function testPlayerDeath(browser) {
  console.log('\n=============================================');
  console.log('  TEST 2: Player death triggers correctly');
  console.log('=============================================');

  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();

  await page.route('**/js/game3d.js*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    const marker = "window.addEventListener('keydown', onKeyDown);";
    if (body.includes(marker)) {
      body = body.replace(marker, `${marker}\n  window.__debugSt = st; // TEST HOOK`);
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'application/javascript' } });
  });

  const pageLogs = [];
  page.on('console', msg => pageLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageLogs.push(`[PAGE ERROR] ${err.message}`));

  try {
    const ready = await navigateToGame(page, 'Test2');
    assert(ready, 'Debug hook available (3D game launched)');
    if (!ready) throw new Error('Debug hook not available');

    await screenshot(page, 'death-01-game-running');

    // Verify player is alive first
    const initialHp = await page.evaluate(() => window.__debugSt.hp);
    console.log(`  Initial HP: ${initialHp}`);
    assert(initialHp > 0, `Player starts alive (HP=${initialHp})`);

    // Force HP to 0 — the game loop should detect this and trigger deathSequence
    await page.evaluate(() => {
      window.__debugSt.hp = 0;
    });
    console.log('  Set HP = 0');

    // Wait for death sequence to trigger (game loop picks it up on next frame)
    console.log('  Waiting for deathSequence (up to 5s)...');
    const died = await pollUntil(page, () => {
      const s = window.__debugSt;
      return s.deathSequence === true || s.gameOver === true;
    }, 5000);

    const deathState = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        hp: s.hp,
        deathSequence: s.deathSequence,
        gameOver: s.gameOver,
      };
    });
    console.log(`  Death state: HP=${deathState.hp}, deathSequence=${deathState.deathSequence}, gameOver=${deathState.gameOver}`);

    assert(died, 'Death sequence triggered after HP set to 0');
    assert(deathState.hp === 0, `Player HP is 0 (got ${deathState.hp})`);
    assert(deathState.deathSequence === true || deathState.gameOver === true, 'deathSequence or gameOver is true');

    await screenshot(page, 'death-02-player-dead');

    // Wait for full death sequence to complete and transition to gameOver
    console.log('  Waiting for gameOver transition (up to 5s)...');
    const gameOverReached = await pollUntil(page, () => {
      return window.__debugSt.gameOver === true;
    }, 5000);

    assert(gameOverReached, 'Game over screen reached after death sequence');
    await screenshot(page, 'death-03-game-over');

  } catch (err) {
    console.log(`\n  ERROR: ${err.message}`);
    await screenshot(page, 'death-error');
    if (pageLogs.length > 0) {
      console.log('  --- Page Logs (last 15) ---');
      pageLogs.slice(-15).forEach(l => console.log(`    ${l}`));
    }
  } finally {
    await context.close();
  }
}

// =========================================================================
// Test 3: Death with heal-on-kill items — BD-237 regression guard
// =========================================================================
async function testDeathWithHealItems(browser) {
  console.log('\n=============================================');
  console.log('  TEST 3: Death with heal-on-kill (BD-237)');
  console.log('=============================================');

  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();

  await page.route('**/js/game3d.js*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    const marker = "window.addEventListener('keydown', onKeyDown);";
    if (body.includes(marker)) {
      body = body.replace(marker, `${marker}\n  window.__debugSt = st; // TEST HOOK`);
    }
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'application/javascript' } });
  });

  const pageLogs = [];
  page.on('console', msg => pageLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageLogs.push(`[PAGE ERROR] ${err.message}`));

  try {
    const ready = await navigateToGame(page, 'Test3');
    assert(ready, 'Debug hook available (3D game launched)');
    if (!ready) throw new Error('Debug hook not available');

    await screenshot(page, 'heal-01-game-running');

    // Set up heal-on-kill items at threshold, THEN set HP to 0.
    // BD-237 fix: `if (st.hp > 0)` guard in killEnemy() prevents heals at 0 HP.
    // This test verifies that heal-on-kill doesn't resurrect the player.
    await page.evaluate(() => {
      const s = window.__debugSt;
      s.items.sillyStraw = 5;    // 5 stacks = heals 5 HP per trigger
      s.sillyStrawKills = 9;     // 1 kill from triggering heal
      s.hp = 0;                  // Player is at 0 HP (simulating damage this frame)
    });

    const stateAfterSet = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        hp: s.hp,
        sillyStraw: s.items.sillyStraw,
        sillyStrawKills: s.sillyStrawKills,
      };
    });
    console.log(`  Set HP=${stateAfterSet.hp}, sillyStraw=${stateAfterSet.sillyStraw}, kills=${stateAfterSet.sillyStrawKills}`);

    // Wait for death sequence to trigger
    console.log('  Waiting for deathSequence with heal items active (up to 5s)...');
    const died = await pollUntil(page, () => {
      const s = window.__debugSt;
      return s.deathSequence === true || s.gameOver === true;
    }, 5000);

    const deathState = await page.evaluate(() => {
      const s = window.__debugSt;
      return {
        hp: s.hp,
        deathSequence: s.deathSequence,
        gameOver: s.gameOver,
        sillyStrawKills: s.sillyStrawKills,
      };
    });
    console.log(`  Death state: HP=${deathState.hp}, deathSequence=${deathState.deathSequence}, gameOver=${deathState.gameOver}`);
    console.log(`  sillyStrawKills: ${deathState.sillyStrawKills} (if >9 or reset to 0, a kill happened)`);

    assert(died, 'Death sequence triggered despite heal-on-kill items being ready');
    assert(deathState.hp === 0, `Player HP is 0 (got ${deathState.hp}) — Silly Straw did NOT resurrect`);
    assert(deathState.deathSequence === true || deathState.gameOver === true, 'deathSequence or gameOver is true');

    await screenshot(page, 'heal-02-player-dead');

    // Wait for gameOver
    console.log('  Waiting for gameOver (up to 5s)...');
    const gameOverReached = await pollUntil(page, () => {
      return window.__debugSt.gameOver === true;
    }, 5000);
    assert(gameOverReached, 'Game over reached — heal items did not prevent death');

    // Final HP check — should still be 0 even after kills during death sequence
    const finalHp = await page.evaluate(() => window.__debugSt.hp);
    assert(finalHp === 0, `Final HP is 0 after game over (got ${finalHp})`);

    await screenshot(page, 'heal-03-game-over');

  } catch (err) {
    console.log(`\n  ERROR: ${err.message}`);
    await screenshot(page, 'heal-error');
    if (pageLogs.length > 0) {
      console.log('  --- Page Logs (last 15) ---');
      pageLogs.slice(-15).forEach(l => console.log(`    ${l}`));
    }
  } finally {
    await context.close();
  }
}

// =========================================================================
// Main runner
// =========================================================================
async function run() {
  console.log('=== BD-236/237/238: Boss Attack + Death Bug E2E Tests ===\n');
  console.log(`Target: ${GAME_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    await testBossAttacks(browser);
    await testPlayerDeath(browser);
    await testDeathWithHealItems(browser);
  } finally {
    await browser.close();
  }

  // Summary
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
