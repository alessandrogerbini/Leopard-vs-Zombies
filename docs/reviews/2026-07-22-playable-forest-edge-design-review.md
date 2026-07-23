# Playable Forest Edge Design Review

**Reviewed:** `docs/superpowers/specs/2026-07-22-playable-forest-edge-design.md`
**Date:** 2026-07-22
**Verdict:** **Not ready**

The specification chooses the right product direction and is substantially more than a cosmetic restyle: it replaces the debug panel with movement, spatial gathering, ranged eligibility, pursuit, contact damage, visible Three.js actors, and the existing quest reward loop. It is not ready to implement unchanged because its proposed scene dependency violates the repository's branch rule, its disposal contract conflicts with shared cached Three.js resources, and several state/input/test contracts still permit materially different implementations.

## Strengths

- **It addresses the reported failure directly.** Goal, Root Cause, Player Experience, and Acceptance Criteria require a real spatial encounter, not merely a prettier `drawZone()` panel. The diagnosis matches `js/game-rpg.js:281-309`, which builds only a floor and cube, `js/game-rpg.js:592-623`, which exposes global attack/gather/assist actions, and `js/rpg/hud-rpg.js:592-660`, which paints the opaque letter-block arena.
- **The playable loop is observable and appropriately small.** The two Wood piles, three tutorial zombies, proximity-only interactions, visible progress, death/respawn, reward banner, and Hub return create a complete first-quest loop. Scope explicitly excludes later playable zones and unrelated systems.
- **Most responsibility boundaries are pointed in the right direction.** Pure combat owns deterministic simulation; `game-rpg.js` owns input, persistence, composition, and runtime synchronization; the HUD consumes a supplied view; and mesh positions are not persisted. That fits the current orchestrator pattern in `js/game-rpg.js:9-42,159-216,311-329`.
- **The proposed tests target the central regressions.** The plan calls for out-of-range misses, proximity gathering, normalized movement, contact-only damage, immutability, shortcut removal, cleanup, full RPG suites, and mode regressions.
- **Failure behavior is honest.** The Three.js-unavailable path explicitly refuses to relabel the static placeholder as playable content.

## Findings

### Critical

#### C1. The scene module introduces a forbidden branch-to-branch dependency

**Spec sections:** Architecture / Scene lifecycle (`js/rpg/forest-edge-scene.js`), especially the statement that it imports the shared voxel `box()` helper; Architecture / Orchestration.

**Repository evidence:** The project rule in `AGENTS.md` and `Ideal Agent Instructions/README.md` is “No branch-to-branch imports.” The proposed consumer is under `js/rpg/`, while the helper is owned by the separate `js/3d/` branch (`js/3d/player-model.js:19`; `js/3d/utils.js:1-13,79-84`). `js/game-rpg.js` is the composition trunk and already imports RPG branches at `js/game-rpg.js:9-42`.

**Why this blocks implementation:** The approved architecture says both that the scene branch imports a sibling branch and that sibling imports are forbidden. An implementer cannot satisfy both. Moving the import through the orchestrator, injecting a construction dependency, or giving the RPG scene its own owned primitive factory are different ownership designs and must be chosen in the spec.

#### C2. The proposed disposal contract is incompatible with the helper it says to reuse

**Spec sections:** Architecture / Scene lifecycle; Architecture / Orchestration; Lifecycle and Failure Handling.

**Repository evidence:** `js/3d/utils.js:15-21,32-50,79-84` returns globally cached, shared geometries and materials. Those resources are also used by the selected animal model (`js/3d/player-model.js:19,86-103`). The spec simultaneously requires `disposeForestEdgeScene()` to dispose scene-owned geometry/materials, while the selected player model is owned outside that scene state. Current full-runtime disposal traverses the entire scene only at final cleanup (`js/game-rpg.js:398-415`); zone-level disposal is a new, narrower lifetime.

**Why this blocks implementation:** Per-zone traversal disposal can invalidate cached resources still referenced by the player model or retained for a repeated launch. Avoiding disposal leaks resources instead. The spec also never assigns zone-exit removal/disposal or reuse of the orchestrator-owned player model, so re-entry can duplicate it. Resource allocation, ownership, and lifetime need one coherent policy before a scene API is approved.

### Important

#### I1. Spatial semantics and kid-friendly tuning are under-specified

