# Architecture

Technical architecture reference for Animals vs Zombies.

## Module Dependency Graph

```
index.html
  ├─ three.min.js (CDN, global THREE object)
  └─ game.js (entry point, 2D game loop, state machine)
       ├─ state.js (shared 2D state, constants, type definitions)
       ├─ utils.js (collision detection, particles, scoring)
       │    └─ state.js
       ├─ levels.js (level data, terrain generators)
       ├─ enemies.js (zombie/boss/ally AI, spawning)
       │    ├─ state.js
       │    └─ utils.js
       ├─ items.js (pickups, crates, equipment)
       │    ├─ state.js
       │    ├─ utils.js
       │    └─ enemies.js (spawnAlly)
       ├─ renderer.js (all 2D drawing functions)
       │    └─ state.js
       └─ game3d.js (self-contained 3D mode)
            └─ THREE (global)
```

## File Responsibility Table

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 50 | Entry point: 3-canvas DOM, Three.js CDN, CSS, module loader |
| `js/game.js` | 1,079 | 2D game loop, state machine, player physics, combat, input |
| `js/state.js` | 248 | Shared 2D constants, mutable state singletons, type catalogs |
| `js/utils.js` | 150 | AABB collision, attack hitbox, particles, floating text, stat helpers |
| `js/levels.js` | 183 | Level definitions (3 levels), procedural terrain generators |
| `js/enemies.js` | 758 | Zombie spawning/AI, boss spawning/AI, ally spawning/AI |
| `js/items.js` | 351 | Health pickups, powerup crates, armor/equipment crate systems |
| `js/renderer.js` | 4,262 | All 2D drawing: sprites, backgrounds, HUD, menus, animations |
| `js/game3d.js` | 3,619 | Complete 3D survivor mode in a single closure-based function |
| **Total** | **10,700** | |

## 2D Mode Architecture

### State Machine

```
title ──[Enter]──> modeSelect ──[Enter]──> difficulty ──[Enter]──> select
  ^                   |  ^                    |  ^                   |
  |                  [Esc]                   [Esc]                  |
  |                   v  |                    v  |                   |
  |                 title                  modeSelect               |
  |                                                                 |
  |          ┌──────────────────────────────────────────────────────┘
  |          |                   [Enter on mode=0 (2D)]
  |          v
  |       playing ──[all zombies dead, level<3]──> portal ──[enter portal]──> levelComplete
  |          |                                                                    |
  |          |  ┌───────[timer expires, level<3]──────────────────────────────────┘
  |          |  v                                                  [timer expires, level=3]
  |       playing ──[all zombies dead, level=3]──> bossIntro ──> bossFight         |
  |          |                                                      |              v
  |         [Esc]──> paused ──[Esc]──> (previous state)             |          gameWin
  |          |                                                      |            |
  |          |  ┌──[boss killed, diamond collected]─────────────────┘            |
  |          |  v                                                                |
  |       levelComplete ──[timer, level=3]──> gameWin ──[Enter]──> title          |
  |          |                                                                    |
  |         [hp<=0]                                                               |
  |          v                                                                    |
  |       dying ──[timer, lives>0]──> playing (re-init level)                     |
  |          |                                                                    |
  |         [timer, lives=0]                                                      |
  |          v                                                                    |
  |       gameOver ──[Enter]──> title                                             |
  |                                                                               |
  └───────────────────────────────────────────────────────────────────────────────┘

select ──[Enter on mode=1 (3D)]──> (stops 2D loop, launches 3D) ──[onReturn]──> title
```

**Game state values:** `title`, `modeSelect`, `difficulty`, `select`, `playing`, `bossIntro`, `bossFight`, `levelComplete`, `gameWin`, `gameOver`, `paused`

### Game Loop

The 2D mode uses a single `requestAnimationFrame` loop that calls `update()` then `draw()` every frame at ~60fps:

1. **update()** -- state machine branching, player physics (Euler integration with gravity), input handling, collision detection, powerup timers, enemy AI delegation, item/pickup updates
2. **draw()** -- delegates to `renderer.js` functions based on current `gameState`; applies camera offset, screen shake, and flash overlays

### Data Flow

- `state.js` exports mutable singletons (`state`, `player`, `camera`, `keys`) that all modules import and mutate directly.
- `game.js` orchestrates: it reads input from `keys`, calls AI functions from `enemies.js`, pickup logic from `items.js`, and render functions from `renderer.js`.
- Score is calculated in `utils.js` via `addScore()` with difficulty multiplier applied automatically.

## 3D Mode Architecture

### Closure-Based Module Pattern

`game3d.js` exports a single function `launch3DGame(options)`. All 3D game state, rendering, physics, UI, and cleanup are encapsulated within this function's closure. The local `st` object holds all mutable state (~100 properties). When the player exits, the cleanup function disposes all Three.js resources, removes event listeners, and calls `options.onReturn()` to hand control back to the 2D title screen.

### Dual Canvas System

- **canvas#game3d** -- Three.js `WebGLRenderer` for the 3D scene (terrain, enemies, player model, projectiles, decorations)
- **canvas#hud3d** -- Transparent Canvas 2D overlay (`pointer-events: none`) for health bars, score, wave counter, upgrade menus, pause menu, game-over screen, leaderboard

Both canvases are stacked absolutely within `#game-container` and expand to fill the viewport in 3D mode.

### Chunk System

- **CHUNK_SIZE:** 16 world units per chunk
- **VIEW_DIST:** 4 chunks in each direction (loaded around the player)
- **Chunk key format:** `"cx,cz"` string (integer chunk coordinates)
- Terrain, platforms, decorations, and shrines are all chunk-based
- Chunks are loaded/unloaded as the player moves; objects beyond `VIEW_DIST + 1` are disposed

