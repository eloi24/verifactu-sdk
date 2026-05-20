/**
 * Date-based business validators (`FechaExpedicionFactura`, `FechaOperacion`).
 *
 * Implements rules 1 and 7 of §3.1.3 of the AEAT validations document:
 *
 * - **FechaExpedicionFactura**: must not be later than today; must not be
 *   earlier than 28-10-2024; must not be earlier than today minus 20 years.
 * - **FechaOperacion**: must not be earlier than today minus 20 years; must
 *   not be later than one year from today; may only be later than today when
 *   the regime is `14` / `15`; may only be earlier than the issue date when
 *   the regime is `14` / `15`.
 *
 * All comparisons are performed on UTC calendar dates to avoid timezone drift.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3 rules 1, 7}
 * @module
 */

import type { RegimeKey, TaxCode } from '../types.js';

/** AEAT entry-in-force date for the VERI*FACTU regime (28-10-2024). */
const VERIFACTU_START = Date.UTC(2024, 9, 28);

/**
 * Parse an ISO `YYYY-MM-DD` string into a `Date` at UTC midnight.
 *
 * @param iso - Date in `YYYY-MM-DD` format.
 * @returns A `Date` instance, or `undefined` if parsing fails.
 */
export function parseIsoDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(iso)) return undefined;
  const [yearStr, monthStr, dayStr] = iso.split('-');
  if (yearStr === undefined || monthStr === undefined || dayStr === undefined) return undefined;
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== year) return undefined;
  if (date.getUTCMonth() !== month - 1) return undefined;
  if (date.getUTCDate() !== day) return undefined;
  return date;
}

/**
 * Compare two dates by UTC midnight, ignoring time components.
 *
 * @param a - Left-hand date.
 * @param b - Right-hand date.
 * @returns Negative if `a < b`, zero if equal, positive if `a > b`.
 */
function compareDays(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bDay = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return aDay - bDay;
}

/** Per-rule outcome returned by every date validator. */
export interface DateValidationIssue {
  /** Closest AEAT error code (when applicable). */
  readonly code: string;
  /** Affected field path (`'invoiceId.issueDate'`, `'operationDate'`, …). */
  readonly field: string;
  /** Whether the issue rejects the record or is admissible. */
  readonly severity: 'rejection' | 'admissible';
  /** English description of the violation. */
  readonly message: string;
}

/**
 * Validate an issue date (`FechaExpedicionFactura`).
 *
 * Three constraints are checked: not later than today, not before
 * 28-10-2024 and not earlier than today minus 20 years.
 *
 * @param issueDate - ISO `YYYY-MM-DD` string.
 * @param today - Reference "today" (defaults to current UTC date). Inject in
 *   tests to keep them deterministic.
 * @returns Array of {@link DateValidationIssue} entries (empty when valid).
 * @example
 * ```ts
 * validateIssueDate('2024-10-28'); // []
 * validateIssueDate('2024-10-27'); // 1109
 * ```
 */
export function validateIssueDate(
  issueDate: string,
  today: Date = new Date(),
): DateValidationIssue[] {
  const issues: DateValidationIssue[] = [];
  const parsed = parseIsoDate(issueDate);
  if (parsed === undefined) {
    issues.push({
      code: '1105',
      field: 'invoiceId.issueDate',
      severity: 'rejection',
      message: 'Invalid FechaExpedicionFactura value.',
    });
    return issues;
  }
  if (compareDays(parsed, today) > 0) {
    issues.push({
      code: '1112',
      field: 'invoiceId.issueDate',
      severity: 'rejection',
      message: 'FechaExpedicionFactura is later than today.',
    });
  }
  if (parsed.getTime() < VERIFACTU_START) {
    issues.push({
      code: '1152',
      field: 'invoiceId.issueDate',
      severity: 'rejection',
      message: 'FechaExpedicion cannot be earlier than 28 October 2024.',
    });
  }
  const minDate = new Date(
    Date.UTC(today.getUTCFullYear() - 20, today.getUTCMonth(), today.getUTCDate()),
  );
  if (compareDays(parsed, minDate) < 0) {
    issues.push({
      code: '1133',
      field: 'invoiceId.issueDate',
      severity: 'rejection',
      message: 'FechaExpedicionFactura cannot be earlier than today minus 20 years.',
    });
  }
  return issues;
}

