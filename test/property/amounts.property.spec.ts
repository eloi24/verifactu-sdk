/**
 * Property-based tests for the amount validators.
 *
 * Each generated case picks random `(taxBase, taxRate)` pairs, computes the
 * exact arithmetic result, and asserts that `validateCuotaRepercutida` accepts
 * the line when `taxAmount` is set to that exact result. Random perturbations
 * within the ±10€ tolerance are also accepted; perturbations larger than the
 * tolerance must be flagged.
 *
 * The breakdown shape passed in mirrors the structure consumed by the
 * validator (taxBase, taxRate, taxAmount, regimeKey).
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3 rule 15.7}
 */

import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import {
  AMOUNT_TOLERANCE_EUR,
  type AmountBreakdownLine,
  validateCuotaRepercutida,
} from '../../src/validators/amounts.ts';

/**
 * Format a number as the SDK's two-decimal string form.
 *
 * @param value - Arbitrary finite number.
 * @returns Fixed-point string with two decimal digits.
 */
function fmt(value: number): string {
  return value.toFixed(2);
}

// Use integer-cent arbitraries so the toFixed(2) string is lossless. The
// validator round-trips taxBase/taxRate through Number.parseFloat, so any
// finer precision than two decimals introduces formatting drift that the
// property cannot control for.
const baseArb = fc.integer({ min: -100_000_000, max: 100_000_000 }).map((cents) => cents / 100);
const rateArb = fc.integer({ min: 0, max: 21_00 }).map((basisPoints) => basisPoints / 100);

describe('property: validateCuotaRepercutida — exact arithmetic acceptance', () => {
  test('accepts the exact base × rate / 100 result for every random pair', () => {
    fc.assert(
      fc.property(baseArb, rateArb, (base, rate) => {
        const expected = (base * rate) / 100;
        const line: AmountBreakdownLine = {
          taxBase: fmt(base),
          taxRate: fmt(rate),
          taxAmount: fmt(expected),
          regimeKey: '01',
        };
        const issues = validateCuotaRepercutida({
          breakdown: [line],
          invoiceType: 'F1',
        });
        return issues.length === 0;
      }),
      { numRuns: 200 },
    );
  });

  test('accepts perturbations within half of the tolerance window', () => {
    // Use a delta strictly less than the tolerance so that the inevitable
    // formatting drift introduced by toFixed(2) on both sides still keeps
    // |cuota - base×rate/100| ≤ AMOUNT_TOLERANCE_EUR.
    const safeWindow = AMOUNT_TOLERANCE_EUR / 2;
    fc.assert(
      fc.property(
        baseArb,
        rateArb,
        fc.integer({ min: -safeWindow * 100, max: safeWindow * 100 }).map((c) => c / 100),
        (base, rate, delta) => {
          const expected = (base * rate) / 100;
          const line: AmountBreakdownLine = {
            taxBase: fmt(base),
            taxRate: fmt(rate),
            taxAmount: fmt(expected + delta),
            regimeKey: '01',
          };
          const issues = validateCuotaRepercutida({
            breakdown: [line],
            invoiceType: 'F1',
          });
          // Sign-mismatch issues may still appear for negative deltas that
          // flip the cuota sign — only assert the cuota=base×rate/100 check.
          return issues.every((i) => i.code !== '1142' && i.code !== '1144');
        },
      ),
      { numRuns: 200 },
    );
  });

  test('rejects deltas larger than the tolerance', () => {
    fc.assert(
      fc.property(
        // Use a non-zero base × rate so the expected amount is well-defined and
        // a 100€ delta clearly violates the ±10€ rule.
        fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 21, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(-100, 100, -500, 500),
        (base, rate, delta) => {
          const expected = (base * rate) / 100;
          const line: AmountBreakdownLine = {
            taxBase: fmt(base),
            taxRate: fmt(rate),
            taxAmount: fmt(expected + delta),
            regimeKey: '01',
          };
          const issues = validateCuotaRepercutida({
            breakdown: [line],
            invoiceType: 'F1',
          });
          return issues.some((i) => i.code === '1142');
        },
      ),
      { numRuns: 100 },
    );
  });
});
