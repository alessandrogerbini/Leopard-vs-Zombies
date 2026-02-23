# Sound Pack Alpha -- Proposed Mapping Changes

> **Date:** 2026-02-22
> **Context:** The developer renamed sound files to include descriptive suffixes indicating intended usage. This document audits every file, compares old vs new names, identifies broken SOUND_MAP references, and proposes corrected mappings.
> **Related bead:** BD-48 (Audio system overhaul)

---

## 1. Rename Tracking Table

Every file that changed name. The prefix (e.g., `Bite-1`, `zombie-3`) was kept intact; a descriptive suffix was appended after a hyphen.

| # | Old Filename | New Filename | Developer's Intent (from suffix) |
|---|-------------|-------------|----------------------------------|
| 1 | `Bite-1.mp3` | `Bite-1-basic melee attack.mp3` | Basic melee attack |
| 2 | `Bite-2.ogg` | `Bite-2-alt basic melee attack.ogg` | Alternate basic melee attack |
| 3 | `bite-3.ogg` | `bite-3-strong melee attack.ogg` | Strong melee attack |
| 4 | `bite-4.ogg` | `bite-4-tearing melee attack.ogg` | Tearing melee attack |
| 5 | `big-pew-1.ogg` | `big-pew-1-very large projectile launch - seldom until late game huge enemies firing projectiles at range.ogg` | Very large projectile launch; seldom; late-game huge enemies firing at range |
| 6 | `bouncy-boots-1.ogg` | `bouncy-boots-1-jumping while wearing extra jump powerup.ogg` | Jumping while wearing extra jump powerup |
| 7 | `bouncy-boots-2.ogg` | `bouncy-boots-2-extra jump powerup.ogg` | Extra jump powerup |
| 8 | `bouncy-boots-3.ogg` | `bouncy-boots-3-powerup jump.ogg` | Powerup jump |
| 9 | `bouncy-boots-4.ogg` | `bouncy-boots-4-powerup jump.ogg` | Powerup jump |
| 10 | `e-scooter-1.ogg` | `e-scooter-1-powerup escooter only.ogg` | Powerup: e-scooter only |
| 11 | `e-scooter-2.ogg` | `e-scooter-2-powerup only.ogg` | Powerup only |
| 12 | `explode-1.ogg` | `explode-1-bombs big zombies dying.ogg` | Bombs; big zombies dying |
| 13 | `falling-scream-1.ogg` | `falling-scream-1-when wings time out.ogg` | When wings powerup times out |
| 14 | `fart-1.ogg` | `fart-1-on poison or gas cloud.ogg` | Poison or gas cloud |
| 15 | `fart-2.ogg` | `fart-2-gas cloud.ogg` | Gas cloud |
| 16 | `fart-3.ogg` | `fart-3-gas cloud.ogg` | Gas cloud |
| 17 | `gas-1.ogg` | `gas-1-large gas cloud.ogg` | Large gas cloud |
| 18 | `gas-2.ogg` | `gas-2-large gas cloud.ogg` | Large gas cloud |
| 19 | `gas-3.ogg` | `gas-3-medium gas cloud.ogg` | Medium gas cloud |
| 20 | `litterbox-1.ogg` | `litterbox-1-litterbox special attack for cat.ogg` | Litterbox special attack for cat |
| 21 | `pew-pew-pew-1.ogg` | `pew-pew-pew-1-for tripple ranged attacks ally.ogg` | Triple ranged attacks (ally) |
| 22 | `pew-pew-pew-2.ogg` | `pew-pew-pew-2-3x ranged attack.ogg` | 3x ranged attack |
| 23 | `pew-pew-pew-pew-pew-1.ogg` | `pew-pew-pew-pew-pew-1-5x ranged attack.ogg` | 5x ranged attack |
| 24 | `poop-1.ogg` | `poop-1-for laying turds.ogg` | Laying turds |
| 25 | `race-car-1.ogg` | `race-car-1-powerup.ogg` | Powerup |
| 26 | `race-car-2.ogg` | `race-car-2-powerup.ogg` | Powerup |
| 27 | `race-car-3.ogg` | `race-car-3-powerup.ogg` | Powerup |
| 28 | `rawr-1.ogg` | `rawr-1-cat or bear roar.ogg` | Cat or bear roar |
| 29 | `rawr-2.ogg` | `rawr-2-cat or bar roar on growth.ogg` | Cat or bear roar on growth |
| 30 | `wings-1.ogg` | `wings-1-when wings powerup.ogg` | When wings powerup activates |
| 31 | `wings-2.ogg` | `wings-2-wings powerup.ogg` | Wings powerup |
| 32 | `wings-4.ogg` | `wings-4-wings powerup.ogg` | Wings powerup |
| 33 | `zombie-1.ogg` | `zombie-1-on first zomb combine.ogg` | First zombie combine |
| 34 | `zombie-2.ogg` | `zombie-2-on second zomb combine.ogg` | Second zombie combine |
| 35 | `zombie-3.ogg` | `zombie-3-on zomb combine alt 1-2.ogg` | Zombie combine alt (tiers 1-2) |
| 36 | `zombie-4.ogg` | `zombie-4-alt last zomb combine.ogg` | Alt last zombie combine |
| 37 | `zombie-5.ogg` | `zombie-5- zomb combine max level.ogg` | Zombie combine max level |
| 38 | `zombie-7.ogg` | `zombie-7-on first zomb combine.ogg` | First zombie combine |
| 39 | `zombie-6.ogg` | `zombie-alt 3rd4th zomb combine.ogg` | **PREFIX CHANGED** -- 3rd/4th zombie combine |

