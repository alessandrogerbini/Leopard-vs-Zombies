# Item Pickup Pageantry Forward Plan

**Date:** 2026-02-25
**Bead:** BD-245
**Status:** Proposed

---

## 1. Executive Summary

This plan introduces a tiered item reveal system that scales visual and audio pageantry by rarity, transforming the current uniform pickup-and-banner flow into a satisfying loot ceremony. Common items stay instant; Uncommon items get a brief slow-motion flourish; Rare items pause the game for a spotlight reveal; Legendary items receive a full cinematic ceremony with screen-darkening, particle orbits, and an orchestral sting. The goal: every item pickup should feel proportional to its power, and the rare/legendary ones should create genuine excitement for a 7-year-old player.

---

## 2. Current System Analysis

### 2.1 Item Spawning

Items spawn from three sources:

| Source | Frequency | Rarity Bias |
|--------|-----------|-------------|
| **Zombie loot drops** (`killEnemy`) | T1=1.5%, T2=3%, T3=5%, T4+=7.5%+ (of kills) | Tier 3+ drops minimum uncommon |
| **Wave event spawns** (`spawnWaveEvent`) | Every 3 minutes (1 item per wave) | Unbiased (full pool) |
| **Ambient spawns** | Every 45-60 seconds | Unbiased (full pool) |
| **Boss rewards** (`killEnemy` for bosses) | On boss death | Forced legendary |
| **Totem spawns** | On totem zombie death | Minimum uncommon |

### 2.2 Item Pickup Object

Created by `createItemPickup()` (game3d.js ~line 2116):
- Spawns a 0.4x0.4x0.4 BoxGeometry mesh colored by `ITEM_RARITIES[rarity].colorHex`
- Emissive glow at 0.4 intensity
- Bobs up and down via `sin(bobPhase)` at amplitude 0.2
- Rotates at `dt * 1.5` radians/second
- Pickup radius: 1.5 units (distSq < 2.25), height check < 2.0 units

### 2.3 Current Pickup Feedback (BD-147)

When the player walks into an item pickup (game3d.js ~line 6003-6050):

1. **Sound:** `sfx_item_pickup` (currently unmapped -- no Sound Pack Alpha match) + `sfx_level_up` (rawr-2.ogg) as placeholder
2. **Screen flash:** `st.itemFlashTimer = 0.2` with rarity color at 20% opacity full-screen overlay
3. **Time dilation:** `st.itemSlowTimer = 0.3` applies `dt *= 0.5` for 0.3 seconds
4. **HUD announcement:** Center-screen banner (320x60px) at 30% screen height:
   - Item name in rarity color (bold 18px monospace)
   - Description in grey (13px monospace)
   - Black background at 70% opacity with rarity-colored border
   - Fade-in over 0.2s, holds for ~2s, fade-out over 0.3s
   - Total duration: 2.5 seconds

### 2.4 Problems with Current System

- **All rarities feel the same.** A Legendary Golden Bone gets the same 320x60 banner and 0.3s slow as a Common Rubber Ducky.
- **No anticipation.** The reward is instant -- there is no build-up or dramatic moment.
- **No visual ceremony in 3D space.** The feedback is entirely 2D HUD overlay; nothing happens to the item mesh or the 3D world.
- **Placeholder audio.** `sfx_item_pickup` has no mapped sound file; `sfx_level_up` is used for every pickup.
- **No rarity label.** The announcement shows item name + description but never says "LEGENDARY" or "RARE."
- **Uniform time dilation.** 0.3s at 0.5x speed for all items, regardless of significance.

### 2.5 Wearable Comparison Menu (Reference)

The wearable comparison menu (BD-199, hud.js ~line 1101) demonstrates the engine can:
- Full-screen darkened overlay (`rgba(0,0,0,0.7)`)
- Side-by-side card layout (200x140px cards, 60px gap)
- Rarity-colored borders and text
- Selection arrows with sin-wave bob animation
- Pause the game (`st.paused = true`) for deliberate player choice

This proves the infrastructure for paused reveal screens exists.

---

## 3. Design Research: What Makes Loot Reveals Satisfying

### 3.1 Reference Games

**Vampire Survivors** -- The gold standard for survivor-genre loot feel:
- Level-up pauses the game for a full-screen card selection
- Rarity indicated by card border glow (grey/green/blue/gold)
- Items have brief text descriptions; selection is deliberate
- Passive items auto-collect with brief sparkle + name popup
- Lesson: even minimal ceremony (border color + name) feels good when consistent

