import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { SendwithusApiError } from '../client/errors.ts';

/**
 * Run a tool body and shape the MCP CallToolResult.
 *
 * If `parse` is provided, the raw response is validated against it. On success
 * the parsed object becomes `structuredContent` (required when the tool was
 * registered with an `outputSchema`) and a JSON-stringified copy is mirrored
 * into the human-readable `content` text block. On parse failure we return
 * `isError: true` with the validation message — the MCP SDK skips
 * structuredContent validation for error results, so this is always safe.
 *
 * If `parse` is omitted, the response is returned as-is in a text content
 * block (unstructured).
 */
export async function runTool<T>(
  fn: () => Promise<unknown>,
  parse?: (raw: unknown) => T,
): Promise<CallToolResult> {
  try {
    const raw = await fn();
    if (!parse) {
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      return { content: [{ type: 'text', text }] };
    }
    let structured: T;
    try {
      structured = parse(raw);
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const rawSnippet =
        typeof raw === 'string' ? raw.slice(0, 500) : JSON.stringify(raw).slice(0, 500);
      return {
        content: [
          {
            type: 'text',
            text: `Response schema validation failed: ${message}\n\nRaw response (truncated): ${rawSnippet}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
      structuredContent: structured as Record<string, unknown>,
    };
  } catch (err) {
    if (err instanceof SendwithusApiError) {
      return { content: [{ type: 'text', text: err.toToolErrorText() }], isError: true };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
}

/** Wrap an array response in `{ items: [...] }` for list-style tools. */
export function asItems<T>(items: T[]): { items: T[] } {
  return { items };
}

/**
 * Build a parser that validates the raw response with a list-item schema,
 * then wraps the array in `{ items: [...] }`. Matches the SDK's requirement
 * that outputSchema be an object schema at the top level.
 */
export function parseAsItems<T>(itemSchema: z.ZodType<T>) {
  return (raw: unknown): { items: T[] } => {
    if (!Array.isArray(raw)) {
      throw new Error(`expected an array, got ${typeof raw}`);
    }
    return { items: raw.map((item) => itemSchema.parse(item)) };
  };
}
