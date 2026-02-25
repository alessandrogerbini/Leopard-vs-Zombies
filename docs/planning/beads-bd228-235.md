# Beads: BD-228 through BD-235

**Date:** 2026-02-24
**Source:** Death clarity UX forward plan -- translating research into phased death sequence implementation.
**Reference:** `docs/forward-plans/death-clarity-forward-plan.md`, `docs/research/death-clarity-ux.md`

**Prerequisite work (already complete):**

| Bead | What It Did | Where |
|------|-------------|-------|
| **BD-216 A** | `st.lastDamageSource` tracked in every `damagePlayer()` call site (contact, deathBolt, boneSpit, slam, shockwave, poison, lunge, graveBurst) | `js/game3d.js` ~line 2754 |
| **BD-216 B** | `DEFEATED BY: [TIER NAME]` rendered in tier color on game-over screen between Time and total kills | `js/3d/hud.js` ~line 1256-1261 |
| **BD-214** | Permanent `_trueColor` userData on every player mesh; hurt flash uses `_trueColor` instead of ephemeral `_origColor`, preventing stuck-white model | `js/game3d.js` ~line 1652, 4613-4632 |
| **BD-208** | Hurt flash cooldown (1.0s) prevents flash spam in swarm situations | `js/game3d.js` ~line 2760-2762 |

These beads build on top of the existing BD-216 A/B foundation.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Core infrastructure or data foundation required by other beads | Next sprint |
| **P2** | Visual/audio enhancement layered on top of P1 infrastructure | After P1 beads land |

---

## P1 -- Infrastructure

---

### BD-228: Death sequence state machine -- slow-mo time scale with 1.5s real-time countdown

**Category:** Feature -- Death Sequence Infrastructure
**Priority:** P1
**File(s):** `js/game3d.js`

**Description:** Replace the current instant-cut-to-game-over with a 1.5-second slow-motion death sequence. When HP hits 0, the game enters `st.deathSequence` instead of immediately setting `st.gameOver`. Game logic (enemies, projectiles, particles) continues running at a ramped-down time scale (1.0 down to 0.15), creating a dramatic slow-mo effect. After 1.5s real-time, the sequence ends and transitions to `st.gameOver = true` with all existing cleanup.

**Current death flow** (lines ~6370-6388 of `game3d.js`):
```
HP hits 0 --> st.gameOver = true immediately --> clears keys/charging
--> plays sfx_player_death (falling-scream-1.ogg) --> next frame renders game-over HUD overlay
```

There is no intermediate death sequence, no camera movement, no player animation, no vignette. This bead adds the state machine that enables all of those.

**Implementation:**

**Step 1 -- Add state variables** to the state object (~line 361):
```js
deathSequence: false,
deathSequenceTimer: 0,
deathTimeScale: 1.0,
deathKillerPos: null,
```

**Step 2 -- Replace the death check** at ~line 6370. The current code:
```js
if (st.hp <= 0) {
  st.hp = 0;
  st.gameOver = true;
  // ... cleanup
}
```

Replace with:
```js
// Enter death sequence (first frame only)
if (st.hp <= 0 && !st.deathSequence && !st.gameOver) {
  st.hp = 0;
  st.deathSequence = true;
  st.deathSequenceTimer = 1.5;
  st.deathTimeScale = 1.0;
  // Capture killer position for camera zoom (BD-229)
  if (st.lastDamageSource && st.lastDamageSource.killerX !== undefined) {
    st.deathKillerPos = { x: st.lastDamageSource.killerX, z: st.lastDamageSource.killerZ };
  } else {
    st.deathKillerPos = null;
  }
  // Disable player input immediately
  keys3d['Enter'] = false;
  keys3d['NumpadEnter'] = false;
  keys3d['Space'] = false;
  st.charging = false;
  st.chargeTime = 0;
  st.powerAttackReady = false;
}

// Tick death sequence (runs every frame during the 1.5s)
if (st.deathSequence && !st.gameOver) {
  st.deathSequenceTimer -= realDt; // real dt, NOT scaled
  const progress = 1 - (st.deathSequenceTimer / 1.5);
  // Ramp: 1.0 --> 0.15 over first 0.5s (progress 0-0.33), hold 0.15 for remaining 1.0s
  st.deathTimeScale = progress < 0.33
    ? 1.0 - (progress / 0.33) * 0.85
    : 0.15;

  if (st.deathSequenceTimer <= 0) {
    st.gameOver = true;
    st.deathSequence = false;
    st.showFullMap = false;
    st.enterReleasedSinceGameOver = false;
    st.nameEntryActive = true;
    st.nameEntry = '';
    st.nameEntryInputCooldown = 0.3;
  }
}
```

