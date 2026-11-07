# mckinsey-deck-craft

**中文** | [English](README.en.md)

参考和学习麦肯锡真实案例，归纳咨询式论证、故事线与页面设计，帮助 AI Agent 在新主题上制作可编辑 PPT。支持专业图表与表格、克制的自定义配色，以及统一源数据驱动的内容更新。

这是个人研究与复用 Skill，非麦肯锡官方产品。使用开放的 `SKILL.md` 结构，提供 Claude Code、Codex、WorkBuddy 及多种国内外 Agent 的安装与使用方式。**技能加载兼容性与 PPT 生成能力分别说明；各产品入口已对照官方文档，未宣称已在所有客户端实测。**

## 1. 拿到链接后怎么安装

### 最快：让 Agent 帮你安装

将下面这段发送给具有文件和终端工具的 Agent：

```text
请安装这个 Skill：https://github.com/kylez0101/mckinsey-deck-craft
识别当前 Agent，使用它支持的用户级或项目级技能目录。
下载完整仓库，保留 SKILL.md、references/、assets/、scripts/、schemas/、evals/、examples/ 的相对结构。
如果已有同名安装，先检查来源并保留本地修改。
安装后确认能读到 SKILL.md、模板 PPT 和参考文档，再告诉我本机的调用方式。
不要把“已下载”当作“已验证能够生成 PPT”；请说明可用的 PPT 制作工具。
```

这适用于能访问 GitHub、读写本地文件的 Agent。没有这些工具时，使用下方手动安装或上传方式。

### Claude Code / Codex 手动安装

在**系统终端**执行相应命令，目标文件夹应尚不存在：

```sh
# Claude Code：用户级安装
mkdir -p ~/.claude/skills
git clone https://github.com/kylez0101/mckinsey-deck-craft.git ~/.claude/skills/mckinsey-deck-craft
```

```sh
# Codex：当前官方用户级发现目录
mkdir -p ~/.agents/skills
git clone https://github.com/kylez0101/mckinsey-deck-craft.git ~/.agents/skills/mckinsey-deck-craft
```

随后在 Agent 内确认技能出现；必要时开启新会话。Claude Code 输入 `/mckinsey-deck-craft`，Codex 输入 `$mckinsey-deck-craft`。这些是**聊天里的调用方式**，不是终端命令。安装到 `~/.agents/skills` 后，无需再为 Codex 复制到第二个目录。

### WorkBuddy：下载后上传

