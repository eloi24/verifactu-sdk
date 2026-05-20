/**
 * SHA-256 chained-hash computation for VERI*FACTU records.
 *
 * Implements the algorithm described in AEAT "Detalle de las especificaciones
 * técnicas para generación de la huella o hash de los registros de facturación"
 * v0.1.2 (§2, §3, §5). Three record kinds are supported with their own field
 * ordering: invoice registration (alta), invoice cancellation (anulación) and
 * SIF event records (evento).
 *
 * The reference test cases in §6 of the spec are reproduced byte-for-byte by
 * the unit tests; any implementation drift will be caught there.
 *
 * @module
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2}
 */

import { createHash } from 'node:crypto';
import type { RegistroAlta } from '../schemas/registroAlta.js';
import type { RegistroAnulacion } from '../schemas/registroAnulacion.js';

/**
 * Minimal shape of the fields a SIF event record contributes to its own hash.
 *
 * The full Zod schema for `RegistroEvento` is not yet exported by the schemas
 * module; this interface mirrors only the inputs required by §3c of the hash
 * spec so the hash module is self-contained and can be wired in later when
 * the event-record schema is added.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3c}
 */
export interface RegistroEventoHashInput {
  /** `RegistroEvento/Evento/SistemaInformatico/NIF` — mutually exclusive with {@link id}. */
  NIF?: string;
  /** `RegistroEvento/Evento/SistemaInformatico/IDOtro/ID` — mutually exclusive with {@link NIF}. */
  ID?: string;
  /** `RegistroEvento/Evento/SistemaInformatico/IdSistemaInformatico`. */
  IdSistemaInformatico: string;
  /** `RegistroEvento/Evento/SistemaInformatico/Version`. */
  Version: string;
  /** `RegistroEvento/Evento/SistemaInformatico/NumeroInstalacion`. */
  NumeroInstalacion: string;
  /** `RegistroEvento/Evento/ObligadoEmision/NIF`. */
  ObligadoEmisionNIF: string;
  /** `RegistroEvento/Evento/TipoEvento`. */
  TipoEvento: string;
  /** `RegistroEvento/Evento/FechaHoraHusoGenEvento`. */
  FechaHoraHusoGenEvento: string;
}

/**
 * One concatenation entry — the field's wire name and the value to emit.
 *
 * `undefined`/empty values produce `name=` (no value) per the spec §3 last
 * paragraph; otherwise the value is trimmed and numeric fields are normalised
 * before joining.
 *
 * @internal
 */
interface Field {
  name: string;
  value: string | undefined;
  /** Set for numeric fields so trailing zeros after the decimal point are dropped. */
  numeric?: boolean;
}

/**
 * Normalise a numeric value's textual form for hashing.
 *
 * The spec (§3) requires that `123.10` and `123.1` produce the same hash. The
 * agreed rule is to drop trailing zeros after the decimal point while keeping
 * at least one decimal digit when a decimal separator is present, and to drop
 * the decimal separator entirely when nothing remains after it.
 *
 * @param value - Raw textual value as found in the XML (may carry a sign).
 * @returns The normalised textual form.
 * @internal
 */
function normaliseNumeric(value: string): string {
  if (!value.includes('.')) {
    return value;
  }
  const [intPart, decPart = ''] = value.split('.');
  const trimmedDec = decPart.replace(/0+$/u, '');
  return trimmedDec.length === 0 ? (intPart ?? '') : `${intPart}.${trimmedDec}`;
}

/**
 * Build the `name1=value1&name2=value2&…` concatenation defined by §3.
 *
 * Leading/trailing whitespace is removed from every value. Missing fields are
 * emitted as `name=` (empty). Numeric fields flagged by the caller go through
 * {@link normaliseNumeric}.
 *
 * @param fields - Ordered list of fields as required by the spec for the
 *   target record kind.
 * @returns The exact UTF-8 input string to feed into SHA-256.
 * @internal
 */
function buildConcatenation(fields: readonly Field[]): string {
  const parts: string[] = [];
  for (const field of fields) {
    const raw = field.value ?? '';
    const trimmed = raw.trim();
    const normalised = field.numeric && trimmed.length > 0 ? normaliseNumeric(trimmed) : trimmed;
    parts.push(`${field.name}=${normalised}`);
  }
  return parts.join('&');
}

/**
 * Apply SHA-256 to a UTF-8 string and return its 64-char uppercase hex digest.
 *
 * @param input - The exact string built by {@link buildConcatenation}.
 * @returns Uppercase hex digest, exactly 64 characters.
 * @internal
 */
function sha256UpperHex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex').toUpperCase();
}

