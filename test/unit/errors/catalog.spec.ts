/**
 * Unit tests for the generated AEAT error catalog.
 */

import { describe, expect, it } from 'bun:test';
import { ERROR_CATALOG, lookupError } from '../../../src/errors/catalog.ts';

describe('ERROR_CATALOG', () => {
  it('contains the well-known envelope codes', () => {
    expect(ERROR_CATALOG['4102']?.category).toBe('envelope');
  });

  it('contains the well-known record codes', () => {
    expect(ERROR_CATALOG['1108']?.category).toBe('record');
    expect(ERROR_CATALOG['3000']?.category).toBe('record');
  });

  it('contains the well-known admissible codes', () => {
    expect(ERROR_CATALOG['2000']?.category).toBe('admissible');
  });

  it('has English translations for every entry', () => {
    for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
      expect(typeof entry.englishMessage).toBe('string');
      expect(entry.englishMessage.length).toBeGreaterThan(0);
      expect(typeof entry.message).toBe('string');
      expect(typeof code).toBe('string');
    }
  });

  it('contains at least the 248 documented codes', () => {
    expect(Object.keys(ERROR_CATALOG).length).toBeGreaterThanOrEqual(248);
  });
});

describe('lookupError', () => {
  it('returns a known entry', () => {
    const entry = lookupError('1108');
    expect(entry?.englishMessage).toContain('IDEmisorFactura');
  });

  it('returns undefined for an unknown code', () => {
    expect(lookupError('9999')).toBeUndefined();
  });
});
