# Cadea de pegadas

Todo rexistro enviado á AEAT leva unha **pegada** (*huella*) — un digest
SHA-256 hexadecimal en maiúsculas de 64 caracteres que o encadea co
rexistro anterior do mesmo obrigado. A cadea é o que fai o rexistro a
proba de manipulacións: cambiar calquera rexistro pasado invalida todas
as pegadas posteriores.

O algoritmo completo está especificado en [*Especificaciones técnicas
para generación de la huella o hash de los registros de facturación*
v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
O SDK implémentao literalmente; as tres pegadas de referencia do §6 dese
PDF están cubertas por tests unitarios e coinciden byte a byte.

## Campos que se hashean

A pegada calcúlase sobre unha concatenación `nome1=valor1&nome2=valor2&…`
cunha lista de campos fixa e ordenada por tipo de rexistro:

### `RegistroAlta` (oito campos)

| Orde  | Nome do campo               | Orixe                                 |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-AAAA)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (rexistro anterior)| `chainLink.previousHash` ou baleiro   |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 con offset)   |

### `RegistroAnulacion` (cinco campos)

| Orde  | Nome do campo                   | Orixe                                 |
| ----- | ------------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`        | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`        | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`        |
| 4     | `Huella` (rexistro anterior)    | `chainLink.previousHash` ou baleiro   |
| 5     | `FechaHoraHusoGenRegistro`      | `generatedAt`                         |

## Normalización

Antes de concatenar, cada valor normalízase:

- **Recorte** de espazos no principio e no final.
- **Valores numéricos** (`CuotaTotal`, `ImporteTotal`): os ceros á dereita do
  separador decimal son irrelevantes — `21.00` e `21` producen a mesma
  pegada.
- **As datas** emítense en formato cable `DD-MM-AAAA`.
- Os bytes usados para hashear son **UTF-8** da cadea resultante.

## Primeiro rexistro

Para o primeiro rexistro enviado por un obrigado, o campo `Huella` do
rexistro anterior está baleiro — a concatenación contén `…&Huella=&…`.
Define `chainLink.first = true` e omite os catro campos `previous*`:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Rexistros seguintes

Para todo rexistro seguinte proporciona o enlace anterior completo:

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

Na práctica o SDK reenche isto por ti cando pasas por `VerifactuClient`
— lembra a última pegada da cadea por instancia. Só tratas o enlace
manualmente se almacenas os rexistros offline e retomas a cadea máis
tarde.

## Persistir a cadea (`HashStore`)

`VerifactuClient` non lembra a cadea por si só — delega nun `HashStore`
conectable (`getLast(nif)` / `append(nif, entry)`). `hashStore` é unha opción
**obrigatoria** do constructor, sen valor por defecto: o SDK non trae ningún
fallback en memoria, porque unha cadea que pode desaparecer sen máis en cada
reinicio é un fallo de cumprimento normativo, non só un bug. Usa sempre un
`HashStore` durable, respaldado por unha base de datos.

O SDK inclúe adaptadores para os stacks máis comúns como subpaths separados,
para que só instales o driver que realmente uses:

| Adaptador | Import | Driver |
| --- | --- | --- |
| `BunSqlHashStore` | `verifactu-sdk/store/bun-sql` | `Bun.sql` (incluído en Bun, sen dependencia extra) |
| `SqliteHashStore` | `verifactu-sdk/store/sqlite` | `bun:sqlite` (incluído en Bun, sen dependencia extra) |
| `BetterSqlite3HashStore` | `verifactu-sdk/store/better-sqlite3` | [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Node.js, sen precisar Bun) |
| `PgHashStore` | `verifactu-sdk/store/pg` | [`pg`](https://node-postgres.com) |
| `MysqlHashStore` | `verifactu-sdk/store/mysql` | [`mysql2`](https://sidorares.github.io/node-mysql2) |
| `RedisHashStore` | `verifactu-sdk/store/redis` | [`ioredis`](https://github.com/redis/ioredis) |
| `BunRedisHashStore` | `verifactu-sdk/store/bun-redis` | `Bun.RedisClient` (integrado en Bun, sen dependencias extra) |
| `DrizzlePgHashStore` / `DrizzleMysqlHashStore` / `DrizzleSqliteHashStore` | `verifactu-sdk/store/drizzle` | [Drizzle ORM](https://orm.drizzle.team) — dialectos pg/mysql/sqlite, calquera driver, a túa propia táboa |

```ts
import { SQL } from 'bun';
import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';

const sql = new SQL(process.env.DATABASE_URL!);
const hashStore = new BunSqlHashStore(sql);
await hashStore.migrate(); // crea a táboa verifactu_hash_chain, idempotente

const client = new VerifactuClient({ certificate, taxpayer, billingSystem, hashStore });
```

Cada adaptador que non sexa Drizzle trae o seu propio `migrate()` para crear
a táboa `verifactu_hash_chain`. Os tres stores de Drizzle son distintos:
nunca definen nin migran unha táboa por si mesmos — pásaslle a túa, xerada
con `bunx verifactu schema drizzle --provider pg|mysql|sqlite --out <ruta>`
(a "ruta do esquema" — onde queira que viva o teu esquema Drizzle) ou escrita
a man respectando a forma de columnas requirida `nif`/`invoiceId`/`hash`, e
despois empúxala con drizzle-kit xunto ao resto do teu esquema:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
import { verifactuHashChain } from './schema.js'; // táboa xerada ou escrita a man

const db = drizzle(process.env.DATABASE_URL!);
const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
```

