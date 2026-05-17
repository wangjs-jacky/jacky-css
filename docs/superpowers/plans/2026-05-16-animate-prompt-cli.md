# animate-prompt CLI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 `animate-prompt` CLI 工具，输入动效视频文件，用 ffmpeg 提取关键帧，调用 Claude Vision API 分析，输出标准化动效 Prompt 描述词。

**Architecture:** 单包结构放在 `jacky-css/tools/animate-prompt/`，`cac` 注册 `analyze` 命令，ffmpeg 提取等间距帧为 base64，`@anthropic-ai/sdk` 发送多图 vision 请求，专用 system prompt 约束输出格式，`@clack/prompts` 展示交互进度。

**Tech Stack:** TypeScript + cac + @clack/prompts + @anthropic-ai/sdk + ffmpeg（系统依赖）+ tsup + vitest

---

## 文件结构

```
jacky-css/tools/animate-prompt/
  package.json          # CLI 包定义，bin: animate-prompt
  tsconfig.json         # TypeScript 配置
  tsup.config.ts        # 构建配置
  vitest.config.ts      # 测试配置
  bin/
    animate-prompt.js   # 入口 shim（#!/usr/bin/env node）
  src/
    index.ts            # cac 注册所有命令，错误处理
    commands/
      analyze.ts        # analyze 命令：协调 ffmpeg + vision + formatter
    lib/
      ffmpeg.ts         # 调用 ffmpeg 提取帧，返回 base64[]
      vision.ts         # 调用 Claude API，返回结构化分析结果
      formatter.ts      # 将分析结果格式化为标准 Prompt 输出
      system-prompt.ts  # Claude 的 system prompt 常量
  tests/
    lib/
      ffmpeg.test.ts    # mock exec，验证命令构造正确
      vision.test.ts    # mock Anthropic client，验证 prompt 构造
      formatter.test.ts # 纯函数，验证格式化输出
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `jacky-css/tools/animate-prompt/package.json`
- Create: `jacky-css/tools/animate-prompt/tsconfig.json`
- Create: `jacky-css/tools/animate-prompt/tsup.config.ts`
- Create: `jacky-css/tools/animate-prompt/vitest.config.ts`
- Create: `jacky-css/tools/animate-prompt/bin/animate-prompt.js`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@wangjs-jacky/animate-prompt",
  "version": "0.1.0",
  "description": "CLI tool to analyze animation videos and generate structured prompt descriptions",
  "type": "module",
  "bin": {
    "animate-prompt": "./bin/animate-prompt.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "bin"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@clack/prompts": "^0.11.0",
    "cac": "^6.7.14",
    "picocolors": "^1.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.0"
  },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

- [ ] **Step 4: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 5: 创建 bin/animate-prompt.js**

```js
#!/usr/bin/env node
import '../dist/index.js'
```

- [ ] **Step 6: 安装依赖**

```bash
cd jacky-css/tools/animate-prompt
npm install
```

- [ ] **Step 7: 验证安装成功**

```bash
ls node_modules/@anthropic-ai && ls node_modules/cac
```

Expected: 两个目录都存在

- [ ] **Step 8: Commit**

```bash
git add jacky-css/tools/animate-prompt/package.json jacky-css/tools/animate-prompt/tsconfig.json jacky-css/tools/animate-prompt/tsup.config.ts jacky-css/tools/animate-prompt/vitest.config.ts jacky-css/tools/animate-prompt/bin/animate-prompt.js
git commit -m "feat: scaffold animate-prompt CLI package"
```

---

## Task 2: ffmpeg 帧提取模块

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/lib/ffmpeg.ts`
- Create: `jacky-css/tools/animate-prompt/tests/lib/ffmpeg.test.ts`

**背景：** ffmpeg 是系统依赖，需要提前安装（`brew install ffmpeg`）。支持三种截帧策略：
- `uniform`（默认）：等间距采样，适合短视频（< 30s）
- `uniform` + `start/end`：先裁剪时间段再等间距，适合长视频中已知动效位置
- `scene`：场景变化检测，自动找画面变化最大的帧，适合不确定动效位置的长视频

- [ ] **Step 1: 写 ffmpeg.test.ts 的失败测试**

