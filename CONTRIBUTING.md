# Contributing to verifactu-sdk

Thanks for considering a contribution. This document covers the local workflow.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- A POSIX shell (Git Bash, WSL, macOS, Linux). The repository is developed on Windows + PowerShell + Git Bash; native Bash commands work via Bun.

## Setup

```bash
git clone https://github.com/eloi24/verifactu-sdk.git
cd verifactu-sdk
bun install
```

## Toolchain (the only tools we use)

| Concern | Tool | Command |
| --- | --- | --- |
| Install | Bun | `bun install` |
| Lint + format | Biome | `bun run lint` / `bun run format` |
| Type check | TypeScript | `bun run typecheck` |
| Run tests | Bun test runner | `bun test` |
| Build | Bun bundler | `bun run build` |
| Docs | VitePress + TypeDoc | `bun run docs:dev` |

Do **not** introduce ESLint, Prettier, Jest, Vitest, Webpack, `tsc --build` or `tsx`. The toolchain is intentionally minimal.

## Branching

- `main` is always releasable.
- Feature branches: `feat/<short-topic>`, `fix/<short-topic>`, `docs/<short-topic>`.
- Open a PR against `main`. CI must be green before merge.

## Commit messages

Conventional Commits style:

```
feat(qr): add idioma parameter
fix(hash): trim trailing zeros in importeTotal
docs(es): translate validations guide
```

A global `commit.template` is configured for the maintainer to automatically add the Claude co-author trailer; contributors don't need to do anything.

## Tests

- Add tests for every new validation, error code or wire-format change.
- Golden hashes (PDF v0.1.2 §6) and golden QR URLs (PDF v0.5.0 §8) **must** keep passing byte-for-byte.
- E2E tests against `prewww1.aeat.es` are opt-in: `VERIFACTU_E2E=1 bun run test:e2e`.

## Documentation

When you change English documentation under `docs/`, mirror the change in `docs/{es,ca,gl}/`. The CI runs `scripts/check-i18n-parity.ts` to enforce parity.

## Releases

Tag releases as `vX.Y.Z`. The release workflow publishes to npm automatically.
