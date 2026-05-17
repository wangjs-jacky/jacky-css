# Loop Path Trace

一个绿点沿手写连笔「loop」单一连续路径双向往返的加载动效 —— 字与两端引导横线全程静止，只有点在游走，运动慢→快→慢、走到端点折返。

## 效果预览

- **静态美术**：深色背景上一笔不断的 cursive 小写「loop」（修长 l 圈 + 两个 o + 基线下长伸 p 圈），两端各一段灰色水平引导横线，全程完整可见
- **运动点**：一个薄荷绿圆点，沿「左灰横 → 连笔字 → 右灰横」首尾相接的单一连续路径滑行
- **缓动**：ease-in-out（慢→快→慢），到端点减速、折返时再加速
- **方向**：双向往返（alternate / yoyo），一去一回为一个完整周期（≈ 6s）
- **非描边动画**：字不是逐渐画出来的，自始至终就在那；动的只有点

三套等价实现，机制不同、观感一致，可按依赖偏好任选。

## Prompt

> 三套 Prompt 共享同一组可观测特征：背景 `#1e1f2e`、连笔字 `#353753`、两端灰横 `#6e7081`、运动点 `#3ecf8e`（半径 9，圆形），`stroke-width 16`、`linecap round`，基线 `y≈300`，viewBox `0 0 1000 460`。差异只在「点沿路径运动」的实现机制。

### 方案 A · 纯 CSS `offset-path`（零依赖，推荐）

> 做一个单文件 HTML，深色背景绿点沿手写连笔「loop」双向往返、慢→快→慢无限循环，零依赖纯 CSS/SVG。固定像素舞台 1000×460px，内嵌同尺寸 SVG（务必让舞台与 SVG 同像素，使 `offset-path: path()` 坐标与 viewBox 1:1，否则点与字错位）。美术分两条独立 path 静态可见：灰色引导横线（两端水平短横）+ 靛色一笔不断 cursive 小写「loop」。运动点是绝对定位小圆 div，有自己独立的 `offset-path: path("…")`，几何 = 左灰横 + 连笔字 + 右灰横首尾相接的单一连续路径（最易错点：美术两条上色不同的 path，运动一条合并 path，点必须一笔走完含两端灰横）。`:root` 暴露可配置变量 `--dur:3s; --ease:ease-in-out; --dir:alternate;`，`animation: run var(--dur) var(--ease) infinite var(--dir)`，`@keyframes run{to{offset-distance:100%}}`，`offset-rotate:0deg`。缓动必须 ease-in-out、方向 alternate 双向往返，不是匀速也不是单向扫。

### 方案 B · SVG 原生 `<animateMotion>`

> 做一个单文件 HTML，纯 SVG（不写 CSS 动画、不写 JS），同上动效。三条 path：`id="trace"` 合并连续路径（左灰横+连笔字+右灰横，`stroke none` 仅作轨迹）、灰色显示层（两端短横 `#6e7081`）、靛色显示层（中间连笔字 `#353753`），三者几何吻合。`<circle r="9" fill="#3ecf8e">` 内 `<animateMotion dur="3s" repeatCount="indefinite" calcMode="spline" keyPoints="0;1;0" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1; 0.42 0 0.58 1" rotate="0"><mpath href="#trace"/></animateMotion>`。要点：SMIL 无 `alternate`，用 `keyPoints "0;1;0"` 让点沿同一 path 去→回做双向；`keySplines` 两段均 `0.42 0 0.58 1` 即每程各套一次 ease-in-out。`dur` 改这一处即可调速。

### 方案 C · GSAP `MotionPathPlugin`

> 做一个单文件 HTML，用 GSAP + MotionPathPlugin（jsdelivr CDN），同上动效。SVG 内 `id="path"` 合并连续路径（`stroke none` 隐藏作轨迹）+ 灰色/靛色静态美术两层 + `<circle id="dot" r="9" fill="#3ecf8e"/>`。脚本顶部暴露常量 `DURATION=3; EASE="sine.inOut"; YOYO=true;`，`gsap.to("#dot",{duration:DURATION, ease:EASE, repeat:-1, yoyo:YOYO, motionPath:{path:"#path", align:"#path", alignOrigin:[0.5,0.5], autoRotate:false}})`。要点：`ease` 用 inOut 系（端点减速），`yoyo:true + repeat:-1` 实现双向往返，`autoRotate:false`（圆点无需朝向切线）。

## 关键术语

