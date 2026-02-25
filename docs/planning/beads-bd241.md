# BD-241: Audio audit — catalog missing/placeholder sounds for new recording session

**Category:** Audio / Production
**Priority:** P1-High
**File(s):** `js/3d/audio.js`, `js/game3d.js`, `sound-pack-alpha/`
**Deliverable:** `docs/new-sounds.md`

## Description

Audit the full audio system to identify:
1. Sound event IDs that map to placeholder/reused files (e.g. bouncy-boots used for unrelated events)
2. Gameplay moments that have no sound at all (e.g. shrine break, totem activate, specific weapon impacts)
3. New sound events needed for recently added systems (boss attacks, death sequence, tiered jumps)
4. Sounds that are tonally mismatched for their purpose

Produce a document (`docs/new-sounds.md`) formatted for a recording artist (Julian) to understand what sounds are needed, including:
- Event name / trigger description
- When it plays in-game (context)
- Mood / tone suggestion
- Duration estimate
- Priority (must-have vs nice-to-have)

## Acceptance Criteria

- Every SOUND_MAP event ID is accounted for
- Every playSound() call site is cross-referenced
- Missing sounds are clearly described for a non-programmer
- Document is ready to hand directly to the recording artist
