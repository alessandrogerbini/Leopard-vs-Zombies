# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## First Steps for New Agents

1. Read this file fully.
2. Read `Ideal Agent Instructions/README.md` for the phase-driven workflow system (navigation / execution / landing).
3. Skim `ARCHITECTURE.md` and `CONTRIBUTING.md` for code conventions and module structure.
4. Run `bd ready` to find available work, or check `docs/planning/` for current sprint status.

## Ideal Agent Instructions (Phase-Driven Workflow)

The `Ideal Agent Instructions/` folder contains a full agent coordination system. All agents SHOULD follow its phase model:

| Phase | Trigger Words | Load | Document |
|-------|--------------|------|----------|
| **Navigation** | plan, architect, design | primers + navigation ritual | `Ideal Agent Instructions/navigation.md` |
| **Execution** | implement, build, code | bead scope only | `Ideal Agent Instructions/execution.md` |
| **Landing** | done, complete, finish | bead + modified files | `Ideal Agent Instructions/landing.md` |

Key files in the folder:
- `agents.md` -- Phase router and bead mandate (canonical reference)
- `modularity-primer.md` / `modularity-reference.md` -- Trunk/branch architecture principles
- `context-primer.md` / `context-reference.md` -- Context budget and token management rules
- `README.md` -- Full overview of the system with bead schema

**Core rules from the instructions:**
- ALL work requires a bead. If none exists, create one with `status: planning`.
- No scope expansion during execution -- return to navigation phase instead.
- No branch-to-branch imports. Modules communicate through trunk interfaces only.
- Context is a budgeted resource: load only what the current phase requires.

## Project Structure

### Source Code
```
index.html              Entry point (3 canvases, Three.js CDN, CSS, module loader)
js/
  game.js               2D game loop, state machine, physics, combat
  state.js              Shared 2D state, constants, type catalogs
  utils.js              Collision detection, particles, stat helpers
  levels.js             Level definitions and procedural terrain
  enemies.js            Zombie/boss/ally spawning and AI
  items.js              Pickup and crate systems
  renderer.js           All 2D drawing functions (~4200 lines)
  game3d.js             3D survivor mode orchestrator (imports from js/3d/)
  3d/
    constants.js        All immutable constants (WEAPON_TYPES, SCROLL_TYPES, etc.)
    utils.js            box() helper for voxel model construction
    terrain.js          Noise functions, biome system, chunk lifecycle
    player-model.js     Bipedal animal model building, animation, muscle growth
    hud.js              Full HUD overlay rendering (HP/XP bars, menus, game over)
```

### Documentation
```
docs/
  planning/             Sprint plans, wildfang status beads
  reviews/              Code reviews, documentation audits
  process/              Documentation plans, housekeeping recommendations
  analysis/             Gap analysis, engine analysis, modularity analysis
human planning docs/    Developer creative direction (path to closed alpha v1/v2/v3)
Ideal Agent Instructions/   Phase-driven agent workflow system (9 files)
```

### Assets
```
sound-pack-alpha/       Mouth-made SFX collection (.mp3/.ogg) with sound-ids.md manifest
```

## Modular Extraction Status (js/3d/)

The 3D mode is being decomposed from a single closure (`game3d.js`) into ES modules under `js/3d/`. Current extraction layers:

| Layer | Module | What It Exports | Status |
|-------|--------|-----------------|--------|
| 0 | `3d/constants.js` | All game constants, type definitions, config | Extracted |
| 0 | `3d/utils.js` | `box()` helper for model construction | Extracted |
| 1 | `3d/terrain.js` | Noise, biome, chunk generation/unload/update | Extracted |
| 1 | `3d/player-model.js` | `buildPlayerModel`, `animatePlayer`, `updateMuscleGrowth` | Extracted |
| 2 | `3d/hud.js` | `drawHUD(ctx, s, deps)` -- full HUD overlay | Extracted |
| -- | Enemy models, weapon firing, projectile logic, etc. | -- | Not yet extracted |

`game3d.js` still orchestrates: game loop, state init, enemy AI, weapons, items, and cleanup. Further extraction is tracked in `docs/analysis/modularity-analysis.md`.

## Coding Conventions

- **No build step.** Vanilla JS with ES module `import`/`export`. Three.js loaded globally via CDN.
- **Naming:** `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants.
- **3D models:** Built from box primitives using `box(group, w, h, d, color, x, y, z, shadow)`.
- **Chunk keys:** `"cx,cz"` string format with integer coordinates.
- **State (3D):** Single `st` object within the `launch3DGame` closure. ~100 mutable properties.
- **State (2D):** Mutable singletons from `state.js` (`state`, `player`, `camera`, `keys`).
- **Cleanup:** All Three.js objects disposed via `scene.traverse` on exit.
- **JSDoc:** `@module` headers with dependency and export documentation on each file.

## Terminology Note

- "Tomes" / "scrolls" are being renamed to **"howls"** to fit the animal theme. Code currently uses `SCROLL_TYPES` / `st.scrolls`. The rename is planned in `human planning docs/path to closed alpha v3.md` but not yet implemented.

## bd Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

