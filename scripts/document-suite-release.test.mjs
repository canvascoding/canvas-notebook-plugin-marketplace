import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { promisify } from 'node:util';
import { checksum, createRegistryCandidate, markdownBody, sha256, verifyPreparedPackage } from './document-suite-release.mjs';

const SKILLS = ['docx', 'excalidraw-diagram', 'marp-slides', 'pdf', 'pptx', 'xlsx'];
const COMMIT = 'a'.repeat(40);
const RELEASE_COMMIT = 'b'.repeat(40);
const DESCRIPTION = 'Create and edit Excalidraw scenes with the central Scene Service.';
const SOURCES = ['app/lib/excalidraw-collaboration/scene-service.ts', 'app/lib/pi/core-tools.ts', 'app/lib/mcp/server/excalidraw-tools.ts'];
const run = promisify(execFile);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function put(root, relative, bytes) {
  await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await fs.writeFile(path.join(root, relative), bytes);
}

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'document-suite-release-'));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const marketplaceRoot = path.join(temporary, 'marketplace');
  const notebookRoot = path.join(temporary, 'notebook');
  const registry = { schemaVersion: 1, updatedAt: '2026-06-19T00:00:00.000Z', plugins: [
    { name: 'unrelated', latestVersion: '9.0.0', versions: {} },
    { name: 'document-suite', latestVersion: '1.2.0', icon: 'plugins/document-suite/1.2.0/assets/icon.svg', versions: {} },
  ], skills: SKILLS.map((name) => ({ name, description: 'Previous description', latestVersion: '1.2.0', sourcePlugin: { name: 'document-suite', version: '1.2.0' }, versions: {} })) };
  const plugin = registry.plugins[1];
  for (const version of ['1.1.0', '1.2.0']) {
    const packagePath = `plugins/document-suite/${version}`;
    await put(marketplaceRoot, `${packagePath}/.canvas-plugin/plugin.json`, json({ name: 'document-suite', version, license: 'MIT' }));
    await put(marketplaceRoot, `${packagePath}/assets/icon.svg`, '<svg/>\n');
    for (const skill of SKILLS) {
      await put(marketplaceRoot, `${packagePath}/skills/${skill}/SKILL.md`, `---\nname: ${skill}\n---\nOriginal ${skill} workflow.\n`);
      registry.skills.find((item) => item.name === skill).versions[version] = { checksum: await checksum(path.join(marketplaceRoot, packagePath, 'skills', skill)) };
    }
    plugin.versions[version] = { checksum: await checksum(path.join(marketplaceRoot, packagePath)) };
  }
  const packagePath = 'plugins/document-suite/1.4.0';
  const packageRoot = path.join(marketplaceRoot, packagePath);
  await fs.cp(path.join(marketplaceRoot, 'plugins/document-suite/1.2.0'), packageRoot, { recursive: true });
  const pluginDescription = 'Document workflows including Excalidraw and Mermaid.';
  await put(marketplaceRoot, `${packagePath}/.canvas-plugin/plugin.json`, json({ name: 'document-suite', version: '1.4.0', license: 'MIT', description: pluginDescription }));
  const mermaidText = '---\nname: mermaid\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n---\nWrite Mermaid code in Markdown.\n';
  await put(marketplaceRoot, 'skills/mermaid/1.0.0/SKILL.md', mermaidText);
  await put(marketplaceRoot, `${packagePath}/skills/mermaid/SKILL.md`, mermaidText);
  registry.skills.push({ name: 'mermaid', latestVersion: '1.0.0', versions: {
    '1.0.0': { checksum: await checksum(path.join(marketplaceRoot, 'skills/mermaid/1.0.0')) },
  } });
  const body = '\nCreate/Get → valid elements → Edit → actual status → reread → document link.\n';
  const marketSkill = `---\nname: excalidraw-diagram\ndescription: ${DESCRIPTION}\nlicense: "MIT"\nmetadata:\n  version: "1.4.0"\n---\n${body}`;
  const seedSkill = `---\nname: excalidraw-diagram\ndescription: ${DESCRIPTION}\nlicense: "Canvas Notebook Sustainable Use License"\n---\n${body}`;
  const excalPath = `${packagePath}/skills/excalidraw-diagram`;
  await put(marketplaceRoot, `${excalPath}/SKILL.md`, marketSkill);
  await put(notebookRoot, 'seed_skills/excalidraw-diagram/SKILL.md', seedSkill);
  const helpers = { 'scripts/validate_excalidraw.py': '# in-memory validation only\n', 'agents/canvas.yaml': 'interface:\n  display_name: Excalidraw\n' };
  for (const [name, bytes] of Object.entries(helpers)) {
    await put(marketplaceRoot, `${excalPath}/${name}`, bytes);
    await put(notebookRoot, `seed_skills/excalidraw-diagram/${name}`, bytes);
  }
  await put(notebookRoot, 'seed_plugins/document-suite/.canvas-plugin/plugin.json', json({ name: 'document-suite', version: '1.4.0', source: 'seed', license: 'Canvas Notebook Sustainable Use License' }));
  const registryBytes = json(registry);
  await put(marketplaceRoot, 'registry.json', registryBytes);
  const skillChecksums = {};
  for (const skill of [...SKILLS, 'mermaid']) skillChecksums[skill] = await checksum(path.join(packageRoot, 'skills', skill));
  const archiveBase = 'canvas-notebook-plugin-marketplace-document-suite-v1.4.0';
  const baseEntry = { version: '1.4.0', downloadUrl: 'https://github.com/canvascoding/canvas-notebook-plugin-marketplace/archive/refs/tags/document-suite-v1.4.0.zip' };
  const receipt = { schemaVersion: 1, status: 'prepared', name: 'document-suite', version: '1.4.0', basedOnVersion: '1.2.0', packagePath,
    checksum: await checksum(packageRoot), skillChecksums, registryChecksum: sha256(registryBytes), requiredBackendCommit: COMMIT,
    backendRepository: 'canvascoding/canvas-notebook', publishedBaselineVersion: '2026.10.12.12', minCanvasVersion: null,
    seed: { pluginChecksum: await checksum(path.join(notebookRoot, 'seed_plugins/document-suite')),
      skillChecksum: await checksum(path.join(notebookRoot, 'seed_skills/excalidraw-diagram')), workflowChecksum: sha256(body),
      helperChecksums: Object.fromEntries(Object.entries(helpers).map(([name, bytes]) => [name, sha256(bytes)])) },
    excalidrawDescription: DESCRIPTION, pluginDescription,
    registryEntries: { plugin: { ...baseEntry, packagePath: `${archiveBase}/${packagePath}`, checksum: await checksum(packageRoot), manifestPath: '.canvas-plugin/plugin.json' },
      skill: { ...baseEntry, packagePath: `${archiveBase}/${excalPath}`, checksum: skillChecksums['excalidraw-diagram'] } },
  };
  const writeReceipt = () => put(marketplaceRoot, 'prepared/document-suite-1.4.0.json', json(receipt));
  await writeReceipt();
  return { marketplaceRoot, notebookRoot, receipt, registry, writeReceipt };
}

