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
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(Buffer.from('fake-image-data'))
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
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
    vi.clearAllMocks()
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
