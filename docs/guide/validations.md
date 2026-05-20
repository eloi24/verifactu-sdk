# Validations

The SDK enforces locally every validation listed in [*Validaciones y errores
del servicio* v1.2.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf).
This lets you catch malformed records before spending a SOAP call — the AEAT
returns the same diagnostics it would have returned, but in microseconds.

## Calling the validator

```ts
import {
  validateInvoiceForRegister,
  validateInvoiceForCancel,
} from 'verifactu-sdk/validators';

const issues = validateInvoiceForRegister(invoice);
if (issues.some((i) => i.severity === 'rejection')) {
  throw new BusinessValidationError('Invoice rejected', { code: issues[0]!.code });
}
```

Each returned `ValidationResult` carries:

- `code` — the closest matching AEAT error code from the catalog.
- `field` — dotted path of the offending field (e.g. `breakdown.0.taxRate`).
- `severity` — `'rejection'` rejects the record, `'admissible'` accepts it
  with a warning.
- `message` — short English description of the violation.

`VerifactuClient.registerInvoice` runs the validator automatically and throws
`BusinessValidationError` on rejection; you only call the validator directly
when you want to inspect every issue at once.

## The 23 rules

The validator implements one or more checks per AEAT rule. The mapping is:

<table>
  <thead>
    <tr><th>Rule</th><th>Field group</th><th>What it checks</th><th>Severity</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>IDFactura</code></td><td>NIF format, NumSerieFactura allowed chars, FechaExpedicion ≥ 28-10-2024 and ±20 years from today.</td><td>Rejection</td></tr>
    <tr><td>2</td><td><code>RechazoPrevio</code> + <code>Subsanacion</code></td><td>Coherent combinations only (N, S, X).</td><td>Rejection</td></tr>
    <tr><td>3</td><td><code>TipoRectificativa</code></td><td>Mandatory iff <code>TipoFactura</code> starts with <code>R</code>.</td><td>Rejection</td></tr>
    <tr><td>4</td><td><code>FacturasRectificadas</code></td><td>Only allowed on R-type invoices.</td><td>Rejection</td></tr>
    <tr><td>5</td><td><code>FacturasSustituidas</code></td><td>Only allowed on F3 invoices.</td><td>Rejection</td></tr>
    <tr><td>6</td><td><code>ImporteRectificacion</code></td><td>Required when <code>TipoRectificativa = S</code>.</td><td>Rejection</td></tr>
    <tr><td>7</td><td><code>FechaOperacion</code></td><td>±20 years vs. issue date, special rules for ClaveRegimen 14/15.</td><td>Rejection</td></tr>
    <tr><td>8</td><td><code>FacturaSimplificadaArt7273</code></td><td>Only on F1/F3/R1/R2/R3/R4.</td><td>Rejection</td></tr>
    <tr><td>9</td><td><code>FacturaSinIdentifDestinatarioArt61d</code></td><td>Only on F2/R5.</td><td>Rejection</td></tr>
    <tr><td>10</td><td><code>Macrodato</code></td><td>Mandatory when <code>ImporteTotal ≥ 100 000 000 €</code>.</td><td>Rejection</td></tr>
    <tr><td>11</td><td><code>EmitidaPorTerceroODestinatario</code></td><td>Coherence with <code>Tercero</code> / <code>Destinatarios</code>.</td><td>Rejection</td></tr>
    <tr><td>12</td><td><code>Tercero</code></td><td>NIF format, distinct from emitter, NIF-IVA per country structure.</td><td>Rejection</td></tr>
    <tr><td>13</td><td><code>Destinatarios</code></td><td>Required for F1/F3/R1/R2/R3/R4; forbidden for F2/R5; NIF format; NIF-IVA structure.</td><td>Rejection</td></tr>
    <tr><td>14</td><td><code>Cupon</code></td><td>Only allowed when <code>TipoFactura</code> is R1 or R5.</td><td>Rejection</td></tr>
    <tr><td>15.1</td><td><code>Desglose.TipoImpositivo</code></td><td>Allowed rate by date (per AEAT historic-rate table).</td><td>Rejection</td></tr>
    <tr><td>15.2</td><td><code>BaseImponibleACoste</code></td><td>Only allowed when ClaveRegimen = 06 or Impuesto in 02/05.</td><td>Rejection</td></tr>
    <tr><td>15.3</td><td><code>TipoRecargoEquivalencia</code></td><td>Valid pair with <code>TipoImpositivo</code> (21/5.2, 10/1.4, …).</td><td>Rejection</td></tr>
    <tr><td>15.4</td><td><code>CalificacionOperacion</code></td><td>S1/S2/N1/N2; mutual exclusion with <code>OperacionExenta</code>.</td><td>Rejection</td></tr>
    <tr><td>15.5</td><td><code>OperacionExenta</code></td><td>E1–E6 (IVA); E7/E8 only for IGIC; coherence with TipoFactura.</td><td>Rejection</td></tr>
    <tr><td>15.6</td><td><code>ClaveRegimen</code></td><td>01–21 with sub-rules for 02/03/04/06/07/08/10/11/14/20/21.</td><td>Rejection</td></tr>
    <tr><td>15.7</td><td><code>CuotaRepercutida</code></td><td><code>base × rate</code> with ±10 € tolerance (≤ 3 000 € for simplified).</td><td>Rejection</td></tr>
    <tr><td>16</td><td><code>CuotaTotal</code></td><td>Sum of repercussed amounts with ±10 € tolerance.</td><td>Rejection</td></tr>
    <tr><td>17</td><td><code>ImporteTotal</code></td><td>Sum of bases + tax + surcharge with ±10 € tolerance.</td><td>Rejection</td></tr>
    <tr><td>18</td><td><code>Huella anterior</code></td><td>64 uppercase hex chars when present.</td><td>Admissible (2003)</td></tr>
    <tr><td>19</td><td><code>SistemaInformatico</code></td><td>SystemId 2 chars [A-Z0-9] excluding Ñ; <code>TipoUsoPosibleSoloVerifactu</code> / <code>MultiOT</code> coherence.</td><td>Rejection</td></tr>
    <tr><td>20</td><td><code>FechaHoraHusoGenRegistro</code></td><td>Valid ISO 8601 with offset; not in the far future.</td><td>Rejection / Admissible</td></tr>
    <tr><td>21</td><td><code>NumRegistroAcuerdoFacturacion</code></td><td>≤ 15 chars, allowed character set.</td><td>Rejection</td></tr>
    <tr><td>22</td><td><code>IdAcuerdoSistemaInformatico</code></td><td>≤ 16 chars, allowed character set.</td><td>Rejection</td></tr>
    <tr><td>23</td><td><code>Huella</code></td><td>64 uppercase hex chars.</td><td>Admissible (1292)</td></tr>
  </tbody>
