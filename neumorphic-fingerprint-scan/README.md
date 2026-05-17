# Neumorphic Fingerprint Scan

拟物风格指纹扫描按钮 —— 鼠标移入时按钮被「按下」凹陷，指纹先以白色刻痕成形、再由紫青渐变色滞后跟描；移出时按钮弹回、指纹整体渐隐。

## 效果预览

把鼠标移入圆形按钮，可以看到：

- **按压反馈**：按钮由凸起瞬间变为凹陷（box-shadow 由外凸翻转为 `inset`），外发光圈收暗，约 150ms 自然过渡，移出立即弹回
- **两阶段绘制**：指纹先以浅灰「刻痕」（带上暗下亮 bevel，像刻进凹面）**快速铺满**，紫→青渐变色**滞后约 0.5s** 自上而下逐条跟描覆盖在刻痕上 —— 任一时刻顶部已上色、中部仅白刻痕、底部还没出
- **状态点**：按钮下方圆点由红转青，扫描时亮起青色光晕
- **渐进退场**：鼠标移出，按钮立即弹回，整枚指纹（刻痕+颜色一起）在约 0.55s 内均匀 opacity 渐隐，状态点回红

> 指纹纹路并非手画，而是从一段真实扫描视频里用 skimage 骨架化提取的**中心线矢量**（干净单条描边，无毛刺），因此能用 `stroke-dashoffset` 做逐条自绘。

## Prompt

> 单文件 HTML 还原拟物风指纹扫描按钮，**hover 交互驱动**（非自动循环）。浅灰紫 `#e6e7ee` 背景居中，260px 圆形拟物按钮：背景 `#ecedf3`，默认凸起 `box-shadow:-14px -14px 28px #fff, 16px 16px 32px #c2c4cf, inset 0 0 0 1px rgba(255,255,255,.4)`；`::before inset:-26px` 径向白光做外发光圈。**鼠标移入按钮**：按钮 box-shadow 翻转为凹陷 `inset -11px -11px 22px #fff, inset 13px 13px 24px #c2c4cf`，外发光圈 opacity 降到 .25，过渡 `transition:box-shadow .15s cubic-bezier(.22,.61,.36,1)`（像真实按键，干脆不糊）；按钮下方 34px 的 13px 状态点由红 `#ff5a6b` 渐变为青 `#27d3ef` 并放大青色光晕。**指纹**：一枚真实感 loop 型指纹，约 19 条**开放中心线 `<path>`**（单条描边，非填充、非 potrace 双边轮廓；若从截图来，需经「HSL 饱和度阈值 → 形态学清理 → skeletonize 骨架化 → 走图取中心线折线 → gaussian 平滑 + RDP」得到开放折线），复制为**两层同一组路径**：第一层 `etch` 描边 `#dcdde8` + `filter:drop-shadow(-1px -1px 1px #fff) drop-shadow(1.4px 1.6px 1.4px rgba(150,152,172,.7))` 做「刻进凹面」的 deboss；第二层 `ink` 描边纵向 `linearGradient` `#8b7cf6→#7c8cf5→#27d3ef`。每条 path 加 `pathLength="1"` 归一化、`stroke-dasharray:1; stroke-dashoffset:1`，`@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`，`animation-fill-mode:forwards`。**两阶段**：hover 时 `etch` 跑动画 `duration:1s`、`delay:calc(var(--i)*.018s)`（几乎同步、快速铺满）；`ink` 跑 `duration:2.4s`、`delay:calc(.45s + var(--i)*.055s)`（明显滞后、慢速、自上而下 stagger，跟在刻痕后面着色）。**退场**：鼠标移出，按钮立即弹回；用极小 JS 在 `mouseleave` 时把每条 path 的当前 `getComputedStyle(...).strokeDashoffset` 冻结为内联值（移除动画后纹路不瞬移），给整枚 `.fp` 加 `transition:opacity .55s` 并设 opacity:0 做整体均匀渐隐，约 560ms 后清理内联值与类复位待下次。**易错点**：① 必须用开放折线 stroke，potrace 闭合填充无法 stroke 自绘；② `pathLength=1` 归一化是关键，否则长短 ridge 自绘速度不一；③ 退场不是「移除即消失」也不是反向回收 dashoffset，是整体 opacity 渐隐——纯 CSS `:hover` 做不到（取消 animation 会让 dashoffset 瞬间归位），需 JS 先冻结状态再 transition；④ 颜色趟相对刻痕趟整体滞后约 0.5s，不是同时；⑤ 按压过渡要短 ease-out（~150ms），别用长缓动否则糊。

