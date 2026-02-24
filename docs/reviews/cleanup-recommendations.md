# BD-152: File and Folder Cleanup Recommendations

**Date:** 2026-02-24
**Scope:** Full file tree audit of the "Leopard vs Zombies" repository
**Action:** READ-ONLY audit. No files were deleted or moved.

---

## Project Size Summary

| Location | Size | Tracked by Git? | Notes |
|----------|------|-----------------|-------|
| Total working directory | 54 MB | -- | Includes worktrees |
| `.claude/worktrees/` (30 agent worktrees) | 126 MB | No (gitignored) | Local-only disk usage |
| `screenshot-ai/` (93 PNGs + 6 JS scripts + 1 test-results dir) | 12 MB | Yes (98 files) | Automated playtest screenshots |
| `screenshots/` (3 PNGs + .gitkeep) | 2.5 MB | Yes | Manual playtest screenshots |
| `sound-pack-alpha/` (40 audio files + 2 docs) | 1.4 MB | Yes | Game audio assets |
| `.beads/` (beads tracking system) | 4.3 MB | Partially (config, hooks, metadata) | Project management tool |
| `js/` (14 source files) | 728 KB | Yes (17,120 lines total) | All active game code |
| `docs/` (33 files across 4 subdirs) | 728 KB | Yes | Planning, analysis, reviews, process |
| `Ideal Agent Instructions/` (10 files) | 48 KB | Yes | Agent workflow system |
| `implementation plans/` (7 files) | 140 KB | Yes | Alpha sprint track plans |
| `human planning docs/` (3 files) | 92 KB | Yes | Developer creative direction |
| Git object store | 30 MB | -- | Unpacked; no pack files |

**Total git-tracked files:** 231

---

## 1. Safe to Remove

### 1.1 Agent Worktrees (126 MB) -- HIGH PRIORITY

**Path:** `.claude/worktrees/` (30 directories)

```
.claude/worktrees/agent-a0b8df9c/
.claude/worktrees/agent-a1605d02/
.claude/worktrees/agent-a24f1674/
.claude/worktrees/agent-a2a364d7/
.claude/worktrees/agent-a2a51831/
.claude/worktrees/agent-a2f89e42/
.claude/worktrees/agent-a38e1342/
.claude/worktrees/agent-a417510f/
.claude/worktrees/agent-a43a8571/
.claude/worktrees/agent-a45b7b4b/
.claude/worktrees/agent-a46d8ed9/
.claude/worktrees/agent-a47d49d8/
.claude/worktrees/agent-a572ad36/
.claude/worktrees/agent-a5a4d168/
.claude/worktrees/agent-a8241600/
.claude/worktrees/agent-a87d5336/
.claude/worktrees/agent-a8e58e42/
.claude/worktrees/agent-a9157527/
.claude/worktrees/agent-ab0d10f3/
.claude/worktrees/agent-ac2fce47/
.claude/worktrees/agent-acb36f51/
.claude/worktrees/agent-ae1c25be/
.claude/worktrees/agent-ae1f49d0/
.claude/worktrees/agent-ae2870a9/
.claude/worktrees/agent-ae47b890/
.claude/worktrees/agent-ae7f1f08/
.claude/worktrees/agent-ae8f6f43/
.claude/worktrees/agent-af1fd2ad/
.claude/worktrees/agent-af28e9c6/
.claude/worktrees/agent-af406ab2/
```

**Justification:** These are leftover git worktrees from the alpha v3 parallel sprint. Each worktree is a full copy of the repo (JS, assets, docs, screenshots, audio). They are gitignored and serve no ongoing purpose -- all sprint work has been merged to master. Removing them recovers 126 MB of local disk space.

**Risk:** None. These are gitignored, not tracked, and all work has been merged. They can be regenerated at any time by creating new worktrees.

**How to remove:** `rm -rf ".claude/worktrees/"` or use `git worktree remove <name>` for each.

---

### 1.2 Duplicate gfx Screenshots in screenshot-ai/ (~2.3 MB)

**Files:** The `screenshot-ai/` directory contains two runs of the graphics review script that produced overlapping screenshots with slightly different names. The short-named files and long-named files are from DIFFERENT runs (verified by hash comparison) but capture essentially the same game states:

| Short Name (Run 2) | Long Name (Run 1) | Both Unique? |
|--------------------|--------------------|-------------|
| `gfx-08-enemies.png` | `gfx-08-enemies-approaching.png` | Yes (different hashes) |
| `gfx-10-trees.png` | `gfx-10-trees-and-decorations.png` | Yes |
| `gfx-11-angle.png` | `gfx-11-different-angle.png` | Yes |
| `gfx-12-overview.png` | `gfx-12-terrain-overview.png` | Yes |
| `gfx-14-distant.png` | `gfx-14-distant-terrain.png` | Yes |
| `gfx-15-hud.png` | `gfx-15-hud-overlay.png` | Yes |
| `gfx-16-pause.png` | `gfx-16-pause-menu.png` | Yes |
| `gfx-17-wide.png` | `gfx-17-wide-exploration.png` | Yes |
| `gfx-18-final.png` | `gfx-18-final-scene.png` | Yes |

**Justification:** Both sets capture the same gameplay moments from the same automated script (just different runs). Keeping one set is sufficient. The long-named set (Run 1) was the original; the short-named set (Run 2) appears to be a cleanup re-run with shorter filenames. Recommend keeping the short-named set and removing the long-named duplicates.

**Files to remove (Run 1 / long names):**
- `screenshot-ai/gfx-08-enemies-approaching.png`
- `screenshot-ai/gfx-10-trees-and-decorations.png`
- `screenshot-ai/gfx-11-different-angle.png`
- `screenshot-ai/gfx-12-terrain-overview.png`
- `screenshot-ai/gfx-14-distant-terrain.png`
- `screenshot-ai/gfx-15-hud-overlay.png`
- `screenshot-ai/gfx-16-pause-menu.png`
- `screenshot-ai/gfx-17-wide-exploration.png`
- `screenshot-ai/gfx-18-final-scene.png`

**Risk:** Low. These are playtest evidence from the same automated session. The short-named equivalents remain. The long-named versions will still exist in git history.

---

### 1.3 Superseded Screenshot Script Versions (~300 lines)

**Files:**
- `screenshot-ai/take-screenshots.js` (128 lines) -- v1
- `screenshot-ai/take-screenshots-v2.js` (174 lines) -- v2
- `screenshot-ai/take-screenshots-v3.js` (144 lines) -- v3

**Justification:** Three versions of the same Playwright screenshot script. `v3` is the latest and supersedes v1 and v2. Additionally, `playthrough.js` (320 lines) and `playthrough2.js` (288 lines) are separate scripts, but `playthrough2.js` supersedes `playthrough.js`. And `graphics-review.js` (229 lines) is a standalone script.

**Recommended removal:**
- `screenshot-ai/take-screenshots.js` (superseded by v2, then v3)
- `screenshot-ai/take-screenshots-v2.js` (superseded by v3)
- `screenshot-ai/playthrough.js` (superseded by `playthrough2.js`)

**Keep:**
- `screenshot-ai/take-screenshots-v3.js` (latest version)
- `screenshot-ai/playthrough2.js` (latest playthrough script)
- `screenshot-ai/graphics-review.js` (unique purpose)

**Risk:** Low. Older script versions are preserved in git history.

---

### 1.4 Empty test-results Directory

**Path:** `screenshot-ai/test-results/`

**Contents:** Only `.last-run.json` (45 bytes) -- a Playwright artifact.

**Justification:** This is a transient Playwright output directory. The `.last-run.json` file contains no useful data and is regenerated on each run.

**Risk:** None.

---

### 1.5 Stale proposed-mapping-changes.md

**Path:** `sound-pack-alpha/proposed-mapping-changes.md`

**Justification:** This 537-line document was written on 2026-02-22 to address renamed sound files. It contains a detailed audit and proposed SOUND_MAP changes. However, the actual files on disk still use the SHORT original names (e.g., `bite-1.mp3` not `Bite-1-basic melee attack.mp3`), and the current `js/3d/audio.js` SOUND_MAP references the short names correctly. This means either:
- (A) The developer renamed files, this doc was written, and then the renames were reverted, or
- (B) The doc was written prospectively and the renames never happened.