**Hades** -- God boon reveal:
- Screen darkens, spotlight on boon offering
- God portrait animates in from side
- Rarity indicated by border color and particle effects
- Sound escalates with rarity (soft chime for common, dramatic chord for legendary)
- Lesson: rarity-scaled audio is the single highest-impact feature

**Brotato** -- Shop UI:
- Items displayed as cards with icon, name, description, stat numbers
- Rarity border glow pulses
- Lesson: stat preview is important for informed decisions

**Risk of Rain 2** -- Chest opening:
- Chest model has opening animation (lid flips)
- Item beams upward in a column of light colored by rarity
- White/green/red/yellow light columns visible from distance
- Lesson: 3D world effects (light columns) create excitement even before reading the name

**Slay the Spire** -- Relic acquisition:
- Screen pauses
- Relic icon appears center-screen with name and full description
- Simple but effective: the pause itself creates importance
- Lesson: for rare+ items, a brief forced pause makes the player stop and appreciate

### 3.2 The Dopamine Architecture

The satisfying loot reveal follows a 4-stage pattern:

```
ANTICIPATION --> ESCALATION --> REVEAL --> RESOLUTION
(slow-mo)       (effects       (name +     (auto-dismiss
                 building)      desc)        or input)
```

- **Anticipation:** Time dilation or pause creates a "something special is happening" signal
- **Escalation:** Particle effects, light rays, sound build-up. Duration scales with rarity
- **Reveal:** Item identity shown with rarity framing. The player processes what they got
- **Resolution:** Effects fade, gameplay resumes. Higher rarity = longer linger

Common items skip the first two stages entirely. Legendary items maximize all four.

---

## 4. Tiered Reveal System Design

### 4.1 Common Items (50% of drops, weight 50)

**Philosophy:** Zero friction. Pickup should feel good but never slow the game.

| Aspect | Design |
|--------|--------|
| **Game speed** | No change (1.0x) |
| **3D effects** | 8-12 gold sparkle particles burst from pickup position, fade over 0.4s |
| **HUD overlay** | Compact name tag: item name in white, floats up from center-bottom, fades over 0.8s |
| **Audio** | Soft "pop" sound (new: `sfx_item_common`) |
| **Duration** | 0.8s total, no pause |
| **Camera** | No change |

**State changes:**
```
st.itemReveal = {
  rarity: 'common',
  item: itype,
  timer: 0.8,
  phase: 'reveal'   // skip anticipation/escalation
}
```

**HUD mockup (Common):**
```
+--------------------------------------------------+
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|              [game world visible]                |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|                 RUBBER DUCKY                      |
|               +10% Move Speed                    |
|                    (fades up)                     |
+--------------------------------------------------+
```

### 4.2 Uncommon Items (28% of drops, weight 28)

**Philosophy:** Brief flourish. Player notices this is better than common.

| Aspect | Design |
|--------|--------|
| **Game speed** | 0.3x for 0.8s (slow-mo, not pause) |
| **3D effects** | Item mesh floats upward 2 units over 0.5s with green glow particles trailing. 16-20 green sparkles radiate outward |
| **HUD overlay** | Banner: "Good Stuff" rarity label (green, 12px) above item name (green, 20px bold) above description (grey, 14px). Black bg at 75% opacity, green border. 380x80px at 30% screen height |
| **Audio** | Satisfying "ding" with slight reverb (new: `sfx_item_uncommon`) |
| **Duration** | 1.2s total (0.8s slow-mo + 0.4s fade-out at normal speed) |
| **Camera** | No change |

**State changes:**
```
st.itemReveal = {
  rarity: 'uncommon',
  item: itype,
  timer: 1.2,
  phase: 'escalation',  // brief escalation then reveal
  slowTimer: 0.8,
  floatMesh: clonedItemMesh,  // floating item mesh for 3D animation
  particles: []
}
st.itemSlowTimer = 0.8;
```

