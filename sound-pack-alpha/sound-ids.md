# Sound Pack Alpha -- Catalog & Integration Map

> **Creative Director:** The developer's 7-year-old nephew
> **Recording session:** Single take, under 30 minutes, voice-performed
> **Total files:** 40 audio clips (39 `.ogg`, 1 `.mp3`)

This kid knocked it out of the park. Every sound in this pack has character, personality, and the kind of fearless creativity that only a 7-year-old can bring to a zombie survival game. Below is the full catalog mapping each file to its best-fit game event, plus a gap analysis for events still needing coverage.

---

## Sound File Inventory & Mapping

### Combat Sounds

| File | Size | Suggested Game Event(s) | Integration Notes |
|------|------|------------------------|-------------------|
| `Bite-1.mp3` | 5 KB | Auto-attack hit (melee) | Tiny and snappy -- perfect for the basic clawSwipe auto-attack. The `.mp3` format may need conversion to `.ogg` for consistency. |
| `Bite-2.ogg` | 9 KB | Auto-attack hit (melee) variant | Second melee hit sound; rotate randomly with Bite-1 for variety. |
| `bite-3.ogg` | 9 KB | Auto-attack hit (melee) variant | Third variant. Having 4 bite sounds is great for avoiding repetition on the auto-attack timer. |
| `bite-4.ogg` | 16 KB | Auto-attack hit (melee), power attack connect | Slightly larger file -- might be a bigger, meatier bite. Could double as the power attack landing hit. |
| `leapord-growl-1.ogg` | 31 KB | Power attack charge / release | The leopard's signature growl! Best used when charging or releasing the power attack (hold Enter/B). Could also play on game start for the leopard character. |
| `rawr-1.ogg` | 26 KB | Power attack release, level-up fanfare | A solid "RAWR!" -- fits the power attack AoE release moment. Also great as a level-up celebration. |
| `rawr-2.ogg` | 38 KB | Power attack release variant, berserker rage activation | Longer/bigger rawr. Could serve as the power attack at full 2-second charge, or when Berserker Rage powerup activates. |
| `explode-1.ogg` | 31 KB | Fireball explosion, bomb trail detonation, crate breaking | Explosion sound -- maps directly to `fireball` weapon impact, `bombTrail` powerup detonations, and powerup crate destruction. |

### Weapon Sounds

| File | Size | Suggested Game Event(s) | Integration Notes |
|------|------|------------------------|-------------------|
| `pew-pew-pew-1.ogg` | 18 KB | boneToss fire, bananaCannon shot | Quick triple-pew is a natural fit for projectile weapons. Play when `boneToss` or banana projectiles launch. |
| `pew-pew-pew-2.ogg` | 17 KB | boneToss fire variant | Second variant for projectile weapon firing -- rotate with pew-pew-pew-1. |
| `pew-pew-pew-pew-pew-1.ogg` | 31 KB | Multi-shot boneToss (Arcane Scroll upgraded), lightningBolt chain | The extended pew sequence fits higher-level multi-projectile attacks or the `lightningBolt` chain-hit cascade. |
| `big-pew-1.ogg` | 31 KB | fireball launch, lightningBolt fire | One big, emphatic pew -- perfect for the single heavy-hitter weapons like `fireball` or `lightningBolt`. |
| `gas-1.ogg` | 27 KB | poisonCloud deploy | Gas sound for the `poisonCloud` weapon -- place at enemy position with DoT. |
| `gas-2.ogg` | 15 KB | poisonCloud tick / sustained effect | Shorter gas variant; could loop or layer as the poison cloud persists. |
| `gas-3.ogg` | 15 KB | poisonCloud deploy variant | Third gas option for rotation when multiple poison clouds are active. |
| `fart-1.ogg` | 8 KB | poisonCloud fire (comedic variant) | Let's be real -- a 7-year-old absolutely nailed the poisonCloud with fart sounds. Could alternate with gas sounds for the poison weapon. |
| `fart-2.ogg` | 17 KB | poisonCloud fire (comedic variant) | Medium fart -- another poison cloud option. The creative director clearly had a vision here. |
| `fart-3.ogg` | 46 KB | poisonCloud (big cloud / high level) | The big one. Save this for level 5 poison cloud or a particularly large gas deployment. Respect the craft. |

### Movement & Powerup Sounds

