/**
 * Barrel for the wire-conversion module.
 *
 * Re-exports the bidirectional English↔Spanish transformers and the small
 * date helpers used by them.
 *
 * @module
 */

export * from './dates.js';
export * from './fromWire.js';
export * from './mapping.js';
export * from './toWire.js';
