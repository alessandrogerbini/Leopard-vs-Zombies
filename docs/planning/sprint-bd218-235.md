# Sprint Plan: BD-218 through BD-235 -- Boss Battles + Death Clarity

**Date:** 2026-02-24
**Source beads:** `docs/planning/beads-bd218-227.md` (Boss Battles), `docs/planning/beads-bd228-235.md` (Death Clarity)
**Forward plans:** `docs/forward-plans/boss-battle-forward-plan.md`, `docs/forward-plans/death-clarity-forward-plan.md`
**Execution model:** Parallel worktree agents (5 sequential batch rounds)

---

## 1. Bead Inventory

| BD# | Priority | Category | File(s) | Summary |
|-----|----------|----------|---------|---------|
| BD-218 | P1 | Engine -- Foundation | `js/game3d.js` | Screen shake utility + boss HP phase system (phase thresholds, transition FX) |
| BD-219 | P1 | Visual -- Boss Presentation | `js/game3d.js` | Boss phase visual polish (Titan cracks/steam, Overlord purple tint/pulse) |
| BD-220 | P2 | Gameplay -- Boss Attack | `js/game3d.js`, `js/3d/audio.js` | Titan Bone Barrage -- ground circle telegraphs + parabolic bone arcs |
| BD-221 | P2 | Gameplay -- Boss Attack | `js/game3d.js`, `js/3d/audio.js` | Titan Charge + Ground Fissures (Phase 3 attacks) |
| BD-222 | P2 | Gameplay -- Boss Attack | `js/game3d.js`, `js/3d/audio.js` | Overlord Death Bolt Volley + Shadow Zones |
| BD-223 | P2 | Gameplay -- Boss Attack | `js/game3d.js`, `js/3d/audio.js` | Overlord Summon Burst + Death Beam |
| BD-224 | P2 | Gameplay -- Boss Presentation | `js/game3d.js`, `js/3d/audio.js` | Boss entrance sequence (scale-up, ground cracks, title card, zombie scatter) |
| BD-225 | P2 | Visual -- Combat Feedback | `js/game3d.js` | Visual telegraph polish + `disposeTempMesh` utility + screen shake catalog |
| BD-226 | P2 | Balance + Gameplay | `js/game3d.js`, `js/3d/audio.js` | Chill Mode boss tuning + Dark Nova (Phase 4 Overlord) |
| BD-227 | P2 | Audio -- Boss SFX | `js/3d/audio.js` | Boss audio cue consolidation (9 event IDs, Sound Pack Beta priority list) |
| BD-228 | P1 | Feature -- Death Sequence | `js/game3d.js` | Death sequence state machine -- slow-mo time scale, 1.5s real-time countdown |
| BD-229 | P2 | Feature -- Death Camera | `js/game3d.js` | Camera zoom-to-killer -- lookAt blend toward killer midpoint, 35% zoom |
| BD-230 | P2 | Feature -- Death Animation | `js/3d/player-model.js`, `js/game3d.js` | Player death stumble -- forward tilt, arm flail, gray-out desaturation |
| BD-231 | P2 | Feature -- Death HUD Effect | `js/3d/hud.js`, `js/game3d.js` | Red death vignette -- radial gradient fading over death sequence |
| BD-232 | P2 | Feature -- Game-Over Screen | `js/3d/hud.js` | Killer icon -- canvas zombie silhouette + color pill behind tier name |
| BD-233 | P2 | Feature -- Death Audio | `js/game3d.js`, `js/3d/audio.js` | Death audio layering -- impact thud, slow-mo whoosh, transition sting |
| BD-234 | P2 | Feature -- Death Highlight | `js/game3d.js` | Killer highlight glow -- emissive pulse + floating tier label + dim others |
| BD-235 | P1 | Feature -- Data Foundation | `js/game3d.js` | Add `killerX`/`killerZ`/`enemyRef` to all `damagePlayer()` call sites |

---

## 2. Conflict Matrix

### 2a. Boss Beads (BD-218 through BD-227)

|        | BD-218 | BD-219 | BD-220 | BD-221 | BD-222 | BD-223 | BD-224 | BD-225 | BD-226 | BD-227 |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| **BD-218** | -- | **MED** | LOW | LOW | LOW | LOW | LOW | LOW | LOW | NONE |
| **BD-219** | **MED** | -- | LOW | LOW | LOW | LOW | NONE | NONE | NONE | NONE |
| **BD-220** | LOW | LOW | -- | **HIGH** | NONE | NONE | NONE | **MED** | **MED** | LOW |
| **BD-221** | LOW | LOW | **HIGH** | -- | NONE | NONE | NONE | **MED** | **MED** | LOW |
| **BD-222** | LOW | LOW | NONE | NONE | -- | **HIGH** | NONE | **MED** | **MED** | LOW |
| **BD-223** | LOW | LOW | NONE | NONE | **HIGH** | -- | NONE | **MED** | **MED** | LOW |
| **BD-224** | LOW | NONE | NONE | NONE | NONE | NONE | -- | NONE | NONE | LOW |
| **BD-225** | LOW | NONE | **MED** | **MED** | **MED** | **MED** | NONE | -- | LOW | NONE |
| **BD-226** | LOW | NONE | **MED** | **MED** | **MED** | **MED** | NONE | LOW | -- | LOW |
| **BD-227** | NONE | NONE | LOW | LOW | LOW | LOW | LOW | NONE | LOW | -- |

### 2b. Death Clarity Beads (BD-228 through BD-235)

|        | BD-228 | BD-229 | BD-230 | BD-231 | BD-232 | BD-233 | BD-234 | BD-235 |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| **BD-228** | -- | LOW | LOW | LOW | NONE | LOW | LOW | NONE |
| **BD-229** | LOW | -- | NONE | NONE | NONE | NONE | NONE | NONE |
| **BD-230** | LOW | NONE | -- | NONE | NONE | NONE | NONE | NONE |
| **BD-231** | LOW | NONE | NONE | -- | LOW | NONE | NONE | NONE |
| **BD-232** | NONE | NONE | NONE | LOW | -- | NONE | NONE | NONE |
| **BD-233** | LOW | NONE | NONE | NONE | NONE | -- | NONE | NONE |
| **BD-234** | LOW | NONE | NONE | NONE | NONE | NONE | -- | NONE |
| **BD-235** | NONE | NONE | NONE | NONE | NONE | NONE | NONE | -- |

### 2c. Cross-Feature Conflicts

|        | BD-218 screen shake | BD-227 audio | BD-233 audio |
|--------|---------------------|-------------|-------------|
| **BD-228** (death sequence) | LOW -- death sequence may trigger screen shake if killed by boss | NONE | NONE |
| **BD-231** (vignette) | NONE | NONE | NONE |
| **BD-233** (death audio) | NONE | **MED** -- both add entries to `js/3d/audio.js` SOUND_MAP | -- |
| **BD-234** (killer glow) | NONE | NONE | NONE |
| **BD-235** (call site data) | NONE | NONE | NONE |

### Conflict Details

