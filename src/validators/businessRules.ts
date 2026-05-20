/**
 * Orchestrator for the §3.1.3 (RegistroAlta) and §3.1.4 (RegistroAnulacion)
 * business validators.
 *
 * Walks every record field, dispatches to the focused per-field validators,
 * and returns a flat list of {@link ValidationResult} entries. Each entry maps
 * the violation to the closest AEAT error code from `ERROR_CATALOG` and
 * declares its severity (`'rejection'` rejects the record; `'admissible'`
 * accepts it but must be subsanado).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3, §3.1.4}
 * @module
 */

import type { CancelInvoiceInput, Invoice } from '../types.js';
import {
  type AmountBreakdownLine,
  validateCuotaRepercutida,
  validateCuotaTotal,
  validateFacturaSimplificada3000,
  validateImporteTotal,
  validateMacrodato,
} from './amounts.js';
import {
  type CalificacionOperacionLine,
  validateCalificacionOperacion,
} from './calificacionOperacion.js';
import { type ClaveRegimenLine, validateClaveRegimen } from './claveRegimen.js';
import { validateIssueDate, validateOperationDate } from './dates.js';
import { isValidAnyNif } from './nif.js';
import { isValidEuVatNumber } from './nifIva.js';
import { isValidNumSerieFactura } from './numSerieFactura.js';
import { type OperacionExentaLine, validateOperacionExenta } from './operacionExenta.js';
import { isValidRecargoString } from './recargoEquivalencia.js';
import { validateSistemaInformatico } from './sistemaInformatico.js';
import { isValidTipoImpositivo } from './taxRate.js';

/** One business-rule violation. */
export interface ValidationResult {
  /** AEAT error code from `ERROR_CATALOG` (closest match when no exact one). */
  readonly code: string;
  /** Dotted path of the offending field. */
  readonly field: string;
  /** `'rejection'` rejects the record; `'admissible'` accepts with warning. */
  readonly severity: 'rejection' | 'admissible';
  /** English description of the violation. */
  readonly message: string;
}

/** Optional inputs accepted by both orchestrators. */
export interface ValidationOptions {
  /** Reference "today" used by date checks (defaults to current UTC date). */
  readonly today?: Date;
}

/**
 * Validate a full {@link Invoice} (`RegistroAlta`) against §3.1.3 rules 1–23.
 *
 * @param invoice - Public English-typed invoice payload.
 * @param options - Optional override of the reference date.
 * @returns A flat list of every business-rule violation found. The caller can
 *   inspect `severity` to differentiate rejection from admissible.
 * @example
 * ```ts
 * const issues = validateInvoiceForRegister(invoice);
 * if (issues.some((i) => i.severity === 'rejection')) {
 *   throw new BusinessValidationError('Invoice rejected', { code: issues[0].code });
 * }
 * ```
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3}
 */
