/**
 * Barrel module re-exporting the QR-code public surface.
 *
 * Consumers import from `'verifactu-sdk/qr'` (mapped via `package.json#exports`),
 * which resolves to this file.
 *
 * @module
 */

export { buildQrUrl, QrUrlInputError } from './buildUrl.js';
export type { BuildQrUrlInput, QrEnvironment, QrLanguage, QrMode } from './buildUrl.js';
export { renderQrDataUrl, renderQrPng, renderQrSvg } from './render.js';
export type { RenderQrOptions } from './render.js';
