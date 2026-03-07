# Survival Wave System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current flat Survival mode with a wave-based progressive difficulty system featuring multiple enemy types, scoring bonuses, and between-wave breaks.

**Architecture:** All changes are in `index.html` (single-file game). New wave state fields are added to the `state` object. The `step()` function gets wave-aware logic replacing the old moveCount-based spawning. New enemy types (Fast, Random) use the existing `moveEnemy` as a base with type-specific behavior variants.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas (no dependencies)

---

### Task 1: Add Wave State Fields

**Files:**
- Modify: `index.html:180-195` (state object)

**Step 1: Add new state fields**

Replace the state object with expanded wave fields:

```javascript
const state = {
  mode: 'levels',
  level: 1,
  score: 0,
  bestScore: (function() {
    try { return parseInt(localStorage.getItem('droids_best_score') || '0'); }
    catch { return 0; }
  })(),
  phase: 'menu',           // 'menu' | 'playing' | 'gameover'
  boardSize: 20,
  playerPos: [10, 10],
  enemies: [],             // array of { pos: [row, col], type: 'normal'|'fast'|'random' }
  killed: [],              // array of [row, col] (wreckage)
  moveCount: 0,
  hp: 3,
  // Wave system (survival mode)
  wave: 1,
  waveMovesUsed: 0,        // moves taken in current wave (for speed bonus)
  waveDamageTaken: false,   // whether player took damage this wave (for no-damage bonus)
  breakMovesLeft: 0,        // free moves remaining in between-wave break (0 = not in break)
};
```

**Step 2: Update `initGame` to reset wave fields**

In the `initGame` function (~line 198), add resets for the new fields:

```javascript
function initGame(mode) {
  state.mode = mode;
  state.level = 1;
  state.score = 0;
  state.moveCount = 0;
  state.phase = 'playing';
  state.boardSize = 20;
  state.hp = 3;
  state.wave = 1;
  state.waveMovesUsed = 0;
  state.waveDamageTaken = false;
  state.breakMovesLeft = 0;
  resetLevel();
  document.getElementById('mode-select').style.display = 'none';
  document.getElementById('keypad').style.display = 'grid';
  updateHud();
  resizeCanvas();
}
```

**Step 3: Verify manually**

