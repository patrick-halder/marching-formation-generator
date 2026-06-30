/**
 * Marschaufstellung-Generator — Grid Renderer Module
 * Renders the formation as a color-coded grid in the DOM.
 * Supports drag-and-drop repositioning of players.
 */

import { REGISTER_COLORS } from './state.js';

// ─── Drag and Drop State ─────────────────────────────────────────────────────

let draggedCell = null;
let draggedSourceRow = null;
let draggedSourceCol = null;
let currentFormation = null;
let currentContainerEl = null;
let onFormationChange = null;

// ─── Helper: CSS class name for a register ───────────────────────────────────

function registerToCssClass(registerName) {
  return registerName.replace(/_/g, '-');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Gibt die Farbzuordnung für ein Register zurück.
 */
export function getRegisterVisuals(registerName) {
  const entry = REGISTER_COLORS[registerName];
  if (!entry) return null;
  return { color: entry.color, abbreviation: entry.abbreviation, label: entry.label };
}

/**
 * Rendert den Leer-Zustand.
 */
export function renderEmptyState(containerEl) {
  containerEl.innerHTML = '';
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-state-icon';
  icon.textContent = '🎵';
  icon.setAttribute('aria-hidden', 'true');

  const message = document.createElement('p');
  message.className = 'empty-state-message';
  message.textContent = 'Bitte Besetzung eingeben.';

  emptyDiv.appendChild(icon);
  emptyDiv.appendChild(message);
  containerEl.appendChild(emptyDiv);
}

/**
 * Rendert die Legende.
 */
export function renderLegend(containerEl, activeRegisters) {
  containerEl.innerHTML = '';

  for (const registerName of activeRegisters) {
    const visuals = getRegisterVisuals(registerName);
    if (!visuals) continue;

    const item = document.createElement('div');
    item.className = 'legend-item';

    const colorDot = document.createElement('span');
    colorDot.className = 'legend-color';
    colorDot.style.backgroundColor = visuals.color;
    colorDot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = visuals.label;

    item.appendChild(colorDot);
    item.appendChild(label);
    containerEl.appendChild(item);
  }
}

/**
 * Sets a callback for when the formation is changed via drag-and-drop.
 * @param {function} callback - Called with updated formation
 */
export function setFormationChangeCallback(callback) {
  onFormationChange = callback;
}

/**
 * Rendert die gesamte Formation in den Container.
 * Does NOT render a legend inside (legend is rendered separately via renderLegend).
 */
export function renderFormation(containerEl, formation, options = {}) {
  containerEl.innerHTML = '';
  currentContainerEl = containerEl;
  currentFormation = formation;

  const { dimensions, grid } = formation;

  if (!grid || grid.length === 0) {
    renderEmptyState(containerEl);
    return;
  }

  // Outer formation container
  const formationContainer = document.createElement('div');
  formationContainer.className = 'formation-container';

  // Dirigent symbol above row 0
  const dirigent = document.createElement('div');
  dirigent.className = 'dirigent-symbol';
  dirigent.setAttribute('aria-label', 'Dirigent');
  dirigent.textContent = 'Dirigent';
  formationContainer.appendChild(dirigent);

  // Formation grid
  const gridEl = document.createElement('div');
  gridEl.className = 'formation-grid';
  gridEl.style.setProperty('--grid-columns', String(dimensions.columns));

  if (options.cellSize) {
    gridEl.style.setProperty('--cell-size', `${options.cellSize}px`);
  }

  // Iterate grid rows
  for (let row = 0; row < grid.length; row++) {
    const rowData = grid[row];
    for (let col = 0; col < dimensions.columns; col++) {
      const cell = rowData && rowData[col] ? rowData[col] : null;
      const cellEl = document.createElement('div');
      cellEl.className = 'grid-cell';
      cellEl.dataset.row = row;
      cellEl.dataset.col = col;

      if (cell && cell.register) {
        // Occupied cell
        const registerKey = cell.register;
        const cssClass = registerToCssClass(registerKey);
        cellEl.classList.add(`grid-cell--${cssClass}`);

        const visuals = getRegisterVisuals(registerKey);
        if (visuals) {
          cellEl.textContent = visuals.abbreviation;

          // Tooltip — use title attribute to avoid clipping issues
          cellEl.title = visuals.label;
        }

        cellEl.setAttribute('aria-label', visuals ? visuals.label : registerKey);
        cellEl.setAttribute('tabindex', '0');

        // Drag-and-drop: make occupied cells draggable
        cellEl.draggable = true;
        cellEl.addEventListener('dragstart', handleDragStart);
        cellEl.addEventListener('dragend', handleDragEnd);
      } else {
        // Empty position
        cellEl.classList.add('grid-cell--empty');
        cellEl.setAttribute('aria-label', 'Leer');
      }

      // All cells can be drop targets
      cellEl.addEventListener('dragover', handleDragOver);
      cellEl.addEventListener('dragenter', handleDragEnter);
      cellEl.addEventListener('dragleave', handleDragLeave);
      cellEl.addEventListener('drop', handleDrop);

      gridEl.appendChild(cellEl);
    }
  }

  formationContainer.appendChild(gridEl);
  containerEl.appendChild(formationContainer);
}

// ─── Drag and Drop Handlers ──────────────────────────────────────────────────

function handleDragStart(e) {
  draggedCell = e.target;
  draggedSourceRow = parseInt(e.target.dataset.row, 10);
  draggedSourceCol = parseInt(e.target.dataset.col, 10);
  e.target.classList.add('grid-cell--dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', `${draggedSourceRow},${draggedSourceCol}`);
}

function handleDragEnd(e) {
  e.target.classList.remove('grid-cell--dragging');
  // Remove all drag-over highlights
  if (currentContainerEl) {
    currentContainerEl.querySelectorAll('.grid-cell--drag-over').forEach((el) => {
      el.classList.remove('grid-cell--drag-over');
    });
  }
  draggedCell = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  const target = e.target.closest('.grid-cell');
  if (target && target !== draggedCell) {
    target.classList.add('grid-cell--drag-over');
  }
}

function handleDragLeave(e) {
  const target = e.target.closest('.grid-cell');
  if (target) {
    target.classList.remove('grid-cell--drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const target = e.target.closest('.grid-cell');
  if (!target || !currentFormation || draggedSourceRow === null) return;

  target.classList.remove('grid-cell--drag-over');

  const targetRow = parseInt(target.dataset.row, 10);
  const targetCol = parseInt(target.dataset.col, 10);

  // Can only drop onto empty cells or swap with another cell
  const sourceCell = currentFormation.grid[draggedSourceRow][draggedSourceCol];
  const targetCellData = currentFormation.grid[targetRow][targetCol];

  // Swap the two cells in the formation data
  currentFormation.grid[targetRow][targetCol] = {
    ...sourceCell,
    row: targetRow,
    column: targetCol,
  };
  currentFormation.grid[draggedSourceRow][draggedSourceCol] = {
    ...targetCellData,
    row: draggedSourceRow,
    column: draggedSourceCol,
  };

  // Re-render the formation
  renderFormation(currentContainerEl, currentFormation);

  // Notify if callback is set
  if (typeof onFormationChange === 'function') {
    onFormationChange(currentFormation);
  }
}
