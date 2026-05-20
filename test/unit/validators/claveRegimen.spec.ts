/**
 * Unit tests for the `ClaveRegimen` validator.
 */

import { describe, expect, it } from 'bun:test';
import {
  type ClaveRegimenInvoiceContext,
  isAdmissibleRegimeForTax,
  validateClaveRegimen,
} from '../../../src/validators/claveRegimen.ts';

const CTX: ClaveRegimenInvoiceContext = {
  invoiceType: 'F1',
  issueDateIso: '2026-05-20',
};

describe('isAdmissibleRegimeForTax', () => {
  it('accepts IVA + L8A', () => {
    expect(isAdmissibleRegimeForTax('01', '01')).toBe(true);
  });

  it('rejects unknown tax codes', () => {
    expect(isAdmissibleRegimeForTax('05', '01')).toBe(false);
  });

  it('accepts IGIC + L8B + 20', () => {
    expect(isAdmissibleRegimeForTax('03', '20')).toBe(true);
  });

  it('accepts IPSI restricted keys', () => {
    expect(isAdmissibleRegimeForTax('02', '01')).toBe(true);
    expect(isAdmissibleRegimeForTax('02', '07')).toBe(false);
  });
});

describe('validateClaveRegimen', () => {
  it('accepts a standard line', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '01', operationQualification: 'S1' },
      CTX,
    );
    expect(issues).toEqual([]);
  });

  it('reports missing regime for IVA (1245)', () => {
    const issues = validateClaveRegimen({ tax: '01' }, CTX);
    expect(issues[0]?.code).toBe('1245');
  });

  it('reports regime forbidden for tax 05 (1260)', () => {
    const issues = validateClaveRegimen({ tax: '05', regimeKey: '01' }, CTX);
    expect(issues[0]?.code).toBe('1260');
  });

  it('reports regime not in tax list (1246)', () => {
    const issues = validateClaveRegimen({ tax: '02', regimeKey: '07' }, CTX);
    expect(issues.some((i) => i.code === '1246')).toBe(true);
  });

  it('15.6.1 — ClaveRegimen 02 must use OperacionExenta (1286)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '02', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1286')).toBe(true);
  });

  it('15.6.2 — ClaveRegimen 03 with non-S1 rejected (1200)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '03', operationQualification: 'N1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1200')).toBe(true);
  });

  it('15.6.3 — ClaveRegimen 04 without S2 or OperacionExenta (1201)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '04', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1201')).toBe(true);
  });

  it('15.6.4 — ClaveRegimen 06 forbids F2 (1202)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '06', operationQualification: 'S1' },
      { ...CTX, invoiceType: 'F2' },
    );
    expect(issues.some((i) => i.code === '1202')).toBe(true);
  });

  it('15.6.4 — ClaveRegimen 06 requires BaseImponibleACoste (1202)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '06', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.field === 'taxBaseAtCost')).toBe(true);
  });

  it('15.6.5 — ClaveRegimen 07 forbids N1 (1203)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '07', operationQualification: 'N1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1203')).toBe(true);
  });

  it('15.6.5 — ClaveRegimen 07 forbids OperacionExenta E5', () => {
    const issues = validateClaveRegimen({ tax: '01', regimeKey: '07', exemptionReason: 'E5' }, CTX);
    expect(issues.some((i) => i.code === '1203')).toBe(true);
  });

  it('15.6.6 — ClaveRegimen 08 requires N2 (1252)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '08', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1252')).toBe(true);
  });

  it('15.6.7 — ClaveRegimen 10 requires N1 and F1 (1205)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '10', operationQualification: 'S1' },
      { ...CTX, invoiceType: 'R1' },
    );
    const codes = issues.map((i) => i.code);
    expect(codes.filter((c) => c === '1205').length).toBeGreaterThan(0);
  });

  it('15.6.7 — ClaveRegimen 10 requires identified recipients', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '10', operationQualification: 'N1' },
      { ...CTX, recipients: [{ nif: undefined }] },
    );
    expect(issues.some((i) => i.field.startsWith('recipients'))).toBe(true);
  });

  it('15.6.8 — ClaveRegimen 11 requires TipoImpositivo 21 (1206)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '11', operationQualification: 'S1', taxRate: '10' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1206')).toBe(true);
  });

  it('15.6.9 — ClaveRegimen 14 requires operationDate after issueDate (1147)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '14', operationQualification: 'S1' },
      { ...CTX, operationDateIso: '2026-05-19' },
    );
    expect(issues.some((i) => i.code === '1147')).toBe(true);
  });

  it('15.6.9 — ClaveRegimen 14 requires operationDate to be present (1147)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '14', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1147')).toBe(true);
  });

  it('15.6.9 — ClaveRegimen 14 requires P/Q/S/V NIF (1149)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '14', operationQualification: 'S1' },
      {
        ...CTX,
        invoiceType: 'F1',
        operationDateIso: '2026-05-21',
        recipients: [{ nif: 'A12345674' }],
      },
    );
    expect(issues.some((i) => i.code === '1149')).toBe(true);
  });

  it('15.6.9 — ClaveRegimen 14 requires F1/R1-R4 (1148)', () => {
    const issues = validateClaveRegimen(
      { tax: '01', regimeKey: '14', operationQualification: 'S1' },
      { ...CTX, invoiceType: 'F2', operationDateIso: '2026-05-21' },
    );
    expect(issues.some((i) => i.code === '1148')).toBe(true);
  });

  it('15.6.10 — IGIC regime 20 requires N2 (1293)', () => {
    const issues = validateClaveRegimen(
      { tax: '03', regimeKey: '20', operationQualification: 'S1' },
      CTX,
    );
    expect(issues.some((i) => i.code === '1293')).toBe(true);
  });
});
