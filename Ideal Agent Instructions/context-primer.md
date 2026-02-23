# Context Budget Primer (Navigation Phase)

## Core Principle
Context tokens are a hard budgeted resource. Use minimally.

## Mandatory Declarations
Every context insertion must declare:
1. **Purpose**: Why is this needed?
2. **Scope**: What operations require it?
3. **Expiration**: When can it be evicted?

## Prohibitions
- No inferred state (absence must remain explicit)
- No long-lived information in prompts if externally storable
- No conversational history unless compressed to decision summary
- No reasoning traces persisted unless strictly necessary
- No failed hypotheses/discarded plans/rejected code (unless explicitly promoted)

## Context Introduction Rules
- Context introduced ONLY when downstream operation explicitly requires it
- Store state in machine-readable form (not prose)
- Normalize to canonical schema before storage/retrieval
- Evict proactively (not just avoided)

## Phase Separation (Critical)
No single agent may reason, plan, remember, and code simultaneously.
- Navigation: reason + plan
- Execution: code only (from plan)
- Landing: verify + summarize

## High-Token Cognition
Reserved for irreversible decisions only.
- Architecture choices
- Interface contracts
- Breaking changes

**Full details:** `architecture/context-reference.md`
