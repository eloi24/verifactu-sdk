/**
 * Golden-URL tests for `src/qr/buildUrl.ts`.
 *
 * The four URLs in §8 of the AEAT "Detalle especificaciones técnicas del
 * código QR de la factura" v0.5.0 are reproduced here verbatim and are the
 * source of truth for the QR-URL format. The implementation must produce
 * byte-for-byte identical strings.
 */

import { describe, expect, it } from 'bun:test';
import { QrUrlInputError, buildQrUrl } from '../../../src/qr/buildUrl.ts';

const GOLDEN = {
  nif: '89890001K',
  numSerieFactura: '12345678-G33',
  fechaExpedicionFactura: '2024-09-01',
  importeTotal: '241.4',
} as const;

describe('buildQrUrl — golden URLs from QR spec v0.5.0 §8', () => {
  it('§8.1 preproduction × verifactu', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      mode: 'verifactu',
      environment: 'preproduction',
    });
    expect(url).toBe(
      'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4',
    );
  });

  it('§8.2 preproduction × on-request (no verifactu)', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      mode: 'on-request',
      environment: 'preproduction',
    });
    expect(url).toBe(
      'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4',
    );
  });

  it('§8.3 production × verifactu', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      mode: 'verifactu',
      environment: 'production',
    });
    expect(url).toBe(
      'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4',
    );
  });

  it('§8.4 production × on-request (no verifactu)', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      mode: 'on-request',
      environment: 'production',
    });
    expect(url).toBe(
      'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4',
    );
  });
});

describe('buildQrUrl — URL encoding', () => {
  it('encodes slashes and spaces in numserie', () => {
    const url = buildQrUrl({
      nif: '89890001K',
      numSerieFactura: '12345678 / G33',
      fechaExpedicionFactura: '2024-09-01',
      importeTotal: '241.4',
      mode: 'verifactu',
      environment: 'preproduction',
    });
    // `/` → `%2F`, space → `%20`
    expect(url).toBe(
      'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678%20%2F%20G33&fecha=01-09-2024&importe=241.4',
    );
  });

  it('encodes the ampersand in numserie (spec §4 example)', () => {
    const url = buildQrUrl({
      nif: '89890001K',
      numSerieFactura: '12345678&G33',
      fechaExpedicionFactura: '2024-01-01',
      importeTotal: '241.4',
      mode: 'verifactu',
      environment: 'preproduction',
    });
    expect(url).toBe(
      'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678%26G33&fecha=01-01-2024&importe=241.4',
    );
  });

  it('preserves trailing zero in importe when caller passes it', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      importeTotal: '241.40',
      mode: 'verifactu',
      environment: 'production',
    });
    expect(url.endsWith('importe=241.40')).toBe(true);
  });

  it('appends the optional idioma parameter when language is set', () => {
    const url = buildQrUrl({
      ...GOLDEN,
      mode: 'verifactu',
      environment: 'production',
      language: 'en',
    });
    expect(url.endsWith('&idioma=en')).toBe(true);
  });
});

describe('buildQrUrl — validation', () => {
  it('rejects a NIF with the wrong shape', () => {
    expect(() =>
      buildQrUrl({
        nif: '891K',
        numSerieFactura: '12345678-G33',
        fechaExpedicionFactura: '2024-09-01',
        importeTotal: '241.4',
        mode: 'verifactu',
        environment: 'production',
      }),
    ).toThrow(QrUrlInputError);
  });

  it('rejects a non-ISO date', () => {
    expect(() =>
      buildQrUrl({
        ...GOLDEN,
        fechaExpedicionFactura: '01-09-2024',
        mode: 'verifactu',
        environment: 'production',
      }),
    ).toThrow(QrUrlInputError);
  });

  it('rejects an importe with a comma decimal separator', () => {
    expect(() =>
      buildQrUrl({
        ...GOLDEN,
        importeTotal: '7,2',
        mode: 'verifactu',
        environment: 'production',
      }),
    ).toThrow(QrUrlInputError);
  });

  it('rejects an empty numserie', () => {
    expect(() =>
      buildQrUrl({
        ...GOLDEN,
        numSerieFactura: '',
        mode: 'verifactu',
        environment: 'production',
      }),
    ).toThrow(QrUrlInputError);
  });

  it('rejects a numserie exceeding 60 characters', () => {
    expect(() =>
      buildQrUrl({
        ...GOLDEN,
        numSerieFactura: 'x'.repeat(61),
        mode: 'verifactu',
        environment: 'production',
      }),
    ).toThrow(QrUrlInputError);
  });
});
