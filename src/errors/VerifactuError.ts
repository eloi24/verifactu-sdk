/**
 * Base class for every error thrown by the verifactu-sdk.
 *
 * The hierarchy follows the AEAT error model: each subclass corresponds to a
 * distinct failure layer (schema, business, SOAP envelope, network, flow
 * control). Throwing through these classes — rather than bare `Error` — lets
 * downstream consumers handle errors structurally, e.g.
 *
 * ```ts
 * try { await client.registerInvoice(invoice); }
 * catch (err) {
 *   if (err instanceof BusinessValidationError) { ... }
 *   else if (err instanceof SoapFaultError) { ... }
 * }
 * ```
 *
 * @module
 */

/**
 * Per-AEAT error category.
 *
 * - `'envelope'` — the entire submission is rejected (4xxx codes).
 * - `'record'` — only the affected record is rejected (1xxx, 3xxx codes).
 * - `'admissible'` — the record is accepted but must be subsanado (2xxx codes).
 */
export type ErrorCategory = 'envelope' | 'record' | 'admissible';

/**
 * Identifier triple of the invoice the error refers to.
 *
 * Provided whenever the error can be attributed to a specific invoice line,
 * which lets the CLI and integration layer correlate it with the originating
 * record.
 */
export interface VerifactuErrorInvoiceId {
  /** NIF of the invoice issuer. */
  readonly issuerNif: string;
  /** Series + number string. */
  readonly seriesNumber: string;
  /** Issue date in ISO `YYYY-MM-DD` form. */
  readonly issueDate: string;
}

/**
 * Constructor options shared by every {@link VerifactuError} subclass.
 */
export interface VerifactuErrorOptions {
  /** AEAT error code (e.g. `'1108'`); omitted when the SDK detects the issue locally without a catalog mapping. */
  readonly code?: string;
  /** AEAT category derived from the catalog. */
  readonly category?: ErrorCategory;
  /** Dotted path of the offending field (e.g. `'breakdown.0.taxRate'`). */
  readonly field?: string;
  /** Triple identifying the invoice the error belongs to. */
  readonly invoiceId?: VerifactuErrorInvoiceId;
  /** Underlying cause, propagated via `Error.cause`. */
  readonly cause?: unknown;
}

/**
 * Common base class — all SDK errors extend this.
 *
 * @example
 * ```ts
 * try { ... } catch (err) {
 *   if (err instanceof VerifactuError) {
 *     console.error(err.code, err.category, err.field);
 *   }
 * }
 * ```
 */
export class VerifactuError extends Error {
  /** AEAT error code, when known. */
  readonly code: string | undefined;
  /** AEAT category, when known. */
  readonly category: ErrorCategory | undefined;
  /** Field path (dotted) of the offending value. */
  readonly field: string | undefined;
  /** Invoice identifier the error pertains to. */
  readonly invoiceId: VerifactuErrorInvoiceId | undefined;

  /**
   * Build a new {@link VerifactuError}.
   *
   * @param message - Human-readable English description of the failure.
   * @param options - Optional metadata enriching the error context.
   */
  constructor(message: string, options: VerifactuErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'VerifactuError';
    this.code = options.code;
    this.category = options.category;
    this.field = options.field;
    this.invoiceId = options.invoiceId;
  }
}

/**
 * Error raised when a value fails a structural (schema-level) check.
 *
 * Typically wraps a Zod issue or a syntactic AEAT validation. Synonymous with
 * `Errores no admisibles` of category `record`, but the catalog `code` is
 * unset when the failure is detected locally before submission.
 *
 * @example
 * ```ts
 * throw new SchemaValidationError('FechaExpedicionFactura must be DD-MM-YYYY', {
 *   field: 'invoiceId.issueDate',
 * });
 * ```
 */
