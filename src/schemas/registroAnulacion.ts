/**
 * Zod schema for `RegistroFacturacionAnulacionType` — invoice cancellation.
 *
 * Mirrors the XSD complexType 1:1. The record cancels a previously registered
 * invoice; `GeneradoPor` plus `Generador` identify who emits the cancellation
 * when it isn't the original issuer.
 *
 * @module
 */

import { z } from 'zod';
import {
  FechaDdMmYyyySchema,
  FechaHoraHusoSchema,
  HuellaSchema,
  IdVersionSchema,
  NifSchema,
  NumSerieFacturaSchema,
  PersonaFisicaJuridicaSchema,
  RefExternaSchema,
  SiNoSchema,
  TipoHuellaSchema,
} from './common.js';
import { EncadenamientoSchema } from './registroAlta.js';
import { SistemaInformaticoSchema } from './sistemaInformatico.js';

/**
 * `IDFacturaAnulada` (`IDFacturaExpedidaBajaType`) — cancelled invoice id.
 *
 * The XSD names the children with the `Anulada` suffix to disambiguate them
 * from {@link './registroAlta'.IdFacturaSchema}; the wire mapper handles the
 * suffix when serialising.
 */
export const IdFacturaAnuladaSchema = z.object({
  IDEmisorFacturaAnulada: NifSchema,
  NumSerieFacturaAnulada: NumSerieFacturaSchema,
  FechaExpedicionFacturaAnulada: FechaDdMmYyyySchema,
});

/** Inferred type of {@link IdFacturaAnuladaSchema}. */
export type IdFacturaAnulada = z.infer<typeof IdFacturaAnuladaSchema>;

/**
 * `GeneradoPor` — who triggered the cancellation.
 *
 * - `E` — Expedidor (original invoice issuer)
 * - `D` — Destinatario (recipient, e.g. when the recipient self-bills)
 * - `T` — Tercero (third party authorised to issue)
 */
export const GeneradoPorSchema = z.enum(['E', 'D', 'T']);

/** Inferred type of {@link GeneradoPorSchema}. */
export type GeneradoPor = z.infer<typeof GeneradoPorSchema>;

/**
 * `RegistroAnulacion` — full cancellation record.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.4}
 */
export const RegistroAnulacionSchema = z.object({
  IDVersion: IdVersionSchema,
  IDFactura: IdFacturaAnuladaSchema,
  RefExterna: RefExternaSchema.optional(),
  SinRegistroPrevio: SiNoSchema.optional(),
  RechazoPrevio: SiNoSchema.optional(),
  GeneradoPor: GeneradoPorSchema.optional(),
  Generador: PersonaFisicaJuridicaSchema.optional(),
  Encadenamiento: EncadenamientoSchema,
  SistemaInformatico: SistemaInformaticoSchema,
  FechaHoraHusoGenRegistro: FechaHoraHusoSchema,
  TipoHuella: TipoHuellaSchema,
  Huella: HuellaSchema,
});

/** Inferred type of {@link RegistroAnulacionSchema}. */
export type RegistroAnulacion = z.infer<typeof RegistroAnulacionSchema>;
