# Wildfang — Current Status

**Date:** 2026-02-22
**Working title:** Leopard vs Zombies / Animals vs Zombies
**Codebase size:** ~12,400 lines across 8 JavaScript files
**Commits to date:** 39
**Playable:** Yes, fully playable in browser with no installation

---

## What Is This Game?

Wildfang is a browser-based action game where you play as one of four animal characters — a leopard, red panda, lion, or alligator — fighting waves of zombies. The game offers two very different experiences in one package: a side-scrolling 2D platformer campaign with three hand-crafted levels and boss fights, and a 3D top-down survival mode where you fight endless waves of zombies, collect weapons and upgrades, and try to survive as long as possible.

The vibe is colorful, arcadey, and fast-paced. Animals are drawn with chunky box-model sprites, zombies merge together into bigger and scarier versions of themselves, and the screen fills up with projectiles, lightning bolts, poison clouds, and explosions as your character gets stronger. It runs directly in a web browser with no downloads, no accounts, and no setup — just open the page and play. Think "Vampire Survivors meets Saturday morning cartoons, starring jungle animals."

---

## Game Modes

### 2D Classic Mode

The player picks one of four animals and a difficulty level, then progresses through three side-scrolling levels:

1. **The Dark Forest** (3,200px wide, 12 zombies) — a dense forest setting with platforms to jump between
2. **The Highway** (4,000px wide, 18 zombies) — an urban road environment with more enemies and tighter spacing
3. **The Ice Age** (5,000px wide, 25 zombies) — a frozen landscape with the toughest enemy configuration

In each level, the player runs left and right, jumps between platforms, and attacks zombies with melee strikes. Zombies come in two sizes: normal and "big" (30% chance, 1.8x HP, slower but tougher). Along the way, the player breaks crates to find temporary powerups (like a banana cannon or angel wings that let you fly) and permanent equipment (armor, boots, glasses). After clearing all zombies in a level, a boss appears with a cinematic intro sequence. Bosses use a telegraph system — they signal their attacks before executing them, giving the player time to dodge.

The player has 3 lives per run. Score is tracked per difficulty on a local leaderboard. Three difficulty settings control starting HP (100%/55%/35%) and score multipliers (1x/1.75x/2.5x). Controls are arrow keys for movement, Space for attack, Enter to confirm, and Escape to pause.

### 3D Roguelike Survivor Mode

This is the main mode and where most development effort has gone. It plays like a top-down survival game rendered in 3D.

The player spawns on an infinite procedurally-generated terrain with three biomes (forest, desert, plains) and fights zombies that continuously spawn from the edges of the visible area. Zombies use a 10-tier merge system: when two same-tier zombies collide, they combine into a single stronger zombie with more HP, damage, speed, and visual upgrades (glowing eyes, horns, colored auras). Tier 10 zombies are formidable.

Combat is automatic — the player's equipped weapons fire on their own whenever enemies are in range. The player can also hold Enter to charge a power attack (0-2 seconds) and release for an area-of-effect burst. As zombies die, they drop XP gems and occasional loot. Collecting enough XP triggers a level-up, which pauses the game and presents a choice of upgrades: new weapons, weapon improvements, or passive scrolls. The player can hold up to 4 weapons simultaneously (slots unlock at levels 1, 5, 10, and 15).

The map contains 20 breakable shrines that grant random permanent stat boosts, and 8 difficulty totems that make enemies harder but increase XP and score rewards — a risk/reward trade-off for skilled players. Every 4 minutes, a wave event triggers a large burst of enemy spawns with a 10-second warning countdown.

Each animal starts with a different weapon (Leopard gets Claw Swipe, Red Panda gets Boomerang, Lion gets Lightning Bolt, Gator gets Poison Cloud) and has unique stat profiles that meaningfully change how the game plays.

Controls are WASD or arrow keys for movement, Space for jump, Enter/B for power attack, and Escape for pause menu with Resume/Restart/Quit options.

---

## Feature Inventory

