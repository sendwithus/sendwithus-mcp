import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { registerBatchTools } from './batch.ts';
import { registerCustomerTools } from './customers.ts';
import { registerDripCampaignTools } from './drip-campaigns.ts';
import { registerI18nTools } from './i18n.ts';
import { registerLogsTools } from './logs.ts';
import { registerSendTools } from './send.ts';
import { registerSnippetTools } from './snippets.ts';
import { registerTemplateTools } from './templates.ts';

export function registerAllTools(server: McpServer, client: SendwithusClient): void {
  registerTemplateTools(server, client);
  registerSendTools(server, client);
  registerLogsTools(server, client);
  registerSnippetTools(server, client);
  registerCustomerTools(server, client);
  registerDripCampaignTools(server, client);
  registerI18nTools(server, client);
  registerBatchTools(server, client);
}
