/**
 * Parser for AEAT SOAP `faultstring` payloads.
 *
 * The AEAT publishes envelope-level failures as a SOAP fault whose `faultstring`
 * embeds the AEAT error code using the format `Codigo[XXXX]`. This module
 * extracts the code and turns the string into a fully-populated
 * {@link SoapFaultError} bearing the catalog metadata.
 *
 * @module
 */

import {
  type SoapFaultDetail,
  SoapFaultError,
  type SoapFaultErrorOptions,
} from './VerifactuError.js';
import { lookupError } from './catalog.js';

/**
 * Regular expression that captures the AEAT code embedded in a faultstring.
 *
 * Matches both lower-cased and capitalised variants of the prefix to be
 * resilient to upstream formatting changes.
 */
const FAULT_CODE_RE = /codigo\[(?<code>\d{3,4})\]/iu;

/**
 * Extract the AEAT error code from a `faultstring` payload.
 *
 * @param faultString - The verbatim content of the SOAP `faultstring`.
 * @returns The captured code (e.g. `'4102'`) or `undefined` when not found.
 * @example
 * ```ts
 * extractFaultCode('Codigo[4102]: schema mismatch'); // '4102'
 * extractFaultCode('unrelated text'); // undefined
 * ```
 */
export function extractFaultCode(faultString: string): string | undefined {
  const match = FAULT_CODE_RE.exec(faultString);
  return match?.groups?.code;
}

/**
 * Parse a SOAP `faultstring` and build a populated {@link SoapFaultError}.
 *
 * When the embedded code maps to a {@link ERROR_CATALOG} entry the returned
 * error carries `code`, `category` and a useful `message` (the English
 * translation). Otherwise the original `faultString` is preserved verbatim.
 *
 * @param fault - Verbatim `faultstring` extracted from the SOAP fault, or the
 *   whole fault block, whose fields are then copied onto the error.
 * @returns A fully-populated {@link SoapFaultError} instance.
 * @example
 * ```ts
 * const err = parseSoapFault('Codigo[4102]: schema mismatch');
 * err.code; // '4102'
 * err.category; // 'envelope'
 * ```
 */
export function parseSoapFault(fault: string | SoapFaultDetail): SoapFaultError {
  const faultString = typeof fault === 'string' ? fault : fault.faultstring;
  const soap: SoapFaultErrorOptions = typeof fault === 'string' ? {} : fault;
  const code = extractFaultCode(faultString);
  if (code === undefined) {
    return new SoapFaultError(faultString, soap);
  }
  const entry = lookupError(code);
  if (entry === undefined) {
    return new SoapFaultError(faultString, { ...soap, code });
  }
  return new SoapFaultError(entry.englishMessage, {
    ...soap,
    code,
    category: entry.category,
  });
}
