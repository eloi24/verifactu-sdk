/**
 * SOAP envelope builders for the AEAT VERI*FACTU services.
 *
 * Each public function takes a Zod-validated wire object (the Spanish-named
 * structures produced by `src/wire/toWire.ts`) and emits a SOAP 1.1
 * Document/Literal envelope ready to be POSTed to the AEAT. The namespaces,
 * prefixes and element order follow the WSDL and the example envelopes from
 * §9 of the "Descripción Servicios Web v1.0.3" document.
 *
 * @module
 */

import { XMLBuilder } from 'fast-xml-parser';
import type {
  Cabecera,
  ConsultaFactu,
  FiltroConsulta,
  RegistroAlta,
  RegistroAnulacion,
} from '../schemas/index.js';
import {
  CONSULTA_LR_NS,
  CONSULTA_LR_PREFIX,
  SOAP_ENV_NS,
  SOAP_ENV_PREFIX,
  SUMINISTRO_INFO_NS,
  SUMINISTRO_INFO_PREFIX,
  SUMINISTRO_LR_NS,
  SUMINISTRO_LR_PREFIX,
} from './namespaces.js';

/**
 * A single record of a `RegistroFactura` block — either a registration or a
 * cancellation. The discriminator is the {@link kind} field; the {@link record}
 * carries the wire-validated payload.
 */
export type RegistroFacturaEntry =
  | { kind: 'alta'; record: RegistroAlta }
  | { kind: 'anulacion'; record: RegistroAnulacion };

/**
 * Input to {@link buildRegFactuEnvelope}.
 *
 * Mirrors the structure of `<sum:RegFactuSistemaFacturacion>`: a single
 * {@link Cabecera} plus 1 to 1000 record entries (the AEAT limit).
 */
export interface RegFactuInput {
  /** Header block applied to every record in the batch. */
  cabecera: Cabecera;
  /** 1–1000 record entries; each is either an alta or an anulacion. */
  registros: RegistroFacturaEntry[];
}

/**
 * Input to {@link buildConsultaFactuEnvelope}.
 */
export type ConsultaFactuInput = ConsultaFactu;

/**
 * Input to {@link buildValidacionRegistroEnvelope}.
 *
 * The non-VERI*FACTU validation service consumes the same `RegFactu…` payload
 * but is exposed through the `sfPortTypePorRequerimiento` binding. The wire
 * payload is identical at the XML level, so this is currently an alias of
 * {@link RegFactuInput}.
 */
export type ValidacionRegistroInput = RegFactuInput;

/**
 * The maximum number of records the AEAT accepts in a single envelope.
 *
 * Defined in §6.4 of the SWeb v1.0.3 PDF: "El número máximo de registros a
 * remitir en cada envío queda determinado por el diseño de registro".
 */
export const MAX_RECORDS_PER_ENVELOPE = 1000 as const;

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * Shared XMLBuilder instance.
 *
 * Configured with `format: false` to produce compact output (the AEAT does not
 * require pretty-printing and any extra whitespace inside `Body` would break
 * the canonical form expected by the XAdES signer). `suppressEmptyNode` keeps
 * empty/undefined fields out of the document — they would otherwise serialise
 * as `<foo/>` which the AEAT rejects.
 */
const xmlBuilder = new XMLBuilder({
  format: false,
  suppressEmptyNode: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: false,
  processEntities: true,
});

/**
 * Prefix every key of {@link value} with the given namespace prefix.
 *
 * Recursively walks nested objects and arrays so the entire `Cabecera` /
 * `RegistroAlta` / `RegistroAnulacion` subtree ends up qualified. Attribute
 * keys (those starting with `@_`) are preserved verbatim.
 */
function prefixKeys<T>(value: T, prefix: string): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => prefixKeys(entry, prefix));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const newKey = key.startsWith('@_') ? key : `${prefix}:${key}`;
      out[newKey] = prefixKeys(val, prefix);
    }
    return out;
  }
  return value;
}

/**
 * Build a single `<sum:RegistroFactura>` JS object from a registration or
 * cancellation entry.
 *
 * The choice between `RegistroAlta` and `RegistroAnulacion` mirrors the
 * `<xsd:choice>` declared in `SuministroLR.xsd`.
 */
function buildRegistroFactura(entry: RegistroFacturaEntry): Record<string, unknown> {
  const childKey = entry.kind === 'alta' ? 'RegistroAlta' : 'RegistroAnulacion';
  const qualifiedChild = `${SUMINISTRO_INFO_PREFIX}:${childKey}`;
  return {
    [qualifiedChild]: prefixKeys(entry.record, SUMINISTRO_INFO_PREFIX),
  };
}

/**
 * Build a SOAP 1.1 Document/Literal envelope wrapping
 * `<sum:RegFactuSistemaFacturacion>`.
 *
 * The envelope is suitable for POST to either `…/VerifactuSOAP` (voluntary
 * mode) or `…/RequerimientoSOAP` (on-request mode); the AEAT distinguishes
 * the two by the URL, not by the SOAPAction header (which is empty in the
 * WSDL).
 *
 * @param input - Header and 1–1000 record entries.
 * @returns The serialised UTF-8 XML envelope with `<?xml …?>` declaration.
 * @throws {Error} If {@link input.registros} is empty or exceeds the
 *   AEAT 1000-record per-envelope limit.
 * @example
 * ```ts
 * const xml = buildRegFactuEnvelope({
 *   cabecera: cabeceraWire,
 *   registros: [{ kind: 'alta', record: registroAltaWire }],
 * });
 * ```
 * @see {@link https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl | WSDL}
 */
