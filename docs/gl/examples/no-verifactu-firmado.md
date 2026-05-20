# Baixo requirimento, asinado XAdES-BES

En modo requirimento o SDK asina cada rexistro con XAdES-BES envolvente
antes do envío. A sinatura usa o mesmo certificado que pasas ao
construír o cliente.

O script executable vive en `examples/no-verifactu-firmado/`.

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
  description: 'Factura pasada — aportada baixo requirimento da AEAT',
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

## Que cambia respecto ao modo voluntario

1. `mode: 'onRequest'` selecciona a familia de endpoints
   `…/RequerimientoSOAP`.
2. A cabeceira leva `requirementReference` (o ID emitido pola AEAT do
   *Requerimiento*).
3. Cada rexistro asínase (XAdES-BES envolvente, RSA-SHA256, C14N)
   antes de incrustarse no sobre. O SDK faino por ti co mesmo
   certificado.
4. A URL base do QR pasa a ser `…/ValidarQRNoVerifactu?…` no canto de
   `…/ValidarQR?…`.

## Asinar un rexistro offline

Tamén podes asinar un rexistro por separado, por exemplo para
almacenalo no disco antes do envío:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, {
  pfx: readFileSync('./cert.pfx'),
  passphrase: process.env.CERT_PASS ?? '',
});

writeFileSync('signed.xml', signedXml);
```

O resultado é o XML canonicalizado de `RegistroAlta` cun
`<ds:Signature>` engadido. Valida contra o XSD da AEAT e contra
`xmlsec1 --verify`.

## Seguinte

- [VERI*FACTU vs. requirimento](../guide/verifactu-vs-on-request.md) — a diferenza conceptual.
- [Certificados](../guide/certificates.md) — elixir o tipo de certificado axeitado.
