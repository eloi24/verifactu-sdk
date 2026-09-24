/**
 * {@link HashStore} adapter backed by Bun's native Redis client (`Bun.RedisClient`).
 *
 * @module
 */

import type { RedisClient } from 'bun';
import type { HashStore, HashStoreEntry } from '../HashStore.js';

/** Key prefix every entry is stored under: `verifactu:hash-chain:<nif>`. */
const KEY_PREFIX = 'verifactu:hash-chain:';

/**
 * {@link HashStore} implementation backed by {@link https://bun.sh/docs/api/redis | Bun's native RedisClient}.
 *
 * Zero extra dependencies beyond the Bun runtime itself. Stores each
 * taxpayer's chain tail as a single JSON value at
 * `verifactu:hash-chain:<nif>`. No schema/migration step is needed.
 *
 * @remarks
 * Do **not** point this at a cache instance with eviction enabled (e.g. a
 * Redis configured with `maxmemory-policy allkeys-lru`) or set a TTL on
 * these keys elsewhere — losing a chain-tail entry breaks the hash chain for
 * that taxpayer. Use a dedicated, persistent (RDB/AOF) Redis instance, or one
 * of the SQL-backed adapters if durability guarantees are a concern.
 * @example
 * ```ts
 * import { RedisClient } from 'bun';
 * import { BunRedisHashStore } from 'verifactu-sdk/store/bun-redis';
 *
 * const redis = new RedisClient(process.env.REDIS_URL!);
 * const hashStore = new BunRedisHashStore(redis);
 * ```
 */
export class BunRedisHashStore implements HashStore {
  readonly #redis: RedisClient;

  /** @param redis - A configured Bun `RedisClient`, e.g. `new RedisClient(process.env.REDIS_URL)`. */
  constructor(redis: RedisClient) {
    this.#redis = redis;
  }

  /** @inheritdoc */
  async getLast(taxpayerNif: string): Promise<HashStoreEntry | null> {
    const raw = await this.#redis.get(KEY_PREFIX + taxpayerNif);
    return raw === null ? null : (JSON.parse(raw) as HashStoreEntry);
  }

  /** @inheritdoc */
  async append(taxpayerNif: string, entry: HashStoreEntry): Promise<void> {
    await this.#redis.set(KEY_PREFIX + taxpayerNif, JSON.stringify(entry));
  }
}
