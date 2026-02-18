# Droids Web Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the Python Droids game into a single `index.html` mobile-first web game with canvas rendering, swipe input, levels and survival modes, and ad placeholder slots.

**Architecture:** All game logic lives in pure JS functions inside a single `index.html`. Core game logic (movement, collision, state) is written as pure functions testable with Node.js. Canvas rendering and input handling are wired up around that core.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES6), HTML5 Canvas 2D API, Node.js v22 (for running logic tests only — no runtime dependency).

---

## Reference

Design doc: `docs/plans/2026-02-17-web-game-design.md`

Existing Python logic to port (same in both `game.py` and `tk_game.py`):
- `move_player(player_spot, key)` — maps direction string to new `[row, col]`
- `move_enemy(player_spot, enemy_spot, board_length)` — moves enemy one step closer to player (has a bounds bug — `board_length` should be `board_length - 1`)
- `enemy_spot(board_size)` — random `[row, col]`
- `build_board(...)` — has a mutation bug during iteration; rewrite cleanly in JS

---

## Task 1: HTML Skeleton and CSS Layout

**Files:**
- Create: `index.html`

**Step 1: Create `index.html` with this exact structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Droids</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111;
      color: #fff;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .ad-banner {
      width: 100%;
      max-width: 500px;
      height: 60px;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-style: italic;
      color: #888;
      font-size: 12px;
      flex-shrink: 0;
    }
    #game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 500px;
      flex: 1;
    }
    #hud {
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 14px;
      background: #222;
    }
    #canvas {
      display: block;
      touch-action: none;
    }
    #mode-select {
      display: flex;
      gap: 16px;
      padding: 20px;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    #mode-select h2 {
      font-size: 24px;
      letter-spacing: 4px;
      margin-bottom: 8px;
    }
    #mode-select p {
      font-size: 12px;
      color: #888;
      margin-bottom: 16px;
    }
    .mode-btn {
      background: #333;
      color: #fff;
      border: 2px solid #555;
      padding: 14px 32px;
      font-size: 16px;
      font-family: monospace;
      cursor: pointer;
      width: 200px;
      letter-spacing: 2px;
    }
    .mode-btn:hover, .mode-btn:active { background: #555; }
  </style>
</head>
<body>
  <div id="ad-banner-top" class="ad-banner" data-ad-slot="top">Advertisement</div>
  <div id="game-container">
    <div id="hud">
      <span id="mode-label">DROIDS</span>
      <span id="level-display"></span>
      <span id="score-display"></span>
      <span id="best-display"></span>
    </div>
    <canvas id="canvas"></canvas>
    <div id="mode-select">
      <h2>DROIDS</h2>
      <p>Survive. Trick enemies into each other.</p>
      <button class="mode-btn" id="btn-levels">LEVELS</button>
      <button class="mode-btn" id="btn-survival">SURVIVAL</button>
    </div>
  </div>
  <div id="ad-banner-bottom" class="ad-banner" data-ad-slot="bottom">Advertisement</div>
  <script>
    // GAME LOGIC GOES HERE (Tasks 2–11)
  </script>
</body>
</html>
```

**Step 2: Open `index.html` in a browser and verify**

Expected: Dark background, "Advertisement" banners top and bottom, gray HUD bar, "DROIDS" title with two buttons. Should look reasonable on a narrow (mobile) viewport.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML skeleton and CSS layout for web game"
```

---

## Task 2: Game State and Initialization

**Files:**
- Modify: `index.html` — add state and init inside `<script>`

**Step 1: Add state object and `initGame` function inside the `<script>` tag**

```js
// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  mode: 'levels',          // 'levels' | 'survival'
  level: 1,
  score: 0,
  bestScore: parseInt(localStorage.getItem('droids_best_score') || '0'),
  phase: 'menu',           // 'menu' | 'playing' | 'gameover'
  boardSize: 10,
  playerPos: [5, 5],
  enemies: [],             // array of [row, col]
  killed: [],              // array of [row, col] (enemy-enemy collision wreckage)
  moveCount: 0,            // survival mode: track moves for enemy spawning
};

// ─── Init ────────────────────────────────────────────────────────────────────
function initGame(mode) {
  state.mode = mode;
  state.level = 1;
  state.score = 0;
  state.moveCount = 0;
  state.phase = 'playing';
  state.boardSize = 10;
  resetLevel();
  document.getElementById('mode-select').style.display = 'none';
  updateHud();
}

function resetLevel() {
  const mid = Math.floor(state.boardSize / 2);
  state.playerPos = [mid, mid];
  state.killed = [];
  state.enemies = [];
  const count = state.level * 4;
  for (let i = 0; i < count; i++) {
    state.enemies.push(randomPos(state.boardSize, state.playerPos));
  }
}

function randomPos(boardSize, exclude) {
  let pos;
  do {
    pos = [
      Math.floor(Math.random() * boardSize),
      Math.floor(Math.random() * boardSize),
    ];
  } while (exclude && pos[0] === exclude[0] && pos[1] === exclude[1]);
  return pos;
}

function updateHud() {
  const modeText = state.mode === 'levels' ? 'LEVELS' : 'SURVIVAL';
  document.getElementById('mode-label').textContent = modeText;
  document.getElementById('level-display').textContent =
    state.mode === 'levels' ? `Level ${state.level}` : '';
  document.getElementById('score-display').textContent = `Score: ${state.score}`;
  document.getElementById('best-display').textContent =
    state.mode === 'survival' ? `Best: ${state.bestScore}` : '';
}
```

**Step 2: Wire up the mode buttons** (add below the state/init functions)

```js
document.getElementById('btn-levels').addEventListener('click', () => initGame('levels'));
document.getElementById('btn-survival').addEventListener('click', () => initGame('survival'));
```

**Step 3: Verify in browser**

Click "LEVELS" → mode-select div should disappear. No errors in console.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add game state, init, and mode selection wiring"
```

---

## Task 3: Core Game Logic (Pure Functions)

**Files:**
- Create: `docs/plans/test_logic.js` (temporary test file — deleted after Task 4)
- Modify: `index.html` — add logic functions inside `<script>`

**Step 1: Add pure game logic functions to `index.html` `<script>` (after init code)**

```js
// ─── Pure Game Logic ─────────────────────────────────────────────────────────

function movePlayer(pos, dir, boardSize) {
  const [row, col] = pos;
  const moves = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  if (!moves[dir]) return pos;
  const [dr, dc] = moves[dir];
  const newRow = Math.max(0, Math.min(boardSize - 1, row + dr));
  const newCol = Math.max(0, Math.min(boardSize - 1, col + dc));
  return [newRow, newCol];
}

function moveEnemy(enemy, player, boardSize) {
  const [er, ec] = enemy;
  const [pr, pc] = player;
  let nr = er;
  let nc = ec;
  // Move one step toward player on each axis independently
  if (pr < er && er > 0)             nr = er - 1;
  if (pr > er && er < boardSize - 1) nr = er + 1;
  if (pc < ec && ec > 0)             nc = ec - 1;
  if (pc > ec && ec < boardSize - 1) nc = ec + 1;
  return [nr, nc];
}

function detectCollisions(enemies) {
  // Returns { survivors: [[r,c],...], newKilled: [[r,c],...] }
  const seen = new Map();
  const collided = new Set();
  for (const e of enemies) {
    const key = `${e[0]},${e[1]}`;
    if (seen.has(key)) {
      collided.add(key);
    } else {
      seen.set(key, e);
    }
  }
  const survivors = enemies.filter(e => !collided.has(`${e[0]},${e[1]}`));
  const newKilled = [...collided].map(k => k.split(',').map(Number));
  return { survivors, newKilled };
}

function isPlayerCaught(playerPos, enemies) {
  return enemies.some(e => e[0] === playerPos[0] && e[1] === playerPos[1]);
}

function isPlayerOnKilled(playerPos, killed) {
  return killed.some(k => k[0] === playerPos[0] && k[1] === playerPos[1]);
}
```

**Step 2: Create `docs/plans/test_logic.js`** to test the pure functions with Node.js

```js
// Inline copies of pure functions for Node.js testing
function movePlayer(pos, dir, boardSize) {
  const [row, col] = pos;
  const moves = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  if (!moves[dir]) return pos;
  const [dr, dc] = moves[dir];
  const newRow = Math.max(0, Math.min(boardSize - 1, row + dr));
  const newCol = Math.max(0, Math.min(boardSize - 1, col + dc));
  return [newRow, newCol];
}

function moveEnemy(enemy, player, boardSize) {
  const [er, ec] = enemy;
  const [pr, pc] = player;
  let nr = er;
  let nc = ec;
  if (pr < er && er > 0)             nr = er - 1;
  if (pr > er && er < boardSize - 1) nr = er + 1;
  if (pc < ec && ec > 0)             nc = ec - 1;
  if (pc > ec && ec < boardSize - 1) nc = ec + 1;
  return [nr, nc];
}

function detectCollisions(enemies) {
  const seen = new Map();
  const collided = new Set();
  for (const e of enemies) {
    const key = `${e[0]},${e[1]}`;
    if (seen.has(key)) { collided.add(key); } else { seen.set(key, e); }
  }
  const survivors = enemies.filter(e => !collided.has(`${e[0]},${e[1]}`));
  const newKilled = [...collided].map(k => k.split(',').map(Number));
  return { survivors, newKilled };
}

function isPlayerCaught(playerPos, enemies) {
  return enemies.some(e => e[0] === playerPos[0] && e[1] === playerPos[1]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else           { console.error(`  ✗ ${label}`); failed++; }
}

function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

console.log('\nmovePlayer:');
assert('moves up',             deepEq(movePlayer([5,5],'up',10),    [4,5]));
assert('moves down',           deepEq(movePlayer([5,5],'down',10),  [6,5]));
assert('moves left',           deepEq(movePlayer([5,5],'left',10),  [5,4]));
assert('moves right',          deepEq(movePlayer([5,5],'right',10), [5,6]));
assert('clamps at top edge',   deepEq(movePlayer([0,5],'up',10),    [0,5]));
assert('clamps at bottom edge',deepEq(movePlayer([9,5],'down',10),  [9,5]));
assert('clamps at left edge',  deepEq(movePlayer([5,0],'left',10),  [5,0]));
assert('clamps at right edge', deepEq(movePlayer([5,9],'right',10), [5,9]));
assert('unknown dir no-ops',   deepEq(movePlayer([5,5],'x',10),     [5,5]));

console.log('\nmoveEnemy (boardSize=10):');
assert('chases down-right', deepEq(moveEnemy([0,0],[5,5],10), [1,1]));
assert('chases up-left',    deepEq(moveEnemy([9,9],[5,5],10), [8,8]));
assert('stops at top edge', deepEq(moveEnemy([0,5],[0,0],10), [0,4]));  // can't go further up (already 0)
assert('stops at left edge',deepEq(moveEnemy([5,0],[5,0],10), [5,0]));  // same cell, no movement

console.log('\ndetectCollisions:');
const r1 = detectCollisions([[1,1],[2,2],[1,1]]);
assert('removes colliding pair',    r1.survivors.length === 1);
assert('records killed position',   deepEq(r1.newKilled, [[1,1]]));
assert('keeps non-colliders',       deepEq(r1.survivors, [[2,2]]));

const r2 = detectCollisions([[1,1],[2,2],[3,3]]);
assert('no collision: all survive', r2.survivors.length === 3);
assert('no collision: no killed',   r2.newKilled.length === 0);

console.log('\nisPlayerCaught:');
assert('caught when on enemy', isPlayerCaught([3,3], [[3,3],[4,4]]));
assert('not caught',           !isPlayerCaught([3,3], [[1,1],[2,2]]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

**Step 3: Run tests**

```bash
node docs/plans/test_logic.js
```

Expected output: all `✓`, `13 passed, 0 failed` (adjust count if tests differ)

**Step 4: Fix any failures, re-run until all pass**

**Step 5: Commit**

```bash
git add index.html docs/plans/test_logic.js
git commit -m "feat: add core game logic (movePlayer, moveEnemy, detectCollisions)"
```

---

## Task 4: Canvas Sizing and Rendering

**Files:**
- Modify: `index.html` — add canvas sizing and `redraw()` function

**Step 1: Add canvas sizing (after state/init code)**

```js
// ─── Canvas ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const adHeight = 60 * 2 + 40; // top banner + bottom banner + hud approx
  const available = Math.min(
    window.innerWidth,
    window.innerHeight - adHeight,
    500
  );
  canvas.width = available;
  canvas.height = available;
  if (state.phase === 'playing' || state.phase === 'gameover') redraw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // call once on load
```

**Step 2: Add `redraw()` and cell drawing functions (after sizing code)**

```js
function redraw() {
  const size = canvas.width;
  const cellSize = size / state.boardSize;
  ctx.clearRect(0, 0, size, size);

  // Draw grid background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);

  // Draw grid lines
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= state.boardSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(size, i * cellSize);
    ctx.stroke();
  }

  // Draw killed markers
  for (const [r, c] of state.killed) {
    drawKilled(r, c, cellSize);
  }

  // Draw enemies
  for (const [r, c] of state.enemies) {
    drawEnemy(r, c, cellSize);
  }

  // Draw player
  const [pr, pc] = state.playerPos;
  drawPlayer(pr, pc, cellSize);

  // Draw game over overlay
  if (state.phase === 'gameover') {
    drawGameOver();
  }
}

function drawPlayer(row, col, cellSize) {
  const x = col * cellSize + cellSize / 2;
  const y = row * cellSize + cellSize / 2;
  const r = cellSize * 0.35;
  ctx.fillStyle = '#2266ff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(row, col, cellSize) {
  const x = col * cellSize;
  const y = row * cellSize;
  const pad = cellSize * 0.2;
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = cellSize * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad);
  ctx.lineTo(x + cellSize - pad, y + cellSize - pad);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + cellSize - pad, y + pad);
  ctx.lineTo(x + pad, y + cellSize - pad);
  ctx.stroke();
}

function drawKilled(row, col, cellSize) {
  ctx.fillStyle = '#888';
  ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${cellSize * 0.6}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('*', col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
}

function drawGameOver() {
  const size = canvas.width;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.1}px monospace`;
  ctx.fillText('GAME OVER', size / 2, size * 0.38);
  ctx.font = `${size * 0.055}px monospace`;
  ctx.fillText(`Score: ${state.score}`, size / 2, size * 0.52);
  if (state.mode === 'survival' && state.score >= state.bestScore) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('NEW BEST!', size / 2, size * 0.62);
    ctx.fillStyle = '#fff';
  }
  ctx.font = `${size * 0.045}px monospace`;
  ctx.fillStyle = '#aaa';
  ctx.fillText('tap or press any key to restart', size / 2, size * 0.76);
}
```

**Step 3: Temporarily call `redraw()` after `initGame` to verify rendering**

In browser: click "LEVELS" → should see a white grid with a blue circle in the center and red X enemies scattered around. No console errors.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add canvas sizing and full rendering (player, enemies, killed, game over)"
```

---

## Task 5: The Game Step (State Update)

**Files:**
- Modify: `index.html` — add `step()` function

**Step 1: Add `step(dir)` function after the pure logic functions**

This is the main game update. Called once per player input.

```js
// ─── Game Step ───────────────────────────────────────────────────────────────
function step(dir) {
  if (state.phase !== 'playing') return;

  // 1. Move player
  const newPos = movePlayer(state.playerPos, dir, state.boardSize);
  state.playerPos = newPos;

  // 2. Check if player walked into a killed spot (allowed — no death)
  // (killed spots are inert obstacles to walk through)

  // 3. Move all enemies toward player
  state.enemies = state.enemies.map(e => moveEnemy(e, state.playerPos, state.boardSize));

  // 4. Detect enemy-enemy collisions
  const { survivors, newKilled } = detectCollisions(state.enemies);
  state.enemies = survivors;
  state.killed = [...state.killed, ...newKilled];

  // 5. Check if player caught by an enemy
  if (isPlayerCaught(state.playerPos, state.enemies)) {
    gameOver();
    return;
  }

  // 6. Survival mode: increment score and spawn enemies
  if (state.mode === 'survival') {
    state.score++;
    state.moveCount++;
    if (state.moveCount % 20 === 0) {
      state.enemies.push(randomPos(state.boardSize, state.playerPos));
    }
  }

  // 7. Levels mode: check if all enemies cleared
  if (state.mode === 'levels' && state.enemies.length === 0) {
    state.level++;
    state.score = state.level - 1;
    resetLevel();
  }

  updateHud();
  redraw();
}

function gameOver() {
  state.phase = 'gameover';
  if (state.mode === 'survival' && state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('droids_best_score', state.bestScore);
  }
  updateHud();
  redraw(); // draws game over overlay
}
```

**Step 2: Verify logic by temporarily adding a test call in the browser console**

After clicking LEVELS, open browser DevTools console and run:
```js
step('right'); // player should move right, enemies should step closer
```

Check that `state.playerPos`, `state.enemies` updated correctly and canvas redraws.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add game step function with full update loop"
```

---

## Task 6: Input Handling

**Files:**
- Modify: `index.html` — add keyboard and swipe event handlers

**Step 1: Add keyboard input handler (after `step` function)**

```js
// ─── Input ───────────────────────────────────────────────────────────────────
const KEY_MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

document.addEventListener('keydown', (e) => {
  if (state.phase === 'gameover') {
    restartGame();
    return;
  }
  const dir = KEY_MAP[e.key];
  if (dir) {
    e.preventDefault();
    step(dir);
  }
});
```

**Step 2: Add swipe input handler**

```js
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 20;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (state.phase === 'gameover') {
    restartGame();
    return;
  }
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
  if (Math.abs(dx) >= Math.abs(dy)) {
    step(dx > 0 ? 'right' : 'left');
  } else {
    step(dy > 0 ? 'down' : 'up');
  }
}, { passive: false });
```

**Step 3: Add `restartGame()` function**

```js
function restartGame() {
  document.getElementById('mode-select').style.display = 'flex';
  state.phase = 'menu';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateHud();
}
```

**Step 4: Test in browser**

- Start a Levels game, use arrow keys to move — player moves, enemies chase
- Game over → overlay appears → press any key → mode select reappears
- On mobile / DevTools responsive mode: swipe to move

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add keyboard and swipe input handling with restart"
```

