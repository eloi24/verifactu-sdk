# VERI*FACTU vs. requerimiento

La AEAT expone dos modos de remisión para los mismos registros subyacentes. El
SDK cubre ambos detrás de un único cliente; eliges entre ellos con el flag
`mode: 'verifactu' | 'onRequest'` en el constructor.

## Comparativa

| Aspecto                        | VERI*FACTU (voluntario)                                | Requerimiento (bajo orden de la AEAT)              |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------- |
| Activación                     | El obligado se adhiere voluntariamente.                | La AEAT emite un `Requerimiento` al obligado.      |
| Frecuencia de envío            | En cada emisión o en lotes pequeños.                   | Cuando la AEAT lo pide; normalmente un solo lote.  |
| Firma                          | Ninguna a nivel de registro — sólo TLS.                | XAdES-BES envolvente sobre cada registro.          |
| Endpoint de consulta           | Sí — paginado, por año/periodo.                        | No — la AEAT guarda los registros en su sistema.   |
| URL del QR                     | `…/ValidarQR?…`                                        | `…/ValidarQRNoVerifactu?…`                         |
| `ObligadoEmision.FechaFinVeriFactu` | Opcional, al abandonar el régimen.                | No aplica.                                         |
| Familia de endpoints           | `…/VerifactuSOAP`                                      | `…/RequerimientoSOAP`                              |

## Elegir el modo

La decisión rara vez es tuya — depende del estado regulatorio del obligado:

- **Emites facturas voluntariamente** y quieres acogerte al régimen VERI*FACTU
  (con los beneficios legales que conlleva): usa `mode: 'verifactu'`.
- **La AEAT te ha emitido un `Requerimiento`** para aportar tus registros de
  facturación: usa `mode: 'onRequest'`. Debes incluir la referencia del
  requerimiento en cada envío.

Puedes ejecutar dos clientes en paralelo si tu plataforma da servicio a obligados
en ambos modos:

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

## Firma en modo requerimiento

En modo requerimiento, cada `RegistroAlta` y `RegistroAnulacion` debe firmarse
con XAdES-BES envolvente (RSA-SHA256, canonicalización C14N). El SDK lo hace por
ti con el mismo certificado que pasas en el constructor:

```ts
const response = await onRequest.registerInvoice(invoice);
// → El SDK serializa el registro, lo firma y envía el sobre.
```

También puedes firmar un registro manualmente para almacenamiento offline:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, { pfx, passphrase });
```

## Cadena de huellas

Ambos modos usan el **mismo** algoritmo de huella encadenada. La cadena es por
obligado y por instalación, no por modo: si un obligado pasa de voluntario a
requerimiento, el siguiente registro continúa la misma cadena.

Consulta [Cadena de huellas](./hash-chain.md) para el algoritmo completo.

## Cambio de modo

La AEAT permite a un obligado abandonar el régimen voluntario. En ese caso, el
último envío voluntario lleva `FechaFinVeriFactu` (siempre `31-12-AAAA`).
Después de eso, el obligado vuelve al régimen estándar — el SDK no acepta más
envíos en modo `verifactu`, pero el modo requerimiento sigue disponible si la
AEAT termina necesitando los registros.

```ts
await client.registerInvoice({
  /* ... */
  headerMode: { voluntary: { endOfVerifactuDate: '31-12-2027' } },
});
```

## Siguiente

- [Cadena de huellas](./hash-chain.md)
- [Código QR](./qr-code.md) — URL diferente por modo.
- [Validaciones](./validations.md) — las 23 reglas se aplican en ambos modos.
