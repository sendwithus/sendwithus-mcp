# sendwithus-mcp

An [MCP](https://modelcontextprotocol.io/) server that wraps the [Sendwithus REST API](https://support.sendwithus.com/api/) as a set of tools.

Built with TypeScript, [Bun](https://bun.sh), and the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).

## Tools

Each Sendwithus v1 endpoint is exposed as one MCP tool:

- **Templates**: `templates_list`, `templates_get`, `templates_get_locale`, `templates_create`, `templates_update`, `templates_update_locale`, `templates_add_locale`, `templates_delete`, `templates_delete_locale`, `template_versions_list`, `template_versions_get`, `template_versions_create`, `template_versions_update`
- **Send**: `send_email`, `resend_email`, `render_template`
- **Logs**: `logs_get`, `logs_get_events`
- **Snippets**: `snippets_list`, `snippets_get`, `snippets_create`, `snippets_update`, `snippets_delete`
- **Customers**: `customers_get`, `customers_upsert`, `customers_delete`, `customers_get_logs`
- **Drip campaigns**: `drip_campaigns_list`, `drip_campaigns_get`, `drip_campaigns_activate`, `drip_campaigns_deactivate`, `drip_campaigns_deactivate_all`
- **i18n**: `i18n_pot_download`, `i18n_po_upload`
- **Batch**: `batch_execute`

## Configuration

Set `SENDWITHUS_API_KEY` in the environment. Optionally set `SENDWITHUS_BASE_URL` (defaults to `https://api.sendwithus.com/api/v1`).

## Use with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sendwithus": {
      "command": "node",
      "args": ["/absolute/path/to/sendwithus-mcp/dist/index.js"],
      "env": { "SENDWITHUS_API_KEY": "sk_..." }
    }
  }
}
```

Or, for development without building:

```json
{
  "mcpServers": {
    "sendwithus": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/sendwithus-mcp/src/index.ts"],
      "env": { "SENDWITHUS_API_KEY": "sk_..." }
    }
  }
}
```

## Use with Claude Code

```sh
claude mcp add sendwithus -- bun run /absolute/path/to/sendwithus-mcp/src/index.ts
```

Then set `SENDWITHUS_API_KEY` in the environment Claude Code is launched from, or pass it via `--env SENDWITHUS_API_KEY=...`.

## Develop

This project ships two distributables:

1. A plain Node CLI bundle (`dist/index.js`) — published to npm and consumed by the `claude mcp add` / `claude_desktop_config.json` snippets above.
2. An [MCPB](https://github.com/anthropics/mcpb) bundle (`sendwithus-mcp-<version>.mcpb`) — a single-file installable for Claude Desktop and other MCPB-aware hosts.

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1 (dev, tests, and the npm-target build).
- Node.js ≥ 20 (runs the bundled MCPB server and the published CLI).

```sh
bun install
```

### Daily development

```sh
bun run dev                # run the server from source over stdio
bun run inspect            # launch MCP Inspector against the source server
bun run test               # offline unit tests (mocked, CI-safe)
bun run test:integration   # live tests against api.sendwithus.com (needs SENDWITHUS_API_KEY)
bun run test:all           # both suites
bun run typecheck          # tsc --noEmit
bun run lint               # biome check
bun run format             # biome format --write
```

### Live integration tests

`bun run test:integration` exercises every MCP tool against the real Sendwithus API. The
suite is opt-in (the default `bun run test` stays offline). It creates throwaway resources
prefixed with `mcp-it-<runId>-` and deletes them in `afterAll`.

| Env var | Required | Effect |
|---|---|---|
| `SENDWITHUS_API_KEY` | for the suite to actually run | Without it, every integration suite skips cleanly (exit 0) |
| `SENDWITHUS_RUN_SENDS` | optional | Set to `1`/`true` to enable `send_email`, `resend_email`, `logs_get`, `logs_get_events` |
| `SENDWITHUS_TEST_RECIPIENT` | required when `SENDWITHUS_RUN_SENDS` is on | Address that receives the one test email per run |
| `SENDWITHUS_BASE_URL` | optional | Override the API base URL (e.g. for staging) |

Note: customer mutations (`customers_upsert`, `customers_delete`) cannot be performed with
Sendwithus *test* API keys — the suite detects this and verifies tool round-trip only.

### Building the Node CLI (`dist/`)

```sh
bun run build                          # bun build → dist/index.js with a node shebang
SENDWITHUS_API_KEY=... bun run start   # node dist/index.js
```

The output is published as the `sendwithus-mcp` bin (see `bin` in `package.json`).

### Building the MCPB bundle

The MCPB pipeline lives in `scripts/` and is driven from npm scripts:

```sh
npm run mcpb:sync-version  # copy version from package.json → manifest.json
npm run mcpb:build         # esbuild → mcpb-dist/{server.js,manifest.json}
npm run mcpb:pack          # validate manifest, produce sendwithus-mcp-<version>.mcpb
npm run mcpb               # all of the above end-to-end
```

`manifest.json` (at the repo root) is the source of truth for the MCPB manifest. The build copies it into `mcpb-dist/` next to the bundled `server.js`, and `mcpb:pack` zips that directory using [`@anthropic-ai/mcpb`](https://www.npmjs.com/package/@anthropic-ai/mcpb).

Both `mcpb-dist/` and `*.mcpb` are gitignored — they're build artifacts. Bump the version in `package.json` before running the pipeline; the sync script propagates it into the manifest.

### Releasing

1. Bump `version` in `package.json`.
2. `bun run test && bun run typecheck && bun run lint`.
3. `bun run build` → publish to npm (or `npm publish`).
4. `npm run mcpb` → attach the produced `sendwithus-mcp-<version>.mcpb` to the GitHub release.
