# Playwright MCP Investigation Options -- 10 Automated Test Areas

**Date:** 2026-02-25
**Bead:** BD-246
**Purpose:** Define 10 distinct Playwright browser automation investigations that navigate, interact with, and measure the game to discover bugs, UX issues, balance problems, and improvement opportunities.

**Methodology:** Each investigation uses the established Playwright pattern from `test-results/test-gameover-flow.mjs` -- route-intercept `game3d.js` to inject `window.__debugSt = st;`, then use `page.evaluate()` to read and mutate game state. Screenshots capture visual state at key moments. Assertions validate expected behavior. Console log capture surfaces runtime errors.

---

## Investigation 1: Early-Game Survival Curve Across All Animal/Difficulty Combinations

**Name:** Early-Game Balance Matrix

**Goal:** Measure how long each of the 16 animal-difficulty combinations (4 animals x 4 difficulties) survives without player input, and how long each survives with minimal movement. Discover which combinations are unplayable (die in under 30 seconds) and which are trivially easy (survive 5+ minutes standing still). This reveals balance gaps that manual playtesting misses because a human tester cannot objectively replicate "zero-skill play" across 16 configurations.

**Steps:**
1. For each of the 16 combinations (leopard/redPanda/lion/gator x chill/easy/medium/hard):
   a. Navigate: Title -> Mode Select -> Difficulty Select (arrow to target) -> Animal Select (arrow to target) -> Enter to launch 3D game.
   b. **Passive test:** Do nothing for 60 seconds. Record time-to-death and HP at each 5-second interval.
   c. Restart. Same combination.
   d. **Active test:** Hold W (forward movement) for 90 seconds, with random direction changes every 3-5 seconds (simulating basic wandering). Record time-to-death, level reached, kills, and HP curve.
   e. Screenshot at death for each run.
2. Collect all data into a 16-row comparison table.

**What to capture:**
- Time-to-death for each passive and active run (16 x 2 = 32 data points)
- HP value sampled every 5 seconds during active runs (HP curves)
- Level reached, total kills, and score at death
- Screenshot of each game-over screen showing stats
- Console errors during each run

**Expected findings:**
- Red Panda on Hard (28 HP after difficulty scaling) likely dies in under 10 seconds passive, under 30 seconds active -- flagging a near-unplayable combination.
- Gator on Chill (225 HP with regen and slow enemies) may survive 3+ minutes with no input, suggesting Chill mode is too forgiving for high-HP animals.
- The HP curve data will reveal whether the BD-192 invincibility fix (0.5s) is sufficient or if certain animals still experience invisible swarm death.
- Any combination where passive survival exceeds 30 seconds (enemies cannot kill a stationary player quickly enough) indicates early-game spawning is too slow or enemy pathfinding has issues.

**Difficulty:** Medium -- requires iterating through 16 menu navigation sequences and timing runs. Menu navigation is well-understood from existing tests. The randomized direction changes need a simple `setInterval` keyboard input pattern.

---

## Investigation 2: Game-Over Screen Full Interaction Flow + Edge Cases

**Name:** Game-Over UX Stress Test

**Goal:** Exhaustively test the game-over screen interaction flow including: name entry with edge-case characters, blocked key filtering, backspace behavior, maximum name length, empty name rejection, leaderboard persistence across multiple deaths, feedback question navigation, and the Enter-release gate. This extends the existing `test-gameover-flow.mjs` to cover paths it does not test.

**Steps:**
1. Launch 3D game (Chill/Leopard for fastest setup). Force game over via `__debugSt.hp = 0`.
2. **Name entry edge cases:**
   a. Type all 26 alphabet characters -- verify that BLOCKED_NAME_KEYS (w, a, s, d, b, r, e, space) are rejected and the other 18 are accepted.
   b. Type exactly 10 characters -- verify the 11th character is rejected (max length).
   c. Backspace 5 times -- verify name shortens correctly.
   d. Attempt to submit empty name (Backspace all, then Enter) -- verify submission is blocked.
   e. Type a valid name and submit.
3. **Feedback screen:**
   a. Navigate all feedback options with ArrowLeft/ArrowRight.
   b. Count the total number of feedback options (verify it matches expected count).
   c. Select each option and verify `feedbackSelection` state updates.
   d. Press Enter to return to title.
