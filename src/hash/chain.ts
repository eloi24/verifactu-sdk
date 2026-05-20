/**
 * Chain-linking helpers for VERI*FACTU hashed records.
 *
 * Centralises the rule documented in §5 of the hash spec: a record always
 * carries its own `Huella`, but it carries either `PrimerRegistro="S"`
 * (when it is the first record produced by the SIF) or a fully-populated
 * `RegistroAnterior` block (issuer NIF, series + number, issue date and the
 * previous record's hash).
 *
 * The helpers in this module never mutate the input: they return a shallow
 * clone with the chain pointer and own `Huella` populated, so callers can
 * keep prior records immutable.
 *
 * @module
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §5}
 */

import type { RegistroAlta } from '../schemas/registroAlta.js';
import type { RegistroAnulacion } from '../schemas/registroAnulacion.js';
import { computeRegistroAltaHash, computeRegistroAnulacionHash } from './computeHash.js';

/**
 * Sentinel describing the absolute first record in the SIF chain.
 *
 * When passed as the second argument to {@link linkChain}, the resulting record
 * carries `Encadenamiento.PrimerRegistro="S"` (and no `RegistroAnterior`).
 */
export const FIRST_RECORD = null;

/**
 * Discriminated-union of the records the hash chain understands.
 *
 * Both `RegistroAlta` and `RegistroAnulacion` are accepted; the helper picks
 * the right hash algorithm based on the structural shape of `IDFactura`
 * (the alta record uses `IDEmisorFactura`; the anulación uses
 * `IDEmisorFacturaAnulada`).
 */
export type ChainableRecord = RegistroAlta | RegistroAnulacion;

/**
 * Reference to the previous chained record, used to populate the
 * `Encadenamiento.RegistroAnterior` block on the next record.
 *
 * The four fields are exactly the AEAT-required pointer triple plus the
 * previous hash. The shape mirrors the wire-format names so callers can
 * keep the value next to the record they just produced.
 */
export interface PreviousRecordRef {
  /** Previous record's `IDEmisorFactura` (or `IDEmisorFacturaAnulada`). */
  IDEmisorFactura: string;
  /** Previous record's `NumSerieFactura` (or `NumSerieFacturaAnulada`). */
  NumSerieFactura: string;
  /** Previous record's `FechaExpedicionFactura` (or `…Anulada`). */
  FechaExpedicionFactura: string;
  /** Previous record's own `Huella`, 64-char uppercase hex. */
  Huella: string;
}

/**
 * Type-guard distinguishing an alta record from an anulación record.
 *
 * Branching on the `IDFactura` shape keeps the helper structurally typed:
 * the schema layer guarantees the `Anulada` suffix is the only difference.
 *
 * @internal
 */
function isRegistroAlta(record: ChainableRecord): record is RegistroAlta {
  return 'IDEmisorFactura' in record.IDFactura;
}

/**
 * Extract a {@link PreviousRecordRef} from any chainable record.
 *
 * Useful when callers want to keep around just enough information to chain
 * the next record without retaining the full prior payload.
 *
 * @param record - A previously hashed and chained record.
 * @returns The chain-pointer shape consumed by {@link linkChain}.
 * @example
 * ```ts
 * const linked = linkChain(alta, null);
 * const ref = toPreviousRef(linked);
 * const next = linkChain(secondAlta, ref);
 * ```
 */
export function toPreviousRef(record: ChainableRecord): PreviousRecordRef {
  if (isRegistroAlta(record)) {
    return {
      IDEmisorFactura: record.IDFactura.IDEmisorFactura,
      NumSerieFactura: record.IDFactura.NumSerieFactura,
      FechaExpedicionFactura: record.IDFactura.FechaExpedicionFactura,
      Huella: record.Huella,
    };
  }
  return {
    IDEmisorFactura: record.IDFactura.IDEmisorFacturaAnulada,
    NumSerieFactura: record.IDFactura.NumSerieFacturaAnulada,
    FechaExpedicionFactura: record.IDFactura.FechaExpedicionFacturaAnulada,
    Huella: record.Huella,
  };
}

/**
 * Populate `Encadenamiento` and `Huella` for a freshly-built record.
 *
 * Returns a shallow clone of `currentRecord` with two fields replaced:
 *
 * - `Encadenamiento` is set to either `{ PrimerRegistro: 'S' }` (when
 *   `previous` is `null`/{@link FIRST_RECORD}) or
 *   `{ RegistroAnterior: previous }`.
 * - `Huella` is set to the SHA-256 digest of the appropriate concatenation
 *   defined by §3 of the hash spec.
 *
 * The input is **not** mutated, so the caller can keep using the original
 * unlinked value if needed.
 *
 * @param currentRecord - The record to chain. Its existing `Encadenamiento`
 *   and `Huella` values are ignored.
 * @param previous - Pointer to the previous record, or `null` when this is
 *   the first record in the SIF.
 * @returns A new record with `Encadenamiento` and `Huella` populated.
 * @example
 * ```ts
 * const firstLinked = linkChain(firstAlta, null);
 * const secondLinked = linkChain(secondAlta, toPreviousRef(firstLinked));
 * ```
 */
export function linkChain<T extends ChainableRecord>(
  currentRecord: T,
  previous: PreviousRecordRef | null,
): T {
  const encadenamiento =
    previous === null
      ? ({ PrimerRegistro: 'S' as const } satisfies T['Encadenamiento'])
      : ({
          RegistroAnterior: {
            IDEmisorFactura: previous.IDEmisorFactura,
            NumSerieFactura: previous.NumSerieFactura,
            FechaExpedicionFactura: previous.FechaExpedicionFactura,
            Huella: previous.Huella,
          },
        } satisfies T['Encadenamiento']);

  const previousHash = previous === null ? null : previous.Huella;

  if (isRegistroAlta(currentRecord)) {
    const huella = computeRegistroAltaHash(currentRecord, previousHash);
    return {
      ...currentRecord,
      Encadenamiento: encadenamiento,
      Huella: huella,
    };
  }

  const huella = computeRegistroAnulacionHash(currentRecord, previousHash);
  return {
    ...currentRecord,
    Encadenamiento: encadenamiento,
    Huella: huella,
  };
}
