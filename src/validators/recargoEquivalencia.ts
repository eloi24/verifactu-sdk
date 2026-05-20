/**
 * `TipoRecargoEquivalencia` validator paired with `TipoImpositivo`.
 *
 * Implements §3.1.3 rule 15.3: each VAT rate has a fixed set of admissible
 * equivalence-surcharge rates, some of them date-windowed.
 *
 * | Tax rate | Recargo allowed (date window)                                       |
 * |---------:|---------------------------------------------------------------------|
 * | 21       | `5.2` or `1.75` (always)                                            |
 * | 10       | `1.4` (always)                                                      |
 * | 7.5      | `1` (only 2024-10-01 .. 2024-12-31)                                 |
 * | 5        | `0.5` (2022-07-01 .. 2022-12-31); `0.62` (2023-01-01 .. 2024-09-30) |
 * | 4        | `0.5` (always)                                                      |
 * | 2        | `0.26` (only 2024-10-01 .. 2024-12-31)                              |
 * | 0        | `0` (2023-01-01 .. 2024-09-30); `0.26` (from 2024-10-01)            |
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.3}
 * @module
 */

import { parseIsoDate } from './dates.js';

/** Internal rule used by {@link isValidRecargoForTaxRate}. */
interface RecargoRule {
  /** Companion VAT rate. */
  readonly taxRate: number;
  /** Allowed surcharge value. */
  readonly recargo: number;
  /** Inclusive lower bound (UTC ms) for the window. */
  readonly from: number;
  /** Inclusive upper bound (UTC ms) for the window. */
  readonly to: number;
}

const RULES: ReadonlyArray<RecargoRule> = [
  { taxRate: 21, recargo: 5.2, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { taxRate: 21, recargo: 1.75, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { taxRate: 10, recargo: 1.4, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { taxRate: 7.5, recargo: 1, from: Date.UTC(2024, 9, 1), to: Date.UTC(2024, 11, 31) },
  { taxRate: 5, recargo: 0.5, from: Date.UTC(2022, 6, 1), to: Date.UTC(2022, 11, 31) },
  { taxRate: 5, recargo: 0.62, from: Date.UTC(2023, 0, 1), to: Date.UTC(2024, 8, 30) },
  { taxRate: 4, recargo: 0.5, from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
  { taxRate: 2, recargo: 0.26, from: Date.UTC(2024, 9, 1), to: Date.UTC(2024, 11, 31) },
  { taxRate: 0, recargo: 0, from: Date.UTC(2023, 0, 1), to: Date.UTC(2024, 8, 30) },
  { taxRate: 0, recargo: 0.26, from: Date.UTC(2024, 9, 1), to: Number.POSITIVE_INFINITY },
];

/**
 * Determine whether a surcharge is admissible alongside a given VAT rate on a
 * specific date.
 *
 * @param recargo - Numeric surcharge percentage.
 * @param taxRate - Numeric VAT rate (`21`, `10`, `7.5`, …).
 * @param operationDate - Date used by windowed rules (defaults to today).
 * @returns `true` when the (rate, surcharge, date) triple is admissible.
 * @example
 * ```ts
 * isValidRecargoForTaxRate(5.2, 21);                            // true
 * isValidRecargoForTaxRate(0.5, 5, new Date('2022-12-31'));     // true
 * isValidRecargoForTaxRate(0.5, 5, new Date('2024-12-31'));     // false
 * ```
 */
export function isValidRecargoForTaxRate(
  recargo: number,
  taxRate: number,
  operationDate: Date = new Date(),
): boolean {
  if (!Number.isFinite(recargo) || !Number.isFinite(taxRate)) return false;
  const ms = Date.UTC(
    operationDate.getUTCFullYear(),
    operationDate.getUTCMonth(),
    operationDate.getUTCDate(),
  );
  for (const rule of RULES) {
    if (rule.taxRate !== taxRate || rule.recargo !== recargo) continue;
    if (ms >= rule.from && ms <= rule.to) return true;
  }
  return false;
}

/**
 * String-typed convenience wrapper around {@link isValidRecargoForTaxRate}.
 *
 * @param recargo - `TipoRecargoEquivalencia` value as a string.
 * @param taxRate - `TipoImpositivo` value as a string.
 * @param operationDateIso - Optional ISO date.
 * @returns Same as {@link isValidRecargoForTaxRate}.
 */
export function isValidRecargoString(
  recargo: string,
  taxRate: string,
  operationDateIso?: string,
): boolean {
  const recargoNum = Number.parseFloat(recargo);
  const rateNum = Number.parseFloat(taxRate);
  if (!Number.isFinite(recargoNum) || !Number.isFinite(rateNum)) return false;
  const date = operationDateIso !== undefined ? parseIsoDate(operationDateIso) : undefined;
  return isValidRecargoForTaxRate(recargoNum, rateNum, date);
}
