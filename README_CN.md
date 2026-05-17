# jacky-css

[English](./README.md)

单文件 Web 动效合集。每个目录是一个自包含动效：一个可直接运行的 `index.html`，加一个 `README.md`，其中 `## Prompt` 段落是一段密度足够高、能让 LLM 一次还原出该动效的描述词。

## 动效列表

| 动效 | 说明 |
|---|---|
| [`tile-grid-reveal`](./tile-grid-reveal) | 基于 Canvas 的网格局部放大，鼠标跟随 + GSAP 缓动波浪涟漪 |
| [`theme-circle-transition`](./theme-circle-transition) | 主题切换圆形扩散，以点击坐标为圆心向外揭示 |
| [`ease-reverse-menu`](./ease-reverse-menu) | 全屏菜单揭示/收回，开启与关闭用不同缓动曲线 |
| [`loop-path-trace`](./loop-path-trace) | 绿点沿手写连笔「loop」路径游走；CSS / SVG / GSAP 三套变体 + Vara.js 手写文字 demo |
| [`neumorphic-fingerprint-scan`](./neumorphic-fingerprint-scan) | 拟物指纹扫描按钮：hover 按压凹陷、白刻痕→渐变色两阶段自绘、移出渐进消失 |

## 使用方式

每个动效都低依赖、自包含。浏览器直接打开任意 `index.html` 即可预览，或阅读其 `README.md` 获取还原 Prompt。

## 许可证

MIT
