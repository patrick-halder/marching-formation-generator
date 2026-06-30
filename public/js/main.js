/**
 * Marschaufstellung-Generator — Main Entry Point
 * Orchestrates all modules and connects the event flow.
 */

import { createInitialState, updateCounts, updateVariant, setFormationResult, setLoading, setError, CONSTRAINT_PRIORITIES } from './state.js';
import { validateFormSubmission } from './validation.js';
import { calculateGridDimensions } from './grid-calculator.js';
import { buildRequestPayload, requestFormation, ApiError } from './api-client.js';
import { initInputForm, readRegisterCounts, readSchlagzeugCounts, getSelectedVariant, updateTotalDisplay, showFieldError, clearErrors, setSubmitState } from './input-form.js';
import { renderFormation, renderEmptyState, renderLegend, setFormationChangeCallback } from './grid-renderer.js';

// ─── PNG Export ──────────────────────────────────────────────────────────────

async function exportAsPng(element) {
  try {
    const canvas = await window.html2canvas(element, {
      scale: 2,
      backgroundColor: '#1a1a2e',
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Blob creation failed'));
      }, 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marschaufstellung.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('PNG-Export fehlgeschlagen. Bitte erneut versuchen.');
  }
}

// ─── Application Bootstrap ──────────────────────────────────────────────────

export function initApp() {
  const appContainer = document.querySelector('.app');
  const formationDisplay = document.getElementById('formation-display');
  const legendContainer = document.getElementById('legend');
  const formError = document.getElementById('form-error');
  const columnsInput = document.getElementById('count-columns');
  const exportPngBtn = document.getElementById('export-png');

  let state = createInitialState();
  let previousVariant = state.variant;

  // Initialize input form
  initInputForm(appContainer, handleInputChange, handleSubmit);

  // Toggle buttons for "Spieler pro Reihe"
  const toggleBtns = appContainer.querySelectorAll('.toggle-btn[data-columns]');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      columnsInput.value = btn.dataset.columns;
      // Re-calculate if formation exists
      if (state.formation !== null) {
        handleSubmit();
      }
    });
  });

  // Show initial empty state
  renderEmptyState(formationDisplay);

  // Drag-and-drop callback
  setFormationChangeCallback((updatedFormation) => {
    state = setFormationResult(state, updatedFormation);
  });

  // PNG export button
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => {
      const target = formationDisplay.closest('.stage-wrap') || formationDisplay;
      exportAsPng(target);
    });
  }

  // Auto-calculate formation on load with default values
  handleSubmit();

  // ─── Event Handlers ──────────────────────────────────────────────────────

  function handleInputChange(counts, schlagzeugCounts) {
    state = updateCounts(state, counts);
    state = { ...state, schlagzeugCounts: { ...schlagzeugCounts } };

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    updateTotalDisplay(total);
    clearErrors();

    const currentVariant = getSelectedVariant();
    if (currentVariant !== previousVariant) {
      state = updateVariant(state, currentVariant);
      previousVariant = currentVariant;
      if (state.formation !== null) {
        handleSubmit();
      }
    }
  }

  async function handleSubmit() {
    const counts = readRegisterCounts();
    const schlagzeugCounts = readSchlagzeugCounts();
    const variant = getSelectedVariant();

    // Update total display
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    updateTotalDisplay(total);

    state = updateCounts(state, counts);
    state = { ...state, schlagzeugCounts: { ...schlagzeugCounts } };
    state = updateVariant(state, variant);
    previousVariant = variant;

    const validation = validateFormSubmission(counts, schlagzeugCounts);
    if (!validation.valid) {
      for (const err of validation.errors) {
        if (err.field === 'total') {
          if (formError) {
            formError.textContent = err.message;
            formError.hidden = false;
          }
        } else {
          showFieldError(mapFieldToInputId(err.field), err.message);
        }
      }
      return;
    }

    setSubmitState(true, true);
    state = setLoading(state, true);

    try {
      const columns = parseInt(columnsInput ? columnsInput.value : '5', 10) || 5;
      const payload = buildRequestPayload(state, columns);
      const response = await requestFormation(payload);
      const formation = parseApiResponse(response, state, columns);

      state = setFormationResult(state, formation);
      renderFormation(formationDisplay, formation);

      const activeRegisters = extractActiveRegisters(formation);
      renderLegend(legendContainer, activeRegisters);

      if (exportPngBtn) exportPngBtn.disabled = false;

    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
      state = setError(state, msg);
      if (formError) {
        formError.textContent = msg;
        formError.hidden = false;
      }
      formationDisplay.innerHTML = '';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'empty-state';
      errorDiv.innerHTML = '<div class="empty-state-icon">⚠️</div><p class="empty-state-message" style="color: var(--color-error);">' + msg + '</p>';
      formationDisplay.appendChild(errorDiv);
    } finally {
      setSubmitState(false, false);
      state = setLoading(state, false);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function parseApiResponse(response, currentState, columns) {
    const { positions = [], violations = [] } = response;
    const totalPlayers = Object.values(currentState.counts).reduce((sum, n) => sum + n, 0);
    const dimensions = calculateGridDimensions(totalPlayers, columns);

    const grid = [];
    for (let row = 0; row < dimensions.rows; row++) {
      const rowArr = [];
      for (let col = 0; col < dimensions.columns; col++) {
        rowArr.push({ row, column: col, register: null, subInstrument: null });
      }
      grid.push(rowArr);
    }

    for (const pos of positions) {
      if (pos.row >= 0 && pos.row < dimensions.rows && pos.column >= 0 && pos.column < dimensions.columns) {
        grid[pos.row][pos.column] = {
          row: pos.row,
          column: pos.column,
          register: pos.register,
          subInstrument: pos.subInstrument || null,
        };
      }
    }

    return { dimensions, grid, violatedConstraints: violations };
  }

  function extractActiveRegisters(formation) {
    const registers = new Set();
    for (const row of formation.grid) {
      for (const cell of row) {
        if (cell && cell.register) registers.add(cell.register);
      }
    }
    return Array.from(registers);
  }

  function mapFieldToInputId(field) {
    const map = {
      posaunen: 'count-posaunen',
      klarinetten: 'count-klarinetten',
      fluegelhoerner: 'count-fluegelhoerner',
      hoerner: 'count-hoerner',
      saxophone: 'count-saxophone',
      trompeten: 'count-trompeten',
      floeten: 'count-floeten',
      tenorhorn_bariton: 'count-tenorhorn-bariton',
      tuben: 'count-tuben',
      schlagzeug: 'count-kleine-trommel',
      kleineTrommel: 'count-kleine-trommel',
      becken: 'count-becken',
      grosseTrommel: 'count-grosse-trommel',
    };
    return map[field] || field;
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initApp);
