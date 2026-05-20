/**
 * Property-based tests for `computeRegistroAltaHash`.
 *
 * For every randomly generated `RegistroAlta` shape (with hash-relevant fields
 * varied), the hash function must:
 *
 * 1. Be deterministic — the same record produces the same hash.
 * 2. Always emit a 64-character uppercase hexadecimal digest.
 * 3. Produce a different digest for different `FechaHoraHusoGenRegistro`.
 *
 * The non-hash fields are filled with placeholders so the input remains a
 * structurally valid `RegistroAlta`.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3a}
 */

import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import { computeRegistroAltaHash } from '../../src/hash/computeHash.ts';
import type { RegistroAlta } from '../../src/schemas/registroAlta.ts';

interface HashInputs {
  IDEmisorFactura: string;
  NumSerieFactura: string;
  FechaExpedicionFactura: string;
  TipoFactura: RegistroAlta['TipoFactura'];
  CuotaTotal: string;
  ImporteTotal: string;
  FechaHoraHusoGenRegistro: string;
}

function makeAlta(o: HashInputs): RegistroAlta {
  return {
    IDVersion: '1.0',
    IDFactura: {
      IDEmisorFactura: o.IDEmisorFactura,
      NumSerieFactura: o.NumSerieFactura,
      FechaExpedicionFactura: o.FechaExpedicionFactura,
    },
    NombreRazonEmisor: 'Test SL',
    TipoFactura: o.TipoFactura,
    DescripcionOperacion: 'Test',
    Desglose: {
      DetalleDesglose: [
        {
          CalificacionOperacion: 'S1',
          BaseImponibleOimporteNoSujeto: '100.00',
        },
      ],
    },
    CuotaTotal: o.CuotaTotal,
    ImporteTotal: o.ImporteTotal,
    Encadenamiento: { PrimerRegistro: 'S' },
    SistemaInformatico: {
      NombreRazon: 'Sys',
      NIF: 'B12345678',
      NombreSistemaInformatico: 'Sys',
      IdSistemaInformatico: '01',
      Version: '1.0',
      NumeroInstalacion: '1',
      TipoUsoPosibleSoloVerifactu: 'S',
      TipoUsoPosibleMultiOT: 'N',
      IndicadorMultiplesOT: 'N',
    },
    FechaHoraHusoGenRegistro: o.FechaHoraHusoGenRegistro,
    TipoHuella: '01',
    Huella: '0'.repeat(64),
  };
}

const tipoFacturaArb = fc.constantFrom<RegistroAlta['TipoFactura']>(
  'F1',
  'F2',
  'F3',
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
);

const amountArb = fc
  .integer({ min: -9_999_999, max: 9_999_999 })
  .chain((cents) => fc.constant((cents / 100).toFixed(2)));

const numSerieArb = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter(
    (s) => /^[\x20-\x7E]+$/u.test(s) && !['"', "'", '<', '>', '='].some((c) => s.includes(c)),
  );

const ddmmyyyyArb = fc
  .tuple(
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 2024, max: 2030 }),
  )
  .map(([d, m, y]) => `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${String(y)}`);

const fechaHusoArb = fc
  .tuple(
    fc.integer({ min: 2024, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
  )
  .map(
    ([y, m, d, h, mi, s]) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}+01:00`,
  );

const inputsArb: fc.Arbitrary<HashInputs> = fc.record({
  IDEmisorFactura: fc.constant('89890001K'),
  NumSerieFactura: numSerieArb,
  FechaExpedicionFactura: ddmmyyyyArb,
  TipoFactura: tipoFacturaArb,
  CuotaTotal: amountArb,
  ImporteTotal: amountArb,
  FechaHoraHusoGenRegistro: fechaHusoArb,
});

const previousHashArb = fc.oneof(
  fc.constant<null>(null),
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
    .map((arr) => arr.map((n) => n.toString(16).toUpperCase()).join('')),
);

describe('property: computeRegistroAltaHash', () => {
  test('is deterministic — same input ⇒ same hash', () => {
    fc.assert(
      fc.property(inputsArb, previousHashArb, (inputs, previous) => {
        const a = computeRegistroAltaHash(makeAlta(inputs), previous);
        const b = computeRegistroAltaHash(makeAlta(inputs), previous);
        return a === b;
      }),
      { numRuns: 100 },
    );
  });

  test('always returns 64 uppercase hex characters', () => {
    fc.assert(
      fc.property(inputsArb, previousHashArb, (inputs, previous) => {
        const hash = computeRegistroAltaHash(makeAlta(inputs), previous);
        return /^[0-9A-F]{64}$/u.test(hash);
      }),
      { numRuns: 200 },
    );
  });

  test('changing FechaHoraHusoGenRegistro changes the digest', () => {
    fc.assert(
      fc.property(inputsArb, fechaHusoArb, (inputs, alternativeDate) => {
        if (alternativeDate === inputs.FechaHoraHusoGenRegistro) return true;
        const a = computeRegistroAltaHash(makeAlta(inputs), null);
        const b = computeRegistroAltaHash(
          makeAlta({ ...inputs, FechaHoraHusoGenRegistro: alternativeDate }),
          null,
        );
        return a !== b;
      }),
      { numRuns: 100 },
    );
  });

  test('changing previousHash changes the digest', () => {
    fc.assert(
      fc.property(inputsArb, (inputs) => {
        const a = computeRegistroAltaHash(makeAlta(inputs), null);
        const b = computeRegistroAltaHash(makeAlta(inputs), 'F'.repeat(64));
        return a !== b;
      }),
      { numRuns: 100 },
    );
  });
});
