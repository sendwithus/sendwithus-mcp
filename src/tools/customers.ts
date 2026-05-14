import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { emailAddressSchema, localeSchema } from '../schemas/common.ts';
import {
  customerGetResponseSchema,
  customerLogsResponseSchema,
  successAckSchema,
} from '../schemas/responses.ts';
import { runTool } from './helpers.ts';

export function registerCustomerTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'customers_get',
    {
      title: 'Get customer',
      description: 'Retrieve a customer by email address.',
      inputSchema: { email: emailAddressSchema },
      outputSchema: customerGetResponseSchema,
      annotations: { readOnlyHint: true },
    },
    ({ email }) =>
      runTool(
        () => client.getCustomer(email),
        (raw) => customerGetResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'customers_upsert',
    {
      title: 'Create/update customer',
      description: 'Create or update a customer record.',
      inputSchema: {
        email: emailAddressSchema,
        locale: localeSchema.optional(),
        groups: z.array(z.string()).optional().describe('Group IDs to assign'),
        data: z.record(z.unknown()).optional().describe('Custom customer attributes'),
      },
      outputSchema: successAckSchema,
    },
    (body) =>
      runTool(
        () => client.upsertCustomer(body),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'customers_delete',
    {
      title: 'Delete customer',
      description: 'Delete a customer record.',
      inputSchema: { email: emailAddressSchema },
      outputSchema: successAckSchema,
      annotations: { destructiveHint: true },
    },
    ({ email }) =>
      runTool(
        () => client.deleteCustomer(email),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'customers_get_logs',
    {
      title: 'Get customer email logs',
      description: 'Retrieve email logs for a customer.',
      inputSchema: {
        email: emailAddressSchema,
        count: z.number().int().min(1).max(100).optional().describe('Number of logs to return'),
        created_gt: z
          .number()
          .int()
          .optional()
          .describe('Unix timestamp; only logs created after this'),
        created_lt: z
          .number()
          .int()
          .optional()
          .describe('Unix timestamp; only logs created before this'),
      },
      outputSchema: customerLogsResponseSchema,
      annotations: { readOnlyHint: true },
    },
    ({ email, ...query }) =>
      runTool(
        () => client.getCustomerLogs(email, query),
        (raw) => customerLogsResponseSchema.parse(raw),
      ),
  );
}
