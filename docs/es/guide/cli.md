# Interfaz de línea de comandos

El SDK incluye un CLI `verifactu` que expone las mismas primitivas que la
librería en formato apto para scripts de shell, jobs cron y operaciones
puntuales. Se instala como bin script en el paquete, así que tras
`bun add verifactu-sdk` queda disponible vía tu runner preferido:

```bash
bunx verifactu --help
npx verifactu --help
```

## Subcomandos

```
verifactu send       Envía un fichero JSON de facturas a la AEAT
verifactu query      Consulta paginada contra la AEAT (sólo modo verifactu)
verifactu qr         Renderiza el QR fiscal obligatorio para una factura
verifactu validate   Valida un fichero JSON contra los schemas + las 23 reglas
```

Cada subcomando lee su entrada principal desde un fichero JSON. El fichero
debe respetar las formas públicas `Invoice` / `CancelInvoiceInput` (consulta
la [referencia API](/api/)). Usa `verifactu validate` para revisar un
fichero antes de enviarlo.

### `verifactu send`

Envía una o más facturas.

```bash
bunx verifactu send invoices.json \
  --env pre \
  --mode verifactu \
  --cert ./cert.pfx \
  --pass "$CERT_PASS" \
  --nif B12345678 \
  --representative B99999999
```

Opciones:

| Flag                    | Descripción                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `--env pre\|prod`       | Entorno. Por defecto `pre`.                                          |
| `--mode verifactu\|on-request` | Modo de remisión. Por defecto `verifactu`.                    |
| `--cert <ruta>`         | Ruta a un certificado `.pfx`. Obligatorio.                           |
| `--pass <password>`     | Passphrase del certificado. Lee `$VERIFACTU_PASS` si se omite.       |
| `--nif <NIF>`           | NIF del obligado. Obligatorio.                                       |
| `--representative <NIF>`| NIF del representante (opcional).                                    |
| `--with-seal`           | Usa el pool de URLs de sello electrónico.                            |
| `--dry-run`             | Ejecuta el validador local, imprime el sobre, no envía.              |

Códigos de salida:

- `0` — todos los registros aceptados (`Correcto`).
- `1` — aceptación parcial (`ParcialmenteCorrecto`).
- `2` — rechazo de envelope (`Incorrecto`).
- `3` — fallo de validación local.

### `verifactu query`

Consulta paginada de registros ya enviados. Disponible sólo en modo
`verifactu`.

```bash
bunx verifactu query --year 2026 --period 05 --env pre --cert ./cert.pfx
```

Opciones:

| Flag             | Descripción                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `--year YYYY`    | Ejercicio. Obligatorio.                                             |
| `--period MM`    | Periodo (`01`-`12`). Obligatorio.                                   |
| `--series PATTERN` | Filtro opcional por serie.                                        |
| `--counterpart NIF` | Filtro opcional por NIF de la contraparte.                       |
| `--ext-ref REF`  | Filtro opcional por referencia externa.                             |
| `--json`         | Emite JSON crudo en lugar de una tabla.                             |

### `verifactu qr`

Renderiza el QR fiscal obligatorio.

```bash
bunx verifactu qr invoice.json --out qr.png --size 35
```

Opciones:

| Flag             | Descripción                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `--out <ruta>`   | Fichero de salida. Formato inferido por extensión (`.png`, `.svg`). |
| `--size <mm>`    | Lado del cuadrado del QR en milímetros (30-40 permitidos). Por defecto 35. |
| `--mode verifactu\|on-request` | Selecciona la familia de URLs base de la AEAT.        |
| `--env pre\|prod`| Entorno para la URL base.                                           |
| `--language es\|en\|...` | Parámetro de query `Idioma` opcional.                       |

### `verifactu validate`

Ejecuta el validador local (Zod + 23 reglas) contra un fichero JSON sin
contactar con la AEAT.

```bash
bunx verifactu validate invoices.json
```

Devuelve código de salida `0` en éxito, `3` ante cualquier incidencia de
nivel rechazo. Usa `--admissible-fails` para fallar también ante advertencias
sólo admisibles (útil en CI).

## Formato de entrada JSON

El fichero JSON puede contener una sola factura (objeto) o un array de
facturas. La forma encaja con `Invoice` de `verifactu-sdk` — consulta la
referencia API. Ejemplo mínimo:

```json
{
  "invoiceId": {
    "issuerNif": "B12345678",
    "seriesNumber": "A/2026/0001",
    "issueDate": "2026-05-20"
  },
  "invoiceType": "F1",
  "issuerName": "My Company SL",
  "description": "Servicios de consultoría",
  "recipients": [{ "nif": "12345678Z", "legalName": "Customer SL" }],
  "breakdown": [
    {
      "tax": "01",
      "regimeKey": "01",
      "operationQualification": "S1",
      "taxRate": "21",
      "taxBase": "100.00",
      "taxAmount": "21.00"
    }
  ],
  "totalTaxAmount": "21.00",
  "totalAmount": "121.00",
  "generatedAt": "2026-05-20T10:00:00+02:00",
  "billingSystem": {
    "producerName": "My Company SL",
    "nif": "B12345678",
    "systemId": "JC",
    "systemName": "My App",
    "version": "1.0.0",
    "installationNumber": "0001",
    "onlyVerifactu": "S",
    "multipleTaxpayer": "N",
    "hasMultipleTaxpayers": "N"
  },
  "chainLink": { "first": true },
  "hash": ""
}
```

Puedes dejar `hash` vacío — `send` lo recomputa antes del envío. Lo mismo
aplica a `chainLink.previousHash`: el SDK lo rellena desde el estado local
de la cadena.

## Variables de entorno

| Variable          | Propósito                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `VERIFACTU_PASS`  | Passphrase usado cuando se omite `--pass`.                       |
| `VERIFACTU_DEBUG` | Define a `1` para imprimir el sobre SOAP y la respuesta a stderr.|
| `VERIFACTU_E2E`   | Activa la suite e2e opt-in. Consulta [Pruebas](./testing.md).    |

## Ver también

- [Inicio rápido](./quickstart.md) — las mismas operaciones expuestas vía librería.
- [Pruebas](./testing.md) — ejecutar la suite e2e contra pre-producción de la AEAT.
