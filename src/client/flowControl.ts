/**
 * Flow-control queue for AEAT VERI*FACTU submissions.
 *
 * The AEAT requires every submitter to honour the `TiempoEsperaEnvio` value
 * returned in each successful response: subsequent calls must wait at least
 * that many seconds since the previous submission. Independently, the AEAT
 * caps submissions at 1000 records per envelope. This module owns both
 * concerns:
 *
 * 1. {@link FlowController.enqueue} serialises calls with `concurrency: 1`
 *    and gates each call on the dynamic `waitSeconds` from the previous
 *    response.
 * 2. {@link FlowController.splitBatch} chops oversized record arrays into
 *    envelope-sized chunks.
 * 3. Exponential backoff (1s, 2s, 4s) is applied on retryable
 *    {@link NetworkError}s.
 * 4. Idempotency: when the AEAT signals a duplicate via
 *    {@link FlowController.handleDuplicate}, the caller can decide whether
 *    to treat the existing entry as success or to surface it as a typed
 *    error.
 *
 * @module
 */

import type { RegisterInvoiceResponse } from '../types.js';
import { NetworkError } from '../xml/errors.js';

/**
 * Construction options for {@link FlowController}.
 */
export interface FlowControllerOptions {
  /**
   * Initial wait-seconds value applied before the first call.
   *
   * @defaultValue 60 (the AEAT-mandated default per SWeb §6.4.4.1)
   */
  initialWaitSeconds?: number;
  /**
   * Maximum number of records allowed per envelope.
   *
   * @defaultValue 1000 (XSD `maxOccurs` on `RegistroFactura`)
   */
  maxBatchSize?: number;
  /**
   * Random jitter (milliseconds) added to each wait to spread out concurrent
   * clients hitting the AEAT.
   *
   * @defaultValue 250
   */
  jitterMs?: number;
  /**
   * Maximum number of retries on retryable {@link NetworkError} per call.
   *
   * @defaultValue 3
   */
  maxRetries?: number;
  /**
   * Override for the internal clock — used by tests to advance time
   * deterministically.
   *
   * @internal
   */
  now?: () => number;
  /**
   * Override for the sleep primitive — used by tests to skip the real wait.
   *
   * @internal
   */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * A no-op operation hook surfaced to {@link FlowController.enqueue} so it can
 * propagate the AEAT throttling parameters back to the caller without coupling
 * the queue to the response decoder.
 */
export interface FlowOperationResult {
  /** The AEAT's updated `TiempoEsperaEnvio` (seconds). */
  waitSeconds: number;
}

/**
 * Coordinator that honours the AEAT flow-control protocol.
 *
 * The controller is single-instance per `(NIF, environment)` pair: keep it as
 * a singleton in the parent process so the wait-seconds gate is enforced
 * across logical operations.
 */
export class FlowController {
  private readonly initialWaitSeconds: number;
  private readonly maxBatchSize: number;
  private readonly jitterMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  private nextEarliestSendAt = 0;
  private lastWaitSeconds: number;
  private chain: Promise<unknown> = Promise.resolve();

  /**
   * @param options - Initial wait-seconds, batch size and retry knobs.
   */
  public constructor(options: FlowControllerOptions = {}) {
    this.initialWaitSeconds = options.initialWaitSeconds ?? 60;
    this.maxBatchSize = options.maxBatchSize ?? 1000;
    this.jitterMs = options.jitterMs ?? 250;
    this.maxRetries = options.maxRetries ?? 3;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.lastWaitSeconds = this.initialWaitSeconds;
  }

  /**
   * Current `TiempoEsperaEnvio` value, in seconds.
   */
  public get currentWaitSeconds(): number {
    return this.lastWaitSeconds;
  }

  /**
   * Maximum number of records allowed per envelope.
   */
  public get batchSize(): number {
    return this.maxBatchSize;
  }

  /**
   * Split an array of records into envelope-sized chunks.
   *
   * @param records - Records to chunk.
   * @returns An array of slices, each at most {@link batchSize} long.
   */
  public splitBatch<T>(records: readonly T[]): T[][] {
    if (records.length === 0) {
      return [];
    }
    const chunks: T[][] = [];
    for (let i = 0; i < records.length; i += this.maxBatchSize) {
      chunks.push(records.slice(i, i + this.maxBatchSize));
    }
    return chunks;
  }

  /**
   * Enqueue a SOAP call. The call is serialised against every other enqueued
   * call (concurrency 1), gated on the current wait-seconds, and retried on
   * retryable {@link NetworkError}.
   *
   * @param operation - The SOAP call to execute. Must return at minimum the
   *   AEAT's updated `TiempoEsperaEnvio` so the controller can refresh its
   *   internal gate.
   * @returns Whatever {@link operation} returns.
   * @throws {NetworkError} If the operation throws and the retry budget is
   *   exhausted (or the error is not retryable).
   */
  public async enqueue<T extends FlowOperationResult>(operation: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      await this.waitUntilAllowed();
      const result = await this.executeWithRetries(operation);
      this.recordResponse(result.waitSeconds);
      return result;
    };

    const previous = this.chain;
    const next = previous.then(run, run);
    this.chain = next.catch(() => undefined);
    return next;
  }

  /**
   * Forcefully feed back a {@link RegisterInvoiceResponse} as if it had been
   * returned from an in-queue call. Used by callers that decode the response
   * outside of the controller (e.g. the {@link import('./soap.js').SoapClient}
   * + parser combination).
   *
   * @param response - The decoded AEAT response.
   */
  public ingestResponse(response: RegisterInvoiceResponse): void {
    this.recordResponse(response.waitSeconds);
  }

  /**
   * Inspect a per-line response to decide whether the AEAT signalled the
   * record as a duplicate.
   *
   * The AEAT rejects re-submissions of the same `IDFactura` with the
   * `RegistroDuplicado` block populated; the calling code can then surface
   * that block as a typed success rather than retrying.
   *
   * @param line - One entry of the parsed `RespuestaLinea` array, optionally
   *   carrying the `duplicateRecord` extension produced by the parser.
   * @returns The duplicate-request id when the AEAT signalled a duplicate,
   *   otherwise `undefined`.
   */
  public handleDuplicate(line: { duplicateRecord?: { requestId: string } }): string | undefined {
    return line.duplicateRecord?.requestId;
  }

  private async waitUntilAllowed(): Promise<void> {
    const wait = this.nextEarliestSendAt - this.now();
    if (wait > 0) {
      await this.sleep(wait);
    }
  }

  private recordResponse(waitSeconds: number): void {
    const jitter = this.jitterMs > 0 ? Math.floor(Math.random() * this.jitterMs) : 0;
    this.lastWaitSeconds = waitSeconds;
    this.nextEarliestSendAt = this.now() + waitSeconds * 1000 + jitter;
  }

  private async executeWithRetries<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === this.maxRetries) {
          throw error;
        }
        const backoffMs = 1000 * 2 ** attempt;
        await this.sleep(backoffMs);
        attempt += 1;
      }
    }
    /* istanbul ignore next: loop always exits via return or throw. */
    throw lastError instanceof Error
      ? lastError
      : new NetworkError('FlowController: retries exhausted');
  }
}

function isRetryable(error: unknown): boolean {
  return error instanceof NetworkError && error.retryable;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
