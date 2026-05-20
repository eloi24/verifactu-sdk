/**
 * Spanish tax-identifier validators (NIF / NIE / CIF).
 *
 * The AEAT VERI*FACTU schema (`NIFType`) only constrains the length to nine
 * characters; the control-letter/digit check is delegated to this module so
 * that the schema remains reusable for raw wire payloads.
 *
 * Algorithms follow Hacienda's published rules:
 *
 * - **DNI/NIF**: 8 digits + control letter from the table
 *   `TRWAGMYFPDXBNJZSQVHLCKE` at `digits % 23`.
 * - **NIE**: leading `X`/`Y`/`Z` mapped to `0`/`1`/`2`, then the same DNI
 *   algorithm on the resulting 8-digit string.
 * - **CIF** (legal entities): leading letter from `ABCDEFGHJNPQRSUVW`, 7
 *   digits, and a control digit/letter computed from the digits.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3}
 * @module
 */

/** Control-letter table for DNI / NIE (`digits % 23`). */
const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Allowed leading letters for CIF (legal-entity NIFs). */
const CIF_LEADING_LETTERS = 'ABCDEFGHJNPQRSUVW';

/** CIF control-letter table (`digits % 10`). */
const CIF_LETTERS = 'JABCDEFGHI';

/**
 * Letter-prefixed CIFs whose control character must always be a letter (not a
 * digit) — these correspond to non-resident entities and public bodies whose
 * NIF must be unambiguous in the AEAT census.
 */
const CIF_FORCE_LETTER = new Set(['K', 'P', 'Q', 'S', 'N', 'W']);

/**
 * Letter-prefixed CIFs whose control character must always be a digit. The
 * remainder may take either form.
 */
const CIF_FORCE_DIGIT = new Set(['A', 'B', 'E', 'H']);

/**
 * Check whether a string is a valid Spanish DNI / NIF.
 *
 * A DNI is exactly eight digits followed by an uppercase control letter
 * derived from `'TRWAGMYFPDXBNJZSQVHLCKE'[digits % 23]`.
 *
 * @param value - Candidate identifier; case-sensitive, already uppercase.
 * @returns `true` if the string matches the DNI shape and the control letter.
 * @example
 * ```ts
 * isValidNif('00000000T'); // true
 * isValidNif('00000000A'); // false (letter mismatch)
 * ```
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3 rule 1}
 */
export function isValidNif(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{8}[A-Z]$/u.test(value)) return false;
  const digits = Number.parseInt(value.slice(0, 8), 10);
  const expected = NIF_LETTERS.charAt(digits % 23);
  return expected === value.charAt(8);
}

/**
 * Check whether a string is a valid Spanish NIE.
 *
 * A NIE starts with `X`, `Y` or `Z` (mapped to `0`, `1`, `2` respectively),
 * followed by seven digits and the same control letter as the DNI.
 *
 * @param value - Candidate identifier (uppercase).
 * @returns `true` if the string matches the NIE shape and control letter.
 * @example
 * ```ts
 * isValidNie('X0000000T'); // true
 * isValidNie('X0000000A'); // false
 * ```
 */
export function isValidNie(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^[XYZ]\d{7}[A-Z]$/u.test(value)) return false;
  const firstChar = value.charAt(0);
  const prefix = firstChar === 'X' ? '0' : firstChar === 'Y' ? '1' : '2';
  const digits = Number.parseInt(`${prefix}${value.slice(1, 8)}`, 10);
  const expected = NIF_LETTERS.charAt(digits % 23);
  return expected === value.charAt(8);
}

/**
 * Compute the CIF control character for the seven internal digits.
 *
 * The algorithm sums odd-position digits unchanged and the doubled even-position
 * digits (split into tens + units), then takes `(10 - sum % 10) % 10`.
 *
 * @param digits - Exactly seven digits.
 * @returns The two-character pair `{ digit, letter }` — only one of them
 * applies depending on the leading letter (see {@link isValidCif}).
 */
