/**
 * Public English-named types for the verifactu-sdk API surface.
 *
 * These types wrap the Spanish-named Zod schemas defined in `./schemas/`. The
 * wire transformer (`./wire/`) converts in both directions. The names follow
 * the {@link CLAUDE.md} language convention: English identifiers, Spanish kept
 * only for AEAT enum string values (`F1`, `S1`, `E1`, …).
 *
 * Keeping these as bare interfaces rather than `z.infer` lets users import
 * them without pulling Zod into their TypeScript graph (Zod stays a runtime
 * dependency only).
 *
 * @module
 */

/**
 * AEAT-defined invoice-type codes (list L4 / `ClaveTipoFacturaType`).
 *
 * The values are kept verbatim from the AEAT XSD because they are wire-format
 * identifiers that the AEAT validates as exact strings.
 */
export type InvoiceType = 'F1' | 'F2' | 'F3' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

/**
 * Rectification kind — `'S'` substitutive, `'I'` incremental.
 */
export type RectificationKind = 'S' | 'I';

/**
 * Tax code, list L1 (`ImpuestoType`).
 *
 * - `'01'` IVA — Spanish VAT
 * - `'02'` IPSI — Ceuta/Melilla
 * - `'03'` IGIC — Canary Islands
 * - `'05'` Other indirect tax
 */
export type TaxCode = '01' | '02' | '03' | '05';

/**
 * Operation regime key (L8A for IVA / L8B for IGIC).
 *
 * @remarks Cross-validation with {@link TaxCode} is performed by the validator
 * layer at submission time.
 */
export type RegimeKey =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '14'
  | '15'
  | '17'
  | '18'
  | '19'
  | '20'
  | '21';

/**
 * Operation qualification code (`CalificacionOperacionType`).
 *
 * - `'S1'` subject and non-exempt, no reverse charge
 * - `'S2'` subject and non-exempt, reverse charge
 * - `'N1'` non-subject (art. 7, 14, others)
 * - `'N2'` non-subject by localisation rules
 */
export type OperationQualification = 'S1' | 'S2' | 'N1' | 'N2';

/**
 * Exemption-reason code (list L10; `'E7'`/`'E8'` only valid for IGIC).
 */
export type ExemptionReason = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8';

/**
 * Identifier-type code for {@link AlternateIdentifier} (list L7).
 *
 * Note that `'01'` (Spanish NIF) is intentionally excluded; use the dedicated
 * `nif` property instead.
 */
export type AlternateIdType = '02' | '03' | '04' | '05' | '06' | '07';

/**
 * Boolean-like AEAT flag (`SiNoType`).
 */
export type YesNo = 'S' | 'N';

/**
 * Per-line submission outcome state (L19).
 */
export type RecordState = 'Correcto' | 'AceptadoConErrores' | 'Incorrecto';

/**
 * Global submission state (L18).
 */
export type EnvelopeState = 'Correcto' | 'ParcialmenteCorrecto' | 'Incorrecto';

/**
 * State of a previously stored record reported in the query response (L21).
 */
export type StoredRecordState = 'Correcto' | 'AceptadoConErrores' | 'Anulado';

/**
 * Foreign or alternate counterpart identifier (mirror of `IDOtroType`).
 */
export interface AlternateIdentifier {
  /** ISO 3166-1 alpha-2 country code; optional only when {@link idType} is `'02'`. */
  countryCode?: string;
  /** Identifier-type code; see {@link AlternateIdType}. */
  idType: AlternateIdType;
  /** Up to 20-char identifier value. */
  id: string;
}

/**
 * Public representation of a counterpart (issuer, recipient, third party).
 *
 * Exactly one of {@link nif} or {@link alternateId} must be set. Provide
 * {@link nif} for Spanish entities, {@link alternateId} for everyone else.
 */
export interface Counterpart {
  /** Legal/commercial name (up to 120 chars). */
  legalName: string;
  /** 9-char Spanish tax identifier; mutually exclusive with {@link alternateId}. */
  nif?: string;
  /** Foreign/alternate identifier; mutually exclusive with {@link nif}. */
  alternateId?: AlternateIdentifier;
}