function proof(overrides = {}) {
  return { repository: 'canvascoding/canvas-notebook', tagName: 'v2026.10.13.1', packageVersion: '2026.10.13.1', draft: false, prerelease: false,
    publishedAt: '2026-10-13T12:00:00Z', releaseUrl: 'https://github.com/canvascoding/canvas-notebook/releases/tag/v2026.10.13.1',
    commitBefore: RELEASE_COMMIT, commitAfter: RELEASE_COMMIT, requiredBackendCommit: COMMIT, requiredAncestor: true,
    sourceContracts: Object.fromEntries(SOURCES.map((name) => [name, true])), ...overrides };
}

test('checksum uses Canvas production framing, includes hidden manifest, and ignores runtime entries', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'document-suite-checksum-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await put(root, '.canvas-plugin/plugin.json', 'manifest');
  await put(root, 'z.md', 'Z');
  await put(root, 'A.md', 'A');
  await put(root, 'node_modules/ignored.txt', 'ignored');
  await put(root, '.DS_Store', 'ignored');
  const expected = createHash('sha256');
  for (const name of ['.canvas-plugin/plugin.json', 'z.md', 'A.md'].sort((a, b) => a.localeCompare(b))) expected.update(name).update('\0').update(await fs.readFile(path.join(root, name))).update('\0');
  assert.equal(await checksum(root), `sha256:${expected.digest('hex')}`);
});

test('preparation verifies offline and against the actual Seed with separate provenance', async (t) => {
  const f = await fixture(t);
  await verifyPreparedPackage({ marketplaceRoot: f.marketplaceRoot });
  await verifyPreparedPackage(f);
  assert.equal(markdownBody('---\nname: example\n---\nbody\n'), 'body\n');
});