| Feature | Mode | Status | Notes |
|---------|------|--------|-------|
| Character selection (4 animals) | Both | Working | Each has unique speed/damage/HP ratios |
| Difficulty selection (3 levels) | Both | Working | Easy/Medium/Hard with HP and score scaling |
| Side-scrolling platformer gameplay | 2D | Working | 3 levels with increasing size and difficulty |
| Boss fights with attack telegraphs | 2D | Working | 2-phase boss with charge, skull, AoE, mortar attacks |
| Lives system (3 lives, respawn) | 2D | Working | Per-level respawn, game over on depletion |
| Temporary powerups from crates | Both | Working | 7 types in 2D, 18 types in 3D |
| Permanent equipment items | Both | Working | 6 items in 2D, 11 items in 3D |
| Auto-attack weapon system | 3D | Working | 6 weapon types, auto-fire on cooldown |
| Weapon slot progression (1-4 slots) | 3D | Working | Unlock at levels 1/5/10/15 |
| Weapon upgrades (5 levels each) | 3D | Working | Per-weapon stat improvements on level-up |
| Passive scroll system | 3D | Working | 6 scroll types, stackable buffs |
| Level-up upgrade menu with rerolls | 3D | Working | 3 rerolls per game, 3-4 random choices |
| 10-tier zombie merge system | 3D | Working | Visual upgrades per tier, stat scaling |
| Procedural infinite terrain | 3D | Working | Chunk-based, 3 biomes, platforms, decorations |
| Shrine augment system | 3D | Working | 20 finite shrines, 8 augment types |
| Difficulty totem system | 3D | Working | 8 totems, risk/reward multipliers |
| Wave events (4-minute timer) | 3D | Working | 10-second warning, large enemy bursts |
| Charged power attack | 3D | Working | Hold 0-2 seconds for AoE burst |
| G-force flight maneuvers | 3D | Working | Alt+W/S loops and dives during Angel Wings |
| Zombie platform climbing | 3D | Working | Zombies jump onto elevated platforms |
| Zombie kill drops (loot) | 3D | Working | Crates and items drop from killed zombies |
| Map boundaries (256x256) | 3D | Working | Visible stone walls at map edges |
| Pause menu | Both | Working | Resume/Restart/Main Menu in 3D; pause/unpause in 2D |
| Per-difficulty leaderboard | Both | Working | Stored locally in browser, top 10 per difficulty |
| Name entry for leaderboard | Both | Working | Text input on game-over screen |
| Kill tracking by zombie tier | 3D | Working | Per-tier kill stats displayed |
| Game timer | 3D | Working | Elapsed time shown on HUD |
| Muscle growth visual on level-up | 3D | Working | Player model gets visibly bulkier per level |
| Screen shake and flash effects | 2D | Working | On impacts and boss events |
| Particle effects | Both | Working | Death effects, attack visuals, pickups |
| Floating damage/score text | Both | Working | Pop-up numbers on hits and score gains |
| Ally companion (war horse) | 2D | Working | Requires cowboy boots, NPC with 3 lives |

---

## Content Inventory

### Animals (4)
| Animal | Speed | Damage | HP | Description | 3D Starting Weapon |
|--------|-------|--------|----|-------------|-------------------|
| Leopard | 1.0x | 1.0x | 100 | Balanced fighter | Claw Swipe |
| Red Panda | 1.2x | 0.8x | 80 | Fast and agile | Boomerang |
| Lion | 0.85x | 1.3x | 120 | Strong and tough | Lightning Bolt |
| Gator | 0.75x | 1.5x | 150 | Slow but deadly | Poison Cloud |

### Weapons — 3D Mode (6)
| Weapon | Type | Base Damage | Base Cooldown | Description |
|--------|------|-------------|---------------|-------------|
| Claw Swipe | Melee | 12 | 1.2s | AoE arc slash hitting nearby enemies |
| Bone Toss | Projectile | 10 | 1.5s | Ranged bone; gains extra projectiles at levels 2/5 |
| Poison Cloud | AoE | 5 | 3.0s | Damage-over-time cloud placed at enemy position |
| Lightning Bolt | Chain | 15 | 2.0s | Chains between enemies; gains chains at levels 1/3/5 |
| Fireball | Projectile+AoE | 20 | 2.5s | Projectile that explodes on impact |
| Boomerang | Piercing | 8 | 1.8s | Cross-shaped disc that arcs out and returns |

Each weapon has 5 upgrade levels with specific stat improvements.

### Scrolls — 3D Mode (6)
| Scroll | Effect | Max Stacks |
|--------|--------|------------|
| Power | +15% all weapon damage | 5 |
| Haste | -15% all cooldowns | 5 |
| Arcane | +1 projectile count | 3 |
| Vitality | +20 max HP and instant heal | 5 |
| Fortune | +30% XP gain | 3 |
| Range | +20% weapon range | 5 |

