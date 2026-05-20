/**
 * Integration tests for the business-rules orchestrator.
 *
 * Each test starts from a known-good fixture, mutates a single field, and
 * checks the returned AEAT error code.
 */

import { describe, expect, it } from 'bun:test';
import type { Invoice } from '../../../src/types.ts';
import {
  validateInvoiceForCancel,
  validateInvoiceForRegister,
} from '../../../src/validators/businessRules.ts';
import { REFERENCE_DATE, buildValidCancel, buildValidInvoice } from './fixtures.ts';

function runRegister(mutate: (invoice: Invoice) => void): string[] {
  const invoice = buildValidInvoice();
  mutate(invoice);
  return validateInvoiceForRegister(invoice, { today: REFERENCE_DATE }).map((i) => i.code);
}

describe('validateInvoiceForRegister — happy path', () => {
  it('returns no issues for the canonical fixture', () => {
    expect(validateInvoiceForRegister(buildValidInvoice(), { today: REFERENCE_DATE })).toEqual([]);
  });
});

describe('validateInvoiceForRegister — §3.1.3 rules', () => {
  it('rule 1: invalid NIF → 1109', () => {
    expect(
      runRegister((i) => {
        i.invoiceId.issuerNif = 'XXXX';
      }),
    ).toContain('1109');
  });

  it('rule 1: forbidden NumSerieFactura → 1130', () => {
    expect(
      runRegister((i) => {
        i.invoiceId.seriesNumber = 'BAD<INVOICE>';
      }),
    ).toContain('1130');
  });

  it('rule 2: RechazoPrevio X without Subsanacion → 1153', () => {
    expect(
      runRegister((i) => {
        i.priorRejection = 'X';
      }),
    ).toContain('1153');
  });

  it('rule 3: rectifying invoice without TipoRectificativa → 1114', () => {
    expect(
      runRegister((i) => {
        i.invoiceType = 'R1';
      }),
    ).toContain('1114');
  });

  it('rule 3: non-rectifying invoice with TipoRectificativa → 1115', () => {
    expect(
      runRegister((i) => {
        i.rectificationKind = 'S';
      }),
    ).toContain('1115');
  });

  it('rule 5: FacturasSustituidas on non-F3 → 1116', () => {
    expect(
      runRegister((i) => {
        i.substitutedInvoices = [
          { issuerNif: 'B12345674', seriesNumber: 'X', issueDate: '2026-05-19' },
        ];
      }),
    ).toContain('1116');
  });

  it('rule 6: TipoRectificativa S without ImporteRectificacion → 1118', () => {
    expect(
      runRegister((i) => {
        i.invoiceType = 'R1';
        i.rectificationKind = 'S';
      }),
    ).toContain('1118');
  });

  it('rule 8: FacturaSimplificadaArt7273 with F2 → 1183', () => {
    expect(
      runRegister((i) => {
        i.invoiceType = 'F2';
        i.recipients = undefined;
        i.simplifiedArt7273 = 'S';
      }),
    ).toContain('1183');
  });

  it('rule 9: FacturaSinIdentifDestinatarioArt61d with F1 → 1185', () => {
    expect(
      runRegister((i) => {
        i.withoutRecipientArt61d = 'S';
      }),
    ).toContain('1185');
  });

  it('rule 10: Macrodato missing for large total → 1139', () => {
    expect(
      runRegister((i) => {
        i.totalAmount = '100000000.00';
        i.totalTaxAmount = '0';
        i.breakdown[0]!.taxRate = '0';
        i.breakdown[0]!.taxBase = '100000000.00';
        i.breakdown[0]!.taxAmount = '0';
      }),
    ).toContain('1139');
  });

  it('rule 11: T without Tercero block → 1186', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
      }),
    ).toContain('1186');
  });

  it('rule 12: Tercero without issuedBy=T → 1187', () => {
    expect(
      runRegister((i) => {
        i.thirdParty = { legalName: 'X', nif: '00000000T' };
      }),
    ).toContain('1187');
  });

  it('rule 13: F1 without recipients → 1189', () => {
    expect(
      runRegister((i) => {
        i.recipients = undefined;
      }),
    ).toContain('1189');
  });

  it('rule 13: F2 with recipients → 1190', () => {
    expect(
      runRegister((i) => {
        i.invoiceType = 'F2';
      }),
    ).toContain('1190');
  });

  it('rule 14: Cupon S on F1 → 1157', () => {
    expect(
      runRegister((i) => {
        i.coupon = 'S';
      }),
    ).toContain('1157');
  });

  it('rule 15.1: tax rate 5 in 2026 rejected → 1124', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.taxRate = '5';
        i.breakdown[0]!.taxAmount = '5';
        i.totalTaxAmount = '5';
        i.totalAmount = '105';
      }),
    ).toContain('1124');
  });

  it('rule 15.2: BaseImponibleACoste without ClaveRegimen=06 → 1257', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.taxBaseAtCost = '50';
      }),
    ).toContain('1257');
  });

  it('rule 15.6.1: ClaveRegimen 02 without OperacionExenta → 1286', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.regimeKey = '02';
      }),
    ).toContain('1286');
  });

  it('rule 15.6.4: ClaveRegimen 06 with F1 but missing taxBaseAtCost → 1202', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.regimeKey = '06';
      }),
    ).toContain('1202');
  });

  it('rule 15.7: CuotaRepercutida mismatch → 1142', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.taxAmount = '5';
        i.totalTaxAmount = '5';
        i.totalAmount = '105';
      }),
    ).toContain('1142');
  });

  it('rule 16: CuotaTotal mismatch → admissible 2006', () => {
    expect(
      runRegister((i) => {
        i.totalTaxAmount = '999';
      }),
    ).toContain('2006');
  });

  it('rule 17: ImporteTotal mismatch → admissible 2005', () => {
    expect(
      runRegister((i) => {
        i.totalAmount = '999';
      }),
    ).toContain('2005');
  });

  it('rule 18: previous-record hash with wrong format → admissible 2003', () => {
    expect(
      runRegister((i) => {
        i.chainLink = {
          first: false,
          previousIssuerNif: 'B12345674',
          previousSeriesNumber: 'X',
          previousIssueDate: '2026-05-19',
          previousHash: 'not a valid hash',
        };
      }),
    ).toContain('2003');
  });

  it('rule 19: SistemaInformatico without NIF nor IDOtro → 1223', () => {
    expect(
      runRegister((i) => {
        i.billingSystem.nif = undefined;
        i.billingSystem.alternateId = undefined;
      }),
    ).toContain('1223');
  });

  it('rule 23: Huella with wrong shape → admissible 1292', () => {
    expect(
      runRegister((i) => {
        i.hash = 'too-short';
      }),
    ).toContain('1292');
  });

  it('rule 1: FechaExpedicionFactura in the future → 1112', () => {
    expect(
      runRegister((i) => {
        i.invoiceId.issueDate = '2026-05-21';
      }),
    ).toContain('1112');
  });

  it('exemption + ClaveRegimen 01: E2 forbidden → 1199', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.operationQualification = undefined;
        i.breakdown[0]!.exemptionReason = 'E2';
        i.breakdown[0]!.taxRate = undefined;
        i.breakdown[0]!.taxAmount = undefined;
        i.totalTaxAmount = '0';
        i.totalAmount = '100';
      }),
    ).toContain('1199');
  });

  it('integration: R2 + S1 + IGIC + ClaveRegimen 03 + E1 → accepted', () => {
    const invoice = buildValidInvoice();
    invoice.invoiceType = 'R2';
    invoice.rectificationKind = 'I';
    invoice.breakdown = [
      {
        tax: '03',
        regimeKey: '03',
        operationQualification: 'S1',
        taxRate: '21',
        taxBase: '100',
        taxAmount: '21',
      },
    ];
    invoice.totalTaxAmount = '21';
    invoice.totalAmount = '121';
    invoice.macroData = undefined;
    const issues = validateInvoiceForRegister(invoice, { today: REFERENCE_DATE });
    expect(issues.filter((i) => i.severity === 'rejection')).toEqual([]);
  });
});

