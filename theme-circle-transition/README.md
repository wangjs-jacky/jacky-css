# Theme Circle Transition

主题切换圆形扩散动效 —— 以点击坐标为圆心，新主题从按钮位置向外揭示覆盖全屏。

## 效果预览

点击右下角主题切换按钮，选择 System / Dark / Light 任意一项，可以看到：

- **亮 → 深**：深色圆形从按钮圆心向外扩散，覆盖全屏
- **深 → 亮**：深色层从按钮圆心向内收缩消失，露出亮色主题

## Prompt

> 实现主题切换的 **circular reveal 动效**：以点击坐标为圆心，用 `clip-path: circle()` 从 0 扩展至 `170vmax` 覆盖全屏，新主题在圆内显现。使用 **View Transitions API**（`document.startViewTransition`），深→亮时反向——旧层圆形从全屏收缩至 0。支持 System / Dark / Light 三模式，CSS 变量管理 Token，`localStorage` 持久化。

## 关键术语

| 术语 | 说明 |
|------|------|
| Circular Reveal Transition | 效果正式名称 |
| Radial Wipe | 视频剪辑领域同义词 |
| clip-path circle reveal | CSS 核心机制关键词 |
| View Transitions API | 浏览器原生过渡接口，自动截图无需克隆 DOM |
| origin from click point | 圆心跟随点击坐标，不说默认居中 |
| bidirectional | 深↔亮两个方向动效逻辑不同 |
| 170vmax | 覆盖任意分辨率全屏的最小安全半径 |

## 技术方案

```
点击按钮
  → 记录按钮中心坐标 (x, y)
  → 写入 CSS 变量 --vt-x / --vt-y
  → document.startViewTransition(applyTheme)
  → CSS: clip-path: circle(0% → 170vmax at var(--vt-x) var(--vt-y))
  → 新主题从按钮位置向外扩散
```

**双向动效区别：**

```css
/* 亮 → 深：新层（深色）从圆心扩散 */
::view-transition-new(root) {
  animation: circle-expand 0.55s forwards;
}

/* 深 → 亮：旧层（深色）向圆心收缩 */
html.vt-reverse::view-transition-old(root) {
  animation: circle-shrink 0.55s forwards;
  z-index: 1;
}
```

## 文件结构

```
theme-circle-transition/
  index.html   # 完整实现，单文件，零外部依赖
  README.md
```

## 浏览器支持

View Transitions API（同文档）：Chrome 111+、Edge 111+、Safari 18+、Firefox 130+
