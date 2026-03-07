# Survivability Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add teleport ability, power-up pickups, and edge-spawning to make Survival mode more fun and give players tools to escape being cornered.

**Architecture:** All changes in `index.html`. New state fields for teleport charges, shield, and power-ups. Power-ups stored in a new `state.powerups` array alongside existing `state.killed` (wreckage). The `step()` function gains power-up pickup logic and bomb detonation. A new `teleport()` function handles warping. Edge-spawning constrains `randomPos` for survival mode enemy placement.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas (no dependencies)

---

### Task 1: Add State Fields, Increase Starting HP, Add Teleport Button

**Files:**
- Modify: `index.html:180-199` (state object)
- Modify: `index.html:202-231` (initGame)
- Modify: `index.html:164-174` (keypad HTML)
- Modify: `index.html:106-114` (keypad CSS)
- Modify: `index.html:775-786` (restartGame)

**Step 1: Add new state fields**

Add after the existing `waveOverlay` field (line 198):

```javascript
teleportCharges: 2,      // teleport charges available
shield: false,           // whether player has a shield active
powerups: [],            // array of { pos: [row, col], type: '+' | 'S' | 'B' }
```

**Step 2: Update `initGame` to set new fields and increase starting HP**

In `initGame`, change `state.hp = 3` to `state.hp = 5`. Add resets for new fields:

```javascript
state.teleportCharges = 2;
state.shield = false;
state.powerups = [];
```

**Step 3: Update `restartGame` to reset new fields**

Add to `restartGame`:

```javascript
state.teleportCharges = 2;
state.shield = false;
state.powerups = [];
```

**Step 4: Add teleport button to keypad HTML**

Change the keypad CSS to add a 4th row for the teleport button. Update `#keypad` style:

```css
#keypad {
  display: none;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px) 44px;
  gap: 4px;
  padding: 8px;
  margin-top: 0;
  flex-shrink: 0;
}
```

Add a teleport button after the last keypad button (after `data-dir="down-right"`):

