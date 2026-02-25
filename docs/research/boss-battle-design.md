# Boss Battle Design Research Report

**Date:** 2026-02-24
**Purpose:** Best practices for boss battles in roguelike survivor games, with specific recommendations for Animals vs Zombies.

---

## 1. Common Boss Attack Patterns in Roguelike Survivors

### Projectile Types
- **Straight-line:** Single projectile toward player position. Becomes interesting in bursts/volleys, not individually.
- **Spread/fan:** 3-7 projectiles in an arc (30-90°). Creates lanes with gaps to dodge through. Sweet spot for kids: 3-5 projectiles.
- **Spiral:** Rotating fire direction creates pinwheel patterns. Player orbits or times movement through gaps.
- **Homing:** Tracks player with limited turn rate. Must be slow enough to outrun. Needs visible trail + lifetime limit.
- **Lobbed/arcing:** Targets ground position, arcs through air. Shadow/ground marker telegraph.

### AoE Attacks
- **Ground slam:** Instant damage in radius around boss.
- **Expanding rings/shockwaves:** Ring expands outward, damage on contact.
- **Floor hazards/zones:** Persistent damage zones on the ground for several seconds.
- **Ring traps:** Confine player to a smaller area.
- **Cross/line attacks:** Damage lines extend from boss in cardinal/diagonal directions.

### Telegraphing (Three Layers)
1. **Warning animation:** Boss changes posture/glows/winds up (0.3-0.5s minimum)
2. **Ground markers:** Colored shapes showing danger zone. Fill-based timers communicate WHERE and WHEN.
3. **Audio cue:** Distinct sound per attack type. Different frequency ranges: low=ground, high=projectiles, mid=beams.

**Formula:** Telegraph duration = recognition time + dodge time + grace margin. For 7-year-old: 1.0-1.5 seconds minimum.

### Multi-Phase Attacks
- **Phase 1 (>60% HP):** 1-2 basic attacks, predictable pattern. Player learns rhythm.
- **Phase 2 (60-30%):** Add 1-2 new attacks. Existing attacks may speed up.
- **Phase 3 (<30%):** More frequent attacks, new combos, but core patterns stay readable.
- Key: Each phase ADDS complexity, doesn't replace what's learned.

---

## 2. Learnable Attack Patterns

### Making Patterns Predictable but Challenging
- Each attack should always LOOK the same (same color, shape, sound)
- Targeting can vary (aimed, predicted, random offset)
- Timing should feel rhythmic and regular
- Use sine-based variation, not pure randomness

### Telegraph Timing Recommendations

| Attack Type | Normal | Chill Mode | Dodge Method |
|---|---|---|---|
| Straight projectile | 0.8-1.0s | 1.2-1.5s | Move perpendicular |
| Spread volley | 1.0-1.2s | 1.5-1.8s | Find gap between projectiles |
| Ground slam | 1.2-1.5s | 1.8-2.2s | Move beyond marked radius |
| Floor hazard zone | 1.5-2.0s | 2.0-3.0s | Exit zone before eruption |
| Expanding ring | 0.8-1.0s | 1.2-1.5s | Position inside/outside |
| Charge/dash | 1.5-2.0s | 2.0-3.0s | Move perpendicular to charge line |

