# Validaciones

El SDK aplica localmente todas las validaciones listadas en [*Validaciones y
errores del servicio* v1.2.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf).
Esto te permite cazar registros mal formados antes de gastar una llamada SOAP —
la AEAT devolvería el mismo diagnóstico, pero en microsegundos.

## Llamar al validador

```ts
import {
  validateInvoiceForRegister,
  validateInvoiceForCancel,
} from 'verifactu-sdk/validators';

const issues = validateInvoiceForRegister(invoice);
if (issues.some((i) => i.severity === 'rejection')) {
  throw new BusinessValidationError('Factura rechazada', { code: issues[0]!.code });
}
```

Cada `ValidationResult` devuelto lleva:

- `code` — el código de error de la AEAT más cercano del catálogo.
- `field` — ruta con puntos del campo en conflicto (p. ej. `breakdown.0.taxRate`).
- `severity` — `'rejection'` rechaza el registro, `'admissible'` lo acepta con
  advertencia.
- `message` — descripción corta en inglés de la incidencia.

`VerifactuClient.registerInvoice` ejecuta el validador automáticamente y lanza
`BusinessValidationError` en caso de rechazo; sólo llamas al validador
directamente cuando quieres inspeccionar todas las incidencias a la vez.

## Las 23 reglas

El validador implementa una o más comprobaciones por regla de la AEAT. La
correspondencia es:

<table>
  <thead>
    <tr><th>Regla</th><th>Grupo de campos</th><th>Qué comprueba</th><th>Severidad</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>IDFactura</code></td><td>Formato del NIF, caracteres permitidos en NumSerieFactura, FechaExpedicion ≥ 28-10-2024 y ±20 años respecto a hoy.</td><td>Rechazo</td></tr>
    <tr><td>2</td><td><code>RechazoPrevio</code> + <code>Subsanacion</code></td><td>Sólo combinaciones coherentes (N, S, X).</td><td>Rechazo</td></tr>
    <tr><td>3</td><td><code>TipoRectificativa</code></td><td>Obligatoria sólo si <code>TipoFactura</code> empieza por <code>R</code>.</td><td>Rechazo</td></tr>
    <tr><td>4</td><td><code>FacturasRectificadas</code></td><td>Sólo permitida en facturas tipo R.</td><td>Rechazo</td></tr>
    <tr><td>5</td><td><code>FacturasSustituidas</code></td><td>Sólo permitida en facturas F3.</td><td>Rechazo</td></tr>
    <tr><td>6</td><td><code>ImporteRectificacion</code></td><td>Obligatorio cuando <code>TipoRectificativa = S</code>.</td><td>Rechazo</td></tr>
    <tr><td>7</td><td><code>FechaOperacion</code></td><td>±20 años respecto a la fecha de expedición, reglas especiales para ClaveRegimen 14/15.</td><td>Rechazo</td></tr>
    <tr><td>8</td><td><code>FacturaSimplificadaArt7273</code></td><td>Sólo en F1/F3/R1/R2/R3/R4.</td><td>Rechazo</td></tr>
    <tr><td>9</td><td><code>FacturaSinIdentifDestinatarioArt61d</code></td><td>Sólo en F2/R5.</td><td>Rechazo</td></tr>
    <tr><td>10</td><td><code>Macrodato</code></td><td>Obligatorio si <code>ImporteTotal ≥ 100 000 000 €</code>.</td><td>Rechazo</td></tr>
    <tr><td>11</td><td><code>EmitidaPorTerceroODestinatario</code></td><td>Coherencia con <code>Tercero</code> / <code>Destinatarios</code>.</td><td>Rechazo</td></tr>
    <tr><td>12</td><td><code>Tercero</code></td><td>Formato NIF, distinto del emisor, estructura NIF-IVA por país.</td><td>Rechazo</td></tr>
    <tr><td>13</td><td><code>Destinatarios</code></td><td>Obligatorios para F1/F3/R1/R2/R3/R4; prohibidos para F2/R5; formato NIF; estructura NIF-IVA.</td><td>Rechazo</td></tr>
    <tr><td>14</td><td><code>Cupon</code></td><td>Sólo permitido cuando <code>TipoFactura</code> es R1 o R5.</td><td>Rechazo</td></tr>
    <tr><td>15.1</td><td><code>Desglose.TipoImpositivo</code></td><td>Tipo permitido por fecha (según tabla histórica de la AEAT).</td><td>Rechazo</td></tr>
    <tr><td>15.2</td><td><code>BaseImponibleACoste</code></td><td>Sólo cuando ClaveRegimen = 06 o Impuesto en 02/05.</td><td>Rechazo</td></tr>
    <tr><td>15.3</td><td><code>TipoRecargoEquivalencia</code></td><td>Pareja válida con <code>TipoImpositivo</code> (21/5.2, 10/1.4, …).</td><td>Rechazo</td></tr>
    <tr><td>15.4</td><td><code>CalificacionOperacion</code></td><td>S1/S2/N1/N2; mutuamente excluyente con <code>OperacionExenta</code>.</td><td>Rechazo</td></tr>
    <tr><td>15.5</td><td><code>OperacionExenta</code></td><td>E1-E6 (IVA); E7/E8 sólo para IGIC; coherencia con TipoFactura.</td><td>Rechazo</td></tr>
    <tr><td>15.6</td><td><code>ClaveRegimen</code></td><td>01-21 con sub-reglas para 02/03/04/06/07/08/10/11/14/20/21.</td><td>Rechazo</td></tr>
    <tr><td>15.7</td><td><code>CuotaRepercutida</code></td><td><code>base × tipo</code> con tolerancia ±10 € (≤ 3 000 € para simplificadas).</td><td>Rechazo</td></tr>
    <tr><td>16</td><td><code>CuotaTotal</code></td><td>Suma de cuotas repercutidas con tolerancia ±10 €.</td><td>Rechazo</td></tr>
    <tr><td>17</td><td><code>ImporteTotal</code></td><td>Suma de bases + impuesto + recargo con tolerancia ±10 €.</td><td>Rechazo</td></tr>
    <tr><td>18</td><td><code>Huella anterior</code></td><td>64 caracteres hex en mayúsculas cuando está presente.</td><td>Admisible (2003)</td></tr>
    <tr><td>19</td><td><code>SistemaInformatico</code></td><td>SystemId 2 caracteres [A-Z0-9] excluyendo Ñ; coherencia <code>TipoUsoPosibleSoloVerifactu</code> / <code>MultiOT</code>.</td><td>Rechazo</td></tr>
    <tr><td>20</td><td><code>FechaHoraHusoGenRegistro</code></td><td>ISO 8601 válido con offset; no en futuro lejano.</td><td>Rechazo / Admisible</td></tr>
    <tr><td>21</td><td><code>NumRegistroAcuerdoFacturacion</code></td><td>≤ 15 caracteres, juego de caracteres permitido.</td><td>Rechazo</td></tr>
    <tr><td>22</td><td><code>IdAcuerdoSistemaInformatico</code></td><td>≤ 16 caracteres, juego de caracteres permitido.</td><td>Rechazo</td></tr>
    <tr><td>23</td><td><code>Huella</code></td><td>64 caracteres hex en mayúsculas.</td><td>Admisible (1292)</td></tr>
  </tbody>