/**
 * Compute the chained SHA-256 hash for a `RegistroAlta` record.
 *
 * Eight fields are concatenated in the order documented by §3a:
 * `IDEmisorFactura`, `NumSerieFactura`, `FechaExpedicionFactura`, `TipoFactura`,
 * `CuotaTotal`, `ImporteTotal`, `Huella` (of the previous record), and
 * `FechaHoraHusoGenRegistro`. The `Huella` slot is empty when this is the
 * first record in the chain (`PrimerRegistro="S"`).
 *
 * @param record - The registration record. Numeric values (`CuotaTotal` and
 *   `ImporteTotal`) are normalised so `123.10` and `123.1` produce identical
 *   hashes per the spec.
 * @param previousHash - 64-char uppercase hex hash of the previous record, or
 *   `null` when this is the first record in the chain.
 * @returns The 64-character uppercase hexadecimal SHA-256 digest.
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3a, §6.1, §6.2}
 * @example
 * ```ts
 * const hash = computeRegistroAltaHash(registro, null);
 * // → "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60"
 * ```
 */
export function computeRegistroAltaHash(record: RegistroAlta, previousHash: string | null): string {
  const fields: readonly Field[] = [
    { name: 'IDEmisorFactura', value: record.IDFactura.IDEmisorFactura },
    { name: 'NumSerieFactura', value: record.IDFactura.NumSerieFactura },
    { name: 'FechaExpedicionFactura', value: record.IDFactura.FechaExpedicionFactura },
    { name: 'TipoFactura', value: record.TipoFactura },
    { name: 'CuotaTotal', value: record.CuotaTotal, numeric: true },
    { name: 'ImporteTotal', value: record.ImporteTotal, numeric: true },
    { name: 'Huella', value: previousHash ?? '' },
    { name: 'FechaHoraHusoGenRegistro', value: record.FechaHoraHusoGenRegistro },
  ];
  return sha256UpperHex(buildConcatenation(fields));
}

/**
 * Compute the chained SHA-256 hash for a `RegistroAnulacion` record.
 *
 * Five fields are concatenated in the order documented by §3b:
 * `IDEmisorFacturaAnulada`, `NumSerieFacturaAnulada`,
 * `FechaExpedicionFacturaAnulada`, `Huella` (of the previous record) and
 * `FechaHoraHusoGenRegistro`.
 *
 * @param record - The cancellation record.
 * @param previousHash - 64-char uppercase hex hash of the previous record, or
 *   `null` when this is the first record in the chain.
 * @returns The 64-character uppercase hexadecimal SHA-256 digest.
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3b, §6.3}
 * @example
 * ```ts
 * const hash = computeRegistroAnulacionHash(registro, previousAltaHash);
 * // → "177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68"
 * ```
 */
export function computeRegistroAnulacionHash(
  record: RegistroAnulacion,
  previousHash: string | null,
): string {
  const fields: readonly Field[] = [
    { name: 'IDEmisorFacturaAnulada', value: record.IDFactura.IDEmisorFacturaAnulada },
    { name: 'NumSerieFacturaAnulada', value: record.IDFactura.NumSerieFacturaAnulada },
    {
      name: 'FechaExpedicionFacturaAnulada',
      value: record.IDFactura.FechaExpedicionFacturaAnulada,
    },
    { name: 'Huella', value: previousHash ?? '' },
    { name: 'FechaHoraHusoGenRegistro', value: record.FechaHoraHusoGenRegistro },
  ];
  return sha256UpperHex(buildConcatenation(fields));
}

/**
 * Compute the chained SHA-256 hash for a SIF event record (`RegistroEvento`).
 *
 * Nine fields are concatenated in the order documented by §3c:
 * `NIF`, `ID`, `IdSistemaInformatico`, `Version`, `NumeroInstalacion`,
 * `NIF` (of `ObligadoEmision`), `TipoEvento`, `HuellaEvento` (of the previous
 * event) and `FechaHoraHusoGenEvento`.
 *
 * The first two fields are mutually exclusive on the wire; whichever is unset
 * is emitted as `name=` per §3.
 *
 * @param record - The event-record fields contributing to the hash.
 * @param previousHash - 64-char uppercase hex hash of the previous event, or
 *   `null` for the first event in the chain.
 * @returns The 64-character uppercase hexadecimal SHA-256 digest.
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3c}
 * @example
 * ```ts
 * const hash = computeRegistroEventoHash(evento, null);
 * ```
 */
export function computeRegistroEventoHash(
  record: RegistroEventoHashInput,
  previousHash: string | null,
): string {
  const fields: readonly Field[] = [
    { name: 'NIF', value: record.NIF },
    { name: 'ID', value: record.ID },
    { name: 'IdSistemaInformatico', value: record.IdSistemaInformatico },
    { name: 'Version', value: record.Version },
    { name: 'NumeroInstalacion', value: record.NumeroInstalacion },
    { name: 'NIF', value: record.ObligadoEmisionNIF },
    { name: 'TipoEvento', value: record.TipoEvento },
    { name: 'HuellaEvento', value: previousHash ?? '' },
    { name: 'FechaHoraHusoGenEvento', value: record.FechaHoraHusoGenEvento },
  ];
  return sha256UpperHex(buildConcatenation(fields));
}
