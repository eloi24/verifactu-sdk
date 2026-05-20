# On-request, XAdES-BES signed

In on-request mode the SDK signs every record with XAdES-BES enveloped
before submission. The signature uses the same certificate you pass at
construction time.

The runnable script lives at `examples/no-verifactu-firmado/`.

```ts
import { readFileSync } from 'node:fs';
import { VerifactuClient, Environment } from 'verifactu-sdk';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'onRequest',
  certificate: {
    pfx: readFileSync('./cert.pfx'),
    passphrase: process.env.CERT_PASS ?? '',
  },
  taxpayer: { nif: 'B12345678', legalName: 'My Company SL' },
  onRequestHeader: { requirementReference: 'REQ-2026-000123' },
  billingSystem: {
    producerName: 'My Company SL',
    nif: 'B12345678',
    systemId: 'JC',
    systemName: 'On-request example',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'N',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'OR/2025/0042',
    issueDate: '2025-10-15',
  },
  invoiceType: 'F1',
  issuerName: 'My Company SL',
  description: 'Past invoice — provided under AEAT requirement',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [
    {
      tax: '01',
      regimeKey: '01',
      operationQualification: 'S1',
      taxRate: '21',
      taxBase: '200.00',
      taxAmount: '42.00',
    },
  ],
  totalTaxAmount: '42.00',
  totalAmount: '242.00',
});

console.log(response.csv, response.envelopeState);
```

## What is different from voluntary mode

1. `mode: 'onRequest'` selects the `…/RequerimientoSOAP` endpoint family.
2. The header carries `requirementReference` (the AEAT-issued ID of the
   *Requerimiento*).
3. Each record is signed (XAdES-BES enveloped, RSA-SHA256, C14N) before being
   embedded in the envelope. The SDK does this for you using the same
   certificate.
4. The QR base URL becomes `…/ValidarQRNoVerifactu?…` instead of
   `…/ValidarQR?…`.

## Signing a record offline

You can also sign a record by itself, for example to store it on disk
before submission:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, {
  pfx: readFileSync('./cert.pfx'),
  passphrase: process.env.CERT_PASS ?? '',
});

writeFileSync('signed.xml', signedXml);
```

The result is the canonicalised XML of `RegistroAlta` with an
`<ds:Signature>` element appended. It validates against the AEAT XSD and
against `xmlsec1 --verify`.

## Next

- [VERI*FACTU vs on-request](../guide/verifactu-vs-on-request.md) — the conceptual difference.
- [Certificates](../guide/certificates.md) — picking the right certificate kind.
