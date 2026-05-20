/**
 * Integration tests for the paginated consulta service against a mocked AEAT.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { resolveEndpoint } from '../../src/client/endpoints.ts';
import { SoapClient } from '../../src/client/soap.ts';
import { buildConsultaFactuEnvelope } from '../../src/xml/builder.ts';
import { parseRespuestaConsulta } from '../../src/xml/parser.ts';
import { createMockAgent, mockConsultaPage } from './mock/server.ts';

const ENDPOINT = resolveEndpoint({ mode: 'verifactu', environment: 'preproduction' });

function makeClient() {
  const dispatcher = createMockAgent();
  const client = new SoapClient({
    certificate: { pfx: Buffer.from('dummy'), passphrase: 'dummy' },
    transport: dispatcher.transport,
  });
  return { client, dispatcher };
}

function makeConsultaEnvelope(cursor?: {
  issuerNif: string;
  seriesNumber: string;
  issueDate: string;
}) {
  return buildConsultaFactuEnvelope({
    Cabecera: {
      IDVersion: '1.0',
      ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
    },
    FiltroConsulta: {
      PeriodoImputacion: { Ejercicio: '2026', Periodo: '05' },
      ...(cursor !== undefined
        ? {
            ClavePaginacion: {
              IDEmisorFactura: cursor.issuerNif,
              NumSerieFactura: cursor.seriesNumber,
              FechaExpedicionFactura: cursor.issueDate,
            },
          }
        : {}),
    },
  });
}

describe('integration: consulta', () => {
  let teardown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (teardown !== undefined) {
      await teardown();
      teardown = undefined;
    }
  });

  it('decodes a paginated response with ClavePaginacion echoing', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockConsultaPage(dispatcher, {
      records: [
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
          state: 'Correcto',
        },
      ],
      pagination: 'S',
      nextCursor: {
        issuerNif: 'B12345678',
        seriesNumber: 'A/2026/0002',
        issueDate: '20-05-2026',
      },
    });

    const envelope = makeConsultaEnvelope();
    const response = await client.call(ENDPOINT, '', envelope);
    const decoded = parseRespuestaConsulta(response.body);

    expect(decoded.outcome).toBe('ConDatos');
    expect(decoded.pagination).toBe('S');
    expect(decoded.records).toHaveLength(2);
    expect(decoded.nextCursor).toEqual({
      IDEmisorFactura: 'B12345678',
      NumSerieFactura: 'A/2026/0002',
      FechaExpedicionFactura: '20-05-2026',
    });
  });

  it('decodes the last page (IndicadorPaginacion=N) without nextCursor', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockConsultaPage(dispatcher, {
      records: [
        {
          issuerNif: 'B12345678',
          seriesNumber: 'A/2026/0003',
          issueDate: '20-05-2026',
          state: 'Correcto',
        },
      ],
      pagination: 'N',
    });

    const envelope = makeConsultaEnvelope({
      issuerNif: 'B12345678',
      seriesNumber: 'A/2026/0002',
      issueDate: '20-05-2026',
    });
    const response = await client.call(ENDPOINT, '', envelope);
    const decoded = parseRespuestaConsulta(response.body);

    expect(decoded.pagination).toBe('N');
    expect(decoded.nextCursor).toBeUndefined();
    expect(decoded.records).toHaveLength(1);
  });

  it('decodes an empty consulta response (ResultadoConsulta=SinDatos)', async () => {
    const { client, dispatcher } = makeClient();
    teardown = () => client.close();
    mockConsultaPage(dispatcher, { records: [], pagination: 'N' });

    const response = await client.call(ENDPOINT, '', makeConsultaEnvelope());
    const decoded = parseRespuestaConsulta(response.body);

    expect(decoded.outcome).toBe('SinDatos');
    expect(decoded.records).toHaveLength(0);
  });
});