```ts
// tests/lib/ffmpeg.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFrames, checkFfmpeg } from '../../src/lib/ffmpeg.js'
import { execSync } from 'child_process'
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  readdirSync: vi.fn(() => ['frame-001.png', 'frame-002.png', 'frame-003.png']),
}))

describe('checkFfmpeg', () => {
  it('ffmpeg 已安装时返回 true', () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from('ffmpeg version 6.0'))
    expect(checkFfmpeg()).toBe(true)
  })

  it('ffmpeg 未安装时返回 false', () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('not found') })
    expect(checkFfmpeg()).toBe(false)
  })
})

describe('extractFrames — uniform 模式', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(Buffer.from('fake-image-data'))
    // mock ffprobe 返回时长
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (String(cmd).includes('ffprobe')) return Buffer.from('10.0')
      return Buffer.from('')
    })
  })

  it('构造正确的 ffmpeg fps 命令', () => {
    extractFrames('/path/to/video.mp4', { frameCount: 5 })
    const cmd = vi.mocked(execSync).mock.calls.find(c => String(c[0]).includes('fps='))
    expect(String(cmd![0])).toContain('fps=')
    expect(String(cmd![0])).toContain('/path/to/video.mp4')
  })

  it('start/end 时在命令中加入 -ss 和 -to', () => {
    extractFrames('/path/to/video.mp4', { frameCount: 5, start: '0:05', end: '0:08' })
    const cmd = vi.mocked(execSync).mock.calls.find(c => String(c[0]).includes('ffmpeg'))
    expect(String(cmd![0])).toContain('-ss 0:05')
    expect(String(cmd![0])).toContain('-to 0:08')
  })

  it('返回 base64 字符串数组', () => {
    const result = extractFrames('/path/to/video.mp4', { frameCount: 3 })
    expect(result).toHaveLength(3)
    expect(result[0]).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})

describe('extractFrames — scene 模式', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(Buffer.from('fake'))
    vi.mocked(execSync).mockReturnValue(Buffer.from(''))
  })

  it('scene 模式命令包含 select=gt(scene)', () => {
    extractFrames('/path/to/video.mp4', { mode: 'scene', frameCount: 8 })
    const cmd = vi.mocked(execSync).mock.calls.find(c =>
      String(c[0]).includes('select=gt(scene')
    )
    expect(cmd).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd jacky-css/tools/animate-prompt
npm test
```

Expected: FAIL with "Cannot find module '../../src/lib/ffmpeg.js'"

- [ ] **Step 3: 实现 src/lib/ffmpeg.ts**