4. **Leaderboard persistence:**
   a. Play a second run (navigate menus again, force game over).
   b. Submit a different name.
   c. Verify the leaderboard now contains both entries.
   d. Verify entries are sorted by score descending.
5. **Rapid input stress:**
   a. During name entry, mash 10 keys simultaneously within 100ms.
   b. Verify no duplicate characters or state corruption.

**What to capture:**
- Screenshot after each name-entry edge case
- Full blocked-key test results (which keys are accepted vs. rejected)
- Leaderboard state after each submission
- Any console errors during rapid input
- Screenshot of feedback screen with each option highlighted

**Expected findings:**
- Blocked key list may be incomplete -- keys like 'q' or 'p' that are near WASD might be unintentionally blocked or unblocked.
- The `nameEntryInputCooldown` timer from BD-189 may cause dropped keystrokes if a player types very quickly after the cooldown expires.
- Leaderboard sorting may break with identical scores.
- The feedback selection wrapping behavior (going past the last option) may not be guarded.
- Name entry may accept special characters (numbers, punctuation) that should be filtered for a kid-friendly game.

**Difficulty:** Easy -- builds directly on the established `test-gameover-flow.mjs` pattern. All state is accessible via `__debugSt`. No timing-sensitive gameplay required.

---

## Investigation 3: Upgrade Menu Weapon/Howl Offering Distribution

**Name:** Level-Up Menu Randomization Audit

**Goal:** Verify that the upgrade menu offers a fair distribution of weapons, howls, and upgrades across many level-ups. Detect if certain weapons or howls are never offered, if the randomized pool is too small, if rerolls work correctly, and if the level-gated weapon slot unlocks (levels 5/10/15) trigger properly.

**Steps:**
1. Launch 3D game (Chill/Leopard). Inject XP to force rapid level-ups:
   ```js
   __debugSt.xp = __debugSt.xpToNext - 1;
   ```
2. Kill one enemy (or add 1 XP) to trigger level-up. Screenshot the upgrade menu.
3. Record all 3 offered choices (type, name, level if weapon upgrade).
4. Use reroll (press 'r' if implemented, or check reroll mechanic). Record new choices.
5. Select the first option. Repeat from step 1 for 25 level-ups.
6. At levels 5, 10, and 15 specifically, check:
   a. Does `st.maxWeaponSlots` increment?
   b. Are new weapon slot offers present in the choices?
7. After 25 levels, analyze the full log:
   a. Which weapons from `st.availableWeapons` were offered at least once?
   b. Which howls from `st.availableHowls` were offered?
   c. What is the weapon:howl:upgrade ratio across all offerings?
   d. Were any items offered that should not be (e.g., a weapon already at max level)?

**What to capture:**
- Screenshot of every upgrade menu (25 screenshots)
- Full log of all 75+ offered choices (3 per level x 25 levels)
- Reroll results for 3 rerolls (the per-game limit)
- `st.availableWeapons` and `st.availableHowls` pool at game start
- `st.weapons` and `st.howls` state after each selection
- `st.maxWeaponSlots` at levels 5, 10, and 15

**Expected findings:**
- With randomized pools of 5-7 weapons and 5-7 howls per run, some items may be offered excessively (40%+ of menus) while others appear only once or never in 25 level-ups.
- Weapon upgrades may dominate offerings after level 10, starving the player of new howls.
- The reroll mechanic may offer the same choices again (no deduplication with previous offer).
- Edge case: at level 15 with 4 weapon slots, the menu may still offer new weapons the player cannot equip, wasting a slot.
- Howl stacking limits (e.g., Power maxes at 5) may not be respected in offerings -- the player could be offered Power Howl when they already have 5 stacks.

**Difficulty:** Medium -- requires injecting XP manipulation, parsing upgrade menu state, and building a data analysis pipeline. The upgrade menu state (`st.upgradeChoices`) should be readable via `__debugSt`.

---

## Investigation 4: Audio Coverage and Placeholder Detection

**Name:** Sound Event Completeness Audit

**Goal:** Instrument every `playSound()` call in the game to detect: (a) which sound events fire during a typical 5-minute play session, (b) which events map to empty file arrays (silent), (c) which events share the same underlying audio file (placeholders), and (d) which gameplay moments produce no `playSound()` call at all. Cross-reference findings against `docs/new-sounds.md` to validate the documented gaps.

