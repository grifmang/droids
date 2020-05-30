import random
import os
import numpy as np
import keyboard

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
    x_movements = {'up': -1, 'down': 1}
    y_movements = { 'left': -1, 'right': 1}

    if key in x_movements:
        return [player_spot[0] + x_movements[key], player_spot[1]]
    elif key in y_movements:
        return [player_spot[0], player_spot[1] + y_movements[key]]

def enemy_spot(board_size):
    # Function to choose a random row/col for enemy placement
    x = random.randint(0, board_size - 1)
    y = random.randint(0, board_size - 1)
    return [x,y]

def move_enemy(player_spot, enemy_spot, board_length):
    # for num in enemy_spot:
    #     print(num)
    if player_spot[0] < enemy_spot[0] and enemy_spot[0] != 0:
        enemy_spot[0] -= 1
    if player_spot[0] > enemy_spot[0] and enemy_spot[0] > board_length:
        enemy_spot[0] += 1
    if player_spot[1] < enemy_spot[1] and enemy_spot[1] != 0:
        enemy_spot[1] -= 1
    if player_spot[1] > enemy_spot[1] and enemy_spot[1] > board_length:
        enemy_spot[1] += 1
    return enemy_spot

def game(board_size):
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
    board = build_board(board_size, level, [board_size // 2, board_size // 2],  enemy_array)
    player_spot = board[1]
    enemy_spots = board[2]
    enemy_locations = board[3]

    playing = True
    movements = {'up':'up', 'down':'down', 'left':'left', 'right':'right'}

    while playing:
        os.system("cls")
        print_border = (board_size * 2) - 1
        print(' ' + ('-' * print_border))
        # This will print the board formatted correctly
        for line in board[0]:
            print('|' + ' '.join(line) + '|')
        print(' ' + ('-' * print_border))

        if keyboard.read_key() in movements:
            new_coords = move_player(board[1], keyboard.read_key())
            board = build_board(board_size, level, [new_coords[0], new_coords[1]], enemy_spots)
            # print(enemy_spots)
            for s in enemy_spots:
                # print(s)
                s = move_enemy(board[1], s, len(board[0]))
            # board = build_board(board_size, level, [new_coords[0], new_coords[1]], enemy_spots)
            
        
        if new_coords in enemy_spots:
            print('Game Over.')
            playing = False


game(20)