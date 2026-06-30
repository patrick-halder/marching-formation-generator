/**
 * Marschaufstellung-Generator — API Client Module
 * Kommunikation mit der externen Optimierungs-API.
 */

import { calculateGridDimensions } from './grid-calculator.js';
import { solve } from './solver.js';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * API-Endpunkt für Formation-Anfragen.
 * Kann angepasst werden, sobald der tatsächliche Endpunkt bekannt ist.
 */
export const API_ENDPOINT = '/api/formation';

/**
 * Demo-Modus: Wenn true, wird eine lokale Mock-Formation generiert
 * statt die externe API aufzurufen. Auf true setzen, solange kein Backend verfügbar ist.
 */
export const DEMO_MODE = true;

// ─── Custom Error Class ──────────────────────────────────────────────────────

/**
 * Spezialisierter Fehlertyp für API-Kommunikationsfehler.
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Menschenlesbare Fehlerbeschreibung (Deutsch)
   * @param {'timeout' | 'http' | 'network' | 'parse'} type - Fehlertyp
   */
  constructor(message, type) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
  }
}

// ─── Payload Builder ─────────────────────────────────────────────────────────

/**
 * Baut den API-Request-Payload aus dem aktuellen State zusammen.
 * @param {AppState} state - Aktueller Anwendungs-State
 * @param {number} [columns=5] - Anzahl Spieler pro Reihe
 * @returns {ApiRequestPayload}
 */
export function buildRequestPayload(state, columns = 5) {
  const { counts, variant } = state;

  // Gesamtanzahl berechnen
  const totalPlayers = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Gitterdimensionen berechnen
  const gridDimensions = calculateGridDimensions(totalPlayers, columns);

  return {
    registerCounts: { ...counts },
    variant,
    gridDimensions,
  };
}

// ─── API Request ─────────────────────────────────────────────────────────────

/**
 * Generiert eine Formation lokal mittels deterministischem Solver.
 */
function generateMockFormation(payload) {
  const { registerCounts, gridDimensions, variant } = payload;

  const result = solve({
    registerCounts,
    columns: gridDimensions.columns,
    variant,
  });

  return { positions: result.positions, violations: result.violations };
}

/**
 * Sendet die Formation-Anfrage an die Optimization API.
 * Im DEMO_MODE wird eine lokale Mock-Formation generiert.
 * @param {ApiRequestPayload} payload - Vollständiger Request-Body
 * @param {object} [options] - Optionale Konfiguration
 * @param {number} [options.timeoutMs=30000] - Timeout in Millisekunden
 * @param {AbortSignal} [options.signal] - Externes AbortController Signal
 * @returns {Promise<ApiResponse>} Parsed API-Antwort
 * @throws {ApiError} Bei Timeout, HTTP-Fehler oder ungültiger Antwort
 */
export async function requestFormation(payload, options = {}) {
  // Demo mode: generate formation locally
  if (DEMO_MODE) {
    // Simulate a small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockFormation(payload);
  }
  const { timeoutMs = 30000, signal: externalSignal } = options;

  // AbortController für Timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Verknüpfung mit externem Signal (abort wenn eines der beiden feuert)
  let linkedSignal;
  if (externalSignal) {
    // Wenn externes Signal bereits abgebrochen → sofort abbrechen
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new ApiError(
        'Die Anfrage hat das Zeitlimit überschritten. Bitte erneut versuchen.',
        'timeout'
      );
    }

    const linkedController = new AbortController();
    const onExternalAbort = () => linkedController.abort();
    const onTimeoutAbort = () => linkedController.abort();

    externalSignal.addEventListener('abort', onExternalAbort);
    timeoutController.signal.addEventListener('abort', onTimeoutAbort);

    linkedSignal = linkedController.signal;
  } else {
    linkedSignal = timeoutController.signal;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: linkedSignal,
    });

    // HTTP-Fehler prüfen
    if (!response.ok) {
      throw new ApiError(
        `Serverfehler: ${response.status} ${response.statusText}`,
        'http'
      );
    }

    // JSON parsen
    let data;
    try {
      data = await response.json();
    } catch (_parseError) {
      throw new ApiError(
        'Ungültige Antwort vom Server.',
        'parse'
      );
    }

    return data;
  } catch (error) {
    // ApiError direkt weiterreichen
    if (error instanceof ApiError) {
      throw error;
    }

    // AbortError → Timeout oder externes Abbrechen
    if (error.name === 'AbortError') {
      throw new ApiError(
        'Die Anfrage hat das Zeitlimit überschritten. Bitte erneut versuchen.',
        'timeout'
      );
    }

    // Netzwerkfehler (TypeError bei fetch wenn offline/keine Verbindung)
    throw new ApiError(
      'Netzwerkfehler: Keine Verbindung zum Server.',
      'network'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
