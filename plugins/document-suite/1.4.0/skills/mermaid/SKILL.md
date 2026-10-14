---
name: mermaid
description: Create, edit, explain, or repair Mermaid code in Canvas Markdown documents and chat. Use for explicit Mermaid requests and embedded flowcharts, sequence diagrams, entity relationships, timelines, or simple bar/line charts. For a requested editable Excalidraw canvas, use the available Excalidraw workflow instead.
license: MIT
metadata:
  version: "1.0.0"
  testedMermaidVersion: "11.16.1"
---

# Mermaid in Canvas

Use Mermaid when a compact diagram makes a process, relationship, schedule, or simple dataset easier to understand. Respect a requested output format. Keep ordinary text or a table when it communicates the information more clearly.

## Choose and read the relevant syntax

Read [references/syntax.md](references/syntax.md) for the chosen diagram type: flowchart, sequence, ER, Gantt, pie, or XY chart. It contains examples tested with Mermaid 11.16.1, the version in Canvas backend v2026.10.12.12. Newer online documentation may describe unsupported features; check compatibility before adopting them.

Read [references/troubleshooting.md](references/troubleshooting.md) when repairing a diagram or interpreting a validation/rendering failure. Do not load every reference for an unrelated task.

## Author and save

- In Markdown, use a fenced code block whose language is exactly `mermaid`. Its body starts with the diagram declaration, such as `flowchart LR` or `sequenceDiagram`. `mermaid` is the fence language, not a declaration inside the body.
- For a chat answer, return the block directly. For a requested saved document, use the available Canvas create/edit tools in the selected workspace. A diagram does not require a separate `.mmd`, SVG, HTML, or Excalidraw file unless requested.
- For an existing document, read its current source, preserve surrounding content and metadata, and make the intended change through the normal revision-aware document tools. Do not overwrite a live document through shell or filesystem writes.
- Keep node IDs stable and simple, such as `request`, `validate`, and `saved`; put human-readable text in quoted labels. Escape special characters using the syntax reference. Choose an appropriate direction and short labels; split an unreadably large diagram into useful smaller diagrams.
- Use actual source facts and supplied data. Do not invent measurements or relationships to fill a chart. Label units and explain important limitations in nearby prose.
- Canvas renders Mermaid with `securityLevel: strict`. Do not depend on JavaScript callbacks, raw HTML, or interactive `click` directives; do not weaken security settings or load external diagram libraries to make a diagram work.
- Canvas can preview Mermaid and export diagrams through its existing PDF workflow. Preview availability and appearance still depend on the installed backend and diagram syntax. Do not claim a successful visual or PDF check without performing it.

## Check and repair

Inspect the actual tool outcome first: applied content, unchanged content, and a proposal awaiting review are different results. If a tool returns diagram diagnostics, use their block reference and the complete resulting block to make a focused correction with the existing edit tool. A diagnostic alone is not a reason to replay a successful write. Re-read when the document revision or result is uncertain.

This skill does **not** install automatic Mermaid validation in Canvas. Some backends show errors only during preview or export. Do not claim that saving proves valid Mermaid syntax, and do not assume a particular diagnostic response field exists. `mermaid.parse()` is the official syntax-only API when an authorized execution environment already provides the matching library; it is not a separate Canvas tool. Successful parsing does not prove correct data, readable layout, or successful rendering.

For an invalid diagram, retain useful user content and correct the smallest supported cause. Report a remaining unsupported feature or rendering problem plainly rather than silently replacing the requested artifact.
