import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DroidsEngine,
  moveEnemy,
  resolveEnemyCollisions,
  safeTeleportDestinations,
} from '../web/engine.js';

test('moves enemy one step toward the player on both axes', () => {
  assert.deepEqual(moveEnemy([10, 10], [8, 12]), [9, 11]);
  assert.deepEqual(moveEnemy([10, 10], [10, 8]), [10, 9]);
});

test('resolves collisions into wrecks and removes colliding enemies', () => {
  const moved = [[4, 4], [4, 4], [1, 1]];
  const { survivors, nextWrecks, destroyed } = resolveEnemyCollisions(moved, new Set());

  assert.equal(destroyed, 2);
  assert.deepEqual(survivors, [[1, 1]]);
  assert.equal(nextWrecks.has('4,4'), true);
});

test('safe teleport destinations never include enemies or wrecks', () => {
  const state = {
    level: 2,
    score: 100,
    player: [1, 1],
    enemies: [[0, 0], [2, 2]],
    wrecks: new Set(['1,2']),
    teleports: 2,
    seed: 123,
    status: 'playing',
  };

  const spots = safeTeleportDestinations(state, 3);
  const keys = new Set(spots.map((spot) => `${spot[0]},${spot[1]}`));

  assert.equal(keys.has('0,0'), false);
  assert.equal(keys.has('2,2'), false);
  assert.equal(keys.has('1,2'), false);
  assert.equal(keys.has('1,1'), true);
});

test('player loses when enemy movement reaches the player spot', () => {
  const engine = new DroidsEngine(1, { boardSize: 5, safeTeleports: 3 });
  engine.state.player = [2, 2];
  engine.state.enemies = [[2, 3]];
  engine.state.wrecks = new Set();
  engine.state.status = 'playing';

  engine.step('.');

  assert.equal(engine.state.status, 'lost');
});

test('clearing the final enemy awards destroy and level-up bonus score', () => {
  const engine = new DroidsEngine(2, { boardSize: 5, safeTeleports: 3 });
  engine.state.level = 2;
  engine.state.score = 0;
  engine.state.player = [2, 1];
  engine.state.enemies = [[1, 3], [3, 3]];
  engine.state.wrecks = new Set();

  engine.step('.');

  assert.equal(engine.state.level, 3);
  assert.equal(engine.state.score, 70);
  assert.equal(engine.state.status, 'playing');
});

test('safe teleports decrement only when available', () => {
  const engine = new DroidsEngine(3, { boardSize: 5, safeTeleports: 1 });
  engine.state.teleports = 1;
  engine.step('t');
  assert.equal(engine.state.teleports, 0);

  const playerAfterFirstTeleport = [...engine.state.player];
  engine.step('t');

  assert.equal(engine.state.teleports, 0);
  assert.deepEqual(engine.state.player, playerAfterFirstTeleport);
});
