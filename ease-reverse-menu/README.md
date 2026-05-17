# Ease Reverse Menu

Toggle 全屏菜单揭示动效 —— 点击按钮，散落图块向中心汇聚淡出、全屏菜单从屏幕中心 clip-path 扩张展开，菜单项错落进场；关闭时用**不同于开启的缓动曲线**反向收回。复刻 GSAP "easeReverse" demo 的核心交互。

## 效果预览

点击右上角 `TOGGLE MENU` 按钮，可以看到：

- **开启**：菜单层以屏幕中心为锚点，从一个 tile 大小的小矩形 `clip-path` 扩张到全屏；散落装饰图块向中心汇聚 + 放大 + 淡出；菜单项 `[NEW GAME]…[EXIT]` 自上而下错落进入（脆快，`power3.out` ≈ 0.42s）
- **关闭**：不是开启的对称倒放——用**不同曲线**（`power2.inOut`、时长更长 ≈ 0.55s）收回，菜单项自下而上退场，图块从中心回弹飞回原散落位（更"沉"的手感）
- **可中途打断**：动画进行中再次点击，从当前实时渲染值无缝反向，不跳变

## Prompt

> 用单文件 HTML + GSAP 3（CDN）实现一个 **toggle 菜单揭示动效**。布局：`position:fixed` 全屏黑底 `#000`，正中两行像素位图风标题 `HUMAN ZERO`（粗块 pixel display 字体，如 Pixelify Sans），四周绝对定位散落约 13 张小图块（~90×120px，各自 `rotate(-8°~8°)`，固定坐标）。另有 `inset:0` 全屏菜单层：背景铺满高对比人脸大图，其上同款像素字体竖排居中菜单 `[NEW GAME] [MISSIONS] [SKILLS] [QUEST LOG] [ABOUT PLAYER] [SETTINGS] [EXIT]`。点击右上 `TOGGLE MENU`：菜单层 `clip-path` 从屏幕正中 tile 大小小矩形（`inset(50% 46% round 4px)`）扩张到全屏（`inset(0%)`），`duration 0.42`、`ease power3.out`；菜单项 `gsap.from` `y:18,autoAlpha:0`、`stagger 0.035` 自上而下，与面板揭示重叠 `delay 0.14`；散落图块 `gsap.to` 向屏幕中心位移 + `scale 1.5` + `autoAlpha 0`、`ease power2.in`、`0.32s`。**easeReverse 灵魂（必须实现）**：关闭 ≠ `timeline.reverse()` 对称倒放——开用 `power3.out`，关用不同曲线 `power2.inOut`、时长更长 `0.55`，菜单项自下而上、图块从中心回弹回原位。动画进行中再次点击须从当前值无缝反向（`gsap.to(..., {overwrite:"auto"})`）。锚点：clip-path 揭示中心 = 屏幕几何中心，图块汇聚点 = 屏幕中心。

## 关键术语

| 术语 | 说明 |
|------|------|
| Ease Reverse | 效果正式名称：开/关两个方向用不同缓动曲线，关闭不是开启的线性倒放 |
| clip-path inset reveal | 菜单层揭示核心机制，以屏幕中心为锚点扩张/收缩 |
| anchored at viewport center | clip-path 与图块汇聚的空间锚点固定为屏幕几何中心 |
| reversed stagger | 菜单项开启自上而下、关闭自下而上，方向相反 |
| interruptible tween | `overwrite:"auto"` 让中途点击从当前实时值续接反向，不跳变 |
| asymmetric easing | 开 `power3.out`/0.42s 脆，关 `power2.inOut`/0.55s 沉 |

## 技术方案

```
点击 TOGGLE MENU
  → open ? reverse() : play()

play()  开启（power3.out, 0.42s）
  → root --c: 0→1   驱动 menu clip-path: inset((1-c)*50% (1-c)*46% round (1-c)*4px)
  → items 自上而下 stagger 0.035 进入（y:18→0, autoAlpha:0→1）
  → tiles 向屏幕中心位移 + scale 1.5 + autoAlpha 0（power2.in）

reverse()  关闭（power2.inOut, 0.55s —— 不同曲线，更长）
  → root --c: 1→0
  → items 自下而上 stagger from:'end' 退场
  → tiles 回弹 x/y:0 scale:1 autoAlpha:1（power2.inOut）

中途点击：所有 gsap.to 带 overwrite:'auto'
  → 从当前渲染值无缝反向，无跳变
```

**clip-path 锚点用 CSS 变量驱动，避免 gsap 直接插值字符串：**

```css
.menu{
  clip-path: inset(
    calc((1 - var(--c)) * 50%)
    calc((1 - var(--c)) * 46%)
    round calc((1 - var(--c)) * 4px)
  );
}
```

```js
gsap.to(root,{ '--c':1, duration:.42, ease:'power3.out', overwrite:'auto' }); // 开
gsap.to(root,{ '--c':0, duration:.55, ease:'power2.inOut', overwrite:'auto' }); // 关，不同曲线
```

**图块汇聚点 = 屏幕中心，运行时按当前位置算偏移：**

```js
function toCenter(el){
  const r = el.getBoundingClientRect();
  return { x: innerWidth/2 - (r.left+r.width/2),
           y: innerHeight/2 - (r.top +r.height/2) };
}
```

## 文件结构

```
ease-reverse-menu/
  index.html   # 完整实现，单文件，依赖 GSAP 3 CDN
  README.md
```

> 当前 index.html 用 SVG data-URI 占位图（图块 / 人脸背景），验证的是运动而非素材；实际使用替换为真实图片即可。

## 浏览器支持

`clip-path: inset()` + CSS 自定义属性 + GSAP 3：所有现代浏览器（Chrome 88+、Firefox 78+、Safari 14+、Edge 88+）。`prefers-reduced-motion` 已做兜底。
