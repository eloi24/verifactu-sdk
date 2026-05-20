/**
 * In-process SOAP mock for AEAT integration tests.
 *
 * Implements the {@link SoapTransport} surface used by the production
 * SoapClient and lets each test register canned responses keyed by URL +
 * envelope predicates. The mock never opens a socket, so it works regardless
 * of the runtime's undici flavour (Bun's bundled vs. the npm package).
 */
import type { SoapTransport } from '../../../src/client/soap.ts';

export const MOCK_BASE_URL = 'https://prewww1.aeat.es';
export const MOCK_PATH = '/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP';
export const MOCK_ENDPOINT = `${MOCK_BASE_URL}${MOCK_PATH}`;

export interface MockedRecord {
  /** Issuer NIF — appears in `IDEmisorFactura`. */
  issuerNif: string;
  /** Series + number identifier. */
  seriesNumber: string;
  /** Issue date in `DD-MM-YYYY` form. */
  issueDate: string;
  /** Acceptance state. */
  state: 'Correcto' | 'AceptadoConErrores' | 'Incorrecto';
  /** Optional external reference echoed back. */
  refExterna?: string;
  /** Optional error code emitted by the AEAT. */
  errorCode?: number;
  /** Optional error description emitted by the AEAT. */
  errorDescription?: string;
  /** Operation kind. */
  operation?: 'Alta' | 'Anulacion';
}

interface QueuedResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

/**
 * Mock transport: drains a FIFO queue of responses. Throws when the queue is
 * empty so tests don't silently swallow extra calls.
 */
export class MockTransport {
  private readonly queue: QueuedResponse[] = [];
  public readonly calls: Array<{ url: string; body: string }> = [];

  public enqueue(response: QueuedResponse): void {
    this.queue.push(response);
  }

  public get transport(): SoapTransport {
    return async (url, init) => {
      this.calls.push({ url, body: init.body });
      const next = this.queue.shift();
      if (next === undefined) {
        throw new Error(`MockTransport: no canned response left for ${url}`);
      }
      return {
        statusCode: next.status,
        headers: { ...next.headers },
        body: { text: async () => next.body },
      };
    };
  }
}

/**
 * Convenience: build a fresh transport with no responses queued.
 */
export function createMockAgent(): MockTransport {
  return new MockTransport();
}

export function deriveEnvelopeState(records: MockedRecord[]): string {
  if (records.every((r) => r.state === 'Correcto')) {
    return 'Correcto';
  }
  if (records.every((r) => r.state === 'Incorrecto')) {
    return 'Incorrecto';
  }
  return 'ParcialmenteCorrecto';
}