```ts
import { execSync } from 'child_process'
import { existsSync, readFileSync, mkdirSync, rmSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface ExtractOptions {
  frameCount?: number
  /** 截取起始时间，如 "0:05" 或 "5"（秒），适合长视频定位 */
  start?: string
  /** 截取结束时间，如 "0:08" 或 "8"（秒） */
  end?: string
  /**
   * 截帧模式
   * - uniform（默认）：等间距采样
   * - scene：场景变化检测，自动找画面变化最显著的帧
   */
  mode?: 'uniform' | 'scene'
  /** scene 模式的变化阈值，0~1，越小截的帧越多，默认 0.1 */
  sceneThreshold?: number
}

export function checkFfmpeg(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export function extractFrames(videoPath: string, options: ExtractOptions = {}): string[] {
  const {
    frameCount = 8,
    start,
    end,
    mode = 'uniform',
    sceneThreshold = 0.1,
  } = options

  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }

  const tmpDir = join(tmpdir(), `animate-prompt-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })

  // 时间范围参数（uniform 和 scene 模式都支持）
  const timeArgs = [
    start ? `-ss ${start}` : '',
    end   ? `-to ${end}`   : '',
  ].filter(Boolean).join(' ')

  try {
    const outputPattern = join(tmpDir, 'frame-%03d.png')

    if (mode === 'scene') {
      // 场景变化检测：只在画面变化超过阈值时截帧，再限制最多 frameCount 张
      execSync(
        `ffmpeg ${timeArgs} -i "${videoPath}" -vf "select=gt(scene\\,${sceneThreshold}),scale=1280:-1" -vsync vfr -vframes ${frameCount} "${outputPattern}" -y`,
        { stdio: 'pipe' }
      )
    } else {
      // uniform：先用 ffprobe 获取时长，再计算 fps 等间距采样
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      const durationRaw = execSync(probeCmd, { stdio: 'pipe' }).toString().trim()
      const totalDuration = parseFloat(durationRaw)

      // 有效时长 = end - start（如果指定了范围）
      const startSec = start ? parseFloat(start.replace(':', '.')) : 0
      const endSec   = end   ? parseFloat(end.replace(':', '.'))   : totalDuration
      const duration = endSec - startSec

      const fps = frameCount / duration
      execSync(
        `ffmpeg ${timeArgs} -i "${videoPath}" -vf "fps=${fps}" -vframes ${frameCount} "${outputPattern}" -y`,
        { stdio: 'pipe' }
      )
    }

    // 读取帧并转为 base64
    return readdirSync(tmpDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => readFileSync(join(tmpDir, f)).toString('base64'))
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test
```

Expected: PASS — 6 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/ffmpeg.ts tests/lib/ffmpeg.test.ts
git commit -m "feat: add ffmpeg frame extraction with uniform/scene modes and start/end range"
```

---

## Task 3: System Prompt 常量

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/lib/system-prompt.ts`

- [ ] **Step 1: 创建 src/lib/system-prompt.ts**

```ts
export const ANIMATION_ANALYSIS_SYSTEM_PROMPT = `你是一位资深 CSS 动效工程师，擅长分析 UI 动效并用精准的技术语言描述。

用户会提供一组动效视频的关键帧（按时间顺序），请分析动效并严格按以下 JSON 格式输出，不要输出 JSON 以外的内容：

{
  "name": "动效的英文标准名称，如 Circular Reveal Transition",
  "nameCN": "动效中文名称，如 圆形揭示过渡",
  "trigger": "触发条件：click | hover | scroll | load | auto",
  "initialState": "初始状态的简洁描述",
  "finalState": "结束状态的简洁描述",
  "dimensions": ["变化维度数组，从以下选择：position | scale | opacity | color | clip-path | border-radius | filter | transform | shape | background"],
  "easing": "缓动感觉：spring（弹性）| ease-out（急减速）| ease-in-out（平滑）| linear（匀速）| bounce（弹跳）",
  "duration": "估计时长，如 300ms | 500ms | 1s",
  "stagger": "多元素是否错落：true | false",
  "cssKeywords": ["核心 CSS 属性/API 关键词，如 clip-path | View Transitions API | transform | animation"],
  "prompt": "一段完整的、可直接用于 AI 生成此动效的 Prompt 词（中文，100字以内）",
  "avoidMistakes": "实现此动效时容易犯的错误，一句话"
}`
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/system-prompt.ts
git commit -m "feat: add animation analysis system prompt"
```

---

## Task 4: Claude Vision 分析模块

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/lib/vision.ts`
- Create: `jacky-css/tools/animate-prompt/tests/lib/vision.test.ts`

- [ ] **Step 1: 写 vision.test.ts 的失败测试**

```ts
// tests/lib/vision.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeAnimation, type AnimationAnalysis } from '../../src/lib/vision.js'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

const mockAnalysis: AnimationAnalysis = {
  name: 'Circular Reveal Transition',
  nameCN: '圆形揭示过渡',
  trigger: 'click',
  initialState: '页面为亮色主题',
  finalState: '页面切换为深色主题',
  dimensions: ['clip-path', 'color', 'background'],
  easing: 'ease-out',
  duration: '550ms',
  stagger: false,
  cssKeywords: ['clip-path', 'View Transitions API', 'circle()'],
  prompt: '实现主题切换的 circular reveal 动效：以点击坐标为圆心，用 clip-path: circle() 从 0 扩展至 170vmax 覆盖全屏。',
  avoidMistakes: '不说明圆心坐标来源时，AI 默认居中扩散而非从点击位置扩散',
}

describe('analyzeAnimation', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockAnalysis) }],
    })
  })

  it('发送正确数量的帧图片到 Claude API', async () => {
    const frames = ['base64frame1', 'base64frame2', 'base64frame3']
    await analyzeAnimation(frames, 'test-api-key')

    const call = mockCreate.mock.calls[0][0]
    const imageBlocks = call.messages[0].content.filter(
      (c: { type: string }) => c.type === 'image'
    )
    expect(imageBlocks).toHaveLength(3)
  })

  it('返回解析后的 AnimationAnalysis 对象', async () => {
    const result = await analyzeAnimation(['frame1'], 'test-api-key')
    expect(result.name).toBe('Circular Reveal Transition')
    expect(result.cssKeywords).toContain('clip-path')
    expect(result.prompt).toBeTruthy()
  })

  it('Claude 返回非法 JSON 时抛出可读错误', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'invalid json' }],
    })
    await expect(analyzeAnimation(['frame1'], 'test-api-key')).rejects.toThrow(
      'Claude 返回了无效的 JSON'
    )
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test
```

Expected: FAIL with "Cannot find module '../../src/lib/vision.js'"

- [ ] **Step 3: 实现 src/lib/vision.ts**

```ts
import Anthropic from '@anthropic-ai/sdk'
import { ANIMATION_ANALYSIS_SYSTEM_PROMPT } from './system-prompt.js'

export interface AnimationAnalysis {
  name: string
  nameCN: string
  trigger: string
  initialState: string
  finalState: string
  dimensions: string[]
  easing: string
  duration: string
  stagger: boolean
  cssKeywords: string[]
  prompt: string
  avoidMistakes: string
}

export async function analyzeAnimation(
  frames: string[],
  apiKey: string
): Promise<AnimationAnalysis> {
  const client = new Anthropic({ apiKey })

  const imageBlocks = frames.map(frame => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/png' as const,
      data: frame,
    },
  }))

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: ANIMATION_ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `以上是动效视频的 ${frames.length} 张关键帧（按时间顺序）。请分析动效并按指定 JSON 格式输出。`,
          },
        ],
      },
    ],
  })

  const text = response.content.find(c => c.type === 'text')?.text ?? ''

  try {
    return JSON.parse(text) as AnimationAnalysis
  } catch {
    throw new Error(`Claude 返回了无效的 JSON：${text.slice(0, 100)}`)
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test
```

Expected: PASS — 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision.ts tests/lib/vision.test.ts
git commit -m "feat: add Claude vision animation analysis module"
```

---

## Task 5: 输出格式化模块

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/lib/formatter.ts`
- Create: `jacky-css/tools/animate-prompt/tests/lib/formatter.test.ts`

- [ ] **Step 1: 写 formatter.test.ts 的失败测试**

```ts
// tests/lib/formatter.test.ts
import { describe, it, expect } from 'vitest'
import { formatAnalysis, type AnimationAnalysis } from '../../src/lib/formatter.js'

const mockAnalysis: AnimationAnalysis = {
  name: 'Circular Reveal Transition',
  nameCN: '圆形揭示过渡',
  trigger: 'click',
  initialState: '亮色主题',
  finalState: '深色主题',
  dimensions: ['clip-path', 'color'],
  easing: 'ease-out',
  duration: '550ms',
  stagger: false,
  cssKeywords: ['clip-path', 'View Transitions API'],
  prompt: '以点击坐标为圆心，clip-path circle 扩散覆盖全屏。',
  avoidMistakes: '不说明圆心坐标时 AI 默认居中',
}

describe('formatAnalysis', () => {
  it('输出包含效果名称', () => {
    const output = formatAnalysis(mockAnalysis)
    expect(output).toContain('Circular Reveal Transition')
    expect(output).toContain('圆形揭示过渡')
  })

  it('输出包含 Prompt 词区块', () => {
    const output = formatAnalysis(mockAnalysis)
    expect(output).toContain('## Prompt')
    expect(output).toContain('以点击坐标为圆心')
  })

  it('输出包含 CSS 关键词', () => {
    const output = formatAnalysis(mockAnalysis)
    expect(output).toContain('clip-path')
    expect(output).toContain('View Transitions API')
  })

  it('输出包含易错点提醒', () => {
    const output = formatAnalysis(mockAnalysis)
    expect(output).toContain('易错点')
    expect(output).toContain('不说明圆心坐标时')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test
```

Expected: FAIL with "Cannot find module '../../src/lib/formatter.js'"

- [ ] **Step 3: 实现 src/lib/formatter.ts**

```ts
export type { AnimationAnalysis } from './vision.js'
import type { AnimationAnalysis } from './vision.js'

export function formatAnalysis(analysis: AnimationAnalysis): string {
  const lines: string[] = []

  lines.push(`# ${analysis.name}`)
  lines.push(``)
  lines.push(`**${analysis.nameCN}** — ${analysis.initialState} → ${analysis.finalState}`)
  lines.push(``)
  lines.push(`## Prompt`)
  lines.push(``)
  lines.push(`> ${analysis.prompt}`)
  lines.push(``)
  lines.push(`## 关键术语`)
  lines.push(``)
  lines.push(`| 属性 | 值 |`)
  lines.push(`|------|-----|`)
  lines.push(`| 触发条件 | ${analysis.trigger} |`)
  lines.push(`| 变化维度 | ${analysis.dimensions.join(', ')} |`)
  lines.push(`| 缓动感觉 | ${analysis.easing} |`)
  lines.push(`| 时长 | ${analysis.duration} |`)
  lines.push(`| 错落动画 | ${analysis.stagger ? '是' : '否'} |`)
  lines.push(``)
  lines.push(`## CSS 关键词`)
  lines.push(``)
  lines.push(analysis.cssKeywords.map(k => `\`${k}\``).join(' · '))
  lines.push(``)
  lines.push(`## 易错点`)
  lines.push(``)
  lines.push(`> ${analysis.avoidMistakes}`)

  return lines.join('\n')
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test
```

Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/formatter.ts tests/lib/formatter.test.ts
git commit -m "feat: add animation analysis output formatter"
```

---

## Task 6: analyze 命令

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/commands/analyze.ts`

- [ ] **Step 1: 创建 src/commands/analyze.ts**

```ts
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync, writeFileSync } from 'fs'
import { checkFfmpeg, extractFrames } from '../lib/ffmpeg.js'
import { analyzeAnimation } from '../lib/vision.js'
import { formatAnalysis } from '../lib/formatter.js'
import type { CAC } from 'cac'

