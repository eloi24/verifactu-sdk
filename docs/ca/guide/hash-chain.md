# Cadena d'empremtes

Tot registre enviat a l'AEAT porta una **empremta** (*huella*) — un digest
SHA-256 hexadecimal en majúscules de 64 caràcters que l'encadena amb el
registre anterior del mateix obligat. La cadena és el que fa el registre a
prova de manipulacions: canviar qualsevol registre passat invalida totes les
empremtes posteriors.

L'algorisme complet està especificat a [*Especificaciones técnicas para
generación de la huella o hash de los registros de facturación* v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
El SDK l'implementa literalment; les tres empremtes de referència del §6
d'aquest PDF estan cobertes per tests unitaris i coincideixen byte a byte.

## Camps que es hashegen

L'empremta es calcula sobre una concatenació `nom1=valor1&nom2=valor2&…` amb
una llista de camps fixa i ordenada per tipus de registre:

### `RegistroAlta` (vuit camps)

| Ordre | Nom del camp                | Origen                                |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-AAAA)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (registre anterior)| `chainLink.previousHash` o buit       |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 amb offset)   |

### `RegistroAnulacion` (cinc camps)

| Ordre | Nom del camp                    | Origen                                |
| ----- | ------------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`        | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`        | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`        |
| 4     | `Huella` (registre anterior)    | `chainLink.previousHash` o buit       |
| 5     | `FechaHoraHusoGenRegistro`      | `generatedAt`                         |

## Normalització

Abans de concatenar, cada valor es normalitza:

- **Retall** d'espais a l'inici i al final.
- **Valors numèrics** (`CuotaTotal`, `ImporteTotal`): els zeros a la dreta del
  separador decimal són irrellevants — `21.00` i `21` produeixen la mateixa
  empremta.
- **Les dates** s'emeten en format cable `DD-MM-AAAA`.
- Els bytes usats per hashejar són **UTF-8** de la cadena resultant.

## Primer registre

Per al primer registre enviat per un obligat, el camp `Huella` del registre
anterior és buit — la concatenació conté `…&Huella=&…`. Defineix
`chainLink.first = true` i omet els quatre camps `previous*`:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Registres següents

Per a tot registre següent proporciona l'enllaç anterior complet:

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

A la pràctica el SDK reompleix això per tu quan passes per `VerifactuClient`
— recorda l'última empremta de la cadena per instància. Només tractes
l'enllaç manualment si emmagatzemes els registres offline i reprens la
cadena més tard.

## Calcular una empremta manualment

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* primer registre */);
// → "3C13742B...A8F1"  (64 caràcters hex en majúscules)
```

La funció és pura — sense E/S, sense efectes secundaris — i s'exposa via
`verifactu-sdk/hash`. Llança `SchemaValidationError` si passes un
`previousHash` mal format.

## Verificar

Donat un registre i el seu predecessor pots recalcular l'empremta i comparar:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('Cadena trencada!');
}
```

L'AEAT ho fa al servidor a cada enviament. Una discrepància aixeca l'error
**2000** (admissible — el registre s'accepta però es marca per a
*subsanación*).

## Reset / replay

Si perds l'estat local de la cadena (neteja de base de dades, rotació de
certificat) has de tornar a consultar a l'AEAT l'últim registre acceptat,
agafar el seu camp `Huella` i reprendre des d'allà:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → reprèn la cadena fent servir last.invoiceId + l'empremta emmagatzemada a la teva BD
```

## Rendiment

L'empremta és un únic SHA-256 sobre una cadena curta (típicament menys d'1
KB), així que un registre es hasheja en microsegons. El coll d'ampolla de la
cadena és la crida seqüencial a l'AEAT: el SDK serialitza les crides a
`registerInvoice` per instància, així la cadena mai no es trenca per
concurrència.

## Següent

- [Codi QR](./qr-code.md) — també depèn de l'identificador de factura.
- [Validacions](./validations.md) — la regla 23 comprova el format de l'empremta localment.
- [Control de flux](./flow-control.md) — per què els enviaments es serialitzen.
