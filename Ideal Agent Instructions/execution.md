# Execution Phase: Fly the Plane

**Load ONLY:** Current bead (scope + architecture_approach + dependency_rules)

## Phase Objective
Implement exactly what was approved in navigation. No scope expansion. No architecture changes.

## Execution Ritual

### 1. Bead Checkpoint
- Verify bead `status: implementing`
- Read `architecture_approach`, `trunks`, `branches`, `dependency_rules`
- If any field missing: STOP. Return to navigation phase.

### 2. Implementation Constraints (Non-Negotiable)
- Implement ONLY what bead scope specifies
- Follow dependency rules from navigation (no violations)
- Create only stub code for branches not in current scope
- No branch-to-branch imports (ever)
- All integration through trunk-defined interfaces

### 3. Incremental Verification
After each file or logical unit:
- Run tests (if they exist)
- Verify imports follow dependency graph
- Check for accidental coupling

Document verification in bead:
```yaml
verification_commands: ["pytest tests/", "mypy src/"]
verification_status: "passing|failing|not_run"
```

### 4. Scope Expansion Protocol
If user requests NEW functionality mid-execution:
- STOP implementation
- Update bead scope
- Set bead `status: planning`
- Return to navigation phase
- Inform user: "Scope change detected. Returning to navigation to ensure architecture accommodates new requirements."

### 5. Complexity Check (Internal)
Before presenting code, ask:
- Is this simpler than it could be?
- Are there abstractions that don't pull their weight?
- Can this be understood without comments?

If answer is "no" to any: simplify before presenting.

### 6. Completion Trigger
When scope is satisfied:
- Update bead `status: landing`
- List all modified files in bead
- Inform user: "Implementation complete. Say 'done' or 'complete' to enter landing phase."

## Anti-Patterns (Forbidden)
- Adding features not in bead scope
- Creating abstractions "for future extensibility" not needed now
- Violating dependency rules from navigation
- Re-architecting during implementation (return to navigation instead)
- Loading heavy planning context (primers, alternatives, etc.)

## Context Budget
This is a LOW-TOKEN phase (architecture already decided).
Load ONLY: bead content + files being modified.
No planning documents. No alternatives. Execute the plan.