Either way, the proposed-mapping-changes.md describes a state that does NOT match the current disk. The SOUND_MAP in `audio.js` correctly references the files as they exist on disk today. This document is misleading in its current state.

**Risk:** Low. The document is historical. However, it does contain useful developer intent notes (the developer's nephew's descriptions of each sound). Consider extracting useful metadata to `sound-ids.md` before removing, or simply annotating this file as STALE at the top rather than deleting it.

**Recommendation:** Either delete or add a `> STALE` header. The useful developer intent is partially captured in `sound-ids.md` already.

---

### 1.6 v1 Screenshots from screenshot-ai/ (~1.7 MB)

**Files (10 PNGs from the earliest take-screenshots.js run):**
- `screenshot-ai/01-title-screen.png`
- `screenshot-ai/02-after-enter.png`
- `screenshot-ai/03-after-second-enter.png`
- `screenshot-ai/04-after-third-enter.png`
- `screenshot-ai/05-gameplay-6s.png`
- `screenshot-ai/06-after-movement.png`
- `screenshot-ai/07-gameplay-15s.png`
- `screenshot-ai/08-pause-menu.png`
- `screenshot-ai/09-gameplay-25s.png`
- `screenshot-ai/gameplay-hud-overlap-01.png`

**Justification:** These are from the first Playwright screenshot run (v1). They have been superseded by v2, v3, and the playthrough sessions which provide much more comprehensive coverage (menu navigation, multi-minute gameplay, minimap, etc.). The v1 screenshots show a much earlier state of the game.

**Risk:** Low. These are historical snapshots. The playthrough and gfx sets provide better coverage. Git history preserves them.

---

## 2. Reorganization Recommendations

### 2.1 Documentation Structure -- Consolidate Root-Level Docs

**Current state:** There are 3 loose markdown files at the repo root that should be in `docs/`:
- `better-graphics-v0.md` -- Graphics improvement analysis (2026-02-23)
- `play-through-findings.md` -- Automated playthrough findings (2026-02-23)
- `playwright-playthrough-2.md` -- Second playthrough findings (2026-02-23)

**Recommendation:** Move these into `docs/reviews/` or `docs/planning/`:
- `better-graphics-v0.md` --> `docs/planning/better-graphics-v0.md` (it is an analysis/planning doc)
- `play-through-findings.md` --> `docs/reviews/play-through-findings.md` (it is playtest findings)
- `playwright-playthrough-2.md` --> `docs/reviews/playwright-playthrough-2.md` (it is playtest findings)

