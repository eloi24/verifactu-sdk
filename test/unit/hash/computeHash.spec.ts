/**
 * Reference-vector tests for `src/hash/computeHash.ts`.
 *
 * The three cases below are taken verbatim from AEAT spec v0.1.2 §6. Each
 * case carries the input fields and the expected SHA-256 hex digest from
 * the PDF. Any drift in the algorithm (field order, missing-value handling,
 * numeric normalisation, character encoding) is caught here.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §6}
 */

import { describe, expect, test } from 'bun:test';
import {
  computeRegistroAltaHash,
  computeRegistroAnulacionHash,
  computeRegistroEventoHash,
} from '../../../src/hash/computeHash.ts';
import type { RegistroAlta } from '../../../src/schemas/registroAlta.ts';
import type { RegistroAnulacion } from '../../../src/schemas/registroAnulacion.ts';

/**
 * Build a minimal `RegistroAlta` value carrying only the hash-relevant fields.
 *
 * The non-hash fields are populated with placeholder values that satisfy
 * TypeScript without affecting the output: only the eight fields listed in
 * §3a of the spec ever enter the digest.
 */
function makeAlta(overrides: {
  IDEmisorFactura: string;
  NumSerieFactura: string;
  FechaExpedicionFactura: string;
  TipoFactura: RegistroAlta['TipoFactura'];
  CuotaTotal: string;
  ImporteTotal: string;
  FechaHoraHusoGenRegistro: string;
}): RegistroAlta {
  return {
    IDVersion: '1.0',
    IDFactura: {
      IDEmisorFactura: overrides.IDEmisorFactura,
      NumSerieFactura: overrides.NumSerieFactura,
      FechaExpedicionFactura: overrides.FechaExpedicionFactura,
    },
    NombreRazonEmisor: 'Test SL',
    TipoFactura: overrides.TipoFactura,
    DescripcionOperacion: 'Test operation',
    Desglose: {
      DetalleDesglose: [
        {
          CalificacionOperacion: 'S1',
          BaseImponibleOimporteNoSujeto: '100.00',
        },
      ],
    },
    CuotaTotal: overrides.CuotaTotal,
    ImporteTotal: overrides.ImporteTotal,
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
    FechaHoraHusoGenRegistro: overrides.FechaHoraHusoGenRegistro,
    TipoHuella: '01',
    // Placeholder — the function being tested computes and returns the real value.
    Huella: '0'.repeat(64),
  };
}

/**
 * Build a minimal `RegistroAnulacion` value carrying only the hash-relevant
 * fields. Same rationale as {@link makeAlta}.
 */
function makeAnulacion(overrides: {
  IDEmisorFacturaAnulada: string;
  NumSerieFacturaAnulada: string;
  FechaExpedicionFacturaAnulada: string;
  FechaHoraHusoGenRegistro: string;
}): RegistroAnulacion {
  return {
    IDVersion: '1.0',
    IDFactura: {
      IDEmisorFacturaAnulada: overrides.IDEmisorFacturaAnulada,
      NumSerieFacturaAnulada: overrides.NumSerieFacturaAnulada,
      FechaExpedicionFacturaAnulada: overrides.FechaExpedicionFacturaAnulada,
    },
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
    FechaHoraHusoGenRegistro: overrides.FechaHoraHusoGenRegistro,
    TipoHuella: '01',
    Huella: '0'.repeat(64),
  };
}

describe('computeRegistroAltaHash — spec §6 reference cases', () => {
  test('Case 1 (§6.1): first record in SIF — Huella previous is empty', () => {
    const record = makeAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.45',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:30+01:00',
    });

    const result = computeRegistroAltaHash(record, null);

    expect(result).toBe('3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60');
  });

  test('Case 2 (§6.2): second alta record chained to the §6.1 hash', () => {
    const record = makeAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345679/G34',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.45',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:35+01:00',
    });

    const result = computeRegistroAltaHash(
      record,
      '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60',
    );

    expect(result).toBe('F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97');
  });
});

describe('computeRegistroAnulacionHash — spec §6.3 reference case', () => {
  test('Case 3 (§6.3): cancellation chained to the §6.2 hash', () => {
    const record = makeAnulacion({
      IDEmisorFacturaAnulada: '89890001K',
      NumSerieFacturaAnulada: '12345679/G34',
      FechaExpedicionFacturaAnulada: '01-01-2024',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:40+01:00',
    });

    const result = computeRegistroAnulacionHash(
      record,
      'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97',
    );

    expect(result).toBe('177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68');
  });
});

describe('computeRegistroAltaHash — numeric normalisation (§3 last paragraph)', () => {
  test('trailing zeros after the decimal point do not change the hash', () => {
    const withTwoDecimals = makeAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.10',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:30+01:00',
    });
    const withOneDecimal = makeAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.1',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:30+01:00',
    });

    expect(computeRegistroAltaHash(withTwoDecimals, null)).toBe(
      computeRegistroAltaHash(withOneDecimal, null),
    );
  });

  test('output is exactly 64 uppercase hex characters', () => {
    const record = makeAlta({
      IDEmisorFactura: '89890001K',
      NumSerieFactura: '12345678/G33',
      FechaExpedicionFactura: '01-01-2024',
      TipoFactura: 'F1',
      CuotaTotal: '12.35',
      ImporteTotal: '123.45',
      FechaHoraHusoGenRegistro: '2024-01-01T19:20:30+01:00',
    });
    const result = computeRegistroAltaHash(record, null);

    expect(result).toMatch(/^[0-9A-F]{64}$/u);
  });
});

describe('computeRegistroEventoHash — §3c structure', () => {
  test('returns a 64-char uppercase hex digest for a sample event record', () => {
    const result = computeRegistroEventoHash(
      {
        NIF: '89890001K',
        IdSistemaInformatico: 'AB',
        Version: '1.0',
        NumeroInstalacion: '0001',
        ObligadoEmisionNIF: '89890001K',
        TipoEvento: '01',
        FechaHoraHusoGenEvento: '2024-01-01T19:20:30+01:00',
      },
      null,
    );

    expect(result).toMatch(/^[0-9A-F]{64}$/u);
  });

  test('NIF/ID exclusion — missing ID is emitted as `ID=` (deterministic output)', () => {
    const withNif = computeRegistroEventoHash(
      {
        NIF: '89890001K',
        IdSistemaInformatico: 'AB',
        Version: '1.0',
        NumeroInstalacion: '0001',
        ObligadoEmisionNIF: '89890001K',
        TipoEvento: '01',
        FechaHoraHusoGenEvento: '2024-01-01T19:20:30+01:00',
      },
      null,
    );
    const withNifAndEmptyId = computeRegistroEventoHash(
      {
        NIF: '89890001K',
        ID: '',
        IdSistemaInformatico: 'AB',
        Version: '1.0',
        NumeroInstalacion: '0001',
        ObligadoEmisionNIF: '89890001K',
        TipoEvento: '01',
        FechaHoraHusoGenEvento: '2024-01-01T19:20:30+01:00',
      },
      null,
    );

    expect(withNif).toBe(withNifAndEmptyId);
  });
});
