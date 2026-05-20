/**
 * Common Zod primitives shared by every AEAT VERI*FACTU record.
 *
 * Every primitive defined here mirrors a `simpleType` declared in the AEAT XSD
 * `SuministroInformacion.xsd`. Identifier shapes, length restrictions and
 * formatting rules follow that schema byte-for-byte; the public English-named
 * types layer ({@link ../types.ts}) wraps these and offers more ergonomic
 * names.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors v1.2.2}
 * @module
 */

import { z } from 'zod';

/**
 * Spanish NIF (Número de Identificación Fiscal).
 *
 * Nine alphanumeric uppercase characters. The XSD only enforces the length;
 * the business-rule check digit is verified separately in `validators/nif.ts`.
 *
 * @remarks
 * The AEAT `NIFType` declares `<length value="9"/>` only — control-digit
 * validation lives outside the schema layer to keep the schema reusable for
 * raw wire payloads.
 */
export const NifSchema = z
  .string()
  .regex(/^[A-Z0-9]{9}$/u, 'NIF must be 9 uppercase alphanumeric characters');

/** Inferred type of {@link NifSchema} — a 9-char Spanish tax identifier. */
export type Nif = z.infer<typeof NifSchema>;

/**
 * Two-letter ISO 3166-1 alpha-2 country code accepted by the AEAT.
 *
 * The AEAT publishes a closed list (`CountryType2`) that includes a handful of
 * non-standard codes such as `XG`, `XB`, `XU`, `XN`, `QU` (used for special
 * jurisdictions). Rather than duplicating the full list, the schema validates
 * the syntactic shape; semantic membership is rechecked by the protocol layer
 * before serialisation.
 */
export const CountryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/u, 'Country code must be 2 uppercase letters');

/** Inferred type of {@link CountryCodeSchema}. */
export type CountryCode = z.infer<typeof CountryCodeSchema>;

/**
 * AEAT identifier-type code (`PersonaFisicaJuridicaIDTypeType`, list L7).
 *
 * The codes have the following meaning:
 *
 * - `02` — NIF-IVA (EU intra-community VAT identifier)
 * - `03` — Pasaporte (Passport)
 * - `04` — IDEnPaisResidencia (residence-country identifier)
 * - `05` — Certificado de Residencia
 * - `06` — Otro documento Probatorio
 * - `07` — No Censado (not censused)
 *
 * Note that code `01` (NIF) is intentionally absent from this enum: when the
 * counterpart has a Spanish NIF the wire format uses the dedicated `NIF`
 * element, not the `IDOtro` block (see {@link IdOtroSchema}).
 */
export const IdTypeSchema = z.enum(['02', '03', '04', '05', '06', '07']);

/** Inferred type of {@link IdTypeSchema}. */
export type IdType = z.infer<typeof IdTypeSchema>;

/**
 * Foreign or alternate counterpart identification (`IDOtroType`).
 *
 * Used when a counterpart cannot be identified by a Spanish NIF. `CodigoPais`
 * is optional — the AEAT rules require it for every {@link IdType} except
 * `02` (NIF-IVA). Business rules (e.g. `CodigoPais=ES` forcing `IDType=03`)
 * are enforced by the `validators/` layer, not here, to keep the schema usable
 * for raw wire payloads.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.5.1, §15.2}
 */
export const IdOtroSchema = z.object({
  CodigoPais: CountryCodeSchema.optional(),
  IDType: IdTypeSchema,
  ID: z.string().min(1).max(20),
});

/** Inferred type of {@link IdOtroSchema}. */
export type IdOtro = z.infer<typeof IdOtroSchema>;

/**
 * Date in AEAT wire format `DD-MM-YYYY`.
 *
 * This is the format the AEAT XSD uses for every `<sf:fecha>` element. ISO
 * dates (`YYYY-MM-DD`) are not accepted on the wire and must be converted
 * before serialisation; see {@link FechaIsoSchema} for the public-API form.
 */
export const FechaDdMmYyyySchema = z
  .string()
  .regex(/^\d{2}-\d{2}-\d{4}$/u, 'Date must be in DD-MM-YYYY format');

/** Inferred type of {@link FechaDdMmYyyySchema}. */
export type FechaDdMmYyyy = z.infer<typeof FechaDdMmYyyySchema>;

/**
 * ISO 8601 date in `YYYY-MM-DD` form.
 *
 * Used by the public English-named API and converted to {@link FechaDdMmYyyySchema}
 * (the AEAT wire form) by the `wire/` transformer. Both schemas perform a
 * regex check; the protocol layer additionally validates that the value
 * resolves to a real calendar date.
 */
export const FechaIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must be in YYYY-MM-DD format');

/** Inferred type of {@link FechaIsoSchema}. */
export type FechaIso = z.infer<typeof FechaIsoSchema>;

/**
 * Signed monetary amount with up to 12 integer digits and 2 decimal digits.
 *
 * Mirrors the AEAT `ImporteSgn12.2Type` simpleType
 * (`pattern="(\+|-)?\d{1,12}(\.\d{0,2})?"`).
 *
 * @remarks
 * Values are kept as strings to avoid IEEE-754 precision loss when the same
 * payload round-trips through the hash algorithm: the spec requires the exact
 * textual form (no trailing zeros, dot as decimal separator) to be hashed.
 * The validator/integration layer is responsible for normalising the form.
 */
export const ImporteSchema = z
  .string()
  .regex(/^[+-]?\d{1,12}(\.\d{1,2})?$/u, 'Amount must have up to 12 integer + 2 decimal digits');