### Biome System

Biomes are determined by a noise function (`noise2D`) evaluated at the chunk center:

| Noise Value | Biome   | Ground Colors       | Decorations                 |
|-------------|---------|--------------------|-----------------------------|
| < 0.33      | Forest  | Dark greens         | Trees, shrubs               |
| 0.33 - 0.66 | Desert | Sandy yellows/tans  | Cacti, rocks                |
| > 0.66      | Plains  | Bright greens       | Trees (50% chance), grass   |

### Zombie Tier System

10 zombie tiers with escalating stats and visual upgrades:

- **Spawning:** Ambient spawns every few seconds; tier based on player level and game time
- **Merging:** When two same-tier zombies collide (both below tier 10), they merge into a single zombie of the next tier with increased HP, damage, speed, and XP value
- **Visual upgrades:** Higher tiers gain glowing eyes, horns, colored auras, and size scaling

### Weapon System

- **6 weapon types** defined in `WEAPON_TYPES` (line 21): clawSwipe, boneToss, poisonCloud, lightningBolt, fireball, boomerang
- **4 weapon slots** maximum (1 at start, new slots at levels 5, 10, 15)
- **Auto-fire:** Each weapon has a `cooldownTimer` that counts down; `fireWeapon(w)` (line 1535) is called when ready
- **Projectile logic:** `updateWeaponProjectiles(dt)` (line 1738) handles movement, collision, AoE, chaining
- **5 upgrade levels** per weapon, each with specific stat improvements

### Scroll System

- **6 scroll types** defined in `SCROLL_TYPES` (line 54): power, haste, arcane, vitality, fortune, range
- Scrolls are passive buffs that stack (tracked in `st.scrolls` as integer counts)
- Offered as upgrade choices on level-up alongside weapons

### Shrine / Augment System

- **20 shrines** pre-placed at game start within the arena area
- **30% chance** per qualifying chunk to also generate shrines during exploration
- Each shrine has 3 HP; break it with attacks to receive a random augment
- **8 augment types** defined in `SHRINE_AUGMENTS` (line 101): maxHp, xpGain, damage, moveSpeed, atkSpeed, pickupRadius, armor, regen
- Augments apply immediately and persist for the entire run

### Totem System

- **8 difficulty totems** placed at game start
- Activating a totem permanently increases zombie difficulty (+15% HP, +10% speed, +15% spawn rate) but also grants +25% XP and +25% score per totem
- Defined in `TOTEM_EFFECT` (line 112)

### Wave Event System

- **Timer:** `st.waveEventTimer` starts at 240 seconds (4 minutes)
- **Warning:** 10-second countdown displayed on HUD before a wave event triggers
- **Effect:** Large burst of enemy spawns; wave counter increments
- **Reset:** Timer resets to 240 seconds after each wave event

### Level-Up Upgrade System

- XP gems dropped by killed zombies; `st.xpToNext` scales with level
- On level-up, `st.upgradeMenu = true` pauses gameplay and presents 3-4 random choices:
  - New weapon (if a slot is available)
  - Weapon upgrade (if an existing weapon is below max level)
  - Scroll pickup
- Player has 3 rerolls per game to re-randomize choices
- Navigate with Arrow Left/Right or A/D, confirm with Enter/Space

## Rendering Pipeline

### 2D Mode

1. `renderer.js` receives the 2D canvas context via `initRenderer(canvas)`
2. Each frame, `game.js` calls specific draw functions based on `gameState`
3. Draw order (back to front): background/sky, terrain features (trees/cars/ice), platforms, ground, pickups/crates, enemies, player, projectiles, particles, floating text, HUD overlay
4. Camera offset (`camera.x`, `camera.y`) is subtracted from world positions for scrolling
5. Screen shake adds random offsets; screen flash draws a fading overlay

### 3D Mode

1. Three.js `WebGLRenderer` renders the scene graph each frame
2. Camera follows the player from above at a fixed angle (top-down perspective)
3. Scene contains: terrain chunk meshes, platform meshes, decoration objects, shrine/totem models, enemy groups, player group, weapon projectile meshes, particle effects
4. Lighting: ambient light + directional light for shadows
5. After `renderer.render(scene, camera)`, the HUD canvas is cleared and redrawn with 2D context calls for all UI elements

## State Management

### 2D Mode

Mutable singletons exported from `state.js`:
- `state` -- game phase, level data, entity arrays, UI flags
- `player` -- position, velocity, stats, powerup timers, item flags
- `camera` -- viewport scroll position
- `keys` -- pressed key tracking (`{ [code]: boolean }`)

All modules import and mutate these objects directly. No immutability or event system.

### 3D Mode

Single local `st` object within the `launch3DGame` closure:
- Contains ~100 properties covering player stats, enemy arrays, weapon state, scroll counts, shrine/augment tracking, totem multipliers, UI flags, timers, and leaderboard data
- No external modules can access `st`; all logic is colocated in the closure
- Cleanup function nullifies Three.js references and stops the animation loop

## Input Handling

### 2D Mode

- `window.addEventListener('keydown'/'keyup')` populates the shared `keys` object from `state.js`
- `game.js` reads `keys[code]` each frame in `update()` for movement, jumping, and attacking
- Separate `keydown` listener for name entry text input on the game-over screen

### 3D Mode

- Dedicated `keys3d` object within the closure, populated by local `onKeyDown`/`onKeyUp` handlers
- Movement: WASD or Arrow keys read each frame in `tick()`
- Power attack: Enter/NumpadEnter/B -- hold to charge (0-2 seconds), release to fire AoE
- Menu navigation: handled in `onKeyDown` event handler with immediate response
- Event listeners are removed during cleanup to prevent leaks
