# Death Clarity Forward Plan

**Date:** 2026-02-24
**Based on:** `docs/research/death-clarity-ux.md`
**Status:** Proposed

---

## 1. Executive Summary

This plan translates the death-clarity UX research into a phased implementation roadmap for Wildfang's 3D Roguelike Survivor mode. The core goal is to replace the current instant-cut-to-game-over with a dramatic 1.5-second slow-motion death sequence that zooms toward the killer, plays a stumble/fall animation, and layers audio cues -- giving a 7-year-old player a clear, wordless answer to "what just got me?" before the stats screen appears. Phases are ordered so that each one delivers standalone value and builds on the last.

---

## 2. What We Already Have

The following work is **complete** and will NOT be re-implemented:

| Bead | What It Did | Where |
|------|-------------|-------|
| **BD-216 A** | `st.lastDamageSource` tracked in every `damagePlayer()` call site (contact, deathBolt, boneSpit, slam, shockwave, poison, lunge, graveBurst) | `js/game3d.js` ~line 2754 |
| **BD-216 B** | `DEFEATED BY: [TIER NAME]` rendered in tier color on game-over screen between Time and total kills | `js/3d/hud.js` ~line 1256-1261 |
| **BD-214** | Permanent `_trueColor` userData on every player mesh; hurt flash uses `_trueColor` instead of ephemeral `_origColor`, preventing stuck-white model | `js/game3d.js` ~line 1652, 4613-4632 |
| **BD-208** | Hurt flash cooldown (1.0s) prevents flash spam in swarm situations | `js/game3d.js` ~line 2760-2762 |

**Current death flow** (lines 6370-6388 of `game3d.js`):
```
HP hits 0 --> st.gameOver = true immediately --> clears keys/charging
--> plays sfx_player_death (falling-scream-1.ogg) --> next frame renders game-over HUD overlay
```
There is no intermediate death sequence, no camera movement, no player animation, no vignette. This plan adds all of that.

---

## 3. Priority-Ordered Implementation Phases

### Phase 1: Death Sequence State Machine (Medium)

**Deliverables:**
- New `st.deathSequence` boolean and `st.deathSequenceTimer` (1.5s countdown, real-time)
- New `st.deathTimeScale` controlling game-logic dt multiplier
- Modified death check: `HP <= 0` enters death sequence instead of immediately setting `st.gameOver`
- Game logic (enemies, projectiles, weapons) continues running at scaled time during death sequence
- After 1.5s real-time, transition to `st.gameOver = true` with all existing cleanup

**Research basis:** Fortnite's dramatic pause before spectator mode; Risk of Rain 2's death moment; the research report's Priority 4 (slow-motion death sequence).

**Implementation detail:**

The death check at line 6370 of `game3d.js` currently reads:
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
  // Capture killer position for camera zoom (Phase 2)
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

All game-logic dt usage within the paused/gameOver gate must multiply by `st.deathTimeScale` (or use `gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1)`) so enemies, projectiles, and particles visibly slow down.

**Requires storing `realDt`:** The main loop already computes `dt` from the Three.js clock. Store a copy as `realDt` before applying the death scale.

**State variables to add to the state object (line ~361):**
```js
deathSequence: false,
deathSequenceTimer: 0,
deathTimeScale: 1.0,
deathKillerPos: null,
```

**Kid-friendly:** No text needed. The slow-motion itself communicates "something big just happened." Matches Fortnite's dramatic timing principle from the research.

**Complexity:** Medium. Touches the main update loop flow control and requires auditing all `dt` usages within the game-logic gate to ensure they respect the time scale. Estimated 150-200 lines changed in `game3d.js`.

---

### Phase 2: Camera Zoom to Killer (Medium)

**Deliverables:**
- During death sequence, camera `lookAt` target interpolates from player position toward the killer's last known position (blend, not snap)
- Camera distance reduces by ~35% (zoom in)
- After death sequence ends and game-over screen appears, camera holds at final position

