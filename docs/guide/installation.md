# Installation

## Requirements

`verifactu-sdk` is published to npm and can be consumed by any JavaScript or TypeScript
project. The package targets:

- **Bun** ≥ 1.1 (recommended runtime — the SDK itself is built with Bun).
- **Node.js** ≥ 20 (also supported; the SDK ships dual ESM and CJS entry points).
- **TypeScript** ≥ 5.0 if you consume the typings.

The SDK is a pure TypeScript package — no native compilation step is required. The
`undici` HTTP/2 client and the `qrcode` library are the only transitive runtime
dependencies that pull in C bindings, and both already ship pre-built binaries for
all major platforms.

## Package manager

Choose whichever package manager your project uses. Internally we develop with Bun;
all four common managers are tested:

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

## Importing

The package exposes a primary entry point plus deep imports for each sub-area. Use
the deep imports when you want a smaller bundle — modern bundlers tree-shake the
main entry point fine, but the deep entries make the intent explicit.

```ts
// Most users — the main entry point exposes the client and the high-level types.
import { VerifactuClient, Environment } from 'verifactu-sdk';

// Pure helpers (no transport, no I/O).
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';
import { validateInvoiceForRegister } from 'verifactu-sdk/validators';
import { ERROR_CATALOG, VerifactuError } from 'verifactu-sdk/errors';
import { RegistroAltaSchema } from 'verifactu-sdk/schemas';
```

## CommonJS

The package ships a CommonJS build for projects that have not migrated to ESM. The
type definitions, exports map and runtime are all dual-target.

```js
const { VerifactuClient, Environment } = require('verifactu-sdk');
```

## CLI

The `verifactu` CLI ships in the same package as a bin script. Once installed,
invoke it with your preferred runner:

```bash
bunx verifactu --help
# or
npx verifactu --help
```

See the [CLI guide](./cli.md) for the supported subcommands.

## Bundlers and edge runtimes

The SDK is ESM-first and uses Node built-ins (`node:fs`, `node:crypto`, `undici`).
It is **not** intended for browsers or for edge runtimes that lack a full Node
compatibility shim — you cannot perform mTLS from a browser, and the AEAT only
accepts mTLS-authenticated connections.

If you bundle the SDK with esbuild or webpack for a server runtime, mark the
`undici` package as external (it ships its own optimised wasm/binary client and
should not be re-bundled).

## Next steps

- [Quickstart](./quickstart.md) — register your first invoice in under thirty lines.
- [Certificates](./certificates.md) — how to load your AEAT-issued mTLS certificate.
- [VERI*FACTU vs on-request](./verifactu-vs-on-request.md) — which submission mode to use.