export function buildRegFactuEnvelope(input: RegFactuInput): string {
  if (input.registros.length === 0) {
    throw new Error('buildRegFactuEnvelope: at least one record is required.');
  }
  if (input.registros.length > MAX_RECORDS_PER_ENVELOPE) {
    throw new Error(
      `buildRegFactuEnvelope: max ${MAX_RECORDS_PER_ENVELOPE} records per envelope, got ${input.registros.length}.`,
    );
  }

  const body = {
    [`${SUMINISTRO_LR_PREFIX}:RegFactuSistemaFacturacion`]: {
      [`${SUMINISTRO_LR_PREFIX}:Cabecera`]: prefixKeys(input.cabecera, SUMINISTRO_INFO_PREFIX),
      [`${SUMINISTRO_LR_PREFIX}:RegistroFactura`]: input.registros.map(buildRegistroFactura),
    },
  };

  return buildSoapEnvelope(body, {
    [`@_xmlns:${SUMINISTRO_LR_PREFIX}`]: SUMINISTRO_LR_NS,
    [`@_xmlns:${SUMINISTRO_INFO_PREFIX}`]: SUMINISTRO_INFO_NS,
  });
}

/**
 * Build a SOAP 1.1 envelope wrapping `<con:ConsultaFactuSistemaFacturacion>`.
 *
 * @param input - The query wire object — exactly the structure validated by
 *   `ConsultaFactuSchema`.
 * @returns The serialised UTF-8 XML envelope.
 * @example
 * ```ts
 * const xml = buildConsultaFactuEnvelope({
 *   Cabecera: { IDVersion: '1.0', ObligadoEmision: { NombreRazon: 'X', NIF: 'B12345678' } },
 *   FiltroConsulta: { PeriodoImputacion: { Ejercicio: '2026', Periodo: '05' } },
 * });
 * ```
 */
export function buildConsultaFactuEnvelope(input: ConsultaFactuInput): string {
  const consultaPayload: Record<string, unknown> = {
    [`${CONSULTA_LR_PREFIX}:Cabecera`]: prefixKeys(input.Cabecera, SUMINISTRO_INFO_PREFIX),
    [`${CONSULTA_LR_PREFIX}:FiltroConsulta`]: prefixKeys(
      filtroConsultaToHybrid(input.FiltroConsulta),
      SUMINISTRO_INFO_PREFIX,
    ),
  };
  if (input.DatosAdicionalesRespuesta !== undefined) {
    consultaPayload[`${CONSULTA_LR_PREFIX}:DatosAdicionalesRespuesta`] = prefixKeys(
      input.DatosAdicionalesRespuesta,
      SUMINISTRO_INFO_PREFIX,
    );
  }

  const body = {
    [`${CONSULTA_LR_PREFIX}:ConsultaFactuSistemaFacturacion`]: consultaPayload,
  };

  return buildSoapEnvelope(body, {
    [`@_xmlns:${CONSULTA_LR_PREFIX}`]: CONSULTA_LR_NS,
    [`@_xmlns:${SUMINISTRO_INFO_PREFIX}`]: SUMINISTRO_INFO_NS,
  });
}

/**
 * `FiltroConsulta`'s `PeriodoImputacion` is declared in the
 * `ConsultaLR.xsd` target namespace (as an inline complexType inside the
 * filter), while its children belong to `SuministroInformacion.xsd`. This
 * helper keeps the wire object as-is but tags `PeriodoImputacion` so the
 * recursive prefixing keeps it in the consulta namespace.
 */
function filtroConsultaToHybrid(filter: FiltroConsulta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    out[key] = value;
  }
  return out;
}

/**
 * Build a SOAP envelope for the non-VERI*FACTU validation service.
 *
 * The wire payload is identical to {@link buildRegFactuEnvelope}; the routing
 * difference between the two operations is exclusively in the endpoint URL
 * (`/VerifactuSOAP` vs `/RequerimientoSOAP`) and in the certificate the
 * caller presents. This separate function exists so callers can express
 * intent at the type level.
 *
 * @see {@link buildRegFactuEnvelope}
 */
export function buildValidacionRegistroEnvelope(input: ValidacionRegistroInput): string {
  return buildRegFactuEnvelope(input);
}

/**
 * Wrap a body element map in the SOAP 1.1 envelope skeleton.
 *
 * `bodyChildren` is the set of children of the `<soapenv:Body>` element. The
 * caller-supplied {@link extraNamespaces} are emitted as attributes of the
 * envelope element next to the `soapenv` namespace declaration.
 */
function buildSoapEnvelope(
  bodyChildren: Record<string, unknown>,
  extraNamespaces: Record<string, string>,
): string {
  const envelopeKey = `${SOAP_ENV_PREFIX}:Envelope`;
  const headerKey = `${SOAP_ENV_PREFIX}:Header`;
  const bodyKey = `${SOAP_ENV_PREFIX}:Body`;

  const envelope = {
    [envelopeKey]: {
      [`@_xmlns:${SOAP_ENV_PREFIX}`]: SOAP_ENV_NS,
      ...extraNamespaces,
      [headerKey]: {},
      [bodyKey]: bodyChildren,
    },
  };

  return `${XML_DECLARATION}${xmlBuilder.build(envelope)}`;
}