### Powerups — 2D Mode (7)
Jumpy Boots (+50% jump), Claws of Steel (2x damage), Super Fangs (2x attack speed), Race Car (jet fire + speed), Banana Cannon (ranged boomerang), Litter Box (rear AoE), Angel Wings (flight). All are ammo-based and found in breakable crates.

### Powerups — 3D Mode (18)
All 7 from 2D mode (re-implemented as duration-based), plus 11 additional:
Frost Nova (freeze burst), Berserker Rage (+50% dmg/+30% spd/+25% vulnerability), Ghost Form (invulnerable, cannot attack), Earthquake Stomp (landing shockwaves), Vampire Fangs (passive regen), Lightning Shield (periodic zaps), Giant Growth (2x size and damage), Time Warp (slow all zombies), Magnet Aura (5x pickup radius), Mirror Image (AI clone allies), Bomb Trail (explosive bombs while moving), Regen Burst (rapid heal to full).

### Items — 2D Mode (6)
Leather Armor (-damage taken), Chainmail Armor (-more damage taken), Aviator Glasses (reveal crate contents), Cowboy Boots (+20% attack range), Soccer Cleats (+15% move speed), War Horse (allied companion, requires boots).

### Items — 3D Mode (11)
| Item | Slot | Effect |
|------|------|--------|
| Leather Armor | armor | -25% damage taken |
| Chainmail | armor | -40% damage taken |
| Aviator Glasses | glasses | See crate contents |
| Cowboy Boots | boots | +20% attack range |
| Soccer Cleats | boots | +15% move speed |
| Magnet Ring | ring | +50% pickup radius |
| Lucky Charm | charm | +50% drop rate |
| Thorned Vest | vest | Reflect 20% damage |
| Health Pendant | pendant | +1 HP/s regen |
| Shield Bracelet | bracelet | Block 1 hit every 30s |
| Crit Gloves | gloves | 15% chance for 2x damage |

### Enemy Types
- **2D:** Normal zombies and Big zombies (30% chance, wider/taller, 1.8x HP, 0.7x speed). Plus a 2-phase boss per level.
- **3D:** 10 zombie tiers. Each tier has increased HP, damage, speed, and XP value. Higher tiers gain visual upgrades (glowing eyes at tier 3+, horns at tier 5+, colored auras at tier 7+). Same-tier zombies merge on collision into the next tier up.

### Levels — 2D Mode (3)
1. The Dark Forest (3,200px, 12 zombies)
2. The Highway (4,000px, 18 zombies)
3. The Ice Age (5,000px, 25 zombies)

### Biomes — 3D Mode (3)
Forest (dark greens, trees and shrubs), Desert (sandy yellows, cacti and rocks), Plains (bright greens, grass and scattered trees). Determined procedurally per chunk via noise function.

### Shrine Augments — 3D Mode (8)
+5% Max HP (with 10 HP heal), +5% XP Gain, +5% Damage, +5% Move Speed, +5% Attack Speed, +10% Pickup Radius, +3% Armor, +0.5 HP/s Regen. All stack indefinitely from 20 pre-placed shrines.

### Totems — 3D Mode (8)
Each totem destroyed applies cumulative multipliers:
- Zombie HP +15%, Zombie Speed +10%, Spawn Rate +15% (making the game harder)
- XP Gain +25%, Score Gain +25% (rewarding the risk)

---

## Tech Stack

**Rendering:** Three.js r128 for 3D graphics (loaded from a CDN, no local copy) and the HTML Canvas 2D API for all 2D mode rendering plus the 3D mode's overlay interface (health bars, menus, scores).

**Language:** Plain JavaScript using ES modules (import/export). No TypeScript, no JSX, no framework.

**Build system:** None. There is no bundler, transpiler, minifier, or package manager. The game is 8 JavaScript files, one HTML file, and a CDN link. Opening `index.html` in a browser (or serving it from any HTTP server) is enough to play.

**Persistence:** Browser localStorage stores per-difficulty leaderboards for both modes. No server, no cloud saves, no accounts.

**Resolution:** 960x540 base canvas for 2D mode. 3D mode expands to fill the browser viewport. Two additional canvases overlay the 3D scene for the HUD.

**Deployment:** Currently runs locally. Could deploy to GitHub Pages, itch.io, or any static file host with zero configuration.

---

## Technical Debt Summary

