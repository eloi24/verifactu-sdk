# Probas

O SDK trae unha suite de probas por capas que podes executar ti mesmo se
fai forking ou contribúes ao proxecto.

## Probas unitarias

O groso da suite son as unitarias baixo `test/unit/`. Execútanse contra
datos en memoria sen E/S.

```bash
bun test                # por defecto — executa todo agás e2e
bun test test/unit      # só probas unitarias
bun test --coverage     # con cobertura
```

O limiar de cobertura imponse en `bunfig.toml`:

- ≥ 90 % statements a nivel de proxecto.
- ≥ 95 % statements baixo `src/validators/`.

A suite unitaria é a fonte das **golden tests** para as pezas críticas
segundo a spec:

- Algoritmo de pegada — as tres pegadas de referencia do PDF oficial
  v0.1.2.
- URLs do QR — as catro URLs de exemplo do PDF v0.5.0.
- Round-trip de XML — os catro sobres de exemplo do §9 da descrición dos
  servizos web SOAP.

Estas probas **nunca deben editarse para que pase un cambio**. Se se
rompen, arranxa a implementación.

## Probas de integración

Baixo `test/integration/`. Un servidor SOAP mock local (usando a API de
interceptor de `undici`) reproduce respostas enlatadas da AEAT,
exercitando toda a pila do SDK agás a rede real:

```bash
bun test test/integration
```

O mock cobre:

- Aceptación completa (`Correcto`).
- Aceptación parcial (`ParcialmenteCorrecto`) cun rexistro rexeitado.
- Rexeitamento de envelope (`Incorrecto`).
- Respostas `SoapFault`.
- `TiempoEsperaEnvio` variable para exercitar o controlador de fluxo.
- Detección de duplicados vía `IdPeticionRegistroDuplicado`.

## End-to-end (pre-produción da AEAT)

A suite e2e vive baixo `test/e2e-aeat/` e é **opt-in** — require un
certificado de pre-produción válido e consentimento explícito vía
variable de ambiente:

```bash
VERIFACTU_E2E=1 \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_CERT_PASS=changeme \
VERIFACTU_NIF=B12345678 \
bun run test:e2e
```

Sen `VERIFACTU_E2E=1`, a suite omítese (a spec chama a `describe.skipIf`
así que nin sequera aparece como fallo).

O fluxo que exercita:

1. Dálle alta a unha nova factura (`registerInvoice`) — espera
   `Correcto` + un CSV.
2. Espera o `TiempoEsperaEnvio` devolto.
3. Consulta (`queryInvoices`) — confirma que o rexistro aparece con
   estado `Correcto`.
4. Anula (`cancelInvoice`) — espera `Correcto`.
5. Consulta de novo — confirma que o estado do rexistro xa é `Anulado`.

A proba usa valores aleatorios de `seriesNumber` para non colidir
consigo mesma entre execucións.

Os certificados de pre-produción son gratuítos; solicita un vía a *Sede
electrónica* da AEAT (busca *"Certificado pruebas TIKE"*).

## Probas baseadas en propiedades

`test/unit/properties/` usa `fast-check` para facer fuzz dos validadores
que toman entrada numérica (CuotaRepercutida, CuotaTotal, marxes de
ImporteTotal) e as comprobacións de estrutura NIF-IVA. Execútanse como
parte da suite unitaria estándar — non están detrás dunha porta
separada.

## Probas a nivel de tipos

`test/types/` usa `tsd` para fixar os tipos inferidos da API pública.
Execútaas con:

```bash
bun x tsd
```

O CI executa isto xunto con `bun test`. Se cambias a sinatura dunha
función pública debes actualizar o ficheiro `.test-d.ts` correspondente.

## Reproducir respostas da AEAT

Se a AEAT cambia un formato de resposta terás que actualizar os
fixtures de integración. O fluxo recomendado é:

1. Captura a resposta nova do ambiente de pre-produción usando
   `VERIFACTU_DEBUG=1`.
2. Sanitiza o payload (elimina CSVs e campos específicos do
   certificado).
3. Gárdaa baixo `test/fixtures/responses/`.
4. Engánchaa ao mock en `test/integration/mock/`.
5. Volve executar `bun test test/integration` ata que pase.

## Integración continua

A matriz de GitHub Actions executa a suite en Ubuntu, Windows e macOS,
contra Bun `1.1.x` e `latest`. O xob falla ante:

- Calquera fallo de proba unitaria / de integración.
- Cobertura por debaixo do limiar configurado.
- Erros de lint Biome ou de typecheck.

A suite e2e **non** forma parte do CI — o certificado non se pode
compartir de forma segura cos runners hospedados por GitHub.
Execútaa localmente antes de etiquetar unha release.

## Ver tamén

- [Validacións](./validations.md) — as regras verificadas pola suite unitaria.
- [Códigos de erro](./error-codes.md) — o catálogo cotexado contra as respostas da AEAT.
