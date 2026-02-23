# UX & Visual Beads — Leopard vs Zombies

Generated from: gameplay screenshot review, 2026-02-22
Focus: HUD readability, kid-friendliness, art asset needs for agentic art generation

---

## Summary Table

| BD | Title | Category | Priority | Scope | Dependencies |
|----|-------|----------|----------|-------|--------------|
| BD-39 | Fix top-right HUD text overlap (augments vs howls vs timer) | Bug Fix | P1-High | Small | -- |
| BD-40 | Increase HUD font sizes and contrast for kid readability | UX | P1-High | Medium | BD-39 |
| BD-41 | Add icon slots to HUD for weapons, howls, items, augments | UX / Art | P2-Medium | Large | BD-39, BD-40 |
| BD-42 | Art asset spec: weapon icons (10 weapons) | Art Spec | P2-Medium | Spec only | -- |
| BD-43 | Art asset spec: howl icons (10 howls) | Art Spec | P2-Medium | Spec only | -- |
| BD-44 | Art asset spec: item icons (25 items) | Art Spec | P2-Medium | Spec only | -- |
| BD-45 | Art asset spec: powerup icons (18 powerups) | Art Spec | P2-Medium | Spec only | -- |
| BD-46 | Art asset spec: augment + totem icons (8 augments, skulls) | Art Spec | P2-Medium | Spec only | -- |
| BD-47 | Art asset spec: HUD chrome and frames (bars, panels, badges) | Art Spec | P2-Medium | Spec only | -- |
| BD-48 | Audio system overhaul — sound mapping, balance, and QA | Audio / QA | P1-High | Medium-Large | -- |
| BD-49 | Fix character models clipping through terrain floor | Bug Fix | P1-High | Small | -- |
| BD-50 | Add collision for decorations (trees, rocks, fallen logs) | Gameplay | P2-Medium | Medium | -- |
| BD-51 | Research: sound mapping patterns in survivor/roguelike games | Research | P1-High | Spec only | -- |
| BD-52 | Remove difficulty select; single difficulty with emergent scaling | Game Design | P1-High | Large | -- |
| BD-53 | Increase zombie spawn pressure and wave scaling | Gameplay / Balance | P1-High | Small | BD-52 |
| BD-54 | Add XP gems scattered across the map (non-respawning) | Gameplay / Content | P1-High | Medium | -- |
| BD-55 | Increase ambient item chest spawns | Gameplay / Balance | P1-High | Small | -- |
| BD-56 | Show equipped items visually on player model | Visual / Gameplay | P2-Medium | Large | -- |
| BD-57 | Fix muscle growth making models into featureless blocks at high levels | Bug Fix / Visual | P1-High | Small | -- |
| BD-58 | Restore 2D mode access from title screen (mode select) | UX / Game Flow | P1-High | Small | -- |
| BD-59 | Increase ambient zombie spawn count by 35% | Gameplay / Balance | P1-High | Small | BD-53 |
| BD-60 | Double wave event zombie count for impactful waves | Gameplay / Balance | P1-High | Small | BD-53 |
| BD-61 | Increase zombie merge collision radius by 20% | Gameplay / Balance | P1-High | Small | -- |
| BD-62 | Add charge shrines with tiered stat upgrade choices | Gameplay / Content | P1-High | Large | -- |
| BD-63 | Fix arms disappearing at high levels — full-body proportional scaling | Bug Fix / Visual | P0-Critical | Medium | BD-57 |
| BD-64 | Increase charge shrine count to 20-25 for denser exploration | Gameplay / Balance | P1-High | Small | BD-62 |
| BD-65 | Increase base zombie spawn rate by 15% | Gameplay / Balance | P1-High | Small | BD-59 |
| BD-66 | Halve starting HP for all animals (reduce tankiness) | Gameplay / Balance | P1-High | Small | -- |
| BD-67 | Progressive high-tier zombie spawning by wave (primary difficulty driver) | Gameplay / Balance | P1-High | Medium | -- |
| BD-68 | Audio spontaneously stops at ~6min mark and never recovers | Bug Fix | P0-Critical | Medium | -- |
| BD-69 | Add collision for in-game objects (trees, rocks, shrines, decorations) | Gameplay / Physics | P1-High | Medium | BD-50 |
| BD-70 | Equipped items must visually display on character model | Visual / Gameplay | P0-Critical | Large | BD-56 |
| BD-71 | New weapon: Exploding Turd Mines (drop behind, AoE on proximity) | Gameplay / Content | P1-High | Medium | BD-72 |
| BD-72 | Reclassify weapons into 3 classes: AoE melee, projectiles, mines | Game Design / Architecture | P1-High | Large | -- |
| BD-73 | Flatten terrain completely — remove curvature, fix seam gaps | Visual / Bug Fix | P0-Critical | Medium | -- |
| BD-74 | Enter key resets level during upgrade/selection menus instead of confirming | Bug Fix | P0-Critical | Small | -- |
| BD-75 | Add item drops to zombie loot table (tier-scaled chance) | Gameplay / Balance | P1-High | Small | -- |
| BD-76 | Add HUD minimap with fog of war + full map on M key | UX / Gameplay | P1-High | Large | -- |
| BD-77 | Add challenge shrines that spawn scaled mini-boss zombies with guaranteed loot | Gameplay / Content | P1-High | Large | -- |
| BD-78 | Improve tree models with rounded canopy (multi-box foliage) | Visual / Polish | P2-Medium | Small | -- |

---

## P1 -- High (Ship-affecting UX bugs)

### BD-39: Fix top-right HUD text overlap (augments vs howls vs timer)
**Category:** Bug Fix
**Priority:** P1-High
**File(s):** `js/3d/hud.js` (lines 116-268)
**Screenshot:** `screenshot-ai/gameplay-hud-overlap-01.png`
**Description:**
Three independent HUD sections render on the right side of the screen with overlapping Y positions:

1. **Wave + Score + Timer** (lines 131-141): Y = 35, 55, 75
2. **Augment display** (lines 244-267): starts at Y = 80, entries at Y = 96+
3. **Howl display** (lines 117-128): starts at Y = 92

The augments header "AUGMENTS" (Y=80) overlaps with the timer (Y=75). Augment entries (Y=96+) overlap with howl entries (Y=92+). When both augments and howls are collected, text becomes unreadable — confirmed in screenshot showing "+0.5" augment text colliding with "FORTUNE HOWL x1".

**Root Cause:**
Augment display uses a hardcoded start Y=80 (line 247). Howl display uses a hardcoded start Y=92 (line 118). Neither section knows the other exists, and neither accounts for the dynamic height of the Wave/Score/Timer block above them.

**Acceptance Criteria:**
- Right-side HUD sections stack sequentially: Wave/Score/Timer → Augments → Howls → Skulls
- Use a single running Y cursor that flows downward, so each section starts below the previous one
- Add 8-12px vertical gap between sections for visual separation
- Test with: 0 augments + 0 howls, 3 augments + 5 howls, max augments + max howls
- No text overlaps at any combination of collected augments/howls

**Suggested Fix:**
```javascript
// Replace hardcoded Y values with a flowing cursor:
ctx.textAlign = 'right';
let rightY = 80; // starts after timer (which ends at Y=75)

// Augments section
const augKeys = Object.keys(s.augments);
if (augKeys.length > 0) {
  ctx.fillStyle = '#88ffaa'; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText('AUGMENTS', W - 20, rightY);
  rightY += 16;
  for (const aKey of augKeys) { /* ... */ rightY += 16; }
  rightY += 8; // gap before next section
}

// Howls section
const howlEntries = Object.entries(s.howls).filter(([, v]) => v > 0);
if (howlEntries.length > 0) {
  for (const [tid, count] of howlEntries) { /* ... */ rightY += 16; }
  rightY += 8;
}

// Skulls section
if (s.totemCount > 0) {
  ctx.fillStyle = '#ff2222'; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText(`SKULLS: ${s.totemCount}`, W - 20, rightY);
}
```

**Estimated Scope:** Small (<50 lines)
**Dependencies:** None

---

### BD-40: Increase HUD font sizes and contrast for kid readability
**Category:** UX
**Priority:** P1-High
**File(s):** `js/3d/hud.js` (entire file)
**Screenshot:** `screenshot-ai/gameplay-hud-overlap-01.png`
**Description:**
The current HUD uses 14px Courier New monospace for nearly all text. This is too small for the target audience (kids). Key problems:

1. **Font size**: 14px is fine for developer tools, not for a kids' game. Most kid-friendly games use 18-24px minimum for gameplay info.
2. **Font choice**: Courier New is a typewriter font. It lacks visual appeal and warmth.
3. **Contrast**: Many elements use dim colors against the 3D scene (e.g., augment text in pastel colors over green terrain). No text shadows or outlines.
4. **Information density**: The bottom-left item list, bottom controls hint, and right-side stats are all small monospace text crammed together.
5. **No visual hierarchy**: Everything is the same weight and size. Primary info (HP, weapons) looks the same as secondary info (augments, items).

**Acceptance Criteria:**
- Primary HUD elements (HP bar, weapon names, wave number) use 18-20px bold
- Secondary elements (augments, howls, items) use 16px
- Tertiary elements (timer, controls hint) use 14px
- All HUD text gets a 1px dark text shadow for contrast against any background:
  ```javascript
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ```
- Reset shadow after HUD draw to avoid affecting other rendering
- HP and XP bars are at least 20px tall (currently 20px HP / 14px XP — XP is too thin)
- Weapon slot bars are at least 22px tall (currently 18px)
- Visual hierarchy is clear: a player can identify HP and weapon status at a glance

**Estimated Scope:** Medium (50-200 lines — touches many font/size declarations throughout hud.js)
**Dependencies:** BD-39 (fix layout first, then resize)

---

## P2 -- Medium (Art pipeline and icon infrastructure)

### BD-41: Add icon slots to HUD for weapons, howls, items, augments
**Category:** UX / Art
**Priority:** P2-Medium
**File(s):** `js/3d/hud.js`, new `assets/icons/` directory
**Description:**
Currently the HUD is 100% text. Every weapon, howl, item, augment, and powerup is represented by a text label. For kids, small pixel-art icons alongside (or replacing) text labels would massively improve scan-ability and visual appeal.

This bead establishes the **icon rendering infrastructure** in the HUD:
- Define standard icon sizes (16x16 for compact, 24x24 for primary, 32x32 for featured)
- Add `drawIcon(ctx, iconId, x, y, size)` utility that renders from a sprite sheet or individual images
- Add icon slots next to weapon names, howl names, item names, and augment names
- Gracefully fall back to text-only when icons haven't been generated yet (so art beads BD-42 through BD-47 can land independently)

**Acceptance Criteria:**
- `drawIcon()` function exists and handles missing icons gracefully (draws colored square placeholder)
- Weapon slot bars show a 16x16 icon to the left of the weapon name
- Howl entries show a 16x16 icon to the left of the howl name
- Item list entries show a 16x16 icon to the left of the item name
- Augment entries show a 16x16 icon to the left of the augment name
- Icons load from `assets/icons/{category}/{id}.png` convention
- No visual regression when icon files don't exist (placeholder squares match the item's color)

**Estimated Scope:** Large (200+ lines — new utility + integration across all HUD sections)
**Dependencies:** BD-39 (layout fix), BD-40 (sizing fix)

---

### BD-42: Art asset spec — weapon icons (10 weapons)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/weapon-icons.md` (new)
**Description:**
Specification document for agentic art generation of weapon icons. Each weapon needs a recognizable 32x32 pixel-art icon.

**Icons Needed (from WEAPON_TYPES in constants.js):**

| ID | Name | Color | Visual Description |
|----|------|-------|--------------------|
| clawSwipe | Claw Swipe | #ff8844 | Three curved claw slash marks, orange glow |
| boneToss | Bone Toss | #ddddaa | White cartoon bone, slight arc motion lines |
| poisonCloud | Poison Cloud | #88ff44 | Green-purple cloud with skull wisps |
| lightningBolt | Lightning Bolt | #ffff44 | Bright yellow zigzag bolt |
| fireball | Fireball | #ff4422 | Orange-red fireball with trailing flames |
| boomerang | Boomerang | #44ddff | Cyan cross/X-shaped spinning disc |
| mudBomb | Mud Bomb | #8B6914 | Brown mud sphere with splatter droplets |
| beehiveLauncher | Beehive Launcher | #FFD700 | Golden beehive with small bees around it |
| snowballTurret | Snowball Turret | #E0F0FF | White snowball with ice crystal sparkles |
| stinkLine | Stink Line | #90EE90 | Green wavy stink lines with small flies |

**Format:** 32x32 PNG, transparent background, pixel-art style matching the game's chunky voxel aesthetic. Bold outlines (1-2px dark border). Vibrant colors that read clearly at 16x16 downscale.

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-43: Art asset spec — howl icons (10 howls)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/howl-icons.md` (new)
**Description:**
Specification document for agentic art generation of howl/scroll icons. Each howl needs a recognizable 32x32 pixel-art icon.

**Icons Needed (from HOWL_TYPES in constants.js):**

| ID | Name | Color | Visual Description |
|----|------|-------|--------------------|
| power | Power Howl | #ff4444 | Red fist / flexing bicep with energy lines |
| haste | Haste Howl | #44ff44 | Green speed lines / running shoe with wings |
| arcane | Arcane Howl | #aa44ff | Purple magic star / swirling orb |
| vitality | Vitality Howl | #ff88aa | Pink heart with pulse wave |
| fortune | Fortune Howl | #ffcc00 | Gold coin / four-leaf clover |
| range | Range Howl | #44aaff | Blue crosshair / expanding circle |
| thorns | Thorns Howl | #cc8844 | Brown thorny vine circle |
| magnet | Magnet Howl | #ff44ff | Magenta horseshoe magnet with field lines |
| frenzy | Frenzy Howl | #ff8800 | Orange spinning saw / wild eyes |
| guardian | Guardian Howl | #4488ff | Blue shield with star emblem |

**Format:** 32x32 PNG, transparent background, pixel-art style. Each icon should feel like a "buff" — positive, glowing energy.

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-44: Art asset spec — item icons (25 items)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/item-icons.md` (new)
**Description:**
Specification document for agentic art generation of item icons. 25 items from ITEMS_3D in constants.js, each needing a 32x32 pixel-art icon.

