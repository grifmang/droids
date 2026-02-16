type Spot = [number, number];

type State = {
  level: number;
  score: number;
  player: Spot;
  enemies: Spot[];
  wrecks: Set<string>;
  teleports: number;
  seed: number;
  status: "playing" | "won" | "lost";
};

const BOARD_SIZE = 20;
const MOVE_MAP: Record<string, Spot> = {
  w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1],
  q: [-1, -1], e: [-1, 1], z: [1, -1], c: [1, 1],
  ".": [0, 0],
};

function key(spot: Spot): string { return `${spot[0]},${spot[1]}`; }
