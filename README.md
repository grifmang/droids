Childhood game, originally written in BASIC for VAX Cluster machines, remade in Python.

## Running

```bash
python3 game.py
```

## How to play

- You are `@`.
- Enemies are `X`.
- Wrecks are `*`.
- Move using:

```
q w e
a . d
z s c
```

- `.` waits in place.
- `x` quits.
- If enemies collide with each other (or wrecks), they are destroyed.
- If an enemy or wreck reaches you, the game ends.
