/**
 * Round-trip test for `src/store/adapters/sqlite.ts` against a real
 * in-memory `bun:sqlite` database (no fake needed — `bun:sqlite` ships with
 * the Bun runtime and `:memory:` needs no filesystem access).
 */

import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { SqliteHashStore } from '../../../../src/store/adapters/sqlite.ts';

describe('SqliteHashStore', () => {
  test('round-trips through migrate/append/getLast', () => {
    const store = new SqliteHashStore(new Database(':memory:'));
    store.migrate();

    expect(store.getLast('B12345678')).toBeNull();

    const entry = {
      invoiceId: { issuerNif: 'B12345678', seriesNumber: 'A/1', issueDate: '2026-01-01' },
      hash: 'ABC123',
    };
    store.append('B12345678', entry);

    expect(store.getLast('B12345678')).toEqual(entry);

    // append again for the same NIF must overwrite, not duplicate, the tail.
    const nextEntry = {
      invoiceId: { issuerNif: 'B12345678', seriesNumber: 'A/2', issueDate: '2026-01-02' },
      hash: 'DEF456',
    };
    store.append('B12345678', nextEntry);
    expect(store.getLast('B12345678')).toEqual(nextEntry);
  });
});
