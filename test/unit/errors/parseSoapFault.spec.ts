/**
 * Unit tests for the SOAP-fault parser.
 */

import { describe, expect, it } from 'bun:test';
import { SoapFaultError } from '../../../src/errors/VerifactuError.ts';
import { extractFaultCode, parseSoapFault } from '../../../src/errors/parseSoapFault.ts';

describe('extractFaultCode', () => {
  it('parses the canonical token', () => {
    expect(extractFaultCode('Codigo[4102] something went wrong')).toBe('4102');
  });

  it('is case-insensitive', () => {
    expect(extractFaultCode('CODIGO[4102]')).toBe('4102');
  });

  it('returns undefined when not found', () => {
    expect(extractFaultCode('unrelated message')).toBeUndefined();
  });
});

describe('parseSoapFault', () => {
  it('returns a typed SoapFaultError with metadata', () => {
    const err = parseSoapFault('Codigo[4102] xml schema mismatch');
    expect(err).toBeInstanceOf(SoapFaultError);
    expect(err.code).toBe('4102');
    expect(err.category).toBe('envelope');
    expect(err.message).toContain('schema');
  });

  it('preserves the fault string when no code is embedded', () => {
    const err = parseSoapFault('arbitrary fault message');
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('arbitrary fault message');
  });

  it('preserves the code when it is not in the catalog', () => {
    const err = parseSoapFault('Codigo[9999] novel error');
    expect(err.code).toBe('9999');
    expect(err.message).toContain('novel');
  });
});
