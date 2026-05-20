/**
 * Generated AEAT error catalog.
 *
 * Do not edit by hand — run `bun run scripts/gen-error-catalog.ts` to
 * regenerate from the canonical `errores.properties` file.
 *
 * @module
 */

import type { ErrorCategory } from './VerifactuError.js';

/**
 * Shape of one entry in {@link ERROR_CATALOG}.
 */
export interface ErrorCatalogEntry {
  /** AEAT-wide category — which level the error rejects or accepts. */
  readonly category: ErrorCategory;
  /** Verbatim Spanish message as published by the AEAT. */
  readonly message: string;
  /** English translation (hand-curated when known, mechanical otherwise). */
  readonly englishMessage: string;
}

/**
 * Frozen catalog of every error code published by the AEAT.
 *
 * @see {@link https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties}
 */
export const ERROR_CATALOG = {
  '1100': {
    category: 'record',
    message: 'Valor o tipo incorrecto del campo.',
    englishMessage: 'Invalid value or type for the field.',
  },
  '1101': {
    category: 'record',
    message: 'El valor del campo CodigoPais es incorrecto.',
    englishMessage: 'Invalid CodigoPais value.',
  },
  '1102': {
    category: 'record',
    message: 'El valor del campo IDType es incorrecto.',
    englishMessage: 'Invalid IDType value.',
  },
  '1103': {
    category: 'record',
    message: 'El valor del campo ID es incorrecto.',
    englishMessage: 'Invalid ID value.',
  },
  '1104': {
    category: 'record',
    message: 'El valor del campo NumSerieFactura es incorrecto.',
    englishMessage: 'Invalid NumSerieFactura value.',
  },
  '1105': {
    category: 'record',
    message: 'El valor del campo FechaExpedicionFactura es incorrecto.',
    englishMessage: 'Invalid FechaExpedicionFactura value.',
  },
  '1106': {
    category: 'record',
    message: 'El valor del campo TipoFactura no está incluido en la lista de valores permitidos.',
    englishMessage: 'TipoFactura value not in the allowed list.',
  },
  '1107': {
    category: 'record',
    message: 'El valor del campo TipoRectificativa es incorrecto.',
    englishMessage: 'Invalid TipoRectificativa value.',
  },
  '1108': {
    category: 'record',
    message: 'El NIF del IDEmisorFactura debe ser el mismo que el NIF del ObligadoEmision.',
    englishMessage: 'IDEmisorFactura NIF must match the ObligadoEmision NIF.',
  },
  '1109': {
    category: 'record',
    message: 'El NIF no está identificado en el censo de la AEAT.',
    englishMessage: 'NIF not identified in the AEAT census.',
  },
  '1110': {
    category: 'record',
    message: 'El NIF no está identificado en el censo de la AEAT.',
    englishMessage: 'NIF not identified in the AEAT census.',
  },
  '1111': {
    category: 'record',
    message: 'El campo CodigoPais es obligatorio cuando IDType es distinto de NIF-IVA (02).',
    englishMessage: 'CodigoPais is mandatory when IDType is not NIF-IVA (02).',
  },
  '1112': {
    category: 'record',
    message: 'El campo FechaExpedicionFactura es superior a la fecha actual.',
    englishMessage: 'FechaExpedicionFactura is later than today.',
  },
  '1114': {
    category: 'record',
    message: 'Si la factura es de tipo rectificativa, el campo TipoRectificativa debe tener valor.',
    englishMessage: 'TipoRectificativa is mandatory when invoice is rectifying.',
  },
  '1115': {
    category: 'record',
    message:
      'Si la factura no es de tipo rectificativa, el campo TipoRectificativa no debe tener valor.',
    englishMessage: 'TipoRectificativa must be empty when invoice is not rectifying.',
  },
  '1116': {
    category: 'record',
    message: 'Debe informarse el campo FacturasSustituidas sólo si la factura es de tipo F3.',
    englishMessage: 'FacturasSustituidas is only allowed when TipoFactura is F3.',
  },
  '1117': {
    category: 'record',
    message:
      'Si la factura no es de tipo rectificativa, el bloque FacturasRectificadas no podrá venir informado.',
    englishMessage: 'FacturasRectificadas is forbidden when invoice is not rectifying.',
  },
  '1118': {
    category: 'record',
    message:
      'Si la factura es de tipo rectificativa por sustitución el bloque ImporteRectificacion es obligatorio.',
    englishMessage: 'ImporteRectificacion is mandatory when TipoRectificativa is S.',
  },
  '1119': {
    category: 'record',
    message:
      'Si la factura no es de tipo rectificativa por sustitución el bloque ImporteRectificacion no debe tener valor.',
    englishMessage: 'ImporteRectificacion is forbidden when TipoRectificativa is not S.',
  },
  '1120': {
    category: 'record',
    message: 'Valor de campo IDEmisorFactura del bloque IDFactura con tipo incorrecto.',
    englishMessage: 'IDEmisorFactura value has an invalid type.',
  },
  '1121': {
    category: 'record',
    message: 'El campo ID no está identificado en el censo de la AEAT.',
    englishMessage: 'ID not identified in the AEAT census.',
  },
  '1122': {
    category: 'record',
    message:
      'El campo CodigoPais indicado no coincide con los dos primeros dígitos del identificador.',
    englishMessage: 'CodigoPais does not match the first two characters of the identifier.',
  },
  '1123': {
    category: 'record',
    message: 'El formato del NIF es incorrecto.',
    englishMessage: 'Invalid NIF format.',
  },
  '1124': {
    category: 'record',
    message:
      'El valor del campo TipoImpositivo no está incluido en la lista de valores permitidos.',
    englishMessage: 'TipoImpositivo not in the allowed list.',
  },
  '1125': {
    category: 'record',
    message: 'El valor del campo FechaOperacion tiene una fecha superior a la permitida.',
    englishMessage: 'FechaOperacion is later than allowed.',
  },
  '1126': {
    category: 'record',
    message:
      'El valor del CodigoPais solo puede ser ES cuando el IDType sea Pasaporte (03) o No Censado (07). Si IDType es No Censado (07) el CodigoPais debe ser ES (España).',
    englishMessage:
      'CodigoPais ES is only allowed when IDType is Passport (03) or No Censado (07); IDType 07 requires CodigoPais ES.',
  },
  '1127': {
    category: 'record',
    message:
      'El valor del campo TipoRecargoEquivalencia no está incluido en la lista de valores permitidos.',
    englishMessage: 'TipoRecargoEquivalencia not in the allowed list.',
  },
  '1128': {
    category: 'record',
    message: 'No existe acuerdo de facturación.',
    englishMessage: 'No facturacion agreement exists.',
  },
  '1129': {
    category: 'record',
    message: 'Error técnico al obtener el acuerdo de facturación.',
    englishMessage: 'Technical error retrieving facturacion agreement.',
  },
  '1130': {
    category: 'record',
    message: 'El campo NumSerieFactura contiene caracteres no permitidos.',
    englishMessage: 'NumSerieFactura contains forbidden characters.',
  },
  '1131': {
    category: 'record',
    message:
      'El valor del campo ID ha de ser el NIF de una persona física cuando el campo IDType tiene valor No Censado (07).',
    englishMessage: 'ID must be a personal NIF when IDType is No Censado (07).',
  },
  '1132': {
    category: 'record',
    message:
      'El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura inferior o igual al año 2012.',
    englishMessage: 'TipoImpositivo value only allowed for dates on or before 2012.',
  },
  '1133': {
    category: 'record',
    message:
      'El valor del campo FechaExpedicionFactura no debe ser inferior a la fecha actual menos veinte años.',
    englishMessage: 'FechaExpedicionFactura cannot be earlier than today minus 20 years.',
  },
  '1134': {
    category: 'record',
    message:
      'El valor del campo FechaOperacion no debe ser inferior a la fecha actual menos veinte años.',
    englishMessage: 'FechaOperacion cannot be earlier than today minus 20 years.',
  },
  '1135': {
    category: 'record',
    message:
      'El valor del campo TipoRecargoEquivalencia es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura inferior o igual al año 2012.',
    englishMessage: 'TipoRecargoEquivalencia value only allowed for dates on or before 2012.',
  },
  '1136': {
    category: 'record',
    message: 'El campo FacturaSimplificadaArticulos7273 solo acepta valores N o S.',
    englishMessage: 'FacturaSimplificadaArt7273 only accepts N or S.',
  },
  '1137': {
    category: 'record',
    message: 'El campo Macrodato solo acepta valores N o S.',
    englishMessage: 'Macrodato only accepts N or S.',
  },
  '1138': {
    category: 'record',
    message:
      'El campo Macrodato solo debe ser informado con valor S si el valor de ImporteTotal es igual o superior a +-100.000.000',
    englishMessage: 'Macrodato must be S only when ImporteTotal is ≥ ±100,000,000.',
  },
  '1139': {
    category: 'record',
    message:
      'Si el campo ImporteTotal está informado y es igual o superior a +-100.000.000 el campo Macrodato debe estar informado con valor S.',
    englishMessage: 'Macrodato must be informed with S when ImporteTotal is ≥ ±100,000,000.',
  },
  '1140': {
    category: 'record',
    message: 'Los campos CuotaRepercutida y BaseImponibleACoste deben tener el mismo signo.',
    englishMessage: 'CuotaRepercutida and BaseImponibleACoste must have the same sign.',
  },
  '1142': {
    category: 'record',
    message:
      'El campo CuotaRepercutida tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto y TipoImpositivo suministrados.',
    englishMessage:
      'CuotaRepercutida is incorrect for the given BaseImponibleOimporteNoSujeto and TipoImpositivo.',
  },
  '1143': {
    category: 'record',
    message:
      'Los campos CuotaRepercutida y BaseImponibleOimporteNoSujeto deben tener el mismo signo.',
    englishMessage: 'CuotaRepercutida and BaseImponibleOimporteNoSujeto must have the same sign.',
  },
  '1144': {
    category: 'record',
    message:
      'El campo CuotaRepercutida tiene un valor incorrecto para el valor de los campos BaseImponibleACoste y TipoImpositivo suministrados.',
    englishMessage:
      'CuotaRepercutida is incorrect for the given BaseImponibleACoste and TipoImpositivo.',
  },
  '1145': {
    category: 'record',
    message: 'Formato de fecha incorrecto.',
    englishMessage: 'Invalid date format.',
  },
  '1146': {
    category: 'record',
    message:
      'Sólo se permite que la fecha de expedicion de la factura sea anterior a la fecha operación si los detalles del desglose son ClaveRegimen 14 o 15 e Impuesto 01, 03 o vacío.',
    englishMessage:
      'FechaExpedicion may only be earlier than FechaOperacion when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty.',
  },
  '1147': {
    category: 'record',
    message:
      'Si ClaveRegimen es 14, FechaOperacion es obligatoria y debe ser posterior a la FechaExpedicionFactura.',
    englishMessage: 'ClaveRegimen 14 requires FechaOperacion to be after FechaExpedicionFactura.',
  },
  '1148': {
    category: 'record',
    message: 'Si la ClaveRegimen es 14, el campo TipoFactura debe ser F1, R1, R2, R3 o R4.',
    englishMessage: 'ClaveRegimen 14 requires TipoFactura F1, R1, R2, R3 or R4.',
  },
  '1149': {
    category: 'record',
    message:
      'Si ClaveRegimen es 14, el NIF de Destinatarios debe estar identificado en el censo de la AEAT y comenzar por P, Q, S o V.',
    englishMessage:
      'ClaveRegimen 14 requires Destinatarios NIFs identified in the AEAT and starting with P, Q, S or V.',
  },
  '1150': {
    category: 'record',
    message:
      'Cuando TipoFactura sea F2 y no este informado NumRegistroAcuerdoFacturacion o FacturaSinIdentifDestinatarioArt61d no sea S el sumatorio de BaseImponibleOimporteNoSujeto y CuotaRepercutida de todas las líneas de detalle no podrá ser superior a 3.000.',
    englishMessage:
      'When TipoFactura is F2 without NumRegistroAcuerdoFacturacion or FacturaSinIdentifDestinatarioArt61d=S, the breakdown total cannot exceed 3000€.',
  },
  '1151': {
    category: 'record',
    message: 'El campo EmitidaPorTerceroODestinatario solo acepta valores T o D.',
    englishMessage: 'EmitidaPorTerceroODestinatario only accepts T or D.',
  },
  '1152': {
    category: 'record',
    message: 'La fecha de expedición no puede ser inferior al 28 de octubre de 2024.',
    englishMessage: 'FechaExpedicion cannot be earlier than 28 October 2024.',
  },
  '1153': {
    category: 'record',
    message:
      'Valor del campo RechazoPrevio no válido, solo podrá incluirse el campo RechazoPrevio con valor X si se ha informado el campo Subsanacion y tiene el valor S.',
    englishMessage: 'RechazoPrevio X is only allowed when Subsanacion is S.',
  },
  '1154': {
    category: 'record',
    message:
      'El NIF del emisor de la factura rectificada/sustitutiva no se ha podido identificar en el censo de la AEAT.',
    englishMessage: 'Rectified/substituted invoice issuer NIF could not be identified at the AEAT.',
  },
  '1155': {
    category: 'record',
    message:
      'Se está informando el bloque Tercero sin estar informado el campo EmitidaPorTerceroODestinatario.',
    englishMessage: 'Tercero block is informed but EmitidaPorTerceroODestinatario is missing.',
  },
  '1156': {
    category: 'record',
    message: 'Para el bloque IDOtro y IDType NIF-IVA (02), el valor de TipoFactura es incorrecto.',
    englishMessage: 'When IDOtro and IDType is NIF-IVA (02), TipoFactura is incorrect.',
  },
  '1157': {
    category: 'record',
    message:
      'El valor de cupón solo puede ser S o N si está informado. El valor de cupón sólo puede ser S si el tipo de factura es R1 o R5.',
    englishMessage: 'Cupon can only be S or N; S only when TipoFactura is R1 or R5.',
  },
  '1158': {
    category: 'record',
    message:
      'Se está informando EmitidaPorTerceroODestinatario, pero no se informa el bloque correspondiente.',
    englishMessage: 'EmitidaPorTerceroODestinatario informed but the matching block is missing.',
  },
  '1159': {
    category: 'record',
    message:
      'Se está informando del bloque Tercero cuando se indica que se va a informar de Destinatario.',
    englishMessage: 'Tercero block informed when Destinatario is also expected.',
  },
  '1160': {
    category: 'record',
    message: 'Si el TipoImpositivo es 5%, sólo se admite TipoRecargoEquivalencia 0,5 o 0,62.',
    englishMessage: 'For TipoImpositivo 5%, only TipoRecargoEquivalencia 0.5 or 0.62 is allowed.',
  },
  '1161': {
    category: 'record',
    message:
      'El valor del campo RechazoPrevio no es válido, no podrá incluirse el campo RechazoPrevio con valor S si no se ha informado del campo Subsanacion o tiene el valor N.',
    englishMessage: 'RechazoPrevio S is forbidden when Subsanacion is missing or N.',
  },
  '1162': {
    category: 'record',
    message: 'Si el TipoImpositivo es 21%, sólo se admite TipoRecargoEquivalencia 5,2 ó 1,75.',
    englishMessage: 'For TipoImpositivo 21%, only TipoRecargoEquivalencia 5.2 or 1.75 is allowed.',
  },
  '1163': {
    category: 'record',
    message: 'Si el TipoImpositivo es 10%, sólo se admite TipoRecargoEquivalencia 1,4.',
    englishMessage: 'For TipoImpositivo 10%, only TipoRecargoEquivalencia 1.4 is allowed.',
  },
  '1164': {
    category: 'record',
    message: 'Si el TipoImpositivo es 4%, sólo se admite TipoRecargoEquivalencia 0,5.',
    englishMessage: 'For TipoImpositivo 4%, only TipoRecargoEquivalencia 0.5 is allowed.',
  },
  '1165': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 0% sólo se admite TipoRecargoEquivalencia 0% entre el 1 de enero de 2023 y el 30 de septiembre de 2024.',
    englishMessage:
      'For TipoImpositivo 0%, only TipoRecargoEquivalencia 0 is allowed between 2023-01-01 and 2024-09-30.',
  },
  '1166': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 2% entre el 1 de octubre de 2024 y el 31 de diciembre de 2024, sólo se admite TipoRecargoEquivalencia 0,26.',
    englishMessage:
      'For TipoImpositivo 2% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 0.26 is allowed.',
  },
  '1167': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 5% sólo se admite TipoRecargoEquivalencia 0,5 si Fecha Operacion (Fecha Expedicion Factura si no se informa FechaOperacion) es mayor o igual que el 1 de julio de 2022 y el 31 de diciembre de 2022.',
    englishMessage:
      'For TipoImpositivo 5%, TipoRecargoEquivalencia 0.5 only between 2022-07-01 and 2022-12-31.',
  },
  '1168': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 5% sólo se admite TipoRecargoEquivalencia 0,62 si Fecha Operacion (Fecha Expedicion Factura si no se informa FechaOperacion) es mayor o igual que el 1 de enero de 2023 y el 30 de septiembre de 2024.',
    englishMessage:
      'For TipoImpositivo 5%, TipoRecargoEquivalencia 0.62 only between 2023-01-01 and 2024-09-30.',
  },
  '1169': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 7,5% entre el 1 de octubre de 2024 y el 31 de diciembre de 2024, sólo se admite TipoRecargoEquivalencia 1.',
    englishMessage:
      'For TipoImpositivo 7.5% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 1 is allowed.',
  },
  '1170': {
    category: 'record',
    message:
      'Si el TipoImpositivo es 0%, desde el 1 de octubre del 2024, sólo se admite TipoRecargoEquivalencia 0,26.',
    englishMessage:
      'For TipoImpositivo 0% from 2024-10-01, only TipoRecargoEquivalencia 0.26 is allowed.',
  },
  '1171': {
    category: 'record',
    message:
      'El valor del campo Subsanacion o RechazoPrevio no se encuentra en los valores permitidos.',
    englishMessage: 'Invalid value in Subsanacion or RechazoPrevio.',
  },
  '1172': {
    category: 'record',
    message: 'El valor del campo NIF u ObligadoEmision son nulos.',
    englishMessage: 'NIF or ObligadoEmision is null.',
  },
  '1173': {
    category: 'record',
    message:
      'Sólo se permite que la fecha de operación sea superior a la fecha actual si los detalles del desglose son ClaveRegimen 14 o 15 e Impuesto IVA(01) o IGIC(03) o vacío.',
    englishMessage:
      'FechaOperacion may only be later than today when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty.',
  },
  '1174': {
    category: 'record',
    message: 'El valor del campo FechaExpedicionFactura del bloque RegistroAnteriores incorrecto.',
    englishMessage: 'RegistroAnterior FechaExpedicionFactura is incorrect.',
  },
  '1175': {
    category: 'record',
    message: 'El valor del campo NumSerieFactura del bloque RegistroAnterior es incorrecto.',
    englishMessage: 'RegistroAnterior NumSerieFactura is incorrect.',
  },
  '1176': {
    category: 'record',
    message: 'El valor de campo NIF del bloque SistemaInformatico es incorrecto.',
    englishMessage: 'SistemaInformatico NIF is incorrect.',
  },
  '1177': {
    category: 'record',
    message: 'El valor de campo IdSistemaInformatico del bloque SistemaInformatico es incorrecto.',
    englishMessage: 'SistemaInformatico IdSistemaInformatico is incorrect.',
  },
  '1178': {
    category: 'record',
    message: 'Error en el bloque de Tercero.',
    englishMessage: 'Error in the Tercero block.',
  },
  '1179': {
    category: 'record',
    message: 'Error en el bloque de SistemaInformatico.',
    englishMessage: 'Error in the SistemaInformatico block.',
  },
  '1180': {
    category: 'record',
    message: 'Error en el bloque de Encadenamiento.',
    englishMessage: 'Error in the Encadenamiento block.',
  },
  '1181': {
    category: 'record',
    message: 'El valor del campo CalificacionOperacion es incorrecto.',
    englishMessage: 'Invalid CalificacionOperacion value.',
  },
  '1182': {
    category: 'record',
    message: 'El valor del campo OperacionExenta es incorrecto.',
    englishMessage: 'Invalid OperacionExenta value.',
  },
  '1183': {
    category: 'record',
    message:
      'El campo FacturaSimplificadaArticulos7273 solo se podrá rellenar con S si TipoFactura es de tipo F1 o F3 o R1 o R2 o R3 o R4.',
    englishMessage:
      'FacturaSimplificadaArt7273 can only be S when TipoFactura is F1, F3, R1, R2, R3 or R4.',
  },
  '1184': {
    category: 'record',
    message: 'El campo FacturaSinIdentifDestinatarioArt61d solo acepta valores S o N.',
    englishMessage: 'FacturaSinIdentifDestinatarioArt61d only accepts S or N.',
  },
  '1185': {
    category: 'record',
    message:
      'El campo FacturaSinIdentifDestinatarioArt61d solo se podrá rellenar con S si TipoFactura es de tipo F2 o R5.',
    englishMessage:
      'FacturaSinIdentifDestinatarioArt61d can only be S when TipoFactura is F2 or R5.',
  },
  '1186': {
    category: 'record',
    message:
      'Si EmitidaPorTercerosODestinatario es igual a T el bloque Tercero será de cumplimentación obligatoria.',
    englishMessage: 'When EmitidaPorTerceroODestinatario is T, Tercero block is mandatory.',
  },
  '1187': {
    category: 'record',
    message:
      'Sólo se podrá cumplimentarse el bloque Tercero si el valor de EmitidaPorTercerosODestinatario es T.',
    englishMessage: 'Tercero block only allowed when EmitidaPorTerceroODestinatario is T.',
  },
  '1188': {
    category: 'record',
    message: 'El NIF del bloque Tercero debe ser diferente al NIF del ObligadoEmision.',
    englishMessage: 'Tercero NIF must differ from ObligadoEmision NIF.',
  },
  '1189': {
    category: 'record',
    message:
      'Si TipoFactura es F1 o F3 o R1 o R2 o R3 o R4 el bloque Destinatarios tiene que estar cumplimentado.',
    englishMessage:
      'Destinatarios block is mandatory when TipoFactura is F1, F3, R1, R2, R3 or R4.',
  },
  '1190': {
    category: 'record',
    message: 'Si TipoFactura es F2 o R5 el bloque Destinatarios no puede estar cumplimentado.',
    englishMessage: 'Destinatarios block forbidden when TipoFactura is F2 or R5.',
  },
  '1191': {
    category: 'record',
    message: 'Si TipoFactura es R3 sólo se admitirá NIF o IDType = No Censado (07).',
    englishMessage: 'When TipoFactura is R3 only NIF or IDType No Censado (07) is allowed.',
  },
  '1192': {
    category: 'record',
    message: 'Si TipoFactura es R2 sólo se admitirá NIF o IDType = No Censado (07) o NIF-IVA (02).',
    englishMessage:
      'When TipoFactura is R2 only NIF, IDType No Censado (07) or NIF-IVA (02) is allowed.',
  },
  '1193': {
    category: 'record',
    message:
      'En el bloque Destinatarios si se identifica mediante NIF, el NIF debe estar identificado y ser distinto del NIF ObligadoEmision.',
    englishMessage: 'Destinatarios NIF must be identified and differ from ObligadoEmision NIF.',
  },
  '1194': {
    category: 'record',
    message:
      'El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de julio de 2022 e inferior o igual a 30 de septiembre de 2024.',
    englishMessage: 'TipoImpositivo value only allowed between 2022-07-01 and 2024-09-30.',
  },
  '1195': {
    category: 'record',
    message:
      'Al menos uno de los dos campos OperacionExenta o CalificacionOperacion deben estar informados.',
    englishMessage: 'At least one of OperacionExenta or CalificacionOperacion must be informed.',
  },
  '1196': {
    category: 'record',
    message:
      'OperacionExenta o CalificacionOperacion no pueden ser ambos informados ya que son excluyentes entre sí.',
    englishMessage: 'OperacionExenta and CalificacionOperacion are mutually exclusive.',
  },
  '1197': {
    category: 'record',
    message:
      'Si CalificacionOperacion tiene valor Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) TipoFactura solo puede ser F1, F3, R1, R2, R3 y R4.',
    englishMessage:
      'When CalificacionOperacion is S2, TipoFactura can only be F1, F3, R1, R2, R3 or R4.',
  },
  '1198': {
    category: 'record',
    message:
      'Si CalificacionOperacion tiene valor Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) TipoImpositivo y CuotaRepercutida deberan tener valor 0.',
    englishMessage:
      'When CalificacionOperacion is S2, TipoImpositivo and CuotaRepercutida must be 0.',
  },
  '1199': {
    category: 'record',
    message:
      "Si Impuesto es '01' (IVA), '03' (IGIC) o no se cumplimenta y ClaveRegimen es 01 no pueden marcarse la OperacionExenta E2, E3.",
    englishMessage:
      'When Impuesto is 01/03/empty and ClaveRegimen is 01, OperacionExenta E2 and E3 are forbidden.',
  },
  '1200': {
    category: 'record',
    message:
      'Si ClaveRegimen es 03 CalificacionOperacion sólo puede ser Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1).',
    englishMessage: 'When ClaveRegimen is 03, CalificacionOperacion can only be S1.',
  },
  '1201': {
    category: 'record',
    message:
      'Si ClaveRegimen es 04 CalificacionOperacion sólo puede ser Operación Sujeta y No exenta - Con inversión del sujeto pasivo (S2) o bien OperacionExenta.',
    englishMessage:
      'When ClaveRegimen is 04, CalificacionOperacion must be S2 or OperacionExenta must be set.',
  },
  '1202': {
    category: 'record',
    message:
      'Si ClaveRegimen es 06 TipoFactura no puede ser F2, F3, R5 y BaseImponibleACoste debe estar cumplimentado.',
    englishMessage:
      'When ClaveRegimen is 06, TipoFactura cannot be F2/F3/R5 and BaseImponibleACoste must be set.',
  },
  '1203': {
    category: 'record',
    message:
      'Si ClaveRegimen es 07 OperacionExenta no puede ser E2, E3, E4 y E5 o CalificacionOperacion no puede ser S2, N1, N2.',
    englishMessage:
      'When ClaveRegimen is 07, OperacionExenta cannot be E2/E3/E4/E5 and CalificacionOperacion cannot be S2/N1/N2.',
  },
  '1205': {
    category: 'record',
    message:
      'Si ClaveRegimen es 10 CalificacionOperacion tiene que ser N1, TipoFactura F1 y Destinatarios estar identificada mediante NIF.',
    englishMessage:
      'When ClaveRegimen is 10, CalificacionOperacion must be N1, TipoFactura must be F1 and recipients must be identified by NIF.',
  },
  '1206': {
    category: 'record',
    message: 'Si ClaveRegimen es 11 TipoImpositivo ha de ser 21%.',
    englishMessage: 'When ClaveRegimen is 11, TipoImpositivo must be 21%.',
  },
  '1207': {
    category: 'record',
    message:
      'La CuotaRepercutida solo podrá ser distinta de 0 si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1).',
    englishMessage: 'CuotaRepercutida can only be non-zero when CalificacionOperacion is S1.',
  },
  '1208': {
    category: 'record',
    message:
      'Si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1) y BaseImponibleACoste no está cumplimentada, TipoImpositivo y CuotaRepercutida son obligatorios.',
    englishMessage:
      'When CalificacionOperacion is S1 and BaseImponibleACoste is missing, TipoImpositivo and CuotaRepercutida are mandatory.',
  },
  '1209': {
    category: 'record',
    message:
      'Si CalificacionOperacion es Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1) y ClaveRegimen es 06, TipoImpositivo y CuotaRepercutida son obligatorios.',
    englishMessage:
      'When CalificacionOperacion is S1 and ClaveRegimen is 06, TipoImpositivo and CuotaRepercutida are mandatory.',
  },
  '1210': {
    category: 'record',
    message:
      'El campo ImporteTotal tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto, CuotaRepercutida y CuotaRecargoEquivalencia suministrados.',
    englishMessage:
      'ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia.',
  },
  '1211': {
    category: 'record',
    message: 'El bloque Tercero no puede estar identificado con IDType=No Censado (07).',
    englishMessage: 'Tercero cannot be identified with IDType No Censado (07).',
  },
  '1212': {
    category: 'record',
    message: 'El campo TipoUsoPosibleSoloVerifactu solo acepta valores N o S.',
    englishMessage: 'TipoUsoPosibleSoloVerifactu only accepts N or S.',
  },
  '1213': {
    category: 'record',
    message: 'El campo TipoUsoPosibleMultiOT solo acepta valores N o S.',
    englishMessage: 'TipoUsoPosibleMultiOT only accepts N or S.',
  },
  '1214': {
    category: 'record',
    message: 'El campo NumeroOTAlta debe ser nÃºmerico positivo de 4 posiciones.',
    englishMessage: 'NumeroOTAlta must be a positive 4-digit number.',
  },
  '1215': {
    category: 'record',
    message: 'Error en el bloque de ObligadoEmision.',
    englishMessage: 'Error in the ObligadoEmision block.',
  },
  '1216': {
    category: 'record',
    message:
      'El campo CuotaTotal tiene un valor incorrecto para el valor de los campos CuotaRepercutida y CuotaRecargoEquivalencia suministrados.',
    englishMessage:
      'CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia.',
  },
  '1217': {
    category: 'record',
    message: 'Error identificando el IDEmisorFactura.',
    englishMessage: 'Error identifying IDEmisorFactura.',
  },
  '1218': {
    category: 'record',
    message: 'El valor del campo Impuesto es incorrecto.',
    englishMessage: 'Invalid Impuesto value.',
  },
  '1219': {
    category: 'record',
    message: 'El valor del campo IDEmisorFactura es incorrecto.',
    englishMessage: 'Invalid IDEmisorFactura value.',
  },
  '1220': {
    category: 'record',
    message: 'El valor del campo NombreSistemaInformatico es incorrecto.',
    englishMessage: 'Invalid NombreSistemaInformatico value.',
  },
  '1221': {
    category: 'record',
    message: 'El valor del campo IDType del sistema informático es incorrecto.',
    englishMessage: 'Invalid IDType in SistemaInformatico.',
  },
  '1222': {
    category: 'record',
    message: 'El valor del campo ID del bloque IDOtro es incorrecto.',
    englishMessage: 'Invalid ID in IDOtro block.',
  },
  '1223': {
    category: 'record',
    message:
      'En el bloque SistemaInformatico si se cumplimenta NIF, no deberá existir la agrupación IDOtro y viceversa, pero es obligatorio que se cumplimente uno de los dos.',
    englishMessage: 'SistemaInformatico must have exactly one of NIF or IDOtro.',
  },
  '1224': {
    category: 'record',
    message:
      'Si se informa el campo GeneradoPor deberá existir la agrupación Generador y viceversa.',
    englishMessage: 'GeneradoPor and Generador must both be present together.',
  },
  '1225': {
    category: 'record',
    message: 'El valor del campo GeneradoPor es incorrecto.',
    englishMessage: 'Invalid GeneradoPor value.',
  },
  '1226': {
    category: 'record',
    message: 'El campo IndicadorMultiplesOT solo acepta valores N o S.',
    englishMessage: 'IndicadorMultiplesOT only accepts N or S.',
  },
  '1227': {
    category: 'record',
    message:
      'Si el campo GeneradoPor es igual a E debe estar relleno el campo NIF del bloque Generador.',
    englishMessage: 'When GeneradoPor is E, Generador NIF is mandatory.',
  },
  '1228': {
    category: 'record',
    message:
      'En el bloque Generador si se cumplimenta NIF, no deberá existir la agrupación IDOtro y viceversa, pero es obligatorio que se cumplimente uno de los dos.',
    englishMessage: 'Generador must have exactly one of NIF or IDOtro.',
  },
  '1229': {
    category: 'record',
    message:
      'Si el valor de GeneradoPor es igual a T el valor del campo IDType del bloque Generador no debe ser No Censado (07).',
    englishMessage: 'When GeneradoPor is T, Generador IDType cannot be No Censado (07).',
  },
  '1230': {
    category: 'record',
    message:
      'Si el valor de GeneradoPor es igual a D y el CodigoPais tiene valor ES (España), el valor del campo IDType del bloque Generador debe ser Pasaporte (03) o No Censado (07).',
    englishMessage:
      'When GeneradoPor is D and CodigoPais is ES, Generador IDType must be Passport (03) or No Censado (07).',
  },
  '1231': {
    category: 'record',
    message: 'El valor del campo IDType del bloque Generador es incorrecto.',
    englishMessage: 'Invalid Generador IDType.',
  },
  '1232': {
    category: 'record',
    message:
      'Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer Pasaporte (03).',
    englishMessage: 'When IDOtro and CodigoPais is ES, IDType must be Passport (03).',
  },
  '1233': {
    category: 'record',
    message:
      'Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer No Censado (07).',
    englishMessage: 'When IDOtro and CodigoPais is ES, IDType must be No Censado (07).',
  },
  '1234': {
    category: 'record',
    message:
      'Si se identifica a través de la agrupación IDOtro y CodigoPais tiene valor ES (España), el campo IDType debe valer Pasaporte (03) o No Censado (07).',
    englishMessage:
      'When IDOtro and CodigoPais is ES, IDType must be Passport (03) or No Censado (07).',
  },
  '1235': {
    category: 'record',
    message:
      'El valor del campo TipoImpositivo es incorrecto, el valor informado sólo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de octubre de 2024 e inferior o igual a 31 de diciembre de 2024.',
    englishMessage: 'TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31.',
  },
  '1236': {
    category: 'record',
    message:
      'El valor del campo TipoImpositivo es incorrecto, el valor informado solo es permitido para FechaOperacion o FechaExpedicionFactura posterior o igual a 1 de octubre de 2024 e inferior o igual a 31 de diciembre de 2024.',
    englishMessage: 'TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31.',
  },
  '1237': {
    category: 'record',
    message:
      'El valor del campo CalificacionOperacion está informado como Operación No sujeta (N1 o N2) y el impuesto es IVA. No se puede informar de los campos TipoImpositivo, CuotaRepercutida, TipoRecargoEquivalencia y CuotaRecargoEquivalencia.',
    englishMessage:
      'When CalificacionOperacion is N1/N2 and tax is IVA, tax-rate-related fields are forbidden.',
  },
  '1238': {
    category: 'record',
    message:
      'Si la operacion es exenta no se puede informar ninguno de los campos TipoImpositivo, CuotaRepercutida, TipoRecargoEquivalencia y CuotaRecargoEquivalencia.',
    englishMessage: 'When OperacionExenta is set, tax-rate-related fields are forbidden.',
  },
  '1239': {
    category: 'record',
    message: 'Error en el bloque Destinatario.',
    englishMessage: 'Error in the Destinatario block.',
  },
  '1240': {
    category: 'record',
    message: 'Error en el bloque de IdEmisorFactura.',
    englishMessage: 'Error in the IdEmisorFactura block.',
  },
  '1241': {
    category: 'record',
    message: 'Error técnico al obtener el SistemaInformatico.',
    englishMessage: 'Technical error obtaining the SistemaInformatico.',
  },
  '1242': {
    category: 'record',
    message: 'No existe el sistema informático.',
    englishMessage: 'SistemaInformatico does not exist.',
  },
  '1243': {
    category: 'record',
    message: 'Error técnico al obtener el cálculo de la fecha del huso horario.',
    englishMessage: 'Technical error computing the timezone date.',
  },
  '1244': {
    category: 'record',
    message: 'El campo FechaHoraHusoGenRegistro tiene un formato incorrecto.',
    englishMessage: 'Invalid FechaHoraHusoGenRegistro format.',
  },
  '1245': {
    category: 'record',
    message:
      'Si el campo Impuesto está vacío o tiene valor IVA(01) o IPSI(02) o IGIC(03) el campo ClaveRegimen debe de estar cumplimentado.',
    englishMessage:
      'When Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03), ClaveRegimen must be informed.',
  },
  '1246': {
    category: 'record',
    message: 'El valor del campo ClaveRegimen es incorrecto.',
    englishMessage: 'Invalid ClaveRegimen value.',
  },
  '1247': {
    category: 'record',
    message: 'El valor del campo TipoHuella es incorrecto.',
    englishMessage: 'Invalid TipoHuella value.',
  },
  '1248': {
    category: 'record',
    message: 'El valor del campo Periodo es incorrecto.',
    englishMessage: 'Invalid Periodo value.',
  },
  '1249': {
    category: 'record',
    message: 'El valor del campo IndicadorRepresentante tiene un valor incorrecto.',
    englishMessage: 'Invalid IndicadorRepresentante value.',
  },
  '1250': {
    category: 'record',
    message:
      'El valor de fecha desde debe ser menor que el valor de fecha hasta en RangoFechaExpedicion.',
    englishMessage: 'Date-from must be earlier than date-to in RangoFechaExpedicion.',
  },
  '1251': {
    category: 'record',
    message: 'El valor del campo IdVersion tiene un valor incorrecto',
    englishMessage: 'Invalid IdVersion value.',
  },
  '1252': {
    category: 'record',
    message:
      'Si ClaveRegimen es 08 el campo CalificacionOperacion tiene que tener el valor Operación No sujeta por reglas de localización (N2) e ir siempre informado.',
    englishMessage:
      'When ClaveRegimen is 08, CalificacionOperacion must be N2 and always informed.',
  },
  '1253': {
    category: 'record',
    message: 'El valor del campo RefExterna tiene un valor incorrecto.',
    englishMessage: 'Invalid RefExterna value.',
  },
  '1254': {
    category: 'record',
    message:
      "Si FechaOperacion (FechaExpedicionFactura si no se informa FechaOperacion) es anterior a 01/01/2021 no se permite el valor 'XI' para Identificaciones NIF-IVA",
    englishMessage: 'XI not allowed for NIF-IVA when FechaOperacion is before 2021-01-01.',
  },
  '1255': {
    category: 'record',
    message:
      "Si FechaOperacion (FechaExpedicionFactura si no se informa FechaOperacion) es mayor o igual que 01/02/2021 no se permite el valor 'GB' para Identificaciones NIF-IVA",
    englishMessage: 'GB not allowed for NIF-IVA when FechaOperacion is on or after 2021-02-01.',
  },
  '1256': {
    category: 'record',
    message: 'Error técnico al obtener el límite de la fecha de expedición.',
    englishMessage: 'Technical error retrieving the issue-date limit.',
  },
  '1257': {
    category: 'record',
    message:
      "El campo BaseImponibleACoste solo puede estar cumplimentado si la ClaveRegimen es = '06' o Impuesto = '02' (IPSI) o Impuesto = '05' (Otros).",
    englishMessage:
      'BaseImponibleACoste only allowed when ClaveRegimen is 06 or Impuesto is 02/05.',
  },
  '1258': {
    category: 'record',
    message: 'El valor de campo NIF del bloque Generador es incorrecto.',
    englishMessage: 'Invalid Generador NIF.',
  },
  '1259': {
    category: 'record',
    message:
      'En el bloque Generador si se identifica mediante NIF, el NIF debe estar identificado y ser distinto del NIF ObligadoEmision.',
    englishMessage: 'Generador NIF must be identified and differ from ObligadoEmision NIF.',
  },
  '1260': {
    category: 'record',
    message:
      'El campo ClaveRegimen solo debe de estar cumplimentado si el campo Impuesto está vacío o tiene valor IVA(01) o IPSI(02) o IGIC(03)',
    englishMessage:
      'ClaveRegimen is only allowed when Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03).',
  },
  '1261': {
    category: 'record',
    message:
      'El campo IndicadorRepresentante solo debe de estar cumplimentado si se consulta por ObligadoEmision',
    englishMessage: 'IndicadorRepresentante is only allowed when querying by ObligadoEmision.',
  },
  '1262': {
    category: 'record',
    message: 'La longitud de huella no cumple con las especificaciones.',
    englishMessage: 'Hash length does not match the specification.',
  },
  '1263': {
    category: 'record',
    message: 'La longitud del tipo de huella no cumple con las especificaciones.',
    englishMessage: 'TipoHuella length does not match the specification.',
  },
  '1264': {
    category: 'record',
    message: 'La longitud del campo primer Registro no cumple con las especificaciones.',
    englishMessage: 'PrimerRegistro length does not match the specification.',
  },
  '1265': {
    category: 'record',
    message: 'La longitud del campo tipo factura no cumple con las especificaciones.',
    englishMessage: 'TipoFactura length does not match the specification.',
  },
  '1266': {
    category: 'record',
    message: 'La longitud del campo cuota total no cumple con las especificaciones.',
    englishMessage: 'CuotaTotal length does not match the specification.',
  },
  '1267': {
    category: 'record',
    message: 'La longitud del campo importe total no cumple con las especificaciones.',
    englishMessage: 'ImporteTotal length does not match the specification.',
  },
  '1268': {
    category: 'record',
    message: 'La longitud del campo FechaHoraHusoGenRegistro no cumple con las especificaciones.',
    englishMessage: 'FechaHoraHusoGenRegistro length does not match the specification.',
  },
  '1269': {
    category: 'record',
    message: 'El bloque Registro Anterior no esta informado correctamente.',
    englishMessage: 'RegistroAnterior block is not properly informed.',
  },
  '1270': {
    category: 'record',
    message: 'El valor del campo MostrarNombreRazonEmisor tiene un valor incorrecto.',
    englishMessage: 'Invalid MostrarNombreRazonEmisor value.',
  },
  '1271': {
    category: 'record',
    message: 'El valor del campo MostrarSistemaInformatico tiene un valor incorrecto.',
    englishMessage: 'Invalid MostrarSistemaInformatico value.',
  },
  '1272': {
    category: 'record',
    message:
      "Si se consulta por Destinatario el valor del campo MostrarSistemaInformatico debe valer 'N' o no estar cumplimentado.",
    englishMessage: 'When querying by Destinatario, MostrarSistemaInformatico must be N or empty.',
  },
  '1273': {
    category: 'record',
    message: 'Error en el bloque de Generador.',
    englishMessage: 'Error in the Generador block.',
  },
  '1274': {
    category: 'record',
    message: 'Valor incorrecto campo primer registro',
    englishMessage: 'Invalid PrimerRegistro value.',
  },
  '1275': {
    category: 'record',
    message: 'Valor incorrecto campo RechazoPrevio',
    englishMessage: 'Invalid RechazoPrevio value.',
  },
  '1276': {
    category: 'record',
    message: 'Valor incorrecto campo SinRegistroPrevio',
    englishMessage: 'Invalid SinRegistroPrevio value.',
  },
  '1277': {
    category: 'record',
    message: 'Valor incorrecto del TipoRecargoEquivalencia para el tipo impositivo 0%.',
    englishMessage: 'Invalid TipoRecargoEquivalencia for tax rate 0%.',
  },
  '1278': {
    category: 'record',
    message:
      'El valor de la huella del registro anterior debe ser diferente a la huella del registro actual',
    englishMessage: 'Previous-record hash must differ from current-record hash.',
  },
  '1281': {
    category: 'record',
    message:
      'Solo se puede cumplimentar TipoRecargoEquivalencia y CuotaRecargoEquivalencia cuando CalificacionOperacion tiene valor Operación Sujeta y No exenta - Sin inversión del sujeto pasivo (S1)',
    englishMessage:
      'TipoRecargoEquivalencia and CuotaRecargoEquivalencia only allowed when CalificacionOperacion is S1.',
  },
  '1282': {
    category: 'record',
    message:
      'Si el NIF de la cabecera es persona fisica se debe informar tambien de su NombreRazon',
    englishMessage: 'When header NIF is a natural person, NombreRazon must also be informed.',
  },
  '1283': {
    category: 'record',
    message:
      'Si el NIF de la contraparte es persona fisica se debe informar tambien de su NombreRazon',
    englishMessage: 'When counterpart NIF is a natural person, NombreRazon must also be informed.',
  },
  '1284': {
    category: 'record',
    message:
      'Si se ha informado de TipoRecargoEquivalencia tambien se debe informar de CuotaRecargoEquivalencia y viceversa.',
    englishMessage:
      'TipoRecargoEquivalencia and CuotaRecargoEquivalencia must both be informed together.',
  },
  '1285': {
    category: 'record',
    message:
      'Se han encontracado varios Sistemas Informáticos con los datos suministrados, debe filtrar la consulta por más campos del Sistema Informático.',
    englishMessage: 'Multiple SistemaInformaticos match; refine the query with more fields.',
  },
  '1286': {
    category: 'record',
    message:
      'Si el impuesto es IVA(01), IGIC(03) o vacio, si ClaveRegimen es 02 solo se podrá informar OperacionExenta.',
    englishMessage:
      'When Impuesto is IVA(01)/IGIC(03)/empty and ClaveRegimen is 02, only OperacionExenta is allowed.',
  },
  '1287': {
    category: 'record',
    message: 'El valor del campo %s contiene carácteres no validos (<, >, ", \', =).',
    englishMessage: 'Field contains forbidden characters (<, >, ", \', =).',
  },
  '1288': {
    category: 'record',
    message: 'Error técnico en la validación de la fecha de expedición/operación.',
    englishMessage: 'Technical error validating expedition/operation date.',
  },
  '1289': {
    category: 'record',
    message:
      "Si Impuesto es IVA(01) o vacio y si el campo OperacionExenta es igual a 'E5' sólo deberá existir la agrupación IDOtro en el bloque Destinatario.",
    englishMessage:
      'When Impuesto is IVA(01)/empty and OperacionExenta is E5, only IDOtro is allowed for the recipient.',
  },
  '1290': {
    category: 'record',
    message: 'El campo ID no contiene un NIF con formato correcto.',
    englishMessage: 'ID does not contain a NIF in the correct format.',
  },
  '1291': {
    category: 'record',
    message: 'El HASH del Registro anterior no es alfanumérico.',
    englishMessage: 'Previous-record hash is not alphanumeric.',
  },
  '1292': {
    category: 'record',
    message: 'El HASH no es alfanumérico.',
    englishMessage: 'Hash is not alphanumeric.',
  },
  '1293': {
    category: 'record',
    message:
      'Si ClaveRegimen es 20 el campo CalificacionOperacion tiene que tener el valor Operación No sujeta por reglas de localización (N2) e ir siempre informado.',
    englishMessage:
      'When ClaveRegimen is 20, CalificacionOperacion must be N2 and always informed.',
  },
  '2000': {
    category: 'admissible',
    message: 'El cálculo de la huella suministrada es incorrecta.',
    englishMessage: 'Submitted hash does not match the AEAT-computed value.',
  },
  '2001': {
    category: 'admissible',
    message: 'El NIF del bloque Destinatarios no está identificado en el censo de la AEAT.',
    englishMessage: 'Destinatarios NIF not identified in the AEAT census.',
  },
  '2002': {
    category: 'admissible',
    message: 'La longitud de huella del registro anterior no cumple con las especificaciones.',
    englishMessage: 'Previous-record hash length does not match the specification.',
  },
  '2003': {
    category: 'admissible',
    message: 'El contenido de la huella del registro anterior no cumple con las especificaciones.',
    englishMessage: 'Previous-record hash content does not match the specification.',
  },
  '2004': {
    category: 'admissible',
    message:
      'El valor del campo FechaHoraHusoGenRegistro debe ser la fecha actual del sistema de la AEAT, admitiéndose un margen de error de:',
    englishMessage: 'FechaHoraHusoGenRegistro must be the AEAT system clock, within margin.',
  },
  '2005': {
    category: 'admissible',
    message:
      'El campo ImporteTotal tiene un valor incorrecto para el valor de los campos BaseImponibleOimporteNoSujeto, CuotaRepercutida y CuotaRecargoEquivalencia suministrados.',
    englishMessage:
      'ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia.',
  },
  '2006': {
    category: 'admissible',
    message:
      'El campo CuotaTotal tiene un valor incorrecto para el valor de los campos CuotaRepercutida y CuotaRecargoEquivalencia suministrados.',
    englishMessage:
      'CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia.',
  },
  '2007': {
    category: 'admissible',
    message:
      'No debe informarse como primer registro, existen facturas emitidas con el obligado emisión y el sistema informático actual.',
    englishMessage:
      'PrimerRegistro cannot be marked because invoices already exist for this obligor and SIF.',
  },
  '2008': {
    category: 'admissible',
    message:
      'El valor de la huella del registro anterior debe ser diferente a la huella del registro actual.',
    englishMessage: 'Previous-record hash must differ from current-record hash.',
  },
  '2009': {
    category: 'admissible',
    message:
      'Si el campo Impuesto tiene valor IPSI(02) el campo ClaveRegimen debe de estar cumplimentado.',
    englishMessage: 'When Impuesto is IPSI(02), ClaveRegimen must be informed.',
  },
  '3000': {
    category: 'record',
    message: 'Registro de facturación duplicado.',
    englishMessage: 'Duplicate facturacion record.',
  },
  '3001': {
    category: 'record',
    message: 'El registro de facturación ya ha sido dado de baja.',
    englishMessage: 'Facturacion record already cancelled.',
  },
  '3002': {
    category: 'record',
    message: 'No existe el registro de facturación.',
    englishMessage: 'Facturacion record does not exist.',
  },
  '3003': {
    category: 'record',
    message:
      'El presentador no tiene los permisos necesarios para actualizar este registro de facturación.',
    englishMessage: 'Submitter does not have permissions to update this record.',
  },
  '3004': {
    category: 'record',
    message: 'No es posible modificar la factura ya que ha sido dada de alta vía formulario.',
    englishMessage: 'Cannot modify the invoice because it was registered through the AEAT form.',
  },
  '3500': {
    category: 'record',
    message: 'Error técnico de base de datos: error en la integridad de la información.',
    englishMessage: 'Database integrity error.',
  },
  '3501': {
    category: 'record',
    message: 'Error técnico de base de datos.',
    englishMessage: 'Database technical error.',
  },
  '3502': {
    category: 'record',
    message: 'La factura consultada para el suministro de pagos/cobros/inmuebles no existe.',
    englishMessage: 'Queried invoice for payment/collection/property does not exist.',
  },
  '3503': {
    category: 'record',
    message: 'La factura especificada no pertenece al titular registrado en el sistema.',
    englishMessage: 'Queried invoice does not belong to the registered holder.',
  },
  '4102': {
    category: 'envelope',
    message: 'El XML no cumple el esquema. Falta informar campo obligatorio.',
    englishMessage: 'XML does not match the schema; mandatory field missing.',
  },
  '4103': {
    category: 'envelope',
    message: 'Se ha producido un error inesperado al parsear el XML.',
    englishMessage: 'Unexpected error parsing the XML.',
  },
  '4104': {
    category: 'envelope',
    message:
      'Error en la cabecera: el valor del campo NIF del bloque ObligadoEmision no está identificado.',
    englishMessage: 'Header error: ObligadoEmision NIF is not identified.',
  },
  '4105': {
    category: 'envelope',
    message:
      'Error en la cabecera: el valor del campo NIF del bloque Representante no está identificado.',
    englishMessage: 'Header error: Representante NIF is not identified.',
  },
  '4106': {
    category: 'envelope',
    message: 'El formato de fecha es incorrecto.',
    englishMessage: 'Invalid date format.',
  },
  '4107': {
    category: 'envelope',
    message: 'El NIF no está identificado en el censo de la AEAT.',
    englishMessage: 'NIF not identified in the AEAT census.',
  },
  '4108': {
    category: 'envelope',
    message: 'Error técnico al obtener el certificado.',
    englishMessage: 'Technical error retrieving the certificate.',
  },
  '4109': {
    category: 'envelope',
    message: 'El formato del NIF es incorrecto.',
    englishMessage: 'Invalid NIF format.',
  },
  '4110': {
    category: 'envelope',
    message: 'Error técnico al comprobar los apoderamientos.',
    englishMessage: 'Technical error checking representation powers.',
  },
  '4111': {
    category: 'envelope',
    message: 'Error técnico al crear el trámite.',
    englishMessage: 'Technical error creating the proceeding.',
  },
  '4112': {
    category: 'envelope',
    message:
      'El titular del certificado debe ser Obligado Emisión, Colaborador Social, Apoderado o Sucesor.',
    englishMessage:
      'Certificate holder must be Obligado Emision, Colaborador Social, Apoderado or Sucesor.',
  },
  '4113': {
    category: 'envelope',
    message:
      'El XML no cumple con el esquema: se ha superado el límite permitido de registros para el bloque.',
    englishMessage: 'XML schema violation: block record limit exceeded.',
  },
  '4114': {
    category: 'envelope',
    message:
      'El XML no cumple con el esquema: se ha superado el límite máximo permitido de facturas a registrar.',
    englishMessage: 'XML schema violation: maximum invoice limit exceeded.',
  },
  '4115': {
    category: 'envelope',
    message: 'El valor del campo NIF del bloque ObligadoEmision es incorrecto.',
    englishMessage: 'Invalid ObligadoEmision NIF value.',
  },
  '4116': {
    category: 'envelope',
    message:
      'Error en la cabecera: el campo NIF del bloque ObligadoEmision tiene un formato incorrecto.',
    englishMessage: 'Header error: ObligadoEmision NIF has invalid format.',
  },
  '4117': {
    category: 'envelope',
    message:
      'Error en la cabecera: el campo NIF del bloque Representante tiene un formato incorrecto.',
    englishMessage: 'Header error: Representante NIF has invalid format.',
  },
  '4118': {
    category: 'envelope',
    message: 'Error técnico: la dirección no se corresponde con el fichero de entrada.',
    englishMessage: 'Technical error: address does not match the input file.',
  },
  '4119': {
    category: 'envelope',
    message: 'Error al informar caracteres cuya codificación no es UTF-8.',
    englishMessage: 'Characters with non-UTF-8 encoding detected.',
  },
  '4120': {
    category: 'envelope',
    message:
      'Error en la cabecera: el valor del campo FechaFinVeriFactu es incorrecto, debe ser 31-12-20XX, donde XX corresponde con el año actual o el anterior.',
    englishMessage:
      'Header error: invalid FechaFinVeriFactu value; must be 31-12-20XX matching current or previous year.',
  },
  '4121': {
    category: 'envelope',
    message: 'Error en la cabecera: el valor del campo Incidencia es incorrecto.',
    englishMessage: 'Header error: invalid Incidencia value.',
  },
  '4122': {
    category: 'envelope',
    message: 'Error en la cabecera: el valor del campo RefRequerimiento es incorrecto.',
    englishMessage: 'Header error: invalid RefRequerimiento value.',
  },
  '4123': {
    category: 'envelope',
    message:
      'Error en la cabecera: el valor del campo NIF del bloque Representante no está identificado en el censo de la AEAT.',
    englishMessage: 'Header error: Representante NIF not identified in the AEAT census.',
  },
  '4124': {
    category: 'envelope',
    message:
      'Error en la cabecera: el valor del campo Nombre del bloque Representante no está identificado en el censo de la AEAT.',
    englishMessage: 'Header error: Representante name not identified in the AEAT census.',
  },
  '4125': {
    category: 'envelope',
    message:
      'Error en la cabecera: Si el envío es por requerimiento el campo RefRequerimiento es obligatorio.',
    englishMessage: 'Header error: RefRequerimiento is mandatory for on-request submissions.',
  },
  '4126': {
    category: 'envelope',
    message:
      'Error en la cabecera: el campo RefRequerimiento solo debe informarse en sistemas en remisiones al endpoint del servicio a usar para la contestación a requerimientos de registros de facturación.',
    englishMessage: 'Header error: RefRequerimiento only allowed on the on-request endpoint.',
  },
  '4127': {
    category: 'envelope',
    message:
      'Error en la cabecera: la remisión voluntaria solo debe informarse en sistemas VERIFACTU.',
    englishMessage: 'Header error: voluntary submission only allowed on VERIFACTU systems.',
  },
  '4128': {
    category: 'envelope',
    message: 'Error técnico en la recuperación del valor del Gestor de Tablas.',
    englishMessage: 'Technical error retrieving the table manager value.',
  },
  '4129': {
    category: 'envelope',
    message: 'Error en la cabecera: el campo FinRequerimiento es obligatorio.',
    englishMessage: 'Header error: FinRequerimiento is mandatory.',
  },
  '4130': {
    category: 'envelope',
    message:
      'Error en la cabecera: el campo FinRequerimiento solo debe informarse en sistemas No VERIFACTU.',
    englishMessage: 'Header error: FinRequerimiento only allowed on non-VERIFACTU systems.',
  },
  '4131': {
    category: 'envelope',
    message: 'Error en la cabecera: el valor del campo FinRequerimiento es incorrecto.',
    englishMessage: 'Header error: invalid FinRequerimiento value.',
  },
  '4132': {
    category: 'envelope',
    message:
      'El titular del certificado debe ser el destinatario que realiza la consulta, un Apoderado o Sucesor',
    englishMessage:
      'Certificate holder must be the recipient performing the query, an Apoderado or Sucesor.',
  },
  '4133': {
    category: 'envelope',
    message: 'Error en la cabecera: el valor del campo RefRequerimiento no es alfanumérico.',
    englishMessage: 'Header error: RefRequerimiento is not alphanumeric.',
  },
  '4134': {
    category: 'envelope',
    message: 'Servicio no activo.',
    englishMessage: 'Service not active.',
  },
  '4135': {
    category: 'envelope',
    message: 'Esta URL no puede ser utilizada mediante GET.',
    englishMessage: 'URL cannot be accessed via GET.',
  },
  '4136': {
    category: 'envelope',
    message:
      'No se ha enviado el nodo RegistroAlta o el anterior al nodo RegistroAlta no es correcto.',
    englishMessage: 'RegistroAlta node missing or out of order.',
  },
  '4137': {
    category: 'envelope',
    message:
      'No se ha enviado el nodo RegistroAnulacion o el anterior al nodo RegistroAnulacion no es correcto.',
    englishMessage: 'RegistroAnulacion node missing or out of order.',
  },
  '4138': {
    category: 'envelope',
    message: 'Petición vacía en el XML o encoding incorrecto.',
    englishMessage: 'Empty XML payload or invalid encoding.',
  },
  '4139': {
    category: 'envelope',
    message: 'Servicio no habilitado en producción.',
    englishMessage: 'Service not enabled in production.',
  },
  '4140': {
    category: 'envelope',
    message:
      'No puede acceder a la consulta de facturas al no estar apoderado en los trámites necesarios.',
    englishMessage: 'Not authorised to query invoices (missing representation).',
  },
  '4141': {
    category: 'envelope',
    message:
      'Le informamos que su acceso al sistema VERIFACTU ha sido suspendido temporalmente para realizar cualquier solicitud. Para resolver este inconveniente, le solicitamos que se ponga en contacto con nuestro equipo de soporte a través del buzón de correo electrónico verifactu@correo.aeat.es, donde le atenderán con la mayor brevedad posible.',
    englishMessage:
      'Access to VERIFACTU has been temporarily suspended. Contact support at verifactu@correo.aeat.es.',
  },
} as const satisfies Readonly<Record<string, ErrorCatalogEntry>>;

/**
 * Union of every code declared in {@link ERROR_CATALOG}.
 */
export type ErrorCode = keyof typeof ERROR_CATALOG;

/**
 * Look up a catalog entry by code without coercing the return type.
 *
 * @param code - Numeric error code (3- or 4-digit string).
 * @returns The catalog entry or `undefined` if the code is unknown.
 * @example
 * ```ts
 * const entry = lookupError('1108');
 * entry?.englishMessage;
 * ```
 */
export function lookupError(code: string): ErrorCatalogEntry | undefined {
  return (ERROR_CATALOG as Readonly<Record<string, ErrorCatalogEntry>>)[code];
}
