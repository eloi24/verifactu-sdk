# Inicio rápido

Registra tu primera factura contra el entorno de pre-producción de la AEAT en
menos de treinta líneas. El flujo es el mismo contra producción — sólo cambian
el flag `environment` y el certificado.

## Prerrequisitos

1. Un certificado mTLS emitido por la AEAT en formato `.pfx` (PKCS#12) o PEM.
   Consulta [Certificados](./certificates.md) para saber cómo obtenerlo.
2. Bun ≥ 1.1 (o Node ≥ 20).
3. El SDK instalado en tu proyecto (`bun add verifactu-sdk`).

## Configuración mínima del cliente

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

El cliente gestiona la cadena de huellas, el controlador de flujo (que respeta
el `TiempoEsperaEnvio` devuelto por la AEAT) y el validador por cada llamada.
Sólo necesitas una instancia por obligado tributario.

## Registrar una factura

```ts
const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  description: 'Servicios de consultoría — mayo 2026',
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

console.log(response.csv);            // → CSV de la AEAT (Código Seguro de Verificación)
console.log(response.envelopeState);  // → 'Correcto' | 'ParcialmenteCorrecto' | 'Incorrecto'
console.log(response.records[0]?.state);
```

El array `response.records` lleva una entrada por factura enviada con su
resultado por registro (`Correcto`, `AceptadoConErrores` o `Incorrecto`) y el
código de error de la AEAT que corresponda. Consulta
[Códigos de error](./error-codes.md) para el catálogo completo.

## Renderizar el QR obligatorio

Toda factura emitida bajo VERI*FACTU **debe** llevar un código QR que apunte al
portal de validación de la AEAT. El SDK lo renderiza por ti en PNG, SVG o DataURL.

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
// → Buffer listo para insertar en tu PDF/HTML de factura.
```

El tamaño del QR debe ser de 30-40 mm según la especificación de la AEAT.
Consulta la [guía de QR](./qr-code.md) para los requisitos de maquetación.

## Consultar facturas ya enviadas

En modo `verifactu` (sólo) la AEAT expone un endpoint de consulta paginado. El
SDK devuelve un async iterable, así que nunca tienes que gestionar cursores
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

- [Cadena de huellas](./hash-chain.md) — cómo el SDK encadena los registros y qué verifica la AEAT.
- [Validaciones](./validations.md) — las 23 reglas de negocio aplicadas localmente.
- [Control de flujo](./flow-control.md) — cómo el SDK respeta `TiempoEsperaEnvio`
  y el límite de 1 000 registros por envío.
- [Pruebas](./testing.md) — cómo ejecutar la suite e2e contra pre-producción de la AEAT.
