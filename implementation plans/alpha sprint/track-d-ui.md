# Track D: UI & Readability

**Focus:** Chunky charge timer, kid-friendly HUD, game-over inline feedback, Chill Mode, silent analytics
**Key Files:** `js/3d/hud.js` (modify), `js/3d/feedback.js` (new), `js/3d/constants.js` (modify for Chill Mode)
**Effort:** 10-15 hours
**Blocked By:** Track A (A-1 howl rename for D-2 readability pass), Track B (audio manager for charge SFX)

---

## Task D-1: Chunky Segmented Charge Bar

**What to build:** A large, visible, segmented charge bar that appears when the player holds the power attack button. Must be readable by a 7-year-old from across the room.

**File:** `js/3d/hud.js` -- replace existing charge meter (lines 284-295)

**Design requirements (from v3 plan):**
- Chunky, visible bar above the player or below the HUD health bar
- Color-coded: fills from yellow (weak) to orange (medium) to red (full charge)
- Segmented or notched: kids can see "I'm at half charge" at a glance
- BIG. Not subtle. If a 7-year-old can't see it from 6 feet away, it's too small.
- Text label: "CHARGING..." while held, "READY!" flash at full charge

**Implementation:**
```javascript
// Replace the existing charge meter section in drawHUD:
if (s.charging) {
  // ---- CHUNKY CHARGE BAR ----
  const barW = 300;  // Wide bar (was 100)
  const barH = 28;   // Tall bar (was 10)
  const segments = 10; // 10 visible segments
  const bx = W / 2 - barW / 2;
  const by = H - 80;  // Higher up from bottom (was H - 30)
  const ratio = Math.min(1, s.chargeTime / 2); // 0 to 1 over 2 seconds

  // Background (dark)
  ctx.fillStyle = '#111';
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);

  // Segment fill
  const segW = barW / segments;
  const filledSegments = Math.floor(ratio * segments);
  const partialFill = (ratio * segments) - filledSegments;

  for (let i = 0; i < segments; i++) {
    const segX = bx + i * segW;
    const segProgress = (i + 1) / segments;

    // Color based on segment position
    let color;
    if (segProgress <= 0.4) color = '#ffcc00';       // Yellow (weak)
    else if (segProgress <= 0.75) color = '#ff8800';  // Orange (medium)
    else color = '#ff2200';                           // Red (strong)

    if (i < filledSegments) {
      // Fully filled segment
      ctx.fillStyle = color;
      ctx.fillRect(segX + 1, by, segW - 2, barH);
    } else if (i === filledSegments) {
      // Partially filled segment
      ctx.fillStyle = color + '44'; // Dim background
      ctx.fillRect(segX + 1, by, segW - 2, barH);
      ctx.fillStyle = color;
      ctx.fillRect(segX + 1, by, (segW - 2) * partialFill, barH);
    } else {
      // Empty segment (dim)
      ctx.fillStyle = '#222';
      ctx.fillRect(segX + 1, by, segW - 2, barH);
    }
  }

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, barW, barH);

  // Segment notch lines
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (let i = 1; i < segments; i++) {
    const nx = bx + i * segW;
    ctx.beginPath();
    ctx.moveTo(nx, by);
    ctx.lineTo(nx, by + barH);
    ctx.stroke();
  }

  // Text label
  ctx.textAlign = 'center';
  if (ratio >= 1.0) {
    // Full charge: flash "READY!" in big text
    const flash = Math.sin(Date.now() * 0.01) > 0;
    ctx.fillStyle = flash ? '#ff2200' : '#ffcc00';
    ctx.font = 'bold 28px "Courier New"';
    ctx.fillText('READY!', W / 2, by - 12);
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Courier New"';
    ctx.fillText('CHARGING...', W / 2, by - 10);
  }
  ctx.textAlign = 'left';
}
```

**Test criteria (manual, visual):**
- Hold B to charge power attack
- See a wide, segmented bar appear near bottom of screen
- Bar fills from left to right: yellow segments -> orange segments -> red segments
- Each segment is individually visible (notch lines between)
- At full charge: "READY!" flashes in large red/yellow text
- Bar is clearly visible at 1280x720 resolution
- **Ask someone (or pretend you are) 6 feet away -- can you tell the charge level?**

