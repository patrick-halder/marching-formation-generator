/**
 * Marschaufstellung-Generator — State Manager
 * Central application state with immutable update functions.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Farbzuordnung für alle Register (basierend auf Prototyp).
 */
export const REGISTER_COLORS = {
  posaunen:         { color: '#e85d04', abbreviation: 'Pos',  label: 'Posaunen' },
  klarinetten:      { color: '#2563eb', abbreviation: 'Kl',   label: 'Klarinetten' },
  fluegelhoerner:   { color: '#a855f7', abbreviation: 'Flgh', label: 'Flügelhörner' },
  hoerner:          { color: '#059669', abbreviation: 'Hn',   label: 'Hörner' },
  saxophone:        { color: '#ec4899', abbreviation: 'Sax',  label: 'Saxophone' },
  trompeten:        { color: '#eab308', abbreviation: 'Tr',   label: 'Trompeten' },
  floeten:          { color: '#06b6d4', abbreviation: 'Fl',   label: 'Flöten' },
  tenorhorn_bariton:{ color: '#10b981', abbreviation: 'ThB',  label: 'Tenorhorn/Bariton' },
  tuben:            { color: '#dc2626', abbreviation: 'Tu',   label: 'Tuben' },
  schlagzeug:       { color: '#6b7280', abbreviation: 'Sz',   label: 'Schlagzeug' },
};

/**
 * Registerreihenfolge für Variante 1 (Traditionell).
 */
export const VARIANTE_1_ORDER = [
  'posaunen', 'klarinetten', 'fluegelhoerner', 'hoerner',
  'saxophone', 'schlagzeug', 'trompeten', 'floeten',
  'tenorhorn_bariton', 'tuben'
];

/**
 * Zonen-Aufteilung für Variante 2 (Funktional).
 */
export const VARIANTE_2_ZONES = {
  melodie:   ['klarinetten', 'floeten', 'fluegelhoerner'],
  schlagzeug:['schlagzeug'],
  harmonie:  ['hoerner', 'saxophone', 'posaunen', 'tenorhorn_bariton', 'tuben']
};

/**
 * Fest definierte Constraint-Prioritäten (aus Requirement 7).
 * Sortiert von höchster (1) bis niedrigster (7) Priorität.
 */
export const CONSTRAINT_PRIORITIES = [
  { priority: 1, id: 'tuben_right_edge', description: 'Tuben stehen rechts außen' },
  { priority: 2, id: 'register_contiguity', description: 'Register bleiben zusammenhängend' },
  { priority: 3, id: 'register_order', description: 'Reihenfolge der Register gemäß Variante' },
  { priority: 4, id: 'schlagzeug_centered', description: 'Schlagzeug korrekt angeordnet und mittig' },
  { priority: 5, id: 'tuben_vertical_distribution', description: 'Tuben vertikal verteilt' },
  { priority: 6, id: 'symmetry', description: 'Symmetrie wird eingehalten' },
  { priority: 7, id: 'rectangular_shape', description: 'Rechteckige Gesamtform optimiert' },
];

// ─── State Functions ─────────────────────────────────────────────────────────

/**
 * Erstellt den initialen Anwendungs-State.
 * @returns {AppState}
 */
export function createInitialState() {
  return {
    counts: {
      posaunen: 0,
      klarinetten: 0,
      fluegelhoerner: 0,
      hoerner: 0,
      saxophone: 0,
      trompeten: 0,
      floeten: 0,
      tenorhorn_bariton: 0,
      tuben: 0,
      schlagzeug: 0,
    },
    schlagzeugCounts: {
      kleineTrommel: 0,
      becken: 0,
      grosseTrommel: 0,
    },
    variant: 'variante1',
    formation: null,
    loading: false,
    error: null,
    gridDimensions: null,
  };
}

/**
 * Aktualisiert den State mit neuen Register-Zählern.
 * @param {AppState} state
 * @param {RegisterCounts} counts
 * @returns {AppState} Neuer State (immutable update)
 */
export function updateCounts(state, counts) {
  return { ...state, counts: { ...counts } };
}

/**
 * Aktualisiert den State mit einer neuen Variante.
 * @param {AppState} state
 * @param {'variante1' | 'variante2'} variant
 * @returns {AppState}
 */
export function updateVariant(state, variant) {
  return { ...state, variant };
}

/**
 * Aktualisiert den State nach erfolgreicher API-Antwort.
 * @param {AppState} state
 * @param {FormationResult} formation
 * @returns {AppState}
 */
export function setFormationResult(state, formation) {
  return { ...state, formation, loading: false, error: null };
}

/**
 * Setzt den Loading-Status.
 * @param {AppState} state
 * @param {boolean} loading
 * @returns {AppState}
 */
export function setLoading(state, loading) {
  return { ...state, loading };
}

/**
 * Setzt einen Fehlerzustand.
 * @param {AppState} state
 * @param {string|null} error
 * @returns {AppState}
 */
export function setError(state, error) {
  return { ...state, error, loading: false };
}
