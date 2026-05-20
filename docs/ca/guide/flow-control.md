# Control de flux

El servei VERI*FACTU de l'AEAT té límits de throughput estrictes codificats
al WSDL: com a màxim **1 000 registres per enviament** i, més important, un
back-off pilotat pel servidor a través del camp `TiempoEsperaEnvio` que
retorna a cada resposta. El SDK incorpora un `FlowController` que respecta
ambdues restriccions de forma transparent.

## Què imposa l'AEAT

| Restricció                              | On                                          | Efecte al client                                    |
| --------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| ≤ 1 000 `RegistroAlta` per enviament    | Schema `RegFactuSistemaFacturacion`         | Enviaments per sobre de 1 000 són rebutjats (envelope). |
| ≤ 1 000 `RegistroAnulacion` per enviament | Mateix schema                            | Ídem.                                               |
| `TiempoEsperaEnvio` (segons)            | Resposta `RespuestaRegFactuSistemaFacturacion` | El client ha d'esperar com a mínim aquest temps abans del següent enviament. |
| Throttling amb `503 Service Unavailable`| A nivell de xarxa                           | Es recomana back-off exponencial.                   |

Saltar-se qualsevol d'aquestes és una violació de *control de flux*. Les
dues primeres es detecten localment abans de l'enviament; la tercera la
senyalitza l'AEAT i activa el sleep del controlador.

## Com ho gestiona el SDK

`VerifactuClient` instancia internament un `FlowController` amb el
comportament següent:

1. **Posa els enviaments en cua** — les crides `registerInvoice` /
   `cancelInvoice` es serialitzen per instància de client (concurrència = 1).
   Això garanteix que la cadena mai no es trenca per escriptures paral·leles.
2. **Respecta `TiempoEsperaEnvio`** — després de cada resposta, el
   controlador dorm els segons indicats abans de deixar passar la següent
   crida.
3. **Trosseja automàticament** — quan envies una llista de més de 1 000
   registres (via `registerInvoiceBatch`, veure més avall), el controlador
   la parteix en lots de 1 000 i espera entre ells.
4. **Back-off davant `503`** — el SDK reintenta fins a 3 vegades amb
   back-off exponencial (1 s, 2 s, 4 s) davant fallades transitòries de
   transport.

No configures res de tot això manualment; forma part del comportament per
defecte.

## Lots

Quan necessites enviar més d'un registre, prefereix l'API per lots:

```ts
const responses = await client.registerInvoiceBatch([invoice1, invoice2, /* ... */]);
```

El controlador trosseja la llista, respecta cada `TiempoEsperaEnvio`, i
retorna una resposta per chunk. La cadena d'empremtes es manté
automàticament — el primer registre de cada chunk a partir del segon
reutilitza l'última empremta del chunk anterior.

## Idempotència

L'AEAT respecta `IdPeticionRegistroDuplicado`: si reenvies el mateix
registre amb el mateix triple identificador, reps la resposta original en
lloc d'una inserció duplicada. El SDK ho fa servir de forma transparent
quan reintenta després d'un error de transport — el mateix registre es pot
reenviar sense risc de produir duplicats.

## Treballar amb el controlador directament

Si saltes `VerifactuClient` i crides el `SoapClient` de baix nivell, pots
instanciar tu mateix el controlador:

```ts
import { FlowController, SoapClient } from 'verifactu-sdk';

const controller = new FlowController();
const soap = new SoapClient({ /* ... */ });

await controller.run(async () => soap.send(envelope));
```

`controller.run(fn)` espera el seu torn, executa el callback, parseja el
`TiempoEsperaEnvio` de la resposta i dorm en conseqüència abans
d'alliberar el següent client.

## Ajust fi

Hi ha algunes opcions del constructor exposades per a casos avançats:

```ts
new FlowController({
  maxRetries: 3,         // per defecte 3
  initialBackoffMs: 1000, // per defecte 1000
  maxBackoffMs: 30000,    // per defecte 30000
  hardMinWaitMs: 0,       // terra sobre el temps d'espera reportat per l'AEAT
});
```

Posar `hardMinWaitMs` a un valor no nul pot ser útil en desenvolupament si
l'entorn de preproducció retorna `TiempoEsperaEnvio = 0` (permès) però vols
un delay sintètic per fer aflorar bugs d'ordenació.

## Què aixeca `FlowControlError`

El controlador llança `FlowControlError` (subclasse de `VerifactuError`)
quan:

- Un enviament porta més de 1 000 registres i has saltat l'API per lots.
- L'AEAT retorna una resposta de throttling irrecuperable (diversos `503`
  consecutius).
- La cadena d'empremtes detecta un enviament fora d'ordre (has aportat un
  registre el `previousHash` del qual no coincideix amb l'última empremta
  acceptada).

Captura-ho i tracta-ho com qualsevol altre error del SDK:

```ts
try {
  await client.registerInvoice(invoice);
} catch (err) {
  if (err instanceof FlowControlError) {
    console.error('Espera %s segons abans de reintentar', err.field);
  } else {
    throw err;
  }
}
```

## Següent

- [Cadena d'empremtes](./hash-chain.md)
- [Codis d'error](./error-codes.md) — per a les respostes d'error del costat AEAT.
