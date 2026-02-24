# BD-148: Wearable Equipment System -- Improved Design

**Date:** 2026-02-24
**Status:** Design document (no code changes)
**Builds on:** Original BD-148 bead in `beads-bd146-148.md`
**Audience:** Uncle Sandro + Julian (the 7-year-old creative director)

---

## Critical Review of the Original BD-148 Plan

The original plan has solid structural bones but makes several mistakes that would result in a system Julian would forget about after 5 minutes. Here is what is wrong and why:

### Problem 1: The Names Are Boring
"Leather Vest", "Chainmail", "Knight Plate", "Gardening Gloves" -- these sound like a Medieval Times gift shop receipt. Julian is 7. He wants to shout the name of his gear across the room to his uncle. "I GOT THE VOLCANO STOMPERS!" works. "I equipped Uncommon Rocket Boots" does not.

### Problem 2: The Effects Are Invisible
"+5% XP gain", "-15% damage taken", "+10% ability range" -- these are spreadsheet entries. A 7-year-old cannot perceive a 5% XP gain change. Every item needs to DO something visible on screen, or it might as well not exist. Minecraft understood this: diamond armor is BLUE and SHINY. Netherite is DARK and MENACING. You can SEE the difference from 50 blocks away.

### Problem 3: Five Slots Is Too Many
Five mutually exclusive slots (hat/armor/gloves/boots/accessory) means the player has to make 5 separate replacement decisions throughout a run. That is adult RPG complexity. Fall Guys uses TWO slots (top/bottom). Minecraft uses FOUR but each tier is a complete visual overhaul. For a roguelike where runs are 10-20 minutes, **three slots** is the sweet spot -- enough variety to feel like customization, few enough that each equip is a big moment.

### Problem 4: Rarity Progression Is Too Subtle
Going from "Baseball Cap" to "Wizard Hat" does not feel like a power jump. In Fortnite, going from a green weapon to a gold weapon is ELECTRIC -- the color changes, the sound changes, the whole energy of your character shifts. Each rarity tier needs to be a TRANSFORMATION, not a side-grade.

### Problem 5: No Visual "Wow" at Camera Distance
The original plan specifies tiny box dimensions (0.15 x 0.15 x 0.15 for gloves). At the game's camera distance, those are invisible. The game's camera sits roughly 15-20 units above and behind the player. At that distance, only LARGE, HIGH-CONTRAST shapes register. Think action figure accessories -- chunky, oversized, bright.

---

## The Improved System

### Core Philosophy: "Action Figure Mode"
Think of every wearable as something you would snap onto a 6-inch action figure. It should be:
- **Chunky** -- oversized relative to the character
- **Colorful** -- uses the rarity color prominently, not just as a tint
- **Obvious** -- you can tell what slot it is from across the room
- **Named for the playground** -- Julian should want to yell this name

### Three Slots (Not Five)

| Slot | What It Covers | Attachment Point | Why This Slot |
|------|---------------|-----------------|---------------|
| **HEAD** | Hats, helmets, crowns, masks | Top of head group | Always visible from above (camera angle!) |
| **BODY** | Armor, capes, shells, vests | Torso + shoulder area | Biggest surface area on the model |
| **FEET** | Boots, stompers, skates, rockets | Leg ends / feet | Creates ground-level effects and changes movement feel |

Why not gloves and accessories? Because at camera distance they are invisible, and splitting the excitement across 5 slots dilutes it. Three big, obvious slots mean every single equip is a major visual event.

### The "Julian Test" for Every Item
Every item in this document was tested against these questions:
1. Would Julian yell this name at school?
2. Can you see the difference from the default camera height?
3. Does the effect change how the game FEELS, not just a stat number?
4. Does the legendary version make you gasp?

---

## HEAD Slot Items

The head is the most visible body part from the game's top-down-ish camera angle. HEAD items sit ON TOP of the character and should extend upward/outward to be unmissable.