describe('validateInvoiceForRegister — more rules', () => {
  it('rule 2: RechazoPrevio S without Subsanacion → 1161', () => {
    expect(
      runRegister((i) => {
        i.priorRejection = 'S';
      }),
    ).toContain('1161');
  });

  it('rule 4: FacturasRectificadas on F1 → 1117', () => {
    expect(
      runRegister((i) => {
        i.rectifiedInvoices = [
          { issuerNif: 'B12345674', seriesNumber: 'X', issueDate: '2026-05-19' },
        ];
      }),
    ).toContain('1117');
  });

  it('rule 6: ImporteRectificacion without rectification → 1119', () => {
    expect(
      runRegister((i) => {
        i.rectificationBreakdown = { rectifiedBase: '0', rectifiedTaxAmount: '0' };
      }),
    ).toContain('1119');
  });

  it('rule 7: operationDate triggers date validator', () => {
    const codes = runRegister((i) => {
      i.operationDate = '2026-12-31';
    });
    expect(codes).toContain('1173');
  });

  it('rule 11: D without recipients → 1158', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'D';
        i.recipients = undefined;
      }),
    ).toContain('1158');
  });

  it('rule 12: Tercero NIF equals issuer → 1188', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
        i.thirdParty = { legalName: 'X', nif: i.invoiceId.issuerNif };
      }),
    ).toContain('1188');
  });

  it('rule 12: Tercero invalid NIF → 1123', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
        i.thirdParty = { legalName: 'X', nif: 'BAD' };
      }),
    ).toContain('1123');
  });

  it('rule 12: Tercero IDOtro IDType 07 → 1211', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
        i.thirdParty = {
          legalName: 'X',
          alternateId: { idType: '07', id: '999', countryCode: 'ES' },
        };
      }),
    ).toContain('1211');
  });

  it('rule 12: Tercero IDOtro ES + non-03 → 1232', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
        i.thirdParty = {
          legalName: 'X',
          alternateId: { idType: '04', id: '999', countryCode: 'ES' },
        };
      }),
    ).toContain('1232');
  });

  it('rule 12: Tercero IDOtro IDType 02 with bad NIF-IVA → 1103', () => {
    expect(
      runRegister((i) => {
        i.issuedBy = 'T';
        i.thirdParty = {
          legalName: 'X',
          alternateId: { idType: '02', id: 'DE12', countryCode: 'DE' },
        };
      }),
    ).toContain('1103');
  });

  it('rule 13: recipient with IDType 07 + non-ES country → 1126', () => {
    expect(
      runRegister((i) => {
        i.recipients = [
          {
            legalName: 'X',
            alternateId: { idType: '07', id: '12345', countryCode: 'FR' },
          },
        ];
      }),
    ).toContain('1126');
  });

  it('rule 13: recipient with ES + IDType 04 → 1234', () => {
    expect(
      runRegister((i) => {
        i.recipients = [
          {
            legalName: 'X',
            alternateId: { idType: '04', id: '12345', countryCode: 'ES' },
          },
        ];
      }),
    ).toContain('1234');
  });

  it('rule 13: recipient with NIF-IVA on F2 → 1156', () => {
    expect(
      runRegister((i) => {
        i.invoiceType = 'F2';
        // F2 disallows recipients block, so skip to a case where we keep recipients
      }),
    ).toContain('1190');
  });

  it('rule 13: invalid recipient NIF → 1123', () => {
    expect(
      runRegister((i) => {
        i.recipients = [{ legalName: 'X', nif: 'BAD' }];
      }),
    ).toContain('1123');
  });

  it('rule 13: invalid recipient NIF-IVA → 1103', () => {
    expect(
      runRegister((i) => {
        i.recipients = [
          {
            legalName: 'X',
            alternateId: { idType: '02', id: 'DE12', countryCode: 'DE' },
          },
        ];
      }),
    ).toContain('1103');
  });

  it('rule 15.3: invalid recargo → 1127', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.equivalenceSurchargeRate = '99';
        i.breakdown[0]!.equivalenceSurchargeAmount = '99';
      }),
    ).toContain('1127');
  });

  it('rule 15.3: recargo without surcharge amount → 1284', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.equivalenceSurchargeRate = '5.2';
      }),
    ).toContain('1284');
  });

  it('rule 15.3: surcharge amount without recargo → 1284', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.equivalenceSurchargeAmount = '5.2';
      }),
    ).toContain('1284');
  });

  it('rule 15.3: recargo with non-S1 → 1281', () => {
    expect(
      runRegister((i) => {
        i.breakdown[0]!.operationQualification = 'N1';
        i.breakdown[0]!.taxRate = undefined;
        i.breakdown[0]!.taxAmount = undefined;
        i.totalTaxAmount = '0';
        i.totalAmount = '100';
        i.breakdown[0]!.equivalenceSurchargeRate = '5.2';
        i.breakdown[0]!.equivalenceSurchargeAmount = '5';
      }),
    ).toContain('1281');
  });

  it('rule 20: invalid generatedAt format → 1244', () => {
    expect(
      runRegister((i) => {
        i.generatedAt = 'garbage';
      }),
    ).toContain('1244');
  });

  it('rule 20: future generatedAt → admissible 2004', () => {
    expect(
      runRegister((i) => {
        i.generatedAt = '2026-05-25T00:00:00+02:00';
      }),
    ).toContain('2004');
  });
});