**Steps:**
1. Route-intercept `js/3d/audio.js` to wrap `playSound()` with logging:
   ```js
   const _originalPlaySound = playSound;
   window.__soundLog = [];
   playSound = function(eventId) {
     window.__soundLog.push({ event: eventId, time: performance.now() });
     return _originalPlaySound(eventId);
   };
   ```
2. Launch 3D game (Easy/Leopard). Play for 5 minutes with active input:
   a. Move around, kill zombies (auto-attack fires automatically).
   b. Trigger a power attack (hold Enter 1 second, release).
   c. Jump 10 times at various heights.
   d. Pick up XP gems (walk near enemies after killing them).
   e. Break a shrine (walk near one, attack it 3 times).
   f. Collect any dropped items or powerups.
   g. Force a level-up and select an upgrade.
   h. Trigger a wave event (inject `__debugSt.waveEventTimer = 0.1`).
   i. Force game over.
3. Read `window.__soundLog` and tabulate:
   a. Frequency of each event ID.
   b. Events that never fired despite their trigger occurring.
   c. Events that fired more than 100 times (potential spam).
4. Also read the SOUND_MAP from `audio.js` to identify empty arrays and shared files.

**What to capture:**
- Complete sound event log with timestamps (expect 500-2000 entries for 5 minutes)
- Frequency table: event ID -> count
- List of SOUND_MAP entries with empty file arrays
- List of SOUND_MAP entries sharing the same file
- Gameplay moments with no sound (cross-referenced against new-sounds.md)
- Screenshot at moments where sound should play but does not (damage taken, XP pickup, item pickup)

**Expected findings:**
- `sfx_xp_pickup` fires 0 times despite hundreds of XP gem collections (documented in new-sounds.md as having an empty file array).
- `sfx_powerup_generic` fires 0 times (empty file array).
- `sfx_item_pickup` fires 0 times or maps to the wrong file.
- `sfx_jump` fires on every jump regardless of height, confirming the BD-240 issue (tiered jump sounds not yet implemented, or already implemented -- this test validates).
- `sfx_melee_hit` fires 100+ times, confirming high-frequency auto-attack sounds work.
- Player damage moments (`damagePlayer()`) produce zero sound events, confirming the new-sounds.md finding.
- `explode-1.ogg` is shared across 5+ event IDs, confirming the file reuse audit.

**Difficulty:** Medium -- requires intercepting the audio module's exports, which means routing the `audio.js` file in addition to `game3d.js`. The interception pattern is the same as the existing debug hook, just applied to a different module. Gameplay simulation requires basic keyboard input over 5 minutes.

---

## Investigation 5: Performance Profiling Under Escalating Enemy Load

**Name:** FPS and Memory Under Stress

**Goal:** Measure rendering performance (FPS) and memory consumption (JS heap) as zombie count escalates from 0 to 200+. Identify the enemy count threshold where FPS drops below 30 (unplayable) and below 60 (noticeable). Detect memory leaks by tracking heap growth over a 10-minute session with periodic forced garbage collection. This investigation targets the known concern from `docs/planning/beads-crash-and-perf.md`.

**Steps:**
1. Launch 3D game (Easy/Leopard). Inject `window.__debugSt` hook.
2. Disable player death: `__debugSt.hp = 99999; __debugSt.maxHp = 99999;`
3. Every 5 seconds for 10 minutes:
   a. Read `__debugSt.enemies.length` (zombie count).
   b. Read `performance.memory.usedJSHeapSize` (Chrome only, requires `--enable-precise-memory-info` flag).
   c. Measure frame time by injecting a `requestAnimationFrame` timestamp delta tracker.
   d. Record all three values.
4. At the 2-minute mark, force a wave event (`__debugSt.waveEventTimer = 0.1`) to spike enemy count.
5. At the 4-minute mark, inject 100 enemies directly:
   ```js
   for (let i = 0; i < 100; i++) {
     // Trigger ambient spawn logic or directly push enemy objects
     __debugSt.ambientSpawnTimer = 0;
   }
   ```
6. At the 6-minute mark, inject 200 enemies.
7. At the 8-minute mark, trigger a boss spawn (challenge shrine activation).
8. At each injection point, measure FPS recovery time (how long until FPS stabilizes).

