#!/usr/bin/env bun
/**
 * Generate the AEAT error catalog as a TypeScript module.
 *
 * Downloads the canonical `errores.properties` listing published on the AEAT
 * developers portal, caches it under `schemas-aeat/errores.properties`, parses
 * the `code=message` lines and writes `src/errors/catalog.ts` containing a
 * fully typed `ERROR_CATALOG` constant.
 *
 * The file is published as ISO-8859-1; this script decodes it as Latin-1 and
 * re-emits the messages as UTF-8 inside the generated TypeScript source.
 *
 * Categorisation rule:
 *
 * - `4xxx` → `'envelope'` — rejects the entire submission.
 * - `1xxx` / `3xxx` → `'record'` — rejects only the affected record.
 * - `2xxx` → `'admissible'` — record is accepted; client must subsanate later.
 *
 * @example
 * ```sh
 * bun run scripts/gen-error-catalog.ts
 * ```
 *
 * @see {@link https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties}
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { request } from 'undici';

const ERRORS_URL =
  'https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties';

const root = resolve(import.meta.dir, '..');
const cachePath = resolve(root, 'schemas-aeat', 'errores.properties');
const outputPath = resolve(root, 'src', 'errors', 'catalog.ts');

/**
 * Hand-curated English translations of the Spanish AEAT error messages.
 *
 * Every code published in `errores.properties` at the time of authoring has
 * an entry here. Codes added by the AEAT after this script was last reviewed
 * fall back to {@link translateMessage}, which performs a conservative
 * token-level translation.
 */