interface AnalyzeOptions {
  frames: number
  start?: string
  end?: string
  mode: 'uniform' | 'scene'
  output?: string
  apiKey?: string
}

export function registerAnalyzeCommand(cli: CAC) {
  cli
    .command('analyze <video>', '分析动效视频，生成标准 Prompt 描述词')
    .option('-f, --frames <number>', '提取帧数', { default: 8 })
    .option('-s, --start <time>', '截取起始时间，如 "0:05" 或 "5"（秒），适合长视频定位')
    .option('-e, --end <time>', '截取结束时间，如 "0:08" 或 "8"（秒）')
    .option('-m, --mode <mode>', '截帧模式：uniform（等间距）| scene（场景变化检测）', { default: 'uniform' })
    .option('-o, --output <file>', '保存结果到文件（如 output.md）')
    .option('-k, --api-key <key>', 'Anthropic API Key（默认读取 ANTHROPIC_API_KEY 环境变量）')
    .action(async (videoPath: string, options: AnalyzeOptions) => {
      p.intro(pc.cyan('animate-prompt') + pc.dim(' · 动效分析'))

      // 检查 ffmpeg
      if (!checkFfmpeg()) {
        p.cancel('未找到 ffmpeg，请先安装：brew install ffmpeg')
        process.exit(1)
      }

      // 检查视频文件
      if (!existsSync(videoPath)) {
        p.cancel(`视频文件不存在: ${videoPath}`)
        process.exit(1)
      }

      // 验证 mode 值
      if (!['uniform', 'scene'].includes(options.mode)) {
        p.cancel(`--mode 只支持 uniform 或 scene，收到：${options.mode}`)
        process.exit(1)
      }

      // 获取 API Key
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        p.cancel('请提供 Anthropic API Key：--api-key <key> 或设置 ANTHROPIC_API_KEY 环境变量')
        process.exit(1)
      }

      // 提示当前截帧策略
      const rangeHint = options.start || options.end
        ? pc.dim(` [${options.start ?? '0'} → ${options.end ?? 'end'}]`)
        : ''
      const modeLabel = options.mode === 'scene' ? '场景变化检测' : '等间距'

      // 提取帧
      const extractSpinner = p.spinner()
      extractSpinner.start(`提取关键帧（${modeLabel}，最多 ${options.frames} 帧${rangeHint}）...`)
      let frames: string[]
      try {
        frames = extractFrames(videoPath, {
          frameCount: options.frames,
          start: options.start,
          end: options.end,
          mode: options.mode,
        })
        extractSpinner.stop(`已提取 ${frames.length} 帧`)
      } catch (err) {
        extractSpinner.stop('帧提取失败')
        p.cancel(String(err))
        process.exit(1)
      }

      // 调用 Claude 分析
      const analyzeSpinner = p.spinner()
      analyzeSpinner.start('正在调用 Claude Vision 分析动效...')
      let result: string
      try {
        const analysis = await analyzeAnimation(frames, apiKey)
        analyzeSpinner.stop('分析完成')
        result = formatAnalysis(analysis)
      } catch (err) {
        analyzeSpinner.stop('分析失败')
        p.cancel(String(err))
        process.exit(1)
      }

      // 输出结果
      p.note(result, '分析结果')

      // 保存到文件
      if (options.output) {
        writeFileSync(options.output, result, 'utf-8')
        p.outro(`已保存到 ${pc.green(options.output)}`)
      } else {
        p.outro(pc.dim('使用 --output <file> 保存到文件'))
      }
    })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/analyze.ts
