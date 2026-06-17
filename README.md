# Canvas Notebook Plugin Marketplace

Official plugin marketplace registry for Canvas Notebook.

This repository is the first public registry source for Canvas Plugins. Canvas Notebook can read `registry.json`, show available plugins in the app, and install versioned plugin packages from this repository.

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
```

Plugin versions are immutable. To publish an update, add a new version directory such as `plugins/example/1.1.0/` and update `registry.json`.

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

## Included Plugins

| Plugin | Version | Purpose |
| --- | --- | --- |
| Canvas Basics | 1.0.0 | Smoke-test plugin for Canvas Plugin installation, discovery, icons, and bundled skills. |
| Sales Connectors Demo | 1.0.0 | Demo plugin for Composio, Canvas Email, and MCP connector recommendations. |

## Local Validation

Validation is implemented in Canvas Notebook. During development, install a plugin through the Canvas Notebook advanced local install flow or the plugin runtime test before publishing it here.
