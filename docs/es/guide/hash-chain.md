# Cadena de huellas

Todo registro enviado a la AEAT lleva una **huella** — un digest SHA-256
hexadecimal en mayúsculas de 64 caracteres que lo encadena con el registro
anterior del mismo obligado. La cadena es lo que hace el registro a prueba de
manipulaciones: cambiar cualquier registro pasado invalida todas las huellas
posteriores.

El algoritmo completo está especificado en [*Especificaciones técnicas para
generación de la huella o hash de los registros de facturación* v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
El SDK lo implementa literalmente; las tres huellas de referencia del §6 de ese
PDF están cubiertas por tests unitarios y coinciden byte a byte.

## Campos que se hashean

La huella se calcula sobre una concatenación `nombre1=valor1&nombre2=valor2&…`
con una lista de campos fija y ordenada por tipo de registro:

### `RegistroAlta` (ocho campos)

| Orden | Nombre del campo            | Origen                                |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-AAAA)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (registro anterior)| `chainLink.previousHash` o vacío      |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 con offset)   |

### `RegistroAnulacion` (cinco campos)

| Orden | Nombre del campo                | Origen                                |
| ----- | ------------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`        | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`        | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`        |
| 4     | `Huella` (registro anterior)    | `chainLink.previousHash` o vacío      |
| 5     | `FechaHoraHusoGenRegistro`      | `generatedAt`                         |

## Normalización

Antes de concatenar, cada valor se normaliza:

- **Recorte** de espacios al principio y al final.
- **Valores numéricos** (`CuotaTotal`, `ImporteTotal`): los ceros a la derecha del
  separador decimal son irrelevantes — `21.00` y `21` producen la misma huella.
- **Las fechas** se emiten en formato cable `DD-MM-AAAA`.
- Los bytes usados para hashear son **UTF-8** de la cadena resultante.

## Primer registro

Para el primer registro enviado por un obligado, el campo `Huella` del registro
anterior está vacío — la concatenación contiene `…&Huella=&…`. Define
`chainLink.first = true` y omite los cuatro campos `previous*`:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Registros siguientes

Para todo registro siguiente, proporciona el enlace anterior completo:

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

En la práctica el SDK rellena esto por ti cuando pasas por `VerifactuClient` —
recuerda la última huella de la cadena por instancia. Sólo tratas el enlace
manualmente si almacenas los registros offline y retomas la cadena más tarde.

## Persistir la cadena (`HashStore`)

`VerifactuClient` no recuerda la cadena por sí solo — delega en un `HashStore`
conectable (`getLast(nif)` / `append(nif, entry)`). `hashStore` es una opción
**obligatoria** del constructor, sin valor por defecto: el SDK no trae ningún
fallback en memoria, porque una cadena que puede desaparecer sin más en cada
reinicio es un fallo de cumplimiento normativo, no solo un bug. Usa siempre un
`HashStore` durable, respaldado por una base de datos.

El SDK incluye adaptadores para los stacks más comunes como subpaths
separados, para que solo instales el driver que realmente uses:

| Adaptador | Import | Driver |
| --- | --- | --- |
| `BunSqlHashStore` | `verifactu-sdk/store/bun-sql` | `Bun.sql` (incluido en Bun, sin dependencia extra) |
| `SqliteHashStore` | `verifactu-sdk/store/sqlite` | `bun:sqlite` (incluido en Bun, sin dependencia extra) |
| `BetterSqlite3HashStore` | `verifactu-sdk/store/better-sqlite3` | [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Node.js, sin necesitar Bun) |
| `PgHashStore` | `verifactu-sdk/store/pg` | [`pg`](https://node-postgres.com) |
| `MysqlHashStore` | `verifactu-sdk/store/mysql` | [`mysql2`](https://sidorares.github.io/node-mysql2) |
| `RedisHashStore` | `verifactu-sdk/store/redis` | [`ioredis`](https://github.com/redis/ioredis) |
| `BunRedisHashStore` | `verifactu-sdk/store/bun-redis` | `Bun.RedisClient` (integrado en Bun, sin dependencias extra) |
| `DrizzlePgHashStore` / `DrizzleMysqlHashStore` / `DrizzleSqliteHashStore` | `verifactu-sdk/store/drizzle` | [Drizzle ORM](https://orm.drizzle.team) — dialectos pg/mysql/sqlite, cualquier driver, tu propia tabla |

```ts
import { SQL } from 'bun';
import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';

const sql = new SQL(process.env.DATABASE_URL!);
const hashStore = new BunSqlHashStore(sql);
await hashStore.migrate(); // crea la tabla verifactu_hash_chain, idempotente

const client = new VerifactuClient({ certificate, taxpayer, billingSystem, hashStore });
```

Cada adaptador que no sea Drizzle trae su propio `migrate()` para crear la
tabla `verifactu_hash_chain`. Los tres stores de Drizzle son distintos: nunca
definen ni migran una tabla por sí mismos — le pasas la tuya, generada con
`bunx verifactu schema drizzle --provider pg|mysql|sqlite --out <ruta>` (la
"ruta del esquema" — donde sea que viva tu esquema Drizzle) o escrita a mano
respetando la forma de columnas requerida `nif`/`invoiceId`/`hash`, y luego
la empujas con drizzle-kit junto al resto de tu esquema:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
import { verifactuHashChain } from './schema.js'; // tabla generada o escrita a mano

const db = drizzle(process.env.DATABASE_URL!);
const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
```

