# Rescue Hub Guided Local Map Design

**Date:** 2026-07-21

**Bead:** `Leopard vs Zombies-9i5`

**Branch:** `rpg-alpha-startup-mode`

**Status:** Approved for implementation

**Selected visual:** `docs/art/rpg-rescue-hub-local-map-selected.png`

## Goal

Make the Rescue Hub feel like a readable local map instead of a cluster of overlapping buttons. A first-time player must be able to use either mouse or keyboard, understand the next action without prior instructions, and complete `The Hero Sign-Up Sheet` before the extra guidance ends.

## Success Criteria

- Hub landmarks never overlap their labels or each other at supported viewports.
- Hover and keyboard navigation share one visible focus state.
- One click activates a hub destination; it does not require a second click or Enter.
- A fresh save clearly guides the player through the complete first quest.
- The guide ends after the first quest and does not guide later quests.
- Dismissing the guide does not hide the normal quest tracker.
- The map remains usable if illustrated background artwork fails to load.
- Save slots, later quests, title return, 2D Classic, and 3D Survivor do not regress.

## Scope

### Included

- Storybook Camp Diorama visual direction from the selected ImageGen concept.
- Clean landscape and portrait local-map backgrounds derived from that concept.
- Mouse hover and single-click activation for hub landmarks.
- Mouse selection for quest rows and world-map destinations used by the first-quest flow.
- Spatial arrow-key navigation based on screen position rather than array order.
- Shared focus styling for mouse and keyboard.
- A dismissible Objective Beacon for `The Hero Sign-Up Sheet` only.
- First-quest objective counters in Forest Edge.
- Responsive, non-overlapping landmark layouts.
- Functional fallback rendering when map art is unavailable.

### Deferred

- Guided cues for quests after `The Hero Sign-Up Sheet`.
- Mouse-driven combat or gathering.
- Redesigns of dialogue, inventory, crafting, journal, or later quest content.
- Gamepad support.
- Changes to quest rewards, difficulty, save-slot count, or story progression.

## Selected Visual Direction

The selected concept is a softly isometric, illustrated forest-camp map. Landmarks sit on clearly separated terrain islands connected by paths. The Quest Board receives the only gold objective arrow and glow. A compact top objective cue and bottom context prompt provide direction without covering the map.

The selected PNG is a design reference, not a shippable background, because it contains baked labels and tutorial text. Implementation will derive two clean ImageGen assets from it:

- `assets/rpg/rescue-hub-map-landscape.png`
- `assets/rpg/rescue-hub-map-portrait.png`

The production backgrounds must contain scenery and landmark art only. Headers, landmark labels, focus rings, objective arrows, progress counters, and prompts remain dynamic Canvas UI.

## Interaction Design

### Hub Focus

- A fresh save opens with `questBoard` focused instead of Granny Thistle.
- Hovering a landmark immediately moves `selectedFocus` to that landmark.
- Pointer exit does not clear keyboard focus.
- A single pointer activation sets focus and activates the target exactly once.
- Arrow keys select the nearest landmark in the pressed screen direction.
- Enter or Space activates the focused landmark.
- Focus, hover, guide target, and pointer hit testing all use the same layout result.

Only `pointermove`, `pointerleave`, and `pointerdown` are registered. Separate mouse and touch activation listeners are removed to prevent duplicate activation after one physical click or tap.

### First-Quest Guide

The guide is derived from persisted quest state rather than a separate tutorial state machine.

| State | Guide presentation | Primary target |
|---|---|---|
| Fresh save; no active quest | `NEXT: Open the Quest Board` | `questBoard` |
| Quest Board open; quest available | `Accept The Hero Sign-Up Sheet` | first available quest row |
| First quest active; player in hub | `NEXT: Travel to Forest Edge` | `worldMap` |
| World Map open | `Choose Forest Edge` | `forestEdge` entry |
| Player in Forest Edge | `Wood X/5` and `Zombies X/3` | no forced focus |
| Both objectives complete | existing reward banner and hub return | none |
| First quest already completed | guide absent | none |