Items span 4 rarity tiers with border colors:
- **Common** (white #ffffff): Leather Armor, Aviator Glasses, Soccer Cleats, Rubber Ducky, Thick Fur, Silly Straw
- **Uncommon** (green #44ff44): Cowboy Boots, Magnet Ring, Thorned Vest, Bandana, Hot Sauce, Bouncy Ball
- **Rare** (blue #4488ff): Chainmail, Lucky Charm, Health Pendant, Crit Gloves, Lucky Penny, Alarm Clock
- **Legendary** (gold #ffcc00): Shield Bracelet, Cozy Cushion, Turbo Shoes, Golden Bone, Crown, Zombie Magnet, Wool Scarf

Each icon should visually represent the item with kid-friendly clarity. Items should look like collectible treasures — shiny, appealing, immediately recognizable.

**Format:** 32x32 PNG, transparent background, pixel-art style. 2px colored border matching rarity tier. Bold, simple shapes that read at 16x16.

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-45: Art asset spec — powerup icons (18 powerups)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/powerup-icons.md` (new)
**Description:**
Specification for 18 powerup icons from POWERUPS_3D in constants.js. Powerups are temporary buffs — icons should feel energetic, flashy, and exciting.

Key powerups: Jumpy Boots, Claws of Steel, Super Fangs, Race Car, Banana Cannon, Litter Box, Angel Wings, Frost Nova, Berserker Rage, Ghost Form, Earthquake Stomp, Vampire Fangs, Lightning Shield, Giant Growth, Time Warp, Magnet Aura, Mirror Image, Bomb Trail.

**Format:** 32x32 PNG, transparent background, pixel-art style. Bright, saturated colors with energy/glow effects. Should look "powerful" and temporary.

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-46: Art asset spec — augment + totem icons (8 augments, skulls)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/augment-icons.md` (new)
**Description:**
Specification for shrine augment icons (8 types) and the skull/totem counter icon. From SHRINE_AUGMENTS in constants.js.

Augments: +HP (green cross), +XP (gold star), +Damage (red sword), +Speed (blue boot), +Attack Speed (orange lightning), +Pickup Radius (cyan magnet), +Armor (gray shield), +Regen (pink heart pulse).

Totem skull: Red skull icon for the "SKULLS: X" counter.

**Format:** 32x32 PNG, transparent background, pixel-art style. Clean, simple stat-boost symbols. Each should be instantly recognizable at 16x16 as "this boosts X stat."

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-47: Art asset spec — HUD chrome and frames (bars, panels, badges)
**Category:** Art Spec
**Priority:** P2-Medium
**File(s):** `docs/art-specs/hud-chrome.md` (new)
**Description:**
Specification for HUD frame art — the decorative borders, panels, and bar frames that replace the current raw rectangles with themed visuals.

**Assets Needed:**
1. **HP bar frame** — bone/claw-themed border around the health bar (240x28px)
2. **XP bar frame** — gem/crystal-themed border around XP bar (240x20px)
3. **Weapon slot frame** — 4 slots, each with a paw-print or fang border (160x24px each)
4. **Right-side panel background** — semi-transparent dark panel for augments/howls/score area
5. **Category badges** — "NEW WEAPON", "UPGRADE", "HOWL" badge backgrounds for upgrade menu
6. **Charge bar frame** — segmented frame with animal-themed end caps
7. **Item list panel** — bottom-left panel background for equipped items

**Style:** Chunky, hand-drawn feel matching the voxel art. Think "carved wood" or "jungle-themed UI." Dark backgrounds with bright themed borders. No fine detail — everything should be bold and readable.

**Format:** PNG with transparency, 9-slice compatible where applicable (corners + edges + fill). Pixel-art style at 2x resolution (render at 1x).

**Estimated Scope:** Spec only (no code)
**Dependencies:** None

---

### BD-48: Audio system overhaul — sound mapping, balance, and QA
**Category:** Audio / QA
**Priority:** P1-High
**File(s):** `js/3d/audio.js` (SOUND_MAP, lines 32-131), `js/game3d.js` (24 playSound call sites), `sound-pack-alpha/sound-ids.md`
**Description:**
The current sound mapping was built speculatively from file names alone — mapping "bouncy-boots" to jump, "pew-pew" to projectile, etc. In practice this produced several problems that only become apparent during actual gameplay:

**1. Sound overlap / cacophony:**
Multiple high-frequency events fire simultaneously without any priority, cooldown, or ducking system. For example:
- Auto-attack weapons fire every 1-2 seconds, each triggering a sound
- With 4 weapons active, that's 2-4 sounds per second just from weapons
- XP pickups (`sfx_xp_pickup`) fire on every gem collect — during a big kill this can be 10+ per second
- Zombie spawns, merges, and deaths all fire independently
- The MAX_CONCURRENT=8 cap helps prevent audio explosion but the result is still a wall of overlapping mouth-made sounds with no hierarchy

**2. Wrong sounds in wrong slots:**
The mapping was a best-guess from file names, not from actually listening to each file in-game context. Specific issues observed:
- `sfx_xp_pickup` uses `Bite-1.mp3` (a bite sound for collecting XP gems — confusing and repetitive)
- `sfx_crate_open` uses `litterbox-1.ogg` — same sound as `sfx_item_pickup` and `sfx_powerup_generic` (3 events sharing one file)
- `sfx_shrine_break` uses `explode-1.ogg` — same as `sfx_explosion` (shrine break should feel mystical, not explosive)
- `sfx_level_up` uses `rawr-1.ogg` — same pool as `sfx_power_attack_release` (level-up feels like a power attack)
- `sfx_player_growl` and `sfx_power_attack_charge` both use `leapord-growl-1.ogg` (identical sound for two different events)

**3. No per-event volume balancing:**
All sounds play at the same `masterVolume`. A loud 70KB race-car sound plays at the same level as a quiet 5KB bite. Frequent events (weapon fire, XP pickup) need to be quieter; rare impactful events (level-up, death, shrine break) should be louder. There's no per-event volume multiplier.

**4. No cooldown/throttling per event:**
`sfx_xp_pickup` can fire dozens of times per second during a kill streak. `sfx_zombie_spawn` fires on every spawn wave. There's no minimum interval between plays of the same event ID, so rapid-fire events produce machine-gun audio stutter.

**5. No spatial/proximity awareness:**
Zombie spawns at the edge of the screen play at the same volume as melee hits in the player's face. There's no distance-based volume attenuation.

**What's Needed:**
This bead requires **direct observation QA** — someone needs to play the game with sound on, event by event, and:
1. Listen to each of the 40 sound files in isolation
2. Play-test each mapping in its actual gameplay context
3. Re-map sounds that don't fit their events
4. Assign per-event volume multipliers (0.0-1.0 scale relative to master)
5. Add per-event cooldown intervals (ms) to prevent stutter
6. Identify which events should be silent or much quieter (e.g., XP pickup should be a barely-audible tick, not a bite)

**Acceptance Criteria:**
- [ ] SOUND_MAP entries reviewed and corrected based on listening QA (not file name guessing)
- [ ] Per-event volume multiplier added to audio system: `playSound(eventId, { volume: 0.5 })` or SOUND_MAP entry includes a `volume` field
- [ ] Per-event cooldown/throttle added: `minInterval` field in SOUND_MAP (e.g., `sfx_xp_pickup` max once per 200ms)
- [ ] No two distinct game events share the exact same sound file unless intentional (document why)
- [ ] High-frequency events (xp pickup, weapon fire, zombie spawn) are audibly quieter than low-frequency events (level-up, death, shrine break)
- [ ] Playing with 4 weapons + 100 zombies doesn't produce audio cacophony — sound mix is coherent
- [ ] Gap analysis sounds (from sound-ids.md) have explicit "silent / no sound" entries rather than wrong-fit substitutes
- [ ] QA session results documented in `docs/reviews/audio-qa-notes.md`

**Suggested SOUND_MAP Enhancements:**
```javascript
const SOUND_MAP = {
  sfx_xp_pickup: {
    files: [],           // SILENT — no good match, don't fake it with Bite-1
    volume: 0.15,        // If a file is added later, keep it very quiet
    minInterval: 200,    // Max 5 per second
  },
  sfx_melee_hit: {
    files: ['Bite-1.mp3', 'Bite-2.ogg', 'bite-3.ogg', 'bite-4.ogg'],
    volume: 0.4,
    minInterval: 100,
  },
  sfx_weapon_projectile: {
    files: ['pew-pew-pew-1.ogg', 'pew-pew-pew-2.ogg'],
    volume: 0.3,         // Quieter — fires every 1.5s
    minInterval: 300,
  },
  sfx_level_up: {
    files: ['rawr-1.ogg'],
    volume: 1.0,         // Full volume — rare, important
    minInterval: 0,      // No throttle — happens once per level
  },
  sfx_player_death: {
    files: ['falling-scream-1.ogg'],
    volume: 1.0,
    minInterval: 0,
  },
  // ... etc
};
```

**Estimated Scope:** Medium-Large (refactor SOUND_MAP structure, update playSound(), QA session, re-mapping)
**Dependencies:** None (but should happen before any new sounds are recorded for Sound Pack Beta)

---

### BD-49: Fix character models clipping through terrain floor
**Category:** Bug Fix
**Priority:** P1-High
**File(s):** `js/game3d.js` (enemy Y positioning ~lines 3391-3400, player ground offset ~line 2845), `js/3d/terrain.js` (`terrainHeight`)
**Description:**
Character models (both player and zombies) are visibly sinking into the terrain — their lower bodies are partially obscured by the ground plane. This is a Y-offset calibration issue.

**Root Cause:**
The ground offset constants don't account for model height correctly:
- Player uses `GROUND_OFFSET = 0.55` (line 2845) — the model's pivot point (origin) is at its center, but 0.55 units above terrain may not be enough to keep feet above the surface, especially on sloped terrain where `terrainHeight` returns an interpolated value at the model center while feet extend to terrain at a different height.
- Enemies use `+ 0.45` (lines 3391, 3398) — even lower offset than the player, making zombie clipping worse.
- The terrain mesh itself uses integer-grid heightmap values, but models sit at continuous positions between grid points. The `terrainHeight` function returns a noise-based value that may not match the actual rendered terrain mesh geometry exactly, causing a mismatch between where the ground visually appears and where the code thinks it is.

**Symptoms:**
- Player character's legs/feet clip below terrain surface
- Zombie models partially submerged, especially on hilly terrain
- Worse on slopes where terrain height varies across the model footprint

**Acceptance Criteria:**
- [ ] Increase ground offsets so model feet sit visibly on top of terrain (not inside it)
- [ ] Account for tier-based zombie scaling — bigger zombies need proportionally larger offsets
- [ ] Test on flat terrain, slopes, and plateau edges
- [ ] No models should ever appear to sink into the ground plane
- [ ] No models should appear to float visibly above the ground (over-correction)

**Estimated Scope:** Small (<50 lines — offset tuning, possibly per-tier zombie offset table)
**Dependencies:** None

---

### BD-50: Add collision for decorations (trees, rocks, fallen logs)
**Category:** Gameplay
**Priority:** P2-Medium
**File(s):** `js/game3d.js` (player movement ~line 2800-2850, enemy AI movement), `js/3d/terrain.js` (decoration generation ~lines 440-530)
**Description:**
All 5 decoration types (trees, rocks, fallen logs, mushroom clusters, stumps) are purely visual — they have no collision volumes. Player and zombie characters walk straight through them as if they don't exist. This breaks spatial immersion and makes the world feel hollow.

**Current State:**
Decorations are generated per-chunk in `terrain.js` (`generateChunk`) and stored as visual mesh groups. They have world positions but no collision data is tracked. The player movement code (game3d.js) only collides with terrain height and platforms — it has no concept of solid obstacles on the ground plane.

**Approach Options:**

**Option A — Simple radius collision (recommended):**
Store decoration positions + collision radii in a spatial lookup (per-chunk, matching the existing `decorationsByChunk` structure). During player/enemy movement, check against nearby decoration radii and push characters out of overlap. This is cheap and covers 90% of the visual feel.
```javascript
// Per decoration in chunk data:
{ x, z, radius }  // tree=0.8, rock=0.6, stump=0.5, log=1.2x0.4 (AABB), mushroom=0.3

// In movement update:
for (const dec of nearbyDecorations) {
  const dx = px - dec.x, dz = pz - dec.z;
  const dist = Math.sqrt(dx*dx + dz*dz);
  if (dist < dec.radius + playerRadius) {
    // Push player out
    const overlap = dec.radius + playerRadius - dist;
    px += (dx / dist) * overlap;
    pz += (dz / dist) * overlap;
  }
}
```

**Option B — Selective collision:**
Only make trees and rocks solid (large, obviously solid objects). Leave mushroom clusters and stumps passthrough — they're small enough that walking over them feels natural.

**Acceptance Criteria:**
- [ ] Player cannot walk through trees and rocks
- [ ] Zombies path around or bump against solid decorations
- [ ] Fallen logs block movement (or player can jump over them)
- [ ] Small decorations (mushrooms, stumps) are passthrough OR have tiny collision radii
- [ ] Decoration collision doesn't cause characters to get permanently stuck
- [ ] Performance: collision checks are chunk-scoped, not global (only check decorations in player's chunk + adjacent chunks)

**Estimated Scope:** Medium (50-200 lines — collision data tracking + movement integration for player + enemies)
**Dependencies:** None

---

### BD-51: Research — sound mapping patterns in survivor/roguelike games
**Category:** Research (developer-delivered)
**Priority:** P1-High
**Assignee:** Developer (human research)
**File(s):** `docs/research/sound-mapping-reference.md` (new, to be delivered)
**Description:**
The current sound mapping was built by guessing from file names. BD-48 established that this approach produced wrong-fit sounds, no volume balancing, and no event prioritization. Before we do a proper QA pass or record Sound Pack Beta, we need a **reference model** for how survivor/roguelike games handle audio.

**Research Questions:**
1. **Event priority tiers** — Which game events get loud/prominent sounds vs. quiet/subtle ones? In games like Vampire Survivors, Brotato, Halls of Torment, Soulstone Survivors — what's audible when 200 enemies are on screen?
2. **Frequency vs. volume** — How do these games handle sounds that fire many times per second (auto-attacks, XP pickups, projectile hits)? Do they throttle, duck, or use tiny quiet ticks?
3. **Sound categories** — What's the typical breakdown? (combat, UI, ambient, progression, feedback) What gets dedicated sounds vs. shared/pooled?
4. **Player feedback hierarchy** — What does the player NEED to hear (damage taken, level-up, death) vs. what's atmospheric decoration (zombie groans, footsteps)?
5. **Merge/combine audio** — Do any games with merge/evolution systems have tiered audio that escalates with the merge tier?
6. **Volume mixing ratios** — Any reference for relative volumes? (e.g., weapon fire at 30% master, level-up at 80%, ambient at 15%)
7. **Cooldown/throttling patterns** — What minimum intervals do games use for high-frequency sounds?
8. **Kid-friendly considerations** — Any patterns specific to games targeting younger audiences? Exaggerated feedback? Musical cues over realistic SFX?

**Deliverable:**
A markdown document at `docs/research/sound-mapping-reference.md` with findings from playing / researching 3-5 reference games. Can include links to YouTube gameplay videos with timestamps showing audio behavior. Does not need to be exhaustive — practical observations from actual gameplay are more valuable than theoretical frameworks.

**Why This Matters:**
This research directly feeds into BD-48 (audio overhaul). Without a reference model, we're just guessing at volume multipliers and cooldown intervals. The developer's direct experience with these games as a player is more valuable than any spec we could write from code alone.

**Estimated Scope:** Spec only (developer research, no code)
**Dependencies:** None (but BD-48 implementation should wait for this)

---

### BD-52: Remove difficulty select — single difficulty with emergent scaling
**Category:** Game Design
**Priority:** P1-High
**File(s):** `js/game.js` (difficulty select state machine ~lines 290-345), `js/game3d.js` (diffData usage ~lines 227-276, 390, wave scaling ~lines 1504-1532), `js/state.js` (DIFFICULTY_SETTINGS ~lines 138-143), `js/renderer.js` (difficulty select screen ~line 3051+), `js/3d/constants.js` (TOTEM_EFFECT)
**Description:**
The 3D mode currently has 4 pre-game difficulty levels (Chill/Easy/Medium/Hard) that set static multipliers for player HP, score, enemy speed, and powerup frequency at the start of a run. This front-loads a decision on kids who haven't played yet, adds a menu screen that delays getting into gameplay, and creates a balancing problem — we have to tune 4 parallel difficulty curves instead of 1.

**Design Intent:**
Replace with a **single unified difficulty** where challenge comes from two in-game systems that already exist but need to become the primary difficulty drivers:

1. **Difficulty shrines** (currently "totems") — destructible world objects the player chooses to break. Each one permanently increases zombie base stats for the rest of the run, plus boosts XP/score rewards. This is the **player-driven** difficulty lever — risk/reward, opt-in.

2. **Wave escalation** — successive waves already increase zombie count (`12 + wave * 6`) and HP (`baseHp * (1 + wave * 0.15)`). This becomes the **time-driven** difficulty lever — the game gets harder the longer you survive, no choice required.

Together these replace the 4-tier difficulty select: the game starts accessible (everyone plays the same starting conditions), then gets harder through natural progression (waves) and player choice (shrines).

**Current Systems to Modify:**

The wave system (game3d.js ~line 1504) already scales zombie count and HP per wave:
```javascript
const waveHp = Math.floor(baseHp * (1 + st.wave * 0.15));
const count = 12 + st.wave * 6;
```

The totem system (constants.js ~line 317) already scales zombie stats per totem destroyed:
```javascript
TOTEM_EFFECT = {
  zombieHpMult: 1.15,     // +15% zombie HP
  zombieSpeedMult: 1.10,  // +10% zombie speed
  spawnRateMult: 1.15,    // +15% spawn rate
  xpBonusMult: 1.25,      // +25% XP
  scoreBonusMult: 1.25,   // +25% score
}
```

Both already work. The change is removing the pre-game difficulty gate and making these the only difficulty sources.

**Changes Required:**

**1. Remove difficulty select screen (3D mode):**
- `game.js`: Skip the `difficulty` state — go straight from mode/animal select to game launch
- `game3d.js`: Remove `diffData` parameter from `launch3DGame()`, use fixed baseline values
- `renderer.js`: Remove or gate the difficulty select rendering (keep for 2D Classic mode if desired)
- `state.js`: DIFFICULTY_SETTINGS stays for 2D mode but is no longer used by 3D

**2. Set fixed 3D baseline stats:**
```javascript
// Replace diffData-driven values with fixed baseline:
hp: animalData.hp,           // was: animalData.hp * diffData.hpMult
scoreMult: 1.0,              // was: diffData.scoreMult
enemySpeedMult: 1.0,         // was: diffData.enemySpeedMult
powerupFreqMult: 1.0,        // was: diffData.powerupFreqMult
zombieDmgMult: 2,            // was: ternary based on hpMult
```

**3. Enhance wave escalation (the time-driven lever):**
Waves already scale zombie count and HP. Consider also scaling:
- Zombie base **damage** per wave (currently flat `zombieDmgMult` set at game start)
- Zombie base **speed** per wave (small increment, e.g. `+2%` per wave)
- Higher-tier zombie spawn probability per wave (already partially there — line 1514)

**4. Rename "totems" to "difficulty shrines" in UI:**
The totem system is already the player-driven difficulty lever. Rename to match the mental model — "DIFFICULTY SHRINE" instead of skull totem, so kids understand they're opting into harder gameplay.

**5. Leaderboard consolidation:**
With one difficulty, there's one leaderboard — no more per-difficulty separation. All scores are comparable.

**What About Chill Mode?**
Chill mode (0.7x enemy speed, 1.5x powerups, 1.5x HP, 0.5x score) could survive as an accessibility toggle in the pause menu or animal select screen — not a difficulty level, but a modifier. Or it could be removed entirely and replaced by "just don't break difficulty shrines" as the low-challenge path.

**Acceptance Criteria:**
- [ ] 3D mode has no difficulty select screen — player goes from animal select straight to gameplay
- [ ] All runs start with identical baseline stats (per animal)
- [ ] Wave system increases zombie HP, damage, speed, and count over time
- [ ] Difficulty shrines (totems) remain as opt-in difficulty boosts with reward multipliers
- [ ] Single leaderboard for 3D mode (no per-difficulty split)
- [ ] 2D Classic mode retains its difficulty select (separate game mode, separate design)
- [ ] Game feels accessible in early waves and challenging by wave 5+
- [ ] Score reflects both survival time and difficulty shrine count

**Estimated Scope:** Large (touches game.js flow, game3d.js init + wave system, renderer.js menus, state.js, constants.js, leaderboard logic)
**Dependencies:** None

---

### BD-53: Increase zombie spawn pressure and wave scaling
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`spawnAmbient` ~line 1481, `spawnWaveEvent` ~line 1504, ambient spawn timer ~line 3263)
**Description:**
After removing the difficulty select (BD-52), playtesting reveals the game lacks challenge. The core issue is zombie count — there simply aren't enough zombies on screen to create pressure, which also means the per-wave damage/speed scaling from BD-52 doesn't bite because encounters are too sparse.

**Current ambient spawn rates:**
- `spawnAmbient()` fires every **3 seconds**
- Spawns `Math.min(4, 1 + Math.floor(elapsedMin / 3))` zombies — starts at 1, caps at 4 after 9 minutes
- That's **1 zombie per 3 seconds** for the first 3 minutes. The map feels empty.

**Current wave event rates:**
- Wave events fire every **4 minutes** (240s timer)
- Wave 1 spawns `12 + 1*6 = 18` zombies. Decent burst, but 4 minutes apart.

**Proposed Changes:**

1. **Faster ambient spawns** — reduce timer from 3s to 2s:
   ```javascript
   st.ambientSpawnTimer = 2;  // was 3
   ```

2. **Higher ambient spawn count** — start at 2, scale faster, cap at 6:
   ```javascript
   const count = Math.min(6, 2 + Math.floor(elapsedMin / 2));
   ```
   This gives 2/2s = 1/sec at game start (vs 1/3s before), scaling to 6/2s = 3/sec by minute 8.

3. **First wave event sooner** — reduce initial wave timer from 240s (4min) to 150s (2.5min):
   ```javascript
   waveEventTimer: 150,  // was 240
   ```

4. **Faster subsequent waves** — reduce wave timer reset from 240s to 180s (3min):
   ```javascript
   st.waveEventTimer = 180;  // was 240
   ```

5. **More zombies per wave** — increase wave count formula:
   ```javascript
   const count = 18 + st.wave * 8;  // was 12 + st.wave * 6
   ```

**Net Effect:**
- Early game: ~60 zombies/min ambient (up from ~20). Map feels alive immediately.
- By minute 5: ~120 zombies/min ambient + first wave burst of 26 zombies. Constant pressure.
- By minute 10: ~180 zombies/min ambient + wave 3 burst of 42 zombies. Survival challenge.

**Acceptance Criteria:**
- [ ] Player feels pressure within the first 30 seconds of gameplay
- [ ] By minute 3-4, there should be 15-25 zombies visible on screen at any time
- [ ] Wave events feel like meaningful escalation spikes, not the only source of enemies
- [ ] Game still feels accessible for the first 1-2 minutes (zombies are present but not overwhelming)
- [ ] BD-52's per-wave damage/speed scaling is noticeable because there are enough zombies to demonstrate it

**Estimated Scope:** Small (<50 lines — timer/formula tuning)
**Dependencies:** BD-52 (baseline difficulty must be set first)

---

### BD-54: Add XP gems scattered across the map (non-respawning)
**Category:** Gameplay / Content
**Priority:** P1-High
**File(s):** `js/game3d.js` (new system: gem generation, rendering, pickup logic), `js/3d/constants.js` (gem constants)
**Description:**
Add small glowing purple rotating gems scattered across the map terrain. These are static collectibles (not dropped by enemies) that give 2-4 XP each when picked up. They do not respawn once collected. This gives players a reason to explore the map, provides steady XP income between combat, and adds visual richness to the terrain.

**Design:**
- **Appearance:** Small (~0.3 unit) purple/violet glowing gems. Slowly rotate on Y axis (~1 rev/2s). Subtle vertical bob (±0.1 units, sine wave). Emissive purple material so they glow against any background.
- **XP value:** 2-4 XP per gem (randomized on creation). Displayed as floating text on pickup.
- **Density:** ~3-5 gems per chunk. Generated as part of chunk loading (like decorations).
- **Persistence:** Once collected, gems are removed and don't respawn. Track collected gems per chunk key.
- **Pickup:** Auto-collected when player walks within `collectRadius` (same as XP gem drops from kills).

**Implementation Approach:**

1. **Chunk-based generation** — in the chunk loading system, generate gem positions using noise-seeded randomization (deterministic per chunk, so gems appear in the same spots if a chunk is reloaded):
   ```javascript
   // In chunk generation, after decorations:
   const gemCount = 3 + Math.floor(Math.random() * 3); // 3-5 per chunk
   for (let i = 0; i < gemCount; i++) {
     const gx = chunkX * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
     const gz = chunkZ * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
     const gy = terrainHeight(gx, gz) + 0.5;
     const xpValue = 2 + Math.floor(Math.random() * 3); // 2-4
     // Create small purple gem mesh, add to scene
   }
   ```

2. **Collection tracking** — `st.collectedGemChunks` object tracks which chunk+index gems have been collected:
   ```javascript
   st.collectedGemChunks = {}; // e.g., { "3,5": [0, 2, 4] }
   ```

3. **Pickup logic** — in the player update loop, check distance to nearby gems (same chunk + adjacent), collect within `collectRadius`, add XP, show floating text, play pickup sound, mark as collected.

4. **Unload/reload** — gems unload with their chunk. When a chunk reloads, skip gems whose indices are in `collectedGemChunks`.

**Acceptance Criteria:**
- [ ] Purple glowing gems visible scattered across terrain in every chunk
- [ ] Gems rotate and bob gently (visually appealing, easy to spot)
- [ ] Walking near a gem auto-collects it, awards 2-4 XP, shows "+X XP" floating text
- [ ] Collected gems don't reappear when chunk unloads and reloads
- [ ] Gem positions are deterministic per chunk (same spots every time the chunk loads)
- [ ] 3-5 gems per chunk provides steady exploration reward without feeling like XP farming
- [ ] Gems don't spawn inside decorations (trees, rocks) — offset check or minimum distance from decoration positions
- [ ] Performance: gem meshes are simple (single small box or octahedron), no impact on frame rate with 50+ loaded chunks

**Estimated Scope:** Medium (100-150 lines — generation, mesh creation, pickup logic, collection tracking, chunk load/unload integration)
**Dependencies:** None

---

### BD-55: Increase ambient item chest spawns
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (ambient crate timer ~line 3267, `createItemPickup` ~line 1357, wave item spawns ~line 1526)
**Description:**
During playtesting, zero items were encountered in a full session. The current item spawn system is too stingy — items only appear in two places:

1. **Wave events** — one item pickup every 2 waves (~8 minutes apart). First item appears at wave 2, which is 8+ minutes into a run.
2. **Level-up** — `createItemPickup` is called during level-up reward logic, but only when a specific upgrade option is rolled.

There are no ambient item spawns on the map. Powerup crates spawn every 30s, but these give temporary powerup buffs, not permanent items. A player can go 5-10 minutes without seeing a single item, which makes the 25-item system (with 4 rarity tiers) feel invisible.

**Proposed Changes:**

1. **Add ambient item chest timer** — new timer alongside `ambientCrateTimer`, spawning an item pickup every 45-60 seconds:
   ```javascript
   // In state init:
   ambientItemTimer: 45,

   // In game loop (alongside ambient crate spawn):
   st.ambientItemTimer -= dt;
   if (st.ambientItemTimer <= 0) {
     st.ambientItemTimer = 45 + Math.random() * 15; // 45-60s
     const ia = Math.random() * Math.PI * 2;
     const ix = st.playerX + Math.cos(ia) * 18;
     const iz = st.playerZ + Math.sin(ia) * 18;
     const pickup = createItemPickup(ix, iz);
     if (pickup) st.itemPickups.push(pickup);
   }
   ```

2. **First item sooner** — set initial `ambientItemTimer` to 20s so the player sees their first item within the first 30 seconds:
   ```javascript
   ambientItemTimer: 20,  // first item comes quick, then 45-60s cycle
   ```

3. **Wave items every wave** (not every 2 waves):
   ```javascript
   // Change from:
   if (st.wave % 2 === 0) { createItemPickup(...) }
   // To:
   const pickup = createItemPickup(ix, iz);
   if (pickup) st.itemPickups.push(pickup);
   ```

**Net Effect:**
- First item appears ~20s into the run (vs 8+ minutes before)
- Steady ~1 item per minute from ambient spawns
- Additional item per wave event (~every 3 minutes after BD-53)
- Players should collect 5-8 items in a 10-minute run (vs 0-1 before)
- The 4-tier rarity system actually becomes visible to players

**Acceptance Criteria:**
- [ ] Item pickups appear on the map within the first 30 seconds of a run
- [ ] Steady flow of ~1 item per minute from ambient spawns
- [ ] Wave events drop an item every wave (not every 2)
- [ ] Item variety is visible — common items appear often, rare/legendary items feel special
- [ ] Items don't pile up excessively if player ignores them (cap at ~8 uncollected item pickups on the map)
- [ ] Rarity-weighted distribution works correctly (player sees mostly common/uncommon, with occasional rare/legendary)

**Estimated Scope:** Small (<50 lines — new timer, loop integration, wave spawn change)
**Dependencies:** None

---

### BD-56: Show equipped items visually on player model
**Category:** Visual / Gameplay
**Priority:** P2-Medium
**File(s):** `js/3d/player-model.js` (new attachment system), `js/game3d.js` (item equip hooks, per-frame sync)
**Description:**
When players collect items, nothing changes visually on the character model. A player wearing Chainmail, Cowboy Boots, Aviator Glasses, Crit Gloves, and a Crown looks identical to a naked level-1 character. This makes item collection feel invisible — there's no visual payoff for finding gear, and no way to glance at your character and know what you have equipped.

Items should appear as small voxel attachments on the player model, built from the same `box()` primitives the models already use. This keeps the style consistent (chunky, blocky, kid-friendly) and avoids any need for external art assets.

**Attachment Points:**
The player model has well-defined body part positions that serve as natural anchor points for item visuals:

| Slot | Anchor Point | Y Position (approx) | Items |
|------|-------------|---------------------|-------|
| **Head** | Top of head | 1.75-1.85 | Crown of Claws, Bandana |
| **Face** | Front of head | 1.55, z+0.25 | Aviator Glasses |
| **Torso** | Chest/belly | 0.7-0.9 | Leather Armor, Chainmail, Thorned Vest, Rainbow Scarf |
| **Hands** | End of arms | 0.62 | Crit Gloves |
| **Feet** | Bottom of legs | 0.02-0.08 | Soccer Cleats, Cowboy Boots, Turbo Sneakers |
| **Waist/back** | Lower torso | 0.5-0.6 | Shield Bracelet (wrist glow), Rubber Ducky (clipped to belt) |
| **Neck** | Below head | 1.2-1.3 | Health Pendant, Lucky Charm |

**Visual Design Per Item (voxel box primitives):**

**Armor slot:**
- **Leather Armor** — brown chest plate: 2-3 tan/brown boxes layered over torso, slightly wider than body
- **Chainmail** — gray chest plate: silver/gray boxes with a grid pattern (alternating small boxes), wider shoulder pads

**Boots slot:**
- **Soccer Cleats** — green-tinted feet boxes replacing default foot color, small spike nubs underneath
- **Cowboy Boots** — brown boots extending up the calves (taller than default feet), slightly pointed toes
- **Turbo Sneakers** — bright cyan/green shoes with a small "wing" box on each side

**Face slot:**
- **Aviator Glasses** — two small dark-tinted boxes across the eyes with a thin bridge box between them

**Head slot:**
- **Crown of Claws** — 3-5 small golden pointed boxes in a ring on top of the head
- **Bandana** — flat red box wrapped around forehead (below ears)

**Hands slot:**
- **Crit Gloves** — pink/red boxes replacing default hand/paw color, slightly larger than bare hands

**Neck slot:**
- **Health Pendant** — small green box dangling below the chin
- **Lucky Charm** — small gold box on a thin chain below the chin

**Torso slot:**
- **Thorned Vest** — dark red chest overlay with small spike boxes protruding outward
- **Rainbow Scarf** — multicolored thin boxes draped from neck area, trailing behind

**Belt/misc:**
- **Rubber Ducky** — tiny yellow box clipped to the hip area (visible, funny)
- **Shield Bracelet** — small blue glow box on one wrist (toggles visibility with cooldown state)
- **Magnet Ring** — small silver torus-like box on one hand

**Stackable items** (visual feedback for stacks):
- **Thick Fur** — body gets slightly shaggier/thicker with each stack (scale torso boxes by 1 + 0.02 * stacks)
- Multiple **Bandanas** — stack vertically on forehead (1 = thin band, 3 = thick headband)
- Multiple **Rubber Duckies** — line up along the belt (max 3 visible, then just the count)

**Implementation Approach:**

1. **Add `updateItemVisuals(playerModel, items)` to `player-model.js`** — called whenever an item is equipped or removed. Creates/destroys attachment meshes on the player group.

2. **Item attachment registry** — a data structure mapping item IDs to attachment specs:
   ```javascript
   const ITEM_VISUALS = {
     leather: {
       anchor: 'torso',
       boxes: [
         { w: 0.75, h: 0.5, d: 0.48, color: 0xb08040, x: 0, y: 0.85, z: 0.02 },
         // shoulder straps
         { w: 0.15, h: 0.2, d: 0.15, color: 0x8a6030, x: -0.35, y: 1.05, z: 0 },
         { w: 0.15, h: 0.2, d: 0.15, color: 0x8a6030, x: 0.35, y: 1.05, z: 0 },
       ]
     },
     glasses: {
       anchor: 'head',
       boxes: [
         { w: 0.12, h: 0.06, d: 0.06, color: 0x222222, x: -0.14, y: 1.56, z: 0.26 },
         { w: 0.12, h: 0.06, d: 0.06, color: 0x222222, x: 0.14, y: 1.56, z: 0.26 },
         { w: 0.06, h: 0.03, d: 0.03, color: 0x444444, x: 0, y: 1.57, z: 0.27 }, // bridge
       ]
     },
     // ... etc for each visually-representable item
   };
   ```

3. **Attach meshes to player group** — item boxes are added as children of `playerModel.group` so they move, rotate, and animate with the character automatically. Store references in `playerModel.itemMeshes = {}` for cleanup.

4. **Per-frame sync not needed** — since meshes are children of the group, they inherit transforms. Only need to call `updateItemVisuals()` when `st.items` changes (on pickup).

5. **Animal-specific offsets** — each animal has slightly different proportions (lion is wider, red panda is smaller). The ITEM_VISUALS positions are baselined to the leopard. Add a per-animal offset table for head Y, torso width, foot position, etc.:
   ```javascript
   const ANIMAL_OFFSETS = {
     leopard: { headY: 0, torsoScale: 1.0 },
     redPanda: { headY: -0.02, torsoScale: 0.93 },
     lion: { headY: 0.05, torsoScale: 1.1 },
     gator: { headY: 0.03, torsoScale: 1.05 },
   };
   ```

6. **Priority items** — not all 25 items need visuals immediately. Start with the most recognizable:
   - **Phase 1 (must-have):** armor (leather/chainmail), boots (cleats/cowboy/turbo), glasses, crown, gloves, bandana
   - **Phase 2 (nice-to-have):** vest, scarf, pendant, charm, bracelet, rubber ducky
   - **Phase 3 (stretch):** stackable visual scaling, remaining items

**Acceptance Criteria:**
- [ ] Equipping armor visibly changes the player's torso (leather = brown plates, chainmail = gray plates)
- [ ] Equipping boots visibly changes foot appearance (cleats = green, cowboy = tall brown, turbo = cyan with wings)
- [ ] Aviator Glasses appear across the character's eyes
- [ ] Crown of Claws appears on top of the head
- [ ] Crit Gloves change hand color/size
- [ ] Item visuals persist through walk/attack animations (they're children of the group)
- [ ] Item visuals are removed if an item is replaced (e.g., leather → chainmail swaps the torso overlay)
- [ ] Visuals work for all 4 animal types with appropriate offsets
- [ ] No performance regression — item meshes are simple boxes (3-5 boxes per item max)
- [ ] Items that don't have visuals yet (phase 2/3) don't break anything — graceful no-op

**Estimated Scope:** Large (200+ lines — visual registry, attachment system, per-animal offsets, ~10-12 items in phase 1)
**Dependencies:** None (but benefits from BD-55 landing first so players actually find items to see on their model)

---

### BD-57: Fix muscle growth making models into featureless blocks at high levels
**Category:** Bug Fix / Visual
**Priority:** P1-High
**File(s):** `js/3d/player-model.js` (`updateMuscleGrowth` ~line 457, `buildPlayerModel` muscles object)
**Screenshot:** `screenshots/Screenshot from 2026-02-22 22-19-57.png` (LVL 7), `screenshots/Screenshot from 2026-02-22 22-49-45.png` (LVL 11)
**Description:**
The `updateMuscleGrowth()` function scales only 7 "muscle" parts (chest, bicepL/R, shoulderL/R, thighL/R) uniformly at `1 + (level-1) * 0.08`. Non-muscle parts — head, ears, tail, hands/paws, feet, lower arms, lower legs, and animal-specific features (spots, mane, snout) — are **never scaled**. By level 7 (scale 1.48) the torso/shoulders/thighs are nearly 50% larger while limbs remain original size, making the model look like a blob with tiny stubs. By level 11 (scale 1.80) the model is an almost featureless block — the intended "muscular animal" silhouette is lost entirely.

**Root Cause:**
1. Only 7 parts are in the `muscles` object. The remaining ~15-20 body parts (per animal) are added directly to the group but not tracked for scaling.
2. All 7 muscle parts scale identically on all three axes (`scale.set(s, s, s)`), which makes the chest grow equally tall and wide — producing a cube rather than a wider, buffer torso.
3. Growth rate of 0.08/level is too aggressive for uniform scaling. At level 15 the chest is 2.12x original size.

**Proposed Fix:**
1. **Track all body parts** in the model return object — split into tiers:
   - `muscles` (chest, shoulders, thighs) — primary growth, emphasize X/Z (width) over Y (height)
   - `limbs` (biceps, lower arms, lower legs, feet) — secondary growth at ~60% rate
   - `features` (head, ears, tail, snout, mane, spots) — minimal growth at ~30% rate

2. **Use non-uniform scaling** for a "muscular" look:
   ```javascript
   // Muscles: wider and deeper, less tall
   muscles[key].scale.set(muscleScale, muscleScale * 0.7, muscleScale);
   // Limbs: proportional but slower
   const limbScale = 1 + (level - 1) * 0.05;
   limbs[key].scale.set(limbScale, limbScale, limbScale);
   // Features: subtle growth to keep proportions
   const featureScale = 1 + (level - 1) * 0.025;
   features[key].scale.set(featureScale, featureScale, featureScale);
   ```

3. **Reduce base growth rate** — 0.08 is too aggressive. Try 0.05 for muscles, 0.03 for limbs, 0.015 for features. At level 15: muscles 1.7x, limbs 1.42x, features 1.21x.

4. **Cap maximum scale** — add `Math.min(1.8, ...)` so models don't grow indefinitely at very high levels.

**Acceptance Criteria:**
- [ ] At level 10, the player model is visibly larger/buffer but retains recognizable animal features (ears, tail, limb proportions, head shape)
- [ ] Arms and legs scale proportionally with the torso (no tiny stubs on a block body)
- [ ] Head and facial features (ears, snout) grow subtly so they don't disappear into the torso
- [ ] The silhouette at level 15+ reads as "buff animal" not "featureless cube"
- [ ] Growth is capped at a reasonable maximum (e.g., 1.8x for muscles, 1.5x for limbs)
- [ ] Works for all 4 animal types (leopard, redPanda, lion, gator) — each has different proportions
- [ ] Walk/attack animations still look correct at high scale (no limbs clipping through torso)

**Estimated Scope:** Small-Medium (~50-80 lines — refactor muscle tracking in buildPlayerModel + rewrite updateMuscleGrowth)
**Dependencies:** None

---

### BD-58: Restore 2D mode access from title screen (mode select)
**Category:** UX / Game Flow
**Priority:** P1-High
**File(s):** `js/game.js` (title state handler ~lines 264-274, modeSelect handler ~lines 278-301), `js/renderer.js` (title screen rendering, mode select rendering)
**Description:**
BD-52 removed the difficulty select screen for 3D mode, but the implementation also bypassed the mode select screen entirely. The title screen now sends Enter directly to animal select with `selectedMode = 1` (3D Survivor) hardcoded at line 268. The `modeSelect` state handler still exists (lines 278-301) but is unreachable — the title state jumps straight to `select`.

This means the historic 2D Classic mode is completely inaccessible. Players who want the 2D experience have no way to reach it.

**Current flow (broken):**
```
Title ──[Enter]──> select (3D forced, mode select + difficulty skipped)
```

**Desired flow:**
```
Title ──[Enter]──> modeSelect ──[2D]──> difficulty ──> select ──> 2D gameplay
                              ──[3D]──> select ──> 3D gameplay (no difficulty)
```

**Changes Required:**

1. **Title screen** (`game.js` ~line 264-274): Change Enter to go to `modeSelect` instead of directly to `select`:
   ```javascript
   if (state.gameState === 'title') {
     if (keys['Enter'] && !state._enterHeld) {
       state._enterHeld = true;
       state.selectedMode = 1; // Default to 3D
       state.gameState = 'modeSelect';
     }
     if (!keys['Enter']) state._enterHeld = false;
     return;
   }
   ```

2. **Mode select** (`game.js` ~line 289-294): Branch based on selected mode:
   ```javascript
   if (keys['Enter'] && !state._enterHeld) {
     state._enterHeld = true;
     if (state.selectedMode === 0) {
       // 2D Classic: go through difficulty select
       state.selectedDifficulty = 0;
       state.gameState = 'difficulty';
     } else {
       // 3D Survivor: skip difficulty, go to animal select
       state.selectedAnimal = 0;
       state.gameState = 'select';
     }
   }
   ```

3. **Difficulty back button** (`game.js` ~line 325): Go back to `modeSelect` instead of `title`:
   ```javascript
   state.gameState = 'modeSelect'; // was 'title'
   ```

4. **Renderer**: Ensure `drawModeSelectScreen()` still renders correctly (it should — the state handler and rendering code were preserved, just bypassed).

**Acceptance Criteria:**
- [ ] Title screen → Enter → mode select screen shows "2D Classic" and "3D Survivor" options
- [ ] Selecting 2D Classic → difficulty select → animal select → 2D gameplay (existing flow)
- [ ] Selecting 3D Survivor → animal select → 3D gameplay (no difficulty screen, per BD-52)
- [ ] Arrow keys switch between modes on mode select
- [ ] Escape on mode select returns to title
- [ ] Escape on difficulty select (2D path) returns to mode select
- [ ] Both modes work end-to-end after selection

**Estimated Scope:** Small (<50 lines — reconnect existing state handlers, add mode-based branching)
**Dependencies:** None (BD-52 is already landed)

---

### BD-59: Increase ambient zombie spawn count by 35%
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`spawnAmbient` ~line 1482, ambient spawn timer reset ~line 3265)
**Description:**
After BD-53 increased spawn pressure (timer 3s→2s, count formula `min(6, 2 + elapsedMin/2)`), playtesting shows the base rate of ambient zombies is still too low to create sustained pressure. The map feels underpopulated between wave events. A 35% increase to the ambient spawn count brings the "always something to fight" density that survivor games need.

**Current values (post BD-53):**
- Timer: 2s (keep)
- Count: `Math.min(6, 2 + Math.floor(elapsedMin / 2))`
  - Minute 0: 2 zombies/2s = 1/sec
  - Minute 4: 4 zombies/2s = 2/sec
  - Minute 8+: 6 zombies/2s = 3/sec (cap)

**Proposed values (+35%):**
- Timer: 2s (keep — faster timer would change too many things)
- Count: `Math.min(8, 3 + Math.floor(elapsedMin / 2))`
  - Minute 0: 3 zombies/2s = 1.5/sec (+50% early game)
  - Minute 4: 5 zombies/2s = 2.5/sec (+25% mid game)
  - Minute 8+: 8 zombies/2s = 4/sec (cap raised from 6 to 8)

```javascript
// spawnAmbient():
const count = Math.min(8, 3 + Math.floor(elapsedMin / 2));  // was Math.min(6, 2 + ...)
```

**Acceptance Criteria:**
- [ ] 2-3 zombies visible within 5 seconds of game start
- [ ] By minute 3, at least 20 zombies on screen during ambient play (no wave)
- [ ] Cap of 8 per spawn burst (not 6)
- [ ] Game still feels accessible in first 30 seconds — more zombies but not overwhelming at tier 1

**Estimated Scope:** Small (<10 lines — formula change)
**Dependencies:** BD-53 (base values to modify)

---

### BD-60: Double wave event zombie count for impactful waves
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`spawnWaveEvent` ~line 1508)
**Description:**
Wave events should feel like a genuine crisis — a spike that forces the player to change behavior, use power attacks, and move strategically. Currently post-BD-53, waves spawn `18 + wave * 8` zombies. By wave 3 that's 42 zombies, which blends in with the ambient stream and doesn't feel like a distinct threat. Doubling the wave count creates the "oh no" moment.

**Current values (post BD-53):**
- Wave 1: `18 + 1*8 = 26` zombies
- Wave 3: `18 + 3*8 = 42` zombies
- Wave 5: `18 + 5*8 = 58` zombies

**Proposed values (2x):**
- Wave 1: `36 + 1*16 = 52` zombies
- Wave 3: `36 + 3*16 = 84` zombies
- Wave 5: `36 + 5*16 = 116` zombies

```javascript
// spawnWaveEvent():
const count = 36 + st.wave * 16;  // was 18 + st.wave * 8
```

With 84 zombies spawning in a ring at wave 3, the player is immediately surrounded. This creates real urgency — especially combined with the wave damage/speed escalation from BD-52.

**Acceptance Criteria:**
- [ ] Wave events are visually distinct from ambient spawning — a sudden ring of 50+ zombies appears
- [ ] Player feels genuine danger during wave 2+ (can't just stand still and auto-attack)
- [ ] Power attacks and movement become essential during waves (reward for charging mechanic)
- [ ] The wave warning countdown (10s) feels appropriate — player has time to prepare
- [ ] Frame rate remains playable with 100+ enemies on screen (monitor for performance ceiling)

**Estimated Scope:** Small (<10 lines — formula change)
**Dependencies:** BD-53 (base values to modify)

---

### BD-61: Increase zombie merge collision radius by 20%
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (zombie-zombie collision ~line 3508, `ZOMBIE_RADIUS` constant)
**Description:**
The zombie merge system is one of the game's most interesting mechanics — same-tier zombies absorb each other and eventually combine into higher-tier threats. But with the current collision radius (`ZOMBIE_RADIUS = 0.5`), merges require zombies to be nearly on top of each other. In practice, zombies pathing toward the player rarely bunch up tightly enough for merges to happen organically. Increasing the merge detection radius by 20% encourages more frequent combining, making the tier system more visible and the late-game more threatening.

**Current value:**
```javascript
const ZOMBIE_RADIUS = 0.5;
const minDist = ZOMBIE_RADIUS * (aScale + bScale);
// For two tier-1 zombies (scale 1.0): minDist = 0.5 * 2.0 = 1.0 units
```

**Proposed value (+20%):**
```javascript
const ZOMBIE_RADIUS = 0.6;
// For two tier-1 zombies: minDist = 0.6 * 2.0 = 1.2 units
// For two tier-2 zombies (scale 1.15): minDist = 0.6 * 2.3 = 1.38 units
```

This wider radius also benefits higher-tier merges (tier 2→3, 3→4) which are even rarer because higher-tier zombies are fewer in number and further apart.

**Acceptance Criteria:**
- [ ] Tier-2 (Lurcher) zombies appear regularly by minute 3-4 (currently rare)
- [ ] Tier-3 (Bruiser) zombies start appearing by minute 6-8 in longer runs
- [ ] Merge events feel organic — zombies walking near each other naturally trigger combines
- [ ] Push-apart behavior for different-tier zombies still works (they don't overlap permanently)
- [ ] Merge bounce animation + floating text ("LURCHER!") fires noticeably more often

**Estimated Scope:** Small (<10 lines — constant change)
**Dependencies:** None

---

### BD-62: Add charge shrines with tiered stat upgrade choices
**Category:** Gameplay / Content
**Priority:** P1-High
**File(s):** `js/3d/constants.js` (new `CHARGE_SHRINE_UPGRADES`), `js/game3d.js` (shrine generation, charge interaction, upgrade menu, HUD indicator)
**Description:**
The game is missing a key exploration/risk mechanic: **charge shrines** — prominent world structures that require the player to stand still and "charge" them (hold position for several seconds), during which they're vulnerable to incoming zombies. Once charged, the shrine presents a choice of stat upgrades organized into the game's existing 4-tier rarity system. This forces players to clear an area, commit to staying put, and rewards exploration and tactical play.

**Design:**

**Visual — Prominent landmark:**
Charge shrines should be large and visible from a distance — at least 2-3x the size of existing augment shrines. Design: a wide stone platform (2x2 base) with a tall crystalline pillar (3-4 units tall) that glows with rarity-tier coloring. A visible "charge ring" on the ground around the shrine (radius ~3 units) shows the interaction zone. Idle animation: slow pulsing glow + floating rune particles.

**Charge mechanic:**
- Player enters the 3-unit radius → charge progress bar appears in HUD (similar to power attack charge bar)
- Player must remain in radius for **4 seconds** to fully charge
- Leaving the radius resets progress (no partial credit)
- While charging, the shrine pulses faster and brighter
- Zombies continue spawning and approaching — the player must survive the charge duration
- On completion: shrine activates, presents upgrade choice menu (pause-like overlay), shrine becomes inert (one-time use)

**Upgrade choices (4-tier rarity):**
Each shrine rolls a rarity tier and offers 3 random upgrades from that tier's pool. Higher tiers offer stronger upgrades.

```javascript
const CHARGE_SHRINE_UPGRADES = {
  common: [
    { id: 'hp5',       name: '+5 Max HP',         color: '#44ff44', apply: s => { s.maxHp += 5; s.hp = Math.min(s.hp + 5, s.maxHp); } },
    { id: 'speed3',    name: '+3% Move Speed',     color: '#ffaa44', apply: s => { s.playerSpeed *= 1.03; } },
    { id: 'atk3',      name: '+3% Attack Speed',   color: '#ff44ff', apply: s => { s.attackSpeed *= 1.03; } },
    { id: 'dmg3',      name: '+3% Damage',          color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.03; } },
    { id: 'regen03',   name: '+0.3 HP/s Regen',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.3; } },
    { id: 'pickup5',   name: '+5% Pickup Radius',  color: '#ffff44', apply: s => { s.collectRadius *= 1.05; } },
  ],
  uncommon: [
    { id: 'hp12',      name: '+12 Max HP',         color: '#44ff44', apply: s => { s.maxHp += 12; s.hp = Math.min(s.hp + 12, s.maxHp); } },
    { id: 'speed6',    name: '+6% Move Speed',     color: '#ffaa44', apply: s => { s.playerSpeed *= 1.06; } },
    { id: 'atk6',      name: '+6% Attack Speed',   color: '#ff44ff', apply: s => { s.attackSpeed *= 1.06; } },
    { id: 'dmg6',      name: '+6% Damage',          color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.06; } },
    { id: 'regen07',   name: '+0.7 HP/s Regen',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.7; } },
    { id: 'armor3',    name: '+3% Armor',           color: '#aaaacc', apply: s => { s.augmentArmor = (s.augmentArmor || 0) + 0.03; } },
  ],
  rare: [
    { id: 'hp25',      name: '+25 Max HP',         color: '#44ff44', apply: s => { s.maxHp += 25; s.hp = Math.min(s.hp + 25, s.maxHp); } },
    { id: 'speed10',   name: '+10% Move Speed',    color: '#ffaa44', apply: s => { s.playerSpeed *= 1.10; } },
    { id: 'atk10',     name: '+10% Attack Speed',  color: '#ff44ff', apply: s => { s.attackSpeed *= 1.10; } },
    { id: 'dmg10',     name: '+10% Damage',         color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.10; } },
    { id: 'regen12',   name: '+1.2 HP/s Regen',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 1.2; } },
    { id: 'xp10',      name: '+10% XP Gain',       color: '#44aaff', apply: s => { s.augmentXpMult = (s.augmentXpMult || 1) * 1.10; } },
  ],
  legendary: [
    { id: 'hp50',      name: '+50 Max HP',         color: '#44ff44', apply: s => { s.maxHp += 50; s.hp = Math.min(s.hp + 50, s.maxHp); } },
    { id: 'speed15',   name: '+15% Move Speed',    color: '#ffaa44', apply: s => { s.playerSpeed *= 1.15; } },
    { id: 'dmg15',     name: '+15% Damage',         color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.15; } },
    { id: 'regen2',    name: '+2.0 HP/s Regen',    color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 2.0; } },
    { id: 'fullheal',  name: 'Full Heal',           color: '#ffffff', apply: s => { s.hp = s.maxHp; } },
    { id: 'allstats5', name: '+5% All Stats',       color: '#ffcc00', apply: s => { s.playerSpeed *= 1.05; s.attackSpeed *= 1.05; s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.05; s.maxHp = Math.floor(s.maxHp * 1.05); } },
  ],
};
```

**Rarity distribution for 10-15 shrines per map:**
- Common: ~50% (5-8 shrines)
- Uncommon: ~28% (3-4 shrines)
- Rare: ~16% (1-3 shrines)
- Legendary: ~6% (0-1 shrines)

Uses the same weight system as `ITEM_RARITIES`.

**Generation:**
- 10-15 charge shrines placed at game start (like existing shrines/totems)
- Spread across the `ARENA_SIZE` area, minimum 20 units apart from each other
- Each shrine rolls its rarity tier on creation (weighted random)
- The 3 upgrade choices are rolled when the player completes the charge (not on creation)

**State tracking:**
```javascript
// In st (state init):
chargeShrines: [],       // Array of charge shrine objects
chargeShrineCurrent: null, // Shrine currently being charged (or null)
chargeShrineProgress: 0,   // 0-4 seconds of charge progress
chargeShrineMenu: false,   // true = showing upgrade choice overlay
chargeShrineChoices: [],   // 3 upgrade options rolled on charge complete
selectedChargeUpgrade: 0,  // cursor index in choice menu
```

**HUD elements:**
- Charge progress bar: appears when player is in shrine radius, similar style to power attack charge bar but with shrine's rarity color
- "STAY IN RANGE" text below the bar
- On completion: upgrade choice overlay (3 cards, arrow key + Enter selection — same pattern as level-up menu)

**Acceptance Criteria:**
- [ ] 10-15 charge shrines visible on the map at game start, spread across the arena
- [ ] Shrines are large and visible from a distance (taller than trees, glowing pillar)
- [ ] Each shrine shows its rarity tier via glow color (white/green/blue/gold matching `ITEM_RARITIES`)
- [ ] Walking into shrine radius (3 units) starts a 4-second charge timer with HUD progress bar
- [ ] Leaving the radius resets the charge progress (forces commitment)
- [ ] Zombies continue attacking during charge — player must defend their position
- [ ] On charge complete: upgrade choice menu appears with 3 random upgrades from the shrine's tier
- [ ] Upgrades apply immediately on selection, shrine becomes inert (broken/dark visual)
- [ ] Rarity distribution is weighted: mostly common, some uncommon, few rare, very rare legendary
- [ ] Legendary shrines feel special — gold glow, larger model, bigger upgrade values
- [ ] Charged shrines cannot be charged again (one-time use)

**Estimated Scope:** Large (200+ lines — constants, shrine mesh, charge logic, HUD progress bar, upgrade choice menu, state tracking)
**Dependencies:** None

---

### BD-63: Fix arms disappearing at high levels — full-body proportional scaling
**Category:** Bug Fix / Visual
**Priority:** P0-Critical
**File(s):** `js/3d/player-model.js` (`updateMuscleGrowth` ~line 464, `buildPlayerModel` ~lines 60-334)
**Description:**
BD-57 introduced 3-tier scaling (muscles/limbs/tail), but playtesting at level 7+ shows **arms still become invisible** and the model looks "fat not strong." Per our 7-year-old creative director: the model must look **"jacked"**, not bloated.

**Root Cause Analysis:**
The `buildPlayerModel()` function returns:
```javascript
{ group, legs, arms, tail, muscles, wingGroup, wingMeshes }
```
Where `muscles = { chest, bicepL, bicepR, shoulderL, shoulderR, thighL, thighR }` and `arms = [leftArm, rightArm]`.

The problem is that **arms are groups containing multiple sub-meshes** (bicep box, forearm box, hand/paw box), but `updateMuscleGrowth()` scales the arm group AND separately scales the bicep muscle mesh. When `muscles.bicepL.scale.set(muscleGrowth, ...)` runs AFTER `arm.scale.set(limbGrowth, ...)`, the bicep — which is a child of the arm group — gets **double-scaled** (group scale * mesh scale). Meanwhile, parts NOT tracked in any array (forearms, hands/paws, head, ears, snout, spots, mane) **never scale at all**, disappearing into the growing torso.

**What's Missing from Scaling:**
- **Head** (including ears, snout, muzzle, eye sockets) — never scaled
- **Forearms / lower arms** — only biceps scale, forearms stay original size
- **Hands / paws** — never scaled, become invisible stubs
- **Feet / lower legs** — only thighs scale via muscles, lower legs stay original
- **Animal-specific features** — spots (leopard), mane (lion), crest (gator) — never scaled
- **Neck** — never scaled

**Proposed Fix:**
1. **Track ALL body parts** in `buildPlayerModel()` — extend the return object:
   ```javascript
   return {
     group, legs, arms, tail, muscles,
     head,           // head group (head box + ears + snout + eyes)
     forearms,       // [leftForearm, rightForearm]
     hands,          // [leftHand, rightHand]
     lowerLegs,      // [leftShin, rightShin]
     feet,           // [leftFoot, rightFoot]
     features,       // { spots, mane, crest, etc. } — animal-specific
   };
   ```

2. **Rewrite `updateMuscleGrowth()` with 5 tiers:**
   ```javascript
   export function updateMuscleGrowth(model, level) {
     const t = level - 1;
     // Tier 1: Core muscles — widest growth, non-uniform (wider > taller)
     const mS = Math.min(1.8, 1 + t * 0.05);
     for (const k in model.muscles) {
       if (model.muscles[k]) model.muscles[k].scale.set(mS, mS * 0.7, mS);
     }
     // Tier 2: Limbs (full arm/leg groups) — proportional, moderate
     const lS = Math.min(1.5, 1 + t * 0.035);
     for (const arr of [model.arms, model.legs]) {
       if (arr) for (const part of arr) {
         if (part) part.scale.set(lS, lS, lS);
       }
     }
     // DO NOT separately scale biceps/thighs — they're children of arm/leg groups
     // Tier 3: Extremities (hands, feet, forearms, lower legs) — subtle
     const eS = Math.min(1.4, 1 + t * 0.025);
     for (const arr of [model.forearms, model.hands, model.lowerLegs, model.feet]) {
       if (arr) for (const part of arr) {
         if (part) part.scale.set(eS, eS, eS);
       }
     }
     // Tier 4: Head — minimal growth to maintain proportions
     const hS = Math.min(1.25, 1 + t * 0.015);
     if (model.head) model.head.scale.set(hS, hS, hS);
     // Tier 5: Cosmetic (tail, features) — very subtle
     const fS = Math.min(1.2, 1 + t * 0.01);
     if (model.tail) model.tail.scale.set(fS, fS, fS);
     if (model.features) {
       for (const k in model.features) {
         if (model.features[k]) model.features[k].scale.set(fS, fS, fS);
       }
     }
   }
   ```

3. **Remove double-scaling** — don't scale muscle parts individually if they're children of arm/leg groups. The group scaling handles them.

4. **Test at levels 1, 5, 10, 15, 20** — the model should look progressively more jacked without losing recognizable features.

**Acceptance Criteria:**
- [ ] At level 10+, arms and legs are visibly larger — not invisible stubs
- [ ] Hands/paws remain visible at all levels
- [ ] Head, ears, and facial features remain proportional and recognizable
- [ ] The model reads as "jacked" / muscular, not fat or blobby
- [ ] All 4 animal types scale correctly (leopard, redPanda, lion, gator)
- [ ] Animal-specific features (spots, mane, crest) scale subtly with the body
- [ ] Walk/attack animations still look correct at high muscle scale
- [ ] No body parts clip through each other at max growth

**Estimated Scope:** Medium (~100-150 lines — refactor buildPlayerModel return + rewrite updateMuscleGrowth)
**Dependencies:** BD-57 (current broken fix to improve upon)

---

### BD-64: Increase charge shrine count to 20-25 for denser exploration
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/3d/constants.js` (`CHARGE_SHRINE_COUNT` line 359)
**Description:**
Playtesting revealed there aren't enough "NOT HARD ENOUGH" totems (charge shrines) on the map. Currently `CHARGE_SHRINE_COUNT = 12`, which spreads them too thin across the 256×256 arena. Players don't encounter shrines frequently enough to make charging a core loop.

**Proposed Change:**
```javascript
export const CHARGE_SHRINE_COUNT = 22;  // was 12
```

With 22 shrines across 65,536 sq units, average density is ~1 per 2,979 sq units (~55 unit spacing). This means a player exploring in any direction should find a shrine within ~25-30 units of travel — frequent enough to be a regular decision point.

**Acceptance Criteria:**
- [ ] 20-25 charge shrines visible across the map at game start
- [ ] Player encounters a shrine within the first 30 seconds of exploration
- [ ] Shrines feel like a constant choice ("do I stop to charge this one?") not a rare discovery
- [ ] Minimum spacing between shrines still prevents clustering (existing 20-unit minimum)
- [ ] Rarity distribution still holds (mostly common, some uncommon, few rare, very rare legendary)

**Estimated Scope:** Small (<10 lines — constant change)
**Dependencies:** BD-62 (charge shrine system must exist)

---

### BD-65: Increase base zombie spawn rate by 15%
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`spawnAmbient` ~line 1747)
**Description:**
After BD-53 and BD-59 tuned ambient spawns to `Math.min(8, 3 + Math.floor(elapsedMin / 2))`, the base rate still feels too low. A 15% increase to the spawn count formula provides more constant pressure.

**Current formula:**
```javascript
const count = Math.min(8, 3 + Math.floor(elapsedMin / 2));
// Min 0: 3, Min 2: 4, Min 4: 5, Min 6: 6, Min 8: 7, Min 10+: 8
```

**Proposed formula (+15%, rounded to clean numbers):**
```javascript
const count = Math.min(9, 4 + Math.floor(elapsedMin / 2));
// Min 0: 4, Min 2: 5, Min 4: 6, Min 6: 7, Min 8: 8, Min 10+: 9
```

This raises the floor from 3→4 zombies per spawn tick and the cap from 8→9. With a 2s spawn timer, that's 2/sec at game start (vs 1.5) and 4.5/sec at cap (vs 4).

**Acceptance Criteria:**
- [ ] Noticeable increase in zombie density from game start
- [ ] 3-4 zombies visible within 5 seconds of spawning
- [ ] By minute 5, constant stream of enemies without any "empty" moments
- [ ] Game still launches without lag at higher spawn rates

**Estimated Scope:** Small (<10 lines — formula tweak)
**Dependencies:** BD-59 (current values to modify)

---

### BD-66: Halve starting HP for all animals (reduce tankiness)
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/state.js` (animal definitions ~lines 153-156), `js/game3d.js` (HP init ~line 257)
**Description:**
Playtesting shows the player is too tanky — surviving for extended periods without feeling threatened by zombie damage. The current animal base HP values are:

| Animal | Current HP | Proposed HP |
|--------|-----------|-------------|
| Leopard | 100 | 50 |
| Red Panda | 80 | 40 |
| Lion | 120 | 60 |
| Gator | 150 | 75 |

**Alternative approach (if halving HP is inelegant):**
Instead of halving HP, double the zombie base damage multiplier from `zombieDmgMult: 2` to `zombieDmgMult: 4` in `game3d.js` line 274. This achieves the same effective tankiness reduction without touching base HP values that might be referenced elsewhere (item healing, charge shrine HP upgrades, max HP scaling).

**Recommended approach:** Halve the HP in `state.js`. It's the cleaner change — HP values are only used at game init and the numbers are more intuitive for future balancing. All HP-related upgrades (charge shrine +HP, items, regen) remain proportionally meaningful.

```javascript
// state.js animal definitions:
{ id: 'leopard', name: 'LEOPARD', hp: 50, ... },   // was 100
{ id: 'redPanda', name: 'RED PANDA', hp: 40, ... }, // was 80
{ id: 'lion', name: 'LION', hp: 60, ... },           // was 120
{ id: 'gator', name: 'GATOR', hp: 75, ... },         // was 150
```

**Acceptance Criteria:**
- [ ] All animals start with half their previous HP
- [ ] Player feels genuinely threatened by groups of 3+ zombies
- [ ] Death occurs within 2-3 minutes for new/unskilled players (not 8-10 minutes)
- [ ] HP upgrades from shrines and items feel impactful (adding 5-12 HP to a 50HP pool is meaningful)
- [ ] HP bar in HUD still renders correctly at lower values
- [ ] Regen and healing items are proportionally valuable

**Estimated Scope:** Small (<10 lines — value changes in state.js)
**Dependencies:** None

---

### BD-67: Progressive high-tier zombie spawning by wave (primary difficulty driver)
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`spawnAmbient` ~line 1747, `spawnWaveEvent` ~line 1769)
**Description:**
Currently ambient spawns are **always tier 1** and wave spawns use `Math.random() < 0.1 * wave ? min(wave, 3) : 1` for higher tiers. This means the only source of higher-tier zombies is wave events + merging. The game lacks a predictable difficulty curve where **the composition of the zombie population shifts from small to large over time**.

**Design Intent:**
High-tier zombie spawning should be a **primary driver of difficulty and game feel**. As the game progresses:
- Wave 0: 100% tier 1 (pure fodder)
- Wave 1: 97% tier 1, 3% tier 2
- Wave 2: 94% tier 1, 5% tier 2, 1% tier 3
- Wave 3: 88% tier 1, 8% tier 2, 3% tier 3, 1% tier 4
- Wave 4: 82% tier 1, 10% tier 2, 5% tier 3, 2% tier 4, 1% tier 5
- Wave 5+: Continues scaling — small zombies never fully disappear but their percentage falls predictably

**This applies to BOTH ambient AND wave spawns.** Currently ambient is always tier 1, which means the "feel" of the game doesn't change between waves — the constant stream of tier 1 fodder dominates the experience.

**Proposed Implementation:**

```javascript
// Tier selection function used by both ambient and wave spawns:
function rollZombieTier() {
  const w = st.wave;
  if (w === 0) return 1;
  // Each wave adds probability for higher tiers
  const roll = Math.random() * 100;
  // Tier 5+: 0% at wave 1, +1% per wave from wave 4
  if (w >= 4 && roll < (w - 3) * 1) return Math.min(w, 5);
  // Tier 4: 0% at wave 1, +1% per wave from wave 3
  if (w >= 3 && roll < (w - 2) * 1.5) return 4;
  // Tier 3: 0% at wave 1, +1.5% per wave from wave 2
  if (w >= 2 && roll < (w - 1) * 2) return 3;
  // Tier 2: 3% at wave 1, +3% per wave
  if (roll < w * 3) return 2;
  // Default: tier 1
  return 1;
}
```

**Apply to ambient spawns** (currently hardcoded `createEnemy(sx, sz, baseHp, 1)`):
```javascript
const tier = rollZombieTier();
st.enemies.push(createEnemy(sx, sz, baseHp * tier, tier));
```

**Apply to wave spawns** (replace existing tier logic):
```javascript
const tier = rollZombieTier();
st.enemies.push(createEnemy(sx, sz, waveHp * tier, tier));
```

**Scaling HP with tier:** Higher-tier zombies should have proportionally more HP. Using `baseHp * tier` gives tier 3 zombies 3x the HP of tier 1, making them genuinely threatening.

**Acceptance Criteria:**
- [ ] Wave 0 spawns are 100% tier 1 — clean start
- [ ] By wave 2, occasional tier 2 "Lurchers" appear in ambient spawns (visible larger zombies)
- [ ] By wave 4, tier 3 "Bruisers" appear regularly, tier 4 "Hulks" occasionally
- [ ] At wave 5+, the zombie population visually shifts — a mix of sizes on screen at once
- [ ] Small tier 1 zombies NEVER fully disappear — they remain the majority even at wave 8+
- [ ] The difficulty curve feels predictable: "each wave, things get a little scarier"
- [ ] Higher-tier zombies have proportionally more HP (not just visual size)
- [ ] Merge system still functions — pre-spawned tier 2s can still merge into tier 3s

**Estimated Scope:** Medium (~50-80 lines — new tier selection function, integration into both spawn paths)
**Dependencies:** None

---

### BD-68: Audio spontaneously stops at ~6min mark and never recovers
**Category:** Bug Fix
**Priority:** P0-Critical
**File(s):** `js/3d/audio.js` (`playSound` ~line 221, `audioCache`, `activeSounds`)
**Description:**
During playtesting, around the 6-minute mark (approximately wave 4-5), all game audio spontaneously stopped and never recovered for the remainder of the session. No error was thrown — the game continued silently.

**Likely Root Causes (investigate all):**

1. **`activeSounds` array pollution:** The `activeSounds` array tracks currently-playing sounds and evicts the oldest when `>= MAX_CONCURRENT` (8). However, ended sounds are **never removed** from the array — they're only evicted when the array is full. Over 6 minutes with dozens of sound events per second, the array grows unbounded. Each eviction calls `.pause()` on an `HTMLAudioElement` that may already be in an error state, potentially causing a cascade of silent failures.

2. **HTMLAudioElement reuse corruption:** The `audioCache` stores one `HTMLAudioElement` per sound file. `playSound()` resets `currentTime = 0` and calls `.play()` on the same element. If a previous `.play()` promise hasn't resolved (e.g., browser throttled it), calling `.play()` again can put the element into a broken state where subsequent plays silently fail. The `.catch(() => {})` swallows the error with no recovery.

3. **Browser AudioContext suspension:** Many browsers suspend the AudioContext after a period of heavy audio use or when the page loses focus momentarily. `HTMLAudioElement.play()` returns a rejected promise (caught silently), and the AudioContext never resumes.

4. **MAX_CONCURRENT starvation:** With 8 max concurrent sounds and 4 weapons firing every 1-2 seconds + ambient sounds + XP pickups, the pool is constantly full. The oldest-eviction strategy pauses sounds that might still be playing, and the rapid churn could exhaust browser audio resources.

**Proposed Fix:**

1. **Clean up finished sounds** — remove ended sounds from `activeSounds`:
   ```javascript
   // At the start of playSound():
   activeSounds = activeSounds.filter(a => !a.paused && !a.ended);
   ```

2. **Clone audio elements** instead of reusing the cached original:
   ```javascript
   const clone = audio.cloneNode();
   clone.volume = masterVolume;
   clone.play().catch(() => {});
   clone.addEventListener('ended', () => {
     const idx = activeSounds.indexOf(clone);
     if (idx >= 0) activeSounds.splice(idx, 1);
   });
   activeSounds.push(clone);
   ```

3. **Add per-event cooldown** to prevent rapid-fire stutter (same sound spammed 10x/sec):
   ```javascript
   const lastPlayed = {};
   // In playSound():
   const now = performance.now();
   if (lastPlayed[eventId] && now - lastPlayed[eventId] < 100) return; // 100ms min interval
   lastPlayed[eventId] = now;
   ```

4. **Add AudioContext recovery** — periodically check if audio is working and attempt to resume:
   ```javascript
   // Every 5 seconds in game loop:
   if (typeof AudioContext !== 'undefined') {
     const ctx = new AudioContext();
     if (ctx.state === 'suspended') ctx.resume();
   }
   ```

**Acceptance Criteria:**
- [ ] Audio continues playing beyond the 6-minute mark through wave 5+
- [ ] No silent failures — if audio breaks, it recovers automatically
- [ ] `activeSounds` array is cleaned up (doesn't grow unbounded)
- [ ] Rapid-fire events (weapon fire, XP pickup) don't starve other sounds
- [ ] Audio works after browser tab loses and regains focus
- [ ] Console shows no uncaught audio errors

**Estimated Scope:** Medium (~60-100 lines — activeSounds cleanup, clone strategy, cooldown, recovery)
**Dependencies:** None

---

### BD-69: Add collision for in-game objects (trees, rocks, shrines, decorations)
**Category:** Gameplay / Physics
**Priority:** P1-High
**File(s):** `js/game3d.js` (player movement ~line 3100-3130, enemy AI movement), `js/3d/terrain.js` (decoration generation ~lines 433+)
**Description:**
Players can walk through the sides of all in-game objects — trees, rocks, fallen logs, mushroom clusters, stumps, shrines, and charge shrines. Only the exterior boundary walls (hard coordinate clamp at ±126) block movement. The user notes: "whatever we are doing to prevent models escaping the boundaries we should think about applying to in-game objects."

**Current boundary system:**
```javascript
// Hard clamp — no physics, just coordinate limits
st.playerX = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX));
st.playerZ = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ));
```

**Proposed approach — radius-based push-out (matching boundary style):**

1. **Track collidable positions** — during chunk generation, store decoration positions + radii:
   ```javascript
   // Per-chunk collision data:
   const collisionsByChunk = {};
   // During decoration generation:
   collisionsByChunk[key].push({ x: wx, z: wz, radius: r });
   // Radii: tree=1.0, rock=0.8, stump=0.5, fallenLog=1.5, shrines=1.5
   ```

2. **Player push-out** — after movement update, check nearby colliders and push player out of overlap:
   ```javascript
   const PLAYER_RADIUS = 0.5;
   for (const col of nearbyColliders) {
     const dx = st.playerX - col.x;
     const dz = st.playerZ - col.z;
     const dist = Math.sqrt(dx * dx + dz * dz);
     const minDist = col.radius + PLAYER_RADIUS;
     if (dist < minDist && dist > 0.001) {
       const push = minDist - dist;
       st.playerX += (dx / dist) * push;
       st.playerZ += (dz / dist) * push;
     }
   }
   ```

3. **Enemy push-out** — same logic applied to zombie movement. Zombies should path around obstacles.

4. **Performance** — only check colliders in player's chunk + 8 adjacent chunks (9 chunks max). With ~5-10 decorations per chunk, that's 45-90 collision checks per frame — trivial.

5. **Small decorations passthrough** — mushroom clusters (radius 0.3) can be walked over. Only objects with radius >= 0.5 block movement.

**Acceptance Criteria:**
- [ ] Player cannot walk through trees, rocks, fallen logs, or stumps
- [ ] Player cannot walk through shrines (regular + charge shrines)
- [ ] Zombies navigate around obstacles (push-out, not pathfinding)
- [ ] Small decorations (mushroom clusters) remain passthrough
- [ ] No characters get permanently stuck on objects
- [ ] Collision feels responsive — no jittering or rubber-banding
- [ ] Performance: no frame rate impact with 100+ loaded decorations

**Estimated Scope:** Medium (~100-150 lines — collision data tracking, push-out in player + enemy update loops)
**Dependencies:** Supersedes BD-50 (same problem, more comprehensive)

---

### BD-70: Equipped items must visually display on character model (CRITICAL)
**Category:** Visual / Gameplay
**Priority:** P0-Critical
**File(s):** `js/3d/player-model.js` (new `updateItemVisuals()` function, item visual registry), `js/game3d.js` (call site on item equip)
**Description:**
**THIS IS A CRITICAL FAILING.** Equipped items such as armor, fur, magnet rings, and other gear are completely invisible on the character model. When a player collects Chainmail, Cowboy Boots, Aviator Glasses, and a Crown, their animal looks exactly the same as a naked level 1 character. There is zero visual feedback for gear collection.

**Adornment of the animals is a key driver of fun and "cute" in this game.** Kids need to SEE their animal wearing cool stuff. This is the #1 motivator for item hunting and exploration. Without visible equipment, the entire item system feels abstract and invisible.

This bead supersedes BD-56 (same feature, escalated from P2 to P0-Critical based on playtest feedback).

**Implementation approach:**
See BD-56 for the full design spec including:
- Attachment point system (head, face, torso, hands, feet, waist, neck)
- Per-item voxel box specifications
- Animal-specific offset table
- Phase 1 must-haves: armor, boots, glasses, crown, gloves, bandana
- Stackable item visual scaling

**Key additions beyond BD-56:**
- Items should be immediately visible the moment they're picked up — no delay
- Item visuals must work with muscle growth scaling (items scale with the body)
- Items should have subtle glow or color that matches their rarity tier border
- When an item slot is replaced (leather → chainmail), the old visual disappears instantly

**Phase 1 — Ship-blocking (must implement):**
| Item | Slot | Visual |
|------|------|--------|
| Leather Armor | Torso | Brown chest plate boxes |
| Chainmail | Torso | Gray plate boxes with shoulder pads |
| Thick Fur | Torso | Shaggy overlay (scales with stacks) |
| Aviator Glasses | Face | Two dark lens boxes + bridge |
| Crown of Claws | Head | Golden spike ring on head |
| Cowboy Boots | Feet | Tall brown boot boxes |
| Soccer Cleats | Feet | Green-tinted feet with spike nubs |
| Turbo Sneakers | Feet | Cyan shoes with wing boxes |
| Crit Gloves | Hands | Red oversized hand boxes |
| Bandana | Head | Red flat box around forehead |
| Rubber Ducky | Belt | Tiny yellow box at hip |
| Magnet Ring | Hand | Silver ring box on one hand |

**Phase 2 — Post-ship enhancement:**
All remaining items (Health Pendant, Lucky Charm, Thorned Vest, etc.)

**Acceptance Criteria:**
- [ ] All Phase 1 items are visibly displayed on the character model when equipped
- [ ] Items appear instantly on pickup — no animation delay
- [ ] Items persist through walk/attack animations (children of model group)
- [ ] Items scale proportionally with muscle growth (attached to scaling groups)
- [ ] Replacing an item removes the old visual immediately
- [ ] Items work for all 4 animal types with appropriate offsets
- [ ] Stackable items show visual progression (e.g., thicker fur per stack)
- [ ] Item visuals have subtle rarity glow (white/green/blue/gold outline or tint)
- [ ] Performance: <5 boxes per item, no frame rate impact

**Estimated Scope:** Large (200+ lines — visual registry, attachment system, per-animal offsets, 12 items phase 1)
**Dependencies:** Supersedes BD-56

---

### BD-71: New weapon — Exploding Turd Mines (drop behind, AoE on proximity)
**Category:** Gameplay / Content
**Priority:** P1-High
**File(s):** `js/3d/constants.js` (add to `WEAPON_TYPES`), `js/game3d.js` (mine placement, detonation, AoE logic)
**Description:**
Add a new weapon that drops turd-shaped mines behind the player as they move. Mines persist on the ground and explode when a zombie walks over them, dealing AoE damage to all enemies in the blast radius. This is the first "mine" class weapon (see BD-72 for weapon class system).

**Design:**
- **Visual:** Small brown lumpy box (turd shape — 2-3 stacked brown boxes of decreasing size). Sits on the ground where the player was standing.
- **Placement:** Auto-drops a mine every X seconds (based on attack speed). Mine appears at the player's current position at time of drop.
- **Arming:** Mines arm after 0.5 seconds (brief delay so player can move away). Visual indicator: unarmed mines are darker, armed mines pulse slightly.
- **Detonation:** When any zombie enters the mine's trigger radius (1.5 units), the mine explodes after a 0.1s delay.
- **Explosion:** AoE damage in a 3-unit radius. Brown/green particle burst. Damages all enemies in range. Mine is destroyed.
- **Max mines:** Cap at 15 active mines. Oldest mine despawns when cap is reached.
- **Mine lifetime:** Mines persist for 30 seconds, then fizzle out (small poof animation).

**Weapon Stats:**
```javascript
turdMine: {
  id: 'turdMine', name: 'TURD MINE', type: 'mine', color: '#8B4513',
  desc: 'Drops exploding surprises', baseDamage: 25, baseCooldown: 2.0, baseRange: 3, maxLevel: 5,
  levelDescs: ['+30% Damage', '+1 Mine per Drop', '+40% Blast Radius', '-25% Cooldown', 'Mines Leave Poison Cloud'],
},
```

**Level-up progression:**
- Level 2: +30% base damage (32.5)
- Level 3: Drops 2 mines per placement (slight spread pattern)
- Level 4: Blast radius 3→4.2 units
- Level 5: Cooldown 2.0→1.5s
- Level 6: Detonated mines leave a 2-second poison cloud (DoT)

**Acceptance Criteria:**
- [ ] Turd mines appear in the weapon pool (can be offered at level-up)
- [ ] Mines drop behind the player automatically at cooldown intervals
- [ ] Mines are visible on the ground (brown lumps, armed mines pulse)
- [ ] Zombies stepping on mines trigger AoE explosion
- [ ] Explosion damages all enemies in blast radius
- [ ] Max 15 mines active, oldest replaced when cap reached
- [ ] Mines despawn after 30 seconds if not triggered
- [ ] Level-up upgrades work (damage, multi-drop, radius, cooldown, poison)
- [ ] Sound effect on detonation (if available) or visual-only explosion
- [ ] Kid-appropriate humor — turds are funny, not gross

**Estimated Scope:** Medium (~120-180 lines — weapon definition, mine placement loop, trigger detection, AoE explosion, visual/lifetime management)
**Dependencies:** BD-72 (weapon class system — mine class must exist)

---

### BD-72: Reclassify weapons into 3 classes: AoE melee, projectiles, mines
**Category:** Game Design / Architecture
**Priority:** P1-High
**File(s):** `js/3d/constants.js` (`WEAPON_TYPES`), `js/game3d.js` (weapon firing logic, upgrade menu descriptions)
**Description:**
The current 10 weapon types use ad-hoc `type` strings (`melee`, `projectile`, `projectile_aoe`, `chain`, `boomerang`, `summon`, `orbit`, `trail`, `aoe`) with no consistent scaling framework. Each weapon scales differently based on hardcoded level-up logic. This makes it impossible to balance weapons or communicate their scaling to players.

**Proposed 3-class system:**

### Class 1: AoE Melee
Hit enemies in a predictable arc, cone, or line. Damage is dealt in melee range.

**Scales with:**
- Damage (primary)
- Attack speed (primary)
- Size / arc width (primary) — larger arc = more enemies hit
- Projectile count (adds additional slash effects for visual feedback)

**Does NOT scale with:** Range, bounces

**Current weapons → AoE Melee:**
- `clawSwipe` (melee arc)
- `poisonCloud` (AoE at location → reclassify as melee AoE ground effect)
- `stinkLine` (trail behind player → reclassify as melee zone)

### Class 2: Projectiles
Fire objects that travel outward and hit enemies at range.

**Scales with:**
- Damage (primary)
- Attack speed (primary)
- Projectile count (primary) — more bullets per volley
- Range (secondary) — projectiles travel further
- Bounces (secondary) — projectiles ricochet between targets

**Does NOT scale with:** Size / AoE width

**Current weapons → Projectiles:**
- `boneToss` (straight projectile)
- `lightningBolt` (chain → reclassify as bouncing projectile)
- `fireball` (exploding projectile — explosion is a bonus, not the class)
- `boomerang` (returning projectile)
- `mudBomb` (arcing projectile)
- `beehiveLauncher` (summon → reclassify as homing projectile swarm)
- `snowballTurret` (orbiting projectile source)

### Class 3: Mines
Leave artifacts behind that later explode when enemies trigger them. AoE damage.

**Scales with:**
- Damage (primary)
- Attack speed (primary) — drop rate
- Projectile count (primary) — mines per drop
- AoE radius (secondary) — blast size

**Does NOT scale with:** Range, bounces

**Current weapons → Mines:**
- `turdMine` (new, BD-71)
- Future mine weapons: bear traps, caltrops, banana peels, etc.

**Implementation:**

1. **Add `weaponClass` field to all WEAPON_TYPES:**
   ```javascript
   clawSwipe: { ..., weaponClass: 'melee' },
   boneToss: { ..., weaponClass: 'projectile' },
   turdMine: { ..., weaponClass: 'mine' },
   ```

2. **Add class-level scaling rules:**
   ```javascript
   export const WEAPON_CLASS_SCALING = {
     melee: { damage: true, attackSpeed: true, size: true, projectileCount: true, range: false, bounces: false },
     projectile: { damage: true, attackSpeed: true, projectileCount: true, range: true, bounces: true, size: false },
     mine: { damage: true, attackSpeed: true, projectileCount: true, aoeRadius: true, range: false, bounces: false },
   };
   ```

3. **Update HUD to show weapon class** — players should understand what stats affect their weapons.

4. **Update upgrade menu descriptions** — when a weapon levels up, show which scaling stats improve.

**Acceptance Criteria:**
- [ ] All weapons have a `weaponClass` field ('melee', 'projectile', or 'mine')
- [ ] Class-appropriate scaling rules are defined and documented
- [ ] Weapon upgrade descriptions reference their class scaling
- [ ] Existing weapons retain their current behavior (reclassification, not rewrite)
- [ ] Mine class infrastructure exists for BD-71 turd mines
- [ ] HUD shows weapon class icon or label (optional, nice-to-have)
- [ ] Future weapons can be added to any class with consistent scaling

**Estimated Scope:** Large (~150-200 lines — constants refactor, scaling rules, upgrade menu integration)
**Dependencies:** None

---

### BD-73: Flatten terrain completely — remove curvature, fix seam gaps
**Category:** Visual / Bug Fix
**Priority:** P0-Critical
**File(s):** `js/3d/terrain.js` (`terrainHeight` line 70, `generateChunk` line 433)
**Description:**
The terrain has two critical visual problems:

1. **Visible curvature:** The `terrainHeight()` function uses 3-octave noise to displace terrain vertices, creating hills with up to ~3.3 units of height variation. This makes the ground look curved/hilly. The user wants **totally flat terrain** — no hills, no undulation.

2. **Seam gaps:** There are visible gaps between chunk boundaries that look like water or sky showing through. These occur because:
   - Each chunk is a `PlaneGeometry(16, 16, 8, 8)` positioned at `(cx*16, 0, cz*16)`, but the plane's center is at the position, meaning edges are at `±8` from center — which should align with neighbors.
   - However, the plane is created in XY space then rotated to XZ via `mesh.rotation.x = -Math.PI / 2`. The `position.set(ox, 0, oz)` uses `ox = cx * CHUNK_SIZE` which positions the chunk's center at the chunk corner, not the chunk center. This creates a half-chunk offset causing gaps.
   - Additionally, per-chunk Lambert materials use different forest colors (green palette), creating visible color discontinuities at chunk boundaries.

**Fix for curvature — flatten terrain:**
```javascript
export function terrainHeight(x, z) {
  return 0;  // Completely flat
}
```

This single change eliminates all height variation. All models already use `terrainHeight()` for Y positioning, so they'll all sit at Y=0 (plus their ground offsets). Decorations, gems, shrines — everything uses `terrainHeight()`.

**Fix for seam gaps — correct chunk positioning:**
The `PlaneGeometry` center is at `(0,0)`, extending `±CHUNK_SIZE/2` in each axis. When positioned at `(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE)`, the chunk covers `[cx*16 - 8, cx*16 + 8]`. But the next chunk at `(cx+1)*16` covers `[(cx+1)*16 - 8, (cx+1)*16 + 8]` = `[cx*16 + 8, cx*16 + 24]`. They should be seamless at `cx*16 + 8`.

Verify this is correct, and if gaps still appear, offset the position by `CHUNK_SIZE/2`:
```javascript
mesh.position.set(ox + CHUNK_SIZE / 2, 0, oz + CHUNK_SIZE / 2);
```

**Fix for color discontinuity — uniform ground color:**
Use a single consistent ground color instead of per-chunk random color from the forest palette:
```javascript
const mat = new THREE.MeshLambertMaterial({ color: 0x4a8c3f }); // Consistent forest green
```

**Acceptance Criteria:**
- [ ] Terrain is perfectly flat — no hills, no undulation, no curvature visible
- [ ] No visible gaps or seams between chunk boundaries
- [ ] No water/sky visible through floor cracks
- [ ] Ground color is uniform — no patchwork of different greens
- [ ] All game objects (player, zombies, decorations, shrines) sit correctly on flat ground
- [ ] Decorations still generate and display correctly on flat terrain
- [ ] Map boundary walls still function on flat ground
- [ ] The arena feels like a solid, continuous floor

**Estimated Scope:** Medium (~30-60 lines — terrainHeight change, chunk position fix, uniform color)
**Dependencies:** None

---

### BD-74: Enter key resets level during upgrade/selection menus instead of confirming
**Category:** Bug Fix
**Priority:** P0-Critical
**File(s):** `js/game3d.js` (keydown handler ~lines 485-527, power attack charge ~line 3919, game-over gate ~line 4387)
**Description:**
During augment, weapon, or howl selection in the upgrade menu, pressing the **primary Enter key** on the keyboard resets the level instead of confirming the selection. Space bar and the numpad Enter key work as intended. The on-screen instructions tell the player to press Enter to confirm, making this a severe UX trap — players lose progress by following the game's own instructions.

**Root Cause Analysis:**
The keydown handler at line 515 checks for `e.code === 'Enter'` in the upgrade menu block and calls `choice.apply(st)` + closes the menu. However, **the power attack charge system** at line 3919 also checks `keys3d['Enter']` continuously in the game loop:
```javascript
const chargeKey = keys3d['Enter'] || keys3d['NumpadEnter'] || keys3d['KeyB'];
```

The likely bug flow:
1. Player is in upgrade menu → presses Enter
2. Keydown handler (line 518) processes the choice and sets `st.upgradeMenu = false; st.paused = false;`
3. **In the same frame or next frame**, the game loop resumes and sees `keys3d['Enter'] === true`
4. This triggers the power attack charge OR (more likely) the game-over/restart gate at line 485:
   ```javascript
   if (st.gameOver && !st.upgradeMenu && st.enterReleasedSinceGameOver) {
   ```
5. If `enterReleasedSinceGameOver` is true (from a prior game-over cycle), this could trigger a restart

Alternatively, the Enter keydown event may be propagating to a different handler (e.g., the `game.js` title screen handler) that interprets it as a restart/navigation action.

**Proposed Fix:**

1. **Add a cooldown flag** that prevents Enter from triggering any other action for 200ms after an upgrade menu selection:
   ```javascript
   // In the upgrade menu Enter handler:
   if (e.code === 'Enter' || e.code === 'Space') {
     const choice = st.upgradeChoices[st.selectedUpgrade];
     choice.apply(st);
     st.upgradeMenu = false;
     st.paused = false;
     st._enterCooldown = 0.2; // 200ms grace period
     e.preventDefault();
     e.stopPropagation();
     return; // Don't let this keydown propagate
   }
   ```

2. **Guard all Enter-triggered actions** with the cooldown:
   ```javascript
   // In game loop, before checking Enter for power attack, game-over, etc.:
   if (st._enterCooldown > 0) { st._enterCooldown -= dt; return; }
   ```

3. **Ensure `enterReleasedSinceGameOver` is reset** when entering an upgrade menu:
   ```javascript
   // When opening upgrade menu:
   st.enterReleasedSinceGameOver = false;
   ```

4. **Add `stopPropagation()` and `preventDefault()`** to all menu-context Enter handlers to prevent the event from reaching other listeners.

**Acceptance Criteria:**
- [ ] Pressing Enter during upgrade menu confirms the selected choice (not resets)
- [ ] Space bar continues to work as confirm
- [ ] Numpad Enter continues to work as confirm
- [ ] After confirming an upgrade, Enter does not immediately trigger power attack charge or restart
- [ ] Game-over restart requires a fresh Enter press (not carried from upgrade confirm)
- [ ] It is impossible to accidentally reset/restart the game from any selection menu

**Estimated Scope:** Small (~20-30 lines — cooldown flag, event propagation fixes, guard conditions)
**Dependencies:** None

---

### BD-75: Add item drops to zombie loot table (tier-scaled chance)
**Category:** Gameplay / Balance
**Priority:** P1-High
**File(s):** `js/game3d.js` (`killEnemy` ~lines 1943-1994, loot drop roll ~line 1975)
**Description:**
Zombie death loot currently drops powerup crates (60%), health orbs (25%), or XP bursts (15%) — but **never items**. The `createItemPickup()` function exists but is never called from the `killEnemy()` loot table. This means the only sources of items are ambient spawns (every 45-60s) and wave events. Players aren't getting enough items.

**Current loot table (inside `killEnemy`):**
```javascript
let dropChance = [0.03, 0.06, 0.10, 0.15, 0.15, 0.20, 0.20, 0.30, 0.30, 0.50][(e.tier || 1) - 1];
// Lucky Charm / Lucky Penny modify dropChance
if (Math.random() < dropChance) {
  const roll = Math.random();
  if (roll < 0.6) { /* powerup crate */ }
  else if (roll < 0.85) { /* health orb */ }
  else { /* XP burst */ }
}
```

**Proposed change — add item drops to the loot table:**
Replace the inner roll distribution to include items. Items should be rarer than powerups but still achievable, especially from higher-tier zombies:

```javascript
if (Math.random() < dropChance) {
  const roll = Math.random();
  const itemChance = 0.01 + (e.tier || 1) * 0.05; // 6% tier 1, 11% tier 2, 16% tier 3, 21% tier 4...
  if (roll < itemChance) {
    // Item drop — rarer, scales with tier
    const pickup = createItemPickup(dropX, dropZ);
    if (pickup) st.itemPickups.push(pickup);
  } else if (roll < 0.55) {
    // Powerup crate (remaining ~49-54%)
    st.powerupCrates.push(createPowerupCrate(dropX, dropZ));
  } else if (roll < 0.80) {
    // Health orb (25%)
    st.hp = Math.min(st.hp + st.maxHp * 0.15, st.maxHp);
    st.floatingTexts3d.push({ text: '+HEALTH', color: '#44ff44', ... });
  } else {
    // XP burst (20%)
    for (let g = 0; g < 3; g++) {
      st.xpGems.push(createXpGem(...));
    }
  }
}
```

**Net effect per tier:**
| Tier | Base Drop% | Item% of drop | Effective Item% per kill |
|------|-----------|---------------|-------------------------|
| 1 | 3% | 6% | 0.18% |
| 2 | 6% | 11% | 0.66% |
| 3 | 10% | 16% | 1.6% |
| 4 | 15% | 21% | 3.15% |
| 5+ | 15-50% | 26%+ | 3.9-13% |

This gives a steady trickle of items from regular play, with higher-tier zombies being noticeably more rewarding.

**Acceptance Criteria:**
- [ ] Zombies occasionally drop item pickups on death
- [ ] Higher-tier zombies drop items more frequently
- [ ] Item drops use the existing `createItemPickup()` with rarity weighting
- [ ] Powerup crates, health orbs, and XP bursts still drop (slightly reduced % to make room)
- [ ] With Lucky Charm + high-tier zombies, items feel like a meaningful reward
- [ ] Floating text shows item name/rarity on pickup (existing behavior)

**Estimated Scope:** Small (~15-20 lines — modify loot table distribution in killEnemy)
**Dependencies:** None

---

### BD-76: Add HUD minimap with fog of war + full map on M key
**Category:** UX / Gameplay
**Priority:** P1-High
**File(s):** `js/3d/hud.js` (new minimap rendering), `js/game3d.js` (fog-of-war state, M key handler, shrine/decoration positions)
**Description:**
Add a minimap in the bottom-right corner of the HUD showing the player's explored area, nearby enemies, shrines, and items. Pressing M opens a full-screen map overlay. Unexplored areas show fog of war.

**Design:**

**HUD Minimap (always visible):**
- Position: bottom-right corner, 150×150px
- Shows a top-down view centered on the player
- View radius: ~50 world units (~3 chunks in each direction)
- Player: bright green dot (center)
- Enemies: red dots (scaled by tier)
- Charge shrines (unused): cyan diamonds
- Item pickups: yellow dots
- Powerup crates: orange dots
- Explored terrain: dark green
- Unexplored: black (fog of war)
- Map boundary: white border rectangle
- Semi-transparent background: `rgba(0, 0, 0, 0.5)`

**Full Map (M key toggle):**
- Covers ~80% of the screen, centered
- Shows the entire arena (256×256 world units)
- Same icons as minimap, scaled down
- Fog of war: areas the player hasn't been within 30 units of are blacked out
- Pause game while map is open (like pause menu)
- ESC or M to close

**Fog of War Implementation:**
- Track explored areas using a grid (4×4 unit cells → 64×64 grid for 256×256 arena)
- `st.exploredCells = new Set()` — add cells as the player moves through them
- Reveal radius: 30 units (player can see ~2 chunks around them)
- Per frame: mark cells within reveal radius as explored
- On minimap/full map: only draw elements in explored cells

**State additions:**
```javascript
st.exploredCells = new Set();  // "cx,cz" keys for 4x4 grid cells
st.fullMapOpen = false;
```

**Key handler:**
```javascript
if (e.code === 'KeyM' && !st.upgradeMenu && !st.gameOver && !st.chargeShrineMenu) {
  st.fullMapOpen = !st.fullMapOpen;
  st.paused = st.fullMapOpen;
}
```

**Acceptance Criteria:**
- [ ] 150×150px minimap visible in bottom-right corner during gameplay
- [ ] Player is a green dot at minimap center
- [ ] Enemies appear as red dots, scaled by tier
- [ ] Unused charge shrines appear as cyan diamonds
- [ ] Fog of war covers unexplored areas (black)
- [ ] Explored areas persist (once revealed, stays visible)
- [ ] M key opens full-screen map overlay showing entire arena
- [ ] Full map pauses the game while open
- [ ] ESC or M closes the full map
- [ ] Map shows map boundary outline
- [ ] Performance: minimap render is lightweight (<2ms per frame)

**Estimated Scope:** Large (~200-300 lines — minimap renderer, fog state, M key handler, full map overlay)
**Dependencies:** None

---

### BD-77: Add challenge shrines that spawn scaled mini-boss zombies with guaranteed loot
**Category:** Gameplay / Content
**Priority:** P1-High
**File(s):** `js/3d/constants.js` (new `CHALLENGE_SHRINE` constants), `js/game3d.js` (shrine generation, boss spawn, boss death loot), `js/3d/terrain.js` (or `game3d.js` — mesh construction)
**Description:**
Add a new world structure: **Challenge Shrines** — large stone zombie statues that the player activates by pressing E. Activating a challenge shrine spawns a scaled mini-boss zombie. The boss difficulty scales with the current wave count (bigger / more minions at higher waves). Killing the boss **always drops loot (items)**.

**Design:**

**Visual — Stone Zombie Statue:**
- A large (3-4 units tall) gray stone version of a zombie model, standing on a stone platform (2×2 base)
- Darker gray color palette (0x666666 body, 0x555555 details) to look like carved stone
- Slight green glowing rune on the chest/head indicating it's activatable
- Idle animation: very slow rotation (~1 rev/30s), subtle green particle effect
- After activation: statue crumbles (scale down + despawn), boss zombie appears

**Activation:**
- Player must be within 3 units of the shrine
- Press E to activate (shown as floating "Press E" text when in range)
- Cannot activate during upgrade menus, pause, charge shrine, or game over
- Shrine is one-time use — crumbles after activation

**Boss Zombie Scaling by Wave:**
| Wave | Boss Tier | Boss HP | Minion Count | Minion Tier |
|------|-----------|---------|-------------|-------------|
| 0-1 | 3 | 5× base | 0 | -- |
| 2-3 | 4 | 8× base | 2 | 2 |
| 4-5 | 5 | 12× base | 4 | 3 |
| 6-7 | 6 | 18× base | 6 | 3 |
| 8+ | 7 | 25× base | 8 | 4 |

- `base` = current `8 + floor(gameTime/60 * 2.5)` HP formula
- Boss zombie is visually larger (1.5-2× scale of equivalent tier zombie)
- Boss has a distinct color tint (red glow or darker shade) to distinguish from regular zombies
- Minions spawn in a ring around the boss

**Guaranteed Loot on Boss Kill:**
When a boss zombie dies, it **always** drops:
1. One item pickup (`createItemPickup`) — with boosted rarity (rare+ weighted)
2. One powerup crate
3. 5-10 bonus XP gems

The item rarity is boosted for boss drops:
```javascript
// Boss item drop uses boosted rarity weights:
// Normal: common 50%, uncommon 28%, rare 16%, legendary 6%
// Boss:   common 20%, uncommon 35%, rare 30%, legendary 15%
```

**Generation:**
- 6-10 challenge shrines placed at game start
- Spread across the arena, minimum 30 units apart from each other and from charge shrines
- Positioned on flat ground (not on platforms)

**State tracking:**
```javascript
st.challengeShrines = [];       // Array of challenge shrine objects
st.activeBosses = [];           // Currently alive boss zombies (track for guaranteed loot)
```

**Boss zombie state:**
```javascript
// Boss flag on enemy object:
e.isBoss = true;
e.bossLootDropped = false;  // Ensure loot drops exactly once
```

**HUD indicator:**
- When near a challenge shrine, show "PRESS E — CHALLENGE" floating text
- During boss fight, show boss HP bar at the top of the screen (large, red, with boss name)

**Acceptance Criteria:**
- [ ] 6-10 stone zombie statues visible across the map
- [ ] Statues are large, visually distinct, and identifiable from a distance
- [ ] "Press E" prompt appears when within 3 units
- [ ] E key spawns boss zombie + minions, shrine crumbles
- [ ] Boss difficulty scales with current wave (bigger boss, more minions at higher waves)
- [ ] Boss zombie is visually larger and distinct from regular zombies
- [ ] Killing boss ALWAYS drops: 1 item (boosted rarity), 1 powerup crate, 5-10 XP gems
- [ ] Boss HP bar appears at top of HUD during fight
- [ ] Challenge shrines appear on minimap (BD-76) as distinct icon
- [ ] Shrines are one-time use
- [ ] Player cannot accidentally activate (E key, not Enter)

**Estimated Scope:** Large (~250-350 lines — shrine mesh, boss spawn, boss tracking, guaranteed loot, HUD boss bar, E key interaction)
**Dependencies:** None

---

### BD-78: Improve tree models with rounded canopy (multi-box foliage)
**Category:** Visual / Polish
**Priority:** P2-Medium
**File(s):** `js/3d/terrain.js` (`createTree` lines 147-174)
**Description:**
Current trees are two boxes — a thin brown trunk and a single large green cube canopy. They look like Minecraft placeholder blocks. The canopy should be built from multiple smaller cubes arranged to approximate a rounded or organic shape, giving trees more visual character while staying within the voxel aesthetic.

**Current tree construction:**
```javascript
// Trunk: single box, 0.3×sizeVar wide, 2×sizeVar tall
const trunk = new THREE.Mesh(
  new THREE.BoxGeometry(0.3 * sizeVar, trunkH, 0.3 * sizeVar), ...);
// Canopy: single box, 1.8×sizeVar wide, 1.5×sizeVar tall
const canopy = new THREE.Mesh(
  new THREE.BoxGeometry(canopyW, canopyH, canopyW), ...);
```

**Proposed multi-box canopy:**
Replace the single canopy cube with 5-9 overlapping boxes of varying sizes that create a rounded silhouette:

```javascript
function createTree(dx, dz, h, scene) {
  const sizeVar = 0.8 + noise2D(dx * 7.1, dz * 3.7) * 0.4;
  const trunkH = 2 * sizeVar;
  const canopyBase = h + trunkH;
  const meshes = [];

  // Trunk (unchanged)
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.3 * sizeVar, trunkH, 0.3 * sizeVar),
    new THREE.MeshLambertMaterial({ color: 0x664422 })
  );
  trunk.position.set(dx, h + trunkH / 2, dz);
  trunk.castShadow = true;
  scene.add(trunk);
  meshes.push(trunk);

  // Canopy: multi-box rounded shape
  const canopyColors = [0x226622, 0x1a5a1a, 0x2a7a2a, 0x1e6e1e];
  const cc = canopyColors[Math.floor(noise2D(dx * 2.3, dz * 5.1) * canopyColors.length)];
  const s = sizeVar;

  // Core large box (slightly smaller than before)
  const addBox = (w, bh, d, ox, oy, oz) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, bh, d),
      new THREE.MeshLambertMaterial({ color: cc })
    );
    m.position.set(dx + ox, canopyBase + oy, dz + oz);
    m.castShadow = true;
    scene.add(m);
    meshes.push(m);
  };

  // Center block (largest)
  addBox(1.4 * s, 1.2 * s, 1.4 * s, 0, 0.6 * s, 0);
  // Top cap (smaller, higher)
  addBox(0.9 * s, 0.6 * s, 0.9 * s, 0, 1.3 * s, 0);
  // 4 side lobes (medium, offset outward)
  addBox(0.7 * s, 0.8 * s, 1.0 * s, 0.5 * s, 0.5 * s, 0);
  addBox(0.7 * s, 0.8 * s, 1.0 * s, -0.5 * s, 0.5 * s, 0);
  addBox(1.0 * s, 0.8 * s, 0.7 * s, 0, 0.5 * s, 0.5 * s);
  addBox(1.0 * s, 0.8 * s, 0.7 * s, 0, 0.5 * s, -0.5 * s);

  return meshes;
}
```

This creates a 7-mesh tree (1 trunk + 6 canopy boxes) that approximates a rounded canopy. The overlapping boxes create a natural, organic silhouette from any angle. With shadow casting, the trees will look substantially more characterful.

**Performance note:** With 2-5 trees per chunk and ~50 loaded chunks, this goes from 100-250 meshes to 350-875 tree meshes. Each is a simple box with no texture — well within Three.js performance limits. If needed, canopy boxes could share a single merged geometry per tree.

**Acceptance Criteria:**
- [ ] Trees have a rounded, organic canopy silhouette (not a single cube)
- [ ] Each tree still looks voxel/blocky (not smooth — multiple cubes, not spheres)
- [ ] Canopy color variation still works (4 green shades)
- [ ] Size variation still works (0.8-1.2x)
- [ ] Trees cast shadows correctly with multiple canopy boxes
- [ ] No performance regression with 50+ loaded chunks of trees
- [ ] Trunk is unchanged (thin brown pillar)
- [ ] Trees look good on flat terrain (post BD-73)

**Estimated Scope:** Small (~40-60 lines — rewrite createTree canopy section)
**Dependencies:** None

---

## Execution Notes

### Sprint Ordering

**Immediate (can start now, no dependencies):**
- BD-39 (overlap fix — small, high impact)
- BD-42 through BD-47 (art specs — pure documentation, zero code risk)

**After BD-39:**
- BD-40 (font sizes + contrast — medium effort, high impact for kids)

**After BD-39 + BD-40:**
- BD-41 (icon infrastructure — large, but enables all art assets to plug in)

### Art Generation Pipeline
Once BD-42 through BD-47 specs are written, they serve as prompts for agentic art generation (e.g., DALL-E, Midjourney, or custom pixel-art generators). The specs are designed to be:
- **Machine-actionable**: exact sizes, formats, color codes, naming conventions
- **Batch-friendly**: each spec covers one category, all icons in a category share style constraints
- **Integration-ready**: output filenames match the `assets/icons/{category}/{id}.png` convention from BD-41
