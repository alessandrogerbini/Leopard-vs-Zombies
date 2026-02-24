# Beads from Playthrough Findings (BD-107 through BD-112)

**Date:** 2026-02-23
**Source:** `play-through-findings.md` (automated Playwright playthrough, 6 minutes of 3D Survivor mode)
**Focus:** Name entry filtering, resource 404, controls hint visibility, level-up balance, XP gem visuals, post-upgrade invulnerability

---

## Triage Notes

The following findings from the playthrough were **skipped** (not converted to beads) for the reasons listed:

| Finding | Reason Skipped |
|---------|----------------|
| BUG-01, BUG-02, UX-01, SUG-01 | Mode select screen already has a full visual UI (`js/renderer.js:2957+` — cards, icons, descriptions, arrow nav). The "identical to title" observation is a Playwright screenshot timing artifact — the automated player pressed Enter too fast and screenshots captured between frames. Not a real bug. |
| BUG-03 | Working as intended — level-up menu pauses the game and must be dismissed before other UI (Tab/minimap) can be used. |
| BUG-04 | Working as intended — game timer tracks game-time, not real-time. Level-up pause consumed the difference. |
| UX-02, SUG-03 | Already covered by **BD-40** (Increase HUD font sizes and contrast for kid readability). |
| UX-04, UX-07 | Positive observations — no fix needed. |
| UX-05 | Game over screen is information-dense but functional. No specific fix warranted. |
| UX-06, SUG-06 | Minimap size already addressed by **BD-97** (fog-of-war map) and **BD-98** (minimap boundaries + full map view). |
| BAL-01, BAL-02, BAL-04, BAL-05 | Observations only — no specific balance fix warranted from these. BAL-01 (HP drops in mid-game) is expected survival pressure. |
| GFX-01 through GFX-08 | All positive observations or SwiftShader rendering notes. No fixes needed. |
| SUG-08 | Power attack already has a chunky segmented charge bar in the HUD (`js/3d/hud.js:531-560`). The automated player could not tell because screenshots are static. A human player sees the bar fill in real-time. Not actionable without further human playtesting feedback. |

---

## BD-107: Name entry captures WASD movement keys after game over

**Category:** Bug — Input/UI
**Priority:** P1
**File(s):** `js/game3d.js` (lines 509-519, keydown handler in game-over state)

### Description
When the player dies, the game over screen activates name entry (`st.nameEntryActive = true`). However, if the player was holding movement keys (WASD) at the moment of death, those keys are captured as text characters in the name entry field. The playthrough showed "WWD" typed into the name field from residual WASD presses.

The root cause is at line 517: `e.key.length === 1 && st.nameEntry.length < 10` accepts any single character, including w/a/s/d. There is no input cooldown after transitioning to game-over, and no filtering of movement keys.

### Fix Approach
Two-part fix:

1. **Input cooldown:** When `st.gameOver` is first set to `true` (line ~4921 in the death handler), record a timestamp or set a short cooldown timer (e.g., `st.nameEntryInputCooldown = 0.3`). In the keydown handler (line 509), skip name entry input while the cooldown is active. Decrement the cooldown in the update loop.

2. **Filter movement keys:** In the name entry character acceptance block (line 517), reject keys that are bound to movement: `w`, `a`, `s`, `d`, and optionally other gameplay keys like `b` (power attack), `r` (reroll), `e` (interact). Add a rejection set:
   ```javascript
   const BLOCKED_NAME_KEYS = new Set(['w','a','s','d','b','r','e',' ']);
   ```
   Check `!BLOCKED_NAME_KEYS.has(e.key.toLowerCase())` before accepting the character.

### Acceptance Criteria
- Movement keys (WASD) are not captured as text in the name entry field
- Name entry field starts empty after death (no residual characters)
- A brief input cooldown (~300ms) prevents any stray keypresses from registering immediately after game over
- Players can still type letters A-Z (except WASD) and digits for their name
- Backspace and Enter still function normally in name entry

---

## BD-108: Investigate and fix 404 resource error on game startup

**Category:** Bug — Assets/Loading
**Priority:** P2
**File(s):** `js/3d/audio.js`, potentially missing file in `sound-pack-alpha/`

### Description
One 404 error was logged during game startup: "Failed to load resource: the server responded with a status of 404 (File not found)". The audio system in `js/3d/audio.js` loads ~40 sound files from `sound-pack-alpha/` using `new Audio()` elements. The fail-silent design means the game continues without the missing sound, but the 404 pollutes the console and indicates a mismatch between the sound ID manifest and the actual files on disk.

### Fix Approach
1. Cross-reference every filename in the `SOUND_MAP` object in `js/3d/audio.js` (lines ~35-145) against the actual files in `sound-pack-alpha/`.
2. Identify the missing file(s).
3. Either:
   - Add the missing sound file if it exists elsewhere or can be created, OR
   - Remove the reference from `SOUND_MAP` if the sound is no longer needed.