### Monolith Risk (HIGH)
The 3D mode lives in a single 4,500-line function (`launch3DGame` in `game3d.js`). All game logic — rendering, physics, combat, UI, weapon systems, terrain generation, enemy AI — is enclosed in one function scope. This makes it impossible to test individual systems in isolation, difficult to debug, and creates merge conflicts when multiple people work on different features simultaneously. The 2D renderer (`renderer.js`, 4,600 lines) is similarly large. Together, these two files account for 74% of the codebase.

### Test Coverage (HIGH)
There are zero automated tests. No unit tests, no integration tests, no smoke tests, no test framework installed. Every change is validated by manual playtesting. The merge history already shows 6-12 conflict merges, and without tests, regressions can only be caught by playing the game.

### Build System (LOW, but constraining)
The zero-build-step approach is a genuine strength for simplicity and developer onboarding. However, it means no linting, no type checking, no automated code formatting, and no minification for production. This is fine at the current scale but would become a bottleneck if the codebase grows significantly or multiple contributors are involved.

### Performance Ceiling (MEDIUM)
Several patterns in the 3D mode will cause performance degradation as enemy counts grow: per-frame array allocations for enemy cleanup, unoptimized distance calculations using `Math.sqrt` in inner loops, individual material property writes for particle effects, and incomplete Three.js resource disposal that can leak GPU memory during long sessions. None of these are showstoppers today, but they establish a ceiling for how intense gameplay can become.

### Browser Compatibility (LOW)
The game requires WebGL support (present in all modern browsers) and ES module support (Edge 79+, Chrome 61+, Firefox 60+, Safari 11+). Three.js is loaded from a CDN without a Subresource Integrity (SRI) hash, which is a minor supply-chain risk. There is no mobile/touch input support — the game is keyboard-only.

---

## Module Health Overview

| Module | Health | Size | Risk | Notes |
|--------|--------|------|------|-------|
| `js/state.js` | Green | 339 lines | Low | Clean, declarative. Well-documented with JSDoc typedefs. Leaf module with no dependencies. |
| `js/utils.js` | Green | 150 lines | Low | Small, focused. Collision detection is fast and correct. |
| `js/levels.js` | Green | 183 lines | Low | Simple level data. Magic coordinates acceptable for 3 levels. |
| `js/enemies.js` | Green | 800 lines | Low | Well-structured AI. Clever boss telegraph system. Clean separation of spawn/update logic. |
| `js/items.js` | Yellow | 568 lines | Medium | Functional but copy-paste heavy. 5 crate types repeat the same pattern. Needs factory refactor. |
| `js/game.js` | Yellow | 1,225 lines | Medium | Good 2D game loop and state machine. Input handling uses underscore-prefixed hidden state flags that pollute the state object. Incomplete cleanup on mode switch. |
| `js/renderer.js` | Yellow | 4,599 lines | Medium | Large but correct. 48 drawing functions are individually simple but the file size makes navigation difficult. |
| `js/game3d.js` | Red | 4,494 lines | High | The monolith. All 3D systems in one closure function. Contains confirmed bugs (for-in mutation during iteration, event listener leaks). Would be the primary target of any refactoring effort. |

---

## Open Beads Summary

**17 beads** have been identified from the code review, numbered BD-16 through BD-32.

| Priority | Count | Categories |
|----------|-------|------------|
| P0 — Critical (ship-blocking) | 2 | Bug fixes: iteration-during-mutation crash risk, event listener memory leak |
| P1 — High (correctness/performance) | 7 | Bug fixes (cooldown drift, floating-point opacity, incomplete state cleanup) and performance (Map vs delete, squared distances, swap-delete arrays, recursive disposal) |
| P2 — Medium (maintainability) | 6 | Refactors (input state isolation, augment consolidation) and code quality (magic numbers, copy-paste crates, leaderboard clarity, particle batching) |
| P3 — Low (long-term architecture) | 2 | Variable naming consistency, and the big one: breaking the game3d.js monolith into 7+ modules |

The two P0 bugs could cause invisible collision surfaces (ghost platforms from the iteration bug) and gradual CPU waste from leaked event listeners. Both are small fixes (under 50 lines each). The P1 items are individually small but collectively represent meaningful correctness and performance improvements. The P3 monolith decomposition (BD-32) is the largest single effort and depends on several P2 items completing first.

An additional 10 housekeeping audits have been recommended (architecture map, performance audit, security audit, test strategy, game balance catalog, error handling audit, resource management audit, git workflow audit, browser compatibility audit, and technical debt inventory), of which 7 can begin immediately with no dependencies.

---

## Strengths

