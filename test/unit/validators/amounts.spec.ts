/**
 * Unit tests for the monetary-amount validators.
 */

import { describe, expect, it } from 'bun:test';
import {
  AMOUNT_TOLERANCE_EUR,
  parseAmount,
  validateCuotaRepercutida,
  validateCuotaTotal,
  validateFacturaSimplificada3000,
  validateImporteTotal,
  validateMacrodato,
} from '../../../src/validators/amounts.ts';

describe('parseAmount', () => {
  it('parses a numeric string', () => {
    expect(parseAmount('21.00')).toBe(21);
  });

  it('returns NaN for undefined', () => {
    expect(Number.isNaN(parseAmount(undefined))).toBe(true);
  });

  it('returns NaN for garbage', () => {
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
  });
});

describe('validateImporteTotal', () => {
  it('accepts a matching total', () => {
    expect(
      validateImporteTotal('121.00', [{ taxBase: '100.00', taxAmount: '21.00', regimeKey: '01' }]),
    ).toEqual([]);
  });

  it('accepts within tolerance', () => {
    expect(
      validateImporteTotal('125.00', [{ taxBase: '100.00', taxAmount: '21.00', regimeKey: '01' }]),
    ).toEqual([]);
  });

  it('rejects beyond tolerance with admissible severity (2005)', () => {
    const issues = validateImporteTotal('200.00', [
      { taxBase: '100.00', taxAmount: '21.00', regimeKey: '01' },
    ]);
    expect(issues[0]?.code).toBe('2005');
    expect(issues[0]?.severity).toBe('admissible');
  });

  it('skips regimes 03/05/06/08/09', () => {
    expect(
      validateImporteTotal('999.99', [{ taxBase: '100.00', taxAmount: '21.00', regimeKey: '06' }]),
    ).toEqual([]);
  });

  it('rejects invalid declared total (1210)', () => {
    const issues = validateImporteTotal('abc', []);
    expect(issues[0]?.code).toBe('1210');
  });
});

describe('validateCuotaTotal', () => {
  it('accepts a matching total', () => {
    expect(
      validateCuotaTotal('22.40', [
        { taxBase: '100', taxAmount: '21', equivalenceSurchargeAmount: '1.4', regimeKey: '01' },
      ]),
    ).toEqual([]);
  });

  it('rejects beyond tolerance (2006)', () => {
    const issues = validateCuotaTotal('100.00', [
      { taxBase: '100', taxAmount: '21', regimeKey: '01' },
    ]);
    expect(issues[0]?.code).toBe('2006');
  });

  it('rejects invalid declared total (1216)', () => {
    const issues = validateCuotaTotal('garbage', []);
    expect(issues[0]?.code).toBe('1216');
  });

  it('skips when every regime is in the skip-list', () => {
    expect(validateCuotaTotal('9999', [{ taxBase: '0', taxAmount: '0', regimeKey: '08' }])).toEqual(
      [],
    );
  });
});

describe('validateMacrodato', () => {
  it('accepts small totals without S', () => {
    expect(validateMacrodato('1000.00', undefined)).toEqual([]);
  });

  it('requires S when total exceeds threshold', () => {
    const issues = validateMacrodato('100000000.00', undefined);
    expect(issues[0]?.code).toBe('1139');
  });

  it('accepts when S is set', () => {
    expect(validateMacrodato('100000000.00', 'S')).toEqual([]);
  });

  it('ignores invalid amounts (returns empty list)', () => {
    expect(validateMacrodato('garbage', undefined)).toEqual([]);
  });
});

describe('validateCuotaRepercutida', () => {
  const baseLine = { taxBase: '100', taxRate: '21', taxAmount: '21' };

  it('accepts a matching line', () => {
    expect(validateCuotaRepercutida({ breakdown: [baseLine], invoiceType: 'F1' })).toEqual([]);
  });

  it('skips when TipoRectificativa is I', () => {
    const issues = validateCuotaRepercutida({
      breakdown: [{ taxBase: '100', taxRate: '21', taxAmount: '999' }],
      invoiceType: 'R1',
      rectificationKind: 'I',
    });
    expect(issues).toEqual([]);
  });

  it('skips R2', () => {
    const issues = validateCuotaRepercutida({
      breakdown: [{ taxBase: '100', taxRate: '21', taxAmount: '999' }],
      invoiceType: 'R2',
    });
    expect(issues).toEqual([]);
  });

  it('rejects mismatch beyond tolerance (1142)', () => {
    const issues = validateCuotaRepercutida({
      breakdown: [{ taxBase: '100', taxRate: '21', taxAmount: '50' }],
      invoiceType: 'F1',
    });
    expect(issues[0]?.code).toBe('1142');
  });

  it('rejects mismatch with BaseImponibleACoste (1144)', () => {
    const issues = validateCuotaRepercutida({
      breakdown: [{ taxBase: '0', taxBaseAtCost: '100', taxRate: '21', taxAmount: '50' }],
      invoiceType: 'F1',
    });
    expect(issues[0]?.code).toBe('1144');
  });

  it('rejects sign mismatch (1143)', () => {
    const issues = validateCuotaRepercutida({
      breakdown: [{ taxBase: '100', taxRate: '21', taxAmount: '-21' }],
      invoiceType: 'F1',
    });
    expect(issues.some((i) => i.code === '1143')).toBe(true);
  });
});

describe('validateFacturaSimplificada3000', () => {
  it('skips non-F2 invoices', () => {
    expect(
      validateFacturaSimplificada3000({
        invoiceType: 'F1',
        breakdown: [{ taxBase: '5000', taxAmount: '1000' }],
      }),
    ).toEqual([]);
  });

  it('skips when agreement is present', () => {
    expect(
      validateFacturaSimplificada3000({
        invoiceType: 'F2',
        agreementNumber: 'AGR1',
        breakdown: [{ taxBase: '5000', taxAmount: '1000' }],
      }),
    ).toEqual([]);
  });

  it('skips when art61d is S', () => {
    expect(
      validateFacturaSimplificada3000({
        invoiceType: 'F2',
        withoutRecipient: 'S',
        breakdown: [{ taxBase: '5000', taxAmount: '1000' }],
      }),
    ).toEqual([]);
  });

  it('accepts F2 below 3000€', () => {
    expect(
      validateFacturaSimplificada3000({
        invoiceType: 'F2',
        breakdown: [{ taxBase: '1000', taxAmount: '210' }],
      }),
    ).toEqual([]);
  });

  it('rejects F2 beyond limit (1150)', () => {
    const issues = validateFacturaSimplificada3000({
      invoiceType: 'F2',
      breakdown: [{ taxBase: '3000', taxAmount: '500' }],
    });
    expect(issues[0]?.code).toBe('1150');
  });
});

describe('constants', () => {
  it('exports the tolerance', () => {
    expect(AMOUNT_TOLERANCE_EUR).toBe(10);
  });
});
