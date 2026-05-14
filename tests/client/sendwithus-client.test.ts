import { describe, expect, test } from 'bun:test';
import { SendwithusApiError } from '../../src/client/errors.ts';
import { SendwithusClient } from '../../src/client/sendwithus-client.ts';
import { createMockFetcher } from '../helpers/mock-fetcher.ts';

const TEST_KEY = 'test_api_key_123';
const EXPECTED_AUTH = `Basic ${Buffer.from(`${TEST_KEY}:`).toString('base64')}`;

describe('SendwithusClient', () => {
  test('rejects empty apiKey', () => {
    expect(() => new SendwithusClient({ apiKey: '' })).toThrow();
  });

  test('GET /templates uses basic auth header', async () => {
    const mock = createMockFetcher({
      'GET /api/v1/templates': { body: [{ id: 't_1', name: 'Welcome' }] },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });
    const result = await client.listTemplates();

    expect(result).toEqual([{ id: 't_1', name: 'Welcome' }]);
    expect(mock.calls).toHaveLength(1);
    const [call] = mock.calls;
    expect(call?.method).toBe('GET');
    expect(call?.headers.authorization).toBe(EXPECTED_AUTH);
    expect(call?.headers.accept).toBe('application/json');
    // GET should not set Content-Type
    expect(call?.headers['content-type']).toBeUndefined();
    expect(call?.body).toBeUndefined();
  });

  test('POST /send serializes body and sets content-type', async () => {
    const mock = createMockFetcher({
      'POST /api/v1/send': { body: { success: true, status: 'OK', receipt_id: 'r_1' } },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });

    await client.sendEmail({
      template: 'tpl_1',
      recipient: { address: 'user@example.com' },
      email_data: { name: 'Matt' },
    });

    const [call] = mock.calls;
    expect(call?.method).toBe('POST');
    expect(call?.headers['content-type']).toBe('application/json');
    const parsed = JSON.parse(call?.body ?? '{}');
    expect(parsed.template).toBe('tpl_1');
    expect(parsed.recipient.address).toBe('user@example.com');
    expect(parsed.email_data.name).toBe('Matt');
  });

  test('non-2xx response throws SendwithusApiError with parsed body', async () => {
    const mock = createMockFetcher({
      'GET /api/v1/templates/nope': {
        status: 404,
        statusText: 'Not Found',
        body: { error: 'template not found' },
      },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });

    await expect(client.getTemplate('nope')).rejects.toBeInstanceOf(SendwithusApiError);
    try {
      await client.getTemplate('nope');
    } catch (err) {
      const e = err as SendwithusApiError;
      expect(e.status).toBe(404);
      expect(e.body).toEqual({ error: 'template not found' });
      expect(e.toToolErrorText()).toContain('404');
      expect(e.toToolErrorText()).toContain('template not found');
    }
  });

  test('customer logs query string is appended', async () => {
    const mock = createMockFetcher({
      'GET /api/v1/customers/user%40example.com/logs?count=5&created_gt=1000': {
        body: { logs: [] },
      },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });
    await client.getCustomerLogs('user@example.com', { count: 5, created_gt: 1000 });
    expect(mock.calls[0]?.url).toContain('count=5');
    expect(mock.calls[0]?.url).toContain('created_gt=1000');
  });

  test('path segments are URL-encoded', async () => {
    const mock = createMockFetcher({
      'GET /api/v1/templates/abc%2F123': { body: {} },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });
    await client.getTemplate('abc/123');
    expect(mock.calls[0]?.url).toContain('/templates/abc%2F123');
  });

  test('respects custom baseUrl', async () => {
    const mock = createMockFetcher({
      'GET /custom/templates': { body: [] },
    });
    const client = new SendwithusClient({
      apiKey: TEST_KEY,
      baseUrl: 'https://staging.example.com/custom/',
      fetcher: mock.fetcher,
    });
    await client.listTemplates();
    expect(mock.calls[0]?.url).toBe('https://staging.example.com/custom/templates');
  });

  test('downloadPot returns raw text', async () => {
    const mock = createMockFetcher({
      'GET /api/v1/i18n/pot/welcome': {
        body: 'msgid "Hello"\nmsgstr ""\n',
        contentType: 'text/plain',
      },
    });
    const client = new SendwithusClient({ apiKey: TEST_KEY, fetcher: mock.fetcher });
    const pot = await client.downloadPot('welcome');
    expect(pot).toContain('msgid "Hello"');
  });
});
