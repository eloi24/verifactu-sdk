/**
 * SOAP 1.1 Document/Literal client with mTLS via undici.
 *
 * Thin wrapper around {@link import('undici').Agent} that POSTs SOAP envelopes
 * to the AEAT and surfaces transport-level failures as {@link NetworkError}.
 * The client is stateless from the caller's perspective; it owns a single
 * {@link Dispatcher} configured with the supplied client certificate that
 * stays open for keep-alive and connection reuse.
 *
 * @module
 */

import { Agent, type Dispatcher, request } from 'undici';
import { SDK_VERSION } from '../index.js';
import { NetworkError } from '../xml/errors.js';

/**
 * Shape of the transport used to issue HTTP requests.
 *
 * Defaults to undici's {@link request}. Injectable via {@link SoapClientOptions}
 * so tests can swap the implementation without booting a real socket — the
 * mock-server harness under `test/integration/mock/` exploits this.
 */
export type SoapTransport = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    dispatcher?: Dispatcher;
    bodyTimeout: number;
    headersTimeout: number;
  },
) => Promise<{
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: { text(): Promise<string> };
}>;

/**
 * Client certificate material accepted by the SOAP client.
 *
 * `PfxCertificate` is the most common form for AEAT certificates (`.pfx` or
 * `.p12` binary blob with a passphrase). `PemCertificate` covers split
 * key+cert PEM files used by sello certificates and CI test harnesses.
 */
export type ClientCertificate = PfxCertificate | PemCertificate;

/**
 * PKCS#12 certificate material (`.pfx`/`.p12` file).
 */
export interface PfxCertificate {
  /** Raw PKCS#12 bytes. */
  pfx: Buffer | Uint8Array;
  /** Passphrase protecting the PFX. */
  passphrase: string;
}

/**
 * PEM key + cert pair.
 */
export interface PemCertificate {
  /** PEM-encoded private key. */
  key: Buffer | string;
  /** PEM-encoded certificate chain (leaf first). */
  cert: Buffer | string;
  /** Optional passphrase for the PEM key. */
  passphrase?: string;
}

/**
 * Construction options for {@link SoapClient}.
 */
export interface SoapClientOptions {
  /** Client certificate material used for mTLS. */
  certificate: ClientCertificate;
  /**
   * Override for the `User-Agent` header.
   *
   * @defaultValue `verifactu-sdk/${SDK_VERSION}`
   */
  userAgent?: string;
  /**
   * Override for the per-request timeout (milliseconds).
   *
   * @defaultValue 60_000
   */
  timeoutMs?: number;
  /**
   * Optional pre-built {@link Dispatcher} — when set, this dispatcher is used
   * verbatim (the client certificate fields are ignored). Useful for tests
   * that want to swap in `MockAgent`.
   */
  dispatcher?: Dispatcher;
  /**
   * Optional transport override. When provided, replaces the default undici
   * `request` function. Used by integration tests to stub the network layer
   * without standing up a real HTTPS server.
   */
  transport?: SoapTransport;
}

/**
 * Decoded response from {@link SoapClient.call}.
 */
export interface SoapCallResult {
  /** HTTP status code. */
  status: number;
  /** Response body as UTF-8 string. */
  body: string;
  /** Response headers, lowercased. */
  headers: Record<string, string>;
}

/**
 * SOAP 1.1 client over HTTPS with mutual TLS.
 *
 * Reuses a single {@link Agent} per instance so connection setup is amortised
 * across calls (the AEAT recommends keep-alive: see SWeb §6.4 for the flow
 * control caveats).
 *
 * @example
 * ```ts
 * const client = new SoapClient({ certificate: { pfx, passphrase: '...' } });
 * const result = await client.call(endpoint, '', envelope);
 * if (result.status === 200) {
 *   parseRespuestaSuministro(result.body);
 * }
 * ```
 */
export class SoapClient {
  private readonly dispatcher: Dispatcher | undefined;
  private readonly transport: SoapTransport;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly ownsDispatcher: boolean;

  /**
   * @param options - Certificate, dispatcher overrides and timeout.
   */
  public constructor(options: SoapClientOptions) {
    this.userAgent = options.userAgent ?? `verifactu-sdk/${SDK_VERSION}`;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.transport = options.transport ?? (request as unknown as SoapTransport);
    if (options.transport !== undefined) {
      this.dispatcher = options.dispatcher;
      this.ownsDispatcher = false;
    } else if (options.dispatcher !== undefined) {
      this.dispatcher = options.dispatcher;
      this.ownsDispatcher = false;
    } else {
      this.dispatcher = buildAgent(options.certificate, this.timeoutMs);
      this.ownsDispatcher = true;
    }
  }