4. Optionally, add a startup check that logs which specific file failed (the current `onerror` handler may not log the URL).

### Acceptance Criteria
- Zero 404 errors in the browser console during game startup and gameplay
- All entries in `SOUND_MAP` correspond to files that exist on disk
- `sound-ids.md` manifest matches the actual `SOUND_MAP` entries
- Audio system continues to fail silently for any future missing files (no crashes)

---

## BD-109: Controls hint text at bottom of HUD is invisible against terrain

**Category:** Bug — HUD/Readability
**Priority:** P2
**File(s):** `js/3d/hud.js` (line 357-358)

### Description
The controls hint text ("WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause") renders at the bottom center of the screen in `rgba(255,255,255,0.3)` — white at 30% opacity. Against the green forest terrain, this text is nearly invisible. The playthrough screenshots confirm it blends into the background.

This is distinct from BD-40 (which addresses font sizes and contrast globally). This bead specifically addresses the controls hint needing a background strip to be legible regardless of terrain color behind it.

### Fix Approach
Add a semi-transparent dark background strip behind the controls hint text. Before the `fillText` call at line 358:

```javascript
// Dark background strip for controls hint
const hintText = 'WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause';
const hintW = ctx.measureText(hintText).width + 20;
ctx.fillStyle = 'rgba(0,0,0,0.4)';
ctx.fillRect(W / 2 - hintW / 2, H - 24, hintW, 20);
// Then draw text
ctx.fillStyle = 'rgba(255,255,255,0.5)'; // bump opacity from 0.3 to 0.5
ctx.fillText(hintText, W / 2, H - 10);
```

### Acceptance Criteria
- Controls hint text is legible against all terrain types (green grass, brown plateaus, dark areas)
- A semi-transparent dark background strip sits behind the text
- Text opacity is increased from 0.3 to at least 0.5
- The hint does not obscure important gameplay elements (it remains at the very bottom edge)
- Hint fades out or is hidden during game-over and upgrade menus (verify existing behavior)

---

## BD-110: Level-up choices skew toward howls over weapons in early game

**Category:** Balance — Progression
**Priority:** P2
**File(s):** `js/game3d.js` (function `showUpgradeMenu`, lines 3186-3288)

### Description
By level 7 in the playthrough, the player had acquired 4 howls (Power, Haste, Magnet, Guardian) but only 2 weapons (Claw Swipe, Snowball Turret) — both at level 1. The level-up menu uses a uniform random shuffle of the entire pool (line 3286: `pool.sort(() => Math.random() - 0.5)`) with no weighting. Since `st.availableHowls` offers up to 10 howl types while only ~3-4 weapons are typically available (constrained by weapon slots), howls naturally dominate the pool.

At early levels (1-5) when the player has only 1 weapon slot and 0-1 weapon upgrades available, the pool is overwhelmed by howl options. This means weapon upgrades are rarely offered, and the player's active combat toolkit stays stagnant while passive buffs accumulate.

### Fix Approach
Add category-aware weighting to the upgrade pool before shuffling. Guarantee at least 1 weapon-category option (new weapon or weapon upgrade) appears in the 3 choices when one is available:

1. After building the `pool` array (line 3265), partition it into `weaponPool` (categories 'NEW WEAPON' and 'UPGRADE') and `otherPool` (categories 'HOWL' and 'HEAL').
2. If `weaponPool.length > 0`, ensure at least 1 weapon option is included in the final 3 choices:
   - Pick 1 random from `weaponPool`
   - Pick 2 random from the remaining full pool (shuffled)
   - Shuffle the final 3
3. If `weaponPool` is empty, fall back to the current uniform random behavior.

### Acceptance Criteria
- When weapon upgrades or new weapons are available, at least 1 of the 3 level-up choices is weapon-related
- Howls still appear regularly (they are not suppressed, just no longer able to crowd out weapons entirely)
- At levels where no weapon options exist (all weapons maxed, no slots available), behavior is unchanged
- Reroll (R key) regenerates choices using the same weighting logic
- Heal fallback options still work when the pool is small

---

## BD-111: XP gems are too small and lack visual presence

**Category:** Enhancement — Visuals/Readability
**Priority:** P2
**File(s):** `js/game3d.js` (lines 1681-1698, `createXpGem` and gem geometry/material)

### Description
XP gems are 0.25x0.25x0.25 unit boxes (`THREE.BoxGeometry(0.25, 0.25, 0.25)`) with a purple material (`color: 0x7744ff, emissive: 0x4422aa`). In the playthrough screenshots, they appear as tiny purple dots that are hard to distinguish from the terrain, especially at distance. The gems bob vertically (line 1697: `bobPhase`) but have no other visual effects.

For a core gameplay loop element (XP collection drives leveling), the gems need more visual presence to guide player movement and create satisfying collection moments.

