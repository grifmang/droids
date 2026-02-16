import { DroidsEngine, MOVE_MAP, dailySeed, spotKey } from './engine.js';
import { buildRunSummaryLink, renderShareCard } from './share.js';

const HIGH_SCORES_KEY = 'droids.web.highscores.v1';
const STREAK_KEY = 'droids.web.dailyStreak.v1';
const REDUCED_MOTION_KEY = 'droids.web.reducedMotion.v1';

type HighScoreEntry = { score: number; level: number; seed: number; when: string };
type DailyStreak = { lastDate: string; streak: number; history: string[] };
type StatusFlags = { reducedMotion: boolean; shareCopied: boolean };

type StorageReader = <T>(key: string, fallback: T) => T;
type StorageWriter = <T>(key: string, value: T) => void;

const DAILY_STREAK_INCREMENT_EVENT = 'daily_run_completed';

function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function persistLostRun(
  state: { status: string; score: number; level: number; seed: number },
  runAlreadyFinalized: boolean,
  read: StorageReader,
  write: StorageWriter,
  nowIso = new Date().toISOString(),
): boolean {
  if (state.status !== 'lost' || runAlreadyFinalized) {
    return runAlreadyFinalized;
  }

  const highscores = read<HighScoreEntry[]>(HIGH_SCORES_KEY, []);
  highscores.push({
    score: state.score,
    level: state.level,
    seed: state.seed,
    when: nowIso,
  });
  highscores.sort((a, b) => b.score - a.score);
  write(HIGH_SCORES_KEY, highscores.slice(0, 10));

  // Product behavior for Week 3: streak increases once when a daily run ends.
  if (state.seed === dailySeed() && DAILY_STREAK_INCREMENT_EVENT === 'daily_run_completed') {
    const runDate = todayIso();
    const streak = read<DailyStreak>(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
    if (streak.lastDate !== runDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = todayIso(yesterday);
      streak.streak = streak.lastDate === yesterdayIso ? streak.streak + 1 : 1;
      streak.lastDate = runDate;
      streak.history = [runDate, ...streak.history.filter((d) => d !== runDate)].slice(0, 30);
      write(STREAK_KEY, streak);
    }
  }

  return true;
}

export function renderStatusText(
  state: { level: number; score: number; enemies: { length: number }; teleports: number; seed: number; status: string },
  flags: StatusFlags,
): string {
  const parts = [
    `Level ${state.level}`,
    `Score ${state.score}`,
    `Enemies ${state.enemies.length}`,
    `Teleports ${state.teleports}`,
    `Seed ${state.seed}`,
    `Motion ${flags.reducedMotion ? 'reduced' : 'enhanced'}`,
  ];
  if (state.status === 'lost') {
    parts.push('Game Over');
  }
  if (flags.shareCopied) {
    parts.push('Run summary copied');
  }
  return parts.join(' | ');
}

export function mountGame(): void {
  const boardEl = document.getElementById('board') as HTMLDivElement;
  const statusEl = document.getElementById('status') as HTMLParagraphElement;
  const historyEl = document.getElementById('history') as HTMLParagraphElement;
  const highscoresEl = document.getElementById('highscores') as HTMLUListElement;
  const shareBtn = document.getElementById('share') as HTMLButtonElement;
  const newRunBtn = document.getElementById('new-run') as HTMLButtonElement;
  const dailyBtn = document.getElementById('daily') as HTMLButtonElement;
  const reducedMotionToggle = document.getElementById('reduced-motion') as HTMLInputElement;
  const canvas = document.getElementById('share-card') as HTMLCanvasElement;
  const preview = document.getElementById('share-preview') as HTMLImageElement;

  const engine = new DroidsEngine(Date.now());

  const reducedMotion = readJson<boolean>(REDUCED_MOTION_KEY, false);
  const statusFlags: StatusFlags = { reducedMotion, shareCopied: false };
  let runFinalized = false;
  reducedMotionToggle.checked = reducedMotion;
  document.body.classList.toggle('reduced-motion', reducedMotion);

  function updateHighScores(): void {
    const highscores = readJson<HighScoreEntry[]>(HIGH_SCORES_KEY, []);
    highscoresEl.innerHTML = highscores
      .map((entry, idx) => `<li>#${idx + 1} — ${entry.score} pts (L${entry.level}, seed ${entry.seed})</li>`)
      .join('');
  }

  function persistRunIfNeeded(): void {
    runFinalized = persistLostRun(engine.state, runFinalized, readJson, writeJson);
  }

  function render(): void {
    boardEl.style.gridTemplateColumns = `repeat(${engine.boardSize}, 22px)`;
    const enemies = new Set(engine.state.enemies.map(spotKey));
    const cells: string[] = [];

    for (let x = 0; x < engine.boardSize; x += 1) {
      for (let y = 0; y < engine.boardSize; y += 1) {
        const key = `${x},${y}`;
        let char = '';
        let cls = 'cell';
        if (key === spotKey(engine.state.player)) {
          cls += ' player';
          char = '@';
        } else if (enemies.has(key)) {
          cls += ' enemy';
          char = 'X';
        } else if (engine.state.wrecks.has(key)) {
          cls += ' wreck';
          char = '*';
        }
        cells.push(`<div class="${cls}">${char}</div>`);
      }
    }

    boardEl.innerHTML = cells.join('');
    statusEl.textContent = renderStatusText(engine.state, statusFlags);

    const streak = readJson<DailyStreak>(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
    historyEl.textContent = `Daily streak: ${streak.streak} day(s) | Recent: ${streak.history.slice(0, 5).join(', ') || 'none'}`;

    updateHighScores();
  }

  function step(key: string): void {
    statusFlags.shareCopied = false;
    engine.step(key);
    persistRunIfNeeded();
    render();
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key in MOVE_MAP || key === 't' || key === 'r') {
      event.preventDefault();
      step(key);
    }
  });

  reducedMotionToggle.addEventListener('change', () => {
    writeJson(REDUCED_MOTION_KEY, reducedMotionToggle.checked);
    document.body.classList.toggle('reduced-motion', reducedMotionToggle.checked);
    statusFlags.reducedMotion = reducedMotionToggle.checked;
    render();
  });

  newRunBtn.addEventListener('click', () => {
    engine.reset(Date.now());
    runFinalized = false;
    statusFlags.shareCopied = false;
    render();
  });

  dailyBtn.addEventListener('click', () => {
    engine.reset(dailySeed());
    runFinalized = false;
    statusFlags.shareCopied = false;
    render();
  });

  shareBtn.addEventListener('click', async () => {
    renderShareCard(engine.state, canvas, preview);
    const summary = buildRunSummaryLink(engine.state);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
      statusFlags.shareCopied = true;
      render();
    }
  });

  render();
}
