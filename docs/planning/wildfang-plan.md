# Animals vs. Zombies

**A Kid-Friendly Roguelike Survivor — Designed by a 7-Year-Old, Built for Everyone**

*Working Title — Confidential Design Pitch*

---

## The Hook

A horde-survival roguelike where adorable-but-fierce animals battle waves of goofy zombies across procedurally generated, vertically rich biomes. The tone is Saturday-morning-cartoon meets gross-out humor — litter boxes as environmental hazards, zombie gargling as ambient soundscape, and every single sound effect performed live by a seven-year-old kid's mouth. That's not a placeholder. That's the feature. The lo-fi mouth-made SFX ("pew pew pew," engine revving for the e-scooter powerup, a wet splat for zombie defeats) give the game an irreplaceable personality that no Foley studio could replicate. It's charming, it's hilarious, and it makes the game instantly memorable in trailers and streams.

---

## Core Fantasy

You're a leopard. Or a lion. Or a red panda with surprising ferocity. Or a gator with a tail-whip that sends zombie parts flying (cartoonishly — think confetti, not gore). You pick your animal, each with an auto-firing signature attack and an active ability you control, and you survive escalating waves of shambling, gargling, goofball undead across terrain that goes UP — hills, ramps, rooftops, cliffs, and floating platforms that reward exploration and create momentum-based spectacle moments.

The audience is kids 6–12 and the parents/siblings who play with them. The skill floor is low. The fun floor is high. You don't need to be good at this game to have a blast — you just need to keep moving, keep picking powerups, and keep laughing.

---

## Combat: Auto-Attack + Active Ability

### Auto-Attacks (Passive — Always Firing)

Like MegaBonk, your default weapon fires automatically. You don't aim it, you don't trigger it. It just goes. This keeps the baseline experience accessible — a 7-year-old only needs to move and the game plays with them.

### Active Ability (Player-Triggered — The Agency Layer)

Each animal has a unique active ability mapped to a single button press. This is the "I did that!" moment — the thing a kid slams when they're surrounded and it feels amazing. Active abilities are on a cooldown (visible, chunky UI element — not subtle), and they give the player a meaningful decision: do I use it now or save it?

| Animal | Auto-Attack | Active Ability |
|---|---|---|
| **Leopard** | Rapid claw swipes — fast, short range, multi-hit | **Pounce Strike** — Dash forward in a line, damaging everything in path. Covers ground fast, doubles as escape. |
| **Lion** | Roar blast — medium range cone AoE, knockback | **Thunderous Roar** — Massive AoE burst centered on self. Stuns all enemies in radius for 2 seconds. Screen shakes. Mouth-made "BWAAAAM." |
| **Red Panda** | Tail spin — 360° close range, brief invuln frames | **Bamboo Barrage** — Launches a ring of bamboo spears outward in all directions. Pins enemies briefly on hit. |
| **Gator** | Tail whip — wide arc, slow, massive damage | **Death Roll** — Spins in place like a buzzsaw for 3 seconds, pulling nearby enemies in and shredding them. Cannot move during channel. High risk, massive reward. |

Active abilities scale with level-up choices, so a kid who loves their lion's roar can invest in making it bigger, faster-cooldown, or add secondary effects. The active ability is always one button — never a combo, never a hold-and-aim. Press it, feel awesome, wait for cooldown, press it again.

### Expanded Roster (Unlockable via Meta-Progression)

| Animal | Auto-Attack | Active Ability |
|---|---|---|
| **Honey Badger** | Frenzied scratches — gets faster at low HP | **Rage Mode** — Temporary invincibility + damage boost. The lower HP when activated, the longer it lasts. |
| **Owl** | Silent feather darts — long range, piercing | **Night Vision Dive** — Swoops from above, bombing a target area. Uses verticality — owl briefly goes airborne and is untargetable. |
| **Skunk** | Stink cloud puffs — short range DoT zones | **Mega Spray** — Giant cone of toxic gas. Enemies inside are slowed, poisoned, and confused. Kid-made "pffffffft" sound is mandatory. |
| **Pangolin** | Armored headbutt — medium range, knockback | **Cannonball** — Curls into a ball and rolls at high speed, bouncing off terrain and enemies. Physics-driven chaos on slopes. |

