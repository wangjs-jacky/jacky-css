# Tile Grid Reveal

网格图片局部放大动效 —— 鼠标移动时，光标附近的网格方块显示图片的放大版本，延迟跟随产生波浪涟漪效果。

## 效果预览

鼠标移入画布区域，可以看到：

- **光标附近**：方块显示图片对应区域的放大版本（缩放中心为方块自身）
- **白点指示**：每个受影响方块的中心出现白色圆点，大小与距离反比
- **波浪扩散**：GSAP expo 缓动让追踪位置延迟跟随，产生从光标向外扩散的涟漪

## Prompt

> 实现基于 Canvas 的 **Tile Grid Reveal** 动效：将图片绘制在 2000×2000 画布上，以 45px 为间距构建网格。鼠标移动时，通过 GSAP `quickTo`（expo 缓动，duration 2）平滑追踪光标位置。对每个网格方块计算到追踪点的距离，距离越近缩放因子越大（`s = 1 - clamp01(d / canvasSize / dynamicScale)`），用 `drawImage` 9 参数形式从图片对应区域取更小的源矩形绘制到固定大小的目标矩形，实现局部放大。`dynamicScale` 随鼠标速度动态变化（速度越快影响半径越大），静止时衰减。每个方块中心叠加白色圆点增强视觉反馈。使用 GSAP ticker 驱动渲染循环。

## 关键术语

| 术语 | 说明 |
|------|------|
| Tile Grid Reveal | 效果正式名称 |
| Canvas drawImage zoom | 通过缩小源矩形实现局部放大的核心机制 |
| GSAP quickTo | 带缓动的平滑值追踪，expo 缓动产生延迟波浪 |
| Proximity-based scaling | 基于距离的缩放因子，近大远小 |
| Dynamic influence radius | m.s 随鼠标速度变化，快移时波浪扩散更广 |
| Canvas coordinate mapping | offsetX → canvas 坐标的比例映射 |

## 技术方案

```
鼠标移动
  → 映射到 canvas 坐标 (offsetX / elementWidth * 2000)
  → GSAP quickTo 平滑追踪 (expo, duration 2)
  → 每帧计算每个方块到追踪点的距离 d
  → s = 1 - clamp01(d / 2000 / m.s)
  → s > 0 时，drawImage 取更小源区域 → 放大效果
  → m.s 随鼠标速度动态调整
```

**drawImage 放大原理：**

```js
// 源矩形越小，画到固定目标矩形时放大倍数越高
// canvas 坐标需转换为图片像素坐标
const scaleX = img.naturalWidth / canvasWidth;
const srcX = (dotX + dotScaled / 2) * scaleX;
const srcW = (dotSize - dotScaled) * scaleX;
ctx.drawImage(img, srcX, srcY, srcW, srcH, dotX, dotY, dotSize, dotSize);
```

**鼠标进出处理：**

```js
// 进入时 snap 到鼠标位置，避免横扫波浪
m.x = m.x2 = mouseX;
m.s = 0.01;  // 重置缩放因子
sTo(0.01);   // 通过 GSAP 重置
// 离开时不移动坐标，让 m.s 自然衰减
```

## 文件结构

```
tile-grid-reveal/
  index.html   # 完整实现，单文件，依赖 GSAP CDN
  README.md
```

## 浏览器支持

Canvas 2D + GSAP：所有现代浏览器。自定义光标（pointer events）需 Chrome 55+、Firefox 59+、Safari 13+。
