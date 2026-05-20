/**
 * Console-output helpers shared by the verifactu CLI commands.
 *
 * Kept dependency-free: every escape sequence is hand-written using ANSI
 * codes. The helpers prefer `console.error` for diagnostics (so `1> output`
 * keeps the data stream clean) and `console.log` for the command's payload.
 *
 * @module
 */

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

/**
 * Apply an ANSI colour code to a string and append the reset sequence.
 *
 * @param code - SGR parameter (e.g. `'31'` for red, `'1;32'` for bright green).
 * @param value - Text to wrap.
 */
function paint(code: string, value: string): string {
  return `${ESC}${code}m${value}${RESET}`;
}

/**
 * Bright-red text used for error banners.
 *
 * @param value - The message to colourise.
 */
export function red(value: string): string {
  return paint('1;31', value);
}

/**
 * Bright-green text used for success banners.
 *
 * @param value - The message to colourise.
 */
export function green(value: string): string {
  return paint('1;32', value);
}

/**
 * Bright-yellow text used for warnings.
 *
 * @param value - The message to colourise.
 */
export function yellow(value: string): string {
  return paint('1;33', value);
}

/**
 * Dim/grey text used for incidental hints (paths, durations, …).
 *
 * @param value - The message to colourise.
 */
export function dim(value: string): string {
  return paint('2', value);
}

/**
 * Indent every line of a multi-line string by `width` spaces.
 *
 * @param value - The text to indent.
 * @param width - Number of leading spaces per line (default `2`).
 */
export function indent(value: string, width = 2): string {
  const padding = ' '.repeat(width);
  return value
    .split('\n')
    .map((line) => `${padding}${line}`)
    .join('\n');
}

/**
 * Print a coloured banner to `stderr` summarising a fatal error and the field
 * that triggered it, when known.
 *
 * @param title - Top-line headline (e.g. `'Validation failed'`).
 * @param error - Either an `Error` or a free-form string.
 */
export function errorBanner(title: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(red(`✖ ${title}`));
  console.error(indent(detail));
}

/**
 * Print a green success banner to `stderr` (so command payloads can still be
 * piped out of `stdout` cleanly).
 *
 * @param message - The success message.
 */
export function successBanner(message: string): void {
  console.error(green(`✔ ${message}`));
}