**Step 3 -- Apply time scale to game logic.** The main loop already computes `dt` from the Three.js clock. Store a copy as `realDt` before applying the death scale:
```js
const realDt = dt;
const gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1);
```

All game-logic `dt` usages within the update block (enemy movement, projectile travel, particle updates -- approximately 30 sites) must use `gameDt` so enemies, projectiles, and particles visibly slow down. The death sequence timer, camera interpolation, and death animation use `realDt`.

**Step 4 -- Control what runs during death sequence:**

| Keeps running (at `gameDt` speed) | Stops immediately |
|---|---|
| Enemy movement | Player input/movement |
| Weapon projectiles in flight | New enemy spawning |
| Particle effects | Weapon auto-fire |
| Player hurt flash (extended to 1.5s) | Powerup timers |
| | XP collection |

**Time scale ramp timeline (1.5 seconds real-time):**
```
Time 0.0s     0.3s          0.5s                          1.5s
  |-----------|--------------|------------------------------|
  |  RAMP     |  HOLD        |  HOLD (continued)           |
  |  1.0->0.15|  0.15        |  0.15                       |
```

**Risk -- dt audit:** This is the highest-risk bead. Applying `deathTimeScale` to some `dt` usages but missing others creates visual desync (e.g., particles at full speed while enemies are slow). Mitigation: create a single `gameDt` variable at the top of the update block and use it everywhere.

**Acceptance Criteria:**
- When HP reaches 0, game enters a 1.5s slow-motion phase before showing game-over
- Enemies and projectiles visibly slow down during the death sequence
- Player input is fully disabled during the death sequence
- No new enemies spawn during the death sequence
- After 1.5s real-time, the game-over screen appears with all existing stats, feedback, and name entry intact
- The time-scale ramp is smooth (1.0 to 0.15 over first 0.5s, then holds at 0.15)
- No regression to game-over flow, leaderboard, or restart functionality

---

### BD-235: Add `killerX`/`killerZ`/`enemyRef` to all `damagePlayer()` call sites

**Category:** Feature -- Data Foundation
**Priority:** P1
**File(s):** `js/game3d.js`

**Description:** Extend the existing `st.lastDamageSource` objects (added by BD-216 A) to include `killerX`, `killerZ`, and `enemyRef` fields at every `damagePlayer()` call site. This provides the positional and reference data needed by BD-229 (camera zoom-to-killer) and BD-234 (killer highlight glow). Ships standalone with no visual change.

**Implementation:**

The `damagePlayer()` function (~line 2754) already accepts a `source` parameter with `{ type, tierName, tier, color }`. Each call site needs three additional fields.

**Contact damage** (~line 5511):
```js
damagePlayer(baseDmg, undefined, {
  type: 'contact', tierName: tierData.name, tier: e.tier || 1, color: tierData.eye,
  killerX: e.group.position.x, killerZ: e.group.position.z,
  enemyRef: e
});
```

Repeat for all 7+ call sites:

| Call Site | `killerX`/`killerZ` Source | `enemyRef` |
|-----------|---------------------------|------------|
| Contact damage | `e.group.position.x/z` | `e` |
| Slam | `e.group.position.x/z` | `e` |
| Shockwave | `e.group.position.x/z` | `e` |
| Death bolt | projectile origin position | `e` (bolt owner) |
| Bone spit | projectile origin position | `e` (spit owner) |
| Lunge | `e.group.position.x/z` | `e` |
| Grave burst | grave position `x/z` | `null` (no living enemy) |
| Poison | `e.group.position.x/z` or zone center | `e` (if available) |

