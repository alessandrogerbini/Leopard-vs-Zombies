# BD-145: Zombie Attacks -- Improved Design Review

**Status:** Design Recommendations
**Date:** 2026-02-24
**Purpose:** Critically evaluate every tier 2-6 zombie attack through the lens of a 7-year-old player (Julian), and provide specific, actionable improvements.

---

## 0. Guiding Philosophy: The Julian Standard

Before evaluating each tier, here are the principles that every recommendation is measured against. These come from studying what works in kid-friendly games -- Minecraft's Creeper hiss, Fortnite husks' distinct silhouettes, Mario bosses' clear attack patterns -- and from understanding what makes THIS game special: it is built by an uncle and nephew, it has mouth-made sound effects, and the vibe is silly-scary, never punishing.

**The Julian Standard (5 rules):**

1. **The 0.5-Second Rule:** If Julian cannot understand what is happening and what to do in half a second, the telegraph has failed. No reading, no thinking -- pure instinct. "RED ON GROUND = MOVE" is the ideal.

2. **The Couch Test:** Julian is sitting a few feet from a monitor. Everything must be visible at that distance. Telegraphs should be NEON, HUGE, and geometrically simple. A thin yellow line is invisible. A fat screaming-yellow cone that takes up a quarter of the screen is perfect.

3. **The Nickname Test:** Every attack should be so visually distinct that Julian gives it a name. "The stompy one!" "The green goop!" "The one that spits at you!" If two attacks feel samey, one of them needs to change.

4. **The Scare-Not-Punish Test:** The FIRST time Julian encounters an attack, it should make him yell "WHOA!" and maybe take a hit. But the damage should be low enough that he survives, learns, and says "I know how to dodge that now." Death from a special attack on first encounter = bad design.

5. **The Sound Test:** Julian's mouth-made sounds are the soul of this game. Every attack telegraph and impact needs a sound that makes Julian laugh or go "ooooh." Silence during a special attack is a missed opportunity.

---

## 1. Overall Assessment of the Current Design

### What the current design gets RIGHT (keep all of this):

- **One attack per tier.** This is correct and critical. No combos, no multi-phase nonsense. One move, learned once.
- **Telegraph-then-fire state machine.** The `idle -> telegraph -> fire` pattern is clean and extensible.
- **Escalating complexity.** Tier 2 is simple (move away), tier 6 is complex (keep moving). The learning curve is well-paced.
- **Performance budget.** Max 2 meshes per attack (except tier 6 at 5 peak) is smart and realistic.
- **Reusing existing sound effects.** Correct choice for alpha. Julian's sounds are THE feature.
- **Long cooldowns (6-8s).** These are flavor attacks, not DPS tools. The document correctly identifies this.
- **Forgiving damage (5-18 range).** Contact damage is already the primary threat. Good.
- **Enemy freezes during telegraph.** This is important -- it means the telegraph doubles as a brief reprieve from being chased, which is a hidden reward for the player.

### What needs to change across ALL tiers:

1. **Telegraph sizes are too small.** The current design specifies telegraphs at 1:1 or 1.5:1 scale relative to the attack radius. In a chaotic scene with dozens of enemies, these will be invisible. Every telegraph should be AT LEAST 2x the attack radius, ideally 3x. Go big or go home.

