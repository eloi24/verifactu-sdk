---
layout: home

hero:
  name: verifactu-sdk
  text: SDK TypeScript para AEAT VERI*FACTU
  tagline: Emite, anula y consulta facturas españolas contra la AEAT — con cadena de huellas, generación del QR, mTLS y el validador completo de las 23 reglas incluidos.
  image:
    src: /hero.svg
    alt: verifactu-sdk
  actions:
    - theme: brand
      text: Empezar
      link: /es/guide/installation
    - theme: alt
      text: Inicio rápido
      link: /es/guide/quickstart
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/eloi24/verifactu-sdk

features:
  - icon: 🔒
    title: Los dos modos de remisión
    details: VERI*FACTU voluntario y respuesta a requerimiento (con firma XAdES-BES envolvente) cubiertos desde una única API.
  - icon: 🧮
    title: Cadena de huellas conforme a la especificación
    details: Algoritmo SHA-256 de la huella implementado al pie de la letra según la spec v0.1.2 — las tres huellas de referencia coinciden byte a byte.
  - icon: 📱
    title: Generación del QR fiscal
    details: Salida PNG / SVG / DataURL, ISO/IEC 18004:2015, corrección M, tamaño 30-40 mm según la spec v0.5.0.
  - icon: ✅
    title: Validación local
    details: Las 23 reglas de negocio más NIF, NIE, CIF y NIF-IVA de 28 países UE con gestión Brexit, antes de llegar al cable.
  - icon: 🪪
    title: Catálogo de errores de la AEAT
    details: Catálogo completo con el texto literal en español y una explicación en inglés, indexado por código.
  - icon: 🌍
    title: Documentación multilingüe
    details: Este sitio está disponible en inglés, español, catalán, gallego y euskera. La referencia de la API se mantiene en inglés.
---

## Instalación

```bash
bun add verifactu-sdk
# o
npm i verifactu-sdk
```

## En treinta líneas

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
  description: 'Servicios de consultoría',
});

console.log(response.csv, response.envelopeState);
```

[Inicio rápido completo →](/es/guide/quickstart)