For projectile-based damage (death bolt, bone spit), use the projectile's origin position (where the enemy was when it fired), not the projectile's current position. This ensures the camera zooms toward the actual attacker.

For grave burst (no living enemy), `enemyRef` is `null`. BD-229 and BD-234 must handle this edge case gracefully (camera zooms to position only, no highlight glow).

**Acceptance Criteria:**
- All `damagePlayer()` call sites pass `killerX`, `killerZ`, and `enemyRef` fields in the source object
- `st.lastDamageSource` contains positional data after every damage event
- No visual or behavioral change -- this is a data-only enhancement
- No regression to existing damage tracking or DEFEATED BY text
- Grave burst and other edge cases pass `null` for `enemyRef` without errors

---

## P2 -- Visual and Audio Enhancements

---

### BD-229: Camera zoom-to-killer -- interpolate lookAt toward killer midpoint, 35% distance reduction

**Category:** Feature -- Death Sequence Camera
**Priority:** P2
**File(s):** `js/game3d.js`
**Depends on:** BD-228 (death sequence state), BD-235 (killer position data)

**Description:** During the death sequence, the camera zooms in (35% distance reduction) and its lookAt target interpolates from the player toward the midpoint between the player and the killer. This wordlessly frames the killer in the viewport, answering "what got me?" without any text. If no killer position is available, the camera simply zooms in on the player.

**Current camera** (~lines 6391-6398):
```js
const camTargetX = st.playerX;
const camTargetZ = st.playerZ + 14;
const camTargetY = st.playerY + 18;
camera.position.x += (camTargetX - camera.position.x) * 0.05;
camera.position.z += (camTargetZ - camera.position.z) * 0.05;
camera.position.y += (camTargetY - camera.position.y) * 0.05;
camera.lookAt(st.playerX, st.playerY, st.playerZ);
```

**Implementation:**

During `st.deathSequence`, override the camera with:
```js
if (st.deathSequence) {
  const progress = 1 - (st.deathSequenceTimer / 1.5);
  const zoomFactor = 1 - progress * 0.35; // 1.0 --> 0.65

  // Zoom: reduce offset distances
  const zoomOffsetZ = 14 * zoomFactor;
  const zoomOffsetY = 18 * zoomFactor;

  // LookAt target: blend toward killer midpoint if we have their position
  let lookX = st.playerX, lookZ = st.playerZ;
  if (st.deathKillerPos) {
    const dx = st.deathKillerPos.x - st.playerX;
    const dz = st.deathKillerPos.z - st.playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    // Clamp blend distance so camera doesn't pan wildly for long-range attacks
    const maxBlendDist = 8;
    const clampedDist = Math.min(dist, maxBlendDist);
    const ratio = dist > 0 ? clampedDist / dist : 0;
    const midX = st.playerX + dx * ratio * 0.5;
    const midZ = st.playerZ + dz * ratio * 0.5;
    const blendT = Math.min(progress * 1.5, 1); // reach full blend at ~67% progress
    lookX = st.playerX + (midX - st.playerX) * blendT;
    lookZ = st.playerZ + (midZ - st.playerZ) * blendT;
  }

  const camTargetX = lookX;
  const camTargetZ = lookZ + zoomOffsetZ;
  const camTargetY = st.playerY + zoomOffsetY;
  camera.position.x += (camTargetX - camera.position.x) * 0.08; // faster lerp during death
  camera.position.z += (camTargetZ - camera.position.z) * 0.08;
  camera.position.y += (camTargetY - camera.position.y) * 0.08;
  camera.lookAt(lookX, st.playerY, lookZ);
}
```

**Key design decisions:**
- The lookAt blends toward the **midpoint** between player and killer, NOT directly to the killer. This keeps both the player model and the killer visible in frame.
- The killer position is **snapshotted** at death-sequence start (`st.deathKillerPos` set in BD-228). It never updates during the sequence, preventing camera jitter from the enemy still moving in slow-mo.
- The blend distance is **clamped to 8 world units** from the player. Long-range attacks (death bolt, bone spit) would otherwise cause wild camera pans.
- The lerp factor increases from 0.05 to 0.08 for snappier zoom response.

