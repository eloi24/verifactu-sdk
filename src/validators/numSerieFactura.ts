/**
 * Validator for the `NumSerieFactura` field.
 *
 * Per §3.1.3 rule 1 of the AEAT validations document (v1.2.2), `NumSerieFactura`
 * accepts every printable ASCII character (codes 32–126) **except** the five
 * specifically reserved by the AEAT:
 *
 * - `"` (ASCII 34) — double quote.
 * - `'` (ASCII 39) — apostrophe.
 * - `<` (ASCII 60) — less-than.
 * - `=` (ASCII 61) — equals.
 * - `>` (ASCII 62) — greater-than.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf | Validations & errors §3.1.3 rule 1}
 * @module
 */

/** ASCII codes the AEAT explicitly forbids in `NumSerieFactura`. */
const FORBIDDEN_CODES: ReadonlySet<number> = new Set([34, 39, 60, 61, 62]);

/**
 * Check whether a `NumSerieFactura` value passes the AEAT character set.
 *
 * @param value - The series + number string from the invoice id.
 * @returns `true` when every character is printable ASCII (32–126) and not in
 *   the forbidden set; `false` otherwise.
 * @example
 * ```ts
 * isValidNumSerieFactura('SF-2026/0001'); // true
 * isValidNumSerieFactura('SF<2026>');      // false
 * ```
 */
export function isValidNumSerieFactura(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code > 126) return false;
    if (FORBIDDEN_CODES.has(code)) return false;
  }
  return true;
}

/**
 * Find the first forbidden character in a `NumSerieFactura` value.
 *
 * Useful when generating a precise rejection message.
 *
 * @param value - The series + number string from the invoice id.
 * @returns The first offending character, or `undefined` when the value is
 *   valid.
 */
export function findForbiddenNumSerieChar(value: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code > 126 || FORBIDDEN_CODES.has(code)) {
      return value.charAt(i);
    }
  }
  return undefined;
}
