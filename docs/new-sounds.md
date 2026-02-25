# New Sounds Needed -- Recording Brief for Julian

## How to Read This Document

This is a comprehensive sound request list for **Leopard vs Zombies**, a 3D roguelike survivor game. The current sound pack ("Sound Pack Alpha") was recorded by a 7-year-old in a single take -- mouth-made effects with tons of personality. Many of them work great and are staying. But the game has grown significantly since then: boss battles, 11 weapon types, shrines, totems, death sequences, and more. This document catalogs every gap, placeholder, and silent moment so you know exactly what to record.

**Format notes:**
- "Priority" means how often the player hears it and how much it matters to gameplay feel.
- "Duration" is approximate -- shorter is almost always better for game SFX.
- All sounds should be mono, mouth/voice-performed, and match the playful-but-intense tone of the existing pack.

---

## Missing Sounds (No Audio File Exists)

These event IDs are defined in the code but have **empty file arrays** -- calling them produces silence.

| Event ID | When It Plays | Mood/Tone | Duration | Priority |
|----------|---------------|-----------|----------|----------|
| `sfx_powerup_generic` | Player picks up any powerup crate that is not Wings or Race Car (most powerups: Berserker Rage, Earthquake Stomp, Ghost Form, Frost Nova, Bomb Trail, etc.). Plays very frequently. | Bright, satisfying pop -- like unwrapping a present. A short "bwip!" or ascending two-note chirp. Should feel rewarding but not overpowering since it plays constantly. | 0.2-0.4s | **CRITICAL** |
| `sfx_xp_pickup` | Player walks over an XP gem (tiny green diamond). Happens 5-15 times per second during combat. Currently totally silent. | Tiny crystalline "tink" or "pip" -- the smallest, most delicate sound in the whole game. Think a fingernail tap on a glass, but pitched up. Needs to not be annoying at rapid repetition. 2-3 pitch variants would be ideal. | 0.1-0.15s | **CRITICAL** |
| `sfx_item_pickup` | Player picks up an equipment item (armor, boots, bracelet, wearable). Happens a few times per run. Currently silent. | Satisfying equip/latch sound -- a short "click-clunk" like snapping on a piece of gear. Slightly heavier and more deliberate than the powerup sound. Should feel like "I got something good." | 0.3-0.5s | **HIGH** |
| `sfx_death_sting` | Plays at the exact moment the game-over screen appears, after the 1.5s slow-motion death sequence. The final emotional punctuation of the run. Currently commented out as TODO. | A dramatic descending tone or minor-key "wah-waaah" -- comedic defeat energy, not grim. Think sad trombone but mouth-made. Or a short deflating "pbbbt... aww." Should contrast with the intensity of the death sequence. | 0.8-1.2s | **HIGH** |

---

## Placeholder Sounds (Reusing Wrong File)

These events have audio, but are borrowing files from unrelated events. They technically make noise, but the sound does not match the gameplay moment.