**HUD mockup (Uncommon):**
```
+--------------------------------------------------+
|                                                  |
|                                                  |
|          +------[GREEN BORDER]-------+           |
|  30%  -> |       Good Stuff          |           |
|          |     COWBOY BOOTS          |           |
|          |    +20% Attack Range      |           |
|          +---------------------------+           |
|                                                  |
|              [game world at 0.3x]                |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

### 4.3 Rare Items (16% of drops, weight 16)

**Philosophy:** Event moment. The game pauses to honor the find.

| Aspect | Design |
|--------|--------|
| **Game speed** | 0.3x for 0.3s lead-in, then full pause for 1.5s |
| **3D effects** | Crate/pickup position emits blue light rays radiating outward (6 ray meshes, 0.1 wide x 8 long, emissive blue). Item mesh enlarges to 1.5x and spins slowly in a spotlight (PointLight, blue, intensity 2). 24 blue sparkle particles orbit the item |
| **HUD overlay** | Large banner: "Shiny Stuff" rarity label (blue, 14px) + item name (blue, 24px bold) + full description (white, 16px). Black bg at 80% opacity, blue border with subtle pulse animation. 420x100px at 28% screen height. Stat preview line below description |
| **Audio** | Dramatic 2-note reveal chord (new: `sfx_item_rare`). Rising tone during lead-in |
| **Duration** | 1.8s total (0.3s slow-mo lead-in + 1.5s pause). Auto-dismisses or press any key |
| **Camera** | Zoom in 15% toward pickup position over 0.3s lead-in, hold, zoom back on dismiss |

**State changes:**
```
st.itemReveal = {
  rarity: 'rare',
  item: itype,
  timer: 1.8,
  phase: 'anticipation',  // full 4-stage cycle
  slowTimer: 0.3,
  pauseTimer: 1.5,
  spotlight: pointLight,
  rays: [rayMeshes],
  particles: [],
  cameraZoomTarget: 0.85,  // 15% closer
  floatMesh: enlargedItemMesh
}
```

**HUD mockup (Rare):**
```
+--------------------------------------------------+
|                                                  |
|                                                  |
|        +--------[BLUE BORDER]--------+           |
|  28% ->|         Shiny Stuff         |           |
|        |       SHIELD BRACELET       |           |
|        |     Block 1 Hit / 30s       |           |
|        | [DEF: Block] [CD: 30s]      |           |
|        +---------[pulse glow]--------+           |
|                                                  |
|          [game paused, darkened 20%]             |
|             * blue light rays *                  |
|           * item spinning in spot *              |
|                                                  |
|           [Press any key to continue]            |
+--------------------------------------------------+
```

### 4.4 Legendary Items (6% of drops, weight 6)

**Philosophy:** Full ceremony. This is the pinnacle moment of the run.

| Aspect | Design |
|--------|--------|
| **Game speed** | 0.2x for 0.5s lead-in, then full pause for 2.5s |
| **3D effects** | Phase 1 (0-0.5s): Slow-mo, gold particles swirl inward toward pickup pos. Phase 2 (0.5-1.0s): Gold explosion -- 40 particles burst outward + screen flash. Vertical light column (CylinderGeometry, gold emissive, 0.5 radius x 20 height) shoots upward. Phase 3 (1.0-3.0s): Item mesh at 2x scale spinning in spotlight with 12 gold particles orbiting. Screen darkened to 60% except spotlight cone. Phase 4 (auto-dismiss after 2.5s or press any key) |
| **HUD overlay** | "LEGENDARY" text slams from top of screen to center with impact bounce (scale 1.5 -> 1.0 with elastic ease). Then fades to: gold rarity label + item name (gold, 28px bold) + description (white, 18px) + stat line. Ornate gold double-border with corner flourishes. 460x120px. Screen shake on "LEGENDARY" slam (0.15 amplitude, 0.3s) |
| **Audio** | Orchestral sting (new: `sfx_item_legendary`). Rising build during lead-in. Impact hit on slam. Optional: faint choir/shimmer loop during hold |
| **Duration** | 3.0s total (0.5s slow-mo + 2.5s pause). Auto-dismisses or press any key |
| **Camera** | Dramatic zoom: 25% closer over 0.5s lead-in, slight pull-back to 20% during hold (breathe effect). Snap back on dismiss |

**State changes:**
```
st.itemReveal = {
  rarity: 'legendary',
  item: itype,
  timer: 3.0,
  phase: 'anticipation',
  slowTimer: 0.5,
  slowScale: 0.2,
  pauseTimer: 2.5,
  spotlight: pointLight,
  lightColumn: cylinderMesh,
  rays: [],
  particles: [],
  orbiting: [],
  cameraZoomTarget: 0.75,
  cameraBreathTarget: 0.80,
  floatMesh: largeItemMesh,
  slamTimer: 0,          // for "LEGENDARY" text animation
  screenDarken: 0.6,     // target overlay alpha
  shakeOnSlam: true
}
```

**HUD mockup (Legendary):**
```
+--------------------------------------------------+
| ~~~~~~~~~~~~~ screen darkened 60% ~~~~~~~~~~~~~~ |
|                                                  |
|                  * * * * * *                     |
|             *  LEGENDARY  *                      |
|                  * * * * * *                     |
|      +=======[GOLD DOUBLE BORDER]=======+        |
|      ||     REALLY Cool Stuff          ||        |
|      ||       GOLDEN BONE              ||        |
|      ||   +30% All Weapon Damage       ||        |
|      ||  [DMG: +30%] [Slot: Passive]   ||        |
|      +====[corner flourishes]====+      |        |
|                                                  |
|         [ gold light column rising ]             |
|         [ item spinning at 2x size ]             |
|         [12 gold particles orbiting]             |
|                                                  |
|          [Press any key to continue]             |
+--------------------------------------------------+
```

---

## 5. Roll Mechanic Evaluation

### 5.1 Concept

A slot-machine style reveal where 3-4 item icons cycle rapidly, slow down, and land on the actual drop. Inspired by MegaBonk's chest ceremony and gacha game pull animations.

### 5.2 Pros

- **Builds anticipation** for every single pickup, even common items
- **Exciting reveal moment** as the reel slows and the player sees what they got
- **Creates "near miss" stories** ("I almost got the Golden Bone!")
- **Differentiates crate openings** from floor pickups thematically
- **Viral/streaming appeal** -- audiences love watching gacha-style reveals

### 5.3 Cons

- **Delay on every pickup** -- at 3-5 items per minute during mid-game, even a 1.5s roll adds 4.5-7.5s of forced animation per minute
- **Annoying at high drop rates** -- Lucky Charm + Lucky Penny + high tier enemies can produce 8+ drops per minute
- **Misleading** -- showing items that COULD have dropped but didn't may frustrate players
- **Complexity** -- requires knowing the full available item pool at display time, building icon renderers for each item, animation system for the reel
- **Age consideration** -- a 7-year-old may not understand the slot machine metaphor; they just want to see what they got

### 5.4 Recommendation

**Do NOT implement a global roll mechanic.** The cons outweigh the pros for this game's pacing.

However, a **limited roll mechanic** could work well in these specific contexts:

1. **Boss reward chests only** -- Boss deaths already guarantee legendary drops. A 2-second reel that cycles through 3-4 legendary items before landing on the drop would be exciting and infrequent (1-2 bosses per run max).

2. **Wave reward crates only** -- Wave events are every 3 minutes. A brief 1-second reel on the wave reward item could add excitement to wave completion.

3. **Optional "Dramatic Loot" toggle** -- If implemented broadly, gate it behind a settings toggle (default: off). Hardcore players can opt in for the full experience.

**Implementation priority:** LOW. The tiered reveal system (Section 4) delivers 90% of the loot satisfaction without any roll mechanic. If a roll mechanic is added later, it should be its own bead (BD-252+), not part of this initial implementation.

---

## 6. HUD Overlay Technical Design

### 6.1 Reveal Overlay Architecture

The reveal system uses a new `st.itemReveal` state object (replacing the current `st.itemAnnouncement`, `st.itemFlashTimer`, and `st.itemSlowTimer`). All reveal rendering happens in `hud.js` via a new `drawItemReveal(ctx, s, W, H)` function called near the end of `drawHud3D`.

```
drawHud3D(ctx, s, ...)
  ...existing HUD elements...
  drawItemReveal(ctx, s, W, H)    // NEW -- renders on top of everything except pause menu
