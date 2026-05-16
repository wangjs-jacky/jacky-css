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

  const timeArgs = [
    start ? `-ss ${start}` : '',
    end   ? `-to ${end}`   : '',
  ].filter(Boolean).join(' ')

  try {
    const outputPattern = join(tmpDir, 'frame-%03d.png')

    if (mode === 'scene') {
      execSync(
        `ffmpeg ${timeArgs} -i "${videoPath}" -vf "select=gt(scene\\,${sceneThreshold}),scale=1280:-1" -vsync vfr -vframes ${frameCount} "${outputPattern}" -y`,
        { stdio: 'pipe' }
      )
    } else {
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      const durationRaw = execSync(probeCmd, { stdio: 'pipe' }).toString().trim()
      const totalDuration = parseFloat(durationRaw)

      const startSec = start ? parseFloat(start.replace(':', '.')) : 0
      const endSec   = end   ? parseFloat(end.replace(':', '.'))   : totalDuration
      const duration = endSec - startSec

      const fps = frameCount / duration
      execSync(
        `ffmpeg ${timeArgs} -i "${videoPath}" -vf "fps=${fps}" -vframes ${frameCount} "${outputPattern}" -y`,
        { stdio: 'pipe' }
      )
    }

    return readdirSync(tmpDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => readFileSync(join(tmpDir, f)).toString('base64'))
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
