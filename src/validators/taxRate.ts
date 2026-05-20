/**
 * `TipoImpositivo` (tax-rate) validator with date-windowed validity.
 *
 * Implements §3.1.3 rule 15.1: when `Impuesto = '01'` (IVA, or empty) and
 * `CalificacionOperacion = 'S1'`, only the rates `0 / 2 / 4 / 5 / 7.5 / 10 / 21`
 * are accepted; some of them are valid only inside a specific date window:
 *
 * - `5` — between 2022-07-01 and 2024-09-30.
 * - `2` — between 2024-10-01 and 2024-12-31.
 * - `7.5` — between 2024-10-01 and 2024-12-31.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.1}
 * @module
 */

import { parseIsoDate } from './dates.js';

/**
 * Tax rate descriptor — the canonical numeric value and the date window during
 * which the AEAT accepts it.
 */
interface TaxRateRule {
  /** Canonical numeric rate (e.g. `5`, `7.5`). */
  readonly value: number;
  /** Inclusive lower bound (UTC ms), or `-Infinity` for "always valid". */
  readonly from: number;
  /** Inclusive upper bound (UTC ms), or `+Infinity` for "always valid". */
  readonly to: number;
}

const TAX_RATE_RULES: ReadonlyArray<TaxRateRule> = [
  { value: 0, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { value: 2, from: Date.UTC(2024, 9, 1), to: Date.UTC(2024, 11, 31) },
  { value: 4, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { value: 5, from: Date.UTC(2022, 6, 1), to: Date.UTC(2024, 8, 30) },
  { value: 7.5, from: Date.UTC(2024, 9, 1), to: Date.UTC(2024, 11, 31) },
  { value: 10, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { value: 21, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
];

/**
 * Parse a `TipoImpositivo` string (e.g. `'21.00'`) to a number.
 *
 * @param value - Raw `TipoImpositivo` string.
 * @returns The numeric percentage, or `NaN` when parsing fails.
 */
export function parseTaxRate(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Check whether a numeric tax rate is admissible on the given operation date.
 *
 * @param rate - The numeric rate (e.g. `21`, `5`, `7.5`). Use {@link parseTaxRate}
 *   to coerce the raw `TipoImpositivo` string.
 * @param operationDate - The reference date used by the windowed rules
 *   (defaults to the current UTC date).
 * @returns `true` when the rate belongs to the canonical set and the date is
 *   within its validity window.
 * @example
 * ```ts
 * isValidTaxRateOnDate(21);                            // true
 * isValidTaxRateOnDate(5, new Date('2024-08-15'));     // true
 * isValidTaxRateOnDate(5, new Date('2024-10-15'));     // false
 * ```
 */
export function isValidTaxRateOnDate(rate: number, operationDate: Date = new Date()): boolean {
  if (!Number.isFinite(rate)) return false;
  const ms = Date.UTC(
    operationDate.getUTCFullYear(),
    operationDate.getUTCMonth(),
    operationDate.getUTCDate(),
  );
  for (const rule of TAX_RATE_RULES) {
    if (rule.value !== rate) continue;
    if (ms >= rule.from && ms <= rule.to) return true;
  }
  return false;
}

/**
 * Convenience: validate a `TipoImpositivo` string with optional ISO date.
 *
 * @param value - Raw `TipoImpositivo` string from the breakdown line.
 * @param operationDateIso - Optional ISO date (`'YYYY-MM-DD'`).
 * @returns `true` when the rate is structurally valid and admissible on the
 *   given date.
 * @example
 * ```ts
 * isValidTipoImpositivo('21');                          // true
 * isValidTipoImpositivo('7.5', '2024-11-01');           // true
 * isValidTipoImpositivo('7.5', '2025-01-01');           // false
 * ```
 */
export function isValidTipoImpositivo(value: string, operationDateIso?: string): boolean {
  const rate = parseTaxRate(value);
  const date = operationDateIso !== undefined ? parseIsoDate(operationDateIso) : undefined;
  return isValidTaxRateOnDate(rate, date);
}
