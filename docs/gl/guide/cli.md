# Interface de liña de comandos

O SDK inclúe un CLI `verifactu` que expón as mesmas primitivas que a
biblioteca en formato apto para scripts de shell, xobs cron e operacións
puntuais. Instálase como bin script no paquete, así que tras
`bun add verifactu-sdk` queda dispoñible vía o teu runner preferido:

```bash
bunx verifactu --help
npx verifactu --help
```

## Subcomandos

```
verifactu send       Envía un ficheiro JSON de facturas á AEAT
verifactu query      Consulta paxinada contra a AEAT (só modo verifactu)
verifactu qr         Renderiza o QR fiscal obrigatorio para unha factura
verifactu validate   Valida un ficheiro JSON contra os schemas + as 23 regras
```

Cada subcomando le a súa entrada principal dun ficheiro JSON. O ficheiro
debe respectar as formas públicas `Invoice` / `CancelInvoiceInput`
(consulta a [referencia API](/api/)). Usa `verifactu validate` para
revisar un ficheiro antes de envialo.

### `verifactu send`

Envía unha ou máis facturas.

```bash
bunx verifactu send invoices.json \
  --env pre \
  --mode verifactu \
  --cert ./cert.pfx \
  --pass "$CERT_PASS" \
  --nif B12345678 \
  --representative B99999999
```

Opcións:

| Flag                    | Descrición                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| `--env pre\|prod`       | Ambiente. Por defecto `pre`.                                         |
| `--mode verifactu\|on-request` | Modo de remisión. Por defecto `verifactu`.                    |
| `--cert <ruta>`         | Ruta a un certificado `.pfx`. Obrigatorio.                           |
| `--pass <password>`     | Passphrase do certificado. Le `$VERIFACTU_PASS` se se omite.         |
| `--nif <NIF>`           | NIF do obrigado. Obrigatorio.                                        |
| `--representative <NIF>`| NIF do representante (opcional).                                     |
| `--with-seal`           | Usa o pool de URLs de selo electrónico.                              |
| `--dry-run`             | Executa o validador local, imprime o sobre, non envía.               |

Códigos de saída:

- `0` — todos os rexistros aceptados (`Correcto`).
- `1` — aceptación parcial (`ParcialmenteCorrecto`).
- `2` — rexeitamento de envelope (`Incorrecto`).
- `3` — fallo de validación local.

### `verifactu query`

Consulta paxinada de rexistros xa enviados. Dispoñible só en modo
`verifactu`.

```bash
bunx verifactu query --year 2026 --period 05 --env pre --cert ./cert.pfx
```

Opcións:

| Flag             | Descrición                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `--year YYYY`    | Exercicio. Obrigatorio.                                             |
| `--period MM`    | Período (`01`-`12`). Obrigatorio.                                   |
| `--series PATTERN` | Filtro opcional por serie.                                        |
| `--counterpart NIF` | Filtro opcional polo NIF da contraparte.                         |
| `--ext-ref REF`  | Filtro opcional por referencia externa.                             |
| `--json`         | Emite JSON cru no canto dunha táboa.                                |

### `verifactu qr`

Renderiza o QR fiscal obrigatorio.

```bash
bunx verifactu qr invoice.json --out qr.png --size 35
```

Opcións:

| Flag             | Descrición                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `--out <ruta>`   | Ficheiro de saída. Formato inferido por extensión (`.png`, `.svg`). |
| `--size <mm>`    | Lado do cadrado do QR en milímetros (30-40 permitidos). Por defecto 35. |
| `--mode verifactu\|on-request` | Selecciona a familia de URLs base da AEAT.            |
| `--env pre\|prod`| Ambiente para a URL base.                                           |
| `--language es\|en\|...` | Parámetro de query `Idioma` opcional.                       |

### `verifactu validate`

Executa o validador local (Zod + 23 regras) contra un ficheiro JSON sen
contactar coa AEAT.

```bash
bunx verifactu validate invoices.json
```

Devolve código de saída `0` en éxito, `3` ante calquera incidencia de
nivel rexeitamento. Usa `--admissible-fails` para fallar tamén ante
advertencias só admisibles (útil en CI).

## Formato de entrada JSON

O ficheiro JSON pode conter unha soa factura (obxecto) ou un array de
facturas. A forma coincide con `Invoice` de `verifactu-sdk` — consulta a
referencia API. Exemplo mínimo:

```json
{
  "invoiceId": {
    "issuerNif": "B12345678",
    "seriesNumber": "A/2026/0001",
    "issueDate": "2026-05-20"
  },
  "invoiceType": "F1",
  "issuerName": "My Company SL",
  "description": "Servizos de consultoría",
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

Podes deixar `hash` baleiro — `send` recálcao antes do envío. O mesmo
aplica a `chainLink.previousHash`: o SDK énche o desde o estado local
da cadea.

## Variables de ambiente

| Variable          | Propósito                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `VERIFACTU_PASS`  | Passphrase usado cando se omite `--pass`.                        |
| `VERIFACTU_DEBUG` | Define a `1` para imprimir o sobre SOAP e a resposta a stderr.   |
| `VERIFACTU_E2E`   | Activa a suite e2e opt-in. Consulta [Probas](./testing.md).      |

## Ver tamén

- [Inicio rápido](./quickstart.md) — as mesmas operacións expostas vía biblioteca.
- [Probas](./testing.md) — executar a suite e2e contra pre-produción da AEAT.