const ENGLISH_TRANSLATIONS: Readonly<Record<string, string>> = {
  '1100': 'Invalid value or type for the field.',
  '1101': 'Invalid CodigoPais value.',
  '1102': 'Invalid IDType value.',
  '1103': 'Invalid ID value.',
  '1104': 'Invalid NumSerieFactura value.',
  '1105': 'Invalid FechaExpedicionFactura value.',
  '1106': 'TipoFactura value not in the allowed list.',
  '1107': 'Invalid TipoRectificativa value.',
  '1108': 'IDEmisorFactura NIF must match the ObligadoEmision NIF.',
  '1109': 'NIF not identified in the AEAT census.',
  '1110': 'NIF not identified in the AEAT census.',
  '1111': 'CodigoPais is mandatory when IDType is not NIF-IVA (02).',
  '1112': 'FechaExpedicionFactura is later than today.',
  '1114': 'TipoRectificativa is mandatory when invoice is rectifying.',
  '1115': 'TipoRectificativa must be empty when invoice is not rectifying.',
  '1116': 'FacturasSustituidas is only allowed when TipoFactura is F3.',
  '1117': 'FacturasRectificadas is forbidden when invoice is not rectifying.',
  '1118': 'ImporteRectificacion is mandatory when TipoRectificativa is S.',
  '1119': 'ImporteRectificacion is forbidden when TipoRectificativa is not S.',
  '1120': 'IDEmisorFactura value has an invalid type.',
  '1121': 'ID not identified in the AEAT census.',
  '1122': 'CodigoPais does not match the first two characters of the identifier.',
  '1123': 'Invalid NIF format.',
  '1124': 'TipoImpositivo not in the allowed list.',
  '1125': 'FechaOperacion is later than allowed.',
  '1126':
    'CodigoPais ES is only allowed when IDType is Passport (03) or No Censado (07); IDType 07 requires CodigoPais ES.',
  '1127': 'TipoRecargoEquivalencia not in the allowed list.',
  '1128': 'No facturacion agreement exists.',
  '1129': 'Technical error retrieving facturacion agreement.',
  '1130': 'NumSerieFactura contains forbidden characters.',
  '1131': 'ID must be a personal NIF when IDType is No Censado (07).',
  '1132': 'TipoImpositivo value only allowed for dates on or before 2012.',
  '1133': 'FechaExpedicionFactura cannot be earlier than today minus 20 years.',
  '1134': 'FechaOperacion cannot be earlier than today minus 20 years.',
  '1135': 'TipoRecargoEquivalencia value only allowed for dates on or before 2012.',
  '1136': 'FacturaSimplificadaArt7273 only accepts N or S.',
  '1137': 'Macrodato only accepts N or S.',
  '1138': 'Macrodato must be S only when ImporteTotal is ≥ ±100,000,000.',
  '1139': 'Macrodato must be informed with S when ImporteTotal is ≥ ±100,000,000.',
  '1140': 'CuotaRepercutida and BaseImponibleACoste must have the same sign.',
  '1142':
    'CuotaRepercutida is incorrect for the given BaseImponibleOimporteNoSujeto and TipoImpositivo.',
  '1143': 'CuotaRepercutida and BaseImponibleOimporteNoSujeto must have the same sign.',
  '1144': 'CuotaRepercutida is incorrect for the given BaseImponibleACoste and TipoImpositivo.',
  '1145': 'Invalid date format.',
  '1146':
    'FechaExpedicion may only be earlier than FechaOperacion when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty.',
  '1147': 'ClaveRegimen 14 requires FechaOperacion to be after FechaExpedicionFactura.',
  '1148': 'ClaveRegimen 14 requires TipoFactura F1, R1, R2, R3 or R4.',
  '1149':
    'ClaveRegimen 14 requires Destinatarios NIFs identified in the AEAT and starting with P, Q, S or V.',
  '1150':
    'When TipoFactura is F2 without NumRegistroAcuerdoFacturacion or FacturaSinIdentifDestinatarioArt61d=S, the breakdown total cannot exceed 3000€.',
  '1151': 'EmitidaPorTerceroODestinatario only accepts T or D.',
  '1152': 'FechaExpedicion cannot be earlier than 28 October 2024.',
  '1153': 'RechazoPrevio X is only allowed when Subsanacion is S.',
  '1154': 'Rectified/substituted invoice issuer NIF could not be identified at the AEAT.',
  '1155': 'Tercero block is informed but EmitidaPorTerceroODestinatario is missing.',
  '1156': 'When IDOtro and IDType is NIF-IVA (02), TipoFactura is incorrect.',
  '1157': 'Cupon can only be S or N; S only when TipoFactura is R1 or R5.',
  '1158': 'EmitidaPorTerceroODestinatario informed but the matching block is missing.',
  '1159': 'Tercero block informed when Destinatario is also expected.',
  '1160': 'For TipoImpositivo 5%, only TipoRecargoEquivalencia 0.5 or 0.62 is allowed.',
  '1161': 'RechazoPrevio S is forbidden when Subsanacion is missing or N.',
  '1162': 'For TipoImpositivo 21%, only TipoRecargoEquivalencia 5.2 or 1.75 is allowed.',
  '1163': 'For TipoImpositivo 10%, only TipoRecargoEquivalencia 1.4 is allowed.',
  '1164': 'For TipoImpositivo 4%, only TipoRecargoEquivalencia 0.5 is allowed.',
  '1165':
    'For TipoImpositivo 0%, only TipoRecargoEquivalencia 0 is allowed between 2023-01-01 and 2024-09-30.',
  '1166':
    'For TipoImpositivo 2% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 0.26 is allowed.',
  '1167':
    'For TipoImpositivo 5%, TipoRecargoEquivalencia 0.5 only between 2022-07-01 and 2022-12-31.',
  '1168':
    'For TipoImpositivo 5%, TipoRecargoEquivalencia 0.62 only between 2023-01-01 and 2024-09-30.',
  '1169':
    'For TipoImpositivo 7.5% between 2024-10-01 and 2024-12-31, only TipoRecargoEquivalencia 1 is allowed.',
  '1170': 'For TipoImpositivo 0% from 2024-10-01, only TipoRecargoEquivalencia 0.26 is allowed.',
  '1171': 'Invalid value in Subsanacion or RechazoPrevio.',
  '1172': 'NIF or ObligadoEmision is null.',
  '1173':
    'FechaOperacion may only be later than today when ClaveRegimen is 14 or 15 and Impuesto is 01, 03 or empty.',
  '1174': 'RegistroAnterior FechaExpedicionFactura is incorrect.',
  '1175': 'RegistroAnterior NumSerieFactura is incorrect.',
  '1176': 'SistemaInformatico NIF is incorrect.',
  '1177': 'SistemaInformatico IdSistemaInformatico is incorrect.',
  '1178': 'Error in the Tercero block.',
  '1179': 'Error in the SistemaInformatico block.',
  '1180': 'Error in the Encadenamiento block.',
  '1181': 'Invalid CalificacionOperacion value.',
  '1182': 'Invalid OperacionExenta value.',
  '1183': 'FacturaSimplificadaArt7273 can only be S when TipoFactura is F1, F3, R1, R2, R3 or R4.',
  '1184': 'FacturaSinIdentifDestinatarioArt61d only accepts S or N.',
  '1185': 'FacturaSinIdentifDestinatarioArt61d can only be S when TipoFactura is F2 or R5.',
  '1186': 'When EmitidaPorTerceroODestinatario is T, Tercero block is mandatory.',
  '1187': 'Tercero block only allowed when EmitidaPorTerceroODestinatario is T.',
  '1188': 'Tercero NIF must differ from ObligadoEmision NIF.',
  '1189': 'Destinatarios block is mandatory when TipoFactura is F1, F3, R1, R2, R3 or R4.',
  '1190': 'Destinatarios block forbidden when TipoFactura is F2 or R5.',
  '1191': 'When TipoFactura is R3 only NIF or IDType No Censado (07) is allowed.',
  '1192': 'When TipoFactura is R2 only NIF, IDType No Censado (07) or NIF-IVA (02) is allowed.',
  '1193': 'Destinatarios NIF must be identified and differ from ObligadoEmision NIF.',
  '1194': 'TipoImpositivo value only allowed between 2022-07-01 and 2024-09-30.',
  '1195': 'At least one of OperacionExenta or CalificacionOperacion must be informed.',
  '1196': 'OperacionExenta and CalificacionOperacion are mutually exclusive.',
  '1197': 'When CalificacionOperacion is S2, TipoFactura can only be F1, F3, R1, R2, R3 or R4.',
  '1198': 'When CalificacionOperacion is S2, TipoImpositivo and CuotaRepercutida must be 0.',
  '1199':
    'When Impuesto is 01/03/empty and ClaveRegimen is 01, OperacionExenta E2 and E3 are forbidden.',
  '1200': 'When ClaveRegimen is 03, CalificacionOperacion can only be S1.',
  '1201':
    'When ClaveRegimen is 04, CalificacionOperacion must be S2 or OperacionExenta must be set.',
  '1202':
    'When ClaveRegimen is 06, TipoFactura cannot be F2/F3/R5 and BaseImponibleACoste must be set.',
  '1203':
    'When ClaveRegimen is 07, OperacionExenta cannot be E2/E3/E4/E5 and CalificacionOperacion cannot be S2/N1/N2.',
  '1205':
    'When ClaveRegimen is 10, CalificacionOperacion must be N1, TipoFactura must be F1 and recipients must be identified by NIF.',
  '1206': 'When ClaveRegimen is 11, TipoImpositivo must be 21%.',
  '1207': 'CuotaRepercutida can only be non-zero when CalificacionOperacion is S1.',
  '1208':
    'When CalificacionOperacion is S1 and BaseImponibleACoste is missing, TipoImpositivo and CuotaRepercutida are mandatory.',
  '1209':
    'When CalificacionOperacion is S1 and ClaveRegimen is 06, TipoImpositivo and CuotaRepercutida are mandatory.',
  '1210':
    'ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia.',
  '1211': 'Tercero cannot be identified with IDType No Censado (07).',
  '1212': 'TipoUsoPosibleSoloVerifactu only accepts N or S.',
  '1213': 'TipoUsoPosibleMultiOT only accepts N or S.',
  '1214': 'NumeroOTAlta must be a positive 4-digit number.',
  '1215': 'Error in the ObligadoEmision block.',
  '1216': 'CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia.',
  '1217': 'Error identifying IDEmisorFactura.',
  '1218': 'Invalid Impuesto value.',
  '1219': 'Invalid IDEmisorFactura value.',
  '1220': 'Invalid NombreSistemaInformatico value.',
  '1221': 'Invalid IDType in SistemaInformatico.',
  '1222': 'Invalid ID in IDOtro block.',
  '1223': 'SistemaInformatico must have exactly one of NIF or IDOtro.',
  '1224': 'GeneradoPor and Generador must both be present together.',
  '1225': 'Invalid GeneradoPor value.',
  '1226': 'IndicadorMultiplesOT only accepts N or S.',
  '1227': 'When GeneradoPor is E, Generador NIF is mandatory.',
  '1228': 'Generador must have exactly one of NIF or IDOtro.',
  '1229': 'When GeneradoPor is T, Generador IDType cannot be No Censado (07).',
  '1230':
    'When GeneradoPor is D and CodigoPais is ES, Generador IDType must be Passport (03) or No Censado (07).',
  '1231': 'Invalid Generador IDType.',
  '1232': 'When IDOtro and CodigoPais is ES, IDType must be Passport (03).',
  '1233': 'When IDOtro and CodigoPais is ES, IDType must be No Censado (07).',
  '1234': 'When IDOtro and CodigoPais is ES, IDType must be Passport (03) or No Censado (07).',
  '1235': 'TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31.',
  '1236': 'TipoImpositivo value only allowed between 2024-10-01 and 2024-12-31.',
  '1237':
    'When CalificacionOperacion is N1/N2 and tax is IVA, tax-rate-related fields are forbidden.',
  '1238': 'When OperacionExenta is set, tax-rate-related fields are forbidden.',
  '1239': 'Error in the Destinatario block.',
  '1240': 'Error in the IdEmisorFactura block.',
  '1241': 'Technical error obtaining the SistemaInformatico.',
  '1242': 'SistemaInformatico does not exist.',
  '1243': 'Technical error computing the timezone date.',
  '1244': 'Invalid FechaHoraHusoGenRegistro format.',
  '1245': 'When Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03), ClaveRegimen must be informed.',
  '1246': 'Invalid ClaveRegimen value.',
  '1247': 'Invalid TipoHuella value.',
  '1248': 'Invalid Periodo value.',
  '1249': 'Invalid IndicadorRepresentante value.',
  '1250': 'Date-from must be earlier than date-to in RangoFechaExpedicion.',
  '1251': 'Invalid IdVersion value.',
  '1252': 'When ClaveRegimen is 08, CalificacionOperacion must be N2 and always informed.',
  '1253': 'Invalid RefExterna value.',
  '1254': 'XI not allowed for NIF-IVA when FechaOperacion is before 2021-01-01.',
  '1255': 'GB not allowed for NIF-IVA when FechaOperacion is on or after 2021-02-01.',
  '1256': 'Technical error retrieving the issue-date limit.',
  '1257': 'BaseImponibleACoste only allowed when ClaveRegimen is 06 or Impuesto is 02/05.',
  '1258': 'Invalid Generador NIF.',
  '1259': 'Generador NIF must be identified and differ from ObligadoEmision NIF.',
  '1260': 'ClaveRegimen is only allowed when Impuesto is empty/IVA(01)/IPSI(02)/IGIC(03).',
  '1261': 'IndicadorRepresentante is only allowed when querying by ObligadoEmision.',
  '1262': 'Hash length does not match the specification.',
  '1263': 'TipoHuella length does not match the specification.',
  '1264': 'PrimerRegistro length does not match the specification.',
  '1265': 'TipoFactura length does not match the specification.',
  '1266': 'CuotaTotal length does not match the specification.',
  '1267': 'ImporteTotal length does not match the specification.',
  '1268': 'FechaHoraHusoGenRegistro length does not match the specification.',
  '1269': 'RegistroAnterior block is not properly informed.',
  '1270': 'Invalid MostrarNombreRazonEmisor value.',
  '1271': 'Invalid MostrarSistemaInformatico value.',
  '1272': 'When querying by Destinatario, MostrarSistemaInformatico must be N or empty.',
  '1273': 'Error in the Generador block.',
  '1274': 'Invalid PrimerRegistro value.',
  '1275': 'Invalid RechazoPrevio value.',
  '1276': 'Invalid SinRegistroPrevio value.',
  '1277': 'Invalid TipoRecargoEquivalencia for tax rate 0%.',
  '1278': 'Previous-record hash must differ from current-record hash.',
  '1281':
    'TipoRecargoEquivalencia and CuotaRecargoEquivalencia only allowed when CalificacionOperacion is S1.',
  '1282': 'When header NIF is a natural person, NombreRazon must also be informed.',
  '1283': 'When counterpart NIF is a natural person, NombreRazon must also be informed.',
  '1284': 'TipoRecargoEquivalencia and CuotaRecargoEquivalencia must both be informed together.',
  '1285': 'Multiple SistemaInformaticos match; refine the query with more fields.',
  '1286':
    'When Impuesto is IVA(01)/IGIC(03)/empty and ClaveRegimen is 02, only OperacionExenta is allowed.',
  '1287': 'Field contains forbidden characters (<, >, ", \', =).',
  '1288': 'Technical error validating expedition/operation date.',
  '1289':
    'When Impuesto is IVA(01)/empty and OperacionExenta is E5, only IDOtro is allowed for the recipient.',
  '1290': 'ID does not contain a NIF in the correct format.',
  '1291': 'Previous-record hash is not alphanumeric.',
  '1292': 'Hash is not alphanumeric.',
  '1293': 'When ClaveRegimen is 20, CalificacionOperacion must be N2 and always informed.',
  '2000': 'Submitted hash does not match the AEAT-computed value.',
  '2001': 'Destinatarios NIF not identified in the AEAT census.',
  '2002': 'Previous-record hash length does not match the specification.',
  '2003': 'Previous-record hash content does not match the specification.',
  '2004': 'FechaHoraHusoGenRegistro must be the AEAT system clock, within margin.',
  '2005':
    'ImporteTotal is incorrect for the given BaseImponibleOimporteNoSujeto, CuotaRepercutida and CuotaRecargoEquivalencia.',
  '2006': 'CuotaTotal is incorrect for the given CuotaRepercutida and CuotaRecargoEquivalencia.',
  '2007':
    'PrimerRegistro cannot be marked because invoices already exist for this obligor and SIF.',
  '2008': 'Previous-record hash must differ from current-record hash.',
  '2009': 'When Impuesto is IPSI(02), ClaveRegimen must be informed.',
  '3000': 'Duplicate facturacion record.',
  '3001': 'Facturacion record already cancelled.',
  '3002': 'Facturacion record does not exist.',
  '3003': 'Submitter does not have permissions to update this record.',
  '3004': 'Cannot modify the invoice because it was registered through the AEAT form.',
  '3500': 'Database integrity error.',
  '3501': 'Database technical error.',
  '3502': 'Queried invoice for payment/collection/property does not exist.',
  '3503': 'Queried invoice does not belong to the registered holder.',
  '4102': 'XML does not match the schema; mandatory field missing.',
  '4103': 'Unexpected error parsing the XML.',
  '4104': 'Header error: ObligadoEmision NIF is not identified.',
  '4105': 'Header error: Representante NIF is not identified.',
  '4106': 'Invalid date format.',
  '4107': 'NIF not identified in the AEAT census.',
  '4108': 'Technical error retrieving the certificate.',
  '4109': 'Invalid NIF format.',
  '4110': 'Technical error checking representation powers.',
  '4111': 'Technical error creating the proceeding.',
  '4112': 'Certificate holder must be Obligado Emision, Colaborador Social, Apoderado or Sucesor.',
  '4113': 'XML schema violation: block record limit exceeded.',
  '4114': 'XML schema violation: maximum invoice limit exceeded.',
  '4115': 'Invalid ObligadoEmision NIF value.',
  '4116': 'Header error: ObligadoEmision NIF has invalid format.',
  '4117': 'Header error: Representante NIF has invalid format.',
  '4118': 'Technical error: address does not match the input file.',
  '4119': 'Characters with non-UTF-8 encoding detected.',
  '4120':
    'Header error: invalid FechaFinVeriFactu value; must be 31-12-20XX matching current or previous year.',
  '4121': 'Header error: invalid Incidencia value.',
  '4122': 'Header error: invalid RefRequerimiento value.',
  '4123': 'Header error: Representante NIF not identified in the AEAT census.',
  '4124': 'Header error: Representante name not identified in the AEAT census.',
  '4125': 'Header error: RefRequerimiento is mandatory for on-request submissions.',
  '4126': 'Header error: RefRequerimiento only allowed on the on-request endpoint.',
  '4127': 'Header error: voluntary submission only allowed on VERIFACTU systems.',
  '4128': 'Technical error retrieving the table manager value.',
  '4129': 'Header error: FinRequerimiento is mandatory.',
  '4130': 'Header error: FinRequerimiento only allowed on non-VERIFACTU systems.',
  '4131': 'Header error: invalid FinRequerimiento value.',
  '4132': 'Certificate holder must be the recipient performing the query, an Apoderado or Sucesor.',
  '4133': 'Header error: RefRequerimiento is not alphanumeric.',
  '4134': 'Service not active.',
  '4135': 'URL cannot be accessed via GET.',
  '4136': 'RegistroAlta node missing or out of order.',
  '4137': 'RegistroAnulacion node missing or out of order.',
  '4138': 'Empty XML payload or invalid encoding.',
  '4139': 'Service not enabled in production.',
  '4140': 'Not authorised to query invoices (missing representation).',
  '4141':
    'Access to VERIFACTU has been temporarily suspended. Contact support at verifactu@correo.aeat.es.',
};

