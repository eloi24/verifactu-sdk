# Validacións

O SDK aplica localmente todas as validacións listadas en [*Validaciones y
errores del servicio* v1.2.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf).
Isto permíteche cazar rexistros mal formados antes de gastar unha chamada
SOAP — a AEAT devolvería o mesmo diagnóstico, pero en microsegundos.

## Chamar ao validador

```ts
import {
  validateInvoiceForRegister,
  validateInvoiceForCancel,
} from 'verifactu-sdk/validators';

const issues = validateInvoiceForRegister(invoice);
if (issues.some((i) => i.severity === 'rejection')) {
  throw new BusinessValidationError('Factura rexeitada', { code: issues[0]!.code });
}
```

Cada `ValidationResult` devolto leva:

- `code` — o código de erro da AEAT máis próximo do catálogo.
- `field` — ruta con puntos do campo en conflito (p. ex. `breakdown.0.taxRate`).
- `severity` — `'rejection'` rexeita o rexistro, `'admissible'` acéptao
  con advertencia.
- `message` — descrición curta en inglés da incidencia.

`VerifactuClient.registerInvoice` executa o validador automaticamente e
lanza `BusinessValidationError` en caso de rexeitamento; só chamas ao
validador directamente cando queres inspeccionar todas as incidencias á
vez.

## As 23 regras

O validador implementa unha ou máis comprobacións por regra da AEAT. A
correspondencia é:

<table>
  <thead>
    <tr><th>Regra</th><th>Grupo de campos</th><th>Que comproba</th><th>Severidade</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>IDFactura</code></td><td>Formato do NIF, caracteres permitidos en NumSerieFactura, FechaExpedicion ≥ 28-10-2024 e ±20 anos respecto a hoxe.</td><td>Rexeitamento</td></tr>
    <tr><td>2</td><td><code>RechazoPrevio</code> + <code>Subsanacion</code></td><td>Só combinacións coherentes (N, S, X).</td><td>Rexeitamento</td></tr>
    <tr><td>3</td><td><code>TipoRectificativa</code></td><td>Obrigatoria só se <code>TipoFactura</code> empeza por <code>R</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>4</td><td><code>FacturasRectificadas</code></td><td>Só permitida en facturas tipo R.</td><td>Rexeitamento</td></tr>
    <tr><td>5</td><td><code>FacturasSustituidas</code></td><td>Só permitida en facturas F3.</td><td>Rexeitamento</td></tr>
    <tr><td>6</td><td><code>ImporteRectificacion</code></td><td>Obrigatorio cando <code>TipoRectificativa = S</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>7</td><td><code>FechaOperacion</code></td><td>±20 anos respecto á data de expedición, regras especiais para ClaveRegimen 14/15.</td><td>Rexeitamento</td></tr>
    <tr><td>8</td><td><code>FacturaSimplificadaArt7273</code></td><td>Só en F1/F3/R1/R2/R3/R4.</td><td>Rexeitamento</td></tr>
    <tr><td>9</td><td><code>FacturaSinIdentifDestinatarioArt61d</code></td><td>Só en F2/R5.</td><td>Rexeitamento</td></tr>
    <tr><td>10</td><td><code>Macrodato</code></td><td>Obrigatorio se <code>ImporteTotal ≥ 100 000 000 €</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>11</td><td><code>EmitidaPorTerceroODestinatario</code></td><td>Coherencia con <code>Tercero</code> / <code>Destinatarios</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>12</td><td><code>Tercero</code></td><td>Formato NIF, distinto do emisor, estrutura NIF-IVA por país.</td><td>Rexeitamento</td></tr>
    <tr><td>13</td><td><code>Destinatarios</code></td><td>Obrigatorios para F1/F3/R1/R2/R3/R4; prohibidos para F2/R5; formato NIF; estrutura NIF-IVA.</td><td>Rexeitamento</td></tr>
    <tr><td>14</td><td><code>Cupon</code></td><td>Só permitido cando <code>TipoFactura</code> é R1 ou R5.</td><td>Rexeitamento</td></tr>
    <tr><td>15.1</td><td><code>Desglose.TipoImpositivo</code></td><td>Tipo permitido por data (segundo táboa histórica da AEAT).</td><td>Rexeitamento</td></tr>
    <tr><td>15.2</td><td><code>BaseImponibleACoste</code></td><td>Só cando ClaveRegimen = 06 ou Impuesto en 02/05.</td><td>Rexeitamento</td></tr>
    <tr><td>15.3</td><td><code>TipoRecargoEquivalencia</code></td><td>Parella válida con <code>TipoImpositivo</code> (21/5.2, 10/1.4, …).</td><td>Rexeitamento</td></tr>
    <tr><td>15.4</td><td><code>CalificacionOperacion</code></td><td>S1/S2/N1/N2; mutuamente excluínte con <code>OperacionExenta</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>15.5</td><td><code>OperacionExenta</code></td><td>E1-E6 (IVA); E7/E8 só para IGIC; coherencia con TipoFactura.</td><td>Rexeitamento</td></tr>
    <tr><td>15.6</td><td><code>ClaveRegimen</code></td><td>01-21 con sub-regras para 02/03/04/06/07/08/10/11/14/20/21.</td><td>Rexeitamento</td></tr>
    <tr><td>15.7</td><td><code>CuotaRepercutida</code></td><td><code>base × tipo</code> con tolerancia ±10 € (≤ 3 000 € para simplificadas).</td><td>Rexeitamento</td></tr>
    <tr><td>16</td><td><code>CuotaTotal</code></td><td>Suma de cotas repercutidas con tolerancia ±10 €.</td><td>Rexeitamento</td></tr>
    <tr><td>17</td><td><code>ImporteTotal</code></td><td>Suma de bases + imposto + recarga con tolerancia ±10 €.</td><td>Rexeitamento</td></tr>
    <tr><td>18</td><td><code>Huella anterior</code></td><td>64 caracteres hex en maiúsculas cando está presente.</td><td>Admisible (2003)</td></tr>
    <tr><td>19</td><td><code>SistemaInformatico</code></td><td>SystemId 2 caracteres [A-Z0-9] excluíndo Ñ; coherencia <code>TipoUsoPosibleSoloVerifactu</code> / <code>MultiOT</code>.</td><td>Rexeitamento</td></tr>
    <tr><td>20</td><td><code>FechaHoraHusoGenRegistro</code></td><td>ISO 8601 válido con offset; non en futuro afastado.</td><td>Rexeitamento / Admisible</td></tr>
    <tr><td>21</td><td><code>NumRegistroAcuerdoFacturacion</code></td><td>≤ 15 caracteres, conxunto de caracteres permitido.</td><td>Rexeitamento</td></tr>
    <tr><td>22</td><td><code>IdAcuerdoSistemaInformatico</code></td><td>≤ 16 caracteres, conxunto de caracteres permitido.</td><td>Rexeitamento</td></tr>
    <tr><td>23</td><td><code>Huella</code></td><td>64 caracteres hex en maiúsculas.</td><td>Admisible (1292)</td></tr>
  </tbody>
