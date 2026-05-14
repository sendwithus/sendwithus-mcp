import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  LIVE_API_KEY,
  type LiveHarness,
  expectToolOk,
  makeLiveHarness,
  uniqueName,
} from './setup.ts';

describe.skipIf(!LIVE_API_KEY)('snippets (live)', () => {
  let harness: LiveHarness;
  let snippetId: string;

  beforeAll(async () => {
    harness = await makeLiveHarness();
  });

  afterAll(async () => {
    if (!harness) return;
    await harness.runCleanups();
    await harness.disconnect();
  });

  test('snippets_create', async () => {
    const created = (await expectToolOk(
      await harness.callTool('snippets_create', {
        name: uniqueName('snippet'),
        body: '<p>Snippet body</p>',
      }),
    )) as { snippet?: { id?: string }; id?: string };
    // Sendwithus wraps the snippet create response: { success, status, snippet: { id, ... } }
    const id = created.snippet?.id ?? created.id;
    expect(typeof id).toBe('string');
    snippetId = id!;
    harness.registerCleanup(`snippets_delete ${snippetId}`, async () => {
      await harness.callTool('snippets_delete', { snippet_id: snippetId });
    });
  }, 30_000);

  test('snippets_list includes our snippet', async () => {
    const { items } = (await expectToolOk(await harness.callTool('snippets_list'))) as {
      items: Array<{ id: string }>;
    };
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((s) => s.id === snippetId)).toBe(true);
  }, 30_000);

  test('snippets_get', async () => {
    const got = (await expectToolOk(
      await harness.callTool('snippets_get', { snippet_id: snippetId }),
    )) as { id: string };
    expect(got.id).toBe(snippetId);
  }, 30_000);

  test('snippets_update', async () => {
    await expectToolOk(
      await harness.callTool('snippets_update', {
        snippet_id: snippetId,
        name: uniqueName('snippet-renamed'),
        body: '<p>Updated snippet body</p>',
      }),
    );
  }, 30_000);

  test('snippets_delete (verified by cleanup)', async () => {
    const { items } = (await expectToolOk(await harness.callTool('snippets_list'))) as {
      items: Array<{ id: string }>;
    };
    expect(items.some((s) => s.id === snippetId)).toBe(true);
  }, 30_000);
});
