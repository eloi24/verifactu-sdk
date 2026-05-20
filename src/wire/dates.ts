/**
 * Date helpers shared by the wire transformers.
 *
 * The AEAT uses `DD-MM-YYYY` everywhere; the public API uses ISO `YYYY-MM-DD`.
 * These helpers convert between the two without going through `Date` (which
 * would risk timezone-induced off-by-one errors).
 *
 * @module
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const WIRE_DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/u;

/**
 * Convert an ISO `YYYY-MM-DD` date into the AEAT `DD-MM-YYYY` wire form.
 *
 * @param iso - ISO date string. Must match `/^\d{4}-\d{2}-\d{2}$/`.
 * @throws {Error} If {@link iso} does not match the ISO pattern.
 */
export function isoDateToWireDate(iso: string): string {
  const match = ISO_DATE_RE.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: '${iso}'. Expected YYYY-MM-DD.`);
  }
  const year = match[1];
  const month = match[2];
  const day = match[3];
  return `${day}-${month}-${year}`;
}

/**
 * Convert an AEAT `DD-MM-YYYY` wire date back into the ISO `YYYY-MM-DD` form.
 *
 * @param wire - Wire date string. Must match `/^\d{2}-\d{2}-\d{4}$/`.
 * @throws {Error} If {@link wire} does not match the wire pattern.
 */
export function wireDateToIsoDate(wire: string): string {
  const match = WIRE_DATE_RE.exec(wire);
  if (!match) {
    throw new Error(`Invalid wire date: '${wire}'. Expected DD-MM-YYYY.`);
  }
  const day = match[1];
  const month = match[2];
  const year = match[3];
  return `${year}-${month}-${day}`;
}
