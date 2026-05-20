/**
 * Unit tests for the equivalence-surcharge validator.
 */

import { describe, expect, it } from 'bun:test';
import {
  isValidRecargoForTaxRate,
  isValidRecargoString,
} from '../../../src/validators/recargoEquivalencia.ts';

const DATE_2024_AUG = new Date('2024-08-15T00:00:00Z');
const DATE_2024_NOV = new Date('2024-11-15T00:00:00Z');
const DATE_2026 = new Date('2026-05-20T00:00:00Z');

describe('isValidRecargoForTaxRate', () => {
  it.each([
    [5.2, 21],
    [1.75, 21],
    [1.4, 10],
    [0.5, 4],
  ])('accepts %p with tax rate %p (always)', (recargo, taxRate) => {
    expect(isValidRecargoForTaxRate(recargo, taxRate, DATE_2026)).toBe(true);
  });

  it('accepts 7.5 + 1 only in 2024-Q4', () => {
    expect(isValidRecargoForTaxRate(1, 7.5, DATE_2024_NOV)).toBe(true);
    expect(isValidRecargoForTaxRate(1, 7.5, DATE_2026)).toBe(false);
  });

  it('accepts 5 + 0.5 only in 2022', () => {
    expect(isValidRecargoForTaxRate(0.5, 5, new Date('2022-08-15'))).toBe(true);
    expect(isValidRecargoForTaxRate(0.5, 5, DATE_2024_AUG)).toBe(false);
  });

  it('accepts 5 + 0.62 only in 2023..2024-Q3', () => {
    expect(isValidRecargoForTaxRate(0.62, 5, DATE_2024_AUG)).toBe(true);
    expect(isValidRecargoForTaxRate(0.62, 5, new Date('2024-12-15'))).toBe(false);
  });

  it('accepts 2 + 0.26 in 2024-Q4', () => {
    expect(isValidRecargoForTaxRate(0.26, 2, DATE_2024_NOV)).toBe(true);
  });

  it('accepts 0 + 0 only in 2023..2024-Q3', () => {
    expect(isValidRecargoForTaxRate(0, 0, DATE_2024_AUG)).toBe(true);
    expect(isValidRecargoForTaxRate(0, 0, DATE_2026)).toBe(false);
  });

  it('accepts 0 + 0.26 from 2024-10-01 onwards', () => {
    expect(isValidRecargoForTaxRate(0.26, 0, DATE_2024_NOV)).toBe(true);
    expect(isValidRecargoForTaxRate(0.26, 0, DATE_2026)).toBe(true);
  });

  it('rejects unrelated combinations', () => {
    expect(isValidRecargoForTaxRate(5.2, 10)).toBe(false);
    expect(isValidRecargoForTaxRate(Number.NaN, 21)).toBe(false);
  });
});

describe('isValidRecargoString', () => {
  it('accepts well-formed strings', () => {
    expect(isValidRecargoString('5.2', '21')).toBe(true);
  });

  it('rejects garbage strings', () => {
    expect(isValidRecargoString('abc', '21')).toBe(false);
    expect(isValidRecargoString('5.2', 'xyz')).toBe(false);
  });

  it('respects the ISO date', () => {
    expect(isValidRecargoString('0.5', '5', '2022-12-15')).toBe(true);
    expect(isValidRecargoString('0.5', '5', '2026-01-01')).toBe(false);
  });
});
