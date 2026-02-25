# BD-246: Playwright MCP investigation — 10 automated test areas for improvement discovery

**Category:** QA / Automated Testing / Discovery
**Priority:** P1-High
**Deliverable:** `docs/playwright-mcp-options.md` → `docs/playwright-mcp-options-v2.md` → beads → execution

## Description

Use Playwright browser automation to systematically investigate 10 different areas of the game, discovering bugs, UX issues, balance problems, and improvement opportunities that manual playtesting might miss.

## Pipeline

1. Agent identifies 10 investigation areas → writes `docs/playwright-mcp-options.md`
2. Second agent reviews, rank-orders, improves → writes v2
3. Third agent converts top investigations into beads
4. Investigations execute sequentially, each yielding new beads
5. New beads get sprint-planned and executed