| File | Size | Suggested Game Event(s) | Integration Notes |
|------|------|------------------------|-------------------|
| `bouncy-boots-1.ogg` | 14 KB | Player jump, Jumpy Boots powerup activation | "Bouncy boots" maps perfectly to the `jumpyBoots` powerup and general jump action. |
| `bouncy-boots-2.ogg` | 15 KB | Player jump variant | Rotate jump sounds for variety. |
| `bouncy-boots-3.ogg` | 17 KB | Player jump variant, Earthquake Stomp jump | Slightly bigger -- good for the `earthquakeStomp` powerup jump. |
| `bouncy-boots-4.ogg` | 21 KB | Player landing, Earthquake Stomp landing | Largest of the set -- could be the landing/stomp sound, especially for `earthquakeStomp` shockwaves. |
| `wings-1.ogg` | 40 KB | Angel Wings powerup activation / flight loop | Direct match for the `wings` (Angel Wings) powerup. Play on activation or as ambient flight sound. |
| `wings-2.ogg` | 39 KB | Angel Wings flight loop / flap | Second wing variant; alternate with wings-1 during sustained flight. |
| `wings-4.ogg` | 35 KB | Angel Wings flight, boomerang whoosh | Third wing sound. The whooshing quality could also work for the `boomerang` weapon arc. |
| `race-car-1.ogg` | 48 KB | Race Car powerup activation | "Race car" is literally the `raceCar` powerup (2x Speed + Fire Aura). Play on crate pickup. |
| `race-car-2.ogg` | 29 KB | Race Car powerup sustained / fire aura loop | Shorter -- could loop while Race Car powerup is active. |
| `race-car-3.ogg` | 70 KB | Race Car powerup activation (extended) | Biggest race-car sound. Could be the main activation fanfare for this powerup. |
| `e-scooter-1.ogg` | 67 KB | Speed boost activation, Soccer Cleats equip | E-scooter vroomm -- works for any speed-related event. Good for `soccerCleats` item pickup or general speed powerup. |
| `e-scooter-2.ogg` | 29 KB | Speed boost variant, quick dash | Shorter scooter burst -- could be a per-second ambient sound during speed boosts. |

### Zombie Sounds

| File | Size | Suggested Game Event(s) | Integration Notes |
|------|------|------------------------|-------------------|
| `zombie-1.ogg` | 36 KB | Zombie spawn, zombie idle/ambient | First zombie voice -- play when new zombies enter the arena. |
| `zombie-2.ogg` | 35 KB | Zombie spawn variant | Rotate with zombie-1 for spawn variation. |
| `zombie-3.ogg` | 54 KB | Zombie merge (tier up) | Larger file -- could be the merge/combine sound when same-tier zombies collide and form a higher tier. |
| `zombie-4.ogg` | 89 KB | Zombie death (high tier), boss zombie ambient | Big zombie sound -- fits higher-tier zombie events (tiers 5-10). |
| `zombie-5.ogg` | 89 KB | Zombie death (high tier) variant | Same size as zombie-4; another big zombie moment. |
| `zombie-6.ogg` | 68 KB | Zombie merge (higher tiers), zombie aggro | Mid-size -- could be the merge sound for mid-tier combinations or a proximity aggro alert. |
| `zombie-7.ogg` | 36 KB | Zombie death (low tier) | Smaller zombie sound -- fits the death sound for tiers 1-4. |

### Special / Miscellaneous Sounds

| File | Size | Suggested Game Event(s) | Integration Notes |
|------|------|------------------------|-------------------|
| `falling-scream-1.ogg` | 26 KB | Player death / game over, falling off platform | Falling scream fits both the game-over death moment and falling off elevated platforms. |
| `poop-1.ogg` | 35 KB | Litterbox item/event, comedic death, bomb trail drop | The creative director went there. Could work as a comedic effect for bomb trail drops or as a novelty pickup sound. |
| `litterbox-1.ogg` | 26 KB | Item pickup (comedic variant), crate open | "Litterbox" -- it's a cat game after all! Could be a general crate-opening or loot-drop sound. Leopards are big cats. |

---

## Suggested Sound ID Registry

These are the recommended programmatic IDs for integration into the game's audio system:

```
SOUND_ID                  FILE(S)                           EVENT
─────────────────────────────────────────────────────────────────────────────
sfx_melee_hit             Bite-1.mp3, Bite-2.ogg,           Auto-attack connects
                          bite-3.ogg, bite-4.ogg
sfx_power_attack_charge   leapord-growl-1.ogg               Power attack charging
sfx_power_attack_release  rawr-1.ogg, rawr-2.ogg            Power attack AoE release
sfx_weapon_projectile     pew-pew-pew-1.ogg,                boneToss / bananaCannon fire
                          pew-pew-pew-2.ogg
sfx_weapon_multishot      pew-pew-pew-pew-pew-1.ogg         Multi-projectile fire
sfx_weapon_heavy          big-pew-1.ogg                     fireball / lightningBolt fire
sfx_weapon_poison         gas-1.ogg, gas-2.ogg, gas-3.ogg,  poisonCloud deploy / tick
                          fart-1.ogg, fart-2.ogg, fart-3.ogg
sfx_weapon_boomerang      wings-4.ogg                       boomerang whoosh
sfx_explosion             explode-1.ogg                     fireball impact, bomb detonation
sfx_jump                  bouncy-boots-1.ogg,               Player jump
                          bouncy-boots-2.ogg,
                          bouncy-boots-3.ogg
sfx_land                  bouncy-boots-4.ogg                Player landing / stomp
sfx_powerup_wings         wings-1.ogg, wings-2.ogg          Angel Wings activation / flight
sfx_powerup_racecar       race-car-1.ogg, race-car-2.ogg,   Race Car activation / loop
                          race-car-3.ogg
sfx_powerup_speed         e-scooter-1.ogg, e-scooter-2.ogg  Speed boost events
sfx_zombie_spawn          zombie-1.ogg, zombie-2.ogg        Zombie spawning
sfx_zombie_merge          zombie-3.ogg, zombie-6.ogg        Zombie tier merge
sfx_zombie_death_low      zombie-7.ogg                      Low-tier zombie death (1-4)
sfx_zombie_death_high     zombie-4.ogg, zombie-5.ogg        High-tier zombie death (5-10)
sfx_player_growl          leapord-growl-1.ogg                Game start / character intro
sfx_player_death          falling-scream-1.ogg              Player death / game over
sfx_level_up              rawr-1.ogg                        Level-up celebration
sfx_crate_open            litterbox-1.ogg                   Crate breaking open
sfx_comedic_drop          poop-1.ogg                        Bomb trail drop / novelty event
```

