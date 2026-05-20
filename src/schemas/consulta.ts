/**
 * Zod schemas for the AEAT consulta (query) service.
 *
 * Mirror the `ConsultaLR.xsd` schema: a query carries a header with the
 * obligated party (issuer) or destinatario (recipient), a filter block and
 * optional pagination/extra-response indicators.
 *
 * @module
 */

import { z } from 'zod';
import {
  FechaDdMmYyyySchema,
  IdOtroSchema,
  IdVersionSchema,
  NifSchema,
  NombreRazonSchema,
  NumSerieFacturaSchema,
  PersonaFisicaJuridicaESSchema,
  RefExternaSchema,
  SiNoSchema,
} from './common.js';
import { IdSistemaInformaticoSchema } from './sistemaInformatico.js';

/**
 * `Periodo` — month code `01`–`12` (`TipoPeriodoType`, list L2C).
 */
export const PeriodoSchema = z.enum([
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
  '12',
]);

/** Inferred type of {@link PeriodoSchema}. */
export type Periodo = z.infer<typeof PeriodoSchema>;

/**
 * `Ejercicio` — four-digit fiscal year (`YearType`).
 */
export const EjercicioSchema = z.string().regex(/^\d{4}$/u, 'Ejercicio must be 4 digits');

/** Inferred type of {@link EjercicioSchema}. */
export type Ejercicio = z.infer<typeof EjercicioSchema>;

/**
 * `PeriodoImputacion` — fiscal year + month tuple identifying the period.
 */
export const PeriodoImputacionSchema = z.object({
  Ejercicio: EjercicioSchema,
  Periodo: PeriodoSchema,
});

/** Inferred type of {@link PeriodoImputacionSchema}. */
export type PeriodoImputacion = z.infer<typeof PeriodoImputacionSchema>;

/**
 * Counterpart filter for `ContraparteConsultaType`.
 *
 * Mirrors `PersonaFisicaJuridicaType` (NIF XOR IDOtro) but is reused only in
 * consulta operations.
 */
export const ContraparteConsultaSchema = z
  .object({
    NombreRazon: NombreRazonSchema,
    NIF: NifSchema.optional(),
    IDOtro: IdOtroSchema.optional(),
  })
  .refine((value) => (value.NIF === undefined) !== (value.IDOtro === undefined), {
    message: 'Exactly one of NIF or IDOtro must be set on Contraparte',
  });

/** Inferred type of {@link ContraparteConsultaSchema}. */
export type ContraparteConsulta = z.infer<typeof ContraparteConsultaSchema>;

/**
 * `RangoFechaExpedicion` — inclusive issue-date range.
 */
export const RangoFechaExpedicionSchema = z.object({
  Desde: FechaDdMmYyyySchema.optional(),
  Hasta: FechaDdMmYyyySchema.optional(),
});

/** Inferred type of {@link RangoFechaExpedicionSchema}. */
export type RangoFechaExpedicion = z.infer<typeof RangoFechaExpedicionSchema>;

/**
 * `FechaExpedicionConsulta` — either a single date or a date range.
 */
export const FechaExpedicionConsultaSchema = z
  .object({
    FechaExpedicionFactura: FechaDdMmYyyySchema.optional(),
    RangoFechaExpedicion: RangoFechaExpedicionSchema.optional(),
  })
  .refine(
    (value) =>
      (value.FechaExpedicionFactura === undefined) !== (value.RangoFechaExpedicion === undefined),
    {
      message: 'Exactly one of FechaExpedicionFactura or RangoFechaExpedicion must be set',
    },
  );

/** Inferred type of {@link FechaExpedicionConsultaSchema}. */
export type FechaExpedicionConsulta = z.infer<typeof FechaExpedicionConsultaSchema>;

/**
 * `SistemaInformaticoConsulta` — filter sub-block on the producing SIF.
 *
 * Same shape as `SistemaInformaticoType` but every field except
 * `IdSistemaInformatico` and `NumeroInstalacion` is optional, matching
 * `SistemaInformaticoConsultaType` in the XSD.
 */
