# Consolidated Beads: BD-154 through BD-185

**Date:** 2026-02-24
**Source Documents:**
1. `docs/reviews/readability-audit.md` (BD-149) -- 22 UX/readability findings
2. `docs/reviews/code-review-2.md` (BD-150) -- 31 code quality issues
3. `docs/reviews/performance.md` (BD-151) -- 14 performance optimizations + 7 preventive
4. `docs/reviews/cleanup-recommendations.md` (BD-152) -- File/folder cleanup
5. `docs/reviews/documentation-audit.md` (BD-153) -- Documentation staleness
6. `docs/planning/bd145-zombie-attacks-improved.md` -- Kid-focused zombie attack improvements
7. `docs/planning/bd148-wearables-improved.md` -- Wearable equipment system (3 slots, 12 items)

**Consolidation Notes:**
- 7 source documents cross-referenced and deduplicated
- Items already implemented SKIPPED: XP gem merge, floating text cap, combo milestones, FPS counter, item pickup fanfare, reduced drop rates
- Duplicate findings (enemy terrain collision found in both code review and perf audit) merged into single beads
- 32 beads total, numbered BD-154 through BD-185
- Conflicts analyzed in Section B at the end

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or performance issue affecting Julian's ability to play | Next sprint |
| **P2** | Important improvement, noticeable quality gain | Within 2 sprints |
| **P3** | Nice-to-have, polish, or architectural cleanup | Backlog |

---

## P0 -- Game-Breaking

---

### BD-154: Fix framerate-dependent contact damage

**Category:** Code Quality
**Priority:** P0
**File(s):** `js/game3d.js` ~line 4979

**Description:** Zombie contact damage is calculated as `15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1) * dt`. The `* dt` makes damage proportional to frame time. At 60fps, damage per hit is ~0.24. At 30fps, damage per hit is ~0.50 -- literally double. Players on slower hardware take 2x more damage from the same zombie. This is the single most important bug in the codebase because Julian's hardware determines his difficulty.

**Fix Approach:**
1. Remove `* dt` from the contact damage formula at line ~4979.
2. Contact damage should be a flat amount per hit: `15 * tierData.dmgMult * st.zombieDmgMult * (e.bossDmgMult || 1)`.
3. The invincibility window (`st.invincible = 0.2`) already prevents re-application, so this is a simple one-line fix.

**Acceptance Criteria:**
- Contact damage is identical regardless of framerate (30fps, 60fps, 144fps)
- Invincibility window still prevents rapid re-hits
- Damage values feel correct at 60fps (same as current behavior at 60fps)

---

### BD-155: Consolidate all damage through damageEnemy() and damagePlayer()

**Category:** Code Quality
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 4255, 4361, 4411, 4504, 4554, 5156 (enemy bypasses), ~lines 2859-2864, 4805-4811, 4979-5001 (player bypasses)

**Description:** Six enemy damage paths bypass `damageEnemy()`, breaking Hot Sauce ignite procs and Gloves crit rolls: Fire Aura, Earthquake Stomp, Lightning Shield, Mirror Clone, Bomb Trail, and Power Attack. Three player damage paths bypass `damagePlayer()`, skipping dodge, Shield Bracelet, and Berserker Rage: Death Bolt, Titan Shockwave, and the main contact damage path. This silently undermines item synergies -- Hot Sauce + Lightning Shield does nothing, Turbo Sneakers cannot dodge Death Bolts, Shield Bracelet cannot absorb Titan Shockwaves.

**Fix Approach:**
1. Route all 6 enemy damage sources through `damageEnemy(e, dmg)`. For DoT effects (Fire Aura) that should not re-proc Hot Sauce every tick, add an optional `skipProcs` parameter: `damageEnemy(e, dmg, { skipProcs: true })`.
2. Remove the redundant Gloves check on the Power Attack path (~line 5147) since `damageEnemy()` handles it.
3. Replace the inline damage block at Death Bolt (~lines 2859-2864), Titan Shockwave (~lines 4805-4811), and contact damage (~lines 4979-5001) with calls to `damagePlayer(baseDmg)`.
4. For Thorns/reflect damage on contact: have `damagePlayer` return the final damage dealt, then apply reflect: `const dealt = damagePlayer(...); if (dealt > 0) reflectDamage(e, dealt);`.

**Acceptance Criteria:**
- ALL enemy damage sources trigger Hot Sauce ignite proc checks (except DoTs with `skipProcs`)
- ALL enemy damage sources trigger Gloves crit checks
- ALL player damage sources check invincibility, dodge, Shield Bracelet, armor, and Berserker Rage
- No duplicate armor reduction code anywhere in the file
- Power Attack with Hot Sauce equipped triggers ignite procs on hit enemies

**Note:** This bead DEPENDS on BD-154 (framerate fix) being done first or simultaneously, since the contact damage path is being rewritten.

---

### BD-156: Remove duplicate enemy-terrain collision (global collider array)

**Category:** Performance / Code Quality
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 4850-4867, `js/3d/terrain.js` ~lines 693-697

**Description:** Two separate collision systems run for every enemy every frame: (1) an O(n) scan of ALL loaded terrain colliders (~350 items), and (2) the optimized chunk-based system checking only 9 nearby chunks (~30 colliders). The first system is the old BD-103 code; the second is the BD-113 replacement. The old code was never deleted. With 50 enemies and 350 colliders, this wastes ~17,500 distance checks per frame. Found independently by both code-review-2 and performance audit.

**Fix Approach:**
1. Delete lines ~4850-4867 in `game3d.js` (the old `terrainState.colliders` scan).
2. After confirming no other code reads `terrainState.colliders`, remove it from terrain.js as well: delete the `.filter()` cleanup at ~lines 693-697 and stop maintaining the flat `ts.colliders` array.
3. Keep only `ts.collidersByChunk` in terrain state.

**Acceptance Criteria:**
- Only chunk-indexed collision system runs for enemies
- `terrainState.colliders` (flat array) no longer maintained
- No frame drops from terrain collision at 50+ enemies
- Player terrain collision also uses chunk-indexed lookup (see BD-169)

---

## P1 -- Critical UX / Performance

---

### BD-157: Kid-friendly HUD text overhaul (font sizes, opacity, labels)

**Category:** UX
**Priority:** P1
**File(s):** `js/3d/hud.js` (throughout)

**Description:** Consolidates readability findings C-1, C-2, C-3, H-1, H-2, H-4, H-7, M-8, L-1, L-3 from the readability audit. The HUD uses 9-16px Courier New text at low opacity throughout. A 7-year-old sitting 2-3 feet from a monitor cannot read most of it. This bead addresses all font size, opacity, and label text issues in a single pass.

**Fix Approach:**

