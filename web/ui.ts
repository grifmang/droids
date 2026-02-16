import { DroidsEngine, MOVE_MAP, dailySeed, spotKey } from './engine.js';
import { buildRunSummaryLink, renderShareCard } from './share.js';

const HIGH_SCORES_KEY = 'droids.web.highscores.v1';
const STREAK_KEY = 'droids.web.dailyStreak.v1';
const REDUCED_MOTION_KEY = 'droids.web.reducedMotion.v1';

type HighScoreEntry = { score: number; level: number; seed: number; when: string };
type DailyStreak = { lastDate: string; streak: number; history: string[] };

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
  reducedMotionToggle.checked = reducedMotion;
  document.body.classList.toggle('reduced-motion', reducedMotion);

  function updateHighScores(): void {
    const highscores = readJson<HighScoreEntry[]>(HIGH_SCORES_KEY, []);
    highscoresEl.innerHTML = highscores
      .map((entry, idx) => `<li>#${idx + 1} — ${entry.score} pts (L${entry.level}, seed ${entry.seed})</li>`)
      .join('');
  }

  function persistRunIfNeeded(): void {
    if (engine.state.status !== 'lost') return;

    const highscores = readJson<HighScoreEntry[]>(HIGH_SCORES_KEY, []);
    highscores.push({
      score: engine.state.score,
      level: engine.state.level,
      seed: engine.state.seed,
      when: new Date().toISOString(),
    });
    highscores.sort((a, b) => b.score - a.score);
    writeJson(HIGH_SCORES_KEY, highscores.slice(0, 10));

    const runDate = todayIso();
    const streak = readJson<DailyStreak>(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
    if (engine.state.seed === dailySeed()) {
      if (streak.lastDate !== runDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayIso = todayIso(yesterday);
        streak.streak = streak.lastDate === yesterdayIso ? streak.streak + 1 : 1;
        streak.lastDate = runDate;
        streak.history = [runDate, ...streak.history.filter((d) => d !== runDate)].slice(0, 30);
        writeJson(STREAK_KEY, streak);
      }
    }
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
    const base = `Level ${engine.state.level} | Score ${engine.state.score} | Enemies ${engine.state.enemies.length} | Teleports ${engine.state.teleports} | Seed ${engine.state.seed}`;
    statusEl.textContent = engine.state.status === 'lost' ? `${base} | Game Over` : base;

    const streak = readJson<DailyStreak>(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
    historyEl.textContent = `Daily streak: ${streak.streak} day(s) | Recent: ${streak.history.slice(0, 5).join(', ') || 'none'}`;

    updateHighScores();
  }

  function step(key: string): void {
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
    statusEl.textContent = `${statusEl.textContent} | Motion ${reducedMotionToggle.checked ? 'reduced' : 'enhanced'}`;
  });

  newRunBtn.addEventListener('click', () => {
    engine.reset(Date.now());
    render();
  });

  dailyBtn.addEventListener('click', () => {
    engine.reset(dailySeed());
    render();
  });

  shareBtn.addEventListener('click', async () => {
    renderShareCard(engine.state, canvas, preview);
    const summary = buildRunSummaryLink(engine.state);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
      statusEl.textContent = `${statusEl.textContent} | Run summary copied`;
    }
  });

  render();
}