export const SistemaInformaticoConsultaSchema = z
  .object({
    NombreRazon: NombreRazonSchema,
    NIF: NifSchema.optional(),
    IDOtro: IdOtroSchema.optional(),
    NombreSistemaInformatico: z.string().min(1).max(30).optional(),
    IdSistemaInformatico: IdSistemaInformaticoSchema,
    Version: z.string().min(1).max(50).optional(),
    NumeroInstalacion: z.string().min(1).max(100),
    TipoUsoPosibleSoloVerifactu: SiNoSchema.optional(),
    TipoUsoPosibleMultiOT: SiNoSchema.optional(),
    IndicadorMultiplesOT: SiNoSchema.optional(),
  })
  .refine((value) => (value.NIF === undefined) !== (value.IDOtro === undefined), {
    message: 'Exactly one of NIF or IDOtro must be set on SistemaInformaticoConsulta',
  });

/** Inferred type of {@link SistemaInformaticoConsultaSchema}. */
export type SistemaInformaticoConsulta = z.infer<typeof SistemaInformaticoConsultaSchema>;

/**
 * `ClavePaginacion` — pagination cursor referring to the last record received.
 *
 * Reuses the {@link './common'.IdFactura} structure for paging.
 */
export const ClavePaginacionSchema = z.object({
  IDEmisorFactura: NifSchema,
  NumSerieFactura: NumSerieFacturaSchema,
  FechaExpedicionFactura: FechaDdMmYyyySchema,
});

/** Inferred type of {@link ClavePaginacionSchema}. */
export type ClavePaginacion = z.infer<typeof ClavePaginacionSchema>;

/**
 * `DatosAdicionalesRespuesta` — flags controlling extra response fields.
 */
export const DatosAdicionalesRespuestaSchema = z.object({
  MostrarNombreRazonEmisor: SiNoSchema.optional(),
  MostrarSistemaInformatico: SiNoSchema.optional(),
});

/** Inferred type of {@link DatosAdicionalesRespuestaSchema}. */
export type DatosAdicionalesRespuesta = z.infer<typeof DatosAdicionalesRespuestaSchema>;

/**
 * `CabeceraConsulta` — query header (`CabeceraConsultaSf`).
 *
 * Exactly one of `ObligadoEmision` (issuer) or `Destinatario` (recipient) is
 * filled in. `IndicadorRepresentante` may be `"S"` only when the obligated
 * party is set — that cross-field rule is enforced in `validators/`.
 */
export const CabeceraConsultaSchema = z
  .object({
    IDVersion: IdVersionSchema,
    ObligadoEmision: PersonaFisicaJuridicaESSchema.optional(),
    Destinatario: PersonaFisicaJuridicaESSchema.optional(),
    IndicadorRepresentante: z.literal('S').optional(),
  })
  .refine((value) => (value.ObligadoEmision === undefined) !== (value.Destinatario === undefined), {
    message: 'Exactly one of ObligadoEmision or Destinatario must be set',
  });

/** Inferred type of {@link CabeceraConsultaSchema}. */
export type CabeceraConsulta = z.infer<typeof CabeceraConsultaSchema>;

/**
 * `FiltroConsulta` — filter portion of a `ConsultaFactuSistemaFacturacion`.
 */
export const FiltroConsultaSchema = z.object({
  PeriodoImputacion: PeriodoImputacionSchema,
  NumSerieFactura: NumSerieFacturaSchema.optional(),
  Contraparte: ContraparteConsultaSchema.optional(),
  FechaExpedicionFactura: FechaExpedicionConsultaSchema.optional(),
  SistemaInformatico: SistemaInformaticoConsultaSchema.optional(),
  RefExterna: RefExternaSchema.optional(),
  ClavePaginacion: ClavePaginacionSchema.optional(),
});

/** Inferred type of {@link FiltroConsultaSchema}. */
export type FiltroConsulta = z.infer<typeof FiltroConsultaSchema>;

/**
 * `ConsultaFactuSistemaFacturacion` — full query payload.
 */
export const ConsultaFactuSchema = z.object({
  Cabecera: CabeceraConsultaSchema,
  FiltroConsulta: FiltroConsultaSchema,
  DatosAdicionalesRespuesta: DatosAdicionalesRespuestaSchema.optional(),
});

/** Inferred type of {@link ConsultaFactuSchema}. */
export type ConsultaFactu = z.infer<typeof ConsultaFactuSchema>;
