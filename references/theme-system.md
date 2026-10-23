# 自定义主题色：克制、可读、可复用

用户提供主色后，使用 `scripts/theme.mjs` 的 `createTheme` 生成整套颜色角色。先确认主色的实际色值；“青色”“高级绿”等名称不能作为程序输入。没有指定色值时使用默认蓝 `#2251FF`，不得把示例色当作用户已经确认的品牌色。

## 输入与输出

```js
import {createTheme, contrastRatio} from '../scripts/theme.mjs';
const theme = createTheme({primary:'#1D5C63'});
// 只有用户明确给出第二种颜色时才传 accent。
const twoColorTheme = createTheme({primary:'#1D5C63',accent:'#9B6A24'});
```

仅接受 `primary` 和可选的 `accent` 字段，格式为 `#RGB` 或 `#RRGGBB`。错误色值、颜色名称、数组、透明通道及未知字段会抛出可操作的错误，不猜测、不静默丢弃。`createTheme()` 是无外部依赖、无 I/O 的确定性函数。

| 输出 | 作用 |
| --- | --- |
| `config` | 保留传入的原始 hex 字符串；省略主色时记录默认值 |
| `C` | 兼容旧版构建器的 `ink/blue/pale/gray/rule/light/white`，并增加语义色 |
| `chart` | 图表焦点、对照、基线、区间、剩余部分、轴与网格角色 |
| `table` | 表头、强调行/格、普通单元格、合计的 fill/color/border 配对 |
| `audit` | 未四舍五入的对比度、是否调整主色、颜色家族上限、封面约束和使用规则 |

`C.primary` 是展开为六位大写的原色；`C.blue` 是沿用旧命名的主填充角色，不代表必须是蓝色。浅色主色可能被压暗，以保证它在白底上的重要图形边界可见。原色仍保留在 `config` 与 `C.primary`。有显式辅助色时，`C.accentOriginal` 同样保留原色，`C.accent` 为可用填充角色。

## 使用规则

1. 只使用一个主色家族；最多增加一个用户明确提供的辅助色。其余采用中性色。同色的明暗变化承担层级，避免按分类数量自动生成彩虹色。
2. 页面以白底、深色文字为主。主色聚焦一个主要信息或一组同义内容；辅助色只承担明确的对照或异常含义，不为装饰而加入。
3. 主色填充用 `C.blue`，填充上的文字必须用 `C.onPrimary`。白底彩色文字用 `C.primaryText`，不能直接把原色或 `C.blue` 作为小字颜色。辅助色采用相应的 `onAccent/accentText`。
4. 表头优先使用 `table.header`；推荐行使用 `table.emphasis` 的浅底、深字和主色边线。不要把整张表的每列都涂满不同颜色。合计使用 `table.subtotal`，通过粗体、间距与顶线建立层级。
5. 图表焦点使用 `chart.focus`，其他项目使用 `chart.context`。比较系列用 `chart.comparison`，同时配合直接标签、空心/实心标记或线型。颜色不能单独承载正负、推荐或缺失含义。
6. `pale/rangeBand/remainder/rule` 是浅层背景角色，不能依靠浅色边界独立传达关键数据。区间或剩余量需要标签、足够可见的轮廓或其他编码。
7. 同一颜色角色必须跨页保持相同含义。用留白、对齐、线宽、字体层级和信息取舍提升质感；增加颜色数量不能修复拥挤版面。

## 对比度与特殊主色

本模块采用 W3C 相对亮度算法，普通正文与白底彩字目标至少 4.5:1，重要图形与白底至少 3:1；生成时留少量余量。审计使用未舍入值。这是本地设计检查，不等同于整份 PPT 的无障碍认证。[文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)、[相对亮度算法](https://www.w3.org/WAI/WCAG22/Understanding/relative-luminance.html)。

- 很浅的黄等色彩：保留原色，关键图形采用同色压暗版本，正文彩字再单独调整；不在浅底上强行使用白字。
- 饱和红等色彩：可能采用黑字作为填充上的文字，不能默认主色底都配白字。
- 黑、白或灰主色：允许成为单色主题；强调改用深浅、粗细、边框和标签，不自动发明一个新强调色。
- `audit.pass` 只检查模块列出的配对。照片、叠加、透明度、细线、临近色及实际投影效果仍需看渲染和应用显示。浅色系列必须有可靠的替代识别方式。

## 封面约束

当前项目的封面固定使用 `assets/brand/cover-background.jpg` 和白字，与正文主题无关。传入主色不会重染封面、替换原图或改变封面文字颜色。只有用户明确调整封面时才修改这一约束。

## 检查与参考

运行 `node scripts/tests/theme.test.mjs`，覆盖默认蓝、青绿、酒红、赭金、浅黄、饱和红、显式辅助色、同色家族、对比度及错误输入。仍应在实际页面中检查主色面积、标签清晰度与跨页含义一致性；公式不能判断审美是否符合用户喜好。

设计参考了已核验的 [Anthropic Theme Factory](https://github.com/anthropics/skills/blob/main/skills/theme-factory/SKILL.md) 对整套主题一致应用的做法；这里的用户主色推导、颜色数量约束和算法是本项目的实现。没有套用其品牌颜色、字体或预设主题，也没有安装运行其代码。

图表两系列默认采用主色与中性色；用户显式指定accent时，第二系列或比较端点可采用该辅助色。正文用“主色系列、参照系列、实心点、菱形”等稳定名称或实际对象名；避免在可换主题中把蓝色/灰色含义硬编码。文字颜色始终使用对应可读文字色，不把图形边界的3:1目标用于小字。

本地生成器同时写入原生PowerPoint主题色方案，标题/正文、背景、链接及accent槽位均使用当前主题的主色家族与中性色；显式辅助色进入第二accent槽。这样后续在PowerPoint选主题色时可沿用配色，原色和必要的可读调整仍记录于theme.json。

更换整套主色时，修改统一源文件theme配置再重建。原生主题色方案便于后续对象取色；已导出对象可能使用显式颜色，不承诺在PowerPoint手动切换主题色带就能自动重配全部既有对象。