---

## Verticality & Terrain Physics

### Not Flat — This World Goes Up

The game world is not a flat arena. Terrain has meaningful vertical dimension: hills with real slopes, cliffs with drop-offs, elevated platforms, rooftops, ramps, and floating island chunks in later biomes. The isometric camera (rotatable, character-centered like MegaBonk) handles vertical space clearly with strong depth cues, drop shadows, and height indicators.

### Momentum & Physics

Movement over angled terrain follows real momentum physics. Running downhill accelerates you. Running uphill slows you. Launching off a ramp at speed sends you soaring — and if you've got an e-scooter powerup active, that ramp becomes a launchpad for a spectacular zombie-clearing flight arc. These emergent moments — the ones where a kid goes "DID YOU SEE THAT?!" — are the game's viral clips.

### Collision & Non-Clipping (Hard Rule)

Unit collisions and solid-body physics are non-negotiable:

- **No unit merging.** Animals and zombies cannot occupy the same space. Zombies crowd, they push, they pile — but they don't clip through each other or through the player. This makes positioning meaningful even for young players (back against a wall = dangerous, open space = safe).
- **No terrain clipping.** Units do not merge with terrain geometry. If there's a wall, you stop. If there's a ledge, you fall or you don't. The world is solid and trustworthy. This is critical for the verticality to work — kids need to trust that the ground under them is real.
- **Knockback respects geometry.** When a lion roars and sends zombies flying, they hit walls and stop. They tumble down slopes. They ragdoll off cliffs. Physics-driven outcomes from abilities interacting with terrain create surprise and delight without requiring the player to plan for it.

---

## Powerups (Temporary — No Slots Required)

Powerups are time-limited pickups that drop from elite zombies, environmental objects, or hidden stashes in the terrain. They do NOT take up weapon or howl slots — they layer on top of your existing build. Grabbing a powerup is always a good thing. No inventory management, no trade-offs. Just grab it and go.

### Powerup Roster

**Racecar**
Player hops into a tiny racecar and plows through zombies at high speed for 8 seconds. Full momentum physics apply — hit a ramp and you're airborne, carving through zombie crowds from above. Engine sound: a seven-year-old going "VRRRRRMMMMM." This is the marquee powerup. It should feel incredible every single time.

**E-Scooter**
Significant speed increase for 12 seconds. Unlike the racecar, you keep your weapons and abilities active while riding. The real magic is the momentum interaction with terrain — at e-scooter speed, slopes become launchers. Hit a hill at full speed and you're flying, raining auto-attacks down on the horde below. Balance note: e-scooter doesn't damage on contact (unlike racecar), so it's a mobility tool, not a weapon. The mouth-made electric whine sound is essential.

**Bouncy Boots**
Dramatically increases jump height for 15 seconds. Transforms the vertical terrain from obstacle to playground — bounce up to rooftops, leap over zombie clusters, reach elevated loot platforms. Each bounce has a slight AoE ground-pound on landing that damages and pushes back nearby enemies. Synergizes beautifully with terrain verticality: bouncing down a staircase of platforms becomes a rapid-fire stomp chain.

**Litter Box**
Deployable AoE weapon. On activation, the player's animal kicks a litter box behind them in a cone pattern, spraying litter and... deposits... across the ground. Enemies caught in the initial cone take damage. The turds left behind persist on the ground for 10 seconds as terrain hazards: they slow enemies who walk through them and apply a poison DoT. Absolutely disgusting. Kids will lose their minds. The mouth-made "schhhhhhh-plop-plop-plop" of litter being kicked is peak sound design.

**Butterfly Wings**
Grants flight/hover capability for 15 seconds plus a base move speed increase that persists for 5 seconds after wings expire. While active, the player floats above ground-level threats, can cross gaps and chasms, and gains an elevated vantage that makes their auto-attacks rain down from above. The visual: tiny, sparkly butterfly wings on a gator. Comedy gold.

