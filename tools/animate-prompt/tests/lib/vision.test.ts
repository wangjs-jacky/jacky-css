import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeAnimation, type AnimationAnalysis } from '../../src/lib/vision.js'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } }
  }),
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