export function validateInvoiceForRegister(
  invoice: Invoice,
  options: ValidationOptions = {},
): ValidationResult[] {
  const today = options.today ?? new Date();
  const issues: ValidationResult[] = [];

  // §3.1.3 rule 1: IDEmisorFactura, FechaExpedicionFactura, NumSerieFactura.
  if (!isValidAnyNif(invoice.invoiceId.issuerNif)) {
    issues.push({
      code: '1109',
      field: 'invoiceId.issuerNif',
      severity: 'rejection',
      message: 'IDEmisorFactura NIF has an invalid format.',
    });
  }
  if (!isValidNumSerieFactura(invoice.invoiceId.seriesNumber)) {
    issues.push({
      code: '1130',
      field: 'invoiceId.seriesNumber',
      severity: 'rejection',
      message: 'NumSerieFactura contains forbidden characters.',
    });
  }
  issues.push(...validateIssueDate(invoice.invoiceId.issueDate, today));

  // §3.1.3 rule 2: RechazoPrevio / Subsanacion.
  if (invoice.priorRejection === 'X' && invoice.correction !== 'S') {
    issues.push({
      code: '1153',
      field: 'priorRejection',
      severity: 'rejection',
      message: 'RechazoPrevio X is only allowed when Subsanacion is S.',
    });
  }
  if (invoice.priorRejection === 'S' && invoice.correction !== 'S') {
    issues.push({
      code: '1161',
      field: 'priorRejection',
      severity: 'rejection',
      message: 'RechazoPrevio S is forbidden when Subsanacion is missing or N.',
    });
  }

  // §3.1.3 rule 3: TipoRectificativa coherence with TipoFactura.
  const isRectifying = /^R/u.test(invoice.invoiceType);
  if (isRectifying && invoice.rectificationKind === undefined) {
    issues.push({
      code: '1114',
      field: 'rectificationKind',
      severity: 'rejection',
      message: 'TipoRectificativa is mandatory for rectifying invoices.',
    });
  }
  if (!isRectifying && invoice.rectificationKind !== undefined) {
    issues.push({
      code: '1115',
      field: 'rectificationKind',
      severity: 'rejection',
      message: 'TipoRectificativa must be empty when invoice is not rectifying.',
    });
  }

  // §3.1.3 rule 4: FacturasRectificadas only for rectifying invoices.
  if (!isRectifying && invoice.rectifiedInvoices !== undefined) {
    issues.push({
      code: '1117',
      field: 'rectifiedInvoices',
      severity: 'rejection',
      message: 'FacturasRectificadas is forbidden when invoice is not rectifying.',
    });
  }

  // §3.1.3 rule 5: FacturasSustituidas only when TipoFactura is F3.
  if (invoice.substitutedInvoices !== undefined && invoice.invoiceType !== 'F3') {
    issues.push({
      code: '1116',
      field: 'substitutedInvoices',
      severity: 'rejection',
      message: 'FacturasSustituidas is only allowed when TipoFactura is F3.',
    });
  }

  // §3.1.3 rule 6: ImporteRectificacion only when TipoRectificativa is S.
  if (invoice.rectificationKind === 'S' && invoice.rectificationBreakdown === undefined) {
    issues.push({
      code: '1118',
      field: 'rectificationBreakdown',
      severity: 'rejection',
      message: 'ImporteRectificacion is mandatory when TipoRectificativa is S.',
    });
  }
  if (invoice.rectificationKind !== 'S' && invoice.rectificationBreakdown !== undefined) {
    issues.push({
      code: '1119',
      field: 'rectificationBreakdown',
      severity: 'rejection',
      message: 'ImporteRectificacion is forbidden when TipoRectificativa is not S.',
    });
  }

  // §3.1.3 rule 7: FechaOperacion.
  if (invoice.operationDate !== undefined) {
    const firstLine = invoice.breakdown[0];
    issues.push(
      ...validateOperationDate(
        invoice.operationDate,
        invoice.invoiceId.issueDate,
        today,
        firstLine?.regimeKey,
        firstLine?.tax,
      ),
    );
  }

  // §3.1.3 rule 8: FacturaSimplificadaArt7273.
  if (invoice.simplifiedArt7273 === 'S') {
    const allowed: ReadonlySet<string> = new Set(['F1', 'F3', 'R1', 'R2', 'R3', 'R4']);
    if (!allowed.has(invoice.invoiceType)) {
      issues.push({
        code: '1183',
        field: 'simplifiedArt7273',
        severity: 'rejection',
        message:
          'FacturaSimplificadaArt7273 can only be S when TipoFactura is F1, F3, R1, R2, R3 or R4.',
      });
    }
  }

  // §3.1.3 rule 9: FacturaSinIdentifDestinatarioArt61d.
  if (invoice.withoutRecipientArt61d === 'S') {
    if (invoice.invoiceType !== 'F2' && invoice.invoiceType !== 'R5') {
      issues.push({
        code: '1185',
        field: 'withoutRecipientArt61d',
        severity: 'rejection',
        message: 'FacturaSinIdentifDestinatarioArt61d can only be S when TipoFactura is F2 or R5.',
      });
    }
  }

  // §3.1.3 rule 10: Macrodato.
  issues.push(...validateMacrodato(invoice.totalAmount, invoice.macroData));

  // §3.1.3 rule 11: EmitidaPorTerceroODestinatario.
  if (invoice.issuedBy === 'T' && invoice.thirdParty === undefined) {
    issues.push({
      code: '1186',
      field: 'thirdParty',
      severity: 'rejection',
      message: 'Tercero block is mandatory when EmitidaPorTerceroODestinatario is T.',
    });
  }
  if (
    invoice.issuedBy === 'D' &&
    (invoice.recipients === undefined || invoice.recipients.length === 0)
  ) {
    issues.push({
      code: '1158',
      field: 'recipients',
      severity: 'rejection',
      message: 'Destinatarios block is mandatory when EmitidaPorTerceroODestinatario is D.',
    });
  }

  // §3.1.3 rule 12: Tercero.
  if (invoice.thirdParty !== undefined) {
    if (invoice.issuedBy !== 'T') {
      issues.push({
        code: '1187',
        field: 'thirdParty',
        severity: 'rejection',
        message: 'Tercero block is only allowed when EmitidaPorTerceroODestinatario is T.',
      });
    }
    if (invoice.thirdParty.nif !== undefined) {
      if (invoice.thirdParty.nif === invoice.invoiceId.issuerNif) {
        issues.push({
          code: '1188',
          field: 'thirdParty.nif',
          severity: 'rejection',
          message: 'Tercero NIF must differ from ObligadoEmision NIF.',
        });
      }
      if (!isValidAnyNif(invoice.thirdParty.nif)) {
        issues.push({
          code: '1123',
          field: 'thirdParty.nif',
          severity: 'rejection',
          message: 'Tercero NIF has invalid format.',
        });
      }
    }
    if (invoice.thirdParty.alternateId !== undefined) {
      if (invoice.thirdParty.alternateId.idType === '07') {
        issues.push({
          code: '1211',
          field: 'thirdParty.alternateId.idType',
          severity: 'rejection',
          message: 'Tercero cannot be identified with IDType No Censado (07).',
        });
      }
      if (
        invoice.thirdParty.alternateId.countryCode === 'ES' &&
        invoice.thirdParty.alternateId.idType !== '03'
      ) {
        issues.push({
          code: '1232',
          field: 'thirdParty.alternateId.idType',
          severity: 'rejection',
          message: 'When CodigoPais is ES the Tercero IDType must be 03 (Passport).',
        });
      }
      if (invoice.thirdParty.alternateId.idType === '02') {
        const id = invoice.thirdParty.alternateId.id;
        const country =
          invoice.thirdParty.alternateId.countryCode !== undefined
            ? invoice.thirdParty.alternateId.countryCode
            : id.slice(0, 2);
        const idValue = id.startsWith(country) ? id.slice(country.length) : id;
        if (!isValidEuVatNumber(country, idValue, today)) {
          issues.push({
            code: '1103',
            field: 'thirdParty.alternateId.id',
            severity: 'rejection',
            message: 'Tercero NIF-IVA does not match the expected EU structure.',
          });
        }
      }
    }
  }

  // §3.1.3 rule 13: Destinatarios.
  const recipientRequired: ReadonlySet<string> = new Set(['F1', 'F3', 'R1', 'R2', 'R3', 'R4']);
  if (recipientRequired.has(invoice.invoiceType)) {
    if (invoice.recipients === undefined || invoice.recipients.length === 0) {
      issues.push({
        code: '1189',
        field: 'recipients',
        severity: 'rejection',
        message: 'Destinatarios block is mandatory for the chosen TipoFactura.',
      });
    }
  } else if (invoice.invoiceType === 'F2' || invoice.invoiceType === 'R5') {
    if (invoice.recipients !== undefined && invoice.recipients.length > 0) {
      issues.push({
        code: '1190',
        field: 'recipients',
        severity: 'rejection',
        message: 'Destinatarios block is forbidden for F2/R5 invoices.',
      });
    }
  }
  if (invoice.recipients !== undefined) {
    for (const [index, recipient] of invoice.recipients.entries()) {
      if (recipient.nif !== undefined) {
        if (recipient.nif === invoice.invoiceId.issuerNif) {
          // §3.1.3 rule 13 allows self-invoicing per v1.0.3 — skip.
        }
        if (!isValidAnyNif(recipient.nif)) {
          issues.push({
            code: '1123',
            field: `recipients.${index}.nif`,
            severity: 'rejection',
            message: 'Recipient NIF has invalid format.',
          });
        }
      }
      if (recipient.alternateId !== undefined) {
        if (recipient.alternateId.idType === '07' && recipient.alternateId.countryCode !== 'ES') {
          issues.push({
            code: '1126',
            field: `recipients.${index}.alternateId.countryCode`,
            severity: 'rejection',
            message: 'When IDType is No Censado (07) CodigoPais must be ES.',
          });
        }
        if (
          recipient.alternateId.countryCode === 'ES' &&
          recipient.alternateId.idType !== '03' &&
          recipient.alternateId.idType !== '07'
        ) {
          issues.push({
            code: '1234',
            field: `recipients.${index}.alternateId.idType`,
            severity: 'rejection',
            message: 'When CodigoPais is ES the IDType must be 03 or 07.',
          });
        }
        if (recipient.alternateId.idType === '02') {
          if (!recipientRequired.has(invoice.invoiceType)) {
            issues.push({
              code: '1156',
              field: `recipients.${index}.alternateId.idType`,
              severity: 'rejection',
              message: 'NIF-IVA recipients are only allowed for F1/F3/R1/R2/R3/R4.',
            });
          }
          const id = recipient.alternateId.id;
          const country =
            recipient.alternateId.countryCode !== undefined
              ? recipient.alternateId.countryCode
              : id.slice(0, 2);
          const idValue = id.startsWith(country) ? id.slice(country.length) : id;
          if (!isValidEuVatNumber(country, idValue, today)) {
            issues.push({
              code: '1103',
              field: `recipients.${index}.alternateId.id`,
              severity: 'rejection',
              message: 'Recipient NIF-IVA does not match the expected EU structure.',
            });
          }
        }
      }
    }
  }

  // §3.1.3 rule 14: Cupon.
  if (invoice.coupon === 'S' && invoice.invoiceType !== 'R1' && invoice.invoiceType !== 'R5') {
    issues.push({
      code: '1157',
      field: 'coupon',
      severity: 'rejection',
      message: 'Cupon can only be S when TipoFactura is R1 or R5.',
    });
  }

  // §3.1.3 rule 15: Desglose / DetalleDesglose — per-line analyses.
  const allRecipientsViaIDOtro =
    invoice.recipients !== undefined && invoice.recipients.length > 0
      ? invoice.recipients.every((r) => r.alternateId !== undefined)
      : undefined;
  for (const [index, line] of invoice.breakdown.entries()) {
    const lineAsClaveRegimen: ClaveRegimenLine = { ...line };
    const claveCtx: {
      invoiceType: typeof invoice.invoiceType;
      issueDateIso: string;
      operationDateIso?: string;
      recipients?: typeof invoice.recipients;
    } = {
      invoiceType: invoice.invoiceType,
      issueDateIso: invoice.invoiceId.issueDate,
    };
    if (invoice.operationDate !== undefined) claveCtx.operationDateIso = invoice.operationDate;
    if (invoice.recipients !== undefined) claveCtx.recipients = invoice.recipients;
    const claveIssues = validateClaveRegimen(lineAsClaveRegimen, claveCtx);
    for (const issue of claveIssues) {
      issues.push({
        ...issue,
        field: issue.field.startsWith('recipients')
          ? issue.field
          : `breakdown.${index}.${issue.field}`,
      });
    }
    const calIssues = validateCalificacionOperacion(line as CalificacionOperacionLine, {
      invoiceType: invoice.invoiceType,
    });
    for (const issue of calIssues) {
      issues.push({
        ...issue,
        field: issue.field.startsWith('invoiceType')
          ? issue.field
          : `breakdown.${index}.${issue.field}`,
      });
    }
    const exemptIssues = validateOperacionExenta(line as OperacionExentaLine, {
      ...(allRecipientsViaIDOtro !== undefined ? { allRecipientsViaIDOtro } : {}),
    });
    for (const issue of exemptIssues) {
      issues.push({ ...issue, field: `breakdown.${index}.${issue.field}` });
    }
    // §15.1 — tax rate.
    if (line.taxRate !== undefined) {
      const referenceDate = invoice.operationDate ?? invoice.invoiceId.issueDate;
      if (line.operationQualification === 'S1' && (line.tax === undefined || line.tax === '01')) {
        if (!isValidTipoImpositivo(line.taxRate, referenceDate)) {
          issues.push({
            code: '1124',
            field: `breakdown.${index}.taxRate`,
            severity: 'rejection',
            message: 'TipoImpositivo is not allowed on the operation date.',
          });
        }
      }
    }
    // §15.2 — BaseImponibleACoste only allowed when ClaveRegimen = 06 or tax is 02/05.
    if (line.taxBaseAtCost !== undefined) {
      const allowed = line.regimeKey === '06' || line.tax === '02' || line.tax === '05';
      if (!allowed) {
        issues.push({
          code: '1257',
          field: `breakdown.${index}.taxBaseAtCost`,
          severity: 'rejection',
          message:
            'BaseImponibleACoste only allowed when ClaveRegimen is 06 or Impuesto is 02 (IPSI) / 05 (Otros).',
        });
      }
    }
    // §15.3 — Recargo equivalencia.
    if (line.equivalenceSurchargeRate !== undefined && line.taxRate !== undefined) {
      const referenceDate = invoice.operationDate ?? invoice.invoiceId.issueDate;
      if (line.operationQualification === 'S1' && (line.tax === undefined || line.tax === '01')) {
        if (!isValidRecargoString(line.equivalenceSurchargeRate, line.taxRate, referenceDate)) {
          issues.push({
            code: '1127',
            field: `breakdown.${index}.equivalenceSurchargeRate`,
            severity: 'rejection',
            message: 'TipoRecargoEquivalencia not allowed for the given TipoImpositivo or date.',
          });
        }
      }
    }
    if (
      line.equivalenceSurchargeRate !== undefined &&
      line.equivalenceSurchargeAmount === undefined
    ) {
      issues.push({
        code: '1284',
        field: `breakdown.${index}.equivalenceSurchargeAmount`,
        severity: 'rejection',
        message: 'CuotaRecargoEquivalencia must be informed when TipoRecargoEquivalencia is set.',
      });
    }
    if (
      line.equivalenceSurchargeAmount !== undefined &&
      line.equivalenceSurchargeRate === undefined
    ) {
      issues.push({
        code: '1284',
        field: `breakdown.${index}.equivalenceSurchargeRate`,
        severity: 'rejection',
        message: 'TipoRecargoEquivalencia must be informed when CuotaRecargoEquivalencia is set.',
      });
    }
    if (
      (line.equivalenceSurchargeRate !== undefined ||
        line.equivalenceSurchargeAmount !== undefined) &&
      line.operationQualification !== undefined &&
      line.operationQualification !== 'S1'
    ) {
      issues.push({
        code: '1281',
        field: `breakdown.${index}.equivalenceSurchargeRate`,
        severity: 'rejection',
        message:
          'TipoRecargoEquivalencia and CuotaRecargoEquivalencia only allowed when CalificacionOperacion is S1.',
      });
    }
  }

  // §15.7 — CuotaRepercutida invariant per line.
  const breakdownForAmounts: AmountBreakdownLine[] = invoice.breakdown.map((line) => {
    const out: {
      taxBase: string;
      taxBaseAtCost?: string;
      taxAmount?: string;
      equivalenceSurchargeAmount?: string;
      taxRate?: string;
      regimeKey?: typeof line.regimeKey;
    } = { taxBase: line.taxBase };
    if (line.taxBaseAtCost !== undefined) out.taxBaseAtCost = line.taxBaseAtCost;
    if (line.taxAmount !== undefined) out.taxAmount = line.taxAmount;
    if (line.equivalenceSurchargeAmount !== undefined) {
      out.equivalenceSurchargeAmount = line.equivalenceSurchargeAmount;
    }
    if (line.taxRate !== undefined) out.taxRate = line.taxRate;
    if (line.regimeKey !== undefined) out.regimeKey = line.regimeKey;
    return out;
  });
  issues.push(
    ...validateCuotaRepercutida({
      breakdown: breakdownForAmounts,
      ...(invoice.rectificationKind !== undefined
        ? { rectificationKind: invoice.rectificationKind }
        : {}),
      invoiceType: invoice.invoiceType,
    }),
  );

  // §15.8 — Simplified-invoice 3000€.
  issues.push(
    ...validateFacturaSimplificada3000({
      invoiceType: invoice.invoiceType,
      ...(invoice.agreementNumber !== undefined
        ? { agreementNumber: invoice.agreementNumber }
        : {}),
      ...(invoice.withoutRecipientArt61d !== undefined
        ? { withoutRecipient: invoice.withoutRecipientArt61d }
        : {}),
      breakdown: breakdownForAmounts,
    }),
  );

  // §16 — CuotaTotal.
  issues.push(...validateCuotaTotal(invoice.totalTaxAmount, breakdownForAmounts));

  // §17 — ImporteTotal.
  issues.push(...validateImporteTotal(invoice.totalAmount, breakdownForAmounts));

  // §18 — Previous-record Huella format.
  if (
    invoice.chainLink.previousHash !== undefined &&
    !/^[0-9A-F]{64}$/u.test(invoice.chainLink.previousHash)
  ) {
    issues.push({
      code: '2003',
      field: 'chainLink.previousHash',
      severity: 'admissible',
      message: 'Previous-record hash content does not match the SHA-256 hex uppercase shape.',
    });
  }

  // §19 — SistemaInformatico (§3.1.5 rules).
  const billing = invoice.billingSystem;
  const billingNif: string | undefined = billing.nif;
  const billingAlternate = billing.alternateId;
  issues.push(
    ...validateSistemaInformatico({
      ...(billingNif !== undefined ? { nif: billingNif } : {}),
      ...(billingAlternate !== undefined ? { alternateId: billingAlternate } : {}),
      systemId: billing.systemId,
      systemName: billing.systemName,
      ...(billing.onlyVerifactu !== undefined ? { onlyVerifactu: billing.onlyVerifactu } : {}),
      ...(billing.multipleTaxpayer !== undefined
        ? { multipleTaxpayer: billing.multipleTaxpayer }
        : {}),
      operationDate: today,
    }),
  );

  // §20 — FechaHoraHusoGenRegistro must be ≤ AEAT-system clock (we can only
  // check it's not in the far future).
  const generated = new Date(invoice.generatedAt);
  if (Number.isNaN(generated.getTime())) {
    issues.push({
      code: '1244',
      field: 'generatedAt',
      severity: 'rejection',
      message: 'Invalid FechaHoraHusoGenRegistro format.',
    });
  } else if (generated.getTime() - today.getTime() > 24 * 60 * 60 * 1000) {
    issues.push({
      code: '2004',
      field: 'generatedAt',
      severity: 'admissible',
      message: 'FechaHoraHusoGenRegistro is later than the AEAT system clock.',
    });
  }

  // §23 — Huella.
  if (!/^[0-9A-F]{64}$/u.test(invoice.hash)) {
    issues.push({
      code: '1292',
      field: 'hash',
      severity: 'admissible',
      message: 'Huella is not 64 uppercase hexadecimal characters.',
    });
  }

  return issues;
}

