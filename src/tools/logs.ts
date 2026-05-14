import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { itemsWrapper, logEventSchema, logSchema } from '../schemas/responses.ts';
import { parseAsItems, runTool } from './helpers.ts';

const logIdSchema = z.string().min(1).describe('Email log ID');

const eventsOutput = itemsWrapper(logEventSchema);

export function registerLogsTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'logs_get',
    {
      title: 'Get log',
      description: 'Retrieve a specific email log entry with metadata.',
      inputSchema: { log_id: logIdSchema },
      outputSchema: logSchema,
      annotations: { readOnlyHint: true },
    },
    ({ log_id }) =>
      runTool(
        () => client.getLog(log_id),
        (raw) => logSchema.parse(raw),
      ),
  );

  server.registerTool(
    'logs_get_events',
    {
      title: 'Get log events',
      description: 'Retrieve all delivery/engagement events for a log entry.',
      inputSchema: { log_id: logIdSchema },
      outputSchema: eventsOutput,
      annotations: { readOnlyHint: true },
    },
    ({ log_id }) => runTool(() => client.getLogEvents(log_id), parseAsItems(logEventSchema)),
  );
}
