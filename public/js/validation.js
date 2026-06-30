/**
 * Marschaufstellung-Generator — Validation Module
 * Pure validation functions with no DOM dependency.
 * All error messages are in German as per requirement 14.4.
 */

/**
 * Validiert einen einzelnen Eingabewert für ein Register.
 * @param {string|number} value - Der eingegebene Wert
 * @returns {{ valid: boolean, error?: string, parsed?: number }}
 */
export function validateRegisterCount(value) {
  // Check for null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Bitte eine Zahl eingeben.' };
  }

  // Parse the value to a number
  const parsed = Number(value);

  // Check if parsing resulted in NaN (non-numeric input)
  if (isNaN(parsed)) {
    return { valid: false, error: 'Bitte eine gültige Zahl eingeben.' };
  }

  // Check for negative values
  if (parsed < 0) {
    return { valid: false, error: 'Negative Werte sind nicht erlaubt.' };
  }

  // Check for values exceeding maximum
  if (parsed > 99) {
    return { valid: false, error: 'Maximal 99 Musiker pro Register.' };
  }

  // Check for non-integer values (decimals)
  if (!Number.isInteger(parsed)) {
    return { valid: false, error: 'Bitte eine ganze Zahl eingeben.' };
  }

  return { valid: true, parsed };
}

/**
 * Validiert die gesamte Besetzungseingabe vor dem Absenden.
 * @param {Object} counts - Alle Register-Zähler (Registername → Wert)
 * @param {Object} schlagzeugCounts - Schlagzeug-Subinstrumente (SubInstrument → Wert)
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateFormSubmission(counts, schlagzeugCounts) {
  const errors = [];
  let total = 0;

  // Validate each register count field
  for (const [field, value] of Object.entries(counts)) {
    const result = validateRegisterCount(value);
    if (!result.valid) {
      errors.push({ field, message: result.error });
    } else {
      total += result.parsed;
    }
  }

  // Validate each Schlagzeug sub-instrument field
  for (const [field, value] of Object.entries(schlagzeugCounts)) {
    const result = validateRegisterCount(value);
    if (!result.valid) {
      errors.push({ field, message: result.error });
    } else {
      total += result.parsed;
    }
  }

  // Check if total is 0 (no musicians entered)
  if (errors.length === 0 && total === 0) {
    errors.push({ field: 'total', message: 'Mindestens ein Musiker muss eingegeben werden.' });
  }

  return { valid: errors.length === 0, errors };
}
