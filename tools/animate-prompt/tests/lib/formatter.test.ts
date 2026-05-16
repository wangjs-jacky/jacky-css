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
