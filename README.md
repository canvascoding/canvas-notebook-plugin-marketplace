# Canvas Notebook Plugin Marketplace

Official plugin marketplace registry for Canvas Notebook.

This repository is the first public registry source for Canvas Plugins. Canvas Notebook can read `registry.json`, show available plugins in the app, and install versioned plugin packages from this repository.
The same registry also publishes curated standalone Canvas Skills for the Skill Library. Most standalone skill entries are sourced from plugin skill folders and point to a skill subdirectory inside the plugin archive.

## Repository Layout

```text
registry.json
schemas/
  registry.schema.json
plugins/
  plugin-name/
    1.0.0/
      .canvas-plugin/
        plugin.json
      skills/
      assets/
skills/
  skill-name/
    1.0.0/
      SKILL.md
      agents/
```

Plugin and skill versions are immutable. To publish an update, add a new version directory such as `plugins/example/1.1.0/` or `skills/example-skill/1.1.0/` and update `registry.json`.
Standalone skill entries may either point at `skills/<skill-name>/<version>/` or at a curated `plugins/<plugin>/<version>/skills/<skill-name>/` path through `sourcePlugin`.

## Registry Sources

Canvas Notebook treats this repository as the official source:

```text
https://raw.githubusercontent.com/canvascoding/canvas-notebook-plugin-marketplace/main/registry.json
```

Additional third-party registries can use the same schema.

## Plugin Requirements

Every plugin package must include:

- `.canvas-plugin/plugin.json`
- one or more skills under the package's `skills` directory
- explicit license metadata in the plugin manifest
- no secrets, tokens, private keys, or customer data
- checksums in `registry.json` for install verification

Connector metadata may reference MCP servers or Composio toolkits, but secrets must stay in Canvas Notebook's integration settings.

Every standalone skill package must include:

- `SKILL.md` at the package root
- optional Canvas UI metadata in `agents/canvas.yaml`
- explicit license metadata in `SKILL.md`
- no secrets, tokens, private keys, or customer data
- checksums in `registry.json` for install verification

## Included Plugins

| Plugin | Version | Purpose |
| --- | --- | --- |
| Canvas Basics | 1.0.0 | Smoke-test plugin for Canvas Plugin installation, discovery, icons, and bundled skills. |
| Document Suite | 1.4.0 | PDF, PowerPoint, Excel, Word, Marp slides, Mermaid, and Excalidraw. Excalidraw requires the updated Scene-Service backend. |
| Sales Connectors Demo | 1.0.0 | Demo plugin for Composio, Canvas Email, and MCP connector recommendations. |

## Included Standalone Skills

| Skill | Version | Purpose |
| --- | --- | --- |
| Canvas Basics Check | 1.0.0 | Validate Canvas Plugin discovery, installation, references, and bundled skill loading. |
| DOCX | 1.2.0 | Create, edit, review, and verify Word-compatible documents. |
| Excalidraw Diagram | 1.4.0 | Create editable diagrams through the updated Canvas Scene-Service tools. |
| Marp Slides | 1.2.0 | Canvas-native Marp decks with preview/export guidance. |
| Mermaid | 1.0.0 | On-demand Mermaid authoring, syntax examples, and focused error correction in Canvas Markdown. |
| PDF | 1.2.0 | Read, create, extract, transform, and verify PDFs. |
| PPTX | 1.2.0 | Create, edit, review, and verify PowerPoint decks. |
| Sales Connector Readiness | 1.0.0 | Check recommended sales connector readiness. |
| XLSX | 1.2.0 | Create, edit, analyze, and verify spreadsheet workbooks. |

## Local Validation

Validation is implemented in Canvas Notebook. During development, install a plugin through the Canvas Notebook advanced local install flow or the plugin runtime test before publishing it here.

### Published Document Suite 1.4.0

