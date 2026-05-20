/**
 * Enveloped XML-DSig signature implementation for VERI*FACTU records.
 *
 * Used only by the on-request submission mode (modo "No VERI*FACTU"). The
 * signature is wrapped inside the registro element following the AEAT shape
 * documented in the validations PDF §3.2; algorithms are fixed to:
 *
 *   - Canonicalization: Exclusive C14N (`http://www.w3.org/2001/10/xml-exc-c14n#`)
 *   - Digest: SHA-256
 *   - Signature: RSA-SHA256 (`RSASSA-PKCS1-v1_5` with SHA-256)
 *   - KeyInfo: `X509Data/X509Certificate` carrying the signer leaf (and the
 *     remainder of the chain when {@link SignRegistroOptions.includeFullChain}
 *     is set).
 *
 * The output is a W3C XML-DSig enveloped signature — the structural baseline
 * required by the AEAT validators. Promoting to a XAdES-BES profile (adding
 * `SignedProperties` with `SigningTime` and `SigningCertificate`) is a future
 * enhancement; the current xadesjs+xmldsigjs combo has a known issue with
 * canonicalising the `SignedProperties` reference across namespace contexts.
 *
 * @module
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.2}
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { setNodeDependencies } from 'xadesjs';
import { Application, Parse, SignedXml } from 'xmldsigjs';
import type { LoadedCertificate } from './certificate.js';

let engineConfigured = false;

/**
 * Wire xadesjs to a webcrypto engine on first use.
 *
 * Bun and Node ≥ 20 both expose a global `crypto` with a `subtle` interface
 * conforming to the Web Crypto specification; we use it as the engine. The
 * configuration is idempotent — repeated calls are no-ops.
 *
 * @internal
 */
function ensureEngine(): void {
  if (engineConfigured) {
    return;
  }
  const subtleCrypto = globalThis.crypto;
  if (subtleCrypto === undefined || subtleCrypto.subtle === undefined) {
    throw new Error(
      'signRegistro: global crypto with SubtleCrypto is required (Bun ≥ 1.0 or Node ≥ 20)',
    );
  }
  Application.setEngine('verifactu-sdk', subtleCrypto);
  setNodeDependencies({
    DOMParser: DOMParser as unknown as typeof globalThis.DOMParser,
    XMLSerializer: XMLSerializer as unknown as typeof globalThis.XMLSerializer,
  });
  engineConfigured = true;
}

/**
 * DER bytes of a certificate, base64-encoded (the form `<X509Certificate>`
 * expects on the wire).
 *
 * @internal
 */
function certToBase64Der(cert: { raw: Buffer }): string {
  return cert.raw.toString('base64');
}

/**
 * Re-import a Node `KeyObject` as a Web Crypto `CryptoKey` for RSA-SHA256
 * signing.
 *
 * @internal
 */
async function toCryptoKey(loaded: LoadedCertificate): Promise<CryptoKey> {
  const pkcs8 = loaded.privateKey.export({ format: 'der', type: 'pkcs8' });
  return globalThis.crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/**
 * Options controlling how the XML-DSig signature is built and where it is
 * placed inside the input document.
 */
export interface SignRegistroOptions {
  /**
   * Local name of the element the signature should be appended inside. When
   * the request payload contains multiple records the caller picks the right
   * one with this. Defaults to `'RegistroAlta'`.
   */
  targetElementLocalName?: string;
  /**
   * Local name of the *root* element when no `targetElementLocalName` match is
   * found. Used as a fallback so the implementation does not silently produce
   * an unsigned document. Defaults to the document root.
   */
  fallbackToRoot?: boolean;
  /**
   * When `true` the full {@link LoadedCertificate.certChain} is included in
   * `KeyInfo/X509Data`; otherwise only the leaf. Defaults to `false`.
   */
  includeFullChain?: boolean;
  /**
   * Optional signing-time override, used by tests for deterministic output.
   * When omitted the current wall-clock time is used.
   */
  signingTime?: Date;
}

/**
 * Locate the element the signature should be appended inside.
 *
 * Walks the document tree looking for the first element whose `localName`
 * matches `targetElementLocalName`. Falls back to the document root when
 * either no target name was supplied or `fallbackToRoot` is set.
 *
 * @internal
 */
function pickSignatureTarget(document: Document, options: SignRegistroOptions): Element {
  const target = options.targetElementLocalName ?? 'RegistroAlta';
  const elements = document.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements.item(i);
    if (el !== null && el.localName === target) {
      return el;
    }
  }
  if (options.fallbackToRoot === false) {
    throw new Error(`signRegistro: no <${target}> element found in the input document`);
  }
  const root = document.documentElement;
  if (root === null) {
    throw new Error('signRegistro: input document has no root element');
  }
  return root;
}

/**
 * Build a stable random ID for the signed element so the `Reference` can
 * point at it. Twelve random hex characters is enough to avoid collisions
 * within a single submission envelope.
 *
 * @internal
 */