| Rarity | Name | Mesh Color | Visual Description | Gameplay Effect | "Julian Moment" |
|--------|------|-----------|-------------------|----------------|----------------|
| Common | **PARTY HAT** | Rarity white (0xffffff) with colored tip (0xff4444) | Tall cone made of 3 stacked boxes getting smaller toward the top. Total height ~0.5 above head. Bright colored stripe boxes around the base. | +10% XP gain from all sources. Floating XP numbers are 1.5x bigger when wearing this. | "Haha I'm wearing a PARTY HAT while fighting zombies!" |
| Uncommon | **SHARK FIN** | Rarity green (0x44ff44) body, grey-blue fin (0x6688aa) | Large triangular fin (tall thin box, 0.35 high, angled back 15 degrees) rising from the top of the head like a shark dorsal fin. Green glow base ring. | +15% move speed. Leaves a brief water-splash particle trail behind the player (3-4 blue boxes that fade). | "I'M A SHARK! DUHNUH DUHNUH!" |
| Rare | **DINO SPIKE CROWN** | Rarity blue (0x4488ff) spikes, dark base (0x224466) | Ring of 5 chunky spike boxes (each 0.12w x 0.2h x 0.12d) around the head, pointing outward and up like a stegosaurus plate crown. Blue emissive glow (0x112244). | +20% all damage. Enemies that touch the player take 5 damage (passive thorn damage with visible blue spark). | "RAWR I'M A DINOSAUR! Don't touch me zombies!" |
| Legendary | **THE VOLCANO** | Rarity orange (0xff8800) base, red-hot peak (0xff2200), lava glow (0xff4400 emissive) | Massive volcano-shaped hat: wide base box (0.6w x 0.15h x 0.6d) with 3 progressively smaller boxes stacked to form a cone (~0.6 total height). The top box pulses emissive between red and orange (sinusoidal, 2Hz). Periodically (every 3s) spawns 2-3 tiny red "lava" boxes that arc outward and fall, dealing 5 damage to nearby enemies on landing. | +30% all damage. Every 3 seconds, erupts 2-3 lava rocks (tiny red projectiles) that land in a ~4 unit radius and deal 8 damage each to enemies they hit. | "MY HEAD IS A VOLCANO! IT'S ERUPTING! LOOK UNCLE SANDRO LOOK!!" |

**Visual Scaling with Muscle Growth:** Head items scale with Tier 4 (head) growth rate (+0.015/level, cap 1.25x). The Volcano's eruption radius also grows 10% per 5 levels.

---

## BODY Slot Items

The torso is the largest surface area. BODY items should wrap/overlay the chest and extend to the shoulders. They change the character's silhouette dramatically.