- **BD-218 vs BD-219 (MED):** Both touch the enemy update loop in `game3d.js`. BD-218 adds the phase check and transition logic; BD-219 adds visual flag checks in the same section. Safe to run in the same batch only if BD-219 is merged after BD-218, since BD-219 reads `e.bossPhase` that BD-218 creates.

- **BD-220 vs BD-221 (HIGH):** Both modify the Titan attack pool selection code. BD-220 creates the pool array and adds `boneBarrage`; BD-221 adds `titanCharge` and `groundFissures` to the same array. The selection logic (weighted random, no-repeat) is written by BD-220 and extended by BD-221. **Must be sequential or same agent.**

- **BD-222 vs BD-223 (HIGH):** Same pattern as BD-220/221 but for the Overlord attack pool. BD-222 creates the Overlord pool with `deathBoltVolley` and `shadowZones`; BD-223 adds `summonBurst` and `deathBeam`. **Must be sequential or same agent.**

- **BD-225 vs BD-220/221/222/223 (MED):** BD-225 modifies telegraph visuals and screen shake values in the code created by BD-220-223. **Must run after all attack beads are merged.**

- **BD-226 vs BD-220/221/222/223 (MED):** BD-226 adds Dark Nova to the Overlord pool and tunes Chill Mode parameters across all attacks. **Must run after all attack beads are merged.**

- **BD-227 vs BD-233 (MED):** Both add entries to `SOUND_MAP` in `js/3d/audio.js`. BD-227 adds 9 `sfx_boss_*` events; BD-233 adds 3 `sfx_death_*` events. Different keys, but insertions at the same location in the file. Low actual merge risk if they insert at different positions in the map.

- **BD-228 (core state machine):** Reads by BD-229/230/231/233/234 but no write-write conflicts. All downstream beads read `st.deathSequence` and `st.deathSequenceTimer` without modifying them.

- **BD-232 (independent):** Only touches `js/3d/hud.js` game-over section. No conflict with any boss bead or any other death bead (BD-231 touches a different section of hud.js: pre-game-over vs in-game-over).

- **BD-235 (independent):** Only touches `damagePlayer()` call sites (~8 locations) to add data fields. No boss bead modifies these call sites. Low conflict with all beads.

---

## 3. Agent Batches

### Batch Round 1: Foundations (3 parallel agents)

All three agents run simultaneously. Zero file-level conflicts between agents.

| Agent | Beads | Files | Rationale |
|-------|-------|-------|-----------|
| Agent 1A | **BD-218** (screen shake + phase system) | `js/game3d.js` (state init, render loop, enemy update) | Foundation for all boss attack beads. Must land first. |
| Agent 1B | **BD-235** + **BD-232** | `js/game3d.js` (damagePlayer call sites only) + `js/3d/hud.js` (game-over section) | BD-235 is data-only foundation for BD-229/234. BD-232 is independent HUD work. Combined because both are small. |
| Agent 1C | **BD-228** (death sequence state machine) | `js/game3d.js` (death check ~line 6370, main loop dt flow, state init ~line 361) | Core death infrastructure. Different code section from BD-218 (boss update) and BD-235 (damagePlayer call sites). |

**File overlap analysis:** All three touch `game3d.js` but in completely non-overlapping regions:
- Agent 1A: state init (new vars), render loop camera offset, enemy update loop (tier 9/10 phase checks)
- Agent 1B: damagePlayer call sites (~8 locations, lines ~5511, ~5430, etc.) + `hud.js` game-over section
- Agent 1C: death check (~line 6370), dt computation at top of update loop (~line 4380), state init (new vars in different block)

**Risk:** Agent 1A and 1C both add state variables to the state init block. They should add them in clearly separate sections (boss vars vs death vars) to minimize merge conflict. Agent 1C also modifies the dt computation which is upstream of everything else.

---

### Batch Round 2: Boss Phase Visuals + Titan Attacks (3 parallel agents)

Runs after Batch 1 merges. Requires BD-218 (phase system) to be in the codebase.

| Agent | Beads | Files | Rationale |
|-------|-------|-------|-----------|
| Agent 2A | **BD-219** (boss phase visuals) | `js/game3d.js` (enemy update loop, boss visual section) | Adds per-phase visual upgrades. Reads `e.bossPhase` from BD-218. Isolated visual flags, no attack logic. |
| Agent 2B | **BD-220** + **BD-221** (Titan Bone Barrage + Charge + Fissures) | `js/game3d.js` (Titan attack pool, weapon projectile/effects update) + `js/3d/audio.js` | HIGH conflict between BD-220 and BD-221 (shared Titan attack pool), so they must be same agent. |
| Agent 2C | **BD-224** (boss entrance sequence) | `js/game3d.js` (challenge shrine activation ~line 6271, enemy update entrance check, enemy movement) + `js/3d/audio.js` | Isolated code section (shrine activation + entrance guard at top of enemy update). No overlap with attack code. |

**File overlap analysis:**
- Agent 2A: enemy update loop visual flags section (after phase check, before attack logic)
- Agent 2B: Titan attack selection block + new attack state machines + weapon projectile update loop + `audio.js`
- Agent 2C: challenge shrine block + entrance check at top of enemy loop (before attack logic) + enemy movement flee code + `audio.js`

Agent 2B and 2C both touch `audio.js` but add different SOUND_MAP keys -- trivial merge. Agent 2A and 2B both touch the enemy update loop but in different subsections (visual flags vs attack selection/execution).

---

### Batch Round 3: Overlord Attacks + Death Sequence Effects (4 parallel agents)

Runs after Batch 2 merges. Requires BD-218 (phase system) and BD-220's attack pool pattern as a template. Also requires BD-228 (death state machine) from Batch 1.

| Agent | Beads | Files | Rationale |
|-------|-------|-------|-----------|
| Agent 3A | **BD-222** + **BD-223** (Overlord Volley + Shadow Zones + Summon + Beam) | `js/game3d.js` (Overlord attack pool, weapon effects update, enemy update) + `js/3d/audio.js` | HIGH conflict between BD-222 and BD-223 (shared Overlord pool). Same agent. |
| Agent 3B | **BD-229** + **BD-234** (camera zoom-to-killer + killer highlight glow) | `js/game3d.js` (camera section ~lines 6391-6398, enemy update during death) | Both require BD-228 + BD-235. Both touch `game3d.js` but in different sections. Camera (render section) and glow (enemy update loop). Combined for efficiency. |
| Agent 3C | **BD-230** (player death stumble animation) | `js/3d/player-model.js` (animatePlayer ~line 371) + `js/game3d.js` (hurt flash ~line 4615) | Only death bead touching `player-model.js`. Gray-out in hurt flash section is isolated. |
| Agent 3D | **BD-231** + **BD-233** (death vignette + death audio) | `js/3d/hud.js` (drawHUD pre-game-over) + `js/game3d.js` (death entry/tick blocks) + `js/3d/audio.js` | BD-231 adds HUD vignette + 2 lines in death entry block. BD-233 adds audio calls in the same death entry/tick blocks + audio.js. Combined because both insert into BD-228's death sequence blocks. |

