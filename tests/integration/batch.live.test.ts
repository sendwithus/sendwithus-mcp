import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { LIVE_API_KEY, type LiveHarness, expectToolOk, makeLiveHarness } from './setup.ts';

describe.skipIf(!LIVE_API_KEY)('batch (live)', () => {
  let harness: LiveHarness;

  beforeAll(async () => {
    harness = await makeLiveHarness();
  });

  afterAll(async () => {
    if (!harness) return;
    await harness.disconnect();
  });

  test('batch_execute runs two GET operations', async () => {
    const { items } = (await expectToolOk(
      await harness.callTool('batch_execute', {
        operations: [
          { path: '/templates', method: 'GET' },
          { path: '/snippets', method: 'GET' },
        ],
      }),
    )) as { items: unknown[] };
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2);
  }, 30_000);
});