/**
 * Translate a Spanish error message to a fallback English string.
 *
 * Used only for codes missing from {@link ENGLISH_TRANSLATIONS}. The output
 * intentionally stays close to the source so the SDK consumer can recognise
 * the original message in case of mismatch.
 *
 * @param spanish - Verbatim Spanish text from `errores.properties`.
 * @returns A best-effort English approximation.
 */
function translateMessage(spanish: string): string {
  const replacements: ReadonlyArray<readonly [RegExp, string]> = [
    [/no\s+está\s+identificado/giu, 'is not identified'],
    [/no\s+está\s+identificada/giu, 'is not identified'],
    [/no\s+existe/giu, 'does not exist'],
    [/debe\s+ser/giu, 'must be'],
    [/debe\s+estar/giu, 'must be'],
    [/obligatorio/giu, 'mandatory'],
    [/obligatoria/giu, 'mandatory'],
    [/incorrecto/giu, 'incorrect'],
    [/incorrecta/giu, 'incorrect'],
    [/valor/giu, 'value'],
    [/campo/giu, 'field'],
    [/fecha/giu, 'date'],
    [/factura/giu, 'invoice'],
    [/registro/giu, 'record'],
  ];
  let out = spanish;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/gu, ' ').trim();
}

/**
 * Categorise an AEAT error code by its numeric range.
 *
 * @param code - Numeric error code as a string (preserves leading zeros).
 * @returns `'envelope'` for 4xxx, `'admissible'` for 2xxx, otherwise `'record'`.
 */
