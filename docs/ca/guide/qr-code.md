# Codi QR

Tota factura emesa sota VERI*FACTU o sota un requeriment de l'AEAT ha de
portar un codi QR que apunti al portal de validació de l'AEAT. El codi permet
al destinatari cotejar la factura contra el registre sense contactar amb
l'emissor. L'especificació està publicada a [*Detalle Especificaciones
Técnicas del Código QR de la factura* v0.5.0](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf).

## Què conté el QR

El QR codifica una única URL amb quatre (opcionalment cinc) paràmetres:

| Paràmetre   | Origen                          | Notes                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| `nif`       | `invoiceId.issuerNif`           | 9 caràcters.                                                  |
| `numserie`  | `invoiceId.seriesNumber`        | Codificat per URL; `/`, ` ` i altres caràcters especials s'escapen. |
| `fecha`     | `invoiceId.issueDate`           | Format cable `DD-MM-AAAA`.                                    |
| `importe`   | `totalAmount`                   | Fins a 2 decimals amb separador `.`.                          |
| `Idioma`    | Opcional (v0.5.0).              | `es`, `en`, … — afecta l'idioma del landing de l'AEAT.        |

L'URL base depèn del mode i l'entorn:

| Mode         | Producció                                                                              | Preproducció                                                                |
| ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| VERI*FACTU   | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`                       | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`                          |
| Requeriment  | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`            | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`               |

## Construir l'URL

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

La funció llança `QrUrlInputError` amb entrada mal formada (NIF invàlid,
NumSerie de més de 60 caràcters, importe amb més de 2 decimals, etc.).

## Renderitzar

S'admeten tres formats de sortida:

```ts
import { renderQrPng, renderQrSvg, renderQrDataUrl } from 'verifactu-sdk/qr';

const png    = await renderQrPng(url,  { sizeMm: 35 });
const svg    = await renderQrSvg(url,  { sizeMm: 35 });
const data   = await renderQrDataUrl(url, { sizeMm: 35 });
```

Els tres fan servir per defecte:

- Estàndard **ISO/IEC 18004:2015**.
- **Nivell de correcció M** (~15 % de redundància).
- **Quiet zone** de 4 mòduls.
- Quadrat de **30-40 mm** — el requisit de l'AEAT és 30-40 mm en impressió; el
  SDK pren una mida objectiu en mil·límetres i la converteix a píxels a 300
  dpi (configurable amb `dpi`).

## Requisits de maquetació

L'especificació de l'AEAT requereix:

- El QR ha d'estar **al costat del número de factura** (a dalt o a baix a la
  dreta de la factura, o a la còpia per al client).
- Quadrat de 30-40 mm.
- Suficient contrast (negre sobre blanc, ≥ 4.5:1).
- Al costat del QR s'ha d'imprimir el text literal **"QR de cotejo"** (o el
  seu equivalent en una altra llengua oficial).

Aquests són aspectes de maquetació — el SDK només renderitza el bitmap. La
teva plantilla PDF / HTML s'encarrega de col·locar-lo correctament.

## Verificar

Escaneja el QR amb qualsevol lector estàndard (la càmera del teu mòbil,
`zbarimg`, …). L'URL resultant ha de resoldre a la pàgina de validació de
l'AEAT. En preproducció la pàgina mostra el registre com un JSON; en
producció renderitza un resum llegible per humans.

## Caràcters especials a NumSerieFactura

L'especificació de l'AEAT permet `A-Z`, `a-z`, `0-9` i un grapat de signes
de puntuació (`-`, `_`, `/`, `.`). L'URL del QR aplica codificació
`application/x-www-form-urlencoded` estàndard via `encodeURIComponent` — `/`
passa a `%2F`, els espais a `%20`. El SDK ho fa automàticament; no
precodifiquis el valor abans de passar-lo.

## Mode requeriment

Per als registres enviats sota requeriment de l'AEAT, l'URL base canvia a
`…/ValidarQRNoVerifactu` i la resta de l'URL és idèntica. Passa
`mode: 'onRequest'` en cridar `buildQrUrl`.

## Següent

- [Validacions](./validations.md) — les regles que asseguren que les entrades del QR estan ben formades.
- [Inici ràpid](./quickstart.md) — exemple end-to-end amb renderitzat del QR inclòs.
