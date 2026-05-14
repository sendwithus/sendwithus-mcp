export interface Recipient {
  address: string;
  name?: string;
}

export interface Sender {
  address?: string;
  reply_to?: string;
  name?: string;
}

export interface Attachment {
  id: string;
  data: string;
}

export interface SendEmailRequest {
  template: string;
  recipient: Recipient;
  sender?: Sender;
  cc?: Recipient[];
  bcc?: Recipient[];
  email_data?: Record<string, unknown>;
  tags?: string[];
  headers?: Record<string, string>;
  inline?: Attachment;
  attachments?: Attachment[];
  esp_account?: string;
  version_name?: string;
  locale?: string;
  files?: Attachment[];
}

export interface ResendEmailRequest {
  log_id: string;
}

export interface RenderRequest {
  template: string;
  version_id?: string;
  version_name?: string;
  template_data?: Record<string, unknown>;
  locale?: string;
  strict?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  subject: string;
  html?: string;
  text?: string;
  preheader?: string;
  amp_html?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  tags?: string[];
}

export interface UpdateTemplateLocaleRequest {
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
  preheader?: string;
  amp_html?: string;
}

export interface CreateTemplateVersionRequest {
  name: string;
  subject: string;
  html?: string;
  text?: string;
  preheader?: string;
  amp_html?: string;
}

export interface AddLocaleRequest {
  locale: string;
  version_name: string;
  subject: string;
  html?: string;
  text?: string;
  preheader?: string;
  amp_html?: string;
}

export interface SnippetRequest {
  name: string;
  body: string;
}

export interface UpsertCustomerRequest {
  email: string;
  locale?: string;
  groups?: string[];
  data?: Record<string, unknown>;
}

export interface CustomerLogsQuery {
  count?: number;
  created_gt?: number;
  created_lt?: number;
}

export interface DripCampaignActivateRequest {
  recipient_address: string;
  email_data?: Record<string, unknown>;
  locale?: string;
  tags?: string[];
  esp_account?: string;
}

export interface DripCampaignDeactivateRequest {
  recipient_address: string;
}

export interface BatchOperation {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
