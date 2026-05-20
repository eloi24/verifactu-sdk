/**
 * Pure transformers that convert public English-named inputs into the
 * Spanish-named wire shape consumed by the Zod schemas.
 *
 * The functions are intentionally narrow: each accepts one public structure
 * (Invoice, CancelInvoiceInput, BillingSystem, …) and returns a plain object
 * whose keys are AEAT field names. The wire objects are then validated by the
 * corresponding Zod schema before serialisation.
 *
 * @module
 */

import type {
  DetalleDesglose,
  Encadenamiento,
  IdFactura,
  IdOtro,
  ImporteRectificacion,
  PersonaFisicaJuridica,
  RegistroAlta,
  RegistroAnulacion,
  SistemaInformatico,
} from '../schemas/index.js';
import type {
  AlternateIdentifier,
  BillingSystem,
  BreakdownItem,
  CancelInvoiceInput,
  ChainLink,
  Counterpart,
  Invoice,
  InvoiceId,
  RectificationBreakdown,
} from '../types.js';
import { isoDateToWireDate } from './dates.js';

/**
 * Convert an ISO-form invoice identifier into its wire shape.
 */
export function invoiceIdToWire(value: InvoiceId): IdFactura {
  return {
    IDEmisorFactura: value.issuerNif,
    NumSerieFactura: value.seriesNumber,
    FechaExpedicionFactura: isoDateToWireDate(value.issueDate),
  };
}

/**
 * Convert a cancelled-invoice identifier into its wire shape (with the
 * `Anulada` suffixes the XSD uses).
 */
export function cancelledInvoiceIdToWire(value: InvoiceId): {
  IDEmisorFacturaAnulada: string;
  NumSerieFacturaAnulada: string;
  FechaExpedicionFacturaAnulada: string;
} {
  return {
    IDEmisorFacturaAnulada: value.issuerNif,
    NumSerieFacturaAnulada: value.seriesNumber,
    FechaExpedicionFacturaAnulada: isoDateToWireDate(value.issueDate),
  };
}

/**
 * Convert a public {@link AlternateIdentifier} into its `IDOtro` wire shape.
 */
export function alternateIdToWire(value: AlternateIdentifier): IdOtro {
  return {
    ...(value.countryCode !== undefined ? { CodigoPais: value.countryCode } : {}),
    IDType: value.idType,
    ID: value.id,
  };
}

/**
 * Convert a {@link Counterpart} into a `PersonaFisicaJuridica` wire shape.
 */
export function counterpartToWire(value: Counterpart): PersonaFisicaJuridica {
  return {
    NombreRazon: value.legalName,
    ...(value.nif !== undefined ? { NIF: value.nif } : {}),
    ...(value.alternateId !== undefined ? { IDOtro: alternateIdToWire(value.alternateId) } : {}),
  };
}

/**
 * Convert a {@link BillingSystem} into a `SistemaInformatico` wire shape.
 */
export function billingSystemToWire(value: BillingSystem): SistemaInformatico {
  return {
    NombreRazon: value.producerName,
    ...(value.nif !== undefined ? { NIF: value.nif } : {}),
    ...(value.alternateId !== undefined ? { IDOtro: alternateIdToWire(value.alternateId) } : {}),
    NombreSistemaInformatico: value.systemName,
    IdSistemaInformatico: value.systemId,
    Version: value.version,
    NumeroInstalacion: value.installationNumber,
    TipoUsoPosibleSoloVerifactu: value.onlyVerifactu,
    TipoUsoPosibleMultiOT: value.multipleTaxpayer,
    IndicadorMultiplesOT: value.hasMultipleTaxpayers,
  };
}

/**
 * Convert a {@link BreakdownItem} into a `DetalleDesglose` wire shape.
 */
export function breakdownItemToWire(value: BreakdownItem): DetalleDesglose {
  return {
    ...(value.tax !== undefined ? { Impuesto: value.tax } : {}),
    ...(value.regimeKey !== undefined ? { ClaveRegimen: value.regimeKey } : {}),
    ...(value.operationQualification !== undefined
      ? { CalificacionOperacion: value.operationQualification }
      : {}),
    ...(value.exemptionReason !== undefined ? { OperacionExenta: value.exemptionReason } : {}),
    ...(value.taxRate !== undefined ? { TipoImpositivo: value.taxRate } : {}),
    BaseImponibleOimporteNoSujeto: value.taxBase,
    ...(value.taxBaseAtCost !== undefined ? { BaseImponibleACoste: value.taxBaseAtCost } : {}),
    ...(value.taxAmount !== undefined ? { CuotaRepercutida: value.taxAmount } : {}),
    ...(value.equivalenceSurchargeRate !== undefined
      ? { TipoRecargoEquivalencia: value.equivalenceSurchargeRate }
      : {}),
    ...(value.equivalenceSurchargeAmount !== undefined
      ? { CuotaRecargoEquivalencia: value.equivalenceSurchargeAmount }
      : {}),
  };
}

/**
 * Convert a {@link RectificationBreakdown} into its wire shape.
 */
export function rectificationBreakdownToWire(value: RectificationBreakdown): ImporteRectificacion {
  return {
    BaseRectificada: value.rectifiedBase,
    CuotaRectificada: value.rectifiedTaxAmount,
    ...(value.rectifiedSurchargeAmount !== undefined
      ? { CuotaRecargoRectificado: value.rectifiedSurchargeAmount }
      : {}),
  };
}

/**
 * Convert a {@link ChainLink} into an `Encadenamiento` wire shape.
 *
 * @throws {Error} If {@link ChainLink.first} is `false` and any of the four
 *   `previous*` fields is missing.
 */
