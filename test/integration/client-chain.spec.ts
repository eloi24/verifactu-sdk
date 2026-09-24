/**
 * Integration tests for hash-chain integrity across `VerifactuClient` calls.
 *
 * Drives a real client against the in-process mock AEAT and a SQLite-backed
 * `HashStore`, then reads the chain back out of the envelopes the client
 * actually sent. The criterion under test is the one set by Orden
 * HAC/1177/2024 art. 7.i: every record chains to the last record *generated*,
 * whether the AEAT accepted it or not.
 */

import { Database } from 'bun:sqlite';
import { describe, expect, it } from 'bun:test';
import { XMLParser } from 'fast-xml-parser';
import { VerifactuClient } from '../../src/client/VerifactuClient.ts';
import { SqliteHashStore } from '../../src/store/adapters/sqlite.ts';
import type { Invoice } from '../../src/types.ts';
import { NetworkError } from '../../src/xml/errors.ts';
import { buildInvoice } from '../unit/schemas/fixtures.ts';
import {
  type MockTransport,
  type MockedRecord,
  createMockAgent,
  mockAcceptAll,
  mockAcceptPartial,
  mockDuplicate,
  mockRejectAll,
} from './mock/server.ts';

/** A CIF with a valid control digit — the shared fixture's `B12345678` fails rule 1109. */
const NIF = 'B12345674';

const xml = new XMLParser({
  removeNSPrefix: true,
  parseTagValue: false,
  isArray: (name) => name === 'RegistroFactura',
});

interface SentEnvelope {
  Envelope: {
    Body: {
      RegFactuSistemaFacturacion: {
        RegistroFactura: Array<{
          RegistroAlta: {
            Encadenamiento: { RegistroAnterior?: { Huella: string } };
            Huella: string;
          };
        }>;
      };
    };
  };
}

interface SentLink {
  previous: string | null;
  hash: string;
}

/**
 * Reads the chain links of every alta the client sent, in submission order.
 *
 * @param agent - Mock transport that recorded the requests.
 * @returns One `{ previous, hash }` pair per record sent.
 */
function sentChain(agent: MockTransport): SentLink[] {
  return agent.calls.flatMap((call) => {
    const envelope = xml.parse(call.body) as SentEnvelope;
    return envelope.Envelope.Body.RegFactuSistemaFacturacion.RegistroFactura.map((entry) => ({
      previous: entry.RegistroAlta.Encadenamiento.RegistroAnterior?.Huella ?? null,
      hash: entry.RegistroAlta.Huella,
    }));
  });
}

/**
 * Builds the n-th invoice of a series.
 *
 * @param n - Position in the series, used as the invoice number.
 * @returns A valid invoice with a distinct `seriesNumber`.
 */
function invoice(n: number): Invoice {
  const base = buildInvoice();
  return {
    ...base,
    invoiceId: { ...base.invoiceId, issuerNif: NIF, seriesNumber: `A/2026/000${n}` },
    billingSystem: { ...base.billingSystem, nif: NIF },
  };
}

/**
 * Builds the mocked AEAT outcome for the n-th invoice.
 *
 * @param n - Position in the series, matching {@link invoice}.
 * @param state - Outcome the mock AEAT reports for that record.
 * @returns The mocked response line.
 */
function outcome(n: number, state: MockedRecord['state'] = 'Correcto'): MockedRecord {
  return { issuerNif: NIF, seriesNumber: `A/2026/000${n}`, issueDate: '20-05-2026', state };
}

/**
 * Creates a client wired to a fresh mock AEAT and an empty in-memory chain.
 *
 * @returns The client plus the mock and store it writes to.
 */
function setup() {
  const agent = createMockAgent();
  const hashStore = new SqliteHashStore(new Database(':memory:'));
  hashStore.migrate();
  const client = new VerifactuClient({
    environment: 'preproduction',
    mode: 'verifactu',
    certificate: { pfx: Buffer.from('dummy'), passphrase: 'dummy' },
    taxpayer: { nif: NIF, legalName: 'Eloi Baulenas' },
    billingSystem: { ...buildInvoice().billingSystem, nif: NIF },
    hashStore,
    transport: agent.transport,
    flowControl: { sleep: async () => {}, jitterMs: 0, maxRetries: 0 },
  });
  return { agent, hashStore, client };
}

