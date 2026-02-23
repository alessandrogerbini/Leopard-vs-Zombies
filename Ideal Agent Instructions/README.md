# Universal Agent Coordination System

A context-efficient, phase-driven workflow for agentic development.

## Structure

```
project/
├── agents.md                      # 38-line router (phase detection + bead mandate)
├── modularity-primer.md           # Dense architecture principles
├── context-primer.md              # Dense context management principles
├── docs/
│   ├── navigation.md              # Planning phase (architecture-first)
│   ├── execution.md               # Implementation phase (scope-locked)
│   └── landing.md                 # Completion phase (verification ritual)
└── architecture/
    ├── modularity-reference.md    # Full design guidelines
    └── context-reference.md       # Full context rules
```

## How It Works

### Phase 1: Navigation (High-Token, Architecture-First)
**Trigger words:** "plan", "architect", "design", "alternatives"

1. Agent loads `navigation.md` + primers
2. Analyzes task through trunk/branch lens
3. Proposes 2+ alternative architectures with tradeoffs
4. Waits for explicit user approval
5. Updates bead with chosen approach
6. Transitions to execution

**Context loaded:** ~600-800 lines (primers + navigation ritual)

### Phase 2: Execution (Low-Token, Scope-Locked)
**Trigger words:** "implement", "build", "code", "execute"

1. Agent loads ONLY current bead (scope + architecture)
2. Implements exactly what was approved (no scope expansion)
3. Incrementally verifies against dependency rules
4. Updates bead with modified files
5. Transitions to landing

**Context loaded:** ~200-300 lines (bead + execution rules)

### Phase 3: Landing (Medium-Token, Verification)
**Trigger words:** "done", "complete", "finish", "ready"

1. Agent performs internal Linus-style code review
2. Simplifies before presenting (if needed)
3. Documents changes, non-changes, risks
4. Updates bead with verification status
5. Declares ready-to-merge or blocked

**Context loaded:** ~400-500 lines (bead + landing ritual + modified files)

## Bead Schema (Canonical)

```yaml
# Required (enforced by agents.md)
id: string
status: planning|implementing|landing|blocked|complete
scope: string  # one-sentence task description

# Phase-specific (populated by phase docs)
architecture_approach: string      # navigation.md
trunks: list                       # navigation.md
branches: list                     # navigation.md
dependency_rules: string           # navigation.md
files_modified: list               # execution.md
verification_status: string        # landing.md
risks: string                      # landing.md
ready_to_merge: bool              # landing.md
```

## Scope Expansion Protocol

If user requests new functionality mid-execution:
1. Agent STOPS implementation
2. Updates bead scope
3. Sets `status: planning`
4. Returns to navigation phase
5. Re-architects to accommodate new requirements

## Key Design Principles

### Modularity (Always)
- Trunks define interfaces, branches implement
- No branch-to-branch imports (ever)
- Dependency inversion at all levels
- Composability mechanized (not aspirational)

### Context Budget (Always)
- Load only what current phase requires
- Store state externally (beads), not in prompts
- No reasoning traces unless necessary
- Evict proactively

### Phase Separation (Always)
- Navigation: reason + plan (high-token)
- Execution: code only (low-token)
- Landing: verify + document (medium-token)
- No agent does all three simultaneously

## Usage in New Projects

1. Copy all files to project root
2. Create first bead with `status: planning`
3. Say "plan [task]" to enter navigation phase
4. Agent guides through architecture, then execution, then landing

## Token Efficiency Comparison

**Monolithic agents.md approach:** ~1000+ lines loaded per task
**This system:**
- Planning: ~700 lines
- Execution: ~250 lines
- Landing: ~450 lines

**Average savings:** 40-60% context reduction across project lifecycle
