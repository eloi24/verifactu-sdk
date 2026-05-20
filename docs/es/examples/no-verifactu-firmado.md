# Bajo requerimiento, firmado XAdES-BES

En modo requerimiento el SDK firma cada registro con XAdES-BES envolvente
antes del envío. La firma usa el mismo certificado que pasas al construir
el cliente.

El script ejecutable vive en `examples/no-verifactu-firmado/`.

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
  description: 'Factura pasada — aportada bajo requerimiento de la AEAT',
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

## Qué cambia respecto al modo voluntario

1. `mode: 'onRequest'` selecciona la familia de endpoints `…/RequerimientoSOAP`.
2. La cabecera lleva `requirementReference` (el ID emitido por la AEAT del
   *Requerimiento*).
3. Cada registro se firma (XAdES-BES envolvente, RSA-SHA256, C14N) antes de
   incrustarse en el sobre. El SDK lo hace por ti con el mismo certificado.
4. La URL base del QR pasa a ser `…/ValidarQRNoVerifactu?…` en lugar de
   `…/ValidarQR?…`.

## Firmar un registro offline

También puedes firmar un registro por separado, por ejemplo para
almacenarlo en disco antes del envío:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, {
  pfx: readFileSync('./cert.pfx'),
  passphrase: process.env.CERT_PASS ?? '',
});

writeFileSync('signed.xml', signedXml);
```

El resultado es el XML canonicalizado de `RegistroAlta` con un
`<ds:Signature>` añadido. Valida contra el XSD de la AEAT y contra
`xmlsec1 --verify`.

## Siguiente

- [VERI*FACTU vs. requerimiento](../guide/verifactu-vs-on-request.md) — la diferencia conceptual.
- [Certificados](../guide/certificates.md) — elegir el tipo de certificado adecuado.
