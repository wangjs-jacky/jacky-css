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