/** Inferred type of {@link ImporteSchema}. */
export type Importe = z.infer<typeof ImporteSchema>;

/**
 * Tax-rate percentage with up to 3 integer + 2 decimal digits (`Tipo2.2Type`).
 *
 * Accepts strings like `"21"`, `"21.00"`, `"4.0"`, `"0"`.
 */
export const TipoImpositivoSchema = z
  .string()
  .regex(/^\d{1,3}(\.\d{1,2})?$/u, 'Rate must have up to 3 integer + 2 decimal digits');

/** Inferred type of {@link TipoImpositivoSchema}. */
export type TipoImpositivo = z.infer<typeof TipoImpositivoSchema>;

/**
 * ISO 8601 timestamp with timezone offset (`xsd:dateTime`).
 *
 * Used for `FechaHoraHusoGenRegistro` and `TimestampPresentacion`. The regex
 * permits `Z`, `+HH:MM` or `-HH:MM` suffixes. Fractional seconds are allowed
 * for flexibility — the AEAT silently truncates them.
 *
 * @example
 * ```ts
 * FechaHoraHusoSchema.parse('2026-05-20T12:34:56+02:00');
 * FechaHoraHusoSchema.parse('2026-05-20T12:34:56Z');
 * ```
 */
export const FechaHoraHusoSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/u,
    'Timestamp must be ISO 8601 with timezone (e.g. 2026-05-20T12:34:56+02:00)',
  );

/** Inferred type of {@link FechaHoraHusoSchema}. */
export type FechaHoraHuso = z.infer<typeof FechaHoraHusoSchema>;

/**
 * `NumSerieFactura` — invoice series + number (`TextoIDFacturaType`).
 *
 * Length 1–60. Business rules forbid certain characters (`" ' < > =`); that
 * check lives in `validators/businessRules.ts`.
 */
export const NumSerieFacturaSchema = z.string().min(1).max(60);

/** Inferred type of {@link NumSerieFacturaSchema}. */
export type NumSerieFactura = z.infer<typeof NumSerieFacturaSchema>;

/**
 * `S` or `N` boolean-like flag — used by many AEAT fields (`SiNoType`).
 */
export const SiNoSchema = z.enum(['S', 'N']);

/** Inferred type of {@link SiNoSchema}. */
export type SiNo = z.infer<typeof SiNoSchema>;

/**
 * `IDVersion` — VERI*FACTU record format version (`VersionType`).
 *
 * Currently only `"1.0"` is defined by the AEAT.
 */
export const IdVersionSchema = z.literal('1.0');

/** Inferred type of {@link IdVersionSchema}. */
export type IdVersion = z.infer<typeof IdVersionSchema>;

/**
 * `TipoHuella` — hash algorithm identifier (`TipoHuellaType`).
 *
 * Only SHA-256 (`"01"`) is currently defined by the AEAT.
 */
export const TipoHuellaSchema = z.literal('01');

/** Inferred type of {@link TipoHuellaSchema}. */
export type TipoHuella = z.infer<typeof TipoHuellaSchema>;

/**
 * `Huella` — 64-char uppercase hexadecimal SHA-256 digest (`TextMax64Type`).
 *
 * The XSD only enforces `maxLength=64`, but the hash specification (v0.1.2)
 * additionally requires uppercase hex; the schema applies the stricter
 * constraint to fail fast.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Hash spec v0.1.2}
 */
export const HuellaSchema = z
  .string()
  .regex(/^[0-9A-F]{64}$/u, 'Huella must be 64 uppercase hex characters');

/** Inferred type of {@link HuellaSchema}. */
export type Huella = z.infer<typeof HuellaSchema>;

/**
 * `NombreRazon` — issuer/recipient legal name (`TextMax120Type`, 1–120 chars).
 */
export const NombreRazonSchema = z.string().min(1).max(120);

/** Inferred type of {@link NombreRazonSchema}. */
export type NombreRazon = z.infer<typeof NombreRazonSchema>;

/**
 * `PersonaFisicaJuridicaES` — Spanish person/entity (NIF mandatory).
 *
 * Used for `ObligadoEmision`, `Representante` and for the `Generador`/`Tercero`
 * blocks when they identify a Spanish entity.
 */
export const PersonaFisicaJuridicaESSchema = z.object({
  NombreRazon: NombreRazonSchema,
  NIF: NifSchema,
});

/** Inferred type of {@link PersonaFisicaJuridicaESSchema}. */
export type PersonaFisicaJuridicaES = z.infer<typeof PersonaFisicaJuridicaESSchema>;

/**
 * `PersonaFisicaJuridica` — Spanish or foreign person/entity (NIF or IDOtro).
 *
 * Models the XSD `<choice>` between `NIF` and `IDOtro` as two mutually
 * exclusive properties guarded by a discriminator on which one is present.
 */
export const PersonaFisicaJuridicaSchema = z
  .object({
    NombreRazon: NombreRazonSchema,
    NIF: NifSchema.optional(),
    IDOtro: IdOtroSchema.optional(),
  })
  .refine((value) => (value.NIF === undefined) !== (value.IDOtro === undefined), {
    message: 'Exactly one of NIF or IDOtro must be set',
  });

/** Inferred type of {@link PersonaFisicaJuridicaSchema}. */
export type PersonaFisicaJuridica = z.infer<typeof PersonaFisicaJuridicaSchema>;

/**
 * `RefExterna` — caller-supplied external reference (`TextMax60Type`).
 */
export const RefExternaSchema = z.string().min(1).max(60);

/** Inferred type of {@link RefExternaSchema}. */
export type RefExterna = z.infer<typeof RefExternaSchema>;
