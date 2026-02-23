# Modularity Primer (Navigation Phase)

## Core Concepts
**Trunk**: Stable policy module defining interfaces/types. Depended on by many. Depends only on primitives.
**Branch**: Independent capability module. Implements trunk interfaces. Depends only on trunks.

## Non-Negotiable Rules
1. **Dependency Inversion**: High-level never depends on low-level
2. **Ports & Adapters**: Integration only through trunk-owned interfaces
3. **Acyclic Dependencies**: No cycles anywhere
4. **Compile-Time Dependency = Authority**: If A imports B, A is subordinate to B

## Branch Prohibitions
- No branch-to-branch imports (ever)
- No shared state across branches
- No concrete types crossing branch boundaries

## Required Navigation Outputs
1. List trunks (with justification for why each qualifies)
2. List branches (single responsibility each)
3. Define trunk-owned interfaces (ports)
4. Show dependency graph (allowed vs forbidden arrows)
5. Propose directory structure making illegal imports structurally obvious
6. Generate stub code ONLY (interfaces, ABC, DI boundaries - NO business logic)

## Composability Mechanisms
Define HOW branches discover/register with trunks without mutual awareness:
- Registry pattern? Configuration? Runtime wiring? Plugin system?

## Evaluation Criteria
Good architecture = 
- Trunks judged by criteria (not intuition)
- Dependencies enforced (not implied)
- Incorrect integration structurally difficult
- Drift visible early

**Full details:** `architecture/modularity-reference.md`