**Edge cases:**
- `st.deathKillerPos` is null (unknown damage source, e.g., grave burst): camera simply zooms in on the player.
- Killer is very far away: the 8-unit clamp prevents excessive panning.
- After death sequence ends and game-over screen appears, camera holds at its final position.

**Acceptance Criteria:**
- During death sequence, camera zooms in by approximately 35% (offset distances reduce from 14/18 to ~9.1/11.7)
- Camera lookAt smoothly blends toward the midpoint between player and killer
- Both player and killer remain visible in the viewport during the zoom
- Camera does not jitter or snap
- When no killer position is available, camera zooms in on the player only
- Long-range killer positions are clamped to prevent wild camera pans
- No regression to normal gameplay camera behavior

---

### BD-230: Player death stumble animation -- forward tilt, arm flail, gray-out desaturation

**Category:** Feature -- Death Animation
**Priority:** P2
**File(s):** `js/3d/player-model.js`, `js/game3d.js`
**Depends on:** BD-228 (death sequence state)

**Description:** During the death sequence, the player model performs a gentle forward-tilt stumble animation (not a violent ragdoll). Arms flail outward, legs go limp, tail droops, and the model progressively desaturates to gray. The animation hits its final pose at 60% progress and holds, leaving the remaining time for the camera and vignette to do their work.

**Death animation keyframes:**

| Progress | Body Tilt (rotation.x) | Y Offset | Arms | Legs | Tail |
|----------|----------------------|----------|------|------|------|
| 0% | 0 | 0 | Normal | Normal | Wagging |
| 20% | -15 deg | -0.1 | Spread slightly | Slight bend | Stops |
| 40% | -30 deg | -0.2 | Spread wide | Limp | Droops |
| 60% | -45 deg | -0.4 | Spread wide | Limp | Droops |
| 100% | -45 deg (held) | -0.4 (held) | Same | Same | Same |

**Implementation -- Part A (animation in `js/3d/player-model.js`):**

In `animatePlayer()` (~line 371), add a death animation branch at the top, before normal animation:
```js
// At top of animatePlayer(), before normal animation:
if (st.deathSequence) {
  const deathProgress = 1 - (st.deathSequenceTimer / 1.5);

  // Forward tilt: 0 --> 45 degrees over first 60% of sequence
  const tiltProgress = Math.min(deathProgress / 0.6, 1);
  const tilt = tiltProgress * (Math.PI / 4); // max 45 degrees forward
  group.rotation.x = -tilt;

  // Sink into ground slightly
  group.position.y = st.playerY - tiltProgress * 0.4;

  // Arms flail outward
  if (arms[0]) arms[0].position.x = -0.6 - tiltProgress * 0.3;
  if (arms[1]) arms[1].position.x = 0.6 + tiltProgress * 0.3;

  // Legs go limp (slight bend backward)
  if (legs[0]) { legs[0].position.z = -0.1 * tiltProgress; legs[0].position.y = 0.25; }
  if (legs[1]) { legs[1].position.z = -0.1 * tiltProgress; legs[1].position.y = 0.25; }

  // Tail drops
  if (tail) tail.rotation.y = 0; // stop wagging
  if (tail) tail.rotation.x = tiltProgress * 0.5; // droop

  return; // skip all other animation
}
```

**Implementation -- Part B (gray-out desaturation in `js/game3d.js`):**

In the hurt flash section (~line 4615), add a death-sequence desaturation branch. Guard the normal hurt flash with `if (!st.deathSequence)` and add the gray-out in an else branch:
```js
if (st.deathSequence) {
  const deathProgress = 1 - (st.deathSequenceTimer / 1.5);
  const grayMix = Math.min(deathProgress * 1.2, 0.7); // max 70% gray
  playerGroup.traverse(child => {
    if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
      const orig = child.userData._trueColor;
      const r = (orig >> 16) & 0xff;
      const g = (orig >> 8) & 0xff;
      const b = orig & 0xff;
      const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      const mr = Math.round(r + (gray - r) * grayMix);
      const mg = Math.round(g + (gray - g) * grayMix);
      const mb = Math.round(b + (gray - b) * grayMix);
      child.material.color.setHex((mr << 16) | (mg << 8) | mb);
    }
  });
}
```