test('stable released backend creates only expected registry entries without mutating input', async (t) => {
  const f = await fixture(t);
  const original = structuredClone(f.registry);
  const candidate = createRegistryCandidate({ ...f, releaseProof: proof(), generatedAt: '2026-10-13T14:00:00.000Z' });
  assert.deepEqual(f.registry, original);
  assert.equal(candidate.plugins[1].latestVersion, '1.4.0');
  assert.deepEqual(candidate.plugins[1].skills, [...SKILLS, 'mermaid']);
  assert.equal(candidate.plugins[1].description, f.receipt.pluginDescription);
  assert.deepEqual(candidate.skills.find((item) => item.name === 'mermaid'), original.skills.find((item) => item.name === 'mermaid'));
  assert.equal(candidate.plugins[1].versions['1.4.0'].minCanvasVersion, '2026.10.13.1');
  assert.equal(candidate.skills.find((item) => item.name === 'excalidraw-diagram').versions['1.4.0'].minCanvasVersion, '2026.10.13.1');
  assert.deepEqual(candidate.plugins[0], original.plugins[0]);
  for (const skill of SKILLS.filter((name) => name !== 'excalidraw-diagram')) assert.deepEqual(candidate.skills.find((item) => item.name === skill), original.skills.find((item) => item.name === skill));
  assert.deepEqual(candidate.plugins[1].versions['1.2.0'], original.plugins[1].versions['1.2.0']);
  assert.equal(candidate.updatedAt, '2026-10-13T14:00:00.000Z');
  assert.equal('releasedAt' in candidate.plugins[1].versions['1.4.0'], false);
  assert.equal(await fs.readFile(path.join(f.marketplaceRoot, 'registry.json'), 'utf8'), json(original));
});

test('gate rejects unavailable, old, incompatible, moved, and incomplete release proofs', async (t) => {
  const f = await fixture(t);
  const invalid = [
    { draft: true }, { prerelease: true }, { publishedAt: null }, { repository: 'other/backend' },
    { tagName: 'v2026.10.14.1' }, { packageVersion: '2026.10.12.12', tagName: 'v2026.10.12.12' },
    { packageVersion: '2026.10.11.99', tagName: 'v2026.10.11.99' },
    { packageVersion: '2026.99.13.1', tagName: 'v2026.99.13.1' },
    { releaseUrl: 'https://example.com/release' }, { commitAfter: 'c'.repeat(40) },
    { requiredBackendCommit: 'c'.repeat(40) }, { requiredAncestor: false }, { sourceContracts: {} },
  ];
  for (const change of invalid) assert.throws(() => createRegistryCandidate({ ...f, releaseProof: proof(change) }), undefined, JSON.stringify(change));
  for (const filename of SOURCES) assert.throws(() => createRegistryCandidate({ ...f, releaseProof: proof({ sourceContracts: { ...proof().sourceContracts, [filename]: false } }) }));
});

test('gate does not use preparation time as a release ordering substitute', async (t) => {
  const f = await fixture(t);
  f.receipt.preparedAt = '2099-01-01T00:00:00Z';
  assert.equal(createRegistryCandidate({ ...f, releaseProof: proof() }).plugins[1].latestVersion, '1.4.0');
});

for (const [name, mutate, message] of [
  ['immutable prior version', async (f) => put(f.marketplaceRoot, 'plugins/document-suite/1.2.0/assets/icon.svg', 'changed'), /Immutable/],
  ['changed active registry', async (f) => put(f.marketplaceRoot, 'registry.json', json({ ...f.registry, name: 'changed' })), /Active registry changed/],
  ['prepared package', async (f) => put(f.marketplaceRoot, 'plugins/document-suite/1.4.0/assets/icon.svg', 'changed'), /Prepared package checksum/],
  ['Seed helper', async (f) => put(f.notebookRoot, 'seed_skills/excalidraw-diagram/scripts/validate_excalidraw.py', '# changed'), /Actual Seed skill checksum/],
  ['guessed minimum version', async (f) => { f.receipt.minCanvasVersion = '2026.10.13.1'; await f.writeReceipt(); }, /must remain null/],
  ['symlink package file', async (f) => fs.symlink('/does-not-exist', path.join(f.marketplaceRoot, 'plugins/document-suite/1.4.0/dangling')), /symlink is forbidden/],
]) {
  test(`preparation rejects ${name}`, async (t) => {
    const f = await fixture(t);
    await mutate(f);
    await assert.rejects(verifyPreparedPackage(f), message);
  });
}

