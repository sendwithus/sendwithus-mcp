#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const bundleDir = resolve(root, 'mcpb-dist')
const manifestPath = resolve(bundleDir, 'manifest.json')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const output = resolve(root, `sendwithus-mcp-${manifest.version}.mcpb`)

const validate = spawnSync('npx', ['@anthropic-ai/mcpb', 'validate', manifestPath], {
  stdio: 'inherit',
})
if (validate.status !== 0) {
  console.error('manifest.json failed validation')
  process.exit(validate.status ?? 1)
}

const result = spawnSync('npx', ['@anthropic-ai/mcpb', 'pack', bundleDir, output], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
