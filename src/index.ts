/**
 * verifactu-sdk — public entrypoint.
 *
 * The published surface of the SDK. Everything imported from
 * `'verifactu-sdk'` flows through this file; sub-paths
 * (`'verifactu-sdk/schemas'`, `'verifactu-sdk/validators'`, …) are provided
 * for advanced consumers who need to reach a specific layer without paying
 * the whole-package import cost.
 *
 * Only the symbols re-exported here are covered by SemVer; internal helpers
 * are subject to change between minor releases.
 *
 * @packageDocumentation
 */

/** Current SDK version. Replaced at build time when `package.json` changes. */
export const SDK_VERSION = '0.1.0' as const;

// Public types
export type {
  AlternateIdType,
  AlternateIdentifier,
  BillingSystem,
  BreakdownItem,
  CancelInvoiceInput,
  ChainLink,
  Counterpart,
  EnvelopeState,
  ExemptionReason,
  HeaderModeOnRequest,
  HeaderModeVoluntary,
  Invoice,
  InvoiceId,
  InvoiceType,
  OperationQualification,
  QueryFilter,
  QueryResultPage,
  RecordState,
  Recipient,
  RectificationBreakdown,
  RectificationKind,
  RegimeKey,
  RegisterInvoiceRecordResult,
  RegisterInvoiceResponse,
  Representative,
  StoredRecordState,
  TaxCode,
  Taxpayer,
  YesNo,
} from './types.js';

// High-level client
export {
  VerifactuClient,
  type VerifactuClientOptions,
  type RenderQrInput,
  type RenderedQr,
} from './client/VerifactuClient.js';
export type { Environment, Mode } from './client/endpoints.js';
export type { ClientCertificate, PfxCertificate, PemCertificate } from './client/soap.js';

// Storage abstraction
export type { HashStore, HashStoreEntry } from './store/index.js';
export { InMemoryHashStore } from './store/index.js';

// Error hierarchy (every throw site uses one of these)
export {
  BusinessValidationError,
  FlowControlError,
  NetworkError,
  SchemaValidationError,
  SoapFaultError,
  VerifactuError,
  type ErrorCategory,
  type NetworkErrorOptions,
  type SoapFaultDetail,
  type SoapFaultErrorOptions,
  type VerifactuErrorInvoiceId,
  type VerifactuErrorOptions,
} from './errors/index.js';
export { ERROR_CATALOG } from './errors/catalog.js';

// QR helpers (also reachable via the `verifactu-sdk/qr` sub-path)
export { buildQrUrl } from './qr/buildUrl.js';
export { renderQrPng, renderQrSvg, renderQrDataUrl } from './qr/render.js';
export type { BuildQrUrlInput, QrEnvironment, QrLanguage, QrMode } from './qr/buildUrl.js';
export type { RenderQrOptions } from './qr/render.js';