**The game is complete and playable.** Both modes work end-to-end. A player can pick an animal, choose a difficulty, play through the full experience, die, see their score on a leaderboard, and play again. This is the single most important thing — the game ships.

**The feature depth in 3D mode is substantial.** 6 weapons with 5 upgrade tiers, 18 powerups, 11 items, 6 scrolls, 8 shrine augments, 8 difficulty totems, 10 zombie tiers with a merge system, wave events, charged power attacks, and flight mechanics. For a browser game with no build tooling, this is a lot of content.

**The 2D architecture is well-organized.** The six modules for 2D mode (`state.js`, `utils.js`, `levels.js`, `enemies.js`, `items.js`, `renderer.js`) have clear responsibilities and clean separation. This demonstrates the team knows how to write modular code and provides a template for how the 3D mode should eventually be structured.

**Zero dependencies beyond Three.js.** No bundler, no framework, no npm packages. The game is 8 files and a CDN link. This makes it trivially deployable to any static hosting platform and eliminates entire categories of build/dependency problems.

**The boss fight design shows game design skill.** The telegraph system — where bosses visually signal their attacks before executing them — is a well-established pattern in action games, and the implementation here (with countdown timers, target markers, and distinct attack types) creates genuine gameplay tension.

**Rapid feature velocity.** 39 commits have delivered two complete game modes with deep progression systems. The bead-based development workflow with parallel worktree agents has been effective for shipping features quickly.

---

## Risks & Concerns

**The 3D monolith is the project's biggest liability.** At 4,500 lines in a single function scope, `game3d.js` cannot be safely modified by multiple contributors, cannot be automatically tested, and will generate merge conflicts on nearly every parallel change. Every sprint that adds features to 3D mode without addressing this makes the eventual refactoring harder.

**No automated testing creates compounding risk.** The merge history already shows 12-conflict merges. Without tests, the only way to verify that a merge didn't break something is to manually play through both modes. As the feature set grows, the manual testing burden grows with it, and regressions become more likely to slip through.

**Performance has not been measured.** There are multiple known patterns that degrade under load (per-frame array allocations, unoptimized distance calculations, individual particle updates), but no profiling has been done. The game likely runs well with small enemy counts but could struggle in late-game scenarios with 200+ zombies, multiple weapon projectiles, and active poison clouds.

**Two confirmed bugs have crash potential.** The `for...in` iteration bug (BD-16) modifies an object while iterating it, which is undefined behavior that can silently corrupt chunk state. The event listener leak (BD-17) gradually accumulates dead handlers that waste CPU. Both are small fixes but have been present since the 3D mode was introduced.

**Mobile and gamepad are unsupported.** The game is keyboard-only. This limits the potential audience significantly if the game is published on a platform like itch.io where many players expect touch or controller support.

**CDN dependency is unpinned.** Three.js is loaded from a CDN without a Subresource Integrity hash. If the CDN serves a different version or is compromised, the game breaks or worse. This is a low-probability but high-impact risk.

---

## Recommended Next Steps

1. **Fix the two P0 bugs immediately.** The for-in iteration bug (BD-16) and event listener leak (BD-17) are each under 50 lines of change and eliminate real crash/degradation risks. These should be addressed before any feature work.

2. **Run a performance profiling session.** Before adding more content or systems, spend one session playing the 3D mode for 10+ minutes with Chrome DevTools open, monitoring frame times, memory growth, and GPU usage. This establishes a baseline and reveals whether the P1 performance beads (BD-21 through BD-24) are urgent or merely preventive.

3. **Plan the monolith decomposition as a dedicated sprint.** The game3d.js split (BD-32) is the single highest-leverage structural improvement. It unblocks parallel development, enables testing, and reduces merge conflict frequency. It depends on four P2 beads completing first (BD-25, BD-26, BD-29, BD-31), so the realistic path is: complete those P2 prerequisites in one sprint, then decompose in the next.

4. **Establish a minimal test suite.** Even 10-15 tests covering core pure functions (collision detection, damage calculation, XP scaling, augment math) would catch the most common regressions. The utility functions in `utils.js` and the constant-driven systems (weapons, scrolls, augments) are testable today with no refactoring needed. A lightweight test runner that works without a build step (like a simple HTML test page with assertions) would be sufficient.

5. **Decide on the deployment target and ship a public version.** The game is complete enough to publish. Deploying to GitHub Pages or itch.io requires zero additional work — just upload the files. Having a public version creates external motivation to fix bugs, track performance on real hardware, and gather player feedback on game balance before investing further development effort.
