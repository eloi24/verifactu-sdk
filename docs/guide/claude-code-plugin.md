# Claude Code plugin

The repository publishes a [Claude Code](https://claude.com/claude-code) plugin marketplace
so any Claude Code user can install Veri\*Factu implementation and compliance-audit skills
without leaving their editor.

## Install

```
/plugin marketplace add eloi24/verifactu-sdk
/plugin install verifactu@verifactu-sdk
```

## Skills

- **`implement`** — guides integrating `verifactu-sdk` into a codebase: client setup,
  registering/cancelling invoices, hash chaining, QR rendering, and the SDK's typed error
  classes (`SchemaValidationError`, `BusinessValidationError`, `SoapFaultError`,
  `NetworkError`, `FlowControlError`).
- **`audit`** — reviews an existing invoicing codebase against the Veri\*Factu requirements
  (chain integrity, submission mode, QR code, error handling, flow control, NIF
  validation, certificate handling, cancellation flow) and reports pass/fail per item with
  file:line citations.

Both skills auto-invoke when Claude Code detects a relevant request (e.g. "add Veri\*Factu
invoicing to this app" or "is this codebase Veri\*Factu compliant?"), or can be called
explicitly as `/verifactu:implement` / `/verifactu:audit`.

## Source

The marketplace and plugin definitions live at
[`.claude-plugin/marketplace.json`](https://github.com/eloi24/verifactu-sdk/blob/main/.claude-plugin/marketplace.json)
and [`plugins/verifactu/`](https://github.com/eloi24/verifactu-sdk/tree/main/plugins/verifactu)
in this repository.
