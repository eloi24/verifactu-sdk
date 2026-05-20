# Inici ràpid

Registra la teva primera factura contra l'entorn de preproducció de l'AEAT en
menys de trenta línies. El flux és el mateix contra producció — només canvien
el flag `environment` i el certificat.

## Prerequisits

1. Un certificat mTLS emès per l'AEAT en format `.pfx` (PKCS#12) o PEM.
   Consulta [Certificats](./certificates.md) per saber com obtenir-lo.
2. Bun 1.3.14 (o Node ≥ 20).
3. El SDK instal·lat al teu projecte (`bun add verifactu-sdk`).

## Configuració mínima del client

```ts
import { VerifactuClient, Environment } from 'verifactu-sdk';
import { readFileSync } from 'node:fs';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'verifactu',
  certificate: {
    pfx: readFileSync('./cert.pfx'),
    passphrase: process.env.CERT_PASS ?? '',
  },
  taxpayer: { nif: 'B12345678', legalName: 'My Company SL' },
  billingSystem: {
    producerName: 'My Company SL',
    nif: 'B12345678',
    systemId: 'JC',
    systemName: 'My App',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});
```

El client gestiona la cadena d'empremtes, el controlador de flux (que respecta
el `TiempoEsperaEnvio` retornat per l'AEAT) i el validador per cada crida.
Només necessites una instància per obligat tributari.

## Registrar una factura

```ts
const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  description: 'Serveis de consultoria — maig 2026',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [
    {
      tax: '01',
      regimeKey: '01',
      operationQualification: 'S1',
      taxRate: '21',
      taxBase: '100.00',
      taxAmount: '21.00',
    },
  ],
  totalTaxAmount: '21.00',
  totalAmount: '121.00',
});

console.log(response.csv);            // → CSV de l'AEAT (Código Seguro de Verificación)
console.log(response.envelopeState);  // → 'Correcto' | 'ParcialmenteCorrecto' | 'Incorrecto'
console.log(response.records[0]?.state);
```

L'array `response.records` porta una entrada per factura enviada amb el seu
resultat per registre (`Correcto`, `AceptadoConErrores` o `Incorrecto`) i el
codi d'error de l'AEAT que correspongui. Consulta
[Codis d'error](./error-codes.md) per al catàleg complet.

## Renderitzar el QR obligatori

Tota factura emesa sota VERI*FACTU **ha de** portar un codi QR que apunti al
portal de validació de l'AEAT. El SDK el renderitza per tu en PNG, SVG o DataURL.

```ts
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';

const url = buildQrUrl({
  mode: 'verifactu',
  environment: 'production',
  invoice: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
    totalAmount: '121.00',
  },
});

const png = await renderQrPng(url, { sizeMm: 35 });
// → Buffer llest per inserir al teu PDF/HTML de factura.
```

La mida del QR ha de ser de 30-40 mm segons l'especificació de l'AEAT.
Consulta la [guia del QR](./qr-code.md) per als requisits de maquetació.

## Consultar factures ja enviades

En mode `verifactu` (només) l'AEAT exposa un endpoint de consulta paginat. El
SDK retorna un async iterable, així que mai has de gestionar cursors
manualment.

```ts
for await (const page of client.queryInvoices({ year: '2026', period: '05' })) {
  for (const record of page.records) {
    console.log(record.invoiceId.seriesNumber, record.state);
  }
}
```

## Anul·lar

```ts
await client.cancelInvoice({
  cancelledInvoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  generatedBy: 'E',
});
```

## Pròxims passos

- [Cadena d'empremtes](./hash-chain.md) — com el SDK encadena els registres i què verifica l'AEAT.
- [Validacions](./validations.md) — les 23 regles de negoci aplicades localment.
- [Control de flux](./flow-control.md) — com el SDK respecta `TiempoEsperaEnvio`
  i el límit de 1 000 registres per enviament.
- [Proves](./testing.md) — com executar la suite e2e contra preproducció de l'AEAT.