Redis no necesita migración, pero **no** lo apuntes a una instancia de caché
con desalojo (`maxmemory-policy allkeys-lru`) ni le pongas TTL — perder la
clave con la cola de la cadena rompe la cadena de ese contribuyente.

Ninguna de estas dependencias va incluida — son `peerDependencies` con
`optional: true`, así que `pg`/`ioredis`/`drizzle-orm`/`mysql2` solo hacen
falta si realmente importas ese adaptador.

Si tu store se comparte entre procesos, asegúrate de que `getLast` + `append`
sean seguros frente a lecturas-modificaciones-escrituras concurrentes (una
transacción o bloqueo de fila alrededor del par) para que dos envíos
concurrentes del mismo NIF nunca vean el mismo "hash anterior" — consulta el
TSDoc de `HashStore` para más detalle. Para conectar tu propio store (otra
forma de tabla, otra base de datos), implementa directamente la interfaz de
dos métodos `HashStore`.

## Varias empresas / contribuyentes

`VerifactuClient` es de un solo inquilino — `taxpayer` y `certificate` son
opciones del constructor, un cliente por NIF, ya que cada contribuyente
normalmente tiene su propio certificado AEAT. `HashStore` ya es multi-tenant a
nivel de almacenamiento (`getLast`/`append` están indexados por NIF), así que
emitir facturas para varias empresas (p. ej. una gestoría con varios
clientes) significa instanciar un `VerifactuClient` por contribuyente/
certificado y compartir un único `HashStore` durable entre todos ellos.

## Los registros rechazados siguen en la cadena

Cada registro se encadena con el último registro **generado** por el sistema,
lo haya aceptado la AEAT o no (Orden HAC/1177/2024, art. 7.i). Un registro
rechazado (`Incorrecto`) nunca llega a los sistemas de la AEAT, pero sigue
siendo el anterior del siguiente, así que el cliente persiste su huella como
la de cualquier otro. Un rechazo se corrige con una nueva alta de subsanación
(`correction: 'S'`, `priorRejection: 'X'`), nunca rebobinando la cadena.

Dentro de `registerBatch`, los registros se encadenan entre sí en el orden de
envío, también entre bloques.

### Reintentos y respuestas perdidas

`generatedAt` forma parte de la huella. Guárdalo antes del primer envío y
reutilízalo en cada reintento: con el mismo registro anterior, la misma factura
da la misma huella. Si el intento perdido sí llegó a la AEAT, el reintento
vuelve como `Incorrecto` con el error `3000` y un `duplicateRecord` cuyo
`state` es `'Correcta'` o `'AceptadaConErrores'`: la factura ya está
registrada y la cadena local coincide con la de la AEAT. Reintentar con un
`generatedAt` nuevo produce otra huella y deja la cadena local distinta de la
de la AEAT. Un `generatedAt` antiguo puede generar el aviso admisible `2004`.

```ts
const result = response.records[0];
const alreadyRegistered =
  result?.errorCode === 3000 &&
  (result.duplicateRecord?.state === 'Correcta' ||
    result.duplicateRecord?.state === 'AceptadaConErrores');
```

## Calcular una huella manualmente

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* primer registro */);
// → "3C13742B...A8F1"  (64 caracteres hex en mayúsculas)
```

La función es pura — sin E/S, sin efectos secundarios — y se expone vía
`verifactu-sdk/hash`. Lanza `SchemaValidationError` si pasas un `previousHash`
mal formado.

## Verificar

Dado un registro y su predecesor puedes recalcular la huella y comparar:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('¡Cadena rota!');
}
```

La AEAT hace esto en servidor en cada envío. Un desajuste levanta el error
**2000** (admisible — el registro se acepta pero se marca para *subsanación*).

## Reset / replay

Si pierdes el estado local de la cadena (limpieza de base de datos, rotación de
certificado) debes volver a consultar a la AEAT el último registro aceptado,
tomar su campo `Huella` y reanudar desde ahí:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → reanuda la cadena usando last.invoiceId + la huella almacenada en tu BBDD
```

## Rendimiento

La huella es un único SHA-256 sobre una cadena corta (típicamente menos de 1 KB),
así que un registro se hashea en microsegundos. El cuello de botella de la cadena
es la llamada secuencial a la AEAT: el SDK serializa las llamadas a
`registerInvoice` por instancia, así la cadena nunca se rompe por concurrencia.

## Siguiente

- [Código QR](./qr-code.md) — también depende del identificador de factura.
- [Validaciones](./validations.md) — la regla 23 comprueba el formato de la huella localmente.
- [Control de flujo](./flow-control.md) — por qué los envíos se serializan.
