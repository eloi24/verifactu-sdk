/**
 * Barrel module re-exporting every public symbol from the `errors/` layer.
 *
 * The published `verifactu-sdk/errors` entry-point resolves here via
 * `package.json#exports`, exposing the error hierarchy, the AEAT catalog and
 * the SOAP-fault parser.
 *
 * @module
 */

export * from './catalog.js';
export * from './parseSoapFault.js';
export * from './VerifactuError.js';
