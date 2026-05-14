import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SendwithusClient } from './client/sendwithus-client.ts';
import { createServer } from './server.ts';

async function main(): Promise<void> {
  const apiKey = process.env.SENDWITHUS_API_KEY;
  if (!apiKey) {
    console.error('SENDWITHUS_API_KEY environment variable is required.');
    process.exit(1);
  }

  const client = new SendwithusClient({
    apiKey,
    baseUrl: process.env.SENDWITHUS_BASE_URL,
  });
  const server = createServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('sendwithus-mcp server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
