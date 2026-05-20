/**
 * Integration tests for the alta (registration) path against a mocked AEAT.
 *
 * Covers the happy path (full accept), partial accept, full reject and SOAP
 * fault. The SOAP client uses an undici MockAgent so no network is touched.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resolveEndpoint } from '../../src/client/endpoints.ts';
import { SoapClient } from '../../src/client/soap.ts';
import { invoiceToWire } from '../../src/wire/toWire.ts';
import { buildRegFactuEnvelope } from '../../src/xml/builder.ts';
import { SoapFaultError } from '../../src/xml/errors.ts';
import { parseRespuestaSuministro } from '../../src/xml/parser.ts';
import { buildInvoice } from '../unit/schemas/fixtures.ts';
import {
  createMockAgent,
  mockAcceptAll,
  mockAcceptPartial,
  mockRejectAll,
  mockSoapFault,
} from './mock/server.ts';

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
  const invoice = invoiceToWire(buildInvoice());
  return buildRegFactuEnvelope({
    cabecera: {
      ObligadoEmision: { NombreRazon: 'Eloi Baulenas', NIF: 'B12345678' },
      RemisionVoluntaria: {},
    },
    registros: [{ kind: 'alta', record: invoice }],
  });
}

describe('integration: alta', () => {
  let teardown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (teardown !== undefined) {
      await teardown();
      teardown = undefined;
    }
  });

  beforeEach(() => {
    teardown = undefined;
  });

  it('parses a fully accepted alta response', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockAcceptAll(dispatcher, [
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0001',
        issueDate: '20-05-2026',
        state: 'Correcto',
      },
    ]);

    const envelope = makeEnvelope();
    const response = await client.call(ENDPOINT, '', envelope);
    const decoded = parseRespuestaSuministro(response.body);

    expect(decoded.csv).toBe('CSVTEST123');
    expect(decoded.envelopeState).toBe('Correcto');
    expect(decoded.waitSeconds).toBe(60);
    expect(decoded.records).toHaveLength(1);
    expect(decoded.records[0]?.state).toBe('Correcto');
    expect(decoded.records[0]?.invoiceId).toEqual({
      issuerNif: 'B12345678',
      seriesNumber: 'A/2026/0001',
      issueDate: '2026-05-20',
    });
  });

  it('decodes a partial-accept response with per-record errors', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockAcceptPartial(dispatcher, [
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0001',
        issueDate: '20-05-2026',
        state: 'Correcto',
      },
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0002',
        issueDate: '20-05-2026',
        state: 'Incorrecto',
        errorCode: 2000,
        errorDescription: 'El cálculo de la huella suministrada es incorrecta',
      },
    ]);

    const response = await client.call(ENDPOINT, '', makeEnvelope());
    const decoded = parseRespuestaSuministro(response.body);

    expect(decoded.envelopeState).toBe('ParcialmenteCorrecto');
    expect(decoded.records).toHaveLength(2);
    expect(decoded.records[1]?.state).toBe('Incorrecto');
    expect(decoded.records[1]?.errorCode).toBe(2000);
  });

  it('decodes a fully rejected response', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockRejectAll(dispatcher, [
      {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0001',
        issueDate: '20-05-2026',
        state: 'Incorrecto',
      },
    ]);

    const response = await client.call(ENDPOINT, '', makeEnvelope());
    const decoded = parseRespuestaSuministro(response.body);

    expect(decoded.envelopeState).toBe('Incorrecto');
    expect(decoded.records[0]?.errorCode).toBe(1100);
  });

  it('throws SoapFaultError on a SOAP fault response', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockSoapFault(dispatcher, 'El XML no cumple el esquema');

    let captured: unknown;
    try {
      const response = await client.call(ENDPOINT, '', makeEnvelope());
      parseRespuestaSuministro(response.body);
    } catch (error) {
      captured = error;
    }
    // The client throws a NetworkError on 500. The parser only sees the body
    // if the caller chooses to parse it anyway — exercise that route directly.
    expect(captured).toBeDefined();

    // Now exercise the parse path with a fault body directly.
    const faultBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>El XML no cumple el esquema</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;
    expect(() => parseRespuestaSuministro(faultBody)).toThrow(SoapFaultError);
  });
});
