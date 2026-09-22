/**
 * {@link HashStore} adapter backed by `pg` (node-postgres).
 *
 * @module
 */

import type { Pool, PoolClient } from 'pg';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { encodeInvoiceId, rowToEntry } from './internal/row.js';

/**
 * {@link HashStore} implementation backed by {@link https://node-postgres.com | node-postgres}.
 *
 * Reads and writes a single `verifactu_hash_chain` table; call
 * {@link PgHashStore.migrate} once (e.g. in a startup script) to create it.
 *
 * @remarks
 * Accepts either a `Pool` or a single `PoolClient`/`Client` — pass a `Pool`
 * in most applications so each call borrows its own connection. Errors from
 * the underlying driver propagate unmodified, not wrapped in a
 * `VerifactuError` subclass, since they are infrastructure failures.
 * @example
 * ```ts
 * import { Pool } from 'pg';
 * import { PgHashStore } from 'verifactu-sdk/store/pg';
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const hashStore = new PgHashStore(pool);
 * await hashStore.migrate();
 * ```
 */
export class PgHashStore implements HashStore {
  readonly #pool: Pool | PoolClient;

  /** @param pool - A `pg` `Pool` (recommended) or `PoolClient`/`Client`. */
  constructor(pool: Pool | PoolClient) {
    this.#pool = pool;
  }

  /**
   * Create the `verifactu_hash_chain` table if it doesn't already exist.
   *
   * Idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to call on every startup.
   */
  async migrate(): Promise<void> {
    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS verifactu_hash_chain (
        nif TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        hash TEXT NOT NULL
      )
    `);
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const { rows } = await this.#pool.query<{ invoice_id: string; hash: string }>(
      'SELECT invoice_id, hash FROM verifactu_hash_chain WHERE nif = $1',
      [taxpayerNif],
    );
    return rowToEntry(rows[0]);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    await this.#pool.query(
      `INSERT INTO verifactu_hash_chain (nif, invoice_id, hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (nif) DO UPDATE SET invoice_id = EXCLUDED.invoice_id, hash = EXCLUDED.hash`,
      [taxpayerNif, encodeInvoiceId(entry.invoiceId), entry.hash],
    );
  }
}