The gray-out uses the `_trueColor` userData added by BD-214 as its reference, ensuring correct blending regardless of hurt flash state.

**Acceptance Criteria:**
- Player model tilts forward up to 45 degrees during death sequence
- Arms spread outward, legs go limp, tail stops wagging and droops
- Animation reaches final pose at 60% progress and holds for the remaining 40%
- Model progressively desaturates toward 70% gray over the death sequence
- No violent or grotesque animation -- a gentle forward lean like a toy soldier tipping
- Normal animation resumes correctly on game restart (no stuck rotation)
- Works correctly with all 4 animal types (leopard, redPanda, lion, gator)
- No conflict with the existing hurt flash system (BD-208/BD-214)

---

### BD-231: Red death vignette -- radial gradient HUD overlay fading over death sequence

**Category:** Feature -- Death Sequence HUD Effect
**Priority:** P2
**File(s):** `js/3d/hud.js`, `js/game3d.js`
**Depends on:** BD-228 (death sequence state)

**Description:** When the death sequence begins, a red radial-gradient vignette appears on the HUD canvas (red at edges, transparent center). The vignette starts at alpha 0.5 and fades to 0.0 over the 1.5s death sequence. This bypasses the normal 1.0s hurt flash cooldown as a one-time "you just died" signal.

**Implementation -- Part A (vignette in `js/3d/hud.js`):**

In `drawHUD()`, add a vignette pass during the death sequence. Insert before the game-over overlay check:
```js
// Death vignette (draws on top of gameplay, under game-over overlay)
if (s.deathSequence) {
  const progress = 1 - (s.deathSequenceTimer / 1.5);
  const alpha = 0.5 * (1 - progress); // 0.5 --> 0.0

  // Radial gradient: red edges, transparent center
  const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  gradient.addColorStop(0, 'rgba(180, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}
```

**Implementation -- Part B (force hurt flash on death, in `js/game3d.js`):**

