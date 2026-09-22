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

## Persistir la cadena (`HashStore`)

`VerifactuClient` no recorda la cadena per si sol — delega en un `HashStore`
connectable (`getLast(nif)` / `append(nif, entry)`). `hashStore` és una opció
**obligatòria** del constructor, sense valor per defecte: el SDK no porta cap
fallback en memòria, perquè una cadena que pot desaparèixer sense més a cada
reinici és una fallada de compliment normatiu, no només un bug. Fes servir
sempre un `HashStore` durable, recolzat per una base de dades.

El SDK inclou adaptadors per als stacks més habituals com a subpaths
separats, perquè només instal·lis el driver que realment facis servir:

| Adaptador | Import | Driver |
| --- | --- | --- |
| `BunSqlHashStore` | `verifactu-sdk/store/bun-sql` | `Bun.sql` (inclòs a Bun, sense dependència extra) |
| `SqliteHashStore` | `verifactu-sdk/store/sqlite` | `bun:sqlite` (inclòs a Bun, sense dependència extra) |
| `BetterSqlite3HashStore` | `verifactu-sdk/store/better-sqlite3` | [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Node.js, sense necessitar Bun) |
| `PgHashStore` | `verifactu-sdk/store/pg` | [`pg`](https://node-postgres.com) |
| `MysqlHashStore` | `verifactu-sdk/store/mysql` | [`mysql2`](https://sidorares.github.io/node-mysql2) |
| `RedisHashStore` | `verifactu-sdk/store/redis` | [`ioredis`](https://github.com/redis/ioredis) |
| `BunRedisHashStore` | `verifactu-sdk/store/bun-redis` | `Bun.RedisClient` (integrat a Bun, sense dependències extra) |
| `DrizzlePgHashStore` / `DrizzleMysqlHashStore` / `DrizzleSqliteHashStore` | `verifactu-sdk/store/drizzle` | [Drizzle ORM](https://orm.drizzle.team) — dialectes pg/mysql/sqlite, qualsevol driver, la teva pròpia taula |

```ts
import { SQL } from 'bun';
import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';

const sql = new SQL(process.env.DATABASE_URL!);
const hashStore = new BunSqlHashStore(sql);
await hashStore.migrate(); // crea la taula verifactu_hash_chain, idempotent

const client = new VerifactuClient({ certificate, taxpayer, billingSystem, hashStore });
```

Cada adaptador que no sigui Drizzle porta el seu propi `migrate()` per crear
la taula `verifactu_hash_chain`. Els tres stores de Drizzle són diferents:
mai defineixen ni migren una taula per si mateixos — hi passes la teva,
generada amb `bunx verifactu schema drizzle --provider pg|mysql|sqlite --out <ruta>`
(la "ruta de l'esquema" — allà on visqui el teu esquema Drizzle) o
escrita a mà respectant la forma de columnes requerida
`nif`/`invoiceId`/`hash`, i després l'empenys amb drizzle-kit junt amb la
resta del teu esquema:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
import { verifactuHashChain } from './schema.js'; // taula generada o escrita a mà

const db = drizzle(process.env.DATABASE_URL!);
const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
```

Redis no necessita migració, però **no** l'apuntis a una instància de
memòria cau amb desallotjament (`maxmemory-policy allkeys-lru`) ni li posis
TTL — perdre la clau amb la cua de la cadena trenca la cadena d'aquell
contribuent.

Cap d'aquestes dependències va inclosa — són `peerDependencies` amb
`optional: true`, així que `pg`/`ioredis`/`drizzle-orm`/`mysql2` només calen
si realment importes aquell adaptador.

Si el teu store es comparteix entre processos, assegura't que `getLast` +
`append` siguin segurs davant de lectures-modificacions-escriptures
concurrents (una transacció o bloqueig de fila al voltant del parell) perquè
dos enviaments concurrents del mateix NIF mai vegin el mateix "hash
anterior" — consulta el TSDoc de `HashStore` per a més detall. Per connectar
el teu propi store (una altra forma de taula, una altra base de dades),
implementa directament la interfície de dos mètodes `HashStore`.

## Diverses empreses / contribuents

`VerifactuClient` és d'un sol inquilí — `taxpayer` i `certificate` són
opcions del constructor, un client per NIF, ja que cada contribuent
normalment té el seu propi certificat AEAT. `HashStore` ja és multi-tenant a
nivell d'emmagatzematge (`getLast`/`append` estan indexats per NIF), així que
emetre factures per a diverses empreses (p. ex. una gestoria amb diversos
clients) significa instanciar un `VerifactuClient` per contribuent/
certificat i compartir un únic `HashStore` durable entre tots ells.

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