/**
 * Recipient of an invoice — alias of {@link Counterpart}.
 */
export type Recipient = Counterpart;

/**
 * Tax-obligated party (the SDK user). Always a Spanish NIF.
 */
export interface Taxpayer {
  /** Legal name (up to 120 chars). */
  legalName: string;
  /** 9-char Spanish tax identifier. */
  nif: string;
}

/**
 * Advisor / representative acting on behalf of a {@link Taxpayer}.
 */
export type Representative = Taxpayer;

/**
 * Producer-software descriptor (mirror of `SistemaInformaticoType`).
 *
 * Either {@link nif} (Spanish producer) or {@link alternateId} (foreign producer)
 * is required.
 */
export interface BillingSystem {
  /** Producer legal name (up to 120 chars). */
  producerName: string;
  /** Spanish NIF of the producer; mutually exclusive with {@link alternateId}. */
  nif?: string;
  /** Foreign/alternate id of the producer; mutually exclusive with {@link nif}. */
  alternateId?: AlternateIdentifier;
  /** Commercial name of the billing system (up to 30 chars). */
  systemName: string;
  /** Two-character producer code, `[A-Z0-9]`, `Ñ` excluded. */
  systemId: string;
  /** Free-form version label (up to 50 chars). */
  version: string;
  /** Per-installation identifier (up to 100 chars). */
  installationNumber: string;
  /** `'S'` if the system can only operate in VERI*FACTU mode. */
  onlyVerifactu: YesNo;
  /** `'S'` if the system can be used by multiple taxpayers. */
  multipleTaxpayer: YesNo;
  /** `'S'` if the current installation actually serves multiple taxpayers. */
  hasMultipleTaxpayers: YesNo;
}

/**
 * Triple identifying an invoice on the wire.
 *
 * Dates use the public ISO form (`YYYY-MM-DD`); the wire mapper translates to
 * the AEAT `DD-MM-YYYY` representation during serialisation.
 */
export interface InvoiceId {
  /** NIF of the issuer (`IDEmisorFactura`). */
  issuerNif: string;
  /** Series + number string, 1–60 chars (`NumSerieFactura`). */
  seriesNumber: string;
  /** Issue date in ISO `YYYY-MM-DD` form (`FechaExpedicionFactura`). */
  issueDate: string;
}

/**
 * Pointer to the previous record in the hash chain.
 *
 * Either {@link first} is `true` (this is the first record) or the four
 * `previous*` fields are all populated.
 */
export interface ChainLink {
  /** `true` only for the very first record submitted by this taxpayer. */
  first: boolean;
  /** Previous record's issuer NIF (omit when {@link first} is `true`). */
  previousIssuerNif?: string;
  /** Previous record's series + number (omit when {@link first} is `true`). */
  previousSeriesNumber?: string;
  /** Previous record's issue date in ISO form (omit when {@link first} is `true`). */
  previousIssueDate?: string;
  /** Previous record's hash, 64 uppercase hex chars (omit when {@link first} is `true`). */
  previousHash?: string;
}

/**
 * One line of an invoice's tax breakdown.
 *
 * Each line carries either an operation qualification ({@link operationQualification})
 * or an exemption reason ({@link exemptionReason}) — never both.
 */
export interface BreakdownItem {
  /** Tax code (`Impuesto`). Optional only for legacy compatibility; usually set. */
  tax?: TaxCode;
  /** Regime key (`ClaveRegimen`). */
  regimeKey?: RegimeKey;
  /** Operation qualification; mutually exclusive with {@link exemptionReason}. */
  operationQualification?: OperationQualification;
  /** Exemption reason; mutually exclusive with {@link operationQualification}. */
  exemptionReason?: ExemptionReason;
  /** Tax rate (percentage, e.g. `'21'`, `'4.0'`, `'0'`). */
  taxRate?: string;
  /** Taxable base or non-subject amount (`BaseImponibleOimporteNoSujeto`). */
  taxBase: string;
  /** Cost-based taxable base (`BaseImponibleACoste`). */
  taxBaseAtCost?: string;
  /** Repercussed amount (`CuotaRepercutida`). */
  taxAmount?: string;
  /** Equivalence surcharge rate (`TipoRecargoEquivalencia`). */
  equivalenceSurchargeRate?: string;
  /** Equivalence surcharge amount (`CuotaRecargoEquivalencia`). */
  equivalenceSurchargeAmount?: string;
}

