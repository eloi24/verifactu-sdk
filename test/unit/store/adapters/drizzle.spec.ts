/**
 * Tests for `src/store/adapters/drizzle.ts` — one per dialect — against
 * in-memory fakes of each dialect's Drizzle query builder. Real `pgTable`/
 * `mysqlTable`/`sqliteTable` definitions are used for the table so the
 * `DrizzleHashChainColumns` shape is exercised against genuine columns; only
 * the `db` object (network I/O) is faked.
 */

import { describe, expect, test } from 'bun:test';
import { mysqlTable, text as mysqlText } from 'drizzle-orm/mysql-core';
import type {
  MySqlDatabase,
  MySqlQueryResultHKT,
  PreparedQueryHKTBase,
} from 'drizzle-orm/mysql-core';
import { pgTable, text as pgText } from 'drizzle-orm/pg-core';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import {
  DrizzleMysqlHashStore,
  DrizzlePgHashStore,
  DrizzleSqliteHashStore,
} from '../../../../src/store/adapters/drizzle.ts';

const invoiceId = { issuerNif: 'B12345678', seriesNumber: 'A/1', issueDate: '2026-01-01' };
const entry = { invoiceId, hash: 'ABC123' };

/** Builds a fake db exposing just the `select().from().where()` / `insert().values().<upsert>()` shape used by the adapters. */
function createFakeDb(upsertMethod: 'onConflictDoUpdate' | 'onDuplicateKeyUpdate') {
  const rows = new Map<string, { nif: string; invoiceId: string; hash: string }>();
  const db = {
    select: (_fields: unknown) => ({
      from: (_table: unknown) => ({
        where: () => Promise.resolve([...rows.values()]),
      }),
    }),
    insert: (_table: unknown) => ({
      values: (v: { nif: string; invoiceId: string; hash: string }) => ({
        [upsertMethod]: (_config: unknown) => {
          rows.set(v.nif, v);
          return Promise.resolve();
        },
      }),
    }),
  };
  return { db, rows };
}

describe('DrizzlePgHashStore', () => {
  const table = pgTable('verifactu_hash_chain', {
    nif: pgText('nif').primaryKey(),
    invoiceId: pgText('invoice_id').notNull(),
    hash: pgText('hash').notNull(),
  });

  test('round-trips through append/getLast', async () => {
    const { db } = createFakeDb('onConflictDoUpdate');
    const store = new DrizzlePgHashStore(db as unknown as PgDatabase<PgQueryResultHKT>, table);

    expect(await store.getLast('B12345678')).toBeNull();
    await store.append('B12345678', entry);
    expect(await store.getLast('B12345678')).toEqual(entry);
  });
});

describe('DrizzleMysqlHashStore', () => {
  const table = mysqlTable('verifactu_hash_chain', {
    nif: mysqlText('nif').primaryKey(),
    invoiceId: mysqlText('invoice_id').notNull(),
    hash: mysqlText('hash').notNull(),
  });

  test('round-trips through append/getLast', async () => {
    const { db } = createFakeDb('onDuplicateKeyUpdate');
    const store = new DrizzleMysqlHashStore(
      db as unknown as MySqlDatabase<MySqlQueryResultHKT, PreparedQueryHKTBase>,
      table,
    );

    expect(await store.getLast('B12345678')).toBeNull();
    await store.append('B12345678', entry);
    expect(await store.getLast('B12345678')).toEqual(entry);
  });
});

describe('DrizzleSqliteHashStore', () => {
  const table = sqliteTable('verifactu_hash_chain', {
    nif: sqliteText('nif').primaryKey(),
    invoiceId: sqliteText('invoice_id').notNull(),
    hash: sqliteText('hash').notNull(),
  });

  test('round-trips through append/getLast', async () => {
    const { db } = createFakeDb('onConflictDoUpdate');
    const store = new DrizzleSqliteHashStore(
      db as unknown as BaseSQLiteDatabase<'async', unknown>,
      table,
    );

    expect(await store.getLast('B12345678')).toBeNull();
    await store.append('B12345678', entry);
    expect(await store.getLast('B12345678')).toEqual(entry);
  });
});
