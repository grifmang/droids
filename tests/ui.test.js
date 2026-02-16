import test from 'node:test';
import assert from 'node:assert/strict';
import { persistLostRun, renderStatusText } from '../web/ui.js';

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    read(key, fallback) {
      return store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : fallback;
    },
    write(key, value) {
      store.set(key, JSON.parse(JSON.stringify(value)));
    },
    get(key) {
      return store.get(key);
    },
  };
}

test('persistLostRun is idempotent for repeated post-loss calls', () => {
  const storage = createMemoryStorage();
  const state = { status: 'lost', score: 120, level: 3, seed: 1234 };

  let runFinalized = false;
  runFinalized = persistLostRun(state, runFinalized, storage.read, storage.write, '2026-01-02T00:00:00.000Z');
  runFinalized = persistLostRun(state, runFinalized, storage.read, storage.write, '2026-01-02T00:00:01.000Z');

  const highscores = storage.get('droids.web.highscores.v1');
  assert.equal(runFinalized, true);
  assert.equal(highscores.length, 1);
  assert.equal(highscores[0].score, 120);
});

test('renderStatusText re-renders from state instead of appending previous content', () => {
  const state = {
    level: 2,
    score: 150,
    enemies: [{}, {}, {}],
    teleports: 1,
    seed: 555,
    status: 'lost',
  };

  const reduced = renderStatusText(state, { reducedMotion: true, shareCopied: false });
  const copied = renderStatusText(state, { reducedMotion: false, shareCopied: true });

  assert.match(reduced, /Motion reduced/);
  assert.doesNotMatch(copied, /Motion reduced/);
  assert.match(copied, /Run summary copied/);
  assert.equal(copied.includes('Run summary copied | Run summary copied'), false);
});