**Research basis:** Fortnite spectates the eliminator briefly; the research report's Priority 4 bullet 3-4 (camera interpolation toward killer, zoom 30-40%).

**Implementation detail:**

The camera system (lines 6391-6398 of `game3d.js`) currently does:
```js
const camTargetX = st.playerX;
const camTargetZ = st.playerZ + 14;
const camTargetY = st.playerY + 18;
camera.position.x += (camTargetX - camera.position.x) * 0.05;
camera.position.z += (camTargetZ - camera.position.z) * 0.05;
camera.position.y += (camTargetY - camera.position.y) * 0.05;
camera.lookAt(st.playerX, st.playerY, st.playerZ);
```

During `st.deathSequence`, override this:
```js
if (st.deathSequence) {
  const progress = 1 - (st.deathSequenceTimer / 1.5);
  const zoomFactor = 1 - progress * 0.35; // 1.0 --> 0.65

  // Zoom: reduce offset distances
  const zoomOffsetZ = 14 * zoomFactor;
  const zoomOffsetY = 18 * zoomFactor;

  // LookAt target: blend toward killer if we have their position
  let lookX = st.playerX, lookZ = st.playerZ;
  if (st.deathKillerPos) {
    const blendT = Math.min(progress * 1.5, 1); // reach full blend at ~67% progress
    const midX = (st.playerX + st.deathKillerPos.x) / 2;
    const midZ = (st.playerZ + st.deathKillerPos.z) / 2;
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

**Important:** The lookAt target blends toward the *midpoint* between player and killer, NOT directly to the killer. This keeps both the player model and the killer visible in frame -- critical because the player is the emotional anchor. If `st.deathKillerPos` is null (edge case: unknown damage source), the camera simply zooms in on the player.

**Requires:** Phase 1 must be complete (death sequence state exists). Also requires updating `damagePlayer()` to store `killerX`/`killerZ` in `st.lastDamageSource`. For contact damage, this is the enemy position. For projectiles, this is the projectile origin position.

**Adding killer position to damage source:**

In `damagePlayer()` (line ~2754), the source object already has `type`, `tierName`, `tier`, `color`. Add `killerX` and `killerZ` fields at each call site. Example for contact damage (line ~5511):
```js
damagePlayer(baseDmg, undefined, {
  type: 'contact', tierName: tierData.name, tier: e.tier || 1, color: tierData.eye,
  killerX: e.group.position.x, killerZ: e.group.position.z
});
```

Repeat for all 7+ call sites (slam, shockwave, deathBolt, boneSpit, lunge, graveBurst, poison).

**Kid-friendly:** The camera movement wordlessly says "THAT thing did it" by framing the killer. More powerful than text for a young player. Draws from the research's "dramatic timing > text walls" principle.

**Complexity:** Medium. ~80 lines in camera section, ~30 lines updating damagePlayer call sites. Low risk of breakage since the camera override only activates during a new state.

---

### Phase 3: Player Stumble/Fall Death Animation (Small)

**Deliverables:**
- During death sequence, player model tilts forward (rotation.x) and sinks (position.y) to simulate falling
- Arms flail outward
- Legs go limp
- Model grays out (desaturation) as the animation completes

**Research basis:** Research report's Priority 5 (player stumble animation); Hades' character reactions on death; general animation principles for communicating finality.

**Implementation detail:**

In `animatePlayer()` (`js/3d/player-model.js`, line 371), add a death animation branch. This requires passing `st.deathSequence` and a progress value.

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

**Gray-out effect** (in the hurt flash section of `game3d.js`, ~line 4615):
During `st.deathSequence`, progressively desaturate the model instead of the normal hurt flash:
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

**Kid-friendly:** The stumble animation is gentle -- a forward tilt and slump, not a violent ragdoll. Appropriate for age 7+. The gray-out signals "this is over" without gore.

**Complexity:** Small. ~40 lines in `player-model.js`, ~20 lines in `game3d.js` hurt flash section. No new state variables needed beyond what Phase 1 provides.

---

### Phase 4: Red Death Vignette (Small)

**Deliverables:**
- On the killing blow (frame where `st.deathSequence` begins), apply an intense red screen-edge vignette on the HUD canvas
- Vignette fades from alpha 0.5 to 0.0 over the 1.5s death sequence
- Bypasses the normal 1.0s hurt flash cooldown (this is a one-time "you just died" signal)

**Research basis:** Research report's Priority 3 (red death vignette with alpha 0.4-0.5); general "juice" design -- screen-space feedback reinforcing the 3D-space event.

**Implementation detail:**

In `drawHUD()` (`js/3d/hud.js`), add a vignette pass during death sequence. Insert before the game-over overlay check:

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

Also, on death sequence start, force an immediate hurt flash regardless of cooldown:
```js
// In the death sequence entry block (Phase 1):
st.playerHurtFlash = 1.5; // longer flash, lasts entire death sequence
st.playerHurtFlashCooldown = 0; // bypass cooldown
```

**Kid-friendly:** Red vignette is a universal "danger" signal. Fading it out over 1.5s prevents it from feeling scary -- it reads as dramatic, not threatening.

**Complexity:** Small. ~15 lines in `hud.js`, ~2 lines in `game3d.js`. Zero new state variables.

---

### Phase 5: Death Screen Enhancement (Medium)

**Deliverables:**
- Large zombie tier icon rendered next to "DEFEATED BY" text (the research says "big icons beat small text")
- Icon is a color-coded silhouette representing the tier (scaled zombie shape drawn with canvas 2D)
- Tier color background pill behind the tier name
- Brief stat comparison: "This [Tier Name] dealt [X] damage per hit" (educational -- teaches the player what tier they should avoid)

**Research basis:** Research report's Kid-Friendly Principle 1 ("Big icons beat small text"); Minecraft's consistent death message format building predictability; Fortnite's "Big dramatic word + small explanatory detail."

**Implementation detail:**

In the game-over section of `drawHUD()` (`js/3d/hud.js`, line ~1256), expand the DEFEATED BY block:

```js
if (s.lastDamageSource && s.lastDamageSource.tierName) {
  const srcColor = '#' + (s.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0');
  const tierIdx = (s.lastDamageSource.tier || 1) - 1;
  const tierData = ZOMBIE_TIERS[tierIdx] || ZOMBIE_TIERS[0];

  // -- Tier icon (left of text) --
  // Draw a scaled zombie silhouette using boxes, tinted in tier color
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

`drawZombieTierIcon()` would be a new helper function (~30 lines) that draws a simplified zombie using canvas rectangles: body, head, two arms, two legs, glowing eyes -- all in the tier color. Tiers 7+ get extra spikes or aura lines.

**Kid-friendly:** The icon creates a visual vocabulary. After 3-4 runs, a child recognizes "the big red one got me again" without reading. This matches the research's point about Minecraft's predictable format building recognition over repeated exposure.

**Complexity:** Medium. ~80 lines in `hud.js`. New helper function. No game logic changes.

---

### Phase 6: Death Audio Layering (Small)

**Deliverables:**
- Replace the single `sfx_player_death` sound with a layered audio sequence during death:
  1. **Killing blow hit:** `sfx_death_impact` -- a heavy thud (new sound, or repurpose `explode-1.ogg` pitched down)
  2. **Slow-mo onset (0.2s in):** `sfx_death_slowmo` -- a descending whoosh (new sound for Sound Pack Beta, or pitch-shifted `falling-scream-1.ogg`)
  3. **Sequence end (1.5s):** `sfx_death_sting` -- a brief low tone or sad chord (needs Sound Pack Beta)
- Each sound plays at specific offsets during the death sequence timer
- Existing `sfx_player_death` (`falling-scream-1.ogg`) is repurposed as the slow-mo whoosh

**Research basis:** While the research report focused on visual communication, audio is equally important for young players who may not be watching the screen closely. Multiple layered sounds create a recognizable "death jingle" (Minecraft's oof, Fortnite's elimination horn).

**Implementation detail with current Sound Pack Alpha:**

The Alpha pack is limited. Realistic plan:

| Sound ID | Source File | Treatment |
|----------|-------------|-----------|
| `sfx_death_impact` | `explode-1.ogg` | Shared with shrine break -- acceptable, distinct context |
| `sfx_death_slowmo` | `falling-scream-1.ogg` | Already the existing `sfx_player_death` -- keep it |
| `sfx_death_sting` | *Needs Sound Pack Beta* | Placeholder: silence. Add `// TODO: Sound Pack Beta` |

In the death sequence entry block:
```js
playSound('sfx_death_impact'); // immediate thud
```

At 0.2s into the sequence (in the tick block):
```js
if (st.deathSequenceTimer <= 1.3 && !st._deathSlowmoPlayed) {
  st._deathSlowmoPlayed = true;
  playSound('sfx_death_slowmo');
}
```

At sequence end:
```js
if (st.deathSequenceTimer <= 0) {
  playSound('sfx_death_sting'); // no-op until Sound Pack Beta
}
```

**Mouth-made SFX aesthetic note:** The mouth-made sounds have a charming lo-fi quality. The death sequence sounds should lean into this -- a mouth-made "thud" and descending "whooooo" would fit the game's personality better than polished audio.

**Kid-friendly:** Layered audio cues give the death moment a "theme" that children internalize quickly. After a few deaths, the sound alone communicates what is happening before they process the visuals.

**Complexity:** Small. ~15 lines in `game3d.js`, ~10 lines in `audio.js` (new sound mappings). One new boolean state variable (`_deathSlowmoPlayed`).

---

### Phase 7: Killer Highlight Effect (Small)

**Deliverables:**
- During death sequence, the zombie that dealt the killing blow gets a pulsing emissive outline/glow
- A floating label appears above the killer: the tier name in tier color (reuses `addFloatingText` with `important: true` and extended life)
- Other zombies dim slightly (reduce material brightness by 30%)

**Research basis:** Fortnite spotlights the eliminator via spectator cam; the research's "one idea only" principle -- highlighting exactly one enemy removes ambiguity.

**Implementation detail:**

Requires tracking which specific enemy dealt the killing blow. In `damagePlayer()`, also store `st.lastDamageSource.enemyRef = source.enemyRef` (a reference to the enemy object). Each call site passes the enemy object:

```js
// Contact damage call site:
damagePlayer(baseDmg, undefined, {
  type: 'contact', tierName: tierData.name, tier: e.tier || 1,
  color: tierData.eye, killerX: e.group.position.x, killerZ: e.group.position.z,
  enemyRef: e
});
```

During death sequence, in the enemy update loop:
```js
if (st.deathSequence) {
  for (const e of st.enemies) {
    if (e === st.lastDamageSource?.enemyRef) {
      // Pulsing glow
      const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
      e.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissive = child.material.emissive || new THREE.Color();
          child.material.emissive.setHex(st.lastDamageSource.color || 0xff4444);
          child.material.emissiveIntensity = pulse;
        }
      });
      // Floating label (once)
      if (!st._killerLabelSpawned) {
        st._killerLabelSpawned = true;
        addFloatingText(
          st.lastDamageSource.tierName.toUpperCase(),
          '#' + (st.lastDamageSource.color || 0xff4444).toString(16).padStart(6, '0'),
          e.group.position.x, e.group.position.y + 3, e.group.position.z,
          2.0, true
        );
      }
    } else {
      // Dim other zombies
      e.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = 0;
          // Reduce brightness (shift toward dark)
          // Only apply once -- tracked with a flag
        }
      });
    }
  }
}
```

**Caution:** The enemy dimming needs careful handling to restore materials after the death sequence ends (when `st.gameOver` triggers). Since the game-over screen overlays everything, restoration is only needed if the player restarts -- which re-initializes the entire scene. So no restoration is needed.

**Kid-friendly:** "That one is glowing -- THAT one got me." Zero reading required. The floating tier name is a bonus for kids who can read.

**Complexity:** Small-Medium. ~50 lines in `game3d.js`. Uses existing floating text system. New state variables: `_killerLabelSpawned`.

---

## 4. Slow-Mo Death Sequence Design (Detailed)

**Timeline (1.5 seconds real-time):**

```
Time 0.0s     0.3s          0.5s                          1.5s
  |-----------|--------------|------------------------------|
  |  RAMP     |  HOLD        |  HOLD (continued)           |
  |  1.0->0.15|  0.15        |  0.15                       |
  |           |              |                              |
  | Impact!   | Camera moves | Vignette fading              |
  | Red flash | Player tilts | Player grays out             |
  | Thud SFX  | Whoosh SFX   | Transition to game-over      |
  | Killer    | Killer        |                              |
  | glows     | label shows   |                              |
```

**dt flow:**
```
realDt = clock.getDelta()  // always real-time
gameDt = realDt * st.deathTimeScale  // 1.0 during normal play, ramps to 0.15 during death

// Enemy movement, projectile travel, particle updates use gameDt
// Death sequence timer, camera interpolation, player death animation use realDt
```

**What keeps running during death sequence:**
- Enemy movement (at 0.15x speed -- creates the dramatic slow-mo visual)
- Weapon projectiles in flight (slow crawl across screen)
- Particle effects (slow-mo sparks and clouds)
- Player hurt flash (extended to 1.5s for the whole sequence)

**What stops during death sequence:**
- Player input/movement
- New enemy spawning
- Weapon auto-fire
- Powerup timers
- XP collection

---

## 5. Camera Zoom to Killer (Detailed)

**Current camera:** Fixed top-down offset follow camera. Position is `(playerX, playerY+18, playerZ+14)`, lookAt is `(playerX, playerY, playerZ)`. Lerp factor is 0.05 per frame.

**Death sequence camera behavior:**

1. **Position:** Lerp toward a zoomed-in offset. Target becomes `(lookX, playerY + 18*zoomFactor, lookZ + 14*zoomFactor)` where `zoomFactor` goes from 1.0 to 0.65 over 1.5s. Lerp factor increases to 0.08 for snappier zoom.

2. **LookAt:** Blend from player to midpoint between player and killer. This keeps both subjects in frame. Blend reaches 100% at 1.0s into the sequence.

3. **Edge case -- no killer position:** If `st.deathKillerPos` is null (unknown damage source, e.g., poison pool with no tracked origin), the camera simply zooms in on the player. The DEFEATED BY text on the game-over screen still shows the tier name from `st.lastDamageSource`.

4. **Edge case -- killer is very far away:** Clamp the lookAt blend so the midpoint is never more than 8 world units from the player. This prevents the camera from panning wildly if a long-range attack (death bolt, bone spit) killed the player.

```js
if (st.deathKillerPos) {
  const dx = st.deathKillerPos.x - st.playerX;
  const dz = st.deathKillerPos.z - st.playerZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const maxBlendDist = 8;
  const clampedDist = Math.min(dist, maxBlendDist);
  const ratio = dist > 0 ? clampedDist / dist : 0;
  const midX = st.playerX + dx * ratio * 0.5;
  const midZ = st.playerZ + dz * ratio * 0.5;
  // blend toward midpoint...
}
```

---

## 6. Player Death Animation (Detailed)

**Voxel box-model constraints:**

The player model (`js/3d/player-model.js`) is a `THREE.Group` containing box-geometry meshes for body, head, legs, arms, tail, and optional wings. There is no skeletal rigging -- all animation is done by directly setting `position` and `rotation` on these sub-groups.

**Death animation keyframes:**

| Time (progress) | Body Tilt (rotation.x) | Y Offset | Arms | Legs | Tail |
|-----------------|----------------------|----------|------|------|------|
| 0.0 (0%) | 0 | 0 | Normal | Normal | Wagging |
| 0.3 (20%) | -15 deg | -0.1 | Spread slightly | Slight bend | Stops |
| 0.6 (40%) | -30 deg | -0.2 | Spread wide | Limp | Droops |
| 0.9 (60%) | -45 deg | -0.4 | Spread wide | Limp | Droops |
| 1.5 (100%) | -45 deg (held) | -0.4 (held) | Same | Same | Same |

The animation hits its final pose at 60% progress and holds. This gives a clear "fell over" read early in the sequence, leaving the remaining time for the camera and vignette to do their work.

**No ragdoll.** The forward tilt is a rigid-body lean, like a toy soldier tipping over. This is:
- Technically simple (single rotation value)
- Age-appropriate (not violent or grotesque)
- Readable at the camera distance (big single motion beats subtle joint articulation)

**Integration point:** `animatePlayer()` in `player-model.js` receives the full `st` object. Add a guard at the top that checks `st.deathSequence` and runs the death animation instead of the normal walk/idle/flight cycle. This is a clean branch with an early `return`.

---

## 7. Death Screen Enhancement (Detailed)

**Current layout** (from `hud.js` line 1234+):
```
Y=55   "GAME OVER" (red, 48px)
Y=95   "SCORE: 1234" (gold, 24px)
Y=118  "Leopard | Level 12 | Wave 8" (white, 14px)
Y=138  "Time: 03:42" (blue, 14px)
Y=158  "DEFEATED BY: BRUTE" (tier color, 18px)     <-- BD-216
Y=175  "YOU DEFEATED 32 ZOMBIES!" (gold, 28px)
Y=205+ Tier breakdown (Tiny: 20, Big: 8, Huge: 3, MEGA: 1)
       Feedback section, name entry, leaderboard
```

**Proposed enhanced layout:**

```
Y=55   "GAME OVER" (red, 48px)
Y=95   "SCORE: 1234" (gold, 24px)
Y=118  "Leopard | Level 12 | Wave 8" (white, 14px)
Y=138  "Time: 03:42" (blue, 14px)
Y=158  [ZOMBIE ICON] "DEFEATED BY: BRUTE" on dark pill (tier color, 20px)    <-- ENHANCED
Y=175  "YOU DEFEATED 32 ZOMBIES!" (gold, 28px)
       ... rest unchanged
```

**Zombie tier icon design (`drawZombieTierIcon`):**

A ~40x50 pixel canvas drawing using simple shapes:
- Rectangle body (tier-colored)
- Smaller rectangle head on top
- Two small rectangle arms (slightly raised, menacing pose)
- Two rectangle legs
- Two glowing eye dots (eye color from `ZOMBIE_TIERS[tier].eye`)
- For tiers 7+ (Abomination, Nightmare, Titan, Overlord): add "spike" triangles on shoulders and/or a glow ring behind the head

This mirrors the actual zombie model construction in `game3d.js` which builds zombies from box primitives -- the HUD icon is a 2D version of the same visual language.

**Stat line (optional, lower priority):**

Below the DEFEATED BY line, a smaller text in gray:
```
"Brutes deal 2.8x damage -- watch out!"
```
Using `ZOMBIE_TIERS[tier].dmgMult` to generate the number. This is educational without being a damage log.

---

## 8. Audio Design (Detailed)

**Current death audio state:**
- `sfx_player_death`: maps to `falling-scream-1.ogg` (a mouth-made falling scream)
- Plays once, immediately when `st.gameOver` becomes true
- No other audio changes on death

**Proposed layered death audio:**

| Event | Timing | Sound ID | Alpha Pack Source | Beta Pack Need |
|-------|--------|----------|-------------------|----------------|
| Killing blow lands | 0.0s | `sfx_death_impact` | `explode-1.ogg` (reuse) | Low-pitch "BWOMM" thud |
| Slow-mo kicks in | 0.2s | `sfx_death_slowmo` | `falling-scream-1.ogg` (existing) | Descending pitch whoosh |
| Screen transitions | 1.5s | `sfx_death_sting` | *none -- silent* | Sad 2-note mouth chord |

**Mouth-made SFX direction for Sound Pack Beta recording session:**

1. **`sfx_death_impact`:** A heavy mouth "THOOM" or "BWOMPH" -- imagine saying "BOOM" into a pillow. Low, resonant, brief (0.3s).
2. **`sfx_death_slowmo`:** A descending "wooooOOOooo" -- start mid-pitch, slide down. Think of a spinning top winding down. (0.8-1.0s)
3. **`sfx_death_sting`:** Two descending notes hummed: "doo-DOO" (the second lower and sadder). Like a game show "wrong answer" jingle but softer. (0.5s)

These three sounds together create a recognizable "death jingle" that kids will associate with the death moment within 2-3 plays.

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Time-scale bugs**: Applying `deathTimeScale` to some `dt` usages but missing others creates visual desync (e.g., particles at full speed while enemies are slow) | High | Audit all `dt` references in the game-logic gate (~30 sites). Create a `gameDt` variable at the top of the update block and use it everywhere. Phases 1 is the riskiest bead for this reason. |
| **Camera jitter**: Lerping lookAt target during death could cause frame-to-frame jitter if killer position updates (enemy still moving in slow-mo) | Medium | Snapshot killer position at death-sequence start (`st.deathKillerPos`) and never update it. The camera targets a fixed point. |
| **Enemy reference going stale**: `st.lastDamageSource.enemyRef` could point to a dead/removed enemy by the time the death sequence renders its glow | Medium | Check `enemyRef.alive` before applying glow. If dead (killed by weapon during the 1.5s), skip the highlight -- the floating label already spawned. |
| **Performance**: Extra `traverse()` calls on enemy groups for dimming, plus radial gradient on HUD canvas every frame for vignette | Low | The death sequence is 1.5s long and happens once per run. Performance does not need to be sustained. The gradient is a single canvas operation. Enemy traverse is limited to visible enemies (~30-50 max). |
| **Hurt flash conflict**: Extended hurt flash (1.5s) during death overlaps with the gray-out desaturation from the death animation | Low | Phase 3's gray-out replaces the hurt flash during death. Guard the hurt flash code with `if (!st.deathSequence)` and run the gray-out code in the `else if (st.deathSequence)` branch. |
| **Mobile/low-end browsers**: The slow-mo effect assumes stable frame rate. On very low FPS, the 1.5s could feel choppy | Low | The time-scale ramp uses `realDt`, so it self-corrects for frame drops. The visual quality may degrade but the timing stays correct. |

---

## 10. Beads Sketch

Starting from BD-228 (BD-217 is the last implemented bead, BD-218-227 reserved for other work).

| Bead ID | Title | Phase | Est. Size |
|---------|-------|-------|-----------|
| **BD-228** | Death sequence state machine -- slow-mo time scale with 1.5s real-time countdown | Phase 1 | Medium |
| **BD-229** | Camera zoom-to-killer -- interpolate lookAt toward killer midpoint, 35% distance reduction | Phase 2 | Medium |
| **BD-230** | Player death stumble animation -- forward tilt, arm flail, gray-out desaturation | Phase 3 | Small |
| **BD-231** | Red death vignette -- radial gradient HUD overlay fading over death sequence | Phase 4 | Small |
| **BD-232** | Game-over screen killer icon -- canvas zombie silhouette + color pill behind tier name | Phase 5 | Medium |
| **BD-233** | Death audio layering -- impact thud, slow-mo whoosh, transition sting (Alpha pack mapping) | Phase 6 | Small |
| **BD-234** | Killer highlight glow -- emissive pulse on killing zombie + floating tier label during death sequence | Phase 7 | Small |
| **BD-235** | Add `killerX`/`killerZ`/`enemyRef` to all `damagePlayer()` call sites (prerequisite for BD-229 and BD-234) | Pre-Phase 2 | Small |

**Dependency order:**
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