**Catnip Cloud**
AoE confusion burst. Zombies in radius wander aimlessly and bump into each other for 6 seconds. Confused zombies can trigger fusion accidentally, so this can be a strategic play or a chaotic one.

**Banana Peel Trail**
Leaves a path of slippery peels behind you for 10 seconds. Zombies who hit them pratfall with full ragdoll physics, tumbling down slopes and off ledges. On vertical terrain, this is slapstick perfection.

**Mega Roar**
Screen-clearing burst. Camera shakes, all enemies take massive damage, survivors are knocked back to screen edges. Mouth-made explosion sound. The panic button.

---

## Weapons (Slot-Based — Earned via Auto-Attack Rotation)

Weapons auto-fire like the default attack. The player doesn't aim or trigger them — they cycle automatically. More weapons = more simultaneous attacks = more chaos.

### Slot Progression (Meta-Progression Unlock)

Players start each run with only their default weapon and **1 weapon slot** unlocked. Additional slots are unlocked permanently through meta-progression XP:

| Unlock | Meta-XP Cost | Effect |
|---|---|---|
| Weapon Slot 2 | 500 XP | Second weapon fires alongside default |
| Weapon Slot 3 | 2,000 XP | Third weapon added to rotation |

This pacing means early runs are simpler (fewer choices, less overwhelming), and the game opens up as the kid plays more. By the time they've unlocked slot 3, they understand synergies and are ready for the complexity.

### Weapon Examples

- **Feather Daggers** — Fast projectiles in a spread pattern. High fire rate, low individual damage.
- **Mud Bomb** — Lobs an arcing projectile that explodes on impact, leaving a slow zone.
- **Beehive Launcher** — Fires a beehive that breaks on contact and releases bees that chase nearby enemies.
- **Snowball Turret** — Orbiting turret that fires snowballs at the nearest enemy. Slow on hit.
- **Boomerang Bone** — Thrown in an arc, returns to player, hits enemies both ways. Range increases with level.
- **Stink Line** — Leaves a trail of damage behind the player as they move. Faster movement = more coverage.

---

## Howls (Active Spells — Slot-Based, Auto-Cast on Cooldown)

Renamed from "Tomes" to fit the animal theme. Howls are powerful, flashy abilities that auto-cast when their cooldown completes. They're the big spectacle moments that punctuate the constant auto-attack rhythm.

### Slot Progression (Meta-Progression Unlock)

| Unlock | Meta-XP Cost | Effect |
|---|---|---|
| Howl Slot 1 | 300 XP | First howl slot available |
| Howl Slot 2 | 1,000 XP | Second howl |
| Howl Slot 3 | 3,000 XP | Third howl |
| Howl Slot 4 | 8,000 XP | Fourth howl — full build |

### Howl Examples

- **Stampede** — A herd of wildebeest charges across the screen in a direction, flattening everything in their path.
- **Bird Strike** — A flock of birds dive-bombs a targeted area for sustained damage over 3 seconds.
- **Litter Storm** — Litter boxes rain from the sky across a wide area, each one exploding into turds on impact. Massive slow/poison zone. Absolutely revolting. 10/10.
- **Pack Call** — Summons 3 AI animal companions that fight alongside you for 15 seconds.
- **Earthquake Stomp** — Ground cracks in a line outward from the player. Enemies on the crack take damage and are knocked airborne by the fissure. Terrain-aware: cracks follow slopes.
- **Rainbow Barf** — A sweeping beam attack. Yes, it's a rainbow. Yes, it comes out of the animal's mouth. Yes, the sound effect is a child going "BLEEEEEHHHH." Massive damage.

---

## Items (Passive — No Slots, Stack Freely)

Items are passive stat modifiers and effect triggers that the player collects during a run. Crucially, like MegaBonk, items do NOT consume slots. You can hold as many as you find. This is what drives build variety and encourages experimentation — every item you pick up stacks with everything else you have, creating emergent synergies that feel like discoveries.

