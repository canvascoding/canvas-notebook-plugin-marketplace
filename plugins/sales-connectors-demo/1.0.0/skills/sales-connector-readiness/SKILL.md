---
name: sales-connector-readiness
description: "Use this skill to review whether recommended sales connectors are available before running sales workflows."
license: "MIT"
metadata:
  version: "1.0.0"
---

# Sales Connector Readiness

Use this skill to inspect readiness for sales workflows that depend on optional connector recommendations.

When invoked:

1. Check whether the Sales Connectors Demo plugin is available.
2. Review recommended connector categories: Composio CRM, Canvas Email, and MCP research tools.
3. Explain that connector setup is user-controlled and never automatic.
4. If connector status is unavailable, tell the user which Settings area to open.

Do not install connectors or write configuration files automatically.

