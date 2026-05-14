import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SendwithusClient } from './client/sendwithus-client.ts';
import { registerAllTools } from './tools/register.ts';

export const SERVER_INFO = {
  name: 'sendwithus-mcp',
  version: '0.1.0',
} as const;

export function createServer(client: SendwithusClient): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      'Tools wrap the Sendwithus REST API. For previewing template output without sending, prefer render_template. For sending mail, use send_email.',
  });
  registerAllTools(server, client);
  return server;
}