/**
 * Consumes an async iterable to completion.
 *
 * @param iterable - The iterable to drain.
 * @returns Every yielded value, in order.
 */
async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const value of iterable) out.push(value);
  return out;
}

describe('integration: hash chain across client calls', () => {
  it('chains every record of a batch to the one before it', async () => {
    const { agent, hashStore, client } = setup();
    mockAcceptAll(agent, [outcome(1), outcome(2), outcome(3)]);

    await drain(client.registerBatch([invoice(1), invoice(2), invoice(3)]));

    const chain = sentChain(agent);
    expect(chain).toHaveLength(3);
    expect(chain[0]?.previous).toBeNull();
    expect(chain[1]?.previous).toBe(chain[0]?.hash ?? '');
    expect(chain[2]?.previous).toBe(chain[1]?.hash ?? '');
    expect(hashStore.getLast(NIF)?.hash).toBe(chain[2]?.hash ?? '');
  });

  it('keeps a rejected batch record in the chain', async () => {
    const { agent, hashStore, client } = setup();
    mockAcceptPartial(agent, [outcome(1), outcome(2, 'Incorrecto'), outcome(3)]);

    await drain(client.registerBatch([invoice(1), invoice(2), invoice(3)]));

    const chain = sentChain(agent);
    expect(chain[1]?.previous).toBe(chain[0]?.hash ?? '');
    expect(chain[2]?.previous).toBe(chain[1]?.hash ?? '');
    expect(hashStore.getLast(NIF)?.hash).toBe(chain[2]?.hash ?? '');
  });

  it('persists an answered chunk even when iteration stops early', async () => {
    const { agent, hashStore, client } = setup();
    mockAcceptAll(agent, [outcome(1), outcome(2)]);
    mockAcceptAll(agent, [outcome(3)]);

    for await (const _response of client.registerBatch([invoice(1), invoice(2)])) break;
    expect(hashStore.getLast(NIF)?.hash).toBe(sentChain(agent)[1]?.hash ?? '');

    await client.registerInvoice(invoice(3));
    const chain = sentChain(agent);
    expect(chain[2]?.previous).toBe(chain[1]?.hash ?? '');
  });

  it('serialises concurrent registrations on one client', async () => {
    const { agent, hashStore, client } = setup();
    mockAcceptAll(agent, [outcome(1)]);
    mockAcceptAll(agent, [outcome(2)]);

    await Promise.all([client.registerInvoice(invoice(1)), client.registerInvoice(invoice(2))]);

    const chain = sentChain(agent);
    expect(chain[0]?.previous).toBeNull();
    expect(chain[1]?.previous).toBe(chain[0]?.hash ?? '');
    expect(hashStore.getLast(NIF)?.hash).toBe(chain[1]?.hash ?? '');
  });

  it('advances the chain past a record the AEAT rejects', async () => {
    const { agent, hashStore, client } = setup();
    mockRejectAll(agent, [outcome(1)]);

    const response = await client.registerInvoice(invoice(1));

    expect(response.records[0]?.state).toBe('Incorrecto');
    expect(hashStore.getLast(NIF)?.hash).toBe(sentChain(agent)[0]?.hash ?? '');
  });

  it('recognises a retry after a lost response as already registered', async () => {
    const { agent, hashStore, client } = setup();
    const lost = invoice(1);

    await expect(client.registerInvoice(lost)).rejects.toBeInstanceOf(NetworkError);
    expect(hashStore.getLast(NIF)).toBeNull();

    mockDuplicate(agent, { idPeticion: 'REQ-1', state: 'Correcta' }, [outcome(1)]);
    const response = await client.registerInvoice(lost);

    const [first, retry] = sentChain(agent);
    expect(retry?.hash).toBe(first?.hash ?? '');
    expect(response.records[0]?.errorCode).toBe(3000);
    expect(response.records[0]?.duplicateRecord?.state).toBe('Correcta');
    expect(hashStore.getLast(NIF)?.hash).toBe(first?.hash ?? '');
  });
});
