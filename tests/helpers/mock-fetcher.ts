import type { Fetcher } from '../../src/client/types.ts';

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface MockResponse {
  status?: number;
  statusText?: string;
  body?: unknown;
  contentType?: string;
}

export interface MockFetcher {
  fetcher: Fetcher;
  calls: RecordedCall[];
}

/**
 * Build a mock fetcher that returns canned responses for matched
 * `${METHOD} ${pathWithOrWithoutQuery}` keys.
 *
 * Match priority: exact key, then a key without query string.
 */
export function createMockFetcher(
  routes: Record<string, MockResponse | ((call: RecordedCall) => MockResponse)>,
): MockFetcher {
  const calls: RecordedCall[] = [];
  const fetcher: Fetcher = async (input, init) => {
    const url = String(input);
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = normalizeHeaders(init.headers as NormalizableHeaders);
    const body =
      typeof init.body === 'string' ? init.body : init.body == null ? undefined : String(init.body);
    const call: RecordedCall = { url, method, headers, body };
    calls.push(call);

    const pathWithQuery = stripOrigin(url);
    const pathOnly = pathWithQuery.split('?')[0] ?? pathWithQuery;
    const lookup = routes[`${method} ${pathWithQuery}`] ?? routes[`${method} ${pathOnly}`];
    if (!lookup) {
      throw new Error(`mock-fetcher: no route for ${method} ${pathWithQuery}`);
    }
    const resolved = typeof lookup === 'function' ? lookup(call) : lookup;
    const status = resolved.status ?? 200;
    const statusText = resolved.statusText ?? (status >= 400 ? 'ERR' : 'OK');
    const contentType = resolved.contentType ?? 'application/json';
    const responseBody =
      resolved.body === undefined
        ? ''
        : typeof resolved.body === 'string'
          ? resolved.body
          : JSON.stringify(resolved.body);
    return new Response(responseBody, {
      status,
      statusText,
      headers: { 'content-type': contentType },
    });
  };
  return { fetcher, calls };
}

type NormalizableHeaders = Headers | Record<string, string> | Array<[string, string]> | undefined;

function normalizeHeaders(headers: NormalizableHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) {
      if (k !== undefined && v !== undefined) out[k.toLowerCase()] = v;
    }
    return out;
  }
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = String(v);
  }
  return out;
}

function stripOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}