### Item Design Philosophy

The no-slot-limit system means kids are never punished for picking something up. There's no "wrong choice" anxiety. Everything is additive. And because items stack and combine, each run naturally diverges into a unique build even if the player picks the same animal and weapons every time. The kid who grabs three speed items has a totally different experience than the kid who stacks damage. Neither is wrong. Both are fun.

### Item Examples

- **Rubber Ducky** — +10% move speed. Stacks. Three ducks and you're zooming.
- **Hot Sauce Bottle** — Auto-attacks have a 15% chance to ignite enemies. Stacks increase chance.
- **Magnet Collar** — Increases XP/pickup vacuum range. Quality of life, always welcome.
- **Lucky Penny** — +8% chance for enemies to drop powerups. Stacks.
- **Thick Fur** — +15 max HP. Simple, reliable, stackable.
- **Silly Straw** — Heal 1 HP per 10 enemies defeated. Sustain item, scales with kill speed.
- **Bouncy Ball** — Projectile weapons gain 1 ricochet. Stacks add more bounces. Synergizes with feather daggers for screen-filling chaos.
- **Alarm Clock** — Howl cooldowns reduced by 8%. Stacks. Four alarm clocks and your howls are nearly constant.
- **Whoopee Cushion** — Enemies that die near you have a 20% chance to explode, dealing AoE damage. Chain reactions possible. The sound effect is exactly what you think it is.

---

## The Zombie Ecosystem

### Base Zombies & Fusion

Low-tier zombies are simple, slow, and plentiful — classic shamble-and-groan fodder. But here's the key mechanic: zombie fusion. When enough low-level zombies cluster together, they merge into evolved forms. This is both a design feature and a performance optimization — clearing dozens of small units off the screen and replacing them with a single, more dangerous, more visually interesting enemy.

**Fusion Tiers:**

- **Shambler** (base) → 5 merge into a **Lurcher** (faster, lunging attack)
- **Lurchers** → 3 merge into a **Bruiser** (tanky, ground-pound AoE)
- **Bruisers** → 2 merge into a **Mega Zombie** (boss-tier, unique ability set per biome)

The fusion happens visually on screen — zombies stumble toward each other, pile up in a comedic heap, and *SPLORTCH* out comes something bigger and meaner. The mouth-made sound effect for this should be peak comedy. Fusion respects collision physics — zombies physically converge, they don't teleport. If the player can scatter them with knockback before fusion completes, they interrupt the merge. This creates tactical moments even for young players: "Oh no, they're bunching up — ROAR!"

### Boss Mega Zombies

Mega Zombies are biome-specific. The swamp Mega Zombie is different from the schoolyard Mega Zombie. They have telegraphed attack patterns a kid can learn to read — big wind-ups, glowing danger zones on the ground, clear safe spots. Challenging but never unfair.

Boss examples:

- **Suburbia: The Lawn Mower** — A massive zombie riding a lawnmower that carves paths through the terrain. Leaves grass clipping slow zones.
- **The Zoo: Zombie Zookeeper** — Throws zombie animals from cages. Mid-fight adds. Telegraphed cage tosses with clear landing zones.
- **Swamp: The Bog Monster** — Emerges from mud pools. Submerges and resurfaces. Vertical attacks (slams from above). Terrain deformation — creates new mud pools as the fight progresses.
- **Schoolyard: The Lunch Lady** — Hurls cafeteria food as projectile attacks. Mystery Meat homing missiles. Jello cubes that bounce across the terrain following physics slopes.

---

## Biomes & Procedural Generation

### Terrain Architecture

Isometric default camera, procedurally generated terrain tiles per biome. The camera is character-centered and rotatable. Terrain generation uses modular tile chunks with hand-designed encounter spaces stitched together procedurally — variety without sacrificing readability. Every tile is visually clean and high-contrast so young players always understand the play space.

Critically, every biome is built with verticality in mind. No flat arenas. Every biome has hills, platforms, elevation changes, and at least one signature vertical feature.

