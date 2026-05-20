# Pruebas

El SDK trae una suite de pruebas por capas que puedes ejecutar tú mismo si
forkeas o contribuyes al proyecto.

## Pruebas unitarias

El grueso de la suite son las unitarias bajo `test/unit/`. Se ejecutan contra
datos en memoria sin E/S.

```bash
bun test                # por defecto — ejecuta todo excepto e2e
bun test test/unit      # sólo pruebas unitarias
bun test --coverage     # con cobertura
```

El umbral de cobertura lo impone `bunfig.toml`:

- ≥ 90 % statements a nivel de proyecto.
- ≥ 95 % statements bajo `src/validators/`.

La suite unitaria es la fuente de las **golden tests** para las piezas
críticas según la spec:

- Algoritmo de huella — las tres huellas de referencia del PDF oficial v0.1.2.
- URLs del QR — las cuatro URLs de ejemplo del PDF v0.5.0.
- Round-trip de XML — los cuatro sobres de ejemplo del §9 de la descripción
  de los Servicios Web SOAP.

Estas pruebas **nunca deben editarse para que pase un cambio**. Si se rompen,
arregla la implementación.

## Pruebas de integración

Bajo `test/integration/`. Un servidor SOAP mock local (usando la API de
interceptor de `undici`) reproduce respuestas enlatadas de la AEAT, ejercitando
toda la pila del SDK salvo la red real:

```bash
bun test test/integration
```

El mock cubre:

- Aceptación completa (`Correcto`).
- Aceptación parcial (`ParcialmenteCorrecto`) con un registro rechazado.
- Rechazo de envelope (`Incorrecto`).
- Respuestas `SoapFault`.
- `TiempoEsperaEnvio` variable para ejercitar el controlador de flujo.
- Detección de duplicados vía `IdPeticionRegistroDuplicado`.

## End-to-end (pre-producción de la AEAT)

La suite e2e vive bajo `test/e2e-aeat/` y es **opt-in** — requiere un
certificado de pre-producción válido y consentimiento explícito vía variable
de entorno:

```bash
VERIFACTU_E2E=1 \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_CERT_PASS=changeme \
VERIFACTU_NIF=B12345678 \
bun run test:e2e
```

Sin `VERIFACTU_E2E=1`, la suite se omite (la spec llama a `describe.skipIf`
así que ni siquiera aparece como fallo).

El flujo que ejercita:

1. Da de alta una nueva factura (`registerInvoice`) — espera `Correcto` +
   un CSV.
2. Espera el `TiempoEsperaEnvio` devuelto.
3. Consulta (`queryInvoices`) — confirma que el registro aparece con estado
   `Correcto`.
4. Anula (`cancelInvoice`) — espera `Correcto`.
5. Consulta de nuevo — confirma que el estado del registro es ya `Anulado`.

La prueba usa valores aleatorios de `seriesNumber` para no colisionar consigo
misma entre ejecuciones.

Los certificados de pre-producción son gratuitos; solicita uno vía la *Sede
electrónica* de la AEAT (busca *"Certificado pruebas TIKE"*).

## Pruebas basadas en propiedades

`test/unit/properties/` usa `fast-check` para fuzz de los validadores que
toman entradas numéricas (CuotaRepercutida, CuotaTotal, márgenes de
ImporteTotal) y las comprobaciones de estructura NIF-IVA. Se ejecutan como
parte de la suite unitaria estándar — no están detrás de una puerta separada.

## Pruebas a nivel de tipos

`test/types/` usa `tsd` para fijar los tipos inferidos de la API pública.
Ejecútalas con:

```bash
bun x tsd
```

El CI ejecuta esto junto con `bun test`. Si cambias la firma de una función
pública debes actualizar el fichero `.test-d.ts` correspondiente.

## Reproducir respuestas de la AEAT

Si la AEAT cambia un formato de respuesta tendrás que actualizar los
fixtures de integración. El flujo recomendado es:

1. Captura la respuesta nueva del entorno de pre-producción usando
   `VERIFACTU_DEBUG=1`.
2. Sanitiza el payload (elimina CSVs y campos específicos del certificado).
3. Guárdala bajo `test/fixtures/responses/`.
4. Engánchala al mock en `test/integration/mock/`.
5. Vuelve a ejecutar `bun test test/integration` hasta que pase.

## Integración continua

La matriz de GitHub Actions ejecuta la suite en Ubuntu, Windows y macOS,
contra Bun `1.1.x` y `latest`. El job falla ante:

- Cualquier fallo de prueba unitaria / integración.
- Cobertura por debajo del umbral configurado.
- Errores de lint Biome o de typecheck.

La suite e2e **no** forma parte del CI — el certificado no se puede compartir
de forma segura con los runners alojados por GitHub. Ejecútala localmente
antes de etiquetar una release.

## Ver también

- [Validaciones](./validations.md) — las reglas verificadas por la suite unitaria.
- [Códigos de error](./error-codes.md) — el catálogo cotejado contra las respuestas de la AEAT.
