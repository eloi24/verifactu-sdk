/**
 * {@link HashStore} adapter backed by `mysql2` (promise API).
 *
 * @module
 */

import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { encodeInvoiceId, rowToEntry } from './internal/row.js';

/** Row shape returned by the `SELECT` query, as `mysql2` requires extending `RowDataPacket`. */
interface HashChainRow extends RowDataPacket {
  invoice_id: string;
  hash: string;
}

/**
 * {@link HashStore} implementation backed by {@link https://sidorares.github.io/node-mysql2 | mysql2}'s
 * promise API.
 *
 * Reads and writes a single `verifactu_hash_chain` table; call
 * {@link MysqlHashStore.migrate} once (e.g. in a startup script) to create it.
 *
 * @remarks
 * Accepts either a `Pool` or a single `PoolConnection` — pass a `Pool` in
 * most applications so each call borrows its own connection. Errors from the
 * underlying driver propagate unmodified, not wrapped in a `VerifactuError`
 * subclass, since they are infrastructure failures.
 * @example
 * ```ts
 * import { createPool } from 'mysql2/promise';
 * import { MysqlHashStore } from 'verifactu-sdk/store/mysql';
 *
 * const pool = createPool(process.env.DATABASE_URL!);
 * const hashStore = new MysqlHashStore(pool);
 * await hashStore.migrate();
 * ```
 */
export class MysqlHashStore implements HashStore {
  readonly #pool: Pool | PoolConnection;

  /** @param pool - A `mysql2/promise` `Pool` (recommended) or `PoolConnection`. */
  constructor(pool: Pool | PoolConnection) {
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
        nif VARCHAR(255) PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        hash CHAR(64) NOT NULL
      )
    `);
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const [rows] = await this.#pool.query<HashChainRow[]>(
      'SELECT invoice_id, hash FROM verifactu_hash_chain WHERE nif = ?',
      [taxpayerNif],
    );
    return rowToEntry(rows[0]);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    await this.#pool.query(
      `INSERT INTO verifactu_hash_chain (nif, invoice_id, hash)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE invoice_id = VALUES(invoice_id), hash = VALUES(hash)`,
      [taxpayerNif, encodeInvoiceId(entry.invoiceId), entry.hash],
    );
  }
}