Open `index.html` in browser. Start Levels mode and Survival mode — both should still work identically to before (no behavioral changes yet).

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat(survival): add wave state fields to game state"
```

---

### Task 2: Convert Enemies to Typed Objects

**Files:**
- Modify: `index.html` (multiple locations)

Currently enemies are `[row, col]` arrays. Convert them to `{ pos: [row, col], type: 'normal' }` objects so we can distinguish enemy types.

**Step 1: Update `resetLevel` to create typed enemies**

```javascript
function resetLevel() {
  const mid = Math.floor(state.boardSize / 2);
  state.playerPos = [mid, mid];
  state.killed = [];
  state.enemies = [];
  const count = state.level * 4;
  for (let i = 0; i < count; i++) {
    const exclude = [state.playerPos, ...state.enemies.map(e => e.pos)];
    state.enemies.push({ pos: randomPos(state.boardSize, exclude), type: 'normal' });
  }
  for (let i = 0; i < 2; i++) {
    const exclude = [state.playerPos, ...state.enemies.map(e => e.pos), ...state.killed];
    state.killed.push(randomPos(state.boardSize, exclude));
  }
}
```

**Step 2: Update `step()` — enemy movement**

Change line ~483 from:
```javascript
state.enemies = state.enemies.map(e => moveEnemy(e, state.playerPos, state.boardSize));
```
to:
```javascript
state.enemies = state.enemies.map(e => ({
  ...e,
  pos: moveEnemy(e.pos, state.playerPos, state.boardSize),
}));
```

**Step 3: Update `step()` — collision detection**

Change the `detectCollisions` call and result handling. The `detectCollisions` function needs to work with typed enemies now. Update it:

```javascript
function detectCollisions(enemies) {
  const seen = new Map();
  const collided = new Set();
  for (const e of enemies) {
    const key = `${e.pos[0]},${e.pos[1]}`;
    if (seen.has(key)) {
      collided.add(key);
    } else {
      seen.set(key, e);
    }
  }
  const survivors = enemies.filter(e => !collided.has(`${e.pos[0]},${e.pos[1]}`));
  const newKilled = [...collided].map(k => k.split(',').map(Number));
  return { survivors, newKilled };
}
```

**Step 4: Update `step()` — player-enemy contact**

Change the hit detection from:
```javascript
const hitEnemies = state.enemies.filter(
  e => e[0] === state.playerPos[0] && e[1] === state.playerPos[1]
);
```
to:
```javascript
const hitEnemies = state.enemies.filter(
  e => e.pos[0] === state.playerPos[0] && e.pos[1] === state.playerPos[1]
);
```

And the filter after:
```javascript
state.enemies = state.enemies.filter(
  e => !(e.pos[0] === state.playerPos[0] && e.pos[1] === state.playerPos[1])
);
```

**Step 5: Update `step()` — survival spawn**

Change:
```javascript
state.enemies.push(randomPos(state.boardSize, [state.playerPos, ...state.enemies]));
```
to:
```javascript
state.enemies.push({
  pos: randomPos(state.boardSize, [state.playerPos, ...state.enemies.map(e => e.pos)]),
  type: 'normal',
});
```

**Step 6: Update `step()` — levels mode clear check**

No change needed — `state.enemies.length === 0` still works with objects.

**Step 7: Update `drawBoard` to use typed enemies**

Change the enemy check in `drawBoard` (~line 392):
```javascript
} else if (enemies.some(e => e[0] === r && e[1] === c)) {
  char = 'X'; color = T.enemy;
```
to:
```javascript
} else if (enemies.some(e => e.pos[0] === r && e.pos[1] === c)) {
  char = 'X'; color = T.enemy;
```

**Step 8: Update `isPlayerCaught` (if still referenced)**

```javascript
function isPlayerCaught(playerPos, enemies) {
  return enemies.some(e => e.pos[0] === playerPos[0] && e.pos[1] === playerPos[1]);
}
```

**Step 9: Update `drawAttract` — attract screen enemies are raw arrays, convert them**

Change the `drawBoard` call in `drawAttract` to pass typed enemies:
```javascript
drawBoard(boardSize, [10, 10],
  [{pos:[2,2],type:'normal'},{pos:[4,6],type:'normal'},{pos:[15,16],type:'normal'},{pos:[16,4],type:'normal'},{pos:[6,14],type:'normal'}],
  [[8,8],[12,12]],
  pad, cellSize);
```

**Step 10: Verify manually**

Open browser. Both modes should play identically to before. Enemies chase, collide, wreckage works, HP works.

**Step 11: Commit**

```bash
git add index.html
git commit -m "refactor: convert enemies from arrays to typed objects"
```

---

### Task 3: Add Enemy Type Rendering

**Files:**
- Modify: `index.html` (terminal colors + drawBoard)

**Step 1: Add new enemy colors to the T object**

After `enemy: '#ff3333'` (~line 365), the colors object already exists. Add:

```javascript
const T = {
  bg:      '#000000',
  border:  '#33ff33',
  empty:   '#1a3300',
  player:  '#33ff33',
  enemy:   '#ff3333',
  enemyFast:   '#ff8800',
  enemyRandom: '#cc33ff',
  killed:  '#886600',
  overlay: 'rgba(0,6,0,0.88)',
  score:   '#33ff33',
  best:    '#ffff33',
  prompt:  '#1a6600',
};
```

**Step 2: Update `drawBoard` to render enemy types**

Replace the enemy rendering branch:

```javascript
} else if (enemies.some(e => e.pos[0] === r && e.pos[1] === c)) {
  const enemy = enemies.find(e => e.pos[0] === r && e.pos[1] === c);
  if (enemy.type === 'fast') {
    char = 'F'; color = T.enemyFast;
  } else if (enemy.type === 'random') {
    char = 'R'; color = T.enemyRandom;
  } else {
    char = 'X'; color = T.enemy;
  }
```

**Step 3: Verify manually**

No visible change yet (all enemies are still type 'normal'). Game should render identically.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add enemy type colors and type-aware rendering"
```

---

### Task 4: Add Enemy Type Movement Behaviors

**Files:**
- Modify: `index.html` (step function, add moveEnemyByType)

**Step 1: Add `moveEnemyByType` function**

Add after the existing `moveEnemy` function (~line 293):

```javascript
function moveEnemyByType(enemy, player, boardSize) {
  if (enemy.type === 'fast') {
    // Fast enemies: take two steps toward player
    let pos = moveEnemy(enemy.pos, player, boardSize);
    pos = moveEnemy(pos, player, boardSize);
    return pos;
  }
  if (enemy.type === 'random') {
    // Random enemies: 50% chase, 50% random direction
    if (Math.random() < 0.5) {
      return moveEnemy(enemy.pos, player, boardSize);
    }
    // Random direction: pick a random adjacent cell
    const dr = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const dc = Math.floor(Math.random() * 3) - 1;
    const nr = Math.max(0, Math.min(boardSize - 1, enemy.pos[0] + dr));
    const nc = Math.max(0, Math.min(boardSize - 1, enemy.pos[1] + dc));
    return [nr, nc];
  }
  // Normal enemies: one step toward player
  return moveEnemy(enemy.pos, player, boardSize);
}
```

**Step 2: Update `step()` to use `moveEnemyByType`**

Replace the enemy movement line:
```javascript
state.enemies = state.enemies.map(e => ({
  ...e,
  pos: moveEnemy(e.pos, state.playerPos, state.boardSize),
}));
```
with:
```javascript
state.enemies = state.enemies.map(e => ({
  ...e,
  pos: moveEnemyByType(e, state.playerPos, state.boardSize),
}));
```

**Step 3: Verify manually**

No behavioral change yet (all enemies are 'normal'). Game should play identically.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add type-specific enemy movement (fast 2-step, random 50/50)"
```

---

### Task 5: Add Wave Spawning Logic

**Files:**
- Modify: `index.html` (add spawnWave function, update resetLevel for survival)

**Step 1: Add `getWaveEnemies` function**

Add after `moveEnemyByType`:

```javascript
function getWaveEnemies(wave) {
  const total = 4 + wave * 2;
  let normal, fast, random;
  if (wave < 4) {
    normal = total;
    fast = 0;
    random = 0;
  } else if (wave < 7) {
    fast = Math.min(2 + (wave - 4) * 2, Math.floor(total * 0.4));
    random = 0;
    normal = total - fast;
  } else {
    random = Math.min(2 + (wave - 7), Math.floor(total * 0.25));
    fast = Math.min(2 + (wave - 4) * 2, Math.floor(total * 0.4));
    normal = total - fast - random;
  }
  return { normal, fast, random };
}

function spawnWave() {
  const counts = getWaveEnemies(state.wave);
  state.enemies = [];
  const types = [
    ...Array(counts.normal).fill('normal'),
    ...Array(counts.fast).fill('fast'),
    ...Array(counts.random).fill('random'),
  ];
  for (const type of types) {
    const exclude = [state.playerPos, ...state.enemies.map(e => e.pos), ...state.killed];
    state.enemies.push({ pos: randomPos(state.boardSize, exclude), type });
  }
}
```

**Step 2: Update `initGame` to use `spawnWave` for survival**

In `initGame`, replace the `resetLevel()` call with mode-aware logic:

```javascript
function initGame(mode) {
  state.mode = mode;
  state.level = 1;
  state.score = 0;
  state.moveCount = 0;
  state.phase = 'playing';
  state.boardSize = 20;
  state.hp = 3;
  state.wave = 1;
  state.waveMovesUsed = 0;
  state.waveDamageTaken = false;
  state.breakMovesLeft = 0;
  if (mode === 'survival') {
    const mid = Math.floor(state.boardSize / 2);
    state.playerPos = [mid, mid];
    state.killed = [];
    spawnWave();
    // Spawn 2 bonus asterisks
    for (let i = 0; i < 2; i++) {
      const exclude = [state.playerPos, ...state.enemies.map(e => e.pos), ...state.killed];
      state.killed.push(randomPos(state.boardSize, exclude));
    }
  } else {
    resetLevel();
  }
  document.getElementById('mode-select').style.display = 'none';
  document.getElementById('keypad').style.display = 'grid';
  updateHud();
  resizeCanvas();
}
```

**Step 3: Verify manually**

Start Survival mode. Wave 1 should spawn 6 enemies (4 + 1*2 = 6), all normal (X). The game won't have wave transitions yet — clearing all enemies will just leave an empty board.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add wave spawning with enemy type distribution"
```

---

### Task 6: Implement Wave Clear and Transitions

**Files:**
- Modify: `index.html` (step function, add wave transition logic)

This is the core wave mechanic: detect when all enemies are cleared, show a brief overlay, start the break phase, then spawn the next wave.

**Step 1: Add wave clear overlay state and drawing**

Add to the state object:
```javascript
waveOverlay: null,  // { text: '...', subtext: '...', timer: N } or null
```

Add reset in `initGame`:
```javascript
state.waveOverlay = null;
```

Add overlay drawing function after `drawGameOver`:

```javascript
function drawWaveOverlay() {
  if (!state.waveOverlay) return;
  const size = canvas.width;
  ctx.fillStyle = T.overlay;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = T.score;
  ctx.font = `bold ${Math.floor(size * 0.07)}px 'Courier New', monospace`;
  ctx.fillText(state.waveOverlay.text, size / 2, size * 0.40);
  if (state.waveOverlay.subtext) {
    ctx.fillStyle = T.best;
    ctx.font = `${Math.floor(size * 0.04)}px 'Courier New', monospace`;
    ctx.fillText(state.waveOverlay.subtext, size / 2, size * 0.55);
  }
  ctx.restore();
}
```

Update `redraw` to show wave overlay:
```javascript
function redraw() {
  // ... existing board drawing code ...
  if (state.phase === 'gameover') drawGameOver();
  else if (state.waveOverlay) drawWaveOverlay();
}
```

**Step 2: Add wave clear detection and scoring to `step()`**

Replace the old survival mode block in `step()` (lines ~506-512):

```javascript
// old:
if (state.mode === 'survival') {
  state.score++;
  state.moveCount++;
  if (state.moveCount % 20 === 0) {
    state.enemies.push({
      pos: randomPos(state.boardSize, [state.playerPos, ...state.enemies.map(e => e.pos)]),
      type: 'normal',
    });
  }
}
```

with:

```javascript
if (state.mode === 'survival') {
  state.waveMovesUsed++;

  // Wave clear: all enemies destroyed
  if (state.enemies.length === 0) {
    // Calculate wave score
    let waveScore = 100;
    let bonusText = '+100 base';
    if (state.waveMovesUsed < 15) {
      waveScore += 50;
      bonusText += ', +50 speed';
    }
    if (!state.waveDamageTaken) {
      waveScore += 25;
      bonusText += ', +25 no-damage';
    }
    state.score += waveScore;

    // Show wave clear overlay
    state.waveOverlay = {
      text: `WAVE ${state.wave} CLEAR!`,
      subtext: bonusText,
    };

    // Start break phase
    state.wave++;
    state.waveMovesUsed = 0;
    state.waveDamageTaken = false;
    state.breakMovesLeft = 3;

    // Spawn bonus asterisks for the break
    for (let i = 0; i < 2; i++) {
      const exclude = [state.playerPos, ...state.killed];
      state.killed.push(randomPos(state.boardSize, exclude));
    }

    updateHud();
    redraw();
    return;
  }
}
```

**Step 3: Handle break phase moves in `step()`**

At the TOP of `step()`, after the phase check, add break-phase handling:

```javascript
function step(dir) {
  if (state.phase !== 'playing') return;

  // Clear wave overlay on any input
  if (state.waveOverlay) {
    state.waveOverlay = null;
  }

  // Break phase: free moves, no enemies
  if (state.breakMovesLeft > 0) {
    state.playerPos = movePlayer(state.playerPos, dir, state.boardSize);
    // Asterisk pickup during break
    const asteriskIdx = state.killed.findIndex(
      k => k[0] === state.playerPos[0] && k[1] === state.playerPos[1]
    );
    if (asteriskIdx !== -1) {
      state.hp = Math.min(state.hp + 1, 5);
      state.killed.splice(asteriskIdx, 1);
    }
    state.breakMovesLeft--;
    if (state.breakMovesLeft === 0) {
      // Break over: spawn next wave
      spawnWave();
      state.waveOverlay = {
        text: `WAVE ${state.wave}`,
        subtext: null,
      };
    }
    updateHud();
    redraw();
    return;
  }

  // ... rest of existing step() logic ...
```

**Step 4: Cap HP at 5 in the main asterisk pickup too**

In the main step logic, change:
```javascript
state.hp++;
```
to:
```javascript
state.hp = Math.min(state.hp + 1, 5);
```

**Step 5: Track wave damage**

In the hit detection section of `step()`, after `state.hp -= hitEnemies.length;`, add:
```javascript
state.waveDamageTaken = true;
```

**Step 6: Verify manually**

Start Survival. Clear wave 1 by luring enemies into each other. Should see:
- "WAVE 1 CLEAR!" overlay with score breakdown
- 3 free moves with bonus asterisks on the board
- Wave 2 spawns with more enemies
- HUD shows updated wave number and score

**Step 7: Commit**

```bash
git add index.html
git commit -m "feat: implement wave clear detection, scoring bonuses, and break phase"
```

---

### Task 7: Update HUD for Wave System

**Files:**
- Modify: `index.html` (updateHud function)

**Step 1: Update HUD to show wave info in survival mode**

```javascript
function updateHud() {
  const playing = state.phase === 'playing' || state.phase === 'gameover';
  const modeText = playing ? (state.mode === 'levels' ? '[LEVELS]' : '[SURVIVAL]') : 'DROIDS';
  document.getElementById('mode-label').textContent = modeText;
  document.getElementById('level-display').textContent =
    playing && state.mode === 'levels' ? `LVL:${state.level}` :
    playing && state.mode === 'survival' ? `WAVE:${state.wave}` : '';
  document.getElementById('score-display').textContent =
    playing ? `SCORE:${state.score}` : '';
  document.getElementById('best-display').textContent =
    playing && state.mode === 'survival' ? `BEST:${state.bestScore}` : '';
  // HP display with visual hearts
  if (playing) {
    const filled = Math.max(0, state.hp);
    const empty = 5 - filled;
    document.getElementById('hp-display').textContent =
      '\u2665'.repeat(filled) + '\u2661'.repeat(empty);
  } else {
    document.getElementById('hp-display').textContent = '';
  }
}
```

**Step 2: Verify manually**

HUD should show `WAVE:1` instead of nothing, hearts for HP, score updates on wave clear.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: update HUD with wave display and heart-based HP"
```

---

### Task 8: Update Game Over for Wave System

**Files:**
- Modify: `index.html` (drawGameOver function)

**Step 1: Update game over to show wave reached**

```javascript
function drawGameOver() {
  const size = canvas.width;
  ctx.fillStyle = T.overlay;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = T.enemy;
  ctx.font = `bold ${Math.floor(size * 0.09)}px 'Courier New', monospace`;
  ctx.fillText('GAME OVER', size / 2, size * 0.30);
  ctx.fillStyle = T.score;
  ctx.font = `${Math.floor(size * 0.055)}px 'Courier New', monospace`;
  if (state.mode === 'survival') {
    ctx.fillText(`WAVE: ${state.wave}`, size / 2, size * 0.45);
    ctx.fillText(`SCORE: ${state.score}`, size / 2, size * 0.55);
  } else {
    ctx.fillText(`SCORE: ${state.score}`, size / 2, size * 0.50);
  }
  if (state.mode === 'survival' && state.score > state.bestScore) {
    ctx.fillStyle = T.best;
    ctx.font = `${Math.floor(size * 0.05)}px 'Courier New', monospace`;
    ctx.fillText('>>> NEW BEST! <<<', size / 2, size * 0.68);
  }
  ctx.fillStyle = T.prompt;
  ctx.font = `${Math.floor(size * 0.04)}px 'Courier New', monospace`;
  ctx.fillText('[ tap or press any key ]', size / 2, size * 0.82);
  ctx.restore();
}
```

**Step 2: Verify manually**

Die in Survival mode. Game over screen should show wave reached and score. If it's a new best, show the banner.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: update game over screen with wave info for survival mode"
```

---

### Task 9: Polish and Edge Cases

**Files:**
- Modify: `index.html`

**Step 1: Clear the wave start overlay after one move**

The wave overlay (showing "WAVE N") should dismiss on the first input of the new wave. This is already handled by the `if (state.waveOverlay)` check at the top of `step()`. Verify it works.

**Step 2: Ensure `restartGame` resets wave state**

In `restartGame`, add wave resets:

```javascript
function restartGame() {
  document.getElementById('mode-select').style.display = 'flex';
  document.getElementById('keypad').style.display = 'none';
  state.phase = 'menu';
  state.score = 0;
  state.level = 1;
  state.wave = 1;
  state.waveOverlay = null;
  state.breakMovesLeft = 0;
  updateHud();
  resizeCanvas();
}
```

**Step 3: Handle edge case — player on enemy spawn position**

`spawnWave` already uses `randomPos` with exclusion, and we pass the player position. Verify that `spawnWave` excludes the player:

```javascript
function spawnWave() {
  const counts = getWaveEnemies(state.wave);
  state.enemies = [];
  const types = [
    ...Array(counts.normal).fill('normal'),
    ...Array(counts.fast).fill('fast'),
    ...Array(counts.random).fill('random'),
  ];
  for (const type of types) {
    const exclude = [state.playerPos, ...state.enemies.map(e => e.pos), ...state.killed];
    state.enemies.push({ pos: randomPos(state.boardSize, exclude), type });
  }
}
```

This already excludes player position. Good.

**Step 4: Verify full playthrough**

Play survival mode through several waves:
- Wave 1-3: all normal (X) enemies, progressively more
- Wave 4+: fast (F) enemies appear in orange
- Wave 7+: random (R) enemies appear in purple
- Between each wave: 3 free moves, bonus asterisks
- Score accumulates with bonuses
- Game over shows wave + score
- Restart returns to menu cleanly

**Step 5: Commit**

```bash
git add index.html
git commit -m "fix: reset wave state on restart, verify edge cases"
```

---

### Task 10: Final Commit and Cleanup

**Step 1: Full playtest**

Play through at least 5 waves in survival mode. Verify:
- [ ] Enemy types appear at correct waves
- [ ] Fast enemies move 2 cells per turn
- [ ] Random enemies are unpredictable
- [ ] Wave clear overlay shows correct bonuses
- [ ] Break phase gives 3 free moves
- [ ] Asterisk pickups restore HP (capped at 5)
- [ ] HUD shows wave, score, best, HP hearts
- [ ] Game over shows wave and score
- [ ] New best detection works
- [ ] Levels mode is unchanged
- [ ] Restart works cleanly

**Step 2: Commit if any remaining changes**

```bash
git add index.html
git commit -m "feat: complete survival wave system with progressive difficulty"
```
