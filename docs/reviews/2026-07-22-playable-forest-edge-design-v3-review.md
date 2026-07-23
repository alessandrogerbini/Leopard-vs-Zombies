# Playable Forest Edge Design v3 Review

**Reviewed:** `docs/superpowers/specs/2026-07-22-playable-forest-edge-design-v3.md`  
**Compared with:** `docs/superpowers/specs/2026-07-22-playable-forest-edge-design-v2.md` and `docs/reviews/2026-07-22-playable-forest-edge-design-review.md`  
**Date:** 2026-07-23  
**Verdict:** **Not ready**

V3 selects the right camera direction and is materially closer to the human requirement than v2. It correctly identifies Survivor as an elevated oblique **perspective** view rather than mathematical isometric projection, copies the actual base lens and follow constants, preserves screen-readable controls, removes the opaque arena from the intended presentation, and adds a substantially better forest-composition contract.

The design is not ready for human approval yet because its central visual regression gate still proves mostly hidden scene state rather than the rendered result. A build can satisfy the proposed tags, frustum checks, triangle counts, projection math, and shadow flags while still showing an unreadable, flat, low-contrast, or effectively invisible Forest Edge. Lighting, projected actor scale, and all-position occlusion also need tighter acceptance contracts. There is additionally one technical error in the “mathematical isometric” alternative and one small overstatement in the claimed exact Survivor baseline.

## Survivor camera source check

| Claim | Source-checked behavior | Assessment |
|---|---|---|
| Projection | `js/game3d.js:1036` creates `THREE.PerspectiveCamera(50, aspect, 0.1, 150)`. | Correct. |
| Base offsets | `js/3d/constants.js:25-30` defines `+18Y`, `+14Z`, and `0.05`; `js/game3d.js:8634-8643` uses them in normal follow. | Correct as the unscaled base policy. |
| Rest elevation and bearing | At a converged base offset, `atan2(18, 14) = 52.125°` above the ground plane. Zero X offset means the horizontal bearing is world `-Z`, not 45° across X/Z. | Correct. |
| Follow and look-at | `js/game3d.js:8640-8643` lerps camera position by `0.05` each animation frame and immediately looks at the current player. This produces transient yaw/pitch while the position lags movement. | Correctly described in the baseline table. |
| Rotation input | No orbit/rotation control changes the normal camera. | Correct. “Fixed north bearing” should continue to mean the converged rest bearing, not invariant instantaneous yaw. |
| Zoom | `camera.zoom` remains its default `1`. Survivor instead changes offset distance for death and height (`js/game3d.js:8599-8643`). | Correct distinction, with the small ground-offset caveat in M1. |
| Resize | `js/game3d.js:1041-1048` changes renderer size, camera aspect/projection, and HUD dimensions without recreating gameplay state. | Correct in all behavior relevant to this design. |
| Lighting/shadows | `js/game3d.js:1023-1027,1053-1068` enables `PCFShadowMap`, uses a hemisphere light, and configures a shadow-casting directional light at `(+10,+20,+10)` relative to its target area; `js/game3d.js:8661-8663` moves it with the player. | V3 matches the broad technique but not yet an objective lighting contract. |

## Strengths

- **The selected camera matches the human comparison target.** Approach A uses the actual Survivor projection family, base offsets, rest pitch, rest bearing, follow rule, and immediate look-at. It will not reproduce v2’s short custom `(8.6, 7.2)` camera or independently smoothed target.
- **The terminology is mostly honest.** The baseline explicitly says “Survivor-like isometric” means elevated oblique perspective, not orthographic isometry, and it does not invent a 45° Survivor yaw.
- **The presentation contract directly attacks the debug-arena failure.** The grassy patch, path, perimeter forest, ribboned Wood piles, selected-animal model, spatial zombies, fog limit, shadows, and transparent HUD are concrete replacements for `js/game-rpg.js:281-309` and `js/rpg/hud-rpg.js:592-660`.
- **Projection and input are separated correctly.** World X/Z remains authoritative, while projected-direction inequalities prove the intended W/up, S/down, A/left, and D/right presentation.
- **Camera lifecycle is implementation-ready in most respects.** Entry snap, update order, no orbit/zoom input, aspect-only resize, camera identity preservation, landscape/portrait framing expectations, and failure behavior are explicit.
- **V2 behavior remains intact.** The exact simulation table, deterministic frame order, death/respawn, save normalization, completion transaction, non-quest gate, test-only later-quest capability, input cleanup, resource ownership, feedback, and scope exclusions are all retained.

## Findings

### Critical

