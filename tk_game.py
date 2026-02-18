import random
import tkinter as tk


def build_board(size, player_spot, enemy_spots):
    """Build board state without mutating enemy positions list."""
    board = [[' ' for _ in range(size)] for _ in range(size)]

    player = chr(169)
    killed_enemy = '*'
    enemy_icon = 'X'

    board[player_spot[0]][player_spot[1]] = player

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


def game(board_size, canvas):
    level = 1

    amount_of_enemies = level * 4
    if amount_of_enemies % 2 != 0:
        amount_of_enemies += 1

    player_start = [board_size // 2, board_size // 2]
    enemy_spots = [enemy_spot(board_size, excluded=[player_start]) for _ in range(amount_of_enemies)]

    board = build_board(board_size, player_start, enemy_spots)

    valid_keys = {'q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'}

    def redraw_board():
        canvas.delete("all")
        for row in range(len(board[0])):
            for col in range(len(board[0][row])):
                cell_value = board[0][row][col]
                if cell_value == ' ':
                    fill = "white"
                elif cell_value == chr(169):
                    fill = "blue"
                elif cell_value == 'X':
                    fill = "red"
                else:
                    fill = "gray"
                canvas.create_rectangle(
                    col * 50,
                    row * 50,
                    (col + 1) * 50,
                    (row + 1) * 50,
                    fill=fill,
                    outline="black",
                )

    def key_pressed(event):
        nonlocal board

        key = event.keysym.lower()
        if key not in valid_keys:
            return

        new_coords = move_player(board[1], key, board_size)
        for s in enemy_spots:
            move_enemy(new_coords, s, board_size)

        board = build_board(board_size, new_coords, enemy_spots)
        redraw_board()

        if new_coords in enemy_spots:
            canvas.unbind("<Key>")
            canvas.create_text(
                board_size * 25,
                board_size * 25,
                text="GAME OVER",
                fill="black",
                font=("Courier New", 24, "bold"),
            )

    redraw_board()

    canvas.focus_set()
    canvas.bind("<Key>", key_pressed)


def main():
    root = tk.Tk()
    root.title("Game Window")

    board_size = 10

    canvas = tk.Canvas(root, width=board_size * 50, height=board_size * 50)
    canvas.pack()

    game(board_size, canvas)

    root.mainloop()


if __name__ == "__main__":
    main()