| Event ID | Currently Uses | Why It's Wrong | What It Should Sound Like | Priority |
|----------|----------------|----------------|---------------------------|----------|
| `sfx_boss_entrance` | `zombie-4.ogg` (big zombie groan) | A regular zombie groan does not sell the drama of a massive boss materializing. The boss scales up from near-zero size over 1.5 seconds with screen shake -- it needs a sound that builds. | Deep rumbling crescendo -- starts as a low tremor and builds to a heavy thud. Like a distant earthquake approaching, then a final "BOOM" when the boss fully appears. Mouth-rumble building to a chest-voice impact. | **HIGH** |
| `sfx_boss_phase_transition` | `rawr-2.ogg` (player power attack sound) | Same sound as the player's level-up. Boss rage moments should sound distinctly threatening, not celebratory. The boss body flashes white and floating text says "ENRAGED!" or "BERSERK!" | Angry roar with a cracking/breaking quality -- like something snapping and the beast getting louder. A guttural snarl that ramps up in intensity. Should feel like "oh no, it's angrier now." | **HIGH** |
| `sfx_boss_dark_nova` | `zombie-4.ogg` (same as boss entrance) | Dark Nova is the Overlord's ultimate attack: it floats up, slams down, and sends an expanding ring of death outward. Sharing a sound with the entrance removes all distinctiveness. | Two-part sound: (1) rising hum/whoosh as boss floats up, like air being sucked inward, then (2) a massive low-frequency slam/boom when it crashes down. The "sucking in" part is key -- converging energy. | **HIGH** |
| `sfx_boss_charge_telegraph` | `leapord-growl-1.ogg` (player's growl) | This is the player's signature sound. When the Titan boss uses it for its charge telegraph, it sounds like the player is growling at themselves. The Titan Charge is a 15-unit dash with a red aim line -- it needs a distinctly enemy sound. | Heavy, threatening snort or bull-charge breath -- like a massive creature lowering its head and huffing before a rush. Short intake of breath followed by a low rumbling exhale. "HHNNNRRR." | **HIGH** |
| `sfx_boss_shadow_zone` | `gas-1.ogg` (poison cloud gas) | Shadow Zones are dark purple damaging circles that erupt from the ground. A gas/fart sound completely undercuts the menace. These are supposed to be ominous dark-magic zones. | Dark, ominous eruption -- a low "VOOOM" or a muffled underground rumble that surfaces. Think of shadows spreading across the floor with a deep, resonant pulse. Eerie and unsettling, not gassy. | **HIGH** |
| `sfx_boss_death_beam` | `pew-5x-1.ogg` (multishot pew) | The Death Beam is a massive sweeping red laser that rotates 60 degrees over 2 seconds. "Pew pew pew pew pew" makes it sound like a toy gun instead of a devastating beam weapon. | Sustained charging/firing hum -- a rising electrical whine that peaks into a continuous buzzing beam sound. Like "eeeEEEEZZZZZZ." Should sustain for at least 1 second since the beam sweeps across the arena. | **HIGH** |
| `sfx_boss_death_bolt` | `big-pew-1.ogg` (player's heavy weapon fire) | Death Bolt Volley fires 3-5 red homing spheres in a spread pattern. The player's "big pew" is meant for fireball/lightning -- bosses should have their own sound vocabulary. | Sharp, aggressive energy burst -- a crackling "KZZT" or electric snap. Like a Tesla coil discharge but mouth-made. Quick and percussive, with a hint of malice. Each bolt should sound like it could hurt. | **MEDIUM** |
| `sfx_boss_summon` | `zombie-5.ogg` (high-tier zombie death) | The Overlord channels dark energy (body tilts back, purple particles converge) and then spawns a ring of zombie minions. A zombie death groan is the opposite mood -- this should sound like dark creation, not destruction. | Creepy summoning chant or groan that builds -- start low and breathy, then layer in a rising "oooOOOOaahh." Like something calling creatures out of the ground. Dark, ritualistic energy. | **MEDIUM** |
| `sfx_boss_slam_impact` | `explode-1.ogg` (generic explosion) | Used for Titan Slam (8-unit AoE ground pound), Bone Barrage landing, and Ground Fissure eruption. The generic explosion is used for too many things already. A ground slam should feel like earth cracking, not a fireball. | Heavy earthen impact -- a deep "CRUNCH-THOOM" with a sense of weight and debris. Like a giant fist hitting dirt. Heavier and lower than an explosion, with a slight reverb tail suggesting the ground shaking. | **MEDIUM** |
| `sfx_shrine_break` | `explode-1.ogg` (generic explosion) | Shrines are mystical stone/crystal objects. When smashed (3 hits) they grant an augment. An explosion sound does not fit stone-breaking at all. Also reused for charge shrine completion. | Crystal/stone shattering -- a bright, sharp "CRASH-tinkle" with a slight magical shimmer at the end. Like breaking a ceramic pot but with a brief sparkly afterglow. Two variants would be nice: one for break, one for charge shrine completion (more chime-like). | **MEDIUM** |
| `sfx_player_death` | `falling-scream-1.ogg` (falling scream) | The falling scream is great for falling off platforms but is currently also the death sound. Player death now has a dedicated 1.5s slow-motion sequence with camera zoom -- it needs a distinct death sound, not a falling scream. | Short, pained "URGHH" or defeated grunt -- the sound of getting overwhelmed. A brief vocalization of "I'm done" energy. Not a scream (the death_slowmo covers the dramatic moment) -- more of an impact grunt. | **MEDIUM** |
| `sfx_death_impact` | `explode-1.ogg` (generic explosion) | Plays at the instant of death (frame 1 of the death sequence). Should sound like the killing blow connecting, not a generic explosion. | Meaty impact thud -- a heavy body-hit sound. "THWACK" with bass. Like getting punched in the gut by a zombie. Short and brutal, no tail. Sets up the slow-mo sequence. | **MEDIUM** |
| `sfx_death_slowmo` | `falling-scream-1.ogg` (same as player_death) | Plays 0.2s into the death sequence as time slows down. Shares a file with the standard death. Should feel like the world going quiet and slow. | Slow, drawn-out descending moan or sigh -- time is slowing. Like the breath leaving the body in slow motion. "Aaauuuughhh..." trailing off. More melancholy than panicked. Slightly muffled or reverby to sell the slow-mo. | **MEDIUM** |
| `sfx_zombie_death_high` | `explode-1.ogg` (generic explosion) | High-tier zombie death (tier 5-10). A big zombie dying should sound meaty and zombie-specific, not like a bomb went off. | Heavy, wet destruction sound -- a big "SPLORCH-CRACK" with bass. Like a large zombie crumbling apart. More organic and heavy than the low-tier death. | **LOW** |
| `sfx_crate_open` | `litterbox-1.ogg` (litterbox sound) | Powerup crates are wooden boxes that break open. A litterbox sound is charming but does not convey "cracking open a container." | Wooden crate splintering -- a quick "CRACK-snap" like breaking a small wooden box. Light and crisp. | **LOW** |

---

## Suggested New Sounds (Currently Silent Moments)

These gameplay moments have **no `playSound()` call at all**. The code does not even attempt to play a sound here.

| Moment | Description | Mood/Tone | Duration | Priority |
|--------|-------------|-----------|----------|----------|
| **Player takes damage** | When a zombie hits the player and HP drops, there is a red flash but zero audio feedback. This is the most frequent combat event with no sound. The `damagePlayer()` function (line 2853) has no playSound call. | Quick hurt grunt or "oof" -- short and percussive. 2-3 variants to avoid repetition. Not too dramatic since it can happen every 0.5 seconds. Like getting bonked. "Ugh!" / "Ow!" / "Hnf!" | 0.15-0.3s | **CRITICAL** |
| **Upgrade selection confirm** | Player picks a weapon/howl/upgrade from the level-up menu. Currently just closes the menu silently. Happens every 1-2 minutes. | Satisfying confirmation click -- a decisive "CHUNK" or stamp sound. Like pressing a big button. Should feel final and rewarding. | 0.2-0.3s | **HIGH** |
| **Power attack charging** | Player holds Enter/B to charge a power attack (0-2 seconds). The event `sfx_power_attack_charge` is defined in SOUND_MAP (maps to `leapord-growl-1.ogg`) but is never called in game code. It should play when charging begins. | Rising growl that builds tension -- the existing leopard growl file works conceptually but a dedicated charging sound (rising pitch hum or growl that gets louder) would be better. Something that tells the player "keep holding, it's building up." | 1.5-2.0s | **HIGH** |
| **Landing after jump** | `sfx_land` is defined (maps to `bouncy-boots-4.ogg`) but is never called via `playSound()`. The jump sounds play based on height tier but landing is silent. | Soft thud on touchdown -- a gentle "boof" or cushioned impact. Not heavy; the character is an agile leopard. Lighter than the jump sound. | 0.15-0.25s | **MEDIUM** |
| **Zombie spawn** | `sfx_zombie_spawn` is defined in SOUND_MAP (maps to `zombie-1.ogg`, `zombie-2.ogg`) but is never called via `playSound()`. Zombies appear silently. Would add atmosphere during ambient spawning. | Short guttural emergence -- a quick "grrrgh" or earth-shifting sound as they claw out of the ground. Should be subtle enough to not be annoying at high spawn rates. | 0.2-0.4s | **MEDIUM** |
| **Totem destruction** | Player breaks a difficulty totem (5 hits) which increases zombie difficulty but boosts rewards. "NOT HARD ENOUGH!" appears. No sound at all. | Ominous crack followed by a dark power release -- "CRACK... boooom." Should feel like "you asked for it." Foreboding and heavy, like a seal being broken. | 0.5-0.8s | **MEDIUM** |
| **Wave event warning** | 10-second countdown before a massive zombie wave. A warning timer appears but there is no audio alert. This is a critical gameplay moment -- the player needs to prepare. | Rising alarm or war horn -- "BWOOOOO" like a distant horn sounding. Urgent but not jarring. Could be two notes: one for the 10s warning start, one for the wave actually spawning. | 0.8-1.5s | **MEDIUM** |
| **Wave event spawn** | The actual moment when 15+ zombies spawn in a ring around the player. Happens after the 10s warning. | Eruption of groaning/rumbling -- like the ground opening up and dozens of zombies clawing out simultaneously. A burst of chaotic energy. Low rumble with overlaid zombie voices. | 0.5-1.0s | **MEDIUM** |
| **Boss Bone Barrage fire** | Titan boss launches 4-6 bone projectiles in parabolic arcs toward marked landing positions. Individual bone impacts play `sfx_boss_slam_impact` but the launch volley itself is silent. | Rattling bone volley -- a quick "CLACK-CLACK-CLACK" like bones being flung from a catapult. Percussive and skeletal. Dry and clicky. | 0.3-0.5s | **MEDIUM** |
| **Boss Titan Charge dash** | After the telegraph, the Titan dashes 15 units at high speed. The telegraph has a sound but the actual charge movement is silent. | Thundering rush -- a brief "WHOOOM" of heavy mass moving fast. Like a rhino charging past. Wind + weight. | 0.3-0.5s | **MEDIUM** |
| **Challenge shrine activation** | Player walks near a challenge shrine and a boss spawns. Currently plays `sfx_player_growl` which is the leopard's sound. Should sound like dark magic awakening. | Dark energy awakening -- a low resonant hum that swells into a crack. Like a sealed tomb opening. Mystical and threatening. | 0.6-1.0s | **MEDIUM** |
| **Titan Ground Fissure telegraph** | Brown lines appear on ground radiating from the Titan. Currently plays `sfx_player_growl` -- again, the player's sound used for an enemy attack. | Deep earth-cracking rumble -- a slow "CRRRRACK" like rock splitting beneath the surface. Low and threatening. | 0.5-0.8s | **MEDIUM** |
| **Menu navigation** | Scrolling through options in the upgrade menu, pause menu, or charge shrine menu. All navigation is currently silent. | Soft click or blip -- a tiny "tick" or "bip" when moving between options. The most minimal sound in the UI. | 0.05-0.1s | **LOW** |
| **Howl/scroll pickup** | Player selects a Howl (passive buff) from the level-up menu. Currently uses the same upgrade confirm path with no sound. | Mystical whoosh -- a brief ethereal "fwoosh" with a hint of magic. Like a scroll unfurling in the wind. Distinct from the weapon upgrade confirm. | 0.3-0.5s | **LOW** |
| **Shield Bracelet block** | Shield Bracelet absorbs one hit every 30 seconds. "BLOCKED!" appears but there is no audio. | Metallic deflect ping -- a bright "TING!" like a sword hitting a shield. Sharp and clean. | 0.15-0.25s | **LOW** |
| **Dodge (Turbo Sneakers)** | "DODGE!" appears when the player's dodge chance triggers. No sound. | Quick whooshy sidestep -- a very fast "fwip" or "zip." Like narrowly ducking out of the way. | 0.1-0.2s | **LOW** |
| **MudBomb/BeehiveLauncher/SnowballTurret fire** | These 3 weapons fall through to the generic `sfx_weapon_projectile` (pew sound). They could use dedicated sounds. | MudBomb: wet splat launch "PLOP-fwip"; BeehiveLauncher: buzzy launch "bzzz-fwip"; SnowballTurret: icy puff "PSHH." Each should be distinct so players learn to identify their weapons by sound. | 0.2-0.4s each | **LOW** |
| **Game start jingle** | Currently plays `sfx_player_growl` when the game starts. Works okay but a short musical jingle would set the mood better. | Short fanfare or "let's go!" energy -- 3-4 ascending notes, bright and confident. Like the game saying "here we go!" Mouth-trumpeted. | 0.5-0.8s | **LOW** |

---

## Existing Sounds That Work Well (No Changes Needed)

These sounds are well-matched to their gameplay moments and should stay as-is:

- **`sfx_melee_hit`** (bite-1 through bite-4) -- Four variants of auto-attack bites. Snappy, varied, and satisfying. Perfect for the rapid auto-attack timer.
- **`sfx_power_attack_release`** (rawr-1.ogg) -- The "RAWR!" on power attack release feels great. Big, punchy, and rewarding after a charge.
- **`sfx_weapon_poison`** (gas-1/2/3 + fart-1/2/3) -- The gas/fart duality for poison cloud is hilarious and characterful. Six variants keep it fresh. Peak creative direction.
- **`sfx_weapon_boomerang`** (wings-4.ogg) -- The whooshy wing sound works perfectly for the boomerang's arcing flight path.
- **`sfx_weapon_heavy`** (big-pew-1.ogg) -- One emphatic "PEW" for fireball and lightning bolt. Satisfying and appropriately weighty.
- **`sfx_weapon_projectile`** (pew-3x-1/2.ogg) -- Triple pew for bone toss projectiles. Good match for rapid-fire ranged weapons.
- **`sfx_weapon_multishot`** (pew-5x-1.ogg) -- Extended pew for high-level multi-shot. Natural progression from the triple.
- **`sfx_jump` / `sfx_jump_soft` / `sfx_jump_huge`** (bouncy-boots-1/2/3/4) -- Tiered jump sounds based on height multiplier. Good variety, satisfying bounciness.
- **`sfx_powerup_wings`** (wings-1/2/4) -- Flappy wing sounds for Angel Wings activation. Three variants, all fitting.
- **`sfx_powerup_wings_expire`** (falling-scream-1.ogg) -- The kid's falling scream when wings expire is comedy gold. Keep it forever.
- **`sfx_powerup_racecar`** (race-car-1/2/3) -- "VROOOOM" for Race Car powerup. Three variants of a 7-year-old doing car sounds. Irreplaceable.
- **`sfx_powerup_speed`** (e-scooter-1/2) -- E-scooter sounds for speed boosts. Charming and fitting.
- **`sfx_comedic_drop`** (poop-1.ogg) -- Turd Mine deployment sound. Exactly right. No notes.
- **`sfx_zombie_merge_low/mid/high`** (zombie-1/2/3/6/7 + zombie-4/5) -- Tiered merge sounds that get deeper and more dramatic as merge tier increases. Good audio storytelling.
- **`sfx_zombie_death_low`** (zombie-7.ogg) -- Low-tier zombie death. Quick and unobtrusive for the fodder enemies.
- **`sfx_level_up`** (rawr-2.ogg) -- Bigger rawr for level-up celebration. Works as a placeholder but a dedicated chime would be even better (listed in Missing Sounds).
- **`sfx_explosion`** (explode-1.ogg) -- Solid explosion for fireball impacts, mine detonations, and similar moments. The problem is overuse (see Placeholder section), not quality.
- **`sfx_player_growl`** (leapord-growl-1.ogg) -- Great as the player's signature sound. The issue is it is also used for 5+ enemy attack telegraphs where it does not belong (see Placeholder section).

---

## Quick Reference: File Reuse Audit

For Julian's awareness, here are the files that are currently doing too much heavy lifting:

| File | Used By (Event IDs) | Problem |
|------|---------------------|---------|
| `explode-1.ogg` | `sfx_explosion`, `sfx_zombie_death_high`, `sfx_boss_slam_impact`, `sfx_shrine_break`, `sfx_death_impact` | 5 different events sharing 1 explosion sound. Boss slams, shrine breaks, and death impacts all sound identical. |
| `leapord-growl-1.ogg` | `sfx_power_attack_charge`, `sfx_player_growl`, `sfx_boss_charge_telegraph` | Player's signature growl used for a boss attack telegraph. Confusing audio identity. |
| `falling-scream-1.ogg` | `sfx_powerup_wings_expire`, `sfx_player_death`, `sfx_death_slowmo` | Works great for wings expire, but player death and slow-mo death sequence need their own sounds. |
| `zombie-4.ogg` | `sfx_boss_entrance`, `sfx_boss_dark_nova` | Boss entrance and the ultimate attack share the same file. Two dramatically different moments, one sound. |
| `rawr-2.ogg` | `sfx_level_up`, `sfx_boss_phase_transition` | Player celebration and boss rage use the same rawr. |
| `zombie-5.ogg` | `sfx_zombie_merge_high`, `sfx_boss_summon` | High-tier merge and boss summoning ritual share a file. |

---

## Summary: Recording Priority Order

If studio time is limited, here is the suggested recording order by impact:

1. **`sfx_xp_pickup`** (2-3 tiny tink variants) -- silent 10+ times per second
2. **Player damage grunts** (3 variants) -- silent every time the player gets hit
3. **`sfx_powerup_generic`** (1-2 pop variants) -- silent on most powerup pickups
4. **`sfx_item_pickup`** (1 variant) -- silent on equipment pickups
5. **Boss entrance** -- placeholder, needs drama
6. **Boss Dark Nova** -- placeholder, needs two-part buildup
7. **Boss phase transition** -- placeholder, needs menace
8. **Boss charge telegraph** -- placeholder, uses player's sound
9. **Boss shadow zone** -- placeholder, gas sound kills the mood
10. **Boss death beam** -- placeholder, pew sound is comical
11. **Upgrade selection confirm** -- silent on every level-up choice
12. **`sfx_death_sting`** -- silent at game over (the emotional climax)
13. **Wave event warning horn** -- silent before major combat moments
14. **Totem destruction** -- silent at a dramatic gameplay shift
15. Everything else in the tables above
