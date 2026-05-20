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

import { SoapFaultError } from './VerifactuError.js';
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
 * @param faultString - Verbatim `faultstring` extracted from the SOAP fault.
 * @returns A fully-populated {@link SoapFaultError} instance.
 * @example
 * ```ts
 * const err = parseSoapFault('Codigo[4102]: schema mismatch');
 * err.code; // '4102'
 * err.category; // 'envelope'
 * ```
 */
export function parseSoapFault(faultString: string): SoapFaultError {
  const code = extractFaultCode(faultString);
  if (code === undefined) {
    return new SoapFaultError(faultString);
  }
  const entry = lookupError(code);
  if (entry === undefined) {
    return new SoapFaultError(faultString, { code });
  }
  return new SoapFaultError(entry.englishMessage, {
    code,
    category: entry.category,
  });
}
