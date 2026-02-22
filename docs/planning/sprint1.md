# Sprint Plan — Multi-Agent Parallelization

All 15 beads target a single monolithic file (`js/game3d.js`, ~2830 lines).
Safe parallelism requires agents to write to **completely disjoint line ranges**.

---

## Code Region Map

| Region | Lines | Description |
|--------|-------|-------------|
| Definitions | 1-90 | `POWERUPS_3D`, `ITEMS_3D`, `SHRINE_AUGMENTS`, weapon/scroll types |
| State init | 117-194 | `const st = { ... }` |
| Leaderboard save | 200-212 | `saveScore3d()` |
| Input handlers | 224-305 | `onKeyDown`, `onKeyUp` |
| Terrain/noise | 353-500 | noise, biomes, terrainHeight |
| Chunk generation | 490-560 | `updateChunks`, platform chunks |
| Shrine generation | 583-637 | `generateShrine`, chunk-based placement |
| Player model | 640-950 | `buildBipedalModel`, wings (909-941) |
| Zombie tiers + model | 950-1100 | `ZOMBIE_TIERS`, `createEnemy` |
| Spawn system | 1100-1250 | `createXpGem`, `createPowerupCrate`, `spawnWave` |
| Weapon system | 1250-1660 | weapon update, projectiles, effects |
| Upgrade menu | 1665-1753 | `showUpgradeMenu` |
| Game loop entry | 1755-1770 | clock, `tick()`, dt |
| Player movement | 1771-1846 | WASD, jumping, flying, ground/platform collision |
| Player rotation | 1848-1856 | smooth rotation toward movement |
| Leg/arm animation | 1858-1874 | walk cycle, arm swing, body bob |
| Muscle growth | 1875-1879 | per-level scale |
| Flight animation | 1881-1901 | wings, superman pose, return to upright |
| Powerup/fire | 1903-1955 | powerup timer, fire aura particles |
| Wave timer | 1957-1962 | countdown + `spawnWave()` call |
| Chunk update | 1964-1970 | throttled terrain refresh |
| Enemy AI | 1972-2021 | zombie movement, walk anim, contact damage, cleanup |
| Zombie merging | 2023-2070 | same-tier collision merge |
| Auto-attack | 2072-2117 | nearest enemy, damage, kill processing |
| Power attack | 2119-2192 | charge/release, AoE, visual |
| Projectiles | 2204-2238 | projectile movement + hit |
| XP gems | 2240-2267 | collection, level up trigger |
| Powerup crates | 2269-2305 | crate pickup logic |
| Item pickups | 2307-2337 | item equip logic |
| Shrines | 2339-2373 | shrine hit/break logic |
| Game over | 2390-2400 | death trigger |
| Camera | 2403-2417 | camera follow + render |
| HUD - gameplay | 2423-2601 | HP, XP, level, weapons, scrolls, wave, score, powerup, items, augments |
| HUD - pause | 2604-2646 | pause menu |
| HUD - upgrade | 2648-2732 | upgrade card selection |
| HUD - game over | 2734-2789 | score, name entry, leaderboard |
| Cleanup | 2791-2830 | dispose everything |

---

## Conflict Matrix (which BDs write to overlapping regions)

```
         01  02  03  04  05  06  07  08  09  10  11  12  13  14  15
BD-01     -  XX   .   .   .   .   .   x   .   .   x   .   .   .   .
BD-02    XX   -   .   .   .   .   .   x   .   .   x   .   .   .   .
BD-03     .   .   -   x   x   x   .   .   .   .   .   .   .   .   .
BD-04     .   .   x   -  XX  XX   .   .   .   .   .   .   .   .   .
BD-05     .   .   x  XX   -  XX   .   .   .   .   .   .   .   .   .
BD-06     .   .   x  XX  XX   -   .   .   .   .   .   .   .   .   .
BD-07     .   .   .   .   .   .   -   .   .   .   .   .   .   .   .
BD-08     x   x   .   .   .   .   .   -   .   .   x   .   .   x   .
BD-09     .   .   .   .   .   .   .   .   -   .   .   .   .   .   .
BD-10     .   .   .   .   .   .   .   .   .   -   .   .   .   .   .
BD-11     x   x   .   .   .   .   .   x   .   .   -   x   .   x   .
BD-12     .   .   .   .   .   .   .   .   .   .   x   -   x   .   .
BD-13     .   .   .   .   .   .   .   .   .   .   .   x   -   .   .
BD-14     .   .   .   .   .   .   .   x   .   .   x   .   .   -   .
BD-15     .   .   .   .   .   .   .   .   .   .   .   .   .   .   -

XX = heavy conflict (same lines rewritten)
x  = light conflict (adjacent/nearby lines, or same function touched)
.  = no conflict (safe parallel)
```

