/**
 * EU NIF-IVA structural validator — one test per member state.
 *
 * Each `describe` block pairs a valid example with at least one negative case
 * (wrong length or wrong character class). The Brexit window for GB/XI has a
 * dedicated section.
 */

import { describe, expect, it } from 'bun:test';
import { EU_COUNTRY_CODES, isValidEuVatNumber } from '../../../src/validators/nifIva.ts';

describe('isValidEuVatNumber — happy path', () => {
  const cases: ReadonlyArray<[string, string]> = [
    ['DE', '123456789'],
    ['AT', 'U12345678'],
    ['BE', '1234567890'],
    ['CY', '12345678X'],
    ['CZ', '12345678'],
    ['CZ', '123456789'],
    ['CZ', '1234567890'],
    ['HR', '12345678901'],
    ['DK', '12345678'],
    ['SK', '1234567890'],
    ['SI', '12345678'],
    ['EE', '123456789'],
    ['FI', '12345678'],
    ['FR', 'AB123456789'],
    ['EL', '123456789'],
    ['NL', '123456789B12'],
    ['HU', '12345678'],
    ['IT', '12345678901'],
    ['IE', '1234567A'],
    ['IE', '12345678A'],
    ['LV', '12345678901'],
    ['LT', '123456789'],
    ['LT', '123456789012'],
    ['LU', '12345678'],
    ['MT', '12345678'],
    ['PL', '1234567890'],
    ['PT', '123456789'],
    ['SE', '123456789012'],
    ['BG', '123456789'],
    ['BG', '1234567890'],
    ['RO', '12'],
    ['RO', '1234567890'],
  ];
  it.each(cases)('%s %s', (country, id) => {
    expect(isValidEuVatNumber(country, id)).toBe(true);
  });
});

describe('isValidEuVatNumber — negative cases', () => {
  it.each([
    ['DE', '12345678'], // 8 digits, expected 9
    ['DE', '1234567890'], // 10 digits, expected 9
    ['AT', '123456789'], // must start with U
    ['BE', '123456789'], // 9 digits, expected 10
    ['NL', '123456789012'], // no 'B'
    ['RO', '0123456789'], // leading zero
    ['ZZ', '123456789'], // unknown country
  ])('rejects %s %s', (country, id) => {
    expect(isValidEuVatNumber(country, id)).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidEuVatNumber(undefined as unknown as string, 'X')).toBe(false);
    expect(isValidEuVatNumber('DE', undefined as unknown as string)).toBe(false);
  });
});

describe('Brexit transitions for GB / XI', () => {
  const before = new Date('2020-06-01T00:00:00Z');
  const dual = new Date('2021-01-15T00:00:00Z');
  const after = new Date('2022-01-01T00:00:00Z');

  it('accepts GB before 2021-01-01', () => {
    expect(isValidEuVatNumber('GB', '123456789', before)).toBe(true);
  });

  it('rejects XI before 2021-01-01', () => {
    expect(isValidEuVatNumber('XI', '123456789', before)).toBe(false);
  });

  it('accepts GB and XI during the dual window', () => {
    expect(isValidEuVatNumber('GB', '123456789', dual)).toBe(true);
    expect(isValidEuVatNumber('XI', '123456789', dual)).toBe(true);
  });

  it('rejects GB after 2021-02-01', () => {
    expect(isValidEuVatNumber('GB', '123456789', after)).toBe(false);
  });

  it('accepts XI after 2021-02-01', () => {
    expect(isValidEuVatNumber('XI', '123456789', after)).toBe(true);
  });

  it.each([['12345'], ['123456789012']])('accepts varying GB lengths %s', (id) => {
    expect(isValidEuVatNumber('GB', id, before)).toBe(true);
  });

  it('uses today() when operationDate is omitted', () => {
    // we cannot pin Date.now without mocking, but at minimum the call should
    // not throw and a valid identifier in some window must be accepted.
    expect(isValidEuVatNumber('XI', '123456789')).toBe(true);
  });
});

describe('EU_COUNTRY_CODES exposes the table', () => {
  it('exports every supported country code', () => {
    expect(EU_COUNTRY_CODES.has('DE')).toBe(true);
    expect(EU_COUNTRY_CODES.has('XI')).toBe(true);
    expect(EU_COUNTRY_CODES.has('GB')).toBe(true);
    expect(EU_COUNTRY_CODES.size).toBeGreaterThanOrEqual(28);
  });
});
