import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { dripCampaignIdSchema, emailAddressSchema, localeSchema } from '../schemas/common.ts';
import {
  dripCampaignMutationResponseSchema,
  dripCampaignSchema,
  dripDeactivateAllResponseSchema,
  itemsWrapper,
} from '../schemas/responses.ts';
import { parseAsItems, runTool } from './helpers.ts';

const dripsListOutput = itemsWrapper(dripCampaignSchema);

export function registerDripCampaignTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'drip_campaigns_list',
    {
      title: 'List drip campaigns',
      description: 'List all drip campaigns.',
      inputSchema: {},
      outputSchema: dripsListOutput,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => client.listDripCampaigns(), parseAsItems(dripCampaignSchema)),
  );

  server.registerTool(
    'drip_campaigns_get',
    {
      title: 'Get drip campaign',
      description: 'Get details for a specific drip campaign.',
      inputSchema: { campaign_id: dripCampaignIdSchema },
      outputSchema: dripCampaignSchema,
      annotations: { readOnlyHint: true },
    },
    ({ campaign_id }) =>
      runTool(
        () => client.getDripCampaign(campaign_id),
        (raw) => dripCampaignSchema.parse(raw),
      ),
  );

  server.registerTool(
    'drip_campaigns_activate',
    {
      title: 'Activate drip campaign for customer',
      description: 'Add a customer to a drip campaign.',
      inputSchema: {
        campaign_id: dripCampaignIdSchema,
        recipient_address: emailAddressSchema,
        email_data: z.record(z.unknown()).optional(),
        locale: localeSchema.optional(),
        tags: z.array(z.string()).optional(),
        esp_account: z.string().optional(),
      },
      outputSchema: dripCampaignMutationResponseSchema,
    },
    ({ campaign_id, ...body }) =>
      runTool(
        () => client.activateDripCampaign(campaign_id, body),
        (raw) => dripCampaignMutationResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'drip_campaigns_deactivate',
    {
      title: 'Deactivate drip campaign for customer',
      description: 'Remove a customer from a specific drip campaign.',
      inputSchema: {
        campaign_id: dripCampaignIdSchema,
        recipient_address: emailAddressSchema,
      },
      outputSchema: dripCampaignMutationResponseSchema,
    },
    ({ campaign_id, recipient_address }) =>
      runTool(
        () => client.deactivateDripCampaign(campaign_id, { recipient_address }),
        (raw) => dripCampaignMutationResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'drip_campaigns_deactivate_all',
    {
      title: 'Deactivate all drip campaigns for customer',
      description: 'Remove a customer from all drip campaigns.',
      inputSchema: { recipient_address: emailAddressSchema },
      outputSchema: dripDeactivateAllResponseSchema,
      annotations: { destructiveHint: true },
    },
    ({ recipient_address }) =>
      runTool(
        () => client.deactivateAllDripCampaigns({ recipient_address }),
        (raw) => dripDeactivateAllResponseSchema.parse(raw),
      ),
  );
}
