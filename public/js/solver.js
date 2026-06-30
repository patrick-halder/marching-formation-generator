/**
 * Marschaufstellung-Generator — Deterministic Placement Solver
 *
 * Algorithm:
 *   Phase 1: Place percussion (center-right fill)
 *   Phase 2: Place tubas (distributed, rightmost column)
 *   Phase 3: Fill remaining registers in zigzag order per variant
 */

// ─── Register Orders ─────────────────────────────────────────────────────────

/** V1 fill order (excluding Schlagzeug and Tuben — placed separately) */
const V1_FILL_ORDER = [
  'posaunen', 'klarinetten', 'fluegelhoerner', 'hoerner',
  'saxophone', 'trompeten', 'floeten', 'tenorhorn_bariton'
];

/** V2 fill order (excluding Schlagzeug and Tuben — placed separately) */
const V2_FILL_ORDER = [
  'klarinetten', 'floeten', 'fluegelhoerner', 'hoerner',
  'saxophone', 'tenorhorn_bariton', 'posaunen', 'trompeten'
];

// ─── Main Solver Entry Point ─────────────────────────────────────────────────

/**
 * Solves the marching formation placement problem.
 * @param {object} input
 * @param {object} input.registerCounts - register name → player count
 * @param {number} input.columns - columns per row
 * @param {'variante1'|'variante2'} input.variant
 * @param {object} input.enabledConstraints - constraint ID → boolean
 * @returns {{ positions: Array, violations: Array, score: number }}
 */
export function solve(input) {
  const { registerCounts, columns, variant } = input;

  const totalPlayers = Object.values(registerCounts).reduce((sum, n) => sum + n, 0);
  if (totalPlayers === 0) {
    return { positions: [], violations: [], score: 0 };
  }

  const cols = Math.max(1, columns);
  const rows = Math.ceil(totalPlayers / cols);
  const dims = { rows, columns: cols };

  // Create empty grid
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(null));
  }

  const violations = [];

  // Phase 1: Place percussion
  const percussionCount = registerCounts.schlagzeug || 0;
  if (percussionCount > 0) {
    placePercussion(grid, dims, percussionCount);
  }

  // Phase 2: Place tubas
  const tubaCount = registerCounts.tuben || 0;
  if (tubaCount > 0) {
    const tubaWarning = placeTubas(grid, dims, tubaCount);
    if (tubaWarning) violations.push(tubaWarning);
  }

  // Phase 3: Fill remaining registers in zigzag
  const fillOrder = variant === 'variante1' ? V1_FILL_ORDER : V2_FILL_ORDER;

  // Mark blocked positions (empty spot patterns) BEFORE zigzag fill
  const totalPlayers2 = Object.values(registerCounts).reduce((sum, n) => sum + n, 0);
  markBlockedPositions(grid, dims, totalPlayers2);

  // Zigzag fill (skips BLOCKED and already-occupied cells)
  fillZigzag(grid, dims, registerCounts, fillOrder);

  // Clear any remaining blocked markers back to null
  clearBlockedMarkers(grid, dims);

  // Extract positions
  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) {
        positions.push({ row: r, column: c, register: grid[r][c] });
      }
    }
  }

  return { positions, violations, score: 0 };
}

// ─── Phase 1: Place Percussion ───────────────────────────────────────────────

/**
 * Places percussion players starting at center+1 row, filling right-to-left.
 * If row is full, moves to the next row below.
 */
function placePercussion(grid, dims, count) {
  const { rows, columns } = dims;
  // Start row: center + 1 (0-indexed: floor(rows/2))
  let startRow = Math.floor(rows / 2);
  let placed = 0;
  let currentRow = startRow;

  while (placed < count && currentRow < rows) {
    // Fill right-to-left in current row
    for (let c = columns - 1; c >= 0 && placed < count; c--) {
      if (grid[currentRow][c] === null) {
        grid[currentRow][c] = 'schlagzeug';
        placed++;
      }
    }
    currentRow++;
  }

  // If we still have unplaced percussion (overflow), fill upward from startRow
  currentRow = startRow - 1;
  while (placed < count && currentRow >= 0) {
    for (let c = columns - 1; c >= 0 && placed < count; c--) {
      if (grid[currentRow][c] === null) {
        grid[currentRow][c] = 'schlagzeug';
        placed++;
      }
    }
    currentRow--;
  }
}

// ─── Phase 2: Place Tubas ────────────────────────────────────────────────────