**Unchanged file (1):**

| # | Filename | Notes |
|---|----------|-------|
| 40 | `leapord-growl-1.ogg` | No suffix added; name unchanged |

**Total files on disk:** 40 (39 `.ogg`, 1 `.mp3`) -- matches original count.

---

## 2. Broken Mappings (Files Referenced in SOUND_MAP That No Longer Exist on Disk)

Every SOUND_MAP entry was checked against the actual files on disk. The following references are now broken because the files were renamed:

| SOUND_MAP Event ID | Broken Reference | File Still Exists? | Likely New Filename |
|--------------------|-----------------|--------------------|--------------------|
| `sfx_melee_hit` | `Bite-1.mp3` | NO | `Bite-1-basic melee attack.mp3` |
| `sfx_melee_hit` | `Bite-2.ogg` | NO | `Bite-2-alt basic melee attack.ogg` |
| `sfx_melee_hit` | `bite-3.ogg` | NO | `bite-3-strong melee attack.ogg` |
| `sfx_melee_hit` | `bite-4.ogg` | NO | `bite-4-tearing melee attack.ogg` |
| `sfx_power_attack_charge` | `leapord-growl-1.ogg` | **YES** | *(unchanged)* |
| `sfx_power_attack_release` | `rawr-1.ogg` | NO | `rawr-1-cat or bear roar.ogg` |
| `sfx_power_attack_release` | `rawr-2.ogg` | NO | `rawr-2-cat or bar roar on growth.ogg` |
| `sfx_explosion` | `explode-1.ogg` | NO | `explode-1-bombs big zombies dying.ogg` |
| `sfx_weapon_projectile` | `pew-pew-pew-1.ogg` | NO | `pew-pew-pew-1-for tripple ranged attacks ally.ogg` |
| `sfx_weapon_projectile` | `pew-pew-pew-2.ogg` | NO | `pew-pew-pew-2-3x ranged attack.ogg` |
| `sfx_weapon_multishot` | `pew-pew-pew-pew-pew-1.ogg` | NO | `pew-pew-pew-pew-pew-1-5x ranged attack.ogg` |
| `sfx_weapon_heavy` | `big-pew-1.ogg` | NO | `big-pew-1-very large projectile launch - seldom until late game huge enemies firing projectiles at range.ogg` |
| `sfx_weapon_poison` | `gas-1.ogg` | NO | `gas-1-large gas cloud.ogg` |
| `sfx_weapon_poison` | `gas-2.ogg` | NO | `gas-2-large gas cloud.ogg` |
| `sfx_weapon_poison` | `gas-3.ogg` | NO | `gas-3-medium gas cloud.ogg` |
| `sfx_weapon_poison` | `fart-1.ogg` | NO | `fart-1-on poison or gas cloud.ogg` |
| `sfx_weapon_poison` | `fart-2.ogg` | NO | `fart-2-gas cloud.ogg` |
| `sfx_weapon_poison` | `fart-3.ogg` | NO | `fart-3-gas cloud.ogg` |
| `sfx_weapon_boomerang` | `wings-4.ogg` | NO | `wings-4-wings powerup.ogg` |
| `sfx_jump` | `bouncy-boots-1.ogg` | NO | `bouncy-boots-1-jumping while wearing extra jump powerup.ogg` |
| `sfx_jump` | `bouncy-boots-2.ogg` | NO | `bouncy-boots-2-extra jump powerup.ogg` |
| `sfx_jump` | `bouncy-boots-3.ogg` | NO | `bouncy-boots-3-powerup jump.ogg` |
| `sfx_land` | `bouncy-boots-4.ogg` | NO | `bouncy-boots-4-powerup jump.ogg` |
| `sfx_powerup_wings` | `wings-1.ogg` | NO | `wings-1-when wings powerup.ogg` |
| `sfx_powerup_wings` | `wings-2.ogg` | NO | `wings-2-wings powerup.ogg` |
| `sfx_powerup_racecar` | `race-car-1.ogg` | NO | `race-car-1-powerup.ogg` |
| `sfx_powerup_racecar` | `race-car-2.ogg` | NO | `race-car-2-powerup.ogg` |
| `sfx_powerup_racecar` | `race-car-3.ogg` | NO | `race-car-3-powerup.ogg` |
| `sfx_powerup_speed` | `e-scooter-1.ogg` | NO | `e-scooter-1-powerup escooter only.ogg` |
| `sfx_powerup_speed` | `e-scooter-2.ogg` | NO | `e-scooter-2-powerup only.ogg` |
| `sfx_powerup_generic` | `litterbox-1.ogg` | NO | `litterbox-1-litterbox special attack for cat.ogg` |
| `sfx_zombie_spawn` | `zombie-1.ogg` | NO | `zombie-1-on first zomb combine.ogg` |
| `sfx_zombie_spawn` | `zombie-2.ogg` | NO | `zombie-2-on second zomb combine.ogg` |
| `sfx_zombie_merge` | `zombie-3.ogg` | NO | `zombie-3-on zomb combine alt 1-2.ogg` |
| `sfx_zombie_merge` | `zombie-6.ogg` | NO | `zombie-alt 3rd4th zomb combine.ogg` **(prefix changed)** |
| `sfx_zombie_death_low` | `zombie-7.ogg` | NO | `zombie-7-on first zomb combine.ogg` |
| `sfx_zombie_death_high` | `zombie-4.ogg` | NO | `zombie-4-alt last zomb combine.ogg` |
| `sfx_zombie_death_high` | `zombie-5.ogg` | NO | `zombie-5- zomb combine max level.ogg` |
| `sfx_player_growl` | `leapord-growl-1.ogg` | **YES** | *(unchanged)* |
| `sfx_player_death` | `falling-scream-1.ogg` | NO | `falling-scream-1-when wings time out.ogg` |
| `sfx_level_up` | `rawr-1.ogg` | NO | `rawr-1-cat or bear roar.ogg` |
| `sfx_xp_pickup` | `Bite-1.mp3` | NO | `Bite-1-basic melee attack.mp3` |
| `sfx_crate_open` | `litterbox-1.ogg` | NO | `litterbox-1-litterbox special attack for cat.ogg` |
| `sfx_shrine_break` | `explode-1.ogg` | NO | `explode-1-bombs big zombies dying.ogg` |
| `sfx_item_pickup` | `litterbox-1.ogg` | NO | `litterbox-1-litterbox special attack for cat.ogg` |
| `sfx_comedic_drop` | `poop-1.ogg` | NO | `poop-1-for laying turds.ogg` |