/**
 * Validate a {@link CancelInvoiceInput} (`RegistroAnulacion`) against §3.1.4
 * rules 1–7.
 *
 * @param record - Public English-typed cancellation payload.
 * @param options - Optional override of the reference date.
 * @returns A flat list of every business-rule violation found.
 * @example
 * ```ts
 * const issues = validateInvoiceForCancel(cancellation);
 * ```
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.4}
 */
export function validateInvoiceForCancel(
  record: CancelInvoiceInput,
  options: ValidationOptions = {},
): ValidationResult[] {
  const today = options.today ?? new Date();
  const issues: ValidationResult[] = [];

  // §3.1.4 rule 1: IDFactura.
  if (!isValidAnyNif(record.cancelledInvoiceId.issuerNif)) {
    issues.push({
      code: '1109',
      field: 'cancelledInvoiceId.issuerNif',
      severity: 'rejection',
      message: 'IDEmisorFacturaAnulada NIF has an invalid format.',
    });
  }
  if (!isValidNumSerieFactura(record.cancelledInvoiceId.seriesNumber)) {
    issues.push({
      code: '1130',
      field: 'cancelledInvoiceId.seriesNumber',
      severity: 'rejection',
      message: 'NumSerieFacturaAnulada contains forbidden characters.',
    });
  }
  issues.push(
    ...validateIssueDate(record.cancelledInvoiceId.issueDate, today).map((issue) => ({
      ...issue,
      field: issue.field.replace('invoiceId.issueDate', 'cancelledInvoiceId.issueDate'),
    })),
  );

  // §3.1.4 rule 2 + 3: GeneradoPor and Generador.
  if (record.generatedBy !== undefined && record.generator === undefined) {
    issues.push({
      code: '1224',
      field: 'generator',
      severity: 'rejection',
      message: 'Generador block is mandatory when GeneradoPor is informed.',
    });
  }
  if (record.generator !== undefined && record.generatedBy === undefined) {
    issues.push({
      code: '1224',
      field: 'generatedBy',
      severity: 'rejection',
      message: 'GeneradoPor must be informed when Generador is present.',
    });
  }
  if (record.generator !== undefined) {
    if (record.generator.nif !== undefined) {
      if (record.generator.nif === record.cancelledInvoiceId.issuerNif) {
        issues.push({
          code: '1259',
          field: 'generator.nif',
          severity: 'rejection',
          message: 'Generador NIF must differ from ObligadoEmision NIF.',
        });
      }
      if (!isValidAnyNif(record.generator.nif)) {
        issues.push({
          code: '1258',
          field: 'generator.nif',
          severity: 'rejection',
          message: 'Generador NIF has invalid format.',
        });
      }
    }
    if (record.generator.alternateId !== undefined) {
      const idType = record.generator.alternateId.idType;
      if (record.generatedBy === 'T' && idType === '07') {
        issues.push({
          code: '1229',
          field: 'generator.alternateId.idType',
          severity: 'rejection',
          message: 'When GeneradoPor is T the Generador IDType cannot be No Censado (07).',
        });
      }
      if (
        record.generatedBy === 'D' &&
        record.generator.alternateId.countryCode === 'ES' &&
        idType !== '03' &&
        idType !== '07'
      ) {
        issues.push({
          code: '1230',
          field: 'generator.alternateId.idType',
          severity: 'rejection',
          message:
            'When GeneradoPor is D and CodigoPais is ES, the Generador IDType must be 03 or 07.',
        });
      }
      if (
        record.generatedBy === 'T' &&
        record.generator.alternateId.countryCode === 'ES' &&
        idType !== '03'
      ) {
        issues.push({
          code: '1232',
          field: 'generator.alternateId.idType',
          severity: 'rejection',
          message: 'When GeneradoPor is T and CodigoPais is ES the IDType must be 03 (Passport).',
        });
      }
      if (idType === '02') {
        const id = record.generator.alternateId.id;
        const country =
          record.generator.alternateId.countryCode !== undefined
            ? record.generator.alternateId.countryCode
            : id.slice(0, 2);
        const idValue = id.startsWith(country) ? id.slice(country.length) : id;
        if (!isValidEuVatNumber(country, idValue, today)) {
          issues.push({
            code: '1103',
            field: 'generator.alternateId.id',
            severity: 'rejection',
            message: 'Generador NIF-IVA does not match the expected EU structure.',
          });
        }
      }
    }
    if (record.generatedBy === 'E' && record.generator.nif === undefined) {
      issues.push({
        code: '1227',
        field: 'generator.nif',
        severity: 'rejection',
        message: 'When GeneradoPor is E the Generador NIF is mandatory.',
      });
    }
  }

  // §3.1.4 rule 4: Previous-record hash format.
  if (
    record.chainLink.previousHash !== undefined &&
    !/^[0-9A-F]{64}$/u.test(record.chainLink.previousHash)
  ) {
    issues.push({
      code: '2003',
      field: 'chainLink.previousHash',
      severity: 'admissible',
      message: 'Previous-record hash content does not match the SHA-256 hex uppercase shape.',
    });
  }

  // §3.1.4 rule 5: SistemaInformatico (§3.1.5).
  const billing = record.billingSystem;
  const cancelBillingNif: string | undefined = billing.nif;
  const cancelBillingAlternate = billing.alternateId;
  issues.push(
    ...validateSistemaInformatico({
      ...(cancelBillingNif !== undefined ? { nif: cancelBillingNif } : {}),
      ...(cancelBillingAlternate !== undefined ? { alternateId: cancelBillingAlternate } : {}),
      systemId: billing.systemId,
      systemName: billing.systemName,
      ...(billing.onlyVerifactu !== undefined ? { onlyVerifactu: billing.onlyVerifactu } : {}),
      ...(billing.multipleTaxpayer !== undefined
        ? { multipleTaxpayer: billing.multipleTaxpayer }
        : {}),
      operationDate: today,
    }),
  );

  // §3.1.4 rule 6: FechaHoraHusoGenRegistro.
  const generated = new Date(record.generatedAt);
  if (Number.isNaN(generated.getTime())) {
    issues.push({
      code: '1244',
      field: 'generatedAt',
      severity: 'rejection',
      message: 'Invalid FechaHoraHusoGenRegistro format.',
    });
  } else if (generated.getTime() - today.getTime() > 24 * 60 * 60 * 1000) {
    issues.push({
      code: '2004',
      field: 'generatedAt',
      severity: 'admissible',
      message: 'FechaHoraHusoGenRegistro is later than the AEAT system clock.',
    });
  }

  // §3.1.4 rule 7: Huella.
  if (!/^[0-9A-F]{64}$/u.test(record.hash)) {
    issues.push({
      code: '1292',
      field: 'hash',
      severity: 'admissible',
      message: 'Huella is not 64 uppercase hexadecimal characters.',
    });
  }

  return issues;
}
