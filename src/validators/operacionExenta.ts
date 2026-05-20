/**
 * `OperacionExenta` validator — §3.1.3 rule 15.5 and sub-rule 15.5.1.
 *
 * The base list `L10` exposes the values `E1`–`E6`; IGIC (`Impuesto = '03'`)
 * additionally accepts `E7` / `E8`. Cross-rules forbid certain combinations
 * such as `E2` / `E3` with `ClaveRegimen = '01'`, and require recipients to
 * be identified through `IDOtro` when `OperacionExenta = 'E5'` (IVA).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.5}
 * @module
 */

import type { ExemptionReason, RegimeKey, TaxCode } from '../types.js';

/** Base list L10 (`E1`–`E6`). */
const L10_BASE: ReadonlySet<ExemptionReason> = new Set(['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);

/** IGIC adds `E7` and `E8` to the base list. */
const L10_IGIC: ReadonlySet<ExemptionReason> = new Set([
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E6',
  'E7',
  'E8',
]);

/** Shape returned by {@link validateOperacionExenta}. */
export interface OperacionExentaIssue {
  /** Closest AEAT error code. */
  readonly code: string;
  /** Affected field path. */
  readonly field: string;
  /** Severity. */
  readonly severity: 'rejection' | 'admissible';
  /** English description. */
  readonly message: string;
}

/** Line-level fields consulted by the validator. */
export interface OperacionExentaLine {
  readonly tax?: TaxCode;
  readonly regimeKey?: RegimeKey;
  readonly exemptionReason?: ExemptionReason;
  readonly taxRate?: string;
  readonly taxAmount?: string;
  readonly equivalenceSurchargeRate?: string;
  readonly equivalenceSurchargeAmount?: string;
}

/** Cross-line context passed by the orchestrator. */
export interface OperacionExentaContext {
  /**
   * Whether *every* recipient is identified through `IDOtro` (no Spanish NIF).
   * `undefined` means the orchestrator skipped the check (e.g. F2 invoices).
   */
  readonly allRecipientsViaIDOtro?: boolean;
}

/**
 * Run every `OperacionExenta` rule against a breakdown line.
 *
 * @param line - The breakdown line under test.
 * @param ctx - Cross-line context.
 * @returns Issues — empty when the line is compliant.
 */
export function validateOperacionExenta(
  line: OperacionExentaLine,
  ctx: OperacionExentaContext = {},
): OperacionExentaIssue[] {
  const issues: OperacionExentaIssue[] = [];
  const exemption = line.exemptionReason;
  if (exemption === undefined) return issues;
  const tax = line.tax;
  const list = tax === '03' ? L10_IGIC : L10_BASE;
  if (!list.has(exemption)) {
    issues.push({
      code: '1196',
      field: 'exemptionReason',
      severity: 'rejection',
      message: `OperacionExenta ${exemption} not in the allowed list.`,
    });
  }
  if (
    (tax === undefined || tax === '01' || tax === '03') &&
    line.regimeKey === '01' &&
    (exemption === 'E2' || exemption === 'E3')
  ) {
    issues.push({
      code: '1199',
      field: 'exemptionReason',
      severity: 'rejection',
      message: 'OperacionExenta E2 and E3 are forbidden when ClaveRegimen is 01.',
    });
  }
  if (
    line.taxRate !== undefined ||
    line.taxAmount !== undefined ||
    line.equivalenceSurchargeRate !== undefined ||
    line.equivalenceSurchargeAmount !== undefined
  ) {
    issues.push({
      code: '1238',
      field: 'exemptionReason',
      severity: 'rejection',
      message: 'When OperacionExenta is set, tax-rate-related fields must be empty.',
    });
  }
  if ((tax === undefined || tax === '01') && exemption === 'E5') {
    if (ctx.allRecipientsViaIDOtro === false) {
      issues.push({
        code: '1289',
        field: 'exemptionReason',
        severity: 'rejection',
        message:
          'When OperacionExenta is E5 (IVA), every recipient must be identified through IDOtro.',
      });
    }
  }
  return issues;
}
