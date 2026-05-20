# Código QR

Toda factura emitida baixo VERI*FACTU ou baixo un requirimento da AEAT
debe levar un código QR que apunte ao portal de validación da AEAT. O
código permite ao destinatario cotexar a factura contra o rexistro sen
contactar co emisor. A especificación está publicada en [*Detalle
Especificaciones Técnicas del Código QR de la factura* v0.5.0](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf).

## Que contén o QR

O QR codifica unha única URL con catro (opcionalmente cinco) parámetros:

| Parámetro   | Orixe                           | Notas                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| `nif`       | `invoiceId.issuerNif`           | 9 caracteres.                                                 |
| `numserie`  | `invoiceId.seriesNumber`        | Codificado por URL; `/`, ` ` e outros caracteres especiais escápanse. |
| `fecha`     | `invoiceId.issueDate`           | Formato cable `DD-MM-AAAA`.                                   |
| `importe`   | `totalAmount`                   | Ata 2 decimais con separador `.`.                             |
| `Idioma`    | Opcional (v0.5.0).              | `es`, `en`, … — afecta ao idioma do landing da AEAT.          |

A URL base depende do modo e do ambiente:

| Modo         | Produción                                                                             | Pre-produción                                                                |
| ------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| VERI*FACTU   | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`                       | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`                          |
| Requirimento | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`            | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`               |

## Construír a URL

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

A función lanza `QrUrlInputError` con entrada malformada (NIF non válido,
NumSerie de máis de 60 caracteres, importe con máis de 2 decimais, etc.).

## Renderizar

Sopórtanse tres formatos de saída:

```ts
import { renderQrPng, renderQrSvg, renderQrDataUrl } from 'verifactu-sdk/qr';

const png    = await renderQrPng(url,  { sizeMm: 35 });
const svg    = await renderQrSvg(url,  { sizeMm: 35 });
const data   = await renderQrDataUrl(url, { sizeMm: 35 });
```

Os tres usan por defecto:

- Estándar **ISO/IEC 18004:2015**.
- **Nivel de corrección M** (~15 % de redundancia).
- **Quiet zone** de 4 módulos.
- Cadrado de **30-40 mm** — o requisito da AEAT é 30-40 mm en impresión;
  o SDK toma un tamaño obxectivo en milímetros e convérteo a píxeles a
  300 dpi (configurable vía `dpi`).

## Requisitos de maquetación

A especificación da AEAT require:

- O QR debe estar **xunto ao número de factura** (arriba ou abaixo á
  dereita da factura, ou na copia para o cliente).
- Cadrado de 30-40 mm.
- Suficiente contraste (negro sobre branco, ≥ 4.5:1).
- Xunto ao QR débese imprimir o texto literal **"QR de cotejo"** (ou o
  seu equivalente noutra lingua oficial).

Estes son aspectos de maquetación — o SDK só renderiza o bitmap. O teu
template PDF / HTML encárgase de colocalo correctamente.

## Verificar

Escanea o QR con calquera lector estándar (a cámara do teu móbil,
`zbarimg`, …). A URL resultante debe resolver á páxina de validación da
AEAT. En pre-produción a páxina mostra o rexistro como un JSON; en
produción renderiza un resumo lexible por humanos.

## Caracteres especiais en NumSerieFactura

A especificación da AEAT permite `A-Z`, `a-z`, `0-9` e un puñado de
signos de puntuación (`-`, `_`, `/`, `.`). A URL do QR aplica codificación
`application/x-www-form-urlencoded` estándar vía `encodeURIComponent` —
`/` pasa a `%2F`, os espazos a `%20`. O SDK faino automaticamente; non
precodifiques o valor antes de pasalo.

## Modo requirimento

Para os rexistros enviados baixo requirimento da AEAT, a URL base cambia
a `…/ValidarQRNoVerifactu` e o resto da URL é idéntico. Pasa
`mode: 'onRequest'` ao chamar a `buildQrUrl`.

## Seguinte

- [Validacións](./validations.md) — as regras que aseguran que as entradas do QR están ben formadas.
- [Inicio rápido](./quickstart.md) — exemplo end-to-end con renderizado do QR incluído.
