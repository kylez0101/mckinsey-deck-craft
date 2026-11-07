# 样式配置与阅读场景

`presentation.style`（普通页面 JSON 则为顶层 `style`）控制样式，与计算数据和 `theme` 配色分开。省略时为 `personal` / `reading`，保持现有深蓝封面、宋体标题和阅读字号。

```json
{
  "style": {
    "profile": "generic",
    "purpose": "presentation",
    "fonts": {"title": "Arial", "body": "Arial Unicode MS"},
    "cover": {"background": null, "fill": "#FFFFFF", "textColor": "#051C2C"},
    "footer": {"text": "Internal discussion", "showPageNumber": true}
  }
}
```

| 配置 | 行为 |
|---|---|
| `personal` | 内置深蓝原图与白字；默认 Songti SC / Arial Unicode MS |
| `generic` | 素色封面、不附个人图案；默认 Arial / Arial Unicode MS，可显式改成品牌字体 |
| `reading` | 1280×720 上标题31px、表格19.5px、来源13px，供近距离阅读 |
| `presentation` | 标题38px、表格24px、图表标签约22px、来源15px；容量随字号收紧，内容过多要求改写或拆页 |

字号使用 CSS px，24px约18pt。投影距离、房间和屏幕不同，这些是试排起点。现场验收须看实际阅读距离；切换模式不会自动产生一个合格的现场演讲稿。

`fonts` 可分别覆盖标题和正文。字体必须在当前制作环境可用，并在目标应用检查替换情况；默认字体不表示所有系统都已安装。用 `preflight.mjs --full` 查询当前环境，缺字体时明确选择已安装的替代字体再重新渲染。不要静默替换用户指定字体。

`cover.background` 支持绝对路径、内置 `assets/brand/cover-background.jpg` 或 `null`；外部图片用绝对路径消除工作目录歧义。`fill` 和 `textColor` 为六位 hex。用户明确提供品牌封面时覆盖个人默认。纯色封面由原生底色和文字组成；背景图片保留为独立图片对象。

`footer.text` 与本页 `source` 同时保留，`showPageNumber:false` 仅隐藏页号。封面不编号，正文沿用物理页序减去封面的习惯；单页模式的正文标为1。来源和关键限定仍属于内容，不因更换品牌删除。

`scripts/style-profiles.mjs` 是默认值与数值尺寸的唯一实现。主题色仍通过 `theme.primary` / `theme.accent` 配置；样式配置不改动源数据、事实状态或推荐条件。
