# Agent Coordination System

## Welcome to Leopard vs Zombies!

This is a **vibe code** project built by **Uncle Sandro** (prompt interpreter) and his 7-year-old nephew **Julian** (creative visionary). Julian dreams up the vision — the animals, the weapons, the zombie chaos, the explosions, ALL of it. The mouth-made sound effects? That's him too. Sandro translates Julian's ideas into prompts, and agents like you bring them to life.

This project is a dream come true for both of them. **The vibe is fun.** Every agent that works here is part of the team and part of the fun. We always welcome recommendations that drive fun — if you see an opportunity to make something more exciting, more satisfying, more *Julian-would-lose-his-mind-cool*, speak up! Just keep it in scope and flag it as a suggestion.

Build with joy. Ship with care. Make a kid's dream game real.

## Phase Routing (Trigger Words → Documents)
- **Planning**: "plan", "architect", "design", "alternatives" → `docs/navigation.md`
- **Implementing**: "implement", "build", "code", "execute" → `docs/execution.md`
- **Landing**: "done", "complete", "finish", "ready" → `docs/landing.md`
- **Parallelized Sprint**: "parallel", "spin up agents", "sprint" → `parallelization.md`
- **Auto-detect**: Read bead `status` field if ambiguous

## Execution Model Selection
When a navigation phase produces implementation tasks:
- **1-3 tasks**: Serial execution via `execution.md` (single agent, sequential)
- **4+ independent tasks**: Parallelized sprint via `parallelization.md` (worktree agents, batched by dependency)

The orchestrating agent builds a conflict matrix, batches tasks, writes detailed sub-agent prompts, and manages merges. Sub-agents still follow `execution.md` rules individually.

## Effort Estimation
- **Implementation time** scales sub-linearly with parallelism (more tasks ≈ same wall-clock time)
- **Verification time** scales with integration surface area and is human-speed
- Budget 80% of calendar time for QA/testing, 20% for implementation
- See `parallelization.md` for the full protocol and anti-patterns

## Bead Mandate (Non-Negotiable)
ALL work requires a bead. Beads are the source of truth.

**Minimal Required Schema:**
```yaml
id: string
status: [planning|implementing|landing|blocked|complete]
scope: string  # one-sentence task description
```

If no bead exists for current work: STOP. Create one. Set `status: planning`.

## Universal Architecture Rules (Always Apply)
1. **Dependency Inversion**: High-level policy never depends on low-level details
2. **No Branch-to-Branch Imports**: Modules communicate only through trunk interfaces
3. **Acyclic Dependencies**: No circular dependencies at any level
4. **Context as Budgeted Resource**: Load only what current phase requires

## Scope Expansion Protocol
If user requests scope change mid-phase:
- Update bead scope
- Return to `status: planning`
- Re-run navigation phase

## Phase Documents
- `docs/navigation.md` - loads `modularity-primer.md` + `context-primer.md`
- `docs/execution.md` - loads only current bead scope
- `docs/landing.md` - completion ritual

Load phase doc immediately based on trigger or bead status.
