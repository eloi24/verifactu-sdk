# Codis d'error

L'AEAT publica el seu catàleg d'errors com el fitxer [`errores.properties`](https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties).
El SDK distribueix una còpia generada a `src/errors/catalog.ts` (regenerada amb
`bun run gen-errors` contra el fitxer original). Cada entrada porta:

- El `code` (cadena de 4 dígits, clau primària).
- La `category` — `'envelope'` (4xxx, rebutja l'enviament complet),
  `'record'` (1xxx / 3xxx, rebutja un registre) o `'admissible'` (2xxx,
  accepta el registre amb advertència).
- El `message` literal en castellà tal com el publica l'AEAT.
- Una explicació en anglès (`englishMessage`) afegida pel SDK per
  ergonomia del desenvolupador. El text en castellà és l'autoritzatiu —
  mostra'l a l'usuari final quan l'error arribi a una UI.

## Fer servir el catàleg

```ts
import { ERROR_CATALOG } from 'verifactu-sdk/errors';

const entry = ERROR_CATALOG['1108'];
// → { category: 'record', message: 'El NIF del IDEmisorFactura debe ser el mismo que…', englishMessage: '…' }
```

El catàleg és un objecte `as const` congelat, així que les claus estan
tipades estàticament i el teu IDE pot autocompletar-les.

## Catàleg complet

> El text en castellà es manté literal. Fes servir el missatge proporcionat
> per l'AEAT a qualsevol UI orientada a l'usuari per casar amb la
> documentació que l'AEAT publica per als contribuents.

| Codi | Categoria | Missatge AEAT (castellà literal) | Explicació en anglès |
| ---- | --------- | -------------------------------- | --------------------- |
| 1100 | record | Valor o tipo incorrecto del campo. | Invalid value or type for the field. |
| 1101 | record | El valor del campo CodigoPais es incorrecto. | Invalid CodigoPais value. |
| 1102 | record | El valor del campo IDType es incorrecto. | Invalid IDType value. |
| 1103 | record | El valor del campo ID es incorrecto. | Invalid ID value. |
| 1104 | record | El valor del campo NumSerieFactura es incorrecto. | Invalid NumSerieFactura value. |
| 1105 | record | El valor del campo FechaExpedicionFactura es incorrecto. | Invalid FechaExpedicionFactura value. |
| 1106 | record | El valor del campo TipoFactura no está incluido en la lista de valores permitidos. | TipoFactura value not in the allowed list. |
| 1107 | record | El valor del campo TipoRectificativa es incorrecto. | Invalid TipoRectificativa value. |
| 1108 | record | El NIF del IDEmisorFactura debe ser el mismo que el NIF del ObligadoEmision. | IDEmisorFactura NIF must match the ObligadoEmision NIF. |
| 1109 | record | El NIF no está identificado en el censo de la AEAT. | NIF not identified in the AEAT census. |
| 1110 | record | El NIF no está identificado en el censo de la AEAT. | NIF not identified in the AEAT census. |
| 1111 | record | El campo CodigoPais es obligatorio cuando IDType es distinto de NIF-IVA (02). | CodigoPais is mandatory when IDType is not NIF-IVA (02). |
| 1112 | record | El campo FechaExpedicionFactura es superior a la fecha actual. | FechaExpedicionFactura is later than today. |
| 1114 | record | Si la factura es de tipo rectificativa, el campo TipoRectificativa debe tener valor. | TipoRectificativa is mandatory when invoice is rectifying. |
| 1115 | record | Si la factura no es de tipo rectificativa, el campo TipoRectificativa no debe tener valor. | TipoRectificativa must be empty when invoice is not rectifying. |
| 1116 | record | Debe informarse el campo FacturasSustituidas sólo si la factura es de tipo F3. | FacturasSustituidas is only allowed when TipoFactura is F3. |
| 1117 | record | Si la factura no es de tipo rectificativa, el bloque FacturasRectificadas no podrá venir informado. | FacturasRectificadas is forbidden when invoice is not rectifying. |
| 1118 | record | Si la factura es de tipo rectificativa por sustitución el bloque ImporteRectificacion es obligatorio. | ImporteRectificacion is mandatory when TipoRectificativa is S. |
| 1119 | record | Si la factura no es de tipo rectificativa por sustitución el bloque ImporteRectificacion no debe tener valor. | ImporteRectificacion is forbidden when TipoRectificativa is not S. |
| 1120 | record | Valor de campo IDEmisorFactura del bloque IDFactura con tipo incorrecto. | IDEmisorFactura value has an invalid type. |
| 1121 | record | El campo ID no está identificado en el censo de la AEAT. | ID not identified in the AEAT census. |
| 1122 | record | El campo CodigoPais indicado no coincide con los dos primeros dígitos del identificador. | CodigoPais does not match the first two characters of the identifier. |
| 1123 | record | El formato del NIF es incorrecto. | Invalid NIF format. |
| 1124 | record | El valor del campo TipoImpositivo no está incluido en la lista de valores permitidos. | TipoImpositivo not in the allowed list. |
| 1125 | record | El valor del campo FechaOperacion tiene una fecha superior a la permitida. | FechaOperacion is later than allowed. |
| 1126 | record | El valor del CodigoPais solo puede ser ES cuando el IDType sea Pasaporte (03) o No Censado (07). Si IDType es No Censado (07) el CodigoPais debe ser ES (España). | CodigoPais ES is only allowed when IDType is Passport (03) or No Censado (07); IDType 07 requires CodigoPais ES. |
| 1127 | record | El valor del campo TipoRecargoEquivalencia no está incluido en la lista de valores permitidos. | TipoRecargoEquivalencia not in the allowed list. |
| 1128 | record | No existe acuerdo de facturación. | No facturacion agreement exists. |
| 1129 | record | Error técnico al obtener el acuerdo de facturación. | Technical error retrieving facturacion agreement. |
| 1130 | record | El campo NumSerieFactura contiene caracteres no permitidos. | NumSerieFactura contains forbidden characters. |
| 1131 | record | El valor del campo ID ha de ser el NIF de una persona física cuando el campo IDType tiene valor No Censado (07). | ID must be a personal NIF when IDType is No Censado (07). |
| 1132 | record | El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura inferior o igual al año 2012. | TipoImpositivo value only allowed for dates on or before 2012. |
| 1133 | record | El valor del campo FechaExpedicionFactura no debe ser inferior a la fecha actual menos veinte años. | FechaExpedicionFactura cannot be earlier than today minus 20 years. |
| 1134 | record | El valor del campo FechaOperacion no debe ser inferior a la fecha actual menos veinte años. | FechaOperacion cannot be earlier than today minus 20 years. |
| 1135 | record | El valor del campo TipoRecargoEquivalencia es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura inferior o igual al año 2012. | TipoRecargoEquivalencia value only allowed for dates on or before 2012. |
| 1136 | record | El campo FacturaSimplificadaArticulos7273 solo acepta valores N o S. | FacturaSimplificadaArt7273 only accepts N or S. |
| 1137 | record | El campo Macrodato solo acepta valores N o S. | Macrodato only accepts N or S. |
| 1138 | record | El campo Macrodato solo debe ser informado con valor S si el valor de ImporteTotal es igual o superior a +-100.000.000 | Macrodato must be S only when ImporteTotal is ≥ ±100,000,000. |
| 1139 | record | Si el campo ImporteTotal está informado y es igual o superior a +-100.000.000 el campo Macrodato debe estar informado con valor S. | Macrodato must be informed with S when ImporteTotal is ≥ ±100,000,000. |
| 1140 | record | Los campos CuotaRepercutida y BaseImponibleACoste deben tener el mismo signo. | CuotaRepercutida and BaseImponibleACoste must have the same sign. |
| 1142 | record | El campo CuotaRepercutida tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto y TipoImpositivo suministrados. | CuotaRepercutida is incorrect for the given BaseImponibleOimporteNoSujeto and TipoImpositivo. |
| 1143 | record | Los campos CuotaRepercutida y BaseImponibleOimporteNoSujeto deben tener el mismo signo. | CuotaRepercutida and BaseImponibleOimporteNoSujeto must have the same sign. |
| 1144 | record | El campo CuotaRepercutida tiene un valor incorrecto para el valor de los campos BaseImponibleACoste y TipoImpositivo suministrados. | CuotaRepercutida is incorrect for the given BaseImponibleACoste and TipoImpositivo. |
| 1145 | record | Formato de fecha incorrecto. | Invalid date format. |
| 1146 | record | Sólo se permite que la fecha de expedicion de la factura sea anterior a la fecha operación si los detalles del desglose son ClaveRegimen 14 o 15 e Impuesto 01, 03 o vacío. | FechaExpedicion may only be earlier than FechaOperacion when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty. |
| 1147 | record | Si ClaveRegimen es 14, FechaOperacion es obligatoria y debe ser posterior a la FechaExpedicionFactura. | ClaveRegimen 14 requires FechaOperacion to be after FechaExpedicionFactura. |
| 1148 | record | Si la ClaveRegimen es 14, el campo TipoFactura debe ser F1, R1, R2, R3 o R4. | ClaveRegimen 14 requires TipoFactura F1, R1, R2, R3 or R4. |
| 1149 | record | Si ClaveRegimen es 14, el NIF de Destinatarios debe estar identificado en el censo de la AEAT y comenzar por P, Q, S o V. | ClaveRegimen 14 requires Destinatarios NIFs identified in the AEAT and starting with P, Q, S or V. |
| 1150 | record | Cuando TipoFactura sea F2 y no este informado NumRegistroAcuerdoFacturacion o FacturaSinIdentifDestinatarioArt61d no sea S el sumatorio de BaseImponibleOimporteNoSujeto y CuotaRepercutida de todas las líneas de detalle no podrá ser superior a 3.000. | When TipoFactura is F2 without NumRegistroAcuerdoFacturacion or FacturaSinIdentifDestinatarioArt61d=S, the breakdown total cannot exceed 3000€. |
| 1151 | record | El campo EmitidaPorTerceroODestinatario solo acepta valores T o D. | EmitidaPorTerceroODestinatario only accepts T or D. |
| 1152 | record | La fecha de expedición no puede ser inferior al 28 de octubre de 2024. | FechaExpedicion cannot be earlier than 28 October 2024. |
| 1153 | record | Valor del campo RechazoPrevio no válido, solo podrá incluirse el campo RechazoPrevio con valor X si se ha informado el campo Subsanacion y tiene el valor S. | RechazoPrevio X is only allowed when Subsanacion is S. |
| 1154 | record | El NIF del emisor de la factura rectificada/sustitutiva no se ha podido identificar en el censo de la AEAT. | Rectified/substituted invoice issuer NIF could not be identified at the AEAT. |
| 1155 | record | Se está informando el bloque Tercero sin estar informado el campo EmitidaPorTerceroODestinatario. | Tercero block is informed but EmitidaPorTerceroODestinatario is missing. |
| 1156 | record | Para el bloque IDOtro y IDType NIF-IVA (02), el valor de TipoFactura es incorrecto. | When IDOtro and IDType is NIF-IVA (02), TipoFactura is incorrect. |
| 1157 | record | El valor de cupón solo puede ser S o N si está informado. El valor de cupón sólo puede ser S si el tipo de factura es R1 o R5. | Cupon can only be S or N; S only when TipoFactura is R1 or R5. |
| 1158 | record | Se está informando EmitidaPorTerceroODestinatario, pero no se informa el bloque correspondiente. | EmitidaPorTerceroODestinatario informed but the matching block is missing. |
| 1159 | record | Se está informando del bloque Tercero cuando se indica que se va a informar de Destinatario. | Tercero block informed when Destinatario is also expected. |
| 1160 | record | Si el TipoImpositivo es 5%, sólo se admite TipoRecargoEquivalencia 0,5 o 0,62. | For TipoImpositivo 5%, only TipoRecargoEquivalencia 0.5 or 0.62 is allowed. |
| 1161 | record | El valor del campo RechazoPrevio no es válido, no podrá incluirse el campo RechazoPrevio con valor S si no se ha informado del campo Subsanacion o tiene el valor N. | RechazoPrevio S is forbidden when Subsanacion is missing or N. |
| 1162 | record | Si el TipoImpositivo es 21%, sólo se admite TipoRecargoEquivalencia 5,2 ó 1,75. | For TipoImpositivo 21%, only TipoRecargoEquivalencia 5.2 or 1.75 is allowed. |
| 1163 | record | Si el TipoImpositivo es 10%, sólo se admite TipoRecargoEquivalencia 1,4. | For TipoImpositivo 10%, only TipoRecargoEquivalencia 1.4 is allowed. |
| 1164 | record | Si el TipoImpositivo es 4%, sólo se admite TipoRecargoEquivalencia 0,5. | For TipoImpositivo 4%, only TipoRecargoEquivalencia 0.5 is allowed. |
| 1165 | record | Si el TipoImpositivo es 0% sólo se admite TipoRecargoEquivalencia 0% entre el 1 de enero de 2023 y el 30 de septiembre de 2024. | For TipoImpositivo 0%, only TipoRecargoEquivalencia 0 is allowed between 2023-01-01 and 2024-09-30. |
| 1166 | record | Si el TipoImpositivo es 2% entre el 1 de octubre de 2024 y el 31 de diciembre de 2024, sólo se admite TipoRecargoEquivalencia 0,26. | For TipoImpositivo 2% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 0.26 is allowed. |
| 1167 | record | Si el TipoImpositivo es 5% sólo se admite TipoRecargoEquivalencia 0,5 si Fecha Operacion (Fecha Expedicion Factura si no se informa FechaOperacion) es mayor o igual que el 1 de julio de 2022 y el 31 de diciembre de 2022. | For TipoImpositivo 5%, TipoRecargoEquivalencia 0.5 only between 2022-07-01 and 2022-12-31. |
| 1168 | record | Si el TipoImpositivo es 5% sólo se admite TipoRecargoEquivalencia 0,62 si Fecha Operacion (Fecha Expedicion Factura si no se informa FechaOperacion) es mayor o igual que el 1 de enero de 2023 y el 30 de septiembre de 2024. | For TipoImpositivo 5%, TipoRecargoEquivalencia 0.62 only between 2023-01-01 and 2024-09-30. |
| 1169 | record | Si el TipoImpositivo es 7,5% entre el 1 de octubre de 2024 y el 31 de diciembre de 2024, sólo se admite TipoRecargoEquivalencia 1. | For TipoImpositivo 7.5% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 1 is allowed. |
| 1170 | record | Si el TipoImpositivo es 0%, desde el 1 de octubre del 2024, sólo se admite TipoRecargoEquivalencia 0,26. | For TipoImpositivo 0% from 2024-10-01, only TipoRecargoEquivalencia 0.26 is allowed. |
| 1171 | record | El valor del campo Subsanacion o RechazoPrevio no se encuentra en los valores permitidos. | Invalid value in Subsanacion or RechazoPrevio. |
| 1172 | record | El valor del campo NIF u ObligadoEmision son nulos. | NIF or ObligadoEmision is null. |
| 1173 | record | Sólo se permite que la fecha de operación sea superior a la fecha actual si los detalles del desglose son ClaveRegimen 14 o 15 e Impuesto IVA(01) o IGIC(03) o vacío. | FechaOperacion may only be later than today when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty. |
| 1174 | record | El valor del campo FechaExpedicionFactura del bloque RegistroAnteriores incorrecto. | RegistroAnterior FechaExpedicionFactura is incorrect. |
| 1175 | record | El valor del campo NumSerieFactura del bloque RegistroAnterior es incorrecto. | RegistroAnterior NumSerieFactura is incorrect. |
| 1176 | record | El valor de campo NIF del bloque SistemaInformatico es incorrecto. | SistemaInformatico NIF is incorrect. |
| 1177 | record | El valor de campo IdSistemaInformatico del bloque SistemaInformatico es incorrecto. | SistemaInformatico IdSistemaInformatico is incorrect. |
| 1178 | record | Error en el bloque de Tercero. | Error in the Tercero block. |
| 1179 | record | Error en el bloque de SistemaInformatico. | Error in the SistemaInformatico block. |
| 1180 | record | Error en el bloque de Encadenamiento. | Error in the Encadenamiento block. |
| 1181 | record | El valor del campo CalificacionOperacion es incorrecto. | Invalid CalificacionOperacion value. |
| 1182 | record | El valor del campo OperacionExenta es incorrecto. | Invalid OperacionExenta value. |
| 1183 | record | El campo FacturaSimplificadaArticulos7273 solo se podrá rellenar con S si TipoFactura es de tipo F1 o F3 o R1 o R2 o R3 o R4. | FacturaSimplificadaArt7273 can only be S when TipoFactura is F1, F3, R1, R2, R3 or R4. |
| 1184 | record | El campo FacturaSinIdentifDestinatarioArt61d solo acepta valores S o N. | FacturaSinIdentifDestinatarioArt61d only accepts S or N. |
| 1185 | record | El campo FacturaSinIdentifDestinatarioArt61d solo se podrá rellenar con S si TipoFactura es de tipo F2 o R5. | FacturaSinIdentifDestinatarioArt61d can only be S when TipoFactura is F2 or R5. |
| 1186 | record | Si EmitidaPorTercerosODestinatario es igual a T el bloque Tercero será de cumplimentación obligatoria. | When EmitidaPorTerceroODestinatario is T, Tercero block is mandatory. |
| 1187 | record | Sólo se podrá cumplimentarse el bloque Tercero si el valor de EmitidaPorTercerosODestinatario es T. | Tercero block only allowed when EmitidaPorTerceroODestinatario is T. |
| 1188 | record | El NIF del bloque Tercero debe ser diferente al NIF del ObligadoEmision. | Tercero NIF must differ from ObligadoEmision NIF. |
| 1189 | record | Si TipoFactura es F1 o F3 o R1 o R2 o R3 o R4 el bloque Destinatarios tiene que estar cumplimentado. | Destinatarios block is mandatory when TipoFactura is F1, F3, R1, R2, R3 or R4. |
| 1190 | record | Si TipoFactura es F2 o R5 el bloque Destinatarios no puede estar cumplimentado. | Destinatarios block forbidden when TipoFactura is F2 or R5. |
| 1191 | record | Si TipoFactura es R3 sólo se admitirá NIF o IDType = No Censado (07). | When TipoFactura is R3 only NIF or IDType No Censado (07) is allowed. |
| 1192 | record | Si TipoFactura es R2 sólo se admitirá NIF o IDType = No Censado (07) o NIF-IVA (02). | When TipoFactura is R2 only NIF, IDType No Censado (07) or NIF-IVA (02) is allowed. |
| 1193 | record | En el bloque Destinatarios si se identifica mediante NIF, el NIF debe estar identificado y ser distinto del NIF ObligadoEmision. | Destinatarios NIF must be identified and differ from ObligadoEmision NIF. |
| 1194 | record | El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de julio de 2022 e inferior o igual a 30 de septiembre de 2024. | TipoImpositivo value only allowed between 2022-07-01 and 2024-09-30. |
| 1195 | record | Al menos uno de los dos campos OperacionExenta o CalificacionOperacion deben estar informados. | At least one of OperacionExenta or CalificacionOperacion must be informed. |
| 1196 | record | OperacionExenta o CalificacionOperacion no pueden ser ambos informados ya que son excluyentes entre sí. | OperacionExenta and CalificacionOperacion are mutually exclusive. |
| 1197 | record | Si CalificacionOperacion tiene valor Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) TipoFactura solo puede ser F1, F3, R1, R2, R3 y R4. | When CalificacionOperacion is S2, TipoFactura can only be F1, F3, R1, R2, R3 or R4. |
| 1198 | record | Si CalificacionOperacion tiene valor Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) TipoImpositivo y CuotaRepercutida deberan tener valor 0. | When CalificacionOperacion is S2, TipoImpositivo and CuotaRepercutida must be 0. |
| 1199 | record | Si Impuesto es '01' (IVA), '03' (IGIC) o no se cumplimenta y ClaveRegimen es 01 no pueden marcarse la OperacionExenta E2, E3. | When Impuesto is 01/03/empty and ClaveRegimen is 01, OperacionExenta E2 and E3 are forbidden. |
| 1200 | record | Si ClaveRegimen es 03 CalificacionOperacion sólo puede ser Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1). | When ClaveRegimen is 03, CalificacionOperacion can only be S1. |
| 1201 | record | Si ClaveRegimen es 04 CalificacionOperacion sólo puede ser Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) o bien OperacionExenta. | When ClaveRegimen is 04, CalificacionOperacion must be S2 or OperacionExenta must be set. |
| 1202 | record | Si ClaveRegimen es 06 TipoFactura no puede ser F2, F3, R5 y BaseImponibleACoste debe estar cumplimentado. | When ClaveRegimen is 06, TipoFactura cannot be F2/F3/R5 and BaseImponibleACoste must be set. |
| 1203 | record | Si ClaveRegimen es 07 OperacionExenta no puede ser E2, E3, E4 y E5 o CalificacionOperacion no puede ser S2, N1, N2. | When ClaveRegimen is 07, OperacionExenta cannot be E2/E3/E4/E5 and CalificacionOperacion cannot be S2/N1/N2. |
| 1205 | record | Si ClaveRegimen es 10 CalificacionOperacion tiene que ser N1, TipoFactura F1 y Destinatarios estar identificada mediante NIF. | When ClaveRegimen is 10, CalificacionOperacion must be N1, TipoFactura must be F1 and recipients must be identified by NIF. |
| 1206 | record | Si ClaveRegimen es 11 TipoImpositivo ha de ser 21%. | When ClaveRegimen is 11, TipoImpositivo must be 21%. |
| 1207 | record | La CuotaRepercutida solo podrá ser distinta de 0 si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1). | CuotaRepercutida can only be non-zero when CalificacionOperacion is S1. |
| 1208 | record | Si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1) y BaseImponibleACoste no está cumplimentada, TipoImpositivo y CuotaRepercutida son obligatorios. | When CalificacionOperacion is S1 and BaseImponibleACoste is missing, TipoImpositivo and CuotaRepercutida are mandatory. |
| 1209 | record | Si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1) y ClaveRegimen es 06, TipoImpositivo y CuotaRepercutida son obligatorios. | When CalificacionOperacion is S1 and ClaveRegimen is 06, TipoImpositivo and CuotaRepercutida are mandatory. |
| 1210 | record | El campo ImporteTotal tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto, CuotaRepercutida y CuotaRecargoEquivalencia suministrados. | ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia. |
| 1211 | record | El bloque Tercero no puede estar identificado con IDType=No Censado (07). | Tercero cannot be identified with IDType No Censado (07). |
| 1212 | record | El campo TipoUsoPosibleSoloVerifactu solo acepta valores N o S. | TipoUsoPosibleSoloVerifactu only accepts N or S. |
| 1213 | record | El campo TipoUsoPosibleMultiOT solo acepta valores N o S. | TipoUsoPosibleMultiOT only accepts N or S. |
| 1214 | record | El campo NumeroOTAlta debe ser nÃºmerico positivo de 4 posiciones. | NumeroOTAlta must be a positive 4-digit number. |
| 1215 | record | Error en el bloque de ObligadoEmision. | Error in the ObligadoEmision block. |
| 1216 | record | El campo CuotaTotal tiene un valor incorrecto para el valor de los campos CuotaRepercutida y CuotaRecargoEquivalencia suministrados. | CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia. |
| 1217 | record | Error identificando el IDEmisorFactura. | Error identifying IDEmisorFactura. |
| 1218 | record | El valor del campo Impuesto es incorrecto. | Invalid Impuesto value. |
| 1219 | record | El valor del campo IDEmisorFactura es incorrecto. | Invalid IDEmisorFactura value. |
| 1220 | record | El valor del campo NombreSistemaInformatico es incorrecto. | Invalid NombreSistemaInformatico value. |
| 1221 | record | El valor del campo IDType del sistema informático es incorrecto. | Invalid IDType in SistemaInformatico. |
| 1222 | record | El valor del campo ID del bloque IDOtro es incorrecto. | Invalid ID in IDOtro block. |
| 1223 | record | En el bloque SistemaInformatico si se cumplimenta NIF, no deberá existir la agrupación IDOtro y viceversa, pero es obligatorio que se cumplimente uno de los dos. | SistemaInformatico must have exactly one of NIF or IDOtro. |
| 1224 | record | Si se informa el campo GeneradoPor deberá existir la agrupación Generador y viceversa. | GeneradoPor and Generador must both be present together. |
| 1225 | record | El valor del campo GeneradoPor es incorrecto. | Invalid GeneradoPor value. |
| 1226 | record | El campo IndicadorMultiplesOT solo acepta valores N o S. | IndicadorMultiplesOT only accepts N or S. |
| 1227 | record | Si el campo GeneradoPor es igual a E debe estar relleno el campo NIF del bloque Generador. | When GeneradoPor is E, Generador NIF is mandatory. |
| 1228 | record | En el bloque Generador si se cumplimenta NIF, no deberá existir la agrupación IDOtro y viceversa, pero es obligatorio que se cumplimente uno de los dos. | Generador must have exactly one of NIF or IDOtro. |
| 1229 | record | Si el valor de GeneradoPor es igual a T el valor del campo IDType del bloque Generador no debe ser No Censado (07). | When GeneradoPor is T, Generador IDType cannot be No Censado (07). |
| 1230 | record | Si el valor de GeneradoPor es igual a D y el CodigoPais tiene valor ES (España), el valor del campo IDType del bloque Generador debe ser Pasaporte (03) o No Censado (07). | When GeneradoPor is D and CodigoPais is ES, Generador IDType must be Passport (03) or No Censado (07). |
| 1231 | record | El valor del campo IDType del bloque Generador es incorrecto. | Invalid Generador IDType. |
| 1232 | record | Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer Pasaporte (03). | When IDOtro and CodigoPais is ES, IDType must be Passport (03). |
| 1233 | record | Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer No Censado (07). | When IDOtro and CodigoPais is ES, IDType must be No Censado (07). |
| 1234 | record | Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer Pasaporte (03) o No Censado (07). | When IDOtro and CodigoPais is ES, IDType must be Passport (03) or No Censado (07). |
| 1235 | record | El valor del campo TipoImpositivo es incorrecto, el valor informado sólo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de octubre de 2024 e inferior o igual a 31 de diciembre de 2024. | TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31. |
| 1236 | record | El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de octubre de 2024 e inferior o igual a 31 de diciembre de 2024. | TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31. |
| 1237 | record | El valor del campo CalificacionOperacion está informado como Operación No sujeta (N1 o N2) y el impuesto es IVA. No se puede informar de los campos TipoImpositivo, CuotaRepercutida, TipoRecargoEquivalencia y CuotaRecargoEquivalencia. | When CalificacionOperacion is N1/N2 and tax is IVA, tax-rate-related fields are forbidden. |
| 1238 | record | Si la operacion es exenta no se puede informar ninguno de los campos TipoImpositivo, CuotaRepercutida, TipoRecargoEquivalencia y CuotaRecargoEquivalencia. | When OperacionExenta is set, tax-rate-related fields are forbidden. |
| 1239 | record | Error en el bloque Destinatario. | Error in the Destinatario block. |
| 1240 | record | Error en el bloque de IdEmisorFactura. | Error in the IdEmisorFactura block. |
| 1241 | record | Error técnico al obtener el SistemaInformatico. | Technical error obtaining the SistemaInformatico. |
| 1242 | record | No existe el sistema informático. | SistemaInformatico does not exist. |
| 1243 | record | Error técnico al obtener el cálculo de la fecha del huso horario. | Technical error computing the timezone date. |
| 1244 | record | El campo FechaHoraHusoGenRegistro tiene un formato incorrecto. | Invalid FechaHoraHusoGenRegistro format. |
| 1245 | record | Si el campo Impuesto está vacío o tiene valor IVA(01) o IPSI(02) o IGIC(03) el campo ClaveRegimen debe de estar cumplimentado. | When Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03), ClaveRegimen must be informed. |
| 1246 | record | El valor del campo ClaveRegimen es incorrecto. | Invalid ClaveRegimen value. |
| 1247 | record | El valor del campo TipoHuella es incorrecto. | Invalid TipoHuella value. |
| 1248 | record | El valor del campo Periodo es incorrecto. | Invalid Periodo value. |
| 1249 | record | El valor del campo IndicadorRepresentante tiene un valor incorrecto. | Invalid IndicadorRepresentante value. |
| 1250 | record | El valor de fecha desde debe ser menor que el valor de fecha hasta en RangoFechaExpedicion. | Date-from must be earlier than date-to in RangoFechaExpedicion. |
| 1251 | record | El valor del campo IdVersion tiene un valor incorrecto | Invalid IdVersion value. |
| 1252 | record | Si ClaveRegimen es 08 el campo CalificacionOperacion tiene que tener el valor Operación No sujeta por reglas de localización (N2) e ir siempre informado. | When ClaveRegimen is 08, CalificacionOperacion must be N2 and always informed. |
| 1253 | record | El valor del campo RefExterna tiene un valor incorrecto. | Invalid RefExterna value. |
| 1254 | record | Si FechaOperacion (FechaExpedicionFactura si no se informa FechaOperacion) es anterior a 01/01/2021 no se permite el valor 'XI' para Identificaciones NIF-IVA | XI not allowed for NIF-IVA when FechaOperacion is before 2021-01-01. |
| 1255 | record | Si FechaOperacion (FechaExpedicionFactura si no se informa FechaOperacion) es mayor o igual que 01/02/2021 no se permite el valor 'GB' para Identificaciones NIF-IVA | GB not allowed for NIF-IVA when FechaOperacion is on or after 2021-02-01. |
| 1256 | record | Error técnico al obtener el límite de la fecha de expedición. | Technical error retrieving the issue-date limit. |
| 1257 | record | El campo BaseImponibleACoste solo puede estar cumplimentado si la ClaveRegimen es = '06' o Impuesto = '02' (IPSI) o Impuesto = '05' (Otros). | BaseImponibleACoste only allowed when ClaveRegimen is 06 or Impuesto is 02/05. |
| 1258 | record | El valor de campo NIF del bloque Generador es incorrecto. | Invalid Generador NIF. |
| 1259 | record | En el bloque Generador si se identifica mediante NIF, el NIF debe estar identificado y ser distinto del NIF ObligadoEmision. | Generador NIF must be identified and differ from ObligadoEmision NIF. |
| 1260 | record | El campo ClaveRegimen solo debe de estar cumplimentado si el campo Impuesto está vacío o tiene valor IVA(01) o IPSI(02) o IGIC(03) | ClaveRegimen is only allowed when Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03). |
| 1261 | record | El campo IndicadorRepresentante solo debe de estar cumplimentado si se consulta por ObligadoEmision | IndicadorRepresentante is only allowed when querying by ObligadoEmision. |
| 1262 | record | La longitud de huella no cumple con las especificaciones. | Hash length does not match the specification. |
| 1263 | record | La longitud del tipo de huella no cumple con las especificaciones. | TipoHuella length does not match the specification. |
| 1264 | record | La longitud del campo primer Registro no cumple con las especificaciones. | PrimerRegistro length does not match the specification. |
| 1265 | record | La longitud del campo tipo factura no cumple con las especificaciones. | TipoFactura length does not match the specification. |
| 1266 | record | La longitud del campo cuota total no cumple con las especificaciones. | CuotaTotal length does not match the specification. |
| 1267 | record | La longitud del campo importe total no cumple con las especificaciones. | ImporteTotal length does not match the specification. |
| 1268 | record | La longitud del campo FechaHoraHusoGenRegistro no cumple con las especificaciones. | FechaHoraHusoGenRegistro length does not match the specification. |
| 1269 | record | El bloque Registro Anterior no esta informado correctamente. | RegistroAnterior block is not properly informed. |
| 1270 | record | El valor del campo MostrarNombreRazonEmisor tiene un valor incorrecto. | Invalid MostrarNombreRazonEmisor value. |
| 1271 | record | El valor del campo MostrarSistemaInformatico tiene un valor incorrecto. | Invalid MostrarSistemaInformatico value. |
| 1272 | record | Si se consulta por Destinatario el valor del campo MostrarSistemaInformatico debe valer 'N' o no estar cumplimentado. | When querying by Destinatario, MostrarSistemaInformatico must be N or empty. |
| 1273 | record | Error en el bloque de Generador. | Error in the Generador block. |
| 1274 | record | Valor incorrecto campo primer registro | Invalid PrimerRegistro value. |
| 1275 | record | Valor incorrecto campo RechazoPrevio | Invalid RechazoPrevio value. |
| 1276 | record | Valor incorrecto campo SinRegistroPrevio | Invalid SinRegistroPrevio value. |
| 1277 | record | Valor incorrecto del TipoRecargoEquivalencia para el tipo impositivo 0%. | Invalid TipoRecargoEquivalencia for tax rate 0%. |
| 1278 | record | El valor de la huella del registro anterior debe ser diferente a la huella del registro actual | Previous-record hash must differ from current-record hash. |
| 1281 | record | Solo se puede cumplimentar TipoRecargoEquivalencia y CuotaRecargoEquivalencia cuando CalificacionOperacion tiene valor Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1) | TipoRecargoEquivalencia and CuotaRecargoEquivalencia only allowed when CalificacionOperacion is S1. |
| 1282 | record | Si el NIF de la cabecera es persona fisica se debe informar tambien de su NombreRazon | When header NIF is a natural person, NombreRazon must also be informed. |
| 1283 | record | Si el NIF de la contraparte es persona fisica se debe informar tambien de su NombreRazon | When counterpart NIF is a natural person, NombreRazon must also be informed. |
| 1284 | record | Si se ha informado de TipoRecargoEquivalencia tambien se debe informar de CuotaRecargoEquivalencia y viceversa. | TipoRecargoEquivalencia and CuotaRecargoEquivalencia must both be informed together. |
| 1285 | record | Se han encontracado varios Sistemas Informáticos con los datos suministrados, debe filtrar la consulta por más campos del Sistema Informático. | Multiple SistemaInformaticos match; refine the query with more fields. |
| 1286 | record | Si el impuesto es IVA(01), IGIC(03) o vacio, si ClaveRegimen es 02 solo se podrá informar OperacionExenta. | When Impuesto is IVA(01)/IGIC(03)/empty and ClaveRegimen is 02, only OperacionExenta is allowed. |
| 1287 | record | El valor del campo %s contiene carácteres no validos (<, >, ", ', =). | Field contains forbidden characters (<, >, ", ', =). |
| 1288 | record | Error técnico en la validación de la fecha de expedición/operación. | Technical error validating expedition/operation date. |
| 1289 | record | Si Impuesto es IVA(01) o vacio y si el campo OperacionExenta es igual a 'E5' sólo deberá existir la agrupación IDOtro en el bloque Destinatario. | When Impuesto is IVA(01)/empty and OperacionExenta is E5, only IDOtro is allowed for the recipient. |
| 1290 | record | El campo ID no contiene un NIF con formato correcto. | ID does not contain a NIF in the correct format. |
| 1291 | record | El HASH del Registro anterior no es alfanumérico. | Previous-record hash is not alphanumeric. |
| 1292 | record | El HASH no es alfanumérico. | Hash is not alphanumeric. |
| 1293 | record | Si ClaveRegimen es 20 el campo CalificacionOperacion tiene que tener el valor Operación No sujeta por reglas de localización (N2) e ir siempre informado. | When ClaveRegimen is 20, CalificacionOperacion must be N2 and always informed. |
| 2000 | admissible | El cálculo de la huella suministrada es incorrecta. | Submitted hash does not match the AEAT-computed value. |
| 2001 | admissible | El NIF del bloque Destinatarios no está identificado en el censo de la AEAT. | Destinatarios NIF not identified in the AEAT census. |
| 2002 | admissible | La longitud de huella del registro anterior no cumple con las especificaciones. | Previous-record hash length does not match the specification. |
| 2003 | admissible | El contenido de la huella del registro anterior no cumple con las especificaciones. | Previous-record hash content does not match the specification. |
| 2004 | admissible | El valor del campo FechaHoraHusoGenRegistro debe ser la fecha actual del sistema de la AEAT, admitiéndose un margen de error de: | FechaHoraHusoGenRegistro must be the AEAT system clock, within margin. |
| 2005 | admissible | El campo ImporteTotal tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto, CuotaRepercutida y CuotaRecargoEquivalencia suministrados. | ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia. |
| 2006 | admissible | El campo CuotaTotal tiene un valor incorrecto para el valor de los campos CuotaRepercutida y CuotaRecargoEquivalencia suministrados. | CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia. |
| 2007 | admissible | No debe informarse como primer registro, existen facturas emitidas con el obligado emisión y el sistema informático actual. | PrimerRegistro cannot be marked because invoices already exist for this obligor and SIF. |
| 2008 | admissible | El valor de la huella del registro anterior debe ser diferente a la huella del registro actual. | Previous-record hash must differ from current-record hash. |
| 2009 | admissible | Si el campo Impuesto tiene valor IPSI(02) el campo ClaveRegimen debe de estar cumplimentado. | When Impuesto is IPSI(02), ClaveRegimen must be informed. |
| 3000 | record | Registro de facturación duplicado. | Duplicate facturacion record. |
| 3001 | record | El registro de facturación ya ha sido dado de baja. | Facturacion record already cancelled. |
| 3002 | record | No existe el registro de facturación. | Facturacion record does not exist. |
| 3003 | record | El presentador no tiene los permisos necesarios para actualizar este registro de facturación. | Submitter does not have permissions to update this record. |
| 3004 | record | No es posible modificar la factura ya que ha sido dada de alta vía formulario. | Cannot modify the invoice because it was registered through the AEAT form. |
| 3500 | record | Error técnico de base de datos: error en la integridad de la información. | Database integrity error. |
| 3501 | record | Error técnico de base de datos. | Database technical error. |
| 3502 | record | La factura consultada para el suministro de pagos/cobros/inmuebles no existe. | Queried invoice for payment/collection/property does not exist. |
| 3503 | record | La factura especificada no pertenece al titular registrado en el sistema. | Queried invoice does not belong to the registered holder. |
| 4102 | envelope | El XML no cumple el esquema. Falta informar campo obligatorio. | XML does not match the schema; mandatory field missing. |
| 4103 | envelope | Se ha producido un error inesperado al parsear el XML. | Unexpected error parsing the XML. |
| 4104 | envelope | Error en la cabecera: el valor del campo NIF del bloque ObligadoEmision no está identificado. | Header error: ObligadoEmision NIF is not identified. |
| 4105 | envelope | Error en la cabecera: el valor del campo NIF del bloque Representante no está identificado. | Header error: Representante NIF is not identified. |
| 4106 | envelope | El formato de fecha es incorrecto. | Invalid date format. |
| 4107 | envelope | El NIF no está identificado en el censo de la AEAT. | NIF not identified in the AEAT census. |
| 4108 | envelope | Error técnico al obtener el certificado. | Technical error retrieving the certificate. |
| 4109 | envelope | El formato del NIF es incorrecto. | Invalid NIF format. |
| 4110 | envelope | Error técnico al comprobar los apoderamientos. | Technical error checking representation powers. |
| 4111 | envelope | Error técnico al crear el trámite. | Technical error creating the proceeding. |
| 4112 | envelope | El titular del certificado debe ser Obligado Emisión, Colaborador Social, Apoderado o Sucesor. | Certificate holder must be Obligado Emision, Colaborador Social, Apoderado or Sucesor. |
| 4113 | envelope | El XML no cumple con el esquema: se ha superado el límite permitido de registros para el bloque. | XML schema violation: block record limit exceeded. |
| 4114 | envelope | El XML no cumple con el esquema: se ha superado el límite máximo permitido de facturas a registrar. | XML schema violation: maximum invoice limit exceeded. |
| 4115 | envelope | El valor del campo NIF del bloque ObligadoEmision es incorrecto. | Invalid ObligadoEmision NIF value. |
| 4116 | envelope | Error en la cabecera: el campo NIF del bloque ObligadoEmision tiene un formato incorrecto. | Header error: ObligadoEmision NIF has invalid format. |
| 4117 | envelope | Error en la cabecera: el campo NIF del bloque Representante tiene un formato incorrecto. | Header error: Representante NIF has invalid format. |
| 4118 | envelope | Error técnico: la dirección no se corresponde con el fichero de entrada. | Technical error: address does not match the input file. |
| 4119 | envelope | Error al informar caracteres cuya codificación no es UTF-8. | Characters with non-UTF-8 encoding detected. |
| 4120 | envelope | Error en la cabecera: el valor del campo FechaFinVeriFactu es incorrecto, debe ser 31-12-20XX, donde XX corresponde con el año actual o el anterior. | Header error: invalid FechaFinVeriFactu value; must be 31-12-20XX matching current or previous year. |
| 4121 | envelope | Error en la cabecera: el valor del campo Incidencia es incorrecto. | Header error: invalid Incidencia value. |
| 4122 | envelope | Error en la cabecera: el valor del campo RefRequerimiento es incorrecto. | Header error: invalid RefRequerimiento value. |
| 4123 | envelope | Error en la cabecera: el valor del campo NIF del bloque Representante no está identificado en el censo de la AEAT. | Header error: Representante NIF not identified in the AEAT census. |
| 4124 | envelope | Error en la cabecera: el valor del campo Nombre del bloque Representante no está identificado en el censo de la AEAT. | Header error: Representante name not identified in the AEAT census. |
| 4125 | envelope | Error en la cabecera: Si el envío es por requerimiento el campo RefRequerimiento es obligatorio. | Header error: RefRequerimiento is mandatory for on-request submissions. |
| 4126 | envelope | Error en la cabecera: el campo RefRequerimiento solo debe informarse en sistemas en remisiones al endpoint del servicio a usar para la contestación a requerimientos de registros de facturación. | Header error: RefRequerimiento only allowed on the on-request endpoint. |
| 4127 | envelope | Error en la cabecera: la remisión voluntaria solo debe informarse en sistemas VERIFACTU. | Header error: voluntary submission only allowed on VERIFACTU systems. |
| 4128 | envelope | Error técnico en la recuperación del valor del Gestor de Tablas. | Technical error retrieving the table manager value. |
| 4129 | envelope | Error en la cabecera: el campo FinRequerimiento es obligatorio. | Header error: FinRequerimiento is mandatory. |
| 4130 | envelope | Error en la cabecera: el campo FinRequerimiento solo debe informarse en sistemas No VERIFACTU. | Header error: FinRequerimiento only allowed on non-VERIFACTU systems. |
| 4131 | envelope | Error en la cabecera: el valor del campo FinRequerimiento es incorrecto. | Header error: invalid FinRequerimiento value. |
| 4132 | envelope | El titular del certificado debe ser el destinatario que realiza la consulta, un Apoderado o Sucesor | Certificate holder must be the recipient performing the query, an Apoderado or Sucesor. |
| 4133 | envelope | Error en la cabecera: el valor del campo RefRequerimiento no es alfanumérico. | Header error: RefRequerimiento is not alphanumeric. |
| 4134 | envelope | Servicio no activo. | Service not active. |
| 4135 | envelope | Esta URL no puede ser utilizada mediante GET. | URL cannot be accessed via GET. |
| 4136 | envelope | No se ha enviado el nodo RegistroAlta o el anterior al nodo RegistroAlta no es correcto. | RegistroAlta node missing or out of order. |
| 4137 | envelope | No se ha enviado el nodo RegistroAnulacion o el anterior al nodo RegistroAnulacion no es correcto. | RegistroAnulacion node missing or out of order. |
| 4138 | envelope | Petición vacía en el XML o encoding incorrecto. | Empty XML payload or invalid encoding. |
| 4139 | envelope | Servicio no habilitado en producción. | Service not enabled in production. |
| 4140 | envelope | No puede acceder a la consulta de facturas al no estar apoderado en los trámites necesarios. | Not authorised to query invoices (missing representation). |
| 4141 | envelope | Le informamos que su acceso al sistema VERIFACTU ha sido suspendido temporalmente para realizar cualquier solicitud. Para resolver este inconveniente, le solicitamos que se ponga en contacto con nuestro equipo de soporte a través del buzón de correo electrónico verifactu@correo.aeat.es, donde le atenderán con la mayor brevedad posible. | Access to VERIFACTU has been temporarily suspended. Contact support at verifactu@correo.aeat.es. |

## Veure també

- [`VerifactuError`](./validations.md) i les seves subclasses — tot error llançat porta el codi corresponent.
- [Validacions](./validations.md) — el validador local pre-assigna a cada incidència de regla el codi de catàleg més proper.
