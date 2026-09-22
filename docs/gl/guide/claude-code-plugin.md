# Plugin de Claude Code

Este repositorio publica un marketplace de plugins de [Claude Code](https://claude.com/claude-code)
para que calquera usuario de Claude Code poida instalar skills de implementación e
auditoría de cumprimento de Veri\*Factu sen saír do seu editor.

## Instalación

```
/plugin marketplace add eloi24/verifactu-sdk
/plugin install verifactu@verifactu-sdk
```

## Skills

- **`implement`** — guía a integración de `verifactu-sdk` nun proxecto: configuración do
  cliente, alta/anulación de facturas, encadeamento de pegadas, xeración do QR e as clases
  de erro tipadas do SDK (`SchemaValidationError`, `BusinessValidationError`,
  `SoapFaultError`, `NetworkError`, `FlowControlError`).
- **`audit`** — revisa un sistema de facturación existente fronte aos requisitos de
  Veri\*Factu (integridade da cadea, modo de envío, código QR, xestión de erros, control
  de fluxo, validación de NIF, xestión do certificado, fluxo de anulación) e informa
  aprobado/fallido por punto con referencias a ficheiro:liña.

As dúas skills invócanse automaticamente cando Claude Code detecta unha petición relevante
(p. ex. "engade facturación Veri\*Factu a esta app" ou "este código cumpre con
Veri\*Factu?"), ou pódense chamar explicitamente como `/verifactu:implement` /
`/verifactu:audit`.

## Código fonte

As definicións do marketplace e do plugin están en
[`.claude-plugin/marketplace.json`](https://github.com/eloi24/verifactu-sdk/blob/main/.claude-plugin/marketplace.json)
e [`plugins/verifactu/`](https://github.com/eloi24/verifactu-sdk/tree/main/plugins/verifactu)
neste repositorio.