2. **Colors are not bright enough.** `0xffaa00` (the "yellow-orange" for tier 2's arrow) is a muted amber that blends with the forest floor. We need NEON: `0xffff00` (screaming yellow), `0xff0000` (pure red), `0x00ff00` (electric green). The forest floor is earthy green-brown -- telegraphs must SCREAM against it.

3. **No body animations during telegraphs.** The current design mentions scale/position changes to the zombie's body parts (arms raising, body crouching), but these are tiny changes on small models that Julian will never notice at a distance. The zombie's ENTIRE BODY should change -- a bright color flash, a visible glow, or a scale pulse. When a zombie is about to attack, it should look DIFFERENT from a zombie that is just walking.

4. **Tier 2 telegraph is too short (0.6s).** This is Julian's FIRST EVER special attack encounter. The first time it happens, he needs time to process "wait, what is that?" before it fires. First-encounter telegraphs should be generous. 0.6s is fine for a veteran player; for a 7-year-old seeing it for the first time, it should be at least 1.0s.

5. **The Bone Spit aim line (tier 4) uses `LineBasicMaterial`.** Lines in Three.js are 1 pixel wide on most GPUs regardless of distance. Julian will literally never see this. It needs to be a fat, flat BoxGeometry "laser sight" strip, not a line.

6. **Tier 5 (Poison Pool) places the pool at the ZOMBIE's position, not the player's.** The design says this is intentional, but it means the pool only threatens the player if they were already right next to the zombie -- which means they were already taking contact damage. This makes the pool redundant. Recommendation: place the pool at the PLAYER's position (where they were at telegraph start) so it actually forces routing decisions.

7. **Tier 6 X markers use crossed lines.** Same problem as the tier 4 aim line -- `LineBasicMaterial` is invisible at distance. The X markers should be flat box meshes or ring geometries, not lines.

---

## 2. Per-Tier Recommendations

### 2.1 Tier 2 -- Lurcher: "LUNGE SNAP"

**Current concept:** Coils back, dashes forward 3 units, snaps jaws. Yellow arrow telegraph.
**Verdict:** Good concept, needs bigger/brighter visuals and a longer first-encounter window.

#### What is good (keep):
- The lunge mechanic is perfect as a "training wheels" attack. It teaches Julian that zombies can do something other than walk.
- 5 damage is correctly forgiving -- it is a slap, not a punishment.
- The dust puff on landing is a nice touch.
- Using the zombie's own body as the "projectile" (it physically moves) is visually clear and memorable.

#### What needs to change:

| Issue | Current | Recommended | Why |
|-------|---------|-------------|-----|
| Telegraph duration | 0.6s | **1.0s** | Julian's first special attack ever. He needs a full second to notice, process, and react. After he has seen it a few times, the 1.0s will feel comfortable, not slow. |
| Arrow color | `0xffaa00` (muted amber) | **`0xffff00` (pure neon yellow)** | The current color is too close to the forest floor palette. Neon yellow pops against green/brown. |
| Arrow size | 2.0 x 0.1 x 0.6 units | **3.5 x 0.15 x 1.0 units (fat triangle, not thin strip)** | The arrow needs to be a FAT wedge shape that Julian can see from across the screen. A triangle built from BufferGeometry with 3 points, not a skinny box. Currently the arrow is already a triangle (good), but its 0.4-unit width is too narrow. Widen to 0.8-1.0 units at the base. |
| Arrow opacity | 0.5 | **0.7** | Brighter. More opaque. Less "ghostly." |
| Zombie body flash | Scale to 80% (crouch) | **Scale to 80% AND flash body to `0xffff00` (match arrow color)** | When the Lurcher coils, its entire body should briefly turn bright yellow. This is a "warning color" -- like a wasp. Julian sees a YELLOW ZOMBIE and knows something is about to happen, even before he notices the arrow. |
| Lunge distance | 3 units | **3 units (keep)** -- but add a **speed visual**: the zombie should leave a brief yellow streak/afterimage (1 flat box, 0.2s lifetime) along its lunge path | The lunge is instant, which means Julian might miss it entirely. A 0.2s yellow streak shows "it just moved REALLY fast from THERE to HERE." |
| Sound (telegraph) | `sfx_player_growl` | **`sfx_player_growl` (keep)** -- the growl is perfect as a "warning" sound | Good match. |
| Sound (impact) | `sfx_melee_hit` | **`sfx_melee_hit` (keep)** -- the bite sound is satisfying | Good match. Consider using the meatiest bite variant (bite-4.ogg) for more impact. |

#### New idea: LUNGE TRAIL

When the Lurcher dashes, leave a fading yellow box behind it (like a speed line in anime). This is 1 flat BoxGeometry (3 x 0.1 x 0.5), color `0xffff00`, opacity 0.4, life 0.3s. It shows Julian the PATH the lunge took, which teaches him that lunges go in straight lines and can be sidestepped. This is a teaching tool disguised as a visual effect.

#### Julian Test:

> Julian is fighting some basic zombies when a Lurcher stops moving. Its whole body flashes BRIGHT YELLOW. A fat glowing yellow arrow appears on the ground pointing right at Julian. Julian has a full second to go "WHOA, what is THAT?!" -- then the Lurcher ROCKETS forward with a yellow speed streak behind it and bites at the air where Julian was standing (because Julian dodged). Julian yells "UNCLE SANDRO, IT JUST JUMPED AT ME!" -- and from that point forward, every time he sees a yellow flash, he knows: MOVE SIDEWAYS.

---

### 2.2 Tier 3 -- Bruiser: "GROUND POUND"

**Current concept:** Raises fists, expanding red ring telegraph, AoE shockwave at 3-unit radius, 8 damage.
**Verdict:** Strong concept. The expanding ring is good visual language. Needs to be bigger and brighter.

#### What is good (keep):
- The expanding ring is EXCELLENT. It visually communicates "this circle is the danger zone" in a way that any kid understands.
- The ring expanding DURING the telegraph means Julian can watch it grow and think "I need to get out before it reaches me." This is interactive and exciting.
- 8 damage is fair. Getting hit once is a lesson, not a death sentence.
- Centering on the zombie's position (not the player's) is correct for this attack -- it teaches Julian to keep his distance from big zombies.

#### What needs to change:

| Issue | Current | Recommended | Why |
|-------|---------|-------------|-----|
| Ring color | `0xff6600` (dark orange-red) | **`0xff2200` (bright red-orange) for inner, `0xff0000` (pure red) for outer edge** | The current color is too muted. This needs to SCREAM "danger zone." Red is universal for "bad, stay away." |
| Ring final size | Radius ~3 units (scale 5) | **Radius ~4 units (increase to scale 7)** | 3 units is tight. In the chaos of combat, Julian might not realize he is inside the ring until it is too late. A 4-unit radius gives the telegraph more screen presence AND gives Julian more time to react (he starts seeing it earlier because it is bigger). Keep the DAMAGE radius at 3 units -- the visual ring should extend 1 unit beyond the actual danger zone as a safety margin. |
| Ring starting opacity | 0.5 | **0.6, with a pulsing glow effect** | The ring should pulse in brightness (0.4 to 0.7) during the telegraph, like a heartbeat. This draws the eye even in chaos. |
| Zombie body animation | Arms raise (position shift) | **Arms raise AND body emissive flashes red (set material.emissive to `0xff2200` during telegraph, then clear)** | Same logic as tier 2: the zombie itself must look DIFFERENT when it is about to attack. A red-glowing Bruiser stands out from the green horde. |
| Impact visual | 6 x 0.2 x 6 BoxGeometry flash | **Replace with a second expanding ring that rapidly scales from 0 to 8 and fades in 0.25s** | A flat box is boring. A ring that EXPLODES outward from the center (like a shockwave in an anime) is thrilling. Julian will go "BOOM!" every time. Use a CylinderGeometry (ring shape) that scales rapidly outward. |
| Telegraph sound | `sfx_power_attack_charge` | **`sfx_power_attack_charge` (keep)** -- the building tension sound is perfect for "something bad is charging up" | Great match. |
| Impact sound | `sfx_explosion` | **`sfx_explosion` (keep)** -- the mouth-made explosion is exactly right for a ground pound | Perfect. |
| Damage radius vs. visual ring | Both 3 units | **Visual ring expands to 4 units, damage stays at 3 units** | The extra 1 unit of visual warning acts as a "safety buffer" -- if Julian is at the edge of the ring, he is NOT actually in danger. This is secretly forgiving while looking scary. |

#### New idea: SCREEN SHAKE (very subtle)

When the ground pound fires, add a tiny camera shake (0.1 units, 0.15s duration). Nothing nauseating -- just enough to make Julian FEEL the impact. If camera shake is too complex to implement in the current system, skip it, but if it is easy, it adds tremendous "juice" for zero gameplay cost.

#### New idea: CRACK MARKS

After the shockwave, leave faint dark lines on the ground radiating from the impact point (3-4 line meshes, `0x443322`, opacity 0.2, life 2s). These are purely cosmetic but they tell a story: "something hit the ground HARD here." Julian will see the cracks and feel like the Bruiser is genuinely powerful.

#### Julian Test:

> Julian is kiting a group of zombies when a big one with a third eye STOPS and starts GLOWING RED. A red ring appears around it and starts GROWING. Julian watches it expand toward his character and yells "IT'S GETTING BIGGER!" He runs backward. The ring reaches its full size -- he is JUST outside it. BOOM! The ground shakes, a shockwave blasts outward, and the Bruiser is standing in a cracked crater. Julian is at 1 HP less than before (wait -- he dodged!). He says: "That was SO close. I need to stay away from the red circles." He has now learned the mechanic forever.

---

### 2.3 Tier 4 -- Brute: "BONE SPIT"

**Current concept:** Opens mouth, aim line telegraph, fires slow bone projectile (speed 8), 10 damage.
**Verdict:** The concept is solid -- first ranged attack teaches Julian to dodge projectiles. But the implementation has critical visibility issues.

#### What is good (keep):
- The concept of a slow, visible projectile that Julian can watch coming and dodge is exactly right.
- Speed 8 (slower than the player) means Julian can outrun it even while walking. Good.
- The spinning bone on Y axis is a nice visual detail that makes the projectile feel "alive."
- Projectile lifetime of 2.5s means it does not clutter the scene.
- 10 damage is a solid sting without being lethal.

#### What needs to change:

| Issue | Current | Recommended | Why |
|-------|---------|-------------|-----|
| **Aim line uses `LineBasicMaterial`** | 1px wide line from zombie to player | **Replace with a flat BoxGeometry strip: 0.3 units wide, 0.1 units tall, length = distance to player. Color `0xffff00` (neon yellow), opacity 0.6, pulsing.** | THIS IS THE BIGGEST ISSUE IN THE CURRENT DESIGN. `LineBasicMaterial` renders as a 1-pixel-wide line on most GPUs regardless of camera distance. Julian will NEVER see a 1px yellow line on a green-brown forest floor while being chased by a dozen zombies. The aim line must be a fat, visible "laser sight" strip that Julian can see at a glance. |
| Aim line length | From zombie's mouth to player position | **Keep, but also add a pulsing "target circle" at the endpoint (player's position at telegraph start)** | The aim line shows the trajectory, but a circle at the end says "THIS IS WHERE IT IS GOING." A RingGeometry (radius 1, inner radius 0.5), color `0xffff00`, flat on the ground, pulsing opacity. 1 extra mesh but huge readability gain. |
| Bone projectile size | 0.3 x 0.15 x 0.15 | **0.5 x 0.3 x 0.3** | The current bone is TINY. At combat camera distance, 0.15 units is a speck. Double the size so Julian can actually track the projectile in flight. |
| Bone projectile color | `0xccccaa` (bone white) | **`0xcccc88` (bone) with emissive `0x444400` (faint glow)** | A non-emissive pale bone is nearly invisible against a sunny forest floor. Give it a subtle self-illumination so it stands out. |
| Bone trail | None | **Add a fading yellow trail behind the bone: 1 small BoxGeometry (0.15 x 0.15 x 0.15) spawned every 0.1s at bone position, life 0.3s, color `0xffdd00`, opacity 0.3** | Actually, this may be too many meshes. SIMPLER ALTERNATIVE: give the bone a bright yellow "glow halo" by adding a second slightly-larger transparent BoxGeometry (0.7 x 0.5 x 0.5, opacity 0.2, color `0xffff00`) as a child of the bone mesh. Zero extra scene objects, just one child mesh. |
| Telegraph duration | 0.8s | **1.0s** | This is the first RANGED attack Julian encounters. He needs time to understand that the line means "a thing is going to fly at me along this path." 1.0s gives him that moment of "oh no, what do I do?" |
| Zombie body animation | Head tilts back | **Head tilts back AND mouth opens wider (scale head up on Y by 1.3) AND body flashes `0xffdd00`** | Again: the zombie itself must look DIFFERENT when attacking. A Brute with its head thrown back and mouth gaping open, body flashing yellow, is unmistakable. |
| Sound (telegraph) | `sfx_weapon_poison` | **Change to `sfx_player_growl`** | The gurgling/gas sound does not match "opening mouth to spit." The growl is a better "rearing back to attack" sound. If a new gurgly/retching sound is available in a future sound pack, use that. For now, the growl is better than the gas. |
| Sound (projectile launch) | `sfx_weapon_projectile` | **`sfx_weapon_projectile` (keep)** -- the "pew" sounds are perfect for a thing flying through the air | The pew-pew is great. Consider specifically using the single-pew variant rather than the triple-pew for a single bone. |
| Projectile hit radius | 1.0 units | **1.2 units** | Slightly more forgiving. The bone is slow and visible -- if it hits Julian, he should feel like "okay, I SAW that coming and failed to move," not "wait, I thought I dodged that." A tiny radius increase helps it feel fair. |

#### New idea: BONE BOUNCES AND ROLLS

When the bone projectile reaches its lifetime limit (2.5s) or passes the target, instead of just disappearing, have it "drop" to the ground (set vy to -5 for a quick fall, then despawn after 0.3s). This is a tiny detail but it makes the projectile feel like a physical THING that was thrown, not a magic bullet that vanishes. Kids love physics.

#### Julian Test:

> Julian is running around when a big toothy zombie STOPS, throws its head back, and its whole body flashes yellow. A fat yellow laser line appears on the ground pointing straight at Julian, with a glowing yellow circle on the ground right where he is standing. Julian has a full second to think "it is going to spit something at me!" He runs sideways. A chunky spinning bone flies out of the zombie's mouth -- Julian can SEE it sailing through the air, trailing a faint yellow glow. It misses him by 2 units and bounces on the ground behind him. Julian turns back to look at it and says: "It SPITS BONES?! That is SO GROSS!" He has now learned: yellow line = dodge sideways.

---

### 2.4 Tier 5 -- Ravager: "POISON POOL"

**Current concept:** Slashes claws into ground, places persistent green poison pool at the zombie's feet. 4 DPS for 4 seconds in a 3-unit radius.
**Verdict:** The concept of area denial is correct for this tier. But placing the pool at the ZOMBIE's position undermines the entire mechanic.

#### What is good (keep):
- Area denial as a concept is the right escalation from "dodge a thing" (tiers 2-4) to "avoid a zone."
- Persistent damage (4s duration) forces Julian to change his movement patterns, not just dodge once.
- Green is the universally understood color for "poison/toxic" -- good choice.
- 4 DPS is correctly low. Standing in the pool for a full second hurts but does not kill.
- The pool persisting after the Ravager dies is smart behavior -- it feels like a real hazard, not a magic trick.

#### What needs to change:

