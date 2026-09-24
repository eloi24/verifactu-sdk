/**
 * Shared row (de)serialization used by the bundled SQL/KV {@link HashStore} adapters.
 *
 * @internal
 * @module
 */

import type { InvoiceId } from '../../../types.js';
import type { HashStoreEntry } from '../../HashStore.js';

/**
 * Name of the table (SQL adapters) or key prefix (KV adapters) every bundled
 * adapter uses to store the hash chain. Not configurable — write a custom
 * {@link HashStore} implementation if a different name is required.
 */
export const HASH_CHAIN_TABLE = 'verifactu_hash_chain';

/** Serialize an {@link InvoiceId} for storage in a single text column/field. */
export function encodeInvoiceId(invoiceId: InvoiceId): string {
  return JSON.stringify(invoiceId);
}

/** Parse a previously {@link encodeInvoiceId | encoded} `InvoiceId` back out. */
export function decodeInvoiceId(raw: string): InvoiceId {
  return JSON.parse(raw) as InvoiceId;
}

/** Build a {@link HashStoreEntry} from a raw `(invoice_id, hash)` row, or `null` if absent. */
export function rowToEntry(
  row: { invoice_id: string; hash: string } | undefined | null,
): HashStoreEntry | null {
  if (!row) return null;
  return { invoiceId: decodeInvoiceId(row.invoice_id), hash: row.hash };
}
