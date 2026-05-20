/**
 * Unit tests for the common Zod primitives in `src/schemas/common.ts`.
 *
 * Positive and negative cases are paired so regressions in either direction
 * surface in CI.
 */

import { describe, expect, it } from 'bun:test';
import {
  FechaDdMmYyyySchema,
  FechaHoraHusoSchema,
  FechaIsoSchema,
  HuellaSchema,
  IdOtroSchema,
  ImporteSchema,
  NifSchema,
  PersonaFisicaJuridicaSchema,
} from '../../../src/schemas/common.ts';

describe('NifSchema', () => {
  it.each(['B12345678', '12345678Z', 'X1234567L', 'ABCDEFGHI'])('accepts %s', (input) => {
    expect(NifSchema.safeParse(input).success).toBe(true);
  });

  it.each(['b12345678', '1234', '1234567890', 'B-12345678', ''])('rejects %s', (input) => {
    expect(NifSchema.safeParse(input).success).toBe(false);
  });
});

describe('IdOtroSchema', () => {
  it('accepts a minimal payload without country code', () => {
    expect(IdOtroSchema.safeParse({ IDType: '02', ID: 'ESB12345678' }).success).toBe(true);
  });

  it('accepts a payload with country code', () => {
    expect(
      IdOtroSchema.safeParse({ CodigoPais: 'PT', IDType: '04', ID: '123456789' }).success,
    ).toBe(true);
  });

  it('rejects an IDType outside the L7 list (no 01)', () => {
    expect(IdOtroSchema.safeParse({ IDType: '01', ID: 'X' }).success).toBe(false);
  });

  it('rejects an ID longer than 20 chars', () => {
    expect(IdOtroSchema.safeParse({ IDType: '06', ID: 'A'.repeat(21) }).success).toBe(false);
  });
});

describe('ImporteSchema', () => {
  it.each(['0', '0.00', '12345.67', '-1.5', '+1', '999999999999.99'])('accepts %s', (input) => {
    expect(ImporteSchema.safeParse(input).success).toBe(true);
  });

  it.each(['', '1.234', '1234567890123', '1,5', 'abc', '--1'])('rejects %s', (input) => {
    expect(ImporteSchema.safeParse(input).success).toBe(false);
  });
});

describe('FechaDdMmYyyySchema', () => {
  it('accepts a well-formed wire date', () => {
    expect(FechaDdMmYyyySchema.safeParse('28-10-2024').success).toBe(true);
  });

  it.each(['2024-10-28', '28/10/2024', '1-10-2024', ''])('rejects %s', (input) => {
    expect(FechaDdMmYyyySchema.safeParse(input).success).toBe(false);
  });
});

describe('FechaIsoSchema', () => {
  it('accepts a well-formed ISO date', () => {
    expect(FechaIsoSchema.safeParse('2024-10-28').success).toBe(true);
  });

  it.each(['28-10-2024', '2024-1-28', ''])('rejects %s', (input) => {
    expect(FechaIsoSchema.safeParse(input).success).toBe(false);
  });
});

describe('FechaHoraHusoSchema', () => {
  it.each(['2026-05-20T12:34:56Z', '2026-05-20T12:34:56+02:00', '2026-05-20T12:34:56.123-05:00'])(
    'accepts %s',
    (input) => {
      expect(FechaHoraHusoSchema.safeParse(input).success).toBe(true);
    },
  );

  it.each(['2026-05-20', '2026-05-20T12:34:56', '20260520T123456Z'])('rejects %s', (input) => {
    expect(FechaHoraHusoSchema.safeParse(input).success).toBe(false);
  });
});

describe('HuellaSchema', () => {
  it('accepts a 64-uppercase-hex digest', () => {
    const digest = '0123456789ABCDEF'.repeat(4);
    expect(HuellaSchema.safeParse(digest).success).toBe(true);
  });

  it('rejects lowercase hex', () => {
    const digest = '0123456789abcdef'.repeat(4);
    expect(HuellaSchema.safeParse(digest).success).toBe(false);
  });

  it('rejects shorter digests', () => {
    expect(HuellaSchema.safeParse('ABC').success).toBe(false);
  });
});

describe('PersonaFisicaJuridicaSchema', () => {
  it('accepts NIF-only payload', () => {
    expect(
      PersonaFisicaJuridicaSchema.safeParse({
        NombreRazon: 'Acme SL',
        NIF: 'B12345678',
      }).success,
    ).toBe(true);
  });

  it('accepts IDOtro-only payload', () => {
    expect(
      PersonaFisicaJuridicaSchema.safeParse({
        NombreRazon: 'Acme GmbH',
        IDOtro: { CodigoPais: 'DE', IDType: '04', ID: '123456789' },
      }).success,
    ).toBe(true);
  });

  it('rejects when both NIF and IDOtro are present', () => {
    expect(
      PersonaFisicaJuridicaSchema.safeParse({
        NombreRazon: 'Acme',
        NIF: 'B12345678',
        IDOtro: { IDType: '04', ID: 'X' },
      }).success,
    ).toBe(false);
  });

  it('rejects when neither NIF nor IDOtro is present', () => {
    expect(PersonaFisicaJuridicaSchema.safeParse({ NombreRazon: 'Acme' }).success).toBe(false);
  });
});