---

## Sprint 1 — Quick Wins

### Batch 1 (4 parallel worktree agents)

All four agents touch completely disjoint code regions. Zero merge risk.

| Agent | Bead(s) | Lines Modified | What It Does |
|-------|---------|---------------|--------------|
| A | **BD-07** | 224-305 (input handlers) | Audit all Enter/Return key paths. Remove any restart-on-Enter during gameplay. Enter should only: charge power attack (gameplay), confirm name (game over), navigate menus. |
| B | **BD-03** | 1858-1874 (leg/arm anim) | Add `if (st.flying)` guard. When flying: legs trail behind in static pose, arms reach forward, no body bob. When not flying: existing walk cycle unchanged. |
| C | **BD-09** | 2269-2337 (crate + item pickup) | Add Y-distance check to both crate pickup (line 2285) and item pickup (line 2318). Require `Math.abs(st.playerY - crateY) < 2.0` for pickup. Player must be at same height as item. |
| D | **BD-12 + BD-13** | State init (118-194), kill code (2106, 2161, 2228), leaderboard (200-212), game over HUD (2734-2789), gameplay HUD (2428-2500) | Add `killsByTier[]` and `totalKills` to state. Increment on every kill. Add `gameTime` accumulator (pauses when paused). Show MM:SS timer on gameplay HUD. Show kill breakdown + time on game over screen. Add to leaderboard entry. |

**Merge order:** Any order (no conflicts).

### Batch 2 (2 parallel worktree agents, after Batch 1 merge)

| Agent | Bead(s) | Lines Modified | What It Does |
|-------|---------|---------------|--------------|
| E | **BD-15** | 62-69 (POWERUPS_3D array), 147-154 (state flags), 1903-1950 (effect code) | Add ~12 new powerup types: Frost Nova, Berserker Rage, Ghost Form, Earthquake Stomp, Vampire Fangs, Lightning Shield, Giant Growth, Time Warp, Magnet Aura, Mirror Image, Bomb Trail, Regen Burst. Each needs apply/remove functions and visual effects in game loop. |
| F | **BD-10** | 1972-2021 (enemy AI) | Add zombie platform awareness. When player is on platform and zombie is below: zombie attempts jump after 1-2s delay. Higher tier = better jump. Zombies can land on platforms and walk on them. Add platform collision check to enemy Y position. |

**Why safe:** E works in definitions (62-69) and powerup effects (1903-1950). F works in enemy AI (1972-2021). No overlap.

**Merge order:** Any order.

---

## Sprint 2 — Core Reworks

### Batch 3 (2 parallel worktree agents)

| Agent | Bead(s) | Lines Modified | What It Does |
|-------|---------|---------------|--------------|
| G | **BD-01 + BD-02** | 1218-1247 (spawnWave rewrite), 1957-1962 (timer rewrite), 117-139 (state), 2048 (merge HP), 2428-2500 (HUD wave warning) | **Major rewrite.** Split spawning into two systems: (1) Ambient spawns: every 3-5s, 1-3 zombies, scaled to elapsed minutes not wave#. Base zombie HP = `8 + floor(elapsedMinutes * 1.5)` (much slower growth). (2) Wave events: every 240s (4 min). 10s countdown warning on HUD. Massive burst of `10 + waveNum * 5` zombies. Wave# only increments here. Player damage should scale with level (+10% per level baseline). |
| H | **BD-04 + BD-05** | 909-941 (wing creation), 1848-1856 (player rotation), 1881-1901 (flight animation) | Fix wing flap axis to work correctly when body is tilted into superman pose. Add compensating rotation so wings flap up/down relative to flight direction. Add Z-axis bank/roll when turning (max ±20°, clamped). Smooth lerp on all rotations. Prevent upside-down flips. |

