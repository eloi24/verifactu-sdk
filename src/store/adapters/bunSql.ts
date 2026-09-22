/**
 * {@link HashStore} adapter backed by Bun's native Postgres client (`Bun.sql`).
 *
 * @module
 */

import type { SQL } from 'bun';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { decodeInvoiceId, encodeInvoiceId } from './internal/row.js';

/**
 * {@link HashStore} implementation backed by {@link https://bun.sh/docs/api/sql | Bun.sql}.
 *
 * Zero extra dependencies beyond the Bun runtime itself. Reads and writes a
 * single `verifactu_hash_chain` table; call {@link BunSqlHashStore.migrate}
 * once (e.g. in a startup script) to create it.
 *
 * @remarks
 * Errors from the underlying `SQL` client (connection failures, constraint
 * violations, etc.) propagate unmodified — they are not wrapped in a
 * `VerifactuError` subclass, since they are infrastructure failures, not AEAT
 * protocol errors.
 * @example
 * ```ts
 * import { SQL } from 'bun';
 * import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';
 *
 * const sql = new SQL(process.env.DATABASE_URL!);
 * const hashStore = new BunSqlHashStore(sql);
 * await hashStore.migrate();
 *
 * const client = new VerifactuClient({ certificate, taxpayer, billingSystem, hashStore });
 * ```
 */
export class BunSqlHashStore implements HashStore {
  readonly #sql: SQL;

  /** @param sql - A configured Bun `SQL` client, e.g. `new SQL(process.env.DATABASE_URL)`. */
  constructor(sql: SQL) {
    this.#sql = sql;
  }

  /**
   * Create the `verifactu_hash_chain` table if it doesn't already exist.
   *
   * Idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to call on every startup.
   */
  async migrate(): Promise<void> {
    await this.#sql`
      CREATE TABLE IF NOT EXISTS verifactu_hash_chain (
        nif TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        hash TEXT NOT NULL
      )
    `;
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const rows = await this.#sql<{ invoice_id: string; hash: string }[]>`
      SELECT invoice_id, hash FROM verifactu_hash_chain WHERE nif = ${taxpayerNif}
    `;
    const row = rows[0];
    return row ? { invoiceId: decodeInvoiceId(row.invoice_id), hash: row.hash } : null;
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    const invoiceId = encodeInvoiceId(entry.invoiceId);
    await this.#sql`
      INSERT INTO verifactu_hash_chain (nif, invoice_id, hash)
      VALUES (${taxpayerNif}, ${invoiceId}, ${entry.hash})
      ON CONFLICT (nif) DO UPDATE SET invoice_id = EXCLUDED.invoice_id, hash = EXCLUDED.hash
    `;
  }
}
