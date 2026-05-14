import { z } from 'zod';

/**
 * Sendwithus response shapes, modeled from live API probes against
 * api.sendwithus.com (Nov 2026). All object schemas use .passthrough()
 * so unmodeled fields are preserved rather than silently dropped or
 * flagged as validation errors — Sendwithus occasionally adds fields.
 */

const passthrough = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();

// ---------- shared scalars ----------

export const successAckSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
});

// ---------- templates ----------

export const templateVersionBriefSchema = passthrough({
  id: z.string(),
  name: z.string(),
  published: z.boolean().optional(),
  created: z.number().optional(),
  modified: z.number().optional(),
});

export const templateVersionSchema = passthrough({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  html: z.string().optional(),
  text: z.string().optional(),
  preheader: z.string().optional(),
  amp_html: z.string().optional(),
  published: z.boolean().optional(),
  created: z.number().optional(),
  modified: z.number().optional(),
  template_data: z.record(z.unknown()).optional(),
});

/** POST /templates response — flat: { id, locale, name } */
export const templateCreatedSchema = passthrough({
  id: z.string(),
  locale: z.string().optional(),
  name: z.string(),
});

/** GET /templates/:id and GET /templates/:id/locales/:locale */
export const templateSchema = passthrough({
  id: z.string(),
  name: z.string(),
  locale: z.string().optional(),
  created: z.number().optional(),
  versions: z.array(templateVersionBriefSchema).optional(),
  tags: z.array(z.string()).optional(),
});

/** POST /templates/:id/locales response */
export const addLocaleResponseSchema = passthrough({
  id: z.string(),
  locale: z.string(),
  name: z.string(),
  version_id: z.string(),
});

// ---------- send / render / resend ----------

export const sendResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  receipt_id: z.string(),
  email: passthrough({
    name: z.string().optional(),
    locale: z.string().optional(),
    version_name: z.string().optional(),
  }).optional(),
});

export const resendResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
});

export const renderResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  template: passthrough({
    id: z.string(),
    name: z.string().optional(),
    locale: z.string().optional(),
    version_name: z.string().optional(),
  }),
  subject: z.string().optional(),
  preheader: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  amp_html: z.string().optional(),
});

// ---------- logs ----------

/**
 * Log shape — Sendwithus did not return a successful /logs/:id response
 * during probing (test API key sends do not persist logs queryable by id),
 * so this is permissive. Known fields from /customers/:email/logs entries
 * are included.
 */
export const logSchema = passthrough({
  object: z.string().optional(),
  id: z.string().nullable().optional(),
  created: z.number().optional(),
  recipient_name: z.string().nullable().optional(),
  recipient_address: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  email_id: z.string().optional(),
  email_name: z.string().optional(),
  email_version: z.string().nullable().optional(),
});

export const logEventSchema = passthrough({
  object: z.string().optional(),
  type: z.string().optional(),
  created: z.number().optional(),
});

// ---------- snippets ----------

export const snippetSchema = passthrough({
  object: z.string().optional(),
  id: z.string(),
  name: z.string(),
  body: z.string(),
  created: z.number().optional(),
  modified: z.number().optional(),
});

/** POST/PUT /snippets/(:id) wrap the snippet in { success, status, snippet } */
export const snippetMutationResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  snippet: snippetSchema,
});

// ---------- customers ----------

export const customerSchema = passthrough({
  object: z.string().optional(),
  email: z.string(),
  created: z.number().optional(),
  locale: z.string().optional(),
  groups: z.array(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
});

/** GET /customers/:email response */
export const customerGetResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  customer: customerSchema,
});

/** GET /customers/:email/logs response */
export const customerLogsResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  logs: z.array(logSchema),
});

// ---------- drip campaigns ----------

export const dripStepSchema = passthrough({
  object: z.string().optional(),
  id: z.string(),
  email_id: z.string().optional(),
  delay_seconds: z.number().optional(),
});

export const dripCampaignSchema = passthrough({
  object: z.string().optional(),
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().optional(),
  trigger_email_id: z.string().nullable().optional(),
  drip_steps: z.array(dripStepSchema).optional(),
});

/** POST /drip_campaigns/:id/activate and /deactivate (campaign-specific) */
export const dripCampaignMutationResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  drip_campaign: passthrough({
    id: z.string(),
    name: z.string().optional(),
  }),
  recipient_address: z.string(),
  message: z.string().optional(),
});

/** POST /drip_campaigns/deactivate (all campaigns for a recipient) */
export const dripDeactivateAllResponseSchema = passthrough({
  success: z.boolean(),
  status: z.string(),
  recipient_address: z.string(),
});

// ---------- batch ----------

export const batchSubResponseSchema = passthrough({
  status_code: z.number(),
  method: z.string(),
  path: z.string(),
  body: z.unknown(),
});

// ---------- list-tool array wrappers ----------
//
// The MCP SDK requires every `outputSchema` to ultimately be an object
// schema (it normalizes raw shapes and z.object() at the top level).
// For tools whose underlying response is a top-level array, we wrap
// it as `{ items: [...] }` for the structuredContent payload.

export const itemsWrapper = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

// ---------- text wrapper (for raw text payloads like .pot files) ----------

export const textWrapper = z.object({ text: z.string() });

// ---------- generic single-value wrapper ----------

export const valueWrapper = <T extends z.ZodTypeAny>(value: T) => z.object({ value });
