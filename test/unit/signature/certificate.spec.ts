/**
 * Unit tests for `src/signature/certificate.ts`.
 *
 * Generates a fresh self-signed RSA certificate at runtime, serialises it to
 * PEM, and round-trips through `loadCertificate` to ensure the public-key,
 * private-key and certificate-chain shapes are recovered correctly.
 */

import { describe, expect, test } from 'bun:test';
import { X509Certificate } from 'node:crypto';
import { loadCertificate } from '../../../src/signature/certificate.ts';
import { generateSelfSignedCert } from '../../fixtures/certs/generate.ts';

describe('loadCertificate — PEM key+cert input', () => {
  test('round-trips a self-signed PEM bundle to a parsed certificate + private key', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Round Trip CN');

    const loaded = loadCertificate({ cert: certPem, key: keyPem });

    expect(loaded.certificate).toBeInstanceOf(X509Certificate);
    expect(loaded.certificate.subject).toContain('Round Trip CN');
    expect(loaded.certChain).toHaveLength(1);
    expect(loaded.certChain[0]).toBe(loaded.certificate);
    expect(loaded.privateKey.type).toBe('private');
    expect(loaded.privateKey.asymmetricKeyType).toBe('rsa');
    expect(loaded.certificate.checkPrivateKey(loaded.privateKey)).toBe(true);
  });

  test('accepts Uint8Array inputs (UTF-8 bytes of the PEM blocks)', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Bytes CN');

    const loaded = loadCertificate({
      cert: new TextEncoder().encode(certPem),
      key: new TextEncoder().encode(keyPem),
    });

    expect(loaded.certificate.subject).toContain('Bytes CN');
    expect(loaded.certificate.checkPrivateKey(loaded.privateKey)).toBe(true);
  });

  test('parses a concatenated PEM chain into multiple X509Certificate entries', async () => {
    const a = await generateSelfSignedCert('Leaf CN');
    const b = await generateSelfSignedCert('Issuer CN');

    const loaded = loadCertificate({
      cert: `${a.certPem}${b.certPem}`,
      key: a.keyPem,
    });

    expect(loaded.certChain).toHaveLength(2);
    expect(loaded.certificate.subject).toContain('Leaf CN');
    expect(loaded.certChain[1]?.subject).toContain('Issuer CN');
  });
});

describe('loadCertificate — invalid inputs', () => {
  test('throws when the cert input contains no PEM blocks', async () => {
    const { keyPem } = await generateSelfSignedCert('No Cert CN');

    expect(() => loadCertificate({ cert: 'not a certificate', key: keyPem })).toThrow();
  });
});
