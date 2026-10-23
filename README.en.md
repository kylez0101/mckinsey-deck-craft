# mckinsey-deck-craft

[中文](README.md) | **English**

A reusable skill informed by studying real McKinsey case presentations. It helps AI agents build consulting-style arguments, storylines, and editable PowerPoint decks, with professional charts and tables, restrained custom themes, and updates driven by a shared data source.

This is an independent research and reuse skill, not an official McKinsey product. It uses the open `SKILL.md` folder structure and provides installation routes for Claude Code, Codex, WorkBuddy, and other international and Chinese agents. **Skill discovery and PPT generation are separate capabilities. Installation routes are checked against official documentation; they have not all been tested in the respective clients.**

## 1. Install from the GitHub link

### Quickest: ask your agent to install it

Send this to an agent with file and terminal tools:

```text
Install this skill: https://github.com/kylez0101/mckinsey-deck-craft
Identify the current agent and use its supported user-level or project-level skills location.
Download the entire repository. Keep SKILL.md, references/, assets/, and scripts/ together.
If an installation already exists, check its origin and preserve local changes first.
Verify that you can read SKILL.md, the PPT templates, and the reference documents.
Then tell me how to invoke it in this agent and which PPT authoring tools are available.
Distinguish a successful download from verified PPT generation.
```

The agent needs GitHub access and local file tools. Otherwise, use manual installation or package upload below.

### Manual installation: Claude Code / Codex

Run the appropriate block in your **system terminal**, using a destination that does not already exist:

```sh
# Claude Code: user-level installation
mkdir -p ~/.claude/skills
git clone https://github.com/kylez0101/mckinsey-deck-craft.git ~/.claude/skills/mckinsey-deck-craft
```

```sh
# Codex: current officially documented user-level discovery location
mkdir -p ~/.agents/skills
git clone https://github.com/kylez0101/mckinsey-deck-craft.git ~/.agents/skills/mckinsey-deck-craft
```

Check that the skill appears, starting a new session if needed. Invoke `/mckinsey-deck-craft` in Claude Code or `$mckinsey-deck-craft` in Codex. These are **chat invocations**, not terminal commands. Codex does not need a second copy after installation under `~/.agents/skills`.

### WorkBuddy: download and upload

