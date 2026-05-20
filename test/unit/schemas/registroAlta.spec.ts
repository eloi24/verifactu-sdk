/**
 * Unit tests for {@link RegistroAltaSchema} and its constituents.
 *
 * Each test starts from a known-good fixture and either accepts it as-is or
 * mutates a single field to verify a negative case.
 */

import { describe, expect, it } from 'bun:test';
import {
  DetalleDesgloseSchema,
  EncadenamientoSchema,
  RegistroAltaSchema,
} from '../../../src/schemas/index.ts';
import { invoiceToWire } from '../../../src/wire/toWire.ts';
import { buildInvoice } from './fixtures.ts';

describe('RegistroAltaSchema', () => {
  it('accepts the happy-path fixture', () => {
    const wire = invoiceToWire(buildInvoice());
    const result = RegistroAltaSchema.safeParse(wire);
    if (!result.success) {
      throw new Error(`Expected success but got ${JSON.stringify(result.error.issues)}`);
    }
    expect(result.success).toBe(true);
  });

  it('rejects an unknown TipoFactura', () => {
    const wire = invoiceToWire(buildInvoice());
    const bad = { ...wire, TipoFactura: 'F9' };
    expect(RegistroAltaSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a malformed issue date (ISO instead of wire)', () => {
    const wire = invoiceToWire(buildInvoice());
    const bad = {
      ...wire,
      IDFactura: { ...wire.IDFactura, FechaExpedicionFactura: '2026-05-20' },
    };
    expect(RegistroAltaSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a missing required field (DescripcionOperacion)', () => {
    const wire = invoiceToWire(buildInvoice()) as Record<string, unknown>;
    wire.DescripcionOperacion = undefined;
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(false);
  });

  it('rejects a Desglose with more than 12 lines', () => {
    const invoice = buildInvoice();
    invoice.breakdown = Array.from({ length: 13 }, () => ({ ...invoice.breakdown[0]! }));
    const wire = invoiceToWire(invoice);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(false);
  });

  it('rejects a Huella with lowercase hex characters', () => {
    const invoice = buildInvoice();
    invoice.hash = 'a'.repeat(64);
    const wire = invoiceToWire(invoice);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(false);
  });

  it('rejects a Macrodato outside the {S,N} enum', () => {
    const wire = invoiceToWire({ ...buildInvoice(), macroData: 'S' });
    const bad = { ...wire, Macrodato: 'YES' };
    expect(RegistroAltaSchema.safeParse(bad).success).toBe(false);
  });
});

describe('EncadenamientoSchema', () => {
  it('accepts a first-record link', () => {
    expect(EncadenamientoSchema.safeParse({ PrimerRegistro: 'S' }).success).toBe(true);
  });

  it('accepts a previous-record link', () => {
    expect(
      EncadenamientoSchema.safeParse({
        RegistroAnterior: {
          IDEmisorFactura: 'B12345678',
          NumSerieFactura: 'A/2026/0001',
          FechaExpedicionFactura: '20-05-2026',
          Huella: 'A'.repeat(64),
        },
      }).success,
    ).toBe(true);
  });

  it('rejects when both options are present', () => {
    expect(
      EncadenamientoSchema.safeParse({
        PrimerRegistro: 'S',
        RegistroAnterior: {
          IDEmisorFactura: 'B12345678',
          NumSerieFactura: 'A/2026/0001',
          FechaExpedicionFactura: '20-05-2026',
          Huella: 'A'.repeat(64),
        },
      }).success,
    ).toBe(false);
  });
});

describe('DetalleDesgloseSchema', () => {
  it('accepts an S1-qualified line', () => {
    expect(
      DetalleDesgloseSchema.safeParse({
        Impuesto: '01',
        ClaveRegimen: '01',
        CalificacionOperacion: 'S1',
        TipoImpositivo: '21',
        BaseImponibleOimporteNoSujeto: '100.00',
        CuotaRepercutida: '21.00',
      }).success,
    ).toBe(true);
  });

  it('accepts an exempt-operation line', () => {
    expect(
      DetalleDesgloseSchema.safeParse({
        Impuesto: '01',
        ClaveRegimen: '01',
        OperacionExenta: 'E1',
        BaseImponibleOimporteNoSujeto: '100.00',
      }).success,
    ).toBe(true);
  });

  it('rejects when both CalificacionOperacion and OperacionExenta are present', () => {
    expect(
      DetalleDesgloseSchema.safeParse({
        Impuesto: '01',
        CalificacionOperacion: 'S1',
        OperacionExenta: 'E1',
        BaseImponibleOimporteNoSujeto: '100.00',
      }).success,
    ).toBe(false);
  });

  it('rejects when neither CalificacionOperacion nor OperacionExenta is present', () => {
    expect(
      DetalleDesgloseSchema.safeParse({
        Impuesto: '01',
        BaseImponibleOimporteNoSujeto: '100.00',
      }).success,
    ).toBe(false);
  });
});
