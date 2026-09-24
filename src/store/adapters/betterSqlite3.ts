/**
 * {@link HashStore} adapter backed by `better-sqlite3` — for Node.js projects
 * not running on Bun. See `verifactu-sdk/store/sqlite` (`bun:sqlite`) for the
 * Bun-native equivalent.
 *
 * @module
 */

import type BetterSqlite3 from 'better-sqlite3';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { encodeInvoiceId, rowToEntry } from './internal/row.js';

/**
 * {@link HashStore} implementation backed by {@link https://github.com/WiseLibs/better-sqlite3 | better-sqlite3}.
 *
 * The Node.js counterpart to `verifactu-sdk/store/sqlite` (which needs
 * `bun:sqlite` and only runs under Bun) — use this one under plain Node.js.
 * Suited to single-process deployments (a single SQLite file is not safely
 * shareable across processes/machines the way Postgres or Redis are) — call
 * {@link BetterSqlite3HashStore.migrate} once to create the
 * `verifactu_hash_chain` table.
 *
 * @remarks
 * All operations are synchronous (`better-sqlite3` is a sync API), which is
 * fine — {@link HashStore}'s methods accept a sync or async return. Errors
 * from the underlying driver propagate unmodified.
 * @example
 * ```ts
 * import Database from 'better-sqlite3';
 * import { BetterSqlite3HashStore } from 'verifactu-sdk/store/better-sqlite3';
 *
 * const db = new Database('verifactu.sqlite');
 * const hashStore = new BetterSqlite3HashStore(db);
 * hashStore.migrate();
 * ```
 */
export class BetterSqlite3HashStore implements HashStore {
  readonly #db: BetterSqlite3.Database;

  /** @param db - An open `better-sqlite3` `Database` instance. */
  constructor(db: BetterSqlite3.Database) {
    this.#db = db;
  }

  /**
   * Create the `verifactu_hash_chain` table if it doesn't already exist.
   *
   * Idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to call on every startup.
   */
  migrate(): void {
    this.#db.exec(`
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
      .prepare<[string], { invoice_id: string; hash: string }>(
        'SELECT invoice_id, hash FROM verifactu_hash_chain WHERE nif = ?',
      )
      .get(taxpayerNif);
    return rowToEntry(row);
  }

  /** @inheritdoc */
  append(taxpayerNif: string, entry: HashStoreEntry): void {
    this.#db
      .prepare(
        `INSERT INTO verifactu_hash_chain (nif, invoice_id, hash)
         VALUES (?, ?, ?)
         ON CONFLICT(nif) DO UPDATE SET invoice_id = excluded.invoice_id, hash = excluded.hash`,
      )
      .run(taxpayerNif, encodeInvoiceId(entry.invoiceId), entry.hash);
  }
}
