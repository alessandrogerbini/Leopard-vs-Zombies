# Track F: Bug Fixes & Stability

**Focus:** P0/P1 bug fixes, browser compatibility, performance profiling, 2D mode gate, CDN pinning, deployment
**Key Files:** `js/game3d.js`, `js/game.js`, `index.html`
**Effort:** 8-12 hours
**Blocked By:** Nothing (starts Day 1, FIRST PRIORITY)

**IMPORTANT:** Track F tasks F-1 through F-5 must complete before any other track modifies game3d.js. These are the foundation -- other tracks build on a stable base.

---

## Task F-1: Fix P0 -- for-in Mutation (BD-16)

**What to build:** Fix the `for...in` iteration over mutable collections bug. When iterating over an object with `for...in`, if the loop body modifies the object (adds/removes keys), behavior is undefined and can skip entries or cause ghost state.

**File:** `js/game3d.js`

**Problem:** The platform/shrine chunk management uses `for (const key in loadedChunks)` or `for (const key of loadedChunks)` where the loop body calls `unloadChunk` which modifies the collection being iterated.

**Fix:** Collect keys to remove into a separate array first, then remove after iteration completes.

```javascript
// BEFORE (dangerous):
for (const key of ts.loadedChunks) {
  if (shouldUnload(key)) {
    unloadChunk(key); // modifies ts.loadedChunks during iteration!
  }
}

// AFTER (safe):
const toRemove = [];
for (const key of ts.loadedChunks) {
  if (shouldUnload(key)) {
    toRemove.push(key);
  }
}
toRemove.forEach(key => unloadChunk(key));
```

**Note:** The terrain.js module (already extracted) uses this safe pattern in `updateChunks()`. Verify that any remaining for-in/for-of loops in game3d.js that iterate mutable collections also use the safe pattern.

**Search pattern:** Grep for `for (const` and `for (let` in game3d.js. Check each loop body for mutation of the iterated collection.

**Test criteria:**
- Grep game3d.js for `for...in` on objects that are mutated in the loop body -- zero hits
- Play for 10 minutes, walking across many chunks, breaking shrines -- no console errors, no ghost platforms

**Done when:** No `for...in` or `for...of` iteration over mutable collections during the loop body. Zero visible ghost state.

---

## Task F-2: Fix P0 -- Event Listener Leak (BD-17)

**What to build:** Ensure all event listeners added during 3D mode are tracked and removed during cleanup.

**File:** `js/game3d.js`

**Problem:** Event listeners for keydown/keyup/resize may not be fully removed when the player exits 3D mode (via Restart or Main Menu). Each re-entry adds new listeners without removing old ones, gradually accumulating dead handlers.

**Fix:** Store all listener references and remove them in the cleanup function.

```javascript
// At setup:
const handlers = {
  keydown: onKeyDown,
  keyup: onKeyUp,
  resize: onResize,
};
window.addEventListener('keydown', handlers.keydown);
window.addEventListener('keyup', handlers.keyup);
window.addEventListener('resize', handlers.resize);

// At cleanup:
function cleanup() {
  window.removeEventListener('keydown', handlers.keydown);
  window.removeEventListener('keyup', handlers.keyup);
  window.removeEventListener('resize', handlers.resize);
  // ... rest of cleanup
}
```

**Verification:** After playing 3D mode, returning to main menu, and re-entering 3D mode 5 times: no duplicate listeners in Chrome DevTools (Elements > Event Listeners on `window`).

**Test criteria:**
- Enter/exit 3D mode 5 times
- Check window event listeners in DevTools -- count should not grow
- No console errors about duplicate handlers

**Done when:** All listeners stored and removed on cleanup.

---

## Task F-3: Fix P1 -- Cooldown Timer Drift

**What to build:** Clamp weapon cooldown timers to prevent accumulation errors from floating-point drift.

**File:** `js/game3d.js`

**Problem:** Weapon `cooldownTimer` decreases by `dt` each frame. Due to floating-point arithmetic, the timer can drift slightly negative over many frames, causing tiny timing inconsistencies.

**Fix:** Clamp cooldown timer to 0 when it goes negative:
```javascript
w.cooldownTimer = Math.max(0, w.cooldownTimer - dt);
```

Also apply to:
- `st.invincible` timer
- `st.shieldBraceletTimer`
- `st.autoAttackTimer`
- `st.ambientSpawnTimer`
- `st.waveEventTimer`
- Powerup duration timer

**Test criteria:**
- Play for 10 minutes, equip 4 weapons
- No weapon fires faster than its base cooldown
- No timer displays negative values on HUD