</table>

## NIF, NIE, CIF

O validador local cobre as tres formas de identificador español e o
díxito de control:

- **DNI**: 8 díxitos + letra de control calculada pola táboa mod-23.
- **NIE**: prefixo `X|Y|Z` + 7 díxitos + letra de control, mesma táboa.
- **CIF**: letra + 7 díxitos + díxito/letra de control (algoritmo mixto
  mod-10 / mod-11 segundo a spec AEAT).

## NIF-IVA (UE)

O validador cobre os 28 estados membros históricos da UE máis Irlanda do
Norte (GB/XI) con xestión Brexit consciente de datas. As estruturas e as
regras por país cárganse de `validators/nifIva.ts`. Exemplos:

| País      | Código | Estrutura                             |
| --------- | ------ | ------------------------------------- |
| Alemaña   | DE     | 9 díxitos                             |
| Francia   | FR     | 11 caracteres (2 alfanuméricos + 9 díxitos) |
| Italia    | IT     | 11 díxitos                            |
| Portugal  | PT     | 9 díxitos                             |
| Países Baixos | NL | 12 caracteres                        |
| Reino Unido | GB   | 9 / 12 díxitos; válido só ≤ 31-12-2020 (post-Brexit, usar XI) |
| Irlanda do Norte | XI | 9 / 12 díxitos; válido só ≥ 01-01-2021 |

O validador acepta `country=ES` por completude, pero os NIFs españois
pasan pola ruta local de NIF/CIF.

## Severidade

A AEAT distingue tres severidades:

- `envelope` — rexéitase o envío completo (códigos 4xxx, ponos o servizo
  tras parsear o sobre SOAP).
- `record` — só se rexeita o rexistro afectado (códigos 1xxx e 3xxx).
- `admissible` — o rexistro acéptase pero márcase para *subsanación*
  (códigos 2xxx).

O validador local devolve os dous primeiros como `severity: 'rejection'`
e o terceiro como `severity: 'admissible'`. Os erros de envelope veñen
do nivel de cable e nunca aparecen no resultado local.

## Seguinte

- [Códigos de erro](./error-codes.md) — catálogo completo de códigos co texto literal en castelán de `errores.properties`.
- [Cadea de pegadas](./hash-chain.md)
