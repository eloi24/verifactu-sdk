# Instalación

## Requisitos

`verifactu-sdk` publícase en npm e pode consumirse desde calquera proxecto
JavaScript ou TypeScript. O paquete oriéntase a:

- **Bun** ≥ 1.1 (runtime recomendado — o SDK compílase con Bun).
- **Node.js** ≥ 20 (tamén soportado; o SDK distribúe ESM e CJS de xeito dual).
- **TypeScript** ≥ 5.0 se vas usar os tipos.

O SDK é un paquete TypeScript puro — non require ningún paso de compilación
nativa. O cliente HTTP/2 `undici` e a biblioteca `qrcode` son as únicas
dependencias en tempo de execución con enlaces a C, e as dúas distribúen
binarios pre-compilados para todas as plataformas principais.

## Xestor de paquetes

Usa o xestor que o teu proxecto xa utilice. Internamente desenvolvemos con
Bun; os catro xestores habituais próbanse:

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

## Importación

O paquete expón un punto de entrada principal máis imports profundos para
cada sub-área. Usa os imports profundos cando queiras reducir o tamaño do
bundle — os empaquetadores modernos fan tree-shake do punto de entrada
principal sen problema, pero os puntos profundos fan explícita a intención.

```ts
// Caso habitual — o punto de entrada principal expón o cliente e os tipos de alto nivel.
import { VerifactuClient, Environment } from 'verifactu-sdk';

// Helpers puros (sen transporte nin E/S).
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';
import { validateInvoiceForRegister } from 'verifactu-sdk/validators';
import { ERROR_CATALOG, VerifactuError } from 'verifactu-sdk/errors';
import { RegistroAltaSchema } from 'verifactu-sdk/schemas';
```

## CommonJS

O paquete inclúe unha build CommonJS para proxectos que aínda non migraron a
ESM. As definicións de tipos, o mapa de exports e o runtime son todos de
dobre destino.

```js
const { VerifactuClient, Environment } = require('verifactu-sdk');
```

## CLI

O CLI `verifactu` vén no mesmo paquete como bin script. Unha vez instalado,
invócao co teu runner preferido:

```bash
bunx verifactu --help
# ou
npx verifactu --help
```

Consulta a [guía do CLI](./cli.md) para coñecer os subcomandos dispoñibles.

## Empaquetadores e runtimes edge

O SDK é ESM-first e usa builtins de Node (`node:fs`, `node:crypto`,
`undici`). **Non** está pensado para navegadores nin runtimes edge sen un
shim completo de compatibilidade Node — non podes facer mTLS desde un
navegador, e a AEAT só acepta conexións autenticadas por mTLS.

Se empaquetas o SDK con esbuild ou webpack para un runtime de servidor,
marca `undici` como external (inclúe o seu propio cliente wasm/binario
optimizado e non se debe re-empaquetar).

## Próximos pasos

- [Inicio rápido](./quickstart.md) — rexistra a túa primeira factura en menos de trinta liñas.
- [Certificados](./certificates.md) — como cargar o teu certificado mTLS emitido pola AEAT.
- [VERI*FACTU vs. requirimento](./verifactu-vs-on-request.md) — que modo de remisión usar.
