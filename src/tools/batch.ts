import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { batchSubResponseSchema, itemsWrapper } from '../schemas/responses.ts';
import { parseAsItems, runTool } from './helpers.ts';

const operationSchema = z.object({
  path: z.string().describe('API path (e.g. "/templates")'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP method'),
  body: z.unknown().optional().describe('Request body for POST/PUT'),
});

const batchOutput = itemsWrapper(batchSubResponseSchema);

export function registerBatchTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'batch_execute',
    {
      title: 'Execute batch API calls',
      description:
        'Execute multiple Sendwithus API operations in a single request. Each operation specifies a path, method, and optional body.',
      inputSchema: {
        operations: z.array(operationSchema).min(1).max(10).describe('Operations to execute'),
      },
      outputSchema: batchOutput,
    },
    ({ operations }) =>
      runTool(() => client.batch(operations), parseAsItems(batchSubResponseSchema)),
  );
}
