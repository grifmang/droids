# Droids Web Game — Design Document
**Date:** 2026-02-17
**Status:** Approved

---

## Overview

Convert the existing Python "Droids" game (a BASIC VAX Cluster remake) into a mobile-first web game playable in any browser. Delivered as a single self-contained `index.html` file with no external dependencies.

---

## Architecture

### File Structure

```
index.html          ← entire game: HTML + CSS + JS
docs/plans/         ← design and planning documents
```

No build step. No frameworks. No dependencies. Hostable on GitHub Pages, Netlify, or any static CDN by dropping the single file.

### HTML Structure

```
<head>
  meta viewport (mobile), title, inline <style>

<body>
  #ad-banner-top        — placeholder banner ad slot (60px tall, gray)
  #game-container
    #hud                — level, score, mode label (DOM text, not canvas)
    #canvas             — the game grid (HTML5 Canvas)
    #mode-select        — "Levels" / "Survival" buttons (shown on menu/game over)
  #ad-banner-bottom     — placeholder banner ad slot (60px tall, gray)

<script>
  all game logic inline
```

---

## Game Logic

### State Object

```js
state = {
  mode: 'levels' | 'survival',
  level: 1,
  score: 0,
  bestScore: 0,          // persisted in localStorage
  phase: 'menu' | 'playing' | 'gameover',
  boardSize: 10,
  playerPos: [row, col],
  enemies: [[row, col], ...],   // live enemy positions
  killed: [[row, col], ...],    // wreckage positions (enemy-enemy collisions)
}
```

### Game Loop (Event-Driven)

The game updates only when the player moves — no continuous ticker. On each move:

1. Compute new player position from swipe/key direction
2. Bounds-check (clamp or block at grid edges)
3. Move all enemies one step toward player (`move_enemy` logic, with bounds bug fixed)
4. Detect enemy-enemy collisions → convert to killed markers
5. Detect player-enemy collision → transition to `gameover` phase
6. In Levels mode: detect all enemies dead → advance to next level
7. Redraw canvas

### Modes

**Levels mode:**
- Start at level 1 with `level × 4` enemies
- Clearing all enemies (all become killed markers) → next level, more enemies
- Score = current level reached

**Survival mode:**
- Fixed board size, one continuous game
- Every 20 player moves, one new enemy spawns
- Score = total moves survived
- Best score saved to `localStorage`

### Bug Fixes vs. Python Version

| Bug | Fix |
|---|---|
| `move_enemy` uses `board_length` as lower bound (should be `board_length - 1`) | Use `board_length - 1` |
| `build_board` mutation loop: pops/reinserts during `enumerate` | Rewrite using a clean collision-detection pass |
| `tk_game.py` `UnboundLocalError` on `board` scoping | N/A — full rewrite in JS, scoping handled correctly |
| `game.py` double `keyboard.read_key()` per loop | N/A — event-driven JS input |

---

## Input

### Mobile (Primary)

- `touchstart` — record start position
- `touchend` — compute delta X and delta Y
- Dominant axis determines direction (up/down/left/right)
- Minimum swipe threshold: 20px (prevents accidental triggers)

### Desktop (Fallback)

- Arrow keys: move in corresponding direction
- WASD: same as arrow keys

---

## Rendering

All drawing via HTML5 Canvas 2D API. `redraw()` called after every state change.

### Canvas Sizing

```js
const size = Math.min(window.innerWidth, window.innerHeight * 0.75, 500);
canvas.width = size;
canvas.height = size;
cellSize = size / boardSize;
```

Recalculated on `window.resize`.

### Visual Style

| Entity | Appearance |
|---|---|
| Empty cell | White fill, light gray grid lines |
| Player (`©`) | Blue filled circle |
| Enemy (`X`) | Red X-shaped cross strokes |
| Killed (`*`) | Dark gray fill, `*` text centered (nostalgic nod to original) |

### Overlays

- **Game Over:** Semi-transparent black overlay on canvas, "GAME OVER" + final score + "Tap to restart" text
- **Menu:** Mode selection buttons shown in `#mode-select` div above/below canvas

### HUD

Level and score displayed in `#hud` DOM element above canvas (not drawn on canvas).

---

## Ad Placeholders

Two `<div>` elements styled as placeholder banner slots:

```html
<div id="ad-banner-top" data-ad-slot="top">Advertisement</div>
<div id="ad-banner-bottom" data-ad-slot="bottom">Advertisement</div>
```

- Height: 60px, light gray background, centered italic text
- `data-ad-slot` attributes allow a real ad network script to target them later
- No ad SDK integrated yet

---

## Data Persistence

- `localStorage.setItem('droids_best_score', score)` on game over in survival mode
- `localStorage.getItem('droids_best_score')` on page load to initialize `state.bestScore`

---

## Out of Scope (This Iteration)

- Global leaderboard / backend
- Sound effects
- Animations / transitions
- Multiple board size options
- Ad network integration (Google AdSense or similar)
