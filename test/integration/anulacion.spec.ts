/**
 * Integration tests for the anulacion (cancellation) path against a mocked
 * AEAT, plus the duplicate-record fallback.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { resolveEndpoint } from '../../src/client/endpoints.ts';
import { SoapClient } from '../../src/client/soap.ts';
import { cancelInvoiceToWire } from '../../src/wire/toWire.ts';
import { buildRegFactuEnvelope } from '../../src/xml/builder.ts';
import { parseRespuestaSuministro } from '../../src/xml/parser.ts';
import { buildCancelInvoice } from '../unit/schemas/fixtures.ts';
import { createMockAgent, mockAcceptAll, mockDuplicate } from './mock/server.ts';

const ENDPOINT = resolveEndpoint({ mode: 'verifactu', environment: 'preproduction' });

function makeClient() {
  const dispatcher = createMockAgent();
  const client = new SoapClient({
    certificate: { pfx: Buffer.from('dummy'), passphrase: 'dummy' },
    transport: dispatcher.transport,
  });
  return { client, dispatcher };
}

function makeEnvelope() {
  const wire = cancelInvoiceToWire(buildCancelInvoice());
  return buildRegFactuEnvelope({
    cabecera: {
      ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
      RemisionVoluntaria: {},
    },
    registros: [{ kind: 'anulacion', record: wire }],
  });
}

describe('integration: anulacion', () => {
  let teardown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (teardown !== undefined) {
      await teardown();
      teardown = undefined;
    }
  });

  it('parses a successful anulacion response', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockAcceptAll(dispatcher, [
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0001',
        issueDate: '20-05-2026',
        state: 'Correcto',
        operation: 'Anulacion',
      },
    ]);

    const response = await client.call(ENDPOINT, '', makeEnvelope());
    const decoded = parseRespuestaSuministro(response.body);

    expect(decoded.envelopeState).toBe('Correcto');
    expect(decoded.records[0]?.operation).toBe('Anulacion');
  });

  it('surfaces the duplicate-record IdPeticion when the AEAT signals a duplicate', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockDuplicate(dispatcher, { idPeticion: '20260520123456000001', state: 'Correcta' }, [
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0001',
        issueDate: '20-05-2026',
        state: 'Incorrecto',
        operation: 'Anulacion',
      },
    ]);

    const response = await client.call(ENDPOINT, '', makeEnvelope());
    const decoded = parseRespuestaSuministro(response.body);

    expect(decoded.envelopeState).toBe('Incorrecto');
    const line = decoded.records[0];
    expect(line?.errorCode).toBe(3000);
    expect(line?.duplicateRecord?.requestId).toBe('20260520123456000001');
    expect(line?.duplicateRecord?.state).toBe('Correcta');
  });
});
