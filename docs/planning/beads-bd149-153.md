# Beads: BD-149 through BD-153 — Quality Sweep

**Date:** 2026-02-24
**Source:** Uncle Sandro's quality sweep request
**Execution model:** 5 parallel research agents → consolidated bead writing → single sprint

---

## BD-149: Readability audit — can a 7-year-old read the screen?

**Category:** UX — Kid Readability
**Priority:** P1

### Description
Have an agent conduct a thorough readability audit of the game from a kid's perspective. Analyze HUD layout, font sizes, color contrast, information density, floating text readability, minimap clarity, and visual noise. The agent should use the existing screenshots and read all HUD/rendering code to identify every readability issue.

### Deliverable
`docs/reviews/readability-audit.md` — Findings with specific, actionable recommendations.

---

## BD-150: Linus-style code review

**Category:** Code Quality
**Priority:** P2

### Description
Have an agent conduct an aggressive, Linus Torvalds-style code review of `js/game3d.js` and all `js/3d/` modules. Focus on: potential crashes, memory leaks, logic bugs, performance anti-patterns, dead code, inconsistent patterns, race conditions, and anything that would make Linus say "this is garbage." Be brutally honest but constructive.

### Deliverable
`docs/reviews/code-review-2.md` — Findings organized by severity (Critical/High/Medium/Low).

---

## BD-151: Performance deep-dive — get ahead of FPS issues

**Category:** Performance
**Priority:** P1

### Description
XP gems and zombie waves have already caused FPS drops. Have an agent analyze the entire rendering pipeline, entity counts, draw call patterns, geometry/material allocation, update loop complexity, and identify every potential performance bottleneck. Include specific Three.js optimization techniques (instanced meshes, geometry merging, LOD, frustum culling, object pooling).

### Deliverable
`docs/reviews/performance.md` — Prioritized optimization recommendations with estimated FPS impact.

---

## BD-152: File and folder cleanup

**Category:** Housekeeping
**Priority:** P3

### Description
The project has accumulated planning docs, old screenshots, orphaned files, and potentially disorganized folder structure. Have an agent audit the entire file tree and recommend: files to remove, folders to reorganize, naming conventions to standardize. The cleanup must be SAFE — nothing important gets deleted.

### Deliverable
`docs/reviews/cleanup-recommendations.md` — Safe removal list + reorganization plan.

---

## BD-153: Documentation audit and update plan

**Category:** Documentation
**Priority:** P3

### Description
README.md, agent instructions, and planning docs may be out of date after this sprint blitz (BD-134 through BD-148 shipped a LOT). Have an agent check all documentation against the actual codebase and identify stale/wrong/missing info.

### Deliverable
`docs/reviews/documentation-audit.md` — Update recommendations.

---

## Execution Strategy

### Stage 1: Research (5 parallel agents)
All 5 agents are read-only. Zero conflict risk. Launch simultaneously.

### Stage 2: Bead Writing (1 consolidation agent)
ONE agent reads ALL 5 review documents and writes a unified set of beads, properly numbered and conflict-analyzed. This prevents duplicate/conflicting recommendations.

### Stage 3: Sprint Planning
Plan a single sprint from the consolidated beads with proper batching.

### Stage 4: Implementation
Launch batched implementation agents per the sprint plan.
