# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Droids" is a Python remake of a childhood game originally written in BASIC for VAX Cluster machines. The player (©) navigates a grid while enemies (X) chase them. Enemies that collide with each other become killed markers (*). The game ends when the player is caught.

## Running the Game

**Terminal version** (requires admin/elevated shell for the `keyboard` library):
```bash
python game.py
```

**Tkinter GUI version:**
```bash
python tk_game.py
```

## Dependencies

The venv is already set up. To activate it:
```bash
source venv/Scripts/activate
```

- `game.py` requires: `keyboard`, `numpy` (imported but unused)
- `tk_game.py` requires: `tkinter` (stdlib only)

Install missing packages: `pip install keyboard numpy`

## Architecture

Both `game.py` and `tk_game.py` share the same core functions:

- **`build_board(size, level, player_spot, enemy_spots)`** — Constructs the 2D board array and places all entities. Returns `[board, player_spot, enemy_spots, enemy_locations]`. The collision detection for enemies occupying the same cell happens here (duplicate spots → `*`).
- **`move_player(player_spot, key)`** — Pure function; maps direction strings (`'up'`/`'down'`/`'left'`/`'right'`) to new `[row, col]` coordinates. No bounds checking.
- **`enemy_spot(board_size)`** — Generates a random `[row, col]` for initial enemy placement.
- **`move_enemy(player_spot, enemy_spot, board_length)`** — Moves one enemy one step closer to the player. Mutates `enemy_spot` in place.

**`game.py`** uses a blocking `keyboard.read_key()` loop with `cls` screen clearing and arrow key input.

**`tk_game.py`** uses a tkinter `Canvas` with WASD key bindings and a `redraw_board()` function that redraws all cells each frame. Each cell is 50×50 pixels.

## Key Behaviors / Known Issues

- `build_board` has a mutating loop bug: it pops and reinserts `enemy_spots` entries during iteration, which can produce unexpected ordering.
- `move_enemy` uses `board_length` (the row count) as the lower bound check, but this should likely be `board_length - 1`.
- `game.py` calls `keyboard.read_key()` twice per loop iteration (once to check, once to act), so fast input may mismatch.
- `tk_game.py`'s `key_pressed` references `board` from the enclosing scope but reassigns it locally — this will raise `UnboundLocalError` at runtime due to Python scoping rules.
