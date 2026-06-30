# Marching Formation — Placement Algorithm

## Problem

Given N musicians in registers, place them in a grid with C columns (4 or 5, toggle in UI).
Grid has `ceil(N / C)` rows. Some cells may remain empty (handled by blocked-position patterns).

## Algorithm (3 phases + empty-spot handling, deterministic)

### Phase 1: Place Percussion (center-right fill)

1. Start row = `floor(rows / 2)` (center of grid, 0-indexed)
2. Fill percussion players **right-to-left** in that row
3. If row is full, move to the **next row below** and continue right-to-left
4. If bottom overflows, wrap upward from start row - 1

### Phase 2: Place Tubas (distributed, rightmost column)

Tubas go in the **rightmost column** of specific rows:

- **1 tuba**: last row (row `rows - 1`)
- **2 tubas**: last row + 3rd row from **top** (row index 2)
- **3 tubas**: last row + row 2 + center row between row 2 and last row (rounded up)
- **4+ tubas**: mirror on left side (leftmost column)
- **7+ tubas**: warning shown

If target cell is occupied (by percussion), alternate down/up until free cell found.

### Empty-Spot Blocking (before Phase 3)

Calculate `emptySpots = (rows × columns) - totalPlayers`. Block specific inner positions so the last row stays fully filled.

**5 columns patterns:**
```
1 empty:  Row N-2: X  X  ·  X  X       (block pos 2)
2 empty:  Row N-2: X  ·  X  ·  X       (block pos 1, 3)
3 empty:  Row N-2: X  ·  ·  ·  X       (block pos 1, 2, 3)
4 empty:  Row N-3: X  ·  ·  ·  X       (block pos 1, 2, 3)
          Row N-2: X  X  ·  X  X       (block pos 2)
```

**4 columns patterns:**
```
1 empty:  Row N-2: X  X  ·  X          (block pos 2)
2 empty:  Row N-2: X  ·  ·  X          (block pos 1, 2)
3 empty:  Row N-3: X  X  ·  X          (block pos 2)
          Row N-2: X  ·  ·  X          (block pos 1, 2)
```

Rules: edges (pos 0 and last) are **never blocked**. Tuba rows are never affected.

### Phase 3: Fill Remaining Registers (zigzag)

1. Build zigzag path:
   - Row 0: right-to-left (col C-1 → 0)
   - Row 1: left-to-right (col 0 → C-1)
   - Row 2: right-to-left
   - ...alternating
2. Skip cells already occupied (percussion, tubas) or blocked
3. Fill with players in variant order:

**V1:** Posaunen → Klarinetten → Flügelhörner → Hörner → Saxophone → Trompeten → Flöten → Tenorhorn/Bariton

**V2:** Klarinetten → Flöten → Flügelhörner → Hörner → Saxophone → Tenorhorn/Bariton → Posaunen → Trompeten

(Schlagzeug and Tuben excluded — already placed)

### After Fill

Blocked markers are cleared → those cells become empty (null) in the final grid.

## Properties

- **Deterministic**: Same input always produces same output
- **Instant**: No iteration, no optimization loop
- **Simple**: ~200 lines of JavaScript, easy to debug and modify
- **No external dependencies**: Runs purely client-side
