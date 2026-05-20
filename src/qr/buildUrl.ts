/**
 * Build the AEAT tax-QR URL ("URL del servicio de cotejo o remisión de
 * información") that goes inside every VERI*FACTU invoice's QR code.
 *
 * The URL format is dictated by the AEAT "Detalle de las especificaciones
 * técnicas del código QR de la factura" v0.5.0 (§5–6). Two host families are
 * defined (preproduction and production) and two paths (`ValidarQR` for the
 * verifactu mode, `ValidarQRNoVerifactu` for the on-request / non-verifiable
 * mode). The four mandatory query parameters are `nif`, `numserie`, `fecha`
 * (in `DD-MM-YYYY` form), and `importe` (with `.` as decimal separator). An
 * optional `idioma` parameter was added in v0.5.0 for the AEAT response
 * language and is also supported here.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | QR spec v0.5.0 §5–8}
 * @module
 */

/**
 * AEAT response language code accepted by the QR validation service (§7.1 of
 * the QR spec v0.5.0).
 *
 * - `'es'` — Castilian Spanish (the default if omitted).
 * - `'en'` — English.
 * - `'ca'` — Catalan.
 * - `'gl'` — Galician.
 * - `'eu'` — Basque.
 * - `'va'` — Valencian.
 */
export type QrLanguage = 'es' | 'en' | 'ca' | 'gl' | 'eu' | 'va';

/**
 * Whether the QR URL targets the preproduction or production environment.
 *
 * The choice maps to the two host families documented in §5 of the QR spec:
 *
 * - `'preproduction'` → `prewww2.aeat.es`
 * - `'production'`    → `www2.agenciatributaria.gob.es`
 */
export type QrEnvironment = 'preproduction' | 'production';

/**
 * Whether the issuing system emits verifiable (VERI*FACTU) or non-verifiable
 * (on-request) invoices.
 *
 * - `'verifactu'`  → URL path `/wlpl/TIKE-CONT/ValidarQR`
 * - `'on-request'` → URL path `/wlpl/TIKE-CONT/ValidarQRNoVerifactu`
 */
export type QrMode = 'verifactu' | 'on-request';

/**
 * Input bag accepted by {@link buildQrUrl}.
 *
 * Every value is validated syntactically before the URL is assembled; see the
 * function-level `@throws` for the exact preconditions.
 */
export interface BuildQrUrlInput {
  /** 9-character Spanish NIF of the invoice issuer. */
  nif: string;
  /** Series + invoice number (1–60 chars, ASCII 32–126). May contain `/`, spaces, etc. */
  numSerieFactura: string;
  /** Issue date in ISO `YYYY-MM-DD` form; converted to `DD-MM-YYYY` for the URL. */
  fechaExpedicionFactura: string;
  /** Total invoice amount, as either a string (`"241.4"`, `"241.40"`) or number. */
  importeTotal: string | number;
  /** Whether the issuing system emits verifiable or non-verifiable invoices. */
  mode: QrMode;
  /** Target AEAT environment (preproduction / production). */
  environment: QrEnvironment;
  /** Optional AEAT response-language code (v0.5.0 extension). */
  language?: QrLanguage;
}

const NIF_REGEX = /^[A-Z0-9]{9}$/u;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/u;
const NUMSERIE_MAX_LENGTH = 60;
const NUMSERIE_ASCII_REGEX = /^[\x20-\x7E]+$/u;
const IMPORTE_REGEX = /^[+-]?\d{1,12}(\.\d{1,2})?$/u;

const HOSTS: Record<QrEnvironment, string> = {
  preproduction: 'https://prewww2.aeat.es',
  production: 'https://www2.agenciatributaria.gob.es',
};

const PATHS: Record<QrMode, string> = {
  verifactu: '/wlpl/TIKE-CONT/ValidarQR',
  'on-request': '/wlpl/TIKE-CONT/ValidarQRNoVerifactu',
};

/**
 * Error thrown when {@link buildQrUrl} receives input that violates the AEAT
 * format constraints (NIF shape, date pattern, amount pattern, etc.).
 *
 * @remarks
 * The SDK-wide {@link VerifactuError} hierarchy is not used here because the
 * `src/errors/` module is still owned by a different team; this local class
 * keeps the QR module self-contained until the hierarchy lands.
 */
