# Plugin de Claude Code

Aquest repositori publica un marketplace de plugins de [Claude Code](https://claude.com/claude-code)
perquè qualsevol usuari de Claude Code pugui instal·lar skills d'implementació i auditoria
de compliment de Veri\*Factu sense sortir del seu editor.

## Instal·lació

```
/plugin marketplace add eloi24/verifactu-sdk
/plugin install verifactu@verifactu-sdk
```

## Skills

- **`implement`** — guia la integració de `verifactu-sdk` en un projecte: configuració del
  client, alta/anul·lació de factures, encadenament d'empremtes, generació del QR i les
  classes d'error tipades del SDK (`SchemaValidationError`, `BusinessValidationError`,
  `SoapFaultError`, `NetworkError`, `FlowControlError`).
- **`audit`** — revisa un sistema de facturació existent respecte als requisits de
  Veri\*Factu (integritat de la cadena, mode d'enviament, codi QR, gestió d'errors,
  control de flux, validació de NIF, gestió del certificat, flux d'anul·lació) i informa
  aprovat/fallit per punt amb referències a fitxer:línia.

Totes dues skills s'invoquen automàticament quan Claude Code detecta una petició rellevant
(p. ex. "afegeix facturació Veri\*Factu a aquesta app" o "aquest codi compleix amb
Veri\*Factu?"), o es poden cridar explícitament com `/verifactu:implement` /
`/verifactu:audit`.

## Codi font

Les definicions del marketplace i del plugin són a
[`.claude-plugin/marketplace.json`](https://github.com/eloi24/verifactu-sdk/blob/main/.claude-plugin/marketplace.json)
i [`plugins/verifactu/`](https://github.com/eloi24/verifactu-sdk/tree/main/plugins/verifactu)
en aquest repositori.
