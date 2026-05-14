import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { snippetIdSchema } from '../schemas/common.ts';
import {
  itemsWrapper,
  snippetMutationResponseSchema,
  snippetSchema,
  successAckSchema,
} from '../schemas/responses.ts';
import { parseAsItems, runTool } from './helpers.ts';

const snippetsListOutput = itemsWrapper(snippetSchema);

export function registerSnippetTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'snippets_list',
    {
      title: 'List snippets',
      description: 'List all snippets.',
      inputSchema: {},
      outputSchema: snippetsListOutput,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => client.listSnippets(), parseAsItems(snippetSchema)),
  );

  server.registerTool(
    'snippets_get',
    {
      title: 'Get snippet',
      description: 'Retrieve a specific snippet by ID.',
      inputSchema: { snippet_id: snippetIdSchema },
      outputSchema: snippetSchema,
      annotations: { readOnlyHint: true },
    },
    ({ snippet_id }) =>
      runTool(
        () => client.getSnippet(snippet_id),
        (raw) => snippetSchema.parse(raw),
      ),
  );

  server.registerTool(
    'snippets_create',
    {
      title: 'Create snippet',
      description: 'Create a new snippet.',
      inputSchema: {
        name: z.string().describe('Snippet name'),
        body: z.string().describe('Snippet HTML body'),
      },
      outputSchema: snippetMutationResponseSchema,
    },
    (body) =>
      runTool(
        () => client.createSnippet(body),
        (raw) => snippetMutationResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'snippets_update',
    {
      title: 'Update snippet',
      description: 'Update an existing snippet.',
      inputSchema: {
        snippet_id: snippetIdSchema,
        name: z.string(),
        body: z.string(),
      },
      outputSchema: snippetMutationResponseSchema,
    },
    ({ snippet_id, name, body }) =>
      runTool(
        () => client.updateSnippet(snippet_id, { name, body }),
        (raw) => snippetMutationResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'snippets_delete',
    {
      title: 'Delete snippet',
      description: 'Delete a snippet.',
      inputSchema: { snippet_id: snippetIdSchema },
      outputSchema: successAckSchema,
      annotations: { destructiveHint: true },
    },
    ({ snippet_id }) =>
      runTool(
        () => client.deleteSnippet(snippet_id),
        (raw) => successAckSchema.parse(raw),
      ),
  );
}
