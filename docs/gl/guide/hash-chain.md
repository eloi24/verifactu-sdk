# Cadea de pegadas

Todo rexistro enviado á AEAT leva unha **pegada** (*huella*) — un digest
SHA-256 hexadecimal en maiúsculas de 64 caracteres que o encadea co
rexistro anterior do mesmo obrigado. A cadea é o que fai o rexistro a
proba de manipulacións: cambiar calquera rexistro pasado invalida todas
as pegadas posteriores.

O algoritmo completo está especificado en [*Especificaciones técnicas
para generación de la huella o hash de los registros de facturación*
v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
O SDK implémentao literalmente; as tres pegadas de referencia do §6 dese
PDF están cubertas por tests unitarios e coinciden byte a byte.

## Campos que se hashean

A pegada calcúlase sobre unha concatenación `nome1=valor1&nome2=valor2&…`
cunha lista de campos fixa e ordenada por tipo de rexistro:

### `RegistroAlta` (oito campos)

| Orde  | Nome do campo               | Orixe                                 |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-AAAA)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (rexistro anterior)| `chainLink.previousHash` ou baleiro   |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 con offset)   |

### `RegistroAnulacion` (cinco campos)

| Orde  | Nome do campo                   | Orixe                                 |
| ----- | ------------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`        | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`        | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`        |
| 4     | `Huella` (rexistro anterior)    | `chainLink.previousHash` ou baleiro   |
| 5     | `FechaHoraHusoGenRegistro`      | `generatedAt`                         |

## Normalización

Antes de concatenar, cada valor normalízase:

- **Recorte** de espazos no principio e no final.
- **Valores numéricos** (`CuotaTotal`, `ImporteTotal`): os ceros á dereita do
  separador decimal son irrelevantes — `21.00` e `21` producen a mesma
  pegada.
- **As datas** emítense en formato cable `DD-MM-AAAA`.
- Os bytes usados para hashear son **UTF-8** da cadea resultante.

## Primeiro rexistro

Para o primeiro rexistro enviado por un obrigado, o campo `Huella` do
rexistro anterior está baleiro — a concatenación contén `…&Huella=&…`.
Define `chainLink.first = true` e omite os catro campos `previous*`:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Rexistros seguintes

Para todo rexistro seguinte proporciona o enlace anterior completo:

```ts
const next: Invoice = {
  /* ... */
  chainLink: {
    first: false,
    previousIssuerNif: 'B12345678',
    previousSeriesNumber: 'A/2026/0001',
    previousIssueDate: '2026-05-20',
    previousHash: '3C13742B…A8F1',
  },
};
```

Na práctica o SDK reenche isto por ti cando pasas por `VerifactuClient`
— lembra a última pegada da cadea por instancia. Só tratas o enlace
manualmente se almacenas os rexistros offline e retomas a cadea máis
tarde.

## Calcular unha pegada manualmente

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* primeiro rexistro */);
// → "3C13742B...A8F1"  (64 caracteres hex en maiúsculas)
```

A función é pura — sen E/S, sen efectos secundarios — e expónse vía
`verifactu-sdk/hash`. Lanza `SchemaValidationError` se pasas un
`previousHash` mal formado.

## Verificar

Dado un rexistro e o seu predecesor podes recalcular a pegada e
comparar:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('Cadea rota!');
}
```

A AEAT faino no servidor en cada envío. Un desaxuste levanta o erro
**2000** (admisible — o rexistro acéptase pero márcase para
*subsanación*).

## Reset / replay

Se perdes o estado local da cadea (limpeza de base de datos, rotación
de certificado) debes volver consultar á AEAT o último rexistro
aceptado, coller o seu campo `Huella` e retomar desde alí:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → retoma a cadea usando last.invoiceId + a pegada almacenada na túa BD
```

## Rendemento

A pegada é un único SHA-256 sobre unha cadea curta (tipicamente menos
de 1 KB), así que un rexistro hashéase en microsegundos. O pescozo de
botella da cadea é a chamada secuencial á AEAT: o SDK serializa as
chamadas a `registerInvoice` por instancia, así a cadea nunca se rompe
por concorrencia.

## Seguinte

- [Código QR](./qr-code.md) — tamén depende do identificador de factura.
- [Validacións](./validations.md) — a regra 23 comproba o formato da pegada localmente.
- [Control de fluxo](./flow-control.md) — por que os envíos se serializan.
