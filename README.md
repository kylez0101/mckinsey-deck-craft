# mckinsey-deck-craft

从精选的 9 份、277 页数字制造演示文稿中归纳咨询式论证、故事线和排版方法，支持在新主题上制作可编辑 PPT，并提供克制的自定义配色和统一源数据更新。

这是个人研究与复用 Skill，非麦肯锡官方产品或全公司方法论。原始 PPT 不随仓库分发；样本编号、页码、哈希和归纳边界见[来源说明](references/corpus-map.md)。参考图像和图标保留来源记录，相关素材权利归原权利人；仓库未授予对第三方素材的额外许可。

## 使用

将本仓库作为一个完整的 Skill 文件夹放入代理的技能目录，保持资源的相对路径。Codex 用户可克隆到尚不存在的目标目录：

```sh
git clone https://github.com/kylez0101/mckinsey-deck-craft.git ~/.codex/skills/mckinsey-deck-craft
```

如目标目录已存在，请先选择其他位置，避免覆盖现有 Skill。入口为 [SKILL.md](SKILL.md)；可用 `$mckinsey-deck-craft` 调用，例如：

> 请用 $mckinsey-deck-craft，为一家订阅软件公司制作包含封面的 8 页经营改进报告。先核实证据和决策选项，正文主题色用深青，图表和表格保持可编辑。

固定封面采用深蓝背景和可编辑白字。正文标题优先单行；用户指定颜色时，围绕一个主色家族、至多一个显式辅助色及中性色设计。

## 内容

- `SKILL.md`：任务路由、工作步骤和交付约束。
- `references/`：故事线、版式、专业图表、数据绑定、配色及质量检查。
- `assets/templates/`：10 类基础页面、7 款专业图表/表格、6 种数据布局及对应 JSON 和总览；PPT 可在 PowerPoint 中直接编辑。
- `assets/examples/`、`assets/icons/`、`assets/brand/`：参考页、语义图标和固定封面。
- `scripts/`：源数据编译、主题生成、原生 PPT 构建及测试。

## 运行环境

方法和可编辑模板可直接查阅使用。数据编译、主题计算、布局测试与 `--dry-run` 仅需支持 ES modules 和 `node:test` 的现代 Node.js。

完整自动生成 PPT 依赖当前 Codex Presentations 运行环境，包括 `@oai/artifact-tool`、Presentations 的 `container_tools/runtime_helpers.mjs`、`artifact_tool_utils.mjs` 及其验证工具，以及可导入 `lxml` 的 Python。它不是仅运行 `npm install` 即可使用的独立 PPT 生成器。通过当前环境的依赖加载器取得路径后，设置：

- `CODEX_PRIMARY_RUNTIME_NODE_MODULES`：当前运行环境的 Node packages 目录。
- `DECK_PRESENTATIONS_SKILL_DIR`：当前 Presentations Skill 目录。
- `DECK_RUNTIME_PYTHON`：当前 Python 可执行文件。

具体命令见[基础模板](references/editable-templates.md)和[数据重建](references/data-binding.md)。示例数据均有其事实状态，不可直接视为新项目结论。生成器默认字体为 Songti SC / Arial Unicode MS；缺少字体时应选择可用等效字体并重新检查排版。

## 验证

无需完整演示运行环境即可运行：

```sh
node --test scripts/tests/data-model.test.mjs scripts/tests/data-pages.test.mjs
node scripts/tests/theme.test.mjs
```

最终 PPT 仍需按[成品检查](references/production-checks.md)重新渲染、检查原生对象与工作簿，并核对实际目标应用中的效果。
