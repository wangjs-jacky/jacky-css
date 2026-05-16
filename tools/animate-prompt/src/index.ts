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
