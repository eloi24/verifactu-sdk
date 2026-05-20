/**
 * `ClaveRegimen` validator — §3.1.3 rule 15.6 and sub-rules 15.6.1 – 15.6.11.
 *
 * Models the cross-field constraints between the operation regime (`ClaveRegimen`),
 * the tax (`Impuesto`), the operation qualification (`CalificacionOperacion`),
 * the invoice type (`TipoFactura`), and several other fields. The lists `L8A`
 * (IVA) and `L8B` (IGIC) determine which raw values are even admissible.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.6}
 * @module
 */

import type {
  ExemptionReason,
  InvoiceType,
  OperationQualification,
  RegimeKey,
  TaxCode,
} from '../types.js';

/** Admissible regime keys for IVA (`Impuesto = '01'`). List L8A. */
const L8A_IVA: ReadonlySet<RegimeKey> = new Set<RegimeKey>([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '14',
  '15',
  '17',
  '18',
  '19',
]);

/** Admissible regime keys for IGIC (`Impuesto = '03'`). List L8B plus `20`/`21`. */
const L8B_IGIC: ReadonlySet<RegimeKey> = new Set<RegimeKey>([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '14',
  '15',
  '17',
  '18',
  '19',
  '20',
  '21',
]);

/** Admissible regime keys for IPSI (`Impuesto = '02'`). */
const IPSI_KEYS: ReadonlySet<RegimeKey> = new Set<RegimeKey>(['01', '08', '11', '18', '19', '20']);

/** Shape returned by {@link validateClaveRegimen}. */
export interface ClaveRegimenIssue {
  /** Closest AEAT error code. */
  readonly code: string;
  /** Affected field path. */
  readonly field: string;
  /** Severity: `'rejection'` or `'admissible'`. */
  readonly severity: 'rejection' | 'admissible';
  /** English description. */
  readonly message: string;
}

/** One breakdown line as expected by {@link validateClaveRegimen}. */
export interface ClaveRegimenLine {
  readonly tax?: TaxCode;
  readonly regimeKey?: RegimeKey;
  readonly operationQualification?: OperationQualification;
  readonly exemptionReason?: ExemptionReason;
  readonly taxRate?: string;
  readonly taxBaseAtCost?: string;
  readonly taxAmount?: string;
  readonly equivalenceSurchargeRate?: string;
  readonly equivalenceSurchargeAmount?: string;
}

/** Top-level invoice fields consulted by the orchestrator. */
export interface ClaveRegimenInvoiceContext {
  readonly invoiceType: InvoiceType;
  readonly operationDateIso?: string;
  readonly issueDateIso: string;
  readonly recipients?: ReadonlyArray<{ nif?: string }>;
}

/**
 * Determine whether `ClaveRegimen` is admissible for the given tax.
 *
 * Mirrors the first three bullets of §15.6: `ClaveRegimen` is only allowed
 * when the tax is IVA / IPSI / IGIC / empty, and the value must belong to the
 * tax-specific list.
 *
 * @param tax - Tax code (`undefined` is treated as IVA).
 * @param regimeKey - The regime key under test.
 * @returns `true` when the regime is admissible.
 */
export function isAdmissibleRegimeForTax(tax: TaxCode | undefined, regimeKey: RegimeKey): boolean {
  if (tax === undefined || tax === '01') return L8A_IVA.has(regimeKey);
  if (tax === '02') return IPSI_KEYS.has(regimeKey);
  if (tax === '03') return L8B_IGIC.has(regimeKey);
  return false;
}

/**
 * Run every `ClaveRegimen` sub-rule (15.6.1 – 15.6.11) against a breakdown line.
 *
 * The function reads from {@link ClaveRegimenInvoiceContext} for invoice-level
 * fields and from the line itself for everything else. Issues are returned
 * with a path prefix so callers can prepend `breakdown.{index}`.
 *
 * @param line - The breakdown line to inspect.
 * @param ctx - Cross-line invoice context.
 * @returns Array of issues (empty when the line is compliant).
 */
