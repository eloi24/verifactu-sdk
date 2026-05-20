/**
 * Barrel module re-exporting every Zod schema and inferred type.
 *
 * Consumers of the SDK never import from individual files — they pull from
 * `'verifactu-sdk/schemas'` (mapped via `package.json#exports`) which resolves
 * here. The barrel is intentionally flat: every schema and its companion
 * `type` alias is re-exported with its original name.
 *
 * @module
 */

export * from './cabecera.js';
export * from './common.js';
export * from './consulta.js';
export * from './registroAlta.js';
export * from './registroAnulacion.js';
export * from './respuesta.js';
export * from './sistemaInformatico.js';
