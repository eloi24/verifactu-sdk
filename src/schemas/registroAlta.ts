/**
 * Zod schema for `RegistroFacturacionAltaType` — invoice registration record.
 *
 * Mirrors `RegistroFacturacionAltaType` in `SuministroInformacion.xsd` 1:1.
 * Every field uses the Spanish wire name; the English-named public form is
 * defined in `../types.ts` and converted bidirectionally by `../wire/`.
 *
 * @module
 */

import { z } from 'zod';
import {
  FechaDdMmYyyySchema,
  FechaHoraHusoSchema,
  HuellaSchema,
  IdVersionSchema,
  ImporteSchema,
  NifSchema,
  NombreRazonSchema,
  NumSerieFacturaSchema,
  PersonaFisicaJuridicaSchema,
  RefExternaSchema,
  SiNoSchema,
  TipoHuellaSchema,
  TipoImpositivoSchema,
} from './common.js';
import { SistemaInformaticoSchema } from './sistemaInformatico.js';

/**
 * `IDFactura` for an alta record (`IDFacturaExpedidaType`).
 *
 * Tuple of issuer NIF, series + number, and issue date (DD-MM-YYYY).
 */
export const IdFacturaSchema = z.object({
  IDEmisorFactura: NifSchema,
  NumSerieFactura: NumSerieFacturaSchema,
  FechaExpedicionFactura: FechaDdMmYyyySchema,
});

/** Inferred type of {@link IdFacturaSchema}. */
export type IdFactura = z.infer<typeof IdFacturaSchema>;

/**
 * `IDFacturaAR` for a rectified or substituted invoice (`IDFacturaARType`).
 *
 * Structurally identical to {@link IdFacturaSchema}; kept as a separate symbol
 * so the wire mapper can reproduce the distinct XSD type name.
 */
export const IdFacturaARSchema = IdFacturaSchema;

/** Inferred type of {@link IdFacturaARSchema}. */
export type IdFacturaAR = z.infer<typeof IdFacturaARSchema>;

/**
 * `TipoFactura` — invoice-type code (list L4 / `ClaveTipoFacturaType`).
 *
 * - `F1` — ordinary invoice (art. 6, 7.2, 7.3 RD 1619/2012)
 * - `F2` — simplified invoice (or invoice without recipient identification)
 * - `F3` — invoice replacing simplified ones already declared
 * - `R1`–`R4` — rectifying invoices (different articles of the VAT law)
 * - `R5` — rectifying invoice over a simplified one
 */
export const TipoFacturaSchema = z.enum(['F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5']);

/** Inferred type of {@link TipoFacturaSchema}. */
export type TipoFactura = z.infer<typeof TipoFacturaSchema>;

/**
 * `TipoRectificativa` — `S` (sustitutiva) or `I` (incremental).
 */
export const TipoRectificativaSchema = z.enum(['S', 'I']);

/** Inferred type of {@link TipoRectificativaSchema}. */
export type TipoRectificativa = z.infer<typeof TipoRectificativaSchema>;

/**
 * `RechazoPrevio` for an alta record (`RechazoPrevioType`).
 *
 * - `N` — no prior AEAT rejection
 * - `S` — prior AEAT rejection (the record is being resubmitted)
 * - `X` — record never existed in AEAT but already existed locally
 */
export const RechazoPrevioAltaSchema = z.enum(['N', 'S', 'X']);

/** Inferred type of {@link RechazoPrevioAltaSchema}. */
export type RechazoPrevioAlta = z.infer<typeof RechazoPrevioAltaSchema>;

/**
 * `EmitidaPorTerceroODestinatario` — issued by `T`hird party or `D`estinatario.
 */
export const EmitidaPorTerceroODestinatarioSchema = z.enum(['T', 'D']);

/** Inferred type of {@link EmitidaPorTerceroODestinatarioSchema}. */
export type EmitidaPorTerceroODestinatario = z.infer<typeof EmitidaPorTerceroODestinatarioSchema>;

/**
 * `DescripcionOperacion` — operation description (`TextMax500Type`).
 */
export const DescripcionOperacionSchema = z.string().min(1).max(500);

/** Inferred type of {@link DescripcionOperacionSchema}. */
export type DescripcionOperacion = z.infer<typeof DescripcionOperacionSchema>;

