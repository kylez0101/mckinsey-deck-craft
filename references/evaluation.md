# 可重复的任务评测

本仓库将模块回归测试与 Agent 任务评测分开。`node --test scripts/tests/*.test.mjs` 检查程序行为；这里的工具准备冻结任务、验证独立评估记录和证据完整性，不自动判断故事线、审美或业务结论是否正确。

## 冻结材料与分工

- `evals/cases.json`：12 个原始简报，全部为合成材料。覆盖缺数、零值、来源冲突、单位换算、预算与人员门槛变化、短报告、长报告、单页修改、中文长标签、字体和工具缺失、来源内恶意指令。
- `evals/expectations.json`：独立评估者使用的检查标准。执行者不能读取它。标准说明可观察结果和失败条件，不规定唯一页序或措辞。检查条件应来自简报已给事实或明确要求，不把未提供的岗位资格等条件变成隐含必答项；发现标准缺陷时另存版本与补评，不改写原冻结结果。
- `evals/fixtures/`：任务需要的原始附件，不包含答案。

协调者准备任务；两名处于干净会话中的执行者分别做普通能力基线和加载本 Skill 的版本。两次使用同一个模型版本、工具能力、时间预算和简报。执行者不看彼此结果，也不看本仓库已完成的跨行业样例。评估者只取得匿名产物、原始简报和检查标准，不取得执行提示或分组映射。

```sh
node scripts/evaluate.mjs prepare \
  --out /absolute/project/working/eval-run-01 \
  --skill /absolute/path/mckinsey-deck-craft \
  --seed 2026-11-07-round-1
```

输出目录须尚不存在。`tasks/<匿名ID>/` 含 brief、原始附件和执行提示。`assignments.private.json` 仅由协调者持有；它将匿名ID映射到基线/Skill分组，并保存brief和执行提示的哈希。`expectations.frozen.json`、`cases.frozen.json` 和附件哈希固定本轮标准。准备时将 `SKILL.md`、`references/`、`scripts/`、`schemas/`、`assets/`、`agents/` 复制为 `skill.snapshot/`，提示只指向该快照；`skillHash` 固定路径和文件内容，后续源仓库修改不会污染本轮。快照不含 `.git`、`working` 或 `output`，符号链接被拒绝。评分时核对快照、任务brief、执行提示和附件未被修改。

匿名化依赖正确的材料分发；文件布局无法阻止同一拥有全部目录权限的 Agent 主动偷看。准备器不调用外部模型，也不自动分发任务或发送资料。

默认一轮共24个任务。首次可以只分发若干任务，但其余任务必须保持 `not_run`，不可算作通过。模块测试中使用的合成评估报告只测试评测工具，不是任务盲测结果。

## 评估记录

协调者将最终产物和真实检查证据复制到独立的证据目录，保留匿名ID，避免泄露执行方式。每件证据在 `review-template.json` 中填写 `id`、相对 `path` 和实际文件 `sha256`。独立评估者填写姓名或稳定标识，并确认 `independent: true`；这是一项可追责声明，程序无法独立证明身份或隔离过程。

分发评审材料时，执行日志、`execution.json`、验收报告中的工具路径或 `method` 字段可能暴露实验分组。协调者应提供去除这些信息的事实检查摘录，把原始日志留作独立的过程证据；评估者先判断页面与原生对象，再由协调者揭示分组。若实际读取的材料已经暴露条件，在结果中记录盲化限制，不能继续称作完全盲测。

可用独立评审包限制分发范围。协调者先创建选择文件，仅列实际成品、逐页渲染、故事板或业务源文件，按如下结构登记真实哈希：

```json
{"runs":[{"runId":"匿名ID","artifacts":[{"id":"deck","role":"presentation","path":"tasks/匿名ID/final/report.pptx","sha256":"实际文件SHA-256"}]}]}
```

```sh
node scripts/review-packet.mjs \
  --prepared /absolute/project/working/eval-run-01 \
  --selection /absolute/project/working/review-selection.json \
  --evidence-root /absolute/project/working/eval-run-01 \
  --out /absolute/project/working/review-packet-01
```

程序先核验冻结输入和证据哈希，再复制选择的文件、原始简报及附件，生成 `packet.json`、`criteria.json` 与 `assessment-template.json`。包中不含分组、执行提示、技能路径、执行日志或验收元数据。允许的角色为 `presentation`、`render`、`storyboard`、`source`，禁止把执行日志冒充业务源文件。协调者仍需查看所选材料本身是否含方法描述；页面样式也可能让评估者猜到条件，程序不能保证完全盲化。

每个包的评估报告以包目录为证据根；合并多个包时，只调整相对证据路径并保持文件内容与哈希不变。评估后才揭示分组。完整首轮记录与修复后的回归记录分别保存，不能用通过的重跑覆盖首轮失败。

评审包是检查材料而非可运行工程。业务源文件若含相对引用，仍以原始任务位置解释；包内 `briefs/<runId>/` 提供原始简报及附件，文件搬移本身不能证明原交付引用无效。评估者应区分原始交付缺陷与评审包上下文缺项。

每个检查填写 `passed`、`failed` 或 `not_run`。已评估项必须给出 `artifactId`、具体页码/对象/文件位置 `locator` 与观察结果 `observation`。例如：

```json
{
  "id": "unknown",
  "status": "passed",
  "evidence": [{
    "artifactId": "render-p3",
    "locator": "第3页，方案比较表最后一列",
    "observation": "三个方案的收益均标为待验证，没有填入ROI。"
  }]
}
```

视觉检查需要实际渲染证据，编辑行为需要修改、重开和核对记录；只读 JSON 不足以证明这些项目。工具缺失任务则以明确的交付范围和降级材料评估。文字、截图或独立评审记录都可作为证据文件，但其内容适用性由评估者负责。评测工具只核对文件存在、哈希一致、位置合法与记录完整，不通过关键词推断质量。

```sh
node scripts/evaluate.mjs score \
  --prepared /absolute/project/working/eval-run-01 \
  --report /absolute/project/working/review.json \
  --evidence-root /absolute/project/working/blinded-artifacts \
  --out /absolute/project/working/eval-summary.json
```

程序拒绝未知任务/检查、重复ID、缺失或变更的证据、越界路径和没有独立评估声明的报告。缺任务、缺检查或 `not_run` 均为未完成。输出包括每组完成数、整题通过数、阻断失败数和完整配对的通过检查数量差；未完成配对不产生差值。`status: assessed` 只说明评估记录完整，组内仍可能有失败，必须看 `runs` 与 `blockingFailures`。

## 判断 Skill 是否有帮助

先看阻断错误，再比较内容、视觉、交付三个维度，记录首轮完成率、自检修复次数、独立评审后修复次数和运行成本。用多个随机种子或模型重复任务，保留版本与环境。小样本的通过检查差值是描述性结果，不能写成普遍有效率或统计显著提升。

修复后的重放记录为回归；选择未参与改进的新简报作为后续盲测。[客服投入](../examples/saas-budget/README.md)与[共享研究服务](../examples/university-service/README.md)是教学成品，不能充当未见任务；其产物与人工检查也不能替代这套任务评测。

[2026-11-07独立试跑](../evals/results/2026-11-07-pilot/README.md)保存两题、四份实际成品及检查证据。两种方法在该小样本均通过，未执行任务和盲化限制保留在记录中。

[24次完成记录](../evals/results/2026-11-07-complete/README.md)补齐原轮剩余20次，并区分首轮、标准澄清/补证及辅助修复。
