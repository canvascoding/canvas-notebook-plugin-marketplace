# Mermaid syntax: tested examples

The examples below are original fixtures parsed with Mermaid **11.16.1**. Their successful parsing is not a visual layout or PDF acceptance test. Pick the relevant example; keep declarations from different diagram types in separate blocks.

## Markdown wrapper

Use an opening fence of three backticks followed by `mermaid`, then the definition, then a closing fence. Use a longer outer fence if showing an example that itself contains fences. Keep Markdown headings, prose, and document YAML frontmatter outside the diagram block. Comment lines inside Mermaid start with `%%`.

## Processes and architecture: flowchart

`LR` means left to right; `TD` means top down. IDs and display labels are separate. A diamond expresses a decision and edge labels explain its branches.

```mermaid
flowchart LR
    accTitle: Document saving
    accDescr: A request is checked and either saved or returned for correction.
    request["Save request"] --> validate{"Valid document?"}
    validate -->|Yes| saved["Saved"]
    validate -->|No| correction["Correct input"]
    correction --> request
```

Use `subgraph group_id["Group label"]` and its own closing `end` for grouping. Avoid lowercase `end` as a flowchart node ID. Node labels containing punctuation or non-ASCII characters should be quoted, for example `review["Prüfung (Schritt 2)"]`. For quotes inside a flowchart label, an entity such as `#quot;` avoids breaking the surrounding quotes. Plain labels are the safest portable default; do not insert HTML or assume Markdown formatting works identically in every diagram type.

## Exchanges over time: sequence

Declare participants with simple identifiers and descriptive aliases. `->>` is a message and `-->>` a dashed response. Close `alt`, `opt`, `loop`, and `par` blocks with `end`; keep activation/deactivation balanced if using them.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Canvas API
    U->>A: Save document
    alt Revision matches
        A-->>U: Saved
    else Revision changed
        A-->>U: Read current document
    end
```

## Data relationships: ER

`||` denotes exactly one; `o{` denotes zero or more on that end. Name both entities and label the relationship. Entity attributes are optional and use `type name`, with optional `PK` or `FK` markers.

```mermaid
erDiagram
    WORKSPACE ||--o{ DOCUMENT : contains
    WORKSPACE {
        string id PK
        string title
    }
    DOCUMENT {
        string id PK
        string workspace_id FK
        string title
    }
```

## Schedule: Gantt

Set a matching `dateFormat`. Use unique task IDs when referring to another task with `after`. Dates here are illustrative; replace them with the user's actual schedule.

```mermaid
gantt
    title Documentation work
    dateFormat YYYY-MM-DD
    section Preparation
    Inspect sources :inspect, 2026-10-14, 1d
    Write examples :examples, after inspect, 2d
    section Review
    Check result :review, after examples, 1d
```

## Parts of a whole: pie

Use quoted labels and numeric values separated by a colon. A pie is appropriate for nonnegative parts of a meaningful whole; do not use it for unrelated metrics or values on incompatible scales.

```mermaid
pie showData
    title Requests by device
    "Desktop" : 60
    "Mobile" : 30
    "Tablet" : 10
```

## Simple numeric data: XY chart

Use `xychart-beta` for this tested version. A categorical x-axis lists categories in order; each series lists the corresponding numeric values in the same order. Use one value per category for this simple pattern. Choose a y-axis range that includes all values and label its unit.

```mermaid
xychart-beta
    title "Revenue by quarter"
    x-axis ["Q1", "Q2", "Q3", "Q4"]
    y-axis "Revenue (EUR)" 0 --> 3000
    bar [1200, 1850, 2400, 2100]
    line [1000, 1700, 2200, 2500]
```

This example compares actual revenue (bars) with target revenue (line); explain that mapping in surrounding prose. Named-series legend syntax from newer documentation is not part of these 11.16.1 examples. Do not imply that Canvas zoom/pan provides filtering or linked data selections. More advanced statistical plots or interactive analysis may need a different capability that is actually available.

## Official references

- [Flowcharts](https://mermaid.js.org/syntax/flowchart.html)
- [Sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [Entity relationships](https://mermaid.js.org/syntax/entityRelationshipDiagram.html)
- [Gantt](https://mermaid.js.org/syntax/gantt.html)
- [Pie](https://mermaid.js.org/syntax/pie.html)
- [XY Chart](https://mermaid.js.org/syntax/xyChart.html)
- [Accessible titles and descriptions](https://mermaid.js.org/config/accessibility.html)

These are live upstream pages and can document features newer than Canvas's installed Mermaid. Prefer the tested examples unless the newer feature has been checked against the current backend.
