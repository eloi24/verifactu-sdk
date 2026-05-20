---
layout: home

hero:
  name: verifactu-sdk
  text: SDK TypeScript per a AEAT VERI*FACTU
  tagline: Emet, anul·la i consulta factures espanyoles contra l'AEAT — amb cadena d'empremtes, generació del QR, mTLS i el validador complet de les 23 regles inclosos.
  image:
    src: /hero.svg
    alt: verifactu-sdk
  actions:
    - theme: brand
      text: Comença
      link: /ca/guide/installation
    - theme: alt
      text: Inici ràpid
      link: /ca/guide/quickstart
    - theme: alt
      text: Veure a GitHub
      link: https://github.com/eloi24/verifactu-sdk

features:
  - icon: 🔒
    title: Els dos modes de remissió
    details: VERI*FACTU voluntari i resposta a requeriment (amb signatura XAdES-BES envolvent) coberts des d'una única API.
  - icon: 🧮
    title: Cadena d'empremtes conforme a l'especificació
    details: Algorisme SHA-256 de l'empremta implementat al peu de la lletra segons l'especificació v0.1.2 — les tres empremtes de referència coincideixen byte a byte.
  - icon: 📱
    title: Generació del QR fiscal
    details: Sortida PNG / SVG / DataURL, ISO/IEC 18004:2015, correcció M, mida 30-40 mm segons l'especificació v0.5.0.
  - icon: ✅
    title: Validació local
    details: Les 23 regles de negoci més NIF, NIE, CIF i NIF-IVA de 28 països UE amb gestió Brexit, abans d'arribar al cable.
  - icon: 🪪
    title: Catàleg d'errors de l'AEAT
    details: Catàleg complet amb el text literal en castellà i una explicació en anglès, indexat per codi.
  - icon: 🌍
    title: Documentació multilingüe
    details: Aquest lloc està disponible en anglès, castellà, català, gallec i èuscar. La referència de l'API es manté en anglès.
---

## Instal·lació

```bash
bun add verifactu-sdk
# o
npm i verifactu-sdk
```

## En trenta línies

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
  description: 'Serveis de consultoria',
});

console.log(response.csv, response.envelopeState);
```

[Inici ràpid complet →](/ca/guide/quickstart)
