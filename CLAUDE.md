# CLAUDE.md

This file provides guidance when working with code in this repository.

## Project Overview

"Droids" is a remake of a childhood BASIC game. The player (©) navigates a grid while enemies (X) chase them. Enemies that collide with each other become wreckage (*). The game ends when the player is caught.

## Running the Game

**Terminal version** (requires elevated shell permissions on some platforms for the `keyboard` library):
```bash
python game.py
```

**Tkinter GUI version:**
```bash
python tk_game.py
```

**Web version:**
Open `index.html` in a browser.

## Dependencies

- `game.py` requires: `keyboard`
- `tk_game.py` requires: `tkinter` (stdlib)

Install missing package:
```bash
pip install keyboard
```

## Architecture

Core Python functions shared by both `game.py` and `tk_game.py`:

- **`build_board(size, player_spot, enemy_spots)`** — Builds board state and marks enemy collisions (`*`) without mutating input order.
- **`move_player(player_spot, key, board_size)`** — Maps keypad-style movement keys (`qwe/asd/zxc`) and clamps to board bounds.
- **`enemy_spot(board_size, excluded=None)`** — Generates random enemy spawn location, optionally avoiding excluded cells.
- **`move_enemy(player_spot, enemy_spot, board_length)`** — Moves enemy one step toward player on each axis.

`game.py` renders in terminal and reads input from `keyboard.read_key()`.

`tk_game.py` renders on a tkinter `Canvas` and handles movement via key events.