**Done when:** A non-gamer child can tell you how charged the power attack is by looking at the screen from 6 feet away.

---

## Task D-2: General HUD Readability Pass

**What to build:** Increase all HUD text sizes to be readable at 1280x720, ensure rarity colors are distinct, update all "SCROLL" text to "HOWL", and make damage numbers larger.

**File:** `js/3d/hud.js`

**Specific changes:**

1. **Minimum font sizes:**
   - HP/XP bar text: 14px (was 12/10px)
   - Level display: 18px (was 16px)
   - Animal name: 14px (was 12px)
   - Weapon slot names: 12px (was 10px)
   - Scroll/Howl display: 12px (was 10px)
   - Floating damage numbers: 18px bold (was 14px)
   - Controls hint: 13px (was 12px)

2. **HP bar size increase:**
   - Width: 240px (was 200px)
   - Height: 24px (was 20px)

3. **Weapon slot bar size increase:**
   - Width: 170px (was 140px)
   - Height: 22px (was 18px)

4. **Scroll display -> Howl display:**
   - Import `HOWL_TYPES` instead of `SCROLL_TYPES`
   - Display `s.howls` instead of `s.scrolls`

5. **Floating text size:**
   - Damage numbers: 18px bold (was 14px)
   - XP gain: 16px (was 14px)
   - Augment text: 16px bold (was 14px)

6. **Rarity color contrast verification:**
   - Stuff (white): `#ffffff` on dark background -- good
   - Good Stuff (green): `#44ff44` on dark -- good
   - Shiny Stuff (blue): `#4488ff` on dark -- good
   - REALLY Cool Stuff (orange): `#ffaa00` on dark -- good
   - All four colors must be visually distinct from each other

7. **Kid-friendly language check:**
   - "AoE" -> "area attack" or just remove jargon from descriptions
   - "DoT" -> "damage over time" or "hurts enemies in the cloud"
   - "DPS" -> avoid entirely
   - Weapon descriptions should be one simple sentence a 7-year-old understands

**Test criteria (manual):**
- Play at 1280x720 resolution
- All HUD text is readable without squinting
- HP bar, XP bar, weapon slots are clearly visible
- Floating damage numbers are large and brief
- Howl display shows "POWER HOWL" not "POWER SCROLL"
- No HUD elements overlap or are cut off at the edges

**Done when:** All HUD elements readable and unobscured at 1280x720 and 1920x1080. No one squints.

---

## Task D-3: Game-Over Screen Upgrade (Stats + Inline Feedback)

**What to build:** Expand the game-over screen to show detailed run stats and 2-3 inline feedback questions. Also add a link to the full feedback form.

**Files:** `js/3d/hud.js` (modify game over section), `js/3d/feedback.js` (new)

**Game-over screen layout:**
```
                    GAME OVER

              SCORE: 12,450

        Leopard | Level 14 | Wave 3
        Time: 08:32 | Kills: 247
        Highest Tier: Bruiser (Tier 3)

        ─── HOW WAS YOUR RUN? ───

        What was the most fun moment?
        [________________________________]

        Would you play again?
        [YES]    [MAYBE]    [NO]

        Anything frustrating?
        [________________________________]

        ─── LEADERBOARD ───
        (existing leaderboard display)

        [ENTER] Play Again | [Full Feedback Form ->]
```

**Feedback questions (inline, stored in localStorage):**
1. "What was the most fun moment this run?" -- free text, optional
2. "Would you play again?" -- Yes / Maybe / No (navigable with arrow keys)
3. "Anything frustrating?" -- free text, optional

**Implementation: `js/3d/feedback.js`**
```javascript
const FEEDBACK_KEY = 'wildfang_feedback';
const ANALYTICS_KEY = 'wildfang_analytics';

export function saveFeedbackResponse(runId, responses) {
  const existing = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  existing.push({ runId, timestamp: Date.now(), ...responses });
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
}

export function recordRunAnalytics(st) {
  const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
  analytics.push({
    timestamp: Date.now(),
    duration: Math.floor(st.gameTime),
    animal: st.animalId,
    level: st.level,
    weaponsOffered: st.weaponsOfferedLog || [],
    weaponsPicked: st.weapons.map(w => w.typeId),
    powerAttackCount: st.powerAttackCount || 0,
    itemRarityDistribution: st.itemRarityLog || {},
    difficulty: st.difficulty,
    score: st.score,
  });
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
}

export function getStoredFeedback() {
  return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
}

export function getStoredAnalytics() {
  return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
}
```

