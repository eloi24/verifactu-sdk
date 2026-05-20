# Sota requeriment, signat XAdES-BES

En mode requeriment el SDK signa cada registre amb XAdES-BES envolvent
abans de l'enviament. La signatura fa servir el mateix certificat que
passes en construir el client.

L'script executable viu a `examples/no-verifactu-firmado/`.

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
  description: 'Factura passada — aportada sota requeriment de l\'AEAT',
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

## Què canvia respecte al mode voluntari

1. `mode: 'onRequest'` selecciona la família d'endpoints
   `…/RequerimientoSOAP`.
2. La capçalera porta `requirementReference` (l'ID emès per l'AEAT del
   *Requerimiento*).
3. Cada registre es signa (XAdES-BES envolvent, RSA-SHA256, C14N) abans
   d'incrustar-se al sobre. El SDK ho fa per tu amb el mateix certificat.
4. L'URL base del QR passa a ser `…/ValidarQRNoVerifactu?…` en lloc de
   `…/ValidarQR?…`.

## Signar un registre offline

També pots signar un registre per separat, per exemple per emmagatzemar-lo
en disc abans de l'enviament:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, {
  pfx: readFileSync('./cert.pfx'),
  passphrase: process.env.CERT_PASS ?? '',
});

writeFileSync('signed.xml', signedXml);
```

El resultat és l'XML canonicalitzat de `RegistroAlta` amb un
`<ds:Signature>` afegit. Valida contra l'XSD de l'AEAT i contra
`xmlsec1 --verify`.

## Següent

- [VERI*FACTU vs. requeriment](../guide/verifactu-vs-on-request.md) — la diferència conceptual.
- [Certificats](../guide/certificates.md) — triar el tipus de certificat adequat.
