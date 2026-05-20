/**
 * Persistent storage for the chained-hash bookkeeping required by VERI*FACTU.
 *
 * Every registered or cancelled invoice is hashed and the resulting `Huella`
 * must reference the previous record's hash + identifier triple. Consumers of
 * the SDK plug in their own {@link HashStore} (typically backed by Postgres,
 * Redis or the local filesystem) so the chain survives across processes.
 *
 * The default {@link InMemoryHashStore} is supplied for tests and one-off CLI
 * runs; it is **not** safe to use in production because the chain is lost when
 * the process exits.
 *
 * @module
 */

import type { InvoiceId } from '../types.js';

/**
 * Snapshot of the last record on the chain for a given taxpayer.
 */
export interface HashStoreEntry {
  /** Identifier triple of the previous record. */
  readonly invoiceId: InvoiceId;
  /** 64-char uppercase hex SHA-256 hash of the previous record. */
  readonly hash: string;
}

/**
 * Pluggable hash-chain store.
 *
 * Implementations must be **read-modify-write safe**: the SDK calls
 * {@link getLast} immediately before computing the next hash and calls
 * {@link append} immediately after the AEAT acknowledges the submission. If
 * your store is shared across processes, wrap the pair in a transaction or a
 * mutex so two concurrent submissions can never observe the same previous
 * hash.
 *
 * @example
 * ```ts
 * class FileHashStore implements HashStore {
 *   async getLast(nif: string) { return readJson(`./chains/${nif}.json`); }
 *   async append(nif: string, entry: HashStoreEntry) { writeJson(`./chains/${nif}.json`, entry); }
 * }
 * ```
 */
export interface HashStore {
  /**
   * Return the last appended entry for the given taxpayer.
   *
   * @param taxpayerNif - NIF of the taxpayer whose chain is being read.
   * @returns The last entry, or `null` if the taxpayer has no previous record
   *   (i.e. the next submission must be marked `PrimerRegistro='S'`).
   */
  getLast(taxpayerNif: string): Promise<HashStoreEntry | null> | HashStoreEntry | null;

  /**
   * Persist a freshly computed hash as the new tail of the chain.
   *
   * @param taxpayerNif - NIF of the taxpayer the chain belongs to.
   * @param entry - The newly created record's identifier and hash.
   */
  append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> | void;
}

/**
 * Default in-memory {@link HashStore} implementation.
 *
 * Intended for tests, demos and short-lived CLI invocations. Production
 * deployments should provide their own persistent store.
 *
 * @example
 * ```ts
 * const client = new VerifactuClient({
 *   // ...
 *   hashStore: new InMemoryHashStore(),
 * });
 * ```
 */
export class InMemoryHashStore implements HashStore {
  private readonly map = new Map<string, HashStoreEntry>();

  /** @inheritdoc */
  getLast(taxpayerNif: string): HashStoreEntry | null {
    return this.map.get(taxpayerNif) ?? null;
  }

  /** @inheritdoc */
  append(taxpayerNif: string, entry: HashStoreEntry): void {
    this.map.set(taxpayerNif, entry);
  }
}
