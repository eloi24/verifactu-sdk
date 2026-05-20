# Proves

El SDK porta una suite de proves per capes que pots executar tu mateix si
forkeges o contribueixes al projecte.

## Proves unitàries

El gruix de la suite són les unitàries sota `test/unit/`. S'executen contra
dades en memòria sense E/S.

```bash
bun test                # per defecte — executa-ho tot excepte e2e
bun test test/unit      # només proves unitàries
bun test --coverage     # amb cobertura
```

El llindar de cobertura l'imposa `bunfig.toml`:

- ≥ 90 % statements a nivell de projecte.
- ≥ 95 % statements sota `src/validators/`.

La suite unitària és la font de les **golden tests** per a les peces
crítiques segons l'especificació:

- Algorisme d'empremta — les tres empremtes de referència del PDF oficial
  v0.1.2.
- URLs del QR — les quatre URLs d'exemple del PDF v0.5.0.
- Round-trip d'XML — els quatre sobres d'exemple del §9 de la descripció
  dels serveis web SOAP.

Aquestes proves **mai no s'han d'editar perquè un canvi passi**. Si es
trenquen, arregla la implementació.

## Proves d'integració

Sota `test/integration/`. Un servidor SOAP mock local (fent servir l'API
d'interceptor d'`undici`) reprodueix respostes enllatades de l'AEAT,
exercitant tota la pila del SDK menys la xarxa real:

```bash
bun test test/integration
```

El mock cobreix:

- Acceptació completa (`Correcto`).
- Acceptació parcial (`ParcialmenteCorrecto`) amb un registre rebutjat.
- Rebuig d'envelope (`Incorrecto`).
- Respostes `SoapFault`.
- `TiempoEsperaEnvio` variable per exercitar el controlador de flux.
- Detecció de duplicats via `IdPeticionRegistroDuplicado`.

## End-to-end (preproducció de l'AEAT)

La suite e2e viu sota `test/e2e-aeat/` i és **opt-in** — requereix un
certificat de preproducció vàlid i consentiment explícit via variable
d'entorn:

```bash
VERIFACTU_E2E=1 \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_CERT_PASS=changeme \
VERIFACTU_NIF=B12345678 \
bun run test:e2e
```

Sense `VERIFACTU_E2E=1`, la suite s'omet (l'especificació crida a
`describe.skipIf` així que ni tan sols apareix com a fallada).

El flux que exercita:

1. Dóna d'alta una nova factura (`registerInvoice`) — espera `Correcto` +
   un CSV.
2. Espera el `TiempoEsperaEnvio` retornat.
3. Consulta (`queryInvoices`) — confirma que el registre apareix amb estat
   `Correcto`.
4. Anul·la (`cancelInvoice`) — espera `Correcto`.
5. Consulta de nou — confirma que l'estat del registre és ja `Anulado`.

La prova fa servir valors aleatoris de `seriesNumber` per no col·lisionar
amb si mateixa entre execucions.

Els certificats de preproducció són gratuïts; sol·licita'n un via la *Sede
electrónica* de l'AEAT (busca *"Certificado pruebas TIKE"*).

## Proves basades en propietats

`test/unit/properties/` fa servir `fast-check` per fer fuzz dels validadors
que prenen entrada numèrica (CuotaRepercutida, CuotaTotal, marges
d'ImporteTotal) i les comprovacions d'estructura NIF-IVA. S'executen com a
part de la suite unitària estàndard — no estan darrere d'una porta separada.

## Proves a nivell de tipus

`test/types/` fa servir `tsd` per fixar els tipus inferits de l'API pública.
Executa-les amb:

```bash
bun x tsd
```

El CI ho executa al costat de `bun test`. Si canvies la signatura d'una
funció pública has d'actualitzar el fitxer `.test-d.ts` corresponent.

## Reproduir respostes de l'AEAT

Si l'AEAT canvia un format de resposta hauràs d'actualitzar els fixtures
d'integració. El flux recomanat és:

1. Captura la resposta nova de l'entorn de preproducció fent servir
   `VERIFACTU_DEBUG=1`.
2. Sanitiza el payload (treu CSVs i camps específics del certificat).
3. Desa-la sota `test/fixtures/responses/`.
4. Engànxa-la al mock a `test/integration/mock/`.
5. Torna a executar `bun test test/integration` fins que passi.

## Integració contínua

La matriu de GitHub Actions executa la suite a Ubuntu, Windows i macOS,
contra Bun `1.1.x` i `latest`. El job falla davant:

- Qualsevol fallada de prova unitària / d'integració.
- Cobertura per sota del llindar configurat.
- Errors de lint Biome o de typecheck.

La suite e2e **no** forma part del CI — el certificat no es pot compartir
de manera segura amb els runners allotjats per GitHub. Executa-la
localment abans d'etiquetar una release.

## Veure també

- [Validacions](./validations.md) — les regles verificades per la suite unitària.
- [Codis d'error](./error-codes.md) — el catàleg confrontat amb les respostes de l'AEAT.
