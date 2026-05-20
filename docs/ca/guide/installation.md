# Instal·lació

## Requisits

`verifactu-sdk` es publica a npm i es pot consumir des de qualsevol projecte
JavaScript o TypeScript. El paquet s'orienta a:

- **Bun** ≥ 1.1 (runtime recomanat — el SDK es compila amb Bun).
- **Node.js** ≥ 20 (també suportat; el SDK distribueix ESM i CJS de forma dual).
- **TypeScript** ≥ 5.0 si vols fer servir els tipus.

El SDK és un paquet TypeScript pur — no requereix cap pas de compilació nativa.
El client HTTP/2 `undici` i la biblioteca `qrcode` són les úniques dependències
en temps d'execució amb enllaços a C, i ambdues distribueixen binaris
pre-compilats per a totes les plataformes principals.

## Gestor de paquets

Fes servir el gestor que el teu projecte ja utilitzi. Internament desenvolupem
amb Bun; els quatre gestors habituals es proven:

::: code-group

```bash [bun]
bun add verifactu-sdk
```

```bash [npm]
npm install verifactu-sdk
```

```bash [pnpm]
pnpm add verifactu-sdk
```

```bash [yarn]
yarn add verifactu-sdk
```

:::

## Importació

El paquet exposa un punt d'entrada principal més imports profunds per a cada
sub-àrea. Fes servir els imports profunds quan vulguis reduir la mida del bundle
— els empaquetadors moderns fan tree-shake del punt d'entrada principal sense
problemes, però els punts profunds fan explícita la intenció.

```ts
// Cas habitual — el punt d'entrada principal exposa el client i els tipus d'alt nivell.
import { VerifactuClient, Environment } from 'verifactu-sdk';

// Helpers purs (sense transport ni E/S).
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';
import { validateInvoiceForRegister } from 'verifactu-sdk/validators';
import { ERROR_CATALOG, VerifactuError } from 'verifactu-sdk/errors';
import { RegistroAltaSchema } from 'verifactu-sdk/schemas';
```

## CommonJS

El paquet inclou una build CommonJS per a projectes que encara no han migrat
a ESM. Les definicions de tipus, el mapa d'exports i el runtime són tots de
doble destí.

```js
const { VerifactuClient, Environment } = require('verifactu-sdk');
```

## CLI

El CLI `verifactu` ve en el mateix paquet com a bin script. Un cop instal·lat,
invoca'l amb el teu runner preferit:

```bash
bunx verifactu --help
# o
npx verifactu --help
```

Consulta la [guia del CLI](./cli.md) per conèixer els subordres disponibles.

## Empaquetadors i runtimes edge

El SDK és ESM-first i fa servir builtins de Node (`node:fs`, `node:crypto`,
`undici`). **No** està pensat per a navegadors ni runtimes edge sense un shim
complet de compatibilitat Node — no pots fer mTLS des d'un navegador, i l'AEAT
només accepta connexions autenticades per mTLS.

Si empaquetes el SDK amb esbuild o webpack per a un runtime de servidor, marca
`undici` com a external (inclou el seu propi client wasm/binari optimitzat i
no s'ha de re-empaquetar).

## Pròxims passos

- [Inici ràpid](./quickstart.md) — registra la teva primera factura en menys de trenta línies.
- [Certificats](./certificates.md) — com carregar el teu certificat mTLS emès per l'AEAT.
- [VERI*FACTU vs. requeriment](./verifactu-vs-on-request.md) — quin mode de remissió usar.
