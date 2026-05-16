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
