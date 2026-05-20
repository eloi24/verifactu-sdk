/**
 * Barrel for the XML layer (builder, parser, canonicaliser, error helpers).
 *
 * Re-exports every public symbol from {@link ./builder.js}, {@link ./parser.js},
 * {@link ./canonical.js} and {@link ./namespaces.js}. The protocol layer pulls
 * from this barrel to avoid reaching into individual files.
 *
 * @module
 */

export * from './builder.js';
export * from './canonical.js';
export * from './errors.js';
export * from './namespaces.js';
export * from './parser.js';
