/**
 * Unit tests for the VerifactuError hierarchy.
 */

import { describe, expect, it } from 'bun:test';
import {
  BusinessValidationError,
  FlowControlError,
  NetworkError,
  SchemaValidationError,
  SoapFaultError,
  VerifactuError,
} from '../../../src/errors/VerifactuError.ts';

describe('VerifactuError', () => {
  it('exposes the passed metadata', () => {
    const err = new VerifactuError('boom', {
      code: '1108',
      category: 'record',
      field: 'invoiceId.issuerNif',
      invoiceId: { issuerNif: 'X', seriesNumber: 'Y', issueDate: '2026-01-01' },
    });
    expect(err.code).toBe('1108');
    expect(err.category).toBe('record');
    expect(err.field).toBe('invoiceId.issuerNif');
    expect(err.invoiceId?.issuerNif).toBe('X');
    expect(err.name).toBe('VerifactuError');
  });

  it('defaults metadata to undefined', () => {
    const err = new VerifactuError('boom');
    expect(err.code).toBeUndefined();
    expect(err.category).toBeUndefined();
    expect(err.field).toBeUndefined();
    expect(err.invoiceId).toBeUndefined();
  });

  it('propagates the cause', () => {
    const cause = new Error('root');
    const err = new VerifactuError('boom', { cause });
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});

describe('subclass names', () => {
  it.each([
    ['SchemaValidationError', new SchemaValidationError('a')],
    ['BusinessValidationError', new BusinessValidationError('a')],
    ['SoapFaultError', new SoapFaultError('a')],
    ['NetworkError', new NetworkError('a')],
    ['FlowControlError', new FlowControlError('a')],
  ])('sets %s.name', (expected, err) => {
    expect(err.name).toBe(expected);
    expect(err).toBeInstanceOf(VerifactuError);
  });
});
