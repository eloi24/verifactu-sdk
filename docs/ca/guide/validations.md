# Validacions

El SDK aplica localment totes les validacions llistades a [*Validaciones y
errores del servicio* v1.2.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf).
Això et permet caçar registres mal formats abans de gastar una crida SOAP —
l'AEAT retornaria el mateix diagnòstic, però en microsegons.

## Cridar el validador

```ts
import {
  validateInvoiceForRegister,
  validateInvoiceForCancel,
} from 'verifactu-sdk/validators';

const issues = validateInvoiceForRegister(invoice);
if (issues.some((i) => i.severity === 'rejection')) {
  throw new BusinessValidationError('Factura rebutjada', { code: issues[0]!.code });
}
```

Cada `ValidationResult` retornat porta:

- `code` — el codi d'error de l'AEAT més proper del catàleg.
- `field` — ruta amb punts del camp en conflicte (p. ex. `breakdown.0.taxRate`).
- `severity` — `'rejection'` rebutja el registre, `'admissible'` l'accepta
  amb advertència.
- `message` — descripció curta en anglès de la incidència.

`VerifactuClient.registerInvoice` executa el validador automàticament i
llança `BusinessValidationError` en cas de rebuig; només crides el validador
directament quan vols inspeccionar totes les incidències alhora.

## Les 23 regles

El validador implementa una o més comprovacions per regla de l'AEAT. La
correspondència és:

<table>
  <thead>
    <tr><th>Regla</th><th>Grup de camps</th><th>Què comprova</th><th>Severitat</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>IDFactura</code></td><td>Format del NIF, caràcters permesos a NumSerieFactura, FechaExpedicion ≥ 28-10-2024 i ±20 anys respecte a avui.</td><td>Rebuig</td></tr>
    <tr><td>2</td><td><code>RechazoPrevio</code> + <code>Subsanacion</code></td><td>Només combinacions coherents (N, S, X).</td><td>Rebuig</td></tr>
    <tr><td>3</td><td><code>TipoRectificativa</code></td><td>Obligatòria només si <code>TipoFactura</code> comença per <code>R</code>.</td><td>Rebuig</td></tr>
    <tr><td>4</td><td><code>FacturasRectificadas</code></td><td>Només permesa en factures tipus R.</td><td>Rebuig</td></tr>
    <tr><td>5</td><td><code>FacturasSustituidas</code></td><td>Només permesa en factures F3.</td><td>Rebuig</td></tr>
    <tr><td>6</td><td><code>ImporteRectificacion</code></td><td>Obligatori quan <code>TipoRectificativa = S</code>.</td><td>Rebuig</td></tr>
    <tr><td>7</td><td><code>FechaOperacion</code></td><td>±20 anys respecte a la data d'expedició, regles especials per a ClaveRegimen 14/15.</td><td>Rebuig</td></tr>
    <tr><td>8</td><td><code>FacturaSimplificadaArt7273</code></td><td>Només a F1/F3/R1/R2/R3/R4.</td><td>Rebuig</td></tr>
    <tr><td>9</td><td><code>FacturaSinIdentifDestinatarioArt61d</code></td><td>Només a F2/R5.</td><td>Rebuig</td></tr>
    <tr><td>10</td><td><code>Macrodato</code></td><td>Obligatori si <code>ImporteTotal ≥ 100 000 000 €</code>.</td><td>Rebuig</td></tr>
    <tr><td>11</td><td><code>EmitidaPorTerceroODestinatario</code></td><td>Coherència amb <code>Tercero</code> / <code>Destinatarios</code>.</td><td>Rebuig</td></tr>
    <tr><td>12</td><td><code>Tercero</code></td><td>Format NIF, diferent de l'emissor, estructura NIF-IVA per país.</td><td>Rebuig</td></tr>
    <tr><td>13</td><td><code>Destinatarios</code></td><td>Obligatoris per a F1/F3/R1/R2/R3/R4; prohibits per a F2/R5; format NIF; estructura NIF-IVA.</td><td>Rebuig</td></tr>
    <tr><td>14</td><td><code>Cupon</code></td><td>Només permès quan <code>TipoFactura</code> és R1 o R5.</td><td>Rebuig</td></tr>
    <tr><td>15.1</td><td><code>Desglose.TipoImpositivo</code></td><td>Tipus permès per data (segons taula històrica de l'AEAT).</td><td>Rebuig</td></tr>
    <tr><td>15.2</td><td><code>BaseImponibleACoste</code></td><td>Només quan ClaveRegimen = 06 o Impuesto a 02/05.</td><td>Rebuig</td></tr>
    <tr><td>15.3</td><td><code>TipoRecargoEquivalencia</code></td><td>Parella vàlida amb <code>TipoImpositivo</code> (21/5.2, 10/1.4, …).</td><td>Rebuig</td></tr>
    <tr><td>15.4</td><td><code>CalificacionOperacion</code></td><td>S1/S2/N1/N2; mútuament excloent amb <code>OperacionExenta</code>.</td><td>Rebuig</td></tr>
    <tr><td>15.5</td><td><code>OperacionExenta</code></td><td>E1-E6 (IVA); E7/E8 només per a IGIC; coherència amb TipoFactura.</td><td>Rebuig</td></tr>
    <tr><td>15.6</td><td><code>ClaveRegimen</code></td><td>01-21 amb sub-regles per a 02/03/04/06/07/08/10/11/14/20/21.</td><td>Rebuig</td></tr>
    <tr><td>15.7</td><td><code>CuotaRepercutida</code></td><td><code>base × tipus</code> amb tolerància ±10 € (≤ 3 000 € per a simplificades).</td><td>Rebuig</td></tr>
    <tr><td>16</td><td><code>CuotaTotal</code></td><td>Suma de quotes repercutides amb tolerància ±10 €.</td><td>Rebuig</td></tr>
    <tr><td>17</td><td><code>ImporteTotal</code></td><td>Suma de bases + impost + recàrrec amb tolerància ±10 €.</td><td>Rebuig</td></tr>
    <tr><td>18</td><td><code>Huella anterior</code></td><td>64 caràcters hex en majúscules quan és present.</td><td>Admissible (2003)</td></tr>
    <tr><td>19</td><td><code>SistemaInformatico</code></td><td>SystemId 2 caràcters [A-Z0-9] excloent Ñ; coherència <code>TipoUsoPosibleSoloVerifactu</code> / <code>MultiOT</code>.</td><td>Rebuig</td></tr>
    <tr><td>20</td><td><code>FechaHoraHusoGenRegistro</code></td><td>ISO 8601 vàlid amb offset; no en futur llunyà.</td><td>Rebuig / Admissible</td></tr>
    <tr><td>21</td><td><code>NumRegistroAcuerdoFacturacion</code></td><td>≤ 15 caràcters, joc de caràcters permès.</td><td>Rebuig</td></tr>
    <tr><td>22</td><td><code>IdAcuerdoSistemaInformatico</code></td><td>≤ 16 caràcters, joc de caràcters permès.</td><td>Rebuig</td></tr>
    <tr><td>23</td><td><code>Huella</code></td><td>64 caràcters hex en majúscules.</td><td>Admissible (1292)</td></tr>
  </tbody>
</table>

## NIF, NIE, CIF

El validador local cobreix les tres formes d'identificador espanyol i el
dígit de control:

- **DNI**: 8 dígits + lletra de control calculada per la taula mod-23.
- **NIE**: prefix `X|Y|Z` + 7 dígits + lletra de control, mateixa taula.
- **CIF**: lletra + 7 dígits + dígit/lletra de control (algorisme mixt
  mod-10 / mod-11 segons l'especificació AEAT).

## NIF-IVA (UE)

El validador cobreix els 28 estats membres històrics de la UE més Irlanda del
Nord (GB/XI) amb gestió Brexit conscient de dates. Les estructures i les
regles per país es carreguen de `validators/nifIva.ts`. Exemples:

| País      | Codi | Estructura                            |
| --------- | ---- | ------------------------------------- |
| Alemanya  | DE   | 9 dígits                              |
| França    | FR   | 11 caràcters (2 alfanumèrics + 9 dígits) |
| Itàlia    | IT   | 11 dígits                             |
| Portugal  | PT   | 9 dígits                              |
| Països Baixos | NL | 12 caràcters                        |
| Regne Unit| GB   | 9 / 12 dígits; vàlid només ≤ 31-12-2020 (post-Brexit, usar XI) |
| Irlanda del Nord | XI | 9 / 12 dígits; vàlid només ≥ 01-01-2021 |

El validador accepta `country=ES` per completesa, però els NIFs espanyols
passen per la ruta local de NIF/CIF.

## Severitat

L'AEAT distingeix tres severitats:

- `envelope` — es rebutja l'enviament complet (codis 4xxx, els posa el
  servei després de parsejar el sobre SOAP).
- `record` — només es rebutja el registre afectat (codis 1xxx i 3xxx).
- `admissible` — el registre s'accepta però es marca per a *subsanación*
  (codis 2xxx).

El validador local retorna els dos primers com `severity: 'rejection'` i el
tercer com `severity: 'admissible'`. Els errors d'envelope vénen del nivell
de cable i mai no apareixen al resultat local.

## Següent

- [Codis d'error](./error-codes.md) — catàleg complet de codis amb el text
  literal en castellà d'`errores.properties`.
- [Cadena d'empremtes](./hash-chain.md)