### Safe Zones and Dodge Windows
- **Every attack must have a safe zone.** No unavoidable damage.
- Attacks should NOT cover 360° simultaneously.
- Combo attacks should alternate safe zones (don't make player dodge the same direction twice).

---

## 3. Recommended Attacks for This Game

### Tier 9 — Titan (Heavy/Melee Boss)

**Current:** Slam + Shockwave. **Additions:**

1. **Bone Barrage (Lobbed AoE):** Slam ground → 4-6 bone fragments arc to positions near player. Red ground circles (0.8s warning). Damage: 15/bone. Cooldown: 6-8s.

2. **Titan Charge (Dash):** Hunch + red aim line (1.5s telegraph). Charge at 3x speed for 15 units. 30 damage. 2s recovery stun after (exploitable). Cooldown: 10s.

3. **Ground Fissures (Line AoE):** Slam creates 3 cracks in forward arc (0.5 wide, 12 long). Dark lines appear (1.2s telegraph), then erupt. 20 damage. Cooldown: 8s.

**Phase System:**
- >60% HP: Slam + Shockwave only
- 60-30%: Add Bone Barrage, shockwave +20% speed
- <30%: Add Titan Charge, cooldowns -25%, brighter glow

### Tier 10 — Overlord (Ranged/Commander Boss)

**Current:** Single Death Bolt. **Overhaul:**

1. **Death Bolt Volley:** 3-bolt spread (15° arc). Center leads target, flanks offset ±7.5°. Speed 16. Damage: 30/bolt. Cooldown: 4s.

2. **Shadow Zones (Floor Hazards):** 3-5 dark circles (3-unit radius) near player. 1.5s telegraph → eruption → 3s persistent damage (10 per 0.5s). Cooldown: 7s.

3. **Summon Burst:** 2s channel, spawns 4-6 tier 1-3 zombies in ring. 50% HP, 15s despawn. Cooldown: 12s.

4. **Death Beam (Sweeping Line):** 2s charge → thick beam sweeps 60° over 2s. 40 damage. Run perpendicular or get behind boss. Cooldown: 15s.

5. **Dark Nova (Desperation, <25% HP only):** Float up 1s, slam down → 30-unit expanding shockwave over 2s. BUT: safe zone within 4 units of boss ("hug the boss" mechanic). 50 damage. Cooldown: 20s.

**Phase System:**
- >75%: Volley + Shadow Zones
- 75-50%: Add Summon Burst
- 50-25%: Add Death Beam, volley becomes 5-bolt, cooldowns -20%
- <25%: Add Dark Nova, +30% move speed, intense aura

---

## 4. Difficulty Scaling

### Game Time Scaling
- Boss HP: `baseTierHP * (1 + gameTimeMinutes * 0.08)`
- Boss damage: scale gently `(1 + gameTimeMinutes * 0.03)` — patterns are the real threat

### Chill Mode
- Telegraph duration: 1.5x
- Projectile speed: 0.6x
- Cooldowns: 1.5x
- Damage: 0.5x
- Fewer projectiles (3-bolt → 2-bolt, 5-bolt → 3-bolt)
- Phase thresholds shifted (Phase 2 at 40%, Phase 3 at 15%)
- No homing projectiles

---

## 5. Visual/Audio Intimidation

### Screen Effects
- **Boss slam:** Strong shake (amplitude 0.3-0.5, 0.3s)
- **Boss charge hit:** Medium shake (0.2, 0.2s)
- **Near-miss:** Micro shake (0.05, 0.1s)
- **Boss spawn:** Red vignette pulse (0.5s in, 1s out)
- **Big hit:** 0.1s slow-motion then normal speed

### Audio Cues (Per Attack)
| Attack | Sound | When |
|---|---|---|
| Death Bolt telegraph | Rising whine | During charge |
| Shadow Zones | Low rumble | During telegraph |
| Summon Burst | Creepy groan building | During channel |
| Death Beam | Electric crackling → sustained buzz | Charge → fire |
| Titan Slam | Accelerating footsteps → BOOM | Telegraph → impact |
| Titan Charge | Growl → rushing wind | Telegraph → charge |
| Phase transition | Dramatic chord sting | On threshold |

### Boss Entrance
- Grow from 0 to full scale over 1.5s
- Ground cracks radiate outward
- Title card: "TITAN" / "OVERLORD" in gold/red
- Nearby tier 1-3 zombies scatter (even zombies fear the boss)
- Aura escalates per phase (subtle → large + embers → violent pulsing)

---

## Implementation Priority (Impact/Effort)

1. Death Bolt Volley (3-bolt) — highest impact, low effort
2. Phase system for both bosses — dramatic structure
3. Shadow Zones for Overlord — area denial, forces movement
4. Screen shake on attacks — massive feel improvement, tiny code
5. Titan Charge — variety for melee-only boss
6. Boss entrance sequence — first impressions
7. Death Beam — signature "oh no" attack
8. Bone Barrage for Titan — ranged threat for melee boss
9. Summon Burst — strategic complexity
10. Dark Nova — dramatic Phase 3 moment

---

## Sources
- Vampire Survivors, Brotato, Halls of Torment, Soulstone Survivors boss design analysis
- Game Developer articles on boss structure and telegraphing
- GDKeys combat design analysis
- Bullet hell pattern design guides
- Nielsen Norman Group children's UX research