**Summary:** 39 out of 44 file references in SOUND_MAP are broken. Only 2 references survive (`leapord-growl-1.ogg`, used by both `sfx_power_attack_charge` and `sfx_player_growl`). ALL audio in the game is currently silent/failing for every event except power attack charge and player growl.

---

## 3. Proposed SOUND_MAP Changes (Event-by-Event)

For each event ID, the current (broken) file array is shown alongside the proposed replacement. Events where the **assignment itself** should change (not just the filename) based on the developer's new naming intent are flagged with **REASSIGNMENT**.

### 3.1 Combat Events

#### `sfx_melee_hit`
- **Current:** `['Bite-1.mp3', 'Bite-2.ogg', 'bite-3.ogg', 'bite-4.ogg']`
- **Proposed:** `['Bite-1-basic melee attack.mp3', 'Bite-2-alt basic melee attack.ogg', 'bite-3-strong melee attack.ogg', 'bite-4-tearing melee attack.ogg']`
- **Intent match:** YES -- developer confirms all 4 bites are melee attacks. No reassignment needed.
- **Note:** `bite-3` (strong) and `bite-4` (tearing) could be reserved for power attack connect or high-damage hits rather than regular auto-attack, but keeping them all in the pool is acceptable for variety.

#### `sfx_power_attack_charge`
- **Current:** `['leapord-growl-1.ogg']`
- **Proposed:** `['leapord-growl-1.ogg']`
- **Intent match:** YES -- file unchanged, mapping is fine.

#### `sfx_power_attack_release`
- **Current:** `['rawr-1.ogg', 'rawr-2.ogg']`
- **Proposed:** `['rawr-1-cat or bear roar.ogg', 'rawr-2-cat or bar roar on growth.ogg']`
- **Intent match:** PARTIAL -- `rawr-2` suffix says "roar on growth", suggesting the developer intended it for when the player grows/levels up, not for power attack release.
- **FLAG: REASSIGNMENT CANDIDATE** -- Consider moving `rawr-2` out of this event and into `sfx_level_up` (see section 3.6 below). Keep only `rawr-1` here.

#### `sfx_explosion`
- **Current:** `['explode-1.ogg']`
- **Proposed:** `['explode-1-bombs big zombies dying.ogg']`
- **Intent match:** YES -- developer says "bombs, big zombies dying." Fits explosion/bomb detonation events. Also confirms this sound is appropriate for big zombie deaths.
- **FLAG: REASSIGNMENT CANDIDATE** -- The suffix "big zombies dying" suggests this file could also serve `sfx_zombie_death_high`. See section 3.5.

