import { DroidsEngine, MOVE_MAP, dailySeed, spotKey } from './engine.js';
import { buildRunSummaryLink, renderShareCard } from './share.js';
const HIGH_SCORES_KEY = 'droids.web.highscores.v1';
const STREAK_KEY = 'droids.web.dailyStreak.v1';
const REDUCED_MOTION_KEY = 'droids.web.reducedMotion.v1';
function todayIso(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
}
function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
export function mountGame() {
    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const historyEl = document.getElementById('history');
    const highscoresEl = document.getElementById('highscores');
    const shareBtn = document.getElementById('share');
    const newRunBtn = document.getElementById('new-run');
    const dailyBtn = document.getElementById('daily');
    const reducedMotionToggle = document.getElementById('reduced-motion');
    const canvas = document.getElementById('share-card');
    const preview = document.getElementById('share-preview');
    const engine = new DroidsEngine(Date.now());
    const reducedMotion = readJson(REDUCED_MOTION_KEY, false);
    reducedMotionToggle.checked = reducedMotion;
    document.body.classList.toggle('reduced-motion', reducedMotion);
    function updateHighScores() {
        const highscores = readJson(HIGH_SCORES_KEY, []);
        highscoresEl.innerHTML = highscores
            .map((entry, idx) => `<li>#${idx + 1} — ${entry.score} pts (L${entry.level}, seed ${entry.seed})</li>`)
            .join('');
    }
    function persistRunIfNeeded() {
        if (engine.state.status !== 'lost')
            return;
        const highscores = readJson(HIGH_SCORES_KEY, []);
        highscores.push({
            score: engine.state.score,
            level: engine.state.level,
            seed: engine.state.seed,
            when: new Date().toISOString(),
        });
        highscores.sort((a, b) => b.score - a.score);
        writeJson(HIGH_SCORES_KEY, highscores.slice(0, 10));
        const runDate = todayIso();
        const streak = readJson(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
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
    function render() {
        boardEl.style.gridTemplateColumns = `repeat(${engine.boardSize}, 22px)`;
        const enemies = new Set(engine.state.enemies.map(spotKey));
        const cells = [];
        for (let x = 0; x < engine.boardSize; x += 1) {
            for (let y = 0; y < engine.boardSize; y += 1) {
                const key = `${x},${y}`;
                let char = '';
                let cls = 'cell';
                if (key === spotKey(engine.state.player)) {
                    cls += ' player';
                    char = '@';
                }
                else if (enemies.has(key)) {
                    cls += ' enemy';
                    char = 'X';
                }
                else if (engine.state.wrecks.has(key)) {
                    cls += ' wreck';
                    char = '*';
                }
                cells.push(`<div class="${cls}">${char}</div>`);
            }
        }
        boardEl.innerHTML = cells.join('');
        const base = `Level ${engine.state.level} | Score ${engine.state.score} | Enemies ${engine.state.enemies.length} | Teleports ${engine.state.teleports} | Seed ${engine.state.seed}`;
        statusEl.textContent = engine.state.status === 'lost' ? `${base} | Game Over` : base;
        const streak = readJson(STREAK_KEY, { lastDate: '', streak: 0, history: [] });
        historyEl.textContent = `Daily streak: ${streak.streak} day(s) | Recent: ${streak.history.slice(0, 5).join(', ') || 'none'}`;
        updateHighScores();
    }
    function step(key) {
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