| Element | Current | New | HUD.js Lines |
|---------|---------|-----|-------------|
| Controls hint | 14px, 50% opacity | bold 20px, 85% opacity. Shorten to `WASD Move | SPACE Jump | B Attack`. Auto-hide after 30s. | ~361-372 |
| Volume indicator | 12px, 35% opacity + 9px sublabel | bold 16px, 70% opacity. Remove `[M] mute` sublabel. | ~312-324 |
| Minimap label | bold 10px | bold 14px | ~534-538 |
| Minimap dots | Radius 1.5 (tier-scaled) | Minimum radius 2.5. Player triangle 6px tall. | ~374-539 |
| HP bar | 200x24px, bold 16px | 220x30px, bold 20px. Add pulsing red border at <25% HP. | ~75-81 |
| XP bar | 200x18px, bold 14px | 200x22px, bold 16px | ~84-90 |
| Weapon slots | 140x20px, bold 14px | 160x24px, bold 16px. Empty slot text `#666` not `#444`. | ~98-121 |
| Active powerup | bold 14px, 120x6px timer | bold 20px, 150x12px timer. Move to y=40. | ~156-166 |
| Pause menu options | bold 16px | bold 24px. Card 180x90px. Nav hint bold 18px `#aaa`. | ~641-676 |
| Level display | "LVL" | "Level" or keep as-is (low priority) | ~94 |
| Item announcement desc | 13px | bold 16px. Banner height 70px. | ~974-1006 |

**Acceptance Criteria:**
- All HUD text is minimum bold 14px (exception: FPS debug counter, which is a dev tool)
- No text below 60% opacity (exception: depleted/inactive states)
- Controls hint auto-hides after 30 seconds of gameplay
- HP bar pulses red border when below 25%
- Julian can read weapon names, HP numbers, and powerup names from 3 feet away

---

### BD-158: Rewrite upgrade menu and howl descriptions for a 7-year-old

**Category:** UX
**Priority:** P1
**File(s):** `js/3d/constants.js` ~lines 69-135 (weapon descs), ~lines 163-174 (howl descs), ~lines 346-378 (shrine descs); `js/3d/hud.js` ~lines 706-762 (rendering)

**Description:** Consolidates M-1, M-2, M-3, M-4, M-5, M-6, M-7 from the readability audit. Upgrade descriptions use RPG jargon ("AoE arc slash", "+15% all weapon damage", "-15% all cooldowns", "+1 projectile count") that a 7-year-old cannot understand. Category badges ("HOWL"), howl display names, augment labels ("AUGMENTS"), shrine rarity labels ("UNCOMMON SHRINE"), and reroll text ("REROLL") are all adult gamer language.

**Fix Approach:**
1. In `constants.js`, rewrite ALL weapon upgrade descriptions to kid-friendly language:
   - "+15% all weapon damage" -> "Hit harder!"
   - "-15% all cooldowns" -> "Attack faster!"
   - "+1 projectile count" -> "Shoot more stuff!"
   - "+20 max HP & heal" -> "More hearts!"
   - "+30% XP gain" -> "Level up faster!"
   - "Reflect 10% contact damage" -> "Hurt them back!"
   - "+25% pickup radius" -> "Grab stuff easier!"
   - "+10% attack speed" -> "Attack faster!"
   - "+8% max HP, +2 HP/s regen" -> "Tougher and heal!"
2. Rename category badges in HUD: "NEW WEAPON" -> "NEW!", "UPGRADE" -> "BETTER!", "HOWL" -> "POWER!", "HEAL" -> "HEAL!". Make badge backgrounds more opaque (`'88'` suffix).
3. Increase badge font from 14px to 16px, description font from 14px to 16px.
4. In howl display, drop "HOWL" from names: "POWER HOWL x3" -> "POWER x3". Add section header "YOUR POWERS:" at bold 16px.
5. Rename "AUGMENTS" label to "BOOSTS" in HUD.
6. Simplify augment display names: "+5% Max HP" -> "Tougher!", "+5% Damage" -> "Stronger!".
7. Replace shrine rarity labels: "COMMON" -> "SMALL", "UNCOMMON" -> "COOL", "RARE" -> "AWESOME", "LEGENDARY" -> "MEGA".
8. Change reroll text from `[R] REROLL (2 left)` to `Press R for NEW CHOICES! (2 left)` at bold 18px.
9. Fix "PRESS ENTER TO SELECT" flash: change from full on/off blink to gentle pulse (always at least 60% visible): `const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005)`. Increase to bold 22px.

**Acceptance Criteria:**
- No description contains the words: cooldown, projectile, AoE, multiplicative, contact damage, augment, reroll
- All descriptions are 4 words or fewer
- Badge text is 16px bold with opaque backgrounds
- "PRESS ENTER TO SELECT" is always visible (never fully disappears)
- Reroll text says "NEW CHOICES" not "REROLL"

---

### BD-159: Simplify game-over screen for a kid

**Category:** UX
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 854-956 (kill breakdown + leaderboard + feedback)

**Description:** Consolidates C-4, C-5, C-6 from the readability audit. The game-over screen is a data table: 6-8 lines of 11px tier kill breakdown with names like "Shambler," "Lurcher," "Abomination," "Nightmare"; a 7-column leaderboard with RANK/NAME/SCORE/ANIMAL/LVL/WAVE/TIME; and feedback questions at 11-13px with a Discord reference.

**Fix Approach:**
1. Kill breakdown: Either (A) replace with a single big "YOU DEFEATED 200 ZOMBIES!" line at bold 28px, or (B) keep breakdown but use kid-friendly tier names ("Tiny," "Big," "Huge," "MEGA") at bold 16px in brighter color (`#ffaa44`).
2. Leaderboard: Show top 5 only, 3 columns only (RANK, NAME, SCORE). Increase font to bold 18px entries, bold 16px header. Gold/silver/bronze colors for ranks 1/2/3.
3. Feedback: Change question to "Was that FUN?" with YES / KINDA / NAH at bold 20px question, bold 18px options. Remove Discord reference entirely.

**Acceptance Criteria:**
- No tier names Julian cannot read (no "Abomination," "Ravager," "Nightmare")
- Leaderboard has 3 columns max, 5 entries max
- Feedback question uses kid language, no Discord mention
- All game-over text is minimum 14px bold

---

### BD-160: Reduce floating text clutter and improve readability hierarchy

**Category:** UX
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 466-503 (spawning), `js/3d/hud.js` ~lines 228-239 (rendering)

**Description:** Consolidates H-3, H-5 from the readability audit. In late game, the center of the screen is a chaotic soup of overlapping floating text (damage numbers, "+XP", "BOOM!", item names, combo counts). The left side of the screen is a wall of 10-15 lines of item text. Important messages get buried in noise.

