/**
 * Unit tests for {@link isValidTaxRateOnDate} and {@link isValidTipoImpositivo}.
 */

import { describe, expect, it } from 'bun:test';
import {
  isValidTaxRateOnDate,
  isValidTipoImpositivo,
  parseTaxRate,
} from '../../../src/validators/taxRate.ts';

describe('parseTaxRate', () => {
  it('parses a valid percentage', () => {
    expect(parseTaxRate('21')).toBe(21);
    expect(parseTaxRate('7.5')).toBe(7.5);
  });

  it('returns NaN for garbage', () => {
    expect(Number.isNaN(parseTaxRate('abc'))).toBe(true);
  });
});

describe('isValidTaxRateOnDate', () => {
  it.each([0, 4, 10, 21])('always accepts %p', (rate) => {
    expect(isValidTaxRateOnDate(rate, new Date('2026-05-20'))).toBe(true);
  });

  it('accepts 5 in window', () => {
    expect(isValidTaxRateOnDate(5, new Date('2024-08-15'))).toBe(true);
  });

  it('rejects 5 outside window', () => {
    expect(isValidTaxRateOnDate(5, new Date('2025-01-01'))).toBe(false);
  });

  it('accepts 7.5 only in 2024-Q4', () => {
    expect(isValidTaxRateOnDate(7.5, new Date('2024-11-01'))).toBe(true);
    expect(isValidTaxRateOnDate(7.5, new Date('2025-01-01'))).toBe(false);
  });

  it('accepts 2 only in 2024-Q4', () => {
    expect(isValidTaxRateOnDate(2, new Date('2024-11-01'))).toBe(true);
    expect(isValidTaxRateOnDate(2, new Date('2025-01-01'))).toBe(false);
  });

  it('rejects unknown rates', () => {
    expect(isValidTaxRateOnDate(15)).toBe(false);
    expect(isValidTaxRateOnDate(Number.NaN)).toBe(false);
  });
});

describe('isValidTipoImpositivo', () => {
  it('accepts a valid percentage string', () => {
    expect(isValidTipoImpositivo('21')).toBe(true);
  });

  it('rejects when date is outside the window', () => {
    expect(isValidTipoImpositivo('5', '2025-01-01')).toBe(false);
  });

  it('accepts when no date is provided (defaults to today)', () => {
    expect(isValidTipoImpositivo('21')).toBe(true);
  });
});
