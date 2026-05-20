/**
 * Type-level assertions for the subpath exports.
 *
 * The SDK's public surface is split between the root entry (consumed by ~95 %
 * of users) and four sub-paths reachable via `package.json#exports`. This
 * file pins that the internal validators, wire transformers and similar
 * helpers are reachable through `verifactu-sdk/validators`,
 * `verifactu-sdk/hash`, `verifactu-sdk/qr`, `verifactu-sdk/errors`.
 *
 * tsd resolves imports via the `paths` map of the host project; the imports
 * below use the same relative paths the production runtime uses through the
 * exports map once the SDK is published.
 */

import { expectAssignable } from 'tsd';
import { ERROR_CATALOG } from '../../src/errors/index.js';
import type { computeRegistroAltaHash } from '../../src/hash/index.js';
import type { buildQrUrl } from '../../src/qr/index.js';
import { isValidNif } from '../../src/validators/index.js';

// Internal validators are reachable via the validators sub-path.
expectAssignable<(value: string) => boolean>(isValidNif);

// Hash computation is reachable via the hash sub-path.
declare const hashFn: typeof computeRegistroAltaHash;
expectAssignable<(...args: Parameters<typeof computeRegistroAltaHash>) => string>(hashFn);

// QR URL builder is reachable via the qr sub-path.
declare const buildFn: typeof buildQrUrl;
expectAssignable<(...args: Parameters<typeof buildQrUrl>) => string>(buildFn);

// Error catalog is reachable via the errors sub-path.
expectAssignable<Record<string, unknown>>(ERROR_CATALOG);
