# Inicio rápido

Rexistra a túa primeira factura contra o ambiente de pre-produción da AEAT
en menos de trinta liñas. O fluxo é o mesmo contra produción — só cambian
o flag `environment` e o certificado.

## Prerrequisitos

1. Un certificado mTLS emitido pola AEAT en formato `.pfx` (PKCS#12) ou PEM.
   Consulta [Certificados](./certificates.md) para saber como obtelo.
2. Bun 1.3.14 (ou Node ≥ 20).
3. O SDK instalado no teu proxecto (`bun add verifactu-sdk`).

## Configuración mínima do cliente

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

O cliente xestiona a cadea de pegadas, o controlador de fluxo (que respecta
o `TiempoEsperaEnvio` devolto pola AEAT) e o validador por cada chamada.
Só precisas unha instancia por obrigado tributario.

## Rexistrar unha factura

```ts
const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  description: 'Servizos de consultoría — maio 2026',
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

console.log(response.csv);            // → CSV da AEAT (Código Seguro de Verificación)
console.log(response.envelopeState);  // → 'Correcto' | 'ParcialmenteCorrecto' | 'Incorrecto'
console.log(response.records[0]?.state);
```

O array `response.records` leva unha entrada por factura enviada co seu
resultado por rexistro (`Correcto`, `AceptadoConErrores` ou `Incorrecto`)
e o código de erro da AEAT que corresponda. Consulta
[Códigos de erro](./error-codes.md) para o catálogo completo.

## Renderizar o QR obrigatorio

Toda factura emitida baixo VERI*FACTU **debe** levar un código QR que
apunte ao portal de validación da AEAT. O SDK renderízao por ti en PNG,
SVG ou DataURL.

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
// → Buffer listo para inserir no teu PDF/HTML de factura.
```

O tamaño do QR debe ser de 30-40 mm segundo a especificación da AEAT.
Consulta a [guía de QR](./qr-code.md) para os requisitos de maquetación.

## Consultar facturas xa enviadas

En modo `verifactu` (só) a AEAT expón un endpoint de consulta paxinado. O
SDK devolve un async iterable, así que nunca tes que xestionar cursores
manualmente.

```ts
for await (const page of client.queryInvoices({ year: '2026', period: '05' })) {
  for (const record of page.records) {
    console.log(record.invoiceId.seriesNumber, record.state);
  }
}
```

## Anular

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

## Próximos pasos

- [Cadea de pegadas](./hash-chain.md) — como o SDK encadea os rexistros e que verifica a AEAT.
- [Validacións](./validations.md) — as 23 regras de negocio aplicadas localmente.
- [Control de fluxo](./flow-control.md) — como o SDK respecta `TiempoEsperaEnvio`
  e o límite de 1 000 rexistros por envío.
- [Probas](./testing.md) — como executar a suite e2e contra pre-produción da AEAT.