```

### 6.2 Screen Positioning

| Rarity | Banner Position | Banner Size | Alignment |
|--------|----------------|-------------|-----------|
| Common | Bottom-center, 70% screen height | 280x40px | Center |
| Uncommon | Upper-center, 30% screen height | 380x80px | Center |
| Rare | Upper-center, 28% screen height | 420x100px | Center |
| Legendary | Center-screen, 35% screen height | 460x120px | Center |

### 6.3 Rarity Color Coding

Using existing `ITEM_RARITIES` colors:

| Rarity | Border Color | Text Color | Glow/Particle Color | Background |
|--------|-------------|------------|---------------------|------------|
| Common | None (no border) | `#ffffff` | Gold sparkle `#ffdd88` | None (transparent) |
| Uncommon | `#44ff44` (green) | `#44ff44` | Green `#44ff44` | `rgba(0,0,0,0.75)` |
| Rare | `#4488ff` (blue) | `#4488ff` | Blue `#4488ff` | `rgba(0,0,0,0.80)` |
| Legendary | `#ff8800` (gold) | `#ff8800` | Gold `#ffcc00` | `rgba(0,0,0,0.85)` |

### 6.4 Text Layout Per Tier

**Common:**
```
[Item Name]  (bold 16px, white, centered)
[Description] (12px, #aaaaaa, centered, below name)
```

