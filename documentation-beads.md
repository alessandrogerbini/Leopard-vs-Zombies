# Documentation Beads — Phase 2

**Source:** documentation-plan-1.md
**Date:** 2026-02-22

---

## Summary Table

| BD | Title | Agent | Files | Complexity | Status |
|----|-------|-------|-------|------------|--------|
| BD-33 | Document state.js, utils.js, levels.js | A | state.js, utils.js, levels.js | Light | Pending |
| BD-34 | Document enemies.js and items.js | B | enemies.js, items.js | Medium | Pending |
| BD-35 | Document game.js and renderer.js | C | game.js, renderer.js | Heavy | Pending |
| BD-36 | Document game3d.js | D | game3d.js | Heavy | Pending |
| BD-37 | Create README, ARCHITECTURE, CONTRIBUTING | E | README.md, ARCHITECTURE.md, CONTRIBUTING.md, index.html | Medium | Pending |

All 5 beads can execute in parallel — zero file overlap.

---

## Beads

### BD-33: Document state.js, utils.js, levels.js
**Category:** Documentation
**Priority:** P1-High
**Agent:** A
**File(s):** `js/state.js`, `js/utils.js`, `js/levels.js`
**Description:**
Add full JSDoc and inline documentation to the 3 smallest core modules (312 lines total). These files define shared state, utility functions, and level data used across the 2D game.

**Deliverables:**
- Module header (`@module`) for all 3 files
- `@typedef` blocks for `state` object (32 props) and `player` object (30+ props) in state.js
- Inline descriptions for all constants: GRAVITY, GROUND_Y, DIFFICULTY_SETTINGS, ANIMAL_TYPES, POWERUP_TYPES, ARMOR_TYPES, etc.
- JSDoc for all 8 exported utils functions: `rectCollide`, `getAttackBox`, `spawnParticles`, `spawnFloatingText`, `getPlayerDamage`, `getPlayerCooldown`, `getPlayerJumpForce`, `addScore`
- JSDoc for `getLevelData` + 3 internal helpers in levels.js
- `@typedef` for level data object schema

**Acceptance Criteria:**
- Every exported symbol has a JSDoc block
- `state` and `player` typedefs describe every property
- All constant arrays/objects have header comments
- IDE hover over any import shows useful documentation

**Estimated Scope:** Light (~312 lines, 12 functions, ~20 constants)
**Dependencies:** None

---

### BD-34: Document enemies.js and items.js
**Category:** Documentation
**Priority:** P1-High
**Agent:** B
**File(s):** `js/enemies.js`, `js/items.js`
**Description:**
Add full JSDoc to the 2D combat modules (935 lines total). Document all 21 exported functions, create typedefs for Zombie, Boss, Ally, and pickup objects. Add inline comments for boss AI telegraph system and equipment slot mechanics.

**Deliverables:**
- Module headers for both files
- JSDoc for 6 enemies.js exports: `spawnZombies`, `spawnBoss`, `updateZombieAI`, `updateBossAI`, `spawnAlly`, `updateAllyAI`
- JSDoc for 15 items.js exports (7 spawn + 8 update functions)
- `@typedef` blocks for Zombie, Boss, Ally, HealthPickup, PowerupCrate, ArmorPickup
- Inline comments for boss telegraph system (lines 157-227)
- Document crate placement percentages (25%, 30%, 40%, 55%, 65%)
- Document footwear mutual exclusion system

**Acceptance Criteria:**
- Every exported function has JSDoc with @param and @returns
- Boss AI telegraph state machine has clear inline comments
- Equipment slot system documented
- Crate spawn location logic documented

**Estimated Scope:** Medium (~935 lines, 21 functions, 6+ typedefs)
**Dependencies:** None

---

### BD-35: Document game.js and renderer.js
**Category:** Documentation
**Priority:** P1-High
**Agent:** C
**File(s):** `js/game.js`, `js/renderer.js`
**Description:**
Document the 2D game loop and renderer (5,270 lines total). Add state machine diagram for game.js, section-level comments in update(), JSDoc for all 41 exported functions across both files. Organize renderer.js functions into 6 labeled categories.