**Spec sections:** Player Experience steps 5-7; Architecture / Pure simulation; Architecture / Orchestration.

**Repository evidence:** Gathering nodes already have radii (`js/rpg/constants-rpg.js:274-286`) and tutorial zombies have radii and attack values (`js/rpg/constants-rpg.js:321-325`), but the proposed combat state adds separate `attackRange` and `contactRange` without a player radius or a rule for combining radii. No player speed, zombie speed, stop distance, center-versus-surface distance rule, or deterministic nearest-target tie-break is given. The two initial zombie/node pairs are only about 0.67 and 0.36 world units apart based on their content coordinates, so the chosen rule materially changes first-contact difficulty.

**Impact:** Implementations can all claim conformance while gathering at different distances, attacking different enemies, stacking different amounts of contact damage, or producing substantially different difficulty. Define planar distance math, range/radius usage, movement speeds, target tie-breaks, enemy stopping/overlap behavior, and whether a contact timer resets immediately when no enemy is in range. Also define whether multiple touching zombies stack damage or share the existing 14-damage cadence.

#### I2. Death is preserved numerically but respawn is not spatially defined

**Spec sections:** Player Experience step 7; Architecture / Pure simulation; Lifecycle and Failure Handling; Pure tests.

**Repository evidence:** Current death handling restores HP, clears the contact timer, starts 1.25 seconds of grace, and applies the ingredient penalty (`js/rpg/combat-rpg.js:98-106`), but there is currently no player position to reset. The new state adds one, yet the spec never says where the player respawns or what happens to nearby enemies.

**Impact:** A player may revive inside an enemy pack and be hit as soon as grace expires, which is observable and not kid-friendly. Specify the respawn coordinate, enemy reset/separation policy, retained defeated-enemy/node progress, contact-timer reset, and the exact grace interval. Add a test that death changes the spatial state as specified and that no damage occurs during grace.

#### I3. Save and screen-transition invariants need a single explicit contract

**Spec sections:** Data Flow; Lifecycle and Failure Handling; Acceptance Criteria.

**Repository evidence:** Node visibility currently comes from persisted node IDs, not quest progress (`js/rpg/inventory.js:33-42`), while the spec only defines progress-based reconciliation for defeated zombies. Existing tests can create an active `heroSignup` save with quest progress independent of node IDs (`test-results/test-rpg-alpha-data-flow.mjs:126-148`). Combat creation must also seed both individual `defeated` flags and the aggregate `defeatedEnemies` counter, which currently starts at zero (`js/rpg/combat-rpg.js:15-28`). Finally, entering a zone writes `currentZone` (`js/game-rpg.js:665-673`), but Escape and quest completion only change `screen` (`js/game-rpg.js:438-447,738-777`), leaving the persisted zone meaning unclear.

**Impact:** A reload can show progress that disagrees with visible nodes/counters, and “return to Hub” can still save `currentZone: forestEdge`. State which fields are canonical, how invalid/out-of-range progress is clamped, how collected-node IDs and Wood progress are reconciled, what persists across death/re-entry, and when `currentZone` becomes `hub`. Test partial saves at Wood 3/5 and Zombies 1/3, completion/reload, and Escape/re-entry without duplicated ingredients or enemies.

#### I4. Behavior outside an active `heroSignup` quest is undefined despite being reachable

**Spec sections:** Scope / Included; Player Experience; Architecture / Orchestration; Explicit exclusions.

**Repository evidence:** Forest Edge is unlocked by default (`js/rpg/constants-rpg.js:15-20`) and can be entered without an active quest through the Hub shortcut (`js/game-rpg.js:506-509`) or World Map (`js/game-rpg.js:571-588`). Current combat and gather event handlers write `tutorialZombies` and `wood` onto whichever quest happens to be active (`js/game-rpg.js:699-727`) rather than gating `heroSignup` and `forestEdge`.

**Impact:** The “active `heroSignup` only” scope does not say what a no-quest, completed-quest, or later-quest visit renders, nor whether enemies/nodes can pollute later quest progress. Define the reachable fallback explicitly and gate first-quest progress by both quest and zone. This is a scope clarification, not a request to implement later quests.

#### I5. Test-assist gating is not concrete enough to be safe or independently testable

**Spec sections:** Scope / Included; Player Experience shortcut removal; Architecture / Orchestration; Browser tests.