| Issue | Current | Recommended | Why |
|-------|---------|-------------|-----|
| **Pool placement** | At the zombie's position | **At the PLAYER's position (saved at telegraph start), with a random offset of 0-1 units** | THIS IS THE MOST IMPORTANT CHANGE IN THIS DOCUMENT. If the pool spawns at the zombie's feet, the only way Julian gets hit is if he was standing right next to the zombie -- in which case he was already taking contact damage and the pool is redundant. Placing the pool where JULIAN was standing forces him to MOVE AWAY from where he is, which is the entire point of area denial. The random offset (0-1 units) prevents the pool from spawning exactly on the player, giving a tiny grace zone. |
| Pool visual size | CylinderGeometry radius 3 | **RingGeometry (inner 0.1, outer 3), pulsing between outer 2.5 and 3.5** | A solid cylinder on the ground is hard to read as "danger zone." A ring with a visible edge makes the boundary clear. Pulse the outer edge slightly so it shimmers and draws the eye. |
| Pool color | `0x22aa22` (dark green) | **`0x44ff44` (NEON electric green), with inner fill `0x22cc22` at 0.2 opacity** | The current dark green blends into the forest floor. The pool needs to be RADIOACTIVE GREEN -- the kind of green that screams "DO NOT STAND HERE." Think Nickelodeon slime, not swamp water. |
| Pool surface animation | Gentle rotation and opacity pulse | **Keep rotation. Add "bubble" effect: occasionally (every 0.5s) spawn a small green box (0.3 x 0.3 x 0.3) at random position within pool that rises 0.5 units and fades in 0.3s** | Actually, this adds too many meshes. SIMPLER: just pulse the opacity more aggressively (0.2 to 0.5 sinusoidal at double speed) so it "breathes" visibly. The pulsing alone will make it feel alive. |
| Telegraph visual | Pulsing green circle at zombie's position | **Pulsing green circle AT THE PLAYER's saved position** | Matches the new pool placement. The telegraph should appear where the pool will land, not where the zombie is standing. This is the critical change. |
| Telegraph size | Circle radius same as pool | **Circle should be 1.2x the pool radius (3.6 units vs 3.0 damage radius)** | Same "safety buffer" logic as the Bruiser's ring. The telegraph looks scarier than the actual damage zone, which is secretly forgiving. |
| Telegraph duration | 0.7s | **1.0s** | Area denial is a new concept for Julian. He needs a full second to see the green circle, understand "something bad is going to appear there," and run. |
| Trigger range | < 6 units (close range) | **< 10 units** | The current 6-unit range means the Ravager only attacks when Julian is already very close. Since the pool now lands at the PLAYER's position (not the zombie's), the attack can trigger from medium range. This also means the Ravager does not need to be right on top of Julian to use its signature move, making the attack more visible and less of a "wait, what just happened?" moment. |
| Zombie body animation | One arm rears back | **Both arms raise AND claws glow `0x44ff44` (neon green) AND body emissive flashes `0x004400`** | The Ravager has CLAWS as its visual feature. Those claws should GLOW GREEN when it is about to attack. This is the most visually distinct telegraph possible for this tier. |
| Sound (telegraph) | `sfx_weapon_poison` | **`sfx_weapon_poison` (keep)** -- the hissing/gas sound perfectly fits a toxic buildup | Perfect match. The gas/fart sounds are even better for a poison pool. |
| Sound (pool deploy) | `sfx_comedic_drop` | **`sfx_comedic_drop` (keep)** -- the "splat" is exactly right for a pool of goop landing | Great. This is one of Julian's sounds. Perfect. |

#### New idea: POOL SHRINKS VISUALLY OVER TIME

Instead of the pool maintaining full size for 4 seconds then vanishing, have it shrink gradually over the last 2 seconds (scale from 1.0 to 0.0 over the final 50% of lifetime). This gives Julian a visual cue that the pool is "drying up" and teaches him that pools are temporary. It also means he can see that running away and waiting works.

#### Julian Test:

> Julian is fighting some Ravagers when one of them STOPS. Its claws start GLOWING BRIGHT GREEN. A pulsing green circle appears on the ground -- not at the zombie, but RIGHT WHERE JULIAN IS STANDING. Julian yelps "THE GREEN STUFF!" and runs to the side. SPLAT -- a bubbling, pulsing pool of neon green goop materializes right where he was standing. He is 2 units away, safe. The pool sits there for 4 seconds, slowly shrinking. Julian runs AROUND it and says: "I am NOT stepping in that. That is DISGUSTING." He has learned: green circle under me = RUN. He can now navigate around pools for the rest of the game.

---

### 2.5 Tier 6 -- Horror: "GRAVE BURST"

**Current concept:** All eyes glow, channels energy, places 3 red X markers near the player that explode sequentially. 6 damage each, 0.4s apart.
**Verdict:** Most complex attack in the tier 2-6 range. The concept is strong, but the X markers use invisible line geometry and the spacing/timing needs adjustment for a 7-year-old.