**Uncommon:**
```
[Rarity Label: "Good Stuff"]  (12px, green, centered)
[Item Name]                    (bold 20px, green, centered)
[Description]                  (14px, #cccccc, centered)
```

**Rare:**
```
[Rarity Label: "Shiny Stuff"]  (14px, blue, centered)
[Item Name]                     (bold 24px, blue, centered)
[Description]                   (16px, #ffffff, centered)
[Stat Preview]                  (13px, #aaaaaa, centered)
---
[Press any key]                 (11px, #666666, pulsing alpha)
```

**Legendary:**
```
["LEGENDARY" slam text]         (bold 32px, gold, impact animation)
[Rarity Label: "REALLY Cool Stuff"]  (14px, gold, centered)
[Item Name]                     (bold 28px, gold, centered, glow shadow)
[Description]                   (18px, #ffffff, centered)
[Stat Preview]                  (14px, #cccccc, centered)
---
[Press any key]                 (12px, #888888, pulsing alpha)
```

### 6.5 Reveal Dismissal

| Rarity | Auto-dismiss | Player dismiss | Dismiss input |
|--------|-------------|----------------|---------------|
| Common | 0.8s | N/A (no pause) | N/A |
| Uncommon | 1.2s | N/A (no pause) | N/A |
| Rare | 1.8s | Any key after 0.5s | Enter, Space, or any gamepad button |
| Legendary | 3.0s | Any key after 1.0s | Enter, Space, or any gamepad button |

The minimum-time-before-dismiss prevents accidental skip when the player is mashing attack.

### 6.6 Stat Preview Format

For Rare and Legendary items, show a condensed stat line:

```
[Slot: ARMOR]  [Effect: -40% DMG TAKEN]
```

Built from `itype.slot` and `itype.desc`. Slot names mapped via:
```js
const SLOT_LABELS = {
  armor: 'ARMOR', boots: 'BOOTS', glasses: 'ACCESSORY',
  ring: 'RING', charm: 'CHARM', vest: 'VEST', pendant: 'PENDANT',
  bracelet: 'BRACELET', gloves: 'GLOVES', cushion: 'TRINKET',
  turboshoes: 'BOOTS', goldenbone: 'PASSIVE', crown: 'PASSIVE',
  zombiemagnet: 'PASSIVE', scarf: 'PASSIVE',
  duck: 'STACKABLE', fur: 'STACKABLE', straw: 'STACKABLE',
  bandana: 'STACKABLE', hotsauce: 'STACKABLE', ball: 'STACKABLE',
  penny: 'STACKABLE', clock: 'STACKABLE'
};
```

---

## 7. 3D World Effects Technical Design

### 7.1 Common: Sparkle Burst

On pickup, spawn 8-12 small BoxGeometry(0.05, 0.05, 0.05) meshes at item position with random velocity vectors (magnitude 2-4 units/s). Apply `MeshBasicMaterial({ color: 0xffdd88 })`. Fade opacity over 0.4s, then remove+dispose. Add to a `st.revealParticles[]` array updated each frame.

### 7.2 Uncommon: Float + Sparkle Trail

Clone the item's mesh material with increased emissiveIntensity (0.8). Move mesh upward at 2 units/s for 0.5s. Spawn green sparkle particles (16-20) trailing behind the floating mesh. Dispose all after 1.2s.

### 7.3 Rare: Light Rays + Spotlight

Create 6 PlaneGeometry(0.1, 8) meshes radiating from pickup position, oriented outward at 60-degree intervals, with `MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 })`. Animate opacity from 0 to 0.5 over 0.3s. Add a PointLight(0x4488ff, 2, 15) at pickup position + 3 units Y. Item mesh scaled to 1.5x, spinning at 1 rad/s. Dispose all on dismiss.

