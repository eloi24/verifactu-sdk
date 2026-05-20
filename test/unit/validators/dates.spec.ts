/**
 * Unit tests for the date business validators.
 */

import { describe, expect, it } from 'bun:test';
import {
  parseIsoDate,
  validateFechaFinVeriFactu,
  validateIssueDate,
  validateOperationDate,
} from '../../../src/validators/dates.ts';

const TODAY = new Date('2026-05-20T00:00:00Z');

describe('parseIsoDate', () => {
  it('accepts a well-formed ISO date', () => {
    const d = parseIsoDate('2026-05-20');
    expect(d?.getUTCFullYear()).toBe(2026);
  });

  it.each(['', '20260520', '2026/05/20', '2026-13-01', '2026-02-30'])('rejects %s', (input) => {
    expect(parseIsoDate(input)).toBeUndefined();
  });
});

describe('validateIssueDate', () => {
  it('accepts a valid date', () => {
    expect(validateIssueDate('2026-05-20', TODAY)).toEqual([]);
  });

  it('rejects a future date (1112)', () => {
    const issues = validateIssueDate('2026-05-21', TODAY);
    expect(issues.map((i) => i.code)).toContain('1112');
  });

  it('rejects a date before VERIFACTU start (1152)', () => {
    const issues = validateIssueDate('2024-10-27', TODAY);
    expect(issues.map((i) => i.code)).toContain('1152');
  });

  it('rejects a date before today minus 20 years (1133)', () => {
    const issues = validateIssueDate('2006-05-19', TODAY);
    expect(issues.map((i) => i.code)).toContain('1133');
  });

  it('rejects a malformed date (1105)', () => {
    const issues = validateIssueDate('not-a-date', TODAY);
    expect(issues.map((i) => i.code)).toContain('1105');
  });
});

describe('validateOperationDate', () => {
  it('accepts a normal past date', () => {
    expect(validateOperationDate('2026-05-19', '2026-05-20', TODAY, '01', '01')).toEqual([]);
  });

  it('rejects a date earlier than today minus 20 years (1134)', () => {
    const issues = validateOperationDate('2006-01-01', '2026-05-20', TODAY, '01', '01');
    expect(issues.map((i) => i.code)).toContain('1134');
  });

  it('rejects a future date when regime is not 14/15 (1173)', () => {
    const issues = validateOperationDate('2026-12-31', '2026-05-20', TODAY, '01', '01');
    expect(issues.map((i) => i.code)).toContain('1173');
  });

  it('accepts a future date when regime is 14 + IVA', () => {
    const issues = validateOperationDate('2026-12-31', '2026-05-20', TODAY, '14', '01');
    expect(issues.map((i) => i.code)).not.toContain('1173');
  });

  it('rejects a date too far in the future (1125)', () => {
    const issues = validateOperationDate('2030-01-01', '2026-05-20', TODAY, '14', '01');
    expect(issues.map((i) => i.code)).toContain('1125');
  });

  it('rejects expedition before operation when regime is not 14/15 (1146)', () => {
    const issues = validateOperationDate('2026-05-21', '2026-05-19', TODAY, '01', '01');
    expect(issues.map((i) => i.code)).toContain('1146');
  });

  it('reports malformed date (1145)', () => {
    const issues = validateOperationDate('bad', undefined, TODAY, '01', '01');
    expect(issues.map((i) => i.code)).toContain('1145');
  });
});

describe('validateFechaFinVeriFactu', () => {
  it('accepts 31-12-2026', () => {
    expect(validateFechaFinVeriFactu('31-12-2026', TODAY)).toEqual([]);
  });

  it('accepts the previous year', () => {
    expect(validateFechaFinVeriFactu('31-12-2025', TODAY)).toEqual([]);
  });

  it('rejects a non-31-12 date', () => {
    const issues = validateFechaFinVeriFactu('01-12-2026', TODAY);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('rejects a year out of range', () => {
    const issues = validateFechaFinVeriFactu('31-12-2030', TODAY);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('rejects a malformed value', () => {
    const issues = validateFechaFinVeriFactu('2026-12-31', TODAY);
    expect(issues.length).toBeGreaterThan(0);
  });
});
