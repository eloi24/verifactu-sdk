/**
 * AEAT SOAP endpoint URLs.
 *
 * Sourced from the WSDL published at
 * `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl`.
 * The AEAT publishes four URL families:
 *
 * - `…/VerifactuSOAP` — voluntary mode (alta, anulación, consulta).
 * - `…/RequerimientoSOAP` — on-request mode.
 *
 * Each family has a regular and a "sello" (electronic seal) variant, and a
 * pre-production (`prewww*`) and a production (`www*`) deployment.
 *
 * @module
 */

/**
 * Operation modes supported by the AEAT.
 */
export type Mode = 'verifactu' | 'onRequest';

/**
 * Deployment environments published by the AEAT.
 */
export type Environment = 'production' | 'preproduction';

/**
 * Map of fully-qualified endpoint URLs.
 *
 * Indexed first by {@link Mode}, then by {@link Environment}, then by whether
 * the caller authenticates with a sello (electronic seal) certificate.
 */
export const ENDPOINTS = {
  verifactu: {
    production: {
      regular:
        'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
      sello:
        'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    },
    preproduction: {
      regular: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
      sello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    },
  },
  onRequest: {
    production: {
      regular:
        'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
      sello:
        'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    },
    preproduction: {
      regular: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
      sello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    },
  },
} as const;

/**
 * Options understood by {@link resolveEndpoint}.
 */
export interface ResolveEndpointOptions {
  /** Submission mode — voluntary or on-request. */
  mode: Mode;
  /** Production or pre-production deployment. */
  environment: Environment;
  /**
   * Whether the caller authenticates with a "sello" (electronic seal)
   * certificate. The AEAT uses different host pools for seal certificates,
   * hence the separate URL family.
   */
  withSeal?: boolean;
}

/**
 * Look up the AEAT endpoint URL matching the given combination of options.
 *
 * @param options - Mode, environment and seal flag.
 * @returns The fully-qualified `https://…` URL.
 * @example
 * ```ts
 * resolveEndpoint({ mode: 'verifactu', environment: 'preproduction' });
 * // → 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP'
 * ```
 */
export function resolveEndpoint(options: ResolveEndpointOptions): string {
  const seal = options.withSeal ?? false;
  const variant = seal ? 'sello' : 'regular';
  return ENDPOINTS[options.mode][options.environment][variant];
}