### 3.2 Weapon Events

#### `sfx_weapon_projectile`
- **Current:** `['pew-pew-pew-1.ogg', 'pew-pew-pew-2.ogg']`
- **Proposed:** `['pew-pew-pew-1-for tripple ranged attacks ally.ogg', 'pew-pew-pew-2-3x ranged attack.ogg']`
- **Intent match:** YES -- "triple ranged attacks" / "3x ranged attack" confirms these are for multi-projectile weapon fire. No change needed.

#### `sfx_weapon_multishot`
- **Current:** `['pew-pew-pew-pew-pew-1.ogg']`
- **Proposed:** `['pew-pew-pew-pew-pew-1-5x ranged attack.ogg']`
- **Intent match:** YES -- "5x ranged attack" confirms the escalation from 3x to 5x for upgraded multi-shot. No change needed.

#### `sfx_weapon_heavy`
- **Current:** `['big-pew-1.ogg']`
- **Proposed:** `['big-pew-1-very large projectile launch - seldom until late game huge enemies firing projectiles at range.ogg']`
- **Intent match:** PARTIAL -- The developer describes this as "very large projectile launch" which fits the current heavy weapon mapping. However, the suffix also says "huge enemies firing projectiles at range," suggesting the developer intended this for **enemy** projectiles, not player weapons.
- **FLAG: REASSIGNMENT CANDIDATE** -- Consider creating a new event `sfx_enemy_projectile` for this sound, or dual-mapping it. The "seldom until late game" note confirms it should be rare/impactful, not spammed.

#### `sfx_weapon_poison`
- **Current:** `['gas-1.ogg', 'gas-2.ogg', 'gas-3.ogg', 'fart-1.ogg', 'fart-2.ogg', 'fart-3.ogg']`
- **Proposed:** `['gas-1-large gas cloud.ogg', 'gas-2-large gas cloud.ogg', 'gas-3-medium gas cloud.ogg', 'fart-1-on poison or gas cloud.ogg', 'fart-2-gas cloud.ogg', 'fart-3-gas cloud.ogg']`
- **Intent match:** YES -- all 6 files confirm poison/gas cloud usage. No reassignment needed.
- **Note:** `gas-1` and `gas-2` are "large", `gas-3` is "medium." Could tier these: large for bigger poison clouds, medium for regular deploy.

#### `sfx_weapon_boomerang`
- **Current:** `['wings-4.ogg']`
- **Proposed:** `['wings-4-wings powerup.ogg']`
- **Intent match:** NO -- Developer renamed this to "wings powerup," indicating they intended it for the wings powerup, NOT for the boomerang weapon.
- **FLAG: REASSIGNMENT** -- Remove `wings-4` from `sfx_weapon_boomerang`. Move it to `sfx_powerup_wings` pool. The boomerang weapon currently has no dedicated sound; leave this event with an empty array or find a suitable substitute (see section 6).

### 3.3 Movement Events

#### `sfx_jump`
- **Current:** `['bouncy-boots-1.ogg', 'bouncy-boots-2.ogg', 'bouncy-boots-3.ogg']`
- **Proposed:** `['bouncy-boots-1-jumping while wearing extra jump powerup.ogg', 'bouncy-boots-2-extra jump powerup.ogg', 'bouncy-boots-3-powerup jump.ogg']`
- **Intent match:** PARTIAL -- all three suffixes say "powerup jump" or "extra jump powerup," suggesting the developer intended these specifically for when the Jumpy Boots powerup is active, not for general jumping.
- **FLAG: REASSIGNMENT CANDIDATE** -- Consider restricting these to only play when the jump powerup is active, or accept them as general jump sounds. The developer's naming is consistent that these are "powerup jump" sounds.

#### `sfx_land`
- **Current:** `['bouncy-boots-4.ogg']`
- **Proposed:** `['bouncy-boots-4-powerup jump.ogg']`
- **Intent match:** NO -- Developer labeled this as "powerup jump" (same as boots 1-3), not as a landing sound. The original catalog (sound-ids.md) suggested it as a landing sound based on it being the largest file, but the developer disagrees.
- **FLAG: REASSIGNMENT CANDIDATE** -- Consider moving `bouncy-boots-4` into the `sfx_jump` pool with the others, since the developer considers it another jump variant, not a distinct landing sound.

### 3.4 Powerup Events

#### `sfx_powerup_wings`
- **Current:** `['wings-1.ogg', 'wings-2.ogg']`
- **Proposed:** `['wings-1-when wings powerup.ogg', 'wings-2-wings powerup.ogg']`
- **Intent match:** YES -- confirmed as wings powerup sounds.
- **Note:** Consider adding `wings-4-wings powerup.ogg` here too (currently misassigned to boomerang). See section 3.2.

