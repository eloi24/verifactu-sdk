/**
 * EU intra-community VAT-number (NIF-IVA) structural validator.
 *
 * The AEAT validations document publishes the canonical table of EU member
 * states with the expected length and character class for each NIF-IVA. This
 * module implements that table for every member state plus the Brexit-specific
 * transitions for the United Kingdom (GB) and Northern Ireland (XI).
 *
 * The validator is *structural only* — it does not contact VIES. Callers that
 * require remote verification must integrate the VIES web service separately.
 *
 * @see {@link https://ec.europa.eu/taxation_customs/vies/help.html | VIES help}
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.5 Nota (1)}
 * @module
 */

/**
 * Predicate type used by {@link COUNTRY_RULES}: returns `true` when the
 * identifier (without the country prefix) matches the structural rule.
 */
type IdentifierPredicate = (id: string) => boolean;

/** Convenience: any string of exactly `n` decimal digits. */
const digits =
  (n: number): IdentifierPredicate =>
  (id) =>
    new RegExp(`^\\d{${n}}$`, 'u').test(id);

/** Convenience: a digit string whose length sits within `[min, max]`. */
const digitsRange =
  (min: number, max: number): IdentifierPredicate =>
  (id) =>
    new RegExp(`^\\d{${min},${max}}$`, 'u').test(id);

/** Convenience: alphanumeric (uppercase letters or digits) of exact length. */
const alnum =
  (n: number): IdentifierPredicate =>
  (id) =>
    new RegExp(`^[0-9A-Z]{${n}}$`, 'u').test(id);

/**
 * Mapping from EU country code to its structural rule.
 *
 * Codes match VIES naming conventions, including the Greek prefix `EL` (rather
 * than the ISO `GR`) and the Northern Ireland prefix `XI` introduced after
 * Brexit.
 */
const COUNTRY_RULES: Readonly<Record<string, IdentifierPredicate>> = {
  DE: digits(9),
  AT: (id) => /^U[0-9A-Z]{8}$/u.test(id),
  BE: digits(10),
  CY: alnum(9),
  CZ: (id) => /^\d{8,10}$/u.test(id),
  HR: digits(11),
  DK: digits(8),
  SK: digits(10),
  SI: digits(8),
  EE: digits(9),
  FI: digits(8),
  FR: alnum(11),
  EL: digits(9),
  GB: (id) => /^([0-9A-Z]{5}|[0-9A-Z]{9}|[0-9A-Z]{12})$/u.test(id),
  XI: (id) => /^([0-9A-Z]{5}|[0-9A-Z]{9}|[0-9A-Z]{12})$/u.test(id),
  NL: (id) => /^[0-9A-Z]{12}$/u.test(id) && id.includes('B'),
  HU: digits(8),
  IT: digits(11),
  IE: (id) => alnum(8)(id) || alnum(9)(id),
  LV: digits(11),
  LT: (id) => digits(9)(id) || digits(12)(id),
  LU: digits(8),
  MT: digits(8),
  PL: digits(10),
  PT: digits(9),
  SE: digits(12),
  BG: (id) => digits(9)(id) || digits(10)(id),
  RO: (id) => digitsRange(2, 10)(id) && !id.startsWith('0'),
};

/**
 * Set of every EU country code recognised by this validator (uppercase).
 *
 * Exposed primarily for tests; the runtime check is `code in COUNTRY_RULES`.
 */
export const EU_COUNTRY_CODES: ReadonlySet<string> = new Set(Object.keys(COUNTRY_RULES));

/** Brexit transition: UK only (`GB`) before this date. */
const BREXIT_GB_END = new Date('2021-01-01T00:00:00Z');

/** Brexit transition: dual `GB|XI` window starts at `BREXIT_GB_END`. */
const BREXIT_DUAL_END = new Date('2021-02-01T00:00:00Z');

/**
 * Validate the *structure* of an EU VAT number for a given member-state code.
 *
 * For `GB` and `XI` the operation date determines which prefix is admissible:
 *
 * - Before 2021-01-01: only `GB`.
 * - 2021-01-01 to 2021-01-31 inclusive: either `GB` or `XI`.
 * - From 2021-02-01: only `XI`.
 *
 * Other countries ignore {@link operationDate}.
 *
 * @param countryCode - Two-letter VIES country code (e.g. `'DE'`, `'XI'`).
 * @param identifier - The part after the country prefix. Already uppercased.
 * @param operationDate - Operation date used by the Brexit transition rules.
 *   Defaults to the current date when omitted.
 * @returns `true` when both the country code is known and the identifier
 *   matches the corresponding rule.
 * @example
 * ```ts
 * isValidEuVatNumber('DE', '123456789');           // true
 * isValidEuVatNumber('NL', '123456789B12');        // true
 * isValidEuVatNumber('GB', '123456789', new Date('2020-06-01')); // true
 * isValidEuVatNumber('GB', '123456789', new Date('2022-01-01')); // false (XI only)
 * ```
 */
export function isValidEuVatNumber(
  countryCode: string,
  identifier: string,
  operationDate?: Date,
): boolean {
  if (typeof countryCode !== 'string' || typeof identifier !== 'string') return false;
  const upperCountry = countryCode.toUpperCase();
  const upperId = identifier.toUpperCase();

  if (upperCountry === 'GB' || upperCountry === 'XI') {
    const date = operationDate ?? new Date();
    if (date < BREXIT_GB_END) {
      if (upperCountry !== 'GB') return false;
    } else if (date < BREXIT_DUAL_END) {
      // both GB and XI accepted
    } else {
      if (upperCountry !== 'XI') return false;
    }
  }

  const rule = COUNTRY_RULES[upperCountry];
  if (rule === undefined) return false;
  return rule(upperId);
}
