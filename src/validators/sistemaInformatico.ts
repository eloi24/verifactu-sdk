/**
 * `SistemaInformatico` business validator — §3.1.5.
 *
 * The XSD already enforces the structural shape; this module covers the
 * business rules that depend on the *values* of the identifier and the
 * `IDType` selector:
 *
 * - NIF XOR IDOtro must be present.
 * - `IDType = 07` (No Censado) is forbidden.
 * - When `CodigoPais = 'ES'`, `IDType` must be `03` (Passport).
 * - `IdSistemaInformatico` must be 2 characters from `[A-Z0-9]` (no `Ñ`).
 * - `NombreSistemaInformatico`, `TipoUsoPosibleSoloVerifactu` and
 *   `TipoUsoPosibleMultiOT` are mandatory.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.5}
 * @module
 */

import { isValidEuVatNumber } from './nifIva.js';

/** Shape returned by {@link validateSistemaInformatico}. */
export interface SistemaInformaticoIssue {
  readonly code: string;
  readonly field: string;
  readonly severity: 'rejection' | 'admissible';
  readonly message: string;
}

/** Input shape consumed by {@link validateSistemaInformatico}. */
export interface SistemaInformaticoInput {
  /** Spanish NIF of the producer (mutually exclusive with {@link alternateId}). */
  readonly nif?: string;
  /** Foreign/alternate identifier (mutually exclusive with {@link nif}). */
  readonly alternateId?: {
    readonly countryCode?: string;
    readonly idType: '02' | '03' | '04' | '05' | '06' | '07';
    readonly id: string;
  };
  /** Two-character producer code. */
  readonly systemId: string;
  /** Commercial name. */
  readonly systemName: string;
  /** Use-only-VERIFACTU flag. */
  readonly onlyVerifactu?: 'S' | 'N';
  /** Multi-OT capability flag. */
  readonly multipleTaxpayer?: 'S' | 'N';
  /** Reference operation date used by NIF-IVA Brexit transition. */
  readonly operationDate?: Date;
}

/**
 * Run every §3.1.5 business rule on a producer-software descriptor.
 *
 * @param input - Flat producer-software descriptor.
 * @returns Issues — empty when compliant.
 */
export function validateSistemaInformatico(
  input: SistemaInformaticoInput,
): SistemaInformaticoIssue[] {
  const issues: SistemaInformaticoIssue[] = [];
  const hasNif = input.nif !== undefined && input.nif.length > 0;
  const hasIdOtro = input.alternateId !== undefined;
  if (hasNif === hasIdOtro) {
    issues.push({
      code: '1223',
      field: 'billingSystem',
      severity: 'rejection',
      message: 'SistemaInformatico must have exactly one of NIF or IDOtro.',
    });
  }
  if (hasIdOtro && input.alternateId !== undefined) {
    if (input.alternateId.idType === '07') {
      issues.push({
        code: '1162',
        field: 'billingSystem.alternateId.idType',
        severity: 'rejection',
        message: 'IDType 07 (No Censado) is not allowed for the producer.',
      });
    }
    if (input.alternateId.countryCode === 'ES' && input.alternateId.idType !== '03') {
      issues.push({
        code: '1232',
        field: 'billingSystem.alternateId.idType',
        severity: 'rejection',
        message: 'When CodigoPais is ES the IDType must be 03 (Passport).',
      });
    }
    if (input.alternateId.idType === '02') {
      const country = input.alternateId.countryCode ?? input.alternateId.id.slice(0, 2);
      const identifier = input.alternateId.id.startsWith(country)
        ? input.alternateId.id.slice(country.length)
        : input.alternateId.id;
      if (!isValidEuVatNumber(country, identifier, input.operationDate)) {
        issues.push({
          code: '1103',
          field: 'billingSystem.alternateId.id',
          severity: 'rejection',
          message: 'Producer NIF-IVA does not match the expected EU structure.',
        });
      }
    }
  }
  if (!/^[A-Z0-9]{2}$/u.test(input.systemId)) {
    issues.push({
      code: '1177',
      field: 'billingSystem.systemId',
      severity: 'rejection',
      message: 'IdSistemaInformatico must be 2 uppercase A-Z or 0-9 characters.',
    });
  }
  if (input.systemName === undefined || input.systemName.trim().length === 0) {
    issues.push({
      code: '1220',
      field: 'billingSystem.systemName',
      severity: 'rejection',
      message: 'NombreSistemaInformatico is mandatory.',
    });
  }
  if (input.onlyVerifactu !== 'S' && input.onlyVerifactu !== 'N') {
    issues.push({
      code: '1212',
      field: 'billingSystem.onlyVerifactu',
      severity: 'rejection',
      message: 'TipoUsoPosibleSoloVerifactu is mandatory and must be S or N.',
    });
  }
  if (input.multipleTaxpayer !== 'S' && input.multipleTaxpayer !== 'N') {
    issues.push({
      code: '1213',
      field: 'billingSystem.multipleTaxpayer',
      severity: 'rejection',
      message: 'TipoUsoPosibleMultiOT is mandatory and must be S or N.',
    });
  }
  return issues;
}