**Fix Approach:**
1. Reduce MAX_FLOATING_TEXTS from 15 to 8.
2. Increase dedup window from 0.3s to 0.6s.
3. Create a text size hierarchy: non-important texts ("+XP", damage numbers) use 14px and 0.3s life; important texts (item pickups, boss kills, combo milestones) use bold 20px and 0.6s life.
4. Add horizontal spread: offset each new text by random +-30px on screen X to reduce vertical stacking.
5. Equipped items list: show only the 5 most recently acquired items, not the full inventory. Or move the full list to the pause menu.
6. Increase item list font from 15px to bold 16px with 20px line spacing. Use colored dots instead of brackets.

**Acceptance Criteria:**
- Maximum 8 floating texts on screen at once
- Damage numbers are visually smaller than item/combo/boss texts
- Equipped items list shows 5 items max during gameplay
- No screen edge is fully consumed by text during late game

---

### BD-161: Wave progress bar fix (hardcoded divisor)

**Category:** Code Quality
**Priority:** P1
**File(s):** `js/3d/hud.js` ~line 128, `js/game3d.js` (wave timer setup)

**Description:** The wave progress bar calculates fill as `1 - (s.waveEventTimer / 90)`. The 90 is hardcoded but wave timers vary by difficulty (75s Normal, 90s Hard). On Normal difficulty, the bar shows 100% when 15 seconds remain. Found in both readability audit (H-6) and code review (HIGH: wave progress bar hardcoded divisor).

**Fix Approach:**
1. Add `st.waveTimerMax` to the state object, set it alongside `st.waveEventTimer` wherever the wave timer is reset.
2. Pass `s.waveTimerMax` in the HUD state object.
3. In hud.js, replace `/ 90` with `/ s.waveTimerMax`.

**Acceptance Criteria:**
- Wave progress bar reaches exactly 100% when the wave spawns, on all difficulty settings
- No hardcoded wave timer value in hud.js

---

### BD-162: Import shared constants instead of duplicating them

**Category:** Code Quality
**Priority:** P1
**File(s):** `js/3d/hud.js` ~line 328 (CHARGE_TIME), `js/game3d.js` ~line 4874 (CHUNK_SZ)

**Description:** Two constants are locally redefined with "must match X" comments: `CHARGE_TIME = 4` in hud.js (duplicates `CHARGE_SHRINE_TIME` from constants.js) and `CHUNK_SZ = 16` in game3d.js (duplicates `CHUNK_SIZE` from terrain.js). If the originals change, the copies silently break.

**Fix Approach:**
1. In hud.js: import `CHARGE_SHRINE_TIME` from `js/3d/constants.js` and use it directly. Delete the local `CHARGE_TIME`.
2. In game3d.js: import `CHUNK_SIZE` from `js/3d/terrain.js` and use it in the enemy collision chunk lookup. Delete the local `CHUNK_SZ`.

**Acceptance Criteria:**
- No "must match" comments referencing constants defined elsewhere
- Only one definition of each constant in the entire codebase

---

### BD-163: Remove duplicate gameTime state property

**Category:** Code Quality
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 290, 422

**Description:** The state object `st` has `gameTime: 0` at both ~line 290 and ~line 422. JavaScript object literals silently let the second overwrite the first. Currently both are `0` so no bug exists, but any future change to one will be overwritten by the other.

**Fix Approach:**
1. Delete the duplicate at ~line 422.
2. Search the entire state object for other duplicate property names and remove any found.

**Acceptance Criteria:**
- `gameTime` defined exactly once in the state object
- No other duplicate property names in the state object

---

### BD-164: Shadow map performance optimization

**Category:** Performance
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 770-805

**Description:** The game uses `PCFSoftShadowMap` at 2048x2048, the most expensive shadow configuration. With hundreds of decoration meshes and 50+ enemies all marked `castShadow = true`, the shadow pass alone can take 5-10ms per frame on integrated GPUs. Estimated improvement: 10-20 FPS on integrated GPUs.

**Fix Approach:**
1. Reduce shadow map from 2048x2048 to 1024x1024.
2. Switch from `PCFSoftShadowMap` to `PCFShadowMap` (cheaper, still smooth enough).
3. Tighten `dirLight.shadow.camera` frustum from -40/40 to -25/25 (covers visible area around player).
4. Disable `castShadow` on all decorations -- only player and nearby enemies cast shadows.
5. Only enable `castShadow` on enemies within 20 units of the player (toggle in the enemy update loop).

**Acceptance Criteria:**
- Shadow map is 1024x1024 with PCFShadowMap
- Decorations (trees, rocks, mushrooms, grass, flowers) do not cast shadows
- Only enemies within 20 units of the player cast shadows
- Visual quality is acceptable (shadows still visible, not jagged)
- Measurable FPS improvement on integrated GPU hardware

---

### BD-165: Performance quick wins bundle (easy, high-impact)

**Category:** Performance
**Priority:** P1
**File(s):** `js/3d/hud.js`, `js/game3d.js`, `js/3d/player-model.js`

**Description:** Bundles 7 easy performance fixes from the performance audit that can each be done in 1-5 lines of code. Combined estimated gain: 10-20 FPS.

**Fix Approach:**

1. **Reuse Vector3 in HUD** (~hud.js line 229): Hoist `const _v = new THREE.Vector3()` outside the floating text loop. Replace `new THREE.Vector3(ft.x, ft.y, ft.z)` with `_v.set(ft.x, ft.y, ft.z)`. Apply same pattern at ~lines 289, 301.

2. **Cache fire particle materials** (~game3d.js line 1588): Create a `Map<number, MeshBasicMaterial>` cache. In `spawnFireParticle`, lookup by hex color before creating new material. Do NOT dispose cached materials on particle death.

3. **Fix ghost form traverse** (~game3d.js lines 4324-4348): Add `st._ghostFormWasActive` flag. The `else` branch only runs once (when `st._ghostFormWasActive && !st.ghostForm`), then sets the flag to false.

4. **Skip muscle growth when level unchanged** (~game3d.js line 4210): Add `if (st.level !== st._lastGrowthLevel)` guard. Set `st._lastGrowthLevel = st.level` after calling `updateMuscleGrowth`.

5. **Throttle fog-of-war updates** (~game3d.js lines 4044-4056): Only update when player moves to a new fog cell (track `st._lastFogCellX`, `st._lastFogCellZ`).

6. **Use swap-and-pop for dead enemy cleanup** (~game3d.js line 5670): Replace `splice(i, 1)` with swap-last-and-pop or use `.filter()` once per frame.

7. **Delete unused eScale variables** (~game3d.js lines 4933, 4941): Remove both dead `const eScale` assignments.