**Repository evidence:** `window.__rpgDebug` is created in every browser session (`js/game-rpg.js:219-259`), so its presence cannot be the gate. The RPG browser harness injects `window.__lvzTestState` on every test page (`test-results/test-rpg-alpha-mode-flow.mjs:82-105`), and the later-quest case depends on `E` assistance (`test-results/test-rpg-alpha-mode-flow.mjs:492-513`). If mere injected-state presence enables assistance, the same harness cannot prove “normal-play `E` does nothing.”

**Impact:** Define a named, explicit opt-in boolean/capability that defaults absent/false and is enabled only for the later-quest fixture. State whether test assistance may complete `heroSignup` or only seed a completed first-quest fixture. Test the same `E` press with the capability disabled and enabled; never gate on `__rpgDebug` or generic test-state existence.

#### I6. The selected-animal animation contract does not match the actual reusable API yet

**Spec sections:** Visual Design; Architecture / Orchestration.

**Repository evidence:** `buildPlayerModel(animalId, scene)` adds a model and returns its parts (`js/3d/player-model.js:76-87,486-538`). `animatePlayer()` does not consume the proposed combat summary; it consumes a Survivor-shaped state with `playerX/playerY/playerZ`, death, flight, maneuver, and attack-animation fields (`js/3d/player-model.js:541-708`).

**Impact:** “Owns model creation and animation” leaves implementers to either pass an incompatible view, create a fragile partial adapter, or duplicate animation. Specify whether RPG uses only `buildPlayerModel()` plus a small RPG-owned walk/orientation routine, or define the exact read-only adapter supplied to `animatePlayer()`. Include player-model removal/reuse in the lifetime contract from C2.

#### I7. Input, transition, resize, and failure-path lifecycle coverage is incomplete

**Spec sections:** Architecture / Orchestration; Lifecycle and Failure Handling; Browser tests.

**Repository evidence:** The current runtime has only a keydown listener (`js/game-rpg.js:426-663,940-944`) and cleanup removes no keyup or blur listener (`js/game-rpg.js:367-395`). Zone exits occur through Escape, inventory, quest completion, and full cleanup (`js/game-rpg.js:438-447,624-629,738-777`), but the test list only names cleanup/repeated launches generally. Resize currently changes both canvases and the camera then redraws (`js/game-rpg.js:108-121`), and missing Three.js currently causes `initRuntimeScene()` to return silently (`js/game-rpg.js:281-283`).

**Impact:** Define clearing held inputs on every zone exit, window blur/visibility loss, and cleanup; define movement-key `preventDefault` only while zone play owns those keys; and specify one-shot attack consumption across repeat keydowns. Cover every Forest Edge exit path, resize-with-state-preservation, lost-focus recovery, repeat suppression, and the Three.js-unavailable Escape route. A centralized transition contract is preferable to relying on every direct `screen = ...` assignment to remember disposal.

#### I8. The browser plan is directionally strong but not measurable enough to catch visual-only regressions

**Spec sections:** Visual Design; Browser tests; Acceptance Criteria.

**Repository evidence:** Existing browser helpers only count colored HUD pixels (`test-results/test-rpg-alpha-mode-flow.mjs:131-157`), which proves that the HUD is nonblank, not that it is transparent. The planned “nonblank Three.js scene” can pass with the existing floor/cube (`js/game-rpg.js:281-309`) even if the animal, nodes, zombies, mesh synchronization, and camera follow are missing. Existing responsive coverage exercises the Hub, not the Forest Edge overlay (`test-results/test-rpg-alpha-mode-flow.mjs:541-584`).

**Impact:** Give the tests objective observables: a maximum opaque-HUD coverage or known transparent arena sample regions; scene/debug counts and visibility for one selected-animal model, two nodes, and three zombies; mesh positions matching simulation; camera target/position changing with the player; no HP loss while distant; no gathering while distant; resize preservation; and readable, non-overlapping zone overlays at landscape and portrait sizes. Keep the existing full mode-regression suite.

### Minor

#### M1. Test-first sequencing is assumed rather than required

**Spec sections:** Testing Strategy.

The plan names appropriate tests but does not state that each behavior change begins with a failing focused test, despite the project constraint that all behavior changes are test-first. Add a one-sentence sequencing rule and identify the focused pure/browser cases that must fail before implementation.

#### M2. Feedback behavior is described visually but has no acceptance contract

