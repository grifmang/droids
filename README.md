# Droids

A remake of a childhood BASIC game originally run on VAX Cluster machines.

The player (`©`) moves on a grid while enemy droids (`X`) chase. Enemy collisions create wreckage (`*`), and the game ends when a droid catches the player.

## Run options

### Web version (recommended)
Open `index.html` in a browser, or serve the repo root with any static file server.

### Terminal version
```bash
python game.py
```

> `game.py` uses the `keyboard` package, which may require elevated privileges depending on OS.

### Tkinter GUI version
```bash
python tk_game.py
```

## Dependencies

- Python 3.10+
- `keyboard` for terminal mode
- `tkinter` (stdlib) for GUI mode

Install terminal dependency:

```bash
pip install keyboard
```