**Done when:** Weapon cooldowns clamped; no accumulation errors.

---

## Task F-4: Fix P1 -- Opacity Guard

**What to build:** Clamp all opacity values to [0, 1] to prevent visual glitches from out-of-range opacity.

**File:** `js/game3d.js`

**Problem:** Some visual effects (hurt flash, charge glow, powerup indicators) compute opacity from timers that can produce values slightly outside [0, 1] due to dt overshoot.

**Fix:** Add `Math.max(0, Math.min(1, value))` wherever opacity or alpha is set from a computed value:
```javascript
// Wherever you see:
material.opacity = someComputation;
// Replace with:
material.opacity = Math.max(0, Math.min(1, someComputation));
```

**Grep pattern:** Search for `.opacity =` and `.globalAlpha =` in game3d.js and hud.js.

**Test criteria:**
- No console warnings about invalid opacity values
- No visual flickering during hurt flash, charge glow, or powerup effects

**Done when:** All opacity values clamped to [0, 1].

---

## Task F-5: Fix P1 -- State Cleanup on Restart

**What to build:** Ensure that restarting a 3D game (via pause menu "Restart") fully resets all state. Currently, some state properties may persist between runs.

**File:** `js/game3d.js`

**Problem:** The Restart option may not reset all properties of the `st` object, leading to stale state from the previous run (e.g., augments persisting, powerup timers carrying over, enemy arrays not cleared).

**Fix:** The cleanest approach is to exit the current 3D mode entirely and re-launch it:
```javascript
// In pause menu Restart handler:
function handleRestart() {
  cleanup(); // Full cleanup of current session
  launch3DGame(originalOptions); // Re-launch with same options
}
```

If this approach causes issues (e.g., memory leaks from incomplete cleanup), alternatively create a `resetState()` function that explicitly resets every property in `st`:
```javascript
function resetState() {
  // Player
  st.hp = st.maxHp;
  st.playerX = 0; st.playerY = 0; st.playerZ = 0;
  st.playerVY = 0;
  st.level = 1; st.xp = 0; st.xpToNext = 20;
  st.score = 0;
  // ... every single property
  // Dispose all enemies
  for (const e of st.enemies) disposeEnemy(e, scene);
  st.enemies = [];
  // Dispose all projectiles, effects, gems, crates, items
  // Reset terrain state
  // etc.
}
```

**Verification method:** Play a full run (die or play 5+ minutes). Restart via pause menu. Verify:
1. Score is 0
2. Level is 1
3. No weapons equipped except starting weapon
4. No augments active
5. No enemies from previous run visible
6. Terrain chunks regenerated cleanly
7. Do this 3 times consecutively -- no stale state on any restart

**Test criteria (manual):**
- 3 consecutive restart cycles show no stale state
- Memory does not grow unbounded across restarts (check DevTools)

**Done when:** 3 consecutive restart cycles clean with no stale state.

---

## Task F-6: 2D Mode Gate