#### C1. Browser acceptance still cannot prove the visible result that caused the human rejection

**Spec sections:** `Objective browser acceptance` items 1-8 and 16; `Forest scene and presentation contract`; `Acceptance criteria`; `Spec self-check`.

**Source evidence:** The proposed checks use debug roles, visibility booleans, `renderer.info` counts, camera values, projected points, frustum membership, raycasts, material/depth flags, and cast/receive-shadow flags. Those are useful structural checks, but none proves what the composited WebGL-plus-HUD frame actually looks like. The only pixel-level contract is HUD alpha coverage.

The existing harness demonstrates the distinction: `test-results/test-rpg-alpha-mode-flow.mjs:131-157` samples only the 2D HUD canvas, while screenshots at `:418` and `:580` are written as artifacts but never compared or asserted. A mesh can be tagged, in the frustum, depth-tested, and counted in triangles while having near-zero projected size, zero scale, transparent or ground-colored material, severe z-fighting, an unreadable silhouette, or no visible shadow. The current floor/cube style could also be replaced by a technically richer but still visually flat scene and pass these checks.

**Why this blocks approval:** The rejected behavior was visible overhead/static-debug presentation. A gate that can pass without evaluating rendered pixels does not protect the actual requirement.

**Required revision:** Add a deterministic, automated visual acceptance path for the **composited frame** at `960x540`, `1280x720`, and `390x844`. Use one of:

1. human-approved reference snapshots with a tolerant perceptual/pixel-difference threshold; or
2. screenshot-region classification with explicit color/contrast/area thresholds for ground, path, player, both node ribbons, all three zombies, perimeter foliage, and at least one cast shadow.

The test must fail against the current floor/cube plus opaque arena, fail if the WebGL actors are invisible or too small, fail if the scene becomes a flat overhead board, and fail if the HUD hides the playfield. Keep the metadata/projection checks as diagnostic support; do not treat them as substitutes for rendered-image acceptance. Add one post-movement visual sample so visible depth/overlap or parallax is exercised rather than only the entry pose.

### Important

#### I1. Lighting, shadow visibility, fog, and projected actor scale are not objective enough

**Spec sections:** `Forest scene and presentation contract / Lighting, shadows, and depth`; `Local forest composition`; `Render synchronization and responsive framing`; browser items 5-6 and 16.

V3 requires a hemisphere light, a directional light “diagonally above,” a target at “the player/clearing,” visibly offset shadows, and forest fog. It does not select light colors/intensities, an exact position or follow rule, shadow-map size, shadow-camera bounds/near/far, bias, fog color/near/far, or a minimum projected size/contrast for the player, Wood nodes, or zombies. Browser item 6 checks cast/receive flags, not a rendered shadow.

At the selected 22.804-unit base distance, new node and zombie dimensions materially determine whether the encounter reads as a playable diorama or an empty clearing. “Full bodies ... remain readable” and “small stump/log pile” permit incompatible scales, and frustum membership does not establish readability.

**Required revision:** Select one numeric Forest Edge lighting/fog setup and specify whether the directional light is clearing-fixed or player-following. Define the shadow frustum so every legal actor position is covered. Add minimum projected screen-space bounding-box dimensions (or ratios relative to the reused Survivor player model) and contrast expectations for the player, each zombie, and each node at the three acceptance viewports. Verify a visible shadow region in the composited-image test from C1, not only Three.js flags.

This does not require duplicating Survivor time-of-day behavior. A fixed local setup is preferable for this small encounter and deterministic visual testing.

#### I2. The all-position occlusion promise is stronger than its definitions and tests

**Spec sections:** `Visibility and occlusion`; `Objective browser acceptance` item 6.

The presentation contract promises no scenery hit from the camera to the player for **every legal player X/Z coordinate**, but it does not define the upper-body anchor height for different animal models, the raycast recursion/material-opacity rule, or a finite exhaustive verification method. The browser item only says actor/node rays have no occluder and otherwise focuses on the entry frame and authored spawn positions.

**Required revision:** Define the player/actor anchor from an actual world-space bounding box (for example, a fixed percentage between feet and model top), define which opaque scenery meshes participate in recursive raycasts, and specify a deterministic verification grid or analytic corridor rule that covers the full legal player rectangle plus authored objective points. Also make the visual snapshot exercise the south foreground, where accidental canopy obstruction is most likely.

#### I3. Approach C is not a mathematically isometric alternative as written

**Spec section:** `Camera approaches considered / Approach C — Mathematical isometric camera`.