**Acceptance Criteria:**
- No `new THREE.Vector3()` inside any per-frame loop
- Fire particle materials are cached and reused
- Ghost form traverse only runs on state transition, not every frame
- Muscle growth only recalculates on level change
- Fog updates only recalculate on cell change
- No `splice()` in hot per-frame cleanup loops
- All changes verified to not break gameplay

---

## P2 -- Important

---

### BD-166: Improve zombie attack telegraphs (visibility overhaul)

**Category:** Feature / UX
**Priority:** P2
**File(s):** `js/game3d.js` (attack system, ~lines 3173-3212 and related), `js/3d/constants.js`

**Description:** Consolidates the zombie attack improved design doc. Current tier 2-6 attack telegraphs have critical visibility problems: tier 4 (Bone Spit) aim line uses `LineBasicMaterial` which renders as 1px wide (invisible), tier 6 (Grave Burst) X markers use the same invisible lines, telegraph colors are too muted for the forest floor palette, and telegraph durations are too short for a 7-year-old's first encounter.

**Fix Approach (priority order within this bead):**
1. **Replace Tier 4 aim line**: Change `LineBasicMaterial` to a flat BoxGeometry strip (0.3w x 0.1h x length). Color `0xffff00`, opacity 0.6. Add a target circle (RingGeometry) at the aim endpoint.
2. **Replace Tier 6 X markers**: Change crossed lines to RingGeometry ground markers (radius 1.5). Color `0xff0000`, pulsing opacity 0.3-0.7.
3. **Increase all telegraph durations**: Tier 2: 0.6s -> 1.0s. Tier 3: keep (already OK). Tier 4: 0.8s -> 1.0s. Tier 5: 0.7s -> 1.0s. Tier 6: 1.2s -> 1.5s.
4. **Brighten all telegraph colors to neon**: Tier 2 arrow `0xffaa00` -> `0xffff00`. Tier 3 ring `0xff6600` -> `0xff2200`. Tier 5 pool `0x22aa22` -> `0x44ff44`.
5. **Increase bone projectile size**: 0.3x0.15x0.15 -> 0.5x0.3x0.3 with faint emissive glow.
6. **Add universal body flash**: When any zombie enters telegraph state, flash its body emissive to match the attack color for 0.2s.

**Acceptance Criteria:**
- No `LineBasicMaterial` used for any attack telegraph
- All telegraphs use neon colors that contrast with the forest floor
- Tier 2 telegraph is at least 1.0s long
- Tier 4 aim line is visibly wide (0.3 units minimum) from camera distance
- Tier 6 markers are circular rings, not crossed lines
- Zombie body visually changes when telegraphing (emissive flash)

---

### BD-167: Move poison pool placement to player position (Tier 5 design fix)

**Category:** Feature / Balance
**Priority:** P2
**File(s):** `js/game3d.js` (tier 5 attack logic)

**Description:** Tier 5 (Ravager) Poison Pool spawns at the zombie's position, making it redundant with contact damage (the player is already being damaged by contact if they are close enough to be hit by the pool). Moving it to the player's position turns it into actual area denial.

**Fix Approach:**
1. At telegraph start, save the player's current position: `e._attackTargetX = st.playerX; e._attackTargetZ = st.playerZ`.
2. Place the telegraph circle at the saved player position (not zombie position).
3. On fire, spawn the pool at the saved position with 0-1 unit random offset.
4. Increase trigger range from 6 to 10 units.
5. Make pool shrink visually over its final 50% of lifetime (scale from 1.0 to 0.0).

**Acceptance Criteria:**
- Poison pool spawns near where the player WAS when the telegraph started
- Telegraph circle appears at the player's position, not the zombie's
- Pool is visible from 10 units away (neon green `0x44ff44`)
- Pool visually shrinks over its final 2 seconds
- Trigger range is 10 units

**Note:** Depends on BD-166 for the neon color change.

---

### BD-168: Biased shuffle fix (Fisher-Yates)

**Category:** Code Quality
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 3904-3907, 5558

**Description:** Upgrade menu choices and shrine upgrades use `.sort(() => Math.random() - 0.5)`, which is a well-known biased shuffle. V8's TimSort produces non-uniform distributions with this comparator, favoring elements near their original positions.

**Fix Approach:**
1. Add a `shuffle(arr)` utility function using Fisher-Yates algorithm.
2. Replace all 4 `.sort(() => Math.random() - 0.5)` calls with `shuffle(arr)`.

**Acceptance Criteria:**
- No `.sort(() => Math.random() - 0.5)` anywhere in the codebase
- Upgrade options and shrine choices are uniformly distributed
- `shuffle()` is a reusable utility function

---

### BD-169: Use chunk-indexed colliders for player terrain collision

**Category:** Performance
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 4059-4073

**Description:** Player terrain collision iterates ALL global colliders (~350) when only ~30 in nearby chunks matter. Same issue as the enemy collision (BD-156) but for the player. Runs once per frame, not per-enemy, so lower priority.

**Fix Approach:**
1. Replace the `terrainState.colliders` loop with a `collidersByChunk` 9-chunk lookup, matching the pattern already used for enemies.
2. This naturally follows from BD-156 which removes the global colliders array.

**Acceptance Criteria:**
- Player terrain collision checks ~30 colliders per frame, not ~350
- No reference to `terrainState.colliders` anywhere in game3d.js

**Note:** DEPENDS on BD-156. Must be done together or after.

---

### BD-170: Fix Date.now() timing in game loop animations

**Category:** Code Quality
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 5314, 5591-5596

**Description:** Map gem bobbing and charge shrine animations use `Date.now()` (wall-clock time) instead of `clock.elapsedTime`. These animations continue to advance during pause, causing visual inconsistency.

**Fix Approach:**
1. Replace `Date.now()` with `clock.elapsedTime` in gem bobbing (~line 5314), shrine rune orbit (~lines 5591-5592), and shrine pulse glow (~line 5596).
2. Replace the `setTimeout` for charge glow cleanup (~lines 5166-5173) with a game-time-based timer: `st.chargeGlowFlashTimer = 0.1`, decremented by `dt`.

**Acceptance Criteria:**
- No `Date.now()` calls inside the game loop
- No `setTimeout()` calls inside the game loop
- Animations pause when the game is paused

---

### BD-171: Fix grass/flower deterministic generation

**Category:** Code Quality
**Priority:** P2
**File(s):** `js/3d/terrain.js` ~lines 455-503

**Description:** `createGrassPatch()` and `createFlowerPatch()` use `Math.random()` instead of deterministic noise. When chunks unload and reload, grass/flowers regenerate with different values, unlike all other terrain decorations which use `noise2D()`.

**Fix Approach:**
1. Replace `Math.random()` calls in both functions with `noise2D(dx * factor, dz * factor)` using the decoration's world position as seed, matching the pattern used by trees, rocks, and stumps.

