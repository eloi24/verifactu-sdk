/**
 * Property-based tests for the EU NIF-IVA structural validator.
 *
 * For each country the test generates strings that match the country's exact
 * pattern (digits-only, alphanumeric, optional `B` in NL, etc.), asserts that
 * `isValidEuVatNumber` accepts them, mutates one character to a value the
 * pattern cannot accept, and asserts that the mutated string is rejected.
 *
 * GB/XI Brexit transitions are excluded from the property loop and tested
 * directly in `test/unit/validators/nifIva.spec.ts`.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.5 Nota (1)}
 */

import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import { isValidEuVatNumber } from '../../src/validators/nifIva.ts';

/** Generators that produce structurally-valid identifiers for each country. */
interface CountrySpec {
  /** VIES country code. */
  code: string;
  /** Generator that produces a valid identifier (without the country prefix). */
  validArb: fc.Arbitrary<string>;
}

const DIGITS = '0123456789';

function digitsOf(n: number): fc.Arbitrary<string> {
  return fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: n, maxLength: n })
    .map((arr) => arr.join(''));
}

function digitsRange(min: number, max: number): fc.Arbitrary<string> {
  return fc
    .integer({ min, max })
    .chain((len) => fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len }))
    .map((arr) => arr.join(''));
}

function alnumOf(n: number): fc.Arbitrary<string> {
  return fc
    .array(
      fc
        .integer({ min: 0, max: 35 })
        .map((i) => (i < 10 ? DIGITS[i] : String.fromCharCode(65 + (i - 10))) ?? ''),
      { minLength: n, maxLength: n },
    )
    .map((arr) => arr.join(''));
}

const COUNTRIES: CountrySpec[] = [
  { code: 'DE', validArb: digitsOf(9) },
  {
    code: 'AT',
    validArb: alnumOf(8).map((rest) => `U${rest}`),
  },
  { code: 'BE', validArb: digitsOf(10) },
  { code: 'CY', validArb: alnumOf(9) },
  { code: 'CZ', validArb: digitsRange(8, 10) },
  { code: 'HR', validArb: digitsOf(11) },
  { code: 'DK', validArb: digitsOf(8) },
  { code: 'SK', validArb: digitsOf(10) },
  { code: 'SI', validArb: digitsOf(8) },
  { code: 'EE', validArb: digitsOf(9) },
  { code: 'FI', validArb: digitsOf(8) },
  { code: 'FR', validArb: alnumOf(11) },
  { code: 'EL', validArb: digitsOf(9) },
  {
    code: 'NL',
    validArb: fc.tuple(alnumOf(2), alnumOf(9)).map(([a, b]) => `${a}B${b}`.slice(0, 12)),
  },
  { code: 'HU', validArb: digitsOf(8) },
  { code: 'IT', validArb: digitsOf(11) },
  { code: 'LV', validArb: digitsOf(11) },
  { code: 'LU', validArb: digitsOf(8) },
  { code: 'MT', validArb: digitsOf(8) },
  { code: 'PL', validArb: digitsOf(10) },
  { code: 'PT', validArb: digitsOf(9) },
  { code: 'SE', validArb: digitsOf(12) },
  {
    code: 'BG',
    validArb: fc.oneof(digitsOf(9), digitsOf(10)),
  },
  {
    code: 'LT',
    validArb: fc.oneof(digitsOf(9), digitsOf(12)),
  },
  {
    code: 'IE',
    validArb: fc.oneof(alnumOf(8), alnumOf(9)),
  },
  {
    code: 'RO',
    validArb: fc.integer({ min: 2, max: 10 }).chain((len) =>
      fc.integer({ min: 1, max: 9 }).chain((first) =>
        fc
          .array(fc.integer({ min: 0, max: 9 }), {
            minLength: len - 1,
            maxLength: len - 1,
          })
          .map((rest) => `${first}${rest.join('')}`),
      ),
    ),
  },
];

describe('property: isValidEuVatNumber — accepts every structurally valid id', () => {
  for (const country of COUNTRIES) {
    test(`${country.code} — generated identifiers are accepted`, () => {
      fc.assert(
        fc.property(country.validArb, (id) => {
          return isValidEuVatNumber(country.code, id) === true;
        }),
        { numRuns: 100 },
      );
    });
  }
});

describe('property: isValidEuVatNumber — mutations that break the shape are rejected', () => {
  // Pick only the strict-length digit countries so a single mutation
  // (digit→letter) is guaranteed to invalidate the value.
  const strictDigitCountries = COUNTRIES.filter((c) =>
    [
      'DE',
      'BE',
      'HR',
      'DK',
      'SK',
      'SI',
      'EE',
      'FI',
      'EL',
      'HU',
      'IT',
      'LV',
      'LU',
      'MT',
      'PL',
      'PT',
      'SE',
    ].includes(c.code),
  );

  for (const country of strictDigitCountries) {
    test(`${country.code} — mutating one digit to a letter breaks the validation`, () => {
      fc.assert(
        fc.property(country.validArb, fc.nat(), (id, mutationIndex) => {
          if (id.length === 0) return true;
          const i = mutationIndex % id.length;
          const mutated = `${id.slice(0, i)}A${id.slice(i + 1)}`;
          return isValidEuVatNumber(country.code, mutated) === false;
        }),
        { numRuns: 100 },
      );
    });
  }
});
