import { SendwithusApiError } from './errors.ts';
import type {
  AddLocaleRequest,
  BatchOperation,
  CreateTemplateRequest,
  CreateTemplateVersionRequest,
  CustomerLogsQuery,
  DripCampaignActivateRequest,
  DripCampaignDeactivateRequest,
  Fetcher,
  RenderRequest,
  ResendEmailRequest,
  SendEmailRequest,
  SnippetRequest,
  UpdateTemplateLocaleRequest,
  UpdateTemplateRequest,
  UpsertCustomerRequest,
} from './types.ts';

export interface SendwithusClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetcher?: Fetcher;
}

const DEFAULT_BASE_URL = 'https://api.sendwithus.com/api/v1';

export class SendwithusClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly authHeader: string;

  constructor(options: SendwithusClientOptions) {
    if (!options.apiKey) throw new Error('SendwithusClient: apiKey is required');
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
    let serializedBody: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      serializedBody = JSON.stringify(body);
    }

    const res = await this.fetcher(url, { method, headers, body: serializedBody });
    return this.parseResponse<T>(res);
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    let parsed: unknown = text;
    if (text && contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      throw new SendwithusApiError(res.status, res.statusText, parsed);
    }
    return parsed as T;
  }

  // ---- Templates ----
  listTemplates() {
    return this.request<unknown>('GET', '/templates');
  }
  getTemplate(templateId: string) {
    return this.request<unknown>('GET', `/templates/${encodeURIComponent(templateId)}`);
  }
  getTemplateLocale(templateId: string, locale: string) {
    return this.request<unknown>(
      'GET',
      `/templates/${encodeURIComponent(templateId)}/locales/${encodeURIComponent(locale)}`,
    );
  }
  updateTemplate(templateId: string, body: UpdateTemplateRequest) {
    return this.request<unknown>('PUT', `/templates/${encodeURIComponent(templateId)}`, body);
  }
  updateTemplateLocale(templateId: string, locale: string, body: UpdateTemplateLocaleRequest) {
    return this.request<unknown>(
      'PUT',
      `/templates/${encodeURIComponent(templateId)}/locales/${encodeURIComponent(locale)}`,
      body,
    );
  }
  createTemplate(body: CreateTemplateRequest) {
    return this.request<unknown>('POST', '/templates', body);
  }
  addTemplateLocale(templateId: string, body: AddLocaleRequest) {
    return this.request<unknown>(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/locales`,
      body,
    );
  }
  deleteTemplate(templateId: string) {
    return this.request<unknown>('DELETE', `/templates/${encodeURIComponent(templateId)}`);
  }
  deleteTemplateLocale(templateId: string, locale: string) {
    return this.request<unknown>(
      'DELETE',
      `/templates/${encodeURIComponent(templateId)}/locales/${encodeURIComponent(locale)}`,
    );
  }
  listTemplateVersions(templateId: string) {
    return this.request<unknown>('GET', `/templates/${encodeURIComponent(templateId)}/versions`);
  }
  getTemplateVersion(templateId: string, versionId: string) {
    return this.request<unknown>(
      'GET',
      `/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`,
    );
  }
  updateTemplateVersion(templateId: string, versionId: string, body: CreateTemplateVersionRequest) {
    return this.request<unknown>(
      'PUT',
      `/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`,
      body,
    );
  }
  createTemplateVersion(templateId: string, body: CreateTemplateVersionRequest) {
    return this.request<unknown>(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/versions`,
      body,
    );
  }

  // ---- Send / Render ----
  sendEmail(body: SendEmailRequest) {
    return this.request<unknown>('POST', '/send', body);
  }
  resendEmail(body: ResendEmailRequest) {
    return this.request<unknown>('POST', '/resend', body);
  }
  render(body: RenderRequest) {
    return this.request<unknown>('POST', '/render', body);
  }

  // ---- Logs ----
  getLog(logId: string) {
    return this.request<unknown>('GET', `/logs/${encodeURIComponent(logId)}`);
  }
  getLogEvents(logId: string) {
    return this.request<unknown>('GET', `/logs/${encodeURIComponent(logId)}/events`);
  }

  // ---- Snippets ----
  listSnippets() {
    return this.request<unknown>('GET', '/snippets');
  }
  getSnippet(snippetId: string) {
    return this.request<unknown>('GET', `/snippets/${encodeURIComponent(snippetId)}`);
  }
  createSnippet(body: SnippetRequest) {
    return this.request<unknown>('POST', '/snippets', body);
  }
  updateSnippet(snippetId: string, body: SnippetRequest) {
    return this.request<unknown>('PUT', `/snippets/${encodeURIComponent(snippetId)}`, body);
  }
  deleteSnippet(snippetId: string) {
    return this.request<unknown>('DELETE', `/snippets/${encodeURIComponent(snippetId)}`);
  }

  // ---- Customers ----
  getCustomer(email: string) {
    return this.request<unknown>('GET', `/customers/${encodeURIComponent(email)}`);
  }
  upsertCustomer(body: UpsertCustomerRequest) {
    return this.request<unknown>('POST', '/customers', body);
  }
  deleteCustomer(email: string) {
    return this.request<unknown>('DELETE', `/customers/${encodeURIComponent(email)}`);
  }
  getCustomerLogs(email: string, query?: CustomerLogsQuery) {
    return this.request<unknown>(
      'GET',
      `/customers/${encodeURIComponent(email)}/logs`,
      undefined,
      query as Record<string, string | number | undefined> | undefined,
    );
  }

  // ---- Drip campaigns ----
  listDripCampaigns() {
    return this.request<unknown>('GET', '/drip_campaigns');
  }
  getDripCampaign(campaignId: string) {
    return this.request<unknown>('GET', `/drip_campaigns/${encodeURIComponent(campaignId)}`);
  }
  activateDripCampaign(campaignId: string, body: DripCampaignActivateRequest) {
    return this.request<unknown>(
      'POST',
      `/drip_campaigns/${encodeURIComponent(campaignId)}/activate`,
      body,
    );
  }
  deactivateDripCampaign(campaignId: string, body: DripCampaignDeactivateRequest) {
    return this.request<unknown>(
      'POST',
      `/drip_campaigns/${encodeURIComponent(campaignId)}/deactivate`,
      body,
    );
  }
  deactivateAllDripCampaigns(body: DripCampaignDeactivateRequest) {
    return this.request<unknown>('POST', '/drip_campaigns/deactivate', body);
  }

  // ---- i18n ----
  async downloadPot(tag: string): Promise<string> {
    const url = `${this.baseUrl}/i18n/pot/${encodeURIComponent(tag)}`;
    const res = await this.fetcher(url, {
      method: 'GET',
      headers: { Authorization: this.authHeader },
    });
    const text = await res.text();
    if (!res.ok) throw new SendwithusApiError(res.status, res.statusText, text);
    return text;
  }
  uploadPo(tag: string, poContent: string) {
    const url = `/i18n/po/${encodeURIComponent(tag)}`;
    return this.request<unknown>('POST', url, { po: poContent });
  }

  // ---- Batch ----
  batch(operations: BatchOperation[]) {
    return this.request<unknown>('POST', '/batch', operations);
  }
}