export function validateClaveRegimen(
  line: ClaveRegimenLine,
  ctx: ClaveRegimenInvoiceContext,
): ClaveRegimenIssue[] {
  const issues: ClaveRegimenIssue[] = [];
  const tax = line.tax;
  const regime = line.regimeKey;
  if (regime === undefined) {
    if (tax === undefined || tax === '01' || tax === '02' || tax === '03') {
      issues.push({
        code: '1245',
        field: 'regimeKey',
        severity: 'rejection',
        message: 'ClaveRegimen is mandatory when Impuesto is empty/IVA/IPSI/IGIC.',
      });
    }
    return issues;
  }
  if (tax === '05') {
    issues.push({
      code: '1260',
      field: 'regimeKey',
      severity: 'rejection',
      message: 'ClaveRegimen is forbidden when Impuesto is 05.',
    });
    return issues;
  }
  if (!isAdmissibleRegimeForTax(tax, regime)) {
    issues.push({
      code: '1246',
      field: 'regimeKey',
      severity: 'rejection',
      message: `ClaveRegimen ${regime} not allowed for the chosen tax.`,
    });
  }
  const taxIvaIgicOrEmpty = tax === undefined || tax === '01' || tax === '03';
  if (regime === '02' && taxIvaIgicOrEmpty) {
    if (line.exemptionReason === undefined) {
      issues.push({
        code: '1286',
        field: 'regimeKey',
        severity: 'rejection',
        message: 'When ClaveRegimen is 02 only OperacionExenta is allowed.',
      });
    }
  }
  if (regime === '03' && taxIvaIgicOrEmpty) {
    if (line.operationQualification !== undefined && line.operationQualification !== 'S1') {
      issues.push({
        code: '1200',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 03 requires CalificacionOperacion S1 when present.',
      });
    }
  }
  if (regime === '04' && taxIvaIgicOrEmpty) {
    const okQualification = line.operationQualification === 'S2';
    const okExempt = line.exemptionReason !== undefined;
    if (!(okQualification || okExempt)) {
      issues.push({
        code: '1201',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 04 requires CalificacionOperacion S2 or OperacionExenta.',
      });
    }
  }
  if (regime === '06' && taxIvaIgicOrEmpty) {
    if (ctx.invoiceType === 'F2' || ctx.invoiceType === 'F3' || ctx.invoiceType === 'R5') {
      issues.push({
        code: '1202',
        field: 'invoiceType',
        severity: 'rejection',
        message: 'ClaveRegimen 06 forbids TipoFactura F2, F3 or R5.',
      });
    }
    if (line.taxBaseAtCost === undefined) {
      issues.push({
        code: '1202',
        field: 'taxBaseAtCost',
        severity: 'rejection',
        message: 'ClaveRegimen 06 requires BaseImponibleACoste to be set.',
      });
    }
  }
  if (regime === '07' && taxIvaIgicOrEmpty) {
    if (
      line.operationQualification === 'S2' ||
      line.operationQualification === 'N1' ||
      line.operationQualification === 'N2'
    ) {
      issues.push({
        code: '1203',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 07 forbids CalificacionOperacion S2, N1 or N2.',
      });
    }
    if (
      line.exemptionReason === 'E2' ||
      line.exemptionReason === 'E3' ||
      line.exemptionReason === 'E4' ||
      line.exemptionReason === 'E5'
    ) {
      issues.push({
        code: '1203',
        field: 'exemptionReason',
        severity: 'rejection',
        message: 'ClaveRegimen 07 forbids OperacionExenta E2, E3, E4 or E5.',
      });
    }
  }
  if (regime === '08' && taxIvaIgicOrEmpty) {
    if (line.operationQualification !== 'N2') {
      issues.push({
        code: '1252',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 08 requires CalificacionOperacion N2.',
      });
    }
  }
  if (regime === '10' && taxIvaIgicOrEmpty) {
    if (line.operationQualification !== 'N1') {
      issues.push({
        code: '1205',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 10 requires CalificacionOperacion N1.',
      });
    }
    if (ctx.invoiceType !== 'F1') {
      issues.push({
        code: '1205',
        field: 'invoiceType',
        severity: 'rejection',
        message: 'ClaveRegimen 10 requires TipoFactura F1.',
      });
    }
    if (ctx.recipients !== undefined) {
      for (const [index, recipient] of ctx.recipients.entries()) {
        if (recipient.nif === undefined) {
          issues.push({
            code: '1205',
            field: `recipients.${index}.nif`,
            severity: 'rejection',
            message: 'ClaveRegimen 10 requires every recipient to be identified by NIF.',
          });
        }
      }
    }
  }
  if (regime === '11' && (tax === undefined || tax === '01')) {
    const rateValue = line.taxRate !== undefined ? Number.parseFloat(line.taxRate) : Number.NaN;
    if (rateValue !== 21) {
      issues.push({
        code: '1206',
        field: 'taxRate',
        severity: 'rejection',
        message: 'ClaveRegimen 11 requires TipoImpositivo 21.',
      });
    }
  }
  if (regime === '14' && taxIvaIgicOrEmpty) {
    if (ctx.operationDateIso === undefined) {
      issues.push({
        code: '1147',
        field: 'operationDate',
        severity: 'rejection',
        message: 'ClaveRegimen 14 requires FechaOperacion to be informed.',
      });
    } else if (ctx.operationDateIso <= ctx.issueDateIso) {
      issues.push({
        code: '1147',
        field: 'operationDate',
        severity: 'rejection',
        message: 'ClaveRegimen 14 requires FechaOperacion to be after FechaExpedicionFactura.',
      });
    }
    const allowedTypes: ReadonlySet<InvoiceType> = new Set<InvoiceType>([
      'F1',
      'R1',
      'R2',
      'R3',
      'R4',
    ]);
    if (!allowedTypes.has(ctx.invoiceType)) {
      issues.push({
        code: '1148',
        field: 'invoiceType',
        severity: 'rejection',
        message: 'ClaveRegimen 14 requires TipoFactura F1, R1, R2, R3 or R4.',
      });
    }
    if (ctx.recipients !== undefined) {
      for (const [index, recipient] of ctx.recipients.entries()) {
        if (recipient.nif === undefined || !/^[PQSV]/u.test(recipient.nif)) {
          issues.push({
            code: '1149',
            field: `recipients.${index}.nif`,
            severity: 'rejection',
            message: 'ClaveRegimen 14 requires recipients with NIF starting with P, Q, S or V.',
          });
        }
      }
    }
  }
  if (regime === '20' && tax === '03') {
    if (line.operationQualification !== 'N2') {
      issues.push({
        code: '1293',
        field: 'operationQualification',
        severity: 'rejection',
        message: 'ClaveRegimen 20 (IGIC) requires CalificacionOperacion N2.',
      });
    }
  }
  return issues;
}
