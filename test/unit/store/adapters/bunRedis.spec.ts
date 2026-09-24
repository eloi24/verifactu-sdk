/**
 * Round-trip test for `src/store/adapters/bunRedis.ts` against an in-memory
 * fake of Bun's native `RedisClient` — no real Redis connection.
 */

import { describe, expect, test } from 'bun:test';
import type { RedisClient } from 'bun';
import { BunRedisHashStore } from '../../../../src/store/adapters/bunRedis.ts';

/** In-memory fake of Bun's `RedisClient`, just enough surface (`get`/`set`) for the adapter. */
function createFakeRedis(): RedisClient {
  const map = new Map<string, string>();
  return {
    get: (key: string) => Promise.resolve(map.get(key) ?? null),
    set: (key: string, value: string) => {
      map.set(key, value);
      return Promise.resolve('OK' as const);
    },
  } as unknown as RedisClient;
}

describe('BunRedisHashStore', () => {
  test('round-trips through append/getLast, namespaced under verifactu:hash-chain:', async () => {
    const redis = createFakeRedis();
    const store = new BunRedisHashStore(redis);

    expect(await store.getLast('B12345678')).toBeNull();

    const entry = {
      invoiceId: { issuerNif: 'B12345678', seriesNumber: 'A/1', issueDate: '2026-01-01' },
      hash: 'ABC123',
    };
    await store.append('B12345678', entry);

    expect(await store.getLast('B12345678')).toEqual(entry);
    expect(await redis.get('verifactu:hash-chain:B12345678')).toBe(JSON.stringify(entry));
  });
});