| Rarity | Name | Mesh Color | Visual Description | Gameplay Effect | "Julian Moment" |
|--------|------|-----------|-------------------|----------------|----------------|
| Common | **CARDBOARD BOX** | Rarity white (0xffffff) outlines on brown (0xbb8844) | A slightly-larger-than-torso box (0.8w x 0.55h x 0.5d) overlaid on the chest. Dark brown edge lines (thin boxes along edges). Looks like the character literally put on a cardboard box as armor. | -20% damage taken. | "He's wearing a BOX! That's so silly!" |
| Uncommon | **BUMBLE ARMOR** | Rarity green (0x44ff44) trim, yellow (0xffdd00) body, black (0x222222) stripes | Bright yellow torso overlay (0.82w x 0.6h x 0.52d) with 3 horizontal black stripe boxes. Two small wing boxes (0.2w x 0.15h x 0.04d) on the back, angled outward. Green emissive edge glow. Buzzing wing animation (oscillate wing angle at 8Hz). | -30% damage taken. 10% chance on being hit: release a bee that chases the attacker for 3s dealing 4 damage/s (visible as a small yellow-black box that orbits toward enemies). | "I'm a BUMBLEBEE and the zombies keep getting STUNG!" |
| Rare | **ICE FORTRESS** | Rarity blue (0x4488ff) ice, white (0xccddff) frost accents | Large icy torso overlay (0.85w x 0.65h x 0.55d) in translucent ice-blue (opacity 0.8). Shoulder pads are chunky ice crystal boxes (0.25w x 0.2h x 0.2d each, angled 20 degrees outward). 4 small frost crystal boxes (0.06 each) float and slowly orbit the character (orbit radius ~1.2, speed 1 rad/s). Blue emissive glow (0x224488). | -40% damage taken. Aura: enemies within 3 units move 20% slower (visible frost effect -- enemies get a white tint). +20 max HP. | "Everything around me is FREEZING! I'm an ICE KING!" |
| Legendary | **RAINBOW SHELL** | All rainbow colors cycling, strong emissive | Massive turtle-shell dome on the back (0.9w x 0.5h x 0.7d, offset z=-0.1) made of 6 panel boxes arranged in a hexagonal fan pattern. Each panel cycles through rainbow colors at different phase offsets (using HSL hue rotation at 0.5 cycles/s). The front has a chest plate (0.75w x 0.4h x 0.3d) that also color-cycles. Strong emissive on all panels (0x333333 base, color-matched). The whole assembly pulses scale 1.0-1.05 at 1Hz. | -50% damage taken. Reflects 15% of all damage back to attackers as a rainbow beam (visible colored line from player to attacker). +30 max HP. All howl effects +25% stronger. | "RAINBOW SHELL!! I'M INVINCIBLE!! THE COLORS!! UNCLE SANDRO DO YOU SEE THE COLORS!!" |

**Visual Scaling with Muscle Growth:** Body items scale with Tier 1 (core) growth rate (+0.05/level, cap 1.8x). The ice aura radius and bee chase range grow with muscle scale. Rainbow Shell's panel count stays at 6 but each panel grows, making the shell progressively more imposing.

---

## FEET Slot Items

Feet are at the bottom of the model but create ground-level effects that are highly visible from the overhead camera. FEET items should change how the character MOVES and SOUNDS.

| Rarity | Name | Mesh Color | Visual Description | Gameplay Effect | "Julian Moment" |
|--------|------|-----------|-------------------|----------------|----------------|
| Common | **CLOWN SHOES** | Rarity white (0xffffff) with red (0xff2222) toes | Oversized shoe boxes on each foot (0.3w x 0.12h x 0.4d -- deliberately huge and goofy). Red toe-cap box on the front of each shoe. They slightly clip into the ground, which is fine and looks funny. | +15% move speed. 5% chance per step to drop a banana peel (tiny yellow box) that trips enemies for 1s if they walk over it. | "HONK HONK look at my giant shoes!!" |
| Uncommon | **SPRING BOOTS** | Rarity green (0x44ff44) springs, metal grey (0xaaaaaa) boot | Chunky metal boot boxes (0.25w x 0.2h x 0.3d) with coiled spring below each (3 stacked flat boxes, each slightly offset, simulating a coil -- alternating green and silver). Springs visually compress/expand during walk animation. | +20% move speed. +50% jump height. Landing from jumps creates a visible green shockwave ring (expanding green circle on ground, 2 unit radius) that knocks back nearby enemies 3 units. | "BOING BOING BOING I'M BOUNCING SO HIGH!!" |
| Rare | **LAVA WALKERS** | Rarity blue (0x4488ff) boot frame, molten orange/red (0xff4400) soles with strong emissive (0x441100) | Dark blue metal boot boxes (0.28w x 0.22h x 0.32d) with glowing orange sole boxes underneath (0.26w x 0.06h x 0.3d, emissive 0xff2200). While moving, leaves a trail of 6-8 small fire boxes on the ground (each 0.15w x 0.05h x 0.15d, orange, fade out over 1.5s) that damage enemies for 8 damage per tick (0.5s). Trail boxes use emissive orange glow. | +20% move speed. Leaves damaging fire trail (8 dmg/tick, 1.5s duration) wherever the player walks. Enemies that walk through fire are also slowed 30% for 1s. +10% dodge chance. | "I'M LEAVING FIRE EVERYWHERE! THE FLOOR IS LAVA FOR ZOMBIES!" |
| Legendary | **TORNADO STOMPERS** | Rarity orange (0xff8800) boot metal, swirling grey/white (0xcccccc/0xffffff) wind effect, strong orange emissive | Massive chunky boots (0.35w x 0.28h x 0.38d) in bright orange metal with emissive glow. Each boot has 3-4 tiny debris boxes orbiting it (radius 0.4, speed 4 rad/s, randomized Y offsets -- simulates a tiny tornado around each foot). While moving, spawns a visible wind-funnel behind the player: 8-10 small grey boxes spiraling upward (cylinder radius 0.5, height 2.0, rotating 6 rad/s) that persist for 0.8s. Enemies caught in the wind funnel take 10 damage and are launched upward 3 units. | +30% move speed. While moving, creates a tornado trail behind the player (1s duration, 10 damage, launches enemies into the air). +25% dodge chance. Landing from any height creates a 5-unit shockwave that deals 15 damage and stuns enemies for 1s. | "THERE'S A TORNADO BEHIND ME!! I'M THE TORNADO GUY!! WHOOOOSH!!" |

