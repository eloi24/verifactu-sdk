# Flow control

The AEAT VERI*FACTU service has hard throughput limits encoded in the WSDL: at
most **1 000 records per submission** and, more importantly, a server-driven
back-off via the `TiempoEsperaEnvio` field returned in every response. The SDK
ships a built-in `FlowController` that respects both constraints transparently.

## What the AEAT enforces

| Constraint                              | Where                                       | Effect on the client                            |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| ≤ 1 000 `RegistroAlta` per submission   | Schema `RegFactuSistemaFacturacion`         | Submissions over 1 000 are rejected (envelope). |
| ≤ 1 000 `RegistroAnulacion` per submission | Same schema                              | Same.                                           |
| `TiempoEsperaEnvio` (seconds)           | Response `RespuestaRegFactuSistemaFacturacion` | The caller must wait at least that many seconds before the next submission. |
| Throttling on `503 Service Unavailable` | Network-level                               | Exponential back-off recommended.               |

Hitting any of these is a *flow-control* violation. The first two are detected
locally before submission; the third one is signalled by the AEAT and triggers
the controller's sleep.

## How the SDK handles it

`VerifactuClient` instantiates a `FlowController` internally with the
following behaviour:

1. **Queue submissions** — `registerInvoice` / `cancelInvoice` calls are
   serialised per client instance (concurrency = 1). This guarantees the chain
   is never broken by parallel writes.
2. **Honour `TiempoEsperaEnvio`** — after each response the controller sleeps
   for the returned number of seconds before letting the next call out.
3. **Batch automatically** — when you submit a list of more than 1 000 records
   (via `registerInvoiceBatch`, see below), the controller splits it into
   chunks of 1 000 and waits between them.
4. **Back off on `503`** — the SDK retries up to 3 times with exponential
   back-off (1 s, 2 s, 4 s) on transient transport failures.

You do not configure any of this manually; it is part of the default
behaviour.

## Batches

When you need to submit more than one record, prefer the batch API:

```ts
const responses = await client.registerInvoiceBatch([invoice1, invoice2, /* ... */]);
```

The controller will chunk the list, respect each `TiempoEsperaEnvio`, and
return one response per chunk. The hash chain is maintained automatically —
the first record of every chunk after the first reuses the last hash from the
previous chunk.

## Idempotency

The AEAT honours `IdPeticionRegistroDuplicado`: if you re-send the same
record with the same identifier triple, you get back the original response
instead of a duplicate insertion. The SDK uses this transparently when it
retries after a transport error — the same record can be safely re-submitted
without producing duplicates.

## Working with the controller directly

If you bypass `VerifactuClient` and call the lower-level `SoapClient` you can
instantiate the controller yourself:

```ts
import { FlowController, SoapClient } from 'verifactu-sdk';

const controller = new FlowController();
const soap = new SoapClient({ /* ... */ });

await controller.run(async () => soap.send(envelope));
```

`controller.run(fn)` waits its turn, executes the callback, parses the
`TiempoEsperaEnvio` from the response and sleeps accordingly before releasing
the next caller.

## Tuning

A few constructor options are exposed for advanced cases:

```ts
new FlowController({
  maxRetries: 3,        // default 3
  initialBackoffMs: 1000, // default 1000
  maxBackoffMs: 30000,    // default 30000
  hardMinWaitMs: 0,       // floor on the AEAT-reported wait time
});
```

Setting `hardMinWaitMs` to a non-zero value can be useful in development if
the pre-production environment returns `TiempoEsperaEnvio = 0` (which is
allowed) but you want a synthetic delay to surface ordering bugs.

## What raises `FlowControlError`

The controller throws `FlowControlError` (a subclass of `VerifactuError`)
when:

- A submission carries more than 1 000 records and you bypassed the batch API.
- The AEAT returns an unrecoverable throttling response (multiple consecutive
  `503`s).
- The hash chain detects an out-of-order submission (you supplied a record
  whose `previousHash` does not match the last accepted hash).

Catch and handle it like any other SDK error:

```ts
try {
  await client.registerInvoice(invoice);
} catch (err) {
  if (err instanceof FlowControlError) {
    console.error('Wait %s seconds before retrying', err.field);
  } else {
    throw err;
  }
}
```

## Next

- [Hash chain](./hash-chain.md)
- [Error codes](./error-codes.md) — for the AEAT-side error responses.