**Justification:** The `docs/` directory already has well-organized subdirectories (`analysis/`, `planning/`, `reviews/`, `process/`). These root-level files break the pattern and make the repo root cluttered. The repo root should ideally contain only `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `AGENTS.md`, and `index.html`.

---

### 2.2 Documentation Structure -- docs/planning/ is Growing Large

**Current state:** `docs/planning/` contains 18 files, mixing sprint plans, individual bead plans, and status tracking:

**Sprint plans (6):** `sprint1.md`, `sprint-bd88-96.md`, `sprint-bd98-102.md`, `sprint-bd128-plus.md`, `sprint-bd137-141.md`, `beads-bd149-153.md` (untracked)

**Individual bead plans (7):** `bd97-fog-of-war-map.md`, `bd104-equipped-item-visuals.md`, `bd105-playthrough-findings.md`, `bd106-graphics-review.md`, `bd113-zombie-terrain-collision-reopen.md`, `bd145-zombie-attacks-design.md`, `bd145-zombie-attacks-improved.md`, `bd148-wearables-improved.md`

**Bead batch plans (4):** `beads-bd142-143.md`, `beads-bd144-145.md`, `beads-bd146-148.md`, `beads-crash-and-perf.md`, `beads-from-graphics-review.md`, `beads-from-playthrough.md`, `beads-from-playthrough-2.md`

**Status tracking (3):** `wildfang-current-status.md`, `wildfang-plan.md`, `wildfang-status-bead.md`

**Recommendation:** Consider splitting into `docs/planning/sprints/` and `docs/planning/beads/` as the file count grows, or archiving completed sprint plans into `docs/planning/archive/`. Not urgent at 18 files, but will become harder to navigate as more sprints are added.

---

### 2.3 screenshot-ai/ -- Consider Gitignoring Binary Output

**Current state:** 93 PNG screenshots (12 MB) are tracked by git. Every automated playtest run adds more PNGs that bloat the git history. The git object store is already 30 MB (unpacked), and screenshots are a significant portion.

**Recommendation:**
1. Add `screenshot-ai/*.png` to `.gitignore` to stop tracking future screenshot binaries.
2. Keep the JS scripts (`take-screenshots-v3.js`, `playthrough2.js`, `graphics-review.js`) tracked.
3. Keep a representative small set of screenshots tracked (e.g., 5-10 key screenshots for documentation purposes), or use an external artifact store.

**Justification:** Binary files (PNGs) are poorly suited for git. They cannot be diffed, they bloat history, and every new playtest run adds permanent weight to the repo. The scripts that generate them ARE valuable; the output is transient evidence.

**Risk:** If screenshots are needed for issue discussions, they would need to be regenerated or stored externally. Git history would still contain all existing screenshots.

---

### 2.4 screenshots/ vs screenshot-ai/ -- Naming Overlap

**Current state:** Two separate directories for screenshots:
- `screenshots/` -- Manual screenshots (3 files, 2.5 MB, `Screenshot from YYYY-MM-DD HH-MM-SS.png`)
- `screenshot-ai/` -- Automated Playwright screenshots (93 files, 12 MB)

**Recommendation:** Consider merging into a single `screenshots/` directory with subdirectories:
```
screenshots/
  manual/       (formerly screenshots/)
  automated/    (formerly screenshot-ai/)
```

Or keep them separate but add a note to the README explaining the distinction. The current names (`screenshots/` vs `screenshot-ai/`) are clear enough but the distinction is not documented anywhere.

---

### 2.5 implementation plans/ -- Potentially Archivable

**Current state:** `implementation plans/alpha sprint/` contains 7 files (README + 6 track plans) from the alpha v3 parallel sprint. This sprint has been completed and merged.

**Recommendation:** This directory is historical documentation of a completed sprint. It could be moved to `docs/planning/archive/alpha-sprint/` to reduce top-level clutter, or left in place as reference material for future sprint planning.

**Justification:** The parallel sprint protocol documented here proved successful (100-150x time compression). Keeping it accessible is valuable for future sprints.

---

## 3. DO NOT TOUCH

### 3.1 All JS Source Files (Active Code)

Every file in `js/` is actively used. The import chain is verified:

```
index.html
  --> js/game.js (entry point, module)
        --> js/state.js
        --> js/levels.js
        --> js/utils.js
        --> js/enemies.js
        --> js/items.js
        --> js/renderer.js
        --> js/game3d.js
              --> js/3d/utils.js
              --> js/3d/constants.js
              --> js/3d/terrain.js
              --> js/3d/player-model.js
              --> js/3d/hud.js
              --> js/3d/audio.js
```

**All 14 JS files are reachable from `index.html`. None are orphaned.**

---

### 3.2 All Sound Files in sound-pack-alpha/

**40 audio files** (39 `.ogg`, 1 `.mp3`) -- every one is referenced in the SOUND_MAP in `js/3d/audio.js`:

Referenced files (cross-checked against disk):
`bite-1.mp3`, `bite-2.ogg`, `bite-3.ogg`, `bite-4.ogg`, `leapord-growl-1.ogg`, `rawr-1.ogg`, `rawr-2.ogg`, `explode-1.ogg`, `pew-3x-1.ogg`, `pew-3x-2.ogg`, `pew-5x-1.ogg`, `big-pew-1.ogg`, `gas-1.ogg`, `gas-2.ogg`, `gas-3.ogg`, `fart-1.ogg`, `fart-2.ogg`, `fart-3.ogg`, `wings-4.ogg`, `litterbox-1.ogg`, `bouncy-boots-1.ogg`, `bouncy-boots-2.ogg`, `bouncy-boots-3.ogg`, `bouncy-boots-4.ogg`, `wings-1.ogg`, `wings-2.ogg`, `falling-scream-1.ogg`, `race-car-1.ogg`, `race-car-2.ogg`, `race-car-3.ogg`, `e-scooter-1.ogg`, `e-scooter-2.ogg`, `zombie-1.ogg`, `zombie-2.ogg`, `zombie-3.ogg`, `zombie-4.ogg`, `zombie-5.ogg`, `zombie-6.ogg`, `zombie-7.ogg`, `poop-1.ogg`

**All 40 audio files match between disk and SOUND_MAP. None are orphaned.**

The `sound-ids.md` catalog is also active documentation for the sound pack.

---

### 3.3 index.html

The sole HTML entry point. Loads Three.js CDN and bootstraps `js/game.js`.

---

### 3.4 Root-Level Documentation Files

These files look like they could be deleted but ARE important:

| File | Why it must stay |
|------|-----------------|
| `README.md` | Project README |
| `ARCHITECTURE.md` | Architecture documentation |
| `CONTRIBUTING.md` | Contribution guidelines |
| `AGENTS.md` | Agent workflow documentation |

---

### 3.5 .beads/ Directory

The `.beads/` directory (4.3 MB) contains the beads project management system (config, hooks, metadata, interactions log, dolt database). This is an active project tracking tool. DO NOT remove even though it looks like tooling cruft.

The `.beads/.gitignore` manages what gets tracked vs ignored within the beads system. The hooks (`pre-commit`, `post-checkout`, etc.) are actively wired into git.

---

### 3.6 Ideal Agent Instructions/

10 files (48 KB) documenting the agent workflow system (navigation, execution, landing phases, parallelization protocol, context/modularity primers). This is actively used by agents working on the project and referenced in `MEMORY.md`. DO NOT remove.

---

### 3.7 human planning docs/

3 files (92 KB) containing the developer's creative direction (`path to closed alpha.md`, `v2`, `v3`). These are human-authored planning documents that drive development priorities. DO NOT remove.

---

### 3.8 docs/ Directory (All Subdirectories)

All 33 tracked files in `docs/` serve active purposes:
- `docs/analysis/` (3 files) -- Gap analysis, engine analysis, modularity analysis
- `docs/planning/` (17+ files) -- Sprint plans, bead plans, status tracking
- `docs/reviews/` (5 files + this document) -- Code reviews, documentation audits, UX beads
- `docs/process/` (2 files) -- Documentation plans, housekeeping recommendations

Even completed sprint plans are valuable as historical reference.

---

### 3.9 screenshots/ (Manual Screenshots)

The 3 manual screenshots in `screenshots/` are playtest evidence from the developer. The `.gitkeep` ensures the directory persists. Although the git status shows churn (one deleted, two added), these are active human-captured screenshots that may be referenced in discussions or bug reports.

---

## 4. Summary of Recommended Actions

| Priority | Action | Space Saved | Risk |
|----------|--------|-------------|------|
| HIGH | Remove 30 agent worktrees from `.claude/worktrees/` | 126 MB (local only) | None |
| MEDIUM | Remove 9 duplicate long-named gfx screenshots from `screenshot-ai/` | ~2.3 MB | Low |
| MEDIUM | Remove 3 superseded script versions from `screenshot-ai/` | ~400 lines | Low |
| MEDIUM | Remove 10 v1 screenshots from `screenshot-ai/` | ~1.7 MB | Low |
| MEDIUM | Move 3 root-level docs to `docs/` subdirectories | 0 (reorganization) | Low |
| LOW | Mark or remove stale `proposed-mapping-changes.md` | ~25 KB | Low |
| LOW | Remove empty `screenshot-ai/test-results/` | Negligible | None |
| LOW | Add `screenshot-ai/*.png` to `.gitignore` | Prevents future bloat | Low |
| LOW | Consider archiving completed sprint plans | 0 (reorganization) | Low |

**Total potential space recovery:** ~130 MB (mostly from worktrees)
**Total potential git history reduction:** ~4 MB (screenshot cleanup, applied going forward only)

---

*Generated 2026-02-24 by file tree audit. 231 tracked files inventoried, 14 JS files verified as active, 40 audio files verified as referenced, 30 worktrees identified as removable.*