---

## Task 7: Fix Rendering on First Draw and Menu State

**Files:**
- Modify: `index.html` — polish startup state

**Step 1: Ensure canvas shows something useful before a mode is selected**

Add this after `resizeCanvas()` is defined (replaces or supplements the resize call):

```js
// Draw a static "attract" grid on load
function drawAttract() {
  const size = canvas.width;
  const boardSize = 10;
  const cellSize = size / boardSize;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= boardSize; i++) {
    ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(size, i * cellSize); ctx.stroke();
  }
  // Draw a few static decorative elements
  drawPlayer(5, 5, cellSize);
  [[1,1],[2,3],[7,8],[8,2],[3,7]].forEach(([r,c]) => drawEnemy(r,c,cellSize));
  [[4,4],[6,6]].forEach(([r,c]) => drawKilled(r,c,cellSize));
}
```

Call `drawAttract()` at the bottom of the script (after all function definitions), and also in `resizeCanvas()` when `state.phase === 'menu'`:

```js
// In resizeCanvas(), update the conditional:
function resizeCanvas() {
  const adHeight = 60 * 2 + 40;
  const available = Math.min(window.innerWidth, window.innerHeight - adHeight, 500);
  canvas.width = available;
  canvas.height = available;
  if (state.phase === 'playing' || state.phase === 'gameover') redraw();
  else drawAttract();
}
```

