/**
 * Zod schemas for AEAT response payloads.
 *
 * - {@link RespuestaSchema} — response to a registration submission
 *   (`RespuestaRegFactuSistemaFacturacion`).
 * - {@link RespuestaConsultaSchema} — response to a query
 *   (`RespuestaConsultaFactuSistemaFacturacion`).
 *
 * The query response is intentionally permissive: every field below
 * `DatosRegistroFacturacion` is optional in the XSD because the AEAT may
 * choose to omit them depending on the query flags.
 *
 * @module
 */

import { z } from 'zod';
import { CabeceraSchema } from './cabecera.js';
import {
  FechaDdMmYyyySchema,
  FechaHoraHusoSchema,
  HuellaSchema,
  ImporteSchema,
  NifSchema,
  NombreRazonSchema,
  PersonaFisicaJuridicaSchema,
  RefExternaSchema,
  SiNoSchema,
  TipoHuellaSchema,
} from './common.js';
import {
  CabeceraConsultaSchema,
  ClavePaginacionSchema,
  PeriodoImputacionSchema,
} from './consulta.js';
import {
  DescripcionOperacionSchema,
  DesgloseSchema,
  DestinatariosSchema,
  EmitidaPorTerceroODestinatarioSchema,
  EncadenamientoSchema,
  IdFacturaARSchema,
  IdFacturaSchema,
  ImporteRectificacionSchema,
  RechazoPrevioAltaSchema,
  TipoFacturaSchema,
  TipoRectificativaSchema,
} from './registroAlta.js';
import { GeneradoPorSchema } from './registroAnulacion.js';
import { SistemaInformaticoSchema } from './sistemaInformatico.js';

/**
 * `EstadoEnvio` — global submission state (L18).
 *
 * - `Correcto` — every record was accepted
 * - `ParcialmenteCorrecto` — at least one record was rejected or accepted with errors
 * - `Incorrecto` — every record was rejected
 */
export const EstadoEnvioSchema = z.enum(['Correcto', 'ParcialmenteCorrecto', 'Incorrecto']);

/** Inferred type of {@link EstadoEnvioSchema}. */
export type EstadoEnvio = z.infer<typeof EstadoEnvioSchema>;

/**
 * `EstadoRegistro` for the registration response (L19).
 *
 * Distinct from the consulta response which uses `Anulado` in place of
 * `Incorrecto` (the system stores the rejection cause separately).
 */
export const EstadoRegistroRespuestaSchema = z.enum([
  'Correcto',
  'AceptadoConErrores',
  'Incorrecto',
]);

/** Inferred type of {@link EstadoRegistroRespuestaSchema}. */
export type EstadoRegistroRespuesta = z.infer<typeof EstadoRegistroRespuestaSchema>;

/**
 * `EstadoRegistroDuplicado` for `RegistroDuplicado.EstadoRegistroDuplicado` (L21).
 */
export const EstadoRegistroDuplicadoSchema = z.enum(['Correcta', 'AceptadaConErrores', 'Anulada']);

/** Inferred type of {@link EstadoRegistroDuplicadoSchema}. */
export type EstadoRegistroDuplicado = z.infer<typeof EstadoRegistroDuplicadoSchema>;

/**
 * `TipoOperacion` — operation type returned by the AEAT (L22).
 */
export const TipoOperacionSchema = z.enum(['Alta', 'Anulacion']);

/** Inferred type of {@link TipoOperacionSchema}. */
export type TipoOperacion = z.infer<typeof TipoOperacionSchema>;

/**
 * `Operacion` — operation block echoed in the response.
 */
export const OperacionRespuestaSchema = z.object({
  TipoOperacion: TipoOperacionSchema,
  Subsanacion: SiNoSchema.optional(),
  RechazoPrevio: RechazoPrevioAltaSchema.optional(),
  SinRegistroPrevio: SiNoSchema.optional(),
});

/** Inferred type of {@link OperacionRespuestaSchema}. */
export type OperacionRespuesta = z.infer<typeof OperacionRespuestaSchema>;

/**
 * `RegistroDuplicado` — info about a pre-existing duplicate when a submission
 * is rejected because the AEAT already stored the same invoice.
 */
export const RegistroDuplicadoSchema = z.object({
  IdPeticionRegistroDuplicado: z.string().min(1).max(20),
  EstadoRegistroDuplicado: EstadoRegistroDuplicadoSchema,
  CodigoErrorRegistro: z.number().int().optional(),
  DescripcionErrorRegistro: z.string().min(1).max(500).optional(),
});

