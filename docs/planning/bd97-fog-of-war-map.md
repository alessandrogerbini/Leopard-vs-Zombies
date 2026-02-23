# BD-97: Fog-of-war minimap — reveal explored areas as player moves

**Category:** Enhancement — HUD/Map
**Priority:** P1
**File(s):** `js/3d/hud.js`, `js/game3d.js`

## Description
The minimap HUD doesn't clearly show where the player has explored. The map should start fully black (fog of war) and only reveal terrain within the player's line-of-sight radius. As the player moves, explored areas stay permanently revealed on the minimap, creating a readable history of where they've been.

## Implementation
1. **Fog-of-war data structure:** A 2D grid (or set of chunk keys) tracking which map cells have been revealed.
2. **Reveal radius:** Reveal cells within ~30-40 units of the player each frame (matching approximate visual range).
3. **Minimap rendering:** Draw the map background as black/dark. Only draw terrain features (trees, rocks, shrines, etc.) in cells that have been revealed. Currently visible area (near player) should be brighter than previously-explored-but-distant areas.
4. **Persistence:** Revealed state persists for the entire run (resets on new game).

## Acceptance Criteria
- Minimap starts fully dark/black
- Area around the player is revealed in real-time as they move
- Previously explored areas remain visible but slightly dimmed
- Unexplored areas remain black
- Shrines, totems, and decorations only show on map once revealed
- Current player position still clearly marked
- Performance: fog check runs efficiently (grid lookup, not per-pixel raycasting)
