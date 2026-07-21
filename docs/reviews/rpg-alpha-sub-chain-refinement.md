# RPG Alpha Sub-Chain Refinement Review

Date: 2026-07-21

Scope: Refinement pass on `docs/superpowers/plans/2026-07-21-rpg-alpha-state.md` before starting RPG alpha implementation.

Bead: `Leopard vs Zombies-agy.1`

## Review Chain

Three read-only subagents reviewed the plan from independent angles:

- Architecture and mode integration.
- RPG product completeness and alpha quality.
- Testability, TDD readiness, and QA evidence.

## Accepted Findings

- Added Sunny Meadow to the alpha zone contract and world-travel rubric.
- Clarified RPG save flow: `game.js` passes animal/canvases only; `game-rpg.js` owns save select and starts runtime after slot selection.
- Added a strict alpha quest unlock chain and persistent world-state reactions after reload.
- Added recipe costs, ingredient sources, gear effects, and a required Banana Cannon payoff.
- Removed the risky RPG-to-`js/3d/*` import assumption and required RPG-local model factories unless shared 3D model code is promoted into a neutral trunk later.
- Expanded `GAME_MODES` from ID-only descriptors to catalog-owned labels, flow IDs, card copy, and palettes.
- Added external-runtime ownership rules for idempotent return, cleanup, and repeated launches.
- Added a TDD contract, Puppeteer-only browser test standard, server wrapper, and per-milestone failing-test cases.
- Added a rubric evidence matrix so final checkbox closure requires linked proof in `docs/reviews/rpg-alpha-qa-report.md`.
- Added Beads sprint children for progression/reputation/journal/rewards and readability/audio/feel so implementation ownership matches the plan.

## Tracker Changes

Added:

- `Leopard vs Zombies-agy.2` - `Implement RPG progression reputation journal and rewards`.
- `Leopard vs Zombies-agy.3` - `Implement RPG readability audio and feel pass`.

Updated chain:

```text
Leopard vs Zombies-agy.1
-> Leopard vs Zombies-1xz
-> Leopard vs Zombies-1fl
-> Leopard vs Zombies-mwm
-> Leopard vs Zombies-18m
-> Leopard vs Zombies-agy.2
-> Leopard vs Zombies-l6c
-> Leopard vs Zombies-agy.3
-> Leopard vs Zombies-8rr
```

## Deferred Findings

- A shared neutral 3D model trunk may be worthwhile later, but alpha can proceed with RPG-local model factories to avoid branch-to-branch coupling.
- Full Playwright migration is not needed; the plan standardizes on existing `puppeteer` from `package.json`.
