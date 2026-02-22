# Agentic Engineering Housekeeping — Recommended Tasks

## Already In Progress
- **Documentation Audit** (first pass, broad scope) — `documentation-audit-1.md`
- **Code Review** (Linus Torvalds style, first pass) — `code-review-1.md`

## Recommended Tasks

### 1. Architecture Map & Dependency Graph
**Agent type:** Systems architect / static analysis agent
**Priority:** HIGH
**Depends on:** None (can run immediately)
**Scope:** Trace every function call, global variable, cross-file dependency, and event flow across all 8 JS files. Map the data flow from `index.html` load through mode selection to gameplay loop. Identify the module boundaries (or lack thereof), shared mutable state, and coupling between the 2D and 3D subsystems. Catalog every global/closure variable in `game3d.js` (the `st` object, `scene`, `camera`, `clock`, etc.) and map which functions read/write them.
**Deliverable:** `architecture-map.md` containing: (a) a textual dependency graph of all files and their exports/imports, (b) a data-flow diagram of the main game loop, (c) a catalog of shared mutable state with read/write locations, (d) identification of circular dependencies or tangled coupling, (e) a module boundary diagram showing what *should* be separate modules vs what is currently monolithic.
**Why it matters:** At 3,619 lines, `game3d.js` is a monolith. At 4,262 lines, `renderer.js` is another. Before any refactoring or feature work, the team needs a clear map of what touches what. This is the single most valuable artifact for onboarding, parallelizing work, and avoiding merge conflicts.

---

### 2. Performance Audit & Profiling Recommendations
**Agent type:** Performance engineering agent
**Priority:** HIGH
**Depends on:** None (can run immediately)
**Scope:** Analyze the codebase for common browser game performance pitfalls: object allocation in hot loops (GC pressure), unnecessary Three.js object creation per frame, unoptimized chunk loading/unloading, expensive collision detection patterns, canvas HUD redraw frequency, texture/geometry reuse, and draw call counts. Examine the animation loop, entity update loops, and particle/projectile systems for O(n^2) interactions. Check for memory leaks in object disposal (the `scene.traverse` cleanup pattern). Audit the chunk-based terrain system for thrashing at chunk boundaries.
**Deliverable:** `performance-audit.md` containing: (a) a ranked list of likely performance bottlenecks with line-number references, (b) estimated severity (frame-budget impact), (c) specific fix recommendations for each, (d) a list of measurements the team should take with browser DevTools to validate, (e) memory leak risk assessment for long play sessions.
**Why it matters:** Browser games live or die on frame rate. A vanilla Three.js game with procedural terrain, 10 tiers of zombies, projectile systems, and particle effects has many opportunities to drop below 60fps. Identifying hotspots before they become player-facing bugs is cheaper than debugging jank later.

---

### 3. Security & Input Validation Audit
**Agent type:** Security-focused code review agent
**Priority:** MEDIUM
**Depends on:** None (can run immediately)
**Scope:** Audit all user input handling (keyboard events, gamepad input), any use of `eval`/`innerHTML`/`document.write`, CDN dependency integrity (Three.js loaded via CDN — is there an SRI hash?), and the overall attack surface for a browser game. Check for prototype pollution vectors in the configuration/state objects. Examine whether game state could be trivially manipulated via the browser console (relevant if leaderboards or multiplayer are ever added). Audit the `index.html` for CSP headers and script loading security.
**Deliverable:** `security-audit.md` containing: (a) CDN dependency integrity assessment and SRI recommendations, (b) input sanitization findings, (c) console-exploitable state mutations, (d) CSP/header recommendations for deployment, (e) a threat model appropriate for a single-player browser game (brief, not enterprise-grade).
**Why it matters:** Even single-player browser games benefit from basic hygiene: pinned CDN dependencies prevent supply-chain surprises, and understanding the console-exploitability of game state matters the moment any competitive or shared element is added. This is also cheap to do now and expensive to retrofit.

---

### 4. Technical Debt Inventory & Refactoring Roadmap
**Agent type:** Refactoring / code quality agent
**Priority:** HIGH
**Depends on:** Code Review (first pass), Architecture Map
**Scope:** Systematically catalog every instance of: duplicated logic, magic numbers, dead code, overly long functions (>100 lines), deeply nested conditionals, string-based dispatch that should be data-driven, inconsistent naming conventions, TODO/FIXME/HACK comments, and functions doing more than one thing. Cross-reference with the architecture map to identify which debt is load-bearing (risky to touch) vs isolated (safe to refactor). Prioritize by: (a) blast radius if the code breaks, (b) how often the code is modified (merge conflict frequency), (c) effort to fix.
**Deliverable:** `tech-debt-inventory.md` containing: (a) categorized debt items with file/line references, (b) a risk-vs-effort matrix, (c) a suggested refactoring sequence (what to extract first, what to leave alone), (d) estimated bead/sprint effort for the top 10 items, (e) specific recommendations for breaking up `game3d.js` and `renderer.js`.
**Why it matters:** The sprint history shows rapid feature delivery via parallel worktree agents, which is great for velocity but accumulates structural debt. A systematic inventory turns "we should refactor sometime" into a prioritized, executable plan.

