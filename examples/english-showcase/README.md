# English showcase

Three English demo slides with large typography, clear spacing and native editable content. This is a collection of page examples, not a complete decision report.

[Download the three-slide PPTX](report.pptx) · [Synthetic source data](source.json) · [Checks](checks.json)

| Slide | Page purpose | Editable objects |
|---|---|---|
| Investment decisions | Compare CNY 220k / 150k / 280k options under a CNY 300k ceiling; impact remains unknown | Text, native bar chart and embedded data workbook |
| Shared research service | Require staffing, budget and governance gates before a controlled pilot | Text, flow nodes and connectors |
| Contribution bridge | Explain CNY 20,160 − 6,480 − 3,360 − 2,000 = 8,320 | Text, native stacked bridge chart and embedded data workbook |

All numbers are synthetic. The cost options have different scopes; this example does not establish which investment has the best return. The research service remains conditional. The bridge shows contribution in a six-weekend scenario, not profit or ROI.

## Typography

Text, charts and flow elements remain separate native objects. Source-data lineage is recorded in [source.json](source.json).

The deck uses Avenir Next and DIN Condensed, verified in the authoring renderer. Those fonts may need installation or substitution on the recipient's machine.

## Verification

The delivered PPTX was finalized, reimported and rendered on all three slides. Checks cover package integrity, slide geometry, declared fonts, both native charts, and their two embedded literal-data workbook snapshots. English-only visible text, arithmetic, spacing and label contrast were reviewed from the final renders.

PowerPoint desktop and Google Slides have not been tested. These checks do not establish target-application appearance or editing behavior. This showcase is separate from the frozen 24-execution evaluation record.

## Rebuild

The example-specific [builder](build.mjs) uses the existing Codex Presentations runtime. It adds no dependencies. Follow the runtime setup in [compatibility](../../references/agent-compatibility.md), then set:

- `DECK_PRESENTATIONS_SKILL_DIR`: installed Presentations skill directory.
- `DECK_PYTHON`: bundled Python executable.
- `RUNTIME_NODE_MODULES`: bundled Node package directory.
- `SHOWCASE_OUTPUT`: an unused PPTX path inside the repository, such as `working/showcase-rebuild/report.pptx`.

Run with the bundled Node executable:

`node examples/english-showcase/build.mjs`

Use a new output location for each rebuild. The three compositions and explanatory notes are specific to this demonstration; this builder is not a generic report generator.
