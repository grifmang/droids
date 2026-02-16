(() => {
  const BOARD_SIZE = 20;
  const SAFE_TELEPORTS = 3;
  const MOVE_MAP = {
    w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1],
    q: [-1, -1], e: [-1, 1], z: [1, -1], c: [1, 1],
    ".": [0, 0],
  };

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const shareBtn = document.getElementById("share");
  const newRunBtn = document.getElementById("new-run");
  const dailyBtn = document.getElementById("daily");
  const canvas = document.getElementById("share-card");
  const preview = document.getElementById("share-preview");

  let rng = Math.random;
  let state;

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function spotKey([x, y]) { return `${x},${y}`; }
  function fromKey(k) { return k.split(",").map(Number); }

  function randInt(min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function spawnEnemies(level, player) {
    const total = Math.max(2, level * 4);
    const blocked = new Set([spotKey(player)]);
    const enemies = [];
    while (enemies.length < total) {
      const spot = [randInt(0, BOARD_SIZE - 1), randInt(0, BOARD_SIZE - 1)];
      const k = spotKey(spot);
      if (!blocked.has(k)) {
        enemies.push(spot);
        blocked.add(k);
      }
    }
    return enemies;
  }

  function moveEnemy(player, enemy) {
    const dx = enemy[0] === player[0] ? 0 : (player[0] > enemy[0] ? 1 : -1);
    const dy = enemy[1] === player[1] ? 0 : (player[1] > enemy[1] ? 1 : -1);
    return [enemy[0] + dx, enemy[1] + dy];
  }

  function resolveEnemyCollisions(moved, wrecks) {
    const counts = new Map();
    moved.forEach((e) => {
      const k = spotKey(e);
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    const nextWrecks = new Set(wrecks);
    const survivors = [];
    let destroyed = 0;
    moved.forEach((e) => {
      const k = spotKey(e);
      if (nextWrecks.has(k) || counts.get(k) > 1) {
        nextWrecks.add(k);
        destroyed += 1;
      } else {
        survivors.push(e);
      }
    });

    return { survivors, nextWrecks, destroyed };
  }

  function dailySeed() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return Number(today);
  }

  function reset(seed = Date.now()) {
    rng = mulberry32(seed);
    state = {
      level: 1,
      score: 0,
      teleports: SAFE_TELEPORTS,
      player: [10, 10],
      enemies: spawnEnemies(1, [10, 10]),
      wrecks: new Set(),
      status: "playing",
      seed,
    };
    render();
  }

  function levelUp() {
    state.level += 1;
    state.player = [10, 10];
    state.enemies = spawnEnemies(state.level, state.player);
    state.wrecks = new Set();
  }

  function safeTeleport() {
    if (state.teleports <= 0) return;
    const blocked = new Set(state.enemies.map(spotKey));
    state.wrecks.forEach((k) => blocked.add(k));
    const spots = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const s = [x, y];
        if (!blocked.has(spotKey(s))) spots.push(s);
      }
    }
    state.player = spots[randInt(0, spots.length - 1)];
    state.teleports -= 1;
  }

  function riskyTeleport() {
    state.player = [randInt(0, BOARD_SIZE - 1), randInt(0, BOARD_SIZE - 1)];
  }

  function step(action) {
    if (state.status !== "playing") return;

    if (action === "t") safeTeleport();
    else if (action === "r") riskyTeleport();
    else if (MOVE_MAP[action]) {
      const [dx, dy] = MOVE_MAP[action];
      state.player = [
        clamp(state.player[0] + dx, 0, BOARD_SIZE - 1),
        clamp(state.player[1] + dy, 0, BOARD_SIZE - 1),
      ];
    }

    const playerKey = spotKey(state.player);
    if (state.enemies.some((e) => spotKey(e) === playerKey) || state.wrecks.has(playerKey)) {
      state.status = "lost";
      render();
      return;
    }

    const moved = state.enemies.map((e) => moveEnemy(state.player, e));
    if (moved.some((e) => spotKey(e) === playerKey)) {
      state.status = "lost";
      render();
      return;
    }

    const { survivors, nextWrecks, destroyed } = resolveEnemyCollisions(moved, state.wrecks);
    state.enemies = survivors;
    state.wrecks = nextWrecks;
    state.score += destroyed * 10;

    if (state.enemies.length === 0) {
      state.score += state.level * 25;
      levelUp();
    }

    render();
  }

  function render() {
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 22px)`;
    const cells = [];
    const enemies = new Set(state.enemies.map(spotKey));
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const k = `${x},${y}`;
        let char = "";
        let cls = "cell";
        if (k === spotKey(state.player)) {
          char = "@";
          cls += " player";
        } else if (enemies.has(k)) {
          char = "X";
          cls += " enemy";
        } else if (state.wrecks.has(k)) {
          char = "*";
          cls += " wreck";
        }
        cells.push(`<div class="${cls}">${char}</div>`);
      }
    }
    boardEl.innerHTML = cells.join("");
    statusEl.textContent = `Level ${state.level} | Score ${state.score} | Enemies ${state.enemies.length} | Teleports ${state.teleports} | Seed ${state.seed}`;

    if (state.status === "lost") {
      statusEl.textContent += " | Game Over (press New Run or Daily Challenge)";
    }
  }

  function buildShareCard() {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("Droids", 40, 70);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "28px sans-serif";
    ctx.fillText(`Score: ${state.score}`, 40, 130);
    ctx.fillText(`Level: ${state.level}`, 40, 175);
    ctx.fillText(`Teleports left: ${state.teleports}`, 40, 220);
    ctx.fillText(`Seed: ${state.seed}`, 40, 265);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px sans-serif";
    ctx.fillText("Play Droids daily challenge in your browser", 40, 320);

    preview.src = canvas.toDataURL("image/png");
    preview.classList.remove("hidden");
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "q", "e", "z", "c", ".", "t", "r"].includes(key)) {
      event.preventDefault();
      step(key);
    }
  });

  newRunBtn.addEventListener("click", () => reset(Date.now()));
  dailyBtn.addEventListener("click", () => reset(dailySeed()));
  shareBtn.addEventListener("click", buildShareCard);

  reset(Date.now());
})();
