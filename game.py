import os
import random

import keyboard


def build_board(size, player_spot, enemy_spots):
    """Build board state without mutating enemy positions list."""
    board = [[' ' for _ in range(size)] for _ in range(size)]

    player = chr(169)
    killed_enemy = '*'
    enemy_icon = 'X'

    board[player_spot[0]][player_spot[1]] = player

    # Count enemy occupancy to detect collisions.
    counts = {}
    for r, c in enemy_spots:
        counts[(r, c)] = counts.get((r, c), 0) + 1

    enemy_locations = []
    for (r, c), count in counts.items():
        if count > 1:
            board[r][c] = killed_enemy
        else:
            board[r][c] = enemy_icon
            enemy_locations.append([r, c])

    return [board, player_spot, enemy_spots, enemy_locations]


def move_player(player_spot, key, board_size):
    movements = {
        'q': (-1, -1), 'w': (-1, 0), 'e': (-1, 1),
        'a': (0, -1),  's': (0, 0),  'd': (0, 1),
        'z': (1, -1),  'x': (1, 0),  'c': (1, 1),
    }
    if key not in movements:
        return list(player_spot)

    dr, dc = movements[key]
    nr = max(0, min(board_size - 1, player_spot[0] + dr))
    nc = max(0, min(board_size - 1, player_spot[1] + dc))
    return [nr, nc]


def enemy_spot(board_size, excluded=None):
    """Choose a random row/col for enemy placement, optionally excluding coordinates."""
    excluded_set = set(tuple(x) for x in (excluded or []))
    while True:
        x = random.randint(0, board_size - 1)
        y = random.randint(0, board_size - 1)
        if (x, y) not in excluded_set:
            return [x, y]


def move_enemy(player_spot, one_enemy_spot, board_length):
    if player_spot[0] < one_enemy_spot[0] and one_enemy_spot[0] > 0:
        one_enemy_spot[0] -= 1
    if player_spot[0] > one_enemy_spot[0] and one_enemy_spot[0] < board_length - 1:
        one_enemy_spot[0] += 1
    if player_spot[1] < one_enemy_spot[1] and one_enemy_spot[1] > 0:
        one_enemy_spot[1] -= 1
    if player_spot[1] > one_enemy_spot[1] and one_enemy_spot[1] < board_length - 1:
        one_enemy_spot[1] += 1
    return one_enemy_spot


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def game(board_size):
    level = 1

    amount_of_enemies = level * 4
    if amount_of_enemies % 2 != 0:
        amount_of_enemies += 1

    player_start = [board_size // 2, board_size // 2]
    enemy_array = [enemy_spot(board_size, excluded=[player_start]) for _ in range(amount_of_enemies)]

    board = build_board(board_size, player_start, enemy_array)
    enemy_spots = board[2]

    playing = True
    valid_keys = {'q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'}

    while playing:
        clear_screen()
        print_border = (board_size * 2) - 1
        print(' ' + ('-' * print_border))
        for line in board[0]:
            print('|' + ' '.join(line) + '|')
        print(' ' + ('-' * print_border))

        key = keyboard.read_key()
        if key not in valid_keys:
            continue

        new_coords = move_player(board[1], key, board_size)
        for s in enemy_spots:
            move_enemy(new_coords, s, board_size)

        board = build_board(board_size, new_coords, enemy_spots)

        if new_coords in enemy_spots:
            print('Game Over.')
            playing = False


if __name__ == "__main__":
    game(20)