A perspective camera with equal X/Z offsets and 45° ground-plane yaw is still perspective, not mathematical isometry. Equal X/Z offsets set azimuth only; they do not set the isometric elevation or remove perspective convergence. A conventional true isometric camera is orthographic with 45° azimuth and approximately `35.264°` elevation above the ground plane (equal axis foreshortening).

**Required revision:** Split the alternative into:

- true orthographic isometry: orthographic projection, 45° azimuth, approximately 35.264° elevation; and
- perspective three-quarter/isometric-like view: perspective projection, 45° azimuth, with an explicitly chosen elevation.

The tradeoffs can then say both differ from current Survivor, while only the orthographic option removes perspective depth. Approach A should remain selected.

### Minor

#### M1. “Exact current Survivor ground camera” overlooks the runtime 0.01 ground lift

**Spec sections:** `Repository-grounded Survivor camera baseline`; `Camera approaches considered`; `Camera constants and formulas`.

Survivor initializes `playerY` to `terrainHeight(0, 0) + 0.01` (`js/game3d.js:292`), its flat terrain returns `0` (`js/3d/terrain.js:61-73`), and height scaling uses `st.playerY - GROUND_Y` (`js/game3d.js:8634-8639`). Therefore a grounded normal frame uses `zoomFactor = 1.0006`, not literally `1`, producing offsets about `18.0108` and `14.0084`. The visual difference is negligible and does not undermine the selected Forest Edge constants, but the repeated word “exact” is source-inaccurate.

**Required revision:** Say Forest Edge copies Survivor’s **base constants** and intentionally evaluates them at its authored `playerY = 0`. Note that current Survivor’s 0.01 model lift produces a negligible runtime height multiplier. Keep Forest Edge’s required values and tests at exactly `18`, `14`, and `1`.

#### M2. The one-render-frame browser follow assertion lacks the observation needed to calculate it robustly

**Spec sections:** `Objective browser acceptance` item 3; browser debug-object contract.

The assertion needs the previous camera position and the desired position used for that exact render. The listed observation-only debug view exposes current actual/desired positions but not a previous-frame snapshot or frame sequence. An asynchronous Puppeteer sample can skip animation frames and cannot reliably reconstruct one `0.05` step.

**Required revision:** Expose a monotonic render-frame ID plus the previous camera position and desired position used by the last completed follow update, or reduce the browser assertion to convergence/orientation and leave exact one-step math in focused unit acceptance. No debug mutation API is needed.

## Preservation and scope check

| Prior resolution | V3 status |
|---|---|
| C1 no sibling scene import | Preserved in `Architecture and dependency contract`; the scene receives injected Three.js/plain definitions and uses a private primitive builder. |
| C2 resource ownership | Preserved in `Selected-animal integration` and `Resource ownership and cleanup`, including ordered idempotent teardown. |
| I1-I2 spatial tuning and respawn | Preserved in `Exact simulation contract` and `Death and transition contract`. |
| I3-I5 save invariants, reachable visits, and test assist | Preserved in `Save normalization and exactly-once completion`, `Reachable non-quest behavior`, and `Explicit browser-test capability`. |
| I6-I8 model adapter, lifecycle, and measurable browser behavior | The adapter and lifecycle are preserved. Browser state/alpha measurement is expanded, but visible WebGL acceptance remains incomplete per C1. |
| M1-M3 test-first, feedback, and return/delta contracts | Preserved in `Test-first strategy`, `HUD and feedback contract`, and `Exact simulation contract`. |

No accepted first-quest mechanic regressed: two proximity-only Wood pickups still grant `3 + 2`, three spatial zombies still gate completion, attacks remain nearest/in-range, contact remains non-stacking, death/partial-save/completion behavior remains deterministic and idempotent, and normal `G`/`E` remain inert in Forest Edge. Rabbit Village and later playable content remain excluded. The added forest composition, fixed local camera, lighting, and visual tests are presentation work required by the human checkpoint, not feature-scope expansion.

## Required revisions before approval

1. Add automated composited-frame visual acceptance that fails on the current placeholder and on invisible, flat, unreadable, or HUD-obscured implementations.
2. Fix numeric lighting/shadow/fog ownership and projected actor/object readability at all three target viewports.
3. Make the all-position occlusion contract finite and reproducible, including model-derived anchors and participating scenery.
4. Correct the mathematical-isometry alternative while retaining Approach A.
5. Qualify the negligible Survivor ground-lift difference without changing Forest Edge’s selected `50 / 18 / 14 / 0.05 / zoom 1` policy.
6. Make the exact one-frame follow browser assertion observable or leave exact step math to the unit contract.

**Verdict: Not ready**
