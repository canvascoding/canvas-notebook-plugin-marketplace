import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

// Dependencies live in a caller-selected validation project, never in skill archives.
const project = process.env.MERMAID_VALIDATION_PROJECT;
assert.ok(project && path.isAbsolute(project), 'Set MERMAID_VALIDATION_PROJECT to an absolute project with mermaid@11.16.1, jsdom and mdast-util-from-markdown installed.');
const require = createRequire(path.join(project, 'package.json'));
const { JSDOM } = await import(pathToFileURL(require.resolve('jsdom')).href);
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
const { default: mermaid } = await import(pathToFileURL(require.resolve('mermaid')).href);
const { fromMarkdown } = await import(pathToFileURL(require.resolve('mdast-util-from-markdown')).href);
const root = fileURLToPath(new URL('../', import.meta.url));
const mermaidManifest = JSON.parse(await readFile(path.join(path.dirname(require.resolve('mermaid')), '../package.json'), 'utf8'));
assert.equal(mermaidManifest.version, '11.16.1', 'Fixtures must run against the documented Mermaid version.');
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
process.on('exit', () => dom.window.close());

test('all documented Mermaid fixtures parse with the published backend version', async () => {
  const source = await readFile(path.join(root, 'skills/mermaid/1.0.0/references/syntax.md'), 'utf8');
  const pending = [fromMarkdown(source)];
  const blocks = [];
  while (pending.length) {
    const node = pending.shift();
    if (node.type === 'code' && node.lang === 'mermaid') blocks.push(node);
    pending.push(...node.children ?? []);
  }
  const types = [];
  for (const block of blocks) {
    const result = await mermaid.parse(block.value);
    assert.ok(result.diagramType, `Missing diagram type at line ${block.position.start.line}`);
    types.push(result.diagramType);
  }
  assert.deepEqual(types.sort(), ['er', 'flowchart-v2', 'gantt', 'pie', 'sequence', 'xychart'].sort());
});

test('syntax checks reject invalid diagram definitions without rendering', async () => {
  for (const source of ['unknownDiagram\nA -> B', 'flowchart LR\nA["Unclosed label', 'xychart-beta\ninvalid chart syntax']) {
    await assert.rejects(mermaid.parse(source));
    assert.equal(await mermaid.parse(source, { suppressErrors: true }), false);
  }
});
