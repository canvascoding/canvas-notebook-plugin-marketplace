import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const VERSION = '1.4.0';
const REPOSITORY = 'canvascoding/canvas-notebook';
const BASELINE = '2026.10.12.12';
const BASE_SKILLS = ['docx', 'excalidraw-diagram', 'marp-slides', 'pdf', 'pptx', 'xlsx'];
const SKILLS = [...BASE_SKILLS, 'mermaid'];
const TOOLS = ['create_excalidraw_scene', 'get_excalidraw_scene', 'edit_excalidraw_scene'];
const IGNORED = new Set(['.git', 'node_modules', '.DS_Store']);
const SOURCES = {
  scene: 'app/lib/excalidraw-collaboration/scene-service.ts',
  pi: 'app/lib/pi/core-tools.ts',
  mcp: 'app/lib/mcp/server/excalidraw-tools.ts',
};

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

export function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function files(root, current = root) {
  const result = [];
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    requireCondition(!entry.isSymbolicLink(), `Package symlink is forbidden: ${path.relative(root, path.join(current, entry.name))}`);
    if (IGNORED.has(entry.name)) continue;
    const filename = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, filename));
    else if (entry.isFile()) result.push(path.relative(root, filename));
    else throw new Error(`Package contains a non-regular file: ${filename}`);
  }
  return result.sort((left, right) => left.localeCompare(right));
}

