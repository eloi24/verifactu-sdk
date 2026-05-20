---
layout: home

hero:
  name: verifactu-sdk
  text: TypeScript SDK for AEAT VERI*FACTU
  tagline: Issue, cancel and query Spanish invoices against the AEAT — with hash chaining, QR generation, mTLS and the full 23-rule validator built in.
  image:
    src: /hero.svg
    alt: verifactu-sdk
  actions:
    - theme: brand
      text: Get started
      link: /guide/installation
    - theme: alt
      text: Quickstart
      link: /guide/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/eloi24/verifactu-sdk

features:
  - icon: 🔒
    title: Both submission modes
    details: Voluntary VERI*FACTU and on-request (with XAdES-BES enveloped signature) covered from a single API surface.
  - icon: 🧮
    title: Spec-correct hash chain
    details: SHA-256 huella algorithm implemented per the official v0.1.2 spec — the three reference hashes match byte-for-byte.
  - icon: 📱
    title: Tax QR generation
    details: PNG / SVG / DataURL output, ISO/IEC 18004:2015, correction level M, 30-40 mm sizing per the v0.5.0 spec.
  - icon: ✅
    title: Local validation
    details: All 23 business rules + NIF, NIE, CIF, NIF-IVA for 28 EU countries with Brexit handling, before you ever hit the wire.
  - icon: 🪪
    title: AEAT error catalog
    details: Full catalog with the verbatim Spanish message and an English explanation, indexed by code.
  - icon: 🌍
    title: Multilingual docs
    details: This site is available in English, Spanish, Catalan and Galician. The API reference stays in English.
---

## Install

```bash
bun add verifactu-sdk
# or
npm i verifactu-sdk
```

## In thirty lines

```ts
import { VerifactuClient, Environment } from 'verifactu-sdk';
import { readFileSync } from 'node:fs';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'verifactu',
  certificate: { pfx: readFileSync('./cert.pfx'), passphrase: process.env.CERT_PASS! },
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

const response = await client.registerInvoice({
  invoiceId: { issuerNif: 'B12345678', seriesNumber: 'A/2026/0001', issueDate: '2026-05-20' },
  invoiceType: 'F1',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [
    { tax: '01', regimeKey: '01', operationQualification: 'S1', taxRate: '21', taxBase: '100.00', taxAmount: '21.00' },
  ],
  totalTaxAmount: '21.00',
  totalAmount: '121.00',
  description: 'Consulting services',
});

console.log(response.csv, response.envelopeState);
```

[Full quickstart →](/guide/quickstart)