---

## Gap Analysis: Missing Sounds

The following game events do **not** have a clear match in Sound Pack Alpha and would benefit from a future recording session:

| Game Event | Category | Priority | Notes |
|-----------|----------|----------|-------|
| **XP gem collect** | Pickup | HIGH | Needs a small, satisfying "ding" or sparkle. Happens very frequently. |
| **Item pickup / equip** | Pickup | HIGH | A positive chime when equipping armor, boots, etc. |
| **Powerup collect (generic)** | Pickup | HIGH | A general powerup-acquired jingle for the 18 powerup types. |
| **Health pickup** | Pickup | MEDIUM | A healing/restoration sound. |
| **Level-up chime** | Progression | HIGH | A distinct celebratory jingle (rawr-1 can substitute, but a dedicated chime would be better). |
| **Upgrade selection** | UI | MEDIUM | A confirmation click/sound when picking from the level-up menu. |
| **Shrine breaking** | World | MEDIUM | The sound of smashing a shrine (3 HP to break). Stone/crystal cracking. |
| **Augment granted** | World | MEDIUM | A mystical buff-received sound after shrine destruction. |
| **Totem activation** | World | MEDIUM | Totem destroyed -- difficulty increases. Needs an ominous tone. |
| **Scroll pickup** | Progression | LOW | Acquiring a Power/Haste/Arcane/etc. scroll from the level-up menu. |
| **clawSwipe whoosh** | Weapon | MEDIUM | A dedicated slashing/swiping arc sound (distinct from bite hits). |
| **lightningBolt zap** | Weapon | MEDIUM | Electric crackle/zap for the chain lightning. |
| **Frost Nova freeze** | Powerup | LOW | Ice/freeze sound effect. |
| **Ghost Form activate** | Powerup | LOW | Ethereal whoosh for going incorporeal. |
| **Shield Bracelet block** | Item | LOW | A metallic deflect/block sound. |
| **Menu navigation** | UI | LOW | Click/hover sounds for pause menu and upgrade menu. |
| **Game start** | UI | LOW | An intro jingle or fanfare (leapord-growl-1 can fill in). |
| **Background ambience** | Ambient | LOW | Looping atmospheric track for biomes (forest, desert, plains). |
| **Footsteps** | Player | LOW | Rhythmic step sounds during movement (per-biome would be a bonus). |
| **Zombie contact damage** | Combat | MEDIUM | Sound when zombies hit the player. |

---

## Notes for Implementation

1. **Format consistency:** Convert `Bite-1.mp3` to `.ogg` for format uniformity. All other files are already `.ogg`.

2. **Sound pooling:** Many categories have 2-7 variants (bites, bouncy-boots, zombies, etc.). Implement a random-pick-from-pool system to avoid repetitive audio.

3. **The fart/gas duality:** The creative director provided both "proper" gas sounds AND fart sounds for the poison cloud weapon. Consider a settings toggle ("Classic" vs "Fun" sound mode) or just randomly mix both pools. The kid clearly put thought into this.

4. **Volume normalization:** Since these were recorded in a single take by a 7-year-old, levels may vary. A normalization pass would help before integration.

5. **Missing `wings-3`:** The wing files jump from `wings-2` to `wings-4`. Either wings-3 didn't make the cut in editing, or it's waiting for a future session.

6. **Dual-purpose sounds:** Several sounds work across multiple events (rawr for both power attacks and level-ups, bouncy-boots for both jumps and the Jumpy Boots powerup, etc.). This is actually a strength -- it keeps the audio footprint small while covering many events.

---

*Sound Pack Alpha: 40 files, 1 legendary recording session, 1 very talented creative director.*
