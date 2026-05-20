# Interfície de línia d'ordres

El SDK inclou un CLI `verifactu` que exposa les mateixes primitives que la
biblioteca en format apte per a scripts de shell, jobs cron i operacions
puntuals. S'instal·la com a bin script al paquet, així que després de
`bun add verifactu-sdk` queda disponible via el teu runner preferit:

```bash
bunx verifactu --help
npx verifactu --help
```

## Subordres

```
verifactu send       Envia un fitxer JSON de factures a l'AEAT
verifactu query      Consulta paginada contra l'AEAT (només mode verifactu)
verifactu qr         Renderitza el QR fiscal obligatori per a una factura
verifactu validate   Valida un fitxer JSON contra els schemas + les 23 regles
```

Cada subordre llegeix la seva entrada principal d'un fitxer JSON. El fitxer
ha de respectar les formes públiques `Invoice` / `CancelInvoiceInput`
(consulta la [referència API](/api/)). Fes servir `verifactu validate`
per revisar un fitxer abans d'enviar-lo.

### `verifactu send`

Envia una o més factures.

```bash
bunx verifactu send invoices.json \
  --env pre \
  --mode verifactu \
  --cert ./cert.pfx \
  --pass "$CERT_PASS" \
  --nif B12345678 \
  --representative B99999999
```

Opcions:

| Flag                    | Descripció                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| `--env pre\|prod`       | Entorn. Per defecte `pre`.                                           |
| `--mode verifactu\|on-request` | Mode de remissió. Per defecte `verifactu`.                    |
| `--cert <ruta>`         | Ruta a un certificat `.pfx`. Obligatori.                             |
| `--pass <password>`     | Passphrase del certificat. Llegeix `$VERIFACTU_PASS` si s'omet.      |
| `--nif <NIF>`           | NIF de l'obligat. Obligatori.                                        |
| `--representative <NIF>`| NIF del representant (opcional).                                     |
| `--with-seal`           | Usa el pool d'URLs de segell electrònic.                             |
| `--dry-run`             | Executa el validador local, imprimeix el sobre, no envia.            |

Codis de sortida:

- `0` — tots els registres acceptats (`Correcto`).
- `1` — acceptació parcial (`ParcialmenteCorrecto`).
- `2` — rebuig d'envelope (`Incorrecto`).
- `3` — fallada de validació local.

### `verifactu query`

Consulta paginada de registres ja enviats. Disponible només en mode
`verifactu`.

```bash
bunx verifactu query --year 2026 --period 05 --env pre --cert ./cert.pfx
```

Opcions:

| Flag             | Descripció                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `--year YYYY`    | Exercici. Obligatori.                                               |
| `--period MM`    | Període (`01`-`12`). Obligatori.                                    |
| `--series PATTERN` | Filtre opcional per sèrie.                                        |
| `--counterpart NIF` | Filtre opcional pel NIF de la contrapart.                        |
| `--ext-ref REF`  | Filtre opcional per referència externa.                             |
| `--json`         | Emet JSON cru en lloc d'una taula.                                  |

### `verifactu qr`

Renderitza el QR fiscal obligatori.

```bash
bunx verifactu qr invoice.json --out qr.png --size 35
```

Opcions:

| Flag             | Descripció                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `--out <ruta>`   | Fitxer de sortida. Format inferit per extensió (`.png`, `.svg`).    |
| `--size <mm>`    | Costat del quadrat del QR en mil·límetres (30-40 permesos). Per defecte 35. |
| `--mode verifactu\|on-request` | Selecciona la família d'URLs base de l'AEAT.          |
| `--env pre\|prod`| Entorn per a l'URL base.                                            |
| `--language es\|en\|...` | Paràmetre de query `Idioma` opcional.                       |

### `verifactu validate`

Executa el validador local (Zod + 23 regles) contra un fitxer JSON sense
contactar amb l'AEAT.

```bash
bunx verifactu validate invoices.json
```

Retorna codi de sortida `0` en èxit, `3` davant qualsevol incidència de
nivell rebuig. Fes servir `--admissible-fails` per fallar també davant
advertències només admissibles (útil en CI).

## Format d'entrada JSON

El fitxer JSON pot contenir una sola factura (objecte) o un array de
factures. La forma coincideix amb `Invoice` de `verifactu-sdk` — consulta
la referència API. Exemple mínim:

```json
{
  "invoiceId": {
    "issuerNif": "B12345678",
    "seriesNumber": "A/2026/0001",
    "issueDate": "2026-05-20"
  },
  "invoiceType": "F1",
  "issuerName": "My Company SL",
  "description": "Serveis de consultoria",
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

Pots deixar `hash` buit — `send` el recomputa abans de l'enviament. El
mateix s'aplica a `chainLink.previousHash`: el SDK l'omple des de l'estat
local de la cadena.

## Variables d'entorn

| Variable          | Propòsit                                                         |
| ----------------- | ---------------------------------------------------------------- |
| `VERIFACTU_PASS`  | Passphrase usada quan s'omet `--pass`.                           |
| `VERIFACTU_DEBUG` | Defineix a `1` per imprimir el sobre SOAP i la resposta a stderr.|
| `VERIFACTU_E2E`   | Activa la suite e2e opt-in. Consulta [Proves](./testing.md).     |

## Veure també

- [Inici ràpid](./quickstart.md) — les mateixes operacions exposades via biblioteca.
- [Proves](./testing.md) — executar la suite e2e contra preproducció de l'AEAT.
