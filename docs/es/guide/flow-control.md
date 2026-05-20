# Control de flujo

El servicio VERI*FACTU de la AEAT tiene límites de throughput estrictos
codificados en el WSDL: como máximo **1 000 registros por envío** y, más
importante, un back-off pilotado por el servidor mediante el campo
`TiempoEsperaEnvio` que devuelve en cada respuesta. El SDK incorpora un
`FlowController` que respeta ambas restricciones de forma transparente.

## Qué impone la AEAT

| Restricción                              | Dónde                                       | Efecto en el cliente                                |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| ≤ 1 000 `RegistroAlta` por envío         | Schema `RegFactuSistemaFacturacion`         | Envíos por encima de 1 000 son rechazados (envelope). |
| ≤ 1 000 `RegistroAnulacion` por envío    | Mismo schema                                | Idem.                                               |
| `TiempoEsperaEnvio` (segundos)           | Respuesta `RespuestaRegFactuSistemaFacturacion` | El llamador debe esperar al menos ese tiempo antes del siguiente envío. |
| Throttling con `503 Service Unavailable` | A nivel de red                              | Se recomienda back-off exponencial.                 |

Saltarse cualquiera de éstas es una violación de *control de flujo*. Las dos
primeras se detectan localmente antes del envío; la tercera la señaliza la AEAT
y activa el sleep del controlador.

## Cómo lo gestiona el SDK

`VerifactuClient` instancia internamente un `FlowController` con el siguiente
comportamiento:

1. **Pone los envíos en cola** — las llamadas `registerInvoice` /
   `cancelInvoice` se serializan por instancia de cliente (concurrencia = 1).
   Esto garantiza que la cadena nunca se rompe por escrituras paralelas.
2. **Respeta `TiempoEsperaEnvio`** — tras cada respuesta, el controlador
   duerme los segundos indicados antes de dejar pasar la siguiente llamada.
3. **Trocea automáticamente** — cuando envías una lista de más de 1 000
   registros (vía `registerInvoiceBatch`, ver más abajo), el controlador la
   parte en lotes de 1 000 y espera entre ellos.
4. **Back-off ante `503`** — el SDK reintenta hasta 3 veces con back-off
   exponencial (1 s, 2 s, 4 s) ante fallos transitorios de transporte.

No configuras nada de esto manualmente; forma parte del comportamiento por defecto.

## Lotes

Cuando necesitas enviar más de un registro, prefiere la API por lotes:

```ts
const responses = await client.registerInvoiceBatch([invoice1, invoice2, /* ... */]);
```

El controlador trocea la lista, respeta cada `TiempoEsperaEnvio`, y devuelve
una respuesta por chunk. La cadena de huellas se mantiene automáticamente — el
primer registro de cada chunk a partir del segundo reutiliza la última huella
del chunk anterior.

## Idempotencia

La AEAT respeta `IdPeticionRegistroDuplicado`: si reenvías el mismo registro
con el mismo triple identificador, recibes la respuesta original en lugar de
una inserción duplicada. El SDK lo usa de forma transparente cuando reintenta
tras un error de transporte — el mismo registro puede reenviarse sin riesgo
de producir duplicados.

## Trabajar con el controlador directamente

Si saltas `VerifactuClient` y llamas al `SoapClient` de bajo nivel, puedes
instanciar tú mismo el controlador:

```ts
import { FlowController, SoapClient } from 'verifactu-sdk';

const controller = new FlowController();
const soap = new SoapClient({ /* ... */ });

await controller.run(async () => soap.send(envelope));
```

`controller.run(fn)` espera su turno, ejecuta el callback, parsea el
`TiempoEsperaEnvio` de la respuesta y duerme en consecuencia antes de
liberar al siguiente llamador.

## Ajuste fino

Hay algunas opciones del constructor expuestas para casos avanzados:

```ts
new FlowController({
  maxRetries: 3,         // por defecto 3
  initialBackoffMs: 1000, // por defecto 1000
  maxBackoffMs: 30000,    // por defecto 30000
  hardMinWaitMs: 0,       // suelo sobre el tiempo de espera reportado por la AEAT
});
```

Poner `hardMinWaitMs` a un valor no nulo puede ser útil en desarrollo si el
entorno de pre-producción devuelve `TiempoEsperaEnvio = 0` (permitido) pero
quieres un delay sintético para hacer aflorar bugs de ordenación.

## Qué levanta `FlowControlError`

El controlador lanza `FlowControlError` (subclase de `VerifactuError`)
cuando:

- Un envío lleva más de 1 000 registros y has saltado la API por lotes.
- La AEAT devuelve una respuesta de throttling irrecuperable (varios `503`
  consecutivos).
- La cadena de huellas detecta un envío fuera de orden (has aportado un
  registro cuyo `previousHash` no coincide con la última huella aceptada).

Cáptalo y trátalo como cualquier otro error del SDK:

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

## Siguiente

- [Cadena de huellas](./hash-chain.md)
- [Códigos de error](./error-codes.md) — para las respuestas de error del lado AEAT.
