import test from 'node:test';
import assert from 'node:assert/strict';
import { moveEnemy, resolveEnemyCollisions, safeTeleportDestinations } from '../web/engine.js';

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