**File overlap analysis:**
- Agent 3A: Overlord attack selection (different code section from Titan attacks), weapon effects update (new effect types), `audio.js`
- Agent 3B: camera section (render loop ~line 6391) + enemy update loop (death sequence branch)
- Agent 3C: `player-model.js` (animatePlayer) + hurt flash section of `game3d.js` (~line 4615)
- Agent 3D: `hud.js` (pre-game-over section) + death entry/tick blocks (~line 6370) + `audio.js`

Agent 3A and 3B both modify the enemy update loop but in different contexts (attack execution vs death-sequence glow). Agent 3D touches the death sequence blocks that BD-228 created -- no other agent in this batch touches those lines.

---

### Batch Round 4: Boss Polish + Tuning (3 parallel agents)

Runs after Batch 3 merges. All boss attacks and death effects are now in the codebase.

| Agent | Beads | Files | Rationale |
|-------|-------|-------|-----------|
| Agent 4A | **BD-225** (visual telegraph polish + disposeTempMesh utility) | `js/game3d.js` (attack visual sections, utility function area) | Modifies telegraph code created by BD-220-223. Must run after all attack beads. |
| Agent 4B | **BD-226** (Chill Mode tuning + Dark Nova) | `js/game3d.js` (all boss attack sections, Overlord attack pool) + `js/3d/audio.js` | Dark Nova adds to Overlord pool; Chill tuning touches every attack. Must run after BD-222/223. |
| Agent 4C | **BD-227** (boss audio consolidation) | `js/3d/audio.js` | Audio-only audit. Adds/verifies SOUND_MAP entries. No game logic changes. |

**File overlap analysis:**
- Agent 4A: boss attack visual code sections (telegraph meshes, screen shake values)
- Agent 4B: all boss attack parameter blocks (Chill Mode branches) + Overlord pool + `audio.js`
- Agent 4C: `audio.js` only

Agent 4A and 4B both modify boss attack code but different aspects: 4A touches visual/dispose patterns, 4B touches damage/timing/cooldown parameters. Some overlap is possible in the attack functions themselves. Risk is moderate -- recommended merge order is 4C first, then 4A, then 4B.

---

### Batch Round 5: (Manual QA -- no agents)

Post-merge integration testing. See section 6.

---

## 4. Per-Batch Agent Specs

---

### Batch 1, Agent 1A: BD-218 -- Screen Shake + Boss HP Phase System

**Files to modify:** `js/game3d.js`

**Context:**
- State initialization block: ~line 361. Add `st.screenShake`, `st.screenShakeAmp`.
- Render loop: after camera position is set, before `renderer.render()`. Add shake offset logic.
- Enemy update loop: where tier 9/10 boss attacks are handled (search for existing slam/shockwave code). Add `bossPhase` initialization in `createEnemy()` and phase threshold checks before attack selection.

**Key implementation notes:**
1. **Screen shake utility:** Add `triggerScreenShake(amplitude, duration)` at module scope. Uses `Math.max` to prevent cumulative amplification. Decay is linear over 0.3s. Camera offset applied and removed each frame.
2. **Boss phase system:** Initialize `e.bossPhase = 1` for tier 9 and tier 10 enemies in `createEnemy()`. Phase thresholds: Titan has 3 phases (>60%, 60-30%, <30%), Overlord has 4 phases (>75%, 75-50%, 50-25%, <25%). Chill Mode shifts thresholds (Titan: 60%/40%/15%, Overlord: 75%/55%/30%/12%). One-directional ratchet via `Math.max`.
3. **Phase transition effects:** Floating text ("TITAN ENRAGED!", "OVERLORD AWAKENS!", etc.), screen shake (0.3, 0.4s), `sfx_boss_phase_transition` sound, body flash (0.3s `_attackFlashTimer`), aura color shift, 0.5s attack timer pause.
4. **Audio placeholder:** Add `sfx_boss_phase_transition: ['rawr-2.ogg']` to SOUND_MAP in `js/3d/audio.js`.

**Testing approach:** Spawn a Titan via challenge shrine. Damage it past 60% HP -- verify "TITAN ENRAGED!" floating text, screen shake, body flash. Damage past 30% -- verify "TITAN BERSERK!" and further effects. Test with Chill Mode (thresholds should shift). Verify phases never decrease. Test screen shake with `triggerScreenShake(0.5, 1.0)` from console to verify camera offset and decay.

---

### Batch 1, Agent 1B: BD-235 + BD-232 -- Damage Source Data + Game-Over Killer Icon

**Files to modify:** `js/game3d.js` (BD-235), `js/3d/hud.js` (BD-232)

**Context:**
- BD-235: `damagePlayer()` at ~line 2754. The source parameter already has `{ type, tierName, tier, color }` from BD-216 A. Each of the 7+ call sites needs `killerX`, `killerZ`, and `enemyRef` added.
- BD-232: `drawHUD()` in `hud.js`, game-over DEFEATED BY section at ~line 1256. Currently renders "DEFEATED BY: [TIER NAME]" in tier color from BD-216 B.

**Key implementation notes (BD-235):**
1. Add `killerX`, `killerZ`, `enemyRef` to every `damagePlayer()` call site:
   - Contact damage (~line 5511): `killerX: e.group.position.x, killerZ: e.group.position.z, enemyRef: e`
   - Slam, Shockwave, Lunge, Poison: same pattern using `e.group.position`
   - Death bolt, Bone spit: use the projectile's origin position (where the enemy was when it fired)
   - Grave burst: `killerX: graveX, killerZ: graveZ, enemyRef: null` (no living enemy)
2. This is data-only -- no visual change. Just extends the source objects.

**Key implementation notes (BD-232):**
1. New helper function `drawZombieTierIcon(ctx, cx, cy, scale, color)`: ~30 lines of canvas 2D drawing. Rectangle body, head, arms (raised menacing pose), legs, glowing eye dots. Scale increases with tier index. Tiers 7+ get spike triangles on shoulders.
2. Dark rounded pill behind tier name text for readability. Use `ctx.measureText` for width, `roundRect` for pill background, `rgba(0,0,0,0.5)` fill.
3. Position icon to the left of the DEFEATED BY text, centered on the game-over screen.

**Testing approach (BD-235):** Die to different enemy types (contact, projectile, grave burst). Check `st.lastDamageSource` in console -- verify `killerX`, `killerZ`, `enemyRef` are populated correctly. Grave burst should have `enemyRef: null`.

**Testing approach (BD-232):** Die and check game-over screen. Zombie icon should appear left of DEFEATED BY text, colored to match tier. Dark pill behind text. Test with different tiers if possible (higher tiers should have slightly larger icons).

---

### Batch 1, Agent 1C: BD-228 -- Death Sequence State Machine

**Files to modify:** `js/game3d.js`

**Context:**
- Death check: ~line 6370. Currently `if (st.hp <= 0) { st.gameOver = true; ... }`.
- State init: ~line 361. Add `deathSequence`, `deathSequenceTimer`, `deathTimeScale`, `deathKillerPos`.
- Main loop dt computation: near top of update block (~line 4380). Need to create `realDt` and `gameDt`.