test('unchanged non-Excalidraw skills are enforced even after recomputing preparation hashes', async (t) => {
  const f = await fixture(t);
  await put(f.marketplaceRoot, 'plugins/document-suite/1.4.0/skills/pdf/SKILL.md', 'changed');
  f.receipt.skillChecksums.pdf = await checksum(path.join(f.marketplaceRoot, 'plugins/document-suite/1.4.0/skills/pdf'));
  f.receipt.checksum = await checksum(path.join(f.marketplaceRoot, f.receipt.packagePath));
  f.receipt.registryEntries.plugin.checksum = f.receipt.checksum;
  await f.writeReceipt();
  await assert.rejects(verifyPreparedPackage(f), /pdf content must remain unchanged/);
});

test('offline parity rejects a changed workflow even when the package hash was refreshed', async (t) => {
  const f = await fixture(t);
  await fs.appendFile(path.join(f.marketplaceRoot, 'plugins/document-suite/1.4.0/skills/excalidraw-diagram/SKILL.md'), '\nChanged workflow.\n');
  f.receipt.checksum = await checksum(path.join(f.marketplaceRoot, f.receipt.packagePath));
  f.receipt.skillChecksums['excalidraw-diagram'] = await checksum(path.join(f.marketplaceRoot, f.receipt.packagePath, 'skills/excalidraw-diagram'));
  await f.writeReceipt();
  await assert.rejects(verifyPreparedPackage({ marketplaceRoot: f.marketplaceRoot }), /Seed\/Marketplace workflow differs/);
});

test('bundled Mermaid must match the published standalone skill even after receipt refresh', async (t) => {
  const f = await fixture(t);
  const bundled = path.join(f.marketplaceRoot, f.receipt.packagePath, 'skills/mermaid');
  await fs.appendFile(path.join(bundled, 'SKILL.md'), '\nUnexpected different workflow.\n');
  f.receipt.skillChecksums.mermaid = await checksum(bundled);
  f.receipt.checksum = await checksum(path.join(f.marketplaceRoot, f.receipt.packagePath));
  f.receipt.registryEntries.plugin.checksum = f.receipt.checksum;
  await f.writeReceipt();
  await assert.rejects(verifyPreparedPackage(f), /Bundled Mermaid differs/);
});

test('standalone Mermaid must retain its registered checksum', async (t) => {
  const f = await fixture(t);
  await fs.appendFile(path.join(f.marketplaceRoot, 'skills/mermaid/1.0.0/SKILL.md'), '\nChanged publication.\n');
  await assert.rejects(verifyPreparedPackage(f), /Standalone Mermaid registry checksum/);
});

test('CLI refuses a caller-supplied release proof or unknown options before any GitHub call', async () => {
  const filename = fileURLToPath(new URL('./document-suite-release.mjs', import.meta.url));
  await assert.rejects(run(process.execPath, [filename, 'finalize', '--backend-release', 'v2026.10.13.1', '--proof-file', '/tmp/untrusted.json']), (error) => /Unknown or incomplete argument/.test(error.stderr));
});