#### What is good (keep):
- Sequential explosions that force SUSTAINED movement is the correct capstone mechanic for tier 6.
- Placing markers near the player (not on the zombie) is correct -- this forces the player to move, not just stay away.
- 3 explosions is the right count -- enough to feel dangerous, not so many that it is overwhelming.
- Max potential damage of 18 (if all 3 hit) is only possible if the player stands completely still, which is fair punishment for literally not reacting.
- The Horror has extra side eyes -- having them ALL glow during the telegraph is a great visual idea.

#### What needs to change:

| Issue | Current | Recommended | Why |
|-------|---------|-------------|-----|
| **X markers use `LineBasicMaterial`** | Crossed 1px lines | **Replace with flat CylinderGeometry rings (radius 1.5, inner 0.5) or RingGeometry, color `0xff0000` (pure red), opacity 0.5, pulsing. NOT lines.** | Same problem as tier 4: lines are invisible. These markers are THE ENTIRE TELEGRAPH for the most complex attack in the game. They MUST be visible at a glance. A ring says "explosion here" just as clearly as an X, and it is actually more readable because it shows the RADIUS of the blast. |
| Marker spread pattern | Player position + random 0-2 unit offsets | **Keep the current implementation (line along the direction toward player, spaced at 2/4.5/7 units from zombie).** The implementation in code is better than the spec -- markers are spaced in a LINE toward the player, not random around them. This is much more readable because Julian sees a LINE of danger markers and knows to run SIDEWAYS, not just "somewhere." Keep this. | The code implementation already improved on the spec. |
| Marker size | 0.8-unit X (via lines) | **1.5-unit radius rings on the ground** | The markers need to be big enough that Julian can see all 3 simultaneously and understand the pattern. 1.5-unit radius rings (3 units diameter) are visible even in chaos. |
| Marker color | `0xff2200` | **`0xff0000` (pure red), pulsing between opacity 0.3 and 0.7** | Pure red, aggressive pulsing. These should look like alarm lights flashing on the ground. |
| Explosion visual | 2.5 x 0.8 x 2.5 BoxGeometry | **Replace with a vertical cylinder (radius 1.5, height 3.0) that shoots UPWARD from the ground, color `0xff2200`, opacity 0.5, life 0.4s, scales Y from 0 to 1 over its lifetime** | A flat box on the ground is boring. An ERUPTION -- a column of red energy that shoots UP from the marked spot -- is exciting. Julian sees the ground EXPLODE upward. This is visually dramatic and clearly communicates "if you were standing there, BAD THINGS." The column shape also matches the ring marker shape (circular cross-section), creating visual consistency. |
| Burst timing | 0.4s between each | **0.5s between each** | A little more time between bursts gives Julian a chance to process each one individually. At 0.4s, the bursts almost overlap visually. At 0.5s, each one is a distinct "BOOM...BOOM...BOOM" that Julian can count. |
| Telegraph duration | 1.2s | **1.5s** | This is the most complex attack. Julian needs to see the 3 markers, process that they are in a LINE, and decide to run perpendicular. 1.5s is generous but this is a kid-focused game and this is the hardest attack to read. |
| Zombie body glow | Body emissive to `0x442200` (dim orange) | **Eyes emissive to `0xff0000` (bright red), body emissive to `0x330000` (dark red). ALL eyes should glow, including the side eyes.** | The Horror's defining feature is its extra eyes. During the telegraph, every single eye should be BLAZING RED. The body should have a dark, ominous red underglow. This zombie should look like a walking alarm system. |
| Damage per burst | 6 | **5** | Slightly lower per burst. Max potential (15 if all 3 hit) is still meaningful, but a single burst hitting is not punishing. The explosions are staggered enough that getting hit by all 3 requires standing perfectly still, which is already punished by contact damage. |
| Sound (telegraph) | `sfx_player_growl` | **`sfx_player_growl` (keep, but use the deepest variant)** -- the growl building to the burst sequence is dramatic | Good match. |
| Sound (bursts) | `sfx_explosion` x3 | **`sfx_explosion` x3 (keep)** -- the sequential mouth-made explosions will sound like "BOOM BOOM BOOM" which is exactly what Julian will yell along with | Perfect. The staggered explosions create a rhythm that Julian will mimic out loud. |

#### New idea: RUMBLE MARKERS

Instead of static rings, the markers should visually "rumble" -- jitter their position by 0.05 units per frame (random X and Z offsets) during the telegraph. This makes them look like the ground is shaking under them, building anticipation. Simple to implement (just add random jitter in the telegraph animation loop), huge atmospheric payoff.

#### New idea: ASCENDING INTENSITY

The 3 explosions should get BIGGER, not stay the same size. Burst 1: radius 1.0, height 2.0. Burst 2: radius 1.3, height 2.5. Burst 3: radius 1.5, height 3.0. This creates an escalating "the last one is the biggest!" feeling that is incredibly satisfying. Kids love escalation.

