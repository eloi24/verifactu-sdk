/**
 * Barrel for the SOAP/transport layer of the SDK.
 *
 * Re-exports the endpoint table, the {@link SoapClient} wrapper and the
 * {@link FlowController}. Higher-level orchestration (the user-facing
 * `VerifactuClient`) composes on top of these primitives.
 *
 * @module
 */

export * from './endpoints.js';
export * from './flowControl.js';
export * from './soap.js';
export * from './VerifactuClient.js';
