import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SendwithusClient } from '../client/sendwithus-client.ts';
import { localeSchema, templateIdSchema, versionIdSchema } from '../schemas/common.ts';
import {
  addLocaleResponseSchema,
  itemsWrapper,
  successAckSchema,
  templateCreatedSchema,
  templateSchema,
  templateVersionSchema,
} from '../schemas/responses.ts';
import { parseAsItems, runTool } from './helpers.ts';

const versionBodyShape = {
  name: z.string().describe('Version display name'),
  subject: z.string().describe('Email subject line'),
  html: z.string().optional().describe('HTML body'),
  text: z.string().optional().describe('Plain-text body'),
  preheader: z.string().optional().describe('Preheader text'),
  amp_html: z.string().optional().describe('AMP HTML body'),
};

const localeBodyShape = {
  name: z.string().optional().describe('Version display name'),
  subject: z.string().optional().describe('Email subject line'),
  html: z.string().optional().describe('HTML body'),
  text: z.string().optional().describe('Plain-text body'),
  preheader: z.string().optional().describe('Preheader text'),
  amp_html: z.string().optional().describe('AMP HTML body'),
};

const templatesListOutput = itemsWrapper(templateSchema);
const versionsListOutput = itemsWrapper(templateVersionSchema);

export function registerTemplateTools(server: McpServer, client: SendwithusClient): void {
  server.registerTool(
    'templates_list',
    {
      title: 'List templates',
      description: 'Retrieve all Sendwithus templates.',
      inputSchema: {},
      outputSchema: templatesListOutput,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => client.listTemplates(), parseAsItems(templateSchema)),
  );

  server.registerTool(
    'templates_get',
    {
      title: 'Get template',
      description: 'Get a single template with all versions.',
      inputSchema: { template_id: templateIdSchema },
      outputSchema: templateSchema,
      annotations: { readOnlyHint: true },
    },
    ({ template_id }) =>
      runTool(
        () => client.getTemplate(template_id),
        (raw) => templateSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_get_locale',
    {
      title: 'Get template (locale)',
      description: 'Get a template for a specific locale.',
      inputSchema: { template_id: templateIdSchema, locale: localeSchema },
      outputSchema: templateSchema,
      annotations: { readOnlyHint: true },
    },
    ({ template_id, locale }) =>
      runTool(
        () => client.getTemplateLocale(template_id, locale),
        (raw) => templateSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_update',
    {
      title: 'Update template metadata',
      description: 'Update template name and/or tags.',
      inputSchema: {
        template_id: templateIdSchema,
        name: z.string().optional().describe('New template name'),
        tags: z.array(z.string()).optional().describe('Replacement list of tags'),
      },
      outputSchema: successAckSchema,
    },
    ({ template_id, name, tags }) =>
      runTool(
        () => client.updateTemplate(template_id, { name, tags }),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_update_locale',
    {
      title: 'Update template (locale)',
      description: 'Update template content for a specific locale.',
      inputSchema: {
        template_id: templateIdSchema,
        locale: localeSchema,
        ...localeBodyShape,
      },
      outputSchema: successAckSchema,
    },
    ({ template_id, locale, ...body }) =>
      runTool(
        () => client.updateTemplateLocale(template_id, locale, body),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_create',
    {
      title: 'Create template',
      description: 'Create a new template with an initial version.',
      inputSchema: versionBodyShape,
      outputSchema: templateCreatedSchema,
    },
    (body) =>
      runTool(
        () => client.createTemplate(body),
        (raw) => templateCreatedSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_add_locale',
    {
      title: 'Add locale to template',
      description: 'Add a new locale to an existing template.',
      inputSchema: {
        template_id: templateIdSchema,
        locale: localeSchema,
        version_name: z.string().describe('Version display name'),
        subject: z.string().describe('Email subject line'),
        html: z.string().optional(),
        text: z.string().optional(),
        preheader: z.string().optional(),
        amp_html: z.string().optional(),
      },
      outputSchema: addLocaleResponseSchema,
    },
    ({ template_id, ...body }) =>
      runTool(
        () => client.addTemplateLocale(template_id, body),
        (raw) => addLocaleResponseSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_delete',
    {
      title: 'Delete template',
      description: 'Delete a template and all its versions/locales.',
      inputSchema: { template_id: templateIdSchema },
      outputSchema: successAckSchema,
      annotations: { destructiveHint: true },
    },
    ({ template_id }) =>
      runTool(
        () => client.deleteTemplate(template_id),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'templates_delete_locale',
    {
      title: 'Delete template locale',
      description: 'Delete a specific locale from a template.',
      inputSchema: { template_id: templateIdSchema, locale: localeSchema },
      outputSchema: successAckSchema,
      annotations: { destructiveHint: true },
    },
    ({ template_id, locale }) =>
      runTool(
        () => client.deleteTemplateLocale(template_id, locale),
        (raw) => successAckSchema.parse(raw),
      ),
  );

  server.registerTool(
    'template_versions_list',
    {
      title: 'List template versions',
      description: 'List all versions of a template with their content.',
      inputSchema: { template_id: templateIdSchema },
      outputSchema: versionsListOutput,
      annotations: { readOnlyHint: true },
    },
    ({ template_id }) =>
      runTool(() => client.listTemplateVersions(template_id), parseAsItems(templateVersionSchema)),
  );

  server.registerTool(
    'template_versions_get',
    {
      title: 'Get template version',
      description: 'Get a specific template version with HTML/text body.',
      inputSchema: { template_id: templateIdSchema, version_id: versionIdSchema },
      outputSchema: templateVersionSchema,
      annotations: { readOnlyHint: true },
    },
    ({ template_id, version_id }) =>
      runTool(
        () => client.getTemplateVersion(template_id, version_id),
        (raw) => templateVersionSchema.parse(raw),
      ),
  );

  server.registerTool(
    'template_versions_update',
    {
      title: 'Update template version',
      description: 'Replace the content of an existing template version.',
      inputSchema: {
        template_id: templateIdSchema,
        version_id: versionIdSchema,
        ...versionBodyShape,
      },
      outputSchema: templateVersionSchema,
    },
    ({ template_id, version_id, ...body }) =>
      runTool(
        () => client.updateTemplateVersion(template_id, version_id, body),
        (raw) => templateVersionSchema.parse(raw),
      ),
  );

  server.registerTool(
    'template_versions_create',
    {
      title: 'Create template version',
      description: 'Create a new version of an existing template.',
      inputSchema: { template_id: templateIdSchema, ...versionBodyShape },
      outputSchema: templateVersionSchema,
    },
    ({ template_id, ...body }) =>
      runTool(
        () => client.createTemplateVersion(template_id, body),
        (raw) => templateVersionSchema.parse(raw),
      ),
  );
}