</table>

## NIF, NIE, CIF

El validador local cubre las tres formas de identificador español y el dígito
de control:

- **DNI**: 8 dígitos + letra de control calculada por la tabla mod-23.
- **NIE**: prefijo `X|Y|Z` + 7 dígitos + letra de control, misma tabla.
- **CIF**: letra + 7 dígitos + dígito/letra de control (algoritmo mixto mod-10
  / mod-11 según la spec AEAT).

## NIF-IVA (UE)

El validador cubre los 28 estados miembros históricos de la UE más Irlanda del
Norte (GB/XI) con gestión Brexit consciente de fechas. Las estructuras y las
reglas por país se cargan desde `validators/nifIva.ts`. Ejemplos:

| País      | Código | Estructura                            |
| --------- | ------ | ------------------------------------- |
| Alemania  | DE     | 9 dígitos                             |
| Francia   | FR     | 11 caracteres (2 alfanuméricos + 9 dígitos) |
| Italia    | IT     | 11 dígitos                            |
| Portugal  | PT     | 9 dígitos                             |
| Países Bajos | NL  | 12 caracteres                         |
| Reino Unido | GB   | 9 / 12 dígitos; válido sólo ≤ 31-12-2020 (post-Brexit, usar XI) |
| Irlanda del Norte | XI | 9 / 12 dígitos; válido sólo ≥ 01-01-2021 |

El validador acepta `country=ES` por completitud, pero los NIF españoles pasan
por la ruta local de NIF/CIF.

## Severidad

La AEAT distingue tres severidades:

- `envelope` — se rechaza el envío completo (códigos 4xxx, los pone el
  servicio tras parsear el sobre SOAP).
- `record` — sólo se rechaza el registro afectado (códigos 1xxx y 3xxx).
- `admissible` — el registro se acepta pero se marca para *subsanación*
  (códigos 2xxx).

El validador local devuelve los dos primeros como `severity: 'rejection'` y
el tercero como `severity: 'admissible'`. Los errores de envelope vienen del
nivel de cable y nunca aparecen en el resultado local.

## Siguiente

- [Códigos de error](./error-codes.md) — catálogo completo de códigos con el
  texto literal en español de `errores.properties`.
- [Cadena de huellas](./hash-chain.md)
