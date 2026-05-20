/**
 * Property-based tests for `isValidNif`.
 *
 * The DNI checksum is deterministic: for any 8-digit prefix exactly one
 * uppercase control letter — `'TRWAGMYFPDXBNJZSQVHLCKE'[digits % 23]` — is
 * accepted. The properties below randomise the prefix and assert that:
 *
 * 1. The canonical letter is always accepted.
 * 2. Every other uppercase letter is rejected.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3 rule 1}
 */

import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import { isValidNif } from '../../src/validators/nif.ts';

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const UPPER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const eightDigitsArb = fc
  .integer({ min: 0, max: 99_999_999 })
  .map((n) => String(n).padStart(8, '0'));

describe('property: isValidNif', () => {
  test('canonical letter is accepted for every 8-digit prefix', () => {
    fc.assert(
      fc.property(eightDigitsArb, (digits) => {
        const numeric = Number.parseInt(digits, 10);
        const letter = NIF_LETTERS[numeric % 23] ?? '';
        return isValidNif(`${digits}${letter}`) === true;
      }),
      { numRuns: 200 },
    );
  });

  test('every other letter is rejected', () => {
    fc.assert(
      fc.property(
        eightDigitsArb,
        fc.integer({ min: 0, max: UPPER_LETTERS.length - 1 }),
        (digits, letterIndex) => {
          const numeric = Number.parseInt(digits, 10);
          const expected = NIF_LETTERS[numeric % 23] ?? '';
          const candidate = UPPER_LETTERS[letterIndex] ?? '';
          if (candidate === expected) {
            return isValidNif(`${digits}${candidate}`) === true;
          }
          return isValidNif(`${digits}${candidate}`) === false;
        },
      ),
      { numRuns: 200 },
    );
  });

  test('rejects strings with the wrong length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 8 }).filter((s) => s.length !== 9),
        (s) => isValidNif(s) === false,
      ),
      { numRuns: 50 },
    );
  });

  test('rejects strings with non-digit prefix', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[A-Z]{1}\d{7}$/u).filter((s) => /^[A-Z]/.test(s)),
          fc.integer({ min: 0, max: UPPER_LETTERS.length - 1 }),
        ),
        ([prefix, letterIndex]) => {
          const letter = UPPER_LETTERS[letterIndex] ?? '';
          return isValidNif(`${prefix}${letter}`) === false;
        },
      ),
      { numRuns: 50 },
    );
  });
});