### Biome Roster

**Suburbia**
Lawns, fences, trampolines (bounce pads), sprinklers (slow zones), and litter boxes as interactable objects. Houses have accessible rooftops. Driveways slope into garages (ramp launches). Treehouse platforms as elevated safe zones. Signature vertical feature: two-story houses with destructible roofs — Mega Zombie can smash through from below.

**The Zoo (Ironic)**
Cages as chokepoints, food court areas that drop healing pickups, gift shop shelves as destructible cover. Multi-level enclosures with viewing platforms above and habitats below. Rope bridges between elevated areas. Signature vertical feature: the aviary — a tall enclosed dome with multiple platform layers and flying zombie variants.

**Swamp**
Mud slows movement, lily pads as safe platforms, gator gets a home-field speed buff. Mangrove roots create a tangled elevated network above the bog floor — movement happens on two levels. Signature vertical feature: the cypress canopy — a layer of platforms high above the swamp floor reachable only by bouncing off mushroom caps.

**Schoolyard**
Playground equipment as traversal. Slides = speed boosts. Monkey bars = elevated safe zones. Merry-go-round = spinning damage zone. Dodgeballs as environmental projectiles. Signature vertical feature: the jungle gym — a multi-story climbing structure with multiple paths and levels, acting as a vertical arena for the boss fight.

**Additional Biomes (Unlockable via Meta-Progression)**

- **Junkyard** — Stacked car towers, conveyor belts, crusher hazards. Extreme vertical stacking. Unlocked at 5,000 meta-XP.
- **Haunted Carnival** — Ferris wheel platforms (moving vertical element), roller coaster tracks as rail-grinding paths, hall of mirrors that duplicates zombie visuals (fake-out enemies). Unlocked at 12,000 meta-XP.
- **Space Station** — Low gravity, floating debris platforms, airlock hazards. Maximum vertical freedom. Unlocked at 25,000 meta-XP. New sound effect recording session for space-themed mouth sounds.

---

## Leveling (In-Run Progression)

### Level-Up Flow

On level-up, the player picks from a set of 3 upgrade cards. Options include new weapons, new howls, stat boosts, item pickups, or synergy upgrades for things you already have. Rerolls are available (limited per run, expandable via meta-progression).

Key design mandate: option descriptions are short, visual, and icon-heavy. A 7-year-old should understand what they're picking without reading a paragraph. Each card shows a big icon, a short name ("Beehive Launcher"), a one-line description ("Fires bees that chase zombies!"), and a rarity color border.

### Encouraging Experimentation

The level-up pool is intentionally broad, and the randomization is tuned to push variety. If you picked Feather Daggers last run, the game weights them slightly lower this run and surfaces things you haven't tried. A "NEW!" badge appears on options the player has never selected before, creating a collectionist pull. Kids naturally want to try the thing with the shiny badge.

Additionally, specific combinations trigger "Combo Discovery" pop-ups: "You found a combo! Beehive Launcher + Hot Sauce = FIRE BEES!" These discoveries are logged in a Combo Journal in the menu, giving completionists something to chase across runs. The combo journal is a passive meta-progression tracker — it doesn't gate content, it celebrates exploration.

---

## Meta-Progression (Between Runs)

### Area-Under-the-Curve XP

Total accumulated XP across all runs (not just successful ones) feeds into permanent unlocks. A failed run at wave 3 still contributes progress. Kids never feel like they wasted their time.

### Unlock Tracks

**Slot Unlocks (Mandatory Progression Path)**

| Category | Slots | Unlock Costs (Cumulative Meta-XP) |
|---|---|---|
| Weapons | 1 → 2 → 3 | 500 → 2,000 |
| Howls | 0 → 1 → 2 → 3 → 4 | 300 → 1,000 → 3,000 → 8,000 |
| Rerolls Per Run | 1 → 2 → 3 | 200 → 800 → 2,500 |

**Animal Unlocks**

