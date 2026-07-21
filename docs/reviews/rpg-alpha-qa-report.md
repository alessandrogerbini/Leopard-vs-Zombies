# RPG Alpha QA Report

Date: 2026-07-21
Branch: `rpg-alpha-startup-mode`

## Automated Gates

- `node test-results/test-rpg-alpha-data-flow.mjs` passed: save slots, save reload, hub quest board, ingredients, recipes, equipment, progression, reputation, journal, world unlocks, rescued flags, alpha quest chain, audio manifest.
- `BASE_URL=http://localhost:8105 node test-results/test-rpg-alpha-mode-flow.mjs` passed: save select, cleanup, hub/dialogue/world map, combat/death/respawn, reward cadence, alpha end-card reload, readability.
- `BASE_URL=http://localhost:8106 node test-results/test-mode-regression.mjs` passed: three-card mode menu, escape routes, RPG launch/return, repeated RPG/2D/3D launches.

## Screenshot Evidence

- `test-results/rpg-readability-960x540.png`
- `test-results/rpg-readability-1280x720.png`
- `test-results/rpg-readability-390x844.png`

## Manual Route Evidence

The full alpha route was executed through the `alpha-end-card-reload` Puppeteer route: title -> Animal Rescue -> animal -> save slot 0 -> complete all five alpha quests -> alpha end-card -> return hub -> return title -> reload slot 0 -> verify completed quests, rescued flags, spaceship reveal, and end-card dismissal state.

## Audio Evidence

`RPG_AUDIO_EVENTS` maps required RPG events to existing files in `sound-pack-alpha/`: menu select, quest accept, attack, hit, zombie defeat, ingredient pickup, craft success, quest complete, and player death. `test-rpg-alpha-data-flow.mjs --case audio-manifest` verifies every mapped file exists.

## Rubric Evidence

| Rubric Item | Evidence |
| --- | --- |
| Startup selection | `test-mode-regression.mjs`: `mode-menu-three-cards`; exact `ANIMAL RESCUE` label and hit test. |
| Third-mode isolation | `test-mode-regression.mjs`: `repeated-mode-launches`; RPG -> title -> RPG, 2D, and 3D. |
| Persistent saves | `test-rpg-alpha-data-flow.mjs`: `save-slots`, `save-reload`, `alpha-quest-chain`. |
| Authored hub | `test-rpg-alpha-mode-flow.mjs`: `hub-dialogue-world-map`. |
| Quest log | `test-rpg-alpha-mode-flow.mjs`: `reward-cadence`, `alpha-end-card-reload`; `test-rpg-alpha-data-flow.mjs`: `alpha-quest-chain`. |
| NPC dialogue | `test-rpg-alpha-mode-flow.mjs`: `hub-dialogue-world-map`; four named NPC prompts and two-line dialogue. |
| World travel | `test-rpg-alpha-data-flow.mjs`: `world-unlocks`; six zones open in order. |
| Combat loop | `test-rpg-alpha-mode-flow.mjs`: `combat-death-respawn`. |
| Rescue identity | `test-rpg-alpha-data-flow.mjs`: `rescued-flags`; `test-rpg-alpha-mode-flow.mjs`: `alpha-end-card-reload`. |
| Inventory | `test-rpg-alpha-data-flow.mjs`: `ingredients`. |
| Crafting | `test-rpg-alpha-data-flow.mjs`: `recipes`. |
| Equipment | `test-rpg-alpha-data-flow.mjs`: `equipment`. |
| Progression | `test-rpg-alpha-data-flow.mjs`: `progression`; `reward-cadence`. |
| Reputation | `test-rpg-alpha-data-flow.mjs`: `reputation`, `rescued-flags`. |
| Journal/stickers | `test-rpg-alpha-data-flow.mjs`: `journal`, `alpha-quest-chain`; `reward-cadence`. |
| Reward cadence | `test-rpg-alpha-mode-flow.mjs`: `reward-cadence`. |
| Readable UI | `test-rpg-alpha-mode-flow.mjs`: `readability`; screenshot files listed above. |
| Audio baseline | `test-rpg-alpha-data-flow.mjs`: `audio-manifest`. |
| Cleanup | `test-rpg-alpha-mode-flow.mjs`: `cleanup`. |
| Regression coverage | `test-mode-regression.mjs` default run. |

