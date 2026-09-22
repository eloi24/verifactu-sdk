/**
 * Round-trip test for `src/store/adapters/bunSql.ts` against an in-memory
 * fake of Bun's tagged-template `SQL` client — no real Postgres connection.
 */

import { describe, expect, test } from 'bun:test';
import type { SQL } from 'bun';
import { BunSqlHashStore } from '../../../../src/store/adapters/bunSql.ts';

/** In-memory fake of `Bun.SQL`, just enough surface to exercise the adapter's queries. */
function createFakeSql(): SQL {
  const rows = new Map<string, { invoice_id: string; hash: string }>();
  const fake = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(' ').toUpperCase();
    if (text.includes('CREATE TABLE')) return Promise.resolve([]);
    if (text.includes('SELECT')) {
      const nif = values[0] as string;
      const row = rows.get(nif);
      return Promise.resolve(row ? [row] : []);
    }
    if (text.includes('INSERT')) {
      const [nif, invoiceId, hash] = values as [string, string, string];
      rows.set(nif, { invoice_id: invoiceId, hash });
      return Promise.resolve([]);
    }
    throw new Error(`unexpected query: ${text}`);
  };
  return fake as unknown as SQL;
}

describe('BunSqlHashStore', () => {
  test('round-trips through migrate/append/getLast', async () => {
    const store = new BunSqlHashStore(createFakeSql());
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
