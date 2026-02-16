from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

EMPTY = " "
PLAYER = "@"
ENEMY = "X"
WRECK = "*"

MOVE_MAP: Dict[str, Tuple[int, int]] = {
    "w": (-1, 0),
    "a": (0, -1),
    "s": (1, 0),
    "d": (0, 1),
    "q": (-1, -1),
    "e": (-1, 1),
    "z": (1, -1),
    "c": (1, 1),
    ".": (0, 0),
}

SAFE_TELEPORT_KEY = "t"
RISKY_TELEPORT_KEY = "r"
QUIT_KEY = "x"

HIGHSCORE_FILE = Path("highscores.json")


@dataclass
class GameConfig:
    board_size: int = 20
    seed: Optional[int] = None
    safe_teleports_per_run: int = 3


@dataclass
class GameState:
    level: int
    score: int
    player_spot: Tuple[int, int]
    enemies: List[Tuple[int, int]]
    wrecks: Set[Tuple[int, int]] = field(default_factory=set)
    safe_teleports_left: int = 3
    turn_count: int = 0


class GameEngine:
    def __init__(self, config: GameConfig):
        self.config = config
        self.random = random.Random(config.seed)

    def start_level(self, level: int, score: int, safe_teleports_left: int) -> GameState:
        player_spot = (self.config.board_size // 2, self.config.board_size // 2)
        enemies = self._spawn_enemies(level, player_spot)
        return GameState(
            level=level,
            score=score,
            player_spot=player_spot,
            enemies=enemies,
            wrecks=set(),
            safe_teleports_left=safe_teleports_left,
        )

    def available_safe_teleport_spots(self, state: GameState) -> List[Tuple[int, int]]:
        spots: List[Tuple[int, int]] = []
        occupied = set(state.enemies) | set(state.wrecks)
        for x in range(self.config.board_size):
            for y in range(self.config.board_size):
                spot = (x, y)
                if spot not in occupied:
                    spots.append(spot)
        return spots

    def apply_player_action(self, state: GameState, action: str) -> str:
        if action == SAFE_TELEPORT_KEY:
            if state.safe_teleports_left <= 0:
                return "No safe teleports left."
            choices = self.available_safe_teleport_spots(state)
            if not choices:
                return "No safe cells available for teleport."
            state.player_spot = self.random.choice(choices)
            state.safe_teleports_left -= 1
            return "Used safe teleport."

        if action == RISKY_TELEPORT_KEY:
            state.player_spot = (
                self.random.randint(0, self.config.board_size - 1),
                self.random.randint(0, self.config.board_size - 1),
            )
            return "Used risky teleport."

        if action in MOVE_MAP:
            state.player_spot = self._clamp_player_move(state.player_spot, MOVE_MAP[action])
            return "Moved."

        return "Unknown action."

    def resolve_turn(self, state: GameState) -> str:
        state.turn_count += 1

        if state.player_spot in state.enemies or state.player_spot in state.wrecks:
            return "lost"

        moved_enemies = [self._move_enemy(state.player_spot, enemy) for enemy in state.enemies]
        if state.player_spot in moved_enemies:
            return "lost"

        state.enemies, state.wrecks, destroyed = self._resolve_enemy_collisions(moved_enemies, state.wrecks)
        state.score += destroyed * 10

        if not state.enemies:
            state.score += state.level * 25
            return "won"

        return "playing"

    def build_board(self, state: GameState) -> List[List[str]]:
        board = [[EMPTY for _ in range(self.config.board_size)] for _ in range(self.config.board_size)]
        for wreck in state.wrecks:
            board[wreck[0]][wreck[1]] = WRECK
        for enemy in state.enemies:
            board[enemy[0]][enemy[1]] = ENEMY
        board[state.player_spot[0]][state.player_spot[1]] = PLAYER
        return board

    def _spawn_enemies(self, level: int, player_spot: Tuple[int, int]) -> List[Tuple[int, int]]:
        amount_of_enemies = max(2, level * 4)
        spots: List[Tuple[int, int]] = []
        blocked = {player_spot}
        for _ in range(amount_of_enemies):
            spot = self._enemy_spot(blocked)
            spots.append(spot)
            blocked.add(spot)
        return spots

    def _enemy_spot(self, blocked: Set[Tuple[int, int]]) -> Tuple[int, int]:
        while True:
            spot = (
                self.random.randint(0, self.config.board_size - 1),
                self.random.randint(0, self.config.board_size - 1),
            )
            if spot not in blocked:
                return spot

    def _clamp_player_move(self, player_spot: Tuple[int, int], delta: Tuple[int, int]) -> Tuple[int, int]:
        x = min(max(player_spot[0] + delta[0], 0), self.config.board_size - 1)
        y = min(max(player_spot[1] + delta[1], 0), self.config.board_size - 1)
        return (x, y)

    @staticmethod
    def _move_enemy(player_spot: Tuple[int, int], enemy: Tuple[int, int]) -> Tuple[int, int]:
        dx = 0 if enemy[0] == player_spot[0] else (1 if player_spot[0] > enemy[0] else -1)
        dy = 0 if enemy[1] == player_spot[1] else (1 if player_spot[1] > enemy[1] else -1)
        return (enemy[0] + dx, enemy[1] + dy)

    @staticmethod
    def _resolve_enemy_collisions(
        moved_enemies: Sequence[Tuple[int, int]],
        wrecks: Set[Tuple[int, int]],
    ) -> Tuple[List[Tuple[int, int]], Set[Tuple[int, int]], int]:
        next_wrecks = set(wrecks)
        counts: Dict[Tuple[int, int], int] = {}
        for enemy in moved_enemies:
            counts[enemy] = counts.get(enemy, 0) + 1

        survivors: List[Tuple[int, int]] = []
        destroyed = 0
        for enemy in moved_enemies:
            if enemy in next_wrecks:
                destroyed += 1
                continue
            if counts[enemy] > 1:
                next_wrecks.add(enemy)
                destroyed += 1
                continue
            survivors.append(enemy)

        return survivors, next_wrecks, destroyed


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def print_board(board: Sequence[Sequence[str]], state: GameState) -> None:
    size = len(board)
    print(
        f"Level {state.level} | Score {state.score} | Enemies {len(state.enemies)} | "
        f"Safe teleports {state.safe_teleports_left} | Turn {state.turn_count}"
    )
    print(" " + "-" * ((size * 2) - 1))
    for line in board:
        print("|" + " ".join(line) + "|")
    print(" " + "-" * ((size * 2) - 1))
    print("Move: q w e / a . d / z s c | t=safe teleport | r=risky teleport | x=quit")


def read_move() -> str:
    valid = set(MOVE_MAP) | {SAFE_TELEPORT_KEY, RISKY_TELEPORT_KEY, QUIT_KEY}
    while True:
        move = input("> ").strip().lower()
        if move in valid:
            return move
        print("Invalid move. Use q,w,e,a,s,d,z,c,.,t,r or x.")


def load_highscores(path: Path = HIGHSCORE_FILE) -> List[dict]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_highscore(entry: dict, path: Path = HIGHSCORE_FILE, limit: int = 10) -> List[dict]:
    scores = load_highscores(path)
    scores.append(entry)
    scores.sort(key=lambda item: (item["score"], item["level"]), reverse=True)
    trimmed = scores[:limit]
    path.write_text(json.dumps(trimmed, indent=2), encoding="utf-8")
    return trimmed


def print_highscores(scores: Sequence[dict]) -> None:
    if not scores:
        print("No highscores yet.")
        return
    print("\nTop Runs")
    for idx, score in enumerate(scores, start=1):
        print(
            f"{idx:>2}. {score['name']:<12} score={score['score']:<5} "
            f"level={score['level']:<3} turns={score['turns']:<4} seed={score['seed']}"
        )


def game(config: GameConfig) -> None:
    if config.board_size < 5:
        raise ValueError("Board size must be at least 5.")

    engine = GameEngine(config)
    level = 1
    score = 0
    safe_teleports_left = config.safe_teleports_per_run
    turns_total = 0

    while True:
        state = engine.start_level(level, score, safe_teleports_left)

        while True:
            clear_screen()
            print_board(engine.build_board(state), state)
            action = read_move()
            if action == QUIT_KEY:
                clear_screen()
                print("You quit the game.")
                return

            message = engine.apply_player_action(state, action)
            status = engine.resolve_turn(state)
            turns_total += 1

            if status == "playing":
                continue

            clear_screen()
            print_board(engine.build_board(state), state)
            print(message)

            if status == "won":
                print(f"Level {level} clear!")
                level += 1
                score = state.score
                safe_teleports_left = state.safe_teleports_left
                input("Press Enter for next level...")
                break

            print("Game Over.")
            player_name = input("Name for highscore table (blank for Player): ").strip() or "Player"
            entry = {
                "name": player_name,
                "score": state.score,
                "level": state.level,
                "turns": turns_total,
                "seed": config.seed,
                "date": date.today().isoformat(),
            }
            scores = save_highscore(entry)
            print_highscores(scores)
            return


def parse_args() -> GameConfig:
    parser = argparse.ArgumentParser(description="Play Droids in your terminal")
    parser.add_argument("--board-size", type=int, default=20, help="Board size (default: 20)")
    parser.add_argument("--seed", type=int, default=None, help="Seed for deterministic runs")
    parser.add_argument(
        "--safe-teleports",
        type=int,
        default=3,
        help="Safe teleports per run (default: 3)",
    )
    args = parser.parse_args()
    return GameConfig(
        board_size=args.board_size,
        seed=args.seed,
        safe_teleports_per_run=args.safe_teleports,
    )


if __name__ == "__main__":
    game(parse_args())