</table>

## NIF, NIE, CIF

The local validator covers the three Spanish identifier shapes and the check
digit:

- **DNI**: 8 digits + control letter computed from the modulo-23 table.
- **NIE**: `X|Y|Z` prefix + 7 digits + control letter, same table.
- **CIF**: letter + 7 digits + control digit/letter (mixed modulo-10 and
  modulo-11 algorithm per AEAT spec).

## NIF-IVA (EU)

The validator covers the 28 historic EU member states plus Northern Ireland
(GB/XI) with Brexit-aware date handling. The structures and the per-country
rules are loaded from `validators/nifIva.ts`. Examples:

| Country | Code | Structure                            |
| ------- | ---- | ------------------------------------ |
| Germany | DE   | 9 digits                             |
| France  | FR   | 11 chars (2 alphanumeric + 9 digits) |
| Italy   | IT   | 11 digits                            |
| Portugal| PT   | 9 digits                             |
| Netherlands | NL | 12 chars                           |
| UK      | GB   | 9 / 12 digits; valid only ≤ 31-12-2020 (post-Brexit, use XI) |
| Northern Ireland | XI | 9 / 12 digits; valid only ≥ 01-01-2021 |

The validator accepts `country=ES` for completeness, but Spanish NIFs go
through the local NIF/CIF path instead.

## Severity

The AEAT distinguishes three severities:

- `envelope` — the entire submission is rejected (codes 4xxx, set by the
  service after parsing the SOAP envelope).
- `record` — only the offending record is rejected (codes 1xxx and 3xxx).
- `admissible` — the record is accepted but flagged for *subsanación*
  (codes 2xxx).

The local validator returns the first two as `severity: 'rejection'` and the
third as `severity: 'admissible'`. Envelope errors come from the wire layer
and never appear in the local result.

## Next

- [Error codes](./error-codes.md) — full catalog of codes with the verbatim
  Spanish text from `errores.properties`.
- [Hash chain](./hash-chain.md)