**Key implementation notes:**
1. **State variables:** Add to state init: `deathSequence: false, deathSequenceTimer: 0, deathTimeScale: 1.0, deathKillerPos: null`.
2. **Replace death check:** `st.hp <= 0 && !st.deathSequence && !st.gameOver` enters the death sequence instead of immediate game over. Capture `st.deathKillerPos` from `st.lastDamageSource`. Disable all player input immediately.
3. **Death sequence tick:** Every frame, decrement `st.deathSequenceTimer` by `realDt`. Ramp `st.deathTimeScale` from 1.0 to 0.15 over first 0.5s (progress 0-0.33), then hold at 0.15. When timer reaches 0, set `st.gameOver = true` with all existing cleanup.
4. **dt audit (CRITICAL):** Store `realDt` before scaling. Create `gameDt = dt * (st.deathSequence ? st.deathTimeScale : 1)`. Replace approximately 30 `dt` usages in the game-logic gate with `gameDt` for: enemy movement, projectile travel, particle updates, weapon cooldowns. The death sequence timer, camera interpolation, and any death-specific animation must use `realDt`.
5. **What runs vs stops during death:** Enemy movement, projectiles in flight, particles keep running at `gameDt`. Player input/movement, new spawning, weapon auto-fire, powerup timers, XP collection STOP.
6. **Guard existing systems:** The `st.deathSequence` flag must gate out: player movement, weapon firing, enemy spawning, XP collection. Search for each system and add `!st.deathSequence` guards.

**Testing approach:** Play until death. Verify: 1.5-second slow-mo phase occurs before game-over screen. Enemies visibly slow down. Player cannot move or attack. No new enemies spawn. After 1.5s, game-over screen appears normally with all stats, feedback, name entry. Restart works. Verify timing feels correct (not too fast, not too slow). Check that ALL particles/projectiles slow down (no visual desync).

---

### Batch 2, Agent 2A: BD-219 -- Boss Phase Visual Polish

**Files to modify:** `js/game3d.js`

**Context:**
- Enemy update loop: after the phase check code added by BD-218. The phase system sets `e.bossPhase` and fires transition effects. This bead adds persistent visual changes per phase.
- Boss rendering section: where boss-specific visual updates happen (aura, crown fire, etc.)

**Key implementation notes:**
1. **Titan Phase 2:** Set `e._phase2Visuals = true` once. Add 2-3 thin black box meshes across torso as "crack" lines. Random positions on front face.
2. **Titan Phase 3:** Set `e._phase3Visuals = true` once. Eyes turn white with emissive glow (`emissiveIntensity: 0.5`). Set `e._steamParticles = true` flag. In enemy rendering section, emit gray-white particles upward (`spawnFireParticle(0xcccccc, ...)`) at 15% chance per frame.
3. **Overlord Phase 2:** Set `e._phase2Visuals = true`. Increase crown particle rate. Lerp body color from `0xaa0000` to `0x880044` (purple tint).
4. **Overlord Phase 3:** Set `e._phase3Visuals = true`. Crown fire turns blue-white (`_crownFireColor = 0xccccff`).
5. **Overlord Phase 4:** Set `e._phase4Visuals = true`, `e._desperationPulse = true`. Every frame: sinusoidal emissive pulse on all body meshes.
6. Visual changes are additive (Phase 3 keeps Phase 2 visuals). Flags prevent duplicate mesh creation.

**Testing approach:** Fight a Titan through all 3 phases. Verify: Phase 2 shows black cracks on body. Phase 3 shows white eyes with glow + steam particles. Fight an Overlord through all 4 phases. Verify: purple tint, blue-white crown, pulsing glow. Verify no performance regression from per-frame traverse (emissive pulse).

---

### Batch 2, Agent 2B: BD-220 + BD-221 -- All Titan Attacks (Bone Barrage + Charge + Ground Fissures)

**Files to modify:** `js/game3d.js`, `js/3d/audio.js`

**Context:**
- Titan boss attack section in enemy update loop. Currently uses `specialAttackCount % 2` alternation between slam and shockwave.
- Weapon projectile update loop (for bone barrage parabolic arcs).
- Weapon effects update loop (for fissure eruption/cleanup).

**Key implementation notes (BD-220 -- Bone Barrage):**
1. **Replace attack selection:** Replace `specialAttackCount % 2` with a phase-gated attack pool array: `['slam', 'shockwave']`, adding `'boneBarrage'` at Phase 2+, `'titanCharge'` and `'groundFissures'` at Phase 3+. Weighted random selection with no-repeat of last attack (`e._lastAttack`).
2. **Bone Barrage:** 4-6 bones (4 in Chill), 0.8s telegraph (1.2s Chill), 15 damage (8 Chill). Red `RingGeometry` ground markers at landing positions (semicircle near player). Parabolic arc projectiles via `weaponProjectiles` with gravity. 2-unit damage radius on landing. Cream-colored impact particles. Screen shake per impact (0.15, 0.15s). Proper mesh disposal.
3. **Audio:** `sfx_boss_slam_impact: ['explode-1.ogg']` in SOUND_MAP.

**Key implementation notes (BD-221 -- Charge + Fissures):**
4. **Titan Charge:** Phase 3+ only. 1.5s telegraph (2.25s Chill) with red aim line on ground (pulsing opacity). Direction locked at telegraph start. Hunch animation during telegraph (scale Y 0.8, XZ 1.1). Charge at 3x speed (2x Chill) for 15 units. 30 damage (15 Chill) on contact with 2-unit radius. 2s recovery stun (3s Chill) where Titan flashes white -- exploitable punishment window. State machine: `telegraph` -> `charging` -> `recovery` -> `null`.
5. **Ground Fissures:** Phase 3+ only. 3 brown lines (2 in Chill) in 120-degree arc (80-degree Chill), 12 units long. 1.2s telegraph (1.8s Chill). Eruption: flash red-orange, deal 20 damage (10 Chill) via perpendicular distance check. Visual persist 1.5s then dispose. Screen shake on eruption (0.25, 0.25s).
6. **Audio:** `sfx_boss_charge_telegraph: ['leapord-growl-1.ogg']` in SOUND_MAP.
7. **Cooldowns:** Bone Barrage 6s, Titan Charge 10s, Ground Fissures 8s. Apply phase multiplier (P2: 0.85x, P3: 0.75x). Chill Mode: additional 1.5x.

**Testing approach:** Fight Titan. Phase 1: only Slam and Shockwave appear. Phase 2: Bone Barrage appears -- verify ground circles, parabolic arcs, landing damage, particle burst. Phase 3: Titan Charge appears -- verify aim line, hunch, dash, recovery stun. Ground Fissures appear -- verify brown lines, eruption damage, cleanup. Test in Chill Mode for adjusted parameters. Verify no attack repeats consecutively. Verify all temp meshes disposed.

---

### Batch 2, Agent 2C: BD-224 -- Boss Entrance Sequence

**Files to modify:** `js/game3d.js`, `js/3d/audio.js`

**Context:**
- Challenge shrine activation block: ~line 6271. Where boss is created via `createEnemy()`.
- Enemy update loop: BEFORE attack logic. Need an entrance guard that skips attacks during the 1.5s animation.
- Enemy movement code: where enemies move toward the player. Need a flee check for nearby low-tier zombies.