**Visual Scaling with Muscle Growth:** Feet items scale with Tier 3 (extremities) growth rate (+0.025/level, cap 1.4x). Fire trail and tornado damage scale +5% per 3 player levels. Tornado Stomper boot orbit speed increases slightly with level for added visual intensity.

---

## Rarity Color System: Make It SCREAM

The existing rarity colors (white/green/blue/orange) should not just tint the HUD text. They need to be built into the wearable meshes themselves so rarity is visible on the character model at all times.

### Rarity Visual Rules

| Rarity | Mesh Treatment | Outline/Trim | Emissive | Animation |
|--------|---------------|-------------|----------|-----------|
| **Common (white)** | Item's natural colors. Clean, solid boxes. | None | None | None (static) |
| **Uncommon (green)** | Item colors + green trim boxes along edges (0x44ff44) | 2-3 thin green stripe boxes on largest surface | Faint green emissive (0x112211) | None (static) |
| **Rare (blue)** | Item colors + blue accents. Semi-translucent panels (opacity 0.85). | Blue edge trim + blue accent boxes | Medium blue emissive (0x224488) | Slow pulse: scale oscillates 1.0--1.03 at 0.5Hz |
| **Legendary (orange)** | Bright saturated colors + orange/gold accents everywhere. | Thick orange trim boxes. Gold accent boxes on corners. | Strong emissive (0x442200), pulsing | Scale pulse 1.0--1.05 at 1Hz + color/emissive cycling or special per-item animation |

### The Legendary Pickup Moment
When a legendary wearable drops on the ground as a pickup, it should:
1. Be 1.5x the size of other pickups
2. Have a persistent upward "beam" (tall thin box, 0.1w x 8h x 0.1d, rarity orange, opacity 0.3) so you can see it from far away
3. Emit 4-6 tiny orbiting star boxes (0.05 cubes, orange, orbit radius 0.8, different Y heights)
4. Bob faster than normal items (1.5x bob speed)
5. The pickup announcement (BD-147) should use a LARGER font size and a 3-second display instead of 2s

---

## Equip/Replace Flow

### First Time Equipping a Slot
1. Player walks over the item pickup
2. BD-147 fanfare triggers: screen flash (rarity color), center announcement, time-dilation
3. The wearable mesh builds onto the player model piece-by-piece over 0.3s (boxes appear one at a time with a small "pop" scale animation: 0 to 1.2 to 1.0)
4. Sound: use `sfx_level_up` for common/uncommon, a new heavier sound for rare/legendary (until Julian records one, pitch-shift `sfx_level_up` down 30% for rare, down 50% for legendary)