#### Julian Test:

> Julian sees a big ugly zombie with tons of EYES and they are ALL GLOWING RED. It stops and raises its arms. Three red pulsing CIRCLES appear on the ground in a LINE stretching from the Horror toward Julian. The circles are shaking, rumbling. Julian has 1.5 seconds of pure "OH NO." He runs to the LEFT (perpendicular to the line of markers). The first circle ERUPTS -- a column of red energy shoots up from the ground. BOOM! Then the second one, bigger -- BOOM! Then the third, the BIGGEST -- BOOM! Julian is safely to the side, watching the line of explosions like fireworks. He yells: "UNCLE SANDRO! THE ONE WITH ALL THE EYES JUST MADE THE GROUND EXPLODE! THREE TIMES!" From now on, red circles on the ground in a line = run sideways.

---

## 3. Cross-Tier Recommendations

### 3.1 Universal "About to Attack" Signal

Every tier should share ONE common visual cue that says "this zombie is about to do something special," on top of the tier-specific telegraph. Recommendation: **when any zombie enters the telegraph state, briefly pulse its entire body scale to 1.15x and back to 1.0x over 0.2 seconds (a quick "inhale" motion).** This is the universal "it is winding up!" signal. Julian will learn to associate this body pulse with "special attack incoming" regardless of tier.

This is already partially implemented -- the Lurcher crouches. But it should be universal: every tier does the scale pulse, then does its own unique thing.

### 3.2 Floating Text on First Encounter

The FIRST TIME Julian encounters each tier's special attack in a run, show a floating text label above the zombie: "LUNGE!", "GROUND POUND!", "BONE SPIT!", "POISON POOL!", "GRAVE BURST!" in the attack's signature color. This only happens ONCE per tier per run (tracked in state). After the first encounter, no text -- Julian has learned the name.

This uses the existing `st.floatingTexts3d` system. Zero new infrastructure needed.

### 3.3 Damage Scaling with Difficulty

The current design uses flat damage values (5, 8, 10, 4/s, 6x3). These should scale with difficulty:

| Difficulty | Damage Multiplier | Rationale |
|-----------|-------------------|-----------|
| Chill | 0.5x | Julian is 7. First encounters should be survivable even if he does not dodge. |
| Easy | 0.75x | Still forgiving. |
| Normal | 1.0x | As designed. |
| Hard | 1.3x | Challenge seekers get punished more. |

This can use the existing `st.zombieDmgMult` or be a separate multiplier. The important thing is that on Chill Mode, the Lurcher's lunge does 2-3 damage -- barely a scratch -- so Julian learns without pain.

### 3.4 Chill Mode Longer Telegraphs

On Chill Mode specifically, all telegraph durations should be 1.5x longer:

| Tier | Normal Telegraph | Chill Telegraph |
|------|-----------------|-----------------|
| 2 | 1.0s | 1.5s |
| 3 | 1.0s | 1.5s |
| 4 | 1.0s | 1.5s |
| 5 | 1.0s | 1.5s |
| 6 | 1.5s | 2.25s |

This gives Julian even more time to learn each attack pattern on the difficulty designed for him.

### 3.5 Sound Effect Pairing Recap

Revised sound mapping with tier-specific personality:

| Attack Phase | Tier 2 (Lunge) | Tier 3 (Pound) | Tier 4 (Spit) | Tier 5 (Pool) | Tier 6 (Burst) |
|-------------|----------------|----------------|----------------|----------------|-----------------|
| Telegraph | `sfx_player_growl` | `sfx_power_attack_charge` | `sfx_player_growl` | `sfx_weapon_poison` | `sfx_player_growl` |
| Fire/Hit | `sfx_melee_hit` | `sfx_explosion` | `sfx_weapon_projectile` | `sfx_comedic_drop` | `sfx_explosion` x3 |

Change from original: Tier 4 telegraph changed from `sfx_weapon_poison` to `sfx_player_growl` (growl fits a head-rearing-back motion better than a gas sound).

---

## 4. Summary of All Recommended Changes

### Tier 2 -- Lurcher: LUNGE SNAP
- Increase telegraph duration: 0.6s to **1.0s**
- Arrow color: `0xffaa00` to **`0xffff00`**
- Arrow size: wider base (0.8-1.0 units), more opaque (0.7)
- Flash zombie body yellow during telegraph
- Add yellow speed-streak on lunge (1 box mesh, 0.3s life)

### Tier 3 -- Bruiser: GROUND POUND
- Ring color: `0xff6600` to **`0xff2200`**
- Ring final visual radius: 3 to **4 units** (damage stays at 3)
- Add ring opacity pulsing during telegraph
- Flash zombie body red emissive during telegraph
- Replace box impact with expanding shockwave ring animation