#### `sfx_powerup_racecar`
- **Current:** `['race-car-1.ogg', 'race-car-2.ogg', 'race-car-3.ogg']`
- **Proposed:** `['race-car-1-powerup.ogg', 'race-car-2-powerup.ogg', 'race-car-3-powerup.ogg']`
- **Intent match:** YES -- all labeled "powerup." No change needed.

#### `sfx_powerup_speed`
- **Current:** `['e-scooter-1.ogg', 'e-scooter-2.ogg']`
- **Proposed:** `['e-scooter-1-powerup escooter only.ogg', 'e-scooter-2-powerup only.ogg']`
- **Intent match:** YES -- labeled as powerup sounds. The "escooter only" note on file 1 reinforces this is specifically for the e-scooter/speed powerup.

#### `sfx_powerup_generic`
- **Current:** `['litterbox-1.ogg']`
- **Proposed:** `['litterbox-1-litterbox special attack for cat.ogg']`
- **Intent match:** NO -- Developer says "litterbox special attack for cat," meaning this is intended as a **special attack sound**, not a generic powerup pickup sound.
- **FLAG: REASSIGNMENT** -- The litterbox sound should be moved to a combat/weapon event (perhaps a new `sfx_weapon_litterbox` or repurposed as a comedic weapon fire sound). Remove from `sfx_powerup_generic`. The generic powerup event should be empty or use a different sound.

### 3.5 Zombie Events

**CRITICAL: Developer's renaming reveals a fundamentally different intent for all zombie sounds.**

The original SOUND_MAP assigned zombie sounds to spawn, merge, death-low, and death-high events based on the catalog's speculative mapping. The developer's new names tell a very different story:

| Old Name | New Name | SOUND_MAP Assignment | Developer's Intent |
|----------|----------|---------------------|-------------------|
| `zombie-1.ogg` | `zombie-1-on first zomb combine.ogg` | `sfx_zombie_spawn` | First zombie combine (merge) |
| `zombie-2.ogg` | `zombie-2-on second zomb combine.ogg` | `sfx_zombie_spawn` | Second zombie combine (merge) |
| `zombie-3.ogg` | `zombie-3-on zomb combine alt 1-2.ogg` | `sfx_zombie_merge` | Zombie combine alt for tiers 1-2 |
| `zombie-4.ogg` | `zombie-4-alt last zomb combine.ogg` | `sfx_zombie_death_high` | Alt last zombie combine |
| `zombie-5.ogg` | `zombie-5- zomb combine max level.ogg` | `sfx_zombie_death_high` | Zombie combine max level |
| `zombie-6.ogg` | `zombie-alt 3rd4th zomb combine.ogg` | `sfx_zombie_merge` | 3rd/4th zombie combine |
| `zombie-7.ogg` | `zombie-7-on first zomb combine.ogg` | `sfx_zombie_death_low` | First zombie combine |

**The developer intended ALL zombie sounds for the merge/combine system, not for spawn or death.** Every suffix says "zomb combine" at various tiers. None say "spawn" or "death."

#### `sfx_zombie_spawn`
- **Current:** `['zombie-1.ogg', 'zombie-2.ogg']`
- **Proposed:** `[]` (empty)
- **FLAG: REASSIGNMENT** -- Both files are labeled "first/second zomb combine." They should move to `sfx_zombie_merge`. Zombie spawn has no dedicated sound in this pack.

#### `sfx_zombie_merge`
- **Current:** `['zombie-3.ogg', 'zombie-6.ogg']`
- **Proposed (expanded):** `['zombie-1-on first zomb combine.ogg', 'zombie-2-on second zomb combine.ogg', 'zombie-3-on zomb combine alt 1-2.ogg', 'zombie-7-on first zomb combine.ogg', 'zombie-alt 3rd4th zomb combine.ogg', 'zombie-4-alt last zomb combine.ogg', 'zombie-5- zomb combine max level.ogg']`
- **FLAG: REASSIGNMENT** -- All 7 zombie sounds are merge sounds. They can be tiered:
  - **Low-tier merge (tiers 1-2):** `zombie-1`, `zombie-2`, `zombie-3` ("alt 1-2"), `zombie-7`
  - **Mid-tier merge (tiers 3-4):** `zombie-alt 3rd4th zomb combine.ogg`
  - **High-tier merge (last/max):** `zombie-4` ("alt last"), `zombie-5` ("max level")

#### `sfx_zombie_death_low`
- **Current:** `['zombie-7.ogg']`
- **Proposed:** `[]` (empty)
- **FLAG: REASSIGNMENT** -- `zombie-7` is labeled "first zomb combine," not death. No zombie death sounds exist in this pack.

