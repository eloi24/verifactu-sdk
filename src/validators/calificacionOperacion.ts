/**
 * `CalificacionOperacion` validator — §3.1.3 rule 15.4.
 *
 * Enforces the four cases of the qualification field:
 *
 * - `S2` requires `TipoFactura` ∈ {F1, F3, R1–R4} and zero TipoImpositivo /
 *   CuotaRepercutida.
 * - `N1` / `N2` for IVA forbid every tax-rate-related field.
 * - At least one of `CalificacionOperacion` or `OperacionExenta` must be set
 *   (already enforced by the schema via `<choice>`).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.4}
 * @module
 */

import type { InvoiceType, OperationQualification, TaxCode } from '../types.js';

/** Shape returned by {@link validateCalificacionOperacion}. */
export interface CalificacionOperacionIssue {
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
export interface CalificacionOperacionLine {
  readonly tax?: TaxCode;
  readonly operationQualification?: OperationQualification;
  readonly taxRate?: string;
  readonly taxAmount?: string;
  readonly equivalenceSurchargeRate?: string;
  readonly equivalenceSurchargeAmount?: string;
}

/** Invoice-level context. */
export interface CalificacionOperacionContext {
  readonly invoiceType: InvoiceType;
}

/**
 * Allowed invoice types when `CalificacionOperacion = 'S2'`.
 */
const S2_INVOICE_TYPES: ReadonlySet<InvoiceType> = new Set<InvoiceType>([
  'F1',
  'F3',
  'R1',
  'R2',
  'R3',
  'R4',
]);

/**
 * Run every rule of §15.4 against a breakdown line.
 *
 * @param line - The breakdown line under test.
 * @param ctx - Invoice-level context.
 * @returns Issues — empty when the line is compliant.
 */
export function validateCalificacionOperacion(
  line: CalificacionOperacionLine,
  ctx: CalificacionOperacionContext,
): CalificacionOperacionIssue[] {
  const issues: CalificacionOperacionIssue[] = [];
  const qualification = line.operationQualification;
  if (qualification === undefined) return issues;
  if (qualification === 'S2') {
    if (!S2_INVOICE_TYPES.has(ctx.invoiceType)) {
      issues.push({
        code: '1197',
        field: 'invoiceType',
        severity: 'rejection',
        message: 'CalificacionOperacion S2 requires TipoFactura F1, F3, R1, R2, R3 or R4.',
      });
    }
    const rateValue = line.taxRate !== undefined ? Number.parseFloat(line.taxRate) : Number.NaN;
    const amountValue =
      line.taxAmount !== undefined ? Number.parseFloat(line.taxAmount) : Number.NaN;
    if (line.taxRate === undefined || rateValue !== 0) {
      issues.push({
        code: '1198',
        field: 'taxRate',
        severity: 'rejection',
        message: 'CalificacionOperacion S2 requires TipoImpositivo = 0.',
      });
    }
    if (line.taxAmount === undefined || amountValue !== 0) {
      issues.push({
        code: '1198',
        field: 'taxAmount',
        severity: 'rejection',
        message: 'CalificacionOperacion S2 requires CuotaRepercutida = 0.',
      });
    }
  }
  if (
    (qualification === 'N1' || qualification === 'N2') &&
    (line.tax === undefined || line.tax === '01')
  ) {
    if (
      line.taxRate !== undefined ||
      line.taxAmount !== undefined ||
      line.equivalenceSurchargeRate !== undefined ||
      line.equivalenceSurchargeAmount !== undefined
    ) {
      issues.push({
        code: '1237',
        field: 'operationQualification',
        severity: 'rejection',
        message:
          'CalificacionOperacion N1/N2 for IVA forbids TipoImpositivo, CuotaRepercutida, TipoRecargoEquivalencia and CuotaRecargoEquivalencia.',
      });
    }
  }
  if (qualification !== 'S1') {
    const amountValue =
      line.taxAmount !== undefined ? Number.parseFloat(line.taxAmount) : Number.NaN;
    if (
      line.taxAmount !== undefined &&
      Number.isFinite(amountValue) &&
      amountValue !== 0 &&
      qualification !== 'S2'
    ) {
      issues.push({
        code: '1207',
        field: 'taxAmount',
        severity: 'rejection',
        message: 'CuotaRepercutida can only be non-zero when CalificacionOperacion is S1.',
      });
    }
  }
  return issues;
}