In the death sequence entry block (BD-228's entry code), add:
```js
st.playerHurtFlash = 1.5; // longer flash, lasts entire death sequence
st.playerHurtFlashCooldown = 0; // bypass cooldown
```

This ensures an immediate visual hit reaction on the killing blow, even if the player was recently damaged (cooldown would normally block it).

**Acceptance Criteria:**
- Red vignette appears at screen edges the instant the death sequence begins
- Vignette starts at alpha 0.5 (clearly visible but not obscuring gameplay)
- Vignette fades smoothly to alpha 0.0 by the end of the 1.5s sequence
- Vignette renders on top of gameplay but under the game-over overlay
- The killing blow triggers a hurt flash regardless of cooldown state
- No vignette artifact remains after the game-over screen appears
- No performance issues from the radial gradient (single canvas operation, runs for only 1.5s)

---

### BD-232: Game-over screen killer icon -- canvas zombie silhouette + color pill behind tier name

**Category:** Feature -- Game-Over Screen Enhancement
**Priority:** P2
**File(s):** `js/3d/hud.js`
**Depends on:** None (independent of BD-228; uses existing BD-216 B data)

**Description:** Enhance the existing DEFEATED BY line on the game-over screen with a zombie tier icon (canvas 2D silhouette) and a dark background pill behind the tier name. The icon creates a visual vocabulary so that after 3-4 runs, a child recognizes "the big red one got me again" without reading. Higher-tier icons (7+) get extra spikes or aura lines.

**Current layout** (from `hud.js` ~line 1234+):
```
Y=158  "DEFEATED BY: BRUTE" (tier color, 18px)     <-- BD-216 B
```

**Proposed enhanced layout:**
```
Y=158  [ZOMBIE ICON] "DEFEATED BY: BRUTE" on dark pill (tier color, 20px)
```

**Implementation:**

In the game-over section of `drawHUD()` (~line 1256), expand the DEFEATED BY block:
```js
if (s.lastDamageSource && s.lastDamageSource.tierName) {
  const srcColor = '#' + (s.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
  const tierIdx = (s.lastDamageSource.tier || 1) - 1;

  // -- Tier icon (left of text) --
  const iconCX = W / 2 - 120;
  const iconCY = 158;
  const iconScale = 1.2 + tierIdx * 0.1; // bigger icon for higher tiers
  drawZombieTierIcon(ctx, iconCX, iconCY, iconScale, srcColor);

  // -- Color pill behind tier name --
  const tierText = s.lastDamageSource.tierName.toUpperCase();
  ctx.font = 'bold 20px ' + GAME_FONT;
  const textW = ctx.measureText('DEFEATED BY: ' + tierText).width;
  // Rounded pill
  const pillX = W / 2 - textW / 2 - 8;
  const pillY = 158 - 16;
  const pillW = textW + 16;
  const pillH = 28;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, pillX, pillY, pillW, pillH, 6);
  ctx.fill();
  // Text
  ctx.fillStyle = srcColor;
  ctx.font = 'bold 20px ' + GAME_FONT;
  ctx.fillText('DEFEATED BY: ' + tierText, W / 2, 158);
}
```

**New helper function `drawZombieTierIcon()`** (~30 lines):

Draws a simplified zombie silhouette using canvas rectangles, mirroring the actual zombie model's box-primitive construction. All shapes in the tier color:
- Rectangle body (tier-colored)
- Smaller rectangle head on top
- Two small rectangle arms (slightly raised, menacing pose)
- Two rectangle legs
- Two glowing eye dots (using the tier eye color from `ZOMBIE_TIERS[tierIdx].eye`)
- For tiers 7+ (Abomination, Nightmare, Titan, Overlord): add "spike" triangles on shoulders and/or a glow ring behind the head

```js
function drawZombieTierIcon(ctx, cx, cy, scale, color) {
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
  ctx.restore();
}
```

**Acceptance Criteria:**
- Zombie tier icon appears to the left of the DEFEATED BY text on the game-over screen
- Icon is color-coded to match the killer's tier color
- Higher-tier icons are slightly larger (scale increases with tier)
- Dark rounded pill background appears behind the tier name for readability
- Text remains centered and legible at all tier name lengths
- No layout shift to surrounding game-over screen elements (score, time, kill count)
- Works correctly for all 10 zombie tiers

---

### BD-233: Death audio layering -- impact thud, slow-mo whoosh, transition sting

**Category:** Feature -- Death Sequence Audio
**Priority:** P2
**File(s):** `js/game3d.js`, `js/3d/audio.js`
**Depends on:** BD-228 (death sequence state)

**Description:** Replace the single `sfx_player_death` sound with a layered three-sound sequence during the death moment. The sounds play at specific offsets during the 1.5s death sequence timer, creating a recognizable "death jingle" that kids internalize within 2-3 plays.

**Audio timeline:**

| Event | Timing | Sound ID | Alpha Pack Source | Notes |
|-------|--------|----------|-------------------|-------|
| Killing blow lands | 0.0s | `sfx_death_impact` | `explode-1.ogg` (reuse) | Heavy thud on death |
| Slow-mo kicks in | 0.2s (timer <= 1.3) | `sfx_death_slowmo` | `falling-scream-1.ogg` (existing `sfx_player_death`) | Descending whoosh |
| Screen transitions | 1.5s (timer <= 0) | `sfx_death_sting` | *none -- silent placeholder* | `// TODO: Sound Pack Beta` |

**Implementation -- Part A (sound mappings in `js/3d/audio.js`):**

Add new sound ID mappings to the audio manager:
```js
sfx_death_impact: 'explode-1.ogg',    // reuse shrine break sound -- distinct context
sfx_death_slowmo: 'falling-scream-1.ogg',  // existing sfx_player_death source
// sfx_death_sting: TODO Sound Pack Beta -- sad 2-note mouth chord
```

**Implementation -- Part B (layered playback in `js/game3d.js`):**

Add a state variable for tracking the slow-mo sound trigger:
```js
_deathSlowmoPlayed: false,
```

In the death sequence entry block (BD-228):
```js
playSound('sfx_death_impact'); // immediate thud
st._deathSlowmoPlayed = false;
```

In the death sequence tick block (BD-228):
```js
if (st.deathSequenceTimer <= 1.3 && !st._deathSlowmoPlayed) {
  st._deathSlowmoPlayed = true;
  playSound('sfx_death_slowmo');
}
```

At sequence end (in the `st.deathSequenceTimer <= 0` block):
```js
playSound('sfx_death_sting'); // no-op until Sound Pack Beta adds the file
```

**Sound Pack Beta recording direction** (for future reference):
1. `sfx_death_impact`: A heavy mouth "THOOM" or "BWOMPH" -- low, resonant, brief (0.3s)
2. `sfx_death_slowmo`: A descending "wooooOOOooo" -- mid-pitch sliding down (0.8-1.0s)
3. `sfx_death_sting`: Two descending notes hummed: "doo-DOO" -- softer game-show wrong-answer jingle (0.5s)

**Acceptance Criteria:**
- Impact thud plays immediately when the death sequence begins
- Slow-mo whoosh plays 0.2s into the death sequence (once only, not repeated)
- Transition sting plays at the end of the death sequence (silent until Sound Pack Beta)
- Existing `sfx_player_death` call is removed or replaced by the layered sequence
- No audio overlap issues or double-play bugs
- All three sound IDs are registered in the audio manager (sting as a no-op placeholder)
- `_deathSlowmoPlayed` is reset properly so sounds trigger correctly on subsequent deaths (after restart)

---

### BD-234: Killer highlight glow -- emissive pulse on killing zombie + floating tier label during death sequence

**Category:** Feature -- Death Sequence Enemy Highlight
**Priority:** P2
**File(s):** `js/game3d.js`
**Depends on:** BD-228 (death sequence state), BD-235 (enemyRef data)

**Description:** During the death sequence, the specific zombie that dealt the killing blow gets a pulsing emissive glow. A floating tier-name label appears above the killer. All other zombies dim by 30%, directing the player's attention to the single enemy responsible. This provides the "one idea only" principle from the research -- highlighting exactly one enemy removes ambiguity.

**Implementation:**

Add a state variable:
```js
_killerLabelSpawned: false,
```

Set `_killerLabelSpawned = false` in the death sequence entry block (BD-228).

In the enemy update loop, during `st.deathSequence`:
```js
if (st.deathSequence) {
  for (const e of st.enemies) {
    if (e === st.lastDamageSource?.enemyRef) {
      // Pulsing glow on the killer
      const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
      e.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissive = child.material.emissive || new THREE.Color();
          child.material.emissive.setHex(st.lastDamageSource.color || 0xff4444);
          child.material.emissiveIntensity = pulse;
        }
      });
      // Floating tier label (spawned once)
      if (!st._killerLabelSpawned) {
        st._killerLabelSpawned = true;
        addFloatingText(
          st.lastDamageSource.tierName.toUpperCase(),
          '#' + (st.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0'),
          e.group.position.x, e.group.position.y + 3, e.group.position.z,
          2.0, true  // 2.0s life, important flag for larger text
        );
      }
    } else {
      // Dim other zombies (reduce brightness by 30%)
      e.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = 0;
          // Shift toward dark -- only needed once, track with flag
        }
      });
    }
  }
}
```

**Edge cases:**
- `enemyRef` is null (grave burst, unknown source): skip the highlight entirely. The floating label and dimming do not activate. Camera zoom (BD-229) and vignette (BD-231) still provide death feedback.
- `enemyRef` points to an enemy that died during the 1.5s sequence (killed by a weapon projectile still in flight): check `enemyRef.alive` or equivalent before applying glow. The floating label already spawned on an earlier frame, so it remains visible.
- Material restoration after death sequence: since the game-over screen overlays the 3D scene and restart re-initializes the entire scene, no explicit material restoration is needed.

**Acceptance Criteria:**
- The killing zombie pulses with an emissive glow in its tier color during the death sequence
- A floating tier-name label appears above the killer (uses existing `addFloatingText` system)
- All other zombies dim visibly (reduced brightness)
- The label spawns exactly once per death sequence (no duplicate labels)
- When `enemyRef` is null, the highlight is gracefully skipped with no errors
- When the killer enemy dies during the sequence, the glow stops but the label persists
- No material artifacts carry over to the next game after restart

---

## Dependency Graph

```
BD-235 (call site data) -- can ship standalone, no visual change
  |
BD-228 (state machine) -- core infrastructure, enables all other beads
  |
  +-- BD-229 (camera)    -- requires BD-228 + BD-235
  +-- BD-230 (animation) -- requires BD-228 only
  +-- BD-231 (vignette)  -- requires BD-228 only
  +-- BD-233 (audio)     -- requires BD-228 only
  |
BD-232 (death screen icon) -- independent of BD-228, can ship anytime
BD-234 (killer glow)       -- requires BD-228 + BD-235

Parallelizable: BD-229, BD-230, BD-231, BD-233 can run in parallel once BD-228 lands.
BD-232 can run in parallel with everything (it only touches hud.js game-over section).
```

**Suggested batching for parallel execution:**
- **Batch 1:** BD-235 + BD-232 (data prerequisite + independent HUD work)
- **Batch 2:** BD-228 (core state machine -- solo, needs careful testing)
- **Batch 3:** BD-229 + BD-230 + BD-231 + BD-233 (all depend on BD-228, touch different code sections, low conflict)
- **Batch 4:** BD-234 (depends on BD-228 + BD-235, can run after Batch 2 if BD-235 is merged)

---

## Conflict Analysis

- **BD-228** touches `js/game3d.js` (death check ~line 6370, main update loop dt flow, state object ~line 361) -- HIGH internal importance, LOW external conflict. Different code section from BD-213/214/215/216.
- **BD-229** touches `js/game3d.js` (camera section ~lines 6391-6398) -- NO conflict with BD-228 (different section). NO conflict with BD-230/231/233 (different code areas).
- **BD-230** touches `js/3d/player-model.js` (animatePlayer ~line 371) and `js/game3d.js` (hurt flash ~line 4615) -- LOW conflict with BD-228 (reads `st.deathSequence` but does not modify it). LOW conflict with BD-231 (BD-231 is in `hud.js`, BD-230's gray-out is in `game3d.js` hurt flash section).
- **BD-231** touches `js/3d/hud.js` (drawHUD, before game-over overlay) and `js/game3d.js` (2 lines in death entry block) -- LOW conflict with BD-232 (both in `hud.js` but different sections: BD-231 is pre-game-over, BD-232 is in game-over rendering).
- **BD-232** touches `js/3d/hud.js` (game-over DEFEATED BY section ~line 1256) -- NO conflict with BD-228/229/230/233/234 (only modifies the game-over screen layout). LOW conflict with BD-231 (different section of hud.js).
- **BD-233** touches `js/game3d.js` (death entry/tick blocks) and `js/3d/audio.js` (sound mappings) -- LOW conflict with BD-228 (adds lines inside BD-228's blocks). NO conflict with BD-229/230/231/232/234 (different files/sections).
- **BD-234** touches `js/game3d.js` (enemy update loop during death sequence) -- LOW conflict with BD-228 (reads state, does not modify death flow). NO conflict with BD-229/230/231/232/233 (different code sections).
- **BD-235** touches `js/game3d.js` (damagePlayer call sites ~8 locations) -- NO conflict with any other bead (modifies source object fields at call sites only).

**Conflict risk summary:** All beads touch distinct code sections. The only meaningful integration point is that BD-229, BD-230, BD-231, BD-233, and BD-234 all read `st.deathSequence` / `st.deathSequenceTimer` provided by BD-228 -- but they do not write to these variables, so there is no write-write conflict. BD-233 adds lines inside the code blocks created by BD-228, requiring merge attention if both are implemented in parallel (recommended: implement BD-228 first as a solo batch).