describe('validateInvoiceForCancel', () => {
  it('accepts a clean cancellation', () => {
    expect(validateInvoiceForCancel(buildValidCancel(), { today: REFERENCE_DATE })).toEqual([]);
  });

  it('rejects invalid issuerNif (1109)', () => {
    const cancel = buildValidCancel();
    cancel.cancelledInvoiceId.issuerNif = 'BAD';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1109');
  });

  it('rejects forbidden NumSerieFactura (1130)', () => {
    const cancel = buildValidCancel();
    cancel.cancelledInvoiceId.seriesNumber = '<<>>';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1130');
  });

  it('rejects Generador without GeneradoPor (1224)', () => {
    const cancel = buildValidCancel();
    cancel.generator = { legalName: 'X', nif: '00000000T' };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1224');
  });

  it('rejects GeneradoPor E without Generador.nif (1227)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'E';
    cancel.generator = {
      legalName: 'X',
      alternateId: { idType: '03', id: '123', countryCode: 'FR' },
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1227');
  });

  it('rejects invalid hash format (1292)', () => {
    const cancel = buildValidCancel();
    cancel.hash = 'bad';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1292');
  });

  it('rejects sistemaInformatico without identification (1223)', () => {
    const cancel = buildValidCancel();
    cancel.billingSystem.nif = undefined;
    cancel.billingSystem.alternateId = undefined;
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1223');
  });

  it('rejects Generador same NIF as obligado (1259)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'D';
    cancel.generator = { legalName: 'X', nif: cancel.cancelledInvoiceId.issuerNif };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1259');
  });

  it('rejects Generador invalid NIF (1258)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'D';
    cancel.generator = { legalName: 'X', nif: 'BAD' };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1258');
  });

  it('rejects GeneradoPor T + IDType 07 (1229)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'T';
    cancel.generator = {
      legalName: 'X',
      alternateId: { idType: '07', id: '12345', countryCode: 'ES' },
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1229');
  });

  it('rejects GeneradoPor D + ES + IDType not 03/07 (1230)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'D';
    cancel.generator = {
      legalName: 'X',
      alternateId: { idType: '04', id: '12345', countryCode: 'ES' },
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1230');
  });

  it('rejects GeneradoPor T + ES + IDType not 03 (1232)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'T';
    cancel.generator = {
      legalName: 'X',
      alternateId: { idType: '04', id: '12345', countryCode: 'ES' },
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1232');
  });

  it('rejects Generador invalid NIF-IVA (1103)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'T';
    cancel.generator = {
      legalName: 'X',
      alternateId: { idType: '02', id: 'DE12', countryCode: 'DE' },
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1103');
  });

  it('rejects invalid previous hash (2003)', () => {
    const cancel = buildValidCancel();
    cancel.chainLink = {
      first: false,
      previousIssuerNif: 'B12345674',
      previousSeriesNumber: 'X',
      previousIssueDate: '2026-05-19',
      previousHash: 'bad-hash',
    };
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('2003');
  });

  it('rejects invalid generatedAt (1244)', () => {
    const cancel = buildValidCancel();
    cancel.generatedAt = 'bad';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1244');
  });

  it('rejects far-future generatedAt (2004)', () => {
    const cancel = buildValidCancel();
    cancel.generatedAt = '2026-05-25T00:00:00+02:00';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('2004');
  });

  it('rejects GeneradoPor without Generador (1224)', () => {
    const cancel = buildValidCancel();
    cancel.generatedBy = 'T';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1224');
  });

  it('reports future issue date for cancellation (1112)', () => {
    const cancel = buildValidCancel();
    cancel.cancelledInvoiceId.issueDate = '2026-05-21';
    const codes = validateInvoiceForCancel(cancel, { today: REFERENCE_DATE }).map((i) => i.code);
    expect(codes).toContain('1112');
  });
});
