# Survivability Improvements Design

**Date:** 2026-03-07
**Scope:** Make Survival mode more fun by giving players tools to escape and fight back

## Problem

Players die too quickly. Enemies converge from all sides and the only defense is luring them into collisions. With 4+ enemies chasing simultaneously, players get cornered fast.

## Solution: Three Systems

### 1. Teleport

- **Charges:** Start with 2, max 5
- **Earning:** +1 every 3 waves cleared, plus `+` pickups on the board
- **Activation:** Press `T` key, or tap a teleport button (added near keypad)
- **Behavior:** Warps player to a random empty cell (no enemies, no wreckage, not current position)
- **HUD:** Show charges next to HP, e.g. `♥♥♥♡♡ TP:2`
- **During break phase:** Teleport works
- **At 0 charges:** Key press does nothing

### 2. Power-Ups

Three types that appear on the board:

| Symbol | Color | Name | Effect |
|--------|-------|------|--------|
| `+` | Cyan (#33ffff) | Teleport Charge | +1 teleport charge (capped at 5) |
| `S` | White (#ffffff) | Shield | Grants 1-hit shield — next enemy contact deals 0 damage |
| `B` | Yellow (#ffff33) | Bomb | Destroys all enemies in the 8 cells surrounding the player |

**Spawning:**
- Between waves: 2 bonus asterisks + 1 random power-up
- During waves: 3% chance per player move to spawn a random power-up on an empty cell
- Power-ups persist until picked up
- Max 3 power-ups on the board at once

**Shield details:**
- Stored as `state.shield = true`
- Absorbs one hit, then consumed. Enemy still destroyed on contact.
- Player `O` rendered in white (#ffffff) instead of green when shielded
- Only 1 shield at a time

**Bomb details:**
- Instant on pickup — enemies in 8 adjacent cells destroyed (turned to wreckage)
- Player's own cell not affected (handled by normal contact logic)

### 3. Spawn Improvements

- **Edge spawning:** In survival mode, enemies spawn within 3 rows/columns of any board edge. Gives player a buffer zone.
- **Starting HP:** Increased from 3 to 5 (the current max). More room to learn.

## Scope Boundaries

**Changed:** Survival mode — teleport system, power-ups, enemy spawn positions, starting HP, HUD, input handling
**Unchanged:** Levels mode, board size, movement mechanics, wave system, scoring, enemy types/behaviors
