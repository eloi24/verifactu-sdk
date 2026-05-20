/**
 * Barrel module for the chained-hash subsystem.
 *
 * Re-exports the three `compute*Hash` functions plus the `linkChain` helper.
 * Consumers should import from `'verifactu-sdk/hash'` (mapped via
 * `package.json#exports`) rather than reaching into individual files.
 *
 * @module
 */

export * from './computeHash.js';
export * from './chain.js';
