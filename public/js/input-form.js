/**
 * Marschaufstellung-Generator — Input Form Module
 * Verantwortlich für DOM-Interaktion der Eingabefelder und Variantenwahl.
 * Alle Labels, Platzhalter und Fehlermeldungen auf Deutsch.
 */

// ─── Module-level references ─────────────────────────────────────────────────

let formContainer = null;
let formElement = null;
let submitButton = null;
let totalDisplay = null;
let formError = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialisiert das Eingabeformular und bindet Event-Listener.
 * @param {HTMLElement} containerEl - Das Container-Element (z.B. document oder .app)
 * @param {function} onInputChange - Callback bei Eingabeänderung (erhält aktuelle Counts)
 * @param {function} onSubmit - Callback bei Formular-Absendung
 */
export function initInputForm(containerEl, onInputChange, onSubmit) {
  formContainer = containerEl;
  formElement = containerEl.querySelector('#input-form');
  submitButton = containerEl.querySelector('#submit-btn');
  totalDisplay = containerEl.querySelector('#total-count');
  formError = containerEl.querySelector('#form-error');

  // Bind input events on all register count inputs
  const inputs = containerEl.querySelectorAll('.instr-count');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (typeof onInputChange === 'function') {
        onInputChange(readRegisterCounts(), readSchlagzeugCounts());
      }
    });
  });

  // Bind change events on variant radio buttons
  const variantRadios = containerEl.querySelectorAll('input[name="variant"]');
  variantRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (typeof onInputChange === 'function') {
        onInputChange(readRegisterCounts(), readSchlagzeugCounts());
      }
    });
  });

  // Bind form submit
  if (formElement) {
    formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      if (typeof onSubmit === 'function') {
        onSubmit();
      }
    });
  }
}

/**
 * Liest alle Register-Besetzungszahlen aus dem DOM.
 * @returns {Object} Objekt mit Registername → Anzahl
 */
export function readRegisterCounts() {
  const counts = {};

  if (!formContainer) return counts;

  // Read all register inputs (including schlagzeug as single field)
  const registerInputs = formContainer.querySelectorAll('.instr-count[data-register]');
  registerInputs.forEach((input) => {
    const register = input.dataset.register;
    const value = parseInt(input.value, 10);
    // If register already exists (shouldn't happen now), add to it
    if (register in counts) {
      counts[register] += isNaN(value) ? 0 : value;
    } else {
      counts[register] = isNaN(value) ? 0 : value;
    }
  });

  return counts;
}

/**
 * Liest die Schlagzeug-Subinstrument-Zähler aus dem DOM.
 * (Legacy — Schlagzeug is now a single input. Returns empty counts for compatibility.)
 * @returns {{ kleineTrommel: number, becken: number, grosseTrommel: number }}
 */
export function readSchlagzeugCounts() {
  const schlagzeugCounts = {
    kleineTrommel: 0,
    becken: 0,
    grosseTrommel: 0,
  };

  if (!formContainer) return schlagzeugCounts;

  const subInputs = formContainer.querySelectorAll('.instr-count[data-register="schlagzeug"][data-sub]');
  subInputs.forEach((input) => {
    const sub = input.dataset.sub;
    const value = parseInt(input.value, 10);
    if (sub in schlagzeugCounts) {
      schlagzeugCounts[sub] = isNaN(value) ? 0 : value;
    }
  });

  return schlagzeugCounts;
}

/**
 * Gibt die aktuell gewählte Variante zurück.
 * @returns {'variante1' | 'variante2'}
 */
export function getSelectedVariant() {
  if (!formContainer) return 'variante1';

  const checked = formContainer.querySelector('input[name="variant"]:checked');
  return checked ? checked.value : 'variante1';
}

/**
 * Aktualisiert die Gesamtanzeige der Spieleranzahl.
 * @param {number} total - Die anzuzeigende Gesamtanzahl
 */
export function updateTotalDisplay(total) {
  if (totalDisplay) {
    totalDisplay.textContent = String(total);
  }
}

/**
 * Zeigt einen Validierungsfehler an einem bestimmten Feld an.
 * Fügt die CSS-Klasse `.input-error` zum Input hinzu und erstellt/aktualisiert
 * ein `.field-error` Span-Element nach dem Input.
 * @param {string} fieldId - ID des betroffenen Feldes
 * @param {string} message - Fehlermeldung auf Deutsch
 */
export function showFieldError(fieldId, message) {
  if (!formContainer) return;

  const input = formContainer.querySelector(`#${fieldId}`);
  if (!input) return;

  // Add error class to input
  input.classList.add('input-error');

  // Check if a field-error span already exists after this input
  let errorSpan = input.parentElement.querySelector('.field-error');
  if (!errorSpan) {
    errorSpan = document.createElement('span');
    errorSpan.classList.add('field-error');
    errorSpan.setAttribute('role', 'alert');
    input.parentElement.appendChild(errorSpan);
  }

  errorSpan.textContent = message;
}

/**
 * Entfernt alle Validierungsfehler aus dem Formular.
 * Entfernt `.field-error` Elemente, `.input-error` Klassen und versteckt `#form-error`.
 */
export function clearErrors() {
  if (!formContainer) return;

  // Remove all .field-error spans
  const errorSpans = formContainer.querySelectorAll('.field-error');
  errorSpans.forEach((span) => span.remove());

  // Remove .input-error class from all inputs
  const errorInputs = formContainer.querySelectorAll('.input-error');
  errorInputs.forEach((input) => input.classList.remove('input-error'));

  // Hide the global form error area
  if (formError) {
    formError.textContent = '';
    formError.hidden = true;
  }
}

/**
 * Setzt den Submit-Button-Zustand (enabled/disabled + Loading-Indicator).
 * @param {boolean} disabled - Ob der Button deaktiviert sein soll
 * @param {boolean} loading - Ob ein Lade-Indikator angezeigt werden soll
 */
export function setSubmitState(disabled, loading) {
  if (!submitButton) return;

  submitButton.disabled = disabled;

  // Use the inner .btn-text span if it exists, otherwise fall back to textContent
  const btnText = submitButton.querySelector('.btn-text');
  const spinner = submitButton.querySelector('.loading-spinner');

  if (loading) {
    submitButton.classList.add('btn-loading');
    if (btnText) {
      btnText.textContent = 'Berechne…';
    } else {
      submitButton.textContent = 'Berechne…';
    }
    if (spinner) spinner.classList.remove('hidden');
  } else {
    submitButton.classList.remove('btn-loading');
    if (btnText) {
      btnText.textContent = 'Formation berechnen';
    } else {
      submitButton.textContent = 'Formation berechnen';
    }
    if (spinner) spinner.classList.add('hidden');
  }
}