### 7.4 Legendary: Light Column + Particle Orbit + Explosion

**Phase 1 (0-0.5s lead-in):** 20 gold particles converge inward from radius 5 toward pickup position. Rising audio build.

**Phase 2 (0.5s mark):** Gold explosion -- 40 particles burst outward + `st.itemFlashTimer = 0.15` with gold color. CylinderGeometry(0.5, 0.5, 20) gold emissive light column shoots upward from ground. PointLight(0xffcc00, 3, 25) at pickup + 4 units Y. Screen shake (0.15 amp, 0.3s).

**Phase 3 (0.5-3.0s):** Item mesh at 2x scale, spinning at 0.8 rad/s. 12 gold particles orbit at radius 1.5, phase-shifted evenly. Light column pulses subtly (opacity 0.4-0.6). "LEGENDARY" text slam animation in HUD.

**Phase 4 (dismiss):** All 3D objects fade opacity over 0.3s, then dispose. Camera zooms back over 0.3s.

---

## 8. Audio Requirements

### 8.1 New Sound Events Needed

| Sound ID | Rarity | Description | Style | Duration | Priority |
|----------|--------|-------------|-------|----------|----------|
| `sfx_item_common` | Common | Soft pop/sparkle | Light, airy, like popping a bubble | 0.3s | HIGH |
| `sfx_item_uncommon` | Uncommon | Satisfying "ding" | Clear bell tone with slight reverb | 0.5s | HIGH |
| `sfx_item_rare` | Rare | Dramatic 2-note chord | Rising interval (4th or 5th), slight echo | 0.8s | HIGH |
| `sfx_item_legendary` | Legendary | Orchestral sting | Brass hit + shimmer trail, triumphant | 1.5s | HIGH |
| `sfx_item_legendary_buildup` | Legendary | Rising tension tone | Sustained note rising in pitch over 0.5s | 0.5s | MEDIUM |
| `sfx_reveal_slam` | Legendary | Impact hit for text slam | Deep thud + metallic ring | 0.3s | MEDIUM |

### 8.2 Existing Sounds to Repurpose

| Current Sound | Current Use | New Use |
|---------------|-------------|---------|
| `sfx_level_up` (rawr-2.ogg) | Placeholder for all item pickups | Remove from item pickup; keep for actual level-ups only |
| `sfx_item_pickup` (unmapped) | Was intended for generic pickup | Replace with tier-specific sounds above |
| `sfx_crate_open` (litterbox-1.ogg) | Crate breaking | Keep as-is (crate break is separate from item reveal) |

### 8.3 Sound Pack Integration

Current audio system (`js/3d/audio.js`) uses `SOUND_MAP` with arrays of file variants per event ID. New sounds should be added in the same pattern:

```js
sfx_item_common: ['item-pop-1.ogg'],
sfx_item_uncommon: ['item-ding-1.ogg'],
sfx_item_rare: ['item-reveal-rare-1.ogg'],
sfx_item_legendary: ['item-legendary-1.ogg'],
sfx_item_legendary_buildup: ['item-buildup-1.ogg'],
sfx_reveal_slam: ['impact-slam-1.ogg'],
```

These sounds would be part of **Sound Pack Beta** (not yet recorded). Until then, placeholder mappings from Sound Pack Alpha:
- `sfx_item_common`: could use `poop-1.ogg` (comedic pop) -- not ideal
- `sfx_item_uncommon`: could use `rawr-2.ogg` (existing level-up)
- `sfx_item_rare`: could use `explode-1.ogg` (dramatic but too aggressive)
- `sfx_item_legendary`: no suitable placeholder in Alpha pack

**Recommendation:** Implement the visual system first with silent placeholders for unmapped sounds. The audio system already handles missing files gracefully (fail-silent pattern in `playSound`).

---

## 9. Interaction with Existing Systems

### 9.1 Wearable Comparison Menu (BD-199)

When an occupied slot item is picked up, the comparison menu opens (`st.wearableCompare`). The reveal animation should play BEFORE the comparison menu opens:

1. Player walks into item pickup
2. Reveal animation plays (Common/Uncommon: during gameplay; Rare/Legendary: pauses)
3. If slot is occupied, comparison menu opens AFTER reveal dismisses
4. If slot is empty, item auto-equips during/after reveal

