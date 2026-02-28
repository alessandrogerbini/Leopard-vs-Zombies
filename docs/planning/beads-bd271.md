# BD-271: Surface missing/desired sound files document for user review

**Date:** 2026-02-28
**Source:** User request — locate the document that specifies sound files that would be nice to have but are not yet supplied.

---

## P3 — Awareness / Housekeeping

---

### BD-271: Identify and surface the "needed sounds" recording brief

**Category:** Awareness / Asset Pipeline
**Priority:** P3
**File(s):** `docs/new-sounds.md`

**Finding:**

The document `docs/new-sounds.md` ("New Sounds Needed — Recording Brief for Julian") catalogs all missing, placeholder, and desired sound effects:

| Category | Count | Examples |
|----------|-------|---------|
| **Missing sounds** (no file exists) | 4 | `sfx_powerup_generic`, `sfx_xp_pickup`, `sfx_item_pickup`, `sfx_death_sting` |
| **Placeholder sounds** (reusing wrong files) | 12 | Boss entrance, boss phases, player death, crate open |
| **Suggested new sounds** (currently silent) | 20+ | Damage grunts, charge SFX, menu nav, weapon effects, dodge |

The document also includes:
- A **file reuse audit** (e.g., `explode-1.ogg` used by 5 different events)
- A **priority-ranked top 15** recording list
- A list of existing sounds that work well and should be kept

**Related bead:** BD-241 (the audit task that generated this document).

---

## Action Required

User to review `docs/new-sounds.md` and supply new recordings when ready. No code changes needed — this is an asset pipeline dependency.

---

## Acceptance Criteria

1. User is aware of `docs/new-sounds.md` and its contents
2. No code changes — bead is informational / tracking only

---

## Estimated Complexity

XS (Informational) — no code changes.
