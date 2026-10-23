# 10类原生可编辑模板的复用

整套模板见[可编辑模板库](../assets/templates/consulting-page-library.pptx)与[总览](../assets/templates/overview.jpg)，每页对应一个T编号。完整可执行输入见[模板示例JSON](../assets/templates/page-library.json)。T编号用于选择页面关系，不能决定新题目的结论或整套页序。机器可读字段与容量见[模板目录](template-catalog.json)。

## 固定封面

本用户指定使用[原始深蓝背景](../assets/brand/cover-background.jpg)铺满16:9画布，所有封面文字为原生白字。保留图片原色和比例，不叠加麦肯锡旧封面背景、机构Logo或其他装饰。短标题48px，必要上下文19–23px；该尺寸仅用于封面，正文标题31px。背景是独立位图，白字单独可编辑。

## 按关系选择

| ID | 页面任务 | 常用字段及当前生成器容量 |
|---|---|---|
| T01 | 封面 | title、kicker、subtitle、status、date；主标题单行约22个中文等宽单位以内 |
| T02 | 执行摘要 | sections：3组heading/text/可选icon；metrics：可选最多3组value/label；decision：决策请求 |
| T03 | 事实与数据对照 | chart：heading/categories/values/unit/max/majorUnit/可选format；2–5个非负同单位数据；facts：1–3行label/text/可选icon；takeaway、caveat |
| T04 | 方案比较 | headers、rows、可选highlightColumn、takeaway；2–4个方案加维度列，按同一维度比较，单元格主要2行 |
| T05 | 现状与目标 | 可选headers、rows、takeaway；2–5个维度，3列逐行对应 |
| T06 | 流程与例外 | steps：3–5步；emphasisStep：从0起；exception：fromStep/text；roles：最多3行；可选roleHeaders、takeaway |
| T07 | 阶段交付与责任 | stages：2–4组name/deliverable/criteria/owner；takeaway；每阶段保留交付物与进入下一阶段条件 |
| T08 | 时间计划 | periods：4–6段；rows：2–3条工作流；phases：name/span，span总和等于periods数；gates：最多3组heading/text；takeaway |
| T09 | 指标验收 | metrics：2–3组label/value；rows：2–4行；可选headers、takeaway；表格3列 |
| T10 | 预算与决策 | unit、rows：2–4分项、可选headers；可选total：value/label/condition；decisions：1–3组heading/text；takeaway |

通用字段：layout、title、subtitle、source、notes。源信息必须按本页实际内容填写，完整证据/细则进入本页真实备注。文字字段可用字符串或字符串数组（逐行）。T03必须是真实输入或明确的演示数据，不把空缺补成0；生成器只适用非负单序列水平条形图，其他关系按当前演示工具另选原生图表。

T06另支持“条件齐备后执行”变体：`releaseConditions`为2–4行“条件名、内容”的二列表；`steps`恰好3步，`gateLabel`可选，用于明确全部条件同时满足后的动作。它与普通路径/例外模式二选一，详细例外另页。AND门槛表示条件同时成立，不能画成依次进行的步骤；此模式仍属于T06。

新增字段或图表类型需要成对保留输入与扩展构建器。基础构建器对未知字段报错，避免重放扩展输入时悄悄漏掉正文证据。多系列或含负值的图按真实关系选A布局、专业图表或专用原生扩展，不为套用T03删除负值。

## 图表与表格补充样张

[7款专业图表与表格](../assets/templates/professional-chart-gallery.pptx)含固定封面和G01–G07七个实例，配套[源数据](../assets/templates/professional-chart-data.json)及[总览图](../assets/templates/professional-chart-overview.jpg)。选型、数据口径和使用限制见[专业图表设计](professional-chart-design.md)。G编号识别数据关系，不扩充为所有报告必须使用的页面类型，也不表示基础T03已支持全部新图型。

