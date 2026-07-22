# Rescue Hub Design QA

- Source visual truth: `docs/art/rpg-rescue-hub-local-map-selected.png`
- Implementation screenshot: `test-results/rpg-readability-960x540.png`
- Combined comparison: `test-results/rpg-hub-reference-comparison.png`
- Viewport: 960x540, device scale factor 1
- State: fresh Leopard save in Rescue Hub; Quest Board focused; first-quest guide active; landscape map asset ready
- Additional responsive evidence: `test-results/rpg-readability-1280x720.png`, `test-results/rpg-readability-390x844.png`
- Fallback evidence: `test-results/rpg-hub-fallback-960x540.png`

## Findings

No actionable P0, P1, or P2 findings remain.

The first combined comparison found a P1 interaction-to-imagery mismatch in the landscape state: the dynamic Scout Hazel, Momo Foreman, and Storage Chest targets followed the reference's 4-4-1 grid while the corrected production illustration uses a 3-4-2 grid. That made several labels and click regions point at the wrong illustrated destinations.

The landscape anchors were aligned to the production illustration. The post-fix combined comparison shows each of the nine targets over its corresponding landmark, with the Quest Board as the only guided gold target. The top objective beacon and bottom prompt remain outside the landmark labels and hit regions.

## Fidelity Surfaces

- Fonts and typography: the implementation preserves the established pixel-display and compact UI treatment; heading, guide, label, and prompt hierarchy remain legible without clipping or truncation at all captured sizes.
- Spacing and layout rhythm: all nine hit regions are pairwise separated at 960x540, 1280x720, and 390x844. Landscape pins now follow the illustrated three-row composition; portrait retains its complete 3x3 destination grid.
- Colors and visual tokens: dark green panels, moss borders, and the single gold guided state retain the selected forest-camp palette and clear state contrast.
- Image quality and asset fidelity: landscape and portrait assets are sharp at their rendered sizes, preserve the storybook camp mood, and contain no baked labels or tutorial UI. Dynamic Canvas labels and controls remain separate from the raster art.
- Copy and content: `FIRST RESCUE`, `NEXT: Open the Quest Board`, destination names, and the Quest Board prompt are concise, coherent, and readable.
- Icons and interaction states: letter-key pins are consistent, focus is visible, mouse and keyboard share the same target state, and the fallback exposes nine visibly separated usable targets.
- Accessibility and resilience: keyboard focus remains spatial, pointer targets do not overlap, the guide can be dismissed without losing the quest tracker, and the portrait capture keeps every destination on screen.

## Comparison History

1. Initial comparison: blocked by the landscape landmark/pin mismatch described above.
2. Fix: updated only the landscape normalized anchors in `js/rpg/hub-map-layout.js` and added browser assertions for the illustrated middle and lower rows.
3. Post-fix evidence: regenerated `test-results/rpg-readability-960x540.png` and `test-results/rpg-hub-reference-comparison.png`; no actionable P0/P1/P2 mismatch remains.

Focused region comparison was not needed because the original-detail 1992x576 combined image keeps all labels, pins, guide copy, landmark imagery, and panel boundaries readable. Portrait and fallback were inspected separately at original detail for responsive and error-state coverage.

## Implementation Checklist

- [x] Align landscape targets to the production art.
- [x] Verify nine non-overlapping destinations at all three viewports.
- [x] Verify guide dismissal and persistence across reload.
- [x] Verify the controlled map-image fallback.
- [x] Regenerate and inspect the combined reference comparison.

final result: passed