/**
 * Places tubas in the rightmost column of distributed rows.
 * Returns a warning string if >6 tubas.
 */
function placeTubas(grid, dims, count) {
  const { rows, columns } = dims;

  if (count > 6) {
    // Still place them but warn
  }

  // Calculate target rows for tubas on the RIGHT side
  const rightTubaRows = calculateTubaRows(rows, Math.min(count, 3));

  // Place right-side tubas (up to 3)
  let placed = 0;
  for (let i = 0; i < Math.min(count, 3); i++) {
    const targetRow = rightTubaRows[i];
    const placedRow = findFreeRowForTuba(grid, dims, targetRow, columns - 1);
    if (placedRow !== null) {
      grid[placedRow][columns - 1] = 'tuben';
      placed++;
    }
  }

  // Place left-side tubas (4th, 5th, 6th) in leftmost column
  if (count > 3) {
    const leftTubaRows = calculateTubaRows(rows, Math.min(count - 3, 3));
    for (let i = 0; i < Math.min(count - 3, 3); i++) {
      const targetRow = leftTubaRows[i];
      const placedRow = findFreeRowForTuba(grid, dims, targetRow, 0);
      if (placedRow !== null) {
        grid[placedRow][0] = 'tuben';
        placed++;
      }
    }
  }

  // Handle >6 tubas: place anywhere remaining
  if (count > 6) {
    for (let i = placed; i < count; i++) {
      // Find any free rightmost cell
      for (let r = 0; r < rows; r++) {
        if (grid[r][columns - 1] === null) {
          grid[r][columns - 1] = 'tuben';
          placed++;
          break;
        }
      }
    }
    return 'Warnung: Mehr als 6 Tuben — Platzierung möglicherweise suboptimal';
  }

  return null;
}

/**
 * Calculates target rows for N tubas (1–3) within the grid.
 * - 1 tuba: last row
 * - 2 tubas: last row + 3rd row from TOP (row index 2)
 * - 3 tubas: last row + 3rd from top + center row between row 2 and last row
 */
function calculateTubaRows(totalRows, tubaCount) {
  const lastRow = totalRows - 1;

  if (tubaCount === 1) {
    return [lastRow];
  }

  if (tubaCount === 2) {
    // 3rd row from top = row index 2
    const secondRow = Math.min(2, lastRow);
    return [lastRow, secondRow];
  }

  if (tubaCount >= 3) {
    // 3rd row from top
    const secondRow = Math.min(2, lastRow);
    // Center between row 2 and last row, rounded up
    let centerRow = Math.ceil((secondRow + lastRow) / 2);
    // Ensure it's different from the others
    if (centerRow === lastRow) centerRow = lastRow - 1;
    if (centerRow === secondRow) centerRow = secondRow + 1;
    return [lastRow, secondRow, centerRow];
  }

  return [];
}

/**
 * Finds a free row for tuba placement at the given column.
 * Starts at targetRow, then alternates down/up until a free cell is found.
 */
function findFreeRowForTuba(grid, dims, targetRow, column) {
  const { rows } = dims;

  // Try target row first
  if (targetRow >= 0 && targetRow < rows && grid[targetRow][column] === null) {
    return targetRow;
  }

  // Alternate: down 1, up 1, down 2, up 2, ...
  for (let offset = 1; offset < rows; offset++) {
    const downRow = targetRow + offset;
    if (downRow >= 0 && downRow < rows && grid[downRow][column] === null) {
      return downRow;
    }
    const upRow = targetRow - offset;
    if (upRow >= 0 && upRow < rows && grid[upRow][column] === null) {
      return upRow;
    }
  }

  return null; // Should not happen unless grid is completely full
}

// ─── Phase 3: Fill Remaining Registers (Zigzag) ─────────────────────────────

/**
 * Fills remaining register players in a zigzag path through the grid.
 * Row 0: right-to-left, Row 1: left-to-right, Row 2: right-to-left, ...
 * Skips cells already occupied (percussion, tubas).
 */
