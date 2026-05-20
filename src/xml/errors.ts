/**
 * Backwards-compatible re-exports for the SOAP/XML layer error classes.
 *
 * Originally this module defined local stand-ins for `SoapFaultError` and
 * `NetworkError` while `src/errors/` was being built. Now that the unified
 * hierarchy in `src/errors/VerifactuError.ts` carries the SOAP-specific
 * properties (`faultcode`, `faultstring`, `status`, `body`, `retryable`), this
 * module is a thin re-export so that existing imports under `src/client/**`
 * and `src/xml/**` keep working with zero churn.
 *
 * @module
 */

export type { SoapFaultDetail } from '../errors/VerifactuError.js';
export { SoapFaultError, NetworkError } from '../errors/VerifactuError.js';