export function mockAcceptAll(
  agent: MockTransport,
  records: MockedRecord[],
  options: { waitSeconds?: number; csv?: string } = {},
): void {
  const responseXml = buildRespuestaSuministro({
    records: records.map((r) => ({ ...r, state: 'Correcto' as const })),
    waitSeconds: options.waitSeconds ?? 60,
    csv: options.csv ?? 'CSVTEST123',
  });
  agent.enqueue({
    status: 200,
    body: responseXml,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockAcceptPartial(
  agent: MockTransport,
  records: MockedRecord[],
  options: { waitSeconds?: number; csv?: string } = {},
): void {
  const responseXml = buildRespuestaSuministro({
    records,
    waitSeconds: options.waitSeconds ?? 60,
    csv: options.csv ?? 'CSVTEST123',
  });
  agent.enqueue({
    status: 200,
    body: responseXml,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockRejectAll(
  agent: MockTransport,
  records: MockedRecord[],
  options: { waitSeconds?: number } = {},
): void {
  const responseXml = buildRespuestaSuministro({
    records: records.map((r) => ({
      ...r,
      state: 'Incorrecto' as const,
      errorCode: r.errorCode ?? 1100,
      errorDescription: r.errorDescription ?? 'Valor o tipo incorrecto del campo',
    })),
    waitSeconds: options.waitSeconds ?? 60,
  });
  agent.enqueue({
    status: 200,
    body: responseXml,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockSoapFault(
  agent: MockTransport,
  faultstring: string,
  faultcode = 'soapenv:Server',
): void {
  agent.enqueue({
    status: 500,
    body: buildSoapFault(faultcode, faultstring),
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockFlowControl(
  agent: MockTransport,
  waitSeconds: number,
  records: MockedRecord[],
): void {
  const responseXml = buildRespuestaSuministro({
    records: records.map((r) => ({ ...r, state: 'Correcto' as const })),
    waitSeconds,
    csv: 'CSVFC',
  });
  agent.enqueue({
    status: 200,
    body: responseXml,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockDuplicate(
  agent: MockTransport,
  duplicate: { idPeticion: string; state: 'Correcta' | 'AceptadaConErrores' | 'Anulada' },
  records: MockedRecord[],
): void {
  const responseXml = buildRespuestaSuministro({
    records: records.map((r) => ({
      ...r,
      state: 'Incorrecto' as const,
      errorCode: 3000,
      errorDescription: 'Registro duplicado',
    })),
    waitSeconds: 60,
    duplicate,
  });
  agent.enqueue({
    status: 200,
    body: responseXml,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

export function mockConsultaPage(
  agent: MockTransport,
  options: {
    records: MockedRecord[];
    pagination: 'S' | 'N';
    nextCursor?: { issuerNif: string; seriesNumber: string; issueDate: string };
    ejercicio?: string;
    periodo?: string;
  },
): void {
  agent.enqueue({
    status: 200,
    body: buildRespuestaConsulta(options),
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

interface BuildResponseOptions {
  records: MockedRecord[];
  waitSeconds: number;
  csv?: string;
  duplicate?: { idPeticion: string; state: 'Correcta' | 'AceptadaConErrores' | 'Anulada' };
}

function buildRespuestaSuministro(options: BuildResponseOptions): string {
  const lineas = options.records
    .map((record) => {
      const dup =
        options.duplicate !== undefined
          ? `        <sfR:RegistroDuplicado>
          <sf:IdPeticionRegistroDuplicado>${options.duplicate.idPeticion}</sf:IdPeticionRegistroDuplicado>
          <sf:EstadoRegistroDuplicado>${options.duplicate.state}</sf:EstadoRegistroDuplicado>
        </sfR:RegistroDuplicado>`
          : '';
      const code =
        record.errorCode !== undefined
          ? `        <sfR:CodigoErrorRegistro>${record.errorCode}</sfR:CodigoErrorRegistro>`
          : '';
      const desc =
        record.errorDescription !== undefined
          ? `        <sfR:DescripcionErrorRegistro>${escapeXml(record.errorDescription)}</sfR:DescripcionErrorRegistro>`
          : '';
      const refExterna =
        record.refExterna !== undefined
          ? `        <sf:RefExterna>${escapeXml(record.refExterna)}</sf:RefExterna>`
          : '';
      return `      <sfR:RespuestaLinea>
        <sf:IDFactura>
          <sf:IDEmisorFactura>${record.issuerNif}</sf:IDEmisorFactura>
          <sf:NumSerieFactura>${escapeXml(record.seriesNumber)}</sf:NumSerieFactura>
          <sf:FechaExpedicionFactura>${record.issueDate}</sf:FechaExpedicionFactura>
        </sf:IDFactura>
        <sf:Operacion>
          <sf:TipoOperacion>${record.operation ?? 'Alta'}</sf:TipoOperacion>
        </sf:Operacion>
${refExterna}
        <sfR:EstadoRegistro>${record.state}</sfR:EstadoRegistro>
${code}
${desc}
${dup}
      </sfR:RespuestaLinea>`;
    })
    .map((line) => line.replace(/^\s*\n/gmu, ''))
    .join('\n');

  const csv = options.csv !== undefined ? `    <sfR:CSV>${options.csv}</sfR:CSV>\n` : '';
  const envelopeState = deriveEnvelopeState(options.records);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:sfR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaSuministro.xsd"
  xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">
  <soapenv:Body>
    <sfR:RespuestaRegFactuSistemaFacturacion>
${csv}      <sf:Cabecera>
        <sf:ObligadoEmision>
          <sf:NombreRazon>Eloi Baulenas</sf:NombreRazon>
          <sf:NIF>B12345678</sf:NIF>
        </sf:ObligadoEmision>
      </sf:Cabecera>
      <sfR:TiempoEsperaEnvio>${options.waitSeconds}</sfR:TiempoEsperaEnvio>
      <sfR:EstadoEnvio>${envelopeState}</sfR:EstadoEnvio>
${lineas}
    </sfR:RespuestaRegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildRespuestaConsulta(options: {
  records: MockedRecord[];
  pagination: 'S' | 'N';
  nextCursor?: { issuerNif: string; seriesNumber: string; issueDate: string };
  ejercicio?: string;
  periodo?: string;
}): string {
  const records = options.records
    .map(
      (r) => `    <sfLRRC:RegistroRespuestaConsultaFactuSistemaFacturacion>
      <sf:IDFactura>
        <sf:IDEmisorFactura>${r.issuerNif}</sf:IDEmisorFactura>
        <sf:NumSerieFactura>${escapeXml(r.seriesNumber)}</sf:NumSerieFactura>
        <sf:FechaExpedicionFactura>${r.issueDate}</sf:FechaExpedicionFactura>
      </sf:IDFactura>
      <sfLRRC:DatosRegistroFacturacion/>
      <sfLRRC:EstadoRegistro>
        <sfLRRC:TimestampUltimaModificacion>2026-05-20T12:34:56+02:00</sfLRRC:TimestampUltimaModificacion>
        <sfLRRC:EstadoRegistro>Correcto</sfLRRC:EstadoRegistro>
      </sfLRRC:EstadoRegistro>
    </sfLRRC:RegistroRespuestaConsultaFactuSistemaFacturacion>`,
    )
    .join('\n');

  const cursor =
    options.pagination === 'S' && options.nextCursor !== undefined
      ? `    <sf:ClavePaginacion>
      <sf:IDEmisorFactura>${options.nextCursor.issuerNif}</sf:IDEmisorFactura>
      <sf:NumSerieFactura>${escapeXml(options.nextCursor.seriesNumber)}</sf:NumSerieFactura>
      <sf:FechaExpedicionFactura>${options.nextCursor.issueDate}</sf:FechaExpedicionFactura>
    </sf:ClavePaginacion>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:sfLRRC="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaConsultaLR.xsd"
  xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">
  <soapenv:Body>
    <sfLRRC:RespuestaConsultaFactuSistemaFacturacion>
      <sf:Cabecera>
        <sf:IDVersion>1.0</sf:IDVersion>
        <sf:ObligadoEmision>
          <sf:NombreRazon>Eloi Baulenas</sf:NombreRazon>
          <sf:NIF>B12345678</sf:NIF>
        </sf:ObligadoEmision>
      </sf:Cabecera>
      <sfLRRC:PeriodoImputacion>
        <sf:Ejercicio>${options.ejercicio ?? '2026'}</sf:Ejercicio>
        <sf:Periodo>${options.periodo ?? '05'}</sf:Periodo>
      </sfLRRC:PeriodoImputacion>
      <sfLRRC:IndicadorPaginacion>${options.pagination}</sfLRRC:IndicadorPaginacion>
      <sfLRRC:ResultadoConsulta>${options.records.length > 0 ? 'ConDatos' : 'SinDatos'}</sfLRRC:ResultadoConsulta>
${records}
${cursor}
    </sfLRRC:RespuestaConsultaFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildSoapFault(faultcode: string, faultstring: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>${escapeXml(faultcode)}</faultcode>
      <faultstring>${escapeXml(faultstring)}</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}
