# Wildfang Gap Analysis: Current State vs. Open Beta Target

**Date:** 2026-02-22
**Author:** Gap analysis generated from project documentation
**Inputs:** `../planning/wildfang-plan.md` (design vision), `../planning/wildfang-current-status.md` + `../../README.md` (current state), plus supporting architecture, code review, sprint, and audit documents

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Summary](#current-state-summary)
3. [Open Beta Target Summary](#open-beta-target-summary)
4. [Gap Analysis by System](#gap-analysis-by-system)
   - [Playable Animal Roster](#1-playable-animal-roster)
   - [Combat System: Active Abilities](#2-combat-system-active-abilities)
   - [Weapons System](#3-weapons-system)
   - [Howls (Tomes/Scrolls)](#4-howls-tomesscrolls)
   - [Items (Passive Equipment)](#5-items-passive-equipment)
   - [Powerups](#6-powerups)
   - [Zombie Ecosystem & Fusion](#7-zombie-ecosystem--fusion)
   - [Biomes & Procedural Generation](#8-biomes--procedural-generation)
   - [Verticality & Terrain Physics](#9-verticality--terrain-physics)
   - [Leveling & In-Run Progression](#10-leveling--in-run-progression)
   - [Meta-Progression (Between Runs)](#11-meta-progression-between-runs)
   - [Co-op / Multiplayer](#12-co-op--multiplayer)
   - [Sound Design](#13-sound-design)
   - [Art Style & Visual Polish](#14-art-style--visual-polish)
   - [UI/UX & Accessibility](#15-uiux--accessibility)
   - [Leaderboards & Social](#16-leaderboards--social)
   - [Platform & Deployment](#17-platform--deployment)
   - [Monetization & Distribution](#18-monetization--distribution)
   - [Technical Architecture & Code Health](#19-technical-architecture--code-health)
5. [Dependency Map](#dependency-map)
6. [Risks & Blockers](#risks--blockers)
7. [Priority Summary](#priority-summary)

---

## Executive Summary

The game is a playable, feature-rich browser prototype with two functioning game modes, 4 animal characters, 6 weapons, 18 powerups, a 10-tier zombie merge system, procedural terrain, and deep in-run progression. It is emphatically not yet the game described in the planning document.

The planning document envisions a premium, multi-platform, kid-friendly roguelike survivor with 8+ playable animals (each with unique active abilities), a physics-driven vertical world, local co-op, mouth-made sound effects, a full meta-progression system, biome-specific boss zombies, and a monetizable product with cosmetics and seasonal content. The current build is a single-player, keyboard-only browser game with no sound, no meta-progression, no co-op, 3 flat biomes, no boss encounters in 3D mode, and a monolithic codebase that cannot be safely extended by multiple contributors.

The gap is substantial but well-defined. This document catalogs every identified gap, organized by system, and notes what exists, what is needed, and the relative complexity and priority of closing each gap.

---

## Current State Summary

**What exists today:**

- A fully playable browser game with two modes: a 2D side-scrolling platformer (3 levels, boss fights) and a 3D top-down roguelike survivor (infinite, wave-based)
- 4 playable animals (Leopard, Red Panda, Lion, Gator) with unique stat profiles and starting weapons
- 3D mode features: 6 weapon types with 5 upgrade levels, 6 scroll types (passive buffs), 18 powerups, 11 equipment items, 20 shrines with 8 augment types, 8 difficulty totems, 10-tier zombie merge system, wave events every 4 minutes, charged power attack
- Procedural infinite terrain with 3 biomes (forest, desert, plains), chunk-based loading, platforms and decorations
- Level-up upgrade menu with 3 rerolls per run
- Per-difficulty leaderboards stored in browser localStorage
- Zero external dependencies beyond Three.js (loaded via CDN)
- ~12,400 lines of vanilla JavaScript across 8 files, no build step
- Zero automated tests
- Zero sound effects or music
- Keyboard-only input (no gamepad, no touch, no mobile)
- Single-player only
- No meta-progression between runs
- No deployment to any public platform

**Key technical concerns:**
- `game3d.js` is a 4,500-line monolith that cannot be tested, debugged, or safely modified in parallel
- Two confirmed P0 bugs (for-in iteration mutation, event listener memory leak)
- No performance profiling has been conducted
- CDN dependency is unpinned (no SRI hash)

---

## Open Beta Target Summary

The planning document describes the fully realized vision for the game. Not all of this is necessarily required for an "open beta," but the document represents the intended feature set and design philosophy. Key elements:

- **8 playable animals** (4 base + 4 unlockable via meta-progression), each with a unique auto-attack AND a unique active ability
- **Physics-driven vertical terrain** with slopes, ramps, cliffs, rooftops, momentum, and ragdoll knockback
- **7 biomes** (4 base + 3 unlockable), each with a signature vertical feature and biome-specific mega zombie boss
- **Zombie fusion system** with 4 visual tiers (Shambler -> Lurcher -> Bruiser -> Mega Zombie), with biome-specific bosses at the top tier
- **Weapons** that auto-fire alongside the default attack, with meta-progression slot unlocks (1 -> 2 -> 3 slots max)
- **Howls** (renamed from Tomes/Scrolls): powerful auto-cast abilities on cooldown, with meta-progression slot unlocks (0 -> 1 -> 2 -> 3 -> 4)
- **Items with no slot limit** that stack freely, creating emergent build variety
- **8 powerup types** (temporary, no slots, always beneficial)
- **Full meta-progression** system: area-under-curve XP across all runs feeding into permanent unlocks (animal unlocks, slot unlocks, biome unlocks, item/weapon pool expansion, cosmetics)
- **Local split-screen co-op** as a launch feature (2-player standard, stretch to 4)
- **Mouth-made sound effects** by a 7-year-old as the core audio identity
- **Level-up system** with card-based upgrades, weighted randomization favoring variety, combo discovery journal
- **Leaderboards** (friend-only, opt-in, with silly stat categories)
- **Platform targets:** Nintendo Switch (mandatory), PC (Steam), with console ports as fast follows
- **Premium pricing** ($14.99-$19.99) with cosmetic DLC and free seasonal content
- **Accessibility:** remappable controls, colorblind modes, "Chill Mode" difficulty, text-to-speech for menus
- **Art style:** Clean, bold, high-saturation, thick outlines (Slime Rancher meets Castle Crashers)
- **Tone:** Saturday-morning-cartoon meets gross-out humor, never scary, never mean

---

## Gap Analysis by System

### 1. Playable Animal Roster

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Base roster size | 4 animals | 4 animals | None for base roster |
| Unlockable animals | 0 | 4 (Honey Badger, Owl, Skunk, Pangolin) | 4 animals to design, model, and implement |
| Animal differentiation | Stat profiles only (speed/damage/HP) + different starting weapons | Unique auto-attack + unique active ability per animal | Major redesign of combat identity |
| Active abilities | None exist | 8 unique abilities (Pounce Strike, Thunderous Roar, Bamboo Barrage, Death Roll, Rage Mode, Night Vision Dive, Mega Spray, Cannonball) | Entirely new system |
| Visual identity | Box-model 3D bipedal models | "Cute and iconographic" characters readable at small sizes and in splitscreen | Visual upgrade needed |

**Complexity:** HIGH. The active ability system is an entirely new combat layer. Each of the 8 animals needs a unique auto-attack behavior and a unique active ability with cooldown, scaling, and visual effects. The 4 unlockable animals also need full 3D models.

**Priority:** HIGH. Animal identity is core to the game's appeal and replay value. The active ability system is the primary "agency layer" for players.

**Dependencies:** Requires meta-progression system for unlock gating. Active abilities need the combat system redesign.

---

### 2. Combat System: Active Abilities

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Active ability system | Does not exist | Single-button press, per-animal unique ability, visible cooldown, scales with level-up choices | Entirely new |
| Auto-attack behavior | Generic auto-attack on nearest enemy | Per-animal unique auto-attack pattern (rapid swipes, roar cone, tail spin, tail whip) | Needs per-animal differentiation |
| Power attack | Hold Enter 0-2s, release for AoE burst | Not mentioned in plan (may be replaced by active ability) | Design decision needed |
| Combat feel | Functional but minimal feedback | "Press it, feel awesome" with screen shake, visual spectacle, mouth-made SFX | Significant polish gap |

**Complexity:** HIGH. This is a fundamental combat system redesign, not an incremental addition.

**Priority:** HIGH. The plan explicitly calls this the "I did that!" moment and the core player agency beyond movement.

**Dependencies:** Requires per-animal auto-attack differentiation. Level-up system needs to offer ability scaling choices.

---

### 3. Weapons System

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Weapon count | 6 (Claw Swipe, Bone Toss, Poison Cloud, Lightning Bolt, Fireball, Boomerang) | 6+ examples given (Feather Daggers, Mud Bomb, Beehive Launcher, Snowball Turret, Boomerang Bone, Stink Line) | Full roster redesign; current weapons are placeholder-tier compared to plan's thematic weapons |
| Max weapon slots | 4 (unlock at levels 1/5/10/15 via in-run progression) | 3 max (unlock at 500/2,000 meta-XP via meta-progression) | Slot count reduction; unlock mechanism changes from in-run to between-run |
| Weapon slot unlocks | Per-run (level thresholds) | Permanent (meta-progression XP) | Fundamental unlock model change |
| Auto-fire behavior | Weapons fire independently on cooldown | Weapons auto-fire alongside default attack | Similar, but default attack is now per-animal |
| Weapon upgrade system | 5 levels per weapon, stat improvements | Level-up choices can improve weapons | Similar concept, details may vary |
| Weapon themes | Generic fantasy (claws, bones, poison, lightning, fire) | Animal/kid-themed (feather daggers, mud bombs, beehives, snowballs) | Thematic overhaul needed |

**Complexity:** MEDIUM. The auto-fire weapon system already exists. The work is: redesign weapon roster to match theme, change slot unlock from per-run to meta-progression, and reduce max slots from 4 to 3.

**Priority:** MEDIUM. The weapon system works; changes are primarily thematic and meta-progression-related.

**Dependencies:** Requires meta-progression system for slot unlocks.

---

### 4. Howls (Tomes/Scrolls)

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| System name | "Scrolls" (6 types: Power, Haste, Arcane, Vitality, Fortune, Range) | "Howls" (renamed from Tomes) | Name change + conceptual redesign |
| Current function | Passive stat buffs that stack | Powerful auto-cast abilities on cooldown (Stampede, Bird Strike, Litter Storm, Pack Call, Earthquake Stomp, Rainbow Barf) | Complete functional redesign: from passive buffs to active auto-cast spells |
| Slot system | No slots; scrolls stack freely | 4 slots max, unlocked via meta-progression (300/1,000/3,000/8,000 XP) | New slot-gated system |
| Visual spectacle | Stat modifications only (no visual) | "Big spectacle moments" with screen-filling effects | Major visual effects work |

**Complexity:** HIGH. The current scroll system is a passive buff system. The planned Howl system is an auto-casting spell system with dramatic visual effects, cooldowns, and slot management. This is essentially a brand new system that replaces the current one.

**Priority:** HIGH. Howls are described as "the big spectacle moments that punctuate the constant auto-attack rhythm."

**Dependencies:** Requires meta-progression for slot unlocks. Requires significant visual effects work.

---

### 5. Items (Passive Equipment)

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Item count (3D) | 11 items | 9+ examples given (Rubber Ducky, Hot Sauce Bottle, Magnet Collar, Lucky Penny, Thick Fur, Silly Straw, Bouncy Ball, Alarm Clock, Whoopee Cushion) | Roster redesign needed |
| Slot system | Slot-based (1 item per slot: armor, glasses, boots, ring, etc.) | **No slots, no limit**, items stack freely | Fundamental system change: remove slot restriction |
| Stacking | One per slot (mutual exclusion within slot) | Unlimited stacking; "three Rubber Duckies and you're zooming" | New stacking behavior |
| Synergies | No explicit synergy system | Emergent synergies from stacking + combo discovery ("Beehive Launcher + Hot Sauce = FIRE BEES!") | New combo system |
| Design philosophy | Traditional RPG equipment slots | "Never punished for picking something up," no wrong choices, pure additive | Philosophy shift |
| Themes | Generic RPG (Leather Armor, Chainmail, Crit Gloves) | Kid-themed (Rubber Ducky, Whoopee Cushion, Silly Straw) | Thematic overhaul |
| Pool expansion | All items available from run 1 | Curated starter set; new items unlock via meta-progression XP | Requires meta-progression |

**Complexity:** MEDIUM-HIGH. The slot system needs to be removed and replaced with unlimited stacking. Item roster needs thematic redesign. Combo discovery system is a new feature layer.

**Priority:** MEDIUM. Items are important for build variety but the existing system is functional as a placeholder.

**Dependencies:** Meta-progression for pool expansion. Combo discovery system is a new UI/tracking feature.

---

### 6. Powerups

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Count (3D mode) | 18 types | 8 types (Racecar, E-Scooter, Bouncy Boots, Litter Box, Butterfly Wings, Catnip Cloud, Banana Peel Trail, Mega Roar) | Current has more variety, but plan has more curated/polished set |
| Physics interaction | Minimal (speed boosts, damage buffs) | Deep physics: ramp launches, momentum, terrain-interactive (Racecar hits ramps, E-Scooter on slopes, Banana Peels cause ragdoll on slopes) | Requires physics/verticality system |
| Visual spectacle | Functional effects | "Marquee" moments: "Racecar should feel incredible every single time" | Major polish gap |
| Sound design | None | Mouth-made SFX for every powerup activation | Requires sound system |
| Racecar | Exists (speed + damage) | "Hit a ramp and you're airborne, carving through zombie crowds" with mouth-made engine sound | Needs verticality + sound |
| E-Scooter | Not present as named item | Speed boost + momentum on slopes + keep weapons active | New powerup type + terrain physics |
| Bouncy Boots | Exists as Jumpy Boots | AoE ground-pound on landing, stomp chains down staircases | Needs landing damage + vertical terrain |
| Litter Box | Exists | Cone spray pattern, persistent turd hazards (slow + poison DoT, 10s) | Needs enhancement |
| Butterfly Wings | Exists as Angel Wings | Flight + hover + speed persistence after expiry | Similar, may need polish |

**Complexity:** MEDIUM. Many powerups already exist in some form. The gap is primarily in physics interaction (requires verticality system) and audiovisual polish.

**Priority:** MEDIUM. Powerups work; the gap is polish and terrain integration.

**Dependencies:** Strongly depends on verticality/terrain physics system. Depends on sound system.

---

### 7. Zombie Ecosystem & Fusion

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Merge system | 10 tiers, same-tier collision merge into next tier | 4 visual tiers: Shambler -> 5 merge to Lurcher -> 3 merge to Bruiser -> 2 merge to Mega Zombie | Different merge ratios and tier structure |
| Merge visuals | Instant merge on collision | "Zombies stumble toward each other, pile up in a comedic heap, and SPLORTCH" with interruptible convergence animation | Major visual upgrade |
| Merge interruptibility | Not interruptible | Player can scatter zombies with knockback to interrupt merge | New mechanic |
| Mega Zombie bosses | No bosses in 3D mode | Biome-specific boss zombies with telegraphed attack patterns (Lawn Mower, Zombie Zookeeper, Bog Monster, Lunch Lady) | Entirely new boss system |
| Zombie collision | Zombies can overlap | "No unit merging" - zombies crowd and push but never clip through each other or the player | Solid-body collision physics for all units |
| Zombie visuals | Tier-based scaling with glowing eyes, horns, auras | "Goofy, round, brightly colored, more Monster Mash than Walking Dead" | Visual style redesign |
| Zombie tone | Generic undead | Cartoonish, silly, non-scary; "defeats" are pops/melts/flying off screen, not violence | Tone adjustment |

**Complexity:** HIGH. The 10-tier system needs restructuring to the 4-tier model. Boss zombies are an entirely new system. Solid-body collision for all units is a significant physics change. Interruptible merge is a new mechanic.

**Priority:** HIGH. The zombie ecosystem is the core gameplay antagonist. Boss encounters are major content milestones.

**Dependencies:** Boss system depends on biomes (biome-specific bosses). Solid-body collision is a fundamental physics change that affects everything.

---

### 8. Biomes & Procedural Generation

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Biome count | 3 (Forest, Desert, Plains) | 7 (Suburbia, The Zoo, Swamp, Schoolyard + 3 unlockable: Junkyard, Haunted Carnival, Space Station) | 4-7 entirely new biomes (current 3 don't match plan's biomes at all) |
| Biome identity | Color palette + decoration differences | Fully themed with unique environmental mechanics, interactable objects, traversal features, and signature vertical features | Massive content gap |
| Environmental interactables | None | Trampolines, sprinklers, merry-go-rounds, slides, monkey bars, conveyor belts, ferris wheels, etc. | New interaction system |
| Destructible terrain | None | Destructible roofs (Suburbia), terrain deformation (Swamp) | New terrain system |
| Signature vertical features | Flat terrain with platforms | Two-story houses, aviary dome, cypress canopy, jungle gym, car towers, ferris wheel, floating debris | Requires complete verticality system |
| Biome-specific boss | None | Each biome has a unique Mega Zombie boss | 7 unique boss encounters |
| Environmental hazards | None | Litter boxes, sprinkler slow zones, mud slow zones, crusher hazards, airlock hazards | New hazard system |
| Biome unlocks | All available | 4 base biomes; 3 unlockable via meta-progression (5,000/12,000/25,000 XP) | Requires meta-progression |
| Camera | Fixed top-down | Isometric, rotatable, character-centered | Camera system redesign |

**Complexity:** VERY HIGH. The current biome system is a simple noise-based color/decoration swap. The plan envisions fully realized, mechanically distinct worlds with unique interactables, traversal mechanics, environmental hazards, and boss encounters. This is essentially building 7 distinct level themes from scratch.

**Priority:** HIGH for base biomes, MEDIUM for unlockable biomes. Biome variety is a core content pillar.

**Dependencies:** Depends on verticality system, meta-progression, boss system, environmental interaction system.

---

### 9. Verticality & Terrain Physics

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Terrain geometry | Flat ground with elevated platforms | Hills with real slopes, cliffs, drop-offs, ramps, rooftops, floating islands | Complete terrain geometry overhaul |
| Momentum physics | No momentum system | Downhill acceleration, uphill deceleration, ramp launches | New physics system |
| Slopes | None | Real slopes that affect movement speed and projectile trajectories | New terrain feature |
| Jump/fall physics | Basic jump with gravity | Fall off cliffs, ledge detection, height-based fall damage (implied) | Enhanced physics |
| Knockback + geometry | Basic knockback | "Zombies hit walls and stop, tumble down slopes, ragdoll off cliffs" | Physics-driven knockback interacting with terrain |
| Depth cues | Minimal | "Strong depth cues, drop shadows, height indicators" for clear vertical readability | Visual system upgrade |
| Unit collision | Partial | "No unit merging, no terrain clipping" - full solid-body physics | Fundamental physics change |
| Camera handling of verticality | Top-down camera | Isometric camera with rotation that handles vertical space clearly | Camera system redesign |

**Complexity:** VERY HIGH. This is arguably the single largest architectural gap. The current game has flat terrain with rectangular platforms. The plan envisions a full 3D physics-driven terrain system with slopes, momentum, ragdoll, and solid-body collision. This touches rendering, physics, enemy AI, combat, powerups, and camera systems.

**Priority:** CRITICAL. The plan explicitly states: "Not Flat -- This World Goes Up." Verticality is a core differentiator and many other systems depend on it (powerup interactions, knockback, biome features).

**Dependencies:** Nearly everything depends on this. Powerup physics interactions, biome vertical features, boss encounters, and the planned "DID YOU SEE THAT" viral moments all require the terrain physics system.

---

### 10. Leveling & In-Run Progression

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Level-up flow | Choose from 3-4 options (weapons, weapon upgrades, scrolls) | Choose from 3 upgrade cards (weapons, howls, stat boosts, items, synergy upgrades) with visual cards | Similar structure, different content |
| Card presentation | Text-based menu | "Big icon, short name, one-line description, rarity color border" - visual card UI | UI redesign |
| Rerolls | 3 per game (fixed) | Starts at 1, expandable to 3 via meta-progression | Requires meta-progression |
| Weighted randomization | Not implemented | Weights against recently picked options, surfaces untried things | New algorithm |
| "NEW!" badge | Not implemented | Badge on never-selected options | New UI feature |
| Combo Discovery | Not implemented | Pop-up notifications for discovered synergies, logged in Combo Journal | New system |
| Combo Journal | Not implemented | Menu-accessible journal tracking all discovered combos | New UI/tracking feature |
| 7-year-old readability | Text descriptions | "A 7-year-old should understand what they're picking without reading a paragraph" - icon-heavy, minimal text | UI/UX redesign priority |

**Complexity:** MEDIUM. The level-up system exists and works. Gaps are: UI visual polish (cards), weighted randomization algorithm, combo discovery/journal features, and integration with the redesigned weapon/howl/item systems.

**Priority:** MEDIUM. The system works; improvements are polish and meta-progression integration.

**Dependencies:** Depends on weapon/howl/item system redesigns for content. Depends on meta-progression for reroll expansion.

---

### 11. Meta-Progression (Between Runs)

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Meta-XP system | Does not exist | Area-under-the-curve XP that accumulates across all runs (including failed ones) | Entirely new |
| Weapon slot unlocks | Per-run (level-based) | Permanent via meta-XP (500/2,000) | System migration |
| Howl slot unlocks | N/A (scrolls have no slots) | Permanent via meta-XP (300/1,000/3,000/8,000) | New system |
| Reroll unlocks | 3 fixed per run | Expandable via meta-XP (200/800/2,500) | New system |
| Animal unlocks | All 4 available from start | 4 starting + 4 unlockable at meta-XP thresholds (1,500/4,000/7,000/15,000) | New unlock gates |
| Animal unlock experience | Instant | Illustrated intro screen + test-drive tutorial wave | New content per animal |
| Biome unlocks | All biomes available | 4 starting + 3 unlockable at meta-XP thresholds (5,000/12,000/25,000) | New unlock gates |
| Item/weapon pool expansion | All content available from run 1 | Curated starter set; new items/weapons added to pool via meta-XP | New pool management system |
| "NEW ITEM UNLOCKED!" | Does not exist | Celebration screen for each new pool addition | New UI |
| Cosmetic unlocks | None | Skins, hats, accessories via meta-XP or achievements | New content system |
| Persistence | localStorage leaderboards only | Full meta-progression state persistence | Expanded persistence |

**Complexity:** HIGH. Meta-progression is a completely new system that touches nearly every other system (weapons, howls, items, animals, biomes, rerolls, cosmetics). It requires persistent state management, unlock logic, UI for showing progress, and careful pacing design.

**Priority:** CRITICAL. Meta-progression is what transforms a single-session arcade game into a multi-session game with long-term engagement. Multiple other systems (weapon slots, howl slots, animal unlocks, biome unlocks) are gated behind it.

**Dependencies:** Essentially a prerequisite for the planned versions of weapons, howls, items, animal roster, and biome progression.

---

### 12. Co-op / Multiplayer

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Local co-op | None | 2-player splitscreen (standard), stretch to 4-player | Entirely new |
| Drop-in/drop-out | N/A | Mid-run join with animal selection and current wave entry | Complex implementation |
| Shared XP | N/A | Shared XP pool, individual level-up choices | New system |
| Revive mechanic | N/A | Ghost left by downed player, surviving player can reach to revive | New mechanic |
| Difficulty scaling | N/A | Auto-scales with player count (more zombies, faster fusion) | Dynamic scaling |
| Camera | Single camera | Each player controls their own camera rotation independently | Multi-camera system |
| Powerup sharing | N/A | First-come-first-served | Minor design choice |
| Cross-player combos | N/A | Fire + Bees = FIRE BEES counts for both journals | Combo journal integration |

**Complexity:** VERY HIGH. Local co-op is one of the most architecturally demanding features. It requires splitscreen rendering, independent camera control, multi-player input handling, shared game state with individual progression, and dynamic difficulty scaling. The current monolithic architecture makes this especially difficult.

**Priority:** The plan states co-op is "non-negotiable for the target audience" and "a launch feature, not a post-launch add." However, for an open beta, it may be acceptable to launch single-player with co-op as a fast follow.

**Dependencies:** Requires the monolith decomposition (game3d.js split) to be viable. Requires gamepad support. Requires camera system redesign for splitscreen.

---

### 13. Sound Design

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Sound effects | Zero -- completely silent | Every sound in the game performed by a child's voice (mouth-made SFX) | Entirely new |
| Music | None | Not explicitly detailed but implied ambient soundscape | Needed |
| Audio processing | N/A | "Lightly processed (some reverb, some pitch shifting, maybe layering)" while preserving handmade quality | Audio pipeline needed |
| Audio system | No audio system exists | Full audio playback with per-event SFX triggering | Web Audio API integration |
| Recording Studio menu | N/A | In-game section where players can listen to raw recordings | New feature |
| Sound Pack DLC | N/A | Premium expansion with themed sound packs ($1.99) | Monetization content |

**Complexity:** MEDIUM for basic audio integration, HIGH for the full vision. Adding Web Audio API playback is straightforward. Recording, editing, and processing the mouth-made SFX is a production effort outside the codebase. The Recording Studio feature is additional UI work.

**Priority:** HIGH. The plan describes sound as "the game's secret weapon" and "instant brand identity." This is the primary differentiator in marketing and streaming.

**Dependencies:** Requires audio asset production (recording sessions with the 7-year-old). Requires Web Audio API integration in the codebase.

---

### 14. Art Style & Visual Polish

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Character models | Box-model bipedal figures (chunky/charming) | "Clean, bold, high-saturation, thick outlines. Think Slime Rancher meets Castle Crashers" | Style upgrade needed |
| Zombie visuals | Tier-based scaling with glow/horn/aura | "Goofy, round, brightly colored, more Monster Mash than Walking Dead" | Tone/style adjustment |
| Camera | Fixed top-down | Isometric, rotatable, character-centered (like MegaBonk) | Camera system redesign |
| Silhouette readability | Basic | "Readable at small sizes (important for splitscreen)" with warm/cool palette separation | Enhanced readability design |
| Depth cues | Minimal | "Strong depth cues, drop shadows, and height indicators" for vertical space | New visual systems |
| VFX spectacle | Functional particles and effects | Screen shake, camera effects, spectacular powerup activations | Polish pass needed |
| Splitscreen readability | N/A (single player) | Characters must be readable at splitscreen sizes | Design constraint for co-op |

**Complexity:** HIGH. Art style upgrades touch every visual element in the game. The camera redesign from top-down to rotatable isometric is a significant rendering change.

**Priority:** MEDIUM for overall polish, HIGH for the camera redesign (which is architecturally significant).

**Dependencies:** Camera change interacts with terrain/verticality system. Splitscreen readability depends on co-op implementation.

---

### 15. UI/UX & Accessibility

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Gamepad support | None (keyboard only) | Required for console targets (Switch mandatory) | Must add |
| Touch/mobile input | None | Not explicitly required but implied for broad accessibility | Consider adding |
| Remappable controls | None | Explicitly required in accessibility section | Must add |
| Colorblind modes | None | Explicitly required | Must add |
| "Chill Mode" | None | Slower zombies, more frequent powerups, no shame, no penalty, full progression | New difficulty mode |
| Text-to-speech | None | Required for menus | Accessibility feature |
| Cooldown visualization | Basic HUD text | "Visible, chunky UI element -- not subtle" for active ability cooldown | UI redesign |
| Upgrade card UI | Text-based list | Visual cards with big icons, short names, rarity borders | UI redesign |
| Age-appropriate UI | Functional | "A 7-year-old should understand what they're picking" -- icon-heavy, minimal text | UX redesign priority |

**Complexity:** MEDIUM-HIGH. Gamepad support is moderate complexity. Remappable controls requires an input abstraction layer. Accessibility features (colorblind, TTS) are moderate. The UI redesign for age-appropriateness affects every menu screen.

**Priority:** HIGH for gamepad (blocks console targets), MEDIUM for accessibility features.

**Dependencies:** Gamepad support is a prerequisite for console targets and co-op. Input abstraction layer should be built before remapping.

---

### 16. Leaderboards & Social

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Leaderboard storage | Browser localStorage | Friend leaderboards (implies online/platform integration) | Needs online infrastructure |
| Leaderboard visibility | Accessible from game-over screen | Menu-accessible, opt-in, low-pressure | UX adjustment |
| Categories | Highest score per difficulty | Longest survival, most kills, highest wave, most fusions, weekly silly stats | Multiple new categories |
| Global vs friend | Local only (no friends concept) | Friend leaderboards only (no global toxic competition) | Requires friend/account system |
| Silly stat leaderboards | Not implemented | "Most Banana Peels Deployed," "Longest Single Flight with Butterfly Wings," etc. | New stat tracking + UI |

**Complexity:** MEDIUM for stat tracking (mostly new counters), HIGH for friend leaderboards (requires online infrastructure, accounts, or platform integration).

**Priority:** LOW for open beta. Leaderboards can ship as local-only initially and expand to friends later.

**Dependencies:** Friend leaderboards depend on platform deployment (Steam friends, Switch friends, etc.).

---

### 17. Platform & Deployment

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Current platform | Browser only (local files) | Nintendo Switch (mandatory), PC (Steam), PlayStation/Xbox (fast follows) | Massive platform gap |
| Deployment | Not deployed anywhere | Multi-platform distribution | Requires native builds |
| Game engine | Vanilla JS + Three.js in browser | Needs console-capable engine/runtime | Likely requires engine migration or native wrapper |
| Performance on hardware | Unknown (no profiling) | "Ship on Switch hardware without compromise" | Performance optimization + Switch-specific work |
| Build system | None | Required for console deployment, minification, asset bundling | Must implement |
| Public availability | Not available | Published game with storefronts | Distribution setup |

**Complexity:** VERY HIGH. Deploying a browser-based Three.js game to Nintendo Switch is not a simple port. This likely requires either: (a) a complete engine migration to a console-capable framework (Unity, Godot, etc.), or (b) a native wrapper approach (Electron for PC, custom WebGL runtime for Switch). Neither is trivial.

**Priority:** HIGH for at least one public deployment target. The game should be playable by people outside the development team. A browser deployment (itch.io, GitHub Pages) could serve as an open beta platform while console ports are developed.

**Dependencies:** Console deployment depends on virtually every other system being complete or near-complete. Browser deployment could happen much sooner.

---

### 18. Monetization & Distribution

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Pricing model | Free (no distribution) | Premium $14.99-$19.99 | Requires storefront setup |
| Cosmetic DLC | None | Animal skins, zombie skins for holidays ($2.99-$4.99) | New content system |
| Seasonal content | None | Free biomes, animals, zombie types, items/weapons on regular cadence | Ongoing content pipeline |
| Sound Pack DLC | None | Themed mouth-made SFX packs ($1.99) | Content + distribution |
| Merch potential | N/A | Plushies, t-shirts, stickers based on animal characters | Out of scope for codebase |
| Anti-patterns | N/A | No battle passes, loot boxes, pay-to-win, ads | Design constraint |

**Complexity:** MEDIUM. The monetization system itself is straightforward (cosmetics, DLC). The complexity is in building a cosmetic system (skin swapping, visual customization) and setting up distribution channels.

**Priority:** LOW for open beta. Monetization can follow after the game is polished and deployed.

**Dependencies:** Requires platform deployment. Cosmetics require art assets and a skin system.

---

### 19. Technical Architecture & Code Health

| Aspect | Current State | Open Beta Target | Gap |
|--------|--------------|-----------------|-----|
| Codebase structure | 4,500-line monolith (game3d.js) | Modular architecture supporting multiple contributors and testing | Monolith decomposition |
| Test coverage | Zero tests | At minimum, core pure functions tested | Test suite needed |
| Build system | None | Required for console targets and production deployment | Must implement |
| P0 bugs | 2 confirmed (for-in mutation, event listener leak) | Zero ship-blocking bugs | Must fix |
| P1 bugs | 7 identified (cooldown drift, opacity guard, state cleanup, etc.) | Should be resolved | Bug fixes needed |
| Performance | Not profiled | Must run at 60fps on Switch hardware | Profiling + optimization |
| Memory management | Known leak patterns | Clean resource lifecycle | Disposal audit + fixes |
| Three.js resource disposal | Incomplete (no recursive disposal) | Full disposal on all code paths | Fix disposal patterns |
| Input abstraction | Direct key checks scattered throughout | Abstracted input layer supporting keyboard, gamepad, potentially touch | Input system redesign |

**Complexity:** HIGH for monolith decomposition (the current-status doc identifies this as the project's biggest liability). MEDIUM for bug fixes and testing. HIGH for the full input abstraction.

**Priority:** CRITICAL. The monolith blocks: parallel development, testing, co-op implementation, and safe feature additions. Bug fixes are immediate. Performance profiling should happen before optimization work.

**Dependencies:** Monolith decomposition enables nearly everything else. The sprint plan already identifies a decomposition path (BD-32) with 4 prerequisite P2 beads.

---

## Dependency Map

The following shows which gaps block other gaps:

```
CRITICAL PATH:

  Monolith Decomposition (19)
    |
    +---> Co-op / Multiplayer (12)
    +---> Test Suite (19)
    +---> Safe parallel feature development

  Verticality & Terrain Physics (9)
    |
    +---> Biome Vertical Features (8)
    +---> Powerup Physics Interactions (6)
    +---> Knockback + Terrain (7)
    +---> Momentum / Ramp Launches (6, 9)
    +---> Boss Encounter Design (7, 8)

  Meta-Progression System (11)
    |
    +---> Weapon Slot Unlocks (3)
    +---> Howl Slot Unlocks (4)
    +---> Reroll Expansion (10)
    +---> Animal Unlocks (1)
    +---> Biome Unlocks (8)
    +---> Item/Weapon Pool Expansion (5)
    +---> Cosmetic Unlocks (18)

  Active Ability System (2)
    |
    +---> Per-Animal Auto-Attack (1, 2)
    +---> Ability Scaling in Level-Up (10)

  Sound Asset Production (13)
    |
    +---> Audio System Integration (13)
    +---> Sound Pack DLC (18)

  Input Abstraction Layer (15)
    |
    +---> Gamepad Support (15)
    +---> Remappable Controls (15)
    +---> Console Deployment (17)
    +---> Co-op Input Handling (12)

  Camera System Redesign (14)
    |
    +---> Isometric View (14)
    +---> Splitscreen Rendering (12)
    +---> Vertical Depth Cues (9, 14)
```

**Shortest critical path to a viable open beta (browser):**
1. Fix P0 bugs
2. Decompose monolith
3. Implement meta-progression
4. Implement active ability system
5. Redesign weapon/howl/item systems
6. Add sound system + initial SFX
7. Add gamepad support
8. Deploy to itch.io or similar

**Features that can be deferred past open beta:**
- Console deployment (Switch, PS, Xbox)
- Co-op / splitscreen
- Unlockable animals and biomes
- Cosmetic system
- Monetization infrastructure
- Friend leaderboards
- Full verticality/terrain physics (can ship with enhanced platforms as an intermediate step)

---

## Risks & Blockers

### Technical Risks

1. **Monolith decomposition risk (HIGH).** The 4,500-line `game3d.js` function is the project's biggest technical liability. The sprint plan identifies a decomposition path, but executing it without regressions requires careful work and ideally a test suite that does not yet exist. Every sprint that adds features before decomposing increases the eventual cost.

2. **Engine/platform migration uncertainty (HIGH).** The plan targets Nintendo Switch as a mandatory platform. A browser-based Three.js game cannot run on Switch without either a full engine migration or a custom native runtime. This is a large, uncertain effort that has not been scoped or planned. It may turn out that the game needs to be rebuilt in Unity, Godot, or another console-capable framework.

3. **Performance ceiling (MEDIUM).** No profiling has been done. Known patterns (per-frame array allocations, sqrt in inner loops, individual particle updates) may already be problematic. The plan calls for "ship on Switch hardware without compromise," which is a very demanding performance target for a web-technology-based game.

4. **Zero test coverage (MEDIUM).** Every change is validated by manual playtesting. As the feature set grows toward the open beta target, the regression surface grows with it. The merge history already shows 6-12 conflict merges.

### Design Risks

5. **Scope vs. resources (HIGH).** The gap between current state and the full planning document is enormous: 4 new animals, 4+ new biomes, a physics-driven terrain system, a co-op mode, a meta-progression system, a sound design pipeline, a boss encounter system, and platform deployment to consoles. Without a clear scope cut for the open beta milestone, there is a risk of building indefinitely toward an unreachable target.

6. **Verticality as a load-bearing feature (HIGH).** The plan designs many systems around terrain verticality (powerup physics, biome features, boss encounters, "DID YOU SEE THAT" moments). If verticality proves too expensive or complex to implement well, many downstream systems lose their design rationale.

7. **Sound asset production dependency (MEDIUM).** The mouth-made SFX are described as the game's "secret weapon" and core identity. This requires scheduling recording sessions with a 7-year-old child, which introduces real-world scheduling constraints, unpredictability, and a dependency on a single person's participation.

### Process Risks

8. **Two confirmed P0 bugs remain unfixed (LOW but immediate).** The for-in mutation bug (BD-16) and event listener leak (BD-17) have been identified but are still present. These are small fixes (under 50 lines each) and should be resolved before any further feature work.

9. **Documentation debt (LOW).** While documentation has improved significantly (README, ARCHITECTURE, CONTRIBUTING, full JSDoc pass), the codebase continues to evolve. Stale documentation can be worse than no documentation if it misleads contributors.

---

## Priority Summary

### Must-Have for Open Beta (Critical)

| # | Gap | Complexity | Depends On |
|---|-----|-----------|-----------|
| 1 | Fix P0 bugs (for-in mutation, event listener leak) | LOW | Nothing |
| 2 | Decompose game3d.js monolith | HIGH | P0 fixes, P2 prerequisite beads |
| 3 | Meta-progression system (between-run XP, permanent unlocks) | HIGH | Persistence layer |
| 4 | Active ability system (per-animal unique ability) | HIGH | Combat system redesign |
| 5 | Sound system + initial mouth-made SFX | MEDIUM | Audio asset production |
| 6 | Gamepad support | MEDIUM | Input abstraction layer |
| 7 | Deploy to at least one public platform (browser: itch.io) | LOW | Nothing significant |

### Should-Have for Open Beta (High)

| # | Gap | Complexity | Depends On |
|---|-----|-----------|-----------|
| 8 | Howl system (auto-cast spells replacing scrolls) | HIGH | Meta-progression for slot unlocks |
| 9 | Item system redesign (no-slot, unlimited stacking) | MEDIUM | Level-up system integration |
| 10 | Weapon roster thematic redesign | MEDIUM | Weapon system exists |
| 11 | Zombie tier restructure (4-tier with interruptible fusion) | MEDIUM | Collision physics |
| 12 | At least 2 biomes redesigned to match plan's themes | HIGH | Verticality system (partial) |
| 13 | Level-up card UI visual overhaul | MEDIUM | Nothing significant |
| 14 | Basic accessibility (colorblind mode, Chill Mode difficulty) | MEDIUM | Nothing significant |
| 15 | Performance profiling and optimization pass | MEDIUM | Nothing significant |
| 16 | Minimal automated test suite | MEDIUM | Monolith decomposition helps |

### Nice-to-Have / Post-Beta (Medium-Low)

| # | Gap | Complexity | Depends On |
|---|-----|-----------|-----------|
| 17 | Full verticality/terrain physics (slopes, momentum, ramps) | VERY HIGH | Major engine work |
| 18 | 4 unlockable animals (Honey Badger, Owl, Skunk, Pangolin) | HIGH | Meta-progression, active abilities |
| 19 | Biome-specific boss encounters (Mega Zombies) | HIGH | Biome system, boss AI |
| 20 | Local co-op / splitscreen | VERY HIGH | Monolith split, gamepad, camera redesign |
| 21 | 3 unlockable biomes (Junkyard, Haunted Carnival, Space Station) | HIGH | Meta-progression, biome system |
| 22 | Combo Discovery system + Combo Journal | MEDIUM | Item/weapon synergy definitions |
| 23 | Camera redesign (isometric, rotatable) | HIGH | Rendering pipeline changes |
| 24 | Console deployment (Switch, PC/Steam, PS/Xbox) | VERY HIGH | Nearly everything else |
| 25 | Cosmetic system (skins, hats, accessories) | MEDIUM | Art assets, meta-progression |
| 26 | Friend leaderboards with silly stat categories | MEDIUM | Online infrastructure |
| 27 | Monetization infrastructure (DLC, storefront) | MEDIUM | Platform deployment |
| 28 | Recording Studio in-game menu section | LOW | Audio assets |
| 29 | Remappable controls | MEDIUM | Input abstraction layer |
| 30 | Text-to-speech for menus | LOW | Accessibility framework |

---

## Closing Note

The current game is a functional, feature-rich prototype that demonstrates strong game design instincts and rapid development velocity. The planning document describes an ambitious, fully realized commercial product. The gap between the two is large but well-defined, and the existing codebase provides a solid foundation to build from -- provided the monolith decomposition and meta-progression system are addressed early, as they are prerequisites for most of the planned feature work.

The most important near-term decision is scope definition for the open beta: which subset of the planning document's vision constitutes a releasable, testable product that can gather player feedback while the remaining features are built? This gap analysis is intended to inform that decision.
