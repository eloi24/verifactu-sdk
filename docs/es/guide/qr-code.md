# Código QR

Toda factura emitida bajo VERI*FACTU o bajo un requerimiento de la AEAT debe
llevar un código QR que apunte al portal de validación de la AEAT. El código
permite al destinatario cotejar la factura contra el registro sin contactar con
el emisor. La especificación está publicada en [*Detalle Especificaciones
Técnicas del Código QR de la factura* v0.5.0](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf).

## Qué contiene el QR

El QR codifica una única URL con cuatro (opcionalmente cinco) parámetros:

| Parámetro   | Origen                          | Notas                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| `nif`       | `invoiceId.issuerNif`           | 9 caracteres.                                                 |
| `numserie`  | `invoiceId.seriesNumber`        | Codificado por URL; `/`, ` ` y otros caracteres especiales se escapan. |
| `fecha`     | `invoiceId.issueDate`           | Formato cable `DD-MM-AAAA`.                                   |
| `importe`   | `totalAmount`                   | Hasta 2 decimales con separador `.`.                          |
| `Idioma`    | Opcional (v0.5.0).              | `es`, `en`, … — afecta al idioma del landing de la AEAT.      |

La URL base depende del modo y el entorno:

| Modo         | Producción                                                                             | Pre-producción                                                              |
| ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| VERI*FACTU   | `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`                       | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`                          |
| Requerimiento| `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`            | `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu`               |

## Construir la URL

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

La función lanza `QrUrlInputError` con entrada malformada (NIF inválido, NumSerie
de más de 60 caracteres, importe con más de 2 decimales, etc.).

## Renderizar

Se soportan tres formatos de salida:

```ts
import { renderQrPng, renderQrSvg, renderQrDataUrl } from 'verifactu-sdk/qr';

const png    = await renderQrPng(url,  { sizeMm: 35 });
const svg    = await renderQrSvg(url,  { sizeMm: 35 });
const data   = await renderQrDataUrl(url, { sizeMm: 35 });
```

Los tres usan por defecto:

- Estándar **ISO/IEC 18004:2015**.
- **Nivel de corrección M** (~15 % de redundancia).
- **Quiet zone** de 4 módulos.
- Cuadrado de **30-40 mm** — el requisito de la AEAT es 30-40 mm en impresión; el
  SDK toma un tamaño objetivo en milímetros y lo convierte a píxeles a 300 dpi
  (configurable vía `dpi`).

## Requisitos de maquetación

La especificación de la AEAT requiere:

- El QR debe estar **junto al número de factura** (arriba o abajo a la derecha
  de la factura, o en la copia para el cliente).
- Cuadrado de 30-40 mm.
- Suficiente contraste (negro sobre blanco, ≥ 4.5:1).
- Junto al QR se debe imprimir el texto literal **"QR de cotejo"** (o su
  equivalente en otra lengua oficial).

Estos son aspectos de maquetación — el SDK sólo renderiza el bitmap. Tu
plantilla PDF / HTML se encarga de colocarlo correctamente.

## Verificar

Escanea el QR con cualquier lector estándar (la cámara de tu móvil, `zbarimg`,
…). La URL resultante debe resolver a la página de validación de la AEAT. En
pre-producción la página muestra el registro como un JSON; en producción
renderiza un resumen legible por humanos.

## Caracteres especiales en NumSerieFactura

La especificación de la AEAT permite `A-Z`, `a-z`, `0-9` y un puñado de signos
de puntuación (`-`, `_`, `/`, `.`). La URL del QR aplica codificación
`application/x-www-form-urlencoded` estándar vía `encodeURIComponent` — `/`
pasa a `%2F`, los espacios a `%20`. El SDK lo hace automáticamente; no
pre-codifiques el valor antes de pasarlo.

## Modo requerimiento

Para los registros enviados bajo requerimiento de la AEAT, la URL base cambia a
`…/ValidarQRNoVerifactu` y el resto de la URL es idéntico. Pasa
`mode: 'onRequest'` al llamar a `buildQrUrl`.

## Siguiente

- [Validaciones](./validations.md) — las reglas que aseguran que las entradas del QR están bien formadas.
- [Inicio rápido](./quickstart.md) — ejemplo end-to-end con renderizado del QR incluido.
