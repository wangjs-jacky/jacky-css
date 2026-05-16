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

      if (!checkFfmpeg()) {
        p.cancel('未找到 ffmpeg，请先安装：brew install ffmpeg')
        process.exit(1)
      }

      if (!existsSync(videoPath)) {
        p.cancel(`视频文件不存在: ${videoPath}`)
        process.exit(1)
      }

      if (!['uniform', 'scene'].includes(options.mode)) {
        p.cancel(`--mode 只支持 uniform 或 scene，收到：${options.mode}`)
        process.exit(1)
      }

      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        p.cancel('请提供 Anthropic API Key：--api-key <key> 或设置 ANTHROPIC_API_KEY 环境变量')
        process.exit(1)
      }

      const rangeHint = options.start || options.end
        ? pc.dim(` [${options.start ?? '0'} → ${options.end ?? 'end'}]`)
        : ''
      const modeLabel = options.mode === 'scene' ? '场景变化检测' : '等间距'

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

      p.note(result, '分析结果')

      if (options.output) {
        writeFileSync(options.output, result, 'utf-8')
        p.outro(`已保存到 ${pc.green(options.output)}`)
      } else {
        p.outro(pc.dim('使用 --output <file> 保存到文件'))
      }
    })
}