1. Download the [complete skill ZIP](https://github.com/kylez0101/mckinsey-deck-craft/releases/latest/download/mckinsey-deck-craft.zip). **Code → Download ZIP** on the repository also provides a source archive.
2. Open **Experts · Skills · Connectors → Skills → Add Skill → Upload Skill** (Chinese UI: **专家·技能·连接器 → 技能 → 添加技能 → 上传技能**) and import the full package. The official upload interface accepts folders and ZIP files containing `SKILL.md`. If the ZIP is rejected, extract it and upload the complete skill folder. Keep `SKILL.md` next to `references/`, `assets/`, and `scripts/`.
3. Confirm it appears under installed skills, then ask: `Use mckinsey-deck-craft to create a customer-service productivity proposal.`

Custom WorkBuddy skills use its upload flow; pasting a GitHub link into a marketplace conversation is not a documented automatic installation route. The package structure is checked locally; WorkBuddy import has not been tested in its client. A standalone `.md` upload omits this skill’s templates and scripts, so use the full package. Open-platform marketplace metadata requirements are separate from local import requirements. [Upload formats](https://main.qcloudimg.com/raw/document/product/pdf/862_129183_cn.pdf) · [Official guide](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

### Installation locations for other agents

Place the **entire repository folder** under the appropriate skills directory, not just `SKILL.md`. These routes follow official documentation; interfaces and permissions can vary by version.

| Agent | User-level / project-level location | Invoke or confirm | Official guide |
|---|---|---|---|
| Claude Code | `~/.claude/skills/` / `.claude/skills/` | `/mckinsey-deck-craft` | [Docs](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/` / `.agents/skills/` | `$mckinsey-deck-craft` or the skill picker | [Docs](https://learn.chatgpt.com/docs/build-skills) |
| Gemini CLI | `~/.gemini/skills/` or `~/.agents/skills/`; corresponding project directories | Confirm with `/skills list`, then ask by name | [Docs](https://geminicli.com/docs/cli/skills/) |
| Cursor | `~/.cursor/skills/` / `.cursor/skills/`; also `.agents/skills/` | `/mckinsey-deck-craft` or the `@` picker | [Docs](https://cursor.com/help/customization/skills) |
| GitHub Copilot | `~/.copilot/skills/` / `.github/skills/`; also `.agents/skills/` | Ask by name and description | [Docs](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) |
| OpenCode | `~/.config/opencode/skills/` / `.opencode/skills/`; also `.agents/skills/` | Ask it to load the skill using its native skill tool | [Docs](https://opencode.ai/docs/skills) |
| CodeBuddy Code | `~/.codebuddy/skills/` / `.codebuddy/skills/` | `/skills`, then `/mckinsey-deck-craft` | [Docs](https://www.codebuddy.cn/docs/cli/skills) |
| TRAE China | `~/.trae-cn/skills/` / `.trae/skills/`; also project `.agents/skills/` | Check settings, then ask by name; copy the complete folder | [Docs](https://docs.trae.cn/ide_skills) |
| Qoder international CLI | `~/.qoder/skills/` / `.qoder/skills/` | `/skills reload`, then `/mckinsey-deck-craft` | [Docs](https://docs.qoder.com/cli/Skills) |
| Qoder CN IDE | `~/.lingma/skills/` / `.lingma/skills/` | Restart and select from the `/` menu | [Docs](https://docs.qoder.cn/user-guide/skills) |
| Qwen Code | `~/.qwen/skills/` / `.qwen/skills/`; also `.agents/skills/` | `/skills`, then `/mckinsey-deck-craft` | [Docs](https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/skills.md) |
| Kimi Code CLI | `~/.kimi-code/skills/` / `.kimi-code/skills/`; also `.agents/skills/` | `/skill:mckinsey-deck-craft`; check discovery for your version | [Docs](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html) |

For a project-only Claude Code installation, clone into `.claude/skills/mckinsey-deck-craft` from that project's root. On Windows, use Git Bash or download the ZIP and install with File Explorer; `~` means your user home, usually `C:\Users\your-name`.

For another agent with custom skill support, use its documented import flow. If it can read workspace files but has no skill discovery, put the repository in the workspace and ask:

```text
Read ./mckinsey-deck-craft/SKILL.md first. Load references/ only as needed,
use the templates and assets, and follow the skill's workflow.
Check your available PPT tools and use them to produce editable output.
```

A chat-only web interface without folder access or tools can help with writing and storyboards using supplied content, but cannot be assumed to produce an editable PPT. See [agent compatibility](references/agent-compatibility.md).

## 2. A complete example you can copy

After confirming installation, send the following. Prefix it with `/mckinsey-deck-craft` in Claude Code or `$mckinsey-deck-craft` in Codex if you want explicit invocation; other agents can use the text directly:

```text
Use mckinsey-deck-craft to create “Improving B2B SaaS Customer-Service Productivity”.

Audience: the CEO and head of customer service.
Decision: prioritize knowledge management, process improvement, or more staff over the next 90 days.
Length: 8 slides including the cover. Write the deck in English.

All inputs below are synthetic demonstration data, not observed business facts:
January / February / March tickets: 10,000 / 12,000 / 15,000.
Average resolution time: 12 / 14 / 18 hours.
Repeat-contact share: 18% / 22% / 28%.
Customer satisfaction: 88% / 85% / 80%.
Budget ceiling: CNY 300,000.
Option A: knowledge base and assisted retrieval, CNY 220,000 one-time investment.
Option B: scheduling and process changes, CNY 150,000 one-time investment.
Option C: additional service staff, CNY 280,000 incremental cost over 90 days.
These cost scopes differ. Explain comparability limits; recurring costs, effects, and returns are unknown.

Requirements:
- Use the bundled deep-blue cover artwork with editable white text.
- Use #8C1515 as the body theme's primary color with restrained neutrals.
- Aim for single-line titles, comfortable typography and spacing, and purposeful trends, comparison tables, and timelines.
- Separate observed patterns from root-cause hypotheses. Do not invent savings, staffing reductions, or payback periods.
- Compare costs, risks, dependencies, and evidence gaps. Give a conditional pilot recommendation when evidence is insufficient.
- Sequence: cover, decision summary, trend evidence, root-cause hypotheses, option comparison, pilot gates, 90-day roadmap, budget and decision.
- Check the host's existing authoring tools first; keep key charts and tables editable.
- If PPT generation is available, deliver output/customer-service-plan.pptx and render it again for inspection.
- Also provide the storyboard, source data, and a check record identifying unfinished verification.
- If authoring tools are missing, explain the gap and provide the storyboard and usable templates without claiming a completed PPT.
```

Expected output: an eight-slide report based on explicit demonstration inputs, traceable source data, a storyboard, and a check record. State the basis for any pilot threshold or expected effect; facts absent from this example remain unknown. Replace demonstration inputs with real evidence for an actual engagement.

**Follow-up edit:** `Change Option A to CNY 260,000. Recheck the budget, comparison table, narrative, and conditional recommendation. Keep the cover unchanged and export a new file.` Data-driven updates cover established bindings only; manually editing a PPT does not automatically synchronize the whole deck.

## 3. Capabilities and runtime requirements

| Usage level | Required capability | Result |
|---|---|---|
| Method, storyboarding, review | Agent can read Markdown and relevant resources | Structure, claims, evidence, and design guidance |
| Existing templates | A tool that opens PowerPoint files | Direct editing of three native template libraries |
| Cross-agent PPT authoring | An existing host PPT skill, presentation API, or usable script toolchain | Rebuild editable objects using this skill's method; validate the actual output |
| Data compilation, themes, layout tests | Modern Node.js with ES modules and `node:test` | Calculations, themes, tests, and `--dry-run` |
| Bundled full PPT builders | Codex Presentations runtime, Artifact Tool, Python + lxml | Generate and validate PPTs with `build-deck.mjs` / `build-data-deck.mjs` |

Claude Code, WorkBuddy, and other hosts without the Codex runtime should use their existing PPT tools. Reading the skill or editing templates does not require Codex. The bundled full builder is not a standalone generator enabled by `npm install` alone. See [compatibility](references/agent-compatibility.md) for environment variables and alternate routes. If fonts are unavailable, choose installed substitutes and recheck layout; rendering may differ across systems.

## 4. Contents and verification

- [SKILL.md](SKILL.md): execution entry point and reference routing.
- `references/`: storylines, 18 layout archetypes, charts, data binding, themes, and delivery checks.
- `assets/templates/`: 10 base page types, 7 professional chart/table examples, and 6 data layouts, with JSON and overview images.
- `assets/examples/`, `assets/icons/`, `assets/brand/`: reference pages, icons, and fixed cover artwork.
- `scripts/`: data model, themes, page builders, and tests; `agents/openai.yaml` is optional Codex UI metadata.

Run from the repository root:

```sh
node --test scripts/tests/data-model.test.mjs scripts/tests/data-pages.test.mjs
node scripts/tests/theme.test.mjs
```

These checks do not need the full PPT runtime and do not establish successful import or export in every agent. Validate final work using the [delivery checks](references/production-checks.md). Operational references are currently written in Chinese; ask the agent to explain them or produce your deliverables in English as needed.

Original PPTs are not distributed. File identifiers, page maps, hashes, and inference boundaries remain in the [source map](references/corpus-map.md). Images and icons retain provenance; third-party materials remain the property of their respective rights holders, and the repository grants no additional rights to those materials.