The guide ends permanently when `heroSignup` appears in `save.quests.completed`. Later quests retain the existing quest tracker but receive no Objective Beacon.

### Dismissal

- A small close target appears only on the Objective Beacon.
- Activating it writes `save.flags.firstQuestGuideDismissed = true`.
- Dismissal hides the beacon, guide arrow, and tutorial-only counters.
- The existing normal quest title, objective, and progress remain available.
- `createDefaultSave()` and `normalizeSave()` explicitly include the optional boolean flag, so existing saves treat it as `false` and future writes preserve it. No save-version bump is required.

### Responsive Layout

- Landscape viewports show all landmark labels in pre-authored, non-overlapping regions.
- Portrait viewports show compact landmark pins; only the focused and guided targets receive full labels, with details repeated in the bottom context prompt.
- The illustrated background changes between landscape and portrait sources instead of stretching or cropping away destinations.
- Layout remains valid at minimum test sizes `960×540`, `1280×720`, and `390×844`.

## Architecture

### Trunks

`js/rpg/constants-rpg.js` remains the content trunk. It owns stable landmark IDs and world coordinates. It cannot own pointer state, rendered rectangles, or tutorial progression.

`js/rpg/save-system.js` remains the persistence trunk. It adds `firstQuestGuideDismissed: false` to default flags and normalizes the optional stored value as a boolean. It cannot decide when the guide appears.

`js/rpg/guidance-rpg.js` is a new pure policy trunk. It derives the first-quest guide model from save and screen state. It cannot draw, access DOM APIs, register events, or mutate the save.

`js/rpg/hub-map-layout.js` is a new pure geometry trunk. It owns responsive landmark rectangles, label rectangles, prompt and dismiss rectangles, hit testing, and directional-neighbor selection. It cannot draw or activate game actions.

### Branches and Composition Root

`js/rpg/hud-rpg.js` remains the Canvas-rendering branch. It draws the selected background, landmarks, labels, focus state, Objective Beacon, counters, and fallback scene from the supplied view and layout.

For the existing Quest Board and World Map screens, `hud-rpg.js` adds pure layout and hit-test exports following its current save-slot pattern. Those functions are the shared geometry source for drawing and pointer activation on those screens.

`js/game-rpg.js` remains the composition root. It owns session focus, image loading, pointer and keyboard listeners, action dispatch, save writes, and wiring between the pure trunks and HUD branch.

Branch modules do not import one another. The composition root supplies concrete data and callbacks.

### Ports

```javascript
deriveFirstQuestGuide({ save, screen }) => {
  active,
  step,
  targetId,
  title,
  instruction,
  progress,
  dismissible,
}

getHubMapLayout({ width, height, landmarks, focusId, guideTargetId }) => {
  orientation,
  landmarks: [{ id, iconRect, labelRect, hitRect }],
  objectiveRect,
  promptRect,
  dismissRect,
}

hitTestHubMap(layout, x, y) =>
  { type: 'landmark' | 'dismiss', id } | null

getDirectionalNeighbor(layout, currentId, direction) => landmarkId | null
```

All returned objects are plain serializable data. Canvas contexts, DOM events, images, and mutable save objects never cross these ports.

### Dependency Graph

```text
constants-rpg.js <- guidance-rpg.js <- game-rpg.js
constants-rpg.js <- save-system.js <- game-rpg.js
constants-rpg.js <- hub-map-layout.js <- game-rpg.js
hub-map-layout.js <- hud-rpg.js <- game-rpg.js

assets/rpg/*.png -> game-rpg.js image loader -> hud-rpg.js draw input
```

Forbidden dependencies:

- `guidance-rpg.js` must not import `hud-rpg.js` or `game-rpg.js`.
- `hub-map-layout.js` must not import `hud-rpg.js` or `game-rpg.js`.
- `hud-rpg.js` must not mutate quest or focus state.

