# Command-line interface

The SDK ships a `verifactu` CLI that exposes the same primitives as the
library, in a form fit for shell scripts, cron jobs and one-off operations.
It is installed as a bin script in the package, so once you `bun add
verifactu-sdk` it is available via your runner of choice:

```bash
bunx verifactu --help
npx verifactu --help
```

## Subcommands

```
verifactu send       Submit a JSON file of invoices to the AEAT
verifactu query      Paginated query against the AEAT (verifactu mode only)
verifactu qr         Render the mandatory tax QR for an invoice
verifactu validate   Validate a JSON file against the schemas + the 23 rules
```

Every subcommand reads its main input from a JSON file. The file must conform
to the public `Invoice` / `CancelInvoiceInput` shapes (see the
[API reference](../api/)). Use `verifactu validate` to lint a file before
sending it.

### `verifactu send`

Submits one or more invoices.

```bash
bunx verifactu send invoices.json \
  --env pre \
  --mode verifactu \
  --cert ./cert.pfx \
  --pass "$CERT_PASS" \
  --nif B12345678 \
  --representative B99999999
```

Options:

| Flag                    | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `--env pre\|prod`       | Environment. Defaults to `pre`.                                      |
| `--mode verifactu\|on-request` | Submission mode. Defaults to `verifactu`.                     |
| `--cert <path>`         | Path to a `.pfx` certificate. Required.                              |
| `--pass <password>`     | Certificate passphrase. Reads `$VERIFACTU_PASS` if omitted.          |
| `--nif <NIF>`           | Taxpayer NIF. Required.                                              |
| `--representative <NIF>`| Optional representative NIF.                                         |
| `--with-seal`           | Use the sello-electrónico URL pool.                                  |
| `--dry-run`             | Run the local validator, print the envelope, do not submit.          |

Exit codes:

- `0` — every record accepted (`Correcto`).
- `1` — partial acceptance (`ParcialmenteCorrecto`).
- `2` — envelope rejection (`Incorrecto`).
- `3` — local validation failure.

### `verifactu query`

Paginated query of previously submitted records. Available only under
`verifactu` mode.

```bash
bunx verifactu query --year 2026 --period 05 --env pre --cert ./cert.pfx
```

Options:

| Flag             | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `--year YYYY`    | Fiscal year. Required.                                              |
| `--period MM`    | Period (`01`-`12`). Required.                                       |
| `--series PATTERN` | Optional series filter.                                           |
| `--counterpart NIF` | Optional counterpart NIF filter.                                 |
| `--ext-ref REF`  | Optional external-reference filter.                                 |
| `--json`         | Emit raw JSON instead of a table.                                   |

### `verifactu qr`

Renders the mandatory tax QR.

```bash
bunx verifactu qr invoice.json --out qr.png --size 35
```

Options:

| Flag             | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `--out <path>`   | Output file. Format inferred from extension (`.png`, `.svg`).       |
| `--size <mm>`    | Side of the QR square in millimetres (30-40 allowed). Default 35.   |
| `--mode verifactu\|on-request` | Selects the AEAT base URL family.                     |
| `--env pre\|prod`| Environment for the base URL.                                       |
| `--language es\|en\|...` | Optional `Idioma` query-string parameter.                   |

### `verifactu validate`

Runs the local validator (Zod + 23 business rules) against a JSON file
without contacting the AEAT.

```bash
bunx verifactu validate invoices.json
```

Returns exit code `0` on success, `3` on any rejection-level issue. Use
`--admissible-fails` to also fail on admissible-only warnings (useful in CI).

## JSON input format

The JSON file may contain a single invoice (object) or an array of invoices.
The shape matches `Invoice` from `verifactu-sdk` — see the API reference. A
minimal example:

```json
{
  "invoiceId": {
    "issuerNif": "B12345678",
    "seriesNumber": "A/2026/0001",
    "issueDate": "2026-05-20"
  },
  "invoiceType": "F1",
  "issuerName": "My Company SL",
  "description": "Consulting services",
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

You can leave `hash` empty — `send` recomputes it before submission. The same
applies to `chainLink.previousHash`: the SDK fills it in from the local chain
state.

## Environment variables

| Variable          | Purpose                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `VERIFACTU_PASS`  | Passphrase used when `--pass` is omitted.                        |
| `VERIFACTU_DEBUG` | Set to `1` to print the SOAP envelope and response to stderr.    |
| `VERIFACTU_E2E`   | Enables the opt-in e2e test suite. See [Testing](./testing.md).  |

## See also

- [Quickstart](./quickstart.md) — the same operations exposed via the library.
- [Testing](./testing.md) — running the e2e suite against AEAT pre-production.
