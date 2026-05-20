/**
 * Property-based tests for `buildQrUrl`.
 *
 * The QR URL must always carry the four mandatory query parameters (`nif`,
 * `numserie`, `fecha`, `importe`) and, when set, the optional `idioma`
 * parameter. The tests randomise valid inputs and assert that the parameters
 * appear with the correct values regardless of the environment/mode.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | QR spec v0.5.0 §5–8}
 */

import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import {
  type QrEnvironment,
  type QrLanguage,
  type QrMode,
  buildQrUrl,
} from '../../src/qr/buildUrl.ts';

const NIF_REGEX = /^[A-Z0-9]{9}$/u;
const ASCII_PRINTABLE =
  '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

const nifArb = fc
  .array(
    fc
      .integer({ min: 0, max: 35 })
      .map((i) => (i < 10 ? String(i) : String.fromCharCode(65 + (i - 10)))),
    { minLength: 9, maxLength: 9 },
  )
  .map((arr) => arr.join(''))
  .filter((s) => NIF_REGEX.test(s));

const numSerieArb = fc
  .array(
    fc.integer({ min: 0, max: ASCII_PRINTABLE.length - 1 }).map((i) => ASCII_PRINTABLE[i] ?? 'A'),
    { minLength: 1, maxLength: 60 },
  )
  .map((arr) => arr.join(''));

const dateArb = fc
  .tuple(
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 2024, max: 2030 }),
  )
  .map(([d, m, y]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const importeArb = fc
  .integer({ min: -9_999_999, max: 9_999_999 })
  .map((cents) => (cents / 100).toFixed(2));

const modeArb = fc.constantFrom<QrMode>('verifactu', 'on-request');
const envArb = fc.constantFrom<QrEnvironment>('preproduction', 'production');
const langArb = fc.constantFrom<QrLanguage>('es', 'en', 'ca', 'gl', 'eu', 'va');

interface QrInputs {
  nif: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  importeTotal: string;
  mode: QrMode;
  environment: QrEnvironment;
}

const inputsArb: fc.Arbitrary<QrInputs> = fc.record({
  nif: nifArb,
  numSerieFactura: numSerieArb,
  fechaExpedicionFactura: dateArb,
  importeTotal: importeArb,
  mode: modeArb,
  environment: envArb,
});

function parseQuery(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) return params;
  const queryString = url.slice(queryIndex + 1);
  for (const part of queryString.split('&')) {
    const eq = part.indexOf('=');
    if (eq < 0) {
      params.set(decodeURIComponent(part), '');
    } else {
      params.set(decodeURIComponent(part.slice(0, eq)), decodeURIComponent(part.slice(eq + 1)));
    }
  }
  return params;
}

describe('property: buildQrUrl', () => {
  test('always emits the four mandatory parameters with the input values', () => {
    fc.assert(
      fc.property(inputsArb, (inputs) => {
        const url = buildQrUrl(inputs);
        const params = parseQuery(url);
        const [y, m, d] = inputs.fechaExpedicionFactura.split('-');
        const expectedFecha = `${d}-${m}-${y}`;
        return (
          params.get('nif') === inputs.nif &&
          params.get('numserie') === inputs.numSerieFactura &&
          params.get('fecha') === expectedFecha &&
          params.get('importe') === inputs.importeTotal &&
          !params.has('idioma')
        );
      }),
      { numRuns: 200 },
    );
  });

  test('adds the idioma parameter when language is set', () => {
    fc.assert(
      fc.property(inputsArb, langArb, (inputs, language) => {
        const url = buildQrUrl({ ...inputs, language });
        const params = parseQuery(url);
        return params.get('idioma') === language;
      }),
      { numRuns: 100 },
    );
  });

  test('targets the production host with the correct path per mode', () => {
    fc.assert(
      fc.property(inputsArb, (inputs) => {
        const url = buildQrUrl({ ...inputs, environment: 'production' });
        const expectedPath =
          inputs.mode === 'verifactu'
            ? '/wlpl/TIKE-CONT/ValidarQR'
            : '/wlpl/TIKE-CONT/ValidarQRNoVerifactu';
        return (
          url.startsWith('https://www2.agenciatributaria.gob.es') && url.includes(expectedPath)
        );
      }),
      { numRuns: 100 },
    );
  });

  test('targets the preproduction host', () => {
    fc.assert(
      fc.property(inputsArb, (inputs) => {
        const url = buildQrUrl({ ...inputs, environment: 'preproduction' });
        return url.startsWith('https://prewww2.aeat.es');
      }),
      { numRuns: 50 },
    );
  });
});