### Tier 4 -- Brute: BONE SPIT
- **Replace LineBasicMaterial aim line with fat BoxGeometry strip** (0.3 units wide)
- Add target circle (RingGeometry) at aim endpoint
- Increase telegraph duration: 0.8s to **1.0s**
- Increase bone size: 0.3x0.15x0.15 to **0.5x0.3x0.3**
- Add faint emissive glow to bone
- Flash zombie body yellow and gape head during telegraph
- Change telegraph sound from `sfx_weapon_poison` to `sfx_player_growl`

### Tier 5 -- Ravager: POISON POOL
- **Move pool placement from zombie position to PLAYER position** (saved at telegraph start)
- Pool color: `0x22aa22` to **`0x44ff44`** (neon green)
- Increase telegraph duration: 0.7s to **1.0s**
- Increase trigger range: 6 to **10 units**
- Telegraph circle appears at player position, not zombie position
- Flash Ravager's claws bright green during telegraph
- Pool shrinks over final 50% of lifetime

### Tier 6 -- Horror: GRAVE BURST
- **Replace line X-markers with RingGeometry ground markers** (radius 1.5)
- Marker color: `0xff2200` to **`0xff0000`** (pure red), aggressive pulsing
- Add marker position jitter ("rumble" effect)
- Increase telegraph duration: 1.2s to **1.5s**
- Increase burst spacing: 0.4s to **0.5s**
- Replace flat box explosions with vertical eruption columns
- Ascending explosion sizes (each bigger than the last)
- All eyes glow `0xff0000` during telegraph
- Reduce per-burst damage: 6 to **5**

### Universal Changes
- All zombies do a 0.2s scale pulse (1.0 to 1.15 to 1.0) when entering telegraph
- First encounter per tier per run shows floating attack name
- Damage scales with difficulty (Chill 0.5x, Easy 0.75x, Normal 1.0x, Hard 1.3x)
- Chill Mode gets 1.5x longer telegraphs

---

## 5. Implementation Priority

If time is limited, implement these changes in this order (highest impact first):

1. **Fix Tier 4 aim line** (LineBasicMaterial to BoxGeometry) -- currently invisible, breaks the entire attack.
2. **Fix Tier 6 X markers** (LineBasicMaterial to RingGeometry) -- same problem.
3. **Move Tier 5 pool to player position** -- fixes the core design flaw.
4. **Increase all telegraph durations** -- cheap change, huge readability gain.
5. **Brighten all colors to neon** -- cheap change, huge visibility gain.
6. **Add zombie body flash during telegraphs** -- moderate effort, big "it looks DIFFERENT" payoff.
7. **Add first-encounter floating text names** -- low effort, high charm.
8. **Chill Mode scaling** -- low effort, critical for Julian specifically.
9. **Bigger telegraph visuals** (arrow, ring, bone sizes) -- moderate effort, nice-to-have.
10. **Explosion columns, lunge streak, crack marks** -- polish, do last.

---

## 6. Research References

Design principles drawn from analysis of enemy attacks in kid-friendly games:

- [Enemy Attacks and Telegraphing (Gamedeveloper.com)](https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing) -- Core principle: "players must know damage is coming and understand what questions they are being asked."
- [Keys to Combat Design: Anatomy of an Attack (GDKeys)](https://gdkeys.com/keys-to-combat-design-1-anatomy-of-an-attack/) -- Anticipation should be longer for bigger effects; unique silhouettes let players discern threats at mid-range.
- [Enemy Design in Games (GameDesignSkills)](https://gamedesignskills.com/game-design/enemy-design/) -- Players should quickly distinguish which enemies pose a major threat. Visual distinctiveness is paramount.
- [WildStar's Telegraph-based Combat System](https://www.greenyneko.com/2019/07/wildstars-legacy-telegraph-based-combat.html) -- Animated stripes and clear ground indicators help detect telegraphs under visual noise; color-blindness considerations suggest using shape AND color.
- [Power Fantasy Through Rapid Escalation (Vampire Survivors analysis)](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors) -- Simplified controls and clear feedback loops keep the cognitive load low; positioning is the primary player skill.
- [Fortnite Husk Monsters design](https://fortnite.fandom.com/wiki/Husk_Monsters) -- Each husk type is stylized enough to tell apart from a distance; Sploders telegraph by raising their propane tanks; Lobbers use visible colored projectile arcs.
- [Minecraft Creeper design](https://minecraft.fandom.com/wiki/Creeper) -- The hiss is a masterclass in audio telegraph; 1.5s warning window before explosion; silent approach creates tension while the audio cue provides a fair chance to escape.
- [The Level Design Book: Enemy Design](https://book.leveldesignbook.com/process/combat/enemy) -- Advocate for unique silhouettes; animations that telegraph enemy state, intent, and strengths/weaknesses.
