---
description: Audit an existing invoicing/billing codebase for AEAT Veri*Factu compliance gaps (hash chaining, QR, signature, error handling, flow control) using verifactu-sdk. Use when the user asks whether their invoicing code is Veri*Factu compliant, wants a compliance/production-readiness review, or is migrating an existing invoicing system to Veri*Factu.
---

# Audit Veri*Factu compliance

You are reviewing a codebase that issues invoices for a Spanish taxpayer, checking it
against the AEAT **Veri\*Factu** requirements (Real Decreto 1007/2023, Orden HAC/1177/2024),
using `verifactu-sdk` as the reference implementation.

## Checklist

Walk the codebase and report a pass/fail per item, citing the file/line:

1. **Hash chaining (`huella`)** — is every registration's `ChainLink` computed from the
   *actual* previous record in that taxpayer's chain, persisted durably? `hashStore` is a
   required `VerifactuClient` constructor option (no in-memory default exists), so check
   *what's actually passed*: it should be one of the bundled adapters
   (`verifactu-sdk/store/{bun-sql,sqlite,better-sqlite3,pg,mysql,redis,drizzle}`) or an equivalent durable
   custom `HashStore` — flag a hand-rolled store that isn't actually persisted (e.g. a
   `Map` wrapped in a class to satisfy the type). A broken chain invalidates every
   subsequent record.
2. **Submission mode** — is the code using `'verifactu'` (voluntary real-time) or
   `'onRequest'` mode consistently with what the taxpayer declared to the AEAT? On-request
   mode requires XAdES-BES signing on every record — verify it's actually signed, not
   skipped.
3. **QR code** — is the mandatory tax QR rendered and printed/embedded on every invoice
   per spec v0.5.0 (ISO/IEC 18004:2015, error correction M)? Check `sizeMm` and that the QR
   URL matches the environment (pre vs prod) the invoice was actually submitted to.
4. **Error handling** — does the code distinguish `SchemaValidationError` /
   `BusinessValidationError` (fix before resubmitting) from `SoapFaultError` (inspect
   `category` via `ERROR_CATALOG` — `envelope` errors need the whole batch resent,
   `record` errors need only that record fixed, `admissible` errors need a later
   `Subsanacion`)? Swallowing or logging-and-ignoring any of these is a compliance gap.
5. **Flow control** — does submission respect the 1000-records-per-batch limit and
   `TiempoEsperaEnvio` backoff, or does custom code bypass the SDK's client and hit the
   AEAT endpoint directly/in a tight loop? Also check for `FlowControlError` handling.
6. **NIF/tax validation** — are counterpart NIF/NIE/CIF/NIF-IVA values validated locally
   (the SDK covers all 28 EU states incl. Brexit handling) before submission, to avoid
   burning a `SoapFaultError` round-trip on data errors that are cheap to catch locally?
7. **Certificate handling** — is the AEAT client certificate loaded from a secret store
   (not committed to the repo, not logged), and is the correct certificate used per
   environment (pre-production vs production have separate certs)?
8. **Cancellation/rectification** — does the code use `client.cancelInvoice` /
   rectifying invoice types (R1-R5) rather than silently re-issuing or deleting records
   locally when an invoice needs to be voided? Local-only deletion breaks the chain the
   AEAT expects.
9. **Environment correctness** — is `Environment.Production` only reachable via a real
   deploy config, never a default, to avoid accidental live submissions from dev/test?

## Spec drift

Before flagging something as a *bug*, check whether it's actually a spec change: fetch
the live `errores.properties` and the seven XSDs from the AEAT developer portal
(`https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/`)
and diff against the SDK's cached copies in `schemas-aeat/` before concluding the SDK
itself is out of date — the AEAT does remove/add error codes and adjust XSDs over time.

## Output

Report findings as a checklist (pass/fail/n-a per item above) with file:line citations,
not prose. Flag missing items as concrete failure scenarios (what input/timing causes
what AEAT rejection or silent non-compliance), not just "should add X".
