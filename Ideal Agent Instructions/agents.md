# Agent Coordination System

## Phase Routing (Trigger Words → Documents)
- **Planning**: "plan", "architect", "design", "alternatives" → `docs/navigation.md`
- **Implementing**: "implement", "build", "code", "execute" → `docs/execution.md`
- **Landing**: "done", "complete", "finish", "ready" → `docs/landing.md`
- **Auto-detect**: Read bead `status` field if ambiguous

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
