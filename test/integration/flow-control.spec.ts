/**
 * Tests for the FlowController.
 *
 * Asserts that the controller honours TiempoEsperaEnvio between calls, splits
 * batches at the 1000-record limit, retries on retryable NetworkErrors, and
 * surfaces duplicate-record information back to the caller.
 */

import { describe, expect, it } from 'bun:test';
import { FlowController } from '../../src/client/flowControl.ts';
import { NetworkError } from '../../src/xml/errors.ts';

describe('FlowController.splitBatch', () => {
  it('splits a 2500-record array into 1000+1000+500', () => {
    const controller = new FlowController();
    const records = Array.from({ length: 2500 }, (_, i) => i);
    const chunks = controller.splitBatch(records);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(1000);
    expect(chunks[2]).toHaveLength(500);
  });

  it('returns an empty array for empty input', () => {
    const controller = new FlowController();
    expect(controller.splitBatch([])).toEqual([]);
  });

  it('respects a custom maxBatchSize', () => {
    const controller = new FlowController({ maxBatchSize: 3 });
    expect(controller.splitBatch([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });
});

describe('FlowController.enqueue', () => {
  it('waits the AEAT-mandated time between calls', async () => {
    let virtualTime = 0;
    const sleeps: number[] = [];
    const controller = new FlowController({
      initialWaitSeconds: 60,
      jitterMs: 0,
      now: () => virtualTime,
      sleep: async (ms) => {
        sleeps.push(ms);
        virtualTime += ms;
      },
    });

    const first = await controller.enqueue(async () => ({ waitSeconds: 30 }));
    const second = await controller.enqueue(async () => ({ waitSeconds: 45 }));
    const third = await controller.enqueue(async () => ({ waitSeconds: 10 }));

    expect(first.waitSeconds).toBe(30);
    expect(second.waitSeconds).toBe(45);
    expect(third.waitSeconds).toBe(10);
    expect(sleeps[0]).toBeGreaterThanOrEqual(30_000);
    expect(sleeps[1]).toBeGreaterThanOrEqual(45_000);
    expect(controller.currentWaitSeconds).toBe(10);
  });

  it('retries retryable NetworkErrors with exponential backoff', async () => {
    const sleeps: number[] = [];
    let virtualTime = 0;
    const controller = new FlowController({
      jitterMs: 0,
      initialWaitSeconds: 0,
      now: () => virtualTime,
      sleep: async (ms) => {
        sleeps.push(ms);
        virtualTime += ms;
      },
    });

    let attempt = 0;
    const result = await controller.enqueue(async () => {
      attempt += 1;
      if (attempt < 3) {
        throw new NetworkError('socket reset', { retryable: true });
      }
      return { waitSeconds: 60 };
    });

    expect(attempt).toBe(3);
    expect(result.waitSeconds).toBe(60);
    // backoff sleeps: 1000ms then 2000ms (2 retries before the final success).
    expect(sleeps).toContain(1000);
    expect(sleeps).toContain(2000);
  });

  it('propagates non-retryable errors immediately', async () => {
    const controller = new FlowController({
      jitterMs: 0,
      initialWaitSeconds: 0,
      sleep: async () => {},
    });
    let attempt = 0;
    await expect(
      controller.enqueue(async () => {
        attempt += 1;
        throw new NetworkError('bad request', { retryable: false });
      }),
    ).rejects.toThrow(NetworkError);
    expect(attempt).toBe(1);
  });

  it('gives up after maxRetries retryable failures', async () => {
    const controller = new FlowController({
      jitterMs: 0,
      maxRetries: 2,
      initialWaitSeconds: 0,
      sleep: async () => {},
    });
    let attempt = 0;
    await expect(
      controller.enqueue(async () => {
        attempt += 1;
        throw new NetworkError('keeps failing', { retryable: true });
      }),
    ).rejects.toThrow(NetworkError);
    expect(attempt).toBe(3); // 1 initial + 2 retries
  });

  it('serialises concurrent enqueues so they run one at a time', async () => {
    const log: string[] = [];
    const controller = new FlowController({
      jitterMs: 0,
      initialWaitSeconds: 0,
      sleep: async () => {},
    });

    const op = (label: string) => async () => {
      log.push(`start-${label}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      log.push(`end-${label}`);
      return { waitSeconds: 0 };
    };

    await Promise.all([
      controller.enqueue(op('a')),
      controller.enqueue(op('b')),
      controller.enqueue(op('c')),
    ]);

    expect(log).toEqual(['start-a', 'end-a', 'start-b', 'end-b', 'start-c', 'end-c']);
  });
});

describe('FlowController.handleDuplicate', () => {
  it('returns the duplicate request id when set', () => {
    const controller = new FlowController();
    expect(
      controller.handleDuplicate({ duplicateRecord: { requestId: '20260520123456000001' } }),
    ).toBe('20260520123456000001');
  });

  it('returns undefined for non-duplicate lines', () => {
    const controller = new FlowController();
    expect(controller.handleDuplicate({})).toBeUndefined();
  });
});
