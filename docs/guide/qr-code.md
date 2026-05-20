# QR code

Every invoice issued under VERI*FACTU or under an AEAT requirement must carry
a QR code linking back to the AEAT validation portal. The code lets recipients
check the invoice against the registry without contacting the issuer. The
specification is published in [*Detalle Especificaciones Técnicas del Código
QR de la factura* v0.5.0](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf).

## What goes in the QR

The QR encodes a single URL with four (optionally five) query parameters:

| Parameter   | Source                          | Notes                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| `nif`       | `invoiceId.issuerNif`           | 9 characters.                                                 |
| `numserie`  | `invoiceId.seriesNumber`        | URL-encoded; `/`, ` ` and other special chars are escaped.    |
| `fecha`     | `invoiceId.issueDate`           | Wire form `DD-MM-AAAA`.                                       |
| `importe`   | `totalAmount`                   | Up to 2 decimals with `.` separator.                          |
| `Idioma`    | Optional (v0.5.0).              | `es`, `en`, … — affects the AEAT landing page language.       |

The base URL depends on the mode and environment:

| Mode         | Production                                                                             | Pre-production                                                              |
| ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| VERI*FACTU   | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`                       | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`                          |
| On-request   | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`            | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`               |

## Building the URL

```ts
import { buildQrUrl } from 'verifactu-sdk/qr';

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
// → "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=A%2F2026%2F0001&fecha=20-05-2026&importe=121.00"
```

The function throws `QrUrlInputError` on malformed input (bad NIF, NumSerie
longer than 60 chars, importe with more than 2 decimals, etc.).

## Rendering

Three output formats are supported:

```ts
import { renderQrPng, renderQrSvg, renderQrDataUrl } from 'verifactu-sdk/qr';

const png    = await renderQrPng(url,  { sizeMm: 35 });
const svg    = await renderQrSvg(url,  { sizeMm: 35 });
const data   = await renderQrDataUrl(url, { sizeMm: 35 });
```

All three default to:

- **ISO/IEC 18004:2015** standard.
- **Error correction level M** (~15 % redundancy).
- **Quiet zone** of 4 modules.
- A square sized between **30 mm and 40 mm** — the AEAT requirement is 30–40 mm
  at print time; the SDK takes a target millimetre size and converts it to
  pixels at 300 dpi (configurable via `dpi`).

## Layout requirements

The AEAT specification requires:

- The QR must be **adjacent to the invoice number** (top or bottom right of the
  invoice, or on the customer-facing reproduction).
- A 30–40 mm square.
- High enough contrast (black on white, ≥ 4.5:1).
- The literal text **"QR de cotejo"** (or the equivalent in another official
  language) printed nearby.

These are layout concerns — the SDK only renders the bitmap. Your PDF / HTML
template is responsible for placing it correctly.

## Verifying

Scan the QR with any standard reader (your phone camera, `zbarimg`, …). The
resulting URL should resolve to the AEAT validation page. In pre-production
the page displays the record as a JSON dump; in production it renders a
human-readable summary.

## Special characters in NumSerieFactura

The AEAT specification allows `A-Z`, `a-z`, `0-9` and a handful of
punctuation (`-`, `_`, `/`, `.`). The QR URL applies standard `application/x-
www-form-urlencoded` encoding via `encodeURIComponent` — `/` becomes `%2F`,
spaces become `%20`. The SDK does this automatically; do not pre-encode the
value before passing it.

## On-request mode

For records submitted under an AEAT requirement the base URL changes to
`…/ValidarQRNoVerifactu` and the rest of the URL is identical. Set
`mode: 'onRequest'` when calling `buildQrUrl`.

## Next

- [Validations](./validations.md) — the rules that ensure the QR inputs are well-formed.
- [Quickstart](./quickstart.md) — end-to-end example including QR rendering.
