import { describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { SendwithusClient } from '../../src/client/sendwithus-client.ts';
import { createServer } from '../../src/server.ts';
import { type MockResponse, createMockFetcher } from '../helpers/mock-fetcher.ts';

async function makeHarness(
  routes: Record<string, MockResponse | ((call: unknown) => MockResponse)>,
) {
  const mock = createMockFetcher(routes as never);
  const swuClient = new SendwithusClient({ apiKey: 'k', fetcher: mock.fetcher });
  const server = createServer(swuClient);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server, mockCalls: mock.calls };
}

function extractText(result: { content?: Array<{ type: string; text?: string }> }): string {
  const part = result.content?.[0];
  if (!part || part.type !== 'text') throw new Error('no text content');
  return part.text ?? '';
}

describe('tool registration and dispatch', () => {
  test('all expected tools are listed', async () => {
    const harness = await makeHarness({});
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();

    // Spot-check coverage across each module.
    const expected = [
      'batch_execute',
      'customers_delete',
      'customers_get',
      'customers_get_logs',
      'customers_upsert',
      'drip_campaigns_activate',
      'drip_campaigns_deactivate',
      'drip_campaigns_deactivate_all',
      'drip_campaigns_get',
      'drip_campaigns_list',
      'i18n_po_upload',
      'i18n_pot_download',
      'logs_get',
      'logs_get_events',
      'render_template',
      'resend_email',
      'send_email',
      'snippets_create',
      'snippets_delete',
      'snippets_get',
      'snippets_list',
      'snippets_update',
      'template_versions_create',
      'template_versions_get',
      'template_versions_list',
      'template_versions_update',
      'templates_add_locale',
      'templates_create',
      'templates_delete',
      'templates_delete_locale',
      'templates_get',
      'templates_get_locale',
      'templates_list',
      'templates_update',
      'templates_update_locale',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
    expect(tools.length).toBe(expected.length);
  });

  test('templates_list returns parsed items via structuredContent', async () => {
    const harness = await makeHarness({
      'GET /api/v1/templates': {
        body: [
          { id: 't_1', name: 'Welcome' },
          { id: 't_2', name: 'Confirm' },
        ],
      },
    });
    const result = (await harness.client.callTool({
      name: 'templates_list',
      arguments: {},
    })) as { isError?: boolean; structuredContent?: { items: Array<{ id: string }> } };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent?.items.map((t) => t.id)).toEqual(['t_1', 't_2']);
  });

  test('send_email forwards template_id as template and includes attachments', async () => {
    let receivedBody: unknown;
    const harness = await makeHarness({
      'POST /api/v1/send': (call: unknown) => {
        receivedBody = JSON.parse((call as { body: string }).body);
        return { body: { success: true, status: 'OK', receipt_id: 'r_1' } };
      },
    });
    const result = (await harness.client.callTool({
      name: 'send_email',
      arguments: {
        template_id: 'tpl_abc',
        recipient: { address: 'a@b.com', name: 'A' },
        email_data: { greeting: 'hi' },
        attachments: [{ id: 'invoice.pdf', data: 'YmFzZTY0' }],
        esp_account: 'esp_123',
      },
    })) as { isError?: boolean; structuredContent?: { receipt_id: string } };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent?.receipt_id).toBe('r_1');

    const body = receivedBody as Record<string, unknown>;
    expect(body.template).toBe('tpl_abc');
    expect((body.recipient as { address: string }).address).toBe('a@b.com');
    expect(body.esp_account).toBe('esp_123');
    expect((body.attachments as Array<{ id: string }>)[0]?.id).toBe('invoice.pdf');
  });

  test('render_template parses wrapped response', async () => {
    const harness = await makeHarness({
      'POST /api/v1/render': {
        body: {
          success: true,
          status: 'OK',
          template: { id: 'tpl_1', name: 'Welcome' },
          subject: 'Hi',
          html: '<p>Hi</p>',
        },
      },
    });
    const result = (await harness.client.callTool({
      name: 'render_template',
      arguments: { template_id: 'tpl_1', template_data: { name: 'Matt' } },
    })) as { isError?: boolean; structuredContent?: { html?: string; subject?: string } };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent?.html).toBe('<p>Hi</p>');
    expect(result.structuredContent?.subject).toBe('Hi');
  });

  test('customers_upsert posts body and parses ack', async () => {
    let received: unknown;
    const harness = await makeHarness({
      'POST /api/v1/customers': (call: unknown) => {
        received = JSON.parse((call as { body: string }).body);
        return { body: { success: true, status: 'OK' } };
      },
    });
    const result = (await harness.client.callTool({
      name: 'customers_upsert',
      arguments: {
        email: 'matt@example.com',
        locale: 'en-US',
        data: { plan: 'pro' },
      },
    })) as { isError?: boolean; structuredContent?: { success: boolean } };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent?.success).toBe(true);

    const body = received as Record<string, unknown>;
    expect(body.email).toBe('matt@example.com');
    expect(body.locale).toBe('en-US');
    expect((body.data as { plan: string }).plan).toBe('pro');
  });

  test('schema validation failure surfaces as tool error', async () => {
    const harness = await makeHarness({
      'POST /api/v1/render': { body: { not: 'a render response' } },
    });
    const result = (await harness.client.callTool({
      name: 'render_template',
      arguments: { template_id: 'tpl_1' },
    })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('schema validation failed');
  });

  test('API error surfaces as tool error with details', async () => {
    const harness = await makeHarness({
      'GET /api/v1/templates/missing': {
        status: 404,
        statusText: 'Not Found',
        body: { error: 'no such template' },
      },
    });
    const result = (await harness.client.callTool({
      name: 'templates_get',
      arguments: { template_id: 'missing' },
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('404');
    expect(result.content[0]?.text).toContain('no such template');
  });

  test('input validation rejects bad arguments', async () => {
    const harness = await makeHarness({});
    let rejected = false;
    let errorResult: { isError?: boolean; content?: Array<{ text?: string }> } | undefined;
    try {
      errorResult = (await harness.client.callTool({
        name: 'customers_get',
        arguments: { email: 'not-an-email' },
      })) as never;
    } catch {
      rejected = true;
    }
    expect(rejected || errorResult?.isError === true).toBe(true);
    if (errorResult?.isError) {
      expect(errorResult.content?.[0]?.text ?? '').toMatch(/email|invalid/i);
    }
  });

  test('i18n_pot_download returns raw .pot text under structuredContent.text', async () => {
    const harness = await makeHarness({
      'GET /api/v1/i18n/pot/welcome': {
        body: 'msgid "Hello"\nmsgstr ""\n',
        contentType: 'text/plain',
      },
    });
    const result = (await harness.client.callTool({
      name: 'i18n_pot_download',
      arguments: { tag: 'welcome' },
    })) as { structuredContent?: { text?: string } };
    expect(result.structuredContent?.text).toContain('msgid "Hello"');
  });
});