  /**
   * Send a single SOAP envelope to the supplied endpoint.
   *
   * @param endpoint - Fully-qualified `https://…` URL of the SOAP endpoint.
   * @param soapAction - Value of the `SOAPAction` header. The AEAT WSDL
   *   leaves this empty; pass `""` unless instructed otherwise.
   * @param envelope - Serialised UTF-8 XML envelope.
   * @returns The HTTP response — status, body and headers.
   * @throws {NetworkError} If the request fails before producing a parseable
   *   response (DNS, TLS, socket close, timeout). Also thrown on non-2xx
   *   responses; the body is preserved for inspection.
   * @example
   * ```ts
   * const result = await client.call(
   *   'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
   *   '',
   *   envelopeXml,
   * );
   * ```
   */
  public async call(
    endpoint: string,
    soapAction: string,
    envelope: string,
  ): Promise<SoapCallResult> {
    const headers: Record<string, string> = {
      'content-type': 'text/xml; charset=utf-8',
      soapaction: `"${soapAction}"`,
      'user-agent': this.userAgent,
      accept: 'text/xml',
    };

    let response: Awaited<ReturnType<SoapTransport>>;
    try {
      response = await this.transport(endpoint, {
        method: 'POST',
        headers,
        body: envelope,
        ...(this.dispatcher !== undefined ? { dispatcher: this.dispatcher } : {}),
        bodyTimeout: this.timeoutMs,
        headersTimeout: this.timeoutMs,
      });
    } catch (error) {
      throw new NetworkError(`SOAP transport error contacting ${endpoint}`, {
        retryable: isRetryableError(error),
        cause: error,
      });
    }

    const body = await response.body.text();
    const status = response.statusCode;
    const responseHeaders = normaliseHeaders(response.headers);

    if (status < 200 || status >= 300) {
      throw new NetworkError(`AEAT responded with HTTP ${status}`, {
        status,
        body,
        retryable: status === 503 || status === 504 || status === 408 || status === 429,
      });
    }

    return { status, body, headers: responseHeaders };
  }

  /**
   * Release any resources owned by the client.
   *
   * Closes the internal {@link Agent} when one was created by this instance.
   * A no-op when the dispatcher was injected by the caller.
   */
  public async close(): Promise<void> {
    if (this.ownsDispatcher && this.dispatcher !== undefined) {
      await this.dispatcher.close();
    }
  }
}

/**
 * Build an {@link Agent} configured for mTLS with the given certificate.
 */
function buildAgent(certificate: ClientCertificate, timeoutMs: number): Agent {
  const connect = certificateToConnectOptions(certificate);
  return new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 600_000,
    bodyTimeout: timeoutMs,
    headersTimeout: timeoutMs,
    connect,
  });
}

/**
 * Map the SDK certificate union to the connect options understood by undici.
 */
function certificateToConnectOptions(certificate: ClientCertificate): Record<string, unknown> {
  if ('pfx' in certificate) {
    return {
      pfx: certificate.pfx,
      passphrase: certificate.passphrase,
      rejectUnauthorized: true,
    };
  }
  return {
    key: certificate.key,
    cert: certificate.cert,
    ...(certificate.passphrase !== undefined ? { passphrase: certificate.passphrase } : {}),
    rejectUnauthorized: true,
  };
}

/**
 * Lowercase the response header map and coerce array values to comma-joined
 * strings. undici returns headers as `Record<string, string | string[]>`.
 */
function normaliseHeaders(
  input: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
}

/**
 * Decide whether an undici/Node error should be retried.
 *
 * Retryable: socket-level errors that may succeed on the next attempt
 * (`ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN`). Not retryable: TLS errors,
 * configuration errors.
 */
function isRetryableError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (typeof code === 'string') {
    return (
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNREFUSED' ||
      code === 'EAI_AGAIN' ||
      code === 'EPIPE' ||
      code === 'UND_ERR_SOCKET' ||
      code === 'UND_ERR_HEADERS_TIMEOUT' ||
      code === 'UND_ERR_BODY_TIMEOUT'
    );
  }
  return false;
}