---

### 5. Game Balance & Tuning Constants Audit
**Agent type:** Game systems / data analysis agent
**Priority:** MEDIUM
**Depends on:** None (can run immediately)
**Scope:** Extract every tuning constant in the codebase: spawn rates, damage values, health scaling, XP curves, cooldown timers, drop rates, tier thresholds, movement speeds, attack ranges, powerup durations, difficulty scaling formulas, and shrine/augment values. Organize them into a structured data catalog. Identify which constants are hardcoded inline vs defined at the top of a file vs configurable. Flag any balance relationships that seem inconsistent (e.g., a weapon whose DPS doesn't scale correctly with level, or a zombie tier whose health jump is disproportionate). Check the difficulty totem system for degenerate strategies.
**Deliverable:** `balance-constants-catalog.md` containing: (a) a complete table of every tuning constant with its current value, location, and what it affects, (b) identified inconsistencies or likely balance issues, (c) recommendations for extracting constants into a centralized config object, (d) suggestions for which values should be exposed as difficulty settings.
**Why it matters:** Game balance is the difference between fun and frustration. Having all constants in one place makes tuning conversations concrete instead of abstract, and centralizing them is a prerequisite for any future difficulty modes, A/B testing, or mod support.

---

### 6. Test Strategy & Testability Assessment
**Agent type:** QA / test engineering agent
**Priority:** MEDIUM
**Depends on:** Architecture Map
**Scope:** Assess the current testability of the codebase (spoiler: there are likely zero automated tests). Identify which systems are unit-testable as-is, which need refactoring to become testable, and which are inherently integration/manual-test territory. Design a pragmatic test strategy appropriate for a vanilla JS browser game with no build system: what testing framework fits (e.g., lightweight options that work without bundlers), what the highest-value first tests would be, and what a smoke-test suite for CI would look like. Identify the top 10 regressions most likely to occur based on the merge history.
**Deliverable:** `test-strategy.md` containing: (a) testability assessment per module, (b) recommended testing framework and setup, (c) the first 10 tests to write (ranked by regression risk), (d) a manual QA checklist for pre-merge validation, (e) a lightweight CI pipeline spec (GitHub Actions) for smoke testing, (f) identification of pure functions that can be tested today without refactoring.
**Why it matters:** The merge history shows 12-conflict and 6-conflict merges. Without automated regression detection, every merge is a manual QA burden. Even a minimal test suite covering core game loop invariants would catch the most common breakage.

---

### 7. Error Handling & Resilience Audit
**Agent type:** Reliability engineering agent
**Priority:** MEDIUM
**Depends on:** None (can run immediately)
**Scope:** Audit every code path for error handling: What happens when Three.js fails to load from CDN? When `requestAnimationFrame` stalls? When a chunk generates with invalid data? When an enemy reference is stale after disposal? When the gamepad disconnects mid-input? When the browser tab loses focus during gameplay? Trace the cleanup path (`scene.traverse` disposal) for resource leaks. Check for unhandled promise rejections, uncaught exceptions in animation loops, and division-by-zero in scaling formulas.
**Deliverable:** `resilience-audit.md` containing: (a) catalog of unhandled error conditions with severity ratings, (b) specific failure scenarios and their current behavior (crash, silent corruption, visual glitch), (c) recommended error boundaries and fallback behaviors, (d) a defensive coding checklist for future development, (e) browser compatibility concerns (WebGL support detection, fallback messaging).
**Why it matters:** Browser games have no crash reporter. When something breaks, the player just sees a frozen screen or weird behavior and closes the tab. Systematic resilience work converts hard crashes into graceful degradation, which is especially important for a game that runs a complex simulation with procedural generation.

---

### 8. Asset & Resource Management Audit
**Agent type:** Resource management / optimization agent
**Priority:** LOW
**Depends on:** Performance Audit
**Scope:** Catalog every Three.js resource created at runtime: geometries, materials, textures, meshes, groups, lights, and render targets. Map their lifecycle (when created, when disposed, whether shared or duplicated). Identify resources that could be instanced (e.g., zombie models across tiers, chunk decorations, projectile meshes). Check for material/geometry duplication where sharing would reduce GPU memory. Assess whether a simple asset pooling system would benefit the most frequently created/destroyed objects (projectiles, XP gems, particle effects, enemies).
**Deliverable:** `resource-management-audit.md` containing: (a) resource lifecycle map, (b) duplication analysis (how many unique materials/geometries exist vs how many are created), (c) object pooling candidates ranked by allocation frequency, (d) estimated memory savings from proposed changes, (e) specific Three.js best practices being violated.
**Why it matters:** Three.js applications commonly leak memory through undisposed geometries and materials, and waste GPU bandwidth through duplicated resources. For a game with procedural terrain and waves of enemies, resource management directly impacts how long a session can run before performance degrades.

---

### 9. Git Workflow & Branch Hygiene Audit
**Agent type:** DevOps / process agent
**Priority:** LOW
**Depends on:** None (can run immediately)
**Scope:** Analyze the git history for: merge conflict frequency and patterns (which files conflict most often), branch naming conventions, commit message quality, merge vs rebase strategy effectiveness, worktree usage patterns, and whether the bead-based workflow is creating unnecessary churn. Identify which files are modified most frequently and by the most different branches (hotspot analysis). Check for large binary files in history, .gitignore completeness, and whether the `.beads` and `.claude` directories should be tracked.
**Deliverable:** `git-workflow-audit.md` containing: (a) merge conflict hotspot analysis (files/regions that conflict most), (b) branch lifecycle statistics, (c) recommendations for reducing merge pain, (d) .gitignore recommendations, (e) suggestions for commit message standards, (f) assessment of whether the current worktree-based parallel development model is sustainable.
**Why it matters:** The commit history shows multiple merge commits resolving 6-12 conflicts each. If the parallel agent workflow is going to scale (the sprint plan mentions 15 beads), understanding and reducing merge friction is essential. A hotspot analysis directly informs how to decompose monolithic files.

---

### 10. Browser Compatibility & Deployment Readiness Audit
**Agent type:** Front-end / deployment agent
**Priority:** LOW
**Depends on:** None (can run immediately)
**Scope:** Audit `index.html` and all JS for browser compatibility: ES6+ feature usage and minimum browser version requirements, WebGL/WebGL2 feature detection, mobile/touch input support (or lack thereof), responsive design considerations, CDN reliability (is there a fallback if the Three.js CDN is down?), and deployment readiness (could this be deployed to GitHub Pages, itch.io, or Netlify as-is?). Check for console.log spam that should be removed for production. Assess whether the game handles window resize, fullscreen toggle, and high-DPI displays correctly.
**Deliverable:** `deployment-readiness-audit.md` containing: (a) minimum browser requirements, (b) mobile compatibility assessment, (c) deployment platform recommendations with specific steps, (d) pre-deployment checklist (remove debug logs, add error boundaries, set meta tags), (e) CDN dependency risk assessment with fallback recommendations, (f) accessibility considerations (colorblind modes, keyboard-only play, screen reader announcements for key events).
**Why it matters:** A game that can't be easily deployed can't be easily shared. Understanding the gap between "works on my machine" and "works for players" early prevents a painful rush when it's time to ship.

---

## Suggested Execution Order

```
Phase 1 — Immediate (no dependencies, run in parallel):
  [1] Architecture Map & Dependency Graph         ← HIGH, unlocks Phase 2 tasks
  [2] Performance Audit                            ← HIGH, standalone
  [5] Game Balance Constants Audit                 ← MEDIUM, standalone
  [7] Error Handling & Resilience Audit            ← MEDIUM, standalone
  [9] Git Workflow & Branch Hygiene Audit          ← LOW, standalone
  [3] Security & Input Validation Audit            ← MEDIUM, standalone
 [10] Browser Compatibility & Deployment Readiness ← LOW, standalone

Phase 2 — After Architecture Map completes:
  [4] Technical Debt Inventory & Refactoring Roadmap  ← HIGH, needs [1] + code review
  [6] Test Strategy & Testability Assessment          ← MEDIUM, needs [1]

Phase 3 — After Performance Audit completes:
  [8] Asset & Resource Management Audit               ← LOW, needs [2]
```

Seven tasks can start immediately. The three remaining depend only on one Phase 1 output each, so the critical path is short.

## Notes

1. **Calibrate scope to project size.** This is a 10k-line solo/small-team game, not an enterprise platform. Each audit should aim for 2-4 pages of actionable findings, not 20-page compliance documents. An agent that produces a wall of obvious advice ("consider using TypeScript") is wasting everyone's time. Findings should be specific, referencing exact line numbers and proposing concrete fixes.

2. **The monolith problem is the meta-issue.** `game3d.js` (3,619 lines) and `renderer.js` (4,262 lines) together account for ~78% of the codebase. Almost every audit will bump into this. The Architecture Map (Task 1) and Tech Debt Inventory (Task 4) should explicitly address decomposition strategy, and other audits should note when their findings would be easier to act on post-decomposition.

3. **No build system is a constraint, not a bug.** Several of these audits may recommend tooling that requires a build step (bundlers, test runners, linters). Recommendations should be graded: what can be done with zero tooling changes, what requires a lightweight addition (e.g., a single `<script type="module">` migration), and what requires a real build system. The team can then make an informed decision about when/whether to adopt one.

4. **Merge conflict frequency is the canary.** The sprint model uses parallel worktree agents landing features concurrently. The 6-12 conflict merges in the git history suggest this is already straining. Tasks 1, 4, and 9 all address this from different angles. If only one recommendation is acted on, it should be the architecture map, because it's the prerequisite for safely decomposing the monoliths that cause the conflicts.

5. **These audits are snapshots, not subscriptions.** Each produces a point-in-time document. The team should plan to re-run the highest-value audits (performance, tech debt, balance) periodically as the codebase evolves, especially after major sprints.
