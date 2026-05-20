/**
 * Unit tests for Spanish DNI / NIE / CIF validators.
 *
 * Reference values for the control characters were computed by hand from the
 * algorithm rather than copied from the validator under test.
 */

import { describe, expect, it } from 'bun:test';
import {
  isValidCif,
  isValidLegalNif,
  isValidNie,
  isValidNif,
  isValidPersonalNif,
  parseNif,
} from '../../../src/validators/nif.ts';

describe('isValidNif (DNI)', () => {
  it.each(['00000000T', '12345678Z', '11111111H', '99999999R'])('accepts %s', (input) => {
    expect(isValidNif(input)).toBe(true);
  });

  it.each([
    '00000000A', // wrong control letter
    '0000000T', // too short
    '000000000', // no letter
    'lowercase', // shape mismatch
    '',
  ])('rejects %s', (input) => {
    expect(isValidNif(input)).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidNif(undefined as unknown as string)).toBe(false);
  });
});

describe('isValidNie', () => {
  it.each(['X0000000T', 'Y0000000Z', 'Z0000000M'])('accepts %s', (input) => {
    expect(isValidNie(input)).toBe(true);
  });

  it.each(['X0000000A', 'W0000000T', 'X000000T', ''])('rejects %s', (input) => {
    expect(isValidNie(input)).toBe(false);
  });
});

describe('isValidCif', () => {
  it.each(['B12345674', 'A58818501', 'X8888888', 'G12345678'])('classifies %s', (input) => {
    // accept-or-reject by algorithm, but the function should never throw
    expect(() => isValidCif(input)).not.toThrow();
  });

  it('accepts a CIF with letter-only control (P, Q, S, N, W, K)', () => {
    // P1234567D — P entities must use a letter; computed control letter is D.
    expect(isValidCif('P1234567D')).toBe(true);
  });

  it('rejects P-entity CIF with digit control', () => {
    expect(isValidCif('P1234567 3')).toBe(false);
    expect(isValidCif('P12345673')).toBe(false);
  });

  it('accepts a CIF with digit-only control (A, B, E, H)', () => {
    // Manually computed: A12345674 — digit '4' is correct.
    expect(isValidCif('A12345674')).toBe(true);
  });

  it('rejects A-entity CIF with letter control', () => {
    expect(isValidCif('A1234567E')).toBe(false);
  });

  it('rejects unknown leading letter', () => {
    expect(isValidCif('Y12345678')).toBe(false);
    expect(isValidCif('I12345678')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidCif('')).toBe(false);
    expect(isValidCif('B1234567')).toBe(false);
    expect(isValidCif(undefined as unknown as string)).toBe(false);
  });
});

describe('isValidPersonalNif', () => {
  it('accepts a DNI', () => {
    expect(isValidPersonalNif('00000000T')).toBe(true);
  });

  it('accepts a NIE', () => {
    expect(isValidPersonalNif('X0000000T')).toBe(true);
  });

  it('rejects a CIF', () => {
    expect(isValidPersonalNif('B12345674')).toBe(false);
  });
});

describe('isValidLegalNif', () => {
  it('accepts a CIF', () => {
    expect(isValidLegalNif('B12345674')).toBe(true);
  });

  it('rejects a DNI', () => {
    expect(isValidLegalNif('00000000T')).toBe(false);
  });
});

describe('parseNif', () => {
  it('classifies a DNI', () => {
    expect(parseNif('00000000T')).toEqual({ kind: 'dni', isValid: true });
  });

  it('classifies a NIE', () => {
    expect(parseNif('X0000000T')).toEqual({ kind: 'nie', isValid: true });
  });

  it('classifies a CIF', () => {
    expect(parseNif('B12345674')).toEqual({ kind: 'cif', isValid: true });
  });

  it('reports invalid control char on classification', () => {
    expect(parseNif('00000000A')).toEqual({ kind: 'dni', isValid: false });
  });

  it('returns undefined for garbage', () => {
    expect(parseNif('foo')).toBeUndefined();
    expect(parseNif('I12345678')).toBeUndefined();
  });
});
