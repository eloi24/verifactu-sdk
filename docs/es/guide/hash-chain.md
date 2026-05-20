# Cadena de huellas

Todo registro enviado a la AEAT lleva una **huella** — un digest SHA-256
hexadecimal en mayúsculas de 64 caracteres que lo encadena con el registro
anterior del mismo obligado. La cadena es lo que hace el registro a prueba de
manipulaciones: cambiar cualquier registro pasado invalida todas las huellas
posteriores.

El algoritmo completo está especificado en [*Especificaciones técnicas para
generación de la huella o hash de los registros de facturación* v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
El SDK lo implementa literalmente; las tres huellas de referencia del §6 de ese
PDF están cubiertas por tests unitarios y coinciden byte a byte.

## Campos que se hashean

La huella se calcula sobre una concatenación `nombre1=valor1&nombre2=valor2&…`
con una lista de campos fija y ordenada por tipo de registro:

### `RegistroAlta` (ocho campos)

| Orden | Nombre del campo            | Origen                                |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-AAAA)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (registro anterior)| `chainLink.previousHash` o vacío      |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 con offset)   |

### `RegistroAnulacion` (cinco campos)

| Orden | Nombre del campo                | Origen                                |
| ----- | ------------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`        | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`        | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`        |
| 4     | `Huella` (registro anterior)    | `chainLink.previousHash` o vacío      |
| 5     | `FechaHoraHusoGenRegistro`      | `generatedAt`                         |

## Normalización

Antes de concatenar, cada valor se normaliza:

- **Recorte** de espacios al principio y al final.
- **Valores numéricos** (`CuotaTotal`, `ImporteTotal`): los ceros a la derecha del
  separador decimal son irrelevantes — `21.00` y `21` producen la misma huella.
- **Las fechas** se emiten en formato cable `DD-MM-AAAA`.
- Los bytes usados para hashear son **UTF-8** de la cadena resultante.

## Primer registro

Para el primer registro enviado por un obligado, el campo `Huella` del registro
anterior está vacío — la concatenación contiene `…&Huella=&…`. Define
`chainLink.first = true` y omite los cuatro campos `previous*`:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Registros siguientes

Para todo registro siguiente, proporciona el enlace anterior completo:

```ts
const next: Invoice = {
  /* ... */
  chainLink: {
    first: false,
    previousIssuerNif: 'B12345678',
    previousSeriesNumber: 'A/2026/0001',
    previousIssueDate: '2026-05-20',
    previousHash: '3C13742B…A8F1',
  },
};
```

En la práctica el SDK rellena esto por ti cuando pasas por `VerifactuClient` —
recuerda la última huella de la cadena por instancia. Sólo tratas el enlace
manualmente si almacenas los registros offline y retomas la cadena más tarde.

## Calcular una huella manualmente

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* primer registro */);
// → "3C13742B...A8F1"  (64 caracteres hex en mayúsculas)
```

La función es pura — sin E/S, sin efectos secundarios — y se expone vía
`verifactu-sdk/hash`. Lanza `SchemaValidationError` si pasas un `previousHash`
mal formado.

## Verificar

Dado un registro y su predecesor puedes recalcular la huella y comparar:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('¡Cadena rota!');
}
```

La AEAT hace esto en servidor en cada envío. Un desajuste levanta el error
**2000** (admisible — el registro se acepta pero se marca para *subsanación*).

## Reset / replay

Si pierdes el estado local de la cadena (limpieza de base de datos, rotación de
certificado) debes volver a consultar a la AEAT el último registro aceptado,
tomar su campo `Huella` y reanudar desde ahí:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → reanuda la cadena usando last.invoiceId + la huella almacenada en tu BBDD
```

## Rendimiento

La huella es un único SHA-256 sobre una cadena corta (típicamente menos de 1 KB),
así que un registro se hashea en microsegundos. El cuello de botella de la cadena
es la llamada secuencial a la AEAT: el SDK serializa las llamadas a
`registerInvoice` por instancia, así la cadena nunca se rompe por concurrencia.

## Siguiente

- [Código QR](./qr-code.md) — también depende del identificador de factura.
- [Validaciones](./validations.md) — la regla 23 comprueba el formato de la huella localmente.
- [Control de flujo](./flow-control.md) — por qué los envíos se serializan.
