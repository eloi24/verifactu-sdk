/**
 * English ↔ Spanish field-name maps used by the wire transformer.
 *
 * Each `as const` object lists every wire field for a given AEAT block and
 * pairs it with the corresponding public English identifier defined in
 * {@link ../types.ts}. The maps are intentionally flat — nested blocks have
 * their own dedicated map — so the transformer can look up names without
 * walking complex structures.
 *
 * @module
 */

/**
 * Counterpart (issuer / recipient / third party) field names.
 *
 * AEAT block: `PersonaFisicaJuridicaType`.
 */
export const COUNTERPART_FIELDS = {
  NombreRazon: 'legalName',
  NIF: 'nif',
  IDOtro: 'alternateId',
} as const;

/**
 * Alternate identifier field names. AEAT block: `IDOtroType`.
 */
export const ALTERNATE_ID_FIELDS = {
  CodigoPais: 'countryCode',
  IDType: 'idType',
  ID: 'id',
} as const;

/**
 * Invoice identifier (alta path). AEAT block: `IDFacturaExpedidaType`.
 */
export const INVOICE_ID_FIELDS = {
  IDEmisorFactura: 'issuerNif',
  NumSerieFactura: 'seriesNumber',
  FechaExpedicionFactura: 'issueDate',
} as const;

/**
 * Invoice identifier (anulacion path). AEAT block: `IDFacturaExpedidaBajaType`.
 *
 * The XSD names the same three concepts with the `Anulada` suffix; we keep
 * the suffix on the wire and drop it on the public side.
 */
export const CANCELLED_INVOICE_ID_FIELDS = {
  IDEmisorFacturaAnulada: 'issuerNif',
  NumSerieFacturaAnulada: 'seriesNumber',
  FechaExpedicionFacturaAnulada: 'issueDate',
} as const;

/**
 * Billing-system descriptor. AEAT block: `SistemaInformaticoType`.
 */
export const BILLING_SYSTEM_FIELDS = {
  NombreRazon: 'producerName',
  NIF: 'nif',
  IDOtro: 'alternateId',
  NombreSistemaInformatico: 'systemName',
  IdSistemaInformatico: 'systemId',
  Version: 'version',
  NumeroInstalacion: 'installationNumber',
  TipoUsoPosibleSoloVerifactu: 'onlyVerifactu',
  TipoUsoPosibleMultiOT: 'multipleTaxpayer',
  IndicadorMultiplesOT: 'hasMultipleTaxpayers',
} as const;

/**
 * Tax-breakdown line. AEAT block: `DetalleType`.
 */
export const BREAKDOWN_ITEM_FIELDS = {
  Impuesto: 'tax',
  ClaveRegimen: 'regimeKey',
  CalificacionOperacion: 'operationQualification',
  OperacionExenta: 'exemptionReason',
  TipoImpositivo: 'taxRate',
  BaseImponibleOimporteNoSujeto: 'taxBase',
  BaseImponibleACoste: 'taxBaseAtCost',
  CuotaRepercutida: 'taxAmount',
  TipoRecargoEquivalencia: 'equivalenceSurchargeRate',
  CuotaRecargoEquivalencia: 'equivalenceSurchargeAmount',
} as const;

/**
 * Substitutive-rectification breakdown. AEAT block: `DesgloseRectificacionType`.
 */
export const RECTIFICATION_BREAKDOWN_FIELDS = {
  BaseRectificada: 'rectifiedBase',
  CuotaRectificada: 'rectifiedTaxAmount',
  CuotaRecargoRectificado: 'rectifiedSurchargeAmount',
} as const;

/**
 * Top-level invoice-registration record. AEAT block: `RegistroFacturacionAltaType`.
 */
export const INVOICE_FIELDS = {
  IDVersion: 'idVersion',
  IDFactura: 'invoiceId',
  RefExterna: 'externalReference',
  NombreRazonEmisor: 'issuerName',
  Subsanacion: 'correction',
  RechazoPrevio: 'priorRejection',
  TipoFactura: 'invoiceType',
  TipoRectificativa: 'rectificationKind',
  FacturasRectificadas: 'rectifiedInvoices',
  FacturasSustituidas: 'substitutedInvoices',
  ImporteRectificacion: 'rectificationBreakdown',
  FechaOperacion: 'operationDate',
  DescripcionOperacion: 'description',
  FacturaSimplificadaArt7273: 'simplifiedArt7273',
  FacturaSinIdentifDestinatarioArt61d: 'withoutRecipientArt61d',
  Macrodato: 'macroData',
  EmitidaPorTerceroODestinatario: 'issuedBy',
  Tercero: 'thirdParty',
  Destinatarios: 'recipients',
  Cupon: 'coupon',
  Desglose: 'breakdown',
  CuotaTotal: 'totalTaxAmount',
  ImporteTotal: 'totalAmount',
  Encadenamiento: 'chainLink',
  SistemaInformatico: 'billingSystem',
  FechaHoraHusoGenRegistro: 'generatedAt',
  NumRegistroAcuerdoFacturacion: 'agreementNumber',
  IdAcuerdoSistemaInformatico: 'systemAgreementId',
  TipoHuella: 'hashAlgorithm',
  Huella: 'hash',
} as const;

/**
 * Cancellation record. AEAT block: `RegistroFacturacionAnulacionType`.
 */
export const CANCEL_INVOICE_FIELDS = {
  IDVersion: 'idVersion',
  IDFactura: 'cancelledInvoiceId',
  RefExterna: 'externalReference',
  SinRegistroPrevio: 'withoutPriorRecord',
  RechazoPrevio: 'priorRejection',
  GeneradoPor: 'generatedBy',
  Generador: 'generator',
  Encadenamiento: 'chainLink',
  SistemaInformatico: 'billingSystem',
  FechaHoraHusoGenRegistro: 'generatedAt',
  TipoHuella: 'hashAlgorithm',
  Huella: 'hash',
} as const;
