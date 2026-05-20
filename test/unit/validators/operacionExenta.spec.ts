/**
 * Unit tests for the `OperacionExenta` validator.
 */

import { describe, expect, it } from 'bun:test';
import { validateOperacionExenta } from '../../../src/validators/operacionExenta.ts';

describe('validateOperacionExenta', () => {
  it('skips when no exemption is set', () => {
    expect(validateOperacionExenta({ tax: '01' })).toEqual([]);
  });

  it('accepts E1 for IVA', () => {
    expect(validateOperacionExenta({ tax: '01', exemptionReason: 'E1' })).toEqual([]);
  });

  it('rejects E7 for IVA (1196)', () => {
    const issues = validateOperacionExenta({ tax: '01', exemptionReason: 'E7' });
    expect(issues[0]?.code).toBe('1196');
  });

  it('accepts E7 for IGIC', () => {
    expect(validateOperacionExenta({ tax: '03', exemptionReason: 'E7' })).toEqual([]);
  });

  it('rejects E2 with ClaveRegimen 01 (1199)', () => {
    const issues = validateOperacionExenta({
      tax: '01',
      regimeKey: '01',
      exemptionReason: 'E2',
    });
    expect(issues.some((i) => i.code === '1199')).toBe(true);
  });

  it('rejects coexistence with TipoImpositivo (1238)', () => {
    const issues = validateOperacionExenta({
      tax: '01',
      exemptionReason: 'E1',
      taxRate: '21',
    });
    expect(issues.some((i) => i.code === '1238')).toBe(true);
  });

  it('rejects E5 (IVA) when not every recipient uses IDOtro (1289)', () => {
    const issues = validateOperacionExenta(
      { tax: '01', exemptionReason: 'E5' },
      { allRecipientsViaIDOtro: false },
    );
    expect(issues.some((i) => i.code === '1289')).toBe(true);
  });

  it('accepts E5 (IVA) when every recipient uses IDOtro', () => {
    const issues = validateOperacionExenta(
      { tax: '01', exemptionReason: 'E5' },
      { allRecipientsViaIDOtro: true },
    );
    expect(issues.some((i) => i.code === '1289')).toBe(false);
  });
});