**What to capture:**
- Time-series data: timestamp, enemy count, FPS, heap size (120 data points at 5-second intervals)
- Peak enemy count achieved during the session
- Minimum FPS recorded and the enemy count at that moment
- Heap size growth rate (bytes per minute) to detect leaks
- Screenshots at peak enemy count and minimum FPS moments
- Any console errors (especially WebGL context lost, out-of-memory)
- Three.js renderer info (`renderer.info.memory`, `renderer.info.render`) if accessible

**Expected findings:**
- FPS likely drops below 60 at ~80-100 enemies due to per-enemy collision checks being O(n^2) against the player and each other (merge system).
- FPS likely drops below 30 at ~150-200 enemies, making the game unplayable during late-game wave events.
- Memory may grow steadily if enemy mesh disposal on kill has a leak (geometry or material not disposed).
- The zombie merge system may cause FPS spikes when many merges happen simultaneously (cascading tier-ups).
- XP gem count may grow unbounded if enemies are killed faster than gems are collected, causing additional performance drag.
- Boss spawning during high enemy count may push FPS to single digits due to complex boss model + attack effects.

**Difficulty:** Hard -- requires Chrome-specific memory APIs, `requestAnimationFrame` instrumentation, and a 10-minute run with timed interventions. The enemy spawn injection may need to call internal functions rather than just setting timers. Parsing performance data into actionable insights requires post-processing.

---

## Investigation 6: Pause Menu and State Transition Integrity

**Name:** Pause/Unpause State Consistency

**Goal:** Verify that pausing (ESC), unpausing, and using pause menu options (Resume/Restart/Main Menu) correctly freeze and restore all game systems. Detect state corruption when pausing during: combat, upgrade menus, power attack charging, wave events, boss fights, death sequences, and item pickups.

**Steps:**
1. Launch 3D game (Easy/Leopard). For each scenario:
   a. **Pause during normal gameplay:** Press ESC. Verify enemies stop moving, projectiles freeze, timers stop ticking. Read `st.paused`, `st.pauseMenu`, enemy positions before and after 2 seconds of pause. Resume with Enter on "Resume". Verify game continues normally.
   b. **Pause during upgrade menu:** Force level-up, verify upgrade menu shows. Press ESC. Verify behavior (should either do nothing or close upgrade menu -- not break state). Resume and verify upgrade menu is still functional.
   c. **Pause during power attack charge:** Hold Enter for 0.5s (charging). Press ESC. Verify charge state is preserved or cleanly cancelled. Resume and verify charge bar behavior.
   d. **Pause during wave event:** Inject `__debugSt.waveWarning = 5` to trigger a mid-warning pause. Verify warning timer freezes. Resume and verify warning continues.
   e. **Restart from pause menu:** During gameplay, press ESC -> navigate to "Restart" -> Enter. Verify full state reset (HP, level, score, enemies cleared, position reset). Screenshot the fresh game start.
   f. **Main Menu from pause menu:** Press ESC -> navigate to "Main Menu" -> Enter. Verify return to title screen with no 3D artifacts remaining. Verify 2D canvas is visible. Screenshot title screen.
   g. **Double-pause:** Press ESC twice rapidly. Verify no state corruption (pause flag toggles cleanly).
   h. **ESC during game-over:** Verify ESC does nothing on the game-over screen (pause should be blocked).

**What to capture:**
- State snapshots before and after each pause scenario (enemy positions, timer values, HP, charge state)
- Screenshots of each pause/resume transition
- Timer values showing freeze duration (enemies should not advance during pause)
- Console errors during any transition
- Whether the restart produces a truly clean state (no leftover enemies, effects, or projectiles from previous run)

**Expected findings:**
- Pausing during power attack charge may leave the charge glow visual active during the pause menu overlay, creating a visual artifact.
- Restarting may not fully clear `weaponProjectiles[]` or `weaponEffects[]`, leaving orphaned 3D objects in the scene.
- Returning to Main Menu may not call `disposeAudio()` correctly, leaving audio playing after exit.
- The double-pause edge case may toggle `st.paused` twice in a single frame if ESC keydown fires twice (no debounce).
- Wave event timer may continue ticking during pause if the `gameDt` multiplication by 0 (paused) does not cover all timer decrements.
- The "Restart" option may not reset `st.availableWeapons` and `st.availableHowls`, giving the same randomized pool instead of a fresh one (or vice versa -- it may re-randomize when it should not).

