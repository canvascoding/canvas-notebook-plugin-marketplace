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
| Document Suite | 1.2.0 | PDF, PowerPoint, Excel, Word, Marp Markdown slides, and Excalidraw diagram workflows. |
| Sales Connectors Demo | 1.0.0 | Demo plugin for Composio, Canvas Email, and MCP connector recommendations. |

## Included Standalone Skills

| Skill | Version | Purpose |
| --- | --- | --- |
| Canvas Basics Check | 1.0.0 | Validate Canvas Plugin discovery, installation, references, and bundled skill loading. |
| DOCX | 1.2.0 | Create, edit, review, and verify Word-compatible documents. |
| Excalidraw Diagram | 1.2.0 | Create editable `.excalidraw` diagram files. |
| Marp Slides | 1.2.0 | Canvas-native Marp decks with preview/export guidance. |
| PDF | 1.2.0 | Read, create, extract, transform, and verify PDFs. |
| PPTX | 1.2.0 | Create, edit, review, and verify PowerPoint decks. |
| Sales Connector Readiness | 1.0.0 | Check recommended sales connector readiness. |
| XLSX | 1.2.0 | Create, edit, analyze, and verify spreadsheet workbooks. |

## Local Validation

Validation is implemented in Canvas Notebook. During development, install a plugin through the Canvas Notebook advanced local install flow or the plugin runtime test before publishing it here.
