# Certificats

Tota crida als endpoints VERI*FACTU de l'AEAT s'autentica amb un certificat
de client (mTLS). Aquesta pàgina cobreix com obtenir, formatar i passar el
certificat al SDK.

## Quin tipus de certificat es requereix

L'AEAT accepta:

- **Certificat de representant de persona jurídica** — emès per la FNMT o
  qualsevol *prestador de serveis de confiança qualificat* llistat a la
  *Sede electrónica*. És l'opció habitual per a proveïdors SaaS que actuen
  com a representants dels seus clients.
- **Certificat de segell electrònic** — per a sistemes de back-office sense
  vigilància. Encamina a un pool d'URLs separat (`*10*`) que el SDK
  selecciona automàticament quan configures `withSeal: true`.
- **Certificat de persona física** — per a autònoms que emeten les seves
  pròpies factures.

El certificat ha de:

- Estar emès per una CA en la qual l'AEAT confiï (FNMT, Camerfirma,
  Firmaprofesional, ANCERT, IZENPE, …).
- Estar vigent (no caducat, no revocat).
- Tenir les extensions d'ús de clau **signatura digital** i **autenticació
  de client**.

## Carregar des de PKCS#12 (.pfx / .p12)

És el format més habitual. El SDK accepta el `Buffer` en brut i la passphrase:

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

No pugis mai el `.pfx` o la passphrase al control de versions. Injecta'ls amb
variables d'entorn, un gestor de secrets (AWS Secrets Manager, HashiCorp
Vault, Bitwarden, …) o un volum muntat.

## Carregar des de PEM

Si mantens la clau i el certificat en fitxers PEM separats, passa'ls com a
cadenes o `Buffer`s:

```ts
import { readFileSync } from 'node:fs';

const certificate = {
  cert: readFileSync('./cert.pem', 'utf8'),
  key: readFileSync('./key.pem', 'utf8'),
  passphrase: process.env.KEY_PASS, // opcional, només si la clau està xifrada
};
```

Els fitxers PEM solen contenir una cadena d'intermediaris. El SDK passarà el
blob PEM complet a `undici` — és la maquetació recomanada perquè l'AEAT
valida la cadena completa al servidor.

## Segell electrònic

L'AEAT enruta els enviaments amb segell electrònic per un pool d'URLs separat
(`prewww10.aeat.es` / `www10.agenciatributaria.gob.es`). Indica al SDK que
l'usi amb `withSeal: true`:

```ts
const client = new VerifactuClient({
  environment: Environment.Production,
  mode: 'verifactu',
  withSeal: true,
  certificate: { pfx: readFileSync('./seal.pfx'), passphrase: '...' },
  /* ... */
});
```

## Actuar en representació d'un altre obligat

Quan envies factures en nom d'un client (el cas més habitual en SaaS),
configura tant `taxpayer` (el client) **com** `representative` (tu):

```ts
const client = new VerifactuClient({
  /* ... */
  taxpayer: { nif: 'B11111111', legalName: 'Customer SL' },
  representative: { nif: 'B99999999', legalName: 'Acme Software SL' },
});
```

El certificat que passis ha d'estar emès a nom del representant — l'AEAT
creua el subject del certificat amb el bloc `<Representante>` del sobre.

## Certificats de preproducció

L'AEAT publica un sandbox a `prewww1.aeat.es`. Emeten certificats de prova
gratuïts a petició (busca *"Certificado pruebas TIKE"* a la *Sede electrónica*).
Fes-los servir durant el desenvolupament:

```ts
const client = new VerifactuClient({
  environment: Environment.Preproduction, // ← pool d'URLs de preprod
  /* ... */
});
```

L'endpoint de preproducció accepta els mateixos payloads que producció però
no afecta al cens real. Manté la suite de proves e2e (`bun run test:e2e`)
apuntant cap a allà.

## Resolució de problemes

| Símptoma                                 | Causa probable                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `NetworkError: unable to verify the first certificate` | Falten intermediaris al bundle de CA — passa la cadena completa al PEM. |
| `SoapFaultError: 401 Unauthorized`       | L'AEAT no confia en la teva CA, o el certificat està revocat.                   |
| `SoapFaultError: NIF del certificado…`   | El subject del certificat no coincideix amb `taxpayer.nif` / `representative.nif`. |
| `Error: PFX file truncated`              | El `.pfx` s'ha descarregat com a text — torna a descarregar-lo en mode binari.  |

Consulta la FAQ de l'AEAT per a la llista completa de diagnòstics:
<https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas.html>.

## Següent

- [Inici ràpid](./quickstart.md) — registra una factura.
- [Control de flux](./flow-control.md) — com el SDK respecta el `TiempoEsperaEnvio`.