## Data Flow

1. `game-rpg.js` loads the active save and derives the guide model.
2. It requests a layout for the current viewport, focus ID, and guide target.
3. Pointer and keyboard input query that layout and update the one `selectedFocus` value.
4. A pointer activation dispatches the same action as Enter or Space.
5. `game-rpg.js` assembles the HUD view from save, guide, focus, layout, and loaded artwork.
6. `hud-rpg.js` renders without changing state.
7. Quest acceptance, progress, completion, or dismissal writes the save and triggers a new derived guide model.
8. After `heroSignup` completes, the derived guide is inactive and cannot reappear.

## Directional Navigation

For an arrow press, `hub-map-layout.js` considers landmark centers located in the requested half-plane. Candidates are scored by primary-axis distance plus a perpendicular-distance penalty. Deterministic landmark ID ordering breaks ties. If no candidate exists, focus remains unchanged; navigation does not wrap to an unrelated landmark.

This makes arrow movement match the visible map instead of the internal NPC/interactable array order.

## Asset Loading and Fallbacks

- Landscape and portrait assets are preloaded when the RPG runtime starts.
- A missing or failed image records a non-fatal asset state and uses the Canvas fallback.
- The fallback draws the simple camp ground and landmark tokens using `hub-map-layout.js`, so it still honors non-overlap and hit-test guarantees.
- Missing guide targets produce no beacon and fall back to the normal quest tracker.
- Pointer coordinates are converted using the HUD canvas CSS-to-buffer scale before hit testing.
- A focus ID that disappears after a state or layout change resolves to the current guide target, then the first available landmark.

## Verification

### Pure Tests

Add `test-results/test-rpg-hub-navigation.mjs` to verify:

- Every first-quest guide-state transition.
- Dismissed and completed-save behavior.
- Existing saves without the new optional flag.
- Landmark, label, objective, prompt, and dismiss rectangles stay inside the viewport.
- Landmark labels and interactive hit regions do not overlap at `960×540`, `1280×720`, and `390×844`.
- Hit testing returns the intended landmark and dismiss target.
- Directional navigation selects the visually nearest valid landmark and never wraps unexpectedly.

### Browser Flow

Extend `test-results/test-rpg-alpha-mode-flow.mjs` to verify:

- A fresh save focuses and highlights the Quest Board.
- Hover changes focus.
- One pointer activation opens the Quest Board exactly once.
- Mouse selection accepts `The Hero Sign-Up Sheet`.
- The hub beacon advances to World Map.
- Mouse selection opens Forest Edge.
- Forest Edge shows `Wood 0/5` and `Zombies 0/3` guidance.
- Objective progress updates those counters.
- Completion returns to the hub, shows the reward, and removes the guide.
- Dismissal persists while the normal tracker remains.
- A failed background request renders a usable fallback hub.
- No page errors, failed critical module requests, or duplicate activation events occur.

### Visual and Regression Checks

- Capture the implemented hub at `960×540`, `1280×720`, and `390×844`.
- Compare the selected reference and the implementation at matching state and viewport, checking hierarchy, spacing, labels, focus, and beacon placement.
- Run the full RPG data-flow and mode-flow suites.
- Run `test-results/test-mode-regression.mjs` for 2D Classic, 3D Survivor, RPG launch/return, and repeated launches.
- Manually complete the first quest using only visible instructions and mouse selection for menu destinations.

## Non-Changes

- Quest definitions and rewards remain unchanged.
- Later quest guidance remains unchanged.
- Existing keyboard shortcuts remain available.
- Combat and gathering controls remain keyboard-driven.
- Save-slot behavior and RPG cleanup contracts remain unchanged.

## Implementation Boundary

Implementation may begin only from this scope. Any request for later-quest tutorials, mouse combat, new hub destinations, new quest content, or a wider RPG visual overhaul requires a separate bead or a return to navigation.
