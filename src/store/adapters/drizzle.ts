/**
 * {@link HashStore} adapters for Drizzle ORM — Postgres, MySQL and SQLite
 * dialects, each working against a table you own (not a hardcoded one).
 *
 * @module
 */

import { eq } from 'drizzle-orm';
import type {
  MySqlColumn,
  MySqlDatabase,
  MySqlQueryResultHKT,
  MySqlTable,
  PreparedQueryHKTBase,
} from 'drizzle-orm/mysql-core';
import type { PgColumn, PgDatabase, PgQueryResultHKT, PgTable } from 'drizzle-orm/pg-core';
import type { BaseSQLiteDatabase, SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { HashStore, HashStoreEntry } from '../HashStore.js';
import { decodeInvoiceId, encodeInvoiceId } from './internal/row.js';

/**
 * Column shape every consumer-owned Drizzle table must expose for the
 * hash-chain adapters below — one per dialect, since Drizzle's query
 * builders require the dialect-specific column type, not a cross-dialect
 * generic one.
 *
 * The three stores in this module never define or migrate a table
 * themselves — you own it, so it lives in your own schema file and
 * drizzle-kit migrations. Generate a starting point with
 * `bunx verifactu schema drizzle --provider pg|mysql|sqlite` or declare it by
 * hand as long as the three column names below line up.
 *
 * @example
 * ```ts
 * import { pgTable, text } from 'drizzle-orm/pg-core';
 *
 * export const verifactuHashChain = pgTable('verifactu_hash_chain', {
 *   nif: text('nif').primaryKey(),
 *   invoiceId: text('invoice_id').notNull(),
 *   hash: text('hash').notNull(),
 * });
 * ```
 */
export interface PgHashChainColumns {
  /** Primary key — the taxpayer NIF. */
  readonly nif: PgColumn;
  /** JSON-encoded {@link InvoiceId} of the chain's tail record. */
  readonly invoiceId: PgColumn;
  /** 64-char uppercase hex SHA-256 hash of the chain's tail record. */
  readonly hash: PgColumn;
}

/** MySQL counterpart of {@link PgHashChainColumns}. */
export interface MysqlHashChainColumns {
  readonly nif: MySqlColumn;
  readonly invoiceId: MySqlColumn;
  readonly hash: MySqlColumn;
}

/** SQLite counterpart of {@link PgHashChainColumns}. */
export interface SqliteHashChainColumns {
  readonly nif: SQLiteColumn;
  readonly invoiceId: SQLiteColumn;
  readonly hash: SQLiteColumn;
}

/**
 * Row shape shared by all three dialects' `select()` results. `unknown`
 * because the column types are erased to the dialect base class (see
 * {@link PgHashChainColumns} and friends) — the contract is that `nif` and
 * `hash` are string-valued columns, enforced by {@link rowToEntry} below.
 */
interface Row {
  nif: unknown;
  invoiceId: unknown;
  hash: unknown;
}

/** Map a selected {@link Row} to a {@link HashStoreEntry}, or `null` if none matched. */
function rowToEntry(row: Row | undefined): HashStoreEntry | null {
  if (!row) return null;
  return { invoiceId: decodeInvoiceId(String(row.invoiceId)), hash: String(row.hash) };
}

/**
 * {@link HashStore} for Drizzle's Postgres dialect — works with any pg-core
 * driver (`node-postgres`, `postgres.js`, Bun's `SQL`, Neon, etc.) since it's
 * typed against the shared `PgDatabase` base class rather than one driver.
 *
 * @example
 * ```ts
 * import { drizzle } from 'drizzle-orm/node-postgres';
 * import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
 * import { verifactuHashChain } from './schema.js'; // your own table
 *
 * const db = drizzle(process.env.DATABASE_URL!);
 * const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
 * ```
 */
export class DrizzlePgHashStore<TQueryResult extends PgQueryResultHKT> implements HashStore {
  readonly #db: PgDatabase<TQueryResult>;
  readonly #table: PgTable & PgHashChainColumns;

  /**
   * @param db - Any pg-core-based Drizzle database instance.
   * @param table - Your own table, shaped per {@link PgHashChainColumns}.
   */
  constructor(db: PgDatabase<TQueryResult>, table: PgTable & PgHashChainColumns) {
    this.#db = db;
    this.#table = table;
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const rows = await this.#db
      .select({ nif: this.#table.nif, invoiceId: this.#table.invoiceId, hash: this.#table.hash })
      .from(this.#table)
      .where(eq(this.#table.nif, taxpayerNif));
    return rowToEntry(rows[0]);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    const invoiceId = encodeInvoiceId(entry.invoiceId);
    await this.#db
      .insert(this.#table)
      .values({ nif: taxpayerNif, invoiceId, hash: entry.hash })
      .onConflictDoUpdate({
        target: this.#table.nif,
        set: { invoiceId, hash: entry.hash },
      });
  }
}

/**
 * {@link HashStore} for Drizzle's MySQL dialect (works with `mysql2` and
 * PlanetScale drivers alike, since it's typed against the shared
 * `MySqlDatabase` base class).
 *
 * @remarks
 * MySQL has no `RETURNING` clause and resolves conflicts by
 * `ON DUPLICATE KEY UPDATE` (target column is implicit — the table's own
 * primary/unique key), unlike the Postgres/SQLite `onConflictDoUpdate` shape.
 * @example
 * ```ts
 * import { drizzle } from 'drizzle-orm/mysql2';
 * import { DrizzleMysqlHashStore } from 'verifactu-sdk/store/drizzle';
 * import { verifactuHashChain } from './schema.js'; // your own table
 *
 * const db = drizzle(process.env.DATABASE_URL!);
 * const hashStore = new DrizzleMysqlHashStore(db, verifactuHashChain);
 * ```
 */
export class DrizzleMysqlHashStore<
  TQueryResult extends MySqlQueryResultHKT,
  TPreparedQueryHKT extends PreparedQueryHKTBase,
> implements HashStore
{
  readonly #db: MySqlDatabase<TQueryResult, TPreparedQueryHKT>;
  readonly #table: MySqlTable & MysqlHashChainColumns;

  /**
   * @param db - Any mysql-core-based Drizzle database instance.
   * @param table - Your own table, shaped per {@link MysqlHashChainColumns}.
   */
  constructor(
    db: MySqlDatabase<TQueryResult, TPreparedQueryHKT>,
    table: MySqlTable & MysqlHashChainColumns,
  ) {
    this.#db = db;
    this.#table = table;
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const rows = await this.#db
      .select({ nif: this.#table.nif, invoiceId: this.#table.invoiceId, hash: this.#table.hash })
      .from(this.#table)
      .where(eq(this.#table.nif, taxpayerNif));
    return rowToEntry(rows[0]);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    const invoiceId = encodeInvoiceId(entry.invoiceId);
    await this.#db
      .insert(this.#table)
      .values({ nif: taxpayerNif, invoiceId, hash: entry.hash })
      .onDuplicateKeyUpdate({ set: { invoiceId, hash: entry.hash } });
  }
}

/**
 * {@link HashStore} for Drizzle's SQLite dialect (`bun:sqlite`,
 * `better-sqlite3`, libSQL, etc., since it's typed against the shared
 * `BaseSQLiteDatabase` base class).
 *
 * @example
 * ```ts
 * import { drizzle } from 'drizzle-orm/bun-sqlite';
 * import { Database } from 'bun:sqlite';
 * import { DrizzleSqliteHashStore } from 'verifactu-sdk/store/drizzle';
 * import { verifactuHashChain } from './schema.js'; // your own table
 *
 * const db = drizzle(new Database('verifactu.sqlite'));
 * const hashStore = new DrizzleSqliteHashStore(db, verifactuHashChain);
 * ```
 */
export class DrizzleSqliteHashStore<TResultKind extends 'sync' | 'async', TRunResult>
  implements HashStore
{
  readonly #db: BaseSQLiteDatabase<TResultKind, TRunResult>;
  readonly #table: SQLiteTable & SqliteHashChainColumns;

  /**
   * @param db - Any sqlite-core-based Drizzle database instance.
   * @param table - Your own table, shaped per {@link SqliteHashChainColumns}.
   */
  constructor(
    db: BaseSQLiteDatabase<TResultKind, TRunResult>,
    table: SQLiteTable & SqliteHashChainColumns,
  ) {
    this.#db = db;
    this.#table = table;
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const rows = await this.#db
      .select({ nif: this.#table.nif, invoiceId: this.#table.invoiceId, hash: this.#table.hash })
      .from(this.#table)
      .where(eq(this.#table.nif, taxpayerNif));
    return rowToEntry(rows[0]);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    const invoiceId = encodeInvoiceId(entry.invoiceId);
    await this.#db
      .insert(this.#table)
      .values({ nif: taxpayerNif, invoiceId, hash: entry.hash })
      .onConflictDoUpdate({
        target: this.#table.nif,
        set: { invoiceId, hash: entry.hash },
      });
  }
}
