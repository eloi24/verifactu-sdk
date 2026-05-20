# Instalación

## Requisitos

`verifactu-sdk` se publica en npm y puede consumirse desde cualquier proyecto JavaScript
o TypeScript. El paquete está orientado a:

- **Bun** ≥ 1.1 (runtime recomendado — el SDK se compila con Bun).
- **Node.js** ≥ 20 (también soportado; el SDK distribuye ESM y CJS de forma dual).
- **TypeScript** ≥ 5.0 si vas a usar los tipos.

El SDK es un paquete TypeScript puro — no requiere ningún paso de compilación
nativo. El cliente HTTP/2 `undici` y la librería `qrcode` son las únicas
dependencias en tiempo de ejecución con enlaces a C, y ambas distribuyen binarios
pre-compilados para todas las plataformas principales.

## Gestor de paquetes

Usa el gestor que tu proyecto ya utilice. Internamente desarrollamos con Bun;
los cuatro gestores habituales se prueban:

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

El paquete expone un punto de entrada principal más imports profundos para cada
sub-área. Usa los imports profundos cuando quieras reducir el tamaño del bundle —
los empaquetadores modernos hacen tree-shake del punto de entrada principal sin
problema, pero los puntos profundos hacen explícita la intención.

```ts
// Caso habitual — el punto de entrada principal expone el cliente y los tipos de alto nivel.
import { VerifactuClient, Environment } from 'verifactu-sdk';

// Helpers puros (sin transporte ni E/S).
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';
import { validateInvoiceForRegister } from 'verifactu-sdk/validators';
import { ERROR_CATALOG, VerifactuError } from 'verifactu-sdk/errors';
import { RegistroAltaSchema } from 'verifactu-sdk/schemas';
```

## CommonJS

El paquete incluye una build CommonJS para proyectos que aún no han migrado a ESM.
Las definiciones de tipos, el mapa de exports y el runtime son todos de doble destino.

```js
const { VerifactuClient, Environment } = require('verifactu-sdk');
```

## CLI

El CLI `verifactu` viene en el mismo paquete como bin script. Una vez instalado,
invócalo con tu runner preferido:

```bash
bunx verifactu --help
# o
npx verifactu --help
```

Consulta la [guía del CLI](./cli.md) para conocer los subcomandos disponibles.

## Empaquetadores y runtimes edge

El SDK es ESM-first y usa builtins de Node (`node:fs`, `node:crypto`, `undici`).
**No** está pensado para navegadores ni runtimes edge sin un shim completo de
compatibilidad Node — no puedes hacer mTLS desde un navegador, y la AEAT sólo
acepta conexiones autenticadas por mTLS.

Si empaquetas el SDK con esbuild o webpack para un runtime de servidor, marca
`undici` como external (incluye su propio cliente wasm/binario optimizado y no
debe re-empaquetarse).

## Próximos pasos

- [Inicio rápido](./quickstart.md) — registra tu primera factura en menos de treinta líneas.
- [Certificados](./certificates.md) — cómo cargar tu certificado mTLS emitido por la AEAT.
- [VERI*FACTU vs. requerimiento](./verifactu-vs-on-request.md) — qué modo de remisión usar.
