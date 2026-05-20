/**
 * Unit tests for the SistemaInformatico business validator.
 */

import { describe, expect, it } from 'bun:test';
import { validateSistemaInformatico } from '../../../src/validators/sistemaInformatico.ts';

describe('validateSistemaInformatico', () => {
  it('accepts a happy path', () => {
    expect(
      validateSistemaInformatico({
        nif: 'B12345674',
        systemId: 'AC',
        systemName: 'Acme SDK',
        onlyVerifactu: 'S',
        multipleTaxpayer: 'N',
      }),
    ).toEqual([]);
  });

  it('rejects both NIF and IDOtro present (1223)', () => {
    const issues = validateSistemaInformatico({
      nif: 'B12345674',
      alternateId: { idType: '02', id: 'ESB12345674' },
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1223')).toBe(true);
  });

  it('rejects neither NIF nor IDOtro (1223)', () => {
    const issues = validateSistemaInformatico({
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1223')).toBe(true);
  });

  it('rejects IDType 07 (1162)', () => {
    const issues = validateSistemaInformatico({
      alternateId: { idType: '07', id: 'X', countryCode: 'ES' },
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1162')).toBe(true);
  });

  it('rejects CodigoPais ES with IDType not 03 (1232)', () => {
    const issues = validateSistemaInformatico({
      alternateId: { idType: '04', id: 'X', countryCode: 'ES' },
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1232')).toBe(true);
  });

  it('rejects invalid NIF-IVA (1103)', () => {
    const issues = validateSistemaInformatico({
      alternateId: { idType: '02', id: 'DE12' },
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1103')).toBe(true);
  });

  it('rejects invalid IdSistemaInformatico (1177)', () => {
    const issues = validateSistemaInformatico({
      nif: 'B12345674',
      systemId: 'a1',
      systemName: 'Acme',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1177')).toBe(true);
  });

  it('rejects missing systemName (1220)', () => {
    const issues = validateSistemaInformatico({
      nif: 'B12345674',
      systemId: 'AC',
      systemName: '   ',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1220')).toBe(true);
  });

  it('rejects missing onlyVerifactu (1212)', () => {
    const issues = validateSistemaInformatico({
      nif: 'B12345674',
      systemId: 'AC',
      systemName: 'Acme',
      multipleTaxpayer: 'N',
    });
    expect(issues.some((i) => i.code === '1212')).toBe(true);
  });

  it('rejects missing multipleTaxpayer (1213)', () => {
    const issues = validateSistemaInformatico({
      nif: 'B12345674',
      systemId: 'AC',
      systemName: 'Acme',
      onlyVerifactu: 'S',
    });
    expect(issues.some((i) => i.code === '1213')).toBe(true);
  });
});