/**
 * `Impuesto` — tax code (`ImpuestoType`, list L1).
 *
 * - `01` — IVA (Spanish VAT)
 * - `02` — IPSI (Ceuta/Melilla)
 * - `03` — IGIC (Canary Islands)
 * - `05` — Otros (other indirect tax)
 */
export const ImpuestoSchema = z.enum(['01', '02', '03', '05']);

/** Inferred type of {@link ImpuestoSchema}. */
export type Impuesto = z.infer<typeof ImpuestoSchema>;

/**
 * `ClaveRegimen` — operation-regime key (L8A for IVA, L8B for IGIC).
 *
 * The union is the textual superset of both lists. Cross-validation against
 * the chosen tax is performed by `validators/claveRegimen.ts`.
 */
export const ClaveRegimenSchema = z.enum([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '14',
  '15',
  '17',
  '18',
  '19',
  '20',
  '21',
]);

/** Inferred type of {@link ClaveRegimenSchema}. */
export type ClaveRegimen = z.infer<typeof ClaveRegimenSchema>;

/**
 * `CalificacionOperacion` — taxable-status code.
 *
 * - `S1` — subject and non-exempt, no reverse charge
 * - `S2` — subject and non-exempt, reverse charge
 * - `N1` — non-subject (art. 7, 14, others)
 * - `N2` — non-subject by localisation rules
 */
export const CalificacionOperacionSchema = z.enum(['S1', 'S2', 'N1', 'N2']);

/** Inferred type of {@link CalificacionOperacionSchema}. */
export type CalificacionOperacion = z.infer<typeof CalificacionOperacionSchema>;

/**
 * `OperacionExenta` — exemption-reason code (list L10, plus E7/E8 for IGIC).
 */
