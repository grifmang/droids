# Survival Wave System Design

**Date:** 2026-03-06
**Scope:** Replace current Survival mode with wave-based progressive difficulty

## Overview

The current Survival mode (fixed spawn rate of 1 enemy every 20 moves, score = move count) is replaced with a wave-based system. Waves get progressively harder through enemy count scaling and new enemy types. The mode is endless — play until you die.

## Wave Progression

### Enemy Counts

| Wave | Normal (X) | Fast (F) | Random (R) | Total |
|------|-----------|----------|------------|-------|
| 1    | 4         | 0        | 0          | 4     |
| 2    | 6         | 0        | 0          | 6     |
| 3    | 8         | 0        | 0          | 8     |
| 4    | 8         | 2        | 0          | 10    |
| 5    | 8         | 4        | 0          | 12    |
| 6    | 10        | 4        | 0          | 14    |
| 7    | 10        | 4        | 2          | 16    |
| 8+   | +2 total per wave, mix shifts toward harder types |

**Approximate formula:**
- Total enemies = `4 + (wave * 2)`
- Fast enemies introduced at wave 4
- Random enemies introduced at wave 7
- As waves increase, proportion shifts from normal toward fast/random

### Wave Lifecycle

1. Enemies spawn on random positions (avoiding player and existing wreckage)
2. Player clears all enemies by causing enemy-enemy collisions
3. "WAVE X CLEAR!" overlay shown briefly
4. Score bonuses displayed
5. 2 bonus asterisks placed randomly on the board
6. Player gets 3 free moves to reposition and collect asterisks
7. Next wave spawns

## Enemy Types

### Normal (X) — Red (#ff3333)
- Moves 1 cell toward player per turn on both axes
- Standard chase AI (existing behavior)
- Present from wave 1

### Fast (F) — Orange (#ff8800)
- Moves 2 cells toward player per turn (two steps in one turn)
- Same chase AI, covers more ground
- Introduced at wave 4
- Harder to bait into collisions

### Random (R) — Purple (#cc33ff)
- 50% chance to chase player, 50% chance to move in a random direction
- Unpredictable movement pattern
- Introduced at wave 7
- All collision rules apply (any two enemies on same cell = wreckage)

## Scoring

- **Base:** 100 points per wave cleared
- **Speed bonus:** +50 points if wave cleared in fewer than 15 moves
- **No-damage bonus:** +25 points if no HP lost during the wave
- Score is cumulative across all waves
- Best score persisted to `localStorage` (replaces `droids_best_score`)

## HP System

- Start with 3 HP, maximum 5 HP
- Each enemy on player's cell deals 1 damage per turn
- Walking onto an asterisk (`*`) restores +1 HP (capped at max)
- 2 bonus asterisks placed at the start of each between-wave break

## HUD

```
SURVIVAL  Wave: 7  Score: 825  Best: 1200  HP: ^^^..
```

- Wave number prominently displayed
- Score and best score shown
- HP shown visually (filled/empty indicators)

## Game Over

- "GAME OVER" overlay
- Final wave reached and total score displayed
- "NEW BEST!" if score exceeds stored best
- Mode selection buttons reappear

## Visual Feedback

- Wave clear: "WAVE X CLEAR!" text overlay
- Score breakdown: "+100 base, +50 speed, +25 no-damage"
- Enemy characters: X (normal), F (fast), R (random)
- Enemy colors: red, orange, purple respectively
- Wreckage: `*` in brown (#886600) — unchanged

## Scope Boundaries

**Changed:** Survival mode internals, HUD for survival, game over screen for survival
**Unchanged:** Board size (20x20), player controls, movement mechanics, Levels mode, mobile layout, keypad, rendering pipeline
