/**
 * SOAP-envelope parsers for AEAT VERI*FACTU responses.
 *
 * Each public function consumes the raw XML bytes (as a string) returned by
 * the AEAT and yields a typed object. The parser strips namespace prefixes
 * so callers can navigate the structure with bare element names — this is
 * safe because every response is unambiguous on the AEAT side.
 *
 * SOAP faults are surfaced as {@link SoapFaultError} instances; structural
 * issues throw plain `Error`s so the caller can decide whether to retry or
 * surface them to the user.
 *
 * @module
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  ClavePaginacion,
  IndicadorPaginacion,
  RegistroDuplicado,
  RegistroRespuestaConsulta,
  RespuestaConsulta,
  RespuestaLinea,
  ResultadoConsulta,
} from '../schemas/index.js';
import type {
  CancelInvoiceInput,
  EnvelopeState,
  Invoice,
  InvoiceId,
  RecordState,
  RegisterInvoiceRecordResult,
  RegisterInvoiceResponse,
} from '../types.js';
import { invoiceIdFromWire } from '../wire/fromWire.js';
import { SoapFaultError } from './errors.js';

/**
 * Shared parser instance.
 *
 * `removeNSPrefix` strips the namespace prefix from every element so the
 * caller-facing structure mirrors the local-name tree (e.g. `RegistroAlta`
 * instead of `sum1:RegistroAlta`). Numbers and booleans stay as strings
 * because the AEAT preserves the exact textual form on the wire and we want
 * to keep that intact for hash and signature paths.
 */
const ALWAYS_ARRAY = new Set<string>([
  'RespuestaLinea',
  'RegistroRespuestaConsultaFactuSistemaFacturacion',
  'IDDestinatario',
  'DetalleDesglose',
  'IDFacturaRectificada',
  'IDFacturaSustituida',
]);

const xmlParser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  textNodeName: '#text',
  ignoreDeclaration: true,
  isArray: (name) => ALWAYS_ARRAY.has(name),
});

/**
 * Detect and throw on `<soapenv:Fault>` envelopes.
 *
 * Inspects a parsed envelope structure (with namespace prefixes stripped) and
 * raises a {@link SoapFaultError} if a fault was found. Returns the body
 * children otherwise.
 *
 * @throws {SoapFaultError} If the envelope wraps a SOAP fault.
 */
function unwrapSoapBody(parsed: Record<string, unknown>): Record<string, unknown> {
  const envelope = pickRecord(parsed, 'Envelope');
  if (envelope === undefined) {
    throw new Error('parseRespuestaSuministro: missing <Envelope> root element');
  }
  const body = pickRecord(envelope, 'Body');
  if (body === undefined) {
    throw new Error('parseRespuestaSuministro: missing <Body> element');
  }
  const fault = pickRecord(body, 'Fault');
  if (fault !== undefined) {
    const faultcode = pickString(fault, 'faultcode') ?? 'unknown';
    const faultstring = pickString(fault, 'faultstring') ?? '';
    const faultactor = pickString(fault, 'faultactor');
    const detailRecord = pickRecord(fault, 'detail');
    throw new SoapFaultError({
      faultcode,
      faultstring,
      ...(faultactor !== undefined ? { faultactor } : {}),
      ...(detailRecord !== undefined ? { detail: JSON.stringify(detailRecord) } : {}),
    });
  }
  return body;
}

/**
 * Parse a `RespuestaRegFactuSistemaFacturacion` response into the public
 * English-named {@link RegisterInvoiceResponse} shape.
 *
 * Used for both the alta and anulacion submissions — the AEAT returns the
 * same envelope type for both.
 *
 * @param xml - Raw response bytes as UTF-8 string.
 * @returns The decoded response with English field names.
 * @throws {SoapFaultError} If the envelope wraps a SOAP fault.
 * @throws {Error} If the envelope is malformed or missing mandatory fields.
 * @example
 * ```ts
 * const response = parseRespuestaSuministro(xmlBytes);
 * console.log(response.envelopeState, response.records.length);
 * ```
 */
export function parseRespuestaSuministro(xml: string): RegisterInvoiceResponse {
  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const body = unwrapSoapBody(parsed);

  const respuesta = pickRecord(body, 'RespuestaRegFactuSistemaFacturacion');
  if (respuesta === undefined) {
    throw new Error('parseRespuestaSuministro: missing <RespuestaRegFactuSistemaFacturacion>');
  }

  const tiempoEsperaEnvio = pickString(respuesta, 'TiempoEsperaEnvio');
  const estadoEnvio = pickString(respuesta, 'EstadoEnvio');
  if (tiempoEsperaEnvio === undefined || estadoEnvio === undefined) {
    throw new Error('parseRespuestaSuministro: missing TiempoEsperaEnvio/EstadoEnvio');
  }

  const lineas = toArray(respuesta.RespuestaLinea);
  const records = lineas.map(parseRespuestaLinea);

  const csv = pickString(respuesta, 'CSV');

  return {
    ...(csv !== undefined ? { csv } : {}),
    waitSeconds: Number.parseInt(tiempoEsperaEnvio, 10),
    envelopeState: estadoEnvio as EnvelopeState,
    records,
  };
}

