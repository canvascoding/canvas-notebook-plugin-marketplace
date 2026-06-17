# Contributing Plugins

This repository is curated. Changes should be reviewed before merge because Canvas Notebook clients can install packages from the registry.

## Submission Checklist

- Plugin has a stable lowercase `name`.
- Plugin version is semantic, for example `1.0.0`.
- Version directory is immutable and not modified after release.
- `.canvas-plugin/plugin.json` validates against Canvas Notebook's plugin manifest rules.
- Every included skill has a valid `SKILL.md`.
- The plugin declares its license and provenance.
- Assets are owned by the contributor or licensed for redistribution.
- No secrets, tokens, private credentials, or private customer data are included.
- Registry entry includes checksum and download URL.

## Publishing Flow

1. Add the plugin package under `plugins/<name>/<version>/`.
2. Compute the package checksum using Canvas Notebook tooling.
3. Add or update the plugin entry in `registry.json`.
4. Open a pull request with a short summary, provenance notes, and validation output.

Do not overwrite an existing version directory. Publish a new version instead.