### Replacing an Existing Item
When the player picks up a new item for an already-occupied slot:

**Option A: Auto-Replace (Recommended for simplicity)**
- If the new item is HIGHER rarity than the current one: auto-equip with full fanfare
- If the new item is SAME or LOWER rarity: auto-equip but with a shorter announcement (1s instead of 2-3s) and no time-dilation
- Show "REPLACED: [old name] -> [new name]" in the center announcement
- The old item's meshes dissolve (scale to 0 over 0.2s) and the new item builds on (as above)

**Why not a choice prompt?** This is a roguelike for a 7-year-old. Interrupting combat with "Do you want to replace your Shark Fin with a Dino Spike Crown?" is:
- Dangerous (enemies still moving)
- Confusing (stat comparisons are adult brain stuff)
- Slow (kills momentum)

Julian does not want to read a tooltip. Julian wants to run over the shiny thing and see his character change.

**Safety valve:** If a player walks over a LOWER rarity item for an occupied slot, the item stays on the ground for 5 more seconds before despawning (so they do not accidentally downgrade by running through a common when they have a legendary). Only higher-or-equal rarity auto-equips. Lower rarity items in occupied slots require a second walk-over within the 5s window (a "confirm by re-touching" mechanic).

### HUD Display for Equipped Wearables
The bottom-left item list should change from a text-only list to a **3-slot visual display**:

```
[ HEAD icon ] PARTY HAT         (white text = common)
[ BODY icon ] ICE FORTRESS      (blue text = rare)
[ FEET icon ] SPRING BOOTS      (green text = uncommon)
```

Each slot shows:
- A tiny colored square (rarity color) as the icon
- The item name in rarity-colored text
- Empty slots show as dark grey "[EMPTY]"

---

## Integration with the Existing Item System

### What Changes

The current `ITEMS_3D` array has 25 items across many unique slot names (armor, boots, glasses, ring, charm, pendant, gloves, vest, bracelet, cushion, turboshoes, goldenbone, crown, zombiemagnet, scarf, plus stackables). The wearable system replaces the **non-stackable unique-slot items** with the 12 wearables (4 per slot x 3 slots).

### Migration Path

**Phase 1: Keep stackables, convert unique-slots to wearables**

Items that STAY as-is (stackable passive items -- no visual slot needed):
- Rubber Ducky (stackable move speed)
- Thick Fur (stackable HP)
- Silly Straw (stackable heal-on-kill)
- Bandana (stackable damage) -- retains its head visual but does NOT occupy the HEAD wearable slot
- Hot Sauce (stackable ignite)
- Bouncy Ball (stackable ricochet)
- Lucky Penny (stackable powerup drop)
- Alarm Clock (stackable cooldown reduction)

