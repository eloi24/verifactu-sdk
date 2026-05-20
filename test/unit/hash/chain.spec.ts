/**
 * Unit tests for `src/hash/chain.ts`.
 *
 * Cover the three documented behaviours of the chaining helper:
 *   - `PrimerRegistro="S"` toggling when `previous === null`;
 *   - `RegistroAnterior` population otherwise;
 *   - input immutability (no mutation of the original record).
 */

import { describe, expect, test } from 'bun:test';
import { linkChain, toPreviousRef } from '../../../src/hash/chain.ts';
import { computeRegistroAltaHash } from '../../../src/hash/computeHash.ts';
import type { RegistroAlta } from '../../../src/schemas/registroAlta.ts';

function baseAlta(numSerie: string, timestamp: string): RegistroAlta {
  return {
    IDVersion: '1.0',
    IDFactura: {
      IDEmisorFactura: '89890001K',
      NumSerieFactura: numSerie,
      FechaExpedicionFactura: '01-01-2024',
    },
    NombreRazonEmisor: 'Test SL',
    TipoFactura: 'F1',
    DescripcionOperacion: 'Test',
    Desglose: {
      DetalleDesglose: [
        {
          CalificacionOperacion: 'S1',
          BaseImponibleOimporteNoSujeto: '100.00',
        },
      ],
    },
    CuotaTotal: '12.35',
    ImporteTotal: '123.45',
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
    FechaHoraHusoGenRegistro: timestamp,
    TipoHuella: '01',
    Huella: '0'.repeat(64),
  };
}

describe('linkChain — PrimerRegistro toggle', () => {
  test('previous=null produces { PrimerRegistro: "S" } and the §6.1 hash', () => {
    const record = baseAlta('12345678/G33', '2024-01-01T19:20:30+01:00');

    const linked = linkChain(record, null);

    expect(linked.Encadenamiento).toEqual({ PrimerRegistro: 'S' });
    expect(linked.Huella).toBe('3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60');
  });

  test('non-null previous produces { RegistroAnterior: {...} } and the §6.2 hash', () => {
    const first = linkChain(baseAlta('12345678/G33', '2024-01-01T19:20:30+01:00'), null);
    const second = baseAlta('12345679/G34', '2024-01-01T19:20:35+01:00');

    const linked = linkChain(second, toPreviousRef(first));

    expect(linked.Encadenamiento).toEqual({
      RegistroAnterior: {
        IDEmisorFactura: '89890001K',
        NumSerieFactura: '12345678/G33',
        FechaExpedicionFactura: '01-01-2024',
        Huella: '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60',
      },
    });
    expect(linked.Huella).toBe('F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97');
  });
});

describe('linkChain — immutability', () => {
  test('does not mutate the input record', () => {
    const record = baseAlta('12345678/G33', '2024-01-01T19:20:30+01:00');
    const snapshot = JSON.parse(JSON.stringify(record));

    const linked = linkChain(record, null);

    expect(record).toEqual(snapshot);
    expect(linked).not.toBe(record);
    expect(linked.Encadenamiento).not.toBe(record.Encadenamiento);
  });

  test('Huella matches the standalone computeRegistroAltaHash for the same inputs', () => {
    const record = baseAlta('12345678/G33', '2024-01-01T19:20:30+01:00');

    const linked = linkChain(record, null);
    const standalone = computeRegistroAltaHash(record, null);

    expect(linked.Huella).toBe(standalone);
  });
});

describe('toPreviousRef', () => {
  test('extracts the four-field pointer from an alta record', () => {
    const linked = linkChain(baseAlta('12345678/G33', '2024-01-01T19:20:30+01:00'), null);

    const ref = toPreviousRef(linked);

    expect(ref).toEqual({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      Huella: linked.Huella,
    });
  });
});
