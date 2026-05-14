import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SendwithusClient } from '../../src/client/sendwithus-client.ts';
import { createServer } from '../../src/server.ts';

export const LIVE_API_KEY = process.env.SENDWITHUS_API_KEY?.trim() || undefined;
export const TEST_RECIPIENT = process.env.SENDWITHUS_TEST_RECIPIENT?.trim() || undefined;
export const RUN_SENDS = (() => {
  const raw = process.env.SENDWITHUS_RUN_SENDS?.toLowerCase().trim();
  return raw === '1' || raw === 'true' || raw === 'yes';
})();
export const BASE_URL = process.env.SENDWITHUS_BASE_URL?.trim() || undefined;

const randSegment = Math.random().toString(36).slice(2, 8);
export const RUN_ID = `mcp-it-${Date.now()}-${randSegment}`;

export function uniqueName(suffix: string): string {
  return `${RUN_ID}-${suffix}`;
}

export interface LiveHarness {
  mcp: Client;
  swu: SendwithusClient;
  registerCleanup: (label: string, fn: () => Promise<unknown> | unknown) => void;
  runCleanups: () => Promise<void>;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResult>;
  disconnect: () => Promise<void>;
}

export async function makeLiveHarness(): Promise<LiveHarness> {
  if (!LIVE_API_KEY) throw new Error('makeLiveHarness called without SENDWITHUS_API_KEY');
  const swu = new SendwithusClient({ apiKey: LIVE_API_KEY, baseUrl: BASE_URL });
  const server = createServer(swu);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'sendwithus-mcp-it', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), mcp.connect(clientTransport)]);

  const cleanups: Array<{ label: string; fn: () => Promise<unknown> | unknown }> = [];

  return {
    mcp,
    swu,
    registerCleanup(label, fn) {
      cleanups.push({ label, fn });
    },
    async runCleanups() {
      while (cleanups.length) {
        const { label, fn } = cleanups.pop()!;
        try {
          await fn();
        } catch (err) {
          console.error(`[integration cleanup] failed: ${label}:`, err);
        }
      }
    },
    async callTool(name, args) {
      return (await mcp.callTool({ name, arguments: args ?? {} })) as CallToolResult;
    },
    async disconnect() {
      await mcp.close();
      await server.close();
    },
  };
}

export function expectToolOk(result: CallToolResult): unknown {
  if (result.isError) {
    const text = firstText(result);
    throw new Error(`Tool call returned isError: ${text}`);
  }
  return parseJsonContent(result);
}

export function firstText(result: CallToolResult): string {
  const part = result.content?.[0];
  if (!part || part.type !== 'text') throw new Error('tool result has no text content');
  return part.text ?? '';
}

export function parseJsonContent(result: CallToolResult): unknown {
  const text = firstText(result);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 5;
  const delayMs = options.delayMs ?? 1000;
  let last: T | undefined;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      last = await fn();
      if (predicate(last)) return last;
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  if (lastErr) throw lastErr;
  return last as T;
}