function categorise(code: string): 'envelope' | 'record' | 'admissible' {
  const first = code.charAt(0);
  if (first === '4') return 'envelope';
  if (first === '2') return 'admissible';
  return 'record';
}

/**
 * Escape a string for safe embedding inside a single-quoted TypeScript literal.
 *
 * @param value - Raw text to escape.
 * @returns Escaped text suitable for single-quoted concatenation.
 */
function escapeLiteral(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'");
}

/**
 * Fetch `errores.properties` into the cache if the local copy is missing.
 *
 * The cache file is reused verbatim — delete it to force a refresh. The
 * upstream resource is published as ISO-8859-1; bytes are stored unmodified.
 *
 * @returns The cached file contents decoded as Latin-1 UTF-8 text.
 */
async function fetchCache(): Promise<string> {
  let bytes: Buffer;
  if (existsSync(cachePath)) {
    bytes = await readFile(cachePath);
  } else {
    const { statusCode, body } = await request(ERRORS_URL, { method: 'GET' });
    if (statusCode !== 200) {
      throw new Error(`Failed to fetch ${ERRORS_URL}: HTTP ${statusCode}`);
    }
    bytes = Buffer.from(await body.arrayBuffer());
    await mkdir(resolve(root, 'schemas-aeat'), { recursive: true });
    await writeFile(cachePath, bytes);
  }
  return new TextDecoder('iso-8859-1').decode(bytes);
}

