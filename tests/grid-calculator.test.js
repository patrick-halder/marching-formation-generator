import { describe, it, expect } from 'vitest';
import { calculateGridDimensions } from '../public/js/grid-calculator.js';

describe('calculateGridDimensions', () => {
  describe('edge cases', () => {
    it('returns {rows: 0, columns: 0} for totalPlayers = 0', () => {
      expect(calculateGridDimensions(0)).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for negative input', () => {
      expect(calculateGridDimensions(-5)).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for NaN', () => {
      expect(calculateGridDimensions(NaN)).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for undefined', () => {
      expect(calculateGridDimensions(undefined)).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for null', () => {
      expect(calculateGridDimensions(null)).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for non-numeric string', () => {
      expect(calculateGridDimensions('abc')).toEqual({ rows: 0, columns: 0 });
    });

    it('returns {rows: 0, columns: 0} for Infinity', () => {
      expect(calculateGridDimensions(Infinity)).toEqual({ rows: 0, columns: 0 });
    });
  });

  describe('small formations (1-2 players)', () => {
    it('totalPlayers = 1 → single row, single column', () => {
      expect(calculateGridDimensions(1)).toEqual({ rows: 1, columns: 1 });
    });

    it('totalPlayers = 2 → single row, two columns', () => {
      expect(calculateGridDimensions(2)).toEqual({ rows: 1, columns: 2 });
    });
  });

  describe('standard calculations (3+ players)', () => {
    it('totalPlayers = 3 → columns = round(sqrt(3)) = 2, rows = ceil(3/2) = 2', () => {
      expect(calculateGridDimensions(3)).toEqual({ rows: 2, columns: 2 });
    });

    it('totalPlayers = 4 → columns = round(sqrt(4)) = 2, rows = ceil(4/2) = 2', () => {
      expect(calculateGridDimensions(4)).toEqual({ rows: 2, columns: 2 });
    });

    it('totalPlayers = 9 → columns = round(sqrt(9)) = 3, rows = ceil(9/3) = 3', () => {
      expect(calculateGridDimensions(9)).toEqual({ rows: 3, columns: 3 });
    });

    it('totalPlayers = 10 → columns = round(sqrt(10)) = 3, rows = ceil(10/3) = 4', () => {
      expect(calculateGridDimensions(10)).toEqual({ rows: 4, columns: 3 });
    });

    it('totalPlayers = 16 → columns = round(sqrt(16)) = 4, rows = ceil(16/4) = 4', () => {
      expect(calculateGridDimensions(16)).toEqual({ rows: 4, columns: 4 });
    });

    it('totalPlayers = 25 → columns = round(sqrt(25)) = 5, rows = ceil(25/5) = 5', () => {
      expect(calculateGridDimensions(25)).toEqual({ rows: 5, columns: 5 });
    });

    it('totalPlayers = 50 → columns = round(sqrt(50)) = 7, rows = ceil(50/7) = 8', () => {
      expect(calculateGridDimensions(50)).toEqual({ rows: 8, columns: 7 });
    });

    it('totalPlayers = 100 → columns = round(sqrt(100)) = 10, rows = ceil(100/10) = 10', () => {
      expect(calculateGridDimensions(100)).toEqual({ rows: 10, columns: 10 });
    });
  });

  describe('general properties', () => {
    it('rows * columns >= totalPlayers (grid has enough space)', () => {
      for (const n of [3, 5, 7, 11, 15, 20, 33, 50, 75, 99, 150]) {
        const { rows, columns } = calculateGridDimensions(n);
        expect(rows * columns).toBeGreaterThanOrEqual(n);
      }
    });

    it('(rows - 1) * columns < totalPlayers (no unnecessary empty row)', () => {
      for (const n of [3, 5, 7, 11, 15, 20, 33, 50, 75, 99, 150]) {
        const { rows, columns } = calculateGridDimensions(n);
        expect((rows - 1) * columns).toBeLessThan(n);
      }
    });

    it('truncates decimal input to integer', () => {
      expect(calculateGridDimensions(9.7)).toEqual({ rows: 3, columns: 3 });
    });
  });
});
