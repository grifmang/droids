import random
import tkinter as tk

def build_board(size, level, player_spot, enemy_spots):
    # Construct a 2D array for game board
    board = []
    for x in range(size):
        board.append([' ' for y in range(size)])

    # Set player icon
    player = chr(169)

    # Set killed enemy icon
    killed_enemy = '*'

    # Set enemy icon
    enemies = 'X'
    enemy_locations = []

    # Set player spot and place player
    board[player_spot[0]][player_spot[1]] = player

    for index, spot in enumerate(enemy_spots):
        current_spot = enemy_spots.pop(index)
        if current_spot in enemy_spots:
            board[spot[0]][spot[1]] = killed_enemy
            continue
        else:
            enemy_spots.insert(0, current_spot)
        board[spot[0]][spot[1]] = enemies
        enemy_locations.append(board[spot[0]][spot[1]])

    return [board, player_spot, enemy_spots, enemy_locations]

def move_player(player_spot, key):
    movements = {
        'q': (-1, -1), 'w': (-1, 0), 'e': (-1, 1),
        'a': (0, -1),  's': (0, 0),  'd': (0, 1),
        'z': (1, -1),  'x': (1, 0),  'c': (1, 1),
    }
    if key in movements:
        dr, dc = movements[key]
        return [player_spot[0] + dr, player_spot[1] + dc]
    return list(player_spot)

def enemy_spot(board_size):
    # Function to choose a random row/col for enemy placement
    x = random.randint(0, board_size - 1)
    y = random.randint(0, board_size - 1)
    return [x, y]

def move_enemy(player_spot, enemy_spot, board_length):
    if player_spot[0] < enemy_spot[0] and enemy_spot[0] != 0:
        enemy_spot[0] -= 1
    if player_spot[0] > enemy_spot[0] and enemy_spot[0] > board_length:
        enemy_spot[0] += 1
    if player_spot[1] < enemy_spot[1] and enemy_spot[1] != 0:
        enemy_spot[1] -= 1
    if player_spot[1] > enemy_spot[1] and enemy_spot[1] > board_length:
        enemy_spot[1] += 1
    return enemy_spot

def game(board_size, canvas):
    player = chr(169)
    # Set player level
    level = 1
    # Set enemy icon
    enemies = 'X'

    enemy_array = []
    amount_of_enemies = level * 4
    if amount_of_enemies % 2 != 0:
        amount_of_enemies += 1
    for num in range(amount_of_enemies):
        enemy_array.append(enemy_spot(board_size))

    # Get board
    board = build_board(board_size, level, [board_size // 2, board_size // 2], enemy_array)
    player_spot = board[1]
    enemy_spots = board[2]
    enemy_locations = board[3]

    valid_keys = {'q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'}

    def key_pressed(event):
        key = event.keysym.lower()
        if key in valid_keys:
            new_coords = move_player(board[1], key)
            board = build_board(board_size, level, [new_coords[0], new_coords[1]], enemy_spots)
            for s in enemy_spots:
                s = move_enemy(board[1], s, len(board[0]))
            redraw_board()

    def redraw_board():
        canvas.delete("all")
        for row in range(len(board[0])):
            for col in range(len(board[0][row])):
                cell_value = board[0][row][col]
                if cell_value == ' ':
                    canvas.create_rectangle(col * 50, row * 50, (col + 1) * 50, (row + 1) * 50, fill="white", outline="black")
                elif cell_value == chr(169):
                    canvas.create_rectangle(col * 50, row * 50, (col + 1) * 50, (row + 1) * 50, fill="blue", outline="black")
                elif cell_value == 'X':
                    canvas.create_rectangle(col * 50, row * 50, (col + 1) * 50, (row + 1) * 50, fill="red", outline="black")
                elif cell_value == '*':
                    canvas.create_rectangle(col * 50, row * 50, (col + 1) * 50, (row + 1) * 50, fill="gray", outline="black")

    redraw_board()

    canvas.focus_set()
    canvas.bind("<Key>", key_pressed)

def main():
    root = tk.Tk()
    root.title("Game Window")

    board_size = 10

    canvas = tk.Canvas(root, width=board_size*50, height=board_size*50)
    canvas.pack()

    game(board_size, canvas)

    root.mainloop()

if __name__ == "__main__":
    main()