/**
 * Parse the `code=message` lines of `errores.properties`.
 *
 * Lines that begin with `#`, `!`, `*`, are empty, or do not contain `=` are
 * skipped. Only entries whose key matches `/^\d{3,4}$/` are returned.
 *
 * @param raw - File contents.
 * @returns Map from numeric code (string) to Spanish message.
 */
function parseProperties(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of raw.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!') || line.startsWith('*')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const code = line.slice(0, eq).trim();
    const message = line.slice(eq + 1).trim();
    if (!/^\d{3,4}$/u.test(code)) continue;
    map.set(code, message);
  }
  return map;
}

const raw = await fetchCache();
const entries = parseProperties(raw);

const lines: string[] = [
  '/**',
  ' * Generated AEAT error catalog.',
  ' *',
  ' * Do not edit by hand — run `bun run scripts/gen-error-catalog.ts` to',
  ' * regenerate from the canonical `errores.properties` file.',
  ' *',
  ' * @module',
  ' */',
  '',
  "import type { ErrorCategory } from './VerifactuError.js';",
  '',
  '/**',
  ' * Shape of one entry in {@link ERROR_CATALOG}.',
  ' */',
  'export interface ErrorCatalogEntry {',
  '  /** AEAT-wide category — which level the error rejects or accepts. */',
  '  readonly category: ErrorCategory;',
  '  /** Verbatim Spanish message as published by the AEAT. */',
  '  readonly message: string;',
  '  /** English translation (hand-curated when known, mechanical otherwise). */',
  '  readonly englishMessage: string;',
  '}',
  '',
  '/**',
  ' * Frozen catalog of every error code published by the AEAT.',
  ' *',
  ' * @see {@link https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/errores.properties}',
  ' */',
  'export const ERROR_CATALOG = {',
];

