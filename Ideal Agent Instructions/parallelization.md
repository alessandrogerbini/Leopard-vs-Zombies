# Parallelized Execution: Findings & Protocol

**Recorded:** 2026-02-22
**Context:** Alpha v3 implementation sprint — 8 tasks, 12 agent runs, 45 minutes total.

## The Finding

The alpha v3 plan estimated **80-110 hours across 5 weeks** for implementation (Milestones M1-M3). Parallelized worktree agents completed all implementation in **~45 minutes**. That is a **100-150x compression** of the implementation phase.

This was not a fluke of small scope. The sprint delivered:
- 4 new weapons with novel fire patterns (arcing projectiles, chasing summons, orbiting turrets, damage trails)
- 4 new howls + full rename of the scroll system
- 14 new items + a 4-tier rarity system with weighted drops
- A complete audio system (320-line module, 40 sound files, 22 game events)
- Terrain overhaul (single biome, 5 decoration types, grounded plateau system)
- HUD charge bar, tiered merge ratios, readability pass across all text
- Randomized build pools, upgraded game-over screen with feedback
- 2D mode gate, Chill Mode difficulty

Total: ~1,500 new lines across 8 files, 1 new module created.

## Why It Worked

### 1. The plan was the product
The `path to closed alpha v3.md` document contained exact stat values, precise "done when" criteria, named constants, specific line references, and a clear dependency graph. Agent prompts were near-direct transcriptions of plan sections. **Time spent planning is no longer overhead — it is the primary engineering artifact.**

### 2. Module boundaries enabled parallelism
Prior modular extraction (constants.js, terrain.js, player-model.js, hud.js) meant agents could work on disjoint code regions with predictable merge behavior. The sprint plan's conflict matrix translated directly into safe agent batches.

### 3. Worktree isolation eliminated coordination cost
Each agent worked in a git worktree — a full isolated copy of the repo. No locking, no branch juggling, no "wait for me to finish." Git's merge machinery handled integration.

### 4. Batched dependency resolution
Tasks were grouped into 3 batches by dependency:
- **Batch 1** (4 parallel): weapons, terrain, items, 2D gate — zero overlap
- **Batch 2** (2 parallel): howl rename, charge bar — zero overlap, depended on Batch 1
- **Batch 3** (2 parallel, overlapped with Batch 2 tail): audio, randomized pools — zero overlap with Batch 2

Merges happened immediately as agents completed. Total idle time: near zero.

## What This Changes for the Agent Instruction System

### Planning phase (navigation.md) becomes MORE important
- Navigation must produce machine-actionable specs: exact constant names, stat values, line ranges, file paths
- "Done when" criteria must be testable by a non-human (no "feels good" — use "zero instances of X in player-facing text")
- Dependency graphs and conflict matrices should be standard navigation outputs for multi-task work
- **New required output for multi-task navigation:** a parallelization plan (which tasks are independent, which depend on what, what code regions conflict)

### Execution phase (execution.md) shifts to orchestration
- Single-agent serial execution is no longer the default model for multi-task work
- The orchestrating agent's job is: write detailed prompts, launch parallel worktree agents, resolve merge conflicts, verify integration
- Each sub-agent still follows execution.md rules (scope-locked, no feature creep)
- Sub-agent prompts must include: exact files to modify, exact patterns to follow, explicit "do NOT touch" boundaries

### Landing phase (landing.md) gains integration verification
- After parallel merges, a dedicated integration check is required: do the merged systems interact correctly?
- Conflict resolution during merge is a judgment call — the orchestrator must understand both sides
- Post-merge QA replaces per-agent testing as the verification bottleneck

### Effort estimation must split implementation from verification
- **Implementation time** is now near-constant for a given scope (agent parallelism scales with task count)
- **Verification time** scales with integration surface area and is human-speed
- Plans should budget 80% of calendar time for QA/testing, not coding
- The honest bottleneck: creative decisions, design judgment, playtesting, user feedback

## Protocol: Parallelized Execution Sprint

When a navigation phase produces 4+ independent implementation tasks:

### 1. Build the conflict matrix
Map which tasks write to which code regions. Mark overlaps as XX (heavy), x (light), or . (safe).

### 2. Batch by dependency
Group tasks into batches where all tasks within a batch have zero conflicts. Tasks in later batches may depend on earlier batches being merged.

### 3. Write detailed sub-agent prompts
Each prompt must specify:
- Exact files to read first (with line ranges)
- Exact changes to make (constants to add, functions to modify)
- Existing patterns to follow (name a specific function as reference)
- Explicit "DO NOT TOUCH" boundaries
- No ambiguity — the sub-agent should not need to make design decisions

### 4. Launch as worktree agents
Use `isolation: "worktree"` so each agent gets a full repo copy. Run all agents in a batch simultaneously.

### 5. Merge immediately on completion
As each agent finishes: review diff, commit on worktree branch, merge to master. Resolve conflicts by understanding both sides (keep both additions, combine logic).

### 6. Launch next batch
Once all agents in a batch are merged, launch the next batch. Overlap batches when safe (later batch agents don't conflict with still-running earlier agents).

### 7. Post-sprint integration check
After all batches merge, verify the combined system. This is the real QA gate.

## Anti-Patterns

- **Launching agents without a conflict analysis.** Two agents editing the same function = guaranteed merge conflict or silent logic error.
- **Vague prompts.** "Add some weapons" produces inconsistent results. "Add mudBomb with baseDamage 18, baseCooldown 2.8, type projectile_aoe, following the fireball pattern at line 1689" produces mergeable code.
- **Skipping the plan.** Parallelization amplifies plan quality. A good plan produces 4 clean merges. A bad plan produces 4 conflicting rewrites.
- **Treating merged code as verified.** Merged != tested. Post-merge QA is mandatory.