**Difficulty:** Medium -- requires testing multiple specific game states, which means setting up each scenario. Menu navigation is straightforward. State comparison before/after pause requires reading multiple state properties.

---

## Investigation 7: Shrine and Totem Interaction Integrity

**Name:** Shrine/Totem Systems Deep Dive

**Goal:** Test all three shrine types (Breakable, Charge, Challenge) and Difficulty Totems for correct behavior: hit detection, augment application, charge timing, boss spawning, totem stat modifications, and visual/audio feedback. Detect interaction bugs where shrines cannot be reached, charge shrines time out incorrectly, or totem stacking is wrong.

**Steps:**
1. Launch 3D game (Chill/Leopard for survival). Give infinite HP.
2. **Find the nearest breakable shrine:**
   a. Read `__debugSt.shrines[]` to get positions of all shrines.
   b. Teleport player to nearest shrine: `__debugSt.playerX = shrine.x; __debugSt.playerZ = shrine.z;`
   c. Read shrine HP before interaction.
   d. Simulate 3 attack interactions (tap Enter 3 times with appropriate timing for `interactionTimer` cooldown).
   e. Verify shrine HP decreases to 0 and shrine is destroyed.
   f. Read `__debugSt.augments` to verify an augment was granted.
   g. Screenshot showing shrine destroyed and augment floating text.
3. **Find the nearest charge shrine:**
   a. Teleport to charge shrine position.
   b. Stand within `CHARGE_SHRINE_RADIUS` and wait `CHARGE_SHRINE_TIME` (4 seconds).
   c. Verify the charge shrine menu appears with 3 upgrade options.
   d. Screenshot the charge shrine menu.
   e. Select one option and verify it applies.
4. **Find a challenge shrine:**
   a. Teleport to challenge shrine position.
   b. Approach to trigger boss spawn.
   c. Verify a boss entity is created in `__debugSt.enemies[]` with `isBoss === true`.
   d. Verify boss tier is >= 9.
   e. Screenshot the boss.
5. **Find a difficulty totem:**
   a. Read `__debugSt.totems[]` positions.
   b. Teleport to totem.
   c. Attack 5 times to destroy.
   d. Verify `st.totemCount` incremented.
   e. Verify `st.totemDiffMult`, `st.totemSpeedMult`, `st.totemSpawnMult` increased.
   f. Verify `st.totemXpMult`, `st.totemScoreMult` increased.
   g. Screenshot showing "NOT HARD ENOUGH!" floating text.
6. **Repeat for 3 totems** and verify stacking is multiplicative.

**What to capture:**
- Position and type of every shrine/totem at game start
- Augment distribution from 5 breakable shrine breaks (which augments were given)
- Charge shrine menu options and their tiers (Common/Uncommon/Rare/Legendary distribution)
- Boss tier and HP from challenge shrine
- Totem stat multipliers after 1, 2, and 3 destructions
- Screenshots at each interaction point
- Any console errors during teleportation or interaction

**Expected findings:**
- Some shrines may spawn inside terrain decorations (trees, rocks) and be unreachable without teleportation -- this would be a placement bug.
- Charge shrine timer may not account for pause time, so pausing during a charge could either extend or reset the charge.
- Challenge shrine boss may spawn at the wrong tier if BD-236 fix is incomplete.
- Totem multipliers may not stack correctly (e.g., additive when they should be multiplicative, or vice versa).
- The augment RNG from breakable shrines may be biased toward certain augments (e.g., HP and XP appear disproportionately).
- Charge shrine menu options may not respect rarity weighting (`CHARGE_SHRINE_WEIGHTS`), offering legendary options too frequently or never.

**Difficulty:** Medium -- teleportation via state mutation is straightforward. The main challenge is timing interactions (interactionTimer cooldown between hits) and waiting for the charge shrine timer.

---

## Investigation 8: HUD Readability and Visual Hierarchy Under Combat Conditions

**Name:** HUD Clarity and Accessibility Audit