/**
 * Per-line outcome including the optional duplicate-record information.
 *
 * The base envelope structure is conveyed by the public
 * {@link RegisterInvoiceRecordResult}; this extended object adds the
 * `duplicateRecord` field that the AEAT emits when rejecting a submission
 * because the same `IDFactura` was already stored.
 */
export interface RegisterInvoiceRecordResultExt extends RegisterInvoiceRecordResult {
  /** Information about a pre-existing duplicate, if any. */
  duplicateRecord?: {
    /** Pre-existing AEAT request identifier (`IdPeticionRegistroDuplicado`). */
    requestId: string;
    /** State of the duplicate as stored in the AEAT. */
    state: RegistroDuplicado['EstadoRegistroDuplicado'];
    /** Error code of the duplicate record, if any. */
    errorCode?: number;
    /** Error description of the duplicate record, if any. */
    errorDescription?: string;
  };
}

/**
 * Convert one `RespuestaLinea` wire object to a public record result.
 */
function parseRespuestaLinea(raw: unknown): RegisterInvoiceRecordResultExt {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('parseRespuestaSuministro: RespuestaLinea must be an object');
  }
  const linea = raw as Record<string, unknown>;
  const idFactura = pickRecord(linea, 'IDFactura');
  if (idFactura === undefined) {
    throw new Error('parseRespuestaSuministro: RespuestaLinea is missing IDFactura');
  }
  const operacion = pickRecord(linea, 'Operacion');
  if (operacion === undefined) {
    throw new Error('parseRespuestaSuministro: RespuestaLinea is missing Operacion');
  }
  const estadoRegistro = pickString(linea, 'EstadoRegistro');
  if (estadoRegistro === undefined) {
    throw new Error('parseRespuestaSuministro: RespuestaLinea is missing EstadoRegistro');
  }

  const codigoError = pickString(linea, 'CodigoErrorRegistro');
  const descripcionError = pickString(linea, 'DescripcionErrorRegistro');
  const refExterna = pickString(linea, 'RefExterna');
  const tipoOperacion = pickString(operacion, 'TipoOperacion') as
    | RespuestaLinea['Operacion']['TipoOperacion']
    | undefined;
  if (tipoOperacion === undefined) {
    throw new Error('parseRespuestaSuministro: Operacion is missing TipoOperacion');
  }

  const invoiceId = invoiceIdFromWire({
    IDEmisorFactura: pickString(idFactura, 'IDEmisorFactura') ?? '',
    NumSerieFactura: pickString(idFactura, 'NumSerieFactura') ?? '',
    FechaExpedicionFactura: pickString(idFactura, 'FechaExpedicionFactura') ?? '',
  });

  const result: RegisterInvoiceRecordResultExt = {
    invoiceId,
    operation: tipoOperacion,
    ...(refExterna !== undefined ? { externalReference: refExterna } : {}),
    state: estadoRegistro as RecordState,
    ...(codigoError !== undefined ? { errorCode: Number.parseInt(codigoError, 10) } : {}),
    ...(descripcionError !== undefined ? { errorDescription: descripcionError } : {}),
  };

  const duplicado = pickRecord(linea, 'RegistroDuplicado');
  if (duplicado !== undefined) {
    const requestId = pickString(duplicado, 'IdPeticionRegistroDuplicado');
    const dupState = pickString(duplicado, 'EstadoRegistroDuplicado');
    if (requestId !== undefined && dupState !== undefined) {
      const dupCodigoError = pickString(duplicado, 'CodigoErrorRegistro');
      const dupDescripcion = pickString(duplicado, 'DescripcionErrorRegistro');
      result.duplicateRecord = {
        requestId,
        state: dupState as RegistroDuplicado['EstadoRegistroDuplicado'],
        ...(dupCodigoError !== undefined ? { errorCode: Number.parseInt(dupCodigoError, 10) } : {}),
        ...(dupDescripcion !== undefined ? { errorDescription: dupDescripcion } : {}),
      };
    }
  }

  return result;
}

/**
 * Decoded consulta response — a thin wrapper around the wire structure with
 * the most useful fields surfaced as public English-named properties.
 *
 * The raw {@link RespuestaConsulta} is available via {@link raw} for callers
 * that need access to AEAT-only fields not surfaced on the wire-agnostic API.
 */
export interface ConsultaResponse {
  /** `S` when more pages follow, `N` otherwise. */
  pagination: IndicadorPaginacion;
  /** `ConDatos` if any records were returned, `SinDatos` otherwise. */
  outcome: ResultadoConsulta;
  /** Pagination cursor — present only when {@link pagination} is `S`. */
  nextCursor: ClavePaginacion | undefined;
  /** The list of records returned in this page. */
  records: RegistroRespuestaConsulta[];
  /** The raw decoded wire structure, for advanced inspection. */
  raw: RespuestaConsulta;
}

