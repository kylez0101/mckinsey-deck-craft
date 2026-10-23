# 统一源数据、计算与展示

使用 [`compileDocument`](../scripts/data-model.mjs) 将一份源数据编译成普通页面 JSON，交给演示文稿构建器。图表数值、嵌入工作簿、直接标签、表格、正文及标题使用同一批计算结果。**改源数据后重新生成整套PPT**，同时重新判断推荐，检查导出的文件。

这条流程支持源文件驱动的联动。直接在PowerPoint中自由修改图表、文本或表格，仍需要人工同步相关对象；编译器不会监听已导出的PPT。不能把“原生可编辑”写成“任意手改后整篇自动更新”。

## 输入与输出

```js
import {compileDocument} from '../scripts/data-model.mjs';
const {document, values, audit} = compileDocument(input);
// document 是已解析的普通页面 JSON；values 是计算结果。
// 将 document 传入构建器，并和本轮导出文件一起保存 audit。
```

输入只有 `data`、可选的 `calculated`、`presentation` 和可选的 `assertions`。均须为普通 JSON 值；不接受函数、getter、Proxy、日期对象、稀疏数组或循环对象。源数据中的台账、日期、单位、事实状态等应保存在 `data`，完整保留于 `audit.sourceData`，也可绑定进页面来源或备注。

引用必须使用绝对路径：`{ "ref": "data.costs.labor" }`、`{ "ref": "calc.net" }`。数组位置使用 `.0`，不用方括号。计算名称须是单个安全路径键；禁止原型路径。没有格式设置的引用保留类型，因此图表可直接接收数字或数组。

表达式采用 `{ "op": "subtract", "args": [表达式或原始值, 表达式或原始值] }`。支持：

| 运算 | 参数规则 |
|---|---|
| `add`、`multiply` | 至少2个有限数字 |
| `subtract`、`divide` | 2个有限数字；除数不能为0 |
| `min`、`max` | 至少1个有限数字 |
| `abs` | 1个有限数字 |
| `round` | 数字，以及可选的0—8位小数；半值遵循JavaScript `Math.round` 方向 |
| `gt`、`gte`、`lt`、`lte` | 2个有限数字，结果为布尔值 |
| `eq` | 2个原始值，严格比较，`0`、`false`、`null` 各不相等 |
| `and`、`or`、`not` | 严格的布尔值；前两者至少2个参数，后者1个 |
| `if` | 布尔条件、满足时的值、不满足时的值 |

只有 `if` 延迟计算未选中的分支，可用来保护未知数值；两边的表达式语法仍须合法。所有命名计算都会求值，缺失引用、活动计算循环、非有限数字、错误参数或未解析绑定使本轮编译失败，不输出一份带旧数字的页面文件。表达式不执行代码，也不读取文件或网络。

## 源→计算→全部展示的例子

以下为示意数据；新增页面仍须符合所选版式的字段和容量。保留总览、直接标签、图表、正文、来源之间的绑定，而不是把同一数字手写数次。

```json
{
  "data": {
    "gross": 20160,
    "costs": {"labor": 6480, "security": 3360, "setup": 2000},
    "budget": 35000,
    "sourceLedger": [{"source": "六周试点测算", "status": "synthetic", "unit": "元"}]
  },
  "calculated": {
    "spend": {"op": "add", "args": [{"ref": "data.costs.labor"}, {"ref": "data.costs.security"}, {"ref": "data.costs.setup"}]},
    "net": {"op": "subtract", "args": [{"ref": "data.gross"}, {"ref": "calc.spend"}]},
    "headroom": {"op": "subtract", "args": [{"ref": "data.budget"}, {"ref": "calc.spend"}]},
    "recommendation": {
      "op": "if",
      "args": [
        {"op": "gte", "args": [{"ref": "calc.headroom"}, 0]},
        "试点支出在预算内，进入收益与风险评审",
        "暂停扩展，先调整预算或试点范围"
      ]
    }
  },
  "presentation": {
    "slides": [
      {"layout": "T01", "title": "周末营业试点", "status": "示意测算"},
      {
        "layout": "T03",
        "title": {"ref": "calc.recommendation"},
        "subtitle": {"text": ["净贡献 ", {"ref": "calc.net", "format": "money"}, " 元；总支出 ", {"ref": "calc.spend", "format": "money"}, " 元"]},
        "chart": {"heading": "六周测算", "unit": "元", "categories": ["净贡献", "总支出"], "values": [{"ref": "calc.net"}, {"ref": "calc.spend"}]},
        "facts": [{"label": "预算", "text": {"text": ["余量 ", {"ref": "calc.headroom", "format": "money"}, " 元"]}}],
        "source": "来源：六周试点示意测算；单位：元"
      }
    ]
  },
  "assertions": [
    {"condition": {"op": "eq", "args": [{"op": "add", "args": [{"ref": "calc.net"}, {"ref": "calc.spend"}]}, {"ref": "data.gross"}]}, "message": "贡献桥必须闭合"}
  ]
}
```

