# jacky-css

[中文文档](./README_CN.md)

A showcase of single-file web animation effects. Each folder is one self-contained effect: a runnable `index.html` plus a `README.md` whose `## Prompt` section is a high-density description dense enough for an LLM to reproduce the effect in one shot.

## Effects

| Effect | Description |
|---|---|
| [`tile-grid-reveal`](./tile-grid-reveal) | Canvas grid local-zoom that follows the cursor with a GSAP eased ripple |
| [`theme-circle-transition`](./theme-circle-transition) | Theme switch revealed as a circle expanding from the click point |
| [`ease-reverse-menu`](./ease-reverse-menu) | Fullscreen menu reveal/close using asymmetric easing curves |
| [`loop-path-trace`](./loop-path-trace) | A dot tracing a handwritten cursive "loop" path; CSS / SVG / GSAP variants + a Vara.js handwriting demo |
| [`neumorphic-fingerprint-scan`](./neumorphic-fingerprint-scan) | Hover-driven neumorphic fingerprint button: press-in, two-pass etch-then-color self-draw, graceful fade-out |

## Usage

Each effect is dependency-light and self-contained. Open any `index.html` directly in a browser, or read its `README.md` to grab the reproduction Prompt.

## License

MIT