### Fix Approach
Three incremental improvements:

1. **Increase size:** Change `BoxGeometry(0.25, 0.25, 0.25)` to `BoxGeometry(0.35, 0.35, 0.35)` — a 40% increase that makes them readable at mid-range without looking oversized.

2. **Add emissive pulse:** In the XP gem update loop (lines 4529-4559), modulate the gem material's emissive intensity based on time to create a subtle pulse:
   ```javascript
   gem.mesh.material.emissiveIntensity = 0.6 + Math.sin(gem.bobPhase + elapsed * 3) * 0.4;
   ```
   Note: since all gems share `gemMat`, this would need per-gem materials or a shader uniform. The simpler approach is to vary the gem's scale slightly with the bob phase to create a "breathing" effect.

3. **Add point light (optional, performance-gated):** If performance allows, add a small `THREE.PointLight` with range 2 and intensity 0.3 to each gem. Only enable this if total gem count is below a threshold (e.g., 50 gems). Skip this if it causes frame drops.

### Acceptance Criteria
- XP gems are visibly larger than current (at least 0.35 unit cubes)
- Gems have a visible pulse or breathing animation (scale or emissive variation)
- Gems are distinguishable from terrain at 10+ unit distance
- No significant performance impact (test with 100+ gems on screen)
- Magnet Howl collection radius still works correctly with larger gems
- Purple color and emissive glow are preserved

---

## BD-112: Add brief invulnerability window after closing level-up menu

**Category:** Enhancement — Gameplay/Fairness
**Priority:** P2
**File(s):** `js/game3d.js` (upgrade menu dismissal at lines 541-548, and damage check at lines 4270-4297)

### Description
The game pauses during the level-up upgrade menu, but zombies remain positioned around the player. When the menu is dismissed and the game unpauses, zombies that were in melee range during the pause immediately deal damage on the next frame. This can cause "cheap deaths" where the player takes unavoidable damage the instant they close the menu, especially in dense late-game scenarios.

The game already has an invincibility frames system (`st.invincible`, line 348, decremented at line 3576, checked at line 4270). The fix is straightforward: set a brief invulnerability window when the upgrade menu closes.

### Fix Approach
In the upgrade menu confirmation handler (around line 545, where the chosen upgrade is applied and `st.upgradeMenu` is set to `false`):

```javascript
// After applying the upgrade choice:
st.upgradeMenu = false;
st.paused = false;
st.invincible = 1.0; // 1 second of invulnerability after closing upgrade menu
```

The existing damage check at line 4270 (`if (... && st.invincible <= 0)`) will automatically respect this timer. The existing decrement at line 3576 (`if (st.invincible > 0) st.invincible -= dt;`) will count it down.

Also apply the same invulnerability grant when closing the charge shrine menu, for consistency.

### Acceptance Criteria
- Player has ~1 second of invulnerability after dismissing the level-up upgrade menu
- Player has ~1 second of invulnerability after dismissing the charge shrine menu
- Invulnerability is visible to the player (the existing invincible system may already flash the model — verify)
- Invulnerability does not stack with other sources (it's a simple timer override, not additive)
- Player can still move, attack, and collect items during the invulnerability window
- Timer counts down normally and player becomes vulnerable after it expires

---

## Parallelization Notes

### Independent (can run in parallel)
- **Batch A — Input:** BD-107 (name entry filtering — keydown handler in game3d.js)
- **Batch B — Assets:** BD-108 (404 error — audio.js + sound-pack-alpha, read-only investigation)
- **Batch C — HUD:** BD-109 (controls hint background — hud.js only, isolated section)
- **Batch D — Balance:** BD-110 (level-up weighting — showUpgradeMenu in game3d.js)
- **Batch E — Visuals:** BD-111 (XP gem size/glow — createXpGem in game3d.js)
- **Batch F — Gameplay:** BD-112 (post-upgrade invulnerability — upgrade dismiss handler in game3d.js)

### Conflict Matrix
- BD-107 and BD-112 both touch the keydown/upgrade-menu handler area in game3d.js — **LOW conflict** (different line ranges: 509-519 vs 541-548)
- BD-110 and BD-112 both touch `showUpgradeMenu` and upgrade dismissal — **MEDIUM conflict** (BD-110 modifies pool generation, BD-112 modifies menu close). Recommend same agent.
- BD-111 is fully isolated (gem geometry section, ~1680-1698)
- BD-108 is read-only investigation + asset fix, no code conflict
- BD-109 is isolated in hud.js

### Recommended Batches
1. **Agent 1:** BD-107 (name entry input filtering)
2. **Agent 2:** BD-108 (404 investigation — may be quick)
3. **Agent 3:** BD-109 (controls hint background strip)
4. **Agent 4:** BD-110 + BD-112 (level-up balance + post-upgrade invulnerability — related upgrade menu code)
5. **Agent 5:** BD-111 (XP gem visual improvements)