**Acceptance Criteria:**
- Grass and flower patches look identical when a chunk is unloaded and reloaded
- No `Math.random()` in `createGrassPatch` or `createFlowerPatch`

---

### BD-172: Index decorations by chunk key for O(1) unload

**Category:** Performance
**Priority:** P2
**File(s):** `js/3d/terrain.js` ~lines 685-697

**Description:** Consolidates code review M-6 and performance P6. Decoration unloading iterates the full `ts.decorations` array with splice, and collider cleanup uses `.filter()` creating a new array. Both are O(n) per chunk unload.

**Fix Approach:**
1. Add `ts.decorationsByChunk = {}` (keyed by chunk string, like `collidersByChunk`).
2. During chunk generation, index new decorations by chunk key.
3. On chunk unload, look up decorations by key directly -- O(1) lookup, O(k) cleanup where k is decorations in that chunk.
4. Remove the reverse-loop splice pattern.

**Acceptance Criteria:**
- Chunk unloading is O(k) per chunk, not O(n) over all decorations
- No `splice()` in the unload path
- No frame hitches when crossing chunk boundaries

---

### BD-173: Separate canopy mesh array for wind animation

**Category:** Performance
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 5709-5721, `js/3d/terrain.js`

**Description:** Tree canopy sway iterates ALL ~4,000 decoration meshes every frame to find ~200 canopies via `userData.isCanopy` checks. This is wasteful.

**Fix Approach:**
1. Add `ts.canopyMeshes = []` to terrain state.
2. In `createTree()`, push canopy meshes to this array.
3. On chunk unload, remove entries for that chunk's canopies.
4. In game3d.js, iterate `ts.canopyMeshes` directly instead of all decorations.

**Acceptance Criteria:**
- Wind animation loop iterates only canopy meshes (~200), not all decorations (~4,000)
- Canopy sway still works correctly
- Canopies are properly cleaned up on chunk unload

---

### BD-174: XP gem material optimization

**Category:** Performance
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 1839-1844, 5238-5241

**Description:** Every XP gem gets a cloned material via `gemMat.clone()`. With 100+ gems on screen, each requires a separate draw call. The merge system also clones materials. Estimated improvement: 10-30 FPS at high gem counts.

**Fix Approach (simpler approach first):**
1. Create 4 shared gem materials: `gemMatSmall`, `gemMatMedium`, `gemMatLarge`, `gemMatMega` with increasing emissive intensity.
2. Assign by reference based on gem XP value tier, instead of cloning.
3. Do NOT dispose shared materials on gem death.
4. Remove all `gemMat.clone()` calls.

**Acceptance Criteria:**
- Maximum 4 gem materials exist at any time (not 100+)
- Gems still visually differentiate by merge tier (color/glow)
- No material leak on gem cleanup
- Measurable draw call reduction

---

### BD-175: Zombie merge loop throttling

**Category:** Performance
**Priority:** P2
**File(s):** `js/game3d.js` ~lines 5044-5098

**Description:** The zombie-zombie merge loop is O(n^2) and runs every frame. With 80 enemies, that is 3,160 pair checks per frame. Merges are rare events that do not need per-frame precision.

**Fix Approach:**
1. Add a `st.mergeCheckTimer` that counts down by `dt`.
2. Only run the merge loop when timer expires (every 0.5s).
3. Reset timer after each check.

**Acceptance Criteria:**
- Merge loop runs at most twice per second, not 60 times
- Merges still happen reliably when enemies overlap
- No visible delay in merge behavior

---

### BD-176: Wave warning positioning and visibility

**Category:** UX
**Priority:** P2
**File(s):** `js/3d/hud.js` ~lines 142-153

**Description:** H-6 from readability audit. Wave warning "WAVE X INCOMING" appears at y=90 which overlaps the HP/XP bar area. The red overlay at 6% opacity is too subtle for a 7-year-old.

**Fix Approach:**
1. Move wave warning to center screen: `y = H * 0.35`, countdown at `y = H * 0.45`.
2. Increase red overlay from 6% to 12% opacity.
3. Keep font sizes (28px and 36px are good).

**Acceptance Criteria:**
- Wave warning appears at vertical center of screen, not overlapping HUD bars
- Red overlay is noticeably visible to a child
- Text sizes unchanged (already good)

---

### BD-177: Delete WEAPON_CLASS_SCALING dead code or integrate it

**Category:** Code Quality
**Priority:** P2
**File(s):** `js/3d/constants.js` ~lines 141-145

**Description:** `WEAPON_CLASS_SCALING` is exported but never imported or referenced anywhere. It defines per-class damage/cooldown/range multipliers for `aoe`, `projectile`, and `mine` weapon classes that are not applied to any weapon.

**Fix Approach:**
Option A (recommended): Delete `WEAPON_CLASS_SCALING` if the weapon balancing design does not call for class-based scaling.
Option B: Integrate it into weapon damage/cooldown/range calculations if class-based scaling is desired.

**Acceptance Criteria:**
- No exported constants that are never imported
- If kept, WEAPON_CLASS_SCALING is actually used in weapon calculations

---

### BD-178: Hex color arithmetic overflow fix

**Category:** Code Quality
**Priority:** P2
**File(s):** `js/3d/terrain.js` ~lines 251, 316, 420, 433

**Description:** Color variation via integer arithmetic (`color + 0x111111`) does not respect RGB channel boundaries. If a channel is near 0xFF, the carry corrupts the next channel.

**Fix Approach:**
1. Create a helper function `adjustColor(hex, rAdj, gAdj, bAdj)` that does per-channel clamped arithmetic.
2. Replace all 4 raw hex arithmetic sites with calls to this helper.

**Acceptance Criteria:**
- No raw integer addition/subtraction on hex color values
- Color adjustments are clamped to 0x00-0xFF per channel
- Decoration colors look correct (no unexpected hue shifts)

---

## P2 -- Features

---

### BD-179: Zombie attack improvements -- Chill Mode scaling and first-encounter labels

**Category:** Feature / Balance
**Priority:** P2
**File(s):** `js/game3d.js` (attack damage + telegraph timing), `js/3d/constants.js`

