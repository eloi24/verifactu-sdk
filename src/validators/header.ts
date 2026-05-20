/**
 * Header (`Cabecera`) business validator — §3.1.1.
 *
 * Five rules apply:
 *
 * 1. `ObligadoEmision`: the NIF must be syntactically valid (we delegate to
 *    {@link './nif'} since the actual census check happens at the AEAT).
 * 2. `Representante`: same requirement when present.
 * 3. `FechaFinVeriFactu`: only allowed on VERIFACTU systems, format must be
 *    `31-12-20XX` with the year equal to current or previous AEAT year.
 * 4. `Incidencia`: only allowed on VERIFACTU systems.
 * 5. `RefRequerimiento`: only allowed on non-VERIFACTU systems; mandatory
 *    there; must exist at the AEAT (we cannot check the existence locally —
 *    that becomes a SOAP fault).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.1}
 * @module
 */

import { type DateValidationIssue, validateFechaFinVeriFactu } from './dates.js';
import { isValidAnyNif } from './nif.js';

/** Shape returned by {@link validateHeader}. */
export interface HeaderIssue {
  readonly code: string;
  readonly field: string;
  readonly severity: 'rejection' | 'admissible';
  readonly message: string;
}

/** Header sub-block kept generic enough to validate from English-typed input. */
export interface HeaderInput {
  /** Obligor (taxpayer) NIF. */
  readonly obligadoNif: string;
  /** Representative NIF (optional). */
  readonly representanteNif?: string;
  /** `true` if the submission is voluntary VERIFACTU. */
  readonly voluntary: boolean;
  /** `FechaFinVeriFactu` (only for voluntary submissions). */
  readonly fechaFinVeriFactu?: string;
  /** `Incidencia` flag (only for voluntary submissions). */
  readonly incidencia?: 'S' | 'N';
  /** `RefRequerimiento` value (only for on-request submissions). */
  readonly refRequerimiento?: string;
}

/**
 * Cast {@link DateValidationIssue} to the local issue type.
 *
 * @param issues - Date-validator issues.
 * @returns The same issues typed as {@link HeaderIssue}.
 */
function fromDateIssues(issues: DateValidationIssue[]): HeaderIssue[] {
  return issues.map((issue) => ({ ...issue }));
}

/**
 * Run every business rule on a `Cabecera` block.
 *
 * @param input - Flat header input.
 * @param today - Reference "today" used by date checks.
 * @returns Array of issues — empty when the header is compliant.
 */
export function validateHeader(input: HeaderInput, today: Date = new Date()): HeaderIssue[] {
  const issues: HeaderIssue[] = [];
  if (!isValidAnyNif(input.obligadoNif)) {
    issues.push({
      code: '4116',
      field: 'obligadoEmision.nif',
      severity: 'rejection',
      message: 'ObligadoEmision NIF has invalid format.',
    });
  }
  if (input.representanteNif !== undefined) {
    if (!isValidAnyNif(input.representanteNif)) {
      issues.push({
        code: '4117',
        field: 'representante.nif',
        severity: 'rejection',
        message: 'Representante NIF has invalid format.',
      });
    }
  }
  if (input.voluntary) {
    if (input.fechaFinVeriFactu !== undefined) {
      issues.push(...fromDateIssues(validateFechaFinVeriFactu(input.fechaFinVeriFactu, today)));
    }
    if (input.refRequerimiento !== undefined) {
      issues.push({
        code: '4126',
        field: 'refRequerimiento',
        severity: 'rejection',
        message: 'RefRequerimiento is only allowed on non-VERIFACTU submissions.',
      });
    }
  } else {
    if (input.incidencia !== undefined) {
      issues.push({
        code: '4121',
        field: 'incidencia',
        severity: 'rejection',
        message: 'Incidencia is only allowed on voluntary VERIFACTU submissions.',
      });
    }
    if (input.fechaFinVeriFactu !== undefined) {
      issues.push({
        code: '4127',
        field: 'fechaFinVeriFactu',
        severity: 'rejection',
        message: 'FechaFinVeriFactu is only allowed on voluntary VERIFACTU submissions.',
      });
    }
    if (input.refRequerimiento === undefined || input.refRequerimiento.length === 0) {
      issues.push({
        code: '4125',
        field: 'refRequerimiento',
        severity: 'rejection',
        message: 'RefRequerimiento is mandatory for on-request submissions.',
      });
    }
  }
  return issues;
}
