# BD-104: Equipped items must visually appear on the animal model

**Category:** Feature — Visual/Model
**Priority:** P0 (Mission Critical)
**File(s):** `js/3d/player-model.js`, `js/game3d.js`

## Description
When the player picks up equippable items (glasses, soccer cleats, leather armor, cowboy hat, chainmail, etc.), these items do NOT appear visually on the bipedal animal model. They must show on the model to give visual feedback that items are equipped.

## Implementation
For each equippable item slot, add a visual mesh attachment to the player model:

- **Glasses** (slot: glasses) — Small rectangular frames on the face/head
- **Boots/Cleats** (slot: boots) — Colored blocks on the feet
- **Armor** (slot: armor) — Chest plate overlay (leather = brown, chainmail = silver)
- **Hat items** — Block on top of head (cowboy hat = brown wide brim, crown = gold)
- **Ring/Bracelet/Pendant** — Small colored accent on hand/wrist/neck
- **Scarf** — Colored strip around neck area

Each visual should be a simple box/group of boxes (matching the voxel art style) attached to the appropriate body part of the player model group.

## Acceptance Criteria
- At least: glasses, boots, armor, and hat visuals render on the model when equipped
- Visuals update immediately when items are picked up
- Visuals are removed if items are replaced
- Art style matches existing voxel aesthetic (box meshes)
- Performance: no significant overhead from additional meshes