**Goal:** Capture screenshots of the HUD during various game states (empty inventory, full inventory, active powerup, wave warning, boss fight, low HP, many floating texts) and analyze: text readability at target resolution (960x540), element overlap, color contrast against bright/dark backgrounds, and information density. This investigation specifically targets the 7-year-old audience consideration -- can a child parse what matters?

**Steps:**
1. Launch 3D game (Easy/Leopard). Screenshot the HUD at:
   a. **Clean start:** No items, level 1, full HP. Baseline HUD state.
   b. **First weapon acquired:** After level-up with weapon. Left-side weapon slot bar visible.
   c. **Multiple weapons + howls:** Inject 3 weapons and 4 howls via state manipulation. Screenshot showing dense left/right HUD columns.
   d. **Full inventory:** Inject 8+ items via `__debugSt.items`. Add 3 wearables. Screenshot showing the bottom-left item/wearable area.
   e. **Low HP:** Set `__debugSt.hp = 5`. Screenshot showing HP bar in critical state.
   f. **Active powerup:** Inject a powerup (`__debugSt.activePowerup = {...}`). Screenshot showing the powerup timer bar.
   g. **Wave warning:** Set `__debugSt.waveWarning = 8`. Screenshot showing the warning countdown overlay.
   h. **Boss fight:** Spawn a boss and screenshot showing boss HP bar.
   i. **Floating text storm:** Kill 10 enemies rapidly to generate many damage/XP floating texts simultaneously. Screenshot the visual clutter.
   j. **Charge shrine menu:** Trigger a charge shrine menu while at a location with lots of background activity.
   k. **Upgrade menu:** Force level-up with many options. Screenshot the upgrade card layout.
2. For each screenshot, measure:
   a. Can the HP bar percentage be read?
   b. Are weapon cooldown bars distinguishable?
   c. Is the wave timer/score text readable against the sky/ground?
   d. Does any HUD element overlap another?
   e. Are item names in the inventory legible at 960x540?

**What to capture:**
- 11+ screenshots covering every HUD configuration
- Per-screenshot notes on overlap, readability, and contrast issues
- Minimap visibility (if one exists) at different zoom levels
- Font sizes used for each HUD element (verifiable by reading hud.js constants)
- Color contrast ratios for key text elements against their backgrounds

**Expected findings:**
- The wearable slots (30x30px) are too small to read at 960x540, confirming BD-197 findings.
- During wave warnings, the red overlay may reduce contrast of other HUD elements (HP bar, weapon slots).
- Floating text during combat creates visual noise that obscures important information (XP gains, damage numbers, item announcements all compete).
- The item/wearable area at bottom-left may overlap with the weapon slot bars on the left when the player has 4 weapons and 8+ items.
- Score and timer text in the top-right may be hard to read against bright sky or white terrain.
- The upgrade menu card descriptions may be truncated or overflow at longer weapon/howl descriptions.
- The charge bar at bottom-center may overlap with the controls hint text.

**Difficulty:** Easy -- mostly screenshot capture with state injection. No complex timing or gameplay simulation. The analysis is visual inspection of captured images.

---

## Investigation 9: Rapid Mode Switching and Menu Navigation Edge Cases

**Name:** Menu State Machine Stress Test

**Goal:** Stress-test the menu navigation state machine by performing rapid transitions, backing out of menus at every level, switching between 2D and 3D mode selections, and verifying that ESC correctly backs up one level at each menu stage. Detect state leaks where starting a 3D game and returning to the menu leaves artifacts, or where rapid Enter presses skip menus.

**Steps:**
1. **Full forward navigation:** Title -> Enter -> Mode Select -> Enter (3D) -> Difficulty Select -> Enter -> Animal Select -> Enter -> 3D game launches. Screenshot each transition. Verify no skipped screens.
2. **Full backward navigation:** From Animal Select -> ESC -> Difficulty Select -> ESC -> Mode Select -> ESC -> Title. Verify each ESC goes back exactly one level.
3. **2D mode flow:** Title -> Enter -> Mode Select -> ArrowLeft (select 2D) -> Enter -> Difficulty Select -> Enter -> Animal Select -> Enter -> 2D game launches. Verify 2D game starts (canvas visible, 3D canvas hidden).
4. **Rapid Enter spam:** On the title screen, press Enter 10 times within 500ms. Verify the game does not skip past Mode Select directly into gameplay.
5. **3D launch and return:** Start 3D game. Force game over. Return to title via feedback screen. Verify:
   a. 3D canvas is hidden.
   b. 2D canvas is visible.
   c. HUD canvas is hidden.
   d. No WebGL context warnings in console.
   e. Memory is not significantly higher than before 3D launch (Three.js cleanup).
