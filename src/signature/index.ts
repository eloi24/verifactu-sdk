/**
 * Barrel module for the XAdES-BES signing subsystem.
 *
 * Re-exports the certificate loader and the registro-signing function used by
 * the on-request submission mode. Consumers should import from
 * `'verifactu-sdk/signature'` (mapped via `package.json#exports` once the
 * release artefact is built).
 *
 * @module
 */

export * from './certificate.js';
export * from './signXml.js';