**HUD game-over rendering changes:**
Add after the existing leaderboard display:
- Additional stat lines: highest tier killed, total kills by tier, weapons used
- Inline feedback form: text input fields (reuse name entry pattern), button row
- Navigation: Tab or arrow keys to move between questions, Enter to submit
- After feedback submitted: show "Thanks!" and proceed to Play Again

**State additions to `st`:**
- `st.feedbackState = 'questions'` -- which section of game-over is active
- `st.feedbackQ1 = ''` -- free text for Q1
- `st.feedbackQ2 = null` -- 'yes'/'maybe'/'no' for Q2
- `st.feedbackQ3 = ''` -- free text for Q3
- `st.feedbackSubmitted = false`

**Test criteria:**
```javascript
import { recordRunAnalytics, getStoredAnalytics } from '../js/3d/feedback.js';
// Mock st object
const mockSt = { gameTime: 300, animalId: 'leopard', level: 10, weapons: [{typeId: 'clawSwipe'}], score: 5000, difficulty: 'normal' };
recordRunAnalytics(mockSt);
const analytics = getStoredAnalytics();
assert(analytics.length > 0, 'Analytics saved');
assertEqual(analytics[analytics.length - 1].animal, 'leopard', 'Animal recorded');
assertEqual(analytics[analytics.length - 1].duration, 300, 'Duration recorded');
```

**Playtest verification:**
- Die and reach game-over screen
- See run stats (time, kills, highest tier, level, score)
- See 3 inline feedback questions
- Can type answers to Q1 and Q3
- Can select Yes/Maybe/No for Q2 with arrow keys
- Press Enter to submit feedback
- See "Thanks!" confirmation
- Press Enter again to play again or return to menu
- Feedback is retrievable from localStorage (check in DevTools)

**Done when:** Game-over screen shows stats, inline feedback prompts, and stores responses.

---

## Task D-4: Chill Mode Difficulty

**What to build:** A 4th difficulty option designed for young children. 150% HP, 0.7x enemy speed, 1.5x powerup frequency, 0.5x score multiplier.

**Files:** `js/3d/constants.js` (add difficulty definition), `js/game3d.js` (wire up), `js/game.js` (add to difficulty selection)

**Difficulty definition:**
```javascript
// Add to constants.js or wherever difficulty settings are defined
export const DIFFICULTIES = {
  chill:  { name: 'CHILL MODE',  hpMult: 1.5, enemySpeedMult: 0.7, powerupFreqMult: 1.5, scoreMult: 0.5, desc: 'For kids! Easier enemies, more powerups.' },
  easy:   { name: 'EASY',        hpMult: 1.0, enemySpeedMult: 1.0, powerupFreqMult: 1.0, scoreMult: 1.0, desc: 'Standard difficulty.' },
  medium: { name: 'MEDIUM',      hpMult: 0.55, enemySpeedMult: 1.1, powerupFreqMult: 0.8, scoreMult: 1.75, desc: 'A real challenge.' },
  hard:   { name: 'HARD',        hpMult: 0.35, enemySpeedMult: 1.3, powerupFreqMult: 0.6, scoreMult: 2.5, desc: 'You will not survive long.' },
};
```

**Implementation in game3d.js:**
- On launch, read `options.difficulty` and apply multipliers:
  - `st.maxHp = Math.floor(baseHp * DIFFICULTIES[diff].hpMult)`
  - `st.hp = st.maxHp`
  - Enemy base speed multiplied by `enemySpeedMult`
  - Ambient crate timer divided by `powerupFreqMult` (more frequent = shorter timer)
  - Score multiplied by `scoreMult`

**In game.js (difficulty selection screen):**
- Add "CHILL MODE" as the first option in the difficulty list
- Show description text below selected difficulty
- Chill Mode card: use a distinct kid-friendly color (soft green or rainbow border)