6. **Repeated 3D launches:** Launch 3D game, return to title, launch again -- repeat 3 times. Verify no progressive memory growth or visual artifacts. Check `performance.memory.usedJSHeapSize` after each return.
7. **ESC at every 3D game state:** From the 3D game, try ESC during:
   a. Normal gameplay -> pause menu appears.
   b. Pause menu -> resume/unpause.
   c. Upgrade menu -> does ESC close it or do nothing?
   d. Game over -> ESC should do nothing.

**What to capture:**
- Screenshots at each menu transition (forward and backward)
- Canvas display states (`style.display`) after each transition
- Console errors or warnings during transitions
- Memory snapshots after each 3D launch-and-return cycle
- Timing of each transition (any transition taking >1 second indicates cleanup overhead)
- Whether `disposeAudio()` and Three.js `dispose()` calls complete without error

**Expected findings:**
- Rapid Enter spam on the title screen may skip Mode Select and land directly on Difficulty Select (if the Enter press propagates through multiple state transitions in one frame).
- Returning from 3D to title may leave the HUD canvas visible (display:block instead of display:none), creating a transparent overlay on the 2D title screen.
- Repeated 3D launches may leak memory if Three.js geometries, materials, or textures are not fully disposed on cleanup. A 5-10MB growth per cycle would indicate a leak.
- ESC during the upgrade menu may close the upgrade menu without the player making a selection, potentially leaving the game in a state where no upgrade was granted for that level.
- The 2D mode launch path may not correctly set viewport/container dimensions, since 3D mode modifies container to 100vw/100vh but returning to 2D may not restore the original 960x540.

**Difficulty:** Medium -- requires tracking canvas display states, memory measurements, and multiple full game cycles. The menu navigation itself is straightforward (existing test covers the happy path). The repeated launch/return cycle for memory leak detection needs careful timing.

---

## Investigation 10: Zombie Merge System Visual and Mechanical Verification

**Name:** Zombie Tier Merge Cascade Test

**Goal:** Verify that the zombie merge system works correctly across all 10 tiers: same-tier zombies collide and combine, higher-tier zombies get the correct stat bonuses (HP, damage, speed), visual upgrades appear at the right tiers (glowing eyes at tier 3+, horns at tier 5+, colored auras at tier 7+), and merge ratios follow MERGE_RATIOS=[5,3,2]. Detect visual or mechanical bugs in the merge cascade.

**Steps:**
1. Launch 3D game (Chill/Leopard). Give infinite HP, disable ambient spawning.
2. **Controlled merge test (tier 1 -> tier 2):**
   a. Inject 5 tier-1 zombies at the same position (within merge radius):
      ```js
      // Use the enemy spawn system or directly push enemy objects
      ```
   b. Wait for merge. Verify one tier-2 zombie exists and 5 tier-1 zombies are gone.
   c. Read the tier-2 zombie's HP, damage, speed, and compare to ZOMBIE_TIERS[1] expected values.
   d. Screenshot the tier-2 zombie model.
3. **Tier 2 -> tier 3 merge:** Inject 3 tier-2 zombies at same position (MERGE_RATIOS[1]=3). Wait for merge. Verify tier-3 zombie.
4. **Tier 3 -> tier 4 merge:** Inject 2 tier-3 zombies at same position (MERGE_RATIOS[2]=2). Wait for merge. Verify tier-4 zombie.
5. **Visual verification:** For tiers 1 through 7, screenshot each tier's zombie model at close range (teleport camera or player nearby). Document:
   a. Base color at each tier.
   b. Eye glow appearance at tier 3.
   c. Horn mesh appearance at tier 5.
   d. Aura effect at tier 7.
   e. Size scaling across tiers.
6. **MAX_MERGE_TIER cap:** Inject 2 tier-4 zombies. Verify they do NOT merge (MAX_MERGE_TIER=4 means merges only happen up to tier 4).
7. **Merge sound escalation:** Log which `sfx_zombie_merge_*` event fires for each merge tier.