**Description:** Cross-tier recommendations from the zombie attack design doc. Attack damage should scale with difficulty mode (Chill Mode is Julian's mode). First encounter with each tier's special attack should show a floating name label.

**Fix Approach:**
1. Scale special attack damage by difficulty: Chill 0.5x, Easy 0.75x, Normal 1.0x, Hard 1.3x. Apply via existing `st.zombieDmgMult` or a new `st.specialAttackDmgMult`.
2. On Chill Mode, multiply all telegraph durations by 1.5x.
3. Track `st.attackFirstSeen = { 2: false, 3: false, 4: false, 5: false, 6: false }`.
4. On first encounter per tier per run, show floating text: "LUNGE!", "GROUND POUND!", "BONE SPIT!", "POISON POOL!", "GRAVE BURST!" in the attack's color.

**Acceptance Criteria:**
- On Chill Mode, tier 2 lunge does ~2-3 damage (not 5)
- On Chill Mode, all telegraph durations are 50% longer
- First encounter with each tier's attack shows a floating name label (once per run)
- Damage scaling uses the difficulty multiplier system

---

### BD-180: Wearable equipment system (3 slots, 12 items)

**Category:** Feature
**Priority:** P2
**File(s):** `js/3d/constants.js` (new WEARABLES_3D constant), `js/3d/player-model.js` (visual builders), `js/game3d.js` (state, equip logic, drop logic), `js/3d/hud.js` (3-slot display)

**Description:** The full wearable equipment system from the BD-148 improved design: 3 slots (HEAD, BODY, FEET) with 4 items each (one per rarity tier). This is a multi-sprint feature. This bead covers the design and Phase 1 (common + uncommon, 6 items).

**Fix Approach (Phase 1 only):**
1. Add `WEARABLES_3D` constant to constants.js with 3 slots, 4 items each (full data structure).
2. Add `st.wearables = { head: null, body: null, feet: null }` to game state.
3. Implement `buildWearable(model, wearableId, rarity)` in player-model.js that returns `{ meshes[], update(dt, st), cleanup() }`.
4. Build visual meshes for 6 common + uncommon items: Party Hat, Shark Fin, Cardboard Box, Bumble Armor, Clown Shoes, Spring Boots.
5. Implement auto-replace equip flow: higher rarity auto-equips with fanfare, lower rarity requires confirm (walk over twice within 5s).
6. Add 3-slot visual display to HUD bottom-left.
7. Wearable drops: 30% chance on loot roll, slot distribution protects against duplicates within 60s.

**Acceptance Criteria (Phase 1):**
- 3 equipment slots visible in HUD
- 6 items (2 per slot) can be found and equipped
- Items are visible on the player model from camera distance
- Auto-equip works for higher rarity
- Lower rarity items do not auto-replace without confirmation
- Equipping triggers BD-147 pickup fanfare

**Note:** This is a large feature. Phase 2 (rare items), Phase 3 (legendary items), and Phase 4 (migration of existing items to passives) are separate future beads. Phase 1 alone is a full sprint.

---

## P3 -- Nice-to-Have / Housekeeping

---

### BD-181: Kid-friendly font for HUD

**Category:** UX
**Priority:** P3
**File(s):** `js/3d/hud.js` (every `ctx.font` call)

**Description:** L-5 from readability audit. Every HUD text uses Courier New, a monospace font designed for code editors. Rounded, thicker fonts are friendlier and easier for young readers. However, this affects every single text rendering call in the file and is a high-risk change.

**Fix Approach:**
1. Define a `const GAME_FONT = '"Fredoka One", "Baloo 2", "Comic Sans MS", sans-serif'` constant.
2. Replace all `Courier New` references with `GAME_FONT`.
3. Load Fredoka One via Google Fonts CDN in index.html (or fall back to Comic Sans MS / system sans-serif).
4. Test every text rendering site for width/wrapping changes (different fonts have different glyph widths).

**Acceptance Criteria:**
- All HUD text uses a rounded, kid-friendly font (not Courier New)
- Fallback chain works if web font fails to load
- No text overflow or clipping from glyph width changes
- Keep Courier New only for the FPS debug counter

---

### BD-182: File and folder cleanup

**Category:** Housekeeping
**Priority:** P3
**File(s):** Various non-code files

**Description:** Consolidates cleanup recommendations from BD-152. The project has accumulated 30 stale agent worktrees (126MB), duplicate screenshots, superseded scripts, and root-level docs that belong in `docs/`.

**Fix Approach:**
1. Remove 30 agent worktrees: `rm -rf ".claude/worktrees/"` (gitignored, not tracked, all work merged).
2. Remove 9 duplicate long-named gfx screenshots from `screenshot-ai/`.
3. Remove 3 superseded script versions (`take-screenshots.js`, `take-screenshots-v2.js`, `playthrough.js`).
4. Remove 10 v1 screenshots from `screenshot-ai/`.
5. Remove empty `screenshot-ai/test-results/` directory.
6. Move root-level docs into `docs/`: `better-graphics-v0.md` -> `docs/planning/`, `play-through-findings.md` -> `docs/reviews/`, `playwright-playthrough-2.md` -> `docs/reviews/`.
7. Mark `sound-pack-alpha/proposed-mapping-changes.md` as STALE at the top.
8. Add `screenshot-ai/*.png` to `.gitignore`.

**Acceptance Criteria:**
- No agent worktrees in `.claude/worktrees/`
- No duplicate screenshots in `screenshot-ai/`
- Only latest script versions remain
- No loose markdown files at repo root (except README, ARCHITECTURE, CONTRIBUTING, AGENTS)
- Future screenshot PNGs are gitignored

---

### BD-183: Documentation updates (README, agent instructions, sprint plans)

**Category:** Housekeeping
**Priority:** P3
**File(s):** `README.md`, `Ideal Agent Instructions/agents.md`, `Ideal Agent Instructions/README.md`, `docs/planning/wildfang-current-status.md`, all completed sprint `docs/planning/*.md`

**Description:** Consolidates documentation audit findings. README has wrong counts for nearly everything (weapons: 6 vs 11, howls: 6 vs 10, items: 11 vs 25, shrines: 20 vs 52, totems: 8 vs 24, wave timing: 4min vs 1.5min). Agent instructions have wrong file paths. Sprint plans have no completion markers.

**Fix Approach:**
1. **README.md**: Rewrite Feature Highlights section with correct counts. Update weapon list (11), howl list (10, renamed from "Scrolls"), item count (25) with rarity system, shrine types (3: breakable/charge/challenge), totem count (24), wave timing (~1.5 min). Add Chill Mode to difficulty table. Add Controls entries for Tab (map) and Backtick (FPS). Remove "Litter Box" from 3D powerup list. Add sections for kill combo, boss encounters, zombie special attacks, item rarity.
2. **Agent instructions**: Fix file paths in `agents.md` lines 12-14, 56-58 (remove `docs/` prefix). Update `README.md` structure diagram to show flat layout + include `parallelization.md`.
3. **Sprint plans**: Add "STATUS: COMPLETE" headers to all finished sprint plans: `sprint-bd88-96.md`, `sprint-bd128-plus.md`, `sprint-bd137-141.md`, and all `beads-*.md` for implemented beads.
4. **wildfang-current-status.md**: Add "SUPERSEDED" header. Too stale to update incrementally.

**Acceptance Criteria:**
- README weapon count says 11, howl count says 10, item count says 25
- README uses "Howls" terminology, not "Scrolls"
- Agent instruction file paths resolve correctly
- All completed sprint plans have STATUS: COMPLETE marker
- wildfang-current-status.md marked as SUPERSEDED

---

### BD-184: Terrain decoration geometry/material sharing

**Category:** Performance
**Priority:** P3
**File(s):** `js/3d/terrain.js` ~lines 150-504, `js/3d/utils.js`

**Description:** Each decoration creates unique geometry and material instances. At 81 loaded chunks with ~40-60 meshes per chunk, that is 3,200-4,800 individual geometries and materials. Sharing identical instances across decorations could dramatically reduce draw calls. This is a significant refactor.

**Fix Approach:**
1. In `utils.js`, implement a geometry cache keyed by `"w,h,d"` and a material cache keyed by color hex.
2. `box()` returns shared instances from cache instead of creating new ones.
3. Disposal management: reference count cached items, only dispose when count reaches 0 (or never dispose and treat as permanent cache).

**Acceptance Criteria:**
- Identical box dimensions share the same `BoxGeometry` instance
- Identical colors share the same `MeshLambertMaterial` instance
- No visual changes to terrain decorations
- Measurable draw call reduction (can verify via renderer.info.render.calls)

**Note:** This is a prerequisite for future instanced mesh work (H4 from perf audit). Do this first.

---

### BD-185: Object pooling for frequently spawned entities

**Category:** Performance
**Priority:** P3
**File(s):** `js/game3d.js` (XP gems, fire particles, weapon projectiles, attack lines)

**Description:** Preventive measure from perf audit. XP gems, fire particles, weapon projectiles, and attack lines are constantly created and destroyed, generating GC pressure. Object pooling pre-allocates meshes and reuses them.

**Fix Approach:**
1. Create a `Pool` class with `acquire()` and `release(obj)` methods.
2. Pre-allocate pools: ~100 gem meshes, ~80 particle meshes, ~20 projectile meshes.
3. On "spawn": `pool.acquire()`, reset position, set `visible = true`.
4. On "death": set `visible = false`, `pool.release(obj)`.
5. On cleanup: dispose all pool items.

**Acceptance Criteria:**
- No `new THREE.Mesh()` calls during gameplay for pooled entity types
- No `geometry.dispose()` / `material.dispose()` during gameplay for pooled entities
- Pool sizes are configurable
- Reduced GC pauses during intense combat

---

## Section B: Conflict Analysis

---

### Conflict 1: Floating text cap -- reduce further or keep at 15?

**Readability audit (H-3)** recommends reducing MAX_FLOATING_TEXTS from 15 to 8.
**Zombie attack design (3.2)** recommends adding per-tier first-encounter floating text labels.

**Resolution:** Reduce to 8 as recommended. First-encounter labels are rare (once per tier per run, max 5 total in a game) and use the important-text tier (bold 20px, 0.6s life), so they will always display. The cap primarily affects spammy damage numbers, which is the intended reduction.

---

### Conflict 2: Item display -- show items or hide them?

**Readability audit (H-5)** recommends showing only 5 most recent items, or moving the full list to pause menu.
**Wearable design (BD-148)** proposes a 3-slot visual display replacing the item list.

**Resolution:** BD-160 implements the short-term fix (cap at 5 items shown). BD-180 (wearables Phase 4) will eventually replace the item list entirely with a 3-slot wearable display + collapsed passive/stack counts. The two are compatible -- BD-160 is the immediate fix, BD-180 is the long-term replacement.

---

### Conflict 3: Tier names -- kid-friendly in game-over screen only, or everywhere?

**Readability audit (C-4)** recommends replacing zombie tier names ("Shambler," "Lurcher," "Bruiser") with kid-friendly labels ("Tiny Zombie," "Big Zombie") in the game-over screen.
**Zombie attack design** uses the existing tier names ("Lurcher," "Bruiser," "Brute") as attack context throughout.

**Resolution:** Keep the current tier names in internal code and design docs. For ALL player-facing text (game-over screen, floating text labels, any future bestiary), use kid-friendly labels. Add a `displayName` field to `ZOMBIE_TIERS` in constants.js: `{ name: 'Lurcher', displayName: 'Speedy Zombie', ... }`. BD-159 uses `displayName` for the game-over screen. BD-179 uses `displayName` for first-encounter floating text.

---

### Conflict 4: Poison pool placement -- at zombie or at player?

**Original BD-145 design** places the pool at the zombie's position (intentional choice to teach "keep distance").
**Improved BD-145 review** argues this makes the pool redundant with contact damage and recommends placing at the player's position.

**Resolution:** Place at the player's position as recommended. The improved review correctly identifies that a pool at the zombie's feet only hits players already taking contact damage. Area denial at the player's position creates genuine routing decisions, which is the stated design goal. The random 0-1 unit offset provides a grace zone so the pool does not spawn directly on the player. This is BD-167.

---

### Conflict 5: 5,850-line function -- extract now or later?

**Code review (LOW)** identifies `launch3DGame()` as a 5,850-line god function and recommends incremental extraction.
**Every other audit** implicitly depends on the current structure (all line numbers reference game3d.js).

**Resolution:** Defer extraction. The function works and ships a playable game. Extracting modules mid-sprint while making gameplay changes risks merge conflicts and bugs. The existing module extractions (terrain, hud, audio, player-model, constants, utils) show the team knows how to do this. When a specific system grows unwieldy (e.g., when wearables add 300+ lines of equip logic), extract that system. Do not pre-emptively refactor. Marked as P3 in spirit but not given its own bead -- it is a standing concern, not a discrete task.

---

### Conflict 6: Terrain height function -- consolidate or keep for future?

**Code review (MEDIUM)** notes `terrainHeight()` always returns 0 and `getGroundAt()` is a pointless wrapper. Recommends consolidating.
**MEMORY.md** mentions "Grounded plateau system for elevated gameplay," suggesting terrain height may be needed.

**Resolution:** Keep both functions. The plateau system proves terrain height variation is a planned feature. The wrapper pattern is correct architecture even if the current implementation is trivial. Not worth a bead.

---

### Conflict 7: Material sharing in box() vs. instanced meshes

**Performance audit (M1)** recommends shared geometry/materials for decorations.
**Performance audit (H4)** recommends instanced meshes or geometry merging for enemies.
**Code review (MEDIUM)** notes `box()` creates new geometry/material per call.

**Resolution:** Do material/geometry sharing first (BD-184) as it is simpler and benefits both decorations and enemies. Instanced meshes (H4) are a future optimization that builds on sharing. BD-184 is prerequisite. Instanced meshes are not given a bead yet -- they require significant architectural work and should be planned when performance after BD-184 is measured.

---

## Section C: Recommended Sprint Batching

---

### Sprint A: "Julian Can Read" (P0 + P1 UX fixes)

**Estimated effort:** 1 sprint (8-12 beads, parallelizable)
**Theme:** Fix every bug and readability issue that affects Julian's ability to play.

| Batch | Beads | Can Parallelize? | Notes |
|-------|-------|-----------------|-------|
| A1 (Critical bugs) | BD-154, BD-155 | Together (both touch damage paths) | Must be done sequentially -- BD-155 rewrites paths that BD-154 modifies |
| A2 (Performance crash) | BD-156 | Yes (independent) | Delete dead code, no conflicts |
| A3 (HUD text) | BD-157, BD-158, BD-159 | Yes (all in hud.js + constants.js, different sections) | Parallel if agents coordinate on hud.js line ranges |
| A4 (Floating text + wave bar) | BD-160, BD-161 | Yes (different files) | BD-160 touches game3d.js spawning; BD-161 touches hud.js |
| A5 (Constants cleanup) | BD-162, BD-163 | Yes (different files) | Quick fixes, independent |

**Parallelization matrix:**
- A1 conflicts with: nothing (damage paths are unique)
- A2 conflicts with: BD-169 (both touch collider code, but BD-169 is P2)
- A3 agents: split by section (BD-157 = bar rendering, BD-158 = upgrade menu, BD-159 = game-over)
- A4 conflicts with: nothing
- A5 conflicts with: nothing

---

### Sprint B: "Smooth and Snappy" (P1 + P2 Performance)

**Estimated effort:** 1 sprint
**Theme:** Performance fixes that make the game run well on Julian's hardware.

| Batch | Beads | Can Parallelize? | Notes |
|-------|-------|-----------------|-------|
| B1 (Shadow + quick wins) | BD-164, BD-165 | Yes (different subsystems) | BD-164 is renderer config; BD-165 is scattered small fixes |
| B2 (Terrain perf) | BD-169, BD-172, BD-173 | Yes (different terrain subsystems) | BD-169 depends on BD-156 (Sprint A) |
| B3 (Gem + merge) | BD-174, BD-175 | Yes (different systems) | BD-174 is gem materials; BD-175 is merge timing |

---

### Sprint C: "Scary but Fair" (P2 Feature + Code Quality)

**Estimated effort:** 1 sprint
**Theme:** Zombie attacks feel great and code quality improves.

| Batch | Beads | Can Parallelize? | Notes |
|-------|-------|-----------------|-------|
| C1 (Attack visuals) | BD-166, BD-167 | Sequential (BD-167 depends on BD-166 color changes) | Both touch attack system code |
| C2 (Attack balance) | BD-179 | After C1 | Depends on attack code being stable |
| C3 (Code quality) | BD-168, BD-170, BD-171, BD-176, BD-177, BD-178 | All parallelizable | Each touches different files/sections |

---

### Sprint D: "Gear Up" (P2 Feature -- Wearables Phase 1)

**Estimated effort:** 1 full sprint (this is the biggest single feature)
**Theme:** Wearable equipment system.

| Batch | Beads | Can Parallelize? | Notes |
|-------|-------|-----------------|-------|
| D1 | BD-180 (Phase 1 only) | Partially -- constants/state can parallel with model building | 6 items, 3 slots, equip logic, HUD display |

---

### Sprint E: "Polish" (P3 Housekeeping)

**Estimated effort:** 1 sprint
**Theme:** Clean up the project, update docs, future-proof performance.

| Batch | Beads | Can Parallelize? | Notes |
|-------|-------|-----------------|-------|
| E1 (Cleanup) | BD-182, BD-183 | Yes (files vs docs) | BD-182 is file deletion; BD-183 is doc writing |
| E2 (Font + perf) | BD-181, BD-184, BD-185 | Yes (different systems) | BD-181 is HUD font; BD-184 is terrain cache; BD-185 is object pooling |

---

## Bead Index

| BD# | Title | Category | Priority | Sprint |
|-----|-------|----------|----------|--------|
| 154 | Fix framerate-dependent contact damage | Code Quality | P0 | A |
| 155 | Consolidate all damage through damageEnemy/damagePlayer | Code Quality | P0 | A |
| 156 | Remove duplicate enemy-terrain collision | Performance | P0 | A |
| 157 | Kid-friendly HUD text overhaul | UX | P1 | A |
| 158 | Rewrite upgrade menu descriptions for a 7-year-old | UX | P1 | A |
| 159 | Simplify game-over screen for a kid | UX | P1 | A |
| 160 | Reduce floating text clutter | UX | P1 | A |
| 161 | Wave progress bar hardcoded divisor fix | Code Quality | P1 | A |
| 162 | Import shared constants instead of duplicating | Code Quality | P1 | A |
| 163 | Remove duplicate gameTime state property | Code Quality | P1 | A |
| 164 | Shadow map performance optimization | Performance | P1 | B |
| 165 | Performance quick wins bundle | Performance | P1 | B |
| 166 | Improve zombie attack telegraphs | Feature/UX | P2 | C |
| 167 | Move poison pool to player position | Feature/Balance | P2 | C |
| 168 | Fisher-Yates shuffle fix | Code Quality | P2 | C |
| 169 | Chunk-indexed player terrain collision | Performance | P2 | B |
| 170 | Fix Date.now() timing in game loop | Code Quality | P2 | C |
| 171 | Fix grass/flower deterministic generation | Code Quality | P2 | C |
| 172 | Index decorations by chunk key | Performance | P2 | B |
| 173 | Separate canopy mesh array for wind | Performance | P2 | B |
| 174 | XP gem material optimization | Performance | P2 | B |
| 175 | Zombie merge loop throttling | Performance | P2 | B |
| 176 | Wave warning positioning | UX | P2 | C |
| 177 | Delete or integrate WEAPON_CLASS_SCALING | Code Quality | P2 | C |
| 178 | Hex color arithmetic overflow fix | Code Quality | P2 | C |
| 179 | Zombie attack Chill Mode scaling + first-encounter labels | Feature/Balance | P2 | C |
| 180 | Wearable equipment system Phase 1 | Feature | P2 | D |
| 181 | Kid-friendly font for HUD | UX | P3 | E |
| 182 | File and folder cleanup | Housekeeping | P3 | E |
| 183 | Documentation updates | Housekeeping | P3 | E |
| 184 | Terrain decoration geometry/material sharing | Performance | P3 | E |
| 185 | Object pooling for frequently spawned entities | Performance | P3 | E |

---

*Generated 2026-02-24 by consolidation agent. 7 source documents read, 32 beads written, 7 conflicts analyzed, 5 sprints planned.*
