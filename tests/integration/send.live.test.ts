import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  LIVE_API_KEY,
  type LiveHarness,
  RUN_SENDS,
  TEST_RECIPIENT,
  expectToolOk,
  firstText,
  makeLiveHarness,
  uniqueName,
} from './setup.ts';

const sendsBlocked = !RUN_SENDS || !TEST_RECIPIENT;

describe.skipIf(!LIVE_API_KEY)('send + logs (live)', () => {
  let harness: LiveHarness;
  let templateId: string;
  let logId: string | undefined;

  beforeAll(async () => {
    harness = await makeLiveHarness();
    const tpl = (await expectToolOk(
      await harness.callTool('templates_create', {
        name: uniqueName('send-tpl'),
        subject: 'Hello {{name}}',
        html: '<!doctype html><html><head><title>Send</title></head><body><p>Hi {{name}} from mcp-it.</p></body></html>',
        text: 'Hi {{name}} from mcp-it.',
      }),
    )) as { id: string };
    templateId = tpl.id;
    harness.registerCleanup(`templates_delete ${templateId}`, async () => {
      await harness.callTool('templates_delete', { template_id: templateId });
    });
  });

  afterAll(async () => {
    if (!harness) return;
    await harness.runCleanups();
    await harness.disconnect();
  });

  test('render_template returns rendered content', async () => {
    const result = (await expectToolOk(
      await harness.callTool('render_template', {
        template_id: templateId,
        template_data: { name: 'Matt' },
      }),
    )) as { success?: boolean; html?: string; subject?: string };
    const hasContent =
      result.success === true ||
      typeof result.html === 'string' ||
      typeof result.subject === 'string';
    expect(hasContent).toBe(true);
  }, 30_000);

  test.skipIf(sendsBlocked)(
    'send_email delivers a live email',
    async () => {
      const result = (await expectToolOk(
        await harness.callTool('send_email', {
          template_id: templateId,
          recipient: { address: TEST_RECIPIENT!, name: 'MCP IT' },
          email_data: { name: 'Matt' },
          tags: ['mcp-it'],
        }),
      )) as { receipt_id?: string; success?: boolean };
      expect(result.success).toBe(true);
      expect(typeof result.receipt_id).toBe('string');
      logId = result.receipt_id;
    },
    60_000,
  );

  test.skipIf(sendsBlocked)(
    'resend_email reuses the captured log id',
    async () => {
      if (!logId) throw new Error('no log id captured from send_email');
      // SendLog can take 15s+ to be queryable after send.
      let lastResult: CallToolResult | undefined;
      for (let i = 0; i < 20; i++) {
        lastResult = (await harness.callTool('resend_email', {
          log_id: logId,
        })) as CallToolResult;
        if (!lastResult.isError) break;
        const text = firstText(lastResult);
        if (!text.includes('No SendLog')) break; // non-retryable error
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (lastResult?.isError) {
        throw new Error(`resend_email never succeeded: ${firstText(lastResult)}`);
      }
      const result = JSON.parse(firstText(lastResult!)) as { success?: boolean };
      expect(result.success === true || result.success === undefined).toBe(true);
    },
    90_000,
  );

  test.skipIf(sendsBlocked)(
    'logs_get retrieves the log (with backoff for indexing)',
    async () => {
      if (!logId) throw new Error('no log id captured');
      let lastResult: CallToolResult | undefined;
      for (let i = 0; i < 8; i++) {
        lastResult = (await harness.callTool('logs_get', { log_id: logId })) as CallToolResult;
        if (!lastResult.isError) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (lastResult?.isError) {
        throw new Error(`logs_get never succeeded: ${firstText(lastResult)}`);
      }
      expectToolOk(lastResult!);
    },
    60_000,
  );

  test.skipIf(sendsBlocked)(
    'logs_get_events retrieves events (with backoff)',
    async () => {
      if (!logId) throw new Error('no log id captured');
      let lastResult: CallToolResult | undefined;
      for (let i = 0; i < 8; i++) {
        lastResult = (await harness.callTool('logs_get_events', {
          log_id: logId,
        })) as CallToolResult;
        if (!lastResult.isError) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (lastResult?.isError) {
        throw new Error(`logs_get_events never succeeded: ${firstText(lastResult)}`);
      }
      expectToolOk(lastResult!);
    },
    60_000,
  );
});