| 术语 | 说明 |
|------|------|
| Loop Path Trace | 效果正式名称 |
| 单一连续路径 | 左灰横 + 连笔字 + 右灰横首尾相接的一条 path，点必须一笔走完整段 |
| 美术 / 轨迹分离 | 美术是两条上色不同的 path（灰横 + 连笔字），运动是一条几何吻合的合并 path |
| `offset-path` / `offset-distance` | CSS 运动路径机制；坐标用元素所在块的 CSS 像素，**非** SVG viewBox |
| `animateMotion` + `mpath` | SVG 原生沿 path 运动；无 `alternate`，靠 `keyPoints "0;1;0"` 做双向 |
| GSAP MotionPathPlugin | JS 方案；`yoyo` 原生支持往返，`ease` 灵活 |
| ease-in-out（慢→快→慢） | 到端点减速、折返加速；CSS `ease-in-out` ≈ SMIL `keySplines 0.42 0 0.58 1` ≈ GSAP `sine.inOut` |
| 双向往返 / 周期 | 一去一回为一个完整周期 ≈ 2×单程时长（≈ 6s） |

## 技术方案

```
一条合并连续路径（左灰横 → cursive loop → 右灰横）
  → 一个绿点以 ease-in-out 沿弧长前进
  → 走到末端（offset 100% / keyPoint 1 / 路径终点）
  → 折返反向（alternate / keyPoints 0;1;0 / yoyo）
  → 每程独立套一次 ease-in-out → 端点减速、中段加速
  → 无限循环；美术层全程静止，仅点位移
```

**三套方案的「双向」差异（最值得注意的点）：**

```text
A · CSS    animation-direction: alternate    —— 原生往返，一去一回 = 2×--dur
B · SMIL   keyPoints="0;1;0" keyTimes="0;0.5;1"
           —— 无 alternate，用关键点 0→1→0 沿同一 path 折返；
              keySplines 两段各套 ease-in-out
C · GSAP   yoyo:true, repeat:-1            —— 原生往返，整圈 = 2×DURATION
```

**坐标对齐易错点（仅方案 A）：**

```text
CSS offset-path: path() 用的是元素所在包含块的 CSS 像素坐标，
不是 SVG viewBox。必须把舞台与 SVG 钉成同一像素尺寸（此处 1000×460px），
让 path() 数值与 viewBox 1:1，否则点会与连笔字整体错位。
B / C 沿 SVG 内的 path 运动，天然同坐标系，无此问题。
```

## 文件结构

```
loop-path-trace/
  index.html        # 方案 A · 纯 CSS offset-path（零依赖，已闭环验证）
  index-svg.html    # 方案 B · SVG 原生 animateMotion（零依赖，无 JS）
  index-gsap.html   # 方案 C · GSAP MotionPathPlugin（依赖 GSAP CDN）
  index-vara.html   # 附 · Vara.js 手写文字 demo（依赖 Vara CDN）
  README.md
```

## 浏览器支持

| 方案 | 支持情况 |
|------|----------|
| A · CSS `offset-path` | Chrome 116+ / Firefox 72+ / Safari 16+（旧前缀 `motion-path` 不在此列） |
| B · SVG `animateMotion` | 所有现代浏览器（SMIL：Chrome / Firefox / Safari 均可，IE 不支持） |
| C · GSAP MotionPath | 所有现代浏览器；需可访问 jsdelivr CDN（离线可改本地引入） |
| 附 · Vara.js 手写 | 所有现代浏览器；需可访问 jsdelivr CDN（含字体 JSON） |

## 附：手写文字（Vara.js）

`index-vara.html` 是一个**任意文字 → 手写书写动画**的 demo。与上面 loop 不同：loop 是"点沿固定路径走"，这里是"笔迹本身一笔笔浮现"，文字内容可任意替换（无需手工描 path，Vara 内置手写字体的路径数据）。沿用同一深色绿主题，带"↻ 点此重写"重播。

可配置项在脚本顶部：`TEXT`（写什么）、`COLOR`、`FONT_SIZE`、`STROKE`、`DURATION`（书写时长 ms）、`FONT`（内置字体，可换 Pacifico / ShadowsIntoLight / SatisfySL）。

### Prompt

> 做一个单文件 HTML，深色背景 `#1e1f2e` 上用 **Vara.js**（jsdelivr CDN `vara@1.4.1`）做手写文字书写动画。脚本顶部暴露可配置常量：`TEXT`（要写的文字）、`COLOR`（如 `#3ecf8e`）、`FONT_SIZE`、`STROKE`（笔画粗细）、`DURATION`（书写时长 ms）、`FONT`（手写字体 JSON，用 `https://cdn.jsdelivr.net/gh/akzhy/Vara@master/fonts/Satisfy/SatisfySL.json`，可换 Pacifico / ShadowsIntoLight）。`new Vara("#pen", FONT, [{text:TEXT, duration:DURATION}], {fontSize, strokeWidth:STROKE, color:COLOR, textAlign:"center", autoAnimation:true})`。容器居中；下方放一个灰色 `↻ 点此重写` 提示，点击时清空容器并重新 `new Vara(...)` 触发重写。要点：Vara 把笔迹注入为 SVG `<path>` 并以描边动画逐笔画出（不是字体、不是点游走）；字体 JSON 异步加载，首帧可能为空属正常。