// Keep this byte framing and ordering identical to computeCanvasPluginChecksum.
export async function checksum(root) {
  requireCondition(!(await fs.lstat(root)).isSymbolicLink(), `Package root symlink is forbidden: ${root}`);
  const hash = createHash('sha256');
  for (const filename of await files(root)) {
    hash.update(filename);
    hash.update('\0');
    hash.update(await fs.readFile(path.join(root, filename)));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

export function markdownBody(text) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  requireCondition(match, 'SKILL.md must have YAML frontmatter');
  return text.slice(match[0].length);
}

const readJson = async (filename) => JSON.parse(await fs.readFile(filename, 'utf8'));
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export async function verifyPreparedPackage({ marketplaceRoot, notebookRoot }) {
  marketplaceRoot = path.resolve(marketplaceRoot);
  const receipt = await readJson(path.join(marketplaceRoot, 'prepared/document-suite-1.4.0.json'));
  requireCondition(receipt.schemaVersion === 1 && receipt.status === 'prepared', 'Expected a prepared receipt');
  requireCondition(receipt.name === 'document-suite' && receipt.version === VERSION && receipt.basedOnVersion === '1.2.0', 'Unexpected package identity');
  requireCondition(receipt.packagePath === `plugins/document-suite/${VERSION}`, 'Unexpected prepared package path');
  requireCondition(receipt.minCanvasVersion === null, 'Prepared minimum version must remain null until backend release verification');
  requireCondition(receipt.backendRepository === REPOSITORY && receipt.publishedBaselineVersion === BASELINE, 'Unexpected backend release policy');
  requireCondition(/^[a-f0-9]{40}$/.test(receipt.requiredBackendCommit), 'Missing exact required backend commit');
  const registryBytes = await fs.readFile(path.join(marketplaceRoot, 'registry.json'));
  requireCondition(sha256(registryBytes) === receipt.registryChecksum, 'Active registry changed after preparation');
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const plugin = registry.plugins.find((entry) => entry.name === 'document-suite');
  requireCondition(plugin?.latestVersion === '1.2.0' && !plugin.versions[VERSION], 'Prepared package must not be active');
  for (const version of ['1.1.0', '1.2.0']) {
    requireCondition(await checksum(path.join(marketplaceRoot, `plugins/document-suite/${version}`)) === plugin.versions[version]?.checksum, `Immutable document-suite ${version} changed`);
    for (const skill of BASE_SKILLS) {
      const entry = registry.skills.find((item) => item.name === skill);
      requireCondition(await checksum(path.join(marketplaceRoot, `plugins/document-suite/${version}/skills/${skill}`)) === entry?.versions[version]?.checksum, `Immutable ${skill} ${version} changed`);
    }
  }
  const packageRoot = path.join(marketplaceRoot, receipt.packagePath);
  requireCondition(await checksum(packageRoot) === receipt.checksum, 'Prepared package checksum mismatch');
  const manifest = await readJson(path.join(packageRoot, '.canvas-plugin/plugin.json'));
  requireCondition(manifest.name === 'document-suite' && manifest.version === VERSION && manifest.license === 'MIT', 'Invalid Marketplace manifest identity or license');
  requireCondition(typeof receipt.pluginDescription === 'string' && receipt.pluginDescription === manifest.description, 'Prepared plugin description mismatch');
  requireCondition(equal((await fs.readdir(path.join(packageRoot, 'skills'))).sort(), [...SKILLS].sort()), 'Unexpected bundled skill set');
  requireCondition(equal(Object.keys(receipt.skillChecksums).sort(), [...SKILLS].sort()), 'Missing skill checksums');
  for (const skill of SKILLS) {
    const skillRoot = path.join(packageRoot, 'skills', skill);
    requireCondition(await checksum(skillRoot) === receipt.skillChecksums[skill], `${skill} checksum mismatch`);
    if (BASE_SKILLS.includes(skill) && skill !== 'excalidraw-diagram') {
      requireCondition(await checksum(skillRoot) === await checksum(path.join(marketplaceRoot, 'plugins/document-suite/1.2.0/skills', skill)), `${skill} content must remain unchanged from 1.2.0`);
    }
  }
  const mermaidRoot = path.join(marketplaceRoot, 'skills/mermaid/1.0.0');
  const mermaidEntry = registry.skills.find((entry) => entry.name === 'mermaid');
  const mermaidChecksum = await checksum(mermaidRoot);
  requireCondition(mermaidEntry?.latestVersion === '1.0.0' && mermaidEntry.versions?.['1.0.0']?.checksum === mermaidChecksum,
    'Standalone Mermaid registry checksum mismatch');
  requireCondition(receipt.skillChecksums.mermaid === mermaidChecksum, 'Bundled Mermaid differs from its published standalone skill');
  const excalidrawRoot = path.join(packageRoot, 'skills/excalidraw-diagram');
  const skillText = await fs.readFile(path.join(excalidrawRoot, 'SKILL.md'), 'utf8');
  const frontmatter = skillText.slice(0, skillText.length - markdownBody(skillText).length);
  requireCondition(frontmatter.includes('license: "MIT"') && frontmatter.includes(`version: "${VERSION}"`), 'Marketplace skill license/version metadata missing');
  requireCondition(frontmatter.includes(`description: ${receipt.excalidrawDescription}\n`), 'Prepared skill description mismatch');
  requireCondition(sha256(markdownBody(skillText)) === receipt.seed.workflowChecksum, 'Seed/Marketplace workflow differs');
  const helperFiles = (await files(excalidrawRoot)).filter((name) => name !== 'SKILL.md');
  requireCondition(equal(helperFiles, Object.keys(receipt.seed.helperChecksums).sort((a, b) => a.localeCompare(b))), 'Unexpected Excalidraw helpers');
  for (const helper of helperFiles) {
    requireCondition(sha256(await fs.readFile(path.join(excalidrawRoot, helper))) === receipt.seed.helperChecksums[helper], `Seed/Marketplace helper differs: ${helper}`);
  }
  requireCondition(receipt.registryEntries.plugin.checksum === receipt.checksum && receipt.registryEntries.skill.checksum === receipt.skillChecksums['excalidraw-diagram'], 'Prepared registry checksums mismatch');
  requireCondition(equal(Object.keys(receipt.registryEntries).sort(), ['plugin', 'skill']), 'Unexpected prepared registry entries');
  for (const [kind, entry] of Object.entries(receipt.registryEntries)) {
    requireCondition(entry.version === VERSION && !('minCanvasVersion' in entry) && !('releasedAt' in entry), `Prepared ${kind} registry metadata must not claim a release`);
    requireCondition(entry.downloadUrl === `https://github.com/canvascoding/canvas-notebook-plugin-marketplace/archive/refs/tags/document-suite-v${VERSION}.zip`, `Unexpected ${kind} archive URL`);
    const expectedPath = `canvas-notebook-plugin-marketplace-document-suite-v${VERSION}/${receipt.packagePath}${kind === 'skill' ? '/skills/excalidraw-diagram' : ''}`;
    requireCondition(entry.packagePath === expectedPath, `Unexpected ${kind} archive package path`);
  }
  requireCondition(receipt.registryEntries.plugin.manifestPath === '.canvas-plugin/plugin.json', 'Unexpected manifest path');
  if (notebookRoot) {
    const seedPlugin = path.join(notebookRoot, 'seed_plugins/document-suite');
    const seedSkill = path.join(notebookRoot, 'seed_skills/excalidraw-diagram');
    requireCondition(await checksum(seedPlugin) === receipt.seed.pluginChecksum, 'Actual Seed plugin checksum mismatch');
    requireCondition(await checksum(seedSkill) === receipt.seed.skillChecksum, 'Actual Seed skill checksum mismatch');
    const seedManifest = await readJson(path.join(seedPlugin, '.canvas-plugin/plugin.json'));
    requireCondition(seedManifest.version === VERSION && seedManifest.source === 'seed' && seedManifest.license === 'Canvas Notebook Sustainable Use License', 'Seed provenance/license must remain separate');
    const seedText = await fs.readFile(path.join(seedSkill, 'SKILL.md'), 'utf8');
    requireCondition(markdownBody(seedText) === markdownBody(skillText), 'Actual Seed workflow differs');
    requireCondition(equal(await files(seedSkill), await files(excalidrawRoot)), 'Actual Seed helper tree differs');
    for (const helper of helperFiles) {
      requireCondition((await fs.readFile(path.join(seedSkill, helper))).equals(await fs.readFile(path.join(excalidrawRoot, helper))), `Actual Seed helper differs: ${helper}`);
    }
  }
  return { receipt, registry };
}

function parseBackendVersion(version) {
  requireCondition(/^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(version), 'Backend release must use the exact Canvas date version');
  const parts = version.split('.').map(Number);
  requireCondition(parts.every(Number.isSafeInteger), 'Invalid backend version number');
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  requireCondition(date.getUTCFullYear() === parts[0] && date.getUTCMonth() + 1 === parts[1] && date.getUTCDate() === parts[2], 'Invalid backend release date version');
  return parts;
}

function newerThan(version, baseline) {
  const left = parseBackendVersion(version);
  const right = parseBackendVersion(baseline);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return left[i] > right[i];
  return false;
}

// This pure function accepts test proofs. The CLI never accepts a proof file or user-provided proof.
export function createRegistryCandidate({ registry, receipt, releaseProof, generatedAt = new Date().toISOString() }) {
  const proof = releaseProof;
  requireCondition(proof.repository === REPOSITORY && receipt.backendRepository === REPOSITORY, 'Wrong backend repository');
  requireCondition(proof.draft === false && proof.prerelease === false && Number.isFinite(Date.parse(proof.publishedAt)), 'Backend release is not a published stable release');
  requireCondition(proof.tagName === `v${proof.packageVersion}`, 'Release tag does not match backend package version');
  requireCondition(newerThan(proof.packageVersion, receipt.publishedBaselineVersion) && receipt.publishedBaselineVersion === BASELINE, 'Backend release does not include the new generation');
  requireCondition(proof.releaseUrl === `https://github.com/${REPOSITORY}/releases/tag/${proof.tagName}`, 'Unexpected backend release URL');
  requireCondition(/^[a-f0-9]{40}$/.test(proof.commitBefore) && proof.commitBefore === proof.commitAfter, 'Backend tag moved during verification');
  requireCondition(proof.requiredBackendCommit === receipt.requiredBackendCommit && proof.requiredAncestor === true, 'Backend release does not contain the required implementation');
  requireCondition(Object.values(SOURCES).every((filename) => proof.sourceContracts?.[filename] === true), 'Backend release lacks Scene/Pi/MCP contracts');
  requireCondition(receipt.minCanvasVersion === null && receipt.version === VERSION, 'Expected unfinalized prepared package');
  requireCondition(Number.isFinite(Date.parse(generatedAt)), 'Invalid candidate generation timestamp');
  const candidate = structuredClone(registry);
  candidate.updatedAt = generatedAt;
  const plugin = candidate.plugins.find((entry) => entry.name === 'document-suite');
  const skill = candidate.skills.find((entry) => entry.name === 'excalidraw-diagram');
  requireCondition(plugin && skill && !plugin.versions[VERSION] && !skill.versions[VERSION], 'Package already registered or registry entries missing');
  plugin.latestVersion = VERSION;
  plugin.skills = [...SKILLS];
  plugin.description = receipt.pluginDescription;
  plugin.icon = `plugins/document-suite/${VERSION}/assets/icon.svg`;
  plugin.versions[VERSION] = { ...receipt.registryEntries.plugin, minCanvasVersion: proof.packageVersion };
  skill.latestVersion = VERSION;
  skill.description = receipt.excalidrawDescription;
  skill.sourcePlugin.version = VERSION;
  skill.versions[VERSION] = { ...receipt.registryEntries.skill, minCanvasVersion: proof.packageVersion };
  return candidate;
}

async function github(endpoint, raw = false) {
  const args = ['api', '--hostname', 'github.com', endpoint];
  if (raw) args.push('-H', 'Accept: application/vnd.github.raw+json');
  const { stdout } = await run('gh', args, { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024, timeout: 30000 });
  return raw ? stdout : JSON.parse(stdout);
}

async function tagCommit(tag) {
  let object = (await github(`repos/${REPOSITORY}/git/ref/tags/${encodeURIComponent(tag)}`)).object;
  for (let i = 0; object?.type === 'tag' && i < 5; i++) object = (await github(`repos/${REPOSITORY}/git/tags/${object.sha}`)).object;
  requireCondition(object?.type === 'commit' && /^[a-f0-9]{40}$/.test(object.sha), 'Tag does not resolve to a commit');
  return object.sha;
}

async function fetchReleaseProof(receipt, tagName) {
  requireCondition(/^v\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(tagName), 'Use an exact vDATE backend release tag');
  const release = await github(`repos/${REPOSITORY}/releases/tags/${encodeURIComponent(tagName)}`);
  requireCondition(release.tag_name === tagName && release.draft === false && release.prerelease === false && release.published_at, 'Backend release is not publicly available and stable');
  const commitBefore = await tagCommit(tagName);
  const comparison = await github(`repos/${REPOSITORY}/compare/${receipt.requiredBackendCommit}...${commitBefore}`);
  const requiredAncestor = ['ahead', 'identical'].includes(comparison.status) && comparison.merge_base_commit?.sha === receipt.requiredBackendCommit;
  const packageJson = JSON.parse(await github(`repos/${REPOSITORY}/contents/package.json?ref=${commitBefore}`, true));
  const sourceContracts = {};
  for (const [kind, filename] of Object.entries(SOURCES)) {
    const source = await github(`repos/${REPOSITORY}/contents/${filename}?ref=${commitBefore}`, true);
    sourceContracts[filename] = kind === 'scene'
      ? ['createExcalidrawDocument', 'getExcalidrawDocument', 'applyExcalidrawChanges'].every((name) => new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`).test(source))
      : TOOLS.every((name) => source.includes(`'${name}'`));
  }
  const commitAfter = await tagCommit(tagName);
  return {
    repository: REPOSITORY, tagName, draft: release.draft, prerelease: release.prerelease,
    publishedAt: release.published_at, releaseUrl: release.html_url, commitBefore, commitAfter,
    requiredBackendCommit: receipt.requiredBackendCommit, requiredAncestor,
    packageVersion: packageJson.version, sourceContracts,
  };
}

async function writeCandidate(root, filename, value) {
  const dir = path.join(root, 'dist');
  await fs.mkdir(dir, { recursive: true });
  requireCondition(!(await fs.lstat(dir)).isSymbolicLink(), 'dist must not be a symlink');
  const target = path.join(dir, filename);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(temporary, target);
  } finally {
    await fs.unlink(temporary).catch(() => {});
  }
  return target;
}

async function main(args) {
  const command = args.shift();
  requireCondition(['verify', 'finalize'].includes(command), 'Usage: document-suite-release.mjs verify|finalize [--notebook-root PATH] [--backend-release vDATE]');
  let notebookRoot;
  let tag;
  while (args.length) {
    const option = args.shift();
    requireCondition(['--notebook-root', '--backend-release'].includes(option) && args.length, `Unknown or incomplete argument: ${option}`);
    if (option === '--notebook-root') { requireCondition(!notebookRoot, 'Duplicate notebook root'); notebookRoot = args.shift(); }
    else { requireCondition(!tag, 'Duplicate backend release'); tag = args.shift(); }
  }
  requireCondition(command === 'finalize' ? Boolean(tag) : !tag, 'Only finalize accepts and requires --backend-release');
  const marketplaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const verified = await verifyPreparedPackage({ marketplaceRoot, notebookRoot });
  if (command === 'verify') { console.log('Document Suite 1.4.0 preparation verified; active registry unchanged.'); return; }
  const releaseProof = await fetchReleaseProof(verified.receipt, tag);
  const finalVerified = await verifyPreparedPackage({ marketplaceRoot, notebookRoot });
  requireCondition(equal(finalVerified.receipt, verified.receipt), 'Preparation changed during backend release verification');
  const candidate = createRegistryCandidate({ ...finalVerified, releaseProof });
  const filename = await writeCandidate(marketplaceRoot, 'document-suite-1.4.0.registry.json', candidate);
  await writeCandidate(marketplaceRoot, 'document-suite-1.4.0.release-proof.json', releaseProof);
  console.log(`Verified backend ${releaseProof.tagName}; registry candidate: ${filename}. Active registry unchanged.`);
}

if (process.argv[1] && await fs.realpath(path.resolve(process.argv[1])).catch(() => '') === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
