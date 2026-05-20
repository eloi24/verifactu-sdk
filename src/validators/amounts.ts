/**
 * Monetary-amount validators for `RegistroAlta` records.
 *
 * Covers four AEAT rules from §3.1.3:
 *
 * - **CuotaRepercutida** (15.7) — must match `BaseImponibleOimporteNoSujeto *
 *   TipoImpositivo / 100 ± 10€`, except when `TipoRectificativa = 'I'` or
 *   `TipoFactura` is `'R2'` / `'R3'`.
 * - **CuotaTotal** (16) — must match the sum of `CuotaRepercutida +
 *   CuotaRecargoEquivalencia` lines (±10€), excluding `ClaveRegimen` 03/05/06/08/09.
 * - **ImporteTotal** (17) — must match `Σ (BaseImponibleOimporteNoSujeto +
 *   CuotaRepercutida + CuotaRecargoEquivalencia)` (±10€), with the same regime
 *   exclusions.
 * - **Macrodato** (10) — mandatory `'S'` when `|ImporteTotal| ≥ 100,000,000`.
 * - **Simplified-invoice 3000€** (15.8) — sum of base + CuotaRepercutida ≤
 *   3000€ + 10€ for `TipoFactura='F2'` unless there is an agreement
 *   (`NumRegistroAcuerdoFacturacion` set) or `FacturaSinIdentifDestinatarioArt61d='S'`.
 *
 * Amounts are kept as strings throughout the SDK (the hash spec requires the
 * verbatim text); validators convert internally with `Number.parseFloat`.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3}
 * @module
 */

import type { InvoiceType, RectificationKind, RegimeKey } from '../types.js';

/** Tolerance applied to every amount cross-check (`±10€`). */
export const AMOUNT_TOLERANCE_EUR = 10;

/** Macrodato threshold (`|ImporteTotal| ≥ 100,000,000`). */
export const MACRODATA_THRESHOLD_EUR = 100_000_000;

/** Maximum simplified-invoice total when no agreement applies. */
export const SIMPLIFIED_INVOICE_LIMIT_EUR = 3000;

/** Regime keys for which {@link validateCuotaTotal} / {@link validateImporteTotal} do not apply. */
const REGIMES_SKIPPING_TOTALS: ReadonlySet<RegimeKey> = new Set<RegimeKey>([
  '03',
  '05',
  '06',
  '08',
  '09',
]);

/**
 * Convert a string amount to a finite number.
 *
 * @param value - Amount string (e.g. `'21.00'`).
 * @returns The numeric value, or `NaN` when parsing fails.
 */
