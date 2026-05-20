/**
 * Unit tests for the header (Cabecera) business validator.
 */

import { describe, expect, it } from 'bun:test';
import { validateHeader } from '../../../src/validators/header.ts';

const TODAY = new Date('2026-05-20T00:00:00Z');

describe('validateHeader', () => {
  it('accepts a voluntary header with a valid NIF', () => {
    expect(validateHeader({ obligadoNif: 'B12345674', voluntary: true }, TODAY)).toEqual([]);
  });

  it('rejects an invalid ObligadoEmision NIF (4116)', () => {
    const issues = validateHeader({ obligadoNif: 'XXXX', voluntary: true }, TODAY);
    expect(issues.some((i) => i.code === '4116')).toBe(true);
  });

  it('rejects an invalid Representante NIF (4117)', () => {
    const issues = validateHeader(
      { obligadoNif: 'B12345674', representanteNif: 'bad', voluntary: true },
      TODAY,
    );
    expect(issues.some((i) => i.code === '4117')).toBe(true);
  });

  it('rejects RefRequerimiento on voluntary submissions (4126)', () => {
    const issues = validateHeader(
      { obligadoNif: 'B12345674', voluntary: true, refRequerimiento: 'REQ1' },
      TODAY,
    );
    expect(issues.some((i) => i.code === '4126')).toBe(true);
  });

  it('rejects Incidencia on on-request submissions (4121)', () => {
    const issues = validateHeader(
      {
        obligadoNif: 'B12345674',
        voluntary: false,
        refRequerimiento: 'REQ1',
        incidencia: 'S',
      },
      TODAY,
    );
    expect(issues.some((i) => i.code === '4121')).toBe(true);
  });

  it('rejects FechaFinVeriFactu on on-request submissions (4127)', () => {
    const issues = validateHeader(
      {
        obligadoNif: 'B12345674',
        voluntary: false,
        refRequerimiento: 'REQ1',
        fechaFinVeriFactu: '31-12-2026',
      },
      TODAY,
    );
    expect(issues.some((i) => i.code === '4127')).toBe(true);
  });

  it('requires RefRequerimiento on on-request submissions (4125)', () => {
    const issues = validateHeader({ obligadoNif: 'B12345674', voluntary: false }, TODAY);
    expect(issues.some((i) => i.code === '4125')).toBe(true);
  });

  it('validates FechaFinVeriFactu when voluntary', () => {
    const issues = validateHeader(
      {
        obligadoNif: 'B12345674',
        voluntary: true,
        fechaFinVeriFactu: '01-01-2030',
      },
      TODAY,
    );
    expect(issues.length).toBeGreaterThan(0);
  });
});
