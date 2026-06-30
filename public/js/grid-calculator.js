/**
 * Grid Calculator Module
 * Berechnet Gitterdimensionen basierend auf der Gesamtanzahl der Musiker.
 */

/** Default number of columns (players per row) */
export const DEFAULT_COLUMNS = 5;

/**
 * Berechnet die optimale Gitterdimension.
 * @param {number} totalPlayers - Gesamtanzahl Musiker
 * @param {number} [columns=DEFAULT_COLUMNS] - Anzahl Spalten (Spieler pro Reihe)
 * @returns {{ rows: number, columns: number }}
 */
export function calculateGridDimensions(totalPlayers, columns = DEFAULT_COLUMNS) {
  // Guard against invalid inputs (NaN, negative, non-numeric)
  if (typeof totalPlayers !== 'number' || !Number.isFinite(totalPlayers) || totalPlayers < 0) {
    return { rows: 0, columns: 0 };
  }

  // Truncate to integer
  const total = Math.floor(totalPlayers);

  if (total === 0) {
    return { rows: 0, columns: 0 };
  }

  // Ensure columns is valid
  const cols = Math.max(1, Math.floor(columns));
  const rows = Math.ceil(total / cols);

  return { rows, columns: cols };
}
