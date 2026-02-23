# Landing Phase: Complete the Mission

**Load ONLY:** Current bead + modified files

## Phase Objective
Verify completeness, document changes, identify risks, declare merge-readiness.

## Mandatory Pre-Flight: Linus-Style Code Review
Before presenting output, conduct hostile internal review.
Assume code is incorrect or overcomplicated.

**Answer these questions internally (do not present unless issues found):**

1. **Complexity Audit**
   - What is the most complex part of this change?
   - Can it be simplified or deleted?

2. **Abstraction Justification**
   - List any new abstractions (helpers, layers, interfaces)
   - For each: justify why it's necessary NOW (not hypothetically later)

3. **Data Flow Clarity**
   - Can a competent developer understand flow without comments?
   - Identify any "clever" logic that could confuse readers

4. **Diff Smell Test**
   - Is this change larger than it needs to be?
   - What could be removed?

5. **Simpler Alternative**
   - Describe the simplest possible solution that could work
   - Explain why it was not chosen

**If issues found:** Revise code before proceeding to landing ritual.

## Landing Ritual (Present to User)

### 1. Scope Confirmation
- Restate original task in ONE sentence (from bead scope)
- Confirm explicitly: "Scope fully satisfied" OR "Partially satisfied: [what's missing]"

### 2. Change Summary
Bullet list format:
- `path/to/file.py` - [one-line purpose of change]
- `path/to/other.py` - [one-line purpose of change]

### 3. Non-Changes (Explicit)
List areas intentionally NOT modified and why:
- "Did not refactor X because [reason]"
- "Did not add Y because [out of scope]"

### 4. Verification Status
Commands run:
- `pytest tests/` - [passing|failing|not run]
- `mypy src/` - [passing|failing|not run]

If not run, state reason:
- "No tests exist yet"
- "Linting not configured"

Assumptions made:
- "Assumed X behaves as Y"
- "Assumed database schema unchanged"

### 5. Risks / Follow-Ups
Known issues for future work:
- Edge cases not handled: [list]
- TODOs added: [list]
- Deferred work: [list]

### 6. Bead Update
Update bead with:
```yaml
status: complete|blocked
files_modified: [list]
verification_status: "[summary]"
risks: "[summary]"
ready_to_merge: true|false
block_reason: "[if blocked]"
```

### 7. Ready-to-Merge Declaration
State ONE of:
- ✅ "Ready to merge"
- ⛔ "Blocked: [clear reason]"

## Post-Landing
**No further output** unless user requests changes.

If user requests changes:
- Assess scope: minor fix vs new feature
- Minor fix: Stay in landing, iterate
- New feature: Update bead scope, return to navigation

## Anti-Patterns (Forbidden)
- Introducing new features during landing
- Expanding scope beyond original request
- Refactoring unrelated code
- Stylistic changes not requested
- Verbose explanations (be concise)

## Context Budget
This is a MEDIUM-TOKEN phase (verification + documentation).
Load: bead + modified files only.
No planning docs. No architecture alternatives.
