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

    # Set enemy icon
    enemies = 'X'

    # Set player spot and place player
    # player_spot = [size // 2, size // 2]
    board[player_spot[0]][player_spot[1]] = player

    # Set enemy amount, insuring an even amount
    # amount_of_enemies = level * 4
    # if amount_of_enemies % 2 != 0:
    #     amount_of_enemies += 1

    # Place enemies on board
    # for num in range(amount_of_enemies):
    #     x,y = enemy_spot(size)
    #     board[x][y] = enemies
    for spot in enemy_spots:
        board[spot[0]][spot[1]] = enemies

    return [board, player_spot, enemy_spots]

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

def game(board_size):
    player = chr(169)
    # Set player level
    level = 1
    # Set enemy icon
    enemies = 'X'
    # Set killed enemy icon
    killed_enemy = '*'

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

    playing = True
    movements = {'up':'up', 'down':'down', 'left':'left', 'right':'right'}

    while playing:
        os.system("cls")
        # This will print the board formatted correctly
        for line in board[0]:
            print(' '.join(line))

        if keyboard.read_key() in movements:
            # board[0][player_spot[0]][player_spot[1]] = '0'
            new_coords = move_player(board[1], keyboard.read_key())
            board = build_board(board_size, level, [new_coords[0], new_coords[1]], enemy_spots)
            # board[0][new_coords[0]][new_coords[1]] = player
            # board[1] = [new_coords[0], new_coords[1]]
            
    

game(20)