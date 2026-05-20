# Certificados

Toda llamada a los endpoints de VERI*FACTU de la AEAT se autentica con un
certificado de cliente (mTLS). Esta página cubre cómo obtener, formatear y
pasar el certificado al SDK.

## Qué tipo de certificado se requiere

La AEAT acepta:

- **Certificado de representante de persona jurídica** — emitido por la FNMT o
  cualquier *prestador de servicios de confianza cualificado* listado en la
  *Sede electrónica*. Es la opción habitual para proveedores SaaS que actúan
  como representantes de sus clientes.
- **Certificado de sello electrónico** — para sistemas de back-office
  desatendidos. Encamina a un pool de URLs separado (`*10*`) que el SDK
  selecciona automáticamente cuando configuras `withSeal: true`.
- **Certificado de persona física** — para autónomos que emiten sus propias
  facturas.

El certificado debe:

- Estar emitido por una CA en la que la AEAT confíe (FNMT, Camerfirma,
  Firmaprofesional, ANCERT, IZENPE, …).
- Estar vigente (no caducado, no revocado).
- Tener las extensiones de uso de clave **firma digital** y **autenticación de
  cliente**.

## Cargar desde PKCS#12 (.pfx / .p12)

Es el formato más habitual. El SDK acepta el `Buffer` en bruto y la passphrase:

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

No subas nunca el `.pfx` o la passphrase al control de versiones. Inyéctalos
mediante variables de entorno, un gestor de secretos (AWS Secrets Manager,
HashiCorp Vault, Bitwarden, …) o un volumen montado.

## Cargar desde PEM

Si mantienes la clave y el certificado en ficheros PEM separados, pásalos como
cadenas o `Buffer`s:

```ts
import { readFileSync } from 'node:fs';

const certificate = {
  cert: readFileSync('./cert.pem', 'utf8'),
  key: readFileSync('./key.pem', 'utf8'),
  passphrase: process.env.KEY_PASS, // opcional, sólo si la clave está cifrada
};
```

Los ficheros PEM suelen contener una cadena de intermediarios. El SDK pasará el
blob PEM completo a `undici` — es la maquetación recomendada porque la AEAT
valida la cadena completa en el servidor.

## Sello electrónico

La AEAT enruta los envíos con sello electrónico por un pool de URLs separado
(`prewww10.aeat.es` / `www10.agenciatributaria.gob.es`). Indica al SDK que lo
use con `withSeal: true`:

```ts
const client = new VerifactuClient({
  environment: Environment.Production,
  mode: 'verifactu',
  withSeal: true,
  certificate: { pfx: readFileSync('./seal.pfx'), passphrase: '...' },
  /* ... */
});
```

## Actuar en representación de otro obligado

Cuando envías facturas en nombre de un cliente (el caso más habitual en SaaS),
configura tanto `taxpayer` (el cliente) **como** `representative` (tú):

```ts
const client = new VerifactuClient({
  /* ... */
  taxpayer: { nif: 'B11111111', legalName: 'Customer SL' },
  representative: { nif: 'B99999999', legalName: 'Eloi Baulenas' },
});
```

El certificado que pases debe estar emitido a nombre del representante — la AEAT
cruza el subject del certificado con el bloque `<Representante>` del sobre.

## Certificados de pre-producción

La AEAT publica un sandbox en `prewww1.aeat.es`. Emiten certificados de prueba
gratuitos a petición (busca *"Certificado pruebas TIKE"* en la *Sede electrónica*).
Úsalos durante el desarrollo:

```ts
const client = new VerifactuClient({
  environment: Environment.Preproduction, // ← pool de URLs de pre-prod
  /* ... */
});
```

El endpoint de pre-producción acepta los mismos payloads que producción pero no
afecta al censo real. Mantén la suite de pruebas e2e (`bun run test:e2e`)
apuntando allí.

## Resolución de problemas

| Síntoma                                  | Causa probable                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `NetworkError: unable to verify the first certificate` | Faltan intermediarios en el bundle de CA — pasa la cadena completa en el PEM. |
| `SoapFaultError: 401 Unauthorized`       | La AEAT no confía en tu CA, o el certificado está revocado.                     |
| `SoapFaultError: NIF del certificado…`   | El subject del certificado no coincide con `taxpayer.nif` / `representative.nif`. |
| `Error: PFX file truncated`              | El `.pfx` se descargó como texto — vuelve a descargarlo en modo binario.        |

Consulta la FAQ de la AEAT para la lista completa de diagnósticos:
<https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas.html>.

## Siguiente

- [Inicio rápido](./quickstart.md) — registra una factura.
- [Control de flujo](./flow-control.md) — cómo el SDK respeta el `TiempoEsperaEnvio`.