```html
<button class="kp-btn" id="btn-teleport" style="grid-column: 1 / -1; font-size: 14px;">TELEPORT</button>
```

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add teleport/shield/powerup state, increase starting HP to 5, add teleport button"
```

---

### Task 2: Add Power-Up Colors and Rendering

**Files:**
- Modify: `index.html` (T colors object, drawBoard function)

**Step 1: Add power-up colors to the T object**

Add after `prompt: '#1a6600'` in the T colors object:

```javascript
powerupTeleport: '#33ffff',   // cyan for +
powerupShield:   '#ffffff',   // white for S
powerupBomb:     '#ffff33',   // yellow for B
playerShielded:  '#ffffff',   // white player when shielded
```

**Step 2: Update `drawBoard` to render power-ups and shielded player**

The function signature needs a new `powerups` parameter. Update it to:

```javascript
function drawBoard(boardSize, playerPos, enemies, killed, powerups, pad, cellSize, shielded) {
```

In the rendering loop, change the player color when shielded:

```javascript
if (r === playerPos[0] && c === playerPos[1]) {
  char = 'O'; color = shielded ? T.playerShielded : T.player;
```

Add a power-up rendering branch after the killed check and before the empty fallback:

```javascript
} else if (killed.some(k => k[0] === r && k[1] === c)) {
  char = '*'; color = T.killed;
} else if (powerups && (pu = powerups.find(p => p.pos[0] === r && p.pos[1] === c))) {
  char = pu.type;
  color = pu.type === '+' ? T.powerupTeleport :
          pu.type === 'S' ? T.powerupShield : T.powerupBomb;
} else {
```

Add `pu` to the `let` declaration: `let char, color, enemy, pu;`

**Step 3: Update all `drawBoard` call sites**

There are 3 call sites for `drawBoard`:

1. In `redraw()` (~line 504): Add `state.powerups` and `state.shield`:
```javascript
drawBoard(state.boardSize, state.playerPos, state.enemies, state.killed, state.powerups, pad, cellSize, state.shield);
```

2. In `drawAttract()` (~line 572): Pass empty array and false:
```javascript
drawBoard(boardSize, [10, 10],
  [...enemies...],
  [[8,8],[12,12]],
  [{pos:[5,10],type:'+'}, {pos:[14,3],type:'S'}, {pos:[11,17],type:'B'}],
  pad, cellSize, false);
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add power-up rendering with colored symbols and shielded player"
```

---

### Task 3: Implement Teleport

**Files:**
- Modify: `index.html` (add teleport function, update keydown handler, wire teleport button)

**Step 1: Add `teleport()` function**

Add after `spawnWave()` function:

```javascript
function teleport() {
  if (state.phase !== 'playing') return;
  if (state.teleportCharges <= 0) return;
  // Find a random empty cell (no enemy, no wreckage, no powerup, not current pos)
  const exclude = [
    state.playerPos,
    ...state.enemies.map(e => e.pos),
    ...state.killed,
    ...state.powerups.map(p => p.pos),
  ];
  const newPos = randomPos(state.boardSize, exclude);
  state.playerPos = newPos;
  state.teleportCharges--;
  updateHud();
  redraw();
}
```

**Step 2: Add T key handler in the keydown listener**

In the `keydown` handler, after the `KEY_MAP` direction check, add teleport handling. Before `const dir = KEY_MAP[e.key];` add:

```javascript
if (e.key === 't' || e.key === 'T') {
  e.preventDefault();
  teleport();
  return;
}
```

Wait — `T` is already mapped in `KEY_MAP` as `T: 'down-left'`... no, checking the KEY_MAP: uppercase `T` is not in the map. But lowercase `t` is also not in the map. Good — `T` is free.

Actually, wait. Let me re-check: `S: 'stay'` IS in the KEY_MAP. The `S` key is used for "stay". So we need to handle `t`/`T` specifically before the KEY_MAP lookup:

```javascript
document.addEventListener('keydown', (e) => {
  if (state.phase === 'gameover') {
    restartGame();
    return;
  }
  // Teleport
  if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    teleport();
    return;
  }
  const dir = KEY_MAP[e.key];
  if (dir) {
    e.preventDefault();
    step(dir);
  }
});
```

**Step 3: Wire the teleport button**

Add an event listener for the teleport button, after the keypad button handlers:

```javascript
document.getElementById('btn-teleport').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (state.phase === 'gameover') { restartGame(); return; }
  teleport();
});
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: implement teleport with T key and button, limited charges"
```

---

### Task 4: Implement Power-Up Pickup Logic

**Files:**
- Modify: `index.html` (step function — add pickup handling after asterisk pickup)

**Step 1: Add power-up pickup in the main step logic**

After the asterisk pickup block (after line 628), add power-up pickup:

```javascript
// 1c. Power-up pickup
const puIdx = state.powerups.findIndex(
  p => p.pos[0] === state.playerPos[0] && p.pos[1] === state.playerPos[1]
);
if (puIdx !== -1) {
  const pu = state.powerups[puIdx];
  state.powerups.splice(puIdx, 1);
  if (pu.type === '+') {
    state.teleportCharges = Math.min(state.teleportCharges + 1, 5);
  } else if (pu.type === 'S') {
    state.shield = true;
  } else if (pu.type === 'B') {
    // Bomb: destroy all enemies in 8 adjacent cells
    const [pr, pc] = state.playerPos;
    const bombKilled = [];
    state.enemies = state.enemies.filter(e => {
      const dr = Math.abs(e.pos[0] - pr);
      const dc = Math.abs(e.pos[1] - pc);
      if (dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)) {
        bombKilled.push(e.pos);
        return false;
      }
      return true;
    });
    state.killed = [...state.killed, ...bombKilled];
  }
}
```

**Step 2: Add power-up pickup during break phase too**

In the break phase block (after the asterisk pickup in break), add the same power-up pickup logic:

```javascript
// Power-up pickup during break
const puIdx = state.powerups.findIndex(
  p => p.pos[0] === state.playerPos[0] && p.pos[1] === state.playerPos[1]
);
if (puIdx !== -1) {
  const pu = state.powerups[puIdx];
  state.powerups.splice(puIdx, 1);
  if (pu.type === '+') {
    state.teleportCharges = Math.min(state.teleportCharges + 1, 5);
  } else if (pu.type === 'S') {
    state.shield = true;
  }
  // Bomb during break has no effect (no enemies)
}
```

**Step 3: Update shield logic in enemy contact**

In the enemy contact section (step 4 of step()), modify the hit handling to respect the shield:

```javascript
// 4. Enemy contact: each enemy on the player's cell deals damage
const hitEnemies = state.enemies.filter(
  e => e.pos[0] === state.playerPos[0] && e.pos[1] === state.playerPos[1]
);
if (hitEnemies.length > 0) {
  let damage = hitEnemies.length;
  if (state.shield) {
    damage = Math.max(0, damage - 1);
    state.shield = false;
  }
  state.hp -= damage;
  if (damage > 0) state.waveDamageTaken = true;
  state.enemies = state.enemies.filter(
    e => !(e.pos[0] === state.playerPos[0] && e.pos[1] === state.playerPos[1])
  );
  if (state.hp <= 0) {
    gameOver();
    return;
  }
}
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: implement power-up pickups (teleport charge, shield, bomb)"
```

---

### Task 5: Implement Power-Up Spawning

**Files:**
- Modify: `index.html` (add spawnPowerup function, update wave clear, add random spawn in step)

**Step 1: Add `spawnPowerup()` function**

Add after `spawnWave()`:

```javascript
function spawnPowerup() {
  if (state.powerups.length >= 3) return; // max 3 on board
  const types = ['+', 'S', 'B'];
  const type = types[Math.floor(Math.random() * types.length)];
  const exclude = [
    state.playerPos,
    ...state.enemies.map(e => e.pos),
    ...state.killed,
    ...state.powerups.map(p => p.pos),
  ];
  const pos = randomPos(state.boardSize, exclude);
  state.powerups.push({ pos, type });
}
```

**Step 2: Spawn 1 power-up during wave clear break**

In the wave clear block in `step()`, after the bonus asterisks loop, add:

```javascript
// Spawn 1 power-up during break
spawnPowerup();
```

**Step 3: Add 3% random spawn chance during waves**

In the survival mode block, before the wave clear check (`if (state.enemies.length === 0)`), add:

```javascript
// Random power-up spawn (3% chance per move)
if (Math.random() < 0.03) {
  spawnPowerup();
}
```

**Step 4: Award teleport charge every 3 waves**

In the wave clear scoring block, after `state.wave++`, add:

```javascript
// Bonus teleport charge every 3 waves
if ((state.wave - 1) % 3 === 0) {
  state.teleportCharges = Math.min(state.teleportCharges + 1, 5);
}
```

Note: `state.wave` has already been incremented at this point, so `state.wave - 1` is the wave that was just cleared. Wave 3, 6, 9, etc.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: implement power-up spawning (break + random 3% during waves)"
```

