/**
 * Pure transformers from the Spanish-named wire shape back to the public
 * English-named types.
 *
 * These are the inverses of the functions in `./toWire.ts`. They are used by
 * the protocol layer after parsing an AEAT response and by tests to perform
 * round-trip assertions.
 *
 * @module
 */

import type {
  DetalleDesglose,
  Encadenamiento,
  IdFactura,
  IdFacturaAnulada,
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
import { wireDateToIsoDate } from './dates.js';

/**
 * Convert a wire {@link IdFactura} into its public ISO form.
 */
export function invoiceIdFromWire(value: IdFactura): InvoiceId {
  return {
    issuerNif: value.IDEmisorFactura,
    seriesNumber: value.NumSerieFactura,
    issueDate: wireDateToIsoDate(value.FechaExpedicionFactura),
  };
}

/**
 * Convert a cancelled-invoice identifier from its wire form to the public one.
 */
export function cancelledInvoiceIdFromWire(value: IdFacturaAnulada): InvoiceId {
  return {
    issuerNif: value.IDEmisorFacturaAnulada,
    seriesNumber: value.NumSerieFacturaAnulada,
    issueDate: wireDateToIsoDate(value.FechaExpedicionFacturaAnulada),
  };
}

/**
 * Convert an `IDOtro` wire block back to a public {@link AlternateIdentifier}.
 */
export function alternateIdFromWire(value: IdOtro): AlternateIdentifier {
  return {
    ...(value.CodigoPais !== undefined ? { countryCode: value.CodigoPais } : {}),
    idType: value.IDType,
    id: value.ID,
  };
}

/**
 * Convert a `PersonaFisicaJuridica` wire block back to a public {@link Counterpart}.
 */
export function counterpartFromWire(value: PersonaFisicaJuridica): Counterpart {
  return {
    legalName: value.NombreRazon,
    ...(value.NIF !== undefined ? { nif: value.NIF } : {}),
    ...(value.IDOtro !== undefined ? { alternateId: alternateIdFromWire(value.IDOtro) } : {}),
  };
}

/**
 * Convert a `SistemaInformatico` wire block back to a public {@link BillingSystem}.
 */
export function billingSystemFromWire(value: SistemaInformatico): BillingSystem {
  return {
    producerName: value.NombreRazon,
    ...(value.NIF !== undefined ? { nif: value.NIF } : {}),
    ...(value.IDOtro !== undefined ? { alternateId: alternateIdFromWire(value.IDOtro) } : {}),
    systemName: value.NombreSistemaInformatico,
    systemId: value.IdSistemaInformatico,
    version: value.Version,
    installationNumber: value.NumeroInstalacion,
    onlyVerifactu: value.TipoUsoPosibleSoloVerifactu,
    multipleTaxpayer: value.TipoUsoPosibleMultiOT,
    hasMultipleTaxpayers: value.IndicadorMultiplesOT,
  };
}

/**
 * Convert a `DetalleDesglose` wire block back to a public {@link BreakdownItem}.
 */
export function breakdownItemFromWire(value: DetalleDesglose): BreakdownItem {
  return {
    ...(value.Impuesto !== undefined ? { tax: value.Impuesto } : {}),
    ...(value.ClaveRegimen !== undefined ? { regimeKey: value.ClaveRegimen } : {}),
    ...(value.CalificacionOperacion !== undefined
      ? { operationQualification: value.CalificacionOperacion }
      : {}),
    ...(value.OperacionExenta !== undefined ? { exemptionReason: value.OperacionExenta } : {}),
    ...(value.TipoImpositivo !== undefined ? { taxRate: value.TipoImpositivo } : {}),
    taxBase: value.BaseImponibleOimporteNoSujeto,
    ...(value.BaseImponibleACoste !== undefined
      ? { taxBaseAtCost: value.BaseImponibleACoste }
      : {}),
    ...(value.CuotaRepercutida !== undefined ? { taxAmount: value.CuotaRepercutida } : {}),
    ...(value.TipoRecargoEquivalencia !== undefined
      ? { equivalenceSurchargeRate: value.TipoRecargoEquivalencia }
      : {}),
    ...(value.CuotaRecargoEquivalencia !== undefined
      ? { equivalenceSurchargeAmount: value.CuotaRecargoEquivalencia }
      : {}),
  };
}

/**
 * Convert an `ImporteRectificacion` wire block back to a public
 * {@link RectificationBreakdown}.
 */
export function rectificationBreakdownFromWire(
  value: ImporteRectificacion,
): RectificationBreakdown {
  return {
    rectifiedBase: value.BaseRectificada,
    rectifiedTaxAmount: value.CuotaRectificada,
    ...(value.CuotaRecargoRectificado !== undefined
      ? { rectifiedSurchargeAmount: value.CuotaRecargoRectificado }
      : {}),
  };
}

/**
 * Convert an `Encadenamiento` wire block back to a public {@link ChainLink}.
 */
export function chainLinkFromWire(value: Encadenamiento): ChainLink {
  if (value.PrimerRegistro === 'S') {
    return { first: true };
  }
  if (!value.RegistroAnterior) {
    throw new Error('Encadenamiento: missing both PrimerRegistro and RegistroAnterior');
  }
  return {
    first: false,
    previousIssuerNif: value.RegistroAnterior.IDEmisorFactura,
    previousSeriesNumber: value.RegistroAnterior.NumSerieFactura,
    previousIssueDate: wireDateToIsoDate(value.RegistroAnterior.FechaExpedicionFactura),
    previousHash: value.RegistroAnterior.Huella,
  };
}

/**
 * Convert a full `RegistroAlta` wire record back to a public {@link Invoice}.
 *
 * `RegistroAlta` carries fields not present in the public {@link Invoice}
 * (`IDVersion`, `TipoHuella`) — they are derivable constants and therefore
 * dropped on the way back.
 */
export function invoiceFromWire(value: RegistroAlta): Invoice {
  return {
    invoiceId: invoiceIdFromWire(value.IDFactura),
    ...(value.RefExterna !== undefined ? { externalReference: value.RefExterna } : {}),
    issuerName: value.NombreRazonEmisor,
    ...(value.Subsanacion !== undefined ? { correction: value.Subsanacion } : {}),
    ...(value.RechazoPrevio !== undefined ? { priorRejection: value.RechazoPrevio } : {}),
    invoiceType: value.TipoFactura,
    ...(value.TipoRectificativa !== undefined
      ? { rectificationKind: value.TipoRectificativa }
      : {}),
    ...(value.FacturasRectificadas !== undefined
      ? {
          rectifiedInvoices: value.FacturasRectificadas.IDFacturaRectificada.map(invoiceIdFromWire),
        }
      : {}),
    ...(value.FacturasSustituidas !== undefined
      ? {
          substitutedInvoices: value.FacturasSustituidas.IDFacturaSustituida.map(invoiceIdFromWire),
        }
      : {}),
    ...(value.ImporteRectificacion !== undefined
      ? {
          rectificationBreakdown: rectificationBreakdownFromWire(value.ImporteRectificacion),
        }
      : {}),
    ...(value.FechaOperacion !== undefined
      ? { operationDate: wireDateToIsoDate(value.FechaOperacion) }
      : {}),
    description: value.DescripcionOperacion,
    ...(value.FacturaSimplificadaArt7273 !== undefined
      ? { simplifiedArt7273: value.FacturaSimplificadaArt7273 }
      : {}),
    ...(value.FacturaSinIdentifDestinatarioArt61d !== undefined
      ? { withoutRecipientArt61d: value.FacturaSinIdentifDestinatarioArt61d }
      : {}),
    ...(value.Macrodato !== undefined ? { macroData: value.Macrodato } : {}),
    ...(value.EmitidaPorTerceroODestinatario !== undefined
      ? { issuedBy: value.EmitidaPorTerceroODestinatario }
      : {}),
    ...(value.Tercero !== undefined ? { thirdParty: counterpartFromWire(value.Tercero) } : {}),
    ...(value.Destinatarios !== undefined
      ? { recipients: value.Destinatarios.IDDestinatario.map(counterpartFromWire) }
      : {}),
    ...(value.Cupon !== undefined ? { coupon: value.Cupon } : {}),
    breakdown: value.Desglose.DetalleDesglose.map(breakdownItemFromWire),
    totalTaxAmount: value.CuotaTotal,
    totalAmount: value.ImporteTotal,
    chainLink: chainLinkFromWire(value.Encadenamiento),
    billingSystem: billingSystemFromWire(value.SistemaInformatico),
    generatedAt: value.FechaHoraHusoGenRegistro,
    ...(value.NumRegistroAcuerdoFacturacion !== undefined
      ? { agreementNumber: value.NumRegistroAcuerdoFacturacion }
      : {}),
    ...(value.IdAcuerdoSistemaInformatico !== undefined
      ? { systemAgreementId: value.IdAcuerdoSistemaInformatico }
      : {}),
    hash: value.Huella,
  };
}

/**
 * Convert a `RegistroAnulacion` wire record back to a {@link CancelInvoiceInput}.
 */
export function cancelInvoiceFromWire(value: RegistroAnulacion): CancelInvoiceInput {
  return {
    cancelledInvoiceId: cancelledInvoiceIdFromWire(value.IDFactura),
    ...(value.RefExterna !== undefined ? { externalReference: value.RefExterna } : {}),
    ...(value.SinRegistroPrevio !== undefined
      ? { withoutPriorRecord: value.SinRegistroPrevio }
      : {}),
    ...(value.RechazoPrevio !== undefined ? { priorRejection: value.RechazoPrevio } : {}),
    ...(value.GeneradoPor !== undefined ? { generatedBy: value.GeneradoPor } : {}),
    ...(value.Generador !== undefined ? { generator: counterpartFromWire(value.Generador) } : {}),
    chainLink: chainLinkFromWire(value.Encadenamiento),
    billingSystem: billingSystemFromWire(value.SistemaInformatico),
    generatedAt: value.FechaHoraHusoGenRegistro,
    hash: value.Huella,
  };
}
