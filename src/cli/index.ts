/**
 * Barrel module re-exporting the programmatic surface of the verifactu CLI.
 *
 * Consumers that want to embed the CLI in another program — for example a
 * test harness or a desktop wrapper — import `createProgram` from
 * `'verifactu-sdk/cli'` and call `program.parseAsync(argv)` themselves.
 *
 * @module
 */

export { createProgram } from './bin.js';
export { registerQrCommand } from './commands/qr.js';
export { registerQueryCommand } from './commands/query.js';
export { registerSendCommand } from './commands/send.js';
export { registerValidateCommand } from './commands/validate.js';
