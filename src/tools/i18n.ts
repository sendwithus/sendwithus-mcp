import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { successAckSchema, textWrapper } from '../schemas/responses.ts';
import { runTool } from './helpers.ts';

const tagSchema = z.string().min(1).describe('Template tag identifier');

export function registerI18nTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'i18n_pot_download',
    {
      title: 'Download .pot translation package',
      description:
        'Download the .pot translation package for templates with a given tag. Returns the raw .pot file contents under the `text` field.',
      inputSchema: { tag: tagSchema },
      outputSchema: textWrapper,
      annotations: { readOnlyHint: true },
    },
    ({ tag }) =>
      runTool(
        () => client.downloadPot(tag),
        (raw) => textWrapper.parse({ text: typeof raw === 'string' ? raw : String(raw) }),
      ),
  );

  server.registerTool(
    'i18n_po_upload',
    {
      title: 'Upload translated .po file',
      description: 'Upload a translated .po file for templates with a given tag.',
      inputSchema: {
        tag: tagSchema,
        po: z.string().describe('Full contents of the .po file'),
      },
      outputSchema: successAckSchema,
    },
    ({ tag, po }) =>
      runTool(
        () => client.uploadPo(tag, po),
        (raw) => successAckSchema.parse(raw),
      ),
  );
}
