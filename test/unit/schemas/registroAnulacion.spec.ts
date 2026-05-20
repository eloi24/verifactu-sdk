/**
 * Unit tests for {@link RegistroAnulacionSchema}.
 */

import { describe, expect, it } from 'bun:test';
import { RegistroAnulacionSchema } from '../../../src/schemas/index.ts';
import { cancelInvoiceToWire } from '../../../src/wire/toWire.ts';
import { buildCancelInvoice } from './fixtures.ts';

describe('RegistroAnulacionSchema', () => {
  it('accepts the happy-path fixture', () => {
    const wire = cancelInvoiceToWire(buildCancelInvoice());
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(true);
  });

  it('accepts a cancellation with explicit generator', () => {
    const wire = cancelInvoiceToWire({
      ...buildCancelInvoice(),
      generatedBy: 'T',
      generator: { legalName: 'Asesoria SL', nif: 'B87654321' },
    });
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(true);
  });

  it('rejects an unknown GeneradoPor value', () => {
    const wire = cancelInvoiceToWire(buildCancelInvoice()) as Record<string, unknown>;
    wire.GeneradoPor = 'X';
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(false);
  });

  it('rejects a malformed cancelled-invoice date', () => {
    const input = buildCancelInvoice();
    input.cancelledInvoiceId.issueDate = '20-05-2026';
    expect(() => cancelInvoiceToWire(input)).toThrow();
  });

  it('rejects when IDFactura is missing required fields', () => {
    const wire = cancelInvoiceToWire(buildCancelInvoice()) as Record<string, unknown>;
    (wire.IDFactura as Record<string, unknown>) = {
      IDEmisorFacturaAnulada: 'B12345678',
    };
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(false);
  });

  it('rejects when Encadenamiento is missing', () => {
    const wire = cancelInvoiceToWire(buildCancelInvoice()) as Record<string, unknown>;
    wire.Encadenamiento = undefined;
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(false);
  });
});