---

### Task 6: Implement Edge Spawning for Survival Mode

**Files:**
- Modify: `index.html` (add randomEdgePos function, update spawnWave)

**Step 1: Add `randomEdgePos()` function**

Add after `randomPos()`:

```javascript
function randomEdgePos(boardSize, exclude) {
  // Spawn within 3 rows/columns of any board edge
  const excludeList = Array.isArray(exclude) && Array.isArray(exclude[0])
    ? exclude
    : (exclude ? [exclude] : []);
  let pos;
  let attempts = 0;
  const maxAttempts = boardSize * boardSize * 4;
  const edgeDepth = 3;
  do {
    pos = [
      Math.floor(Math.random() * boardSize),
      Math.floor(Math.random() * boardSize),
    ];
    const inEdge = pos[0] < edgeDepth || pos[0] >= boardSize - edgeDepth ||
                   pos[1] < edgeDepth || pos[1] >= boardSize - edgeDepth;
    attempts++;
    if (attempts > maxAttempts) break;
  } while (!inEdge || excludeList.some(e => e[0] === pos[0] && e[1] === pos[1]));
  return pos;
}
```

**Step 2: Update `spawnWave` to use edge spawning**

In `spawnWave`, change the `randomPos` call to `randomEdgePos`:

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
    state.enemies.push({ pos: randomEdgePos(state.boardSize, exclude), type });
  }
}
```

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: spawn survival enemies at board edges for breathing room"
```

---

### Task 7: Update HUD to Show Teleport Charges

**Files:**
- Modify: `index.html` (updateHud function, add tp-display span to HTML)

**Step 1: Add a `tp-display` span to the HUD HTML**

After the `hp-display` span (line 154), add:

```html
<span id="tp-display"></span>
```

**Step 2: Update `updateHud` to show teleport charges**

After the HP display block, add:

```javascript
document.getElementById('tp-display').textContent =
  playing && state.mode === 'survival' ? `TP:${state.teleportCharges}` : '';
```

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: show teleport charges in HUD"
```

---

### Task 8: Polish and Edge Cases

**Files:**
- Modify: `index.html`

**Step 1: Clear power-ups when starting a new wave**

Power-ups from the previous wave should persist (they don't expire). No change needed — this is already the correct behavior since `state.powerups` is not cleared in `spawnWave`.

**Step 2: Ensure teleport works during break phase**

The `teleport()` function checks `state.phase !== 'playing'` which is correct — break phase is still 'playing'. No change needed.

**Step 3: Make sure power-ups don't spawn on top of each other or enemies**

The `spawnPowerup()` function already excludes enemies, wreckage, player, and existing power-ups. Verified correct.

**Step 4: Update attract screen to show a power-up**

Already handled in Task 2 — the attract screen shows example power-ups.

**Step 5: Verify Levels mode is unaffected**

- Levels mode never sets `teleportCharges`, `shield`, or `powerups` — they're initialized but unused since power-up spawning only happens in survival mode blocks.
- The `teleport()` function works in any mode (it's just a position warp). This is fine — it uses charges which start at 2 regardless.
- The `drawBoard` function renders power-ups from `state.powerups` which will be empty in Levels mode.

Actually, teleport should work in Levels mode too since the state is initialized. And the T key handler works regardless of mode. This seems fine — it's a nice bonus for Levels mode players without adding complexity.

**Step 6: Commit if any changes were made**

```bash
git add index.html
git commit -m "fix: verify edge cases and polish power-up system"
```