**Key implementation notes:**
1. **Boss creation:** After `createEnemy()`, set `boss.entranceTimer = 1.5`, `boss.entranceActive = true`, `boss.group.scale.setScalar(0.01)`.
2. **Entrance animation:** In enemy update loop, before attack logic: if `e.entranceActive`, scale up with cubic ease-out (`1 - Math.pow(1 - t, 3)`), emit brown ground crack particles with radius proportional to progress. At completion: screen shake (0.4, 0.5s), title card via `addFloatingText` ("TITAN" in gold or "OVERLORD" in red, 3s duration, `important=true`), play `sfx_boss_entrance`. Use `continue` to skip attack logic during entrance.
3. **Zombie scatter:** At boss creation time, iterate `st.enemies`. Tier 1-3 within 15 units get `fleeTimer = 2` and `fleeFromX/Z` set to boss position. In enemy movement code, check `e.fleeTimer > 0` and move away from flee source instead of toward player.
4. **Audio:** `sfx_boss_entrance: ['zombie-4.ogg']` in SOUND_MAP.

**Testing approach:** Activate a challenge shrine. Boss should appear at near-zero scale and grow over 1.5s with cubic ease-out. Brown particles radiate outward. Title card appears at full scale. Screen shake at completion. Nearby low-tier zombies scatter for 2s then resume chasing player. Boss does not attack during entrance. Verify entrance meshes cleaned up if chunk unloads.

---

### Batch 3, Agent 3A: BD-222 + BD-223 -- All Overlord Attacks (Volley + Shadows + Summon + Beam)

**Files to modify:** `js/game3d.js`, `js/3d/audio.js`

**Context:**
- Overlord boss attack section in enemy update loop. The existing Death Bolt code is at ~lines 5302-5321. This will be replaced with the phase-gated attack pool.
- Weapon effects update loop (for shadow zones, death beam).
- Enemy update loop (for summon channeling, summoned zombie lifetime, death beam charge).
- Use BD-220's attack pool pattern (from Batch 2) as a template for the Overlord pool.

**Key implementation notes (BD-222 -- Volley + Shadows):**
1. **Overlord attack pool:** Phase-gated: `['deathBoltVolley', 'shadowZones']`, add `'summonBurst'` at P2+, `'deathBeam'` at P3+ (P4 in Chill), `'darkNova'` at P4+. Weighted random, no-repeat. Phase cooldown: P1=1.0x, P2=0.9x, P3=0.8x, P4=0.8x, all x1.5 in Chill.
2. **Death Bolt Volley:** Replaces single Death Bolt. 0.5s telegraph, then 3-bolt spread at 15 degrees (5-bolt at 30 degrees in P3+). Chill: 2-bolt (3 in P3+). Speed 16 (10 Chill). Damage 30 (15 Chill). Uses existing target leading code.
3. **Shadow Zones:** 3-5 dark circles (2-3 Chill) near player, radius 3 units. 1.5s telegraph (2.25s Chill) with pulsing opacity. Active for 3s: damage 10/0.5s (5/0.75s Chill). Max 2 sets active. Fade out over final 0.5s.
4. **Audio:** `sfx_boss_death_bolt: ['big-pew-1.ogg']`, `sfx_boss_shadow_zone: ['gas-1.ogg']`.

**Key implementation notes (BD-223 -- Summon + Beam):**
5. **Summon Burst:** P2+ only. 2s channel (body tilt back, dark particles converge). Spawns 4-6 zombies (3 Chill) in a ring 6 units away. Tier 1-3 (tier 1 only in Chill). 50% HP, `isSummoned=true`, `noReward=true`. Auto-despawn after 15s (10s Chill). Fade transparent over final 2s. Max 6 summoned alive. Skip XP/loot on death.
6. **Death Beam:** P3+ (P4 in Chill). 2s charge (3s Chill) with converging red particles and body emissive ramp. Thick red beam sweeps 60 degrees over 2s (3s Chill). Damage 40 (20 Chill), single-hit only. Width 0.8 (0.6 Chill). Hit detection via angle comparison. Beam fades at end.
7. **Audio:** `sfx_boss_summon: ['zombie-5.ogg']`, `sfx_boss_death_beam: ['pew-5x-1.ogg']`.
8. **Summoned zombie integration:** Add `noReward` check to enemy death/loot handler. Add `isSummoned` lifetime check early in enemy update loop.

**Testing approach:** Fight Overlord. Phase 1: Volley (3-bolt) and Shadow Zones only. Phase 2: Summon Burst appears -- verify channel animation, minion spawn, 50% HP, no XP/loot, auto-despawn with fade. Phase 3: Death Beam appears -- verify charge particles, sweeping beam, single-hit damage. Test Chill Mode parameters. Verify summoned zombie cap (6 max). Verify shadow zone cap (2 sets max). Verify beam disposal.

---

### Batch 3, Agent 3B: BD-229 + BD-234 -- Camera Zoom-to-Killer + Killer Highlight Glow

**Files to modify:** `js/game3d.js`

**Context:**
- BD-229: Camera section at ~lines 6391-6398. The `st.deathSequence`, `st.deathKillerPos` state from BD-228 is available. The `killerX`/`killerZ` from BD-235 feeds into `st.deathKillerPos`.
- BD-234: Enemy update loop. During `st.deathSequence`, apply glow to `st.lastDamageSource.enemyRef` and dim other zombies. The `enemyRef` field comes from BD-235.

**Key implementation notes (BD-229 -- Camera):**
1. **Camera override during death sequence:** When `st.deathSequence` is true, override the normal camera with: zoom factor `1 - progress * 0.35` (1.0 to 0.65). LookAt blends toward **midpoint** between player and killer (not directly to killer). Killer position clamped to 8 world units max from player. Lerp factor increased to 0.08 for snappier response.
2. **Edge cases:** `st.deathKillerPos` is null: just zoom in on player. Killer very far away: 8-unit clamp prevents wild pan. After death sequence ends, camera holds at final position.

**Key implementation notes (BD-234 -- Killer Glow):**
3. **Killer identification:** `st.lastDamageSource.enemyRef` from BD-235. During death sequence, iterate all enemies.
4. **Killer glow:** Pulsing emissive on the killer (`0.5 + Math.sin(performance.now() * 0.006) * 0.3`). Set emissive color to tier color. Floating tier-name label via `addFloatingText` (spawned once, tracked with `st._killerLabelSpawned`).
5. **Dim others:** All non-killer zombies get `emissiveIntensity = 0` (remove any existing glow).
6. **Edge cases:** `enemyRef` is null (grave burst): skip highlight entirely. `enemyRef` enemy dies during sequence: check alive/dying status before applying glow. Material restoration: not needed since restart re-initializes the scene.
7. **State variables:** Add `_killerLabelSpawned: false` to state init. Reset in death sequence entry block.

**Testing approach:** Die to a specific zombie. During death sequence: camera should zoom in ~35% and lookAt should drift toward the killer's position. The killer zombie should pulse with glowing emissive in its tier color. A floating tier name should appear above it (once). All other zombies should visibly dim. Die to a grave burst -- camera zooms in on player only, no highlight (graceful null handling). Die to a long-range death bolt -- camera pan should be clamped.