function computeCifControl(digits: string): { digit: string; letter: string } {
  let sum = 0;
  for (let i = 0; i < 7; i += 1) {
    const n = Number.parseInt(digits.charAt(i), 10);
    if ((i + 1) % 2 === 0) {
      sum += n;
    } else {
      const doubled = n * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  return {
    digit: String(controlDigit),
    letter: CIF_LETTERS.charAt(controlDigit),
  };
}

/**
 * Check whether a string is a valid Spanish CIF (legal-entity tax identifier).
 *
 * A CIF starts with one of `'ABCDEFGHJNPQRSUVW'`, followed by seven digits and
 * a control character whose form depends on the leading letter:
 *
 * - `K`, `P`, `Q`, `S`, `N`, `W` → letter only.
 * - `A`, `B`, `E`, `H` → digit only.
 * - Others → either digit or letter.
 *
 * @param value - Candidate identifier (uppercase).
 * @returns `true` if the value matches both the shape and the control character.
 * @example
 * ```ts
 * isValidCif('B12345674'); // true
 * isValidCif('A12345670'); // false (would expect '8')
 * ```
 */
export function isValidCif(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^[A-Z]\d{7}[\dA-Z]$/u.test(value)) return false;
  const leading = value.charAt(0);
  if (!CIF_LEADING_LETTERS.includes(leading)) return false;
  const control = value.charAt(8);
  const expected = computeCifControl(value.slice(1, 8));
  if (CIF_FORCE_LETTER.has(leading)) {
    return control === expected.letter;
  }
  if (CIF_FORCE_DIGIT.has(leading)) {
    return control === expected.digit;
  }
  return control === expected.digit || control === expected.letter;
}

/**
 * Check whether a string is a valid personal identifier (DNI or NIE).
 *
 * @param value - Candidate identifier (uppercase).
 * @returns `true` when {@link isValidNif} or {@link isValidNie} accepts the input.
 * @example
 * ```ts
 * isValidPersonalNif('00000000T'); // true (DNI)
 * isValidPersonalNif('X0000000T'); // true (NIE)
 * isValidPersonalNif('B12345674'); // false (CIF)
 * ```
 */
export function isValidPersonalNif(value: string): boolean {
  return isValidNif(value) || isValidNie(value);
}

/**
 * Check whether a string is a valid legal-entity identifier (CIF).
 *
 * Convenience alias of {@link isValidCif}, exposed alongside
 * {@link isValidPersonalNif} for symmetry.
 *
 * @param value - Candidate identifier (uppercase).
 * @returns `true` when the value is a structurally valid CIF.
 * @example
 * ```ts
 * isValidLegalNif('B12345674'); // true
 * ```
 */
export function isValidLegalNif(value: string): boolean {
  return isValidCif(value);
}

/**
 * Check whether a string is a structurally valid Spanish tax identifier.
 *
 * Accepts DNIs ({@link isValidNif}), NIEs ({@link isValidNie}) and CIFs
 * ({@link isValidCif}). Use this when the input could be any of the three
 * (e.g. the AEAT `NIFType` simpleType).
 *
 * @param value - Candidate identifier (uppercase, 9 characters).
 * @returns `true` when any of the three sub-validators accept the value.
 * @example
 * ```ts
 * isValidAnyNif('B12345674'); // true (CIF)
 * isValidAnyNif('00000000T'); // true (DNI)
 * isValidAnyNif('X0000000T'); // true (NIE)
 * ```
 */
export function isValidAnyNif(value: string): boolean {
  return isValidNif(value) || isValidNie(value) || isValidCif(value);
}

/**
 * Outcome of {@link parseNif}.
 */
export interface ParsedNif {
  /** Detected identifier kind (`'dni'`, `'nie'`, or `'cif'`). */
  readonly kind: 'dni' | 'nie' | 'cif';
  /** Whether the control character passes its algorithm. */
  readonly isValid: boolean;
}

/**
 * Classify a Spanish identifier and report its validity in one call.
 *
 * The classification is purely syntactic — based on the leading character —
 * and never throws. Callers wanting a yes/no answer should prefer
 * {@link isValidNif}/{@link isValidNie}/{@link isValidCif} for clarity.
 *
 * @param value - Candidate identifier (uppercase, 9 characters).
 * @returns A `{ kind, isValid }` pair, or `undefined` when the input does not
 *   look like any of the three categories (wrong length, garbage character).
 * @example
 * ```ts
 * parseNif('00000000T'); // { kind: 'dni', isValid: true }
 * parseNif('X0000000T'); // { kind: 'nie', isValid: true }
 * parseNif('B12345674'); // { kind: 'cif', isValid: true }
 * parseNif('foo');       // undefined
 * ```
 */
export function parseNif(value: string): ParsedNif | undefined {
  if (typeof value !== 'string' || value.length !== 9) return undefined;
  const first = value.charAt(0);
  if (/^\d$/u.test(first)) {
    return { kind: 'dni', isValid: isValidNif(value) };
  }
  if (first === 'X' || first === 'Y' || first === 'Z') {
    return { kind: 'nie', isValid: isValidNie(value) };
  }
  if (CIF_LEADING_LETTERS.includes(first)) {
    return { kind: 'cif', isValid: isValidCif(value) };
  }
  return undefined;
}
