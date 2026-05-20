/**
 * Round-trip tests for the wire transformer.
 *
 * Verifies that `fromWire(toWire(x))` returns the original public structure
 * for both the alta and anulacion paths, and that intermediate validation
 * via the Zod schemas succeeds.
 */

import { describe, expect, it } from 'bun:test';
import { RegistroAltaSchema, RegistroAnulacionSchema } from '../../../src/schemas/index.ts';
import { isoDateToWireDate, wireDateToIsoDate } from '../../../src/wire/dates.ts';
import { cancelInvoiceFromWire, invoiceFromWire } from '../../../src/wire/fromWire.ts';
import { cancelInvoiceToWire, invoiceToWire } from '../../../src/wire/toWire.ts';
import { buildCancelInvoice, buildInvoice } from './fixtures.ts';

describe('date helpers', () => {
  it('converts ISO ↔ wire dates without loss', () => {
    expect(isoDateToWireDate('2026-05-20')).toBe('20-05-2026');
    expect(wireDateToIsoDate('20-05-2026')).toBe('2026-05-20');
  });

  it('rejects malformed dates', () => {
    expect(() => isoDateToWireDate('20/05/2026')).toThrow();
    expect(() => wireDateToIsoDate('2026-05-20')).toThrow();
  });
});

describe('Invoice round-trip', () => {
  it('preserves the minimal happy-path fixture', () => {
    const original = buildInvoice();
    const wire = invoiceToWire(original);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(true);
    const back = invoiceFromWire(wire);
    expect(back).toEqual(original);
  });

  it('preserves an invoice with every optional field populated', () => {
    const original = {
      ...buildInvoice(),
      externalReference: 'ext-123',
      correction: 'N' as const,
      priorRejection: 'N' as const,
      operationDate: '2026-05-18',
      simplifiedArt7273: 'N' as const,
      withoutRecipientArt61d: 'N' as const,
      macroData: 'N' as const,
      coupon: 'N' as const,
      agreementNumber: 'AC0001',
      systemAgreementId: 'SI0001',
    };
    const wire = invoiceToWire(original);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(true);
    expect(invoiceFromWire(wire)).toEqual(original);
  });

  it('preserves an invoice with a previous-record chain link', () => {
    const original = {
      ...buildInvoice(),
      chainLink: {
        first: false,
        previousIssuerNif: 'B12345678',
        previousSeriesNumber: 'A/2026/0000',
        previousIssueDate: '2026-05-19',
        previousHash: 'F'.repeat(64),
      } as const,
    };
    const wire = invoiceToWire(original);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(true);
    expect(invoiceFromWire(wire)).toEqual(original);
  });

  it('preserves an invoice with an alternate-id recipient', () => {
    const original = {
      ...buildInvoice(),
      recipients: [
        {
          legalName: 'Acme GmbH',
          alternateId: { countryCode: 'DE', idType: '04' as const, id: 'DE123456789' },
        },
      ],
    };
    const wire = invoiceToWire(original);
    expect(RegistroAltaSchema.safeParse(wire).success).toBe(true);
    expect(invoiceFromWire(wire)).toEqual(original);
  });
});

describe('CancelInvoice round-trip', () => {
  it('preserves the minimal happy-path fixture', () => {
    const original = buildCancelInvoice();
    const wire = cancelInvoiceToWire(original);
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(true);
    expect(cancelInvoiceFromWire(wire)).toEqual(original);
  });

  it('preserves a cancellation with explicit generator and prior-rejection flags', () => {
    const original = {
      ...buildCancelInvoice(),
      externalReference: 'ext-cancel-1',
      withoutPriorRecord: 'N' as const,
      priorRejection: 'N' as const,
      generatedBy: 'T' as const,
      generator: { legalName: 'Asesoria SL', nif: 'B87654321' },
    };
    const wire = cancelInvoiceToWire(original);
    expect(RegistroAnulacionSchema.safeParse(wire).success).toBe(true);
    expect(cancelInvoiceFromWire(wire)).toEqual(original);
  });
});
