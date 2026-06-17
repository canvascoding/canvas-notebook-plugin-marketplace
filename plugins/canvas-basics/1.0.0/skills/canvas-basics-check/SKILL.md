---
name: canvas-basics-check
description: "Use this skill when you need to verify that Canvas Plugin discovery, installation, skill loading, and plugin references are working."
license: "MIT"
metadata:
  version: "1.0.0"
---

# Canvas Basics Check

Use this skill as a lightweight validation workflow for Canvas Plugins.

When invoked:

1. Confirm that the `canvas-basics` plugin is available.
2. Confirm that this bundled skill can be referenced by name.
3. Report whether plugin metadata, icon rendering, and skill loading appear available in the current UI/runtime context.
4. If something is missing, describe the missing integration point directly.

Do not perform external network calls or modify files for this check.