/** Inferred type of {@link RegistroDuplicadoSchema}. */
export type RegistroDuplicado = z.infer<typeof RegistroDuplicadoSchema>;

/**
 * `RespuestaLinea` — per-record outcome inside a submission response.
 */
export const RespuestaLineaSchema = z.object({
  IDFactura: IdFacturaSchema,
  Operacion: OperacionRespuestaSchema,
  RefExterna: RefExternaSchema.optional(),
  EstadoRegistro: EstadoRegistroRespuestaSchema,
  CodigoErrorRegistro: z.number().int().optional(),
  DescripcionErrorRegistro: z.string().min(1).max(1500).optional(),
  RegistroDuplicado: RegistroDuplicadoSchema.optional(),
});

/** Inferred type of {@link RespuestaLineaSchema}. */
export type RespuestaLinea = z.infer<typeof RespuestaLineaSchema>;

/**
 * `DatosPresentacion` — presentation metadata returned by the AEAT.
 */
export const DatosPresentacionSchema = z.object({
  NIFPresentador: NifSchema,
  TimestampPresentacion: FechaHoraHusoSchema,
});

/** Inferred type of {@link DatosPresentacionSchema}. */
export type DatosPresentacion = z.infer<typeof DatosPresentacionSchema>;

/**
 * `DatosPresentacion2` — extended presentation block with the request id,
 * used in the consulta response.
 */
export const DatosPresentacion2Schema = DatosPresentacionSchema.extend({
  IdPeticion: z.string().min(1).max(20),
});

/** Inferred type of {@link DatosPresentacion2Schema}. */
export type DatosPresentacion2 = z.infer<typeof DatosPresentacion2Schema>;

/**
 * `RespuestaRegFactuSistemaFacturacion` — full submission response.
 *
 * `TiempoEsperaEnvio` is the throttling parameter (in seconds, up to 4 digits)
 * the SDK must respect before issuing the next submission.
 */
export const RespuestaSchema = z.object({
  CSV: z.string().min(1).optional(),
  DatosPresentacion: DatosPresentacionSchema.optional(),
  Cabecera: CabeceraSchema,
  TiempoEsperaEnvio: z.string().regex(/^\d{1,4}$/u, 'TiempoEsperaEnvio must be 1–4 digits'),
  EstadoEnvio: EstadoEnvioSchema,
  RespuestaLinea: z.array(RespuestaLineaSchema).min(0).max(1000),
});

/** Inferred type of {@link RespuestaSchema}. */
export type Respuesta = z.infer<typeof RespuestaSchema>;

/**
 * `EstadoRegistro` for the consulta response — `Correcto`, `AceptadoConErrores`
 * or `Anulado` (note the `Anulado` value, distinct from the submission L19).
 */
export const EstadoRegistroConsultaSchema = z.enum(['Correcto', 'AceptadoConErrores', 'Anulado']);

/** Inferred type of {@link EstadoRegistroConsultaSchema}. */
export type EstadoRegistroConsulta = z.infer<typeof EstadoRegistroConsultaSchema>;

/**
 * `EstadoRegistro` block inside a `RegistroRespuestaConsultaFactuSistemaFacturacion`.
 */
export const EstadoRegistroConsultaBlockSchema = z.object({
  TimestampUltimaModificacion: FechaHoraHusoSchema,
  EstadoRegistro: EstadoRegistroConsultaSchema,
  CodigoErrorRegistro: z.number().int().optional(),
  DescripcionErrorRegistro: z.string().min(1).max(500).optional(),
});

/** Inferred type of {@link EstadoRegistroConsultaBlockSchema}. */
export type EstadoRegistroConsultaBlock = z.infer<typeof EstadoRegistroConsultaBlockSchema>;

/**
 * `DatosRegistroFacturacion` — the bulk of a queried record.
 *
 * Almost every field is optional in the XSD; presence depends on the query
 * flags (`MostrarNombreRazonEmisor`, `MostrarSistemaInformatico`) and on
 * whether the record was cancelled or partially accepted.
 */
