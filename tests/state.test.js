import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  updateCounts,
  updateVariant,
  setFormationResult,
  setLoading,
  setError,
  CONSTRAINT_PRIORITIES,
  REGISTER_COLORS,
  VARIANTE_1_ORDER,
  VARIANTE_2_ZONES,
} from '../public/js/state.js';

describe('state.js — Constants', () => {
  it('REGISTER_COLORS has 10 entries with color, abbreviation, label', () => {
    const keys = Object.keys(REGISTER_COLORS);
    expect(keys).toHaveLength(10);
    for (const key of keys) {
      expect(REGISTER_COLORS[key]).toHaveProperty('color');
      expect(REGISTER_COLORS[key]).toHaveProperty('abbreviation');
      expect(REGISTER_COLORS[key]).toHaveProperty('label');
      expect(REGISTER_COLORS[key].abbreviation.length).toBeLessThanOrEqual(4);
    }
  });

  it('VARIANTE_1_ORDER has 10 registers', () => {
    expect(VARIANTE_1_ORDER).toHaveLength(10);
    // All entries should be keys in REGISTER_COLORS
    for (const reg of VARIANTE_1_ORDER) {
      expect(REGISTER_COLORS).toHaveProperty(reg);
    }
  });

  it('VARIANTE_2_ZONES covers all non-Trompeten registers correctly', () => {
    const allZoneRegisters = [
      ...VARIANTE_2_ZONES.melodie,
      ...VARIANTE_2_ZONES.schlagzeug,
      ...VARIANTE_2_ZONES.harmonie,
    ];
    expect(allZoneRegisters).toHaveLength(9);
    for (const reg of allZoneRegisters) {
      expect(REGISTER_COLORS).toHaveProperty(reg);
    }
  });

  it('CONSTRAINT_PRIORITIES has 7 entries sorted by priority 1–7', () => {
    expect(CONSTRAINT_PRIORITIES).toHaveLength(7);
    for (let i = 0; i < CONSTRAINT_PRIORITIES.length; i++) {
      expect(CONSTRAINT_PRIORITIES[i].priority).toBe(i + 1);
      expect(CONSTRAINT_PRIORITIES[i]).toHaveProperty('id');
      expect(CONSTRAINT_PRIORITIES[i]).toHaveProperty('description');
    }
  });
});

describe('state.js — createInitialState', () => {
  it('returns all register counts at 0', () => {
    const state = createInitialState();
    for (const value of Object.values(state.counts)) {
      expect(value).toBe(0);
    }
  });

  it('returns schlagzeugCounts all at 0', () => {
    const state = createInitialState();
    expect(state.schlagzeugCounts.kleineTrommel).toBe(0);
    expect(state.schlagzeugCounts.becken).toBe(0);
    expect(state.schlagzeugCounts.grosseTrommel).toBe(0);
  });

  it('sets variant to variante1', () => {
    const state = createInitialState();
    expect(state.variant).toBe('variante1');
  });

  it('sets formation to null', () => {
    const state = createInitialState();
    expect(state.formation).toBeNull();
  });

  it('sets loading to false', () => {
    const state = createInitialState();
    expect(state.loading).toBe(false);
  });

  it('sets error to null', () => {
    const state = createInitialState();
    expect(state.error).toBeNull();
  });

  it('sets gridDimensions to null', () => {
    const state = createInitialState();
    expect(state.gridDimensions).toBeNull();
  });
});

describe('state.js — Immutable update functions', () => {
  it('updateCounts returns new state with updated counts', () => {
    const state = createInitialState();
    const newCounts = { ...state.counts, posaunen: 5, tuben: 3 };
    const next = updateCounts(state, newCounts);

    expect(next).not.toBe(state);
    expect(next.counts.posaunen).toBe(5);
    expect(next.counts.tuben).toBe(3);
    // original unchanged
    expect(state.counts.posaunen).toBe(0);
  });

  it('updateVariant returns new state with updated variant', () => {
    const state = createInitialState();
    const next = updateVariant(state, 'variante2');

    expect(next).not.toBe(state);
    expect(next.variant).toBe('variante2');
    expect(state.variant).toBe('variante1');
  });

  it('setFormationResult returns new state with formation, loading=false, error=null', () => {
    const state = { ...createInitialState(), loading: true, error: 'old error' };
    const formation = { dimensions: { rows: 3, columns: 4 }, grid: [], violatedConstraints: [] };
    const next = setFormationResult(state, formation);

    expect(next).not.toBe(state);
    expect(next.formation).toBe(formation);
    expect(next.loading).toBe(false);
    expect(next.error).toBeNull();
  });

  it('setLoading returns new state with updated loading flag', () => {
    const state = createInitialState();
    const next = setLoading(state, true);

    expect(next).not.toBe(state);
    expect(next.loading).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('setError returns new state with error and loading=false', () => {
    const state = { ...createInitialState(), loading: true };
    const next = setError(state, 'Verbindung fehlgeschlagen');

    expect(next).not.toBe(state);
    expect(next.error).toBe('Verbindung fehlgeschlagen');
    expect(next.loading).toBe(false);
    expect(state.loading).toBe(true);
  });

  it('setError with null clears the error', () => {
    const state = { ...createInitialState(), error: 'some error' };
    const next = setError(state, null);

    expect(next.error).toBeNull();
    expect(next.loading).toBe(false);
  });
});