区间、哑铃、投入—贡献散点可复用[advanced-xy.mjs](../scripts/advanced-xy.mjs)；其输入保留真实X/Y数值。其余图表和表格可复制原生样张后按新数据重建或修改。样张使用合成书店数据，不能只替换标题便作为新行业的事实页。散点自定义标签与表格金额均需显式同步，详见设计参考中的编辑检查。

## 内容容量和改写

- 正文标题优先一行，生成器预检最多约36个中文等宽单位；这是防拥挤的粗检，实际字体渲染仍需查看。封面约22单位。英文字符按估算宽度计入，不能视为精确排版测量。
- 常规正文19–20.5px，表格约19–19.5px，来源13px。窄列、标签、单位和条件都计入单元格容量。
- 容量超限时预检报错，保留全部输入，不截断、不自动缩字号。先重写、移除重复、分组或拆页；决定所需的事实状态、条件与权限仍在屏幕上。固定总页数时重新分配各页职责。
- T06职责行、T09验收行的双行中文需要比单行示例更高。生成器现按内容选择行高，T09双行时上移表格，为结语与页脚保留空间；预检的“允许两行”仍须实际渲染核对，不能视为行高已自动充分。
- `notes`可容纳完整资料，但不能靠把关键分支、费用边界或审批权全部放备注来让正文勉强合格。
- 字段种类或数据关系不适合这10类时，可用当前演示工具扩展原生页面。不得虚构一个方案或随意删维度来适配固定列数。

## 用JSON重建与修改

用当前工作区依赖加载器取得Node、Python、Node modules和当前Presentations技能目录；不安装新依赖。构建脚本在[build-deck.mjs](../scripts/build-deck.mjs)。设置：

- `CODEX_PRIMARY_RUNTIME_NODE_MODULES`：依赖加载器返回的Node packages。
- `DECK_PRESENTATIONS_SKILL_DIR`：当前安装的Presentations技能绝对目录。
- `DECK_RUNTIME_PYTHON`：依赖加载器返回的Python。

运行当前Node并传入：`build-deck.mjs --input <新主题JSON> --workspace <本次项目目录> --work <项目目录>/working/build-01 --out <项目目录>/output/final.pptx`。`working`与`output`使用互不包含的目录，最终文件不能放在项目根或私有构建目录下。输出不能已存在；脚本会生成原生对象、校验最终包并从最终文件重新渲染全部页面。开始制作前遵循当前Presentations的authoring marker要求，每个authoring operation仅标记一次。

这套JSON用于重复制作；也可以直接复制PPT模板，在PowerPoint修改原生对象。模板表格的金额是字面值，没有自动合计公式。修改金额、类别或单位后，必须检查合计、条长、轴和文字解释一起更新。

Artifact Tool对已有原生图表执行导入、修改、原始导出时，可能保留图中缓存值，却丢失嵌入xlsx及其关系。改已有PPT图表时需保留并同步真实源工作簿、图表关系和externalData，最终检查三者；不能用新快照掩盖公式来源丢失。当前JSON构建器从完整字面量新建图表，并经finalizer生成显式快照；它与保留已有公式工作簿的编辑流程不同。

本库正文页脚从1起，封面不编号；页序与Demo来源引用仍按文件物理页序，记录时须说明采用哪一种。

## 交付核对

逐页放大查看后，再看全套密度与节奏。核对固定新封面、单行标题、字号与留白、表格/icon的语义和变化。结构检查、内容检查、实际修改重开分别取证。模板示意内容只属于模板；业务成品不得残留“填写/指标A/对象A”等指导文本或旧主题。

## 数据驱动布局与自定义主题

新增[A01–A06六种结构](data-layouts.md)，以及[统一源数据重建](data-binding.md)、[用户主题色](theme-system.md)。[完整新库](../assets/templates/data-layout-library.pptx)、[输入源JSON](../assets/templates/data-layout-source.json)、[布局总览](../assets/templates/data-layout-overview.jpg)可配合使用。历史模板中的字面数值仍需手动同步；需要持续更新的新主题优先走统一源数据。
