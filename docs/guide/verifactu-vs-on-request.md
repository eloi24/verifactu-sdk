# VERI*FACTU vs on-request

The AEAT exposes two submission modes for the same underlying records. The SDK
covers both behind a single client; you choose between them with the
`mode: 'verifactu' | 'onRequest'` flag at construction time.

## Side-by-side

| Aspect                         | VERI*FACTU (voluntary)                            | On-request (under AEAT requirement)               |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| Trigger                        | The taxpayer adheres voluntarily.                 | The AEAT issues a `Requerimiento` to the taxpayer. |
| Submission frequency           | At each invoice issuance or in small batches.     | When the AEAT asks; usually one batch.            |
| Signature                      | None at the record level — TLS only.              | XAdES-BES enveloped over each record.             |
| Query endpoint                 | Yes — paginated, by year/period.                  | No — the AEAT keeps the records server-side.      |
| QR URL                         | `…/ValidarQR?…`                                   | `…/ValidarQRNoVerifactu?…`                        |
| `ObligadoEmision.FechaFinVeriFactu` | Optional, when the taxpayer leaves the regime. | Not applicable.                                   |
| Endpoint family                | `…/VerifactuSOAP`                                 | `…/RequerimientoSOAP`                             |

## Choosing the mode

The decision is rarely yours — it follows the taxpayer's regulatory state:

- **You issue invoices voluntarily** and want to qualify under the VERI*FACTU
  regime (with the legal benefits that entails): use `mode: 'verifactu'`.
- **The AEAT has issued you a `Requerimiento`** to provide your invoicing
  records: use `mode: 'onRequest'`. You must include the reference number in
  every submission.

You can run two clients side-by-side if your platform serves taxpayers in both
modes:

```ts
import { VerifactuClient, Environment } from 'verifactu-sdk';

const voluntary = new VerifactuClient({
  mode: 'verifactu',
  environment: Environment.Production,
  certificate: /* ... */,
  /* ... */
});

const onRequest = new VerifactuClient({
  mode: 'onRequest',
  environment: Environment.Production,
  certificate: /* ... */,
  onRequestHeader: { requirementReference: 'REQ-2026-000123' },
  /* ... */
});
```

## On-request signature

In on-request mode every `RegistroAlta` and `RegistroAnulacion` must be signed
with XAdES-BES enveloped (RSA-SHA256, canonicalisation C14N). The SDK does this
for you using the same certificate you pass at construction time:

```ts
const response = await onRequest.registerInvoice(invoice);
// → The SDK serialises the record, signs it, and submits the envelope.
```

You can also sign a record manually for offline storage:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, { pfx, passphrase });
```

## Hash chain

Both modes use the **same** chained-hash algorithm. The chain is per-taxpayer
and per-installation, not per-mode: if a taxpayer switches from voluntary to
on-request, the next record continues the same chain.

See [Hash chain](./hash-chain.md) for the full algorithm.

## Switching mode

The AEAT allows a taxpayer to leave the voluntary regime. In that case, the
last voluntary submission carries `FechaFinVeriFactu` (always
`31-12-AAAA`). After that, the taxpayer is back on the standard regime — the
SDK accepts no further `verifactu` submissions but the on-request mode remains
available if the AEAT eventually requires the records.

```ts
await client.registerInvoice({
  /* ... */
  headerMode: { voluntary: { endOfVerifactuDate: '31-12-2027' } },
});
```

## Next

- [Hash chain](./hash-chain.md)
- [QR code](./qr-code.md) — different URL per mode.
- [Validations](./validations.md) — the same 23 rules apply in both modes.
