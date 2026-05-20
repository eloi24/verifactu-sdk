# Certificados

Toda chamada aos endpoints VERI*FACTU da AEAT autentícase cun certificado
de cliente (mTLS). Esta páxina cobre como obter, formatar e pasar o
certificado ao SDK.

## Que tipo de certificado se require

A AEAT acepta:

- **Certificado de representante de persoa xurídica** — emitido pola FNMT
  ou calquera *prestador de servizos de confianza cualificado* listado na
  *Sede electrónica*. É a opción habitual para provedores SaaS que actúan
  como representantes dos seus clientes.
- **Certificado de selo electrónico** — para sistemas de back-office
  desatendidos. Encamiña a un pool de URLs separado (`*10*`) que o SDK
  selecciona automaticamente cando configuras `withSeal: true`.
- **Certificado de persoa física** — para autónomos que emiten as súas
  propias facturas.

O certificado debe:

- Estar emitido por unha CA na que a AEAT confíe (FNMT, Camerfirma,
  Firmaprofesional, ANCERT, IZENPE, …).
- Estar vixente (non caducado, non revogado).
- Ter as extensións de uso de clave **sinatura dixital** e **autenticación
  de cliente**.

## Cargar desde PKCS#12 (.pfx / .p12)

É o formato máis habitual. O SDK acepta o `Buffer` en bruto e a
passphrase:

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

Nunca subas o `.pfx` ou a passphrase ao control de versións. Inxéctaos
mediante variables de ambiente, un xestor de segredos (AWS Secrets Manager,
HashiCorp Vault, Bitwarden, …) ou un volume montado.

## Cargar desde PEM

Se mantés a chave e o certificado en ficheiros PEM separados, pásaos como
cadeas ou `Buffer`s:

```ts
import { readFileSync } from 'node:fs';

const certificate = {
  cert: readFileSync('./cert.pem', 'utf8'),
  key: readFileSync('./key.pem', 'utf8'),
  passphrase: process.env.KEY_PASS, // opcional, só se a chave está cifrada
};
```

Os ficheiros PEM adoitan conter unha cadea de intermediarios. O SDK
pasará o blob PEM completo a `undici` — é a maquetación recomendada
porque a AEAT valida a cadea completa no servidor.

## Selo electrónico

A AEAT enruta os envíos con selo electrónico por un pool de URLs separado
(`prewww10.aeat.es` / `www10.agenciatributaria.gob.es`). Indica ao SDK que
o use con `withSeal: true`:

```ts
const client = new VerifactuClient({
  environment: Environment.Production,
  mode: 'verifactu',
  withSeal: true,
  certificate: { pfx: readFileSync('./seal.pfx'), passphrase: '...' },
  /* ... */
});
```

## Actuar en representación doutro obrigado

Cando envías facturas en nome dun cliente (o caso máis habitual en SaaS),
configura tanto `taxpayer` (o cliente) **como** `representative` (ti):

```ts
const client = new VerifactuClient({
  /* ... */
  taxpayer: { nif: 'B11111111', legalName: 'Customer SL' },
  representative: { nif: 'B99999999', legalName: 'Eloi Baulenas' },
});
```

O certificado que pases debe estar emitido a nome do representante — a
AEAT cruza o subject do certificado co bloque `<Representante>` do sobre.

## Certificados de pre-produción

A AEAT publica un sandbox en `prewww1.aeat.es`. Emiten certificados de
proba gratuítos a petición (busca *"Certificado pruebas TIKE"* na *Sede
electrónica*). Úsaos durante o desenvolvemento:

```ts
const client = new VerifactuClient({
  environment: Environment.Preproduction, // ← pool de URLs de pre-prod
  /* ... */
});
```

O endpoint de pre-produción acepta os mesmos payloads que produción pero
non afecta ao censo real. Mantén a suite de probas e2e
(`bun run test:e2e`) apuntando alí.

## Resolución de problemas

| Síntoma                                  | Causa probable                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `NetworkError: unable to verify the first certificate` | Faltan intermediarios no bundle de CA — pasa a cadea completa no PEM. |
| `SoapFaultError: 401 Unauthorized`       | A AEAT non confía na túa CA, ou o certificado está revogado.                    |
| `SoapFaultError: NIF del certificado…`   | O subject do certificado non coincide con `taxpayer.nif` / `representative.nif`. |
| `Error: PFX file truncated`              | O `.pfx` descargouse como texto — vólveo descargar en modo binario.             |

Consulta a FAQ da AEAT para a lista completa de diagnósticos:
<https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas.html>.

## Seguinte

- [Inicio rápido](./quickstart.md) — rexistra unha factura.
- [Control de fluxo](./flow-control.md) — como o SDK respecta o `TiempoEsperaEnvio`.
