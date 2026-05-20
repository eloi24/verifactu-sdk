/**
 * Unit tests for `src/signature/signXml.ts`.
 *
 * Signs a fixture XML with a freshly generated self-signed certificate and
 * verifies the produced signature is structurally well-formed (carries the
 * expected `ds:SignedInfo / ds:Reference`, `ds:SignatureValue` and
 * `ds:KeyInfo / ds:X509Data / ds:X509Certificate` elements with the right
 * algorithms) and verifies cryptographically against the embedded leaf.
 */

import { describe, expect, test } from 'bun:test';
import { loadCertificate } from '../../../src/signature/certificate.ts';
import { signRegistro, verifyRegistroSignature } from '../../../src/signature/signXml.ts';
import { generateSelfSignedCert } from '../../fixtures/certs/generate.ts';

const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<sum:RegFactuSistemaFacturacion xmlns:sum="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd" xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd">
  <sum:RegistroFactura>
    <sf:RegistroAlta>
      <sf:IDVersion>1.0</sf:IDVersion>
      <sf:IDFactura>
        <sf:IDEmisorFactura>89890001K</sf:IDEmisorFactura>
        <sf:NumSerieFactura>12345678/G33</sf:NumSerieFactura>
        <sf:FechaExpedicionFactura>01-01-2024</sf:FechaExpedicionFactura>
      </sf:IDFactura>
      <sf:Huella>3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60</sf:Huella>
    </sf:RegistroAlta>
  </sum:RegistroFactura>
</sum:RegFactuSistemaFacturacion>`;

describe('signRegistro — structural shape', () => {
  test('appends a ds:Signature with SHA-256 digest and RSA-SHA256 signing inside the target element', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Sign Test CN');
    const cert = loadCertificate({ cert: certPem, key: keyPem });

    const signed = await signRegistro(FIXTURE_XML, cert);

    // ds: signature is present.
    expect(signed).toMatch(/<ds:Signature[\s>]/u);
    // SignedInfo carries the SignatureMethod (RSA-SHA256).
    expect(signed).toMatch(/<ds:SignedInfo[\s>]/u);
    expect(signed).toMatch(/SignatureMethod[^>]*rsa-sha256"/u);
    // CanonicalizationMethod is present (the algorithm URI varies by xadesjs
    // defaults; what matters for the AEAT is the Reference transform list).
    expect(signed).toMatch(/<ds:CanonicalizationMethod[\s>]/u);
    // Reference carries the exclusive-c14n transform required by AEAT.
    expect(signed).toMatch(/Transform[^>]*xml-exc-c14n#"/u);
    expect(signed).toMatch(/<ds:Reference[\s>]/u);
    expect(signed).toMatch(/DigestMethod[^>]*xmlenc#sha256"/u);
    // SignatureValue is populated.
    expect(signed).toMatch(/<ds:SignatureValue[^>]*>[A-Za-z0-9+/=\s]+<\/ds:SignatureValue>/u);
    // KeyInfo/X509Data/X509Certificate is present and non-empty.
    expect(signed).toMatch(
      /<ds:KeyInfo[^>]*>[\s\S]*?<ds:X509Data[^>]*>[\s\S]*?<ds:X509Certificate[^>]*>[A-Za-z0-9+/=\s]+<\/ds:X509Certificate>/u,
    );
    // Signature is appended INSIDE the RegistroAlta element.
    expect(signed).toMatch(/<sf:RegistroAlta[\s\S]*<ds:Signature[\s\S]*<\/sf:RegistroAlta>/u);
  });

  test('produces a signature that verifies cryptographically against the embedded X509Certificate', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Verify CN');
    const cert = loadCertificate({ cert: certPem, key: keyPem });

    const signed = await signRegistro(FIXTURE_XML, cert);
    const verified = await verifyRegistroSignature(signed);

    expect(verified).toBe(true);
  });
});

describe('signRegistro — placement options', () => {
  test('falls back to the document root when the target element name is not found', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Fallback CN');
    const cert = loadCertificate({ cert: certPem, key: keyPem });

    const signed = await signRegistro(FIXTURE_XML, cert, {
      targetElementLocalName: 'DoesNotExist',
    });

    // Signature appears, but inside the outer envelope rather than the registro.
    expect(signed).toMatch(/<ds:Signature[\s>]/u);
    expect(signed).toMatch(/RegFactuSistemaFacturacion[\s\S]*<ds:Signature/u);
  });

  test('throws when no match exists and fallbackToRoot is explicitly disabled', async () => {
    const { certPem, keyPem } = await generateSelfSignedCert('Strict CN');
    const cert = loadCertificate({ cert: certPem, key: keyPem });

    await expect(
      signRegistro(FIXTURE_XML, cert, {
        targetElementLocalName: 'DoesNotExist',
        fallbackToRoot: false,
      }),
    ).rejects.toThrow(/DoesNotExist/u);
  });
});
