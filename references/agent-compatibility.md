# 跨 Agent 执行 / Cross-agent execution

本 Skill 使用开放的 `SKILL.md` 指令、相对路径资源和可选脚本。安装发现方式见 [中文 README](https://github.com/kylez0101/mckinsey-deck-craft/blob/main/README.md) / [English README](https://github.com/kylez0101/mckinsey-deck-craft/blob/main/README.en.md)。目录适配来自官方文档；除实际记录的检查外，不推断已在所有 Agent 中运行通过。

## 中文执行规则

1. **先识别宿主能力。** 只写故事板时只需文件读取；制作 `.pptx` 时还要检查宿主是否有演示文稿技能、可编辑对象 API、现成的 PptxGenJS / python-pptx 工具链或 PowerPoint 自动化等实际可用路径。工具名称本身不能证明图表、工作簿、备注和渲染均可用。
2. **优先用宿主现有工具。** 按 `SKILL.md`、相关参考和模板完成制作，保持页面关系、证据边界、选定的品牌配置、主色和原生可编辑性。无需为使用方法而模拟 Codex 的私有缓存路径或导入其 UI 元数据；`agents/openai.yaml` 在其他宿主中可忽略。仅按需读取参考，不把整套库全部塞入上下文。
3. **数据与渲染解耦。** 有现代 Node.js 时可直接使用 `data-model.mjs`、`theme.mjs` 及 `build-data-deck.mjs --dry-run`。编译结果含 `resolved.json`、`values.json`、`calculation-audit.json`、`theme.json`，可交给宿主自己的 PPT 制作工具；字段需按真实语义映射，并同步图表、工作簿、表格和文字。`resolved.json` 不是 PPT。
4. **完整构建脚本有明确条件。** `build-deck.mjs` 以及非 dry-run 的 `build-data-deck.mjs` 使用当前 Codex Presentations 运行环境：`@oai/artifact-tool`、`container_tools/runtime_helpers.mjs`、`artifact_tool_utils.mjs` 和相关校验器，另需 Python / lxml。设置 `CODEX_PRIMARY_RUNTIME_NODE_MODULES`、`DECK_PRESENTATIONS_SKILL_DIR`、`DECK_RUNTIME_PYTHON` 为当前环境提供的真实路径，不能硬套其他电脑的路径。遵循该环境的 authoring marker 与交付规范。
5. **保留证据并说明缺项。** 不同制作工具的布局和原生图表支持不同。按成品检查实际重渲染和编辑重开，记录所用工具与验证范围。缺工具时交付故事板、源数据与可用模板，并明确尚未生成 PPT；不能用整页图片冒充可编辑页面，也不能把工具缺失说成业务分析不可用。后续用户指定工具或提供环境后，继续完成制作。

在完整仓库根目录可运行以下编译示例；它只输出数据检查产物，**不生成 `.pptx`**：

```sh
node scripts/build-data-deck.mjs \
  --input assets/templates/data-layout-source.json \
  --workspace "$PWD" \
  --work "$PWD/working/demo" \
  --out "$PWD/output/demo.pptx" \
  --dry-run
```

## English execution rules

1. **Check the host's capabilities first.** Storyboarding needs file reading. Creating `.pptx` also needs an available presentation skill, editable-object API, existing PptxGenJS / python-pptx toolchain, PowerPoint automation, or equivalent. A tool's name does not establish support for native charts, workbooks, notes, and rendering.
2. **Use existing host tools.** Apply `SKILL.md`, relevant references, and the templates, preserving evidence boundaries, visual relationships, the cover, the theme, and editability. Do not copy another machine's Codex cache paths. Other agents can ignore `agents/openai.yaml`. Load references only as needed. The operational guides are in Chinese; explain them and write the requested output in the user's language.
3. **Separate data compilation from rendering.** Modern Node.js can run `data-model.mjs`, `theme.mjs`, and `build-data-deck.mjs --dry-run`. The outputs include `resolved.json`, `values.json`, `calculation-audit.json`, and `theme.json`. Map these to the host's authoring tools and keep charts, workbooks, tables, and narrative synchronized. `resolved.json` is not a presentation.
4. **The full builders have specific requirements.** `build-deck.mjs` and the non-dry-run data builder require the current Codex Presentations runtime: `@oai/artifact-tool`, its runtime helpers, finalization utilities, and validators, plus Python / lxml. Set `CODEX_PRIMARY_RUNTIME_NODE_MODULES`, `DECK_PRESENTATIONS_SKILL_DIR`, and `DECK_RUNTIME_PYTHON` from that environment's actual paths. Follow its authoring-marker and delivery requirements.
5. **Verify the output and describe gaps.** Rendering and native-object support differ by tool. Inspect a fresh render and representative edit/reopen behavior, recording the tools and scope. If authoring tools are missing, provide the storyboard, source data, and usable templates while identifying the missing PPT. A slide image does not establish editability. Continue authoring when the required environment becomes available.

The command above is a portable **compilation-only** example. It does not create a PPT, even though an output path is supplied for CLI validation. Use the host's available writer or a fully configured bundled builder for the actual presentation.

## XY 辅助模块

`advanced-xy.mjs` 现可独立导入，不再读取私有运行环境。它接收宿主的图表 API；Codex 真实制作时显式传入 `{applyChartFont: applyPresentationChartFont}`，其他宿主提供等效适配器。小数尺度、单位和标签规则见[专业图表](professional-chart-design.md)。
