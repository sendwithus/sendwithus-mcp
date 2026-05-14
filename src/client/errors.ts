export class SendwithusApiError extends Error {
  override readonly name = 'SendwithusApiError';
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown, message?: string) {
    super(message ?? `Sendwithus API error ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }

  toToolErrorText(): string {
    const bodyText = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    return `Sendwithus API error: HTTP ${this.status} ${this.statusText}\n${bodyText}`;
  }
}
