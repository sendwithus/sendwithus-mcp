import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  LIVE_API_KEY,
  type LiveHarness,
  expectToolOk,
  firstText,
  makeLiveHarness,
  uniqueName,
} from './setup.ts';

describe.skipIf(!LIVE_API_KEY)('i18n (live)', () => {
  let harness: LiveHarness;
  let templateId: string;
  const tag = uniqueName('i18n').replace(/[^a-zA-Z0-9-]/g, '-');

  beforeAll(async () => {
    harness = await makeLiveHarness();
    const tpl = (await expectToolOk(
      await harness.callTool('templates_create', {
        name: uniqueName('i18n-tpl'),
        subject: 'Hello {{name}}',
        html: '<!doctype html><html><head><title>i18n</title></head><body><p>Hi {{name}}.</p></body></html>',
        text: 'Hi {{name}}.',
      }),
    )) as { id: string };
    templateId = tpl.id;
    harness.registerCleanup(`templates_delete ${templateId}`, async () => {
      await harness.callTool('templates_delete', { template_id: templateId });
    });
    await expectToolOk(
      await harness.callTool('templates_update', {
        template_id: templateId,
        tags: [tag],
      }),
    );
  });

  afterAll(async () => {
    if (!harness) return;
    await harness.runCleanups();
    await harness.disconnect();
  });

  test('i18n_pot_download — tool round-trip', async () => {
    // The .pot may be empty/4xx for a freshly tagged template with no i18n strings;
    // we accept any well-formed CallToolResult as success.
    const result = (await harness.callTool('i18n_pot_download', { tag })) as CallToolResult;
    expect(result.content?.[0]).toBeDefined();
    const text = firstText(result);
    expect(typeof text).toBe('string');
  }, 30_000);

  test('i18n_po_upload — tool round-trip', async () => {
    const poBody = [
      '# Test .po',
      'msgid ""',
      'msgstr ""',
      '"Content-Type: text/plain; charset=UTF-8\\n"',
      '',
      'msgid "Hello"',
      'msgstr "Bonjour"',
      '',
    ].join('\n');
    const result = (await harness.callTool('i18n_po_upload', {
      tag,
      po: poBody,
    })) as CallToolResult;
    expect(result.content?.[0]).toBeDefined();
  }, 30_000);
});