Items that become wearables (absorbed into the 3-slot system):
- Leather Armor, Chainmail -> replaced by BODY slot common/rare
- Soccer Cleats, Cowboy Boots, Turbo Sneakers -> replaced by FEET slot common/uncommon/rare
- Crown of Claws -> replaced by HEAD slot legendary
- Rainbow Scarf -> effect folded into BODY legendary (Rainbow Shell)
- Golden Bone -> effect folded into HEAD legendary (The Volcano's damage boost)

Items that become **passive pickups** (no slot, instant-apply, permanent, non-stackable):
- Aviator Glasses (see crate contents) -- too useful to lose, becomes an instant passive
- Magnet Ring (pickup radius) -- becomes an instant passive
- Lucky Charm (drop rate) -- becomes an instant passive
- Health Pendant (regen) -- becomes an instant passive
- Crit Gloves (crit chance) -- becomes an instant passive
- Shield Bracelet (block hit) -- becomes an instant passive
- Thorned Vest (reflect) -- becomes an instant passive
- Whoopee Cushion (explode on death) -- becomes an instant passive
- Zombie Magnet (2x XP) -- becomes an instant passive

**Why make these passive?** These items have effects that are too useful and too varied to collapse into 3 slots. Making them instant-apply passives means the player never has to choose between "do I want crit chance or reflect damage" -- they just collect them all. This keeps the collector dopamine loop (Julian loves seeing his item count go up) while the 3 wearable slots provide the big visual "look at me" moments.

**Phase 2: State structure changes**

Current `st.items` object gets split:
```
st.wearables = {
  head: null,    // { id, rarity, meshes[] }
  body: null,    // { id, rarity, meshes[] }
  feet: null,    // { id, rarity, meshes[] }
}

st.passives = {
  glasses: false,
  ring: false,
  charm: false,
  pendant: false,
  gloves: false,
  bracelet: false,
  vest: false,
  cushion: false,
  goldenbone: false,
  zombiemagnet: false,
}

st.stacks = {
  rubberDucky: 0,
  thickFur: 0,
  sillyStraw: 0,
  bandana: 0,
  hotSauce: 0,
  bouncyBall: 0,
  luckyPenny: 0,
  alarmClock: 0,
}
```

### New WEARABLES_3D Constant

This replaces the wearable portion of ITEMS_3D. Each wearable has its own visual builder function (in player-model.js) rather than static box specs, because legendary items need animation.

```
WEARABLES_3D = {
  head: [
    { id: 'partyHat', name: 'PARTY HAT', rarity: 'common', ... },
    { id: 'sharkFin', name: 'SHARK FIN', rarity: 'uncommon', ... },
    { id: 'dinoSpikeCrown', name: 'DINO SPIKE CROWN', rarity: 'rare', ... },
    { id: 'theVolcano', name: 'THE VOLCANO', rarity: 'legendary', ... },
  ],
  body: [
    { id: 'cardboardBox', name: 'CARDBOARD BOX', rarity: 'common', ... },
    { id: 'bumbleArmor', name: 'BUMBLE ARMOR', rarity: 'uncommon', ... },
    { id: 'iceFortress', name: 'ICE FORTRESS', rarity: 'rare', ... },
    { id: 'rainbowShell', name: 'RAINBOW SHELL', rarity: 'legendary', ... },
  ],
  feet: [
    { id: 'clownShoes', name: 'CLOWN SHOES', rarity: 'common', ... },
    { id: 'springBoots', name: 'SPRING BOOTS', rarity: 'uncommon', ... },
    { id: 'lavaWalkers', name: 'LAVA WALKERS', rarity: 'rare', ... },
    { id: 'tornadoStompers', name: 'TORNADO STOMPERS', rarity: 'legendary', ... },
  ],
}
```

---

## Wearable Visual Builder Architecture

Each wearable needs its own builder function because legendary items have ongoing animations (volcano eruptions, rainbow color cycling, tornado particle orbits). The current static `ITEM_VISUALS` registry works for simple box overlays but cannot handle:
- Per-frame animation updates (color cycling, orbiting particles)
- Conditional spawning (lava eruptions every 3s)
- Trail effects (fire trail, tornado funnel)

### Proposed Architecture

```
// In player-model.js:

buildWearable(model, wearableId, rarity)
  -> returns { meshes[], update(dt, st), cleanup() }

updateWearables(model, st, dt)
  -> calls each equipped wearable's update() per frame

removeWearable(model, slot)
  -> calls cleanup(), removes meshes
```

The `update(dt, st)` function handles per-frame animation:
- Common items: no-op (static meshes)
- Uncommon items: simple oscillation/bob
- Rare items: pulse + particle orbit
- Legendary items: full animation (eruptions, color cycling, tornado spawning, trail management)

---

## Drop Rules for Wearables

Wearables use the same rarity weight system as current items (common 50%, uncommon 28%, rare 16%, legendary 6%), but with these additions:

1. **Wearables drop separately from stackable/passive items.** When an enemy drops loot, it rolls once for "is this a wearable or a regular item?" (30% wearable, 70% regular). Then the chosen category rolls rarity.

2. **No duplicate slot drops within 60 seconds.** If the player just picked up a HEAD wearable, the next wearable drop is guaranteed to be BODY or FEET. This prevents the frustrating "I keep getting hats but no boots" situation.

3. **Guaranteed wearable from first boss kill.** First boss always drops a rare or legendary wearable for a slot the player does not have filled yet.

4. **Chill Mode bonus:** Wearable drops use the existing 1.5x powerup rate modifier.

---

## How This Connects to BD-147 (Pickup Fanfare)

BD-147 defines the pickup feedback: screen flash, center announcement, time-dilation, sound. Wearables should use the SAME system but with escalating intensity:

| Rarity | Screen Flash Duration | Flash Opacity | Announcement Duration | Time-Dilation | Font Scale |
|--------|-----------------------|--------------|----------------------|---------------|------------|
| Common | 0.2s | 0.12 | 1.5s | 0.2s at 0.7x | 1.0x |
| Uncommon | 0.3s | 0.15 | 2.0s | 0.3s at 0.6x | 1.1x |
| Rare | 0.4s | 0.20 | 2.5s | 0.4s at 0.5x | 1.2x |
| Legendary | 0.6s | 0.25 | 3.5s | 0.6s at 0.4x | 1.5x |

Legendary wearable pickups ALSO get:
- A brief screen-shake (2-3 pixel offset oscillation for 0.3s)
- The center announcement text pulses scale (1.0 to 1.1, 3Hz)
- The announcement background gets a subtle animated border (rarity-colored box outline that pulses)

---

## Summary: What Julian Gets

By the end of this system, Julian's character can look like this mid-run:

> A jacked-up leopard wearing a VOLCANO on its head (erupting lava rocks every 3 seconds), wrapped in a RAINBOW SHELL that is cycling through every color (reflecting damage as rainbow beams), stomping around in TORNADO STOMPERS (leaving a swirling wind funnel behind him that launches zombies into the air).

That is not a stat sheet. That is a Saturday morning cartoon. That is what a 7-year-old wants.

### Total Item Count After Migration
- 12 wearables (4 per slot x 3 slots)
- 10 instant-apply passives (no slot, just collect)
- 8 stackable items (accumulate freely)
- **30 total items** (up from 25, with dramatically better visual variety)

### Implementation Priority
1. **Phase 1:** Build the 3-slot system with common + uncommon items (8 wearables). This is the foundation.
2. **Phase 2:** Add rare items (4 wearables) with emissive glow + pulse animations.
3. **Phase 3:** Add legendary items (4 wearables) with full per-frame animation systems.
4. **Phase 4:** Migrate existing unique-slot items to passives. Update HUD. Update drop logic.

Each phase is independently shippable and testable.

---

## Research References

This design was informed by:
- **Minecraft's armor progression** -- clear visual tiers (leather/iron/diamond/netherite) where each tier is instantly recognizable by color and silhouette. The 1.20 Armor Trims update showed that visual customization, even without stats, is motivating for players.
- **Fortnite's skin system** -- kids respond to exclusive, visually dramatic cosmetics. FOMO and visual identity drive engagement. The key insight: kids want to LOOK different, not read stat sheets.
- **Fall Guys' costume system** -- simplicity (2 slots), exaggerated proportions, bright colors, and humor. The design team noted that kids create backstories for their costumes and prefer silly/fun over serious/tactical.
- **Roblox's accessory system** -- oversized, colorful accessories that are visible at any camera distance. Social display is a core motivator.
- **General child UX research** -- immediate visual feedback beats subtle stat changes. Bright colors + exaggerated scale = readability. Playfulness over productivity. Every interaction should feel like a celebration.