---

### Batch 3, Agent 3C: BD-230 -- Player Death Stumble Animation

**Files to modify:** `js/3d/player-model.js`, `js/game3d.js`

**Context:**
- `animatePlayer()` in `js/3d/player-model.js` at ~line 371. Currently handles walk, idle, and flight animation. Receives the state object `st`.
- Hurt flash section in `js/game3d.js` at ~line 4615. Uses `_trueColor` userData from BD-214.

**Key implementation notes:**
1. **Death animation branch:** At the very top of `animatePlayer()`, before any normal animation, add: `if (st.deathSequence) { ... return; }`. This completely replaces normal animation during the death sequence.
2. **Animation:** Progress = `1 - (st.deathSequenceTimer / 1.5)`. Tilt progress clamped to 60% (animation holds final pose for remaining 40%). Forward tilt up to 45 degrees (`-Math.PI / 4`). Sink `group.position.y` by 0.4 units. Arms spread outward (+0.3 units). Legs go limp (slight backward offset). Tail stops wagging and droops.
3. **Gray-out desaturation:** In the hurt flash section of `game3d.js`, add a death-sequence branch. Guard normal hurt flash with `if (!st.deathSequence)`. In the death-sequence branch: compute `grayMix = Math.min(deathProgress * 1.2, 0.7)` (max 70% gray). For each mesh with `_trueColor`, blend toward luminance gray. Uses `_trueColor` as reference to avoid interaction with hurt flash.
4. **Restart safety:** When game restarts, the entire player group is re-created, so no stuck rotation values carry over.

**Testing approach:** Die and watch the player model. Should see: forward tilt progressing to 45 degrees, arms spreading, legs going limp, tail drooping. Animation should reach final pose around 60% through the 1.5s and hold. Model should progressively desaturate toward gray. Restart -- normal animation should work correctly. Test all 4 animal types (leopard, redPanda, lion, gator).

---

### Batch 3, Agent 3D: BD-231 + BD-233 -- Death Vignette + Death Audio

**Files to modify:** `js/3d/hud.js`, `js/game3d.js`, `js/3d/audio.js`

**Context:**
- BD-231 HUD: `drawHUD()` in `hud.js`. Insert vignette before the game-over overlay check.
- BD-231 game3d: Death sequence entry block from BD-228 (~line 6370). Add 2 lines to force hurt flash.
- BD-233 game3d: Death sequence entry block and tick block from BD-228. Add `playSound` calls at specific timing offsets.
- BD-233 audio: SOUND_MAP in `js/3d/audio.js`. Add new death sound event IDs.

**Key implementation notes (BD-231 -- Vignette):**
1. **HUD vignette:** In `drawHUD()`, before the game-over overlay, add: if `s.deathSequence`, draw a radial gradient from transparent center to red edges. Start alpha 0.5, fade to 0.0 over 1.5s. Use `ctx.createRadialGradient` with inner radius `W * 0.2` and outer `W * 0.7`. Color `rgba(180, 0, 0, alpha)`.
2. **Force hurt flash:** In death entry block, set `st.playerHurtFlash = 1.5` and `st.playerHurtFlashCooldown = 0` to bypass the BD-208 cooldown. Ensures immediate visual hit on the killing blow.

**Key implementation notes (BD-233 -- Audio):**
3. **Sound mappings:** Add to SOUND_MAP: `sfx_death_impact: ['explode-1.ogg']`, `sfx_death_slowmo: ['falling-scream-1.ogg']`. Comment placeholder: `// sfx_death_sting: TODO Sound Pack Beta`.
4. **Layered playback:** In death entry block: `playSound('sfx_death_impact')` immediately. Add `st._deathSlowmoPlayed = false` to state init and reset in entry block. In death tick block: when `st.deathSequenceTimer <= 1.3 && !st._deathSlowmoPlayed`, play `sfx_death_slowmo`. At sequence end: `playSound('sfx_death_sting')` (no-op until Sound Pack Beta).
5. **Remove old death sound:** The existing `playSound('sfx_player_death')` call at the death check must be removed or replaced by the layered sequence.

**Testing approach:** Die. Verify: red vignette appears at screen edges immediately, fades to invisible over 1.5s. Verify: impact thud plays at death. Slow-mo whoosh plays ~0.2s later. No double-play bugs. Restart and die again -- verify sounds trigger correctly again. Verify vignette renders on top of gameplay but under game-over overlay (no red artifact after game-over appears).

---

### Batch 4, Agent 4A: BD-225 -- Visual Telegraph Polish + disposeTempMesh

**Files to modify:** `js/game3d.js`

**Context:**
- All boss attack code from BD-220-223 is now in the codebase.
- Weapon effects update loop contains shadow zone, death beam, fissure, and dark nova effect types.
- Multiple manual dispose patterns exist (geometry.dispose + material.dispose + scene.remove).

**Key implementation notes:**
1. **disposeTempMesh utility:** Add at module scope:
   ```js
   function disposeTempMesh(mesh, scene) {
     if (!mesh) return;
     if (mesh.geometry) mesh.geometry.dispose();
     if (mesh.material) {
       if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
       else mesh.material.dispose();
     }
     scene.remove(mesh);
   }
   ```
   Replace all manual dispose patterns in boss attack code with calls to this utility.
2. **Death Bolt Volley telegraph:** Add faint red fan lines during the 0.5s telegraph showing bolt spread. Create `e._volleyFanLines` array of thin box meshes. Clean up when bolts fire.
3. **Screen shake catalog verification:** Audit all `triggerScreenShake` calls across BD-218-224 code and verify values match the spec:
   - Titan Slam: (0.3, 0.3s), Charge start: (0.2, 0.2s), Charge hit: (0.4, 0.3s)
   - Bone Barrage impact: (0.15, 0.15s), Ground Fissure eruption: (0.25, 0.25s)
   - Death Bolt Volley: (0.1, 0.1s), Shadow Zone eruption: (0.1, 0.1s)
   - Summon completion: (0.15, 0.2s), Death Beam fire: (0.2, 0.3s)
   - Dark Nova slam: (0.5, 0.5s), Boss entrance: (0.4, 0.5s), Phase transition: (0.3, 0.4s)
4. **Phase transition pause:** Verify the 0.5s attack timer pause from BD-218 is functional.

**Testing approach:** Fight bosses through multiple attack cycles. Verify: Death Bolt Volley shows fan lines during telegraph. All screen shakes feel appropriate. Check `renderer.info.memory` during boss fight -- geometry/texture counts should not steadily increase (no leaks). Verify disposeTempMesh is called for all temporary meshes.

---

### Batch 4, Agent 4B: BD-226 -- Chill Mode Tuning + Dark Nova

**Files to modify:** `js/game3d.js`, `js/3d/audio.js`

**Context:**
- All boss attacks from BD-220-223 are in the codebase. Each attack has Chill Mode branches.
- Overlord attack pool from BD-222 needs `'darkNova'` added at Phase 4+.
- The full Chill Mode parameter reference table is in the bead document.