**Step 2: Verify in browser**

Page load shows a grid preview with static player and enemies behind the mode-select buttons.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add attract-mode grid display on menu screen"
```

---

## Task 8: Clean Up Test File and Final Polish

**Files:**
- Delete: `docs/plans/test_logic.js`
- Modify: `index.html` — final tweaks

**Step 1: Run the Node.js tests one final time**

```bash
node docs/plans/test_logic.js
```

Expected: all passing.

**Step 2: Delete the test file**

```bash
rm docs/plans/test_logic.js
```

**Step 3: Full browser test checklist**

Open `index.html` directly in browser (no server needed). Verify:

- [ ] Page loads without console errors
- [ ] Ad placeholder banners visible top and bottom
- [ ] Attract grid shows on menu screen
- [ ] "LEVELS" button starts a levels game: player in center, enemies scattered
- [ ] Arrow keys / WASD move player
- [ ] Enemies move toward player each turn
- [ ] Two enemies colliding → gray `*` marker appears at collision cell
- [ ] Player walking into enemy → game over overlay
- [ ] Game over overlay shows score, "tap or press any key to restart"
- [ ] Restarting returns to mode select
- [ ] "SURVIVAL" button starts survival: enemies spawn every 20 moves, score counts up
- [ ] Best score persists across page refresh (localStorage)
- [ ] "NEW BEST!" shown on survival game over when score beats best
- [ ] Canvas resizes on window resize without errors
- [ ] On mobile (DevTools responsive mode, or real device): swipe gestures work

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: complete Droids web game - canvas, swipe input, levels + survival modes"
```

---

## Done

The result is a fully playable `index.html` with:
- Mobile-first swipe controls + desktop keyboard support
- Levels mode (clear all enemies to advance) and Survival mode (last as long as possible)
- localStorage best score persistence
- Ad placeholder slots ready for a real ad network
- Zero external dependencies, hostable as a static file anywhere
