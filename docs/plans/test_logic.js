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
assert('stops at top-left when player is at 0,0', deepEq(moveEnemy([0,5],[0,0],10), [0,4]));
assert('no movement when on same cell', deepEq(moveEnemy([5,5],[5,5],10), [5,5]));

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