/**
 * Validate an operation date (`FechaOperacion`).
 *
 * Constraints follow §3.1.3 rule 7:
 *
 * - Not earlier than today minus 20 years.
 * - Not later than one calendar year from today, unless the regime key is
 *   `14` or `15` and the tax is IVA / IGIC / empty.
 * - Earlier than the issue date is only permitted when regime key is `14`
 *   or `15` and tax is IVA / IGIC / empty.
 *
 * @param operationDate - ISO date string.
 * @param issueDate - Companion `FechaExpedicionFactura` for cross-check; pass
 *   `undefined` to skip the chronology constraint.
 * @param today - Reference "today" (defaults to current UTC date).
 * @param regimeKey - Operation regime key from the breakdown line.
 * @param tax - Tax code from the breakdown line (`undefined` → IVA).
 * @returns Array of {@link DateValidationIssue} entries (empty when valid).
 */
export function validateOperationDate(
  operationDate: string,
  issueDate: string | undefined,
  today: Date,
  regimeKey?: RegimeKey,
  tax?: TaxCode,
): DateValidationIssue[] {
  const issues: DateValidationIssue[] = [];
  const parsed = parseIsoDate(operationDate);
  if (parsed === undefined) {
    issues.push({
      code: '1145',
      field: 'operationDate',
      severity: 'rejection',
      message: 'Invalid FechaOperacion format.',
    });
    return issues;
  }
  const minDate = new Date(
    Date.UTC(today.getUTCFullYear() - 20, today.getUTCMonth(), today.getUTCDate()),
  );
  if (compareDays(parsed, minDate) < 0) {
    issues.push({
      code: '1134',
      field: 'operationDate',
      severity: 'rejection',
      message: 'FechaOperacion cannot be earlier than today minus 20 years.',
    });
  }
  const maxDate = new Date(
    Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate()),
  );
  const taxIsIvaIgicOrEmpty = tax === undefined || tax === '01' || tax === '03';
  const regimeAllowsFuture = regimeKey === '14' || regimeKey === '15';
  if (compareDays(parsed, today) > 0) {
    if (!(taxIsIvaIgicOrEmpty && regimeAllowsFuture)) {
      issues.push({
        code: '1173',
        field: 'operationDate',
        severity: 'rejection',
        message:
          'FechaOperacion may only be later than today when ClaveRegimen is 14/15 and Impuesto is 01/03 or empty.',
      });
    }
    if (compareDays(parsed, maxDate) > 0) {
      issues.push({
        code: '1125',
        field: 'operationDate',
        severity: 'rejection',
        message: 'FechaOperacion is later than allowed.',
      });
    }
  }
  if (issueDate !== undefined) {
    const issueParsed = parseIsoDate(issueDate);
    if (issueParsed !== undefined && compareDays(issueParsed, parsed) < 0) {
      if (!(taxIsIvaIgicOrEmpty && regimeAllowsFuture)) {
        issues.push({
          code: '1146',
          field: 'invoiceId.issueDate',
          severity: 'rejection',
          message:
            'FechaExpedicion may only be earlier than FechaOperacion when ClaveRegimen is 14/15 and Impuesto is 01/03 or empty.',
        });
      }
    }
  }
  return issues;
}

/**
 * Validate a `FechaFinVeriFactu` field per §3.1.1 rule 3.
 *
 * @param value - Date in AEAT wire format `DD-MM-YYYY`.
 * @param today - Reference "today" (defaults to current UTC date).
 * @returns Array of issues (empty when the field is valid).
 */
export function validateFechaFinVeriFactu(
  value: string,
  today: Date = new Date(),
): DateValidationIssue[] {
  const issues: DateValidationIssue[] = [];
  const match = /^(\d{2})-(\d{2})-(\d{4})$/u.exec(value);
  if (match === null) {
    issues.push({
      code: '4120',
      field: 'fechaFinVeriFactu',
      severity: 'rejection',
      message: 'FechaFinVeriFactu must use the format DD-MM-YYYY.',
    });
    return issues;
  }
  const dayStr = match[1];
  const monthStr = match[2];
  const yearStr = match[3];
  if (dayStr === undefined || monthStr === undefined || yearStr === undefined) {
    return issues;
  }
  if (dayStr !== '31' || monthStr !== '12') {
    issues.push({
      code: '4120',
      field: 'fechaFinVeriFactu',
      severity: 'rejection',
      message: 'FechaFinVeriFactu must be 31-12-YYYY.',
    });
  }
  const year = Number.parseInt(yearStr, 10);
  const todayYear = today.getUTCFullYear();
  if (year !== todayYear && year !== todayYear - 1) {
    issues.push({
      code: '4120',
      field: 'fechaFinVeriFactu',
      severity: 'rejection',
      message: 'FechaFinVeriFactu year must match the current or previous AEAT-system year.',
    });
  }
  return issues;
}