const sortedCodes = [...entries.keys()].sort((a, b) => a.localeCompare(b));
for (const code of sortedCodes) {
  const message = entries.get(code) ?? '';
  const category = categorise(code);
  const english = ENGLISH_TRANSLATIONS[code] ?? translateMessage(message);
  lines.push(`  '${code}': {`);
  lines.push(`    category: '${category}',`);
  lines.push(`    message: '${escapeLiteral(message)}',`);
  lines.push(`    englishMessage: '${escapeLiteral(english)}',`);
  lines.push('  },');
}

lines.push('} as const satisfies Readonly<Record<string, ErrorCatalogEntry>>;');
lines.push('');
lines.push('/**');
lines.push(' * Union of every code declared in {@link ERROR_CATALOG}.');
lines.push(' */');
lines.push('export type ErrorCode = keyof typeof ERROR_CATALOG;');
lines.push('');
lines.push('/**');
lines.push(' * Look up a catalog entry by code without coercing the return type.');
lines.push(' *');
lines.push(' * @param code - Numeric error code (3- or 4-digit string).');
lines.push(' * @returns The catalog entry or `undefined` if the code is unknown.');
lines.push(' * @example');
lines.push(' * ```ts');
lines.push(" * const entry = lookupError('1108');");
lines.push(' * entry?.englishMessage;');
lines.push(' * ```');
lines.push(' */');
lines.push('export function lookupError(code: string): ErrorCatalogEntry | undefined {');
lines.push('  return (ERROR_CATALOG as Readonly<Record<string, ErrorCatalogEntry>>)[code];');
lines.push('}');
lines.push('');

await mkdir(resolve(root, 'src', 'errors'), { recursive: true });
await writeFile(outputPath, lines.join('\n'));

process.stdout.write(`generated ${outputPath} with ${entries.size} entries\n`);
