# Testing

The SDK ships with a layered test suite that you can run yourself when you
fork or contribute to the project.

## Unit tests

The bulk of the suite is unit tests under `test/unit/`. They run against
in-memory data with no I/O.

```bash
bun test                # default — runs everything except e2e
bun test test/unit      # only unit tests
bun test --coverage     # with coverage
```

Coverage threshold is enforced by `bunfig.toml`:

- ≥ 90 % statements project-wide.
- ≥ 95 % statements under `src/validators/`.

The unit suite is the source of the **golden tests** for the spec-critical
pieces:

- Hash algorithm — the three reference hashes from the official v0.1.2 PDF.
- QR URLs — the four example URLs from the v0.5.0 PDF.
- XML round-trip — the four example envelopes from §9 of the SOAP Web Services
  description.

These tests **must never be edited to make a change pass**. If they break, fix
the implementation.

## Integration tests

Under `test/integration/`. A local mock SOAP server (using `undici`'s
interceptor API) replays canned AEAT responses, exercising the full SDK
stack short of the actual network:

```bash
bun test test/integration
```

The mock covers:

- Full acceptance (`Correcto`).
- Partial acceptance (`ParcialmenteCorrecto`) with one rejected record.
- Envelope rejection (`Incorrecto`).
- `SoapFault` responses.
- Variable `TiempoEsperaEnvio` to exercise the flow controller.
- Duplicate detection via `IdPeticionRegistroDuplicado`.

## End-to-end (AEAT pre-production)

The e2e suite lives under `test/e2e-aeat/` and is **opt-in** — it requires a
valid pre-production certificate and explicit consent via an environment
variable:

```bash
VERIFACTU_E2E=1 \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_CERT_PASS=changeme \
VERIFACTU_NIF=B12345678 \
bun run test:e2e
```

Without `VERIFACTU_E2E=1`, the suite is skipped (the spec calls
`describe.skipIf` so it does not even appear as a failure).

The flow it exercises:

1. Register a new invoice (`registerInvoice`) — expects `Correcto` + a CSV.
2. Wait the `TiempoEsperaEnvio` returned.
3. Query (`queryInvoices`) — confirms the record appears with state
   `Correcto`.
4. Cancel (`cancelInvoice`) — expects `Correcto`.
5. Query again — confirms the record state is now `Anulado`.

The test uses random `seriesNumber` values to avoid clashing with itself
across runs.

Pre-production certificates are free; request one via the AEAT
*Sede electrónica* (search for *"Certificado pruebas TIKE"*).

## Property-based tests

`test/unit/properties/` uses `fast-check` to fuzz the validators that take
numeric input (CuotaRepercutida, CuotaTotal, ImporteTotal margins) and the
NIF-IVA structure checks. Run them as part of the standard unit suite — they
are not separately gated.

## Type-level tests

`test/types/` uses `tsd` to pin the inferred types of the public API. Run
them with:

```bash
bun x tsd
```

The CI runs this alongside `bun test`. If you change a public function's
signature you must update the matching `.test-d.ts` file.

## Reproducing AEAT responses

If the AEAT changes a response format you need to update the integration
fixtures. The recommended flow is:

1. Capture the new response from the pre-production environment using
   `VERIFACTU_DEBUG=1`.
2. Sanitise the payload (strip CSVs and certificate-specific fields).
3. Save it under `test/fixtures/responses/`.
4. Wire it into the mock in `test/integration/mock/`.
5. Re-run `bun test test/integration` until green.

## Continuous integration

The GitHub Actions matrix runs the suite on Ubuntu, Windows and macOS, against
Bun `1.1.x` and `latest`. The job fails on:

- Any unit / integration test failure.
- Coverage below the configured threshold.
- Biome lint or typecheck errors.

The e2e suite is **not** part of CI — the certificate cannot be safely shared
with GitHub-hosted runners. Run it locally before tagging a release.

## See also

- [Validations](./validations.md) — the rules verified by the unit suite.
- [Error codes](./error-codes.md) — the catalog matched against AEAT responses.
