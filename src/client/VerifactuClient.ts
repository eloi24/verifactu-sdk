/**
 * High-level VERI*FACTU SDK client.
 *
 * `VerifactuClient` is the integration façade that combines every internal
 * module — schemas, wire transformers, hash chaining, optional XAdES signing,
 * SOAP envelope building/parsing, mTLS transport and flow control — into the
 * small, ergonomic API surface documented in the project README.
 *
 * The client is responsible for:
 *
 * 1. Validating the public input (`Invoice` / `CancelInvoiceInput`) against
 *    the Zod schemas inferred from the AEAT XSDs (via `toWire(...)`).
 * 2. Computing the chained SHA-256 hash, reading the previous tail from the
 *    pluggable {@link HashStore} and writing the new tail once the AEAT
 *    answers — rejected records included, since the chain links every record
 *    generated.
 * 3. Optionally signing the per-record XML with XAdES-BES when the client is
 *    configured for `'onRequest'` mode.
 * 4. Building the SOAP envelope and submitting it through {@link FlowController}
 *    which honours the AEAT `TiempoEsperaEnvio` and the 1000-records-per-batch
 *    cap.
 * 5. Parsing the AEAT response, translating wire field names back to English
 *    and throwing the appropriate {@link VerifactuError} subclass on failure.
 *
 * A single instance is safe to share across concurrent submissions for the
 * same taxpayer: a per-instance lock serialises every chain update (read tail
 * → hash → submit → append), and the {@link FlowController} paces the calls.
 * Serialising across processes is the {@link HashStore}'s job.
 *
 * @module
 */

import type { z } from 'zod';
import { ERROR_CATALOG } from '../errors/catalog.js';
import {
  BusinessValidationError,
  type ErrorCategory,
  SchemaValidationError,
} from '../errors/index.js';
import { computeRegistroAltaHash, computeRegistroAnulacionHash } from '../hash/index.js';
import { buildQrUrl } from '../qr/buildUrl.js';
import { type RenderQrOptions, renderQrDataUrl, renderQrPng, renderQrSvg } from '../qr/index.js';
import {
  type Cabecera,
  type CabeceraConsulta,
  type FiltroConsulta,
  type Periodo,
  type RegistroAlta,
  RegistroAltaSchema,
  type RegistroAnulacion,
  RegistroAnulacionSchema,
} from '../schemas/index.js';
import { type LoadedCertificate, loadCertificate } from '../signature/index.js';
import { signRegistro } from '../signature/signXml.js';
import type { HashStore, HashStoreEntry } from '../store/index.js';
import type {
  CancelInvoiceInput,
  Invoice,
  InvoiceId,
  QueryFilter,
  QueryResultPage,
  RegisterInvoiceResponse,
  Representative,
  Taxpayer,
} from '../types.js';
import { validateInvoiceForCancel, validateInvoiceForRegister } from '../validators/index.js';
import {
  cancelInvoiceToWire,
  counterpartToWire,
  invoiceIdFromWire,
  invoiceIdToWire,
  invoiceToWire,
} from '../wire/index.js';
import {
  MAX_RECORDS_PER_ENVELOPE,
  type RegistroFacturaEntry,
  buildConsultaFactuEnvelope,
  buildRegFactuEnvelope,
} from '../xml/builder.js';
import { parseRespuestaConsulta, parseRespuestaSuministro } from '../xml/parser.js';
import { type Environment, type Mode, resolveEndpoint } from './endpoints.js';
import { FlowController, type FlowControllerOptions } from './flowControl.js';
import { type ClientCertificate, SoapClient, type SoapTransport } from './soap.js';

/**
 * Constructor options for {@link VerifactuClient}.
 */