export class SchemaValidationError extends VerifactuError {
  /**
   * @param message - English description of the schema mismatch.
   * @param options - Optional metadata; `field` is highly recommended.
   */
  constructor(message: string, options: VerifactuErrorOptions = {}) {
    super(message, options);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Error raised by the cross-field business-rule validator (`validators/businessRules.ts`).
 *
 * Each instance corresponds to one rule violation (e.g. AEAT 1108 / 1146 /
 * 1199). Multiple violations are returned as an array of `ValidationResult`
 * by the validator; this error is the *thrown* form when the caller asks for
 * fail-fast behaviour.
 *
 * @example
 * ```ts
 * throw new BusinessValidationError('ClaveRegimen 11 requires TipoImpositivo 21', {
 *   code: '1206',
 *   category: 'record',
 *   field: 'breakdown.0.taxRate',
 * });
 * ```
 */
export class BusinessValidationError extends VerifactuError {
  /**
   * @param message - English description of the rule violation.
   * @param options - Optional metadata; populate `code` when the rule maps to a catalog entry.
   */
  constructor(message: string, options: VerifactuErrorOptions = {}) {
    super(message, options);
    this.name = 'BusinessValidationError';
  }
}

/**
 * Information extracted from a `<soapenv:Fault>` block.
 */
export interface SoapFaultDetail {
  /** `<faultcode>` value (e.g. `soapenv:Server`, `soapenv:Client`). */
  readonly faultcode: string;
  /** `<faultstring>` value — human-readable fault description. */
  readonly faultstring: string;
  /** Optional `<faultactor>` URI. */
  readonly faultactor?: string;
  /** Optional `<detail>` block, stringified as XML for caller inspection. */
  readonly detail?: string;
}

/**
 * Constructor options for {@link SoapFaultError}, layering SOAP-specific fault
 * metadata on top of the standard {@link VerifactuErrorOptions}.
 */
export interface SoapFaultErrorOptions extends VerifactuErrorOptions {
  /** `<faultcode>` value. */
  readonly faultcode?: string;
  /** `<faultstring>` value. */
  readonly faultstring?: string;
  /** Optional `<faultactor>` value. */
  readonly faultactor?: string;
  /** Optional `<detail>` value as raw XML. */
  readonly detail?: string;
}

/**
 * Error raised when the AEAT returns a SOAP fault.
 *
 * Produced by `parseSoapFault` (from the `faultstring`) and by the XML parser
 * when it encounters a `<soapenv:Fault>` envelope. The {@link code} field
 * carries the AEAT error code parsed from the `Codigo[XXXX]` token; the
 * {@link faultcode}/{@link faultstring} fields preserve the verbatim SOAP
 * payload for diagnostic logging.
 *
 * @example
 * ```ts
 * const err = parseSoapFault(faultString);
 * throw err;
 * ```
 */
export class SoapFaultError extends VerifactuError {
  /** `<faultcode>` value (when produced from a raw SOAP fault). */
  readonly faultcode: string | undefined;
  /** `<faultstring>` value (when produced from a raw SOAP fault). */
  readonly faultstring: string | undefined;
  /** Optional `<faultactor>` value. */
  readonly faultactor: string | undefined;
  /** Optional `<detail>` value as raw XML. */
  readonly detail: string | undefined;

  /**
   * Construct a {@link SoapFaultError} from either a plain message + options
   * pair or a raw {@link SoapFaultDetail} block (legacy protocol-layer call
   * site).
   *
   * @param messageOrFault - English message or the raw SOAP fault detail.
   * @param options - Optional metadata; ignored when the first argument is a
   *   {@link SoapFaultDetail}.
   */
  constructor(messageOrFault: string | SoapFaultDetail, options: SoapFaultErrorOptions = {}) {
    if (typeof messageOrFault === 'string') {
      super(messageOrFault, options);
      this.faultcode = options.faultcode;
      this.faultstring = options.faultstring;
      this.faultactor = options.faultactor;
      this.detail = options.detail;
    } else {
      const fault = messageOrFault;
      super(`SOAP fault ${fault.faultcode}: ${fault.faultstring}`, options);
      this.faultcode = fault.faultcode;
      this.faultstring = fault.faultstring;
      this.faultactor = fault.faultactor;
      this.detail = fault.detail;
    }
    this.name = 'SoapFaultError';
  }
}

/**
 * Constructor options for {@link NetworkError}, layering transport-specific
 * metadata on top of the standard {@link VerifactuErrorOptions}.
 */
export interface NetworkErrorOptions extends VerifactuErrorOptions {
  /** HTTP status code, when one was received. */
  readonly status?: number;
  /** Response body (truncated for safety), when one was received. */
  readonly body?: string;
  /** Whether the controller should retry this request. */
  readonly retryable?: boolean;
}

/**
 * Error raised when the underlying transport fails (DNS, TLS, timeout, …)
 * or when the AEAT responds with a non-success HTTP status.
 *
 * The {@link retryable} flag tells the
 * {@link import('../client/flowControl.js').FlowController} whether to retry
 * the call automatically.
 *
 * @example
 * ```ts
 * try { await fetch(...) } catch (cause) {
 *   throw new NetworkError('Failed to reach the AEAT endpoint', { cause });
 * }
 * ```
 */
export class NetworkError extends VerifactuError {
  /** HTTP status code if available, otherwise `undefined`. */
  readonly status: number | undefined;
  /** Response body (truncated for safety) when one was received. */
  readonly body: string | undefined;
  /** Whether the controller should retry this request. */
  readonly retryable: boolean;

  /**
   * @param message - English description of the transport failure.
   * @param options - Should pass the original transport error via `cause`; may
   *   include the HTTP status, response body and retry hint.
   */
  constructor(message: string, options: NetworkErrorOptions = {}) {
    super(message, options);
    this.name = 'NetworkError';
    this.status = options.status;
    this.body = options.body;
    this.retryable = options.retryable ?? false;
  }
}

/**
 * Error raised when the SDK detects a flow-control violation (sequence,
 * throttling, ordering) that cannot be recovered automatically.
 *
 * Distinct from {@link NetworkError} because the cause is logical rather than
 * a transport failure: for example, the previous response indicated a wait
 * delay that the caller did not honour.
 *
 * @example
 * ```ts
 * throw new FlowControlError('Caller must wait 60 s before next submission', {
 *   field: 'waitSeconds',
 * });
 * ```
 */
export class FlowControlError extends VerifactuError {
  /**
   * @param message - English description of the flow-control violation.
   * @param options - Optional metadata; `field` is recommended.
   */
  constructor(message: string, options: VerifactuErrorOptions = {}) {
    super(message, options);
    this.name = 'FlowControlError';
  }
}
