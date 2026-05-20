/**
 * Unit tests for the `CalificacionOperacion` validator.
 */

import { describe, expect, it } from 'bun:test';
import { validateCalificacionOperacion } from '../../../src/validators/calificacionOperacion.ts';

describe('validateCalificacionOperacion', () => {
  it('skips when no qualification is set', () => {
    expect(validateCalificacionOperacion({ tax: '01' }, { invoiceType: 'F1' })).toEqual([]);
  });

  it('S2 + F2 rejected (1197)', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'S2', taxRate: '0', taxAmount: '0' },
      { invoiceType: 'F2' },
    );
    expect(issues.some((i) => i.code === '1197')).toBe(true);
  });

  it('S2 requires TipoImpositivo = 0 (1198)', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'S2', taxRate: '21', taxAmount: '0' },
      { invoiceType: 'F1' },
    );
    expect(issues.some((i) => i.code === '1198' && i.field === 'taxRate')).toBe(true);
  });

  it('S2 requires CuotaRepercutida = 0 (1198)', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'S2', taxRate: '0', taxAmount: '5' },
      { invoiceType: 'F1' },
    );
    expect(issues.some((i) => i.code === '1198' && i.field === 'taxAmount')).toBe(true);
  });

  it('S2 happy path accepted', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'S2', taxRate: '0', taxAmount: '0' },
      { invoiceType: 'F1' },
    );
    expect(issues).toEqual([]);
  });

  it('N1 with IVA + tax rate forbidden (1237)', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'N1', taxRate: '21' },
      { invoiceType: 'F1' },
    );
    expect(issues.some((i) => i.code === '1237')).toBe(true);
  });

  it('N2 with surcharge forbidden (1237)', () => {
    const issues = validateCalificacionOperacion(
      {
        tax: '01',
        operationQualification: 'N2',
        equivalenceSurchargeRate: '5.2',
      },
      { invoiceType: 'F1' },
    );
    expect(issues.some((i) => i.code === '1237')).toBe(true);
  });

  it('N1 without tax-related fields is accepted', () => {
    expect(
      validateCalificacionOperacion(
        { tax: '01', operationQualification: 'N1' },
        { invoiceType: 'F1' },
      ),
    ).toEqual([]);
  });

  it('non-S1 with non-zero CuotaRepercutida rejected (1207)', () => {
    const issues = validateCalificacionOperacion(
      { tax: '01', operationQualification: 'N1', taxAmount: '21' },
      { invoiceType: 'F1' },
    );
    expect(issues.some((i) => i.code === '1207')).toBe(true);
  });
});
