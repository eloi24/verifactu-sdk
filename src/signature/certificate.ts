/**
 * Certificate loading helpers for VERI*FACTU XAdES-BES signing.
 *
 * Parses both PEM (separate certificate and private key) and PKCS#12 (`.pfx`
 * / `.p12`) inputs into a normalised {@link LoadedCertificate} shape consumed
 * by `signRegistro`. PKCS#12 extraction goes through `tls.createSecureContext`
 * — Node's only built-in PKCS#12 parser — and additional certificates in the
 * bag are surfaced through {@link LoadedCertificate.certChain}.
 *
 * @module
 */

import { Buffer } from 'node:buffer';
import { X509Certificate, createPrivateKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { createSecureContext } from 'node:tls';

/**
 * PKCS#12-encoded certificate input (a `.pfx` or `.p12` bag).
 */
export interface Pkcs12Input {
  /** Raw bytes of the PKCS#12 container. */
  pfx: Uint8Array | Buffer;
  /** Passphrase protecting the container. Omit if the bag is unencrypted. */
  passphrase?: string;
}

/**
 * Separate PEM/DER key + certificate input.
 */
export interface KeyCertInput {
  /** Private key in PEM or DER form. */
  key: string | Uint8Array;
  /**
   * X.509 certificate(s) in PEM form. May contain the signer certificate alone
   * or the full chain concatenated; DER is accepted as a single certificate.
   */
  cert: string | Uint8Array;
  /** Optional passphrase used to decrypt {@link key} when it is encrypted. */
  passphrase?: string;
}

/**
 * Input accepted by {@link loadCertificate}: PKCS#12 or key+cert PEM/DER.
 */
export type CertificateInput = Pkcs12Input | KeyCertInput;

/**
 * Normalised, parsed result of {@link loadCertificate}.
 *
 * `certificate` is the signer leaf, `certChain` is the full ordered chain
 * (leaf first, then issuers) — the leaf may be the only element. `privateKey`
 * is a `KeyObject` so it can be re-exported in any format the signing layer
 * needs.
 */
export interface LoadedCertificate {
  /** Signer (leaf) certificate. */
  certificate: X509Certificate;
  /** Signer's private key as an unwrapped `KeyObject`. */
  privateKey: KeyObject;
  /** Full ordered certificate chain (leaf first); always at least one entry. */
  certChain: X509Certificate[];
}

/**
 * Discriminator: detects which input shape was passed.
 *
 * @internal
 */
function isPkcs12Input(input: CertificateInput): input is Pkcs12Input {
  return 'pfx' in input;
}

/**
 * Split a multi-cert PEM blob into individual PEM-encoded certificates.
 *
 * Certificates are concatenated by tools such as `openssl pkcs12 -clcerts` in
 * the order leaf → intermediates → root. This helper preserves that order.
 *
 * @internal
 */
function splitPemCertificates(pem: string): string[] {
  const blocks: string[] = [];
  const regex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu;
  for (const match of pem.matchAll(regex)) {
    blocks.push(match[0]);
  }
  return blocks;
}

/**
 * Build the {@link LoadedCertificate} from a list of PEM cert blocks and a key.
 *
 * @internal
 */
function buildLoadedCertificate(certPems: string[], privateKey: KeyObject): LoadedCertificate {
  if (certPems.length === 0) {
    throw new Error('loadCertificate: no certificates found in the input');
  }
  const certChain = certPems.map((pem) => new X509Certificate(pem));
  // Non-null assertion is safe because we just verified length > 0.
  // biome-ignore lint/style/noNonNullAssertion: length checked above
  const certificate = certChain[0]!;
  return { certificate, privateKey, certChain };
}

/**
 * Parse a key+cert pair. Accepts PEM (string or Uint8Array of UTF-8 bytes) or
 * DER (Uint8Array of binary bytes).
 *
 * @internal
 */
function loadKeyCert(input: KeyCertInput): LoadedCertificate {
  const certBytes = input.cert;
  const certPems: string[] =
    typeof certBytes === 'string'
      ? splitPemCertificates(certBytes)
      : (() => {
          const asText = new TextDecoder('utf-8', { fatal: false }).decode(certBytes);
          if (asText.includes('-----BEGIN CERTIFICATE-----')) {
            return splitPemCertificates(asText);
          }
          // Treat as a single DER certificate.
          const certificate = new X509Certificate(certBytes);
          return [certificate.toString()];
        })();

  const keyMaterial: string | Buffer =
    typeof input.key === 'string' ? input.key : Buffer.from(input.key);
  const privateKey = createPrivateKey(
    typeof input.passphrase === 'string'
      ? { key: keyMaterial, passphrase: input.passphrase }
      : keyMaterial,
  );

  return buildLoadedCertificate(certPems, privateKey);
}

/**
 * Parse a PKCS#12 bag through `tls.createSecureContext`, the only built-in
 * Node API able to decrypt a `.pfx`.
 *
 * The secure context normalises the bag to PEM internally; we read back the
 * decoded certificates and key from the per-context options object.
 *
 * @internal
 */
function loadPkcs12(input: Pkcs12Input): LoadedCertificate {
  const ctx = createSecureContext({
    pfx: Buffer.isBuffer(input.pfx) ? input.pfx : Buffer.from(input.pfx),
    ...(input.passphrase === undefined ? {} : { passphrase: input.passphrase }),
  });

  const ctxAny = ctx.context as unknown as {
    getCertificate?: () => Buffer | null;
    getIssuerCertificate?: (cert?: unknown) => unknown;
    getPrivateKey?: () => Buffer | null;
  };

  const leafDer = typeof ctxAny.getCertificate === 'function' ? ctxAny.getCertificate() : null;
  const keyBuf = typeof ctxAny.getPrivateKey === 'function' ? ctxAny.getPrivateKey() : null;

  if (leafDer === null || keyBuf === null) {
    throw new Error(
      'loadCertificate: PKCS#12 bag did not yield a certificate and private key — ' +
        'check the bag contents and passphrase',
    );
  }

  const certChain: X509Certificate[] = [new X509Certificate(leafDer)];
  if (typeof ctxAny.getIssuerCertificate === 'function') {
    let current = ctxAny.getIssuerCertificate(undefined);
    const seen = new Set<string>();
    while (current !== null && current !== undefined) {
      const currentRecord = current as { raw?: Buffer | Uint8Array };
      if (currentRecord.raw === undefined) {
        break;
      }
      const raw = currentRecord.raw;
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      const fingerprint = buf.toString('base64');
      if (seen.has(fingerprint)) {
        break;
      }
      seen.add(fingerprint);
      certChain.push(new X509Certificate(buf));
      current = ctxAny.getIssuerCertificate(current);
    }
  }

  const privateKey = createPrivateKey({ key: keyBuf, format: 'der', type: 'pkcs8' });

  if (certChain.length === 0) {
    throw new Error('loadCertificate: PKCS#12 bag has no certificate');
  }

  // biome-ignore lint/style/noNonNullAssertion: length checked above
  const certificate = certChain[0]!;
  return { certificate, privateKey, certChain };
}

/**
 * Load a signer certificate and its private key from PKCS#12 or PEM input.
 *
 * Validates that the resulting chain is non-empty. The returned
 * {@link LoadedCertificate} can be passed directly to the signing layer.
 *
 * @param input - Either a PKCS#12 bag or a `(key, cert)` pair.
 * @returns The parsed certificate, key and chain.
 * @throws {Error} When parsing fails or no certificate is present in the input.
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises';
 * const pfx = await readFile('./signer.pfx');
 * const loaded = loadCertificate({ pfx, passphrase: process.env.PFX_PASS });
 * ```
 * @example
 * ```ts
 * const loaded = loadCertificate({
 *   key: await readFile('./signer.key', 'utf8'),
 *   cert: await readFile('./signer.crt', 'utf8'),
 * });
 * ```
 */
export function loadCertificate(input: CertificateInput): LoadedCertificate {
  if (isPkcs12Input(input)) {
    return loadPkcs12(input);
  }
  return loadKeyCert(input);
}
