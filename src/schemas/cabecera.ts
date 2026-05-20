/**
 * Zod schema for the AEAT `<Cabecera>` block.
 *
 * Mirrors `CabeceraType` from `SuministroInformacion.xsd`. The header carries
 * the issuer (`ObligadoEmision`), an optional representative, and one of two
 * mutually exclusive sub-blocks depending on the submission mode:
 *
 * - `RemisionVoluntaria` — VERI*FACTU voluntary submission.
 * - `RemisionRequerimiento` — submission under AEAT requirement.
 *
 * @module
 */

import { z } from 'zod';
import { PersonaFisicaJuridicaESSchema, SiNoSchema } from './common.js';

/**
 * `FechaFinVeriFactu` — date a taxpayer ceases VERI*FACTU adherence.
 *
 * The validations document constrains this field to dates `>= 01-01-2027`,
 * always with day `31` and month `12` (i.e. `31-12-20XX`). The Zod schema
 * applies the syntactic shape; the temporal range check is delegated to the
 * business-rules validator so the schema layer stays purely structural.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.1}
 */
export const FechaFinVeriFactuSchema = z
  .string()
  .regex(/^31-12-\d{4}$/u, 'FechaFinVeriFactu must use the format 31-12-YYYY');

/** Inferred type of {@link FechaFinVeriFactuSchema}. */
export type FechaFinVeriFactu = z.infer<typeof FechaFinVeriFactuSchema>;

/**
 * `RemisionVoluntaria` — sub-block of {@link CabeceraSchema} for VERI*FACTU.
 *
 * Both fields are optional in the XSD; the inner business rules dictate when
 * each must be present.
 */
export const RemisionVoluntariaSchema = z.object({
  FechaFinVeriFactu: FechaFinVeriFactuSchema.optional(),
  Incidencia: SiNoSchema.optional(),
});

/** Inferred type of {@link RemisionVoluntariaSchema}. */
export type RemisionVoluntaria = z.infer<typeof RemisionVoluntariaSchema>;

/**
 * `RemisionRequerimiento` — sub-block for submissions under AEAT requirement.
 *
 * `RefRequerimiento` is mandatory (the AEAT requirement reference, up to 18
 * chars). `FinRequerimiento` is an optional `S`/`N` flag indicating the final
 * submission of the requirement batch.
 */
export const RemisionRequerimientoSchema = z.object({
  RefRequerimiento: z.string().min(1).max(18),
  FinRequerimiento: SiNoSchema.optional(),
});

/** Inferred type of {@link RemisionRequerimientoSchema}. */
export type RemisionRequerimiento = z.infer<typeof RemisionRequerimientoSchema>;

/**
 * `Cabecera` — top-level header of a VERI*FACTU or on-request submission.
 *
 * Exactly one of {@link RemisionVoluntariaSchema} / {@link RemisionRequerimientoSchema}
 * must be present, enforced via a `refine`. The XSD does not formally declare
 * a `<choice>` between them but the validation document mandates that both
 * cannot coexist (a submission is either voluntary or under requirement).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §15.1}
 */
export const CabeceraSchema = z
  .object({
    ObligadoEmision: PersonaFisicaJuridicaESSchema,
    Representante: PersonaFisicaJuridicaESSchema.optional(),
    RemisionVoluntaria: RemisionVoluntariaSchema.optional(),
    RemisionRequerimiento: RemisionRequerimientoSchema.optional(),
  })
  .refine(
    (value) =>
      (value.RemisionVoluntaria === undefined) !== (value.RemisionRequerimiento === undefined),
    { message: 'Exactly one of RemisionVoluntaria or RemisionRequerimiento must be present' },
  );

/** Inferred type of {@link CabeceraSchema}. */
export type Cabecera = z.infer<typeof CabeceraSchema>;
