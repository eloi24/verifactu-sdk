# Plugin de Claude Code

Este repositorio publica un marketplace de plugins de [Claude Code](https://claude.com/claude-code)
para que cualquier usuario de Claude Code pueda instalar skills de implementación y auditoría
de cumplimiento de Veri\*Factu sin salir de su editor.

## Instalación

```
/plugin marketplace add eloi24/verifactu-sdk
/plugin install verifactu@verifactu-sdk
```

## Skills

- **`implement`** — guía la integración de `verifactu-sdk` en un proyecto: configuración
  del cliente, alta/anulación de facturas, encadenamiento de huellas, generación del QR y
  las clases de error tipadas del SDK (`SchemaValidationError`, `BusinessValidationError`,
  `SoapFaultError`, `NetworkError`, `FlowControlError`).
- **`audit`** — revisa un sistema de facturación existente frente a los requisitos de
  Veri\*Factu (integridad de la cadena, modo de envío, código QR, gestión de errores,
  control de flujo, validación de NIF, gestión del certificado, flujo de anulación) e
  informa aprobado/fallido por punto con referencias a archivo:línea.

Ambas skills se invocan automáticamente cuando Claude Code detecta una petición relevante
(p. ej. "añade facturación Veri\*Factu a esta app" o "¿este código cumple con
Veri\*Factu?"), o pueden llamarse explícitamente como `/verifactu:implement` /
`/verifactu:audit`.

## Código fuente

Las definiciones del marketplace y del plugin están en
[`.claude-plugin/marketplace.json`](https://github.com/eloi24/verifactu-sdk/blob/main/.claude-plugin/marketplace.json)
y [`plugins/verifactu/`](https://github.com/eloi24/verifactu-sdk/tree/main/plugins/verifactu)
en este repositorio.
