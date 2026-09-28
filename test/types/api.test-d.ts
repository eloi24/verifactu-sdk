/**
 * Type-level assertions for the public API surface.
 *
 * Pins the shape of:
 *
 * - The `VerifactuClient` constructor parameters and its instance methods
 *   (`registerInvoice`, `cancelInvoice`, `queryInvoices`, `renderQr`).
 * - The public type aliases re-exported from the root entry point.
 * - The error hierarchy re-exported from the root entry point.
 *
 * Subpath exports (`verifactu-sdk/validators`, `verifactu-sdk/qr`,
 * `verifactu-sdk/hash`, `verifactu-sdk/errors`, `verifactu-sdk/schemas`) are
 * declared in `package.json#exports` and pinned by the smoke test against the
 * built `dist/` directory; tsd cannot resolve subpath exports against source
 * (only against the `types` field of the root module), so they live in the
 * smoke suite rather than here.
 *
 * `tsd` reads these `.test-d.ts` files and runs them through `tsc`; any failing
 * `expectType` / `expectError` annotation fails the CI step.
 */

import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { mysqlTable, text as mysqlText } from 'drizzle-orm/mysql-core';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { pgTable, text as pgText } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { expectAssignable, expectError, expectType } from 'tsd';
import type {
  AlternateIdentifier,
  BusinessValidationError,
  CancelInvoiceInput,
  CancelInvoiceRequest,
  ChainLink,
  Counterpart,
  DuplicateRecordState,
  Environment,
  ErrorCategory,
  FlowControlError,
  HashStore,
  Invoice,
  InvoiceId,
  InvoiceType,
  Mode,
  NetworkError,
  QueryFilter,
  QueryResultPage,
  Recipient,
  RegisterInvoiceInput,
  RegisterInvoiceRecordResult,
  RegisterInvoiceResponse,
  RenderQrInput,
  RenderedQr,
  SchemaValidationError,
  SoapFaultError,
  Taxpayer,
  VerifactuClient,
  VerifactuClientOptions,
  VerifactuError,
} from '../../src/index.js';
import {
  DrizzleMysqlHashStore,
  DrizzlePgHashStore,
  DrizzleSqliteHashStore,
} from '../../src/store/adapters/drizzle.js';

// ---------------------------------------------------------------------------
// Public type aliases — pinned shape
// ---------------------------------------------------------------------------

declare const invoiceType: InvoiceType;
expectAssignable<'F1' | 'F2' | 'F3' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5'>(invoiceType);

expectAssignable<InvoiceId>({
  issuerNif: 'B12345678',
  seriesNumber: 'A/2026/0001',
  issueDate: '2026-05-20',
});

expectAssignable<Counterpart>({
  legalName: 'Customer SL',
  nif: '12345678Z',
});

expectAssignable<Counterpart>({
  legalName: 'Foreign Customer',
  alternateId: { countryCode: 'DE', idType: '02', id: 'DE123456789' },
});

expectAssignable<AlternateIdentifier>({ idType: '02', id: 'X' });

expectAssignable<Taxpayer>({ nif: 'B12345678', legalName: 'Eloi Baulenas' });

declare const chainLink: ChainLink;
expectType<boolean>(chainLink.first);

// Recipient is an alias of Counterpart.
declare const recipient: Recipient;
expectAssignable<Counterpart>(recipient);

// Mode/Environment pinned shapes.
declare const mode: Mode;
expectAssignable<'verifactu' | 'onRequest'>(mode);
declare const env: Environment;
expectAssignable<'production' | 'preproduction'>(env);

// ---------------------------------------------------------------------------
// Public error classes — must be exported from the root entry
// ---------------------------------------------------------------------------

declare const schemaErr: SchemaValidationError;
declare const businessErr: BusinessValidationError;
declare const soapErr: SoapFaultError;
declare const networkErr: NetworkError;
declare const flowErr: FlowControlError;
declare const baseErr: VerifactuError;

expectAssignable<Error>(schemaErr);
expectAssignable<Error>(businessErr);
expectAssignable<Error>(soapErr);
expectAssignable<Error>(networkErr);
expectAssignable<Error>(flowErr);
expectAssignable<Error>(baseErr);

// Each subclass is assignable to the base VerifactuError.
expectAssignable<VerifactuError>(schemaErr);
expectAssignable<VerifactuError>(businessErr);
expectAssignable<VerifactuError>(soapErr);
expectAssignable<VerifactuError>(networkErr);
expectAssignable<VerifactuError>(flowErr);

// A SOAP fault carries the AEAT code and category alongside the raw fault.
expectType<string | undefined>(soapErr.code);
expectType<ErrorCategory | undefined>(soapErr.category);
expectType<string | undefined>(soapErr.faultcode);
expectType<string | undefined>(soapErr.faultstring);
expectType<string | undefined>(soapErr.detail);
expectType<boolean>(networkErr.retryable);

// ---------------------------------------------------------------------------
// VerifactuClient — constructor params and method signatures
// ---------------------------------------------------------------------------

declare const client: VerifactuClient;
declare const hashStore: HashStore;