/**
 * Substitutive-rectification breakdown carried only when the invoice is a
 * substitutive rectifying invoice (`TipoRectificativa = 'S'`).
 */
export interface RectificationBreakdown {
  /** Rectified base (`BaseRectificada`). */
  rectifiedBase: string;
  /** Rectified tax amount (`CuotaRectificada`). */
  rectifiedTaxAmount: string;
  /** Rectified equivalence surcharge amount, if any (`CuotaRecargoRectificado`). */
  rectifiedSurchargeAmount?: string;
}

/**
 * Submission-mode envelope choice in the header (`Cabecera`).
 *
 * Either {@link voluntary} (VERI*FACTU mode) or {@link onRequest} (under AEAT
 * requirement) is set, never both.
 */
export interface HeaderModeVoluntary {
  /** Date the taxpayer stops VERI*FACTU adherence (DD-MM-YYYY, always 31-12-YYYY). */
  endOfVerifactuDate?: string;
  /** `'S'` when a generation incident occurred while producing the records. */
  incident?: YesNo;
}

/**
 * On-request submission header sub-block.
 */
export interface HeaderModeOnRequest {
  /** AEAT requirement reference (up to 18 chars). */
  requirementReference: string;
  /** `'S'` when this submission is the final one for the requirement. */
  isFinal?: YesNo;
}

/**
 * Full English-named registration input (`RegistroAlta`).
 */
export interface Invoice {
  /** Triple identifying the invoice. */
  invoiceId: InvoiceId;
  /** Optional caller-supplied external reference. */
  externalReference?: string;
  /** Legal name of the issuer (mirrors `NombreRazonEmisor`). */
  issuerName: string;
  /** `'S'` when this submission supersedes a prior incorrectly-issued record. */
  correction?: YesNo;
  /** Prior-rejection flag (`'N'`/`'S'`/`'X'`). */
  priorRejection?: 'N' | 'S' | 'X';
  /** Invoice-type code (L4). */
  invoiceType: InvoiceType;
  /** Required when {@link invoiceType} starts with `'R'`. */
  rectificationKind?: RectificationKind;
  /** Identifiers of the invoices being rectified. */
  rectifiedInvoices?: InvoiceId[];
  /** Identifiers of the invoices being substituted (only `F3`). */
  substitutedInvoices?: InvoiceId[];
  /** Substitutive-rectification breakdown (only when `rectificationKind === 'S'`). */
  rectificationBreakdown?: RectificationBreakdown;
  /** Operation date (ISO) when distinct from {@link invoiceId.issueDate}. */
  operationDate?: string;
  /** Operation description (up to 500 chars). */
  description: string;
  /** `'S'` when the invoice qualifies under art. 7.2/7.3 RD 1619/2012. */
  simplifiedArt7273?: YesNo;
  /** `'S'` when the invoice has no recipient identification (art. 6.1.d). */
  withoutRecipientArt61d?: YesNo;
  /** `'S'` when the total amount exceeds the AEAT macrodata threshold. */
  macroData?: YesNo;
  /** Issued by a third party (`'T'`) or by the recipient itself (`'D'`). */
  issuedBy?: 'T' | 'D';
  /** Third-party / self-billing recipient details. */
  thirdParty?: Counterpart;
  /** List of recipients (omit for F2/R5 invoices). */
  recipients?: Recipient[];
  /** `'S'` when the invoice includes a coupon-related base reduction. */
  coupon?: YesNo;
  /** Tax-breakdown lines (1–12 entries). */
  breakdown: BreakdownItem[];
  /** Sum of repercussed amounts (`CuotaTotal`). */
  totalTaxAmount: string;
  /** Total invoiced amount (`ImporteTotal`). */
  totalAmount: string;
  /** Producer-software descriptor — usually filled in by the client. */
  billingSystem: BillingSystem;
  /** ISO 8601 timestamp with timezone when the record was generated. */
  generatedAt: string;
  /** Invoicing-agreement number (up to 15 chars). */
  agreementNumber?: string;
  /** SIF agreement identifier (up to 16 chars). */
  systemAgreementId?: string;
  /** Chain link — usually filled in by the client. */
  chainLink: ChainLink;
  /** SHA-256 hash of the record — filled in by the client. */
  hash: string;
}

