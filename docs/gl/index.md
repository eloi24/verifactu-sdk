---
layout: home

hero:
  name: verifactu-sdk
  text: SDK TypeScript para AEAT VERI*FACTU
  tagline: Emite, anula e consulta facturas españolas contra a AEAT — con cadea de pegadas, xeración do QR, mTLS e o validador completo das 23 regras incluídos.
  image:
    src: /hero.svg
    alt: verifactu-sdk
  actions:
    - theme: brand
      text: Comezar
      link: /gl/guide/installation
    - theme: alt
      text: Inicio rápido
      link: /gl/guide/quickstart
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/eloi24/verifactu-sdk

features:
  - icon: 🔒
    title: Os dous modos de remisión
    details: VERI*FACTU voluntario e resposta a requirimento (con sinatura XAdES-BES envolvente) cubertos desde unha única API.
  - icon: 🧮
    title: Cadea de pegadas conforme á especificación
    details: Algoritmo SHA-256 da pegada implementado ao pé da letra segundo a spec v0.1.2 — as tres pegadas de referencia coinciden byte a byte.
  - icon: 📱
    title: Xeración do QR fiscal
    details: Saída PNG / SVG / DataURL, ISO/IEC 18004:2015, corrección M, tamaño 30-40 mm segundo a spec v0.5.0.
  - icon: ✅
    title: Validación local
    details: As 23 regras de negocio máis NIF, NIE, CIF e NIF-IVA de 28 países UE con xestión Brexit, antes de chegar ao cable.
  - icon: 🪪
    title: Catálogo de erros da AEAT
    details: Catálogo completo co texto literal en castelán e unha explicación en inglés, indexado por código.
  - icon: 🌍
    title: Documentación multilingüe
    details: Este sitio está dispoñible en inglés, castelán, catalán, galego e éuscaro. A referencia da API mantense en inglés.
---

## Instalación

```bash
bun add verifactu-sdk
# ou
npm i verifactu-sdk
```

## En trinta liñas

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
  description: 'Servizos de consultoría',
});

console.log(response.csv, response.envelopeState);
```

[Inicio rápido completo →](/gl/guide/quickstart)
