/**
 * {@link HashStore} adapter backed by Bun's native SQLite client (`bun:sqlite`).
 *
 * @module
 */

import type { Database } from 'bun:sqlite';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { encodeInvoiceId, rowToEntry } from './internal/row.js';

/**
 * {@link HashStore} implementation backed by {@link https://bun.sh/docs/api/sqlite | bun:sqlite}.
 *
 * Zero extra dependencies. Suited to single-process deployments (a single
 * SQLite file is not safely shareable across processes/machines the way
 * Postgres or Redis are) — call {@link SqliteHashStore.migrate} once to
 * create the `verifactu_hash_chain` table.
 *
 * @remarks
 * All operations are synchronous (bun:sqlite is a sync API), which is fine —
 * {@link HashStore}'s methods accept a sync or async return. Errors from the
 * underlying driver propagate unmodified.
 * @example
 * ```ts
 * import { Database } from 'bun:sqlite';
 * import { SqliteHashStore } from 'verifactu-sdk/store/sqlite';
 *
 * const db = new Database('verifactu.sqlite');
 * const hashStore = new SqliteHashStore(db);
 * hashStore.migrate();
 * ```
 */
export class SqliteHashStore implements HashStore {
  readonly #db: Database;

  /** @param db - An open `bun:sqlite` `Database` instance. */
  constructor(db: Database) {
    this.#db = db;
  }

  /**
   * Create the `verifactu_hash_chain` table if it doesn't already exist.
   *
   * Idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to call on every startup.
   */
  migrate(): void {
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS verifactu_hash_chain (
        nif TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        hash TEXT NOT NULL
      )
    `);
  }

  /** @inheritdoc */
  getLast(taxpayerNif: string): HashStoreEntry | null {
    const row = this.#db
      .query<{ invoice_id: string; hash: string }, [string]>(
        'SELECT invoice_id, hash FROM verifactu_hash_chain WHERE nif = ?',
      )
      .get(taxpayerNif);
    return rowToEntry(row);
  }

  /** @inheritdoc */
  append(taxpayerNif: string, entry: HashStoreEntry): void {
    this.#db.run(
      `INSERT INTO verifactu_hash_chain (nif, invoice_id, hash)
       VALUES (?, ?, ?)
       ON CONFLICT(nif) DO UPDATE SET invoice_id = excluded.invoice_id, hash = excluded.hash`,
      [taxpayerNif, encodeInvoiceId(entry.invoiceId), entry.hash],
    );
  }
}
