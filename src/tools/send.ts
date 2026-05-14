import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import {
  attachmentSchema,
  localeSchema,
  recipientSchema,
  senderSchema,
  templateIdSchema,
  versionIdSchema,
} from '../schemas/common.ts';
import {
  renderResponseSchema,
  resendResponseSchema,
  sendResponseSchema,
} from '../schemas/responses.ts';
import { runTool } from './helpers.ts';

export function registerSendTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'send_email',
    {
      title: 'Send email',
      description: 'Send a transactional email using a Sendwithus template.',
      inputSchema: {
        template_id: templateIdSchema,
        recipient: recipientSchema,
        sender: senderSchema.optional(),
        cc: z.array(recipientSchema).optional().describe('CC recipients'),
        bcc: z.array(recipientSchema).optional().describe('BCC recipients'),
        email_data: z
          .record(z.unknown())
          .optional()
          .describe('Template merge data (key/value pairs available to the template)'),
        tags: z.array(z.string()).optional().describe('Tags to attach to the email'),
        headers: z.record(z.string()).optional().describe('Custom email headers as a flat object'),
        inline: attachmentSchema.optional().describe('Inline image attachment'),
        attachments: z.array(attachmentSchema).optional().describe('File attachments'),
        esp_account: z.string().optional().describe('ESP account ID override (multi-ESP setups)'),
        version_name: z.string().optional().describe('Specific template version to send'),
        locale: localeSchema.optional(),
      },
      outputSchema: sendResponseSchema,
    },
    ({ template_id, ...rest }) =>
      runTool(
        () => client.sendEmail({ template: template_id, ...rest }),
        (raw) => sendResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'resend_email',
    {
      title: 'Resend email',
      description: 'Resend a previously sent email by its log ID.',
      inputSchema: { log_id: z.string().describe('Email log ID to resend') },
      outputSchema: resendResponseSchema,
    },
    ({ log_id }) =>
      runTool(
        () => client.resendEmail({ log_id }),
        (raw) => resendResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'render_template',
    {
      title: 'Render template (preview)',
      description:
        'Render a template with merge data and return the HTML/text without sending. Useful for previewing email content before calling send_email.',
      inputSchema: {
        template_id: templateIdSchema,
        version_id: versionIdSchema.optional(),
        version_name: z.string().optional(),
        template_data: z.record(z.unknown()).optional().describe('Template merge data'),
        locale: localeSchema.optional(),
        strict: z.boolean().optional().describe('Fail render on missing variables'),
      },
      outputSchema: renderResponseSchema,
      annotations: { readOnlyHint: true },
    },
    ({ template_id, ...rest }) =>
      runTool(
        () => client.render({ template: template_id, ...rest }),
        (raw) => renderResponseSchema.parse(raw),
      ),
  );
}
