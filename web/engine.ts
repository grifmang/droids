export type Spot = [number, number];
export type GameStatus = 'playing' | 'lost';

export type GameState = {
  level: number;
  score: number;
  player: Spot;
  enemies: Spot[];
  wrecks: Set<string>;
  teleports: number;
  seed: number;
  status: GameStatus;
};

export type EngineOptions = {
  boardSize?: number;
  safeTeleports?: number;
};

export const MOVE_MAP: Record<string, Spot> = {
  w: [-1, 0],
  a: [0, -1],
  s: [1, 0],
  d: [0, 1],
  q: [-1, -1],
  e: [-1, 1],
  z: [1, -1],
  c: [1, 1],
  '.': [0, 0],
};

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function spotKey([x, y]: Spot): string {
  return `${x},${y}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function spawnEnemies(level: number, player: Spot, boardSize: number, rng: () => number): Spot[] {
  const total = Math.max(2, level * 4);
  const blocked = new Set([spotKey(player)]);
  const enemies: Spot[] = [];
  while (enemies.length < total) {
    const spot: Spot = [randInt(rng, 0, boardSize - 1), randInt(rng, 0, boardSize - 1)];
    const key = spotKey(spot);
    if (!blocked.has(key)) {
      blocked.add(key);
      enemies.push(spot);
    }
  }
  return enemies;
}

export function moveEnemy(player: Spot, enemy: Spot): Spot {
  const dx = enemy[0] === player[0] ? 0 : player[0] > enemy[0] ? 1 : -1;
  const dy = enemy[1] === player[1] ? 0 : player[1] > enemy[1] ? 1 : -1;
  return [enemy[0] + dx, enemy[1] + dy];
}

export function resolveEnemyCollisions(moved: Spot[], wrecks: Set<string>): { survivors: Spot[]; nextWrecks: Set<string>; destroyed: number } {
  const counts = new Map<string, number>();
  moved.forEach((enemy) => {
    const key = spotKey(enemy);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const nextWrecks = new Set(wrecks);
  const survivors: Spot[] = [];
  let destroyed = 0;

  moved.forEach((enemy) => {
    const key = spotKey(enemy);
    if (nextWrecks.has(key) || (counts.get(key) ?? 0) > 1) {
      nextWrecks.add(key);
      destroyed += 1;
    } else {
      survivors.push(enemy);
    }
  });

  return { survivors, nextWrecks, destroyed };
}

export function dailySeed(date = new Date()): number {
  return Number(date.toISOString().slice(0, 10).replace(/-/g, ''));
}

export function safeTeleportDestinations(state: GameState, boardSize: number): Spot[] {
  const blocked = new Set(state.enemies.map(spotKey));
  state.wrecks.forEach((k) => blocked.add(k));
  const spots: Spot[] = [];
  for (let x = 0; x < boardSize; x += 1) {
    for (let y = 0; y < boardSize; y += 1) {
      const spot: Spot = [x, y];
      if (!blocked.has(spotKey(spot))) {
        spots.push(spot);
      }
    }
  }
  return spots;
}

export function createInitialState(seed: number, options: Required<EngineOptions>): GameState {
  const rng = mulberry32(seed);
  const player: Spot = [Math.floor(options.boardSize / 2), Math.floor(options.boardSize / 2)];
  return {
    level: 1,
    score: 0,
    teleports: options.safeTeleports,
    player,
    enemies: spawnEnemies(1, player, options.boardSize, rng),
    wrecks: new Set<string>(),
    status: 'playing',
    seed,
  };
}

export class DroidsEngine {
  private rng: () => number = Math.random;

  state: GameState;

  readonly boardSize: number;

  readonly safeTeleports: number;

  constructor(seed = Date.now(), options: EngineOptions = {}) {
    this.boardSize = options.boardSize ?? 20;
    this.safeTeleports = options.safeTeleports ?? 3;
    this.state = createInitialState(seed, { boardSize: this.boardSize, safeTeleports: this.safeTeleports });
    this.rng = mulberry32(seed);
  }

  reset(seed = Date.now()): void {
    this.state = createInitialState(seed, { boardSize: this.boardSize, safeTeleports: this.safeTeleports });
    this.rng = mulberry32(seed);
  }

  private levelUp(): void {
    this.state.level += 1;
    this.state.player = [Math.floor(this.boardSize / 2), Math.floor(this.boardSize / 2)];
    this.state.enemies = spawnEnemies(this.state.level, this.state.player, this.boardSize, this.rng);
    this.state.wrecks = new Set<string>();
  }

  private safeTeleport(): void {
    if (this.state.teleports <= 0) return;
    const spots = safeTeleportDestinations(this.state, this.boardSize);
    if (spots.length === 0) return;
    this.state.player = spots[randInt(this.rng, 0, spots.length - 1)];
    this.state.teleports -= 1;
  }

  private riskyTeleport(): void {
    this.state.player = [randInt(this.rng, 0, this.boardSize - 1), randInt(this.rng, 0, this.boardSize - 1)];
  }

  step(action: string): GameState {
    if (this.state.status !== 'playing') return this.state;

    if (action === 't') this.safeTeleport();
    else if (action === 'r') this.riskyTeleport();
    else if (MOVE_MAP[action]) {
      const [dx, dy] = MOVE_MAP[action];
      this.state.player = [
        clamp(this.state.player[0] + dx, 0, this.boardSize - 1),
        clamp(this.state.player[1] + dy, 0, this.boardSize - 1),
      ];
    }

    const playerKey = spotKey(this.state.player);
    if (this.state.enemies.some((enemy) => spotKey(enemy) === playerKey) || this.state.wrecks.has(playerKey)) {
      this.state.status = 'lost';
      return this.state;
    }

    const movedEnemies = this.state.enemies.map((enemy) => moveEnemy(this.state.player, enemy));
    if (movedEnemies.some((enemy) => spotKey(enemy) === playerKey)) {
      this.state.status = 'lost';
      return this.state;
    }

    const { survivors, nextWrecks, destroyed } = resolveEnemyCollisions(movedEnemies, this.state.wrecks);
    this.state.enemies = survivors;
    this.state.wrecks = nextWrecks;
    this.state.score += destroyed * 10;

    if (this.state.enemies.length === 0) {
      this.state.score += this.state.level * 25;
      this.levelUp();
    }

    return this.state;
  }
}