#### `sfx_zombie_death_high`
- **Current:** `['zombie-4.ogg', 'zombie-5.ogg']`
- **Proposed:** `[]` (empty) OR `['explode-1-bombs big zombies dying.ogg']` (see note)
- **FLAG: REASSIGNMENT** -- `zombie-4` and `zombie-5` are "last combine" and "max level combine." They're the most dramatic merge sounds, not death sounds. However, `explode-1` is labeled "bombs big zombies dying" -- the developer considers the explosion sound appropriate for big zombie deaths.

### 3.6 Player Events

#### `sfx_player_growl`
- **Current:** `['leapord-growl-1.ogg']`
- **Proposed:** `['leapord-growl-1.ogg']`
- **Intent match:** YES -- file unchanged. No issues.

#### `sfx_player_death`
- **Current:** `['falling-scream-1.ogg']`
- **Proposed:** `['falling-scream-1-when wings time out.ogg']`
- **Intent match:** NO -- Developer says "when wings time out," meaning this is for the moment the wings powerup expires (player loses flight), not for player death/game over.
- **FLAG: REASSIGNMENT** -- Move to a new event `sfx_powerup_wings_expire` or add to `sfx_powerup_wings` as an "end" variant. Player death has no dedicated sound in this pack.

### 3.7 Progression Events

#### `sfx_level_up`
- **Current:** `['rawr-1.ogg']`
- **Proposed:** `['rawr-2-cat or bar roar on growth.ogg']`
- **Intent match:** IMPROVED -- `rawr-2` says "roar on growth," which is a better fit for level-up than `rawr-1` (generic roar). This is a reassignment.
- **FLAG: REASSIGNMENT** -- Swap from `rawr-1` to `rawr-2`. The "on growth" suffix directly maps to leveling up / muscle growth.

#### `sfx_xp_pickup`
- **Current:** `['Bite-1.mp3']` (with comment: "No dedicated chime; use quiet bite as subtle pickup tick")
- **Proposed:** `[]` (empty)
- **Intent match:** N/A -- `Bite-1` is labeled "basic melee attack." Using it for XP pickup was always a stopgap. BD-48 recommends removing it.
- **FLAG: REASSIGNMENT** -- Remove `Bite-1` from this event. XP pickup should be silent until a dedicated chime is recorded.

### 3.8 World Events

#### `sfx_crate_open`
- **Current:** `['litterbox-1.ogg']`
- **Proposed:** `['litterbox-1-litterbox special attack for cat.ogg']`
- **Intent match:** NO -- Developer says "special attack for cat," not "crate opening." This was a wrong-fit substitute.
- **FLAG: REASSIGNMENT** -- Remove. Crate opening has no dedicated sound. Could potentially use `explode-1` (which mentions "bombs"), but that's already assigned to `sfx_explosion`. Leave empty or use a different sound.

#### `sfx_shrine_break`
- **Current:** `['explode-1.ogg']`
- **Proposed:** `['explode-1-bombs big zombies dying.ogg']`
- **Intent match:** PARTIAL -- "bombs" could apply to breaking a shrine, but the developer's intent is "bombs, big zombies dying," not shrine destruction. BD-48 specifically calls this out as a wrong mapping.
- **FLAG: REASSIGNMENT CANDIDATE** -- Acceptable as a temporary mapping, but shrine break should ideally have a distinct stone/crystal sound (not in this pack). Consider keeping as-is until Sound Pack Beta.

#### `sfx_item_pickup`
- **Current:** `['litterbox-1.ogg']`
- **Proposed:** `['litterbox-1-litterbox special attack for cat.ogg']`
- **Intent match:** NO -- Same issue as `sfx_crate_open` and `sfx_powerup_generic`. The litterbox sound is a special attack, not a pickup.
- **FLAG: REASSIGNMENT** -- Remove. Item pickup should be silent or use a dedicated sound (not in this pack).

#### `sfx_comedic_drop`
- **Current:** `['poop-1.ogg']`
- **Proposed:** `['poop-1-for laying turds.ogg']`
- **Intent match:** YES -- "laying turds" is exactly the comedic drop event. No change needed.

---

## 4. Unmapped Files

Files on disk that are not currently assigned to any SOUND_MAP event:

| File | Developer's Intent | Suggested Event |
|------|-------------------|-----------------|
| `zombie-alt 3rd4th zomb combine.ogg` | 3rd/4th zombie combine | `sfx_zombie_merge` (mid-tier pool) |

**Note:** This is the file formerly known as `zombie-6.ogg`. It was renamed with a completely different prefix (`zombie-alt` instead of `zombie-6`), which means the old SOUND_MAP reference `zombie-6.ogg` broke AND the new name doesn't follow the numbered convention. It is currently referenced in `sfx_zombie_merge` under the old name `zombie-6.ogg` but will fail to load. All other files on disk are mapped (though many mappings are broken by renames or wrong assignments).

---

## 5. Full Proposed SOUND_MAP (Clean Version)

Below is the recommended new SOUND_MAP with all filename updates applied and reassignments based on the developer's intent:

```javascript
const SOUND_MAP = {
  // --- Combat ---
  sfx_melee_hit: [
    'Bite-1-basic melee attack.mp3',
    'Bite-2-alt basic melee attack.ogg',
    'bite-3-strong melee attack.ogg',
    'bite-4-tearing melee attack.ogg',
  ],
  sfx_power_attack_charge: [
    'leapord-growl-1.ogg',
  ],
  sfx_power_attack_release: [
    'rawr-1-cat or bear roar.ogg',
  ],
  sfx_explosion: [
    'explode-1-bombs big zombies dying.ogg',
  ],

  // --- Weapons ---
  sfx_weapon_projectile: [
    'pew-pew-pew-1-for tripple ranged attacks ally.ogg',
    'pew-pew-pew-2-3x ranged attack.ogg',
  ],
  sfx_weapon_multishot: [
    'pew-pew-pew-pew-pew-1-5x ranged attack.ogg',
  ],
  sfx_weapon_heavy: [
    'big-pew-1-very large projectile launch - seldom until late game huge enemies firing projectiles at range.ogg',
  ],
  sfx_weapon_poison: [
    'gas-1-large gas cloud.ogg',
    'gas-2-large gas cloud.ogg',
    'gas-3-medium gas cloud.ogg',
    'fart-1-on poison or gas cloud.ogg',
    'fart-2-gas cloud.ogg',
    'fart-3-gas cloud.ogg',
  ],
  sfx_weapon_boomerang: [
    // EMPTY -- wings-4 moved to sfx_powerup_wings; no boomerang sound in pack
  ],
  sfx_weapon_litterbox: [
    'litterbox-1-litterbox special attack for cat.ogg',
  ],

  // --- Movement ---
  sfx_jump: [
    'bouncy-boots-1-jumping while wearing extra jump powerup.ogg',
    'bouncy-boots-2-extra jump powerup.ogg',
    'bouncy-boots-3-powerup jump.ogg',
    'bouncy-boots-4-powerup jump.ogg',
  ],
  sfx_land: [
    // EMPTY -- bouncy-boots-4 moved to sfx_jump per developer intent
  ],

  // --- Powerups ---
  sfx_powerup_wings: [
    'wings-1-when wings powerup.ogg',
    'wings-2-wings powerup.ogg',
    'wings-4-wings powerup.ogg',
  ],
  sfx_powerup_wings_expire: [
    'falling-scream-1-when wings time out.ogg',
  ],
  sfx_powerup_racecar: [
    'race-car-1-powerup.ogg',
    'race-car-2-powerup.ogg',
    'race-car-3-powerup.ogg',
  ],
  sfx_powerup_speed: [
    'e-scooter-1-powerup escooter only.ogg',
    'e-scooter-2-powerup only.ogg',
  ],
  sfx_powerup_generic: [
    // EMPTY -- litterbox moved to sfx_weapon_litterbox
  ],

  // --- Zombie ---
  sfx_zombie_spawn: [
    // EMPTY -- no dedicated spawn sounds in pack; all zombie files are merge sounds
  ],
  sfx_zombie_merge_low: [
    'zombie-1-on first zomb combine.ogg',
    'zombie-2-on second zomb combine.ogg',
    'zombie-3-on zomb combine alt 1-2.ogg',
    'zombie-7-on first zomb combine.ogg',
  ],
  sfx_zombie_merge_mid: [
    'zombie-alt 3rd4th zomb combine.ogg',
  ],
  sfx_zombie_merge_high: [
    'zombie-4-alt last zomb combine.ogg',
    'zombie-5- zomb combine max level.ogg',
  ],
  sfx_zombie_death_low: [
    // EMPTY -- no zombie death sounds in pack
  ],
  sfx_zombie_death_high: [
    'explode-1-bombs big zombies dying.ogg',
  ],

  // --- Player ---
  sfx_player_growl: [
    'leapord-growl-1.ogg',
  ],
  sfx_player_death: [
    // EMPTY -- falling-scream moved to sfx_powerup_wings_expire
  ],

  // --- Progression ---
  sfx_level_up: [
    'rawr-2-cat or bar roar on growth.ogg',
  ],
  sfx_xp_pickup: [
    // EMPTY -- Bite-1 was a wrong-fit; needs dedicated chime in Sound Pack Beta
  ],

  // --- World ---
  sfx_crate_open: [
    // EMPTY -- litterbox was a wrong-fit; needs dedicated sound
  ],
  sfx_shrine_break: [
    'explode-1-bombs big zombies dying.ogg',
  ],
  sfx_item_pickup: [
    // EMPTY -- litterbox was a wrong-fit; needs dedicated sound
  ],
  sfx_comedic_drop: [
    'poop-1-for laying turds.ogg',
  ],
};
```

---

## 6. Recommended Next Steps

### 6.1 Immediate (Fix broken audio)

