# Certificates

Every call to the AEAT VERI*FACTU endpoints is authenticated with a client
certificate (mTLS). This page covers how to obtain, format and pass the
certificate to the SDK.

## What kind of certificate is required

The AEAT accepts:

- **Certificado de representante de persona jurídica** — issued by the FNMT or
  any *prestador de servicios de confianza cualificado* listed at the *Sede
  electrónica*. This is the most common option for SaaS providers that act as
  representatives of their customers.
- **Certificado de sello electrónico** — for unattended back-office systems.
  Routes to a separate URL pool (`*10*`) which the SDK selects automatically
  when you set `withSeal: true`.
- **Certificado de persona física** — for individual freelancers issuing their
  own invoices.

The certificate must:

- Be issued by a CA that the AEAT trusts (FNMT, Camerfirma, Firmaprofesional,
  ANCERT, IZENPE, …).
- Be valid (not expired, not revoked).
- Have the **digital signature** and **client authentication** key-usage
  extensions.

## Loading from PKCS#12 (.pfx / .p12)

The most common format. The SDK accepts the raw `Buffer` and the passphrase:

```ts
import { readFileSync } from 'node:fs';
import { VerifactuClient, Environment } from 'verifactu-sdk';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'verifactu',
  certificate: {
    pfx: readFileSync('./cert.pfx'),
    passphrase: process.env.CERT_PASS ?? '',
  },
  /* ... */
});
```

Never commit the `.pfx` or the passphrase to source control. Inject them via
environment variables, a secret manager (AWS Secrets Manager, HashiCorp Vault,
Bitwarden, …) or a mounted volume.

## Loading from PEM

If you keep the key and the certificate in separate PEM files, pass them as
strings or `Buffer`s:

```ts
import { readFileSync } from 'node:fs';

const certificate = {
  cert: readFileSync('./cert.pem', 'utf8'),
  key: readFileSync('./key.pem', 'utf8'),
  passphrase: process.env.KEY_PASS, // optional, only if the key is encrypted
};
```

PEM files often contain a chain of intermediates. The SDK will pass the whole
PEM blob to `undici` — that is the recommended layout because the AEAT
validates the full chain server-side.

## Sello electrónico (electronic seal)

The AEAT routes sello-electrónico submissions through a separate URL pool
(`prewww10.aeat.es` / `www10.agenciatributaria.gob.es`). Tell the SDK to use it
with `withSeal: true`:

```ts
const client = new VerifactuClient({
  environment: Environment.Production,
  mode: 'verifactu',
  withSeal: true,
  certificate: { pfx: readFileSync('./seal.pfx'), passphrase: '...' },
  /* ... */
});
```

## Acting on behalf of another taxpayer

When you submit invoices on behalf of a customer (the most common SaaS layout),
set both `taxpayer` (the customer) **and** `representative` (you):

```ts
const client = new VerifactuClient({
  /* ... */
  taxpayer: { nif: 'B11111111', legalName: 'Customer SL' },
  representative: { nif: 'B99999999', legalName: 'Acme Software SL' },
});
```

The certificate you pass must be issued in the representative's name — the AEAT
cross-checks the certificate subject with the `<Representante>` block of the
envelope.

## Pre-production certificates

The AEAT publishes a sandbox at `prewww1.aeat.es`. They issue free test
certificates on request (search for *"Certificado pruebas TIKE"* on the
*Sede electrónica*). Use them while developing:

```ts
const client = new VerifactuClient({
  environment: Environment.Preproduction, // ← pre-prod URL pool
  /* ... */
});
```

The pre-production endpoint accepts the same payloads as production but does
not affect the real census. Keep the e2e test suite (`bun run test:e2e`)
pointed there.

## Troubleshooting

| Symptom                                  | Likely cause                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `NetworkError: unable to verify the first certificate` | The CA bundle is missing intermediates — pass the full chain in the PEM. |
| `SoapFaultError: 401 Unauthorized`       | The AEAT does not trust your CA, or the certificate is revoked.               |
| `SoapFaultError: NIF del certificado…`   | The certificate subject does not match `taxpayer.nif` / `representative.nif`. |
| `Error: PFX file truncated`              | The `.pfx` was downloaded as text — re-download it in binary mode.            |

See the AEAT FAQ for the full diagnostic list:
<https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas.html>.

## Next

- [Quickstart](./quickstart.md) — register an invoice.
- [Flow control](./flow-control.md) — how the SDK honours the `TiempoEsperaEnvio`.