git commit -m "feat: add analyze command with clack progress UI"
```

---

## Task 7: CLI 入口

**Files:**
- Create: `jacky-css/tools/animate-prompt/src/index.ts`

- [ ] **Step 1: 创建 src/index.ts**

```ts
import { cac } from 'cac'
import { registerAnalyzeCommand } from './commands/analyze.js'

const cli = cac('animate-prompt')

cli.version('0.1.0')
cli.help()

registerAnalyzeCommand(cli)

process.on('uncaughtException', (err: Error) => {
  const msg = err.message
  if (
    msg.includes('Unknown option') ||
    msg.includes('Unknown command') ||
    msg.includes('missing required args')
  ) {
    console.error(`错误: ${msg}\n使用 --help 查看用法`)
    process.exit(1)
  }
  throw err
})

cli.parse()
```

- [ ] **Step 2: 构建**

```bash
cd jacky-css/tools/animate-prompt
npm run build
```

Expected: `dist/index.js` 生成成功，无 TypeScript 错误

- [ ] **Step 3: 本地链接并验证 help 输出**

```bash
npm link
animate-prompt --help
```

Expected:
```
animate-prompt/0.1.0

Usage:
  $ animate-prompt <command> [options]

Commands:
  analyze <video>  分析动效视频，生成标准 Prompt 描述词