1. **Update all filenames in SOUND_MAP** to match the new names on disk. This is the minimum required change to restore audio functionality. Every sound in the game except `leapord-growl-1.ogg` is currently broken.

2. **Decide on reassignments** before updating code. The filename-only fix (just updating strings) will restore audio, but the developer's naming reveals several wrong-fit mappings that should be corrected at the same time.

### 6.2 Reassignment Summary

| Change | Rationale |
|--------|-----------|
| Move `rawr-2` from `sfx_power_attack_release` to `sfx_level_up` | Developer labeled it "roar on growth" |
| Move `wings-4` from `sfx_weapon_boomerang` to `sfx_powerup_wings` | Developer labeled it "wings powerup" |
| Move `bouncy-boots-4` from `sfx_land` to `sfx_jump` | Developer labeled it "powerup jump" (same as boots 1-3) |
| Move `falling-scream-1` from `sfx_player_death` to new `sfx_powerup_wings_expire` | Developer labeled it "when wings time out" |
| Move `litterbox-1` from `sfx_powerup_generic`/`sfx_crate_open`/`sfx_item_pickup` to new `sfx_weapon_litterbox` | Developer labeled it "special attack for cat" |
| Remove `Bite-1` from `sfx_xp_pickup` | Developer labeled it "basic melee attack"; XP pickup should be silent |
| Move ALL zombie sounds to tiered merge events | Developer labeled every zombie file as "zomb combine" at various tiers |
| Add `explode-1` to `sfx_zombie_death_high` (dual-map) | Developer labeled it "bombs big zombies dying" |

### 6.3 New Events to Create

| New Event ID | Source | Rationale |
|-------------|--------|-----------|
| `sfx_powerup_wings_expire` | `falling-scream-1` | Developer explicitly says this is for when wings time out |
| `sfx_weapon_litterbox` | `litterbox-1` | Developer says this is a special attack, not a pickup sound |
| `sfx_zombie_merge_low` | `zombie-1`, `zombie-2`, `zombie-3`, `zombie-7` | Tiered merge system for low tiers (1-2) |
| `sfx_zombie_merge_mid` | `zombie-alt` (formerly `zombie-6`) | Tiered merge system for mid tiers (3-4) |
| `sfx_zombie_merge_high` | `zombie-4`, `zombie-5` | Tiered merge system for high/max tiers |

### 6.4 Events Left Without Sound (Gap Analysis Update)

These events will have empty file arrays after reassignment. They need dedicated sounds in Sound Pack Beta:

| Event ID | Current Wrong Sound | Should Be |
|----------|-------------------|-----------|
| `sfx_xp_pickup` | `Bite-1` (melee attack) | Quiet chime/ding |
| `sfx_crate_open` | `litterbox-1` (special attack) | Wood cracking/opening |
| `sfx_item_pickup` | `litterbox-1` (special attack) | Positive equip chime |
| `sfx_powerup_generic` | `litterbox-1` (special attack) | Powerup jingle |
| `sfx_player_death` | `falling-scream-1` (wings expire) | Death/defeat sound |
| `sfx_zombie_spawn` | `zombie-1`/`zombie-2` (merge sounds) | Zombie groan/emergence |
| `sfx_zombie_death_low` | `zombie-7` (merge sound) | Small zombie pop/splat |
| `sfx_weapon_boomerang` | `wings-4` (wings powerup) | Whoosh/spinning arc |
| `sfx_land` | `bouncy-boots-4` (jump sound) | Impact/thud |

### 6.5 Filename Hygiene Concern

The new filenames are extremely long and contain spaces, commas, and special characters. For example:
```
big-pew-1-very large projectile launch - seldom until late game huge enemies firing projectiles at range.ogg
```

This will work in JavaScript `new Audio()` calls if properly URL-encoded, but it is fragile. Consider either:
- **(A)** Keeping the short filenames in code and adding the descriptions to a separate metadata file, or
- **(B)** Adopting a convention like `big-pew-1.ogg` for code references with a `sound-descriptions.json` for the human-readable intent notes.

The file `zombie-5- zomb combine max level.ogg` has a double space after the hyphen, and `zombie-alt 3rd4th zomb combine.ogg` has a space in the prefix, both of which are potential sources of bugs.

### 6.6 BD-48 Integration

This document provides the **file audit and reassignment plan** portion of BD-48. The remaining BD-48 work items are:
- Per-event volume multipliers (not addressed here; requires listening QA)
- Per-event cooldown/throttle intervals (not addressed here; requires gameplay testing)
- SOUND_MAP structure refactor from flat arrays to objects with `files`, `volume`, `minInterval` fields
- Spatial/proximity audio (architectural change, not a mapping issue)
- Gameplay QA session with documented results

---

*Generated 2026-02-22 by sound system audit. All 40 files inventoried, all 22 event IDs reviewed, 9 reassignments proposed, 9 gap events identified.*