// Constructor options carry the public type aliases.
expectAssignable<VerifactuClientOptions>({
  hashStore,
  environment: 'preproduction',
  mode: 'verifactu',
  certificate: { pfx: Buffer.from('dummy'), passphrase: 'dummy' },
  taxpayer: { nif: 'B12345678', legalName: 'Eloi Baulenas' },
  billingSystem: {
    producerName: 'Eloi Baulenas',
    nif: 'B12345678',
    systemName: 'Acme Verifactu SDK',
    systemId: 'AC',
    version: '0.1.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

// registerInvoice signature.
declare const invoice: Invoice;
expectType<Promise<RegisterInvoiceResponse>>(client.registerInvoice(invoice));

// A duplicate rejection exposes the stored record's state.
declare const recordResult: RegisterInvoiceRecordResult;
expectType<DuplicateRecordState | undefined>(recordResult.duplicateRecord?.state);

// The client fills billingSystem, chainLink and hash, so the input may omit them.
declare const invoiceInput: Omit<Invoice, 'billingSystem' | 'chainLink' | 'hash'>;
expectAssignable<RegisterInvoiceInput>(invoiceInput);
expectType<Promise<RegisterInvoiceResponse>>(client.registerInvoice(invoiceInput));

// cancelInvoice signature.
declare const cancellation: CancelInvoiceInput;
expectType<Promise<RegisterInvoiceResponse>>(client.cancelInvoice(cancellation));
declare const cancellationInput: Omit<CancelInvoiceInput, 'billingSystem' | 'chainLink' | 'hash'>;
expectAssignable<CancelInvoiceRequest>(cancellationInput);
expectType<Promise<RegisterInvoiceResponse>>(client.cancelInvoice(cancellationInput));

// registerBatch takes both kinds of record.
expectAssignable<AsyncIterable<RegisterInvoiceResponse>>(
  client.registerBatch([invoice, invoiceInput, cancellation, cancellationInput]),
);

// queryInvoices returns an async iterable of pages.
declare const filter: QueryFilter;
expectAssignable<AsyncIterable<QueryResultPage>>(client.queryInvoices(filter));

// renderQr signature.
declare const qrInput: RenderQrInput;
expectType<Promise<RenderedQr>>(client.renderQr(qrInput));
expectType<Promise<RenderedQr>>(client.renderQr(qrInput, { format: 'png' }));
expectType<Promise<RenderedQr>>(client.renderQr(qrInput, { format: 'svg', language: 'en' }));

// ---------------------------------------------------------------------------
// Drizzle HashStore adapters — a db built with a schema needs no cast
// ---------------------------------------------------------------------------

const pgChain = pgTable('verifactu_hash_chain', {
  nif: pgText('nif').primaryKey(),
  invoiceId: pgText('invoice_id').notNull(),
  hash: pgText('hash').notNull(),
});
const pgUsers = pgTable('users', { id: pgText('id').primaryKey() });
declare const pgDb: BunSQLDatabase<{ pgChain: typeof pgChain; pgUsers: typeof pgUsers }>;
declare const pgPlainDb: BunSQLDatabase;
expectAssignable<HashStore>(new DrizzlePgHashStore(pgDb, pgChain));
expectAssignable<HashStore>(new DrizzlePgHashStore(pgPlainDb, pgChain));

const mysqlChain = mysqlTable('verifactu_hash_chain', {
  nif: mysqlText('nif').primaryKey(),
  invoiceId: mysqlText('invoice_id').notNull(),
  hash: mysqlText('hash').notNull(),
});
declare const mysqlDb: MySql2Database<{ mysqlChain: typeof mysqlChain }>;
declare const mysqlPlainDb: MySql2Database;
expectAssignable<HashStore>(new DrizzleMysqlHashStore(mysqlDb, mysqlChain));
expectAssignable<HashStore>(new DrizzleMysqlHashStore(mysqlPlainDb, mysqlChain));

const sqliteChain = sqliteTable('verifactu_hash_chain', {
  nif: sqliteText('nif').primaryKey(),
  invoiceId: sqliteText('invoice_id').notNull(),
  hash: sqliteText('hash').notNull(),
});
declare const sqliteDb: BunSQLiteDatabase<{ sqliteChain: typeof sqliteChain }>;
declare const sqlitePlainDb: BunSQLiteDatabase;
expectAssignable<HashStore>(new DrizzleSqliteHashStore(sqliteDb, sqliteChain));
expectAssignable<HashStore>(new DrizzleSqliteHashStore(sqlitePlainDb, sqliteChain));

// ---------------------------------------------------------------------------
// Negative assertions
// ---------------------------------------------------------------------------

// InvoiceId requires all three fields; omitting `issueDate` must fail.
expectError<InvoiceId>({
  issuerNif: 'B12345678',
  seriesNumber: 'A/2026/0001',
});

// InvoiceType is a closed enum; arbitrary strings fail.
expectError<InvoiceType>('XX');

// VerifactuClient.queryInvoices does NOT accept a missing `year`.
expectError(client.queryInvoices({ period: '05' } as { period: string }));
