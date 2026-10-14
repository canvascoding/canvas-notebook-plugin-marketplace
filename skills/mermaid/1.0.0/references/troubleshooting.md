# Diagnose a Mermaid failure

Work from the **complete current diagram block** and its actual error, not only the text fragment that was inserted. Preserve the Markdown wrapper and unrelated document content.

| Symptom | Check and correction |
| --- | --- |
| Diagram shown as ordinary code | Verify the Markdown fence language is `mermaid`, the fence is balanced, and the target surface supports Mermaid preview. |
| Unknown diagram type | Check the first declaration and installed Mermaid version. Do not mix `flowchart`, `sequenceDiagram`, and chart syntax inside one block. |
| Unexpected token or missing terminator | Check quoted labels, square/round/curly brackets and required `end` delimiters. The reported token may follow the actual missing delimiter. |
| Flowchart fails around a label | Keep the identifier simple and put punctuation/Unicode in a quoted label. Use `End` instead of a lowercase `end` node ID. For an embedded quote use a Mermaid entity such as `#quot;`. |
| Sequence block fails | Check `alt`/`else`/`end`, participant names, and balanced activation/deactivation. Mermaid keywords in message text may need rewording or escaping. |
| XY chart looks misleading despite valid syntax | Check category/value order, series lengths, units and the y-axis range. Explain which series is a bar or line. Parsing cannot verify that values represent the intended facts. |
| New syntax from online examples fails | Use a tested equivalent or verify the feature against the exact installed version. Do not upgrade or replace Canvas libraries as part of ordinary document editing. |
| Parse succeeds but preview/export fails | Treat this as a separate rendering, layout, resource, or surface-support problem. Report the actual failure and retain the code; valid syntax alone is not proof of a working output. |

When a Canvas write result includes a syntax warning, keep its operation outcome distinct: a saved document with a bad diagram is still saved; a review proposal is not applied. Correct the diagram through the existing edit tools. Do not replay a successful create/write simply because a warning was returned. Re-read before editing if the state may have changed.

Some backends do not return automatic diagram diagnostics. In that case inspect the preview error or, when an authorized environment already has the matching Mermaid dependency, use the public async `mermaid.parse(code)` API and catch its error. `suppressErrors: true` returns `false` on failure and loses useful error detail. Parser position fields vary by diagram/parser; report a line or column only when available and reliable. Map a block-local position to a document position only when the block's current source location is known.

Do not render untrusted diagrams just to obtain a syntax check, enable JavaScript callbacks, lower `securityLevel`, or fetch arbitrary external assets as a repair strategy. Keep error reports short and avoid exposing unrelated document content.

Official API: [Syntax validation without rendering](https://mermaid.js.org/config/usage.html#syntax-validation-without-rendering).