**What to capture:**
- Screenshots of tier 1 through 7 zombie models (at minimum)
- HP/damage/speed values for tiers 1-5 compared to expected ZOMBIE_TIERS values
- Merge event log: which tiers merged, resulting tier, sound played
- Whether MAX_MERGE_TIER correctly prevents merges above tier 4
- Enemy count before and after each merge event
- Visual upgrade checklist (eyes, horns, auras at correct tiers)
- Any console errors during merge events (especially if merging produces NaN stats)

**Expected findings:**
- Zombie visual upgrades (eyes, horns, auras) may not be visible in screenshots due to small model size at the default camera distance -- this would reveal that the visual upgrades need to be more prominent.
- Merge radius may be too small, requiring zombies to overlap almost exactly before merging -- this would explain why merges feel rare during normal gameplay.
- Stat scaling per tier may be too aggressive (tier-4 zombies may be disproportionately strong compared to the player's power curve at the time tier-4 merges naturally occur).
- The merge sound escalation (low/mid/high) may not match the actual tiers where merges occur -- e.g., `sfx_zombie_merge_high` may play for tier-3 merges when it should only play for tier-4+.
- Merged zombies may inherit the position of one parent but the rotation of another, causing a visual snap on merge.
- Killing a merged zombie should yield appropriate XP for its tier -- this can be verified by checking XP granted per kill at each tier.

**Difficulty:** Hard -- requires spawning enemies at specific positions with specific tiers, which may need internal function calls rather than simple state mutation. The merge system operates on collision detection within the game loop, so the spawned zombies need to actually collide, which requires positioning them close together and waiting for the physics tick. Visual verification requires analyzing screenshots programmatically or manually.

---

## Summary Matrix

| # | Investigation | Category | Difficulty | Est. Runtime | Key Deliverable |
|---|--------------|----------|------------|-------------|-----------------|
| 1 | Early-Game Balance Matrix | Balance | Medium | ~30 min (16 runs x ~2 min each) | 16-row survival time comparison table |
| 2 | Game-Over UX Stress Test | UI/UX | Easy | ~5 min | Blocked-key map + leaderboard integrity report |
| 3 | Level-Up Menu Randomization Audit | Balance / UX | Medium | ~10 min | Offering distribution analysis across 25 levels |
| 4 | Audio Coverage Audit | Audio | Medium | ~8 min | Sound event frequency table + gap confirmation |
| 5 | FPS and Memory Under Stress | Performance | Hard | ~12 min | Time-series FPS/memory data with enemy count correlation |
| 6 | Pause/Unpause State Consistency | Edge Cases | Medium | ~8 min | State integrity report across 8 pause scenarios |
| 7 | Shrine/Totem Systems Deep Dive | Gameplay / Balance | Medium | ~10 min | Augment distribution + totem stacking verification |
| 8 | HUD Clarity and Accessibility Audit | Accessibility / UX | Easy | ~5 min | 11+ annotated HUD screenshots + readability report |
| 9 | Menu State Machine Stress Test | Edge Cases / Memory | Medium | ~10 min | Memory leak detection + transition integrity report |
| 10 | Zombie Merge Cascade Test | Gameplay / Visual | Hard | ~10 min | Merge mechanics verification + tier visual catalog |

## Priority Recommendation

If only 5 investigations can be executed, prioritize in this order:

1. **Investigation 1 (Early-Game Balance Matrix)** -- Directly impacts playability for the 7-year-old target audience. Balance data across 16 combinations is impossible to get manually.
2. **Investigation 5 (FPS and Memory Under Stress)** -- Performance issues are invisible until they cause crashes or frame drops in real play sessions.
3. **Investigation 4 (Audio Coverage Audit)** -- Validates the entire `new-sounds.md` document and identifies any undocumented gaps before Sound Pack Beta recording.
4. **Investigation 8 (HUD Clarity Audit)** -- Low-effort, high-value visual documentation that directly serves the accessibility goal.
5. **Investigation 3 (Level-Up Menu Randomization)** -- Balance fairness in the upgrade system affects every run's replayability.

The remaining 5 (Investigations 2, 6, 7, 9, 10) cover edge cases and system integrity -- important for polish but less likely to reveal game-breaking issues than the top 5.