New animals unlock at meta-XP thresholds. Each unlock comes with a short, illustrated intro screen ("Meet the Honey Badger! She doesn't care!") and a test-drive tutorial wave so the kid can try the new animal's abilities before committing to a full run.

| Animal | Unlock Cost |
|---|---|
| Leopard | Starting |
| Lion | Starting |
| Red Panda | Starting |
| Gator | Starting |
| Honey Badger | 1,500 XP |
| Owl | 4,000 XP |
| Skunk | 7,000 XP |
| Pangolin | 15,000 XP |

**Biome Unlocks**

New biomes unlock at meta-XP thresholds, ensuring the game reveals new environments at a pace that keeps things fresh without overwhelming early.

**Item & Weapon Pool Expansion**

Not all items and weapons are available from run one. The level-up pool starts with a curated "starter set" of simple, easy-to-understand options. As the player accumulates meta-XP, new items and weapons are added to the pool. This means the first few runs are clean and learnable, and the game gets richer over dozens of hours. Each new addition to the pool gets a "NEW ITEM UNLOCKED!" celebration screen. The unlock cadence should feel frequent in early hours and slow down gradually — fast dopamine hits up front, longer-term goals later.

**Cosmetic Unlocks**

Skins, hats, and accessories for animals unlocked via meta-XP or specific achievements ("Defeat the Lunch Lady without taking damage" → Chef's Hat for your animal). Cosmetics are visible in co-op, driving social show-off moments.

---

## Co-op: The Family Mode

### Local splitscreen co-op is a launch feature, not a post-launch add.

This is non-negotiable for the target audience. A parent sitting on the couch with their kid, or two siblings playing together, is the core use case.

- 2-player splitscreen standard, stretch to 4-player
- Drop-in/drop-out mid-run (joining player picks an animal and enters at the current wave)
- Shared XP pool, individual level-up choices
- Revive mechanic: downed players leave a "ghost" that the surviving player can reach to revive — creates natural co-op tension without permanent punishment
- Difficulty auto-scales with player count (more zombies, faster fusion timers)
- Each player controls their own camera rotation independently
- Powerups are first-come-first-served, creating hilarious scrambles ("I SAW THE RACECAR FIRST!")
- Combo Discoveries can be cross-player ("Your Fire + their Bees = FIRE BEES!" counts for both journals)

Online co-op is a roadmap item, not a launch requirement. Get the couch experience perfect first.

---

## The Sound Design Philosophy

This deserves its own section because it's the game's secret weapon. Every sound in the game — attacks, impacts, zombie groans, UI clicks, menu transitions, powerup activations, ambient background — is performed by a child's voice. This is processed lightly (some reverb, some pitch shifting, maybe layering for impact hits) but never so much that it loses the handmade quality.

This does several things at once:

1. **Instant brand identity.** No other game sounds like this. Trailers sell themselves.
2. **Emotional resonance.** Players (especially parents) immediately feel warmth and humor. It disarms any concern about zombie-themed content being too intense for kids.
3. **Content creation gold.** Streamers and YouTubers will clip the sound effects constantly. The e-scooter electric whine alone could be a meme.
4. **Expandability.** New content patches come with new recording sessions. The "sound designer" grows up alongside the game — his voice changing over years of updates becomes part of the lore.

Consider a behind-the-scenes "Recording Studio" section in the game menu where players can listen to the raw recordings with a video or illustration of the recording process. Make the kid a character in the meta-narrative.

---

## Tone & Content Guardrails

The humor lives in the gross-but-harmless zone. Think: fart jokes, booger references, litter box disasters, zombies that fall apart into silly pieces (not blood — maybe stuffing, or slime, or confetti). The word "poop" is inherently hilarious to the target demographic and should be leveraged without shame.

**Hard boundaries:**

- No real violence — zombie "defeats" are cartoonish (they pop, they melt, they go flying off screen)
- No scary imagery — zombies are goofy, round, brightly colored, more "Monster Mash" than "Walking Dead"
- No meanness — humor is never at anyone's expense
- No gambling mechanics or loot boxes — parents are the gatekeepers and this earns their trust

---

## Leaderboards & Social

Leaderboards exist but are opt-in and low-pressure. They're accessible from the menu, not shoved in your face after a run. Categories: longest survival time, most zombies defeated, highest wave reached, most fusions triggered. Friend leaderboards only (no global toxic competition for kids). Weekly "silly stat" leaderboards — "Most Banana Peels Deployed," "Most Times Hit By Your Own Litter Box," "Longest Single Flight with Butterfly Wings."

---

## Monetization

The model should respect the audience (kids and their parents' wallets):

**Premium base game ($14.99–$19.99)** — The full experience, no paywalls on gameplay content.

**Cosmetic DLC packs ($2.99–$4.99)** — Animal skins (Leopard in a tuxedo, Gator with a party hat, Red Panda in a dinosaur costume). Zombie skins for holidays (Santa zombies, pumpkin zombies). Clearly cosmetic, clearly optional.

**Seasonal content drops (free)** — New biomes, new animals, new zombie types, new items/weapons added to the meta-progression pool on a regular cadence. This builds goodwill and keeps the install base active.

**The "Sound Pack" DLC ($1.99)** — A premium expansion where the nephew records a whole new set of sound effects, maybe themed (space sounds, underwater sounds, etc.). Novelty content that plays directly into the game's unique identity. Part of the proceeds go into a college fund — and you tell people that. It's wholesome marketing that's also true.

**Merch tie-in potential** is significant. The animal characters are designed to be cute and iconographic — plushies, t-shirts, stickers. The nephew as "Sound Designer" becomes a lovable public-facing story. This is the kind of indie origin story that gaming press and YouTube documentaries eat up.

**What to avoid:** Battle passes (too much pressure/FOMO for kids), loot boxes (predatory, will get you dragged), pay-to-win anything (kills trust instantly), ads (cheapens the experience, annoys parents).

---

## Platform & Technical Notes

**Target platforms:** Nintendo Switch (mandatory — this is where the kid audience lives), PC (Steam), with console ports (PlayStation/Xbox) as fast follows.

**Performance consideration:** The zombie fusion mechanic isn't just fun — it's a built-in LOD system. Instead of rendering 200 individual shamblers at wave 15, you're rendering 30 shamblers and 8 lurchers and 2 bruisers. Entity count stays manageable. Solid collision on all units adds CPU cost but keeps entity counts honest — no invisible stacking of 50 zombies in one tile that then explodes the physics budget. This is how you ship on Switch hardware without compromise.

**Art style:** Clean, bold, high-saturation, thick outlines. Think Slime Rancher meets Castle Crashers. Characters are readable at small sizes (important for splitscreen). Zombies are visually distinct from animals at a glance — cool-toned vs. warm-toned palette separation. Verticality requires strong silhouette readability and clear drop shadows so players always know what's above and below them.

**Accessibility:** Remappable controls, colorblind modes, adjustable difficulty (a "Chill Mode" where zombies are slower and powerups are more frequent — no shame, no penalty, full progression). Text-to-speech for menus. This audience includes very young players and players with disabilities. Build for them from day one.

---

## Why This Works

The survivor roguelike genre is proven and growing, but it skews older and more hardcore. There is a massive underserved gap in the market for a kid-friendly entry point. Animals vs. Zombies fills that gap with a unique voice — literally. The mouth-made SFX are a once-in-a-lifetime creative asset that no competitor can replicate. The auto-attack-plus-active-ability control scheme gives kids just enough agency to feel heroic without overwhelming them. The vertical terrain and momentum physics create the "DID YOU SEE THAT" moments that drive word-of-mouth. The co-op couch play targets the family gaming moment that Switch owners crave. The zombie fusion mechanic solves both a design problem (escalation) and a technical one (performance). The no-slot item system and meta-progression slot unlocks mean the game starts simple and grows with the player across dozens of hours. And the tone — silly, gross, warm, never mean — is exactly what parents want to hand to their kids.

The game is designed by a seven-year-old. Build it like he's the creative director, because he is.
