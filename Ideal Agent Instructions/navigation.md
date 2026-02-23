# Navigation Phase: Chart the Course

**Auto-load:** `modularity-primer.md` + `context-primer.md`

## Phase Objective
Define architecture and approach BEFORE writing code. Maximize post-hoc composability.

## Navigation Ritual (Execute in Order)

### 1. Bead Checkpoint
- Verify bead exists with `status: planning`
- Read bead `scope` field
- If scope ambiguous: clarify with user, update bead

### 2. Architecture Analysis
Read modularity-primer.md and answer:
- What are the **trunks** (stable policy modules)?
  - Justify why each qualifies as a trunk
  - What CANNOT live in each trunk?
- What are the **branches** (independent capabilities)?
  - Single responsibility per branch
  - What trunk interfaces does each implement?
- What are the **trunk-owned ports** (interfaces)?
  - Input/output contracts
  - Stability expectations

### 3. Alternative Approaches (Minimum 2)
Generate at least TWO distinct architectural approaches:

**For each approach, specify:**
- Trunk/branch decomposition
- Dependency graph (allowed arrows only)
- Composability mechanism (how branches discover/wire to trunks)
- Directory structure
- Key tradeoffs

**Present as:**
```
Approach A: [name]
- Trunks: [list]
- Branches: [list]
- Composability: [mechanism]
- Tradeoffs: [pros/cons]

Approach B: [name]
- Trunks: [list]
- Branches: [list]
- Composability: [mechanism]
- Tradeoffs: [pros/cons]
```

### 4. Recommendation
State which approach you recommend and why.
- Explicit reasoning
- What criteria matter most for this task?
- What's being optimized for? (extensibility, simplicity, testability, etc.)

### 5. User Decision Point
**STOP.** Wait for user to:
- Approve recommended approach
- Select alternative approach
- Request additional alternatives
- Provide constraints that require re-analysis

Do NOT proceed to implementation without explicit approval.

### 6. Bead Update (After Approval)
Update bead with:
```yaml
status: implementing
architecture_approach: "[chosen approach name]"
trunks: [list]
branches: [list]
dependency_rules: "[key constraints]"
```

### 7. Phase Transition
Inform user: "Architecture locked. Ready to implement. Say 'implement' or 'build' to proceed to execution phase."

## Anti-Patterns (Forbidden)
- Jumping to code before architecture discussion
- Presenting only one approach
- Making architecture decisions without user approval
- Storing implementation details in this phase (stubs only)
- Loading execution-phase context

## Context Budget
This is a HIGH-TOKEN phase (architecture is irreversible).
Load primers fully. Reason deeply. Present alternatives clearly.
Execution phase will be LOW-TOKEN by contrast.