export interface VerifactuClientOptions {
  /** Target AEAT environment. */
  readonly environment: Environment;
  /** Submission mode — voluntary VERI*FACTU or on-request. */
  readonly mode: Mode;
  /** Client certificate used for mTLS (and XAdES signing in on-request mode). */
  readonly certificate: ClientCertificate;
  /** Tax-obligated party identification (NIF + legal name). */
  readonly taxpayer: Taxpayer;
  /** Optional representative (advisor/agent) acting on behalf of the taxpayer. */
  readonly representative?: Representative;
  /** Producer-software descriptor; appended to every record. */
  readonly billingSystem: Invoice['billingSystem'];
  /**
   * Pluggable hash-chain store. No default -- the chain's durability is a
   * compliance requirement, not something the SDK can safely guess at. Use
   * one of the bundled adapters (`verifactu-sdk/store/{bun-sql,sqlite,pg,mysql,redis,drizzle}`)
   * or implement {@link HashStore} directly.
   */
  readonly hashStore: HashStore;
  /** Override the high-watermark `SistemaInformatico` endpoint (rare). */
  readonly endpoint?: string;
  /** Use the AEAT "with seal" mirror endpoints (`www10` / `prewww10`). */
  readonly withSeal?: boolean;
  /** Flow-control tuning. */
  readonly flowControl?: FlowControllerOptions;
  /** Wall-clock timeout for SOAP calls. Defaults to 60 s. */
  readonly timeoutMs?: number;
  /** AEAT `RefRequerimiento` (mandatory for on-request mode). */
  readonly requirementReference?: string;
  /** `Cabecera.IDVersion` value. Defaults to `'1.0'`. */
  readonly idVersion?: '1.0';
  /**
   * Replaces the HTTP transport so tests can drive the client against a mock
   * AEAT without opening a socket.
   *
   * @internal
   */
  readonly transport?: SoapTransport;
}

/**
 * Input to {@link VerifactuClient.renderQr}.
 */
export interface RenderQrInput {
  /** Issuer NIF. */
  readonly nif: string;
  /** Series + number. */
  readonly seriesNumber: string;
  /** Issue date (ISO `YYYY-MM-DD`). */
  readonly issueDate: string;
  /** Total amount (`ImporteTotal`). */
  readonly totalAmount: string | number;
}

/**
 * Output container of {@link VerifactuClient.renderQr}.
 */
export interface RenderedQr {
  /** Verification URL embedded in the QR. */
  readonly url: string;
  /** Rendered payload: PNG bytes, SVG string or data URL. */
  readonly payload: Buffer | string;
}

const VALID_PERIODS: ReadonlySet<string> = new Set([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
]);

/**
 * High-level SDK client.
 *
 * @example
 * ```ts
 * const client = new VerifactuClient({
 *   environment: 'preproduction',
 *   mode: 'verifactu',
 *   certificate: { pfx: readFileSync('./cert.pfx'), passphrase: 'changeme' },
 *   taxpayer: { nif: 'B12345678', legalName: 'Eloi Baulenas' },
 *   billingSystem: { ... },
 *   hashStore: new SqliteHashStore(new Database('verifactu.sqlite')),
 * });
 *
 * const response = await client.registerInvoice(invoice);
 * console.log(response.csv);
 * ```
 */
export class VerifactuClient {
  readonly #options: VerifactuClientOptions;
  readonly #hashStore: HashStore;
  readonly #soap: SoapClient;
  readonly #flow: FlowController;
  readonly #endpoint: string;
  readonly #loadedCertificate: LoadedCertificate | null;
  readonly #idVersion: '1.0';
  #chainLock: Promise<void> = Promise.resolve();

