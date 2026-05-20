/**
 * Zod schema for `SistemaInformaticoType` — the billing-system descriptor.
 *
 * Mirrors the AEAT `SistemaInformaticoType` complexType from
 * `SuministroInformacion.xsd`. Every record (alta and anulación) carries this
 * block so the AEAT can identify the producer software that generated it.
 *
 * @module
 */

import { z } from 'zod';
import { IdOtroSchema, NifSchema, NombreRazonSchema, SiNoSchema } from './common.js';

/**
 * Two-character producer identifier `IdSistemaInformatico`.
 *
 * The validations document restricts the alphabet to ASCII uppercase letters
 * and digits, explicitly excluding `Ñ`. Lower-case and other Latin-1 letters
 * are rejected.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.5}
 */
export const IdSistemaInformaticoSchema = z
  .string()
  .regex(/^[A-Z0-9]{2}$/u, 'IdSistemaInformatico must be 2 uppercase A-Z or 0-9 characters');

/** Inferred type of {@link IdSistemaInformaticoSchema}. */
export type IdSistemaInformatico = z.infer<typeof IdSistemaInformaticoSchema>;

/**
 * `SistemaInformatico` — descriptor of the SIF that produced the record.
 *
 * One of `NIF` or `IDOtro` must be present (the XSD models this as a
 * `<choice>`). Business-rule constraints — e.g. that `IDType` may only be
 * `02`, `03` or `07` — live in `validators/businessRules.ts`.
 */
export const SistemaInformaticoSchema = z
  .object({
    NombreRazon: NombreRazonSchema,
    NIF: NifSchema.optional(),
    IDOtro: IdOtroSchema.optional(),
    NombreSistemaInformatico: z.string().min(1).max(30),
    IdSistemaInformatico: IdSistemaInformaticoSchema,
    Version: z.string().min(1).max(50),
    NumeroInstalacion: z.string().min(1).max(100),
    TipoUsoPosibleSoloVerifactu: SiNoSchema,
    TipoUsoPosibleMultiOT: SiNoSchema,
    IndicadorMultiplesOT: SiNoSchema,
  })
  .refine((value) => (value.NIF === undefined) !== (value.IDOtro === undefined), {
    message: 'Exactly one of NIF or IDOtro must be set on SistemaInformatico',
  });

/** Inferred type of {@link SistemaInformaticoSchema}. */
export type SistemaInformatico = z.infer<typeof SistemaInformaticoSchema>;
