/**
 * Helpers to generate self-signed RSA test certificates at runtime.
 *
 * Used by the signature unit tests so the test suite does not depend on
 * pre-baked PEM material. The generated keypair is unique per test run; the
 * helpers expose both the raw `CryptoKey` objects and PEM-serialised forms
 * consumable by `loadCertificate`.
 */

import { Buffer } from 'node:buffer';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';

interface SelfSignedCertResult {
  /** Self-signed certificate in PEM form (single block). */
  certPem: string;
  /** Private key in PKCS#8 PEM form. */
  keyPem: string;
  /** Public key in DER form (useful for low-level verification checks). */
  publicKeyDer: ArrayBuffer;
}

/**
 * Format a DER buffer as a PEM block of the given label.
 */
function derToPem(label: string, der: ArrayBuffer): string {
  const base64 = Buffer.from(new Uint8Array(der)).toString('base64');
  const lines = base64.match(/.{1,64}/gu) ?? [base64];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

let engineRegistered = false;

/**
 * Wire pkijs to the global Web Crypto engine (Bun / Node ≥ 20).
 */
function ensureEngine(): void {
  if (engineRegistered) {
    return;
  }
  pkijs.setEngine(
    'verifactu-sdk-test',
    new pkijs.CryptoEngine({
      name: 'verifactu-sdk-test',
      crypto: globalThis.crypto,
      subtle: globalThis.crypto.subtle,
    }),
  );
  engineRegistered = true;
}

/**
 * Generate a fresh self-signed RSA-2048 certificate for testing.
 */
export async function generateSelfSignedCert(
  commonName = 'Verifactu Test Signer',
): Promise<SelfSignedCertResult> {
  ensureEngine();

  const keys = await globalThis.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );

  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: Date.now() });

  const nameAttribute = new pkijs.AttributeTypeAndValue({
    type: '2.5.4.3',
    value: new asn1js.Utf8String({ value: commonName }),
  });
  cert.issuer.typesAndValues.push(nameAttribute);
  cert.subject.typesAndValues.push(nameAttribute);

  cert.notBefore.value = new Date(Date.now() - 60_000);
  cert.notAfter.value = new Date(Date.now() + 365 * 24 * 3600 * 1000);

  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);
  await cert.sign(keys.privateKey, 'SHA-256');

  const certDer = cert.toSchema().toBER(false);
  const keyPkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', keys.privateKey);
  const publicKeyDer = await globalThis.crypto.subtle.exportKey('spki', keys.publicKey);

  return {
    certPem: derToPem('CERTIFICATE', certDer),
    keyPem: derToPem('PRIVATE KEY', keyPkcs8),
    publicKeyDer,
  };
}