Options:
  -v, --version  Display version number
  -h, --help     Display this help message
```

- [ ] **Step 4: 运行完整测试套件**

```bash
npm test
```

Expected: 全部通过

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up CLI entry point, animate-prompt ready"
```

---

## Task 8: 端到端验证（可选，需要真实环境）

> 此 Task 需要：已安装 ffmpeg、有效的 ANTHROPIC_API_KEY、一段动效视频文件

- [ ] **Step 1: 用项目内的动效录屏测试**

录制 `theme-circle-transition/index.html` 的主题切换过程，保存为 `test.mp4`，然后：

```bash
ANTHROPIC_API_KEY=sk-ant-xxx animate-prompt analyze ./test.mp4 --frames 6 --output result.md
```

Expected: 终端显示分析结果，`result.md` 包含 Prompt 词和关键术语表

- [ ] **Step 2: 验证输出格式**

```bash
cat result.md
```

Expected: 包含 `## Prompt`、`## CSS 关键词`、`## 易错点` 三个区块

---

## 自查清单

**Spec 覆盖：**
- [x] 输入视频文件 → Task 2 (ffmpeg)
- [x] 提取关键帧（等间距）→ Task 2 (uniform 模式)
- [x] 长视频时间范围截取 → Task 2 (--start / --end)
- [x] 长视频自动定位动效位置 → Task 2 (scene 模式，select=gt(scene))
- [x] 调用 Claude Vision → Task 4 (analyzeAnimation)
- [x] 输出标准 Prompt 词 → Task 5 (formatAnalysis)
- [x] 交互进度 UI → Task 6 (@clack/prompts)
- [x] 保存到文件 → Task 6 (--output 选项)
- [x] API Key 从环境变量读取 → Task 6 (ANTHROPIC_API_KEY)

**Placeholder 扫描：** 无 TBD / TODO / "类似上面"

**类型一致性：**
- `AnimationAnalysis` 在 `vision.ts` 定义，`formatter.ts` 通过 `export type { AnimationAnalysis } from './vision.js'` 再导出，无重复定义
- `extractFrames` 返回 `string[]`，`analyzeAnimation` 接收 `string[]`，类型对齐