async function cliFixture(t, mode = 'valid') {
  const f = await fixture(t);
  const source = fileURLToPath(new URL('./document-suite-release.mjs', import.meta.url));
  await put(f.marketplaceRoot, 'scripts/document-suite-release.mjs', await fs.readFile(source));
  const mockDirectory = path.join(f.marketplaceRoot, 'mock-bin');
  const mock = `#!/usr/bin/env node
import * as fs from 'node:fs';
const args = process.argv.slice(2);
if (args[0] !== 'api' || args[1] !== '--hostname' || args[2] !== 'github.com') throw new Error('Unexpected GitHub invocation');
const endpoint = args[3];
const mode = process.env.GATE_TEST_MODE;
fs.appendFileSync(process.env.GATE_TEST_LOG, endpoint + '\\n');
const releaseCommit = '${RELEASE_COMMIT}';
const requiredCommit = '${COMMIT}';
let result;
if (endpoint.includes('/releases/tags/')) {
  if (mode === 'unavailable') { process.stderr.write('Not found'); process.exit(1); }
  result = { tag_name: 'v2026.10.13.1', draft: mode === 'draft', prerelease: mode === 'prerelease', published_at: '2026-10-13T12:00:00Z', html_url: 'https://github.com/canvascoding/canvas-notebook/releases/tag/v2026.10.13.1' };
} else if (endpoint.includes('/git/ref/tags/')) {
  let count = Number(fs.existsSync(process.env.GATE_TEST_COUNTER) ? fs.readFileSync(process.env.GATE_TEST_COUNTER, 'utf8') : '0');
  fs.writeFileSync(process.env.GATE_TEST_COUNTER, String(++count));
  result = { object: { type: 'commit', sha: mode === 'moved' && count > 1 ? '${'c'.repeat(40)}' : releaseCommit } };
} else if (endpoint.includes('/compare/')) result = { status: 'ahead', merge_base_commit: { sha: mode === 'unrelated' ? '${'c'.repeat(40)}' : requiredCommit } };
else if (endpoint.includes('/contents/package.json')) result = JSON.stringify({ version: mode === 'old' ? '2026.10.12.12' : '2026.10.13.1' });
else if (endpoint.includes('/contents/app/lib/excalidraw-collaboration/scene-service.ts')) result = ['createExcalidrawDocument', 'getExcalidrawDocument', 'applyExcalidrawChanges'].map(name => 'export async function ' + name + '() {}').join('\\n');
else if (endpoint.includes('/contents/app/lib/')) result = mode === 'missing-contract' ? "'create_excalidraw_scene'" : "'create_excalidraw_scene' 'get_excalidraw_scene' 'edit_excalidraw_scene'";
else throw new Error('Unexpected GitHub endpoint: ' + endpoint);
process.stdout.write(typeof result === 'string' ? result : JSON.stringify(result));
`;
  // Mock only the external gh binary; finalization uses the actual CLI, verifier, and gate.
  await put(mockDirectory, 'gh', mock);
  await fs.chmod(path.join(mockDirectory, 'gh'), 0o755);
  const env = { ...process.env, PATH: `${mockDirectory}${path.delimiter}${process.env.PATH}`, GATE_TEST_MODE: mode,
    GATE_TEST_LOG: path.join(f.marketplaceRoot, 'gh.log'), GATE_TEST_COUNTER: path.join(f.marketplaceRoot, 'gh.counter') };
  const execute = () => run(process.execPath, [path.join(f.marketplaceRoot, 'scripts/document-suite-release.mjs'), 'finalize', '--backend-release', 'v2026.10.13.1', '--notebook-root', f.notebookRoot], { env });
  return { ...f, execute };
}

test('actual finalize CLI pins GitHub source reads and writes only a separate candidate and proof', async (t) => {
  const f = await cliFixture(t);
  const active = await fs.readFile(path.join(f.marketplaceRoot, 'registry.json'));
  await f.execute();
  assert.deepEqual(await fs.readFile(path.join(f.marketplaceRoot, 'registry.json')), active);
  const candidate = JSON.parse(await fs.readFile(path.join(f.marketplaceRoot, 'dist/document-suite-1.4.0.registry.json'), 'utf8'));
  const savedProof = JSON.parse(await fs.readFile(path.join(f.marketplaceRoot, 'dist/document-suite-1.4.0.release-proof.json'), 'utf8'));
  assert.equal(candidate.plugins[1].versions['1.4.0'].minCanvasVersion, '2026.10.13.1');
  assert.equal(savedProof.commitBefore, RELEASE_COMMIT);
  assert.equal(savedProof.commitAfter, RELEASE_COMMIT);
  const reads = (await fs.readFile(path.join(f.marketplaceRoot, 'gh.log'), 'utf8')).trim().split('\n');
  const sourceReads = reads.filter((endpoint) => endpoint.includes('/contents/'));
  assert.equal(sourceReads.length, 4);
  assert.ok(sourceReads.every((endpoint) => endpoint.endsWith(`?ref=${RELEASE_COMMIT}`)));
  assert.equal(reads.filter((endpoint) => endpoint.includes('/git/ref/tags/')).length, 2);
  assert.deepEqual((await fs.readdir(path.join(f.marketplaceRoot, 'dist'))).sort(), ['document-suite-1.4.0.registry.json', 'document-suite-1.4.0.release-proof.json']);
});

for (const mode of ['unavailable', 'draft', 'prerelease', 'moved', 'unrelated', 'old', 'missing-contract']) {
  test(`actual finalize CLI refuses ${mode} backend and leaves registry and candidate untouched`, async (t) => {
    const f = await cliFixture(t, mode);
    const active = await fs.readFile(path.join(f.marketplaceRoot, 'registry.json'));
    await assert.rejects(f.execute());
    assert.deepEqual(await fs.readFile(path.join(f.marketplaceRoot, 'registry.json')), active);
    await assert.rejects(fs.access(path.join(f.marketplaceRoot, 'dist')));
  });
}
