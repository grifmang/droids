import type { GameState } from './engine.js';

export type RunSummary = Pick<GameState, 'score' | 'level' | 'seed' | 'teleports'>;

export function buildRunSummaryLink(state: RunSummary): string {
  const params = new URLSearchParams({
    score: String(state.score),
    level: String(state.level),
    seed: String(state.seed),
    teleports: String(state.teleports),
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function parseRunSummaryLink(url: string): RunSummary | null {
  const parsedUrl = new URL(url);
  const score = parsePositiveInt(parsedUrl.searchParams.get('score'));
  const level = parsePositiveInt(parsedUrl.searchParams.get('level'));
  const seed = parsePositiveInt(parsedUrl.searchParams.get('seed'));
  const teleports = parsePositiveInt(parsedUrl.searchParams.get('teleports'));

  if (score === null || level === null || seed === null || teleports === null) {
    return null;
  }

  return { score, level, seed, teleports };
}

export function renderShareCard(state: GameState, canvas: HTMLCanvasElement, preview: HTMLImageElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('Droids', 40, 70);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '28px sans-serif';
  ctx.fillText(`Score: ${state.score}`, 40, 130);
  ctx.fillText(`Level: ${state.level}`, 40, 175);
  ctx.fillText(`Teleports left: ${state.teleports}`, 40, 220);
  ctx.fillText(`Seed: ${state.seed}`, 40, 265);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText('Play Droids daily challenge in your browser', 40, 320);

  preview.src = canvas.toDataURL('image/png');
  preview.classList.remove('hidden');
}