**Deliverables:**
- Module headers for both files
- JSDoc for 8 game.js functions including `update()`, `draw()`, `initLevel()`, `gameLoop()`
- State transition diagram as block comment in game.js
- Section-level comments for each subsystem in update()
- Draw order documentation in draw()
- JSDoc for all 33 renderer.js exports organized by category:
  - Character Drawing (drawLeopard, drawZombie, drawBoss, drawAlly)
  - World Drawing (drawBackground)
  - Pickup/Crate Drawing (16 functions)
  - Effects (drawParticles, drawFloatingTexts, drawProjectiles)
  - HUD/UI (drawHUD)
  - Screen Overlays (10 functions)
- Detailed inline comments for drawLeopard (835 lines), drawBoss, drawBackground

**Acceptance Criteria:**
- State machine diagram covers all gameState values
- update() has section comments per subsystem
- renderer.js has category grouping comments
- Every exported renderer function has at minimum one-line JSDoc
- drawLeopard powerup visual branches labeled

**Estimated Scope:** Heavy (~5,270 lines, 41 functions)
**Dependencies:** None

---

### BD-36: Document game3d.js
**Category:** Documentation
**Priority:** P1-High
**Agent:** D
**File(s):** `js/game3d.js`
**Description:**
Comprehensive documentation of the 3D roguelike mode (3,619 lines). JSDoc for all 57 functions, complete `@typedef` for the 80-property `st` state object, section-level documentation for the 1,191-line `tick()` function, and inline docs for all 7 major constant blocks.

**Deliverables:**
- Module header explaining closure-based architecture and subsystem overview
- JSDoc for `launch3DGame(options)` export
- `@typedef State3D` with all ~80 properties grouped by subsystem
- JSDoc for 56 internal functions across all sections:
  - Input (2 functions)
  - Terrain (8 functions)
  - Platforms (3 functions)
  - Shrines (3 functions)
  - Totems (1 function)
  - Player Model (box helper + 4 animal builders)
  - Enemies (2 functions)
  - Pickups/Crates (4 functions)
  - Combat Utilities (3 functions + 5 scroll helpers)
  - Weapons (12 functions)
  - Level Up (1 function)
  - tick() — section-level docs for ~20 subsystems
  - drawHUD() — section docs for all HUD elements
  - cleanup() — disposal sequence docs
- Inline descriptions for WEAPON_TYPES, SCROLL_TYPES, POWERUPS_3D, ITEMS_3D, SHRINE_AUGMENTS, TOTEM_EFFECT, ANIMAL_PALETTES
- Architecture fragment for Agent E

**Acceptance Criteria:**
- Every internal function has JSDoc
- `st` typedef describes all ~80 properties
- tick() has section-level docs for each of ~20 subsystems
- fireWeapon() has per-weapon-type branch comments
- drawHUD() has section comments per element
- All 7 constant blocks have per-entry descriptions
- Existing `// === ... ===` headers preserved

**Estimated Scope:** Heavy (~3,619 lines, 57 functions, 80-prop state)
**Dependencies:** None

---

### BD-37: Create README, ARCHITECTURE, CONTRIBUTING
**Category:** Documentation
**Priority:** P1-High
**Agent:** E
**File(s):** `README.md` (new), `ARCHITECTURE.md` (new), `CONTRIBUTING.md` (new), `index.html` (minor)
**Description:**
Create all project-level documentation. README with game description and controls. ARCHITECTURE with module graph, state machines, and system design. CONTRIBUTING with extension guides (how to add weapons, powerups, items, enemies, levels).

**Deliverables:**
- **README.md**: Game description, how to run, controls table (2D + 3D + gamepad), animal/difficulty info, feature highlights, tech stack
- **ARCHITECTURE.md**: Module dependency graph (ASCII), file responsibility table, 2D state machine diagram, 3D subsystem overview (chunks, biomes, zombies, weapons, scrolls, shrines, totems, waves), rendering pipeline, state management, input handling, performance notes
- **CONTRIBUTING.md**: Dev setup, code style, how to add a weapon (4 steps), powerup (4 steps), item (3 steps), enemy variant (2 steps), level (3 steps)
- **index.html**: HTML comment explaining canvas setup and Three.js CDN

**Acceptance Criteria:**
- README "how to run" instructions actually work
- ARCHITECTURE module graph matches actual imports
- ARCHITECTURE state machine covers all gameState values
- CONTRIBUTING extension guides reference actual function names and line numbers
- All files accurate to current codebase

**Estimated Scope:** Medium (3 new files, synthesis work, no code functions)
**Dependencies:** None (benefits from BD-33 through BD-36 but can start independently)