/**
 * Cancellation input (`RegistroAnulacion`).
 */
export interface CancelInvoiceInput {
  /** Identifier of the invoice to cancel. */
  cancelledInvoiceId: InvoiceId;
  /** Optional caller-supplied external reference. */
  externalReference?: string;
  /** `'S'` when the invoice never existed in AEAT (rare; usually omitted). */
  withoutPriorRecord?: YesNo;
  /** Prior-rejection flag for the cancellation event. */
  priorRejection?: YesNo;
  /** Who emits the cancellation: `'E'` issuer, `'D'` recipient, `'T'` third party. */
  generatedBy?: 'E' | 'D' | 'T';
  /** Identifier of the cancellation generator (required when {@link generatedBy} is set). */
  generator?: Counterpart;
  /** Chain link. */
  chainLink: ChainLink;
  /** Producer-software descriptor. */
  billingSystem: BillingSystem;
  /** ISO 8601 timestamp with timezone when the cancellation was generated. */
  generatedAt: string;
  /** SHA-256 hash of the cancellation record. */
  hash: string;
}

/**
 * Per-record outcome of a submission response.
 */
export interface RegisterInvoiceRecordResult {
  /** Identifier of the record this entry refers to. */
  invoiceId: InvoiceId;
  /** AEAT-reported operation type. */
  operation: 'Alta' | 'Anulacion';
  /** External reference echoed back from the request. */
  externalReference?: string;
  /** State of this record (L19). */
  state: RecordState;
  /** AEAT error code, if any. */
  errorCode?: number;
  /** AEAT error description, if any. */
  errorDescription?: string;
}

/**
 * Full submission response (`RespuestaRegFactuSistemaFacturacion`).
 */
export interface RegisterInvoiceResponse {
  /** AEAT CSV (Código Seguro de Verificación). Omitted when the envelope is rejected. */
  csv?: string;
  /** Throttling delay (seconds) the SDK must respect before the next submission. */
  waitSeconds: number;
  /** Global state of this submission (L18). */
  envelopeState: EnvelopeState;
  /** Per-record outcomes. */
  records: RegisterInvoiceRecordResult[];
}

/**
 * Page filter for `client.queryInvoices`.
 */
export interface QueryFilter {
  /** Fiscal year (e.g. `'2026'`). */
  year: string;
  /** Month code, `'01'`–`'12'`. */
  period: string;
  /** Optional series + number filter. */
  seriesNumber?: string;
  /** Optional counterpart filter. */
  counterpart?: Counterpart;
  /** Optional external reference filter. */
  externalReference?: string;
  /** Optional pagination cursor — propagated from {@link QueryResultPage.nextCursor}. */
  cursor?: InvoiceId;
}

/**
 * One page of query results (`RespuestaConsultaFactuSistemaFacturacion`).
 */
export interface QueryResultPage {
  /** Records in the current page. */
  records: ReadonlyArray<{
    /** Identifier of this record. */
    invoiceId: InvoiceId;
    /** Stored-record state. */
    state: StoredRecordState;
    /** ISO timestamp of the last AEAT-side modification. */
    lastModifiedAt: string;
  }>;
  /** Cursor to obtain the next page, or `undefined` when no more pages exist. */
  nextCursor?: InvoiceId;
}