人工成本从6,480改为7,200时，净贡献从8,320降至7,600，总支出从11,840升至12,560，预算余量从23,160降至22,440。若要比较不同方案，将比较标准写成计算，例如 `if(gt(本方案贡献支出比, 替代方案贡献支出比), 推荐本方案, 推荐替代方案)`。业务上需要多个约束时，用布尔条件明确组合。不要只绑定数值，却将“最优方案”或“预算内”留作固定文字。

上例仅说明预算边界，不证明方案值得实施；收益、风险与审批条件应继续由对应证据支持。`assertions` 用于不得违反的事实/算术约束，不能把可能正常改变的商业判断写成永远必须为真的断言。

## 文本、精度与未知值

文本拼接必须为单独的 `{ "text": ["文字", 绑定或表达式, "单位"] }`。不得夹带其他字段；原生数字引用放在图表数值中，格式化引用放在正文或表格中。

| `format` | 默认显示 | 可选 `decimals` |
|---|---|---|
| `integer` | 千分位、0位小数 | 只能为0 |
| `number` | 千分位、2位小数 | 0—8 |
| `percent` | 原始比例×100、1位小数、`%` | 0—8 |
| `money` | 千分位、0位小数，无货币符号 | 0—8 |

单位、币种、时间范围应在页面明示，不能从 `money` 格式推断。金额需要精确到分时，优先使用最小计量单位的整数作为源数据；不要用显示舍入掩盖源口径或精度问题。

`null` 表示未知，0表示已知为零，两者保留差别。未知值不能自动参与算术、布尔判断、数字格式化或文字拼接。先让源数据保留明确的 `null`，再用 `if(eq(引用, null), "待核实", 格式化引用)` 显示。一个字段根本不存在时，引用仍报错；不要依靠缺失字段推断零值。

## 审计与回归

`audit.bindings` 记录实际消费的每个引用：页面/文本中的路径、`ref`、格式、精度、上下文及所属计算。`audit.dependencies` 记录每项计算本次实际消费的直接依赖；未选中的 `if` 分支不计入。`audit.calculations` 同时保留表达式、结果与依赖，`audit.assertions` 保留通过的条件，`audit.sourceData` 保留完整源数据和来源台账。源输入不被修改。

回归至少包含普通改数、排序或预算边界翻转、缺失值/零值，并在最终PPT中核对图表与工作簿、直接标签、表格、标题/推荐。纯编译器测试见 [`data-model.test.mjs`](../scripts/tests/data-model.test.mjs)，用当前环境的Node运行 `node --test scripts/tests/data-model.test.mjs`。这些测试证明绑定与计算行为；不替代成品的原生对象、视觉与PowerPoint检查。

## 用统一源文件生成完整PPT

[`data-layout-source.json`](../assets/templates/data-layout-source.json) 是完整8页输入；[`data-layout-library.pptx`](../assets/templates/data-layout-library.pptx) 是可编辑成品。示例为合成测算，不能复用为新题目的事实或推荐。新主题重新定义输入、计算和判断，按实际关系选择页面。

使用当前环境提供的 Node、Python 与 Presentations skill路径设置`DECK_PRESENTATIONS_SKILL_DIR`、`DECK_RUNTIME_PYTHON`、`CODEX_PRIMARY_RUNTIME_NODE_MODULES`后运行：

```text
node scripts/build-data-deck.mjs --input source.json --workspace /absolute/project --work /absolute/project/working/build-01 --out /absolute/project/output/report-v1.pptx
```

`--dry-run`仅计算、检查和保存解析结果，不生成PPT。正常生成会保存`resolved.json`、`values.json`、`calculation-audit.json`和`theme.json`，再执行原生图表/表格及嵌入工作簿导出校验。使用当前环境的Node可执行文件，不默认全局node可用；工作和最终输出目录须为项目内分开的兄弟目录。更新输入后使用新输出文件名；不会覆盖已检查成品。

只有已绑定的数字和条件会联动。图中趋势、合计、重点理由和推荐所需的原始驱动应共同推导；不要把成本总额、逐周成本或“最高项”文字分别硬编码。修改任一驱动后，需核对相关图表、表格、直接标签、标题及备注。

当输入变化会改变可执行单元数时（最低成班人数、批次、台班、库存批量等），先重判可行性，再计算新的经营结果。沿用原班数/原排班的压力结果只可作为诊断，不能当作仍可执行的方案。执行阈值保留对象、指标、时间、比较基准和触发动作，例如“订单低于同期计划80%”，不要压缩成“低于80%”。
