# VERI*FACTU vs. requeriment

L'AEAT exposa dos modes de remissió per als mateixos registres subjacents. El
SDK cobreix tots dos darrere d'un únic client; tries entre ells amb el flag
`mode: 'verifactu' | 'onRequest'` al constructor.

## Comparativa

| Aspecte                        | VERI*FACTU (voluntari)                                | Requeriment (sota ordre de l'AEAT)                |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| Activació                      | L'obligat s'adhereix voluntàriament.                  | L'AEAT emet un `Requerimiento` a l'obligat.       |
| Freqüència d'enviament         | A cada emissió o en lots petits.                      | Quan l'AEAT ho demana; normalment un sol lot.     |
| Signatura                      | Cap a nivell de registre — només TLS.                 | XAdES-BES envolvent sobre cada registre.          |
| Endpoint de consulta           | Sí — paginat, per any/període.                        | No — l'AEAT manté els registres al seu sistema.   |
| URL del QR                     | `…/ValidarQR?…`                                       | `…/ValidarQRNoVerifactu?…`                        |
| `ObligadoEmision.FechaFinVeriFactu` | Opcional, en abandonar el règim.                 | No aplica.                                        |
| Família d'endpoints            | `…/VerifactuSOAP`                                     | `…/RequerimientoSOAP`                             |

## Triar el mode

La decisió rarament és teva — depèn de l'estat regulatori de l'obligat:

- **Emets factures voluntàriament** i vols acollir-te al règim VERI*FACTU
  (amb els beneficis legals que comporta): fes servir `mode: 'verifactu'`.
- **L'AEAT t'ha emès un `Requerimiento`** per aportar els teus registres de
  facturació: fes servir `mode: 'onRequest'`. Has d'incloure la referència
  del requeriment a cada enviament.

Pots executar dos clients en paral·lel si la teva plataforma dona servei a
obligats en tots dos modes:

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

## Signatura en mode requeriment

En mode requeriment, cada `RegistroAlta` i `RegistroAnulacion` s'ha de signar
amb XAdES-BES envolvent (RSA-SHA256, canonicalització C14N). El SDK ho fa per
tu amb el mateix certificat que passes al constructor:

```ts
const response = await onRequest.registerInvoice(invoice);
// → El SDK serialitza el registre, el signa i envia el sobre.
```

També pots signar un registre manualment per a emmagatzematge offline:

```ts
import { signRegistroAlta } from 'verifactu-sdk';

const signedXml = await signRegistroAlta(invoice, { pfx, passphrase });
```

## Cadena d'empremtes

Tots dos modes fan servir el **mateix** algorisme d'empremta encadenada. La
cadena és per obligat i per instal·lació, no per mode: si un obligat passa de
voluntari a requeriment, el següent registre continua la mateixa cadena.

Consulta [Cadena d'empremtes](./hash-chain.md) per a l'algorisme complet.

## Canvi de mode

L'AEAT permet a un obligat abandonar el règim voluntari. En aquest cas,
l'últim enviament voluntari porta `FechaFinVeriFactu` (sempre `31-12-AAAA`).
Després d'això, l'obligat torna al règim estàndard — el SDK no accepta més
enviaments en mode `verifactu`, però el mode requeriment continua disponible
si l'AEAT acaba necessitant els registres.

```ts
await client.registerInvoice({
  /* ... */
  headerMode: { voluntary: { endOfVerifactuDate: '31-12-2027' } },
});
```

## Següent

- [Cadena d'empremtes](./hash-chain.md)
- [Codi QR](./qr-code.md) — URL diferent per mode.
- [Validacions](./validations.md) — les 23 regles s'apliquen en tots dos modes.
