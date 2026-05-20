# verifactu-sdk

[![npm](https://img.shields.io/npm/v/verifactu-sdk.svg)](https://www.npmjs.com/package/verifactu-sdk)
[![CI](https://github.com/eloi24/verifactu-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/eloi24/verifactu-sdk/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A5%2090%25-brightgreen.svg)](https://eloi24.github.io/verifactu-sdk/)
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](LICENSE)

TypeScript SDK for Spain's **AEAT VERI\*FACTU** electronic invoicing system, fully implementing _Real Decreto 1007/2023_ and _Orden HAC/1177/2024_.

> **Status:** alpha — under active development. The public API may change before `1.0.0`.

## Features

- Both submission modes: **VERI\*FACTU** (voluntary) and **on-request** (under AEAT requirement, with XAdES-BES enveloped signature)
- SOAP 1.1 Document/Literal client with mTLS (client certificate)
- SHA-256 chained hash (`huella`) computed per the official spec v0.1.2 — three reference hashes are byte-equivalent
- Mandatory tax QR generation (PNG/SVG/DataURL, ISO/IEC 18004:2015, error correction M) per the official spec v0.5.0
- Strict typing via **Zod** schemas mirroring the AEAT XSDs 1:1; the public API uses English names that wrap the Spanish wire fields
- Local enforcement of every documented validation (23 business rules + NIF, NIE, CIF, NIF-IVA for the 28 EU member states with Brexit handling)
- Full AEAT error catalog generated from `errores.properties`
- Flow control that respects `TiempoEsperaEnvio` and the 1 000-records-per-submission limit
- CLI: `verifactu send | query | qr | validate`
- Multilingual documentation site (English, Spanish, Catalan, Galician) at <https://eloi24.github.io/verifactu-sdk/>

## Installation

```bash
bun add verifactu-sdk
# or
npm i verifactu-sdk
```

Runtime requirements:

- Bun ≥ 1.1 (recommended), or Node ≥ 20

## Quickstart

```ts
import { VerifactuClient, Environment } from 'verifactu-sdk';
import { readFileSync } from 'node:fs';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'verifactu',
  certificate: { pfx: readFileSync('./cert.pfx'), passphrase: process.env.CERT_PASS! },
  taxpayer: { nif: 'B12345678', legalName: 'My Company SL' },
  billingSystem: {
    producer: { nif: 'B12345678' },
    systemId: 'JC',
    systemName: 'My App',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [{
    tax: 'VAT',
    regimeKey: '01',
    operationQualification: 'S1',
    taxRate: 21,
    taxBase: 100,
    taxAmount: 21,
  }],
  totalTaxAmount: 21,
  totalAmount: 121,
  description: 'Consulting services',
});

console.log(response.csv, response.acceptedInvoices);

const qrPng = await client.renderQr(response, { format: 'png', sizeMm: 35 });
```

See the [full documentation](https://eloi24.github.io/verifactu-sdk/) for guides on certificates, on-request mode, hash chaining, QR layout, validations, error codes and the CLI.

## CLI

```bash
bunx verifactu --help
bunx verifactu send invoices.json --env pre --cert cert.pfx
bunx verifactu query --year 2026 --period 05 --env pre
bunx verifactu qr invoice.json --out qr.png --size 35
bunx verifactu validate invoices.json
```

## Development

```bash
bun install
bun run lint        # biome
bun run typecheck   # tsc --noEmit
bun test            # bun's test runner
bun run build       # ESM + CJS + .d.ts
bun run docs:dev    # VitePress dev server
```

## License

[LGPL-3.0-or-later](LICENSE) © Acme Software SL — you may use this SDK in commercial products; modifications to the SDK itself must be published under LGPL.

## References

- [AEAT VERI\*FACTU Developer Portal](https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU.html)
- [Web Services description v1.0.3](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf)
- [Validations and errors v1.2.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf)
- [Hash specification v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf)
- [QR specification v0.5.0](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf)
