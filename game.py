import os
import random
from typing import List, Sequence, Set, Tuple

EMPTY = " "
PLAYER = "@"
ENEMY = "X"
WRECK = "*"

MOVE_MAP = {
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


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def in_bounds(spot: Tuple[int, int], board_size: int) -> bool:
    return 0 <= spot[0] < board_size and 0 <= spot[1] < board_size


def clamp_player_move(player_spot: Tuple[int, int], delta: Tuple[int, int], board_size: int) -> Tuple[int, int]:
    x = min(max(player_spot[0] + delta[0], 0), board_size - 1)
    y = min(max(player_spot[1] + delta[1], 0), board_size - 1)
    return (x, y)


def enemy_spot(board_size: int, blocked: Set[Tuple[int, int]]) -> Tuple[int, int]:
    while True:
        spot = (random.randint(0, board_size - 1), random.randint(0, board_size - 1))
        if spot not in blocked:
            return spot


def move_enemy(player_spot: Tuple[int, int], enemy: Tuple[int, int]) -> Tuple[int, int]:
    dx = 0 if enemy[0] == player_spot[0] else (1 if player_spot[0] > enemy[0] else -1)
    dy = 0 if enemy[1] == player_spot[1] else (1 if player_spot[1] > enemy[1] else -1)
    return (enemy[0] + dx, enemy[1] + dy)


def spawn_enemies(level: int, board_size: int, player_spot: Tuple[int, int]) -> List[Tuple[int, int]]:
    amount_of_enemies = max(2, level * 4)
    spots: List[Tuple[int, int]] = []
    blocked = {player_spot}
    for _ in range(amount_of_enemies):
        spot = enemy_spot(board_size, blocked)
        spots.append(spot)
        blocked.add(spot)
    return spots


def resolve_enemy_collisions(
    moved_enemies: Sequence[Tuple[int, int]],
    wrecks: Set[Tuple[int, int]],
) -> Tuple[List[Tuple[int, int]], Set[Tuple[int, int]], int]:
    next_wrecks = set(wrecks)
    counts = {}
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


def build_board(
    size: int,
    player_spot: Tuple[int, int],
    enemy_spots: Sequence[Tuple[int, int]],
    wrecks: Set[Tuple[int, int]],
) -> List[List[str]]:
    board = [[EMPTY for _ in range(size)] for _ in range(size)]
    for w in wrecks:
        if in_bounds(w, size):
            board[w[0]][w[1]] = WRECK
    for e in enemy_spots:
        if in_bounds(e, size):
            board[e[0]][e[1]] = ENEMY
    board[player_spot[0]][player_spot[1]] = PLAYER
    return board


def print_board(board: Sequence[Sequence[str]], level: int, score: int, enemies_left: int) -> None:
    size = len(board)
    print(f"Level {level} | Score {score} | Enemies left {enemies_left}")
    print(" " + "-" * ((size * 2) - 1))
    for line in board:
        print("|" + " ".join(line) + "|")
    print(" " + "-" * ((size * 2) - 1))
    print("Move: q w e / a . d / z s c | x to quit")


def read_move() -> str:
    while True:
        move = input("> ").strip().lower()
        if move in MOVE_MAP or move == "x":
            return move
        print("Invalid move. Use q,w,e,a,s,d,z,c,., or x.")


def play_level(board_size: int, level: int, score: int) -> Tuple[bool, int]:
    player_spot = (board_size // 2, board_size // 2)
    enemies = spawn_enemies(level, board_size, player_spot)
    wrecks: Set[Tuple[int, int]] = set()

    while True:
        clear_screen()
        board = build_board(board_size, player_spot, enemies, wrecks)
        print_board(board, level, score, len(enemies))

        move = read_move()
        if move == "x":
            return False, score

        player_spot = clamp_player_move(player_spot, MOVE_MAP[move], board_size)
        if player_spot in enemies or player_spot in wrecks:
            return False, score

        moved_enemies = [move_enemy(player_spot, enemy) for enemy in enemies]
        if player_spot in moved_enemies:
            return False, score

        enemies, wrecks, destroyed = resolve_enemy_collisions(moved_enemies, wrecks)
        score += destroyed * 10

        if not enemies:
            score += level * 25
            return True, score


def game(board_size: int = 20) -> None:
    if board_size < 5:
        raise ValueError("Board size must be at least 5.")

    level = 1
    score = 0

    while True:
        survived, score = play_level(board_size, level, score)
        clear_screen()
        if survived:
            print(f"Level {level} clear! Current score: {score}")
            input("Press Enter for next level...")
            level += 1
            continue

        print("Game Over.")
        print(f"Final level: {level}")
        print(f"Final score: {score}")
        break


if __name__ == "__main__":
    game(20)