**Spec sections:** Scope / Included; Visual Design; Acceptance Criteria.

“Contextual pickup/attack feedback” is not defined for a miss, successful hit, Wood pickup, damage, or respawn. A bounded v2 should name short messages/indicators and their approximate lifetime, then verify at least miss, pickup, and respawn feedback. This would make the loop more legible for a young player without adding mechanics.

#### M3. Pure transition return shapes and invalid time inputs are implicit

**Spec sections:** Architecture / Pure simulation.

Existing combat functions return structured `{ state, save, events, ... }` objects (`js/rpg/combat-rpg.js:59-79,81-110`), but `moveCombatPlayer()` has no stated return shape. State its exact return value and define behavior for zero, negative, non-finite, and excessively large `dtSeconds`; the frame loop already caps normal frame time at 0.1 seconds (`js/game-rpg.js:311-314`).

## Required Revisions

1. **Resolve scene dependency and resource ownership.** Choose a no-sibling-import composition path; assign ownership of scene objects, the selected player model, cached versus owned resources, zone exit, re-entry, and full cleanup.
2. **Add a compact simulation contract table.** Define player/enemy speeds, player radius if used, exact planar distance formulas, node/attack/contact thresholds, target tie-breaking, contact cadence/stacking/reset, dt validation, and pure-function return shapes.
3. **Add a death and transition table.** Cover enter, Escape, inventory, quest completion, death, re-entry, resize, missing Three.js, and full cleanup, including screen, `currentZone`, held inputs, scene/player lifetime, save-write timing, spawn position, and grace behavior.
4. **Define save normalization.** State canonical fields and deterministic reconciliation for Wood nodes and defeated zombies, including counter seeding, clamping, partial-save reload, and preservation through death/re-entry.
5. **Guard scope and progress explicitly.** Define Forest Edge behavior without active `heroSignup`, after completion, and while a later quest is active; first-quest events must not write unrelated quest progress.
6. **Name the test-assist capability.** Make it absent/false in normal play and opt-in only in the later-quest fixture; specify the disabled/enabled assertions.
7. **Specify the player-model integration.** Choose an RPG animation path or document the exact adapter and lifetime contract for the existing player-model API.
8. **Make browser acceptance measurable and test-first.** Add failing-first checks for HUD alpha coverage, actual actor/node visibility and synchronization, camera follow, repeat/blur behavior, every exit path, partial save/reload, resize, Three.js failure, portrait/landscape zone layout, and the existing mode regressions.

## Explicit Scope Guard

These revisions must not expand implementation beyond the playable `heroSignup` encounter at Forest Edge. Do not make Rabbit Village or later zones playable; do not add weapons, drops, audio, procedural terrain, bosses, new Hub/map/save UX, click/gamepad controls, or new content. Later quests may retain only the narrowly gated automated test assist needed by the existing regression chain. Architecture and test clarification for reachable non-`heroSignup` Forest Edge visits is required solely to prevent progress corruption and placeholder misrepresentation.

## V2 Acceptance Checklist

- [ ] Forest Edge shows a real Three.js clearing with exactly one selected-animal model, two Wood nodes, and three spatial tutorial zombies beneath a measurably transparent HUD.
- [ ] WASD/arrows move at a defined normalized speed; camera and player mesh follow the simulation; repeat/blur/exit handling cannot leave stuck movement or multi-fire attacks.
- [ ] Wood collection, attacks, pursuit, and contact damage use one documented planar range/radius rule and deterministic target selection.
- [ ] Distant gather/attack/contact attempts have no gameplay effect; normal `G` and `E` cannot advance the quest.
- [ ] Death applies the existing penalty, respawns at the specified safe location, preserves completed objectives, and enforces tested grace time.
- [ ] Partial save reload produces matching Wood-node visibility, zombie visibility, counters, inventory/progress, and no duplicate rewards.
- [ ] Completion atomically persists reward/progress/current-zone state, disposes Forest Edge resources once, and returns to Hub with the existing banner.
- [ ] No `js/rpg/` branch imports `js/3d/`; resource ownership is safe across Escape, inventory, completion, title cleanup, resize, and repeated launches.
- [ ] Test assistance requires the explicit test-only capability and is proven disabled in a normal fixture.
- [ ] Focused tests are written failing-first, then the full RPG data/browser, responsive, 2D Classic, 3D Survivor, and repeated-mode regression suites pass.
