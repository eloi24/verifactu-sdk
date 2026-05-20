/**
 * Constants for the AEAT XML namespaces and prefixes used across the SDK.
 *
 * The namespace URIs are taken verbatim from the WSDL published at
 * `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl`
 * and the AEAT XSD set under `schemas-aeat/`. The values are required to match
 * byte-for-byte so the AEAT validator accepts the envelope.
 *
 * @module
 */

/**
 * SOAP 1.1 envelope namespace URI.
 */
export const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/' as const;

/**
 * AEAT `SuministroLR` namespace — top-level wrapper elements
 * (`RegFactuSistemaFacturacion`, `RegistroFactura`).
 */
export const SUMINISTRO_LR_NS =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd' as const;

/**
 * AEAT `SuministroInformacion` namespace — record-level types
 * (`Cabecera`, `RegistroAlta`, `RegistroAnulacion`, …).
 */
export const SUMINISTRO_INFO_NS =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd' as const;

/**
 * AEAT `ConsultaLR` namespace — query request wrapper.
 */
export const CONSULTA_LR_NS =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/ConsultaLR.xsd' as const;

/**
 * AEAT `RespuestaSuministro` namespace — registration response wrapper.
 */
export const RESPUESTA_SUMINISTRO_NS =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaSuministro.xsd' as const;

/**
 * AEAT `RespuestaConsultaLR` namespace — query response wrapper.
 */
export const RESPUESTA_CONSULTA_LR_NS =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaConsultaLR.xsd' as const;

/**
 * XAdES `xmldsig` namespace — used by the on-request signature path.
 */
export const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#' as const;

/**
 * Canonical prefix bound to {@link SOAP_ENV_NS} in builder output.
 */
export const SOAP_ENV_PREFIX = 'soapenv' as const;

/**
 * Canonical prefix bound to {@link SUMINISTRO_LR_NS} in builder output.
 *
 * `sum` is the same prefix used by the sample envelopes in §9 of the SWeb PDF.
 */
export const SUMINISTRO_LR_PREFIX = 'sum' as const;

/**
 * Canonical prefix bound to {@link SUMINISTRO_INFO_NS} in builder output.
 *
 * `sum1` is the same prefix used by the sample envelopes in §9 of the SWeb PDF.
 */
export const SUMINISTRO_INFO_PREFIX = 'sum1' as const;

/**
 * Canonical prefix bound to {@link CONSULTA_LR_NS} in builder output.
 */
export const CONSULTA_LR_PREFIX = 'con' as const;