**Why safe:** G works in spawn/wave/balance (1218-1247, 1957-1962). H works in flight/animation (909-941, 1848-1901). No overlap.

**Merge order:** Any order.

### Batch 4 (1 agent, after Batch 3 merge — depends on H)

| Agent | Bead(s) | Lines Modified | What It Does |
|-------|---------|---------------|--------------|
| I | **BD-06** | 224-305 (input: add Alt key), 1790-1806 (flight control), 1881-1901 (flight animation) | Add Top Gun G-force maneuvers. Track `AltLeft`/`AltRight` in keys3d. When flying + Alt + forward: continuous forward pitch loop (~PI rad/s). When flying + Alt + backward: dive loop. Speed boost during maneuvers. Smooth return to normal flight pose on Alt release. Requires BD-04+05 flight rework to be done first. |

---

## Sprint 3 — World Building (sequential — each depends on the prior)

These beads have cascading dependencies on each other and on Sprint 2's spawn rework. Run sequentially.

| Order | Bead(s) | Depends On | Lines Modified | What It Does |
|-------|---------|-----------|---------------|--------------|
| 3a | **BD-08** | BD-01+02 (spawn rework done) | 1-8 (constants), 490-560 (chunk gen), 1785-1786 (player clamp), spawn positions, new wall meshes | Add `MAP_HALF = 128` (256x256 map). Clamp player position. Only generate chunks within bounds. Add visible boundary walls (tall stone boxes at edges). Clamp zombie spawn positions within map. |
| 3b | **BD-11** | BD-08 (map bounds), BD-12 (kill tracking exists) | 2106-2113, 2160-2167, 2227-2234 (kill code: add drop rolls), 583-637 (shrine gen: make finite), 1229-1244 (reduce crate spawns) | On zombie death, roll for drop based on tier (3%-50%). Drop types: powerup crate, health orb, XP burst. Reduce wave-spawned crates. Make shrine count finite (20 total at game start, placed within map bounds). |
| 3c | **BD-14** | BD-08 (map bounds), BD-11 (drop system) | 72-78 (ITEMS_3D expand), new TOTEM definitions, 583-637 area (totem gen), chunk gen (loot crate placement), 2339-2373 area (totem interaction), HUD (totem count) | Expand ITEMS_3D with 6+ new items. Scatter loot crates (treasure-chest style) at world gen within map bounds. Add "NOT HARD ENOUGH" totems: red skull totems that increase difficulty (+15% zombie HP, +10% speed, more spawns) in exchange for +25% XP and score per totem. 5-10 totems on map. Show skull count on HUD. |

---

## Summary: Agent Execution Timeline

```
SPRINT 1
  Batch 1:  [A: BD-07] [B: BD-03] [C: BD-09] [D: BD-12+13]  ← 4 parallel
            ──────────────── merge ────────────────
  Batch 2:  [E: BD-15] [F: BD-10]                             ← 2 parallel
            ──────── merge ────────

SPRINT 2
  Batch 3:  [G: BD-01+02] [H: BD-04+05]                      ← 2 parallel
            ──────────── merge ────────────
  Batch 4:  [I: BD-06]                                        ← 1 sequential
            ─── merge ───

SPRINT 3
  Sequential: [J: BD-08] → merge → [K: BD-11] → merge → [L: BD-14]
```

**Total: 12 agent runs across 7 batches, covering all 15 beads.**
**Max parallelism: 4 agents (Sprint 1, Batch 1).**

---

## Risk Notes

- **Highest risk merge:** Sprint 2 Batch 3 (G + H). Both are large rewrites but in completely separate code regions. Should auto-merge cleanly.
- **BD-01+02 is the largest single change.** It rewrites the core spawn loop, wave timer, and adds a new ambient spawn system. Give this agent the most detailed prompt.
- **BD-14 is last** because it depends on map bounds (BD-08), drop system (BD-11), and benefits from the expanded powerup pool (BD-15).
- **All worktree agents** should be instructed NOT to reformat/reorganize code outside their assigned regions to prevent spurious conflicts.
