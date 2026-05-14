#!/usr/bin/env node
import { build } from 'esbuild'
import { rm, mkdir, readFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const outdir = resolve(root, 'mcpb-dist')
const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))

await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(outdir, 'server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  sourcemap: false,
  define: {
    __PKG_VERSION__: JSON.stringify(version),
  },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})

await copyFile(resolve(root, 'manifest.json'), resolve(outdir, 'manifest.json'))
console.log(`mcpb bundle ready in ${outdir}`)