1. 下载 [完整技能 ZIP](https://github.com/kylez0101/mckinsey-deck-craft/releases/latest/download/mckinsey-deck-craft.zip)。也可在仓库页面点 **Code → Download ZIP** 获取源码。
2. 在 WorkBuddy 打开 **专家·技能·连接器 → 技能 → 添加技能 → 上传技能**，选择完整技能包并完成导入；官方上传界面支持包含 `SKILL.md` 的文件夹和 ZIP；若 ZIP 被拒绝，解压后选择完整技能文件夹上传。保持 `SKILL.md` 与 `references/`、`assets/`、`scripts/`、`schemas/`、`evals/`、`examples/` 同级。
3. 在“已安装”中确认技能出现，再输入：`请使用 mckinsey-deck-craft，为我制作一份客服效率提升方案。`

WorkBuddy 的自定义技能走上传入口；不要假定把 GitHub 链接贴进市场对话就会自动安装。下载包的结构已检查，WorkBuddy 客户端导入尚未实测。单独上传 `.md` 会遗漏本 Skill 的模板和脚本，应使用完整包；开放平台的上架元数据规范不等于本地导入规范。[上传格式说明](https://main.qcloudimg.com/raw/document/product/pdf/862_129183_cn.pdf) · [官方指引](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

### 其他 Agent 安装位置

把**完整仓库文件夹**放入对应目录，而非只复制 `SKILL.md`。下面是官方文档规定的发现位置；具体版本的入口和权限可能有差异。

| Agent | 用户级目录 / 项目级目录 | 调用或确认方式 | 官方说明 |
|---|---|---|---|
| Claude Code | `~/.claude/skills/` / `.claude/skills/` | `/mckinsey-deck-craft` | [文档](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/` / `.agents/skills/` | `$mckinsey-deck-craft`，或在技能列表选择 | [文档](https://learn.chatgpt.com/docs/build-skills) |
| Gemini CLI | `~/.gemini/skills/` 或 `~/.agents/skills/`；项目对应同名隐藏目录 | `/skills list` 确认，再自然语言调用 | [文档](https://geminicli.com/docs/cli/skills/) |
| Cursor | `~/.cursor/skills/` / `.cursor/skills/`；也支持 `.agents/skills/` | `/mckinsey-deck-craft` 或 `@` 选择 | [文档](https://cursor.com/help/customization/skills) |
| GitHub Copilot | `~/.copilot/skills/` / `.github/skills/`；也支持 `.agents/skills/` | 用名称和任务描述明确要求使用 | [文档](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) |
| OpenCode | `~/.config/opencode/skills/` / `.opencode/skills/`；也支持 `.agents/skills/` | 自然语言要求用原生 skill 工具加载 | [文档](https://opencode.ai/docs/skills) |
| CodeBuddy Code | `~/.codebuddy/skills/` / `.codebuddy/skills/` | `/skills` 确认，`/mckinsey-deck-craft` 调用 | [文档](https://www.codebuddy.cn/docs/cli/skills) |
| TRAE 中国版 | `~/.trae-cn/skills/` / `.trae/skills/`；也支持项目 `.agents/skills/` | 设置中查看，再自然语言调用；优先完整目录复制 | [文档](https://docs.trae.cn/ide_skills) |
| Qoder 国际 CLI | `~/.qoder/skills/` / `.qoder/skills/` | `/skills reload` 后用 `/mckinsey-deck-craft` | [文档](https://docs.qoder.com/cli/Skills) |
| Qoder CN IDE | `~/.lingma/skills/` / `.lingma/skills/` | 重启后在 `/` 菜单选择 | [文档](https://docs.qoder.cn/user-guide/skills) |
| Qwen Code | `~/.qwen/skills/` / `.qwen/skills/`；也支持 `.agents/skills/` | `/skills` 确认，`/mckinsey-deck-craft` 调用 | [文档](https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/skills.md) |
| Kimi Code CLI | `~/.kimi-code/skills/` / `.kimi-code/skills/`；也支持 `.agents/skills/` | `/skill:mckinsey-deck-craft`；版本不同先查技能列表 | [文档](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html) |

例如，只在某个项目使用 Claude Code 时，在该项目根目录克隆到 `.claude/skills/mckinsey-deck-craft`。Windows 可用 Git Bash 执行上述命令，或下载 ZIP，将 `~` 替换为用户主目录（通常为 `C:\Users\你的用户名`）后通过文件管理器安装。

其他 Agent 若支持自定义 Skills，使用其官方技能导入入口；若不支持自动发现，但能读取工作区文件，将仓库放入工作区并明确要求：

```text
先阅读 ./mckinsey-deck-craft/SKILL.md，按任务需要读取其 references/，
使用 assets/ 中的模板和资源，执行这个 Skill 的工作流程。
请用你当前可用的 PPT 工具生成可编辑文件；先核对工具是否可用。
```

纯聊天网页若无法读取文件夹或执行工具，只能使用提供给它的内容进行写作与故事板分析，不能保证生成可编辑 PPT。更多执行规则见[跨 Agent 兼容说明](references/agent-compatibility.md)。

## 2. 一个可直接使用的完整示例

安装确认后，将下文发送给 Agent。Claude Code 可在前面加 `/mckinsey-deck-craft`，Codex 加 `$mckinsey-deck-craft`；其他工具可直接使用正文：

```text
请使用 mckinsey-deck-craft，制作《B2B SaaS 客服效率提升方案》。

受众：CEO 与客服负责人。
要支持的决定：未来90天，优先投入知识库、流程改造，还是扩充人手。
总页数：8页，包含封面；正文用中文。

下面全部是演示数据，不是真实业务事实：
1月/2月/3月工单数：10,000 / 12,000 / 15,000。
平均解决时长：12 / 14 / 18小时。
重复咨询占比：18% / 22% / 28%。
客户满意度：88% / 85% / 80%。
预算上限：30万元。
方案A：知识库与辅助检索，一次性投入22万元。
方案B：排班与流程改造，一次性投入15万元。
方案C：扩充客服团队，90天新增成本28万元。
这些成本覆盖范围不同，先标明可比性限制；后续持续成本、效果和回报未知。

要求：
- 封面用 Skill 自带的深蓝背景和可编辑白字。
- 正文主色为 #8C1515，围绕主色与中性色设计，保持克制。
- 标题尽量单行，字号和留白舒适；按关系使用趋势图、比较表和时间计划。
- 观察到的现象与根因假设分开。不得编造收益、节省人数或回收期。
- 比较三个方案的成本、风险、依赖和待验证项；证据不足时给有条件的试点建议。
- 组织为：封面、决策摘要、趋势证据、根因假设、方案比较、试点门槛、90天计划、预算与决策。
- 先检查可用制作工具，选用宿主现有的原生 PPT 能力；关键图表与表格可编辑。
- 如果支持自动生成，交付 output/customer-service-plan.pptx，并重新渲染检查。
- 同时交付故事板、源数据和检查记录，说明尚未完成的验证。
- 如果缺少 PPT 工具，如实说明缺项并交付故事板和可用模板，不把它们说成完成的PPT。
```

预期得到：一份基于明确演示数据的 8 页报告、可追溯的源数据、故事板和检查记录。任何试点阈值或预期效果都应说明来源；本例没有提供的业务事实保持未知。需要真实项目时，用实际资料替换演示输入。

**后续修改示例：** `把方案A投入改为26万元，重新检查预算、比较表、正文和有条件的推荐；保持封面不变，输出一个新文件。` 数据联动仅覆盖已建立绑定的内容；手工改 PPT 不会让整篇自动同步。

## 3. 能做什么，需要什么环境

| 使用层级 | 所需能力 | 结果 |
|---|---|---|
| 方法、故事板、审查 | Agent 能读 Markdown 和相关资源 | 结构、观点、证据组织与设计建议 |
| 使用现成模板 | 能打开 PowerPoint 文件的工具 | 直接编辑三套原生模板库 |
| 跨 Agent 制作 PPT | 宿主已有 PPT 技能、演示 API 或可用脚本工具链 | 按本 Skill 的方法重建可编辑对象；需验证实际输出 |
| 数据编译、配色、布局测试 | 支持 ES modules 和 `node:test` 的现代 Node.js | 可执行计算、主题、测试和 `--dry-run` |
| 仓库内完整自动构建器 | Codex Presentations runtime、Artifact Tool、Python + lxml | 运行 `build-deck.mjs` / `build-data-deck.mjs` 生成并验证 PPT |

没有 Codex 运行环境的 Claude Code、WorkBuddy 等，应优先使用宿主已有的 PPT 能力；无需为阅读或使用模板配置 Codex。仓库内完整构建脚本不是只执行 `npm install` 即可运行的独立生成器。环境变量与替代路径见[兼容说明](references/agent-compatibility.md)。字体缺失时选择可用字体并重新验证排版，不能假定不同系统效果相同。

## 4. 仓库内容与验证

- [SKILL.md](SKILL.md)：执行入口与按需阅读路由。
- `references/`：故事线、18类版式、图表、数据绑定、主题及交付检查。
- `assets/templates/`：10类基础页面、7款专业图表/表格、6种数据布局；附 JSON 与总览。
- `assets/examples/`、`assets/icons/`、`assets/brand/`：参考页、图标和固定封面。
- `scripts/`：数据模型、主题、布局构建器、预检、分项验收和测试；`agents/openai.yaml` 仅为 Codex UI 元数据。
- `schemas/template-contract.json`：字段与容量的唯一结构化定义；生成模板目录和说明中的字段表。
- `evals/`：冻结的任务简报与独立评分标准，供基线/Skill对照使用。
- `examples/`：非制造业整套示例的原始事实、绑定源数据、故事板与设计取舍。

在仓库根目录运行：

```sh
node --test scripts/tests/*.test.mjs
node scripts/sync-template-catalog.mjs --check
node scripts/preflight.mjs --input examples/saas-budget/source.json
```

这些测试和默认预检不要求完整 PPT 运行环境；`preflight.mjs --full` 额外检查当前运行库、字体和 Python。它们不证明每个 Agent 的实际导入和演示导出已经通过。最终作品仍按[成品检查](references/production-checks.md)核对。

原始 PPT 不随仓库分发；文件标识、页码、哈希和归纳边界见[来源说明](references/corpus-map.md)。图像和图标保留来源记录，相关素材权利归原权利人；本仓库未额外授权第三方素材。


## 5. 按任务使用，按证据验收

入口区分五种任务：学习样本、故事板、新建成品、审查、局部修改。只读当前任务所需参考；纯审查交付发现，已要求修改的任务直接实施。局部修改保留未涉及范围，并回查图表、工作簿、正文与推荐之间的依赖。单页任务不追加封面，普通页面JSON使用 `mode: "single-slide"`；完整成品默认 `mode: "deck"`。详见[任务模式](references/task-modes.md)。

品牌与使用场景通过普通页面JSON的 `style` 配置；统一源数据输入时放在 `presentation.style`：

```json
{
  "style": {
    "profile": "generic",
    "purpose": "presentation"
  }
}
```

默认 `personal` / `reading` 保留原有个人封面与阅读排版；`generic` 提供中性品牌起点，`presentation` 面向现场演示。字体、封面和页脚可显式覆盖，实际字体与版面须重新核验。正文主题色继续使用独立的 `theme` 配置。参数和例子见[样式配置](references/style-profiles.md)。

机器构建成功返回 `machine_checks_passed`。验收记录将结构/数据、内容、视觉、编辑重开和目标应用分别标为 `passed` / `failed` / `not_run`，附对应证据；全部要求完成后才标记 `verified`。没有执行的PowerPoint内检查不会默认通过。

## 6. 整套示例与Skill评测

- [SaaS预算决策](examples/saas-budget/README.md)：在收益未知的情况下比较预算与试点条件，修改投入后重新判断建议。
- [高校共享服务](examples/university-service/README.md)：从需求与服务范围组织分阶段试点，保留证据缺口和进入条件。

示例均为合成事实，包含可重建的源JSON、逐页故事板和修改前后对照，用来解释页序、证据和视觉选择。它们不能证明真实项目效果，也不作为未见题目的盲测成绩。成品构建和视觉检查范围以各例记录为准。

固定任务评测将执行者简报和评估者期望分开。可用以下命令准备一次可重现的基线/Skill对照：

```sh
node scripts/evaluate.mjs prepare --out "$PWD/working/eval-run" --skill "$PWD" --seed "reliability-01"
```

随后由执行者实际完成任务，另一评估者核对完整产物和证据，再用评分器汇总。准备任务或运行单元测试不等于完成了Agent盲测；缺失的运行和人工判断保留 `not_run`。具体流程、报告格式与评分命令见[评测说明](references/evaluation.md)。

[24次完成记录](evals/results/2026-11-07-complete/README.md)包含22份PPT（116页）与2份文本稿，保留首轮、补评和辅助修复结果；修复后通过率不等于未辅助的模型性能。