**Key implementation notes:**
1. **Dark Nova attack:** Add `'darkNova'` to Overlord pool when `e.bossPhase >= 4`. Float-up phase: 1s (2s Chill), boss rises 3 units with dark red particles. Slam-down: maximum screen shake (0.5, 0.5s). Expanding ring from radius 4 to 30 over 2s (3s Chill). Safe zone within 4 units (6 Chill) of boss -- player inside safe radius takes no damage. Damage 50 (25 Chill), single-hit. First-time "GET CLOSE!" hint in green. Audio: `sfx_boss_dark_nova: ['zombie-4.ogg']`.
2. **Phase 4 speed boost:** +30% move speed for Overlord when `e.bossPhase >= 4`.
3. **Chill Mode parameter audit:** Verify EVERY boss attack parameter matches the reference table. Check: bone count, telegraph durations, damage values, cooldowns, bolt counts/speeds, zone counts, summon counts/tiers, beam widths, phase thresholds. All cooldowns must be multiplied by 1.5x in Chill on top of phase multiplier.
4. **Chill Mode Death Beam gate:** Verify Death Beam is gated to Phase 4 in Chill Mode (not Phase 3).

**Testing approach:** Play in Chill Mode. Fight Titan -- verify longer telegraphs, lower damage, fewer projectiles. Fight Overlord through Phase 4 -- verify Dark Nova appears (float-up, expanding ring, safe zone at boss). Verify "GET CLOSE!" hint appears first time only. Compare every parameter against the reference table. Verify Phase 4 speed boost. Verify Death Beam does not appear until Phase 4 in Chill.

---

### Batch 4, Agent 4C: BD-227 -- Boss Audio Consolidation

**Files to modify:** `js/3d/audio.js`

**Context:**
- SOUND_MAP object in `js/3d/audio.js`. Previous beads (BD-218, BD-220-224, BD-226) added individual `sfx_boss_*` entries. This bead audits and consolidates.
- `MAX_CONCURRENT` limit (currently 12).

**Key implementation notes:**
1. **SOUND_MAP audit:** Verify all 9 boss event IDs exist with correct file references:
   - `sfx_boss_entrance: ['zombie-4.ogg']`
   - `sfx_boss_phase_transition: ['rawr-2.ogg']`
   - `sfx_boss_charge_telegraph: ['leapord-growl-1.ogg']`
   - `sfx_boss_slam_impact: ['explode-1.ogg']`
   - `sfx_boss_death_bolt: ['big-pew-1.ogg']`
   - `sfx_boss_shadow_zone: ['gas-1.ogg']`
   - `sfx_boss_summon: ['zombie-5.ogg']`
   - `sfx_boss_death_beam: ['pew-5x-1.ogg']`
   - `sfx_boss_dark_nova: ['zombie-4.ogg']`
2. **playSound call audit:** Verify every boss attack plays the correct sound at the right moment (see audit table in bead doc).
3. **MAX_CONCURRENT check:** Boss fight worst case: phase transition + attack + bone impacts + shadow eruptions. If testing shows audio dropout, increase to 16.
4. **Sound Pack Beta documentation:** Add code comments documenting which events need replacement recordings, ordered by impact priority.

**Testing approach:** Fight bosses with audio unmuted. Every attack should have an audible sound cue. No silent attacks. No audio dropout during intense boss fights with multiple overlapping effects. Verify mute toggle still works. Verify volume controls still work. Check console for audio errors.

---

## 5. Execution Order and Merge Strategy

### Batch Round 1 (3 parallel agents, all start simultaneously)

**Start:** All three agents launch.

**Merge order:**
1. **Agent 1B** (BD-235 + BD-232) first -- smallest footprint. BD-235 only adds fields to existing call sites. BD-232 only touches hud.js game-over section.
2. **Agent 1A** (BD-218) second -- adds infrastructure to enemy update loop. Verify screen shake and phase system work.
3. **Agent 1C** (BD-228) third -- most invasive change (dt audit touches ~30 sites). Benefits from stable merge base. **Integration test after this merge is critical** -- verify death sequence does not break normal gameplay, boss attacks, or any other system.

**Integration checkpoint:** Play a full run after all three merge. Verify: game works normally, screen shake callable, boss phases transition, death enters slow-mo sequence, game-over screen shows killer icon.

---

### Batch Round 2 (3 parallel agents, all start after Round 1 merges)

**Merge order:**
1. **Agent 2C** (BD-224) first -- isolated entrance code. Low merge risk.
2. **Agent 2A** (BD-219) second -- visual flags in enemy update. Low merge risk.
3. **Agent 2B** (BD-220 + BD-221) third -- most complex addition (3 new Titan attacks). Benefits from stable merge base.

**Integration checkpoint:** Fight a Titan through all 3 phases. Verify entrance animation, phase visuals, all 5 attack types (Slam, Shockwave, Bone Barrage, Charge, Fissures).

---

### Batch Round 3 (4 parallel agents, all start after Round 2 merges)

**Merge order:**
1. **Agent 3C** (BD-230) first -- isolated in `player-model.js` + hurt flash section.
2. **Agent 3D** (BD-231 + BD-233) second -- touches `hud.js` and death sequence blocks.
3. **Agent 3B** (BD-229 + BD-234) third -- touches camera section and enemy update during death.
4. **Agent 3A** (BD-222 + BD-223) fourth -- most complex (4 Overlord attacks + summoned zombie system). May cause merge conflicts in enemy update loop if combined with 3B changes. **Merge attention required.**

**Integration checkpoint:** Die and verify full death sequence: slow-mo, camera zoom, stumble animation, vignette, audio layers, killer glow, floating label, dimmed others. Then fight Overlord through all 4 phases: verify Volley, Shadow Zones, Summon Burst, Death Beam.

---

### Batch Round 4 (3 parallel agents, all start after Round 3 merges)

**Merge order:**
1. **Agent 4C** (BD-227) first -- audio.js only, zero game logic changes.
2. **Agent 4A** (BD-225) second -- visual polish and disposeTempMesh utility.
3. **Agent 4B** (BD-226) third -- Dark Nova + Chill Mode tuning. Most parameter changes. Benefits from stable merge base with all attacks present.

**Integration checkpoint:** Full playthrough in both Normal and Chill Mode. Boss fights should feel polished with correct audio, clean telegraphs, no memory leaks, and properly tuned Chill parameters.

---

## 6. Post-Merge QA Checklist

### Boss Battle System (BD-218-227)

#### Foundation (BD-218)
- [ ] `triggerScreenShake(0.5, 1.0)` produces visible camera offset that decays
- [ ] Overlapping shakes use max amplitude (not cumulative)
- [ ] Titan has 3 boss phases with correct HP thresholds (Normal: 60%/30%, Chill: 40%/15%)
- [ ] Overlord has 4 boss phases with correct HP thresholds (Normal: 75%/50%/25%, Chill: 55%/30%/12%)
- [ ] Phase transitions fire exactly once (no repeats)
- [ ] Phase transitions produce: floating text, screen shake, sound, body flash, aura shift, 0.5s pause