For Common/Uncommon (no pause), this means the comparison menu opens immediately after the brief flourish. For Rare/Legendary, the reveal plays first, then transitions to comparison.

### 9.2 Boss Reward Items

Boss deaths already guarantee legendary drops. The legendary reveal should trigger when the player picks up the boss drop, not at the moment of boss death. The existing "BOSS DEFEATED!" floating text and explosion remain separate.

### 9.3 Stackable Items

Stackable items (Rubber Ducky, Thick Fur, etc.) can be picked up multiple times. The reveal should show the stack count:

```
THICK FUR (x3)
+15 Max HP
```

After the first pickup of a stackable, subsequent pickups could be "demoted" one tier in ceremony (e.g., second Rubber Ducky gets Common treatment even though it is common). This prevents annoyance from repeated common pickups. Optional -- evaluate during playtesting.

### 9.4 Multiple Simultaneous Pickups

If the player walks through two items at once (possible with magnet ring), reveals should queue -- not stack. Each reveal plays in sequence. For common items, the queue processes rapidly (0.8s each). For higher rarities, the queue adds a brief gap between reveals.

```
st.itemRevealQueue = [];  // FIFO queue of pending reveals
```

### 9.5 Death Sequence Interaction

If the player dies during a reveal (unlikely but possible for Common/Uncommon which don't pause), the reveal should be immediately cancelled and the death sequence takes priority.

---

## 10. Implementation Beads

### BD-246: Item Reveal State Machine + Common Tier (Small-Medium)

**Deliverables:**
- New `st.itemReveal` state object replacing `st.itemAnnouncement`, `st.itemFlashTimer`, `st.itemSlowTimer`
- Reveal state machine with phases: `anticipation`, `escalation`, `reveal`, `resolution`
- Common tier implementation: sparkle particles (3D) + compact name tag (HUD)
- `st.itemRevealQueue` for sequential reveal processing
- Refactor pickup code in game3d.js to call `triggerItemReveal(itype, rarity)` instead of inline feedback
- Backward-compatible: if `st.itemReveal` is null, no overlay renders

**Files modified:** `js/game3d.js` (pickup handler), `js/3d/hud.js` (new `drawItemReveal` function)

**Estimated size:** Medium (200-300 lines across two files)

**Dependencies:** None

---

### BD-247: Uncommon Tier Reveal (Small)

**Deliverables:**
- Uncommon reveal: 0.8s slow-motion + green sparkle trail + float animation
- Enhanced HUD banner with rarity label ("Good Stuff") + green border
- Rarity-scaled time dilation (replaces uniform 0.3s slow)
- `sfx_item_uncommon` sound event (mapped to placeholder or empty)

**Files modified:** `js/game3d.js` (reveal update loop, 3D particle spawning), `js/3d/hud.js` (uncommon banner), `js/3d/audio.js` (new sound event)

**Estimated size:** Small (100-150 lines)

**Dependencies:** BD-246

---

### BD-248: Rare Tier Reveal -- Pause + Light Rays (Medium)

**Deliverables:**
- Rare reveal: slow-mo lead-in -> game pause -> light rays + spotlight + spinning item
- Blue light ray meshes (6 radiating planes) + PointLight
- Camera zoom-in (15%) during lead-in, hold during pause, zoom-out on dismiss
- HUD large banner with rarity label + description + stat preview
- Press-any-key dismissal with 0.5s minimum hold
- `sfx_item_rare` sound event
- 3D object cleanup/disposal on dismiss

**Files modified:** `js/game3d.js` (camera zoom, 3D effect spawning/updating, pause logic), `js/3d/hud.js` (rare banner + stat preview + dismiss prompt), `js/3d/audio.js` (new sound event)

**Estimated size:** Medium (250-350 lines)

**Dependencies:** BD-246, BD-247

---

### BD-249: Legendary Tier Reveal -- Full Ceremony (Medium-Large)

**Deliverables:**
- Legendary reveal: slow-mo lead-in with converging particles -> gold explosion + light column -> paused spotlight with orbiting particles -> "LEGENDARY" text slam
- All 3D effects: CylinderGeometry light column, 40-particle explosion, 12-particle orbit, 2x item mesh
- Screen darkening overlay (60% black except spotlight area)
- Camera dramatic zoom (25%) with breathe pull-back effect
- Screen shake on text slam
- "LEGENDARY" text impact animation (scale overshoot with elastic ease)
- `sfx_item_legendary` + `sfx_item_legendary_buildup` + `sfx_reveal_slam` sound events
- Full cleanup/disposal pipeline

**Files modified:** `js/game3d.js` (all 3D ceremony effects, camera, shake), `js/3d/hud.js` (legendary overlay with slam animation), `js/3d/audio.js` (3 new sound events)

**Estimated size:** Large (400-500 lines)

**Dependencies:** BD-246, BD-247, BD-248

---

### BD-250: Reveal Queue + Edge Case Handling (Small)

**Deliverables:**
- Reveal queue system: multiple pickups processed sequentially
- Death sequence cancellation (reveal aborts on HP <= 0)
- Wearable comparison menu integration (reveal plays before comparison opens)
- Stackable item stack-count display in reveal banner
- Repeated-stackable ceremony demotion (optional, gated behind playtesting)

**Files modified:** `js/game3d.js` (queue processing, death check, comparison handoff), `js/3d/hud.js` (stack count rendering)

**Estimated size:** Small (100-150 lines)

**Dependencies:** BD-246, BD-247, BD-248, BD-249

---

### BD-251: Reveal Audio Pack (Small -- blocked on Sound Pack Beta)

**Deliverables:**
- Record/source 6 new sound effects (see Section 8.1)
- Map all sound events in `js/3d/audio.js` SOUND_MAP
- Volume balancing across tiers (common quieter, legendary louder)
- Remove `sfx_level_up` from item pickup code (keep for actual level-ups)

**Files modified:** `js/3d/audio.js` (SOUND_MAP entries), `sound-pack-beta/` (new audio files)

**Estimated size:** Small (code) + recording session

**Dependencies:** BD-246 (for sound event IDs to exist), Sound Pack Beta recording session

---

## 11. Implementation Order + Dependency Graph

```
BD-246 (State Machine + Common)
  |
  +-- BD-247 (Uncommon)
  |     |
  |     +-- BD-248 (Rare)
  |           |
  |           +-- BD-249 (Legendary)
  |                 |
  |                 +-- BD-250 (Queue + Edge Cases)
  |
  +-- BD-251 (Audio Pack) -- can start after BD-246, blocked on Sound Pack Beta
```

**Estimated total effort:** 6 beads, ~1050-1450 lines of new/modified code

**Parallelization:** BD-251 (audio) can be developed in parallel with BD-247-249 once BD-246 lands. BD-247 through BD-249 are strictly sequential (each tier builds on the previous). BD-250 requires all tiers to be implemented.

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Performance: too many particles on low-end devices | Medium | Medium | Cap particles per reveal (8-12 common, 40 legendary). Pool and reuse particle meshes rather than create/dispose |
| Annoyance: pauses feel intrusive at high pickup rates | Medium | High | Only Rare+ pauses. Common/Uncommon never interrupt flow. Reveal queue prevents stacking. Playtesting will validate |
| Camera zoom feels jarring | Low | Medium | Ease curves (cubic ease-in-out). Small zoom amounts (15-25%). Instant revert if player takes damage |
| Sound Pack Beta delays | High | Low | Visual system works without audio. Fail-silent pattern in audio manager handles missing files |
| Interaction with comparison menu feels awkward | Medium | Medium | BD-250 specifically addresses this. Reveal-then-compare sequence tested as unit |
| 3D object leaks on rapid pickup | Low | High | Strict disposal in reveal dismiss handler. Safety sweep: any lingering reveal objects cleaned on next reveal start |

---

## 13. Success Criteria

After all beads are implemented, the following should be true:

1. Picking up a Common item adds a brief sparkle and name popup without any game interruption
2. Picking up an Uncommon item triggers a noticeable slow-motion moment with green glow
3. Picking up a Rare item pauses the game with blue light rays and a spotlight reveal
4. Picking up a Legendary item produces a dramatic multi-second ceremony that feels genuinely exciting
5. No reveal causes frame drops below 30fps on target hardware
6. Reveal queue handles 3+ simultaneous pickups without visual glitches
7. Comparison menu works correctly after any reveal tier
8. Death during a non-pausing reveal cancels cleanly
9. Each rarity tier has a distinct, appropriate sound effect (once Sound Pack Beta ships)
10. A 7-year-old player should react with genuine excitement when a Legendary item drops