export function chainLinkToWire(value: ChainLink): Encadenamiento {
  if (value.first) {
    return { PrimerRegistro: 'S' };
  }
  if (
    value.previousIssuerNif === undefined ||
    value.previousSeriesNumber === undefined ||
    value.previousIssueDate === undefined ||
    value.previousHash === undefined
  ) {
    throw new Error('ChainLink: non-first link requires all four `previous*` fields');
  }
  return {
    RegistroAnterior: {
      IDEmisorFactura: value.previousIssuerNif,
      NumSerieFactura: value.previousSeriesNumber,
      FechaExpedicionFactura: isoDateToWireDate(value.previousIssueDate),
      Huella: value.previousHash,
    },
  };
}

/**
 * Convert a full {@link Invoice} into a `RegistroAlta` wire shape.
 *
 * The output is *not* validated here — call `RegistroAltaSchema.parse` on the
 * returned value (or rely on the protocol layer to do so) before serialising
 * to XML.
 *
 * @example
 * ```ts
 * const wire = invoiceToWire(invoice);
 * const validated = RegistroAltaSchema.parse(wire);
 * ```
 */
export function invoiceToWire(invoice: Invoice): RegistroAlta {
  return {
    IDVersion: '1.0',
    IDFactura: invoiceIdToWire(invoice.invoiceId),
    ...(invoice.externalReference !== undefined ? { RefExterna: invoice.externalReference } : {}),
    NombreRazonEmisor: invoice.issuerName,
    ...(invoice.correction !== undefined ? { Subsanacion: invoice.correction } : {}),
    ...(invoice.priorRejection !== undefined ? { RechazoPrevio: invoice.priorRejection } : {}),
    TipoFactura: invoice.invoiceType,
    ...(invoice.rectificationKind !== undefined
      ? { TipoRectificativa: invoice.rectificationKind }
      : {}),
    ...(invoice.rectifiedInvoices !== undefined
      ? {
          FacturasRectificadas: {
            IDFacturaRectificada: invoice.rectifiedInvoices.map(invoiceIdToWire),
          },
        }
      : {}),
    ...(invoice.substitutedInvoices !== undefined
      ? {
          FacturasSustituidas: {
            IDFacturaSustituida: invoice.substitutedInvoices.map(invoiceIdToWire),
          },
        }
      : {}),
    ...(invoice.rectificationBreakdown !== undefined
      ? { ImporteRectificacion: rectificationBreakdownToWire(invoice.rectificationBreakdown) }
      : {}),
    ...(invoice.operationDate !== undefined
      ? { FechaOperacion: isoDateToWireDate(invoice.operationDate) }
      : {}),
    DescripcionOperacion: invoice.description,
    ...(invoice.simplifiedArt7273 !== undefined
      ? { FacturaSimplificadaArt7273: invoice.simplifiedArt7273 }
      : {}),
    ...(invoice.withoutRecipientArt61d !== undefined
      ? { FacturaSinIdentifDestinatarioArt61d: invoice.withoutRecipientArt61d }
      : {}),
    ...(invoice.macroData !== undefined ? { Macrodato: invoice.macroData } : {}),
    ...(invoice.issuedBy !== undefined ? { EmitidaPorTerceroODestinatario: invoice.issuedBy } : {}),
    ...(invoice.thirdParty !== undefined ? { Tercero: counterpartToWire(invoice.thirdParty) } : {}),
    ...(invoice.recipients !== undefined && invoice.recipients.length > 0
      ? { Destinatarios: { IDDestinatario: invoice.recipients.map(counterpartToWire) } }
      : {}),
    ...(invoice.coupon !== undefined ? { Cupon: invoice.coupon } : {}),
    Desglose: { DetalleDesglose: invoice.breakdown.map(breakdownItemToWire) },
    CuotaTotal: invoice.totalTaxAmount,
    ImporteTotal: invoice.totalAmount,
    Encadenamiento: chainLinkToWire(invoice.chainLink),
    SistemaInformatico: billingSystemToWire(invoice.billingSystem),
    FechaHoraHusoGenRegistro: invoice.generatedAt,
    ...(invoice.agreementNumber !== undefined
      ? { NumRegistroAcuerdoFacturacion: invoice.agreementNumber }
      : {}),
    ...(invoice.systemAgreementId !== undefined
      ? { IdAcuerdoSistemaInformatico: invoice.systemAgreementId }
      : {}),
    TipoHuella: '01',
    Huella: invoice.hash,
  };
}

/**
 * Convert a {@link CancelInvoiceInput} into a `RegistroAnulacion` wire shape.
 */
export function cancelInvoiceToWire(input: CancelInvoiceInput): RegistroAnulacion {
  return {
    IDVersion: '1.0',
    IDFactura: cancelledInvoiceIdToWire(input.cancelledInvoiceId),
    ...(input.externalReference !== undefined ? { RefExterna: input.externalReference } : {}),
    ...(input.withoutPriorRecord !== undefined
      ? { SinRegistroPrevio: input.withoutPriorRecord }
      : {}),
    ...(input.priorRejection !== undefined ? { RechazoPrevio: input.priorRejection } : {}),
    ...(input.generatedBy !== undefined ? { GeneradoPor: input.generatedBy } : {}),
    ...(input.generator !== undefined ? { Generador: counterpartToWire(input.generator) } : {}),
    Encadenamiento: chainLinkToWire(input.chainLink),
    SistemaInformatico: billingSystemToWire(input.billingSystem),
    FechaHoraHusoGenRegistro: input.generatedAt,
    TipoHuella: '01',
    Huella: input.hash,
  };
}
