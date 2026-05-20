/**
 * Fixture builders shared by schema and wire round-trip tests.
 *
 * Each builder returns a fresh deep-cloned object so tests can mutate
 * portions without leaking state between cases.
 */

import type { CancelInvoiceInput, Invoice } from '../../../src/types.ts';

const HUELLA = 'A'.repeat(64);

/**
 * Minimal valid {@link Invoice} — first record in the chain, single recipient,
 * one breakdown line, VAT 21 %.
 */
export function buildInvoice(): Invoice {
  return {
    invoiceId: {
      issuerNif: 'B12345678',
      seriesNumber: 'A/2026/0001',
      issueDate: '2026-05-20',
    },
    issuerName: 'Acme Software SL',
    invoiceType: 'F1',
    description: 'Consulting services for Customer SL',
    recipients: [{ legalName: 'Customer SL', nif: '12345678Z' }],
    breakdown: [
      {
        tax: '01',
        regimeKey: '01',
        operationQualification: 'S1',
        taxRate: '21',
        taxBase: '100.00',
        taxAmount: '21.00',
      },
    ],
    totalTaxAmount: '21.00',
    totalAmount: '121.00',
    billingSystem: {
      producerName: 'Acme Software SL',
      nif: 'B12345678',
      systemName: 'Acme Verifactu SDK',
      systemId: 'AC',
      version: '0.1.0',
      installationNumber: '0001',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
      hasMultipleTaxpayers: 'N',
    },
    generatedAt: '2026-05-20T12:34:56+02:00',
    chainLink: { first: true },
    hash: HUELLA,
  };
}

/**
 * Minimal valid {@link CancelInvoiceInput} — first record in the chain, no
 * explicit generator.
 */
export function buildCancelInvoice(): CancelInvoiceInput {
  return {
    cancelledInvoiceId: {
      issuerNif: 'B12345678',
      seriesNumber: 'A/2026/0001',
      issueDate: '2026-05-20',
    },
    chainLink: { first: true },
    billingSystem: {
      producerName: 'Acme Software SL',
      nif: 'B12345678',
      systemName: 'Acme Verifactu SDK',
      systemId: 'AC',
      version: '0.1.0',
      installationNumber: '0001',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
      hasMultipleTaxpayers: 'N',
    },
    generatedAt: '2026-05-20T12:35:00+02:00',
    hash: HUELLA,
  };
}