#### Boss Visuals (BD-219)
- [ ] Titan Phase 2: black crack lines appear on body
- [ ] Titan Phase 3: eyes turn white with emissive glow, steam particles rise
- [ ] Overlord Phase 2: body shifts to purple tint
- [ ] Overlord Phase 3: crown fire turns blue-white
- [ ] Overlord Phase 4: body pulses with sinusoidal emissive glow
- [ ] Visual changes are additive (Phase 3 keeps Phase 2 visuals)

#### Titan Attacks (BD-220 + BD-221)
- [ ] Phase 1: only Slam and Shockwave in attack pool
- [ ] Phase 2+: Bone Barrage available -- ground circles, parabolic arcs, landing damage + particles
- [ ] Phase 3+: Titan Charge available -- aim line telegraph, hunch, dash, hit detection, recovery stun
- [ ] Phase 3+: Ground Fissures available -- brown lines, eruption damage, visual persist then dispose
- [ ] Attack selection is random with no consecutive repeats
- [ ] All temp meshes (markers, bones, aim lines, fissures) properly disposed
- [ ] Chill Mode: correct bone count (4), telegraph (1.2s), damage (8), charge telegraph (2.25s), etc.

#### Overlord Attacks (BD-222 + BD-223)
- [ ] Phase 1: Death Bolt Volley (3-bolt spread) and Shadow Zones available
- [ ] Phase 2+: Summon Burst available -- channel, ring spawn, 50% HP minions, no reward, auto-despawn
- [ ] Phase 3+: Death Beam available (Phase 4 in Chill) -- charge, sweep, single-hit
- [ ] Summoned zombies grant no XP and drop no loot
- [ ] Summoned zombies fade transparent in final 2s, max 6 alive
- [ ] Shadow Zones max 2 sets active, pulse during telegraph, damage tick during active
- [ ] Death Beam sweeps 60 degrees, fades at end
- [ ] Chill Mode: correct bolt count, zone count, summon count/tier, beam parameters

#### Boss Entrance (BD-224)
- [ ] Boss spawns at scale 0.01, grows to full size over 1.5s with cubic ease-out
- [ ] Ground crack particles radiate outward during growth
- [ ] Title card appears at completion ("TITAN" gold / "OVERLORD" red)
- [ ] Screen shake at completion (0.4, 0.5s)
- [ ] Boss skips attack logic during entrance
- [ ] Tier 1-3 zombies within 15 units scatter for 2s then resume

#### Visual Polish (BD-225)
- [ ] Death Bolt Volley shows fan lines during 0.5s telegraph
- [ ] All screen shake values match the catalog spec
- [ ] `disposeTempMesh` utility used throughout boss code
- [ ] No geometry/material leaks during extended boss fight (`renderer.info.memory` stable)

#### Chill Mode + Dark Nova (BD-226)
- [ ] Dark Nova only at Overlord Phase 4+ -- float-up, expanding ring, safe zone at boss
- [ ] "GET CLOSE!" hint appears first time only
- [ ] Phase 4 Overlord moves 30% faster
- [ ] Every Chill Mode parameter matches the reference table (see bead doc)
- [ ] Death Beam gated to Phase 4 in Chill (not Phase 3)
- [ ] All cooldowns correctly multiplied by 1.5x in Chill

#### Boss Audio (BD-227)
- [ ] All 9 `sfx_boss_*` events registered in SOUND_MAP with valid files
- [ ] Every boss attack plays an audio cue at the correct moment
- [ ] No silent boss attacks
- [ ] No audio dropout during intense boss fights
- [ ] Mute toggle and volume controls still work

### Death Clarity System (BD-228-235)

#### Death Sequence (BD-228)
- [ ] HP reaches 0 enters 1.5s slow-mo before game-over screen
- [ ] Enemies and projectiles visibly slow down
- [ ] Player input fully disabled during death sequence
- [ ] No new enemies spawn during death sequence
- [ ] Time-scale ramp: 1.0 to 0.15 over first 0.5s, holds at 0.15
- [ ] After 1.5s, game-over screen appears with all stats, feedback, name entry intact
- [ ] No regression to game-over flow, leaderboard, or restart
- [ ] All particles slow down (no visual desync)

#### Camera Zoom (BD-229)
- [ ] Camera zooms in ~35% during death sequence
- [ ] LookAt blends toward midpoint between player and killer
- [ ] Both player and killer visible in frame
- [ ] Camera does not jitter or snap
- [ ] No killer position: camera zooms in on player only
- [ ] Long-range killer: camera pan clamped (8 unit max)

#### Death Animation (BD-230)
- [ ] Player tilts forward to 45 degrees, arms spread, legs limp, tail droops
- [ ] Animation reaches final pose at 60% progress and holds
- [ ] Model desaturates toward 70% gray
- [ ] Gentle animation (not violent ragdoll)
- [ ] Normal animation resumes on restart
- [ ] Works with all 4 animal types

#### Death Vignette (BD-231)
- [ ] Red vignette at screen edges appears at death
- [ ] Starts at alpha 0.5, fades to 0.0 over 1.5s
- [ ] Renders on top of gameplay but under game-over overlay
- [ ] No vignette artifact remains after game-over screen
- [ ] Killing blow triggers hurt flash regardless of cooldown

#### Killer Icon (BD-232)
- [ ] Zombie tier icon appears left of DEFEATED BY text on game-over screen
- [ ] Icon colored to match killer tier
- [ ] Higher-tier icons slightly larger
- [ ] Dark pill behind tier name text
- [ ] Layout does not shift surrounding elements

#### Death Audio (BD-233)
- [ ] Impact thud plays immediately at death
- [ ] Slow-mo whoosh plays 0.2s in (once only)
- [ ] Transition sting plays at sequence end (silent until Sound Pack Beta)
- [ ] Old `sfx_player_death` call removed or replaced
- [ ] Sounds trigger correctly on subsequent deaths after restart

#### Killer Highlight (BD-234)
- [ ] Killer zombie pulses with emissive glow in tier color
- [ ] Floating tier-name label above killer (once per death)
- [ ] Other zombies dim visibly
- [ ] enemyRef null: highlight gracefully skipped
- [ ] Killer dies during sequence: glow stops but label persists
- [ ] No material artifacts on restart

#### Damage Source Data (BD-235)
- [ ] All `damagePlayer()` call sites pass `killerX`, `killerZ`, `enemyRef`
- [ ] `st.lastDamageSource` contains positional data after every damage event
- [ ] Grave burst passes `enemyRef: null` without errors
- [ ] No regression to existing damage tracking or DEFEATED BY text

### Cross-Feature Integration
- [ ] Boss death (killed by boss attack) triggers full death sequence with correct killer data
- [ ] Boss attacks that kill player properly populate `killerX/killerZ/enemyRef`
- [ ] Screen shake from boss attacks does not interfere with death sequence camera
- [ ] Death sequence slow-mo correctly scales boss attack projectiles in flight
- [ ] Boss audio and death audio do not overlap in confusing ways
- [ ] Full run in Chill Mode: boss fights + death sequence both work correctly
- [ ] FPS stays above 30 during boss fights with death sequence active
- [ ] No crashes, no stuck states, no infinite loops
- [ ] Restart from game-over screen resets ALL new state variables from both features
