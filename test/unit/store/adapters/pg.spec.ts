/**
 * Round-trip test for `src/store/adapters/pg.ts` against an in-memory fake
 * of a `pg` `Pool` — no real Postgres connection.
 */

import { describe, expect, test } from 'bun:test';
import type { Pool } from 'pg';
import { PgHashStore } from '../../../../src/store/adapters/pg.ts';

/** In-memory fake of a `pg` `Pool`, just enough surface to exercise the adapter's queries. */
function createFakePool(): Pool {
  const rows = new Map<string, { invoice_id: string; hash: string }>();
  const query = (text: string, values?: unknown[]) => {
    const upper = text.toUpperCase();
    if (upper.includes('CREATE TABLE')) return Promise.resolve({ rows: [] });
    if (upper.includes('SELECT')) {
      const [nif] = values as [string];
      const row = rows.get(nif);
      return Promise.resolve({ rows: row ? [row] : [] });
    }
    if (upper.includes('INSERT')) {
      const [nif, invoiceId, hash] = values as [string, string, string];
      rows.set(nif, { invoice_id: invoiceId, hash });
      return Promise.resolve({ rows: [] });
    }
    throw new Error(`unexpected query: ${text}`);
  };
  return { query } as unknown as Pool;
}

describe('PgHashStore', () => {
  test('round-trips through migrate/append/getLast', async () => {
    const store = new PgHashStore(createFakePool());
    await store.migrate();

    expect(await store.getLast('B12345678')).toBeNull();

    const entry = {
      invoiceId: { issuerNif: 'B12345678', seriesNumber: 'A/1', issueDate: '2026-01-01' },
      hash: 'ABC123',
    };
    await store.append('B12345678', entry);

    expect(await store.getLast('B12345678')).toEqual(entry);
  });
});