Redis non precisa migración, pero **non** o apuntes a unha instancia de
caché con desaloxamento (`maxmemory-policy allkeys-lru`) nin lle poñas TTL —
perder a clave coa cola da cadea rompe a cadea dese contribuínte.

Ningunha destas dependencias vai incluída — son `peerDependencies` con
`optional: true`, así que `pg`/`ioredis`/`drizzle-orm`/`mysql2` só fan falta
se realmente importas ese adaptador.

Se o teu store se comparte entre procesos, asegúrate de que `getLast` +
`append` sexan seguros fronte a lecturas-modificacións-escrituras
concorrentes (unha transacción ou bloqueo de fila arredor do par) para que
dous envíos concorrentes do mesmo NIF nunca vexan o mesmo "hash anterior" —
consulta o TSDoc de `HashStore` para máis detalle. Para conectar o teu propio
store (outra forma de táboa, outra base de datos), implementa directamente a
interface de dous métodos `HashStore`.

## Varias empresas / contribuíntes

`VerifactuClient` é dun só inquilino — `taxpayer` e `certificate` son opcións
do constructor, un cliente por NIF, xa que cada contribuínte normalmente ten
o seu propio certificado AEAT. `HashStore` xa é multi-tenant a nivel de
almacenamento (`getLast`/`append` están indexados por NIF), así que emitir
facturas para varias empresas (p. ex. unha xestoría con varios clientes)
significa instanciar un `VerifactuClient` por contribuínte/certificado e
compartir un único `HashStore` durable entre todos eles.

## Os rexistros rexeitados seguen na cadea

Cada rexistro encadéase co último rexistro **xerado** polo sistema, aceptárao
ou non a AEAT (Orde HAC/1177/2024, art. 7.i). Un rexistro rexeitado
(`Incorrecto`) nunca chega aos sistemas da AEAT, pero segue sendo o anterior
do seguinte, polo que o cliente persiste a súa pegada coma a de calquera
outro. Un rexeitamento corríxese cunha nova alta de emenda
(`correction: 'S'`, `priorRejection: 'X'`), nunca rebobinando a cadea.

Dentro de `registerBatch`, os rexistros encadéanse entre si na orde de envío,
tamén entre bloques.

### Reintentos e respostas perdidas

`generatedAt` forma parte da pegada. Gárdao antes do primeiro envío e
reutilízao en cada reintento: co mesmo rexistro anterior, a mesma factura dá a
mesma pegada. Se o intento perdido si chegou á AEAT, o reintento volve como
`Incorrecto` co erro `3000` e un `duplicateRecord` cuxo `state` é `'Correcta'`
ou `'AceptadaConErrores'`: a factura xa está rexistrada e a cadea local
coincide coa da AEAT. Reintentar cun `generatedAt` novo produce outra pegada e
deixa a cadea local distinta da da AEAT. Un `generatedAt` antigo pode xerar o
aviso admisible `2004`.

```ts
const result = response.records[0];
const alreadyRegistered =
  result?.errorCode === 3000 &&
  (result.duplicateRecord?.state === 'Correcta' ||
    result.duplicateRecord?.state === 'AceptadaConErrores');
```

## Calcular unha pegada manualmente

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* primeiro rexistro */);
// → "3C13742B...A8F1"  (64 caracteres hex en maiúsculas)
```

A función é pura — sen E/S, sen efectos secundarios — e expónse vía
`verifactu-sdk/hash`. Lanza `SchemaValidationError` se pasas un
`previousHash` mal formado.

## Verificar

Dado un rexistro e o seu predecesor podes recalcular a pegada e
comparar:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('Cadea rota!');
}
```

A AEAT faino no servidor en cada envío. Un desaxuste levanta o erro
**2000** (admisible — o rexistro acéptase pero márcase para
*subsanación*).

## Reset / replay

Se perdes o estado local da cadea (limpeza de base de datos, rotación
de certificado) debes volver consultar á AEAT o último rexistro
aceptado, coller o seu campo `Huella` e retomar desde alí:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → retoma a cadea usando last.invoiceId + a pegada almacenada na túa BD
```

## Rendemento

A pegada é un único SHA-256 sobre unha cadea curta (tipicamente menos
de 1 KB), así que un rexistro hashéase en microsegundos. O pescozo de
botella da cadea é a chamada secuencial á AEAT: o SDK serializa as
chamadas a `registerInvoice` por instancia, así a cadea nunca se rompe
por concorrencia.

## Seguinte

- [Código QR](./qr-code.md) — tamén depende do identificador de factura.
- [Validacións](./validations.md) — a regra 23 comproba o formato da pegada localmente.
- [Control de fluxo](./flow-control.md) — por que os envíos se serializan.