function randomId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Produce an enveloped XML-DSig signature for a VERI*FACTU registro element.
 *
 * The function does not mutate `xml`; the returned string is a fresh
 * serialisation of the original document with the signature appended inside
 * the target registro element. Algorithms are fixed (Exclusive C14N on both
 * `SignedInfo` and the referenced subtree, SHA-256 digest, RSA-SHA256 signing,
 * `X509Data` KeyInfo) because the AEAT validations enforce them.
 *
 * Internally the registro is detached to a standalone document for signing
 * and then transplanted back into the outer envelope; this isolates the
 * cryptographic computation from inherited namespace declarations on the
 * outer envelope and keeps the signature verifiable after a round-trip.
 *
 * @param xml - XML to sign. Must be a well-formed document.
 * @param cert - Signer credentials produced by `loadCertificate`.
 * @param options - Optional placement and KeyInfo controls.
 * @returns The original XML augmented with a `<ds:Signature>` element placed
 *   inside the target registro element.
 * @throws {Error} If the document is malformed, the signature target cannot
 *   be located, or the crypto engine is unavailable.
 * @example
 * ```ts
 * const signed = await signRegistro(xml, loadCertificate({ pfx, passphrase }));
 * ```
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.2}
 */
export async function signRegistro(
  xml: string,
  cert: LoadedCertificate,
  options: SignRegistroOptions = {},
): Promise<string> {
  ensureEngine();

  const outerDocument = Parse(xml);
  const outerTarget = pickSignatureTarget(outerDocument as unknown as Document, options);

  // The target subtree is serialised to a *standalone* document before
  // signing. This avoids the well-known XMLDSig namespace pitfall where the
  // canonicalised SignedInfo or referenced subtree differs between sign-time
  // (the element exists detached) and verify-time (the element lives inside
  // a document tree that contributes inherited namespace declarations).
  // Serialising round-trips all namespace declarations onto the subtree root
  // so both sign and verify see exactly the same canonical bytes.
  const targetXml = new XMLSerializer().serializeToString(
    outerTarget as unknown as Parameters<XMLSerializer['serializeToString']>[0],
  );
  const standaloneDoc = new DOMParser().parseFromString(targetXml, 'text/xml');
  const target = standaloneDoc.documentElement;
  if (target === null) {
    throw new Error('signRegistro: failed to detach the registro subtree for signing');
  }

  // Reference the target by Id so verification does not depend on the entire
  // outer envelope round-tripping byte-for-byte. If the caller did not supply
  // an Id we mint one in the same namespace.
  let targetId = target.getAttribute('Id') ?? '';
  if (targetId === '') {
    targetId = `verifactu-registro-${randomId()}`;
    target.setAttribute('Id', targetId);
  }

  const signer = new SignedXml(standaloneDoc as unknown as Document);
  // Force Exclusive C14N on the SignedInfo block. xmldsigjs defaults to
  // inclusive c14n, which embeds inherited namespace declarations and so
  // produces a different canonical form depending on where in the document
  // tree the Signature lives. exc-c14n makes the canonical form independent
  // of inherited namespaces, which is required for the signature to verify
  // after the registro is transplanted back into the outer envelope.
  signer.XmlSignature.SignedInfo.CanonicalizationMethod.Algorithm =
    'http://www.w3.org/2001/10/xml-exc-c14n#';
  const cryptoKey = await toCryptoKey(cert);

  const x509List =
    options.includeFullChain === true
      ? cert.certChain.map((c) => certToBase64Der(c as unknown as { raw: Buffer }))
      : [certToBase64Der(cert.certificate as unknown as { raw: Buffer })];

  const signature = await signer.Sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    target as unknown as Element,
    {
      references: [
        {
          uri: `#${targetId}`,
          hash: 'SHA-256',
          transforms: ['enveloped', 'exc-c14n'],
        },
      ],
      x509: x509List,
      ...(options.signingTime === undefined ? {} : { signingTime: { value: options.signingTime } }),
    },
  );

  const signatureNode = signature.GetXml();
  if (signatureNode === null) {
    throw new Error('signRegistro: xadesjs returned an empty signature element');
  }

  // Append the signature inside the standalone target, then transplant the
  // signed subtree back into the outer envelope by replacing the original
  // target element.
  (target as unknown as { appendChild: (n: unknown) => void }).appendChild(signatureNode);
  const signedTarget = (outerDocument as unknown as Document).importNode(
    target as unknown as Node,
    true,
  );
  (
    outerTarget as unknown as { parentNode: { replaceChild: (a: Node, b: Node) => void } | null }
  ).parentNode?.replaceChild(signedTarget, outerTarget as unknown as Node);

  return new XMLSerializer().serializeToString(
    outerDocument as unknown as Parameters<XMLSerializer['serializeToString']>[0],
  );
}

/**
 * Parse a signed XML document and verify it cryptographically.
 *
 * Provided alongside {@link signRegistro} so consumers (and tests) can confirm
 * the produced signature is well-formed and verifies against the embedded
 * `X509Certificate`. Returns `true` on success, `false` otherwise.
 *
 * @param signedXml - The XML produced by {@link signRegistro}.
 * @returns Whether the signature verifies against the embedded certificate.
 * @example
 * ```ts
 * const ok = await verifyRegistroSignature(signedXml);
 * ```
 */
export async function verifyRegistroSignature(signedXml: string): Promise<boolean> {
  ensureEngine();
  const document = new DOMParser().parseFromString(signedXml, 'text/xml');
  const signatures = document.getElementsByTagNameNS(
    'http://www.w3.org/2000/09/xmldsig#',
    'Signature',
  );
  if (signatures.length === 0) {
    return false;
  }
  const signatureEl = signatures.item(0);
  if (signatureEl === null) {
    return false;
  }
  const signer = new SignedXml(document as unknown as Document);
  signer.LoadXml(signatureEl as unknown as Element);
  return signer.Verify();
}
