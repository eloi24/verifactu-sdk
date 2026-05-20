/**
 * Round-trip tests asserting builder/parser consistency on representative
 * examples derived from anexo §9 of the AEAT "Descripción Servicios Web v1.0.3"
 * document.
 *
 * The test takes a known-good wire object, builds an envelope, then strips
 * the SOAP wrapper and reparses the inner `RegistroAlta`. The reparsed
 * structure must equal the original after wire → public → wire round-tripping.
 */

import { describe, expect, it } from 'bun:test';
import { XMLParser } from 'fast-xml-parser';
import { RegistroAltaSchema, RegistroAnulacionSchema } from '../../src/schemas/index.ts';
import { cancelInvoiceFromWire, invoiceFromWire } from '../../src/wire/fromWire.ts';
import { cancelInvoiceToWire, invoiceToWire } from '../../src/wire/toWire.ts';
import { buildRegFactuEnvelope } from '../../src/xml/builder.ts';
import { canonicaliseXml } from '../../src/xml/canonical.ts';
import { buildCancelInvoice, buildInvoice } from '../unit/schemas/fixtures.ts';

const ALWAYS_ARRAY = new Set([
  'IDDestinatario',
  'DetalleDesglose',
  'IDFacturaRectificada',
  'IDFacturaSustituida',
  'RegistroFactura',
  'RespuestaLinea',
  'RegistroRespuestaConsultaFactuSistemaFacturacion',
]);
const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  isArray: (name) => ALWAYS_ARRAY.has(name),
});

describe('XML envelope round-trip', () => {
  it('emits a UTF-8 declaration and the soapenv envelope wrapper', () => {
    const wire = invoiceToWire(buildInvoice());
    const xml = buildRegFactuEnvelope({
      cabecera: {
        ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
        RemisionVoluntaria: {},
      },
      registros: [{ kind: 'alta', record: wire }],
    });

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.includes('soapenv:Envelope')).toBe(true);
    expect(xml.includes('sum:RegFactuSistemaFacturacion')).toBe(true);
    expect(xml.includes('sum1:RegistroAlta')).toBe(true);
  });

  it('round-trips a RegistroAlta through build → parse → fromWire → toWire', () => {
    const original = buildInvoice();
    const wire = invoiceToWire(original);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(true);

    const xml = buildRegFactuEnvelope({
      cabecera: {
        ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
        RemisionVoluntaria: {},
      },
      registros: [{ kind: 'alta', record: wire }],
    });

    const parsed = parser.parse(xml) as Record<string, unknown>;
    const innerRecord = extractRegistroAlta(parsed);
    const reparsed = RegistroAltaSchema.parse(innerRecord);
    expect(invoiceFromWire(reparsed)).toEqual(original);
  });

  it('round-trips a RegistroAnulacion the same way', () => {
    const original = buildCancelInvoice();
    const wire = cancelInvoiceToWire(original);
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(true);

    const xml = buildRegFactuEnvelope({
      cabecera: {
        ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
        RemisionVoluntaria: {},
      },
      registros: [{ kind: 'anulacion', record: wire }],
    });

    const parsed = parser.parse(xml) as Record<string, unknown>;
    const innerRecord = extractRegistroAnulacion(parsed);
    const reparsed = RegistroAnulacionSchema.parse(innerRecord);
    expect(cancelInvoiceFromWire(reparsed)).toEqual(original);
  });

  it('canonicalises an envelope without altering its semantics', () => {
    const wire = invoiceToWire(buildInvoice());
    const xml = buildRegFactuEnvelope({
      cabecera: {
        ObligadoEmision: { NombreRazon: 'Acme Software SL', NIF: 'B12345678' },
        RemisionVoluntaria: {},
      },
      registros: [{ kind: 'alta', record: wire }],
    });

    const canonical = canonicaliseXml(xml);
    expect(canonical).toContain('<soapenv:Envelope');
    expect(canonical).toContain('xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"');
    // Canonical form never self-closes tags.
    expect(canonical).not.toMatch(/<[^>]+\/>/u);
  });
});

function extractRegistroAlta(envelope: Record<string, unknown>): unknown {
  const body = pickPath(envelope, ['Envelope', 'Body', 'RegFactuSistemaFacturacion']);
  if (body === undefined) {
    throw new Error('round-trip: cannot locate RegFactuSistemaFacturacion');
  }
  const registro = (body as Record<string, unknown>).RegistroFactura;
  const first = Array.isArray(registro) ? registro[0] : registro;
  if (first === undefined) {
    throw new Error('round-trip: empty RegistroFactura');
  }
  return (first as Record<string, unknown>).RegistroAlta;
}

function extractRegistroAnulacion(envelope: Record<string, unknown>): unknown {
  const body = pickPath(envelope, ['Envelope', 'Body', 'RegFactuSistemaFacturacion']);
  if (body === undefined) {
    throw new Error('round-trip: cannot locate RegFactuSistemaFacturacion');
  }
  const registro = (body as Record<string, unknown>).RegistroFactura;
  const first = Array.isArray(registro) ? registro[0] : registro;
  if (first === undefined) {
    throw new Error('round-trip: empty RegistroFactura');
  }
  return (first as Record<string, unknown>).RegistroAnulacion;
}

function pickPath(node: unknown, path: readonly string[]): unknown {
  let current: unknown = node;
  for (const key of path) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
