/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initInputForm,
  readRegisterCounts,
  readSchlagzeugCounts,
  getSelectedVariant,
  updateTotalDisplay,
  showFieldError,
  clearErrors,
  setSubmitState,
} from '../public/js/input-form.js';

/**
 * Creates a minimal DOM structure matching the HTML in index.html
 * for testing input-form.js functions.
 */
function createFormDOM() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="variant-pills" role="radiogroup" aria-label="Aufstellungsvariante">
      <div class="variant-pill">
        <input type="radio" name="variant" id="v1" value="variante1" checked />
        <label for="v1">Variante 1 — Traditionell</label>
      </div>
      <div class="variant-pill">
        <input type="radio" name="variant" id="v2" value="variante2" />
        <label for="v2">Variante 2 — Melodie / Schlagzeug / Harmonie</label>
      </div>
    </div>
    <form id="input-form" novalidate>
      <div class="instr-list" id="instr-list">
        <div class="instr-row">
          <label class="instr-name" for="count-posaunen">Posaunen</label>
          <input class="instr-count" id="count-posaunen" type="number" min="0" max="99" value="0" data-register="posaunen" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-klarinetten">Klarinetten</label>
          <input class="instr-count" id="count-klarinetten" type="number" min="0" max="99" value="0" data-register="klarinetten" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-fluegelhoerner">Flügelhörner</label>
          <input class="instr-count" id="count-fluegelhoerner" type="number" min="0" max="99" value="0" data-register="fluegelhoerner" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-hoerner">Hörner</label>
          <input class="instr-count" id="count-hoerner" type="number" min="0" max="99" value="0" data-register="hoerner" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-saxophone">Saxophone</label>
          <input class="instr-count" id="count-saxophone" type="number" min="0" max="99" value="0" data-register="saxophone" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-trompeten">Trompeten</label>
          <input class="instr-count" id="count-trompeten" type="number" min="0" max="99" value="0" data-register="trompeten" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-floeten">Flöten</label>
          <input class="instr-count" id="count-floeten" type="number" min="0" max="99" value="0" data-register="floeten" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-tenorhorn-bariton">Tenorhorn/Bariton</label>
          <input class="instr-count" id="count-tenorhorn-bariton" type="number" min="0" max="99" value="0" data-register="tenorhorn_bariton" />
        </div>
        <div class="instr-row">
          <label class="instr-name" for="count-tuben">Tuben</label>
          <input class="instr-count" id="count-tuben" type="number" min="0" max="99" value="0" data-register="tuben" />
        </div>
        <!-- Schlagzeug composite group -->
        <div class="instr-group" id="schlagzeug-group">
          <div class="instr-row instr-row--group-header">
            <span class="instr-name instr-name--group">Schlagzeug</span>
          </div>
          <div class="instr-sub-list">
            <div class="instr-row instr-row--sub">
              <label class="instr-name instr-name--sub" for="count-kleine-trommel">Kleine Trommel</label>
              <input class="instr-count" id="count-kleine-trommel" type="number" min="0" max="99" value="0" data-register="schlagzeug" data-sub="kleineTrommel" />
            </div>
            <div class="instr-row instr-row--sub">
              <label class="instr-name instr-name--sub" for="count-becken">Becken</label>
              <input class="instr-count" id="count-becken" type="number" min="0" max="99" value="0" data-register="schlagzeug" data-sub="becken" />
            </div>
            <div class="instr-row instr-row--sub">
              <label class="instr-name instr-name--sub" for="count-grosse-trommel">Große Trommel</label>
              <input class="instr-count" id="count-grosse-trommel" type="number" min="0" max="99" value="0" data-register="schlagzeug" data-sub="grosseTrommel" />
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="stat-line">Gesamt: <strong id="total-count">0</strong> Musiker</div>
        <div id="form-error" class="form-error" role="alert" aria-live="polite" hidden></div>
        <button type="submit" id="submit-btn" class="submit-btn">Formation berechnen</button>
      </div>
    </form>
  `;
  return container;
}

describe('input-form.js — initInputForm', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('calls onInputChange when a register input changes', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    initInputForm(container, onInputChange, onSubmit);

    const input = container.querySelector('#count-posaunen');
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onInputChange).toHaveBeenCalledTimes(1);
  });

  it('calls onInputChange when a variant radio changes', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    initInputForm(container, onInputChange, onSubmit);

    const radio = container.querySelector('#v2');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onInputChange).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit and prevents default on form submission', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    initInputForm(container, onInputChange, onSubmit);

    const form = container.querySelector('#input-form');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('input-form.js — readRegisterCounts', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('returns all registers with initial value of 0', () => {
    const counts = readRegisterCounts();
    expect(counts.posaunen).toBe(0);
    expect(counts.klarinetten).toBe(0);
    expect(counts.fluegelhoerner).toBe(0);
    expect(counts.hoerner).toBe(0);
    expect(counts.saxophone).toBe(0);
    expect(counts.trompeten).toBe(0);
    expect(counts.floeten).toBe(0);
    expect(counts.tenorhorn_bariton).toBe(0);
    expect(counts.tuben).toBe(0);
    expect(counts.schlagzeug).toBe(0);
  });

  it('reads updated register values', () => {
    container.querySelector('#count-posaunen').value = '7';
    container.querySelector('#count-tuben').value = '3';

    const counts = readRegisterCounts();
    expect(counts.posaunen).toBe(7);
    expect(counts.tuben).toBe(3);
  });

  it('sums schlagzeug sub-instruments for schlagzeug total', () => {
    container.querySelector('#count-kleine-trommel').value = '2';
    container.querySelector('#count-becken').value = '1';
    container.querySelector('#count-grosse-trommel').value = '1';

    const counts = readRegisterCounts();
    expect(counts.schlagzeug).toBe(4);
  });

  it('handles non-numeric values gracefully (returns 0)', () => {
    container.querySelector('#count-posaunen').value = 'abc';

    const counts = readRegisterCounts();
    expect(counts.posaunen).toBe(0);
  });
});

describe('input-form.js — readSchlagzeugCounts', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('returns all sub-instruments with initial value of 0', () => {
    const counts = readSchlagzeugCounts();
    expect(counts.kleineTrommel).toBe(0);
    expect(counts.becken).toBe(0);
    expect(counts.grosseTrommel).toBe(0);
  });

  it('reads updated sub-instrument values', () => {
    container.querySelector('#count-kleine-trommel').value = '3';
    container.querySelector('#count-becken').value = '2';
    container.querySelector('#count-grosse-trommel').value = '1';

    const counts = readSchlagzeugCounts();
    expect(counts.kleineTrommel).toBe(3);
    expect(counts.becken).toBe(2);
    expect(counts.grosseTrommel).toBe(1);
  });
});

describe('input-form.js — getSelectedVariant', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('returns variante1 by default', () => {
    expect(getSelectedVariant()).toBe('variante1');
  });

  it('returns variante2 when second radio is checked', () => {
    const radio = container.querySelector('#v2');
    radio.checked = true;

    expect(getSelectedVariant()).toBe('variante2');
  });
});

describe('input-form.js — updateTotalDisplay', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('updates the total display text content', () => {
    updateTotalDisplay(42);
    expect(container.querySelector('#total-count').textContent).toBe('42');
  });

  it('shows 0 for zero total', () => {
    updateTotalDisplay(0);
    expect(container.querySelector('#total-count').textContent).toBe('0');
  });
});

describe('input-form.js — showFieldError / clearErrors', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('adds input-error class and creates field-error span', () => {
    showFieldError('count-posaunen', 'Bitte eine gültige Zahl eingeben.');

    const input = container.querySelector('#count-posaunen');
    expect(input.classList.contains('input-error')).toBe(true);

    const errorSpan = input.parentElement.querySelector('.field-error');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan.textContent).toBe('Bitte eine gültige Zahl eingeben.');
  });

  it('updates existing error span instead of creating duplicate', () => {
    showFieldError('count-posaunen', 'Fehler 1');
    showFieldError('count-posaunen', 'Fehler 2');

    const spans = container.querySelectorAll('#count-posaunen ~ .field-error, #count-posaunen + .field-error');
    const parent = container.querySelector('#count-posaunen').parentElement;
    const allErrors = parent.querySelectorAll('.field-error');
    expect(allErrors).toHaveLength(1);
    expect(allErrors[0].textContent).toBe('Fehler 2');
  });

  it('clearErrors removes all error states', () => {
    showFieldError('count-posaunen', 'Fehler');
    showFieldError('count-tuben', 'Fehler');

    clearErrors();

    expect(container.querySelectorAll('.field-error')).toHaveLength(0);
    expect(container.querySelectorAll('.input-error')).toHaveLength(0);
    expect(container.querySelector('#form-error').hidden).toBe(true);
  });
});

describe('input-form.js — setSubmitState', () => {
  let container;

  beforeEach(() => {
    container = createFormDOM();
    document.body.innerHTML = '';
    document.body.appendChild(container);
    initInputForm(container, () => {}, () => {});
  });

  it('disables the submit button', () => {
    setSubmitState(true, false);

    const btn = container.querySelector('#submit-btn');
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('btn-loading')).toBe(false);
    expect(btn.textContent).toBe('Formation berechnen');
  });

  it('shows loading state with German text', () => {
    setSubmitState(true, true);

    const btn = container.querySelector('#submit-btn');
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('btn-loading')).toBe(true);
    expect(btn.textContent).toBe('Berechne…');
  });

  it('restores normal state', () => {
    setSubmitState(true, true);
    setSubmitState(false, false);

    const btn = container.querySelector('#submit-btn');
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('btn-loading')).toBe(false);
    expect(btn.textContent).toBe('Formation berechnen');
  });
});