  /**
   * @param options - Client configuration. See {@link VerifactuClientOptions}.
   */
  constructor(options: VerifactuClientOptions) {
    this.#options = options;
    this.#hashStore = options.hashStore;
    this.#soap = new SoapClient({
      certificate: options.certificate,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.transport !== undefined ? { transport: options.transport } : {}),
    });
    this.#flow = new FlowController(options.flowControl ?? {});
    this.#endpoint =
      options.endpoint ??
      resolveEndpoint({
        mode: options.mode,
        environment: options.environment,
        withSeal: options.withSeal ?? false,
      });
    this.#loadedCertificate =
      options.mode === 'onRequest' ? loadCertificate(options.certificate) : null;
    this.#idVersion = options.idVersion ?? '1.0';
  }

  /**
   * Register a single invoice (alta) with the AEAT.
   *
   * The method runs the full happy-path pipeline: schema validation → business
   * rules → hash chain → XAdES signing (if applicable) → SOAP envelope build →
   * AEAT call (flow-controlled) → response parse.
   *
   * Once the AEAT answers, the record's hash becomes the chain tail even if
   * the record was rejected: the chain links every record *generated*
   * (Orden HAC/1177/2024 art. 7.i), so a rejection is fixed by a later
   * subsanación rather than by rewinding the chain. Nothing is persisted when
   * the call throws. Retry with the same `invoice` (same `generatedAt`): its
   * hash comes out identical, so if the lost attempt had reached the AEAT the
   * retry is answered as a duplicate — see
   * {@link RegisterInvoiceRecordResult.duplicateRecord}.
   *
   * Chain updates are serialised per client, so concurrent calls on one
   * instance never read the same tail.
   *
   * @param invoice - Public English-named invoice payload.
   * @returns The AEAT response with CSV, throttling delay and per-record state.
   * @throws {SchemaValidationError} If the payload fails the Zod schema.
   * @throws {BusinessValidationError} If a business rule is violated locally.
   * @throws {SoapFaultError} If the AEAT returns a `<soapenv:Fault>`.
   * @throws {NetworkError} If the transport fails.
   */
  async registerInvoice(invoice: Invoice): Promise<RegisterInvoiceResponse> {
    this.#runBusinessValidation(invoice, 'register');
    const release = await this.#acquireChainLock();
    try {
      const wire = invoiceToWire(invoice);
      this.#stampAltaHash(wire, await this.#readTail());
      this.#runSchemaValidation(RegistroAltaSchema, wire, 'register');
      const entry: RegistroFacturaEntry = { kind: 'alta', record: wire };
      const response = await this.#submit([entry]);
      await this.#persistHash(invoice.invoiceId, wire.Huella);
      return response;
    } finally {
      release();
    }
  }

  /**
   * Cancel (anular) a previously registered invoice.
   *
   * Chains and persists exactly like {@link registerInvoice}, including the
   * retry contract on `generatedAt`.
   *
   * @param input - Public English-named cancellation payload.
   * @returns The AEAT response with CSV, throttling delay and per-record state.
   * @throws {SchemaValidationError} On schema failure.
   * @throws {BusinessValidationError} On business-rule violation.
   * @throws {SoapFaultError} On AEAT-side fault.
   * @throws {NetworkError} On transport failure.
   */
  async cancelInvoice(input: CancelInvoiceInput): Promise<RegisterInvoiceResponse> {
    this.#runBusinessValidation(input, 'cancel');
    const release = await this.#acquireChainLock();
    try {
      const wire = cancelInvoiceToWire(input);
      this.#stampAnulacionHash(wire, await this.#readTail());
      this.#runSchemaValidation(RegistroAnulacionSchema, wire, 'cancel');
      const entry: RegistroFacturaEntry = { kind: 'anulacion', record: wire };
      const response = await this.#submit([entry]);
      await this.#persistHash(input.cancelledInvoiceId, wire.Huella);
      return response;
    } finally {
      release();
    }
  }

  /**
   * Submit a batch of mixed alta/anulación records in a single envelope.
   *
   * The batch is automatically split into ≤ 1000-record chunks; the SDK
   * iterates the chunks while honouring the flow-control delay. Each chunk's
   * response is yielded individually so callers can stream-process them.
   *
   * Records chain to each other in order, across chunks. Once a chunk is
   * answered, its last record becomes the chain tail — whatever each record's
   * state, as in {@link registerInvoice} — and only then is the response
   * yielded, so stopping the iteration early never loses an answered chunk.
   * A chunk that throws persists nothing; retrying the remaining records with
   * the same `generatedAt` values reproduces their hashes.
   *
   * The client's chain lock is held from the first `next()` until the
   * iteration completes, throws or is closed (`break` / `return()`): always
   * finish or close the iterator, or later calls on this client wait forever.
   *
   * @param records - Public English-named records (alta or cancellation).
   * @returns Async iterable yielding one {@link RegisterInvoiceResponse} per chunk.
   */
  async *registerBatch(
    records: ReadonlyArray<Invoice | CancelInvoiceInput>,
  ): AsyncIterable<RegisterInvoiceResponse> {
    const release = await this.#acquireChainLock();
    try {
      const wireEntries: RegistroFacturaEntry[] = [];
      const ids: InvoiceId[] = [];
      let tail = await this.#readTail();
      for (const record of records) {
        if (isInvoice(record)) {
          this.#runBusinessValidation(record, 'register');
          const wire = invoiceToWire(record);
          this.#stampAltaHash(wire, tail);
          this.#runSchemaValidation(RegistroAltaSchema, wire, 'register');
          wireEntries.push({ kind: 'alta', record: wire });
          ids.push(record.invoiceId);
          tail = { invoiceId: record.invoiceId, hash: wire.Huella };
        } else {
          this.#runBusinessValidation(record, 'cancel');
          const wire = cancelInvoiceToWire(record);
          this.#stampAnulacionHash(wire, tail);
          this.#runSchemaValidation(RegistroAnulacionSchema, wire, 'cancel');
          wireEntries.push({ kind: 'anulacion', record: wire });
          ids.push(record.cancelledInvoiceId);
          tail = { invoiceId: record.cancelledInvoiceId, hash: wire.Huella };
        }
      }

      for (let i = 0; i < wireEntries.length; i += MAX_RECORDS_PER_ENVELOPE) {
        const chunk = wireEntries.slice(i, i + MAX_RECORDS_PER_ENVELOPE);
        const lastEntry = chunk.at(-1);
        const lastId = ids[i + chunk.length - 1];
        const response = await this.#submit(chunk);
        // One write per chunk: the store only keeps the tail, and a single
        // write can't leave it pointing at a record mid-chunk.
        if (lastEntry !== undefined && lastId !== undefined) {
          await this.#persistHash(lastId, lastEntry.record.Huella);
        }
        yield response;
      }
    } finally {
      release();
    }
  }

  /**
   * Query previously submitted records (VERI*FACTU mode only).
   *
   * Returns an async iterable that automatically pages through the AEAT
   * response, propagating the `ClavePaginacion` cursor.
   *
   * @param filter - Query filter (year + period required).
   * @yields One {@link QueryResultPage} at a time, in chronological order.
   * @throws {Error} If the client is configured for `'onRequest'` mode (the
   *   consulta service is only available for voluntary submissions).
   */
  async *queryInvoices(filter: QueryFilter): AsyncIterable<QueryResultPage> {
    if (this.#options.mode !== 'verifactu') {
      throw new Error(
        'queryInvoices is only available in verifactu mode; on-request mode has no consulta endpoint.',
      );
    }
    if (!VALID_PERIODS.has(filter.period)) {
      throw new SchemaValidationError(`Invalid period "${filter.period}"; expected '01'..'12'.`, {
        field: 'filter.period',
      });
    }

    let cursor = filter.cursor;
    while (true) {
      const cabeceraConsulta: CabeceraConsulta = {
        IDVersion: this.#idVersion,
        ObligadoEmision: {
          NombreRazon: this.#options.taxpayer.legalName,
          NIF: this.#options.taxpayer.nif,
        },
      };
      const filtro: FiltroConsulta = {
        PeriodoImputacion: {
          Ejercicio: filter.year,
          Periodo: filter.period as Periodo,
        },
        ...(filter.seriesNumber !== undefined ? { NumSerieFactura: filter.seriesNumber } : {}),
        ...(filter.counterpart !== undefined
          ? { Contraparte: counterpartToWire(filter.counterpart) }
          : {}),
        ...(filter.externalReference !== undefined ? { RefExterna: filter.externalReference } : {}),
        ...(cursor !== undefined ? { ClavePaginacion: invoiceIdToWire(cursor) } : {}),
      };
      const envelope = buildConsultaFactuEnvelope({
        Cabecera: cabeceraConsulta,
        FiltroConsulta: filtro,
      });

      const flowResult = await this.#flow.enqueue(async () => {
        const callResult = await this.#soap.call(this.#endpoint, '', envelope);
        const parsed = parseRespuestaConsulta(callResult.body);
        return { waitSeconds: 0, parsed };
      });

      const records = flowResult.parsed.records.map((entry) => ({
        invoiceId: invoiceIdFromWire(entry.IDFactura),
        state: entry.EstadoRegistro.EstadoRegistro,
        lastModifiedAt: entry.EstadoRegistro.TimestampUltimaModificacion,
      }));
      const nextCursor =
        flowResult.parsed.nextCursor !== undefined
          ? invoiceIdFromWire(flowResult.parsed.nextCursor)
          : undefined;
      const page: QueryResultPage =
        nextCursor !== undefined ? { records, nextCursor } : { records };
      yield page;
      if (nextCursor === undefined) return;
      cursor = nextCursor;
    }
  }

  /**
   * Build and render the mandatory tax QR for an invoice.
   *
   * The QR URL is computed via {@link buildQrUrl} using the SDK's configured
   * {@link Environment} and {@link Mode}; the rendering format defaults to PNG.
   *
   * @param input - Identifier triple and total amount of the invoice.
   * @param options - Rendering options (format, size, language).
   * @returns The verification URL plus the rendered payload.
   */
  async renderQr(
    input: RenderQrInput,
    options: RenderQrOptions & {
      format?: 'png' | 'svg' | 'dataurl';
      language?: 'es' | 'en' | 'ca' | 'gl' | 'eu' | 'va';
    } = {},
  ): Promise<RenderedQr> {
    const url = buildQrUrl({
      nif: input.nif,
      numSerieFactura: input.seriesNumber,
      fechaExpedicionFactura: input.issueDate,
      importeTotal: input.totalAmount,
      mode: this.#options.mode === 'verifactu' ? 'verifactu' : 'on-request',
      environment: this.#options.environment,
      ...(options.language !== undefined ? { language: options.language } : {}),
    });
    const format = options.format ?? 'png';
    const renderOpts: RenderQrOptions = {};
    if (options.sizeMm !== undefined) renderOpts.sizeMm = options.sizeMm;
    if (options.dpi !== undefined) renderOpts.dpi = options.dpi;

    if (format === 'png') return { url, payload: await renderQrPng(url, renderOpts) };
    if (format === 'svg') return { url, payload: await renderQrSvg(url, renderOpts) };
    return { url, payload: await renderQrDataUrl(url, renderOpts) };
  }

  // ----------------------------- private helpers -----------------------------

  /**
   * Build the AEAT `Cabecera` block from the constructor's identity options.
   * @internal
   */
  #buildCabecera(): Cabecera {
    const cabecera: Cabecera = {
      ObligadoEmision: {
        NombreRazon: this.#options.taxpayer.legalName,
        NIF: this.#options.taxpayer.nif,
      },
      ...(this.#options.representative !== undefined
        ? {
            Representante: {
              NombreRazon: this.#options.representative.legalName,
              NIF: this.#options.representative.nif,
            },
          }
        : {}),
      ...(this.#options.mode === 'verifactu'
        ? { RemisionVoluntaria: {} }
        : {
            RemisionRequerimiento: {
              RefRequerimiento: this.#options.requirementReference ?? '',
            },
          }),
    } as Cabecera;
    return cabecera;
  }

  /**
   * Run the business-rule validator and convert the first non-admissible
   * issue into a thrown {@link BusinessValidationError}. Admissible issues
   * are tolerated locally since the AEAT itself will mark them as such.
   * @internal
   */
  #runBusinessValidation(value: Invoice | CancelInvoiceInput, kind: 'register' | 'cancel'): void {
    const results =
      kind === 'register'
        ? validateInvoiceForRegister(value as Invoice)
        : validateInvoiceForCancel(value as CancelInvoiceInput);
    const firstRejection = results.find((r) => r.severity === 'rejection');
    if (firstRejection === undefined) return;
    const opts: {
      code?: string;
      category?: ErrorCategory;
      field?: string;
    } = { field: firstRejection.field };
    if (firstRejection.code !== undefined) {
      opts.code = firstRejection.code;
      const catalogEntry = ERROR_CATALOG[firstRejection.code as keyof typeof ERROR_CATALOG];
      if (catalogEntry !== undefined) opts.category = catalogEntry.category;
    }
    throw new BusinessValidationError(firstRejection.message, opts);
  }

  /**
   * Run the Zod schema on a wire object and convert any failure into a
   * {@link SchemaValidationError} with the offending dotted path.
   * @internal
   */
  #runSchemaValidation<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    value: unknown,
    kind: 'register' | 'cancel',
  ): void {
    const result = schema.safeParse(value);
    if (result.success) return;
    const first = result.error.issues[0];
    const fieldPath = first?.path.join('.') ?? '<root>';
    throw new SchemaValidationError(
      `Wire ${kind === 'register' ? 'RegistroAlta' : 'RegistroAnulacion'} failed schema validation at "${fieldPath}": ${first?.message ?? 'unknown issue'}`,
      { field: fieldPath, cause: result.error },
    );
  }

  /**
   * Wait for every earlier chain update on this client, then take the lock.
   *
   * Reading the tail, hashing, submitting and appending must run as one unit:
   * two calls that both read the same tail would fork the chain.
   * @internal
   * @returns A function that releases the lock; call it exactly once.
   */
  async #acquireChainLock(): Promise<() => void> {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.#chainLock;
    this.#chainLock = previous.then(() => held);
    await previous;
    return release;
  }

  /**
   * Read this taxpayer's current chain tail from the store.
   * @internal
   * @returns The last persisted entry, or `null` for an empty chain.
   */
  async #readTail(): Promise<HashStoreEntry | null> {
    return this.#hashStore.getLast(this.#options.taxpayer.nif);
  }

  /**
   * Stamp the chain link + hash on a `RegistroAlta` wire record.
   * @internal
   * @param record - Wire record to mutate.
   * @param tail - Record it chains to, or `null` for the first one.
   */
  #stampAltaHash(record: RegistroAlta, tail: HashStoreEntry | null): void {
    record.Huella = computeRegistroAltaHash(record, this.#applyChainLink(record, tail));
  }

  /**
   * Stamp the chain link + hash on a `RegistroAnulacion` wire record.
   * @internal
   * @param record - Wire record to mutate.
   * @param tail - Record it chains to, or `null` for the first one.
   */
  #stampAnulacionHash(record: RegistroAnulacion, tail: HashStoreEntry | null): void {
    record.Huella = computeRegistroAnulacionHash(record, this.#applyChainLink(record, tail));
  }

  /**
   * Populate the `Encadenamiento` block of any chainable record.
   * @internal
   * @param record - Wire record to mutate.
   * @param tail - Record it chains to, or `null` for the first one.
   * @returns The previous record's hash, or `null` if this is the first record.
   */
  #applyChainLink(
    record: RegistroAlta | RegistroAnulacion,
    tail: HashStoreEntry | null,
  ): string | null {
    if (tail === null) {
      record.Encadenamiento = { PrimerRegistro: 'S' };
      return null;
    }
    record.Encadenamiento = {
      RegistroAnterior: {
        IDEmisorFactura: tail.invoiceId.issuerNif,
        NumSerieFactura: tail.invoiceId.seriesNumber,
        FechaExpedicionFactura: toAeatDate(tail.invoiceId.issueDate),
        Huella: tail.hash,
      },
    };
    return tail.hash;
  }

  /**
   * Append the freshly computed hash to the chain.
   * @internal
   */
  async #persistHash(invoiceId: InvoiceId, hash: string): Promise<void> {
    await this.#hashStore.append(this.#options.taxpayer.nif, { invoiceId, hash });
  }

  /**
   * Build the envelope, optionally sign each record and submit through the
   * flow controller. Returns the parsed response.
   * @internal
   */
  async #submit(entries: RegistroFacturaEntry[]): Promise<RegisterInvoiceResponse> {
    const cabecera = this.#buildCabecera();
    let envelope = buildRegFactuEnvelope({ cabecera, registros: entries });

    if (this.#options.mode === 'onRequest' && this.#loadedCertificate !== null) {
      envelope = await signRegistro(envelope, this.#loadedCertificate);
    }

    const flowResult = await this.#flow.enqueue(async () => {
      const callResult = await this.#soap.call(this.#endpoint, '', envelope);
      const parsed = parseRespuestaSuministro(callResult.body);
      return { waitSeconds: parsed.waitSeconds, parsed };
    });

    return flowResult.parsed;
  }
}

/**
 * Type guard discriminating {@link Invoice} from {@link CancelInvoiceInput}.
 * @internal
 */
function isInvoice(value: Invoice | CancelInvoiceInput): value is Invoice {
  return 'invoiceId' in value;
}

/**
 * Convert ISO `YYYY-MM-DD` to AEAT `DD-MM-YYYY`.
 * @internal
 */
function toAeatDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  if (yyyy === undefined || mm === undefined || dd === undefined) {
    throw new SchemaValidationError(`Invalid ISO date: "${iso}"`, {
      field: 'invoiceId.issueDate',
    });
  }
  return `${dd}-${mm}-${yyyy}`;
}
