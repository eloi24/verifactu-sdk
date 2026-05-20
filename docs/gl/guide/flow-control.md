# Control de fluxo

O servizo VERI*FACTU da AEAT ten límites de throughput estritos codificados
no WSDL: como máximo **1 000 rexistros por envío** e, máis importante, un
back-off pilotado polo servidor a través do campo `TiempoEsperaEnvio` que
devolve en cada resposta. O SDK incorpora un `FlowController` que respecta
ambas as restricións de forma transparente.

## Que impón a AEAT

| Restrición                              | Onde                                        | Efecto no cliente                                  |
| --------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| ≤ 1 000 `RegistroAlta` por envío        | Schema `RegFactuSistemaFacturacion`         | Envíos por riba de 1 000 son rexeitados (envelope). |
| ≤ 1 000 `RegistroAnulacion` por envío   | Mesmo schema                                | Ídem.                                              |
| `TiempoEsperaEnvio` (segundos)          | Resposta `RespuestaRegFactuSistemaFacturacion` | O chamador debe esperar polo menos ese tempo antes do seguinte envío. |
| Throttling con `503 Service Unavailable`| A nivel de rede                             | Recoméndase back-off exponencial.                  |

Saltar calquera destas é unha violación de *control de fluxo*. As dúas
primeiras detéctanse localmente antes do envío; a terceira sinalízaa a
AEAT e activa o sleep do controlador.

## Como o xestiona o SDK

`VerifactuClient` instancia internamente un `FlowController` co seguinte
comportamento:

1. **Pon os envíos en cola** — as chamadas `registerInvoice` /
   `cancelInvoice` serialízanse por instancia de cliente (concorrencia =
   1). Isto garante que a cadea nunca se rompe por escrituras paralelas.
2. **Respecta `TiempoEsperaEnvio`** — tras cada resposta, o controlador
   dorme os segundos indicados antes de deixar pasar a seguinte chamada.
3. **Trocea automaticamente** — cando envías unha lista de máis de 1 000
   rexistros (vía `registerInvoiceBatch`, ver máis abaixo), o controlador
   párteo en lotes de 1 000 e espera entre eles.
4. **Back-off ante `503`** — o SDK reintenta ata 3 veces con back-off
   exponencial (1 s, 2 s, 4 s) ante fallos transitorios de transporte.

Non configuras nada disto manualmente; é parte do comportamento por
defecto.

## Lotes

Cando precisas enviar máis dun rexistro, prefire a API por lotes:

```ts
const responses = await client.registerInvoiceBatch([invoice1, invoice2, /* ... */]);
```

O controlador trocea a lista, respecta cada `TiempoEsperaEnvio`, e
devolve unha resposta por chunk. A cadea de pegadas mantense
automaticamente — o primeiro rexistro de cada chunk a partir do segundo
reutiliza a última pegada do chunk anterior.

## Idempotencia

A AEAT respecta `IdPeticionRegistroDuplicado`: se reenvías o mesmo
rexistro co mesmo triple identificador, recibes a resposta orixinal en
lugar dunha inserción duplicada. O SDK úsao de forma transparente cando
reintenta tras un erro de transporte — o mesmo rexistro pode reenviarse
sen risco de producir duplicados.

## Traballar co controlador directamente

Se saltas `VerifactuClient` e chamas o `SoapClient` de baixo nivel,
podes instanciar ti mesmo o controlador:

```ts
import { FlowController, SoapClient } from 'verifactu-sdk';

const controller = new FlowController();
const soap = new SoapClient({ /* ... */ });

await controller.run(async () => soap.send(envelope));
```

`controller.run(fn)` espera a súa quenda, executa o callback, parsea o
`TiempoEsperaEnvio` da resposta e dorme en consecuencia antes de liberar
o seguinte chamador.

## Axuste fino

Hai algunhas opcións do constructor expostas para casos avanzados:

```ts
new FlowController({
  maxRetries: 3,         // por defecto 3
  initialBackoffMs: 1000, // por defecto 1000
  maxBackoffMs: 30000,    // por defecto 30000
  hardMinWaitMs: 0,       // chan sobre o tempo de espera reportado pola AEAT
});
```

Poñer `hardMinWaitMs` a un valor non nulo pode ser útil en desenvolvemento
se o ambiente de pre-produción devolve `TiempoEsperaEnvio = 0` (permitido)
pero queres un delay sintético para facer aflorar bugs de ordenación.

## Que levanta `FlowControlError`

O controlador lanza `FlowControlError` (subclase de `VerifactuError`)
cando:

- Un envío leva máis de 1 000 rexistros e saltaches a API por lotes.
- A AEAT devolve unha resposta de throttling irrecuperable (varios `503`
  consecutivos).
- A cadea de pegadas detecta un envío fóra de orde (aportaches un
  rexistro cuxo `previousHash` non coincide coa última pegada aceptada).

Captúrao e tráteo como calquera outro erro do SDK:

```ts
try {
  await client.registerInvoice(invoice);
} catch (err) {
  if (err instanceof FlowControlError) {
    console.error('Espera %s segundos antes de reintentar', err.field);
  } else {
    throw err;
  }
}
```

## Seguinte

- [Cadea de pegadas](./hash-chain.md)
- [Códigos de erro](./error-codes.md) — para as respostas de erro do lado AEAT.