export const OperacionExentaSchema = z.enum(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']);

/** Inferred type of {@link OperacionExentaSchema}. */
export type OperacionExenta = z.infer<typeof OperacionExentaSchema>;

/**
 * `DetalleDesglose` — one breakdown line of {@link DesgloseSchema}.
 *
 * The AEAT XSD models `CalificacionOperacion` vs `OperacionExenta` as an
 * `<xsd:choice>`; Zod enforces this by requiring exactly one of the two
 * properties to be present.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.3–§15.6}
 */
export const DetalleDesgloseSchema = z
  .object({
    Impuesto: ImpuestoSchema.optional(),
    ClaveRegimen: ClaveRegimenSchema.optional(),
    CalificacionOperacion: CalificacionOperacionSchema.optional(),
    OperacionExenta: OperacionExentaSchema.optional(),
    TipoImpositivo: TipoImpositivoSchema.optional(),
    BaseImponibleOimporteNoSujeto: ImporteSchema,
    BaseImponibleACoste: ImporteSchema.optional(),
    CuotaRepercutida: ImporteSchema.optional(),
    TipoRecargoEquivalencia: TipoImpositivoSchema.optional(),
    CuotaRecargoEquivalencia: ImporteSchema.optional(),
  })
  .refine(
    (value) =>
      (value.CalificacionOperacion === undefined) !== (value.OperacionExenta === undefined),
    { message: 'Exactly one of CalificacionOperacion or OperacionExenta must be present' },
  );

/** Inferred type of {@link DetalleDesgloseSchema}. */
export type DetalleDesglose = z.infer<typeof DetalleDesgloseSchema>;

/**
 * `Desglose` — list of breakdown lines (1–12 entries per XSD `maxOccurs`).
 */
export const DesgloseSchema = z.object({
  DetalleDesglose: z.array(DetalleDesgloseSchema).min(1).max(12),
});

/** Inferred type of {@link DesgloseSchema}. */
export type Desglose = z.infer<typeof DesgloseSchema>;

/**
 * `ImporteRectificacion` — substitution-rectification breakdown.
 *
 * Only populated when `TipoRectificativa = "S"` (sustitutiva).
 */
export const ImporteRectificacionSchema = z.object({
  BaseRectificada: ImporteSchema,
  CuotaRectificada: ImporteSchema,
  CuotaRecargoRectificado: ImporteSchema.optional(),
});

/** Inferred type of {@link ImporteRectificacionSchema}. */
export type ImporteRectificacion = z.infer<typeof ImporteRectificacionSchema>;

/**
 * `RegistroAnterior` — link to the previous record in the hash chain.
 */
export const RegistroAnteriorSchema = z.object({
  IDEmisorFactura: NifSchema,
  NumSerieFactura: NumSerieFacturaSchema,
  FechaExpedicionFactura: FechaDdMmYyyySchema,
  Huella: HuellaSchema,
});

/** Inferred type of {@link RegistroAnteriorSchema}. */
export type RegistroAnterior = z.infer<typeof RegistroAnteriorSchema>;

/**
 * `Encadenamiento` — chain link: first-record flag XOR previous-record block.
 *
 * The XSD declares a `<choice>` between `PrimerRegistro="S"` and
 * `RegistroAnterior`; the schema enforces exclusivity with a `refine`.
 */
export const EncadenamientoSchema = z
  .object({
    PrimerRegistro: z.literal('S').optional(),
    RegistroAnterior: RegistroAnteriorSchema.optional(),
  })
  .refine(
    (value) => (value.PrimerRegistro === undefined) !== (value.RegistroAnterior === undefined),
    { message: 'Exactly one of PrimerRegistro or RegistroAnterior must be present' },
  );

/** Inferred type of {@link EncadenamientoSchema}. */
export type Encadenamiento = z.infer<typeof EncadenamientoSchema>;

/**
 * `Destinatarios` — array of up to 1000 recipients (`maxOccurs="1000"`).
 *
 * The XSD limit is `1000`; the validations document forbids the block when
 * `TipoFactura` is `F2`/`R5` (simplified invoices).
 */
export const DestinatariosSchema = z.object({
  IDDestinatario: z.array(PersonaFisicaJuridicaSchema).min(1).max(1000),
});

/** Inferred type of {@link DestinatariosSchema}. */
export type Destinatarios = z.infer<typeof DestinatariosSchema>;

/**
 * `RegistroAlta` — full invoice-registration record.
 *
 * The schema preserves the AEAT field order so that the wire serialiser only
 * needs to walk the object once. Required vs optional matches `minOccurs` in
 * the XSD; business-rule constraints (mandatory `TipoRectificativa` when
 * `TipoFactura` is rectifying, etc.) live in `validators/`.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3}
 */
export const RegistroAltaSchema = z.object({
  IDVersion: IdVersionSchema,
  IDFactura: IdFacturaSchema,
  RefExterna: RefExternaSchema.optional(),
  NombreRazonEmisor: NombreRazonSchema,
  Subsanacion: SiNoSchema.optional(),
  RechazoPrevio: RechazoPrevioAltaSchema.optional(),
  TipoFactura: TipoFacturaSchema,
  TipoRectificativa: TipoRectificativaSchema.optional(),
  FacturasRectificadas: z
    .object({
      IDFacturaRectificada: z.array(IdFacturaARSchema).min(1).max(1000),
    })
    .optional(),
  FacturasSustituidas: z
    .object({
      IDFacturaSustituida: z.array(IdFacturaARSchema).min(1).max(1000),
    })
    .optional(),
  ImporteRectificacion: ImporteRectificacionSchema.optional(),
  FechaOperacion: FechaDdMmYyyySchema.optional(),
  DescripcionOperacion: DescripcionOperacionSchema,
  FacturaSimplificadaArt7273: SiNoSchema.optional(),
  FacturaSinIdentifDestinatarioArt61d: SiNoSchema.optional(),
  Macrodato: SiNoSchema.optional(),
  EmitidaPorTerceroODestinatario: EmitidaPorTerceroODestinatarioSchema.optional(),
  Tercero: PersonaFisicaJuridicaSchema.optional(),
  Destinatarios: DestinatariosSchema.optional(),
  Cupon: SiNoSchema.optional(),
  Desglose: DesgloseSchema,
  CuotaTotal: ImporteSchema,
  ImporteTotal: ImporteSchema,
  Encadenamiento: EncadenamientoSchema,
  SistemaInformatico: SistemaInformaticoSchema,
  FechaHoraHusoGenRegistro: FechaHoraHusoSchema,
  NumRegistroAcuerdoFacturacion: z.string().min(1).max(15).optional(),
  IdAcuerdoSistemaInformatico: z.string().min(1).max(16).optional(),
  TipoHuella: TipoHuellaSchema,
  Huella: HuellaSchema,
});

/** Inferred type of {@link RegistroAltaSchema}. */
export type RegistroAlta = z.infer<typeof RegistroAltaSchema>;