export class QrUrlInputError extends Error {
  /**
   * @param field - Offending field name (e.g. `'nif'`, `'importeTotal'`).
   * @param message - Human-readable diagnostic, in English.
   */
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`Invalid '${field}': ${message}`);
    this.name = 'QrUrlInputError';
  }
}

/**
 * Convert an ISO `YYYY-MM-DD` date to the AEAT wire `DD-MM-YYYY` form.
 *
 * @throws {QrUrlInputError} If the input does not match the ISO pattern.
 */
function isoToWire(iso: string): string {
  const match = ISO_DATE_REGEX.exec(iso);
  if (!match) {
    throw new QrUrlInputError(
      'fechaExpedicionFactura',
      `expected ISO date 'YYYY-MM-DD', received '${iso}'`,
    );
  }
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/**
 * Normalise a monetary amount to the AEAT wire form expected by the QR URL.
 *
 * The AEAT requires up to 12 integer digits, a `.` separator (never `,`), and
 * up to 2 decimal digits. Trailing zeros are preserved when the caller passes
 * them as a string (e.g. `"241.40"` stays as `"241.40"`); a `number` input is
 * stringified with `toString()` so callers retain control over precision when
 * needed (`(0.1 + 0.2).toString()` is forbidden by the spec — pass a string).
 *
 * @throws {QrUrlInputError} If the resulting form violates the AEAT regex.
 */
function normaliseImporte(value: string | number): string {
  const raw = typeof value === 'number' ? value.toString() : value;
  if (!IMPORTE_REGEX.test(raw)) {
    throw new QrUrlInputError(
      'importeTotal',
      `expected up to 12 integer + 2 decimal digits with '.' separator, received '${raw}'`,
    );
  }
  return raw;
}

/**
 * Build the AEAT tax-QR URL for an invoice.
 *
 * The function is pure: it does no I/O. All parameter values are URL-encoded
 * with `encodeURIComponent` so that characters allowed by the AEAT in
 * `numserie` (slashes, spaces, ampersands, …) round-trip correctly through the
 * QR reader and HTTP layer.
 *
 * @param input - Validated invoice identification data (see {@link BuildQrUrlInput}).
 * @returns The fully-formed validation URL ready to be encoded into a QR.
 * @throws {QrUrlInputError} If any of the input fields fails the AEAT format
 *   check (NIF length/charset, ISO date, ASCII-only numserie within 60 chars,
 *   importe shape, language code).
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | QR spec v0.5.0 §5–8}
 * @example
 * ```ts
 * const url = buildQrUrl({
 *   nif: '89890001K',
 *   numSerieFactura: '12345678-G33',
 *   fechaExpedicionFactura: '2024-09-01',
 *   importeTotal: '241.4',
 *   mode: 'verifactu',
 *   environment: 'production',
 * });
 * // → "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4"
 * ```
 */
export function buildQrUrl(input: BuildQrUrlInput): string {
  const {
    nif,
    numSerieFactura,
    fechaExpedicionFactura,
    importeTotal,
    mode,
    environment,
    language,
  } = input;

  if (!NIF_REGEX.test(nif)) {
    throw new QrUrlInputError(
      'nif',
      `expected 9 uppercase alphanumeric characters, received '${nif}'`,
    );
  }
  if (numSerieFactura.length === 0 || numSerieFactura.length > NUMSERIE_MAX_LENGTH) {
    throw new QrUrlInputError(
      'numSerieFactura',
      `length must be between 1 and ${NUMSERIE_MAX_LENGTH} characters, received ${numSerieFactura.length}`,
    );
  }
  if (!NUMSERIE_ASCII_REGEX.test(numSerieFactura)) {
    throw new QrUrlInputError(
      'numSerieFactura',
      'must contain only printable ASCII characters (codes 32–126)',
    );
  }

  const fecha = isoToWire(fechaExpedicionFactura);
  const importe = normaliseImporte(importeTotal);

  const host = HOSTS[environment];
  const path = PATHS[mode];

  const params: string[] = [
    `nif=${encodeURIComponent(nif)}`,
    `numserie=${encodeURIComponent(numSerieFactura)}`,
    `fecha=${encodeURIComponent(fecha)}`,
    `importe=${encodeURIComponent(importe)}`,
  ];

  if (language !== undefined) {
    params.push(`idioma=${encodeURIComponent(language)}`);
  }

  return `${host}${path}?${params.join('&')}`;
}