export const DatosRegistroFacturacionSchema = z.object({
  NombreRazonEmisor: NombreRazonSchema.optional(),
  RefExterna: RefExternaSchema.optional(),
  Subsanacion: SiNoSchema.optional(),
  RechazoPrevio: RechazoPrevioAltaSchema.optional(),
  SinRegistroPrevio: SiNoSchema.optional(),
  GeneradoPor: GeneradoPorSchema.optional(),
  Generador: PersonaFisicaJuridicaSchema.optional(),
  TipoFactura: TipoFacturaSchema.optional(),
  TipoRectificativa: TipoRectificativaSchema.optional(),
  FacturasRectificadas: z
    .object({ IDFacturaRectificada: z.array(IdFacturaARSchema).min(1).max(1000) })
    .optional(),
  FacturasSustituidas: z
    .object({ IDFacturaSustituida: z.array(IdFacturaARSchema).min(1).max(1000) })
    .optional(),
  ImporteRectificacion: ImporteRectificacionSchema.optional(),
  FechaOperacion: FechaDdMmYyyySchema.optional(),
  DescripcionOperacion: DescripcionOperacionSchema.optional(),
  FacturaSimplificadaArt7273: SiNoSchema.optional(),
  FacturaSinIdentifDestinatarioArt61d: SiNoSchema.optional(),
  Macrodato: SiNoSchema.optional(),
  EmitidaPorTerceroODestinatario: EmitidaPorTerceroODestinatarioSchema.optional(),
  Tercero: PersonaFisicaJuridicaSchema.optional(),
  Destinatarios: DestinatariosSchema.optional(),
  Cupon: SiNoSchema.optional(),
  Desglose: DesgloseSchema.optional(),
  CuotaTotal: ImporteSchema.optional(),
  ImporteTotal: ImporteSchema.optional(),
  Encadenamiento: EncadenamientoSchema.optional(),
  SistemaInformatico: SistemaInformaticoSchema.optional(),
  FechaHoraHusoGenRegistro: FechaHoraHusoSchema.optional(),
  NumRegistroAcuerdoFacturacion: z.string().min(1).max(15).optional(),
  IdAcuerdoSistemaInformatico: z.string().min(1).max(16).optional(),
  TipoHuella: TipoHuellaSchema.optional(),
  Huella: HuellaSchema.optional(),
  NifRepresentante: NifSchema.optional(),
  FechaFinVeriFactu: FechaDdMmYyyySchema.optional(),
  Incidencia: SiNoSchema.optional(),
});

/** Inferred type of {@link DatosRegistroFacturacionSchema}. */
export type DatosRegistroFacturacion = z.infer<typeof DatosRegistroFacturacionSchema>;

/**
 * `RegistroRespuestaConsultaFactuSistemaFacturacion` — one record entry.
 */
export const RegistroRespuestaConsultaSchema = z.object({
  IDFactura: IdFacturaSchema,
  DatosRegistroFacturacion: DatosRegistroFacturacionSchema,
  DatosPresentacion: DatosPresentacion2Schema.optional(),
  EstadoRegistro: EstadoRegistroConsultaBlockSchema,
});

/** Inferred type of {@link RegistroRespuestaConsultaSchema}. */
export type RegistroRespuestaConsulta = z.infer<typeof RegistroRespuestaConsultaSchema>;

/**
 * `IndicadorPaginacion` — `"S"` when more pages follow, `"N"` otherwise.
 */
export const IndicadorPaginacionSchema = z.enum(['S', 'N']);

/** Inferred type of {@link IndicadorPaginacionSchema}. */
export type IndicadorPaginacion = z.infer<typeof IndicadorPaginacionSchema>;

/**
 * `ResultadoConsulta` — `"ConDatos"` if records were returned, `"SinDatos"` otherwise.
 */
export const ResultadoConsultaSchema = z.enum(['ConDatos', 'SinDatos']);

/** Inferred type of {@link ResultadoConsultaSchema}. */
export type ResultadoConsulta = z.infer<typeof ResultadoConsultaSchema>;

/**
 * `RespuestaConsultaFactuSistemaFacturacion` — full query response.
 *
 * The records list is bounded at 10000 by the XSD (`maxOccurs="10000"`).
 */
export const RespuestaConsultaSchema = z.object({
  Cabecera: CabeceraConsultaSchema,
  PeriodoImputacion: PeriodoImputacionSchema,
  IndicadorPaginacion: IndicadorPaginacionSchema,
  ResultadoConsulta: ResultadoConsultaSchema,
  RegistroRespuestaConsultaFactuSistemaFacturacion: z
    .array(RegistroRespuestaConsultaSchema)
    .min(0)
    .max(10000),
  ClavePaginacion: ClavePaginacionSchema.optional(),
});

/** Inferred type of {@link RespuestaConsultaSchema}. */
export type RespuestaConsulta = z.infer<typeof RespuestaConsultaSchema>;