function fillZigzag(grid, dims, registerCounts, fillOrder) {
  const { rows, columns } = dims;

  // Build zigzag path of (row, col) coordinates
  const path = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) {
      // Even rows: right-to-left
      for (let c = columns - 1; c >= 0; c--) {
        path.push([r, c]);
      }
    } else {
      // Odd rows: left-to-right
      for (let c = 0; c < columns; c++) {
        path.push([r, c]);
      }
    }
  }

  // Build ordered list of players to place (excluding schlagzeug and tuben)
  const players = [];
  for (const register of fillOrder) {
    const count = registerCounts[register] || 0;
    for (let i = 0; i < count; i++) {
      players.push(register);
    }
  }

  // Fill along the zigzag path, skipping occupied cells
  let playerIdx = 0;
  for (const [r, c] of path) {
    if (playerIdx >= players.length) break;
    if (grid[r][c] !== null) continue; // Skip occupied cells
    grid[r][c] = players[playerIdx];
    playerIdx++;
  }
}

// ─── Phase 4: Block Empty Spots (Hardcoded Patterns) ─────────────────────────

/**
 * Marks specific grid positions as blocked BEFORE zigzag fill.
 * This ensures the last row is fully filled by pushing empties inward
 * in the 2nd/3rd-to-last rows.
 *
 * Called BEFORE Phase 3 (zigzag fill). Blocked cells are marked with
 * a special sentinel value '__blocked__' which the zigzag fill skips.
 * After zigzag fill, blocked cells are set back to null.
 */

/** Sentinel value for blocked positions */
const BLOCKED = '__blocked__';

/**
 * Calculates empty spots and marks blocked positions in the grid.
 * Must be called AFTER percussion and tuba placement, BEFORE zigzag fill.
 */
function markBlockedPositions(grid, dims, totalPlayers) {
  const { rows, columns } = dims;
  const totalSlots = rows * columns;

  // Count already-placed players (percussion + tubas)
  let alreadyPlaced = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (grid[r][c] !== null) alreadyPlaced++;
    }
  }

  const emptySpots = totalSlots - totalPlayers;
  if (emptySpots <= 0) return; // No empties, grid is exactly full

  // Get the blocked positions pattern based on columns and empty count
  const blockedPositions = getBlockedPattern(columns, emptySpots, rows);

  // Mark them in the grid (only if cell is currently empty)
  for (const [r, c] of blockedPositions) {
    if (r >= 0 && r < rows && c >= 0 && c < columns && grid[r][c] === null) {
      grid[r][c] = BLOCKED;
    }
  }
}

/**
 * After zigzag fill, convert any remaining BLOCKED cells back to null.
 */
function clearBlockedMarkers(grid, dims) {
  const { rows, columns } = dims;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (grid[r][c] === BLOCKED) {
        grid[r][c] = null;
      }
    }
  }
}

/**
 * Returns array of [row, col] positions to block based on hardcoded patterns.
 * N-1 = last row, N-2 = 2nd to last, N-3 = 3rd to last.
 */
function getBlockedPattern(columns, emptyCount, totalRows) {
  // Clamp to max we handle (avoid infinite blocking)
  const empties = Math.min(emptyCount, columns === 5 ? 4 : 3);
  const N = totalRows; // shorthand

  if (columns === 5) {
    switch (empties) {
      case 1:
        // Row N-2: block center (pos 2)
        return [[N - 2, 2]];
      case 2:
        // Row N-2: block pos 1, 3
        return [[N - 2, 1], [N - 2, 3]];
      case 3:
        // Row N-2: block pos 1, 2, 3 (only edges remain)
        return [[N - 2, 1], [N - 2, 2], [N - 2, 3]];
      case 4:
        // Row N-3: block pos 1, 2, 3 (only edges); Row N-2: block pos 2 (center)
        return [[N - 3, 1], [N - 3, 2], [N - 3, 3], [N - 2, 2]];
      default:
        return [];
    }
  }

  if (columns === 4) {
    switch (empties) {
      case 1:
        // Row N-2: block pos 2
        return [[N - 2, 2]];
      case 2:
        // Row N-2: block pos 1, 2
        return [[N - 2, 1], [N - 2, 2]];
      case 3:
        // Row N-3: block pos 2; Row N-2: block pos 1, 2
        return [[N - 3, 2], [N - 2, 1], [N - 2, 2]];
      default:
        return [];
    }
  }

  // Fallback for other column counts: just block center positions in 2nd-to-last row
  const positions = [];
  const midStart = Math.floor(columns / 2) - Math.floor(empties / 2);
  for (let i = 0; i < empties; i++) {
    const col = midStart + i;
    if (col > 0 && col < columns - 1) { // Never block edges
      positions.push([N - 2, col]);
    }
  }
  return positions;
}