**Test criteria:**
```javascript
import { DIFFICULTIES } from '../js/3d/constants.js';
assert(DIFFICULTIES.chill, 'Chill Mode exists');
assertEqual(DIFFICULTIES.chill.hpMult, 1.5, 'Chill HP mult is 1.5');
assertClose(DIFFICULTIES.chill.enemySpeedMult, 0.7, 0.01, 'Chill enemy speed is 0.7x');
assertEqual(Object.keys(DIFFICULTIES).length, 4, '4 difficulty levels');
```

**Playtest verification:**
- Select Chill Mode from difficulty screen
- Start with 150% of base HP
- Zombies are noticeably slower
- Powerup crates appear more frequently
- A child aged 6-10 can survive at least 3 minutes
- Score is lower than Easy mode (0.5x multiplier)

**Done when:** 4th difficulty option works. A 7-year-old survives 3+ minutes.

---

## Task D-5: Character Select Cleanup

**What to build:** Improve the character selection screen to show animal stats, starting weapon, and brief flavor text.

**Files:** `js/game.js` or `js/game3d.js` (wherever character select is rendered)

**Layout per animal card:**
```
  ┌─────────────────────┐
  │    [Animal Model]    │
  │                      │
  │     LEOPARD          │
  │  "Fast and fierce!"  │
  │                      │
  │  Speed: ████░░ 1.0x  │
  │  Power: ████░░ 1.0x  │
  │  HP:    ████░░ 100   │
  │                      │
  │  Starts with:        │
  │  CLAW SWIPE          │
  └─────────────────────┘
```

**Flavor text per animal:**
- Leopard: "Fast and fierce! A balanced fighter."
- Red Panda: "Quick and sneaky! Dodges with style."
- Lion: "Strong and proud! Hits like a truck."
- Gator: "Tough as nails! Takes a beating."

**Done when:** Stats visible on character select. Starting weapon shown. Flavor text per animal.

---

## Task D-6: Silent Analytics (localStorage)

**What to build:** Track 6 metrics per run silently, without displaying them to the player.

**File:** `js/3d/feedback.js`

**Metrics to track:**
1. Run duration (seconds) -- `st.gameTime`
2. Animal picked -- `st.animalId`
3. Level reached -- `st.level`
4. Weapons picked vs. skipped -- log each level-up weapon offer and player's choice
5. Whether power attack was used (yes/no, count) -- increment `st.powerAttackCount` on each release
6. Item rarity distribution encountered vs. picked up -- log each item drop rarity and pickup

**Implementation:**
Add tracking hooks in game3d.js:
```javascript
// On power attack release:
st.powerAttackCount = (st.powerAttackCount || 0) + 1;

// On level-up offer generated:
if (!st.weaponsOfferedLog) st.weaponsOfferedLog = [];
st.weaponsOfferedLog.push(upgradeChoices.map(c => c.id));

// On item drop:
if (!st.itemRarityLog) st.itemRarityLog = {};
st.itemRarityLog[item.rarity] = (st.itemRarityLog[item.rarity] || 0) + 1;

// On game over:
recordRunAnalytics(st);
```

**Test criteria:**
```javascript
// Verify analytics recording captures all 6 metrics
const mockSt = {
  gameTime: 480,
  animalId: 'lion',
  level: 12,
  weapons: [{ typeId: 'lightningBolt' }, { typeId: 'fireball' }],
  weaponsOfferedLog: [['lightningBolt', 'clawSwipe', 'power'], ['fireball', 'haste', 'boneToss']],
  powerAttackCount: 15,
  itemRarityLog: { stuff: 5, goodStuff: 2, shinyStuff: 1 },
  difficulty: 'medium',
  score: 8700,
};
recordRunAnalytics(mockSt);
const data = getStoredAnalytics();
const last = data[data.length - 1];
assertEqual(last.duration, 480, 'Duration captured');
assertEqual(last.animal, 'lion', 'Animal captured');
assertEqual(last.level, 12, 'Level captured');
assert(last.weaponsOffered.length === 2, 'Weapon offers captured');
assertEqual(last.powerAttackCount, 15, 'Power attack count captured');
assert(last.itemRarityDistribution.stuff === 5, 'Item rarity captured');
```

**Done when:** All 6 metrics are silently recorded to localStorage on game over. No UI shows these analytics (they are for developer review only).