## 关键术语

| 术语 | 说明 |
|------|------|
| Neumorphism press | 拟物按压：`box-shadow` 由外凸 outset 翻转为 `inset` 凹陷，模拟实体按键 |
| Centerline vectorize | 位图经 skimage `skeletonize` + 走图取中心线，得到可 stroke 自绘的开放折线 |
| `pathLength="1"` | 路径长度归一化，使长短不一的 ridge 以相同进度自绘 |
| `stroke-dashoffset` self-draw | 虚线偏移从 1→0 实现 SVG「自我描绘」 |
| Two-pass draw | 双层同路径：白刻痕层快描成形，渐变色层滞后慢描覆盖 |
| Deboss filter | 双向 `drop-shadow`（上亮下暗）模拟刻进凹面的立体感 |
| Frozen-then-fade exit | 移出时先冻结 dashoffset 再 transition opacity，实现渐进消失 |

## 技术方案

```
鼠标移入 .btn
  → 加 .on 类
  → 按钮 box-shadow 翻转凹陷（transition .15s ease-out，自然按压）
  → .etch 层：duration 1s、极小 stagger → 白刻痕快速铺满成形
  → .ink 层：delay .45s + duration 2.4s、明显 stagger → 渐变色滞后自上而下跟描
  → 状态点红 → 青 + 青色光晕

持续 hover
  → animation-fill-mode:forwards 保持全着色态

鼠标移出 .btn
  → JS 冻结每条 path 当前 stroke-dashoffset 为内联值（防瞬移）
  → 移除 .on（按钮立即弹回）+ 加 .off
  → .fp opacity 1→0，transition .55s → 整枚均匀渐隐
  → 560ms 后清理内联值/类，复位待下次
```

**两阶段相位差（核心手感）：**

```css
/* 刻痕快、几乎同步 */
.btn.on .etch path{ animation:draw 1s ease-out forwards;
  animation-delay:calc(var(--i) * 0.018s); }
/* 颜色慢、整体滞后 0.45s、明显 stagger */
.btn.on .ink path{ animation:draw 2.4s ease-out forwards;
  animation-delay:calc(0.45s + var(--i) * 0.055s); }
@keyframes draw{ from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
```

**渐进退场（纯 CSS hover 做不到，需极小 JS）：**

```js
btn.addEventListener('mouseleave', function () {
  // 冻结当前进度，移除动画后纹路不瞬移
  paths.forEach(function (p) {
    p.style.strokeDashoffset = getComputedStyle(p).strokeDashoffset;
  });
  btn.classList.remove('on');  // 按钮弹回 + 停止描绘
  btn.classList.add('off');    // .fp opacity → 0，transition .55s 渐隐
  setTimeout(function () {
    btn.classList.remove('off');
    paths.forEach(function (p) { p.style.strokeDashoffset = ''; });
  }, 560);
});
```

## 文件结构

```
neumorphic-fingerprint-scan/
  index.html   # 完整实现，单文件，零依赖（含内联中心线 SVG + 极小 vanilla JS）
  README.md
```

## 浏览器支持

CSS `box-shadow` 翻转 / SVG `stroke-dashoffset` / `pathLength` / `filter:drop-shadow`：所有现代浏览器（Chrome / Firefox / Safari 最新版均可）。无第三方依赖。
