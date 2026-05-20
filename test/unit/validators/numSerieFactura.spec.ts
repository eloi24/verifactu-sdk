/**
 * Unit tests for the `NumSerieFactura` character-set validator.
 */

import { describe, expect, it } from 'bun:test';
import {
  findForbiddenNumSerieChar,
  isValidNumSerieFactura,
} from '../../../src/validators/numSerieFactura.ts';

describe('isValidNumSerieFactura', () => {
  it.each(['SF-2026/0001', 'A/2026/001', '12345', 'X.Y.Z'])('accepts %s', (input) => {
    expect(isValidNumSerieFactura(input)).toBe(true);
  });

  it.each(['SF<2026>', 'A=2026', "SF'2026", 'SF"2026', '', 'withÿunicode'])(
    'rejects %s',
    (input) => {
      expect(isValidNumSerieFactura(input)).toBe(false);
    },
  );

  it('rejects non-string input', () => {
    expect(isValidNumSerieFactura(undefined as unknown as string)).toBe(false);
  });
});

describe('findForbiddenNumSerieChar', () => {
  it('returns undefined for valid', () => {
    expect(findForbiddenNumSerieChar('SF-2026/0001')).toBeUndefined();
  });

  it('returns the first forbidden character', () => {
    expect(findForbiddenNumSerieChar('SF<2026=>')).toBe('<');
  });

  it('returns undefined for non-string input', () => {
    expect(findForbiddenNumSerieChar(undefined as unknown as string)).toBeUndefined();
  });
});
