# BD-240: Tiered jump sounds — silence low jumps, scale SFX with height

**Category:** Audio / Game Feel
**Priority:** P1-High (player-reported annoyance)
**File(s):** `js/game3d.js` (~line 4770-4773), `js/3d/audio.js`

## Problem

`playSound('sfx_jump')` fires on **every** jump (line 4773), regardless of height. The bouncy-boots SFX plays constantly during normal gameplay and becomes annoying. Low/normal jumps don't need audio feedback — the sound should be reserved for notable jumps.

## Current State

- `JUMP_FORCE = 10` (constants.js:22)
- `jumpMult` starts at 1.0, boosted by `st.jumpBoost` (Jumpy Boots powerup) and wearable feet effects (Spring Boots: +30%)
- `sfx_jump` maps to 4 bouncy-boots variants (audio.js:80-83)
- Sound plays unconditionally at line 4773

## Design

**Silence zone:** Any jump with effective `jumpMult <= 1.75` (base + 75%) produces no sound.

**Tiered thresholds (based on jumpMult):**

| Threshold | jumpMult Range | Sound |
|-----------|---------------|-------|
| Silent | ≤ 1.75 | None |
| Medium | 1.75 – 2.5 | Soft jump SFX (new event or quieter variant) |
| High | 2.5 – 3.5 | Normal `sfx_jump` (current bouncy-boots) |
| Huge | > 3.5 | Emphatic jump SFX (louder/deeper variant) |

The jumpMult is already computed at line 4764-4768 before the sound plays, so thresholds can be checked inline.

## Implementation

At line 4770-4773 in game3d.js, replace:

```js
st.playerVY = st.jumpForce * jumpMult;
st.onGround = false;
st.onPlatformY = null;
playSound('sfx_jump');
```

With:

```js
st.playerVY = st.jumpForce * jumpMult;
st.onGround = false;
st.onPlatformY = null;
// BD-240: Tiered jump sounds — silent for low jumps
if (jumpMult > 3.5) playSound('sfx_jump_huge');
else if (jumpMult > 2.5) playSound('sfx_jump');
else if (jumpMult > 1.75) playSound('sfx_jump_soft');
// else: silent (base + 75% or below)
```

Add new sound event IDs to audio.js SOUND_MAP:
- `sfx_jump_soft` — reuse existing bouncy-boots variants at lower implied volume, or pick the softest variant
- `sfx_jump_huge` — reuse the deepest bouncy-boots variant, or a new emphatic sound

If no new audio files are available, reuse existing variants: softest for `sfx_jump_soft`, all 4 for normal, deepest for `sfx_jump_huge`.

## Acceptance Criteria

- Normal jumps (no boost) are completely silent
- Jumps with Spring Boots (+30%, jumpMult=1.3) are silent
- Jumps with Jumpy Boots powerup produce sound only if jumpMult > 1.75
- Higher jumps produce progressively more impactful sounds
- No regression in jump physics or feel

## Estimated Scope

Small — 5-10 lines in game3d.js, 4-6 lines in audio.js.
