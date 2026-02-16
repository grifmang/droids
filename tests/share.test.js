import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunSummaryLink, parseRunSummaryLink } from '../web/share.js';

test('buildRunSummaryLink and parseRunSummaryLink round-trip run summary data', () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      origin: 'https://example.com',
      pathname: '/game',
    },
  };

  const summary = { score: 480, level: 7, seed: 20260102, teleports: 2 };
  const link = buildRunSummaryLink(summary);
  const parsed = parseRunSummaryLink(link);

  assert.deepEqual(parsed, summary);

  globalThis.window = originalWindow;
});

test('parseRunSummaryLink rejects malformed values', () => {
  assert.equal(parseRunSummaryLink('https://example.com/game?score=x&level=2&seed=3&teleports=1'), null);
  assert.equal(parseRunSummaryLink('https://example.com/game?score=12&level=2&seed=3'), null);
});