export function parseAmount(value: string | undefined): number {
  if (value === undefined) return Number.NaN;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Common shape returned by every amount validator. */
export interface AmountValidationIssue {
  /** Closest AEAT error code. */
  readonly code: string;
  /** Affected field path. */
  readonly field: string;
  /** Whether the issue rejects the record or is admissible. */
  readonly severity: 'rejection' | 'admissible';
  /** English description of the violation. */
  readonly message: string;
}

/** One breakdown line as expected by amount validators. */
export interface AmountBreakdownLine {
  /** `BaseImponibleOimporteNoSujeto` as a string. */
  readonly taxBase: string;
  /** `BaseImponibleACoste` (optional). */
  readonly taxBaseAtCost?: string;
  /** `CuotaRepercutida` (optional). */
  readonly taxAmount?: string;
  /** `CuotaRecargoEquivalencia` (optional). */
  readonly equivalenceSurchargeAmount?: string;
  /** `TipoImpositivo` percentage (optional). */
  readonly taxRate?: string;
  /** Regime key for skip-list logic. */
  readonly regimeKey?: RegimeKey;
}

/**
 * Validate the `ImporteTotal` field against the sum of breakdown lines.
 *
 * For every line whose regime is not in {@link REGIMES_SKIPPING_TOTALS},
 * accumulate `taxBase + taxAmount + equivalenceSurchargeAmount` and compare
 * to the declared total. Differences greater than {@link AMOUNT_TOLERANCE_EUR}
 * raise an admissible warning (AEAT 2005).
 *
 * @param declaredTotal - Declared `ImporteTotal` as a string.
 * @param breakdown - The full breakdown.
 * @returns Issues — empty when valid.
 */
export function validateImporteTotal(
  declaredTotal: string,
  breakdown: ReadonlyArray<AmountBreakdownLine>,
): AmountValidationIssue[] {
  const declared = parseAmount(declaredTotal);
  if (Number.isNaN(declared)) {
    return [
      {
        code: '1210',
        field: 'totalAmount',
        severity: 'rejection',
        message: 'Invalid ImporteTotal value.',
      },
    ];
  }
  let sum = 0;
  let allSkipped = true;
  for (const line of breakdown) {
    if (line.regimeKey !== undefined && REGIMES_SKIPPING_TOTALS.has(line.regimeKey)) continue;
    allSkipped = false;
    sum += parseAmount(line.taxBase) || 0;
    sum += parseAmount(line.taxAmount) || 0;
    sum += parseAmount(line.equivalenceSurchargeAmount) || 0;
  }
  if (allSkipped) return [];
  if (Math.abs(sum - declared) > AMOUNT_TOLERANCE_EUR) {
    return [
      {
        code: '2005',
        field: 'totalAmount',
        severity: 'admissible',
        message: `ImporteTotal differs from sum of breakdown lines by more than ${AMOUNT_TOLERANCE_EUR}€.`,
      },
    ];
  }
  return [];
}

/**
 * Validate the `CuotaTotal` field against the breakdown.
 *
 * Compares `CuotaTotal` to `Σ (taxAmount + equivalenceSurchargeAmount)` for
 * every line whose regime is not skipped. Differences larger than
 * {@link AMOUNT_TOLERANCE_EUR} raise an admissible warning (AEAT 2006).
 *
 * @param declaredCuotaTotal - Declared `CuotaTotal` as a string.
 * @param breakdown - Full breakdown.
 * @returns Issues — empty when valid.
 */
export function validateCuotaTotal(
  declaredCuotaTotal: string,
  breakdown: ReadonlyArray<AmountBreakdownLine>,
): AmountValidationIssue[] {
  const declared = parseAmount(declaredCuotaTotal);
  if (Number.isNaN(declared)) {
    return [
      {
        code: '1216',
        field: 'totalTaxAmount',
        severity: 'rejection',
        message: 'Invalid CuotaTotal value.',
      },
    ];
  }
  let sum = 0;
  let allSkipped = true;
  for (const line of breakdown) {
    if (line.regimeKey !== undefined && REGIMES_SKIPPING_TOTALS.has(line.regimeKey)) continue;
    allSkipped = false;
    sum += parseAmount(line.taxAmount) || 0;
    sum += parseAmount(line.equivalenceSurchargeAmount) || 0;
  }
  if (allSkipped) return [];
  if (Math.abs(sum - declared) > AMOUNT_TOLERANCE_EUR) {
    return [
      {
        code: '2006',
        field: 'totalTaxAmount',
        severity: 'admissible',
        message: `CuotaTotal differs from sum of breakdown lines by more than ${AMOUNT_TOLERANCE_EUR}€.`,
      },
    ];
  }
  return [];
}

/**
 * Validate that `Macrodato` is set when the absolute total reaches the
 * threshold defined by §3.1.3 rule 10 (`|ImporteTotal| ≥ 100,000,000`).
 *
 * @param totalAmount - `ImporteTotal` string.
 * @param macroData - Declared `Macrodato` flag (`'S'` / `'N'` / `undefined`).
 * @returns Issues — empty when consistent.
 */
export function validateMacrodato(
  totalAmount: string,
  macroData: 'S' | 'N' | undefined,
): AmountValidationIssue[] {
  const total = parseAmount(totalAmount);
  if (Number.isNaN(total)) return [];
  if (Math.abs(total) >= MACRODATA_THRESHOLD_EUR && macroData !== 'S') {
    return [
      {
        code: '1139',
        field: 'macroData',
        severity: 'rejection',
        message: `Macrodato must be 'S' when |ImporteTotal| ≥ ${MACRODATA_THRESHOLD_EUR}.`,
      },
    ];
  }
  return [];
}

/**
 * Inputs accepted by {@link validateCuotaRepercutida}.
 */
export interface CuotaRepercutidaInput {
  /** Breakdown lines indexed for path reporting. */
  readonly breakdown: ReadonlyArray<AmountBreakdownLine>;
  /** Top-level rectification kind. */
  readonly rectificationKind?: RectificationKind;
  /** Top-level invoice type. */
  readonly invoiceType: InvoiceType;
}

/**
 * Validate the `CuotaRepercutida = base × rate / 100` invariant per line.
 *
 * The check is skipped for the two cases listed in §3.1.3 rule 15.7:
 *
 * - `TipoRectificativa === 'I'` (incremental rectification).
 * - `TipoFactura` is `'R2'` or `'R3'`.
 *
 * The sign of `CuotaRepercutida` and the chosen base (cost-based or net) must
 * also match (AEAT 1140 / 1143).
 *
 * @param input - Breakdown + top-level invoice type / rectification kind.
 * @returns One issue per line that violates the invariant.
 */
export function validateCuotaRepercutida(input: CuotaRepercutidaInput): AmountValidationIssue[] {
  const { breakdown, rectificationKind, invoiceType } = input;
  if (rectificationKind === 'I') return [];
  if (invoiceType === 'R2' || invoiceType === 'R3') return [];
  const issues: AmountValidationIssue[] = [];
  for (const [index, line] of breakdown.entries()) {
    if (line.taxAmount === undefined || line.taxRate === undefined) continue;
    const cuota = parseAmount(line.taxAmount);
    const rate = parseAmount(line.taxRate);
    if (Number.isNaN(cuota) || Number.isNaN(rate)) continue;
    const base =
      line.taxBaseAtCost !== undefined
        ? parseAmount(line.taxBaseAtCost)
        : parseAmount(line.taxBase);
    if (Number.isNaN(base)) continue;
    const expected = (base * rate) / 100;
    if (Math.abs(cuota - expected) > AMOUNT_TOLERANCE_EUR) {
      issues.push({
        code: line.taxBaseAtCost !== undefined ? '1144' : '1142',
        field: `breakdown.${index}.taxAmount`,
        severity: 'rejection',
        message: 'CuotaRepercutida does not match BaseImponible × TipoImpositivo / 100 (±10€).',
      });
    }
    if (base !== 0 && cuota !== 0 && Math.sign(base) !== Math.sign(cuota)) {
      issues.push({
        code: line.taxBaseAtCost !== undefined ? '1140' : '1143',
        field: `breakdown.${index}.taxAmount`,
        severity: 'rejection',
        message: 'CuotaRepercutida and base must have the same sign.',
      });
    }
  }
  return issues;
}

/** Inputs accepted by {@link validateFacturaSimplificada3000}. */
export interface SimplifiedInvoiceInput {
  /** Top-level invoice type. */
  readonly invoiceType: InvoiceType;
  /** `NumRegistroAcuerdoFacturacion` (optional). */
  readonly agreementNumber?: string;
  /** `FacturaSinIdentifDestinatarioArt61d` flag. */
  readonly withoutRecipient?: 'S' | 'N';
  /** Full breakdown. */
  readonly breakdown: ReadonlyArray<AmountBreakdownLine>;
}

/**
 * Validate that simplified invoices (`TipoFactura = 'F2'`) do not exceed the
 * 3000€ ceiling, per §3.1.3 rule 15.8.
 *
 * The check is skipped when {@link SimplifiedInvoiceInput.agreementNumber} is
 * set or when {@link SimplifiedInvoiceInput.withoutRecipient} is `'S'`.
 *
 * @param input - Top-level invoice metadata.
 * @returns Issues — empty when the invoice is compliant.
 */
export function validateFacturaSimplificada3000(
  input: SimplifiedInvoiceInput,
): AmountValidationIssue[] {
  if (input.invoiceType !== 'F2') return [];
  if (input.agreementNumber !== undefined && input.agreementNumber.length > 0) return [];
  if (input.withoutRecipient === 'S') return [];
  let sum = 0;
  for (const line of input.breakdown) {
    sum += parseAmount(line.taxBase) || 0;
    sum += parseAmount(line.taxAmount) || 0;
  }
  if (sum > SIMPLIFIED_INVOICE_LIMIT_EUR + AMOUNT_TOLERANCE_EUR) {
    return [
      {
        code: '1150',
        field: 'totalAmount',
        severity: 'rejection',
        message: `Simplified invoice total exceeds the ${SIMPLIFIED_INVOICE_LIMIT_EUR}€ limit.`,
      },
    ];
  }
  return [];
}