**What to build:** Disable 2D mode access for alpha. Launching the game goes directly to 3D mode (or the 3D mode's character/difficulty select).

**File:** `js/game.js`

**Implementation:** In the mode selection screen, either:
- Option A: Skip mode selection entirely and go straight to 3D difficulty select
- Option B: Remove "2D Classic" from the mode selection and only show "3D Survivor"

**Preferred: Option A** -- Skip the mode select screen. The state machine goes directly from `title` to `difficulty` (for 3D mode).

```javascript
// In game.js, modify the title screen Enter handler:
// BEFORE:
if (gameState === 'title') { gameState = 'modeSelect'; }

// AFTER:
if (gameState === 'title') { gameState = 'difficulty'; selectedMode = 1; } // 1 = 3D mode
```

Also update the title screen rendering to not mention "2D Classic."

**Test criteria:**
- Launch game -- title screen appears
- Press Enter -- goes to difficulty selection (not mode selection)
- No path reaches 2D mode from any screen
- ESC from difficulty returns to title, not mode select

**Done when:** No path reaches 2D mode.

---

## Task F-7: Pin Three.js CDN with SRI Hash

**What to build:** Add a Subresource Integrity (SRI) hash to the Three.js CDN script tag in index.html.

**File:** `index.html`

**Current (presumed):**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

**After:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        integrity="sha384-XXXX..."
        crossorigin="anonymous"></script>
```

**To compute the hash:**
```bash
curl -s https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Then prefix with `sha384-`.

**Test criteria:**
- Game loads correctly with SRI hash present
- Verify in DevTools Network tab that three.min.js loads successfully
- If CDN serves a different file, the browser blocks it (security improvement)

**Done when:** SRI hash present in index.html. Game loads correctly.

---

## Task F-8: Browser Compatibility Check

**What to build:** Verify the game runs in Chrome, Firefox, and Edge. Test at least one run in each browser.

**Browsers to test:**
1. Chrome (latest) -- primary target
2. Firefox (latest) -- secondary
3. Edge (latest) -- verify

**Test scenarios per browser:**
- Game launches without console errors
- Character select works
- 3D mode renders correctly (terrain, enemies, player model)
- Auto-attack and weapons fire
- Level-up menu is navigable
- Pause menu works
- Game-over screen displays correctly
- Audio plays (if Task B-1 is complete)

**Also test on one low-end machine:** If available, test on a laptop with integrated graphics (Intel HD or equivalent). Target: 30fps sustained for 5 minutes.

**Depends on:** F-1 through F-5 complete (bug fixes first)

**Done when:** Runs in Chrome, Firefox, Edge. One low-end machine tested.

---

## Task F-9: Profiling Session

**What to build:** A 10-minute profiling run using Chrome DevTools to establish performance baselines and identify bottlenecks.

**Method:**
1. Open Chrome DevTools > Performance tab
2. Start recording
3. Play the game for 10 minutes on Normal difficulty
4. Stop recording and analyze:
   - **Frame time:** Is it consistently under 16.6ms (60fps)? Where are the spikes?
   - **Memory:** Is memory growing steadily (leak) or stable?
   - **GC pauses:** Are garbage collection pauses causing frame drops?
   - **Hottest functions:** What takes the most CPU time?

**Expected findings (from Engine Analysis):**
- The O(N^2) enemy merge loop is the likely bottleneck at 100+ enemies
- Material cloning per particle creates GC pressure
- Individual scene.add/remove per particle is expensive

**Action items based on findings:**
- If merge loop is >10% of frame time: defer spatial hash grid to post-alpha but note it
- If memory grows unbounded: identify the leak source and fix
- If GC pauses cause visible stutters: reduce per-frame allocations

**Done when:** 10-minute run stays above 30fps on mid-range laptop. Performance report written (can be informal notes).

---

## Task F-10: Deployment to itch.io or GitHub Pages

**What to build:** Deploy the alpha build to a publicly accessible URL.

**Preferred: itch.io** (better for game distribution, built-in fullscreen, community features)
**Fallback: GitHub Pages** (simpler setup)

### itch.io Deployment Steps:
1. Create a zip of the project root (all JS files, index.html, sound-pack-alpha/, and the CDN reference)
2. Create an itch.io account and project page
3. Upload the zip as an HTML5 game
4. Set viewport to 960x540 or "Fill available space"
5. Test the deployed version in a browser
6. Note the URL

### GitHub Pages Deployment Steps:
1. Push to a `gh-pages` branch (or use main if it is clean)
2. Enable GitHub Pages in repository settings
3. Test at the provided URL
4. Note the URL

### Pre-deployment checklist:
- [ ] All Track F bug fixes merged
- [ ] Developer QA gate (M3.5) passed
- [ ] 2D mode gate active (no path to 2D)
- [ ] SRI hash on Three.js CDN
- [ ] Audio files included in build
- [ ] No console errors on a fresh load
- [ ] Game loads and plays on a machine the developer has NOT previously tested on

**Done when:** URL loads and plays on a machine the developer has not tested on.

---

## Tester Instructions (Write After Deployment)

After deploying, write a one-page tester instruction document:

```
WILDFANG ALPHA -- TESTER INSTRUCTIONS

HOW TO PLAY:
- Open the link in Chrome, Firefox, or Edge (desktop only, no mobile yet)
- Click to focus the game, then press ENTER to start
- Pick an animal and a difficulty (try CHILL MODE if you're playing with kids!)
- WASD to move, SPACE to jump, HOLD B for power attack, ESC to pause

WHAT TO FOCUS ON:
- The animal characters and how they feel different
- The zombie merge system (watch zombies combine into bigger ones!)
- The power attack charge bar (hold B, watch the bar fill, then release)
- The sound effects (all mouth-made by a 7-year-old!)
- The weapons and items you find during the run

WHAT IS MISSING (known):
- Only one biome (forest) -- more coming later
- No gamepad support yet
- Some sounds are missing (pickup chimes, footsteps)
- Some visual effects are placeholder

YOUR FEEDBACK MATTERS:
- The game-over screen has 3 quick questions -- please answer them!
- For deeper feedback: [LINK TO FULL FEEDBACK FORM]
- Or just message me directly with your thoughts

Thank you for testing!
```

**Done when:** URL and instructions sent to 10+ confirmed testers.
