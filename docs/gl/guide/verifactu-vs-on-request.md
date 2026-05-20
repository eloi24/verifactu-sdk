# VERI*FACTU vs. requirimento

A AEAT expón dous modos de remisión para os mesmos rexistros subxacentes.
O SDK cobre ambos detrás dun único cliente; eliches entre eles co flag
`mode: 'verifactu' | 'onRequest'` no constructor.

## Comparativa

| Aspecto                        | VERI*FACTU (voluntario)                                | Requirimento (baixo orde da AEAT)                  |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------- |
| Activación                     | O obrigado adhírese voluntariamente.                   | A AEAT emite un `Requerimiento` ao obrigado.       |
| Frecuencia de envío            | En cada emisión ou en lotes pequenos.                  | Cando a AEAT o pide; normalmente un só lote.       |
| Sinatura                       | Ningunha a nivel de rexistro — só TLS.                 | XAdES-BES envolvente sobre cada rexistro.          |
| Endpoint de consulta           | Si — paxinado, por ano/período.                        | Non — a AEAT garda os rexistros no seu sistema.    |
| URL do QR                      | `…/ValidarQR?…`                                        | `…/ValidarQRNoVerifactu?…`                         |
| `ObligadoEmision.FechaFinVeriFactu` | Opcional, ao abandonar o réxime.                  | Non aplica.                                        |
| Familia de endpoints           | `…/VerifactuSOAP`                                      | `…/RequerimientoSOAP`                              |

## Elixir o modo

A decisión raramente é túa — depende do estado regulatorio do obrigado:

- **Emites facturas voluntariamente** e queres acollerte ao réxime
  VERI*FACTU (cos beneficios legais que comporta): usa
  `mode: 'verifactu'`.
- **A AEAT emitiuche un `Requerimiento`** para aportar os teus rexistros
  de facturación: usa `mode: 'onRequest'`. Debes incluír a referencia do
  requirimento en cada envío.

Podes executar dous clientes en paralelo se a túa plataforma dá servizo a
obrigados nos dous modos:

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

## Sinatura en modo requirimento

En modo requirimento, cada `RegistroAlta` e `RegistroAnulacion` debe
asinarse con XAdES-BES envolvente (RSA-SHA256, canonicalización C14N).
O SDK faino por ti co mesmo certificado que pasas no constructor:

```ts
const response = await onRequest.registerInvoice(invoice);
// → O SDK serializa o rexistro, asínao e envía o sobre.
```

Tamén podes asinar un rexistro manualmente para almacenamento offline:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, { pfx, passphrase });
```

## Cadea de pegadas

Ambos modos usan o **mesmo** algoritmo de pegada encadeada. A cadea é por
obrigado e por instalación, non por modo: se un obrigado pasa de
voluntario a requirimento, o seguinte rexistro continúa a mesma cadea.

Consulta [Cadea de pegadas](./hash-chain.md) para o algoritmo completo.

## Cambio de modo

A AEAT permite a un obrigado abandonar o réxime voluntario. Neste caso, o
último envío voluntario leva `FechaFinVeriFactu` (sempre `31-12-AAAA`).
Despois diso, o obrigado volve ao réxime estándar — o SDK non acepta máis
envíos en modo `verifactu`, pero o modo requirimento segue dispoñible se
a AEAT acaba precisando os rexistros.

```ts
await client.registerInvoice({
  /* ... */
  headerMode: { voluntary: { endOfVerifactuDate: '31-12-2027' } },
});
```

## Seguinte

- [Cadea de pegadas](./hash-chain.md)
- [Código QR](./qr-code.md) — URL diferente por modo.
- [Validacións](./validations.md) — as 23 regras aplícanse nos dous modos.