/**
 * Parse a `RespuestaConsultaFactuSistemaFacturacion` response.
 *
 * The parser is permissive: it does not Zod-validate the AEAT response (the
 * AEAT is the source of truth, and we don't want to bounce records on
 * spec drift). Callers that need a strict assertion can run
 * `RespuestaConsultaSchema.parse(response.raw)` themselves.
 *
 * @param xml - Raw response bytes as UTF-8 string.
 * @returns The decoded {@link ConsultaResponse}.
 * @throws {SoapFaultError} If the envelope wraps a SOAP fault.
 * @throws {Error} If the response is structurally malformed.
 */
export function parseRespuestaConsulta(xml: string): ConsultaResponse {
  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const body = unwrapSoapBody(parsed);

  const respuesta = pickRecord(body, 'RespuestaConsultaFactuSistemaFacturacion');
  if (respuesta === undefined) {
    throw new Error('parseRespuestaConsulta: missing <RespuestaConsultaFactuSistemaFacturacion>');
  }

  const records = toArray(respuesta.RegistroRespuestaConsultaFactuSistemaFacturacion);
  const cabecera = (respuesta.Cabecera ?? {}) as RespuestaConsulta['Cabecera'];
  const periodo = (respuesta.PeriodoImputacion ?? {}) as RespuestaConsulta['PeriodoImputacion'];
  const pagination = (pickString(respuesta, 'IndicadorPaginacion') ?? 'N') as IndicadorPaginacion;
  const outcome = (pickString(respuesta, 'ResultadoConsulta') ?? 'SinDatos') as ResultadoConsulta;
  const clavePaginacion = pickRecord(respuesta, 'ClavePaginacion');

  const nextCursor =
    clavePaginacion !== undefined
      ? ({
          IDEmisorFactura: pickString(clavePaginacion, 'IDEmisorFactura') ?? '',
          NumSerieFactura: pickString(clavePaginacion, 'NumSerieFactura') ?? '',
          FechaExpedicionFactura: pickString(clavePaginacion, 'FechaExpedicionFactura') ?? '',
        } satisfies ClavePaginacion)
      : undefined;

  const decodedRecords = records as RegistroRespuestaConsulta[];

  const raw: RespuestaConsulta = {
    Cabecera: cabecera,
    PeriodoImputacion: periodo,
    IndicadorPaginacion: pagination,
    ResultadoConsulta: outcome,
    RegistroRespuestaConsultaFactuSistemaFacturacion: decodedRecords,
    ...(nextCursor !== undefined ? { ClavePaginacion: nextCursor } : {}),
  };

  return {
    pagination,
    outcome,
    nextCursor,
    records: decodedRecords,
    raw,
  };
}

/**
 * Companion type returned by {@link extractInvoiceIds} — a thin tuple that
 * pairs a wire-decoded record with its public {@link InvoiceId}. Provided as
 * a convenience helper to integration code; the wire shape stays accessible
 * via the {@link record} field.
 */
export interface ParsedRecordSummary {
  /** Public English-named identifier of this record. */
  invoiceId: InvoiceId;
  /** The wire record exactly as the AEAT returned it. */
  record: RegistroRespuestaConsulta;
}

/**
 * Quick helper to extract the {@link InvoiceId}s from a parsed consulta page.
 *
 * @param response - The parsed response page.
 * @returns One entry per record, with the public-form identifier alongside.
 */
export function extractInvoiceIds(response: ConsultaResponse): ParsedRecordSummary[] {
  return response.records.map((record) => ({
    invoiceId: invoiceIdFromWire(record.IDFactura),
    record,
  }));
}

/**
 * Convenience helper to wrap an array-or-singleton value as an array.
 *
 * fast-xml-parser collapses repeated elements: one occurrence becomes a single
 * object, two or more become an array. The AEAT XSDs declare `maxOccurs > 1`
 * for `RespuestaLinea` and `RegistroRespuestaConsulta…` so the parser layer
 * normalises both shapes to arrays.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Read a child value as a record (object), or `undefined` if absent.
 */
function pickRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = source[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Read a child value as a string, or `undefined` if absent or non-string.
 *
 * fast-xml-parser preserves textual values as strings when `parseTagValue` is
 * disabled, but elements with attributes wrap the text into a `#text`
 * property — this helper handles both shapes.
 */
function pickString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const inner = (value as Record<string, unknown>)['#text'];
    if (typeof inner === 'string') {
      return inner;
    }
    if (typeof inner === 'number') {
      return String(inner);
    }
  }
  return undefined;
}

/**
 * Re-export so callers can destructure the {@link Invoice} and
 * {@link CancelInvoiceInput} types without reaching into `../types.js`.
 */
export type { CancelInvoiceInput, Invoice };