`plugins/document-suite/1.4.0/` is the active Marketplace package, distributed through `document-suite-v1.4.0`. It includes the exact standalone Mermaid 1.0.0 package and the Excalidraw Scene-Service workflow. The other bundled skills retain their existing 1.2.0 content and independent skill versions; publishing the plugin does not require pretending those unchanged skills have new versions. Published 1.1.0/1.2.0 packages and the existing Mermaid 1.0.0 publication remain unchanged.

**Backend update required for Excalidraw:** version 1.4.0 is explicitly published ahead of the backend update. The Excalidraw workflow needs `create_excalidraw_scene`, `get_excalidraw_scene`, and `edit_excalidraw_scene` and PostgreSQL. Update the backend before using it. If those tools are absent, the skill reports the missing capability; it must not substitute raw file writes. Mermaid and the other document skills do not depend on these Scene-Service tools.

[`releases/document-suite-1.4.0.json`](releases/document-suite-1.4.0.json) records this publication mode, exact package/registry checksums and backend requirements. Its backend release and minimum version remain `null`: the registry does not invent a future release number or claim compatibility with the older backend. Instead the requirement is visible in the plugin and Excalidraw skill descriptions and version notes. Installation is available before the backend update; successful installation does not prove the new Excalidraw tools are present.

The original `prepared/document-suite-1.4.0.json` remains as package provenance and Excalidraw Seed workflow/helper evidence. Its older registry checksum describes preparation, not the current published registry. The verifier accepts the published registry only with a matching publication record and the explicit backend notice. This release does not change Notebook source, prompts, seeds, installed user packages, or organization policy.

### Mermaid 1.0.0

`skills/mermaid/1.0.0/` is the standalone source, published through the immutable `mermaid-v1.0.0` archive tag. The skill is compatible with Canvas backend `v2026.10.12.12` and its Mermaid `11.16.1`. It explains diagram selection, Markdown fences, six diagram types, version limitations, and focused repair. `references/` supplies detail only when needed; the skill entrypoint and description support the existing on-demand skill loader. Automatic central Mermaid validation is a separate backend feature and is not promised by this instruction package.

For standard availability in a future Notebook release, add `mermaid` to its seed Document Suite skill references and distribute the same skill content. The fixed Markdown prompt should briefly recommend considering Mermaid for suitable visualizations and reading the available skill for explicit Mermaid operations. Specialized-agent selection and organization policies still apply. This Marketplace-only change does not modify Notebook prompts, seeds, user installations, or policies.

Parse the original examples without starting a browser, using a validation project with `mermaid@11.16.1`, `jsdom@26.1.0` and `mdast-util-from-markdown@2.0.3` installed:

```sh
MERMAID_VALIDATION_PROJECT=/absolute/path/to/validation-project node --test scripts/mermaid-skill.test.mjs
```

CI installs these dependencies in its temporary directory. Syntax tests are distinct from UI, layout and PDF acceptance. The prepared package verifier also rejects drift between the standalone Mermaid publication and its bundled copy.

### Document Suite verification

Verify the published packages, compatibility notice, and offline release gates:

```sh
node scripts/document-suite-release.mjs verify
node --test scripts/document-suite-release.test.mjs
```

For an actual Seed comparison, use the current Notebook checkout:

```sh
node scripts/document-suite-release.mjs verify --notebook-root /path/to/canvas-notebook
```

This optional Notebook comparison covers the original Excalidraw seed workflow and helpers. The Marketplace now additionally contains Mermaid; adopting it into Notebook defaults is a separate source change.

The earlier `finalize --backend-release` path remains tested for strict backend-verified preparation, including source contracts and tag stability. It refuses to replace the already published 1.4.0 metadata. The explicitly authorized Marketplace-before-backend publication is recorded separately and does not fabricate a passing backend-release proof.

Treat the released package and tag as immutable. Any future package content change needs a new plugin version; do not move the tag or silently rewrite 1.4.0 after the backend is updated.
